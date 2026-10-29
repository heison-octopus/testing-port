# SRS-03 Source systems, imports and data quality

## 1. Purpose

Import school, Time Infinity, activity, questionnaire and result data without losing provenance or silently attaching information to the wrong student.

## 2. Processing lifecycle

```text
uploaded → parsed → received
received → identity_matched → validated → included_in_assessment
received → needs_identity_resolution → corrected → validated
validated → excluded
activity_catalogue staged → no_change | successor_draft | disabled | restored
```

Inclusion does not publish the result to a student.

## 3. Functional requirements

| ID | Requirement | Status | Phase |
|---|---|---|---|
| IMP-FR-001 | Every import shall identify source system, contract version, file hash, uploader and timestamp. | Confirmed architecture | P0 |
| IMP-FR-002 | Import shall stage and preview rows before commit. | POC-aligned recommendation | P0 |
| IMP-FR-003 | Rows shall be independently accepted, rejected or held for identity resolution; a row error shall not silently discard the whole file. | Recommended architecture | P1 |
| IMP-FR-004 | The original payload shall be immutable. Corrections shall record field, before/after values, original/resolved student IDs, reason, actor and time. | Confirmed M-10 | P0 |
| IMP-FR-005 | Missing expected responses shall be `missing_response`, never numeric zero. | Confirmed M-11 | P0 |
| IMP-FR-006 | A corrected row shall be revalidated before inclusion. | Recommended architecture | P0 |
| IMP-FR-007 | Re-importing the same source key and hash shall be idempotent or explicitly create a new version; it shall not duplicate included evidence. | Recommended architecture | P1 |
| IMP-FR-008 | Imports shall generate a downloadable error/reconciliation report. | Recommended architecture | P1 |
| IMP-FR-009 | Final column contracts and fallback identity rules remain Policy TBD. | L-03/L-06 | P1 |
| IMP-FR-010 | A school-scoped source connector shall use a configured, allow-listed endpoint or root and a server-held authentication reference. | Partly addressed L-08; Discussed on Meeting Oct 26 - kickstart | P1 |
| IMP-FR-011 | Connector results shall preserve the source record key, opaque media reference, retrieval method, observed metadata, retrieval time and validation outcome. | Recommended architecture | P1 |
| IMP-FR-012 | A connector may return metadata, a short-lived authorized URL or media bytes; the API shall normalize these modes without exposing credentials or raw server paths. | Partly addressed L-08; Discussed on Meeting Oct 26 - kickstart | P1 |
| IMP-FR-013 | Every import batch and connector request shall be bound to one `school_id`; any row that resolves to an identifier owned by another school shall be rejected and audited without exposing that record. | Approved System Analyst architecture decision, 27 Oct 2026 | P0 |
| IMP-FR-014 | If a previously included imported row is later found duplicated, misidentified or unsuitable, staff shall exclude, correct or supersede that row while preserving the immutable original payload; every dependent observation, claim and current snapshot shall enter impact review. | Approved System Analyst architecture decision, 27 Oct 2026 | P1 |
| IMP-FR-015 | Activity-catalogue file import shall default to non-destructive delta/partial-upsert semantics. An activity omitted from a file shall remain unchanged. Treating a file as an authoritative snapshot, including any `missing = disable` behaviour, requires a separate explicitly configured policy and preview and is not enabled in the POC. | Confirmed System Analyst direction, 29 Oct 2026; not BHSS/JC approval | P0 |
| IMP-FR-016 | An update shall name the stable `activity_id` and expected revision number. A changed governed field shall create an immutable successor draft; neither file import nor in-platform editing may overwrite an approved or reviewed revision. The last approved revision remains official until the successor is approved, unless the activity is explicitly disabled. | Confirmed System Analyst direction, 29 Oct 2026; not BHSS/JC approval | P0 |
| IMP-FR-017 | Activity lifecycle input shall use explicit `upsert`, `disable` or `restore` actions with a reason. Excluding a staged import row means “do not apply this row” and shall never disable the canonical activity. Restore shall be a new audited decision, not deletion of the disable history. | Confirmed System Analyst direction, 29 Oct 2026; not BHSS/JC approval | P0 |
| IMP-FR-018 | Material imported changes to a submitted, approved or published activity shall require the normal activity-approval workflow. Material fields include title, description, dates, location, type, subject, department, assigned form, VASK/evidence configuration and media-capture expectation. Roster reconciliation is a separate contract and does not by itself revise activity content. | Confirmed System Analyst direction, 29 Oct 2026; not BHSS/JC approval | P0 |
| IMP-FR-019 | `created_by_user_id` shall preserve the original activity author. Current ownership, file uploader, requestor and service actor shall be stored separately. An uploader shall not become the author, owner or approver merely by uploading or committing a file. A newly imported activity shall require an explicit eligible initial owner/source-authorship decision before commit. | Confirmed System Analyst direction, 29 Oct 2026; not BHSS/JC approval | P0 |
| IMP-FR-020 | The editable activity export shall contain stable ID, expected revision, editable governed fields, current owner identifier, lifecycle action and change reason, but shall omit the original author and upload-audit fields. A separate authorized audit export may expose creator/uploader as read-only provenance. A stale expected revision shall produce a conflict and shall not overwrite newer data. | Confirmed System Analyst direction, 29 Oct 2026; not BHSS/JC approval | P0 |
| IMP-FR-021 | Explicitly disabling an activity shall remove it from participant/student discovery and prevent new participant media/evidence retrieval through that activity. Participation history, media, proof and source rows shall not be hard-deleted. Authorized staff retain administrative/audit access; dependants enter `needs_review` or `stale`. Any published output shall be withdrawn or reissued through an audited successor rather than silently recalculated. | Confirmed System Analyst direction, 29 Oct 2026; not BHSS/JC approval | P0 |
| IMP-FR-022 | In-platform activity editing and spreadsheet import shall enter the same server-side validation, immutable revision, authorization and approval policy. Browser-side hiding is not an authorization control. | Confirmed System Analyst direction, 29 Oct 2026; not BHSS/JC approval | P0 |
| IMP-FR-023 | Activity and import records shall use soft lifecycle states only. No import, exclusion, disable, restore, correction or reconciliation action may hard-delete canonical activity, revision, participation, media, proof or source-custody history. | Confirmed System Analyst direction, 29 Oct 2026; not BHSS/JC approval | P0 |

