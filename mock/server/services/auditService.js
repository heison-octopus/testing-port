import { db, now } from '../db.js';

export function audit(actor, action, entityType, entityId, before = null, after = null) {
  db.prepare(`INSERT INTO audit_logs(actor_user_id,action,entity_type,entity_id,before_json,after_json,created_at)
    VALUES(?,?,?,?,?,?,?)`).run(actor ?? null, action, entityType, entityId ?? null, before ? JSON.stringify(before) : null, after ? JSON.stringify(after) : null, now());
}
