import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';
import { db, id, now, uploadsDir, previewsDir, hashSecret } from '../db.js';
import { Repository } from '../models/repository.js';
import { audit } from '../services/auditService.js';
import { activityParticipants, applyRollover, moveStudent, previewRollover, recordSchoolStatus, resolveClassAt, studentTimeline } from '../services/schoolService.js';
import { buildAiInput, createAiDraft } from '../services/aiService.js';
import { commitRosterImport, createQuestionnaireImport, createRosterImport, getQuestionnaireImport, getRosterImport, questionnaireState, questionnaireTemplate, rosterTemplate, submitQuestionnaireImport, updateQuestionnaireRow, updateRosterImportRow } from '../services/importService.js';
import { clearSession, createSession, login } from '../middleware/session.js';
import { createHash, randomBytes } from 'node:crypto';

const repo = table => new Repository(table);
const digest = value => createHash('sha256').update(value).digest('hex');
const parseJson = value => { try { return JSON.parse(value); } catch { return value; } };
const publicUser = u => ({id:u.id,username:u.username,display_name:u.display_name,display_name_zh:u.display_name_zh,role:u.role});

function studentForUser(userId){return db.prepare('SELECT * FROM students WHERE user_id=?').get(userId);}
function visibleStudentIds(user){
  if(user.role==='student') return [studentForUser(user.id)?.id].filter(Boolean);
  if(user.role==='class_teacher') return db.prepare(`SELECT DISTINCT scm.student_id FROM student_class_memberships scm JOIN classes c ON c.id=scm.class_id WHERE c.class_teacher_user_id=? AND scm.valid_to IS NULL`).all(user.id).map(x=>x.student_id);
  if(user.role==='activity_teacher') return db.prepare(`SELECT DISTINCT ap.student_id FROM activity_participants ap JOIN activity_staff ast ON ast.activity_id=ap.activity_id WHERE ast.user_id=?`).all(user.id).map(x=>x.student_id);
  return db.prepare('SELECT id student_id FROM students').all().map(x=>x.student_id);
}
function assertStudentVisible(user,studentId){if(!visibleStudentIds(user).includes(studentId)) throw Object.assign(new Error('Student is outside this account scope.'),{status:403});}
function sendDownload(res,file){res.setHeader('Content-Type',file.mime);res.setHeader('Content-Disposition',`attachment; filename="${file.name}"`);res.send(file.buffer);}
function assertBatchOwner(user,batch){if(!batch)throw Object.assign(new Error('Import batch not found.'),{status:404});if(!['staff','school_admin'].includes(user.role)&&batch.uploaded_by!==user.id)throw Object.assign(new Error('This import belongs to another account.'),{status:403});}

export function demoUsers(req,res){res.json(db.prepare('SELECT id,username,display_name,display_name_zh,role FROM users WHERE is_active=1 ORDER BY CASE role WHEN \'student\' THEN 1 WHEN \'class_teacher\' THEN 2 WHEN \'activity_teacher\' THEN 3 WHEN \'staff\' THEN 4 ELSE 5 END').all());}
export function signIn(req,res){
  const result=login(req.body?.username,req.body?.password);
  if(!result) return res.status(401).json({error:'Incorrect account or password.'});
  res.cookie('bhss_session',result.session.token,{httpOnly:true,sameSite:'lax',secure:false,maxAge:8*60*60*1000,path:'/'});
  audit(result.user.id,'session.login','session',null,null,{role:result.user.role});
  res.json({user:publicUser(result.user),requestKey:result.session.requestKey,expiresAt:result.session.expires});
}
export function sessionInfo(req,res){res.json({user:req.auth.user});}
export function signOut(req,res){audit(req.auth.user.id,'session.logout','session',req.auth.sessionId);clearSession(req);res.clearCookie('bhss_session',{path:'/'});res.json({ok:true});}
export function switchAccount(req,res){
  const target=db.prepare('SELECT * FROM users WHERE id=? AND is_active=1').get(req.body?.userId);
  if(!target) return res.status(404).json({error:'Demo account not found.'});
  db.prepare('DELETE FROM sessions WHERE id=?').run(req.auth.sessionId);
  const s=createSession(target.id);
  res.cookie('bhss_session',s.token,{httpOnly:true,sameSite:'lax',secure:false,maxAge:8*60*60*1000,path:'/'});
  audit(req.auth.user.id,'session.demo_switch','user',target.id,null,{to_role:target.role});
  res.json({user:publicUser(target),requestKey:s.requestKey,expiresAt:s.expires});
}

