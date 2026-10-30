import { randomUUID } from 'node:crypto';
import { identityRepository } from '../repositories/identityRepository.js';
import { capabilityDecision, fail, requireCapability, sessionProfile } from './access.js';

function pageNumber(value, fallback, maximum = Number.MAX_SAFE_INTEGER) {
  const parsed = Number.parseInt(String(value || ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, maximum) : fallback;
}

function staffFilters(filters) {
  const page = pageNumber(filters.page, 1), limit = pageNumber(filters.limit, 20, 100);
  return { ...filters, page, limit, offset: (page - 1) * limit, status: filters.status || 'active', approvalEligible: filters.approvalEligible === 'true' };
}

function staffItems(rows) {
  return rows.map(row => identityRepository.staffProfile(row)).map(item => ({
    id: item.user_id,
    name: item.name_en,
    nameZh: item.name_zh,
    staffNumber: item.staff_number,
    status: item.status,
    positions: item.positions,
    roles: item.roles,
    groups: item.groups,
    capabilities: [...new Map(item.capabilities.map(capability => [capability.capability_key, capability])).values()],
    explicitDenies: item.overrides.filter(override => override.effect === 'deny'),
  }));
}

function staffResult(user, filters) {
  const normalized = staffFilters(filters);
  const result = identityRepository.searchStaff(user.school_id, normalized);
  const items = staffItems(result.rows);
  return { items, page: normalized.page, pageSize: normalized.limit, total: result.total, totalPages: Math.ceil(result.total / normalized.limit) };
}

function directoryResource(user, filters) {
  const resource = {
    school_id: user.school_id,
    subject_id: filters.subjectId,
    department_id: filters.departmentId,
    group_id: filters.groupId,
    class_id: filters.classId,
    year_id: filters.yearId,
    grade_id: filters.gradeId,
    programme_id: filters.programmeId,
  };
  if (filters.scopeType && filters.scopeId) resource[`${filters.scopeType}_id`] = filters.scopeId;
  return resource;
}

export const identityService = {
  demoUsers: () => identityRepository.demoUsers(),
  session(user) { return sessionProfile(user); },
  referenceData(user) {
    if (!sessionProfile(user).canSearchStaff) fail(403, 'Staff directory access is not assigned');
    return identityRepository.referenceData(user.school_id);
  },
  directory(user, filters) {
    if (!sessionProfile(user).canSearchStaff) fail(403, 'Staff directory access is not assigned');
    const normalized = { ...filters, status: filters.status || 'active', approvalEligible: filters.approvalEligible === 'true' };
    return staffItems(identityRepository.searchStaff(user.school_id, normalized).rows);
  },
  teacherDirectory(user, filters) {
    // Activity authors need a scoped assignment picker even when their role does
    // not grant access to the standalone staff-administration page.
    const target = directoryResource(user, filters);
    const scoped = ['staff.directory.search','activity.create','activity.edit','form.author'].some(key => capabilityDecision(user, key, target).allowed);
    if (!sessionProfile(user).canSearchStaff && !scoped) fail(403, 'Teacher-directory access is not assigned for this scope');
    return staffResult(user, filters);
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
