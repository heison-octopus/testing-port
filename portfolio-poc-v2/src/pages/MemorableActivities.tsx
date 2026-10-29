import { useEffect, useState } from 'react';
import { CalendarCheck, CheckCircle, PaperPlaneTilt, Star } from '@phosphor-icons/react';
import { api } from '../api/client';
import type { MemorableWorkspace } from '../../shared/types';
import { Notice, PageHeader, Status } from '../components/Layout';
import { useI18n } from '../i18n';

export function MemorableActivities({ report }: { report: (error: unknown) => void }) {
  const { isChinese, text, formatDateTime } = useI18n();
  const [workspace, setWorkspace] = useState<MemorableWorkspace | null>(null);
  const [activityId, setActivityId] = useState('');
  const [reason, setReason] = useState('');
  async function load() { try { const value = await api.memorableActivities(); setWorkspace(value); setActivityId(current => current || value.eligibleActivities[0]?.activity_id || ''); } catch (error) { report(error); } }
  useEffect(() => { void load(); }, []);
  function choose(id: string) {
    const activity = workspace?.eligibleActivities.find(item => item.activity_id === id);
    setActivityId(id); setReason(activity?.selection_reason || '');
  }
  async function save(event: React.FormEvent) { event.preventDefault(); try { const value = await api.saveMemorableActivity({ activityId, reason, periodId: workspace?.periodId }); setWorkspace(value); setReason(value.eligibleActivities.find(item => item.activity_id === activityId)?.selection_reason || reason); } catch (error) { report(error); } }
  async function submit(selectionId: string) { try { setWorkspace(await api.submitMemorableActivity(selectionId)); } catch (error) { report(error); } }
  const selected = workspace?.eligibleActivities.find(item => item.activity_id === activityId);
  const editable = workspace?.window.isOpen && (!selected?.submission_status || ['draft','changes_requested'].includes(selected.submission_status));
  return <>
    <PageHeader kicker={text('CURATION · NOT ASSESSMENT', '整理展示 · 並非評估')} title={text('Memorable activities', '最難忘活動')} description={text('Choose meaningful activities and explain why they mattered. This page curates your Portfolio story; it never awards or changes a 1–16 skill step.', '選出對你有意義的活動並說明原因。本頁只整理你的 Portfolio 故事，不會授予或改動任何 1–16 技能階段。')} />
    {workspace && <>
      <div className={workspace.window.isOpen ? 'selection-window open' : 'selection-window closed'}><CalendarCheck size={23} /><div><b>{workspace.window.isOpen ? text('Selection window is open', '選擇時段已開放') : text('Selection window is closed', '選擇時段已關閉')}</b><span>{formatDateTime(workspace.window.opens_at)} → {formatDateTime(workspace.window.closes_at)} · {text('maximum', '最多')} {workspace.window.max_selections}</span></div></div>
      <div className="memorable-workspace">
        <section className="eligible-activities">{workspace.eligibleActivities.map(activity => <button className={activityId === activity.activity_id ? 'selected' : ''} key={activity.activity_id} onClick={() => choose(activity.activity_id)}><Star size={21} weight={activity.submission_status ? 'fill' : 'regular'} /><span><b>{isChinese ? activity.title_zh || activity.title_en : activity.title_en}</b><small>{isChinese ? activity.description_zh || activity.description_en : activity.description_en}</small></span><Status value={activity.submission_status || 'not_selected'} /></button>)}{!workspace.eligibleActivities.length && <Notice>{text('No published joined activity is eligible in this period.', '本學段未有已發布並由你參與的合資格活動。')}</Notice>}</section>
        <section className="memorable-editor">{selected ? <form onSubmit={save}><header><div><p>{selected.activity_id}</p><h2>{isChinese ? selected.title_zh || selected.title_en : selected.title_en}</h2></div><Status value={selected.submission_status || 'not_selected'} /></header><label><span>{text('Why was this activity meaningful or memorable?', '為甚麼這項活動對你有意義或令你難忘？')}</span><textarea required disabled={!editable} maxLength={4000} value={reason} onChange={event => setReason(event.target.value)} /></label>{editable ? <div className="memorable-actions"><span>{text('Save a draft first. Submission freezes this selection for Portfolio review.', '先儲存草稿；提交後會凍結此選擇，供 Portfolio 覆核。')}</span><button>{text('Save selection', '儲存選擇')}</button>{selected.selection_id && selected.submission_status === 'draft' && <button type="button" className="primary" onClick={() => void submit(selected.selection_id!)}><PaperPlaneTilt />{text('Submit selection', '提交選擇')}</button>}</div> : <Notice tone="success"><CheckCircle size={18} /> {text('This selection is submitted and locked. It remains separate from the Portfolio editor and from skill assessment.', '此選擇已提交並鎖定，會與 Portfolio 編輯器及技能評估分開處理。')}</Notice>}</form> : <div className="activity-empty"><Star size={36} /><h2>{text('Choose an eligible activity', '選擇合資格活動')}</h2></div>}</section>
      </div>
      {workspace.selections.length > 0 && <section className="selection-register"><h3>{text('Selection register', '選擇紀錄')}</h3>{workspace.selections.map(item => <article key={item.selection_id}><span><b>{isChinese ? item.title_zh || item.title_en || item.source_id : item.title_en || item.source_id}</b><small>{item.selection_id}</small></span><blockquote>{item.selection_reason}</blockquote><Status value={item.submission_status} /></article>)}</section>}
    </>}
  </>;
}
