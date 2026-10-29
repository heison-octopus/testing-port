import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../..');
const temporary = mkdtempSync(join(tmpdir(), 'bhss-poc-v2-e2e-'));
const database = join(temporary, 'e2e.sqlite');
const children = [];
let stopping = false;

const llm = createServer(async (req, res) => {
  if (req.url === '/activity-rosters/TI-ACT-8812') {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ records: [
      { source_record_key: 'TI-ROSTER-8812-S1001', student_identifier: 'S1001', student_name: 'Alex Chan', group_code: 'P1', planned_attendance_status: 'assigned' },
      { source_record_key: 'TI-ROSTER-8812-S1003', student_identifier: 'S1003', student_name: 'Chris Wong', group_code: 'P1', planned_attendance_status: 'assigned' },
    ] }));
    return;
  }
  if (req.url === '/v1/models') {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ data: [{ id: 'fixture-model', owned_by: 'browser-fixture', max_model_len: 32768 }] }));
    return;
  }
  let raw = '';
  for await (const chunk of req) raw += chunk;
  const input = raw ? JSON.parse(raw) : {};
  if (input.stream) {
    res.writeHead(200, { 'content-type': 'text/event-stream' });
    await new Promise(resolveWait => setTimeout(resolveWait, 20));
    res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: 'Hello from ' } }] })}\n\n`);
    await new Promise(resolveWait => setTimeout(resolveWait, 20));
    res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: 'fixture model.' } }] })}\n\n`);
    res.write(`data: ${JSON.stringify({ choices: [], usage: { prompt_tokens: 12, completion_tokens: 4, total_tokens: 16 } })}\n\n`);
    res.end('data: [DONE]\n\n');
    return;
  }
  res.writeHead(200, { 'content-type': 'application/json' });
  res.end(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ textEn: 'A deterministic browser-test candidate.', textZh: '瀏覽器測試的固定候選。' }) } }] }));
});
llm.listen(3396, '127.0.0.1');

function launch(command, args, env) {
  const child = spawn(command, args, { cwd: root, env: { ...process.env, ...env }, stdio: 'inherit' });
  children.push(child);
  child.on('exit', code => { if (!stopping && code) process.exit(code); });
}

launch(process.execPath, ['--experimental-sqlite', 'server/index.js'], {
  PORT: '3397',
  POC_V2_DB: database,
  POC_V2_CSV_DIR: resolve(root, '../output/import-examples'),
  LOCAL_LLM_BASE_URL: 'http://127.0.0.1:3396/v1',
  LOCAL_LLM_API_KEY: 'e2e-only-key',
  LOCAL_LLM_MODEL: 'fixture-model',
  TIME_INFINITY_ROSTER_BASE_URL: 'http://127.0.0.1:3396/',
});
launch(process.execPath, [resolve(root, 'node_modules/vite/bin/vite.js'), '--host', '127.0.0.1', '--port', '3398', '--strictPort'], {
  POC_V2_API_TARGET: 'http://127.0.0.1:3397',
});

function stop() {
  if (stopping) return;
  stopping = true;
  for (const child of children) child.kill('SIGTERM');
  llm.close();
  rmSync(temporary, { recursive: true, force: true });
  setTimeout(() => process.exit(0), 50);
}
process.on('SIGTERM', stop);
process.on('SIGINT', stop);
