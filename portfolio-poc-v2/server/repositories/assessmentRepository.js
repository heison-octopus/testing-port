import { sql } from './database.js';

const sectionForPerspective = {
  student_self_report: 'student_reflection',
  peer_observation: 'peer_review',
  teacher_observation: 'teacher_observation',
};

function questions(formVersionId, perspective) {
  return sql.all(`SELECT * FROM form_items WHERE form_version_id=? AND section_code=? ORDER BY item_order`, formVersionId, sectionForPerspective[perspective]);
}

function submission(submissionId) {
  const row = sql.get(`SELECT s.*,reviewer.name_en reviewer_name,reviewer.name_zh reviewer_name_zh
    FROM assessment_submissions s LEFT JOIN users reviewer ON reviewer.user_id=s.reviewed_by_user_id
    WHERE s.assessment_submission_id=?`, submissionId);
  if (!row) return null;
  return { ...row, responses: sql.all('SELECT * FROM question_responses WHERE assessment_submission_id=? ORDER BY item_key', submissionId) };
}

function latestSubmission(recipientId) {
  const row = sql.get('SELECT assessment_submission_id FROM assessment_submissions WHERE assignment_recipient_id=? ORDER BY revision_number DESC LIMIT 1', recipientId);
  return row ? submission(row.assessment_submission_id) : null;
}

function recipient(recipientId) {
  const row = sql.get(`SELECT r.*,a.activity_id,a.form_version_id,a.opens_at,a.due_at,a.assignment_status,a.eligibility_check,
      activity.school_id,activity.group_id,activity.current_approved_revision_id,revision.subject_id,revision.department_id,revision.title_en,revision.title_zh,revision.description_en,revision.description_zh,revision.start_at,revision.end_at,
      subject.name_en subject_name,subject.name_zh subject_name_zh,subject.student_number,
      respondent.name_en respondent_name,respondent.name_zh respondent_name_zh,
      peer.status peer_assignment_status,peer.moderation_required
    FROM assignment_recipients r
    JOIN assessment_assignments a ON a.activity_form_assignment_id=r.assessment_assignment_id
    JOIN activities activity ON activity.activity_id=a.activity_id
    JOIN activity_revisions revision ON revision.activity_revision_id=activity.current_approved_revision_id
    JOIN users subject ON subject.user_id=r.subject_user_id
    JOIN users respondent ON respondent.user_id=r.respondent_user_id
    LEFT JOIN peer_review_assignments peer ON peer.peer_assignment_id=r.peer_assignment_id
    WHERE r.assignment_recipient_id=? AND activity.operational_status<>'disabled'`, recipientId);
  if (!row) return null;
  return { ...row, questions: questions(row.form_version_id, row.perspective), latestSubmission: latestSubmission(recipientId) };
}

