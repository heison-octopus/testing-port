import { useEffect, useMemo, useState } from 'react';
import { CheckCircle, PaperPlaneTilt } from '@phosphor-icons/react';
import { api, type Session } from '../api/client';
import { Notice, PageHeader } from '../components/Layout';

export function ActivityEditor({ session, report }: { session: Session; report: (error: unknown) => void }) {
  const [title, setTitle] = useState('Student-led service project');
  const [description, setDescription] = useState('Students identify a school-community need, plan a response and document what they learned.');
  const [labels, setLabels] = useState('Planning, Teamwork, Responsibility');
  const [startsAt, setStartsAt] = useState('2026-10-28T09:00');
  const [endsAt, setEndsAt] = useState('2026-10-28T10:00');
  const [reflectionMode, setReflectionMode] = useState<'manual' | 'question_bank'>('manual');
  const [question, setQuestion] = useState('What did you contribute, what changed, and what would you do differently?');
  const [context, setContext] = useState<Awaited<ReturnType<typeof api.academicContext>> | null>(null);
  const [formData, setFormData] = useState<Awaited<ReturnType<typeof api.forms>> | null>(null);
  const [selectedQuestions, setSelectedQuestions] = useState<string[]>([]);
  const [result, setResult] = useState<{ id: string; status: string; periodResolutionStatus: string; reportingPeriod: { name_en: string } | null } | null>(null);

  useEffect(() => {
    Promise.all([api.academicContext(), api.forms()]).then(([schoolContext, forms]) => {
      setContext(schoolContext);
      setFormData(forms);
      if (forms.questionLibrary[0]) setSelectedQuestions([forms.questionLibrary[0].id]);
    }).catch(report);
  }, []);

  const predictedPeriod = useMemo(() => context?.reportingPeriods.find(period => period.start_date <= startsAt.slice(0, 10) && period.end_date >= endsAt.slice(0, 10)) || null, [context, startsAt, endsAt]);
  const selectedDefinitions = formData?.questionLibrary.filter(item => selectedQuestions.includes(item.id)) || [];

  function toggleQuestion(id: string) {
    setSelectedQuestions(current => current.includes(id) ? current.filter(item => item !== id) : [...current, id]);
  }

  async function create() {
    try {
      const created = await api.createActivity({
        title, description, labels: labels.split(',').map(value => value.trim()).filter(Boolean), startsAt, endsAt, reflectionMode,
        question: reflectionMode === 'manual' ? question : undefined,
        questionIds: reflectionMode === 'question_bank' ? selectedQuestions : undefined,
      });
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
        <div className="context-line"><span><small>SCHOOL</small><b>{context?.school.name || 'Loading'}</b></span><span><small>IMMUTABLE SCHOOL ID</small><b>{context?.school.id || session.school}</b></span><span><small>SERVER-RESOLVED PERIOD</small><b>{predictedPeriod?.name_en || 'No single period'}</b></span></div>
        <label>Activity title<input value={title} onChange={event => setTitle(event.target.value)} maxLength={160} /></label>
        <label>Description and context<textarea value={description} onChange={event => setDescription(event.target.value)} maxLength={4000} /></label>
        <div className="field-pair"><label>Starts at<input type="datetime-local" value={startsAt} onChange={event => setStartsAt(event.target.value)} /></label><label>Ends at<input type="datetime-local" value={endsAt} onChange={event => setEndsAt(event.target.value)} /></label></div>
        {!predictedPeriod && <Notice tone="warning">These dates do not fit wholly inside one configured reporting period. The server will keep the activity as a blocked draft.</Notice>}
        <label>VASK / activity-intent labels<input value={labels} onChange={event => setLabels(event.target.value)} /><small>Comma-separated descriptive labels. They do not award Skills Builder levels.</small></label>
        <label>Reflection-question path<select value={reflectionMode} onChange={event => setReflectionMode(event.target.value as 'manual' | 'question_bank')}><option value="manual">Write a school question</option><option value="question_bank">Select from supplied questionnaire</option></select></label>
        {reflectionMode === 'manual' ? <label>Student reflection question<textarea value={question} onChange={event => setQuestion(event.target.value)} maxLength={1000} /><small>The question receives a school-authored source record and its own reflection ability definition.</small></label> : <div><span className="field-label">Question bank</span><div className="question-picker">{formData?.questionLibrary.map(item => <label key={item.id} className={selectedQuestions.includes(item.id) ? 'selected' : ''}><input type="checkbox" checked={selectedQuestions.includes(item.id)} onChange={() => toggleQuestion(item.id)} /><span><b>{item.prompt_zh}</b><small>{item.construct_en} · {item.subdomain} · source row {item.source_row}</small><small>{item.ability_name_en} · context only, no Skills Builder mapping</small></span></label>)}</div></div>}
        <button className="primary" onClick={create}>{session.role === 'staff' ? <CheckCircle size={17} /> : <PaperPlaneTilt size={17} />}{session.role === 'staff' ? 'Create and publish' : 'Save teacher draft'}</button>
      </section>
      <aside className="preview-panel">
        <span className="eyebrow">LIVE PREVIEW</span><h2>{title || 'Untitled activity'}</h2><p>{description || 'Activity description'}</p>
        <div className="source-tags">{labels.split(',').filter(Boolean).map(label => <span key={label}>{label.trim()}</span>)}</div>
        {(reflectionMode === 'manual' ? [{ id: 'manual', prompt_zh: question, input_type: 'long_text' }] : selectedDefinitions).map(item => <div className="preview-question" key={item.id}><small>STUDENT INPUT</small><b>{item.prompt_zh || 'Reflection question'}</b><div className="fake-input">{item.input_type === 'scale' ? 'Six-point response' : 'Long response'}</div></div>)}
        {result && <div className="success-panel"><CheckCircle size={22} weight="fill" /><div><b>Activity created</b><p>Status: {result.status}. Period: {result.reportingPeriod?.name_en || result.periodResolutionStatus}. Open Activity list to review its audit trail.</p></div></div>}
      </aside>
    </div>
  </>;
}
