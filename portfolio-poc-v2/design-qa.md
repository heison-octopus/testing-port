# Portfolio v2 design QA

## Scope

- Product area: `portfolio-poc-v2` only.
- Visual source: Portfolio v1 account picker, teacher dashboard and learner Portfolio.
- Verification viewport: 1440 × 1000 CSS pixels.
- Functional source: current SRS/Core activity package, named approval and official Portfolio rules.

## Evidence

- `design-qa-artifacts/visual-comparison.png` — same-input v1/v2 comparison sheet.
- `design-qa-artifacts/v2-after-account-picker.png`
- `design-qa-artifacts/v2-after-teacher-dashboard.png`
- `design-qa-artifacts/v2-after-activity-package.png`
- `design-qa-artifacts/v2-after-approval-inbox.png`
- `design-qa-artifacts/v2-after-learner-portfolio.png`

## Visual checks

| Area | Result | Evidence |
|---|---|---|
| Account picker | Passed | Restored dark-teal/white split, orange eyebrow, large product proposition, ruled identity list and Input → Process → Output framing. |
| Shell/navigation | Passed | Restored pale sidebar, teal selected state, orange INPUT/PROCESS/OUTPUT labels, low-contrast separators and lean top bar. |
| Teacher dashboard | Passed | Restored teal hero hierarchy, orange action, ruled three-stage flow and compact operational metrics; counts now come from live API records. |
| Activity workspace | Passed | Uses ruled activity rows, stable-ID detail, visible creator, package facts, workflow visualization and restrained flat panels. |
| Approval inbox | Passed | The record title, revision, creator, named assignee, due date, decision reason and direct activity link are visible in one scan. |
| Learner Portfolio | Passed | Restored teal section header, eight-skill 1–16 visualization, official snapshot separation and source-linked narrative treatment. |
| Responsive fallback | Passed | Major two-column surfaces collapse at tablet/mobile widths without introducing nested card stacks. |

## Functional checks tied to the design

- Server resolves the reporting period from the complete activity date range and blocks cross-period records.
- Activity submission requires participants, VASK intention, risk flags and one approved published form version.
- Activity approval and publication are separate named assignments with retained reasons.
- Approval records open `/activities/:activityId`; Portfolio rows/links open `/portfolios/:studentId`.
- Server-backed record access is rechecked after sign-in. Unauthorized activity or Portfolio links return to the overview with an explanation.
- Students receive only the current approved and published activity revision; staff relationships, change requests and approval history are not projected to them.
- Returned revisions require an immutable successor; pending revisions are locked until withdrawal.
- Open change requests can be accepted into an audited successor or rejected with a reason.

## Severity review

- P0: none found.
- P1: none found.
- P2: none found in the verified v1-aligned surfaces.

Final result: passed
