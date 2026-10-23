# Aspects updated

## Purpose

This document compares the original entity notes with an updated relational model for activities, media, forms, teacher feedback, the eight Universal Framework skills, their 16 steps, questionnaire constructs, and optional VASK configuration.

The central distinction is:

- **Activity design** records what an activity intends to develop.
- **Framework skills and steps** provide the eight developmental axes and 16 ordered stages per axis.
- **Questionnaire constructs and questions** provide reusable observation prompts and six-point response scales.
- **Feedback and evidence** record what a teacher actually observed about one student in one activity context.
- **Radar-chart results** are derived from supported framework-step observations. They are not stored as the only assessment record.

## Naming convention

### Before

- Entity names mix singular and plural forms: `Activities`, `Media`, `Form`, `FormQuestions`, `User`.
- Field names mix styles: `activityId`, `upload/updateBy`, `accessBy`, `respondantId`.
- Some fields contain several concepts, such as `activityVASK` and `mediaList`.
- Some references are written as dotted labels, such as `Activity.activityId`, rather than foreign-key fields.

### After

- Use **plural snake_case** table names: `activities`, `media_assets`, `forms`, `users`.
- Use **singular snake_case** field names: `activity_id`, `uploaded_by_user_id`.
- Use `_id` only for primary and foreign keys.
- Use `created_at`, `updated_at`, `starts_at`, and `ends_at` for timestamps.
- Use join tables for many-to-many relationships instead of array fields.
- Use reference tables or validated enums for controlled vocabularies.
- Preserve historical definitions through versioned templates and immutable submitted records.

## Important model distinction

The source questionnaire and the Universal Framework do not contain the same skill set.

### Eight Universal Framework radar axes

| Code | English name | Chinese name | Steps |
|---|---|---|---:|
| `listening` | Listening | 聆聽 | 16 |
| `speaking` | Speaking | 說話 | 16 |
| `problem_solving` | Problem-solving | 解難 | 16 |
| `creativity` | Creativity | 創意 | 16 |
| `adaptability` | Adaptability | 適應力 | 16 |
| `planning` | Planning | 計劃能力 | 16 |
| `leadership` | Leadership | 領導力 | 16 |
| `teamwork` | Teamwork | 團隊協作 | 16 |

### Ten questionnaire constructs

| Code | English name | Chinese name | Questions | Direct framework relationship |
|---|---|---|---:|---|
| `adaptability` | Adaptability | 適應能力 | 12 | Directly related to Adaptability |
| `collaboration` | Collaboration | 合作能力 | 18 | Directly related to Teamwork |
| `communication` | Communication | 溝通能力 | 16 | May map to Listening, Speaking, or both |
| `creativity` | Creativity | 創造力 | 18 | Directly related to Creativity |
| `critical_thinking` | Critical Thinking | 批判思維能力 | 18 | Supporting construct; may map to Listening or Problem-solving questions |
| `curiosity` | Curiosity | 探究能力／好奇心 | 18 | Supporting construct; may map to Creativity or Problem-solving questions |
| `growth_mindset` | Growth Mindset | 成長型思維 | 12 | Supporting construct; may map to Adaptability or Planning questions |
| `leadership` | Leadership | 領導力 | 22 | Directly related to Leadership |
| `perseverance` | Perseverance | 堅毅 | 14 | Supporting construct; may map to Adaptability or Planning questions |
| `problem_solving` | Problem-Solving | 問題解決能力 | 18 | Directly related to Problem-solving |

Do not put both lists in one `skill` column. Store them as separate reference models and connect individual questions to framework skills through an explicit mapping table.

---

## 1 Activities

### Before

```text
Activities
    activityId
    activityVASK
    activityType
    date (by School year)
    uploadDate
    upload/updateBy
    updateDate
```

### Issues

- A reusable activity definition and an actual occurrence are mixed together.
- One `date` field cannot represent a lesson, trip, or two-week project.
- `activityVASK` would contain multiple records in one field.
- Creator and updater are combined.
- The school year should be a referenced academic period, not inferred only from a date.

### After

#### `activity_templates`

Reusable definitions such as “Communication lesson” or “Two-week problem-solving project.”

| Field | Type | Notes |
|---|---|---|
| `activity_template_id` | UUID | Primary key |
| `name_zh` | text | Required |
| `name_en` | text, nullable | Optional English name |
| `description` | text, nullable | Intended activity design |
| `activity_type_id` | UUID | References `activity_types` |
| `default_duration_minutes` | integer, nullable | Useful for lessons |
| `status` | enum | `draft`, `active`, `archived` |
| `version_number` | integer | Starts at 1 |
| `created_by_user_id` | UUID | References `users` |
| `created_at` | timestamp | Required |
| `updated_by_user_id` | UUID | References `users` |
| `updated_at` | timestamp | Required |

#### `activity_instances`

One actual occurrence of an activity.

| Field | Type | Notes |
|---|---|---|
| `activity_instance_id` | UUID | Primary key |
| `activity_template_id` | UUID, nullable | Null for a standalone observation |
| `template_version_number` | integer, nullable | Preserves the version used |
| `title` | text | Display name for this occurrence |
| `activity_type_id` | UUID | References `activity_types` |
| `academic_period_id` | UUID | References `academic_periods` |
| `group_id` | UUID, nullable | Class, team, or project group |
| `starts_at` | timestamp | Required |
| `ends_at` | timestamp, nullable | Supports multi-day activities |
| `lead_teacher_user_id` | UUID | References `users` |
| `status` | enum | `planned`, `active`, `completed`, `cancelled` |
| `created_at` | timestamp | Required |
| `updated_at` | timestamp | Required |

#### `activity_types`

Examples: `class_lesson`, `extracurricular`, `school_trip`, `project`, `sports`, `standalone_observation`.

---

## 2 Activity participants and staff

### Before

```text
ActivityData
    Activity.activityId
    mediaList (formId, mediaId)
    teacherId (single or array)
    studentId (single or array)
```

### Issues

- `ActivityData` does not describe one clear entity.
- Teacher and student arrays prevent relational constraints and efficient queries.
- Forms and media are different entities and should not share one array.

### After

#### `activity_participants`

| Field | Type | Notes |
|---|---|---|
| `activity_participant_id` | UUID | Primary key |
| `activity_instance_id` | UUID | References `activity_instances` |
| `user_id` | UUID | Usually a student |
| `participant_role` | enum | `student`, `peer_reviewer`, `observer`, `guest` |
| `joined_at` | timestamp, nullable | Optional attendance information |
| `participation_status` | enum | `invited`, `attended`, `absent`, `withdrawn` |

Unique constraint: `activity_instance_id + user_id + participant_role`.

#### `activity_staff`

| Field | Type | Notes |
|---|---|---|
| `activity_staff_id` | UUID | Primary key |
| `activity_instance_id` | UUID | References `activity_instances` |
| `user_id` | UUID | Teacher or administrator |
| `staff_role` | enum | `lead_teacher`, `teacher`, `observer`, `approver` |

Media and form links belong in their own tables described below.

---

## 3 Media

### Before

```text
Media
    mediaId
    Activities.activityId
    mediaType
    path
    uploadDate
    uploadedBy
```

### Issues

- A media item may relate to an activity, feedback record, form response, or student portfolio.
- A raw path is insufficient for cloud storage, integrity, and access control.
- There is no title, MIME type, file size, status, or ownership information.

### After

#### `media_assets`

