# SRS-10 AI-assisted processing and provenance

## 1. Purpose

Define provider-neutral extraction and Portfolio-generation boundaries so the kernel can validate and route text/results without knowing how an AI provider performs its work. Identity, evidence acceptance, claim approval and official assessment remain under human authority.

## 2. Permitted capability boundary

| Capability | Phase | Authority |
|---|---|---|
| Provider-neutral extraction/generation contracts and test doubles | P1 | Kernel-owned validation boundary |
| OCR of certificates/documents | P2 implementation | Draft extraction only; human reviews |
| Audio transcription/speaker separation | P2 implementation | Draft transcript; human confirms speakers |
| Classification/evidence tags | P2 implementation | Suggestion only |
| Rubric/skill matching | P2 implementation | Suggestion only; cannot set step |
| Summary/report draft | P2 implementation | Human edits and publishes |
| Identity match or official step award | Excluded | Human decision only |

Final permitted AI uses remain Policy TBD H-10.

The P1 contract is not an instruction to build production AI in the MVP. It fixes the input/output envelope, validation, provenance, review states and failure behaviour so a local rule-based stub or later provider can be replaced without changing the kernel.

No production-provider implementation owner is assigned by this SRS. Provider selection, build/buy responsibility, credentials, service terms and operational support remain a P2 delivery decision under H-07/H-10; the kernel team owns only the contracts and platform-side controls defined here.

## 3. Functional requirements

| ID | Requirement | Status | Phase |
|---|---|---|---|
| AI-FR-001 | Before execution, the UI shall list the exact records and fields sent to the processor. | Confirmed POC direction | P0/P2 |
| AI-FR-002 | The user shall select only records they are authorized to read; the server shall re-check access before processing. | Recommended architecture | P2 |
| AI-FR-003 | Output shall record model/service, version, prompt template/version, parameters, input references, actor and timestamps. | Confirmed architecture | P2 |
| AI-FR-004 | The system shall preserve `generated_text`, `teacher_edited_text` and `final_published_text` separately. | Confirmed M-17 | P2 |
| AI-FR-005 | Three controlled profiles shall be offered: academic reasoning; non-academic/personal growth; interpersonal/intrapersonal development. | Confirmed M-16 | P2 |
| AI-FR-006 | Teachers may adjust allowed emphasis, age/class, tone, length and omissions; arbitrary privileged instructions are not passed through unchecked. | Confirmed M-16/recommended security | P2 |
| AI-FR-007 | AI outputs shall use a brown-toned visual treatment and a clear draft label until human approval. | Confirmed UI convention | P0/P2 |
| AI-FR-008 | AI failure shall not block manual assessment or portfolio publication. | Recommended architecture | P2 |
| AI-FR-009 | Sensitive data sent to external processors shall follow configured consent, residency, retention and vendor policy. | Policy TBD H-07/H-10 | P2 |
| AI-FR-010 | Portfolio LLM output shall be positive, source-linked candidate text only; it shall not downgrade, accept proof or publish a rubric level. | Confirmed M-23; Oct 26 revision | P0/P2 |
| AI-FR-011 | Review/outlook generation shall use a teacher-selected from/to school period and explicit source classes. | Confirmed M-24 | P0/P2 |
| AI-FR-012 | Each generated review/outlook record shall freeze the exact activity descriptions, confirmed outcomes, accepted proof summaries, published rubric results and prompt version used. | Confirmed M-24 | P0/P2 |
| AI-FR-013 | The kernel shall call an `ExtractionProvider` port and a separate `PortfolioGenerator` port; provider-specific SDKs, prompts and credentials shall remain behind adapters. | Approved System Analyst architecture decision, 27 Oct 2026 | P1 contract/P2 provider |
| AI-FR-014 | `ExtractionProvider` shall return a normalized result containing job/source IDs, extracted text, optional ordered chunks/candidates, language, confidence where available, provider/version, warnings and timestamps. It shall not write platform records directly. | Approved System Analyst architecture decision, 27 Oct 2026 | P1 contract/P2 provider |
| AI-FR-015 | Before accepting an extraction result, the kernel shall re-check active school, feature availability, authorization, consent, input hash, schema and provider provenance, then store the result as a review candidate. | Approved System Analyst architecture decision, 27 Oct 2026 | P1/P2 |
| AI-FR-016 | `PortfolioGenerator` shall receive a frozen manifest containing only kernel-accepted, Portfolio-eligible evidence for one school, student and period/range. It shall never query the database or object storage directly. | Approved System Analyst architecture decision, 27 Oct 2026 | P1 contract/P2 provider |
| AI-FR-017 | `PortfolioGenerator` shall return structured draft sections and claims; each evidence-based claim shall contain text, one or more ordered source references and optional warnings, while generator/prompt/version metadata remains attached to the result. | Approved System Analyst architecture decision, 27 Oct 2026 | P1 contract/P2 provider |
| AI-FR-018 | The kernel shall reject unknown, cross-school, ineligible or out-of-manifest source references and shall preserve generated, edited, approved and published states separately. | Approved System Analyst architecture decision, 27 Oct 2026 | P1/P2 |
| AI-FR-019 | Visualization shall receive the kernel's approved snapshot DTO only. It shall not know the extraction provider, LLM provider, prompt, or generation procedure. | Approved System Analyst architecture decision, 27 Oct 2026 | P1 |
| AI-FR-020 | The API and worker shall check the active school's feature policy before creating, claiming and committing an extraction or generation job. | Approved System Analyst architecture decision, 27 Oct 2026 | P1/P2 |
| AI-FR-021 | Suggestions produced for the same evidence by different provider/model/prompt versions shall be stored as independent, non-overwriting candidates and shown side by side to named reviewers holding the required capability and matching scope. | Approved System Analyst architecture decisions, 27–28 Oct 2026 | P1 contract/P2 provider |
| AI-FR-022 | A reviewer may reject or ignore each generated claim or rubric suggestion independently. Accepting one shall create/update a human-reviewed observation with the original eligible proof links; the model output itself shall not become proof. | Approved System Analyst architecture decision, 27 Oct 2026 | P1/P2 |
| AI-FR-023 | Submitted work/evidence shall retain a declared authorship origin (`human_authored`, `ai_assisted`, `ai_generated`, `unknown`) and optional tool/model disclosure. AI assistance shall not automatically include/exclude the work or determine a level; school assessment policy remains open. | Approved System Analyst architecture decision, 27 Oct 2026; assessment treatment Policy TBD H-10 | P1 |
| AI-FR-024 | If an input source is later excluded, corrected or invalidated, every generation run that used it shall be marked `stale`/`needs_review`. Staff may exclude the source and create a successor run; the original input manifest and output remain immutable. | Approved System Analyst architecture decision, 27 Oct 2026 | P1/P2 |
| AI-FR-025 | AI suitability, confidence or agreement between models shall be advisory only. It shall not be treated as a proof/input type, a reason to overwrite another suggestion, or a source-free rubric-level override. | Approved System Analyst architecture decision, 27 Oct 2026 | P0/P2 |
| AI-FR-026 | An authorized class teacher/editor may modify only the generated/prompt-controlled `Me as a learner` narrative. That capability shall not permit editing student-authored text or another educator's observation. | Approved System Analyst architecture decision, 28 Oct 2026 | P1 contract/P2 generation |
| AI-FR-027 | Each generated narrative shall preserve generated text, teacher-edited text and final-approved text as separate immutable versions with editor, reason, text diff, source manifest and approval state. | Approved System Analyst architecture decision, 28 Oct 2026 | P1/P2 |
| AI-FR-028 | Student-authored self-introduction shall carry authorship provenance but does not require an evidence source to be displayed as the student's own statement. Any system/LLM factual or evaluative claim shall carry resolvable sources. | Approved System Analyst architecture decision, 28 Oct 2026 | P1/P2 |

