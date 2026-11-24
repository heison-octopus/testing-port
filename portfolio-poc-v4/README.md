# BHSS V4 — Stage 1 foundation
> Implementation note: read `AGENT-NOTE.md` before using any V4 CSV example.

Stage 1 was explicitly approved in chat on 18 November 2026. This is a runnable local POC with a provisional working layout, not the approved final product design. Stages 2–7 remain planned.

## Run

Requires a Node runtime with `node:sqlite` (tested with Node 25.2.1).

```sh
cd portfolio-poc-v4
npm ci
npm run dev
```

Open http://127.0.0.1:5184. API: port 4194. Sign in with `admin@a.demo`, `teacher@a.demo`, `student@a.demo`, or `denied@a.demo`; School B uses `@b.demo`. The synthetic password is `demo-stage1`. These are local fixtures, not production policy. New users receive no authority until an effective role is assigned.

`data/stage1.sqlite` is separate from V2/V3. It is created only when absent, migrated in order and never reset on startup. Tests use in-memory/disposable databases. `V4_DB_PATH` selects a separate test database. Access and refresh JWTs are HttpOnly, SameSite cookies; the access token is short-lived, the refresh token is rotated and extends the server-side session within the configured idle/absolute policy, and both are revoked on logout. The separate request key protects state-changing requests. In-memory sessions intentionally expire on server restart. Production cookies additionally require HTTPS. School isolation and current assignment checks run on each protected request.

## Structure

- `frontend/src/pages`: React pages; `components`: shared controls; `api.js`: shared API client with JSDoc/shared contract types.
- `frontend/vite.config.js`: Vite, React and Tailwind.
- `backend/routes`: endpoints and session/request middleware.
- `backend/controllers`: HTTP translation.
- `backend/services`: validation and permission/workflow rules.
- `backend/repositories`: SQL, ordered migration, transactions and scalar snapshots.
- `backend/config`: immutable demo permission profiles and rubric artifact validation; no active rubric yet.
- `backend/utils`: shared errors and time utilities.
- `shared/contracts.d.ts`: API contracts. JavaScript runtime validation remains server-side; no full TypeScript check is claimed.

## Implemented boundary

Seven functional tables: schools, users, roles, assignments, school_definitions, record_links and change_logs. `schema_migrations` is technical bookkeeping. Common physical keys are `id` and `row_version`; Stage 1 implements only the foundation column subset from the wider 18-table contract.

People creation; labelled roles; year/class/period/subject/group/department/position/label definitions; dated role/membership/allow-or-deny assignments; same-row deassignment with expected-version checking; current own scope; immutable scalar audit snapshots. Period-linked assignments use configured period dates. A student's membership requires a period. Subject→department links have a validated API; their visual editor is later work.

All writes and snapshots commit or roll back together. User snapshots include assignment children and related links. Password hashes are never in snapshots or responses. Later stages must extend graph reconstruction for their own children before claiming frozen publication support. Full audit coverage for sign-in failures/sensitive reads and production identity, retention and recovery remain later work. No rubric activation, questionnaire, activity, media or Portfolio workflow is implemented here.

## Checks

```sh
npm run build
npm test
npm run test:e2e
```

Backend tests cover authorization, dates, cross-school references, request keys, sessions, conflicts, rollback, reconstruction, retained artifacts and reopening a migrated database. Browser tests use separate contexts for Admin, Teacher, Student, Denied and School B. The shared review canvas retains approval and local evidence. No deployment is claimed.

## Schema example pack

The complete provisional all-18-table CSV pack is at `../output/v4/import-examples/barebones-v4/`. It includes minimal activity, teacher/student assignment, attendance, feedback/proof, media and Portfolio relationships. Stage 1 SQLite is seeded directly by JavaScript fixtures; it is not loaded from this pack.

## CSVs

Pre-stage CSV backup: `../output/import-examples-v2/stage-1/` with original paths and SHA-256 manifest. Current seven-table examples: `../output/import-examples/stage-1/`. These are fresh synthetic examples, not an import endpoint or production export; passwords are excluded. Existing flat legacy CSVs remain available for source comparison. Future stages back up affected active examples before changing them, without overwriting old backups.

## Authorization and activity slice

The local Stage 1 slice now uses short-lived JWT access cookies and rotating JWT refresh cookies. The key ID, issuer, audience, subject, session ID and token type are validated server-side; refresh rotates the refresh identifier and expiry, while server-side revocation and request-key protection remain active. Signing keys are an in-process demo ring and must move to managed secret storage before deployment.

Role labels and permissions are separate records: `roles` stores the school-scoped ID and English/Chinese labels, while technical `role_permissions` stores explicit `resource.action` allow/deny mappings. Position labels alone grant no access. The activity UI covers a five-step details/stages/people/evidence/review flow, dated teacher/student assignments, and CSV preview-before-commit batch changes. Questionnaire definitions and Portfolio interpretation remain later-stage boundaries.