| Field | Type | Notes |
|---|---|---|
| `media_asset_id` | UUID | Primary key |
| `owner_user_id` | UUID | Original owner |
| `uploaded_by_user_id` | UUID | User who performed the upload |
| `file_name` | text | Original file name |
| `display_name` | text, nullable | Human-readable label |
| `media_type` | enum | `image`, `video`, `audio`, `document`, `other` |
| `mime_type` | text | Actual MIME type |
| `storage_provider` | text | Storage system identifier |
| `storage_key` | text | Provider-specific object key; do not expose as public URL |
| `file_size_bytes` | bigint | Validation and quotas |
| `checksum_sha256` | text, nullable | Integrity and duplicate detection |
| `visibility` | enum | `private`, `activity_staff`, `activity_participants`, `school` |
| `moderation_status` | enum | `pending`, `approved`, `rejected` |
| `created_at` | timestamp | Upload time |
| `updated_at` | timestamp | Metadata update time |

#### `activity_media`

| Field | Type | Notes |
|---|---|---|
| `activity_instance_id` | UUID | References `activity_instances` |
| `media_asset_id` | UUID | References `media_assets` |
| `relationship_type` | enum | `instruction`, `student_evidence`, `teacher_evidence`, `result` |
| `added_by_user_id` | UUID | References `users` |
| `added_at` | timestamp | Required |

For student uploads, default `visibility` to `private` and `moderation_status` to `pending`. A permitted teacher can approve the asset for wider activity access.

---

## 4 Media information and access

### Before

```text
MediaInfo
    Media.mediaId
    modifyDate
    updatedDate
    uploadedBy
    accessBy(teacher, class, teacher group)
```

### Issues

- Upload and update data duplicate fields from `Media`.
- `modifyDate` and `updatedDate` are ambiguous duplicates.
- `accessBy` combines users, groups, and roles in one field.

### After

Keep core metadata in `media_assets`. Add access grants only when the normal activity visibility rules are insufficient.

#### `media_access_grants`

| Field | Type | Notes |
|---|---|---|
| `media_access_grant_id` | UUID | Primary key |
| `media_asset_id` | UUID | References `media_assets` |
| `grantee_type` | enum | `user`, `group`, `role` |
| `grantee_id` | UUID | Validated according to `grantee_type` |
| `permission` | enum | `view`, `comment`, `manage` |
| `granted_by_user_id` | UUID | References `users` |
| `created_at` | timestamp | Required |
| `expires_at` | timestamp, nullable | Optional temporary access |

---

## 5 Media extraction

### Before

```text
MediaExtract
    mediaId
    mediaText
    extractType
    extract
    createdDate
    updatedDate
    createdBy
```

### Issues

- `mediaText` and `extract` overlap.
- There is no processing status, model/version provenance, language, confidence, or error information.
- Human-created and machine-generated extractions are not distinguished.

### After

#### `media_extractions`

| Field | Type | Notes |
|---|---|---|
| `media_extraction_id` | UUID | Primary key |
| `media_asset_id` | UUID | References `media_assets` |
| `extraction_type` | enum | `ocr`, `transcription`, `summary`, `tagging`, `other` |
| `content_text` | text, nullable | Extracted or generated text |
| `content_json` | json, nullable | Timecodes, regions, labels, or structured output |
| `language_code` | text, nullable | For example `zh-Hant` |
| `source_type` | enum | `system`, `teacher`, `student`, `import` |
| `processor_name` | text, nullable | Service or model name |
| `processor_version` | text, nullable | Reproducibility |
| `confidence_score` | decimal, nullable | Only when supplied by the processor |
| `status` | enum | `queued`, `processing`, `completed`, `failed`, `reviewed` |
| `error_message` | text, nullable | Processing failure details |
| `created_by_user_id` | UUID, nullable | Null for automated system jobs |
| `created_at` | timestamp | Required |
| `updated_at` | timestamp | Required |

---

## 6 Shared media folders

### Before

```text
SharedMediaFolder
    information missing
```

### After

#### `media_collections`

| Field | Type | Notes |
|---|---|---|
| `media_collection_id` | UUID | Primary key |
| `name` | text | Required |
| `description` | text, nullable | Optional |
| `owner_user_id` | UUID | References `users` |
| `activity_instance_id` | UUID, nullable | Optional activity context |
| `visibility` | enum | Same controlled vocabulary as media |
| `created_at` | timestamp | Required |
| `updated_at` | timestamp | Required |

#### `media_collection_items`

| Field | Type | Notes |
|---|---|---|
| `media_collection_id` | UUID | References `media_collections` |
| `media_asset_id` | UUID | References `media_assets` |
| `display_order` | integer | Stable ordering |
| `added_by_user_id` | UUID | References `users` |
| `added_at` | timestamp | Required |

---

## 7 Forms

### Before

```text
Form
    (associated)activityId
    formId
    formQuestionId(array)
    uploaded/updatedBy
    teacherId(array for access)
    formType: isPeerReview, isTeacherReview, activityRewind
    respondantId (have access and can update)
    peerId (viewOnly)
```

### Issues

- Form definition, activity assignment, respondents, reviewers, and submitted responses are mixed together.
- Question arrays prevent ordering, versioning, and reuse.
- Boolean-style form types can conflict with one another.
- `respondantId` is misspelled; the correct term is `respondent_id`.
- Access and submission status need separate records.

### After

#### `forms`

Stable identity for a reusable form. Editable content and governance status belong to an immutable form version.

| Field | Type | Notes |
|---|---|---|
| `form_id` | UUID | Primary key |
| `name` | text | Required |
| `description` | text, nullable | Optional |
| `form_type` | enum | `teacher_observation`, `teacher_review`, `peer_review`, `student_reflection`, `activity_rewind` |
| `created_by_user_id` | UUID | References `users` |
| `created_at` | timestamp | Required |
| `updated_at` | timestamp | Required |

#### `form_versions`

One immutable content version of a form. Modifying an approved or published version creates a new draft version rather than changing historical assignments.

| Field | Type | Notes |
|---|---|---|
| `form_version_id` | UUID | Primary key |
| `form_id` | UUID | References `forms` |
| `version_number` | integer | Unique within one form |
| `supersedes_form_version_id` | UUID, nullable | Prior version |
| `review_status` | enum | `draft`, `in_review`, `changes_requested`, `approved`, `rejected`, `retired` |
| `publication_status` | enum | `unpublished`, `published`, `withdrawn` |
| `visibility_scope` | enum | `private_draft`, `reviewers_only`, `school_catalogue`, `assigned_activities_only`, `public_external` |
| `valid_from` | date, nullable | Earliest assignment date |
| `valid_until` | date, nullable | Latest assignment date |
| `created_by_user_id` | UUID | Version author |
| `created_at` | timestamp | Required |

Only a version with `review_status = approved`, `publication_status = published`, and a current validity window is eligible for a new activity assignment. `public_external` is outside the initial scope and requires a separate school policy.

#### `form_review_events`

Immutable review and publication history.

| Field | Type | Notes |
|---|---|---|
| `form_review_event_id` | UUID | Primary key |
| `form_version_id` | UUID | References `form_versions` |
| `event_type` | enum | `submitted`, `changes_requested`, `approved`, `rejected`, `published`, `withdrawn`, `retired`, `created_revision` |
| `actor_user_id` | UUID | Authorized reviewer, publisher, or author |
| `decision_comment` | text, nullable | Review rationale |
| `event_at` | timestamp | Required |

#### `form_review_assignments`

Assigns one immutable form version to a specific authorized reviewer. Role permissions determine who is eligible; this table records who actually owns the review work item.

