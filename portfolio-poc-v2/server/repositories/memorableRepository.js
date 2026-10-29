import { sql } from './database.js';

export const memorableRepository = {
  window(schoolId, periodId) { return sql.get('SELECT * FROM proud_moment_windows WHERE school_id=? AND period_id=?', schoolId, periodId); },
  eligibleActivities(studentId, periodId) {
    return sql.all(`SELECT a.activity_id,r.title_en,r.title_zh,r.description_en,r.description_zh,r.end_at,
        selection.selection_id,selection.selection_reason,selection.submission_status,selection.publication_status
      FROM activity_people person
      JOIN activities a ON a.activity_id=person.activity_id
      JOIN activity_revisions r ON r.activity_revision_id=a.current_approved_revision_id
      LEFT JOIN proud_moment_selections selection ON selection.student_id=person.user_id AND selection.period_id=? AND selection.source_type='activity' AND selection.source_id=a.activity_id
      WHERE person.user_id=? AND person.relationship_type='participant' AND a.resolved_period_id=?
        AND a.operational_status<>'disabled' AND r.approval_status='approved' AND r.publication_status='published'
      ORDER BY r.end_at DESC`, periodId, studentId, periodId);
  },
  selections(studentId, periodId) {
    return sql.all(`SELECT selection.*,r.title_en,r.title_zh
      FROM proud_moment_selections selection LEFT JOIN activity_revisions r ON r.activity_id=selection.source_id
        AND r.activity_revision_id=(SELECT current_approved_revision_id FROM activities WHERE activity_id=selection.source_id)
      WHERE selection.student_id=? AND selection.period_id=?
        AND NOT EXISTS(SELECT 1 FROM activities hidden WHERE hidden.activity_id=selection.source_id AND hidden.operational_status='disabled')
      ORDER BY selection.selection_id`, studentId, periodId);
  },
  selection(selectionId) { return sql.get('SELECT * FROM proud_moment_selections WHERE selection_id=?', selectionId); },
  count(studentId, periodId) { return sql.get('SELECT COUNT(*) count FROM proud_moment_selections WHERE student_id=? AND period_id=?', studentId, periodId)?.count || 0; },
  save(record) {
    const existing = sql.get(`SELECT * FROM proud_moment_selections WHERE student_id=? AND period_id=? AND source_type='activity' AND source_id=?`, record.studentId, record.periodId, record.activityId);
    if (existing) {
      sql.run(`UPDATE proud_moment_selections SET selection_reason=?,selected_label_codes=?,submission_status='draft',publication_status='unpublished' WHERE selection_id=?`, record.reason, record.labelCodes, existing.selection_id);
      return existing.selection_id;
    }
    sql.run(`INSERT INTO proud_moment_selections VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, record.id, record.studentId, record.academicYear, record.periodId, 'activity', record.activityId, null, record.reason, record.labelCodes, 'draft', 'unpublished', null, null, 0, 'Student-authored curation; no automatic rubric effect.');
    return record.id;
  },
  submit(selectionId) { sql.run(`UPDATE proud_moment_selections SET submission_status='submitted' WHERE selection_id=? AND submission_status='draft'`, selectionId); },
};
