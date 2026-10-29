import { useEffect, useMemo, useState } from 'react';
import { ArrowClockwise, ArrowDown, ArrowRight, ArrowUp, CalendarDots, CheckCircle, Database, LinkSimple, NotePencil, PencilSimple, Plus, ShieldCheck, Stamp, Trash, UsersThree, Warning, X, XCircle } from '@phosphor-icons/react';
import { api } from '../api/client';
import type { Activity, ActivityReferenceData, ApprovalCandidate } from '../../shared/types';
import { Field, Notice, PageHeader, Status } from '../components/Layout';
import { useI18n } from '../i18n';

const emptyCreate = {
  titleEn: '', titleZh: '', descriptionEn: '', descriptionZh: '', activityNature: 'academic', activitySetting: 'in_class',
  subjectId: 'SUB-ENG', departmentId: 'DEPT-LANG', groupId: 'S1A-2026-27',
  startAt: '2027-02-15T09:00', endAt: '2027-02-15T10:00', location: '',
  mediaExpected: false, formVersionId: 'FV-CORE-001',
  selectedClassIds: ['S1A-2026-27'], teacherGroupIds: ['GRP-ENG-TEACHERS'],
  participantIds: ['USR-S-001'], vaskItemIds: ['AX-VASK-V1','AX-VASK-A1','AX-VASK-S1','AX-VASK-K1'], riskFlags: ['none'],
};

type DraftQuestion = { id: string; bankItemId?: string; promptEn: string; promptZh: string; abilityCode?: string; abilityNameEn?: string; abilityNameZh?: string; sourceLabelId?: string; required: boolean; custom: boolean; edited: boolean };
type SelectorKind = 'classes' | 'teachers' | 'questionBank' | null;

function labelCategory(code: string, name: string) {
  const prefix = code.trim().charAt(0).toUpperCase();
  if (['V','A','S','K'].includes(prefix)) return prefix;
  if (/self|attitude/i.test(`${code} ${name}`)) return 'A';
  if (/knowledge|community|subject/i.test(`${code} ${name}`)) return 'K';
  return 'S';
}

function recommendedQuestions(reference: ActivityReferenceData, vaskIds: string[], current: DraftQuestion[]) {
  const selected = new Set(vaskIds);
  const next = current.filter(question => question.custom || question.edited || !question.sourceLabelId || selected.has(question.sourceLabelId));
  if (!reference.questionBank.length) return next;
  vaskIds.forEach((labelId, labelIndex) => {
    if (next.some(question => question.sourceLabelId === labelId)) return;
    for (let offset = 0; offset < Math.min(2, reference.questionBank.length); offset += 1) {
      const item = reference.questionBank[(labelIndex * 2 + offset) % reference.questionBank.length];
      next.push({ id: `${labelId}:${item.bank_item_id}:${offset}`, bankItemId: item.bank_item_id, promptEn: item.prompt_en, promptZh: item.prompt_zh, abilityCode: item.ability_code, abilityNameEn: item.ability_name_en, abilityNameZh: item.ability_name_zh, sourceLabelId: labelId, required: Boolean(item.required), custom: false, edited: false });
    }
  });
  return next;
}

function initialCreate(reference: ActivityReferenceData) {
  const preferred = ['V1','A1','S1','K1'].map(code => reference.vaskItems.find(item => item.axis_code.toUpperCase() === code)?.axis_id).filter(Boolean) as string[];
  const selectedClassIds = reference.studentClasses[0] ? [reference.studentClasses[0].class_id] : [];
  return {
    ...emptyCreate,
    formVersionId: reference.forms.find(item => item.is_system_default)?.form_version_id || reference.forms[0]?.form_version_id || emptyCreate.formVersionId,
    selectedClassIds,
    teacherGroupIds: reference.teacherGroups[0] ? [reference.teacherGroups[0].staff_group_id] : [],
    groupId: selectedClassIds[0] || emptyCreate.groupId,
    participantIds: reference.studentClasses.filter(item => selectedClassIds.includes(item.class_id)).flatMap(item => item.student_ids),
    vaskItemIds: preferred.length ? preferred : reference.vaskItems[0] ? [reference.vaskItems[0].axis_id] : [],
  };
}

