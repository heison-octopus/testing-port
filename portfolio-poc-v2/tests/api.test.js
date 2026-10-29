import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { parse as parseCsv } from 'csv-parse/sync';
import ExcelJS from 'exceljs';

const root = resolve(import.meta.dirname, '..');
const temporary = mkdtempSync(join(tmpdir(), 'bhss-poc-v2-test-'));
const database = join(temporary, 'test.sqlite');
const port = 3297;
const llmPort = 3296;
const base = `http://127.0.0.1:${port}/api/v2`;
let server;
let llm;
let llmMode = 'success';

before(async () => {
  llm = createServer(async (req, res) => {
    if (req.url === '/activity-rosters/TI-ACT-8812') {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ records: [
        { source_record_key: 'TI-ROSTER-8812-S1001', student_identifier: 'S1001', student_name: 'Alex Chan', group_code: 'P1', planned_attendance_status: 'assigned' },
        { source_record_key: 'TI-ROSTER-8812-S1003', student_identifier: 'S1003', student_name: 'Chris Wong', group_code: 'P1', planned_attendance_status: 'assigned' },
      ] }));
      return;
    }
    if (req.url === '/v1/models') {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ data: [{ id: 'fixture-model', owned_by: 'browser-fixture', max_model_len: 32768 }] }));
      return;
    }
    if (llmMode === 'error') { res.writeHead(500, { 'content-type': 'application/json' }); res.end(JSON.stringify({ error: 'fixture failure' })); return; }
    let raw = '';
    for await (const chunk of req) raw += chunk;
    const input = raw ? JSON.parse(raw) : {};
    if (input.stream) {
      res.writeHead(200, { 'content-type': 'text/event-stream' });
      res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: 'Hello from ' } }] })}\n\n`);
      await new Promise(resolveWait => setTimeout(resolveWait, 15));
      res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: 'fixture model.' } }] })}\n\n`);
      res.write(`data: ${JSON.stringify({ choices: [], usage: { prompt_tokens: 12, completion_tokens: 4, total_tokens: 16 } })}\n\n`);
      res.end('data: [DONE]\n\n');
      return;
    }
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ textEn: 'Generated from frozen evidence.', textZh: '根據已凍結佐證生成。' }) } }] }));
  });
  await new Promise(resolveReady => llm.listen(llmPort, '127.0.0.1', resolveReady));
  server = spawn(process.execPath, ['--experimental-sqlite', 'server/index.js'], {
    cwd: root,
    env: {
      ...process.env,
      PORT: String(port),
      POC_V2_DB: database,
      POC_V2_CSV_DIR: resolve(root, '../output/import-examples'),
      LOCAL_LLM_BASE_URL: `http://127.0.0.1:${llmPort}/v1`,
      LOCAL_LLM_API_KEY: 'test-only-key',
      LOCAL_LLM_MODEL: 'fixture-model',
      TIME_INFINITY_ROSTER_BASE_URL: `http://127.0.0.1:${llmPort}/`,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  await new Promise((resolveReady, reject) => {
    const timer = setTimeout(() => reject(new Error('API test server did not start')), 10_000);
    server.stdout.on('data', chunk => {
      if (String(chunk).includes('Playground v2 API')) { clearTimeout(timer); resolveReady(); }
    });
    server.stderr.on('data', chunk => {
      const message = String(chunk);
      if (!message.includes('ExperimentalWarning')) process.stderr.write(message);
    });
    server.on('exit', code => reject(new Error(`API test server exited with ${code}`)));
  });
});

after(() => {
  server?.kill('SIGTERM');
  llm?.close();
  rmSync(temporary, { recursive: true, force: true });
});

async function signIn(userId) {
  const response = await fetch(`${base}/demo/session`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ userId }) });
  assert.equal(response.status, 200);
  assert.match(response.headers.get('set-cookie'), /HttpOnly; SameSite=Strict/);
  const cookie = response.headers.get('set-cookie').split(';')[0];
  const { key } = await response.json();
  const request = async (path, options = {}) => {
    const headers = { cookie, 'x-request-key': key, ...options.headers };
    if (!(options.body instanceof FormData) && !headers['content-type']) headers['content-type'] = 'application/json';
    const result = await fetch(`${base}${path}`, { ...options, headers });
    return { status: result.status, body: await result.json() };
  };
  request.cookie = cookie;
  request.key = key;
  return request;
}

function asCsv(headers, rows) {
  const cell = value => `"${String(value ?? '').replaceAll('"', '""')}"`;
  return [headers.join(','), ...rows.map(row => headers.map(header => cell(row[header])).join(','))].join('\n');
}

test('authentication requires an opaque session and matching request key', async () => {
  const missing = await fetch(`${base}/session`);
  assert.equal(missing.status, 401);
  assert.equal((await missing.json()).code, 'AUTH_REQUIRED');

  const unknown = await fetch(`${base}/demo/session`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ userId: 'UNKNOWN' }) });
  assert.equal(unknown.status, 400);

  const teacher = await signIn('USR-T-001');
  const wrongKey = await fetch(`${base}/session`, { headers: { cookie: teacher.cookie, 'x-request-key': 'wrong' } });
  assert.equal(wrongKey.status, 403);
  assert.equal((await wrongKey.json()).code, 'INVALID_REQUEST_KEY');
  assert.equal((await teacher('/session')).status, 200);
  assert.equal((await teacher('/logout', { method: 'POST' })).status, 200);
  assert.equal((await teacher('/session')).status, 401);
});

test('server session drives the complete role navigation matrix', async () => {
  const expected = {
    'USR-ADM-001': { activities: false, responses: false, assessments: false, approvals: false, portfolios: false, portfolioEditor: false, portfolioReview: false, memorable: false, imports: true, aiDrafts: false, staff: true, policy: true, catalogue: true },
    'USR-ST-001': { activities: true, responses: false, assessments: false, approvals: true, portfolios: true, portfolioEditor: false, portfolioReview: true, memorable: false, imports: true, aiDrafts: true, staff: true, policy: false, catalogue: false },
    'USR-T-001': { activities: true, responses: false, assessments: true, approvals: true, portfolios: true, portfolioEditor: false, portfolioReview: true, memorable: false, imports: true, aiDrafts: true, staff: true, policy: false, catalogue: false },
    'USR-T-002': { activities: true, responses: false, assessments: true, approvals: false, portfolios: false, portfolioEditor: false, portfolioReview: false, memorable: false, imports: true, aiDrafts: false, staff: false, policy: false, catalogue: false },
    'USR-S-001': { activities: true, responses: true, assessments: false, approvals: false, portfolios: true, portfolioEditor: true, portfolioReview: false, memorable: true, imports: false, aiDrafts: false, staff: false, policy: false, catalogue: false },
  };
  for (const [userId, pageAccess] of Object.entries(expected)) {
    const request = await signIn(userId);
    const session = await request('/session');
    assert.equal(session.status, 200);
    assert.deepEqual(session.body.pageAccess, pageAccess, userId);
  }
});

