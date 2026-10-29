import { useEffect, useMemo, useState } from 'react';
import { AddressBook, ArrowClockwise, Books, ChartPolar, CheckCircle, CloudArrowDown, Database, DownloadSimple, FileArrowUp, FolderOpen, ListChecks, Prohibit, ShieldCheck, Student, Tag, UsersThree, Warning } from '@phosphor-icons/react';
import { api } from '../api/client';
import type { ImportBatchDetail, ImportRecord, ImportWorkspace, RubricImportPreview, RubricPackage, RubricWorkspace, Staff } from '../../shared/types';
import { Field, Notice, PageHeader, Status } from '../components/Layout';
import { useI18n } from '../i18n';

const emptyCorrection = { fieldName: 'student_identifier', afterValue: '', reason: '' };
type DataOperation = 'roster' | 'catalogue' | 'media' | 'users' | 'groups' | 'teachers' | 'students' | 'questions' | 'rubrics' | 'labels';

const domainDefinitions: { id: DataOperation; labelEn: string; labelZh: string; detailEn: string; detailZh: string; count: string; fields: string[]; template: string; icon: typeof Database }[] = [
  { id: 'catalogue', labelEn: 'Activity list', labelZh: '活動清單', detailEn: 'Stable activity IDs, lifecycle and successor revisions', detailZh: '穩定活動 ID、生命週期及後繼修訂', count: '5 records', fields: ['activity_id','title_en','operational_status','disabled'], template: '/templates/activities-new.csv', icon: ListChecks },
  { id: 'users', labelEn: 'User list', labelZh: '使用者清單', detailEn: 'School identities shared by staff and students', detailZh: '教職員及學生共用的校內身份', count: '7 users', fields: ['external_user_id','user_type','name_en','status','disabled'], template: '/templates/users-new.csv', icon: AddressBook },
  { id: 'groups', labelEn: 'User groups', labelZh: '使用者群組', detailEn: 'Classes, staff groups and effective membership', detailZh: '班別、教職員群組及生效成員關係', count: '4 groups', fields: ['group_code','group_type','effective_from','disabled'], template: '/templates/groups-new.csv', icon: UsersThree },
  { id: 'teachers', labelEn: 'Teacher updates', labelZh: '老師更新', detailEn: 'Staff number, position and functional assignments', detailZh: '教職員編號、職銜及功能分派', count: '3 teachers', fields: ['staff_number','position_code','group_code','disabled'], template: '/templates/teachers-new.csv', icon: AddressBook },
  { id: 'students', labelEn: 'Student updates', labelZh: '學生更新', detailEn: 'Student number, class history and consent metadata', detailZh: '學生編號、班別歷史及同意資料', count: '3 students', fields: ['student_number','class_code','media_consent_scope','disabled'], template: '/templates/students-new.csv', icon: Student },
  { id: 'roster', labelEn: 'Activity assignments', labelZh: '活動分派', detailEn: 'Planned participants and attendance state by activity', detailZh: '按活動記錄預定參與者及出席狀態', count: 'By activity', fields: ['activity_id','student_identifier','planned_attendance_status','disabled'], template: '/templates/activity-assignments-new.csv', icon: FileArrowUp },
  { id: 'questions', labelEn: 'Question bank', labelZh: '題庫', detailEn: 'Supplied source instrument: 166 questions across 10 constructs', detailZh: '所提供來源工具：10 個構念共 166 題', count: '166 questions', fields: ['question_id','source_construct','prompt_zh','ability_code','disabled'], template: '/templates/question-bank-new.csv', icon: Books },
  { id: 'rubrics', labelEn: 'Skill rubrics', labelZh: '技能 Rubric', detailEn: 'Versioned groups, skills, step definitions and optional score bands', detailZh: '有版本群組、技能、階段定義及可選分數範圍', count: '2 catalogues', fields: ['rubric_catalogue_id','selection_mode','score_out_of','status','disabled'], template: '', icon: ChartPolar },
  { id: 'labels', labelEn: 'Activity ability labels', labelZh: '活動能力標籤', detailEn: 'School-active labels offered to teachers during activity creation', detailZh: '老師建立活動時可使用的校本生效標籤', count: '1 active set', fields: ['label_code','name_en','catalogue_version','status','disabled'], template: '/templates/activity-labels-new.csv', icon: Tag },
  { id: 'media', labelEn: 'Media source paths', labelZh: '媒體來源路徑', detailEn: 'Activity-linked media locations and validation', detailZh: '活動連繫媒體位置及驗證', count: 'By activity', fields: ['activity_id','media_base_path','source_system','disabled'], template: '/templates/media-paths-new.csv', icon: FolderOpen },
];

