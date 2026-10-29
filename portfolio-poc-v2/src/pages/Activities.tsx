import { useEffect, useMemo, useState } from 'react';
import { ArrowClockwise, ArrowRight, CalendarDots, CheckCircle, Database, LinkSimple, NotePencil, Plus, Stamp, UsersThree, Warning, XCircle } from '@phosphor-icons/react';
import { api } from '../api/client';
import type { Activity, ActivityReferenceData, ApprovalCandidate } from '../../shared/types';
import { Field, Notice, PageHeader, Status } from '../components/Layout';
import { useI18n } from '../i18n';

const emptyCreate = {
  titleEn: '', titleZh: '', descriptionEn: '', descriptionZh: '', activityType: 'project',
  subjectId: 'SUB-ENG', departmentId: 'DEPT-LANG', groupId: 'S1A-2026-27',
  startAt: '2027-02-15T09:00', endAt: '2027-02-15T10:00', location: '',
  mediaExpected: false, formVersionId: 'FV-CORE-001',
  participantIds: ['USR-S-001'], vaskItemIds: ['AX-VASK-COMMUNICATION'], riskFlags: ['none'],
};

const riskOptions = [
  ['none', 'No additional risk', '沒有額外風險'],
  ['off_site', 'Off-site activity', '校外活動'],
  ['external_participants', 'External participants', '校外參與者'],
  ['image_capture', 'Image capture', '拍攝相片'],
  ['audio_capture', 'Audio capture', '錄音'],
  ['video_capture', 'Video capture', '錄影'],
];

function toggle(values: string[], value: string) {
  if (value === 'none') return values.includes('none') ? [] : ['none'];
  const next = values.filter(item => item !== 'none');
  return next.includes(value) ? next.filter(item => item !== value) : [...next, value];
}

