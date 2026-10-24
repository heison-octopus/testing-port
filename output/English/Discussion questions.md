# BHSS discussion question register

## Purpose and use

This is the single checklist for unresolved product, assessment, workflow, and implementation decisions. The Core document should record confirmed rules and link here for unresolved decisions instead of duplicating the full question list.

Status meanings:

- `Confirmed working decision` — approved for the current architecture, but still traceable as a project decision rather than an original-source statement.
- `Recommended` — proposed direction awaiting school confirmation.
- `Open` — no decision has been supplied.
- `Deferred` — deliberately left outside the current milestone.

When a question is answered, tick the box, record the answer and decision owner, and update only the architecture document affected by that answer. Slides and speaker notes should refer to the stable question ID.

## High-level decisions

| Done | ID | Question | Why it matters | Status | Answer or decision record |
| --- | --- | --- | --- | --- | --- |
| [ ] | H-01 | What are the official outputs: web Portfolio, self-contained HTML, PDF/SLP, XLSX evidence register, or a defined combination? Who receives each output? | Determines reporting design, publication and access control. | Open |  |
| [ ] | H-02 | Is the supplied questionnaire an official assessment instrument, a bank of examples, or reference material that BHSS may rewrite? | Determines whether wording, scales and mappings may change. | Open |  |
| [ ] | H-03 | Who has final authority over a published 1–16 skill step? | Prevents a questionnaire score, AI output or external source from silently becoming the official result. | Open |  |
| [ ] | H-04 | Is an assigned teacher/TA observation mandatory before an activity can change a published skill step? | Determines how missing human ratings are handled. | Open | Current architecture recommends that missing ratings remain unconfirmed evidence rather than zero. |
| [ ] | H-05 | Who approves question-to-VASK, question-to-eight-skill and question-to-step-range mappings? May the author also approve the mapping? | Defines governance, separation of duties and version publication. | Open | The supplied documents do not assign this authority. Proposed flow: author proposes; assigned SuperTeacher/staff reviews; authorized staff or SchoolAdmin publishes. |
| [x] | H-06 | Can a student-owned external achievement or certificate directly affect an official skill step? | Separates meaningful self-reported experience from observed assessment. | Confirmed working decision | No by default. Store the certificate as evidence and the student's VASK/reflection separately. Without a suitable teacher/TA observation, it remains unconfirmed and is not averaged into a formal step. |
| [ ] | H-07 | What evidence, consent, image/audio access, retention, correction and deletion policies apply? | Controls lawful access and the effect of later withdrawal. | Open |  |
| [ ] | H-08 | How are academic years, reporting periods, rollover, frozen snapshots and cross-year progress handled? | Determines longitudinal history and reproducible official outputs. | Open |  |
| [ ] | H-09 | Do external authorities receive generated exports only, or require authenticated platform access? | External accounts materially increase identity, consent and audit work. | Recommended | Lean MVP: approved PDF/SLP and controlled XLSX only; no external login. |
| [ ] | H-10 | Which AI uses are permitted, and which outputs always require human confirmation? | Defines the boundary between assistance and assessment authority. | Recommended | AI may assist OCR, transcription, classification, summaries, rubric suggestions and report drafting. Identity, evidence acceptance and official step decisions remain human-confirmed. Discuss AI and infrastructure after the core workflow is agreed. |

## Mid-level assessment and workflow decisions

