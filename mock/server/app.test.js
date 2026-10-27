import test from 'node:test';
import assert from 'node:assert/strict';
import { app } from './app.js';
import writeExcelFile from 'write-excel-file/node';

const server=await new Promise(resolve=>{const instance=app.listen(0,'127.0.0.1',()=>resolve(instance));});
const base=`http://127.0.0.1:${server.address().port}/api`;

async function login(username){
  const response=await fetch(`${base}/auth/login`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username,password:'demo123'})});
  assert.equal(response.status,200);
  const data=await response.json();
  return {data,cookie:response.headers.get('set-cookie').split(';')[0]};
}

async function call(path,session,init={}){
  const headers=new Headers(init.headers);headers.set('Cookie',session.cookie);headers.set('X-Request-Key',session.data.requestKey);
  return fetch(`${base}${path}`,{...init,headers});
}

test('every protected API call requires both session cookie and request key',async()=>{
  const noAuth=await fetch(`${base}/dashboard`);assert.equal(noAuth.status,401);
  const student=await login('student1');
  const noKey=await fetch(`${base}/dashboard`,{headers:{Cookie:student.cookie}});assert.equal(noKey.status,401);
  const ok=await call('/dashboard',student);assert.equal(ok.status,200);
});

test('student history resolves the class at each activity date',async()=>{
  const student=await login('student1');
  const response=await call('/students/STU-001',student);assert.equal(response.status,200);
  const data=await response.json();
  assert.equal(data.activities.find(a=>a.id==='ACT-001').class_at_activity.class_code,'2B');
  assert.equal(data.activities.find(a=>a.id==='ACT-002').class_at_activity.class_code,'2C');
  assert.equal(data.timeline.memberships[0].student_id,'STU-001');
});

test('AI preview declares exact included and excluded data without external call',async()=>{
  const staff=await login('staff');
  const response=await call('/ai/preview-input',staff,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({studentId:'STU-001',profile:'interpersonal_growth'})});
  assert.equal(response.status,200);const data=await response.json();
  assert.equal(data.included.student.id,'STU-001');
  assert.equal(data.guardrails.may_downgrade,false);
  assert.ok(data.excluded.includes('original image bytes'));
  assert.match(data.notice,/No external LLM/);
});

test('teacher memory settings persist the UI profile and selected school period',async()=>{
  const teacher=await login('teacher');
  const response=await call('/ai/memory-settings',teacher,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({target_scope_type:'student',target_scope_id:'STU-001',output_mode:'review_and_outlook',from_period_id:'PER-2627-1',to_period_id:'PER-2627-1',include_activity_descriptions:true,include_activity_outcomes:true,include_accepted_proof_summaries:true,include_published_rubric_results:true,profile:'interpersonal_growth'})});
  assert.equal(response.status,201);const data=await response.json();
  assert.equal(data.prompt_profile,'interpersonal_growth');assert.equal(data.from_period_id,'PER-2627-1');assert.equal(data.to_period_id,'PER-2627-1');
});

test('server validates image content and creates a preview derivative',async()=>{
  const student=await login('student1');
  const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=','base64');
  const form=new FormData();form.append('file',new Blob([png],{type:'image/png'}),'pixel.png');form.append('activity_id','ACT-001');form.append('caption','Automated preview test');
  const response=await call('/evidence/upload',student,{method:'POST',body:form});assert.equal(response.status,201);const data=await response.json();
  assert.equal(data.mime_type,'image/png');assert.match(data.preview_url,/\/media\/previews\/preview-/);assert.equal(data.processing_job.status,'queued');
});

