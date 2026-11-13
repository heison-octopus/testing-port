# V3 Stage 0: baseline and traceability

10 November 2026. Internal implementation planning; not BHSS or JC approval. This inventory is an entry point for implementation, not a certification that V2 satisfies each requirement. Owner for implementation and verification: project team; school policy decisions remain with their proper decision owners.

## Source order and sequencing

Core governs domain relationships; the bilingual SRS describes requirements; supplied originals remain evidence. CSV examples and V2 are not proof of approved policy. [Whole-schema comparison](../../portfolio-poc-v2/planning/whole-schema-comparison.md) inventories entity differences; [gap register](../../portfolio-poc-v2/planning/v2-documentation-and-schema-gap-register.md) records detailed gaps and IDs. Reinspect each slice before implementation: both files are dated and the V2 working tree has uncommitted changes.

The canvas stage numbering groups the definition-first addendum's stages 1–2 into V3 stage 1, separates its activity/forms into stages 2–3, and places evidence correction before Portfolio publication. The original staged plan has a different numbering; identify a stage by title and source as well as number. This grouping is implementation sequencing, not an architectural decision.

## Definition inventory and evidence index

Status 'located' means code or tests exist, not that behavior is complete. CSV IDs below refer to the addendum's examples; a manifest entry does not imply an operational importer. Exact fields and complete requirement-to-test mapping remain work for each stage.

| Domain / definition | Primary requirements and examples | Located V2 paths and test evidence | V3 dependency / status |
|---|---|---|---|
| Position, role, capability, override, feature | Core identity, SRS-01/02; CSV 22–23, 38–39, 43–45, 60 | `services/access.js`, `identityService.js`, `repositories/identityRepository.js`; `api.test.js` navigation, staff filters and explicit deny | Stage 1; role versions, expiry, isolation and named assignment need slice-specific verification |
| School, periods, membership and scope | Core school, SRS-02; CSV 00–05 | `repositories/schema.js`, `identityRepository.js`; role navigation and direct API tests | Stage 1; effective-date and cross-school cases need explicit V3 coverage; rollover H-08 open |
| Approval policy, step, assignment and decision | Core approvals; CSV 46–50 | `approvalService.js`, `approvalRepository.js`; coordinator and named approval API tests | Stage 1 and each workflow; actual authorities remain open |
| Import and activity contracts, roster and attendance | SRS-03/04; CSV 00–05, 11, 13 | `importService.js`, `activityService.js`, related repositories; roster and catalogue API and browser tests | Stage 2; source layouts, actual attendance and approval exceptions require focused verification |
| Activity type, version and VASK label | Core activity, SRS-04; CSV 20, 24–25 | activity and authoring services/repositories; authoring catalogue tests | Stage 2; labels are intent, not assessment; activity-template version coverage unverified |
| Instrument, questions, blocks and form versions | Core forms, SRS-05; CSV 06–07, 09, 12–15 | `authoringService.js`, `authoringRepository.js`; question version and custom questionnaire tests | Stage 3; definition spreadsheet round trip and version pins require full E2E |
| Response workbook and assignments | SRS-05/06; CSV 12–15, 19 | activity/assessment services and self/peer response tests | Stage 3; response-entry contract separate; peer safeguarding open |
| Academic results and grading | SRS-03; proposed source contract in gap register | No operational contract established by this inventory | Later extension; sanitized source and policy required; grades supporting evidence only |
| Proof/media types, consent and provenance | Core evidence, SRS-07; CSV 08, 29–31, 34–35 | `mediaService.js`, `mediaRepository.js`; metadata and soft-disable API test | Stages 4–5; production privacy and full invalidation chain open/unverified |
| Rubric versions, axes, levels, conditions | Core rubric, SRS-08/13; CSV 24–28, 58–61 | `rubricService.js`, `rubricRepository.js`; workbook/successor API test | Stage 4; five sheets; lineage and complete official assessment E2E need verification (GV-02) |
| Aggregation policy and review | Core, SRS-08 | `assessmentService.js`, `assessmentRepository.js`; non-auto-publication test | Stage 4; MAX-CONFIRMED is working policy, not school approval |
| AI, memory and provider contracts | SRS-10/13; CSV 32–33, 37 | `aiService.js`, provider adapters; candidate persistence API/browser tests | Stage 7; permissions and provider terms unresolved |
| Portfolio template and assignment | Core Portfolio, SRS-09/13; CSV 53–55, 62–65 | `portfolioTemplateRepository.js`, `templatePolicyService.js`; rubric successor API test | Stage 6; scoped assignment and historical pinning require independent V3 E2E |
| Snapshot, export and visibility | SRS-09 | `portfolioService.js`, `portfolioRepository.js`; publication API and editing browser tests | Stage 6 after correction lifecycle; sharing and reissue rules remain open |

## Conflict record

- **GV-01, corrected:** Core's rubric section requires five linked sheets including `rubric_levels`; SRS-03 and SRS-13 in both languages previously listed four. Four SRS passages now match Core. V2 `rubricService.js` declares all five. This is alignment to an existing System Analyst direction, not BHSS/JC approval. The API workbook test is evidence for V2, not a complete lineage assessment.
- **Sequencing:** definition-first and original stage numbers differ; see mapping above. Neither supersedes Core.
- **GV-02:** valid IDs alone may not establish same-catalogue lineage. Treat as unverified until adversarial tests and code inspection prove otherwise.
- Policy, consent, peer safeguarding, grading and cross-year decisions remain open in bilingual discussion registers; no fixture decides school policy.

## Baseline and isolation

V2 build and tests use its existing, currently modified workspace; results establish only this checkout's baseline. API tests use a temporary database (`tests/api.test.js`); browser fixture creates its own temporary database (`tests/e2e/start-fixture.js`). Never run `db:reset` or point tests at retained data. V3 should have a distinct directory, database path and per-run temporary database, with refusal to overwrite an existing file. Before retained data, implement migrations, backup and recovery; do not inherit V2's disposable reset practice. Use synthetic accounts, separate Playwright browser contexts by role and server-side negative tests.

First proposed executable V3 E2E: seed two synthetic schools and roles into a fresh test database; sign in as a permitted user; verify the authorized school context and route; verify cross-school resource/API denial, explicit deny and revoked session. Assert persisted state and audit where the approved contract requires it. This is a planned test, not a result. Stage 1 preview must specify the exact UI, roles, fixtures and lifecycle semantics before implementation.

Baseline run on 10 November 2026: `npm run build` passed (Vite reported a large-chunk warning); `npm run test:api` passed 35 tests; `npm run test:e2e` passed 14 Chromium tests. These are V2 results with synthetic disposable databases, not evidence of V3 behavior. The matrix is a domain-level index: exact table/API/requirement-by-requirement and owner mapping is not yet complete and must be expanded before the corresponding slice is approved.
