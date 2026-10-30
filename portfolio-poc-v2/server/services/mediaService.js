import { randomUUID } from 'node:crypto';
import { mediaRepository } from '../repositories/mediaRepository.js';
import { identityRepository } from '../repositories/identityRepository.js';
import { capabilityDecision, fail } from './access.js';

function positive(value, fallback, maximum = Number.MAX_SAFE_INTEGER) {
  const parsed = Number.parseInt(String(value || ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, maximum) : fallback;
}

function resource(activity) {
  return { school_id: activity.school_id, activity_id: activity.activity_id, group_id: activity.group_id, subject_id: activity.subject_id, department_id: activity.department_id, programme_id: activity.group_id === 'GRP-STUDENT-DEV' ? 'student_development' : null };
}

function activityAccess(user, activityId, capabilityKey, allowAssignedEditor = false) {
  const activity = mediaRepository.activity(activityId);
  if (!activity || activity.school_id !== user.school_id) fail(404, 'Activity not found');
  const decision = capabilityDecision(user, capabilityKey, resource(activity));
  const person = mediaRepository.activityPerson(activityId, user.user_id);
  if (!decision.allowed && !(allowAssignedEditor && person?.can_edit)) fail(403, `Missing capability: ${capabilityKey}`);
  return { activity, decision, person };
}

function ensureText(value, name, maximum = 255) {
  const result = String(value || '').trim();
  if (!result || result.length > maximum) fail(400, `${name} is required and must not exceed ${maximum} characters`);
  return result;
}

function safeOpaqueReference(value) {
  const reference = String(value || '').trim();
  if (!reference) return null;
  if (reference.startsWith('/') || reference.startsWith('file:') || reference.includes('..') || reference.includes('\\') || /^[a-z]:\//i.test(reference)) fail(400, 'Storage references must be opaque and must not expose a filesystem path');
  return reference;
}

export const mediaService = {
  list(user, input) {
    const schoolDecision = capabilityDecision(user, 'media.metadata.view', { school_id: user.school_id });
    const filters = { ...input, page: positive(input.page, 1), limit: positive(input.limit, 20, 100), status: input.status || 'active' };
    filters.offset = (filters.page - 1) * filters.limit;
    const result = mediaRepository.search(user.school_id, filters, user.user_id, schoolDecision.allowed);
    return { items: result.rows, page: filters.page, pageSize: filters.limit, total: result.total, totalPages: Math.ceil(result.total / filters.limit) };
  },
  detail(user, mediaAssetId) {
    const asset = mediaRepository.asset(mediaAssetId);
    if (!asset || asset.school_id !== user.school_id) fail(404, 'Media asset not found');
    const schoolDecision = capabilityDecision(user, 'media.metadata.view', { school_id: user.school_id });
    const assigned = asset.activities.some(item => mediaRepository.activityPerson(item.activity_id, user.user_id));
    if (!schoolDecision.allowed && asset.owner_user_id !== user.user_id && asset.uploaded_by_user_id !== user.user_id && !assigned) fail(404, 'Media asset not found');
    const { storage_reference: _storageReference, ...safe } = asset;
    return safe;
  },
  create(user, input) {
    activityAccess(user, input.activityId, 'media.upload', true);
    if (input.ownerUserId) {
      const owner = identityRepository.user(input.ownerUserId);
      if (!owner || owner.school_id !== user.school_id) fail(400, 'Media owner must be an active user in this school');
    }
    const source = input.mediaSourceId ? mediaRepository.mediaSource(input.mediaSourceId) : null;
    if (input.mediaSourceId && (!source || source.school_id !== user.school_id || source.status !== 'active')) fail(400, 'Media source must be active in this school');
    const external = input.externalMediaReferenceId ? mediaRepository.externalReference(input.externalMediaReferenceId) : null;
    if (input.externalMediaReferenceId && (!external || external.school_id !== user.school_id || external.availability_status !== 'available')) fail(400, 'External media reference must be available in this school');
    if (external?.activity_id && external.activity_id !== input.activityId) fail(400, 'External media reference belongs to a different activity');
    if (source && external && external.media_source_id !== source.media_source_id) fail(400, 'External media reference does not belong to the selected media source');
    const createdAt = new Date().toISOString();
    const mediaType = ensureText(input.mediaType, 'Media type', 40);
    if (!['image','audio','video','document','other'].includes(mediaType)) fail(400, 'Unsupported media type');
    const id = `MED-${randomUUID()}`;
    const record = {
      id,
      schoolId: user.school_id,
      activityId: input.activityId,
      activityMediaId: `AM-${randomUUID()}`,
      lifecycleId: `MLE-${randomUUID()}`,
      ownerId: input.ownerUserId || null,
      actorId: user.user_id,
      createdAt,
      title: ensureText(input.title, 'Media title'),
      originalFileName: ensureText(input.originalFileName, 'Original file name'),
      mediaType,
      mimeType: String(input.mimeType || '').trim() || null,
      mediaSourceId: input.mediaSourceId || null,
      externalReferenceId: input.externalMediaReferenceId || null,
      storageReference: safeOpaqueReference(input.storageReference),
      checksum: String(input.checksumSha256 || '').trim() || null,
      consentStatus: ensureText(input.consentStatus, 'Consent status', 40),
      visibility: ensureText(input.visibility, 'Visibility', 60),
      capturedAt: input.capturedAt || createdAt,
      retentionReviewDate: input.retentionReviewDate || null,
      relationshipType: input.relationshipType || 'activity_evidence',
      reason: String(input.reason || 'Registered as activity media.').trim(),
    };
    mediaRepository.createAsset(record);
    identityRepository.audit(user.school_id, user.user_id, 'media.asset.created', 'media_asset', id, record.reason);
    return this.detail(user, id);
  },
  requestExtraction(user, mediaAssetId, input) {
    const asset = mediaRepository.asset(mediaAssetId);
    if (!asset || asset.school_id !== user.school_id) fail(404, 'Media asset not found');
    const activityId = input.activityId || asset.activities[0]?.activity_id;
    if (!activityId) fail(400, 'The media asset must be linked to an activity before extraction');
    activityAccess(user, activityId, 'media.extraction.request', true);
    const id = `MEXT-${randomUUID()}`;
    const record = {
      id,
      mediaAssetId,
      extractionType: ensureText(input.extractionType, 'Extraction type', 80),
      providerKey: ensureText(input.providerKey, 'Provider key', 100),
      providerVersion: String(input.providerVersion || '').trim() || null,
      supersedesId: input.supersedesMediaExtractionId || null,
      actorId: user.user_id,
      createdAt: new Date().toISOString(),
    };
    mediaRepository.createExtraction(record);
    identityRepository.audit(user.school_id, user.user_id, 'media.extraction.requested', 'media_extraction', id, input.reason || record.extractionType);
    return mediaRepository.extraction(id);
  },
  reviewExtraction(user, extractionId, input) {
    const extraction = mediaRepository.extraction(extractionId);
    if (!extraction || extraction.school_id !== user.school_id) fail(404, 'Media extraction not found');
    if (!extraction.activity_id) fail(400, 'The extraction is not linked to an activity');
    activityAccess(user, extraction.activity_id, 'media.extraction.review');
    if (!['accepted','changes_requested','rejected'].includes(input.outcome)) fail(400, 'Unsupported extraction-review outcome');
    const reason = ensureText(input.reason, 'Review reason', 4_000);
    if (!['succeeded','completed'].includes(extraction.processing_status)) fail(400, 'Only a completed extraction can be reviewed');
    const reviewedAt = new Date().toISOString();
    mediaRepository.reviewExtraction(extractionId, { outcome: input.outcome, reason, correctedContentText: input.correctedContentText }, user.user_id, reviewedAt);
    identityRepository.audit(user.school_id, user.user_id, `media.extraction.${input.outcome}`, 'media_extraction', extractionId, reason);
    return mediaRepository.extraction(extractionId);
  },
  disable(user, mediaAssetId, input) {
    const asset = mediaRepository.asset(mediaAssetId);
    if (!asset || asset.school_id !== user.school_id) fail(404, 'Media asset not found');
    const activityId = asset.activities[0]?.activity_id;
    if (!activityId) fail(400, 'The media asset is not linked to an activity');
    activityAccess(user, activityId, 'media.upload', true);
    const reason = ensureText(input.reason, 'Disable reason', 4_000), disabledAt = new Date().toISOString();
    mediaRepository.disableAsset(mediaAssetId, reason, user.user_id, disabledAt);
    identityRepository.audit(user.school_id, user.user_id, 'media.asset.disabled', 'media_asset', mediaAssetId, reason);
    return this.detail(user, mediaAssetId);
  },
};