| Field | Type | Notes |
|---|---|---|
| `form_review_assignment_id` | UUID | Primary key |
| `form_version_id` | UUID | References `form_versions` |
| `assigned_by_user_id` | UUID | User who allocated the review |
| `reviewer_user_id` | UUID | Specific reviewer |
| `reviewer_role_required` | enum | Usually `super_teacher` or `school_admin` |
| `assigned_scope` | text | School, programme, year, class, or other authorized scope |
| `assigned_at` | timestamp | Required |
| `due_at` | timestamp, nullable | Review deadline |
| `status` | enum | `assigned`, `accepted`, `in_review`, `changes_requested`, `approved`, `rejected`, `cancelled`, `expired` |
| `accepted_at` | timestamp, nullable | Reviewer acceptance |
| `completed_at` | timestamp, nullable | Completion time |
| `completion_event_id` | UUID, nullable | References the resulting `form_review_events` decision |

A reviewer must hold the required role within the assignment scope. By default, the author of a form version cannot approve their own version.

#### `form_questions`

Orders reusable questions within a form.

| Field | Type | Notes |
|---|---|---|
| `form_question_id` | UUID | Primary key |
| `form_version_id` | UUID | References `form_versions` |
| `question_id` | UUID | References `questions` |
| `display_order` | integer | Required |
| `is_required` | boolean | Required |
| `section_name` | text, nullable | Optional grouping |
| `configuration_json` | json, nullable | UI-only settings, not core scoring data |

#### `activity_form_assignments`

| Field | Type | Notes |
|---|---|---|
| `activity_form_assignment_id` | UUID | Primary key |
| `activity_instance_id` | UUID | References `activity_instances` |
| `form_version_id` | UUID | References one immutable `form_versions` record |
| `assigned_by_user_id` | UUID | References `users` |
| `assigned_at` | timestamp | Required |
| `opens_at` | timestamp, nullable | Optional |
| `due_at` | timestamp, nullable | Optional |
| `assignment_status` | enum | `scheduled`, `open`, `closed`, `cancelled`, `blocked` |
| `eligibility_check` | enum | `passed`, `failed_form_not_approved`, `failed_form_not_published`, `failed_outside_validity`, `failed_form_retired` |

Approval, publication, visibility, and assignment are separate decisions. Approval means the content is valid; publication makes that approved version available within a defined scope; assignment connects that exact version to an activity.

#### `form_assignment_recipients`

| Field | Type | Notes |
|---|---|---|
| `form_assignment_recipient_id` | UUID | Primary key |
| `activity_form_assignment_id` | UUID | References assignment |
| `respondent_user_id` | UUID | Person who completes the form |
| `subject_user_id` | UUID, nullable | Student being assessed |
| `reviewer_user_id` | UUID, nullable | Person with review-only access |
| `status` | enum | `assigned`, `in_progress`, `submitted`, `reviewed`, `cancelled` |

#### `form_submissions`

| Field | Type | Notes |
|---|---|---|
| `form_submission_id` | UUID | Primary key |
| `form_assignment_recipient_id` | UUID | References recipient record |
| `feedback_id` | UUID, nullable | Connects assessment responses to feedback |
| `submitted_at` | timestamp, nullable | Null until submitted |
| `status` | enum | `draft`, `submitted`, `locked`, `returned` |
| `created_at` | timestamp | Required |
| `updated_at` | timestamp | Required |

---

## 8 Questions, scales, and form comparison

### Before

```text
FormQuestions
    questionId
    questionIndex
    questionText
    questionType (radio, spectrum, text, dropdown, openEnd)
    skill (ch/en)
    negativeQuestion
    specialized Teacher observation and comments
```

### Issues

- `skill (ch/en)` combines language labels and an ambiguous skill model.
- Questionnaire constructs are not the same as the eight framework skills.
- The two six-point scales need reusable definitions.
- Negative wording and reverse scoring are related but should remain explicit.
- Question order belongs to `form_questions`, not the reusable question itself.
- Teacher comments are assessment evidence, not a special question type.

### After

#### `questions`

| Field | Type | Notes |
|---|---|---|
| `question_id` | UUID | Primary key |
| `question_code` | text | Stable human-readable identifier |
| `question_text_zh` | text | Required |
| `question_text_en` | text, nullable | Optional |
| `question_type` | enum | `single_choice`, `multiple_choice`, `scale`, `short_text`, `long_text`, `dropdown` |
| `response_scale_id` | UUID, nullable | Required for scaled questions |
| `questionnaire_construct_id` | UUID, nullable | Primary questionnaire construct |
| `construct_subcategory_id` | UUID, nullable | Workbook “範疇” value |
| `is_negatively_worded` | boolean | Matches source wording |
| `requires_reverse_scoring` | boolean | True only when scoring requires reversal |
| `status` | enum | `draft`, `active`, `retired` |
| `created_at` | timestamp | Required |
| `updated_at` | timestamp | Required |

#### `response_scales`

| Field | Type | Notes |
|---|---|---|
| `response_scale_id` | UUID | Primary key |
| `code` | text | For example `frequency_effect_6` |
| `name_zh` | text | `頻率／效果` or `同意程度` |
| `minimum_value` | integer | 1 |
| `maximum_value` | integer | 6 |

#### `response_scale_options`

| Field | Type | Notes |
|---|---|---|
| `response_scale_option_id` | UUID | Primary key |
| `response_scale_id` | UUID | References scale |
| `numeric_value` | integer | 1 through 6 |
| `label_zh` | text | Scale label |
| `display_order` | integer | Required |

The source scales are:

| Scale | 1 | 2 | 3 | 4 | 5 | 6 |
|---|---|---|---|---|---|---|
| Frequency/effect | 幾乎從不 | 很少 | 偶爾 | 經常 | 通常 | 幾乎總是 |
| Agreement | 非常不同意 | 不同意 | 略為不同意 | 略為同意 | 同意 | 非常同意 |

#### `questionnaire_constructs`

Stores the 10 questionnaire skills separately from the eight framework skills.

| Field | Type | Notes |
|---|---|---|
| `questionnaire_construct_id` | UUID | Primary key |
| `code` | text | Stable code |
| `name_zh` | text | Chinese label |
| `name_en` | text | English label |
| `definition_zh` | text | Source definition |

#### `questionnaire_construct_subcategories`

| Field | Type | Notes |
|---|---|---|
| `construct_subcategory_id` | UUID | Primary key |
| `questionnaire_construct_id` | UUID | Parent construct |
| `name_zh` | text | Workbook “範疇” |
| `display_order` | integer | Required |

#### `question_framework_mappings`

Maps a question to zero, one, or several framework axes without pretending the two models are identical.

| Field | Type | Notes |
|---|---|---|
| `question_framework_mapping_id` | UUID | Primary key |
| `question_id` | UUID | References `questions` |
| `framework_skill_id` | UUID | References `framework_skills` |
| `mapping_role` | enum | `primary`, `supporting` |
| `weight` | decimal, nullable | Optional; avoid unless validated |
| `mapping_rationale` | text | Explains why the mapping exists |
| `approved_by_user_id` | UUID, nullable | Governance record |
| `approved_at` | timestamp, nullable | Governance record |

#### `question_responses`

| Field | Type | Notes |
|---|---|---|
| `question_response_id` | UUID | Primary key |
| `form_submission_id` | UUID | References `form_submissions` |
| `question_id` | UUID | References `questions` |
| `numeric_value` | decimal, nullable | Scale or numeric response |
| `text_value` | text, nullable | Written response |
| `selected_option_id` | UUID, nullable | Choice response |
| `raw_numeric_value` | decimal, nullable | Preserves original answer |
| `scored_numeric_value` | decimal, nullable | Reverse-scored value where applicable |
| `created_at` | timestamp | Required |
| `updated_at` | timestamp | Required |

