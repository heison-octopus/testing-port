# BHSS student growth portfolio deck outline

## Proposed format

- Theme: `minimal-light`
- Language: English headings with key Chinese source quotations where traceability matters
- Visual approach: functional diagrams, comparison tables, timelines, and source badges; no decorative stock imagery
- Traceability: every source-backed claim carries a `DI-xx` badge; the notes and appendix include the original sentence, page, and section
- Statement types: Source requirement, Proposed interpretation, Open decision

## First section

### Slide 1 — Cover

- Type: Title slide
- Title: BHSS student growth portfolio
- Subtitle: Original design intent, current interpretation, and decisions still required
- Visual: Three-part legend for source requirement, proposal, and open decision

### Slide 2 — The original design idea

- Type: Statement plus evidence
- Core message: Create a complete, continuing, and personalized record of academic and non-academic learning and growth
- Supporting points: Multi-source evidence; multiple perspectives; student, teacher, and school audiences
- Sources: DI-01, DI-02, DI-03

Speaker framing: the product should help teachers see students whose demonstrated participation, abilities or growth may be missed by academic results and memory-based discussion. Do not claim that the platform creates strengths where no evidence exists. Status: **Discussed on Meeting Oct 26 - kickstart**.

### Slide 3 — What the platform is meant to do

- Type: Input–process–outcome diagram
- Input: Existing systems, activities, reflections, media, work, and assessment
- Process: Extract, classify, integrate, review, and present
- Outcome: Evidence-linked portfolio and long-term growth record
- Sources: DI-04, DI-05, DI-06, DI-07

### Slide 4 — What we know and what we do not know

- Type: Two-column comparison
- Known: Intended evidence sources, longitudinal portfolio, VASK core, Skills Builder framework, central integration direction
- Unknown: Calculation rules, year rollover policy, landing view, approval ownership, consent/retention, and technical architecture
- Sources: DI-05, DI-06, DI-08, DI-10, DI-11, DI-13, DI-20

### Slide 5 — Portfolio-only boundary

- Type: In-scope / out-of-scope comparison
- In portfolio: Student timeline, activities, selected evidence, reflection, published feedback, evidence-backed skill state, meaningful moments, next steps
- Outside portfolio surface: Form review queues, user administration, system audit logs, unrestricted raw media, draft AI claims
- Basis: PI-05 with DI-02, DI-03, DI-07, DI-09, DI-17

### Slide 6 — Student surface: activities, feedback, and skill state

- Type: Annotated wireframe
- Recommendation: Show an activity timeline as the primary narrative; display teacher feedback and evidence-linked skill status in the same detail view; avoid a marks-only landing screen
- Interaction: Overview card → activity detail → evidence and feedback → skill-step explanation
- Status: Proposed interpretation; confirm with school
- Sources: DI-02, DI-07, DI-17; PI-01

### Slide 7 — Academic years and reporting periods

- Type: Longitudinal timeline
- Show: Academic year → configurable periods → activities → frozen period/annual snapshots → continuing portfolio
- Recommendation: A new year creates new memberships, classes, assignments, and snapshots without overwriting history
- Open decisions: P1/P2/P3/Summer structure, rollover owner, correction policy, and cross-year comparison rule
- Sources: DI-03, DI-07, DI-17; PI-02

### Slide 8 — What information exists today

- Type: Source landscape
- Sources: Time Infinity, activity records, school-based curriculum, student work, reflection, recordings, photos, teacher assessment, self-assessment, and peer assessment
- Boundary: Time Infinity supplies outside-class records; the new platform collects school-based curriculum activity records
- Sources: DI-05, DI-18
- Integration note: approved media may remain in multiple school-managed stores and be resolved through a server-side connector; provider details remain open under L-08. Status: **Discussed on Meeting Oct 26 - kickstart**.

### Slide 9 — Activity scope

- Type: Three-lane activity map
- Lanes: Lesson and curriculum activities; in-school/co-curricular activities; outside-school and Time Infinity activities
- Common model: activity identity, owner, participants, period, intended VASK, evidence, assigned form, and access/consent
- Sources: DI-12, DI-15, DI-16, DI-18

### Slide 10 — VASK and the eight skill steps

- Type: Side-by-side conceptual model
- VASK: Defines what an activity intends to cultivate or observe
- Eight skills and 16 steps: Describes evidence-backed development in a separate developmental framework
- Important caveat: The source document connects these materials but does not define a calculation between them
- Sources: DI-08, DI-11, DI-15, DI-16, DI-20; PI-03

