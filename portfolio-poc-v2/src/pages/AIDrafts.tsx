import { useEffect, useMemo, useState } from 'react';
import {
  Brain, Check, CheckCircle, FileAudio, FileDoc, FileVideo, Image,
  LinkSimple, MagnifyingGlass, Prohibit, Sparkle, WarningCircle,
} from '@phosphor-icons/react';
import { api } from '../api/client';
import type { AIDraftWorkspace, AIManifestRow, ActivityReferenceData } from '../../shared/types';
import { Field, Notice, Status } from '../components/Layout';
import { useI18n } from '../i18n';

type EvidenceFile = {
  id: string;
  fileName: string;
  kind: 'image' | 'audio' | 'video' | 'document';
  activityId: string;
  summary: string;
  status: 'extracted' | 'needs_review' | 'failed' | 'human_approved';
  source: string;
  added: string;
  asset?: string;
};

const fileIcons = { image: Image, audio: FileAudio, video: FileVideo, document: FileDoc };

function evidenceFiles(workspace: AIDraftWorkspace, chinese: boolean): EvidenceFile[] {
  const source = (index: number) => workspace.sources[index % Math.max(workspace.sources.length, 1)];
  const summary = (index: number, fallback: string) => {
    const row = source(index);
    return row ? (chinese ? row.summary_zh || row.summary_en : row.summary_en) : fallback;
  };
  const activity = source(0)?.source_id || 'ACT-COMM-001';
  const proof = source(1)?.source_id || 'PROOF-S1-TEAMWORK';
  const rubric = source(2)?.source_id || 'RUBRIC-SNAPSHOT-S1';
  return [
    { id: 'MEDIA-PODCAST-IMAGE', fileName: 'podcast_discussion.jpg', kind: 'image', activityId: activity, summary: summary(0, 'Students planned the episode structure and shared interview questions.'), status: 'extracted', source: 'Time Infinity / connector', added: '29 Oct · 10:12', asset: '/assets/evidence/podcast-workshop.png' },
    { id: 'MEDIA-PODCAST-AUDIO', fileName: 'interview_alex.mp3', kind: 'audio', activityId: activity, summary: summary(0, 'Alex shared views on community and school life.'), status: 'needs_review', source: 'Time Infinity / connector', added: '29 Oct · 10:18' },
    { id: 'MEDIA-PODCAST-VIDEO', fileName: 'recording_take1.mp4', kind: 'video', activityId: activity, summary: summary(0, 'Alex introduced the project goals and reflected on the recording.'), status: 'extracted', source: 'Time Infinity / connector', added: '29 Oct · 10:25', asset: '/assets/evidence/event-planning.png' },
    { id: 'MEDIA-SHOW-NOTES', fileName: 'show_notes.pdf', kind: 'document', activityId: activity, summary: summary(0, 'Project outline, team roles and interview questions.'), status: 'failed', source: 'Time Infinity / connector', added: '29 Oct · 10:27' },
    { id: 'MEDIA-GROUP-PHOTO', fileName: 'group_photo.jpg', kind: 'image', activityId: proof, summary: summary(1, 'Alex worked with group members on event planning.'), status: 'extracted', source: 'BHSS Platform / seed_files', added: '28 Oct · 16:43', asset: '/assets/evidence/event-planning.png' },
    { id: 'MEDIA-REFLECTION', fileName: 'reflection.docx', kind: 'document', activityId: proof, summary: summary(1, 'Alex reflected on individual contribution and teamwork.'), status: 'human_approved', source: 'BHSS Platform / seed_files', added: '28 Oct · 16:50' },
    { id: 'MEDIA-RUBRIC', fileName: 'rubric_result.pdf', kind: 'document', activityId: rubric, summary: summary(2, 'Published rubric result snapshot retained as contextual evidence.'), status: 'extracted', source: 'BHSS Platform / assessments', added: '27 Oct · 14:20' },
  ];
}

