import { sql } from './database.js';

export const dataOperationsRepository = {
  activities(schoolId) {
    return sql.all(`SELECT activity.activity_id,revision.title_en,revision.title_zh,activity.operational_status
      FROM activities activity JOIN activity_revisions revision ON revision.activity_revision_id=activity.latest_revision_id
      WHERE activity.school_id=? ORDER BY revision.start_at DESC,activity.activity_id`, schoolId);
  },
  users(schoolId) {
    return sql.all(`SELECT external_user_id,user_type,student_number,staff_number,name_en,name_zh,email,status,
      CASE WHEN status='active' THEN 0 ELSE 1 END disabled
      FROM users WHERE school_id=? ORDER BY user_type,name_en,user_id`, schoolId);
  },
  groups(schoolId) {
    const staffGroups = sql.all(`SELECT group_code,'staff_group' group_type,name_en,name_zh,effective_from,effective_until,status,
      CASE WHEN status='active' THEN 0 ELSE 1 END disabled
      FROM staff_groups WHERE school_id=? ORDER BY group_code`, schoolId);
    const classes = sql.all(`SELECT m.class_id group_code,'class' group_type,m.class_id name_en,m.class_id name_zh,
      MIN(m.effective_from) effective_from,MAX(m.effective_until) effective_until,
      CASE WHEN SUM(CASE WHEN m.status='active' THEN 1 ELSE 0 END)>0 THEN 'active' ELSE 'disabled' END status,
      CASE WHEN SUM(CASE WHEN m.status='active' THEN 1 ELSE 0 END)>0 THEN 0 ELSE 1 END disabled
      FROM student_class_memberships m WHERE m.school_id=? GROUP BY m.class_id ORDER BY m.class_id`, schoolId);
    return [...staffGroups, ...classes];
  },
  teachers(schoolId) {
    return sql.all(`SELECT u.external_user_id,u.staff_number,u.name_en,u.name_zh,
      COALESCE((SELECT p.position_code FROM user_position_assignments a JOIN staff_position_definitions p ON p.position_id=a.position_id WHERE a.user_id=u.user_id ORDER BY a.is_primary DESC,a.assigned_at LIMIT 1),'') position_code,
      COALESCE((SELECT g.group_code FROM staff_group_memberships m JOIN staff_groups g ON g.staff_group_id=m.staff_group_id WHERE m.user_id=u.user_id ORDER BY m.assigned_at LIMIT 1),'') staff_group_code,
      COALESCE((SELECT MIN(a.effective_from) FROM user_position_assignments a WHERE a.user_id=u.user_id),'') effective_from,
      u.status,CASE WHEN u.status='active' THEN 0 ELSE 1 END disabled
      FROM users u WHERE u.school_id=? AND u.user_type='staff' ORDER BY u.name_en,u.user_id`, schoolId);
  },
  students(schoolId) {
    return sql.all(`SELECT u.external_user_id,u.student_number,u.name_en,u.name_zh,
      COALESCE((SELECT m.class_id FROM student_class_memberships m WHERE m.student_user_id=u.user_id ORDER BY m.status='active' DESC,m.effective_from DESC LIMIT 1),'') class_code,
      '' guardian_consent_status,'' media_consent_scope,u.status,CASE WHEN u.status='active' THEN 0 ELSE 1 END disabled
      FROM users u WHERE u.school_id=? AND u.user_type='student' ORDER BY u.name_en,u.user_id`, schoolId);
  },
  roster(schoolId) {
    return sql.all(`SELECT p.activity_id,COALESCE(u.student_number,u.external_user_id,u.user_id) student_identifier,u.name_en student_name,
      COALESCE(p.group_code,'') group_code,COALESCE(p.planned_attendance_status,'') planned_attendance_status,
      CASE WHEN p.status='active' THEN 0 ELSE 1 END disabled
      FROM activity_people p JOIN activities a ON a.activity_id=p.activity_id JOIN users u ON u.user_id=p.user_id
      WHERE a.school_id=? AND p.person_type='student' AND p.relationship_type='participant'
      ORDER BY p.activity_id,u.name_en,p.assigned_at`, schoolId);
  },
  labels(schoolId) {
    const asOf = process.env.POC_V2_AS_OF || '2027-01-20';
    return sql.all(`SELECT axis.axis_code label_code,axis.name_en,axis.name_zh,COALESCE(axis.notes,'') description_en,'' description_zh,
      catalogue.code catalogue_code,catalogue.version catalogue_version,axis.status,
      CASE WHEN axis.status='active' THEN 0 ELSE 1 END disabled
      FROM rubric_axes axis JOIN rubric_catalogues catalogue ON catalogue.rubric_catalogue_id=axis.rubric_catalogue_id
      JOIN school_rubric_assignments policy ON policy.rubric_catalogue_id=catalogue.rubric_catalogue_id
      WHERE policy.school_id=? AND policy.purpose='activity_labelling' AND policy.status='active' AND policy.effective_from<=? AND (policy.effective_until IS NULL OR policy.effective_until>=?) AND catalogue.labelling_capable=1 AND catalogue.status='active'
      ORDER BY catalogue.code,axis.display_order`, schoolId, asOf, asOf);
  },
  media(schoolId) {
    return sql.all(`SELECT binding.activity_id,revision.title_en,revision.title_zh,binding.base_reference media_base_path,source.source_code source_system,binding.validation_mode,binding.status,
      CASE WHEN binding.disabled_at IS NULL AND binding.status='active' THEN 0 ELSE 1 END disabled,
      COUNT(proof.proof_item_id) media_count
      FROM activity_source_bindings binding JOIN activities activity ON activity.activity_id=binding.activity_id
      JOIN source_systems source ON source.source_system_id=binding.source_system_id
      JOIN activity_revisions revision ON revision.activity_revision_id=activity.latest_revision_id
      LEFT JOIN proof_items proof ON proof.activity_id=binding.activity_id AND proof.disabled_at IS NULL
      WHERE binding.school_id=? GROUP BY binding.activity_source_binding_id ORDER BY binding.activity_id`, schoolId);
  },
  activityCount(schoolId) { return Number(sql.get('SELECT COUNT(*) count FROM activities WHERE school_id=?', schoolId)?.count || 0); },
};
