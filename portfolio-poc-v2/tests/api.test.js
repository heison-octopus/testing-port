import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const temporary = mkdtempSync(join(tmpdir(), 'bhss-poc-v2-test-'));
const database = join(temporary, 'test.sqlite');
const port = 3297;
const base = `http://127.0.0.1:${port}/api/v2`;
let server;

before(async () => {
  server = spawn(process.execPath, ['--experimental-sqlite', 'server/index.js'], {
    cwd: root,
    env: { ...process.env, PORT: String(port), POC_V2_DB: database, POC_V2_CSV_DIR: resolve(root, '../output/import-examples') },
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
  rmSync(temporary, { recursive: true, force: true });
});

async function signIn(userId) {
  const response = await fetch(`${base}/demo/session`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ userId }) });
  assert.equal(response.status, 200);
  const cookie = response.headers.get('set-cookie').split(';')[0];
  const { key } = await response.json();
  return async function request(path, options = {}) {
    const result = await fetch(`${base}${path}`, { ...options, headers: { 'content-type': 'application/json', cookie, 'x-request-key': key, ...options.headers } });
    const body = await result.json();
    return { status: result.status, body };
  };
}

test('sessions protect the API and staff filters keep positions separate from functional roles', async () => {
  assert.equal((await fetch(`${base}/session`)).status, 401);
  const teacher = await signIn('USR-T-001');
  const session = await teacher('/session');
  assert.equal(session.status, 200);
  assert.deepEqual(session.body.positions.map(item => item.position_code).sort(), ['mentoring_teacher', 'subject_teacher']);
  assert(session.body.roles.some(item => item.role_code === 'class_teacher'));

  const filtered = await teacher('/staff?roleId=ROLE-CLASS-TEACHER&subjectId=SUB-ENG');
  assert.equal(filtered.status, 200);
  assert.deepEqual(filtered.body.map(item => item.id), ['USR-T-001']);
  assert.equal(filtered.body[0].positions[0].name_zh.length > 0, true);

  const student = await signIn('USR-S-001');
  assert.equal((await student('/staff')).status, 403);
});

test('explicit scoped deny wins even when a teacher has a broad role grant', async () => {
  const teacher = await signIn('USR-T-002');
  const response = await teacher('/activities');
  assert.equal(response.status, 200);
  assert(response.body.some(item => item.activity_id === 'ACT-SPORT-001'));
  assert(!response.body.some(item => item.activity_id === 'ACT-PRESS-001'));
});

test('an activity keeps its ID while material revisions and approval decisions advance', async () => {
  const teacher = await signIn('USR-T-001');
  const created = await teacher('/activities', { method: 'POST', body: JSON.stringify({
    titleEn: 'English reflection lab',
    titleZh: '英文反思工作坊',
    descriptionEn: 'Initial description retained as revision one.',
    subjectId: 'SUB-ENG',
    departmentId: 'DEPT-LANG',
    groupId: 'S1A-2026-27',
    periodId: '2026-27-P1',
  }) });
  assert.equal(created.status, 201);
  const activityId = created.body.activity_id;

  const revised = await teacher(`/activities/${activityId}/revisions`, { method: 'POST', body: JSON.stringify({ descriptionEn: 'Materially corrected description.', reason: 'Correct the activity brief before publication.' }) });
  assert.equal(revised.status, 201);
  assert.equal(revised.body.activity_id, activityId);
  assert.equal(revised.body.revisions[0].revision_number, 2);

  const submitted = await teacher(`/activities/${activityId}/submit`, { method: 'POST', body: JSON.stringify({ reviewerId: 'USR-T-001' }) });
  assert.equal(submitted.status, 201);
  const decided = await teacher(`/approvals/${submitted.body.assignmentId}/decision`, { method: 'POST', body: JSON.stringify({ outcome: 'approved', reason: 'Scope and description checked.' }) });
  assert.equal(decided.status, 200);

  const list = await teacher('/activities');
  const activity = list.body.find(item => item.activity_id === activityId);
  assert.equal(activity.currentApprovedRevision.revision_number, 2);
  assert.equal(activity.latestRevision.activity_id, activityId);
});

test('Portfolio latest work and official publication resolve independently', async () => {
  const student = await signIn('USR-S-001');
  const own = await student('/portfolios/USR-S-001');
  assert.equal(own.status, 200);
  assert.equal(own.body.versions[0].version_number, 2);
  assert.equal(own.body.versions[0].status, 'draft');
  assert.equal(own.body.official.version.version_number, 1);
  assert.equal(own.body.official.version.status, 'published');

  const staff = await signIn('USR-ST-001');
  const approved = await staff('/approvals/AASG-PORT-S2-2/decision', { method: 'POST', body: JSON.stringify({ outcome: 'approved', reason: 'Class-teacher selections and sources checked.' }) });
  assert.equal(approved.status, 200);
  const queue = await staff('/approvals');
  const publication = queue.body.assignments.find(item => item.workflow_type === 'portfolio_publication' && item.target_version_id === 'PWV-S2-001' && item.status === 'assigned');
  assert(publication);
  assert.equal(publication.step_name_zh, 'Portfolio 發布');
  const published = await staff(`/approvals/${publication.approval_assignment_id}/decision`, { method: 'POST', body: JSON.stringify({ outcome: 'approved', reason: 'Approved Portfolio version released.' }) });
  assert.equal(published.status, 200);
  const detail = await staff('/portfolios/USR-S-002');
  assert.equal(detail.body.official.version.status, 'published');
  assert.equal(detail.body.official.version.portfolio_working_version_id, 'PWV-S2-001');
});

test('policy changes can be previewed and are audited through a dedicated endpoint', async () => {
  const administrator = await signIn('USR-ADM-001');
  const input = { targetType: 'group', targetId: 'GRP-ENG-TEACHERS', capabilityId: 'CAP-ACTIVITY-VIEW', effect: 'deny', scopeType: 'activity', scopeId: 'ACT-PRESS-001', reason: 'Temporary activity confidentiality test.' };
  const preview = await administrator('/policy/preview', { method: 'POST', body: JSON.stringify(input) });
  assert.equal(preview.status, 200);
  assert(preview.body.some(item => item.userId === 'USR-T-001' && item.beforeAllowed && !item.afterAllowed));
  assert(preview.body.some(item => item.userId === 'USR-T-001' && item.nameZh === '陳美玲'));
  const applied = await administrator('/policy/overrides', { method: 'POST', body: JSON.stringify(input) });
  assert.equal(applied.status, 201);

  const teacher = await signIn('USR-T-001');
  const activities = await teacher('/activities');
  assert(!activities.body.some(item => item.activity_id === 'ACT-PRESS-001'));
});

test('there is deliberately no AI execution endpoint', async () => {
  const staff = await signIn('USR-ST-001');
  assert.equal((await staff('/ai/generate')).status, 404);
});
