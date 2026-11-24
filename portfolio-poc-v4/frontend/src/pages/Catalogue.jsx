import React, { useState, useEffect } from 'react';
import { api } from '../api';
import Field from '../components/Field';
import Table from '../components/Table';
import { confirmAction } from '../utils/confirmAction';
export default function Catalogue({
  kind,
  run,
  notify
}) {
  const [rows, setRows] = useState([]), [selectedRole, setSelectedRole] = useState(null), [permissions, setPermissions] = useState([]);
  const definitionLabels = { class: 'Class', period: 'Reporting period', year: 'Academic year', subject: 'Subject', group: 'Group', department: 'Department', position: 'Position', label: 'Label' };
  const permissionKeys = ['portfolio.read','portfolio.approve','activity.read','activity.create','activity.update','assignments.read','assignments.create','assignments.update','questionnaire.read','media.read','audit.read'];
  const roles = kind === 'roles';
  async function load() {
    setRows(await api.list(kind));
  }
  useEffect(() => {
    run(load);
  }, [kind]);
  return <><h1>{roles ? 'Roles' : 'Academic structure'}</h1><p>{roles ? 'Labels reference a retained backend permission profile.' : 'Manage the school’s academic structure: academic years, reporting periods, classes, subjects and related labels. This does not create a new school.'}</p>{!roles && <p className="note"><strong>Why these types share one screen:</strong> they are small, dated school-owned reference records used by activities and assignments. Their database/API resource remains <code>school_definitions</code>, but the administrator-facing label is Academic structure.</p>}<Table columns={['Code', 'Label', roles ? 'Permission profile' : 'Structure type', 'Permissions']} rows={rows} render={r => <tr key={r.id}><td>{r.code}</td><td>{r.name || r.name_en}<br/><span className="muted">{r.name_zh || ''}</span></td><td>{roles ? r.permission_profile_key : (definitionLabels[r.kind] || r.kind)}</td><td>{roles && <button onClick={() => run(async () => { setSelectedRole(r); setPermissions((await api.rolePermissions(r.id)).filter(p => p.status === 'active').map(p => p.permission_key)); })}>Edit mapping</button>}</td></tr>} />{roles && selectedRole && <section><h2>Permission mapping · {selectedRole.name_en} / {selectedRole.name_zh}</h2><p>Role labels and role IDs are stored together; permissions are explicit database mappings.</p><div className="grid">{permissionKeys.map(key => <label key={key}><input type="checkbox" checked={permissions.includes(key)} onChange={e => setPermissions(e.target.checked ? [...permissions, key] : permissions.filter(x => x !== key))}/> {key}</label>)}</div><button onClick={() => { if (!confirmAction(`Save permission mapping for ${selectedRole.name_en}?`)) return; run(async () => { await api.updateRolePermissions(selectedRole.id, { permission_keys: permissions, reason: 'Update role permission mapping' }); notify('Permission mapping saved'); }); }}>Save mapping</button></section>}<h2>{roles ? 'Add role' : 'Add school structure item'}</h2><form key={kind} onSubmit={e => {
      e.preventDefault();
      const form = e.currentTarget,
        body = Object.fromEntries(new FormData(form));
      if (!confirmAction(`Create this ${roles ? 'role' : 'school structure item'}?`)) return;
      run(async () => {
        await api.create(kind, body);
        form.reset();
        await load();
        notify('Definition saved');
      });
    }}><Field label="Code" name="code" required />{roles ? <><Field label="English label" name="name_en" required /><Field label="Chinese label" name="name_zh" required /><Field label="Permission profile"><select name="permission_profile_key">{['admin', 'teacher', 'student', 'denied'].map(x => <option key={x}>{x}</option>)}</select></Field></> : <><Field label="Name" name="name" required /><Field label="Structure type"><select name="kind">{Object.entries(definitionLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field><Field label="Parent academic year"><select name="parent_definition_id"><option value="">None</option>{rows.filter(r => r.kind === 'year').map(r => <option key={r.id} value={r.id}>{r.name}</option>)}</select></Field><Field label="Start (optional)" name="start_at" type="datetime-local" /><Field label="End (optional)" name="end_at" type="datetime-local" /></>}<Field label="Reason" name="reason" required /><button>{roles ? 'Save role' : 'Save structure item'}</button></form></>;
}
