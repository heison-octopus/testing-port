import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';

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
  ['03_reporting_periods.csv', 'academic_periods'],
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
  ['06_form_templates.csv', 'form_versions'],
  ['24_rubric_catalogues.csv', 'rubric_catalogues'],
  ['25_rubric_axes.csv', 'rubric_axes'],
  ['26_rubric_levels.csv', 'rubric_levels'],
  ['36_published_rubric_results.csv', 'published_rubric_results'],
];

const numericFields = new Set(['sort_order','is_primary','assignable','sensitive','policy_version','allow_self_assignment','allow_self_approval','publication_separate','max_human_steps','unassigned_escalation_minutes','overdue_escalation_minutes','step_number','required_decision_count','reason_required','revision_number','media_capture_expected','can_edit','can_view_raw_media','can_submit_response','is_student_latest','student_selected','display_order','sequence','is_summer','resolution_priority','is_system_default','labelling_capable','assessment_capable','radar_eligible','level_order','numeric_value','is_prerequisite_chain','published_numeric_value','item_order','required','moderation_required','include_in_portfolio','disabled','score_min','score_max','score_out_of']);

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

const loadedSeedFiles = new Set([
  ...contracts.map(([file]) => file),
  '07_form_template_items.csv','13_activity_form_assignments.csv','17_proud_moment_selections.csv','19_peer_review_assignments.csv','30_proof_items.csv','31_proof_links.csv',
  '58_rubric_groups.csv','59_rubric_step_definitions.csv',
]);

const slug = value => String(value).toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-|-$/g, '');
const digest = value => createHash('sha256').update(value).digest('hex');

