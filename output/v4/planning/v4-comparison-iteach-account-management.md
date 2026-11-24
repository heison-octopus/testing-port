# V4 comparison with iTeach account management

**Date:** 23 November 2026  
**Status:** internal System Analyst comparison; not BHSS/JC approval  
**Source observed:** read-only visual inspection of the company iTeach/Ego Lite system at `iteach.octopus-tech.com`  
**Scope:** account management, CSV operations, class management, teacher permissions and related settings

## Design decision

The instructional text shown in the current iTeach screens should remain visible in V4. It is useful operational guidance for administrators and should not be replaced by an icon-only or hidden help pattern.

V4 should keep an instruction block beside each high-risk or batch workflow, especially:

- export the current list before editing;
- do not change immutable login/user IDs;
- use the supplied template and required columns;
- validate the file before commit;
- review row-level errors and the before/after diff;
- understand whether an operation ends an old assignment or creates a new one;
- keep the audit/event reference after commit.

## Observed iTeach/Ego Lite functions

### Student account management

The student account screen provides:

- school-year selector;
- class selector;
- search field;
- selected-row count;
- export selected;
- export all;
- create account;
- batch create accounts;
- batch update accounts;
- delete accounts;
- table columns for student, class and student number;
- row selection checkboxes.

The batch-update instruction shown to administrators says to export the teacher list first, modify the data, and not change the login name. V4 should preserve this style of instruction for both student and teacher imports.

### Teacher account management

The teacher account screen provides:

- teacher search;
- export;
- create account;
- batch create accounts;
- batch update accounts;
- delete accounts;
- a large teacher list with row selection.

Teacher account management is separate from teacher-course management and teacher-permission management.

### Class management

The class screen provides:

- school-year selector;
- class search;
- add class;
- add grade/year group;
- student count per class;
- class export;
- edit class;
- assign students;
- manage student numbers.

### Teacher permission management

The teacher-permission screen presents a permission-by-teacher matrix. Observed permission categories include:

- manage students;
- manage classes;
- manage announcements;
- manage communications;
- manage subjects;
- manage question banks;
- manage achievements;
- manage permissions;
- manage rewards;
- manage courses;
- manage information boards.

### Related account/settings areas

The settings index also exposes password change, linked accounts, logs, tags, LTI tools, assessment criteria, xAPI records, school analytics, bulk copy, certificates, multi-year reports, calendar management and system configuration.

The temporary school-year switch page was visible but did not expose additional fields during this read-only inspection.

## V4 comparison

| Area | iTeach/Ego Lite observed | V4 current position | Finding |
|---|---|---|---|
| Create user | Individual and batch create | Individual create form | **Partial** — batch create and invitation flow remain |
| Update user | Batch update with export-first instruction | User CSV preview/commit | **Partial** — add templates, immutable-ID warning and diff |
| Remove user | Selected-account delete | No complete user disable/delete UI | **Missing** — implement soft disable/archive and session revocation |
| User identity | Display name, login name, student number and class context | Display name, email, user kind | **Missing fields** — source/login ID, student number, bilingual names and origin |
| Export | Selected and all export | School-wide user and assignment export | **Partial** — add filtered and selected export |
| Student class transfer | Class selector and assignment operations | Class/period CSV import and role refresh page | **Partial** — transfer must close old membership atomically |
| Teacher role transfer | Separate teacher permission management | Explicit role mappings and period role refresh | **Partial** — add teacher-by-permission review matrix |
| Class management | Class edit, counts, student assignment, student numbers | Definitions and membership assignments | **Partial** — dedicated class management page needed |
| Course management | Teacher-course and student-course tabs | Subject/department relation only | **Missing** — course assignment workflow remains |
| Instructions | Visible operational instructions in batch dialogs | Validation text exists in V4 import pages | **Partial** — retain and expand instruction blocks |
| Audit | Separate action log | Change logs and audit snapshot pages | **Present** — extend to import batch summaries and lifecycle actions |
| Password/account settings | Password change and linked account settings | JWT sessions; no user-facing password lifecycle | **Missing** — invitation, reset, change and linked identity workflow |

## Recommended V4 additions

### Priority 0 — account administration safety

1. Add immutable `login_id`/`source_id`, student number and optional bilingual display names to the user contract.
2. Add user lifecycle actions: invite, activate, suspend, disable, restore and archive.
3. Revoke active sessions when a user is disabled or role access is removed.
4. Add a user update diff with old value, new value, row number, actor and reason.
5. Keep the export-first and “do not change login ID” instructions visible in the import page.

### Priority 1 — school administration parity

1. Add selected/filter export in addition to full-school export.
2. Add class management for class number, student count, student assignment and student-number maintenance.
3. Add teacher-course and student-course assignment surfaces.
4. Add a teacher-by-permission matrix backed by the same explicit `role_permissions` mappings.
5. Add batch create with invitation/activation status rather than importing passwords.

### Priority 2 — broader settings parity

Consider separate V4 settings modules for password/linked accounts, tags, calendar, assessment criteria, xAPI, analytics, certificates, reports and system configuration. These are outside the basic user-management slice but are visible in the existing iTeach account settings and should remain in the comparison register.

## Proposed complete V4 workflow

The following workflow closes the gaps while preserving the simpler V4 model:

