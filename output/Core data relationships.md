# Core data relationships

## Scope

This document describes the core operational data model before analytics, aggregation, radar-chart snapshots, recommendations, or progress calculations are introduced.

`Design ideas.docx` remains the original design source. `output/Questions.docx` is a later discovery document containing proposed workflows, implementation questions, and unconfirmed values. Items from the latter are labelled below rather than treated automatically as approved requirements.

The model preserves the original source of proof:

- what activity took place;
- who participated;
- which VASK items and framework skills the activity intended to develop;
- which assessment instrument was assigned;
- who completed it and about whom;
- what answers were submitted;
- what behaviour was observed;
- which framework step the evidence supports; and
- who created, reviewed, or approved each record.

It also separates student-selected meaning from formal skill progression. A certificate, external achievement, or Proud Moment may be valuable evidence of identity, values, attitudes, skills, or knowledge without having an official Skills Builder mapping or changing a 1–16 step.

## Revised rules from the RC360 discussion image

### Student-owned external achievements

A student may upload an external certificate or achievement, such as a piano competition result. Store it as `student_external_achievements`, not as an ordinary school-owned activity instance unless the school later adopts it as one.

Each external achievement must preserve:

- issuer, date, category, grade or difficulty, and result type;
- the original certificate or supporting media;
- a completed external-achievement form;
- student-selected VASK items;
- submission, review, and publication status; and
- the assigned teacher or teaching assistant review where publication is requested.

The default `official_skill_mapping_status` is `none`. A piano Grade 1 first runner-up, a piano Grade 8 first runner-up, and an attendance certificate are not equivalent. The result label must never be used alone to infer a framework step.

### Proud Moments and meaningful events

`proud_moment_selections` records a student's choice of an activity, external achievement, or evidence item that best represents the student. This selection is a presentation and reflection decision. It is not a skill-step award.

The internal model may allow an authorized reviewer to exclude or withhold an item from publication when it lacks sufficient context, consent, or evidence quality. Student-facing presentation must describe publication or review status neutrally and must not expose internal exclusion heuristics.

### Activity form package

Every school-owned activity must be packaged with one immutable form version. The form contains one or more question blocks. Each question block may:

- target one or more approved VASK items;
- contain the BHSS dummy questions by default;
- add a small number of questions to improve VASK coverage for the proof of concept;
- map individual questions to one or more of the eight framework skills; and
- optionally define the 1–16 step range that an answer may provide evidence about.

An activity does not receive a framework step merely because its form has a mapping. The mapping identifies candidate evidence. A teacher or assigned teaching assistant remains the human reviewer.

### Shared submission and publication workflow

Questionnaire submissions, student reflection, and term `回顧與展望` use the same lifecycle:

```text
not_submitted -> draft -> submitted -> in_review
    -> changes_requested -> submitted
    -> approved -> published
    -> rejected
published -> withdrawn
```

The content version lifecycle remains separate from the response lifecycle. A published form template can still have an individual student submission that is not submitted, under review, or unpublished.

### HKEAA input and the human review gate

The RC360 image states that the Skills component is partially assessed or validated with HKEAA involvement, while teachers perform final review and confirmation. The current scope therefore requires:

1. an initial teacher or teaching-assistant rating for each activity, student, and skill that is intended to contribute to a 1–16 step;
2. the source instrument or authority, such as `HKEAA-10-SKILLS`, recorded with that rating;
3. linked behavioural evidence and the relevant form submission;
4. teacher or teaching-assistant confirmation before the activity affects the published skill state; and
5. a missing-rating state rather than a calculated zero.

If the required human rating is missing, student self-review and peer review remain visible as unconfirmed evidence. They do not independently set the published 1–16 step. This prevents the AI layer or a respondent from becoming the final assessor by default.

### Peer-review assignment

Peer review is not automatically available to every participant. `peer_review_assignments` records the subject student, named peer reviewer, assigning teacher or teaching assistant, due date, form version, status, and whether moderation is required. The policy for how teachers choose peers remains an open school decision.

## Operational requirements identified in Questions docx

The following additions are needed because `output/Questions.docx` goes beyond the original design concept and describes day-to-day operation.

### Confirmed structural needs

- Keep the source system on every imported record so Time Infinity, school-based activities, academic results, and manual entries remain distinguishable.
- Keep attendance or participation state separate from assessment completion.
- Give each activity configurable student-access opening, closing, and due times. The suggested event-day 3 p.m. release is a policy value, not a hard-coded rule.
- Record who reviewed and corrected OCR or transcription output before it can be cited as evidence.
- Publish a versioned portfolio snapshot rather than rebuilding an official output from mutable live data.
- Generate controlled export packages for an external recipient without making that recipient a platform user in the MVP.

