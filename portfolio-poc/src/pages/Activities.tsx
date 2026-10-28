import { useEffect, useState } from 'react';
import { ArrowLeft, CheckCircle, ClockCounterClockwise, Eye, PaperPlaneTilt, XCircle } from '@phosphor-icons/react';
import { api, type Activity, type Catalogue, type Session } from '../api/client';
import { Empty, Notice, PageHeader, SourceTags, StatusPill } from '../components/Layout';

export function Activities({ session, report }: { session: Session; report: (error: unknown) => void }) {
  const [items, setItems] = useState<Activity[]>([]);
  const [current, setCurrent] = useState<Activity | null>(null);
  const [axes, setAxes] = useState<Catalogue[]>([]);
  const [student, setStudent] = useState('');
  const [proof, setProof] = useState('');
  const [axis, setAxis] = useState('');
  const [level, setLevel] = useState(1);
  const [comment, setComment] = useState('');
  const [reason, setReason] = useState('Needs a clearer participant plan before publication.');

  const load = () => api.activities().then(setItems).catch(report);
  const open = (activityId: string) => api.activity(activityId).then(activity => {
    setCurrent(activity);
    setStudent(activity.participants?.[0]?.id || '');
    setProof(activity.proof?.[0]?.id || '');
  }).catch(report);

  useEffect(() => {
    load();
    if (session.role === 'teacher') api.catalogues().then(catalogues => {
      setAxes(catalogues);
      setAxis(catalogues.find(item => item.assessment_capable)?.axes[0]?.id || '');
    }).catch(report);
  }, []);

  async function transition(action: string) {
    if (!current) return;
    try { await api.transitionActivity(current.id, action, reason); await open(current.id); await load(); } catch (error) { report(error); }
  }

  async function saveObservation() {
    if (!current) return;
    try {
      await api.observe({ activityId: current.id, studentId: student, proofId: proof, axisId: axis, level, comment });
      setComment('');
      window.alert('Observation submitted for assigned staff review.');
    } catch (error) { report(error); }
  }

  if (!current) return <>
    <PageHeader eyebrow="ACTIVITY LIST" title="Activities and status" description="Find published activities and follow teacher submissions from draft to staff decision." />
    <div className="filter-strip"><span>All activities</span><span>{items.length} records</span><span>{items.filter(item => item.status === 'submitted').length} awaiting staff</span></div>
    <div className="data-list">
      {items.map(activity => <button className="activity-row" key={activity.id} onClick={() => open(activity.id)}>
        <span className="activity-index">{String(items.indexOf(activity) + 1).padStart(2, '0')}</span>
        <span className="activity-main"><b>{activity.title}</b><small>{activity.description}</small><SourceTags tags={activity.labels} /></span>
        <span className="activity-meta"><StatusPill status={activity.status} /><small>{activity.reporting_period?.name_en || activity.period_resolution_status || 'Period unresolved'}</small><small>{activity.event_count} log events</small></span>
        <Eye size={18} />
      </button>)}
    </div>
  </>;

  return <>
    <PageHeader eyebrow="ACTIVITY RECORD" title={current.title} description="Participation, proof and lifecycle history stay together while each review remains separately attributed." />
    <button className="text-button back" onClick={() => setCurrent(null)}><ArrowLeft size={16} />All activities</button>
    <div className="record-banner">
      <div><StatusPill status={current.status} /><p>{current.description}</p><small>{current.starts_at?.replace('T', ' ')} to {current.ends_at?.replace('T', ' ')} · {current.reporting_period?.name_en || current.period_resolution_status}</small><SourceTags tags={current.labels} /></div>
      <div className="button-row">
        {session.role === 'teacher' && ['draft', 'rejected'].includes(current.status) && <button className="primary" onClick={() => transition('submit')}><PaperPlaneTilt size={17} />Submit to staff</button>}
        {session.role === 'staff' && current.status === 'submitted' && <><button className="secondary" onClick={() => transition('reject')}><XCircle size={17} />Reject</button><button className="primary" onClick={() => transition('publish')}><CheckCircle size={17} />Publish</button></>}
      </div>
    </div>
    {!['resolved', 'exception_approved'].includes(current.period_resolution_status || '') && <Notice>Reporting period is {current.period_resolution_status}. Submission and publication remain blocked until the dates or SchoolAdmin period configuration are corrected.</Notice>}
    {session.role === 'staff' && current.status === 'submitted' && <label>Decision note<input value={reason} onChange={event => setReason(event.target.value)} /></label>}
    <div className="two-columns wide-left">
      <section>
        <div className="section-heading"><div><span>INPUT</span><h2>Participants and proof</h2></div><small>Source records remain attributable</small></div>
        {current.participants?.map(participant => <div className="item-row" key={participant.id}>
          <span>{participant.name}<small>{participant.attendance_approval === 'pending_approval' ? 'Absence awaiting staff approval' : 'Confirmed participant'}</small></span>
          {session.role === 'teacher' ? <select className="inline-select" value={participant.attendance} onChange={async event => {
            try { await api.attendance(current.id, participant.id, event.target.value); await open(current.id); } catch (error) { report(error); }
          }}>{['pending', 'attended', 'late', 'partial', 'absent'].map(value => <option key={value}>{value}</option>)}</select> : <StatusPill status={participant.attendance} />}
          {session.role === 'staff' && participant.attendance_approval === 'pending_approval' && <button className="text-button" onClick={async () => {
            try { await api.approveAttendance(current.id, participant.id); await open(current.id); } catch (error) { report(error); }
          }}>Approve exception</button>}
        </div>)}
        <h2 className="section-title">Evidence / Proof List</h2>
        {current.proof?.length ? current.proof.map(item => <div className="proof-row" key={item.id}>
          <span className="proof-kind">{item.kind.replaceAll('_', ' ')}</span><p>{item.content}</p><StatusPill status={item.status} />
        </div>) : <Empty>No proof yet.</Empty>}
      </section>
      <section>
        {session.role === 'teacher' ? <>
          <div className="section-heading"><div><span>PROCESS</span><h2>Rubric observation</h2></div></div>
          <Notice>POC-only conditions are used here. VASK labels describe activity intent; they do not award a step.</Notice>
          <label>Student<select value={student} onChange={event => { setStudent(event.target.value); setProof(''); }}>{current.participants?.map(participant => <option value={participant.id} key={participant.id}>{participant.name}</option>)}</select></label>
          <label>Accepted proof<select value={proof} onChange={event => setProof(event.target.value)}><option value="">Choose proof</option>{current.proof?.filter(item => item.student_id === student && item.status === 'accepted').map(item => <option value={item.id} key={item.id}>{item.content}</option>)}</select></label>
          <label>Skill<select value={axis} onChange={event => setAxis(event.target.value)}>{axes.flatMap(catalogue => catalogue.axes).map(item => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label>
          <div className="field-grid"><label>Observed step<input type="number" min="1" max="16" value={level} onChange={event => setLevel(Number(event.target.value))} /></label><div className="rubric-note">{axes.flatMap(catalogue => catalogue.axes).find(item => item.id === axis)?.levels.find(item => item.level === level)?.condition}</div></div>
          <label>Evidence-backed statement<textarea value={comment} onChange={event => setComment(event.target.value)} placeholder="The student showed X through Y..." /></label>
          <button className="primary" onClick={saveObservation}><CheckCircle size={17} />Submit observation</button>
        </> : <>
          <div className="section-heading"><div><span>PROCESS</span><h2>Lifecycle history</h2></div><ClockCounterClockwise size={20} /></div>
          {current.events?.map(event => <div className="timeline-row" key={event.id}><span></span><div><b>{event.action.replaceAll('_', ' ')}</b><p>{event.detail}</p><small>{event.actor_name} · {new Date(event.created_at).toLocaleString()}</small></div></div>)}
        </>}
      </section>
    </div>
  </>;
}
