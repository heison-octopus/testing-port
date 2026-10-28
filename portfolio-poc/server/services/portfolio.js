import { randomUUID } from 'node:crypto';
import { repo } from '../repositories/store.js';
import { checkSchool, requireStudent, requireActivity, role, scoped, fail } from './access.js';
import { calculationProcessors, inputTemplates } from '../processors/registry.js';

const id = () => randomUUID();
const now = () => new Date().toISOString();
const PERIOD = '2026–27 Term 1';

function parseLabels(value) {
  try { return JSON.parse(value || '[]'); } catch { return []; }
}

function observations(user, studentId) {
  return repo.all(`SELECT o.*, p.content proof_content,p.kind proof_kind,p.status proof_status,
    a.name axis_name,c.name catalogue_name,c.version catalogue_version,act.title activity_title
    FROM observations o
    JOIN proof p ON p.id=o.proof_id
    JOIN axes a ON a.id=o.axis_id
    JOIN catalogues c ON c.id=a.catalogue_id
    JOIN activities act ON act.id=o.activity_id
    WHERE o.school_id=? AND o.student_id=? ORDER BY o.created_at`, user.school_id, studentId);
}

function activityEvents(user, activityId) {
  return repo.all(`SELECT e.*,u.name actor_name FROM activity_events e
    JOIN users u ON u.id=e.actor_id WHERE e.school_id=? AND e.activity_id=? ORDER BY e.created_at`, user.school_id, activityId);
}

function recordActivityEvent(user, activityId, action, detail) {
  repo.run('INSERT INTO activity_events VALUES(?,?,?,?,?,?,?)', id(), user.school_id, activityId, user.id, action, detail, now());
  repo.audit(user, `activity.${action}`, activityId);
}

function getSummary(user, studentId) {
  return repo.get('SELECT * FROM learner_summaries WHERE school_id=? AND student_id=? AND period=?', user.school_id, studentId, PERIOD);
}

function sanitizePeer(review) {
  const activity = repo.get('SELECT title FROM activities WHERE id=?', review.activity_id);
  if (review.activity_id === 'activity-prefect') return `The learner showed kindness and repair after a planning mistake by apologizing, reorganizing shifts and supporting younger prefects during ${activity.title}.`;
  if (review.activity_id === 'activity-dialogue') return `The learner showed respectful listening and empathy by making space for different views during ${activity.title}.`;
  if (review.activity_id === 'activity-piano') return `The learner showed supportive teamwork and composure while preparing for and participating in ${activity.title}.`;
  return `The learner showed constructive participation during ${activity?.title || 'the activity'}, according to an assigned peer review.`;
}

function visibleActivities(user) {
  const rows = repo.all('SELECT * FROM activities WHERE school_id=? ORDER BY rowid DESC', user.school_id);
  if (user.role === 'admin') return rows;
  return rows.filter(activity => {
    try { requireActivity(user, activity.id); return true; } catch { return false; }
  });
}

function summarySources(user, studentId) {
  const obs = observations(user, studentId);
  const peers = repo.all(`SELECT pr.*,a.title activity_title,u.name reviewer_name FROM peer_reviews pr
    JOIN activities a ON a.id=pr.activity_id JOIN users u ON u.id=pr.reviewer_student_id
    WHERE pr.school_id=? AND pr.subject_student_id=? AND pr.status='approved' ORDER BY pr.created_at`, user.school_id, studentId);
  return {
    observations: obs,
    peerReviews: peers,
    sourceTags: [...new Set([...obs.map(item => item.activity_title), ...peers.map(item => item.activity_title)])],
  };
}

function resultSourceTags(group, selected) {
  const ids = new Set(selected.proofIds || []);
  return group.filter(item => ids.has(item.proof_id)).map(item => ({
    activity: item.activity_title,
    type: item.proof_kind.replaceAll('_', ' '),
    proofId: item.proof_id,
  }));
}

function portfolioWarnings(user, studentId) {
  return repo.all("SELECT * FROM portfolio_warnings WHERE school_id=? AND student_id=? AND status='open' ORDER BY created_at DESC", user.school_id, studentId);
}

