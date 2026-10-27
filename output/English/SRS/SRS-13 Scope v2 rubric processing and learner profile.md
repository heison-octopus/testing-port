# SRS-13 Scope v2: rubric processing and learner profile

## 1. Status and sources

This module records the approved POC interpretation following the 26 October 2026 kickstart meeting. It is subordinate to original evidence and uses the four-part register in [`../Current findings and questions v2.md`](../Current%20findings%20and%20questions%20v2.md). RC360 and production face-processing rules remain dependencies, not confirmed requirements.

## 2. Core input and attendance

| ID | Requirement | Status |
| --- | --- | --- |
| V2-FR-001 | The platform shall expose one documented activity input contract. It shall not accept arbitrary per-school schemas in the current scope. | Approved POC interpretation V2-A01 |
| V2-FR-002 | Schools remain responsible for sanitizing source data; the platform shall validate required fields, preview identity resolution, and preserve approval/audit records. | Approved POC interpretation |
| V2-FR-003 | An activity shall support public description (maximum 20,000 characters), private context (maximum 20,000), start/end time, student-upload window, cover treatment, planned roster, media state, and approval state. | Approved POC interpretation |
| V2-FR-004 | Activity teachers shall record `attended`, `late`, `partial`, or `absent` against each planned participant. | Approved POC interpretation |
| V2-FR-005 | An `absent` planned participant shall enter `pending_approval`; staff or SchoolAdmin shall approve or return the attendance difference. | Approved POC interpretation |
| V2-FR-006 | The platform shall not imply that an absence-explanation form exists. | Meeting boundary V2-A03 |

## 3. Label and rubric capability

| ID | Requirement | Status |
| --- | --- | --- |
| V2-FR-010 | A label catalogue shall declare `catalogue_kind`, version, status, and `assessment_capable`. | Approved POC interpretation |
| V2-FR-011 | VASK and activity-type catalogues shall be descriptive and shall not expose score or step entry. | Approved POC interpretation V2-B02 |
| V2-FR-012 | An assessment-capable rubric shall declare axes, minimum/maximum level, evidence rules, version, and publication authority. | Approved POC interpretation |
| V2-FR-013 | Selecting a rubric-axis label on an activity shall create an intended-observation tag only. It shall not create an assessment record. | Approved POC interpretation V2-B01 |
| V2-FR-014 | The POC shall prove one Skills Builder 1–16 path before enabling parallel RC360 results. Rubrics shall not be averaged unless a later approved policy defines a conversion. | Approved POC interpretation V2-B03 |

## 4. Activity form audiences

| ID | Requirement | Status |
| --- | --- | --- |
| V2-FR-020 | One activity form may contain ordered teacher, student, and peer question blocks. | Meeting-confirmed V2-A09 |
| V2-FR-021 | A block shall have a version, audience, lifecycle state, and ordered questions. | Approved POC interpretation |
| V2-FR-022 | Draft blocks shall be hidden from student and peer tasks. Published blocks may be released to their defined audience. | Approved POC interpretation V2-B10 |
| V2-FR-023 | Peer review shall require an explicit reviewer-to-subject assignment, even when the peer block belongs to the same form. | Existing core rule |

## 5. Observable media processing

| ID | Requirement | Status |
| --- | --- | --- |
| V2-FR-030 | Each uploaded image/audio item shall create or link to an observable processing job with job type, provider, status, progress 0–100, retries 0–3, input manifest, output/error, actor, and timestamps. | Approved POC interpretation |
| V2-FR-031 | The job lifecycle shall support `queued`, `processing`, `retry_wait`, `needs_review`, `completed`, `failed_terminal`, and `cancelled`. | Recommended architecture |
| V2-FR-032 | Face processing shall output zero or more face candidates with candidate student ID, confidence 0–100, and decision. | Approved POC interpretation |
| V2-FR-033 | A human reviewer shall confirm, reject, mark unknown, or mark non-student before a face candidate links evidence to a student. | Approved POC interpretation |
| V2-FR-034 | Speech processing shall preserve original text, cleaned text, language, timestamps, detected speaker label, confirmed identity, and filler-removal log. | Approved POC interpretation |
| V2-FR-035 | Rubric suggestions shall preserve the evidence chunk, rubric/version, axis, proposed level within the rubric range, prompt version, model/processor, confidence 0–100, rationale, and human decision. | Approved POC interpretation |
| V2-FR-036 | Test photos supplied by a school shall be isolated from production data and shall not be presented as proof of production privacy compliance. | Open dependency V2-D03 |

## 6. Learner profile and provenance

| ID | Requirement | Status |
| --- | --- | --- |
| V2-FR-040 | Each generated or human-authored learner-profile sentence shall be stored as a claim with zero or more ordered source links. | Approved product proposal |
| V2-FR-041 | “Why this output?” shall expose source excerpts, source record IDs, rubric/version, prompt/model where used, approval status, editor, and timestamps to authorized viewers. | Approved POC interpretation V2-B08 |
| V2-FR-042 | Annual snapshots shall remain immutable. An S3 cumulative output may cite S1–S3 claims without overwriting them. | Approved POC interpretation |
| V2-FR-043 | A student introduction shall support `sentence_starters` and `generated_draft`, maximum 4,000 characters, with `draft → submitted → approved / returned`. | Approved POC interpretation |
| V2-FR-044 | Interests shall be labelled `requirements_open` until the school confirms their source and taxonomy. | Open V2-D10 |
| V2-FR-045 | Original media shall remain outside the default learner-profile view and use separate access rules. | Existing confirmed decision M-18 |

## 7. Access summary

| Action | Student | Activity teacher | Class teacher | Staff | SchoolAdmin |
| --- | --- | --- | --- | --- | --- |
| View own released audience blocks | Own | — | Assigned students | Scoped/all | All |
| Record actual attendance | — | Assigned activity | Assigned activity if authorized | View | View |
| Approve attendance mismatch | — | — | — | Yes | Yes |
| Review processing candidates | — | Assigned scope | Assigned students | Yes | Policy/configuration only |
| Edit and submit own introduction | Own | — | — | — | — |
| Approve student introduction | — | — | Assigned students | Yes | Policy/configuration only |

## 8. Outstanding acceptance dependencies

Acceptance of production RC360, face matching, queue sizing, and cross-year freeze rules is blocked on V2-D01, V2-D02, V2-D03, V2-D08, V2-D09, and V2-D12. The POC may demonstrate those states but shall label them unresolved.

