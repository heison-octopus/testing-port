import React, { useState, useEffect } from 'react';
import { api } from '../api';
import Field from '../components/Field';
import Table from '../components/Table';
export default function People({
  run,
  notify
}) {
  const [people, setPeople] = useState([]),
    [roles, setRoles] = useState([]),
    [defs, setDefs] = useState([]),
    [assignments, setAssignments] = useState([]),
    [selected, setSelected] = useState(''),
    [kind, setKind] = useState('membership');
  async function load() {
    const [p, r, d, a] = await Promise.all([api.list('people'), api.list('roles'), api.list('school-definitions'), api.list('assignments')]);
    setPeople(p);
    setRoles(r);
    setDefs(d);
    setAssignments(a);
  }
  useEffect(() => {
    run(load);
  }, []);
  return <><h1>People & assignments</h1><p>Role membership and class membership are separate, dated assignments.</p><details><summary>Add person</summary><form onSubmit={e => {
        e.preventDefault();
        const form = e.currentTarget,
          body = Object.fromEntries(new FormData(form));
        run(async () => {
          await api.create('people', body);
          form.reset();
          await load();
          notify('Person created');
        });
      }}><Field label="Display name" name="display_name" required /><Field label="Email" name="email" type="email" required /><Field label="User kind"><select name="user_kind"><option value="staff">Staff</option><option value="student">Student</option></select></Field><Field label="Initial password" name="password" type="password" minLength={10} required /><Field label="Reason" name="reason" required /><button>Create person</button></form></details><Table columns={['Name', 'Email', 'Kind', '']} rows={people} render={p => <tr key={p.id}><td>{p.display_name}</td><td>{p.email}</td><td>{p.user_kind}</td><td><button onClick={() => setSelected(p.id)}>Assignments for {p.display_name}</button></td></tr>} />{selected && <section><h2>Assignments · {people.find(p => p.id === selected)?.display_name}</h2><Table columns={['Kind', 'Scope', 'Status / period', 'Action']} rows={assignments.filter(a => a.user_id === selected)} render={a => <tr key={a.id}><td>{a.assignment_kind}</td><td>{a.role_id || a.school_definition_id || `${a.action_key}: ${a.effect}`}</td><td>{a.status} · {a.effective_from.slice(0, 10)} → {a.effective_until?.slice(0, 10) || 'open'}</td><td>{a.status === 'active' && <form className="inline" onSubmit={e => {
            e.preventDefault();
            const reason = new FormData(e.currentTarget).get('reason');
            run(async () => {
              await api.endAssignment(a.id, a.row_version, reason);
              await load();
              notify('Assignment ended; access changes on the next request');
            });
          }}><input name="reason" aria-label={`Reason to end ${a.id}`} placeholder="Reason" required /><button>End assignment</button></form>}</td></tr>} /><h3>Add assignment</h3><form onSubmit={e => {
        e.preventDefault();
        const body = {
          ...Object.fromEntries(new FormData(e.currentTarget)),
          user_id: selected
        };
        run(async () => {
          await api.create('assignments', body);
          await load();
          notify('Assignment saved');
        });
      }}><Field label="Assignment kind"><select name="assignment_kind" value={kind} onChange={e => setKind(e.target.value)}><option value="membership">Class / group membership</option><option value="role">Role</option><option value="override">Explicit permission override</option></select></Field>{kind === 'role' ? <Field label="Role"><select name="role_id">{roles.map(r => <option key={r.id} value={r.id}>{r.name_en}</option>)}</select></Field> : kind === 'membership' ? <Field label="Class / group"><select name="school_definition_id">{defs.filter(d => ['class', 'group', 'position'].includes(d.kind)).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select></Field> : <><Field label="Action"><select name="action_key"><option>workspace</option><option>manage</option></select></Field><Field label="Effect"><select name="effect"><option>deny</option><option>allow</option></select></Field></>}<Field label="Reporting period (uses its configured dates)"><select name="period_id"><option value="">Not specified</option>{defs.filter(d => d.kind === 'period').map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select></Field><Field label="Effective from" name="effective_from" type="datetime-local" defaultValue="2026-01-01T00:00" required /><Field label="Effective until (optional)" name="effective_until" type="datetime-local" /><Field label="Reason" name="reason" required /><button>Save assignment</button></form></section>}</>;
}