export function dashboard(req,res){
  const user=req.auth.user; const ids=visibleStudentIds(user);
  const activityWhere=user.role==='student'?`WHERE ap.student_id=?`:user.role==='activity_teacher'?`WHERE ast.user_id=?`:'';
  let activities;
  if(user.role==='student') activities=db.prepare(`SELECT DISTINCT a.* FROM activities a JOIN activity_participants ap ON ap.activity_id=a.id ${activityWhere} ORDER BY a.starts_at DESC`).all(ids[0]??'');
  else if(user.role==='activity_teacher') activities=db.prepare(`SELECT DISTINCT a.* FROM activities a JOIN activity_staff ast ON ast.activity_id=a.id ${activityWhere} ORDER BY a.starts_at DESC`).all(user.id);
  else activities=db.prepare('SELECT * FROM activities ORDER BY starts_at DESC').all();
  const openDecisions=db.prepare("SELECT COUNT(*) count FROM requirements_decisions WHERE status='open'").get().count;
  const recentAudit=['staff','school_admin'].includes(user.role)?db.prepare(`SELECT al.*,u.display_name_zh actor_name FROM audit_logs al LEFT JOIN users u ON u.id=al.actor_user_id ORDER BY al.created_at DESC LIMIT 8`).all():[];
  res.json({counts:{students:ids.length,activities:activities.length,openDecisions},activities:activities.slice(0,5),recentAudit});
}

