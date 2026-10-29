import type { AICandidate, AIDraftWorkspace, AIManifestRow, Narrative } from '../../shared/types';
import { call } from './transport';

export const aiDraftsApi = {
  aiDrafts: () => call<{ manifests: AIManifestRow[]; generation: { available: boolean; provider: string; model: string | null } }>('/ai-drafts'),
  aiDraft: (manifestId: string) => call<AIDraftWorkspace>(`/ai-drafts/${manifestId}`),
  generateAiDraft: (manifestId: string) => call<AICandidate>(`/ai-drafts/${manifestId}/generations`, { method: 'POST' }),
  decideAiCandidate: (candidateId: string, outcome: string, reason: string) => call<AICandidate>(`/ai-draft-candidates/${candidateId}/decisions`, { method: 'POST', body: JSON.stringify({ outcome, reason }) }),
  editLearnerNarrative: (narrativeId: string, text: string, reason: string) => call<Narrative>(`/learner-narratives/${narrativeId}/teacher-edit`, { method: 'PATCH', body: JSON.stringify({ text, reason }) }),
};
