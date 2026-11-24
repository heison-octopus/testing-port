# V4 import, transfer and rubric administration design

**Date:** 23 November 2026  
**Status:** internal System Analyst design proposal; not BHSS/JC approval  
**Reference:** Portfolio V2 `DataImports.tsx` and the supplied RC360 Skills Assessment Framework Guide, version 1.0, 2 October 2026

## What V2 gets right

V2 starts with a protected data-operation inventory rather than an unstructured upload box. It separates activity catalogue, user list, groups, teacher updates, student updates, activity assignments, question bank, skill rubrics, labels and media paths. Each operation can export the current records, download a template, upload a CSV/XLSX file, stage validation, inspect row-level errors and commit only after review. The import batch keeps source custody, row decisions, corrections and commit history.

V4 should carry this workflow into the smaller relational model. The file is a transport format; the server contract, authorization and staged diff remain authoritative.

## Recommended V4 administrator tabs

The current generic labels `User import / export`, `Role refresh` and `School structure` do not describe the batch decisions clearly enough. Use these operational tabs instead:

| Tab | Purpose | Main batch file | State-changing result |
|---|---|---|---|
| **People** | Create/update user identity and lifecycle fields | People XLSX/CSV | User profile successor values; disable/restore with audit |
| **Assignments** | Export and batch change class, activity and role assignments | Assignments XLSX/CSV | End-date old assignment and create a dated successor |
| **Role transfer** | Move functional roles between users or periods | Role transfer XLSX/CSV | Role assignment with effective period and permission review |
| **Period transfer** | Move users into a reporting period/year | Period transfer XLSX/CSV | Dated period membership; old period retained |
| **Class transfer** | Move students between classes in bulk | Class transfer XLSX/CSV | Close old class membership and create new class membership |
| **Academic structure** | Add/change periods, years, classes, subjects and groups | Structure XLSX/CSV | School-owned reference record with parent/type validation |
| **Activities** | Add activity records and inspect incomplete activity details | Add activity XLSX only | Activity draft; incomplete rows go to detail completion |
| **Labels and rubrics** | Manage VASK labels, Skills Builder and RC360 catalogue versions | Label/rubric package XLSX | Successor draft; activation is separate and audited |

The internal API can keep `/school-definitions` and the 18-table schema names. These labels describe the administrator task, not the physical table.

## People and assignment exports

People and assignments must each have a full protected export. An administrator can export all rows in the authorized school scope, edit stable IDs and effective dates, and upload the file for staged validation. The export must include enough context to make a safe batch change visible:

- stable `user_id` and immutable `source_id`/login ID;
- display name, user kind, status and student/staff number;
- assignment ID and kind;
- role code and bilingual role label, when applicable;
- class/group/period/activity IDs and human labels;
- assigned by, effective from/until, current status and row version.

The browser must not render the full export. The server creates or streams the file and records the export event. Import validation checks duplicate IDs, school ownership, row versions, effective-date overlap, class/period existence, role existence and permission scope before showing a diff.

## Role existence and unassigned permission hint

An assignment is valid only when its role is present in the school's role catalogue and its permission mapping is active for the applicable period. If an imported role code is missing, the row is `needs_role`, not silently assigned to a similarly named role.

The Roles tab should show an orange dot or hint badge when there are unresolved role references or role records with no active permission mapping. The badge opens a filtered **Unassigned permission roles** view showing:

- role code and English/Chinese labels;
- source batch and affected rows;
- missing role versus missing permission mapping;
- period and proposed assignment scope;
- actions to create the role, attach an existing permission mapping, or exclude the row with a reason.

Creating a role or changing its permission mapping remains a separate confirmed action. It must not happen as a side effect of importing an assignment.

## Activity import and detail completion

Activities should use the V2 delta approach, but the V4 scope is deliberately smaller:

