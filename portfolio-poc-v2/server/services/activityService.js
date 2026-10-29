import { randomUUID } from 'node:crypto';
import { activityRepository } from '../repositories/activityRepository.js';
import { approvalRepository } from '../repositories/approvalRepository.js';
import { identityRepository } from '../repositories/identityRepository.js';
import { canUseAny, capabilityDecision, fail, requireCapability } from './access.js';

const workspaceCapabilities = ['activity.view','activity.create','activity.edit','activity.change_request','activity.submit_for_approval','activity.approve','activity.publish'];
const allowedRiskFlags = new Set(['none','off_site','external_participants','image_capture','audio_capture','video_capture']);
const changeableFields = new Set(['title_en','title_zh','description_en','description_zh']);

function resource(activity, revision) {
  return { school_id: activity.school_id, activity_id: activity.activity_id, group_id: activity.group_id, subject_id: revision?.subject_id, department_id: revision?.department_id, programme_id: activity.group_id === 'GRP-STUDENT-DEV' ? 'student_development' : null };
}

function visible(user, activity) {
  const latest = activity.revisions?.[0];
  const viewDecision = capabilityDecision(user, 'activity.view', resource(activity, latest));
  if (viewDecision.source === 'explicit_deny') return false;
  if (user.user_type === 'student') {
    if (activity.operational_status === 'disabled') return false;
    const participant = activity.people?.some(person => person.user_id === user.user_id && person.relationship_type === 'participant');
    const official = activity.revisions.find(item => item.activity_revision_id === activity.current_approved_revision_id);
    return Boolean(participant && official?.approval_status === 'approved' && official?.publication_status === 'published');
  }
  if (activity.people?.find(person => person.user_id === user.user_id)) return true;
  if (activityRepository.approvalTargetForUser(activity.activity_id, user.user_id)) return true;
  return viewDecision.allowed;
}

function project(user, activity) {
  const latestRevision = activity.revisions[0] || null;
  const currentApprovedRevision = activity.revisions.find(item => item.activity_revision_id === activity.current_approved_revision_id) || null;
  if (user.user_type === 'student') {
    const ownParticipant = activity.people.find(item => item.user_id === user.user_id && item.relationship_type === 'participant');
    return {
      activity_id: activity.activity_id,
      operational_status: activity.operational_status,
      group_id: activity.group_id,
      resolved_period_id: activity.resolved_period_id,
      period_name: activity.period_name,
      period_name_zh: activity.period_name_zh,
      latest_revision_id: currentApprovedRevision.activity_revision_id,
      current_approved_revision_id: currentApprovedRevision.activity_revision_id,
      latestRevision: currentApprovedRevision,
      currentApprovedRevision,
      revisions: [currentApprovedRevision],
      people: ownParticipant ? [ownParticipant] : [],
      vaskItems: activityRepository.revisionVask(currentApprovedRevision.activity_revision_id),
      riskFlags: [],
      changeRequests: [],
      approvalHistory: [],
      access: { canEdit: false, canRequestChange: false, canSubmit: false, canWithdraw: false, canResolveChangeRequest: false },
    };
  }
  const canEdit = Boolean(activity.people.find(item => item.user_id === user.user_id && item.can_edit)) || capabilityDecision(user, 'activity.edit', resource(activity, latestRevision)).allowed;
  return {
    ...activity,
    latestRevision,
    currentApprovedRevision,
    access: {
      canEdit,
      canRequestChange: !canEdit && capabilityDecision(user, 'activity.change_request', resource(activity, latestRevision)).allowed,
      canSubmit: capabilityDecision(user, 'activity.submit_for_approval', resource(activity, latestRevision)).allowed,
      canWithdraw: canEdit && latestRevision?.approval_status === 'pending_review',
      canResolveChangeRequest: canEdit,
    },
  };
}

function requireWorkspace(user) {
  if (user.user_type !== 'student' && !canUseAny(user, workspaceCapabilities)) fail(403, 'Activity workspace access is not assigned');
}

