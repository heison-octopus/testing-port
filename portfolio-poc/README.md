# Modular student-growth portfolio POC

A separate, local proof of concept built from the BHSS English SRS and the 26 October bilingual meeting record, with CPCYD as a reference for imports, reports and audit. It does not use the existing BHSS POC. The reusable product direction is internal and is not BHSS/JC approval.

## Run

Requires Node.js 22.13+ with `node:sqlite` (tested on Node 25) and npm.

```sh
npm install
npm run dev
```

Open http://127.0.0.1:5173. The API binds to 127.0.0.1:3100 and SQLite persists to `portfolio.sqlite`. Demo accounts are selected on the sign-in page. `npm run build` typechecks and builds; `npm test` runs an isolated API test. With the app running and Playwright Chromium installed, `node tests/ui-walkthrough.mjs` exercises separate role sessions and writes demo records. To reset demo data, stop the server and remove `portfolio.sqlite` and any associated `-wal` / `-shm` files.

## Demonstrated path

The fictional learner Chan Mei participates in a piano competition, a facilitated discussion about fear of death, a positive university-or-work pathways conversation and a junior-prefect duty activity. The prefect record deliberately includes a missed timetable alongside teacher and peer evidence that she is kind and supportive.

1. Staff-created activities publish directly. Teacher-created activities move through `draft → submitted → rejected/published`, with the lifecycle log visible to the submitter and assigned staff.
2. Self review and assigned peer review are separate screens. Thirty seeded peer records represent ten fictional reviewers across three activities; assigned staff approve or reject each review before a sanitized statement becomes proof.
3. Student, teacher and staff media uploads enter `processing → awaiting_review → published`. OCR/text extraction is simulated; a human confirms the result before proof is created.
4. Teachers select accepted proof and record a POC-only Skills Builder observation. Assigned staff include or exclude observations with a reason. The responsible class teacher sees the underlying evidence and approves or edits the learner summary.
5. Publication uses the versioned `MAX-CONFIRMED` processor and freezes the result, approved summary and source tags. The student response omits internal proof IDs, raw peer text, reviewer decisions and decision reasons.
6. Disabling media creates a visible portfolio warning and does not silently recalculate. SchoolAdmin chooses whether regeneration may be triggered only by SchoolAdmin or also by assigned staff.
7. Prompt Studio provides balanced, academic and whole-person presets. Teachers can edit the prompt; every simulated attempt is logged by reporting period and report key, and an older version can be selected again.

The rubric's 16 sample conditions are placeholders and must not be used as real Skills Builder descriptors. VASK is descriptive only. RC360 awaits its official source. The school has not confirmed the real authority, access or consent policies.

## Architecture and extension points

React pages call a typed shared API client. Express follows route → controller → service → repository; SQL is confined to `server/repositories`. The database stores school, feature, user, assignment, activity, participant, form version, question, response, proof, catalogue, axis, level, observation, immutable review decisions, calculation policy, snapshot and audit records. Every school-owned operational record is scoped to one school.

`server/processors/registry.js` defines versioned input template descriptors and calculation processors. A calculation processor receives eligible candidate data and returns a result and IDs; the service owns validation, assignments, review, audit and persistence. The active policy names the processor version and the snapshot retains that policy and the precise inputs. Add a processor under a new key and policy version; never rewrite an issued snapshot. The two input templates can be selected for a successor draft; an assigned staff member publishes the version. This is a small demonstration, not a complete pluggable form engine. Presentation uses the frozen snapshot API independently of the processor.

`src/config/portfolioWidgets.ts` is the single portfolio layout registry. It controls widget visibility, order, width, title and visual variant without changing calculation or authorization. The learner-profile layout is adapted from the supplied Rethinking Assessment reference, not copied as a separate assessment model.

The generated profile and piano images are entirely fictional project assets. They must not be treated as supplied student media.

## Deliberate limits

This is a local demonstrator, not production security: account selection has no real credential verification; sessions are in process, lack expiry and production cookie hardening, and restart revokes them. Media upload, extraction, privacy filtering and AI generation are workflow simulations: no binary upload service, OCR provider, external privacy provider or LLM is connected. Consent, retention, guardian rules, staged spreadsheet round trips, production peer-assignment protection, multi-school administration and provider isolation still require implementation and approval. The Time Infinity screen documents an expected minimum contract only because no sanitized export or data dictionary has been supplied. Authorization is enforced on this POC's endpoints, but it is not a production security assessment.
