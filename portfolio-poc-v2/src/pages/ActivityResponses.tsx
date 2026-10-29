import { useEffect, useState } from 'react';
import { ChatCircleText, CheckCircle, Clock, PaperPlaneTilt, UserFocus } from '@phosphor-icons/react';
import { api } from '../api/client';
import type { ResponseTask } from '../../shared/types';
import { Notice, PageHeader, Status } from '../components/Layout';
import { useI18n } from '../i18n';

export function ActivityResponses({ report, focusRecipientId, onSelectTask, onUnavailable }: { report: (error: unknown) => void; focusRecipientId?: string; onSelectTask: (recipientId: string) => void; onUnavailable: () => void }) {
  const { isChinese, text, codeLabel, formatDateTime } = useI18n();
  const [tasks, setTasks] = useState<ResponseTask[]>([]);
  const [selected, setSelected] = useState<ResponseTask | null>(null);
  const [answers, setAnswers] = useState<Record<string,string>>({});

  function hydrate(task: ResponseTask | null) {
    setSelected(task);
    setAnswers(Object.fromEntries((task?.latestSubmission?.responses || []).map(item => [item.item_key, item.text_value || ''])));
  }
  async function load(preferredId?: string) {
    try {
      const data = await api.responseTasks();
      setTasks(data);
      const id = preferredId || focusRecipientId || selected?.assignment_recipient_id || data[0]?.assignment_recipient_id;
      const task = data.find(item => item.assignment_recipient_id === id) || null;
      if (focusRecipientId && !task) { onUnavailable(); return; }
      hydrate(task);
    } catch (error) { report(error); }
  }
  useEffect(() => {
    if (focusRecipientId && selected?.assignment_recipient_id === focusRecipientId) return;
    void load(focusRecipientId);
  }, [focusRecipientId]);
  async function choose(task: ResponseTask) { onSelectTask(task.assignment_recipient_id); hydrate(task); }
  async function save() {
    if (!selected) return;
    try { const task = await api.saveResponseDraft(selected.assignment_recipient_id, answers); hydrate(task); await load(task.assignment_recipient_id); }
    catch (error) { report(error); }
  }
  async function submit() {
    if (!selected) return;
    try { const task = await api.submitResponse(selected.assignment_recipient_id); hydrate(task); await load(task.assignment_recipient_id); }
    catch (error) { report(error); }
  }
  const editable = !selected?.latestSubmission || ['draft','changes_requested'].includes(selected.latestSubmission.content_status);
  const responseStatus = selected?.latestSubmission?.content_status || selected?.status || 'not_submitted';
  return <>
    <PageHeader kicker={text('STUDENT VOICE · NAMED RESPONSE TASKS', '學生聲音 · 具名回應任務')} title={text('Activity responses', '活動回應')} description={text('Write your own reflection here. Peer feedback appears only when a teacher has assigned you to one named classmate.', '在此撰寫自己的活動反思；只有老師把你具名分派給一位同學後，才會出現同儕互評任務。')} />
    <div className="response-workspace">
      <section className="response-task-list">
        {tasks.map(task => <button key={task.assignment_recipient_id} className={selected?.assignment_recipient_id === task.assignment_recipient_id ? 'response-task selected' : 'response-task'} onClick={() => void choose(task)}>
          <span className="task-icon">{task.perspective === 'peer_observation' ? <UserFocus size={20} /> : <ChatCircleText size={20} />}</span>
          <span><b>{isChinese ? task.title_zh || task.title_en : task.title_en}</b><small>{task.perspective === 'peer_observation' ? `${text('Peer review for', '同儕互評對象')} ${isChinese ? task.subject_name_zh : task.subject_name}` : text('My reflection', '我的反思')}</small></span>
          <Status value={task.latestSubmission?.content_status || task.status} />
        </button>)}
        {!tasks.length && <Notice>{text('No activity response task is assigned.', '目前沒有已分派的活動回應任務。')}</Notice>}
      </section>
      <section className="response-sheet">{selected ? <>
        <header className="response-heading"><div><p>{codeLabel(selected.perspective)}</p><h2>{isChinese ? selected.title_zh || selected.title_en : selected.title_en}</h2><span>{isChinese ? selected.description_zh || selected.description_en : selected.description_en}</span></div><Status value={responseStatus} /></header>
        <div className="task-context"><span><Clock size={18} /><b>{text('Due', '期限')}</b>{formatDateTime(selected.due_at)}</span><span><UserFocus size={18} /><b>{text('Subject', '對象')}</b>{isChinese ? selected.subject_name_zh : selected.subject_name}</span><span><CheckCircle size={18} /><b>{text('Form version', '表格版本')}</b>{selected.form_version_id}</span></div>
        {selected.perspective === 'peer_observation' && <Notice tone="warning">{text('You may respond only about the named student and this activity. You cannot open their wider record. Peer content stays unpublished until moderation.', '你只可就此活動及獲分派學生作回應，不能開啟對方的其他紀錄。同儕內容完成覆核前不會發布。')}</Notice>}
        {selected.latestSubmission?.content_status === 'changes_requested' && <Notice tone="warning">{selected.latestSubmission.review_reason || text('The assessor returned this response for a new revision.', '評估人已退回此回應，請建立新修訂。')}</Notice>}
        <div className="response-questions">{selected.questions.map((question, index) => <label key={question.item_key}><span><em>{String(index + 1).padStart(2, '0')}</em><b>{isChinese ? question.prompt_zh : question.prompt_en}</b>{question.required ? <small>{text('Required', '必填')}</small> : <small>{text('Optional', '選填')}</small>}</span><textarea disabled={!editable} value={answers[question.item_key] || ''} onChange={event => setAnswers({ ...answers, [question.item_key]: event.target.value })} maxLength={4000} /></label>)}</div>
        {editable ? <footer className="response-actions"><span>{text('Saving keeps a private draft. Submitting freezes this revision for review.', '儲存只會保留私人草稿；提交後會凍結此修訂供覆核。')}</span><button onClick={save}>{text('Save draft', '儲存草稿')}</button><button className="primary" onClick={submit}><PaperPlaneTilt size={17} />{text('Submit response', '提交回應')}</button></footer> : <Notice tone="success">{text('This revision is locked after submission. A returned task will create a new editable successor and preserve this version.', '此修訂提交後已鎖定；如被退回，系統會建立新的可編輯後續修訂並保留本版本。')}</Notice>}
      </> : <div className="activity-empty"><ChatCircleText size={36} /><h2>{text('Choose a response task', '選擇回應任務')}</h2><p>{text('Self reflection and explicitly assigned peer feedback remain separate source records.', '自我反思與具名分派的同儕互評會分開保存為不同來源紀錄。')}</p></div>}</section>
    </div>
  </>;
}
