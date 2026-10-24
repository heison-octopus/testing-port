PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  display_name_zh TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('student','class_teacher','activity_teacher','staff','school_admin')),
  password_hash TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS students (
  id TEXT PRIMARY KEY,
  user_id TEXT UNIQUE REFERENCES users(id),
  student_number TEXT NOT NULL UNIQUE,
  english_name TEXT NOT NULL,
  chinese_name TEXT NOT NULL,
  date_of_birth TEXT,
  created_at TEXT NOT NULL,
  disabled_at TEXT,
  disabled_reason TEXT
);

CREATE TABLE IF NOT EXISTS academic_years (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL UNIQUE,
  starts_on TEXT NOT NULL,
  ends_on TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('draft','active','closed'))
);

CREATE TABLE IF NOT EXISTS school_periods (
  id TEXT PRIMARY KEY,
  academic_year_id TEXT NOT NULL REFERENCES academic_years(id),
  label TEXT NOT NULL,
  starts_on TEXT NOT NULL,
  ends_on TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('draft','active','closed'))
);

CREATE TABLE IF NOT EXISTS classes (
  id TEXT PRIMARY KEY,
  academic_year_id TEXT NOT NULL REFERENCES academic_years(id),
  code TEXT NOT NULL,
  grade_level TEXT NOT NULL,
  class_teacher_user_id TEXT REFERENCES users(id),
  is_active INTEGER NOT NULL DEFAULT 1,
  UNIQUE(academic_year_id, code)
);

