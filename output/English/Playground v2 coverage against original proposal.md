# Playground v2 coverage against the original proposal

**Assessment date:** 29 October 2026  
**Status:** Internal System Analyst coverage assessment  
**Original evidence:** `Design ideas.docx`, pages 1–6  
**Compared implementation:** the current local `portfolio-poc-v2/`

This assessment does not represent BHSS or JC acceptance, does not turn the original proposal into an approved requirement set, and does not amend the Core or SRS. It records how much of the original product direction can currently be exercised in Playground v2.

The optional local LLM adapter and persisted AI-review state are an internal System Analyst implementation direction dated 29 October 2026. They are not BHSS or JC approval of AI use.

## 1. Executive conclusion

Playground v2 now demonstrates a connected local workflow from a complete activity package through student reflection, named peer review, teacher assessment, memorable-activity curation, Portfolio review and an official published view. Governance, access control, immutable revisions and named approval remain central to the POC, but they are no longer its only substantial coverage.

The major change since the previous assessment is the addition of role-separated learning records. A published activity can create student self-response tasks. An assigned teacher can create a named peer task, moderate responses, write feedback and record a proof-linked 1–16 observation. A student can separately select a memorable activity and assemble a working Portfolio. The published Portfolio reads only an approved snapshot. An optional server-side OpenAI-compatible provider can also generate source-linked learner-narrative candidates without giving the model publication or assessment authority.

Important parts of the original direction remain incomplete. V2 now has a staged activity-roster contract shared by CSV, XLSX and a server-side Time Infinity JSON fixture, but it still has no media/file evidence upload, approved production Time Infinity endpoint, production OCR, speech-to-text or speaker identification, cross-system synchronization, or notification service. Skills Builder observations exist, but a new observation still cannot pass through inclusion, official result review and publication. The versioned form flow is usable, but there is no form-library administration or confirmed import of the school's actual reflection questions.

The coverage inventory must not be read as a completion percentage. A visible demonstration also does not mean production readiness, security accreditation, stakeholder acceptance, or final school policy.

## 2. Comparison method

The original document is treated as product evidence rather than silently rewritten as a requirements specification. Each capability below is traced to its page and section, then checked against the current v2 user interface, API, SQLite lifecycle, tests and live role-flow audit.

| Source | Role in this assessment |
| --- | --- |
| `Design ideas.docx`, pp. 1–6 | Original vision and workflow evidence; page 3 is blank |
| `portfolio-poc-v2/README.md`, `live-flow-audit.md` and current implementation | Evidence of what the local POC currently demonstrates |
| V2 API/contract and browser tests run on 29 October 2026 | 21 API/contract tests and 10 end-to-end browser tests passed; this supports POC behavior only |
| `Core data relationships.md` and the SRS modules | Interpretation and control references; they do not substitute for original-source coverage |

### Coverage scale

| State | Meaning |
| --- | --- |
| **Demonstrated** | A visible local flow is backed by the v2 API and SQLite state. This is still a POC, not a production-readiness claim. |
| **Partial** | Some supporting data, screen, or lifecycle exists, but an essential part of the original behavior is absent. |
| **UI/contract only** | A provider-neutral interface, adapter or test contract exists, but no product route executes the capability. |
| **Not covered** | V2 currently has no operative page, API, or data lifecycle for the capability. |

## 3. Coverage summary

| State | Items | Reading |
| --- | ---: | --- |
| Demonstrated | 6 | Activity packages, reflection, teacher observation, named peer review, VASK intent, and human approval/publication have usable local flows |
| Partial | 12 | Portfolio breadth, media/evidence, self-assessment, student folders, consolidation, Time Infinity production integration, AI generation, Skills Builder, forms, task prompting, growth history, and presentation remain incomplete |
| UI/contract only | 1 | OCR has a normalized provider boundary and test double, but no product execution route |
| Not covered | 3 | Group-sharing capture, speech/speaker processing, and cross-system presentation remain absent |
| **Total traceability items** | **22** | An inventory of original concepts, not a percentage or estimate of work completed |

## 4. Detailed original-to-v2 coverage

