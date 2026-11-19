let requestKey = '';
/** @template T @param {string} path @param {{method?:string,body?:object}} options @returns {Promise<T>} */
async function request(path, {
  method = 'GET',
  body
} = {}) {
  const response = await fetch(`/api${path}`, {
    method,
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
      ...(requestKey ? {
        'X-Request-Key': requestKey
      } : {})
    },
    ...(body ? {
      body: JSON.stringify(body)
    } : {})
  });
  if (response.status === 204) return;
  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || 'Request failed');
  return data;
}
/** @returns {Promise<import('../../shared/contracts').Session>} */
async function session() {
  const s = await request('/session', {});
  requestKey = s.requestKey;
  return s;
}
export const api = {
  session,
  login: async body => {
    const s = await request('/session', {
      method: 'POST',
      body
    });
    requestKey = s.requestKey;
    return s;
  },
  logout: async () => {
    await request('/session', {
      method: 'DELETE'
    });
    requestKey = '';
  },
  workspace: () => request('/workspace', {}),
  list: domain => request(`/${domain}`, {}),
  create: (domain, body) => request(`/${domain}`, {
    method: 'POST',
    body
  }),
  endAssignment: (id, row_version, reason) => request(`/assignments/${id}`, {
    method: 'PATCH',
    body: {
      row_version,
      reason
    }
  }),
  event: id => request(`/audit/events/${id}`, {})
};
