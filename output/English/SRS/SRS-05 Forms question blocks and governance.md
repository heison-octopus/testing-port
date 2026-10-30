# SRS-05 Forms, question blocks and governance

## 1. Purpose and terms

- A **questionnaire source** is a complete supplied instrument or source workbook.
- A **form** is the versioned digital instrument assigned to an activity.
- A **question block/section** is an ordered group for teacher, student or peer respondents.
- A **question** is a reusable prompt with source, wording, response type, scale, audience and its own valid ability definition.
- A **question ability** describes what the question can reasonably ask or observe. It is not a VASK label, rubric axis, mapping weight or assessment result.
- A submitted response becomes a source-linked Proof List item before it can support any rubric observation.

**Decision basis:** `Discussed on Meeting Oct 26 - kickstart`.

## 2. Functional requirements

| ID | Requirement | Status | Priority |
| --- | --- | --- | --- |
| FRM-FR-001 | One activity shall reference one immutable published form version at a time. | Confirmed architecture | P0 |
| FRM-FR-002 | A form version shall contain ordered teacher, student and/or peer blocks. | Confirmed architecture | P0 |
| FRM-FR-003 | Editing a published version shall create a successor draft and preserve historical assignments. | Confirmed architecture | P0 |
| FRM-FR-004 | Each question shall preserve source, bilingual wording, audience, scale, version and an ability code/name/description. | Confirmed Oct 26 revision | P0 |
| FRM-FR-005 | The system shall not store a fixed Question → VASK, RC360 or Skills Builder mapping or normalized question-to-skill weight. | Confirmed Oct 26 revision; H-05/M-01 superseded | P0 |
| FRM-FR-006 | The form-definition XLSX and response-entry XLSX shall remain separate contracts. | Confirmed architecture | P0 |
| FRM-FR-007 | Form-definition import shall be staged, validated and compared row by row before creating a successor draft. | Confirmed POC workflow | P0 |
| FRM-FR-008 | Creating or importing a draft shall not change student-visible questions. Explicit publication is required. | Confirmed architecture | P0 |
| FRM-FR-009 | Question audience suitability shall be explicit in the published block. | Partly addressed; M-05 | P1 |
| FRM-FR-010 | Form approval/publication and rubric observation confirmation/publication shall be separate workflows. | Confirmed Oct 26 revision | P0 |
| FRM-FR-011 | An accepted response shall create or reference a Proof List item containing question, respondent, subject, activity, form version and provenance. | Confirmed Oct 26 revision | P0 |
| FRM-FR-012 | An authorized reviewer may cite the Proof List item against a concrete condition in the rubric selected during Portfolio processing. | Confirmed Oct 26 revision | P0 |
| FRM-FR-013 | Form review shall use the school's independently configured lean approval policy and named eligible reviewer assignment; reviewer eligibility shall not depend on the person's job title. | Approved System Analyst architecture decision, 28 Oct 2026 | P1 |
| FRM-FR-014 | Form approval and publication shall remain separate capabilities even when policy assigns both to one person. Self-approval shall follow the active form policy. | Approved System Analyst architecture decision, 28 Oct 2026 | P1 |
| FRM-FR-015 | Unassigned, declined or overdue form reviews shall enter the configured default/escalation queue with reason and audit history. | Approved System Analyst architecture decision, 28 Oct 2026 | P1 |
| FRM-FR-016 | The supplied source instrument shall be represented visibly as a versioned question bank. The current workbook evidence contains 166 questions across ten source constructs; each question retains its own source and ability definition and remains separate from VASK and rubric mappings. | Confirmed source evidence and System Analyst direction, 29 Oct 2026; not BHSS/JC approval | P1 |
| FRM-FR-017 | SchoolAdmin shall control whether a validated question-bank version is available to staff building form versions. Activating or disabling a bank version changes future selection only and shall not rewrite published forms or historical responses. | Confirmed System Analyst direction, 29 Oct 2026; not BHSS/JC approval | P1 |
| FRM-FR-018 | Question ability definitions shall remain independent from activity labels and assessment rubrics. The system may expose optional discovery links to help an author search related material, but shall not treat a discovery link as a scoring rule, weight or automatic mapping. | Approved System Analyst architecture decision, 30 Oct 2026; not BHSS/JC approval | P0/P1 |
| FRM-FR-019 | The question bank shall be persisted as stable questions and immutable question versions within a versioned source bank, including the source reference and content hash. Authoring queries shall support server-side search, source, construct, ability, lifecycle and pagination filters. | Approved System Analyst architecture decision, 30 Oct 2026; not BHSS/JC approval | P1 |
| FRM-FR-020 | Reusable question blocks shall be stable records with immutable ordered versions, respondent audience, optional ability context, item links, review state, publication state and form-version usage links. Authoring queries shall support search, audience, ability, form version, lifecycle and pagination filters. | Approved System Analyst architecture decision, 30 Oct 2026; not BHSS/JC approval | P1 |
| FRM-FR-021 | Disabled questions and blocks shall be unavailable for new selection while unchanged published forms retain their exact historical references. Historical validation may match disabled definitions but shall report that the reference is historical-only. | Approved System Analyst architecture decision, 30 Oct 2026; not BHSS/JC approval | P0/P1 |
| FRM-FR-022 | Activity submission and approval shall fail when its selected form version is not already approved and published. Successful activity approval shall never mutate the form review/publication lifecycle. | Approved System Analyst architecture decision, 30 Oct 2026; not BHSS/JC approval | P0/P1 |

