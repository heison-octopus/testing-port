import { createHash, randomUUID } from 'node:crypto';
import { parseStructuredInput } from '../adapters/importParsers.js';
import { fetchTimeInfinityRoster } from '../adapters/timeInfinityRosterConnector.js';
import { activityRepository } from '../repositories/activityRepository.js';
import { importRepository } from '../repositories/importRepository.js';
import { identityRepository } from '../repositories/identityRepository.js';
import { canUseAny, capabilityDecision, fail, requireCapability } from './access.js';

const allowedFields = new Set(['source_record_key','student_identifier','student_name','group_code','planned_attendance_status']);
const requiredFields = ['source_record_key','student_identifier'];
const correctableFields = new Set(['student_identifier','student_name','group_code','planned_attendance_status']);
const catalogueFields = ['source_record_key','activity_id','expected_revision_number','current_operational_status','title_en','title_zh','description_en','description_zh','activity_type','subject_id','department_id','start_at','end_at','owner_staff_number','requested_form_version_id','media_capture_expected','location','lifecycle_action','change_reason'];
const catalogueAllowedFields = new Set(catalogueFields);
const catalogueRequiredFields = ['source_record_key','activity_id','expected_revision_number','title_en','description_en','start_at','end_at','owner_staff_number','lifecycle_action'];
const catalogueCorrectableFields = new Set(catalogueFields.filter(field => !['source_record_key','current_operational_status'].includes(field)));
const catalogueMaterialFields = ['title_en','title_zh','description_en','description_zh','activity_type','subject_id','department_id','start_at','end_at','owner_staff_number','requested_form_version_id','media_capture_expected','location'];
const hash = value => createHash('sha256').update(value).digest('hex');
const clean = value => String(value ?? '').trim();
const csvCell = value => `"${String(value ?? '').replaceAll('"', '""')}"`;

function resource(activity) {
  const revision = activity.revisions[0];
  return { school_id: activity.school_id, activity_id: activity.activity_id, group_id: activity.group_id, subject_id: revision?.subject_id, department_id: revision?.department_id, programme_id: activity.group_id === 'GRP-STUDENT-DEV' ? 'student_development' : null };
}

function requireActivityAccess(user, activityId, capability) {
  const activity = activityRepository.activity(activityId);
  if (!activity || activity.school_id !== user.school_id) fail(404, 'Import target activity not found');
  const person = activity.people.find(item => item.user_id === user.user_id && item.person_type === 'staff');
  const decision = requireCapability(user, capability, resource(activity));
  if (!person || (!person.can_edit && person.relationship_type !== 'owner') || !decision.allowed) fail(404, 'Import target activity not found');
  return activity;
}

function requireBatchAccess(user, batchId, capability = 'import.view') {
  const detail = importRepository.detail(batchId);
  if (!detail || detail.school_id !== user.school_id) fail(404, 'Import batch not found');
  if (capabilityDecision(user, 'import.source.manage', { school_id: user.school_id }).allowed && capability === 'import.view') return detail;
  if (detail.contract_code === 'activity_catalogue') {
    requireCapability(user, capability, { school_id: user.school_id });
    return detail;
  }
  requireActivityAccess(user, detail.target_entity_id, capability);
  return detail;
}

function validateHeaders(rows) {
  if (!rows.length) fail(400, 'The import contains no data rows', 'IMPORT_ROWS_EMPTY');
  const headers = Object.keys(rows[0]);
  const unknown = headers.filter(header => !allowedFields.has(header));
  const missing = requiredFields.filter(field => !headers.includes(field));
  if (unknown.length || missing.length) fail(400, 'The file does not match activity roster contract 1.0', 'IMPORT_CONTRACT_MISMATCH', { unknown, missing, allowed: [...allowedFields] });
}

