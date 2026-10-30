import { createHash } from 'node:crypto';
import { db, id, now } from '../db.js';
import { audit } from './auditService.js';

const allowedProfiles = new Set(['academic','non_academic','interpersonal_growth']);
const bool = value => value === 1 || value === true;
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');

function memoryConfig({memorySettingId,studentId,profile,actor,outputMode,fromPeriodId,toPeriodId}) {
  if(memorySettingId){
    const setting=db.prepare("SELECT * FROM review_outlook_memory_settings WHERE id=? AND status='active'").get(memorySettingId);
    if(!setting)throw Object.assign(new Error('AI memory setting not found or inactive.'),{status:404});
    return setting;
  }
  const active=db.prepare("SELECT id FROM school_periods WHERE status='active' ORDER BY starts_on DESC LIMIT 1").get()??db.prepare('SELECT id FROM school_periods ORDER BY starts_on DESC LIMIT 1').get();
  return {id:null,owner_user_id:actor,target_scope_type:'student',target_scope_id:studentId,output_mode:outputMode||'review_and_outlook',from_period_id:fromPeriodId||active?.id,to_period_id:toPeriodId||active?.id,include_activity_descriptions:1,include_activity_outcomes:1,include_accepted_proof_summaries:1,include_published_rubric_results:1,prompt_profile:profile,prompt_version:'review-outlook-v1',status:'preview'};
}

export function buildAiInput({ studentId, profile, actor, memorySettingId=null, outputMode='review_and_outlook', fromPeriodId=null, toPeriodId=null }) {
  if(!allowedProfiles.has(profile)) throw Object.assign(new Error('Unsupported prompt profile.'),{status:400});
  const student=db.prepare('SELECT id,student_number,english_name,chinese_name FROM students WHERE id=?').get(studentId);
  if(!student) throw Object.assign(new Error('Student not found.'),{status:404});
  const setting=memoryConfig({memorySettingId,studentId,profile,actor,outputMode,fromPeriodId,toPeriodId});
  const fromPeriod=db.prepare('SELECT sp.*,ay.label academic_year FROM school_periods sp JOIN academic_years ay ON ay.id=sp.academic_year_id WHERE sp.id=?').get(setting.from_period_id);
  const toPeriod=db.prepare('SELECT sp.*,ay.label academic_year FROM school_periods sp JOIN academic_years ay ON ay.id=sp.academic_year_id WHERE sp.id=?').get(setting.to_period_id);
  if(!fromPeriod||!toPeriod)throw Object.assign(new Error('Choose a valid memory period range.'),{status:400,field:'from_period_id'});
  if(fromPeriod.starts_on>toPeriod.ends_on)throw Object.assign(new Error('Memory start period must not be after the end period.'),{status:400,field:'to_period_id'});
  const activities=bool(setting.include_activity_descriptions)?db.prepare(`SELECT a.id,a.title,a.title_zh,a.description,a.activity_type,a.starts_at,a.ends_at,a.period_id,sp.label period_label,ay.label academic_year FROM activity_participants ap JOIN activities a ON a.id=ap.activity_id LEFT JOIN school_periods sp ON sp.id=a.period_id LEFT JOIN academic_years ay ON ay.id=sp.academic_year_id WHERE ap.student_id=? AND a.status='published' AND substr(a.starts_at,1,10)>=? AND substr(a.ends_at,1,10)<=? ORDER BY a.starts_at`).all(studentId,fromPeriod.starts_on,toPeriod.ends_on):[];
  const proofs=bool(setting.include_accepted_proof_summaries)?db.prepare(`SELECT pi.id,pt.code proof_type,pi.activity_id,pi.perspective,pi.summary,pi.occurred_at FROM proof_items pi JOIN proof_type_definitions pt ON pt.id=pi.proof_type_id WHERE pi.student_id=? AND pi.review_status='accepted' AND substr(pi.occurred_at,1,10)>=? AND substr(pi.occurred_at,1,10)<=? ORDER BY pi.occurred_at`).all(studentId,fromPeriod.starts_on,toPeriod.ends_on):[];
  const outcomes=bool(setting.include_activity_outcomes)?db.prepare(`SELECT ro.id,ro.activity_id,cl.name_en axis_name,rl.numeric_value confirmed_level,ro.evidence_summary,ro.observed_at FROM rubric_observations ro JOIN catalogue_labels cl ON cl.id=ro.axis_label_id LEFT JOIN rubric_levels rl ON rl.id=ro.observed_level_id WHERE ro.student_id=? AND ro.observation_status='confirmed' AND substr(ro.observed_at,1,10)>=? AND substr(ro.observed_at,1,10)<=? ORDER BY ro.observed_at`).all(studentId,fromPeriod.starts_on,toPeriod.ends_on):[];
  const results=bool(setting.include_published_rubric_results)?db.prepare(`SELECT prr.id,cl.name_en axis_name,prr.published_numeric_value,sp.label period_label,lc.code rubric_code,lc.version rubric_version,rap.code aggregation_policy,rap.version policy_version FROM published_rubric_results prr JOIN catalogue_labels cl ON cl.id=prr.axis_label_id JOIN label_catalogues lc ON lc.id=prr.rubric_catalogue_id JOIN school_periods sp ON sp.id=prr.period_id JOIN rubric_aggregation_policies rap ON rap.id=prr.aggregation_policy_id WHERE prr.student_id=? AND prr.status='published' AND sp.starts_on>=? AND sp.ends_on<=? ORDER BY sp.starts_on,cl.display_order`).all(studentId,fromPeriod.starts_on,toPeriod.ends_on):[];
  return {
    feature:'review_outlook',profile,output_mode:setting.output_mode,source_user_id:actor,generated_at:now(),
    memory_setting:{id:setting.id,from_period:{id:fromPeriod.id,label:`${fromPeriod.academic_year} ${fromPeriod.label}`},to_period:{id:toPeriod.id,label:`${toPeriod.academic_year} ${toPeriod.label}`},include_activity_descriptions:bool(setting.include_activity_descriptions),include_activity_outcomes:bool(setting.include_activity_outcomes),include_accepted_proof_summaries:bool(setting.include_accepted_proof_summaries),include_published_rubric_results:bool(setting.include_published_rubric_results)},
    included:{student,activity_descriptions:activities,distilled_activity_outcomes:outcomes,accepted_proof_summaries:proofs,published_rubric_results:results},
    guardrails:{polarity:'positive_evidence_linked_candidates_only',human_confirmation_required:true,may_publish_level:false,may_accept_proof:false,may_downgrade:false},
    excluded:['original image bytes','audio bytes','draft feedback','unreviewed proof','disabled evidence','session data','passwords'],
    notice:'This is the exact POC payload that would be sent. No external LLM is called.'
  };
}

