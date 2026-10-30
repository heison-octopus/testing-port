# Portfolio v2 SRS implementation gap

**Assessment date:** 29 October 2026  
**Scope:** `portfolio-poc-v2` only  
**Status:** Internal System Analyst implementation assessment; not BHSS or JC approval

## Executive result

The current POC now proves a connected, server-enforced path across activity creation, named approval/publication, student self and peer response, teacher assessment, memorable-activity curation, Portfolio working/review/published views, AI narrative candidates, an activity-roster import contract, and a separate existing-activity catalogue delta contract.

It is still not a complete implementation of the SRS. The English SRS set contains **305 requirement identifiers** across SRS-00 to SRS-13. SRS-00 is a cross-product index, while SRS-01 to SRS-13 contain the domain requirements. The largest remaining gaps are media/evidence and consent, official rubric-result review/publication, form-library governance and XLSX round trips, cross-period/export behaviour, production identity and operations, and full dependency-impact resolution/reissue after a source correction or activity disable.

The import slice materially closes SRS-03 for the activity-roster and existing-activity catalogue use cases, but it does not turn all manifest contracts into one generic mapping engine.

## Current implementation health by SRS module

| Module | Current POC health | Demonstrated now | Material remaining gap | Overlapping planning range |
| --- | --- | --- | --- | ---: |
| SRS-00 Product scope/index | **Traceability only** | Major workflow surfaces are connected and role separated. | The index is not a separate backlog; closure depends on the modules below and open school policies. | Not separately estimated |
| SRS-01 Identity, sessions and access | **Strong POC / partial production** | Opaque server sessions, request key, stacked roles, scoped capability checks, explicit deny, named assignments and protected deep links. | Production identity provider, secure-cookie deployment settings, session administration, disabled-school and feature-policy enforcement on every use case, complete sensitive-read audit. | 10–16 |
| SRS-02 School structure and periods | **Partial** | One school, effective-dated roles/history, academic periods and server period resolution. | Administrative class/year/group/period pages, rollover workflow, promotion/history controls, multi-school operating proof. | 8–12 |
| SRS-03 Imports and data quality | **Strong two-contract vertical** | Roster CSV/XLSX/allow-listed JSON plus activity catalogue CSV/XLSX; source custody, preview, append-only correction/exclusion, delta/no-op semantics, optimistic revision conflicts, successor drafts and explicit soft disable/restore. | Downloadable reconciliation/audit exports; creation policy for brand-new imported activities; runtime users/periods/forms/responses/results/media contracts; connector media modes; full impact resolution/reissue. | 7–12 |
| SRS-04 Activities, participants and VASK | **Strong POC** | Stable activity/revision identity, owner/editor, participant roster, VASK intention, form version, named approval and separate publication. | Live attendance confirmation/exception page, access dates, broader roster management, post-publication successor handling across all related records. | 8–12 |
| SRS-05 Forms and question governance | **Partial** | Exact published form version, ordered questions, audience-specific response rendering and immutable historical assignment. | Form library/editor, reusable sections/blocks, source/ability administration, definition XLSX export/import/diff, successor publication and response-entry XLSX. | 12–18 |
| SRS-06 Assignments, submissions and peer review | **Strong POC** | Named self/peer tasks, explicit peer assignment, drafts, frozen submissions, moderation and successor revisions after return. | Bulk assignment/monitoring, reminders, safeguarding/anonymity policy options, fuller exception and due-date operations. | 6–10 |
| SRS-07 Evidence, media, consent and achievements | **Major gap** | Accepted text responses become source-linked proof; seed data includes some media/certificate concepts. | Private upload/object storage, consent grants, previews/scanning, evidence library, external achievements, media soft-disable UI, retention and raw-media access. | 22–34 |
| SRS-08 Eight skills and sixteen steps | **Partial** | Versioned axes/levels, separate perspectives, proof-linked teacher observation, observed step and consistency kept separate, no automatic publication. | Proof-type comparison, include/exclude review, `MAX-CONFIRMED`, official result approval/publication/reissue, dependency impact and longitudinal explanation. | 20–32 |
| SRS-09 Portfolio, Proud Moments and exports | **Moderate POC** | Separate memorable selection, student working editor, class-teacher/staff review, latest-approved fallback and read-only published snapshot. | Full evidence drill-down, annual/cumulative outputs, XLSX/PDF/SLP export, withdrawal/reissue, sharing policy and cross-year rules. | 12–20 |
| SRS-10 AI and provenance | **Moderate POC** | Frozen manifests, independent candidates, provider/model/prompt provenance, human decisions, separate generated/edited/final narrative states, provider adapters and manual fallback. | Executable extraction jobs, consent/feature re-checks, claim-level review, stale propagation, broader controlled profiles, production provider evaluation and monitoring. | 18–30 |
| SRS-11 Infrastructure, security and operations | **Architecture POC / production gap** | Vite/React typed client, layered Node API, parameterized repository-only SQL, an explicit create-from-zero POC schema/reset workflow, deterministic tests and server-held secrets. | Approved production migration/backup/restore policy, production database/object storage, job queue/outbox, monitoring, health/readiness, rate limits, secret rotation, deployment hardening and operational audit tooling. | 25–40 |
| SRS-12 Page catalogue and role visibility | **Moderate** | Capability-driven navigation; Activities, responses, assessment, approvals, memorable selection, Portfolio editor/review/view, imports, AI review, staff search and policy surfaces. | Tasks/notifications, classes/students operations, form/evidence/media pages, correction impact, exports, user/group/period/audit/session/source administration. | 12–20 |
| SRS-13 Scope v2 rubric and learner profile | **Partial** | Source-linked narratives, separate Portfolio surfaces, selected skill summary, authorship/provenance fields and human-review boundaries. | Official rubric processing path, claim-level “Why this output?”, media/extraction review, interest taxonomy, correction impact, affected-result withdrawal/reissue and annual/cumulative learner profile. | 20–32 |