export function DataImports({ report, focusBatchId, onSelectBatch, onUnavailable }: { report: (value: unknown) => void; focusBatchId?: string; onSelectBatch: (batchId: string) => void; onUnavailable: () => void }) {
  const { isChinese, text } = useI18n();
  const [workspace, setWorkspace] = useState<ImportWorkspace | null>(null);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [detail, setDetail] = useState<ImportBatchDetail | null>(null);
  const [activityId, setActivityId] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [catalogueFile, setCatalogueFile] = useState<File | null>(null);
  const [sourceId, setSourceId] = useState('SRC-TIME-INFINITY');
  const [sourceParentKey, setSourceParentKey] = useState('TI-ACT-8812');
  const [selectedRecordId, setSelectedRecordId] = useState('');
  const [correction, setCorrection] = useState(emptyCorrection);
  const [decisionReason, setDecisionReason] = useState('');
  const [commitReason, setCommitReason] = useState('Reviewed the staged rows, source custody and explicit changes before commit.');
  const [sourceReason, setSourceReason] = useState('Source availability changed by the authorized SchoolAdmin.');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [operation, setOperation] = useState<DataOperation>('roster');
  const [domainFile, setDomainFile] = useState<File | null>(null);
  const [pathPrefix, setPathPrefix] = useState('bhss_media/2026-27/');
  const [selectedPaths, setSelectedPaths] = useState<string[]>([]);
  const [pathPreview, setPathPreview] = useState<Record<string,string>>({});
  const [rubricWorkspace, setRubricWorkspace] = useState<RubricWorkspace | null>(null);
  const [rubricPackage, setRubricPackage] = useState<RubricPackage | null>(null);
  const [rubricFile, setRubricFile] = useState<File | null>(null);
  const [rubricPreview, setRubricPreview] = useState<RubricImportPreview | null>(null);
  const [rubricSourceId, setRubricSourceId] = useState('');
  const [rubricReason, setRubricReason] = useState('Validated successor rubric activated for future Portfolio versions.');

  async function loadWorkspace(preferredBatchId = focusBatchId) {
    const next = await api.imports();
    setWorkspace(next);
    setPathPreview(current => Object.keys(current).length ? current : Object.fromEntries(next.activities.map(item => [item.activity_id, `bhss_media/2026-27/${item.activity_id}/`])));
    if (!activityId && next.activities[0]) setActivityId(next.activities[0].activity_id);
    const batchId = preferredBatchId || detail?.import_batch_id || next.batches.find(item => item.target_entity_id)?.import_batch_id || next.batches[0]?.import_batch_id;
    if (batchId) {
      try { const selected = await api.importDetail(batchId); setDetail(selected); if (!focusBatchId) onSelectBatch(batchId); }
      catch (error) { if (focusBatchId) onUnavailable(); else throw error; }
    } else setDetail(null);
  }

  useEffect(() => {
    void loadWorkspace().catch(report);
    void api.staff(new URLSearchParams()).then(setStaff).catch(() => undefined);
    void api.rubrics().then(async value => { setRubricWorkspace(value); const first = value.active || value.catalogues[0]; if (first) setRubricPackage(await api.rubricPackage(first.rubric_catalogue_id)); }).catch(() => undefined);
  }, []);
  useEffect(() => { if (focusBatchId && focusBatchId !== detail?.import_batch_id) void api.importDetail(focusBatchId).then(setDetail).catch(onUnavailable); }, [focusBatchId]);

  async function work(action: () => Promise<ImportBatchDetail | ImportWorkspace>, success: string) {
    setBusy(true); setNotice('');
    try {
      const result = await action();
      if ('records' in result) { setDetail(result); onSelectBatch(result.import_batch_id); }
      await loadWorkspace('records' in result ? result.import_batch_id : detail?.import_batch_id);
      setNotice(success);
    } catch (error) { report(error); }
    finally { setBusy(false); }
  }

  async function upload(event: React.FormEvent) {
    event.preventDefault();
    if (!file || !activityId) return report(new Error(text('Choose an activity and one CSV or XLSX file.', '請選擇活動及一個 CSV 或 XLSX 檔案。')));
    await work(() => api.uploadImport(activityId, file), text('File parsed into a staged batch. No activity record changed yet.', '檔案已解析為暫存批次，活動紀錄尚未更改。'));
  }

  async function runConnector(event: React.FormEvent) {
    event.preventDefault();
    await work(() => api.runImportConnector(sourceId, { activityId, sourceParentKey }), text('Connector response staged through the same roster contract.', '連接器回應已透過同一名冊格式暫存。'));
  }

  async function uploadCatalogue(event: React.FormEvent) {
    event.preventDefault();
    if (!catalogueFile) return report(new Error(text('Choose one exported activity catalogue CSV or XLSX file.', '請選擇一個已匯出的活動目錄 CSV 或 XLSX 檔案。')));
    await work(() => api.uploadActivityCatalogue(catalogueFile), text('Activity changes staged as a delta. Missing rows did not change any activity.', '活動變更已按差異模式暫存；檔案中缺少的列不會更改任何活動。'));
  }

  async function exportCatalogue() {
    setBusy(true); setNotice('');
    try {
      const result = await api.exportActivityCatalogue();
      const url = URL.createObjectURL(new Blob([result.content], { type: 'text/csv;charset=utf-8' }));
      const anchor = document.createElement('a');
      anchor.href = url; anchor.download = result.fileName; anchor.click();
      URL.revokeObjectURL(url);
      setNotice(text('Editable activity catalogue exported. Original author is intentionally omitted.', '可編輯活動目錄已匯出；原始作者欄位按政策不包括在內。'));
    } catch (error) { report(error); }
    finally { setBusy(false); }
  }

  function exportMediaPaths() {
    const rows = [['activity_id','activity_title','media_base_path','media_count'], ...(workspace?.activities || []).filter(item => !selectedPaths.length || selectedPaths.includes(item.activity_id)).map((item, index) => [item.activity_id, item.title_en, pathPreview[item.activity_id] || '', String((index + 1) * 4)])];
    const content = rows.map(row => row.map(value => `"${String(value).replaceAll('"','""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url; anchor.download = 'activity-media-paths.csv'; anchor.click();
    URL.revokeObjectURL(url);
    setNotice(text('Media-path batch output exported. This does not modify stored source records.', '媒體路徑批次輸出已匯出；此操作不會修改已保存的來源紀錄。'));
  }

  function previewBatchPathUpdate() {
    if (!selectedPaths.length) return report(new Error(text('Select at least one activity path.', '請至少選擇一個活動路徑。')));
    const base = pathPrefix.endsWith('/') ? pathPrefix : `${pathPrefix}/`;
    setPathPreview(current => ({ ...current, ...Object.fromEntries(selectedPaths.map(id => [id, `${base}${id}/`])) }));
    setNotice(text('Path changes are shown as a design preview only. The current POC has no protected media-path mutation endpoint.', '路徑變更只作設計預覽；目前 POC 尚未有受保護的媒體路徑修改端點。'));
  }

  function exportDomain(domainId: DataOperation) {
    const definition = domainDefinitions.find(item => item.id === domainId)!;
    let rows: string[][] = [];
    if (domainId === 'users' || domainId === 'teachers' || domainId === 'students') {
      rows = staff.map(person => [person.id, person.staffNumber, person.name, person.nameZh, 'active', 'false']);
      rows.unshift(['user_id','school_identifier','name_en','name_zh','status','disabled']);
    } else if (domainId === 'catalogue' || domainId === 'media' || domainId === 'roster') {
      rows = (workspace?.activities || []).map(item => [item.activity_id, item.title_en, item.operational_status, pathPreview[item.activity_id] || '', 'false']);
      rows.unshift(['activity_id','title_en','operational_status','media_base_path','disabled']);
    } else {
      rows = [definition.fields, definition.fields.map(field => field === 'disabled' ? 'false' : `example_${field}`)];
    }
    const content = rows.map(row => row.map(value => `"${String(value ?? '').replaceAll('"','""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url; anchor.download = `${domainId}-all-records.csv`; anchor.click();
    URL.revokeObjectURL(url);
    setNotice(text(`Exported all currently visible ${definition.labelEn.toLowerCase()} records for editing. Stable IDs and disabled state are included.`, `已匯出目前可見的${definition.labelZh}紀錄供編輯，並包括穩定 ID 及 disabled 狀態。`));
  }

  function downloadWorkbook(result: { fileName: string; mimeType: string; contentBase64: string }) {
    const bytes = Uint8Array.from(atob(result.contentBase64), character => character.charCodeAt(0));
    const url = URL.createObjectURL(new Blob([bytes], { type: result.mimeType }));
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = result.fileName; anchor.click(); URL.revokeObjectURL(url);
  }

  async function exportRubrics(template = false) {
    setBusy(true); setNotice('');
    try {
      const result = template ? await api.rubricTemplate() : await api.exportRubrics();
      downloadWorkbook(result);
      setNotice(template ? text('New-rubric XLSX template downloaded with four linked sheets.', '已下載包含四個連繫工作表的新 Rubric XLSX 範本。') : text(`Exported ${result.counts?.catalogues || 0} real rubric catalogues with their groups, skills and step definitions.`, `已匯出 ${result.counts?.catalogues || 0} 個真實 Rubric 目錄及其群組、技能和階段定義。`));
    } catch (error) { report(error); } finally { setBusy(false); }
  }

  async function previewRubrics() {
    if (!rubricFile) return report(new Error(text('Choose one XLSX rubric package.', '請選擇一個 XLSX Rubric 套件。')));
    setBusy(true); setNotice('');
    try { const result = await api.previewRubrics(rubricFile); setRubricPreview(result); setRubricSourceId(result.sourceCatalogues.find(item => item.id === rubricWorkspace?.active?.rubric_catalogue_id)?.id || result.sourceCatalogues[0]?.id || ''); setNotice(result.status === 'ready' ? text('The rubric package is valid and may create a successor draft. Nothing active changed.', 'Rubric 套件驗證成功，可建立後繼草稿；生效版本尚未更改。') : text('The rubric package has validation errors. No successor was created.', 'Rubric 套件有驗證錯誤，並未建立後繼版本。')); }
    catch (error) { report(error); } finally { setBusy(false); }
  }

  async function createRubricSuccessor() {
    const source = rubricPreview?.sourceCatalogues.find(item => item.id === rubricSourceId); if (!rubricPreview || !source) return;
    setBusy(true);
    try { const value = await api.commitRubricSuccessor(rubricPreview.rubricImportDraftId, source.id); setRubricPackage(value); const workspace = await api.rubrics(); setRubricWorkspace(workspace); setNotice(text(`Successor draft ${value.catalogue.rubric_catalogue_id} created. It is not active.`, `已建立後繼草稿 ${value.catalogue.rubric_catalogue_id}；尚未生效。`)); }
    catch (error) { report(error); } finally { setBusy(false); }
  }

  async function activateRubric(id: string) {
    setBusy(true);
    try { const value = await api.activateRubric(id, rubricReason); setRubricWorkspace(value); setRubricPackage(await api.rubricPackage(id)); setNotice(text('The successor is active for future Portfolio generation. Existing Portfolio versions remain pinned to their original rubric.', '後繼版本現已供日後生成 Portfolio 使用；現有 Portfolio 版本仍固定連繫原有 Rubric。')); }
    catch (error) { report(error); } finally { setBusy(false); }
  }

  function stageGenericDomain() {
    const definition = domainDefinitions.find(item => item.id === operation)!;
    if (!domainFile) return report(new Error(text(`Choose a CSV or XLSX file for ${definition.labelEn}.`, `請為${definition.labelZh}選擇 CSV 或 XLSX 檔案。`)));
    setNotice(text(`${definition.labelEn} file selected for staged validation. This design surface does not bypass the protected API or write directly to SQLite.`, `${definition.labelZh}檔案已選擇作暫存驗證；此設計畫面不會繞過受保護 API，亦不會直接寫入 SQLite。`));
  }

  async function correct(event: React.FormEvent) {
    event.preventDefault();
    if (!detail || !selectedRecordId) return;
    await work(() => api.correctImportRecord(detail.import_batch_id, selectedRecordId, correction), text('Correction appended and the row revalidated.', '修正已新增，該列亦已重新驗證。'));
    setCorrection(emptyCorrection);
  }

  async function decide(record: ImportRecord, decision: 'exclude' | 'restore') {
    if (!detail) return;
    if (!decisionReason.trim()) return report(new Error(text('Enter a reason for this decision.', '請輸入此決定的原因。')));
    await work(() => api.decideImportRecord(detail.import_batch_id, record.import_record_id, { decision, reason: decisionReason }), decision === 'exclude' ? text('Row excluded without deleting its source history.', '該列已排除，來源歷史並無刪除。') : text('Row restored by a new audited decision.', '該列已透過新的可稽核決定恢復。'));
    setDecisionReason(''); setSelectedRecordId('');
  }

  const connector = workspace?.sources.find(item => item.source_system_id === sourceId);
  const selectedRecord = detail?.records.find(item => item.import_record_id === selectedRecordId);
  const isCatalogue = detail?.contract_code === 'activity_catalogue';
  const canCommit = detail?.processing_status === 'ready_to_commit' && !detail.committed_at && !detail.disabled_at;
  const custody = useMemo(() => detail ? [
    [text('Source', '來源'), isChinese ? detail.source_name_zh : detail.source_name_en],
    [text('Channel', '渠道'), detail.ingress_channel],
    [text('Uploader / requester', '上載／要求者'), isChinese ? detail.uploader_name_zh || detail.requested_name_zh || detail.service_actor_id || '—' : detail.uploader_name || detail.requested_name || detail.service_actor_id || '—'],
    [text('Source path', '來源路徑'), detail.source_relative_path || detail.original_file_name || detail.source_parent_key || '—'],
    [text('Source time', '來源時間'), detail.source_uploaded_at || '—'],
    [text('Platform received', '平台接收時間'), detail.received_at],
    [text('SHA-256', 'SHA-256'), detail.content_sha256],
  ] : [], [detail, isChinese]);

  return <>
    <PageHeader kicker={text('DATA OPERATIONS · TRACEABLE SOURCE CUSTODY', '數據操作 · 可追溯來源管理')} title={text('Data operations', '數據操作')} description={text('Choose the school records you want to manage first, then import, export or preview a batch change. File format is a transport detail—not the starting point.', '先選擇要管理的校內紀錄，再匯入、匯出或預覽批次變更；檔案格式只是傳輸細節，並非流程起點。')} />
    {notice && <Notice tone="success">{notice}</Notice>}

    <section className="operations-inventory">
      <header><div><p>{text('AVAILABLE RECORDS', '可用紀錄')}</p><h2>{text('Teachers and activities in scope', '範圍內教職員及活動')}</h2></div><span>{staff.length} {text('teachers', '位教職員')} · {workspace?.activities.length || 0} {text('activities', '項活動')}</span></header>
      <div>
        <section><div className="inventory-title"><UsersThree size={19} /><b>{text('Available teachers', '可用教職員')}</b></div><div className="teacher-inventory">{staff.map(person => <article key={person.id}><span><b>{isChinese ? person.nameZh : person.name}</b><small>{person.staffNumber} · {person.positions.map(position => isChinese ? position.name_zh : position.name_en).join(', ') || text('Staff', '教職員')}</small></span><Status value={person.explicitDenies.length ? 'needs_review' : 'active'} /></article>)}</div></section>
        <section><div className="inventory-title"><FolderOpen size={19} /><b>{text('Available activities', '可用活動')}</b></div><div className="activity-inventory">{workspace?.activities.map(item => <button key={item.activity_id} className={activityId === item.activity_id ? 'selected' : ''} onClick={() => setActivityId(item.activity_id)}><span><b>{isChinese ? item.title_zh || item.title_en : item.title_en}</b><small>{item.activity_id}</small></span><Status value={item.operational_status} /></button>)}</div></section>
      </div>
    </section>

    <section className="data-domain-grid">{domainDefinitions.map(domain => { const Icon = domain.icon; const count = domain.id === 'rubrics' && rubricWorkspace ? `${rubricWorkspace.catalogues.length} catalogues` : domain.count; return <button key={domain.id} className={operation === domain.id ? 'selected' : ''} onClick={() => { setOperation(domain.id); setDomainFile(null); }}><Icon size={20} /><span><b>{text(domain.labelEn, domain.labelZh)}</b><small>{text(domain.detailEn, domain.detailZh)}</small></span><em>{text(count, count.replace('records','項紀錄').replace('users','位使用者').replace('groups','個群組').replace('teachers','位老師').replace('students','位學生').replace('questions','題').replace('catalogues','個目錄').replace('active set','個生效組合').replace('By activity','按活動'))}</em></button>; })}</section>

    {operation === 'rubrics' && <section className="rubric-contract-panel">
      <header><div><p>{text('SCHOOLADMIN · VERSIONED RUBRIC PACKAGE', 'SCHOOLADMIN · 有版本 RUBRIC 套件')}</p><h2>{text('Skill rubrics', '技能 Rubric')}</h2><span>{text('Real catalogues, groups, skills, step definitions and optional score bands.', '真實目錄、群組、技能、階段定義及可選分數範圍。')}</span></div><Status value={rubricWorkspace?.active ? 'active' : 'needs_review'} /></header>
      <div className="rubric-actions"><button disabled={busy} onClick={() => void exportRubrics(false)}><DownloadSimple />{text('Export all rubric records · XLSX', '匯出全部 Rubric 紀錄 · XLSX')}<small>{text('Four linked sheets with stable IDs', '四個連繫工作表及穩定 ID')}</small></button><button disabled={busy} onClick={() => void exportRubrics(true)}><FileArrowUp />{text('Download new-rubric template', '下載新 Rubric 範本')}<small>{text('Separate from editing existing records', '與編輯現有紀錄分開')}</small></button><label><Database /><span><b>{text('Stage an XLSX rubric package', '暫存 XLSX Rubric 套件')}</b><small>{text('Validate before creating a successor', '建立後繼版本前先驗證')}</small></span><input type="file" accept=".xlsx" onChange={event => { setRubricFile(event.target.files?.[0] || null); setRubricPreview(null); }} /></label><button className="primary" disabled={busy || !rubricFile} onClick={() => void previewRubrics()}>{text('Stage and validate', '暫存及驗證')}</button></div>
      <div className="rubric-package-layout">
        <aside>{rubricWorkspace?.catalogues.map(item => <button className={rubricPackage?.catalogue.rubric_catalogue_id === item.rubric_catalogue_id ? 'selected' : ''} key={item.rubric_catalogue_id} onClick={() => void api.rubricPackage(item.rubric_catalogue_id).then(setRubricPackage).catch(report)}><span><b>{isChinese ? item.name_zh : item.name_en}</b><small>{item.rubric_catalogue_id} · {item.version}</small></span><Status value={item.status} /><em>{item.skill_count} {text('skills', '項技能')} · {item.step_count} {text('steps', '個階段')}</em></button>)}</aside>
        {rubricPackage && <main><div className="rubric-package-heading"><div><p>{rubricPackage.catalogue.rubric_catalogue_id}</p><h3>{isChinese ? rubricPackage.catalogue.name_zh : rubricPackage.catalogue.name_en}</h3><span>{text('Selection mode', '選擇模式')}: <b>{rubricPackage.catalogue.selection_mode}</b>{rubricPackage.catalogue.selection_mode === 'score_range' ? ` · ${text('out of', '滿分')} ${rubricPackage.catalogue.score_out_of || 10}` : ` · ${text('no numeric score required', '不需要數值分數')}`}</span></div><div><Status value={rubricPackage.catalogue.status} /><small>{rubricPackage.catalogue.portfolio_usage_count} {text('Portfolio versions pinned', '個 Portfolio 版本已固定連繫')}</small></div></div><div className="rubric-groups">{rubricPackage.groups.map(group => <section key={group.rubric_group_id}><header><b>{isChinese ? group.name_zh : group.name_en}</b><code>{group.rubric_group_id}</code></header>{rubricPackage.skills.filter(skill => skill.rubric_group_id === group.rubric_group_id).map(skill => <article key={skill.axis_id}><span><b>{isChinese ? skill.name_zh : skill.name_en}</b><small>{skill.axis_id}</small></span><em>{rubricPackage.steps.filter(step => step.axis_id === skill.axis_id).length} / 16</em></article>)}</section>)}</div>{rubricPackage.catalogue.status === 'draft' && <div className="rubric-activation"><Field label={text('Activation reason', '啟用原因')}><input value={rubricReason} onChange={event => setRubricReason(event.target.value)} /></Field><button className="primary" disabled={busy || !rubricReason.trim()} onClick={() => void activateRubric(rubricPackage.catalogue.rubric_catalogue_id)}>{text('Activate for future Portfolio versions', '啟用供日後 Portfolio 版本使用')}</button><small>{text('Existing generated and published Portfolio versions will not change.', '現有已生成及已發布 Portfolio 版本不會更改。')}</small></div>}</main>}
      </div>
      {rubricPreview && <div className={rubricPreview.status === 'ready' ? 'rubric-preview valid' : 'rubric-preview invalid'}><div><b>{text('Staged workbook', '已暫存活頁簿')} · {rubricPreview.status}</b><span>{Object.entries(rubricPreview.counts).map(([key,value]) => `${key}: ${value}`).join(' · ')}</span>{rubricPreview.errors.map(error => <small key={error}>{error}</small>)}</div>{rubricPreview.status === 'ready' && <div className="rubric-preview-action"><Field label={text('Catalogue to revise', '要修訂的目錄')}><select value={rubricSourceId} onChange={event => setRubricSourceId(event.target.value)}>{rubricPreview.sourceCatalogues.map(item => <option key={item.id} value={item.id}>{item.name} · {item.version} · {item.id}</option>)}</select></Field><button disabled={busy || !rubricSourceId} onClick={() => void createRubricSuccessor()}>{text('Create successor draft', '建立後繼草稿')}</button></div>}</div>}
      <Notice tone="warning">{text('Changing the active rubric never rewrites an existing Portfolio. Each working and published Portfolio stores the immutable rubric catalogue/version ID selected when that working version was generated.', '更改生效 Rubric 絕不會改寫現有 Portfolio。每個工作及已發布 Portfolio 均保存建立該工作版本時選定的不可變 Rubric 目錄／版本 ID。')}</Notice>
    </section>}

    {!['roster','catalogue','media','rubrics'].includes(operation) && (() => { const domain = domainDefinitions.find(item => item.id === operation)!; return <section className="domain-contract-panel">
      <header><div><p>{text('SCHOOLADMIN DATA CONTRACT', 'SCHOOLADMIN 數據合約')}</p><h2>{text(domain.labelEn, domain.labelZh)}</h2><span>{text(domain.detailEn, domain.detailZh)}</span></div><Status value="design_preview" /></header>
      <div className="domain-contract-actions"><button onClick={() => exportDomain(operation)}><DownloadSimple />{text('Export all records for editing', '匯出全部紀錄供編輯')}<small>{text('Includes stable IDs and disabled state', '包括穩定 ID 及 disabled 狀態')}</small></button><a href={domain.template} download><FileArrowUp />{text('Download new-record template', '下載新增紀錄範本')}<small>{text('Blank/example rows and expected fields', '空白／示例列及預期欄位')}</small></a><label><Database /><span><b>{text('Import changes or new records', '匯入變更或新增紀錄')}</b><small>{text('CSV or XLSX · staged validation first', 'CSV 或 XLSX · 先作暫存驗證')}</small></span><input type="file" accept=".csv,.xlsx" onChange={event => setDomainFile(event.target.files?.[0] || null)} /></label></div>
      <div className="contract-fields"><b>{text('Expected fields', '預期欄位')}</b>{domain.fields.map(field => <code key={field}>{field}</code>)}</div>
      <footer><span>{domainFile ? domainFile.name : text('No import file selected.', '未選擇匯入檔案。')}</span><button className="primary" disabled={!domainFile} onClick={stageGenericDomain}>{text('Stage and validate', '暫存及驗證')}</button></footer>
    </section>; })()}

    {operation === 'roster' && <section className="import-entry-grid">
      <form onSubmit={upload} className="import-entry-card">
        <header><FileArrowUp size={24} /><div><p>{text('FILE INGESTION', '檔案匯入')}</p><h2>{text('Update people assigned to an activity', '更新活動人員分派')}</h2></div></header>
        <Field label={text('Activity receiving the roster', '接收名冊的活動')}><select aria-label={text('Upload target activity', '上載目標活動')} value={activityId} onChange={event => setActivityId(event.target.value)}>{workspace?.activities.map(item => <option key={item.activity_id} value={item.activity_id}>{isChinese ? item.title_zh || item.title_en : item.title_en} · {item.activity_id}</option>)}</select></Field>
        <Field label={text('Roster file · CSV or XLSX · maximum 4 MiB', '名冊檔案 · CSV 或 XLSX · 上限 4 MiB')}><input aria-label={text('Roster file', '名冊檔案')} type="file" accept=".csv,.xlsx" onChange={event => setFile(event.target.files?.[0] || null)} /></Field>
        <button className="primary" disabled={busy || !workspace?.activities.length}>{busy ? text('Working…', '處理中…') : text('Parse and preview assignments', '解析及預覽分派')}</button>
      </form>
      <form onSubmit={runConnector} className="import-entry-card connector">
        <header><CloudArrowDown size={24} /><div><p>{text('ALLOW-LISTED CONNECTOR', '白名單連接器')}</p><h2>{text('Fetch the same roster as JSON', '以 JSON 擷取同一名冊')}</h2></div></header>
        <Field label={text('Source system', '來源系統')}><select aria-label={text('Connector source', '連接器來源')} value={sourceId} onChange={event => setSourceId(event.target.value)}>{workspace?.sources.filter(item => item.connector_type === 'approved_json_api').map(item => <option key={item.source_system_id} value={item.source_system_id}>{isChinese ? item.name_zh : item.name_en} · {item.status}</option>)}</select></Field>
        <Field label={text('Source activity key', '來源活動識別碼')}><input aria-label={text('Source activity key', '來源活動識別碼')} value={sourceParentKey} onChange={event => setSourceParentKey(event.target.value)} /></Field>
        <button className="primary" disabled={busy || !connector?.connector_available || connector?.status !== 'active'}>{connector?.connector_available ? text('Fetch and preview assignments', '擷取及預覽分派') : text('Connector configuration unavailable', '未有連接器設定')}</button>
      </form>
    </section>}

    {operation === 'catalogue' && workspace?.access.canManageActivityCatalogue && <form onSubmit={uploadCatalogue} className="catalogue-operation">
      <header><Database size={24} /><div><p>{text('ACTIVITY CATALOGUE · DELTA MODE', '活動目錄 · 差異模式')}</p><h2>{text('Export, edit and stage explicit changes', '匯出、編輯及暫存明確變更')}</h2></div></header>
      <Notice tone="warning">{text('Removing a row means no change. Only lifecycle_action=disable or restore changes availability. Material edits create a successor draft for normal approval; the original author is preserved.', '移除一列代表不作更改。只有 lifecycle_action=disable 或 restore 才會更改可用狀態。重大修改會建立後繼草稿按正常流程批核；原始作者維持不變。')}</Notice>
      <Field label={text('Edited activity catalogue · CSV or XLSX · maximum 4 MiB', '已編輯活動目錄 · CSV 或 XLSX · 上限 4 MiB')}><input aria-label={text('Activity catalogue file', '活動目錄檔案')} type="file" accept=".csv,.xlsx" onChange={event => setCatalogueFile(event.target.files?.[0] || null)} /></Field>
      <div className="catalogue-actions"><button type="button" disabled={busy || !workspace.access.canExportActivityCatalogue} onClick={() => void exportCatalogue()}><DownloadSimple />{text('Export editable CSV', '匯出可編輯 CSV')}</button><button className="primary" disabled={busy || !catalogueFile}>{text('Stage explicit catalogue changes', '暫存明確目錄變更')}</button></div>
    </form>}

    {operation === 'media' && <section className="media-path-operation">
      <header><div><p>{text('ACTIVITY-LINKED MEDIA', '活動連繫媒體')}</p><h2>{text('Batch output or update media source paths', '批次輸出或更新媒體來源路徑')}</h2><span>{text('Media retrieval is keyed by activityId. This operation does not change activity authorship or approval.', '媒體擷取以 activityId 為索引；此操作不會更改活動作者或批核。')}</span></div><button onClick={exportMediaPaths}><DownloadSimple />{text('Export batch output', '匯出批次輸出')}</button></header>
      <div className="media-path-toolbar"><Field label={text('New base path', '新基礎路徑')}><input value={pathPrefix} onChange={event => setPathPrefix(event.target.value)} /></Field><button className="primary" onClick={previewBatchPathUpdate}>{text('Preview path update', '預覽路徑更新')}</button></div>
      <div className="media-path-table"><div><span></span><span>{text('Activity ID', '活動 ID')}</span><span>{text('Activity', '活動')}</span><span>{text('Media', '媒體')}</span><span>{text('Current base path', '目前基礎路徑')}</span><span>{text('Validation', '驗證')}</span></div>{workspace?.activities.map((item, index) => <article key={item.activity_id}><input type="checkbox" checked={selectedPaths.includes(item.activity_id)} onChange={() => setSelectedPaths(current => current.includes(item.activity_id) ? current.filter(id => id !== item.activity_id) : [...current, item.activity_id])} /><code>{item.activity_id}</code><span><b>{isChinese ? item.title_zh || item.title_en : item.title_en}</b><small>{item.operational_status}</small></span><b>{(index + 1) * 4}</b><input value={pathPreview[item.activity_id] || ''} onChange={event => setPathPreview(current => ({ ...current, [item.activity_id]: event.target.value }))} /><Status value={(pathPreview[item.activity_id] || '').endsWith('/') ? 'valid' : 'needs_resolution'} /></article>)}</div>
      <Notice tone="warning">{text('Design preview: path edits are local to this screen until a protected server endpoint, permission check and audit event are implemented.', '設計預覽：在受保護伺服器端點、權限檢查及稽核事件完成前，路徑修改只會保留在本畫面。')}</Notice>
    </section>}

    {['roster','catalogue'].includes(operation) && <>
    {workspace?.access.canManageSources && <section className="source-registry"><header><ShieldCheck size={22} /><div><p>{text('SOURCE CUSTODY', '來源管理')}</p><h2>{text('School source availability', '學校來源可用狀態')}</h2></div></header><div className="source-list">{workspace.sources.map(source => <article key={source.source_system_id}><span><b>{isChinese ? source.name_zh : source.name_en}</b><small>{source.source_code} · {source.connector_type}</small></span><Status value={source.status} /><button disabled={busy} onClick={() => void work(() => api.setSourceStatus(source.source_system_id, source.status === 'active' ? 'disabled' : 'active', sourceReason), text('Source availability changed without deleting its history.', '來源可用狀態已更改，歷史並無刪除。'))}>{source.status === 'active' ? text('Disable', '停用') : text('Enable', '啟用')}</button></article>)}</div><Field label={text('Reason applied to the next source change', '下次來源狀態更改的原因')}><input value={sourceReason} onChange={event => setSourceReason(event.target.value)} /></Field></section>}

    <section className="import-workspace">
      <aside className="import-batch-list"><header><Database size={21} /><div><p>{text('PROVENANCE LEDGER', '來源紀錄冊')}</p><h2>{workspace?.batches.length || 0} {text('batches in scope', '個範圍內批次')}</h2></div></header>{workspace?.batches.map(batch => <button key={batch.import_batch_id} className={detail?.import_batch_id === batch.import_batch_id ? 'selected' : ''} onClick={() => { onSelectBatch(batch.import_batch_id); void api.importDetail(batch.import_batch_id).then(setDetail).catch(report); }}><span><b>{isChinese ? batch.target_title_zh || batch.target_title_en || batch.original_file_name : batch.target_title_en || batch.original_file_name || batch.source_relative_path}</b><small>{batch.source_name_en} · {new Date(batch.received_at).toLocaleString()}</small></span><Status value={batch.processing_status} /></button>)}</aside>
      <div className="import-batch-detail">
        {!detail ? <div className="import-empty"><Database size={34} /><h3>{text('No import batch selected', '未選擇匯入批次')}</h3><p>{text('Upload a roster or run an authorized connector to begin.', '請上載名冊或執行獲授權的連接器。')}</p></div> : <>
          <header className="import-detail-heading"><div><p>{detail.import_batch_id}</p><h2>{isChinese ? detail.target_title_zh || detail.target_title_en || detail.original_file_name : detail.target_title_en || detail.original_file_name || detail.source_relative_path}</h2><span>{detail.contract_code} · v{detail.contract_version}</span></div><Status value={detail.processing_status} /></header>
          <div className="import-counts"><span><b>{detail.total_rows}</b>{text('rows', '列')}</span><span><b>{detail.valid_rows}</b>{text('valid', '有效')}</span><span><b>{detail.warning_rows}</b>{text('warnings', '警告')}</span><span><b>{detail.error_rows}</b>{text('errors', '錯誤')}</span><span><b>{detail.excluded_rows}</b>{text('excluded', '已排除')}</span></div>
          <section className="custody-panel"><header><ShieldCheck size={20} /><b>{text('Source and custody', '來源及保管紀錄')}</b></header>{custody.map(([label,value]) => <div key={label}><span>{label}</span><code>{value}</code></div>)}</section>
          <section className="import-row-table"><header><span>{text('Row / source key', '列／來源識別碼')}</span><span>{isCatalogue ? text('Activity / title', '活動／名稱') : text('Entered student', '輸入學生')}</span><span>{isCatalogue ? text('Owner / revision', '擁有人／修訂') : text('Resolved identity', '已配對身份')}</span><span>{text('State', '狀態')}</span><span>{text('Action', '操作')}</span></header>{detail.records.map(record => <article key={record.import_record_id} className={record.validation_status === 'invalid' && record.current_decision !== 'excluded' ? 'has-error' : ''}><span><b>{record.row_number}</b><code>{record.source_record_key}</code></span><span><b>{isCatalogue ? record.normalizedPayload.activity_id || '—' : record.normalizedPayload.student_identifier || '—'}</b><small>{isCatalogue ? record.normalizedPayload.title_en || '—' : record.normalizedPayload.student_name || '—'}</small></span><span><b>{isChinese ? record.resolved_name_zh || '—' : record.resolved_name_en || '—'}</b><small>{isCatalogue ? `rev ${record.normalizedPayload.current_revision_number || record.normalizedPayload.expected_revision_number || '—'} · ${record.normalizedPayload.lifecycle_action}` : record.resolved_student_number || record.identity_status}</small></span><span><Status value={record.current_decision === 'excluded' ? 'excluded' : record.current_status} />{record.validationErrors.map(error => <small className="row-error" key={`${error.field}-${error.code}`}>{error.message}</small>)}{record.validationWarnings.map(warning => <small className="row-warning" key={`${warning.field}-${warning.code}`}>{warning.message}</small>)}</span><span><button onClick={() => { setSelectedRecordId(record.import_record_id); setCorrection(isCatalogue ? { fieldName: 'title_en', afterValue: record.normalizedPayload.title_en || '', reason: '' } : { ...emptyCorrection, afterValue: record.normalizedPayload.student_identifier || '' }); }}>{text('Review', '檢視')}</button></span></article>)}</section>
          {selectedRecord && !detail.disabled_at && <section className="row-resolution">
            <header><ArrowClockwise size={20} /><div><p>{text('APPEND-ONLY RESOLUTION', '只新增不覆寫的處理')}</p><h3>{selectedRecord.source_record_key}</h3></div><button onClick={() => setSelectedRecordId('')}>{text('Close', '關閉')}</button></header>
            {!detail.committed_at && <form onSubmit={correct}><Field label={text('Correct field', '修正欄位')}><select value={correction.fieldName} onChange={event => setCorrection({ ...correction, fieldName: event.target.value })}>{(isCatalogue ? ['activity_id','expected_revision_number','title_en','title_zh','description_en','description_zh','activity_type','subject_id','department_id','start_at','end_at','owner_staff_number','requested_form_version_id','media_capture_expected','location','lifecycle_action','change_reason'] : ['student_identifier','student_name','group_code','planned_attendance_status']).map(field => <option key={field} value={field}>{field}</option>)}</select></Field><Field label={text('Replacement value', '替代值')}><input value={correction.afterValue} onChange={event => setCorrection({ ...correction, afterValue: event.target.value })} /></Field><Field label={text('Correction reason', '修正原因')}><input value={correction.reason} onChange={event => setCorrection({ ...correction, reason: event.target.value })} /></Field><button disabled={busy}>{text('Append correction and revalidate', '新增修正並重新驗證')}</button></form>}
            {detail.committed_at && <Notice tone="warning">{isCatalogue ? text('This row is already linked to the stable activity and, where applicable, its successor revision. A later exclusion marks the link for review; it never deletes or silently rolls back the activity.', '此列已連結穩定活動及（如適用）後繼修訂。其後排除只會把連結標記為待覆核，不會刪除或靜默回復活動。') : text('This row is already linked to an activity assignment. Excluding or restoring it creates a new decision and marks the linked record for human review; it does not delete the assignment.', '此列已連結活動分派。排除或恢復只會建立新決定，並將連結紀錄標記為需人手覆核；系統不會刪除分派。')}</Notice>}
            <div className="decision-row"><Field label={text('Decision reason', '決定原因')}><input value={decisionReason} onChange={event => setDecisionReason(event.target.value)} /></Field>{selectedRecord.current_decision === 'excluded' ? <button onClick={() => void decide(selectedRecord, 'restore')}><ArrowClockwise />{text('Restore by new decision', '以新決定恢復')}</button> : <button className="danger" onClick={() => void decide(selectedRecord, 'exclude')}><Prohibit />{text('Exclude row', '排除此列')}</button>}</div>
          </section>}
          <section className="import-commit-strip"><div>{canCommit ? <CheckCircle size={23} /> : <Warning size={23} />}<span><b>{canCommit ? text(isCatalogue ? 'Ready for authorized catalogue commit' : 'Ready for an assigned editor to commit', isCatalogue ? '可由獲授權人員提交活動目錄' : '可由獲分派編輯者提交') : text('Commit remains locked', '提交仍然鎖定')}</b><small>{text(isCatalogue ? 'Successor revisions remain draft; uploader and approver are separate, and absent rows remain unchanged.' : 'Validation and commit do not publish the activity. Activity approval remains separate.', isCatalogue ? '後繼修訂維持草稿；上載人與批核人分開，而缺少的列維持不變。' : '驗證及提交不會發布活動；活動批核仍為獨立程序。')}</small></span></div><Field label={text('Commit / import-batch reason', '提交／匯入批次原因')}><input value={commitReason} onChange={event => setCommitReason(event.target.value)} /></Field><button className="primary" disabled={busy || !canCommit} onClick={() => detail && void work(() => api.commitImport(detail.import_batch_id, commitReason), text(isCatalogue ? 'Catalogue delta committed. Changed activities now have successor drafts; approval remains separate.' : 'Roster committed with source links. Activity publication is unchanged.', isCatalogue ? '活動目錄差異已提交；已修改活動現有後繼草稿，批核仍為獨立程序。' : '名冊已連同來源連結提交；活動發布狀態沒有改變。'))}>{text(isCatalogue ? 'Commit explicit activity actions' : 'Commit validated roster', isCatalogue ? '提交明確活動操作' : '提交已驗證名冊')}</button>{!detail.committed_at && !detail.disabled_at && <button disabled={busy} onClick={() => void work(() => api.disableImport(detail.import_batch_id, commitReason), text('The uncommitted import batch was disabled without deleting its source rows. The activity itself was not disabled.', '未提交的匯入批次已停用，來源列並無刪除；活動本身並未停用。'))}>{text('Disable this import batch', '停用此匯入批次')}</button>}</section>
        </>}
      </div>
    </section>
    </>}
  </>;
}
