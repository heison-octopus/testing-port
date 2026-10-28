import { createHash, randomUUID } from 'node:crypto';
import { repo } from '../repositories/store.js';
import { checkSchool, requireStudent, requireActivity, role, scoped, fail } from './access.js';
import { calculationProcessors, inputTemplates } from '../processors/registry.js';

const id = () => randomUUID();
const now = () => new Date().toISOString();
const PERIOD = '2026–27 Term 1';

function cleanDateTime(value, label) {
  if (typeof value !== 'string' || Number.isNaN(Date.parse(value))) fail(400, `${label} must be a valid date and time`);
  return value;
}

function dateOnly(value) {
  return value.slice(0, 10);
}

function cleanDay(value, label) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(`${value}T00:00:00Z`))) fail(400, `${label} must use YYYY-MM-DD`);
  return value;
}

function resolveActivityPeriod(user, startsAt, endsAt) {
  const start = cleanDateTime(startsAt, 'Start');
  const end = cleanDateTime(endsAt, 'End');
  if (Date.parse(start) > Date.parse(end)) fail(400, 'Activity start must not be after its end');
  return { startsAt: start, endsAt: end, ...repo.resolvePeriod(user.school_id, dateOnly(start), dateOnly(end)) };
}

function manualQuestion(prompt, sourceId, position = 1) {
  return {
    id: id(), formQuestionId: id(), position, prompt, inputType: 'long_text',
    source: 'School-authored reflection question', meaning: 'Student reflection', definitionId: null,
    sourceId, sourceRow: null, abilityCode: 'AB-STUDENT-REFLECTION',
    abilityName: 'Student reflection', abilityDescription: 'Describe what the learner noticed, contributed or would change.',
    required: true, configurationJson: '{}', version: 1,
  };
}

function libraryQuestion(definition, position, promptOverride = null, required = true) {
  return {
    id: id(), formQuestionId: id(), position, prompt: promptOverride?.trim() || definition.prompt_zh,
    inputType: definition.input_type, source: `${definition.source_name || 'Questionnaire source'} · ${definition.source_sheet || 'source'} row ${definition.source_row}`,
    meaning: definition.ability_description_en, definitionId: definition.id, sourceId: definition.source_id,
    sourceRow: definition.source_row, abilityCode: definition.ability_code, abilityName: definition.ability_name_en,
    abilityDescription: definition.ability_description_en, required,
    configurationJson: JSON.stringify({ scale: definition.scale_json ? JSON.parse(definition.scale_json) : null, negativelyWorded: Boolean(definition.is_negative) }),
    version: definition.version,
  };
}

function selectedQuestions(user, data) {
  const sourceMode = data.reflectionMode || 'manual';
  if (sourceMode === 'manual') {
    const prompt = data.question?.trim();
    if (!prompt || prompt.length > 1000) fail(400, 'Enter a reflection question of 1–1000 characters');
    const sourceId = `source-manual-${user.school_id}`;
    return { sourceMode, sourceId, questions: [manualQuestion(prompt, sourceId)] };
  }
  if (sourceMode !== 'question_bank') fail(400, 'Choose manual authoring or the question bank');
  const questionIds = Array.isArray(data.questionIds) ? [...new Set(data.questionIds.map(String))].slice(0, 20) : [];
  if (!questionIds.length) fail(400, 'Choose at least one source question');
  const definitions = questionIds.map(questionId => repo.questionDefinition(user.school_id, questionId));
  if (definitions.some(item => !item)) fail(400, 'One or more source questions are unavailable for this school');
  const sourceIds = [...new Set(definitions.map(item => item.source_id))];
  if (sourceIds.length !== 1) fail(400, 'One form import must use one questionnaire source');
  return { sourceMode, sourceId: sourceIds[0], questions: definitions.map((definition, index) => libraryQuestion(definition, index + 1)) };
}

