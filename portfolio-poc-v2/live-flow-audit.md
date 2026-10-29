# Portfolio v2 live role-and-flow audit

Status: internal System Analyst implementation check on 29 October 2026. This report covers only `portfolio-poc-v2`; it is not a record of BHSS or JC approval.

## Audit goal

Check one connected activity example across creator/participant/reviewer roles: who can create and open an activity, who receives a response or approval task, where student self and named peer responses are entered, where a named teacher assesses them, how memorable-activity curation reaches a Portfolio draft, which view is editable, and which view is the official read-only visualization.

The live check used the seeded Communication and Teamwork sports activities, Alex Lam as the student, and Wong Kai Ho as the assigned activity assessor. It combined browser interaction with API, access-control and end-to-end test coverage.

## Numbered walkthrough and evidence

1. **Initial student entry — usable but incomplete.** The student dashboard exposed activity and Portfolio counts, but no response workflow. Evidence: [`01-student-dashboard.png`](./live-flow-audit-artifacts/01-student-dashboard.png).

2. **Initial Portfolio — failed separation of concerns.** The old page mixed an official visualization, editing and memorable-activity choice. This made authorship, publication status and access boundaries unclear. Evidence: [`03-combined-portfolio-editor-view.png`](./live-flow-audit-artifacts/03-combined-portfolio-editor-view.png) and [`04-combined-portfolio-editor-bottom.png`](./live-flow-audit-artifacts/04-combined-portfolio-editor-bottom.png).

3. **Initial teacher entry — missing assessment surface.** The assigned teacher had no activity-assessment destination, even though approval and role data existed. Evidence: [`05-teacher-dashboard-no-assessment.png`](./live-flow-audit-artifacts/05-teacher-dashboard-no-assessment.png).

4. **Student activity responses — working after correction.** The student now sees separate named self and peer tasks. Each task identifies the activity, subject and perspective; draft, submitted, returned and approved states control editing. Approved content is visibly locked. Evidence: [`06-student-activity-responses.png`](./live-flow-audit-artifacts/06-student-activity-responses.png).

5. **Memorable activities — working as a separate curation flow.** The page has its own selection window, eligible approved/published activities, required reflection and submission status. It explicitly states that selection does not award or change a 1–16 step. Evidence: [`07-memorable-activities-separate.png`](./live-flow-audit-artifacts/07-memorable-activities-separate.png).

6. **Portfolio editor — working as a private working surface.** Only student-authored introduction content is editable here. Submitted memorable selections are assembled as traceable items, and submitting a working version does not alter the published view. Evidence: [`08-portfolio-editor.png`](./live-flow-audit-artifacts/08-portfolio-editor.png).

7. **Published Portfolio — working as a separate read-only visualization.** The page reads the latest approved published snapshot, shows only published skill results, and does not expose the newer working draft. Evidence: [`09-published-portfolio.png`](./live-flow-audit-artifacts/09-published-portfolio.png).

8. **Teacher/self/peer assessment — working with source separation.** The named assessor sees self and peer source states, can create one explicit peer assignment, enters three teacher feedback fields, and may add a proof-linked skill observation. Missing source responses stay missing rather than becoming zero. The page warns that this action does not publish a skill step. Evidence: [`10-teacher-assessment.png`](./live-flow-audit-artifacts/10-teacher-assessment.png) and [`10b-teacher-observation-controls.png`](./live-flow-audit-artifacts/10b-teacher-observation-controls.png).

9. **Unauthorized record link — blocked.** When Alex opened Bella's Portfolio editor URL directly, the server-owned identity check prevented the record from loading and the client returned Alex to the overview with a specific message. Equivalent API and end-to-end checks cover other students' response tasks and unassigned teacher activity/student pairs. Evidence: [`11-student-deep-link-denied.png`](./live-flow-audit-artifacts/11-student-deep-link-denied.png).

## Logic result

- Activity approval/publication creates the activity form assignment and named self/teacher recipients. Named peer access is created separately by an assigned assessor.
- A student may edit only their own self task or a peer task that names them as respondent. Submit freezes that revision; `changes_requested` creates a successor rather than changing history.
- A moderator may approve, reject or request changes only for a submitted self/peer response in an activity where they are assigned staff and have the assessment capability.
- Approved responses create source-linked proof with the student respondent retained as author and the moderator retained as reviewer.
- A teacher observation may cite submitted/approved self or peer sources, but remains excluded from official skill aggregation until separate review and publication.
- Memorable selection, Portfolio editing, Portfolio review and official Portfolio viewing are different records and pages with different access rules.
- UI visibility is not the security boundary: direct API calls repeat school, role/capability, activity assignment, lifecycle and record-ownership checks.

## UX and accessibility notes

The restored v1-inspired teal/orange hierarchy makes input, process and output areas easy to scan, and status labels are text rather than colour alone. Forms use visible labels, task state is explicit, and missing data is described rather than represented as a numeric result.

Remaining risks for a production release include a full keyboard-only pass, screen-reader announcement testing for route messages and status changes, focus movement after save/submit, responsive checks below tablet width, and a formal colour-contrast measurement. Screenshot review cannot establish WCAG conformance, and this audit did not test a production identity provider, consent/retention policy or public-link token model.
