import { createReadStream, readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const directory = dirname(fileURLToPath(import.meta.url));
const registry = JSON.parse(readFileSync(join(directory, 'registry.json'), 'utf8'));
const controlPort = Number(process.env.PLAYGROUND_PORT || registry.controlPort);
const selectorOnly = process.argv.includes('--selector-only');
const children = [];

function startStages() {
  if (selectorOnly) return;
  for (const stage of registry.stages) {
    const child = spawn(stage.command[0], stage.command.slice(1), {
      cwd: resolve(directory, stage.cwd),
      env: { ...process.env },
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: process.platform !== 'win32',
    });
    child.stdout.on('data', chunk => process.stdout.write(`[${stage.id}] ${chunk}`));
    child.stderr.on('data', chunk => process.stderr.write(`[${stage.id}] ${chunk}`));
    child.on('error', error => process.stderr.write(`[${stage.id}] could not start: ${error.message}\n`));
    child.on('exit', code => process.stderr.write(`[${stage.id}] stopped with code ${code ?? 'signal'}\n`));
    children.push(child);
  }
}

const contentTypes = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8' };
const server = createServer((request, response) => {
  const pathname = new URL(request.url, `http://127.0.0.1:${controlPort}`).pathname;
  if (pathname === '/api/stages') {
    response.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
    response.end(JSON.stringify(registry.stages));
    return;
  }
  const requested = pathname === '/' ? 'index.html' : pathname.replace(/^\//, '');
  if (!['index.html', 'app.js', 'styles.css'].includes(requested)) {
    response.writeHead(404).end('Not found');
    return;
  }
  response.writeHead(200, { 'content-type': contentTypes[extname(requested)] || 'application/octet-stream' });
  createReadStream(join(directory, 'public', requested)).pipe(response);
});

server.once('error', error => {
  process.stderr.write(`Playground control could not start: ${error.message}\n`);
  process.exit(1);
});

server.listen(controlPort, '127.0.0.1', () => {
  process.stdout.write(`Playground control: http://127.0.0.1:${controlPort}\n`);
  startStages();
});

function stop() {
  for (const child of children) {
    if (child.exitCode !== null) continue;
    if (process.platform === 'win32') child.kill('SIGTERM');
    else {
      try { process.kill(-child.pid, 'SIGTERM'); }
      catch (error) { if (error.code !== 'ESRCH') process.stderr.write(`Could not stop stage ${child.pid}: ${error.message}\n`); }
    }
  }
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 1500).unref();
}

process.on('SIGINT', stop);
process.on('SIGTERM', stop);
