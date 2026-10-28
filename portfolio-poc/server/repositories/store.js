import { all, get, run, db } from './database.js';

function transaction(fn) {
  db.exec('BEGIN');
  try {
    const value = fn();
    db.exec('COMMIT');
    return value;
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

function insertFormPackage({ form, activityId, questions, event }) {
  run(`INSERT INTO form_versions(id,school_id,name,version,status,author_id,template_key,supersedes_form_version_id,source_mode,questionnaire_source_id,import_batch_id,review_status,publication_status)
    VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)`, form.id, form.schoolId, form.name, form.version, form.status, form.authorId, form.templateKey, form.supersedesId, form.sourceMode, form.sourceId, form.importBatchId, form.reviewStatus, form.publicationStatus);
  run('INSERT INTO form_links(form_version_id,activity_id) VALUES(?,?)', form.id, activityId);
  const sectionId = `section-${form.id}-student`;
  const blockId = `block-${form.id}-student`;
  run('INSERT INTO question_sections(id,form_version_id,section_code,title_en,title_zh,position) VALUES(?,?,?,?,?,?)', sectionId, form.id, 'student_reflection', 'Student reflection', '學生反思', 1);
  run('INSERT INTO question_blocks(id,section_id,audience,title_en,title_zh,position) VALUES(?,?,?,?,?,?)', blockId, sectionId, 'student', 'Student questions', '學生問題', 1);
  for (const question of questions) {
    run(`INSERT INTO questions(id,form_version_id,block_audience,position,prompt,input_type,source,meaning,question_definition_id,source_id,source_row,ability_code,ability_name,ability_description,version)
      VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, question.id, form.id, 'student', question.position, question.prompt, question.inputType, question.source, question.meaning, question.definitionId, question.sourceId, question.sourceRow, question.abilityCode, question.abilityName, question.abilityDescription, question.version || 1);
    run(`INSERT INTO form_questions(id,form_version_id,block_id,question_definition_id,materialized_question_id,position,required,configuration_json)
      VALUES(?,?,?,?,?,?,?,?)`, question.formQuestionId, form.id, blockId, question.definitionId, question.id, question.position, question.required ? 1 : 0, question.configurationJson || '{}');
  }
  run('INSERT INTO form_review_events(id,form_version_id,event_type,actor_id,comment,created_at) VALUES(?,?,?,?,?,?)', event.id, form.id, event.type, event.actorId, event.comment, event.createdAt);
}

export const repo = {
  all,
  get,
  run,
  transaction,
  audit(user, action, target) {
    run('INSERT INTO audit(school_id,actor_id,action,target,created_at) VALUES(?,?,?,?,?)', user.school_id, user.id, action, target, new Date().toISOString());
  },
  academicContext(schoolId) {
    return {
      school: get(`SELECT id,name,school_code,operating_mode,disabled FROM schools WHERE id=?`, schoolId),
      academicYears: all(`SELECT * FROM academic_years WHERE school_id=? ORDER BY start_date DESC`, schoolId),
      reportingPeriods: all(`SELECT * FROM reporting_periods WHERE school_id=? ORDER BY start_date`, schoolId),
    };
  },
  reportingPeriod(schoolId, periodId) {
    return get(`SELECT * FROM reporting_periods WHERE id=? AND school_id=?`, periodId, schoolId);
  },
  resolvePeriod(schoolId, startDay, endDay) {
    const containing = all(`SELECT * FROM reporting_periods WHERE school_id=? AND start_date<=? AND end_date>=? ORDER BY resolution_priority DESC,start_date`, schoolId, startDay, endDay);
    if (containing.length === 1) return { status: 'resolved', period: containing[0] };
    const startPeriod = get(`SELECT * FROM reporting_periods WHERE school_id=? AND start_date<=? AND end_date>=? ORDER BY resolution_priority DESC LIMIT 1`, schoolId, startDay, startDay);
    const endPeriod = get(`SELECT * FROM reporting_periods WHERE school_id=? AND start_date<=? AND end_date>=? ORDER BY resolution_priority DESC LIMIT 1`, schoolId, endDay, endDay);
    if (startPeriod && endPeriod && startPeriod.id !== endPeriod.id) return { status: 'cross_period_exception', period: null };
    return { status: 'no_match', period: null };
  },
  createActivityPackage({ activity, form, questions, participants, assignments, event }) {
    transaction(() => {
      insertFormPackage({ form, activityId: activity.id, questions, event: form.event });
      run(`INSERT INTO activities(id,school_id,title,description,status,form_version_id,labels,starts_at,ends_at,academic_year_id,reporting_period_id,period_resolution_status,created_by)
        VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)`, activity.id, activity.schoolId, activity.title, activity.description, activity.status, form.id, activity.labels, activity.startsAt, activity.endsAt, activity.academicYearId, activity.periodId, activity.periodStatus, activity.createdBy);
      for (const studentId of participants) run('INSERT INTO participants(activity_id,student_id,attendance,attendance_approval) VALUES(?,?,?,?)', activity.id, studentId, 'pending', 'none');
      for (const assignment of assignments) run('INSERT OR IGNORE INTO assignments(user_id,scope_type,scope_id) VALUES(?,?,?)', assignment.userId, assignment.scopeType, assignment.scopeId);
      run('INSERT INTO activity_events(id,school_id,activity_id,actor_id,action,detail,created_at) VALUES(?,?,?,?,?,?,?)', event.id, activity.schoolId, activity.id, event.actorId, event.action, event.detail, event.createdAt);
      run('INSERT INTO audit(school_id,actor_id,action,target,created_at) VALUES(?,?,?,?,?)', activity.schoolId, event.actorId, `activity.${event.action}`, activity.id, event.createdAt);
    });
  },
  formWorkspace(schoolId) {
    const forms = all(`SELECT f.*,l.activity_id FROM form_versions f LEFT JOIN form_links l ON l.form_version_id=f.id WHERE f.school_id=? ORDER BY f.name,f.version DESC`, schoolId);
    return forms.map(form => ({ ...form, questions: all(`SELECT q.*,fq.required FROM questions q LEFT JOIN form_questions fq ON fq.materialized_question_id=q.id WHERE q.form_version_id=? ORDER BY q.position`, form.id) }));
  },
  questionsForForm(formId, audience) {
    return all(`SELECT q.*,fq.required,fq.configuration_json FROM questions q LEFT JOIN form_questions fq ON fq.materialized_question_id=q.id WHERE q.form_version_id=? AND q.block_audience=? ORDER BY q.position`, formId, audience);
  },
  questionSources(schoolId) {
    return all(`SELECT * FROM questionnaire_sources WHERE school_id=? ORDER BY source_type,name`, schoolId);
  },
  questionLibrary(schoolId, sourceId = null) {
    return sourceId
      ? all(`SELECT * FROM question_definitions WHERE school_id=? AND source_id=? ORDER BY source_row`, schoolId, sourceId)
      : all(`SELECT * FROM question_definitions WHERE school_id=? ORDER BY source_id,source_row`, schoolId);
  },
  questionDefinition(schoolId, questionId) {
    return get(`SELECT q.*,s.name source_name,s.source_file,s.source_sheet FROM question_definitions q JOIN questionnaire_sources s ON s.id=q.source_id WHERE q.school_id=? AND q.id=?`, schoolId, questionId);
  },
  activityForm(schoolId, activityId) {
    return get(`SELECT f.*,l.activity_id FROM form_versions f JOIN form_links l ON l.form_version_id=f.id WHERE f.id=(SELECT form_version_id FROM activities WHERE id=? AND school_id=?)`, activityId, schoolId);
  },
  maxFormVersion(schoolId, name) {
    return get(`SELECT COALESCE(MAX(version),0) n FROM form_versions WHERE school_id=? AND name=?`, schoolId, name).n;
  },
  createDraftFormPackage({ form, activityId, questions, event }) {
    transaction(() => {
      insertFormPackage({ form, activityId, questions, event });
      run('INSERT INTO audit(school_id,actor_id,action,target,created_at) VALUES(?,?,?,?,?)', form.schoolId, form.authorId, 'form.draft', form.id, event.createdAt);
    });
  },
  stageFormImport({ batch, rows }) {
    transaction(() => {
      run(`INSERT INTO form_import_batches(id,school_id,activity_id,source_id,file_name,format,file_hash,uploaded_by,status,summary_json,created_at)
        VALUES(?,?,?,?,?,?,?,?,?,?,?)`, batch.id, batch.schoolId, batch.activityId, batch.sourceId, batch.fileName, batch.format, batch.fileHash, batch.uploadedBy, batch.status, batch.summaryJson, batch.createdAt);
      for (const row of rows) run(`INSERT INTO form_import_rows(id,batch_id,row_number,question_definition_id,audience,position,required,prompt_override,validation_status,validation_message,diff_type,payload_json)
        VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`, row.id, batch.id, row.rowNumber, row.questionId, row.audience, row.position, row.required ? 1 : 0, row.promptOverride, row.validationStatus, row.validationMessage, row.diffType, row.payloadJson);
      run('INSERT INTO audit(school_id,actor_id,action,target,created_at) VALUES(?,?,?,?,?)', batch.schoolId, batch.uploadedBy, 'form_import.staged', batch.id, batch.createdAt);
    });
  },
  importBatch(schoolId, batchId) {
    const batch = get(`SELECT * FROM form_import_batches WHERE id=? AND school_id=?`, batchId, schoolId);
    return batch ? { ...batch, rows: all(`SELECT * FROM form_import_rows WHERE batch_id=? ORDER BY row_number`, batchId) } : null;
  },
  importBatchByHash(schoolId, activityId, sourceId, fileHash) {
    const batch = get(`SELECT * FROM form_import_batches WHERE school_id=? AND activity_id=? AND source_id=? AND file_hash=? ORDER BY created_at DESC LIMIT 1`, schoolId, activityId, sourceId, fileHash);
    return batch ? { ...batch, rows: all(`SELECT * FROM form_import_rows WHERE batch_id=? ORDER BY row_number`, batch.id) } : null;
  },
  importsForSchool(schoolId) {
    return all(`SELECT b.*,a.title activity_title,s.name source_name FROM form_import_batches b JOIN activities a ON a.id=b.activity_id JOIN questionnaire_sources s ON s.id=b.source_id WHERE b.school_id=? ORDER BY b.created_at DESC`, schoolId);
  },
  markImportApplied(batchId, formId) {
    run(`UPDATE form_import_batches SET status='applied',applied_form_version_id=? WHERE id=?`, formId, batchId);
  },
  formForPublication(schoolId, formId) {
    return get(`SELECT f.*,l.activity_id FROM form_versions f JOIN form_links l ON l.form_version_id=f.id WHERE f.id=? AND f.school_id=?`, formId, schoolId);
  },
  publishForm(formId, activityId, actorId, eventId, createdAt) {
    transaction(() => {
      run(`UPDATE form_versions SET status='published',review_status='approved',publication_status='published' WHERE id=?`, formId);
      run('UPDATE activities SET form_version_id=? WHERE id=?', formId, activityId);
      run('INSERT INTO form_review_events(id,form_version_id,event_type,actor_id,comment,created_at) VALUES(?,?,?,?,?,?)', eventId, formId, 'published', actorId, 'Assigned staff approved and published this successor version.', createdAt);
    });
  },
  publishInitialForm(formId, actorId, eventId, createdAt) {
    run(`UPDATE form_versions SET status='published',review_status='approved',publication_status='published' WHERE id=?`, formId);
    run('INSERT INTO form_review_events(id,form_version_id,event_type,actor_id,comment,created_at) VALUES(?,?,?,?,?,?)', eventId, formId, 'published', actorId, 'Published with the approved activity.', createdAt);
  },
  saveAcademicYear(record) {
    run(`INSERT INTO academic_years(id,school_id,code,name,start_date,end_date,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?)`, record.id, record.schoolId, record.code, record.name, record.startDate, record.endDate, record.status, record.createdAt, record.createdAt);
  },
  overlappingPeriods(schoolId, startDate, endDate, excludeId = '') {
    return all(`SELECT * FROM reporting_periods WHERE school_id=? AND id<>? AND NOT(end_date<? OR start_date>?)`, schoolId, excludeId, startDate, endDate);
  },
  saveReportingPeriod(record) {
    run(`INSERT INTO reporting_periods(id,school_id,academic_year_id,code,name_en,name_zh,start_date,end_date,sequence,is_summer,portfolio_snapshot_due,resolution_priority,status,created_at,updated_at)
      VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, record.id, record.schoolId, record.academicYearId, record.code, record.nameEn, record.nameZh, record.startDate, record.endDate, record.sequence, record.isSummer ? 1 : 0, record.snapshotDue, record.priority, record.status, record.createdAt, record.createdAt);
  },
  updateReportingPeriodStatus(schoolId, periodId, status, updatedAt) {
    return run(`UPDATE reporting_periods SET status=?,updated_at=? WHERE id=? AND school_id=?`, status, updatedAt, periodId, schoolId);
  },
};
