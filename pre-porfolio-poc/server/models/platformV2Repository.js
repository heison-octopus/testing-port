import { db, id, now } from '../db.js';

const parse = value => { try { return JSON.parse(value); } catch { return value; } };

export class PlatformV2Repository {
  activityExists(activityId) {
    return db.prepare('SELECT id FROM activities WHERE id=?').get(activityId);
  }

  studentForUser(userId) {
    return db.prepare('SELECT * FROM students WHERE user_id=?').get(userId);
  }

  activityWorkspace(activityId) {
    const attendance = db.prepare(`
      SELECT aa.*,s.student_number,s.english_name,s.chinese_name
      FROM activity_attendance aa JOIN students s ON s.id=aa.student_id
      WHERE aa.activity_id=? ORDER BY s.student_number
    `).all(activityId);
    const labels = db.prepare(`
      SELECT al.id activity_label_id,al.label_role,cl.id label_id,cl.code,cl.name_en,cl.name_zh,
             lc.code catalogue_code,lc.name catalogue_name,lc.catalogue_kind,lc.labelling_capable,lc.assessment_capable,lc.radar_eligible,lc.level_min,lc.level_max,lc.status catalogue_status
      FROM activity_labels al JOIN catalogue_labels cl ON cl.id=al.label_id
      JOIN label_catalogues lc ON lc.id=cl.catalogue_id
      WHERE al.activity_id=? ORDER BY lc.code,cl.display_order
    `).all(activityId);
    const blocks = db.prepare(`SELECT * FROM question_blocks WHERE activity_id=? ORDER BY sort_order`).all(activityId).map(block=>({
      ...block,
      questions: db.prepare(`
        SELECT q.*,aq.id activity_question_id,aq.sort_order,aq.required
        FROM activity_questions aq JOIN questions q ON q.id=aq.question_id
        WHERE aq.activity_id=? AND aq.question_block_id=? ORDER BY aq.sort_order
      `).all(activityId,block.id).map(q=>({...q,labels_json:parse(q.labels_json)}))
    }));
    const peers = db.prepare(`
      SELECT pra.*,reviewer.student_number reviewer_number,reviewer.chinese_name reviewer_name,
             subject.student_number subject_number,subject.chinese_name subject_name
      FROM peer_review_assignments pra
      JOIN students reviewer ON reviewer.id=pra.reviewer_student_id
      JOIN students subject ON subject.id=pra.subject_student_id
      WHERE pra.activity_id=? ORDER BY pra.created_at
    `).all(activityId);
    return {attendance,labels,blocks,peerAssignments:peers};
  }

  upsertAttendance(activityId, rows, actorId) {
    const timestamp=now();
    const upsert=db.prepare(`
      INSERT INTO activity_attendance
        (id,activity_id,student_id,planned_status,actual_status,submitted_by,submitted_at,approval_status,approved_by,approved_at,review_note)
      VALUES (?,?,?,?,?,?,?,'pending_approval',NULL,NULL,NULL)
      ON CONFLICT(activity_id,student_id) DO UPDATE SET
        actual_status=excluded.actual_status,submitted_by=excluded.submitted_by,submitted_at=excluded.submitted_at,
        approval_status=CASE WHEN excluded.actual_status='absent' THEN 'pending_approval' ELSE 'approved' END,
        approved_by=CASE WHEN excluded.actual_status='absent' THEN NULL ELSE excluded.submitted_by END,
        approved_at=CASE WHEN excluded.actual_status='absent' THEN NULL ELSE excluded.submitted_at END,
        review_note=NULL
    `);
    const transaction=db.transaction(()=>rows.forEach(row=>upsert.run(id('ATT'),activityId,row.student_id,row.planned_status||'assigned',row.actual_status,actorId,timestamp)));
    transaction();
    return this.activityWorkspace(activityId).attendance;
  }

