import { db } from '../db.js';

const allowed = new Set([
  'users','students','academic_years','school_periods','classes','student_school_status_history',
  'student_class_memberships','activities','activity_staff','activity_participants','activity_vask',
  'questions','question_skill_mappings','activity_questions','responses','evidence','feedback',
  'ai_drafts','rollover_batches','requirements_decisions','sessions','audit_logs'
]);

export class Repository {
  constructor(table) {
    if (!allowed.has(table)) throw new Error(`Unsupported repository: ${table}`);
    this.table = table;
  }
  list(where = {}, orderBy = 'created_at DESC') {
    const keys = Object.keys(where);
    const clause = keys.length ? ` WHERE ${keys.map(k => `${k} = ?`).join(' AND ')}` : '';
    return db.prepare(`SELECT * FROM ${this.table}${clause} ORDER BY ${orderBy}`).all(...keys.map(k => where[k]));
  }
  find(id) { return db.prepare(`SELECT * FROM ${this.table} WHERE id = ?`).get(id); }
  create(row) {
    const keys = Object.keys(row);
    db.prepare(`INSERT INTO ${this.table} (${keys.join(',')}) VALUES (${keys.map(()=>'?').join(',')})`).run(...keys.map(k=>row[k]));
    return this.find(row.id);
  }
  update(id, changes) {
    const keys = Object.keys(changes);
    if (!keys.length) return this.find(id);
    db.prepare(`UPDATE ${this.table} SET ${keys.map(k=>`${k} = ?`).join(',')} WHERE id = ?`).run(...keys.map(k=>changes[k]), id);
    return this.find(id);
  }
}
