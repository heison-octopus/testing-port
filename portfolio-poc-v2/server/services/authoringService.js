import { authoringRepository } from '../repositories/authoringRepository.js';
import { canUseAny, fail } from './access.js';

function positive(value, fallback, maximum = Number.MAX_SAFE_INTEGER) {
  const parsed = Number.parseInt(String(value || ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, maximum) : fallback;
}

function filters(input, defaults = {}) {
  const page = positive(input.page, 1), limit = positive(input.limit, 20, 100);
  return { ...defaults, ...input, page, limit, offset: (page - 1) * limit };
}

function page(result, normalized, items = result.rows) {
  return { items, page: normalized.page, pageSize: normalized.limit, total: result.total, totalPages: Math.ceil(result.total / normalized.limit) };
}

function requireSearch(user, capability) {
  if (!canUseAny(user, [capability, 'policy.manage'])) fail(403, `Search access is not assigned: ${capability}`);
}

const audiences = { student: 'ROLE-STUDENT', teacher: 'ROLE-TEACHER', peer: 'ROLE-STUDENT', system: 'ROLE-SYSTEM' };

export const authoringService = {
  labels(user, input) {
    requireSearch(user, 'catalogue.label.search');
    const normalized = filters(input, { status: 'active', capability: 'labelling' });
    if (!['active','disabled','all'].includes(normalized.status)) fail(400, 'Label status must be active, disabled or all');
    if (!['labelling','assessment','both','all'].includes(normalized.capability)) fail(400, 'Catalogue capability must be labelling, assessment, both or all');
    const result = authoringRepository.labels(user.school_id, normalized);
    return page(result, normalized, result.rows.map(item => {
      const active = item.catalogue_status === 'active' && !item.catalogue_disabled_at && item.axis_status === 'active';
      return { ...item, selectable: active, historicalReferenceAllowed: true, validationState: active ? 'active_selectable' : 'historical_reference_only' };
    }));
  },

  questions(user, input) {
    requireSearch(user, 'question_bank.search');
    const normalized = filters(input, { status: 'active' });
    if (!['active','disabled','all'].includes(normalized.status)) fail(400, 'Question status must be active, disabled or all');
    const result = authoringRepository.questions(user.school_id, normalized);
    return page(result, normalized, result.rows.map(item => ({
      ...item,
      scale_options: item.scale_options_json ? JSON.parse(item.scale_options_json) : [],
      selectable: item.operational_status === 'active' && item.status === 'active' && !item.disabled_at && item.bank_status === 'active',
      abilityDefinitionComplete: Boolean(item.ability_code && item.ability_name_zh),
    })));
  },

  questionBlocks(user, input) {
    requireSearch(user, 'question_block.search');
    const normalized = filters({ ...input, audience: audiences[input.audience] || input.audience }, { status: 'active' });
    if (!['active','disabled','all'].includes(normalized.status)) fail(400, 'Question-block status must be active, disabled or all');
    const result = authoringRepository.questionBlocks(user.school_id, normalized);
    return page(result, normalized, result.rows.map(item => ({
      ...item,
      itemCount: item.items.length,
      selectable: item.operational_status === 'active' && !item.disabled_at && item.review_status === 'approved' && item.publication_status === 'published',
      historicalReferenceAllowed: true,
    })));
  },
};
