import { useEffect, useMemo, useState } from 'react';
import { ArrowSquareOut, Books, Eye, Sparkle, Warning } from '@phosphor-icons/react';
import { api, type Snapshot, type Student } from '../api/client';
import { Empty, PageHeader, SourceTags } from '../components/Layout';
import { portfolioWidgets } from '../config/portfolioWidgets';

const allSkills = ['Listening', 'Speaking', 'Problem solving', 'Creativity', 'Adapting', 'Planning', 'Leadership', 'Teamwork'];

export function Portfolio({ report }: { report: (error: unknown) => void }) {
  const [students, setStudents] = useState<Student[]>([]);
  const [student, setStudent] = useState('');
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => { api.students().then(data => { setStudents(data); setStudent(data[0]?.id || ''); }).catch(report); }, []);
  useEffect(() => { if (student) api.portfolio(student).then(setSnapshot).catch(report); }, [student]);
  const widgets = useMemo(() => portfolioWidgets.filter(widget => widget.visible).sort((a, b) => a.order - b.order), []);

  return <>
    <PageHeader eyebrow="OUTPUT · LEARNER PROFILE" title="Evidence-backed portfolio" description="A compact student view built from an approved snapshot—not from raw comments or hidden calculation logic." action={<label className="header-picker">Student<select value={student} onChange={event => setStudent(event.target.value)}>{students.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>} />
    {snapshot ? <>
      {snapshot.warnings?.map(warning => <div className="portfolio-warning" key={warning.id}><Warning size={22} weight="fill" /><div><b>Source warning</b><p>{warning.message}</p></div></div>)}
      <div className="portfolio-sheet">
        <aside className="profile-rail">
          <img className="profile-photo" src="/assets/chan-mei-fictional-profile.png" alt="Fictional student Chan Mei" />
          <span className="eyebrow">STUDENT PROFILE</span><h2>{snapshot.student?.name || 'Chan Mei'}</h2><p>Form 5 learner exploring music, thoughtful dialogue and possible university or work pathways.</p>
          <div className="profile-meta"><div><span>Reporting period</span><b>{snapshot.manifest.period || '2026–27 Term 1'}</b></div><div><span>Published</span><b>{new Date(snapshot.created_at).toLocaleDateString()}</b></div><div><span>Privacy view</span><b>{snapshot.privacy?.filtered ? 'Filtered' : 'Scoped'}</b></div></div>
          <img className="evidence-feature" src="/assets/piano-competition-fictional-evidence.png" alt="Fictional piano competition evidence" /><small>Fictional evidence image · piano competition</small>
          <div className="interest-block"><h3>My interests</h3><div className="source-tags"><span>Music</span><span>People</span><span>Future pathways</span></div><small>Illustrative only; official interest taxonomy remains open.</small></div>
        </aside>
        <main className="portfolio-body">
          <div className="portfolio-title"><div><Books size={24} weight="duotone" /><span>Learner profile</span></div><small>Frozen snapshot · {snapshot.manifest.policy.id} v{snapshot.manifest.policy.version}</small></div>
          {widgets.filter(widget => widget.key !== 'identity').map(widget => {
            if (widget.key === 'skills') return <section className="portfolio-widget" key={widget.key}><div className="widget-title"><span>{widget.title}</span><small>Skills Builder · POC-only conditions</small></div><div className="skill-grid">{allSkills.map(skill => {
              const result = snapshot.manifest.results.find(item => item.axis === skill);
              return <button key={skill} className={result ? 'skill-tile' : 'skill-tile missing'} onClick={() => result && setExpanded(expanded === skill ? null : skill)}><div className="level-ring"><b>{result?.level ?? '—'}</b>{result && <span>/16</span>}</div><div><b>{skill}</b><small>{result ? `${result.sourceTags?.length || 0} contributing sources` : 'Not enough evidence'}</small></div>{result && <Eye size={17} />}</button>;
            })}</div></section>;
            if (widget.key === 'learnerSummary') return <section className="portfolio-widget" key={widget.key}><div className="widget-title"><span>{widget.title}</span><small>Class-teacher approved</small></div><div className="learner-summary"><Sparkle size={24} weight="duotone" /><p>{snapshot.manifest.summary?.text || 'No approved summary was frozen in this earlier snapshot.'}</p></div><SourceTags tags={snapshot.manifest.summary?.sourceTags || []} /></section>;
            if (widget.key === 'evidenceStories') return <section className="portfolio-widget half" key={widget.key}><div className="widget-title"><span>{widget.title}</span></div><div className="story-list"><div><b>Piano competition</b><p>Preparation, creative performance and calm recovery after a missed passage.</p></div><div><b>Sensitive group dialogue</b><p>Careful questions and respectful listening across different views.</p></div><div><b>Future pathways</b><p>Positive comparison of university and employment options with next actions.</p></div></div></section>;
            if (widget.key === 'growthFocus') return <section className="portfolio-widget half growth-widget" key={widget.key}><div className="widget-title"><span>{widget.title}</span></div><h3>Earlier follow-through</h3><p>The missed prefect timetable is retained as a growth record. Mei repaired the impact kindly; her next step is earlier communication and a visible deadline check.</p><SourceTags tags={['Junior prefect duty coordination', 'teacher observation', 'peer review']} /></section>;
            if (widget.key === 'sourceTrace') return <section className="portfolio-widget" key={widget.key}><div className="widget-title"><span>{widget.title}</span><small>Human-readable sources, not raw IDs</small></div><div className="trace-list">{snapshot.manifest.results.map(result => <article className={expanded === result.axis ? 'open' : ''} key={result.axis}><button onClick={() => setExpanded(expanded === result.axis ? null : result.axis)}><div><b>{result.axis} · Step {result.level}</b><p>{result.statement || 'Evidence-backed outcome from the frozen snapshot.'}</p></div><ArrowSquareOut size={18} /></button>{expanded === result.axis && <div className="trace-detail"><small>CONTRIBUTING SOURCES</small>{result.sourceTags?.map((tag, index) => <div key={`${tag.activity}-${index}`}><span>{tag.activity}</span><span>{tag.type}</span></div>)}</div>}</article>)}</div></section>;
            return null;
          })}
        </main>
      </div>
    </> : <Empty>No published snapshot is currently available. Missing evidence is not a zero; assigned staff can publish after the class teacher approves the summary.</Empty>}
  </>;
}
