import React, { useState, useEffect } from 'react';
import { api } from '../api';
import Field from '../components/Field';
import Table from '../components/Table';
export default function Workspace({
  session,
  run
}) {
  const [data, setData] = useState(null);
  useEffect(() => {
    setData(null);
    run(async () => setData(await api.workspace()));
  }, [session]);
  return <><h1>Your workspace</h1><p>Current identity and effective assignments.</p>{data ? <><h2>{data.user.display_name}</h2><p>{data.user.email}</p><Table columns={['Assignment', 'Scope', 'Effective from', 'Until']} rows={data.assignments} render={a => <tr key={a.id}><td>{a.assignment_kind}</td><td>{a.role_id || a.school_definition_id || a.action_key}</td><td>{a.effective_from.slice(0, 10)}</td><td>{a.effective_until?.slice(0, 10) || 'Open'}</td></tr>} /></> : <p>No workspace access under the current assignment.</p>}</>;
}