## 4. Input and output limits

| Field | Minimum | Maximum/status |
|---|---:|---|
| Prompt profile | 1 | Exactly one approved profile per job |
| Teacher instruction | 0 | 4,000 characters |
| Source items | 1 | 100 temporary cap |
| Generated draft | 0 | 20,000 characters |
| Human edit | 0 | 20,000 characters |
| Retry count | 0 | 3 temporary cap |

Large media is processed through background jobs, not inserted into browser-side prompts. The kernel prepares a minimal authorized request; an adapter may receive a short-lived source reference or derived content according to policy, but never database credentials or SQL. The Portfolio generator receives normalized, accepted text/evidence items rather than raw media.

## 5. Provenance flow

```mermaid
sequenceDiagram
    participant U as Authorized user
    participant K as Platform kernel
    participant E as Extraction adapter
    participant G as Portfolio generator adapter
    participant V as Visualization/export
    U->>K: Select source and requested feature
    K->>K: Check school, feature, access, consent and manifest
    K->>E: Minimal extraction request
    E-->>K: Normalized extracted text/candidates + provenance
    K->>U: Review candidate
    U->>K: Correct / accept / reject
    K->>K: Build frozen eligible-evidence manifest
    K->>G: Structured accepted evidence + approved profile
    G-->>K: Draft claims + source references + metadata
    K->>K: Validate every reference and preserve draft
    K->>U: Compare model candidates; edit / reject / approve each
    U->>K: Approve publication content
    K->>V: Approved frozen snapshot DTO
```

## 6. Acceptance scenarios

- A teacher sees the complete input manifest before starting a job.
- Removing one source item changes the manifest and job provenance.
- An AI suggestion cannot call the assessment-publication action.
- Teacher edits do not overwrite generated text.
- Service failure leaves manual workflows available and shows a local action-level error.
- A mock extraction adapter and a later production provider pass the same contract tests.
- A provider cannot make its own output accepted evidence or write a Portfolio snapshot.
- Disabling the feature after a job is queued prevents the worker from committing the result.
- Visualization produces the same presentation from the same approved snapshot regardless of which generator produced the earlier draft.
- Two providers may produce different rubric suggestions for the same manifest; both remain traceable and neither changes the official level until a human-reviewed observation cites the underlying proof.
- Invalidating one input marks the affected run stale and permits a successor run without changing the earlier manifest or output.
- Declared AI-assisted student work remains a separately labelled source item; the LLM/tool used does not itself make the work better aligned to a rubric.

