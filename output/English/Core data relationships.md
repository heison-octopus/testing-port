# Core data relationships

## Scope

This document describes the authoritative core operational data model before analytics, aggregation, radar-chart snapshots, recommendations, or progress calculations are introduced. `Aspects updated.md` remains a before/after explanation and implementation aid; when a field or relationship differs, this Core document governs and the import contracts must be aligned to it.

`Design ideas.docx` remains the original design source. `output/Questions.docx` is a later discovery document containing proposed workflows, implementation questions, and unconfirmed values. Items from the latter are labelled below rather than treated automatically as approved requirements.

Open and mid-level decisions are maintained in `output/English/Discussion questions.md`. This Core document records confirmed working rules and recommended architecture only; a question listed there does not become a system requirement until its decision is recorded here.

The 26 October 2026 kickstart update is isolated in `output/English/Current findings and questions v2.md`. Its four registers distinguish meeting-confirmed direction, approved architecture interpretation, product proposals, and unresolved dependencies.

## 26 October 2026 kickstart working architecture

**Status: approved architecture interpretation, pending the formal RC360 source and production privacy decisions.**

- The product has one core activity input contract. It does not include a versioned per-school schema mapper. Schools sanitize incoming data; the platform publishes required fields, validates, previews, and records approval.
- An activity stores its public description, optional private context, time, student-upload window, cover treatment, planned participants, approval state, and media state. Private context may improve evidence association but is not silently shown to students or sent to a processor.
- Teachers confirm actual attendance against the planned roster. A planned participant recorded absent creates a staff-approval exception. No absence-explanation form is assumed.
- VASK and activity-type catalogues are descriptive. A rubric catalogue becomes assessment-capable only if it defines versioned axes, levels, evidence rules, and publication authority. Selecting a rubric-axis label records observation intent, not a score.
- The first reliable path is serial: Skills Builder eight skills and 16 steps. Rubric/version keys preserve later parallel RC360 results, but the system does not average unlike rubrics by default.
- One activity form may contain teacher, student, and peer question blocks. Each response assignment separately records respondent, perspective, and subject. Draft blocks remain author-only until published.
- Image preview, face matching, speech transcription, and rubric suggestions use observable jobs. A completed job produces candidates only; authorized people confirm identity, speaker, evidence, and any published assessment.
- Learner-profile claims retain evidence links, rubric/version, prompt/model where relevant, editor, approver, and timestamps. An S3 cumulative view may cite S1–S3 snapshots without rewriting older versions.
- A student introduction starts from sentence starters or a generated draft, is edited and submitted by the student, and is approved or returned by the assigned teacher.

The POC may use school-supplied isolated test photos to demonstrate face confirmation. This does not settle production consent, retention, guardian approval, reference-photo sources, or provider terms.

### Approved linked-data revision

**Status: confirmed working architecture, tagged `Discussed on Meeting Oct 26 - kickstart`.**

- **Roles:** account identity, role definitions and effective user-role assignments are separate. An assignment records scope and effective dates. Approval assignments remain separate workflow records; holding a role does not prove that a particular approval was assigned.
- **School periods:** staff enter activity start and end dates. The server resolves the single containing period, such as `2025-26-P1`. A cross-period range creates an exception that must be split or explicitly approved; staff do not silently choose a convenient period.
- **Questions:** every question preserves its source, wording, meaning and a valid ability definition. There is no fixed Question → VASK, RC360 or Skills Builder mapping and no normalized mapping weight. The Portfolio cites the question, response, respondent, activity and linked proof, then applies the chosen rubric during authorized review.
- **Rubrics:** one catalogue may be usable for labelling, assessment, both, or neither. Assessment and radar output require versioned axes, ordered levels and concrete level conditions. A vocabulary such as VASK may provide LLM context without becoming a score.
- **Progression rule:** the active Skills Builder policy uses the highest human-confirmed satisfied level among the observations that an assigned authorized reviewer has explicitly included for that rubric version and axis. A learner may satisfy step 8 without satisfying every earlier step. Alternative rules such as an average must be stored as separately versioned policies and are not active by default.
- **Proof List:** responses, teacher/peer/self feedback, observations, platform media, external references and certificates are normalized through `proof_type_definitions`, `proof_items` and `proof_links`. Each item retains its proof/input type, perspective, provenance and declared authorship/AI-assistance origin. Adding a source type does not require rewriting the rubric algorithm.
- **AI boundary:** an LLM may draft positive, source-linked candidate statements or rubric suggestions only. Results from different provider/model/prompt versions remain parallel candidates and cannot overwrite each other. An LLM cannot downgrade a learner, accept proof, choose the included evidence set or publish a rubric level. Human confirmation remains mandatory.
- **Review / outlook memory:** a teacher selects the school-period range and which source classes are remembered: activity descriptions, confirmed/distilled outcomes, accepted proof summaries and published rubric results. Each generated review/outlook record freezes the exact source items and prompt version used.

### Approved school boundary and processing contracts

**Status: approved System Analyst architecture decision on 27 October 2026; this refines the direction tagged `Discussed on Meeting Oct 26 - kickstart` and is not recorded as a BHSS or JC policy approval.**

- **Stable school boundary:** every deployment has a `schools` record and stable `SchoolId`, persisted as `school_id`. It is opaque, immutable and not derived from a school name/code. A local single-school installation uses one configured school row; it does not remove the boundary. A hosted service uses the same key to isolate each school's records, connectors, jobs, policies and snapshots.
- **Whole-school control:** `schools.is_disabled` is an operational stop, with reason, actor and timestamp. It blocks new sessions, protected actions and newly claimed/committed jobs while retaining data, history and audit records. Re-enablement requires platform-operations authority rather than the ordinary SchoolAdmin role alone.
- **Selective feature availability:** `feature_definitions` is the product registry; `school_feature_policies` records `school_id + feature_key + availability`. Development, pilot and unknown features are unavailable by default unless explicitly enabled. A demo school can therefore test selected ready functions without seeing unfinished ones.
- **Availability is not authorization:** the kernel checks active school and effective feature policy before the use-case, then still applies role, assignment scope, lifecycle, consent and approval rules. APIs and workers repeat the authoritative check; the UI may reflect the result but is not the enforcement point.
- **Extraction contract:** the kernel calls an `ExtractionProvider` port with a minimal authorized request. The adapter returns normalized extracted text, ordered chunks/candidates, language/confidence where available, provider/version, warnings and timestamps. It cannot write platform records, accept proof, confirm identity or publish an assessment.
- **Portfolio-generation contract:** the kernel sends `PortfolioGenerator` a frozen manifest containing only accepted, Portfolio-eligible evidence for one school, student and period/range. The generator returns structured draft sections/claims with ordered source references and generation metadata. The kernel rejects any unknown, cross-school, ineligible or out-of-manifest reference.
- **Human and presentation boundary:** generated content remains a draft until authorized human approval. The kernel then freezes the approved snapshot DTO; web Portfolio, radar/presentation and export components read that DTO and do not know the extraction provider, LLM provider, prompt or generation method.
- **Delivery phase:** the provider-neutral contracts, validation and test doubles belong to P1. Production OCR/transcription and LLM-provider implementations remain P2 and depend on H-07/H-10 policy decisions.

```mermaid
flowchart LR
    Source[Authorized source/media] --> Kernel[Kernel: school, feature, access and consent checks]
    Kernel --> Extract[ExtractionProvider adapter]
    Extract --> Candidate[Normalized extracted text/candidates]
    Candidate --> Review[Human review and accepted eligible evidence]
    Review --> Manifest[Frozen Portfolio input manifest]
    Manifest --> Generator[PortfolioGenerator adapter]
    Generator --> Claims[Structured draft claims + source references]
    Claims --> Validate[Kernel validation + human approval]
    Validate --> Snapshot[Approved frozen snapshot DTO]
    Snapshot --> View[Visualization / export]
```

### Configurable staff, scope and approval architecture

**Status: approved System Analyst architecture decision on 28 October 2026. This is a reusable-product decision and not a BHSS or JC policy approval. Each school must configure the people, scopes and approval policies it actually uses.**

- **Position is not permission:** school job positions such as subject teacher, mentoring teacher, subject leader, principal, vice-principal, teaching assistant, programme coordinator, counsellor/social worker and school-office staff are searchable organizational facts. They do not grant access by themselves.
- **Functional roles are stackable:** one person may concurrently hold effective-dated functional roles such as educator, activity creator, activity editor, class teacher, assessor, Portfolio reviewer, Portfolio publisher, approval coordinator or SchoolAdmin. The separate `activity_staff.relationship` records whether that person is an owner, supporting teacher, assessor or observer on a particular activity. Every sensitive action records the role assignment and scope used.
- **Explicit scopes:** role, capability and approval eligibility may be scoped to a school, department, subject, year level, class, staff group, programme, activity or named student. Departments, subjects and staff groups are first-class school-owned records rather than free-text labels.
- **Capability policy:** `capability_definitions` names server-enforced actions. `role_capabilities` supplies the product default, while school policy may allow or deny a capability for a role, group or individual within a defined scope and effective period. An applicable explicit deny wins. UI navigation and teacher-search filters reflect effective capabilities but never replace server authorization.
- **Common teacher presentation:** the MVP may use one capability-driven Teacher workspace rather than separate visual designs for every position. Records, actions, filters and queues change according to effective assignments; the position label alone does not select the interface or authorize data.
- **Approval eligibility is not a staff type:** there is no permanent `approval_staff` identity. A teacher or other employee becomes eligible through a scoped functional role/capability. A separate named assignment allocates an actual record/version to an approver, and an immutable decision records the result.
- **Per-school, per-workflow policy:** each school independently configures activity revision, form, submission, proof/rubric, Portfolio and other approval workflows. The lean MVP supports only `not_required`, `automatic`, `single_reviewer` and `two_stage_sequential`; no parallel voting, quorum, arbitrary branching or user-authored workflow scripting is included.
- **Flexible separation of duties:** approval and publication are separate capabilities and events, but the same person may perform both when the active school policy permits. Self-approval is also configured per workflow step. Form, official rubric-result and Portfolio-publication policies should default to no self-approval; activity policy may permit the author to assign themselves when the school chooses.
- **Unowned work cannot bypass review:** manual assignments may name any eligible person, including the author when permitted. If no eligible reviewer exists, no one accepts the item, or a deadline expires, the work enters `approval_escalations`; it remains blocked until an authorized coordinator reassigns or resolves it.
- **Reasons and delegation:** rejection, exclusion, withdrawal, reassignment, post-publication correction and exceptional bypass always require a reason. Delegation is explicit, time-bounded, scoped and audited; informal forwarding does not transfer authority.
- **Teacher directory:** authorized staff can search/filter educators by position, functional role, department, subject, year, class, staff group, programme, approval eligibility and active/effective status. Search results remain school-scoped and do not expose records the searching user cannot otherwise access.
- **Stable activity identity with versioned content:** `activity_id` never changes when title, description or other governed configuration is revised. Material changes create an `activity_revision` and a new approval request; evidence, media, participants and submissions remain linked to the stable activity. The last approved revision remains the operational/student-visible revision until a successor is approved, unless a safety/privacy rule withdraws it.
- **Activity ownership and change requests:** a user with `activity.create` may create an activity. The creator/assigned editor may revise their own activity and submit the revision for approval. An assigned teacher who is not an editor may create an `activity_change_request` but cannot silently change a staff-owned activity. A teacher's publish action creates a publication/approval request when policy requires review; it does not itself make the revision visible.
- **Versioned Portfolio workspace:** a student may continue editing their latest self-introduction and selections, while the official Portfolio resolves the latest approved version. A class teacher may include all or part of the submitted student content, return it, and submit a proposed Portfolio version to the configured publisher. If no approved version exists, the official view shows `no_approved_version` and the student appears in the staff exception/escalation queue.
- **Authorship and source rules:** student-authored introductions/reflections are clearly labelled as student-authored and do not need external proof citations, although the submission and revision history remain traceable. LLM-generated `me_as_a_learner` claims and system-generated rubric summaries require source references. A class teacher may edit only the controlled prompt or generated learner narrative, not the student's own words or another educator's observation; generated, edited and final approved text remain separate, and the edited successor requires the configured approval.

