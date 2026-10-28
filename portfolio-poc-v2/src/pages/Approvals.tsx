import { useEffect, useState } from 'react';
import { ClockCountdown } from '@phosphor-icons/react';
import { api } from '../api/client';
import type { Approval, Escalation } from '../../shared/types';
import { Field, Notice, PageHeader, Status } from '../components/Layout';
import { useI18n } from '../i18n';

export function Approvals({ report }: { report: (error: unknown) => void }) {
  const { isChinese, text, codeLabel, formatDateTime } = useI18n();
  const [assignments, setAssignments] = useState<Approval[]>([]), [escalations, setEscalations] = useState<Escalation[]>([]), [reasons, setReasons] = useState<Record<string,string>>({});
  async function load() { try { const data = await api.approvals(); setAssignments(data.assignments); setEscalations(data.escalations); } catch (error) { report(error); } }
  useEffect(() => { load(); }, []);
  async function decide(item: Approval, outcome: string) { try { await api.decide(item.approval_assignment_id, outcome, reasons[item.approval_assignment_id] || text('Reviewed against the configured policy and scope.', '已按設定的政策及適用範圍完成覆核。')); await load(); } catch (error) { report(error); } }
  return <>
    <PageHeader kicker={text('NAMED ASSIGNMENT · IMMUTABLE DECISION', '具名分派 · 不可改寫決定')} title={text('Approval queues', '批核佇列')} description={text('Eligibility does not assign work. Each decision records the capability and scope actually used.', '合資格不等於已獲分派；每項決定均會記錄實際使用的功能權限及適用範圍。')} />
    <div className="table-wrap"><table><thead><tr><th>{text('Workflow', '工作流程')}</th><th>{text('Target', '目標')}</th><th>{text('Named assignee', '具名獲分派人')}</th><th>{text('Status', '狀態')}</th><th>{text('Due', '期限')}</th><th>{text('Decision', '決定')}</th></tr></thead><tbody>{assignments.map(item => <tr key={item.approval_assignment_id}><td><b>{isChinese ? item.step_name_zh || item.step_name : item.step_name}</b><small>{codeLabel(item.workflow_type)} · {item.capability_key}</small></td><td><span className="mono">{item.target_version_id || item.target_id}</span></td><td>{(isChinese ? item.assignee_name_zh || item.assignee_name : item.assignee_name) || text('Unassigned', '未分派')}</td><td><Status value={item.status} /></td><td>{formatDateTime(item.due_at)}</td><td>{['assigned','in_review'].includes(item.status) ? <div className="decision-cell"><input value={reasons[item.approval_assignment_id] || ''} onChange={event => setReasons({ ...reasons, [item.approval_assignment_id]: event.target.value })} placeholder={text('Decision reason', '決定原因')} /><div><button onClick={() => decide(item,'approved')}>{text('Approve', '批核')}</button><button onClick={() => decide(item,'changes_requested')}>{text('Return', '退回修改')}</button><button className="danger" onClick={() => decide(item,'rejected')}>{text('Reject', '拒絕')}</button></div></div> : <span>{text('Decision retained', '決定已保留')}</span>}</td></tr>)}</tbody></table></div>
    <h2 className="section-title">{text('Escalation queue', '升級處理佇列')}</h2>
    {escalations.length ? <div className="queue-grid">{escalations.map(item => <article key={item.approval_escalation_id}><ClockCountdown size={21} /><div><b>{codeLabel(item.trigger_reason)}</b><span>{codeLabel(item.target_type)} · {item.target_id}</span><small>{item.queue_key} · {text('owner', '負責人')} {isChinese ? item.owner_name_zh || item.owner_name || codeLabel('unassigned') : item.owner_name || codeLabel('unassigned')}</small></div><Status value={item.status} /></article>)}</div> : <Notice>{text('No escalation items are assigned to this account.', '此帳戶目前沒有獲分派的升級處理項目。')}</Notice>}
  </>;
}