export function listActivities(req,res){
  const user=req.auth.user;
  let rows;
  if(user.role==='student') rows=db.prepare(`SELECT DISTINCT a.* FROM activities a JOIN activity_participants ap ON ap.activity_id=a.id JOIN students s ON s.id=ap.student_id WHERE s.user_id=? ORDER BY a.starts_at DESC`).all(user.id);
  else if(user.role==='activity_teacher') rows=db.prepare(`SELECT DISTINCT a.* FROM activities a JOIN activity_staff ast ON ast.activity_id=a.id WHERE ast.user_id=? ORDER BY a.starts_at DESC`).all(user.id);
  else rows=repo('activities').list({},'starts_at DESC');
  res.json(rows);
}
export function activityDetail(req,res){
  const activity=repo('activities').find(req.params.id); if(!activity) return res.status(404).json({error:'Activity not found.'});
  const participants=activityParticipants(activity.id); const visible=new Set(visibleStudentIds(req.auth.user));
  if(req.auth.user.role==='student' && !participants.some(p=>visible.has(p.student_id))) return res.status(403).json({error:'Activity is outside this account scope.'});
  const questions=db.prepare(`SELECT q.*,aq.sort_order,aq.required FROM activity_questions aq JOIN questions q ON q.id=aq.question_id WHERE aq.activity_id=? ORDER BY aq.sort_order`).all(activity.id).map(q=>({...q,labels_json:parseJson(q.labels_json)}));
  const vask=db.prepare("SELECT * FROM activity_vask WHERE activity_id=? ORDER BY CASE dimension WHEN 'V' THEN 1 WHEN 'A' THEN 2 WHEN 'S' THEN 3 WHEN 'K' THEN 4 END").all(activity.id);
  const feedback= req.auth.user.role==='student'
    ? db.prepare(`SELECT f.*,u.display_name_zh author_name FROM feedback f JOIN users u ON u.id=f.author_user_id JOIN students s ON s.id=f.student_id WHERE f.activity_id=? AND s.user_id=? AND f.status='published'`).all(activity.id,req.auth.user.id)
    : db.prepare(`SELECT f.*,u.display_name_zh author_name,s.student_number FROM feedback f JOIN users u ON u.id=f.author_user_id JOIN students s ON s.id=f.student_id WHERE f.activity_id=?`).all(activity.id);
  const safeParticipants=req.auth.user.role==='student'?participants.filter(p=>visible.has(p.student_id)):participants;
  res.json({activity,participants:safeParticipants,questions,vask,feedback:feedback.map(f=>({...f,step_observations_json:parseJson(f.step_observations_json)})),questionnaire:questionnaireState(activity.id,req.auth.user)});
}
export function createActivity(req,res){
  const body=req.body??{}; const row={id:id('ACT'),title:body.title||body.title_zh||'Untitled activity',title_zh:body.title_zh||body.title||'未命名活動',description:body.description||'',activity_type:body.activity_type||'both',starts_at:body.starts_at,ends_at:body.ends_at,status:'draft',owner_user_id:body.owner_user_id||req.auth.user.id,created_by:req.auth.user.id,created_at:now()};
  if(!row.starts_at||!row.ends_at) return res.status(400).json({error:'Start and end dates are required.',field:'starts_at'});
  if(body.roster_import_batch_id){const batch=getRosterImport(body.roster_import_batch_id);assertBatchOwner(req.auth.user,batch);if(!batch.valid||batch.status!=='draft')return res.status(409).json({error:'Resolve every roster row before creating the activity.'});}
  repo('activities').create(row); repo('activity_staff').create({id:id('AST'),activity_id:row.id,user_id:row.owner_user_id,staff_role:'owner'});
  for(const studentId of body.student_ids??[]) repo('activity_participants').create({id:id('PAR'),activity_id:row.id,student_id:studentId,participation_status:'assigned',assigned_at:now()});
  if(body.roster_import_batch_id){const batch=getRosterImport(body.roster_import_batch_id);assertBatchOwner(req.auth.user,batch);commitRosterImport(body.roster_import_batch_id,row.id,req.auth.user.id);}
  for(const item of body.vask??[]) repo('activity_vask').create({id:id('VASK'),activity_id:row.id,dimension:item.dimension,item:item.item,weight_percent:item.weight_percent??25,status:'draft'});
  audit(req.auth.user.id,'activity.created','activity',row.id,null,row); res.status(201).json(row);
}
export function updateActivity(req,res){const before=repo('activities').find(req.params.id);if(!before)return res.status(404).json({error:'Activity not found.'});const allowed=['title','title_zh','description','activity_type','starts_at','ends_at','status','owner_user_id'];const changes=Object.fromEntries(Object.entries(req.body??{}).filter(([k])=>allowed.includes(k)));const after=repo('activities').update(req.params.id,changes);audit(req.auth.user.id,'activity.updated','activity',req.params.id,before,after);res.json(after);}

export async function downloadRosterTemplate(req,res){sendDownload(res,await rosterTemplate(req.params.format));}
export async function importRoster(req,res){if(!req.file)return res.status(400).json({error:'Choose an XLSX or CSV roster file.',field:'file'});res.status(201).json(await createRosterImport(req.file,req.auth.user.id));}
export function rosterImportDetail(req,res){const batch=getRosterImport(req.params.id);assertBatchOwner(req.auth.user,batch);res.json(batch);}
export function editRosterImportRow(req,res){const batch=getRosterImport(req.params.id);assertBatchOwner(req.auth.user,batch);res.json(updateRosterImportRow(req.params.id,req.params.rowId,req.body??{},req.auth.user.id));}

export async function downloadQuestionnaireTemplate(req,res){sendDownload(res,await questionnaireTemplate(req.params.id));}
export async function importQuestionnaire(req,res){if(!req.file)return res.status(400).json({error:'Choose the completed XLSX questionnaire.',field:'file'});res.status(201).json(await createQuestionnaireImport(req.params.id,req.file,req.auth.user.id));}
export function questionnaireImportDetail(req,res){const batch=getQuestionnaireImport(req.params.batchId);assertBatchOwner(req.auth.user,batch);res.json(batch);}
export function editQuestionnaireImportRow(req,res){const batch=getQuestionnaireImport(req.params.batchId);assertBatchOwner(req.auth.user,batch);res.json(updateQuestionnaireRow(req.params.batchId,req.params.rowId,req.body??{},req.auth.user.id));}
export function submitQuestionnaire(req,res){const batch=getQuestionnaireImport(req.params.batchId);assertBatchOwner(req.auth.user,batch);res.json(submitQuestionnaireImport(req.params.batchId,req.auth.user.id));}