### Proposed policies requiring school confirmation

- File size and MIME-type rules belong in configurable upload policy. The suggested 5 MB image limit and JPEG/PNG list are not yet confirmed.
- Student, teacher, and staff upload permissions must be configurable by evidence type. “Student can upload certificates only” is not assumed globally.
- A maximum number of Proud Moments belongs in portfolio policy. The suggested maximum of 24 is not hard-coded.
- Insufficient evidence must produce `not_enough_evidence`, not a low or zero skill result. The school must decide whether the first portfolio is published only after the first term.
- An external or professional assessment can be recorded as another rated source. It cannot silently override the school decision until the authority, scope, and appeal policy are confirmed.
- Automated reminders and an exact student-unlock schedule are workflow enhancements, not prerequisites for storing valid evidence.

## Cardinality legend

| Mermaid symbol | Meaning |
|---|---|
| `||--||` | Exactly one to exactly one |
| `||--o|` | One to zero or one |
| `||--o{` | One to zero or many |
| `||--|{` | One to one or many |
| `o{--o{` | Many to many conceptually; implement through a junction table |

In the diagrams below, many-to-many relationships are made explicit using junction entities.

## Complete core relationship overview

```mermaid
flowchart LR
    subgraph Identity[Identity and school structure]
        U[Users]
        UR[User roles]
        R[Roles]
        GM[Group memberships]
        G[Groups]
        AP[Academic periods]
    end

    subgraph Activity[Activity context]
        AT[Activity templates]
        AI[Activity instances]
        ATP[Activity participants]
        ATS[Activity staff]
        AV[Activity VASK items]
        AFT[Activity framework targets]
    end

    subgraph Reference[Learning reference data]
        VI[VASK items]
        FW[Frameworks]
        FS[Framework skills]
        FST[Framework steps]
        QC[Questionnaire constructs]
    end

    subgraph Instrument[Assessment instrument]
        IN[Assessment instruments]
        II[Instrument items]
        Q[Questions]
        RS[Response scales]
        RSO[Response scale options]
        QCM[Question construct mappings]
        QFM[Question framework mappings]
    end

    subgraph Workflow[Assignment and submission]
        AA[Assessment assignments]
        AR[Assignment recipients]
        SUB[Assessment submissions]
        RESP[Question responses]
    end

    subgraph Proof[Feedback and source of proof]
        FB[Feedback]
        EVO[Feedback evidence]
        OBS[Framework observations]
        OE[Observation evidence links]
        MA[Media assets]
    end

    subgraph Delivery[Import portfolio and delivery]
        SS[Source systems]
        IB[Import batches]
        IR[Import records]
        PS[Portfolio snapshots]
        PI[Portfolio items]
        EP[Export packages]
    end

    U --> UR --> R
    U --> GM --> G
    AP --> G

    AT --> AI
    AP --> AI
    G --> AI
    AI --> ATP
    AI --> ATS
    U --> ATP
    U --> ATS

    AI --> AV --> VI
    AI --> AFT --> FS
    AFT -. optional target .-> FST

    FW --> FS --> FST
    QC --> QCM --> Q
    Q --> QFM --> FS
    QFM -. optional step anchor .-> FST

    IN --> II --> Q
    Q --> RS --> RSO
    AI --> AA
    IN --> AA
    AA --> AR
    U --> AR
    AR --> SUB --> RESP
    Q --> RESP

    AI --> FB
    U --> FB
    SUB --> FB
    FB --> EVO
    FB --> OBS
    FS --> OBS
    FST --> OBS
    OBS --> OE --> EVO
    EVO -. optional media proof .-> MA

    SS --> IB --> IR
    U --> IB
    U --> PS
    AP --> PS
    PS --> PI
    PS --> EP
    U --> EP
```

The arrows in this overview show direction of reference and workflow. The ER diagrams below show exact cardinalities.

---

## 1 Identity and school structure

