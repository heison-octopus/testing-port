import { useEffect, useState } from 'react';
import { CheckCircle, Database, ShieldCheck } from '@phosphor-icons/react';
import { api, type Session } from '../api/client';
import { Notice, PageHeader, StatusPill } from '../components/Layout';

type FormsData = Awaited<ReturnType<typeof api.forms>>;
type AdminData = Awaited<ReturnType<typeof api.admin>>;

export function Forms({ report, session }: { report: (error: unknown) => void; session: Session }) {
  const [data, setData] = useState<FormsData | null>(null);
  const [activities, setActivities] = useState<{ id: string; title: string }[]>([]);
  const [activity, setActivity] = useState('');
  const [template, setTemplate] = useState('reflection-v1');
  const [prompt, setPrompt] = useState('What did you notice about your contribution and growth?');
  const [authoringMode, setAuthoringMode] = useState<'manual' | 'import'>('manual');
  const [sourceId, setSourceId] = useState('');
  const [selectedQuestions, setSelectedQuestions] = useState<string[]>([]);
  const [staged, setStaged] = useState<Awaited<ReturnType<typeof api.stageFormImport>> | null>(null);
  const load = () => api.forms().then(forms => {
    setData(forms);
    const supplied = forms.sources.find(item => item.source_type === 'supplied_instrument');
    if (!sourceId && supplied) setSourceId(supplied.id);
  }).catch(report);
  useEffect(() => { load(); api.activities().then(items => { setActivities(items); setActivity(items[0]?.id || ''); }).catch(report); }, []);
  async function draft() { try { await api.draftForm(activity, template, prompt); await load(); } catch (error) { report(error); } }
  async function stageImport() { try { setStaged(await api.stageFormImport(activity, sourceId, selectedQuestions)); await load(); } catch (error) { report(error); } }
  async function applyImport() { if (!staged) return; try { await api.applyFormImport(staged.id); setStaged(null); setSelectedQuestions([]); await load(); } catch (error) { report(error); } }
  async function publish(id: string) { try { await api.publishForm(id); await load(); } catch (error) { report(error); } }
  function toggleQuestion(id: string) { setSelectedQuestions(items => items.includes(id) ? items.filter(item => item !== id) : [...items, id]); setStaged(null); }

  return <>
    <PageHeader eyebrow="REUSABLE INPUT" title="Input templates" description="Form versions are separate from activities and from assessment processing." />
    <Notice>A template controls input presentation and validation. It never grants a VASK tag or Skills Builder step.</Notice>
    <div className="template-strip">{Object.entries(data?.templates || {}).map(([key, item]) => <article key={key}><b>{item.label}</b><span>{item.audience} · {item.input}</span><small>{key}</small></article>)}</div>
    {session.role === 'teacher' && <><div className="tab-strip compact-tabs"><button className={authoringMode === 'manual' ? 'active' : ''} onClick={() => setAuthoringMode('manual')}>Write question</button><button className={authoringMode === 'import' ? 'active' : ''} onClick={() => setAuthoringMode('import')}>Import source questions</button></div>
      {authoringMode === 'manual' ? <div className="editor-grid compact"><section><h2>Prepare manual successor draft</h2><label>Activity<select value={activity} onChange={event => setActivity(event.target.value)}>{activities.map(item => <option value={item.id} key={item.id}>{item.title}</option>)}</select></label><label>Input template<select value={template} onChange={event => setTemplate(event.target.value)}>{Object.entries(data?.templates || {}).filter(([, item]) => item.input !== 'scale').map(([key, item]) => <option key={key} value={key}>{item.label}</option>)}</select></label><label>Student question<textarea value={prompt} onChange={event => setPrompt(event.target.value)} maxLength={1000} /></label><button className="primary" onClick={draft}>Save successor draft</button></section><aside className="preview-panel"><span className="eyebrow">STUDENT PREVIEW</span><h2>{prompt}</h2><div className="fake-input">{data?.templates[template]?.input || 'Input field'}</div><p>Students remain on the last published version until assigned staff explicitly publish this successor.</p></aside></div>
      : <div className="editor-grid compact"><section><h2>Stage a form-definition import</h2><label>Activity<select value={activity} onChange={event => { setActivity(event.target.value); setStaged(null); }}>{activities.map(item => <option value={item.id} key={item.id}>{item.title}</option>)}</select></label><label>Questionnaire source<select value={sourceId} onChange={event => { setSourceId(event.target.value); setSelectedQuestions([]); setStaged(null); }}>{data?.sources.filter(item => item.source_type === 'supplied_instrument').map(item => <option key={item.id} value={item.id}>{item.name} · {item.version}</option>)}</select><small>A source is the whole supplied instrument, not a child record of this form.</small></label><div className="question-picker compact-picker">{data?.questionLibrary.filter(item => item.source_id === sourceId).map(item => <label key={item.id} className={selectedQuestions.includes(item.id) ? 'selected' : ''}><input type="checkbox" checked={selectedQuestions.includes(item.id)} onChange={() => toggleQuestion(item.id)} /><span><b>{item.prompt_zh}</b><small>{item.construct_en} · {item.subdomain} · source row {item.source_row}</small><small>{item.ability_name_en}</small></span></label>)}</div><button className="secondary" disabled={!selectedQuestions.length} onClick={stageImport}>1. Validate staged diff</button>{staged?.status === 'validated' && <button className="primary" onClick={applyImport}>2. Create successor draft</button>}</section><aside className="preview-panel"><span className="eyebrow">STAGED DIFF</span>{staged ? <><StatusPill status={staged.status} /><div className="metric-strip mini"><div><b>{staged.summary.total}</b><span>Rows</span></div><div><b>{staged.summary.added}</b><span>Added</span></div><div><b>{staged.summary.modified}</b><span>Changed</span></div><div><b>{staged.summary.errors}</b><span>Errors</span></div></div><p>The original row payload and source identity are retained. Applying this batch creates a draft only.</p></> : <p>Select source-owned questions, then validate the staged row-level diff. No student answers are accepted by this contract.</p>}</aside></div>}</>}
    <div className="section-heading"><div><span>VERSION HISTORY</span><h2>Form versions</h2></div></div>
    {data?.forms.map(form => <div className="item-row" key={form.id}><span><b>{form.name}</b><small>{form.questions.length} question{form.questions.length === 1 ? '' : 's'} · {form.source_mode} · {form.template_key}</small></span><div><span>v{form.version}</span> <StatusPill status={form.status} />{session.role === 'staff' && form.status === 'draft' && <button className="text-button" onClick={() => publish(form.id)}><CheckCircle size={16} />Publish</button>}</div></div>)}
    {!!data?.imports.length && <><div className="section-heading"><div><span>IMPORT HISTORY</span><h2>Staged definition batches</h2></div></div>{data.imports.map(batch => <div className="item-row" key={batch.id}><span><b>{batch.file_name}</b><small>{batch.activity_title} · {batch.source_name}</small></span><div><StatusPill status={batch.status} /></div></div>)}</>}
  </>;
}

