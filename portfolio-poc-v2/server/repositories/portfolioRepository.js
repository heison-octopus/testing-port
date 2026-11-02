import { sql } from './database.js';

export const portfolioRepository = {
  students(schoolId) { return sql.all(`SELECT * FROM users WHERE school_id=? AND user_type='student' AND status='active' ORDER BY name_en`, schoolId); },
  versions(studentId, periodId = '2026-27-P1') {
    return sql.all(`SELECT v.*,creator.name_en creator_name,teacher.name_en class_teacher_name,approver.name_en approver_name,rubric.name_en rubric_name_en,rubric.name_zh rubric_name_zh,rubric.version rubric_version,rubric.selection_mode rubric_selection_mode,template.name_en template_name_en,template.name_zh template_name_zh,template_version.version_number template_version_number
      FROM portfolio_working_versions v LEFT JOIN users creator ON creator.user_id=v.created_by_user_id LEFT JOIN users teacher ON teacher.user_id=v.class_teacher_user_id LEFT JOIN users approver ON approver.user_id=v.approved_by_user_id LEFT JOIN rubric_catalogues rubric ON rubric.rubric_catalogue_id=v.rubric_catalogue_id LEFT JOIN portfolio_template_versions template_version ON template_version.portfolio_template_version_id=v.portfolio_template_version_id LEFT JOIN portfolio_templates template ON template.portfolio_template_id=template_version.portfolio_template_id
      WHERE v.student_user_id=? AND v.period_id=? ORDER BY v.version_number DESC`, studentId, periodId);
  },
  version(versionId) {
    const version = sql.get(`SELECT v.*,rubric.name_en rubric_name_en,rubric.name_zh rubric_name_zh,rubric.version rubric_version,rubric.selection_mode rubric_selection_mode,template.name_en template_name_en,template.name_zh template_name_zh,template_version.version_number template_version_number FROM portfolio_working_versions v LEFT JOIN rubric_catalogues rubric ON rubric.rubric_catalogue_id=v.rubric_catalogue_id LEFT JOIN portfolio_template_versions template_version ON template_version.portfolio_template_version_id=v.portfolio_template_version_id LEFT JOIN portfolio_templates template ON template.portfolio_template_id=template_version.portfolio_template_id WHERE v.portfolio_working_version_id=?`, versionId);
    if (!version) return null;
    return {
      ...version,
      items: sql.all('SELECT * FROM portfolio_version_items WHERE portfolio_working_version_id=? ORDER BY display_order', versionId),
      narrative: sql.get('SELECT * FROM learner_narrative_versions WHERE portfolio_working_version_id=? ORDER BY revision_number DESC LIMIT 1', versionId),
    };
  },
  official(studentId, periodId = '2026-27-P1') {
    const snapshot = sql.get(`SELECT * FROM portfolio_snapshots WHERE student_user_id=? AND period_id=? AND publication_status='published' ORDER BY version_number DESC LIMIT 1`, studentId, periodId);
    return snapshot ? { ...snapshot, version: this.version(snapshot.approved_portfolio_working_version_id) } : null;
  },
  skillSummary(studentId, periodId, rubricCatalogueId) {
    return sql.all(`SELECT axis.axis_id,axis.axis_code,axis.name_en,axis.name_zh,axis.display_order,result.published_numeric_value,result.published_level_id,result.contributing_observation_ids,result.calculation_trace,result.published_at
      FROM rubric_axes axis
      LEFT JOIN published_rubric_results result ON result.axis_id=axis.axis_id AND result.student_id=? AND result.period_id=? AND result.status='published'
      WHERE axis.rubric_catalogue_id=? AND axis.status='active' ORDER BY axis.display_order`, studentId, periodId, rubricCatalogueId);
  },
  createDraft(record) {
    sql.transaction(() => {
      sql.run('UPDATE portfolio_working_versions SET is_student_latest=0 WHERE student_user_id=? AND period_id=?', record.studentId, record.periodId);
      sql.run(`INSERT INTO portfolio_working_versions(portfolio_working_version_id,school_id,student_user_id,period_id,version_number,supersedes_version_id,status,created_by_user_id,created_at,is_student_latest,rubric_catalogue_id,portfolio_template_version_id,template_manifest_sha256)
        VALUES(?,?,?,?,?,?,?,?,?,1,?,?,?)`, record.id, record.schoolId, record.studentId, record.periodId, record.number, record.supersedesId, 'draft', record.studentId, record.createdAt, record.rubricCatalogueId, record.portfolioTemplateVersionId, record.templateManifestSha256);
      sql.run(`INSERT INTO portfolio_version_items(portfolio_version_item_id,portfolio_working_version_id,section_key,source_type,source_id,student_selected,class_teacher_decision,display_order,authorship_origin,student_text)
        VALUES(?,?,?,?,?,?,?,?,?,?)`, `${record.id}-INTRO`, record.id, 'self_introduction', 'student_text', null, 1, 'pending', 1, 'human_authored', record.selfIntroduction);
      for (const [index, selection] of record.memorableSelections.entries()) sql.run(`INSERT INTO portfolio_version_items(portfolio_version_item_id,portfolio_working_version_id,section_key,source_type,source_id,student_selected,class_teacher_decision,display_order,authorship_origin,student_text)
        VALUES(?,?,?,?,?,?,?,?,?,?)`, `${record.id}-PM-${index + 1}`, record.id, 'memorable_activity', 'proud_moment_selection', selection.selection_id, 1, 'pending', index + 2, 'human_authored', selection.selection_reason);
    });
  },
  submit(versionId, submittedAt) { sql.run(`UPDATE portfolio_working_versions SET status='student_submitted',student_submitted_at=? WHERE portfolio_working_version_id=?`, submittedAt, versionId); },
  review(record) {
    sql.transaction(() => {
      for (const decision of record.decisions) sql.run('UPDATE portfolio_version_items SET class_teacher_decision=?,decision_reason=?,decided_by_user_id=?,decided_at=? WHERE portfolio_version_item_id=? AND portfolio_working_version_id=?', decision.decision, decision.reason, record.actorId, record.reviewedAt, decision.itemId, record.versionId);
      if (record.narrativeId && record.narrativeText) sql.run(`UPDATE learner_narrative_versions SET teacher_edited_text=?,edited_by_user_id=?,edit_reason=?,approval_status='pending_review' WHERE learner_narrative_version_id=?`, record.narrativeText, record.actorId, record.narrativeReason, record.narrativeId);
      sql.run(`UPDATE portfolio_working_versions SET status='staff_review',class_teacher_user_id=?,class_teacher_reviewed_at=? WHERE portfolio_working_version_id=?`, record.actorId, record.reviewedAt, record.versionId);
    });
  },
  approve(versionId, actorId, approvedAt) { sql.run(`UPDATE portfolio_working_versions SET status='approved',approved_by_user_id=?,approved_at=? WHERE portfolio_working_version_id=?`, actorId, approvedAt, versionId); },
  publish(versionId, actorId, publishedAt) {
    const version = this.version(versionId);
    const snapshotId = `PSNAP-${version.student_user_id}-${version.period_id}-v${version.version_number}`;
    sql.transaction(() => {
      sql.run(`INSERT OR IGNORE INTO portfolio_snapshots(portfolio_snapshot_id,school_id,student_user_id,period_id,approved_portfolio_working_version_id,version_number,publication_status,approved_by_user_id,published_at,rubric_catalogue_id,portfolio_template_version_id,template_manifest_sha256) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`, snapshotId, version.school_id, version.student_user_id, version.period_id, versionId, version.version_number, 'published', actorId, publishedAt, version.rubric_catalogue_id, version.portfolio_template_version_id, version.template_manifest_sha256);
      sql.run(`UPDATE portfolio_working_versions SET status='published',published_snapshot_id=? WHERE portfolio_working_version_id=?`, snapshotId, versionId);
      if (version.narrative) sql.run(`UPDATE learner_narrative_versions SET final_approved_text=COALESCE(teacher_edited_text,generated_text),approval_status='approved',approved_by_user_id=?,approved_at=? WHERE learner_narrative_version_id=?`, actorId, publishedAt, version.narrative.learner_narrative_version_id);
    });
    return snapshotId;
  },
};