1. Download an **Add activity XLSX** template. The template is for new activity drafts; it is not a general unrestricted table dump.
2. Upload and stage the file. Missing rows do not delete or change existing activities.
3. Validate required fields, dates, period, owner, category, VASK labels and rubric references.
4. Route valid-but-incomplete rows to **Needs extra detail**. This state means the activity is structurally valid but cannot yet be used for the intended portfolio workflow.
5. Route malformed or unauthorized rows to **Needs correction**, with row and column errors.
6. Let an authorized activity editor complete labels, stages, form package, rubric choice and reviewer assignment in the activity detail screen.
7. Commit the activity draft only after the detail checklist is complete; activity approval remains a later state transition.

The minimum activity detail checklist should include:

- period and start/end dates;
- activity category/type;
- owner and assigned staff/students;
- at least one VASK label or an explicit `not applicable` reason;
- optional RC360 skill labels;
- Skills Builder or RC360 rubric reference, when assessment is intended;
- response form/stage and reviewer assignment;
- media/source reference where the activity imports evidence.

Use a visible **Needs extra detail** button/filter with an orange hint badge. It is different from an error: the row is not rejected, but it cannot proceed to the next lifecycle state.

## Label and rubric management

VASK labels, RC360 skills and Skills Builder steps are separate concepts:

- VASK describes the activity's value, attitude, skill and knowledge intent.
- RC360 provides 10 core skills with observable subdimensions and three source-defined bands.
- Skills Builder remains the separate 16-step framework; an RC360 score must not be converted into a Skills Builder step without an approved mapping.

The rubric tab should show a versioned catalogue with capability flags: `labelling_capable`, `assessment_capable`, `radar_eligible`, score mode, source reference and completeness. A successor XLSX package is staged and validated before it can be activated. Existing Portfolio versions remain pinned to their original rubric version.

### RC360 score interpretation

The supplied RC360 guide describes three bands using numeric thresholds for each subdimension:

| Source band | Guide threshold |
|---|---:|
| 初現 / emerging | score `< 3.0` |
| 發展中 / developing | `3.0 ≤ score < 5.0` |
| 持續展現 / sustained | score `≥ 5.0` |

The guide does not establish a universal storage scale in the excerpt used here. Therefore V4 should store the raw numeric score to one decimal place, retain `score_out_of` and the source/version, and calculate the displayed band from a versioned threshold policy. If the school chooses a 1.0–5.0 scale, the band policy must be explicitly approved because the source threshold makes the highest band begin at 5.0. Automatic rounding should be display-only unless a later decision defines whether rounding happens before or after threshold comparison.

The UI may offer a compact Beginner / Middle / Advanced presentation, but it must retain the source band name, raw one-decimal score and threshold policy. This prevents a convenient visual label from becoming an untraceable assessment result.

## Shared staged import contract

All tabs should use the same sequence:

**Export/template → upload → parse → row validation → staged diff → resolve errors or missing details → confirm → atomic commit → audit/result report.**

The import batch remains append-only for corrections and decisions. A rejected row is excluded by a reasoned decision; it is not deleted. A committed assignment or activity change creates dated/stateful successors rather than rewriting historical evidence.

## Recommended badge states

Use one consistent orange hint badge on the relevant tab/button:

- `needs_role` — role code is absent or has no valid mapping;
- `needs_permission` — role exists but grants no active permission for the scope;
- `needs_extra_detail` — activity is valid but its VASK/rubric/stage checklist is incomplete;
- `needs_correction` — file or row violates the import contract;
- `ready_to_commit` — validation and required resolutions are complete.

These are operational queues. They do not replace the activity, assignment, role or rubric lifecycle state stored by the server.

## Current V4 implementation check

The current V4 implementation now supports full and filtered people CSV export, assignment CSV export, file-based CSV upload with automatic validation, before/after change rows and row-level errors for people/class-period imports. Role transfer uses the same preview shape. Individual people and academic-structure records can be created in the web UI. A batch academic-structure import for classes and groups is still a required follow-up; it must use the same staged contract and must not be implied by the current web form. XLSX parsing, durable import-batch history and rubric package upload remain planned work; the V2 implementation is the reference for those capabilities.