```mermaid
erDiagram
    USERS ||--o{ USER_ROLES : receives
    ROLES ||--o{ USER_ROLES : classifies
    SCHOOLS ||--o{ USER_ROLES : scopes

    SCHOOLS ||--o{ GROUPS : contains
    ACADEMIC_PERIODS ||--o{ GROUPS : organises
    USERS ||--o{ GROUP_MEMBERSHIPS : joins
    GROUPS ||--o{ GROUP_MEMBERSHIPS : contains

    USERS {
        uuid user_id PK
        string external_user_id
        string display_name
        string email
        string status
        datetime created_at
        datetime updated_at
    }

    ROLES {
        uuid role_id PK
        string code UK
        string name
    }

    USER_ROLES {
        uuid user_role_id PK
        uuid user_id FK
        uuid role_id FK
        uuid school_id FK
        datetime starts_at
        datetime ends_at
    }

    SCHOOLS {
        uuid school_id PK
        string name
        string status
    }

    ACADEMIC_PERIODS {
        uuid academic_period_id PK
        uuid school_id FK
        string name
        date starts_on
        date ends_on
    }

    GROUPS {
        uuid group_id PK
        uuid school_id FK
        uuid academic_period_id FK
        string group_type
        string name
    }

    GROUP_MEMBERSHIPS {
        uuid group_membership_id PK
        uuid group_id FK
        uuid user_id FK
        string membership_role
        string class_number
        datetime starts_at
        datetime ends_at
    }
```

### Key relationships

| Relationship | Type | Explanation |
|---|---|---|
| Users to roles | Many-to-many | One user may be a teacher and administrator; one role belongs to many users. `user_roles` resolves the relationship. |
| Users to groups | Many-to-many | A student can join different classes or project groups over time. `group_memberships` preserves this history. |
| Academic period to groups | One-to-many | One school year or term can contain many groups. |

---

## 2 Activities, participants, VASK, and framework targets

```mermaid
erDiagram
    ACTIVITY_TYPES ||--o{ ACTIVITY_TEMPLATES : classifies
    ACTIVITY_TEMPLATES ||--o{ ACTIVITY_INSTANCES : creates
    ACTIVITY_TYPES ||--o{ ACTIVITY_INSTANCES : classifies
    ACADEMIC_PERIODS ||--o{ ACTIVITY_INSTANCES : schedules
    GROUPS ||--o{ ACTIVITY_INSTANCES : hosts
    USERS ||--o{ ACTIVITY_INSTANCES : leads

    ACTIVITY_INSTANCES ||--o{ ACTIVITY_PARTICIPANTS : includes
    USERS ||--o{ ACTIVITY_PARTICIPANTS : participates
    ACTIVITY_INSTANCES ||--o{ ACTIVITY_STAFF : assigns
    USERS ||--o{ ACTIVITY_STAFF : supports

    ACTIVITY_TEMPLATES ||--o{ ACTIVITY_TEMPLATE_VASK_ITEMS : defaults
    VASK_ITEMS ||--o{ ACTIVITY_TEMPLATE_VASK_ITEMS : selected_in

    ACTIVITY_INSTANCES ||--o{ ACTIVITY_INSTANCE_VASK_ITEMS : configures
    VASK_ITEMS ||--o{ ACTIVITY_INSTANCE_VASK_ITEMS : selected_in

    ACTIVITY_INSTANCES ||--o{ ACTIVITY_FRAMEWORK_TARGETS : targets
    FRAMEWORK_SKILLS ||--o{ ACTIVITY_FRAMEWORK_TARGETS : targeted_by
    FRAMEWORK_STEPS ||--o{ ACTIVITY_FRAMEWORK_TARGETS : expected_at

    ACTIVITY_TYPES {
        uuid activity_type_id PK
        string code UK
        string name
    }

    ACTIVITY_TEMPLATES {
        uuid activity_template_id PK
        uuid activity_type_id FK
        string name_zh
        string name_en
        string description
        int version_number
        string status
        uuid created_by_user_id FK
    }

    ACTIVITY_INSTANCES {
        uuid activity_instance_id PK
        uuid activity_template_id FK
        int template_version_number
        uuid activity_type_id FK
        uuid academic_period_id FK
        uuid group_id FK
        uuid lead_teacher_user_id FK
        string title
        datetime starts_at
        datetime ends_at
        datetime student_access_opens_at
        datetime student_access_closes_at
        datetime response_due_at
        string status
    }

    ACTIVITY_PARTICIPANTS {
        uuid activity_participant_id PK
        uuid activity_instance_id FK
        uuid user_id FK
        string participant_role
        string participation_status
        string attendance_status
    }

    ACTIVITY_STAFF {
        uuid activity_staff_id PK
        uuid activity_instance_id FK
        uuid user_id FK
        string staff_role
    }

    VASK_ITEMS {
        uuid vask_item_id PK
        string category
        string name_zh
        string name_en
        int version_number
        string status
    }

    ACTIVITY_TEMPLATE_VASK_ITEMS {
        uuid activity_template_vask_item_id PK
        uuid activity_template_id FK
        uuid vask_item_id FK
        string priority
    }

    ACTIVITY_INSTANCE_VASK_ITEMS {
        uuid activity_instance_vask_item_id PK
        uuid activity_instance_id FK
        uuid vask_item_id FK
        int vask_item_version_number
        string priority
        string source
        uuid configured_by_user_id FK
    }

    ACTIVITY_FRAMEWORK_TARGETS {
        uuid activity_framework_target_id PK
        uuid activity_instance_id FK
        uuid framework_skill_id FK
        uuid target_step_id FK
        string priority
        boolean is_assessed
        uuid configured_by_user_id FK
    }
```