export function listStudents(req,res){
  const ids=visibleStudentIds(req.auth.user); if(!ids.length) return res.json([]);
  const placeholders=ids.map(()=>'?').join(',');
  const rows=db.prepare(`SELECT * FROM students WHERE id IN (${placeholders}) ORDER BY student_number`).all(...ids).map(s=>({...s,current_class:resolveClassAt(s.id,new Date().toISOString().slice(0,10))}));
  res.json(rows);
}
export function studentDetail(req,res){assertStudentVisible(req.auth.user,req.params.id);const student=repo('students').find(req.params.id);if(!student)return res.status(404).json({error:'Student not found.'});const timeline=studentTimeline(student.id);const activities=db.prepare(`SELECT a.*,ap.participation_status FROM activity_participants ap JOIN activities a ON a.id=ap.activity_id WHERE ap.student_id=? ORDER BY a.starts_at DESC`).all(student.id).map(a=>({...a,class_at_activity:resolveClassAt(student.id,a.starts_at.slice(0,10))}));const aiDrafts=db.prepare('SELECT * FROM ai_drafts WHERE subject_type=\'student\' AND subject_id=? ORDER BY created_at DESC').all(student.id).map(a=>({...a,input_payload_json:parseJson(a.input_payload_json)}));res.json({student,timeline,activities,aiDrafts});}
export function createStudent(req,res){const b=req.body??{};if(!b.student_number||!b.english_name||!b.chinese_name)return res.status(400).json({error:'Student number and both names are required.',field:'student_number'});const row={id:id('STU'),user_id:null,student_number:b.student_number,english_name:b.english_name,chinese_name:b.chinese_name,date_of_birth:b.date_of_birth||null,created_at:now(),disabled_at:null,disabled_reason:null};repo('students').create(row);repo('student_school_status_history').create({id:id('SSH'),student_id:row.id,status:'active',valid_from:b.valid_from||new Date().toISOString().slice(0,10),valid_to:null,reason:'Created through student generator',created_by:req.auth.user.id,created_at:now()});if(b.class_id)moveStudent({studentId:row.id,academicYearId:b.academic_year_id,periodId:b.period_id,classId:b.class_id,gradeLevel:b.grade_level,validFrom:b.valid_from,changeType:'initial',reason:'Initial placement',actor:req.auth.user.id});audit(req.auth.user.id,'student.created','student',row.id,null,row);res.status(201).json(row);}
export function changeMembership(req,res){assertStudentVisible(req.auth.user,req.params.id);res.status(201).json(moveStudent({...req.body,studentId:req.params.id,actor:req.auth.user.id}));}
export function changeSchoolStatus(req,res){assertStudentVisible(req.auth.user,req.params.id);const {status,validFrom,reason}=req.body??{};if(!status||!validFrom)return res.status(400).json({error:'Status and effective date are required.'});res.status(201).json(recordSchoolStatus({studentId:req.params.id,status,validFrom,reason,actor:req.auth.user.id}));}

export function listClasses(req,res){res.json(db.prepare(`SELECT c.*,ay.label academic_year,u.display_name_zh teacher_name,(SELECT COUNT(*) FROM student_class_memberships scm WHERE scm.class_id=c.id AND scm.valid_to IS NULL) student_count FROM classes c JOIN academic_years ay ON ay.id=c.academic_year_id LEFT JOIN users u ON u.id=c.class_teacher_user_id ORDER BY ay.starts_on DESC,c.code`).all());}
export function createClass(req,res){const b=req.body??{};const row={id:id('CLS'),academic_year_id:b.academic_year_id,code:b.code,grade_level:b.grade_level,class_teacher_user_id:b.class_teacher_user_id||null,is_active:1};repo('classes').create(row);audit(req.auth.user.id,'class.created','class',row.id,null,row);res.status(201).json(row);}
export function periods(req,res){res.json({academicYears:repo('academic_years').list({},'starts_on DESC'),periods:repo('school_periods').list({},'starts_on DESC')});}

