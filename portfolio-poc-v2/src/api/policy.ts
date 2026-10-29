import type { ReferenceData } from '../../shared/types';
import { call } from './transport';

export const policyApi = {
  policy: () => call<{ reference: ReferenceData; overrides: unknown[] }>('/policy'),
  previewPolicy: (body: unknown) => call<{ userId: string; name: string; nameZh?: string; beforeAllowed: boolean; afterAllowed: boolean; effect: string }[]>('/policy/preview', { method: 'POST', body: JSON.stringify(body) }),
  applyPolicy: (body: unknown) => call('/policy/overrides', { method: 'POST', body: JSON.stringify(body) }),
};
