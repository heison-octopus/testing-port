import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ArrowRight, CalendarDots, ChartPolar, CheckCircle, ClipboardText, Database, GitBranch, ShieldCheck, Sparkle, UsersThree } from '@phosphor-icons/react';
import { api } from './api/client';
import { Activities } from './pages/Activities';
import { AIDrafts } from './pages/AIDrafts';
import { Chatbox } from './pages/Chatbox';
import { Approvals } from './pages/Approvals';
import { PolicyLab } from './pages/PolicyLab';
import { PageCatalogue } from './pages/PageCatalogue';
import { ActivityResponses } from './pages/ActivityResponses';
import { DataImports } from './pages/DataImports';
import { Assessments } from './pages/Assessments';
import { MemorableActivities } from './pages/MemorableActivities';
import { PortfolioEditor } from './pages/PortfolioEditor';
import { PortfolioReview } from './pages/PortfolioReview';
import { PortfolioView } from './pages/PortfolioView';
import { StaffDirectory } from './pages/StaffDirectory';
import { Layout, Notice, PageHeader, type Page } from './components/Layout';
import type { Session } from '../shared/types';
import { I18nProvider, LanguageToggle, useI18n } from './i18n';
import './styles/main.css';

type DemoUser = { user_id: string; user_type: string; name_en: string; name_zh: string; staff_number?: string; student_number?: string };
type AppRoute = { page: Page; activityId: string; studentId: string; recipientId: string; assessmentStudentId: string; importBatchId: string };

function routeFromLocation(): AppRoute {
  const segments = window.location.pathname.split('/').filter(Boolean).map(decodeURIComponent);
  const routeMap: Record<string,Page> = { staff: 'staff', activities: 'activities', imports: 'imports', responses: 'responses', assessments: 'assessments', approvals: 'approvals', 'memorable-activities': 'memorable', 'portfolio-editor': 'portfolioEditor', 'portfolio-review': 'portfolioReview', portfolios: 'portfolios', ai: 'ai', chatbox: 'chatbox', policy: 'policy', catalogue: 'catalogue' };
  const page = segments[0] ? routeMap[segments[0]] || 'overview' : 'overview';
  return {
    page,
    activityId: ['activities','assessments'].includes(page) ? segments[1] || '' : '',
    studentId: ['portfolios','portfolioEditor','portfolioReview'].includes(page) ? segments[1] || '' : '',
    recipientId: page === 'responses' ? segments[1] || '' : '',
    assessmentStudentId: page === 'assessments' ? segments[2] || '' : '',
    importBatchId: page === 'imports' ? segments[1] || '' : '',
  };
}