The four-mode, two-step limit is intentionally small enough for the lean MVP. It replaces repeated domain-specific `approved_by_user_id` assumptions with one reusable control without attempting to become a general business-process engine.

### Product boundary and intended outcome

**Status: product direction, tagged `Discussed on Meeting Oct 26 - kickstart`; contractual terms remain open under H-11 to H-14.**

- BHSS is the lead solution proposer/reference school. JC may approve and fund programme operation or adoption. Octopus Infotech defines, owns and supplies the reusable product baseline, subject to written ownership, licence, branding and support terms.
- The platform must produce a usable evidence-backed Portfolio. It is designed to reduce reliance on academic results and memory-based staff discussion by making otherwise overlooked participation, abilities, interests and growth visible to authorized educators.
- The system consolidates school, teacher, student and authorized-staff contributions with media and other proof. It preserves differing perspectives and provenance rather than flattening them into an unsupported conclusion.
- Product requirements may be defined by Octopus Infotech, but school assessment policy, consent, access, publication authority and local operating rules still require explicit school decisions.

### Federated media sources

**Status: partly addressed, tagged `Discussed on Meeting Oct 26 - kickstart`; provider details remain open under L-08 and V2-D15.**

Media may remain in one or more school-approved stores. A `media_source_connector` records provider type, school scope, authentication reference, allow-listed root or endpoint, capabilities and status. A `media_asset` stores an opaque external reference plus available metadata, hash and provenance. It must not expose a raw filesystem path or storage credential to a browser client.

The server-side connector may resolve the reference by returning metadata, issuing a short-lived authorized URL, or proxy-streaming the media. Every resolution must enforce role and assignment scope, consent, lifecycle state and source availability, and must append an access audit. Connector failure leaves the evidence reference visible as unavailable; it must not silently remove the historical citation or assessment provenance.

The model preserves the original source of proof:

- what activity took place;
- who participated;
- which VASK items and framework skills the activity intended to develop;
- which assessment instrument was assigned;
- who completed it and about whom;
- what answers were submitted;
- what behaviour was observed;
- which framework step the evidence supports; and
- who created, reviewed, or approved each record.

It also separates student-selected meaning from formal skill progression. A certificate, external achievement, or Proud Moment may be valuable evidence of identity, values, attitudes, skills, or knowledge without having an official Skills Builder mapping or changing a 1–16 step.

## Revised rules from the RC360 discussion image

### Student-owned external achievements

A student may upload an external certificate or achievement, such as a piano competition result. Store it as `student_external_achievements`, not as an ordinary school-owned activity instance unless the school later adopts it as one.

Each external achievement must preserve:

- issuer, date, category, grade or difficulty, and result type;
- the original certificate or supporting media;
- a completed external-achievement form;
- student-selected VASK items;
- submission, review, and publication status; and
- the assigned teacher or teaching assistant review where publication is requested.

The default `official_skill_mapping_status` is `none`. A piano Grade 1 first runner-up, a piano Grade 8 first runner-up, and an attendance certificate are not equivalent. The result label must never be used alone to infer a framework step.

Where the teacher or teaching assistant did not observe the external activity, the certificate, student reflection, and student-selected VASK remain valid student-owned evidence, but no teacher rating is invented. This VA/self-reflection evidence is not averaged with a missing teacher score and does not change a published 1–16 step by default.

### Proud Moments and meaningful events

`proud_moment_selections` records a student's choice of an activity, external achievement, or evidence item that best represents the student. This selection is a presentation and reflection decision. It is not a skill-step award.

The internal model may allow an authorized reviewer to exclude or withhold an item from publication when it lacks sufficient context, consent, or evidence quality. Student-facing presentation must describe publication or review status neutrally and must not expose internal exclusion heuristics.

### Activity form package

Every school-owned activity must be packaged with one immutable form version. The form contains one or more question blocks for teacher, student or peer respondents. Each question keeps its source, bilingual wording, audience, order, scale and its own ability code, name and description. The ability explains what the question can validly ask or observe; it is not a VASK label, rubric axis or assessment result.

The working form-authoring flow uses two deliberately separate spreadsheet contracts:

```text
review the activity purpose and available question abilities
  -> select or write questions whose meaning fits that context
  -> download form-definition XLSX
  -> edit wording, audience, order, scale or ability definition
  -> upload and validate a staged row-level diff
  -> create a successor draft form version
  -> explicitly publish the version
```

The form-definition XLSX contains no student answers. The response-entry XLSX is generated only for entering answers against a published form. Importing a definition never changes student visibility; students stay on the last published version until the successor is explicitly published.

### Question evidence and rubric-time interpretation

**Status: confirmed working architecture, tagged `Discussed on Meeting Oct 26 - kickstart`.**

A submitted answer is registered as a source-linked Proof List item with its question, respondent, subject, activity, form version and provenance. At Portfolio processing time, an authorized reviewer may cite that proof when confirming a condition in the rubric then selected. The system does not pre-allocate question weight or an evidence-band ceiling. Approval of the form/question version and confirmation/publication of a rubric observation remain separate decisions.

### Shared submission review workflow

Questionnaire submissions, student reflection, and term `回顧與展望` use the same lifecycle:

```text
not_submitted -> draft -> submitted -> in_review
    -> changes_requested -> submitted
    -> approved
    -> rejected
```

The content version lifecycle remains separate from the response lifecycle. A published form template can still have an individual student submission that is not submitted or under review. Student-facing publication uses the separate visibility lifecycle below.

### Imported-response processing and visibility

An imported response is processed separately from whether the result is visible to the student:

```text
received -> identity_matched -> validated -> included_in_assessment
received -> needs_identity_resolution -> corrected -> validated
validated -> excluded
```

`included_in_assessment` means that the record may be counted by the assessment process. It does not publish teacher answers, feedback, or a portfolio item. Expected responses that have not arrived are recorded as `missing_response`, never zero, and are shown to the responsible teacher.

Student-facing visibility uses a separate lifecycle:

```text
unpublished -> published_to_portfolio -> withdrawn
```

When staff resolve an incorrect student ID, the imported payload remains immutable. The system records the original and resolved student IDs, before and after values, correction reason, correcting user, and timestamp. Published or counted records use the resolved identity without erasing the source error.

### Activity-catalogue delta import and lifecycle policy

**Status: confirmed System Analyst direction on 29 October 2026. This is internal product/architecture direction, not BHSS or JC approval.**

Activity-catalogue CSV/XLSX import is a **non-destructive delta (partial upsert)**. The file is not an authoritative snapshot: absence from the file means `no_change`. An activity changes only when its stable `activity_id` appears in a validated, included row, or when an authorized user edits it through the platform. A future authoritative-snapshot mode would need a separate policy, explicit `missing = disable` choice and impact preview; it is not inferred from an ordinary upload.

The editable round trip contains `activity_id`, `expected_revision_number`, governed editable fields, the current owner identifier, `lifecycle_action` and `change_reason`. It omits the immutable original author and upload-audit identities. An authorized audit export may show creator/uploader as read-only provenance. A stale expected revision is rejected rather than overwriting newer data. A new imported activity must name an eligible initial owner or an approved external-source authorship policy; the uploader is never silently made its author.

The lifecycle actions are `upsert`, `disable` and `restore`:

- `upsert` with identical governed values is an audited no-op. A material change creates an immutable successor draft against the same `activity_id`; a submitted/approved/published activity follows the normal reapproval path. The last approved revision remains official while the successor is pending.
- `disable` is the only ordinary import action that hides the canonical activity. It records reason, actor, time and previous state. Excluding the staged row only excludes that requested change; it does not disable the activity.
- `restore` is a new audited lifecycle decision and never erases the disable event.

`created_by_user_id` remains the original author. `owner_user_id`, uploaded/requested/service actor, committer and approval assignee remain separate. Upload or commit authority does not confer edit ownership, authorship or approval authority. Platform editing and spreadsheet import share server-side scope checks, validation, revision and approval policy.

When disabled, the activity is unavailable on student/participant discovery, direct activity, response, assessment and Proud Moment surfaces, and no new participant media/evidence fetch is authorized through it. Participation, media, proof, source rows and revision history remain; authorized staff retain audit access. Dependencies are registered as `needs_review` or `stale`, and an official output is withdrawn or reissued through an audited successor rather than silently recalculated. No action in this lifecycle hard-deletes the activity or its evidence.

### HKEAA input and the human review gate

The RC360 image states that the Skills component is partially assessed or validated with HKEAA involvement, while teachers perform final review and confirmation. The current scope therefore requires:

1. an initial teacher or teaching-assistant rating for each activity, student, and skill that is intended to contribute to a 1–16 step;
2. the source instrument or authority, such as `HKEAA-10-SKILLS`, recorded with that rating;
3. linked behavioural evidence and the relevant form submission;
4. teacher or teaching-assistant confirmation before the activity affects the published skill state; and
5. a missing-rating state rather than a calculated zero.

If the required human rating is missing, student self-review and peer review remain visible as unconfirmed evidence. They do not independently set the published 1–16 step. This prevents the AI layer or a respondent from becoming the final assessor by default.

### Source-type comparison, reviewer selection and later invalidation

**Status: approved System Analyst architecture decision on 27 October 2026. This is an internal architecture rule and is not recorded as BHSS or JC assessment-policy approval.**

For each rubric version and axis, the authorized review screen groups eligible human-confirmed candidate observations by configurable `proof_type_definition`. Each group shows its **candidate maximum supported level** and, after review decisions exist, the **included maximum supported level** that enters the active policy, together with exact proof links, perspective, dates, reviewer state and any authorship/AI-assistance declaration. Both source-type maximums are evidence summaries, not official results. AI suggestions are derived analysis and remain outside the proof-type calculation.

An assigned reviewer holding the required assessment-review capability and scope decides which observations and proof links are included in the official calculation. A person holding an effective assessor capability may propose or confirm an observation within assignment scope; a Teacher or TA position alone grants neither action. SchoolAdmin configures policy but receives no assessment authority merely from that role. Under `MAX-CONFIRMED`, the published level is the highest level among the included, eligible, unrevoked and human-confirmed observations for the same rubric version and axis. The reviewer may exclude an unsuitable candidate with a recorded reason, but cannot enter a source-free override. Selecting a higher level requires a human-confirmed observation linked to eligible proof.

