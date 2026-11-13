import { randomUUID } from 'node:crypto';
import { portfolioRepository } from '../repositories/portfolioRepository.js';
import { approvalRepository } from '../repositories/approvalRepository.js';
import { identityRepository } from '../repositories/identityRepository.js';
import { memorableRepository } from '../repositories/memorableRepository.js';
import { rubricRepository } from '../repositories/rubricRepository.js';
import { portfolioTemplateRepository } from '../repositories/portfolioTemplateRepository.js';
import { capabilityDecision, fail, requireCapability, sessionProfile } from './access.js';

function accessResource(studentId, periodId) {
  const membership = identityRepository.classMembership(studentId, periodId);
  const student = identityRepository.user(studentId);
  return { school_id: membership?.school_id || student?.school_id, student_user_id: studentId, student_id: studentId, class_id: membership?.class_id };
}

function canSee(user, studentId, periodId) {
  if (user.user_type === 'student') return user.user_id === studentId;
  return capabilityDecision(user, 'portfolio.review', accessResource(studentId, periodId)).allowed || capabilityDecision(user, 'portfolio.approve', { school_id: user.school_id }).allowed || capabilityDecision(user, 'portfolio.publish', { school_id: user.school_id }).allowed || capabilityDecision(user, 'approval.coordinate', { school_id: user.school_id }).allowed;
}

