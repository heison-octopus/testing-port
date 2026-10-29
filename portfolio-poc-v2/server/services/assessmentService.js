import { randomUUID } from 'node:crypto';
import { assessmentRepository } from '../repositories/assessmentRepository.js';
import { activityRepository } from '../repositories/activityRepository.js';
import { identityRepository } from '../repositories/identityRepository.js';
import { capabilityDecision, fail, requireCapability, sessionProfile } from './access.js';

function assessmentResource(activity) {
  return {
    school_id: activity.school_id,
    activity_id: activity.activity_id,
    group_id: activity.group_id,
    subject_id: activity.subject_id,
    department_id: activity.department_id,
    programme_id: activity.group_id === 'GRP-STUDENT-DEV' ? 'student_development' : null,
  };
}

function requireAssignedAssessor(user, activityId) {
  const activity = assessmentRepository.activity(activityId);
  if (!activity || activity.school_id !== user.school_id) fail(404, 'Assessment activity not found');
  const person = activityRepository.person(activityId, user.user_id);
  if (!person || person.person_type !== 'staff') fail(404, 'Assessment activity not found');
  const decision = requireCapability(user, 'assessment.submit', assessmentResource(activity));
  return { activity, person, decision };
}

function requireOwnTask(user, recipientId) {
  const task = assessmentRepository.recipient(recipientId);
  if (!task || user.user_type !== 'student' || task.respondent_user_id !== user.user_id) fail(404, 'Response task not found');
  if (task.perspective === 'peer_observation' && !['assigned','submitted','approved','changes_requested'].includes(task.peer_assignment_status)) fail(404, 'Response task not found');
  return task;
}

function normalizedAnswers(task, input) {
  const supplied = input?.answers && typeof input.answers === 'object' ? input.answers : {};
  return task.questions.map(question => ({
    id: `QR-DEMO-${randomUUID()}`,
    itemKey: question.item_key,
    promptEn: question.prompt_en,
    promptZh: question.prompt_zh,
    value: String(supplied[question.item_key] ?? '').trim(),
  })).filter(answer => answer.value);
}