function SelectorDialog({ kind, reference, create, isChinese, text, onToggle, onAddQuestion, onClose }: { kind: Exclude<SelectorKind,null>; reference: ActivityReferenceData; create: typeof emptyCreate; isChinese: boolean; text: (en: string, zh: string) => string; onToggle: (value: string) => void; onAddQuestion: (bankItemId: string) => void; onClose: () => void }) {
  const title = kind === 'classes' ? text('Choose student classes', '選擇學生班別') : kind === 'teachers' ? text('Choose teacher groups', '選擇教師群組') : text('Add from question bank', '從題庫加入');
  return <div className="selector-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}><section className="selector-dialog" role="dialog" aria-modal="true" aria-label={title}><header><div><p className="eyebrow">{text('GROUP SELECTOR', '群組選擇器')}</p><h3>{title}</h3></div><button type="button" aria-label={text('Close selector', '關閉選擇器')} onClick={onClose}><X size={19}/></button></header>
    <div className="selector-options">{kind === 'classes' && reference.studentClasses.map(item => <label key={item.class_id}><input type="checkbox" checked={create.selectedClassIds.includes(item.class_id)} onChange={() => onToggle(item.class_id)}/><span><b>{isChinese ? item.name_zh : item.name_en}</b><small>{item.student_ids.length} {text('students', '名學生')}</small></span></label>)}
      {kind === 'teachers' && reference.teacherGroups.map(item => <label key={item.staff_group_id}><input type="checkbox" checked={create.teacherGroupIds.includes(item.staff_group_id)} onChange={() => onToggle(item.staff_group_id)}/><span><b>{isChinese ? item.name_zh : item.name_en}</b><small>{item.member_ids.length} {text('members', '名成員')}</small></span></label>)}
      {kind === 'questionBank' && reference.questionBank.map(item => <button type="button" className="bank-option" key={item.bank_item_id} onClick={() => onAddQuestion(item.bank_item_id)}><span><b>{isChinese ? item.prompt_zh : item.prompt_en}</b><small>{isChinese ? item.ability_name_zh : item.ability_name_en}</small></span><Plus size={17}/></button>)}</div>
    <footer><span>{text('Selections remain editable until the draft is created.', '建立草稿前仍可修改選擇。')}</span><button type="button" className="primary" onClick={onClose}>{text('Done', '完成')}</button></footer>
  </section></div>;
}

function toggle(values: string[], value: string) {
  if (value === 'none') return values.includes('none') ? [] : ['none'];
  const next = values.filter(item => item !== 'none');
  return next.includes(value) ? next.filter(item => item !== value) : [...next, value];
}