export const portfolioService = {
  list(user, periodId = '2026-27-P1') {
    if (!sessionProfile(user).pageAccess.portfolios) fail(403, 'Portfolio workspace access is not assigned');
    return portfolioRepository.students(user.school_id).filter(student => canSee(user, student.user_id, periodId)).map(student => {
      const versions = portfolioRepository.versions(student.user_id, periodId), latest = versions[0] || null, official = portfolioRepository.official(student.user_id, periodId);
      return { student: { id: student.user_id, name: student.name_en, nameZh: student.name_zh }, latest, officialVersion: official?.version || null, officialSnapshot: official ? { id: official.portfolio_snapshot_id, publishedAt: official.published_at } : null, status: official ? 'approved_version_available' : 'no_approved_version' };
    });
  },
  detail(user, studentId, periodId = '2026-27-P1') {
    if (!canSee(user, studentId, periodId)) fail(404, 'Portfolio not found');
    const student = identityRepository.user(studentId);
    if (!student) fail(404, 'Student not found');
    const versions = portfolioRepository.versions(studentId, periodId).map(item => portfolioRepository.version(item.portfolio_working_version_id));
    const official = portfolioRepository.official(studentId, periodId);
    const activeRubric = rubricRepository.activeAssessment(student.school_id);
    const rubricId = versions[0]?.rubric_catalogue_id || official?.version?.rubric_catalogue_id || activeRubric?.rubric_catalogue_id;
    const templateId = versions[0]?.portfolio_template_version_id || official?.version?.portfolio_template_version_id;
    const template = templateId ? portfolioTemplateRepository.version(templateId) : portfolioTemplateRepository.assigned(student.school_id);
    return { student: { id: student.user_id, name: student.name_en, nameZh: student.name_zh }, periodId, rubric: rubricId ? rubricRepository.catalogue(rubricId) : null, template, skillSummary: rubricId ? portfolioRepository.skillSummary(studentId, periodId, rubricId) : [], versions, official };
  },
  editor(user, studentId, periodId = '2026-27-P1') {
    if (user.user_type !== 'student' || user.user_id !== studentId) fail(404, 'Portfolio editor not found');
    const detail = this.detail(user, studentId, periodId);
    return { ...detail, submittedMemorableActivities: memorableRepository.selections(studentId, periodId).filter(item => ['submitted','approved'].includes(item.submission_status)) };
  },
  view(user, studentId, periodId = '2026-27-P1') {
    if (!canSee(user, studentId, periodId)) fail(404, 'Portfolio not found');
    const student = identityRepository.user(studentId);
    if (!student) fail(404, 'Student not found');
    const official = portfolioRepository.official(studentId, periodId);
    const rubricId = official?.version?.rubric_catalogue_id || rubricRepository.activeAssessment(student.school_id)?.rubric_catalogue_id;
    const templateId = official?.version?.portfolio_template_version_id;
    const template = templateId ? portfolioTemplateRepository.version(templateId) : portfolioTemplateRepository.assigned(student.school_id);
    return { student: { id: student.user_id, name: student.name_en, nameZh: student.name_zh }, periodId, rubric: rubricId ? rubricRepository.catalogue(rubricId) : null, template, skillSummary: rubricId ? portfolioRepository.skillSummary(studentId, periodId, rubricId) : [], official };
  },
  createDraft(user, input) {
    if (user.user_type !== 'student' || user.user_id !== input.studentId) fail(403, 'Students may edit only their own working Portfolio');
    const periodId = input.periodId || '2026-27-P1';
    const memorableSelections = memorableRepository.selections(user.user_id, periodId).filter(item => ['submitted','approved'].includes(item.submission_status));
    const versions = portfolioRepository.versions(user.user_id, periodId), latest = versions[0];
    const activeRubric = rubricRepository.activeAssessment(user.school_id);
    if (!activeRubric) fail(400, 'No validated active assessment rubric is available');
    const activeTemplate = portfolioTemplateRepository.assigned(user.school_id);
    if (!activeTemplate) fail(400, 'No published Portfolio template is assigned for this student scope');
    const id = `PWV-DEMO-${randomUUID()}`;
    const portfolioItemSections = activeTemplate.sections.filter(section => section.visible && section.status === 'active' && section.source_type === 'portfolio_item');
    const introductionSection = portfolioItemSections.find(section => section.section_key === 'self_introduction');
    if (introductionSection && !input.selfIntroduction?.trim()) fail(400, 'Self-introduction is required by the active Portfolio template');
    const items = [];
    if (introductionSection) items.push({ id: `${id}-INTRO`, sectionKey: introductionSection.section_key, sourceType: 'student_text', sourceId: null, displayOrder: introductionSection.display_order * 100, authorshipOrigin: 'human_authored', studentText: input.selfIntroduction.trim() });
    const memorableSection = portfolioItemSections.find(section => section.section_key === 'memorable_activity');
    if (memorableSection) memorableSelections.forEach((selection, index) => items.push({ id: `${id}-PM-${index + 1}`, sectionKey: memorableSection.section_key, sourceType: 'proud_moment_selection', sourceId: selection.selection_id, displayOrder: memorableSection.display_order * 100 + index, authorshipOrigin: 'human_authored', studentText: selection.selection_reason }));
    portfolioRepository.createDraft({ id, schoolId: user.school_id, studentId: user.user_id, periodId, number: (latest?.version_number || 0) + 1, supersedesId: latest?.portfolio_working_version_id || null, rubricCatalogueId: activeRubric.rubric_catalogue_id, portfolioTemplateVersionId: activeTemplate.portfolio_template_version_id, templateManifestSha256: activeTemplate.manifest_sha256, items, createdAt: new Date().toISOString() });
    identityRepository.audit(user.school_id, user.user_id, 'portfolio.draft.created', 'portfolio_working_version', id);
    return this.editor(user, user.user_id, periodId);
  },
  submit(user, versionId) {
    const version = portfolioRepository.version(versionId);
    if (!version || version.student_user_id !== user.user_id || user.user_type !== 'student') fail(404, 'Working version not found');
    if (version.status !== 'draft') fail(400, 'Only a draft can be submitted');
    const submittedAt = new Date().toISOString();
    portfolioRepository.submit(versionId, submittedAt);
    identityRepository.audit(user.school_id, user.user_id, 'portfolio.student_submitted', 'portfolio_working_version', versionId);
    return { ok: true };
  },
  review(user, versionId, input) {
    const version = portfolioRepository.version(versionId);
    if (!version) fail(404, 'Working version not found');
    const resource = accessResource(version.student_user_id, version.period_id);
    requireCapability(user, 'portfolio.review', resource);
    if (!['student_submitted','class_teacher_review'].includes(version.status)) fail(400, 'This version is not awaiting class-teacher review');
    if (!Array.isArray(input.decisions) || !input.decisions.length) fail(400, 'Review at least one submitted item');
    const validItemIds = new Set(version.items.map(item => item.portfolio_version_item_id));
    if (input.decisions.some(decision => !validItemIds.has(decision.itemId))) fail(400, 'Every reviewed item must belong to this Portfolio version');
    if (input.decisions.some(decision => !['included','returned'].includes(decision.decision) || !decision.reason?.trim())) fail(400, 'Every item requires a supported decision and reason');
    if (input.narrativeText && version.narrative) {
      requireCapability(user, 'portfolio.generated_narrative.edit', resource);
      if (!input.narrativeReason?.trim()) fail(400, 'A narrative-edit reason is required');
    }
    const policy = approvalRepository.policy('portfolio', user.school_id), step = approvalRepository.step(policy.approval_policy_version_id, 2), approver = identityRepository.user(input.approverId || 'USR-ST-001');
    if (!approver) fail(400, 'Select a Portfolio approver');
    const approverAccess = capabilityDecision(approver, 'portfolio.approve', { school_id: user.school_id });
    if (!approverAccess.allowed) fail(400, 'Selected Portfolio approver is not eligible');
    const reviewedAt = new Date().toISOString();
    portfolioRepository.review({ versionId, decisions: input.decisions, narrativeId: version.narrative?.learner_narrative_version_id || null, narrativeText: input.narrativeText || '', narrativeReason: input.narrativeReason || '', actorId: user.user_id, reviewedAt });
    approvalRepository.createAssignment({ id: `AASG-PORT-${randomUUID()}`, schoolId: user.school_id, policyId: policy.approval_policy_version_id, stepId: step.approval_policy_step_id, targetType: 'portfolio_working_version', targetId: versionId, targetVersionId: versionId, assigneeId: approver.user_id, roleAssignmentId: approverAccess.roleAssignmentId, assignedBy: user.user_id, assignedAt: reviewedAt, dueAt: new Date(Date.now() + policy.overdue_escalation_minutes * 60000).toISOString() });
    identityRepository.audit(user.school_id, user.user_id, 'portfolio.class_teacher_reviewed', 'portfolio_working_version', versionId, input.reason || null);
    return { ok: true };
  },
};
