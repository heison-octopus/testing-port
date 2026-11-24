import React, { useState, useEffect, useRef } from 'react';
import { api } from './api';
import Field from './components/Field';
import Workspace from './pages/Workspace';
import People from './pages/People';
import Catalogue from './pages/Catalogue';
import Audit from './pages/Audit';
import Activities from './pages/Activities';
import Imports from './pages/Imports';
import RoleRefresh from './pages/RoleRefresh';
const links = [['/workspace', 'Workspace'], ['/activities', 'Activities'], ['/admin/people', 'Users & assignments'], ['/admin/imports', 'Assignments & imports'], ['/admin/role-refresh', 'Role transfer'], ['/admin/definitions', 'Academic structure'], ['/admin/roles', 'Roles'], ['/admin/audit', 'Audit history']];
const IDLE_WARNING_MS = 25 * 60 * 1000;
const IDLE_LOGOUT_MS = 30 * 60 * 1000;
const ACTIVE_REFRESH_MARGIN_MS = 2 * 60 * 1000;
export default function App() {
  const [session, setSession] = useState(null),
    [loading, setLoading] = useState(true),
    [path, setPath] = useState(location.pathname),
    [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [sessionWarning, setSessionWarning] = useState(false),
    [secondsRemaining, setSecondsRemaining] = useState(0),
    [developerMessage, setDeveloperMessage] = useState('');
  const lastActivityAt = useRef(Date.now()), accessExpiresAt = useRef(0), warningDeadline = useRef(0), refreshInFlight = useRef(false), developerMessageTimer = useRef(null);
  function go(p) {
    history.pushState({}, '', p);
    setPath(p);
    setError('');
    setNotice('');
  }
  useEffect(() => {
    const listener = () => setPath(location.pathname);
    window.addEventListener('popstate', listener);
    api.session().then(applySession).catch(() => {}).finally(() => setLoading(false));
    return () => window.removeEventListener('popstate', listener);
  }, []);
  function applySession(next, { announceRefresh = false } = {}) {
    setSession(next);
    accessExpiresAt.current = Date.now() + (next.accessExpiresInMs || 0);
    lastActivityAt.current = Date.now();
    warningDeadline.current = 0;
    setSessionWarning(false);
    setSecondsRemaining(0);
    if (announceRefresh && import.meta.env.DEV) {
      setDeveloperMessage('Developer: access token updated');
      window.clearTimeout(developerMessageTimer.current);
      developerMessageTimer.current = window.setTimeout(() => setDeveloperMessage(''), 3500);
    }
    return next;
  }
  async function refreshActiveSession() {
    if (refreshInFlight.current || !session) return;
    refreshInFlight.current = true;
    try {
      applySession(await api.refresh(), { announceRefresh: true });
    } catch (_error) {
      setSession(null);
      go('/login');
      setError('Your session has expired. Please sign in again.');
    } finally {
      refreshInFlight.current = false;
    }
  }
  function logoutForSafety(message = 'You were signed out after the session safety window expired.') {
    api.logout().catch(() => {});
    setSession(null);
    setSessionWarning(false);
    go('/login');
    setError(message);
  }
  useEffect(() => {
    if (!session) return undefined;
    const markActivity = () => {
      if (sessionWarning) return;
      lastActivityAt.current = Date.now();
      if (accessExpiresAt.current - Date.now() <= ACTIVE_REFRESH_MARGIN_MS) refreshActiveSession();
    };
    const events = ['pointerdown', 'keydown', 'touchstart'];
    events.forEach(event => window.addEventListener(event, markActivity, { passive: true }));
    const timer = window.setInterval(() => {
      const now = Date.now(), idleFor = now - lastActivityAt.current;
      if (idleFor >= IDLE_LOGOUT_MS) {
        logoutForSafety();
      } else if (idleFor >= IDLE_WARNING_MS && !sessionWarning) {
        warningDeadline.current = lastActivityAt.current + IDLE_LOGOUT_MS;
        setSecondsRemaining(Math.max(0, Math.ceil((warningDeadline.current - now) / 1000)));
        setSessionWarning(true);
      } else if (!sessionWarning && accessExpiresAt.current - now <= ACTIVE_REFRESH_MARGIN_MS) {
        refreshActiveSession();
      }
      if (sessionWarning) setSecondsRemaining(Math.max(0, Math.ceil((warningDeadline.current - now) / 1000)));
    }, 15000);
    return () => {
      events.forEach(event => window.removeEventListener(event, markActivity));
      window.clearInterval(timer);
    };
  }, [session, sessionWarning]);
  const run = async fn => {
    setError('');
    setNotice('');
    try {
      return await fn();
    } catch (e) {
      const safetyDeadline = warningDeadline.current || (lastActivityAt.current + IDLE_LOGOUT_MS);
      if (session && Date.now() >= safetyDeadline && /Unable to reach|session has expired|Failed to fetch/i.test(e.message)) {
        logoutForSafety();
        return null;
      }
      setError(e.message);
      return null;
    }
  };
  if (loading) return <main>Loading session…</main>;
  if (!session) return <main className="login"><h1>Make every student visible.</h1><p>Sign in to the foundation workspace.</p><form onSubmit={e => {
      e.preventDefault();
      const body = Object.fromEntries(new FormData(e.currentTarget));
      run(async () => {
        applySession(await api.login(body));
        go('/workspace');
      });
    }}><Field label="Email or in-school ID" name="identifier" defaultValue="admin@a.demo" required /><Field label="Password" name="password" type="password" required /><button>Sign in</button></form>{error && <p role="alert">{error}</p>}<aside className="note">Synthetic fixtures: admin, teacher, student or denied @a.demo; use @b.demo for School B. Password: <code>demo-stage1</code>. Sign in with email or the school-issued in-school ID.</aside></main>;
  const manage = session.actions.includes('people.read') || session.actions.includes('roles.read');
  return <><header><div><strong>BHSS</strong><span> V4 / Foundation</span></div><div>{session.user.display_name} · School {session.user.school_id.toUpperCase()} <button onClick={() => run(async () => {
          await api.logout();
          setSession(null);
          go('/login');
        })}>Sign out</button></div></header><div className="shell"><nav className="app-navigation" aria-label="Main navigation">{links.filter(([p]) => manage || p === '/workspace' || p === '/activities').map(([p, l]) => <a href={p} key={p} aria-current={path === p ? 'page' : undefined} onClick={e => {
          e.preventDefault();
          go(p);
        }}>{l}</a>)}</nav><main>{error && <p role="alert">{error}</p>}{notice && <p role="status">{notice}</p>}{developerMessage && import.meta.env.DEV && <div className="developer-message" role="status">{developerMessage}</div>}{path.startsWith('/admin') && !manage ? <><h1>Access denied</h1><p>Your current assignments do not allow administration.</p></> : path === '/activities' ? <Activities run={run} notify={setNotice} /> : path === '/admin/people' ? <People run={run} notify={setNotice} /> : path === '/admin/imports' ? <Imports run={run} notify={setNotice} /> : path === '/admin/role-refresh' ? <RoleRefresh run={run} notify={setNotice} /> : path === '/admin/roles' ? <Catalogue kind="roles" run={run} notify={setNotice} /> : path === '/admin/definitions' ? <Catalogue kind="school-definitions" run={run} notify={setNotice} /> : path === '/admin/audit' ? <Audit run={run} /> : <Workspace session={session} run={run} />}</main></div><footer className="app-footer">Stage 1 · Working layout · Synthetic data</footer>{sessionWarning && <div className="session-overlay" role="dialog" aria-modal="true" aria-labelledby="session-warning-title"><div className="session-dialog"><h2 id="session-warning-title">Your session is about to expire</h2><p>No activity was detected for a while. Confirm within {secondsRemaining} seconds to refresh your session and continue.</p><div><button className="primary" onClick={() => { if (Date.now() >= warningDeadline.current) { logoutForSafety(); return; } refreshActiveSession(); }}>Confirm and continue</button><button onClick={() => logoutForSafety('You chose to end the session.')}>Cancel and sign out</button></div></div></div>}</>;
}