### Key relationships

| Relationship | Type | Explanation |
|---|---|---|
| Activity template to activity instance | One-to-many | A reusable activity can be run many times. Each actual run is a separate instance. |
| Activity instance to users | Many-to-many | An activity has many participants and a user can attend many activities. `activity_participants` resolves it. |
| Activity instance to staff | Many-to-many | An activity can have several teachers; a teacher can support many activities. `activity_staff` resolves it. |
| Activity template to VASK items | Many-to-many | A template can contain several default VASK items, and one VASK item can be used by many templates. |
| Activity instance to VASK items | Many-to-many | The actual VASK selection is copied and may be modified for a particular activity run. |
| Activity instance to framework skills | Many-to-many | An activity can target several framework skills. Each skill can be targeted by many activities. |
| Activity framework target to framework step | Many-to-zero-or-one | A target may name an exact expected step, or only name the skill. |

---

## 3 Framework reference data

```mermaid
erDiagram
    FRAMEWORKS ||--|{ FRAMEWORK_SKILLS : defines
    FRAMEWORK_SKILLS ||--|{ FRAMEWORK_STEPS : contains

    FRAMEWORKS {
        uuid framework_id PK
        string code UK
        string name
        string version
        string language_code
        string status
    }

    FRAMEWORK_SKILLS {
        uuid framework_skill_id PK
        uuid framework_id FK
        string code
        string name_zh
        string name_en
        string description_zh
        int display_order
    }

    FRAMEWORK_STEPS {
        uuid framework_step_id PK
        uuid framework_skill_id FK
        int step_number
        string step_title_zh
        string descriptor_zh
        string development_band
    }
```

### Constraints

- One framework version contains eight framework skills.
- One framework skill contains 16 framework steps.
- `framework_id + code` is unique in `framework_skills`.
- `framework_skill_id + step_number` is unique in `framework_steps`.
- A step always belongs to exactly one framework skill.
- A new translation or structural revision should create a new framework version instead of overwriting historical wording.

---

## 4 Assessment instruments, questions, constructs, and scales

```mermaid
erDiagram
    ASSESSMENT_INSTRUMENTS ||--|{ INSTRUMENT_ITEMS : contains
    QUESTIONS ||--o{ INSTRUMENT_ITEMS : reused_in

    RESPONSE_SCALES ||--|{ RESPONSE_SCALE_OPTIONS : contains
    RESPONSE_SCALES ||--o{ QUESTIONS : answers

    QUESTIONS ||--o{ QUESTION_CONSTRUCT_MAPPINGS : classified_by
    QUESTIONNAIRE_CONSTRUCTS ||--o{ QUESTION_CONSTRUCT_MAPPINGS : classifies

    QUESTIONS ||--o{ QUESTION_FRAMEWORK_MAPPINGS : indicates
    FRAMEWORK_SKILLS ||--o{ QUESTION_FRAMEWORK_MAPPINGS : indicated_by
    FRAMEWORK_STEPS ||--o{ QUESTION_FRAMEWORK_MAPPINGS : anchors

    ASSESSMENT_INSTRUMENTS {
        uuid assessment_instrument_id PK
        string name
        string description
        string instrument_type
        int version_number
        string status
        uuid created_by_user_id FK
        datetime created_at
        datetime updated_at
    }

    INSTRUMENT_ITEMS {
        uuid instrument_item_id PK
        uuid assessment_instrument_id FK
        uuid question_id FK
        int display_order
        boolean is_required
        string section_name
        json configuration_json
    }

    QUESTIONS {
        uuid question_id PK
        string question_code UK
        string question_text_zh
        string question_text_en
        string question_type
        uuid response_scale_id FK
        boolean is_negatively_worded
        boolean requires_reverse_scoring
        string status
    }

    QUESTIONNAIRE_CONSTRUCTS {
        uuid questionnaire_construct_id PK
        string code UK
        string name_zh
        string name_en
        string definition_zh
    }

    QUESTION_CONSTRUCT_MAPPINGS {
        uuid question_construct_mapping_id PK
        uuid question_id FK
        uuid questionnaire_construct_id FK
        string mapping_role
        string rationale
    }

    RESPONSE_SCALES {
        uuid response_scale_id PK
        string code UK
        string name_zh
        int minimum_value
        int maximum_value
    }

    RESPONSE_SCALE_OPTIONS {
        uuid response_scale_option_id PK
        uuid response_scale_id FK
        int numeric_value
        string label_zh
        int display_order
    }

    QUESTION_FRAMEWORK_MAPPINGS {
        uuid question_framework_mapping_id PK
        uuid question_id FK
        uuid framework_skill_id FK
        uuid framework_step_id FK
        string mapping_role
        decimal weight
        string mapping_rationale
        uuid approved_by_user_id FK
        datetime approved_at
    }
```

