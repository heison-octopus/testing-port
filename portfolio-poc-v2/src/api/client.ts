import type { Activity, Approval, Escalation, PortfolioDetail, PortfolioRow, ReferenceData, Session, Staff } from '../../shared/types';

let requestKey = sessionStorage.getItem('bhss-v2-request-key') || '';

async function call<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`/api/v2${path}`, { ...options, headers: { 'content-type': 'application/json', 'x-request-key': requestKey, ...options.headers } });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Request failed');
  return data as T;
}

export const api = {
  demoUsers: () => call<{ user_id: string; user_type: string; name_en: string; name_zh: string; staff_number?: string; student_number?: string }[]>('/demo/users'),
  async signIn(userId: string) { const data = await call<{ key: string }>('/demo/session', { method: 'POST', body: JSON.stringify({ userId }) }); requestKey = data.key; sessionStorage.setItem('bhss-v2-request-key', requestKey); },
  async signOut() { await call('/logout', { method: 'POST' }); requestKey = ''; sessionStorage.removeItem('bhss-v2-request-key'); },
  session: () => call<Session>('/session'),
  referenceData: () => call<ReferenceData>('/reference-data'),
  staff: (params: URLSearchParams) => call<Staff[]>(`/staff?${params}`),
  activities: () => call<Activity[]>('/activities'),
  activity: (id: string) => call<Activity>(`/activities/${id}`),
  createActivity: (body: unknown) => call<Activity>('/activities', { method: 'POST', body: JSON.stringify(body) }),
  reviseActivity: (id: string, body: unknown) => call<Activity>(`/activities/${id}/revisions`, { method: 'POST', body: JSON.stringify(body) }),
  requestActivityChange: (id: string, body: unknown) => call(`/activities/${id}/change-requests`, { method: 'POST', body: JSON.stringify(body) }),
  submitActivity: (id: string, reviewerId: string) => call(`/activities/${id}/submit`, { method: 'POST', body: JSON.stringify({ reviewerId }) }),
  approvals: () => call<{ assignments: Approval[]; escalations: Escalation[]; canCoordinate: boolean }>('/approvals'),
  decide: (id: string, outcome: string, reason: string) => call(`/approvals/${id}/decision`, { method: 'POST', body: JSON.stringify({ outcome, reason }) }),
  portfolios: () => call<PortfolioRow[]>('/portfolios'),
  portfolio: (studentId: string) => call<PortfolioDetail>(`/portfolios/${studentId}`),
  createDraft: (studentId: string, body: unknown) => call<PortfolioDetail>(`/portfolios/${studentId}/drafts`, { method: 'POST', body: JSON.stringify(body) }),
  submitPortfolio: (id: string) => call(`/portfolio-versions/${id}/submit`, { method: 'POST' }),
  reviewPortfolio: (id: string, body: unknown) => call(`/portfolio-versions/${id}/review`, { method: 'POST', body: JSON.stringify(body) }),
  policy: () => call<{ reference: ReferenceData; overrides: unknown[] }>('/policy'),
  previewPolicy: (body: unknown) => call<{ userId: string; name: string; beforeAllowed: boolean; afterAllowed: boolean; effect: string }[]>('/policy/preview', { method: 'POST', body: JSON.stringify(body) }),
  applyPolicy: (body: unknown) => call('/policy/overrides', { method: 'POST', body: JSON.stringify(body) }),
};
