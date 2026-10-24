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
const dbPath = join(dataDir, 'bhss-poc.sqlite');

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
  questions.forEach(q=>insert('questions',{id:q[0],source_workbook:'10份技能問卷整理總表.xlsx',source_sheet:'問卷總表',source_row:q[1],source_construct_en:q[2],source_construct_zh:q[3],subdomain:q[4],prompt_zh:q[5],scale_type:q[6],labels_json:labels,is_negative:q[7],respondent_scope:'all',approval_status:'pending_mapping_review'}));
  const mappings=[
    ['MAP-001','Q-ADAPT-009','Staying Positive',70,1,8],['MAP-002','Q-ADAPT-009','Aiming High',30,1,8],
    ['MAP-003','Q-COL-016','Teamwork',70,4,12],['MAP-004','Q-COL-016','Listening',15,4,12],['MAP-005','Q-COL-016','Speaking',15,4,12],
    ['MAP-006','Q-COM-004','Listening',100,1,8],['MAP-007','Q-COM-005','Listening',100,1,8],
    ['MAP-008','Q-CREA-003','Creativity',70,1,10],['MAP-009','Q-CREA-003','Problem Solving',30,1,10],
    ['MAP-010','Q-CRIT-001','Problem Solving',70,1,10],['MAP-011','Q-CRIT-001','Aiming High',30,1,10]
  ];
  mappings.forEach(m=>insert('question_skill_mappings',{id:m[0],question_id:m[1],skill:m[2],weight_percent:m[3],observable_step_min:m[4],observable_step_max:m[5],status:'draft',review_notes:'Example mapping only; school approval required'}));
  questions.slice(0,5).forEach((q,i)=>insert('activity_questions',{id:`AQ-001-${i+1}`,activity_id:'ACT-001',question_id:q[0],sort_order:i+1,required:1}));
  insert('feedback',{id:'FDB-001',activity_id:'ACT-001',student_id:'STU-001',author_user_id:'USR-AT',text_value:'你能在多次修訂中清楚說明小組的選擇，下一步可更主動邀請較少發言的同學參與。',step_observations_json:JSON.stringify({Teamwork:7,Speaking:6,'Problem Solving':8}),status:'published',submitted_at:'2026-10-16T10:00:00+08:00',published_at:'2026-10-18T09:00:00+08:00'});
  insert('feedback',{id:'FDB-002',activity_id:'ACT-002',student_id:'STU-001',author_user_id:'USR-AT',text_value:'Draft feedback remains hidden until published.',step_observations_json:JSON.stringify({Listening:7}),status:'draft',submitted_at:null,published_at:null});
  insert('evidence',{id:'EVD-001',activity_id:'ACT-001',student_id:'STU-001',uploaded_by:'USR-S1',kind:'reflection',media_category:'activity',visibility_state:'student_visible',original_name:'reflection.txt',storage_name:null,preview_name:null,mime_type:'text/plain',size_bytes:180,caption:'我最記得小組第二次嘗試失敗後，大家重新分工，最後找到可行方法。',is_disabled:0,disabled_reason:null,disabled_by:null,disabled_at:null,created_at:'2026-10-14T17:20:00+08:00'});
  insert('ai_drafts',{id:'AI-001',feature:'portfolio_summary',subject_type:'student',subject_id:'STU-001',source_user_id:'USR-S1',input_payload_json:JSON.stringify({student_id:'STU-001',activity_id:'ACT-001',fields:['activity.description','student.reflection','published_teacher_feedback'],excluded:['original_media','unpublished_feedback']}),output_text:'學生在反覆嘗試的活動中展現協作解難能力，並能指出重新分工對成果的影響。',prompt_profile:'interpersonal_growth',prompt_version:'v1.2-demo',model_label:'POC deterministic draft (no external call)',review_state:'generated',edited_by:null,created_at:'2026-10-18T09:15:00+08:00'});
  const decisions=[
    ['H-03','high','Framework progression authority','Who has final authority to approve a published 1–16 step?','open',null,'Discussion questions.md H-03'],
    ['M-04','mid','Question mapping approval','Who approves question-to-VASK and question-to-eight-skill mappings?','open',null,'Discussion questions.md M-04'],
    ['M-05','mid','Evidence weighting','How should teacher, self and peer evidence contribute to progression?','open','POC stores sources separately; no automatic promotion.','Discussion questions.md M-05'],
    ['L-02','low','Mandatory response policy','Which activity questions are compulsory and for which respondent?','recommended','Activity owner configures required questions before submission.','Discussion questions.md L-02'],
    ['H-08','high','AI data policy','Which data may be sent to an approved LLM and where may it run?','open',null,'Discussion questions.md H-08']
  ];
  decisions.forEach(d=>insert('requirements_decisions',{id:d[0],level:d[1],title:d[2],question:d[3],status:d[4],answer:d[5],source_ref:d[6]}));
}

seed();

export function resetDatabase() {
  db.close();
  if (existsSync(dbPath)) rmSync(dbPath);
}