export function rolloverPreview(req,res){res.status(201).json(previewRollover({...req.body,actor:req.auth.user.id}));}
export function rolloverApply(req,res){res.json(applyRollover(req.params.id,req.body?.confirmations??{},req.auth.user.id));}

export function listQuestions(req,res){const rows=db.prepare(`SELECT q.*,(SELECT json_group_array(json_object('skill',m.skill,'weight_percent',m.weight_percent,'step_min',m.observable_step_min,'step_max',m.observable_step_max,'status',m.status)) FROM question_skill_mappings m WHERE m.question_id=q.id) mappings FROM questions q ORDER BY q.source_row`).all();res.json(rows.map(q=>({...q,labels_json:parseJson(q.labels_json),mappings:parseJson(q.mappings)})));}
export function listDecisions(req,res){res.json(repo('requirements_decisions').list({},"CASE level WHEN 'high' THEN 1 WHEN 'mid' THEN 2 ELSE 3 END, id"));}
export function updateDecision(req,res){const before=repo('requirements_decisions').find(req.params.id);const after=repo('requirements_decisions').update(req.params.id,{status:req.body.status,answer:req.body.answer??null});audit(req.auth.user.id,'decision.updated','requirements_decision',req.params.id,before,after);res.json(after);}

export function listEvidence(req,res){
  const ids=visibleStudentIds(req.auth.user); if(!ids.length)return res.json([]); const placeholders=ids.map(()=>'?').join(',');
  const studentFilter=req.auth.user.role==='student'?` AND (e.uploaded_by=? OR e.visibility_state='student_visible')`:'';
  const rows=db.prepare(`SELECT e.*,s.student_number,u.display_name_zh uploader_name,a.title_zh activity_title FROM evidence e JOIN students s ON s.id=e.student_id JOIN users u ON u.id=e.uploaded_by LEFT JOIN activities a ON a.id=e.activity_id WHERE e.student_id IN (${placeholders})${studentFilter} ORDER BY e.created_at DESC`).all(...ids,...(req.auth.user.role==='student'?[req.auth.user.id]:[]));
  res.json(rows.map(e=>({...e,preview_url:e.preview_name?`/media/previews/${e.preview_name}`:null})));
}
export async function uploadEvidence(req,res){
  const studentId=req.auth.user.role==='student'?studentForUser(req.auth.user.id)?.id:req.body.student_id;
  if(!studentId)return res.status(400).json({error:'Student is required.',field:'student_id'});assertStudentVisible(req.auth.user,studentId);
  if(!req.file)return res.status(400).json({error:'Choose a JPG or PNG file.',field:'file'});
  let metadata;try{metadata=await sharp(req.file.buffer).metadata();}catch{return res.status(400).json({error:'The file is not a valid JPG or PNG image.',field:'file'});}
  if(!['jpeg','png'].includes(metadata.format))return res.status(400).json({error:'Only JPG and PNG images are supported.',field:'file'});
  const ext=metadata.format==='jpeg'?'jpg':'png';const base=`${id('IMG')}.${ext}`;const preview=`preview-${base.replace(/\.(jpg|png)$/i,'.jpg')}`;
  writeFileSync(join(uploadsDir,base),req.file.buffer);await sharp(req.file.buffer).rotate().resize({width:960,height:720,fit:'inside',withoutEnlargement:true}).jpeg({quality:78}).toFile(join(previewsDir,preview));
  const kind=req.body.kind||'image';const mediaCategory=kind==='certificate'?'certificate':'activity';
  if(mediaCategory==='activity'&&!req.body.activity_id)return res.status(400).json({error:'Choose the related activity for activity media.',field:'activity_id'});
  const visibility=req.auth.user.role==='student'?(mediaCategory==='certificate'?'pending_review':'student_visible'):'teacher_only';
  const row={id:id('EVD'),activity_id:req.body.activity_id||null,student_id:studentId,uploaded_by:req.auth.user.id,kind,media_category:mediaCategory,visibility_state:visibility,original_name:req.file.originalname,storage_name:base,preview_name:preview,mime_type:`image/${metadata.format}`,size_bytes:req.file.size,caption:req.body.caption||'',is_disabled:0,disabled_reason:null,disabled_by:null,disabled_at:null,created_at:now()};repo('evidence').create(row);audit(req.auth.user.id,'evidence.uploaded','evidence',row.id,null,{...row,storage_name:'[protected original]'});res.status(201).json({...row,preview_url:`/media/previews/${preview}`});
}
export function createReflection(req,res){const studentId=req.auth.user.role==='student'?studentForUser(req.auth.user.id)?.id:req.body.student_id;if(!studentId||!req.body.caption)return res.status(400).json({error:'Reflection text is required.',field:'caption'});assertStudentVisible(req.auth.user,studentId);const row={id:id('EVD'),activity_id:req.body.activity_id||null,student_id:studentId,uploaded_by:req.auth.user.id,kind:'reflection',media_category:'activity',visibility_state:'student_visible',original_name:'reflection.txt',storage_name:null,preview_name:null,mime_type:'text/plain',size_bytes:Buffer.byteLength(req.body.caption),caption:req.body.caption,is_disabled:0,disabled_reason:null,disabled_by:null,disabled_at:null,created_at:now()};repo('evidence').create(row);audit(req.auth.user.id,'reflection.submitted','evidence',row.id,null,row);res.status(201).json(row);}
export function disableEvidence(req,res){const before=repo('evidence').find(req.params.id);if(!before)return res.status(404).json({error:'Evidence not found.'});if(!req.body.reason)return res.status(400).json({error:'A disable reason is required.',field:'reason'});const after=repo('evidence').update(req.params.id,{is_disabled:1,disabled_reason:req.body.reason,disabled_by:req.auth.user.id,disabled_at:now()});audit(req.auth.user.id,'evidence.disabled','evidence',req.params.id,before,after);res.json(after);}
export function publishEvidence(req,res){const before=repo('evidence').find(req.params.id);if(!before)return res.status(404).json({error:'Evidence not found.'});assertStudentVisible(req.auth.user,before.student_id);const after=repo('evidence').update(req.params.id,{visibility_state:'student_visible'});audit(req.auth.user.id,'evidence.published','evidence',req.params.id,before,after);res.json(after);}
export async function sampleImage(req,res){const format=req.params.format==='jpg'?'jpeg':'png';if(!['jpeg','png'].includes(format))return res.status(404).json({error:'Sample format not found.'});const svg=Buffer.from(`<svg width="1200" height="800" xmlns="http://www.w3.org/2000/svg"><rect width="1200" height="800" fill="#fff0e4"/><rect x="80" y="80" width="1040" height="640" fill="#ffffff" stroke="#d77a35" stroke-width="8"/><text x="600" y="350" text-anchor="middle" font-family="Arial" font-size="72" font-weight="700" fill="#5c4638">BHSS POC</text><text x="600" y="440" text-anchor="middle" font-family="Arial" font-size="42" fill="#765f50">Dummy upload image</text></svg>`);const buffer=format==='jpeg'?await sharp(svg).jpeg({quality:88}).toBuffer():await sharp(svg).png().toBuffer();res.setHeader('Content-Type',`image/${format}`);res.setHeader('Content-Disposition',`attachment; filename="bhss-dummy-upload.${req.params.format}"`);res.send(buffer);}