test('the import ledger preserves source custody and keeps students outside the ingestion boundary', async () => {
  const admin = await signIn('USR-ADM-001');
  const ledger = await admin('/imports');
  assert.equal(ledger.status, 200);
  const seeded = ledger.body.batches.filter(item => item.import_batch_id.startsWith('SEED-'));
  assert.equal(seeded.length, 58);
  assert.ok(seeded.every(item => item.source_relative_path.startsWith('output/import-examples/')));
  assert.ok(seeded.every(item => item.seeded_at && /^[a-f0-9]{64}$/.test(item.content_sha256)));
  assert.ok(seeded.every(item => !item.source_relative_path.startsWith('/') && !item.source_relative_path.includes('..')));

  const student = await signIn('USR-S-001');
  assert.equal((await student('/imports')).status, 403);
  const forged = new FormData();
  forged.set('activityId', 'ACT-PRESS-001');
  forged.set('file', new Blob(['source_record_key,student_identifier\nFORGED,S1001\n'], { type: 'text/csv' }), 'forged.csv');
  assert.equal((await student('/imports/files', { method: 'POST', body: forged })).status, 403);
});

test('CSV roster rows stage, resolve, commit and remain auditable without hard deletion', async () => {
  const teacher = await signIn('USR-T-001');
  const workspace = await teacher('/imports');
  assert.equal(workspace.status, 200);
  assert.ok(workspace.body.activities.some(item => item.activity_id === 'ACT-PRESS-001'));

  const csv = [
    'source_record_key,student_identifier,student_name,group_code,planned_attendance_status',
    'CSV-S1001,S1001,Alex Chan,P1,assigned',
    'CSV-UNKNOWN,S1999,Chris Wong,P1,assigned',
  ].join('\n');
  const form = new FormData();
  form.set('activityId', 'ACT-PRESS-001');
  form.set('file', new Blob([csv], { type: 'text/csv' }), 'activity-roster.csv');
  const staged = await teacher('/imports/files', { method: 'POST', body: form });
  assert.equal(staged.status, 201);
  assert.equal(staged.body.processing_status, 'needs_resolution');
  assert.equal(staged.body.error_rows, 1);
  const unknown = staged.body.records.find(item => item.source_record_key === 'CSV-UNKNOWN');
  assert.equal(unknown.originalPayload.student_identifier, 'S1999');

  const corrected = await teacher(`/imports/${staged.body.import_batch_id}/records/${unknown.import_record_id}/corrections`, {
    method: 'POST',
    body: JSON.stringify({ fieldName: 'student_identifier', afterValue: 'S1003', reason: 'Matched the staged row against the same-school student register.' }),
  });
  assert.equal(corrected.status, 200);
  assert.equal(corrected.body.processing_status, 'ready_to_commit');
  assert.equal(corrected.body.records.find(item => item.import_record_id === unknown.import_record_id).originalPayload.student_identifier, 'S1999');
  assert.equal(corrected.body.records.find(item => item.import_record_id === unknown.import_record_id).corrections.length, 1);

  const first = corrected.body.records.find(item => item.source_record_key === 'CSV-S1001');
  const excluded = await teacher(`/imports/${staged.body.import_batch_id}/records/${first.import_record_id}/decisions`, {
    method: 'POST', body: JSON.stringify({ decision: 'exclude', reason: 'Exercise the reversible exclusion path before commit.' }),
  });
  assert.equal(excluded.body.excluded_rows, 1);
  const restored = await teacher(`/imports/${staged.body.import_batch_id}/records/${first.import_record_id}/decisions`, {
    method: 'POST', body: JSON.stringify({ decision: 'restore', reason: 'Confirmed the source row belongs in this activity roster.' }),
  });
  assert.equal(restored.body.excluded_rows, 0);
  assert.deepEqual(restored.body.records.find(item => item.import_record_id === first.import_record_id).decisions.map(item => item.decision), ['exclude', 'restore']);

  const committed = await teacher(`/imports/${staged.body.import_batch_id}/commit`, {
    method: 'POST', body: JSON.stringify({ reason: 'Validated both identities and reviewed the staged roster diff.' }),
  });
  assert.equal(committed.status, 200);
  assert.equal(committed.body.processing_status, 'committed');
  assert.equal(committed.body.committed_rows, 2);
  assert.ok(committed.body.records.every(item => item.links.length === 1));
  assert.equal((await teacher(`/imports/${staged.body.import_batch_id}/disable`, { method: 'POST', body: JSON.stringify({ reason: 'Attempted destructive replacement.' }) })).status, 400);

  const activity = await teacher('/activities/ACT-PRESS-001');
  assert.equal(activity.status, 200);
  assert.ok(activity.body.people.some(item => item.user_id === 'USR-S-003' && item.status === 'active'));

  const postCommitExclude = await teacher(`/imports/${staged.body.import_batch_id}/records/${unknown.import_record_id}/decisions`, {
    method: 'POST', body: JSON.stringify({ decision: 'exclude', reason: 'Source invalidated after commit; linked assignment now needs review.' }),
  });
  assert.equal(postCommitExclude.status, 200);
  assert.equal(postCommitExclude.body.records.find(item => item.import_record_id === unknown.import_record_id).links[0].reconciliation_status, 'needs_review');
});

test('allow-listed JSON uses the same activity roster contract as file ingestion', async () => {
  const teacher = await signIn('USR-T-001');
  const response = await teacher('/imports/connectors/SRC-TIME-INFINITY/runs', {
    method: 'POST',
    body: JSON.stringify({ activityId: 'ACT-PRESS-001', sourceParentKey: 'TI-ACT-8812' }),
  });
  assert.equal(response.status, 201);
  assert.equal(response.body.ingress_channel, 'connector_json');
  assert.equal(response.body.processing_status, 'ready_to_commit');
  assert.equal(response.body.service_actor_id, 'time_infinity');
  assert.equal(response.body.source_parent_key, 'TI-ACT-8812');
  assert.ok(response.body.records.every(item => Object.keys(item.normalizedPayload).sort().join(',') === 'group_code,planned_attendance_status,source_record_key,student_identifier,student_name'));
});

