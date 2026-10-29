import { randomUUID } from 'node:crypto';
import { aiRepository } from '../repositories/aiRepository.js';
import { identityRepository } from '../repositories/identityRepository.js';
import { openAiCompatiblePortfolioGenerator } from '../adapters/openAiCompatiblePortfolioGenerator.js';
import { capabilityDecision, fail, requireCapability } from './access.js';

function resourceForManifest(manifest) {
  const membership = identityRepository.classMembership(manifest.student_user_id, manifest.period_to);
  return { school_id: manifest.school_id, student_user_id: manifest.student_user_id, student_id: manifest.student_user_id, class_id: membership?.class_id };
}

function visible(user, manifest) {
  return capabilityDecision(user, 'portfolio.ai_draft.review', resourceForManifest(manifest)).allowed;
}

export const aiService = {
  list(user) {
    const manifests = aiRepository.manifests(user.school_id).filter(item => visible(user, item));
    if (!manifests.length && !identityRepository.roleCapabilityGrants(user.user_id, 'portfolio.ai_draft.review').length) fail(403, 'AI draft review is not assigned');
    return { manifests, generation: openAiCompatiblePortfolioGenerator.status() };
  },
  detail(user, manifestId) {
    const manifest = aiRepository.manifest(manifestId);
    if (!manifest || manifest.school_id !== user.school_id || !visible(user, manifest)) fail(404, 'AI draft workspace not found');
    return {
      ...manifest,
      generation: openAiCompatiblePortfolioGenerator.status(),
      access: {
        canReview: capabilityDecision(user, 'portfolio.ai_draft.review', resourceForManifest(manifest)).allowed,
        canEditNarrative: capabilityDecision(user, 'portfolio.generated_narrative.edit', resourceForManifest(manifest)).allowed,
      },
    };
  },
  async generate(user, manifestId) {
    const manifest = this.detail(user, manifestId);
    requireCapability(user, 'portfolio.ai_draft.review', resourceForManifest(manifest));
    const generated = await openAiCompatiblePortfolioGenerator.generate({ manifest });
    const candidate = aiRepository.createCandidate({
      id: `CANDIDATE-${randomUUID()}`,
      manifestId,
      provider: generated.provider,
      model: generated.model,
      promptVersion: manifest.prompt_version,
      textEn: generated.textEn,
      textZh: generated.textZh,
      sourceRefs: manifest.sources.map(item => item.source_id),
      actorId: user.user_id,
      createdAt: new Date().toISOString(),
    });
    identityRepository.audit(user.school_id, user.user_id, 'ai.candidate.generated', 'ai_draft_candidate', candidate.candidate_id);
    return candidate;
  },
  decide(user, candidateId, input) {
    const candidate = aiRepository.candidate(candidateId);
    const manifest = candidate ? aiRepository.manifest(candidate.manifest_id) : null;
    if (!candidate || !manifest || manifest.school_id !== user.school_id || !visible(user, manifest)) fail(404, 'AI draft candidate not found');
    requireCapability(user, 'portfolio.ai_draft.review', resourceForManifest(manifest));
    if (!['included','rejected','ignored'].includes(input.outcome)) fail(400, 'Unsupported AI candidate decision');
    if (!input.reason?.trim()) fail(400, 'A decision reason is required');
    const decided = aiRepository.decide({ id: `AIDEC-${randomUUID()}`, candidateId, outcome: input.outcome, reason: input.reason.trim(), actorId: user.user_id, decidedAt: new Date().toISOString() });
    identityRepository.audit(user.school_id, user.user_id, `ai.candidate.${input.outcome}`, 'ai_draft_candidate', candidateId, input.reason.trim());
    return decided;
  },
  editNarrative(user, narrativeId, input) {
    const narrative = aiRepository.narrative(narrativeId);
    if (!narrative || narrative.school_id !== user.school_id) fail(404, 'Learner narrative not found');
    const membership = identityRepository.classMembership(narrative.student_user_id, narrative.period_id);
    requireCapability(user, 'portfolio.generated_narrative.edit', { school_id: user.school_id, student_user_id: narrative.student_user_id, student_id: narrative.student_user_id, class_id: membership?.class_id });
    if (!input.text?.trim() || !input.reason?.trim()) fail(400, 'Edited narrative text and reason are required');
    const edited = aiRepository.editNarrative({ narrativeId, text: input.text.trim(), reason: input.reason.trim(), actorId: user.user_id });
    identityRepository.audit(user.school_id, user.user_id, 'portfolio.narrative.edited', 'learner_narrative_version', narrativeId, input.reason.trim());
    return edited;
  },
};
