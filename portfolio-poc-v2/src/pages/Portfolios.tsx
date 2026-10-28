import { useEffect, useState } from 'react';
import { CheckSquare, FileText, PaperPlaneTilt, UserCircle } from '@phosphor-icons/react';
import { api } from '../api/client';
import type { PortfolioDetail, PortfolioRow, Session } from '../../shared/types';
import { Field, Notice, PageHeader, Status } from '../components/Layout';
import { useI18n } from '../i18n';

export function Portfolios({ session, report }: { session: Session; report: (error: unknown) => void }) {
  const { isChinese, text, codeLabel } = useI18n();
  const [rows, setRows] = useState<PortfolioRow[]>([]), [selectedId, setSelectedId] = useState(''), [detail, setDetail] = useState<PortfolioDetail | null>(null);
  const [intro, setIntro] = useState(''), [activityId, setActivityId] = useState('ACT-SPORT-001'), [activityText, setActivityText] = useState(''), [decisions, setDecisions] = useState<Record<string,string>>({}), [narrative, setNarrative] = useState(''), [reason, setReason] = useState('');
  async function loadRows() { try { const data = await api.portfolios(); setRows(data); const id = selectedId || data[0]?.student.id; if (id) { setSelectedId(id); setDetail(await api.portfolio(id)); } } catch (error) { report(error); } }
  async function select(id: string) { try { setSelectedId(id); setDetail(await api.portfolio(id)); } catch (error) { report(error); } }
  useEffect(() => { loadRows(); }, []);
  const latest = detail?.versions[0] || null;
  const canStudentEdit = session.userType === 'student' && session.id === selectedId;
  const canReview = session.capabilityKeys.includes('portfolio.review') && latest && ['student_submitted','class_teacher_review'].includes(latest.status);
  useEffect(() => { if (latest?.narrative) setNarrative(latest.narrative.teacher_edited_text || latest.narrative.generated_text || ''); }, [latest?.portfolio_working_version_id]);
  async function createDraft(event: React.FormEvent) { event.preventDefault(); try { await api.createDraft(selectedId, { selfIntroduction: intro, activityId, activityText, periodId: '2026-27-P1' }); setIntro(''); setActivityText(''); await loadRows(); } catch (error) { report(error); } }
  async function submit() { if (!latest) return; try { await api.submitPortfolio(latest.portfolio_working_version_id); await loadRows(); } catch (error) { report(error); } }
  async function review() { if (!latest) return; try { await api.reviewPortfolio(latest.portfolio_working_version_id, { decisions: latest.items.map(item => ({ itemId: item.portfolio_version_item_id, decision: decisions[item.portfolio_version_item_id] || 'included', reason: reason || text('Reviewed for the proposed Portfolio version.', '已覆核建議的 Portfolio 版本。') })), narrativeText: narrative, narrativeReason: reason, approverId: 'USR-ST-001', reason }); await loadRows(); } catch (error) { report(error); } }
  return <>
    <PageHeader kicker={text('WORKING VERSION · LATEST APPROVED VIEW', '工作版本 · 最新已批核檢視')} title={text('Portfolio versions', 'Portfolio 版本')} description={text('Students keep their newest work. Official views continue to resolve the latest published version until a successor completes review.', '學生會保留最新內容；後續版本完成覆核前，正式檢視仍會採用最近一次已發布版本。')} />
    <div className="portfolio-layout">
      <section className="student-list">{rows.map(row => <button key={row.student.id} className={selectedId === row.student.id ? 'student-row selected' : 'student-row'} onClick={() => select(row.student.id)}><UserCircle size={24} /><span><b>{isChinese ? row.student.nameZh : row.student.name}</b><small>{isChinese ? row.student.name : row.student.nameZh} · {text('latest', '最新')} v{row.latest?.version_number || '—'}</small></span><Status value={row.status} /></button>)}</section>
      <section className="portfolio-detail">{detail && latest ? <>
        <div className="detail-heading"><div><p className="mono">{latest.portfolio_working_version_id}</p><h2>{isChinese ? detail.student.nameZh : detail.student.name}</h2><span>{text('Latest working version', '最新工作版本')} {latest.version_number}</span></div><Status value={latest.status} /></div>
        <div className="official-banner">{detail.official ? <><CheckSquare size={21} /><div><b>{text('Official view: version', '正式檢視：版本')} {detail.official.version.version_number}</b><span>{text('Published snapshot', '已發布快照')} {detail.official.portfolio_snapshot_id}</span></div></> : <><FileText size={21} /><div><b>{text('No approved version', '未有已批核版本')}</b><span>{text('This student remains in the staff exception and escalation filter.', '此學生會繼續列於教職員例外及升級處理篩選名單。')}</span></div></>}</div>
        <h3>{text('Submitted content', '已提交內容')}</h3>
        <div className="portfolio-items">{latest.items.map(item => <article key={item.portfolio_version_item_id}><div><p>{codeLabel(item.section_key)}</p><Status value={item.class_teacher_decision} /></div><blockquote>{item.student_text || `${codeLabel(item.source_type)}: ${item.source_id}`}</blockquote><small>{codeLabel(item.authorship_origin)}{item.decision_reason ? ` · ${item.decision_reason}` : ''}</small>{canReview && <select value={decisions[item.portfolio_version_item_id] || item.class_teacher_decision} onChange={event => setDecisions({ ...decisions, [item.portfolio_version_item_id]: event.target.value })}><option value="included">{text('Include', '包括')}</option><option value="returned">{text('Return', '退回修改')}</option></select>}</article>)}</div>
        {latest.narrative && <div className="ai-panel"><p>{text('DUMMY GENERATED FIELD · NO AI PROVIDER', '模擬生成欄位 · 沒有 AI 服務供應商')}</p><b>{text('Me as a learner', '作為學習者的我')}</b><textarea value={narrative} disabled={!canReview} onChange={event => setNarrative(event.target.value)} /><small>{text('Source manifest', '來源清單')}：{latest.narrative.source_manifest_id}。{text('Generated, edited and final-approved text stay separate.', '生成文字、修改文字及最終已批核文字會分開保存。')}</small></div>}
        {canReview && <div className="review-strip"><Field label={text('Review and narrative-edit reason', '覆核及修改敘述原因')}><input value={reason} onChange={event => setReason(event.target.value)} /></Field><button className="primary" onClick={review}><PaperPlaneTilt size={17} />{text('Submit selected content to approver', '把所選內容提交批核')}</button></div>}
        {canStudentEdit && latest.status === 'draft' && <button className="primary" onClick={submit}><PaperPlaneTilt size={17} />{text('Submit latest working version', '提交最新工作版本')}</button>}
      </> : detail ? <Notice>{text('No working version exists for this student and period.', '此學生在這個時段沒有工作版本。')}</Notice> : <Notice>{text('Select a student Portfolio.', '請選擇學生 Portfolio。')}</Notice>}
      {canStudentEdit && <form className="draft-form" onSubmit={createDraft}><h3>{text('Create a successor draft', '建立後續草稿')}</h3><Field label={text('Self-introduction', '自我介紹')}><textarea required value={intro} onChange={event => setIntro(event.target.value)} /></Field><Field label={text('Memorable activity', '最難忘活動')}><select value={activityId} onChange={event => setActivityId(event.target.value)}><option value="ACT-SPORT-001">{text('Teamwork sports session', '團隊合作運動')}</option><option value="ACT-COMM-001">{text('Communication lesson', '溝通課堂')}</option><option value="ACT-SELF-001">{text('Understanding myself school trip', '認識自己學習旅程')}</option></select></Field><Field label={text('Why it was memorable', '難忘原因')}><textarea value={activityText} onChange={event => setActivityText(event.target.value)} /></Field><button className="primary">{text('Save new working version', '儲存新工作版本')}</button></form>}
      </section>
    </div>
  </>;
}
