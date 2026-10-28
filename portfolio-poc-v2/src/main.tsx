import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ArrowRight, Database, GitBranch, ShieldCheck, Sparkle } from '@phosphor-icons/react';
import { api } from './api/client';
import { Activities } from './pages/Activities';
import { AIDrafts } from './pages/AIDrafts';
import { Approvals } from './pages/Approvals';
import { PolicyLab } from './pages/PolicyLab';
import { PageCatalogue } from './pages/PageCatalogue';
import { Portfolios } from './pages/Portfolios';
import { StaffDirectory } from './pages/StaffDirectory';
import { Layout, Notice, PageHeader, type Page } from './components/Layout';
import type { Session } from '../shared/types';
import { I18nProvider, LanguageToggle, useI18n } from './i18n';
import './styles/main.css';

type DemoUser = { user_id: string; user_type: string; name_en: string; name_zh: string; staff_number?: string; student_number?: string };

function Login({ onSignedIn }: { onSignedIn: (session: Session) => void }) {
  const { isChinese, text } = useI18n();
  const [users, setUsers] = useState<DemoUser[]>([]);
  const [error, setError] = useState('');
  useEffect(() => { api.demoUsers().then(setUsers).catch(value => setError(String(value))); }, []);
  async function signIn(userId: string) {
    try { await api.signIn(userId); onSignedIn(await api.session()); }
    catch (value) { setError(value instanceof Error ? value.message : text('Unable to sign in', '未能登入')); }
  }
  const groups = [
    { label: text('School administration', '學校管理'), users: users.filter(user => user.user_id === 'USR-ADM-001') },
    { label: text('Staff approver', '教職員批核人'), users: users.filter(user => user.user_id === 'USR-ST-001') },
    { label: text('Teachers with stacked positions', '兼任多個職銜的老師'), users: users.filter(user => user.user_id.startsWith('USR-T-')) },
    { label: text('Students', '學生'), users: users.filter(user => user.user_type === 'student') },
  ];
  return <main className="login-shell">
    <section className="login-intro">
      <div className="login-tools"><a href={`http://127.0.0.1:3000?lang=${isChinese ? 'zh-HK' : 'en'}`}>← {text('Playground stages', 'Playground 版本')}</a><LanguageToggle /></div>
      <p className="eyebrow">BHSS · PLAYGROUND V2</p>
      <h1>{text('A schema-first sandbox for scoped school workflows.', '以資料架構為先的校本工作流程測試環境。')}</h1>
      <p>{text('Test positions, functional roles, subjects, departments, groups, named approvals, stable activity revisions and Portfolio publication without touching Playground v1.', '在不改動 Playground v1 的情況下，測試職銜、功能角色、科目、部門、群組、具名批核、穩定活動 ID 修訂及 Portfolio 發布流程。')}</p>
      <div className="login-principles"><span><Database size={20} />{text('Standalone SQLite', '獨立 SQLite 資料庫')}</span><span><GitBranch size={20} />{text('Additive migrations', '只新增的資料庫遷移')}</span><span><ShieldCheck size={20} />{text('Server-side scope checks', '伺服器端範圍檢查')}</span></div>
      <div className="ai-disabled"><Sparkle size={20} /><div><b>{text('AI execution intentionally disabled', '刻意停用 AI 執行路由')}</b><span>{text('Dummy drafts, sources and human-review states remain visible, but there is no provider call or generation endpoint.', '模擬草稿、來源及人工覆核狀態仍會顯示；系統不會呼叫服務供應商，亦沒有內容生成端點。')}</span></div></div>
    </section>
    <section className="account-picker">
      <header><p>{text('Choose a test identity', '選擇測試身份')}</p><h2>{text('See the same data through a different scope', '以不同權限範圍查看同一組資料')}</h2></header>
      {groups.map(group => group.users.length > 0 && <div className="account-group" key={group.label}><h3>{group.label}</h3>{group.users.map(user => <button key={user.user_id} onClick={() => signIn(user.user_id)}><span><b>{isChinese ? user.name_zh : user.name_en}</b><small>{isChinese ? user.name_en : user.name_zh} · {user.staff_number || user.student_number}</small></span><em>{text(user.user_type, user.user_type === 'student' ? '學生' : '教職員')}</em><ArrowRight size={18} /></button>)}</div>)}
      {error && <Notice tone="warning">{error}</Notice>}
    </section>
  </main>;
}

