# BHSS student growth portfolio design review script

## Purpose

This script accompanies `index.html`. The deck separates original source requirements, current product interpretations, and unresolved school decisions. It is designed for review and revision rather than final approval.

State the current product framing carefully: BHSS is the lead solution proposer/reference school, JC may approve and fund programme operation or adoption, and Octopus Infotech intends to own and supply the reusable product. Ownership, licensing and any JC-exclusive branding require written confirmation. Tag this statement **Discussed on Meeting Oct 26 - kickstart** and do not present it as JC approval.

The plain-language value proposition is that the Portfolio helps teachers see student participation, abilities and growth that academic results and memory-based staff discussion may miss. Evidence must still exist; the product does not manufacture a positive profile.

## Slides 1–4 — Purpose, original flow, and use model

Start by explaining that the original document describes an educational outcome and a central integration layer, but not the daily operating model. Ask whether the pilot means one shared computer, a web application on the school network, or a hosted/hybrid platform. Clarify that `localhost` normally serves only the machine running the application unless it is deliberately exposed to other devices on the network.

## Slides 5–8 — Existing sources and activity inputs

The design document identifies information distributed across Time Infinity, activity records, school curriculum, student work, reflection, audio, photos, teacher assessment, self-assessment, and peer assessment.

Its first-step section lists nine categories of activity input:

1. Activity basic information.
2. Student participation records.
3. Student reflection and feelings.
4. Photos and audio.
5. Student work.
6. Teacher observations and comments.
7. Student self-assessment.
8. Peer assessment.
9. Other evidence of learning outcomes.

Stress that this is a list of possible categories. The source does not say that every activity must collect every category. Ask the school to define a minimum required record for each activity type.

## Slides 9–13 — Marks and response scales

The original design document does not require a numeric mark for every activity. It requires evidence, reflection, observation, and assessment.

Keep these representations separate:

- A six-point response belongs to the supplied questionnaire instrument.
- A 1–16 value identifies a Skills Builder developmental step and must remain connected to its descriptive sentence.
- Boolean or 1–2 values are useful for factual workflow states such as attendance, consent, submission, or verification.
- The five labels previously proposed for evidence status are not original source language and require school agreement.
- No five-level activity mark was found in the original design document.

Ask whether the school needs an activity result at all. If yes, identify whether it is attendance, completion, a task result, a rubric observation, or published feedback. Do not combine these into one unexplained number.

## Slides 14–16 — VASK and skill development

The current interpretation uses VASK to define what an activity intends to cultivate or observe. The eight Skills Builder skills and sixteen steps describe evidence-backed development.

Explain that an activity is an opportunity to demonstrate a skill. It should not automatically award a step. The school still needs to decide how much evidence is enough, whether evidence must repeat across contexts, how contradictions are handled, and whether a previous decision can be corrected.

## Slides 17–18 — Portfolio surface and school years

The proposed student surface is activity-first. A user selects an experience and sees reflection, evidence, teacher feedback, peer feedback, and the corresponding skill interpretation together. The radar chart is a summary, not the source of proof.

For school years, preserve historical memberships, activities, forms, evidence, and snapshots. Start a new context for the new year while keeping one longitudinal portfolio. Confirm the school's actual reporting periods and rollover rules.

## Slides 19–20 — Current system flow

Separate intake from interpretation:

- Intake: import or direct entry, source identification, student/person resolution, and consent/access checks.
- Interpretation: multiple perspectives, AI-assisted extraction, human verification, and publication to activity, period, annual, and longitudinal views.

Ask which data is imported automatically, which is uploaded in batches, and which is entered directly by teachers or students.

Also ask which school-approved stores hold media. A connector may receive an opaque media reference and retrieve metadata, a short-lived authorized URL or the media content. Explain that access still passes through server-side role, assignment, consent and lifecycle checks; never propose exposing a raw server path to the browser. This was **Discussed on Meeting Oct 26 - kickstart** and remains partly open under L-08.

## Interactive POC — role surfaces and publication gate

Use the role tabs to demonstrate one shared record through four controlled surfaces:

- Student 1 sees their portfolio, joined activities, and published activity-linked VASK/skill evidence. Teacher Q1–Q5 results remain hidden until the activity submission and final period snapshot are published.
- The separate external-certificate area simulates PDF text extraction and audio transcription. VASK suggestions remain reviewable metadata; the upload receives no official eight-skill mapping by default.
- The Activity Teacher owns A01, its three students, Form v1.0, five mapped questions, CSV/XLSX submission, and initial skill ratings.
- The multi-teacher mean becomes eligible only when all assigned teachers submit or the Class Teacher closes the rating window. A missing rating remains visible in the audit history.
- The Class Teacher approves or returns each portfolio row, then separately approves the P1 snapshot.
- Staff see all-student status with student ID, information item, submitter, reviewer, and lifecycle state.

The POC uses the approved low-contrast interface standard: flat sections, line separators, small radii, restrained status colours, inline action feedback, and a floating system-level error. It is a product interpretation, not a claim that these operating rules were stated verbatim in the source document.

## Slides 21–24 — Confirmed direction, unknowns, and revision agenda

Close by confirming the source-backed direction and then focusing discussion on unresolved operating rules. The recommended decision order is:

1. Daily use and devices.
2. Minimum record for each activity type.
3. Response types and assessment meaning.
4. Student and teacher portfolio surfaces.
5. Approval, consent, year rollover, and progression policy.

## Revised slides — external achievements and human review

Students may upload external certificates and achievements and complete a VASK form. Preserve issuer, category, grade or difficulty, and result separately. Do not assign an official eight-skill mapping by default.

A Proud Moment is the student's selection of an activity or evidence item that represents the student. Treat it as reflection and presentation, not as an automatic progression award.

Every school-owned activity references one immutable form version. For the proof of concept, start with the BHSS dummy questions and add only enough questions to improve VASK coverage. A question can map to several skills or an observable step range, but the mapping only identifies candidate evidence.

Questionnaire submissions and `回顧與展望` use the same response lifecycle: not submitted, draft, submitted, in review, changes requested, approved, and published. Form-template approval is separate.

HKEAA-related input, student review, peer review, and activity evidence do not bypass human review. An assigned teacher or teaching assistant records or confirms the initial skill rating. When that required rating is missing, the published step remains missing rather than being inferred from AI, self-review, or peer review.

Peer review requires a named assignment. Ask the school to choose manual assignment, same-group proposals, reciprocal pairing, or randomized pairing with exclusions.
