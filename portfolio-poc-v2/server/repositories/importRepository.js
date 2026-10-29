import { sql } from './database.js';

function hydrateRecord(row) {
  return {
    ...row,
    originalPayload: JSON.parse(row.original_payload_json || '{}'),
    normalizedPayload: JSON.parse(row.normalized_payload_json || '{}'),
    validationErrors: JSON.parse(row.validation_errors_json || '[]'),
    validationWarnings: JSON.parse(row.validation_warnings_json || '[]'),
    corrections: sql.all('SELECT * FROM import_record_corrections WHERE import_record_id=? ORDER BY corrected_at', row.import_record_id),
    decisions: sql.all('SELECT * FROM import_record_decisions WHERE import_record_id=? ORDER BY decided_at', row.import_record_id),
    links: sql.all('SELECT * FROM import_record_links WHERE import_record_id=? ORDER BY committed_at', row.import_record_id),
  };
}

function batchRow(batchId) {
  return sql.get(`SELECT b.*,source.source_code,source.name_en source_name_en,source.name_zh source_name_zh,source.status source_status,
      contract.contract_code,contract.version_number contract_version,activity.latest_revision_id,
      revision.title_en target_title_en,revision.title_zh target_title_zh,
      uploader.name_en uploader_name,uploader.name_zh uploader_name_zh,
      requester.name_en requester_name,requester.name_zh requester_name_zh,
      committer.name_en committer_name,committer.name_zh committer_name_zh
    FROM import_batches b
    JOIN source_systems source ON source.source_system_id=b.source_system_id
    JOIN import_contract_versions contract ON contract.import_contract_version_id=b.import_contract_version_id
    LEFT JOIN activities activity ON activity.activity_id=b.target_entity_id
    LEFT JOIN activity_revisions revision ON revision.activity_revision_id=activity.latest_revision_id
    LEFT JOIN users uploader ON uploader.user_id=b.uploaded_by_user_id
    LEFT JOIN users requester ON requester.user_id=b.requested_by_user_id
    LEFT JOIN users committer ON committer.user_id=b.committed_by_user_id
    WHERE b.import_batch_id=?`, batchId);
}

