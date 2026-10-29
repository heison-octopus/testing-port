import type { AssessmentActivitySummary, AssessmentDetail, ResponseTask } from '../../shared/types';
import { call } from './transport';

export const assessmentsApi = {
  responseTasks: () => call<ResponseTask[]>('/response-tasks'),
  responseTask: (recipientId: string) => call<ResponseTask>(`/response-tasks/${recipientId}`),
  saveResponseDraft: (recipientId: string, answers: Record<string,string>) => call<ResponseTask>(`/response-tasks/${recipientId}/draft`, { method: 'POST', body: JSON.stringify({ answers }) }),
  submitResponse: (recipientId: string) => call<ResponseTask>(`/response-tasks/${recipientId}/submit`, { method: 'POST' }),
  assessmentWorkspace: () => call<AssessmentActivitySummary[]>('/assessment-workspace'),
  assessmentDetail: (activityId: string, studentId: string) => call<AssessmentDetail>(`/assessment-workspace/${activityId}/${studentId}`),
  submitTeacherAssessment: (activityId: string, studentId: string, body: unknown) => call<AssessmentDetail>(`/assessment-workspace/${activityId}/${studentId}`, { method: 'POST', body: JSON.stringify(body) }),
  assignPeerReview: (activityId: string, body: unknown) => call<AssessmentDetail>(`/assessment-workspace/${activityId}/peer-assignments`, { method: 'POST', body: JSON.stringify(body) }),
  reviewAssessmentSubmission: (submissionId: string, body: unknown) => call(`/assessment-submissions/${submissionId}/review`, { method: 'POST', body: JSON.stringify(body) }),
};
