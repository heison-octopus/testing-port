import { randomUUID } from 'node:crypto';
import { identityRepository } from '../repositories/identityRepository.js';
import { canUseAny, capabilityDecision, fail, requireCapability, sessionProfile } from './access.js';

function includes(value, query) { return String(value || '').toLowerCase().includes(String(query || '').toLowerCase()); }

export const identityService = {
  demoUsers: () => identityRepository.demoUsers(),
  session(user) { return sessionProfile(user); },
  referenceData(user) {
    if (!sessionProfile(user).canSearchStaff) fail(403, 'Staff directory access is not assigned');
    return identityRepository.referenceData(user.school_id);
  },
  directory(user, filters) {
    if (!sessionProfile(user).canSearchStaff) fail(403, 'Staff directory access is not assigned');
    const rows = identityRepository.staffDirectory(user.school_id).filter(item => {
      if (filters.search && ![item.name_en,item.name_zh,item.staff_number,item.email].some(value => includes(value, filters.search))) return false;
      if (filters.positionId && !item.positions.some(position => position.position_id === filters.positionId)) return false;
      if (filters.roleId && !item.roles.some(role => role.role_id === filters.roleId)) return false;
      if (filters.departmentId && !item.positions.some(position => position.department_id === filters.departmentId)) return false;
      if (filters.subjectId && !item.positions.some(position => position.subject_id === filters.subjectId)) return false;
      if (filters.groupId && !item.groups.some(group => group.staff_group_id === filters.groupId)) return false;
      if (filters.capabilityId && !item.capabilities.some(capability => capability.capability_id === filters.capabilityId)) return false;
      if (filters.approvalEligible === 'true' && !item.roles.some(role => role.role_category === 'approval_function' || role.role_category === 'publication_function')) return false;
      return true;
    });
    return rows.map(item => ({
      id: item.user_id,
      name: item.name_en,
      nameZh: item.name_zh,
      staffNumber: item.staff_number,
      positions: item.positions,
      roles: item.roles,
      groups: item.groups,
      capabilities: [...new Map(item.capabilities.map(capability => [capability.capability_key, capability])).values()],
      explicitDenies: item.overrides.filter(override => override.effect === 'deny'),
    }));
  },
  policyWorkspace(user) {
    requireCapability(user, 'policy.manage', { school_id: user.school_id });
    return { reference: identityRepository.referenceData(user.school_id), overrides: identityRepository.overrides(user.school_id) };
  },
  previewPolicy(user, input) {
    requireCapability(user, 'policy.manage', { school_id: user.school_id });
    const affected = input.targetType === 'group' ? identityRepository.groupMembers(input.targetId) : [identityRepository.user(input.targetId)].filter(Boolean);
    return affected.map(person => {
      const capability = identityRepository.referenceData(user.school_id).capabilities.find(item => item.capability_id === input.capabilityId);
      const before = capability ? capabilityDecision(person, capability.capability_key, { school_id: user.school_id, [`${input.scopeType}_id`]: input.scopeId }) : { allowed: false };
      const afterAllowed = input.effect === 'deny' ? false : before.source === 'explicit_deny' ? false : true;
      return { userId: person.user_id, name: person.name_en, nameZh: person.name_zh, beforeAllowed: before.allowed, afterAllowed, effect: input.effect };
    });
  },
  applyPolicy(user, input) {
    requireCapability(user, 'policy.manage', { school_id: user.school_id });
    if (!input.reason?.trim()) fail(400, 'A policy-change reason is required');
    const record = { id: `CPO-${randomUUID()}`, schoolId: user.school_id, ...input, actorId: user.user_id, createdAt: new Date().toISOString(), effectiveFrom: input.effectiveFrom || new Date().toISOString().slice(0,10), effectiveUntil: input.effectiveUntil || null };
    identityRepository.saveOverride(record);
    identityRepository.audit(user.school_id, user.user_id, 'policy.override.created', 'capability_policy_override', record.id, record.reason);
    return record;
  },
};