## 4. Supported contracts

| Contract | P0/P1 purpose |
|---|---|
| Users and memberships | Create/update identities without passwords |
| Academic periods and classes | Establish dated school structure |
| Activity roster | Match student IDs, preview names, edit staged rows and assign participants |
| Activity catalogue/revisions | Export editable governed fields, stage an explicit delta, create successor drafts, and soft-disable/restore stable activities without interpreting absent rows as deletion |
| Form definition | Export VASK-guided question candidates, validate the edited definition, preview row-level changes and create a successor draft form version |
| Questionnaire responses | Upload teacher-completed results; student visibility only after validation and publication |
| Academic results | Store CHI/ENG/MATH/LS or other configured subjects as supporting evidence only |
| External activity feed | Preserve Time Infinity or other source ownership |
| External media connector | Resolve school-approved media references from one or more stores while preserving source ownership and access policy |

## 5. Limits and validation

| Input | Minimum | Maximum | Error behaviour |
|---|---:|---:|---|
| File count per import | 1 | 1 | Reject additional files |
| Spreadsheet size | >0 | 4 MiB | Reject before parsing |
| Data rows | 1 | 5,000 | Reject with active cap |
| Columns | 1 | 100 | Reject with active cap |
| Header length | 1 | 64 characters | Reject unknown/duplicate required headers |
| Cell text | 0 | 4,000 characters | Flag row; do not truncate |
| Source record key | 1 | 200 characters | Required for idempotency |
| Numeric result | Configured scale minimum | Configured scale maximum | Disable import contract until scale exists |

Allowed spreadsheet types in P0 are `.xlsx` and `.csv`. Formula cells shall be read as stored values; macros and executable content shall not be run.

The P0 form-definition contract accepts `.xlsx` only, maximum 4 MiB and 200 question rows. It is intentionally separate from the response-entry contract and contains no student answer rows.

## 6. Access and locking

- Teachers may import rosters/responses only for assigned activities.
- Staff may resolve delegated import exceptions.
- SchoolAdmin configures source contracts and authoritative identifiers.
- A SchoolAdmin or separately authorized import operator may stage and commit a school-scoped activity-catalogue delta, but that operational authority does not confer activity approval authority.
- The activity creator remains immutable. Current owner, uploader/committer and approval assignee are separate identities and must be independently authorized.
- Once committed, source rows are immutable; correction creates an appended history record.
- Publishing remains a separate action after validation.

## 7. Acceptance scenarios

- Preview shows entered student ID and matched student name before commit.
- An unknown ID is held and can be corrected without altering the original payload.
- A missing response appears in the responsible teacher's exception list and contributes no zero.
- An out-of-range mark is rejected using the named grading scheme's min/max.
- Uploading the same batch twice does not duplicate included records.
- Excluding a previously used incorrect row does not silently substitute another row or result; dependent items are marked for review.
- Removing an activity row from an exported CSV and re-importing the remaining rows does not change the omitted activity.
- Editing a material activity field with the matching expected revision creates a successor draft and leaves the last approved revision official; a stale expected revision is rejected.
- Excluding a staged `disable` row leaves the activity active; committing an explicit `disable` hides it from participant surfaces while preserving staff audit history and dependent evidence.
- An explicit `restore` creates a new lifecycle event and restores access without erasing the disable event.

