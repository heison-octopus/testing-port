import { identityRepository } from '../repositories/identityRepository.js';
import { openAiCompatibleChat } from '../adapters/openAiCompatibleChat.js';
import { fail, sessionProfile } from './access.js';

function requirePlayground(user) {
  if (!sessionProfile(user).pageAccess.aiDrafts) fail(403, 'LLM playground access is not assigned');
}

function validMessages(input) {
  if (!Array.isArray(input) || !input.length || input.length > 60) return false;
  const allowedRoles = new Set(['system','user','assistant']);
  return input.every(item => allowedRoles.has(item?.role) && typeof item.content === 'string' && item.content.trim() && item.content.length <= 20_000);
}

export const llmPlaygroundService = {
  async status(user) {
    requirePlayground(user);
    const result = await openAiCompatibleChat.models();
    return { available: true, ...result };
  },
  async openChat(user, input, signal) {
    requirePlayground(user);
    if (!input.model?.trim()) fail(400, 'Select a model');
    if (!validMessages(input.messages)) fail(400, 'Provide between 1 and 60 valid chat messages');
    const totalCharacters = input.messages.reduce((sum, item) => sum + item.content.length, 0);
    if (totalCharacters > 120_000) fail(400, 'Chat history is too large for this playground');
    const discovered = await openAiCompatibleChat.models();
    const model = discovered.models.find(item => item.id === input.model);
    if (!model) fail(400, 'The selected model is not available');
    const temperature = Number.isFinite(Number(input.temperature)) ? Math.min(2, Math.max(0, Number(input.temperature))) : 0.7;
    const maxTokens = Number.isFinite(Number(input.maxTokens)) ? Math.min(4096, Math.max(16, Math.round(Number(input.maxTokens)))) : 1024;
    const response = await openAiCompatibleChat.openStream({ model: model.id, messages: input.messages, temperature, maxTokens, signal });
    identityRepository.audit(user.school_id, user.user_id, 'llm.playground.chat_started', 'llm_model', model.id, `messages=${input.messages.length}`);
    return { response, model };
  },
};