### Important distinctions

| Entity | What it represents |
|---|---|
| `assessment_instruments` | A reusable questionnaire, observation checklist, reflection, or review definition. |
| `questions` | Individual prompts in a reusable question bank. |
| `instrument_items` | The placement and order of a question in an instrument. |
| `questionnaire_constructs` | General qualities measured by groups of questions, such as communication confidence. |
| `response_scales` | How a question is answered, such as 1–6 frequency or agreement. |
| `question_framework_mappings` | Which framework abilities or optional exact steps a question may provide evidence about. |

### Many-to-many relationships

- One assessment instrument contains many questions, and one question may be reused in many instruments. `instrument_items` resolves this relationship.
- One question may relate to several constructs, and one construct contains many questions. `question_construct_mappings` resolves it.
- One question may indicate several framework skills, and one framework skill may be indicated by many questions. `question_framework_mappings` resolves it.

A question-to-framework mapping does not by itself award a framework step. It states where the answer may provide evidence. An exact `framework_step_id` is used only for a deliberately step-anchored question.

### Form version authority and publication

```mermaid
erDiagram
    ASSESSMENT_INSTRUMENTS ||--|{ INSTRUMENT_VERSIONS : versions
    INSTRUMENT_VERSIONS ||--o{ INSTRUMENT_REVIEW_ASSIGNMENTS : allocated_for_review
    USERS ||--o{ INSTRUMENT_REVIEW_ASSIGNMENTS : assigns
    USERS ||--o{ INSTRUMENT_REVIEW_ASSIGNMENTS : reviews
    INSTRUMENT_VERSIONS ||--o{ INSTRUMENT_REVIEW_EVENTS : reviewed_through
    USERS ||--o{ INSTRUMENT_REVIEW_EVENTS : acts
    INSTRUMENT_VERSIONS ||--o{ INSTRUMENT_ITEMS : contains
    INSTRUMENT_VERSIONS ||--o{ ASSESSMENT_ASSIGNMENTS : assigned_as

    INSTRUMENT_VERSIONS {
        uuid instrument_version_id PK
        uuid assessment_instrument_id FK
        int version_number
        uuid supersedes_version_id FK
        string review_status
        string publication_status
        string visibility_scope
        date valid_from
        date valid_until
        uuid created_by_user_id FK
        datetime created_at
    }

    INSTRUMENT_REVIEW_EVENTS {
        uuid instrument_review_event_id PK
        uuid instrument_version_id FK
        string event_type
        uuid actor_user_id FK
        string decision_comment
        datetime event_at
    }

    INSTRUMENT_REVIEW_ASSIGNMENTS {
        uuid instrument_review_assignment_id PK
        uuid instrument_version_id FK
        uuid assigned_by_user_id FK
        uuid reviewer_user_id FK
        string reviewer_role_required
        string assigned_scope
        datetime assigned_at
        datetime due_at
        string status
        datetime accepted_at
        datetime completed_at
        uuid completion_event_id FK
    }
```

These are separate controls:

1. `review_status` says whether the version's content is valid: `draft`, `in_review`, `changes_requested`, `approved`, `rejected`, or `retired`.
2. `publication_status` says whether the approved version is available for new use: `unpublished`, `published`, or `withdrawn`.
3. `visibility_scope` says who can discover it: `private_draft`, `reviewers_only`, `school_catalogue`, `assigned_activities_only`, or `public_external`.
4. An assignment points to one exact immutable version. It is allowed only when the version is approved, published, within its validity dates, and not retired.

