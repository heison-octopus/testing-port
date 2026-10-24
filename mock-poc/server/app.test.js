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
  assert.ok(data.excluded.includes('original image bytes'));
  assert.match(data.notice,/No external LLM/);
});

test('server validates image content and creates a preview derivative',async()=>{
  const student=await login('student1');
  const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=','base64');
  const form=new FormData();form.append('file',new Blob([png],{type:'image/png'}),'pixel.png');form.append('activity_id','ACT-001');form.append('caption','Automated preview test');
  const response=await call('/evidence/upload',student,{method:'POST',body:form});assert.equal(response.status,201);const data=await response.json();
  assert.equal(data.mime_type,'image/png');assert.match(data.preview_url,/\/media\/previews\/preview-/);
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

test.after(()=>server.close());
