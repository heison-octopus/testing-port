import { readFileSync } from 'node:fs';
import { join } from 'node:path';

function parseCsv(text) {
  const rows = [];
  let row = [], value = '', quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (char === '"' && text[index + 1] === '"') { value += '"'; index += 1; }
      else if (char === '"') quoted = false;
      else value += char;
    } else if (char === '"') quoted = true;
    else if (char === ',') { row.push(value); value = ''; }
    else if (char === '\n') { row.push(value.replace(/\r$/, '')); if (row.some(cell => cell !== '')) rows.push(row); row = []; value = ''; }
    else value += char;
  }
  if (value || row.length) { row.push(value); rows.push(row); }
  const [headers, ...data] = rows;
  return data.map(cells => Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ''])));
}

const contracts = [
  ['01_users_import.csv', 'users', ['user_id','school_id','external_user_id','user_type','student_number','staff_number','name_en','name_zh','email','status','created_at']],
  ['22_role_definitions.csv', 'role_definitions'],
  ['23_user_role_assignments.csv', 'user_role_assignments'],
  ['38_staff_position_definitions.csv', 'staff_position_definitions'],
  ['39_user_position_assignments.csv', 'user_position_assignments'],
  ['40_departments.csv', 'departments'],
  ['41_subjects.csv', 'subjects'],
  ['42_department_subjects.csv', 'department_subjects'],
  ['43_capability_definitions.csv', 'capability_definitions'],
  ['44_role_capabilities.csv', 'role_capabilities'],
  ['45_capability_policy_overrides.csv', 'capability_policy_overrides'],
  ['46_approval_policy_versions.csv', 'approval_policy_versions'],
  ['47_approval_policy_steps.csv', 'approval_policy_steps'],
  ['48_approval_assignments.csv', 'approval_assignments'],
  ['49_approval_decisions.csv', 'approval_decisions'],
  ['50_approval_escalations.csv', 'approval_escalations'],
  ['04_activities.csv', 'activities'],
  ['05_activity_people.csv', 'activity_people'],
  ['51_activity_revisions.csv', 'activity_revisions'],
  ['52_activity_change_requests.csv', 'activity_change_requests'],
  ['53_portfolio_working_versions.csv', 'portfolio_working_versions'],
  ['54_portfolio_version_items.csv', 'portfolio_version_items'],
  ['55_learner_narrative_versions.csv', 'learner_narrative_versions'],
  ['56_staff_groups.csv', 'staff_groups'],
  ['57_staff_group_memberships.csv', 'staff_group_memberships'],
];

const numericFields = new Set(['sort_order','is_primary','assignable','sensitive','policy_version','allow_self_assignment','allow_self_approval','publication_separate','max_human_steps','unassigned_escalation_minutes','overdue_escalation_minutes','step_number','required_decision_count','reason_required','revision_number','media_capture_expected','can_edit','can_view_raw_media','can_submit_response','version_number','is_student_latest','student_selected','display_order']);

function valueFor(field, value) {
  if (value === '') return null;
  if (value === 'true') return 1;
  if (value === 'false') return 0;
  if (numericFields.has(field)) return Number(value);
  return value;
}

function insertRows(sql, table, rows, selectedColumns) {
  if (!rows.length) return;
  const columns = selectedColumns || Object.keys(rows[0]);
  const statement = `INSERT OR IGNORE INTO ${table}(${columns.join(',')}) VALUES(${columns.map(() => '?').join(',')})`;
  for (const row of rows) sql.run(statement, ...columns.map(column => valueFor(column, row[column])));
}

export function seedFromContracts(sql, csvDirectory) {
  if (sql.get('SELECT 1 FROM seed_state WHERE seed_key=?', 'csv-3.0')) return;
  sql.transaction(() => {
    sql.run('INSERT INTO schools(school_id,name_en,name_zh,status) VALUES(?,?,?,?)', 'BHSS', 'BHSS demonstration school', 'BHSS 示範學校', 'active');
    for (const [file, table, columns] of contracts) {
      insertRows(sql, table, parseCsv(readFileSync(join(csvDirectory, file), 'utf8')), columns);
    }
    for (const studentId of ['USR-S-001','USR-S-002','USR-S-003']) {
      sql.run('INSERT INTO student_class_memberships VALUES(?,?,?,?,?,?,?,?)', `SCM-${studentId}`, studentId, 'BHSS', 'S1A-2026-27', '2026-27-P1', '2026-09-01', '2027-08-31', 'active');
    }
    sql.run('INSERT INTO portfolio_snapshots VALUES(?,?,?,?,?,?,?,?,?)', 'PSNAP-S1-P1-v1', 'BHSS', 'USR-S-001', '2026-27-P1', 'PWV-S1-001', 1, 'published', 'USR-ST-001', '2026-12-20T15:00:00+08:00');
    sql.run('INSERT INTO seed_state VALUES(?,?,?)', 'csv-3.0', csvDirectory, new Date().toISOString());
  });
}