Multiple LLM/provider suggestions for the same frozen evidence manifest are stored and shown side by side with provider, model, prompt version, input manifest and warnings. A reviewer may reject or ignore each suggestion independently. Accepting a suggestion creates or updates a human-reviewed observation; it never turns the model output into proof and never overwrites a different suggestion.

An earlier acceptance is reversible at the **use** level. `proof_use_decisions` records the proof, target observation/claim/generation run, decision (`included`, `excluded`, `invalidated`, `superseded`), reason, actor and time. This permits one proof to be excluded from one rubric decision while remaining valid elsewhere. A globally false association—such as a face match assigning a student to an activity they never joined—invalidates or corrects the identity/evidence link itself.

When a used source or association is later excluded, corrected or invalidated, the system follows its dependency links and marks affected extraction results, LLM suggestions, observations, claims and current snapshots `needs_review` or `stale`. It does not automatically substitute another source or silently lower/raise the level. If the affected result is published, the current publication is withdrawn and an authorized reviewer must approve and publish a successor snapshot; the earlier version remains auditable.

Manual correction/exclusion actions that must be available where applicable are:

1. exclude one proof link from a particular observation, Portfolio claim or generation manifest;
2. correct/reject a face or other identity association and remove the false student/activity link;
3. correct speaker attribution, transcript/OCR text or extracted metadata;
4. correct actual attendance/participation without rewriting the planned roster;
5. exclude, correct or supersede an imported row while retaining the original payload;
6. restrict/disable media or consent-dependent use without hard-deleting historical provenance;
7. reject an individual LLM claim or rubric suggestion;
8. supersede or withdraw a human rubric observation/published result;
9. withdraw and reissue an affected Portfolio snapshot/export after impact review; and
10. restore a wrongly excluded use through a new audited decision rather than erasing the exclusion history.

```mermaid
flowchart LR
    Proof[Accepted typed proof] --> Candidate[Human-confirmed candidate observations]
    Candidate --> Group[Group by proof/input type]
    Group --> Max[Candidate maximum per type + exact sources]
    Models[Parallel LLM suggestions] -. advisory .-> Review[Assigned capability-scoped reviewer]
    Max --> Review
    Review --> Included[Included observations and proof links]
    Included --> IncludedMax[Included maximum per type]
    IncludedMax --> Policy[MAX-CONFIRMED within included set]
    Policy --> Result[Official level + selected sources + rationale]
    Bad[Later source/identity problem] --> Decision[Exclude / correct / invalidate with reason]
    Decision --> Impact[Dependency impact: needs_review / stale]
    Impact --> Reissue[Withdraw and reissue if published]
```

### Peer-review assignment

Peer review is not automatically available to every participant. `peer_review_assignments` records the subject student, named peer reviewer, assigning teacher or teaching assistant, due date, form version, status, and whether moderation is required. The policy for how teachers choose peers remains an open school decision.

## Operational requirements identified in Questions docx

The following additions are needed because `output/Questions.docx` goes beyond the original design concept and describes day-to-day operation.

### Confirmed structural needs

- Keep the source system on every imported record so Time Infinity, school-based activities, academic results, and manual entries remain distinguishable.
- Keep attendance or participation state separate from assessment completion.
- Give each activity configurable student-access opening, closing, and due times. The suggested event-day 3 p.m. release is a policy value, not a hard-coded rule.
- Record who reviewed and corrected OCR or transcription output before it can be cited as evidence.
- Publish a versioned portfolio snapshot rather than rebuilding an official output from mutable live data.
- Generate controlled export packages for an external recipient without making that recipient a platform user in the MVP.

### Proposed policies requiring school confirmation

- File size and MIME-type rules belong in configurable upload policy. The suggested 5 MB image limit and JPEG/PNG list are not yet confirmed.
- Student, teacher, and staff upload permissions must be configurable by evidence type. “Student can upload certificates only” is not assumed globally.
- A maximum number of Proud Moments belongs in portfolio policy. The suggested maximum of 24 is not hard-coded.
- Insufficient evidence must produce `not_enough_evidence`, not a low or zero skill result. The school must decide whether the first portfolio is published only after the first term.
- An external or professional assessment can be recorded as another rated source. It cannot silently override the school decision until the authority, scope, and appeal policy are confirmed.
- Automated reminders and an exact student-unlock schedule are workflow enhancements, not prerequisites for storing valid evidence.

### Selectable AI-assisted drafting

The POC may provide three controlled drafting profiles:

1. academic learning and reasoning;
2. non-academic participation and personal growth; and
3. interpersonal collaboration and intrapersonal development.

Teachers may adjust controlled inputs such as emphasis, student age or class, tone, length, and information to omit. The first release should not expose an unrestricted production system prompt to every teacher.

Every generated result records the model and prompt-profile version. The system preserves `generated_text`, `teacher_edited_text`, and `final_published_text` separately, together with the editor, edit time, and revision history. A teacher edit improves the final wording without erasing what the system generated. AI output remains a draft and never becomes an identity decision, accepted evidence, or published framework step without the relevant human review.

Original media is hidden from the Portfolio by default. A published Portfolio may show an evidence reference or attachment count; access to the actual image, audio, or document remains a separate permission decision.

## Operational visual guide

The entity diagrams later in this document define storage and cardinality. The following diagrams show how people use those records and where human decisions occur.

### Platform actors and boundaries

```mermaid
flowchart LR
    Student[Student] -->|reflection, evidence, certificate| Platform[BHSS portfolio platform]
    Peer[Assigned peer reviewer] -->|peer response| Platform
    ActivityTeacher[Activity teacher or TA] -->|activity setup, observation, rating| Platform
    ClassTeacher[Class teacher] -->|portfolio review and return| Platform
    Staff[Assigned authorized reviewer or publisher] -->|exception review and publication| Platform
    Admin[SchoolAdmin] -->|users, periods, policy and access| Platform
    TimeInfinity[Time Infinity or school files] -->|controlled import| Platform
    Platform -->|published portfolio and feedback| Student
    Platform -->|assigned student summaries| ClassTeacher
    Platform -->|PDF or SLP and controlled XLSX| External[External report recipient]
    Platform -.->|no MVP login| External
```

An external report recipient is outside the authenticated MVP boundary. One staff member may hold several roles, but each action is recorded under the role and scope used for that action.

### People and records around one activity

```mermaid
flowchart TB
    Activity[Activity instance]
    Owner[Owner teacher]
    Support[Supporting teacher or TA]
    Students[Participating students]
    Peers[Named peer reviewers]
    ClassTeacher[Class teacher]
    Staff[Authorized staff]
    Package[Immutable activity package]
    VASK[VASK intentions]
    Form[Approved published form version]
    Evidence[Responses, observations and media]
    Review[Reviewed framework observations]
    Portfolio[Period portfolio snapshot]

    Owner -->|owns| Activity
    Support -->|supports or assesses| Activity
    Students -->|participate| Activity
    Peers -.->|only when assigned| Activity
    ClassTeacher -->|reviews portfolio items| Activity
    Staff -->|handles approval and exceptions| Activity
    Activity --> Package
    Package --> VASK
    Package --> Form
    Students --> Evidence
    Peers -.-> Evidence
    Owner --> Evidence
    Support --> Evidence
    Evidence --> Review
    ClassTeacher --> Review
    Staff --> Portfolio
    Review --> Portfolio
```

Activity membership does not grant unrestricted media or portfolio access. Media consent, reviewer assignment, class scope, and publication state remain separate controls.

### End-to-end activity swimlane

```mermaid
sequenceDiagram
    autonumber
    participant Admin as SchoolAdmin
    participant Staff as Assigned authorized reviewer
    participant Teacher as Activity teacher or TA
    participant System
    participant Student
    participant Peer as Assigned peer
    participant Class as Class teacher

    Admin->>System: Configure users, groups and reporting period
    Staff->>System: Approve and publish an eligible form version
    Teacher->>System: Create activity with VASK, dates and staff
    Teacher->>System: Confirm participants and assign exact form version
    opt Activity requires approval
        Staff->>System: Approve activity and its collection conditions
    end
    System->>Student: Open assigned reflection and evidence task
    Student->>System: Submit responses and permitted evidence
    System->>System: Match identity and validate submitted or imported responses
    alt Student ID cannot be matched
        System-->>Staff: Place record in identity-resolution queue
        Staff->>System: Record corrected student ID, reason and before/after values
    end
    System-->>Teacher: Flag expected responses that are still missing
    Staff->>System: Confirm validated responses for assessment inclusion
    opt Peer review is required
        Teacher->>System: Assign a named peer reviewer
        Peer->>System: Submit peer response
    end
    Teacher->>System: Submit observation, feedback and initial skill rating
    System->>Teacher: Flag missing evidence, consent or ratings
    Teacher->>System: Confirm evidence-backed skill observations
    Class->>System: Review portfolio inclusion rows
    Staff->>System: Resolve exceptions and publish period snapshot
    System-->>Student: Show activity, feedback and published skill evidence
    System-->>Staff: Generate versioned PDF or SLP and XLSX export
```

This is the recommended operating flow. The school must still confirm which staff role owns each approval and whether routine activities can be approved automatically.

### Activity data package

```mermaid
flowchart LR
    Template[Activity template] --> Instance[Activity instance]
    Period[Academic period] --> Instance
    Staff[Assigned staff] --> Instance
    Roster[Participants and attendance] --> Instance
    VASK[VASK intentions] --> Instance
    Form[Exact approved form version] --> Assignment[Assessment assignment]
    Instance --> Assignment
    Assignment --> Submission[Self, peer and teacher submissions]
    Instance --> Media[Activity and student media]
    Submission --> Evidence[Feedback evidence]
    Media -.->|when cited and permitted| Evidence
    Evidence --> Observation[Human-confirmed framework observation]
    Observation --> Item[Portfolio item]
    Instance --> Item
    Item --> Snapshot[Versioned period snapshot]
```

The activity is the shared context, but the form version, respondent, evidence, reviewer, and publication record remain individually traceable.

### Evidence decision flow

```mermaid
flowchart TD
    Source{Evidence source}
    School[School-owned activity]
    External[Student external achievement]
    Candidate[Candidate VASK and skill evidence]
    Consent{Identity, consent and access valid?}
    Rating{Assigned teacher or TA rating present?}
    Confirm{Human reviewer confirms the observation?}
    Unconfirmed[Keep as unconfirmed supporting evidence]
    NoEvidence[Record not enough evidence]
    Observation[Approved framework observation]
    Portfolio[Eligible for a published portfolio snapshot]
    Proud[Proud Moment selection]

    Source --> School
    Source --> External
    School --> Candidate
    External -->|VASK allowed; no formal rubric result by default| Candidate
    Candidate --> Consent
    Consent -->|No| Unconfirmed
    Consent -->|Yes| Rating
    Rating -->|No| NoEvidence
    Rating -->|Yes| Confirm
    Confirm -->|No or changes requested| Unconfirmed
    Confirm -->|Yes| Observation
    Observation --> Portfolio
    Candidate -.->|student may select| Proud
    Proud -.->|does not award a step| Portfolio
```