| Done | ID | Question | Why it matters | Status | Answer or decision record |
| --- | --- | --- | --- | --- | --- |
| [x] | M-01 | When one question maps to several skills, should it have more total influence than a question mapped to one skill? | Without normalization, broad questions receive hidden extra influence. | Confirmed working decision | Keep `question_total_weight = 1.0`; divide it equally across mapped skills. One skill receives 1.0, two receive 0.5 each, four receive 0.25 each. |
| [ ] | M-02 | How should low-level and high-level questions be represented? Should a question define an evidence range or maximum supported step? | Skill relevance and behavioural complexity are different dimensions. | Open | A proposed `evidence_band_min` and `evidence_band_max` may limit what the answer can support, but must not award a step automatically. |
| [ ] | M-03 | Are apparently similar questions genuine wording variants, or do they measure different meanings? | Incorrectly merging variants can erase meaningful differences. | Open |  |
| [ ] | M-04 | Are questions intended to remain fixed, rotate periodically, or be swapped while preserving meaning? | Affects comparability, versioning and workload. | Open |  |
| [ ] | M-05 | Which questions are valid for student self-report, peer observation and teacher observation? Does BHSS require an explicit yes/no audience decision for every question? | Questions may be valid in one activity and inappropriate in another. | Open | Interim POC assumption: all supplied questions are available to all audiences; BHSS may edit an exported question bank and upload it again. This is not stated in the original design and requires additional design and testing. |
| [ ] | M-06 | What constitutes a complete approved form: required sections, required VASK coverage, required skills, respondent types, scales and minimum question count? | Needed before the system can validate and publish a form version. | Open |  |
| [ ] | M-07 | How should student, peer and teacher perspectives be displayed or combined? Are any of them averaged? | Different perspectives are evidence sources, not automatically equivalent marks. | Open | Current architecture keeps them as separate records. |
| [ ] | M-08 | Can one activity be both academic and non-academic, and if so is this a multi-select classification or one primary category plus tags? | Affects filtering and reporting rather than assessment authority. | Open | Low-to-mid-level operational decision. |
| [x] | M-09 | When should an imported Google Forms/CSV response count in the system? | Counting a record and publishing it to a student are different actions. | Confirmed working decision | Process through `received -> identity_matched -> validated -> included_in_assessment`. Inclusion means the record counts; it does not make it student-visible. |
| [x] | M-10 | How is an incorrect student ID corrected? | Corrections must not destroy the original import or obscure who changed it. | Confirmed working decision | Preserve the original payload. Store original and resolved student IDs, before/after values, reason, actor and timestamp in an immutable correction history. |
| [x] | M-11 | What happens when an expected response is missing? | Missing evidence must not become a zero or disappear silently. | Confirmed working decision | Keep a `missing_response` exception and notify the responsible teacher. Staff may resolve identity mismatches before inclusion. |
| [ ] | M-12 | Which activity, roster, VASK, form and submission fields become locked after teacher submission? Who can reopen them? | Determines auditability and correction workflow. | Open |  |
| [ ] | M-13 | How does the school distinguish `not_collected`, `no_evidence`, `not_applicable` and `missing_response`? | These states have different meanings and must not be converted to zero. | Open |  |
| [ ] | M-14 | Is there a list of approved activities, with `other` entering a pending manual-review state? | Controls activity quality without requiring every routine activity to undergo the same approval. | Open |  |
| [x] | M-15 | How should an external certificate be represented when the teacher did not observe the activity? | Avoids false teacher assessment and biased averaging. | Confirmed working decision | Treat it as a student-owned external achievement with certificate evidence and student reflection/VASK. Teacher feedback is optional; no formal skill-step contribution is created without suitable human observation. |
| [x] | M-16 | What selectable AI output styles should the POC provide? | Controlled profiles are easier to review and version than unrestricted prompts. | Confirmed working decision | Provide three profiles: academic learning and reasoning; non-academic participation and personal growth; interpersonal collaboration and intrapersonal development. Teachers may adjust controlled emphasis, age/class, tone, length and omissions. |
| [x] | M-17 | What happens when a teacher edits AI-generated wording? | The school needs a usable final tone without losing provenance. | Confirmed working decision | Preserve `generated_text`, `teacher_edited_text` and `final_published_text`, together with prompt version, editor, timestamps and revision history. |
| [x] | M-18 | Should original evidence media appear in the Portfolio? | Media visibility has major privacy and layout consequences. | Confirmed working decision | Hide original media by default. The Portfolio may show an evidence reference or attachment count; actual media access is controlled separately. |
| [x] | M-19 | What is the visibility lifecycle for reviewed content? | Approval, counting and student visibility must remain separate. | Confirmed working decision | Use `unpublished -> published_to_portfolio -> withdrawn` independently of validation and assessment-inclusion status. |

## Respondent and context suitability examples

These examples illustrate why audience and activity context must be reviewed. They are not yet a validated question bank.

| Example question | Plausible use | Inappropriate or risky use |
| --- | --- | --- |
| “Can recognize that learning to reason correctly is important.” | Student interview or reflection | Direct teacher behavioural rating without supporting evidence |
| “Can ensure that every team member's ideas are treated equally.” | Teacher or peer observation in a collaborative race or coding project | Individual competition |
| “When under pressure, makes other people feel uneasy.” | Moderated teacher or peer observation | Unmoderated negative peer judgement |

## Low-level operational decisions

| Done | ID | Question | Why it matters | Status | Answer or decision record |
| --- | --- | --- | --- | --- | --- |
| [ ] | L-01 | Which of the proposed activity input fields are mandatory, optional or conditionally required? | Controls validation and staff workload. | Open |  |
| [ ] | L-02 | Which file formats, file sizes and upload counts are permitted for each role and evidence type? | Required for upload validation and storage planning. | Open |  |
| [ ] | L-03 | Which student identifier is authoritative for imports, and which fallback fields may staff use for matching? | Prevents responses being attached to the wrong student. | Open |  |
| [ ] | L-04 | What are the exact lock, reopen and resubmission actions after each submission state? | Converts the high-level audit rule into UI behaviour. | Open |  |
| [ ] | L-05 | Which notification channel and timing should be used for missing records, returned submissions and publication? | Determines whether reminders are in-app, email, manual lists or deferred. | Open |  |
| [ ] | L-06 | What are the final CSV/XLSX columns, enum values and error-report format? | Required before import templates become contractual. | Open |  |
| [ ] | L-07 | What file naming, download, archive and retention conventions apply to generated HTML, PDF/SLP and XLSX outputs? | Supports reproducibility and school operations. | Open |  |

## Decision record template

Use this block when a table cell is too small for the final answer:

```text
Question ID:
Decision status: confirmed / rejected / deferred / superseded
Decision:
Reason:
Decision owner:
Decision date:
Source or meeting reference:
Affected documents or components:
Follow-up action:
```