---

## 9 Framework skills and steps

### Before

No separate framework entities exist. `FormQuestions.skill` is expected to carry skill information, but it cannot represent:

- Eight framework axes.
- Sixteen ordered developmental steps for every axis.
- The difference between a questionnaire construct and a framework skill.
- The exact step selected by a teacher.

### After

#### `frameworks`

| Field | Type | Notes |
|---|---|---|
| `framework_id` | UUID | Primary key |
| `code` | text | For example `skills_builder_uf_2_0_zh_hant` |
| `name` | text | Framework title |
| `version` | text | `2.0` |
| `language_code` | text | `zh-Hant` |
| `status` | enum | `active`, `retired` |

#### `framework_skills`

| Field | Type | Notes |
|---|---|---|
| `framework_skill_id` | UUID | Primary key |
| `framework_id` | UUID | References `frameworks` |
| `code` | text | One of the eight canonical codes |
| `name_zh` | text | Canonical Chinese label |
| `name_en` | text | Canonical English label |
| `description_zh` | text | Framework skill description |
| `display_order` | integer | 1 through 8 |

Unique constraint: `framework_id + code`.

#### `framework_steps`

| Field | Type | Notes |
|---|---|---|
| `framework_step_id` | UUID | Primary key |
| `framework_skill_id` | UUID | References `framework_skills` |
| `step_number` | integer | 1 through 16 |
| `step_title_zh` | text | For example `質疑` |
| `descriptor_zh` | text | Exact “I can” statement |
| `development_band` | enum | `entry`, `intermediate`, `advanced`, `mastery` |

Unique constraint: `framework_skill_id + step_number`.

Recommended band derivation:

| Steps | Band code | Chinese label |
|---:|---|---|
| 1–4 | `entry` | 入門 |
| 5–8 | `intermediate` | 初階 |
| 9–12 | `advanced` | 高階 |
| 13–16 | `mastery` | 精通 |

The step title and descriptor should be reference data. Teachers select a step; they do not edit the canonical sentence inside an assessment.

#### `activity_framework_targets`

Stores what an activity is designed to practise.

| Field | Type | Notes |
|---|---|---|
| `activity_framework_target_id` | UUID | Primary key |
| `activity_instance_id` | UUID | References `activity_instances` |
| `framework_skill_id` | UUID | References `framework_skills` |
| `target_step_id` | UUID, nullable | Optional expected step |
| `priority` | enum | `primary`, `secondary`, `exposure_only` |
| `is_assessed` | boolean | Distinguishes practice from formal observation |
| `configured_by_user_id` | UUID | Teacher or administrator |
| `created_at` | timestamp | Required |

---

## 10 Teacher feedback and observed framework levels

### Before

Teacher feedback is mentioned only as a possible specialised form. There is no parent feedback record, evidence structure, framework-step selection, or separation between stage and response frequency.

### After

#### `feedback`

One feedback event about one subject in an optional activity context.

| Field | Type | Notes |
|---|---|---|
| `feedback_id` | UUID | Primary key |
| `activity_instance_id` | UUID, nullable | Null for standalone feedback |
| `subject_user_id` | UUID | Student being assessed |
| `author_user_id` | UUID | Teacher, peer, or student |
| `feedback_type` | enum | `teacher_observation`, `teacher_review`, `peer_review`, `self_reflection`, `system_import` |
| `overall_comment` | text, nullable | General free-text feedback |
| `observed_at` | timestamp | When the behaviour occurred |
| `status` | enum | `draft`, `submitted`, `reviewed`, `voided` |
| `visibility` | enum | `author_only`, `staff`, `student_and_staff`, `guardian_and_staff` |
| `created_at` | timestamp | Required |
| `updated_at` | timestamp | Required |

Yes, this replaces the proposed `feedback_list`. The list is a UI view or query; the stored entity is `feedback`.

#### `feedback_evidence`

| Field | Type | Notes |
|---|---|---|
| `feedback_evidence_id` | UUID | Primary key |
| `feedback_id` | UUID | References `feedback` |
| `evidence_type` | enum | `text`, `media`, `form_response`, `work_product`, `other` |
| `evidence_text` | text, nullable | Specific observable behaviour |
| `media_asset_id` | UUID, nullable | References `media_assets` |
| `form_submission_id` | UUID, nullable | References `form_submissions` |
| `created_at` | timestamp | Required |

At least one evidence payload should be present according to `evidence_type`.

#### `feedback_skill_observations`

| Field | Type | Notes |
|---|---|---|
| `feedback_skill_observation_id` | UUID | Primary key |
| `feedback_id` | UUID | References `feedback` |
| `framework_skill_id` | UUID | Radar axis |
| `observed_step_id` | UUID, nullable | Selected 1–16 framework step |
| `consistency_rating` | integer, nullable | 1–6 frequency/effect rating |
| `confidence_level` | enum, nullable | `low`, `medium`, `high`; optional |
| `comment` | text, nullable | Skill-specific comment |
| `next_step_id` | UUID, nullable | Suggested developmental step |

Validation rules:

- `observed_step_id` must belong to `framework_skill_id`.
- `next_step_id` must belong to the same framework skill.
- `consistency_rating` must be between 1 and 6.
- Stage and consistency remain separate. Stage 8 with rating 5 is not the same as stage 5 with rating 8, and rating 8 is invalid.

#### `feedback_observation_evidence`

Many-to-many link when one evidence item supports several skill observations.

| Field | Type |
|---|---|
| `feedback_skill_observation_id` | UUID |
| `feedback_evidence_id` | UUID |

---

## 11 VASK activity configuration

### Before

`activityVASK` exists as one unspecified field.

### Issues

- It cannot distinguish Value, Attitude, Skill, and Knowledge.
- It cannot support multiple selected items.
- It cannot distinguish default template settings from teacher-edited activity settings.
- Historical activities could change if a global VASK item is edited in place.

### After

#### `vask_items`

| Field | Type | Notes |
|---|---|---|
| `vask_item_id` | UUID | Primary key |
| `category` | enum | `value`, `attitude`, `skill`, `knowledge` |
| `name_zh` | text | Required |
| `name_en` | text, nullable | Optional |
| `status` | enum | `active`, `retired` |
| `version_number` | integer | Supports wording changes |

#### `activity_template_vask_items`

Default selection for a reusable template.

| Field | Type | Notes |
|---|---|---|
| `activity_template_id` | UUID | References template |
| `vask_item_id` | UUID | References VASK item |
| `priority` | enum | `primary`, `secondary` |

#### `activity_instance_vask_items`

The actual selection used for one activity occurrence.

| Field | Type | Notes |
|---|---|---|
| `activity_instance_vask_item_id` | UUID | Primary key |
| `activity_instance_id` | UUID | References activity instance |
| `vask_item_id` | UUID | References VASK item |
| `vask_item_version_number` | integer | Historical wording reference |
| `priority` | enum | `primary`, `secondary` |
| `source` | enum | `template_default`, `teacher_added`, `teacher_modified` |
| `configured_by_user_id` | UUID | References `users` |

Changing an activity template or VASK reference record must not retroactively change an existing activity instance.

---

## 12 Users and school membership

### Before

```text
User
    userId
    userType(stud, teacher, Admin)
    enabled
    classId
    classNo
```

### Issues