export const service = {
  session(user) {
    checkSchool(user);
    return {
      id: user.id,
      name: user.name,
      role: user.role,
      school: user.school_id,
      capabilities: {
        activities: user.role !== 'admin',
        activityEditor: ['teacher', 'staff'].includes(user.role),
        selfReview: user.role === 'student',
        peerReview: user.role === 'student' || user.role === 'staff',
        media: user.role !== 'admin',
        forms: ['teacher', 'staff'].includes(user.role),
        review: ['teacher', 'staff'].includes(user.role),
        prompts: ['teacher', 'staff'].includes(user.role),
        portfolio: user.role !== 'admin',
        admin: user.role === 'admin',
      },
    };
  },

  activities(user) {
    checkSchool(user, 'activities');
    return visibleActivities(user).map(activity => ({
      ...activity,
      labels: parseLabels(activity.labels),
      event_count: repo.get('SELECT COUNT(*) count FROM activity_events WHERE activity_id=?', activity.id).count,
    }));
  },

  activity(user, activityId) {
    checkSchool(user, 'activities');
    const activity = user.role === 'admin'
      ? repo.get('SELECT * FROM activities WHERE id=? AND school_id=?', activityId, user.school_id)
      : requireActivity(user, activityId);
    if (!activity) fail(404, 'Record not found');
    const participants = repo.all(`SELECT u.id,u.name,p.attendance,p.attendance_approval FROM participants p
      JOIN users u ON u.id=p.student_id WHERE p.activity_id=?`, activityId).filter(item => user.role !== 'student' || item.id === user.id);
    const questions = repo.all('SELECT * FROM questions WHERE form_version_id=? AND block_audience=? ORDER BY position', activity.form_version_id, user.role === 'student' ? 'student' : 'teacher');
    const proof = repo.all('SELECT * FROM proof WHERE activity_id=? AND school_id=?', activityId, user.school_id).filter(item => user.role !== 'student' || item.student_id === user.id);
    return { ...activity, labels: parseLabels(activity.labels), participants, questions, proof, events: activityEvents(user, activityId) };
  },

  createActivity(user, data) {
    checkSchool(user, 'activities');
    role(user, 'teacher', 'staff');
    if (typeof data.title !== 'string' || !data.title.trim() || data.title.length > 160) fail(400, 'Enter an activity title of 1–160 characters');
    if (typeof data.description !== 'string' || !data.description.trim() || data.description.length > 4000) fail(400, 'Enter an activity description of 1–4000 characters');
    const labels = Array.isArray(data.labels) ? data.labels.map(value => String(value).trim()).filter(Boolean).slice(0, 12) : [];
    const activityId = id();
    const formId = id();
    const questionId = id();
    const status = user.role === 'staff' ? 'published' : 'draft';
    repo.transaction(() => {
      repo.run('INSERT INTO form_versions VALUES(?,?,?,?,?,?,?)', formId, user.school_id, `${data.title.trim()} reflection`, 1, 'published', user.id, 'reflection-v1');
      repo.run('INSERT INTO questions VALUES(?,?,?,?,?,?,?,?)', questionId, formId, 'student', 1, data.question?.trim() || 'What did you contribute and learn?', 'long_text', 'POC activity creator', 'Student reflection');
      repo.run('INSERT INTO form_links VALUES(?,?)', formId, activityId);
      repo.run('INSERT INTO activities VALUES(?,?,?,?,?,?,?)', activityId, user.school_id, data.title.trim(), data.description.trim(), status, formId, JSON.stringify(labels));
      repo.run('INSERT INTO participants VALUES(?,?,?,?)', activityId, 'student-1', 'pending', 'none');
      repo.run('INSERT OR IGNORE INTO assignments VALUES(?,?,?)', user.id, 'activity', activityId);
      repo.run('INSERT OR IGNORE INTO assignments VALUES(?,?,?)', 'staff-1', 'activity', activityId);
      repo.run('INSERT OR IGNORE INTO assignments VALUES(?,?,?)', 'staff-1', 'form_approve', activityId);
      recordActivityEvent(user, activityId, status === 'published' ? 'published' : 'created_draft', status === 'published' ? 'Authorized staff created and directly published the activity.' : 'Teacher created a draft for staff review.');
    });
    return { id: activityId, status };
  },

  transitionActivity(user, activityId, action, reason = '') {
    checkSchool(user, 'activities');
    const activity = requireActivity(user, activityId);
    const allowed = {
      teacher: { submit: ['draft', 'rejected'] },
      staff: { publish: ['submitted'], reject: ['submitted'] },
    };
    const from = allowed[user.role]?.[action];
    if (!from || !from.includes(activity.status)) fail(403, 'This activity transition is not permitted');
    if (action === 'reject' && (typeof reason !== 'string' || !reason.trim())) fail(400, 'A rejection reason is required');
    const next = action === 'submit' ? 'submitted' : action === 'publish' ? 'published' : 'rejected';
    repo.transaction(() => {
      repo.run('UPDATE activities SET status=? WHERE id=?', next, activityId);
      recordActivityEvent(user, activityId, next, action === 'reject' ? reason.trim() : `${user.role} changed the activity from ${activity.status} to ${next}.`);
    });
  },

  students(user) {
    checkSchool(user, 'portfolio');
    role(user, 'student', 'teacher', 'staff');
    return repo.all("SELECT id,name FROM users WHERE school_id=? AND role='student'", user.school_id).filter(student => {
      try { requireStudent(user, student.id); return true; } catch { return false; }
    });
  },

  forms(user) {
    checkSchool(user, 'forms');
    role(user, 'teacher', 'staff');
    return {
      templates: inputTemplates,
      forms: repo.all(`SELECT f.*, l.activity_id, q.prompt FROM form_versions f
        LEFT JOIN form_links l ON l.form_version_id=f.id LEFT JOIN questions q ON q.form_version_id=f.id
        WHERE f.school_id=?`, user.school_id).filter(form => form.activity_id && scoped(user, 'activity', form.activity_id)),
    };
  },

  draftForm(user, data) {
    checkSchool(user, 'forms');
    role(user, 'teacher');
    const activity = requireActivity(user, data.activityId);
    const template = inputTemplates[data.templateKey];
    if (!template || template.audience !== 'student') fail(400, 'Choose a supported student input template');
    if (typeof data.prompt !== 'string' || !data.prompt.trim() || data.prompt.length > 1000) fail(400, 'Enter a question of 1–1000 characters');
    const formId = id();
    const previous = repo.get('SELECT * FROM form_versions WHERE id=?', activity.form_version_id);
    const version = repo.get('SELECT COALESCE(MAX(version),0) n FROM form_versions WHERE school_id=? AND name=?', user.school_id, previous.name).n + 1;
    repo.transaction(() => {
      repo.run('INSERT INTO form_versions VALUES(?,?,?,?,?,?,?)', formId, user.school_id, previous.name, version, 'draft', user.id, data.templateKey);
      repo.run('INSERT INTO form_links VALUES(?,?)', formId, activity.id);
      repo.run('INSERT INTO questions VALUES(?,?,?,?,?,?,?,?)', id(), formId, 'student', 1, data.prompt.trim(), template.input, 'POC draft', 'Student reflection');
      repo.audit(user, 'form.draft', formId);
    });
    return { id: formId };
  },

  publishForm(user, formId) {
    checkSchool(user, 'forms');
    role(user, 'staff');
    const form = repo.get(`SELECT f.*,l.activity_id FROM form_versions f JOIN form_links l ON l.form_version_id=f.id
      WHERE f.id=? AND f.school_id=?`, formId, user.school_id);
    if (!form) fail(404, 'Form not found');
    requireActivity(user, form.activity_id);
    if (!scoped(user, 'form_approve', form.activity_id)) fail(403, 'Named form approval assignment required');
    if (form.author_id === user.id || form.status !== 'draft') fail(403, 'Separate reviewer and draft required');
    repo.transaction(() => {
      repo.run("UPDATE form_versions SET status='published' WHERE id=?", formId);
      repo.run('UPDATE activities SET form_version_id=? WHERE id=?', formId, form.activity_id);
      repo.audit(user, 'form.publish', formId);
    });
  },

  catalogues(user) {
    checkSchool(user, 'assessment');
    role(user, 'teacher', 'staff', 'admin');
    return repo.all('SELECT * FROM catalogues').map(catalogue => ({
      ...catalogue,
      axes: repo.all('SELECT * FROM axes WHERE catalogue_id=? ORDER BY position', catalogue.id).map(axis => ({
        ...axis,
        levels: repo.all('SELECT * FROM levels WHERE axis_id=? ORDER BY level', axis.id),
      })),
    }));
  },

  attendance(user, activityId, studentId, value) {
    checkSchool(user, 'activities');
    role(user, 'teacher');
    requireActivity(user, activityId);
    requireStudent(user, studentId);
    if (!['attended', 'late', 'partial', 'absent'].includes(value)) fail(400, 'Invalid attendance');
    if (!repo.get('SELECT 1 FROM participants WHERE activity_id=? AND student_id=?', activityId, studentId)) fail(404, 'Participant not found');
    repo.run('UPDATE participants SET attendance=?,attendance_approval=? WHERE activity_id=? AND student_id=?', value, value === 'absent' ? 'pending_approval' : 'none', activityId, studentId);
    repo.audit(user, 'attendance.update', `${activityId}:${studentId}`);
  },

  approveAttendance(user, activityId, studentId) {
    checkSchool(user, 'activities');
    role(user, 'staff');
    requireActivity(user, activityId);
    requireStudent(user, studentId);
    const participant = repo.get('SELECT * FROM participants WHERE activity_id=? AND student_id=?', activityId, studentId);
    if (!participant || participant.attendance_approval !== 'pending_approval') fail(400, 'No attendance exception pending');
    repo.run("UPDATE participants SET attendance_approval='approved' WHERE activity_id=? AND student_id=?", activityId, studentId);
    repo.audit(user, 'attendance.approve', `${activityId}:${studentId}`);
  },

  response(user, activityId, questionId, answer) {
    checkSchool(user, 'activities');
    role(user, 'student');
    const activity = requireActivity(user, activityId);
    const question = repo.get('SELECT * FROM questions WHERE id=? AND form_version_id=? AND block_audience=?', questionId, activity.form_version_id, 'student');
    if (!question || activity.status !== 'published') fail(403, 'Form unavailable');
    if (typeof answer !== 'string' || !answer.trim() || answer.length > (question.input_type === 'short_text' ? 300 : 4000)) fail(400, question.input_type === 'short_text' ? 'Enter a response of 1–300 characters' : 'Enter a response of 1–4000 characters');
    repo.transaction(() => {
      const responseId = id();
      repo.run('INSERT INTO responses VALUES(?,?,?,?,?,?,?,?)', responseId, user.school_id, activityId, user.id, questionId, user.id, answer.trim(), now());
      repo.run('INSERT INTO proof VALUES(?,?,?,?,?,?,?,?,?,?,?)', id(), user.school_id, activityId, user.id, responseId, 'reflection', 'self', 'human_authored', answer.trim(), 'accepted', now());
      repo.audit(user, 'response.submit', responseId);
    });
  },

  peerReviews(user) {
    checkSchool(user, 'assessment');
    if (user.role === 'student') {
      return repo.all(`SELECT pr.*,a.title activity_title,subject.name subject_name FROM peer_reviews pr
        JOIN activities a ON a.id=pr.activity_id JOIN users subject ON subject.id=pr.subject_student_id
        WHERE pr.school_id=? AND pr.reviewer_student_id=? ORDER BY a.title`, user.school_id, user.id);
    }
    role(user, 'staff');
    return repo.all(`SELECT pr.*,a.title activity_title,reviewer.name reviewer_name,subject.name subject_name
      FROM peer_reviews pr JOIN activities a ON a.id=pr.activity_id
      JOIN users reviewer ON reviewer.id=pr.reviewer_student_id JOIN users subject ON subject.id=pr.subject_student_id
      WHERE pr.school_id=? ORDER BY CASE pr.status WHEN 'pending' THEN 0 ELSE 1 END,a.title,reviewer.name`, user.school_id);
  },

  updatePeerReview(user, reviewId, comment, rating) {
    checkSchool(user, 'assessment');
    role(user, 'student');
    const review = repo.get('SELECT * FROM peer_reviews WHERE id=? AND school_id=? AND reviewer_student_id=?', reviewId, user.school_id, user.id);
    if (!review || review.status !== 'pending') fail(403, 'Only a pending assigned review can be edited');
    if (typeof comment !== 'string' || !comment.trim() || comment.length > 2000) fail(400, 'Enter peer feedback of 1–2000 characters');
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) fail(400, 'Choose a rating from 1–5');
    repo.run('UPDATE peer_reviews SET raw_comment=?,rating=?,created_at=? WHERE id=?', comment.trim(), rating, now(), reviewId);
    repo.audit(user, 'peer_review.submit', reviewId);
  },

  moderatePeerReview(user, reviewId, decision, note) {
    checkSchool(user, 'assessment');
    role(user, 'staff');
    const review = repo.get('SELECT * FROM peer_reviews WHERE id=? AND school_id=?', reviewId, user.school_id);
    if (!review || review.status !== 'pending') fail(400, 'Peer review is not pending');
    if (!['approve', 'reject'].includes(decision)) fail(400, 'Invalid moderation decision');
    if (typeof note !== 'string' || !note.trim()) fail(400, 'Moderation note is required');
    const status = decision === 'approve' ? 'approved' : 'rejected';
    const statement = decision === 'approve' ? sanitizePeer(review) : null;
    repo.transaction(() => {
      repo.run('UPDATE peer_reviews SET status=?,moderated_by=?,moderation_note=?,sanitized_statement=?,reviewed_at=? WHERE id=?', status, user.id, note.trim(), statement, now(), reviewId);
      if (decision === 'approve') repo.run('INSERT OR IGNORE INTO proof VALUES(?,?,?,?,?,?,?,?,?,?,?)', `proof-${reviewId}`, user.school_id, review.activity_id, review.subject_student_id, reviewId, 'peer_review', 'peer', 'human_authored', statement, 'accepted', now());
      repo.audit(user, `peer_review.${status}`, reviewId);
    });
  },

  observe(user, data) {
    checkSchool(user, 'assessment');
    role(user, 'teacher');
    requireActivity(user, data.activityId);
    requireStudent(user, data.studentId);
    const proof = repo.get('SELECT * FROM proof WHERE id=? AND school_id=? AND activity_id=? AND student_id=? AND status=?', data.proofId, user.school_id, data.activityId, data.studentId, 'accepted');
    if (!proof) fail(400, 'Accepted proof is required');
    const axis = repo.get('SELECT a.* FROM axes a JOIN catalogues c ON c.id=a.catalogue_id WHERE a.id=? AND c.assessment_capable=1', data.axisId);
    if (!axis || !Number.isInteger(data.level) || !repo.get('SELECT 1 FROM levels WHERE axis_id=? AND level=?', data.axisId, data.level)) fail(400, 'Choose a valid rubric axis and whole-number level 1–16');
    if (typeof data.comment !== 'string' || !data.comment.trim() || data.comment.length > 4000) fail(400, 'Observation comment is required');
    const observationId = id();
    repo.run('INSERT INTO observations VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)', observationId, user.school_id, data.activityId, data.studentId, data.axisId, data.level, data.proofId, user.id, data.comment.trim(), 1, 'pending', null, null, now());
    repo.audit(user, 'observation.create', observationId);
  },

  review(user, studentId) {
    checkSchool(user, 'assessment');
    role(user, 'teacher', 'staff');
    requireStudent(user, studentId);
    if (user.role === 'staff' && !scoped(user, 'review', studentId)) fail(403, 'Named review assignment required');
    if (user.role === 'teacher' && !scoped(user, 'summary_review', studentId)) fail(403, 'Class teacher summary assignment required');
    return observations(user, studentId);
  },

  decide(user, observationId, decision, reason) {
    checkSchool(user, 'assessment');
    role(user, 'staff');
    const observation = repo.get('SELECT * FROM observations WHERE id=? AND school_id=?', observationId, user.school_id);
    if (!observation) fail(404, 'Record not found');
    requireStudent(user, observation.student_id);
    if (!scoped(user, 'review', observation.student_id)) fail(403, 'Named review assignment required');
    if (!['included', 'excluded'].includes(decision)) fail(400, 'Invalid decision');
    if (typeof reason !== 'string' || !reason.trim() || reason.length > 4000) fail(400, 'Decision reason is required');
    repo.transaction(() => {
      repo.run('INSERT INTO review_decisions VALUES(?,?,?,?,?,?,?)', id(), user.school_id, observationId, decision, reason.trim(), user.id, now());
      repo.run('UPDATE observations SET decision=?,reason=?,decided_by=? WHERE id=?', decision, reason.trim(), user.id, observationId);
      repo.run("UPDATE snapshots SET status='stale' WHERE school_id=? AND student_id=? AND status='published'", user.school_id, observation.student_id);
      repo.audit(user, 'observation.decision', observationId);
    });
  },

  summary(user, studentId) {
    checkSchool(user, 'assessment');
    role(user, 'teacher', 'staff');
    requireStudent(user, studentId);
    if (user.role === 'teacher' && !scoped(user, 'summary_review', studentId)) fail(403, 'Class teacher summary assignment required');
    if (user.role === 'staff' && !scoped(user, 'review', studentId)) fail(403, 'Named review assignment required');
    const summary = getSummary(user, studentId);
    return { summary: summary ? { ...summary, source_tags: parseLabels(summary.source_tags) } : null, sources: summarySources(user, studentId) };
  },

  saveSummary(user, studentId, text, action) {
    checkSchool(user, 'assessment');
    role(user, 'teacher');
    requireStudent(user, studentId);
    if (!scoped(user, 'summary_review', studentId)) fail(403, 'Class teacher summary assignment required');
    if (typeof text !== 'string' || !text.trim() || text.length > 5000) fail(400, 'Enter a summary of 1–5000 characters');
    if (!['save', 'approve'].includes(action)) fail(400, 'Invalid summary action');
    const sources = summarySources(user, studentId);
    const existing = getSummary(user, studentId);
    const status = action === 'approve' ? 'approved' : 'draft';
    const summaryId = existing?.id || id();
    repo.run(`INSERT INTO learner_summaries VALUES(?,?,?,?,?,?,?,?,?,?)
      ON CONFLICT(school_id,student_id,period) DO UPDATE SET draft_text=excluded.draft_text,status=excluded.status,source_tags=excluded.source_tags,modified_by=excluded.modified_by,approved_by=excluded.approved_by,updated_at=excluded.updated_at`,
      summaryId, user.school_id, studentId, PERIOD, text.trim(), status, JSON.stringify(sources.sourceTags), user.id, action === 'approve' ? user.id : null, now());
    repo.audit(user, `summary.${status}`, summaryId);
  },

  media(user) {
    checkSchool(user, 'media');
    role(user, 'student', 'teacher', 'staff');
    const rows = repo.all(`SELECT m.*,a.title activity_title,u.name student_name,up.name uploader_name
      FROM media_items m JOIN activities a ON a.id=m.activity_id JOIN users u ON u.id=m.student_id JOIN users up ON up.id=m.uploaded_by
      WHERE m.school_id=? ORDER BY m.created_at DESC`, user.school_id);
    return rows.filter(item => {
      if (user.role === 'student') return item.student_id === user.id;
      return scoped(user, 'activity', item.activity_id);
    });
  },

  createMedia(user, data) {
    checkSchool(user, 'media');
    role(user, 'student', 'teacher', 'staff');
    const activity = requireActivity(user, data.activityId);
    const studentId = user.role === 'student' ? user.id : data.studentId;
    requireStudent(user, studentId);
    if (!repo.get('SELECT 1 FROM participants WHERE activity_id=? AND student_id=?', activity.id, studentId)) fail(400, 'Student is not a participant in this activity');
    if (typeof data.name !== 'string' || !data.name.trim() || data.name.length > 240) fail(400, 'Enter a file name');
    const mediaId = id();
    repo.run('INSERT INTO media_items VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)', mediaId, user.school_id, activity.id, studentId, user.id, data.name.trim(), data.mimeType || 'application/octet-stream', null, '', 'queued', 'processing', null, null, null, null, null, now());
    repo.audit(user, 'media.upload_queued', mediaId);
    return { id: mediaId };
  },

  processMedia(user, mediaId, action, extractedText = '') {
    checkSchool(user, 'media');
    role(user, 'staff');
    const media = repo.get('SELECT * FROM media_items WHERE id=? AND school_id=?', mediaId, user.school_id);
    if (!media) fail(404, 'Media record not found');
    requireActivity(user, media.activity_id);
    if (action === 'extract') {
      if (media.status !== 'processing') fail(400, 'Media is not queued for extraction');
      const text = typeof extractedText === 'string' && extractedText.trim() ? extractedText.trim() : `POC extraction completed for ${media.name}; uploader confirmation is still required.`;
      repo.run("UPDATE media_items SET extracted_text=?,extraction_status='complete',status='awaiting_review' WHERE id=?", text, mediaId);
      repo.audit(user, 'media.extraction_completed', mediaId);
      return;
    }
    if (action === 'publish') {
      if (media.status !== 'awaiting_review' || !media.extracted_text) fail(400, 'Review the completed extraction before publication');
      const proofId = media.proof_id || id();
      repo.transaction(() => {
        repo.run('INSERT OR IGNORE INTO proof VALUES(?,?,?,?,?,?,?,?,?,?,?)', proofId, user.school_id, media.activity_id, media.student_id, mediaId, 'media_extraction', 'staff', 'source_transcription', media.extracted_text, 'accepted', now());
        repo.run("UPDATE media_items SET status='published',reviewer_id=?,proof_id=? WHERE id=?", user.id, proofId, mediaId);
        repo.audit(user, 'media.published', mediaId);
      });
      return;
    }
    fail(400, 'Invalid media action');
  },

  disableMedia(user, mediaId, reason) {
    checkSchool(user, 'media');
    role(user, 'staff');
    const media = repo.get('SELECT * FROM media_items WHERE id=? AND school_id=?', mediaId, user.school_id);
    if (!media || media.status === 'disabled') fail(400, 'Media cannot be disabled');
    if (typeof reason !== 'string' || !reason.trim()) fail(400, 'Disable reason is required');
    repo.transaction(() => {
      repo.run("UPDATE media_items SET status='disabled',disabled_at=?,disabled_by=?,disabled_reason=? WHERE id=?", now(), user.id, reason.trim(), mediaId);
      if (media.proof_id) repo.run("UPDATE proof SET status='disabled' WHERE id=?", media.proof_id);
      for (const snapshot of repo.all("SELECT * FROM snapshots WHERE school_id=? AND student_id=? AND status='published'", user.school_id, media.student_id)) {
        const manifest = JSON.parse(snapshot.manifest);
        const used = manifest.results?.some(result => result.proofIds?.includes(media.proof_id));
        if (used) repo.run('INSERT INTO portfolio_warnings VALUES(?,?,?,?,?,?,?,?)', id(), user.school_id, media.student_id, snapshot.id, mediaId, `A source used by this portfolio was disabled: ${media.name}. The published result was not automatically recalculated.`, 'open', now());
      }
      repo.audit(user, 'media.disabled', mediaId);
    });
  },

  resolveWarning(user, warningId, decision) {
    checkSchool(user, 'portfolio');
    const warning = repo.get('SELECT * FROM portfolio_warnings WHERE id=? AND school_id=? AND status=?', warningId, user.school_id, 'open');
    if (!warning) fail(404, 'Warning not found');
    const policy = repo.get('SELECT policy_value FROM school_policies WHERE school_id=? AND policy_key=?', user.school_id, 'portfolio_regeneration_role')?.policy_value || 'admin';
    const permitted = user.role === 'admin' || (policy === 'staff' && user.role === 'staff');
    if (!permitted) fail(403, 'School policy does not permit this role to decide regeneration');
    if (!['retain', 'regenerate'].includes(decision)) fail(400, 'Invalid warning decision');
    repo.transaction(() => {
      repo.run('UPDATE portfolio_warnings SET status=? WHERE id=?', decision === 'retain' ? 'acknowledged' : 'regeneration_requested', warningId);
      if (decision === 'regenerate') repo.run("UPDATE snapshots SET status='stale' WHERE id=?", warning.snapshot_id);
      repo.audit(user, `portfolio_warning.${decision}`, warningId);
    });
  },

  publish(user, studentId) {
    checkSchool(user, 'portfolio');
    role(user, 'staff');
    requireStudent(user, studentId);
    if (!scoped(user, 'review', studentId)) fail(403, 'Named review assignment required');
    const summary = getSummary(user, studentId);
    if (!summary || summary.status !== 'approved') fail(400, 'The responsible class teacher must approve the learner summary before publication');
    const list = observations(user, studentId);
    const policy = repo.get('SELECT * FROM calculation_policies WHERE id=?', 'max-confirmed');
    const processor = calculationProcessors[policy.processor_key];
    if (!processor) fail(400, 'Calculation processor unavailable');
    const groups = new Map();
    for (const observation of list) {
      if (!groups.has(observation.axis_id)) groups.set(observation.axis_id, []);
      groups.get(observation.axis_id).push(observation);
    }
    const results = [...groups.values()].map(group => {
      const selected = processor(group);
      return {
        axisId: group[0].axis_id,
        axis: group[0].axis_name,
        rubric: group[0].catalogue_name,
        version: group[0].catalogue_version,
        ...selected,
        statement: group.filter(item => selected.observationIds.includes(item.id)).map(item => item.comment).join(' '),
        sourceTags: resultSourceTags(group, selected),
      };
    }).filter(result => result.level !== null);
    if (!results.length) fail(400, 'Include at least one eligible observation before publication');
    const manifest = {
      period: PERIOD,
      policy: { id: policy.id, version: policy.version, processor: policy.processor_key },
      results,
      summary: { text: summary.draft_text, sourceTags: parseLabels(summary.source_tags), approvedBy: summary.approved_by },
      observations: list.filter(observation => results.some(result => result.observationIds.includes(observation.id))),
    };
    const snapshotId = id();
    repo.transaction(() => {
      repo.run("UPDATE snapshots SET status='superseded' WHERE student_id=? AND school_id=? AND status='published'", studentId, user.school_id);
      repo.run('INSERT INTO snapshots VALUES(?,?,?,?,?,?,?)', snapshotId, user.school_id, studentId, user.id, now(), 'published', JSON.stringify(manifest));
      repo.audit(user, 'portfolio.publish', snapshotId);
    });
    return { id: snapshotId, manifest };
  },

  portfolio(user, studentId) {
    checkSchool(user, 'portfolio');
    const student = requireStudent(user, studentId);
    const snapshot = repo.get("SELECT * FROM snapshots WHERE student_id=? AND school_id=? AND status='published' ORDER BY created_at DESC LIMIT 1", studentId, user.school_id);
    if (!snapshot) return null;
    const manifest = JSON.parse(snapshot.manifest);
    const warnings = portfolioWarnings(user, studentId);
    if (user.role === 'student') {
      return {
        id: snapshot.id,
        created_at: snapshot.created_at,
        student: { id: 'CURRENT_STUDENT', name: student.name },
        warnings: warnings.map(warning => ({ id: warning.id, message: warning.message })),
        manifest: {
          period: manifest.period,
          policy: { id: manifest.policy.id, version: manifest.policy.version },
          summary: { text: manifest.summary?.text || 'This earlier snapshot did not freeze an approved learner summary.', sourceTags: manifest.summary?.sourceTags || [] },
          results: manifest.results.map(result => ({
            axis: result.axis,
            rubric: result.rubric,
            version: result.version,
            level: result.level,
            statement: result.statement || 'Evidence-backed outcome from the frozen snapshot.',
            sourceTags: (result.sourceTags || []).map(tag => ({ activity: tag.activity, type: tag.type })),
          })),
        },
        privacy: { filtered: true, adapter: 'internal-safe-view', externalAdapterStatus: 'not_configured' },
      };
    }
    return { ...snapshot, student: { id: student.id, name: student.name }, warnings, manifest };
  },

  prompts(user, studentId) {
    checkSchool(user, 'prompts');
    role(user, 'teacher', 'staff');
    requireStudent(user, studentId);
    return {
      presets: repo.all('SELECT * FROM prompt_presets WHERE school_id=? AND active=1 ORDER BY rowid', user.school_id),
      attempts: repo.all('SELECT * FROM generation_attempts WHERE school_id=? AND student_id=? ORDER BY created_at DESC', user.school_id, studentId),
      unit: { period: PERIOD, reportKey: 'portfolio-term-1' },
    };
  },

  generate(user, studentId, data) {
    checkSchool(user, 'prompts');
    role(user, 'teacher', 'staff');
    const student = requireStudent(user, studentId);
    const preset = repo.get('SELECT * FROM prompt_presets WHERE id=? AND school_id=? AND active=1', data.presetId, user.school_id);
    if (!preset) fail(400, 'Choose an active prompt preset');
    if (typeof data.prompt !== 'string' || !data.prompt.trim() || data.prompt.length > 8000) fail(400, 'Enter a prompt of 1–8000 characters');
    const summary = getSummary(user, studentId);
    if (!summary) fail(400, 'Create a learner summary first');
    const focusLine = preset.focus === 'academic'
      ? 'This version foregrounds pathway planning, reflective learning and evidence of deliberate improvement.'
      : preset.focus === 'non-academic'
        ? 'This version foregrounds participation, relationships, creativity, resilience and responsibility.'
        : 'This version balances learning, participation, relationships, creativity and future planning.';
    const output = `${summary.draft_text} ${focusLine}`;
    const attemptId = id();
    repo.run('INSERT INTO generation_attempts VALUES(?,?,?,?,?,?,?,?,?,?,0)', attemptId, user.school_id, studentId, PERIOD, 'portfolio-term-1', preset.id, data.prompt.trim(), output, user.id, now());
    repo.audit(user, 'portfolio_generation.simulated', attemptId);
    return { id: attemptId, student: student.name, output };
  },

  selectAttempt(user, attemptId) {
    checkSchool(user, 'prompts');
    role(user, 'teacher', 'staff');
    const attempt = repo.get('SELECT * FROM generation_attempts WHERE id=? AND school_id=?', attemptId, user.school_id);
    if (!attempt) fail(404, 'Generation attempt not found');
    requireStudent(user, attempt.student_id);
    repo.transaction(() => {
      repo.run('UPDATE generation_attempts SET selected=0 WHERE school_id=? AND student_id=? AND period=? AND report_key=?', user.school_id, attempt.student_id, attempt.period, attempt.report_key);
      repo.run('UPDATE generation_attempts SET selected=1 WHERE id=?', attemptId);
      repo.audit(user, 'portfolio_generation.selected', attemptId);
    });
  },

  privacyContract(user) {
    checkSchool(user);
    role(user, 'admin');
    return {
      status: 'not_configured',
      mode: 'global_identifier_replacement',
      request: { schoolId: 'string', records: 'unknown[]', identityMap: 'Record<sourceId,pseudonym>' },
      response: { sanitizedRecords: 'unknown[]', replacementLog: '[]' },
      note: 'Empty provider contract for the POC. No external privacy service or real identity map is connected.',
    };
  },

  updatePolicy(user, key, value) {
    checkSchool(user, 'admin');
    role(user, 'admin');
    const allowed = {
      portfolio_regeneration_role: ['admin', 'staff'],
    };
    if (!allowed[key]?.includes(value)) fail(400, 'Unsupported policy value');
    repo.run(`INSERT INTO school_policies VALUES(?,?,?,?,?)
      ON CONFLICT(school_id,policy_key) DO UPDATE SET policy_value=excluded.policy_value,updated_by=excluded.updated_by,updated_at=excluded.updated_at`, user.school_id, key, value, user.id, now());
    repo.audit(user, 'policy.update', `${key}:${value}`);
  },

  admin(user) {
    checkSchool(user, 'admin');
    role(user, 'admin');
    return {
      users: repo.all('SELECT id,name,role FROM users WHERE school_id=?', user.school_id),
      assignments: repo.all('SELECT a.* FROM assignments a JOIN users u ON u.id=a.user_id WHERE u.school_id=?', user.school_id),
      features: repo.all('SELECT feature,enabled FROM features WHERE school_id=?', user.school_id),
      policies: repo.all('SELECT * FROM school_policies WHERE school_id=? ORDER BY policy_key', user.school_id),
      audit: repo.all('SELECT actor_id,action,target,created_at FROM audit WHERE school_id=? ORDER BY id DESC LIMIT 40', user.school_id),
      counts: {
        peerReviews: repo.get('SELECT COUNT(*) count FROM peer_reviews WHERE school_id=?', user.school_id).count,
        pendingPeerReviews: repo.get("SELECT COUNT(*) count FROM peer_reviews WHERE school_id=? AND status='pending'", user.school_id).count,
        media: repo.get('SELECT COUNT(*) count FROM media_items WHERE school_id=?', user.school_id).count,
        generations: repo.get('SELECT COUNT(*) count FROM generation_attempts WHERE school_id=?', user.school_id).count,
      },
    };
  },
};
