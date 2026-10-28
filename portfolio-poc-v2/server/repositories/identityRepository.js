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
    return sql.all(`SELECT ura.*,r.role_code,r.name_en,r.name_zh,r.role_category
      FROM user_role_assignments ura JOIN role_definitions r ON r.role_id=ura.role_id
      WHERE ura.user_id=? AND ura.status='active' AND r.status='active' ORDER BY r.role_category,r.name_en`, userId);
  },
  roleCapabilityGrants(userId, capabilityKey = null) {
    const params = [userId];
    const capabilityClause = capabilityKey ? ' AND c.capability_key=?' : '';
    if (capabilityKey) params.push(capabilityKey);
    return sql.all(`SELECT c.capability_id,c.capability_key,c.name_en,c.name_zh,c.resource_type,rc.effect,rc.condition_key,
        ura.user_role_assignment_id,ura.role_id,ura.scope_type,ura.scope_id
      FROM user_role_assignments ura
      JOIN role_capabilities rc ON rc.role_id=ura.role_id AND rc.status='active'
      JOIN capability_definitions c ON c.capability_id=rc.capability_id AND c.status='active'
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
      roles: sql.all(`SELECT * FROM role_definitions WHERE status='active' ORDER BY role_category,name_en`),
      capabilities: sql.all(`SELECT * FROM capability_definitions WHERE status='active' ORDER BY resource_type,name_en`),
      departments: sql.all(`SELECT * FROM departments WHERE school_id=? AND status='active' ORDER BY name_en`, schoolId),
      subjects: sql.all(`SELECT * FROM subjects WHERE school_id=? AND status='active' ORDER BY name_en`, schoolId),
      groups: sql.all(`SELECT * FROM staff_groups WHERE school_id=? AND status='active' ORDER BY name_en`, schoolId),
    };
  },
  staffDirectory(schoolId) {
    const users = sql.all(`SELECT * FROM users WHERE school_id=? AND user_type='staff' AND status='active' ORDER BY name_en`, schoolId);
    return users.map(user => ({
      ...user,
      positions: this.positions(user.user_id),
      roles: this.roles(user.user_id),
      capabilities: this.roleCapabilityGrants(user.user_id),
      groups: sql.all(`SELECT g.staff_group_id,g.name_en,g.name_zh,m.membership_role FROM staff_group_memberships m JOIN staff_groups g ON g.staff_group_id=m.staff_group_id WHERE m.user_id=? AND m.status='active'`, user.user_id),
      overrides: this.overridesForUser(user.user_id),
    }));
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
