import { useEffect, useState } from 'react';
import { ArrowSquareOut, FileText, PaperPlaneTilt, Star } from '@phosphor-icons/react';
import { api } from '../api/client';
import type { PortfolioEditorDetail, Session } from '../../shared/types';
import { Field, Notice, PageHeader, Status } from '../components/Layout';
import { useI18n } from '../i18n';

export function PortfolioEditor({ session, report, focusStudentId, onUnavailable, onOpenView }: { session: Session; report: (error: unknown) => void; focusStudentId?: string; onUnavailable: () => void; onOpenView: (studentId: string) => void }) {
  const { isChinese, text, codeLabel } = useI18n();
  const studentId = focusStudentId || session.id;
  const [detail, setDetail] = useState<PortfolioEditorDetail | null>(null);
  const [intro, setIntro] = useState('');
  async function load() { try { if (studentId !== session.id) { onUnavailable(); return; } setDetail(await api.portfolioEditor(studentId)); } catch (error) { onUnavailable(); report(error); } }
  useEffect(() => { void load(); }, [studentId]);
  const latest = detail?.versions[0] || null;
  async function createDraft(event: React.FormEvent) { event.preventDefault(); try { setDetail(await api.createDraft(studentId, { selfIntroduction: intro, periodId: detail?.periodId || '2026-27-P1' })); setIntro(''); } catch (error) { report(error); } }
  async function submit() { if (!latest) return; try { await api.submitPortfolio(latest.portfolio_working_version_id); await load(); } catch (error) { report(error); } }
  return <>
    <PageHeader kicker={text('PRIVATE WORKING VERSION · STUDENT-OWNED FIELDS', '私人工作版本 · 學生擁有欄位')} title={text('Portfolio editor', 'Portfolio 編輯器')} description={text('Edit your self-introduction and assemble already-submitted memorable activities. The published Portfolio stays unchanged until class-teacher review, approval and publication finish.', '編輯你的自我介紹，並組合已提交的最難忘活動。班主任覆核、批核及發布完成前，已發布 Portfolio 不會改動。')} action={<button onClick={() => onOpenView(studentId)}><ArrowSquareOut size={17} />{text('Open published view', '開啟已發布檢視')}</button>} />
    {detail && <div className="portfolio-editor-layout">
      <section className="working-version-panel"><header><div><p>{latest?.portfolio_working_version_id || text('No working version', '未有工作版本')}</p><h2>{isChinese ? detail.student.nameZh : detail.student.name}</h2><span>{text('Latest working version', '最新工作版本')} {latest?.version_number || '—'}</span></div><Status value={latest?.status || 'not_started'} /></header>
        {latest ? <><div className="editor-items">{latest.items.map(item => <article key={item.portfolio_version_item_id}><span><b>{codeLabel(item.section_key)}</b><Status value={item.class_teacher_decision} /></span><blockquote>{item.student_text || item.source_id}</blockquote><small>{codeLabel(item.authorship_origin)}</small></article>)}</div>{latest.status === 'draft' ? <button className="primary submit-working" onClick={submit}><PaperPlaneTilt size={17} />{text('Submit working version', '提交工作版本')}</button> : <Notice tone="success">{text('This version is frozen for review. Start a successor draft if you want to continue working without changing the submitted version.', '此版本已凍結供覆核。如要繼續修改，請建立後續草稿；已提交版本不會被改寫。')}</Notice>}</> : <Notice>{text('No working version exists yet.', '尚未有工作版本。')}</Notice>}
      </section>
      <section className="portfolio-compose-panel">
        <div className="submitted-memorable"><header><Star size={22} /><div><h3>{text('Submitted memorable activities', '已提交的最難忘活動')}</h3><span>{text('Selection and reflection are managed on their own page.', '選擇及反思會在獨立頁面管理。')}</span></div></header>{detail.submittedMemorableActivities.map(item => <article key={item.selection_id}><b>{isChinese ? item.title_zh || item.title_en || item.source_id : item.title_en || item.source_id}</b><blockquote>{item.selection_reason}</blockquote><Status value={item.submission_status} /></article>)}{!detail.submittedMemorableActivities.length && <Notice tone="warning">{text('No memorable activity has been submitted. You can still create an introduction-only draft, or submit selections first.', '尚未提交最難忘活動。你仍可建立只有自我介紹的草稿，或先提交活動選擇。')}</Notice>}</div>
        <form className="portfolio-intro-form" onSubmit={createDraft}><header><FileText size={22} /><div><h3>{text('Create successor draft', '建立後續草稿')}</h3><span>{text('Only your student-authored introduction is editable here.', '本頁只可編輯由學生撰寫的自我介紹。')}</span></div></header><Field label={text('Self-introduction', '自我介紹')}><textarea required maxLength={4000} value={intro} onChange={event => setIntro(event.target.value)} /></Field><button className="primary">{text('Save new working version', '儲存新工作版本')}</button></form>
      </section>
    </div>}
  </>;
}
