# 20261030 backend schema and API handover

**Handover time:** 2026-10-30 15:12 HKT (UTC+08:00)  
**Working baseline:** Portfolio Playground v2, local `main` working tree based on `f70a116`  
**Delivery boundary:** disposable POC schema, database reset/bootstrap, seed/provenance mapping, repositories, services, controllers, API contracts and typed frontend clients. No page or visual component was changed in this slice.

**Backend-only amendment:** 2026-11-02 HKT, based on local `main` at `04b59de`. The System Analyst approved the recommended template foundation: school default plus optional grade/programme override; Portfolio presentation modes `inline`, `disclosure` and `link_button`; and a neutral minimal system Portfolio template that schools may supersede. This amendment is a System Analyst architecture decision, not BHSS or JC approval. No page or visual component was changed.

## 1. Decision status

These are approved System Analyst architecture decisions dated 30 October 2026. They are not BHSS or JC approvals.

1. The POC has no migration path yet. An empty database is created from one clean schema; an older database is rejected and must be explicitly rebuilt.
2. Destructive rebuilding is available only through `npm run db:reset`. Starting the server never erases an existing database.
3. Current route and response contracts remain compatible while repository storage and joins use the cleaned schema.
4. Status transitions use one `entity_lifecycle_events` table. `audit_events` remains separate because security/business audit and domain-state history have different purposes.
5. Portfolio versions/items/snapshots, rubric levels/step definitions, approval assignments/decisions, identity role/position/group relations, media assets/extractions and stable question identity/version remain separate because they enforce different integrity or lifecycle rules.
6. Activity approval checks that its selected form version is approved and published. It does not approve the form as a side effect.
7. Disabled labels/questions/blocks cannot be selected for new work. Pinned historical references remain readable and auditable.
8. Account identity, position, immutable role-template version, effective user-role assignment and named workflow assignment remain separate. A user-role assignment pins its exact role version and scope.
9. Rubric lifecycle and school selection are separate. Effective-dated `school_rubric_assignments` choose `activity_labelling` and `assessment_rubric` independently; no runtime branch selects a catalogue by code such as `VASK`, `RC360` or `RUB-SB-UF2`.
10. Portfolio structure is versioned configuration. Working versions and snapshots pin the exact Portfolio-template version and manifest hash; ordered/nested semantic sections carry presentation metadata without storing frontend component names or CSS.

## 2. Database reset and bootstrap

The previous 12-migration bootstrap, 85 domain tables, `schema_migrations` and `seed_state` have been removed. `server/repositories/schema.js` now contains one create-from-zero schema with 83 purposeful tables and `PRAGMA user_version=1`.

`server/repositories/database.js` behaves as follows:

- an empty SQLite database receives the clean schema;
- a database already matching the clean schema opens normally;
- an old or mixed schema fails immediately with an instruction to run `npm run db:reset`;
- `POC_V2_SEED_MODE=none` creates schema only; and
- demo mode seeds only when the school table is empty.

`npm run db:reset` removes only the configured SQLite file and its exact `-wal` and `-shm` companions, then recreates and seeds it. The repository database `portfolio-poc-v2/playground-v2.sqlite` was explicitly rebuilt on 30 October 2026 after approval. No production or retained school data was in scope.

## 3. Removed redundant storage

| Removed table/path | Canonical replacement and reason |
|---|---|
| `activity_vask_items` | `activity_label_assignments`. VASK is a labelling-capable catalogue, so a second VASK-only relation caused the same activity intent to be written twice. Legacy `vaskItems` API output is projected from VASK-labelled assignments. |
| `form_items` | `form_version_blocks → question_block_versions → question_block_items`. Each block item now freezes its key, prompts, respondent role, answer scale, ability and proof intent. Activity-specific edits retain the selected source block-item ID. |
| `peer_review_assignments` | `assignment_recipients` with `perspective='peer_observation'`, assigner, role assignment, due date, moderation flag and notes. The parent assessment assignment supplies activity and form version. |
| `feedback_evidence`, `observation_evidence` | `proof_items + proof_links`. Feedback and framework observations now cite the same source-linked proof relation used elsewhere. |
| `media_source_definitions` | `source_systems`. Import and media connector identity is no longer duplicated; import and media lifecycle status remain separate fields where one source serves both purposes. |
| `media_source_paths` | `activity_source_bindings`. The relation states why an activity uses a source and keeps the base reference opaque. |
| `rubric_import_drafts` | `import_batches + import_records + import_record_links`. Rubric XLSX staging now uses the same provenance, validation and commit ledger as other imports. |
| `activity_lifecycle_events`, `media_lifecycle_events` | `entity_lifecycle_events`. Domain status transitions share one append-only structure; `audit_events` is not merged into it. |

The old migration source file was deleted. No compatibility views or shadow tables recreate these removed write paths.

## 4. Purposeful separations retained

- `portfolio_working_versions`, `portfolio_version_items` and `portfolio_snapshots` separate editable work, ordered typed content and frozen official output.
- `portfolio_templates`, immutable `portfolio_template_versions`, ordered/nested `portfolio_template_sections` and effective-dated `school_portfolio_template_assignments` separate stable template identity, frozen definition and school selection.
- `rubric_catalogues`, `rubric_axes`, `rubric_levels` and `rubric_step_definitions` separate catalogue capability, axes, ordered levels and concrete 1–16 conditions.
- `school_rubric_assignments` selects a version by school, purpose, optional grade/programme scope and effective period without globally superseding other schools.
- `approval_assignments` and `approval_decisions` separate responsibility from immutable outcome.
- users, positions, stable role definitions, immutable role versions/capabilities, effective-dated user-role assignments and staff groups remain separate so a job title or account class is not treated as permission.
- `media_assets`, `activity_media` and `media_extractions` separate a media identity, its activity relationships and provider/review jobs.
- `question_definitions` and `question_versions` separate stable question identity from immutable wording/source/ability versions.
- `audit_events` remains independent from `entity_lifecycle_events`.

