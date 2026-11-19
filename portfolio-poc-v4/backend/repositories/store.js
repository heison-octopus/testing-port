import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { randomUUID, scryptSync } from 'node:crypto';
import { ensure, timestamp } from '../utils/errors.js';
const specs = {
  schools: 'code TEXT NOT NULL UNIQUE, name TEXT NOT NULL, status TEXT NOT NULL',
  users: 'school_id TEXT NOT NULL REFERENCES schools(id), source_id TEXT NOT NULL, display_name TEXT NOT NULL, email TEXT NOT NULL UNIQUE, user_kind TEXT NOT NULL, password_hash TEXT NOT NULL, status TEXT NOT NULL',
  roles: 'school_id TEXT NOT NULL REFERENCES schools(id), code TEXT NOT NULL, name_en TEXT NOT NULL, name_zh TEXT NOT NULL, permission_profile_key TEXT NOT NULL, permission_profile_version TEXT NOT NULL, status TEXT NOT NULL, UNIQUE(school_id,code)',
  school_definitions: 'school_id TEXT NOT NULL REFERENCES schools(id), kind TEXT NOT NULL, code TEXT NOT NULL, name TEXT NOT NULL, parent_definition_id TEXT REFERENCES school_definitions(id), start_at TEXT, end_at TEXT, status TEXT NOT NULL, UNIQUE(school_id,kind,code)',
  assignments: 'school_id TEXT NOT NULL REFERENCES schools(id), assignment_kind TEXT NOT NULL, user_id TEXT NOT NULL REFERENCES users(id), role_id TEXT REFERENCES roles(id), school_definition_id TEXT REFERENCES school_definitions(id), period_id TEXT REFERENCES school_definitions(id), action_key TEXT, effect TEXT, assigned_by TEXT NOT NULL REFERENCES users(id), assigned_at TEXT NOT NULL, effective_from TEXT NOT NULL, effective_until TEXT, deassigned_by TEXT REFERENCES users(id), deassigned_at TEXT, status TEXT NOT NULL',
  record_links: 'school_id TEXT NOT NULL REFERENCES schools(id), relation TEXT NOT NULL, source_type TEXT NOT NULL, source_id TEXT NOT NULL, target_type TEXT NOT NULL, target_id TEXT NOT NULL, status TEXT NOT NULL, UNIQUE(school_id,relation,source_type,source_id,target_type,target_id)',
  change_logs: 'school_id TEXT NOT NULL REFERENCES schools(id), kind TEXT NOT NULL, event_id TEXT, entity_type TEXT NOT NULL, entity_id TEXT NOT NULL, field_name TEXT, value_type TEXT, value_text TEXT, actor_id TEXT NOT NULL REFERENCES users(id), reason TEXT NOT NULL, occurred_at TEXT NOT NULL'
};
export const tables = Object.keys(specs);
export function openStore(file) {
  const path = file === ':memory:' ? file : resolve(file);
  if (path !== ':memory:') {
    ensure(!/portfolio-poc-v[23]|\/mock\//.test(path), 500, 'Refusing retained legacy database path');
    mkdirSync(dirname(path), {
      recursive: true
    });
  }
  const db = new DatabaseSync(path);
  db.exec('PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL;');
  db.exec('CREATE TABLE IF NOT EXISTS schema_migrations(version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL)');
  const version = db.prepare('SELECT max(version) AS v FROM schema_migrations').get().v || 0;
  ensure(version <= 1, 500, 'Database is newer than this application');
  if (version === 0) {
    db.exec('BEGIN');
    try {
      for (const [name, cols] of Object.entries(specs)) db.exec(`CREATE TABLE ${name}(id TEXT PRIMARY KEY, row_version INTEGER NOT NULL DEFAULT 1, ${cols})`);
      db.prepare('INSERT INTO schema_migrations VALUES(1,?)').run(timestamp());
      db.exec('COMMIT');
    } catch (e) {
      db.exec('ROLLBACK');
      throw e;
    }
  }
  function table(t) {
    ensure(tables.includes(t), 422, 'Unknown entity');
    return t;
  }
  const get = (t, id) => db.prepare(`SELECT * FROM ${table(t)} WHERE id=?`).get(id);
  const list = (t, school) => db.prepare(`SELECT * FROM ${table(t)} ${t === 'schools' ? 'WHERE id=?' : 'WHERE school_id=?'}`).all(school);
  function insert(t, row) {
    const keys = Object.keys(row);
    const allowed = db.prepare(`PRAGMA table_info(${table(t)})`).all().map(c => c.name);
    ensure(keys.every(k => allowed.includes(k)), 422, 'Unknown column');
    db.prepare(`INSERT INTO ${t}(${keys.join(',')}) VALUES(${keys.map(() => '?').join(',')})`).run(...keys.map(k => row[k] ?? null));
    return get(t, row.id);
  }
  function update(t, id, expected, changes) {
    const keys = Object.keys(changes);
    const allowed = db.prepare(`PRAGMA table_info(${table(t)})`).all().map(c => c.name);
    ensure(keys.every(k => allowed.includes(k) && !['id', 'row_version'].includes(k)), 422, 'Unknown column');
    const result = db.prepare(`UPDATE ${t} SET ${keys.map(k => `${k}=?`).join(',')},row_version=row_version+1 WHERE id=? AND row_version=?`).run(...keys.map(k => changes[k]), id, expected);
    ensure(result.changes === 1, 409, 'Record changed; reload before saving');
    return get(t, id);
  }
  function transaction(fn) {
    db.exec('BEGIN IMMEDIATE');
    try {
      const r = fn();
      db.exec('COMMIT');
      return r;
    } catch (e) {
      db.exec('ROLLBACK');
      throw e;
    }
  }
  function graph(t, row) {
    const nodes = [{
      table: t,
      row
    }];
    if (t === 'users') {
      for (const a of list('assignments', row.school_id).filter(a => a.user_id === row.id)) nodes.push({
        table: 'assignments',
        row: a
      });
    }
    for (const link of list('record_links', row.school_id || row.id).filter(l => l.source_type === t && l.source_id === row.id || l.target_type === t && l.target_id === row.id)) nodes.push({
      table: 'record_links',
      row: link
    });
    return nodes;
  }
  function audit(t, row, actor, reason) {
    const event = randomUUID(),
      time = timestamp(),
      school = row.school_id || row.id;
    insert('change_logs', {
      id: event,
      school_id: school,
      kind: 'event',
      event_id: null,
      entity_type: t,
      entity_id: row.id,
      actor_id: actor,
      reason,
      occurred_at: time
    });
    for (const node of graph(t, row)) {
      for (const [key, value] of Object.entries(node.row)) {
        if (key === 'password_hash') continue;
        insert('change_logs', {
          id: randomUUID(),
          school_id: school,
          kind: 'snapshot_field',
          event_id: event,
          entity_type: node.table,
          entity_id: node.row.id,
          field_name: key,
          value_type: value === null ? 'null' : typeof value,
          value_text: value === null ? null : String(value),
          actor_id: actor,
          reason,
          occurred_at: time
        });
      }
    }
    return event;
  }
  function snapshot(id, school) {
    const event = get('change_logs', id);
    ensure(event && event.school_id === school && event.kind === 'event', 404, 'Event not found');
    const fields = db.prepare('SELECT * FROM change_logs WHERE event_id=? AND school_id=?').all(id, school);
    const records = {};
    for (const f of fields) {
      const key = `${f.entity_type}:${f.entity_id}`;
      records[key] ??= {};
      records[key][f.field_name] = f.value_type === 'null' ? null : f.value_type === 'number' ? Number(f.value_text) : f.value_text;
    }
    return {
      event,
      records
    };
  }
  function mutate(t, actor, reason, fn) {
    return transaction(() => {
      const row = fn();
      return {
        record: row,
        event_id: audit(t, row, actor, reason)
      };
    });
  }
  function seed() {
    if (db.prepare('SELECT count(*) AS n FROM schools').get().n) return;
    transaction(() => {
      for (const school of ['a', 'b']) {
        insert('schools', {
          id: school,
          code: school.toUpperCase(),
          name: `Demo School ${school.toUpperCase()}`,
          status: 'active'
        });
        for (const profile of ['admin', 'teacher', 'student', 'denied']) {
          insert('roles', {
            id: `${school}-${profile}`,
            school_id: school,
            code: profile,
            name_en: profile,
            name_zh: {
              admin: '學校管理員',
              teacher: '教師',
              student: '學生',
              denied: '未獲授權'
            }[profile],
            permission_profile_key: profile,
            permission_profile_version: '1',
            status: 'active'
          });
          const uid = `${school}-${profile}`;
          const hash = scryptSync('demo-stage1', uid, 64).toString('hex');
          insert('users', {
            id: uid,
            school_id: school,
            source_id: uid,
            display_name: `${school.toUpperCase()} ${profile}`,
            email: `${profile}@${school}.demo`,
            user_kind: profile === 'student' ? 'student' : 'staff',
            password_hash: hash,
            status: 'active'
          });
          insert('assignments', {
            id: `${uid}-role`,
            school_id: school,
            assignment_kind: 'role',
            user_id: uid,
            role_id: uid,
            assigned_by: uid,
            assigned_at: timestamp(),
            effective_from: '2020-01-01T00:00:00.000Z',
            status: 'active'
          });
        }
        insert('school_definitions', {
          id: `${school}-year`,
          school_id: school,
          kind: 'year',
          code: '2026',
          name: '2026–27',
          start_at: '2026-09-01T00:00:00.000Z',
          end_at: '2027-08-31T23:59:59.000Z',
          status: 'active'
        });
        for (const [kind, id, name] of [['period', 'term', 'Term 1'], ['class', 'class', '1A']]) insert('school_definitions', {
          id: `${school}-${id}`,
          school_id: school,
          kind,
          code: id,
          name,
          parent_definition_id: `${school}-year`,
          start_at: kind === 'period' ? '2026-09-01T00:00:00.000Z' : null,
          end_at: kind === 'period' ? '2027-01-31T00:00:00.000Z' : null,
          status: 'active'
        });
        for (const u of list('users', school)) audit('users', u, `${school}-admin`, 'Synthetic initial fixture');
      }
    });
  }
  return {
    get,
    list,
    insert,
    update,
    transaction,
    audit,
    snapshot,
    mutate,
    seed,
    close: () => db.close(),
    findUser: email => db.prepare('SELECT * FROM users WHERE email=?').get(email)
  };
}
