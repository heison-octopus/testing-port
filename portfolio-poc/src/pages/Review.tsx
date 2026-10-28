import { useEffect, useState } from 'react';
import { CheckCircle, Eye, ShieldCheck, XCircle } from '@phosphor-icons/react';
import { api, type Observation, type Session, type Student, type SummaryBundle } from '../api/client';
import { Empty, Notice, PageHeader, SourceTags, StatusPill } from '../components/Layout';

export function Review({ session, report }: { session: Session; report: (error: unknown) => void }) {
  const [students, setStudents] = useState<Student[]>([]);
  const [student, setStudent] = useState('');
  const [items, setItems] = useState<Observation[]>([]);
  const [summary, setSummary] = useState<SummaryBundle | null>(null);
  const [summaryText, setSummaryText] = useState('');
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => { api.students().then(data => { setStudents(data); setStudent(data[0]?.id || ''); }).catch(report); }, []);
  const load = async () => {
    if (!student) return;
    try {
      const [reviewItems, summaryData] = await Promise.all([api.review(student), api.summary(student)]);
      setItems(reviewItems); setSummary(summaryData); setSummaryText(summaryData.summary?.draft_text || '');
    } catch (error) { report(error); }
  };
  useEffect(() => { load(); }, [student]);

  async function decide(item: Observation, value: string) {
    try { await api.decision(item.id, value, reasons[item.id] || 'Reviewed against the activity context, proof and POC rubric condition.'); await load(); } catch (error) { report(error); }
  }
  async function saveSummary(action: string) {
    try { await api.saveSummary(student, summaryText, action); await load(); } catch (error) { report(error); }
  }
  async function publish() {
    try { await api.publish(student); window.alert('A frozen portfolio snapshot has been published.'); } catch (error) { report(error); }
  }

  return <>
    <PageHeader eyebrow="HUMAN-IN-THE-LOOP" title={session.role === 'teacher' ? 'Class teacher summary review' : 'Evidence inclusion and publication'} description={session.role === 'teacher' ? 'Read the proof behind each statement, then approve or revise the learner summary.' : 'Approve evidence decisions after peer moderation, then publish only an approved class-teacher summary.'} />
    <Notice>POC policy: assigned staff moderate peer input and decide observation inclusion. The responsible class teacher approves or modifies the learner summary. Final school authority remains an open decision.</Notice>
    <label className="student-picker">Student<select value={student} onChange={event => setStudent(event.target.value)}>{students.map(item => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label>

    {session.role === 'teacher' ? <div className="review-workbench">
      <section className="source-column">
        <div className="section-heading"><div><span>SOURCE CONTEXT</span><h2>Proof contributing to the summary</h2></div><small>{items.length} rubric observations · {summary?.sources.peerReviews.length || 0} approved peer records</small></div>
        {items.map(item => <article className="source-card" key={item.id}>
          <button onClick={() => setExpanded(expanded === item.id ? null : item.id)}><div><b>{item.axis_name} · Step {item.level}</b><small>{item.activity_title}</small></div><Eye size={18} /></button>
          <p>{item.comment}</p>
          {expanded === item.id && <div className="source-detail"><small>SELECTED PROOF</small><p>{item.proof_content}</p><div><StatusPill status={item.proof_status} /><span>{item.proof_kind.replaceAll('_', ' ')}</span><span>Decision: {item.decision}</span></div></div>}
        </article>)}
        <details className="peer-evidence"><summary>Approved peer evidence ({summary?.sources.peerReviews.length || 0})</summary>{summary?.sources.peerReviews.slice(0, 10).map(item => <div key={item.id}><b>{item.activity_title}</b><p>{item.sanitized_statement}</p><small>Raw input retained in staff-only moderation history.</small></div>)}</details>
      </section>
      <section className="summary-editor">
        <div className="section-heading"><div><span>PORTFOLIO SUMMARY</span><h2>Sanitized learner statement</h2></div>{summary?.summary && <StatusPill status={summary.summary.status} />}</div>
        <Notice tone="ai">The long source context stays here for review. The portfolio receives only the approved summary, rubric outcomes and human-readable source tags.</Notice>
        <label>Class teacher wording<textarea className="summary-textarea" value={summaryText} onChange={event => setSummaryText(event.target.value)} /></label>
        <SourceTags tags={summary?.sources.sourceTags || []} />
        <div className="button-row"><button className="secondary" onClick={() => saveSummary('save')}>Save draft</button><button className="primary" onClick={() => saveSummary('approve')}><ShieldCheck size={17} />Approve summary</button></div>
      </section>
    </div> : <>
      <div className="section-heading"><div><span>RUBRIC OBSERVATIONS</span><h2>Include or exclude with reason</h2></div><small>{items.filter(item => item.decision === 'pending').length} pending</small></div>
      {items.length ? items.map(item => <article className="observation-row" key={item.id}>
        <div><div className="peer-card-head"><b>{item.axis_name} · Step {item.level}</b><StatusPill status={item.decision} /></div><p>{item.comment}</p><small>{item.activity_title} · {item.proof_kind.replaceAll('_', ' ')}</small><details><summary>View proof and audit IDs</summary><p>{item.proof_content}</p><small>Observation {item.id} · Proof {item.proof_id}</small></details></div>
        <div><label>Decision reason<input value={reasons[item.id] || ''} onChange={event => setReasons({ ...reasons, [item.id]: event.target.value })} /></label><div className="button-row"><button className="secondary" onClick={() => decide(item, 'excluded')}><XCircle size={17} />Exclude</button><button className="primary" onClick={() => decide(item, 'included')}><CheckCircle size={17} />Include</button></div></div>
      </article>) : <Empty>No observations in this assigned review queue.</Empty>}
      <div className="publication-panel"><div><span className="eyebrow">OUTPUT GATE</span><h2>Publish frozen portfolio</h2><p>The class teacher summary is <b>{summary?.summary?.status || 'missing'}</b>. MAX-CONFIRMED selects the highest included human-confirmed observation for each axis.</p></div><button className="primary" onClick={publish} disabled={summary?.summary?.status !== 'approved'}>Publish portfolio snapshot</button></div>
    </>}
  </>;
}
