import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
const file = resolve(process.env.V3_DB || 'data/stage0.sqlite');
mkdirSync(dirname(file), { recursive: true });
const db = new DatabaseSync(file);
db.exec('PRAGMA foreign_keys=ON; CREATE TABLE IF NOT EXISTS inventory (id TEXT PRIMARY KEY, stage INTEGER NOT NULL, title TEXT NOT NULL, status TEXT NOT NULL);');
export function list() { return db.prepare('SELECT id, stage, title, status FROM inventory ORDER BY id').all(); }
export function insert(rows) { db.exec('BEGIN IMMEDIATE'); try { const statement = db.prepare('INSERT INTO inventory (id, stage, title, status) VALUES (?, ?, ?, ?)'); for (const row of rows) statement.run(row.id, row.stage, row.title, row.status); db.exec('COMMIT'); } catch (error) { db.exec('ROLLBACK'); throw error; } }
