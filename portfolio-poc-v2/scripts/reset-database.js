import { rmSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const defaultDatabase = resolve(here, '../playground-v2.sqlite');
const databasePath = resolve(process.env.POC_V2_DB || defaultDatabase);

if (!/\.(?:sqlite|db)$/i.test(databasePath)) throw new Error(`Refusing to reset a path without a .sqlite or .db extension: ${databasePath}`);

for (const candidate of [databasePath, `${databasePath}-wal`, `${databasePath}-shm`]) {
  try {
    if (statSync(candidate).isDirectory()) throw new Error(`Refusing to remove a directory: ${candidate}`);
    rmSync(candidate);
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }
}

process.env.POC_V2_DB = databasePath;
await import('../server/repositories/database.js');
console.log(`Rebuilt POC database: ${databasePath}`);
