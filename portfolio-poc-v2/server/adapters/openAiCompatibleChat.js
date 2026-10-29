import { HttpError } from '../services/access.js';

function configuration() {
  return {
    baseUrl: String(process.env.LOCAL_LLM_BASE_URL || '').replace(/\/$/, ''),
    apiKey: process.env.LOCAL_LLM_API_KEY || '',
    configuredModel: process.env.LOCAL_LLM_MODEL || '',
    timeoutMs: Number(process.env.LOCAL_LLM_TIMEOUT_MS || 120_000),
  };
}

function contextWindow(record) {
  const value = record?.max_model_len ?? record?.context_length ?? record?.max_context_length ?? record?.context_window;
  return Number.isFinite(Number(value)) ? Number(value) : null;
}

function timedSignal(signal, timeoutMs) {
  const timeout = AbortSignal.timeout(timeoutMs);
  return signal && typeof AbortSignal.any === 'function' ? AbortSignal.any([signal, timeout]) : signal || timeout;
}

async function upstreamError(response) {
  let message = `Local LLM request failed with status ${response.status}`;
  try {
    const body = await response.json();
    if (body?.error?.message) message = body.error.message;
  } catch { /* Keep the status-based message. */ }
  return new HttpError(502, message, 'UPSTREAM_UNAVAILABLE');
}

export const openAiCompatibleChat = {
  configured() {
    const value = configuration();
    return Boolean(value.baseUrl && value.apiKey);
  },
  async models() {
    const value = configuration();
    if (!value.baseUrl || !value.apiKey) throw new HttpError(503, 'Local LLM is not configured', 'UPSTREAM_UNAVAILABLE');
    let response;
    try {
      response = await fetch(`${value.baseUrl}/models`, { headers: { authorization: `Bearer ${value.apiKey}` }, signal: timedSignal(null, value.timeoutMs) });
    } catch {
      throw new HttpError(502, 'Local LLM model discovery could not be completed', 'UPSTREAM_UNAVAILABLE');
    }
    if (!response.ok) throw await upstreamError(response);
    const body = await response.json();
    const records = Array.isArray(body?.data) ? body.data : Array.isArray(body?.models) ? body.models : [];
    const models = records.map(record => ({
      id: typeof record === 'string' ? record : record.id || record.name,
      ownedBy: typeof record === 'string' ? null : record.owned_by || record.ownedBy || null,
      contextWindow: typeof record === 'string' ? null : contextWindow(record),
    })).filter(record => record.id).sort((a, b) => a.id.localeCompare(b.id));
    if (!models.length) throw new HttpError(502, 'Local LLM returned no model IDs', 'UPSTREAM_INVALID_RESPONSE');
    return { models, configuredModel: models.some(item => item.id === value.configuredModel) ? value.configuredModel : null };
  },
  async openStream({ model, messages, temperature, maxTokens, signal }) {
    const value = configuration();
    if (!value.baseUrl || !value.apiKey) throw new HttpError(503, 'Local LLM is not configured', 'UPSTREAM_UNAVAILABLE');
    let response;
    try {
      response = await fetch(`${value.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${value.apiKey}` },
        signal: timedSignal(signal, value.timeoutMs),
        body: JSON.stringify({
          model,
          messages,
          temperature,
          max_tokens: maxTokens,
          stream: true,
          stream_options: { include_usage: true },
        }),
      });
    } catch (error) {
      if (error?.name === 'AbortError') throw new HttpError(499, 'Chat request was cancelled', 'REQUEST_CANCELLED');
      throw new HttpError(502, 'Local LLM request could not be completed', 'UPSTREAM_UNAVAILABLE');
    }
    if (!response.ok) throw await upstreamError(response);
    return response;
  },
  async consume(response, { onDelta, onUsage }) {
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const body = await response.json();
      const text = body.choices?.[0]?.message?.content || '';
      if (text) onDelta(text);
      if (body.usage) onUsage(body.usage);
      return;
    }
    if (!response.body) throw new HttpError(502, 'Local LLM returned no response stream', 'UPSTREAM_INVALID_RESPONSE');
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    const processBlock = block => {
      for (const line of block.split(/\r?\n/)) {
        if (!line.startsWith('data:')) continue;
        const data = line.slice(5).trim();
        if (!data || data === '[DONE]') continue;
        let item;
        try { item = JSON.parse(data); } catch { continue; }
        const delta = item.choices?.[0]?.delta?.content;
        if (typeof delta === 'string' && delta) onDelta(delta);
        if (item.usage) onUsage(item.usage);
      }
    };
    while (true) {
      const { done, value } = await reader.read();
      buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
      const blocks = buffer.split(/\r?\n\r?\n/);
      buffer = blocks.pop() || '';
      for (const block of blocks) processBlock(block);
      if (done) break;
    }
    if (buffer.trim()) processBlock(buffer);
  },
};
