# Staged component implementation plan

**Date:** 10 November 2026  
**Status:** Internal implementation plan and recommendations; not BHSS or JC approval.  
**Target:** `portfolio-poc-v2`, incrementally, using the existing layered API and canonical Core model. This plan does not itself change requirements, approve school policy, or assert that a POC feature is production-ready.

## Baseline and interpretation

Read `output/English/Core data relationships.md` as the relationship authority, `Roles and permissions.md` and SRS-00–13 for policy and acceptance, and the discussion register for open decisions. `output/import-examples/` contains illustrative linked records and contracts, not proof that each file can be imported. In particular, form definitions and response-entry workbooks are different contracts; CSV examples are not necessarily the same thing as a multi-sheet XLSX package.

The original-to-V2 comparison is `output/English/Playground v2 coverage against original proposal.md` (29 October). It identifies the original source and gaps; its implementation observations are dated. The newer `planning/v2-documentation-and-schema-gap-register.md` (10 November) identifies later code and issues to verify, including scoped template selection and the rubric workbook discrepancy. Reinspect implementation and tests before marking either report's observations current. The original `Design ideas.docx` remains evidence, not a replacement for the Core or proof of school approval.

**Planning meaning of templates:** input means structured source/import and activity form definitions; processing means versioned rubric definitions, assessment rules and review inputs, not automatic scoring; Portfolio means versioned section/layout and source selection. Role templates and capability routing are a separate cross-cutting workstream. Each version must have a stable identity, controlled lifecycle and explicit assignment; do not invent a general school-specific mapping engine.

## Delivery rules for every stage

1. Inventory existing route, service, repository, schema, UI and tests first; record actual status and requirement IDs. Reuse working paths and avoid replacing an entire component merely because a dated report says it is missing.
2. Define the contract and acceptance cases before implementation: row grain, keys and same-school references, required fields, actor and scope, version, state transitions, validation, errors, audit and downstream impact. Treat CSV examples as examples; identify any proposed schema additions separately.
3. Implement a small end-to-end slice through `route → controller → service → repository → database`, shared typed API client and focused UI. Enforce authorization and lifecycle on the server. Keep SQL in repositories. Apply the repository's UI and logic loop workflows where applicable.
4. Test happy path, invalid/cross-school/unauthorized access, stale revision, history preservation and relevant lifecycle transitions. Record evidence and remaining gaps before moving on. A seeded screen or table is not an end-to-end acceptance test.
5. Update both language editions when a confirmed architecture rule changes; record open policy in the bilingual discussion register with stable IDs. The POC currently uses a clean schema and explicit reset only for disposable data; never reset an existing working database without preserving it and explicit authorization. Before retained data, establish and test migrations, backup and recovery.

## Stages and dependencies

### 0. Baseline, traceability and safe fixtures

- Inventory current code, tests, API routes, data operations and schema, including form, rubric, Portfolio and role-template management and grade/programme scope resolution. Establish a dated matrix: requirement ID, implementation and test evidence, status, dependency and owner. Do not assume all CSVs are operational imports.
- Trace SRS-03's rubric workbook sheet count against Core and implementation: Core specifies five sheets. Resolve the documentation discrepancy in both languages without changing the underlying rule. Document allowed formats per domain.
- Set up isolated fixture data and a non-destructive test database; capture baseline tests and existing changes. List the implementation slices below with exact current status before starting each.
- **Gate:** reproducible baseline, prioritized matrix, and known gaps differentiated from unverified suspicions. No production school data or destructive reset.

### 1. Identity, permission routing and school context

- Build or complete a shared server authorization path: authenticated session → active school/feature → effective functional-role capabilities and dated scope → explicit deny → resource ownership/assignment, consent and lifecycle → decision. Position is not a permission. Resolve scope for the relevant student and date; do not trust client role, actor or school IDs.
- Inventory role definitions/versions, assignments, capabilities and overrides (CSV 22–23, 43–45, 60), plus approval policy/steps/assignments/decisions (46–50). Make role-template lifecycle and assignment migration explicit; publishing a successor must not silently change pinned existing assignments. SchoolAdmin policy authority does not grant reviewer authority without assignment.
- Route student, teacher, assigned SuperTeacher/staff reviewer and SchoolAdmin to their authorized work queues and record links. Navigation is usability only; every API and deep link must independently authorize. Make approval eligibility distinct from named assignment; use configured escalation for missing assignees.
- **Gate:** role/scope matrix tests for same-school allow, cross-school and explicit deny, expired assignment, wrong named reviewer, revoked session, hidden navigation and direct API access. This foundation precedes all write paths; extend the matrix at each later stage.

### 2. Input foundations and activity package

- Specify and implement only the selected first input contracts, using manifest and existing examples for identities, periods, activities and participants (00–05, 11, 13). Preserve original row custody, uploader versus author versus approver, versioned parser, staged preview, errors, correction/exclusion, authorized commit and reconciliation. Unknown layouts are held or rejected, not guessed. Absent rows in edit exports mean no change; explicit audited lifecycle actions handle disable/restore.
- Verify academic year/class and effective-dated memberships and school isolation before dependent imports. Define activity template/version and pin the chosen version if the current implementation lacks it; retain stable activity ID, approved revisions, one published form version, VASK intent and reporting period.
- Complete planned roster versus teacher-confirmed actual attendance and staff exception for a planned absence. Do not invent an absence-explanation form. Real Time Infinity integration and academic-result import wait for representative source data and agreed contracts; grades remain supporting evidence only.
- **Gate:** create/import → preview → correction → commit → activity approval/publication and attendance exception, with duplicate, stale, wrong-school and unauthorized cases; historical activity retains its pinned definitions.

