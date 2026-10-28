import { sql } from './database.js';

export const activityRepository = {
  all(schoolId) {
    return sql.all(`SELECT a.*,lr.title_en latest_title,lr.description_en latest_description,lr.approval_status latest_approval_status,lr.publication_status latest_publication_status,
        cr.title_en approved_title,cr.description_en approved_description,cr.publication_status approved_publication_status
      FROM activities a
      LEFT JOIN activity_revisions lr ON lr.activity_revision_id=a.latest_revision_id
      LEFT JOIN activity_revisions cr ON cr.activity_revision_id=a.current_approved_revision_id
      WHERE a.school_id=? ORDER BY COALESCE(lr.start_at,a.created_at) DESC`, schoolId);
  },
  activity(activityId) {
    const activity = sql.get('SELECT * FROM activities WHERE activity_id=?', activityId);
    if (!activity) return null;
    return {
      ...activity,
      revisions: sql.all(`SELECT r.*,s.name_en subject_name,d.name_en department_name,u.name_en owner_name FROM activity_revisions r LEFT JOIN subjects s ON s.subject_id=r.subject_id LEFT JOIN departments d ON d.department_id=r.department_id LEFT JOIN users u ON u.user_id=r.owner_user_id WHERE r.activity_id=? ORDER BY r.revision_number DESC`, activityId),
      people: sql.all(`SELECT p.*,u.name_en,u.name_zh FROM activity_people p JOIN users u ON u.user_id=p.user_id WHERE p.activity_id=? ORDER BY p.person_type,p.relationship_type`, activityId),
      changeRequests: sql.all(`SELECT c.*,u.name_en requester_name FROM activity_change_requests c JOIN users u ON u.user_id=c.requested_by_user_id WHERE c.activity_id=? ORDER BY c.requested_at DESC`, activityId),
    };
  },
  person(activityId, userId) { return sql.get('SELECT * FROM activity_people WHERE activity_id=? AND user_id=?', activityId, userId); },
  approvalTargetForUser(activityId, userId) { return sql.get(`SELECT 1 FROM approval_assignments WHERE target_type='activity' AND target_id=? AND assignee_user_id=?`, activityId, userId); },
  create({ activity, revision, person }) {
    sql.transaction(() => {
      sql.run(`INSERT INTO activities(activity_id,school_id,group_id,created_by_user_id,latest_revision_id,current_approved_revision_id,operational_status,resolved_period_id,period_resolution_status,period_resolved_at,created_at,updated_at)
        VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`, activity.id, activity.schoolId, activity.groupId, activity.createdBy, revision.id, null, 'planned', activity.periodId, 'resolved', activity.createdAt, activity.createdAt, activity.createdAt);
      sql.run(`INSERT INTO activity_revisions(activity_revision_id,activity_id,revision_number,title_en,title_zh,description_en,description_zh,activity_type,subject_id,department_id,start_at,end_at,owner_user_id,requested_form_version_id,media_capture_expected,location,approval_status,publication_status,material_change_reason,supersedes_revision_id,created_by_user_id,created_at)
        VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, revision.id, activity.id, 1, revision.titleEn, revision.titleZh || null, revision.descriptionEn, revision.descriptionZh || null, revision.activityType, revision.subjectId || null, revision.departmentId || null, revision.startAt || null, revision.endAt || null, revision.ownerId, revision.formVersionId || null, revision.mediaExpected ?? 0, revision.location || null, 'draft', 'unpublished', null, null, revision.ownerId, activity.createdAt);
      sql.run(`INSERT INTO activity_people(activity_person_id,activity_id,user_id,person_type,relationship_type,role_assignment_id,planned_attendance_status,can_edit,can_view_raw_media,can_submit_response,effective_from,assigned_by_user_id,assigned_at)
        VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)`, person.id, activity.id, person.userId, 'staff', 'owner', person.roleAssignmentId, 'assigned', 1, 1, 1, activity.createdAt.slice(0,10), person.userId, activity.createdAt);
    });
  },
  createRevision({ revision, updatedAt }) {
    sql.transaction(() => {
      sql.run(`INSERT INTO activity_revisions(activity_revision_id,activity_id,revision_number,title_en,title_zh,description_en,description_zh,activity_type,subject_id,department_id,start_at,end_at,owner_user_id,requested_form_version_id,media_capture_expected,location,approval_status,publication_status,material_change_reason,supersedes_revision_id,created_by_user_id,created_at)
        VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, revision.id, revision.activityId, revision.number, revision.titleEn, revision.titleZh, revision.descriptionEn, revision.descriptionZh, revision.activityType, revision.subjectId, revision.departmentId, revision.startAt, revision.endAt, revision.ownerId, revision.formVersionId, revision.mediaExpected, revision.location, 'draft', 'unpublished', revision.reason, revision.supersedesId, revision.createdBy, updatedAt);
      sql.run('UPDATE activities SET latest_revision_id=?,updated_at=? WHERE activity_id=?', revision.id, updatedAt, revision.activityId);
    });
  },
  createChangeRequest(record) {
    sql.run(`INSERT INTO activity_change_requests(activity_change_request_id,school_id,activity_id,base_revision_id,requested_by_user_id,target_owner_user_id,field_key,current_value,proposed_value,reason,status,requested_at)
      VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`, record.id, record.schoolId, record.activityId, record.baseRevisionId, record.requestedBy, record.ownerId, record.fieldKey, record.currentValue, record.proposedValue, record.reason, 'open', record.createdAt);
  },
  submitRevision(revisionId, submittedAt) { sql.run(`UPDATE activity_revisions SET approval_status='pending_review',submitted_at=? WHERE activity_revision_id=?`, submittedAt, revisionId); },
  applyDecision(revisionId, outcome, actorId, decidedAt) {
    const status = outcome === 'approved' ? 'approved' : outcome;
    sql.run('UPDATE activity_revisions SET approval_status=?,approved_by_user_id=?,approved_at=? WHERE activity_revision_id=?', status, outcome === 'approved' ? actorId : null, outcome === 'approved' ? decidedAt : null, revisionId);
    if (outcome === 'approved') {
      const revision = sql.get('SELECT activity_id FROM activity_revisions WHERE activity_revision_id=?', revisionId);
      sql.run('UPDATE activities SET current_approved_revision_id=?,operational_status=?,updated_at=? WHERE activity_id=?', revisionId, 'scheduled', decidedAt, revision.activity_id);
    }
  },
};
