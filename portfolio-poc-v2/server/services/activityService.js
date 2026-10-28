import { randomUUID } from 'node:crypto';
import { activityRepository } from '../repositories/activityRepository.js';
import { approvalRepository } from '../repositories/approvalRepository.js';
import { identityRepository } from '../repositories/identityRepository.js';
import { capabilityDecision, fail, requireCapability, resourceScope } from './access.js';

function resource(activity, revision) {
  return { school_id: activity.school_id, activity_id: activity.activity_id, group_id: activity.group_id, subject_id: revision?.subject_id, department_id: revision?.department_id, programme_id: activity.group_id === 'GRP-STUDENT-DEV' ? 'student_development' : null };
}

function visible(user, activity) {
  const latest = activity.revisions?.[0];
  const viewDecision = capabilityDecision(user, 'activity.view', resource(activity, latest));
  if (viewDecision.source === 'explicit_deny') return false;
  if (user.user_type === 'student') return Boolean(activity.people?.find(person => person.user_id === user.user_id));
  if (activity.people?.find(person => person.user_id === user.user_id)) return true;
  if (activityRepository.approvalTargetForUser(activity.activity_id, user.user_id)) return true;
  return viewDecision.allowed;
}

export const activityService = {
  list(user) {
    return activityRepository.all(user.school_id).map(row => activityRepository.activity(row.activity_id)).filter(activity => visible(user, activity)).map(activity => ({
      ...activity,
      latestRevision: activity.revisions[0] || null,
      currentApprovedRevision: activity.revisions.find(item => item.activity_revision_id === activity.current_approved_revision_id) || null,
      access: {
        canEdit: Boolean(activity.people.find(item => item.user_id === user.user_id && item.can_edit)) || capabilityDecision(user, 'activity.edit', resource(activity, activity.revisions[0])).allowed,
        canRequestChange: capabilityDecision(user, 'activity.change_request', resource(activity, activity.revisions[0])).allowed,
        canSubmit: capabilityDecision(user, 'activity.submit_for_approval', resource(activity, activity.revisions[0])).allowed,
      },
    }));
  },
  one(user, activityId) {
    const activity = activityRepository.activity(activityId);
    if (!activity || activity.school_id !== user.school_id || !visible(user, activity)) fail(404, 'Activity not found');
    return activity;
  },
  create(user, input) {
    const target = { school_id: user.school_id, subject_id: input.subjectId || null, department_id: input.departmentId || null, programme_id: input.programmeId || null };
    const decision = requireCapability(user, 'activity.create', target);
    if (!input.titleEn?.trim() || !input.descriptionEn?.trim()) fail(400, 'English title and description are required');
    const stamp = new Date().toISOString();
    const id = `ACT-DEMO-${randomUUID()}`, revisionId = `AREV-DEMO-${randomUUID()}`;
    activityRepository.create({
      activity: { id, schoolId: user.school_id, groupId: input.groupId || null, createdBy: user.user_id, periodId: input.periodId || '2026-27-P1', createdAt: stamp },
      revision: { id: revisionId, titleEn: input.titleEn, titleZh: input.titleZh || '', descriptionEn: input.descriptionEn, descriptionZh: input.descriptionZh || '', activityType: input.activityType || 'project', subjectId: input.subjectId || null, departmentId: input.departmentId || null, startAt: input.startAt, endAt: input.endAt, ownerId: user.user_id, formVersionId: input.formVersionId || null, mediaExpected: input.mediaExpected ? 1 : 0, location: input.location || '' },
      person: { id: `AP-DEMO-${randomUUID()}`, userId: user.user_id, roleAssignmentId: decision.roleAssignmentId || null },
    });
    identityRepository.audit(user.school_id, user.user_id, 'activity.created', 'activity', id);
    return this.one(user, id);
  },
  revise(user, activityId, input) {
    const activity = this.one(user, activityId);
    const current = activity.revisions[0];
    const canEdit = Boolean(activity.people.find(item => item.user_id === user.user_id && item.can_edit)) || capabilityDecision(user, 'activity.edit', resource(activity, current)).allowed;
    if (!canEdit) fail(403, 'Use a change request because this activity is not editable in your assignment');
    if (!input.reason?.trim()) fail(400, 'A material-change reason is required');
    const id = `AREV-DEMO-${randomUUID()}`, createdAt = new Date().toISOString();
    activityRepository.createRevision({ revision: { id, activityId, number: current.revision_number + 1, titleEn: input.titleEn || current.title_en, titleZh: input.titleZh ?? current.title_zh, descriptionEn: input.descriptionEn || current.description_en, descriptionZh: input.descriptionZh ?? current.description_zh, activityType: current.activity_type, subjectId: current.subject_id, departmentId: current.department_id, startAt: current.start_at, endAt: current.end_at, ownerId: current.owner_user_id, formVersionId: current.requested_form_version_id, mediaExpected: current.media_capture_expected, location: current.location, reason: input.reason, supersedesId: current.activity_revision_id, createdBy: user.user_id }, updatedAt: createdAt });
    identityRepository.audit(user.school_id, user.user_id, 'activity.revision.created', 'activity_revision', id, input.reason);
    return this.one(user, activityId);
  },
  requestChange(user, activityId, input) {
    const activity = this.one(user, activityId), current = activity.revisions[0];
    requireCapability(user, 'activity.change_request', resource(activity, current));
    if (!input.fieldKey || !input.proposedValue?.trim() || !input.reason?.trim()) fail(400, 'Field, proposed value and reason are required');
    const id = `ACR-DEMO-${randomUUID()}`;
    activityRepository.createChangeRequest({ id, schoolId: user.school_id, activityId, baseRevisionId: current.activity_revision_id, requestedBy: user.user_id, ownerId: current.owner_user_id, fieldKey: input.fieldKey, currentValue: current[input.fieldKey] || '', proposedValue: input.proposedValue, reason: input.reason, createdAt: new Date().toISOString() });
    identityRepository.audit(user.school_id, user.user_id, 'activity.change_requested', 'activity_change_request', id, input.reason);
    return { id };
  },
  submit(user, activityId, input) {
    const activity = this.one(user, activityId), revision = activity.revisions[0], target = resource(activity, revision);
    requireCapability(user, 'activity.submit_for_approval', target);
    if (revision.approval_status !== 'draft' && revision.approval_status !== 'changes_requested') fail(400, 'Only a draft or returned revision can be submitted');
    const policy = approvalRepository.policy('activity', user.school_id), step = approvalRepository.step(policy.approval_policy_version_id, 1);
    const reviewer = identityRepository.user(input.reviewerId);
    if (!reviewer) fail(400, 'Select a reviewer');
    const reviewerDecision = capabilityDecision(reviewer, 'activity.approve', target);
    if (!reviewerDecision.allowed) fail(400, 'The selected reviewer is not eligible for this activity scope');
    if (reviewer.user_id === user.user_id && (!policy.allow_self_assignment || !policy.allow_self_approval)) fail(400, 'This policy does not allow self-approval');
    const assignedAt = new Date().toISOString(), id = `AASG-DEMO-${randomUUID()}`;
    activityRepository.submitRevision(revision.activity_revision_id, assignedAt);
    approvalRepository.createAssignment({ id, schoolId: user.school_id, policyId: policy.approval_policy_version_id, stepId: step.approval_policy_step_id, targetType: 'activity', targetId: activityId, targetVersionId: revision.activity_revision_id, assigneeId: reviewer.user_id, roleAssignmentId: reviewerDecision.roleAssignmentId, assignedBy: user.user_id, assignedAt, dueAt: new Date(Date.now() + policy.overdue_escalation_minutes * 60000).toISOString() });
    identityRepository.audit(user.school_id, user.user_id, 'activity.submitted', 'activity_revision', revision.activity_revision_id);
    return { assignmentId: id };
  },
};
