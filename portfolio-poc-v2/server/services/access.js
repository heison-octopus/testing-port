import { identityRepository } from '../repositories/identityRepository.js';

export class HttpError extends Error { constructor(status, message) { super(message); this.status = status; } }
export function fail(status, message) { throw new HttpError(status, message); }

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
  return {
    id: user.user_id,
    schoolId: user.school_id,
    name: user.name_en,
    nameZh: user.name_zh,
    userType: user.user_type,
    positions: identityRepository.positions(user.user_id),
    roles: identityRepository.roles(user.user_id),
    capabilityKeys: keys,
    canSearchStaff: capabilityDecision(user, 'staff.directory.search', schoolResource).allowed || capabilityDecision(user, 'policy.manage', schoolResource).allowed || capabilityDecision(user, 'approval.coordinate', schoolResource).allowed,
    canManagePolicy: capabilityDecision(user, 'policy.manage', schoolResource).allowed,
    canCoordinateApprovals: capabilityDecision(user, 'approval.coordinate', schoolResource).allowed,
  };
}

export function canUseAny(user, keys) {
  const available = new Set(identityRepository.roleCapabilityGrants(user.user_id).filter(active).filter(item => item.effect === 'allow').map(item => item.capability_key));
  return keys.some(key => available.has(key));
}
