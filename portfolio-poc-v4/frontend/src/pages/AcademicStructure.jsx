import React, { useEffect, useState } from 'react';
import { api } from '../api';
import Field from '../components/Field';
import Table from '../components/Table';
import SchoolTermBatch from '../components/SchoolTermBatch';
import { confirmAction } from '../utils/confirmAction';

const labels = { year: 'Academic year', period: 'School term', class: 'Class', subject: 'Subject', group: 'Group', department: 'Department', position: 'Position', label: 'Label' };
const displayDate = value => value ? new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Hong_Kong', day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value)) : 'Not configured';
const range = row => row ? `${displayDate(row.start_at)} → ${displayDate(row.end_at)}` : 'Not configured';

export default function AcademicStructure({ run, notify }) {
  const [rows, setRows] = useState([]);
  const [type, setType] = useState('year');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [parentId, setParentId] = useState('');
  const [canCreate, setCanCreate] = useState(false);
  const [yearMode, setYearMode] = useState(null);
  const dated = ['year', 'period'].includes(type);
  const hasParent = ['class', 'period'].includes(type);
  const parent = rows.find(row => row.id === parentId);
  async function load() { setRows(await api.list('school-definitions')); }
  useEffect(() => { run(async () => { await load(); const session = await api.session(); setCanCreate(session.actions.includes('school-definitions.create')); }); }, []);
  const visible = rows.filter(row => row.kind === type && `${row.code} ${row.name}`.toLowerCase().includes(search.toLowerCase()));
  function changeType(next) { setType(next); setSelected(null); setParentId(''); setYearMode(null); }
  return <>
    <h1>Academic structure</h1>
    <p>Review academic years, school terms, classes and school reference items. A code identifies an item; its dates define the time range.</p>
    <nav aria-label="Structure types" className="nav-actions">{Object.entries(labels).map(([key, label]) => <button key={key} type="button" aria-pressed={type === key} onClick={() => changeType(key)}>{label}</button>)}</nav>
    <Field label="Search structure items" value={search} onChange={e => setSearch(e.target.value)} placeholder="Code or name" />
    <Table columns={['Code', 'Name', ...(hasParent ? ['Academic year'] : []), ...(dated ? ['Start date', 'End date'] : type === 'class' ? ['Academic year dates'] : []), 'Status', 'Details']} rows={visible} render={row => {
      const year = rows.find(y => y.id === row.parent_definition_id);
      return <tr key={row.id}><td>{row.code}</td><td>{row.name}</td>{hasParent && <td>{year?.name || 'Not configured'}</td>}{dated && <><td>{displayDate(row.start_at)}</td><td>{displayDate(row.end_at)}</td></>}{type === 'class' && <td>{range(year)}</td>}<td>{row.status}</td><td><button onClick={() => setSelected(row)}>View details: {row.name}</button></td></tr>;
    }} />
    {selected && <section className="card" aria-label="Structure item details"><h2>{selected.name} · details</h2><dl>
      <dt>Code</dt><dd>{selected.code}</dd><dt>Type</dt><dd>{labels[selected.kind]}</dd><dt>Status</dt><dd>{selected.status}</dd>
      <dt>Parent academic year</dt><dd>{rows.find(r => r.id === selected.parent_definition_id)?.name || 'None'}</dd>
      <dt>Stored start date</dt><dd>{displayDate(selected.start_at)}</dd><dt>Stored end date</dt><dd>{displayDate(selected.end_at)}</dd>
      {selected.kind === 'class' && <><dt>Inherited academic year dates</dt><dd>{range(rows.find(r => r.id === selected.parent_definition_id))}</dd></>}
    </dl><button onClick={() => setSelected(null)}>Close details</button></section>}
    {canCreate && type === 'year' && <div className="nav-actions" aria-label="School year actions">
      <button type="button" aria-pressed={yearMode === 'single'} onClick={() => setYearMode('single')}>Add school year</button>
      <button type="button" aria-pressed={yearMode === 'three'} onClick={() => setYearMode('three')}>Add school year (3 terms)</button>
    </div>}
    {canCreate && type === 'year' && yearMode === 'three' && <SchoolTermBatch run={run} notify={notify} refresh={load} close={() => setYearMode(null)} />}
    {canCreate && (type !== 'year' || yearMode === 'single') && <section><h2>{type === 'year' ? 'Add school year' : 'Add ' + labels[type].toLowerCase()}</h2>
      <p>{dated ? 'Start and end dates are required. School terms must fall within their academic year.' : hasParent ? 'Select the academic year. Its dates apply to this class.' : 'Enter a code and name. This type does not require an academic year.'}</p>
      <form key={type} onSubmit={e => {
        e.preventDefault();
        const form = e.currentTarget;
        const body = { ...Object.fromEntries(new FormData(form)), kind: type };
        if (!confirmAction(`Create ${labels[type].toLowerCase()} “${body.name}”?`)) return;
        run(async () => { await api.create('school-definitions', body); form.reset(); setParentId(''); await load(); notify('Structure item saved'); });
      }}>
        <Field label="Structure type"><select aria-label="Structure type" value={type} onChange={e => changeType(e.target.value)}>{Object.entries(labels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></Field>
        <Field label="Code" name="code" required /><Field label="Name" name="name" required />
        {hasParent && <Field label="Parent academic year"><select aria-label="Parent academic year" name="parent_definition_id" required value={parentId} onChange={e => setParentId(e.target.value)}><option value="">Choose an academic year</option>{rows.filter(r => r.kind === 'year' && r.status === 'active').map(r => <option key={r.id} value={r.id}>{r.name} · {range(r)}</option>)}</select></Field>}
        {type === 'class' && <p>Academic year dates: {range(parent)}</p>}
        {dated && <><Field label="Start date" name="start_at" type="datetime-local" required /><Field label="End date" name="end_at" type="datetime-local" required /></>}
        <Field label="Reason" name="reason" required /><button>Save structure item</button>
      </form>
    </section>}
  </>;
}
