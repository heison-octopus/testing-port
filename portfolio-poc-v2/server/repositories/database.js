import { DatabaseSync } from 'node:sqlite';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { migrations } from './migrations.js';
import { seedFromContracts } from './seed.js';

const here = dirname(fileURLToPath(import.meta.url));
const defaultDatabase = resolve(here, '../../playground-v2.sqlite');
export const db = new DatabaseSync(process.env.POC_V2_DB || defaultDatabase);

db.exec('PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL;');
db.exec('CREATE TABLE IF NOT EXISTS schema_migrations(version INTEGER PRIMARY KEY,name TEXT NOT NULL,applied_at TEXT NOT NULL)');

for (const migration of migrations) {
  if (db.prepare('SELECT 1 FROM schema_migrations WHERE version=?').get(migration.version)) continue;
  db.exec('BEGIN');
  try {
    db.exec(migration.sql);
    db.prepare('INSERT INTO schema_migrations(version,name,applied_at) VALUES(?,?,?)').run(migration.version, migration.name, new Date().toISOString());
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

export const sql = {
  all(statement, ...params) { return db.prepare(statement).all(...params); },
  get(statement, ...params) { return db.prepare(statement).get(...params); },
  run(statement, ...params) { return db.prepare(statement).run(...params); },
  transaction(work) {
    db.exec('BEGIN');
    try {
      const value = work();
      db.exec('COMMIT');
      return value;
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
  },
};

seedFromContracts(sql, process.env.POC_V2_CSV_DIR || resolve(here, '../../../output/import-examples'));
