import { useEffect, useState } from 'react';
import { CheckCircle } from '@phosphor-icons/react';
import { api, type Activity } from '../api/client';
import { Empty, Notice, PageHeader, SourceTags } from '../components/Layout';

export function SelfReview({ report }: { report: (error: unknown) => void }) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [current, setCurrent] = useState<Activity | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);

  useEffect(() => { api.activities().then(async items => {
    const published = items.filter(item => item.status === 'published');
    setActivities(published);
    if (published[0]) setCurrent(await api.activity(published[0].id));
  }).catch(report); }, []);

  async function choose(id: string) {
    try { setCurrent(await api.activity(id)); setAnswers({}); setSaved(false); } catch (error) { report(error); }
  }

  async function submit() {
    const completed = current?.questions?.filter(question => answers[question.id]?.trim()) || [];
    if (!current || !completed.length) return;
    try { for (const question of completed) await api.response(current.id, question.id, answers[question.id]); setSaved(true); setAnswers({}); setCurrent(await api.activity(current.id)); } catch (error) { report(error); }
  }

  return <>
    <PageHeader eyebrow="SELF REVIEW" title="Reflect on my activities" description="Self review is separated from peer review so the author, perspective and source remain clear." />
    <div className="tab-strip">{activities.map(activity => <button className={current?.id === activity.id ? 'active' : ''} key={activity.id} onClick={() => choose(activity.id)}>{activity.title}</button>)}</div>
    {current ? <div className="two-columns reflection-layout">
      <section><span className="eyebrow">ACTIVITY CONTEXT</span><h2>{current.title}</h2><p>{current.description}</p><SourceTags tags={current.labels} />
        <h3 className="section-title">My accepted proof</h3>{current.proof?.length ? current.proof.map(proof => <div className="proof-row" key={proof.id}><span className="proof-kind">{proof.kind.replaceAll('_', ' ')}</span><p>{proof.content}</p></div>) : <Empty>No reflection submitted yet.</Empty>}
      </section>
      <section className="response-panel"><span className="eyebrow">MY RESPONSE</span><h2>{current.questions?.length ? `${current.questions.length} reflection question${current.questions.length === 1 ? '' : 's'}` : 'No published student question'}</h2>
        <Notice tone="info">Your response becomes source-linked proof. It does not automatically award a framework step.</Notice>
        {current.questions?.map((question, index) => <div className="response-question" key={question.id}><small>QUESTION {index + 1} · {question.ability_name || 'STUDENT REFLECTION'}</small><h3>{question.prompt}</h3>{question.input_type === 'scale' ? <div className="scale-options">{question.configuration?.scale?.map((option, optionIndex) => <label className={answers[question.id] === String(optionIndex + 1) ? 'selected' : ''} key={option}><input type="radio" name={question.id} value={optionIndex + 1} checked={answers[question.id] === String(optionIndex + 1)} onChange={event => setAnswers(items => ({ ...items, [question.id]: event.target.value }))} /><span><b>{optionIndex + 1}</b>{option}</span></label>)}</div> : question.input_type === 'short_text' ? <input value={answers[question.id] || ''} onChange={event => setAnswers(items => ({ ...items, [question.id]: event.target.value }))} maxLength={300} /> : <textarea value={answers[question.id] || ''} onChange={event => setAnswers(items => ({ ...items, [question.id]: event.target.value }))} maxLength={4000} placeholder="Write what happened, what you contributed and what you learned..." />}{question.source && <small className="question-source">Source: {question.source}</small>}</div>)}
        <button className="primary" onClick={submit} disabled={!Object.values(answers).some(answer => answer.trim())}><CheckCircle size={17} />Submit completed responses</button>
        {saved && <p className="success-text">Reflection accepted into your Proof List.</p>}
      </section>
    </div> : <Empty>No published activity is available.</Empty>}
  </>;
}
