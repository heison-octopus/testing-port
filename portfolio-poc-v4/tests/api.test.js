import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createApp } from '../backend/app.js';
import { validateArtifact } from '../backend/config/registry.js';
async function setup(t, options = {}) {
  const {
    app,
    store
  } = createApp({
    file: ':memory:',
    ...options
  });
  const server = app.listen(0, '127.0.0.1');
  await new Promise(r => server.once('listening', r));
  t.after(() => {
    server.close();
    store.close();
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  async function login(email, password = 'demo-stage1', expectedStatus = 200) {
    const res = await fetch(base + '/api/session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        identifier: email,
        password
      })
    });
    assert.equal(res.status, expectedStatus);
    if (expectedStatus !== 200) return res;
    const data = await res.json();
    const cookie = res.headers.get('set-cookie').split(';')[0];
    return async (path, method = 'GET', body, key = data.requestKey) => {
      const r = await fetch(base + '/api' + path, {
        method,
        headers: {
          cookie,
          'Content-Type': 'application/json',
          ...(key ? {
            'X-Request-Key': key
          } : {})
        },
        ...(body ? {
          body: JSON.stringify(body)
        } : {})
      });
      return {
        status: r.status,
        data: r.status === 204 ? null : (r.headers.get('content-type')?.includes('text/csv') ? await r.text() : await r.json())
      };
    };
  }
  return {
    store,
    login,
    base
  };
}
test('school isolation, request keys, explicit deny and session revocation', async t => {
  const {
    login
  } = await setup(t);
  const admin = await login('admin@a.demo'),
    student = await login('student@a.demo'),
    other = await login('admin@b.demo');
  assert.equal((await student('/people')).status, 403);
  assert.equal((await other('/people/a-teacher')).status, 404);
  assert.equal((await admin('/assignments', 'POST', {}, null)).status, 403);
  assert.equal((await admin('/assignments', 'POST', {
    assignment_kind: 'override',
    user_id: 'a-teacher',
    action_key: 'workspace.read',
    effect: 'deny',
    effective_from: '2020-01-01',
    reason: 'Deny fixture'
  })).status, 201);
  const teacher = await login('teacher@a.demo');
  assert.equal((await teacher('/workspace')).status, 403);
  assert.equal((await admin('/session', 'DELETE')).status, 204);
  assert.equal((await admin('/people')).status, 401);
});
test('dated assignments, same-row end, historical snapshots and stale edits', async t => {
  const {
    login
  } = await setup(t);
  const admin = await login('admin@a.demo'),
    teacher = await login('teacher@a.demo');
  let a = await admin('/assignments', 'POST', {
    assignment_kind: 'membership',
    user_id: 'a-teacher',
    school_definition_id: 'a-class',
    period_id: 'a-term',
    effective_from: '2020-01-01',
    effective_until: '2099-01-01',
    reason: 'Assign class'
  });
  assert.equal(a.status, 201);
  let old = await admin('/audit/events/' + a.data.event_id);
  const id = a.data.record.id;
  assert.equal(old.data.records['assignments:' + id].status, 'active');
  const body = {
    row_version: 1,
    reason: 'End class'
  };
  const results = await Promise.all([admin('/assignments/' + id, 'PATCH', body), admin('/assignments/' + id, 'PATCH', body)]);
  assert.deepEqual(results.map(r => r.status).sort(), [200, 409]);
  assert.equal((await admin('/audit/events/' + a.data.event_id)).data.records['assignments:' + id].status, 'active');
  assert(!(await teacher('/workspace')).data.assignments.some(x => x.id === id));
  assert.equal((await admin('/assignments/a-teacher-role', 'PATCH', {
    row_version: 1,
    reason: 'Remove teacher role'
  })).status, 200);
  assert.equal((await teacher('/workspace')).status, 403);
  for (const [from, until] of [['2099-01-01', '2100-01-01'], ['2010-01-01', '2011-01-01']]) {
    assert.equal((await admin('/assignments', 'POST', {
      assignment_kind: 'role',
      user_id: 'a-teacher',
      role_id: 'a-teacher',
      effective_from: from,
      effective_until: until,
      reason: 'Date test'
    })).status, 201);
  }
  assert.equal((await teacher('/workspace')).status, 403);
});
test('cross-school references and invalid definition parents fail', async t => {
  const {
    login
  } = await setup(t);
  const a = await login('admin@a.demo');
  assert.equal((await a('/assignments', 'POST', {
    assignment_kind: 'role',
    user_id: 'b-student',
    role_id: 'a-student',
    effective_from: '2020-01-01',
    reason: 'Wrong school'
  })).status, 404);
  assert.equal((await a('/school-definitions', 'POST', {
    kind: 'period',
    code: 'bad',
    name: 'Bad',
    parent_definition_id: 'a-class',
    reason: 'Wrong kind'
  })).status, 422);
});
test('failed transaction rolls back current rows and snapshots; relational graph reconstructs', async t => {
  const {
    store
  } = await setup(t);
  const before = store.list('change_logs', 'a').length;
  assert.throws(() => store.mutate('users', 'missing-actor', 'Failure', () => store.update('users', 'a-teacher', 1, {
    display_name: 'Must roll back'
  })));
  assert.equal(store.get('users', 'a-teacher').display_name, 'A teacher');
  assert.equal(store.list('change_logs', 'a').length, before);
  const result = store.mutate('users', 'a-admin', 'Rename', () => store.update('users', 'a-teacher', 1, {
    display_name: 'Renamed teacher'
  }));
  const snapshot = store.snapshot(result.event_id, 'a');
  assert.equal(snapshot.records['users:a-teacher'].display_name, 'Renamed teacher');
  assert.equal(snapshot.records['assignments:a-teacher-role'].role_id, 'a-teacher');
  assert(!('password_hash' in snapshot.records['users:a-teacher']));
  assert.throws(() => store.update('users', 'a-teacher', 1, {
    display_name: 'stale'
  }), /reload/);
});
test('expired session fails', async t => {
  const {
    login
  } = await setup(t, {
    sessionTtl: 1
  });
  const user = await login('student@a.demo');
  await new Promise(r => setTimeout(r, 10));
  assert.equal((await user('/session')).status, 401);
});
test('backend rubric artifact must have complete conditions and exact retained hash', () => {
  const artifact = {
    key: 'test',
    version: '1',
    axes: [{
      key: 'listening',
      levels: [{
        order: 1,
        condition: 'Observed behaviour'
      }]
    }]
  };
  const hash = createHash('sha256').update(JSON.stringify(artifact)).digest('hex');
  assert.equal(validateArtifact(artifact, hash).hash, hash);
  assert.throws(() => validateArtifact(artifact, 'wrong'), /hash/);
  assert.throws(() => validateArtifact({
    ...artifact,
    axes: []
  }, hash), /Incomplete/);
});
test('ordered migration reopens without reset and preserves historical values', async () => {
  const {
    mkdtempSync,
    rmSync
  } = await import('node:fs');
  const {
    tmpdir
  } = await import('node:os');
  const {
    join
  } = await import('node:path');
  const {
    openStore
  } = await import('../backend/repositories/store.js');
  const dir = mkdtempSync(join(tmpdir(), 'bhss-v4-'));
  const file = join(dir, 'fixture.sqlite');
  try {
    let s = openStore(file);
    s.seed();
    const change = s.mutate('users', 'a-admin', 'Persist change', () => s.update('users', 'a-teacher', 1, {
      display_name: 'Persisted'
    }));
    s.close();
    s = openStore(file);
    s.seed();
    assert.equal(s.get('users', 'a-teacher').display_name, 'Persisted');
    assert.equal(s.snapshot(change.event_id, 'a').records['users:a-teacher'].display_name, 'Persisted');
    s.close();
    assert.throws(() => openStore(join(dir, 'portfolio-poc-v3', 'stage0.sqlite')), /Refusing/);
  } finally {
    rmSync(dir, {
      recursive: true,
      force: true
    });
  }
});
test('JWT access and role mappings control portfolio approval', async t => {
  const { login, base } = await setup(t);
  const first = await fetch(base + '/api/session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'admin@a.demo', password: 'demo-stage1' }) });
  assert.equal(first.status, 200);
  const firstSession = await first.json();
  assert.equal(firstSession.tokenType, 'JWT');
  assert.match(first.headers.get('set-cookie'), /bhss_v4_refresh=/);
  const refreshCookie = first.headers.get('set-cookie').split(',').find(value => value.includes('bhss_v4_refresh=')).split(';')[0];
  const refreshed = await fetch(base + '/api/session/refresh', { method: 'POST', headers: { cookie: refreshCookie } });
  assert.equal(refreshed.status, 200);
  assert.match(refreshed.headers.get('set-cookie'), /bhss_v4_refresh=/);
  const admin = await login('admin@a.demo');
  const role = await admin('/roles', 'POST', { code: 'portfolio-reader-test', name_en: 'Portfolio reader', name_zh: 'Portfolio 閱讀者', permission_profile_key: 'portfolio-reader', reason: 'Access mapping test' });
  assert.equal(role.status, 201);
  const builtIns = await admin('/roles'); assert.equal(builtIns.status, 200);
  const reader = builtIns.data.find(r => r.code === 'portfolio-reader');
  const approver = builtIns.data.find(r => r.code === 'portfolio-approver');
  assert(reader && approver);
  const readerPermissions = await admin(`/roles/${reader.id}/permissions`); const approverPermissions = await admin(`/roles/${approver.id}/permissions`);
  assert(!readerPermissions.data.some(p => p.permission_key === 'portfolio.approve' && p.effect === 'allow'));
  assert(approverPermissions.data.some(p => p.permission_key === 'portfolio.approve' && p.effect === 'allow'));
  const permissions = await admin(`/roles/${role.data.record.id}/permissions`); assert.equal(permissions.status, 200); assert(permissions.data.some(p => p.permission_key === 'portfolio.read')); assert(!permissions.data.some(p => p.permission_key === 'portfolio.approve'));
  const update = await admin(`/roles/${role.data.record.id}/permissions`, 'PATCH', { permission_keys: ['portfolio.read', 'activity.read'], reason: 'Narrow mapping' }); assert.equal(update.status, 200);
});
test('activity details and participant assignments obey activity permissions', async t => {
  const { login } = await setup(t); const teacher = await login('teacher@a.demo'), student = await login('student@a.demo'), admin = await login('admin@a.demo');
  const created = await teacher('/activities', 'POST', { title: 'Imported service activity', description: 'Attendance and feedback source row', activity_type: 'service', period_id: 'a-term', start_at: '2026-09-26T09:00:00+08:00', end_at: '2026-09-26T15:00:00+08:00', source_key: 'time-infinity:TI-ACT-8801', reason: 'Activity integration test' }); assert.equal(created.status, 201); const activityId = created.data.record.id;
  assert.equal((await student('/activities', 'POST', { title: 'No', description: 'No', activity_type: 'x', period_id: 'a-term', start_at: '2026-09-26', end_at: '2026-09-27', reason: 'Denied' })).status, 403);
  assert.equal((await admin('/assignments', 'POST', { assignment_kind: 'activity_staff', user_id: 'a-teacher', activity_id: activityId, period_id: 'a-term', effective_from: '2026-09-01', reason: 'Activity owner' })).status, 201);
  assert.equal((await admin('/assignments', 'POST', { assignment_kind: 'participant', user_id: 'a-student', activity_id: activityId, period_id: 'a-term', effective_from: '2026-09-01', reason: 'Activity participant' })).status, 201);
  assert((await student('/activities')).data.some(a => a.id === activityId)); assert.equal((await student(`/activities/${activityId}/participants`)).status, 403); assert.equal((await teacher(`/activities/${activityId}`)).status, 200);
});

test('CSV user import/export and period role refresh are previewed before commit', async t => {
  const { login } = await setup(t); const admin = await login('admin@a.demo');
  const users = await admin('/people/export.csv'); assert.equal(users.status, 200); assert.match(users.data, /\"user_id\",\"in_school_id\",\"display_name\",\"email\",\"user_kind\",\"status\"/);
  const filteredUsers = await admin('/people/export.csv?user_kind=student&q=student'); assert.equal(filteredUsers.status, 200); assert.match(filteredUsers.data, /a-student/); assert.doesNotMatch(filteredUsers.data, /a-teacher/);
  const preview = await admin('/people/import/preview', 'POST', { csv: 'user_id,display_name,email,user_kind,status\na-teacher,Updated Teacher,teacher-updated@a.demo,staff,active' }); assert.equal(preview.status, 200); assert.equal(preview.data.can_commit, true); assert.deepEqual(preview.data.valid[0].changes, [{ field: 'display_name', before: 'A teacher', after: 'Updated Teacher' }, { field: 'email', before: 'teacher@a.demo', after: 'teacher-updated@a.demo' }]);
  const committed = await admin('/people/import/commit', 'POST', { csv: 'user_id,display_name,email,user_kind,status\na-teacher,Updated Teacher,teacher-updated@a.demo,staff,active', reason: 'CSV profile update' }); assert.equal(committed.status, 201);
  assert.equal((await admin('/people/a-teacher')).data.display_name, 'Updated Teacher');
  const rolePreview = await admin('/role-refresh/preview', 'POST', { csv: 'user_id,role_code,effective_period,action\na-teacher,teacher,term,assign' }); assert.equal(rolePreview.status, 200); assert.equal(rolePreview.data.can_commit, true);
  const roleCommit = await admin('/role-refresh/commit', 'POST', { csv: 'user_id,role_code,effective_period,action\na-teacher,teacher,term,assign', reason: 'Period role refresh' }); assert.equal(roleCommit.status, 201); assert.equal(roleCommit.data.refreshed, 1);
  const assignments = await admin('/assignments/export.csv'); assert.equal(assignments.status, 200); assert.match(assignments.data, /\"assignment_id\",\"user_id\",\"assignment_kind\"/);
  const imported = await admin('/people/import/commit', 'POST', { csv: 'user_id,in_school_id,display_name,email,user_kind,status,password\n,s-excel-api-student,Excel API Student,excel.api.student@a.demo,student,active,excel-api-password', reason: 'Excel user create' }); assert.equal(imported.status, 201); assert.equal(imported.data.created, 1);
  const importedLogin = await login('s-excel-api-student', 'excel-api-password'); assert.equal((await importedLogin('/session')).status, 200);
  const importedAssignments = await admin('/assignments'); assert(importedAssignments.data.some(a => a.user_id !== 'a-student' && a.assignment_kind === 'role' && a.role_id === 'a-student'));
  const disabled = await admin('/people/a-student', 'GET'); assert.equal(disabled.status, 200);
  const removal = await admin('/people/a-student', 'DELETE', { reason: 'Removal test' }); assert.equal(removal.status, 200); assert.equal(removal.data.record.status, 'disabled');
  const blocked = await login('a-student', 'demo-stage1', 401); assert.equal(blocked.status, 401);
});

test('default roles infer prefixes, respect overrides and keep repeat imports idempotent', async t => {
  const { login } = await setup(t);
  const admin = await login('admin@a.demo');
  const password = 'default-role-test-password';
  const created = await admin('/people', 'POST', { in_school_id: 'T-default', display_name: 'Default teacher', email: 'default.teacher@a.demo', user_kind: 'staff', password, reason: 'Verify teacher inference' });
  assert.equal(created.status, 201);
  const teacher = await login('T-default', password);
  assert((await teacher('/session')).data.assignments.some(a => a.role_id === 'a-teacher'));
  assert.equal((await teacher('/workspace')).status, 200);
  const header = 'user_id,in_school_id,display_name,email,user_kind,status,default_role,password';
  const csv = header + '\n,S-default,Default student,default.student@a.demo,student,active,,' + password;
  const preview = await admin('/people/import/preview', 'POST', { csv });
  assert(preview.data.valid[0].changes.some(c => c.field === 'default_role' && c.after === 'student'));
  assert.equal((await admin('/people/import/commit', 'POST', { csv })).status, 201);
  const student = await login('S-default', password);
  const session = (await student('/session')).data;
  assert(session.assignments.some(a => a.role_id === 'a-student'));
  assert.equal((await student('/workspace')).status, 200);
  const update = header + '\n' + session.user.id + ',S-default,Default student,default.student@a.demo,student,active,student,';
  for (let i = 0; i < 2; i++) assert.equal((await admin('/people/import/commit', 'POST', { csv: update })).status, 201);
  assert.equal((await student('/session')).data.assignments.filter(a => a.role_id === 'a-student').length, 1);
  const override = header + '\n,s-reader,Explicit reader,explicit.reader@a.demo,staff,active,portfolio-reader,' + password;
  assert.equal((await admin('/people/import/commit', 'POST', { csv: override })).status, 201);
  const reader = await login('s-reader', password);
  const roles = (await reader('/session')).data.assignments.map(a => a.role_id);
  assert.deepEqual(roles, ['a-portfolio-reader']);
  const invalid = await admin('/people/import/preview', 'POST', { csv: header + '\n,x-invalid,Invalid role,invalid.role@a.demo,staff,active,unknown-role,' + password });
  assert.equal(invalid.data.can_commit, false);
  assert(invalid.data.errors.some(e => e.row === 2 && e.column === 'default_role'));
});

test('academic structure requires calendar dates and keeps terms within their year', async t => {
  const { login } = await setup(t);
  const admin = await login('admin@a.demo');
  const create = body => admin('/school-definitions', 'POST', { reason: 'Academic structure validation', ...body });
  const year = { kind: 'year', code: '2028', name: '2028–29' };
  assert.equal((await create(year)).status, 422);
  assert.equal((await create({ ...year, start_at: '2028-09-01', end_at: '2028-08-01' })).status, 422);
  const saved = await create({ ...year, start_at: '2028-09-01', end_at: '2029-08-31' });
  assert.equal(saved.status, 201);
  const term = { kind: 'period', code: '2028-T1', name: 'Term 1', parent_definition_id: saved.data.record.id };
  assert.equal((await create(term)).status, 422);
  assert.equal((await create({ ...term, start_at: '2028-08-01', end_at: '2029-01-31' })).status, 422);
  assert.equal((await create({ ...term, start_at: '2028-09-01', end_at: '2029-01-31' })).status, 201);
  const klass = await create({ kind: 'class', code: '2028-1A', name: '1A', parent_definition_id: saved.data.record.id });
  assert.equal(klass.status, 201);
  assert.equal(klass.data.record.start_at, null);
  assert.equal((await create({ kind: 'subject', code: 'ENG', name: 'English' })).status, 201);
});

test('three school terms commit together and reject overlap, repeat and cross-school requests', async t => {
  const { login } = await setup(t);
  const admin = await login('admin@a.demo'), student = await login('student@a.demo');
  const year = await admin('/school-definitions', 'POST', { kind:'year', code:'2031', name:'2031–32', start_at:'2031-09-01', end_at:'2032-09-01', reason:'Batch test' });
  const dates = ['2031-09-01','2032-01-01','2032-05-01','2032-09-01'];
  const body = { parent_definition_id:year.data.record.id, reason:'Create three terms', terms:[1,2,3].map((n,i)=>({code:'2031-T'+n,name:'Term '+n,start_at:dates[i],end_at:dates[i+1]})) };
  const overlapping = structuredClone(body); overlapping.terms[2].start_at='2032-04-01';
  assert.equal((await admin('/school-definitions/terms','POST',overlapping)).status,422);
  assert.equal((await admin('/school-definitions')).data.filter(r=>r.parent_definition_id===body.parent_definition_id).length,0);
  assert.equal((await student('/school-definitions/terms','POST',body)).status,403);
  assert.equal((await admin('/school-definitions/terms','POST',{...body,parent_definition_id:'b-year'})).status,404);
  const result=await admin('/school-definitions/terms','POST',body);
  assert.equal(result.status,201); assert.equal(result.data.records.length,3);
  assert.equal((await admin('/school-definitions/terms','POST',body)).status,422);
  assert.equal((await admin('/school-definitions')).data.filter(r=>r.parent_definition_id===body.parent_definition_id).length,3);
});

test('new school year and three terms save atomically', async t => {
  const { login } = await setup(t);
  const admin = await login('admin@a.demo');
  const dates = ['2035-09-01', '2036-01-01', '2036-05-01', '2036-09-01'];
  const body = { reason: 'School year package test', year: { code:'2035', name:'2035–36', start_at:dates[0], end_at:dates[3] }, terms:[1,2,3].map((n,i)=>({code:'2035-T'+n,name:'Term '+n,start_at:dates[i],end_at:dates[i+1]})) };
  const invalid = structuredClone(body); invalid.terms[2].end_at='2036-10-01';
  assert.equal((await admin('/school-definitions/terms','POST',invalid)).status,422);
  assert(!(await admin('/school-definitions')).data.some(r=>r.code==='2035'));
  const result=await admin('/school-definitions/terms','POST',body);
  assert.equal(result.status,201);
  assert.equal(result.data.year.code,'2035');
  assert.equal(result.data.records.length,3);
  assert(result.data.records.every(r=>r.parent_definition_id===result.data.year.id));
  assert.equal((await admin('/school-definitions/terms','POST',body)).status,422);
});
