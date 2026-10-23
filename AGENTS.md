# BHSS MVP repository guide

## Project purpose

Build a traceable student-growth portfolio that connects activities and evidence to VASK, teacher/peer/self review, and the eight Universal Framework skills (16 steps per skill). It should show growth and evidence; it is not intended to be a simple marks leaderboard.

## Source-of-truth order

1. Original supplied documents are evidence, not to be silently rewritten.
2. Root Markdown files record the current interpretation and proposed architecture.
3. `output/` contains demonstrations, presentation material, and import examples; these are prototypes unless a root specification confirms the rule.
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

- `Core data relationships.md` — primary entity, cardinality, lifecycle, evidence, review, and human-in-the-loop model.
- `Aspects updated.md` — before/after data-model revision, naming conventions, and a separate Chinese version.
- `Roles and permissions.md` — Student, Teacher, SuperTeacher/staff, and SchoolAdmin permissions.
- `Presentation agenda.md` — concise IPO, scope, known/unknown register, traceability convention, and proposed discussion sequence.
- `Internal system review and manday estimate.md` — comparison of the two Word documents, component/page inventory, lean workflow, and internal effort ranges.
- `output/External lean MVP proposal.md` — stakeholder-facing recommended scope optimized for fewer mandays.

Read these four files before changing the domain model. Update them when a confirmed decision changes their assumptions.

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
- `output/D2 bhss-portfolio-ppt/` — presentation HTML, outline, and script.
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

## Change discipline

- For claims from an original source, record file, page, section, and a short quotation/paraphrase where possible.
- Label interpretations as `confirmed`, `recommended`, `assumption`, or `open`.
- Keep VASK, questionnaire constructs, eight skills, and 16 steps as separate concepts unless an explicit mapping joins them.
- Do not expose internal scope-cutting rationale in stakeholder slides unless requested; keep it in architecture notes.
- Prefer extending the existing CSV contracts and architecture documents over creating competing schemas.
