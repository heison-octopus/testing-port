import React, { useState, useEffect } from 'react';
import { api } from './api';
import Field from './components/Field';
import Workspace from './pages/Workspace';
import People from './pages/People';
import Catalogue from './pages/Catalogue';
import Audit from './pages/Audit';
const links = [['/workspace', 'Workspace'], ['/admin/people', 'People & assignments'], ['/admin/definitions', 'School definitions'], ['/admin/roles', 'Roles'], ['/admin/audit', 'Audit history']];
export default function App() {
  const [session, setSession] = useState(null),
    [loading, setLoading] = useState(true),
    [path, setPath] = useState(location.pathname),
    [error, setError] = useState(''),
    [notice, setNotice] = useState('');
  function go(p) {
    history.pushState({}, '', p);
    setPath(p);
    setError('');
    setNotice('');
  }
  useEffect(() => {
    const listener = () => setPath(location.pathname);
    window.addEventListener('popstate', listener);
    api.session().then(setSession).catch(() => {}).finally(() => setLoading(false));
    return () => window.removeEventListener('popstate', listener);
  }, []);
  const run = async fn => {
    setError('');
    setNotice('');
    try {
      return await fn();
    } catch (e) {
      setError(e.message);
      return null;
    }
  };
  const refresh = async () => {
    const s = await api.session();
    setSession(s);
    return s;
  };
  if (loading) return <main>Loading session…</main>;
  if (!session) return <main className="login"><p className="eyebrow">BHSS / V4 · STAGE 1</p><h1>Make every student visible.</h1><p>Sign in to the foundation workspace.</p><form onSubmit={e => {
      e.preventDefault();
      const body = Object.fromEntries(new FormData(e.currentTarget));
      run(async () => {
        setSession(await api.login(body));
        go('/workspace');
      });
    }}><Field label="Email" name="email" type="email" defaultValue="admin@a.demo" required /><Field label="Password" name="password" type="password" required /><button>Sign in</button></form>{error && <p role="alert">{error}</p>}<aside className="note">Synthetic fixtures: admin, teacher, student or denied @a.demo; use @b.demo for School B. Password: <code>demo-stage1</code>. This is a working layout, pending product design.</aside></main>;
  const manage = session.actions.includes('manage');
  return <><header><div><strong>BHSS</strong><span> V4 / Foundation</span></div><div>{session.user.display_name} · School {session.user.school_id.toUpperCase()} <button onClick={() => run(async () => {
          await api.logout();
          setSession(null);
          go('/login');
        })}>Sign out</button></div></header><div className="shell"><nav aria-label="Main navigation">{links.filter(([p]) => manage || p === '/workspace').map(([p, l]) => <a href={p} key={p} aria-current={path === p ? 'page' : undefined} onClick={e => {
          e.preventDefault();
          go(p);
        }}>{l}</a>)}<p className="muted">Stage 1<br />Working layout<br />Synthetic data</p></nav><main><div className="page-heading"><p className="eyebrow">SCHOOL {session.user.school_id.toUpperCase()} / FOUNDATION</p><button onClick={() => run(async () => {
            await refresh();
            setNotice('Access refreshed');
          })}>Refresh access</button></div>{error && <p role="alert">{error}</p>}{notice && <p role="status">{notice}</p>}{path.startsWith('/admin') && !manage ? <><h1>Access denied</h1><p>Your current assignments do not allow administration.</p></> : path === '/admin/people' ? <People run={run} notify={setNotice} /> : path === '/admin/roles' ? <Catalogue kind="roles" run={run} notify={setNotice} /> : path === '/admin/definitions' ? <Catalogue kind="school-definitions" run={run} notify={setNotice} /> : path === '/admin/audit' ? <Audit run={run} /> : <Workspace session={session} run={run} />}</main></div></>;
}
