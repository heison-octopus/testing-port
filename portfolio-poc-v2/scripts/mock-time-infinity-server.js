import { createServer } from 'node:http';

const port = Number(process.env.TIME_INFINITY_FIXTURE_PORT || 3210);
const rosters = {
  'TI-ACT-8812': [
    { source_record_key: 'TI-ROSTER-8812-S1001', student_identifier: 'S1001', student_name: 'Alex Chan', group_code: 'P1', planned_attendance_status: 'assigned' },
    { source_record_key: 'TI-ROSTER-8812-S1003', student_identifier: 'S1003', student_name: 'Chris Wong', group_code: 'P1', planned_attendance_status: 'assigned' },
  ],
};

const server = createServer((request, response) => {
  const url = new URL(request.url || '/', `http://${request.headers.host || `127.0.0.1:${port}`}`);
  const match = url.pathname.match(/^\/activity-rosters\/([^/]+)$/);
  if (request.method !== 'GET' || !match) {
    response.writeHead(404, { 'content-type': 'application/json' });
    response.end(JSON.stringify({ error: 'fixture route not found' }));
    return;
  }
  const key = decodeURIComponent(match[1]);
  const records = rosters[key];
  if (!records) {
    response.writeHead(404, { 'content-type': 'application/json' });
    response.end(JSON.stringify({ error: 'fixture activity not found' }));
    return;
  }
  const body = JSON.stringify({ source_activity_key: key, source_uploaded_at: '2026-10-29T10:15:00+08:00', records });
  response.writeHead(200, { 'content-type': 'application/json', 'content-length': Buffer.byteLength(body) });
  response.end(body);
});

server.listen(port, '127.0.0.1', () => console.log(`Time Infinity roster fixture http://127.0.0.1:${port}`));
process.on('SIGTERM', () => server.close());
process.on('SIGINT', () => server.close());