| ID | Original source and expectation | Current v2 evidence | Coverage | Remaining gap |
| --- | --- | --- | --- | --- |
| O-01 | **p. 1, “期望”** — maintain a comprehensive academic and non-academic learning and personal-growth Portfolio. | Working versions and published snapshots can contain student-authored introduction, submitted memorable activities, an approved learner narrative, and published skill results. | **Partial** | Academic records, media evidence, complete accepted-proof browsing, and longitudinal development across periods are not yet combined in the Portfolio. |
| O-02 | **pp. 1 and 4, source collection** — record activities and participating students. | A creator can build an activity package with participants, VASK intent, risk flags and one approved/published form version. CSV/XLSX/approved JSON roster rows can be staged, resolved and committed by the assigned editor before separate activity approval/publication. | **Demonstrated** | Actual-attendance confirmation and a complete roster administration/exception queue remain incomplete. |
| O-03 | **pp. 1, 2 and 4, reflection** — capture student reflection, feelings, and activity experience. | Each published activity can issue a named self-response task. The student answers the exact form version, saves a draft, submits a frozen revision, receives a return where necessary, and can have accepted answers registered as proof. | **Demonstrated** | The current flow is text based; media reflection and school-confirmed question content remain future work. |
| O-04 | **pp. 1, 2 and 4, source collection** — upload photos, audio, work products, and other proof. | Accepted text responses become source-linked proof items, and a teacher observation can cite submitted responses. | **Partial** | V2 still has no photo, audio, work-file or certificate upload, preview, consent/access metadata, media library, or soft-disable interface. |
| O-05 | **p. 1, group sharing** — retain group-sharing material as learning evidence. | No group artifact, shared submission or group-discussion capture exists. | **Not covered** | Define group artifact ownership, participant attribution, visibility, consent, and links to individual Proof List items. |
| O-06 | **pp. 1, 4 and 5, teacher observation/evaluation** — record teachers' ongoing observations, feedback, and assessment. | A named activity assessor can review self/peer sources, enter strength, development and support feedback, and add a human-confirmed, proof-linked 1–16 observation. Observation history is retained. | **Demonstrated** | The observation remains outside official aggregation until a separate result-review and publication flow is built. |
| O-07 | **pp. 1, 2 and 4, student assessment** — support student self-assessment. | The student self-report form captures reflective recall and self-awareness, supports immutable submission revisions, and can become accepted proof after review. | **Partial** | The POC demonstrates reflective self-report, not a complete student rubric rating or explicit self-assessment against skill levels. |
| O-08 | **pp. 1, 2 and 4, peer assessment** — support peer review. | An assigned teacher can name one participant as reviewer for another participant. The reviewer receives only that task; submission, moderation, return/reject/accept and proof creation are server scoped. | **Demonstrated** | Final school rules for anonymity, safeguarding, moderation and wider release still require confirmation. |
| O-09 | **pp. 1, 4 and 6, VASK** — connect each activity's intended Values, Attitudes, Skills, and Knowledge to the student record. | At least one active VASK intention is required when creating an activity package and is displayed as context rather than a score. | **Demonstrated** | Full catalogue administration and any approved relationship from VASK intent to later interpretation remain outside this POC. |
| O-10 | **pp. 1 and 4, student classification** — classify material by student into an academic/non-academic electronic folder. | Per-student response tasks, accepted proof, teacher observations, memorable selections, working Portfolio versions and official snapshots now form a linked student record. | **Partial** | There is no complete evidence-folder page, academic/non-academic source browser, media record, or cross-source search. |
| O-11 | **pp. 1, 2 and 4, local consolidation** — bring multiple source types into a local system/server for processing. | Standalone SQLite now holds activities, form responses, peer responses, proof, teacher feedback, observations, curation and Portfolio records. All manifest files have provenance entries, and activity rosters have an operational staged import/reconciliation flow. | **Partial** | Runtime users, periods, form definitions, responses, academic results and media still need their own approved contracts and exception handling. |
| O-12 | **p. 5, Time Infinity** — retrieve or reconcile existing out-of-class activity records. | An allow-listed server connector fetches deterministic Time Infinity JSON, preserves source/request metadata and sends records through the same staged roster validation and commit flow as files. | **Partial** | The local fixture proves the boundary only. Source ownership, real API/export availability, credentials, failure samples and production reconciliation rules still require approval. |
| O-13 | **p. 2, AI processing** — use OCR for submitted material. | A provider-neutral extraction boundary and deterministic source-linked test double return normalized text, chunks, language, confidence, provider and timestamp. The `/ocr/extract` product route deliberately returns 404. | **UI/contract only** | There is no upload-to-OCR job, production provider, candidate-review page, consent validation or committed extraction record. |
| O-14 | **p. 2, discussion audio** — transcribe audio and identify speakers/students for individual records. | No speech-to-text, speaker separation, or identity matching runs in v2. | **Not covered** | Consent, provider terms, confidence handling, human identity confirmation, and source-linked transcript review remain unresolved. |
| O-15 | **p. 2, AI processing** — classify/summarize evidence, match Rubrics, and draft reports. | When an optional OpenAI-compatible server is configured, the protected Node API can generate and persist an independent learner-narrative candidate from a frozen source manifest. Human candidate decisions and generated/edited/final text states are retained. | **Partial** | This covers narrative drafting only. Evidence classification, rubric matching, broader report generation, stale-input handling and production provider policy are not complete. |
| O-16 | **pp. 2 and 6, Skills Builder** — use the framework's skills, levels, and descriptions in assessment and development tracking. | Eight skill axes, proof-linked teacher observations with 1–16 input, observation history, and a published-results visualization exist. | **Partial** | New observations remain excluded from aggregation; there is no reviewer inclusion/exclusion, `MAX-CONFIRMED` calculation, official result approval/publication or longitudinal skill history. |
| O-17 | **p. 2, school reflection questions** — use existing school reflection questions and forms. | Each activity names one exact approved/published form version. Role-specific form items render in the student self and peer task pages, and responses are versioned and reviewed. | **Partial** | The questions are POC seed content. V2 has no form-library authoring, XLSX round trip, diff/publication screen, or confirmed import of the school's actual question set. |
| O-18 | **p. 4, reminders** — remind students, teachers, peers, and activity staff about incomplete reflection, assessment, or evidence. | Publishing an activity creates named self/teacher assignments with due dates; named peer tasks can be added, task pages show due dates, and approval escalation records exist. | **Partial** | There is no scheduler or notification channel that actively reminds recipients about overdue learning tasks or missing media/evidence. |
| O-19 | **pp. 1 and 4, continuous growth** — show stages, changes, and a long-term personal growth record. | Immutable activity, response and Portfolio revisions preserve history; observation history and published skill summaries are visible; working content remains separate from the official snapshot. | **Partial** | There is no multi-period evidence timeline, period comparison, progression explanation or confirmed cross-year Portfolio policy. |
| O-20 | **pp. 1, 2 and 4, multi-party review and school final control** — retain human assessment and school authority over final rules/output. | Separate named activity approval/publication, response moderation, teacher assessment, class-teacher Portfolio review, staff approval, immutable decisions, escalation and official snapshots are operative. | **Demonstrated** | Exact school authority for each workflow remains configurable and still requires stakeholder confirmation for production. |
| O-21 | **pp. 1 and 2, Portfolio presentation** — present academic/non-academic learning, growth, reflection, and evidence. | A separate read-only page shows only the latest approved published snapshot, including published 1–16 skill results, approved source-linked narrative and included student content. | **Partial** | Academic context, media evidence, full proof drill-down, multi-period growth and production sharing/access controls are incomplete. |
| O-22 | **p. 1, cross-system presentation** — integrate information and present it across relevant systems. | V2 is a standalone local POC with no external-system presentation or synchronization. | **Not covered** | Define system boundaries, export/API consumers, identity matching, update ownership, and synchronization/error policy. |

