import ExcelJS from 'exceljs';
import { createHash, randomUUID } from 'node:crypto';
import { rubricRepository } from '../repositories/rubricRepository.js';
import { identityRepository } from '../repositories/identityRepository.js';
import { fail, requireCapability } from './access.js';

const sheets = ['rubric_catalogues','rubric_groups','rubric_skills','rubric_steps'];
const headers = {
  rubric_catalogues: ['rubric_catalogue_id','code','name_en','name_zh','version','selection_mode','score_out_of','labelling_capable','assessment_capable','radar_eligible','definition_completeness','source_reference','status','supersedes_rubric_catalogue_id','disabled'],
  rubric_groups: ['rubric_group_id','rubric_catalogue_id','group_code','name_en','name_zh','display_order','status','disabled'],
  rubric_skills: ['axis_id','rubric_catalogue_id','rubric_group_id','axis_code','name_en','name_zh','axis_kind','display_order','status','notes','disabled'],
  rubric_steps: ['step_definition_id','rubric_catalogue_id','rubric_group_id','axis_id','level_id','step_number','step_name_en','step_name_zh','definition_en','definition_zh','score_min','score_max','score_out_of','source_reference','status','disabled'],
};
const bool = value => ['1','true','yes'].includes(String(value ?? '').trim().toLowerCase()) ? 1 : 0;
const numberOrNull = value => value === '' || value == null ? null : Number(value);

function addSheet(workbook, name, rows, columns = headers[name]) {
  const sheet = workbook.addWorksheet(name);
  sheet.columns = columns.map(key => ({ header: key, key, width: Math.min(42, Math.max(14, key.length + 3)) }));
  rows.forEach(row => sheet.addRow(row));
  sheet.getRow(1).font = { bold: true };
  sheet.views = [{ state: 'frozen', ySplit: 1 }];
  sheet.autoFilter = { from: 'A1', to: `${String.fromCharCode(64 + Math.min(columns.length, 26))}1` };
}

async function workbookPayload(rows, template = false) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'BHSS Portfolio V2';
  for (const name of sheets) addSheet(workbook, name, template ? [Object.fromEntries(headers[name].map(key => [key, key === 'disabled' ? false : '']))] : rows[name.replace('rubric_', '')] || rows[name] || []);
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer).toString('base64');
}

function sheetRows(sheet) {
  const names = sheet.getRow(1).values.slice(1).map(value => String(value || '').trim());
  const rows = [];
  sheet.eachRow((row, index) => { if (index === 1) return; const value = Object.fromEntries(names.map((name, offset) => [name, row.getCell(offset + 1).value ?? ''])); if (Object.values(value).some(cell => String(cell).trim())) rows.push(value); });
  return { names, rows };
}

function validateWorkbook(data) {
  const errors = [];
  for (const name of sheets) {
    const missing = headers[name].filter(key => !data[name].names.includes(key));
    if (missing.length) errors.push(`${name}: missing ${missing.join(', ')}`);
  }
  const catalogueIds = new Set(data.rubric_catalogues.rows.map(row => String(row.rubric_catalogue_id)));
  const groupIds = new Set(data.rubric_groups.rows.map(row => String(row.rubric_group_id)));
  const skillIds = new Set(data.rubric_skills.rows.map(row => String(row.axis_id)));
  for (const row of data.rubric_groups.rows) if (!catalogueIds.has(String(row.rubric_catalogue_id))) errors.push(`rubric_groups: unknown catalogue ${row.rubric_catalogue_id}`);
  for (const row of data.rubric_skills.rows) if (!catalogueIds.has(String(row.rubric_catalogue_id)) || !groupIds.has(String(row.rubric_group_id))) errors.push(`rubric_skills: invalid links for ${row.axis_id}`);
  for (const row of data.rubric_steps.rows) if (!catalogueIds.has(String(row.rubric_catalogue_id)) || !groupIds.has(String(row.rubric_group_id)) || !skillIds.has(String(row.axis_id))) errors.push(`rubric_steps: invalid links for ${row.step_definition_id}`);
  for (const catalogue of data.rubric_catalogues.rows) {
    const mode = String(catalogue.selection_mode);
    if (!['definition_only','score_range'].includes(mode)) errors.push(`${catalogue.rubric_catalogue_id}: selection_mode must be definition_only or score_range`);
    const steps = data.rubric_steps.rows.filter(row => String(row.rubric_catalogue_id) === String(catalogue.rubric_catalogue_id) && !bool(row.disabled));
    if (bool(catalogue.assessment_capable) && !steps.length) errors.push(`${catalogue.rubric_catalogue_id}: assessment-capable rubric requires step definitions`);
    if (mode === 'score_range') {
      const outOf = numberOrNull(catalogue.score_out_of) ?? 10;
      if (outOf <= 0) errors.push(`${catalogue.rubric_catalogue_id}: score_out_of must be positive`);
      for (const step of steps) if (numberOrNull(step.score_min) == null || numberOrNull(step.score_max) == null) errors.push(`${step.step_definition_id}: score mode requires score_min and score_max`);
      for (const axisId of new Set(steps.map(step => step.axis_id))) {
        const bands = steps.filter(step => step.axis_id === axisId).map(step => ({ id: step.step_definition_id, min: Number(step.score_min), max: Number(step.score_max) })).sort((a,b) => a.min - b.min);
        if (bands.length && (bands[0].min !== 0 || bands.at(-1).max !== outOf)) errors.push(`${axisId}: score ranges must cover 0 through ${outOf}`);
        for (let index = 0; index < bands.length; index += 1) {
          if (bands[index].min > bands[index].max || bands[index].min < 0 || bands[index].max > outOf) errors.push(`${bands[index].id}: invalid score range`);
          if (index && bands[index].min <= bands[index - 1].max) errors.push(`${axisId}: overlapping score ranges`);
          if (index && bands[index].min - bands[index - 1].max > 0.01) errors.push(`${axisId}: incomplete score ranges`);
        }
      }
    }
  }
  return errors;
}

