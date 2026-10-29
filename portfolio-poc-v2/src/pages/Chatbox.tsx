import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUp, Broom, Stop } from '@phosphor-icons/react';
import { api } from '../api/client';
import type { PlaygroundUsage } from '../api/llmPlayground';
import type { ChatMessage, LLMPlaygroundStatus } from '../../shared/types';
import { Field, Notice, PageHeader } from '../components/Layout';
import { useI18n } from '../i18n';

const STORAGE_KEY = 'bhss-v2-chatbox-v1';

type Metrics = { waitMs: number; generationMs: number; totalMs: number; outputUnits: number; wpm: number; usage: PlaygroundUsage | null };
type LocalMessage = ChatMessage & { id: string; createdAt: string; model?: string; metrics?: Metrics };
type StoredChat = { messages: LocalMessage[]; selectedModel: string };

function loadStored(storageKey: string): StoredChat {
  try {
    const value = JSON.parse(localStorage.getItem(storageKey) || '{}');
    return { messages: Array.isArray(value.messages) ? value.messages.slice(-100) : [], selectedModel: typeof value.selectedModel === 'string' ? value.selectedModel : '' };
  } catch { return { messages: [], selectedModel: '' }; }
}

function outputUnits(value: string) {
  const cjk = value.match(/[\u3400-\u9fff\uf900-\ufaff]/g)?.length || 0;
  const latin = value.replace(/[\u3400-\u9fff\uf900-\ufaff]/g, ' ').match(/[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu)?.length || 0;
  return cjk + latin;
}

function duration(value: number) { return value < 1_000 ? `${Math.round(value)} ms` : `${(value / 1_000).toFixed(2)} s`; }
function tokenCount(value: number | null | undefined) { return typeof value === 'number' ? new Intl.NumberFormat('en-HK').format(value) : '—'; }

export function Chatbox({ userId, report }: { userId: string; report: (value: unknown) => void }) {
  const { text } = useI18n();
  const storageKey = `${STORAGE_KEY}:${userId}`;
  const initial = useMemo(() => loadStored(storageKey), [storageKey]);
  const [messages, setMessages] = useState<LocalMessage[]>(initial.messages);
  const [selectedModel, setSelectedModel] = useState(initial.selectedModel);
  const [status, setStatus] = useState<LLMPlaygroundStatus | null>(null);
  const [draft, setDraft] = useState('');
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(1024);
  const [loading, setLoading] = useState(true);
  const [streaming, setStreaming] = useState(false);
  const [localError, setLocalError] = useState('');
  const abortRef = useRef<AbortController | null>(null);
  const historyRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    api.playgroundStatus().then(value => {
      setStatus(value);
      setSelectedModel(current => value.models.some(item => item.id === current) ? current : value.configuredModel || '');
    }).catch(value => setLocalError(value instanceof Error ? value.message : text('Model discovery failed.', '未能取得模型清單。'))).finally(() => setLoading(false));
  }, [text]);
  useEffect(() => { localStorage.setItem(storageKey, JSON.stringify({ messages: messages.slice(-100), selectedModel })); }, [messages, selectedModel, storageKey]);
  useEffect(() => { historyRef.current?.scrollTo({ top: historyRef.current.scrollHeight, behavior: streaming ? 'auto' : 'smooth' }); }, [messages, streaming]);
  useEffect(() => () => abortRef.current?.abort(), []);

  const model = status?.models.find(item => item.id === selectedModel);
  const historyCharacters = messages.reduce((sum, item) => sum + item.content.length, 0);
  const latestUsage = [...messages].reverse().find(item => item.metrics?.usage)?.metrics?.usage || null;

  async function send() {
    const content = draft.trim();
    if (!content || !selectedModel || streaming) return;
    setLocalError('');
    const now = new Date().toISOString();
    const userMessage: LocalMessage = { id: crypto.randomUUID(), role: 'user', content, createdAt: now };
    const assistantId = crypto.randomUUID();
    const assistant: LocalMessage = { id: assistantId, role: 'assistant', content: '', createdAt: now, model: selectedModel };
    const promptMessages = [...messages, userMessage].filter(item => item.content.trim()).map(({ role, content: value }) => ({ role, content: value }));
    setMessages(current => [...current, userMessage, assistant]);
    setDraft('');
    setStreaming(true);
    const abort = new AbortController();
    abortRef.current = abort;
    const startedAt = performance.now();
    let firstTokenAt: number | null = null;
    let generated = '';
    let usage: PlaygroundUsage | null = null;
    let streamError = '';
    try {
      await api.streamPlaygroundChat({ model: selectedModel, messages: promptMessages, temperature, maxTokens }, event => {
        if (event.event === 'delta') {
          if (firstTokenAt === null) firstTokenAt = performance.now();
          generated += event.data.text;
          setMessages(current => current.map(item => item.id === assistantId ? { ...item, content: generated } : item));
        } else if (event.event === 'done') usage = event.data.usage;
        else if (event.event === 'error') streamError = event.data.error;
      }, abort.signal);
      if (streamError) throw new Error(streamError);
      const completedAt = performance.now();
      const first = firstTokenAt ?? completedAt;
      const generationMs = Math.max(1, completedAt - first);
      const units = outputUnits(generated);
      const metrics: Metrics = {
        waitMs: first - startedAt,
        generationMs,
        totalMs: completedAt - startedAt,
        outputUnits: units,
        wpm: units ? Math.round(units / (generationMs / 60_000)) : 0,
        usage,
      };
      setMessages(current => current.map(item => item.id === assistantId ? { ...item, content: generated || text('(No text returned)', '（模型沒有傳回文字）'), metrics } : item));
    } catch (value) {
      if (abort.signal.aborted) {
        setMessages(current => current.map(item => item.id === assistantId ? { ...item, content: generated || text('(Stopped)', '（已停止）') } : item));
      } else {
        setMessages(current => current.filter(item => item.id !== assistantId));
        const message = value instanceof Error ? value.message : text('The model request failed.', '模型請求失敗。');
        setLocalError(message);
        report(value);
      }
    } finally {
      abortRef.current = null;
      setStreaming(false);
    }
  }

  function clearHistory() {
    if (streaming) return;
    setMessages([]);
    setLocalError('');
  }

  return <>
    <PageHeader kicker={text('V2-ONLY · LOCAL MODEL TOOL', '只限 V2 · 本機模型工具')} title={text('Model chatbox', '模型對話')} description={text('Chat through the protected Node API. Conversation history stays in this browser only and is sent back as context on the next turn.', '透過受保護的 Node API 對話。對話紀錄只保留在此瀏覽器，並會在下一輪作為上下文重新傳送。')} action={<button className="secondary-action" onClick={clearHistory} disabled={streaming || !messages.length}><Broom size={17} />{text('Clear local history', '清除本機紀錄')}</button>} />
    {localError && <Notice tone="warning">{localError}</Notice>}
    <section className="chat-status" aria-label={text('Model and context status', '模型及上下文狀態')}>
      <Field label={text('Available model', '可用模型')}><select value={selectedModel} disabled={loading || streaming} onChange={event => setSelectedModel(event.target.value)}><option value="">{loading ? text('Discovering models…', '正在搜尋模型…') : text('Select a model', '選擇模型')}</option>{status?.models.map(item => <option value={item.id} key={item.id}>{item.id}</option>)}</select></Field>
      <div><span>{text('Context window', '上下文視窗')}</span><b>{tokenCount(model?.contextWindow)} {text('tokens', 'tokens')}</b><small>{model?.ownedBy || text('Provider did not report an owner', '供應商沒有提供擁有者')}</small></div>
      <div><span>{text('History estimate', '紀錄估算')}</span><b>≈ {tokenCount(Math.ceil(historyCharacters / 4))} {text('tokens', 'tokens')}</b><small>{text('Rough browser estimate; model tokenization differs.', '瀏覽器粗略估算；實際模型斷詞會有差異。')}</small></div>
      <div><span>{text('Last actual usage', '上次實際用量')}</span><b>{tokenCount(latestUsage?.total_tokens)} {text('tokens', 'tokens')}</b><small>{latestUsage ? `${tokenCount(latestUsage.prompt_tokens)} ${text('input', '輸入')} · ${tokenCount(latestUsage.completion_tokens)} ${text('output', '輸出')}` : text('Shown when the provider reports usage.', '供應商有提供用量時才會顯示。')}</small></div>
    </section>
    <section className="chat-workspace">
      <div className="chat-history" ref={historyRef} aria-live="polite">
        {!messages.length && <div className="chat-empty"><b>{text('Start a local test conversation', '開始本機測試對話')}</b><span>{text('Choose any discovered model. The API key remains on the Node server.', '選擇任何已搜尋到的模型。API key 只會保留在 Node 伺服器。')}</span></div>}
        {messages.map(item => <article className={`chat-message ${item.role}`} key={item.id}>
          <header><b>{item.role === 'user' ? text('You', '你') : item.model || text('Model', '模型')}</b><time>{new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time></header>
          <p>{item.content || <span className="stream-cursor">▍</span>}</p>
          {item.metrics && <footer className="chat-metrics">
            <span><b>{duration(item.metrics.waitMs)}</b>{text('Wait to first token', '首個 token 等候')}</span>
            <span><b>{duration(item.metrics.generationMs)}</b>{text('Generation', '生成時間')}</span>
            <span><b>{duration(item.metrics.totalMs)}</b>{text('Total', '總時間')}</span>
            <span><b>{tokenCount(item.metrics.wpm)}</b>{text('WPM after wait', '等候後 WPM')}</span>
            <span><b>{tokenCount(item.metrics.outputUnits)}</b>{text('words / CJK chars', '字詞／中文字元')}</span>
          </footer>}
        </article>)}
      </div>
      <div className="chat-controls">
        <div className="chat-tuning"><Field label={text('Temperature', 'Temperature')}><input type="number" min="0" max="2" step="0.1" value={temperature} disabled={streaming} onChange={event => setTemperature(Number(event.target.value))} /></Field><Field label={text('Maximum output tokens', '最多輸出 tokens')}><input type="number" min="16" max="4096" step="16" value={maxTokens} disabled={streaming} onChange={event => setMaxTokens(Number(event.target.value))} /></Field></div>
        <Field label={text('Message', '訊息')}><textarea value={draft} disabled={streaming} placeholder={text('Ask the selected model…', '向所選模型提問…')} onChange={event => setDraft(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void send(); } }} /></Field>
        <div className="chat-send-row"><small>{text('Enter to send · Shift+Enter for a new line', 'Enter 傳送 · Shift+Enter 換行')}</small>{streaming ? <button className="stop-action" onClick={() => abortRef.current?.abort()}><Stop size={17} />{text('Stop', '停止')}</button> : <button className="primary" onClick={() => void send()} disabled={!draft.trim() || !selectedModel}><ArrowUp size={17} />{text('Send', '傳送')}</button>}</div>
      </div>
    </section>
  </>;
}
