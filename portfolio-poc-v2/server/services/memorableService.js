import { randomUUID } from 'node:crypto';
import { memorableRepository } from '../repositories/memorableRepository.js';
import { identityRepository } from '../repositories/identityRepository.js';
import { fail } from './access.js';

const demoAsOf = process.env.POC_V2_AS_OF || '2027-01-20T12:00:00+08:00';

function requireStudent(user) {
  if (user.user_type !== 'student') fail(403, 'Memorable activity curation belongs to the student workspace');
}

function periodWindow(user, periodId) {
  const window = memorableRepository.window(user.school_id, periodId);
  const open = Boolean(window && window.status === 'open' && demoAsOf >= window.opens_at && demoAsOf <= window.closes_at);
  return { ...window, isOpen: open };
}

export const memorableService = {
  workspace(user, periodId = '2026-27-P1') {
    requireStudent(user);
    return { periodId, window: periodWindow(user, periodId), eligibleActivities: memorableRepository.eligibleActivities(user.user_id, periodId), selections: memorableRepository.selections(user.user_id, periodId) };
  },
  save(user, input) {
    requireStudent(user);
    const periodId = input.periodId || '2026-27-P1';
    const window = periodWindow(user, periodId);
    if (!window.isOpen) fail(400, 'The memorable-activity selection window is closed');
    if (!input.activityId || !input.reason?.trim()) fail(400, 'Choose one eligible activity and explain why it mattered');
    if (input.reason.trim().length > 4000) fail(400, 'Reflection must be 4,000 characters or fewer');
    const eligible = memorableRepository.eligibleActivities(user.user_id, periodId).find(item => item.activity_id === input.activityId);
    if (!eligible) fail(400, 'Only an official published activity joined by this student can be selected');
    const existing = eligible.selection_id ? memorableRepository.selection(eligible.selection_id) : null;
    if (existing && !['draft','changes_requested'].includes(existing.submission_status)) fail(400, 'A submitted memorable activity is locked unless it is returned');
    if (!existing && memorableRepository.count(user.user_id, periodId) >= window.max_selections) fail(400, 'This period has reached its configured memorable-activity limit');
    const id = memorableRepository.save({ id: `PM-DEMO-${randomUUID()}`, studentId: user.user_id, academicYear: '2026/27', periodId, activityId: input.activityId, reason: input.reason.trim(), labelCodes: String(input.labelCodes || '') });
    identityRepository.audit(user.school_id, user.user_id, 'proud_moment.draft_saved', 'proud_moment_selection', id);
    return this.workspace(user, periodId);
  },
  submit(user, selectionId) {
    requireStudent(user);
    const selection = memorableRepository.selection(selectionId);
    if (!selection || selection.student_id !== user.user_id) fail(404, 'Memorable activity selection not found');
    if (selection.submission_status !== 'draft') fail(400, 'Only a draft selection can be submitted');
    memorableRepository.submit(selectionId);
    identityRepository.audit(user.school_id, user.user_id, 'proud_moment.submitted', 'proud_moment_selection', selectionId);
    return this.workspace(user, selection.period_id);
  },
};
