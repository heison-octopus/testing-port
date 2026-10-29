import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, relative } from 'node:path';
import { spawnSync } from 'node:child_process';
import { DatabaseSync } from 'node:sqlite';
import { fakeExtractionProvider } from '../server/adapters/extractionProvider.js';
import { parseStructuredInput } from '../server/adapters/importParsers.js';
import { parseModelIds } from '../scripts/llm-models.js';
import ExcelJS from 'exceljs';

const root = resolve(import.meta.dirname, '..');

function files(directory, extension) {
  return readdirSync(directory).flatMap(name => {
    const path = join(directory, name);
    return statSync(path).isDirectory() ? files(path, extension) : path.endsWith(extension) ? [path] : [];
  });
}

test('frontend domain code can reach the network only through the shared transport', () => {
  const sourceFiles = files(join(root, 'src'), '.ts').concat(files(join(root, 'src'), '.tsx'));
  const violations = sourceFiles.filter(path => relative(root, path) !== 'src/api/transport.ts').filter(path => /\bfetch\s*\(/.test(readFileSync(path, 'utf8')));
  assert.deepEqual(violations.map(path => relative(root, path)), []);
  for (const path of sourceFiles) {
    const source = readFileSync(path, 'utf8');
    assert(!/node:sqlite|server\/repositories|\bDatabaseSync\b/.test(source), relative(root, path));
  }
});

test('SQL and SQLite dependencies remain confined to repositories', () => {
  const serverFiles = files(join(root, 'server'), '.js');
  const violations = serverFiles.filter(path => !relative(root, path).startsWith('server/repositories/')).filter(path => /\b(?:SELECT|INSERT|UPDATE|DELETE|CREATE TABLE)\b|node:sqlite/.test(readFileSync(path, 'utf8')));
  assert.deepEqual(violations.map(path => relative(root, path)), []);
});

test('the OCR provider boundary returns a normalized, source-linked result', async () => {
  const result = await fakeExtractionProvider.extract({ jobId: 'JOB-1', sourceId: 'SOURCE-1', text: '香港學生作品', language: 'zh-Hant' });
  assert.deepEqual(result, {
    jobId: 'JOB-1',
    sourceId: 'SOURCE-1',
    text: '香港學生作品',
    chunks: [{ index: 0, text: '香港學生作品', confidence: 0.99 }],
    language: 'zh-Hant',
    confidence: 0.99,
    provider: 'fake-extraction-provider',
    version: '1',
    warnings: [],
    completedAt: '2026-10-29T00:00:00.000Z',
  });
});

test('OpenAI-compatible model discovery normalizes and sorts model IDs', () => {
  assert.deepEqual(parseModelIds({ data: [{ id: 'model-z' }, { id: 'model-a' }, { id: 'model-a' }] }), ['model-a', 'model-z']);
  assert.deepEqual(parseModelIds({ models: [{ name: 'fallback-model' }] }), ['fallback-model']);
});

test('schema-only database applies migrations without demo domain rows', () => {
  const directory = mkdtempSync(join(tmpdir(), 'bhss-v2-schema-'));
  const database = join(directory, 'empty.sqlite');
  try {
    const result = spawnSync(process.execPath, ['--experimental-sqlite', join(root, 'scripts/create-empty-database.js'), database], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr || result.stdout);
    const sql = new DatabaseSync(database, { readOnly: true });
    assert(Number(sql.prepare('SELECT COUNT(*) count FROM schema_migrations').get().count) > 0);
    for (const table of ['schools', 'users', 'activities', 'portfolio_working_versions', 'proof_items']) {
      assert.equal(Number(sql.prepare(`SELECT COUNT(*) count FROM ${table}`).get().count), 0, table);
    }
    sql.close();
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('CSV, XLSX and connector JSON normalize to the same roster shape', async () => {
  const headers = ['source_record_key','student_identifier','student_name','group_code','planned_attendance_status'];
  const values = ['PARITY-1','S1001','Alex Chan','P1','assigned'];
  const csv = await parseStructuredInput({ channel: 'csv', buffer: Buffer.from(`${headers.join(',')}\n${values.join(',')}\n`) });
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Roster');
  sheet.addRow(headers);
  sheet.addRow(values);
  const xlsx = await parseStructuredInput({ channel: 'xlsx', buffer: Buffer.from(await workbook.xlsx.writeBuffer()) });
  const connector = await parseStructuredInput({ channel: 'connector_json', buffer: Buffer.from(JSON.stringify({ records: [Object.fromEntries(headers.map((header, index) => [header, values[index]]))] })) });
  assert.deepEqual(xlsx, csv);
  assert.deepEqual(connector, csv);
  await assert.rejects(
    () => parseStructuredInput({ channel: 'csv', buffer: Buffer.from(`${'x'.repeat(65)}\nvalue\n`) }),
    error => error.code === 'IMPORT_HEADER_LIMIT',
  );
});

test('the import boundary exposes no hard-delete operation', () => {
  const repository = readFileSync(join(root, 'server/repositories/importRepository.js'), 'utf8');
  const routes = readFileSync(join(root, 'server/routes/api.js'), 'utf8');
  assert(!/\bDELETE\s+FROM\b/i.test(repository));
  assert(!/api\.delete\([^\n]*imports|api\.delete\([^\n]*source-systems/i.test(routes));
});
