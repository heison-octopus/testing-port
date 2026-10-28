# BHSS Portfolio Playground v2

Playground v2 is the schema-first proof of concept for the revised Core data relationships and CSV contract 3.0. It is deliberately separate from `portfolio-poc/` (Playground v1).

The interface supports English and Hong Kong Traditional Chinese. Use the `EN／繁中` toggle on the account picker or top bar; the choice is retained locally and existing bilingual Core/CSV display fields are selected without translating authored student, teacher or audit content.

## What this stage demonstrates

- stacked staff positions without treating job titles as permissions;
- functional role assignments with school, subject, department, class, group and activity scope;
- staff search by position, role, capability, subject, department, group and approval eligibility;
- effective capability calculation from role grants plus school/group/user overrides, with applicable explicit deny taking precedence;
- stable activity IDs with immutable material revisions and separate change requests;
- approval eligibility separated from named approval assignments and immutable decisions;
- activity, Portfolio and publication workflows configured independently;
- student Portfolio working versions, class-teacher item selection, staff approval and published snapshots;
- latest student work shown separately from the latest official published version;
- escalation queue records for unassigned or overdue work.

The learner narrative is seeded dummy content. Playground v2 has no LLM provider, prompt execution, generation route or hidden AI call.

The AI interface is not removed. Authorized teacher/staff accounts can open the dummy **AI drafts** workspace to inspect a frozen input manifest, parallel non-overwriting candidates, source links, prompt/provider metadata, human decisions and separate generated/edited/final text states. Those controls are visual POC state only and cannot execute AI, accept proof, publish a Portfolio or change a rubric step.

SchoolAdmin also has a bilingual **POC page catalogue** aligned to SRS-12, the External lean MVP proposal and the Internal system review. It labels each recommended role page as implemented, partial or recommended next so this focused v2 slice is not mistaken for the full P1 product.

## Run it

From this directory:

```bash
npm install
npm run dev
```

Open <http://127.0.0.1:5174>. The API listens on `127.0.0.1:3200`.

To run the stage selector and both POCs from the repository root:

```bash
cd playground
npm run dev
```

Open <http://127.0.0.1:3000>. Playground v1 remains on port 5173 and Playground v2 remains on port 5174.

## Standalone data lifecycle

The default database is `portfolio-poc-v2/playground-v2.sqlite`. On first start, additive migrations build the database and the current contracts under `output/import-examples/` seed it once. Runtime changes are then independent of the CSV files.

To create a fresh local demo database, stop the v2 server, remove only `portfolio-poc-v2/playground-v2.sqlite` plus its `-shm` and `-wal` companions, and start it again. This reset is intentionally not automated because it deletes local demonstration changes.

Tests use a temporary database instead of this file:

```bash
npm test
```

## Change isolation

The browser never reads SQLite or CSV files. It calls a shared typed client under `src/api/`. The server uses the following boundary:

```text
route -> controller -> service/use-case -> repository -> SQLite
```

SQL is confined to `server/repositories/`. Adding a new table should normally require an additive migration and a repository/service change; existing pages continue consuming their current API response contracts. A breaking API meaning should use a new endpoint or API version rather than silently repurposing an existing field.

This is future-compatible isolation, not a claim that every future schema change will require no code. The goal is to prevent a new table from coupling directly into React pages or breaking unrelated bounded contexts.