export const importRepository = {
  sources(schoolId) {
    return sql.all(`SELECT source_system_id,school_id,source_code,name_en,name_zh,connector_type,status,disabled_reason,disabled_by_user_id,disabled_at,created_at,updated_at,
      CASE WHEN endpoint_env_key IS NOT NULL THEN 1 ELSE 0 END connector_configured
      FROM source_systems WHERE school_id=? ORDER BY name_en`, schoolId);
  },
  source(sourceId) { return sql.get('SELECT * FROM source_systems WHERE source_system_id=?', sourceId); },
  contract(code = 'activity_roster') { return sql.get(`SELECT * FROM import_contract_versions WHERE contract_code=? AND status='active' ORDER BY created_at DESC LIMIT 1`, code); },
  listBatches(schoolId) {
    return sql.all(`SELECT b.import_batch_id,b.target_entity_id,b.ingress_channel,b.original_file_name,b.source_relative_path,b.content_sha256,b.processing_status,b.declared_processing_status,b.received_at,b.seeded_at,b.total_rows,b.valid_rows,b.warning_rows,b.error_rows,b.excluded_rows,b.committed_rows,b.disabled_at,
      source.name_en source_name_en,source.name_zh source_name_zh,contract.contract_code,contract.version_number contract_version,
      revision.title_en target_title_en,revision.title_zh target_title_zh,uploader.name_en uploader_name,uploader.name_zh uploader_name_zh
      FROM import_batches b JOIN source_systems source ON source.source_system_id=b.source_system_id
      JOIN import_contract_versions contract ON contract.import_contract_version_id=b.import_contract_version_id
      LEFT JOIN activities activity ON activity.activity_id=b.target_entity_id
      LEFT JOIN activity_revisions revision ON revision.activity_revision_id=activity.latest_revision_id
      LEFT JOIN users uploader ON uploader.user_id=b.uploaded_by_user_id
      WHERE b.school_id=? ORDER BY b.received_at DESC,b.import_batch_id DESC`, schoolId);
  },
  detail(batchId) {
    const batch = batchRow(batchId);
    if (!batch) return null;
    return {
      ...batch,
      records: sql.all(`SELECT r.*,u.name_en resolved_name_en,u.name_zh resolved_name_zh,u.student_number resolved_student_number,u.staff_number resolved_staff_number
        FROM import_records r LEFT JOIN users u ON u.user_id=r.resolved_user_id WHERE r.import_batch_id=? ORDER BY r.row_number`, batchId).map(hydrateRecord),
      events: sql.all('SELECT * FROM import_batch_events WHERE import_batch_id=? ORDER BY occurred_at', batchId),
    };
  },
  findIdempotent({ schoolId, sourceId, contractId, targetId, hash }) {
    return sql.get(`SELECT import_batch_id FROM import_batches WHERE school_id=? AND source_system_id=? AND import_contract_version_id=? AND COALESCE(target_entity_id,'')=COALESCE(?,'') AND content_sha256=? AND disabled_at IS NULL ORDER BY received_at DESC LIMIT 1`, schoolId, sourceId, contractId, targetId || null, hash);
  },
  createBatch(batch, records, event) {
    sql.transaction(() => {
      sql.run(`INSERT INTO import_batches(import_batch_id,external_batch_key,school_id,source_system_id,import_contract_version_id,target_entity_type,target_entity_id,source_parent_key,ingress_channel,source_relative_path,original_file_name,content_type,content_sha256,source_uploaded_at,uploaded_by_user_id,requested_by_user_id,service_actor_id,received_at,parsed_at,validated_at,processing_status,declared_processing_status,parser_name,parser_version,total_rows,valid_rows,warning_rows,error_rows,excluded_rows,committed_rows,supersedes_import_batch_id,updated_by_user_id,updated_at)
        VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        batch.id, batch.externalKey || null, batch.schoolId, batch.sourceId, batch.contractId, batch.targetType, batch.targetId || null, batch.sourceParentKey || null, batch.channel, batch.relativePath || null, batch.fileName || null, batch.contentType || null, batch.hash, batch.sourceUploadedAt || null, batch.uploadedBy || null, batch.requestedBy || null, batch.serviceActor || null, batch.receivedAt, batch.parsedAt, batch.validatedAt, batch.status, batch.declaredStatus || null, batch.parserName, batch.parserVersion, records.length, records.filter(item => item.validationStatus === 'valid').length, records.filter(item => item.warnings.length).length, records.filter(item => item.validationStatus === 'invalid').length, 0, 0, batch.supersedesId || null, batch.actorId || null, batch.validatedAt);
      for (const record of records) sql.run(`INSERT INTO import_records(import_record_id,import_batch_id,row_number,source_record_key,original_payload_json,normalized_payload_json,payload_sha256,identity_status,validation_status,validation_errors_json,validation_warnings_json,resolved_user_id,current_decision,current_status,supersedes_import_record_id,created_at,updated_at)
        VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, record.id, batch.id, record.rowNumber, record.sourceRecordKey, JSON.stringify(record.originalPayload), JSON.stringify(record.normalizedPayload), record.hash, record.identityStatus, record.validationStatus, JSON.stringify(record.errors), JSON.stringify(record.warnings), record.resolvedUserId || null, 'included', record.currentStatus || (record.validationStatus === 'valid' ? 'ready' : 'needs_resolution'), null, batch.receivedAt, batch.validatedAt);
      sql.run(`INSERT INTO import_batch_events VALUES(?,?,?,?,?,?,?,?,?)`, event.id, batch.id, null, batch.status, event.code, event.actorId || null, event.reason, JSON.stringify(event.details || {}), event.at);
    });
  },
  record(recordId) {
    const row = sql.get('SELECT * FROM import_records WHERE import_record_id=?', recordId);
    return row ? hydrateRecord(row) : null;
  },
  updateRecordAfterCorrection(record, correction, batchUpdate) {
    sql.transaction(() => {
      sql.run(`INSERT INTO import_record_corrections VALUES(?,?,?,?,?,?,?,?,?,?)`, correction.id, record.importRecordId, correction.fieldName, correction.beforeValue, correction.afterValue, correction.originalStudentId, correction.resolvedStudentId, correction.reason, correction.actorId, correction.at);
      sql.run(`UPDATE import_records SET normalized_payload_json=?,payload_sha256=?,identity_status=?,validation_status=?,validation_errors_json=?,validation_warnings_json=?,resolved_user_id=?,current_status=?,updated_at=? WHERE import_record_id=?`, JSON.stringify(record.normalizedPayload), record.hash, record.identityStatus, record.validationStatus, JSON.stringify(record.errors), JSON.stringify(record.warnings), record.resolvedUserId || null, record.validationStatus === 'valid' ? 'ready' : 'needs_resolution', correction.at, record.importRecordId);
      this.recalculateBatch(batchUpdate.batchId, batchUpdate.actorId, correction.at);
    });
  },
  decideRecord(recordId, decision, actorId, reason, decidedAt, decisionId) {
    sql.transaction(() => {
      sql.run('INSERT INTO import_record_decisions VALUES(?,?,?,?,?,?)', decisionId, recordId, decision, reason, actorId, decidedAt);
      const currentStatus = decision === 'exclude' ? 'excluded' : 'ready';
      const currentDecision = decision === 'exclude' ? 'excluded' : 'included';
      sql.run('UPDATE import_records SET current_decision=?,current_status=?,updated_at=? WHERE import_record_id=?', currentDecision, currentStatus, decidedAt, recordId);
      const row = sql.get('SELECT import_batch_id FROM import_records WHERE import_record_id=?', recordId);
      if (row) {
        if (sql.get('SELECT 1 FROM import_record_links WHERE import_record_id=?', recordId)) sql.run(`UPDATE import_record_links SET reconciliation_status='needs_review',notes=? WHERE import_record_id=?`, `Post-commit decision ${decision}: ${reason}`, recordId);
        this.recalculateBatch(row.import_batch_id, actorId, decidedAt);
      }
    });
  },
  recalculateBatch(batchId, actorId, updatedAt) {
    const counts = sql.get(`SELECT COUNT(*) total_rows,
      SUM(CASE WHEN validation_status='valid' THEN 1 ELSE 0 END) valid_rows,
      SUM(CASE WHEN validation_warnings_json<>'[]' THEN 1 ELSE 0 END) warning_rows,
      SUM(CASE WHEN validation_status='invalid' AND current_decision<>'excluded' THEN 1 ELSE 0 END) error_rows,
      SUM(CASE WHEN current_decision='excluded' THEN 1 ELSE 0 END) excluded_rows
      FROM import_records WHERE import_batch_id=?`, batchId);
    const status = Number(counts.error_rows || 0) === 0 ? 'ready_to_commit' : 'needs_resolution';
    sql.run(`UPDATE import_batches SET total_rows=?,valid_rows=?,warning_rows=?,error_rows=?,excluded_rows=?,processing_status=CASE WHEN committed_at IS NULL AND disabled_at IS NULL THEN ? ELSE processing_status END,updated_by_user_id=?,updated_at=? WHERE import_batch_id=?`, Number(counts.total_rows || 0), Number(counts.valid_rows || 0), Number(counts.warning_rows || 0), Number(counts.error_rows || 0), Number(counts.excluded_rows || 0), status, actorId || null, updatedAt, batchId);
  },
  addEvent(event) {
    sql.run('INSERT INTO import_batch_events VALUES(?,?,?,?,?,?,?,?,?)', event.id, event.batchId, event.fromStatus || null, event.toStatus, event.code, event.actorId || null, event.reason || null, JSON.stringify(event.details || {}), event.at);
  },
  commitRoster(batchId, actorId, reason, committedAt) {
    const records = sql.all(`SELECT * FROM import_records WHERE import_batch_id=? AND current_decision<>'excluded' AND validation_status='valid' ORDER BY row_number`, batchId);
    const batch = sql.get('SELECT * FROM import_batches WHERE import_batch_id=?', batchId);
    const actions = [];
    sql.transaction(() => {
      for (const record of records) {
        const payload = JSON.parse(record.normalized_payload_json);
        const existing = sql.get(`SELECT * FROM activity_people WHERE activity_id=? AND user_id=? AND relationship_type='participant' AND status='active' ORDER BY assigned_at DESC LIMIT 1`, batch.target_entity_id, record.resolved_user_id);
        let action = 'created', entityId;
        if (existing && (existing.group_code || '') === (payload.group_code || '') && (existing.planned_attendance_status || '') === payload.planned_attendance_status) {
          action = 'no_change'; entityId = existing.activity_person_id;
        } else {
          entityId = `AP-IMPORT-${record.import_record_id}`;
          if (existing) {
            action = 'superseded';
            sql.run(`UPDATE activity_people SET status='superseded',effective_until=?,updated_by_user_id=?,updated_at=? WHERE activity_person_id=?`, committedAt.slice(0,10), actorId, committedAt, existing.activity_person_id);
          }
          sql.run(`INSERT INTO activity_people(activity_person_id,activity_id,user_id,person_type,relationship_type,group_code,planned_attendance_status,attendance_approval_status,can_edit,can_view_raw_media,can_submit_response,effective_from,assigned_by_user_id,assigned_at,status,supersedes_activity_person_id,updated_by_user_id,updated_at)
            VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, entityId, batch.target_entity_id, record.resolved_user_id, 'student', 'participant', payload.group_code || null, payload.planned_attendance_status, 'pending', 0, 0, 1, committedAt.slice(0,10), actorId, committedAt, 'active', existing?.activity_person_id || null, actorId, committedAt);
        }
        sql.run(`INSERT INTO import_record_links VALUES(?,?,?,?,?,?,?,?,?,?)`, `IRL-${record.import_record_id}`, record.import_record_id, 'activity_person', entityId, null, action, 'current', actorId, committedAt, reason);
        sql.run(`UPDATE import_records SET current_status='committed',updated_at=? WHERE import_record_id=?`, committedAt, record.import_record_id);
        actions.push({ recordId: record.import_record_id, entityId, action });
      }
      sql.run(`UPDATE import_batches SET processing_status='committed',committed_at=?,committed_by_user_id=?,committed_rows=?,updated_by_user_id=?,updated_at=? WHERE import_batch_id=?`, committedAt, actorId, records.length, actorId, committedAt, batchId);
      sql.run(`UPDATE activities SET updated_at=? WHERE activity_id=?`, committedAt, batch.target_entity_id);
    });
    return actions;
  },
  activityCatalogueRows(schoolId) {
    return sql.all(`SELECT a.activity_id,a.operational_status,r.revision_number,r.title_en,r.title_zh,r.description_en,r.description_zh,
        r.activity_type,r.subject_id,r.department_id,r.start_at,r.end_at,r.owner_user_id,owner.staff_number owner_staff_number,
        r.requested_form_version_id,r.media_capture_expected,r.location
      FROM activities a JOIN activity_revisions r ON r.activity_revision_id=a.latest_revision_id
      LEFT JOIN users owner ON owner.user_id=r.owner_user_id
      WHERE a.school_id=? ORDER BY a.activity_id`, schoolId);
  },
  staffByIdentifier(schoolId, identifier) {
    return sql.all(`SELECT user_id,name_en,name_zh,staff_number,external_user_id FROM users
      WHERE school_id=? AND user_type='staff' AND status='active' AND (staff_number=? OR external_user_id=?)`, schoolId, identifier, identifier);
  },
  commitActivityCatalogue(batchId, actorId, reason, committedAt) {
    const records = sql.all(`SELECT * FROM import_records WHERE import_batch_id=? AND current_decision<>'excluded' AND validation_status='valid' ORDER BY row_number`, batchId);
    const actions = [];
    const addImpact = (activityId, recordId, type, id, status, impactReason) => sql.run(`INSERT INTO activity_dependency_impacts VALUES(?,?,?,?,?,?,?,?,?,?,?)`,
      `ADI-${recordId}-${type}-${id}`, activityId, type, id, status, impactReason, actorId, committedAt, null, null, null);
    sql.transaction(() => {
      for (const record of records) {
        const payload = JSON.parse(record.normalized_payload_json);
        const activity = sql.get('SELECT * FROM activities WHERE activity_id=?', payload.activity_id);
        const current = sql.get('SELECT * FROM activity_revisions WHERE activity_revision_id=?', activity.latest_revision_id);
        let action = 'no_change', entityVersionId = current.activity_revision_id;
        if (payload.lifecycle_action === 'upsert' && payload.change_fields) {
          action = 'successor_revision_created';
          entityVersionId = `AREV-IMPORT-${record.import_record_id}`;
          if (current.approval_status === 'pending_review') {
            sql.run(`UPDATE activity_revisions SET approval_status='withdrawn' WHERE activity_revision_id=?`, current.activity_revision_id);
            sql.run(`UPDATE approval_assignments SET status='withdrawn' WHERE target_version_id=? AND status IN ('assigned','in_review')`, current.activity_revision_id);
          }
          sql.run(`INSERT INTO activity_revisions(activity_revision_id,activity_id,revision_number,title_en,title_zh,description_en,description_zh,activity_type,subject_id,department_id,start_at,end_at,owner_user_id,requested_form_version_id,media_capture_expected,location,approval_status,publication_status,material_change_reason,supersedes_revision_id,created_by_user_id,created_at,requested_publisher_user_id)
            VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, entityVersionId, activity.activity_id, current.revision_number + 1, payload.title_en, payload.title_zh || null, payload.description_en, payload.description_zh || null, payload.activity_type || null, payload.subject_id || null, payload.department_id || null, payload.start_at, payload.end_at, record.resolved_user_id, payload.requested_form_version_id || null, Number(payload.media_capture_expected || 0), payload.location || null, 'draft', 'unpublished', payload.change_reason, current.activity_revision_id, actorId, committedAt, current.requested_publisher_user_id || null);
          sql.run(`INSERT INTO activity_vask_items SELECT ?,activity_id,vask_item_id,vask_item_version,source,rationale,'pending_review',?,? FROM activity_vask_items WHERE activity_revision_id=?`, entityVersionId, actorId, committedAt, current.activity_revision_id);
          sql.run(`INSERT INTO activity_revision_risk_flags SELECT ?,flag_code FROM activity_revision_risk_flags WHERE activity_revision_id=?`, entityVersionId, current.activity_revision_id);
          if (current.owner_user_id !== record.resolved_user_id) {
            const previousOwner = sql.get(`SELECT * FROM activity_people WHERE activity_id=? AND relationship_type='owner' AND status='active' ORDER BY assigned_at DESC LIMIT 1`, activity.activity_id);
            if (previousOwner) sql.run(`UPDATE activity_people SET status='superseded',effective_until=?,updated_by_user_id=?,updated_at=? WHERE activity_person_id=?`, committedAt.slice(0,10), actorId, committedAt, previousOwner.activity_person_id);
            sql.run(`INSERT INTO activity_people(activity_person_id,activity_id,user_id,person_type,relationship_type,planned_attendance_status,can_edit,can_view_raw_media,can_submit_response,effective_from,assigned_by_user_id,assigned_at,status,supersedes_activity_person_id,updated_by_user_id,updated_at)
              VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, `AP-IMPORT-${record.import_record_id}`, activity.activity_id, record.resolved_user_id, 'staff', 'owner', 'assigned', 1, 1, 1, committedAt.slice(0,10), actorId, committedAt, 'active', previousOwner?.activity_person_id || null, actorId, committedAt);
          }
          const period = sql.get(`SELECT period_id FROM academic_periods WHERE school_id=? AND status IN ('open','planned') AND start_date<=? AND end_date>=? ORDER BY resolution_priority DESC,sequence LIMIT 1`, activity.school_id, payload.start_at.slice(0,10), payload.end_at.slice(0,10));
          sql.run(`UPDATE activities SET latest_revision_id=?,operational_status='draft',resolved_period_id=?,period_resolution_status='resolved',period_resolved_at=?,updated_at=? WHERE activity_id=?`, entityVersionId, period?.period_id || activity.resolved_period_id, committedAt, committedAt, activity.activity_id);
        } else if (payload.lifecycle_action === 'disable' && activity.operational_status !== 'disabled') {
          action = 'disabled';
          sql.run(`UPDATE activities SET disabled_previous_status=operational_status,operational_status='disabled',disabled_reason=?,disabled_by_user_id=?,disabled_at=?,updated_at=? WHERE activity_id=?`, payload.change_reason, actorId, committedAt, committedAt, activity.activity_id);
          sql.run(`INSERT INTO activity_lifecycle_events VALUES(?,?,?,?,?,?,?,?,?)`, `ALE-${record.import_record_id}`, activity.activity_id, 'disable', activity.operational_status, 'disabled', payload.change_reason, actorId, record.import_record_id, committedAt);
          const impactReason = `Activity disabled by explicit catalogue action: ${payload.change_reason}`;
          for (const item of sql.all('SELECT proof_item_id id FROM proof_items WHERE activity_id=?', activity.activity_id)) addImpact(activity.activity_id, record.import_record_id, 'proof_item', item.id, 'needs_review', impactReason);
          for (const item of sql.all(`SELECT submission.assessment_submission_id id FROM assessment_submissions submission JOIN assignment_recipients recipient ON recipient.assignment_recipient_id=submission.assignment_recipient_id JOIN assessment_assignments assignment ON assignment.activity_form_assignment_id=recipient.assessment_assignment_id WHERE assignment.activity_id=?`, activity.activity_id)) addImpact(activity.activity_id, record.import_record_id, 'assessment_submission', item.id, 'needs_review', impactReason);
          for (const item of sql.all(`SELECT observation.framework_observation_id id FROM framework_observations observation JOIN feedback ON feedback.feedback_id=observation.feedback_id WHERE feedback.activity_id=?`, activity.activity_id)) addImpact(activity.activity_id, record.import_record_id, 'framework_observation', item.id, 'stale', impactReason);
          for (const item of sql.all(`SELECT selection_id id FROM proud_moment_selections WHERE source_type='activity' AND source_id=?`, activity.activity_id)) addImpact(activity.activity_id, record.import_record_id, 'proud_moment_selection', item.id, 'needs_review', impactReason);
          for (const item of sql.all(`SELECT portfolio_version_item_id id FROM portfolio_version_items WHERE source_type='activity' AND source_id=?`, activity.activity_id)) addImpact(activity.activity_id, record.import_record_id, 'portfolio_version_item', item.id, 'needs_review', impactReason);
        } else if (payload.lifecycle_action === 'restore' && activity.operational_status === 'disabled') {
          action = 'restored';
          const restoredStatus = activity.disabled_previous_status || (current.publication_status === 'published' ? 'scheduled' : current.approval_status === 'approved' ? 'approved' : 'draft');
          sql.run(`UPDATE activities SET operational_status=?,disabled_previous_status=NULL,disabled_reason=NULL,disabled_by_user_id=NULL,disabled_at=NULL,updated_at=? WHERE activity_id=?`, restoredStatus, committedAt, activity.activity_id);
          sql.run(`INSERT INTO activity_lifecycle_events VALUES(?,?,?,?,?,?,?,?,?)`, `ALE-${record.import_record_id}`, activity.activity_id, 'restore', 'disabled', restoredStatus, payload.change_reason, actorId, record.import_record_id, committedAt);
        }
        sql.run(`INSERT INTO import_record_links VALUES(?,?,?,?,?,?,?,?,?,?)`, `IRL-${record.import_record_id}`, record.import_record_id, 'activity', activity.activity_id, entityVersionId, action, action === 'disabled' ? 'needs_review' : 'current', actorId, committedAt, reason);
        sql.run(`UPDATE import_records SET current_status='committed',updated_at=? WHERE import_record_id=?`, committedAt, record.import_record_id);
        actions.push({ recordId: record.import_record_id, entityId: activity.activity_id, entityVersionId, action });
      }
      sql.run(`UPDATE import_batches SET processing_status='committed',committed_at=?,committed_by_user_id=?,committed_rows=?,updated_by_user_id=?,updated_at=? WHERE import_batch_id=?`, committedAt, actorId, records.length, actorId, committedAt, batchId);
    });
    return actions;
  },
  disableBatch(batchId, actorId, reason, at) {
    sql.run(`UPDATE import_batches SET processing_status='disabled',disabled_reason=?,disabled_by_user_id=?,disabled_at=?,updated_by_user_id=?,updated_at=? WHERE import_batch_id=? AND committed_at IS NULL AND disabled_at IS NULL`, reason, actorId, at, actorId, at, batchId);
  },
  setSourceStatus(sourceId, status, actorId, reason, at) {
    if (status === 'disabled') sql.run(`UPDATE source_systems SET status='disabled',disabled_reason=?,disabled_by_user_id=?,disabled_at=?,updated_by_user_id=?,updated_at=? WHERE source_system_id=?`, reason, actorId, at, actorId, at, sourceId);
    else sql.run(`UPDATE source_systems SET status='active',disabled_reason=NULL,disabled_by_user_id=NULL,disabled_at=NULL,updated_by_user_id=?,updated_at=? WHERE source_system_id=?`, actorId, at, sourceId);
  },
  usersByIdentifier(schoolId, identifier) {
    return sql.all(`SELECT user_id,name_en,name_zh,student_number,external_user_id FROM users WHERE school_id=? AND user_type='student' AND status='active' AND (student_number=? OR external_user_id=?)`, schoolId, identifier, identifier);
  },
};