function formRecord(user, { formId, name, version, status, templateKey, supersedesId = null, sourceMode, sourceId, importBatchId = null }) {
  const published = status === 'published';
  return {
    id: formId, schoolId: user.school_id, name, version, status, authorId: user.id, templateKey,
    supersedesId, sourceMode, sourceId, importBatchId,
    reviewStatus: published ? 'approved' : 'draft', publicationStatus: published ? 'published' : 'unpublished',
  };
}

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

  academicContext(user) {
    checkSchool(user);
    const context = repo.academicContext(user.school_id);
    return {
      ...context,
      rule: 'The server resolves the reporting period from activity start and end dates. SchoolId is taken from the authenticated session and is never accepted from an activity form.',
    };
  },

  activities(user) {
    checkSchool(user, 'activities');
    const periods = new Map(repo.academicContext(user.school_id).reportingPeriods.map(period => [period.id, period]));
    return visibleActivities(user).map(activity => ({
      ...activity,
      labels: parseLabels(activity.labels),
      reporting_period: periods.get(activity.reporting_period_id) || null,
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
    const questions = repo.questionsForForm(activity.form_version_id, user.role === 'student' ? 'student' : 'teacher').map(question => {
      let configuration = {};
      try { configuration = JSON.parse(question.configuration_json || '{}'); } catch { configuration = {}; }
      return { ...question, configuration };
    });
    const proof = repo.all('SELECT * FROM proof WHERE activity_id=? AND school_id=?', activityId, user.school_id).filter(item => user.role !== 'student' || item.student_id === user.id);
    const reportingPeriod = activity.reporting_period_id ? repo.reportingPeriod(user.school_id, activity.reporting_period_id) : null;
    return { ...activity, labels: parseLabels(activity.labels), reporting_period: reportingPeriod, participants, questions, proof, events: activityEvents(user, activityId) };
  },

  createActivity(user, data) {
    checkSchool(user, 'activities');
    role(user, 'teacher', 'staff');
    if (typeof data.title !== 'string' || !data.title.trim() || data.title.length > 160) fail(400, 'Enter an activity title of 1–160 characters');
    if (typeof data.description !== 'string' || !data.description.trim() || data.description.length > 4000) fail(400, 'Enter an activity description of 1–4000 characters');
    const labels = Array.isArray(data.labels) ? data.labels.map(value => String(value).trim()).filter(Boolean).slice(0, 12) : [];
    const period = resolveActivityPeriod(user, data.startsAt || '2026-10-28T09:00:00+08:00', data.endsAt || '2026-10-28T10:00:00+08:00');
    const reflection = selectedQuestions(user, data);
    const activityId = id();
    const formId = id();
    const status = user.role === 'staff' && period.status === 'resolved' ? 'published' : 'draft';
    const createdAt = now();
    const form = formRecord(user, {
      formId, name: `${data.title.trim()} reflection`, version: 1, status,
      templateKey: reflection.sourceMode === 'manual' ? 'reflection-v1' : 'questionnaire-scale-v1',
      sourceMode: reflection.sourceMode, sourceId: reflection.sourceId,
    });
    repo.createActivityPackage({
      activity: {
        id: activityId, schoolId: user.school_id, title: data.title.trim(), description: data.description.trim(), status,
        labels: JSON.stringify(labels), startsAt: period.startsAt, endsAt: period.endsAt,
        academicYearId: period.period?.academic_year_id || null, periodId: period.period?.id || null,
        periodStatus: period.status, createdBy: user.id,
      },
      form: { ...form, event: { id: id(), type: status === 'published' ? 'published' : 'created_revision', actorId: user.id, comment: status === 'published' ? 'Authorized staff created and published the initial form package.' : 'Teacher created the initial form package as a draft.', createdAt } },
      questions: reflection.questions,
      participants: ['student-1'],
      assignments: [
        { userId: user.id, scopeType: 'activity', scopeId: activityId },
        { userId: 'staff-1', scopeType: 'activity', scopeId: activityId },
        { userId: 'staff-1', scopeType: 'form_approve', scopeId: activityId },
      ],
      event: {
        id: id(), actorId: user.id, action: status === 'published' ? 'published' : 'created_draft', createdAt,
        detail: period.status === 'resolved'
          ? (status === 'published' ? 'Authorized staff created and directly published the activity.' : 'Teacher created a draft for staff review.')
          : `Activity saved as a draft because period resolution is ${period.status}. Correct the dates or configured periods before submission.`,
      },
    });
    return { id: activityId, status, periodResolutionStatus: period.status, reportingPeriod: period.period };
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
    if (['submit', 'publish'].includes(action) && !['resolved', 'exception_approved'].includes(activity.period_resolution_status)) fail(400, 'Resolve the school reporting period before submission or publication');
    if (action === 'reject' && (typeof reason !== 'string' || !reason.trim())) fail(400, 'A rejection reason is required');
    const next = action === 'submit' ? 'submitted' : action === 'publish' ? 'published' : 'rejected';
    repo.transaction(() => {
      repo.run('UPDATE activities SET status=? WHERE id=?', next, activityId);
      if (action === 'publish') repo.publishInitialForm(activity.form_version_id, user.id, id(), now());
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
    const forms = repo.formWorkspace(user.school_id).filter(form => form.activity_id && scoped(user, 'activity', form.activity_id));
    return {
      templates: inputTemplates,
      forms,
      sources: repo.questionSources(user.school_id),
      questionLibrary: repo.questionLibrary(user.school_id),
      imports: repo.importsForSchool(user.school_id).filter(batch => scoped(user, 'activity', batch.activity_id)),
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
    const previous = repo.activityForm(user.school_id, activity.id);
    const version = repo.maxFormVersion(user.school_id, previous.name) + 1;
    const sourceId = `source-manual-${user.school_id}`;
    const question = manualQuestion(data.prompt.trim(), sourceId);
    question.inputType = template.input;
    const createdAt = now();
    repo.createDraftFormPackage({
      form: formRecord(user, { formId, name: previous.name, version, status: 'draft', templateKey: data.templateKey, supersedesId: previous.id, sourceMode: 'manual', sourceId }),
      activityId: activity.id,
      questions: [question],
      event: { id: id(), type: 'created_revision', actorId: user.id, comment: 'Teacher created a manual successor draft. The published form remains active.', createdAt },
    });
    return { id: formId };
  },

  publishForm(user, formId) {
    checkSchool(user, 'forms');
    role(user, 'staff');
    const form = repo.formForPublication(user.school_id, formId);
    if (!form) fail(404, 'Form not found');
    requireActivity(user, form.activity_id);
    if (!scoped(user, 'form_approve', form.activity_id)) fail(403, 'Named form approval assignment required');
    if (form.author_id === user.id || form.status !== 'draft') fail(403, 'Separate reviewer and draft required');
    repo.publishForm(formId, form.activity_id, user.id, id(), now());
    repo.audit(user, 'form.publish', formId);
  },

  stageFormImport(user, data) {
    checkSchool(user, 'forms');
    role(user, 'teacher');
    const activity = requireActivity(user, data.activityId);
    const source = repo.questionSources(user.school_id).find(item => item.id === data.sourceId);
    if (!source || source.source_type !== 'supplied_instrument') fail(400, 'Choose an available supplied questionnaire source');
    const fileName = typeof data.fileName === 'string' && data.fileName.trim() ? data.fileName.trim() : 'form-definition.xlsx';
    if (!fileName.toLowerCase().endsWith('.xlsx') || fileName.length > 240) fail(400, 'The form-definition contract accepts one .xlsx file');
    const inputRows = Array.isArray(data.rows) ? data.rows : [];
    if (!inputRows.length || inputRows.length > 200) fail(400, 'Provide 1–200 form-definition rows');
    const currentQuestions = repo.questionsForForm(activity.form_version_id, 'student');
    const seenPositions = new Set();
    const seenQuestions = new Set();
    const rows = inputRows.map((input, index) => {
      const rowNumber = index + 2;
      const position = Number(input.position ?? index + 1);
      const audience = input.audience || 'student';
      const definition = repo.questionDefinition(user.school_id, String(input.questionId || ''));
      const errors = [];
      if (!definition || definition.source_id !== source.id) errors.push('Question does not belong to the selected source');
      if (!Number.isInteger(position) || position < 1 || position > 200 || seenPositions.has(position)) errors.push('Position must be a unique whole number from 1–200');
      if (audience !== 'student') errors.push('This POC import surface currently accepts the student reflection block only');
      if (seenQuestions.has(input.questionId)) errors.push('Question is duplicated in this form definition');
      const promptOverride = typeof input.promptOverride === 'string' && input.promptOverride.trim() ? input.promptOverride.trim() : null;
      if (promptOverride && promptOverride.length > 4000) errors.push('Prompt override exceeds 4,000 characters');
      seenPositions.add(position);
      seenQuestions.add(input.questionId);
      const existing = definition ? currentQuestions.find(question => question.question_definition_id === definition.id) : null;
      const diffType = existing ? (promptOverride && promptOverride !== existing.prompt ? 'modified' : 'unchanged') : 'added';
      return {
        id: id(), rowNumber, questionId: definition?.id || null, audience, position: Number.isInteger(position) ? position : index + 1,
        required: input.required !== false, promptOverride, validationStatus: errors.length ? 'error' : 'valid',
        validationMessage: errors.join('; '), diffType, payloadJson: JSON.stringify(input), definition,
      };
    });
    const summary = {
      total: rows.length,
      valid: rows.filter(item => item.validationStatus === 'valid').length,
      errors: rows.filter(item => item.validationStatus === 'error').length,
      added: rows.filter(item => item.diffType === 'added').length,
      modified: rows.filter(item => item.diffType === 'modified').length,
      unchanged: rows.filter(item => item.diffType === 'unchanged').length,
    };
    const fileHash = createHash('sha256').update(JSON.stringify({ sourceId: source.id, rows: inputRows })).digest('hex');
    const duplicate = repo.importBatchByHash(user.school_id, activity.id, source.id, fileHash);
    if (duplicate) return { ...duplicate, summary: JSON.parse(duplicate.summary_json), idempotent: true };
    const batch = {
      id: id(), schoolId: user.school_id, activityId: activity.id, sourceId: source.id, fileName, format: 'xlsx', fileHash,
      uploadedBy: user.id, status: summary.errors ? 'needs_correction' : 'validated', summaryJson: JSON.stringify(summary), createdAt: now(),
    };
    repo.stageFormImport({ batch, rows });
    return { ...batch, summary, rows: rows.map(({ definition, ...row }) => row), idempotent: false };
  },

  applyFormImport(user, batchId) {
    checkSchool(user, 'forms');
    role(user, 'teacher');
    const batch = repo.importBatch(user.school_id, batchId);
    if (!batch) fail(404, 'Import batch not found');
    if (batch.uploaded_by !== user.id) fail(403, 'Only the staging teacher may create this draft');
    if (batch.status !== 'validated') fail(400, 'Correct every staged row before creating a successor draft');
    const activity = requireActivity(user, batch.activity_id);
    const previous = repo.activityForm(user.school_id, activity.id);
    const formId = id();
    const questions = batch.rows.map(row => {
      const definition = repo.questionDefinition(user.school_id, row.question_definition_id);
      if (!definition || definition.source_id !== batch.source_id) fail(400, 'A staged source question is no longer available');
      return libraryQuestion(definition, row.position, row.prompt_override, Boolean(row.required));
    });
    const createdAt = now();
    repo.createDraftFormPackage({
      form: formRecord(user, {
        formId, name: previous.name, version: repo.maxFormVersion(user.school_id, previous.name) + 1,
        status: 'draft', templateKey: 'questionnaire-scale-v1', supersedesId: previous.id,
        sourceMode: 'imported_instrument', sourceId: batch.source_id, importBatchId: batch.id,
      }),
      activityId: activity.id,
      questions,
      event: { id: id(), type: 'created_revision', actorId: user.id, comment: 'Teacher accepted the staged row-level diff and created a successor draft. The published form remains active.', createdAt },
    });
    repo.markImportApplied(batch.id, formId);
    repo.audit(user, 'form_import.applied', `${batch.id}:${formId}`);
    return { id: formId, version: repo.maxFormVersion(user.school_id, previous.name), questionCount: questions.length };
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
    const question = repo.questionsForForm(activity.form_version_id, 'student').find(item => item.id === questionId);
    if (!question || activity.status !== 'published') fail(403, 'Form unavailable');
    if (typeof answer !== 'string' || !answer.trim() || answer.length > (question.input_type === 'short_text' ? 300 : 4000)) fail(400, question.input_type === 'short_text' ? 'Enter a response of 1–300 characters' : 'Enter a response of 1–4000 characters');
    let proofContent = answer.trim();
    if (question.input_type === 'scale') {
      let configuration = {};
      try { configuration = JSON.parse(question.configuration_json || '{}'); } catch { configuration = {}; }
      const value = Number(answer);
      const options = Array.isArray(configuration.scale) ? configuration.scale : [];
      if (!Number.isInteger(value) || value < 1 || value > options.length) fail(400, 'Choose one valid scale response');
      proofContent = `${question.prompt}: ${value} — ${options[value - 1]}`;
    }
    repo.transaction(() => {
      const responseId = id();
      repo.run('INSERT INTO responses VALUES(?,?,?,?,?,?,?,?)', responseId, user.school_id, activityId, user.id, questionId, user.id, answer.trim(), now());
      repo.run('INSERT INTO proof VALUES(?,?,?,?,?,?,?,?,?,?,?)', id(), user.school_id, activityId, user.id, responseId, 'reflection', 'self', 'human_authored', proofContent, 'accepted', now());
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

  createAcademicYear(user, data) {
    checkSchool(user, 'admin');
    role(user, 'admin');
    const code = typeof data.code === 'string' ? data.code.trim() : '';
    const name = typeof data.name === 'string' ? data.name.trim() : '';
    if (!code || code.length > 64 || !name || name.length > 200) fail(400, 'Academic-year code and name are required');
    const startDate = cleanDay(data.startDate, 'Academic-year start');
    const endDate = cleanDay(data.endDate, 'Academic-year end');
    if (startDate > endDate) fail(400, 'Academic-year start must not be after its end');
    if (repo.academicContext(user.school_id).academicYears.some(year => year.code.toLowerCase() === code.toLowerCase())) fail(400, 'Academic-year code already exists');
    const record = { id: id(), schoolId: user.school_id, code, name, startDate, endDate, status: data.status === 'planned' ? 'planned' : 'active', createdAt: now() };
    repo.saveAcademicYear(record);
    repo.audit(user, 'academic_year.create', record.id);
    return record;
  },

  createReportingPeriod(user, data) {
    checkSchool(user, 'admin');
    role(user, 'admin');
    const context = repo.academicContext(user.school_id);
    const year = context.academicYears.find(item => item.id === data.academicYearId);
    if (!year) fail(400, 'Choose an academic year in this school');
    const code = typeof data.code === 'string' ? data.code.trim() : '';
    const nameEn = typeof data.nameEn === 'string' ? data.nameEn.trim() : '';
    const nameZh = typeof data.nameZh === 'string' ? data.nameZh.trim() : '';
    if (!code || code.length > 64 || !nameEn || nameEn.length > 200 || !nameZh || nameZh.length > 200) fail(400, 'Period code and bilingual names are required');
    if (context.reportingPeriods.some(period => period.academic_year_id === year.id && period.code.toLowerCase() === code.toLowerCase())) fail(400, 'Period code already exists in this academic year');
    const startDate = cleanDay(data.startDate, 'Period start');
    const endDate = cleanDay(data.endDate, 'Period end');
    if (startDate > endDate || startDate < year.start_date || endDate > year.end_date) fail(400, 'Period dates must fall within the selected academic year');
    if (repo.overlappingPeriods(user.school_id, startDate, endDate).length) fail(400, 'Reporting periods must not overlap because activity period resolution must be deterministic');
    const sequence = Number(data.sequence);
    if (!Number.isInteger(sequence) || sequence < 1 || sequence > 20) fail(400, 'Sequence must be a whole number from 1–20');
    const status = ['planned', 'open', 'closed'].includes(data.status) ? data.status : 'planned';
    const record = {
      id: id(), schoolId: user.school_id, academicYearId: year.id, code, nameEn, nameZh, startDate, endDate,
      sequence, isSummer: Boolean(data.isSummer), snapshotDue: data.snapshotDue ? cleanDay(data.snapshotDue, 'Snapshot due date') : null,
      priority: 100, status, createdAt: now(),
    };
    repo.saveReportingPeriod(record);
    repo.audit(user, 'reporting_period.create', record.id);
    return record;
  },

  updateReportingPeriodStatus(user, periodId, status) {
    checkSchool(user, 'admin');
    role(user, 'admin');
    if (!['planned', 'open', 'closed'].includes(status)) fail(400, 'Choose planned, open or closed');
    const period = repo.academicContext(user.school_id).reportingPeriods.find(item => item.id === periodId);
    if (!period) fail(404, 'Reporting period not found');
    repo.updateReportingPeriodStatus(user.school_id, periodId, status, now());
    repo.audit(user, 'reporting_period.status', `${periodId}:${status}`);
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
      ...repo.academicContext(user.school_id),
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
