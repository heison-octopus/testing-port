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
  const load = () => api.forms().then(setData).catch(report);
  useEffect(() => { load(); api.activities().then(items => { setActivities(items); setActivity(items[0]?.id || ''); }).catch(report); }, []);
  async function draft() { try { await api.draftForm(activity, template, prompt); await load(); } catch (error) { report(error); } }
  async function publish(id: string) { try { await api.publishForm(id); await load(); } catch (error) { report(error); } }

  return <>
    <PageHeader eyebrow="REUSABLE INPUT" title="Input templates" description="Form versions are separate from activities and from assessment processing." />
    <Notice>A template controls input presentation and validation. It never grants a VASK tag or Skills Builder step.</Notice>
    <div className="template-strip">{Object.entries(data?.templates || {}).map(([key, item]) => <article key={key}><b>{item.label}</b><span>{item.audience} · {item.input}</span><small>{key}</small></article>)}</div>
    {session.role === 'teacher' && <div className="editor-grid compact"><section><h2>Prepare successor draft</h2><label>Activity<select value={activity} onChange={event => setActivity(event.target.value)}>{activities.map(item => <option value={item.id} key={item.id}>{item.title}</option>)}</select></label><label>Input template<select value={template} onChange={event => setTemplate(event.target.value)}>{Object.entries(data?.templates || {}).map(([key, item]) => <option key={key} value={key}>{item.label}</option>)}</select></label><label>Student question<textarea value={prompt} onChange={event => setPrompt(event.target.value)} maxLength={1000} /></label><button className="primary" onClick={draft}>Save successor draft</button></section><aside className="preview-panel"><span className="eyebrow">STUDENT PREVIEW</span><h2>{prompt}</h2><div className="fake-input">{data?.templates[template]?.input || 'Input field'}</div><p>Students remain on the last published version until assigned staff explicitly publish this successor.</p></aside></div>}
    <div className="section-heading"><div><span>VERSION HISTORY</span><h2>Form versions</h2></div></div>
    {data?.forms.map(form => <div className="item-row" key={form.id}><span><b>{form.name}</b><small>{form.prompt} · {form.template_key}</small></span><div><span>v{form.version}</span> <StatusPill status={form.status} />{session.role === 'staff' && form.status === 'draft' && <button className="text-button" onClick={() => publish(form.id)}><CheckCircle size={16} />Publish</button>}</div></div>)}
  </>;
}

export function Admin({ report }: { report: (error: unknown) => void }) {
  const [data, setData] = useState<AdminData | null>(null);
  const [privacy, setPrivacy] = useState<Awaited<ReturnType<typeof api.privacyContract>> | null>(null);
  const load = () => Promise.all([api.admin(), api.privacyContract()]).then(([adminData, contract]) => { setData(adminData); setPrivacy(contract); }).catch(report);
  useEffect(() => { load(); }, []);
  const regenerationRole = data?.policies.find(item => item.policy_key === 'portfolio_regeneration_role')?.policy_value || 'admin';
  async function updateRole(value: string) { try { await api.updatePolicy('portfolio_regeneration_role', value); await load(); } catch (error) { report(error); } }

  return <>
    <PageHeader eyebrow="SCHOOL POLICY" title="Controls, contracts and audit" description="Configure the decision boundary without giving SchoolAdmin source-review authority." />
    <Notice>These are proposed POC defaults, not BHSS or JC approval. Assessment review still requires a separate named assignment.</Notice>
    <div className="metric-strip"><div><b>{data?.counts.peerReviews || 0}</b><span>Peer reviews</span></div><div><b>{data?.counts.pendingPeerReviews || 0}</b><span>Pending moderation</span></div><div><b>{data?.counts.media || 0}</b><span>Media records</span></div><div><b>{data?.counts.generations || 0}</b><span>Generation attempts</span></div></div>
    <div className="admin-grid">
      <section><div className="section-heading"><div><span>PORTFOLIO POLICY</span><h2>Source-withdrawal decision</h2></div><ShieldCheck size={21} /></div><p>A disabled source creates a warning but does not silently re-evaluate the published portfolio.</p><label>Who may trigger regeneration?<select value={regenerationRole} onChange={event => updateRole(event.target.value)}><option value="admin">SchoolAdmin only</option><option value="staff">Assigned staff or SchoolAdmin</option></select></label><small>Class teachers and students always receive the warning but cannot trigger regeneration under this toggle.</small></section>
      <section><div className="section-heading"><div><span>PRIVACY FILTER</span><h2>Empty provider contract</h2></div><Database size={21} /></div><StatusPill status={privacy?.status || 'loading'} /><p>{privacy?.note}</p><dl className="contract-list"><div><dt>Mode</dt><dd>{privacy?.mode}</dd></div><div><dt>Input</dt><dd>schoolId · records · identityMap</dd></div><div><dt>Output</dt><dd>sanitizedRecords · replacementLog</dd></div></dl></section>
      <section><div className="section-heading"><div><span>TIME INFINITY</span><h2>Expected import contract</h2></div></div><p>The real sanitized export and data dictionary are not yet available. The POC expects:</p><ul className="plain-list"><li>Stable school-scoped person ID</li><li>Academic year and reporting period</li><li>Class / group membership and effective dates</li><li>Activity membership when present</li></ul><div className="decision-split"><span><b>Needed</b>Add a validated field to the versioned contract.</span><span><b>Not needed</b>Discard it during staging; do not persist it.</span></div></section>
      <section><div className="section-heading"><div><span>FEATURES</span><h2>School modules</h2></div></div>{data?.features.map(feature => <div className="item-row" key={feature.feature}><span>{feature.feature}</span><StatusPill status={feature.enabled ? 'enabled' : 'disabled'} /></div>)}</section>
    </div>
    <div className="two-columns"><section><div className="section-heading"><div><span>ASSIGNMENTS</span><h2>Named scopes</h2></div></div>{data?.assignments.slice(0, 18).map((assignment, index) => <div className="item-row" key={`${assignment.user_id}-${assignment.scope_type}-${index}`}><span>{assignment.user_id}</span><small>{assignment.scope_type}: {assignment.scope_id}</small></div>)}</section><section><div className="section-heading"><div><span>AUDIT</span><h2>Recent events</h2></div></div>{data?.audit.slice(0, 18).map((event, index) => <div className="item-row" key={`${event.created_at}-${index}`}><span>{event.action}<small>{event.actor_id} · {event.target}</small></span></div>)}</section></div>
  </>;
}
