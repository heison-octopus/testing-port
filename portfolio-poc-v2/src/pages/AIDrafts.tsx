import { useEffect, useState } from 'react';
import { Brain, Check, EyeSlash, LinkSimple, Prohibit, Sparkle } from '@phosphor-icons/react';
import { api } from '../api/client';
import type { AIDraftWorkspace } from '../../shared/types';
import { Field, Notice, PageHeader, Status } from '../components/Layout';
import { useI18n } from '../i18n';

export function AIDrafts({ report }: { report: (error: unknown) => void }) {
  const { isChinese, text } = useI18n();
  const [workspace, setWorkspace] = useState<AIDraftWorkspace | null>(null);
  const [decisionReason, setDecisionReason] = useState('');
  const [editReason, setEditReason] = useState('');
  const [editedText, setEditedText] = useState('');
  const [working, setWorking] = useState(false);

  async function load() {
    try {
      const list = await api.aiDrafts();
      const first = list.manifests[0];
      if (first) {
        const detail = await api.aiDraft(first.manifest_id);
        setWorkspace(detail);
        setEditedText(detail.narrative?.teacher_edited_text || detail.narrative?.generated_text || '');
      }
    } catch (error) { report(error); }
  }
  useEffect(() => { load(); }, []);

  async function generate() {
    if (!workspace) return;
    setWorking(true);
    try { await api.generateAiDraft(workspace.manifest_id); await load(); }
    catch (error) { report(error); }
    finally { setWorking(false); }
  }

  async function decide(candidateId: string, outcome: string) {
    if (!decisionReason.trim()) return;
    try { await api.decideAiCandidate(candidateId, outcome, decisionReason); setDecisionReason(''); await load(); }
    catch (error) { report(error); }
  }

  async function saveNarrative() {
    if (!workspace?.narrative || !editReason.trim() || !editedText.trim()) return;
    try { await api.editLearnerNarrative(workspace.narrative.learner_narrative_version_id, editedText, editReason); setEditReason(''); await load(); }
    catch (error) { report(error); }
  }

  if (!workspace) return <Notice>{text('No assigned AI draft workspace is available.', '目前沒有獲分派的 AI 草稿工作區。')}</Notice>;
  return <>
    <PageHeader
      kicker={text('P1 CONTRACT PREVIEW · SERVER-ISOLATED PROVIDER', 'P1 合約預覽 · 伺服器隔離供應商')}
      title={text('AI drafts and provenance', 'AI 草稿及來源記錄')}
      description={text('Frozen inputs, independent candidates and human decisions are persisted through the protected Node API.', '已凍結輸入、獨立候選及人工決定均透過受保護的 Node API 保存。')}
      action={<button className="primary" disabled={!workspace.generation.available || working} onClick={generate}><Sparkle size={17} />{workspace.generation.available ? text(working ? 'Generating…' : 'Generate independent candidate', working ? '生成中…' : '生成獨立候選') : text('Local LLM not configured', '尚未設定本機 LLM')}</button>}
    />
    <Notice tone="ai"><Brain size={20} />{text('The browser never calls the LLM directly. Generated text remains a source-linked candidate until a named human reviewer decides.', '瀏覽器不會直接呼叫 LLM。生成文字會保留為連繫來源的候選，直至具名人工覆核人作出決定。')}</Notice>

    <section className="manifest-panel">
      <header><div><p>{text('FROZEN INPUT MANIFEST', '已凍結輸入清單')}</p><h2>{workspace.manifest_id}</h2></div><Status value={workspace.status} /></header>
      <div className="manifest-meta"><span><b>{text('Student', '學生')}</b>{workspace.student_user_id}</span><span><b>{text('Period range', '時段範圍')}</b>{workspace.period_from} → {workspace.period_to}</span><span><b>{text('Controlled profile', '受控設定')}</b>{workspace.controlled_profile.replaceAll('_', ' ')}</span><span><b>{text('Prompt version', 'Prompt 版本')}</b>{workspace.prompt_version}</span></div>
      <div className="manifest-sources">{workspace.sources.map(source => <article key={source.manifest_source_id}><LinkSimple size={18} /><div><b>{source.source_id}</b><span>{isChinese ? source.summary_zh || source.summary_en : source.summary_en}</span></div><Status value="included" /></article>)}</div>
    </section>

    <h2 className="section-title">{text('Independent, non-overwriting candidates', '互不覆蓋的獨立候選')}</h2>
    <Field label={text('Decision reason (required)', '決定原因（必填）')}><input value={decisionReason} onChange={event => setDecisionReason(event.target.value)} /></Field>
    <div className="candidate-grid">{workspace.candidates.map(candidate => <article className="candidate-card" key={candidate.candidate_id}>
      <header><div><p className="mono">{candidate.candidate_id}</p><b>{candidate.provider}</b></div><Status value={candidate.review_status} /></header>
      <dl><div><dt>{text('Model', '模型')}</dt><dd>{candidate.model}</dd></div><div><dt>{text('Prompt', 'Prompt')}</dt><dd>{candidate.prompt_version}</dd></div><div><dt>{text('Input manifest', '輸入清單')}</dt><dd>{workspace.manifest_id}</dd></div></dl>
      <blockquote>{isChinese ? candidate.generated_text_zh || candidate.generated_text_en : candidate.generated_text_en || candidate.generated_text_zh}</blockquote>
      <div className="source-links">{candidate.sourceRefs.map(source => <span key={source}><LinkSimple size={13} />{source}</span>)}</div>
      <div className="candidate-actions"><button disabled={!decisionReason.trim()} onClick={() => decide(candidate.candidate_id, 'included')}><Check size={16} />{text('Accept as editable draft', '接納為可編輯草稿')}</button><button disabled={!decisionReason.trim()} onClick={() => decide(candidate.candidate_id, 'rejected')}><Prohibit size={16} />{text('Reject', '拒絕')}</button><button disabled={!decisionReason.trim()} onClick={() => decide(candidate.candidate_id, 'ignored')}><EyeSlash size={16} />{text('Ignore', '略過')}</button></div>
    </article>)}</div>

    {workspace.narrative && <section className="narrative-versions">
      <header><div><p>{text('ME AS A LEARNER · SEPARATE STATES', '作為學習者的我 · 分開保存狀態')}</p><h2>{text('Human-controlled narrative review', '由人員控制的敘述覆核')}</h2></div><span className="mono">{workspace.narrative.learner_narrative_version_id}</span></header>
      <div><label><span>{text('Generated text', '生成文字')}</span><textarea disabled value={workspace.narrative.generated_text || ''} /></label><label><span>{text('Teacher-edited text', '老師修訂文字')}</span><textarea disabled={!workspace.access.canEditNarrative} value={editedText} onChange={event => setEditedText(event.target.value)} /></label><label><span>{text('Final approved text', '最終已批核文字')}</span><textarea disabled value={workspace.narrative.final_approved_text || text('Not set until named approval is complete.', '完成具名批核前不會設定。')} /></label></div>
      {workspace.access.canEditNarrative && <div className="review-strip"><Field label={text('Narrative edit reason', '敘述修改原因')}><input value={editReason} onChange={event => setEditReason(event.target.value)} /></Field><button className="primary" disabled={!editReason.trim() || !editedText.trim()} onClick={saveNarrative}>{text('Save audited edit', '儲存可稽核修改')}</button></div>}
      <footer><span>{text('This permission does not allow editing student-authored text or another educator’s observation.', '此權限不包括修改學生撰寫文字或其他教育人員的觀察。')}</span><Status value={workspace.narrative.approval_status} /></footer>
    </section>}
    <Notice tone="warning">{text('AI output remains advisory. It cannot publish a Portfolio, accept proof or change a rubric step.', 'AI 輸出只供參考，不能發布 Portfolio、接納佐證或更改 Rubric 階段。')}</Notice>
  </>;
}