1. **Select scope** — choose school, school year/period, user type and optional class.
2. **Export or download template** — export selected/current rows or download a versioned blank template.
3. **Edit/import** — keep immutable IDs unchanged; edit profile, class, student number or status fields.
4. **Validate** — check headers, IDs, duplicate rows, class/period validity, email uniqueness, role codes and effective dates.
5. **Review diff** — show old value, new value, affected assignments, session impact and row-level errors.
6. **Confirm** — require an actor reason and a second confirmation for disable, role removal or cross-class transfer.
7. **Commit atomically** — close superseded assignments, create successor assignments, update user fields and write one batch event with child changes.
8. **Verify** — show imported count, skipped/error count, audit event ID and a downloadable result report.
9. **Recover** — provide a reversible batch reference for correcting or restoring an accidental update without deleting history.

For a role refresh, use the same sequence on its own page. The role page should display the resulting teacher-by-permission matrix after commit, with effective period and source batch visible.

## Current implementation boundary

The V4 import/export page and separate role-refresh page are the correct structural direction. They should remain separate:

- **User import/export:** user profile updates, class/period membership imports, user export and assignment export.
- **Role refresh:** effective-period role assignment/removal, prior assignment end-dating and permission review.

The CSV examples remain provisional. The approved schema and API contracts remain authoritative.

## Activity Master List tab design

V4 should add an **Activity Master List** as an administrator-facing tabbed surface, similar to iTeach's course management area. This is the fast operational view for adding, finding, assigning and ending activities; the detailed activity editor remains the place for editing one activity's description, dates, VASK labels, form package and approval settings.

Recommended tabs:

1. **Activities** — the master list with create, archive/cancel, open-details and quick assignment actions.
2. **Participants** — teacher/student assignment review, bulk assignment and end-dating of assignments.
3. **Stages and forms** — activity lifecycle state, form version and approval state.
4. **Import/export** — templates, staged CSV/XLSX import and full export jobs.
5. **Audit/history** — activity changes, assignment changes and lifecycle events.

The activity list must be designed for schools with more than 10,000 students and more than 10,000 activities/courses. The browser should never load the whole dataset merely to render the first screen. Use server-side filtering, cursor pagination (or an equivalent stable page token), a bounded page size, and row virtualization. The API should return only the visible page plus counts needed for the current filter; the UI should show loading, empty, failed and retry states without rendering thousands of hidden rows.

At minimum, the Activities tab should filter on:

- school year or reporting period/date range;
- activity category/type;
- lifecycle/operational state (draft, active, waiting for approval, approved, archived/cancelled);
- owner/creator or assigned teacher;
- text search over activity title and identifier;
- VASK labels where the user has permission to use them as a filter.

The filter values, sort order and cursor must be sent to the API. Counts and list rows must be scoped by the same authorization and period rules as the detail page. VASK is a label/context filter; it must not be treated as an assessment result or used to bypass activity access rules.

Full XLSX/CSV export is a separate server-side operation. It may export all rows matching the selected scope, including records that are not currently loaded in the browser, but it must not build a 10,000-plus-row client-side table first. Create an export job, stream or generate the file on the server, report progress, and provide a download when complete. Selected-row and current-filter exports can remain available as smaller immediate actions. Export requests and downloaded files should be recorded in the audit log.

For removal, keep the existing traceability rule: ending an assignment or archiving/cancelling an activity is a state change with actor, reason and timestamp. Do not hard-delete an activity, participant assignment, submission, evidence or audit history from the master list.

### Rendering and memory constraints

The Activity Master List must avoid the RAM pressure seen in the current iTeach-style rendering approach. Do not render hidden rows, duplicate the full data set in multiple component states, or precompute all filter combinations in the browser. Keep only the current page and selection keys in memory, debounce text search, cancel superseded requests, and release page data when the filter or tab changes. Large export preparation belongs to a background server job rather than the React render path.

### Suggested API shape

The initial API contract can stay small:

- `GET /activities?period=&category=&state=&owner=&q=&cursor=&limit=` returns a bounded page and `nextCursor`;
- `GET /activities/:id/participants` returns a bounded participant page;
- `POST /activities` creates an activity draft;
- `POST /activities/:id/archive` or `/cancel` records a reversible lifecycle action;
- `POST /activities/:id/assignments/batch` stages and commits participant changes;
- `POST /activities/export` creates a full-scope export job;
- `GET /exports/:id` returns export status and the eventual download link.

This keeps the master list quick for daily administration while preserving the detailed, versioned activity and evidence model behind it.

## Terminology and confirmation gate

The internal table/API name `school_definitions` was too easily read as a school-creation screen. The administrator-facing name is now **School structure**. It covers academic years, reporting periods, classes, subjects, groups, departments, positions and labels; it does not create or register a school. The `kind` value is shown with a human label such as `Academic year`, `Reporting period` or `Class`, while the stable API/table name remains unchanged for compatibility.

All state-changing V4 actions now require a confirm/cancel popup immediately before the mutation. This includes creating a person, creating a role or school-structure item, saving an activity, adding or ending an assignment, changing role-permission mappings, committing a validated user/class import, and committing a role refresh. CSV/XLSX validation and preview remain read-only; the confirmation appears only before the upload/import commit. Export/download actions do not require confirmation because they do not change records.