function successorRecord(draft, sourceId) {
  const source = draft.workbook.rubric_catalogues.rows.find(row => String(row.rubric_catalogue_id) === sourceId);
  if (!source) fail(400, 'The selected source rubric is not present in this workbook');
  const suffix = randomUUID().slice(0, 8).toUpperCase(), newId = `${sourceId}-${suffix}`;
  const groups = draft.workbook.rubric_groups.rows.filter(row => row.rubric_catalogue_id === sourceId), skills = draft.workbook.rubric_skills.rows.filter(row => row.rubric_catalogue_id === sourceId), steps = draft.workbook.rubric_steps.rows.filter(row => row.rubric_catalogue_id === sourceId);
  const groupMap = new Map(groups.map(row => [row.rubric_group_id, `${row.rubric_group_id}-${suffix}`]));
  const skillMap = new Map(skills.map(row => [row.axis_id, `${row.axis_id}-${suffix}`]));
  const levelMap = new Map([...new Set(steps.map(row => Number(row.step_number)))].map(step => [step, `LVL-${suffix}-${String(step).padStart(2,'0')}`]));
  return {
    catalogue: { ...source, rubric_catalogue_id: newId, labelling_capable: bool(source.labelling_capable), assessment_capable: bool(source.assessment_capable), radar_eligible: bool(source.radar_eligible), level_order_type: source.level_order_type || 'ordered_1_to_16', definition_completeness: source.definition_completeness || 'complete', notes: `Successor imported from ${draft.source_file_name}`, score_out_of: source.selection_mode === 'score_range' ? (numberOrNull(source.score_out_of) ?? 10) : null },
    groups: groups.map(row => ({ ...row, rubric_group_id: groupMap.get(row.rubric_group_id), rubric_catalogue_id: newId, display_order: Number(row.display_order), disabled: bool(row.disabled) })),
    skills: skills.map(row => ({ ...row, axis_id: skillMap.get(row.axis_id), rubric_catalogue_id: newId, rubric_group_id: groupMap.get(row.rubric_group_id), display_order: Number(row.display_order) })),
    levels: [...levelMap].map(([step,id]) => ({ level_id: id, rubric_catalogue_id: newId, level_code: `step_${String(step).padStart(2,'0')}`, level_order: step, numeric_value: step, name_en: `Step ${step}`, name_zh: `第 ${step} 階段` })),
    steps: steps.map(row => ({ ...row, step_definition_id: `${row.step_definition_id}-${suffix}`, rubric_catalogue_id: newId, rubric_group_id: groupMap.get(row.rubric_group_id), axis_id: skillMap.get(row.axis_id), level_id: levelMap.get(Number(row.step_number)), step_number: Number(row.step_number), score_min: numberOrNull(row.score_min), score_max: numberOrNull(row.score_max), score_out_of: source.selection_mode === 'score_range' ? (numberOrNull(row.score_out_of) ?? numberOrNull(source.score_out_of) ?? 10) : null, disabled: bool(row.disabled) })),
  };
}

