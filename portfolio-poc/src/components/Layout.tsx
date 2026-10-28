import {
  CalendarDots, AddressBook, Books, ChartPolar, ClipboardText, FileArrowUp, House,
  ListChecks, MagicWand, NotePencil, SignOut, SlidersHorizontal, UserFocus, UsersThree,
} from '@phosphor-icons/react';
import type { Session } from '../api/client';

export type Page = 'home' | 'activities' | 'activityEditor' | 'selfReview' | 'peerReview' | 'media' | 'forms' | 'review' | 'prompts' | 'portfolio' | 'admin';

const groups = [
  {
    label: 'INPUT',
    pages: [
      { id: 'activities', label: 'Activity list', icon: CalendarDots },
      { id: 'activityEditor', label: 'Create / update', icon: NotePencil },
      { id: 'selfReview', label: 'Self review', icon: UserFocus },
      { id: 'peerReview', label: 'Peer review', icon: UsersThree },
      { id: 'media', label: 'Evidence upload', icon: FileArrowUp },
    ],
  },
  {
    label: 'PROCESS',
    pages: [
      { id: 'forms', label: 'Input templates', icon: ClipboardText },
      { id: 'review', label: 'Evidence review', icon: ListChecks },
      { id: 'prompts', label: 'Prompt studio', icon: MagicWand },
    ],
  },
  { label: 'OUTPUT', pages: [{ id: 'portfolio', label: 'Learner portfolio', icon: ChartPolar }] },
  { label: 'POLICY', pages: [{ id: 'admin', label: 'School controls', icon: SlidersHorizontal }] },
] as const;

export function Layout({ session, page, setPage, signOut, children }: { session: Session; page: Page; setPage: (page: Page) => void; signOut: () => void; children: React.ReactNode }) {
  return <div className="shell">
    <aside className="sidebar">
      <button className="brand" onClick={() => setPage('home')} aria-label="Open overview">
        <span className="brand-mark"><Books size={24} weight="duotone" /></span>
        <span>Growth<small>PORTFOLIO</small></span>
      </button>
      <button className={page === 'home' ? 'nav active' : 'nav'} onClick={() => setPage('home')}><House size={18} />Overview</button>
      {groups.map(group => {
        const visible = group.pages.filter(item => session.capabilities[item.id]);
        if (!visible.length) return null;
        return <div className="nav-group" key={group.label}>
          <p className="nav-label">{group.label}</p>
          {visible.map(item => {
            const Icon = item.icon;
            return <button key={item.id} className={page === item.id ? 'nav active' : 'nav'} onClick={() => setPage(item.id)}><Icon size={18} />{item.label}</button>;
          })}
        </div>;
      })}
      <div className="sidebar-foot">Make every student visible<small>Fictional demonstration workspace</small></div>
    </aside>
    <main className="main">
      <header className="topbar">
        <div><b>BHSS demonstration</b><span className="divider">/</span><span>2026–27 · Term 1</span></div>
        <div className="account"><span className="role-tag">{session.role}</span><span>{session.name}</span><button className="icon-button" onClick={signOut} title="Switch account"><SignOut size={18} /></button></div>
      </header>
      <div className="content">{children}</div>
    </main>
  </div>;
}

export function PageHeader({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: React.ReactNode }) {
  return <div className="page-header"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{description}</p></div>{action}</div>;
}

export function Notice({ children, tone = 'open' }: { children: React.ReactNode; tone?: 'open' | 'ai' | 'info' | 'warning' }) {
  return <div className={`notice ${tone}`}>{children}</div>;
}

export function Empty({ children }: { children: React.ReactNode }) { return <div className="empty">{children}</div>; }

export function StatusPill({ status }: { status: string }) { return <span className={`pill status-${status.replaceAll('_', '-')}`}>{status.replaceAll('_', ' ')}</span>; }

export function Metric({ value, label }: { value: React.ReactNode; label: string }) {
  return <div className="metric"><strong>{value}</strong><span>{label}</span></div>;
}

export function SourceTags({ tags }: { tags: string[] }) {
  return <div className="source-tags"><AddressBook size={15} />{tags.map(tag => <span key={tag}>{tag}</span>)}</div>;
}