Role membership grants authority to review. `instrument_review_assignments` allocates one review to one actual reviewer. `instrument_review_events` records the decision that resulted. These records must not be collapsed into a single status field.

Editing an approved or published version creates a successor draft. It never changes the questions or interpretation attached to historical assignments and submissions.

---

## 5 Assignment, submission, and responses

```mermaid
erDiagram
    ACTIVITY_INSTANCES ||--o{ ASSESSMENT_ASSIGNMENTS : includes
    INSTRUMENT_VERSIONS ||--o{ ASSESSMENT_ASSIGNMENTS : assigned_as
    USERS ||--o{ ASSESSMENT_ASSIGNMENTS : assigns

    ASSESSMENT_ASSIGNMENTS ||--|{ ASSIGNMENT_RECIPIENTS : sends_to
    USERS ||--o{ ASSIGNMENT_RECIPIENTS : responds
    USERS ||--o{ ASSIGNMENT_RECIPIENTS : is_subject
    USERS ||--o{ ASSIGNMENT_RECIPIENTS : reviews

    ASSIGNMENT_RECIPIENTS ||--o| ASSESSMENT_SUBMISSIONS : produces
    ASSESSMENT_SUBMISSIONS ||--o{ QUESTION_RESPONSES : contains
    QUESTIONS ||--o{ QUESTION_RESPONSES : answered_by
    RESPONSE_SCALE_OPTIONS ||--o{ QUESTION_RESPONSES : selected_in

    ASSESSMENT_ASSIGNMENTS {
        uuid assessment_assignment_id PK
        uuid activity_instance_id FK
        uuid instrument_version_id FK
        uuid assigned_by_user_id FK
        datetime assigned_at
        datetime opens_at
        datetime due_at
        string assignment_status
        string eligibility_check
    }

    ASSIGNMENT_RECIPIENTS {
        uuid assignment_recipient_id PK
        uuid assessment_assignment_id FK
        uuid respondent_user_id FK
        uuid subject_user_id FK
        uuid reviewer_user_id FK
        string status
    }

    ASSESSMENT_SUBMISSIONS {
        uuid assessment_submission_id PK
        uuid assignment_recipient_id FK
        string perspective
        string status
        datetime submitted_at
        datetime created_at
        datetime updated_at
    }

    QUESTION_RESPONSES {
        uuid question_response_id PK
        uuid assessment_submission_id FK
        uuid question_id FK
        decimal raw_numeric_value
        decimal scored_numeric_value
        string text_value
        uuid selected_option_id FK
        datetime created_at
        datetime updated_at
    }
```

### Perspective examples

`assessment_submissions.perspective` should identify the source of the judgement:

- `student_self_report`
- `teacher_observation`
- `peer_observation`
- `guardian_observation`

Student and teacher submissions remain separate records even when they use the same instrument and concern the same student.

### Key relationships

| Relationship | Type | Explanation |
|---|---|---|
| Activity instance to assessment assignments | One-to-many | One activity can assign several instruments. |
| Instrument version to assignments | One-to-many | The same approved, published version can be used in many activities. |
| Assignment to recipients | One-to-many | One assignment may be sent to an entire class. |
| Recipient to submission | One-to-zero-or-one | A recipient may not have submitted yet. |
| Submission to responses | One-to-many | One completed submission contains answers to many questions. |
| Question to responses | One-to-many | The same question is answered in many submissions. |

An assignment with an unapproved, unpublished, expired, withdrawn, or retired version must be stored as `blocked` or rejected before recipients are created.

---

## 6 Feedback, framework observations, and evidence

