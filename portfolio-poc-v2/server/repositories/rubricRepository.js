import { sql } from './database.js';

const catalogueSummarySql = `SELECT c.*,
  (SELECT COUNT(*) FROM rubric_groups g WHERE g.rubric_catalogue_id=c.rubric_catalogue_id AND g.disabled=0) group_count,
  (SELECT COUNT(*) FROM rubric_axes a WHERE a.rubric_catalogue_id=c.rubric_catalogue_id AND a.status='active') skill_count,
  (SELECT COUNT(*) FROM rubric_step_definitions s WHERE s.rubric_catalogue_id=c.rubric_catalogue_id AND s.disabled=0) step_count,
  (SELECT COUNT(*) FROM portfolio_working_versions p WHERE p.rubric_catalogue_id=c.rubric_catalogue_id) portfolio_usage_count
  FROM rubric_catalogues c`;

export const rubricRepository = {
  catalogues() {
    return sql.all(`${catalogueSummarySql} WHERE c.assessment_capable=1 OR c.code='RC360' ORDER BY c.status='active' DESC,c.name_en,c.version`);
  },
  catalogue(id) { return sql.get(`${catalogueSummarySql} WHERE c.rubric_catalogue_id=?`, id); },
  activeAssessment() {
    return sql.get(`${catalogueSummarySql} WHERE c.assessment_capable=1 AND c.status='active' ORDER BY c.activated_at DESC,c.version DESC LIMIT 1`);
  },
  package(id) {
    const catalogue = this.catalogue(id);
    if (!catalogue) return null;
    return {
      catalogue,
      groups: sql.all('SELECT * FROM rubric_groups WHERE rubric_catalogue_id=? ORDER BY display_order', id),
      skills: sql.all('SELECT * FROM rubric_axes WHERE rubric_catalogue_id=? ORDER BY display_order', id),
      steps: sql.all(`SELECT s.*,l.level_code,l.numeric_value FROM rubric_step_definitions s JOIN rubric_levels l ON l.level_id=s.level_id WHERE s.rubric_catalogue_id=? ORDER BY s.axis_id,s.step_number`, id),
    };
  },
  exportData() {
    const ids = this.catalogues().map(item => item.rubric_catalogue_id);
    if (!ids.length) return { catalogues: [], groups: [], skills: [], steps: [] };
    const placeholders = ids.map(() => '?').join(',');
    return {
      catalogues: sql.all(`SELECT rubric_catalogue_id,code,name_en,name_zh,version,selection_mode,score_out_of,labelling_capable,assessment_capable,radar_eligible,definition_completeness,source_reference,status,supersedes_rubric_catalogue_id,disabled_reason,disabled_at,CASE WHEN disabled_at IS NULL THEN 0 ELSE 1 END disabled FROM rubric_catalogues WHERE rubric_catalogue_id IN (${placeholders}) ORDER BY name_en,version`, ...ids),
      groups: sql.all(`SELECT rubric_group_id,rubric_catalogue_id,group_code,name_en,name_zh,display_order,status,disabled FROM rubric_groups WHERE rubric_catalogue_id IN (${placeholders}) ORDER BY rubric_catalogue_id,display_order`, ...ids),
      skills: sql.all(`SELECT axis_id,rubric_catalogue_id,rubric_group_id,axis_code,name_en,name_zh,axis_kind,display_order,status,notes,CASE WHEN status='disabled' THEN 1 ELSE 0 END disabled FROM rubric_axes WHERE rubric_catalogue_id IN (${placeholders}) ORDER BY rubric_catalogue_id,display_order`, ...ids),
      steps: sql.all(`SELECT step_definition_id,rubric_catalogue_id,rubric_group_id,axis_id,level_id,step_number,step_name_en,step_name_zh,definition_en,definition_zh,score_min,score_max,score_out_of,source_reference,status,disabled FROM rubric_step_definitions WHERE rubric_catalogue_id IN (${placeholders}) ORDER BY rubric_catalogue_id,axis_id,step_number`, ...ids),
    };
  },
  saveImportDraft(record) {
    sql.run(`INSERT INTO rubric_import_drafts(rubric_import_draft_id,school_id,source_file_name,source_sha256,uploaded_by_user_id,uploaded_at,validation_status,validation_errors_json,workbook_json) VALUES(?,?,?,?,?,?,?,?,?)`, record.id, record.schoolId, record.fileName, record.sha256, record.actorId, record.at, record.status, JSON.stringify(record.errors), JSON.stringify(record.workbook));
  },
  importDraft(id) { const row = sql.get('SELECT * FROM rubric_import_drafts WHERE rubric_import_draft_id=?', id); return row ? { ...row, validationErrors: JSON.parse(row.validation_errors_json), workbook: JSON.parse(row.workbook_json) } : null; },
  createSuccessor(record) {
    sql.transaction(() => {
      const c = record.catalogue;
      sql.run(`INSERT INTO rubric_catalogues(rubric_catalogue_id,code,name_en,name_zh,version,labelling_capable,assessment_capable,radar_eligible,level_order_type,definition_completeness,source_reference,status,notes,selection_mode,score_out_of,supersedes_rubric_catalogue_id) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, c.rubric_catalogue_id, c.code, c.name_en, c.name_zh, c.version, c.labelling_capable, c.assessment_capable, c.radar_eligible, c.level_order_type, c.definition_completeness, c.source_reference, 'draft', c.notes, c.selection_mode, c.score_out_of, record.sourceId);
      for (const group of record.groups) sql.run(`INSERT INTO rubric_groups(rubric_group_id,rubric_catalogue_id,group_code,name_en,name_zh,display_order,status,disabled) VALUES(?,?,?,?,?,?,?,?)`, group.rubric_group_id, c.rubric_catalogue_id, group.group_code, group.name_en, group.name_zh, group.display_order, group.status, group.disabled);
      for (const skill of record.skills) sql.run(`INSERT INTO rubric_axes(axis_id,rubric_catalogue_id,axis_code,name_en,name_zh,axis_kind,display_order,status,notes,rubric_group_id) VALUES(?,?,?,?,?,?,?,?,?,?)`, skill.axis_id, c.rubric_catalogue_id, skill.axis_code, skill.name_en, skill.name_zh, skill.axis_kind, skill.display_order, skill.status, skill.notes, skill.rubric_group_id);
      for (const level of record.levels) sql.run(`INSERT INTO rubric_levels(level_id,rubric_catalogue_id,level_code,level_order,numeric_value,name_en,name_zh,is_prerequisite_chain,status) VALUES(?,?,?,?,?,?,?,?,?)`, level.level_id, c.rubric_catalogue_id, level.level_code, level.level_order, level.numeric_value, level.name_en, level.name_zh, 0, 'active');
      for (const step of record.steps) sql.run(`INSERT INTO rubric_step_definitions(step_definition_id,rubric_catalogue_id,rubric_group_id,axis_id,level_id,step_number,step_name_en,step_name_zh,definition_en,definition_zh,score_min,score_max,score_out_of,source_reference,status,disabled) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, step.step_definition_id, c.rubric_catalogue_id, step.rubric_group_id, step.axis_id, step.level_id, step.step_number, step.step_name_en, step.step_name_zh, step.definition_en, step.definition_zh, step.score_min, step.score_max, step.score_out_of, step.source_reference, step.status, step.disabled);
      sql.run('UPDATE rubric_import_drafts SET successor_rubric_catalogue_id=?,committed_at=? WHERE rubric_import_draft_id=?', c.rubric_catalogue_id, record.at, record.draftId);
    });
  },
  activate(id, actorId, at) {
    sql.transaction(() => {
      sql.run(`UPDATE rubric_catalogues SET status='superseded' WHERE assessment_capable=1 AND status='active' AND rubric_catalogue_id<>?`, id);
      sql.run(`UPDATE rubric_catalogues SET status='active',activated_by_user_id=?,activated_at=? WHERE rubric_catalogue_id=?`, actorId, at, id);
    });
  },
};
