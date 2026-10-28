import { CheckCircle, CircleHalf, Clock } from '@phosphor-icons/react';
import { Notice, PageHeader } from '../components/Layout';
import { useI18n } from '../i18n';

type Coverage = 'implemented' | 'partial' | 'recommended';
type Entry = { en: string; zh: string; coverage: Coverage; noteEn: string; noteZh: string };

const groups: { roleEn: string; roleZh: string; entries: Entry[] }[] = [
  { roleEn: 'Student', roleZh: '學生', entries: [
    { en: 'Home and outstanding tasks', zh: '首頁及待辦事項', coverage: 'partial', noteEn: 'Role-aware overview is present; detailed task feed is next.', noteZh: '已有按角色顯示的概覽；詳細待辦清單留待下一步。' },
    { en: 'My activities', zh: '我的活動', coverage: 'implemented', noteEn: 'Assignment-scoped activity list and details.', noteZh: '按分派範圍顯示活動清單及詳情。' },
    { en: 'Reflection and evidence submission', zh: '反思及佐證提交', coverage: 'recommended', noteEn: 'Recommended P1 page; not modelled in this v2 slice.', noteZh: '建議 P1 頁面；此 v2 範圍尚未建模。' },
    { en: 'External achievement and peer review', zh: '校外成就及同儕互評', coverage: 'recommended', noteEn: 'Recommended P1 pages.', noteZh: '建議 P1 頁面。' },
    { en: 'Proud Moments and My Portfolio', zh: 'Proud Moments 及我的 Portfolio', coverage: 'partial', noteEn: 'Portfolio working/official versions are implemented; Proud Moments is next.', noteZh: '已實作 Portfolio 工作／正式版本；Proud Moments 留待下一步。' },
    { en: 'Privacy and correction requests', zh: '私隱及資料更正要求', coverage: 'recommended', noteEn: 'Recommended P1 page.', noteZh: '建議 P1 頁面。' },
  ]},
  { roleEn: 'Teacher', roleZh: '老師', entries: [
    { en: 'Dashboard and assigned activities', zh: '老師首頁及獲分派活動', coverage: 'implemented', noteEn: 'Capability-driven navigation and scoped activities.', noteZh: '按功能權限產生導覽及活動範圍。' },
    { en: 'Activity workspace', zh: '活動工作區', coverage: 'partial', noteEn: 'Revision, owner, approval and correction paths are present; roster/VASK/form work remains.', noteZh: '已有修訂、負責人、批核及修改要求；名單、VASK 及表格工作仍待補上。' },
    { en: 'Bulk assessment and evidence review', zh: '批量評估及佐證覆核', coverage: 'recommended', noteEn: 'Recommended P1 pages.', noteZh: '建議 P1 頁面。' },
    { en: 'Feedback, step confirmation and peer assignment', zh: '回饋、能力階段確認及互評分派', coverage: 'recommended', noteEn: 'Recommended P1 pages.', noteZh: '建議 P1 頁面。' },
    { en: 'Assigned student summaries', zh: '所屬學生摘要', coverage: 'partial', noteEn: 'Portfolio review list is present; full evidence summary remains.', noteZh: '已有 Portfolio 覆核清單；完整佐證摘要仍待補上。' },
    { en: 'AI draft review', zh: 'AI 草稿覆核', coverage: 'implemented', noteEn: 'Dummy UI and provenance contract only; no provider execution.', noteZh: '只實作模擬介面及來源合約；不會執行供應商服務。' },
  ]},
  { roleEn: 'Authorized staff', roleZh: '獲授權職員', entries: [
    { en: 'Operational dashboard and approval inbox', zh: '營運總覽及批核收件箱', coverage: 'implemented', noteEn: 'Named assignments, decisions and escalation queue.', noteZh: '具名分派、決定及升級處理佇列。' },
    { en: 'Activity approval', zh: '活動批核', coverage: 'implemented', noteEn: 'Stable activity revisions with named approval.', noteZh: '穩定活動修訂及具名批核。' },
    { en: 'Form, evidence and assessment review', zh: '表格、佐證及評估覆核', coverage: 'recommended', noteEn: 'Recommended P1 pages.', noteZh: '建議 P1 頁面。' },
    { en: 'Portfolio preview, approval and publication', zh: 'Portfolio 預覽、批核及發布', coverage: 'implemented', noteEn: 'Working version, approved fallback and publication snapshot.', noteZh: '工作版本、已批核後備版本及發布快照。' },
    { en: 'Import quality and exports', zh: '匯入數據質素及匯出', coverage: 'recommended', noteEn: 'Recommended P1 pages.', noteZh: '建議 P1 頁面。' },
  ]},
  { roleEn: 'SchoolAdmin', roleZh: 'SchoolAdmin', entries: [
    { en: 'Staff, positions, roles, scopes and groups', zh: '教職員、職銜、角色、範圍及群組', coverage: 'implemented', noteEn: 'Search, effective assignments and policy preview are demonstrated.', noteZh: '已示範搜尋、有效分派及政策影響預覽。' },
    { en: 'Approval policy and escalation configuration', zh: '批核政策及升級處理設定', coverage: 'partial', noteEn: 'Policy data drives the POC; full configuration forms remain.', noteZh: 'POC 已由政策資料驅動；完整設定表格仍待補上。' },
    { en: 'Users, periods, sources and imports', zh: '使用者、時段、來源及匯入', coverage: 'recommended', noteEn: 'Recommended P1 pages.', noteZh: '建議 P1 頁面。' },
    { en: 'Consent, retention, security and audit', zh: '同意、保存期、保安及審計', coverage: 'recommended', noteEn: 'Recommended P1 pages.', noteZh: '建議 P1 頁面。' },
    { en: 'School and feature availability', zh: '學校及功能可用狀態', coverage: 'recommended', noteEn: 'Recommended P1 policy page.', noteZh: '建議 P1 政策頁面。' },
  ]},
];