test('activity catalogue import is a non-destructive delta with revision, approval and soft-disable controls', async () => {
  const admin = await signIn('USR-ADM-001');
  const owner = await signIn('USR-T-002');
  const student = await signIn('USR-S-001');
  const exported = await admin('/imports/activity-catalogue/export');
  assert.equal(exported.status, 200);
  assert.equal(exported.body.importMode, 'delta');
  assert.equal(exported.body.missingRowEffect, 'no_change');
  assert.equal(exported.body.authorIncluded, false);
  assert(!exported.body.content.includes('created_by_user_id'));
  assert(!exported.body.content.includes('uploaded_by_user_id'));
  const rows = parseCsv(exported.body.content, { columns: true, skip_empty_lines: true });
  const headers = Object.keys(rows[0]);
  const sport = rows.find(row => row.activity_id === 'ACT-SPORT-001');
  const communicationBefore = await student('/activities/ACT-COMM-001');
  assert.equal(communicationBefore.status, 200);
  sport.title_en = 'Teamwork sports session — revised by catalogue';
  sport.change_reason = 'Corrected the staff-facing title through the audited catalogue delta.';
  const changedForm = new FormData();
  changedForm.set('file', new Blob([asCsv(headers, [sport])], { type: 'text/csv' }), 'activity-catalogue-change.csv');
  const staged = await admin('/imports/activity-catalogue/files', { method: 'POST', body: changedForm });
  assert.equal(staged.status, 201);
  assert.equal(staged.body.contract_code, 'activity_catalogue');
  assert.equal(staged.body.total_rows, 1);
  assert.equal(staged.body.processing_status, 'ready_to_commit');
  const committed = await admin(`/imports/${staged.body.import_batch_id}/commit`, { method: 'POST', body: JSON.stringify({ reason: 'Reviewed the explicit one-row delta; omitted activities remain unchanged.' }) });
  assert.equal(committed.status, 200);
  assert.equal(committed.body.records[0].links[0].commit_action, 'successor_revision_created');
  const changedActivity = await owner('/activities/ACT-SPORT-001');
  assert.equal(changedActivity.body.latestRevision.revision_number, 2);
  assert.equal(changedActivity.body.latestRevision.approval_status, 'draft');
  assert.equal(changedActivity.body.currentApprovedRevision.revision_number, 1);
  assert.equal(changedActivity.body.created_by_name, 'Wong Kai Ho');
  const studentStillOfficial = await student('/activities/ACT-SPORT-001');
  assert.equal(studentStillOfficial.body.latestRevision.revision_number, 1);
  assert.equal((await student('/activities/ACT-COMM-001')).body.latestRevision.title_en, communicationBefore.body.latestRevision.title_en);

  const stale = { ...sport, title_en: `${sport.title_en} stale` };
  const staleForm = new FormData();
  staleForm.set('file', new Blob([asCsv(headers, [stale])], { type: 'text/csv' }), 'activity-catalogue-stale.csv');
  const staleBatch = await admin('/imports/activity-catalogue/files', { method: 'POST', body: staleForm });
  assert.equal(staleBatch.body.processing_status, 'needs_resolution');
  assert(staleBatch.body.records[0].validationErrors.some(error => error.code === 'STALE_REVISION'));

  const latestExport = await admin('/imports/activity-catalogue/export');
  const latestRows = parseCsv(latestExport.body.content, { columns: true, skip_empty_lines: true });
  const disableRow = latestRows.find(row => row.activity_id === 'ACT-SPORT-001');
  disableRow.lifecycle_action = 'disable';
  disableRow.change_reason = 'Temporarily withdrawn from participant discovery for a source correction.';
  const excludedForm = new FormData();
  excludedForm.set('file', new Blob([asCsv(headers, [disableRow])], { type: 'text/csv' }), 'activity-catalogue-excluded-disable.csv');
  const excludedBatch = await admin('/imports/activity-catalogue/files', { method: 'POST', body: excludedForm });
  const excludedRecord = excludedBatch.body.records[0];
  await admin(`/imports/${excludedBatch.body.import_batch_id}/records/${excludedRecord.import_record_id}/decisions`, { method: 'POST', body: JSON.stringify({ decision: 'exclude', reason: 'Do not apply this staged row.' }) });
  await admin(`/imports/${excludedBatch.body.import_batch_id}/commit`, { method: 'POST', body: JSON.stringify({ reason: 'Committed an intentionally empty delta.' }) });
  assert.equal((await student('/activities/ACT-SPORT-001')).status, 200);

  const committedDisableRow = { ...disableRow, change_reason: 'Explicitly disable after the previously excluded preview was confirmed.' };
  const disableForm = new FormData();
  disableForm.set('file', new Blob([asCsv(headers, [committedDisableRow])], { type: 'text/csv' }), 'activity-catalogue-disable.csv');
  const disableBatch = await admin('/imports/activity-catalogue/files', { method: 'POST', body: disableForm });
  const disabled = await admin(`/imports/${disableBatch.body.import_batch_id}/commit`, { method: 'POST', body: JSON.stringify({ reason: 'Apply the explicit disable after preview.' }) });
  assert.equal(disabled.body.records[0].links[0].commit_action, 'disabled');
  assert.equal((await student('/activities/ACT-SPORT-001')).status, 404);
  assert(!(await student('/response-tasks')).body.some(task => task.activity_id === 'ACT-SPORT-001'));
  assert(!(await student('/memorable-activities?periodId=2026-27-P1')).body.eligibleActivities.some(item => item.activity_id === 'ACT-SPORT-001'));
  const staffAudit = await owner('/activities/ACT-SPORT-001');
  assert.equal(staffAudit.status, 200);
  assert.equal(staffAudit.body.operational_status, 'disabled');
  assert(staffAudit.body.lifecycleEvents.some(event => event.action === 'disable'));

  const restoreRow = { ...committedDisableRow, current_operational_status: 'disabled', lifecycle_action: 'restore', change_reason: 'Source correction completed; restore discovery by a new audited decision.' };
  const restoreForm = new FormData();
  restoreForm.set('file', new Blob([asCsv(headers, [restoreRow])], { type: 'text/csv' }), 'activity-catalogue-restore.csv');
  const restoreBatch = await admin('/imports/activity-catalogue/files', { method: 'POST', body: restoreForm });
  assert.equal(restoreBatch.body.processing_status, 'ready_to_commit');
  await admin(`/imports/${restoreBatch.body.import_batch_id}/commit`, { method: 'POST', body: JSON.stringify({ reason: 'Apply the explicit audited restore.' }) });
  assert.equal((await student('/activities/ACT-SPORT-001')).status, 200);
});