## 5. What the current v2 pages actually cover

| V2 surface | What it demonstrates | Relationship to the original proposal |
| --- | --- | --- |
| Overview and bilingual account picker | Role-aware entry, live workload counts and English／Traditional Chinese interface | Enabling access layer; the detailed unified task feed remains partial |
| Staff directory | Filter by position, functional role, capability, subject, department, group, and approval eligibility | Later governance detail needed to operate teacher and reviewer responsibilities |
| Activities | Complete package creation, participants, VASK, exact form version, stable revisions, correction requests, named approval and separate publication | Demonstrates the activity foundation; actual attendance confirmation and evidence files remain incomplete |
| Data imports | CSV/XLSX and allow-listed JSON roster staging plus a separate activity-catalogue delta export/import: absence is no change, stale revisions conflict, material edits create successor drafts, and explicit disable/restore is audited without hard deletion | Demonstrates roster reconciliation and existing-activity catalogue lifecycle; new imported-activity ownership, other domain contracts and a real Time Infinity endpoint remain incomplete |
| Activity responses | Student self reflection and explicitly assigned peer tasks with exact questions, drafts, frozen submissions and successors after return | Demonstrates reflection and named peer input |
| Activity assessment | Source-separated self/peer responses, moderation, teacher feedback and optional proof-linked 1–16 observations | Demonstrates teacher assessment without auto-publishing a skill step |
| Memorable activities | Separate selection window, eligible published activities, reflection and locked submission | Demonstrates student curation without changing assessment results |
| Portfolio editor, review and published view | Student-owned working content, class-teacher inclusion and narrative edit, staff approval, immutable snapshot and read-only official visualization | Stronger Portfolio lifecycle coverage while maintaining field ownership and version separation |
| Approval queues | Named assignments, target/revision context, direct record links, decisions and escalation records | Implements flexible human gates for activity and Portfolio work |
| AI drafts | Frozen manifest, optional server-side generation, independent candidates, persisted decisions, provenance and separate text states | Partially implements narrative drafting; it does not classify proof or set assessment results |
| Model playground | Protected, server-streamed local-model experimentation with browser-local history | Engineering diagnostic surface beyond the original Portfolio workflow; it is not product coverage evidence |
| Policy controls | Preview and apply school/group/user capability overrides; explicit deny wins | Later internal access-control architecture, not an original document feature |
| POC page catalogue | Shows revised implemented, partial, and recommended-next pages from the SRS planning set | Makes the remaining page gaps visible; the catalogue itself does not implement them |

