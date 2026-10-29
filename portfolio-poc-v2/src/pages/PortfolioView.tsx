import { useEffect, useState } from 'react';
import { ChartPolar, FileText, LinkSimple, Quotes, UserCircle } from '@phosphor-icons/react';
import { api } from '../api/client';
import type { PortfolioRow, PortfolioViewDetail, Session } from '../../shared/types';
import { Notice, PageHeader, Status } from '../components/Layout';
import { useI18n } from '../i18n';

export function PortfolioView({ session, report, focusStudentId, onSelectStudent, onUnavailable }: { session: Session; report: (error: unknown) => void; focusStudentId?: string; onSelectStudent: (studentId: string) => void; onUnavailable: () => void }) {
  const { isChinese, text, codeLabel } = useI18n();
  const [rows, setRows] = useState<PortfolioRow[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [detail, setDetail] = useState<PortfolioViewDetail | null>(null);
  async function open(id: string, push = true) { try { const value = await api.portfolioView(id); setSelectedId(id); setDetail(value); if (push) onSelectStudent(id); } catch (error) { onUnavailable(); report(error); } }
  async function load() {
    try {
      const data = await api.portfolios(); setRows(data);
      const id = focusStudentId || (session.userType === 'student' ? session.id : data[0]?.student.id);
      if (!id || !data.some(row => row.student.id === id)) { onUnavailable(); return; }
      await open(id, false);
    } catch (error) { report(error); }
  }
  useEffect(() => { void load(); }, [focusStudentId, session.id]);
  const version = detail?.official?.version || null;
  return <>
    <PageHeader kicker={text('READ-ONLY · LATEST PUBLISHED SNAPSHOT', '只供查看 · 最新已發布快照')} title={text('Published Portfolio', '已發布 Portfolio')} description={text('This is the visualization and sharing view. It reads only the latest approved published snapshot and never exposes a newer draft.', '這是視覺化及分享檢視，只會讀取最新已批核並已發布的快照，不會顯示較新的草稿。')} />
    <div className="portfolio-layout published-only">
      <section className="student-list">{rows.map(row => <button key={row.student.id} className={selectedId === row.student.id ? 'student-row selected' : 'student-row'} onClick={() => void open(row.student.id)}><UserCircle size={24} /><span><b>{isChinese ? row.student.nameZh : row.student.name}</b><small>{isChinese ? row.student.name : row.student.nameZh}</small></span><Status value={row.officialSnapshot ? 'published' : 'no_approved_version'} /></button>)}</section>
      <section className="portfolio-detail">{detail ? <>
        <div className="detail-heading"><div><p className="mono">{detail.official?.portfolio_snapshot_id || text('NO PUBLISHED SNAPSHOT', '未有已發布快照')}</p><h2>{isChinese ? detail.student.nameZh : detail.student.name}</h2><span>{detail.periodId}</span></div><div className="record-status"><Status value={detail.official ? 'published' : 'no_approved_version'} /><button className="copy-link" onClick={() => void navigator.clipboard.writeText(`${window.location.origin}/portfolios/${encodeURIComponent(detail.student.id)}`)}><LinkSimple size={15} />{text('Copy Portfolio link', '複製 Portfolio 連結')}</button></div></div>
        {detail.official ? <>
          <section className="portfolio-visual-sheet"><header><div><ChartPolar size={24} /><span><b>{text('Universal skills', '通用技能')}</b><small>{text('Published results only · 16 steps per skill', '只顯示已發布結果 · 每項技能 16 階段')}</small></span></div><em>{detail.periodId}</em></header><div className="skill-visual-grid">{detail.skillSummary.map(skill => { const level = Number(skill.published_numeric_value || 0); return <article className={level ? '' : 'missing'} key={skill.axis_id}><div className="skill-level"><b>{level || '—'}</b><span>/16</span></div><div><b>{isChinese ? skill.name_zh : skill.name_en}</b><div className="level-track" aria-label={level ? `${level} of 16` : text('No published result', '未有已發布結果')}>{Array.from({ length: 16 }, (_, index) => <i className={index < level ? 'filled' : ''} key={index} />)}</div><small>{level ? `${skill.published_level_id} · ${skill.contributing_observation_ids || ''}` : text('No published evidence-backed result', '未有已發布並具佐證的結果')}</small></div></article>; })}</div></section>
          {version?.narrative && <section className="learner-statement"><Quotes size={26} weight="fill" /><div><p>{text('ME AS A LEARNER', '作為學習者的我')}</p><blockquote>{version.narrative.final_approved_text || version.narrative.teacher_edited_text || version.narrative.generated_text}</blockquote><small>{text('Approved source-linked narrative', '已批核並連繫來源的敘述')} · {version.narrative.source_manifest_id}</small></div></section>}
          <section className="published-sections"><h3>{text('Published Portfolio content', '已發布 Portfolio 內容')}</h3>{version?.items.filter(item => item.class_teacher_decision === 'included').map(item => <article key={item.portfolio_version_item_id}><span><b>{codeLabel(item.section_key)}</b><small>{codeLabel(item.authorship_origin)}</small></span><blockquote>{item.student_text || `${codeLabel(item.source_type)}: ${item.source_id}`}</blockquote></article>)}</section>
        </> : <div className="no-published-view"><FileText size={38} /><h3>{text('No approved published Portfolio yet', '尚未有已批核並發布的 Portfolio')}</h3><p>{text('The official view does not fall back to the student’s latest draft.', '正式檢視不會改為顯示學生的最新草稿。')}</p></div>}
      </> : <Notice>{text('Choose a Portfolio.', '請選擇 Portfolio。')}</Notice>}</section>
    </div>
  </>;
}
