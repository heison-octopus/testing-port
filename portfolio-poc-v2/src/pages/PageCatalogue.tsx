import { CheckCircle, CircleHalf, Clock } from '@phosphor-icons/react';
import { Notice, PageHeader } from '../components/Layout';
import { useI18n } from '../i18n';

type Coverage = 'implemented' | 'partial' | 'recommended';
type Entry = { en: string; zh: string; coverage: Coverage; noteEn: string; noteZh: string };

const groups: { roleEn: string; roleZh: string; entries: Entry[] }[] = [
  { roleEn: 'Student', roleZh: '學生', entries: [
    { en: 'Home and outstanding tasks', zh: '首頁及待辦事項', coverage: 'partial', noteEn: 'Live role-aware counts and separate response/curation task pages are present; one unified due and overdue feed remains.', noteZh: '已有按角色顯示的即時數字，以及獨立回應／整理任務頁；統一限期及逾期清單仍待補上。' },
    { en: 'My activities', zh: '我的活動', coverage: 'implemented', noteEn: 'Assignment-scoped activity list and details.', noteZh: '按分派範圍顯示活動清單及詳情。' },
    { en: 'Reflection and evidence submission', zh: '反思及佐證提交', coverage: 'partial', noteEn: 'Versioned self-response forms, submission and accepted text proof are implemented; media/file evidence upload is not.', noteZh: '已實作具版本的自我回應表格、提交及已接納文字佐證；尚未有媒體／檔案佐證上載。' },
    { en: 'External achievement and peer review', zh: '校外成就及同儕互評', coverage: 'partial', noteEn: 'Explicit named peer tasks and moderation are implemented; external achievements are not.', noteZh: '已實作明確具名同儕任務及監察；校外成就尚未實作。' },
    { en: 'Proud Moments and My Portfolio', zh: 'Proud Moments 及我的 Portfolio', coverage: 'implemented', noteEn: 'Memorable-activity curation, private Portfolio editing and a separate published view are implemented.', noteZh: '已實作最難忘活動整理、私人 Portfolio 編輯及獨立發布檢視。' },
    { en: 'Privacy and correction requests', zh: '私隱及資料更正要求', coverage: 'recommended', noteEn: 'Recommended P1 page.', noteZh: '建議 P1 頁面。' },
  ]},
  { roleEn: 'Teacher', roleZh: '老師', entries: [
    { en: 'Dashboard and assigned activities', zh: '老師首頁及獲分派活動', coverage: 'implemented', noteEn: 'Capability-driven navigation and scoped activities.', noteZh: '按功能權限產生導覽及活動範圍。' },
    { en: 'Activity workspace', zh: '活動工作區', coverage: 'implemented', noteEn: 'Complete package creation includes participants, VASK, one exact form, stable revisions, correction, named approval and separate publication.', noteZh: '完整資料套件包括參加者、VASK、指定表格、穩定修訂、修改要求、具名批核及獨立發布。' },
    { en: 'Bulk assessment and evidence review', zh: '批量評估及佐證覆核', coverage: 'partial', noteEn: 'Named per-student assessment, source moderation and proof-linked observation are implemented; bulk entry, media review and import remain.', noteZh: '已實作具名個別學生評估、來源監察及連繫佐證的觀察；批量輸入、媒體覆核及匯入仍待補上。' },
    { en: 'Feedback, step confirmation and peer assignment', zh: '回饋、能力階段確認及互評分派', coverage: 'partial', noteEn: 'Teacher feedback and explicit peer assignment are implemented; official step inclusion, confirmation and publication are not.', noteZh: '已實作教師回饋及明確同儕分派；正式階段納入、確認及發布尚未實作。' },
    { en: 'Assigned student summaries', zh: '所屬學生摘要', coverage: 'partial', noteEn: 'Portfolio review list is present; full evidence summary remains.', noteZh: '已有 Portfolio 覆核清單；完整佐證摘要仍待補上。' },
    { en: 'AI draft review', zh: 'AI 草稿覆核', coverage: 'implemented', noteEn: 'Frozen manifests, optional local generation, persisted candidates and human review; no OCR or publication authority.', noteZh: '提供凍結清單、可選用的本機生成、候選內容保存及人工覆核；不包括 OCR 或發布權限。' },
  ]},
  { roleEn: 'Authorized staff', roleZh: '獲授權職員', entries: [
    { en: 'Operational dashboard and approval inbox', zh: '營運總覽及批核收件箱', coverage: 'implemented', noteEn: 'Named assignments, decisions and escalation queue.', noteZh: '具名分派、決定及升級處理佇列。' },
    { en: 'Activity approval', zh: '活動批核', coverage: 'implemented', noteEn: 'Stable revisions use separate named approval and publication decisions with direct record links.', noteZh: '穩定修訂設有獨立具名批核及發布決定，並可直接開啟相關紀錄。' },
    { en: 'Form, evidence and assessment review', zh: '表格、佐證及評估覆核', coverage: 'partial', noteEn: 'Response moderation and source-separated teacher assessment are present; form-library, media-proof and official-result review remain.', noteZh: '已有回應監察及分開來源的教師評估；表格庫、媒體佐證及正式結果覆核仍待補上。' },
    { en: 'Portfolio preview, approval and publication', zh: 'Portfolio 預覽、批核及發布', coverage: 'implemented', noteEn: 'Student editor, class-teacher review, staff approval and read-only published snapshot are separate surfaces.', noteZh: '學生編輯、班主任覆核、職員批核及只供查看發布快照已分成不同畫面。' },
    { en: 'Import quality and exports', zh: '匯入數據質素及匯出', coverage: 'partial', noteEn: 'CSV/XLSX/allow-listed JSON roster staging, row resolution and provenance are implemented; remaining contracts and controlled exports remain.', noteZh: '已實作 CSV／XLSX／白名單 JSON 名冊暫存、逐列處理及來源紀錄；其他匯入格式及受控匯出仍待完成。' },
  ]},
  { roleEn: 'SchoolAdmin', roleZh: 'SchoolAdmin', entries: [
    { en: 'Staff, positions, roles, scopes and groups', zh: '教職員、職銜、角色、範圍及群組', coverage: 'implemented', noteEn: 'Search, effective assignments and policy preview are demonstrated.', noteZh: '已示範搜尋、有效分派及政策影響預覽。' },
    { en: 'Approval policy and escalation configuration', zh: '批核政策及升級處理設定', coverage: 'partial', noteEn: 'Policy data drives the POC; full configuration forms remain.', noteZh: 'POC 已由政策資料驅動；完整設定表格仍待補上。' },
    { en: 'Users, periods, sources and imports', zh: '使用者、時段、來源及匯入', coverage: 'partial', noteEn: 'Seed provenance and source availability controls are implemented; user/period imports and editable connector configuration remain.', noteZh: '已實作種子數據來源紀錄及來源可用狀態控制；使用者／時段匯入及可編輯連接器設定仍待完成。' },
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