- One `userType` cannot represent users with several roles.
- Class membership changes over time and should not be stored directly on the user.
- `classNo` is membership data, not identity data.
- External Time Infinity identifiers need their own namespace and provenance.

### After

#### `users`

| Field | Type | Notes |
|---|---|---|
| `user_id` | UUID | Primary key |
| `external_user_id` | text, nullable | Time Infinity or other source identifier |
| `external_source` | text, nullable | Source system name |
| `display_name` | text | Required |
| `email` | text, nullable | Unique when present |
| `status` | enum | `invited`, `active`, `disabled`, `archived` |
| `created_at` | timestamp | Required |
| `updated_at` | timestamp | Required |

#### `roles`

Examples: `student`, `teacher`, `administrator`, `guardian`.

#### `user_roles`

| Field | Type |
|---|---|
| `user_id` | UUID |
| `role_id` | UUID |
| `school_id` | UUID, nullable |
| `starts_at` | timestamp |
| `ends_at` | timestamp, nullable |

#### `groups`

| Field | Type | Notes |
|---|---|---|
| `group_id` | UUID | Primary key |
| `school_id` | UUID | References `schools` |
| `academic_period_id` | UUID | References `academic_periods` |
| `group_type` | enum | `class`, `team`, `teacher_group`, `project_group` |
| `name` | text | Required |

#### `group_memberships`

| Field | Type | Notes |
|---|---|---|
| `group_membership_id` | UUID | Primary key |
| `group_id` | UUID | References `groups` |
| `user_id` | UUID | References `users` |
| `membership_role` | enum | `student`, `teacher`, `leader`, `member` |
| `class_number` | text, nullable | Former `classNo` |
| `starts_at` | timestamp | Required |
| `ends_at` | timestamp, nullable | Preserves history |

---

## 13 Login and action logs

### Before

Not defined in the original file, but identified as a requirement.

### After

#### `login_events`

| Field | Type | Notes |
|---|---|---|
| `login_event_id` | UUID | Primary key |
| `user_id` | UUID, nullable | May be null for unknown login attempt |
| `occurred_at` | timestamp | Required |
| `result` | enum | `success`, `failure`, `locked`, `logout` |
| `authentication_method` | text | Password, SSO, etc. |
| `ip_address` | protected value | Apply retention and privacy policy |
| `user_agent` | text, nullable | Diagnostic data |

#### `audit_events`

| Field | Type | Notes |
|---|---|---|
| `audit_event_id` | UUID | Primary key |
| `actor_user_id` | UUID, nullable | Null for system actions |
| `action_code` | text | For example `feedback.submitted` |
| `entity_type` | text | For example `feedback` |
| `entity_id` | UUID | Affected record |
| `occurred_at` | timestamp | Required |
| `change_summary_json` | json, nullable | Avoid storing unnecessary sensitive content |

Login events and audit events should not be used as the primary source for ordinary product analytics. If detailed behavioural analytics are required, define a separate event model and retention policy.

---

## 14 Radar chart and reporting

### Before

No reporting entity is defined.

### After

The eight-axis radar chart should normally be generated from `feedback_skill_observations` and not manually stored as eight editable marks.

Each plotted value should include:

- `framework_skill_id`
- current supported `step_number`
- observation date
- source feedback records
- number of supporting evidence items
- optional consistency rating summary
- calculation rule version

If performance requires cached results, use:

#### `student_skill_snapshots`

| Field | Type | Notes |
|---|---|---|
| `student_skill_snapshot_id` | UUID | Primary key |
| `student_user_id` | UUID | Student |
| `framework_skill_id` | UUID | Radar axis |
| `academic_period_id` | UUID | Reporting period |
| `step_number` | integer, nullable | Null means no evidence, not zero |
| `calculation_rule_id` | UUID | Versioned aggregation rule |
| `calculated_at` | timestamp | Required |

Treat the snapshot as derived data. Source feedback and evidence remain authoritative.

---

## 15 Recommended core relationship flow

```text
activity_templates
    -> activity_instances
        -> activity_participants
        -> activity_instance_vask_items
        -> activity_framework_targets
        -> activity_media
        -> activity_form_assignments
        -> feedback

forms
    -> form_questions
        -> questions
            -> questionnaire_constructs
            -> question_framework_mappings

feedback
    -> feedback_evidence
    -> feedback_skill_observations
        -> framework_skills
        -> framework_steps

frameworks
    -> framework_skills (8)
        -> framework_steps (16 per skill)
```

## 15A Student achievements Proud Moments and human review

### `student_external_achievements`

Student-uploaded certificates and external achievements are separate from school-owned activities. They use the external-achievement VASK form and do not receive an official framework-skill mapping by default.

Required fields include the issuer, date, category, level or grade, result type, certificate media, selected VASK items, submission status, publication status, and reviewer. Store the level and result separately. An attendance certificate, Grade 1 first runner-up, and Grade 8 first runner-up must not be treated as equivalent evidence.

### `proud_moment_selections`

A Proud Moment links one student to an activity, external achievement, or evidence item and records why the student selected it. This is a student-expression and presentation record. It does not set a 1–16 framework step.

Internal moderation may prevent publication when context, consent, or evidence is insufficient. Keep the moderation rationale in restricted review metadata and show only a neutral review or publication state on student-facing screens.

### Activity form package and question blocks

Every school-owned activity references one immutable form version. A form version contains question blocks. For the proof of concept:

- use the BHSS dummy questions as the default question source;
- associate each block or question with approved VASK items;
- add only enough questions to improve uncovered VASK areas;
- allow one question to map to one or more of the eight framework skills; and
- keep any observable 1–16 step range as candidate evidence, not an awarded step.

### Submission review and publication states

Questionnaire responses, student reflection, and `回顧與展望` share response states: `not_submitted`, `draft`, `submitted`, `in_review`, `changes_requested`, `approved`, and `rejected`. Publication is separate: `unpublished`, `published`, or `withdrawn`.

### Teacher and teaching-assistant initial ratings

`teacher_skill_initial_ratings` records the activity, student, framework skill, proposed step, source instrument or authority, rater, evidence summary, and confirmation status. When an activity is intended to contribute to the published 1–16 skill state, the current scope requires a confirmed rating from the assigned teacher or teaching assistant.

If the human rating is missing, keep the value missing. Do not convert it to zero and do not let self-review, peer review, or AI inference set the published step. Those responses remain visible as unconfirmed evidence.

### `peer_review_assignments`

Peer review requires an explicit assignment containing the subject student, peer reviewer, assigning teacher or teaching assistant, activity, form version, due date, status, and moderation requirement. The school still needs to choose the assignment policy.

## 16 Minimum viable implementation

The first database release does not need every optional table. A workable minimum is:

1. `users`
2. `roles`
3. `user_roles`
4. `groups`
5. `group_memberships`
6. `activity_templates`
7. `activity_instances`
8. `activity_participants`
9. `frameworks`
10. `framework_skills`
11. `framework_steps`
12. `forms`
13. `questions`
14. `form_questions`
15. `activity_form_assignments`
16. `form_assignment_recipients`
17. `form_submissions`
18. `question_responses`
19. `feedback`
20. `feedback_evidence`
21. `feedback_skill_observations`
22. `questionnaire_constructs`
23. `question_framework_mappings`

Add media processing, shared collections, detailed access grants, VASK tables, cached radar snapshots, and advanced audit data as the corresponding product features are implemented.

## 17 Decisions that should remain configurable