export function memorableState(req,res){
  const period=db.prepare("SELECT sp.*,ay.label academic_year FROM school_periods sp JOIN academic_years ay ON ay.id=sp.academic_year_id WHERE sp.status='active' ORDER BY sp.starts_on DESC LIMIT 1").get()??db.prepare('SELECT sp.*,ay.label academic_year FROM school_periods sp JOIN academic_years ay ON ay.id=sp.academic_year_id ORDER BY sp.starts_on DESC LIMIT 1').get();
  const window=period?db.prepare('SELECT * FROM memorable_activity_windows WHERE period_id=?').get(period.id):null;
  if(req.auth.user.role==='student'){
    const student=studentForUser(req.auth.user.id);const eligible=student?db.prepare(`SELECT a.id,a.title,a.title_zh,a.starts_at FROM activities a JOIN activity_participants ap ON ap.activity_id=a.id WHERE ap.student_id=? AND a.status='published' ORDER BY a.starts_at DESC`).all(student.id):[];
    const selection=window&&student?db.prepare('SELECT smas.*,a.title,a.title_zh FROM student_memorable_activity_selections smas JOIN activities a ON a.id=smas.activity_id WHERE smas.window_id=? AND smas.student_id=?').get(window.id,student.id):null;
    return res.json({period,window,eligibleActivities:window?.status==='open'?eligible:[],selection});
  }
  const selections=window?db.prepare(`SELECT smas.*,s.student_number,s.english_name,s.chinese_name,a.title,a.title_zh FROM student_memorable_activity_selections smas JOIN students s ON s.id=smas.student_id JOIN activities a ON a.id=smas.activity_id WHERE smas.window_id=? ORDER BY s.student_number`).all(window.id):[];
  res.json({period,window,eligibleActivities:[],selections});
}
export function setMemorableWindow(req,res){
  const periodId=req.body.period_id||db.prepare("SELECT id FROM school_periods WHERE status='active' ORDER BY starts_on DESC LIMIT 1").get()?.id;if(!periodId)return res.status(400).json({error:'No reporting period is available.'});
  const status=req.body.status;if(!['open','closed'].includes(status))return res.status(400).json({error:'Window status must be open or closed.'});
  const before=db.prepare('SELECT * FROM memorable_activity_windows WHERE period_id=?').get(periodId);const stamp=now();
  if(before)db.prepare('UPDATE memorable_activity_windows SET status=?,opens_at=?,closes_at=?,opened_by=?,closed_by=?,updated_at=? WHERE id=?').run(status,status==='open'?(before.opens_at||stamp):before.opens_at,req.body.closes_at||before.closes_at,status==='open'?req.auth.user.id:before.opened_by,status==='closed'?req.auth.user.id:null,stamp,before.id);
  else db.prepare('INSERT INTO memorable_activity_windows(id,period_id,status,opens_at,closes_at,opened_by,closed_by,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?)').run(id('MAW'),periodId,status,status==='open'?stamp:null,req.body.closes_at||null,status==='open'?req.auth.user.id:null,status==='closed'?req.auth.user.id:null,stamp,stamp);
  const after=db.prepare('SELECT * FROM memorable_activity_windows WHERE period_id=?').get(periodId);audit(req.auth.user.id,`memorable_window.${status}`,'memorable_activity_window',after.id,before,after);res.json(after);
}
export function submitMemorableSelection(req,res){
  const student=studentForUser(req.auth.user.id);if(!student)return res.status(403).json({error:'Only a linked student account can submit a selection.'});
  const window=db.prepare("SELECT * FROM memorable_activity_windows WHERE id=? AND status='open'").get(req.body.window_id);if(!window)return res.status(409).json({error:'The memorable-activity portal is not open.'});
  const eligible=db.prepare("SELECT a.id FROM activities a JOIN activity_participants ap ON ap.activity_id=a.id WHERE a.id=? AND a.status='published' AND ap.student_id=?").get(req.body.activity_id,student.id);if(!eligible)return res.status(400).json({error:'Choose one of your published activities.',field:'activity_id'});if(!String(req.body.reflection??'').trim())return res.status(400).json({error:'Explain why this activity is meaningful.',field:'reflection'});
  const before=db.prepare('SELECT * FROM student_memorable_activity_selections WHERE window_id=? AND student_id=?').get(window.id,student.id);const stamp=now();
  if(before)db.prepare('UPDATE student_memorable_activity_selections SET activity_id=?,reflection=?,updated_at=? WHERE id=?').run(req.body.activity_id,String(req.body.reflection).trim(),stamp,before.id);
  else db.prepare('INSERT INTO student_memorable_activity_selections(id,window_id,student_id,activity_id,reflection,submitted_at,updated_at) VALUES(?,?,?,?,?,?,?)').run(id('MAS'),window.id,student.id,req.body.activity_id,String(req.body.reflection).trim(),stamp,stamp);
  const after=db.prepare('SELECT * FROM student_memorable_activity_selections WHERE window_id=? AND student_id=?').get(window.id,student.id);audit(req.auth.user.id,'memorable_selection.submitted','student_memorable_activity_selection',after.id,before,after);res.status(before?200:201).json(after);
}

