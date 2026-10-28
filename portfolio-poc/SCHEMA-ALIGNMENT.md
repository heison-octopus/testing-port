# POC schema alignment for activities periods and reflection questions

## Status and scope

This note records a System Analyst implementation direction for the local POC. It does not present the added policy choices as BHSS or JC approval. The comparison uses the original proposal, the supplied questionnaire workbook, the current English architecture and the dummy import contracts. The implementation keeps uncertain authority and production import details configurable.

## Item by item alignment

| Source item | Evidence | Architecture interpretation | POC implementation | Status |
| --- | --- | --- | --- | --- |
| Academic and non-academic growth record | `Design ideas.docx`, page 1 | Portfolio combines activity, reflection, media and attributed reviews | Existing evidence-to-snapshot flow retained | Source direction |
| Multiple input sources | `Design ideas.docx`, pages 1 to 4 | Keep source type, perspective and authorship separate | Existing responses, peer reviews, observations, media and proof records retained | Source direction |
| Activity purpose and VASK intent | `Design ideas.docx`, pages 4 to 5 | Activity labels describe intent and never award a rubric level | Activity labels remain descriptive JSON values; no question-to-rubric weight was added | Confirmed architecture |
| Activity date and school period | `output/import-examples/03_reporting_periods.csv`; `04_activities.csv` | Server resolves the one period containing the complete start/end range | Added `academic_years`, `reporting_periods` and dated activity fields; cross-period and unmatched records stay blocked drafts | Implemented POC recommendation |
| Stable SchoolId | SRS-02 SCH-FR-010 and SCH-FR-015 | SchoolId is an opaque session boundary, including in a single-school deployment | School context is read-only in the activity editor; activity requests cannot choose or replace `school_id` | Approved System Analyst architecture decision |
| School period administration | SRS-02 SCH-FR-004, SCH-FR-008 and SCH-FR-009 | SchoolAdmin owns year and period configuration; activity users enter dates | Added SchoolAdmin period listing, creation and lifecycle status control | Implemented POC recommendation |
| School-authored reflection question | `Design ideas.docx`, pages 1 and 5 | A teacher may write a question with a valid question-owned ability definition | Activity creation and successor form creation support the manual path | Implemented POC recommendation |
| Supplied questionnaire source | `Assessment/10份技能問卷整理總表.xlsx`, `問卷總表!A1:N167` | The whole workbook is a questionnaire source, separate from a form | Added `questionnaire_sources` and school-scoped source provenance | Confirmed architecture |
| Ten questionnaire constructs | Workbook `問卷概覽!A1:K11` | Constructs remain separate from the eight Skills Builder axes | Added reusable `question_definitions`; no fixed Skills Builder mapping is stored | Confirmed architecture |
| Six-point response scales | Workbook `問卷總表!G1:M167` and `問卷概覽!D1:J11` | Scale type and options belong to the question definition | Source questions retain their scale; student self-review renders the six response options | Implemented POC recommendation |
| Negative wording | Workbook `問卷總表!N1:N167`, including communication item 5 | Wording polarity is preserved as question metadata, not silently rewritten | `is_negative` is retained and exposed in form configuration; no automatic scoring was introduced | Implemented POC recommendation |
| Teacher comments and support strategy | Workbook `問卷概覽!K1:K11` | Teacher qualitative observation is a separate block/evidence perspective | Existing teacher observation and learner-summary workflows remain separate from student questions | Confirmed architecture |
| Ordered question sections and blocks | SRS-05 FRM-FR-002 and form-definition field rules | A form version owns ordered blocks; questions are reusable | Added `question_sections`, `question_blocks` and `form_questions` while retaining materialized form-version questions | Implemented |
| Question-owned ability | `output/import-examples/07_form_template_items.csv`; `09_question_bank_example.csv` | Each question retains source, wording, audience, scale and valid ability | Materialized questions now retain source row, source ID, ability code, name and description | Implemented |
| Two reflection-question paths | Analyst direction in this implementation pass | Manual authoring and source-question selection must converge on the same versioned form model | Both paths create the same section, block and materialized-question structure | Implemented POC recommendation |
| Staged form-definition import | SRS-05 FRM-FR-006 to FRM-FR-008; SRS-03 IMP-FR-001 and IMP-FR-002 | Definition import is separate from response entry and must show a row-level diff | Added immutable batch hash, staged rows, validation results, diff type, idempotency and apply-to-draft action | Implemented as JSON-backed POC simulation |
| Published version isolation | `output/import-examples/06_form_templates.csv`; `12_form_review_history.csv` | A successor draft must not change student-visible questions | Activity retains the current published `form_version_id` until assigned staff publishes the successor | Implemented and tested |
| Response becomes proof | SRS-05 FRM-FR-011 and FRM-FR-012 | A response is evidence first; a later authorized rubric review may cite it | Text and scale responses create source-linked Proof List items; neither awards a level | Implemented POC simplification |
| Import and publication audit | `00_upload_manifest.csv`; `12_form_review_history.csv` | Upload, validation, draft creation and publication are distinct audit events | Added form import batches, form review events and audit entries | Implemented |
| Response-entry XLSX | SRS-05 FRM-FR-006 | Student-answer import is a separate contract | Not added in this pass | Open implementation item |
| Full 166-question catalogue ingestion | Workbook `問卷總表!A2:N167` | Production import should ingest the approved whole instrument and preserve every row | POC seeds the ten representative rows already listed in `09_question_bank_example.csv` | Deliberate POC limit |
| Production binary upload | SRS-03 limits and validation | Real `.xlsx` upload requires file limits, safe parsing, immutable payload storage and reconciliation export | The API simulates the parsed definition rows and records an `.xlsx` contract name and content hash; it does not store a binary | Deliberate POC limit |

## Resulting relationship flow

```text
authenticated school session
  -> activity start/end dates
  -> server-resolved academic year and reporting period
  -> manual question OR supplied questionnaire source question
  -> ordered section and student block
  -> immutable form version
  -> teacher successor draft
  -> assigned staff publication
  -> student response
  -> source-linked proof
  -> later human rubric interpretation
```

## Schema boundary

The POC now has first-class records for schools, academic years, reporting periods, questionnaire sources, reusable question definitions, ordered form sections and blocks, form-version question links, staged import batches and staged import rows. It intentionally does not add a per-school schema-mapping engine, fixed Question to VASK or Skills Builder weights, or automatic progression from a questionnaire answer.

