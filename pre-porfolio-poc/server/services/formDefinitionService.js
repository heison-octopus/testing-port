import readXlsxFile from 'read-excel-file/node';
import writeExcelFile from 'write-excel-file/node';
import { id, now } from '../db.js';
import { FormDefinitionRepository } from '../models/formDefinitionRepository.js';
import { audit } from './auditService.js';

const repo=new FormDefinitionRepository();
const fail=(message,status=400,field)=>Object.assign(new Error(message),{status,field});
const headers=['include','question_id','question_version','section_code','section_title_zh','section_title_en','audience','display_order','question_text_zh','question_text_en','scale_type','scale_min','scale_max','required','ability_code','ability_name_en','ability_name_zh','teacher_note'];
const normalize=value=>String(value??'').trim().toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'');
const yesNo=value=>['yes','y','true','1','include','included'].includes(String(value??'').trim().toLowerCase())?'yes':'no';
const audienceFor=question=>question.source_construct_en==='Collaboration'?'student':question.source_construct_en==='Communication'?'peer':'teacher';
const sectionFor=audience=>audience==='student'?['student_self_review','學生自評','Student self-review']:audience==='peer'?['peer_review','同儕互評','Peer review']:['teacher_observation','老師觀察','Teacher observation'];

function authoringRow(question,index){
  const audience=audienceFor(question);const section=sectionFor(audience);
  return {include:'yes',question_id:question.id,question_version:question.question_version||1,section_code:section[0],section_title_zh:section[1],section_title_en:section[2],audience,display_order:index+1,question_text_zh:question.prompt_zh,question_text_en:question.prompt_en||'',scale_type:question.scale_type,scale_min:1,scale_max:6,required:'yes',ability_code:question.ability_code,ability_name_en:question.ability_name_en,ability_name_zh:question.ability_name_zh,teacher_note:'Question ability is independent from any Portfolio rubric.'};
}

export function authoringState(activityId){
  const activity=repo.activity(activityId);if(!activity)throw fail('Activity not found.',404);
  const selectedVask=repo.selectedVask(activityId);
  const candidates=repo.questionBank().map((question,index)=>({...authoringRow(question,index),source_construct_en:question.source_construct_en,source_construct_zh:question.source_construct_zh,recommended:true}));
  return {activity:{id:activity.id,title:activity.title,title_zh:activity.title_zh},selectedVask,candidates,versions:repo.versions(activityId),limits:{maximum_rows:200,question_text:4000,scale_min:1,scale_max:16},mapping_notice:'Each question keeps its own valid ability and source. Portfolio processing may interpret a response against the selected rubric only after proof review; there is no fixed question-to-rubric mapping.'};
}

