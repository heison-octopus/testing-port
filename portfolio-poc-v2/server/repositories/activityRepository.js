import { sql } from './database.js';

function approvalHistory(activityId) {
  return sql.all(`SELECT a.approval_assignment_id,a.target_version_id,a.status,a.assigned_at,a.due_at,
      p.workflow_type,s.name_en step_name,s.name_zh step_name_zh,
      assignee.user_id assignee_user_id,assignee.name_en assignee_name,assignee.name_zh assignee_name_zh,
      assigner.name_en assigned_by_name,assigner.name_zh assigned_by_name_zh,
      d.outcome,d.reason decision_reason,d.decided_at,decider.name_en decided_by_name,decider.name_zh decided_by_name_zh
    FROM approval_assignments a
    JOIN approval_policy_versions p ON p.approval_policy_version_id=a.approval_policy_version_id
    JOIN approval_policy_steps s ON s.approval_policy_step_id=a.approval_policy_step_id
    LEFT JOIN users assignee ON assignee.user_id=a.assignee_user_id
    LEFT JOIN users assigner ON assigner.user_id=a.assigned_by_user_id
    LEFT JOIN approval_decisions d ON d.approval_assignment_id=a.approval_assignment_id
    LEFT JOIN users decider ON decider.user_id=d.decided_by_user_id
    WHERE a.target_id=? AND p.workflow_type IN ('activity','activity_publication')
    ORDER BY a.assigned_at DESC`, activityId);
}