  reviewAttendance(activityId, decision, note, actorId) {
    const next=decision==='approve'?'approved':'returned';
    db.prepare(`UPDATE activity_attendance SET approval_status=?,approved_by=?,approved_at=?,review_note=? WHERE activity_id=? AND approval_status='pending_approval'`).run(next,actorId,now(),note||'',activityId);
    return this.activityWorkspace(activityId).attendance;
  }

  catalogues() {
    return db.prepare('SELECT * FROM label_catalogues ORDER BY catalogue_kind,code').all().map(catalogue=>({
      ...catalogue,
      labels:db.prepare('SELECT * FROM catalogue_labels WHERE catalogue_id=? ORDER BY display_order').all(catalogue.id),
      levels:db.prepare('SELECT * FROM rubric_levels WHERE rubric_catalogue_id=? ORDER BY level_order').all(catalogue.id),
      conditions:db.prepare('SELECT * FROM rubric_level_conditions WHERE rubric_catalogue_id=? ORDER BY axis_label_id,level_id').all(catalogue.id)
    }));
  }

  addActivityLabel(activityId, labelId, labelRole, actorId) {
    const row={id:id('AL'),activity_id:activityId,label_id:labelId,label_role:labelRole,added_by:actorId,created_at:now()};
    db.prepare(`INSERT OR IGNORE INTO activity_labels (id,activity_id,label_id,label_role,added_by,created_at) VALUES (?,?,?,?,?,?)`).run(...Object.values(row));
    return this.activityWorkspace(activityId).labels;
  }

  replaceActivityVask(activityId, labelIds, actorId) {
    const valid=labelIds.length?db.prepare(`SELECT cl.id FROM catalogue_labels cl JOIN label_catalogues lc ON lc.id=cl.catalogue_id WHERE lc.code='VASK' AND cl.id IN (${labelIds.map(()=>'?').join(',')})`).all(...labelIds).map(row=>row.id):[];
    const timestamp=now();
    db.transaction(()=>{
      db.prepare(`DELETE FROM activity_labels WHERE activity_id=? AND label_id IN (SELECT cl.id FROM catalogue_labels cl JOIN label_catalogues lc ON lc.id=cl.catalogue_id WHERE lc.code='VASK')`).run(activityId);
      const insert=db.prepare(`INSERT INTO activity_labels (id,activity_id,label_id,label_role,added_by,created_at) VALUES (?,?,?,?,?,?)`);
      valid.forEach(labelId=>insert.run(id('AL'),activityId,labelId,'descriptor',actorId,timestamp));
    })();
    return this.activityWorkspace(activityId).labels;
  }

  addQuestionBlock(activityId, input, actorId) {
    const sortOrder=db.prepare('SELECT COALESCE(MAX(sort_order),0)+1 next FROM question_blocks WHERE activity_id=?').get(activityId).next;
    const row={id:id('QB'),activity_id:activityId,title_en:input.title_en,title_zh:input.title_zh,audience:input.audience,sort_order:sortOrder,version:1,status:'draft',created_by:actorId,created_at:now()};
    db.prepare(`INSERT INTO question_blocks (id,activity_id,title_en,title_zh,audience,sort_order,version,status,created_by,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)`).run(...Object.values(row));
    return row;
  }

  addQuestion(blockId, input) {
    const block=db.prepare('SELECT * FROM question_blocks WHERE id=?').get(blockId);
    if(!block)return null;
    const questionId=id('Q');
    const question={id:questionId,source_workbook:'POC teacher-authored',source_sheet:block.title_en,source_row:0,source_construct_en:input.construct||'Teacher-authored',source_construct_zh:input.construct||'老師新增',subdomain:input.subdomain||'Activity-specific',prompt_zh:input.prompt,scale_type:input.scale_type||'frequency_effect',labels_json:JSON.stringify(['1','2','3','4','5','6']),ability_code:input.ability_code||'teacher_authored_observation',ability_name_en:input.ability_name_en||input.construct||'Teacher-authored observation',ability_name_zh:input.ability_name_zh||input.construct||'老師自訂觀察能力',ability_description_en:input.ability_description_en||'',ability_description_zh:input.ability_description_zh||'',is_negative:0,respondent_scope:block.audience,approval_status:'approved_for_context'};
    const columns=Object.keys(question);db.prepare(`INSERT INTO questions (${columns.join(',')}) VALUES (${columns.map(()=>'?').join(',')})`).run(...columns.map(key=>question[key]));
    const order=db.prepare('SELECT COALESCE(MAX(sort_order),0)+1 next FROM activity_questions WHERE activity_id=? AND question_block_id=?').get(block.activity_id,blockId).next;
    db.prepare('INSERT INTO activity_questions (id,activity_id,question_id,sort_order,required,question_block_id) VALUES (?,?,?,?,?,?)').run(id('AQ'),block.activity_id,questionId,order,input.required===false?0:1,blockId);
    return question;
  }

