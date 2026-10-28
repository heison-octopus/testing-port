import { useState } from 'react';
import { CheckCircle, PaperPlaneTilt } from '@phosphor-icons/react';
import { api, type Session } from '../api/client';
import { Notice, PageHeader } from '../components/Layout';

export function ActivityEditor({ session, report }: { session: Session; report: (error: unknown) => void }) {
  const [title, setTitle] = useState('Student-led service project');
  const [description, setDescription] = useState('Students identify a school-community need, plan a response and document what they learned.');
  const [labels, setLabels] = useState('Planning, Teamwork, Responsibility');
  const [question, setQuestion] = useState('What did you contribute, what changed, and what would you do differently?');
  const [result, setResult] = useState<{ id: string; status: string } | null>(null);

  async function create() {
    try {
      const created = await api.createActivity({ title, description, labels: labels.split(',').map(value => value.trim()).filter(Boolean), question });
      setResult(created);
    } catch (error) { report(error); }
  }

  return <>
    <PageHeader eyebrow="ACTIVITY CREATOR" title="Create or update an activity" description="One compact editor for activity intent, reflection input and the approval path." />
    <div className="workflow-steps">
      <div className="active"><b>01</b><span>Activity details</span></div><div><b>02</b><span>Teacher submits</span></div><div><b>03</b><span>Staff decision</span></div><div><b>04</b><span>Published</span></div>
    </div>
    <Notice tone="info">{session.role === 'staff' ? 'Authorized staff creation publishes directly in this POC.' : 'Teacher creation starts as a draft. Submit, reject and publish actions are recorded in the shared lifecycle log.'}</Notice>
    <div className="editor-grid">
      <section>
        <label>Activity title<input value={title} onChange={event => setTitle(event.target.value)} maxLength={160} /></label>
        <label>Description and context<textarea value={description} onChange={event => setDescription(event.target.value)} maxLength={4000} /></label>
        <label>VASK / activity-intent labels<input value={labels} onChange={event => setLabels(event.target.value)} /><small>Comma-separated descriptive labels. They do not award Skills Builder levels.</small></label>
        <label>Student reflection question<textarea value={question} onChange={event => setQuestion(event.target.value)} maxLength={1000} /></label>
        <button className="primary" onClick={create}>{session.role === 'staff' ? <CheckCircle size={17} /> : <PaperPlaneTilt size={17} />}{session.role === 'staff' ? 'Create and publish' : 'Save teacher draft'}</button>
      </section>
      <aside className="preview-panel">
        <span className="eyebrow">LIVE PREVIEW</span><h2>{title || 'Untitled activity'}</h2><p>{description || 'Activity description'}</p>
        <div className="source-tags">{labels.split(',').filter(Boolean).map(label => <span key={label}>{label.trim()}</span>)}</div>
        <div className="preview-question"><small>STUDENT INPUT</small><b>{question || 'Reflection question'}</b><div className="fake-input">Long response</div></div>
        {result && <div className="success-panel"><CheckCircle size={22} weight="fill" /><div><b>Activity created</b><p>Status: {result.status}. Open Activity list to review its audit trail.</p></div></div>}
      </aside>
    </div>
  </>;
}
