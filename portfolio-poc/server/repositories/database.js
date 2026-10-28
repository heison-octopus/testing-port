import { DatabaseSync } from 'node:sqlite';

const db = new DatabaseSync(process.env.POC_DB || new URL('../../portfolio.sqlite', import.meta.url).pathname);
const now = () => new Date().toISOString();
const get = (sql, ...params) => db.prepare(sql).get(...params);
const all = (sql, ...params) => db.prepare(sql).all(...params);
const run = (sql, ...params) => db.prepare(sql).run(...params);

db.exec(`PRAGMA foreign_keys=ON;
CREATE TABLE IF NOT EXISTS schools(id TEXT PRIMARY KEY,name TEXT NOT NULL,disabled INTEGER DEFAULT 0,school_code TEXT,operating_mode TEXT DEFAULT 'demo',disabled_reason TEXT,disabled_by TEXT,disabled_at TEXT,created_at TEXT,updated_at TEXT);
CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,school_id TEXT NOT NULL REFERENCES schools(id),name TEXT NOT NULL,role TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS assignments(user_id TEXT NOT NULL,scope_type TEXT NOT NULL,scope_id TEXT NOT NULL,PRIMARY KEY(user_id,scope_type,scope_id));
CREATE TABLE IF NOT EXISTS features(school_id TEXT NOT NULL,feature TEXT NOT NULL,enabled INTEGER NOT NULL,PRIMARY KEY(school_id,feature));
CREATE TABLE IF NOT EXISTS academic_years(id TEXT PRIMARY KEY,school_id TEXT NOT NULL REFERENCES schools(id),code TEXT NOT NULL,name TEXT NOT NULL,start_date TEXT NOT NULL,end_date TEXT NOT NULL,status TEXT NOT NULL,created_at TEXT NOT NULL,updated_at TEXT NOT NULL,UNIQUE(school_id,code));
CREATE TABLE IF NOT EXISTS reporting_periods(id TEXT PRIMARY KEY,school_id TEXT NOT NULL REFERENCES schools(id),academic_year_id TEXT NOT NULL REFERENCES academic_years(id),code TEXT NOT NULL,name_en TEXT NOT NULL,name_zh TEXT NOT NULL,start_date TEXT NOT NULL,end_date TEXT NOT NULL,sequence INTEGER NOT NULL,is_summer INTEGER NOT NULL DEFAULT 0,portfolio_snapshot_due TEXT,resolution_priority INTEGER NOT NULL DEFAULT 100,status TEXT NOT NULL,created_at TEXT NOT NULL,updated_at TEXT NOT NULL,UNIQUE(school_id,academic_year_id,code));
CREATE TABLE IF NOT EXISTS activities(id TEXT PRIMARY KEY,school_id TEXT NOT NULL,title TEXT NOT NULL,description TEXT NOT NULL,status TEXT NOT NULL,form_version_id TEXT,labels TEXT NOT NULL,starts_at TEXT,ends_at TEXT,academic_year_id TEXT,reporting_period_id TEXT,period_resolution_status TEXT DEFAULT 'no_match',period_exception_reason TEXT,period_exception_approved_by TEXT,created_by TEXT);
CREATE TABLE IF NOT EXISTS participants(activity_id TEXT NOT NULL,student_id TEXT NOT NULL,attendance TEXT NOT NULL DEFAULT 'pending',attendance_approval TEXT NOT NULL DEFAULT 'none',PRIMARY KEY(activity_id,student_id));
CREATE TABLE IF NOT EXISTS form_versions(id TEXT PRIMARY KEY,school_id TEXT NOT NULL,name TEXT NOT NULL,version INTEGER NOT NULL,status TEXT NOT NULL,author_id TEXT NOT NULL,template_key TEXT NOT NULL,supersedes_form_version_id TEXT,source_mode TEXT DEFAULT 'manual',questionnaire_source_id TEXT,import_batch_id TEXT,review_status TEXT DEFAULT 'draft',publication_status TEXT DEFAULT 'unpublished');
CREATE TABLE IF NOT EXISTS form_links(form_version_id TEXT PRIMARY KEY,activity_id TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS questionnaire_sources(id TEXT PRIMARY KEY,school_id TEXT NOT NULL,name TEXT NOT NULL,version TEXT NOT NULL,source_type TEXT NOT NULL,source_file TEXT,source_sheet TEXT,language TEXT,status TEXT NOT NULL,description TEXT NOT NULL,created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS question_definitions(id TEXT PRIMARY KEY,school_id TEXT NOT NULL,source_id TEXT NOT NULL,source_row INTEGER,source_question_number TEXT,construct_en TEXT,construct_zh TEXT,subdomain TEXT,prompt_zh TEXT NOT NULL,prompt_en TEXT,input_type TEXT NOT NULL,scale_json TEXT,is_negative INTEGER NOT NULL DEFAULT 0,ability_code TEXT NOT NULL,ability_name_en TEXT NOT NULL,ability_name_zh TEXT NOT NULL,ability_description_en TEXT NOT NULL,ability_description_zh TEXT NOT NULL,status TEXT NOT NULL,version INTEGER NOT NULL DEFAULT 1,UNIQUE(source_id,source_row));
CREATE TABLE IF NOT EXISTS question_sections(id TEXT PRIMARY KEY,form_version_id TEXT NOT NULL,section_code TEXT NOT NULL,title_en TEXT NOT NULL,title_zh TEXT NOT NULL,position INTEGER NOT NULL,UNIQUE(form_version_id,section_code));
CREATE TABLE IF NOT EXISTS question_blocks(id TEXT PRIMARY KEY,section_id TEXT NOT NULL,audience TEXT NOT NULL,title_en TEXT NOT NULL,title_zh TEXT NOT NULL,position INTEGER NOT NULL,UNIQUE(section_id,audience,position));
CREATE TABLE IF NOT EXISTS questions(id TEXT PRIMARY KEY,form_version_id TEXT NOT NULL,block_audience TEXT NOT NULL,position INTEGER NOT NULL,prompt TEXT NOT NULL,input_type TEXT NOT NULL,source TEXT NOT NULL,meaning TEXT NOT NULL,question_definition_id TEXT,source_id TEXT,source_row INTEGER,ability_code TEXT,ability_name TEXT,ability_description TEXT,version INTEGER NOT NULL DEFAULT 1);
CREATE TABLE IF NOT EXISTS form_questions(id TEXT PRIMARY KEY,form_version_id TEXT NOT NULL,block_id TEXT NOT NULL,question_definition_id TEXT,materialized_question_id TEXT NOT NULL,position INTEGER NOT NULL,required INTEGER NOT NULL DEFAULT 1,configuration_json TEXT NOT NULL DEFAULT '{}',UNIQUE(form_version_id,block_id,position));
CREATE TABLE IF NOT EXISTS form_review_events(id TEXT PRIMARY KEY,form_version_id TEXT NOT NULL,event_type TEXT NOT NULL,actor_id TEXT NOT NULL,comment TEXT NOT NULL,created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS form_import_batches(id TEXT PRIMARY KEY,school_id TEXT NOT NULL,activity_id TEXT NOT NULL,source_id TEXT NOT NULL,file_name TEXT NOT NULL,format TEXT NOT NULL,file_hash TEXT NOT NULL,uploaded_by TEXT NOT NULL,status TEXT NOT NULL,summary_json TEXT NOT NULL,created_at TEXT NOT NULL,applied_form_version_id TEXT);
CREATE TABLE IF NOT EXISTS form_import_rows(id TEXT PRIMARY KEY,batch_id TEXT NOT NULL,row_number INTEGER NOT NULL,question_definition_id TEXT,audience TEXT NOT NULL,position INTEGER NOT NULL,required INTEGER NOT NULL,prompt_override TEXT,validation_status TEXT NOT NULL,validation_message TEXT NOT NULL,diff_type TEXT NOT NULL,payload_json TEXT NOT NULL,UNIQUE(batch_id,row_number));
CREATE TABLE IF NOT EXISTS responses(id TEXT PRIMARY KEY,school_id TEXT NOT NULL,activity_id TEXT NOT NULL,student_id TEXT NOT NULL,question_id TEXT NOT NULL,author_id TEXT NOT NULL,answer TEXT NOT NULL,created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS proof(id TEXT PRIMARY KEY,school_id TEXT NOT NULL,activity_id TEXT NOT NULL,student_id TEXT NOT NULL,response_id TEXT,kind TEXT NOT NULL,perspective TEXT NOT NULL,authorship TEXT NOT NULL,content TEXT NOT NULL,status TEXT NOT NULL,created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS catalogues(id TEXT PRIMARY KEY,name TEXT NOT NULL,version TEXT NOT NULL,kind TEXT NOT NULL,assessment_capable INTEGER NOT NULL,status TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS axes(id TEXT PRIMARY KEY,catalogue_id TEXT NOT NULL,name TEXT NOT NULL,position INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS levels(axis_id TEXT NOT NULL,level INTEGER NOT NULL,condition TEXT NOT NULL,PRIMARY KEY(axis_id,level));
CREATE TABLE IF NOT EXISTS observations(id TEXT PRIMARY KEY,school_id TEXT NOT NULL,activity_id TEXT NOT NULL,student_id TEXT NOT NULL,axis_id TEXT NOT NULL,level INTEGER NOT NULL,proof_id TEXT NOT NULL,author_id TEXT NOT NULL,comment TEXT NOT NULL,confirmed INTEGER NOT NULL,decision TEXT NOT NULL,reason TEXT,decided_by TEXT,created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS review_decisions(id TEXT PRIMARY KEY,school_id TEXT NOT NULL,observation_id TEXT NOT NULL,decision TEXT NOT NULL,reason TEXT NOT NULL,actor_id TEXT NOT NULL,created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS calculation_policies(id TEXT PRIMARY KEY,version TEXT NOT NULL,processor_key TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS snapshots(id TEXT PRIMARY KEY,school_id TEXT NOT NULL,student_id TEXT NOT NULL,created_by TEXT NOT NULL,created_at TEXT NOT NULL,status TEXT NOT NULL,manifest TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS audit(id INTEGER PRIMARY KEY AUTOINCREMENT,school_id TEXT NOT NULL,actor_id TEXT NOT NULL,action TEXT NOT NULL,target TEXT NOT NULL,created_at TEXT NOT NULL);

CREATE TABLE IF NOT EXISTS activity_events(id TEXT PRIMARY KEY,school_id TEXT NOT NULL,activity_id TEXT NOT NULL,actor_id TEXT NOT NULL,action TEXT NOT NULL,detail TEXT NOT NULL,created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS peer_assignments(id TEXT PRIMARY KEY,school_id TEXT NOT NULL,activity_id TEXT NOT NULL,subject_student_id TEXT NOT NULL,reviewer_student_id TEXT NOT NULL,status TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS peer_reviews(id TEXT PRIMARY KEY,assignment_id TEXT NOT NULL,school_id TEXT NOT NULL,activity_id TEXT NOT NULL,subject_student_id TEXT NOT NULL,reviewer_student_id TEXT NOT NULL,raw_comment TEXT NOT NULL,rating INTEGER NOT NULL,status TEXT NOT NULL,moderated_by TEXT,moderation_note TEXT,sanitized_statement TEXT,created_at TEXT NOT NULL,reviewed_at TEXT);
CREATE TABLE IF NOT EXISTS learner_summaries(id TEXT PRIMARY KEY,school_id TEXT NOT NULL,student_id TEXT NOT NULL,period TEXT NOT NULL,draft_text TEXT NOT NULL,status TEXT NOT NULL,source_tags TEXT NOT NULL,modified_by TEXT,approved_by TEXT,updated_at TEXT NOT NULL,UNIQUE(school_id,student_id,period));
CREATE TABLE IF NOT EXISTS media_items(id TEXT PRIMARY KEY,school_id TEXT NOT NULL,activity_id TEXT NOT NULL,student_id TEXT NOT NULL,uploaded_by TEXT NOT NULL,name TEXT NOT NULL,mime_type TEXT NOT NULL,asset_url TEXT,extracted_text TEXT NOT NULL,extraction_status TEXT NOT NULL,status TEXT NOT NULL,reviewer_id TEXT,proof_id TEXT,disabled_at TEXT,disabled_by TEXT,disabled_reason TEXT,created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS portfolio_warnings(id TEXT PRIMARY KEY,school_id TEXT NOT NULL,student_id TEXT NOT NULL,snapshot_id TEXT NOT NULL,source_id TEXT NOT NULL,message TEXT NOT NULL,status TEXT NOT NULL,created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS school_policies(school_id TEXT NOT NULL,policy_key TEXT NOT NULL,policy_value TEXT NOT NULL,updated_by TEXT,updated_at TEXT NOT NULL,PRIMARY KEY(school_id,policy_key));
CREATE TABLE IF NOT EXISTS prompt_presets(id TEXT PRIMARY KEY,school_id TEXT NOT NULL,name TEXT NOT NULL,focus TEXT NOT NULL,prompt TEXT NOT NULL,active INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS generation_attempts(id TEXT PRIMARY KEY,school_id TEXT NOT NULL,student_id TEXT NOT NULL,period TEXT NOT NULL,report_key TEXT NOT NULL,preset_id TEXT NOT NULL,prompt TEXT NOT NULL,output TEXT NOT NULL,created_by TEXT NOT NULL,created_at TEXT NOT NULL,selected INTEGER NOT NULL DEFAULT 0);
`);

