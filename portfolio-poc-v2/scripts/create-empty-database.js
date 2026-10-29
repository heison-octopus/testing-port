import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const output = resolve(process.argv[2] || 'playground-v2-empty.sqlite');

if (existsSync(output) || existsSync(`${output}-wal`) || existsSync(`${output}-shm`)) {
  console.error(`Refusing to overwrite an existing database or companion file: ${output}`);
  console.error('Choose another path, or remove that exact schema-only database after confirming it is no longer needed.');
  process.exit(1);
}

process.env.POC_V2_DB = output;
process.env.POC_V2_SEED_MODE = 'none';

const { db } = await import('../server/repositories/database.js');
const tables = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name`).all();
const migrationCount = Number(db.prepare('SELECT COUNT(*) count FROM schema_migrations').get().count);
const populatedDomainTables = [];

for (const { name } of tables) {
  if (name === 'schema_migrations') continue;
  const count = Number(db.prepare(`SELECT COUNT(*) count FROM "${name.replaceAll('"', '""')}"`).get().count);
  if (count > 0) populatedDomainTables.push({ name, count });
}

if (populatedDomainTables.length) {
  db.close();
  console.error(`Schema-only database unexpectedly contains domain rows: ${JSON.stringify(populatedDomainTables)}`);
  process.exit(1);
}

db.exec('PRAGMA wal_checkpoint(TRUNCATE)');
db.close();

console.log(`Created schema-only SQLite database: ${output}`);
console.log(`Applied migrations: ${migrationCount}; domain tables: ${tables.length - 1}; domain rows: 0`);
