import { useEffect, useMemo, useState } from 'react';
import { CheckCircle, ClipboardText, PaperPlaneTilt, Plus, UserFocus, XCircle } from '@phosphor-icons/react';
import { api } from '../api/client';
import type { AssessmentActivitySummary, AssessmentDetail, AssessmentSubmission } from '../../shared/types';
import { Field, Notice, PageHeader, Status } from '../components/Layout';
import { useI18n } from '../i18n';

const emptyTeacher = { teacherStrength: '', teacherDevelopment: '', teacherSupport: '', axisId: 'AX-SB-LISTEN', observedStep: '', consistency: '', observationComment: '', suggestedNextStep: '', reviewReason: '' };

export function Assessments({ report, focusActivityId, focusStudentId, onSelectAssessment, onUnavailable }: { report: (error: unknown) => void; focusActivityId?: string; focusStudentId?: string; onSelectAssessment: (activityId: string, studentId: string) => void; onUnavailable: () => void }) {
  const { isChinese, text, codeLabel, formatDateTime } = useI18n();
  const [activities, setActivities] = useState<AssessmentActivitySummary[]>([]);
  const [activityId, setActivityId] = useState('');
  const [studentId, setStudentId] = useState('');
  const [detail, setDetail] = useState<AssessmentDetail | null>(null);
  const [teacher, setTeacher] = useState(emptyTeacher);
  const [cited, setCited] = useState<string[]>([]);
  const [reviewReasons, setReviewReasons] = useState<Record<string,string>>({});
  const [peerReviewerId, setPeerReviewerId] = useState('');

  async function open(nextActivityId: string, nextStudentId: string, push = true) {
    try {
      const value = await api.assessmentDetail(nextActivityId, nextStudentId);
      setActivityId(nextActivityId); setStudentId(nextStudentId); setDetail(value);
      setPeerReviewerId(value.participants.find(item => item.user_id !== nextStudentId)?.user_id || '');
      setTeacher(current => ({ ...current, axisId: value.skillAxes[0]?.axis_id || current.axisId }));
      if (push) onSelectAssessment(nextActivityId, nextStudentId);
    } catch (error) { report(error); }
  }
  async function load() {
    try {
      const rows = await api.assessmentWorkspace(); setActivities(rows);
      const targetActivity = rows.find(item => item.activity_id === focusActivityId) || rows[0];
      const targetStudent = targetActivity?.participants.find(item => item.user_id === focusStudentId) || targetActivity?.participants[0];
      if ((focusActivityId || focusStudentId) && (!targetActivity || !targetStudent)) { onUnavailable(); return; }
      if (targetActivity && targetStudent) await open(targetActivity.activity_id, targetStudent.user_id, false);
    } catch (error) { report(error); }
  }
  useEffect(() => {
    if (focusActivityId && focusStudentId && detail?.activity.activity_id === focusActivityId && detail.student.user_id === focusStudentId) return;
    void load();
  }, [focusActivityId, focusStudentId]);
  const sourceSubmissions = useMemo(() => detail?.recipients.filter(item => ['student_self_report','peer_observation'].includes(item.perspective) && item.latestSubmission).map(item => item.latestSubmission!) || [], [detail]);
  async function reviewSubmission(submission: AssessmentSubmission, outcome: 'approved' | 'changes_requested' | 'rejected') {
    try {
      await api.reviewAssessmentSubmission(submission.assessment_submission_id, { outcome, reason: reviewReasons[submission.assessment_submission_id] || text('Reviewed in the named activity assessment.', '已在具名活動評估中完成覆核。') });
      await open(activityId, studentId, false);
    } catch (error) { report(error); }
  }
  async function assignPeer() {
    if (!detail || !peerReviewerId) return;
    try { const value = await api.assignPeerReview(activityId, { subjectId: studentId, reviewerId: peerReviewerId }); setDetail(value); }
    catch (error) { report(error); }
  }
  async function submitTeacher(event: React.FormEvent) {
    event.preventDefault();
    try {
      const value = await api.submitTeacherAssessment(activityId, studentId, { ...teacher, citedSubmissionIds: cited });
      setDetail(value); setTeacher({ ...emptyTeacher, axisId: value.skillAxes[0]?.axis_id || 'AX-SB-LISTEN' }); setCited([]);
    } catch (error) { report(error); }
  }
  return <>
    <PageHeader kicker={text('TEACHER · SELF · PEER KEPT SEPARATE', '老師 · 自評 · 同儕分開保存')} title={text('Activity assessment', '活動評估')} description={text('The named activity assessor reviews self and peer responses, writes teacher feedback, and may add a proof-linked 1–16 observation. Nothing here publishes a skill step automatically.', '具名活動評估人覆核自評及同儕回應、撰寫老師回饋，並可加入連繫佐證的 1–16 階段觀察；本頁任何操作均不會自動發布技能階段。')} />
    <div className="assessment-workspace">
      <aside className="assessment-scope">{activities.map(activity => <section key={activity.activity_id}><h3>{isChinese ? activity.title_zh || activity.title_en : activity.title_en}</h3>{activity.participants.map(student => <button className={activityId === activity.activity_id && studentId === student.user_id ? 'selected' : ''} key={student.user_id} onClick={() => void open(activity.activity_id, student.user_id)}><span><b>{isChinese ? student.name_zh : student.name_en}</b><small>{student.student_number}</small></span><Status value={student.actual_attendance_status || 'assigned'} /></button>)}</section>)}{!activities.length && <Notice>{text('No named assessment scope is assigned.', '目前沒有具名評估範圍。')}</Notice>}</aside>
      <main className="assessment-sheet">{detail ? <>
        <header className="assessment-heading"><div><p>{detail.activity.activity_id}</p><h2>{isChinese ? detail.student.name_zh : detail.student.name_en}</h2><span>{isChinese ? detail.activity.title_zh : detail.activity.title_en}</span></div><span className="source-count"><b>{sourceSubmissions.length}</b>{text('source responses', '份來源回應')}</span></header>
        <section className="perspective-board">
          <div className="perspective-title"><div><p>{text('SOURCE RESPONSES', '來源回應')}</p><h3>{text('Self and peer voice', '自評及同儕聲音')}</h3></div><span>{text('Missing stays missing — never zero', '缺漏維持缺漏，不會當作零分')}</span></div>
          <div className="perspective-grid">{detail.recipients.filter(item => ['student_self_report','peer_observation'].includes(item.perspective)).map(item => <article key={item.assignment_recipient_id}>
            <header><span>{item.perspective === 'peer_observation' ? <UserFocus size={19} /> : <ClipboardText size={19} />}{codeLabel(item.perspective)}</span><Status value={item.latestSubmission?.content_status || item.status} /></header>
            {item.latestSubmission ? <>{item.latestSubmission.responses.map(response => <blockquote key={response.question_response_id}><small>{isChinese ? response.prompt_zh : response.prompt_en}</small>{response.text_value}</blockquote>)}<small>{item.latestSubmission.submitted_at ? formatDateTime(item.latestSubmission.submitted_at) : text('Draft not submitted', '草稿尚未提交')}</small>{item.latestSubmission.content_status === 'submitted' && <div className="moderation-actions"><input value={reviewReasons[item.latestSubmission.assessment_submission_id] || ''} onChange={event => setReviewReasons({ ...reviewReasons, [item.latestSubmission!.assessment_submission_id]: event.target.value })} placeholder={text('Decision reason', '決定原因')} /><button onClick={() => void reviewSubmission(item.latestSubmission!, 'approved')}><CheckCircle />{text('Accept', '接納')}</button><button onClick={() => void reviewSubmission(item.latestSubmission!, 'changes_requested')}>{text('Return', '退回修改')}</button><button className="danger" onClick={() => void reviewSubmission(item.latestSubmission!, 'rejected')}><XCircle />{text('Reject', '拒絕')}</button></div>}</> : <Notice>{text('No response submitted.', '尚未提交回應。')}</Notice>}
          </article>)}</div>
        </section>

        <section className="peer-assignment-strip"><div><p>{text('EXPLICIT PEER ASSIGNMENT', '明確同儕分派')}</p><h3>{text('Assign one named peer', '分派一位具名同儕')}</h3><span>{text('Activity membership alone never grants peer access.', '單憑參與活動不會取得同儕互評權限。')}</span></div><Field label={text('Peer reviewer', '同儕覆核人')}><select value={peerReviewerId} onChange={event => setPeerReviewerId(event.target.value)}>{detail.participants.filter(item => item.user_id !== studentId).map(item => <option key={item.user_id} value={item.user_id}>{isChinese ? item.name_zh : item.name_en}</option>)}</select></Field><button disabled={!peerReviewerId} onClick={assignPeer}><Plus size={16} />{text('Assign peer task', '分派同儕任務')}</button></section>

        <form className="teacher-assessment-form" onSubmit={submitTeacher}>
          <header><div><p>{text('NAMED TEACHER OBSERVATION', '具名老師觀察')}</p><h3>{text('Feedback first, rubric observation only with proof', '先寫回饋；有佐證才加入 Rubric 觀察')}</h3></div><span>{text('Official step remains unchanged until separate review and publication.', '正式階段會維持不變，直至另行覆核及發布。')}</span></header>
          <div className="teacher-comment-grid"><Field label={text('Demonstrated strength and example', '已展現的優勢及例子')}><textarea required value={teacher.teacherStrength} onChange={event => setTeacher({ ...teacher, teacherStrength: event.target.value })} /></Field><Field label={text('Next development area', '下一個發展方向')}><textarea required value={teacher.teacherDevelopment} onChange={event => setTeacher({ ...teacher, teacherDevelopment: event.target.value })} /></Field><Field label={text('Support strategy', '支援策略')}><textarea required value={teacher.teacherSupport} onChange={event => setTeacher({ ...teacher, teacherSupport: event.target.value })} /></Field></div>
          <div className="rubric-observation"><div className="rubric-fields"><Field label={text('Skill (optional)', '技能（選填）')}><select value={teacher.axisId} onChange={event => setTeacher({ ...teacher, axisId: event.target.value })}>{detail.skillAxes.map(axis => <option key={axis.axis_id} value={axis.axis_id}>{isChinese ? axis.name_zh : axis.name_en}</option>)}</select></Field><Field label={text('Observed step 1–16', '已觀察階段 1–16')}><input type="number" min="1" max="16" value={teacher.observedStep} onChange={event => setTeacher({ ...teacher, observedStep: event.target.value })} /></Field><Field label={text('Consistency 1–6', '穩定程度 1–6')}><input type="number" min="1" max="6" value={teacher.consistency} onChange={event => setTeacher({ ...teacher, consistency: event.target.value })} /></Field><Field label={text('Suggested next step', '建議下一階段')}><input type="number" min="1" max="16" value={teacher.suggestedNextStep} onChange={event => setTeacher({ ...teacher, suggestedNextStep: event.target.value })} /></Field></div><Field label={text('Observation comment linked to the behaviour above', '連繫上述行為的觀察說明')}><textarea value={teacher.observationComment} onChange={event => setTeacher({ ...teacher, observationComment: event.target.value })} /></Field>
            <div className="citation-list"><p>{text('Cite submitted self/peer responses (optional supporting sources)', '引用已提交自評／同儕回應（選填支援來源）')}</p>{sourceSubmissions.map(source => <label key={source.assessment_submission_id}><input type="checkbox" checked={cited.includes(source.assessment_submission_id)} onChange={() => setCited(cited.includes(source.assessment_submission_id) ? cited.filter(id => id !== source.assessment_submission_id) : [...cited, source.assessment_submission_id])} />{codeLabel(source.perspective)} · v{source.revision_number} · {codeLabel(source.content_status)}</label>)}</div>
          </div>
          <footer><Field label={text('Submission reason / context', '提交原因／情境')}><input value={teacher.reviewReason} onChange={event => setTeacher({ ...teacher, reviewReason: event.target.value })} /></Field><button className="primary"><PaperPlaneTilt size={17} />{text('Submit teacher assessment', '提交老師評估')}</button></footer>
        </form>
        {detail.observations.length > 0 && <section className="observation-history"><h3>{text('Observation history', '觀察紀錄')}</h3>{detail.observations.map(item => <article key={item.feedback_id}><div><b>{isChinese ? item.observer_name_zh || item.observer_name : item.observer_name}</b><small>{formatDateTime(item.observed_at)}</small></div><blockquote>{item.overall_comment}</blockquote>{item.framework_observation_id ? <span>{isChinese ? item.axis_name_zh : item.axis_name_en} · {text('step', '階段')} {item.observed_step} · {text('consistency', '穩定程度')} {item.consistency_rating}/6 · <Status value={item.included_in_aggregation ? 'included' : 'not_included'} /></span> : <Status value="feedback_only" />}</article>)}</section>}
      </> : <div className="activity-empty"><ClipboardText size={36} /><h2>{text('Choose an assigned student', '選擇已分派學生')}</h2></div>}</main>
    </div>
  </>;
}