The module ranges overlap heavily. SRS-12 is mostly the UI expression of other domains, and SRS-13 intentionally combines requirements from evidence, rubric, AI and Portfolio modules. They must not be added mechanically.

## SRS-03 requirement check after this implementation

| Requirement | Result | Evidence / remaining qualification |
| --- | --- | --- |
| IMP-FR-001 | **Demonstrated** | Batch stores source system, contract version, SHA-256, uploader/requester, source time and platform receive time. |
| IMP-FR-002 | **Demonstrated** | Upload/connector response is staged and row-previewed before a separate commit. |
| IMP-FR-003 | **Demonstrated for roster** | Rows can remain unresolved, be corrected, excluded, restored or committed independently. |
| IMP-FR-004 | **Demonstrated** | Original JSON remains unchanged; corrections append before/after, identity, reason, actor and time. |
| IMP-FR-005 | **Demonstrated outside import** | Missing response is a non-numeric response state in the assessment workflow; the roster contract has no response values. |
| IMP-FR-006 | **Demonstrated** | Every correction passes the same normalization and identity validation before the batch can become ready. |
| IMP-FR-007 | **Demonstrated** | Same school/source/contract/activity/content hash returns the existing active batch. |
| IMP-FR-008 | **Missing** | Errors are visible in the UI/API but no downloadable reconciliation file exists. |
| IMP-FR-009 | **Open by SRS** | Runtime roster 1.0 is intentionally narrow; final multi-contract columns and fallback identity policy remain configurable/TBD. |
| IMP-FR-010 | **Demonstrated for Time Infinity fixture** | Endpoint comes from a server-only environment key; origin/path prefix, redirects, content type, response size and timeout are enforced. A real approved endpoint remains an external dependency. |
| IMP-FR-011 | **Partial** | Source key, source activity key, retrieval time, actor and validation outcome are retained. Opaque media reference/observed media metadata are outside the roster contract. |
| IMP-FR-012 | **Missing for media** | JSON records are normalized; metadata/short-lived URL/media-byte modes are not implemented. |
| IMP-FR-013 | **Demonstrated** | Batch is school-bound and student resolution filters active students in the same school. |
| IMP-FR-014 | **Partial** | Post-commit exclusion is append-only and marks its entity link `needs_review`; full observation/claim/generation/snapshot impact preview and propagation are not built. |
| IMP-FR-015 | **Demonstrated** | Activity catalogue contract is a partial delta; tests prove that a one-row file leaves an omitted activity unchanged. No authoritative-snapshot mode exists. |
| IMP-FR-016 | **Demonstrated for existing activities** | Stable ID plus expected revision is validated; a material change creates a successor draft and keeps the approved revision official. Brand-new activity creation is deliberately blocked. |
| IMP-FR-017 | **Demonstrated** | `upsert`, `disable` and `restore` are explicit; excluding a staged disable row has no canonical effect; restore appends a lifecycle event. |
| IMP-FR-018 | **Demonstrated for exported governed fields** | Material catalogue edits become a draft and do not auto-approve. VASK/evidence configuration is not yet editable in catalogue 1.0. Roster remains a separate contract. |
| IMP-FR-019 | **Partial** | Original activity creator is preserved; owner/uploader/committer/approver remain distinct. New imported-activity initial ownership/source authorship is blocked pending the selected policy. |
| IMP-FR-020 | **Demonstrated for editable export** | Export includes stable ID, expected revision, owner, governed fields, action and reason; it omits creator/uploader and rejects stale revisions. A separate downloadable audit export is not built. |
| IMP-FR-021 | **Partial** | Disable removes student activity, response, assessment and memorable surfaces; history remains staff-visible and proof/submission/observation/Proud Moment/Portfolio dependencies are registered for review. There is no media fetch surface or automated published-output withdrawal/reissue yet. |
| IMP-FR-022 | **Demonstrated for shared invariants** | Platform editing and catalogue import both enforce service-layer scope, immutable successors and separate approval. Their UI forms are intentionally different entry points. |
| IMP-FR-023 | **Demonstrated** | Repositories/routes expose no hard-delete operation; activity disable/restore and import exclusion are additive/soft lifecycle records. |

