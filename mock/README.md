# BHSS Growth Portfolio mock POC

This folder is a local, self-contained proof of concept built from the repository's current Core, Roles, Discussion Questions, supplied questionnaire workbook, and import examples. It uses React, Vite, Ant Design, Tailwind `@apply`, Express, and SQLite.

The current scope-v2 interpretation is in `../output/English/Current findings and questions v2.md` and `../output/Chinese/最新發現及問題 v2.md`. The POC implements one core input contract; it is not a per-school schema-template engine.

## Run

```bash
npm install
npm run dev
```

Open `http://127.0.0.1:4173`. All demo accounts use the password `demo123`:

| Username | Role |
|---|---|
| `student1` | Student 1 |
| `student2` | Student 2 |
| `teacher` | Class Teacher (the default teacher meaning) |
| `activityteacher` | Activity Teacher |
| `staff` | Staff reviewer |
| `admin` | SchoolAdmin |

For the production-style build:

```bash
npm run build
npm start
```

Open `http://127.0.0.1:4174`.

## Architecture

- **View:** React pages and reusable components in `src/`; Ant Design supplies accessible controls while `src/styles.css` applies the approved visual rules.
- **Controllers/routes:** `server/controllers` and `server/routes` validate HTTP actions and role scope.
- **Services:** `server/services` owns dated class resolution, school-year rollover, XLSX/CSV import and export, audit logging, and explicit AI input assembly.
- **Models:** `server/models/repository.js`, `server/models/platformV2Repository.js`, `server/models/formDefinitionRepository.js`, and SQLite tables in `server/schema.sql` provide CRUD persistence. SQL remains in this data-access layer.
- **Security POC:** the password is scrypt-hashed; login creates an opaque server-side session in SQLite; the browser receives an HttpOnly cookie plus a per-session request key. Every protected API call requires both.

## Student history rule

`students.id` is the stable identity. `student_class_memberships` and `student_school_status_history` are separate effective-dated histories. Activities store only participant `student_id`; the API resolves the class active on the activity date. A move such as 2B → 2C, retention, regrading, leave, or later return therefore does not rewrite earlier activity history.

The year-transition generator first creates a comparison batch. A possible new student is labelled `new_candidate` and must be explicitly confirmed before an identity and class membership are created. Missing/outgoing records remain visible for manual follow-up.

## AI boundary

The POC does not call an external LLM. Before creating a deterministic sample draft, it displays the exact JSON that would be sent, including source account, timestamp, included records, excluded data, prompt profile/version, and review state. AI output is never allowed to publish a 1–16 skill step automatically.

## Spreadsheet and media workflows

- The **form-definition XLSX** is an authoring contract. An authorized teacher reviews the activity purpose and available question abilities, downloads the definition workbook, edits wording/audience/order/scale/ability fields, uploads it for validation and row-level comparison, then creates a successor draft form version. Students remain on the previous published form until explicit publication.
- The **response-entry XLSX** is a separate contract. In this POC it supports 1–5 currently published teacher-audience questions. The teacher fills one row per student, uploads it as a private draft, corrects validation errors, and explicitly submits it. Students see only their own row from the latest submitted batch. Starting a correction does not hide the last submitted batch.
- The activity generator offers matching XLSX and CSV participant templates. An upload is staged before activity creation; Student IDs remain editable while resolved names and current classes are shown for confirmation. The original and corrected values are audited.
- The Media Library accepts JPG and PNG, validates the actual image, protects the original, and creates a reduced preview. Students have separate Certificate and Activity Media tabs. Teacher uploads default to teacher-only; student certificates default to pending teacher review.
- Staff or SchoolAdmin must manually open the memorable-activity window for the active reporting period. A student may then choose one published joined activity and add a reflection. This curation record does not change VASK or any skill step.
- These spreadsheet, matching, visibility, image-preview, and eligibility workflows are deterministic and do not send data to an LLM.

## Scope-v2 demonstration

- An activity has public and private descriptions, times, a student-upload window, cover treatment, planned participants, media state, and approval state.
- The activity teacher confirms actual attendance. A planned participant marked absent remains pending until staff approves or returns the difference; there is no assumed absence-explanation form.
- VASK and activity-type labels are descriptive. Skills Builder is an assessment-capable 1–16 rubric. RC360 is present only as `pending_source` until the official rubric arrives.
- One form can contain teacher, student, and peer blocks. A draft audience block is hidden until a teacher publishes it; peer review still requires a reviewer-to-subject assignment.
- Each JPG/PNG upload creates a queued processing-job record. The Processing page also demonstrates isolated face candidates, multilingual speaker chunks, and human-confirmed rubric evidence.
- The Learner Profile page demonstrates S1–S3 claims, source citations, “Why this output?” provenance, skill radar, unresolved interests, and student-introduction submission followed by teacher approval.
- The POC uses deterministic seeded output and isolated test labels. It does not call a face, speech, or LLM provider.

## Source traceability and unresolved rules

- Seed questions preserve the workbook name, sheet, row, construct, subdomain, scale, and negative-item flag from `Assessment/10份技能問卷整理總表.xlsx`.
- Seed questions preserve a valid question-owned ability definition. There is no fixed Question → VASK/RC360/Skills Builder mapping or normalized mapping weight.
- Accepted responses, feedback, media and external records enter one typed Evidence / Proof List. Human-confirmed rubric observations cite those proof items; the demo publishes the highest confirmed level per axis without requiring all earlier levels.
- Activity dates resolve their school period on the server. A cross-period range is blocked for teachers unless the activity is split or an authorized exception is introduced.
- The Review / Outlook AI screen lets staff choose a school-period memory range and exact source classes. It creates positive source-linked candidates only and cannot accept proof, downgrade a learner or publish a rubric result.
- Unconfirmed requirements remain in the `requirements_decisions` table and appear on pale-pink UI sections.
- The database is created at `data/bhss-poc.sqlite`. Use `npm run reset`, then restart the API, to reseed it.

## Verification

```bash
npm test
npm run build
```

The tests cover keyed sessions, historical class resolution, explicit AI payloads, server-side JPG/PNG preview processing and queued work, form-definition XLSX staging/diff/version publication, response-entry release gating, roster identity correction, media publication, memorable-activity gating, attendance mismatch approval, label/rubric capability, audience-block publication, processing access, and student-introduction approval. Browser evidence is stored under `ui-evidence/`.
