import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const dir = mkdtempSync(join(tmpdir(), 'bhss-poc-'));
const port = 3199;
const proc = spawn(process.execPath, ['--experimental-sqlite', 'server/index.js'], { env: { ...process.env, PORT: String(port), POC_DB: join(dir, 'test.sqlite') }, stdio: 'ignore' });
const base = `http://127.0.0.1:${port}/api`;

async function wait() {
  for (let index = 0; index < 100; index += 1) {
    try { await fetch(`${base}/session`); return; } catch { await new Promise(resolve => setTimeout(resolve, 50)); }
  }
  throw Error('server did not start');
}

async function login(userId) {
  const response = await fetch(`${base}/demo/session`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ userId }) });
  const { key } = await response.json();
  return { cookie: response.headers.get('set-cookie').split(';')[0], key };
}

async function request(auth, path, method = 'GET', body) {
  const response = await fetch(base + path, { method, headers: { cookie: auth.cookie, 'x-request-key': auth.key, 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  return { status: response.status, data: await response.json() };
}

test('scoped evidence review publishes a privacy-filtered portfolio', async () => {
  await wait();
  const student = await login('student-1');
  const other = await login('student-2');
  const teacher = await login('teacher-1');
  const staff = await login('staff-1');
  const admin = await login('admin-1');

  assert.equal((await request(student, '/portfolios/student-2')).status, 404);
  assert.equal((await request(student, '/admin')).status, 403);
  assert.equal((await request(admin, '/reviews/student-1')).status, 403);
  assert.equal((await request(teacher, '/portfolios/student-1/publish', 'POST')).status, 403);

  const answer = `I helped plan and listened to my classmates ${Date.now()}.`;
  assert.equal((await request(student, '/activities/activity-1/responses', 'POST', { questionId: 'q-1', answer })).status, 201);
  const activity = await request(teacher, '/activities/activity-1');
  const proof = activity.data.proof.find(item => item.content === answer);
  assert.ok(proof);
  assert.equal((await request(teacher, '/observations', 'POST', { activityId: 'activity-1', studentId: 'student-1', proofId: proof.id, axisId: 'axis-8', level: 17, comment: 'Observed' })).status, 400);
  assert.equal((await request(teacher, '/observations', 'POST', { activityId: 'activity-1', studentId: 'student-1', proofId: proof.id, axisId: 'axis-8', level: 6, comment: 'Observed teamwork in the new reflection.' })).status, 201);

  const observations = (await request(staff, '/reviews/student-1')).data;
  const observation = observations.find(item => item.comment === 'Observed teamwork in the new reflection.');
  assert.equal(observation.decision, 'pending');
  assert.equal((await request(staff, `/observations/${observation.id}/decision`, 'POST', { decision: 'included', reason: 'Proof supports the POC condition' })).status, 200);
  assert.equal((await request(staff, '/portfolios/student-1/publish', 'POST')).status, 201);

  const snapshot = (await request(student, '/portfolios/student-1')).data;
  assert.equal(snapshot.privacy.filtered, true);
  assert.equal(snapshot.manifest.observations, undefined);
  assert.equal(snapshot.manifest.results.some(result => 'proofIds' in result), false);
  assert.ok(snapshot.manifest.results.find(result => result.axis === 'Teamwork').sourceTags.length >= 1);
  assert.equal((await request(other, '/portfolios/student-1')).status, 404);

  const draft = await request(teacher, '/forms', 'POST', { activityId: 'activity-1', templateKey: 'short-reflection-v1', prompt: 'What did you learn?' });
  assert.equal(draft.status, 201);
  assert.equal((await request(teacher, `/forms/${draft.data.id}/publish`, 'POST')).status, 403);
  assert.equal((await request(staff, `/forms/${draft.data.id}/publish`, 'POST')).status, 200);
});

test('activity, peer, media, prompt and policy workflows are auditable', async () => {
  const teacher = await login('teacher-1');
  const peer = await login('peer-10');
  const staff = await login('staff-1');
  const admin = await login('admin-1');
  const student = await login('student-1');

  const peerReviews = (await request(staff, '/peer-reviews')).data;
  assert.equal(peerReviews.length, 30);
  assert.equal(peerReviews.filter(item => item.status === 'pending').length, 3);
  const peerOwn = (await request(peer, '/peer-reviews')).data;
  assert.equal(peerOwn.length, 3);
  assert.equal((await request(peer, `/peer-reviews/${peerOwn[0].id}`, 'POST', { comment: 'Mei was kind and helped repair the problem.', rating: 5 })).status, 200);
  assert.equal((await request(staff, `/peer-reviews/${peerOwn[0].id}/moderate`, 'POST', { decision: 'approve', note: 'Relevant, respectful and attributable.' })).status, 200);

  const created = await request(teacher, '/activities', 'POST', { title: 'Teacher proposed activity', description: 'A fictional teacher proposal.', labels: ['Planning'], question: 'What happened?' });
  assert.equal(created.data.status, 'draft');
  assert.equal((await request(teacher, `/activities/${created.data.id}/transition`, 'POST', { action: 'submit' })).status, 200);
  assert.equal((await request(staff, `/activities/${created.data.id}/transition`, 'POST', { action: 'publish' })).status, 200);
  const published = await request(staff, `/activities/${created.data.id}`);
  assert.equal(published.data.status, 'published');
  assert.ok(published.data.events.length >= 3);

  const media = await request(teacher, '/media', 'POST', { activityId: 'activity-1', studentId: 'student-1', name: 'fictional-note.pdf', mimeType: 'application/pdf' });
  assert.equal(media.status, 201);
  assert.equal((await request(staff, `/media/${media.data.id}/process`, 'POST', { action: 'extract', extractedText: 'Teacher-confirmed fictional extraction.' })).status, 200);
  assert.equal((await request(staff, `/media/${media.data.id}/process`, 'POST', { action: 'publish' })).status, 200);
  assert.equal((await request(staff, `/media/${media.data.id}/disable`, 'POST', { reason: 'Demonstrate a soft disable.' })).status, 200);

  assert.equal((await request(staff, '/media/media-piano/disable', 'POST', { reason: 'Withdraw a source used by the current snapshot.' })).status, 200);
  const warnedPortfolio = (await request(student, '/portfolios/student-1')).data;
  assert.ok(warnedPortfolio);
  assert.equal(warnedPortfolio.warnings.length, 1);
  assert.match(warnedPortfolio.warnings[0].message, /not automatically recalculated/i);

  const prompts = (await request(teacher, '/prompts/student-1')).data;
  const attempt = await request(teacher, '/prompts/student-1/generate', 'POST', { presetId: prompts.presets[0].id, prompt: `${prompts.presets[0].prompt} Keep source tags.` });
  assert.equal(attempt.status, 201);
  assert.equal((await request(teacher, `/generation-attempts/${attempt.data.id}/select`, 'POST')).status, 200);
  assert.equal((await request(admin, '/admin/policy', 'POST', { key: 'portfolio_regeneration_role', value: 'staff' })).status, 200);
  const contract = await request(admin, '/privacy/contract');
  assert.equal(contract.data.status, 'not_configured');
  assert.equal(contract.data.mode, 'global_identifier_replacement');
});

test.after(() => { proc.kill(); rmSync(dir, { recursive: true, force: true }); });
