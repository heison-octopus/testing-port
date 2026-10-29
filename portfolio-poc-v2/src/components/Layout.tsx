import { useEffect, useState } from 'react';
import { AddressBook, ArrowSquareOut, Brain, CalendarDots, CaretDown, CaretUp, ChatCircleDots, ChatCircleText, ClipboardText, Database, Eye, House, ListChecks, NotePencil, SignOut, SlidersHorizontal, Star, Student, UserCheck } from '@phosphor-icons/react';
import type { Session } from '../../shared/types';
import { LanguageToggle, useI18n } from '../i18n';

export type Page = 'overview' | 'staff' | 'activities' | 'imports' | 'responses' | 'assessments' | 'approvals' | 'memorable' | 'portfolioEditor' | 'portfolioReview' | 'portfolios' | 'ai' | 'chatbox' | 'policy' | 'catalogue';
const groups = [
  { label: '', pages: [{ id: 'overview', label: ['Overview', '概覽'], icon: House, visible: () => true }] },
  { label: 'INPUT', pages: [
    { id: 'activities', label: ['Activities', '活動'], icon: CalendarDots, visible: (session: Session) => session.pageAccess.activities },
    { id: 'imports', label: ['Data imports', '數據匯入'], icon: Database, visible: (session: Session) => session.pageAccess.imports },
    { id: 'responses', label: ['Activity responses', '活動回應'], icon: ChatCircleText, visible: (session: Session) => session.pageAccess.responses },
    { id: 'staff', label: ['Staff directory', '教職員名錄'], icon: AddressBook, visible: (session: Session) => session.pageAccess.staff },
  ] },
  { label: 'PROCESS', pages: [
    { id: 'assessments', label: ['Activity assessment', '活動評估'], icon: UserCheck, visible: (session: Session) => session.pageAccess.assessments },
    { id: 'approvals', label: ['Approval queues', '批核佇列'], icon: ClipboardText, visible: (session: Session) => session.pageAccess.approvals },
    { id: 'portfolioReview', label: ['Portfolio review', 'Portfolio 覆核'], icon: NotePencil, visible: (session: Session) => session.pageAccess.portfolioReview },
    { id: 'ai', label: ['AI drafts', 'AI 草稿'], icon: Brain, visible: (session: Session) => session.pageAccess.aiDrafts },
    { id: 'chatbox', label: ['Model chatbox', '模型對話'], icon: ChatCircleDots, visible: (session: Session) => session.pageAccess.aiDrafts },
  ] },
  { label: 'OUTPUT', pages: [
    { id: 'memorable', label: ['Memorable activities', '最難忘活動'], icon: Star, visible: (session: Session) => session.pageAccess.memorable },
    { id: 'portfolioEditor', label: ['Portfolio editor', 'Portfolio 編輯器'], icon: NotePencil, visible: (session: Session) => session.pageAccess.portfolioEditor },
    { id: 'portfolios', label: ['Published Portfolio', '已發布 Portfolio'], icon: Eye, visible: (session: Session) => session.pageAccess.portfolios },
  ] },
  { label: 'SYSTEM', pages: [
    { id: 'policy', label: ['Policy controls', '權限政策'], icon: SlidersHorizontal, visible: (session: Session) => session.pageAccess.policy },
    { id: 'catalogue', label: ['POC page catalogue', 'POC 頁面目錄'], icon: ListChecks, visible: (session: Session) => session.pageAccess.catalogue },
  ] },
] as const;

export function Layout({ session, page, setPage, onSignOut, children }: { session: Session; page: Page; setPage: (page: Page) => void; onSignOut: () => void; children: React.ReactNode }) {
  const { language, isChinese, text } = useI18n();
  const [topbarVisible, setTopbarVisible] = useState(true);
  useEffect(() => { setTopbarVisible(true); }, [page]);
  return <div className="app-shell">
    <aside className="sidebar">
      <button className="brand" onClick={() => setPage('overview')}><span className="brand-mark"><Student size={22} weight="fill" /></span><span><b>BHSS Portfolio</b><small>MAKE EVERY STUDENT VISIBLE</small></span></button>
      <nav>{groups.map(group => {
        const visible = group.pages.filter(item => item.visible(session));
        return visible.length ? <div className="nav-group" key={group.label || 'home'}>{group.label && <p>{group.label}</p>}{visible.map(item => { const Icon = item.icon; return <button key={item.id} className={page === item.id ? 'nav-link active' : 'nav-link'} onClick={() => setPage(item.id)}><Icon size={18} />{text(item.label[0], item.label[1])}</button>; })}</div> : null;
      })}</nav>
      <div className="sidebar-note"><b>{text('Portfolio v2 · live workflow', 'Portfolio v2 · 實際工作流程')}</b><span>{text('Named assignments, immutable decisions and official snapshots.', '具名分派、不可改寫決定及正式快照。')}</span><a className="stage-link" href={`http://127.0.0.1:3000?lang=${language}`}><ArrowSquareOut size={15} />{text('All playgrounds', '所有 Playground')}</a></div>
    </aside>
    <main className="main-panel">
      <header className={topbarVisible ? 'topbar' : 'topbar topbar-collapsed'}><div><span className="stage-pill">Playground v2</span><span>{text('CSV contract 3.0', 'CSV 格式 3.0')}</span><LanguageToggle compact /><button className="topbar-toggle" title={text('Hide top bar', '隱藏頂部列')} aria-label={text('Hide top bar', '隱藏頂部列')} onClick={() => setTopbarVisible(false)}><CaretUp size={15} />{text('Hide top bar', '隱藏頂部列')}</button></div><div className="account"><span><b>{isChinese ? session.nameZh : session.name}</b><small>{session.positions.map(item => isChinese ? item.name_zh : item.name_en).join(' · ') || text(session.userType, session.userType === 'student' ? '學生' : '教職員')}</small></span><button title={text('Switch account', '切換帳戶')} aria-label={text('Switch account', '切換帳戶')} onClick={onSignOut}><SignOut size={18} /></button></div></header>
      {!topbarVisible && <div className="topbar-reveal"><button aria-label={text('Show top bar', '顯示頂部列')} onClick={() => setTopbarVisible(true)}><CaretDown size={15} />{text('Show top bar', '顯示頂部列')}</button></div>}
      <div className="content">{children}</div>
    </main>
  </div>;
}

export function PageHeader({ kicker, title, description, action }: { kicker: string; title: string; description: string; action?: React.ReactNode }) { return <header className="page-header"><div><p>{kicker}</p><h1>{title}</h1><span>{description}</span></div>{action}</header>; }
export function Status({ value }: { value?: string }) { const { codeLabel } = useI18n(); return <span className={`status status-${(value || 'unknown').replaceAll('_','-')}`}>{codeLabel(value)}</span>; }
export function Notice({ children, tone = 'plain' }: { children: React.ReactNode; tone?: 'plain' | 'warning' | 'ai' | 'success' }) { return <div className={`notice ${tone}`}>{children}</div>; }
export function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="field"><span>{label}</span>{children}</label>; }