export const activityRepository = {
  all(schoolId) {
    return sql.all(`SELECT a.*,lr.title_en latest_title,lr.title_zh latest_title_zh,lr.description_en latest_description,lr.approval_status latest_approval_status,lr.publication_status latest_publication_status,
        cr.title_en approved_title,cr.description_en approved_description,cr.publication_status approved_publication_status
      FROM activities a
      LEFT JOIN activity_revisions lr ON lr.activity_revision_id=a.latest_revision_id
      LEFT JOIN activity_revisions cr ON cr.activity_revision_id=a.current_approved_revision_id
      WHERE a.school_id=? ORDER BY COALESCE(lr.start_at,a.created_at) DESC`, schoolId);
  },
  activity(activityId) {
    const activity = sql.get(`SELECT a.*,creator.name_en created_by_name,creator.name_zh created_by_name_zh,p.name_en period_name,p.name_zh period_name_zh
      FROM activities a LEFT JOIN users creator ON creator.user_id=a.created_by_user_id LEFT JOIN academic_periods p ON p.period_id=a.resolved_period_id
      WHERE a.activity_id=?`, activityId);
    if (!activity) return null;
    const revisions = sql.all(`SELECT r.*,s.name_en subject_name,s.name_zh subject_name_zh,d.name_en department_name,d.name_zh department_name_zh,
        u.name_en owner_name,u.name_zh owner_name_zh,publisher.name_en publisher_name,publisher.name_zh publisher_name_zh
      FROM activity_revisions r
      LEFT JOIN subjects s ON s.subject_id=r.subject_id
      LEFT JOIN departments d ON d.department_id=r.department_id
      LEFT JOIN users u ON u.user_id=r.owner_user_id
      LEFT JOIN users publisher ON publisher.user_id=r.requested_publisher_user_id
      WHERE r.activity_id=? ORDER BY r.revision_number DESC`, activityId);
    const latestRevisionId = activity.latest_revision_id;
    return {
      ...activity,
      revisions,
      people: sql.all(`SELECT p.*,u.name_en,u.name_zh,u.student_number,u.staff_number FROM activity_people p JOIN users u ON u.user_id=p.user_id WHERE p.activity_id=? AND p.status='active' ORDER BY p.person_type,p.relationship_type,u.name_en`, activityId),
      vaskItems: sql.all(`SELECT av.*,axis.axis_code,axis.name_en,axis.name_zh FROM activity_vask_items av JOIN rubric_axes axis ON axis.axis_id=av.vask_item_id WHERE av.activity_revision_id=? ORDER BY axis.display_order`, latestRevisionId),
      riskFlags: sql.all(`SELECT flag_code FROM activity_revision_risk_flags WHERE activity_revision_id=? ORDER BY flag_code`, latestRevisionId).map(item => item.flag_code),
      changeRequests: sql.all(`SELECT c.*,u.name_en requester_name,u.name_zh requester_name_zh,resolver.name_en resolver_name,resolver.name_zh resolver_name_zh FROM activity_change_requests c JOIN users u ON u.user_id=c.requested_by_user_id LEFT JOIN users resolver ON resolver.user_id=c.resolved_by_user_id WHERE c.activity_id=? ORDER BY c.requested_at DESC`, activityId),
      approvalHistory: approvalHistory(activityId),
      lifecycleEvents: sql.all(`SELECT event.*,actor.name_en actor_name,actor.name_zh actor_name_zh FROM activity_lifecycle_events event JOIN users actor ON actor.user_id=event.actor_user_id WHERE event.activity_id=? ORDER BY event.occurred_at DESC`, activityId),
      dependencyImpacts: sql.all(`SELECT * FROM activity_dependency_impacts WHERE activity_id=? ORDER BY triggered_at DESC`, activityId),
    };
  },
  person(activityId, userId) { return sql.get(`SELECT * FROM activity_people WHERE activity_id=? AND user_id=? AND status='active' ORDER BY assigned_at DESC LIMIT 1`, activityId, userId); },
  approvalTargetForUser(activityId, userId) { return sql.get(`SELECT 1 FROM approval_assignments WHERE target_id=? AND assignee_user_id=?`, activityId, userId); },
  periods(schoolId) { return sql.all(`SELECT * FROM academic_periods WHERE school_id=? AND status IN ('open','planned') ORDER BY start_date`, schoolId); },
  resolvePeriod(schoolId, startDate, endDate) {
    return sql.all(`SELECT * FROM academic_periods WHERE school_id=? AND status IN ('open','planned') AND start_date<=? AND end_date>=? ORDER BY resolution_priority DESC,sequence`, schoolId, startDate, endDate);
  },
  formVersion(formVersionId) { return sql.get('SELECT * FROM form_versions WHERE form_version_id=?', formVersionId); },
  revisionVask(revisionId) { return sql.all(`SELECT av.*,axis.axis_code,axis.name_en,axis.name_zh FROM activity_vask_items av JOIN rubric_axes axis ON axis.axis_id=av.vask_item_id WHERE av.activity_revision_id=? ORDER BY axis.display_order`, revisionId); },
  revisionRiskFlags(revisionId) { return sql.all(`SELECT flag_code FROM activity_revision_risk_flags WHERE activity_revision_id=? ORDER BY flag_code`, revisionId).map(item => item.flag_code); },
  referenceData(schoolId) {
    const classMemberships = sql.all(`SELECT m.class_id,u.user_id FROM student_class_memberships m JOIN users u ON u.user_id=m.student_user_id WHERE m.school_id=? AND m.status='active' AND u.status='active' ORDER BY m.class_id,u.name_en`, schoolId);
    const studentClasses = [...new Set(classMemberships.map(item => item.class_id))].map(classId => ({ class_id: classId, name_en: classId.replace(/-2026-27$/, ' class'), name_zh: classId.replace('S1A', '中一甲班').replace('S1B', '中一乙班').replace(/-2026-27$/, ''), student_ids: classMemberships.filter(item => item.class_id === classId).map(item => item.user_id) }));
    const teacherGroups = sql.all(`SELECT * FROM staff_groups WHERE school_id=? AND status='active' ORDER BY name_en`, schoolId).map(group => ({
      ...group,
      member_ids: sql.all(`SELECT m.user_id FROM staff_group_memberships m JOIN users u ON u.user_id=m.user_id WHERE m.staff_group_id=? AND m.status='active' AND u.status='active' ORDER BY u.name_en`, group.staff_group_id).map(item => item.user_id),
    }));
    return {
      periods: this.periods(schoolId),
      subjects: sql.all(`SELECT * FROM subjects WHERE school_id=? AND status='active' ORDER BY name_en`, schoolId),
      departments: sql.all(`SELECT * FROM departments WHERE school_id=? AND status='active' ORDER BY name_en`, schoolId),
      forms: sql.all(`SELECT * FROM form_versions WHERE review_status='approved' AND publication_status='published' ORDER BY is_system_default DESC,name_en`),
      activeLabelling: sql.get(`SELECT rubric_catalogue_id,code,name_en,name_zh,version FROM rubric_catalogues WHERE code='VASK' AND labelling_capable=1 AND status='active' ORDER BY version DESC LIMIT 1`) || null,
      vaskItems: sql.all(`SELECT axis.* FROM rubric_axes axis JOIN rubric_catalogues catalogue ON catalogue.rubric_catalogue_id=axis.rubric_catalogue_id WHERE catalogue.code='VASK' AND axis.status='active' ORDER BY axis.display_order`),
      students: sql.all(`SELECT user_id,name_en,name_zh,student_number FROM users WHERE school_id=? AND user_type='student' AND status='active' ORDER BY name_en`, schoolId),
      studentClasses,
      teacherGroups,
      questionBank: sql.all(`SELECT (item.form_version_id || ':' || item.item_key) bank_item_id,item.form_version_id,item.item_key,item.prompt_en,item.prompt_zh,item.ability_code,item.ability_name_en,item.ability_name_zh,item.respondent_role_code,item.required
        FROM form_items item JOIN form_versions form ON form.form_version_id=item.form_version_id
        WHERE form.review_status='approved' AND form.publication_status='published' AND item.item_type NOT IN ('template_reference','label_block')
        ORDER BY form.is_system_default DESC,item.item_order LIMIT 40`),
      groups: [
        { group_id: 'S1A-2026-27', name_en: 'S1A class', name_zh: '中一甲班' },
        { group_id: 'GRP-STUDENT-DEV', name_en: 'Student development programme', name_zh: '學生發展計劃' },
      ],
    };
  },
  activeStudents(schoolId, studentIds) {
    if (!studentIds.length) return [];
    return sql.all(`SELECT user_id FROM users WHERE school_id=? AND user_type='student' AND status='active' AND user_id IN (${studentIds.map(() => '?').join(',')})`, schoolId, ...studentIds);
  },
  activeStaffGroupMembers(schoolId, groupIds) {
    if (!groupIds.length) return [];
    return sql.all(`SELECT DISTINCT u.user_id,m.staff_group_id FROM staff_group_memberships m JOIN staff_groups g ON g.staff_group_id=m.staff_group_id JOIN users u ON u.user_id=m.user_id
      WHERE g.school_id=? AND g.status='active' AND m.status='active' AND u.status='active' AND m.staff_group_id IN (${groupIds.map(() => '?').join(',')})`, schoolId, ...groupIds);
  },
  create({ activity, revision, owner, participants, supportingStaff, vaskItemIds, riskFlags, formDraft }) {
    sql.transaction(() => {
      if (formDraft) {
        sql.run(`INSERT INTO form_versions(form_template_id,form_version_id,name_en,name_zh,version_number,supersedes_form_version_id,review_status,publication_status,visibility_scope,is_system_default,respondent_roles,notes)
          VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`, formDraft.templateId, formDraft.id, formDraft.nameEn, formDraft.nameZh, formDraft.version, formDraft.supersedesId, 'draft', 'unpublished', 'private_draft', 0, 'student', formDraft.notes);
        for (const [index, question] of formDraft.questions.entries()) sql.run(`INSERT INTO form_items(form_version_id,item_order,section_code,item_key,item_type,question_id,respondent_role_code,required,prompt_zh,prompt_en,answer_scale,ability_code,ability_name_en,ability_name_zh,proof_intent)
          VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, formDraft.id, index + 1, 'student_reflection', question.itemKey, 'free_text', question.questionId || null, 'ROLE-STUDENT', question.required ? 1 : 0, question.promptZh, question.promptEn, 'text', question.abilityCode || null, question.abilityNameEn || null, question.abilityNameZh || null, 'Teacher-curated question; accepted response becomes proof and requires later rubric-time interpretation');
      }
      sql.run(`INSERT INTO activities(activity_id,school_id,group_id,created_by_user_id,latest_revision_id,current_approved_revision_id,operational_status,resolved_period_id,period_resolution_status,period_resolved_at,created_at,updated_at)
        VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`, activity.id, activity.schoolId, activity.groupId, activity.createdBy, revision.id, null, 'draft', activity.periodId, 'resolved', activity.createdAt, activity.createdAt, activity.createdAt);
      sql.run(`INSERT INTO activity_revisions(activity_revision_id,activity_id,revision_number,title_en,title_zh,description_en,description_zh,activity_type,subject_id,department_id,start_at,end_at,owner_user_id,requested_form_version_id,media_capture_expected,location,approval_status,publication_status,material_change_reason,supersedes_revision_id,created_by_user_id,created_at,requested_publisher_user_id)
        VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, revision.id, activity.id, 1, revision.titleEn, revision.titleZh || null, revision.descriptionEn, revision.descriptionZh || null, revision.activityType, revision.subjectId || null, revision.departmentId || null, revision.startAt, revision.endAt, revision.ownerId, revision.formVersionId || null, revision.mediaExpected ?? 0, revision.location || null, 'draft', 'unpublished', null, null, revision.ownerId, activity.createdAt, revision.publisherId || null);
      sql.run(`INSERT INTO activity_people(activity_person_id,activity_id,user_id,person_type,relationship_type,role_assignment_id,planned_attendance_status,can_edit,can_view_raw_media,can_submit_response,effective_from,assigned_by_user_id,assigned_at)
        VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)`, owner.id, activity.id, owner.userId, 'staff', 'owner', owner.roleAssignmentId, 'assigned', 1, 1, 1, activity.createdAt.slice(0,10), owner.userId, activity.createdAt);
      for (const participant of participants) sql.run(`INSERT INTO activity_people(activity_person_id,activity_id,user_id,person_type,relationship_type,planned_attendance_status,attendance_approval_status,can_edit,can_view_raw_media,can_submit_response,effective_from,assigned_by_user_id,assigned_at)
        VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)`, participant.id, activity.id, participant.userId, 'student', 'participant', 'assigned', 'pending', 0, 0, 1, activity.createdAt.slice(0,10), owner.userId, activity.createdAt);
      for (const staff of supportingStaff) sql.run(`INSERT INTO activity_people(activity_person_id,activity_id,user_id,person_type,relationship_type,group_code,planned_attendance_status,can_edit,can_view_raw_media,can_submit_response,effective_from,assigned_by_user_id,assigned_at)
        VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)`, staff.id, activity.id, staff.userId, 'staff', 'supporting_teacher', staff.groupId, 'assigned', 0, 1, 1, activity.createdAt.slice(0,10), owner.userId, activity.createdAt);
      for (const vaskItemId of vaskItemIds) sql.run(`INSERT INTO activity_vask_items VALUES(?,?,?,?,?,?,?,?,?)`, revision.id, activity.id, vaskItemId, '2026', 'teacher_selected', 'Activity intention selected at creation', 'pending_review', owner.userId, activity.createdAt);
      for (const flag of riskFlags) sql.run(`INSERT INTO activity_revision_risk_flags VALUES(?,?)`, revision.id, flag);
    });
  },
  createRevision({ revision, updatedAt }) {
    sql.transaction(() => {
      sql.run(`INSERT INTO activity_revisions(activity_revision_id,activity_id,revision_number,title_en,title_zh,description_en,description_zh,activity_type,subject_id,department_id,start_at,end_at,owner_user_id,requested_form_version_id,media_capture_expected,location,approval_status,publication_status,material_change_reason,supersedes_revision_id,created_by_user_id,created_at,requested_publisher_user_id)
        VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, revision.id, revision.activityId, revision.number, revision.titleEn, revision.titleZh, revision.descriptionEn, revision.descriptionZh, revision.activityType, revision.subjectId, revision.departmentId, revision.startAt, revision.endAt, revision.ownerId, revision.formVersionId, revision.mediaExpected, revision.location, 'draft', 'unpublished', revision.reason, revision.supersedesId, revision.createdBy, updatedAt, revision.publisherId || null);
      sql.run(`INSERT INTO activity_vask_items SELECT ?,activity_id,vask_item_id,vask_item_version,source,rationale,'pending_review',?,? FROM activity_vask_items WHERE activity_revision_id=?`, revision.id, revision.createdBy, updatedAt, revision.supersedesId);
      sql.run(`INSERT INTO activity_revision_risk_flags SELECT ?,flag_code FROM activity_revision_risk_flags WHERE activity_revision_id=?`, revision.id, revision.supersedesId);
      sql.run('UPDATE activities SET latest_revision_id=?,operational_status=?,updated_at=? WHERE activity_id=?', revision.id, 'draft', updatedAt, revision.activityId);
    });
  },
  createChangeRequest(record) {
    sql.run(`INSERT INTO activity_change_requests(activity_change_request_id,school_id,activity_id,base_revision_id,requested_by_user_id,target_owner_user_id,field_key,current_value,proposed_value,reason,status,requested_at)
      VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`, record.id, record.schoolId, record.activityId, record.baseRevisionId, record.requestedBy, record.ownerId, record.fieldKey, record.currentValue, record.proposedValue, record.reason, 'open', record.createdAt);
  },
  changeRequest(requestId) { return sql.get('SELECT * FROM activity_change_requests WHERE activity_change_request_id=?', requestId); },
  resolveChangeRequest(requestId, status, actorId, note, resultingRevisionId, resolvedAt) {
    sql.run(`UPDATE activity_change_requests SET status=?,resolved_by_user_id=?,resolution_note=?,resulting_revision_id=?,resolved_at=? WHERE activity_change_request_id=? AND status='open'`, status, actorId, note, resultingRevisionId || null, resolvedAt, requestId);
  },
  submitRevision(revisionId, publisherId, submittedAt) {
    sql.run(`UPDATE activity_revisions SET approval_status='pending_review',submitted_at=?,requested_publisher_user_id=? WHERE activity_revision_id=?`, submittedAt, publisherId, revisionId);
  },
  withdrawRevision(revisionId, withdrawnAt) {
    sql.transaction(() => {
      sql.run(`UPDATE activity_revisions SET approval_status='withdrawn' WHERE activity_revision_id=? AND approval_status='pending_review'`, revisionId);
      sql.run(`UPDATE approval_assignments SET status='withdrawn' WHERE target_version_id=? AND status IN ('assigned','in_review')`, revisionId);
      const revision = sql.get('SELECT activity_id FROM activity_revisions WHERE activity_revision_id=?', revisionId);
      if (revision) sql.run(`UPDATE activities SET operational_status='draft',updated_at=? WHERE activity_id=?`, withdrawnAt, revision.activity_id);
    });
  },
  applyDecision(revisionId, outcome, actorId, decidedAt) {
    const status = outcome === 'approved' ? 'approved' : outcome;
    sql.run('UPDATE activity_revisions SET approval_status=?,approved_by_user_id=?,approved_at=? WHERE activity_revision_id=?', status, outcome === 'approved' ? actorId : null, outcome === 'approved' ? decidedAt : null, revisionId);
    const revision = sql.get('SELECT activity_id FROM activity_revisions WHERE activity_revision_id=?', revisionId);
    if (!revision) return;
    if (outcome === 'approved') {
      sql.run(`UPDATE activity_vask_items SET approval_state='approved' WHERE activity_revision_id=?`, revisionId);
      sql.run('UPDATE activities SET current_approved_revision_id=?,operational_status=?,updated_at=? WHERE activity_id=?', revisionId, 'approved', decidedAt, revision.activity_id);
    } else sql.run(`UPDATE activities SET operational_status='draft',updated_at=? WHERE activity_id=?`, decidedAt, revision.activity_id);
  },
  publishDecision(revisionId, actorId, publishedAt) {
    const revision = sql.get('SELECT activity_id FROM activity_revisions WHERE activity_revision_id=?', revisionId);
    if (!revision) return;
    sql.transaction(() => {
      sql.run(`UPDATE activity_revisions SET publication_status='published' WHERE activity_revision_id=? AND approval_status='approved'`, revisionId);
      sql.run(`UPDATE activities SET operational_status='scheduled',updated_at=? WHERE activity_id=?`, publishedAt, revision.activity_id);
    });
  },
};
