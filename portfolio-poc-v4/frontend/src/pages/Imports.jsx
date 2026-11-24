import React, { useState } from 'react';
import { api } from '../api';
import Table from '../components/Table';
import { confirmAction } from '../utils/confirmAction';

function ExportButton({ path, label, fileName, notify, run }) {
  return <button onClick={() => run(async () => { const blob = await api.exportCsv(path); const href = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = href; link.download = fileName; link.click(); URL.revokeObjectURL(href); notify(`Downloaded ${fileName}`); })}>{label}</button>;
}

function ChangeTable({ rows }) {
  const changes = rows.flatMap(row => (row.changes || []).map(change => ({ row: row.user_id || row.row, ...change })));
  if (!changes.length) return <p className="muted">No field changes detected in the valid rows.</p>;
  return <Table columns={['Row / ID', 'Field', 'Before', 'After']} rows={changes} render={change => <tr key={`${change.row}-${change.field}`}><td>{change.row}</td><td>{change.field}</td><td>{String(change.before ?? '—')}</td><td>{String(change.after ?? '—')}</td></tr>} />;
}

function ImportPanel({ title, description, initial, previewApi, commitApi, reason, run, notify }) {
  const [csv, setCsv] = useState(initial), [fileName, setFileName] = useState(''), [preview, setPreview] = useState(null);
  async function validate(value, name = '') {
    setCsv(value); setFileName(name); setPreview(null);
    if (!value.trim()) return;
    await run(async () => setPreview(await previewApi(value)));
  }
  return <section className="card soft"><h2>{title}</h2><p>{description}</p><label>Upload updated CSV<input aria-label={`${title} file`} type="file" accept=".csv,text/csv" onChange={async e => { const file = e.target.files?.[0]; if (file) await validate(await file.text(), file.name); }} /></label>{fileName && <p className="muted">Loaded: {fileName}</p>}<textarea aria-label={`${title} CSV`} value={csv} onChange={e => { setCsv(e.target.value); setPreview(null); }} rows={6} style={{ width: '100%', fontFamily: 'monospace' }} /><div><button onClick={() => validate(csv, fileName)}>Validate current file</button>{preview && <span className={preview.errors.length ? 'error' : 'valid'} style={{ marginLeft: 10, padding: 8 }}>Valid rows: {preview.valid.length} · Errors: {preview.errors.length}</span>}</div>{preview && <><h3>Changes detected</h3><ChangeTable rows={preview.valid} /></>}{preview?.errors.length > 0 && <><h3>Errors by row</h3><Table columns={['Row', 'Column', 'Error']} rows={preview.errors} render={e => <tr key={`${e.row}-${e.column}`}><td>{e.row}</td><td>{e.column}</td><td>{e.message}</td></tr>} /></>}{preview && <button disabled={!preview.can_commit} onClick={() => { if (!confirmAction(`Import ${preview.valid.length} validated ${title.toLowerCase()} changes?`)) return; run(async () => { const result = await commitApi(csv, reason); notify(`Imported ${result.updated ?? result.imported} records`); setPreview(null); }); }}>Confirm {preview.valid.length} changes</button>}</section>;
}

export default function Imports({ run, notify }) {
  const [status, setStatus] = useState(''), [userKind, setUserKind] = useState(''), [query, setQuery] = useState('');
  const filteredPath = `/people/export.csv?${new URLSearchParams({ ...(status ? { status } : {}), ...(userKind ? { user_kind: userKind } : {}), ...(query ? { q: query } : {}) }).toString()}`;
  return <><div className="page-heading"><div><p className="eyebrow">ASSIGNMENTS / IMPORT AND EXPORT</p><h1>Assignments and imports</h1><p>Upload an updated CSV to validate it immediately. Review changes and row errors before committing.</p></div></div><section className="card"><h2>People export</h2><div className="grid"><label>Status<select value={status} onChange={e => setStatus(e.target.value)}><option value="">All</option><option value="active">Active</option><option value="pending">Pending</option><option value="suspended">Suspended</option><option value="disabled">Disabled</option></select></label><label>User kind<select value={userKind} onChange={e => setUserKind(e.target.value)}><option value="">All</option><option value="student">Student</option><option value="staff">Staff</option></select></label><label>Search<input value={query} onChange={e => setQuery(e.target.value)} placeholder="ID, name or email" /></label></div><ExportButton path="/people/export.csv" fileName="users.csv" label="Export people CSV" notify={notify} run={run} /> <ExportButton path={filteredPath} fileName="users-filtered.csv" label="Export filtered people CSV" notify={notify} run={run} /></section><section className="card"><h2>Assignment export</h2><ExportButton path="/assignments/export.csv" fileName="assignments.csv" label="Export assignments CSV" notify={notify} run={run} /></section><div className="grid"><ImportPanel title="People profile update" description="Select the CSV exported above, edit it, and upload it for automatic validation. New rows may leave user_id blank; IDs beginning with s or t receive Student or Teacher by default. Use default_role for an explicit role." initial={'user_id,in_school_id,display_name,email,user_kind,status,default_role\na-teacher,a-teacher,A teacher,teacher@a.demo,staff,active,teacher'} previewApi={api.previewUserImport} commitApi={api.commitUserImport} reason="User profile CSV import" run={run} notify={notify} /><ImportPanel title="Class transfer / period update" description="Select the assignment CSV, edit class or period values, and upload it for automatic validation." initial={'user_id,new_class,class_number,effective_period\na-student,1A,1A,term'} previewApi={api.previewAssignmentImport} commitApi={api.commitAssignmentImport} reason="Batch class and period update" run={run} notify={notify} /></div></>;
}
