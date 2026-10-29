import { fetchAvailableModels, printAvailableModels } from './llm-models.js';

const baseUrl = process.env.LOCAL_LLM_BASE_URL || '';
const apiKey = process.env.LOCAL_LLM_API_KEY || '';

if (!baseUrl || !apiKey) {
  console.error('Set LOCAL_LLM_BASE_URL and LOCAL_LLM_API_KEY before listing models.');
  process.exit(1);
}

printAvailableModels(await fetchAvailableModels({ baseUrl, apiKey }));
