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
| V2-FR-037 | Media processing shall use a provider-neutral `ExtractionProvider` contract; the production provider is P2 while the contract, validation and test double belong to P1. | Approved System Analyst architecture decision, 27 Oct 2026 |
| V2-FR-038 | Provider output shall be normalized extracted text/chunks/candidates plus provenance and warnings. It shall not write evidence, identity, rubric or Portfolio records directly. | Approved System Analyst architecture decision, 27 Oct 2026 |
| V2-FR-039 | The kernel shall validate school/feature/access/consent and store normalized output as a human-review candidate before it can become accepted evidence. | Approved System Analyst architecture decision, 27 Oct 2026 |

## 6. Learner profile and provenance

| ID | Requirement | Status |
| --- | --- | --- |
| V2-FR-040 | Each generated or human-authored learner-profile sentence shall be stored as a claim. An evidence-based generated claim requires one or more ordered eligible source links; a human-authored source-free field may have zero only where its field policy explicitly permits it. | Approved product proposal; clarified by System Analyst architecture decision, 27 Oct 2026 |
| V2-FR-041 | “Why this output?” shall expose source excerpts, source record IDs, rubric/version, prompt/model where used, approval status, editor, and timestamps to authorized viewers. | Approved POC interpretation V2-B08 |
| V2-FR-042 | Annual snapshots shall remain immutable. An S3 cumulative output may cite S1–S3 claims without overwriting them. | Approved POC interpretation |
| V2-FR-043 | A student introduction shall support `sentence_starters` and `generated_draft`, maximum 4,000 characters, with `draft → submitted → approved / returned`. | Approved POC interpretation |
| V2-FR-044 | Interests shall be labelled `requirements_open` until the school confirms their source and taxonomy. | Open V2-D10 |
| V2-FR-045 | Original media shall remain outside the default learner-profile view and use separate access rules. | Existing confirmed decision M-18 |
| V2-FR-046 | Portfolio generation shall use a separate provider-neutral contract and only a frozen manifest of kernel-accepted, eligible evidence for one student and school. | Approved System Analyst architecture decision, 27 Oct 2026 |
| V2-FR-047 | Generated sections/claims shall carry ordered source references; the kernel shall reject references outside the input manifest and require human approval before snapshot publication. | Approved System Analyst architecture decision, 27 Oct 2026 |
| V2-FR-048 | Portfolio visualization shall consume the approved frozen snapshot and shall remain independent of extraction and LLM provider implementations. | Approved System Analyst architecture decision, 27 Oct 2026 |

## 7. Manual correction and dependency review

| ID | Requirement | Status |
| --- | --- | --- |
| V2-FR-050 | A previously confirmed face or speaker identity shall remain correctable. An authorized reviewer shall be able to reject or supersede the match and detach the false student/evidence association without deleting the original candidate or decision history. | Approved System Analyst architecture decision, 27 Oct 2026 |
| V2-FR-051 | An authorized reviewer shall be able to correct an actual-attendance or student/activity association with reason, actor and time. The planned roster and prior attendance decision shall remain auditable. | Approved System Analyst architecture decision, 27 Oct 2026 |
| V2-FR-052 | OCR/transcript text, speaker segments and extracted metadata shall be correctable through a successor/correction record. The original provider output shall remain immutable and shall not be presented as the corrected truth. | Approved System Analyst architecture decision, 27 Oct 2026 |
| V2-FR-053 | Rubric suggestions produced by different provider/model/prompt versions shall remain parallel candidates. Each may be accepted, rejected or ignored independently; one suggestion shall not overwrite another or an official result. | Approved System Analyst architecture decision, 27 Oct 2026 |
| V2-FR-054 | Excluding, invalidating or superseding a source used by an observation, claim, generation run or published snapshot shall trigger a dependency-impact review. Dependants shall become `needs_review`/`stale`; the system shall not silently substitute another source or result. | Approved System Analyst architecture decision, 27 Oct 2026 |
| V2-FR-055 | If an affected result is already published, authorized Staff shall withdraw it or approve a successor snapshot. Historical output, the correction reason and the complete before/after trace shall remain reproducible. | Approved System Analyst architecture decision, 27 Oct 2026 |

The manual controls that must be available, subject to role and assignment scope, are: reject a false identity match; correct a student/activity or attendance association; correct extracted text/speaker segmentation; exclude one proof from one assessment or Portfolio claim; globally invalidate a false, duplicate, corrupt or withdrawn proof; reject an AI suggestion; supersede a human observation; withdraw/reissue a published result; and restore a wrongly excluded item through a new audited decision. These actions are soft correction/invalidation operations, not destructive deletion.

## 8. Access summary

| Action | Student | Activity teacher | Class teacher | Staff | SchoolAdmin |
| --- | --- | --- | --- | --- | --- |
| View own released audience blocks | Own | — | Assigned students | Scoped/all | All |
| Record actual attendance | — | Assigned activity | Assigned activity if authorized | View | View |
| Approve attendance mismatch | — | — | — | Yes | Yes |
| Review processing candidates | — | Assigned scope | Assigned students | Yes | Policy/configuration only |
| Correct/exclude a used source | Request correction | Propose within assigned scope | Propose within assigned scope | Decide when assigned | Policy only unless separately assigned |
| Edit and submit own introduction | Own | — | — | — | — |
| Approve student introduction | — | — | Assigned students | Yes | Policy/configuration only |

## 9. Outstanding acceptance dependencies

Acceptance of production RC360, face matching, queue sizing, and cross-year freeze rules is blocked on V2-D01, V2-D02, V2-D03, V2-D08, V2-D09, and V2-D12. The POC may demonstrate those states but shall label them unresolved.