Self-review, peer review, questionnaire scores, grades, media extraction, and AI suggestions can support a decision. They cannot independently set the published 1–16 step.

### Independent lifecycle states

```mermaid
stateDiagram-v2
    state "Activity" as Activity {
        [*] --> activity_draft
        activity_draft --> pending_review
        pending_review --> activity_approved
        pending_review --> activity_draft: changes requested
        activity_approved --> active
        active --> completed
        completed --> archived
    }
    state "Form version" as Form {
        [*] --> form_draft
        form_draft --> in_review
        in_review --> changes_requested
        changes_requested --> form_draft
        in_review --> form_approved
        form_approved --> form_published
        form_published --> withdrawn
        form_published --> retired
    }
    state "Submission content" as Response {
        [*] --> not_submitted
        not_submitted --> response_draft
        response_draft --> submitted
        submitted --> response_in_review
        response_in_review --> response_changes_requested
        response_changes_requested --> response_draft
        response_in_review --> response_approved
        response_in_review --> rejected
    }
    state "Imported response processing" as Processing {
        [*] --> received
        received --> identity_matched
        received --> needs_identity_resolution
        needs_identity_resolution --> corrected
        corrected --> identity_matched
        identity_matched --> validated
        validated --> included_in_assessment
        validated --> excluded
    }
    state "Student-facing visibility" as Visibility {
        [*] --> unpublished
        unpublished --> published_to_portfolio
        published_to_portfolio --> withdrawn
    }
```

Approval, assessment inclusion, and publication are separate. Publishing a form does not publish a student's response; including an imported record in assessment does not make it student-visible; and approving a portfolio item does not automatically publish a period snapshot.

### Return after publication

```mermaid
sequenceDiagram
    autonumber
    participant Class as Class teacher
    participant System
    participant Student
    participant Staff as Authorized staff

    Class->>System: Return a published dependent item for editing
    System->>System: Mark item changes_requested
    System->>System: Withdraw affected portfolio snapshot
    System-->>Student: Hide the withdrawn result and show editing state
    System-->>Staff: Show zero active publication for the withdrawn snapshot
    Student->>System: Correct and resubmit the item
    Class->>System: Review and approve the corrected item
    Note over System,Staff: Reapproval does not republish automatically
    Staff->>System: Explicitly publish a new snapshot version
    System-->>Student: Show the republished result
```

The withdrawal preserves the earlier audit record. It does not delete the previous snapshot or silently reuse its approval.

### Reporting period and official output

```mermaid
flowchart LR
    Live[Live activity history] --> Review[Period inclusion review]
    Observations[Approved framework observations] --> Review
    Reflections[Approved reflections and Proud Moments] --> Review
    Review --> Gate{All required items approved?}
    Gate -->|No| Queue[Return or exception queue]
    Queue --> Review
    Gate -->|Yes| Snapshot[Immutable portfolio snapshot]
    Snapshot --> Student[Student portfolio view]
    Snapshot --> PDF[Printable PDF or SLP]
    Snapshot --> XLSX[Controlled evidence register]
    PDF --> External[External recipient]
    XLSX -.->|only when detailed checking is required| External
```

The live timeline may continue to change after a reporting period closes. A published snapshot and its exports remain reproducible until an authorized withdrawal creates a new publication event.

### Documentation traceability

```mermaid
flowchart TB
    Original[Original evidence<br/>Design ideas, framework PDFs, VASK and workbook]
    Discovery[Discovery evidence<br/>Questions docx and client discussion images]
    Architecture[Current architecture<br/>Core, Aspects and Roles]
    Planning[Planning interpretation<br/>Agenda, internal review and external proposal]
    Prototype[Demonstrations<br/>system map, simulators and bilingual presentation]
    Decision[Confirmed school decision]
    Open[Open or configurable rule]

    Original --> Architecture
    Discovery --> Architecture
    Architecture --> Planning
    Architecture --> Prototype
    Planning --> Decision
    Prototype --> Decision
    Decision -->|update authoritative documents| Architecture
    Discovery --> Open
    Open -.->|must not be presented as confirmed| Planning
```

Original evidence is not silently rewritten. A prototype demonstrates an interpretation; it becomes an authoritative rule only after the decision is recorded in the architecture documents.

## Cardinality legend

| Mermaid symbol | Meaning |
|---|---|
| `||--||` | Exactly one to exactly one |
| `||--o|` | One to zero or one |
| `||--o{` | One to zero or many |
| `||--|{` | One to one or many |
| `o{--o{` | Many to many conceptually; implement through a junction table |

In the diagrams below, many-to-many relationships are made explicit using junction entities.

## Complete core relationship overview

```mermaid
flowchart LR
    subgraph Identity[Identity and school structure]
        S[Schools]
        U[Users]
        UR[User roles]
        R[Roles]
        GM[Group memberships]
        G[Groups]
        AP[Academic periods]
        FD[Feature definitions]
        SFP[School feature policies]
    end

    subgraph Activity[Activity context]
        AT[Activity templates]
        AI[Activity instances]
        ATP[Activity participants]
        ATS[Activity staff]
        AV[Activity VASK items]
        AFT[Activity framework targets]
    end

    subgraph Reference[Learning reference data]
        VI[VASK items]
        FW[Frameworks]
        FS[Framework skills]
        FST[Framework steps]
        QC[Questionnaire constructs]
    end

    subgraph Instrument[Assessment instrument]
        IN[Assessment instruments]
        II[Instrument items]
        Q[Questions]
        RS[Response scales]
        RSO[Response scale options]
    end

    subgraph Workflow[Assignment and submission]
        AA[Assessment assignments]
        AR[Assignment recipients]
        SUB[Assessment submissions]
        RESP[Question responses]
    end

    subgraph Proof[Evidence / Proof List]
        FB[Feedback]
        MA[Media assets]
        PT[Proof type definitions]
        PI2[Proof items]
        PL[Proof links]
        OBS[Rubric observations]
    end

    subgraph Delivery[Import portfolio and delivery]
        SS[Source systems]
        IB[Import batches]
        IR[Import records]
        PS[Portfolio snapshots]
        PI[Portfolio items]
        EP[Export packages]
    end

    S --> UR
    U --> UR --> R
    U --> GM --> G
    S --> AP
    AP --> G
    S --> SFP
    FD --> SFP

    AT --> AI
    AP --> AI
    G --> AI
    AI --> ATP
    AI --> ATS
    U --> ATP
    U --> ATS

    AI --> AV --> VI
    AI --> AFT --> FS
    AFT -. optional target .-> FST

    FW --> FS --> FST
    QC --> Q

    IN --> II --> Q
    Q --> RS --> RSO
    AI --> AA
    IN --> AA
    AA --> AR
    U --> AR
    AR --> SUB --> RESP
    Q --> RESP

    AI --> FB
    U --> FB
    SUB --> FB
    PT --> PI2
    RESP --> PI2
    FB --> PI2
    MA --> PI2
    PI2 --> PL --> OBS
    FS --> OBS
    FST --> OBS
    EVO -. optional media proof .-> MA

    SS --> IB --> IR
    U --> IB
    U --> PS
    AP --> PS
    PS --> PI
    PS --> EP
    U --> EP
```

The arrows in this overview show direction of reference and workflow. The ER diagrams below show exact cardinalities.

---

## 1 Identity and school structure

```mermaid
erDiagram
    SCHOOLS ||--o{ USERS : contains
    USERS ||--o{ USER_POSITION_ASSIGNMENTS : holds
    STAFF_POSITION_DEFINITIONS ||--o{ USER_POSITION_ASSIGNMENTS : names
    USERS ||--o{ USER_ROLE_ASSIGNMENTS : receives
    ROLE_DEFINITIONS ||--o{ USER_ROLE_ASSIGNMENTS : classifies
    SCHOOLS ||--o{ USER_ROLE_ASSIGNMENTS : scopes
    ROLE_DEFINITIONS ||--o{ ROLE_CAPABILITIES : grants_by_default
    CAPABILITY_DEFINITIONS ||--o{ ROLE_CAPABILITIES : defines
    SCHOOLS ||--o{ CAPABILITY_POLICY_OVERRIDES : configures
    CAPABILITY_DEFINITIONS ||--o{ CAPABILITY_POLICY_OVERRIDES : modifies
    SCHOOLS ||--o{ SCHOOL_FEATURE_POLICIES : configures
    FEATURE_DEFINITIONS ||--o{ SCHOOL_FEATURE_POLICIES : controls
    USERS ||--o{ SCHOOL_FEATURE_POLICIES : changes

    SCHOOLS ||--o{ DEPARTMENTS : contains
    SCHOOLS ||--o{ SUBJECTS : contains
    DEPARTMENTS ||--o{ DEPARTMENT_SUBJECTS : contains
    SUBJECTS ||--o{ DEPARTMENT_SUBJECTS : offered_by
    SCHOOLS ||--o{ GROUPS : contains
    SCHOOLS ||--o{ ACADEMIC_PERIODS : defines
    ACADEMIC_PERIODS ||--o{ GROUPS : organises
    USERS ||--o{ GROUP_MEMBERSHIPS : joins
    GROUPS ||--o{ GROUP_MEMBERSHIPS : contains
    SCHOOLS ||--o{ STAFF_GROUPS : contains
    DEPARTMENTS ||--o{ STAFF_GROUPS : may_scope
    SUBJECTS ||--o{ STAFF_GROUPS : may_scope
    USERS ||--o{ STAFF_GROUP_MEMBERSHIPS : joins
    STAFF_GROUPS ||--o{ STAFF_GROUP_MEMBERSHIPS : contains

    USERS {
        uuid user_id PK
        uuid school_id FK
        string external_user_id
        string display_name
        string email
        string status
        datetime created_at
        datetime updated_at
    }

    STAFF_POSITION_DEFINITIONS {
        uuid position_id PK
        uuid school_id FK
        string position_code
        string name_en
        string name_zh
        string position_category
        int sort_order
        string status
        uuid created_by_user_id FK
        datetime created_at
    }

    USER_POSITION_ASSIGNMENTS {
        uuid user_position_assignment_id PK
        uuid user_id FK
        uuid position_id FK
        uuid school_id FK
        uuid department_id FK
        uuid subject_id FK
        datetime effective_from
        datetime effective_until
        boolean is_primary
        string status
        uuid assigned_by_user_id FK
        datetime assigned_at
    }

    ROLE_DEFINITIONS {
        uuid role_id PK
        string role_code UK
        string name_en
        string name_zh
        string role_category
        boolean assignable
        string description_en
        string description_zh
        string status
    }

    USER_ROLE_ASSIGNMENTS {
        uuid user_role_assignment_id PK
        uuid user_id FK
        uuid role_id FK
        uuid school_id FK
        string scope_type
        uuid scope_id
        datetime effective_from
        datetime effective_until
        string status
        uuid assigned_by_user_id FK
        datetime assigned_at
        string ended_reason
    }

    CAPABILITY_DEFINITIONS {
        uuid capability_id PK
        string capability_key UK
        string name_en
        string name_zh
        string resource_type
        boolean sensitive
        string status
    }

    ROLE_CAPABILITIES {
        uuid role_capability_id PK
        uuid role_id FK
        uuid capability_id FK
        string effect
        string condition_key
        string status
        uuid configured_by_user_id FK
        datetime configured_at
    }

    CAPABILITY_POLICY_OVERRIDES {
        uuid capability_policy_override_id PK
        uuid school_id FK
        string target_type
        uuid target_id
        uuid capability_id FK
        string effect
        string scope_type
        uuid scope_id
        datetime effective_from
        datetime effective_until
        string reason
        uuid configured_by_user_id FK
        datetime configured_at
        string status
    }

    SCHOOLS {
        uuid school_id PK
        string school_code UK
        string name
        string operating_mode
        boolean is_disabled
        string disabled_reason
        uuid disabled_by_user_id FK
        datetime disabled_at
    }

    FEATURE_DEFINITIONS {
        string feature_key PK
        string description
        string lifecycle
        string default_availability
    }

    SCHOOL_FEATURE_POLICIES {
        uuid school_feature_policy_id PK
        uuid school_id FK
        string feature_key FK
        string availability
        string reason
        datetime starts_at
        datetime ends_at
        uuid configured_by_user_id FK
        datetime configured_at
    }

    ACADEMIC_PERIODS {
        uuid period_id PK
        uuid school_id FK
        string name
        date starts_on
        date ends_on
    }

    DEPARTMENTS {
        uuid department_id PK
        uuid school_id FK
        string department_code
        string name_en
        string name_zh
        uuid parent_department_id FK
        datetime effective_from
        datetime effective_until
        string status
        uuid created_by_user_id FK
        datetime created_at
    }

    SUBJECTS {
        uuid subject_id PK
        uuid school_id FK
        string subject_code
        string name_en
        string name_zh
        datetime effective_from
        datetime effective_until
        string status
        uuid created_by_user_id FK
        datetime created_at
    }

    DEPARTMENT_SUBJECTS {
        uuid department_subject_id PK
        uuid department_id FK
        uuid subject_id FK
        uuid school_id FK
        datetime effective_from
        datetime effective_until
        string status
        uuid assigned_by_user_id FK
        datetime assigned_at
    }

    GROUPS {
        uuid group_id PK
        uuid school_id FK
        uuid period_id FK
        string group_type
        string name
    }

    GROUP_MEMBERSHIPS {
        uuid group_membership_id PK
        uuid group_id FK
        uuid user_id FK
        string membership_role
        string class_number
        datetime starts_at
        datetime ends_at
    }

    STAFF_GROUPS {
        uuid staff_group_id PK
        uuid school_id FK
        string group_code
        string name_en
        string name_zh
        string group_purpose
        uuid department_id FK
        uuid subject_id FK
        datetime effective_from
        datetime effective_until
        string status
        uuid created_by_user_id FK
        datetime created_at
    }

    STAFF_GROUP_MEMBERSHIPS {
        uuid staff_group_membership_id PK
        uuid staff_group_id FK
        uuid user_id FK
        string membership_role
        datetime effective_from
        datetime effective_until
        string status
        uuid assigned_by_user_id FK
        datetime assigned_at
    }
```