- Whether teachers can change activity-template VASK defaults or only activity-instance copies.
- Whether a submitted framework-stage observation can be edited or must be superseded by a new revision.
- Which questionnaire questions have direct versus supporting mappings to the eight framework axes.
- How multiple observations become one reporting-period radar value.
- Who can view teacher comments, peer reviews, student reflections, and attached media.
- How long login, audit, media-extraction, and assessment data are retained.

These decisions should not be hidden inside JSON or application code. Store them in versioned configuration or explicit policy tables when the product requirements are finalised.

---

# Aspects updated 中文版

## 文件目的

本部分是獨立的繁體中文版，方便直接與原始 `Aspects`、廣東話版技能框架及技能問卷比較用詞。它不是上方英文內容的逐句夾註。

整個資料模型分為四層：

1. **活動設計**：記錄活動希望培養甚麼，包括 VASK 和預期觀察的框架能力。
2. **框架標準**：記錄八項能力，以及每項能力的 16 個發展階段。
3. **評估工具**：記錄問卷、題目、量尺，以及題目與能力的對應關係。
4. **觀察結果**：記錄教師實際看到的行為、選定的階段、出現頻率和文字證據。

## 命名方式

### 修改前

- 資料表名稱混合單數和複數，例如 `Activities`、`Media`、`Form`、`FormQuestions`、`User`。
- 欄位名稱混合不同寫法，例如 `activityId`、`upload/updateBy`、`accessBy`。
- `activityVASK`、`mediaList` 等欄位會把多項資料放進同一欄。
- `respondantId` 拼寫錯誤，正確英文是 `respondent_id`。

### 修改後

- 資料表統一使用複數 snake_case，例如 `activity_instances`、`media_assets`。
- 欄位統一使用單數 snake_case，例如 `activity_instance_id`。
- 主鍵及外鍵才使用 `_id`。
- 時間欄位統一使用 `created_at`、`updated_at`、`starts_at`、`ends_at`。
- 多對多關係使用中介表，不在單一欄位儲存陣列。
- 已提交的評估保留當時使用的版本，不會因日後修改範本而改變。

## 必須分開的兩套能力分類

### 技能建構通用框架的八項能力

這八項能力是雷達圖的八條軸。每項能力均有 16 個階段。

| 排序 | 代碼 | 中文名稱 | 英文名稱 |
|---:|---|---|---|
| 1 | `listening` | 聆聽 | Listening |
| 2 | `speaking` | 說話 | Speaking |
| 3 | `problem_solving` | 解難 | Problem-solving |
| 4 | `creativity` | 創意 | Creativity |
| 5 | `adaptability` | 適應力 | Adaptability |
| 6 | `planning` | 計劃能力 | Planning |
| 7 | `leadership` | 領導力 | Leadership |
| 8 | `teamwork` | 團隊協作 | Teamwork |

### 技能問卷的十項評估構念

問卷中的十項技能不等於雷達圖的八項能力。

| 代碼 | 中文名稱 | 題目數量 | 與八項框架的關係 |
|---|---|---:|---|
| `adaptability` | 適應能力 | 12 | 可直接對應「適應力」 |
| `collaboration` | 合作能力 | 18 | 可直接對應「團隊協作」 |
| `communication` | 溝通能力 | 16 | 題目可分別對應「聆聽」、「說話」或兩者 |
| `creativity` | 創造力 | 18 | 可直接對應「創意」 |
| `critical_thinking` | 批判思維能力 | 18 | 輔助構念；個別題目可支援聆聽或解難 |
| `curiosity` | 探究能力／好奇心 | 18 | 輔助構念；個別題目可支援創意或解難 |
| `growth_mindset` | 成長型思維 | 12 | 輔助構念；個別題目可支援適應力或計劃能力 |
| `leadership` | 領導力 | 22 | 可直接對應「領導力」 |
| `perseverance` | 堅毅 | 14 | 輔助構念；個別題目可支援適應力或計劃能力 |
| `problem_solving` | 問題解決能力 | 18 | 可直接對應「解難」 |

因此，不應再用一個含糊的 `skill` 欄位同時代表兩套分類。問卷構念和框架能力應分開儲存，再按每條題目建立清晰的對應關係。

---

## 一 活動

### 修改前

```text
Activities
    activityId
    activityVASK
    activityType
    date (by School year)
    uploadDate
    upload/updateBy
    updateDate
```

### 問題

- 活動範本和實際舉行的一次活動混在一起。
- 一個 `date` 無法表示課堂、旅行或為期兩週的項目。
- `activityVASK` 無法清楚儲存多個 VASK 項目。
- 建立者和最後更新者混在同一欄位。

### 修改後

#### `activity_templates` 活動範本

儲存可重複使用的活動設計。

| 欄位 | 中文意思 |
|---|---|
| `activity_template_id` | 活動範本主鍵 |
| `name_zh` | 中文名稱 |
| `name_en` | 英文名稱，可留空 |
| `description` | 活動說明 |
| `activity_type_id` | 活動類型 |
| `default_duration_minutes` | 預設時長 |
| `status` | 草稿、啟用或封存 |
| `version_number` | 範本版本 |
| `created_by_user_id` | 建立者 |
| `created_at` | 建立時間 |
| `updated_by_user_id` | 最後更新者 |
| `updated_at` | 最後更新時間 |

#### `activity_instances` 活動實例

代表某班學生實際參與的一次活動。

| 欄位 | 中文意思 |
|---|---|
| `activity_instance_id` | 活動實例主鍵 |
| `activity_template_id` | 所使用的活動範本，可留空 |
| `template_version_number` | 當時使用的範本版本 |
| `title` | 本次活動名稱 |
| `activity_type_id` | 活動類型 |
| `academic_period_id` | 學年或學期 |
| `group_id` | 班別、隊伍或項目小組 |
| `starts_at` | 開始時間 |
| `ends_at` | 結束時間 |
| `lead_teacher_user_id` | 主責教師 |
| `status` | 已計劃、進行中、已完成或已取消 |

---

## 二 活動參加者和教師

### 修改前

```text
ActivityData
    Activity.activityId
    mediaList (formId, mediaId)
    teacherId (single or array)
    studentId (single or array)
```

### 問題

- `ActivityData` 沒有代表一個清楚的實體。
- 教師和學生不應以陣列方式放進一個欄位。
- 表格和媒體是不同資料，不應放在同一個 `mediaList`。

### 修改後

#### `activity_participants` 活動參加者

| 欄位 | 中文意思 |
|---|---|
| `activity_participant_id` | 主鍵 |
| `activity_instance_id` | 活動實例 |
| `user_id` | 參加者 |
| `participant_role` | 學生、同儕評估者、觀察者或訪客 |
| `participation_status` | 已邀請、已出席、缺席或退出 |

#### `activity_staff` 活動工作人員

| 欄位 | 中文意思 |
|---|---|
| `activity_staff_id` | 主鍵 |
| `activity_instance_id` | 活動實例 |
| `user_id` | 教師或行政人員 |
| `staff_role` | 主責教師、教師、觀察者或批核者 |

---

## 三 媒體檔案

### 修改前

```text
Media
    mediaId
    Activities.activityId
    mediaType
    path
    uploadDate
    uploadedBy
```

### 修改後

#### `media_assets` 媒體資產

| 欄位 | 中文意思 |
|---|---|
| `media_asset_id` | 主鍵 |
| `owner_user_id` | 原始擁有人 |
| `uploaded_by_user_id` | 上載者 |
| `file_name` | 原始檔案名稱 |
| `display_name` | 顯示名稱 |
| `media_type` | 圖片、影片、聲音、文件或其他 |
| `mime_type` | 真實檔案格式 |
| `storage_provider` | 儲存服務 |
| `storage_key` | 儲存位置識別碼 |
| `file_size_bytes` | 檔案大小 |
| `checksum_sha256` | 完整性檢查值 |
| `visibility` | 私人、活動教師、活動參加者或全校 |
| `moderation_status` | 待批核、已批核或已拒絕 |
| `created_at` | 上載時間 |
| `updated_at` | 更新時間 |

