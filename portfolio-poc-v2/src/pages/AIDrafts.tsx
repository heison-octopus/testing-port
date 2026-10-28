import { useState } from 'react';
import { Brain, Check, EyeSlash, LinkSimple, Prohibit, Sparkle } from '@phosphor-icons/react';
import { Notice, PageHeader, Status } from '../components/Layout';
import { useI18n } from '../i18n';

const candidates = [
  {
    id: 'CANDIDATE-STUB-A',
    provider: 'local-contract-stub',
    model: 'not-connected',
    prompt: 'learner-profile-v1',
    textEn: 'Alex is a thoughtful learner who adapts after setbacks and supports classmates through practical action.',
    textZh: 'Alex 是一位處事周詳的學習者，遇到挫折後懂得調整，亦會以實際行動支持同學。',
    sources: ['ACT-COMM-001', 'PROOF-S1-TEAMWORK', 'OBS-S1-RESILIENCE'],
  },
  {
    id: 'CANDIDATE-STUB-B',
    provider: 'comparison-contract-stub',
    model: 'not-connected',
    prompt: 'learner-profile-v1-alt',
    textEn: 'Alex listens carefully, responds positively to feedback and is developing more consistent follow-through.',
    textZh: 'Alex 能細心聆聽，積極回應意見，並正逐步建立更穩定的跟進習慣。',
    sources: ['ACT-COMM-001', 'PROOF-S1-REFLECTION', 'OBS-S1-FOLLOW-UP'],
  },
];

export function AIDrafts() {
  const { isChinese, text, codeLabel } = useI18n();
  const [decisions, setDecisions] = useState<Record<string, string>>({});
  const [editedText, setEditedText] = useState({ en: candidates[0].textEn, zh: candidates[0].textZh });
  const choose = (id: string, decision: string) => setDecisions(current => ({ ...current, [id]: decision }));
  return <>
    <PageHeader kicker={text('P1 CONTRACT PREVIEW · NO PROVIDER EXECUTION', 'P1 合約預覽 · 不會執行供應商服務')} title={text('AI drafts and provenance', 'AI 草稿及來源記錄')} description={text('The review interface remains visible while generation and extraction routes are deliberately disconnected.', '生成及擷取路由刻意不接駁，但草稿覆核及來源記錄介面仍會完整顯示。')} action={<button className="primary" disabled><Sparkle size={17} />{text('Generation unavailable in this POC', '此 POC 不提供生成操作')}</button>} />
    <Notice tone="ai"><Brain size={20} />{text('These are deterministic dummy candidates. No prompt, student data or media leaves this browser and no AI endpoint is called.', '以下內容是固定的模擬候選；Prompt、學生資料及媒體不會離開瀏覽器，亦不會呼叫任何 AI 端點。')}</Notice>

    <section className="manifest-panel">
      <header><div><p>{text('FROZEN INPUT MANIFEST', '已凍結輸入清單')}</p><h2>MANIFEST-S1-P1</h2></div><Status value="approved" /></header>
      <div className="manifest-meta"><span><b>{text('Student', '學生')}</b>USR-S-001</span><span><b>{text('Period range', '時段範圍')}</b>2026-27-P1 → 2026-27-P1</span><span><b>{text('Controlled profile', '受控設定')}</b>{text('Non-academic and personal growth', '非學術參與及個人成長')}</span><span><b>{text('Prompt version', 'Prompt 版本')}</b>learner-profile-v1</span></div>
      <div className="manifest-sources">
        <article><LinkSimple size={18} /><div><b>ACT-COMM-001</b><span>{text('Approved activity description and confirmed outcome', '已批核活動說明及已確認成果')}</span></div><Status value="included" /></article>
        <article><LinkSimple size={18} /><div><b>PROOF-S1-TEAMWORK</b><span>{text('Accepted proof summary; raw media excluded', '已接納佐證摘要；不包括原始媒體')}</span></div><Status value="included" /></article>
        <article><LinkSimple size={18} /><div><b>RUBRIC-SNAPSHOT-S1</b><span>{text('Published rubric result snapshot', '已發布 Rubric 結果快照')}</span></div><Status value="included" /></article>
      </div>
    </section>

    <h2 className="section-title">{text('Independent, non-overwriting candidates', '互不覆蓋的獨立候選')}</h2>
    <div className="candidate-grid">{candidates.map(candidate => <article className="candidate-card" key={candidate.id}>
      <header><div><p className="mono">{candidate.id}</p><b>{candidate.provider}</b></div><Status value={decisions[candidate.id] || 'pending_review'} /></header>
      <dl><div><dt>{text('Model', '模型')}</dt><dd>{candidate.model}</dd></div><div><dt>{text('Prompt', 'Prompt')}</dt><dd>{candidate.prompt}</dd></div><div><dt>{text('Input manifest', '輸入清單')}</dt><dd>MANIFEST-S1-P1</dd></div></dl>
      <blockquote>{isChinese ? candidate.textZh : candidate.textEn}</blockquote>
      <div className="source-links">{candidate.sources.map(source => <span key={source}><LinkSimple size={13} />{source}</span>)}</div>
      <div className="candidate-actions"><button onClick={() => choose(candidate.id, 'included')}><Check size={16} />{text('Accept as editable draft', '接納為可編輯草稿')}</button><button onClick={() => choose(candidate.id, 'rejected')}><Prohibit size={16} />{text('Reject', '拒絕')}</button><button onClick={() => choose(candidate.id, 'ignored')}><EyeSlash size={16} />{text('Ignore', '略過')}</button></div>
    </article>)}</div>

    <section className="narrative-versions">
      <header><div><p>{text('ME AS A LEARNER · SEPARATE STATES', '作為學習者的我 · 分開保存狀態')}</p><h2>{text('Human-controlled narrative review', '由人員控制的敘述覆核')}</h2></div><span className="mono">LNV-S1-001</span></header>
      <div><label><span>{text('Generated text', '生成文字')}</span><textarea disabled value={isChinese ? candidates[0].textZh : candidates[0].textEn} /></label><label><span>{text('Teacher-edited text', '老師修訂文字')}</span><textarea value={isChinese ? editedText.zh : editedText.en} onChange={event => setEditedText(current => ({ ...current, [isChinese ? 'zh' : 'en']: event.target.value }))} /></label><label><span>{text('Final approved text', '最終已批核文字')}</span><textarea disabled value={text('Not set until a named human approval is complete.', '完成具名人工批核前不會設定。')} /></label></div>
      <footer><span>{text('Editing this field does not grant access to the student’s self-introduction or another educator’s observation.', '修改此欄不代表可以修改學生自我介紹或其他教育人員的觀察。')}</span><Status value="pending_review" /></footer>
    </section>
    <Notice tone="warning">{text('POC decisions on this page are local visual states only. They do not persist, publish a Portfolio, accept proof or change a rubric step.', '此頁的 POC 決定只屬本機視覺狀態，不會保存、發布 Portfolio、接納佐證或更改 Rubric 階段。')}</Notice>
  </>;
}