### Key relationships

| Relationship | Type | Explanation |
|---|---|---|
| Users to positions | Many-to-many over time | A person may hold several searchable school positions. Positions describe employment/duty and grant no permission by themselves. |
| Users to functional roles | Many-to-many and scoped | One user may be an activity creator/editor, class teacher and Portfolio reviewer at the same time. `user_role_assignments` records `scope_type`, `scope_id`, effective dates and assignment history; activity-specific teacher relationships remain in `activity_staff`. |
| Roles to capabilities | Many-to-many | `role_capabilities` supplies product defaults. `capability_policy_overrides` applies school-, group- or user-level allow/deny policy; an applicable explicit deny wins. |
| Users to groups | Many-to-many | A student can join different classes or project groups over time through `group_memberships`. Teachers join permission-targetable organizational groups through `staff_group_memberships`; neither membership changes a job position by itself. |
| Departments to subjects | Many-to-many | A subject may be offered by more than one department or organizational unit; both are available as authorization and directory-filter scopes. |
| Academic period to groups | One-to-many | One school year or term can contain many groups. |
| School to feature definitions | Many-to-many | `school_feature_policies` records each school's audited availability override. The pair `school_id + feature_key` is unique. |

`school_id` is mandatory on tenant-owned roots and must otherwise be derivable through an enforced parent relation. Repositories never accept an unscoped tenant query. A browser-supplied school ID is only a reference; the authenticated session and server policy determine the effective school. `scope_type` supports `school`, `department`, `subject`, `year`, `class`, `group`, `programme`, `activity` and `student`; the referenced `scope_id` must resolve inside the same school.

### Configurable approval records

```mermaid
erDiagram
    SCHOOLS ||--o{ APPROVAL_POLICY_VERSIONS : configures
    APPROVAL_POLICY_VERSIONS ||--|{ APPROVAL_POLICY_STEPS : contains
    CAPABILITY_DEFINITIONS ||--o{ APPROVAL_POLICY_STEPS : requires
    APPROVAL_POLICY_STEPS ||--o{ APPROVAL_ASSIGNMENTS : creates
    USERS ||--o{ APPROVAL_ASSIGNMENTS : assigned_to
    APPROVAL_ASSIGNMENTS ||--o| APPROVAL_DECISIONS : completed_by
    USERS ||--o{ APPROVAL_DECISIONS : decides
    APPROVAL_ASSIGNMENTS ||--o{ APPROVAL_ESCALATIONS : may_raise

    APPROVAL_POLICY_VERSIONS {
        uuid approval_policy_version_id PK
        uuid school_id FK
        string workflow_type
        int policy_version
        string mode
        string scope_type
        uuid scope_id
        boolean allow_self_assignment
        boolean allow_self_approval
        boolean publication_separate
        int max_human_steps
        string default_queue_key
        int unassigned_escalation_minutes
        int overdue_escalation_minutes
        datetime effective_from
        datetime effective_until
        string status
        uuid configured_by_user_id FK
        datetime configured_at
    }

    APPROVAL_POLICY_STEPS {
        uuid approval_policy_step_id PK
        uuid approval_policy_version_id FK
        int step_number
        string name_en
        string name_zh
        uuid required_capability_id FK
        string assignee_strategy
        int required_decision_count
        boolean reason_required
        string status
    }

    APPROVAL_ASSIGNMENTS {
        uuid approval_assignment_id PK
        uuid school_id FK
        uuid approval_policy_version_id FK
        uuid approval_policy_step_id FK
        string target_type
        uuid target_id
        uuid target_version_id
        uuid assigned_by_user_id FK
        uuid assignee_user_id FK
        uuid assignee_role_assignment_id FK
        string status
        datetime assigned_at
        datetime accepted_at
        datetime due_at
        uuid delegated_from_assignment_id FK
        datetime delegation_effective_until
    }

    APPROVAL_DECISIONS {
        uuid approval_decision_id PK
        uuid approval_assignment_id FK
        uuid school_id FK
        int step_number
        string outcome
        string reason
        uuid decided_by_user_id FK
        uuid used_capability_id FK
        string used_scope_type
        uuid used_scope_id
        datetime decided_at
    }

    APPROVAL_ESCALATIONS {
        uuid approval_escalation_id PK
        uuid school_id FK
        uuid approval_assignment_id FK
        string target_type
        uuid target_id
        uuid target_period_id
        string trigger_reason
        string queue_key
        string status
        datetime triggered_at
        uuid owned_by_user_id FK
        datetime resolved_at
        string resolution_note
    }
```

`mode` is limited in the lean MVP to `not_required`, `automatic`, `single_reviewer` or `two_stage_sequential`. A two-stage policy contains exactly two ordered steps; each step has one decision (`required_decision_count = 1`). `assignee_user_id` may equal the author only when the active policy permits both the relevant self-assignment and self-approval action. Domain records retain their own lifecycle and publication state; the generic approval records provide eligibility, assignment, decision and escalation history rather than replacing domain meaning.

### Recommended temporal student model — school confirmation still required (H-08)

The student's identity is stable; placement and school status are time-bounded histories. The POC implements this as a recommended interpretation while the school's full rollover policy remains open.

```mermaid
erDiagram
    STUDENTS ||--o{ STUDENT_CLASS_MEMBERSHIPS : has_over_time
    STUDENTS ||--o{ STUDENT_SCHOOL_STATUS_HISTORY : has_over_time
    ACADEMIC_YEARS ||--o{ STUDENT_CLASS_MEMBERSHIPS : scopes
    SCHOOL_PERIODS ||--o{ STUDENT_CLASS_MEMBERSHIPS : optionally_scopes
    CLASSES ||--o{ STUDENT_CLASS_MEMBERSHIPS : places
    STUDENTS ||--o{ ACTIVITY_PARTICIPANTS : joins
    ACTIVITIES ||--o{ ACTIVITY_PARTICIPANTS : includes
    ROLLOVER_BATCHES ||--o{ ROLLOVER_COMPARISON_ITEMS : contains
    STUDENTS o|--o{ ROLLOVER_COMPARISON_ITEMS : may_match
```

- `students.student_id` remains the core identity through class moves, retention, regrading, leave, withdrawal and return.
- `student_class_memberships` records `class_id`, grade, academic year or period, `valid_from`, `valid_to`, change type, reason, actor and an optional superseded membership.
- `student_school_status_history` separately records active, leave, withdrawn, returned and graduated states. A student may therefore leave for two years and return without creating a new identity.
- Activities store the participant's `student_id`, not a copied current class. To show the historical class, resolve the membership whose effective dates contain the activity date.
- A year-transition batch compares the old and proposed rosters as unchanged, class move, retained/regraded, returning, new candidate, or outgoing/missing. A `new_candidate` must be explicitly confirmed before the system creates a student and assigns a class.
- Imports and corrections retain before/after values, actor, reason and time in the audit trail. They do not rewrite earlier activity records.

This design prevents current class changes from contaminating historical activity evidence. The school must still confirm rollover cut-off dates, overlapping-membership rules, late transfers, duplicate-identity resolution and who may apply a reviewed batch; those decisions remain under H-08.

---

## 2 Activities, participants, VASK, and framework targets

