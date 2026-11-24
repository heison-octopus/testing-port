# BHSS V4 staged implementation estimation

## Purpose

This is an internal System Analyst estimate for planning the V4 implementation sequence described in `portfolio-poc-v4/planning/staged-implementation-plan.html`. It is an indicative effort range, not a quotation, delivery commitment or BHSS/JC approval.

The estimate assumes the existing Vite/React and JavaScript backend patterns, a synthetic fixture first, shared typed API boundaries, repository-only SQL, and one review cycle per stage. It excludes production deployment, production identity-provider work, provider contracts, formal penetration testing, school-wide training, and unresolved policy decisions.

## Stage estimate

| Stage | Scope | Status | Indicative effort | Main uncertainty |
|---|---|---:|---:|---|
| 0 | Plan and contract baseline | Preview | 2–4 person-days | Agreement on the 18-table boundary and acceptance evidence |
| 1 | Foundation, identity and shared history | Implemented locally | 8–12 person-days | Role/capability policy, effective assignments and migration discipline |
| 2 | Relational questionnaires and backend definitions | Planned | 8–12 person-days | Form governance, reusable question rules and import/diff approval |
| 3 | Activities, stages, attendance and responses | Planned | 10–15 person-days | Stage deadlines, attendance exceptions, peer assignment and resubmission rules |
| 4 | Media, processing runs and source evidence | Planned | 12–18 person-days | File limits, consent, durable imports, provenance and review of face/speech outputs |
| 5 | Assessment and evidence correction | Planned | 10–16 person-days | Rubric package, calculation policy, evidence impact traversal and withdrawal rules |
| 6 | Portfolio submission and frozen publication | Planned | 8–13 person-days | Portfolio content policy, publisher authority, exports and correction/reissue behaviour |
| 7 | Tests | Planned | 8–14 person-days | External contracts, recovery testing, regression breadth and release criteria |

**Indicative total:** 66–104 person-days, including the planning baseline and local implementation work. This is a range for staged product development, not a staffing plan; parallel work can reduce elapsed calendar time but does not remove review and integration effort.

## What each estimate includes

- Domain screens or workflow surfaces needed to demonstrate the stage.
- Typed client calls and layered route/controller/service/repository implementation.
- Validation, authorization and effective-date checks for the stage’s actors.
- Audit/history and snapshot evidence where the stage requires it.
- Synthetic fixtures, negative cases and focused browser/API checks.
- Review and correction of the stage’s acceptance evidence.

## What may increase the estimate

- Confirmed school rules that require new states, approval roles or policy tables.
- Multiple school-specific contracts instead of the documented core activity contract.
- Production identity, SSO, hosting, backup, retention or data-migration requirements.
- Real media-provider integration, biometric terms, speech providers or external imports.
- Full bilingual UI and document updates for every stage.
- Formal security, accessibility, performance or disaster-recovery testing.
- Rework caused by changing the 18-table boundary or rubric/calculation model after implementation.
