# BHSS Growth Portfolio mock POC

This folder is a local, self-contained proof of concept built from the repository's current Core, Roles, Discussion Questions, supplied questionnaire workbook, and import examples. It uses React, Vite, Ant Design, Tailwind `@apply`, Express, and SQLite.

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
- **Models:** `server/models/repository.js` and SQLite tables in `server/schema.sql` provide CRUD persistence.
- **Security POC:** the password is scrypt-hashed; login creates an opaque server-side session in SQLite; the browser receives an HttpOnly cookie plus a per-session request key. Every protected API call requires both.

## Student history rule

`students.id` is the stable identity. `student_class_memberships` and `student_school_status_history` are separate effective-dated histories. Activities store only participant `student_id`; the API resolves the class active on the activity date. A move such as 2B → 2C, retention, regrading, leave, or later return therefore does not rewrite earlier activity history.

The year-transition generator first creates a comparison batch. A possible new student is labelled `new_candidate` and must be explicitly confirmed before an identity and class membership are created. Missing/outgoing records remain visible for manual follow-up.

## AI boundary

The POC does not call an external LLM. Before creating a deterministic sample draft, it displays the exact JSON that would be sent, including source account, timestamp, included records, excluded data, prompt profile/version, and review state. AI output is never allowed to publish a 1–16 skill step automatically.

## Spreadsheet and media workflows

- In an activity, an authorized teacher downloads a five-question XLSX, fills one row per student, uploads it as a private draft, corrects validation errors, and explicitly submits it. Students see only their own row from the latest submitted version. Starting a correction does not hide the last submitted version.
- The activity generator offers matching XLSX and CSV participant templates. An upload is staged before activity creation; Student IDs remain editable while resolved names and current classes are shown for confirmation. The original and corrected values are audited.
- The Media Library accepts JPG and PNG, validates the actual image, protects the original, and creates a reduced preview. Students have separate Certificate and Activity Media tabs. Teacher uploads default to teacher-only; student certificates default to pending teacher review.
- Staff or SchoolAdmin must manually open the memorable-activity window for the active reporting period. A student may then choose one published joined activity and add a reflection. This curation record does not change VASK or any skill step.
- These spreadsheet, matching, visibility, image-preview, and eligibility workflows are deterministic and do not send data to an LLM.

## Source traceability and unresolved rules

- Seed questions preserve the workbook name, sheet, row, construct, subdomain, scale, and negative-item flag from `Assessment/10份技能問卷整理總表.xlsx`.
- Question-to-eight-skill mappings are seeded from `output/import-examples/10_question_skill_mappings_example.csv` and remain `draft`.
- Unconfirmed requirements remain in the `requirements_decisions` table and appear on pale-pink UI sections.
- The database is created at `data/bhss-poc.sqlite`. Use `npm run reset`, then restart the API, to reseed it.

## Verification

```bash
npm test
npm run build
```

The tests cover keyed sessions, historical class resolution, explicit AI payloads, server-side JPG/PNG preview processing, questionnaire release gating, roster identity correction, media publication, and the staff-controlled memorable-activity window. The role-isolated browser verification script is `ui-evidence/verify-questionnaire-media.mjs`.
