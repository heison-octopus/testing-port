# BHSS Portfolio Playground v2

Playground v2 is the schema-first proof of concept for the revised Core data relationships and CSV contract 3.0. It is deliberately separate from `portfolio-poc/` (Playground v1).

The interface supports English and Hong Kong Traditional Chinese. Use the `EN／繁中` toggle on the account picker or top bar; the choice is retained locally and existing bilingual Core/CSV display fields are selected without translating authored student, teacher or audit content.

## What this stage demonstrates

- stacked staff positions without treating job titles as permissions;
- functional role assignments with school, subject, department, class, group and activity scope;
- staff search by position, role, capability, subject, department, group and approval eligibility;
- effective capability calculation from role grants plus school/group/user overrides, with applicable explicit deny taking precedence;
- stable activity IDs with immutable material revisions and separate change requests;
- complete activity packages with server-resolved reporting period, participants, VASK intention, risk flags and one exact approved/published form version;
- one activity-roster ingestion contract shared by CSV, XLSX and an allow-listed Time Infinity JSON connector, with staged preview, row-level correction/exclusion, separate commit, and immutable source custody;
- a separate activity-catalogue CSV/XLSX delta contract: editable export omits original author, absent rows mean no change, stale revisions conflict, material edits create successor drafts, and only explicit audited actions soft-disable or restore an activity;
- approval eligibility separated from named approval assignments and immutable decisions;
- activity approval and activity publication as separate named, reasoned decisions;
- approval rows that identify the target/creator/revision and open the authorized activity record directly;
- separate student activity-response tasks for self reflection and explicitly assigned peer review, with frozen submissions, moderation and successor revisions after changes are requested;
- a named activity-assessment workspace that keeps student, peer and teacher records separate and allows proof-linked teacher observations without automatically publishing a 1–16 step;
- memorable-activity selection as its own curation workflow, independent from assessment and Portfolio editing;
- separate student Portfolio working editor, staff review workspace and read-only published visualization, so a newer draft cannot leak into the official view;
- server-guarded record links at `/activities/:activityId`, `/imports/:batchId`, `/responses/:recipientId`, `/assessments/:activityId/:studentId`, `/portfolio-editor/:studentId`, `/portfolio-review/:studentId` and `/portfolios/:studentId`; unauthorized deep links return to the overview without exposing the record;
- v1-aligned visual hierarchy and live activity/approval/Portfolio visualizations;
- escalation queue records for unassigned or overdue work.

The learner narrative and initial candidates are seeded demonstration content. Playground v2 can optionally call an OpenAI-compatible local LLM through the Node server. The browser never receives provider credentials or calls the provider directly.

Authorized teacher/staff accounts can open the **AI drafts** workspace to inspect a frozen input manifest, generate parallel non-overwriting candidates when the optional provider is configured, persist human decisions, and retain separate generated/edited/final text states. AI output cannot accept proof, publish a Portfolio or change a rubric step.

The same authorized accounts can open the v2-only model playground directly at <http://127.0.0.1:5174/chatbox>. It discovers the provider's current models rather than assuming `LOCAL_LLM_MODEL` exists, streams replies through the authenticated Node API, and shows the reported context window, approximate local-history size, provider token usage, time to first token, generation time, total response time and WPM after the initial wait. Chat history is capped at 100 messages and stored only in this browser's `localStorage`, separately for each demo identity; clearing browser storage or using **Clear local history** removes it.

SchoolAdmin also has a bilingual **POC page catalogue** aligned to SRS-12, the External lean MVP proposal and the Internal system review. It labels each recommended role page as implemented, partial or recommended next so this focused v2 slice is not mistaken for the full P1 product.

The live role-and-flow audit, including before/after screenshots and its evidence limits, is recorded in [`live-flow-audit.md`](./live-flow-audit.md).

## Run it

From this directory:

```bash
npm install
npm run dev
```

Open <http://127.0.0.1:5174>. The API listens on `127.0.0.1:3200`. Development mode also starts a deterministic Time Infinity roster fixture on `127.0.0.1:3210`; the browser still reaches it only through the protected server connector.

