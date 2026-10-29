import type { Activity, ActivityReferenceData, ActivityWorkspace, ApprovalCandidate } from '../../shared/types';
import { call } from './transport';

export const activitiesApi = {
  activities: () => call<ActivityWorkspace>('/activities'),
  activityReferenceData: () => call<ActivityReferenceData>('/activities/reference-data'),
  activityApprovalCandidates: () => call<ApprovalCandidate[]>('/activities/approval-candidates'),
  activity: (id: string) => call<Activity>(`/activities/${id}`),
  createActivity: (body: unknown) => call<Activity>('/activities', { method: 'POST', body: JSON.stringify(body) }),
  reviseActivity: (id: string, body: unknown) => call<Activity>(`/activities/${id}/revisions`, { method: 'POST', body: JSON.stringify(body) }),
  requestActivityChange: (id: string, body: unknown) => call(`/activities/${id}/change-requests`, { method: 'POST', body: JSON.stringify(body) }),
  resolveActivityChange: (id: string, requestId: string, body: unknown) => call<Activity>(`/activities/${id}/change-requests/${requestId}/decision`, { method: 'POST', body: JSON.stringify(body) }),
  withdrawActivity: (id: string, reason: string) => call<Activity>(`/activities/${id}/withdraw`, { method: 'POST', body: JSON.stringify({ reason }) }),
  submitActivity: (id: string, reviewerId: string, publisherId: string) => call(`/activities/${id}/submit`, { method: 'POST', body: JSON.stringify({ reviewerId, publisherId }) }),
};