function ensureImportSeedLedger(sql, csvDirectory) {
  const seededAt = new Date().toISOString();
  const sources = [
    ['SRC-BHSS-ADMIN','bhss_admin','BHSS Admin','BHSS 管理匯入','seed_files',null,null],
    ['SRC-BHSS-PLATFORM','bhss_platform','BHSS Platform','BHSS 平台','seed_files',null,null],
    ['SRC-TIME-INFINITY','time_infinity','Time Infinity','Time Infinity','approved_json_api','TIME_INFINITY_ROSTER_BASE_URL','TIME_INFINITY_API_KEY'],
  ];
  for (const source of sources) sql.run(`INSERT OR IGNORE INTO source_systems(source_system_id,school_id,source_code,name_en,name_zh,connector_type,endpoint_env_key,authentication_profile_ref,status,created_by_user_id,created_at,updated_by_user_id,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)`, source[0], 'BHSS', ...source.slice(1), 'active', 'USR-ADM-001', '2026-08-20T08:00:00+08:00', 'USR-ADM-001', seededAt);
  sql.run(`INSERT OR IGNORE INTO import_contract_versions VALUES(?,?,?,?,?,?,?,?,?,?,?)`, 'ICV-ACTIVITY-ROSTER-1', 'activity_roster', '1.0', 'activity_person', JSON.stringify(['csv','xlsx','connector_json']), 'active', 'USR-ADM-001', seededAt, null, null, null);
  sql.run(`INSERT OR IGNORE INTO import_contract_versions VALUES(?,?,?,?,?,?,?,?,?,?,?)`, 'ICV-ACTIVITY-CATALOGUE-1', 'activity_catalogue', '1.0', 'activity_revision', JSON.stringify(['csv','xlsx']), 'active', 'USR-ADM-001', seededAt, null, null, null);

  const sourceIds = { 'BHSS Admin': 'SRC-BHSS-ADMIN', 'BHSS Platform': 'SRC-BHSS-PLATFORM', 'Time Infinity': 'SRC-TIME-INFINITY' };
  const manifest = parseCsv(readFileSync(join(csvDirectory, '00_upload_manifest.csv'), 'utf8'));
  for (const item of manifest) {
    const raw = readFileSync(join(csvDirectory, item.source_file));
    const rows = parseCsv(raw.toString('utf8'));
    const contractId = `ICV-SEED-${slug(item.record_type)}-${slug(item.schema_version)}`;
    const batchId = `SEED-${item.upload_batch_id}`;
    const committed = loadedSeedFiles.has(item.source_file);
    sql.run(`INSERT OR IGNORE INTO import_contract_versions VALUES(?,?,?,?,?,?,?,?,?,?,?)`, contractId, item.record_type, item.schema_version, item.record_type, JSON.stringify(['csv']), 'active', 'USR-ADM-001', seededAt, null, null, null);
    sql.run(`INSERT OR IGNORE INTO import_batches(import_batch_id,external_batch_key,school_id,source_system_id,import_contract_version_id,target_entity_type,target_entity_id,ingress_channel,source_relative_path,original_file_name,content_type,content_sha256,source_uploaded_at,uploaded_by_user_id,service_actor_id,received_at,parsed_at,validated_at,committed_at,committed_by_user_id,seeded_at,processing_status,declared_processing_status,parser_name,parser_version,total_rows,valid_rows,warning_rows,error_rows,excluded_rows,committed_rows,updated_by_user_id,updated_at)
      VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, batchId, item.upload_batch_id, 'BHSS', sourceIds[item.source_system] || 'SRC-BHSS-PLATFORM', contractId, item.record_type, null, 'seed_csv', `output/import-examples/${item.source_file}`, item.source_file, 'text/csv', digest(raw), item.uploaded_at, item.uploaded_by_user_id, 'seed-loader', seededAt, seededAt, seededAt, committed ? seededAt : null, committed ? item.uploaded_by_user_id : null, seededAt, committed ? 'committed' : 'catalogued', item.processing_status, 'seed-csv', '3.0', rows.length, rows.length, 0, 0, 0, committed ? rows.length : 0, 'USR-ADM-001', seededAt);
    rows.forEach((row, index) => {
      const recordId = `${batchId}-R${index + 1}`;
      const values = Object.values(row);
      // The immutable row number disambiguates seed files whose first column is
      // blank or intentionally repeated, while the original key remains in the payload.
      const sourceKey = `${String(values[0] || 'row')}:${index + 2}`;
      sql.run(`INSERT OR IGNORE INTO import_records VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, recordId, batchId, index + 2, sourceKey, JSON.stringify(row), JSON.stringify(row), digest(JSON.stringify(row)), 'not_applicable', 'valid', '[]', '[]', null, 'included', committed ? 'committed' : 'catalogued', null, seededAt, seededAt);
      if (committed) sql.run(`INSERT OR IGNORE INTO import_record_links VALUES(?,?,?,?,?,?,?,?,?,?)`, `${recordId}-LINK`, recordId, item.record_type, sourceKey, null, 'seeded', 'current', item.uploaded_by_user_id, seededAt, `Seeded from output/import-examples/${item.source_file}`);
    });
    sql.run(`INSERT OR IGNORE INTO import_batch_events VALUES(?,?,?,?,?,?,?,?,?)`, `${batchId}-EVENT`, batchId, null, committed ? 'committed' : 'catalogued', 'seed.provenance_registered', item.uploaded_by_user_id, 'Registered from the CSV contract manifest without rewriting the original source rows.', JSON.stringify({ sourceRelativePath: `output/import-examples/${item.source_file}`, seededAt }), seededAt);
  }
}

export function seedFromContracts(sql, csvDirectory) {
  if (!sql.get('SELECT 1 FROM seed_state WHERE seed_key=?', 'csv-3.0')) {
    sql.transaction(() => {
      sql.run('INSERT INTO schools(school_id,name_en,name_zh,status) VALUES(?,?,?,?)', 'BHSS', 'BHSS demonstration school', 'BHSS 示範學校', 'active');
      for (const [file, table, columns] of contracts) {
        insertRows(sql, table, parseCsv(readFileSync(join(csvDirectory, file), 'utf8')), columns);
      }
      for (const studentId of ['USR-S-001','USR-S-002','USR-S-003']) {
        sql.run('INSERT INTO student_class_memberships VALUES(?,?,?,?,?,?,?,?)', `SCM-${studentId}`, studentId, 'BHSS', 'S1A-2026-27', '2026-27-P1', '2026-09-01', '2027-08-31', 'active');
      }
      sql.run('INSERT INTO portfolio_snapshots(portfolio_snapshot_id,school_id,student_user_id,period_id,approved_portfolio_working_version_id,version_number,publication_status,approved_by_user_id,published_at,rubric_catalogue_id) VALUES(?,?,?,?,?,?,?,?,?,?)', 'PSNAP-S1-P1-v1', 'BHSS', 'USR-S-001', '2026-27-P1', 'PWV-S1-001', 1, 'published', 'USR-ST-001', '2026-12-20T15:00:00+08:00', 'RUB-SB-UF2');
      sql.run('INSERT INTO seed_state VALUES(?,?,?)', 'csv-3.0', csvDirectory, new Date().toISOString());
    });
  }
  ensurePocV2Extensions(sql, csvDirectory);
}