Optional local generation is configured only in the server environment. The npm server and LLM utility commands automatically load `portfolio-poc-v2/.env` when it exists. Never expose these values through `VITE_*` variables:

```bash
export LOCAL_LLM_BASE_URL=http://192.168.2.136:8990/v1
export LOCAL_LLM_API_KEY=your-local-secret
export LOCAL_LLM_MODEL=your-model-name
npm run dev
```

An approved deployment configures the roster connector with server-only values such as `TIME_INFINITY_ROSTER_BASE_URL`, `TIME_INFINITY_API_KEY` and `TIME_INFINITY_TIMEOUT_MS`; see `.env.example`. The UI can enable or disable a registered source but cannot edit an endpoint or secret.

To run the stage selector and both POCs from the repository root:

```bash
cd playground
npm run dev
```

Open <http://127.0.0.1:3000>. Playground v1 remains on port 5173 and Playground v2 remains on port 5174.

## Standalone data lifecycle

The default database is `portfolio-poc-v2/playground-v2.sqlite`. On first start, additive migrations build the database and the current contracts under `output/import-examples/` seed it once. Runtime changes are then independent of the CSV files. Every file in `00_upload_manifest.csv` is also registered in the provenance ledger with its repository-relative source path, declared upload time, seed time and SHA-256 digest—even when that contract is only catalogued and not loaded into a domain table.

Import rows are never hard-deleted. Pre-commit exceptions are excluded or restored through appended decisions. A post-commit exclusion leaves the linked activity assignment intact and marks the link for human review. A committed batch is immutable; a source or uncommitted batch can only be disabled with actor, reason and timestamp.

### Create a schema-only database

To create a separate SQLite database containing every current migration and table but no demo school or domain rows, run:

```bash
npm run db:create-empty
```

The default output is `portfolio-poc-v2/playground-v2-empty.sqlite`. The migration ledger remains populated because it records which schema versions were applied; all domain tables are empty.

Supply another filename after `--` when required:

```bash
npm run db:create-empty -- ./my-empty.sqlite
```

The command refuses to overwrite an existing database or matching `-wal`／`-shm` file. To start v2 against the generated database without loading demonstration CSV data:

```bash
POC_V2_DB=./playground-v2-empty.sqlite POC_V2_SEED_MODE=none npm run dev
```

This schema-only instance has no school or demo account, so the account picker is empty until initial school, user, role and policy data are loaded. Use the normal `npm run dev` command for the seeded demonstration.

To create a fresh local demo database, stop the v2 server, remove only `portfolio-poc-v2/playground-v2.sqlite` plus its `-shm` and `-wal` companions, and start it again. This reset is intentionally not automated because it deletes local demonstration changes.

Tests use a temporary database and deterministic fake LLM instead of the working POC database or LAN provider:

```bash
npm test
npm run test:e2e
npm run test:all
```

`npm run llm:models` lists the model IDs returned by the configured local server. `npm run test:llm:live` discovers models first: when `LOCAL_LLM_MODEL` is unset it lists the available models and skips the completion; when the configured model is unavailable it lists the alternatives and exits with an error. The completion check uses synthetic text and never sends student data.

`LOCAL_LLM_MODEL` is optional for the chatbox. When it is blank or unavailable, the page asks the user to choose from the live discovered list. The context-window value appears only when the provider includes one of the supported context-length fields in its `/models` response.

## Change isolation

The browser never reads SQLite or CSV files. It calls a shared typed client under `src/api/`. The server uses the following boundary:

```text
route -> controller -> service/use-case -> repository -> SQLite
```

Provider calls use a second server-only boundary: `service/use-case -> provider adapter -> local LLM`. The provider cannot query SQLite or publish platform records.

SQL is confined to `server/repositories/`. Adding a new table should normally require an additive migration and a repository/service change; existing pages continue consuming their current API response contracts. A breaking API meaning should use a new endpoint or API version rather than silently repurposing an existing field.

This is future-compatible isolation, not a claim that every future schema change will require no code. The goal is to prevent a new table from coupling directly into React pages or breaking unrelated bounded contexts.