function validateCatalogueHeaders(rows) {
  if (!rows.length) fail(400, 'The import contains no data rows', 'IMPORT_ROWS_EMPTY');
  const headers = Object.keys(rows[0]);
  const unknown = headers.filter(header => !catalogueAllowedFields.has(header));
  const missing = catalogueRequiredFields.filter(field => !headers.includes(field));
  if (unknown.length || missing.length) fail(400, 'The file does not match activity catalogue contract 1.0', 'IMPORT_CONTRACT_MISMATCH', { unknown, missing, allowed: catalogueFields });
}

function normalizeRecord(user, raw, rowNumber, duplicateKeys) {
  const normalizedPayload = {
    source_record_key: String(raw.source_record_key || '').trim(),
    student_identifier: String(raw.student_identifier || '').trim(),
    student_name: String(raw.student_name || '').trim(),
    group_code: String(raw.group_code || '').trim(),
    planned_attendance_status: String(raw.planned_attendance_status || 'assigned').trim().toLowerCase(),
  };
  const errors = [], warnings = [];
  if (!normalizedPayload.source_record_key || normalizedPayload.source_record_key.length > 200) errors.push({ field: 'source_record_key', code: 'REQUIRED_OR_TOO_LONG', message: 'Source record key must contain 1–200 characters.' });
  if (duplicateKeys.has(normalizedPayload.source_record_key)) errors.push({ field: 'source_record_key', code: 'DUPLICATE_SOURCE_KEY', message: 'Source record key is duplicated in this batch.' });
  if (!normalizedPayload.student_identifier) errors.push({ field: 'student_identifier', code: 'REQUIRED', message: 'Student identifier is required.' });
  if (normalizedPayload.planned_attendance_status !== 'assigned') errors.push({ field: 'planned_attendance_status', code: 'INVALID_ENUM', message: 'Planned attendance status must be assigned for a roster import.' });
  const matches = normalizedPayload.student_identifier ? importRepository.usersByIdentifier(user.school_id, normalizedPayload.student_identifier) : [];
  let identityStatus = 'unmatched', resolvedUserId = null;
  if (matches.length === 1) {
    identityStatus = 'matched'; resolvedUserId = matches[0].user_id;
    if (normalizedPayload.student_name && ![matches[0].name_en,matches[0].name_zh].includes(normalizedPayload.student_name)) warnings.push({ field: 'student_name', code: 'NAME_MISMATCH', message: `Entered name does not match ${matches[0].name_en}.` });
  } else if (matches.length > 1) {
    identityStatus = 'ambiguous'; errors.push({ field: 'student_identifier', code: 'AMBIGUOUS_IDENTITY', message: 'Student identifier matches more than one active student.' });
  } else if (normalizedPayload.student_identifier) errors.push({ field: 'student_identifier', code: 'UNKNOWN_IDENTITY', message: 'No active student in this school matches the identifier.' });
  return {
    id: `IR-DEMO-${randomUUID()}`,
    rowNumber,
    sourceRecordKey: normalizedPayload.source_record_key || `row-${rowNumber}`,
    originalPayload: raw,
    normalizedPayload,
    hash: hash(JSON.stringify(normalizedPayload)),
    identityStatus,
    validationStatus: errors.length ? 'invalid' : 'valid',
    errors,
    warnings,
    resolvedUserId,
  };
}