```mermaid
erDiagram
    ACTIVITY_INSTANCES ||--o{ FEEDBACK : contextualises
    USERS ||--o{ FEEDBACK : receives
    USERS ||--o{ FEEDBACK : authors
    ASSESSMENT_SUBMISSIONS ||--o| FEEDBACK : supports

    FEEDBACK ||--o{ FEEDBACK_EVIDENCE : contains
    FEEDBACK ||--o{ FRAMEWORK_OBSERVATIONS : records

    FRAMEWORK_SKILLS ||--o{ FRAMEWORK_OBSERVATIONS : observed_as
    FRAMEWORK_STEPS ||--o{ FRAMEWORK_OBSERVATIONS : demonstrated_at
    FRAMEWORK_STEPS ||--o{ FRAMEWORK_OBSERVATIONS : suggested_next

    FRAMEWORK_OBSERVATIONS ||--o{ OBSERVATION_EVIDENCE : supported_by
    FEEDBACK_EVIDENCE ||--o{ OBSERVATION_EVIDENCE : supports

    MEDIA_ASSETS ||--o{ FEEDBACK_EVIDENCE : attached_as
    ASSESSMENT_SUBMISSIONS ||--o{ FEEDBACK_EVIDENCE : cited_as

    FEEDBACK {
        uuid feedback_id PK
        uuid activity_instance_id FK
        uuid subject_user_id FK
        uuid author_user_id FK
        uuid assessment_submission_id FK
        string feedback_type
        string overall_comment
        datetime observed_at
        string perspective
        string status
        string visibility
        datetime created_at
        datetime updated_at
    }

    FEEDBACK_EVIDENCE {
        uuid feedback_evidence_id PK
        uuid feedback_id FK
        string evidence_type
        string evidence_text
        uuid media_asset_id FK
        uuid assessment_submission_id FK
        datetime created_at
    }

    FRAMEWORK_OBSERVATIONS {
        uuid framework_observation_id PK
        uuid feedback_id FK
        uuid framework_skill_id FK
        uuid observed_step_id FK
        int consistency_rating
        string confidence_level
        string comment
        uuid next_step_id FK
    }

    OBSERVATION_EVIDENCE {
        uuid observation_evidence_id PK
        uuid framework_observation_id FK
        uuid feedback_evidence_id FK
    }

    MEDIA_ASSETS {
        uuid media_asset_id PK
        uuid owner_user_id FK
        uuid uploaded_by_user_id FK
        string media_type
        string storage_key
        string visibility
        string moderation_status
        datetime created_at
    }
```

### Source-of-proof rules

1. `feedback` identifies the subject, author, perspective, activity context, and observation time.
2. `feedback_evidence` stores the actual proof: a behaviour description, submitted form, work product, or media item.
3. `framework_observations` records the teacher's, student's, or peer's interpretation of that proof against one framework skill.
4. `observation_evidence` explicitly states which evidence supports which observation.
5. One evidence item may support several observations.
6. One observation may rely on several evidence items.
7. `observed_step_id` and `consistency_rating` remain separate values.

### Example

```text
Feedback
    subject: Student A
    author: Teacher B
    activity: Two-week problem-solving project
    perspective: teacher_observation

Evidence 1
    “The student compared two proposals and explained the likely consequences.”

Observation 1
    skill: Problem-solving
    observed step: 7, Evaluate options
    consistency: 4/6, Often
    supported by: Evidence 1

Observation 2
    skill: Speaking
    observed step: 8, Use facts
    consistency: 3/6, Occasionally
    supported by: Evidence 1
```

The same evidence supports two observations, but the step and consistency values are recorded independently for each skill.

---

## 7 Media and evidence attachments

```mermaid
erDiagram
    USERS ||--o{ MEDIA_ASSETS : owns
    USERS ||--o{ MEDIA_ASSETS : uploads
    ACTIVITY_INSTANCES ||--o{ ACTIVITY_MEDIA : contains
    MEDIA_ASSETS ||--o{ ACTIVITY_MEDIA : linked_to

    MEDIA_ASSETS ||--o{ MEDIA_EXTRACTIONS : processed_into
    MEDIA_ASSETS ||--o{ MEDIA_ACCESS_GRANTS : grants
    MEDIA_ASSETS ||--o{ MEDIA_COLLECTION_ITEMS : collected_as
    MEDIA_COLLECTIONS ||--o{ MEDIA_COLLECTION_ITEMS : contains

    MEDIA_ASSETS {
        uuid media_asset_id PK
        uuid owner_user_id FK
        uuid uploaded_by_user_id FK
        string file_name
        string media_type
        string mime_type
        string storage_key
        bigint file_size_bytes
        string visibility
        string moderation_status
    }

    ACTIVITY_MEDIA {
        uuid activity_media_id PK
        uuid activity_instance_id FK
        uuid media_asset_id FK
        string relationship_type
        uuid added_by_user_id FK
        datetime added_at
    }

    MEDIA_EXTRACTIONS {
        uuid media_extraction_id PK
        uuid media_asset_id FK
        string extraction_type
        string content_text
        json content_json
        string processor_name
        string processor_version
        string status
        string review_status
        uuid reviewed_by_user_id FK
        datetime reviewed_at
        string corrected_content_text
    }

    MEDIA_ACCESS_GRANTS {
        uuid media_access_grant_id PK
        uuid media_asset_id FK
        string grantee_type
        uuid grantee_id
        string permission
        datetime expires_at
    }

    MEDIA_COLLECTIONS {
        uuid media_collection_id PK
        uuid owner_user_id FK
        uuid activity_instance_id FK
        string name
        string visibility
    }

    MEDIA_COLLECTION_ITEMS {
        uuid media_collection_item_id PK
        uuid media_collection_id FK
        uuid media_asset_id FK
        int display_order
        uuid added_by_user_id FK
    }
```

