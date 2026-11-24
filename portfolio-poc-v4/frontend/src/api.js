let requestKey = '';
let refreshing = null;
async function request(path, { method = 'GET', body } = {}, retried = false) {
  let response;
  try {
    response = await fetch(`/api${path}`, { method, credentials: 'same-origin', headers: { 'Content-Type': 'application/json', ...(requestKey ? { 'X-Request-Key': requestKey } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  } catch (error) {
    throw new Error('Unable to reach the BHSS server. Check the connection and try again.');
  }
  if (response.status === 401 && !retried && path !== '/session/refresh' && !(path === '/session' && method === 'POST')) {
    try {
      await refresh();
      return request(path, { method, body }, true);
    } catch (_error) {
      throw new Error('Your session has expired. Sign in again.');
    }
  }
  if (response.status === 204) return;
  let data;
  try { data = await response.json(); } catch (_error) { throw new Error('The BHSS server returned an invalid response.'); }
  if (!response.ok) throw new Error(data.error?.message || 'Request failed'); return data;
}
async function session() { const s = await request('/session', {}); requestKey = s.requestKey; return s; }
async function refresh() { refreshing ||= request('/session/refresh', { method: 'POST' }).then(s => { requestKey = s.requestKey; return s; }).finally(() => { refreshing = null; }); return refreshing; }
export const api = {
  session, refresh,
  login: async body => { const s = await request('/session', { method: 'POST', body }); requestKey = s.requestKey; return s; },
  logout: async () => { await request('/session', { method: 'DELETE' }); requestKey = ''; },
  workspace: () => request('/workspace', {}), activities: () => request('/activities', {}), createActivity: body => request('/activities', { method: 'POST', body }), updateActivity: (id, body) => request(`/activities/${id}`, { method: 'PATCH', body }), participants: id => request(`/activities/${id}/participants`, {}), previewAssignmentImport: csv => request('/assignments/import/preview', { method: 'POST', body: { csv } }), commitAssignmentImport: (csv, reason) => request('/assignments/import/commit', { method: 'POST', body: { csv, reason } }), previewUserImport: csv => request('/people/import/preview', { method: 'POST', body: { csv } }), commitUserImport: (csv, reason) => request('/people/import/commit', { method: 'POST', body: { csv, reason } }), previewRoleRefresh: csv => request('/role-refresh/preview', { method: 'POST', body: { csv } }), commitRoleRefresh: (csv, reason) => request('/role-refresh/commit', { method: 'POST', body: { csv, reason } }), exportCsv: async (path, retried = false) => { let response; try { response = await fetch(`/api${path}`, { credentials: 'same-origin', headers: requestKey ? { 'X-Request-Key': requestKey } : {} }); } catch (_error) { throw new Error('Unable to reach the BHSS server. Check the connection and try again.'); } if (response.status === 401 && !retried) { try { await refresh(); return api.exportCsv(path, true); } catch (_error) { throw new Error('Your session has expired. Sign in again.'); } } if (!response.ok) { const data = await response.json().catch(() => ({ error: {} })); throw new Error(data.error?.message || 'Export failed'); } return response.blob(); },
  list: domain => request(`/${domain}`, {}), create: (domain, body) => request(`/${domain}`, { method: 'POST', body }), disablePerson: (id, reason) => request(`/people/${id}`, { method: 'DELETE', body: { reason } }),
  endAssignment: (id, row_version, reason) => request(`/assignments/${id}`, { method: 'PATCH', body: { row_version, reason } }), event: id => request(`/audit/events/${id}`, {}), rolePermissions: id => request(`/roles/${id}/permissions`, {}), updateRolePermissions: (id, body) => request(`/roles/${id}/permissions`, { method: 'PATCH', body })
};