## 3. Question and form-definition fields

| Field | Required | Validation |
| --- | --- | --- |
| Question ID and version | Yes for existing questions | Stable ID; positive version |
| Source workbook/sheet/row | Yes for imported questions | Preserve source traceability |
| Section code and bilingual title | Yes | Stable within the form version |
| Audience | Yes | `teacher`, `student`, or `peer` |
| Bilingual question wording | Chinese required for current POC | Up to 4,000 characters |
| Scale/type | Yes | Type plus valid bounds/options |
| Required flag and display order | Yes | Boolean; unique positive order within block |
| Ability code/name | Yes | Non-empty, stable within question version |
| Ability description | Recommended | Explains valid meaning and use; no rubric score claim |
| Teacher note | Optional | Authoring context only |

VASK codes, rubric-axis mappings, step bands and mapping weights are not part of the form-definition contract.

## 4. Authoring and publication lifecycle

```text
review activity purpose and available question abilities
  -> select or write suitable questions
  -> download form-definition XLSX
  -> edit wording, audience, order, scale or ability definition
  -> upload and validate a staged row-level diff
  -> create successor draft
  -> assigned review where required
  -> explicitly publish
```

The last published form remains visible until its successor is explicitly published. Publication locks the question/version meaning used by later responses; a correction creates another version rather than rewriting history.

## 5. Response and Proof List lifecycle

```text
draft response -> submitted -> reviewed -> accepted/rejected
accepted response -> proof_item(source=response)
proof_item + activity context + other proof
  -> human-confirmed rubric observation
  -> separately authorized published rubric result
```

The response score or text is never treated as a framework level by itself. The selected rubric must be assessment-capable and must provide versioned axes, ordered levels and concrete conditions.

## 6. Role visibility

- Students answer assigned published blocks and see only records permitted by the relevant visibility state.
- Teachers author within assigned activities, review responses and propose proof/rubric observations within policy.
- Any eligible teacher/staff member with the required capability, scope and named assignment may review delegated exceptions, form versions, proof and rubric-result publication; job title alone is insufficient.
- SchoolAdmin configures role assignments, form-publication authority and rubric-publication authority.

Role membership and a named workflow approval assignment are separate records.

## 7. Acceptance scenarios

- The form-definition workbook contains ability fields and no VASK/RC360/Skills Builder mapping or weight columns.
- A response preserves the exact question version and becomes a traceable Proof List item after acceptance.
- The same question response may be reviewed against a future rubric without changing the historical question.
- Publishing a form does not accept proof or publish a rubric level.
- A student cannot see a teacher block or unpublished successor version.
- A question with no valid ability definition cannot be published.
- Filtering the question bank by construct or ability returns a bounded server page rather than downloading the complete bank.
- Filtering reusable blocks by audience and ability returns the ordered block items and the published form versions that use them.
- An old form containing a subsequently disabled question remains reproducible, while the disabled question is absent from new authoring choices.

## 8. Open dependencies

- M-05: final per-question audience policy.
- M-06: minimum block/question completeness rules.
- H-03: final authority for publishing a 1–16 result.
- H-02: whether the supplied workbook is an official instrument or editable reference source.
