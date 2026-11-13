import { useEffect, useState } from 'react';
import { FileText, LinkSimple, UserCircle } from '@phosphor-icons/react';
import { api } from '../api/client';
import type { PortfolioRow, PortfolioViewDetail, Session } from '../../shared/types';
import { Notice, PageHeader, Status } from '../components/Layout';
import { PortfolioTemplateRenderer } from '../components/PortfolioTemplateRenderer';
import { useI18n } from '../i18n';

export function PortfolioView({ session, report, focusStudentId, onSelectStudent, onUnavailable }: { session: Session; report: (error: unknown) => void; focusStudentId?: string; onSelectStudent: (studentId: string) => void; onUnavailable: () => void }) {
  const { isChinese, text } = useI18n();
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
          {version?.rubric_catalogue_id && <div className="portfolio-template-pin"><span>{text('Pinned rubric', '已鎖定 Rubric')} · {isChinese ? version.rubric_name_zh : version.rubric_name_en} · {version.rubric_version} · {version.rubric_catalogue_id}</span><em>{detail.periodId}</em></div>}
          {version && <PortfolioTemplateRenderer template={detail.template} version={version} skillSummary={detail.skillSummary} itemFilter={item => item.class_teacher_decision === 'included'} />}
        </> : <div className="no-published-view"><FileText size={38} /><h3>{text('No approved published Portfolio yet', '尚未有已批核並發布的 Portfolio')}</h3><p>{text('The official view does not fall back to the student’s latest draft.', '正式檢視不會改為顯示學生的最新草稿。')}</p></div>}
      </> : <Notice>{text('Choose a Portfolio.', '請選擇 Portfolio。')}</Notice>}</section>
    </div>
  </>;
}