export function Activities({ report, focusActivityId, onSelectActivity, onOpenImports, onUnavailable }: { report: (error: unknown) => void; focusActivityId?: string; onSelectActivity: (activityId: string) => void; onOpenImports?: () => void; onUnavailable: () => void }) {
  const { isChinese, text, codeLabel, formatDateTime } = useI18n();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [selected, setSelected] = useState<Activity | null>(null);
  const [reference, setReference] = useState<ActivityReferenceData | null>(null);
  const [candidates, setCandidates] = useState<ApprovalCandidate[]>([]);
  const [canCreate, setCanCreate] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [create, setCreate] = useState(emptyCreate);
  const [reason, setReason] = useState('');
  const [proposal, setProposal] = useState('');
  const [reviewerId, setReviewerId] = useState('USR-ST-001');
  const [publisherId, setPublisherId] = useState('USR-ST-001');
  const [resolutionReasons, setResolutionReasons] = useState<Record<string,string>>({});

  async function load(selectId?: string) {
    try {
      const data = await api.activities();
      setActivities(data.items);
      setCanCreate(data.access.canCreate);
      const requestedId = selectId || focusActivityId || selected?.activity_id;
      const requested = requestedId ? data.items.find(item => item.activity_id === requestedId) || null : null;
      setSelected(requested);
      if (focusActivityId && requestedId === focusActivityId && !requested) onUnavailable();
    } catch (error) { report(error); }
  }

  useEffect(() => {
    void load();
    api.activityReferenceData().then(data => {
      setReference(data);
      setCreate(current => ({
        ...current,
        formVersionId: data.forms.find(item => item.is_system_default)?.form_version_id || data.forms[0]?.form_version_id || current.formVersionId,
        participantIds: data.students[0] ? [data.students[0].user_id] : [],
        vaskItemIds: data.vaskItems[0] ? [data.vaskItems[0].axis_id] : [],
      }));
    }).catch(() => undefined);
    api.activityApprovalCandidates().then(data => {
      setCandidates(data);
      setReviewerId(data.find(item => item.canApprove)?.id || '');
      setPublisherId(data.find(item => item.canPublish)?.id || '');
    }).catch(() => undefined);
  }, []);

  useEffect(() => { if (focusActivityId) void load(focusActivityId); }, [focusActivityId]);

  const resolvedPeriod = useMemo(() => reference?.periods.find(item => item.start_date <= create.startAt.slice(0, 10) && item.end_date >= create.endAt.slice(0, 10)), [reference, create.startAt, create.endAt]);

  async function createActivity(event: React.FormEvent) {
    event.preventDefault();
    try {
      const item = await api.createActivity(create);
      setShowCreate(false);
      setCreate(emptyCreate);
      onSelectActivity(item.activity_id);
      await load(item.activity_id);
    } catch (error) { report(error); }
  }
  async function revise() {
    if (!selected) return;
    try {
      await api.reviseActivity(selected.activity_id, isChinese ? { descriptionZh: proposal || selected.latestRevision.description_zh, reason } : { descriptionEn: proposal || selected.latestRevision.description_en, reason });
      setReason(''); setProposal(''); await load(selected.activity_id);
    } catch (error) { report(error); }
  }
  async function requestChange() {
    if (!selected) return;
    try {
      await api.requestActivityChange(selected.activity_id, { fieldKey: isChinese ? 'description_zh' : 'description_en', proposedValue: proposal, reason });
      setReason(''); setProposal(''); await load(selected.activity_id);
    } catch (error) { report(error); }
  }
  async function submit() {
    if (!selected) return;
    try { await api.submitActivity(selected.activity_id, reviewerId, publisherId); await load(selected.activity_id); }
    catch (error) { report(error); }
  }
  async function withdraw() {
    if (!selected) return;
    try { await api.withdrawActivity(selected.activity_id, reason); setReason(''); await load(selected.activity_id); }
    catch (error) { report(error); }
  }
  async function resolveRequest(requestId: string, outcome: 'accepted' | 'rejected') {
    if (!selected) return;
    try {
      await api.resolveActivityChange(selected.activity_id, requestId, { outcome, reason: resolutionReasons[requestId] || text('Reviewed against the current activity record.', '已按現行活動紀錄完成覆核。') });
      await load(selected.activity_id);
    } catch (error) { report(error); }
  }

  const participantCount = selected?.people.filter(item => item.relationship_type === 'participant').length || 0;
  const workflowIndex = selected ? (selected.latestRevision.publication_status === 'published' ? 4 : selected.latestRevision.approval_status === 'approved' ? 3 : selected.latestRevision.approval_status === 'pending_review' ? 2 : 1) : 0;

  return <>
    <PageHeader kicker={text('INPUT · ACTIVITY PACKAGE · TRACEABLE HAND-OFF', '輸入 · 活動資料套件 · 可追溯交接')} title={text('Activities and status', '活動及狀態')} description={text('Create the complete package, see who made it, and follow the named reviewer and publisher without losing the stable activity record.', '建立完整活動資料套件，查看建立者，並追蹤具名覆核人及發布人，同時保留穩定的活動紀錄。')} action={canCreate ? <button className="primary" onClick={() => setShowCreate(value => !value)}><Plus size={17} />{text('New activity', '新增活動')}</button> : undefined} />

    {showCreate && <form className="activity-editor" onSubmit={createActivity}>
      <div className="editor-heading"><div><p className="eyebrow">{text('REVISION 1 · SERVER-RESOLVED PERIOD', '修訂 1 · 由伺服器判定學段')}</p><h2>{text('Build the activity package', '建立活動資料套件')}</h2></div><button type="button" className="text-action" onClick={() => setShowCreate(false)}>{text('Cancel', '取消')}</button></div>
      <div className="activity-editor-grid">
        <section>
          <h3>01 · {text('Activity context', '活動資料')}</h3>
          <div className="form-grid two">
            <Field label={text('English title', '英文標題')}><input required value={create.titleEn} onChange={event => setCreate({ ...create, titleEn: event.target.value })} /></Field>
            <Field label={text('Chinese title', '中文標題')}><input value={create.titleZh} onChange={event => setCreate({ ...create, titleZh: event.target.value })} /></Field>
          </div>
          <Field label={text('English description', '英文說明')}><textarea required value={create.descriptionEn} onChange={event => setCreate({ ...create, descriptionEn: event.target.value })} /></Field>
          <div className="form-grid three">
            <Field label={text('Group / programme', '班別／計劃')}><select value={create.groupId} onChange={event => setCreate({ ...create, groupId: event.target.value })}>{reference?.groups.map(item => <option value={item.group_id} key={item.group_id}>{isChinese ? item.name_zh : item.name_en}</option>)}</select></Field>
            <Field label={text('Subject', '科目')}><select value={create.subjectId} onChange={event => setCreate({ ...create, subjectId: event.target.value })}>{reference?.subjects.map(item => <option value={item.subject_id} key={item.subject_id}>{isChinese ? item.name_zh : item.name_en}</option>)}</select></Field>
            <Field label={text('Department', '部門')}><select value={create.departmentId} onChange={event => setCreate({ ...create, departmentId: event.target.value })}>{reference?.departments.map(item => <option value={item.department_id} key={item.department_id}>{isChinese ? item.name_zh : item.name_en}</option>)}</select></Field>
          </div>
          <div className="form-grid three">
            <Field label={text('Start', '開始時間')}><input required type="datetime-local" value={create.startAt} onChange={event => setCreate({ ...create, startAt: event.target.value })} /></Field>
            <Field label={text('End', '結束時間')}><input required type="datetime-local" value={create.endAt} onChange={event => setCreate({ ...create, endAt: event.target.value })} /></Field>
            <Field label={text('Location', '地點')}><input value={create.location} onChange={event => setCreate({ ...create, location: event.target.value })} /></Field>
          </div>
          <div className={resolvedPeriod ? 'period-resolution valid' : 'period-resolution invalid'}><CalendarDots size={19} /><span><b>{resolvedPeriod ? (isChinese ? resolvedPeriod.name_zh : resolvedPeriod.name_en) : text('No single reporting period', '未能對應單一學段')}</b><small>{resolvedPeriod ? `${resolvedPeriod.start_date} → ${resolvedPeriod.end_date} · ${resolvedPeriod.period_id}` : text('Cross-period activities are blocked by the server.', '跨學段活動會被伺服器封鎖。')}</small></span></div>
        </section>
        <section>
          <h3>02 · {text('Participants, VASK and form', '參與者、VASK 及表格')}</h3>
          <Field label={text('Exact published form version', '指定已發布表格版本')}><select required value={create.formVersionId} onChange={event => setCreate({ ...create, formVersionId: event.target.value })}>{reference?.forms.map(item => <option value={item.form_version_id} key={item.form_version_id}>{isChinese ? item.name_zh : item.name_en} · v{item.version_number}</option>)}</select></Field>
          <p className="field-caption">{text('Participants', '參與學生')}</p>
          <div className="choice-grid">{reference?.students.map(item => <label className={create.participantIds.includes(item.user_id) ? 'choice selected' : 'choice'} key={item.user_id}><input type="checkbox" checked={create.participantIds.includes(item.user_id)} onChange={() => setCreate({ ...create, participantIds: toggle(create.participantIds, item.user_id) })} /><span><b>{isChinese ? item.name_zh : item.name_en}</b><small>{item.student_number}</small></span></label>)}</div>
          <p className="field-caption">{text('VASK intentions (context, not a score)', 'VASK 意向（只屬情境，不是評分）')}</p>
          <div className="choice-grid">{reference?.vaskItems.map(item => <label className={create.vaskItemIds.includes(item.axis_id) ? 'choice selected' : 'choice'} key={item.axis_id}><input type="checkbox" checked={create.vaskItemIds.includes(item.axis_id)} onChange={() => setCreate({ ...create, vaskItemIds: toggle(create.vaskItemIds, item.axis_id) })} /><span><b>{isChinese ? item.name_zh : item.name_en}</b><small>{item.axis_code}</small></span></label>)}</div>
          <p className="field-caption">{text('Risk and collection flags', '風險及收集標記')}</p>
          <div className="choice-grid">{riskOptions.map(item => <label className={create.riskFlags.includes(item[0]) ? 'choice selected' : 'choice'} key={item[0]}><input type="checkbox" checked={create.riskFlags.includes(item[0])} onChange={() => setCreate({ ...create, riskFlags: toggle(create.riskFlags, item[0]) })} /><span><b>{text(item[1], item[2])}</b></span></label>)}</div>
        </section>
      </div>
      <div className="form-actions"><span>{text('Draft creation is audited. Approval and publication remain separate actions.', '建立草稿會保留稽核紀錄；批核及發布仍屬不同操作。')}</span><button className="primary" disabled={!resolvedPeriod || !create.participantIds.length || !create.vaskItemIds.length || !create.riskFlags.length}>{text('Create activity package', '建立活動資料套件')}<ArrowRight size={16} /></button></div>
    </form>}

    <div className="activity-summary-strip">
      <span><b>{activities.length}</b>{text('visible activities', '項可見活動')}</span>
      <span><b>{activities.filter(item => item.latestRevision.approval_status === 'pending_review').length}</b>{text('awaiting review', '項等待覆核')}</span>
      <span><b>{activities.filter(item => item.currentApprovedRevision?.publication_status === 'published').length}</b>{text('published records', '項已發布紀錄')}</span>
    </div>

    <div className="activity-workspace">
      <section className="activity-list-panel">
        {activities.map((item, index) => <button className={selected?.activity_id === item.activity_id ? 'activity-row-v1 selected' : 'activity-row-v1'} key={item.activity_id} onClick={() => { setSelected(item); onSelectActivity(item.activity_id); }}>
          <span className="activity-index">{String(index + 1).padStart(2, '0')}</span>
          <span className="activity-row-main"><b>{isChinese ? item.latestRevision.title_zh || item.latestRevision.title_en : item.latestRevision.title_en}</b><small>{item.created_by_name ? `${text('Created by', '建立者')} ${isChinese ? item.created_by_name_zh : item.created_by_name}` : item.activity_id}</small><span className="row-tags"><em>{item.resolved_period_id}</em><em>{text('rev.', '修訂')} {item.latestRevision.revision_number}</em></span></span>
          <span className="activity-row-state"><Status value={item.latestRevision.approval_status} /><Status value={item.latestRevision.publication_status} /></span>
          <ArrowRight size={16} />
        </button>)}
        {!activities.length && <Notice>{text('No activity is visible for this account.', '此帳戶目前沒有可見活動。')}</Notice>}
      </section>

      <section className="activity-detail-panel">{selected ? <>
        <div className="record-banner">
          <div><p className="mono">{selected.activity_id}</p><h2>{isChinese ? selected.latestRevision.title_zh || selected.latestRevision.title_en : selected.latestRevision.title_en}</h2><span>{isChinese ? selected.latestRevision.description_zh || selected.latestRevision.description_en : selected.latestRevision.description_en}</span></div>
          <div className="record-status"><Status value={selected.operational_status} /><small>{selected.resolved_period_id}</small>{selected.access.canEdit && selected.latestRevision.publication_status !== 'published' && onOpenImports && <button className="copy-link" onClick={onOpenImports}><Database size={15} />{text('Import roster', '匯入名冊')}</button>}<button className="copy-link" onClick={() => void navigator.clipboard.writeText(`${window.location.origin}/activities/${encodeURIComponent(selected.activity_id)}`)}><LinkSimple size={15} />{text('Copy activity link', '複製活動連結')}</button></div>
        </div>

        <div className="activity-flow">
          {[
            [text('Package', '資料套件'), text('Owner prepares', '由負責人建立')],
            [text('Approval', '批核'), text('Named reviewer', '具名覆核人')],
            [text('Publication', '發布'), text('Named publisher', '具名發布人')],
            [text('Student view', '學生檢視'), text('Official record', '正式紀錄')],
          ].map((step, index) => <div className={workflowIndex > index ? 'done' : workflowIndex === index + 1 ? 'active' : ''} key={step[0]}><span>{workflowIndex > index ? <CheckCircle size={18} weight="fill" /> : index + 1}</span><b>{step[0]}</b><small>{step[1]}</small></div>)}
        </div>

        <div className="record-facts">
          <div><span>{text('Made by / owner', '建立者／負責人')}</span><b>{isChinese ? selected.latestRevision.owner_name_zh || selected.latestRevision.owner_name : selected.latestRevision.owner_name}</b></div>
          <div><span>{text('Activity dates', '活動日期')}</span><b>{formatDateTime(selected.latestRevision.start_at)} → {formatDateTime(selected.latestRevision.end_at)}</b></div>
          <div><span>{text('Participants', '參與學生')}</span><b>{participantCount}</b></div>
          <div><span>{text('Exact form', '指定表格')}</span><b>{selected.latestRevision.requested_form_version_id || text('Not assigned', '未分派')}</b></div>
        </div>

        <div className="package-columns">
          <section><h3>{text('VASK intentions', 'VASK 意向')}</h3><div className="tag-row">{selected.vaskItems.map(item => <span className="tag" key={item.vask_item_id}>{isChinese ? item.name_zh : item.name_en}<em>{codeLabel(item.approval_state)}</em></span>)}</div>{!selected.vaskItems.length && <small>{text('No VASK intention is visible.', '未有可見 VASK 意向。')}</small>}</section>
          <section><h3>{text('Risk / collection', '風險／收集')}</h3><div className="tag-row">{selected.riskFlags.map(item => <span className="tag role" key={item}>{codeLabel(item)}</span>)}</div>{!selected.riskFlags.length && <small>{text('Restricted from the student view.', '學生檢視不會顯示內部風險資料。')}</small>}</section>
          <section><h3>{text('People relationship', '人員關係')}</h3><div className="tag-row">{selected.people.filter(item => item.relationship_type !== 'participant').map(item => <span className="tag" key={item.user_id}>{isChinese ? item.name_zh : item.name_en}<em>{codeLabel(item.relationship_type)}</em></span>)}</div>{selected.people.filter(item => item.relationship_type === 'participant').map(item => <span className="tag role" key={item.user_id}>{isChinese ? item.name_zh : item.name_en}<em>{codeLabel(item.planned_attendance_status)}</em></span>)}</section>
        </div>

        <div className="revision-compare">
          <article><p>{text('Current approved / official fallback', '現行已批核／正式後備版本')}</p>{selected.currentApprovedRevision ? <><b>{text('Revision', '修訂')} {selected.currentApprovedRevision.revision_number}</b><span>{isChinese ? selected.currentApprovedRevision.description_zh || selected.currentApprovedRevision.description_en : selected.currentApprovedRevision.description_en}</span><div><Status value={selected.currentApprovedRevision.approval_status} /> <Status value={selected.currentApprovedRevision.publication_status} /></div></> : <Notice tone="warning">{text('No approved revision yet.', '尚未有已批核修訂。')}</Notice>}</article>
          <article><p>{text('Latest working revision', '最新工作修訂')}</p><b>{text('Revision', '修訂')} {selected.latestRevision.revision_number}</b><span>{isChinese ? selected.latestRevision.description_zh || selected.latestRevision.description_en : selected.latestRevision.description_en}</span><div><Status value={selected.latestRevision.approval_status} /> <Status value={selected.latestRevision.publication_status} /></div></article>
        </div>

        {(selected.access.canEdit || selected.access.canRequestChange) && selected.latestRevision.approval_status !== 'pending_review' && <section className="action-panel">
          <div><p className="eyebrow">{selected.access.canEdit ? text('MATERIAL SUCCESSOR', '實質後續修訂') : text('CONTROLLED CHANGE REQUEST', '受控修改要求')}</p><h3>{selected.access.canEdit ? text('Create an immutable successor', '建立不可改寫的後續修訂') : text('Ask the owner to correct this record', '要求負責人修正紀錄')}</h3></div>
          <div className="action-grid"><Field label={text('Proposed description', '建議說明')}><textarea value={proposal} onChange={event => setProposal(event.target.value)} /></Field><Field label={text('Reason', '原因')}><input value={reason} onChange={event => setReason(event.target.value)} /></Field><button disabled={!proposal || !reason} onClick={selected.access.canEdit ? revise : requestChange}>{selected.access.canEdit ? <><ArrowClockwise size={16} />{text('Create successor', '建立後續修訂')}</> : <><NotePencil size={16} />{text('Send request', '送出要求')}</>}</button></div>
        </section>}

        {selected.access.canWithdraw && <section className="withdraw-strip"><Warning size={22} /><div><b>{text('Pending revisions are locked', '待批修訂已鎖定')}</b><span>{text('Withdraw the named assignment before creating a corrected successor.', '建立修正後續版本前，須先撤回具名批核分派。')}</span></div><input value={reason} onChange={event => setReason(event.target.value)} placeholder={text('Withdrawal reason', '撤回原因')} /><button disabled={!reason} onClick={withdraw}>{text('Withdraw revision', '撤回修訂')}</button></section>}

        {selected.changeRequests.length > 0 && <section className="request-list"><div className="section-heading"><div><p className="eyebrow">{text('OWNER ACTION', '負責人操作')}</p><h3>{text('Change requests', '修改要求')}</h3></div></div>{selected.changeRequests.map(item => <article key={item.activity_change_request_id}><div><b>{isChinese ? item.requester_name_zh || item.requester_name : item.requester_name}</b><span>{codeLabel(item.field_key)} · {item.proposed_value}</span><small>{item.reason}</small></div><Status value={item.status} />{item.status === 'open' && selected.access.canResolveChangeRequest && <div className="request-actions"><input value={resolutionReasons[item.activity_change_request_id] || ''} onChange={event => setResolutionReasons({ ...resolutionReasons, [item.activity_change_request_id]: event.target.value })} placeholder={text('Resolution reason', '處理原因')} /><button onClick={() => resolveRequest(item.activity_change_request_id, 'accepted')}><CheckCircle size={16} />{text('Accept into successor', '接納並建立後續修訂')}</button><button className="danger" onClick={() => resolveRequest(item.activity_change_request_id, 'rejected')}><XCircle size={16} />{text('Reject', '拒絕')}</button></div>}{item.resolution_note && <small>{item.resolution_note}</small>}</article>)}</section>}

        {selected.access.canSubmit && selected.latestRevision.approval_status === 'draft' && <section className="submit-strip activity-submit">
          <div><p className="eyebrow">{text('NAMED HAND-OFF', '具名交接')}</p><h3>{text('Send revision for approval, then publication', '提交修訂作批核，其後再發布')}</h3><small>{text('The two decisions remain separate and auditable even when the same eligible person is selected.', '即使選擇同一名合資格人員，兩項決定仍會分開並保留稽核紀錄。')}</small></div>
          <Field label={text('Named reviewer', '具名覆核人')}><select value={reviewerId} onChange={event => setReviewerId(event.target.value)}>{candidates.filter(item => item.canApprove).map(item => <option key={item.id} value={item.id}>{isChinese ? item.nameZh : item.name}</option>)}</select></Field>
          <Field label={text('Named publisher', '具名發布人')}><select value={publisherId} onChange={event => setPublisherId(event.target.value)}>{candidates.filter(item => item.canPublish).map(item => <option key={item.id} value={item.id}>{isChinese ? item.nameZh : item.name}</option>)}</select></Field>
          <button className="primary" disabled={!reviewerId || !publisherId} onClick={submit}><Stamp size={17} />{text('Submit revision', '提交修訂')}</button>
        </section>}

        {selected.approvalHistory.length > 0 && <section className="approval-timeline"><div className="section-heading"><div><p className="eyebrow">{text('WHO CAN FIND AND ACT', '誰可找到並處理')}</p><h3>{text('Approval and publication history', '批核及發布紀錄')}</h3></div></div>{selected.approvalHistory.map(item => <div className="timeline-row" key={item.approval_assignment_id}><span /><div><div className="timeline-head"><b>{isChinese ? item.step_name_zh || item.step_name : item.step_name}</b><Status value={item.status} /></div><p>{text('Assigned to', '獲分派予')} {isChinese ? item.assignee_name_zh || item.assignee_name : item.assignee_name} · {item.target_version_id}</p>{item.decision_reason && <blockquote>{item.decision_reason}</blockquote>}<small>{item.decided_at ? formatDateTime(item.decided_at) : `${text('Due', '期限')} ${formatDateTime(item.due_at)}`}</small></div></div>)}</section>}
      </> : <div className="activity-empty"><UsersThree size={34} /><h2>{text('Select an activity record', '選擇活動紀錄')}</h2><p>{text('Inspect its creator, package, named assignments, decisions and official fallback revision.', '查看建立者、資料套件、具名分派、決定及正式後備修訂。')}</p></div>}</section>
    </div>
  </>;
}