test('direct API calls are blocked even when a hidden UI action is forged', async () => {
  const student = await signIn('USR-S-001');
  for (const path of ['/staff', '/reference-data', '/approvals', '/policy', '/ai-drafts']) assert.equal((await student(path)).status, 403, path);
  assert.equal((await student('/portfolios/USR-S-002')).status, 404);
  assert.equal((await student('/activities', { method: 'POST', body: JSON.stringify({ titleEn: 'Forged', descriptionEn: 'Forbidden' }) })).status, 403);
  assert.equal((await student('/activities/ACT-SPORT-001/revisions', { method: 'POST', body: JSON.stringify({ descriptionEn: 'Forged', reason: 'No authority' }) })).status, 403);
  assert.equal((await student('/approvals/AASG-ACT-PRESS/decision', { method: 'POST', body: JSON.stringify({ outcome: 'approved', reason: 'Forged' }) })).status, 403);

  const administrator = await signIn('USR-ADM-001');
  assert.equal((await administrator('/policy')).status, 200);
  for (const path of ['/activities', '/approvals', '/portfolios', '/ai-drafts']) assert.equal((await administrator(path)).status, 403, path);

  const teacherTwo = await signIn('USR-T-002');
  for (const path of ['/staff', '/approvals', '/portfolios', '/ai-drafts', '/policy']) assert.equal((await teacherTwo(path)).status, 403, path);
});

test('student self and peer responses are named, revisioned and server-scoped', async () => {
  const alex = await signIn('USR-S-001');
  const tasks = await alex('/response-tasks');
  assert.equal(tasks.status, 200);
  const selfTask = tasks.body.find(item => item.assignment_recipient_id === 'AR-SELF-SPORT-S1');
  const peerTask = tasks.body.find(item => item.assignment_recipient_id === 'AR-PEER-PRA-002');
  assert.equal(selfTask.perspective, 'student_self_report');
  assert.equal(peerTask.subject_user_id, 'USR-S-002');
  assert.equal(peerTask.questions.length, 1);

  const bella = await signIn('USR-S-002');
  assert.equal((await bella(`/response-tasks/${peerTask.assignment_recipient_id}`)).status, 404);
  assert.equal((await alex('/assessment-workspace')).status, 403);
  assert.equal((await alex('/portfolio-editor/USR-S-002')).status, 404);

  const saved = await alex(`/response-tasks/${selfTask.assignment_recipient_id}/draft`, { method: 'POST', body: JSON.stringify({ answers: {
    student_significant_moment: 'I reorganised the team after our first plan failed.',
    student_learning: 'I learned that I can stay calm and ask for help.',
  } }) });
  assert.equal(saved.status, 200);
  assert.equal(saved.body.latestSubmission.content_status, 'draft');
  const submitted = await alex(`/response-tasks/${selfTask.assignment_recipient_id}/submit`, { method: 'POST' });
  assert.equal(submitted.status, 200);
  assert.equal(submitted.body.latestSubmission.content_status, 'submitted');
  assert.equal((await alex(`/response-tasks/${selfTask.assignment_recipient_id}/submit`, { method: 'POST' })).status, 400);

  const assessor = await signIn('USR-T-002');
  const detail = await assessor('/assessment-workspace/ACT-SPORT-001/USR-S-001');
  assert.equal(detail.status, 200);
  const source = detail.body.recipients.find(item => item.perspective === 'student_self_report').latestSubmission;
  assert.equal(source.content_status, 'submitted');
  assert.equal((await assessor(`/assessment-submissions/${source.assessment_submission_id}/review`, { method: 'POST', body: JSON.stringify({ outcome: 'approved', reason: 'The response is attributable and relevant to the activity.' }) })).status, 200);
  assert.equal((await alex(`/response-tasks/${selfTask.assignment_recipient_id}/draft`, { method: 'POST', body: JSON.stringify({ answers: { student_learning: 'Forged edit after approval.' } }) })).status, 400);
});

test('teacher assessment keeps self peer and teacher records separate without auto-publishing a step', async () => {
  const teacher = await signIn('USR-T-001');
  const assigned = await teacher('/assessment-workspace/ACT-COMM-001/peer-assignments', { method: 'POST', body: JSON.stringify({ subjectId: 'USR-S-001', reviewerId: 'USR-S-002' }) });
  assert.equal(assigned.status, 201);
  const bella = await signIn('USR-S-002');
  const peerTasks = await bella('/response-tasks');
  const named = peerTasks.body.find(item => item.perspective === 'peer_observation' && item.activity_id === 'ACT-COMM-001' && item.subject_user_id === 'USR-S-001');
  assert(named);
  const alex = await signIn('USR-S-001');
  assert.equal((await alex(`/response-tasks/${named.assignment_recipient_id}`)).status, 404);

  const assessor = await signIn('USR-T-002');
  assert.equal((await assessor('/assessment-workspace/ACT-COMM-001/USR-S-001')).status, 404);
  const invalid = await assessor('/assessment-workspace/ACT-SPORT-001/USR-S-001', { method: 'POST', body: JSON.stringify({ teacherStrength: 'A specific observed behaviour.', teacherDevelopment: 'A next area.', teacherSupport: 'A support strategy.', axisId: 'AX-SB-TEAMWORK', observedStep: 17, consistency: 4, observationComment: 'Out of range.' }) });
  assert.equal(invalid.status, 400);
  assert.match(invalid.body.error, /whole number from 1 to 16/);

  const before = await alex('/portfolio-view/USR-S-001');
  const teamworkBefore = before.body.skillSummary.find(item => item.axis_id === 'AX-SB-TEAMWORK');
  assert.equal(teamworkBefore.published_numeric_value, null);
  const sport = await assessor('/assessment-workspace/ACT-SPORT-001/USR-S-001');
  const selfSource = sport.body.recipients.find(item => item.perspective === 'student_self_report').latestSubmission;
  const created = await assessor('/assessment-workspace/ACT-SPORT-001/USR-S-001', { method: 'POST', body: JSON.stringify({
    teacherStrength: 'Alex reorganised roles after the first plan failed.',
    teacherDevelopment: 'Explain the reason for each role change more clearly.',
    teacherSupport: 'Use a short plan-check-adjust routine.',
    axisId: 'AX-SB-TEAMWORK', observedStep: 7, consistency: 4,
    observationComment: 'The behaviour and accepted self reflection support this teacher-confirmed candidate observation.',
    suggestedNextStep: 8, citedSubmissionIds: [selfSource.assessment_submission_id], reviewReason: 'Named activity assessment.',
  }) });
  assert.equal(created.status, 201);
  assert(created.body.observations.some(item => item.axis_id === 'AX-SB-TEAMWORK' && item.observed_step === 7 && item.included_in_aggregation === 0));
  const after = await alex('/portfolio-view/USR-S-001');
  assert.equal(after.body.skillSummary.find(item => item.axis_id === 'AX-SB-TEAMWORK').published_numeric_value, null);
});