## What changed in this slice

- Added a source registry, versioned import contract, immutable batch/row ledger, correction/decision/link/event records, and soft-disable metadata.
- Registered all 56 files in `output/import-examples/00_upload_manifest.csv` with repository-relative source path, declared source time, actual seed time and content hash.
- Added bounded CSV and XLSX parsers plus an allow-listed, server-authenticated JSON connector adapter.
- Added same-school identity matching, row correction, reversible exclusion/restore and idempotent staging.
- Added an authorized roster commit that creates, retains or supersedes `activity_people` rows without deleting history; activity approval/publication remains a separate workflow.
- Added a SchoolAdmin activity-catalogue export/import contract with delta semantics, expected-revision conflicts, no-op rows, immutable successor drafts, original-author preservation and explicit audited soft disable/restore.
- Added dependency-impact registration and server-side removal of disabled activities from student activity, response, assessment and memorable-activity surfaces while retaining staff audit access.
- Added the bilingual Data imports page, direct `/imports/:batchId` links, activity-to-import entry, source custody panel and v1-aligned flat teal/orange visual treatment.
- Added API, parser-contract and browser coverage for the working roster scenario and denied student access.

## Remaining manday interpretation

These are internal engineering estimates, not a quotation or stakeholder commitment. They assume one school, reuse of code only after technical audit, supplied sample data, and no waiting time for school decisions, legal review, hardware or historical data cleansing.

| Target from the current POC | Remaining estimate | Meaning |
| --- | ---: | --- |
| Close the next functional POC gaps | **70–105 mandays** | Media/evidence, one official Skills Builder result path, form governance, exports and missing operational pages, still using controlled local infrastructure. |
| UAT-hardened lean non-AI MVP | **65–95 mandays** | Reuse the current activity/response/Portfolio/import work, then add production identity, media, official results, exports, operations, testing and handover. This stays within the existing total 95–130 manday planning envelope only if the POC survives audit. |
| UAT-hardened selected AI pilot | **95–145 mandays** | Adds one real extraction/suggestion/generation route, human review, provenance, correction impact, evaluation and monitoring; aligns with the existing cumulative 125–175 manday range after limited POC reuse. |
| Broad implementation of the full current SRS interpretation | **160–240+ mandays** | Includes generalized forms/contracts, media and consent, official rubric processing, wider operational pages, production infrastructure and selected AI; privacy-sensitive face/speaker processing or multi-provider flexibility can exceed this range. |

The highest schedule risk is not the remaining page count. It is unresolved authority/consent/retention/output policy combined with the evidence-to-official-result dependency chain. The next defensible vertical slice is:

> private evidence upload → consent/provenance validation → proof review → observation inclusion/exclusion → official Skills Builder result → Portfolio snapshot/reissue

## Evidence limits

- A passing POC scenario is not production security, accessibility certification, stakeholder acceptance or data-protection approval.
- The Time Infinity server used by local development and automated tests is deterministic fixture data. A real connector requires an approved endpoint, credentials, terms, representative failures and reconciliation samples.
- Seeded published skill results demonstrate visualization only; they do not prove that new observations can yet become an official result.
- Whole-SRS module health is an implementation assessment, not a formal requirement-by-requirement acceptance sign-off. The SRS statuses and open decision IDs remain authoritative for uncertainty.
