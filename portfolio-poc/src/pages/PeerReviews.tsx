import { useEffect, useMemo, useState } from 'react';
import { CheckCircle, ShieldCheck, XCircle } from '@phosphor-icons/react';
import { api, type PeerReview, type Session } from '../api/client';
import { Empty, Notice, PageHeader, StatusPill } from '../components/Layout';

export function PeerReviews({ session, report }: { session: Session; report: (error: unknown) => void }) {
  const [items, setItems] = useState<PeerReview[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const load = () => api.peerReviews().then(setItems).catch(report);
  useEffect(() => { void load(); }, []);

  const grouped = useMemo(() => Object.entries(items.reduce<Record<string, PeerReview[]>>((acc, item) => {
    (acc[item.activity_title] ||= []).push(item); return acc;
  }, {})), [items]);

  async function moderate(item: PeerReview, decision: string) {
    try { await api.moderatePeerReview(item.id, decision, notes[item.id] || 'Checked source assignment, relevance and respectful language.'); await load(); } catch (error) { report(error); }
  }

  async function submit(item: PeerReview) {
    try { await api.updatePeerReview(item.id, drafts[item.id] ?? item.raw_comment, ratings[item.id] ?? item.rating); await load(); } catch (error) { report(error); }
  }

  return <>
    <PageHeader eyebrow={session.role === 'staff' ? 'PEER MODERATION' : 'ASSIGNED PEER REVIEW'} title={session.role === 'staff' ? 'Review peer evidence' : 'My peer-review assignments'} description={session.role === 'staff' ? 'Staff approve or reject peer input before a sanitized statement can become proof.' : 'Peer review is a separate, assigned input with its own authorship and moderation state.'} />
    <Notice>{session.role === 'staff' ? `This fictional scenario contains ${items.length} reviews: ten reviewers across three activities. Raw comments remain in the review workspace; approved proof uses a concise sanitized statement.` : 'Only assigned reviews are shown. Your name is retained internally for traceability but is not displayed in the student-facing portfolio.'}</Notice>
    {session.role === 'staff' && <div className="metric-strip"><div><b>{items.length}</b><span>Total reviews</span></div><div><b>{items.filter(item => item.status === 'pending').length}</b><span>Awaiting moderation</span></div><div><b>{items.filter(item => item.status === 'approved').length}</b><span>Approved proof</span></div></div>}
    {grouped.length ? grouped.map(([activity, reviews]) => <section className="review-group" key={activity}>
      <div className="section-heading"><div><span>ACTIVITY</span><h2>{activity}</h2></div><small>{reviews.length} peer reviews</small></div>
      {reviews.map(item => <article className="peer-card" key={item.id}>
        <div className="peer-card-head"><div><b>{session.role === 'staff' ? item.reviewer_name : item.subject_name}</b><small>{session.role === 'staff' ? 'Assigned peer reviewer' : 'Review subject'}</small></div><StatusPill status={item.status} /></div>
        {session.role === 'student' && item.status === 'pending' ? <>
          <label>Your feedback<textarea value={drafts[item.id] ?? item.raw_comment} onChange={event => setDrafts({ ...drafts, [item.id]: event.target.value })} /></label>
          <label>Participation rating<select value={ratings[item.id] ?? item.rating} onChange={event => setRatings({ ...ratings, [item.id]: Number(event.target.value) })}>{[1, 2, 3, 4, 5].map(value => <option value={value} key={value}>{value} / 5</option>)}</select></label>
          <button className="primary" onClick={() => submit(item)}><CheckCircle size={17} />Submit for staff moderation</button>
        </> : <>
          <div className="raw-feedback"><small>RAW PEER INPUT</small><p>{item.raw_comment}</p></div>
          {item.sanitized_statement && <div className="sanitized-feedback"><ShieldCheck size={20} /><div><small>APPROVED PROOF STATEMENT</small><p>{item.sanitized_statement}</p></div></div>}
          {session.role === 'staff' && item.status === 'pending' && <div className="moderation-controls"><label>Moderation note<input value={notes[item.id] || ''} onChange={event => setNotes({ ...notes, [item.id]: event.target.value })} placeholder="Why is this safe and relevant?" /></label><div className="button-row"><button className="secondary" onClick={() => moderate(item, 'reject')}><XCircle size={17} />Reject</button><button className="primary" onClick={() => moderate(item, 'approve')}><CheckCircle size={17} />Approve and sanitize</button></div></div>}
        </>}
      </article>)}
    </section>) : <Empty>No peer reviews are assigned.</Empty>}
  </>;
}
