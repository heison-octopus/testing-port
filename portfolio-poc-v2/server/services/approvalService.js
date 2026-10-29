import { randomUUID } from 'node:crypto';
import { approvalRepository } from '../repositories/approvalRepository.js';
import { activityRepository } from '../repositories/activityRepository.js';
import { portfolioRepository } from '../repositories/portfolioRepository.js';
import { identityRepository } from '../repositories/identityRepository.js';
import { assessmentRepository } from '../repositories/assessmentRepository.js';
import { capabilityDecision, fail, sessionProfile } from './access.js';

function targetResource(assignment) {
  if (['activity','activity_publication'].includes(assignment.workflow_type)) {
    const activity = activityRepository.activity(assignment.target_id), revision = activity?.revisions.find(item => item.activity_revision_id === assignment.target_version_id) || activity?.revisions[0];
    return { school_id: assignment.school_id, activity_id: assignment.target_id, group_id: activity?.group_id, subject_id: revision?.subject_id, department_id: revision?.department_id, programme_id: activity?.group_id === 'GRP-STUDENT-DEV' ? 'student_development' : null };
  }
  const version = portfolioRepository.version(assignment.target_version_id || assignment.target_id);
  const membership = version ? identityRepository.classMembership(version.student_user_id, version.period_id) : null;
  return { school_id: assignment.school_id, student_user_id: version?.student_user_id, student_id: version?.student_user_id, class_id: membership?.class_id };
}

export const approvalService = {
  workspace(user) {
    const profile = sessionProfile(user);
    if (!profile.pageAccess.approvals) fail(403, 'Approval workspace access is not assigned');
    const assignments = approvalRepository.assignments(user.school_id).filter(item => item.assignee_user_id === user.user_id || profile.canCoordinateApprovals);
    const escalations = profile.canCoordinateApprovals ? approvalRepository.escalations(user.school_id) : [];
    return { assignments: assignments.map(item => ({ ...item, canDecide: item.assignee_user_id === user.user_id && ['assigned','in_review'].includes(item.status) })), escalations, canCoordinate: profile.canCoordinateApprovals };
  },
  decide(user, assignmentId, input) {
    const assignment = approvalRepository.assignment(assignmentId);
    if (!assignment || assignment.school_id !== user.school_id) fail(404, 'Approval assignment not found');
    if (assignment.assignee_user_id !== user.user_id) fail(403, 'Approval coordinators may reassign work but cannot make another reviewer’s content decision');
    if (!['assigned','in_review'].includes(assignment.status)) fail(400, 'This assignment is already complete');
    if (!['approved','changes_requested','rejected'].includes(input.outcome)) fail(400, 'Unsupported decision');
    if (!input.reason?.trim()) fail(400, 'A decision reason is required');
    const resource = targetResource(assignment);
    const access = capabilityDecision(user, assignment.capability_key, resource);
    if (!access.allowed) fail(403, access.reason || 'Required approval capability is no longer effective');
    const decidedAt = new Date().toISOString();
    approvalRepository.decide({ id: `ADEC-DEMO-${randomUUID()}`, assignmentId, schoolId: user.school_id, stepNumber: assignment.step_number, outcome: input.outcome, reason: input.reason, actorId: user.user_id, capabilityId: assignment.required_capability_id, scopeType: access.scopeType || 'school', scopeId: access.scopeId || user.school_id, decidedAt });

    if (assignment.workflow_type === 'activity') {
      activityRepository.applyDecision(assignment.target_version_id, input.outcome, user.user_id, decidedAt);
      if (input.outcome === 'approved' && assignment.publication_separate) this.createActivityPublicationAssignment(user, assignment.target_id, assignment.target_version_id, decidedAt);
    }
    if (assignment.workflow_type === 'activity_publication' && input.outcome === 'approved') {
      activityRepository.publishDecision(assignment.target_version_id, user.user_id, decidedAt);
      assessmentRepository.ensureActivityAssignments(assignment.target_id, user.user_id, decidedAt);
    }
    if (assignment.workflow_type === 'portfolio' && assignment.step_number === 2 && input.outcome === 'approved') {
      portfolioRepository.approve(assignment.target_version_id, user.user_id, decidedAt);
      this.createPublicationAssignment(user, assignment.target_version_id, decidedAt);
    }
    if (assignment.workflow_type === 'portfolio_publication' && input.outcome === 'approved') portfolioRepository.publish(assignment.target_version_id, user.user_id, decidedAt);
    identityRepository.audit(user.school_id, user.user_id, `approval.${input.outcome}`, 'approval_assignment', assignmentId, input.reason);
    return { ok: true };
  },
  createPublicationAssignment(user, versionId, assignedAt) {
    const policy = approvalRepository.policy('portfolio_publication', user.school_id), step = approvalRepository.step(policy.approval_policy_version_id, 1);
    const access = capabilityDecision(user, 'portfolio.publish', { school_id: user.school_id });
    const publisherId = access.allowed ? user.user_id : 'USR-ST-001';
    const publisher = identityRepository.user(publisherId);
    const publisherAccess = capabilityDecision(publisher, 'portfolio.publish', { school_id: user.school_id });
    if (!publisherAccess.allowed) return null;
    const id = `AASG-PUB-${randomUUID()}`;
    approvalRepository.createAssignment({ id, schoolId: user.school_id, policyId: policy.approval_policy_version_id, stepId: step.approval_policy_step_id, targetType: 'portfolio_publication', targetId: versionId, targetVersionId: versionId, assigneeId: publisherId, roleAssignmentId: publisherAccess.roleAssignmentId, assignedBy: user.user_id, assignedAt, dueAt: new Date(Date.now() + policy.overdue_escalation_minutes * 60000).toISOString() });
    return id;
  },
  createActivityPublicationAssignment(user, activityId, revisionId, assignedAt) {
    if (approvalRepository.activeForTarget(revisionId, 'activity_publication')) return null;
    const activity = activityRepository.activity(activityId), revision = activity?.revisions.find(item => item.activity_revision_id === revisionId);
    if (!activity || !revision?.requested_publisher_user_id) return null;
    const policy = approvalRepository.policy('activity_publication', user.school_id), step = approvalRepository.step(policy.approval_policy_version_id, 1);
    const publisher = identityRepository.user(revision.requested_publisher_user_id);
    const publisherAccess = publisher ? capabilityDecision(publisher, 'activity.publish', targetResource({ ...activity, workflow_type: 'activity_publication', school_id: user.school_id, target_id: activityId, target_version_id: revisionId })) : { allowed: false };
    if (!publisherAccess.allowed) return null;
    const id = `AASG-ACTPUB-${randomUUID()}`;
    approvalRepository.createAssignment({ id, schoolId: user.school_id, policyId: policy.approval_policy_version_id, stepId: step.approval_policy_step_id, targetType: 'activity', targetId: activityId, targetVersionId: revisionId, assigneeId: publisher.user_id, roleAssignmentId: publisherAccess.roleAssignmentId, assignedBy: user.user_id, assignedAt, dueAt: new Date(Date.now() + policy.overdue_escalation_minutes * 60000).toISOString() });
    return id;
  },
};
