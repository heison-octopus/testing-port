import React, { useState } from 'react';
import { api } from '../api';
import Field from './Field';
import { confirmAction } from '../utils/confirmAction';

export default function SchoolTermBatch({ run, notify, refresh, close }) {
  const [year, setYear] = useState({ code: '', name: '', start_at: '', end_at: '' });
  const [terms, setTerms] = useState([1, 2, 3].map(n => ({ code: '', name: 'Term ' + n, start_at: '', end_at: '' })));
  const [busy, setBusy] = useState(false);
  function changeYear(key, value) {
    if (key === 'code') setTerms(rows => rows.map((row, i) => ({ ...row, code: !row.code || row.code === year.code + '-T' + (i + 1) ? value + '-T' + (i + 1) : row.code })));
    setYear(row => ({ ...row, [key]: value }));
  }
  function fields(row, prefix, change) {
    return [['code','Code'],['name','Name'],['start_at','Start'],['end_at','End']].map(([key, label]) => <Field key={key} label={prefix + ' ' + label.toLowerCase()} type={key.endsWith('_at') ? 'datetime-local' : 'text'} value={row[key]} required onChange={e => change(key, e.target.value)} />);
  }
  return <section><h2>Add school year (3 terms)</h2><p>Enter the school year and the actual dates of its three terms. All four records are saved together after confirmation.</p>
    <form className="school-year-package" onSubmit={e => {
      e.preventDefault();
      if (busy) return;
      const reason = new FormData(e.currentTarget).get('reason');
      if (!confirmAction('Create school year ' + year.name + ' (' + year.start_at + ' → ' + year.end_at + ') and three terms?\n' + terms.map(t => t.name + ': ' + t.start_at + ' → ' + t.end_at).join('\n'))) return;
      setBusy(true);
      run(async () => { try { await api.createSchoolTerms({ year, terms, reason }); await refresh(); close(); notify('School year and three terms created'); } finally { setBusy(false); } });
    }}>
      <fieldset><legend>School year</legend>{fields(year, 'School year', changeYear)}</fieldset>
      {terms.map((term, index) => <fieldset key={index}><legend>Term {index + 1}</legend>{fields(term, 'Term ' + (index + 1), (key, value) => setTerms(rows => rows.map((row, i) => i === index ? { ...row, [key]: value } : row)))}</fieldset>)}
      <Field label="Creation reason" name="reason" required />
      <div><button disabled={busy}>{busy ? 'Creating…' : 'Save school year and 3 terms'}</button> <button type="button" disabled={busy} onClick={close}>Cancel</button></div>
    </form>
  </section>;
}