  setQuestionBlockStatus(blockId, status) {
    db.prepare('UPDATE question_blocks SET status=? WHERE id=?').run(status,blockId);
    return db.prepare('SELECT * FROM question_blocks WHERE id=?').get(blockId);
  }

  assignPeer(activityId, blockId, reviewerStudentId, subjectStudentId, actorId) {
    const row={id:id('PRA'),activity_id:activityId,question_block_id:blockId,reviewer_student_id:reviewerStudentId,subject_student_id:subjectStudentId,assigned_by:actorId,status:'assigned',created_at:now()};
    const keys=Object.keys(row);db.prepare(`INSERT INTO peer_review_assignments (${keys.join(',')}) VALUES (${keys.map(()=>'?').join(',')})`).run(...keys.map(key=>row[key]));return row;
  }

  myActivityTasks(activityId, userId) {
    const student=this.studentForUser(userId);if(!student)return {student:null,selfBlocks:[],peerTasks:[],responses:[]};
    const selfBlocks=db.prepare(`SELECT * FROM question_blocks WHERE activity_id=? AND audience='student' AND status='published' ORDER BY sort_order`).all(activityId);
    const peerTasks=db.prepare(`
      SELECT pra.*,qb.title_en,qb.title_zh,s.student_number subject_number,s.chinese_name subject_name
      FROM peer_review_assignments pra JOIN question_blocks qb ON qb.id=pra.question_block_id
      JOIN students s ON s.id=pra.subject_student_id
      WHERE pra.activity_id=? AND pra.reviewer_student_id=? AND qb.status='published'
    `).all(activityId,student.id);
    const hydrate=block=>({...block,questions:db.prepare(`SELECT q.*,aq.sort_order,aq.required FROM activity_questions aq JOIN questions q ON q.id=aq.question_id WHERE aq.question_block_id=? ORDER BY aq.sort_order`).all(block.id)});
    const responses=db.prepare('SELECT * FROM responses WHERE activity_id=? AND respondent_user_id=? ORDER BY submitted_at').all(activityId,userId);
    return {student,selfBlocks:selfBlocks.map(hydrate),peerTasks:peerTasks.map(task=>({...task,questions:hydrate({id:task.question_block_id}).questions})),responses};
  }

  submitResponses(activityId, subjectStudentId, respondentUserId, perspective, answers) {
    const timestamp=now();
    const transaction=db.transaction(()=>Object.entries(answers).forEach(([questionId,value])=>{
      db.prepare(`INSERT INTO responses (id,activity_id,question_id,student_id,respondent_user_id,perspective,score,text_value,status,submitted_at,published_at) VALUES (?,?,?,?,?,?,?,?,?,?,NULL)`).run(id('RSP'),activityId,questionId,subjectStudentId,respondentUserId,perspective,typeof value==='number'?value:null,typeof value==='string'?value:null,'submitted',timestamp);
    }));
    transaction();
    if(perspective==='peer')db.prepare(`UPDATE peer_review_assignments SET status='submitted' WHERE activity_id=? AND reviewer_student_id=(SELECT id FROM students WHERE user_id=?) AND subject_student_id=?`).run(activityId,respondentUserId,subjectStudentId);
    return {ok:true,submitted_at:timestamp};
  }