## 6. Important enabling architecture added after the original document

The following v2 capabilities are valuable but should be labelled as **internal System Analyst architecture decisions**, not as original-document requirements or BHSS/JC approvals:

- School as a first-class isolation boundary.
- Separation of job position, stackable functional roles, capabilities, and assignment scope.
- Subject, department, class, teacher-group, and activity scopes.
- Explicit-deny precedence and school-wide policy overrides.
- Search and filtering across teacher position, role, capability, and scope.
- Approval eligibility separated from named approval assignments.
- Independently configurable activity, Portfolio, and publication workflows.
- Escalation for unassigned or overdue approval work.
- Stable activity identity with immutable successor revisions.
- Portfolio working versions and immutable official publication snapshots.
- Separate student response, teacher assessment, memorable-selection, Portfolio editing, Portfolio review and published-view records.
- Server-owned deep-link authorization for activity, response, assessment and Portfolio records.
- Provider-isolated optional local narrative generation with frozen source manifests and persisted human decisions.
- Layered API and repository boundaries with additive SQLite migrations.
- English／Traditional Chinese interface switching.

These controls make the future evidence workflow safer and more configurable, but they do not compensate for missing learning evidence and assessment functions when measuring original-proposal coverage.

## 7. Recommended next coverage slice

**Recommendation — not an approved requirement or stakeholder commitment:** the earlier vertical path now exists in POC form. The next slice should close the evidence-to-official-result path:

> Media or work upload → consent and provenance validation → proof moderation → observation inclusion or exclusion → official Skills Builder result review and publication → Portfolio snapshot or audited reissue

This path would address the largest remaining gap between the original evidence vision and the governance now demonstrated by v2. It would also prove that a newly accepted source can affect an official skill result only through named human decisions.

Suggested order after that slice:

1. Add typed media/work upload, consent/access controls, preview and soft disable.
2. Add proof moderation and observation include/exclude decisions with impact preview.
3. Complete one official `MAX-CONFIRMED` Skills Builder 1–16 review, publication and reissue path.
4. Add a multi-period evidence and growth history to the published Portfolio.
5. Replace the Time Infinity fixture with an approved endpoint and representative reconciliation/error samples; extend runtime imports only through approved domain contracts.
6. Add scheduled task reminders and escalation for reflection, assessment and missing evidence.
7. Connect production OCR or speech providers only after consent, privacy, provenance, review and failure policies are approved.

## 8. Interpretation boundaries

- “Demonstrated” means the local POC flow can be exercised; it does not mean production complete.
- Seeded results are not evidence that the end-to-end official result publication path exists. Optional local LLM generation proves the protected adapter flow only when configured; it does not establish production AI approval or an external-system integration.
- The original document expresses direction and expectations. Any uncertain school policy remains configurable and must be recorded in the bilingual discussion register before being promoted into the Core.
- Current Core and SRS controls should govern future implementation, but this assessment intentionally preserves the distinction between later architecture and original-source coverage.