function pathForPage(page: Page) {
  const paths: Record<Page,string> = { overview: '/', staff: '/staff', activities: '/activities', imports: '/imports', responses: '/responses', assessments: '/assessments', approvals: '/approvals', memorable: '/memorable-activities', portfolioEditor: '/portfolio-editor', portfolioReview: '/portfolio-review', portfolios: '/portfolios', ai: '/ai', chatbox: '/chatbox', policy: '/policy', catalogue: '/catalogue' };
  return paths[page];
}

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
      <p className="eyebrow">{text('SCHOOL GROWTH PORTFOLIO', '學生發展 PORTFOLIO')}</p>
      <h1>{text('Make every student visible.', '讓每一位學生被看見。')}</h1>
      <p>{text('Connect activities, reflection, evidence and human review so growth is visible beyond recalled classroom impressions.', '把活動、反思、佐證及人工覆核連繫起來，讓課堂印象以外的成長也能被看見。')}</p>
      <div className="login-flow"><span>{text('Input', '輸入')}</span><ArrowRight /><span>{text('Process', '處理')}</span><ArrowRight /><span>{text('Output', '輸出')}</span></div>
      <div className="login-principles"><span><CalendarDots size={20} />{text('Activities and evidence', '活動及佐證')}</span><span><UsersThree size={20} />{text('Named human review', '具名人工覆核')}</span><span><ChartPolar size={20} />{text('Traceable growth view', '可追溯成長檢視')}</span></div>
      <div className="ai-disabled"><Sparkle size={20} /><div><b>{text('Optional local LLM · human review required', '可選用本機 LLM · 必須人工覆核')}</b><span>{text('Only the Node server may call the configured local provider. Frozen inputs, candidates, decisions and edits remain auditable.', '只有 Node 伺服器可呼叫已設定的本機供應商；凍結輸入、候選內容、決定及修改均保留稽核記錄。')}</span></div></div>
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
  const [metrics, setMetrics] = useState({ activities: 0, awaiting: 0, published: 0, assignments: 0, official: 0 });
  const canOpenActivities = session.pageAccess.activities;
  const canOpenApprovals = session.pageAccess.approvals;
  const canOpenPortfolios = session.pageAccess.portfolios;
  const canOpenResponses = session.pageAccess.responses;
  const canOpenAssessments = session.pageAccess.assessments;
  useEffect(() => {
    let active = true;
    void Promise.all([
      canOpenActivities ? api.activities().catch(() => null) : Promise.resolve(null),
      canOpenApprovals ? api.approvals().catch(() => null) : Promise.resolve(null),
      canOpenPortfolios ? api.portfolios().catch(() => null) : Promise.resolve(null),
      canOpenResponses ? api.responseTasks().catch(() => null) : Promise.resolve(null),
      canOpenAssessments ? api.assessmentWorkspace().catch(() => null) : Promise.resolve(null),
    ]).then(([activityData, approvalData, portfolioData, responseData, assessmentData]) => {
      if (!active) return;
      const activities = activityData?.items || [];
      const assignments = approvalData?.assignments || [];
      const portfolios = portfolioData || [];
      setMetrics({
        activities: activities.length,
        awaiting: activities.filter(item => item.latestRevision.approval_status === 'pending_review').length,
        published: activities.filter(item => item.currentApprovedRevision?.publication_status === 'published').length,
        assignments: assignments.filter(item => ['assigned','in_review'].includes(item.status)).length
          + (responseData || []).filter(item => !['submitted','approved'].includes(item.latestSubmission?.content_status || item.status)).length
          + (assessmentData || []).reduce((count, item) => count + item.participants.length, 0),
        official: portfolios.filter(item => item.officialSnapshot).length,
      });
    });
    return () => { active = false; };
  }, [session.id, canOpenActivities, canOpenApprovals, canOpenPortfolios, canOpenResponses, canOpenAssessments]);
  return <>
    <PageHeader kicker={text('SCHOOL GROWTH PORTFOLIO', '學生發展 PORTFOLIO')} title={text(`Welcome, ${session.name}`, `${session.nameZh}，歡迎你`)} description={text('One connected route from activity intent to named human review and an official learner view.', '由活動意向、具名人工覆核，到正式學習者檢視的一條完整路徑。')} />
    <section className="overview-hero-v1"><div><p>{text('MAKE EVERY STUDENT VISIBLE', '讓每一位學生被看見')}</p><h2>{text('Turn lived experience into traceable growth.', '把真實經歷轉化為可追溯的成長。')}</h2><span>{text('The counts on this page come from the same records used by the activity, approval and Portfolio workspaces.', '本頁數字來自活動、批核及 Portfolio 工作區所使用的同一組紀錄。')}</span>{canOpenActivities && <button className="primary" onClick={() => setPage('activities')}>{text('Open activity flow', '開啟活動流程')}<ArrowRight size={16} /></button>}</div><div className="hero-visual"><span className="hero-orbit"><b>{metrics.published}</b><small>{text('published', '已發布')}</small></span><div><b>{metrics.activities}</b><span>{text('activity records visible in your scope', '項在你範圍內可見的活動紀錄')}</span></div></div></section>
    <section className="dashboard-flow">
      <article><span>INPUT</span><CalendarDots size={25} /><b>{metrics.activities} {text('activities', '項活動')}</b><p>{text('Owner, participants, VASK, dates, risk flags and exact form version.', '負責人、參與者、VASK、日期、風險標記及指定表格版本。')}</p>{canOpenActivities && <button onClick={() => setPage('activities')}>{text('Open records', '開啟紀錄')}<ArrowRight /></button>}</article>
      <article><span>PROCESS</span><ClipboardText size={25} /><b>{metrics.assignments} {text('need action', '項需要處理')}</b><p>{canOpenResponses ? text('Your own reflection tasks and explicitly assigned peer feedback.', '你的自我反思任務及明確分派的同儕互評。') : canOpenAssessments ? text('Self, peer and teacher sources stay separate until named assessment review.', '自評、同儕及老師來源會分開保存，直至具名評估覆核。') : text('Named reviewer and publisher decisions with reasons and due dates.', '具名覆核人及發布人的決定、原因及期限。')}</p>{canOpenResponses ? <button onClick={() => setPage('responses')}>{text('Open response tasks', '開啟回應任務')}<ArrowRight /></button> : canOpenAssessments ? <button onClick={() => setPage('assessments')}>{text('Open assessments', '開啟評估')}<ArrowRight /></button> : canOpenApprovals && <button onClick={() => setPage('approvals')}>{text('Open inbox', '開啟收件箱')}<ArrowRight /></button>}</article>
      <article><span>OUTPUT</span><ChartPolar size={25} /><b>{metrics.official} {text('official views', '項正式檢視')}</b><p>{text('Published snapshots and evidence-backed 1–16 skill results.', '已發布快照及具佐證的 1–16 技能結果。')}</p>{canOpenPortfolios && <button onClick={() => setPage('portfolios')}>{text('Open published Portfolio', '開啟已發布 Portfolio')}<ArrowRight /></button>}{session.pageAccess.portfolioEditor && <button onClick={() => setPage('portfolioEditor')}>{text('Edit working version', '編輯工作版本')}<ArrowRight /></button>}</article>
    </section>
    <section className="home-status"><div><CheckCircle size={22} /><span><b>{metrics.published}</b><small>{text('published activity records', '項已發布活動紀錄')}</small></span></div><div><UsersThree size={22} /><span><b>{metrics.awaiting}</b><small>{text('activities awaiting review', '項活動等待覆核')}</small></span></div><div><ShieldCheck size={22} /><span><b>{session.capabilityKeys.length}</b><small>{text('effective capability grants', '項生效功能權限')}</small></span></div></section>
    <div className="model-note"><div><b>{text('Creator', '建立者')}</b><span>{text('Owns the activity package', '負責活動資料套件')}</span></div><i>→</i><div><b>{text('Named reviewer', '具名覆核人')}</b><span>{text('Approves or returns with reason', '批核或具原因退回')}</span></div><i>→</i><div><b>{text('Named publisher', '具名發布人')}</b><span>{text('Releases the approved revision', '發布已批核修訂')}</span></div><i>→</i><div><b>{text('Student', '學生')}</b><span>{text('Sees only the official published record', '只查看正式已發布紀錄')}</span></div></div>
  </>;
}