test('teacher questionnaire XLSX stays hidden until teacher submission',async()=>{
  const teacher=await login('activityteacher');const student=await login('student1');const prior=await call('/activities/ACT-001',student);const priorSubmitted=(await prior.json()).questionnaire.submitted;
  const rows=[['student_id','student_name_reference','class_reference','q1','q2','q3','q4','q5','teacher_feedback'],['S-001','Alex Chan','2B',4,5,4,3,5,'Clear collaboration evidence'],['S-002','Bella Lee','2B',3,4,3,4,4,'Good listening evidence']];
  const workbook=await writeExcelFile(rows).toBuffer();const form=new FormData();form.append('file',new Blob([workbook],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}),'teacher-questionnaire.xlsx');
  const imported=await call('/activities/ACT-001/questionnaire-imports',teacher,{method:'POST',body:form});assert.equal(imported.status,201);const batch=await imported.json();assert.equal(batch.valid,true);
  const hidden=await call('/activities/ACT-001',student);assert.equal((await hidden.json()).questionnaire.submitted?.id??null,priorSubmitted?.id??null);
  const submitted=await call(`/questionnaire-imports/${batch.id}/submit`,teacher,{method:'POST'});assert.equal(submitted.status,200);
  const visible=await call('/activities/ACT-001',student);const detail=await visible.json();assert.equal(detail.questionnaire.submitted.id,batch.id);assert.equal(detail.questionnaire.submitted.rows[0].q1,4);assert.equal(detail.questionnaire.submitted.rows.length,1);
});

test('activity roster import exposes editable identity matching before commit',async()=>{
  const teacher=await login('activityteacher');const form=new FormData();form.append('file',new Blob(['student_id,student_name_reference,class_reference,note\r\nS-001,Alex Chan,2B,\r\nS-020,Unknown,2B,'],{type:'text/csv'}),'roster.csv');
  const imported=await call('/activity-imports',teacher,{method:'POST',body:form});assert.equal(imported.status,201);const batch=await imported.json();assert.equal(batch.valid,false);
  const invalid=batch.rows.find(row=>row.validation_status==='invalid');const corrected=await call(`/activity-imports/${batch.id}/rows/${invalid.id}`,teacher,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({student_id_input:'S-002'})});assert.equal(corrected.status,200);assert.equal((await corrected.json()).valid,true);
});

test('teacher activity media is hidden until explicitly published',async()=>{
  const teacher=await login('activityteacher');const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=','base64');const form=new FormData();form.append('file',new Blob([png],{type:'image/png'}),'teacher-media.png');form.append('student_id','STU-001');form.append('activity_id','ACT-001');form.append('kind','image');
  const upload=await call('/evidence/upload',teacher,{method:'POST',body:form});assert.equal(upload.status,201);const item=await upload.json();assert.equal(item.visibility_state,'teacher_only');
  const student=await login('student1');const before=await call('/evidence',student);assert.equal((await before.json()).some(row=>row.id===item.id),false);
  const published=await call(`/evidence/${item.id}/publish`,teacher,{method:'POST'});assert.equal(published.status,200);
  const after=await call('/evidence',student);assert.equal((await after.json()).some(row=>row.id===item.id),true);
});

test('memorable activity selection is gated by a manual staff window',async()=>{
  const student=await login('student1');const initial=await call('/memorable',student);const period=(await initial.json()).period;const staff=await login('staff');await call('/memorable/window',staff,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({period_id:period.id,status:'closed'})});
  const closed=await call('/memorable',student);const closedData=await closed.json();assert.equal(closedData.eligibleActivities.length,0);
  const blocked=await call('/memorable/selection',student,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({window_id:closedData.window.id,activity_id:'ACT-001',reflection:'This was meaningful to me.'})});assert.equal(blocked.status,409);
  const opened=await call('/memorable/window',staff,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({period_id:closedData.period.id,status:'open'})});assert.equal(opened.status,200);const selectionWindow=await opened.json();
  const eligible=await call('/memorable',student);assert.ok((await eligible.json()).eligibleActivities.some(activity=>activity.id==='ACT-001'));
  const selected=await call('/memorable/selection',student,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({window_id:selectionWindow.id,activity_id:'ACT-001',reflection:'The repeated teamwork made this meaningful.'})});assert.ok([200,201].includes(selected.status));
});