  processingJobs() {
    return db.prepare(`SELECT pj.*,a.title_zh activity_title FROM processing_jobs pj LEFT JOIN activities a ON a.id=pj.activity_id ORDER BY pj.created_at DESC`).all().map(job=>({
      ...job,input_manifest_json:parse(job.input_manifest_json),output_json:parse(job.output_json),
      faces:job.job_type==='face_match'?db.prepare(`SELECT f.*,s.student_number,s.chinese_name FROM face_match_candidates f LEFT JOIN students s ON s.id=f.candidate_student_id WHERE f.processing_job_id=? ORDER BY f.face_index`).all(job.id):[],
      chunks:job.job_type==='speech_transcription'?db.prepare(`SELECT tc.*,s.student_number,s.chinese_name FROM transcript_chunks tc LEFT JOIN students s ON s.id=tc.confirmed_student_id WHERE tc.processing_job_id=? ORDER BY tc.chunk_index`).all(job.id).map(chunk=>({...chunk,filler_log_json:parse(chunk.filler_log_json),candidates:db.prepare(`SELECT rec.*,cl.name_en axis_en,cl.name_zh axis_zh,lc.name rubric_name FROM rubric_evidence_candidates rec JOIN catalogue_labels cl ON cl.id=rec.axis_label_id JOIN label_catalogues lc ON lc.id=rec.rubric_catalogue_id WHERE rec.transcript_chunk_id=?`).all(chunk.id)})):[]
    }));
  }

  queueImageEvidence(evidenceId, activityId, actorId) {
    const timestamp=now();
    const row={
      id:id('JOB'),job_type:'face_match',status:'queued',provider:'provider-neutral-poc',progress_percent:0,
      activity_id:activityId||null,evidence_id:evidenceId,input_manifest_json:JSON.stringify({
        evidence_id:evidenceId,
        fields:['protected preview derivative'],
        excluded:['student names','assessment scores','raw database rows'],
        purpose:'propose face regions and possible student IDs for human confirmation'
      }),output_json:null,error_message:null,retry_count:0,created_by:actorId,created_at:timestamp,updated_at:timestamp
    };
    const keys=Object.keys(row);
    db.prepare(`INSERT INTO processing_jobs (${keys.join(',')}) VALUES (${keys.map(()=>'?').join(',')})`).run(...keys.map(key=>row[key]));
    return row;
  }

  confirmFace(candidateId, decision, actorId) {
    db.prepare('UPDATE face_match_candidates SET decision=?,decided_by=?,decided_at=? WHERE id=?').run(decision,actorId,now(),candidateId);
    return db.prepare('SELECT * FROM face_match_candidates WHERE id=?').get(candidateId);
  }

  confirmSpeaker(chunkId, studentId) {
    db.prepare('UPDATE transcript_chunks SET confirmed_student_id=? WHERE id=?').run(studentId,chunkId);
    db.prepare('UPDATE rubric_evidence_candidates SET student_id=? WHERE transcript_chunk_id=?').run(studentId,chunkId);
    return db.prepare('SELECT * FROM transcript_chunks WHERE id=?').get(chunkId);
  }

  decideRubricCandidate(candidateId, decision, actorId) {
    db.prepare('UPDATE rubric_evidence_candidates SET decision=?,decided_by=?,decided_at=? WHERE id=?').run(decision,actorId,now(),candidateId);
    return db.prepare('SELECT * FROM rubric_evidence_candidates WHERE id=?').get(candidateId);
  }

  introduction(studentId, periodId='PER-2627-1') {
    return db.prepare('SELECT * FROM student_introductions WHERE student_id=? AND period_id=?').get(studentId,periodId)??null;
  }

