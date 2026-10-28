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

## Deliberate limits

- Authentication is a local account switcher with opaque in-memory sessions and a request key; it is not production identity management.
- CSV import is a first-seed bridge, not a school-specific schema-mapping engine.
- The POC uses one demonstration school and period.
- Approval is the lean named-assignment model; arbitrary workflow graphs are outside this stage.
- The AI narrative field demonstrates provenance and teacher editing only. No AI execution is implemented.
- The dummy AI-draft workspace remains visible to authorized teacher/staff accounts and demonstrates frozen inputs, parallel candidates, source links and human states. Only provider/extraction/generation execution routes are omitted.
- English／Traditional Chinese localization selects bilingual interface copy and stored `*_en`／`*_zh` fields. Student-authored text, decision reasons and audit content are not silently machine-translated.