function App() {
  const { isChinese, text } = useI18n();
  const [session, setSession] = useState<Session | null>(null);
  const initialRoute = routeFromLocation();
  const [page, setPage] = useState<Page>(initialRoute.page);
  const [error, setError] = useState('');
  const [activityFocus, setActivityFocus] = useState(initialRoute.activityId);
  const [portfolioFocus, setPortfolioFocus] = useState(initialRoute.studentId);
  const [responseFocus, setResponseFocus] = useState(initialRoute.recipientId);
  const [assessmentStudentFocus, setAssessmentStudentFocus] = useState(initialRoute.assessmentStudentId);
  const [importBatchFocus, setImportBatchFocus] = useState(initialRoute.importBatchId);
  useEffect(() => { api.session().then(setSession).catch(() => undefined); }, []);
  useEffect(() => {
    const onPopState = () => { const route = routeFromLocation(); setPage(route.page); setActivityFocus(route.activityId); setPortfolioFocus(route.studentId); setResponseFocus(route.recipientId); setAssessmentStudentFocus(route.assessmentStudentId); setImportBatchFocus(route.importBatchId); setError(''); };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);
  useEffect(() => {
    if (!session) return;
    const blocked = (page === 'activities' && !session.pageAccess.activities)
      || (page === 'imports' && !session.pageAccess.imports)
      || (page === 'responses' && !session.pageAccess.responses)
      || (page === 'assessments' && !session.pageAccess.assessments)
      || (page === 'approvals' && !session.pageAccess.approvals)
      || (page === 'memorable' && !session.pageAccess.memorable)
      || (page === 'portfolioEditor' && !session.pageAccess.portfolioEditor)
      || (page === 'portfolioReview' && !session.pageAccess.portfolioReview)
      || (page === 'portfolios' && !session.pageAccess.portfolios);
    if (!blocked) return;
    navigate('overview', true);
    setError(text('This account cannot open that workspace. You were returned to the overview.', '此帳戶未能開啟該工作區，現已返回概覽。'));
  }, [session?.id, page]);
  function navigate(value: Page, replace = false) {
    setError('');
    setPage(value);
    if (value !== 'activities') setActivityFocus('');
    if (!['portfolios','portfolioEditor','portfolioReview'].includes(value)) setPortfolioFocus('');
    if (value !== 'responses') setResponseFocus('');
    if (value !== 'assessments') setAssessmentStudentFocus('');
    if (value !== 'imports') setImportBatchFocus('');
    const url = new URL(window.location.href);
    url.pathname = pathForPage(value);
    if (replace) window.history.replaceState(null, '', url);
    else window.history.pushState(null, '', url);
  }
  function openActivity(activityId: string, replace = false) {
    setError(''); setPage('activities'); setActivityFocus(activityId); setPortfolioFocus(''); setResponseFocus(''); setAssessmentStudentFocus('');
    const url = new URL(window.location.href); url.pathname = `/activities/${encodeURIComponent(activityId)}`;
    if (replace) window.history.replaceState(null, '', url); else window.history.pushState(null, '', url);
  }
  function openPortfolio(studentId: string, replace = false) {
    setError(''); setPage('portfolios'); setPortfolioFocus(studentId); setActivityFocus(''); setResponseFocus(''); setAssessmentStudentFocus('');
    const url = new URL(window.location.href); url.pathname = `/portfolios/${encodeURIComponent(studentId)}`;
    if (replace) window.history.replaceState(null, '', url); else window.history.pushState(null, '', url);
  }
  function openResponse(recipientId: string, replace = false) {
    setError(''); setPage('responses'); setResponseFocus(recipientId); setActivityFocus(''); setPortfolioFocus(''); setAssessmentStudentFocus('');
    const url = new URL(window.location.href); url.pathname = `/responses/${encodeURIComponent(recipientId)}`;
    if (replace) window.history.replaceState(null, '', url); else window.history.pushState(null, '', url);
  }
  function openAssessment(activityId: string, studentId: string, replace = false) {
    setError(''); setPage('assessments'); setActivityFocus(activityId); setAssessmentStudentFocus(studentId); setPortfolioFocus(''); setResponseFocus('');
    const url = new URL(window.location.href); url.pathname = `/assessments/${encodeURIComponent(activityId)}/${encodeURIComponent(studentId)}`;
    if (replace) window.history.replaceState(null, '', url); else window.history.pushState(null, '', url);
  }
  function openPortfolioEditor(studentId: string, replace = false) {
    setError(''); setPage('portfolioEditor'); setPortfolioFocus(studentId); setActivityFocus(''); setResponseFocus(''); setAssessmentStudentFocus('');
    const url = new URL(window.location.href); url.pathname = `/portfolio-editor/${encodeURIComponent(studentId)}`;
    if (replace) window.history.replaceState(null, '', url); else window.history.pushState(null, '', url);
  }
  function openPortfolioReview(studentId: string, replace = false) {
    setError(''); setPage('portfolioReview'); setPortfolioFocus(studentId); setActivityFocus(''); setResponseFocus(''); setAssessmentStudentFocus('');
    const url = new URL(window.location.href); url.pathname = `/portfolio-review/${encodeURIComponent(studentId)}`;
    if (replace) window.history.replaceState(null, '', url); else window.history.pushState(null, '', url);
  }
  function openImport(batchId: string, replace = false) {
    setError(''); setPage('imports'); setImportBatchFocus(batchId); setActivityFocus(''); setPortfolioFocus(''); setResponseFocus(''); setAssessmentStudentFocus('');
    const url = new URL(window.location.href); url.pathname = `/imports/${encodeURIComponent(batchId)}`;
    if (replace) window.history.replaceState(null, '', url); else window.history.pushState(null, '', url);
  }
  function unavailable(kind: 'activity' | 'portfolio' | 'response' | 'assessment' | 'editor' | 'review' | 'import') {
    navigate('overview', true);
    const labels = {
      activity: text('That activity is not available to this account. You were returned to the overview.', '此帳戶未能存取該活動，現已返回概覽。'),
      portfolio: text('That published Portfolio is not available to this account. You were returned to the overview.', '此帳戶未能存取該已發布 Portfolio，現已返回概覽。'),
      response: text('That response task is not assigned to this account. You were returned to the overview.', '該回應任務未分派給此帳戶，現已返回概覽。'),
      assessment: text('That assessment record is outside this account’s named scope. You were returned to the overview.', '該評估紀錄不在此帳戶的具名範圍內，現已返回概覽。'),
      editor: text('That Portfolio editor is not owned by this account. You were returned to the overview.', '該 Portfolio 編輯器不屬於此帳戶，現已返回概覽。'),
      review: text('That Portfolio review is outside this account’s assigned scope. You were returned to the overview.', '該 Portfolio 覆核不在此帳戶的分派範圍內，現已返回概覽。'),
      import: text('That import batch is outside this account’s assigned scope. You were returned to the overview.', '該匯入批次不在此帳戶的分派範圍內，現已返回概覽。'),
    };
    setError(labels[kind]);
  }
  const report = (value: unknown) => setError(value instanceof Error ? (isChinese ? `${text('The operation could not be completed', '操作未能完成')}：${value.message}` : value.message) : text('The operation could not be completed', '操作未能完成'));
  async function signOut(preservePage = false) { try { await api.signOut(); } catch { /* Expired sessions still return to the picker. */ } setError(''); if (!preservePage) { setActivityFocus(''); setPortfolioFocus(''); setResponseFocus(''); setAssessmentStudentFocus(''); navigate('overview', true); } setSession(null); }
  if (!session) return <Login onSignedIn={value => { setError(''); setSession(value); }} />;
  return <Layout session={session} page={page} setPage={navigate} onSignOut={() => void signOut()}>
    {error && <div className="global-error"><span>{error}</span><button onClick={() => setError('')}>{text('Dismiss', '關閉')}</button></div>}
    {page === 'overview' && <Overview session={session} setPage={navigate} />}
    {page === 'staff' && <StaffDirectory report={report} />}
    {page === 'activities' && session.pageAccess.activities && <Activities report={report} focusActivityId={activityFocus} onSelectActivity={openActivity} onOpenImports={session.pageAccess.imports ? () => navigate('imports') : undefined} onUnavailable={() => unavailable('activity')} />}
    {page === 'activities' && !session.pageAccess.activities && <Overview session={session} setPage={navigate} />}
    {page === 'imports' && session.pageAccess.imports && <DataImports report={report} focusBatchId={importBatchFocus} onSelectBatch={openImport} onUnavailable={() => unavailable('import')} />}
    {page === 'responses' && session.pageAccess.responses && <ActivityResponses report={report} focusRecipientId={responseFocus} onSelectTask={openResponse} onUnavailable={() => unavailable('response')} />}
    {page === 'assessments' && session.pageAccess.assessments && <Assessments report={report} focusActivityId={activityFocus} focusStudentId={assessmentStudentFocus} onSelectAssessment={openAssessment} onUnavailable={() => unavailable('assessment')} />}
    {page === 'approvals' && <Approvals report={report} onOpenActivity={openActivity} onOpenPortfolio={session.pageAccess.portfolioReview ? openPortfolioReview : openPortfolio} />}
    {page === 'memorable' && session.pageAccess.memorable && <MemorableActivities report={report} />}
    {page === 'portfolioEditor' && session.pageAccess.portfolioEditor && <PortfolioEditor session={session} report={report} focusStudentId={portfolioFocus} onOpenView={openPortfolio} onUnavailable={() => unavailable('editor')} />}
    {page === 'portfolioReview' && session.pageAccess.portfolioReview && <PortfolioReview session={session} report={report} focusStudentId={portfolioFocus} onSelectStudent={openPortfolioReview} onUnavailable={() => unavailable('review')} />}
    {page === 'portfolios' && session.pageAccess.portfolios && <PortfolioView session={session} report={report} focusStudentId={portfolioFocus} onSelectStudent={openPortfolio} onUnavailable={() => unavailable('portfolio')} />}
    {page === 'portfolios' && !session.pageAccess.portfolios && <Overview session={session} setPage={navigate} />}
    {page === 'ai' && <AIDrafts report={report} />}
    {page === 'chatbox' && session.pageAccess.aiDrafts && <Chatbox userId={session.id} report={report} />}
    {page === 'chatbox' && !session.pageAccess.aiDrafts && <>
      <PageHeader kicker={text('ACCESS CONTROL · V2', '權限控制 · V2')} title={text('Chatbox access is blocked', '模型對話權限已被封鎖')} description={text('This account has not been assigned permission to use the model playground. The server will also reject direct chatbox API calls.', '此帳戶未獲分派使用模型 Playground 的權限；伺服器亦會拒絕直接呼叫模型對話 API。')} action={<button className="primary" onClick={() => void signOut(true)}>{text('Sign out and switch account', '登出並切換帳戶')}</button>} />
      <Notice tone="warning">{text('Choose an authorized teacher or staff account to continue. Your browser-local chat history remains isolated by account.', '請選擇已獲授權的老師或教職員帳戶繼續。瀏覽器內的對話紀錄會按帳戶分開保存。')}</Notice>
    </>}
    {page === 'policy' && <PolicyLab report={report} />}
    {page === 'catalogue' && <PageCatalogue />}
  </Layout>;
}

createRoot(document.getElementById('root')!).render(<I18nProvider><App /></I18nProvider>);
