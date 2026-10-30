import { identityRepository } from '../repositories/identityRepository.js';

const defaultCode = status => status === 401 ? 'AUTH_REQUIRED' : status === 403 ? 'FORBIDDEN' : status === 404 ? 'NOT_FOUND' : status >= 500 ? 'UNEXPECTED_ERROR' : 'VALIDATION_ERROR';

export class HttpError extends Error {
  constructor(status, message, code = defaultCode(status), details = undefined) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}
export function fail(status, message, code, details) { throw new HttpError(status, message, code, details); }

const asOf = process.env.POC_V2_AS_OF || '2027-01-20';
const active = record => (!record.effective_from || record.effective_from <= asOf) && (!record.effective_until || record.effective_until >= asOf);

export function resourceScope(resource = {}) {
  return {
    scopeMatches(type, id) {
      if (type === 'school') return resource.school_id === id;
      if (type === 'subject') return resource.subject_id === id;
      if (type === 'department') return resource.department_id === id;
      if (type === 'activity') return resource.activity_id === id;
      if (type === 'student') return resource.student_user_id === id || resource.student_id === id;
      if (type === 'class') return resource.class_id === id;
      if (type === 'group') return resource.group_id === id;
      if (type === 'programme') return resource.programme_id === id;
      if (type === 'year') return resource.year_id === id;
      if (type === 'grade') return resource.grade_id === id;
      return false;
    },
  };
}

export function capabilityDecision(user, capabilityKey, resource) {
  const scope = resourceScope(resource);
  const grants = identityRepository.roleCapabilityGrants(user.user_id, capabilityKey).filter(active).filter(item => scope.scopeMatches(item.scope_type, item.scope_id));
  const overrides = identityRepository.overridesForUser(user.user_id, capabilityKey).filter(active).filter(item => scope.scopeMatches(item.scope_type, item.scope_id));
  const denied = overrides.find(item => item.effect === 'deny');
  if (denied) return { allowed: false, reason: denied.reason, source: 'explicit_deny', overrideId: denied.capability_policy_override_id };
  const allowedOverride = overrides.find(item => item.effect === 'allow');
  if (allowedOverride) return { allowed: true, source: 'override', scopeType: allowedOverride.scope_type, scopeId: allowedOverride.scope_id };
  const grant = grants.find(item => item.effect === 'allow');
  return grant ? { allowed: true, source: 'role', roleAssignmentId: grant.user_role_assignment_id, scopeType: grant.scope_type, scopeId: grant.scope_id, capabilityId: grant.capability_id } : { allowed: false, source: 'none' };
}

export function requireCapability(user, capabilityKey, resource) {
  const decision = capabilityDecision(user, capabilityKey, resource);
  if (!decision.allowed) fail(403, decision.reason || `Missing capability: ${capabilityKey}`);
  return decision;
}

export function sessionProfile(user) {
  const grants = identityRepository.roleCapabilityGrants(user.user_id).filter(active);
  const keys = [...new Set(grants.filter(item => item.effect === 'allow').map(item => item.capability_key))];
  const schoolResource = { school_id: user.school_id };
  const roles = identityRepository.roles(user.user_id);
  const roleCategories = new Set(roles.map(item => item.role_category));
  const canOpenApprovals = ['approval_function','publication_function','workflow_function'].some(category => roleCategories.has(category));
  const canOpenActivities = user.user_type === 'student' || keys.some(key => key.startsWith('activity.'));
  const canOpenPortfolios = user.user_type === 'student' || keys.some(key => key.startsWith('portfolio.')) || keys.includes('approval.coordinate');
  const canOpenAssessments = keys.includes('assessment.submit') || keys.includes('evidence.review');
  const canOpenImports = keys.includes('import.view') || keys.includes('import.source.manage');
  const canReviewPortfolios = keys.includes('portfolio.review') || keys.includes('portfolio.approve') || keys.includes('portfolio.publish') || keys.includes('approval.coordinate');
  return {
    id: user.user_id,
    schoolId: user.school_id,
    name: user.name_en,
    nameZh: user.name_zh,
    userType: user.user_type,
    positions: identityRepository.positions(user.user_id),
    roles,
    capabilityKeys: keys,
    canSearchStaff: capabilityDecision(user, 'staff.directory.search', schoolResource).allowed || capabilityDecision(user, 'policy.manage', schoolResource).allowed || capabilityDecision(user, 'approval.coordinate', schoolResource).allowed,
    canManagePolicy: capabilityDecision(user, 'policy.manage', schoolResource).allowed,
    canCoordinateApprovals: capabilityDecision(user, 'approval.coordinate', schoolResource).allowed,
    pageAccess: {
      activities: canOpenActivities,
      responses: user.user_type === 'student',
      assessments: canOpenAssessments,
      approvals: canOpenApprovals,
      portfolios: canOpenPortfolios,
      portfolioEditor: user.user_type === 'student',
      portfolioReview: canReviewPortfolios,
      memorable: user.user_type === 'student',
      imports: canOpenImports,
      aiDrafts: keys.includes('portfolio.ai_draft.review'),
      staff: capabilityDecision(user, 'staff.directory.search', schoolResource).allowed || capabilityDecision(user, 'policy.manage', schoolResource).allowed || capabilityDecision(user, 'approval.coordinate', schoolResource).allowed,
      policy: capabilityDecision(user, 'policy.manage', schoolResource).allowed,
      catalogue: capabilityDecision(user, 'policy.manage', schoolResource).allowed,
    },
  };
}

export function canUseAny(user, keys) {
  const available = new Set(identityRepository.roleCapabilityGrants(user.user_id).filter(active).filter(item => item.effect === 'allow').map(item => item.capability_key));
  return keys.some(key => available.has(key));
}