#### `activity_media` 活動媒體連結

用來連接媒體和活動。`relationship_type` 可分為活動指示、學生證據、教師證據或活動成果。

學生上載的內容預設為私人及待批核，教師批核後才可進入活動共用媒體區。

---

## 四 媒體存取權限

### 修改前

`MediaInfo` 重複儲存更新日期和上載者，`accessBy` 又把教師、班別和教師小組混在一個欄位。

### 修改後

核心資料留在 `media_assets`。只有需要額外權限時，才使用 `media_access_grants`：

| 欄位 | 中文意思 |
|---|---|
| `media_access_grant_id` | 主鍵 |
| `media_asset_id` | 媒體資產 |
| `grantee_type` | 使用者、小組或角色 |
| `grantee_id` | 被授權對象 |
| `permission` | 檢視、評論或管理 |
| `granted_by_user_id` | 授權者 |
| `expires_at` | 權限到期時間，可留空 |

---

## 五 媒體文字擷取

### 修改前

`mediaText` 和 `extract` 意思重疊，也沒有處理狀態、語言、工具版本或錯誤記錄。

### 修改後

#### `media_extractions` 媒體擷取結果

| 欄位 | 中文意思 |
|---|---|
| `media_extraction_id` | 主鍵 |
| `media_asset_id` | 原始媒體 |
| `extraction_type` | OCR、轉錄、摘要、標籤或其他 |
| `content_text` | 純文字結果 |
| `content_json` | 時間碼、區域或結構化結果 |
| `language_code` | 語言，例如 `zh-Hant` |
| `source_type` | 系統、教師、學生或匯入 |
| `processor_name` | 處理工具或模型名稱 |
| `processor_version` | 工具或模型版本 |
| `confidence_score` | 工具提供的可信度 |
| `status` | 排隊中、處理中、完成、失敗或已審閱 |
| `error_message` | 錯誤資料 |

---

## 六 共用媒體資料夾

### 修改前

原始文件只留下 `(SharedMediaFolder)`，沒有欄位。

### 修改後

使用 `media_collections` 儲存資料夾資料，並使用 `media_collection_items` 連接多個媒體檔案。

`media_collections` 包括名稱、說明、擁有人、相關活動、可見範圍、建立及更新時間。

`media_collection_items` 包括資料夾、媒體檔案、顯示次序、加入者和加入時間。

---

## 七 表格

### 修改前

```text
Form
    activityId
    formId
    formQuestionId(array)
    uploaded/updatedBy
    teacherId(array for access)
    formType
    respondantId
    peerId
```

### 問題

- 表格定義、活動分派、填寫者、檢視者和答案混在一起。
- 題目陣列不能妥善處理題目次序和版本。
- `isPeerReview`、`isTeacherReview` 等布林值可能同時衝突。

### 修改後

#### `forms` 表格範本

代表一份可重用表格的固定身份，包括名稱、說明、表格類型、建立者和時間。版本內容和批核狀態另存在 `form_versions`。

表格類型建議使用：

- `teacher_observation` 教師觀察
- `teacher_review` 教師評估
- `peer_review` 同儕互評
- `student_reflection` 學生反思
- `activity_rewind` 活動回顧

#### `form_versions` 表格版本

每次修改已批核或已發布的表格，都建立新草稿版本，不直接改動舊版本。

- `review_status`：`draft`、`in_review`、`changes_requested`、`approved`、`rejected`、`retired`。
- `publication_status`：`unpublished`、`published`、`withdrawn`。
- `visibility_scope`：`private_draft`、`reviewers_only`、`school_catalogue`、`assigned_activities_only`、`public_external`。
- `valid_from` 和 `valid_until`：控制可分派日期。
- `supersedes_form_version_id`：指出新版本取代哪一個舊版本。

只有「已批核＋已發布＋仍在有效期」的版本才可建立新的活動表格分派。`public_external` 不屬於第一階段，必須另訂校方政策。

#### `form_review_events` 表格審閱紀錄

每次提交審閱、要求修改、批核、拒絕、發布、撤回、退役或建立修訂版本，都保存成不可覆寫的事件，並記錄執行者、時間和理由。

#### `form_review_assignments` 表格審閱分派

把一個不可變的表格版本分派給一名具備相應角色及範圍權限的審閱者。角色表決定誰有資格審閱；本表記錄實際由誰負責、由誰分派、期限、接受時間及完成結果。

狀態包括：`assigned`、`accepted`、`in_review`、`changes_requested`、`approved`、`rejected`、`cancelled`、`expired`。預設不允許表格版本作者批核自己的版本。

#### `form_questions` 表格題目次序

連接一個指定 `form_version_id` 和題庫題目，記錄顯示次序、是否必答和所屬部分。

#### `activity_form_assignments` 活動表格分派

記錄哪一次活動使用哪一個已批核及已發布的表格版本、由誰分派、開放時間、截止時間、分派狀態及有效性檢查結果。

「內容已批核」、「版本已發布」、「版本的可見範圍」和「已分派給活動」是四個不同概念，不能只用一個 `status` 欄位表示。

#### `form_assignment_recipients` 填寫及評核關係

分開記錄：

- `respondent_user_id`：實際填表者。
- `subject_user_id`：被評估的學生。
- `reviewer_user_id`：只有檢視或審閱權限的人。

#### `form_submissions` 表格提交

記錄草稿、已提交、已鎖定或退回狀態，以及提交時間。

---

## 八 題目和六分量尺

### 修改前

```text
FormQuestions
    questionId
    questionIndex
    questionText
    questionType
    skill (ch/en)
    negativeQuestion
```

### 修改後

#### `questions` 題庫

主要欄位包括：

- `question_code`：穩定的題目代碼。
- `question_text_zh`：中文題目。
- `question_text_en`：英文題目。
- `question_type`：單選、多選、量尺、短答、長答或下拉選單。
- `response_scale_id`：所使用的量尺。
- `questionnaire_construct_id`：主要問卷構念。
- `construct_subcategory_id`：問卷內的「範疇」。
- `is_negatively_worded`：是否負向表述。
- `requires_reverse_scoring`：計算分數時是否需要反向計分。

題目次序改由 `form_questions.display_order` 管理。

#### `response_scales` 和 `response_scale_options`

來源檔案包含兩種六分量尺：

| 量尺 | 1 | 2 | 3 | 4 | 5 | 6 |
|---|---|---|---|---|---|---|
| 頻率／效果 | 幾乎從不 | 很少 | 偶爾 | 經常 | 通常 | 幾乎總是 |
| 同意程度 | 非常不同意 | 不同意 | 略為不同意 | 略為同意 | 同意 | 非常同意 |

#### `question_framework_mappings` 題目與八項能力對應

每條題目可設定：

- 主要對應能力。
- 輔助對應能力。
- 對應理由。
- 批核者和批核日期。
- 經驗證後才使用的權重。

不要只因為一條題目看似同時涉及多項能力，就立即加入複雜權重。第一版最好為每條題目設定一項主要能力，必要時才加入輔助能力。

#### `question_responses` 題目答案

分別儲存原始答案、文字答案、選項答案及反向計分後的數值，避免覆蓋原始輸入。

