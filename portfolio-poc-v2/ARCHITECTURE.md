# Playground v2 architecture note

Status: internal product POC based on the current Core interpretation and CSV contract 3.0. It is not presented as BHSS or JC approval.

## Stage boundary

| Stage | Purpose | UI | API | Persistence |
|---|---|---:|---:|---|
| Playground v1 | Existing `portfolio-poc` interaction proof | 5173 | 3100 | Existing v1 SQLite |
| Playground v2 | Revised Core, roles, scopes, approvals and versioning | 5174 | 3200 | `portfolio-poc-v2/playground-v2.sqlite` |
| Stage selector | Starts and links the registered stages | 3000 | — | `playground/registry.json` |

The selector registry is intentionally declarative. A future stage can be added without changing either POC.

## Extension rules

1. Add schema changes as a new numbered migration; never rewrite an already-applied migration.
2. Keep persistence and SQL in repositories.
3. Enforce lifecycle, assignment scope and approval policy in services.
4. Keep controllers limited to HTTP translation.
5. Return stable response models through `/api/v2`; do not expose raw table rows as an accidental contract.
6. Add a new API route or version for incompatible meaning changes.
7. Keep each workflow policy independent so a school can choose activity approval, Portfolio approval and publication approval separately.

## Activity-to-Portfolio workflow boundaries

The v2 implementation now separates the working records that were previously presented on one Portfolio screen:

```text
approved activity + exact published form
  -> named assignment recipient
  -> student self response / named peer response / named teacher observation
  -> submitted response moderation
  -> accepted source-linked proof
  -> memorable-activity curation
  -> student Portfolio working version
  -> staff review and approval
  -> immutable published Portfolio snapshot
```

- `assignment_recipients` grants access to one respondent, one student subject, one activity-form assignment and one perspective. Activity membership alone does not grant peer-review access.
- Student and peer submissions freeze on submit. `changes_requested` permits a successor revision linked to the returned submission; approved content cannot be edited in place.
- Accepted responses become source-linked proof while retaining the respondent as the declared author and the moderator as the reviewer.
- Teacher feedback and a candidate framework observation are separate records. A confirmed observation remains excluded from official aggregation until the distinct rubric review/publication workflow includes it.
- Memorable-activity selection changes Portfolio curation only. It cannot change a framework observation or published step.
- `/portfolio-editor/:studentId` exposes only the student's editable working surface. `/portfolio-review/:studentId` is assignment/capability controlled. `/portfolios/:studentId` reads the latest approved published snapshot only.
- Browser route guards improve navigation, but the service layer independently enforces user type, school, role capability, activity assignment and student ownership on every protected API.

## Structured ingestion boundary

CSV, XLSX and approved connector JSON are transport variants, not separate business workflows:

```text
file upload / allow-listed server connector
  -> format parser with size and shape limits
  -> activity_roster contract 1.0
  -> immutable original row + normalized working row
  -> same-school identity validation
  -> appended correction / exclusion decisions
  -> assigned activity editor commit
  -> source-linked activity_people row
```

- React sends files and connector requests through the shared typed client. It never receives connector credentials or storage paths.
- The connector adapter accepts only the source registry's server-side base URL, enforces its origin/path prefix, rejects redirects, limits response size and accepts JSON only.
- `import_batches` freezes source system, channel, relative source path or filename, source time, platform receive time, content hash, requester/uploader and parser version.
- `import_records` keeps the original payload unchanged. Corrections, decisions, entity links and batch events are append-only audit records.
- Commit is a separate authorized action and does not approve or publish the activity. Published activities require a successor working revision before a roster import can commit.
- No import endpoint or repository operation performs a hard delete. Superseded activity assignments remain present with effective dates and lineage.

Activity catalogue round trips use a separate contract because catalogue lifecycle and participant roster reconciliation are different use cases:

```text
authorized editable export (author omitted)
  -> activity_catalogue contract 1.0
  -> stable activity_id + expected revision conflict check
  -> staged delta (absence = no_change)
  -> explicit upsert | disable | restore
  -> no-op link | immutable successor draft | audited soft lifecycle event
  -> normal named activity approval remains separate
```

- SchoolAdmin has school-scoped import/export operation in the POC, not activity approval authority.
- A material `upsert` preserves `activities.created_by_user_id`, records the uploader as the revision/audit actor, and keeps the last approved revision official until normal approval advances it.
- Excluding a staged row means “do not apply.” It cannot disable the canonical activity. Only `lifecycle_action=disable` does so, with actor/reason/time and the prior operational state.
- Disable removes the activity from student activity, response, assessment and memorable-activity queries while retaining staff audit visibility. Dependency-impact records register proof, submission, observation, Proud Moment and Portfolio items for review.
- `restore` appends a lifecycle event; it does not erase disable history. Missing rows, no-op rows and disabled import batches never imply canonical deletion.
- POC contract 1.0 updates existing activities. Creation of a brand-new imported activity remains blocked until the product selects the explicit initial-owner/source-authorship policy required by IMP-FR-019.

## Deliberate limits

- Authentication is a local account switcher with opaque in-memory sessions and a request key; it is not production identity management.
- The POC proves activity-roster and existing-activity catalogue runtime contracts. The 56 manifest contracts are source-custody records, not a completed generic mapping engine for every domain.
- The POC uses one demonstration school and period.
- Approval is the lean named-assignment model; arbitrary workflow graphs are outside this stage.
- The AI workspace stores frozen manifests, independent candidates, immutable human decisions and audited narrative edits. An optional OpenAI-compatible local provider is reached only through a server-side adapter; missing configuration leaves manual review available.
- The `/chatbox` UI is a v2-only diagnostic surface for the same authorized teacher/staff scope. Its transcript is browser-local and identity-namespaced; every model discovery and streamed completion still crosses the authenticated `/api/v2` boundary, and prompts are not written to SQLite or audit details.
- AI candidates cannot accept proof, publish a Portfolio or change a rubric step. OCR remains a provider-neutral contract and deterministic test stub until an evidence-upload workflow exists.
- English／Traditional Chinese localization selects bilingual interface copy and stored `*_en`／`*_zh` fields. Student-authored text, decision reasons and audit content are not silently machine-translated.

The optional local-provider integration and persisted review state are an internal System Analyst direction dated 29 October 2026. They are not presented as BHSS or JC approval.