export function aiInput(req,res){assertStudentVisible(req.auth.user,req.body.studentId);res.json(buildAiInput({studentId:req.body.studentId,profile:req.body.profile,actor:req.auth.user.id}));}
export function aiDraft(req,res){assertStudentVisible(req.auth.user,req.body.studentId);res.status(201).json(createAiDraft({studentId:req.body.studentId,profile:req.body.profile,actor:req.auth.user.id}));}
export function listAi(req,res){const ids=visibleStudentIds(req.auth.user);if(!ids.length)return res.json([]);const p=ids.map(()=>'?').join(',');const rows=db.prepare(`SELECT ai.*,u.display_name_zh source_name,s.student_number FROM ai_drafts ai JOIN users u ON u.id=ai.source_user_id JOIN students s ON s.id=ai.subject_id WHERE ai.subject_type='student' AND ai.subject_id IN (${p}) ORDER BY ai.created_at DESC`).all(...ids);res.json(rows.map(a=>({...a,input_payload_json:parseJson(a.input_payload_json)})));}

export function listUsers(req,res){const rows=req.auth.user.role==='staff'?db.prepare("SELECT id,username,display_name,display_name_zh,role,is_active,created_at FROM users WHERE role IN ('class_teacher','activity_teacher') ORDER BY role,username").all():db.prepare('SELECT id,username,display_name,display_name_zh,role,is_active,created_at FROM users ORDER BY role,username').all();res.json(rows);}
export function listSessions(req,res){res.json(db.prepare(`SELECT s.id,s.user_id,s.expires_at,s.created_at,s.last_seen_at,u.username,u.display_name_zh,u.role FROM sessions s JOIN users u ON u.id=s.user_id ORDER BY s.last_seen_at DESC`).all());}