## 5. Seed and provenance mapping

The seed now writes directly to the canonical relations:

- 17 published form items become 17 ordered question-block items without a `form_items` mirror;
- six activity-label assignments include the three VASK activity intentions without a VASK-only mirror;
- peer rows from the supplied CSV become assignment recipients with explicit peer metadata;
- feedback and observation citations become proof links;
- media and import connectors share `source_systems`; Time Infinity has independent active import and pending media-resolution status;
- four activities receive `activity_source_bindings`; and
- all source CSV rows remain registered in the generic import ledger.
- 16 immutable role-definition versions are seeded, and runtime grants resolve through version-owned capability rows;
- the supplied VASK vocabulary and Universal Framework are selected through separate school-purpose assignments; and
- one neutral Portfolio-template version supplies six ordered semantic sections, including a nested evidence section and all three approved presentation modes.

The final seed passes `PRAGMA foreign_key_check` with no violations.

## 6. Filtered API and join contracts

All routes remain under `/api/v2` with authenticated session and request key. Existing route/DTO shapes remain available, while new work can use:

| Route | Purpose |
|---|---|
| `GET /directory/teachers` | Paged bilingual teacher/staff lookup by text, position, role, department, subject, group, capability, approval eligibility and scope. |
| `GET /catalogue-labels` | Paged labels/assessment axes filtered by catalogue, group, source, capability and lifecycle. |
| `GET /question-bank` | Paged source-linked question versions filtered by bank/source, construct, ability and lifecycle. |
| `GET /question-blocks` | Paged reusable blocks filtered by text, audience, ability, linked form and lifecycle. Items now come from the canonical block-item relation. |
| `GET /media-assets` and detail/mutation routes | Scoped media metadata, activity relations, extraction jobs and generic lifecycle history without exposing storage references. |
| `GET /policy/templates` | SchoolAdmin-only read model for role-template versions/capabilities, rubric catalogues/purpose assignments and Portfolio-template versions/sections/assignments. |
| `GET /portfolios/:studentId`, `/portfolio-editor/:studentId`, `/portfolio-view/:studentId` | Existing DTO plus the exact pinned Portfolio-template version, manifest hash and ordered/nested semantic sections. |

The current aggregate `/staff` and `/activities/reference-data` responses remain for visual compatibility. Their question and VASK fields are projections from canonical joins, not duplicate tables.

## 7. Files that changed materially

- `portfolio-poc-v2/server/repositories/schema.js` — clean schema.
- `portfolio-poc-v2/server/repositories/database.js` — create/validate bootstrap without migrations.
- `portfolio-poc-v2/scripts/reset-database.js` — explicit destructive reset.
- `portfolio-poc-v2/server/repositories/seed.js` — canonical seed and provenance mapping.
- activity, assessment, authoring, import, media, rubric and data-operations repositories — canonical joins and writes.
- identity repository — version-pinned role capability resolution; legacy role-capability rows are seed/import compatibility input only.
- Portfolio-template repository and Portfolio service — school/grade/programme resolution plus working-version/snapshot pinning.
- rubric repository/service — school-purpose assignments and a five-sheet package with explicit `rubric_levels`; no generated Skills Builder-style levels for unrelated rubrics.
- `portfolio-poc-v2/package.json` and `README.md` — reset/create-empty commands and POC lifecycle.
- bilingual Core/Aspects documents — generic lifecycle, unified source and peer-assignment mapping.

## 8. Verification completed

- `npm run db:reset`: passed on a disposable database and on the approved repository POC database.
- Clean-schema inventory: 83 tables; zero migration tables; zero retired compatibility tables.
- Seed inventory: 17 question-block items, six activity labels, ten assignment recipients, nine proof links, five unified source systems, four activity source bindings and no foreign-key violations.
- `npm test`: 35/35 backend and architecture-contract tests passed.
- `npm run build`: passed. The existing Vite chunk-size warning remains informational.
- `npm run test:e2e`: 14/14 browser workflows passed against the reset schema.

## 9. Frontend handover and intentionally deferred work

The next frontend slice should replace full-list hydration inside authoring selectors with the typed filtered clients, including debounced search, server pagination, loading/empty/forbidden/error states and bilingual literal role/position/label names. Historical-only definitions should render as warnings and never as selectable options. Portfolio pages should render the returned `template.sections` by `display_order` and `parent_section_id`, treating `presentation_mode` as a semantic choice (`inline`, `disclosure`, `link_button`) rather than a hard-coded screen fork. Frontend visibility remains advisory; protected API routes continue to enforce permissions server-side.

Still intentionally deferred:

- reusable-block create/revise/submit/approve/publish pages and mutations;
- extraction workers/providers beyond queued provider-neutral records;
- raw-media upload/streaming, malware scanning, derivative generation and consent-grant resolution; and
- retirement of aggregate compatibility endpoints after migrated-screen regression coverage.

Before production or retained school data exists, add an approved migration, backup, restore and rollback policy. The current create-from-zero reset is POC-only.
