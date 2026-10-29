import { useEffect, useMemo, useState } from 'react';
import { ArrowClockwise, CheckCircle, CloudArrowDown, Database, FileArrowUp, Prohibit, ShieldCheck, Warning } from '@phosphor-icons/react';
import { api } from '../api/client';
import type { ImportBatchDetail, ImportRecord, ImportWorkspace } from '../../shared/types';
import { Field, Notice, PageHeader, Status } from '../components/Layout';
import { useI18n } from '../i18n';

const emptyCorrection = { fieldName: 'student_identifier', afterValue: '', reason: '' };

export function DataImports({ report, focusBatchId, onSelectBatch, onUnavailable }: { report: (value: unknown) => void; focusBatchId?: string; onSelectBatch: (batchId: string) => void; onUnavailable: () => void }) {
  const { isChinese, text } = useI18n();
  const [workspace, setWorkspace] = useState<ImportWorkspace | null>(null);
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

  async function loadWorkspace(preferredBatchId = focusBatchId) {
    const next = await api.imports();
    setWorkspace(next);
    if (!activityId && next.activities[0]) setActivityId(next.activities[0].activity_id);
    const batchId = preferredBatchId || detail?.import_batch_id || next.batches.find(item => item.target_entity_id)?.import_batch_id || next.batches[0]?.import_batch_id;
    if (batchId) {
      try { const selected = await api.importDetail(batchId); setDetail(selected); if (!focusBatchId) onSelectBatch(batchId); }
      catch (error) { if (focusBatchId) onUnavailable(); else throw error; }
    } else setDetail(null);
  }

  useEffect(() => { void loadWorkspace().catch(report); }, []);
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
    <PageHeader kicker={text('STAGED DELTAS · EXPLICIT LIFECYCLE · NO HARD DELETE', '暫存差異 · 明確生命週期 · 不作永久刪除')} title={text('Data imports', '數據匯入')} description={text('Roster and activity-catalogue contracts share source custody and staged review. A missing activity row always means no change; only an explicit lifecycle action can disable or restore it.', '名冊及活動目錄格式共用來源保管及暫存覆核。活動列缺少一律代表不作更改；只有明確生命週期操作才可停用或恢復活動。')} />
    {notice && <Notice tone="success">{notice}</Notice>}
    <section className="import-entry-grid">
      <form onSubmit={upload} className="import-entry-card">
        <header><FileArrowUp size={24} /><div><p>{text('FILE INGESTION', '檔案匯入')}</p><h2>{text('Upload CSV or XLSX', '上載 CSV 或 XLSX')}</h2></div></header>
        <Field label={text('Target unpublished activity', '目標未發布活動')}><select aria-label={text('Upload target activity', '上載目標活動')} value={activityId} onChange={event => setActivityId(event.target.value)}>{workspace?.activities.map(item => <option key={item.activity_id} value={item.activity_id}>{isChinese ? item.title_zh || item.title_en : item.title_en} · {item.operational_status}</option>)}</select></Field>
        <Field label={text('Roster file · maximum 4 MiB', '名冊檔案 · 上限 4 MiB')}><input aria-label={text('Roster file', '名冊檔案')} type="file" accept=".csv,.xlsx" onChange={event => setFile(event.target.files?.[0] || null)} /></Field>
        <button className="primary" disabled={busy || !workspace?.activities.length}>{busy ? text('Working…', '處理中…') : text('Parse and preview', '解析及預覽')}</button>
      </form>
      <form onSubmit={runConnector} className="import-entry-card connector">
        <header><CloudArrowDown size={24} /><div><p>{text('ALLOW-LISTED CONNECTOR', '白名單連接器')}</p><h2>{text('Fetch JSON roster', '擷取 JSON 名冊')}</h2></div></header>
        <Field label={text('Source system', '來源系統')}><select aria-label={text('Connector source', '連接器來源')} value={sourceId} onChange={event => setSourceId(event.target.value)}>{workspace?.sources.filter(item => item.connector_type === 'approved_json_api').map(item => <option key={item.source_system_id} value={item.source_system_id}>{isChinese ? item.name_zh : item.name_en} · {item.status}</option>)}</select></Field>
        <Field label={text('Opaque source activity key', '不透明來源活動識別碼')}><input aria-label={text('Source activity key', '來源活動識別碼')} value={sourceParentKey} onChange={event => setSourceParentKey(event.target.value)} /></Field>
        <button className="primary" disabled={busy || !connector?.connector_available || connector?.status !== 'active'}>{connector?.connector_available ? text('Fetch and preview', '擷取及預覽') : text('Connector configuration unavailable', '未有連接器設定')}</button>
      </form>
      {workspace?.access.canManageActivityCatalogue && <form onSubmit={uploadCatalogue} className="import-entry-card catalogue">
        <header><Database size={24} /><div><p>{text('ACTIVITY CATALOGUE · DELTA MODE', '活動目錄 · 差異模式')}</p><h2>{text('Export, edit and re-import', '匯出、編輯及重新匯入')}</h2></div></header>
        <Notice tone="warning">{text('Removing a row from the file does nothing. Set lifecycle_action to disable or restore. Material edits create a successor draft and require normal approval; uploader never becomes the original author.', '從檔案移除一列不會產生任何作用。請把 lifecycle_action 設為 disable 或 restore。重大修改會建立後繼草稿並按正常流程批核；上載人不會成為原始作者。')}</Notice>
        <Field label={text('Edited catalogue · maximum 4 MiB', '已編輯目錄 · 上限 4 MiB')}><input aria-label={text('Activity catalogue file', '活動目錄檔案')} type="file" accept=".csv,.xlsx" onChange={event => setCatalogueFile(event.target.files?.[0] || null)} /></Field>
        <div className="catalogue-actions"><button type="button" disabled={busy || !workspace.access.canExportActivityCatalogue} onClick={() => void exportCatalogue()}>{text('Export editable CSV', '匯出可編輯 CSV')}</button><button className="primary" disabled={busy || !catalogueFile}>{text('Stage catalogue delta', '暫存目錄差異')}</button></div>
      </form>}
    </section>

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
  </>;
}