export const rubricService = {
  workspace(user) { requireCapability(user, 'import.export', { school_id: user.school_id }); return { catalogues: rubricRepository.catalogues(), active: rubricRepository.activeAssessment() }; },
  package(user, id) { requireCapability(user, 'import.export', { school_id: user.school_id }); const value = rubricRepository.package(id); if (!value) fail(404, 'Rubric version not found'); return value; },
  async export(user) { requireCapability(user, 'import.export', { school_id: user.school_id }); const rows = rubricRepository.exportData(); return { fileName: 'skill-rubrics-all-records.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', contentBase64: await workbookPayload({ catalogues: rows.catalogues, groups: rows.groups, skills: rows.skills, steps: rows.steps }), counts: Object.fromEntries(Object.entries(rows).map(([key,value]) => [key, value.length])) }; },
  async template(user) { requireCapability(user, 'import.export', { school_id: user.school_id }); return { fileName: 'skill-rubrics-new-template.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', contentBase64: await workbookPayload({}, true) }; },
  async preview(user, file) {
    requireCapability(user, 'import.run', { school_id: user.school_id });
    if (!file?.buffer || !/\.xlsx$/i.test(file.originalname || '')) fail(400, 'Choose one XLSX rubric package');
    const workbook = new ExcelJS.Workbook(); await workbook.xlsx.load(file.buffer);
    const data = Object.fromEntries(sheets.map(name => { const sheet = workbook.getWorksheet(name); return [name, sheet ? sheetRows(sheet) : { names: [], rows: [] }]; }));
    const errors = validateWorkbook(data), id = `RID-${randomUUID()}`, at = new Date().toISOString();
    rubricRepository.saveImportDraft({ id, schoolId: user.school_id, fileName: file.originalname, sha256: createHash('sha256').update(file.buffer).digest('hex'), actorId: user.user_id, at, status: errors.length ? 'invalid' : 'ready', errors, workbook: data });
    identityRepository.audit(user.school_id, user.user_id, 'rubric.import.staged', 'rubric_import_draft', id, errors.length ? 'Validation failed' : 'Ready to create successor draft');
    return { rubricImportDraftId: id, status: errors.length ? 'invalid' : 'ready', errors, counts: Object.fromEntries(sheets.map(name => [name, data[name].rows.length])), sourceCatalogues: data.rubric_catalogues.rows.map(row => ({ id: row.rubric_catalogue_id, name: row.name_en, version: row.version })) };
  },
  commit(user, draftId, input) {
    requireCapability(user, 'import.commit', { school_id: user.school_id });
    const draft = rubricRepository.importDraft(draftId); if (!draft || draft.school_id !== user.school_id) fail(404, 'Rubric import draft not found');
    if (draft.validation_status !== 'ready' || draft.validationErrors.length) fail(400, 'Only a valid staged rubric package can create a successor draft');
    if (draft.committed_at) fail(400, 'This staged package already created a successor');
    const record = successorRecord(draft, input.sourceRubricCatalogueId); const at = new Date().toISOString();
    rubricRepository.createSuccessor({ ...record, sourceId: input.sourceRubricCatalogueId, draftId, actorId: user.user_id, at });
    identityRepository.audit(user.school_id, user.user_id, 'rubric.successor.created', 'rubric_catalogue', record.catalogue.rubric_catalogue_id, `Supersedes ${input.sourceRubricCatalogueId}`);
    return rubricRepository.package(record.catalogue.rubric_catalogue_id);
  },
  activate(user, id, input) {
    requireCapability(user, 'policy.manage', { school_id: user.school_id });
    const item = rubricRepository.package(id); if (!item) fail(404, 'Rubric version not found');
    if (item.catalogue.status !== 'draft') fail(400, 'Only a validated successor draft can be activated');
    const errors = validateWorkbook({ rubric_catalogues: { names: headers.rubric_catalogues, rows: [item.catalogue] }, rubric_groups: { names: headers.rubric_groups, rows: item.groups }, rubric_skills: { names: headers.rubric_skills, rows: item.skills }, rubric_steps: { names: headers.rubric_steps, rows: item.steps } });
    if (errors.length) fail(400, 'Rubric version cannot be activated', 'RUBRIC_VALIDATION_FAILED', { errors });
    if (!input.reason?.trim()) fail(400, 'Activation reason is required');
    const at = new Date().toISOString(); rubricRepository.activate(id, user.user_id, at);
    identityRepository.audit(user.school_id, user.user_id, 'rubric.version.activated', 'rubric_catalogue', id, input.reason.trim());
    return this.workspace(user);
  },
};
