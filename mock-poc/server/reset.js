import { existsSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dbPath = join(dirname(dirname(fileURLToPath(import.meta.url))), 'data', 'bhss-poc.sqlite');
if (existsSync(dbPath)) rmSync(dbPath);
console.log('Database removed. Restart the API to reseed it.');
