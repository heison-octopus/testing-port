import { AddressBook, ArrowSquareOut, Brain, CalendarDots, ClipboardText, House, ListChecks, SignOut, SlidersHorizontal, Student } from '@phosphor-icons/react';
import type { Session } from '../../shared/types';
import { LanguageToggle, useI18n } from '../i18n';

export type Page = 'overview' | 'staff' | 'activities' | 'approvals' | 'portfolios' | 'ai' | 'policy' | 'catalogue';
const pages = [
  { id: 'overview', label: ['Overview', '概覽'], icon: House, visible: () => true },
  { id: 'staff', label: ['Staff directory', '教職員名錄'], icon: AddressBook, visible: (session: Session) => session.canSearchStaff },
  { id: 'activities', label: ['Activities', '活動'], icon: CalendarDots, visible: (session: Session) => session.userType === 'student' || session.capabilityKeys.some(key => key.startsWith('activity.')) },
  { id: 'approvals', label: ['Approval queues', '批核佇列'], icon: ClipboardText, visible: (session: Session) => session.roles.some(role => ['approval_function','publication_function','workflow_function'].includes(role.role_category)) },
  { id: 'portfolios', label: ['Portfolio versions', 'Portfolio 版本'], icon: Student, visible: (session: Session) => session.userType === 'student' || session.capabilityKeys.some(key => key.startsWith('portfolio.')) },
  { id: 'ai', label: ['AI drafts', 'AI 草稿'], icon: Brain, visible: (session: Session) => session.userType !== 'student' && (session.capabilityKeys.includes('portfolio.review') || session.roles.some(role => ['approval_function','publication_function'].includes(role.role_category))) },
  { id: 'policy', label: ['Policy controls', '權限政策'], icon: SlidersHorizontal, visible: (session: Session) => session.canManagePolicy },
  { id: 'catalogue', label: ['POC page catalogue', 'POC 頁面目錄'], icon: ListChecks, visible: (session: Session) => session.canManagePolicy },
] as const;

export function Layout({ session, page, setPage, onSignOut, children }: { session: Session; page: Page; setPage: (page: Page) => void; onSignOut: () => void; children: React.ReactNode }) {
  const { language, isChinese, text } = useI18n();
  return <div className="app-shell">
    <aside className="sidebar">
      <button className="brand" onClick={() => setPage('overview')}><span>BHSS</span><small>PLAYGROUND v2</small></button>
      <a className="stage-link" href={`http://127.0.0.1:3000?lang=${language}`}><ArrowSquareOut size={15} />{text('All playgrounds', '所有 Playground')}</a>
      <nav>{pages.filter(item => item.visible(session)).map(item => { const Icon = item.icon; return <button key={item.id} className={page === item.id ? 'nav-link active' : 'nav-link'} onClick={() => setPage(item.id)}><Icon size={18} />{text(item.label[0], item.label[1])}</button>; })}</nav>
      <div className="sidebar-note"><b>{text('Core-aligned stage', '依照 Core 的版本')}</b><span>{text('SQLite is isolated from v1. AI provider calls are disabled.', 'SQLite 與 v1 完全分開，亦不會呼叫任何 AI 服務供應商。')}</span></div>
    </aside>
    <main className="main-panel">
      <header className="topbar"><div><span className="stage-pill">Playground v2</span><span>{text('CSV contract 3.0', 'CSV 格式 3.0')}</span><LanguageToggle compact /></div><div className="account"><span><b>{isChinese ? session.nameZh : session.name}</b><small>{session.positions.map(item => isChinese ? item.name_zh : item.name_en).join(' · ') || text(session.userType, session.userType === 'student' ? '學生' : '教職員')}</small></span><button title={text('Switch account', '切換帳戶')} aria-label={text('Switch account', '切換帳戶')} onClick={onSignOut}><SignOut size={18} /></button></div></header>
      <div className="content">{children}</div>
    </main>
  </div>;
}

export function PageHeader({ kicker, title, description, action }: { kicker: string; title: string; description: string; action?: React.ReactNode }) { return <header className="page-header"><div><p>{kicker}</p><h1>{title}</h1><span>{description}</span></div>{action}</header>; }
export function Status({ value }: { value?: string }) { const { codeLabel } = useI18n(); return <span className={`status status-${(value || 'unknown').replaceAll('_','-')}`}>{codeLabel(value)}</span>; }
export function Notice({ children, tone = 'plain' }: { children: React.ReactNode; tone?: 'plain' | 'warning' | 'ai' | 'success' }) { return <div className={`notice ${tone}`}>{children}</div>; }
export function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="field"><span>{label}</span>{children}</label>; }
