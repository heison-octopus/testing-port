// Exports fresh synthetic repository fixtures; never exports a retained/user database.
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { openStore, tables } from '../backend/repositories/store.js';
const destination = resolve(import.meta.dirname, '../../output/import-examples/stage-1');
mkdirSync(destination, {
  recursive: true
});
const store = openStore(':memory:');
store.seed();
const manifests = [];
for (const table of tables) {
  let rows = ['a', 'b'].flatMap(s => store.list(table, s)).map(({
    password_hash,
    ...r
  }) => r);
  if (table === 'record_links') rows = [{
    id: 'example-link',
    row_version: 1,
    school_id: 'a',
    relation: 'subject_department',
    source_type: 'school_definitions',
    source_id: 'a-subject',
    target_type: 'school_definitions',
    target_id: 'a-department',
    status: 'active'
  }];
  if (table === 'school_definitions') rows.push(...[['subject', 'English'], ['department', 'Languages']].map(([kind, name]) => ({
    id: `a-${kind}`,
    row_version: 1,
    school_id: 'a',
    kind,
    code: kind,
    name,
    parent_definition_id: null,
    start_at: null,
    end_at: null,
    status: 'active'
  })));
  const cols = Object.keys(rows[0]);
  const quote = v => '"' + String(v ?? '').replaceAll('"', '""') + '"';
  writeFileSync(resolve(destination, table + '.csv'), [cols.map(quote).join(','), ...rows.map(r => cols.map(k => quote(r[k])).join(','))].join('\n') + '\n');
  manifests.push({
    file: table + '.csv',
    rows: rows.length
  });
}
writeFileSync(resolve(destination, 'manifest.json'), JSON.stringify({
  stage: 1,
  source: 'fresh synthetic fixtures, not live database',
  physicalConvention: 'id and row_version are common columns; staged subset of approved schema',
  credentials: 'password hashes excluded; demo authentication seeded separately',
  importStatus: 'examples only; no upload/commit endpoint in Stage 1',
  files: manifests
}, null, 2));
store.close();
console.log('Exported seven Stage 1 CSV examples.');
