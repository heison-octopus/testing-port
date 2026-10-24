# SRS-03 Source systems, imports and data quality

## 1. Purpose

Import school, Time Infinity, activity, questionnaire and result data without losing provenance or silently attaching information to the wrong student.

## 2. Processing lifecycle

```text
uploaded → parsed → received
received → identity_matched → validated → included_in_assessment
received → needs_identity_resolution → corrected → validated
validated → excluded
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

## 4. Supported contracts

| Contract | P0/P1 purpose |
|---|---|
| Users and memberships | Create/update identities without passwords |
| Academic periods and classes | Establish dated school structure |
| Activity roster | Match student IDs, preview names, edit staged rows and assign participants |
| Questionnaire responses | Upload teacher-completed results; student visibility only after validation and publication |
| Academic results | Store CHI/ENG/MATH/LS or other configured subjects as supporting evidence only |
| External activity feed | Preserve Time Infinity or other source ownership |

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

## 6. Access and locking

- Teachers may import rosters/responses only for assigned activities.
- Staff may resolve delegated import exceptions.
- SchoolAdmin configures source contracts and authoritative identifiers.
- Once committed, source rows are immutable; correction creates an appended history record.
- Publishing remains a separate action after validation.

## 7. Acceptance scenarios

- Preview shows entered student ID and matched student name before commit.
- An unknown ID is held and can be corrected without altering the original payload.
- A missing response appears in the responsible teacher's exception list and contributes no zero.
- An out-of-range mark is rejected using the named grading scheme's min/max.
- Uploading the same batch twice does not duplicate included records.

