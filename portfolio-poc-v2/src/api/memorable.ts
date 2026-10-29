import type { MemorableWorkspace } from '../../shared/types';
import { call } from './transport';

export const memorableApi = {
  memorableActivities: () => call<MemorableWorkspace>('/memorable-activities'),
  saveMemorableActivity: (body: unknown) => call<MemorableWorkspace>('/memorable-activities', { method: 'POST', body: JSON.stringify(body) }),
  submitMemorableActivity: (selectionId: string) => call<MemorableWorkspace>(`/memorable-activities/${selectionId}/submit`, { method: 'POST' }),
};
