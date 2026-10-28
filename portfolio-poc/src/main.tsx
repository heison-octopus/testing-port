import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ArrowRight, Books, CheckCircle, Eye, SignIn, Sparkle } from '@phosphor-icons/react';
import { api, type Session } from './api/client';
import { Layout, Notice, PageHeader, type Page } from './components/Layout';
import { Activities } from './pages/Activities';
import { ActivityEditor } from './pages/ActivityEditor';
import { SelfReview } from './pages/Reflections';
import { PeerReviews } from './pages/PeerReviews';
import { Media } from './pages/Media';
import { Review } from './pages/Review';
import { Portfolio } from './pages/Portfolio';
import { PromptStudio } from './pages/PromptStudio';
import { Forms, Admin } from './pages/Settings';
import './styles/main.css';

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [page, setPage] = useState<Page>('home');
  const [error, setError] = useState('');
  const report = (value: unknown) => setError(value instanceof Error ? value.message : 'Unexpected error');
  useEffect(() => { api.session().then(setSession).catch(() => undefined); }, []);
  async function login(id: string) { try { await api.signIn(id); setSession(await api.session()); setPage('home'); setError(''); } catch (value) { report(value); } }
  async function logout() { try { await api.signOut(); setSession(null); } catch (value) { report(value); } }

  if (!session) return <main className="login">
    <div className="login-intro"><div className="login-mark"><Books size={30} weight="duotone" /></div><div className="eyebrow">SCHOOL GROWTH PORTFOLIO</div><h1>Make every student visible.</h1><p>Follow fictional activity evidence from input, through human review, to a compact learner profile.</p><div className="login-flow"><span>Input</span><ArrowRight size={15} /><span>Process</span><ArrowRight size={15} /><span>Output</span></div></div>
    <section className="login-panel"><Notice tone="info">Local fictional accounts only. This is not production authentication and contains no real student data.</Notice>{error && <div className="error">{error}</div>}<h2>Choose a role</h2><div className="login-choices">{[
      ['student-1', 'Chan Mei', 'Portfolio subject and self review'],
      ['peer-10', 'Peer reviewer 10', 'Assigned peer input awaiting moderation'],
      ['teacher-1', 'Ms Chan', 'Class teacher and activity creator'],
      ['staff-1', 'Mr Wong', 'SuperTeacher / assigned staff reviewer'],
      ['admin-1', 'School administrator', 'Policy, privacy and module controls'],
    ].map(([id, label, detail]) => <button key={id} onClick={() => login(id)}><span><b>{label}</b><small>{detail}</small></span><SignIn size={19} /></button>)}</div></section>
  </main>;

  return <Layout session={session} page={page} setPage={setPage} signOut={logout}>
    {error && <div className="error">{error}<button className="text-button" onClick={() => setError('')}>Dismiss</button></div>}
    {page === 'home' && <>
      <PageHeader eyebrow="INPUT → PROCESS → OUTPUT" title={`Welcome, ${session.name}`} description="A compact workflow for activity evidence, accountable review and traceable learner growth." />
      <div className="home-hero"><div><span className="eyebrow">FICTIONAL LEARNER STORY</span><h2>One student. Many kinds of evidence.</h2><p>See how a piano competition, a sensitive group discussion, future-pathway planning and a prefect mistake can become a balanced, reviewable portfolio.</p><button className="primary" onClick={() => setPage('portfolio')}><Eye size={17} />Open learner profile</button></div><img src="/assets/piano-competition-fictional-evidence.png" alt="Fictional student performing piano" /></div>
      <div className="ipo-grid"><article><span>01 · INPUT</span><h3>Gather source records</h3><p>Activities, self review, assigned peer review and media remain separately attributed.</p><button onClick={() => setPage('activities')}>View activity list <ArrowRight size={15} /></button></article><article><span>02 · PROCESS</span><h3>Sanitize and review</h3><p>Staff moderate peers; the class teacher reviews proof and approves the learner summary.</p><button onClick={() => setPage('review')}>Open review gate <ArrowRight size={15} /></button></article><article><span>03 · OUTPUT</span><h3>Publish a frozen view</h3><p>Portfolio text stays concise while source tags preserve “which evidence contributed.”</p><button onClick={() => setPage('portfolio')}>See the output <ArrowRight size={15} /></button></article></div>
      <div className="home-status"><div><Sparkle size={22} weight="duotone" /><span><b>30 peer reviews</b><small>Ten fictional students across three activities</small></span></div><div><CheckCircle size={22} weight="duotone" /><span><b>Two-stage human review</b><small>Staff moderation + class teacher summary approval</small></span></div><div><Books size={22} weight="duotone" /><span><b>Versioned output</b><small>Period/report generation history and frozen snapshots</small></span></div></div>
      <Notice>Skills Builder text in this POC remains illustrative. Commercial use requires authorized wording or a school-supplied replacement rubric. VASK stays descriptive and separate from assessment.</Notice>
    </>}
    {page === 'activities' && <Activities session={session} report={report} />}
    {page === 'activityEditor' && <ActivityEditor session={session} report={report} />}
    {page === 'selfReview' && <SelfReview report={report} />}
    {page === 'peerReview' && <PeerReviews session={session} report={report} />}
    {page === 'media' && <Media session={session} report={report} />}
    {page === 'forms' && <Forms report={report} session={session} />}
    {page === 'review' && <Review session={session} report={report} />}
    {page === 'prompts' && <PromptStudio report={report} />}
    {page === 'portfolio' && <Portfolio report={report} />}
    {page === 'admin' && <Admin report={report} />}
  </Layout>;
}

createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);