function validateRows(user, rows) {
  validateHeaders(rows);
  const counts = new Map();
  for (const row of rows) {
    const key = String(row.source_record_key || '').trim();
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  const duplicateKeys = new Set([...counts].filter(([, count]) => count > 1).map(([key]) => key));
  return rows.map((row, index) => normalizeRecord(user, row, index + 2, duplicateKeys));
}

function normalizeCatalogueRecord(user, raw, rowNumber, duplicateKeys) {
  const normalizedPayload = Object.fromEntries(catalogueFields.map(field => [field, clean(raw[field])]));
  normalizedPayload.lifecycle_action = (normalizedPayload.lifecycle_action || 'upsert').toLowerCase();
  normalizedPayload.media_capture_expected = ['1','true','yes'].includes(normalizedPayload.media_capture_expected.toLowerCase()) ? '1' : '0';
  const errors = [], warnings = [];
  if (!normalizedPayload.source_record_key || normalizedPayload.source_record_key.length > 200) errors.push({ field: 'source_record_key', code: 'REQUIRED_OR_TOO_LONG', message: 'Source record key must contain 1–200 characters.' });
  if (duplicateKeys.has(normalizedPayload.source_record_key)) errors.push({ field: 'source_record_key', code: 'DUPLICATE_SOURCE_KEY', message: 'Source record key is duplicated in this batch.' });
  if (!normalizedPayload.activity_id) errors.push({ field: 'activity_id', code: 'REQUIRED', message: 'Existing activity_id is required. New activity creation is not enabled in this POC contract.' });
  if (!['upsert','disable','restore'].includes(normalizedPayload.lifecycle_action)) errors.push({ field: 'lifecycle_action', code: 'INVALID_ENUM', message: 'Lifecycle action must be upsert, disable or restore.' });
  const activity = normalizedPayload.activity_id ? activityRepository.activity(normalizedPayload.activity_id) : null;
  if (normalizedPayload.activity_id && (!activity || activity.school_id !== user.school_id)) errors.push({ field: 'activity_id', code: 'UNKNOWN_ACTIVITY', message: 'No activity in this school matches the activity_id.' });
  const current = activity?.revisions?.[0];
  normalizedPayload.current_operational_status = activity?.operational_status || normalizedPayload.current_operational_status;
  normalizedPayload.current_revision_number = current ? String(current.revision_number) : '';
  const expectedRevision = Number(normalizedPayload.expected_revision_number);
  if (!Number.isInteger(expectedRevision) || expectedRevision < 1) errors.push({ field: 'expected_revision_number', code: 'INVALID_REVISION', message: 'Expected revision number must be a positive integer.' });
  else if (current && expectedRevision !== current.revision_number) errors.push({ field: 'expected_revision_number', code: 'STALE_REVISION', message: `The latest revision is ${current.revision_number}; export a fresh file before committing changes.` });
  const ownerMatches = normalizedPayload.owner_staff_number ? importRepository.staffByIdentifier(user.school_id, normalizedPayload.owner_staff_number) : [];
  if (!normalizedPayload.owner_staff_number) errors.push({ field: 'owner_staff_number', code: 'REQUIRED', message: 'Current owner staff number is required.' });
  else if (ownerMatches.length !== 1) errors.push({ field: 'owner_staff_number', code: ownerMatches.length ? 'AMBIGUOUS_OWNER' : 'UNKNOWN_OWNER', message: 'Owner must match exactly one active staff member in this school.' });
  if (!normalizedPayload.title_en || normalizedPayload.title_en.length > 200) errors.push({ field: 'title_en', code: 'REQUIRED_OR_TOO_LONG', message: 'English title must contain 1–200 characters.' });
  if (!normalizedPayload.description_en || normalizedPayload.description_en.length > 20_000) errors.push({ field: 'description_en', code: 'REQUIRED_OR_TOO_LONG', message: 'English description is required and may contain at most 20,000 characters.' });
  if (!normalizedPayload.start_at || !normalizedPayload.end_at || normalizedPayload.start_at > normalizedPayload.end_at) errors.push({ field: 'start_at', code: 'INVALID_DATE_RANGE', message: 'Start and end are required, and start must not be after end.' });
  if (normalizedPayload.lifecycle_action === 'upsert' && activity?.operational_status === 'disabled') errors.push({ field: 'lifecycle_action', code: 'RESTORE_REQUIRED', message: 'Restore the disabled activity by an explicit restore action before editing it.' });
  const reference = activityRepository.referenceData(user.school_id);
  if (normalizedPayload.subject_id && !reference.subjects.some(item => item.subject_id === normalizedPayload.subject_id)) errors.push({ field: 'subject_id', code: 'UNKNOWN_SUBJECT', message: 'Subject is not active in this school.' });
  if (normalizedPayload.department_id && !reference.departments.some(item => item.department_id === normalizedPayload.department_id)) errors.push({ field: 'department_id', code: 'UNKNOWN_DEPARTMENT', message: 'Department is not active in this school.' });
  if (normalizedPayload.requested_form_version_id && !reference.forms.some(item => item.form_version_id === normalizedPayload.requested_form_version_id)) errors.push({ field: 'requested_form_version_id', code: 'FORM_NOT_PUBLISHED', message: 'Form version must be approved and published.' });
  if (normalizedPayload.start_at && normalizedPayload.end_at && normalizedPayload.start_at <= normalizedPayload.end_at) {
    const periods = activityRepository.resolvePeriod(user.school_id, normalizedPayload.start_at.slice(0,10), normalizedPayload.end_at.slice(0,10));
    if (periods.length !== 1) errors.push({ field: 'start_at', code: 'PERIOD_EXCEPTION_REQUIRED', message: 'Activity dates must fit exactly one configured reporting period.' });
  }
  const currentValues = current ? {
    title_en: clean(current.title_en), title_zh: clean(current.title_zh), description_en: clean(current.description_en), description_zh: clean(current.description_zh),
    activity_type: clean(current.activity_type), subject_id: clean(current.subject_id), department_id: clean(current.department_id), start_at: clean(current.start_at), end_at: clean(current.end_at),
    owner_staff_number: clean(ownerMatches[0]?.user_id === current.owner_user_id ? normalizedPayload.owner_staff_number : importRepository.staffByIdentifier(user.school_id, normalizedPayload.owner_staff_number)[0]?.staff_number),
    requested_form_version_id: clean(current.requested_form_version_id), media_capture_expected: String(Number(current.media_capture_expected || 0)), location: clean(current.location),
  } : {};
  if (current && ownerMatches.length === 1) {
    const currentOwner = importRepository.staffByIdentifier(user.school_id, normalizedPayload.owner_staff_number).find(item => item.user_id === current.owner_user_id);
    currentValues.owner_staff_number = currentOwner ? normalizedPayload.owner_staff_number : `user:${current.owner_user_id}`;
  }
  const changeFields = normalizedPayload.lifecycle_action === 'upsert' && current ? catalogueMaterialFields.filter(field => normalizedPayload[field] !== currentValues[field]) : [];
  normalizedPayload.change_fields = changeFields.join(',');
  if (normalizedPayload.lifecycle_action === 'upsert' && !changeFields.length) warnings.push({ field: 'activity_id', code: 'NO_CHANGE', message: 'This row matches the latest revision; commit will record a no-op link.' });
  if (normalizedPayload.lifecycle_action === 'disable' && activity?.operational_status === 'disabled') warnings.push({ field: 'lifecycle_action', code: 'NO_CHANGE', message: 'Activity is already disabled; commit will be idempotent.' });
  if (normalizedPayload.lifecycle_action === 'restore' && activity?.operational_status !== 'disabled') warnings.push({ field: 'lifecycle_action', code: 'NO_CHANGE', message: 'Activity is not disabled; commit will be idempotent.' });
  if ((changeFields.length || normalizedPayload.lifecycle_action !== 'upsert') && !normalizedPayload.change_reason) errors.push({ field: 'change_reason', code: 'REQUIRED', message: 'A reason is required for a material or lifecycle change.' });
  return {
    id: `IR-DEMO-${randomUUID()}`,
    rowNumber,
    sourceRecordKey: normalizedPayload.source_record_key || `row-${rowNumber}`,
    originalPayload: raw,
    normalizedPayload,
    hash: hash(JSON.stringify(normalizedPayload)),
    identityStatus: ownerMatches.length === 1 ? 'matched' : ownerMatches.length > 1 ? 'ambiguous' : 'unmatched',
    validationStatus: errors.length ? 'invalid' : 'valid',
    currentStatus: errors.length ? 'needs_resolution' : changeFields.length || normalizedPayload.lifecycle_action !== 'upsert' ? 'ready' : 'no_change',
    errors,
    warnings,
    resolvedUserId: ownerMatches.length === 1 ? ownerMatches[0].user_id : null,
  };
}

function validateCatalogueRows(user, rows) {
  validateCatalogueHeaders(rows);
  const counts = new Map();
  for (const row of rows) {
    const key = clean(row.source_record_key);
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  const duplicateKeys = new Set([...counts].filter(([, count]) => count > 1).map(([key]) => key));
  return rows.map((row, index) => normalizeCatalogueRecord(user, row, index + 2, duplicateKeys));
}

function batchStatus(records) { return records.some(item => item.validationStatus === 'invalid') ? 'needs_resolution' : 'ready_to_commit'; }

async function stage(user, input) {
  const activity = requireActivityAccess(user, input.activityId, 'import.run');
  const contract = importRepository.contract();
  if (!contract) fail(503, 'Activity roster import contract is unavailable', 'IMPORT_CONTRACT_UNAVAILABLE');
  const source = importRepository.source(input.sourceId);
  if (!source || source.school_id !== user.school_id || source.status !== 'active') fail(400, 'Select an active source system');
  const contentHash = hash(input.bytes);
  const existing = importRepository.findIdempotent({ schoolId: user.school_id, sourceId: source.source_system_id, contractId: contract.import_contract_version_id, targetId: activity.activity_id, hash: contentHash });
  if (existing) return importRepository.detail(existing.import_batch_id);
  const parsed = await parseStructuredInput({ channel: input.channel, buffer: input.bytes });
  const records = validateRows(user, parsed);
  const now = new Date().toISOString(), id = `IB-DEMO-${randomUUID()}`;
  importRepository.createBatch({
    id, schoolId: user.school_id, sourceId: source.source_system_id, contractId: contract.import_contract_version_id,
    targetType: 'activity', targetId: activity.activity_id, sourceParentKey: input.sourceParentKey,
    channel: input.channel, relativePath: null, fileName: input.fileName, contentType: input.contentType,
    hash: contentHash, sourceUploadedAt: input.sourceUploadedAt, uploadedBy: input.uploadedBy,
    requestedBy: input.requestedBy, serviceActor: input.serviceActor, receivedAt: now, parsedAt: now, validatedAt: now,
    status: batchStatus(records), declaredStatus: null, parserName: input.channel === 'xlsx' ? 'exceljs' : input.channel === 'csv' ? 'csv-parse' : 'json', parserVersion: '1', actorId: user.user_id,
  }, records, { id: `IBE-DEMO-${randomUUID()}`, code: 'import.staged', actorId: user.user_id, reason: 'Normalized and validated into the activity roster staging contract.', details: { channel: input.channel, targetActivityId: activity.activity_id }, at: now });
  identityRepository.audit(user.school_id, user.user_id, 'import.staged', 'import_batch', id, `Activity ${activity.activity_id}; channel ${input.channel}`);
  return importRepository.detail(id);
}

async function stageCatalogue(user, file) {
  requireCapability(user, 'import.run', { school_id: user.school_id });
  if (!file) fail(400, 'Choose one CSV or XLSX activity catalogue file', 'IMPORT_FILE_REQUIRED');
  const extension = file.originalname.toLowerCase().split('.').pop();
  const channel = extension === 'csv' ? 'csv' : extension === 'xlsx' ? 'xlsx' : null;
  if (!channel) fail(400, 'Activity catalogue files must be .csv or .xlsx', 'IMPORT_FILE_TYPE_INVALID');
  const contract = importRepository.contract('activity_catalogue');
  if (!contract) fail(503, 'Activity catalogue import contract is unavailable', 'IMPORT_CONTRACT_UNAVAILABLE');
  const source = importRepository.source('SRC-BHSS-PLATFORM');
  if (!source || source.school_id !== user.school_id || source.status !== 'active') fail(400, 'The platform import source is disabled');
  const contentHash = hash(file.buffer);
  const existing = importRepository.findIdempotent({ schoolId: user.school_id, sourceId: source.source_system_id, contractId: contract.import_contract_version_id, targetId: null, hash: contentHash });
  if (existing) return importRepository.detail(existing.import_batch_id);
  const parsed = await parseStructuredInput({ channel, buffer: file.buffer });
  const records = validateCatalogueRows(user, parsed);
  const now = new Date().toISOString(), id = `IB-DEMO-${randomUUID()}`;
  importRepository.createBatch({
    id, schoolId: user.school_id, sourceId: source.source_system_id, contractId: contract.import_contract_version_id,
    targetType: 'activity_catalogue', targetId: null, channel, relativePath: null, fileName: file.originalname, contentType: file.mimetype,
    hash: contentHash, sourceUploadedAt: null, uploadedBy: user.user_id, requestedBy: null, serviceActor: null,
    receivedAt: now, parsedAt: now, validatedAt: now, status: batchStatus(records), declaredStatus: null,
    parserName: channel === 'xlsx' ? 'exceljs' : 'csv-parse', parserVersion: '1', actorId: user.user_id,
  }, records, { id: `IBE-DEMO-${randomUUID()}`, code: 'activity_catalogue.staged', actorId: user.user_id, reason: 'Staged as a non-destructive delta. Activities absent from the file are unchanged.', details: { channel, importMode: 'delta', missingRowEffect: 'no_change' }, at: now });
  identityRepository.audit(user.school_id, user.user_id, 'activity_catalogue.staged', 'import_batch', id, `Delta catalogue; ${records.length} explicit rows`);
  return importRepository.detail(id);
}

export const importService = {
  workspace(user) {
    if (!canUseAny(user, ['import.view','import.source.manage'])) fail(403, 'Missing capability: import.view');
    const canManageSources = capabilityDecision(user, 'import.source.manage', { school_id: user.school_id }).allowed;
    const batches = importRepository.listBatches(user.school_id).filter(batch => {
      if (canManageSources) return true;
      if (!batch.target_entity_id) return false;
      try { requireActivityAccess(user, batch.target_entity_id, 'import.view'); return true; } catch { return false; }
    });
    const activities = activityRepository.all(user.school_id).filter(row => row.latest_publication_status !== 'published').filter(row => {
      try { requireActivityAccess(user, row.activity_id, 'import.run'); return true; } catch { return false; }
    }).map(row => ({ activity_id: row.activity_id, title_en: row.latest_title, title_zh: row.latest_title_zh, operational_status: row.operational_status }));
    const sources = importRepository.sources(user.school_id).map(source => ({ ...source, connector_available: source.connector_type !== 'approved_json_api' || Boolean(process.env.TIME_INFINITY_ROSTER_BASE_URL?.trim()) }));
    return { sources, batches, activities, access: { canManageSources, canManageActivityCatalogue: capabilityDecision(user, 'import.run', { school_id: user.school_id }).allowed, canExportActivityCatalogue: capabilityDecision(user, 'import.export', { school_id: user.school_id }).allowed } };
  },
  detail(user, batchId) { return requireBatchAccess(user, batchId); },
  exportActivityCatalogue(user) {
    requireCapability(user, 'import.export', { school_id: user.school_id });
    const rows = importRepository.activityCatalogueRows(user.school_id).map(row => ({
      source_record_key: `platform:${row.activity_id}`,
      activity_id: row.activity_id,
      expected_revision_number: row.revision_number,
      current_operational_status: row.operational_status,
      title_en: row.title_en,
      title_zh: row.title_zh || '',
      description_en: row.description_en,
      description_zh: row.description_zh || '',
      activity_type: row.activity_type || '',
      subject_id: row.subject_id || '',
      department_id: row.department_id || '',
      start_at: row.start_at || '',
      end_at: row.end_at || '',
      owner_staff_number: row.owner_staff_number || '',
      requested_form_version_id: row.requested_form_version_id || '',
      media_capture_expected: Number(row.media_capture_expected || 0),
      location: row.location || '',
      lifecycle_action: 'upsert',
      change_reason: '',
    }));
    const content = [catalogueFields.join(','), ...rows.map(row => catalogueFields.map(field => csvCell(row[field])).join(','))].join('\n');
    identityRepository.audit(user.school_id, user.user_id, 'activity_catalogue.exported', 'school', user.school_id, `Editable delta template; ${rows.length} rows; original author omitted`);
    return { fileName: `activity-catalogue-${new Date().toISOString().slice(0,10)}.csv`, content, contractCode: 'activity_catalogue', contractVersion: '1.0', importMode: 'delta', missingRowEffect: 'no_change', authorIncluded: false };
  },
  uploadActivityCatalogue(user, file) { return stageCatalogue(user, file); },
  async upload(user, file, fields) {
    if (!file) fail(400, 'Choose one CSV or XLSX file', 'IMPORT_FILE_REQUIRED');
    if (!fields.activityId) fail(400, 'Choose an activity before uploading');
    const extension = file.originalname.toLowerCase().split('.').pop();
    const channel = extension === 'csv' ? 'csv' : extension === 'xlsx' ? 'xlsx' : null;
    if (!channel) fail(400, 'Activity roster files must be .csv or .xlsx', 'IMPORT_FILE_TYPE_INVALID');
    return stage(user, { activityId: fields.activityId, sourceId: 'SRC-BHSS-PLATFORM', channel, bytes: file.buffer, fileName: file.originalname, contentType: file.mimetype, uploadedBy: user.user_id });
  },
  async runConnector(user, sourceId, input) {
    if (!input.activityId || !input.sourceParentKey?.trim()) fail(400, 'Choose an activity and enter the source activity key');
    requireActivityAccess(user, input.activityId, 'import.run');
    const source = importRepository.source(sourceId);
    if (!source || source.school_id !== user.school_id || source.status !== 'active' || source.connector_type !== 'approved_json_api') fail(404, 'Active connector not found');
    const result = await fetchTimeInfinityRoster(source, input.sourceParentKey.trim());
    return stage(user, { activityId: input.activityId, sourceId, sourceParentKey: input.sourceParentKey.trim(), channel: 'connector_json', bytes: result.bytes, fileName: `${input.sourceParentKey.trim()}.json`, contentType: 'application/json', sourceUploadedAt: result.sourceUploadedAt || result.retrievedAt, requestedBy: user.user_id, serviceActor: source.source_code });
  },
  correct(user, batchId, recordId, input) {
    const batch = requireBatchAccess(user, batchId, 'import.exception.resolve');
    const record = importRepository.record(recordId);
    if (!record || record.import_batch_id !== batchId) fail(404, 'Import record not found');
    if (batch.committed_at || batch.disabled_at) fail(400, 'Committed or disabled batches cannot be corrected in place');
    const allowedCorrections = batch.contract_code === 'activity_catalogue' ? catalogueCorrectableFields : correctableFields;
    if (!allowedCorrections.has(input.fieldName) || input.afterValue == null || !input.reason?.trim()) fail(400, 'Choose a correctable field, replacement value and reason');
    const payload = { ...record.normalizedPayload, [input.fieldName]: String(input.afterValue).trim() };
    const validated = batch.contract_code === 'activity_catalogue' ? normalizeCatalogueRecord(user, payload, record.row_number, new Set()) : normalizeRecord(user, payload, record.row_number, new Set());
    const at = new Date().toISOString();
    importRepository.updateRecordAfterCorrection({ ...validated, importRecordId: recordId }, { id: `IRC-DEMO-${randomUUID()}`, fieldName: input.fieldName, beforeValue: String(record.normalizedPayload[input.fieldName] ?? ''), afterValue: String(input.afterValue).trim(), originalStudentId: record.originalPayload.student_identifier || record.originalPayload.owner_staff_number || null, resolvedStudentId: validated.resolvedUserId || null, reason: input.reason.trim(), actorId: user.user_id, at }, { batchId, actorId: user.user_id });
    identityRepository.audit(user.school_id, user.user_id, 'import.record.corrected', 'import_record', recordId, input.reason.trim());
    return importRepository.detail(batchId);
  },
  decide(user, batchId, recordId, input) {
    const batch = requireBatchAccess(user, batchId, 'import.exception.resolve');
    const record = importRepository.record(recordId);
    if (!record || record.import_batch_id !== batchId) fail(404, 'Import record not found');
    if (!['exclude','restore'].includes(input.decision) || !input.reason?.trim()) fail(400, 'Select exclude or restore and provide a reason');
    if (input.decision === 'restore' && record.current_decision !== 'excluded') fail(400, 'Only an excluded row can be restored');
    if (input.decision === 'restore' && record.validation_status !== 'valid') fail(400, 'Correct and validate this row before restoring it');
    const at = new Date().toISOString();
    importRepository.decideRecord(recordId, input.decision, user.user_id, input.reason.trim(), at, `IRD-DEMO-${randomUUID()}`);
    identityRepository.audit(user.school_id, user.user_id, `import.record.${input.decision}`, 'import_record', recordId, input.reason.trim());
    return importRepository.detail(batchId);
  },
  commit(user, batchId, input) {
    const batch = requireBatchAccess(user, batchId, 'import.commit');
    if (!input.reason?.trim()) fail(400, 'A commit reason is required');
    if (batch.processing_status !== 'ready_to_commit' || batch.committed_at || batch.disabled_at) fail(400, 'Resolve or exclude every invalid row before commit');
    const at = new Date().toISOString();
    let actions;
    if (batch.contract_code === 'activity_catalogue') {
      requireCapability(user, 'import.commit', { school_id: user.school_id });
      actions = importRepository.commitActivityCatalogue(batchId, user.user_id, input.reason.trim(), at);
    } else {
      const activity = requireActivityAccess(user, batch.target_entity_id, 'import.commit');
      const latest = activity.revisions[0];
      if (latest.publication_status === 'published') fail(400, 'Published activity rosters require a successor working revision before import commit.');
      actions = importRepository.commitRoster(batchId, user.user_id, input.reason.trim(), at);
    }
    importRepository.addEvent({ id: `IBE-DEMO-${randomUUID()}`, batchId, fromStatus: batch.processing_status, toStatus: 'committed', code: 'import.committed', actorId: user.user_id, reason: input.reason.trim(), details: { actions }, at });
    identityRepository.audit(user.school_id, user.user_id, 'import.committed', 'import_batch', batchId, input.reason.trim());
    return importRepository.detail(batchId);
  },
  disableBatch(user, batchId, input) {
    const batch = requireBatchAccess(user, batchId, 'import.commit');
    if (!input.reason?.trim()) fail(400, 'A disable reason is required');
    if (batch.committed_at) fail(400, 'Committed batches remain immutable; exclude a linked row and review its impact instead');
    const at = new Date().toISOString();
    importRepository.disableBatch(batchId, user.user_id, input.reason.trim(), at);
    importRepository.addEvent({ id: `IBE-DEMO-${randomUUID()}`, batchId, fromStatus: batch.processing_status, toStatus: 'disabled', code: 'import.disabled', actorId: user.user_id, reason: input.reason.trim(), at });
    identityRepository.audit(user.school_id, user.user_id, 'import.disabled', 'import_batch', batchId, input.reason.trim());
    return importRepository.detail(batchId);
  },
  setSourceStatus(user, sourceId, status, input) {
    requireCapability(user, 'import.source.manage', { school_id: user.school_id });
    const source = importRepository.source(sourceId);
    if (!source || source.school_id !== user.school_id) fail(404, 'Source system not found');
    if (!['active','disabled'].includes(status) || !input.reason?.trim()) fail(400, 'Provide a reason for changing source availability');
    const at = new Date().toISOString();
    importRepository.setSourceStatus(sourceId, status, user.user_id, input.reason.trim(), at);
    identityRepository.audit(user.school_id, user.user_id, `source_system.${status}`, 'source_system', sourceId, input.reason.trim());
    return this.workspace(user);
  },
};
