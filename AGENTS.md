# BHSS MVP repository guide

## Project purpose

Build a traceable student-growth portfolio that connects activities and evidence to VASK, teacher/peer/self review, and the eight Universal Framework skills (16 steps per skill). It should show growth and evidence; it is not intended to be a simple marks leaderboard.

## Source-of-truth order

1. Original supplied documents are evidence, not to be silently rewritten.
2. `output/English/` and `output/Chinese/` contain the current interpretation and proposed architecture in separate language sets.
3. Other files under `output/` contain demonstrations and import examples; these are prototypes unless the architecture documents confirm the rule.
4. When a rule is uncertain, keep it configurable and record the question instead of inventing a requirement.

## Original sources

- `Design ideas.docx` — original product/design proposal.
- `output/Questions.docx` — later discovery notes mixing requirements, suggested policies, and open questions; do not treat every value as confirmed.
- `Assessment/UF2.0 Cantonese Framework.pdf` — eight skills and their 16-step framework.
- `Assessment/UF 2.0 (Chi) on one page.pdf` — condensed framework reference.
- `Assessment/VASK清單.docx` — VASK vocabulary used to describe activities.
- `Assessment/10份技能問卷整理總表.xlsx` — supplied questionnaire/form examples; its constructs do not automatically equal the eight framework skills.
- `Assessment/Handbook for Educators DIGITAL.pdf` — educator/framework reference.
- `Aspects` — user's original data-model notes retained for comparison.

Temporary Office lock files beginning with `~$` are not sources.

## Current architecture references

- `output/English/Core data relationships.md` / `output/Chinese/核心資料關係.md` — primary entity, cardinality, lifecycle, evidence, review, and human-in-the-loop model.
- `output/English/Discussion questions.md` / `output/Chinese/討論問題.md` — single decision checklist for open high-, mid-, and low-level questions, with status and answer records.
- `output/English/Aspects updated.md` / `output/Chinese/資料欄位修訂.md` — before/after data-model revision and naming conventions.
- `output/English/Roles and permissions.md` / `output/Chinese/角色及權限.md` — Student, Teacher, SuperTeacher/staff, and SchoolAdmin permissions.
- `output/English/Presentation agenda.md` / `output/Chinese/簡報議程.md` — IPO, scope, known/unknown register, traceability convention, and proposed discussion sequence.
- `output/English/Internal system review and manday estimate.md` / `output/Chinese/內部系統檢視及人日估算.md` — source comparison, component/page inventory, lean workflow, and internal effort ranges.
- `output/English/External lean MVP proposal.md` / `output/Chinese/對外精簡MVP方案.md` — stakeholder-facing recommended scope optimized for fewer mandays.

Start with the English or Chinese `README.md`, then read the architecture, roles, agenda, and data-field documents before changing the domain model. Keep both language sets aligned when a confirmed decision changes their assumptions.

## Key working model

- An activity is configured with VASK and is packaged with one versioned form.
- A form contains ordered `question_sections`/`question_blocks`; sections contain reusable questions.
- Questions may map to one or more of the eight skills using explicit weights. A questionnaire source is the supplied whole instrument, not a database child of a form.
- Activity targets, responses, feedback, media, and observations are evidence. They do not automatically promote a student to a framework step.
- Teacher/TA review is the human gate when evidence affects a published 1–16 skill step.
- CHI/ENG/MATH/LS grades are partial supporting evidence only.
- Student external certificates may carry VASK without an official skill mapping.
- Media deletion is a soft disable with reason, actor, and timestamp.
- Form templates and submissions have separate draft/review/published-style lifecycles. Approval assignment is modelled separately from role membership.
- Peer review requires an explicit reviewer assignment.

## Demonstrations and generated artifacts

- `output/activity-evidence-simulator.html` — self-contained multi-role simulator with shared local browser state and reset.
- `output/D2 evidence-growth-system-map.html` — upload-to-growth system map and unresolved questions.
- `output/D1 bhss-skills-navigator/index.html` — eight-skill/step navigator.
- `output/D2 vask-skill-map/` — VASK-to-eight-skills visualization and workbook.
- `output/portfolioDummyData.html` — student portfolio mock-up.
- `D3 bhss-portfolio-ppt/` — bilingual presentation HTML, outline, script, and the current interactive POC; it remains at the repository root because the same artifact supports both languages.
- `mock-poc/` — runnable Vite + React + Ant Design POC with Express/SQLite MVC-style API, opaque server sessions plus request keys, role-aware screens, activity/class/student/year-transition generators, effective-dated student history, staged XLSX/CSV participant import, teacher questionnaire XLSX submission and student release gating, separate certificate/activity media libraries, JPG/PNG preview processing, a staff-controlled memorable-activity window, and explicit AI input disclosure. Start with `mock-poc/README.md`.
- `output/import-examples/` — example CSV contracts, manifest, enums, assignments, review history, external achievements, ratings, and peer review.

The simulator is illustrative and uses `localStorage`; it is not the production security or persistence architecture.

## Current recommended MVP boundary

