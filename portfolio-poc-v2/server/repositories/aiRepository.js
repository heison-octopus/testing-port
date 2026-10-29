import { sql } from './database.js';

function hydrateCandidate(row) {
  if (!row) return null;
  return {
    ...row,
    sourceRefs: JSON.parse(row.source_refs_json || '[]'),
    decisions: sql.all(`SELECT d.*,u.name_en decided_by_name,u.name_zh decided_by_name_zh
      FROM ai_candidate_decisions d JOIN users u ON u.user_id=d.decided_by_user_id
      WHERE d.candidate_id=? ORDER BY d.decided_at DESC`, row.candidate_id),
  };
}

export const aiRepository = {
  manifests(schoolId) {
    return sql.all(`SELECT m.*,u.name_en student_name,u.name_zh student_name_zh
      FROM ai_input_manifests m JOIN users u ON u.user_id=m.student_user_id
      WHERE m.school_id=? ORDER BY m.created_at DESC`, schoolId);
  },
  manifest(manifestId) {
    const manifest = sql.get(`SELECT m.*,u.name_en student_name,u.name_zh student_name_zh
      FROM ai_input_manifests m JOIN users u ON u.user_id=m.student_user_id WHERE m.manifest_id=?`, manifestId);
    if (!manifest) return null;
    return {
      ...manifest,
      sources: sql.all('SELECT * FROM ai_manifest_sources WHERE manifest_id=? ORDER BY display_order', manifestId),
      candidates: sql.all('SELECT * FROM ai_draft_candidates WHERE manifest_id=? ORDER BY created_at,candidate_id', manifestId).map(hydrateCandidate),
      narrative: sql.get(`SELECT n.* FROM learner_narrative_versions n WHERE n.source_manifest_id=? ORDER BY n.revision_number DESC LIMIT 1`, manifestId),
    };
  },
  candidate(candidateId) { return hydrateCandidate(sql.get('SELECT * FROM ai_draft_candidates WHERE candidate_id=?', candidateId)); },
  createCandidate(record) {
    sql.run(`INSERT INTO ai_draft_candidates(candidate_id,manifest_id,provider,model,prompt_version,generated_text_en,generated_text_zh,source_refs_json,review_status,created_by_user_id,created_at)
      VALUES(?,?,?,?,?,?,?,?,?,?,?)`, record.id, record.manifestId, record.provider, record.model, record.promptVersion, record.textEn, record.textZh, JSON.stringify(record.sourceRefs), 'pending_review', record.actorId, record.createdAt);
    return this.candidate(record.id);
  },
  decide(record) {
    sql.transaction(() => {
      sql.run(`INSERT INTO ai_candidate_decisions(decision_id,candidate_id,outcome,reason,decided_by_user_id,decided_at) VALUES(?,?,?,?,?,?)`, record.id, record.candidateId, record.outcome, record.reason, record.actorId, record.decidedAt);
      sql.run('UPDATE ai_draft_candidates SET review_status=? WHERE candidate_id=?', record.outcome, record.candidateId);
    });
    return this.candidate(record.candidateId);
  },
  narrative(narrativeId) {
    return sql.get(`SELECT n.*,v.school_id,v.student_user_id,v.period_id FROM learner_narrative_versions n
      JOIN portfolio_working_versions v ON v.portfolio_working_version_id=n.portfolio_working_version_id
      WHERE n.learner_narrative_version_id=?`, narrativeId);
  },
  editNarrative(record) {
    sql.run(`UPDATE learner_narrative_versions SET teacher_edited_text=?,edited_by_user_id=?,edit_reason=?,approval_status='pending_review'
      WHERE learner_narrative_version_id=?`, record.text, record.actorId, record.reason, record.narrativeId);
    return this.narrative(record.narrativeId);
  },
};
