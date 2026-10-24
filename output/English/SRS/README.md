# BHSS Growth Portfolio — SRS index

## Purpose

This directory contains the modular Software Requirements Specification for the BHSS Growth Portfolio. It converts the current architecture into testable requirements without treating unresolved school policy as confirmed.

The matching Hong Kong Traditional Chinese edition is in [`../../Chinese/SRS/`](../../Chinese/SRS/). Requirement IDs, limits, states, and decision references are identical in both editions.

## Source precedence

1. Original supplied documents are evidence and remain unchanged.
2. [`../Core data relationships.md`](../Core%20data%20relationships.md) is the current architectural baseline.
3. [`../Roles and permissions.md`](../Roles%20and%20permissions.md) defines the access model.
4. [`../Discussion questions.md`](../Discussion%20questions.md) controls unresolved decisions.
5. The runnable `mock-poc/` demonstrates possibilities; it is not the authority when it conflicts with the documents above.

## Requirement status labels

| Label | Meaning |
|---|---|
| Source requirement | Directly supported by a supplied source. |
| Confirmed working decision | Agreed for the current architecture, subject to formal client sign-off. |
| Recommended architecture | A concrete implementation recommendation awaiting confirmation. |
| Policy TBD | Business rule still requiring a named decision owner. |
| Temporary safety cap | Configurable technical limit used until policy is confirmed. |

## Modules

| File | Subject |
|---|---|
| [SRS-00](SRS-00%20Product%20scope%20and%20requirements%20index.md) | Scope, phases, shared rules, validation catalogue and traceability |
| [SRS-01](SRS-01%20Identity%20sessions%20and%20access%20control.md) | Authentication, roles, scopes, permissions and audit |
| [SRS-02](SRS-02%20School%20structure%20and%20academic%20periods.md) | Students, classes, membership history and rollover |
| [SRS-03](SRS-03%20Source%20systems%20imports%20and%20data%20quality.md) | CSV/XLSX imports, matching, correction and reconciliation |
| [SRS-04](SRS-04%20Activities%20participants%20and%20VASK.md) | Activities, staff, students, VASK and approval |
| [SRS-05](SRS-05%20Forms%20question%20blocks%20and%20governance.md) | Forms, questions, mappings, versions and approval |
| [SRS-06](SRS-06%20Assignments%20submissions%20and%20peer%20review.md) | Assignments, responses, review and peer allocation |
| [SRS-07](SRS-07%20Evidence%20media%20consent%20and%20external%20achievements.md) | Uploads, consent, moderation and certificates |
| [SRS-08](SRS-08%20Assessment%20eight%20skills%20and%20sixteen%20steps.md) | Evidence-backed observations and 1–16 steps |
| [SRS-09](SRS-09%20Portfolio%20Proud%20Moments%20and%20exports.md) | Portfolio snapshots, publication and external delivery |
| [SRS-10](SRS-10%20AI-assisted%20processing%20and%20provenance.md) | OCR, transcription and controlled drafting |
| [SRS-11](SRS-11%20Infrastructure%20security%20and%20operations.md) | Deployment, storage, jobs, backup and monitoring |
| [SRS-12](SRS-12%20Page%20catalogue%20and%20role%20visibility.md) | Pages, navigation and role-specific visibility |

## Shared interpretation rule

Where a policy is unresolved, the SRS states both `Policy TBD` and a separately labelled temporary technical cap. A temporary cap prevents accidental unbounded input; it does not answer the school-policy question.

