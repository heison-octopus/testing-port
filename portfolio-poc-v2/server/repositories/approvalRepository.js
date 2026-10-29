import { sql } from './database.js';

export const approvalRepository = {
  policy(workflowType, schoolId) { return sql.get(`SELECT * FROM approval_policy_versions WHERE workflow_type=? AND school_id=? AND status='active' ORDER BY policy_version DESC LIMIT 1`, workflowType, schoolId); },
  step(policyId, number = 1) { return sql.get('SELECT * FROM approval_policy_steps WHERE approval_policy_version_id=? AND step_number=? AND status=?', policyId, number, 'active'); },
  assignment(assignmentId) {
    return sql.get(`SELECT a.*,p.workflow_type,p.allow_self_assignment,p.allow_self_approval,p.publication_separate,s.step_number,s.required_capability_id,c.capability_key,s.reason_required
      FROM approval_assignments a JOIN approval_policy_versions p ON p.approval_policy_version_id=a.approval_policy_version_id
      JOIN approval_policy_steps s ON s.approval_policy_step_id=a.approval_policy_step_id JOIN capability_definitions c ON c.capability_id=s.required_capability_id WHERE a.approval_assignment_id=?`, assignmentId);
  },
  assignments(schoolId) {
    return sql.all(`SELECT a.*,p.workflow_type,s.step_number,s.name_en step_name,s.name_zh step_name_zh,c.capability_key,u.name_en assignee_name,u.name_zh assignee_name_zh,
        assigner.name_en assigned_by_name,assigner.name_zh assigned_by_name_zh,
        ar.title_en target_title,ar.title_zh target_title_zh,ar.revision_number target_revision_number,ar.owner_user_id target_owner_user_id,
        owner.name_en target_owner_name,owner.name_zh target_owner_name_zh,
        pv.student_user_id target_student_user_id,student.name_en target_student_name,student.name_zh target_student_name_zh,pv.version_number target_portfolio_version_number,
        d.outcome,d.reason decision_reason,d.decided_at,decider.name_en decided_by_name,decider.name_zh decided_by_name_zh
      FROM approval_assignments a JOIN approval_policy_versions p ON p.approval_policy_version_id=a.approval_policy_version_id
      JOIN approval_policy_steps s ON s.approval_policy_step_id=a.approval_policy_step_id JOIN capability_definitions c ON c.capability_id=s.required_capability_id
      LEFT JOIN users u ON u.user_id=a.assignee_user_id
      LEFT JOIN users assigner ON assigner.user_id=a.assigned_by_user_id
      LEFT JOIN activity_revisions ar ON ar.activity_revision_id=a.target_version_id AND p.workflow_type IN ('activity','activity_publication')
      LEFT JOIN users owner ON owner.user_id=ar.owner_user_id
      LEFT JOIN portfolio_working_versions pv ON pv.portfolio_working_version_id=a.target_version_id AND p.workflow_type IN ('portfolio','portfolio_publication')
      LEFT JOIN users student ON student.user_id=pv.student_user_id
      LEFT JOIN approval_decisions d ON d.approval_assignment_id=a.approval_assignment_id
      LEFT JOIN users decider ON decider.user_id=d.decided_by_user_id
      WHERE a.school_id=? ORDER BY CASE a.status WHEN 'assigned' THEN 0 WHEN 'in_review' THEN 1 ELSE 2 END,a.due_at DESC`, schoolId);
  },
  escalations(schoolId) { return sql.all(`SELECT e.*,u.name_en owner_name,u.name_zh owner_name_zh FROM approval_escalations e LEFT JOIN users u ON u.user_id=e.owned_by_user_id WHERE e.school_id=? ORDER BY CASE e.status WHEN 'open' THEN 0 ELSE 1 END,e.triggered_at DESC`, schoolId); },
  createAssignment(record) {
    sql.run(`INSERT INTO approval_assignments(approval_assignment_id,school_id,approval_policy_version_id,approval_policy_step_id,target_type,target_id,target_version_id,assignee_user_id,assignee_role_assignment_id,assigned_by_user_id,status,assigned_at,due_at)
      VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)`, record.id, record.schoolId, record.policyId, record.stepId, record.targetType, record.targetId, record.targetVersionId, record.assigneeId, record.roleAssignmentId, record.assignedBy, 'assigned', record.assignedAt, record.dueAt);
  },
  activeForTarget(targetVersionId, workflowType = null) {
    const params = [targetVersionId];
    const workflowClause = workflowType ? ' AND p.workflow_type=?' : '';
    if (workflowType) params.push(workflowType);
    return sql.get(`SELECT a.* FROM approval_assignments a JOIN approval_policy_versions p ON p.approval_policy_version_id=a.approval_policy_version_id WHERE a.target_version_id=? AND a.status IN ('assigned','in_review')${workflowClause} ORDER BY a.assigned_at DESC LIMIT 1`, ...params);
  },
  decide(record) {
    sql.transaction(() => {
      sql.run(`INSERT INTO approval_decisions(approval_decision_id,approval_assignment_id,school_id,step_number,outcome,reason,decided_by_user_id,used_capability_id,used_scope_type,used_scope_id,decided_at)
        VALUES(?,?,?,?,?,?,?,?,?,?,?)`, record.id, record.assignmentId, record.schoolId, record.stepNumber, record.outcome, record.reason, record.actorId, record.capabilityId, record.scopeType, record.scopeId, record.decidedAt);
      sql.run('UPDATE approval_assignments SET status=?,accepted_at=COALESCE(accepted_at,?) WHERE approval_assignment_id=?', record.outcome, record.decidedAt, record.assignmentId);
    });
  },
};
