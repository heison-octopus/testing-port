import { randomUUID } from 'node:crypto';
import { sql } from './database.js';

function filteredWhere(schoolId, filters, userId, schoolWide) {
  const clauses = ['asset.school_id=?'];
  const params = [schoolId];
  if (!schoolWide) {
    clauses.push(`(asset.owner_user_id=? OR asset.uploaded_by_user_id=? OR EXISTS(SELECT 1 FROM activity_media scoped_link JOIN activity_people person ON person.activity_id=scoped_link.activity_id AND person.status='active' WHERE scoped_link.media_asset_id=asset.media_asset_id AND scoped_link.status='active' AND person.user_id=?))`);
    params.push(userId, userId, userId);
  }
  if (filters.activityId) { clauses.push('link.activity_id=?'); params.push(filters.activityId); }
  if (filters.mediaType) { clauses.push('asset.media_type=?'); params.push(filters.mediaType); }
  if (filters.status && filters.status !== 'all') { clauses.push('asset.operational_status=?'); params.push(filters.status); }
  if (filters.processingStatus) { clauses.push('asset.processing_status=?'); params.push(filters.processingStatus); }
  if (filters.consentStatus) { clauses.push('asset.consent_status=?'); params.push(filters.consentStatus); }
  if (filters.search) {
    clauses.push(`(LOWER(asset.title) LIKE ? OR LOWER(asset.original_file_name) LIKE ? OR LOWER(COALESCE(revision.title_en,'')) LIKE ? OR LOWER(COALESCE(revision.title_zh,'')) LIKE ?)`);
    const term = `%${String(filters.search).toLowerCase()}%`;
    params.push(term, term, term, term);
  }
  return { where: clauses.join(' AND '), params };
}