export function createAiDraft(input){
  const {studentId,profile,actor,memorySettingId}=input;const payload=buildAiInput(input);const focus=profile==='academic'?'學習策略與解難':profile==='non_academic'?'課外參與及實踐':'人際協作與自我反思';
  const output=`回望：根據所選時段內已覆核的活動及佐證，學生在「${focus}」方面累積了具體例子。\n\n展望：下一階段可安排新的實踐機會，讓學生延續已展示的長處，並由老師覆核後再決定是否納入 Portfolio。`;
  const snapshotId=id('MEMSNAP');
  if(memorySettingId){const sources=[...payload.included.activity_descriptions.map(item=>['activity_description','activity',item.id,item.period_id||null,item.description||item.title_zh]),...payload.included.distilled_activity_outcomes.map(item=>['activity_outcome','rubric_observation',item.id,null,item.evidence_summary]),...payload.included.accepted_proof_summaries.map(item=>['proof_summary','proof_item',item.id,null,item.summary]),...payload.included.published_rubric_results.map(item=>['published_rubric_result','published_rubric_result',item.id,null,`${item.axis_name} · ${item.published_numeric_value}`])];const insert=db.prepare('INSERT INTO review_outlook_memory_items(id,memory_snapshot_id,memory_setting_id,student_id,source_kind,source_entity_type,source_entity_id,period_id,display_summary,included_at,content_hash) VALUES(?,?,?,?,?,?,?,?,?,?,?)');db.transaction(()=>sources.forEach(source=>insert.run(id('MEMITEM'),snapshotId,memorySettingId,studentId,source[0],source[1],source[2],source[3],source[4],now(),hash(source))))();}
  payload.memory_snapshot_id=memorySettingId?snapshotId:null;
  const row={id:id('AI'),feature:'review_outlook',subject_type:'student',subject_id:studentId,source_user_id:actor,input_payload_json:JSON.stringify(payload),output_text:output,prompt_profile:profile,prompt_version:'review-outlook-v1',model_label:'POC deterministic draft (no external call)',review_state:'generated',edited_by:null,created_at:now()};
  const keys=Object.keys(row); db.prepare(`INSERT INTO ai_drafts(${keys.join(',')}) VALUES(${keys.map(()=>'?').join(',')})`).run(...keys.map(k=>row[k]));audit(actor,'ai.draft.created','ai_draft',row.id,null,{...row,input_payload_json:payload});return {...row,input_payload_json:payload};
}