export function Activities({ report, focusActivityId, onSelectActivity, onOpenImports, onUnavailable }: { report: (error: unknown) => void; focusActivityId?: string; onSelectActivity: (activityId: string) => void; onOpenImports?: () => void; onUnavailable: () => void }) {
  const { isChinese, text, codeLabel, formatDateTime } = useI18n();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [selected, setSelected] = useState<Activity | null>(null);
  const [reference, setReference] = useState<ActivityReferenceData | null>(null);
  const [candidates, setCandidates] = useState<ApprovalCandidate[]>([]);
  const [canCreate, setCanCreate] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [create, setCreate] = useState(emptyCreate);
  const [questions, setQuestions] = useState<DraftQuestion[]>([]);
  const [selector, setSelector] = useState<SelectorKind>(null);
  const [questionFilter, setQuestionFilter] = useState('ALL');
  const [reviewMode, setReviewMode] = useState(false);
  const [reason, setReason] = useState('');
  const [proposal, setProposal] = useState('');
  const [reviewerId, setReviewerId] = useState('USR-ST-001');
  const [publisherId, setPublisherId] = useState('USR-ST-001');
  const [resolutionReasons, setResolutionReasons] = useState<Record<string,string>>({});

  async function load(selectId?: string) {
    try {
      const data = await api.activities();
      setActivities(data.items);
      setCanCreate(data.access.canCreate);
      const requestedId = selectId || focusActivityId || selected?.activity_id;
      const requested = requestedId ? data.items.find(item => item.activity_id === requestedId) || null : null;
      setSelected(requested);
      if (focusActivityId && requestedId === focusActivityId && !requested) onUnavailable();
    } catch (error) { report(error); }
  }

  useEffect(() => {
    void load();
    api.activityReferenceData().then(data => {
      setReference(data);
      const initial = initialCreate(data);
      setCreate(initial);
      setQuestions(recommendedQuestions(data, initial.vaskItemIds, []));
    }).catch(() => undefined);
    api.activityApprovalCandidates().then(data => {
      setCandidates(data);
      setReviewerId(data.find(item => item.canApprove)?.id || '');
      setPublisherId(data.find(item => item.canPublish)?.id || '');
    }).catch(() => undefined);
  }, []);

  useEffect(() => { if (focusActivityId) void load(focusActivityId); }, [focusActivityId]);

  const resolvedPeriod = useMemo(() => reference?.periods.find(item => item.start_date <= create.startAt.slice(0, 10) && item.end_date >= create.endAt.slice(0, 10)), [reference, create.startAt, create.endAt]);
  const displayVaskItems = useMemo(() => {
    const coded = reference?.vaskItems.filter(item => /^[VASK]\d+$/i.test(item.axis_code)) || [];
    return coded.length ? coded : reference?.vaskItems || [];
  }, [reference]);

  async function createActivity(event: React.FormEvent) {
    event.preventDefault();
    if (!reference) return;
    try {
      const participantIds = [...new Set(reference.studentClasses.filter(item => create.selectedClassIds.includes(item.class_id)).flatMap(item => item.student_ids))];
      const item = await api.createActivity({ ...create, groupId: create.selectedClassIds[0] || null, participantIds, riskFlags: create.activitySetting === 'outside_school' ? ['off_site'] : create.riskFlags, questionnaire: questions.map(question => ({ bankItemId: question.bankItemId, promptEn: question.promptEn, promptZh: question.promptZh, required: question.required, abilityCode: question.abilityCode, abilityNameEn: question.abilityNameEn, abilityNameZh: question.abilityNameZh, suggestedByVaskLabelId: question.sourceLabelId })) });
      setShowCreate(false);
      const reset = initialCreate(reference);
      setCreate(reset);
      setQuestions(recommendedQuestions(reference, reset.vaskItemIds, []));
      setReviewMode(false);
      onSelectActivity(item.activity_id);
      await load(item.activity_id);
    } catch (error) { report(error); }
  }

  function toggleVask(labelId: string) {
    if (!reference) return;
    const vaskItemIds = create.vaskItemIds.includes(labelId) ? create.vaskItemIds.filter(id => id !== labelId) : [...create.vaskItemIds, labelId];
    setCreate({ ...create, vaskItemIds });
    setQuestions(current => recommendedQuestions(reference, vaskItemIds, current));
  }

  function toggleSelectorValue(value: string) {
    if (selector === 'classes') setCreate({ ...create, selectedClassIds: toggle(create.selectedClassIds, value) });
    if (selector === 'teachers') setCreate({ ...create, teacherGroupIds: toggle(create.teacherGroupIds, value) });
  }

  function addBankQuestion(bankItemId: string) {
    const item = reference?.questionBank.find(candidate => candidate.bank_item_id === bankItemId);
    if (!item) return;
    setQuestions(current => [...current, { id: `bank:${bankItemId}:${Date.now()}`, bankItemId, promptEn: item.prompt_en, promptZh: item.prompt_zh, abilityCode: item.ability_code, abilityNameEn: item.ability_name_en, abilityNameZh: item.ability_name_zh, required: Boolean(item.required), custom: true, edited: false }]);
    setSelector(null);
  }

  function updateQuestion(id: string, patch: Partial<DraftQuestion>) { setQuestions(current => current.map(question => question.id === id ? { ...question, ...patch, edited: true } : question)); }
  function moveQuestion(id: string, direction: -1 | 1) { setQuestions(current => { const index = current.findIndex(question => question.id === id), target = index + direction; if (index < 0 || target < 0 || target >= current.length) return current; const next = [...current]; [next[index], next[target]] = [next[target], next[index]]; return next; }); }
  function addCustomQuestion() { setQuestions(current => [...current, { id: `custom:${Date.now()}`, promptEn: 'Write a new reflection question', promptZh: '新增反思題目', required: false, custom: true, edited: true }]); }
  async function revise() {
    if (!selected) return;
    try {
      await api.reviseActivity(selected.activity_id, isChinese ? { descriptionZh: proposal || selected.latestRevision.description_zh, reason } : { descriptionEn: proposal || selected.latestRevision.description_en, reason });
      setReason(''); setProposal(''); await load(selected.activity_id);
    } catch (error) { report(error); }
  }
  async function requestChange() {
    if (!selected) return;
    try {
      await api.requestActivityChange(selected.activity_id, { fieldKey: isChinese ? 'description_zh' : 'description_en', proposedValue: proposal, reason });
      setReason(''); setProposal(''); await load(selected.activity_id);
    } catch (error) { report(error); }
  }
  async function submit() {
    if (!selected) return;
    try { await api.submitActivity(selected.activity_id, reviewerId, publisherId); await load(selected.activity_id); }
    catch (error) { report(error); }
  }
  async function withdraw() {
    if (!selected) return;
    try { await api.withdrawActivity(selected.activity_id, reason); setReason(''); await load(selected.activity_id); }
    catch (error) { report(error); }
  }
  async function resolveRequest(requestId: string, outcome: 'accepted' | 'rejected') {
    if (!selected) return;
    try {
      await api.resolveActivityChange(selected.activity_id, requestId, { outcome, reason: resolutionReasons[requestId] || text('Reviewed against the current activity record.', '已按現行活動紀錄完成覆核。') });
      await load(selected.activity_id);
    } catch (error) { report(error); }
  }

  const participantCount = selected?.people.filter(item => item.relationship_type === 'participant').length || 0;
  const workflowIndex = selected ? (selected.latestRevision.publication_status === 'published' ? 4 : selected.latestRevision.approval_status === 'approved' ? 3 : selected.latestRevision.approval_status === 'pending_review' ? 2 : 1) : 0;

  return <>
    <PageHeader kicker={text('INPUT · ACTIVITY PACKAGE · TRACEABLE HAND-OFF', '輸入 · 活動資料套件 · 可追溯交接')} title={text('Activities and status', '活動及狀態')} description={text('Create the complete package, see who made it, and follow the named reviewer and publisher without losing the stable activity record.', '建立完整活動資料套件，查看建立者，並追蹤具名覆核人及發布人，同時保留穩定的活動紀錄。')} action={canCreate ? <button className="primary" onClick={() => setShowCreate(value => !value)}><Plus size={17} />{text('New activity', '新增活動')}</button> : undefined} />

    {showCreate && reference && <form className="activity-editor activity-builder-v2" onSubmit={createActivity}>
      <div className="editor-heading"><div><p className="eyebrow">{text('NEW ACTIVITY · TRACEABLE DRAFT', '新增活動 · 可追溯草稿')}</p><h2>{text('Build an activity and its questionnaire', '建立活動及問卷')}</h2><span>{text('The active VASK labels suggest questions from the approved bank. You remain in control of the final questionnaire.', '生效 VASK 標籤會從已批核題庫建議題目；最終問卷仍由你決定。')}</span></div><button type="button" className="text-action" onClick={() => { setShowCreate(false); setReviewMode(false); }}>{text('Cancel', '取消')}</button></div>

      <section className="activity-identity-panel">
        <div className="identity-title-grid"><Field label={text('Activity name (English)', '活動名稱（英文）')}><input required value={create.titleEn} onChange={event => setCreate({ ...create, titleEn: event.target.value })}/></Field><Field label={text('Activity name (Chinese)', '活動名稱（中文）')}><input required value={create.titleZh} onChange={event => setCreate({ ...create, titleZh: event.target.value })}/></Field></div>
        <div className="identity-description-grid"><Field label={text('Description (English)', '活動簡介（英文）')}><textarea required rows={2} value={create.descriptionEn} onChange={event => setCreate({ ...create, descriptionEn: event.target.value })}/></Field><Field label={text('Description (Chinese)', '活動簡介（中文）')}><textarea rows={2} value={create.descriptionZh} onChange={event => setCreate({ ...create, descriptionZh: event.target.value })}/></Field></div>
        <div className="identity-detail-grid"><Field label={text('Start', '開始時間')}><input required type="datetime-local" value={create.startAt} onChange={event => setCreate({ ...create, startAt: event.target.value })}/></Field><Field label={text('End', '完結時間')}><input required type="datetime-local" value={create.endAt} onChange={event => setCreate({ ...create, endAt: event.target.value })}/></Field><Field label={text('Location', '地點')}><input value={create.location} onChange={event => setCreate({ ...create, location: event.target.value })}/></Field><Field label={text('Subject', '科目')}><select value={create.subjectId} onChange={event => setCreate({ ...create, subjectId: event.target.value })}>{reference.subjects.map(item => <option value={item.subject_id} key={item.subject_id}>{isChinese ? item.name_zh : item.name_en}</option>)}</select></Field></div>
        <div className="classification-row"><fieldset><legend>{text('Primary nature', '主要性質')}</legend>{[['academic','Academic','學術'],['non_academic','Non-academic','非學術']].map(item => <label className={create.activityNature === item[0] ? 'classification selected' : 'classification'} key={item[0]}><input type="radio" name="activity-nature" checked={create.activityNature === item[0]} onChange={() => setCreate({ ...create, activityNature: item[0] })}/>{text(item[1],item[2])}</label>)}</fieldset><fieldset><legend>{text('Activity setting', '活動場景')}</legend>{[['in_class','In-class','課堂內'],['out_of_class','Out-of-class','課堂外'],['outside_school','Outside school','校外']].map(item => <label className={create.activitySetting === item[0] ? 'classification selected' : 'classification'} key={item[0]}><input type="radio" name="activity-setting" checked={create.activitySetting === item[0]} onChange={() => setCreate({ ...create, activitySetting: item[0], riskFlags: item[0] === 'outside_school' ? ['off_site'] : ['none'] })}/>{text(item[1],item[2])}</label>)}</fieldset></div>
        <div className="people-selector-row"><div><span>{text('Student classes', '學生班別')}</span><div className="selection-chips">{create.selectedClassIds.map(id => { const item = reference.studentClasses.find(candidate => candidate.class_id === id); return item ? <em key={id}>{isChinese ? item.name_zh : item.name_en}<button type="button" aria-label={text('Remove class', '移除班別')} onClick={() => setCreate({ ...create, selectedClassIds: create.selectedClassIds.filter(value => value !== id) })}><X size={12}/></button></em> : null; })}</div><button type="button" className="selector-trigger" onClick={() => setSelector('classes')}><UsersThree size={16}/>{text('Choose classes', '選擇班別')}</button></div><div><span>{text('Teacher groups', '教師群組')}</span><div className="selection-chips">{create.teacherGroupIds.map(id => { const item = reference.teacherGroups.find(candidate => candidate.staff_group_id === id); return item ? <em key={id}>{isChinese ? item.name_zh : item.name_en}<button type="button" aria-label={text('Remove teacher group', '移除教師群組')} onClick={() => setCreate({ ...create, teacherGroupIds: create.teacherGroupIds.filter(value => value !== id) })}><X size={12}/></button></em> : null; })}</div><button type="button" className="selector-trigger" onClick={() => setSelector('teachers')}><UsersThree size={16}/>{text('Choose teacher groups', '選擇教師群組')}</button></div></div>
        <div className={resolvedPeriod ? 'period-resolution valid' : 'period-resolution invalid'}><CalendarDots size={19}/><span><b>{resolvedPeriod ? (isChinese ? resolvedPeriod.name_zh : resolvedPeriod.name_en) : text('No single reporting period', '未能對應單一學段')}</b><small>{resolvedPeriod ? `${resolvedPeriod.start_date} → ${resolvedPeriod.end_date} · ${resolvedPeriod.period_id}` : text('The activity must fit inside one configured period.', '活動必須完整位於同一個已設定學段。')}</small></span></div>
      </section>

      {!reviewMode ? <div className="question-builder-grid">
        <section className="vask-label-pane"><div className="active-labelling-banner"><ShieldCheck size={20}/><span><b>{text(`Default labelling · ${reference.activeLabelling?.code || 'VASK'} v${reference.activeLabelling?.version || '1.0'}`, `預設標籤 · ${reference.activeLabelling?.code || 'VASK'} v${reference.activeLabelling?.version || '1.0'}`)}</b><small>{text('Managed by SchoolAdmin · automatically used for new activities', '由 SchoolAdmin 管理 · 新增活動時自動套用')}</small></span></div><h3>{text('Choose VASK labels', '選擇 VASK 標籤')}</h3><p>{text('Labels describe the activity’s intended development areas. They are not assessment results.', '標籤描述活動期望發展的範疇，並不是評估結果。')}</p>
          {['V','A','S','K'].map(category => <div className={`vask-group vask-${category.toLowerCase()}`} key={category}><header><b>{category}</b><span>{text(category === 'V' ? 'Values' : category === 'A' ? 'Attitudes' : category === 'S' ? 'Skills' : 'Knowledge', category === 'V' ? '價值觀' : category === 'A' ? '態度' : category === 'S' ? '技能' : '知識')}</span><small>{displayVaskItems.filter(item => create.vaskItemIds.includes(item.axis_id) && labelCategory(item.axis_code,item.name_en) === category).length} {text('selected', '項已選')}</small></header>{displayVaskItems.filter(item => labelCategory(item.axis_code,item.name_en) === category).map(item => <label className={create.vaskItemIds.includes(item.axis_id) ? 'selected' : ''} key={item.axis_id}><input type="checkbox" checked={create.vaskItemIds.includes(item.axis_id)} onChange={() => toggleVask(item.axis_id)}/><em>{item.axis_code}</em><span>{isChinese ? item.name_zh : item.name_en}</span></label>)}</div>)}
        </section>

        <section className="questionnaire-pane"><header><div><h3>{text('Build questionnaire', '建立問卷')}</h3><p>{text('Questions are suggested from the active question bank. Edit them or add your own.', '題目由生效題庫提供建議；你可修改或自行新增。')}</p></div></header><div className="question-suggestion-note"><NotePencil size={20}/><span><b>{text(`${questions.length} suggested questions from ${create.vaskItemIds.length} selected VASK labels`, `已按 ${create.vaskItemIds.length} 個 VASK 標籤建議 ${questions.length} 條題目`)}</b><small>{text('Suggestions use question metadata. They are editable recommendations—not assessment mappings.', '建議按題目資料產生，可自由修改，並非評估對應。')}</small></span></div>
          <div className="question-filter"><span>{text('Filter by label', '按標籤篩選')}</span>{['ALL','V','A','S','K'].map(filter => <button type="button" className={questionFilter === filter ? 'selected' : ''} onClick={() => setQuestionFilter(filter)} key={filter}>{filter === 'ALL' ? text(`All (${questions.length})`,`全部 (${questions.length})`) : `${filter} (${questions.filter(question => { const label = reference.vaskItems.find(item => item.axis_id === question.sourceLabelId); return label && labelCategory(label.axis_code,label.name_en) === filter; }).length})`}</button>)}</div>
          <div className="question-list"><div className="question-row heading"><span>#</span><span>{text('Question', '題目')}</span><span>{text('Suggested by', '建議標籤')}</span><span>{text('Required', '必答')}</span><span>{text('Actions', '操作')}</span></div>{questions.map((question,index) => {
            const source = reference.vaskItems.find(item => item.axis_id === question.sourceLabelId); const category = source ? labelCategory(source.axis_code,source.name_en) : 'custom'; const visible = questionFilter === 'ALL' || category === questionFilter; return visible ? <div className="question-row" key={question.id}><span className="question-order"><b>{index + 1}</b><button type="button" disabled={index === 0} aria-label={text('Move question up', '題目上移')} onClick={() => moveQuestion(question.id,-1)}><ArrowUp size={12}/></button><button type="button" disabled={index === questions.length - 1} aria-label={text('Move question down', '題目下移')} onClick={() => moveQuestion(question.id,1)}><ArrowDown size={12}/></button></span><input aria-label={`${text('Question','題目')} ${index + 1}`} value={isChinese ? question.promptZh : question.promptEn} onChange={event => updateQuestion(question.id,isChinese ? {promptZh:event.target.value}:{promptEn:event.target.value})}/><span className={`source-label source-${String(category).toLowerCase()}`}>{source ? `${source.axis_code} · ${isChinese ? source.name_zh : source.name_en}` : text('Custom','自訂')}</span><select aria-label={`${text('Required','必答')} ${index + 1}`} value={question.required ? 'required' : 'optional'} onChange={event => updateQuestion(question.id,{required:event.target.value === 'required'})}><option value="required">{text('Required','必答')}</option><option value="optional">{text('Optional','選答')}</option></select><span className="question-actions"><button type="button" aria-label={text('Edit question', '修改題目')} onClick={() => document.querySelector<HTMLInputElement>(`input[aria-label='${text('Question','題目')} ${index + 1}']`)?.focus()}><PencilSimple size={15}/></button><button type="button" className="danger" aria-label={text('Remove question', '移除題目')} onClick={() => setQuestions(current => current.filter(item => item.id !== question.id))}><Trash size={15}/></button></span></div> : null;
          })}</div>
          <div className="question-add-actions"><button type="button" onClick={() => setSelector('questionBank')}><Plus size={17}/>{text('Add from question bank', '從題庫加入')}</button><button type="button" className="primary" onClick={addCustomQuestion}><Plus size={17}/>{text('Write new question', '撰寫新題目')}</button></div>
        </section>
      </div> : <section className="activity-review-panel"><header><div><p className="eyebrow">{text('REVIEW BEFORE DRAFT', '建立草稿前覆核')}</p><h3>{text('Check the activity package', '檢查活動資料套件')}</h3></div><button type="button" onClick={() => setReviewMode(false)}>{text('Back to edit', '返回修改')}</button></header><div className="review-summary-grid"><article><span>{text('Activity', '活動')}</span><b>{isChinese ? create.titleZh : create.titleEn}</b><small>{create.startAt.replace('T',' ')} → {create.endAt.replace('T',' ')}</small></article><article><span>{text('Classification', '活動分類')}</span><b>{text(create.activityNature === 'academic' ? 'Academic' : 'Non-academic',create.activityNature === 'academic' ? '學術' : '非學術')} · {text(create.activitySetting === 'in_class' ? 'In-class' : create.activitySetting === 'out_of_class' ? 'Out-of-class' : 'Outside school',create.activitySetting === 'in_class' ? '課堂內' : create.activitySetting === 'out_of_class' ? '課堂外' : '校外')}</b><small>{resolvedPeriod ? (isChinese ? resolvedPeriod.name_zh : resolvedPeriod.name_en) : text('Period unresolved','學段未確定')}</small></article><article><span>{text('People', '參與人員')}</span><b>{create.selectedClassIds.length} {text('classes','個班別')} · {create.teacherGroupIds.length} {text('teacher groups','個教師群組')}</b><small>{[...new Set(reference.studentClasses.filter(item => create.selectedClassIds.includes(item.class_id)).flatMap(item => item.student_ids))].length} {text('students','名學生')}</small></article><article><span>{text('VASK and form', 'VASK 及表格')}</span><b>{create.vaskItemIds.length} {text('labels','個標籤')} · {questions.length} {text('questions','條題目')}</b><small>{text('Questionnaire will be saved as a successor draft form requiring separate approval.','問卷會保存為後繼表格草稿，並須另行批核。')}</small></article></div><Notice tone="warning">{text('Creating this draft does not publish the activity or questionnaire. Form approval, activity approval and publication remain separate audited actions.', '建立草稿不會發布活動或問卷；表格批核、活動批核及發布仍是分開並可稽核的操作。')}</Notice></section>}

      <div className="activity-builder-footer"><span><b>{questions.length} {text('questions', '條題目')}</b> · {text(`approx. ${Math.max(2,Math.ceil(questions.length * .75))} min`, `約 ${Math.max(2,Math.ceil(questions.length * .75))} 分鐘`)}</span><div>{reviewMode ? <><button type="button" onClick={() => setReviewMode(false)}>{text('Back to edit', '返回修改')}</button><button type="button" className="primary" onClick={event => event.currentTarget.form?.requestSubmit()} disabled={!resolvedPeriod || !create.titleEn || !create.titleZh || !create.descriptionEn || !create.selectedClassIds.length || !create.teacherGroupIds.length || !create.vaskItemIds.length || !questions.length}>{text('Create activity draft', '建立活動草稿')}<ArrowRight size={16}/></button></> : <><button type="submit" disabled={!resolvedPeriod || !create.titleEn || !create.titleZh || !create.descriptionEn || !create.selectedClassIds.length || !create.teacherGroupIds.length || !create.vaskItemIds.length || !questions.length}>{text('Save draft', '儲存草稿')}</button><button type="button" className="primary" disabled={!resolvedPeriod || !create.titleEn || !create.titleZh || !create.descriptionEn || !create.selectedClassIds.length || !create.teacherGroupIds.length || !create.vaskItemIds.length || !questions.length} onClick={() => setReviewMode(true)}>{text('Review activity', '覆核活動')}<ArrowRight size={16}/></button></>}</div></div>
      {selector && <SelectorDialog kind={selector} reference={reference} create={create} isChinese={isChinese} text={text} onToggle={toggleSelectorValue} onAddQuestion={addBankQuestion} onClose={() => setSelector(null)}/>}
    </form>}

    <div className="activity-summary-strip">
      <span><b>{activities.length}</b>{text('visible activities', '項可見活動')}</span>
      <span><b>{activities.filter(item => item.latestRevision.approval_status === 'pending_review').length}</b>{text('awaiting review', '項等待覆核')}</span>
      <span><b>{activities.filter(item => item.currentApprovedRevision?.publication_status === 'published').length}</b>{text('published records', '項已發布紀錄')}</span>
    </div>

    <div className="activity-workspace">
      <section className="activity-list-panel">
        {activities.map((item, index) => <button className={selected?.activity_id === item.activity_id ? 'activity-row-v1 selected' : 'activity-row-v1'} key={item.activity_id} onClick={() => { setSelected(item); onSelectActivity(item.activity_id); }}>
          <span className="activity-index">{String(index + 1).padStart(2, '0')}</span>
          <span className="activity-row-main"><b>{isChinese ? item.latestRevision.title_zh || item.latestRevision.title_en : item.latestRevision.title_en}</b><small>{item.created_by_name ? `${text('Created by', '建立者')} ${isChinese ? item.created_by_name_zh : item.created_by_name}` : item.activity_id}</small><span className="row-tags"><em>{item.resolved_period_id}</em><em>{text('rev.', '修訂')} {item.latestRevision.revision_number}</em></span></span>
          <span className="activity-row-state"><Status value={item.latestRevision.approval_status} /><Status value={item.latestRevision.publication_status} /></span>
          <ArrowRight size={16} />
        </button>)}
        {!activities.length && <Notice>{text('No activity is visible for this account.', '此帳戶目前沒有可見活動。')}</Notice>}
      </section>

      <section className="activity-detail-panel">{selected ? <>
        <div className="record-banner">
          <div><p className="mono">{selected.activity_id}</p><h2>{isChinese ? selected.latestRevision.title_zh || selected.latestRevision.title_en : selected.latestRevision.title_en}</h2><span>{isChinese ? selected.latestRevision.description_zh || selected.latestRevision.description_en : selected.latestRevision.description_en}</span></div>
          <div className="record-status"><Status value={selected.operational_status} /><small>{selected.resolved_period_id}</small>{selected.access.canEdit && selected.latestRevision.publication_status !== 'published' && onOpenImports && <button className="copy-link" onClick={onOpenImports}><Database size={15} />{text('Import roster', '匯入名冊')}</button>}<button className="copy-link" onClick={() => void navigator.clipboard.writeText(`${window.location.origin}/activities/${encodeURIComponent(selected.activity_id)}`)}><LinkSimple size={15} />{text('Copy activity link', '複製活動連結')}</button></div>
        </div>

        <div className="activity-flow">
          {[
            [text('Package', '資料套件'), text('Owner prepares', '由負責人建立')],
            [text('Approval', '批核'), text('Named reviewer', '具名覆核人')],
            [text('Publication', '發布'), text('Named publisher', '具名發布人')],
            [text('Student view', '學生檢視'), text('Official record', '正式紀錄')],
          ].map((step, index) => <div className={workflowIndex > index ? 'done' : workflowIndex === index + 1 ? 'active' : ''} key={step[0]}><span>{workflowIndex > index ? <CheckCircle size={18} weight="fill" /> : index + 1}</span><b>{step[0]}</b><small>{step[1]}</small></div>)}
        </div>

        <div className="record-facts">
          <div><span>{text('Made by / owner', '建立者／負責人')}</span><b>{isChinese ? selected.latestRevision.owner_name_zh || selected.latestRevision.owner_name : selected.latestRevision.owner_name}</b></div>
          <div><span>{text('Activity dates', '活動日期')}</span><b>{formatDateTime(selected.latestRevision.start_at)} → {formatDateTime(selected.latestRevision.end_at)}</b></div>
          <div><span>{text('Participants', '參與學生')}</span><b>{participantCount}</b></div>
          <div><span>{text('Exact form', '指定表格')}</span><b>{selected.latestRevision.requested_form_version_id || text('Not assigned', '未分派')}</b></div>
        </div>

        <div className="package-columns">
          <section><h3>{text('VASK intentions', 'VASK 意向')}</h3><div className="tag-row">{selected.vaskItems.map(item => <span className="tag" key={item.vask_item_id}>{isChinese ? item.name_zh : item.name_en}<em>{codeLabel(item.approval_state)}</em></span>)}</div>{!selected.vaskItems.length && <small>{text('No VASK intention is visible.', '未有可見 VASK 意向。')}</small>}</section>
          <section><h3>{text('Risk / collection', '風險／收集')}</h3><div className="tag-row">{selected.riskFlags.map(item => <span className="tag role" key={item}>{codeLabel(item)}</span>)}</div>{!selected.riskFlags.length && <small>{text('Restricted from the student view.', '學生檢視不會顯示內部風險資料。')}</small>}</section>
          <section><h3>{text('People relationship', '人員關係')}</h3><div className="tag-row">{selected.people.filter(item => item.relationship_type !== 'participant').map(item => <span className="tag" key={item.user_id}>{isChinese ? item.name_zh : item.name_en}<em>{codeLabel(item.relationship_type)}</em></span>)}</div>{selected.people.filter(item => item.relationship_type === 'participant').map(item => <span className="tag role" key={item.user_id}>{isChinese ? item.name_zh : item.name_en}<em>{codeLabel(item.planned_attendance_status)}</em></span>)}</section>
        </div>

        <div className="revision-compare">
          <article><p>{text('Current approved / official fallback', '現行已批核／正式後備版本')}</p>{selected.currentApprovedRevision ? <><b>{text('Revision', '修訂')} {selected.currentApprovedRevision.revision_number}</b><span>{isChinese ? selected.currentApprovedRevision.description_zh || selected.currentApprovedRevision.description_en : selected.currentApprovedRevision.description_en}</span><div><Status value={selected.currentApprovedRevision.approval_status} /> <Status value={selected.currentApprovedRevision.publication_status} /></div></> : <Notice tone="warning">{text('No approved revision yet.', '尚未有已批核修訂。')}</Notice>}</article>
          <article><p>{text('Latest working revision', '最新工作修訂')}</p><b>{text('Revision', '修訂')} {selected.latestRevision.revision_number}</b><span>{isChinese ? selected.latestRevision.description_zh || selected.latestRevision.description_en : selected.latestRevision.description_en}</span><div><Status value={selected.latestRevision.approval_status} /> <Status value={selected.latestRevision.publication_status} /></div></article>
        </div>

        {(selected.access.canEdit || selected.access.canRequestChange) && selected.latestRevision.approval_status !== 'pending_review' && <section className="action-panel">
          <div><p className="eyebrow">{selected.access.canEdit ? text('MATERIAL SUCCESSOR', '實質後續修訂') : text('CONTROLLED CHANGE REQUEST', '受控修改要求')}</p><h3>{selected.access.canEdit ? text('Create an immutable successor', '建立不可改寫的後續修訂') : text('Ask the owner to correct this record', '要求負責人修正紀錄')}</h3></div>
          <div className="action-grid"><Field label={text('Proposed description', '建議說明')}><textarea value={proposal} onChange={event => setProposal(event.target.value)} /></Field><Field label={text('Reason', '原因')}><input value={reason} onChange={event => setReason(event.target.value)} /></Field><button disabled={!proposal || !reason} onClick={selected.access.canEdit ? revise : requestChange}>{selected.access.canEdit ? <><ArrowClockwise size={16} />{text('Create successor', '建立後續修訂')}</> : <><NotePencil size={16} />{text('Send request', '送出要求')}</>}</button></div>
        </section>}

        {selected.access.canWithdraw && <section className="withdraw-strip"><Warning size={22} /><div><b>{text('Pending revisions are locked', '待批修訂已鎖定')}</b><span>{text('Withdraw the named assignment before creating a corrected successor.', '建立修正後續版本前，須先撤回具名批核分派。')}</span></div><input value={reason} onChange={event => setReason(event.target.value)} placeholder={text('Withdrawal reason', '撤回原因')} /><button disabled={!reason} onClick={withdraw}>{text('Withdraw revision', '撤回修訂')}</button></section>}

        {selected.changeRequests.length > 0 && <section className="request-list"><div className="section-heading"><div><p className="eyebrow">{text('OWNER ACTION', '負責人操作')}</p><h3>{text('Change requests', '修改要求')}</h3></div></div>{selected.changeRequests.map(item => <article key={item.activity_change_request_id}><div><b>{isChinese ? item.requester_name_zh || item.requester_name : item.requester_name}</b><span>{codeLabel(item.field_key)} · {item.proposed_value}</span><small>{item.reason}</small></div><Status value={item.status} />{item.status === 'open' && selected.access.canResolveChangeRequest && <div className="request-actions"><input value={resolutionReasons[item.activity_change_request_id] || ''} onChange={event => setResolutionReasons({ ...resolutionReasons, [item.activity_change_request_id]: event.target.value })} placeholder={text('Resolution reason', '處理原因')} /><button onClick={() => resolveRequest(item.activity_change_request_id, 'accepted')}><CheckCircle size={16} />{text('Accept into successor', '接納並建立後續修訂')}</button><button className="danger" onClick={() => resolveRequest(item.activity_change_request_id, 'rejected')}><XCircle size={16} />{text('Reject', '拒絕')}</button></div>}{item.resolution_note && <small>{item.resolution_note}</small>}</article>)}</section>}

        {selected.access.canSubmit && selected.latestRevision.approval_status === 'draft' && <section className="submit-strip activity-submit">
          <div><p className="eyebrow">{text('NAMED HAND-OFF', '具名交接')}</p><h3>{text('Send revision for approval, then publication', '提交修訂作批核，其後再發布')}</h3><small>{text('The two decisions remain separate and auditable even when the same eligible person is selected.', '即使選擇同一名合資格人員，兩項決定仍會分開並保留稽核紀錄。')}</small></div>
          <Field label={text('Named reviewer', '具名覆核人')}><select value={reviewerId} onChange={event => setReviewerId(event.target.value)}>{candidates.filter(item => item.canApprove).map(item => <option key={item.id} value={item.id}>{isChinese ? item.nameZh : item.name}</option>)}</select></Field>
          <Field label={text('Named publisher', '具名發布人')}><select value={publisherId} onChange={event => setPublisherId(event.target.value)}>{candidates.filter(item => item.canPublish).map(item => <option key={item.id} value={item.id}>{isChinese ? item.nameZh : item.name}</option>)}</select></Field>
          <button className="primary" disabled={!reviewerId || !publisherId} onClick={submit}><Stamp size={17} />{text('Submit revision', '提交修訂')}</button>
        </section>}

        {selected.approvalHistory.length > 0 && <section className="approval-timeline"><div className="section-heading"><div><p className="eyebrow">{text('WHO CAN FIND AND ACT', '誰可找到並處理')}</p><h3>{text('Approval and publication history', '批核及發布紀錄')}</h3></div></div>{selected.approvalHistory.map(item => <div className="timeline-row" key={item.approval_assignment_id}><span /><div><div className="timeline-head"><b>{isChinese ? item.step_name_zh || item.step_name : item.step_name}</b><Status value={item.status} /></div><p>{text('Assigned to', '獲分派予')} {isChinese ? item.assignee_name_zh || item.assignee_name : item.assignee_name} · {item.target_version_id}</p>{item.decision_reason && <blockquote>{item.decision_reason}</blockquote>}<small>{item.decided_at ? formatDateTime(item.decided_at) : `${text('Due', '期限')} ${formatDateTime(item.due_at)}`}</small></div></div>)}</section>}
      </> : <div className="activity-empty"><UsersThree size={34} /><h2>{text('Select an activity record', '選擇活動紀錄')}</h2><p>{text('Inspect its creator, package, named assignments, decisions and official fallback revision.', '查看建立者、資料套件、具名分派、決定及正式後備修訂。')}</p></div>}</section>
    </div>
  </>;
}
