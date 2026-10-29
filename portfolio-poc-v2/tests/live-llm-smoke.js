import { fetchAvailableModels, printAvailableModels } from '../scripts/llm-models.js';

const baseUrl = String(process.env.LOCAL_LLM_BASE_URL || '').replace(/\/$/, '');
const apiKey = process.env.LOCAL_LLM_API_KEY || '';
const model = process.env.LOCAL_LLM_MODEL || '';

if (!baseUrl || !apiKey) {
  console.log('SKIP: set LOCAL_LLM_BASE_URL and LOCAL_LLM_API_KEY to discover models and run the live smoke test.');
  process.exit(0);
}

const headers = { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` };
const availableModels = await fetchAvailableModels({ baseUrl, apiKey });
if (!model) {
  console.log('LOCAL_LLM_MODEL is not set; no completion was attempted.');
  printAvailableModels(availableModels);
  process.exit(0);
}
if (!availableModels.includes(model)) {
  console.error(`Configured model is not available: ${model}`);
  printAvailableModels(availableModels);
  process.exit(1);
}
const completion = await fetch(`${baseUrl}/chat/completions`, {
  method: 'POST',
  headers,
  body: JSON.stringify({ model, temperature: 0, max_tokens: 12, messages: [{ role: 'user', content: 'Reply with exactly: connectivity ok' }] }),
});
if (!completion.ok) throw new Error(`Completion failed with HTTP ${completion.status}`);
const body = await completion.json();
if (!body.choices?.[0]?.message?.content) throw new Error('Completion response did not contain message content');
console.log(`Live local LLM smoke test passed for model ${model}.`);
