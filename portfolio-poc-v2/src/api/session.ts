import type { Session } from '../../shared/types';
import { call, saveRequestKey } from './transport';

export const sessionApi = {
  demoUsers: () => call<{ user_id: string; user_type: string; name_en: string; name_zh: string; staff_number?: string; student_number?: string }[]>('/demo/users'),
  async signIn(userId: string) { const data = await call<{ key: string }>('/demo/session', { method: 'POST', body: JSON.stringify({ userId }) }); saveRequestKey(data.key); },
  async signOut() { await call('/logout', { method: 'POST' }); saveRequestKey(''); },
  session: () => call<Session>('/session'),
};
