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

CREATE TABLE IF NOT EXISTS role_definitions (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name_en TEXT NOT NULL,
  name_zh TEXT NOT NULL,
  category TEXT NOT NULL,
  description_en TEXT NOT NULL,
  description_zh TEXT NOT NULL,
  is_assignable INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL CHECK(status IN ('active','retired'))
);

CREATE TABLE IF NOT EXISTS user_role_assignments (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  role_id TEXT NOT NULL REFERENCES role_definitions(id),
  scope_type TEXT NOT NULL,
  scope_id TEXT NOT NULL,
  effective_from TEXT NOT NULL,
  effective_until TEXT,
  status TEXT NOT NULL CHECK(status IN ('active','suspended','ended')),
  assigned_by TEXT NOT NULL REFERENCES users(id),
  assigned_at TEXT NOT NULL,
  UNIQUE(user_id,role_id,scope_type,scope_id,effective_from)
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
  internal_context TEXT NOT NULL DEFAULT '',
  cover_style TEXT NOT NULL DEFAULT 'standard',
  activity_type TEXT NOT NULL CHECK(activity_type IN ('academic','non_academic','both','external')),
  starts_at TEXT NOT NULL,
  ends_at TEXT NOT NULL,
  upload_opens_at TEXT,
  upload_closes_at TEXT,
  period_id TEXT REFERENCES school_periods(id),
  period_resolution_status TEXT NOT NULL DEFAULT 'unresolved' CHECK(period_resolution_status IN ('unresolved','resolved','no_match','cross_period_exception')),
  period_resolved_at TEXT,
  period_exception_approved_by TEXT REFERENCES users(id),
  period_exception_reason TEXT,
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

CREATE TABLE IF NOT EXISTS activity_attendance (
  id TEXT PRIMARY KEY,
  activity_id TEXT NOT NULL REFERENCES activities(id),
  student_id TEXT NOT NULL REFERENCES students(id),
  planned_status TEXT NOT NULL DEFAULT 'assigned',
  actual_status TEXT CHECK(actual_status IN ('attended','late','absent','partial')),
  submitted_by TEXT REFERENCES users(id),
  submitted_at TEXT,
  approval_status TEXT NOT NULL DEFAULT 'not_submitted' CHECK(approval_status IN ('not_submitted','pending_approval','approved','returned')),
  approved_by TEXT REFERENCES users(id),
  approved_at TEXT,
  review_note TEXT,
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

CREATE TABLE IF NOT EXISTS label_catalogues (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  catalogue_kind TEXT NOT NULL CHECK(catalogue_kind IN ('vocabulary','rubric')),
  version TEXT NOT NULL,
  labelling_capable INTEGER NOT NULL DEFAULT 1,
  assessment_capable INTEGER NOT NULL DEFAULT 0,
  radar_eligible INTEGER NOT NULL DEFAULT 0,
  definition_completeness TEXT NOT NULL DEFAULT 'incomplete',
  level_min INTEGER,
  level_max INTEGER,
  status TEXT NOT NULL CHECK(status IN ('draft','active','pending_source','retired'))
);

CREATE TABLE IF NOT EXISTS catalogue_labels (
  id TEXT PRIMARY KEY,
  catalogue_id TEXT NOT NULL REFERENCES label_catalogues(id),
  code TEXT NOT NULL,
  name_en TEXT NOT NULL,
  name_zh TEXT NOT NULL,
  display_order INTEGER NOT NULL,
  UNIQUE(catalogue_id,code)
);

CREATE TABLE IF NOT EXISTS activity_labels (
  id TEXT PRIMARY KEY,
  activity_id TEXT NOT NULL REFERENCES activities(id),
  label_id TEXT NOT NULL REFERENCES catalogue_labels(id),
  label_role TEXT NOT NULL CHECK(label_role IN ('descriptor','intended_rubric_axis')),
  added_by TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL,
  UNIQUE(activity_id,label_id,label_role)
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
  ability_code TEXT NOT NULL DEFAULT 'ability-unspecified',
  ability_name_en TEXT NOT NULL DEFAULT 'Ability to be defined',
  ability_name_zh TEXT NOT NULL DEFAULT '能力待定',
  ability_description_en TEXT NOT NULL DEFAULT '',
  ability_description_zh TEXT NOT NULL DEFAULT '',
  is_negative INTEGER NOT NULL DEFAULT 0,
  respondent_scope TEXT NOT NULL DEFAULT 'all',
  approval_status TEXT NOT NULL DEFAULT 'approved_for_context'
);

CREATE TABLE IF NOT EXISTS activity_form_versions (
  id TEXT PRIMARY KEY,
  activity_id TEXT NOT NULL REFERENCES activities(id),
  version INTEGER NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('draft','published','retired')),
  source_import_id TEXT,
  selected_vask_json TEXT NOT NULL DEFAULT '[]',
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL,
  published_at TEXT,
  UNIQUE(activity_id,version)
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

CREATE TABLE IF NOT EXISTS question_blocks (
  id TEXT PRIMARY KEY,
  activity_id TEXT NOT NULL REFERENCES activities(id),
  title_en TEXT NOT NULL,
  title_zh TEXT NOT NULL,
  audience TEXT NOT NULL CHECK(audience IN ('teacher','student','peer')),
  sort_order INTEGER NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL CHECK(status IN ('draft','published','retired')),
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS peer_review_assignments (
  id TEXT PRIMARY KEY,
  activity_id TEXT NOT NULL REFERENCES activities(id),
  question_block_id TEXT NOT NULL REFERENCES question_blocks(id),
  reviewer_student_id TEXT NOT NULL REFERENCES students(id),
  subject_student_id TEXT NOT NULL REFERENCES students(id),
  assigned_by TEXT NOT NULL REFERENCES users(id),
  status TEXT NOT NULL CHECK(status IN ('assigned','submitted','in_moderation','published','returned')),
  created_at TEXT NOT NULL,
  UNIQUE(activity_id,question_block_id,reviewer_student_id,subject_student_id)
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

CREATE TABLE IF NOT EXISTS processing_jobs (
  id TEXT PRIMARY KEY,
  evidence_id TEXT REFERENCES evidence(id),
  activity_id TEXT REFERENCES activities(id),
  job_type TEXT NOT NULL CHECK(job_type IN ('preview','face_match','speech_transcription','rubric_suggestion')),
  status TEXT NOT NULL CHECK(status IN ('queued','processing','retry_wait','needs_review','completed','failed_terminal','cancelled')),
  provider TEXT NOT NULL,
  progress_percent INTEGER NOT NULL DEFAULT 0 CHECK(progress_percent BETWEEN 0 AND 100),
  input_manifest_json TEXT NOT NULL,
  output_json TEXT,
  error_message TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS face_match_candidates (
  id TEXT PRIMARY KEY,
  processing_job_id TEXT NOT NULL REFERENCES processing_jobs(id),
  face_index INTEGER NOT NULL,
  candidate_student_id TEXT REFERENCES students(id),
  confidence_percent INTEGER CHECK(confidence_percent BETWEEN 0 AND 100),
  decision TEXT NOT NULL CHECK(decision IN ('candidate','confirmed','rejected','unknown','not_student')),
  decided_by TEXT REFERENCES users(id),
  decided_at TEXT
);

CREATE TABLE IF NOT EXISTS transcript_chunks (
  id TEXT PRIMARY KEY,
  processing_job_id TEXT NOT NULL REFERENCES processing_jobs(id),
  chunk_index INTEGER NOT NULL,
  speaker_label TEXT NOT NULL,
  confirmed_student_id TEXT REFERENCES students(id),
  starts_ms INTEGER NOT NULL CHECK(starts_ms >= 0),
  ends_ms INTEGER NOT NULL CHECK(ends_ms >= starts_ms),
  detected_language TEXT NOT NULL,
  original_text TEXT NOT NULL,
  cleaned_text TEXT NOT NULL,
  filler_log_json TEXT NOT NULL DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS rubric_evidence_candidates (
  id TEXT PRIMARY KEY,
  transcript_chunk_id TEXT REFERENCES transcript_chunks(id),
  evidence_id TEXT REFERENCES evidence(id),
  student_id TEXT REFERENCES students(id),
  rubric_catalogue_id TEXT NOT NULL REFERENCES label_catalogues(id),
  axis_label_id TEXT NOT NULL REFERENCES catalogue_labels(id),
  proposed_level INTEGER,
  confidence_percent INTEGER CHECK(confidence_percent BETWEEN 0 AND 100),
  rationale TEXT NOT NULL,
  prompt_version TEXT NOT NULL,
  model_label TEXT NOT NULL,
  decision TEXT NOT NULL CHECK(decision IN ('candidate','confirmed','rejected')),
  decided_by TEXT REFERENCES users(id),
  decided_at TEXT
);

CREATE TABLE IF NOT EXISTS rubric_levels (
  id TEXT PRIMARY KEY,
  rubric_catalogue_id TEXT NOT NULL REFERENCES label_catalogues(id),
  level_code TEXT NOT NULL,
  level_order INTEGER NOT NULL,
  numeric_value INTEGER NOT NULL,
  name_en TEXT NOT NULL,
  name_zh TEXT NOT NULL,
  is_prerequisite_chain INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL CHECK(status IN ('draft','active','retired')),
  UNIQUE(rubric_catalogue_id,level_code)
);

CREATE TABLE IF NOT EXISTS rubric_level_conditions (
  id TEXT PRIMARY KEY,
  rubric_catalogue_id TEXT NOT NULL REFERENCES label_catalogues(id),
  axis_label_id TEXT NOT NULL REFERENCES catalogue_labels(id),
  level_id TEXT NOT NULL REFERENCES rubric_levels(id),
  condition_text_en TEXT NOT NULL,
  condition_text_zh TEXT NOT NULL,
  evidence_rule TEXT NOT NULL,
  source_reference TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('source_text_required','active','retired')),
  UNIQUE(axis_label_id,level_id)
);

CREATE TABLE IF NOT EXISTS rubric_aggregation_policies (
  id TEXT PRIMARY KEY,
  rubric_catalogue_id TEXT NOT NULL REFERENCES label_catalogues(id),
  code TEXT NOT NULL,
  version TEXT NOT NULL,
  method TEXT NOT NULL CHECK(method IN ('max_confirmed','latest_confirmed','average_confirmed')),
  requires_human_confirmation INTEGER NOT NULL DEFAULT 1,
  requires_prerequisite_levels INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL CHECK(status IN ('draft','active','retired')),
  UNIQUE(rubric_catalogue_id,code,version)
);

CREATE TABLE IF NOT EXISTS proof_type_definitions (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name_en TEXT NOT NULL,
  name_zh TEXT NOT NULL,
  source_category TEXT NOT NULL CHECK(source_category IN ('response','feedback','media','external_system')),
  may_support_assessment INTEGER NOT NULL DEFAULT 0,
  default_visibility TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('active','retired'))
);

CREATE TABLE IF NOT EXISTS proof_items (
  id TEXT PRIMARY KEY,
  proof_type_id TEXT NOT NULL REFERENCES proof_type_definitions(id),
  student_id TEXT REFERENCES students(id),
  activity_id TEXT REFERENCES activities(id),
  source_entity_type TEXT NOT NULL,
  source_entity_id TEXT NOT NULL,
  perspective TEXT NOT NULL,
  summary TEXT NOT NULL,
  occurred_at TEXT NOT NULL,
  submitted_by TEXT REFERENCES users(id),
  provenance_status TEXT NOT NULL,
  review_status TEXT NOT NULL CHECK(review_status IN ('unreviewed','accepted','rejected','disabled')),
  visibility_status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  disabled_at TEXT,
  UNIQUE(source_entity_type,source_entity_id)
);

CREATE TABLE IF NOT EXISTS proof_links (
  id TEXT PRIMARY KEY,
  proof_item_id TEXT NOT NULL REFERENCES proof_items(id),
  target_entity_type TEXT NOT NULL,
  target_entity_id TEXT NOT NULL,
  support_role TEXT NOT NULL,
  linked_by TEXT REFERENCES users(id),
  linked_at TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('active','withdrawn')),
  notes TEXT,
  UNIQUE(proof_item_id,target_entity_type,target_entity_id,support_role)
);

CREATE TABLE IF NOT EXISTS rubric_observations (
  id TEXT PRIMARY KEY,
  activity_id TEXT REFERENCES activities(id),
  student_id TEXT NOT NULL REFERENCES students(id),
  rubric_catalogue_id TEXT NOT NULL REFERENCES label_catalogues(id),
  axis_label_id TEXT NOT NULL REFERENCES catalogue_labels(id),
  observed_level_id TEXT REFERENCES rubric_levels(id),
  condition_id TEXT REFERENCES rubric_level_conditions(id),
  observer_user_id TEXT NOT NULL REFERENCES users(id),
  observation_status TEXT NOT NULL CHECK(observation_status IN ('draft','missing','confirmed','rejected')),
  observed_at TEXT,
  evidence_summary TEXT NOT NULL,
  can_contribute INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS published_rubric_results (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES students(id),
  rubric_catalogue_id TEXT NOT NULL REFERENCES label_catalogues(id),
  axis_label_id TEXT NOT NULL REFERENCES catalogue_labels(id),
  period_id TEXT NOT NULL REFERENCES school_periods(id),
  aggregation_policy_id TEXT NOT NULL REFERENCES rubric_aggregation_policies(id),
  published_level_id TEXT NOT NULL REFERENCES rubric_levels(id),
  published_numeric_value INTEGER NOT NULL,
  calculation_trace TEXT NOT NULL,
  published_by TEXT NOT NULL REFERENCES users(id),
  published_at TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('published','withdrawn')),
  UNIQUE(student_id,rubric_catalogue_id,axis_label_id,period_id,status)
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

CREATE TABLE IF NOT EXISTS form_definition_imports (
  id TEXT PRIMARY KEY,
  activity_id TEXT NOT NULL REFERENCES activities(id),
  uploaded_by TEXT NOT NULL REFERENCES users(id),
  original_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('staged','committed','cancelled')),
  base_version INTEGER,
  selected_vask_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  committed_at TEXT
);

CREATE TABLE IF NOT EXISTS form_definition_import_rows (
  id TEXT PRIMARY KEY,
  batch_id TEXT NOT NULL REFERENCES form_definition_imports(id),
  row_number INTEGER NOT NULL,
  include_flag TEXT NOT NULL,
  source_question_id TEXT,
  question_version INTEGER NOT NULL DEFAULT 1,
  section_code TEXT NOT NULL,
  section_title_zh TEXT NOT NULL,
  section_title_en TEXT NOT NULL,
  audience TEXT NOT NULL,
  display_order INTEGER NOT NULL,
  prompt_zh TEXT NOT NULL,
  prompt_en TEXT,
  scale_type TEXT NOT NULL,
  scale_min INTEGER NOT NULL,
  scale_max INTEGER NOT NULL,
  required INTEGER NOT NULL DEFAULT 1,
  ability_code TEXT NOT NULL DEFAULT 'ability-unspecified',
  ability_name_en TEXT NOT NULL DEFAULT 'Ability to be defined',
  ability_name_zh TEXT NOT NULL DEFAULT '能力待定',
  teacher_note TEXT,
  validation_status TEXT NOT NULL,
  validation_message TEXT,
  change_type TEXT NOT NULL,
  original_json TEXT NOT NULL,
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

CREATE TABLE IF NOT EXISTS student_introductions (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES students(id),
  period_id TEXT NOT NULL REFERENCES school_periods(id),
  source_mode TEXT NOT NULL CHECK(source_mode IN ('sentence_starters','generated_draft')),
  starter_code TEXT,
  generated_input_json TEXT,
  draft_text TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('draft','submitted','approved','returned')),
  submitted_at TEXT,
  approved_by TEXT REFERENCES users(id),
  approved_at TEXT,
  review_note TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(student_id,period_id)
);

CREATE TABLE IF NOT EXISTS portfolio_claims (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES students(id),
  academic_year_id TEXT NOT NULL REFERENCES academic_years(id),
  section_code TEXT NOT NULL,
  final_text TEXT NOT NULL,
  source_kind TEXT NOT NULL CHECK(source_kind IN ('human','ai_assisted')),
  rubric_catalogue_id TEXT REFERENCES label_catalogues(id),
  prompt_version TEXT,
  model_label TEXT,
  approval_status TEXT NOT NULL CHECK(approval_status IN ('draft','submitted','approved','published')),
  approved_by TEXT REFERENCES users(id),
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS portfolio_claim_sources (
  id TEXT PRIMARY KEY,
  claim_id TEXT NOT NULL REFERENCES portfolio_claims(id),
  source_type TEXT NOT NULL,
  source_id TEXT NOT NULL,
  citation_label TEXT NOT NULL,
  excerpt TEXT,
  display_order INTEGER NOT NULL
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

CREATE TABLE IF NOT EXISTS review_outlook_memory_settings (
  id TEXT PRIMARY KEY,
  owner_user_id TEXT NOT NULL REFERENCES users(id),
  target_scope_type TEXT NOT NULL,
  target_scope_id TEXT NOT NULL,
  output_mode TEXT NOT NULL CHECK(output_mode IN ('review','outlook','review_and_outlook','annual_review')),
  from_period_id TEXT NOT NULL REFERENCES school_periods(id),
  to_period_id TEXT NOT NULL REFERENCES school_periods(id),
  include_activity_descriptions INTEGER NOT NULL DEFAULT 1,
  include_activity_outcomes INTEGER NOT NULL DEFAULT 1,
  include_accepted_proof_summaries INTEGER NOT NULL DEFAULT 1,
  include_published_rubric_results INTEGER NOT NULL DEFAULT 1,
  prompt_profile TEXT NOT NULL,
  prompt_version TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('draft','active','retired')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS review_outlook_memory_items (
  id TEXT PRIMARY KEY,
  memory_snapshot_id TEXT NOT NULL,
  memory_setting_id TEXT NOT NULL REFERENCES review_outlook_memory_settings(id),
  student_id TEXT NOT NULL REFERENCES students(id),
  source_kind TEXT NOT NULL,
  source_entity_type TEXT NOT NULL,
  source_entity_id TEXT NOT NULL,
  period_id TEXT REFERENCES school_periods(id),
  display_summary TEXT NOT NULL,
  included_at TEXT NOT NULL,
  content_hash TEXT NOT NULL
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
CREATE INDEX IF NOT EXISTS idx_attendance_activity ON activity_attendance(activity_id,approval_status);
CREATE INDEX IF NOT EXISTS idx_processing_job_status ON processing_jobs(status,created_at);
CREATE INDEX IF NOT EXISTS idx_question_block_activity ON question_blocks(activity_id,audience,sort_order);
CREATE INDEX IF NOT EXISTS idx_form_version_activity ON activity_form_versions(activity_id,version);
CREATE INDEX IF NOT EXISTS idx_form_definition_activity ON form_definition_imports(activity_id,created_at);
CREATE INDEX IF NOT EXISTS idx_claim_student_year ON portfolio_claims(student_id,academic_year_id);
CREATE INDEX IF NOT EXISTS idx_user_role_effective ON user_role_assignments(user_id,status,effective_from,effective_until);
CREATE INDEX IF NOT EXISTS idx_proof_student_activity ON proof_items(student_id,activity_id,review_status);
CREATE INDEX IF NOT EXISTS idx_proof_target ON proof_links(target_entity_type,target_entity_id,status);
CREATE INDEX IF NOT EXISTS idx_rubric_observation_student ON rubric_observations(student_id,rubric_catalogue_id,axis_label_id,observation_status);
CREATE INDEX IF NOT EXISTS idx_memory_setting_owner ON review_outlook_memory_settings(owner_user_id,status);
