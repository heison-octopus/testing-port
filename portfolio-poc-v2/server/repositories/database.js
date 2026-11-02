import { DatabaseSync } from 'node:sqlite';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { schema, schemaVersion } from './schema.js';
import { loadQuestionBank } from '../adapters/questionBankSource.js';
import { seedFromContracts, seedQuestionBankDomain } from './seed.js';

const here = dirname(fileURLToPath(import.meta.url));
const defaultDatabase = resolve(here, '../../playground-v2.sqlite');
export const db = new DatabaseSync(process.env.POC_V2_DB || defaultDatabase);

db.exec('PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL;');

const applicationTables = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name`).all();
if (!applicationTables.length) {
  db.exec(schema);
} else {
  const userVersion = Number(db.prepare('PRAGMA user_version').get().user_version || 0);
  const names = new Set(applicationTables.map(row => row.name));
  const required = ['activity_label_assignments','activity_source_bindings','entity_lifecycle_events','portfolio_template_versions','role_definition_versions','school_rubric_assignments','source_systems'];
  const retired = ['schema_migrations','activity_vask_items','form_items','peer_review_assignments','media_source_definitions'];
  if (userVersion !== 1 || required.some(name => !names.has(name)) || retired.some(name => names.has(name))) {
    throw new Error(`Database does not match ${schemaVersion}. This POC has no migration path; run "npm run db:reset" to rebuild it.`);
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

const seedMode = String(process.env.POC_V2_SEED_MODE || 'demo').toLowerCase();
if (!['demo', 'none'].includes(seedMode)) throw new Error('POC_V2_SEED_MODE must be "demo" or "none"');
if (seedMode === 'demo') {
  const csvDirectory = process.env.POC_V2_CSV_DIR || resolve(here, '../../../output/import-examples');
  seedFromContracts(sql, csvDirectory);
  const questionBank = await loadQuestionBank();
  sql.transaction(() => seedQuestionBankDomain(sql, questionBank, csvDirectory));
}