export function AIDrafts({ report }: { report: (error: unknown) => void }) {
  const { isChinese, text } = useI18n();
  const [workspace, setWorkspace] = useState<AIDraftWorkspace | null>(null);
  const [manifests, setManifests] = useState<AIManifestRow[]>([]);
  const [students, setStudents] = useState<ActivityReferenceData['students']>([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [decisionReason, setDecisionReason] = useState('');
  const [editReason, setEditReason] = useState('');
  const [editedText, setEditedText] = useState('');
  const [working, setWorking] = useState(false);
  const [rightTab, setRightTab] = useState<'draft' | 'candidates' | 'history'>('draft');
  const [activityFilter, setActivityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  async function load(preferredManifestId?: string) {
    try {
      const list = await api.aiDrafts();
      setManifests(list.manifests);
      const selected = list.manifests.find(item => item.manifest_id === preferredManifestId)
        || list.manifests.find(item => item.manifest_id === workspace?.manifest_id)
        || list.manifests[0];
      if (!selected) { setWorkspace(null); return; }
      const detail = await api.aiDraft(selected.manifest_id);
      setWorkspace(detail);
      setEditedText(detail.narrative?.teacher_edited_text || detail.narrative?.generated_text || '');
    } catch (error) { report(error); }
  }

  useEffect(() => {
    void load();
    void api.activityReferenceData().then(data => setStudents(data.students)).catch(() => undefined);
  }, []);

  async function generate() {
    if (!workspace) return;
    setWorking(true);
    try { await api.generateAiDraft(workspace.manifest_id); await load(workspace.manifest_id); setRightTab('candidates'); }
    catch (error) { report(error); }
    finally { setWorking(false); }
  }

  async function decide(candidateId: string, outcome: string) {
    if (!decisionReason.trim()) return;
    try { await api.decideAiCandidate(candidateId, outcome, decisionReason); setDecisionReason(''); await load(workspace?.manifest_id); }
    catch (error) { report(error); }
  }

  async function saveNarrative() {
    if (!workspace?.narrative || !editReason.trim() || !editedText.trim()) return;
    try { await api.editLearnerNarrative(workspace.narrative.learner_narrative_version_id, editedText, editReason); setEditReason(''); await load(workspace.manifest_id); }
    catch (error) { report(error); }
  }

  const files = useMemo(() => workspace ? evidenceFiles(workspace, isChinese) : [], [workspace, isChinese]);
  const activities = [...new Set(files.map(item => item.activityId))];
  const visibleFiles = files.filter(item => (activityFilter === 'all' || item.activityId === activityFilter) && (statusFilter === 'all' || item.status === statusFilter));
  const visibleStudents = students.filter(student => `${student.name_en} ${student.name_zh} ${student.student_number}`.toLowerCase().includes(studentSearch.toLowerCase()));
  const selectedStudent = students.find(item => item.user_id === workspace?.student_user_id);
  const acceptedCandidate = workspace?.candidates.find(item => item.review_status === 'included') || workspace?.candidates[0];
  const draftText = editedText || (isChinese ? acceptedCandidate?.generated_text_zh || acceptedCandidate?.generated_text_en : acceptedCandidate?.generated_text_en || acceptedCandidate?.generated_text_zh) || text('No student draft has been generated yet.', '尚未生成學生草稿。');

  if (!workspace) return <Notice>{text('No assigned AI draft workspace is available.', '目前沒有獲分派的 AI 草稿工作區。')}</Notice>;

  return <div className="ai-evidence-page">
    <header className="ai-workspace-header">
      <div><p>{text('AI EVIDENCE WORKSPACE · HUMAN REVIEW REQUIRED', 'AI 佐證工作區 · 必須人工覆核')}</p><h1>{text('AI drafts and provenance', 'AI 草稿及來源記錄')}</h1><span>{text('Each media file is shown as an extract source; each student receives one assembled draft for named human review.', '每個媒體檔案均顯示為擷取來源；每位學生各有一份組合草稿供具名人員覆核。')}</span></div>
      <div className="ai-header-actions"><button disabled={!workspace.generation.available || working} onClick={generate}><Sparkle size={17} />{workspace.generation.available ? text(working ? 'Generating…' : 'Generate draft candidate', working ? '生成中…' : '生成草稿候選') : text('Local LLM not configured', '尚未設定本機 LLM')}</button><button className="primary" onClick={() => setRightTab('draft')}>{text('Review student draft', '覆核學生草稿')}</button></div>
    </header>

    <Notice tone="ai"><Brain size={19} />{text('AI output is advisory and source-linked. It never publishes a Portfolio, accepts proof or changes a rubric step.', 'AI 輸出只供參考並連繫來源；不會發布 Portfolio、接納佐證或更改 Rubric 階段。')}</Notice>

    <section className="ai-evidence-workspace">
      <aside className="ai-student-rail">
        <header><b>{text('Students', '學生')}</b><span>{students.length || manifests.length}</span></header>
        <label className="student-search"><MagnifyingGlass size={16} /><input aria-label={text('Search students', '搜尋學生')} value={studentSearch} onChange={event => setStudentSearch(event.target.value)} placeholder={text('Search students', '搜尋學生')} /></label>
        <div className="ai-student-list">{(visibleStudents.length ? visibleStudents : manifests.map(item => ({ user_id: item.student_user_id, name_en: item.student_name, name_zh: item.student_name_zh, student_number: item.student_user_id }))).map(student => {
          const manifest = manifests.find(item => item.student_user_id === student.user_id);
          const selected = workspace.student_user_id === student.user_id;
          return <button key={student.user_id} className={selected ? 'selected' : ''} disabled={!manifest} onClick={() => manifest && void load(manifest.manifest_id)}><span><b>{student.student_number}</b><strong>{isChinese ? student.name_zh : student.name_en}</strong></span><small className={manifest ? 'student-state needs-review' : 'student-state no-draft'}>{manifest ? text('Needs review', '需要覆核') : text('No draft', '沒有草稿')}</small></button>;
        })}</div>
      </aside>

      <main className="ai-ledger-panel">
        <header className="student-context"><div><h2>{isChinese ? selectedStudent?.name_zh || workspace.student_name_zh : selectedStudent?.name_en || workspace.student_name} <span>({selectedStudent?.student_number || workspace.student_user_id})</span></h2><p>{workspace.period_from} → {workspace.period_to} · {workspace.controlled_profile.replaceAll('_', ' ')}</p></div><Status value={workspace.status} /></header>
        <div className="ledger-heading"><div><h3>{text('Evidence ledger', '佐證記錄冊')}</h3><p>{text('One file-level extract is reviewed before it can contribute to the assembled student draft.', '每個檔案層級擷取結果均須先覆核，才可納入組合學生草稿。')}</p></div><div><select aria-label={text('Filter activity', '篩選活動')} value={activityFilter} onChange={event => setActivityFilter(event.target.value)}><option value="all">{text('All activities', '全部活動')}</option>{activities.map(item => <option key={item}>{item}</option>)}</select><select aria-label={text('Filter extraction status', '篩選擷取狀態')} value={statusFilter} onChange={event => setStatusFilter(event.target.value)}><option value="all">{text('All statuses', '全部狀態')}</option><option value="extracted">{text('Extracted', '已擷取')}</option><option value="needs_review">{text('Needs review', '需要覆核')}</option><option value="failed">{text('Failed', '失敗')}</option><option value="human_approved">{text('Human approved', '人工已批核')}</option></select></div></div>
        <div className="evidence-table" role="table">
          <div className="evidence-table-head" role="row"><span>{text('File', '檔案')}</span><span>{text('Activity / ID', '活動／ID')}</span><span>{text('AI extract', 'AI 擷取')}</span><span>{text('Status', '狀態')}</span><span>{text('Source / added', '來源／加入時間')}</span></div>
          {activities.filter(activity => activityFilter === 'all' || activity === activityFilter).map(activity => <section className="evidence-group" key={activity}><header><b>{activity}</b><span>{visibleFiles.filter(item => item.activityId === activity).length} {text('files', '個檔案')}</span></header>{visibleFiles.filter(item => item.activityId === activity).map(file => { const Icon = fileIcons[file.kind]; return <article key={file.id} role="row"><span className="file-cell">{file.asset ? <img src={file.asset} alt="" /> : <i><Icon size={21} /></i>}<span><b>{file.fileName}</b><small>{file.kind} · {file.id}</small></span></span><code>{file.activityId}</code><p>{file.summary}</p><Status value={file.status} /><span className="source-cell"><b>{file.source}</b><small>{file.added}</small></span></article>; })}</section>)}
        </div>
        <div className="file-api-gap"><WarningCircle size={17} /><span><b>{text('Current POC boundary', '目前 POC 邊界')}</b>{text('The protected API currently returns frozen manifest sources, not persisted per-media extraction jobs. This redesigned ledger shows the required file-level contract and is isolated from approval logic.', '受保護 API 目前只傳回已凍結輸入來源，尚未保存逐個媒體擷取工作。本頁記錄冊展示所需的檔案層級合約，並與批核邏輯分隔。')}</span></div>
      </main>

      <aside className="ai-draft-panel">
        <header><div><b>{text('Student draft', '學生草稿')}</b><Status value={workspace.narrative?.approval_status || 'not_published'} /></div><nav><button className={rightTab === 'draft' ? 'active' : ''} onClick={() => setRightTab('draft')}>{text('Draft', '草稿')}</button><button className={rightTab === 'candidates' ? 'active' : ''} onClick={() => setRightTab('candidates')}>{text('Candidates', '候選')} ({workspace.candidates.length})</button><button className={rightTab === 'history' ? 'active' : ''} onClick={() => setRightTab('history')}>{text('History', '歷史')}</button></nav></header>
        {rightTab === 'draft' && <div className="draft-tab"><p className="draft-intro">{text('Assembled from reviewed manifest sources. Edit and cite before named approval.', '由已覆核的輸入來源組合而成；具名批核前可編輯及引用來源。')}</p><textarea aria-label={text('Teacher-edited text', '教師修訂文字')} value={draftText} disabled={!workspace.access.canEditNarrative || !workspace.narrative} onChange={event => setEditedText(event.target.value)} /><div className="draft-review-state"><span><CheckCircle size={18} /><span><b>{text('Human review status', '人工覆核狀態')}</b><small>{workspace.narrative?.approval_status === 'approved' ? text('Named review completed; publication remains a separate action.', '具名覆核已完成；發布仍屬另一項獨立操作。') : text('Needs named review before publication.', '發布前需要具名覆核。')}</small></span></span><Status value={workspace.narrative?.approval_status || 'needs_review'} /></div>{workspace.access.canEditNarrative && workspace.narrative && <div className="draft-save"><Field label={text('Audited edit reason', '可稽核修改原因')}><input value={editReason} onChange={event => setEditReason(event.target.value)} placeholder={text('Why was this draft edited?', '為何修改此草稿？')} /></Field><button className="primary" disabled={!editReason.trim() || !editedText.trim()} onClick={saveNarrative}>{text('Save reviewed edit', '儲存已覆核修改')}</button></div>}<div className="included-sources"><header><b>{text('Included sources', '已包括來源')}</b><span>{workspace.sources.length}</span></header>{workspace.sources.map((source, index) => <div key={source.manifest_source_id}><span>{index + 1}</span><p><b>{source.source_id}</b><small>{isChinese ? source.summary_zh || source.summary_en : source.summary_en}</small></p><LinkSimple size={15} /></div>)}</div></div>}
        {rightTab === 'candidates' && <div className="candidate-review-tab"><Field label={text('Decision reason (required)', '決定原因（必填）')}><input value={decisionReason} onChange={event => setDecisionReason(event.target.value)} /></Field>{workspace.candidates.map(candidate => <article className="candidate-card" key={candidate.candidate_id}><header><div><b>{candidate.provider}</b><small>{candidate.model}</small></div><Status value={candidate.review_status} /></header><p>{isChinese ? candidate.generated_text_zh || candidate.generated_text_en : candidate.generated_text_en || candidate.generated_text_zh}</p><footer><button disabled={!decisionReason.trim()} onClick={() => decide(candidate.candidate_id, 'included')}><Check />{text('Use draft', '使用草稿')}</button><button disabled={!decisionReason.trim()} onClick={() => decide(candidate.candidate_id, 'rejected')}><Prohibit />{text('Reject', '拒絕')}</button></footer></article>)}</div>}
        {rightTab === 'history' && <div className="ai-history-tab"><p>{text('Manifest and candidate decisions remain immutable and separately auditable.', '輸入清單及候選決定不可改寫，並可分開稽核。')}</p>{workspace.candidates.flatMap(candidate => candidate.decisions.map(decision => <article key={decision.decision_id}><CheckCircle size={17} /><span><b>{decision.outcome}</b><small>{decision.decided_by_name || decision.decided_by_user_id} · {new Date(decision.decided_at).toLocaleString()}</small><p>{decision.reason}</p></span></article>))}</div>}
      </aside>
    </section>
  </div>;
}