export function PageCatalogue() {
  const { isChinese, text } = useI18n();
  const icon = (coverage: Coverage) => coverage === 'implemented' ? <CheckCircle size={18} /> : coverage === 'partial' ? <CircleHalf size={18} /> : <Clock size={18} />;
  const label = (coverage: Coverage) => coverage === 'implemented' ? text('In v2', 'v2 已實作') : coverage === 'partial' ? text('Partial', '部分實作') : text('Recommended next', '建議下一步');
  return <>
    <PageHeader kicker={text('SRS-12 · RECOMMENDED PAGE COVERAGE', 'SRS-12 · 建議頁面覆蓋')} title={text('POC page catalogue', 'POC 頁面目錄')} description={text('This view separates what Playground v2 demonstrates from the broader P1 page catalogue. A recommended page is not silently treated as implemented.', '此畫面分開列出 Playground v2 已示範內容及較完整的 P1 頁面目錄；建議頁面不會被默認為已完成。')} />
    <div className="coverage-legend"><span className="implemented"><CheckCircle size={16} />{text('In v2', 'v2 已實作')}</span><span className="partial"><CircleHalf size={16} />{text('Partial', '部分實作')}</span><span className="recommended"><Clock size={16} />{text('Recommended next', '建議下一步')}</span></div>
    <div className="coverage-groups">{groups.map(group => <section key={group.roleEn}><h2>{isChinese ? group.roleZh : group.roleEn}</h2>{group.entries.map(entry => <article key={entry.en}><div className={`coverage-state ${entry.coverage}`}>{icon(entry.coverage)}<span>{label(entry.coverage)}</span></div><div><b>{isChinese ? entry.zh : entry.en}</b><p>{isChinese ? entry.noteZh : entry.noteEn}</p></div></article>)}</section>)}</div>
    <Notice>{text('Sources: SRS-12 Page catalogue and role visibility; External lean MVP proposal; Internal system review and manday estimate.', '來源：SRS-12《頁面目錄及角色可見範圍》、《對外精簡MVP方案》及《內部系統檢視及人日估算》。')}</Notice>
  </>;
}