test('memorable activity curation is separate from Portfolio editing and the official view', async () => {
  const student = await signIn('USR-S-001');
  const workspace = await student('/memorable-activities');
  assert.equal(workspace.status, 200);
  assert.equal(workspace.body.window.isOpen, true);
  assert(workspace.body.eligibleActivities.some(item => item.activity_id === 'ACT-SPORT-001'));
  assert.equal((await student('/memorable-activities', { method: 'POST', body: JSON.stringify({ activityId: 'ACT-SELF-001', reason: 'This unpublished source must not be selectable.' }) })).status, 400);

  const saved = await student('/memorable-activities', { method: 'POST', body: JSON.stringify({ activityId: 'ACT-SPORT-001', reason: 'This was when I learned to reorganise a team after a failed plan.', periodId: '2026-27-P1' }) });
  assert.equal(saved.status, 201);
  const selection = saved.body.selections.find(item => item.source_id === 'ACT-SPORT-001');
  assert.equal(selection.submission_status, 'draft');
  assert.equal((await student(`/memorable-activities/${selection.selection_id}/submit`, { method: 'POST' })).status, 200);

  const draft = await student('/portfolios/USR-S-001/drafts', { method: 'POST', body: JSON.stringify({ selfIntroduction: 'I listen, adapt and contribute to my team.', activityId: 'ACT-COMM-001', activityText: 'This legacy inline choice must be ignored.', periodId: '2026-27-P1' }) });
  assert.equal(draft.status, 201);
  const latest = draft.body.versions[0];
  assert(latest.items.some(item => item.source_type === 'proud_moment_selection' && item.source_id === selection.selection_id));
  assert(!latest.items.some(item => item.source_type === 'activity' && item.source_id === 'ACT-COMM-001'));
  const view = await student('/portfolio-view/USR-S-001');
  assert.equal(view.body.official.version.version_number, 1);
  assert.notEqual(view.body.official.version.portfolio_working_version_id, latest.portfolio_working_version_id);
});

test('model playground discovery and streaming remain protected by server permissions', async () => {
  const student = await signIn('USR-S-001');
  assert.equal((await student('/llm-playground/status')).status, 403);

  const teacher = await signIn('USR-T-001');
  const status = await teacher('/llm-playground/status');
  assert.equal(status.status, 200);
  assert.deepEqual(status.body.models, [{ id: 'fixture-model', ownedBy: 'browser-fixture', contextWindow: 32768 }]);
  assert.equal(status.body.configuredModel, 'fixture-model');
  assert.equal((await teacher('/llm-playground/chat', { method: 'POST', body: JSON.stringify({ model: 'missing-model', messages: [{ role: 'user', content: 'Hello' }] }) })).status, 400);

  const streamed = await fetch(`${base}/llm-playground/chat`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie: teacher.cookie, 'x-request-key': teacher.key },
    body: JSON.stringify({ model: 'fixture-model', messages: [{ role: 'user', content: 'Hello' }] }),
  });
  assert.equal(streamed.status, 200);
  assert.match(streamed.headers.get('content-type'), /text\/event-stream/);
  const body = await streamed.text();
  assert.match(body, /event: meta/);
  assert.match(body, /"contextWindow":32768/);
  assert.match(body, /Hello from/);
  assert.match(body, /"total_tokens":16/);
  assert.match(body, /event: done/);
});

test('staff filters keep positions, roles, capabilities and approval eligibility separate', async () => {
  const teacher = await signIn('USR-T-001');
  const session = await teacher('/session');
  assert.deepEqual(session.body.positions.map(item => item.position_code).sort(), ['mentoring_teacher', 'subject_teacher']);
  assert(session.body.roles.some(item => item.role_code === 'class_teacher'));

  const cases = [
    ['roleId=ROLE-CLASS-TEACHER&subjectId=SUB-ENG', ['USR-T-001']],
    ['positionId=POS-SUBJECT-TEACHER&departmentId=DEPT-LANG', ['USR-T-001','USR-T-002']],
    ['capabilityId=CAP-ACTIVITY-APPROVE&approvalEligible=true', ['USR-ST-001','USR-T-001']],
    ['groupId=GRP-ENG-TEACHERS', ['USR-ST-001','USR-T-001']],
    ['search=not-a-person', []],
  ];
  for (const [query, ids] of cases) {
    const result = await teacher(`/staff?${query}`);
    assert.equal(result.status, 200);
    assert.deepEqual(result.body.map(item => item.id).sort(), ids.sort(), query);
  }
});

test('explicit scoped deny wins while permitted activity rows remain visible', async () => {
  const teacher = await signIn('USR-T-002');
  const response = await teacher('/activities');
  assert.equal(response.status, 200);
  assert(response.body.items.some(item => item.activity_id === 'ACT-SPORT-001'));
  assert(!response.body.items.some(item => item.activity_id === 'ACT-PRESS-001'));
  assert.equal(response.body.access.canCreate, true);
});

