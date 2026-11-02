import { sql } from './database.js';

export const identityRepository = {
  user(userId) { return sql.get('SELECT * FROM users WHERE user_id=? AND status=?', userId, 'active'); },
  demoUsers() { return sql.all(`SELECT user_id,user_type,name_en,name_zh,staff_number,student_number FROM users WHERE status='active' ORDER BY user_type DESC,name_en`); },
  positions(userId) {
    return sql.all(`SELECT p.position_id,p.position_code,p.name_en,p.name_zh,upa.department_id,upa.subject_id,upa.is_primary
      FROM user_position_assignments upa JOIN staff_position_definitions p ON p.position_id=upa.position_id
      WHERE upa.user_id=? AND upa.status='active' ORDER BY upa.is_primary DESC,p.sort_order`, userId);
  },
  roles(userId) {
    return sql.all(`SELECT ura.*,r.role_code,r.name_en,r.name_zh,r.role_category,rv.version_number role_version_number,rv.lifecycle_status role_version_status
      FROM user_role_assignments ura JOIN role_definitions r ON r.role_id=ura.role_id
      JOIN role_definition_versions rv ON rv.role_definition_version_id=ura.role_definition_version_id
      WHERE ura.user_id=? AND ura.status='active' AND r.status='active' AND rv.lifecycle_status='active' ORDER BY r.role_category,r.name_en`, userId);
  },
  roleCapabilityGrants(userId, capabilityKey = null) {
    const params = [userId];
    const capabilityClause = capabilityKey ? ' AND c.capability_key=?' : '';
    if (capabilityKey) params.push(capabilityKey);
    return sql.all(`SELECT c.capability_id,c.capability_key,c.name_en,c.name_zh,c.resource_type,rvc.effect,rvc.condition_key,
        ura.user_role_assignment_id,ura.role_id,ura.role_definition_version_id,rv.version_number role_version_number,ura.scope_type,ura.scope_id
      FROM user_role_assignments ura
      JOIN role_definition_versions rv ON rv.role_definition_version_id=ura.role_definition_version_id AND rv.lifecycle_status='active'
      JOIN role_version_capabilities rvc ON rvc.role_definition_version_id=rv.role_definition_version_id AND rvc.status='active'
      JOIN capability_definitions c ON c.capability_id=rvc.capability_id AND c.status='active'
      WHERE ura.user_id=? AND ura.status='active'${capabilityClause}`, ...params);
  },
  overridesForUser(userId, capabilityKey = null) {
    const params = [userId, userId];
    const capabilityClause = capabilityKey ? ' AND c.capability_key=?' : '';
    if (capabilityKey) params.push(capabilityKey);
    return sql.all(`SELECT o.*,c.capability_key,c.name_en capability_name
      FROM capability_policy_overrides o JOIN capability_definitions c ON c.capability_id=o.capability_id
      WHERE o.status='active' AND (
        (o.target_type='user' AND o.target_id=?) OR
        (o.target_type='group' AND o.target_id IN (SELECT staff_group_id FROM staff_group_memberships WHERE user_id=? AND status='active'))
      )${capabilityClause}`, ...params);
  },
  roleAssignment(userId, capabilityKey, resource) {
    return this.roleCapabilityGrants(userId, capabilityKey).find(grant => resource.scopeMatches(grant.scope_type, grant.scope_id)) || null;
  },
  referenceData(schoolId) {
    return {
      positions: sql.all(`SELECT * FROM staff_position_definitions WHERE school_id=? AND status='active' ORDER BY sort_order`, schoolId),
      roles: sql.all(`SELECT role.*,version.role_definition_version_id,version.version_number FROM role_definitions role JOIN role_definition_versions version ON version.role_id=role.role_id AND version.lifecycle_status='active' WHERE role.status='active' ORDER BY role.role_category,role.name_en`),
      capabilities: sql.all(`SELECT * FROM capability_definitions WHERE status='active' ORDER BY resource_type,name_en`),
      departments: sql.all(`SELECT * FROM departments WHERE school_id=? AND status='active' ORDER BY name_en`, schoolId),
      subjects: sql.all(`SELECT * FROM subjects WHERE school_id=? AND status='active' ORDER BY name_en`, schoolId),
      groups: sql.all(`SELECT * FROM staff_groups WHERE school_id=? AND status='active' ORDER BY name_en`, schoolId),
    };
  },
  roleTemplatePackages() {
    return sql.all(`SELECT * FROM role_definitions ORDER BY role_category,name_en`).map(role => ({
      ...role,
      versions: sql.all(`SELECT * FROM role_definition_versions WHERE role_id=? ORDER BY version_number DESC`, role.role_id).map(version => ({
        ...version,
        capabilities: sql.all(`SELECT grant.*,capability.capability_key,capability.name_en capability_name_en,capability.name_zh capability_name_zh,capability.resource_type FROM role_version_capabilities grant JOIN capability_definitions capability ON capability.capability_id=grant.capability_id WHERE grant.role_definition_version_id=? ORDER BY capability.capability_key`, version.role_definition_version_id),
      })),
    }));
  },
  searchStaff(schoolId, filters) {
    const clauses = ['u.school_id=?', `u.user_type='staff'`];
    const params = [schoolId];
    if (filters.status && filters.status !== 'all') { clauses.push('u.status=?'); params.push(filters.status); }
    if (filters.search) {
      clauses.push(`(LOWER(u.name_en) LIKE ? OR LOWER(u.name_zh) LIKE ? OR LOWER(COALESCE(u.staff_number,'')) LIKE ? OR LOWER(COALESCE(u.email,'')) LIKE ?)`);
      const term = `%${String(filters.search).toLowerCase()}%`;
      params.push(term, term, term, term);
    }
    if (filters.positionId) { clauses.push(`EXISTS(SELECT 1 FROM user_position_assignments a WHERE a.user_id=u.user_id AND a.position_id=? AND a.status='active')`); params.push(filters.positionId); }
    if (filters.roleId) { clauses.push(`EXISTS(SELECT 1 FROM user_role_assignments a WHERE a.user_id=u.user_id AND a.role_id=? AND a.status='active')`); params.push(filters.roleId); }
    if (filters.departmentId) { clauses.push(`EXISTS(SELECT 1 FROM user_position_assignments a WHERE a.user_id=u.user_id AND a.department_id=? AND a.status='active')`); params.push(filters.departmentId); }
    if (filters.subjectId) { clauses.push(`EXISTS(SELECT 1 FROM user_position_assignments a WHERE a.user_id=u.user_id AND a.subject_id=? AND a.status='active')`); params.push(filters.subjectId); }
    if (filters.groupId) { clauses.push(`EXISTS(SELECT 1 FROM staff_group_memberships a WHERE a.user_id=u.user_id AND a.staff_group_id=? AND a.status='active')`); params.push(filters.groupId); }
    for (const [filterKey, scopeType] of [['classId','class'],['yearId','year'],['gradeId','grade'],['programmeId','programme']]) {
      if (filters[filterKey]) {
        clauses.push(`EXISTS(SELECT 1 FROM user_role_assignments a WHERE a.user_id=u.user_id AND a.scope_type=? AND a.scope_id=? AND a.status='active')`);
        params.push(scopeType, filters[filterKey]);
      }
    }
    if (filters.capabilityId || filters.capabilityKey) {
      clauses.push(`EXISTS(SELECT 1 FROM user_role_assignments ura JOIN role_version_capabilities rvc ON rvc.role_definition_version_id=ura.role_definition_version_id AND rvc.status='active' JOIN capability_definitions c ON c.capability_id=rvc.capability_id AND c.status='active' WHERE ura.user_id=u.user_id AND ura.status='active' AND rvc.effect='allow' AND ${filters.capabilityId ? 'c.capability_id=?' : 'c.capability_key=?'})`);
      params.push(filters.capabilityId || filters.capabilityKey);
    }
    if (filters.approvalEligible === true) clauses.push(`EXISTS(SELECT 1 FROM user_role_assignments ura JOIN role_definitions r ON r.role_id=ura.role_id WHERE ura.user_id=u.user_id AND ura.status='active' AND r.status='active' AND r.role_category IN ('approval_function','publication_function'))`);
    if (filters.scopeType) { clauses.push(`EXISTS(SELECT 1 FROM user_role_assignments a WHERE a.user_id=u.user_id AND a.scope_type=? AND a.status='active')`); params.push(filters.scopeType); }
    if (filters.scopeId) { clauses.push(`EXISTS(SELECT 1 FROM user_role_assignments a WHERE a.user_id=u.user_id AND a.scope_id=? AND a.status='active')`); params.push(filters.scopeId); }
    const where = clauses.join(' AND ');
    const total = Number(sql.get(`SELECT COUNT(*) count FROM users u WHERE ${where}`, ...params)?.count || 0);
    const paged = Number.isFinite(filters.limit);
    const rows = sql.all(`SELECT u.* FROM users u WHERE ${where} ORDER BY LOWER(u.name_en),u.user_id${paged ? ' LIMIT ? OFFSET ?' : ''}`, ...params, ...(paged ? [filters.limit, filters.offset] : []));
    return { total, rows };
  },
  staffProfile(user) {
    return {
      ...user,
      positions: this.positions(user.user_id),
      roles: this.roles(user.user_id),
      capabilities: this.roleCapabilityGrants(user.user_id),
      groups: sql.all(`SELECT g.staff_group_id,g.group_code,g.name_en,g.name_zh,m.membership_role FROM staff_group_memberships m JOIN staff_groups g ON g.staff_group_id=m.staff_group_id WHERE m.user_id=? AND m.status='active'`, user.user_id),
      overrides: this.overridesForUser(user.user_id),
    };
  },
  staffDirectory(schoolId) {
    const users = sql.all(`SELECT * FROM users WHERE school_id=? AND user_type='staff' AND status='active' ORDER BY name_en`, schoolId);
    return users.map(user => this.staffProfile(user));
  },
  groupMembers(groupId) { return sql.all(`SELECT u.* FROM staff_group_memberships m JOIN users u ON u.user_id=m.user_id WHERE m.staff_group_id=? AND m.status='active'`, groupId); },
  classMembership(studentId, periodId) { return sql.get(`SELECT * FROM student_class_memberships WHERE student_user_id=? AND period_id=? AND status='active'`, studentId, periodId); },
  saveOverride(record) {
    sql.run(`INSERT INTO capability_policy_overrides(capability_policy_override_id,school_id,target_type,target_id,capability_id,effect,scope_type,scope_id,effective_from,effective_until,reason,configured_by_user_id,configured_at,status)
      VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, record.id, record.schoolId, record.targetType, record.targetId, record.capabilityId, record.effect, record.scopeType, record.scopeId, record.effectiveFrom, record.effectiveUntil, record.reason, record.actorId, record.createdAt, 'active');
  },
  overrides(schoolId) { return sql.all(`SELECT o.*,c.capability_key,c.name_en capability_name,c.name_zh capability_name_zh FROM capability_policy_overrides o JOIN capability_definitions c ON c.capability_id=o.capability_id WHERE o.school_id=? ORDER BY o.configured_at DESC`, schoolId); },
  audit(schoolId, actorId, action, entityType, entityId, reason = null) {
    sql.run('INSERT INTO audit_events(school_id,actor_user_id,action_code,entity_type,entity_id,reason,occurred_at) VALUES(?,?,?,?,?,?,?)', schoolId, actorId, action, entityType, entityId, reason, new Date().toISOString());
  },
};
