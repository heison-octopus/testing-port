import { DatabaseSync } from 'node:sqlite';
import { readFileSync, mkdirSync, existsSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes, scryptSync } from 'node:crypto';

const here = dirname(fileURLToPath(import.meta.url));
export const rootDir = dirname(here);
export const dataDir = join(rootDir, 'data');
export const uploadsDir = join(dataDir, 'uploads');
export const previewsDir = join(dataDir, 'previews');
const dbPath = process.env.BHSS_POC_DB_PATH || join(dataDir, 'bhss-poc.sqlite');

mkdirSync(uploadsDir, { recursive: true });
mkdirSync(previewsDir, { recursive: true });

export const db = new DatabaseSync(dbPath);
db.exec(readFileSync(join(here, 'schema.sql'), 'utf8'));
db.transaction = function transaction(callback) {
  return (...args) => {
    db.exec('BEGIN IMMEDIATE');
    try { const result=callback(...args); db.exec('COMMIT'); return result; }
    catch (error) { db.exec('ROLLBACK'); throw error; }
  };
};

function ensureColumn(table, column, definition) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all();
  if (!columns.some(item => item.name === column)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
}

ensureColumn('evidence', 'media_category', "TEXT NOT NULL DEFAULT 'activity'");
ensureColumn('evidence', 'visibility_state', "TEXT NOT NULL DEFAULT 'teacher_only'");
ensureColumn('activities', 'internal_context', "TEXT NOT NULL DEFAULT ''");
ensureColumn('activities', 'cover_style', "TEXT NOT NULL DEFAULT 'standard'");
ensureColumn('activities', 'upload_opens_at', 'TEXT');
ensureColumn('activities', 'upload_closes_at', 'TEXT');
ensureColumn('activities', 'period_id', 'TEXT REFERENCES school_periods(id)');
ensureColumn('activities', 'period_resolution_status', "TEXT NOT NULL DEFAULT 'unresolved'");
ensureColumn('activities', 'period_resolved_at', 'TEXT');
ensureColumn('activities', 'period_exception_approved_by', 'TEXT REFERENCES users(id)');
ensureColumn('activities', 'period_exception_reason', 'TEXT');
ensureColumn('activity_questions', 'question_block_id', 'TEXT REFERENCES question_blocks(id)');
ensureColumn('question_blocks', 'form_version_id', 'TEXT REFERENCES activity_form_versions(id)');
ensureColumn('questions', 'prompt_en', "TEXT NOT NULL DEFAULT ''");
ensureColumn('questions', 'question_version', 'INTEGER NOT NULL DEFAULT 1');
ensureColumn('questions', 'source_question_id', 'TEXT');
ensureColumn('questions', 'ability_code', "TEXT NOT NULL DEFAULT 'ability-unspecified'");
ensureColumn('questions', 'ability_name_en', "TEXT NOT NULL DEFAULT 'Ability to be defined'");
ensureColumn('questions', 'ability_name_zh', "TEXT NOT NULL DEFAULT '能力待定'");
ensureColumn('questions', 'ability_description_en', "TEXT NOT NULL DEFAULT ''");
ensureColumn('questions', 'ability_description_zh', "TEXT NOT NULL DEFAULT ''");
ensureColumn('label_catalogues', 'labelling_capable', 'INTEGER NOT NULL DEFAULT 1');
ensureColumn('label_catalogues', 'radar_eligible', 'INTEGER NOT NULL DEFAULT 0');
ensureColumn('label_catalogues', 'definition_completeness', "TEXT NOT NULL DEFAULT 'incomplete'");
ensureColumn('form_definition_import_rows', 'ability_code', "TEXT NOT NULL DEFAULT 'ability-unspecified'");
ensureColumn('form_definition_import_rows', 'ability_name_en', "TEXT NOT NULL DEFAULT 'Ability to be defined'");
ensureColumn('form_definition_import_rows', 'ability_name_zh', "TEXT NOT NULL DEFAULT '能力待定'");
db.exec('CREATE INDEX IF NOT EXISTS idx_activity_period ON activities(period_id,starts_at)');
db.prepare("UPDATE evidence SET media_category='certificate' WHERE kind='certificate'").run();
db.prepare("UPDATE evidence SET visibility_state='student_visible' WHERE kind='reflection'").run();

export function id(prefix) {
  return `${prefix}-${randomBytes(5).toString('hex')}`;
}

export function now() { return new Date().toISOString(); }

export function hashSecret(secret, salt = randomBytes(16).toString('hex')) {
  return `${salt}:${scryptSync(secret, salt, 32).toString('hex')}`;
}

export function verifySecret(secret, stored) {
  const [salt, expected] = stored.split(':');
  return scryptSync(secret, salt, 32).toString('hex') === expected;
}

function insert(table, row) {
  const keys = Object.keys(row);
  db.prepare(`INSERT INTO ${table} (${keys.join(',')}) VALUES (${keys.map(() => '?').join(',')})`).run(...keys.map(k => row[k]));
}

function insertIfMissing(table, idValue, row) {
  if (!db.prepare(`SELECT id FROM ${table} WHERE id=?`).get(idValue)) insert(table, row);
}

