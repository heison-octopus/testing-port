# Definition-first planning addendum

**Date:** 10 November 2026  
**Status:** Internal planning proposal; not BHSS or JC approval. Complements `staged-component-implementation-plan.md`; Core and the bilingual SRS remain authoritative. This document does not create a new approved schema or assume all catalogues need a management screen.

## Purpose

First inventory all reusable definitions, templates, policies and exchange contracts across the system, then specify them in dependency order just far enough to implement and test each vertical slice. A complete inventory is useful; fully settling every future detail before building is not required. Distinguish confirmed rules from recommendations and open school policy. Record unanswered decisions using the existing bilingual discussion registers and IDs, adding IDs in both editions when needed.

## Vocabulary

- **Definition/catalogue:** reusable meaning or allowed choice, such as a capability, position, proof type or VASK label.
- **Template:** reusable structure or defaults, such as an activity form or Portfolio sections.
- **Policy:** a configurable rule and authority, such as approval steps or rubric aggregation; do not imply all policies use the same versioning model.
- **Exchange contract:** fields and validation for a particular CSV/XLSX/connector payload. A blank spreadsheet, an editable export, and runtime records have different jobs.
- **Assignment:** links an effective definition/version or responsibility to a school, user, activity or reviewer. An assignment is not itself a template.
- **Instance/record:** an activity, submitted answer, review decision or Portfolio created or processed using definitions. Not everything is a template.

## Catalogue to establish before implementation

Status here is a planning classification, not an implementation audit. Each line requires a verified source and actual V2/test status in the working inventory. Existing CSVs are examples, not proof of operational import.

| Domain | Definition, template or contract to inventory | Applied to / distinction | Baseline or open dependency |
|---|---|---|---|
| Identity | Position definitions | Position assignments; positions do not grant authority | Core identity; CSV 38–39 |
| Identity | Functional role definitions, versions, capability definitions and grants | Dated scoped user-role assignments, with explicit deny overrides | Core identity and SRS-01; CSV 22–23, 43–45, 60 |
| Identity | School feature availability | Controls feature availability separately from user permission | Core school boundary; SRS-02; verify V2 implementation |
| Organization | Academic years/periods, classes, subjects, departments, groups | Dated membership and reporting scope; reference data, not necessarily document templates | SRS-02; rollover H-08 open |
| Governance | Approval policies, steps, eligibility and escalation | Named assignments and decisions for each workflow | Core approvals; CSV 46–50; actual school authority open |
| Input | User, organization, period and activity data contracts | CSV/XLSX create/edit, staged validation, provenance and commit | SRS-03; CSV 00–05; real source fields require confirmation |
| Input | Activity type, activity template/version and intended labels | Activity instance/revision; assigned people and attendance are records | Core activity and SRS-04; verify V2 template support |
| Input | VASK or other labelling catalogue and version | Multiple contextual labels; no automatic assessment | Core labelling and SRS-04; CSV 20, 24–25 |
| Input | Instrument/question bank, question versions, blocks and form versions | Exact published form assigned to an activity; source instrument and question-owned ability remain distinct | Core forms and SRS-05; CSV 06–07, 09, 12–15 |
| Input | Response-entry workbook contract and task assignment rules | Answers against a published form; separate from form-definition workbook | SRS-05–06; peer assignment and safeguarding open |
| Input | Academic results/grading scheme and source parser contracts | Supporting evidence only; missing/absent is not zero | Proposed; real sanitized source and school decisions required |
| Processing | Proof types, media types, consent/access and source provenance | Typed proof and media instances, not a rubric score | Core evidence and SRS-07; CSV 08, 29–31, 34–35; privacy policy open |
| Processing | Rubric catalogue/version, groups, axes, levels and conditions | Selected at review; assess only when complete and assessment-capable | Core rubric package and SRS-08/13; CSV 24–28, 58–61; five-sheet Core workbook |
| Processing | Aggregation policy | Versioned MAX-CONFIRMED working policy; exact proof and reviewer decisions retained | Core and SRS-08; alternative calculation remains open |
| Processing | Review/outlook memory and AI provider/output contracts | Frozen input manifest and independent candidates; no automatic official result | SRS-10/13; CSV 32–33, 37; production AI permissions open |
| Output | Portfolio template/version, sections and school assignment | Working version and official snapshot pin template and rubric; student content remains separate | Core Portfolio and SRS-09/13; CSV 53–55, 62–65 |
| Output | Snapshot/export and visibility contracts | Approved frozen output, controlled access, withdrawal or successor | SRS-09; actual recipients/sharing policy open |

## Replanned sequence

0. **Inventory and alignment.** Trace every catalogue row to Core, SRS, CSV, V2 table/API/test, current state and owner; distinguish intended, implemented, verified, proposed and open. Note Core ER versus later prose and SRS conceptual versus physical schema. Resolve the documented five-versus-four rubric-sheet discrepancy bilingually. No code required to establish the inventory.
1. **Common contract decisions.** Specify the necessary shared conventions for stable IDs, scope, effective dates, ownership, lifecycle, immutable versions where required, named review assignment with `due_at`, approval, activation/publication, audit and successor behavior. Apply only the conventions appropriate to each domain; do not mandate a single generic lifecycle or framework. Define sheet/CSV mode, error and reconciliation rules separately. Protect historical pins and distinguish an effective assignment from a definition.
2. **Authorization definitions and school structure.** Specify capability, role version, scope, position and approval policy contracts, then implement/test the server checks and user routes. Add the school, period and membership foundations used by the first slice. SchoolAdmin policy authority does not itself grant reviewer assignment.
3. **Activity and input definitions.** Define the activity, roster, VASK, question/form and definition/response spreadsheet contracts. Implement one end-to-end activity and published-form path, including attendance and named reviewer assignments. Existing source records and form versions remain traceable.
4. **Processing definitions.** Specify proof types and one complete Skills Builder rubric package, review decisions and MAX-CONFIRMED. Implement evidence → human review → result using synthetic fixtures before extending sources. No automatic rating from labels or AI.
5. **Output definitions.** Specify a neutral Portfolio template, scoped assignment and frozen snapshot contract. Implement working version → assigned review → approved snapshot, pinning the exact versions and selected sources. Verify correction/withdrawal and reissue.
6. **Extend and harden.** Add remaining input sources, media, export and optional providers in dependency order, with production identity, consent and operations prerequisites. Preserve unresolved school policy and explicitly gate release.

For each domain, complete a definition sheet: purpose; source/status; stable ID and ownership; fields and constraints; relationships; allowed states/transitions; version and assignment rules; actors/capabilities and scope; create/export/import formats; historical impact; errors; examples; tests; open decisions. Only use versioning or review steps that the applicable domain needs. Acceptance is a tested vertical workflow, not merely an approved template diagram.

## Difference from the existing plan

The existing plan already specifies contracts before each component, and already includes role, input, rubric and Portfolio templates. This addendum makes the catalogue explicit at the beginning and adds a common definition-sheet format and dependency map. It does not change source precedence, imply every definition is a separate table, or require all forms of school data to be finalized before the first implementation slice.

Related documents: [staged plan](staged-component-implementation-plan.md), [whole-schema comparison](whole-schema-comparison.md), [V2 gap register](v2-documentation-and-schema-gap-register.md), [Core](../../output/English/Core%20data%20relationships.md), [SRS index](../../output/English/SRS/README.md), and [CSV manifest](../../output/import-examples/00_upload_manifest.csv).
