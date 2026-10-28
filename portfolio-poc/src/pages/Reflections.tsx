import { useEffect, useState } from 'react';
import { CheckCircle } from '@phosphor-icons/react';
import { api, type Activity } from '../api/client';
import { Empty, Notice, PageHeader, SourceTags } from '../components/Layout';

export function SelfReview({ report }: { report: (error: unknown) => void }) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [current, setCurrent] = useState<Activity | null>(null);
  const [answer, setAnswer] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => { api.activities().then(async items => {
    const published = items.filter(item => item.status === 'published');
    setActivities(published);
    if (published[0]) setCurrent(await api.activity(published[0].id));
  }).catch(report); }, []);

  async function choose(id: string) {
    try { setCurrent(await api.activity(id)); setAnswer(''); setSaved(false); } catch (error) { report(error); }
  }

  async function submit() {
    if (!current?.questions?.[0]) return;
    try { await api.response(current.id, current.questions[0].id, answer); setSaved(true); setAnswer(''); setCurrent(await api.activity(current.id)); } catch (error) { report(error); }
  }

  return <>
    <PageHeader eyebrow="SELF REVIEW" title="Reflect on my activities" description="Self review is separated from peer review so the author, perspective and source remain clear." />
    <div className="tab-strip">{activities.map(activity => <button className={current?.id === activity.id ? 'active' : ''} key={activity.id} onClick={() => choose(activity.id)}>{activity.title}</button>)}</div>
    {current ? <div className="two-columns reflection-layout">
      <section><span className="eyebrow">ACTIVITY CONTEXT</span><h2>{current.title}</h2><p>{current.description}</p><SourceTags tags={current.labels} />
        <h3 className="section-title">My accepted proof</h3>{current.proof?.length ? current.proof.map(proof => <div className="proof-row" key={proof.id}><span className="proof-kind">{proof.kind.replaceAll('_', ' ')}</span><p>{proof.content}</p></div>) : <Empty>No reflection submitted yet.</Empty>}
      </section>
      <section className="response-panel"><span className="eyebrow">MY RESPONSE</span><h2>{current.questions?.[0]?.prompt || 'No published student question'}</h2>
        <Notice tone="info">Your response becomes source-linked proof. It does not automatically award a framework step.</Notice>
        {current.questions?.[0]?.input_type === 'short_text' ? <input value={answer} onChange={event => setAnswer(event.target.value)} maxLength={300} /> : <textarea value={answer} onChange={event => setAnswer(event.target.value)} maxLength={4000} placeholder="Write what happened, what you contributed and what you learned..." />}
        <button className="primary" onClick={submit} disabled={!answer.trim()}><CheckCircle size={17} />Submit reflection</button>
        {saved && <p className="success-text">Reflection accepted into your Proof List.</p>}
      </section>
    </div> : <Empty>No published activity is available.</Empty>}
  </>;
}
