import { db, id, now } from '../db.js';
import { audit } from './auditService.js';

const allowedProfiles = new Set(['academic','non_academic','interpersonal_growth']);

export function buildAiInput({ studentId, profile, actor }) {
  if(!allowedProfiles.has(profile)) throw Object.assign(new Error('Unsupported prompt profile.'),{status:400});
  const student=db.prepare('SELECT id,student_number,english_name,chinese_name FROM students WHERE id=?').get(studentId);
  if(!student) throw Object.assign(new Error('Student not found.'),{status:404});
  const activities=db.prepare(`SELECT a.id,a.title,a.title_zh,a.description,a.activity_type,a.starts_at,a.ends_at
    FROM activity_participants ap JOIN activities a ON a.id=ap.activity_id WHERE ap.student_id=? AND a.status='published'`).all(studentId);
  const reflections=db.prepare(`SELECT id,activity_id,caption,created_at,uploaded_by FROM evidence WHERE student_id=? AND kind='reflection' AND is_disabled=0`).all(studentId);
  const feedback=db.prepare(`SELECT id,activity_id,text_value,step_observations_json,published_at,author_user_id FROM feedback WHERE student_id=? AND status='published'`).all(studentId);
  return {
    feature:'portfolio_summary', profile, source_user_id:actor, generated_at:now(),
    included:{student,activities,reflections,published_teacher_feedback:feedback},
    excluded:['original image bytes','audio bytes','draft feedback','disabled evidence','session data','passwords'],
    notice:'This is the exact POC payload that would be sent. No external LLM is called.'
  };
}

export function createAiDraft({studentId,profile,actor}){
  const payload=buildAiInput({studentId,profile,actor});
  const focus=profile==='academic'?'學習策略與解難':profile==='non_academic'?'課外參與及實踐':'人際協作與自我反思';
  const output=`POC 草稿：根據已發布資料，學生在「${focus}」方面累積了可供老師覆核的例子。此內容不會自動改變技能步階。`;
  const row={id:id('AI'),feature:'portfolio_summary',subject_type:'student',subject_id:studentId,source_user_id:actor,input_payload_json:JSON.stringify(payload),output_text:output,prompt_profile:profile,prompt_version:'v1.3-demo',model_label:'POC deterministic draft (no external call)',review_state:'generated',edited_by:null,created_at:now()};
  const keys=Object.keys(row); db.prepare(`INSERT INTO ai_drafts(${keys.join(',')}) VALUES(${keys.map(()=>'?').join(',')})`).run(...keys.map(k=>row[k]));
  audit(actor,'ai.draft.created','ai_draft',row.id,null,{...row,input_payload_json:payload});
  return {...row,input_payload_json:payload};
}