Media is not proof by itself. It becomes assessment evidence only when a `feedback_evidence` record cites it and describes its relevance.

---

## 8 End-to-end creation flow

```mermaid
sequenceDiagram
    autonumber
    participant Admin as Administrator
    participant Teacher
    participant System
    participant Student

    Admin->>System: Create or version activity template
    Admin->>System: Select default VASK items
    Teacher->>System: Create activity instance from template
    System->>System: Copy template VASK to instance VASK
    Teacher->>System: Adjust instance VASK and framework targets
    Teacher->>System: Add participants and staff
    Teacher->>System: Assign assessment instrument
    System->>Student: Create assignment-recipient record
    Student->>System: Submit self-reflection responses
    Teacher->>System: Submit teacher observation responses
    Teacher->>System: Create feedback and attach evidence
    Teacher->>System: Select supported framework step per skill
    Teacher->>System: Record consistency and suggested next step
    System->>System: Preserve activity, submission, feedback, observation, and evidence links
```

## 9 Integration portfolio publication and external delivery

```mermaid
erDiagram
    SOURCE_SYSTEMS ||--o{ IMPORT_BATCHES : supplies
    IMPORT_BATCHES ||--o{ IMPORT_RECORDS : contains
    USERS ||--o{ IMPORT_BATCHES : uploads

    USERS ||--o{ PORTFOLIO_SNAPSHOTS : owns
    ACADEMIC_PERIODS ||--o{ PORTFOLIO_SNAPSHOTS : closes
    PORTFOLIO_SNAPSHOTS ||--o{ PORTFOLIO_ITEMS : contains
    PORTFOLIO_SNAPSHOTS ||--o{ EXPORT_PACKAGES : produces
    USERS ||--o{ EXPORT_PACKAGES : generates

    SOURCE_SYSTEMS {
        uuid source_system_id PK
        string code UK
        string name
        string authority_scope
        string status
    }

    IMPORT_BATCHES {
        uuid import_batch_id PK
        uuid source_system_id FK
        uuid uploaded_by_user_id FK
        string file_name
        string status
        datetime imported_at
    }

    IMPORT_RECORDS {
        uuid import_record_id PK
        uuid import_batch_id FK
        string source_record_key
        string record_type
        string validation_status
        uuid resolved_entity_id
        json original_payload
    }

    PORTFOLIO_SNAPSHOTS {
        uuid portfolio_snapshot_id PK
        uuid student_user_id FK
        uuid academic_period_id FK
        int version_number
        string publication_status
        uuid approved_by_user_id FK
        datetime published_at
    }

    PORTFOLIO_ITEMS {
        uuid portfolio_item_id PK
        uuid portfolio_snapshot_id FK
        string source_type
        uuid source_id
        string display_section
        int display_order
        boolean is_proud_moment
    }

    EXPORT_PACKAGES {
        uuid export_package_id PK
        uuid portfolio_snapshot_id FK
        string package_type
        string recipient_category
        uuid generated_by_user_id FK
        string storage_key
        datetime generated_at
    }
```

`source_systems` and import records preserve provenance and validation failures. An imported record must not overwrite reviewed platform data without an explicit reconciliation decision.

`portfolio_snapshots` freeze the approved content for a reporting period. The live student timeline may continue to change, while an issued SLP or period report remains reproducible.

For the lean MVP, an external authority is a `recipient_category`, not an authenticated role. The platform produces a printable PDF/SLP and, where audit detail is required, an XLSX evidence register. Any later external portal requires a separate identity, consent, access, expiry, and audit design.

## 10 What is intentionally excluded

The following belong to the later analytics design and are not part of this core model:

- combining several observations into one current stage;
- weighting teacher, student, peer, or guardian perspectives;
- calculating radar-chart snapshots;
- trend calculations;
- cohort comparisons;
- prediction or recommendation models;
- statistical conversion from questionnaire totals to framework steps;
- confidence scoring based on observation quantity or recency;
- badges, milestones, or progression notifications.
- automated reminder scheduling and escalation;
- an authenticated portal for external authorities; and
- automatic external-authority override of a school-confirmed skill step.

The operational records above should remain the authoritative source even after analytics tables are added.
