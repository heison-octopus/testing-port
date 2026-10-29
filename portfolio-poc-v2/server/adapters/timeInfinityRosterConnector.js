import { HttpError } from '../services/access.js';

const MAX_RESPONSE_BYTES = 4 * 1024 * 1024;

function requiredEnvironment(key) {
  const value = process.env[key]?.trim();
  if (!value) throw new HttpError(503, `Connector configuration ${key} is unavailable`, 'CONNECTOR_UNAVAILABLE');
  return value;
}

export async function fetchTimeInfinityRoster(source, sourceParentKey) {
  const base = requiredEnvironment(source.endpoint_env_key);
  let baseUrl;
  try { baseUrl = new URL(base); } catch { throw new HttpError(503, 'Connector endpoint configuration is invalid', 'CONNECTOR_UNAVAILABLE'); }
  if (!['http:','https:'].includes(baseUrl.protocol)) throw new HttpError(503, 'Connector endpoint must use HTTP or HTTPS', 'CONNECTOR_UNAVAILABLE');
  const encodedKey = encodeURIComponent(sourceParentKey);
  const url = new URL(`activity-rosters/${encodedKey}`, baseUrl.href.endsWith('/') ? baseUrl : `${baseUrl.href}/`);
  if (url.origin !== baseUrl.origin || !url.pathname.startsWith(baseUrl.pathname.endsWith('/') ? baseUrl.pathname : `${baseUrl.pathname}/`)) throw new HttpError(400, 'Connector target is outside its allow-listed root', 'CONNECTOR_TARGET_BLOCKED');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Number(process.env.TIME_INFINITY_TIMEOUT_MS || 10000));
  const headers = { accept: 'application/json' };
  const apiKey = process.env.TIME_INFINITY_API_KEY?.trim();
  if (apiKey) headers.authorization = `Bearer ${apiKey}`;
  try {
    const response = await fetch(url, { headers, redirect: 'error', signal: controller.signal });
    if (!response.ok) throw new HttpError(502, `Connector returned HTTP ${response.status}`, 'CONNECTOR_UPSTREAM_ERROR');
    if (!(response.headers.get('content-type') || '').toLowerCase().includes('application/json')) throw new HttpError(502, 'Connector did not return JSON', 'CONNECTOR_CONTENT_TYPE_INVALID');
    const length = Number(response.headers.get('content-length') || 0);
    if (length > MAX_RESPONSE_BYTES) throw new HttpError(413, 'Connector response exceeds 4 MiB', 'CONNECTOR_RESPONSE_TOO_LARGE');
    const chunks = [];
    let received = 0;
    for await (const chunk of response.body) {
      received += chunk.byteLength;
      if (received > MAX_RESPONSE_BYTES) throw new HttpError(413, 'Connector response exceeds 4 MiB', 'CONNECTOR_RESPONSE_TOO_LARGE');
      chunks.push(Buffer.from(chunk));
    }
    const bytes = Buffer.concat(chunks, received);
    let sourceUploadedAt;
    try {
      const declared = JSON.parse(bytes.toString('utf8')).source_uploaded_at;
      if (declared && !Number.isNaN(Date.parse(declared))) sourceUploadedAt = new Date(declared).toISOString();
    } catch { /* The shared parser returns the stable JSON error envelope. */ }
    return { bytes, retrievedAt: new Date().toISOString(), sourceUploadedAt, url: `${url.origin}${url.pathname}` };
  } catch (error) {
    if (error instanceof HttpError) throw error;
    if (error?.name === 'AbortError') throw new HttpError(504, 'Connector request timed out', 'CONNECTOR_TIMEOUT');
    throw new HttpError(502, 'Connector request failed', 'CONNECTOR_UPSTREAM_ERROR');
  } finally { clearTimeout(timer); }
}