export const assessmentRepository = {
  recipient,
  submission,
  latestSubmission,
  submissionContext(submissionId) {
    return sql.get(`SELECT s.assessment_submission_id,s.content_status,s.perspective,r.subject_user_id,a.activity_id
      FROM assessment_submissions s JOIN assignment_recipients r ON r.assignment_recipient_id=s.assignment_recipient_id
      JOIN assessment_assignments a ON a.activity_form_assignment_id=r.assessment_assignment_id
      WHERE s.assessment_submission_id=?`, submissionId);
  },
  tasksForUser(userId) {
    return sql.all(`SELECT assignment_recipient_id FROM assignment_recipients
      WHERE respondent_user_id=? AND perspective IN ('student_self_report','peer_observation')
      ORDER BY CASE perspective WHEN 'student_self_report' THEN 1 ELSE 2 END,created_at`, userId).map(row => recipient(row.assignment_recipient_id)).filter(Boolean);
  },
  saveDraft(record) {
    sql.transaction(() => {
      if (record.createSubmission) {
        sql.run(`INSERT INTO assessment_submissions VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, record.submissionId, record.recipientId, record.revisionNumber, record.supersedesId, record.perspective, 'draft', 'not_processed', 'unpublished', null, null, null, null, record.savedAt, record.savedAt);
      } else {
        sql.run(`UPDATE assessment_submissions SET updated_at=? WHERE assessment_submission_id=?`, record.savedAt, record.submissionId);
      }
      for (const answer of record.answers) {
        sql.run(`INSERT INTO question_responses(question_response_id,assessment_submission_id,item_key,prompt_en,prompt_zh,text_value,raw_numeric_value,authorship_origin,created_at,updated_at)
          VALUES(?,?,?,?,?,?,?,?,?,?)
          ON CONFLICT(assessment_submission_id,item_key) DO UPDATE SET text_value=excluded.text_value,updated_at=excluded.updated_at`,
          answer.id, record.submissionId, answer.itemKey, answer.promptEn, answer.promptZh, answer.value, null, 'human_authored', record.savedAt, record.savedAt);
      }
      sql.run(`UPDATE assignment_recipients SET status='draft' WHERE assignment_recipient_id=?`, record.recipientId);
    });
  },
  submit(recipientId, submissionId, submittedAt) {
    sql.transaction(() => {
      sql.run(`UPDATE assessment_submissions SET content_status='submitted',processing_status='pending_review',submitted_at=?,updated_at=? WHERE assessment_submission_id=? AND content_status='draft'`, submittedAt, submittedAt, submissionId);
      sql.run(`UPDATE assignment_recipients SET status='submitted' WHERE assignment_recipient_id=?`, recipientId);
    });
  },
  reviewSubmission(submissionId, outcome, actorId, reason, reviewedAt) {
    const recipientRow = sql.get(`SELECT r.assignment_recipient_id,r.respondent_user_id,r.subject_user_id,a.activity_id,s.perspective
      FROM assessment_submissions s JOIN assignment_recipients r ON r.assignment_recipient_id=s.assignment_recipient_id
      JOIN assessment_assignments a ON a.activity_form_assignment_id=r.assessment_assignment_id
      WHERE s.assessment_submission_id=?`, submissionId);
    sql.transaction(() => {
      sql.run(`UPDATE assessment_submissions SET content_status=?,processing_status=?,reviewed_by_user_id=?,reviewed_at=?,review_reason=?,updated_at=? WHERE assessment_submission_id=?`,
        outcome, outcome === 'approved' ? 'accepted' : outcome === 'changes_requested' ? 'returned' : 'rejected', actorId, reviewedAt, reason, reviewedAt, submissionId);
      sql.run(`UPDATE assignment_recipients SET status=? WHERE assignment_recipient_id=?`, outcome, recipientRow.assignment_recipient_id);
      if (outcome === 'approved') {
        const answers = sql.all('SELECT * FROM question_responses WHERE assessment_submission_id=?', submissionId);
        for (const answer of answers) {
          const proofId = `PRF-${answer.question_response_id}`;
          sql.run(`INSERT OR IGNORE INTO proof_items VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, proofId, 'PT-RESPONSE', recipientRow.subject_user_id, recipientRow.activity_id, 'question_response', answer.question_response_id, recipientRow.perspective, answer.text_value || 'Accepted response', reviewedAt, recipientRow.respondent_user_id, 'source_linked', 'accepted', 'reviewers_only', reviewedAt, null);
        }
      }
    });
  },
  assessmentActivities(staffUserId) {
    return sql.all(`SELECT DISTINCT a.activity_id,r.title_en,r.title_zh,a.resolved_period_id,r.subject_id,r.department_id,a.group_id
      FROM activity_people staff
      JOIN activities a ON a.activity_id=staff.activity_id
      JOIN activity_revisions r ON r.activity_revision_id=a.current_approved_revision_id
      WHERE staff.user_id=? AND staff.person_type='staff' AND a.operational_status<>'disabled' AND r.approval_status='approved' AND r.publication_status='published'
      ORDER BY r.start_at DESC`, staffUserId);
  },
  activity(activityId) {
    return sql.get(`SELECT a.*,r.activity_revision_id,r.title_en,r.title_zh,r.description_en,r.description_zh,r.subject_id,r.department_id,r.requested_form_version_id form_version_id
      FROM activities a JOIN activity_revisions r ON r.activity_revision_id=a.current_approved_revision_id WHERE a.activity_id=? AND a.operational_status<>'disabled'`, activityId);
  },
  activityParticipants(activityId) {
    return sql.all(`SELECT p.user_id,u.name_en,u.name_zh,u.student_number,p.actual_attendance_status
      FROM activity_people p JOIN users u ON u.user_id=p.user_id
      WHERE p.activity_id=? AND p.relationship_type='participant' AND p.status='active' ORDER BY u.name_en`, activityId);
  },
  assessmentAssignment(activityId) {
    return sql.get(`SELECT * FROM assessment_assignments WHERE activity_id=? AND assignment_status<>'blocked' ORDER BY assigned_at DESC LIMIT 1`, activityId);
  },
  peerAssignmentExists(activityId, subjectId, reviewerId) {
    return sql.get(`SELECT 1 FROM peer_review_assignments WHERE activity_id=? AND subject_student_id=? AND peer_reviewer_student_id=? AND status IN ('assigned','submitted','approved')`, activityId, subjectId, reviewerId);
  },
  teacherRecipient(activityId, studentId, respondentId) {
    return sql.get(`SELECT r.* FROM assignment_recipients r JOIN assessment_assignments a ON a.activity_form_assignment_id=r.assessment_assignment_id
      WHERE a.activity_id=? AND r.subject_user_id=? AND r.respondent_user_id=? AND r.perspective='teacher_observation' ORDER BY r.created_at DESC LIMIT 1`, activityId, studentId, respondentId);
  },
  ensureActivityAssignments(activityId, actorId, createdAt) {
    const activity = this.activity(activityId);
    if (!activity || !activity.form_version_id) return null;
    const assignmentId = `AFA-${activityId}`;
    const due = new Date(new Date(activity.end_at || createdAt).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const owner = sql.get(`SELECT user_id FROM activity_people WHERE activity_id=? AND person_type='staff' AND relationship_type='owner' ORDER BY assigned_at LIMIT 1`, activityId);
    const participants = this.activityParticipants(activityId);
    sql.transaction(() => {
      sql.run(`INSERT OR IGNORE INTO assessment_assignments VALUES(?,?,?,?,?,?,?,?,?,?)`, assignmentId, activityId, activity.form_version_id, actorId, createdAt, activity.end_at || createdAt, due, 'scheduled', 'passed', 'Created when the approved activity revision was published.');
      for (const participant of participants) {
        sql.run(`INSERT OR IGNORE INTO assignment_recipients VALUES(?,?,?,?,?,?,?,?,?)`, `AR-SELF-${activityId}-${participant.user_id}`, assignmentId, participant.user_id, participant.user_id, owner?.user_id || actorId, null, 'student_self_report', 'not_submitted', createdAt);
        if (owner) sql.run(`INSERT OR IGNORE INTO assignment_recipients VALUES(?,?,?,?,?,?,?,?,?)`, `AR-TEACH-${activityId}-${participant.user_id}`, assignmentId, owner.user_id, participant.user_id, owner.user_id, null, 'teacher_observation', 'not_submitted', createdAt);
      }
    });
    return assignmentId;
  },
  assessmentDetail(activityId, studentId) {
    const activity = this.activity(activityId);
    const student = sql.get(`SELECT user_id,name_en,name_zh,student_number FROM users WHERE user_id=? AND user_type='student'`, studentId);
    if (!activity || !student) return null;
    const recipients = sql.all(`SELECT r.assignment_recipient_id,r.perspective,r.respondent_user_id,r.status
      FROM assignment_recipients r JOIN assessment_assignments a ON a.activity_form_assignment_id=r.assessment_assignment_id
      WHERE a.activity_id=? AND r.subject_user_id=? ORDER BY r.perspective,r.created_at`, activityId, studentId).map(row => ({ ...row, latestSubmission: latestSubmission(row.assignment_recipient_id) }));
    const observations = sql.all(`SELECT f.*,observer.name_en observer_name,observer.name_zh observer_name_zh,
        o.framework_observation_id,o.axis_id,axis.name_en axis_name_en,axis.name_zh axis_name_zh,o.observed_step,o.consistency_rating,o.comment observation_comment,o.suggested_next_step,o.review_status observation_review_status,o.included_in_aggregation
      FROM feedback f LEFT JOIN framework_observations o ON o.feedback_id=f.feedback_id
      LEFT JOIN rubric_axes axis ON axis.axis_id=o.axis_id LEFT JOIN users observer ON observer.user_id=f.author_user_id
      WHERE f.activity_id=? AND f.subject_user_id=? ORDER BY f.observed_at DESC`, activityId, studentId);
    const peerAssignments = sql.all(`SELECT peer.*,reviewer.name_en reviewer_name,reviewer.name_zh reviewer_name_zh
      FROM peer_review_assignments peer JOIN users reviewer ON reviewer.user_id=peer.peer_reviewer_student_id
      WHERE peer.activity_id=? AND peer.subject_student_id=? ORDER BY peer.assigned_at DESC`, activityId, studentId);
    return { activity, student, participants: this.activityParticipants(activityId), recipients, observations, peerAssignments, skillAxes: this.skillAxes() };
  },
  skillAxes() {
    return sql.all(`SELECT axis_id,axis_code,name_en,name_zh,display_order FROM rubric_axes WHERE rubric_catalogue_id='RUB-SB-UF2' AND status='active' ORDER BY display_order`);
  },
  createPeerAssignment(record) {
    sql.transaction(() => {
      sql.run(`INSERT INTO peer_review_assignments VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`, record.peerAssignmentId, record.activityId, record.subjectId, record.reviewerId, record.actorId, record.roleAssignmentId, record.createdAt, record.dueAt, 'assigned', record.formVersionId, 1, record.notes);
      sql.run(`INSERT INTO assignment_recipients VALUES(?,?,?,?,?,?,?,?,?)`, record.recipientId, record.assignmentId, record.reviewerId, record.subjectId, record.actorId, record.peerAssignmentId, 'peer_observation', 'not_submitted', record.createdAt);
    });
  },
  createTeacherAssessment(record) {
    sql.transaction(() => {
      sql.run(`INSERT INTO assessment_submissions VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, record.submissionId, record.recipientId, record.revisionNumber, record.supersedesId, 'teacher_observation', 'approved', 'accepted', 'unpublished', record.createdAt, record.actorId, record.createdAt, record.reviewReason, record.createdAt, record.createdAt);
      for (const answer of record.answers) sql.run(`INSERT INTO question_responses VALUES(?,?,?,?,?,?,?,?,?,?)`, answer.id, record.submissionId, answer.itemKey, answer.promptEn, answer.promptZh, answer.value, null, 'human_authored', record.createdAt, record.createdAt);
      sql.run(`UPDATE assignment_recipients SET status='approved' WHERE assignment_recipient_id=?`, record.recipientId);
      sql.run(`INSERT INTO feedback VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)`, record.feedbackId, record.activityId, record.studentId, record.actorId, record.submissionId, 'teacher_assessment', record.overallComment, record.createdAt, 'teacher_observation', 'confirmed', 'unpublished', record.createdAt, record.createdAt);
      for (const evidence of record.evidence) {
        sql.run(`INSERT INTO feedback_evidence VALUES(?,?,?,?,?,?,?)`, evidence.id, record.feedbackId, evidence.type, evidence.text, evidence.proofItemId, evidence.submissionId, record.createdAt);
      }
      if (record.observation) {
        const observation = record.observation;
        sql.run(`INSERT INTO framework_observations VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)`, observation.id, record.feedbackId, observation.axisId, observation.step, observation.consistency, observation.comment, observation.nextStep, 'confirmed', 1, 0, null, null, record.createdAt);
        for (const evidence of record.evidence) sql.run(`INSERT INTO observation_evidence VALUES(?,?,?)`, `OE-${observation.id}-${evidence.id}`, observation.id, evidence.id);
      }
    });
  },
};