test('attendance mismatch requires staff approval while attended records auto-confirm',async()=>{
  const teacher=await login('activityteacher');
  const submitted=await call('/activities/ACT-001/attendance',teacher,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({rows:[{student_id:'STU-001',planned_status:'assigned',actual_status:'attended'},{student_id:'STU-002',planned_status:'assigned',actual_status:'absent'}]})});
  assert.equal(submitted.status,200);const rows=await submitted.json();
  assert.equal(rows.find(row=>row.student_id==='STU-001').approval_status,'approved');
  assert.equal(rows.find(row=>row.student_id==='STU-002').approval_status,'pending_approval');
  const staff=await login('staff');const reviewed=await call('/activities/ACT-001/attendance-review',staff,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({decision:'approve'})});
  assert.equal(reviewed.status,200);assert.equal((await reviewed.json()).find(row=>row.student_id==='STU-002').approval_status,'approved');
});

test('VASK remains descriptive while assessment rubrics declare level capability',async()=>{
  const teacher=await login('activityteacher');const response=await call('/label-catalogues',teacher);assert.equal(response.status,200);const rows=await response.json();
  const vask=rows.find(row=>row.code==='VASK');const skills=rows.find(row=>row.code==='SKILLS-BUILDER-8X16');const rc360=rows.find(row=>row.code==='RC360');
  assert.equal(vask.assessment_capable,0);assert.equal(vask.level_min,null);
  assert.equal(skills.assessment_capable,1);assert.equal(skills.level_max,16);
  assert.equal(skills.radar_eligible,1);assert.equal(skills.levels.length,16);
  assert.equal(rc360.status,'pending_source');assert.equal(rc360.assessment_capable,0);
});

test('draft audience blocks stay hidden until the teacher publishes them',async()=>{
  const teacher=await login('activityteacher');const student=await login('student1');
  const created=await call('/activities/ACT-001/question-blocks',teacher,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({title_zh:'學生延伸反思',title_en:'Extended student reflection',audience:'student'})});assert.equal(created.status,201);const block=await created.json();
  const question=await call(`/question-blocks/${block.id}/questions`,teacher,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt:'這項活動如何改變你與他人合作的方法？',ability_code:'collaboration_reflection',ability_name_zh:'協作反思',ability_name_en:'Collaboration reflection'})});assert.equal(question.status,201);
  const hidden=await call('/activities/ACT-001/my-tasks',student);assert.equal((await hidden.json()).selfBlocks.some(row=>row.id===block.id),false);
  const published=await call(`/question-blocks/${block.id}/status`,teacher,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({status:'published'})});assert.equal(published.status,200);
  const visible=await call('/activities/ACT-001/my-tasks',student);assert.equal((await visible.json()).selfBlocks.some(row=>row.id===block.id),true);
});

test('question-ability form-definition XLSX stages a diff and stays hidden until version publication',async()=>{
  const teacher=await login('activityteacher');const student=await login('student1');
  const uniquePrompt=`這次活動中，哪一次改變最能反映你的合作方法？ ${Date.now()}`;
  const authoring=await call('/activities/ACT-001/form-authoring',teacher);assert.equal(authoring.status,200);const authoringData=await authoring.json();assert.ok(authoringData.selectedVask.some(item=>item.code==='curiosity'));assert.ok(authoringData.candidates.some(item=>item.recommended));
  const template=await call('/activities/ACT-001/form-definition-template',teacher);assert.equal(template.status,200);assert.match(template.headers.get('content-type'),/spreadsheetml/);assert.ok((await template.arrayBuffer()).byteLength>1000);
  const headers=['include','question_id','question_version','section_code','section_title_zh','section_title_en','audience','display_order','question_text_zh','question_text_en','scale_type','scale_min','scale_max','required','ability_code','ability_name_en','ability_name_zh','teacher_note'];
  const rows=[headers,
    ['yes','Q-COL-016',2,'student_self_review','學生自評','Student self-review','student',1,'我會運用隊友的回饋，改進小組工作。','','frequency_effect',1,6,'yes','collaborative_feedback','Using collaborative feedback','運用協作回饋','Wording adjusted for this activity'],
    ['yes','',1,'student_self_review','學生自評','Student self-review','student',2,uniquePrompt,'','frequency_effect',1,6,'yes','collaboration_reflection','Collaboration reflection','協作反思','New activity-specific question'],
    ['yes','Q-CREA-003',1,'teacher_observation','老師觀察','Teacher observation','teacher',1,'學生能否提出新的解難方法？','','frequency_effect',1,6,'yes','idea_generation','Idea generation','構思新方法','Teacher response-entry question']
  ];
  const workbook=await writeExcelFile([{data:rows,sheet:'Form definition'}]).toBuffer();const form=new FormData();form.append('file',new Blob([workbook],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}),'revised-form-definition.xlsx');
  const imported=await call('/activities/ACT-001/form-definition-imports',teacher,{method:'POST',body:form});assert.equal(imported.status,201);const batch=await imported.json();assert.equal(batch.valid,true);assert.equal(batch.included_count,3);assert.ok(batch.rows.some(row=>row.change_type==='modified'));assert.ok(batch.rows.some(row=>row.change_type==='added'));
  const before=await call('/activities/ACT-001/my-tasks',student);const beforeText=JSON.stringify(await before.json());assert.equal(beforeText.includes(uniquePrompt),false);
  const committed=await call(`/form-definition-imports/${batch.id}/commit`,teacher,{method:'POST'});assert.equal(committed.status,200);const version=await committed.json();assert.equal(version.status,'draft');
  const hidden=await call('/activities/ACT-001/my-tasks',student);assert.equal(JSON.stringify(await hidden.json()).includes(uniquePrompt),false);
  const published=await call(`/activity-form-versions/${version.id}/publish`,teacher,{method:'POST'});assert.equal(published.status,200);assert.equal((await published.json()).status,'published');
  const visible=await call('/activities/ACT-001/my-tasks',student);assert.equal(JSON.stringify(await visible.json()).includes(uniquePrompt),true);
  const responseTemplate=await call('/activities/ACT-001/questionnaire-template',teacher);assert.equal(responseTemplate.status,200);
});