```mermaid
erDiagram
    ACTIVITY_TYPES ||--o{ ACTIVITY_TEMPLATES : classifies
    ACTIVITY_TEMPLATES ||--o{ ACTIVITY_INSTANCES : creates
    ACTIVITY_INSTANCES ||--|{ ACTIVITY_REVISIONS : versions
    ACTIVITY_TYPES ||--o{ ACTIVITY_REVISIONS : classifies
    ACADEMIC_PERIODS ||--o{ ACTIVITY_REVISIONS : schedules
    GROUPS ||--o{ ACTIVITY_INSTANCES : hosts
    USERS ||--o{ ACTIVITY_INSTANCES : creates
    USERS ||--o{ ACTIVITY_REVISIONS : authors
    ACTIVITY_INSTANCES ||--o{ ACTIVITY_CHANGE_REQUESTS : receives
    USERS ||--o{ ACTIVITY_CHANGE_REQUESTS : requests

    ACTIVITY_INSTANCES ||--o{ ACTIVITY_PARTICIPANTS : includes
    USERS ||--o{ ACTIVITY_PARTICIPANTS : participates
    ACTIVITY_INSTANCES ||--o{ ACTIVITY_STAFF : assigns
    USERS ||--o{ ACTIVITY_STAFF : supports

    ACTIVITY_TEMPLATES ||--o{ ACTIVITY_TEMPLATE_VASK_ITEMS : defaults
    VASK_ITEMS ||--o{ ACTIVITY_TEMPLATE_VASK_ITEMS : selected_in

    ACTIVITY_INSTANCES ||--o{ ACTIVITY_INSTANCE_VASK_ITEMS : configures
    VASK_ITEMS ||--o{ ACTIVITY_INSTANCE_VASK_ITEMS : selected_in

    ACTIVITY_INSTANCES ||--o{ ACTIVITY_FRAMEWORK_TARGETS : targets
    FRAMEWORK_SKILLS ||--o{ ACTIVITY_FRAMEWORK_TARGETS : targeted_by
    FRAMEWORK_STEPS ||--o{ ACTIVITY_FRAMEWORK_TARGETS : expected_at

    ACTIVITY_TYPES {
        uuid activity_type_id PK
        string code UK
        string name
    }

    ACTIVITY_TEMPLATES {
        uuid activity_template_id PK
        uuid activity_type_id FK
        string name_zh
        string name_en
        string description
        int version_number
        string status
        uuid created_by_user_id FK
    }

    ACTIVITY_INSTANCES {
        uuid activity_id PK
        uuid school_id FK
        string external_activity_id
        uuid activity_template_id FK
        uuid group_id FK
        uuid created_by_user_id FK
        uuid latest_revision_id FK
        uuid current_approved_revision_id FK
        string operational_status
        uuid resolved_period_id FK
        string period_resolution_status
        datetime period_resolved_at
        uuid period_exception_approved_by FK
        string period_exception_reason
        datetime created_at
        datetime updated_at
    }

    ACTIVITY_REVISIONS {
        uuid activity_revision_id PK
        uuid activity_id FK
        int revision_number
        string title_en
        string title_zh
        string description_en
        string description_zh
        string private_context
        string activity_type
        uuid subject_id FK
        uuid department_id FK
        datetime start_at
        datetime end_at
        uuid owner_user_id FK
        uuid requested_form_version_id FK
        boolean media_capture_expected
        string location
        datetime student_access_opens_at
        datetime student_access_closes_at
        datetime response_due_at
        string approval_status
        string publication_status
        string material_change_reason
        uuid supersedes_revision_id FK
        uuid created_by_user_id FK
        datetime created_at
        datetime submitted_at
        uuid approved_by_user_id FK
        datetime approved_at
    }

    ACTIVITY_CHANGE_REQUESTS {
        uuid activity_change_request_id PK
        uuid school_id FK
        uuid activity_id FK
        uuid base_revision_id FK
        uuid requested_by_user_id FK
        uuid target_owner_user_id FK
        string field_key
        string current_value
        string proposed_value
        string reason
        string status
        uuid resolved_by_user_id FK
        string resolution_note
        uuid resulting_revision_id FK
        datetime requested_at
        datetime resolved_at
    }

    ACTIVITY_PARTICIPANTS {
        uuid activity_participant_id PK
        uuid activity_id FK
        uuid user_id FK
        string participant_role
        string participation_status
        string attendance_status
    }

    ACTIVITY_STAFF {
        uuid activity_staff_id PK
        uuid activity_id FK
        uuid user_id FK
        uuid role_assignment_id FK
        string relationship
        boolean can_edit
        datetime starts_at
        datetime ends_at
    }

    VASK_ITEMS {
        uuid vask_item_id PK
        string category
        string name_zh
        string name_en
        int version_number
        string status
    }

    ACTIVITY_TEMPLATE_VASK_ITEMS {
        uuid activity_template_vask_item_id PK
        uuid activity_template_id FK
        uuid vask_item_id FK
        string priority
    }

    ACTIVITY_INSTANCE_VASK_ITEMS {
        uuid activity_instance_vask_item_id PK
        uuid activity_id FK
        uuid vask_item_id FK
        int vask_item_version_number
        string priority
        string source
        uuid configured_by_user_id FK
    }

    ACTIVITY_FRAMEWORK_TARGETS {
        uuid activity_framework_target_id PK
        uuid activity_id FK
        uuid framework_skill_id FK
        uuid target_step_id FK
        string priority
        boolean is_assessed
        uuid configured_by_user_id FK
    }
```

### Key relationships

| Relationship | Type | Explanation |
|---|---|---|
| Activity template to activity instance | One-to-many | A reusable activity can be run many times. Each actual run is a separate instance. |
| Activity instance to revisions | One-to-many | The activity ID is stable. Governed title, description, dates, type, access window and other publishable configuration live in immutable revisions. Material changes create a successor revision and approval request. |
| Activity instance to users | Many-to-many | An activity has many participants and a user can attend many activities. `activity_participants` resolves it. |
| Activity instance to staff | Many-to-many | An activity can have several teachers; a teacher can support many activities. `activity_staff` records the functional role assignment, relationship and whether that person is an editor. |
| Activity template to VASK items | Many-to-many | A template can contain several default VASK items, and one VASK item can be used by many templates. |
| Activity instance to VASK items | Many-to-many | The actual VASK selection is copied and may be modified for a particular activity run. |
| Activity instance to framework skills | Many-to-many | An activity can target several framework skills. Each skill can be targeted by many activities. |
| Activity framework target to framework step | Many-to-zero-or-one | A target may name an exact expected step, or only name the skill. |

Evidence, media, participants, assignments and submissions reference the stable `activity_id`. Records that must prove which wording or dates were in force additionally reference `activity_revision_id`. A successor draft never moves or duplicates existing evidence. Ordinary readers resolve `current_approved_revision_id`; authors and reviewers may also see `latest_revision_id`. If the current approved revision is withdrawn for safety or privacy and no successor is approved, the activity is unavailable rather than falling back silently.

Creation is capability-based: different teacher positions may receive `activity.create`. An author/editor with `activity.edit_owned` creates a successor revision and submits it for the active approval policy. An assigned teacher without edit authority uses `activity_change_requests`; the current editor or authorized administrator resolves it. The same person may be assigned to approve their own activity revision only when the school policy step explicitly permits self-approval.

---

## 3 Framework reference data

```mermaid
erDiagram
    FRAMEWORKS ||--|{ FRAMEWORK_SKILLS : defines
    FRAMEWORK_SKILLS ||--|{ FRAMEWORK_STEPS : contains

    FRAMEWORKS {
        uuid framework_id PK
        string code UK
        string name
        string version
        string language_code
        string status
    }

    FRAMEWORK_SKILLS {
        uuid framework_skill_id PK
        uuid framework_id FK
        string code
        string name_zh
        string name_en
        string description_zh
        int display_order
    }

    FRAMEWORK_STEPS {
        uuid framework_step_id PK
        uuid framework_skill_id FK
        int step_number
        string step_title_zh
        string descriptor_zh
        string development_band
    }
```

### Constraints

- One framework version contains eight framework skills.
- One framework skill contains 16 framework steps.
- `framework_id + code` is unique in `framework_skills`.
- `framework_skill_id + step_number` is unique in `framework_steps`.
- A step always belongs to exactly one framework skill.
- A new translation or structural revision should create a new framework version instead of overwriting historical wording.

---

## 4 Assessment instruments, question abilities, constructs, scales, and proof

```mermaid
erDiagram
    ASSESSMENT_INSTRUMENTS ||--|{ INSTRUMENT_ITEMS : contains
    QUESTIONS ||--o{ INSTRUMENT_ITEMS : reused_in

    RESPONSE_SCALES ||--|{ RESPONSE_SCALE_OPTIONS : contains
    RESPONSE_SCALES ||--o{ QUESTIONS : answers

    QUESTIONNAIRE_CONSTRUCTS ||--o{ QUESTIONS : source_classifies
    QUESTIONS ||--o{ QUESTION_RESPONSES : answered_as
    PROOF_TYPE_DEFINITIONS ||--o{ PROOF_ITEMS : types
    QUESTION_RESPONSES ||--o| PROOF_ITEMS : accepted_as
    PROOF_ITEMS ||--o{ PROOF_LINKS : cited_through
    PROOF_ITEMS ||--o{ PROOF_USE_DECISIONS : governed_by

    ASSESSMENT_INSTRUMENTS {
        uuid assessment_instrument_id PK
        string name
        string description
        string instrument_type
        int version_number
        string status
        uuid created_by_user_id FK
        datetime created_at
        datetime updated_at
    }

    INSTRUMENT_ITEMS {
        uuid instrument_item_id PK
        uuid assessment_instrument_id FK
        uuid question_id FK
        int display_order
        boolean is_required
        string section_name
        json configuration_json
    }

    QUESTIONS {
        uuid question_id PK
        string question_code UK
        string question_text_zh
        string question_text_en
        string question_type
        uuid response_scale_id FK
        string ability_code
        string ability_name_zh
        string ability_name_en
        string ability_description_zh
        string ability_description_en
        boolean is_negatively_worded
        boolean requires_reverse_scoring
        string status
    }

    QUESTIONNAIRE_CONSTRUCTS {
        uuid questionnaire_construct_id PK
        string code UK
        string name_zh
        string name_en
        string definition_zh
    }

    RESPONSE_SCALES {
        uuid response_scale_id PK
        string code UK
        string name_zh
        int minimum_value
        int maximum_value
    }

    RESPONSE_SCALE_OPTIONS {
        uuid response_scale_option_id PK
        uuid response_scale_id FK
        int numeric_value
        string label_zh
        int display_order
    }

    PROOF_TYPE_DEFINITIONS {
        uuid proof_type_id PK
        string code UK
        string source_category
        boolean may_support_assessment
        string default_visibility
    }

    PROOF_ITEMS {
        uuid proof_item_id PK
        uuid proof_type_id FK
        uuid student_id FK
        uuid activity_id FK
        string source_entity_type
        uuid source_entity_id
        string perspective
        string authorship_origin
        string review_status
        string visibility_status
    }

    PROOF_LINKS {
        uuid proof_link_id PK
        uuid proof_item_id FK
        string target_entity_type
        uuid target_entity_id
        string support_role
    }

    PROOF_USE_DECISIONS {
        uuid proof_use_decision_id PK
        uuid proof_item_id FK
        string target_entity_type
        uuid target_entity_id
        string decision
        string reason
        uuid decided_by_user_id FK
        datetime decided_at
    }
```

### Important distinctions