CREATE TABLE IF NOT EXISTS student_school_status_history (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES students(id),
  status TEXT NOT NULL CHECK(status IN ('active','leave','withdrawn','returned','graduated')),
  valid_from TEXT NOT NULL,
  valid_to TEXT,
  reason TEXT,
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS student_class_memberships (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES students(id),
  academic_year_id TEXT NOT NULL REFERENCES academic_years(id),
  period_id TEXT REFERENCES school_periods(id),
  class_id TEXT NOT NULL REFERENCES classes(id),
  grade_level TEXT NOT NULL,
  valid_from TEXT NOT NULL,
  valid_to TEXT,
  change_type TEXT NOT NULL CHECK(change_type IN ('initial','promoted','class_move','retained','regraded','returned')),
  reason TEXT,
  supersedes_membership_id TEXT REFERENCES student_class_memberships(id),
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS activities (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  title_zh TEXT NOT NULL,
  description TEXT NOT NULL,
  activity_type TEXT NOT NULL CHECK(activity_type IN ('academic','non_academic','both','external')),
  starts_at TEXT NOT NULL,
  ends_at TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('draft','submitted','review','published','returned','archived')),
  owner_user_id TEXT NOT NULL REFERENCES users(id),
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS activity_staff (
  id TEXT PRIMARY KEY,
  activity_id TEXT NOT NULL REFERENCES activities(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  staff_role TEXT NOT NULL CHECK(staff_role IN ('owner','teacher','ta','reviewer')),
  UNIQUE(activity_id,user_id,staff_role)
);

CREATE TABLE IF NOT EXISTS activity_participants (
  id TEXT PRIMARY KEY,
  activity_id TEXT NOT NULL REFERENCES activities(id),
  student_id TEXT NOT NULL REFERENCES students(id),
  participation_status TEXT NOT NULL DEFAULT 'assigned',
  assigned_at TEXT NOT NULL,
  UNIQUE(activity_id,student_id)
);

CREATE TABLE IF NOT EXISTS activity_vask (
  id TEXT PRIMARY KEY,
  activity_id TEXT NOT NULL REFERENCES activities(id),
  dimension TEXT NOT NULL CHECK(dimension IN ('V','A','S','K')),
  item TEXT NOT NULL,
  weight_percent INTEGER NOT NULL CHECK(weight_percent BETWEEN 0 AND 100),
  status TEXT NOT NULL DEFAULT 'draft'
);

CREATE TABLE IF NOT EXISTS questions (
  id TEXT PRIMARY KEY,
  source_workbook TEXT NOT NULL,
  source_sheet TEXT NOT NULL,
  source_row INTEGER NOT NULL,
  source_construct_en TEXT NOT NULL,
  source_construct_zh TEXT NOT NULL,
  subdomain TEXT NOT NULL,
  prompt_zh TEXT NOT NULL,
  scale_type TEXT NOT NULL,
  labels_json TEXT NOT NULL,
  is_negative INTEGER NOT NULL DEFAULT 0,
  respondent_scope TEXT NOT NULL DEFAULT 'all',
  approval_status TEXT NOT NULL DEFAULT 'pending_mapping_review'
);

CREATE TABLE IF NOT EXISTS question_skill_mappings (
  id TEXT PRIMARY KEY,
  question_id TEXT NOT NULL REFERENCES questions(id),
  skill TEXT NOT NULL,
  weight_percent INTEGER NOT NULL CHECK(weight_percent BETWEEN 0 AND 100),
  observable_step_min INTEGER CHECK(observable_step_min BETWEEN 1 AND 16),
  observable_step_max INTEGER CHECK(observable_step_max BETWEEN 1 AND 16),
  status TEXT NOT NULL DEFAULT 'draft',
  review_notes TEXT
);

CREATE TABLE IF NOT EXISTS activity_questions (
  id TEXT PRIMARY KEY,
  activity_id TEXT NOT NULL REFERENCES activities(id),
  question_id TEXT NOT NULL REFERENCES questions(id),
  sort_order INTEGER NOT NULL,
  required INTEGER NOT NULL DEFAULT 1,
  UNIQUE(activity_id,question_id)
);

CREATE TABLE IF NOT EXISTS responses (
  id TEXT PRIMARY KEY,
  activity_id TEXT NOT NULL REFERENCES activities(id),
  question_id TEXT REFERENCES questions(id),
  student_id TEXT NOT NULL REFERENCES students(id),
  respondent_user_id TEXT NOT NULL REFERENCES users(id),
  perspective TEXT NOT NULL CHECK(perspective IN ('self','peer','teacher')),
  score INTEGER,
  text_value TEXT,
  status TEXT NOT NULL CHECK(status IN ('draft','submitted','accepted','published','returned')),
  submitted_at TEXT,
  published_at TEXT
);

CREATE TABLE IF NOT EXISTS evidence (
  id TEXT PRIMARY KEY,
  activity_id TEXT REFERENCES activities(id),
  student_id TEXT NOT NULL REFERENCES students(id),
  uploaded_by TEXT NOT NULL REFERENCES users(id),
  kind TEXT NOT NULL CHECK(kind IN ('image','certificate','audio','reflection')),
  media_category TEXT NOT NULL DEFAULT 'activity',
  visibility_state TEXT NOT NULL DEFAULT 'teacher_only',
  original_name TEXT NOT NULL,
  storage_name TEXT,
  preview_name TEXT,
  mime_type TEXT,
  size_bytes INTEGER,
  caption TEXT,
  is_disabled INTEGER NOT NULL DEFAULT 0,
  disabled_reason TEXT,
  disabled_by TEXT REFERENCES users(id),
  disabled_at TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS questionnaire_import_batches (
  id TEXT PRIMARY KEY,
  activity_id TEXT NOT NULL REFERENCES activities(id),
  uploaded_by TEXT NOT NULL REFERENCES users(id),
  original_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('draft','submitted','superseded')),
  version INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  submitted_at TEXT
);

CREATE TABLE IF NOT EXISTS questionnaire_import_rows (
  id TEXT PRIMARY KEY,
  batch_id TEXT NOT NULL REFERENCES questionnaire_import_batches(id),
  row_number INTEGER NOT NULL,
  student_id_input TEXT NOT NULL,
  student_id TEXT REFERENCES students(id),
  student_name_reference TEXT,
  resolved_name TEXT,
  class_reference TEXT,
  q1 INTEGER,
  q2 INTEGER,
  q3 INTEGER,
  q4 INTEGER,
  q5 INTEGER,
  teacher_feedback TEXT,
  validation_status TEXT NOT NULL,
  validation_message TEXT,
  original_json TEXT NOT NULL,
  edited_json TEXT,
  UNIQUE(batch_id,row_number)
);

CREATE TABLE IF NOT EXISTS activity_roster_import_batches (
  id TEXT PRIMARY KEY,
  activity_id TEXT REFERENCES activities(id),
  uploaded_by TEXT NOT NULL REFERENCES users(id),
  original_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('draft','committed','cancelled')),
  created_at TEXT NOT NULL,
  committed_at TEXT
);

CREATE TABLE IF NOT EXISTS activity_roster_import_rows (
  id TEXT PRIMARY KEY,
  batch_id TEXT NOT NULL REFERENCES activity_roster_import_batches(id),
  row_number INTEGER NOT NULL,
  student_id_input TEXT NOT NULL,
  student_id TEXT REFERENCES students(id),
  student_name_reference TEXT,
  resolved_name TEXT,
  class_reference TEXT,
  resolved_class TEXT,
  note TEXT,
  validation_status TEXT NOT NULL,
  validation_message TEXT,
  original_json TEXT NOT NULL,
  edited_json TEXT,
  UNIQUE(batch_id,row_number)
);

CREATE TABLE IF NOT EXISTS memorable_activity_windows (
  id TEXT PRIMARY KEY,
  period_id TEXT NOT NULL REFERENCES school_periods(id),
  status TEXT NOT NULL CHECK(status IN ('open','closed')),
  opens_at TEXT,
  closes_at TEXT,
  opened_by TEXT REFERENCES users(id),
  closed_by TEXT REFERENCES users(id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(period_id)
);

CREATE TABLE IF NOT EXISTS student_memorable_activity_selections (
  id TEXT PRIMARY KEY,
  window_id TEXT NOT NULL REFERENCES memorable_activity_windows(id),
  student_id TEXT NOT NULL REFERENCES students(id),
  activity_id TEXT NOT NULL REFERENCES activities(id),
  reflection TEXT NOT NULL,
  submitted_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(window_id,student_id)
);

CREATE TABLE IF NOT EXISTS feedback (
  id TEXT PRIMARY KEY,
  activity_id TEXT NOT NULL REFERENCES activities(id),
  student_id TEXT NOT NULL REFERENCES students(id),
  author_user_id TEXT NOT NULL REFERENCES users(id),
  text_value TEXT NOT NULL,
  step_observations_json TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL CHECK(status IN ('draft','submitted','published','returned')),
  submitted_at TEXT,
  published_at TEXT
);

CREATE TABLE IF NOT EXISTS ai_drafts (
  id TEXT PRIMARY KEY,
  feature TEXT NOT NULL,
  subject_type TEXT NOT NULL,
  subject_id TEXT NOT NULL,
  source_user_id TEXT NOT NULL REFERENCES users(id),
  input_payload_json TEXT NOT NULL,
  output_text TEXT NOT NULL,
  prompt_profile TEXT NOT NULL,
  prompt_version TEXT NOT NULL,
  model_label TEXT NOT NULL,
  review_state TEXT NOT NULL CHECK(review_state IN ('generated','edited','approved','rejected')),
  edited_by TEXT REFERENCES users(id),
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS rollover_batches (
  id TEXT PRIMARY KEY,
  from_academic_year_id TEXT NOT NULL REFERENCES academic_years(id),
  to_academic_year_id TEXT NOT NULL REFERENCES academic_years(id),
  status TEXT NOT NULL CHECK(status IN ('preview','applied','cancelled')),
  comparison_json TEXT NOT NULL,
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL,
  applied_at TEXT
);

CREATE TABLE IF NOT EXISTS requirements_decisions (
  id TEXT PRIMARY KEY,
  level TEXT NOT NULL CHECK(level IN ('high','mid','low')),
  title TEXT NOT NULL,
  question TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('open','recommended','confirmed','deferred')),
  answer TEXT,
  source_ref TEXT
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  token_hash TEXT NOT NULL UNIQUE,
  request_key_hash TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id),
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  actor_user_id TEXT REFERENCES users(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  before_json TEXT,
  after_json TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_membership_student_dates ON student_class_memberships(student_id,valid_from,valid_to);
CREATE INDEX IF NOT EXISTS idx_school_status_student_dates ON student_school_status_history(student_id,valid_from,valid_to);
CREATE INDEX IF NOT EXISTS idx_activity_participant_student ON activity_participants(student_id,activity_id);
CREATE INDEX IF NOT EXISTS idx_evidence_student ON evidence(student_id,activity_id,is_disabled);
CREATE INDEX IF NOT EXISTS idx_questionnaire_batch_activity ON questionnaire_import_batches(activity_id,status,version);
CREATE INDEX IF NOT EXISTS idx_roster_batch_status ON activity_roster_import_batches(uploaded_by,status);