### 3. Input template: form definitions and responses

- Inventory current form/question functionality against SRS-05/06 and CSV 06–07, 09, 12–15 and 19. Define ordered sections/blocks, reusable questions, question-owned source/meaning/valid ability, audiences and version references. Do not encode a fixed question-to-skill mapping.
- Implement or finish form library draft, definition XLSX export/edit/re-import, staged diff, successor draft, assigned review, approval and explicit publication. Existing activities/submissions remain tied to the exact published version; students continue on the last published version until publication. Keep response-entry XLSX separate with its own release/assignment checks.
- Complete named self/teacher/peer assignments, response revisions and moderation. Accepted responses register source-linked Proof List items with author and perspective preserved; peer access requires explicit assignment.
- **Gate:** edit a question, review diff, publish a successor and prove old assignments and answers remain unchanged; test rejected malformed/stale workbook, unauthorized publication and peer access. Verify both language labels without translating authored content.

### 4. Processing template: rubric package and human evidence review

- Inventory CSV 18, 20, 24–31, 36 and 58–61 alongside Core's rubric package and SRS-08/13. Validate the five linked workbook sheets, same-catalogue group/axis/level lineage, ordered levels and concrete conditions; define definition-only versus score-range validation without inventing defaults. Vocabulary-only VASK can label but cannot assess or produce a radar.
- Provide governed draft/review/publication and dated school/grade/programme assignment of rubric versions. Resolve effective student scope and ambiguity; pin the exact rubric and policy in each review/result. Prove one Skills Builder 1–16 path first; keep RC360 separate and never average unlike rubrics by default.
- Complete source-linked proof and observation selection: an assigned reviewer includes/excludes with a reason and reviews question, answer, activity and proof against the selected rubric. Apply the versioned `MAX-CONFIRMED` working policy only to eligible, included, unrevoked, human-confirmed satisfied observations; levels are not prerequisites. A proof-type maximum is a summary, not the official result. Require a named decision and exact evidence trace for publication; no source-free override.
- **Gate:** a new accepted source → human observation → selection → calculated candidate → authorized official publication with trace; test invalid lineage, incompatible catalogue, denial, no eligible evidence and pinned historical versions. A seeded result is not this gate.

### 5. Evidence and correction lifecycle

- Deliver typed media/work evidence, controlled storage and retrieval, provenance, consent/access metadata, review and soft disable with actor/reason/time under SRS-07 and school policy. Do not enable production face matching, speech or provider processing until relevant policy is settled. Student certificates can create proof without an official result.
- Trace dependencies from invalidated source or identity through proof, observation, result and Portfolio. Preview impact, mark dependants `needs_review`/`stale`, and support authorized withdrawal or audited successor publication; never silently recalculate a published result.
- **Gate:** disable/correct a source already used by a published result and show scoped impact, retained history, review and explicit reissue/withdrawal; test access and consent denial. Unresolved privacy decisions block production use, not synthetic POC work.

### 6. Portfolio template, assembly and publication

- Inventory CSV 53–55 and 62–65 and SRS-09/13. Complete template sections, draft/review/publish and dated school/grade/programme assignment; define precedence and reject ambiguity. Resolve student scope at the relevant date, pin template version and manifest hash with rubric/policy references in each working version and snapshot.
- Assemble student-owned content, approved narrative and selected eligible sources with explicit authorship and reviewer decisions. Keep student editor, assigned staff review, approval and published read-only view separate. Published view and export use an approved frozen snapshot, never a newer draft; curation does not change a skill result.
- Implement controlled export and the correction/reissue path after stage 5. Add academic and multi-period context only when its contract and cross-year policy are agreed; no claim that incomplete source types are present.
- **Gate:** change template assignment after a Portfolio is published and prove the old snapshot is reproducible; a new working version uses the correct scoped template; unauthorized users cannot see the draft, source or export. Test stale sources and explicit reissue.

### 7. Optional AI and integrations, then release readiness

- Only after evidence and publication controls, extend provider-neutral extraction/generation where authorized: freeze exact input manifest and memory range, retain provenance and independent candidates, and require human review. AI cannot accept proof, overwrite another candidate or publish a step. Real OCR/speech, external connector and notifications depend on approved source, privacy, provider and operating decisions.
- Replace demo identity/session mechanisms before deployment; establish school feature controls, migration/backup and recovery, security, observability and operations. Run role-based end-to-end regression from import through approved snapshot, with negative access and correction cases. Update the traceability matrix and both language sets.
- **Gate:** all chosen release requirements have evidence, unresolved policy is explicitly owned and contained, production controls are verified, and stakeholders separately accept the intended release.

## Decisions and sequencing controls

- Approval authorities, peer safeguarding, privacy/consent, academic grading/source semantics, cross-year rules and production identity remain open. Use existing stable discussion IDs; add a bilingual entry when no suitable ID exists. Configuration and synthetic fixtures must not be presented as school approval.
- Stage 1 supplies access checks for every later stage. Stages 2–3 supply source-linked proof; stage 4 makes official assessment possible; stage 5 makes source correction safe; stage 6 consumes frozen approved outputs. Template administration may be built in smaller slices, but publication must not bypass its dependencies.
- Execute one stage at a time and record its evidence and residual issues. If a policy blocks a production behavior, complete independent fixture-based work, document the dependency and do not invent the answer.