test('activity identity remains stable across revision and named approval', async () => {
  const teacher = await signIn('USR-T-001');
  const invalid = await teacher('/activities', { method: 'POST', body: JSON.stringify({ titleEn: '', descriptionEn: '', subjectId: 'SUB-ENG', departmentId: 'DEPT-LANG' }) });
  assert.equal(invalid.status, 400);
  const crossPeriod = await teacher('/activities', { method: 'POST', body: JSON.stringify({
    titleEn: 'Invalid cross-period activity', descriptionEn: 'Must be split before submission.', subjectId: 'SUB-ENG', departmentId: 'DEPT-LANG', groupId: 'S1A-2026-27',
    startAt: '2026-12-18T09:00', endAt: '2027-01-04T10:00', formVersionId: 'FV-CORE-001', participantIds: ['USR-S-001'], vaskItemIds: ['AX-VASK-COMMUNICATION'], riskFlags: ['none'],
  }) });
  assert.equal(crossPeriod.status, 400);
  assert.equal(crossPeriod.body.code, 'ACTIVITY_PERIOD_EXCEPTION_REQUIRED');
  const created = await teacher('/activities', { method: 'POST', body: JSON.stringify({
    titleEn: 'English reflection lab', titleZh: '英文反思工作坊', descriptionEn: 'Initial description retained as revision one.', subjectId: 'SUB-ENG', departmentId: 'DEPT-LANG', groupId: 'S1A-2026-27',
    startAt: '2027-02-15T09:00', endAt: '2027-02-15T10:00', formVersionId: 'FV-CORE-001', participantIds: ['USR-S-001'], vaskItemIds: ['AX-VASK-COMMUNICATION'], riskFlags: ['none'],
  }) });
  assert.equal(created.status, 201);
  const activityId = created.body.activity_id;
  assert.equal(created.body.resolved_period_id, '2026-27-P2');
  assert.equal(created.body.people.filter(item => item.relationship_type === 'participant').length, 1);
  assert.equal(created.body.vaskItems[0].vask_item_id, 'AX-VASK-COMMUNICATION');

  const studentBeforePublication = await signIn('USR-S-001');
  assert(!((await studentBeforePublication('/activities')).body.items.some(item => item.activity_id === activityId)));

  assert.equal((await teacher(`/activities/${activityId}/revisions`, { method: 'POST', body: JSON.stringify({ descriptionEn: 'Missing reason.' }) })).status, 400);
  const revised = await teacher(`/activities/${activityId}/revisions`, { method: 'POST', body: JSON.stringify({ descriptionEn: 'Materially corrected description.', reason: 'Correct the activity brief before publication.' }) });
  assert.equal(revised.status, 201);
  assert.equal(revised.body.activity_id, activityId);
  assert.equal(revised.body.revisions[0].revision_number, 2);

  assert.equal((await teacher(`/activities/${activityId}/submit`, { method: 'POST', body: JSON.stringify({ reviewerId: 'USR-T-002' }) })).status, 400);
  const submitted = await teacher(`/activities/${activityId}/submit`, { method: 'POST', body: JSON.stringify({ reviewerId: 'USR-T-001', publisherId: 'USR-T-001' }) });
  assert.equal(submitted.status, 201);
  assert.equal((await teacher(`/activities/${activityId}/revisions`, { method: 'POST', body: JSON.stringify({ descriptionEn: 'Forbidden parallel successor.', reason: 'Pending review must remain locked.' }) })).status, 400);
  assert.equal((await teacher(`/approvals/${submitted.body.assignmentId}/decision`, { method: 'POST', body: JSON.stringify({ outcome: 'approved', reason: '' }) })).status, 400);
  assert.equal((await teacher(`/approvals/${submitted.body.assignmentId}/decision`, { method: 'POST', body: JSON.stringify({ outcome: 'approved', reason: 'Scope and description checked.' }) })).status, 200);

  const approvalQueue = await teacher('/approvals');
  const publication = approvalQueue.body.assignments.find(item => item.workflow_type === 'activity_publication' && item.target_id === activityId && item.status === 'assigned');
  assert.equal(publication.target_title, 'English reflection lab');
  assert.equal(publication.target_revision_number, 2);
  assert.equal(publication.target_owner_name, 'Chan Mei Ling');
  assert.equal((await teacher(`/approvals/${publication.approval_assignment_id}/decision`, { method: 'POST', body: JSON.stringify({ outcome: 'approved', reason: 'Approved revision released to assigned students.' }) })).status, 200);

  const list = await teacher('/activities');
  const activity = list.body.items.find(item => item.activity_id === activityId);
  assert.equal(activity.currentApprovedRevision.revision_number, 2);
  assert.equal(activity.latestRevision.activity_id, activityId);
  assert.equal(activity.latestRevision.publication_status, 'published');
  assert(activity.approvalHistory.some(item => item.workflow_type === 'activity_publication' && item.decision_reason === 'Approved revision released to assigned students.'));

  const studentAfterPublication = await studentBeforePublication('/activities');
  const official = studentAfterPublication.body.items.find(item => item.activity_id === activityId);
  assert.equal(official.latestRevision.revision_number, 2);
  assert.equal(official.people.length, 1);
  assert.equal(official.people[0].user_id, 'USR-S-001');
  assert.deepEqual(official.changeRequests, []);
  assert.deepEqual(official.approvalHistory, []);
});

test('activity builder resolves active VASK, group selections and a versioned questionnaire draft', async () => {
  const teacher = await signIn('USR-T-001');
  const reference = await teacher('/activities/reference-data');
  assert.equal(reference.status, 200);
  assert.equal(reference.body.activeLabelling.code, 'VASK');
  assert(reference.body.studentClasses.some(item => item.class_id === 'S1A-2026-27' && item.student_ids.includes('USR-S-001')));
  assert(reference.body.teacherGroups.some(item => item.staff_group_id === 'GRP-ENG-TEACHERS' && item.member_ids.includes('USR-ST-001')));
  assert(reference.body.questionBank.length > 0);

  const sourceQuestion = reference.body.questionBank[0];
  const created = await teacher('/activities', { method: 'POST', body: JSON.stringify({
    titleEn: 'VASK question builder', titleZh: 'VASK 題目建立器', descriptionEn: 'Test the active labelling and editable question workflow.',
    subjectId: 'SUB-ENG', departmentId: 'DEPT-LANG', groupId: 'S1A-2026-27', activityNature: 'non_academic', activitySetting: 'outside_school',
    startAt: '2027-02-22T09:00', endAt: '2027-02-22T11:00', formVersionId: 'FV-CORE-001', participantIds: ['USR-S-001','USR-S-002','USR-S-003'], teacherGroupIds: ['GRP-ENG-TEACHERS'], vaskItemIds: ['AX-VASK-V1','AX-VASK-S1'], riskFlags: ['off_site'],
    questionnaire: [{ bankItemId: sourceQuestion.bank_item_id, promptEn: `${sourceQuestion.prompt_en} (teacher edited)`, promptZh: sourceQuestion.prompt_zh, required: true, abilityCode: sourceQuestion.ability_code, abilityNameEn: sourceQuestion.ability_name_en, abilityNameZh: sourceQuestion.ability_name_zh }],
  }) });
  assert.equal(created.status, 201);
  assert.match(created.body.latestRevision.requested_form_version_id, /^FV-ACT-/);
  assert.equal(created.body.latestRevision.activity_type, 'non_academic:outside_school');
  assert.equal(created.body.people.filter(item => item.relationship_type === 'participant').length, 3);
  assert(created.body.people.some(item => item.relationship_type === 'supporting_teacher' && item.user_id === 'USR-ST-001'));
  assert.deepEqual(created.body.vaskItems.map(item => item.vask_item_id).sort(), ['AX-VASK-S1','AX-VASK-V1']);
});

test('coordinators can inspect all assignments but decide only their own', async () => {
  const staff = await signIn('USR-ST-001');
  const queue = await staff('/approvals');
  assert.equal(queue.status, 200);
  const otherReviewer = queue.body.assignments.find(item => item.approval_assignment_id === 'AASG-ACT-PRESS');
  assert.equal(otherReviewer.canDecide, false);
  assert.equal((await staff('/approvals/AASG-ACT-PRESS/decision', { method: 'POST', body: JSON.stringify({ outcome: 'approved', reason: 'Coordinator cannot decide.' }) })).status, 403);
  assert(queue.body.escalations.some(item => item.trigger_reason === 'overdue'));
});