test('processing review is role-gated and learner introduction uses student-submit teacher-approve lifecycle',async()=>{
  const student=await login('student1');assert.equal((await call('/processing-jobs',student)).status,403);
  const teacher=await login('teacher');const jobs=await call('/processing-jobs',teacher);assert.equal(jobs.status,200);assert.ok((await jobs.json()).some(job=>job.job_type==='speech_transcription'));
  const intro=await call('/students/STU-001/introduction',student,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({source_mode:'sentence_starters',draft_text:'我在合作活動中學會先聆聽，再提出自己的想法。',submit:true})});assert.equal(intro.status,200);assert.equal((await intro.json()).status,'submitted');
  const approved=await call('/students/STU-001/introduction-review',teacher,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({decision:'approve'})});assert.equal(approved.status,200);assert.equal((await approved.json()).status,'approved');
  const profile=await call('/students/STU-001/learner-profile',student);const profileData=await profile.json();assert.equal(profileData.introduction.status,'approved');assert.ok(profileData.claims.some(claim=>claim.sources.length>0));
  assert.equal(profileData.aggregation.policy_code,'MAX-CONFIRMED');assert.equal(profileData.skills['Problem Solving'],8);
});

test('activity dates resolve one school period and cross-period dates are blocked for teachers',async()=>{
  const teacher=await login('activityteacher');const resolved=await call('/periods/resolve',teacher,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({starts_at:'2026-10-01T09:00:00+08:00',ends_at:'2026-10-02T16:00:00+08:00'})});assert.equal(resolved.status,200);assert.equal((await resolved.json()).period_id,'PER-2627-1');
  const crossing=await call('/periods/resolve',teacher,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({starts_at:'2026-12-30T09:00:00+08:00',ends_at:'2027-01-05T16:00:00+08:00'})});assert.equal(crossing.status,409);
});

test('questions expose independent abilities and proof list unifies source types',async()=>{
  const teacher=await login('activityteacher');const questions=await call('/questions',teacher);const questionRows=await questions.json();assert.ok(questionRows.every(row=>row.ability_code));assert.equal('mappings' in questionRows[0],false);
  const proof=await call('/proof-list',teacher);assert.equal(proof.status,200);const proofRows=await proof.json();assert.ok(proofRows.some(row=>row.source_category==='feedback'));assert.ok(proofRows.some(row=>row.source_category==='media'||row.source_category==='feedback'));
});

test.after(()=>server.close());