export function createFeedback(req,res){const b=req.body??{};assertStudentVisible(req.auth.user,b.student_id);const row={id:id('FDB'),activity_id:b.activity_id,student_id:b.student_id,author_user_id:req.auth.user.id,text_value:b.text_value,step_observations_json:JSON.stringify(b.step_observations??{}),status:b.status||'draft',submitted_at:b.status==='submitted'?now():null,published_at:b.status==='published'?now():null};repo('feedback').create(row);audit(req.auth.user.id,'feedback.created','feedback',row.id,null,row);res.status(201).json(row);}
export function updateFeedback(req,res){const before=repo('feedback').find(req.params.id);if(!before)return res.status(404).json({error:'Feedback not found.'});const nextStatus=req.body.status??before.status;const changes={...('text_value'in req.body?{text_value:req.body.text_value}:{}),status:nextStatus,published_at:nextStatus==='published'?now():nextStatus==='returned'?null:before.published_at,submitted_at:['submitted','published'].includes(nextStatus)?(before.submitted_at||now()):before.submitted_at};const after=repo('feedback').update(req.params.id,changes);audit(req.auth.user.id,`feedback.${nextStatus}`,'feedback',req.params.id,before,after);res.json(after);}

export function createDemoUser(req,res){const b=req.body??{};const row={id:id('USR'),username:b.username,display_name:b.display_name,display_name_zh:b.display_name_zh,role:b.role,password_hash:hashSecret(b.password||'demo123'),is_active:1,created_at:now()};repo('users').create(row);audit(req.auth.user.id,'user.created','user',row.id,null,publicUser(row));res.status(201).json(publicUser(row));}
