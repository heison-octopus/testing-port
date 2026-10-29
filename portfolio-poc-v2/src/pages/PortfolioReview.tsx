import { useEffect, useState } from 'react';
import { PaperPlaneTilt, Quotes, UserCircle } from '@phosphor-icons/react';
import { api } from '../api/client';
import type { PortfolioDetail, PortfolioRow, Session } from '../../shared/types';
import { Field, Notice, PageHeader, Status } from '../components/Layout';
import { useI18n } from '../i18n';

export function PortfolioReview({ session, report, focusStudentId, onSelectStudent, onUnavailable }: { session: Session; report: (error: unknown) => void; focusStudentId?: string; onSelectStudent: (studentId: string) => void; onUnavailable: () => void }) {
  const { isChinese, text, codeLabel } = useI18n();
  const [rows, setRows] = useState<PortfolioRow[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [detail, setDetail] = useState<PortfolioDetail | null>(null);
  const [decisions, setDecisions] = useState<Record<string,string>>({});
  const [narrative, setNarrative] = useState('');
  const [reason, setReason] = useState('');
  async function open(id: string, push = true) { try { const value = await api.portfolio(id); setSelectedId(id); setDetail(value); setNarrative(value.versions[0]?.narrative?.teacher_edited_text || value.versions[0]?.narrative?.generated_text || ''); if (push) onSelectStudent(id); } catch (error) { report(error); } }
  async function load() { try { const data = await api.portfolios(); setRows(data); const id = focusStudentId || selectedId || data[0]?.student.id; if (focusStudentId && !data.some(row => row.student.id === focusStudentId)) { onUnavailable(); return; } if (id) await open(id, false); } catch (error) { report(error); } }
  useEffect(() => { void load(); }, [focusStudentId]);
  const latest = detail?.versions[0] || null;
  const canReview = session.capabilityKeys.includes('portfolio.review') && latest && ['student_submitted','class_teacher_review'].includes(latest.status);
  async function review() { if (!latest) return; try { await api.reviewPortfolio(latest.portfolio_working_version_id, { decisions: latest.items.map(item => ({ itemId: item.portfolio_version_item_id, decision: decisions[item.portfolio_version_item_id] || 'included', reason: reason || text('Reviewed for the proposed Portfolio version.', '已覆核建議的 Portfolio 版本。') })), narrativeText: narrative, narrativeReason: reason, approverId: 'USR-ST-001', reason }); await load(); } catch (error) { report(error); } }
  return <>
    <PageHeader kicker={text('CLASS-TEACHER REVIEW · FIELD OWNERSHIP', '班主任覆核 · 欄位擁有權')} title={text('Portfolio review', 'Portfolio 覆核')} description={text('Review the submitted working version, include or return items, and edit only the generated learner narrative. The published visualization is a separate read-only page.', '覆核已提交工作版本、包括或退回項目，並只可修改生成的學習者敘述。已發布視覺化屬另一個只供查看頁面。')} />
    <div className="portfolio-layout review-only">
      <section className="student-list">{rows.map(row => <button key={row.student.id} className={selectedId === row.student.id ? 'student-row selected' : 'student-row'} onClick={() => void open(row.student.id)}><UserCircle size={24} /><span><b>{isChinese ? row.student.nameZh : row.student.name}</b><small>{text('latest', '最新')} v{row.latest?.version_number || '—'}</small></span><Status value={row.latest?.status || row.status} /></button>)}</section>
      <section className="portfolio-detail">{latest ? <>
        <div className="detail-heading"><div><p className="mono">{latest.portfolio_working_version_id}</p><h2>{isChinese ? detail!.student.nameZh : detail!.student.name}</h2><span>{text('Student-submitted working version', '學生已提交工作版本')} {latest.version_number}</span></div><Status value={latest.status} /></div>
        <div className="portfolio-items">{latest.items.map(item => <article key={item.portfolio_version_item_id}><div><p>{codeLabel(item.section_key)}</p><Status value={item.class_teacher_decision} /></div><blockquote>{item.student_text || `${codeLabel(item.source_type)}: ${item.source_id}`}</blockquote><small>{codeLabel(item.authorship_origin)}{item.decision_reason ? ` · ${item.decision_reason}` : ''}</small>{canReview && <select value={decisions[item.portfolio_version_item_id] || item.class_teacher_decision} onChange={event => setDecisions({ ...decisions, [item.portfolio_version_item_id]: event.target.value })}><option value="included">{text('Include', '包括')}</option><option value="returned">{text('Return', '退回修改')}</option></select>}</article>)}</div>
        {latest.narrative && <div className="ai-panel"><p>{text('GENERATED FIELD · CONTROLLED EDIT', '生成欄位 · 受控修改')}</p><b><Quotes size={18} />{text('Me as a learner', '作為學習者的我')}</b><textarea value={narrative} disabled={!canReview} onChange={event => setNarrative(event.target.value)} /><small>{text('Generated, teacher-edited and final-approved text remain separate. Student-authored text above is not editable here.', '生成文字、老師修改文字及最終已批核文字會分開保存；上方學生撰寫文字不可在此修改。')}</small></div>}
        {canReview && <div className="review-strip"><Field label={text('Review and narrative-edit reason', '覆核及修改敘述原因')}><input value={reason} onChange={event => setReason(event.target.value)} /></Field><button className="primary" onClick={review}><PaperPlaneTilt size={17} />{text('Submit reviewed version', '提交已覆核版本')}</button></div>}
        {!canReview && <Notice>{text('This version is not awaiting a class-teacher review action for this account.', '此版本目前不等待此帳戶進行班主任覆核。')}</Notice>}
      </> : <Notice>{text('No working version exists for this student and period.', '此學生在這個時段沒有工作版本。')}</Notice>}</section>
    </div>
  </>;
}