function Overview({ session, setPage }: { session: Session; setPage: (page: Page) => void }) {
  const { text } = useI18n();
  const canOpenActivities = session.userType === 'student' || session.capabilityKeys.some(key => key.startsWith('activity.'));
  const canOpenApprovals = session.roles.some(role => ['approval_function','publication_function','workflow_function'].includes(role.role_category));
  const canOpenPortfolios = session.userType === 'student' || session.capabilityKeys.some(key => key.startsWith('portfolio.'));
  return <>
    <PageHeader kicker={text('CORE DATA RELATIONSHIP · CSV CONTRACT 3.0', '核心資料關係 · CSV 格式 3.0')} title={text(`Welcome, ${session.name}`, `${session.nameZh}，歡迎你`)} description={text('This stage demonstrates the revised identity, scope, approval, activity-revision and Portfolio-version model as one coherent workflow.', '這個版本把修訂後的身份、範圍、批核、活動修訂及 Portfolio 版本模型整合成一套連貫工作流程。')} />
    <section className="overview-hero"><div><p>{text('Assigned authority', '已分派權限')}</p><h2>{text(`${session.capabilityKeys.length} capability grants`, `${session.capabilityKeys.length} 項功能權限`)}</h2><span>{text('Each action is still re-evaluated against its resource scope, group or user override, lifecycle state and named assignment.', '每次操作仍會按資源範圍、群組或個別使用者例外設定、生命週期狀態及具名分派重新檢查。')}</span></div><div className="capability-cloud">{session.capabilityKeys.map(key => <span key={key}>{key}</span>)}</div></section>
    <section className="concept-grid">
      {session.canSearchStaff && <button onClick={() => setPage('staff')}><span>01</span><b>{text('Position ≠ permission', '職銜 ≠ 權限')}</b><p>{text('Search class teacher, subject leader, principal, TA and other stacked titles independently from effective functional roles.', '可分開搜尋班主任、科主任、校長、教學助理及其他可兼任職銜，而不會把職銜當成功能角色。')}</p></button>}
      {canOpenActivities && <button onClick={() => setPage('activities')}><span>02</span><b>{text('Stable activity identity', '穩定活動身份')}</b><p>{text('Material edits create a successor revision. Existing evidence keeps the same activity ID while an approved revision remains live.', '實質修改會建立後續修訂；已有佐證繼續連繫同一活動 ID，現行已批核修訂亦可繼續使用。')}</p></button>}
      {canOpenApprovals && <button onClick={() => setPage('approvals')}><span>03</span><b>{text('Eligibility ≠ assignment', '合資格 ≠ 已分派')}</b><p>{text('A capable person is only a candidate. A named assignment, immutable decision and escalation record drive the workflow.', '具備權限只代表可以獲分派；流程仍須依靠具名分派、不可改寫的決定及升級處理紀錄。')}</p></button>}
      {canOpenPortfolios && <button onClick={() => setPage('portfolios')}><span>04</span><b>{text('Latest ≠ official', '最新版本 ≠ 正式版本')}</b><p>{text('Student work remains visible as the latest version while public output resolves only the latest published snapshot.', '學生可繼續查看最新內容；正式輸出則只採用最近一次已發布快照。')}</p></button>}
    </section>
    <div className="model-note"><div><b>{text('Job position', '職銜')}</b><span>{text('What a person is called in the school', '校內職務稱謂')}</span></div><i>+</i><div><b>{text('Functional role', '功能角色')}</b><span>{text('Which capability bundle is assigned', '獲分派哪一組功能權限')}</span></div><i>+</i><div><b>{text('Scope', '適用範圍')}</b><span>{text('Where that bundle is effective', '該組權限在哪裏生效')}</span></div><i>+</i><div><b>{text('Override', '例外設定')}</b><span>{text('School, group or user exception', '學校、群組或個別使用者例外')}</span></div></div>
  </>;
}

function App() {
  const { isChinese, text } = useI18n();
  const [session, setSession] = useState<Session | null>(null);
  const [page, setPage] = useState<Page>('overview');
  const [error, setError] = useState('');
  useEffect(() => { api.session().then(setSession).catch(() => undefined); }, []);
  const report = (value: unknown) => setError(value instanceof Error ? (isChinese ? `${text('The operation could not be completed', '操作未能完成')}：${value.message}` : value.message) : text('The operation could not be completed', '操作未能完成'));
  async function signOut() { try { await api.signOut(); } catch { /* Expired sessions still return to the picker. */ } setSession(null); setPage('overview'); }
  if (!session) return <Login onSignedIn={setSession} />;
  return <Layout session={session} page={page} setPage={setPage} onSignOut={signOut}>
    {error && <div className="global-error"><span>{error}</span><button onClick={() => setError('')}>{text('Dismiss', '關閉')}</button></div>}
    {page === 'overview' && <Overview session={session} setPage={setPage} />}
    {page === 'staff' && <StaffDirectory report={report} />}
    {page === 'activities' && <Activities report={report} />}
    {page === 'approvals' && <Approvals report={report} />}
    {page === 'portfolios' && <Portfolios session={session} report={report} />}
    {page === 'ai' && <AIDrafts />}
    {page === 'policy' && <PolicyLab report={report} />}
    {page === 'catalogue' && <PageCatalogue />}
  </Layout>;
}

createRoot(document.getElementById('root')!).render(<I18nProvider><App /></I18nProvider>);
