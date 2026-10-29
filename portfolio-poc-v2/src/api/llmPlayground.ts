import type { ChatMessage, LLMPlaygroundStatus } from '../../shared/types';
import { call, streamCall } from './transport';

export type PlaygroundUsage = { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
export type PlaygroundStreamEvent =
  | { event: 'meta'; data: { model: string; contextWindow: number | null } }
  | { event: 'delta'; data: { text: string } }
  | { event: 'done'; data: { usage: PlaygroundUsage | null } }
  | { event: 'error'; data: { error: string; code?: string } };

async function readEvents(response: Response, onEvent: (value: PlaygroundStreamEvent) => void) {
  if (!response.body) throw new Error('The model returned no readable stream.');
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  const processBlock = (block: string) => {
    let event = 'message';
    const data: string[] = [];
    for (const line of block.split(/\r?\n/)) {
      if (line.startsWith('event:')) event = line.slice(6).trim();
      if (line.startsWith('data:')) data.push(line.slice(5).trim());
    }
    if (!data.length || !['meta', 'delta', 'done', 'error'].includes(event)) return;
    onEvent({ event, data: JSON.parse(data.join('\n')) } as PlaygroundStreamEvent);
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
}

export const llmPlaygroundApi = {
  playgroundStatus: () => call<LLMPlaygroundStatus>('/llm-playground/status'),
  async streamPlaygroundChat(input: { model: string; messages: ChatMessage[]; temperature?: number; maxTokens?: number }, onEvent: (value: PlaygroundStreamEvent) => void, signal?: AbortSignal) {
    const response = await streamCall('/llm-playground/chat', input, signal);
    await readEvents(response, onEvent);
  },
};