---

## 九 八項框架能力和 16 個階段

### 修改前

原始資料模型沒有框架、八項能力或 16 個階段的獨立資料表。

### 修改後

#### `frameworks` 框架版本

儲存框架代碼、名稱、版本、語言和狀態，例如：

```text
code: skills_builder_uf_2_0_zh_hant
version: 2.0
language_code: zh-Hant
```

#### `framework_skills` 八項能力

每項記錄包括：

- `code`
- `name_zh`
- `name_en`
- `description_zh`
- `display_order`

#### `framework_steps` 發展階段

每個階段包括：

- `framework_skill_id`：所屬能力。
- `step_number`：1 至 16。
- `step_title_zh`：例如「質疑」。
- `descriptor_zh`：完整的「我能……」句子。
- `development_band`：入門、初階、高階或精通。

每項能力的 `step_number` 不可重複。

| 階段 | 分層代碼 | 中文名稱 |
|---:|---|---|
| 1–4 | `entry` | 入門 |
| 5–8 | `intermediate` | 初階 |
| 9–12 | `advanced` | 高階 |
| 13–16 | `mastery` | 精通 |

教師在評估時只選擇階段，不應直接修改標準句子。若需要修訂翻譯，應新增框架版本。

#### `activity_framework_targets` 活動能力目標

記錄某次活動希望學生練習哪些能力、預期階段、優先程度，以及該能力是否會被正式評估。

---

## 十 教師回饋和能力觀察

### 修改前

教師回饋只被視為一種特殊表格，沒有獨立的觀察事件、證據、階段選擇或出現頻率。

### 修改後

#### `feedback` 回饋主記錄

一筆回饋代表某人在一個時間點，對一名學生作出的一次回饋。

| 欄位 | 中文意思 |
|---|---|
| `feedback_id` | 回饋主鍵 |
| `activity_instance_id` | 相關活動，可留空 |
| `subject_user_id` | 被評估學生 |
| `author_user_id` | 撰寫者 |
| `feedback_type` | 教師觀察、教師評估、同儕互評、學生反思或系統匯入 |
| `overall_comment` | 整體文字回饋 |
| `observed_at` | 行為發生時間 |
| `status` | 草稿、已提交、已審閱或作廢 |
| `visibility` | 可見範圍 |

原先構想的 `feedback_list` 應改為 `feedback`。所謂「列表」只是介面顯示或資料查詢，不是另一個資料實體。

#### `feedback_evidence` 觀察證據

可儲存：

- 具體行為文字。
- 相片、影片、聲音或文件。
- 表格答案。
- 學生作品。

#### `feedback_skill_observations` 能力觀察

每項能力觀察分開記錄：

- 八項能力中的哪一項。
- 教師選擇的 1 至 16 階段。
- 1 至 6 的出現頻率或效果。
- 教師對這項能力的文字評語。
- 建議的下一階段。
- 可選的判斷信心。

階段和頻率不可合併：

```text
觀察階段：第 9 階段
出現頻率：4/6 經常
```

這代表學生曾展示第 9 階段的行為，而且在觀察期內「經常」出現。它不是 9 加 4，也不應被換算成一個沒有清楚意義的總分。

---

## 十一 VASK 活動設定

### 修改前

只有一個未定義的 `activityVASK` 欄位。

### 修改後

#### `vask_items` VASK 項目

每項資料包括：

- 類別：價值、態度、技能或知識。
- 中文名稱。
- 英文名稱，可留空。
- 狀態。
- 用詞版本。

#### `activity_template_vask_items` 活動範本的預設 VASK

由教師或行政人員為活動範本設定預設 VASK。

#### `activity_instance_vask_items` 某次活動實際使用的 VASK

當教師開立一次活動時，系統複製範本的預設 VASK。教師可增加、刪除或調整本次活動的設定，但不會改動過去或其他活動。

`source` 可記錄該項目來自：

- `template_default` 範本預設。
- `teacher_added` 教師新增。
- `teacher_modified` 教師修改。

---

## 十二 使用者、角色和班別

### 修改前

```text
User
    userId
    userType(stud, teacher, Admin)
    enabled
    classId
    classNo
```

### 問題

- 一個人可能同時有多個角色。
- 班別會隨學年改變，不應直接寫在使用者主記錄。
- `classNo` 屬於班別成員資料。

### 修改後

#### `users` 使用者

儲存使用者主鍵、外部系統識別碼、顯示名稱、電郵、狀態和時間資料。

#### `roles` 和 `user_roles`

角色包括學生、教師、行政人員和家長。`user_roles` 讓一個使用者在不同學校或時段擁有不同角色。

#### `groups` 和 `group_memberships`

`groups` 可代表班別、隊伍、教師小組或項目小組。

`group_memberships` 儲存使用者、小組、成員角色、班號、開始日期和結束日期，保留歷史班別資料。

---

## 十三 登入記錄和操作記錄

### 修改前

原始文件未定義，但系統需要這兩類記錄。

### 修改後

#### `login_events` 登入事件

記錄使用者、時間、成功或失敗結果、驗證方式、IP 地址和瀏覽器資料。應制定私隱和保存期限政策。

#### `audit_events` 系統操作記錄

記錄：

- 哪一位使用者或系統執行操作。
- 操作代碼，例如 `feedback.submitted`。
- 受影響的資料類型和記錄主鍵。
- 發生時間。
- 必要而不過量的修改摘要。

---

## 十四 雷達圖資料

### 修改前

未定義雷達圖數據來源。

### 修改後

雷達圖的八個值應由 `feedback_skill_observations` 推算，不應只儲存八個可以任意修改的分數。

每個顯示值應可追溯至：

- 框架能力。
- 目前有證據支持的階段。
- 觀察日期。
- 來源回饋。
- 證據數量。
- 使用的計算規則版本。

未觀察的能力應顯示「未有證據」，不應當作第 0 階段。

若效能需要快取，可加入 `student_skill_snapshots`，但它只是衍生結果，不能取代教師回饋和證據。

---

## 十五 建議的資料關係

```text
活動範本
    -> 活動實例
        -> 活動參加者
        -> 實際 VASK 設定
        -> 活動能力目標
        -> 活動媒體
        -> 表格分派
        -> 教師或學生回饋

表格
    -> 表格題目
        -> 題庫
            -> 問卷構念
            -> 八項能力對應

回饋
    -> 觀察證據
    -> 能力觀察
        -> 八項框架能力
        -> 16 個發展階段

框架版本
    -> 八項能力
        -> 每項 16 個階段
```

## 十六 最小可行版本

第一階段建議先建立：

1. 使用者、角色、小組和成員關係。
2. 活動範本、活動實例和參加者。
3. 框架、八項能力和 128 個階段記錄。
4. 表格、題庫、表格題目和六分量尺。
5. 表格分派、填寫者、提交和題目答案。
6. 回饋、觀察證據和能力觀察。
7. 十項問卷構念和題目與八項能力的對應。

媒體自動擷取、共用資料夾、詳細權限、VASK、雷達圖快取和進階審計記錄可按產品開發次序加入。

## 十七 需要產品團隊決定的設定

- 教師可否修改活動範本的 VASK，還是只能修改某次活動的副本。
- 已提交的階段觀察可否直接修改，還是必須建立修訂版本。
- 哪些問卷題目直接或輔助對應八項框架能力。
- 多次觀察如何計算成一個學期的雷達圖階段。
- 教師評語、同儕互評、學生反思和媒體分別由誰查看。
- 登入、操作、媒體擷取及評估資料的保存期限。