### Slide 11 — Activities do not automatically become steps

- Type: Evidence ladder
- Flow: Activity opportunity → observed behaviour → linked evidence → human review → current skill-step evidence
- Guardrail: Participation, one answer, or one negative peer response does not by itself raise or lower a historical step
- Status: Proposed assessment safeguard
- Sources: DI-16, DI-17; PI-04

### Slide 12 — Current proposed system flow

- Type: End-to-end process diagram
- Flow: Import/upload → source and identity validation → consent/access gate → activity/form assignment → student/teacher/peer response and media → AI-assisted extraction → human verification → skill evidence → period/annual/longitudinal portfolio
- Sources: DI-04, DI-09, DI-10, DI-14, DI-17; current system-map HTML

### Slide 13 — Roles in the flow

- Type: Responsibility matrix
- Student: Reflection, self-assessment, selected evidence, correction request
- Teacher: Activity ownership, observation, feedback, evidence verification
- SuperTeacher/staff: Scoped review, approval, and conflict resolution
- SchoolAdmin: Identity, periods, policy, imports, and audits
- Status: Proposed role model based on current documentation

### Interactive POC — one tabbed system surface

- Type: Self-contained role simulation embedded in the deck
- Student: Own portfolio, joined activities, published VASK/skill results with source activity documents, and a separate external-certificate upload/extraction path
- Activity Teacher: A01 with S001–S003, one immutable form version, Q1–Q5 mappings, CSV/XLSX submission, and one/multiple teacher ratings
- Class Teacher: Per-row review plus final period-snapshot approval; may explicitly close an incomplete multi-teacher rating window
- Staff: Cross-student status with student ID, information item, submitter, reviewer, and lifecycle state
- Publication rule: Draft questions are hidden; results publish only after submission, rating readiness, row approval, and snapshot approval
- Interface standard: Low contrast, flat separators, restrained status colour, inline action feedback, global floating system alert, and fixed-height scrollable role content
- Status: Approved POC interpretation; implementation details remain configurable

### Slide 14 — Confirmed requirements

- Type: Checklist
- Central integration layer around existing systems
- Academic and non-academic evidence
- Multiple evidence and evaluator types
- Student identity classification
- Activity-to-development-area linkage
- Portfolio and long-term growth record
- AI assistance with school-owned assessment rules
- Sources: DI-01 through DI-19 as applicable

### Slide 15 — Decisions still required

- Type: Decision board
- Product surface: Activity-first, skill-first, or report-first landing view
- Academic year: Period structure, rollover, corrections, and snapshots
- Assessment: Step confirmation and contradictory evidence rules
- Governance: Activity/form/mapping approval owners
- Privacy: Consent, media access, retention, withdrawal, and deletion
- Integration: Authoritative systems and real Time Infinity fields
- Product governance: signed ownership/licensing/support terms, JC funding role, and any JC-exclusive or co-branded trademark arrangement
- Sources: DI-13 and current open-issues documentation

Product-direction note: BHSS is the lead solution proposer/reference school; JC may approve/fund operation or adoption; Octopus Infotech intends to own and supply the reusable product. This is **Discussed on Meeting Oct 26 - kickstart**, not evidence of JC approval.

### Slide 16 — Recommended discussion order

- Type: Agenda / decision sequence
- 1. Confirm portfolio purpose and audiences
- 2. Confirm the student and teacher surfaces
- 3. Confirm academic-year and period behaviour
- 4. Confirm VASK versus skill-step interpretation
- 5. Confirm evidence and progression rules
- 6. Confirm roles, approval, consent, and integration
- Closing question: Which decisions are needed for the first pilot?

### Slides 17–19 — Source traceability appendix

- Type: Reference tables
- Content: DI-01 to DI-20, each with exact original sentence, page, section, and the slide(s) that use it
- Purpose: Allow every product claim to be traced back to the original design document

## Speaker notes and script

Each slide will include speaker notes that:

- identify whether a statement is a source requirement, proposed interpretation, or open decision;
- reproduce the relevant original Chinese sentence where needed;
- give the page and section in `Design ideas.docx`;
- reference the current HTML or Markdown artifact when the slide reflects a project interpretation; and
- avoid describing a proposal as an approved school rule.
