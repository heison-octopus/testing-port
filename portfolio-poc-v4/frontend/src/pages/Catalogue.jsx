import React, { useState, useEffect } from 'react';
import { api } from '../api';
import Field from '../components/Field';
import Table from '../components/Table';
export default function Catalogue({
  kind,
  run,
  notify
}) {
  const [rows, setRows] = useState([]);
  const roles = kind === 'roles';
  async function load() {
    setRows(await api.list(kind));
  }
  useEffect(() => {
    run(load);
  }, [kind]);
  return <><h1>{roles ? 'Roles' : 'School definitions'}</h1><p>{roles ? 'Labels reference a retained backend permission profile.' : 'Classes and reporting periods belong to an academic year.'}</p><Table columns={['Code', 'Label', 'Type / profile']} rows={rows} render={r => <tr key={r.id}><td>{r.code}</td><td>{r.name || r.name_en}</td><td>{r.kind || r.permission_profile_key}</td></tr>} /><h2>Add {roles ? 'role' : 'definition'}</h2><form key={kind} onSubmit={e => {
      e.preventDefault();
      const form = e.currentTarget,
        body = Object.fromEntries(new FormData(form));
      run(async () => {
        await api.create(kind, body);
        form.reset();
        await load();
        notify('Definition saved');
      });
    }}><Field label="Code" name="code" required />{roles ? <><Field label="English label" name="name_en" required /><Field label="Chinese label" name="name_zh" required /><Field label="Permission profile"><select name="permission_profile_key">{['admin', 'teacher', 'student', 'denied'].map(x => <option key={x}>{x}</option>)}</select></Field></> : <><Field label="Name" name="name" required /><Field label="Kind"><select name="kind">{['class', 'period', 'year', 'subject', 'group', 'department', 'position', 'label'].map(x => <option key={x}>{x}</option>)}</select></Field><Field label="Parent academic year"><select name="parent_definition_id"><option value="">None</option>{rows.filter(r => r.kind === 'year').map(r => <option key={r.id} value={r.id}>{r.name}</option>)}</select></Field><Field label="Start (optional)" name="start_at" type="datetime-local" /><Field label="End (optional)" name="end_at" type="datetime-local" /></>}<Field label="Reason" name="reason" required /><button>Save definition</button></form></>;
}