function seed() {
  const count = db.prepare('SELECT COUNT(*) count FROM users').get().count;
  if (count) return;
  const createdAt = now();
  const password = hashSecret('demo123');
  const users = [
    ['USR-S1','student1','Student 1','學生一','student'],
    ['USR-S2','student2','Student 2','學生二','student'],
    ['USR-CT','teacher','Class Teacher','班主任','class_teacher'],
    ['USR-AT','activityteacher','Activity Teacher','活動老師','activity_teacher'],
    ['USR-ST','staff','Staff Reviewer','校務人員','staff'],
    ['USR-AD','admin','School Admin','系統管理員','school_admin']
  ];
  users.forEach(([id, username, display_name, display_name_zh, role]) => insert('users', { id, username, display_name, display_name_zh, role, password_hash: password, is_active: 1, created_at: createdAt }));
  insert('students', { id:'STU-001', user_id:'USR-S1', student_number:'S-001', english_name:'Alex Chan', chinese_name:'陳同學', date_of_birth:'2012-05-14', created_at:createdAt, disabled_at:null, disabled_reason:null });
  insert('students', { id:'STU-002', user_id:'USR-S2', student_number:'S-002', english_name:'Bella Lee', chinese_name:'李同學', date_of_birth:'2012-09-03', created_at:createdAt, disabled_at:null, disabled_reason:null });
  insert('academic_years', { id:'AY-2526', label:'2025/26', starts_on:'2025-09-01', ends_on:'2026-08-31', status:'closed' });
  insert('academic_years', { id:'AY-2627', label:'2026/27', starts_on:'2026-09-01', ends_on:'2027-08-31', status:'active' });
  insert('academic_years', { id:'AY-2728', label:'2027/28', starts_on:'2027-09-01', ends_on:'2028-08-31', status:'draft' });
  [['P1','2026-09-01','2026-12-31'],['P2','2027-01-01','2027-04-30'],['P3','2027-05-01','2027-08-31']].forEach(([label,starts_on,ends_on],i)=>insert('school_periods',{id:`PER-2627-${i+1}`,academic_year_id:'AY-2627',label,starts_on,ends_on,status:i===0?'active':'draft'}));
  insert('classes',{id:'CLS-2B-2526',academic_year_id:'AY-2526',code:'2B',grade_level:'S2',class_teacher_user_id:'USR-CT',is_active:0});
  insert('classes',{id:'CLS-2B-2627',academic_year_id:'AY-2627',code:'2B',grade_level:'S2',class_teacher_user_id:'USR-CT',is_active:1});
  insert('classes',{id:'CLS-2C-2627',academic_year_id:'AY-2627',code:'2C',grade_level:'S2',class_teacher_user_id:'USR-CT',is_active:1});
  insert('classes',{id:'CLS-3A-2728',academic_year_id:'AY-2728',code:'3A',grade_level:'S3',class_teacher_user_id:'USR-CT',is_active:1});
  insert('student_school_status_history',{id:'SSH-001',student_id:'STU-001',status:'active',valid_from:'2025-09-01',valid_to:null,reason:'Continuing student',created_by:'USR-ST',created_at:createdAt});
  insert('student_school_status_history',{id:'SSH-002',student_id:'STU-002',status:'active',valid_from:'2025-09-01',valid_to:null,reason:'Continuing student',created_by:'USR-ST',created_at:createdAt});
  insert('student_class_memberships',{id:'MEM-001A',student_id:'STU-001',academic_year_id:'AY-2526',period_id:null,class_id:'CLS-2B-2526',grade_level:'S2',valid_from:'2025-09-01',valid_to:'2026-08-31',change_type:'initial',reason:'Imported historical placement',supersedes_membership_id:null,created_by:'USR-ST',created_at:createdAt});
  insert('student_class_memberships',{id:'MEM-001B',student_id:'STU-001',academic_year_id:'AY-2627',period_id:'PER-2627-1',class_id:'CLS-2B-2627',grade_level:'S2',valid_from:'2026-09-01',valid_to:'2026-10-14',change_type:'retained',reason:'Additional preparation year',supersedes_membership_id:'MEM-001A',created_by:'USR-ST',created_at:createdAt});
  insert('student_class_memberships',{id:'MEM-001C',student_id:'STU-001',academic_year_id:'AY-2627',period_id:'PER-2627-1',class_id:'CLS-2C-2627',grade_level:'S2',valid_from:'2026-10-15',valid_to:null,change_type:'class_move',reason:'Timetable and support adjustment',supersedes_membership_id:'MEM-001B',created_by:'USR-ST',created_at:createdAt});
  insert('student_class_memberships',{id:'MEM-002',student_id:'STU-002',academic_year_id:'AY-2627',period_id:'PER-2627-1',class_id:'CLS-2B-2627',grade_level:'S2',valid_from:'2026-09-01',valid_to:null,change_type:'initial',reason:'Annual placement',supersedes_membership_id:null,created_by:'USR-ST',created_at:createdAt});

  const activities = [
    ['ACT-001','Pressure Lab','抗壓解難實驗室','Two-week group challenge with iterative interviews and problem solving.','both','2026-10-01T09:00:00+08:00','2026-10-14T16:00:00+08:00','published'],
    ['ACT-002','Communication Workshop','溝通課堂','Listening, speaking and reflection lesson.','academic','2026-10-20T10:00:00+08:00','2026-10-20T12:00:00+08:00','review'],
    ['ACT-003','Team Relay','團隊接力活動','Sports activity focused on teamwork and peer support.','non_academic','2026-11-05T09:00:00+08:00','2026-11-05T12:00:00+08:00','draft']
  ];
  activities.forEach(a=>insert('activities',{id:a[0],title:a[1],title_zh:a[2],description:a[3],activity_type:a[4],starts_at:a[5],ends_at:a[6],status:a[7],owner_user_id:'USR-AT',created_by:'USR-ST',created_at:createdAt}));
  activities.forEach(a=>insert('activity_staff',{id:id('AST'),activity_id:a[0],user_id:'USR-AT',staff_role:'owner'}));
  ['STU-001','STU-002'].forEach(student_id=>['ACT-001','ACT-002','ACT-003'].forEach(activity_id=>insert('activity_participants',{id:id('PAR'),activity_id,student_id,participation_status:'assigned',assigned_at:createdAt})));
  [['V','Respect for different viewpoints',25],['A','Stay calm under pressure',25],['S','Collaborative problem solving',30],['K','Iteration and feedback',20]].forEach(([dimension,item,weight_percent])=>insert('activity_vask',{id:id('VASK'),activity_id:'ACT-001',dimension,item,weight_percent,status:'approved'}));

  const questions = [
    ['Q-ADAPT-009',10,'Adaptability','適應能力','情感適應力','在不確定的情況下，能夠管理負面情緒。','frequency_effect',0],
    ['Q-COL-016',29,'Collaboration','合作能力','合作溝通','能運用隊友的回饋改進在小組中的工作。','frequency_effect',0],
    ['Q-COM-004',35,'Communication','溝通能力','積極傾聽','當別人發言時會仔細傾聽。','frequency_effect',0],
    ['Q-COM-005',36,'Communication','溝通能力','積極傾聽','會在他人講完話之前就打斷對方。','frequency_effect',1],
    ['Q-CREA-003',50,'Creativity','創造力','創造力樂趣','喜歡想新方式來解決問題。','frequency_effect',0],
    ['Q-CRIT-001',66,'Critical Thinking','批判思維能力','價值意識','能認識到學會正確推理很重要。','frequency_effect',0]
  ];
  const labels=JSON.stringify(['幾乎從不','很少','偶爾','經常','通常','幾乎總是']);
  questions.forEach(q=>insert('questions',{id:q[0],source_workbook:'10份技能問卷整理總表.xlsx',source_sheet:'問卷總表',source_row:q[1],source_construct_en:q[2],source_construct_zh:q[3],subdomain:q[4],prompt_zh:q[5],scale_type:q[6],labels_json:labels,is_negative:q[7],respondent_scope:'all',approval_status:'approved_for_context'}));
  questions.slice(0,5).forEach((q,i)=>insert('activity_questions',{id:`AQ-001-${i+1}`,activity_id:'ACT-001',question_id:q[0],sort_order:i+1,required:1}));
  insert('feedback',{id:'FDB-001',activity_id:'ACT-001',student_id:'STU-001',author_user_id:'USR-AT',text_value:'你能在多次修訂中清楚說明小組的選擇，下一步可更主動邀請較少發言的同學參與。',step_observations_json:JSON.stringify({Teamwork:7,Speaking:6,'Problem Solving':8}),status:'published',submitted_at:'2026-10-16T10:00:00+08:00',published_at:'2026-10-18T09:00:00+08:00'});
  insert('feedback',{id:'FDB-002',activity_id:'ACT-002',student_id:'STU-001',author_user_id:'USR-AT',text_value:'Draft feedback remains hidden until published.',step_observations_json:JSON.stringify({Listening:7}),status:'draft',submitted_at:null,published_at:null});
  insert('evidence',{id:'EVD-001',activity_id:'ACT-001',student_id:'STU-001',uploaded_by:'USR-S1',kind:'reflection',media_category:'activity',visibility_state:'student_visible',original_name:'reflection.txt',storage_name:null,preview_name:null,mime_type:'text/plain',size_bytes:180,caption:'我最記得小組第二次嘗試失敗後，大家重新分工，最後找到可行方法。',is_disabled:0,disabled_reason:null,disabled_by:null,disabled_at:null,created_at:'2026-10-14T17:20:00+08:00'});
  insert('ai_drafts',{id:'AI-001',feature:'portfolio_summary',subject_type:'student',subject_id:'STU-001',source_user_id:'USR-S1',input_payload_json:JSON.stringify({student_id:'STU-001',activity_id:'ACT-001',fields:['activity.description','student.reflection','published_teacher_feedback'],excluded:['original_media','unpublished_feedback']}),output_text:'學生在反覆嘗試的活動中展現協作解難能力，並能指出重新分工對成果的影響。',prompt_profile:'interpersonal_growth',prompt_version:'v1.2-demo',model_label:'POC deterministic draft (no external call)',review_state:'generated',edited_by:null,created_at:'2026-10-18T09:15:00+08:00'});
  const decisions=[
    ['H-03','high','Framework progression authority','Who has final authority to approve a published 1–16 step?','open',null,'Discussion questions.md H-03'],
    ['M-04','mid','Question ability and rubric review','Who approves form/question versions and later rubric observations?','recommended','Fixed question mappings were superseded. Form publication and rubric-result publication remain separate approvals.','Discussion questions.md H-05/M-05'],
    ['M-05','mid','Evidence weighting','How should teacher, self and peer evidence contribute to progression?','open','POC stores sources separately; no automatic promotion.','Discussion questions.md M-05'],
    ['L-02','low','Mandatory response policy','Which activity questions are compulsory and for which respondent?','recommended','Activity owner configures required questions before submission.','Discussion questions.md L-02'],
    ['H-08','high','AI data policy','Which data may be sent to an approved LLM and where may it run?','open',null,'Discussion questions.md H-08']
  ];
  decisions.forEach(d=>insert('requirements_decisions',{id:d[0],level:d[1],title:d[2],question:d[3],status:d[4],answer:d[5],source_ref:d[6]}));
}

