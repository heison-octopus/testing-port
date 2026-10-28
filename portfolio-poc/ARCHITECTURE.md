# POC architecture and delivery plan

## Intent and status

The 26 October bilingual record describes an internal common-core/modular product direction, with BHSS as the first reference case; it is not evidence of BHSS or JC approval. The implementation uses the BHSS SRS as its domain baseline and the CPCYD technical documentation as a reference for reporting, audit and import patterns. It is a local demonstration; the policy choices and illustrative rubric text are not school-confirmed rules.

## Implemented vertical slice

`Activity/self/peer/media input → staff moderation and extraction review → source-linked proof → teacher observation → staff inclusion decision → class-teacher summary approval → versioned MAX-CONFIRMED processor → privacy-filtered frozen portfolio snapshot`.

A versioned student form can use a long or short text template. A teacher prepares a successor draft, an assigned staff member publishes it, and existing responses remain linked to their original questions. Attendance can be recorded and absence exceptions approved. An administrator can inspect the demo policy and assignment state. Server-side checks enforce school, feature, role and the applicable record/approval assignment. The API is authoritative; UI navigation is derived from capabilities.

## Modular boundaries

- **Input template**: versioned key, audience and input type; template determines presentation and validation, not assessment. Future input adapters should normalize to the documented activity/response contract and retain source provenance.
- **Catalogue**: `kind`, version and independent assessment capability. VASK is labels-only. A rubric requires versioned axes, ordered levels and evidence conditions. Current sample conditions are placeholders; RC360 is not enabled.
- **Observation/review**: proof, activity, student, author, rubric axis, level, rationale and status are retained separately. Reviewer decisions append to the decision log; an observation is never an arbitrary source-free override.
- **Calculation**: the policy stores a versioned processor key. A processor receives candidates and returns the selected level and source IDs; the kernel controls authorization, validates inputs, owns records and freezes the calculation manifest. Future processor implementations need a versioned input/output schema, contract tests, school policy selection, strict output validation and isolation if run as external services. This POC has one in-process processor; it does not yet implement external processor APIs or dynamic plugin installation.
- **Portfolio**: reads an approved frozen snapshot, independent of the processor. A changed review decision marks the current snapshot stale; publication creates a new snapshot. Fine-grained dependency impact and withdrawal history remain to be implemented.
- **Peer evidence**: explicit reviewer assignments and raw peer comments remain separate from staff moderation. Approval creates a sanitized Proof List statement; rejection creates no proof. The 30 seeded reviews are fictional demonstration data.
- **Media**: media records retain uploader, student, activity, extraction and review states. Publication creates proof. Soft disable changes source/proof availability and creates a warning when the source was used, but does not automatically recalculate the snapshot.
- **Learner summary**: assigned staff decide observation inclusion; the responsible class teacher separately saves or approves the learner-facing summary after inspecting raw proof, activity context and approved peer statements.
- **Prompt generation**: presets and teacher-edited prompts are logged per period and report. Current output is deterministic simulation; no provider receives data. Selecting an older attempt changes the selected attempt only and does not rewrite a frozen snapshot.
- **Privacy**: the student portfolio uses an internal safe response that removes raw observations, internal IDs and decision history. `/api/privacy/contract` exposes an intentionally empty global identifier-replacement adapter contract for future integration.
- **Presentation**: `src/config/portfolioWidgets.ts` is the central widget registry; the portfolio consumes only frozen snapshot data and safe source labels.

## API surface

The API now includes activity creation/transition, self responses, peer moderation, form publication, media processing/disable, observation decisions, class-teacher summaries, portfolio publication/warnings, prompt attempts, privacy-contract inspection and administration policy controls. Mutations require the session cookie and request key. Demo account selection deliberately has no real credentials.

## Work remaining before the full preview or production acceptance

1. Implement staged CSV/XLSX activity and form-definition import, validation, identity matching, diff, audit and successor publication; add response-entry XLSX as a separate contract.
2. Extend forms to ordered teacher/student/peer blocks, explicit peer assignments, version history and approval queues. Add activity creation and broader lifecycle transitions.
3. Add real evidence/media storage, malware scanning, OCR/transcription providers, media grants and consent checks; complete correction, invalidation, dependency impact and audited withdrawal/reissue. Do not use real personal media with this demo.
4. Extend configurable school policies, effective-dated assignments, periods, school disablement and audit management. Obtain school decisions for H-03, H-07 and V2-D08 before treating publication or media authority as confirmed.
5. Add a real authenticated identity service, session expiry/revocation, secure production cookies, CSRF protection, security audit and deployment controls; test all protected endpoints with adversarial school/role/scope/lifecycle cases.
6. Add versioned processor contracts, strict validation and a real adapter boundary to independently deployed services; retain MAX-CONFIRMED as the only active calculation until a separately approved policy exists. Supply authorized rubric conditions and verify each definition before any real assessment.
7. Replace deterministic generation with an approved provider adapter only after privacy, prompt, retention and human-confirmation rules are agreed. Keep every attempt immutable and restore by selection, not overwrite.
8. Add staged Time Infinity import preview once a sanitized export and data dictionary exist. New source fields must either be justified as portfolio inputs or discarded during staging.