function resolvePeriod(user, startAt, endAt) {
  if (!startAt || !endAt) fail(400, 'Start and end are required');
  if (startAt > endAt) fail(400, 'Start must not be after end');
  const startDate = String(startAt).slice(0, 10), endDate = String(endAt).slice(0, 10);
  const matches = activityRepository.resolvePeriod(user.school_id, startDate, endDate);
  if (matches.length !== 1) fail(400, 'The activity must fit completely inside one configured reporting period. Split a cross-period activity before submission.', 'ACTIVITY_PERIOD_EXCEPTION_REQUIRED', { startDate, endDate });
  return matches[0];
}

function validatePackage(user, input) {
  const participantIds = [...new Set((input.participantIds || []).filter(Boolean))];
  const vaskItemIds = [...new Set((input.vaskItemIds || []).filter(Boolean))];
  const riskFlags = [...new Set((input.riskFlags || []).filter(Boolean))];
  const teacherGroupIds = [...new Set((input.teacherGroupIds || []).filter(Boolean))];
  if (!participantIds.length) fail(400, 'Select at least one participant');
  if (!vaskItemIds.length) fail(400, 'Select at least one VASK intention');
  if (!riskFlags.length || riskFlags.some(flag => !allowedRiskFlags.has(flag)) || (riskFlags.includes('none') && riskFlags.length > 1)) fail(400, 'Select valid activity risk flags; “none” cannot be combined with another flag');
  const students = activityRepository.activeStudents(user.school_id, participantIds);
  if (students.length !== participantIds.length) fail(400, 'Every participant must be an active student in this school');
  const reference = activityRepository.referenceData(user.school_id);
  const validVask = new Set(reference.vaskItems.map(item => item.axis_id));
  if (vaskItemIds.some(id => !validVask.has(id))) fail(400, 'Select VASK items from the active catalogue');
  const form = activityRepository.formVersion(input.formVersionId);
  if (!form || form.review_status !== 'approved' || form.publication_status !== 'published') fail(400, 'Select one approved and published form version');
  const supportingStaff = activityRepository.activeStaffGroupMembers(user.school_id, teacherGroupIds);
  if (teacherGroupIds.length && !supportingStaff.length) fail(400, 'Select active teacher groups with at least one member');
  const questionnaire = Array.isArray(input.questionnaire) ? input.questionnaire : [];
  if (questionnaire.length > 50) fail(400, 'An activity questionnaire may contain at most 50 questions');
  questionnaire.forEach((question, index) => {
    if (!question?.promptEn?.trim() || question.promptEn.trim().length > 2_000 || String(question.promptZh || '').length > 2_000) fail(400, `Question ${index + 1} requires valid text within 2,000 characters`);
  });
  return { participantIds, vaskItemIds, riskFlags, teacherGroupIds, supportingStaff, questionnaire, form };
}