seed();

function seedV2() {
  const createdAt = now();
  db.prepare("UPDATE requirements_decisions SET title='Question ability and rubric review',question='Who approves form/question versions and later rubric observations?',status='recommended',answer='Fixed question mappings were superseded. Form publication and rubric-result publication remain separate approvals.',source_ref='Discussion questions.md H-05/M-05' WHERE id='M-04'").run();
  const roleDefinitions = [
    ['ROLE-STUDENT','student','Student','學生','participant','Contributes and views records within own student scope.','在自己的學生範圍內提交及查看紀錄。'],
    ['ROLE-CLASS-TEACHER','class_teacher','Class Teacher','班主任','teaching_staff','Reviews assigned class learners and Portfolio items.','覆核所屬班別學生及 Portfolio 項目。'],
    ['ROLE-ACTIVITY-TEACHER','activity_teacher','Activity Teacher','活動老師','teaching_staff','Creates assigned activities, feedback and observations.','建立獲分派的活動、回饋及觀察。'],
    ['ROLE-TEACHING-ASSISTANT','teaching_assistant','Teaching Assistant','教學助理','support_staff','Acts only within explicit activity or review assignments.','只可在獲明確分派的活動或覆核範圍內操作。'],
    ['ROLE-STAFF','staff','Authorized Staff','獲授權職員','approval_staff','Reviews and approves within delegated scope.','在獲授權範圍內覆核及批核。'],
    ['ROLE-SCHOOL-ADMIN','school_admin','School Administrator','SchoolAdmin','administration','Manages accounts, roles, periods, catalogues and policy.','管理帳戶、角色、學段、目錄及系統政策。']
  ];
  roleDefinitions.forEach(([idValue,code,name_en,name_zh,category,description_en,description_zh])=>insertIfMissing('role_definitions',idValue,{id:idValue,code,name_en,name_zh,category,description_en,description_zh,is_assignable:1,status:'active'}));
  const roleByCode=new Map(roleDefinitions.map(row=>[row[1],row[0]]));
  db.prepare('SELECT id,role,created_at FROM users').all().forEach(user=>insertIfMissing('user_role_assignments',`URA-${user.id}`,{id:`URA-${user.id}`,user_id:user.id,role_id:roleByCode.get(user.role),scope_type:user.role==='student'?'student':'school',scope_id:user.role==='student'?(db.prepare('SELECT id FROM students WHERE user_id=?').get(user.id)?.id||user.id):'BHSS',effective_from:'2026-09-01',effective_until:null,status:'active',assigned_by:'USR-AD',assigned_at:user.created_at||createdAt}));
  const catalogues = [
    {id:'CAT-VASK',code:'VASK',name:'VASK reference vocabulary',catalogue_kind:'vocabulary',version:'2026-poc',labelling_capable:1,assessment_capable:0,radar_eligible:0,definition_completeness:'complete',level_min:null,level_max:null,status:'active'},
    {id:'CAT-ACTIVITY-TYPE',code:'ACTIVITY-TYPE',name:'Activity type labels',catalogue_kind:'vocabulary',version:'1',labelling_capable:1,assessment_capable:0,radar_eligible:0,definition_completeness:'complete',level_min:null,level_max:null,status:'active'},
    {id:'CAT-SKILLS-BUILDER',code:'SKILLS-BUILDER-8X16',name:'Skills Builder eight skills',catalogue_kind:'rubric',version:'UF2.0-poc',labelling_capable:1,assessment_capable:1,radar_eligible:1,definition_completeness:'complete_in_source',level_min:1,level_max:16,status:'active'},
    {id:'CAT-RC360',code:'RC360',name:'RC360 assessment',catalogue_kind:'rubric',version:'pending-source',labelling_capable:1,assessment_capable:0,radar_eligible:0,definition_completeness:'incomplete',level_min:null,level_max:null,status:'pending_source'}
  ];
  catalogues.forEach(row=>{
    const columns=Object.keys(row);
    db.prepare(`INSERT INTO label_catalogues (${columns.join(',')}) VALUES (${columns.map(()=>'?').join(',')})
      ON CONFLICT(id) DO UPDATE SET
        code=excluded.code,name=excluded.name,catalogue_kind=excluded.catalogue_kind,version=excluded.version,
        labelling_capable=excluded.labelling_capable,assessment_capable=excluded.assessment_capable,
        radar_eligible=excluded.radar_eligible,definition_completeness=excluded.definition_completeness,
        level_min=excluded.level_min,level_max=excluded.level_max,status=excluded.status`).run(...columns.map(key=>row[key]));
  });
  const labels = [
    ['LBL-VASK-CURIOSITY','CAT-VASK','curiosity','Curiosity','好奇心',1],
    ['LBL-VASK-EMPATHY','CAT-VASK','empathy','Empathy','同理心',2],
    ['LBL-TYPE-COLLAB','CAT-ACTIVITY-TYPE','collaborative','Collaborative activity','協作活動',1],
    ['LBL-TYPE-PROJECT','CAT-ACTIVITY-TYPE','extended_project','Extended project','延伸專題',2],
    ['LBL-SB-LISTEN','CAT-SKILLS-BUILDER','listening','Listening','聆聽',1],
    ['LBL-SB-SPEAK','CAT-SKILLS-BUILDER','speaking','Speaking','說話',2],
    ['LBL-SB-PROBLEM','CAT-SKILLS-BUILDER','problem_solving','Problem Solving','解難',3],
    ['LBL-SB-CREATIVITY','CAT-SKILLS-BUILDER','creativity','Creativity','創意',4],
    ['LBL-SB-POSITIVE','CAT-SKILLS-BUILDER','staying_positive','Staying Positive','保持積極',5],
    ['LBL-SB-AIMING','CAT-SKILLS-BUILDER','aiming_high','Aiming High','追求卓越',6],
    ['LBL-SB-LEADERSHIP','CAT-SKILLS-BUILDER','leadership','Leadership','領導力',7],
    ['LBL-SB-TEAMWORK','CAT-SKILLS-BUILDER','teamwork','Teamwork','團隊合作',8]
  ];
  labels.forEach(([idValue,catalogue_id,code,name_en,name_zh,display_order])=>insertIfMissing('catalogue_labels',idValue,{id:idValue,catalogue_id,code,name_en,name_zh,display_order}));
  [
    ['AL-001','ACT-001','LBL-VASK-CURIOSITY','descriptor'],
    ['AL-002','ACT-001','LBL-TYPE-COLLAB','descriptor'],
    ['AL-003','ACT-001','LBL-SB-PROBLEM','intended_rubric_axis'],
    ['AL-004','ACT-001','LBL-SB-TEAMWORK','intended_rubric_axis']
  ].forEach(([idValue,activity_id,label_id,label_role])=>insertIfMissing('activity_labels',idValue,{id:idValue,activity_id,label_id,label_role,added_by:'USR-AT',created_at:createdAt}));

  db.prepare(`UPDATE activities SET internal_context=?,cover_style=?,upload_opens_at=?,upload_closes_at=? WHERE id='ACT-001'`).run(
    'Students work across two weeks, compare proposals, interview different people and revise under time pressure. This context is private and may support later evidence association.',
    'project_feature', '2026-10-01T08:00:00+08:00', '2026-10-16T18:00:00+08:00'
  );
  const participants=db.prepare("SELECT activity_id,student_id,participation_status FROM activity_participants WHERE activity_id='ACT-001'").all();
  participants.forEach((p,index)=>insertIfMissing('activity_attendance',`ATT-001-${index+1}`,{id:`ATT-001-${index+1}`,activity_id:p.activity_id,student_id:p.student_id,planned_status:p.participation_status,actual_status:index===0?'attended':'absent',submitted_by:'USR-AT',submitted_at:createdAt,approval_status:index===0?'approved':'pending_approval',approved_by:index===0?'USR-ST':null,approved_at:index===0?createdAt:null,review_note:index===0?'Matches planned participation.':'Roster mismatch awaiting staff approval.'}));

  const blocks = [
    ['QB-001-T','Teacher observation','老師觀察','teacher',1],
    ['QB-001-S','Student self-review','學生自評','student',2],
    ['QB-001-P','Peer review','同儕互評','peer',3]
  ];
  blocks.forEach(([idValue,title_en,title_zh,audience,sort_order])=>insertIfMissing('question_blocks',idValue,{id:idValue,activity_id:'ACT-001',title_en,title_zh,audience,sort_order,version:1,status:'published',created_by:'USR-ST',created_at:createdAt}));
  insertIfMissing('activity_form_versions','AFV-001',{id:'AFV-001',activity_id:'ACT-001',version:1,status:'published',source_import_id:null,selected_vask_json:JSON.stringify(['curiosity']),created_by:'USR-ST',created_at:createdAt,published_at:createdAt});
  db.prepare("UPDATE question_blocks SET form_version_id='AFV-001' WHERE activity_id='ACT-001' AND version=1 AND form_version_id IS NULL").run();
  db.prepare("UPDATE activity_questions SET question_block_id='QB-001-T' WHERE activity_id='ACT-001' AND question_block_id IS NULL").run();
  insertIfMissing('peer_review_assignments','PRA-001',{id:'PRA-001',activity_id:'ACT-001',question_block_id:'QB-001-P',reviewer_student_id:'STU-002',subject_student_id:'STU-001',assigned_by:'USR-AT',status:'assigned',created_at:createdAt});

  insertIfMissing('processing_jobs','JOB-FACE-001',{id:'JOB-FACE-001',evidence_id:null,activity_id:'ACT-001',job_type:'face_match',status:'needs_review',provider:'POC provider adapter · test data only',progress_percent:100,input_manifest_json:JSON.stringify({activity_id:'ACT-001',media:'Picture 1',reference_set:'school-provided isolated POC photos'}),output_json:JSON.stringify({faces_detected:2}),error_message:null,retry_count:0,created_by:'USR-AT',created_at:createdAt,updated_at:createdAt});
  insertIfMissing('face_match_candidates','FACE-001-A',{id:'FACE-001-A',processing_job_id:'JOB-FACE-001',face_index:1,candidate_student_id:'STU-001',confidence_percent:92,decision:'candidate',decided_by:null,decided_at:null});
  insertIfMissing('face_match_candidates','FACE-001-B',{id:'FACE-001-B',processing_job_id:'JOB-FACE-001',face_index:2,candidate_student_id:'STU-002',confidence_percent:78,decision:'candidate',decided_by:null,decided_at:null});
  insertIfMissing('processing_jobs','JOB-SPEECH-001',{id:'JOB-SPEECH-001',evidence_id:null,activity_id:'ACT-001',job_type:'speech_transcription',status:'needs_review',provider:'POC multilingual transcript simulator',progress_percent:100,input_manifest_json:JSON.stringify({activity_id:'ACT-001',media:'Audio1',languages:['yue-Hant-HK','en','zh-Hans']}),output_json:JSON.stringify({speakers_detected:2,chunks:2}),error_message:null,retry_count:0,created_by:'USR-AT',created_at:createdAt,updated_at:createdAt});
  insertIfMissing('transcript_chunks','CHUNK-001',{id:'CHUNK-001',processing_job_id:'JOB-SPEECH-001',chunk_index:1,speaker_label:'Speaker 1',confirmed_student_id:null,starts_ms:0,ends_ms:8500,detected_language:'yue-Hant-HK',original_text:'嗯，我哋試咗第一個方法但係唔得，所以再分工諗另一個方案。',cleaned_text:'我們嘗試第一個方法未能成功，因此重新分工並提出另一個方案。',filler_log_json:JSON.stringify([{removed:'嗯',position:0}])});
  insertIfMissing('transcript_chunks','CHUNK-002',{id:'CHUNK-002',processing_job_id:'JOB-SPEECH-001',chunk_index:2,speaker_label:'Speaker 2',confirmed_student_id:null,starts_ms:8600,ends_ms:15100,detected_language:'en',original_text:'I compared both ideas and explained why the second one was safer.',cleaned_text:'I compared both ideas and explained why the second one was safer.',filler_log_json:'[]'});
  insertIfMissing('rubric_evidence_candidates','REC-001',{id:'REC-001',transcript_chunk_id:'CHUNK-001',evidence_id:null,student_id:null,rubric_catalogue_id:'CAT-SKILLS-BUILDER',axis_label_id:'LBL-SB-PROBLEM',proposed_level:7,confidence_percent:74,rationale:'The speaker describes testing, failure, regrouping and proposing an alternative.',prompt_version:'skill-pass-v1 + step-pass-v1',model_label:'POC deterministic suggestion',decision:'candidate',decided_by:null,decided_at:null});
  insertIfMissing('rubric_evidence_candidates','REC-002',{id:'REC-002',transcript_chunk_id:'CHUNK-002',evidence_id:null,student_id:null,rubric_catalogue_id:'CAT-SKILLS-BUILDER',axis_label_id:'LBL-SB-SPEAK',proposed_level:8,confidence_percent:82,rationale:'The speaker compares options and gives a reason based on safety.',prompt_version:'skill-pass-v1 + step-pass-v1',model_label:'POC deterministic suggestion',decision:'candidate',decided_by:null,decided_at:null});

  insertIfMissing('portfolio_claims','CLAIM-S1-001',{id:'CLAIM-S1-001',student_id:'STU-001',academic_year_id:'AY-2526',section_code:'learner_strength',final_text:'I began to explain my choices more clearly when working with others.',source_kind:'human',rubric_catalogue_id:'CAT-SKILLS-BUILDER',prompt_version:null,model_label:null,approval_status:'published',approved_by:'USR-CT',created_at:createdAt});
  insertIfMissing('portfolio_claims','CLAIM-S2-001',{id:'CLAIM-S2-001',student_id:'STU-001',academic_year_id:'AY-2627',section_code:'learner_strength',final_text:'I can compare different ideas, reorganise work after a setback and explain why the revised option is stronger.',source_kind:'ai_assisted',rubric_catalogue_id:'CAT-SKILLS-BUILDER',prompt_version:'portfolio-claim-v1',model_label:'POC deterministic draft',approval_status:'published',approved_by:'USR-CT',created_at:createdAt});
  insertIfMissing('portfolio_claim_sources','PCS-001',{id:'PCS-001',claim_id:'CLAIM-S2-001',source_type:'student_reflection',source_id:'EVD-001',citation_label:'Student reflection · Pressure Lab',excerpt:'第二次嘗試失敗後，大家重新分工。',display_order:1});
  insertIfMissing('portfolio_claim_sources','PCS-002',{id:'PCS-002',claim_id:'CLAIM-S2-001',source_type:'teacher_feedback',source_id:'FDB-001',citation_label:'Published teacher feedback · Pressure Lab',excerpt:'在多次修訂中清楚說明小組的選擇。',display_order:2});

  db.prepare(`UPDATE activities SET period_id=(SELECT sp.id FROM school_periods sp WHERE substr(activities.starts_at,1,10)>=sp.starts_on AND substr(activities.ends_at,1,10)<=sp.ends_on ORDER BY sp.starts_on DESC LIMIT 1),period_resolution_status=CASE WHEN EXISTS(SELECT 1 FROM school_periods sp WHERE substr(activities.starts_at,1,10)>=sp.starts_on AND substr(activities.ends_at,1,10)<=sp.ends_on) THEN 'resolved' ELSE 'no_match' END,period_resolved_at=? WHERE period_id IS NULL`).run(createdAt);
  const abilities = [
    ['Q-ADAPT-009','emotional_regulation','Emotional regulation','情緒調節','Manage emotion in uncertain situations.','在不確定情況下調節情緒。'],
    ['Q-COL-016','collaborative_feedback','Using collaborative feedback','運用協作回饋','Use peer feedback to improve group work.','運用隊友回饋改善小組工作。'],
    ['Q-COM-004','attentive_listening','Attentive listening','專注聆聽','Attend while another person is speaking.','在他人發言時保持專注。'],
    ['Q-COM-005','turn_taking','Conversational turn-taking','對話輪流','Allow another person to finish before responding.','回應前讓對方完成發言。'],
    ['Q-CREA-003','idea_generation','Idea generation','構思新方法','Generate new approaches to a problem.','為問題構思新的處理方法。'],
    ['Q-CRIT-001','reasoning_value','Valuing sound reasoning','重視合理推理','Recognize the importance of sound reasoning.','認識合理推理的重要性。']
  ];
  abilities.forEach(([questionId,code,nameEn,nameZh,descriptionEn,descriptionZh])=>db.prepare(`UPDATE questions SET ability_code=?,ability_name_en=?,ability_name_zh=?,ability_description_en=?,ability_description_zh=?,approval_status='approved_for_context' WHERE id=?`).run(code,nameEn,nameZh,descriptionEn,descriptionZh,questionId));

  for(let step=1;step<=16;step+=1){const code=String(step).padStart(2,'0');insertIfMissing('rubric_levels',`LVL-SB-${code}`,{id:`LVL-SB-${code}`,rubric_catalogue_id:'CAT-SKILLS-BUILDER',level_code:`step_${code}`,level_order:step,numeric_value:step,name_en:`Step ${step}`,name_zh:`第 ${step} 階段`,is_prerequisite_chain:0,status:'active'});}
  const conditions=[
    ['COND-SB-LISTEN-05','LBL-SB-LISTEN','LVL-SB-05',5],
    ['COND-SB-SPEAK-06','LBL-SB-SPEAK','LVL-SB-06',6],
    ['COND-SB-PROBLEM-04','LBL-SB-PROBLEM','LVL-SB-04',4],
    ['COND-SB-PROBLEM-08','LBL-SB-PROBLEM','LVL-SB-08',8],
    ['COND-SB-TEAMWORK-07','LBL-SB-TEAMWORK','LVL-SB-07',7]
  ];
  conditions.forEach(([conditionId,axisId,levelId,step])=>insertIfMissing('rubric_level_conditions',conditionId,{id:conditionId,rubric_catalogue_id:'CAT-SKILLS-BUILDER',axis_label_id:axisId,level_id:levelId,condition_text_en:`Official framework condition for step ${step} (source text required in production).`,condition_text_zh:`第 ${step} 階段的正式框架條件（正式環境須保存原文）。`,evidence_rule:'Accepted proof must cite observed behaviour; levels are not prerequisites.',source_reference:'Assessment/UF2.0 Cantonese Framework.pdf',status:'source_text_required'}));
  insertIfMissing('rubric_aggregation_policies','POLICY-SB-MAX-001',{id:'POLICY-SB-MAX-001',rubric_catalogue_id:'CAT-SKILLS-BUILDER',code:'MAX-CONFIRMED',version:'v1',method:'max_confirmed',requires_human_confirmation:1,requires_prerequisite_levels:0,status:'active'});

  const proofTypes=[
    ['PT-RESPONSE','question_response','Question response','題目回應','response',1,'reviewers_only'],
    ['PT-TEACHER-FEEDBACK','teacher_feedback','Teacher feedback','老師回饋','feedback',1,'reviewers_only'],
    ['PT-PEER-FEEDBACK','peer_feedback','Peer feedback','同儕回饋','feedback',1,'reviewers_only'],
    ['PT-STUDENT-REFLECTION','student_reflection','Student reflection','學生反思','feedback',1,'student_visible'],
    ['PT-ACTIVITY-PHOTO','activity_photo','Activity photo','活動相片','media',1,'reviewers_only'],
    ['PT-EXTERNAL-CERTIFICATE','external_certificate','External certificate','校外證書','media',0,'pending_review'],
    ['PT-EXTERNAL-RECORD','external_record','External system record','外部系統紀錄','external_system',1,'reviewers_only']
  ];
  proofTypes.forEach(([typeId,code,nameEn,nameZh,category,maySupport,visibility])=>insertIfMissing('proof_type_definitions',typeId,{id:typeId,code,name_en:nameEn,name_zh:nameZh,source_category:category,may_support_assessment:maySupport,default_visibility:visibility,status:'active'}));
  insertIfMissing('proof_items','PRF-EVD-001',{id:'PRF-EVD-001',proof_type_id:'PT-STUDENT-REFLECTION',student_id:'STU-001',activity_id:'ACT-001',source_entity_type:'evidence',source_entity_id:'EVD-001',perspective:'self',summary:'我最記得小組第二次嘗試失敗後，大家重新分工，最後找到可行方法。',occurred_at:'2026-10-14T17:20:00+08:00',submitted_by:'USR-S1',provenance_status:'source_linked',review_status:'accepted',visibility_status:'student_visible',created_at:'2026-10-14T17:20:00+08:00',disabled_at:null});
  insertIfMissing('proof_items','PRF-FDB-001',{id:'PRF-FDB-001',proof_type_id:'PT-TEACHER-FEEDBACK',student_id:'STU-001',activity_id:'ACT-001',source_entity_type:'feedback',source_entity_id:'FDB-001',perspective:'teacher',summary:'在多次修訂中清楚說明小組的選擇。',occurred_at:'2026-10-16T10:00:00+08:00',submitted_by:'USR-AT',provenance_status:'source_linked',review_status:'accepted',visibility_status:'published_to_portfolio',created_at:createdAt,disabled_at:null});
  const observations=[
    ['OBS-SB-TEAM-07','LBL-SB-TEAMWORK','LVL-SB-07','COND-SB-TEAMWORK-07','在多次修訂中協調小組工作。'],
    ['OBS-SB-SPEAK-06','LBL-SB-SPEAK','LVL-SB-06','COND-SB-SPEAK-06','清楚說明小組的選擇。'],
    ['OBS-SB-PROBLEM-08','LBL-SB-PROBLEM','LVL-SB-08','COND-SB-PROBLEM-08','比較方案並在失敗後重新分工。']
  ];
  observations.forEach(([observationId,axisId,levelId,conditionId,summary])=>{insertIfMissing('rubric_observations',observationId,{id:observationId,activity_id:'ACT-001',student_id:'STU-001',rubric_catalogue_id:'CAT-SKILLS-BUILDER',axis_label_id:axisId,observed_level_id:levelId,condition_id:conditionId,observer_user_id:'USR-AT',observation_status:'confirmed',observed_at:'2026-10-18T09:00:00+08:00',evidence_summary:summary,can_contribute:1});insertIfMissing('proof_links',`PL-${observationId}`,{id:`PL-${observationId}`,proof_item_id:'PRF-FDB-001',target_entity_type:'rubric_observation',target_entity_id:observationId,support_role:'supports_condition',linked_by:'USR-AT',linked_at:createdAt,status:'active',notes:'Human-confirmed observation cites accepted proof.'});});
  observations.forEach(([observationId,axisId,levelId])=>insertIfMissing('published_rubric_results',`RESULT-${observationId}`,{id:`RESULT-${observationId}`,student_id:'STU-001',rubric_catalogue_id:'CAT-SKILLS-BUILDER',axis_label_id:axisId,period_id:'PER-2627-1',aggregation_policy_id:'POLICY-SB-MAX-001',published_level_id:levelId,published_numeric_value:Number(levelId.slice(-2)),calculation_trace:`max(${Number(levelId.slice(-2))})=${Number(levelId.slice(-2))}`,published_by:'USR-ST',published_at:'2026-10-20T09:00:00+08:00',status:'published'}));
  insertIfMissing('review_outlook_memory_settings','MEMSET-001',{id:'MEMSET-001',owner_user_id:'USR-CT',target_scope_type:'class',target_scope_id:'CLS-2C-2627',output_mode:'review_and_outlook',from_period_id:'PER-2627-1',to_period_id:'PER-2627-1',include_activity_descriptions:1,include_activity_outcomes:1,include_accepted_proof_summaries:1,include_published_rubric_results:1,prompt_profile:'interpersonal_growth',prompt_version:'review-outlook-v1',status:'active',created_at:createdAt,updated_at:createdAt});
}

seedV2();

export function resetDatabase() {
  db.close();
  if (existsSync(dbPath)) rmSync(dbPath);
}