export async function definitionTemplate(activityId){
  const state=authoringState(activityId);const rows=repo.questionBank().map((question,index)=>authoringRow(question,index));
  const header= headers.map(value=>({value,fontWeight:'bold',color:'#FFFFFF',backgroundColor:'#8E4C28',align:'center',borderColor:'#FFFFFF'}));
  const data=[header,...rows.map(row=>headers.map(key=>({value:row[key]??'',backgroundColor:['include','audience','display_order','question_text_zh','question_text_en','required','teacher_note'].includes(key)?'#FFF3E8':undefined,wrap:true})))];
  const instructions=[
    [{value:'BHSS activity form-definition workbook',fontWeight:'bold',fontSize:14},{value:''}],
    ['Activity',`${state.activity.id} · ${state.activity.title_zh}`],
    ['Activity labels',state.selectedVask.map(item=>item.code).join(', ')||'None selected'],
    ['Purpose','Edit question definitions only. Do not enter student responses in this workbook.'],
    ['Lifecycle','Upload → validate and compare → create draft form version → publish explicitly.'],
    ['Limits','Maximum 200 rows; question text 4,000 characters; audience teacher/student/peer; scale 1–16.'],
    ['Question ability','Every question must retain a valid ability. It is not an absolute mapping to VASK, RC360 or Skills Builder.'],
    ['include','yes = include in the new draft; no = omit.'],
    ['required','yes or no.'],
    ['Portfolio interpretation','A reviewed proof item may be interpreted against the selected rubric later; no fixed question-to-rubric column is imported.']
  ];
  const buffer=await writeExcelFile([
    {data,sheet:'Form definition',columns:[{width:12},{width:20},{width:14},{width:22},{width:24},{width:24},{width:14},{width:14},{width:58},{width:42},{width:20},{width:12},{width:12},{width:12},{width:24},{width:36},{width:26},{width:42}]},
    {data:instructions,sheet:'Instructions',columns:[{width:24},{width:92}]}
  ]).toBuffer();
  return {buffer,mime:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',name:`${activityId}-form-definition-template.xlsx`};
}

function validateRow(data,rowNumber,source){
  const errors=[];const include=yesNo(data.include);const audience=String(data.audience??'').trim().toLowerCase();const order=Number(data.display_order);const scaleMin=Number(data.scale_min);const scaleMax=Number(data.scale_max);const required=yesNo(data.required);const prompt=String(data.question_text_zh??'').trim();const abilityCode=normalize(data.ability_code);const abilityNameEn=String(data.ability_name_en??'').trim();const abilityNameZh=String(data.ability_name_zh??'').trim();
  if(!['teacher','student','peer'].includes(audience))errors.push('audience must be teacher, student or peer');
  if(!Number.isInteger(order)||order<1||order>200)errors.push('display_order must be a whole number from 1 to 200');
  if(!prompt)errors.push('question_text_zh is required');else if(prompt.length>4000)errors.push('question_text_zh exceeds 4,000 characters');
  if(!Number.isInteger(scaleMin)||!Number.isInteger(scaleMax)||scaleMin<1||scaleMax>16||scaleMin>=scaleMax)errors.push('scale_min and scale_max must define a range within 1–16');
  if(!abilityCode)errors.push('ability_code is required');if(!abilityNameEn&&!abilityNameZh)errors.push('at least one ability name is required');
  const sourceQuestionId=String(data.question_id??'').trim()||null;
  let changeType='added';
  if(source){
    const baseline=authoringRow(source,order-1,[]);
    if(include==='no')changeType='removed';
    else if(prompt!==source.prompt_zh||audience!==baseline.audience||String(data.scale_type??'').trim()!==source.scale_type||abilityCode!==source.ability_code||abilityNameEn!==source.ability_name_en||abilityNameZh!==source.ability_name_zh)changeType='modified';
    else if(order!==baseline.display_order)changeType='reordered';else changeType='unchanged';
  }
  return {id:id('FDIR'),row_number:rowNumber,include_flag:include,source_question_id:sourceQuestionId,question_version:Number(data.question_version)||1,section_code:String(data.section_code??'').trim()||`${audience}_section`,section_title_zh:String(data.section_title_zh??'').trim()||sectionFor(audience)[1],section_title_en:String(data.section_title_en??'').trim()||sectionFor(audience)[2],audience,display_order:order,prompt_zh:prompt,prompt_en:String(data.question_text_en??'').trim(),scale_type:String(data.scale_type??'').trim()||'frequency_effect',scale_min:scaleMin,scale_max:scaleMax,required:required==='yes'?1:0,ability_code:abilityCode,ability_name_en:abilityNameEn,ability_name_zh:abilityNameZh,teacher_note:String(data.teacher_note??'').trim(),validation_status:errors.length?'invalid':'valid',validation_message:errors.join('; ')||null,change_type:changeType,original_json:JSON.stringify(data)};
}

export async function stageDefinitionImport(activityId,file,actorId){
  if(!file?.originalname?.toLowerCase().endsWith('.xlsx'))throw fail('Form-definition imports must use an XLSX workbook.',400,'file');
  const state=authoringState(activityId);const workbook=await readXlsxFile(file.buffer,{sheet:'Form definition'});const rows=Array.isArray(workbook)&&workbook[0]?.data?workbook[0].data:workbook;if(rows.length<2)throw fail('The Form definition sheet must contain a header row and at least one question row.',400,'file');
  const normalized=rows[0].map(normalize);const missing=headers.filter(header=>!normalized.includes(header));if(missing.length)throw fail(`Missing required columns: ${missing.join(', ')}`,400,'file');
  const records=rows.slice(1).map((row,index)=>({rowNumber:index+2,data:Object.fromEntries(normalized.map((header,column)=>[header,row[column]??'']))})).filter(item=>Object.values(item.data).some(value=>String(value).trim()));
  if(records.length>200)throw fail('A form definition may contain at most 200 question rows.',400,'file');
  const bank=repo.questionBank();const bankById=new Map(bank.map(question=>[question.id,question]));
  const parsed=records.map(item=>validateRow(item.data,item.rowNumber,bankById.get(String(item.data.question_id??'').trim())));
  const latest=state.versions[0]?.version??null;const batch={id:id('FDI'),activity_id:activityId,uploaded_by:actorId,original_name:file.originalname,status:'staged',base_version:latest,selected_vask_json:JSON.stringify(state.selectedVask.map(item=>item.code)),created_at:now(),committed_at:null};
  const result=repo.createImport(batch,parsed);audit(actorId,'form_definition_import.staged','form_definition_import',batch.id,null,{activity_id:activityId,file:file.originalname,row_count:records.length,valid:result.valid});return result;
}

export function getDefinitionImport(batchId){return repo.importDetail(batchId);}
export function commitDefinitionImport(batchId,actorId){const batch=repo.importDetail(batchId);if(!batch)throw fail('Form-definition import not found.',404);if(batch.status!=='staged')throw fail('Only a staged import can be committed.',409);if(!batch.valid)throw fail('Resolve every invalid row before creating a draft version.',409);if(!batch.included_count)throw fail('Include at least one question before creating a draft version.',409);const version=repo.commitImport(batchId,actorId);audit(actorId,'activity_form_version.created','activity_form_version',version.id,null,version);return version;}
export function publishFormVersion(versionId,actorId){const version=repo.publishVersion(versionId);if(!version)throw fail('Form version not found.',404);audit(actorId,'activity_form_version.published','activity_form_version',version.id,null,version);return version;}