function ensureColumn(table, column, definition) {
  if (!all(`PRAGMA table_info(${table})`).some(item => item.name === column)) run(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
}

for (const [table, columns] of Object.entries({
  schools: {
    school_code: 'TEXT', operating_mode: "TEXT DEFAULT 'demo'", disabled_reason: 'TEXT', disabled_by: 'TEXT', disabled_at: 'TEXT', created_at: 'TEXT', updated_at: 'TEXT',
  },
  activities: {
    starts_at: 'TEXT', ends_at: 'TEXT', academic_year_id: 'TEXT', reporting_period_id: 'TEXT', period_resolution_status: "TEXT DEFAULT 'no_match'", period_exception_reason: 'TEXT', period_exception_approved_by: 'TEXT', created_by: 'TEXT',
  },
  form_versions: {
    supersedes_form_version_id: 'TEXT', source_mode: "TEXT DEFAULT 'manual'", questionnaire_source_id: 'TEXT', import_batch_id: 'TEXT', review_status: "TEXT DEFAULT 'draft'", publication_status: "TEXT DEFAULT 'unpublished'",
  },
  questions: {
    question_definition_id: 'TEXT', source_id: 'TEXT', source_row: 'INTEGER', ability_code: 'TEXT', ability_name: 'TEXT', ability_description: 'TEXT', version: 'INTEGER DEFAULT 1',
  },
})) {
  for (const [column, definition] of Object.entries(columns)) ensureColumn(table, column, definition);
}

function addUser(id, name, role = 'student') {
  run('INSERT OR IGNORE INTO users VALUES(?,?,?,?)', id, 'school-1', name, role);
}

function addQuestionStructure(formId, questionId, definitionId = null) {
  const sectionId = `section-${formId}-student`;
  const blockId = `block-${formId}-student`;
  run('INSERT OR IGNORE INTO question_sections(id,form_version_id,section_code,title_en,title_zh,position) VALUES(?,?,?,?,?,?)', sectionId, formId, 'student_reflection', 'Student reflection', '學生反思', 1);
  run('INSERT OR IGNORE INTO question_blocks(id,section_id,audience,title_en,title_zh,position) VALUES(?,?,?,?,?,?)', blockId, sectionId, 'student', 'Student questions', '學生問題', 1);
  run('INSERT OR IGNORE INTO form_questions(id,form_version_id,block_id,question_definition_id,materialized_question_id,position,required,configuration_json) VALUES(?,?,?,?,?,?,?,?)', `form-question-${questionId}`, formId, blockId, definitionId, questionId, 1, 1, '{}');
}

function addActivity({ id, title, description, labels, formId, question, participants = ['student-1'], startsAt = '2026-10-01T09:00:00+08:00', endsAt = '2026-10-01T10:00:00+08:00' }) {
  const questionId = formId === 'form-1' ? 'q-1' : `${formId}-q1`;
  run(`INSERT OR IGNORE INTO form_versions(id,school_id,name,version,status,author_id,template_key,source_mode,questionnaire_source_id,review_status,publication_status)
    VALUES(?,?,?,?,?,?,?,?,?,?,?)`, formId, 'school-1', `${title} reflection`, 1, 'published', 'teacher-1', 'reflection-v1', 'manual', 'source-manual-school-1', 'approved', 'published');
  run(`INSERT OR IGNORE INTO questions(id,form_version_id,block_audience,position,prompt,input_type,source,meaning,source_id,ability_code,ability_name,ability_description,version)
    VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)`, questionId, formId, 'student', 1, question, 'long_text', 'POC fictional scenario', 'Student reflection', 'source-manual-school-1', 'AB-STUDENT-REFLECTION', 'Student reflection', 'Describe what the learner noticed, contributed or would change.', 1);
  run('INSERT OR IGNORE INTO form_links(form_version_id,activity_id) VALUES(?,?)', formId, id);
  run(`INSERT OR IGNORE INTO activities(id,school_id,title,description,status,form_version_id,labels,starts_at,ends_at,academic_year_id,reporting_period_id,period_resolution_status,created_by)
    VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)`, id, 'school-1', title, description, 'published', formId, JSON.stringify(labels), startsAt, endsAt, 'AY-2026-27', '2026-27-P1', 'resolved', 'staff-1');
  addQuestionStructure(formId, questionId);
  run('INSERT OR IGNORE INTO form_review_events(id,form_version_id,event_type,actor_id,comment,created_at) VALUES(?,?,?,?,?,?)', `form-event-${formId}-published`, formId, 'published', 'staff-1', 'Seeded published form for the fictional POC.', now());
  for (const studentId of participants) run('INSERT OR IGNORE INTO participants VALUES(?,?,?,?)', id, studentId, 'attended', 'none');
  run('INSERT OR IGNORE INTO activity_events VALUES(?,?,?,?,?,?,?)', `event-${id}-published`, 'school-1', id, 'staff-1', 'published', 'Created directly by authorized staff for the fictional POC.', now());
  for (const userId of ['teacher-1', 'staff-1']) run('INSERT OR IGNORE INTO assignments VALUES(?,?,?)', userId, 'activity', id);
  run('INSERT OR IGNORE INTO assignments VALUES(?,?,?)', 'staff-1', 'form_approve', id);
}

function addProof(id, activityId, kind, perspective, content, responseId = null) {
  run('INSERT OR IGNORE INTO proof VALUES(?,?,?,?,?,?,?,?,?,?,?)', id, 'school-1', activityId, 'student-1', responseId, kind, perspective, 'human_authored', content, 'accepted', now());
}

function addObservation(id, activityId, axisId, level, proofId, comment, decision = 'included') {
  run('INSERT OR IGNORE INTO observations VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)', id, 'school-1', activityId, 'student-1', axisId, level, proofId, 'teacher-1', comment, 1, decision, decision === 'included' ? 'Evidence and context support this fictional POC observation.' : null, decision === 'included' ? 'staff-1' : null, now());
}

if (!get('SELECT id FROM schools WHERE id=?', 'school-1')) {
  db.exec('BEGIN');
  try {
    run(`INSERT INTO schools(id,name,disabled,school_code,operating_mode,created_at,updated_at) VALUES(?,?,?,?,?,?,?)`, 'school-1', 'BHSS demonstration', 0, 'BHSS-DEMO', 'demo', now(), now());
    run(`INSERT INTO schools(id,name,disabled,school_code,operating_mode,created_at,updated_at) VALUES(?,?,?,?,?,?,?)`, 'school-2', 'Other school', 0, 'OTHER-DEMO', 'demo', now(), now());
    for (const u of [
      ['student-1', 'school-1', 'Chan Mei', 'student'],
      ['student-2', 'school-1', 'Lee Ho', 'student'],
      ['teacher-1', 'school-1', 'Ms Chan', 'teacher'],
      ['staff-1', 'school-1', 'Mr Wong', 'staff'],
      ['admin-1', 'school-1', 'School administrator', 'admin'],
      ['other-1', 'school-2', 'Other school student', 'student'],
    ]) run('INSERT INTO users VALUES(?,?,?,?)', ...u);
    for (const f of ['activities', 'forms', 'assessment', 'portfolio', 'admin', 'media', 'prompts']) run('INSERT INTO features VALUES(?,?,1)', 'school-1', f);
    run('INSERT INTO catalogues VALUES(?,?,?,?,?,?)', 'vask-1', 'VASK', 'demo-1', 'labels', 0, 'active');
    run('INSERT INTO catalogues VALUES(?,?,?,?,?,?)', 'sb-1', 'Skills Builder', 'POC-demo-2', 'rubric', 1, 'sample');
    const axes = ['Listening', 'Speaking', 'Problem solving', 'Creativity', 'Adapting', 'Planning', 'Leadership', 'Teamwork'];
    for (let i = 0; i < axes.length; i += 1) {
      const axisId = `axis-${i + 1}`;
      run('INSERT INTO axes VALUES(?,?,?,?)', axisId, 'sb-1', axes[i], i + 1);
      for (let level = 1; level <= 16; level += 1) run('INSERT INTO levels VALUES(?,?,?)', axisId, level, `POC-only evidence condition for ${axes[i]} step ${level}. Replace with school-authorized rubric wording before real assessment.`);
    }
    run('INSERT INTO calculation_policies VALUES(?,?,?)', 'max-confirmed', '1', 'max-confirmed-v1');
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

// Idempotent v2 fictional-data extension. It also upgrades databases created by the first POC.
for (const f of ['media', 'prompts']) run('INSERT OR IGNORE INTO features VALUES(?,?,1)', 'school-1', f);
run(`UPDATE schools SET school_code=COALESCE(school_code,CASE id WHEN 'school-1' THEN 'BHSS-DEMO' ELSE 'OTHER-DEMO' END),
  operating_mode=COALESCE(operating_mode,'demo'),created_at=COALESCE(created_at,?),updated_at=COALESCE(updated_at,?)`, now(), now());

for (const year of [
  ['AY-2025-26', '2025/26', 'Academic year 2025/26', '2025-09-01', '2026-08-31', 'closed'],
  ['AY-2026-27', '2026/27', 'Academic year 2026/27', '2026-09-01', '2027-08-31', 'active'],
]) run(`INSERT OR IGNORE INTO academic_years(id,school_id,code,name,start_date,end_date,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?)`, year[0], 'school-1', ...year.slice(1), now(), now());

for (const period of [
  ['2025-26-P1', 'AY-2025-26', 'P1', 'Period 1', '第一學段', '2025-09-01', '2025-12-19', 1, 0, '2026-01-09', 100, 'closed'],
  ['2025-26-P2', 'AY-2025-26', 'P2', 'Period 2', '第二學段', '2026-01-05', '2026-04-10', 2, 0, '2026-04-24', 100, 'closed'],
  ['2025-26-P3', 'AY-2025-26', 'P3', 'Period 3', '第三學段', '2026-04-20', '2026-08-31', 3, 0, '2026-09-11', 100, 'closed'],
  ['2026-27-P1', 'AY-2026-27', 'P1', 'Period 1', '第一學段', '2026-09-01', '2026-12-18', 1, 0, '2027-01-08', 100, 'open'],
  ['2026-27-P2', 'AY-2026-27', 'P2', 'Period 2', '第二學段', '2027-01-04', '2027-04-09', 2, 0, '2027-04-23', 100, 'planned'],
  ['2026-27-P3', 'AY-2026-27', 'P3', 'Period 3', '第三學段', '2027-04-19', '2027-07-16', 3, 0, '2027-07-23', 100, 'planned'],
  ['2026-27-SUMMER', 'AY-2026-27', 'SUMMER', 'Summer activities', '暑期活動', '2027-07-17', '2027-08-31', 4, 1, '2027-09-10', 90, 'planned'],
]) run(`INSERT OR IGNORE INTO reporting_periods(id,school_id,academic_year_id,code,name_en,name_zh,start_date,end_date,sequence,is_summer,portfolio_snapshot_due,resolution_priority,status,created_at,updated_at)
  VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, period[0], 'school-1', ...period.slice(1), now(), now());

run(`INSERT OR IGNORE INTO questionnaire_sources(id,school_id,name,version,source_type,source_file,source_sheet,language,status,description,created_at)
  VALUES(?,?,?,?,?,?,?,?,?,?,?)`, 'source-manual-school-1', 'school-1', 'School-authored reflection questions', '1', 'school_authored', null, null, 'zh-Hant|en', 'active', 'Manual questions authored within the school-scoped POC.', now());
run(`INSERT OR IGNORE INTO questionnaire_sources(id,school_id,name,version,source_type,source_file,source_sheet,language,status,description,created_at)
  VALUES(?,?,?,?,?,?,?,?,?,?,?)`, 'source-10-skills-v1', 'school-1', 'Ten-skill questionnaire source', 'dummy-1', 'supplied_instrument', '10份技能問卷整理總表.xlsx', '問卷總表', 'zh-Hant', 'context_only', 'Complete supplied instrument retained as a source. Its constructs do not equal the eight Skills Builder axes.', now());

const frequencyScale = JSON.stringify(['幾乎從不', '很少', '偶爾', '經常', '通常', '幾乎總是']);
const agreementScale = JSON.stringify(['非常不同意', '不同意', '略為不同意', '略為同意', '同意', '非常同意']);
const questionBank = [
  ['Q-ADAPT-009', 10, '9', 'Adaptability', '適應能力', '情感適應力', '在不確定的情況下，能夠管理負面情緒。', frequencyScale, 0, 'AB-EMOTIONAL-REGULATION', 'Emotional regulation', '情緒調節', 'Manage emotion in uncertain situations', '在不確定情況下調節情緒'],
  ['Q-COL-016', 29, '16', 'Collaboration', '合作能力', '合作溝通', '能運用隊友的回饋改進在小組中的工作。', frequencyScale, 0, 'AB-COLLABORATIVE-FEEDBACK', 'Using collaborative feedback', '運用協作回饋', 'Use peer feedback to improve group work', '運用隊友回饋改善小組工作'],
  ['Q-COM-004', 35, '4', 'Communication', '溝通能力', '積極傾聽', '當別人發言時會仔細傾聽。', frequencyScale, 0, 'AB-ATTENTIVE-LISTENING', 'Attentive listening', '專注聆聽', 'Attend while another person is speaking', '在他人發言時保持專注'],
  ['Q-COM-005', 36, '5', 'Communication', '溝通能力', '積極傾聽', '會在他人講完話之前就打斷對方。', frequencyScale, 1, 'AB-TURN-TAKING', 'Conversational turn-taking', '對話輪流', 'Allow another person to finish before responding', '回應前讓對方完成發言'],
  ['Q-CREA-003', 50, '3', 'Creativity', '創造力', '創造力樂趣', '喜歡想新方式來解決問題。', frequencyScale, 0, 'AB-IDEA-GENERATION', 'Idea generation', '構思新方法', 'Generate new approaches to a problem', '為問題構思新的處理方法'],
  ['Q-CRIT-001', 66, '1', 'Critical Thinking', '批判思維能力', '價值意識', '能認識到學會正確推理很重要。', frequencyScale, 0, 'AB-REASONING-VALUE', 'Valuing sound reasoning', '重視合理推理', 'Recognize the importance of sound reasoning', '認識合理推理的重要性'],
  ['Q-CURI-001', 84, '1', 'Curiosity', '探究能力／好奇心', '廣泛興趣／好奇心', '對許多不同的事物充滿好奇。', frequencyScale, 0, 'AB-BROAD-CURIOSITY', 'Broad curiosity', '廣泛好奇心', 'Show curiosity across different topics', '對不同事物保持好奇'],
  ['Q-LEAD-019', 132, '19', 'Leadership', '領導力', '同理心與情商', '能根據隊友的感受調整其溝通方式。', frequencyScale, 0, 'AB-EMPATHIC-COMMUNICATION', 'Empathic communication', '同理溝通', "Adapt communication to another person's feelings", '按隊友感受調整溝通方式'],
  ['Q-PERS-004', 139, '4', 'Perseverance', '堅毅', '堅持／毅力', '即使進展緩慢，仍堅持自己的目標。', agreementScale, 0, 'AB-GOAL-PERSISTENCE', 'Goal persistence', '堅持目標', 'Continue toward a goal when progress is slow', '即使進展緩慢仍繼續追求目標'],
  ['Q-PS-013', 162, '13', 'Problem-Solving', '問題解決能力', '運用反饋解決問題', '會運用反饋作出有助於解決問題的調整。', frequencyScale, 0, 'AB-FEEDBACK-ADJUSTMENT', 'Feedback-led adjustment', '按回饋調整', 'Use feedback to adjust a problem-solving approach', '運用回饋調整解難方法'],
];
for (const question of questionBank) run(`INSERT OR IGNORE INTO question_definitions(id,school_id,source_id,source_row,source_question_number,construct_en,construct_zh,subdomain,prompt_zh,prompt_en,input_type,scale_json,is_negative,ability_code,ability_name_en,ability_name_zh,ability_description_en,ability_description_zh,status,version)
  VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, question[0], 'school-1', 'source-10-skills-v1', question[1], question[2], question[3], question[4], question[5], question[6], null, 'scale', question[7], question[8], ...question.slice(9), 'approved_for_context', 1);

run("UPDATE axes SET name='Adapting' WHERE id='axis-5'");
run("UPDATE axes SET name='Planning' WHERE id='axis-6'");
run("UPDATE catalogues SET version='POC-demo-2' WHERE id='sb-1'");
run("UPDATE levels SET condition=REPLACE(REPLACE(condition,'Staying positive','Adapting'),'Aiming high','Planning') WHERE axis_id IN ('axis-5','axis-6')");
run(`UPDATE activities SET starts_at=COALESCE(starts_at,'2026-10-01T09:00:00+08:00'),ends_at=COALESCE(ends_at,'2026-10-01T10:00:00+08:00'),
  academic_year_id=COALESCE(academic_year_id,'AY-2026-27'),reporting_period_id=COALESCE(reporting_period_id,'2026-27-P1'),
  period_resolution_status=CASE WHEN period_resolution_status IS NULL OR period_resolution_status='no_match' THEN 'resolved' ELSE period_resolution_status END,
  created_by=COALESCE(created_by,'staff-1') WHERE school_id='school-1'`);
run(`UPDATE form_versions SET source_mode=COALESCE(source_mode,'manual'),questionnaire_source_id=COALESCE(questionnaire_source_id,'source-manual-school-1'),
  review_status=CASE WHEN status='published' THEN 'approved' ELSE COALESCE(review_status,'draft') END,
  publication_status=CASE WHEN status='published' THEN 'published' ELSE COALESCE(publication_status,'unpublished') END WHERE school_id='school-1'`);
run(`UPDATE questions SET source_id=COALESCE(source_id,'source-manual-school-1'),ability_code=COALESCE(ability_code,'AB-STUDENT-REFLECTION'),
  ability_name=COALESCE(ability_name,'Student reflection'),ability_description=COALESCE(ability_description,meaning),version=COALESCE(version,1)`);

addUser('student-1', 'Chan Mei');
addUser('student-2', 'Lee Ho');
for (let n = 1; n <= 10; n += 1) addUser(`peer-${n}`, `Peer reviewer ${String(n).padStart(2, '0')}`);
addUser('teacher-1', 'Ms Chan', 'teacher');
addUser('staff-1', 'Mr Wong', 'staff');
addUser('admin-1', 'School administrator', 'admin');

for (const a of [
  ['teacher-1', 'student', 'student-1'], ['teacher-1', 'student', 'student-2'],
  ['staff-1', 'student', 'student-1'], ['staff-1', 'student', 'student-2'],
  ['staff-1', 'review', 'student-1'], ['staff-1', 'review', 'student-2'],
  ['teacher-1', 'summary_review', 'student-1'],
]) run('INSERT OR IGNORE INTO assignments VALUES(?,?,?)', ...a);

addActivity({
  id: 'activity-1', formId: 'form-1', title: 'Community garden',
  description: 'Students work together to plan and maintain a garden.', labels: ['Responsibility', 'Collaboration'],
  question: 'What did you contribute and learn?', participants: ['student-1', 'student-2'],
});
addActivity({
  id: 'activity-piano', formId: 'form-piano', title: 'Inter-school piano competition',
  description: 'Mei practised for the recital, performed a prepared piece and responded calmly after a missed passage.', labels: ['Creativity', 'Discipline', 'Performance'],
  question: 'How did you prepare, respond to pressure and learn from the performance?', participants: ['student-1', ...Array.from({ length: 10 }, (_, i) => `peer-${i + 1}`)],
});
addActivity({
  id: 'activity-dialogue', formId: 'form-dialogue', title: 'Dialogue circle: fear of death',
  description: 'A facilitated discussion where students listened to different beliefs, asked careful questions and reflected on uncertainty.', labels: ['Listening', 'Empathy', 'Critical reflection'],
  question: 'What perspective did you hear, and how did it affect your own thinking?', participants: ['student-1', ...Array.from({ length: 10 }, (_, i) => `peer-${i + 1}`)],
});
addActivity({
  id: 'activity-future', formId: 'form-future', title: 'Future pathways conversation',
  description: 'Mei discussed university and work options with her class teacher, compared routes and identified positive next steps.', labels: ['Planning', 'Self-awareness', 'Career exploration'],
  question: 'What options are you considering and what is your next step?', participants: ['student-1'],
});
addActivity({
  id: 'activity-prefect', formId: 'form-prefect', title: 'Junior prefect duty coordination',
  description: 'Mei supported younger prefects but missed the duty timetable deadline, causing late notice for two shifts.', labels: ['Leadership', 'Planning', 'Responsibility'],
  question: 'What happened, what was the impact and what will you change next time?', participants: ['student-1', ...Array.from({ length: 10 }, (_, i) => `peer-${i + 1}`)],
});

addProof('proof-1', 'activity-1', 'teacher_observation', 'teacher', 'Worked with classmates to plan the garden.');
addProof('proof-piano', 'activity-piano', 'media_review', 'staff', 'Published recital image and teacher note confirm focused preparation, performance and recovery after a missed passage.');
addProof('proof-dialogue', 'activity-dialogue', 'teacher_observation', 'teacher', 'Asked careful follow-up questions and summarized two contrasting views without dismissing either speaker.');
addProof('proof-future', 'activity-future', 'teacher_observation', 'teacher', 'Compared university and employment routes and agreed three positive next actions with the class teacher.');
addProof('proof-prefect', 'activity-prefect', 'incident_record', 'teacher', 'Missed the timetable handover deadline; lower prefects received late notice for two duty shifts.');
addProof('proof-kindness', 'activity-prefect', 'teacher_observation', 'teacher', 'Teachers consistently reported that Mei checked on younger students, explained duties patiently and offered practical help.');

addObservation('obs-1', 'activity-1', 'axis-8', 4, 'proof-1', 'Chan Mei showed collaborative participation during group planning.');
addObservation('obs-piano-creativity', 'activity-piano', 'axis-4', 7, 'proof-piano', 'Chan Mei showed creative interpretation and purposeful refinement through her piano preparation and performance.');
addObservation('obs-piano-adapting', 'activity-piano', 'axis-5', 6, 'proof-piano', 'Chan Mei showed adapting by recovering calmly after a missed passage and completing the performance.');
addObservation('obs-dialogue-listening', 'activity-dialogue', 'axis-1', 8, 'proof-dialogue', 'Chan Mei showed attentive listening by accurately connecting and contrasting viewpoints in a sensitive discussion.');
addObservation('obs-dialogue-speaking', 'activity-dialogue', 'axis-2', 6, 'proof-dialogue', 'Chan Mei showed careful speaking by asking relevant questions and expressing uncertainty respectfully.');
addObservation('obs-future-planning', 'activity-future', 'axis-6', 7, 'proof-future', 'Chan Mei showed planning by comparing pathways and turning the discussion into specific next actions.');
addObservation('obs-prefect-growth', 'activity-prefect', 'axis-6', 4, 'proof-prefect', 'The missed timetable is retained as a growth record: follow-through and earlier communication need strengthening.');
addObservation('obs-kindness-teamwork', 'activity-prefect', 'axis-8', 7, 'proof-kindness', 'Chan Mei showed supportive teamwork through patient guidance and practical help for younger prefects.');

const peerComments = {
  'activity-piano': [
    'She encouraged us before the performance and stayed kind even when everyone was nervous.',
    'Her preparation was careful and she did not blame anyone after making a mistake.',
    'She listened to suggestions from the group and adjusted part of her practice plan.',
  ],
  'activity-dialogue': [
    'She made the discussion feel safe and did not laugh at views that were different from hers.',
    'Mei listened first, then asked a question that helped me explain what I meant.',
    'She was thoughtful and kind when the topic became emotional.',
  ],
  'activity-prefect': [
    'The timetable was late, but she apologized and helped every lower prefect reorganize the shifts.',
    'She missed the deadline but was patient when I asked what to do.',
    'She is really nice to younger prefects and checked that nobody was left alone.',
  ],
};

for (const activityId of Object.keys(peerComments)) {
  for (let n = 1; n <= 10; n += 1) {
    const reviewerId = `peer-${n}`;
    const assignmentId = `peer-assignment-${activityId}-${n}`;
    const reviewId = `peer-review-${activityId}-${n}`;
    const rawComment = peerComments[activityId][(n - 1) % 3];
    const pending = n === 10;
    const sanitized = activityId === 'activity-prefect'
      ? 'Chan Mei showed kindness and repair after a planning mistake by apologizing, reorganizing shifts and supporting younger prefects.'
      : activityId === 'activity-dialogue'
        ? 'Chan Mei showed respectful listening and empathy by making space for different views during a sensitive group discussion.'
        : 'Chan Mei showed supportive teamwork and composure while preparing for and participating in the piano competition.';
    run('INSERT OR IGNORE INTO peer_assignments VALUES(?,?,?,?,?,?)', assignmentId, 'school-1', activityId, 'student-1', reviewerId, 'completed');
    run('INSERT OR IGNORE INTO peer_reviews VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)', reviewId, assignmentId, 'school-1', activityId, 'student-1', reviewerId, rawComment, 4 + (n % 2), pending ? 'pending' : 'approved', pending ? null : 'staff-1', pending ? null : 'Staff confirmed relevance, respectful language and identifiable source assignment.', pending ? null : sanitized, now(), pending ? null : now());
    if (!pending) addProof(`proof-${reviewId}`, activityId, 'peer_review', 'peer', sanitized, reviewId);
  }
}

run('INSERT OR IGNORE INTO learner_summaries VALUES(?,?,?,?,?,?,?,?,?,?)', 'summary-student-1-2026-t1', 'school-1', 'student-1', '2026–27 Term 1', 'Chan Mei is a thoughtful and supportive learner who listens carefully, adapts after setbacks and takes positive steps towards her future. Her piano performance, sensitive dialogue participation and university or work planning show growing confidence. The missed prefect timetable remains an important growth record: she repaired the impact kindly, and her next focus is earlier follow-through and communication.', 'approved', JSON.stringify(['activity-piano', 'activity-dialogue', 'activity-future', 'activity-prefect', 'teacher-observation', 'peer-review']), 'teacher-1', 'teacher-1', now());

run('INSERT OR IGNORE INTO media_items VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)', 'media-piano', 'school-1', 'activity-piano', 'student-1', 'teacher-1', 'piano-competition-evidence.png', 'image/png', '/assets/piano-competition-fictional-evidence.png', 'Student performing at the school piano competition; teacher confirmed the activity and context.', 'complete', 'published', 'staff-1', 'proof-piano', null, null, null, now());
run('INSERT OR IGNORE INTO media_items VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)', 'media-prefect-note', 'school-1', 'activity-prefect', 'student-1', 'teacher-1', 'prefect-duty-note.jpg', 'image/jpeg', null, 'Messy OCR sample: timetable not sent friday; lower prefect confused; Mei apologised and fixed shift list.', 'complete', 'awaiting_review', null, null, null, null, null, now());

for (const [key, value] of [
  ['portfolio_regeneration_role', 'admin'],
  ['privacy_adapter_status', 'not_configured'],
  ['media_withdrawal_recalculation', 'manual_warning_only'],
]) run('INSERT OR IGNORE INTO school_policies VALUES(?,?,?,?,?)', 'school-1', key, value, 'admin-1', now());

for (const preset of [
  ['preset-balanced', 'Balanced growth', 'balanced', 'Create a concise, evidence-backed learner profile balancing academic and non-academic development. Retain growth areas without using deficit language.'],
  ['preset-academic', 'Academic pathways', 'academic', 'Prioritize learning habits, academic choices and future study pathways while retaining source tags.'],
  ['preset-whole-person', 'Whole-person development', 'non-academic', 'Prioritize participation, relationships, resilience, leadership and creative development while retaining source tags.'],
]) run('INSERT OR IGNORE INTO prompt_presets VALUES(?,?,?,?,?,1)', preset[0], 'school-1', preset[1], preset[2], preset[3]);

run('INSERT OR IGNORE INTO assignments VALUES(?,?,?)', 'staff-1', 'form_approve', 'activity-1');
run('INSERT OR IGNORE INTO form_links SELECT form_version_id,id FROM activities WHERE form_version_id IS NOT NULL');

if (!get("SELECT id FROM snapshots WHERE id='snapshot-fictional-profile'")) {
  const selectedObservations = all(`SELECT o.*,p.content proof_content,p.kind proof_kind,p.status proof_status,
    a.name axis_name,c.name catalogue_name,c.version catalogue_version,act.title activity_title
    FROM observations o JOIN proof p ON p.id=o.proof_id JOIN axes a ON a.id=o.axis_id
    JOIN catalogues c ON c.id=a.catalogue_id JOIN activities act ON act.id=o.activity_id
    WHERE o.id IN ('obs-piano-creativity','obs-piano-adapting','obs-dialogue-listening','obs-dialogue-speaking','obs-future-planning','obs-kindness-teamwork')`);
  const resultFor = (observationId) => {
    const observation = selectedObservations.find(item => item.id === observationId);
    return {
      axisId: observation.axis_id,
      axis: observation.axis_name,
      rubric: observation.catalogue_name,
      version: observation.catalogue_version,
      level: observation.level,
      observationIds: [observation.id],
      proofIds: [observation.proof_id],
      statement: observation.comment,
      sourceTags: [{ activity: observation.activity_title, type: observation.proof_kind.replaceAll('_', ' '), proofId: observation.proof_id }],
    };
  };
  const manifest = {
    period: '2026–27 Term 1',
    policy: { id: 'max-confirmed', version: '1', processor: 'max-confirmed-v1' },
    results: ['obs-dialogue-listening', 'obs-dialogue-speaking', 'obs-piano-creativity', 'obs-piano-adapting', 'obs-future-planning', 'obs-kindness-teamwork'].map(resultFor),
    summary: {
      text: get("SELECT draft_text FROM learner_summaries WHERE id='summary-student-1-2026-t1'").draft_text,
      sourceTags: ['Inter-school piano competition', 'Dialogue circle: fear of death', 'Future pathways conversation', 'Junior prefect duty coordination', 'teacher observation', 'peer review'],
      approvedBy: 'teacher-1',
    },
    observations: selectedObservations,
  };
  run("UPDATE snapshots SET status='superseded' WHERE school_id='school-1' AND student_id='student-1' AND status='published'");
  run('INSERT INTO snapshots VALUES(?,?,?,?,?,?,?)', 'snapshot-fictional-profile', 'school-1', 'student-1', 'staff-1', now(), 'published', JSON.stringify(manifest));
}

export { db, get, all, run };
