import { useEffect, useState } from 'react';
import { ArrowCounterClockwise, MagicWand, SealCheck } from '@phosphor-icons/react';
import { api, type GenerationAttempt, type PromptPreset, type Student } from '../api/client';
import { Empty, Notice, PageHeader, StatusPill } from '../components/Layout';

export function PromptStudio({ report }: { report: (error: unknown) => void }) {
  const [students, setStudents] = useState<Student[]>([]);
  const [student, setStudent] = useState('');
  const [presets, setPresets] = useState<PromptPreset[]>([]);
  const [attempts, setAttempts] = useState<GenerationAttempt[]>([]);
  const [preset, setPreset] = useState('');
  const [prompt, setPrompt] = useState('');
  const [unit, setUnit] = useState({ period: '', reportKey: '' });

  useEffect(() => { api.students().then(data => { setStudents(data); setStudent(data[0]?.id || ''); }).catch(report); }, []);
  const load = async () => {
    if (!student) return;
    try {
      const data = await api.prompts(student); setPresets(data.presets); setAttempts(data.attempts); setUnit(data.unit);
      const chosen = data.presets.find(item => item.id === preset) || data.presets[0];
      if (chosen) { setPreset(chosen.id); setPrompt(previous => previous || chosen.prompt); }
    } catch (error) { report(error); }
  };
  useEffect(() => { load(); }, [student]);

  function choosePreset(value: string) {
    setPreset(value); setPrompt(presets.find(item => item.id === value)?.prompt || '');
  }
  async function generate() {
    try { await api.generate(student, preset, prompt); await load(); } catch (error) { report(error); }
  }
  async function select(attempt: GenerationAttempt) {
    try { await api.selectAttempt(attempt.id); await load(); } catch (error) { report(error); }
  }

  return <>
    <PageHeader eyebrow="PORTFOLIO AI · SIMULATED" title="Prompt presets and generation history" description="Teachers can choose a school preset, inspect the full prompt, edit it and recover any earlier attempt." />
    <Notice tone="ai">No external LLM is called in this POC. Generation is deterministic and logged so the workflow can be reviewed without sending student data to a provider.</Notice>
    <div className="prompt-layout">
      <section className="prompt-editor">
        <div className="section-heading"><div><span>GENERATION UNIT</span><h2>{unit.period || 'Reporting period'} · {unit.reportKey || 'Portfolio report'}</h2></div></div>
        <label>Student<select value={student} onChange={event => { setStudent(event.target.value); setPrompt(''); }}>{students.map(item => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label>
        <div className="preset-grid">{presets.map(item => <button className={preset === item.id ? 'active' : ''} key={item.id} onClick={() => choosePreset(item.id)}><b>{item.name}</b><span>{item.focus}</span></button>)}</div>
        <label>Editable prompt<textarea className="prompt-textarea" value={prompt} onChange={event => setPrompt(event.target.value)} /></label>
        <div className="prompt-guards"><span>✓ approved snapshot inputs</span><span>✓ source tags retained</span><span>✓ raw names excluded from provider contract</span></div>
        <button className="primary" onClick={generate}><MagicWand size={17} />Generate simulated attempt</button>
      </section>
      <section className="attempt-history">
        <div className="section-heading"><div><span>VERSION LOG</span><h2>Generation attempts</h2></div><small>{attempts.length} versions</small></div>
        {attempts.length ? attempts.map((attempt, index) => <article key={attempt.id} className={attempt.selected ? 'attempt selected' : 'attempt'}>
          <div className="peer-card-head"><div><b>Version {attempts.length - index}</b><small>{new Date(attempt.created_at).toLocaleString()} · {attempt.period}</small></div>{attempt.selected ? <StatusPill status="selected" /> : <button className="text-button" onClick={() => select(attempt)}><ArrowCounterClockwise size={16} />Use this version</button>}</div>
          <p>{attempt.output}</p><details><summary>View prompt used</summary><pre>{attempt.prompt}</pre></details>{attempt.selected && <div className="selected-note"><SealCheck size={17} />Selected for teacher review</div>}
        </article>) : <Empty>No generated attempt yet. The first attempt will be recorded here.</Empty>}
      </section>
    </div>
  </>;
}