function ensurePocV2Extensions(sql, csvDirectory) {
  sql.transaction(() => {
    const extensionContracts = [
      ['03_reporting_periods.csv', 'academic_periods'],
      ['06_form_templates.csv', 'form_versions'],
      ['07_form_template_items.csv', 'form_items'],
      ['13_activity_form_assignments.csv', 'assessment_assignments'],
      ['17_proud_moment_selections.csv', 'proud_moment_selections'],
      ['19_peer_review_assignments.csv', 'peer_review_assignments'],
      ['24_rubric_catalogues.csv', 'rubric_catalogues'],
      ['25_rubric_axes.csv', 'rubric_axes'],
      ['26_rubric_levels.csv', 'rubric_levels'],
      ['58_rubric_groups.csv', 'rubric_groups'],
      ['59_rubric_step_definitions.csv', 'rubric_step_definitions'],
      ['30_proof_items.csv', 'proof_items'],
      ['31_proof_links.csv', 'proof_links'],
      ['36_published_rubric_results.csv', 'published_rubric_results'],
      ['43_capability_definitions.csv', 'capability_definitions'],
      ['44_role_capabilities.csv', 'role_capabilities'],
    ];
    for (const [file, table] of extensionContracts) insertRows(sql, table, parseCsv(readFileSync(join(csvDirectory, file), 'utf8')));
    const axisGroups = [
      ['GRP-SB-COMMUNICATION','AX-SB-LISTEN'],['GRP-SB-COMMUNICATION','AX-SB-SPEAK'],
      ['GRP-SB-CREATIVE-PROBLEM','AX-SB-PROBLEM'],['GRP-SB-CREATIVE-PROBLEM','AX-SB-CREATIVITY'],
      ['GRP-SB-SELF-MANAGEMENT','AX-SB-POSITIVE'],['GRP-SB-SELF-MANAGEMENT','AX-SB-AIMING'],
      ['GRP-SB-COLLABORATION','AX-SB-LEADERSHIP'],['GRP-SB-COLLABORATION','AX-SB-TEAMWORK'],
    ];
    for (const [groupId, axisId] of axisGroups) sql.run('UPDATE rubric_axes SET rubric_group_id=? WHERE axis_id=?', groupId, axisId);
    sql.run(`UPDATE activities SET resolved_period_id=(
        SELECT p.period_id FROM activity_revisions r JOIN academic_periods p ON p.school_id=activities.school_id AND p.start_date<=substr(r.start_at,1,10) AND p.end_date>=substr(r.end_at,1,10)
        WHERE r.activity_revision_id=activities.latest_revision_id ORDER BY p.resolution_priority DESC LIMIT 1
      ),period_resolution_status='resolved',period_resolved_at=?
      WHERE EXISTS(
        SELECT 1 FROM activity_revisions r JOIN academic_periods p ON p.school_id=activities.school_id AND p.start_date<=substr(r.start_at,1,10) AND p.end_date>=substr(r.end_at,1,10)
        WHERE r.activity_revision_id=activities.latest_revision_id
      )`, new Date().toISOString());
    sql.run(`INSERT OR IGNORE INTO capability_definitions VALUES(?,?,?,?,?,?,?)`, 'CAP-AI-DRAFT-REVIEW', 'portfolio.ai_draft.review', 'Review AI Portfolio drafts', '覆核 AI Portfolio 草稿', 'portfolio', 1, 'active');
    sql.run(`INSERT OR IGNORE INTO role_capabilities VALUES(?,?,?,?,?,?,?,?)`, 'RC-CLASS-AI-REVIEW', 'ROLE-CLASS-TEACHER', 'CAP-AI-DRAFT-REVIEW', 'allow', 'assigned_student_only', 'active', 'USR-ADM-001', '2026-10-29T09:00:00+08:00');
    sql.run(`INSERT OR IGNORE INTO role_capabilities VALUES(?,?,?,?,?,?,?,?)`, 'RC-PORTAPP-AI-REVIEW', 'ROLE-PORTFOLIO-APPROVER', 'CAP-AI-DRAFT-REVIEW', 'allow', 'named_or_school_scope', 'active', 'USR-ADM-001', '2026-10-29T09:00:00+08:00');
    sql.run(`INSERT OR IGNORE INTO role_capabilities VALUES(?,?,?,?,?,?,?,?)`, 'RC-ACTAPP-PUBLISH', 'ROLE-ACTIVITY-APPROVER', 'CAP-ACTIVITY-PUBLISH', 'allow', 'named_assignment_required', 'active', 'USR-ADM-001', '2026-10-29T09:00:00+08:00');
    sql.run(`INSERT OR IGNORE INTO approval_policy_versions VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, 'APOL-ACTPUB-v1', 'BHSS', 'activity_publication', 1, 'single_reviewer', 'school', 'BHSS', 1, 1, 0, 1, 'activity_publication', 240, 1440, 'active', '2026-08-20', null, 'USR-ADM-001', '2026-10-29T09:00:00+08:00');
    sql.run(`INSERT OR IGNORE INTO approval_policy_steps VALUES(?,?,?,?,?,?,?,?,?,?)`, 'ASTEP-ACTPUB-1', 'APOL-ACTPUB-v1', 1, 'Activity publication', '活動發布', 'CAP-ACTIVITY-PUBLISH', 'named_or_self_if_allowed', 1, 1, 'active');
    const activityVaskRows = [
      ['AREV-COMM-001','ACT-COMM-001','AX-VASK-COMMUNICATION'],
      ['AREV-COMM-002','ACT-COMM-001','AX-VASK-COMMUNICATION'],
      ['AREV-SELF-001','ACT-SELF-001','AX-VASK-SELF-AWARENESS'],
    ];
    for (const [revisionId, activityId, itemId] of activityVaskRows) sql.run(`INSERT OR IGNORE INTO activity_vask_items VALUES(?,?,?,?,?,?,?,?,?)`, revisionId, activityId, itemId, '2026', 'import_contract', 'Imported activity intention', 'approved', 'USR-ST-001', '2026-10-29T09:00:00+08:00');
    for (const [revisionId, flag] of [['AREV-COMM-001','none'],['AREV-COMM-002','none'],['AREV-SELF-001','off_site'],['AREV-SELF-001','image_capture'],['AREV-SPORT-001','image_capture'],['AREV-PRESS-001','image_capture']]) sql.run(`INSERT OR IGNORE INTO activity_revision_risk_flags VALUES(?,?)`, revisionId, flag);
    sql.run(`INSERT OR IGNORE INTO ai_input_manifests VALUES(?,?,?,?,?,?,?,?,?,?)`, 'MANIFEST-S1-P1', 'BHSS', 'USR-S-001', '2026-27-P1', '2026-27-P1', 'non_academic_personal_growth', 'learner-profile-v1', 'approved', 'USR-T-001', '2027-01-15T09:00:00+08:00');
    const sources = [
      ['AIMS-S1-1','activity','ACT-COMM-001','Approved activity description and confirmed outcome','已批核活動說明及已確認成果',1],
      ['AIMS-S1-2','proof','PROOF-S1-TEAMWORK','Accepted proof summary; raw media excluded','已接納佐證摘要；不包括原始媒體',2],
      ['AIMS-S1-3','rubric_snapshot','RUBRIC-SNAPSHOT-S1','Published rubric result snapshot','已發布 Rubric 結果快照',3],
    ];
    for (const source of sources) sql.run(`INSERT OR IGNORE INTO ai_manifest_sources VALUES(?,?,?,?,?,?,?)`, source[0], 'MANIFEST-S1-P1', ...source.slice(1));
    sql.run(`INSERT OR IGNORE INTO ai_draft_candidates VALUES(?,?,?,?,?,?,?,?,?,?,?)`, 'CANDIDATE-STUB-A', 'MANIFEST-S1-P1', 'local-contract-stub', 'not-connected', 'learner-profile-v1', 'Alex is a thoughtful learner who adapts after setbacks and supports classmates through practical action.', 'Alex 是一位處事周詳的學習者，遇到挫折後懂得調整，亦會以實際行動支持同學。', JSON.stringify(['ACT-COMM-001','PROOF-S1-TEAMWORK','OBS-S1-RESILIENCE']), 'pending_review', null, '2027-01-15T09:05:00+08:00');
    sql.run(`INSERT OR IGNORE INTO ai_draft_candidates VALUES(?,?,?,?,?,?,?,?,?,?,?)`, 'CANDIDATE-STUB-B', 'MANIFEST-S1-P1', 'comparison-contract-stub', 'not-connected', 'learner-profile-v1-alt', 'Alex listens carefully, responds positively to feedback and is developing more consistent follow-through.', 'Alex 能細心聆聽，積極回應意見，並正逐步建立更穩定的跟進習慣。', JSON.stringify(['ACT-COMM-001','PROOF-S1-REFLECTION','OBS-S1-FOLLOW-UP']), 'pending_review', null, '2027-01-15T09:06:00+08:00');

    const recipients = [
      ['AR-SELF-COMM-S1','AFA-001','USR-S-001','USR-S-001',null,null,'student_self_report','approved'],
      ['AR-SELF-COMM-S2','AFA-001','USR-S-002','USR-S-002',null,null,'student_self_report','not_submitted'],
      ['AR-SELF-SPORT-S1','AFA-002','USR-S-001','USR-S-001',null,null,'student_self_report','not_submitted'],
      ['AR-SELF-SPORT-S2','AFA-002','USR-S-002','USR-S-002',null,null,'student_self_report','not_submitted'],
      ['AR-PEER-PRA-001','AFA-002','USR-S-002','USR-S-001','USR-T-002','PRA-001','peer_observation','not_submitted'],
      ['AR-PEER-PRA-002','AFA-002','USR-S-001','USR-S-002','USR-T-002','PRA-002','peer_observation','not_submitted'],
      ['AR-TEACH-COMM-S1','AFA-001','USR-T-001','USR-S-001','USR-T-001',null,'teacher_observation','approved'],
      ['AR-TEACH-COMM-S2','AFA-001','USR-T-001','USR-S-002','USR-T-001',null,'teacher_observation','not_submitted'],
      ['AR-TEACH-SPORT-S1','AFA-002','USR-T-002','USR-S-001','USR-T-002',null,'teacher_observation','not_submitted'],
      ['AR-TEACH-SPORT-S2','AFA-002','USR-T-002','USR-S-002','USR-T-002',null,'teacher_observation','not_submitted'],
    ];
    for (const row of recipients) sql.run(`INSERT OR IGNORE INTO assignment_recipients VALUES(?,?,?,?,?,?,?,?,?)`, ...row, '2026-10-16T16:05:00+08:00');

    sql.run(`INSERT OR IGNORE INTO assessment_submissions VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, 'SUB-COMM-S1-v1', 'AR-SELF-COMM-S1', 1, null, 'student_self_report', 'approved', 'accepted', 'unpublished', '2026-09-18T10:52:00+08:00', 'USR-T-001', '2026-09-19T16:05:00+08:00', 'The source-linked reflection was checked by the assigned teacher.', '2026-09-18T10:45:00+08:00', '2026-09-19T16:05:00+08:00');
    const studentResponses = [
      ['QR-COMM-S1-1','student_significant_moment','I paused and listened to my partner before suggesting a different plan.','我先停下來聆聽同伴，然後才提出另一個方案。'],
      ['QR-COMM-S1-2','student_learning','I learned that listening first helped the group understand my idea.','我明白到先聆聽，可以令小組更容易理解我的想法。'],
    ];
    for (const [id,key,en,zh] of studentResponses) sql.run(`INSERT OR IGNORE INTO question_responses VALUES(?,?,?,?,?,?,?,?,?,?)`, id, 'SUB-COMM-S1-v1', key, en, zh, en, null, 'human_authored', '2026-09-18T10:50:00+08:00', '2026-09-18T10:52:00+08:00');

    sql.run(`INSERT OR IGNORE INTO assessment_submissions VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, 'SUB-TEACH-COMM-S1-v1', 'AR-TEACH-COMM-S1', 1, null, 'teacher_observation', 'approved', 'accepted', 'published_to_portfolio', '2026-09-19T16:00:00+08:00', 'USR-T-001', '2026-09-19T16:05:00+08:00', 'Teacher observation confirmed with a source-linked behaviour example.', '2026-09-19T15:55:00+08:00', '2026-09-19T16:05:00+08:00');
    const teacherResponses = [
      ['QR-TEACH-COMM-S1-1','teacher_strength','Listened and paraphrased a peer before responding.','回應前先聆聽並重述同儕的意思。'],
      ['QR-TEACH-COMM-S1-2','teacher_development','Use the same listening routine more consistently in larger groups.','在較大的小組中更穩定地運用同一聆聽方法。'],
      ['QR-TEACH-COMM-S1-3','teacher_support','Pause, paraphrase, then add one idea.','先停一停、重述，再補充一個想法。'],
    ];
    for (const [id,key,en,zh] of teacherResponses) sql.run(`INSERT OR IGNORE INTO question_responses VALUES(?,?,?,?,?,?,?,?,?,?)`, id, 'SUB-TEACH-COMM-S1-v1', key, en, zh, en, null, 'human_authored', '2026-09-19T16:00:00+08:00', '2026-09-19T16:00:00+08:00');
    sql.run(`INSERT OR IGNORE INTO feedback VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)`, 'FDB-001', 'ACT-COMM-001', 'USR-S-001', 'USR-T-001', 'SUB-TEACH-COMM-S1-v1', 'teacher_assessment', 'Listened and paraphrased a peer before responding.', '2026-09-19T16:00:00+08:00', 'teacher_observation', 'confirmed', 'published_to_portfolio', '2026-09-19T16:00:00+08:00', '2026-09-19T16:05:00+08:00');
    sql.run(`INSERT OR IGNORE INTO feedback_evidence VALUES(?,?,?,?,?,?,?)`, 'FEV-001', 'FDB-001', 'behaviour_description', 'Listened and paraphrased a peer before responding.', 'PRF-FEEDBACK-001', 'SUB-TEACH-COMM-S1-v1', '2026-09-19T16:00:00+08:00');
    sql.run(`INSERT OR IGNORE INTO framework_observations VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)`, 'OBS-001', 'FDB-001', 'AX-SB-LISTEN', 5, 4, 'The student demonstrated attentive listening before responding.', 6, 'confirmed', 1, 1, 'USR-T-001', 'Included in the published P1 evidence set.', '2026-09-19T16:05:00+08:00');
    sql.run(`INSERT OR IGNORE INTO observation_evidence VALUES(?,?,?)`, 'OE-001', 'OBS-001', 'FEV-001');

    sql.run(`INSERT OR IGNORE INTO proud_moment_windows VALUES(?,?,?,?,?,?,?)`, '2026-27-P1', 'BHSS', 'open', '2026-12-01T08:00:00+08:00', '2027-02-28T17:00:00+08:00', 24, 'USR-ST-001');
    sql.run(`UPDATE portfolio_working_versions SET rubric_catalogue_id='RUB-SB-UF2' WHERE rubric_catalogue_id IS NULL`);
    sql.run(`UPDATE portfolio_snapshots SET rubric_catalogue_id='RUB-SB-UF2' WHERE rubric_catalogue_id IS NULL`);
    const mediaPathSeededAt = '2026-10-29T09:00:00+08:00';
    for (const activity of sql.all(`SELECT a.activity_id,a.school_id,COALESCE(p.academic_year_label,'2026-27') academic_year_label
      FROM activities a LEFT JOIN academic_periods p ON p.period_id=a.resolved_period_id ORDER BY a.activity_id`)) {
      sql.run(`INSERT OR IGNORE INTO media_source_paths(media_source_path_id,school_id,activity_id,media_base_path,source_system,validation_mode,status,created_by_user_id,created_at)
        VALUES(?,?,?,?,?,?,?,?,?)`, `MSP-${activity.activity_id}`, activity.school_id, activity.activity_id, `bhss_media/${activity.academic_year_label}/${activity.activity_id}/`, 'school_archive', 'metadata_only', 'active', 'USR-ADM-001', mediaPathSeededAt);
    }
    ensureImportSeedLedger(sql, csvDirectory);
  });
}
