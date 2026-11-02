import { sql } from './database.js';

const catalogueSummarySql = `SELECT c.*,
  (SELECT COUNT(*) FROM rubric_groups g WHERE g.rubric_catalogue_id=c.rubric_catalogue_id AND g.disabled=0) group_count,
  (SELECT COUNT(*) FROM rubric_axes a WHERE a.rubric_catalogue_id=c.rubric_catalogue_id AND a.status='active') skill_count,
  (SELECT COUNT(*) FROM rubric_step_definitions s WHERE s.rubric_catalogue_id=c.rubric_catalogue_id AND s.disabled=0) step_count,
  (SELECT COUNT(*) FROM portfolio_working_versions p WHERE p.rubric_catalogue_id=c.rubric_catalogue_id) portfolio_usage_count
  FROM rubric_catalogues c`;

export const rubricRepository = {
  catalogues() {
    return sql.all(`${catalogueSummarySql} WHERE c.assessment_capable=1 ORDER BY c.status='active' DESC,c.name_en,c.version`);
  },
  allCatalogues() { return sql.all(`${catalogueSummarySql} ORDER BY c.code,c.version`); },
  assignments(schoolId) {
    return sql.all(`SELECT assignment.*,catalogue.code,catalogue.name_en,catalogue.name_zh,catalogue.version,catalogue.labelling_capable,catalogue.assessment_capable FROM school_rubric_assignments assignment JOIN rubric_catalogues catalogue ON catalogue.rubric_catalogue_id=assignment.rubric_catalogue_id WHERE assignment.school_id=? ORDER BY assignment.purpose,assignment.scope_type,assignment.scope_id,assignment.assigned_at DESC`, schoolId);
  },
  catalogue(id) { return sql.get(`${catalogueSummarySql} WHERE c.rubric_catalogue_id=?`, id); },
  assigned(schoolId, purpose, resource = {}, asOf = process.env.POC_V2_AS_OF || '2027-01-20') {
    return sql.get(`${catalogueSummarySql}
      JOIN school_rubric_assignments assignment ON assignment.rubric_catalogue_id=c.rubric_catalogue_id
      WHERE assignment.school_id=? AND assignment.purpose=? AND assignment.status='active'
        AND assignment.effective_from<=? AND (assignment.effective_until IS NULL OR assignment.effective_until>=?)
        AND ((assignment.scope_type='programme' AND assignment.scope_id=?)
          OR (assignment.scope_type='grade' AND assignment.scope_id=?)
          OR (assignment.scope_type='school' AND assignment.scope_id=?))
      ORDER BY CASE assignment.scope_type WHEN 'programme' THEN 1 WHEN 'grade' THEN 2 ELSE 3 END,assignment.assigned_at DESC LIMIT 1`, schoolId, purpose, asOf, asOf, resource.programme_id || null, resource.grade_id || null, schoolId);
  },
  activeAssessment(schoolId, resource = {}) {
    return this.assigned(schoolId, 'assessment_rubric', resource);
  },
  package(id) {
    const catalogue = this.catalogue(id);
    if (!catalogue) return null;
    return {
      catalogue,
      groups: sql.all('SELECT * FROM rubric_groups WHERE rubric_catalogue_id=? ORDER BY display_order', id),
      skills: sql.all('SELECT * FROM rubric_axes WHERE rubric_catalogue_id=? ORDER BY display_order', id),
      levels: sql.all('SELECT * FROM rubric_levels WHERE rubric_catalogue_id=? ORDER BY level_order', id),
      steps: sql.all(`SELECT s.*,l.level_code,l.numeric_value FROM rubric_step_definitions s JOIN rubric_levels l ON l.level_id=s.level_id WHERE s.rubric_catalogue_id=? ORDER BY s.axis_id,s.step_number`, id),
    };
  },
  exportData() {
    const ids = this.catalogues().map(item => item.rubric_catalogue_id);
    if (!ids.length) return { catalogues: [], groups: [], skills: [], levels: [], steps: [] };
    const placeholders = ids.map(() => '?').join(',');
    return {
      catalogues: sql.all(`SELECT rubric_catalogue_id,code,name_en,name_zh,version,selection_mode,score_out_of,labelling_capable,assessment_capable,radar_eligible,level_order_type,definition_completeness,source_reference,status,supersedes_rubric_catalogue_id,disabled_reason,disabled_at,CASE WHEN disabled_at IS NULL THEN 0 ELSE 1 END disabled FROM rubric_catalogues WHERE rubric_catalogue_id IN (${placeholders}) ORDER BY name_en,version`, ...ids),
      groups: sql.all(`SELECT rubric_group_id,rubric_catalogue_id,group_code,name_en,name_zh,display_order,status,disabled FROM rubric_groups WHERE rubric_catalogue_id IN (${placeholders}) ORDER BY rubric_catalogue_id,display_order`, ...ids),
      skills: sql.all(`SELECT axis_id,rubric_catalogue_id,rubric_group_id,axis_code,name_en,name_zh,axis_kind,display_order,status,notes,CASE WHEN status='disabled' THEN 1 ELSE 0 END disabled FROM rubric_axes WHERE rubric_catalogue_id IN (${placeholders}) ORDER BY rubric_catalogue_id,display_order`, ...ids),
      levels: sql.all(`SELECT level_id,rubric_catalogue_id,level_code,level_order,numeric_value,name_en,name_zh,is_prerequisite_chain,status FROM rubric_levels WHERE rubric_catalogue_id IN (${placeholders}) ORDER BY rubric_catalogue_id,level_order`, ...ids),
      steps: sql.all(`SELECT step_definition_id,rubric_catalogue_id,rubric_group_id,axis_id,level_id,step_number,step_name_en,step_name_zh,definition_en,definition_zh,score_min,score_max,score_out_of,source_reference,status,disabled FROM rubric_step_definitions WHERE rubric_catalogue_id IN (${placeholders}) ORDER BY rubric_catalogue_id,axis_id,step_number`, ...ids),
    };
  },
  saveImportDraft(record) {
    sql.transaction(() => {
      sql.run(`INSERT OR IGNORE INTO source_systems(source_system_id,school_id,source_code,name_en,name_zh,source_purpose,connector_type,status,created_by_user_id,created_at,updated_by_user_id,updated_at) VALUES('SRC-RUBRIC-UPLOAD',?,'rubric_package_upload','Rubric package upload','Rubric 套件上載','rubric_import','manual_upload','active',?,?,?,?)`, record.schoolId, record.actorId, record.at, record.actorId, record.at);
      sql.run(`INSERT OR IGNORE INTO import_contract_versions(import_contract_version_id,contract_code,version_number,target_entity_type,accepted_formats_json,status,created_by_user_id,created_at) VALUES('ICV-RUBRIC-PACKAGE-1','rubric_package','1.0','rubric_catalogue','["xlsx"]','active',?,?)`, record.actorId, record.at);
      sql.run(`INSERT INTO import_batches(import_batch_id,school_id,source_system_id,import_contract_version_id,target_entity_type,ingress_channel,original_file_name,content_type,content_sha256,uploaded_by_user_id,requested_by_user_id,received_at,parsed_at,validated_at,processing_status,parser_name,parser_version,total_rows,valid_rows,warning_rows,error_rows,excluded_rows,committed_rows,updated_by_user_id,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, record.id, record.schoolId, 'SRC-RUBRIC-UPLOAD', 'ICV-RUBRIC-PACKAGE-1', 'rubric_catalogue', 'manual_xlsx', record.fileName, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', record.sha256, record.actorId, record.actorId, record.at, record.at, record.at, record.status, 'rubric-xlsx', '1.0', 1, record.status === 'ready' ? 1 : 0, 0, record.errors.length ? 1 : 0, 0, 0, record.actorId, record.at);
      sql.run(`INSERT INTO import_records(import_record_id,import_batch_id,row_number,source_record_key,original_payload_json,normalized_payload_json,payload_sha256,identity_status,validation_status,validation_errors_json,validation_warnings_json,resolved_user_id,current_decision,current_status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, `${record.id}-PACKAGE`, record.id, 1, record.fileName, JSON.stringify({ fileName: record.fileName, sha256: record.sha256 }), JSON.stringify(record.workbook), record.sha256, 'not_applicable', record.status === 'ready' ? 'valid' : 'invalid', JSON.stringify(record.errors), '[]', null, 'included', record.status === 'ready' ? 'ready' : 'needs_resolution', record.at, record.at);
      sql.run(`INSERT INTO import_batch_events(import_batch_event_id,import_batch_id,from_status,to_status,event_code,actor_user_id,reason,details_json,occurred_at) VALUES(?,?,?,?,?,?,?,?,?)`, `${record.id}-STAGED`, record.id, null, record.status, 'rubric.import.staged', record.actorId, record.errors.length ? 'Validation failed' : 'Ready to create successor draft', JSON.stringify({ fileName: record.fileName }), record.at);
    });
  },
  importDraft(id) {
    const row = sql.get(`SELECT batch.import_batch_id rubric_import_draft_id,batch.school_id,batch.original_file_name source_file_name,batch.content_sha256 source_sha256,batch.uploaded_by_user_id,batch.received_at uploaded_at,
        CASE record.validation_status WHEN 'valid' THEN 'ready' ELSE 'invalid' END validation_status,record.validation_errors_json,record.normalized_payload_json workbook_json,batch.committed_at,
        (SELECT link.entity_id FROM import_record_links link WHERE link.import_record_id=record.import_record_id AND link.entity_type='rubric_catalogue' ORDER BY link.committed_at DESC LIMIT 1) successor_rubric_catalogue_id
      FROM import_batches batch JOIN import_records record ON record.import_batch_id=batch.import_batch_id
      JOIN import_contract_versions contract ON contract.import_contract_version_id=batch.import_contract_version_id
      WHERE batch.import_batch_id=? AND contract.contract_code='rubric_package'`, id);
    return row ? { ...row, validationErrors: JSON.parse(row.validation_errors_json), workbook: JSON.parse(row.workbook_json) } : null;
  },
  createSuccessor(record) {
    sql.transaction(() => {
      const c = record.catalogue;
      sql.run(`INSERT INTO rubric_catalogues(rubric_catalogue_id,code,name_en,name_zh,version,labelling_capable,assessment_capable,radar_eligible,level_order_type,definition_completeness,source_reference,status,notes,selection_mode,score_out_of,supersedes_rubric_catalogue_id) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, c.rubric_catalogue_id, c.code, c.name_en, c.name_zh, c.version, c.labelling_capable, c.assessment_capable, c.radar_eligible, c.level_order_type, c.definition_completeness, c.source_reference, 'draft', c.notes, c.selection_mode, c.score_out_of, record.sourceId);
      for (const group of record.groups) sql.run(`INSERT INTO rubric_groups(rubric_group_id,rubric_catalogue_id,group_code,name_en,name_zh,display_order,status,disabled) VALUES(?,?,?,?,?,?,?,?)`, group.rubric_group_id, c.rubric_catalogue_id, group.group_code, group.name_en, group.name_zh, group.display_order, group.status, group.disabled);
      for (const skill of record.skills) sql.run(`INSERT INTO rubric_axes(axis_id,rubric_catalogue_id,axis_code,name_en,name_zh,axis_kind,display_order,status,notes,rubric_group_id) VALUES(?,?,?,?,?,?,?,?,?,?)`, skill.axis_id, c.rubric_catalogue_id, skill.axis_code, skill.name_en, skill.name_zh, skill.axis_kind, skill.display_order, skill.status, skill.notes, skill.rubric_group_id);
      for (const level of record.levels) sql.run(`INSERT INTO rubric_levels(level_id,rubric_catalogue_id,level_code,level_order,numeric_value,name_en,name_zh,is_prerequisite_chain,status) VALUES(?,?,?,?,?,?,?,?,?)`, level.level_id, c.rubric_catalogue_id, level.level_code, level.level_order, level.numeric_value, level.name_en, level.name_zh, level.is_prerequisite_chain, level.status || 'active');
      for (const step of record.steps) sql.run(`INSERT INTO rubric_step_definitions(step_definition_id,rubric_catalogue_id,rubric_group_id,axis_id,level_id,step_number,step_name_en,step_name_zh,definition_en,definition_zh,score_min,score_max,score_out_of,source_reference,status,disabled) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, step.step_definition_id, c.rubric_catalogue_id, step.rubric_group_id, step.axis_id, step.level_id, step.step_number, step.step_name_en, step.step_name_zh, step.definition_en, step.definition_zh, step.score_min, step.score_max, step.score_out_of, step.source_reference, step.status, step.disabled);
      const importRecordId = `${record.draftId}-PACKAGE`;
      sql.run(`INSERT INTO import_record_links(import_record_link_id,import_record_id,entity_type,entity_id,entity_version_id,commit_action,reconciliation_status,committed_by_user_id,committed_at,notes) VALUES(?,?,?,?,?,?,?,?,?,?)`, `${importRecordId}-LINK`, importRecordId, 'rubric_catalogue', c.rubric_catalogue_id, c.rubric_catalogue_id, 'successor_created', 'current', record.actorId || c.activated_by_user_id || null, record.at, `Successor of ${record.sourceId}`);
      sql.run(`UPDATE import_records SET current_status='committed',updated_at=? WHERE import_record_id=?`, record.at, importRecordId);
      sql.run(`UPDATE import_batches SET processing_status='committed',committed_at=?,committed_by_user_id=COALESCE(?,uploaded_by_user_id),committed_rows=1,updated_at=? WHERE import_batch_id=?`, record.at, record.actorId || null, record.at, record.draftId);
    });
  },
  assignAssessment(record) {
    sql.transaction(() => {
      sql.run(`UPDATE school_rubric_assignments SET status='superseded',effective_until=? WHERE school_id=? AND purpose='assessment_rubric' AND scope_type=? AND scope_id=? AND status='active'`, record.effectiveFrom, record.schoolId, record.scopeType, record.scopeId);
      sql.run(`INSERT INTO school_rubric_assignments(school_rubric_assignment_id,school_id,purpose,rubric_catalogue_id,scope_type,scope_id,effective_from,effective_until,status,assigned_by_user_id,assigned_at,reason) VALUES(?,?,'assessment_rubric',?,?,?,?,?,'active',?,?,?)`, record.id, record.schoolId, record.rubricCatalogueId, record.scopeType, record.scopeId, record.effectiveFrom, record.effectiveUntil, record.actorId, record.assignedAt, record.reason);
      sql.run(`UPDATE rubric_catalogues SET status='active',activated_by_user_id=?,activated_at=? WHERE rubric_catalogue_id=?`, record.actorId, record.assignedAt, record.rubricCatalogueId);
    });
  },
};