export const mediaRepository = {
  mediaSource(mediaSourceId) { return sql.get(`SELECT source_system_id media_source_id,school_id,source_code,name_en,name_zh,connector_type,resolution_mode,authentication_profile_ref,allowed_reference_pattern,returns_metadata,returns_short_lived_url,returns_streamed_bytes,COALESCE(media_status,status) status,notes FROM source_systems WHERE source_system_id=? AND source_purpose IN ('media','media_and_data_import')`, mediaSourceId); },
  externalReference(externalReferenceId) {
    return sql.get(`SELECT reference.*,reference.source_system_id media_source_id,source.school_id FROM external_media_references reference JOIN source_systems source ON source.source_system_id=reference.source_system_id WHERE reference.external_media_reference_id=?`, externalReferenceId);
  },
  search(schoolId, filters, userId, schoolWide) {
    const { where, params } = filteredWhere(schoolId, filters, userId, schoolWide);
    const from = ` FROM media_assets asset
      LEFT JOIN activity_media link ON link.media_asset_id=asset.media_asset_id AND link.status='active'
      LEFT JOIN activities activity ON activity.activity_id=link.activity_id
      LEFT JOIN activity_revisions revision ON revision.activity_revision_id=activity.current_approved_revision_id
      LEFT JOIN source_systems source ON source.source_system_id=asset.source_system_id`;
    const total = Number(sql.get(`SELECT COUNT(DISTINCT asset.media_asset_id) count${from} WHERE ${where}`, ...params)?.count || 0);
    const rows = sql.all(`SELECT asset.media_asset_id,asset.owner_user_id,asset.uploaded_by_user_id,asset.uploaded_at,asset.title,asset.original_file_name,asset.media_type,asset.mime_type,asset.source_system_id media_source_id,asset.external_media_reference_id,asset.checksum_sha256,asset.consent_status,asset.visibility,asset.moderation_status,asset.processing_status,asset.captured_at,asset.retention_review_date,asset.operational_status,asset.updated_at,asset.disabled_reason,asset.disabled_at,
      link.activity_id,link.relationship_type,revision.title_en activity_title_en,revision.title_zh activity_title_zh,
      source.source_code,source.name_en source_name_en,source.name_zh source_name_zh,
      uploader.name_en uploader_name,uploader.name_zh uploader_name_zh,
      (SELECT COUNT(*) FROM media_extractions extraction WHERE extraction.media_asset_id=asset.media_asset_id AND extraction.disabled_at IS NULL) extraction_count
      ${from} LEFT JOIN users uploader ON uploader.user_id=asset.uploaded_by_user_id
      WHERE ${where} GROUP BY asset.media_asset_id ORDER BY asset.captured_at DESC,asset.media_asset_id LIMIT ? OFFSET ?`, ...params, filters.limit, filters.offset);
    return { total, rows };
  },
  asset(mediaAssetId) {
    const asset = sql.get(`SELECT asset.*,asset.source_system_id media_source_id,source.source_code,source.name_en source_name_en,source.name_zh source_name_zh,uploader.name_en uploader_name,uploader.name_zh uploader_name_zh FROM media_assets asset LEFT JOIN source_systems source ON source.source_system_id=asset.source_system_id LEFT JOIN users uploader ON uploader.user_id=asset.uploaded_by_user_id WHERE asset.media_asset_id=?`, mediaAssetId);
    if (!asset) return null;
    return {
      ...asset,
      activities: sql.all(`SELECT link.activity_id,link.relationship_type,link.status,revision.title_en,revision.title_zh FROM activity_media link JOIN activities activity ON activity.activity_id=link.activity_id LEFT JOIN activity_revisions revision ON revision.activity_revision_id=activity.current_approved_revision_id WHERE link.media_asset_id=? ORDER BY link.added_at`, mediaAssetId),
      extractions: sql.all(`SELECT extraction.*,requester.name_en requester_name,requester.name_zh requester_name_zh,reviewer.name_en reviewer_name,reviewer.name_zh reviewer_name_zh FROM media_extractions extraction LEFT JOIN users requester ON requester.user_id=extraction.requested_by_user_id LEFT JOIN users reviewer ON reviewer.user_id=extraction.reviewed_by_user_id WHERE extraction.media_asset_id=? ORDER BY extraction.requested_at DESC`, mediaAssetId),
      lifecycleEvents: sql.all(`SELECT event.*,event.entity_lifecycle_event_id media_lifecycle_event_id,event.entity_id media_asset_id,actor.name_en actor_name,actor.name_zh actor_name_zh FROM entity_lifecycle_events event JOIN users actor ON actor.user_id=event.actor_user_id WHERE event.entity_type='media_asset' AND event.entity_id=? ORDER BY event.occurred_at DESC`, mediaAssetId),
    };
  },
  activity(activityId) { return sql.get(`SELECT activity.*,revision.subject_id,revision.department_id FROM activities activity LEFT JOIN activity_revisions revision ON revision.activity_revision_id=activity.latest_revision_id WHERE activity.activity_id=?`, activityId); },
  activityPerson(activityId, userId) { return sql.get(`SELECT * FROM activity_people WHERE activity_id=? AND user_id=? AND status='active' ORDER BY assigned_at DESC LIMIT 1`, activityId, userId); },
  createAsset(record) {
    sql.transaction(() => {
      sql.run(`INSERT INTO media_assets(media_asset_id,school_id,owner_user_id,uploaded_by_user_id,uploaded_at,title,original_file_name,media_type,mime_type,source_system_id,external_media_reference_id,storage_reference,checksum_sha256,consent_status,visibility,moderation_status,processing_status,captured_at,retention_review_date,operational_status,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, record.id, record.schoolId, record.ownerId, record.actorId, record.createdAt, record.title, record.originalFileName, record.mediaType, record.mimeType, record.mediaSourceId, record.externalReferenceId, record.storageReference, record.checksum, record.consentStatus, record.visibility, 'pending', 'registered', record.capturedAt, record.retentionReviewDate, 'active', record.createdAt);
      sql.run(`INSERT INTO activity_media VALUES(?,?,?,?,?,?,?)`, record.activityMediaId, record.activityId, record.id, record.relationshipType, record.actorId, record.createdAt, 'active');
      sql.run(`INSERT INTO entity_lifecycle_events(entity_lifecycle_event_id,school_id,entity_type,entity_id,action,from_status,to_status,reason,actor_user_id,occurred_at) VALUES(?,?,?,?,?,?,?,?,?,?)`, record.lifecycleId, record.schoolId, 'media_asset', record.id, 'created', null, 'active', record.reason, record.actorId, record.createdAt);
    });
  },
  createExtraction(record) {
    sql.run(`INSERT INTO media_extractions(media_extraction_id,media_asset_id,extraction_type,provider_key,provider_version,processing_status,requested_by_user_id,requested_at,review_status,supersedes_media_extraction_id) VALUES(?,?,?,?,?,?,?,?,?,?)`, record.id, record.mediaAssetId, record.extractionType, record.providerKey, record.providerVersion, 'queued', record.actorId, record.createdAt, 'not_ready', record.supersedesId);
  },
  extraction(extractionId) { return sql.get(`SELECT extraction.*,asset.school_id,link.activity_id FROM media_extractions extraction JOIN media_assets asset ON asset.media_asset_id=extraction.media_asset_id LEFT JOIN activity_media link ON link.media_asset_id=asset.media_asset_id AND link.status='active' WHERE extraction.media_extraction_id=? LIMIT 1`, extractionId); },
  reviewExtraction(extractionId, input, actorId, reviewedAt) {
    sql.run(`UPDATE media_extractions SET review_status=?,reviewed_by_user_id=?,reviewed_at=?,review_reason=?,corrected_content_text=? WHERE media_extraction_id=?`, input.outcome, actorId, reviewedAt, input.reason, input.correctedContentText || null, extractionId);
  },
  disableAsset(mediaAssetId, reason, actorId, disabledAt) {
    sql.transaction(() => {
      const asset = sql.get(`SELECT school_id,operational_status FROM media_assets WHERE media_asset_id=?`, mediaAssetId);
      sql.run(`UPDATE media_assets SET operational_status='disabled',disabled_reason=?,disabled_by_user_id=?,disabled_at=?,updated_by_user_id=?,updated_at=? WHERE media_asset_id=?`, reason, actorId, disabledAt, actorId, disabledAt, mediaAssetId);
      sql.run(`INSERT INTO entity_lifecycle_events(entity_lifecycle_event_id,school_id,entity_type,entity_id,action,from_status,to_status,reason,actor_user_id,occurred_at) VALUES(?,?,?,?,?,?,?,?,?,?)`, `MLE-${randomUUID()}`, asset.school_id, 'media_asset', mediaAssetId, 'disabled', asset.operational_status || null, 'disabled', reason, actorId, disabledAt);
    });
  },
};
