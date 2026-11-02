import { sql } from './database.js';

function searchClause(columns, value, clauses, params) {
  if (!value) return;
  clauses.push(`(${columns.map(column => `LOWER(COALESCE(${column},'')) LIKE ?`).join(' OR ')})`);
  const term = `%${String(value).toLowerCase()}%`;
  params.push(...columns.map(() => term));
}

function paged(base, countBase, clauses, params, order, limit, offset) {
  const where = clauses.length ? ` WHERE ${clauses.join(' AND ')}` : '';
  const total = Number(sql.get(`${countBase}${where}`, ...params)?.count || 0);
  const rows = sql.all(`${base}${where} ORDER BY ${order} LIMIT ? OFFSET ?`, ...params, limit, offset);
  return { total, rows };
}

export const authoringRepository = {
  labels(schoolId, filters) {
    const from = ` FROM rubric_axes axis
      JOIN rubric_catalogues catalogue ON catalogue.rubric_catalogue_id=axis.rubric_catalogue_id
      LEFT JOIN rubric_groups group_def ON group_def.rubric_group_id=axis.rubric_group_id
      LEFT JOIN definition_sources source ON source.definition_source_id=catalogue.definition_source_id`;
    const clauses = ['(source.school_id=? OR source.school_id IS NULL)'];
    const params = [schoolId];
    searchClause(['axis.axis_code','axis.name_en','axis.name_zh','axis.notes','catalogue.code','catalogue.name_en','catalogue.name_zh','group_def.name_en','group_def.name_zh'], filters.search, clauses, params);
    if (filters.catalogueId) { clauses.push('catalogue.rubric_catalogue_id=?'); params.push(filters.catalogueId); }
    if (filters.groupId) { clauses.push('axis.rubric_group_id=?'); params.push(filters.groupId); }
    if (filters.sourceId) { clauses.push('catalogue.definition_source_id=?'); params.push(filters.sourceId); }
    const assignmentDate = process.env.POC_V2_AS_OF || '2027-01-20';
    if (filters.capability === 'labelling') {
      clauses.push(`catalogue.labelling_capable=1 AND EXISTS(SELECT 1 FROM school_rubric_assignments assignment WHERE assignment.school_id=? AND assignment.purpose='activity_labelling' AND assignment.rubric_catalogue_id=catalogue.rubric_catalogue_id AND assignment.status='active' AND assignment.effective_from<=? AND (assignment.effective_until IS NULL OR assignment.effective_until>=?))`);
      params.push(schoolId, assignmentDate, assignmentDate);
    } else if (filters.capability === 'assessment') {
      clauses.push(`catalogue.assessment_capable=1 AND EXISTS(SELECT 1 FROM school_rubric_assignments assignment WHERE assignment.school_id=? AND assignment.purpose='assessment_rubric' AND assignment.rubric_catalogue_id=catalogue.rubric_catalogue_id AND assignment.status='active' AND assignment.effective_from<=? AND (assignment.effective_until IS NULL OR assignment.effective_until>=?))`);
      params.push(schoolId, assignmentDate, assignmentDate);
    } else if (filters.capability === 'both') {
      clauses.push(`catalogue.labelling_capable=1 AND catalogue.assessment_capable=1 AND EXISTS(SELECT 1 FROM school_rubric_assignments assignment WHERE assignment.school_id=? AND assignment.rubric_catalogue_id=catalogue.rubric_catalogue_id AND assignment.status='active' AND assignment.effective_from<=? AND (assignment.effective_until IS NULL OR assignment.effective_until>=?))`);
      params.push(schoolId, assignmentDate, assignmentDate);
    }
    if (filters.status === 'active') clauses.push(`catalogue.status='active' AND catalogue.disabled_at IS NULL AND axis.status='active'`);
    else if (filters.status === 'disabled') clauses.push(`(catalogue.status<>'active' OR catalogue.disabled_at IS NOT NULL OR axis.status<>'active')`);
    const select = `SELECT axis.axis_id,axis.axis_code,axis.name_en,axis.name_zh,axis.axis_kind,axis.display_order,axis.status axis_status,axis.notes,
      catalogue.rubric_catalogue_id,catalogue.code catalogue_code,catalogue.name_en catalogue_name_en,catalogue.name_zh catalogue_name_zh,catalogue.version catalogue_version,catalogue.labelling_capable,catalogue.assessment_capable,catalogue.status catalogue_status,catalogue.disabled_at catalogue_disabled_at,
      group_def.rubric_group_id,group_def.group_code,group_def.name_en group_name_en,group_def.name_zh group_name_zh,
      source.definition_source_id,source.source_code,source.name_en source_name_en,source.name_zh source_name_zh,source.source_reference`;
    return paged(`${select}${from}`, `SELECT COUNT(*) count${from}`, clauses, params, 'catalogue.code,catalogue.version,axis.display_order,axis.axis_code', filters.limit, filters.offset);
  },

  questions(schoolId, filters) {
    const from = ` FROM question_versions version
      JOIN question_definitions question ON question.question_id=version.question_id
      JOIN question_bank_versions bank ON bank.question_bank_version_id=version.question_bank_version_id
      JOIN definition_sources source ON source.definition_source_id=bank.definition_source_id`;
    const clauses = ['question.school_id=?'];
    const params = [schoolId];
    searchClause(['question.stable_code','version.prompt_en','version.prompt_zh','version.source_construct_en','version.source_construct_zh','version.subdomain','version.ability_code','version.ability_name_en','version.ability_name_zh'], filters.search, clauses, params);
    if (filters.bankVersionId) { clauses.push('version.question_bank_version_id=?'); params.push(filters.bankVersionId); }
    if (filters.sourceId) { clauses.push('source.definition_source_id=?'); params.push(filters.sourceId); }
    if (filters.construct) { clauses.push(`(LOWER(COALESCE(version.source_construct_en,''))=? OR LOWER(COALESCE(version.source_construct_zh,''))=?)`); params.push(String(filters.construct).toLowerCase(), String(filters.construct).toLowerCase()); }
    if (filters.abilityCode) { clauses.push('version.ability_code=?'); params.push(filters.abilityCode); }
    if (filters.status === 'active') clauses.push(`question.operational_status='active' AND version.status='active' AND version.disabled_at IS NULL AND bank.status='active'`);
    else if (filters.status === 'disabled') clauses.push(`(question.operational_status<>'active' OR version.status<>'active' OR version.disabled_at IS NOT NULL OR bank.status<>'active')`);
    const select = `SELECT question.question_id,question.stable_code,question.operational_status,version.*,bank.bank_code,bank.name_en bank_name_en,bank.name_zh bank_name_zh,bank.version_number bank_version,bank.status bank_status,source.definition_source_id,source.source_reference,source.content_sha256`;
    return paged(`${select}${from}`, `SELECT COUNT(*) count${from}`, clauses, params, 'version.source_construct_en,version.source_row,question.stable_code', filters.limit, filters.offset);
  },

  questionBlocks(schoolId, filters) {
    const from = ` FROM question_blocks block
      JOIN question_block_versions version ON version.question_block_version_id=block.latest_version_id`;
    const clauses = ['block.school_id=?'];
    const params = [schoolId];
    if (filters.search) {
      clauses.push(`(LOWER(block.block_code) LIKE ? OR LOWER(block.name_en) LIKE ? OR LOWER(block.name_zh) LIKE ? OR EXISTS(SELECT 1 FROM question_block_items item WHERE item.question_block_version_id=version.question_block_version_id AND (LOWER(COALESCE(item.prompt_en,'')) LIKE ? OR LOWER(COALESCE(item.prompt_zh,'')) LIKE ?)))`);
      const term = `%${String(filters.search).toLowerCase()}%`;
      params.push(term, term, term, term, term);
    }
    if (filters.audience) { clauses.push('version.respondent_role_code=?'); params.push(filters.audience); }
    if (filters.abilityCode) {
      clauses.push(`(version.ability_code=? OR EXISTS(SELECT 1 FROM question_block_items item WHERE item.question_block_version_id=version.question_block_version_id AND item.ability_code=?))`);
      params.push(filters.abilityCode, filters.abilityCode);
    }
    if (filters.formVersionId) { clauses.push(`EXISTS(SELECT 1 FROM form_version_blocks link WHERE link.question_block_version_id=version.question_block_version_id AND link.form_version_id=?)`); params.push(filters.formVersionId); }
    if (filters.status === 'active') clauses.push(`block.operational_status='active' AND block.disabled_at IS NULL AND version.review_status='approved' AND version.publication_status='published'`);
    else if (filters.status === 'disabled') clauses.push(`(block.operational_status<>'active' OR block.disabled_at IS NOT NULL OR version.publication_status='withdrawn')`);
    const select = `SELECT block.*,version.question_block_version_id,version.version_number,version.respondent_role_code,version.ability_code,version.ability_name_en,version.ability_name_zh,version.review_status,version.publication_status,version.created_at version_created_at`;
    const result = paged(`${select}${from}`, `SELECT COUNT(*) count${from}`, clauses, params, 'block.name_en,block.block_code', filters.limit, filters.offset);
    return { ...result, rows: result.rows.map(row => ({
      ...row,
      forms: sql.all(`SELECT link.form_version_id,form.name_en,form.name_zh,form.version_number,link.display_order FROM form_version_blocks link JOIN form_versions form ON form.form_version_id=link.form_version_id WHERE link.question_block_version_id=? ORDER BY link.display_order`, row.question_block_version_id),
      items: sql.all(`SELECT item.* FROM question_block_items item WHERE item.question_block_version_id=? ORDER BY item.display_order`, row.question_block_version_id),
    })) };
  },
};