| Entity | What it represents |
|---|---|
| `assessment_instruments` | A reusable questionnaire, observation checklist, reflection, or review definition. |
| `questions` | Individual prompts in a reusable question bank. |
| `instrument_items` | The placement and order of a question in an instrument. |
| `questionnaire_constructs` | General qualities measured by groups of questions, such as communication confidence. |
| `response_scales` | How a question is answered, such as 1–6 frequency or agreement. |
| `proof_type_definitions` | Extensible source classes for responses, feedback, observations, media, certificates and external records. |
| `proof_items` | Source-linked evidence with provenance, review and visibility state. |
| `proof_links` | Typed links from proof to rubric observations, Portfolio claims or other reviewed targets. |
| `proof_use_decisions` | Target-specific inclusion, exclusion, invalidation or supersession without deleting the original proof. |

### Many-to-many relationships

- One assessment instrument contains many questions, and one question may be reused in many instruments. `instrument_items` resolves this relationship.
- Each question version has one primary source construct and one question-owned ability definition; this does not create a rubric mapping.
- One proof item may support several reviewed targets, and one target may cite several proof items. `proof_links` resolves this relationship.
- Role membership and workflow review assignment remain separate; holding a role does not prove that a form, proof item or rubric result was assigned to that user.

**Discussed on Meeting Oct 26 - kickstart:** there is no fixed question-to-framework mapping or normalized question weight. A response becomes a Proof List item and is interpreted only when an authorized reviewer confirms a concrete condition in the selected rubric.

### Form version authority and publication

```mermaid
erDiagram
    ASSESSMENT_INSTRUMENTS ||--|{ INSTRUMENT_VERSIONS : versions
    INSTRUMENT_VERSIONS ||--o{ INSTRUMENT_REVIEW_ASSIGNMENTS : allocated_for_review
    USERS ||--o{ INSTRUMENT_REVIEW_ASSIGNMENTS : assigns
    USERS ||--o{ INSTRUMENT_REVIEW_ASSIGNMENTS : reviews
    INSTRUMENT_VERSIONS ||--o{ INSTRUMENT_REVIEW_EVENTS : reviewed_through
    USERS ||--o{ INSTRUMENT_REVIEW_EVENTS : acts
    INSTRUMENT_VERSIONS ||--o{ INSTRUMENT_ITEMS : contains
    INSTRUMENT_VERSIONS ||--o{ ASSESSMENT_ASSIGNMENTS : assigned_as

    INSTRUMENT_VERSIONS {
        uuid instrument_version_id PK
        uuid assessment_instrument_id FK
        int version_number
        uuid supersedes_version_id FK
        string review_status
        string publication_status
        string visibility_scope
        date valid_from
        date valid_until
        uuid created_by_user_id FK
        datetime created_at
    }

    INSTRUMENT_REVIEW_EVENTS {
        uuid instrument_review_event_id PK
        uuid instrument_version_id FK
        string event_type
        uuid actor_user_id FK
        string decision_comment
        datetime event_at
    }

    INSTRUMENT_REVIEW_ASSIGNMENTS {
        uuid instrument_review_assignment_id PK
        uuid instrument_version_id FK
        uuid assigned_by_user_id FK
        uuid reviewer_user_id FK
        string reviewer_role_required
        string assigned_scope
        datetime assigned_at
        datetime due_at
        string status
        datetime accepted_at
        datetime completed_at
        uuid completion_event_id FK
    }
```

These are separate controls:

1. `review_status` says whether the version's content is valid: `draft`, `in_review`, `changes_requested`, `approved`, `rejected`, or `retired`.
2. `publication_status` says whether the approved version is available for new use: `unpublished`, `published`, or `withdrawn`.
3. `visibility_scope` says who can discover it: `private_draft`, `reviewers_only`, `school_catalogue`, `assigned_activities_only`, or `public_external`.
4. An assignment points to one exact immutable version. It is allowed only when the version is approved, published, within its validity dates, and not retired.

Role membership grants authority to review. `instrument_review_assignments` allocates one review to one actual reviewer. `instrument_review_events` records the decision that resulted. These records must not be collapsed into a single status field.

Editing an approved or published version creates a successor draft. It never changes the questions or interpretation attached to historical assignments and submissions.

---

## 5 Assignment, submission, and responses

```mermaid
erDiagram
    ACTIVITY_INSTANCES ||--o{ ASSESSMENT_ASSIGNMENTS : includes
    INSTRUMENT_VERSIONS ||--o{ ASSESSMENT_ASSIGNMENTS : assigned_as
    USERS ||--o{ ASSESSMENT_ASSIGNMENTS : assigns

    ASSESSMENT_ASSIGNMENTS ||--|{ ASSIGNMENT_RECIPIENTS : sends_to
    USERS ||--o{ ASSIGNMENT_RECIPIENTS : responds
    USERS ||--o{ ASSIGNMENT_RECIPIENTS : is_subject
    USERS ||--o{ ASSIGNMENT_RECIPIENTS : reviews

    ASSIGNMENT_RECIPIENTS ||--o| ASSESSMENT_SUBMISSIONS : produces
    ASSESSMENT_SUBMISSIONS ||--o{ QUESTION_RESPONSES : contains
    QUESTIONS ||--o{ QUESTION_RESPONSES : answered_by
    RESPONSE_SCALE_OPTIONS ||--o{ QUESTION_RESPONSES : selected_in

    ASSESSMENT_ASSIGNMENTS {
        uuid assessment_assignment_id PK
        uuid activity_id FK
        uuid instrument_version_id FK
        uuid assigned_by_user_id FK
        datetime assigned_at
        datetime opens_at
        datetime due_at
        string assignment_status
        string eligibility_check
    }

    ASSIGNMENT_RECIPIENTS {
        uuid assignment_recipient_id PK
        uuid assessment_assignment_id FK
        uuid respondent_user_id FK
        uuid subject_user_id FK
        uuid reviewer_user_id FK
        string status
    }

    ASSESSMENT_SUBMISSIONS {
        uuid assessment_submission_id PK
        uuid assignment_recipient_id FK
        string perspective
        string content_status
        string processing_status
        string visibility_status
        datetime submitted_at
        datetime created_at
        datetime updated_at
    }

    QUESTION_RESPONSES {
        uuid question_response_id PK
        uuid assessment_submission_id FK
        uuid question_id FK
        decimal raw_numeric_value
        decimal scored_numeric_value
        string text_value
        uuid selected_option_id FK
        datetime created_at
        datetime updated_at
    }
```

### Perspective examples

`assessment_submissions.perspective` should identify the source of the judgement:

- `student_self_report`
- `teacher_observation`
- `peer_observation`
- `guardian_observation`

Student and teacher submissions remain separate records even when they use the same instrument and concern the same student.

`content_status` tracks drafting and review. `processing_status` tracks identity matching, validation, and assessment inclusion. `visibility_status` tracks whether approved content is unpublished, visible in the Portfolio, or withdrawn. These fields must not be collapsed into one generic `status`.

### Key relationships

| Relationship | Type | Explanation |
|---|---|---|
| Activity instance to assessment assignments | One-to-many | One activity can assign several instruments. |
| Instrument version to assignments | One-to-many | The same approved, published version can be used in many activities. |
| Assignment to recipients | One-to-many | One assignment may be sent to an entire class. |
| Recipient to submission | One-to-zero-or-one | A recipient may not have submitted yet. |
| Submission to responses | One-to-many | One completed submission contains answers to many questions. |
| Question to responses | One-to-many | The same question is answered in many submissions. |

An assignment with an unapproved, unpublished, expired, withdrawn, or retired version must be stored as `blocked` or rejected before recipients are created.

---

## 6 Feedback, framework observations, and evidence

```mermaid
erDiagram
    ACTIVITY_INSTANCES ||--o{ FEEDBACK : contextualises
    USERS ||--o{ FEEDBACK : receives
    USERS ||--o{ FEEDBACK : authors
    ASSESSMENT_SUBMISSIONS ||--o| FEEDBACK : supports

    FEEDBACK ||--o{ FEEDBACK_EVIDENCE : contains
    FEEDBACK ||--o{ FRAMEWORK_OBSERVATIONS : records

    FRAMEWORK_SKILLS ||--o{ FRAMEWORK_OBSERVATIONS : observed_as
    FRAMEWORK_STEPS ||--o{ FRAMEWORK_OBSERVATIONS : demonstrated_at
    FRAMEWORK_STEPS ||--o{ FRAMEWORK_OBSERVATIONS : suggested_next

    FRAMEWORK_OBSERVATIONS ||--o{ OBSERVATION_EVIDENCE : supported_by
    FEEDBACK_EVIDENCE ||--o{ OBSERVATION_EVIDENCE : supports

    MEDIA_ASSETS ||--o{ FEEDBACK_EVIDENCE : attached_as
    ASSESSMENT_SUBMISSIONS ||--o{ FEEDBACK_EVIDENCE : cited_as

    FEEDBACK {
        uuid feedback_id PK
        uuid activity_id FK
        uuid subject_user_id FK
        uuid author_user_id FK
        uuid assessment_submission_id FK
        string feedback_type
        string overall_comment
        datetime observed_at
        string perspective
        string status
        string visibility
        datetime created_at
        datetime updated_at
    }

    FEEDBACK_EVIDENCE {
        uuid feedback_evidence_id PK
        uuid feedback_id FK
        string evidence_type
        string evidence_text
        uuid media_asset_id FK
        uuid assessment_submission_id FK
        datetime created_at
    }

    FRAMEWORK_OBSERVATIONS {
        uuid framework_observation_id PK
        uuid feedback_id FK
        uuid framework_skill_id FK
        uuid observed_step_id FK
        int consistency_rating
        string confidence_level
        string comment
        uuid next_step_id FK
        string review_status
        boolean included_in_aggregation
        uuid inclusion_decided_by_user_id FK
        string inclusion_reason
    }

    OBSERVATION_EVIDENCE {
        uuid observation_evidence_id PK
        uuid framework_observation_id FK
        uuid feedback_evidence_id FK
    }

    MEDIA_ASSETS {
        uuid media_asset_id PK
        uuid owner_user_id FK
        uuid uploaded_by_user_id FK
        string media_type
        string storage_key
        string visibility
        string moderation_status
        datetime created_at
    }
```

### Source-of-proof rules

1. `feedback` identifies the subject, author, perspective, activity context, and observation time.
2. `feedback_evidence` stores the actual proof: a behaviour description, submitted form, work product, or media item.
3. `framework_observations` records the teacher's, student's, or peer's interpretation of that proof against one framework skill.
4. `observation_evidence` explicitly states which evidence supports which observation.
5. One evidence item may support several observations.
6. One observation may rely on several evidence items.
7. `observed_step_id` and `consistency_rating` remain separate values.
8. `included_in_aggregation` is an authorized reviewer decision, not an AI decision; exclusion requires a reason and retains the original observation.
9. The per-source-type maximum is derived from included, eligible, unrevoked, human-confirmed observations using the same rubric version and axis. It is not stored as an independent assessment.

### Example

```text
Feedback
    subject: Student A
    author: Teacher B
    activity: Two-week problem-solving project
    perspective: teacher_observation

Evidence 1
    “The student compared two proposals and explained the likely consequences.”

Observation 1
    skill: Problem-solving
    observed step: 7, Evaluate options
    consistency: 4/6, Often
    supported by: Evidence 1

Observation 2
    skill: Speaking
    observed step: 8, Use facts
    consistency: 3/6, Occasionally
    supported by: Evidence 1
```