test('returned revisions and owner-resolved change requests create audited successors', async () => {
  const author = await signIn('USR-T-001');
  const created = await author('/activities', { method: 'POST', body: JSON.stringify({
    titleEn: 'Returned revision test', descriptionEn: 'The first immutable revision.', subjectId: 'SUB-ENG', departmentId: 'DEPT-LANG', groupId: 'S1A-2026-27',
    startAt: '2027-02-20T09:00', endAt: '2027-02-20T10:00', formVersionId: 'FV-CORE-001', participantIds: ['USR-S-001'], vaskItemIds: ['AX-VASK-COMMUNICATION'], riskFlags: ['none'],
  }) });
  assert.equal(created.status, 201);
  const activityId = created.body.activity_id;
  const submitted = await author(`/activities/${activityId}/submit`, { method: 'POST', body: JSON.stringify({ reviewerId: 'USR-ST-001', publisherId: 'USR-ST-001' }) });
  assert.equal(submitted.status, 201);

  const reviewer = await signIn('USR-ST-001');
  assert.equal((await reviewer(`/approvals/${submitted.body.assignmentId}/decision`, { method: 'POST', body: JSON.stringify({ outcome: 'changes_requested', reason: 'Clarify the evidence collection conditions.' }) })).status, 200);
  assert.equal((await author(`/activities/${activityId}/submit`, { method: 'POST', body: JSON.stringify({ reviewerId: 'USR-ST-001', publisherId: 'USR-ST-001' }) })).status, 400);
  const successor = await author(`/activities/${activityId}/revisions`, { method: 'POST', body: JSON.stringify({ descriptionEn: 'The clarified immutable successor.', reason: 'Address the named reviewer decision.' }) });
  assert.equal(successor.status, 201);
  assert.equal(successor.body.latestRevision.revision_number, 2);
  assert.equal(successor.body.revisions[1].approval_status, 'changes_requested');

  const supportingTeacher = await signIn('USR-T-001');
  const requested = await supportingTeacher('/activities/ACT-SELF-001/change-requests', { method: 'POST', body: JSON.stringify({ fieldKey: 'description_en', proposedValue: 'Use consent-safe media and reflections.', reason: 'Clarify the collection conditions before approval.' }) });
  assert.equal(requested.status, 201);
  const owner = await signIn('USR-T-002');
  assert.equal((await owner('/activities/ACT-SELF-001/withdraw', { method: 'POST', body: JSON.stringify({ reason: 'Withdraw the legacy pending revision so the request can be incorporated.' }) })).status, 200);
  const resolved = await owner(`/activities/ACT-SELF-001/change-requests/${requested.body.id}/decision`, { method: 'POST', body: JSON.stringify({ outcome: 'accepted', reason: 'The proposed consent wording is appropriate.' }) });
  assert.equal(resolved.status, 200);
  assert.equal(resolved.body.latestRevision.revision_number, 2);
  assert.equal(resolved.body.latestRevision.description_en, 'Use consent-safe media and reflections.');
  assert(resolved.body.changeRequests.some(item => item.activity_change_request_id === requested.body.id && item.status === 'accepted' && item.resulting_revision_id === resolved.body.latestRevision.activity_revision_id));
});

test('Portfolio failures do not partially mutate state and official publication advances separately', async () => {
  const teacher = await signIn('USR-T-001');
  const invalidReview = await teacher('/portfolio-versions/PWV-S3-001/review', { method: 'POST', body: JSON.stringify({ decisions: [{ itemId: 'PVI-S3-INTRO', decision: 'included', reason: 'Checked.' }], approverId: 'USR-T-002' }) });
  assert.equal(invalidReview.status, 400);
  assert.equal((await teacher('/portfolios/USR-S-003')).body.versions[0].status, 'student_submitted');

  const student = await signIn('USR-S-001');
  assert.equal((await student('/portfolios/USR-S-002')).status, 404);
  const own = await student('/portfolios/USR-S-001');
  assert.equal(own.body.versions[0].status, 'draft');
  assert.equal(own.body.official.version.version_number, 1);
  const successor = await student('/portfolios/USR-S-001/drafts', { method: 'POST', body: JSON.stringify({ selfIntroduction: 'A new audited introduction.', activityId: 'ACT-SPORT-001', activityText: 'Teamwork mattered.', periodId: '2026-27-P1' }) });
  assert.equal(successor.status, 201);
  const latestId = successor.body.versions[0].portfolio_working_version_id;
  assert.equal((await student(`/portfolio-versions/${latestId}/submit`, { method: 'POST' })).status, 200);

  const staff = await signIn('USR-ST-001');
  assert.equal((await staff('/approvals/AASG-PORT-S2-2/decision', { method: 'POST', body: JSON.stringify({ outcome: 'approved', reason: 'Class-teacher selections and sources checked.' }) })).status, 200);
  const queue = await staff('/approvals');
  const publication = queue.body.assignments.find(item => item.workflow_type === 'portfolio_publication' && item.target_version_id === 'PWV-S2-001' && item.status === 'assigned');
  assert(publication?.canDecide);
  assert.equal((await staff(`/approvals/${publication.approval_assignment_id}/decision`, { method: 'POST', body: JSON.stringify({ outcome: 'approved', reason: 'Approved Portfolio version released.' }) })).status, 200);
  const detail = await staff('/portfolios/USR-S-002');
  assert.equal(detail.body.official.version.status, 'published');
  assert.equal(detail.body.official.version.portfolio_working_version_id, 'PWV-S2-001');
});

test('AI candidates, human decisions and narrative edits persist through protected APIs', async () => {
  const teacher = await signIn('USR-T-001');
  const workspace = await teacher('/ai-drafts/MANIFEST-S1-P1');
  assert.equal(workspace.status, 200);
  assert.equal(workspace.body.candidates.length, 2);
  assert.equal(workspace.body.generation.available, true);
  assert.equal(workspace.body.access.canEditNarrative, true);

  assert.equal((await teacher('/ai-draft-candidates/CANDIDATE-STUB-A/decisions', { method: 'POST', body: JSON.stringify({ outcome: 'included', reason: '' }) })).status, 400);
  assert.equal((await teacher('/ai-draft-candidates/CANDIDATE-STUB-A/decisions', { method: 'POST', body: JSON.stringify({ outcome: 'included', reason: 'Sources support this editable draft.' }) })).status, 201);
  assert.equal((await teacher('/learner-narratives/LNV-S1-001/teacher-edit', { method: 'PATCH', body: JSON.stringify({ text: 'An audited teacher edit.', reason: 'Clarify the supported meaning.' }) })).status, 200);

  const generated = await teacher('/ai-drafts/MANIFEST-S1-P1/generations', { method: 'POST' });
  assert.equal(generated.status, 201);
  assert.equal(generated.body.model, 'fixture-model');
  const reloaded = await teacher('/ai-drafts/MANIFEST-S1-P1');
  assert.equal(reloaded.body.candidates.length, 3);
  assert.equal(reloaded.body.candidates.find(item => item.candidate_id === 'CANDIDATE-STUB-A').review_status, 'included');
  assert.equal(reloaded.body.narrative.teacher_edited_text, 'An audited teacher edit.');

  const staff = await signIn('USR-ST-001');
  const staffWorkspace = await staff('/ai-drafts/MANIFEST-S1-P1');
  assert.equal(staffWorkspace.status, 200);
  assert.equal(staffWorkspace.body.access.canEditNarrative, false);
  assert.equal((await staff('/learner-narratives/LNV-S1-001/teacher-edit', { method: 'PATCH', body: JSON.stringify({ text: 'Forbidden edit.', reason: 'No narrative-edit grant.' }) })).status, 403);
});

