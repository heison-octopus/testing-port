import readXlsxFile from 'read-excel-file/node';
import writeExcelFile from 'write-excel-file/node';
import { db, id, now } from '../db.js';
import { audit } from './auditService.js';
import { resolveClassAt } from './schoolService.js';

const rosterHeaders = ['student_id', 'student_name_reference', 'class_reference', 'note'];
const questionnaireHeaders = ['student_id', 'student_name_reference', 'class_reference', 'q1', 'q2', 'q3', 'q4', 'q5', 'teacher_feedback'];

function normalizeHeader(value) {
  return String(value ?? '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

function parseCsv(text) {
  const rows=[]; let row=[]; let value=''; let quoted=false;
  for(let i=0;i<text.length;i+=1){
    const char=text[i];
    if(char==='"'){
      if(quoted&&text[i+1]==='"'){value+='"';i+=1;} else quoted=!quoted;
    }else if(char===','&&!quoted){row.push(value);value='';}
    else if((char==='\n'||char==='\r')&&!quoted){
      if(char==='\r'&&text[i+1]==='\n')i+=1;
      row.push(value);value='';if(row.some(cell=>String(cell).trim()))rows.push(row);row=[];
    }else value+=char;
  }
  row.push(value);if(row.some(cell=>String(cell).trim()))rows.push(row);
  return rows;
}

function csvCell(value){const text=String(value??'');return /[",\r\n]/.test(text)?`"${text.replaceAll('"','""')}"`:text;}

async function readRows(file){
  const name=file.originalname.toLowerCase();
  if(name.endsWith('.xlsx')) { const workbook=await readXlsxFile(file.buffer); return Array.isArray(workbook)&&workbook[0]?.data?workbook[0].data:workbook; }
  if(name.endsWith('.csv')) return parseCsv(file.buffer.toString('utf8').replace(/^\uFEFF/,''));
  throw Object.assign(new Error('Only XLSX and CSV files are supported.'),{status:400,field:'file'});
}

function recordsFromRows(rows, expectedHeaders){
  if(rows.length<2) throw Object.assign(new Error('The spreadsheet must contain a header row and at least one student row.'),{status:400,field:'file'});
  const headers=rows[0].map(normalizeHeader);
  const missing=expectedHeaders.filter(header=>!headers.includes(header));
  if(missing.length) throw Object.assign(new Error(`Missing required columns: ${missing.join(', ')}`),{status:400,field:'file'});
  return rows.slice(1).map((row,index)=>({rowNumber:index+2,data:Object.fromEntries(headers.map((header,column)=>[header,row[column]??'']))})).filter(item=>String(item.data.student_id??'').trim());
}

function findStudent(input){
  const value=String(input??'').trim();
  if(!value)return null;
  return db.prepare('SELECT * FROM students WHERE id=? OR student_number=?').get(value,value)??null;
}

function studentResolution(input,at){
  const student=findStudent(input);
  if(!student)return {student:null,classRecord:null,status:'invalid',message:'Student ID not found'};
  const classRecord=resolveClassAt(student.id,at);
  return {student,classRecord,status:'valid',message:null};
}

function score(value){
  if(value===''||value===null||value===undefined)return null;
  const parsed=Number(value);return Number.isInteger(parsed)?parsed:null;
}

function publishedTeacherQuestionCount(activityId){const count=db.prepare(`SELECT COUNT(*) count FROM activity_questions aq JOIN question_blocks qb ON qb.id=aq.question_block_id WHERE aq.activity_id=? AND qb.audience='teacher' AND qb.status='published'`).get(activityId).count;if(count>5)throw Object.assign(new Error('The response-entry POC supports at most five published teacher-audience questions.'),{status:409});return count;}

function validateQuestionnaireData(data,at,questionCount=5){
  const resolved=studentResolution(data.student_id,at);
  const scores=[1,2,3,4,5].map(number=>score(data[`q${number}`]));
  if(resolved.status==='invalid')return {...resolved,scores,status:'invalid'};
  if(scores.slice(0,questionCount).some(item=>item===null||item<1||item>6)) return {...resolved,scores,status:'invalid',message:`Q1–Q${questionCount} must each be a whole number from 1 to 6`};
  if(scores.slice(questionCount).some(item=>item!==null&&(item<1||item>6))) return {...resolved,scores,status:'invalid',message:'Any optional score must be a whole number from 1 to 6'};
  return {...resolved,scores,status:'valid',message:null};
}

export async function rosterTemplate(format){
  const rows=[rosterHeaders,['S-001','Alex Chan','2B','Optional note'],['S-002','Bella Lee','2B','']];
  if(format==='csv')return {buffer:Buffer.from(rows.map(row=>row.map(csvCell).join(',')).join('\r\n'),'utf8'),mime:'text/csv; charset=utf-8',name:'bhss-activity-roster-template.csv'};
  const styled=[rosterHeaders.map(value=>({value,fontWeight:'bold',backgroundColor:'#FFF0E4'})),...rows.slice(1)];
  return {buffer:await writeExcelFile(styled,{sheet:'Participants',columns:[{width:18},{width:26},{width:18},{width:34}]}).toBuffer(),mime:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',name:'bhss-activity-roster-template.xlsx'};
}

export async function questionnaireTemplate(activityId){
  const activity=db.prepare('SELECT * FROM activities WHERE id=?').get(activityId);
  if(!activity)throw Object.assign(new Error('Activity not found.'),{status:404});
  const participants=db.prepare(`SELECT s.*,ap.id participant_id FROM activity_participants ap JOIN students s ON s.id=ap.student_id WHERE ap.activity_id=? ORDER BY s.student_number`).all(activityId);
  publishedTeacherQuestionCount(activityId);
  const questions=db.prepare(`SELECT q.id,q.prompt_zh,aq.sort_order FROM activity_questions aq JOIN questions q ON q.id=aq.question_id JOIN question_blocks qb ON qb.id=aq.question_block_id WHERE aq.activity_id=? AND qb.audience='teacher' AND qb.status='published' ORDER BY qb.sort_order,aq.sort_order LIMIT 5`).all(activityId);
  if(!questions.length)throw Object.assign(new Error('Publish at least one teacher-audience question before exporting the response-entry workbook.'),{status:409});
  const responseRows=[questionnaireHeaders.map(value=>({value,fontWeight:'bold',backgroundColor:'#FFF0E4'})),...participants.map(student=>{
    const cls=resolveClassAt(student.id,activity.starts_at.slice(0,10));
    return [student.student_number,`${student.english_name} / ${student.chinese_name}`,cls?.class_code??'',null,null,null,null,null,''];
  })];
  const guideRows=[[{value:'column',fontWeight:'bold',backgroundColor:'#F3E7DC'},{value:'question_id',fontWeight:'bold',backgroundColor:'#F3E7DC'},{value:'question',fontWeight:'bold',backgroundColor:'#F3E7DC'},{value:'scale',fontWeight:'bold',backgroundColor:'#F3E7DC'}],...questions.map((question,index)=>[`q${index+1}`,question.id,question.prompt_zh,'1–6'])];
  const buffer=await writeExcelFile([
    {data:responseRows,sheet:'Responses',columns:[{width:18},{width:28},{width:18},{width:10},{width:10},{width:10},{width:10},{width:10},{width:44}]},
    {data:guideRows,sheet:'Question guide',columns:[{width:12},{width:20},{width:64},{width:12}]}
  ]).toBuffer();
  return {buffer,mime:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',name:`${activityId}-teacher-questionnaire.xlsx`};
}

export async function createRosterImport(file,actor){
  const rows=recordsFromRows(await readRows(file),rosterHeaders);
  const batch={id:id('RIB'),activity_id:null,uploaded_by:actor,original_name:file.originalname,status:'draft',created_at:now(),committed_at:null};
  const insertBatch=db.prepare('INSERT INTO activity_roster_import_batches(id,activity_id,uploaded_by,original_name,status,created_at,committed_at) VALUES(?,?,?,?,?,?,?)');
  const insertRow=db.prepare(`INSERT INTO activity_roster_import_rows(id,batch_id,row_number,student_id_input,student_id,student_name_reference,resolved_name,class_reference,resolved_class,note,validation_status,validation_message,original_json,edited_json) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
  const seen=new Set();
  db.transaction(()=>{
    insertBatch.run(...Object.values(batch));
    for(const item of rows){
      const data=item.data;const resolution=studentResolution(data.student_id,new Date().toISOString().slice(0,10));
      const duplicate=resolution.student&&seen.has(resolution.student.id);if(resolution.student)seen.add(resolution.student.id);
      const status=duplicate?'invalid':resolution.status;const message=duplicate?'Duplicate student in import':resolution.message;
      insertRow.run(id('RIR'),batch.id,item.rowNumber,String(data.student_id).trim(),resolution.student?.id??null,String(data.student_name_reference??''),resolution.student?`${resolution.student.english_name} / ${resolution.student.chinese_name}`:null,String(data.class_reference??''),resolution.classRecord?.class_code??null,String(data.note??''),status,message,JSON.stringify(data),null);
    }
  })();
  audit(actor,'activity_roster_import.created','activity_roster_import_batch',batch.id,null,{file:file.originalname,row_count:rows.length});
  return getRosterImport(batch.id);
}

export function getRosterImport(batchId){
  const batch=db.prepare('SELECT * FROM activity_roster_import_batches WHERE id=?').get(batchId);
  if(!batch)return null;
  const rows=db.prepare('SELECT * FROM activity_roster_import_rows WHERE batch_id=? ORDER BY row_number').all(batchId);
  return {...batch,rows,valid:rows.length>0&&rows.every(row=>row.validation_status==='valid')};
}

export function updateRosterImportRow(batchId,rowId,changes,actor){
  const batch=db.prepare("SELECT * FROM activity_roster_import_batches WHERE id=? AND status='draft'").get(batchId);
  const before=db.prepare('SELECT * FROM activity_roster_import_rows WHERE id=? AND batch_id=?').get(rowId,batchId);
  if(!batch||!before)throw Object.assign(new Error('Editable roster row not found.'),{status:404});
  const studentInput=String(changes.student_id_input??before.student_id_input).trim();
  const resolution=studentResolution(studentInput,new Date().toISOString().slice(0,10));
  const duplicate=resolution.student&&db.prepare('SELECT id FROM activity_roster_import_rows WHERE batch_id=? AND student_id=? AND id<>?').get(batchId,resolution.student.id,rowId);
  const status=duplicate?'invalid':resolution.status;const message=duplicate?'Duplicate student in import':resolution.message;
  db.prepare(`UPDATE activity_roster_import_rows SET student_id_input=?,student_id=?,resolved_name=?,resolved_class=?,note=?,validation_status=?,validation_message=?,edited_json=? WHERE id=?`).run(studentInput,resolution.student?.id??null,resolution.student?`${resolution.student.english_name} / ${resolution.student.chinese_name}`:null,resolution.classRecord?.class_code??null,changes.note??before.note,status,message,JSON.stringify(changes),rowId);
  const after=db.prepare('SELECT * FROM activity_roster_import_rows WHERE id=?').get(rowId);audit(actor,'activity_roster_import.row_corrected','activity_roster_import_row',rowId,before,after);return getRosterImport(batchId);
}

export async function createQuestionnaireImport(activityId,file,actor){
  if(!file.originalname.toLowerCase().endsWith('.xlsx'))throw Object.assign(new Error('Teacher questionnaire imports must use the downloaded XLSX template.'),{status:400,field:'file'});
  const activity=db.prepare('SELECT * FROM activities WHERE id=?').get(activityId);if(!activity)throw Object.assign(new Error('Activity not found.'),{status:404});
  const rows=recordsFromRows(await readRows(file),questionnaireHeaders);
  const version=(db.prepare('SELECT COALESCE(MAX(version),0)+1 next FROM questionnaire_import_batches WHERE activity_id=?').get(activityId).next);
  const batch={id:id('QIB'),activity_id:activityId,uploaded_by:actor,original_name:file.originalname,status:'draft',version,created_at:now(),submitted_at:null};
  const insertBatch=db.prepare('INSERT INTO questionnaire_import_batches(id,activity_id,uploaded_by,original_name,status,version,created_at,submitted_at) VALUES(?,?,?,?,?,?,?,?)');
  const insertRow=db.prepare(`INSERT INTO questionnaire_import_rows(id,batch_id,row_number,student_id_input,student_id,student_name_reference,resolved_name,class_reference,q1,q2,q3,q4,q5,teacher_feedback,validation_status,validation_message,original_json,edited_json) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
  const seen=new Set();
  db.transaction(()=>{
    insertBatch.run(...Object.values(batch));
    for(const item of rows){
      const data=item.data;const validation=validateQuestionnaireData(data,activity.starts_at.slice(0,10),publishedTeacherQuestionCount(activityId));
      const participant=validation.student&&db.prepare('SELECT id FROM activity_participants WHERE activity_id=? AND student_id=?').get(activityId,validation.student.id);
      const duplicate=validation.student&&seen.has(validation.student.id);if(validation.student)seen.add(validation.student.id);
      let status=validation.status;let message=validation.message;
      if(validation.student&&!participant){status='invalid';message='Student is not a participant in this activity';}
      if(duplicate){status='invalid';message='Duplicate student in import';}
      insertRow.run(id('QIR'),batch.id,item.rowNumber,String(data.student_id).trim(),validation.student?.id??null,String(data.student_name_reference??''),validation.student?`${validation.student.english_name} / ${validation.student.chinese_name}`:null,String(data.class_reference??''),...validation.scores,String(data.teacher_feedback??''),status,message,JSON.stringify(data),null);
    }
  })();
  audit(actor,'questionnaire_import.created','questionnaire_import_batch',batch.id,null,{activity_id:activityId,file:file.originalname,row_count:rows.length,version});
  return getQuestionnaireImport(batch.id);
}

export function getQuestionnaireImport(batchId){
  const batch=db.prepare('SELECT * FROM questionnaire_import_batches WHERE id=?').get(batchId);if(!batch)return null;
  const rows=db.prepare('SELECT * FROM questionnaire_import_rows WHERE batch_id=? ORDER BY row_number').all(batchId);
  return {...batch,rows,valid:rows.length>0&&rows.every(row=>row.validation_status==='valid')};
}

export function updateQuestionnaireRow(batchId,rowId,changes,actor){
  const batch=db.prepare("SELECT * FROM questionnaire_import_batches WHERE id=? AND status='draft'").get(batchId);
  const before=db.prepare('SELECT * FROM questionnaire_import_rows WHERE id=? AND batch_id=?').get(rowId,batchId);
  if(!batch||!before)throw Object.assign(new Error('Editable questionnaire row not found.'),{status:404});
  const activity=db.prepare('SELECT * FROM activities WHERE id=?').get(batch.activity_id);
  const data={student_id:changes.student_id_input??before.student_id_input,q1:changes.q1??before.q1,q2:changes.q2??before.q2,q3:changes.q3??before.q3,q4:changes.q4??before.q4,q5:changes.q5??before.q5};
  const validation=validateQuestionnaireData(data,activity.starts_at.slice(0,10),publishedTeacherQuestionCount(batch.activity_id));
  const participant=validation.student&&db.prepare('SELECT id FROM activity_participants WHERE activity_id=? AND student_id=?').get(batch.activity_id,validation.student.id);
  const duplicate=validation.student&&db.prepare('SELECT id FROM questionnaire_import_rows WHERE batch_id=? AND student_id=? AND id<>?').get(batchId,validation.student.id,rowId);
  let status=validation.status;let message=validation.message;if(validation.student&&!participant){status='invalid';message='Student is not a participant in this activity';}if(duplicate){status='invalid';message='Duplicate student in import';}
  db.prepare(`UPDATE questionnaire_import_rows SET student_id_input=?,student_id=?,resolved_name=?,q1=?,q2=?,q3=?,q4=?,q5=?,teacher_feedback=?,validation_status=?,validation_message=?,edited_json=? WHERE id=?`).run(String(data.student_id).trim(),validation.student?.id??null,validation.student?`${validation.student.english_name} / ${validation.student.chinese_name}`:null,...validation.scores,changes.teacher_feedback??before.teacher_feedback,status,message,JSON.stringify(changes),rowId);
  const after=db.prepare('SELECT * FROM questionnaire_import_rows WHERE id=?').get(rowId);audit(actor,'questionnaire_import.row_corrected','questionnaire_import_row',rowId,before,after);return getQuestionnaireImport(batchId);
}

export function submitQuestionnaireImport(batchId,actor){
  const batch=getQuestionnaireImport(batchId);if(!batch||batch.status!=='draft')throw Object.assign(new Error('Questionnaire draft not found.'),{status:404});
  if(!batch.valid)throw Object.assign(new Error('Resolve every invalid row before submitting.'),{status:409});
  const submittedAt=now();
  db.transaction(()=>{
    db.prepare("UPDATE questionnaire_import_batches SET status='superseded' WHERE activity_id=? AND status='submitted'").run(batch.activity_id);
    db.prepare("UPDATE questionnaire_import_batches SET status='submitted',submitted_at=? WHERE id=?").run(submittedAt,batchId);
  })();
  audit(actor,'questionnaire_import.submitted','questionnaire_import_batch',batchId,{status:'draft'},{status:'submitted',submitted_at:submittedAt});return getQuestionnaireImport(batchId);
}

export function questionnaireState(activityId,user){
  const submitted=db.prepare("SELECT * FROM questionnaire_import_batches WHERE activity_id=? AND status='submitted' ORDER BY version DESC LIMIT 1").get(activityId);
  if(user.role==='student'){
    const student=db.prepare('SELECT * FROM students WHERE user_id=?').get(user.id);
    if(!submitted||!student)return {submitted:null,draft:null};
    const row=db.prepare('SELECT * FROM questionnaire_import_rows WHERE batch_id=? AND student_id=?').get(submitted.id,student.id);
    return {submitted:row?{...submitted,rows:[row]}:null,draft:null};
  }
  const draft=db.prepare("SELECT * FROM questionnaire_import_batches WHERE activity_id=? AND status='draft' ORDER BY version DESC LIMIT 1").get(activityId);
  return {submitted:submitted?getQuestionnaireImport(submitted.id):null,draft:draft?getQuestionnaireImport(draft.id):null};
}

export function commitRosterImport(batchId,activityId,actor){
  const batch=getRosterImport(batchId);if(!batch||batch.status!=='draft')throw Object.assign(new Error('Roster draft not found.'),{status:404});
  if(!batch.valid)throw Object.assign(new Error('Resolve every invalid roster row before creating the activity.'),{status:409});
  const insert=db.prepare('INSERT OR IGNORE INTO activity_participants(id,activity_id,student_id,participation_status,assigned_at) VALUES(?,?,?,?,?)');
  db.transaction(()=>{for(const row of batch.rows)insert.run(id('PAR'),activityId,row.student_id,'assigned',now());db.prepare("UPDATE activity_roster_import_batches SET status='committed',activity_id=?,committed_at=? WHERE id=?").run(activityId,now(),batchId);})();
  audit(actor,'activity_roster_import.committed','activity_roster_import_batch',batchId,{status:'draft'},{status:'committed',activity_id:activityId});
}