export const assessmentService = {
  responseTasks(user) {
    if (user.user_type !== 'student') fail(403, 'Only students have a self and peer response task list');
    return assessmentRepository.tasksForUser(user.user_id);
  },
  responseTask(user, recipientId) {
    return requireOwnTask(user, recipientId);
  },
  saveResponseDraft(user, recipientId, input) {
    const task = requireOwnTask(user, recipientId);
    const latest = task.latestSubmission;
    if (latest && !['draft','changes_requested'].includes(latest.content_status)) fail(400, 'A submitted response is locked. It must be returned before a successor can be edited.');
    const createSubmission = !latest || latest.content_status === 'changes_requested';
    const revisionNumber = latest ? latest.revision_number + (createSubmission ? 1 : 0) : 1;
    const submissionId = createSubmission ? `SUB-DEMO-${randomUUID()}` : latest.assessment_submission_id;
    const savedAt = new Date().toISOString();
    assessmentRepository.saveDraft({
      createSubmission,
      submissionId,
      recipientId,
      revisionNumber,
      supersedesId: createSubmission ? latest?.assessment_submission_id || null : latest?.supersedes_submission_id || null,
      perspective: task.perspective,
      answers: normalizedAnswers(task, input),
      savedAt,
    });
    identityRepository.audit(user.school_id, user.user_id, 'assessment.response.draft_saved', 'assessment_submission', submissionId);
    return assessmentRepository.recipient(recipientId);
  },
  submitResponse(user, recipientId) {
    const task = requireOwnTask(user, recipientId);
    const latest = task.latestSubmission;
    if (!latest || latest.content_status !== 'draft') fail(400, 'Save a draft before submitting');
    const responseMap = new Map(latest.responses.map(item => [item.item_key, item.text_value?.trim()]));
    const missing = task.questions.filter(question => question.required && !responseMap.get(question.item_key));
    if (missing.length) fail(400, 'Complete every required response before submitting', 'REQUIRED_RESPONSES_MISSING', { itemKeys: missing.map(item => item.item_key) });
    const submittedAt = new Date().toISOString();
    assessmentRepository.submit(recipientId, latest.assessment_submission_id, submittedAt);
    identityRepository.audit(user.school_id, user.user_id, 'assessment.response.submitted', 'assessment_submission', latest.assessment_submission_id);
    return assessmentRepository.recipient(recipientId);
  },
  workspace(user) {
    if (!sessionProfile(user).pageAccess.assessments) fail(403, 'Assessment workspace access is not assigned');
    const activities = assessmentRepository.assessmentActivities(user.user_id).filter(activity => capabilityDecision(user, 'assessment.submit', assessmentResource({ ...activity, school_id: user.school_id })).allowed);
    return activities.map(activity => ({ ...activity, participants: assessmentRepository.activityParticipants(activity.activity_id) }));
  },
  detail(user, activityId, studentId) {
    requireAssignedAssessor(user, activityId);
    const participant = activityRepository.person(activityId, studentId);
    if (!participant || participant.relationship_type !== 'participant') fail(404, 'Student assessment record not found');
    const detail = assessmentRepository.assessmentDetail(activityId, studentId);
    if (!detail) fail(404, 'Student assessment record not found');
    return detail;
  },
  reviewSubmission(user, submissionId, input) {
    const context = assessmentRepository.submissionContext(submissionId);
    if (!context) fail(404, 'Submission not found');
    requireAssignedAssessor(user, context.activity_id);
    if (!['student_self_report','peer_observation'].includes(context.perspective)) fail(400, 'Only student or peer submissions use this moderation action');
    if (context.content_status !== 'submitted') fail(400, 'Only a submitted response can be reviewed');
    if (!['approved','changes_requested','rejected'].includes(input.outcome) || !input.reason?.trim()) fail(400, 'Select a supported outcome and provide a reason');
    const reviewedAt = new Date().toISOString();
    assessmentRepository.reviewSubmission(submissionId, input.outcome, user.user_id, input.reason.trim(), reviewedAt);
    identityRepository.audit(user.school_id, user.user_id, `assessment.response.${input.outcome}`, 'assessment_submission', submissionId, input.reason.trim());
    return { ok: true };
  },
  assignPeer(user, activityId, input) {
    const { activity, decision } = requireAssignedAssessor(user, activityId);
    if (!input.subjectId || !input.reviewerId || input.subjectId === input.reviewerId) fail(400, 'Choose two different participating students');
    const participantIds = new Set(assessmentRepository.activityParticipants(activityId).map(item => item.user_id));
    if (!participantIds.has(input.subjectId) || !participantIds.has(input.reviewerId)) fail(400, 'Both students must be assigned participants in this activity');
    if (assessmentRepository.peerAssignmentExists(activityId, input.subjectId, input.reviewerId)) fail(400, 'This named peer review assignment already exists');
    const assignment = assessmentRepository.assessmentAssignment(activityId);
    if (!assignment) fail(400, 'This activity does not have an active published form assignment');
    const createdAt = new Date().toISOString();
    const peerAssignmentId = `PRA-DEMO-${randomUUID()}`;
    assessmentRepository.createPeerAssignment({ peerAssignmentId, recipientId: `AR-DEMO-${randomUUID()}`, assignmentId: assignment.activity_form_assignment_id, activityId, subjectId: input.subjectId, reviewerId: input.reviewerId, actorId: user.user_id, roleAssignmentId: decision.roleAssignmentId || null, formVersionId: activity.form_version_id, dueAt: input.dueAt || assignment.due_at || new Date(Date.now() + 7 * 86400000).toISOString(), notes: input.notes?.trim() || 'Named peer review assigned by the activity assessor.', createdAt });
    identityRepository.audit(user.school_id, user.user_id, 'peer_review.assigned', 'peer_review_assignment', peerAssignmentId);
    return this.detail(user, activityId, input.subjectId);
  },
  submitTeacherAssessment(user, activityId, studentId, input) {
    requireAssignedAssessor(user, activityId);
    const detail = this.detail(user, activityId, studentId);
    const recipient = assessmentRepository.teacherRecipient(activityId, studentId, user.user_id);
    if (!recipient) fail(403, 'A named teacher observation assignment is required');
    const teacherTask = assessmentRepository.recipient(recipient.assignment_recipient_id);
    if (!input.teacherStrength?.trim() || !input.teacherDevelopment?.trim() || !input.teacherSupport?.trim()) fail(400, 'Complete the three teacher observation fields');
    const step = input.observedStep === '' || input.observedStep == null ? null : Number(input.observedStep);
    const consistency = input.consistency === '' || input.consistency == null ? null : Number(input.consistency);
    const nextStep = input.suggestedNextStep === '' || input.suggestedNextStep == null ? null : Number(input.suggestedNextStep);
    if (step != null && (!Number.isInteger(step) || step < 1 || step > 16)) fail(400, 'Enter a whole number from 1 to 16.');
    if (step != null && (!Number.isInteger(consistency) || consistency < 1 || consistency > 6)) fail(400, 'Consistency must be a whole number from 1 to 6.');
    if (step == null && (consistency != null || nextStep != null || input.observationComment?.trim())) fail(400, 'Select an observed 1–16 step before adding framework observation details.');
    if (nextStep != null && (!Number.isInteger(nextStep) || nextStep < 1 || nextStep > 16)) fail(400, 'Suggested next step must be a whole number from 1 to 16.');
    const axis = step == null ? null : detail.skillAxes.find(item => item.axis_id === input.axisId);
    if (step != null && !axis) fail(400, 'Select one active Universal Framework skill');
    if (step != null && !input.observationComment?.trim()) fail(400, 'A proof-linked observation comment is required for a 1–16 step');
    const citedSubmissionIds = [...new Set((input.citedSubmissionIds || []).filter(Boolean))];
    const cited = citedSubmissionIds.map(id => assessmentRepository.submissionContext(id));
    if (cited.some(item => !item || item.activity_id !== activityId || item.subject_user_id !== studentId || !['submitted','approved'].includes(item.content_status))) fail(400, 'Every cited response must belong to this student and activity');
    const latest = teacherTask.latestSubmission;
    const createdAt = new Date().toISOString();
    const submissionId = `SUB-TEACH-${randomUUID()}`;
    const prompts = new Map(teacherTask.questions.map(item => [item.item_key, item]));
    const answerValues = {
      teacher_strength: input.teacherStrength.trim(),
      teacher_development: input.teacherDevelopment.trim(),
      teacher_support: input.teacherSupport.trim(),
    };
    const feedbackId = `FDB-DEMO-${randomUUID()}`;
    const evidence = [{ id: `FEV-DEMO-${randomUUID()}`, type: 'behaviour_description', text: input.teacherStrength.trim(), proofItemId: null, submissionId }];
    for (const sourceId of citedSubmissionIds) evidence.push({ id: `FEV-DEMO-${randomUUID()}`, type: 'submitted_form', text: 'Cited submitted self or peer response.', proofItemId: null, submissionId: sourceId });
    assessmentRepository.createTeacherAssessment({
      submissionId,
      recipientId: recipient.assignment_recipient_id,
      revisionNumber: (latest?.revision_number || 0) + 1,
      supersedesId: latest?.assessment_submission_id || null,
      actorId: user.user_id,
      activityId,
      studentId,
      feedbackId,
      overallComment: input.teacherStrength.trim(),
      reviewReason: input.reviewReason?.trim() || 'Submitted by the named activity assessor.',
      answers: Object.entries(answerValues).map(([itemKey, value]) => ({ id: `QR-DEMO-${randomUUID()}`, itemKey, promptEn: prompts.get(itemKey)?.prompt_en || itemKey, promptZh: prompts.get(itemKey)?.prompt_zh || itemKey, value })),
      evidence,
      observation: step == null ? null : { id: `OBS-DEMO-${randomUUID()}`, axisId: axis.axis_id, step, consistency, comment: input.observationComment.trim(), nextStep },
      createdAt,
    });
    identityRepository.audit(user.school_id, user.user_id, 'assessment.teacher_observation.submitted', 'feedback', feedbackId, `Student: ${studentId}; activity: ${activityId}`);
    return this.detail(user, activityId, studentId);
  },
};
