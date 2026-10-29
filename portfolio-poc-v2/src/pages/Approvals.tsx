import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, ClockCountdown, FileMagnifyingGlass, Funnel, UserCircle } from '@phosphor-icons/react';
import { api } from '../api/client';
import type { Approval, Escalation } from '../../shared/types';
import { Notice, PageHeader, Status } from '../components/Layout';
import { useI18n } from '../i18n';

export function Approvals({ report, onOpenActivity, onOpenPortfolio }: { report: (error: unknown) => void; onOpenActivity: (activityId: string) => void; onOpenPortfolio: (studentId: string) => void }) {
  const { isChinese, text, codeLabel, formatDateTime } = useI18n();
  const [assignments, setAssignments] = useState<Approval[]>([]);
  const [escalations, setEscalations] = useState<Escalation[]>([]);
  const [reasons, setReasons] = useState<Record<string,string>>({});
  const [workflow, setWorkflow] = useState('all');
  const [state, setState] = useState('active');
  const [search, setSearch] = useState('');

  async function load() {
    try {
      const data = await api.approvals();
      setAssignments(data.assignments);
      setEscalations(data.escalations);
    } catch (error) { report(error); }
  }
  useEffect(() => { void load(); }, []);
  async function decide(item: Approval, outcome: string) {
    try {
      await api.decide(item.approval_assignment_id, outcome, reasons[item.approval_assignment_id] || text('Reviewed against the configured policy and scope.', '已按設定的政策及適用範圍完成覆核。'));
      await load();
    } catch (error) { report(error); }
  }

  const filtered = useMemo(() => assignments.filter(item => {
    if (workflow !== 'all' && item.workflow_type !== workflow) return false;
    const isActive = ['assigned','in_review'].includes(item.status);
    if (state === 'active' && !isActive) return false;
    if (state === 'completed' && isActive) return false;
    if (search) {
      const haystack = [item.target_title,item.target_title_zh,item.target_id,item.target_version_id,item.target_owner_name,item.target_owner_name_zh,item.target_student_name,item.target_student_name_zh,item.assignee_name,item.assignee_name_zh].join(' ').toLowerCase();
      if (!haystack.includes(search.toLowerCase())) return false;
    }
    return true;
  }), [assignments, workflow, state, search]);

  return <>
    <PageHeader kicker={text('PROCESS · NAMED ASSIGNMENT · IMMUTABLE DECISION', '處理 · 具名分派 · 不可改寫決定')} title={text('Approval and publication inbox', '批核及發布收件箱')} description={text('Every row identifies the record, its creator, revision, named assignee, due date and retained decision reason.', '每一列均列明紀錄、建立者、修訂、具名獲分派人、期限及保留的決定原因。')} />

    <div className="approval-metrics">
      <div><b>{assignments.filter(item => ['assigned','in_review'].includes(item.status)).length}</b><span>{text('active assignments', '項待處理分派')}</span></div>
      <div><b>{assignments.filter(item => item.workflow_type === 'activity').length}</b><span>{text('activity approvals', '項活動批核')}</span></div>
      <div><b>{assignments.filter(item => item.workflow_type === 'activity_publication').length}</b><span>{text('activity publications', '項活動發布')}</span></div>
      <div><b>{escalations.filter(item => item.status === 'open').length}</b><span>{text('open escalations', '項待處理升級個案')}</span></div>
    </div>

    <div className="approval-filters">
      <Funnel size={18} />
      <label><span>{text('Workflow', '工作流程')}</span><select value={workflow} onChange={event => setWorkflow(event.target.value)}><option value="all">{text('All workflows', '所有工作流程')}</option><option value="activity">{text('Activity approval', '活動批核')}</option><option value="activity_publication">{text('Activity publication', '活動發布')}</option><option value="portfolio">{text('Portfolio approval', 'Portfolio 批核')}</option><option value="portfolio_publication">{text('Portfolio publication', 'Portfolio 發布')}</option></select></label>
      <label><span>{text('State', '狀態')}</span><select value={state} onChange={event => setState(event.target.value)}><option value="active">{text('Needs action', '需要處理')}</option><option value="completed">{text('Completed history', '已完成紀錄')}</option><option value="all">{text('All states', '所有狀態')}</option></select></label>
      <label className="search-filter"><span>{text('Find record, creator or assignee', '搜尋紀錄、建立者或獲分派人')}</span><input value={search} onChange={event => setSearch(event.target.value)} /></label>
    </div>

    <section className="approval-inbox">
      {filtered.map(item => {
        const title = item.target_title ? (isChinese ? item.target_title_zh || item.target_title : item.target_title) : item.target_student_name ? (isChinese ? item.target_student_name_zh || item.target_student_name : item.target_student_name) : item.target_id;
        const owner = item.target_owner_name ? (isChinese ? item.target_owner_name_zh || item.target_owner_name : item.target_owner_name) : item.target_student_name ? (isChinese ? item.target_student_name_zh || item.target_student_name : item.target_student_name) : undefined;
        return <article className={item.canDecide ? 'approval-record actionable' : 'approval-record'} key={item.approval_assignment_id}>
          <div className="approval-kind"><span>{String(item.step_name || '').slice(0,1)}</span><small>{codeLabel(item.workflow_type)}</small></div>
          <div className="approval-target">
            <p>{isChinese ? item.step_name_zh || item.step_name : item.step_name}</p>
            <h2>{title}</h2>
            <div className="target-meta">
              {item.target_revision_number && <span>{text('Revision', '修訂')} {item.target_revision_number}</span>}
              {item.target_portfolio_version_number && <span>Portfolio v{item.target_portfolio_version_number}</span>}
              <span className="mono">{item.target_version_id || item.target_id}</span>
            </div>
            {owner && <div className="creator-line"><UserCircle size={16} />{item.target_owner_name ? text('Created by', '建立者') : text('Student', '學生')} {owner}</div>}
          </div>
          <div className="assignment-meta">
            <span>{text('Named assignee', '具名獲分派人')}</span>
            <b>{(isChinese ? item.assignee_name_zh || item.assignee_name : item.assignee_name) || text('Unassigned', '未分派')}</b>
            <small>{text('Assigned by', '分派人')} {isChinese ? item.assigned_by_name_zh || item.assigned_by_name : item.assigned_by_name}</small>
            <small>{text('Due', '期限')} {formatDateTime(item.due_at)}</small>
          </div>
          <div className="approval-state"><Status value={item.status} />{item.decision_reason && <blockquote>{item.decision_reason}</blockquote>}{item.decided_by_name && <small>{text('Decided by', '決定人')} {isChinese ? item.decided_by_name_zh || item.decided_by_name : item.decided_by_name} · {formatDateTime(item.decided_at)}</small>}</div>
          <div className="approval-actions">
            {item.target_type === 'activity' && <button className="open-record" onClick={() => onOpenActivity(item.target_id)}><FileMagnifyingGlass size={17} />{text('Open activity', '開啟活動')}<ArrowRight size={15} /></button>}
            {item.target_student_user_id && <button className="open-record" onClick={() => onOpenPortfolio(item.target_student_user_id!)}><FileMagnifyingGlass size={17} />{text('Open student Portfolio', '開啟學生 Portfolio')}<ArrowRight size={15} /></button>}
            {item.canDecide ? <><input value={reasons[item.approval_assignment_id] || ''} onChange={event => setReasons({ ...reasons, [item.approval_assignment_id]: event.target.value })} placeholder={text('Decision reason (required)', '決定原因（必填）')} /><div><button onClick={() => decide(item,'approved')}>{item.workflow_type.includes('publication') ? text('Publish', '發布') : text('Approve', '批核')}</button><button onClick={() => decide(item,'changes_requested')}>{text('Return', '退回修改')}</button><button className="danger" onClick={() => decide(item,'rejected')}>{text('Reject', '拒絕')}</button></div></> : <small>{['assigned','in_review'].includes(item.status) ? text('The named assignee must decide.', '只限具名獲分派人作出決定。') : text('The immutable decision is retained.', '不可改寫的決定已保留。')}</small>}
          </div>
        </article>;
      })}
      {!filtered.length && <div className="approval-empty"><FileMagnifyingGlass size={32} /><h2>{text('No assignments match this view', '此檢視沒有符合條件的分派')}</h2><p>{text('Change the workflow, state or search filter.', '請更改工作流程、狀態或搜尋條件。')}</p></div>}
    </section>

    <h2 className="section-title">{text('Escalation queue', '升級處理佇列')}</h2>
    {escalations.length ? <div className="queue-grid">{escalations.map(item => <article key={item.approval_escalation_id}><ClockCountdown size={21} /><div><b>{codeLabel(item.trigger_reason)}</b><span>{codeLabel(item.target_type)} · {item.target_id}</span><small>{item.queue_key} · {text('owner', '負責人')} {isChinese ? item.owner_name_zh || item.owner_name || codeLabel('unassigned') : item.owner_name || codeLabel('unassigned')}</small></div><Status value={item.status} /></article>)}</div> : <Notice>{text('No escalation items are assigned to this account.', '此帳戶目前沒有獲分派的升級處理項目。')}</Notice>}
  </>;
}