- User/role management and basic authentication/session security.
- Academic year/reporting-period management.
- Activities, participants, VASK, and one activity-form package.
- Form versions, questions, skill mappings, approval assignment, submission, and review.
- Media/evidence linkage, access/consent metadata, feedback, and soft disable.
- Teacher/TA skill observations and a traceable portfolio view.
- CSV/XLSX import/export and dummy-data visualization.

## Current concerns and unresolved decisions

- Who has authority to approve form versions, activities, submissions, and published step changes?
- Is a teacher/TA framework rating mandatory for every activity or only evidence used for progression?
- What calculation, caps, thresholds, and decay—if any—combine teacher, self, and peer evidence into 16 steps?
- Is HKEAA an external assessor, a framework reference, or a required approval actor?
- How are peer reviewers assigned, protected, and moderated?
- What are the exact academic-year/period rollover and cross-year portfolio rules?
- What student/teacher surfaces are required: activities, marks, feedback, evidence, radar state, or all of them?
- What consent, image/audio access, retention, deletion, and guardian rules apply?
- Is deployment a shared hosted service, a school-local server, or a single-device workflow?
- What AI use is allowed beyond transcription/speaker separation, and which outputs always require human confirmation?
- Should Proud Moments affect progression, remain portfolio curation only, or be deferred from the MVP?

## Chinese language and translation standard

- Write Chinese deliverables in natural Traditional Chinese localized for Hong Kong readers. Prefer established Hong Kong education and administrative terminology over Taiwan- or Mainland-specific wording when a common Hong Kong term exists.
- Do not translate sentence by sentence or preserve awkward English syntax. Rebuild long sentences around natural Chinese logic and reading rhythm while preserving the original meaning, status, uncertainty, and level of formality.
- Use a professional, clear, discussion-oriented tone. Avoid machine-translated phrasing, inflated claims, unnecessary passive constructions, and decorative wording.
- Keep project terms consistent across files. Retain established English names or abbreviations where they are clearer or already used by the project, including VASK, Skills Builder, HKEAA, Portfolio, SuperTeacher, SchoolAdmin, and Time Infinity; explain them in Chinese on first use when useful.
- Treat the Chinese and English document sets as aligned standalone editions, not line-by-line translations. A Chinese document should read as if it was originally written in Chinese and should not include translation commentary unless explicitly requested.
- When English idioms, metaphors, or wordplay appear, use culturally appropriate meaning-based translation. Preserve brand names, proper nouns, and industry terms using their established forms.
- Keep tables, question IDs, decision statuses, source references, and architectural meanings synchronized between the two language sets even when the sentence structure differs.
- For user-interface wording, prefer concise Hong Kong usage such as `上載`, `下載`, `提交`, `退回修改`, `覆核`, `批核`, `同儕互評`, `班主任`, and `學年`. Use the terminology already established in the source document when it is authoritative.

## Change discipline

- For claims from an original source, record file, page, section, and a short quotation/paraphrase where possible.
- Label interpretations as `confirmed`, `recommended`, `assumption`, or `open`.
- Keep unresolved questions in the bilingual discussion registers and reference their stable IDs elsewhere. Update Core documents only when an answer becomes an architectural rule.
- Keep VASK, questionnaire constructs, eight skills, and 16 steps as separate concepts unless an explicit mapping joins them.
- Do not expose internal scope-cutting rationale in stakeholder slides unless requested; keep it in architecture notes.
- Prefer extending the existing CSV contracts and architecture documents over creating competing schemas.

## Application architecture and isolation rules

- Use Vite + React as the default web application stack unless a documented requirement approves another stack.
- React pages and visual components must not contain SQL, database calls, filesystem persistence, or direct server-side data access.
- UI code calls a shared typed API client. Group reusable queries and mutations by domain service so pages do not duplicate `fetch` logic or construct raw request details repeatedly.
- The server follows explicit layers: `route -> controller -> service/use-case -> repository -> database`. Route files define transport and authorization middleware; controllers translate HTTP input/output; services enforce workflows and policy; repositories contain SQL and persistence details.
- SQL must live only in the repository/data-access layer. Do not expose table structure, raw queries, database credentials, or internal storage paths to browser bundles or API responses.
- Prefer a clear set of narrowly scoped APIs over bypassing the API boundary. Every protected endpoint must enforce server-side role, assignment scope, lifecycle state, and media/consent rules as applicable.
- Share request/response types, validation schemas, error envelopes, enum definitions, and policy limits where practical. Frontend validation improves usability but never replaces server validation.
- Build reusable components around one responsibility. Pages compose domain components; data fetching, presentation, form state, and persistence concerns should not be collapsed into one large component.
- Use Tailwind utility classes and `@apply`-based semantic component classes for the default styling infrastructure. Keep repeated layout, typography, form, table, feedback, and status styles in shared layers rather than copying long utility strings across pages.
- Preserve the established visual rules: white page background, low-contrast separators, restrained pastel orange accent, pink/red background for unresolved requirements, brown-toned background for AI-generated material, and no unnecessary nested rounded containers.
- API calls must use authenticated sessions and the required request-protection token/key. Never place secrets, SQL, privileged filtering logic, or authorization decisions in client-side JavaScript.