  saveIntroduction(studentId, input) {
    const existing=this.introduction(studentId,input.period_id||'PER-2627-1');const timestamp=now();
    if(existing){db.prepare(`UPDATE student_introductions SET source_mode=?,starter_code=?,generated_input_json=?,draft_text=?,status=?,submitted_at=?,approved_by=NULL,approved_at=NULL,review_note=NULL,updated_at=? WHERE id=?`).run(input.source_mode,input.starter_code||null,JSON.stringify(input.generated_input||{}),input.draft_text,input.submit?'submitted':'draft',input.submit?timestamp:null,timestamp,existing.id);return this.introduction(studentId,input.period_id||'PER-2627-1');}
    const row={id:id('INTRO'),student_id:studentId,period_id:input.period_id||'PER-2627-1',source_mode:input.source_mode,starter_code:input.starter_code||null,generated_input_json:JSON.stringify(input.generated_input||{}),draft_text:input.draft_text,status:input.submit?'submitted':'draft',submitted_at:input.submit?timestamp:null,approved_by:null,approved_at:null,review_note:null,created_at:timestamp,updated_at:timestamp};
    const keys=Object.keys(row);db.prepare(`INSERT INTO student_introductions (${keys.join(',')}) VALUES (${keys.map(()=>'?').join(',')})`).run(...keys.map(key=>row[key]));return row;
  }

  reviewIntroduction(studentId, decision, note, actorId) {
    const status=decision==='approve'?'approved':'returned';db.prepare(`UPDATE student_introductions SET status=?,approved_by=?,approved_at=?,review_note=?,updated_at=? WHERE student_id=? AND period_id='PER-2627-1'`).run(status,actorId,now(),note||'',now(),studentId);return this.introduction(studentId);
  }

  learnerProfile(studentId) {
    const student=db.prepare('SELECT * FROM students WHERE id=?').get(studentId);
    const introduction=this.introduction(studentId);
    const claims=db.prepare(`SELECT pc.*,ay.label academic_year,lc.name rubric_name FROM portfolio_claims pc JOIN academic_years ay ON ay.id=pc.academic_year_id LEFT JOIN label_catalogues lc ON lc.id=pc.rubric_catalogue_id WHERE pc.student_id=? ORDER BY ay.starts_on`).all(studentId).map(claim=>({...claim,sources:db.prepare('SELECT * FROM portfolio_claim_sources WHERE claim_id=? ORDER BY display_order').all(claim.id)}));
    const achievements=db.prepare(`SELECT e.id,e.original_name,e.caption,e.created_at,e.visibility_state FROM evidence e WHERE e.student_id=? AND e.media_category='certificate' AND e.is_disabled=0 ORDER BY e.created_at DESC`).all(studentId);
    const skillRows=db.prepare(`SELECT cl.name_en skill_name,MAX(prr.published_numeric_value) published_level FROM published_rubric_results prr JOIN catalogue_labels cl ON cl.id=prr.axis_label_id JOIN label_catalogues lc ON lc.id=prr.rubric_catalogue_id WHERE prr.student_id=? AND prr.status='published' AND lc.radar_eligible=1 GROUP BY cl.name_en`).all(studentId);
    const skills={Listening:0,Speaking:0,'Problem Solving':0,Creativity:0,'Staying Positive':0,'Aiming High':0,Leadership:0,Teamwork:0};
    skillRows.forEach(row=>{if(row.skill_name in skills)skills[row.skill_name]=Number(row.published_level)||0;});
    const proofCount=db.prepare(`SELECT COUNT(*) count FROM proof_items WHERE student_id=? AND review_status='accepted'`).get(studentId).count;
    return {student,introduction,claims,achievements,skills,aggregation:{policy_code:'MAX-CONFIRMED',version:'v1',rule:'Highest human-confirmed satisfied level per rubric axis; levels are not prerequisites.'},proofCount,years:[{code:'S1',academic_year:'2025/26',status:'frozen'},{code:'S2',academic_year:'2026/27',status:'working'},{code:'S3',academic_year:'2027/28',status:'future_cumulative_freeze'}],interests:{status:'requirements_open',values:['Science','Coding','Music','Team sport']},rubrics:this.catalogues().filter(item=>item.catalogue_kind==='rubric')};
  }
}