test('LLM failure creates no partial candidate and never returns credentials', async () => {
  const teacher = await signIn('USR-T-001');
  const before = await teacher('/ai-drafts/MANIFEST-S1-P1');
  llmMode = 'error';
  const failed = await teacher('/ai-drafts/MANIFEST-S1-P1/generations', { method: 'POST' });
  llmMode = 'success';
  assert.equal(failed.status, 502);
  assert.equal(failed.body.code, 'UPSTREAM_UNAVAILABLE');
  assert(!JSON.stringify(failed.body).includes('test-only-key'));
  const afterFailure = await teacher('/ai-drafts/MANIFEST-S1-P1');
  assert.equal(afterFailure.body.candidates.length, before.body.candidates.length);
});

test('policy preview and apply immediately enforce explicit deny', async () => {
  const administrator = await signIn('USR-ADM-001');
  const input = { targetType: 'group', targetId: 'GRP-ENG-TEACHERS', capabilityId: 'CAP-ACTIVITY-VIEW', effect: 'deny', scopeType: 'activity', scopeId: 'ACT-PRESS-001', reason: 'Temporary activity confidentiality test.' };
  const preview = await administrator('/policy/preview', { method: 'POST', body: JSON.stringify(input) });
  assert.equal(preview.status, 200);
  assert(preview.body.some(item => item.userId === 'USR-T-001' && item.beforeAllowed && !item.afterAllowed));
  assert.equal((await administrator('/policy/overrides', { method: 'POST', body: JSON.stringify({ ...input, reason: '' }) })).status, 400);
  assert.equal((await administrator('/policy/overrides', { method: 'POST', body: JSON.stringify(input) })).status, 201);

  const teacher = await signIn('USR-T-001');
  const activities = await teacher('/activities');
  assert(!activities.body.items.some(item => item.activity_id === 'ACT-PRESS-001'));
});

test('unknown and deliberately unavailable execution routes return stable 404 errors', async () => {
  const staff = await signIn('USR-ST-001');
  for (const path of ['/ai/generate', '/ocr/extract', '/assessment/publish-from-ai']) {
    const result = await staff(path);
    assert.equal(result.status, 404);
    assert.equal(result.body.code, 'NOT_FOUND');
  }
});

test('rubric XLSX exports real linked records and successor activation changes only future Portfolio versions', async () => {
  const administrator = await signIn('USR-ADM-001');
  const workspace = await administrator('/imports/rubrics');
  assert.equal(workspace.status, 200);
  assert.equal(workspace.body.catalogues.length, 2);
  assert.equal(workspace.body.active.rubric_catalogue_id, 'RUB-SB-UF2');
  assert.equal(workspace.body.active.skill_count, 8);
  assert.equal(workspace.body.active.step_count, 128);

  const downloaded = await administrator('/imports/rubrics/export');
  assert.equal(downloaded.status, 200);
  assert.deepEqual(downloaded.body.counts, { catalogues: 2, groups: 4, skills: 8, steps: 128 });
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(Buffer.from(downloaded.body.contentBase64, 'base64'));
  assert.deepEqual(workbook.worksheets.map(sheet => sheet.name), ['rubric_catalogues','rubric_groups','rubric_skills','rubric_steps']);
  assert.equal(workbook.getWorksheet('rubric_catalogues').rowCount, 3);
  assert.equal(workbook.getWorksheet('rubric_groups').rowCount, 5);
  assert.equal(workbook.getWorksheet('rubric_skills').rowCount, 9);
  assert.equal(workbook.getWorksheet('rubric_steps').rowCount, 129);
  assert.equal(workbook.getWorksheet('rubric_catalogues').getCell('A2').value === 'example_rubric', false);

  const form = new FormData();
  form.set('file', new Blob([Buffer.from(downloaded.body.contentBase64, 'base64')], { type: downloaded.body.mimeType }), 'rubric-successor.xlsx');
  const staged = await administrator('/imports/rubrics/preview', { method: 'POST', body: form });
  assert.equal(staged.status, 201);
  assert.equal(staged.body.status, 'ready');
  assert.deepEqual(staged.body.errors, []);

  const successor = await administrator(`/imports/rubrics/drafts/${staged.body.rubricImportDraftId}/commit`, { method: 'POST', body: JSON.stringify({ sourceRubricCatalogueId: 'RUB-SB-UF2' }) });
  assert.equal(successor.status, 201);
  assert.equal(successor.body.catalogue.status, 'draft');
  assert.equal(successor.body.groups.length, 4);
  assert.equal(successor.body.skills.length, 8);
  assert.equal(successor.body.steps.length, 128);

  const existingStudent = await signIn('USR-S-001');
  const before = await existingStudent('/portfolio-editor/USR-S-001');
  const previousVersionId = before.body.versions[0].portfolio_working_version_id;
  assert.equal(before.body.versions[0].rubric_catalogue_id, 'RUB-SB-UF2');

  const activated = await administrator(`/imports/rubrics/${successor.body.catalogue.rubric_catalogue_id}/activate`, { method: 'POST', body: JSON.stringify({ reason: 'Validated four-sheet successor package.' }) });
  assert.equal(activated.status, 200);
  assert.equal(activated.body.active.rubric_catalogue_id, successor.body.catalogue.rubric_catalogue_id);

  const created = await existingStudent('/portfolios/USR-S-001/drafts', { method: 'POST', body: JSON.stringify({ selfIntroduction: 'This version checks immutable rubric pinning.', periodId: '2026-27-P1' }) });
  assert.equal(created.status, 201);
  assert.equal(created.body.versions[0].rubric_catalogue_id, successor.body.catalogue.rubric_catalogue_id);
  const oldVersion = created.body.versions.find(item => item.portfolio_working_version_id === previousVersionId);
  assert.equal(oldVersion.rubric_catalogue_id, 'RUB-SB-UF2');
  assert.equal(created.body.official.version.rubric_catalogue_id, 'RUB-SB-UF2');
});
