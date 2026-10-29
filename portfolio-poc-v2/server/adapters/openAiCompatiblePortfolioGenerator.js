import { HttpError } from '../services/access.js';

function config() {
  return {
    baseUrl: String(process.env.LOCAL_LLM_BASE_URL || '').replace(/\/$/, ''),
    apiKey: process.env.LOCAL_LLM_API_KEY || '',
    model: process.env.LOCAL_LLM_MODEL || '',
    timeoutMs: Number(process.env.LOCAL_LLM_TIMEOUT_MS || 30_000),
  };
}

function parseCandidate(content) {
  const cleaned = String(content || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  try {
    const parsed = JSON.parse(cleaned);
    if (!parsed.textEn && !parsed.textZh) throw new Error('Missing generated text');
    return { textEn: String(parsed.textEn || ''), textZh: String(parsed.textZh || '') };
  } catch {
    if (!cleaned) throw new HttpError(502, 'The LLM returned an empty response', 'UPSTREAM_INVALID_RESPONSE');
    return { textEn: cleaned, textZh: '' };
  }
}

export const openAiCompatiblePortfolioGenerator = {
  status() {
    const value = config();
    return { available: Boolean(value.baseUrl && value.apiKey && value.model), provider: 'openai-compatible-local', model: value.model || null };
  },
  async generate({ manifest }) {
    const value = config();
    if (!value.baseUrl || !value.apiKey || !value.model) throw new HttpError(503, 'Local LLM generation is not configured', 'UPSTREAM_UNAVAILABLE');
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), value.timeoutMs);
    try {
      const sourceLines = manifest.sources.map(source => `${source.source_id}: ${source.summary_en}`).join('\n');
      const response = await fetch(`${value.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${value.apiKey}` },
        signal: controller.signal,
        body: JSON.stringify({
          model: value.model,
          temperature: 0.2,
          messages: [
            { role: 'system', content: 'Create positive, evidence-linked learner narrative candidates. Do not assign marks, accept proof, or change rubric levels. Return JSON only with textEn and textZh string fields.' },
            { role: 'user', content: `Student: ${manifest.student_name}\nProfile: ${manifest.controlled_profile}\nSources:\n${sourceLines}` },
          ],
        }),
      });
      if (!response.ok) throw new HttpError(502, `Local LLM request failed with status ${response.status}`, 'UPSTREAM_UNAVAILABLE');
      const body = await response.json();
      const output = parseCandidate(body.choices?.[0]?.message?.content);
      return { ...output, provider: 'openai-compatible-local', model: value.model };
    } catch (error) {
      if (error instanceof HttpError) throw error;
      if (error?.name === 'AbortError') throw new HttpError(504, 'Local LLM request timed out', 'UPSTREAM_TIMEOUT');
      throw new HttpError(502, 'Local LLM request could not be completed', 'UPSTREAM_UNAVAILABLE');
    } finally {
      clearTimeout(timer);
    }
  },
};
