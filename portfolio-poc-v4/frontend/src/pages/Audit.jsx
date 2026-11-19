import React, { useState, useEffect } from 'react';
import { api } from '../api';
import Field from '../components/Field';
import Table from '../components/Table';
export default function Audit({
  run
}) {
  const [events, setEvents] = useState([]),
    [snapshot, setSnapshot] = useState(null);
  useEffect(() => {
    run(async () => setEvents(await api.list('audit/events')));
  }, []);
  return <><h1>Audit history</h1><p>Immutable event snapshots. Credentials are excluded.</p><Table columns={['When', 'Entity', 'Actor', 'Reason', '']} rows={events} render={e => <tr key={e.id}><td>{e.occurred_at}</td><td>{e.entity_type}</td><td>{e.actor_id}</td><td>{e.reason}</td><td><button onClick={() => run(async () => setSnapshot(await api.event(e.id)))}>Inspect snapshot</button></td></tr>} />{snapshot && <section><h2>Snapshot · {snapshot.event.reason}</h2>{Object.entries(snapshot.records).map(([key, record]) => <details open key={key}><summary>{key}</summary><dl>{Object.entries(record).map(([field, value]) => <div key={field}><dt>{field}</dt><dd>{String(value ?? '—')}</dd></div>)}</dl></details>)}</section>}</>;
}