export const activityService = {
  list(user) {
    requireWorkspace(user);
    const items = activityRepository.all(user.school_id)
      .map(row => activityRepository.activity(row.activity_id))
      .filter(activity => visible(user, activity))
      .map(activity => project(user, activity));
    return { items, access: { canCreate: canUseAny(user, ['activity.create']) } };
  },
  one(user, activityId) {
    const activity = activityRepository.activity(activityId);
    if (!activity || activity.school_id !== user.school_id || !visible(user, activity)) fail(404, 'Activity not found');
    return project(user, activity);
  },
  referenceData(user) {
    requireWorkspace(user);
    return activityRepository.referenceData(user.school_id);
  },
  approvalCandidates(user) {
    requireWorkspace(user);
    return identityRepository.staffDirectory(user.school_id).map(person => {
      const keys = new Set(person.capabilities.filter(item => item.effect === 'allow').map(item => item.capability_key));
      return { id: person.user_id, name: person.name_en, nameZh: person.name_zh, canApprove: keys.has('activity.approve'), canPublish: keys.has('activity.publish') };
    }).filter(item => item.canApprove || item.canPublish);
  },
  create(user, input) {
    const target = { school_id: user.school_id, subject_id: input.subjectId || null, department_id: input.departmentId || null, group_id: input.groupId || null, programme_id: input.groupId === 'GRP-STUDENT-DEV' ? 'student_development' : null };
    const decision = requireCapability(user, 'activity.create', target);
    if (!input.titleEn?.trim() || !input.descriptionEn?.trim()) fail(400, 'English title and description are required');
    if (input.titleEn.trim().length > 200 || input.descriptionEn.trim().length > 20_000) fail(400, 'Activity title or description exceeds its limit');
    const period = resolvePeriod(user, input.startAt, input.endAt);
    const activityPackage = validatePackage(user, input);
    const stamp = new Date().toISOString();
    const id = `ACT-DEMO-${randomUUID()}`, revisionId = `AREV-DEMO-${randomUUID()}`;
    const formDraftId = activityPackage.questionnaire.length ? `FV-ACT-${randomUUID()}` : null;
    activityRepository.create({
      activity: { id, schoolId: user.school_id, groupId: input.groupId || null, createdBy: user.user_id, periodId: period.period_id, createdAt: stamp },
      revision: { id: revisionId, titleEn: input.titleEn.trim(), titleZh: input.titleZh?.trim() || '', descriptionEn: input.descriptionEn.trim(), descriptionZh: input.descriptionZh?.trim() || '', activityType: `${input.activityNature || 'academic'}:${input.activitySetting || 'in_class'}`, subjectId: input.subjectId || null, departmentId: input.departmentId || null, startAt: input.startAt, endAt: input.endAt, ownerId: user.user_id, formVersionId: formDraftId || input.formVersionId, mediaExpected: input.mediaExpected ? 1 : 0, location: input.location?.trim() || '', publisherId: null },
      owner: { id: `AP-DEMO-${randomUUID()}`, userId: user.user_id, roleAssignmentId: decision.roleAssignmentId || null },
      participants: activityPackage.participantIds.map(userId => ({ id: `AP-DEMO-${randomUUID()}`, userId })),
      supportingStaff: [...new Map(activityPackage.supportingStaff.filter(item => item.user_id !== user.user_id).map(item => [item.user_id, item])).values()].map(item => ({ id: `AP-DEMO-${randomUUID()}`, userId: item.user_id, groupId: item.staff_group_id })),
      vaskItemIds: activityPackage.vaskItemIds,
      riskFlags: activityPackage.riskFlags,
      formDraft: formDraftId ? {
        id: formDraftId,
        templateId: `AF-ACT-${id}`,
        nameEn: `${input.titleEn.trim()} questionnaire`,
        nameZh: `${input.titleZh?.trim() || input.titleEn.trim()}問卷`,
        version: '1.0-draft',
        supersedesId: activityPackage.form.form_version_id,
        notes: 'Activity-specific successor draft created from the active question bank; requires separate form approval and publication before activity activation.',
        questions: activityPackage.questionnaire.map((question, index) => ({
          itemKey: `activity_question_${String(index + 1).padStart(2, '0')}`,
          questionId: question.bankItemId || null,
          promptEn: question.promptEn.trim(),
          promptZh: question.promptZh?.trim() || question.promptEn.trim(),
          required: Boolean(question.required),
          abilityCode: question.abilityCode || null,
          abilityNameEn: question.abilityNameEn || null,
          abilityNameZh: question.abilityNameZh || null,
        })),
      } : null,
    });
    identityRepository.audit(user.school_id, user.user_id, 'activity.created', 'activity', id, `Period resolved by server: ${period.period_id}; active VASK labels: ${activityPackage.vaskItemIds.join(',')}; teacher groups: ${activityPackage.teacherGroupIds.join(',') || 'owner only'}; questionnaire: ${formDraftId || input.formVersionId}`);
    return this.one(user, id);
  },
  revise(user, activityId, input) {
    const projected = this.one(user, activityId);
    const activity = activityRepository.activity(projected.activity_id);
    const current = activity.revisions[0];
    const canEdit = Boolean(activity.people.find(item => item.user_id === user.user_id && item.can_edit)) || capabilityDecision(user, 'activity.edit', resource(activity, current)).allowed;
    if (!canEdit) fail(403, 'Use a change request because this activity is not editable in your assignment');
    if (current.approval_status === 'pending_review') fail(400, 'Withdraw the pending revision before creating a successor');
    if (!['draft','approved','changes_requested','rejected','withdrawn'].includes(current.approval_status)) fail(400, 'This revision state cannot create a successor');
    if (!input.reason?.trim()) fail(400, 'A material-change reason is required');
    const id = `AREV-DEMO-${randomUUID()}`, createdAt = new Date().toISOString();
    activityRepository.createRevision({ revision: { id, activityId, number: current.revision_number + 1, titleEn: input.titleEn || current.title_en, titleZh: input.titleZh ?? current.title_zh, descriptionEn: input.descriptionEn || current.description_en, descriptionZh: input.descriptionZh ?? current.description_zh, activityType: current.activity_type, subjectId: current.subject_id, departmentId: current.department_id, startAt: current.start_at, endAt: current.end_at, ownerId: current.owner_user_id, formVersionId: current.requested_form_version_id, mediaExpected: current.media_capture_expected, location: current.location, reason: input.reason.trim(), supersedesId: current.activity_revision_id, createdBy: user.user_id, publisherId: current.requested_publisher_user_id }, updatedAt: createdAt });
    identityRepository.audit(user.school_id, user.user_id, 'activity.revision.created', 'activity_revision', id, input.reason);
    return this.one(user, activityId);
  },
  requestChange(user, activityId, input) {
    const projected = this.one(user, activityId), activity = activityRepository.activity(projected.activity_id), current = activity.revisions[0];
    requireCapability(user, 'activity.change_request', resource(activity, current));
    if (!changeableFields.has(input.fieldKey) || !input.proposedValue?.trim() || !input.reason?.trim()) fail(400, 'A supported field, proposed value and reason are required');
    const id = `ACR-DEMO-${randomUUID()}`;
    activityRepository.createChangeRequest({ id, schoolId: user.school_id, activityId, baseRevisionId: current.activity_revision_id, requestedBy: user.user_id, ownerId: current.owner_user_id, fieldKey: input.fieldKey, currentValue: current[input.fieldKey] || '', proposedValue: input.proposedValue.trim(), reason: input.reason.trim(), createdAt: new Date().toISOString() });
    identityRepository.audit(user.school_id, user.user_id, 'activity.change_requested', 'activity_change_request', id, input.reason);
    return { id };
  },
  resolveChangeRequest(user, activityId, requestId, input) {
    const projected = this.one(user, activityId), activity = activityRepository.activity(projected.activity_id), request = activityRepository.changeRequest(requestId);
    if (!request || request.activity_id !== activityId || request.status !== 'open') fail(404, 'Open change request not found');
    if (!projected.access.canResolveChangeRequest) fail(403, 'Only the owner or an authorized editor may resolve this request');
    if (!['accepted','rejected'].includes(input.outcome) || !input.reason?.trim()) fail(400, 'Select accepted or rejected and provide a reason');
    let resultingRevisionId = null;
    if (input.outcome === 'accepted') {
      if (activity.revisions[0].approval_status === 'pending_review') fail(400, 'Withdraw the pending revision before accepting this change request');
      const fieldInput = { reason: input.reason.trim() };
      const fieldMap = { title_en: 'titleEn', title_zh: 'titleZh', description_en: 'descriptionEn', description_zh: 'descriptionZh' };
      fieldInput[fieldMap[request.field_key]] = request.proposed_value;
      const revised = this.revise(user, activityId, fieldInput);
      resultingRevisionId = revised.latestRevision.activity_revision_id;
    }
    const resolvedAt = new Date().toISOString();
    activityRepository.resolveChangeRequest(requestId, input.outcome, user.user_id, input.reason.trim(), resultingRevisionId, resolvedAt);
    identityRepository.audit(user.school_id, user.user_id, `activity.change_request.${input.outcome}`, 'activity_change_request', requestId, input.reason);
    return this.one(user, activityId);
  },
  withdraw(user, activityId, input) {
    const projected = this.one(user, activityId);
    if (!projected.access.canWithdraw) fail(403, 'Only an authorized editor may withdraw the pending revision');
    if (!input.reason?.trim()) fail(400, 'A withdrawal reason is required');
    const withdrawnAt = new Date().toISOString();
    activityRepository.withdrawRevision(projected.latestRevision.activity_revision_id, withdrawnAt);
    identityRepository.audit(user.school_id, user.user_id, 'activity.revision.withdrawn', 'activity_revision', projected.latestRevision.activity_revision_id, input.reason);
    return this.one(user, activityId);
  },
  submit(user, activityId, input) {
    const projected = this.one(user, activityId), activity = activityRepository.activity(projected.activity_id), revision = activity.revisions[0], target = resource(activity, revision);
    requireCapability(user, 'activity.submit_for_approval', target);
    if (revision.approval_status !== 'draft') fail(400, 'Only a new draft revision can be submitted; returned, rejected or withdrawn revisions require a successor');
    if (approvalRepository.activeForTarget(revision.activity_revision_id)) fail(400, 'This revision already has an active approval assignment');
    const form = activityRepository.formVersion(revision.requested_form_version_id);
    const participants = activity.people.filter(item => item.relationship_type === 'participant');
    const vaskItems = activityRepository.revisionVask(revision.activity_revision_id);
    const riskFlags = activityRepository.revisionRiskFlags(revision.activity_revision_id);
    if (!form || form.review_status !== 'approved' || form.publication_status !== 'published' || !participants.length || !vaskItems.length || !riskFlags.length) fail(400, 'Complete the activity package: participants, VASK, risk flags and one approved published form are required');
    if (!input.reviewerId || !input.publisherId) fail(400, 'Select both a reviewer and a publisher');
    const policy = approvalRepository.policy('activity', user.school_id), step = approvalRepository.step(policy.approval_policy_version_id, 1);
    const reviewer = identityRepository.user(input.reviewerId), publisher = identityRepository.user(input.publisherId);
    if (!reviewer || !publisher) fail(400, 'Select both a reviewer and a publisher');
    const reviewerDecision = capabilityDecision(reviewer, 'activity.approve', target);
    const publisherDecision = capabilityDecision(publisher, 'activity.publish', target);
    if (!reviewerDecision.allowed) fail(400, 'The selected reviewer is not eligible for this activity scope');
    if (!publisherDecision.allowed) fail(400, 'The selected publisher is not eligible for this activity scope');
    if (reviewer.user_id === user.user_id && (!policy.allow_self_assignment || !policy.allow_self_approval)) fail(400, 'This policy does not allow self-approval');
    const assignedAt = new Date().toISOString(), id = `AASG-DEMO-${randomUUID()}`;
    activityRepository.submitRevision(revision.activity_revision_id, publisher.user_id, assignedAt);
    approvalRepository.createAssignment({ id, schoolId: user.school_id, policyId: policy.approval_policy_version_id, stepId: step.approval_policy_step_id, targetType: 'activity', targetId: activityId, targetVersionId: revision.activity_revision_id, assigneeId: reviewer.user_id, roleAssignmentId: reviewerDecision.roleAssignmentId, assignedBy: user.user_id, assignedAt, dueAt: new Date(Date.now() + policy.overdue_escalation_minutes * 60000).toISOString() });
    identityRepository.audit(user.school_id, user.user_id, 'activity.submitted', 'activity_revision', revision.activity_revision_id, `Reviewer: ${reviewer.user_id}; publisher: ${publisher.user_id}`);
    return { assignmentId: id };
  },
};