export function Admin({ report }: { report: (error: unknown) => void }) {
  const [data, setData] = useState<AdminData | null>(null);
  const [privacy, setPrivacy] = useState<Awaited<ReturnType<typeof api.privacyContract>> | null>(null);
  const [periodYear, setPeriodYear] = useState('');
  const [periodCode, setPeriodCode] = useState('WINTER');
  const [periodNameEn, setPeriodNameEn] = useState('Winter activities');
  const [periodNameZh, setPeriodNameZh] = useState('冬季活動');
  const [periodStart, setPeriodStart] = useState('2026-12-19');
  const [periodEnd, setPeriodEnd] = useState('2027-01-03');
  const [periodSequence, setPeriodSequence] = useState(5);
  const load = () => Promise.all([api.admin(), api.privacyContract()]).then(([adminData, contract]) => { setData(adminData); setPrivacy(contract); if (!periodYear && adminData.academicYears[0]) setPeriodYear(adminData.academicYears[0].id); }).catch(report);
  useEffect(() => { load(); }, []);
  const regenerationRole = data?.policies.find(item => item.policy_key === 'portfolio_regeneration_role')?.policy_value || 'admin';
  async function updateRole(value: string) { try { await api.updatePolicy('portfolio_regeneration_role', value); await load(); } catch (error) { report(error); } }
  async function createPeriod() { try { await api.createReportingPeriod({ academicYearId: periodYear, code: periodCode, nameEn: periodNameEn, nameZh: periodNameZh, startDate: periodStart, endDate: periodEnd, sequence: periodSequence, status: 'planned' }); await load(); } catch (error) { report(error); } }
  async function updatePeriodStatus(id: string, status: string) { try { await api.updateReportingPeriodStatus(id, status); await load(); } catch (error) { report(error); } }

  return <>
    <PageHeader eyebrow="SCHOOL POLICY" title="Controls, contracts and audit" description="Configure the decision boundary without giving SchoolAdmin source-review authority." />
    <Notice>These are proposed POC defaults, not BHSS or JC approval. Assessment review still requires a separate named assignment.</Notice>
    <div className="context-line admin-context"><span><small>SCHOOL</small><b>{data?.school.name || 'Loading'}</b></span><span><small>IMMUTABLE SCHOOL ID</small><b>{data?.school.id || '—'}</b></span><span><small>OPERATING MODE</small><b>{data?.school.operating_mode || '—'}</b></span></div>
    <div className="metric-strip"><div><b>{data?.counts.peerReviews || 0}</b><span>Peer reviews</span></div><div><b>{data?.counts.pendingPeerReviews || 0}</b><span>Pending moderation</span></div><div><b>{data?.counts.media || 0}</b><span>Media records</span></div><div><b>{data?.counts.generations || 0}</b><span>Generation attempts</span></div></div>
    <div className="admin-grid">
      <section className="wide-admin"><div className="section-heading"><div><span>ACADEMIC CONTEXT</span><h2>Reporting-period control</h2></div></div><p>Activities store dates. The server resolves the one containing period; users never type or override SchoolId on an activity.</p><div className="period-list">{data?.reportingPeriods.map(period => <div className="item-row" key={period.id}><span><b>{period.name_en} · {period.name_zh}</b><small>{period.start_date} to {period.end_date} · {period.code}</small></span><select value={period.status} onChange={event => updatePeriodStatus(period.id, event.target.value)}><option value="planned">planned</option><option value="open">open</option><option value="closed">closed</option></select></div>)}</div><details><summary>Add a planned period</summary><div className="period-editor"><label>Academic year<select value={periodYear} onChange={event => setPeriodYear(event.target.value)}>{data?.academicYears.map(year => <option value={year.id} key={year.id}>{year.code} · {year.name}</option>)}</select></label><label>Code<input value={periodCode} onChange={event => setPeriodCode(event.target.value)} /></label><label>English name<input value={periodNameEn} onChange={event => setPeriodNameEn(event.target.value)} /></label><label>Chinese name<input value={periodNameZh} onChange={event => setPeriodNameZh(event.target.value)} /></label><label>Start<input type="date" value={periodStart} onChange={event => setPeriodStart(event.target.value)} /></label><label>End<input type="date" value={periodEnd} onChange={event => setPeriodEnd(event.target.value)} /></label><label>Sequence<input type="number" min={1} max={20} value={periodSequence} onChange={event => setPeriodSequence(Number(event.target.value))} /></label><button className="primary" onClick={createPeriod}>Add planned period</button></div></details></section>
      <section><div className="section-heading"><div><span>PORTFOLIO POLICY</span><h2>Source-withdrawal decision</h2></div><ShieldCheck size={21} /></div><p>A disabled source creates a warning but does not silently re-evaluate the published portfolio.</p><label>Who may trigger regeneration?<select value={regenerationRole} onChange={event => updateRole(event.target.value)}><option value="admin">SchoolAdmin only</option><option value="staff">Assigned staff or SchoolAdmin</option></select></label><small>Class teachers and students always receive the warning but cannot trigger regeneration under this toggle.</small></section>
      <section><div className="section-heading"><div><span>PRIVACY FILTER</span><h2>Empty provider contract</h2></div><Database size={21} /></div><StatusPill status={privacy?.status || 'loading'} /><p>{privacy?.note}</p><dl className="contract-list"><div><dt>Mode</dt><dd>{privacy?.mode}</dd></div><div><dt>Input</dt><dd>schoolId · records · identityMap</dd></div><div><dt>Output</dt><dd>sanitizedRecords · replacementLog</dd></div></dl></section>
      <section><div className="section-heading"><div><span>TIME INFINITY</span><h2>Expected import contract</h2></div></div><p>The real sanitized export and data dictionary are not yet available. The POC expects:</p><ul className="plain-list"><li>Stable school-scoped person ID</li><li>Academic year and reporting period</li><li>Class / group membership and effective dates</li><li>Activity membership when present</li></ul><div className="decision-split"><span><b>Needed</b>Add a validated field to the versioned contract.</span><span><b>Not needed</b>Discard it during staging; do not persist it.</span></div></section>
      <section><div className="section-heading"><div><span>FEATURES</span><h2>School modules</h2></div></div>{data?.features.map(feature => <div className="item-row" key={feature.feature}><span>{feature.feature}</span><StatusPill status={feature.enabled ? 'enabled' : 'disabled'} /></div>)}</section>
    </div>
    <div className="two-columns"><section><div className="section-heading"><div><span>ASSIGNMENTS</span><h2>Named scopes</h2></div></div>{data?.assignments.slice(0, 18).map((assignment, index) => <div className="item-row" key={`${assignment.user_id}-${assignment.scope_type}-${index}`}><span>{assignment.user_id}</span><small>{assignment.scope_type}: {assignment.scope_id}</small></div>)}</section><section><div className="section-heading"><div><span>AUDIT</span><h2>Recent events</h2></div></div>{data?.audit.slice(0, 18).map((event, index) => <div className="item-row" key={`${event.created_at}-${index}`}><span>{event.action}<small>{event.actor_id} · {event.target}</small></span></div>)}</section></div>
  </>;
}
