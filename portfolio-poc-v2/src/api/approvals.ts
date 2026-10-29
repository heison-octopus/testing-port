import type { Approval, Escalation } from '../../shared/types';
import { call } from './transport';

export const approvalsApi = {
  approvals: () => call<{ assignments: Approval[]; escalations: Escalation[]; canCoordinate: boolean }>('/approvals'),
  decide: (id: string, outcome: string, reason: string) => call(`/approvals/${id}/decision`, { method: 'POST', body: JSON.stringify({ outcome, reason }) }),
};