The same evidence supports two observations, but the step and consistency values are recorded independently for each skill.

---

## 7 Media and evidence attachments

```mermaid
erDiagram
    USERS ||--o{ MEDIA_ASSETS : owns
    USERS ||--o{ MEDIA_ASSETS : uploads
    ACTIVITY_INSTANCES ||--o{ ACTIVITY_MEDIA : contains
    MEDIA_ASSETS ||--o{ ACTIVITY_MEDIA : linked_to

    MEDIA_ASSETS ||--o{ MEDIA_EXTRACTIONS : processed_into
    MEDIA_ASSETS ||--o{ MEDIA_ACCESS_GRANTS : grants
    MEDIA_ASSETS ||--o{ MEDIA_COLLECTION_ITEMS : collected_as
    MEDIA_COLLECTIONS ||--o{ MEDIA_COLLECTION_ITEMS : contains

    MEDIA_ASSETS {
        uuid media_asset_id PK
        uuid owner_user_id FK
        uuid uploaded_by_user_id FK
        string file_name
        string media_type
        string mime_type
        string storage_key
        bigint file_size_bytes
        string visibility
        string moderation_status
    }

    ACTIVITY_MEDIA {
        uuid activity_media_id PK
        uuid activity_id FK
        uuid media_asset_id FK
        string relationship_type
        uuid added_by_user_id FK
        datetime added_at
    }

    MEDIA_EXTRACTIONS {
        uuid media_extraction_id PK
        uuid media_asset_id FK
        string extraction_type
        string content_text
        json content_json
        string processor_name
        string processor_version
        string status
        string review_status
        uuid reviewed_by_user_id FK
        datetime reviewed_at
        string corrected_content_text
    }

    MEDIA_ACCESS_GRANTS {
        uuid media_access_grant_id PK
        uuid media_asset_id FK
        string grantee_type
        uuid grantee_id
        string permission
        datetime expires_at
    }

    MEDIA_COLLECTIONS {
        uuid media_collection_id PK
        uuid owner_user_id FK
        uuid activity_id FK
        string name
        string visibility
    }

    MEDIA_COLLECTION_ITEMS {
        uuid media_collection_item_id PK
        uuid media_collection_id FK
        uuid media_asset_id FK
        int display_order
        uuid added_by_user_id FK
    }
```

Media is not proof by itself. It becomes assessment evidence only when a `feedback_evidence` record cites it and describes its relevance.

---

## 8 End-to-end creation flow

```mermaid
sequenceDiagram
    autonumber
    participant Admin as SchoolAdmin
    participant Teacher as Eligible teacher/author
    participant Approver as Named approver
    participant System
    participant Student
    participant Class as Class teacher
    participant Publisher as Named publisher

    Admin->>System: Configure positions, functional roles, scopes and lean approval policies
    Teacher->>System: Create stable activity and revision 1
    Teacher->>System: Add VASK, dates, participants, staff and exact form version
    Teacher->>System: Submit revision for configured approval
    System->>System: Resolve eligible reviewer or default/escalation queue
    Approver->>System: Record reasoned approval decision
    System->>System: Set current approved revision without changing activity ID
    System->>Student: Create assignment-recipient record
    Student->>System: Submit self-reflection responses
    Teacher->>System: Submit teacher observation responses
    Teacher->>System: Create proof-linked feedback and observations
    Student->>System: Submit Portfolio working version and memorable selections
    Class->>System: Return or include all/subset and submit reviewed version
    Approver->>System: Approve Portfolio working version
    Publisher->>System: Publish snapshot from approved version
    System->>System: Preserve activity, revision, approval, submission, proof and snapshot links
```

The MVP complexity is one reusable approval mechanism with four modes and at most two sequential human steps. It is more flexible than a single hard-coded “staff approves everything” SRS flow, but materially simpler than parallel approval, quorum, conditional branching or school-authored workflow scripts. Each domain keeps its own lifecycle; the shared records only supply eligibility, assignment, decision and escalation history.

## 9 Integration portfolio publication and external delivery

```mermaid
erDiagram
    SOURCE_SYSTEMS ||--o{ IMPORT_BATCHES : supplies
    IMPORT_BATCHES ||--o{ IMPORT_RECORDS : contains
    IMPORT_RECORDS ||--o{ IMPORT_RECORD_CORRECTIONS : corrected_by
    USERS ||--o{ IMPORT_BATCHES : uploads
    USERS ||--o{ IMPORT_RECORD_CORRECTIONS : records

    USERS ||--o{ PORTFOLIO_WORKING_VERSIONS : owns
    ACADEMIC_PERIODS ||--o{ PORTFOLIO_WORKING_VERSIONS : scopes
    PORTFOLIO_WORKING_VERSIONS ||--o{ PORTFOLIO_VERSION_ITEMS : contains
    PORTFOLIO_WORKING_VERSIONS ||--o| LEARNER_NARRATIVE_VERSIONS : may_include
    PORTFOLIO_WORKING_VERSIONS ||--o| PORTFOLIO_SNAPSHOTS : approved_as
    USERS ||--o{ PORTFOLIO_SNAPSHOTS : owns
    ACADEMIC_PERIODS ||--o{ PORTFOLIO_SNAPSHOTS : closes
    PORTFOLIO_SNAPSHOTS ||--o{ PORTFOLIO_ITEMS : contains
    PORTFOLIO_SNAPSHOTS ||--o{ EXPORT_PACKAGES : produces
    USERS ||--o{ EXPORT_PACKAGES : generates

    SOURCE_SYSTEMS {
        uuid source_system_id PK
        uuid school_id FK
        string code UK
        string name
        string authority_scope
        string status
    }

    IMPORT_BATCHES {
        uuid import_batch_id PK
        uuid school_id FK
        uuid source_system_id FK
        uuid uploaded_by_user_id FK
        string file_name
        string status
        datetime imported_at
    }

    IMPORT_RECORDS {
        uuid import_record_id PK
        uuid import_batch_id FK
        string source_record_key
        string record_type
        string validation_status
        uuid resolved_entity_id
        json original_payload
    }

    IMPORT_RECORD_CORRECTIONS {
        uuid import_record_correction_id PK
        uuid import_record_id FK
        string field_name
        string before_value
        string after_value
        string original_student_id
        string resolved_student_id
        string correction_reason
        uuid corrected_by_user_id FK
        datetime corrected_at
    }

    PORTFOLIO_WORKING_VERSIONS {
        uuid portfolio_working_version_id PK
        uuid school_id FK
        uuid student_user_id FK
        uuid period_id FK
        int version_number
        uuid supersedes_version_id FK
        string status
        uuid created_by_user_id FK
        datetime created_at
        datetime student_submitted_at
        uuid class_teacher_user_id FK
        datetime class_teacher_reviewed_at
        uuid approved_by_user_id FK
        datetime approved_at
        uuid published_snapshot_id FK
        boolean is_student_latest
    }

    PORTFOLIO_VERSION_ITEMS {
        uuid portfolio_version_item_id PK
        uuid portfolio_working_version_id FK
        string section_key
        string source_type
        uuid source_id
        boolean student_selected
        string class_teacher_decision
        int display_order
        string authorship_origin
        string student_text
        string decision_reason
        uuid decided_by_user_id FK
        datetime decided_at
    }

    LEARNER_NARRATIVE_VERSIONS {
        uuid learner_narrative_version_id PK
        uuid portfolio_working_version_id FK
        string narrative_kind
        int revision_number
        string generated_text
        string teacher_edited_text
        string final_approved_text
        string prompt_version
        uuid source_manifest_id FK
        uuid edited_by_user_id FK
        string edit_reason
        string approval_status
        uuid approved_by_user_id FK
        datetime created_at
        datetime approved_at
    }

    PORTFOLIO_SNAPSHOTS {
        uuid portfolio_snapshot_id PK
        uuid school_id FK
        uuid student_user_id FK
        uuid period_id FK
        uuid approved_portfolio_working_version_id FK
        int version_number
        string publication_status
        uuid approved_by_user_id FK
        datetime published_at
    }

    PORTFOLIO_ITEMS {
        uuid portfolio_item_id PK
        uuid portfolio_snapshot_id FK
        string source_type
        uuid source_id
        string display_section
        int display_order
        boolean is_proud_moment
    }

    EXPORT_PACKAGES {
        uuid export_package_id PK
        uuid portfolio_snapshot_id FK
        string package_type
        string recipient_category
        uuid generated_by_user_id FK
        string storage_key
        datetime generated_at
    }
```

`source_systems` and import records preserve provenance and validation failures. An imported record must not overwrite reviewed platform data without an explicit reconciliation decision. Identity corrections append an `import_record_corrections` row; they never rewrite `original_payload`. The resolved identity may be used by later processing while the original student ID and every before/after value remain auditable.

`portfolio_working_versions` preserve the student's and class teacher's latest draft/submission separately from publication. The student workspace may show the student's newest submitted content and its review state. The official Portfolio resolves the greatest approved version number for the student and period; it never overwrites that version with an unapproved successor. If no approved version exists, the official view returns `no_approved_version`, and the student appears in the staff queue filter for missing approved Portfolios.

A class teacher reviews the assigned students' submitted components, may include all or only a traceable subset, returns unsuitable items, and submits the assembled version into the school's Portfolio approval workflow. The class teacher cannot rewrite student-authored introductions/reflections or another educator's observation. They may edit the controlled prompt and `teacher_edited_text` for the LLM-generated `me_as_a_learner` narrative; the original generated text, source manifest and every edit remain preserved. The edited narrative is a successor draft and still requires the configured teacher/staff approval before it can enter an approved version.

Student-authored introductions, reflections and selections use `authorship_origin = student_authored`. They do not require external proof citations merely to appear as the student's own voice, but they retain their submission and revision provenance and must not be presented as verified rubric claims. LLM-generated narrative and system-generated rubric/skill summaries require source references to the frozen manifest or selected proof. A claim without its required source is blocked from approval.

`portfolio_snapshots` freeze one approved Portfolio working version for a reporting period. The live student timeline and later draft may continue to change, while an issued SLP or period report remains reproducible. The visualization/export layer reads this approved snapshot contract; it does not call a generation provider or reinterpret raw extraction output.

For the lean MVP, an external authority is a `recipient_category`, not an authenticated role. The platform produces a printable PDF/SLP and, where audit detail is required, an XLSX evidence register. Any later external portal requires a separate identity, consent, access, expiry, and audit design.

## 10 What is intentionally excluded

The following belong to the later analytics design and are not part of this core model:

- combining several observations into one current stage;
- weighting teacher, student, peer, or guardian perspectives;
- calculating radar-chart snapshots;
- trend calculations;
- cohort comparisons;
- prediction or recommendation models;
- statistical conversion from questionnaire totals to framework steps;
- confidence scoring based on observation quantity or recency;
- badges, milestones, or progression notifications.
- advanced reminder schedules beyond the required unassigned/declined/overdue approval-escalation queue;
- an authenticated portal for external authorities; and
- automatic external-authority override of a school-confirmed skill step.

The operational records above should remain the authoritative source even after analytics tables are added.
