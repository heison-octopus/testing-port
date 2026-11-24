import React, { useState, useEffect } from 'react';
import { api } from '../api';
import Field from '../components/Field';
import Table from '../components/Table';
import { confirmAction } from '../utils/confirmAction';
export default function People({
  run,
  notify
}) {
  const [people, setPeople] = useState([]),
    [roles, setRoles] = useState([]),
    [defs, setDefs] = useState([]),
    [assignments, setAssignments] = useState([]),
    [selected, setSelected] = useState(''),
    [kind, setKind] = useState('membership'),
    [peopleSearch, setPeopleSearch] = useState(''),
    [peopleKind, setPeopleKind] = useState(''),
    [peopleStatus, setPeopleStatus] = useState(''),
    [assignmentKind, setAssignmentKind] = useState(''),
    [assignmentStatus, setAssignmentStatus] = useState(''),
    [assignmentSearch, setAssignmentSearch] = useState('');
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
  const normalizedPeopleSearch = peopleSearch.trim().toLowerCase();
  const visiblePeople = people.filter(person => (!peopleKind || person.user_kind === peopleKind) && (!peopleStatus || person.status === peopleStatus) && (!normalizedPeopleSearch || `${person.id} ${person.in_school_id} ${person.display_name} ${person.email}`.toLowerCase().includes(normalizedPeopleSearch)));
  const selectedAssignments = assignments.filter(a => a.user_id === selected);
  const normalizedAssignmentSearch = assignmentSearch.trim().toLowerCase();
  const visibleAssignments = selectedAssignments.filter(a => (!assignmentKind || a.assignment_kind === assignmentKind) && (!assignmentStatus || a.status === assignmentStatus) && (!normalizedAssignmentSearch || `${a.id} ${a.role_id || ''} ${a.school_definition_id || ''} ${a.period_id || ''}`.toLowerCase().includes(normalizedAssignmentSearch)));
  return <><h1>Users & assignments</h1><p>Role membership and class membership are separate, dated assignments.</p><p className="note">Use <a href="/admin/imports">Assignments & imports</a> for batch CSV changes. Use <a href="/admin/role-refresh">Role transfer</a> for period role changes. Individual records can be created here; class and group definitions are created in Academic structure.</p><details><summary>Add user</summary><form onSubmit={e => {
        e.preventDefault();
        const form = e.currentTarget,
          body = Object.fromEntries(new FormData(form));
        if (!confirmAction(`Create ${body.user_kind} account for ${body.display_name}?`)) return;
        run(async () => {
          await api.create('people', body);
          form.reset();
          await load();
          notify('User created');
        });
      }}><Field label="In-school ID" name="in_school_id" required /><Field label="Display name" name="display_name" required /><Field label="Email" name="email" type="email" required /><Field label="User kind"><select name="user_kind"><option value="staff">Staff</option><option value="student">Student</option></select></Field><Field label="Initial password" name="password" type="password" minLength={10} required /><Field label="Reason" name="reason" required /><button>Create user</button></form></details><section className="card soft"><h2>User list filters</h2><div className="grid"><label>Search<input value={peopleSearch} onChange={e => setPeopleSearch(e.target.value)} placeholder="ID, school ID, name or email" /></label><label>Filter user kind<select value={peopleKind} onChange={e => setPeopleKind(e.target.value)}><option value="">All</option><option value="student">Student</option><option value="staff">Staff</option></select></label><label>Filter status<select value={peopleStatus} onChange={e => setPeopleStatus(e.target.value)}><option value="">All</option><option value="active">Active</option><option value="pending">Pending</option><option value="suspended">Suspended</option><option value="disabled">Disabled</option></select></label></div></section><Table columns={['Name', 'Email', 'Kind', '']} rows={visiblePeople} render={p => <tr key={p.id}><td>{p.display_name}<small className="muted" aria-hidden="true">{p.in_school_id}</small></td><td>{p.email}</td><td>{p.user_kind}</td><td><button onClick={() => setSelected(p.id)}>Assignments for {p.display_name}</button> {p.status === 'active' && <button className="danger" onClick={() => { if (!confirmAction(`Disable ${p.display_name}?`)) return; run(async () => { await api.disablePerson(p.id, 'Disabled from User list'); await load(); notify('User disabled'); }); }}>Disable user</button>}</td></tr>} />{selected && <section><h2>Assignments · {people.find(p => p.id === selected)?.display_name}</h2><div className="card soft"><h3>Assignment list filters</h3><div className="grid"><label>Search<input value={assignmentSearch} onChange={e => setAssignmentSearch(e.target.value)} placeholder="ID, role, class or period" /></label><label>Assignment kind<select value={assignmentKind} onChange={e => setAssignmentKind(e.target.value)}><option value="">All</option><option value="membership">Membership</option><option value="role">Role</option><option value="override">Permission override</option></select></label><label>Status<select value={assignmentStatus} onChange={e => setAssignmentStatus(e.target.value)}><option value="">All</option><option value="active">Active</option><option value="inactive">Inactive</option></select></label></div></div><Table columns={['Kind', 'Scope', 'Status / period', 'Action']} rows={visibleAssignments} render={a => <tr key={a.id}><td>{a.assignment_kind}</td><td>{a.role_id || a.school_definition_id || `${a.action_key}: ${a.effect}`}</td><td>{a.status} · {a.effective_from.slice(0, 10)} → {a.effective_until?.slice(0, 10) || 'open'}</td><td>{a.status === 'active' && <form className="inline" onSubmit={e => {
            e.preventDefault();
            const reason = new FormData(e.currentTarget).get('reason');
            if (!confirmAction(`End this ${a.assignment_kind} assignment? The history will be retained.`)) return;
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
        if (!confirmAction('Save this assignment for the selected user?')) return;
        run(async () => {
          await api.create('assignments', body);
          await load();
          notify('Assignment saved');
        });
      }}><Field label="Assignment kind"><select name="assignment_kind" value={kind} onChange={e => setKind(e.target.value)}><option value="membership">Class / group membership</option><option value="role">Role</option><option value="override">Explicit permission override</option></select></Field>{kind === 'role' ? <Field label="Role"><select name="role_id">{roles.map(r => <option key={r.id} value={r.id}>{r.name_en}</option>)}</select></Field> : kind === 'membership' ? <Field label="Class / group"><select name="school_definition_id">{defs.filter(d => ['class', 'group', 'position'].includes(d.kind)).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select></Field> : <><Field label="Action"><select name="action_key"><option>workspace</option><option>manage</option></select></Field><Field label="Effect"><select name="effect"><option>deny</option><option>allow</option></select></Field></>}<Field label="School term (uses its configured dates)"><select name="period_id"><option value="">Not specified</option>{defs.filter(d => d.kind === 'period').map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select></Field><Field label="Effective from" name="effective_from" type="datetime-local" defaultValue="2026-01-01T00:00" required /><Field label="Effective until (optional)" name="effective_until" type="datetime-local" /><Field label="Reason" name="reason" required /><button>Save assignment</button></form></section>}</>;
}
