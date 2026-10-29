import type { ApiErrorEnvelope } from '../../shared/types';

let requestKey = sessionStorage.getItem('bhss-v2-request-key') || '';

export class ApiError extends Error {
  code: string;
  status: number;
  details?: unknown;
  constructor(status: number, body: ApiErrorEnvelope) {
    super(body.error || 'Request failed');
    this.code = body.code || 'UNEXPECTED_ERROR';
    this.status = status;
    this.details = body.details;
  }
}

export async function call<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set('x-request-key', requestKey);
  if (options.body && !(options.body instanceof FormData) && !headers.has('content-type')) headers.set('content-type', 'application/json');
  const response = await fetch(`/api/v2${path}`, { ...options, headers });
  const data = await response.json();
  if (!response.ok) throw new ApiError(response.status, data as ApiErrorEnvelope);
  return data as T;
}

export async function streamCall(path: string, body: unknown, signal?: AbortSignal): Promise<Response> {
  const response = await fetch(`/api/v2${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-request-key': requestKey },
    body: JSON.stringify(body),
    signal,
  });
  if (!response.ok) {
    let data: ApiErrorEnvelope = { error: `Request failed with status ${response.status}`, code: 'UNEXPECTED_ERROR' };
    try { data = await response.json() as ApiErrorEnvelope; } catch { /* Preserve the status-based error. */ }
    throw new ApiError(response.status, data);
  }
  return response;
}

export function saveRequestKey(value: string) {
  requestKey = value;
  if (value) sessionStorage.setItem('bhss-v2-request-key', value);
  else sessionStorage.removeItem('bhss-v2-request-key');
}
