# Portfolio V2 Option 1 — Design QA

## Evidence

- Source visual truth: `/Users/useroctopus-tech.com/Library/Application Support/orca/codex-accounts/0c0c5bde-be9a-4f6d-8de1-8bc461f0df9f/home/generated_images/01a185fd-1ae7-7fd3-b6bb-872c24b14220/exec-3d90335a-f00e-4bef-ac5b-e398a762c745.png`
- Browser-rendered implementation: `design-qa-option1-artifacts/ai-drafts-final.png`
- Full-view combined comparison: `design-qa-option1-artifacts/ai-source-vs-implementation.png`
- Focused ledger/draft comparison: `design-qa-option1-artifacts/ai-ledger-focused-comparison.png`
- Supporting live states: `design-qa-option1-artifacts/data-operations-final.png`, `design-qa-option1-artifacts/school-controls-final.png`
- Route and state: `/ai?lang=en`, authenticated as Chan Mei Ling, Alex Lam selected, all activities and statuses visible, approved narrative in the Draft tab.

## Viewport and normalization

- Source pixels: 1487 × 1058.
- Implementation capture: 1920 × 1050 pixels, native Ego Lite browser window at device scale 1. The browser content region is approximately 1920 × 970 CSS pixels beneath the browser chrome.
- Full-view normalization: source scaled proportionally to 1476 × 1050; implementation retained at 1920 × 1050; both placed in one 3396 × 1050 comparison image.
- Focused normalization: source ledger/draft crop scaled proportionally to 1006 × 650; implementation ledger/draft crop scaled proportionally to 1546 × 650; both placed in one 2552 × 650 comparison image. No density-only differences were filed.
- The source contains 58 illustrative students while the POC contains three seeded students. This is a data-volume constraint, not a structural design difference.

## Full-view comparison

The implementation preserves the selected Option 1 composition: restrained left navigation, compact top utility bar, student rail, central file ledger, and persistent draft-review pane. The main hierarchy, column order, neutral white surface, low-contrast rules, orange action accent, brown AI material, and green/orange/red status vocabulary are visibly aligned. The wider implementation viewport gives the ledger more room without changing the hierarchy or hiding persistent controls.

## Focused comparison

The focused comparison verifies the dense surfaces that were too small to judge reliably in the full-view image: file thumbnails and icons, activity grouping, file metadata, extraction status chips, source/time custody, draft tabs, narrative editing area, and human-review state. Real generated thumbnails and the Phosphor icon family are used; no placeholder CSS art or handcrafted SVG substitutes are present.

## Required fidelity surfaces

- Fonts and typography: the implementation uses a comparable editorial sans-serif hierarchy with distinct display, body, metadata, and uppercase-label weights. Wrapping and truncation remain legible at the tested viewport.
- Spacing and layout rhythm: the three-column workspace, separator-led grouping, compact row density, and restrained radii follow the source. No persistent controls are clipped.
- Colors and tokens: white/neutral page surfaces, teal navigation selection, pastel orange emphasis, green approval states, pink/red failure states, and brown AI surfaces match the selected direction and repository rules.
- Image quality and asset fidelity: generated evidence thumbnails are sharp at their rendered size and cropped consistently. File-type icons use one established icon library.
- Copy and content: text is domain-specific and distinguishes extraction, human review, approval, and publication. POC limitations are disclosed without being presented as implemented backend behavior.
- Accessibility and states: controls are semantic buttons, selects, labelled inputs, or text areas; disabled states are visible; status is not communicated by color alone; the main journeys are keyboard-addressable browser controls.
- Responsive resilience: the desktop target was verified at 1920 × 1050. The selected source is a desktop workspace; tablet/mobile parity was not part of this visual target and remains a residual test gap.

## Findings

- No actionable P0, P1, or P2 mismatch remains.
- P3: the native Ego capture includes browser/task-control chrome at the top and bottom. This is capture-only and does not belong to the application DOM.
- P3: seeded POC content has three students and seven projected file rows rather than the source visual's larger demonstration set. The empty/no-draft states remain visible and structurally correct.

## Comparison history

1. Initial live comparison found a P2 state contradiction: an approved narrative could show an approved badge while the helper copy still said that named review was required, and the student context forced an approved workspace into `needs_review`.
2. Fixed `AIDrafts.tsx` so the workspace retains its actual status and approved narratives state that named review is complete while publication remains separate. Added an explicit accessible label to the teacher-edited text area and restored the video file icon.
3. Post-fix evidence: `design-qa-option1-artifacts/ai-drafts-final.png` and the combined comparisons show APPROVED consistently in the student context, draft header, and human-review block. The 13-test browser suite confirms candidate decisions and audited edits persist after reload.

## Primary interactions and error checks

- Tested account/role navigation, AI Draft/Candidates tabs, candidate inclusion, audited narrative edit, generation, reload persistence, Data Operations domain selection, question-bank template/export controls, SchoolAdmin rubric and label selectors, and the teacher New Activity builder.
- Automated browser result: 13 passed, 0 failed.
- API result: 28 passed, 0 failed.
- Build result: TypeScript and Vite production build passed. Vite reports only the existing large-chunk advisory.
- Console/error check: no unhandled page failure or visible runtime error appeared during the live Ego walkthrough; all exercised protected routes completed successfully in the automated browser suite.

## Follow-up polish

- Add a dedicated tablet layout only after a tablet workflow is included in scope.
- Replace projected file-extraction rows with persisted per-media extraction-job records once the protected API is implemented.

final result: passed

---

# Portfolio V2 Activity Builder — Design QA

## Evidence

- Source visual truth: `/Users/useroctopus-tech.com/Library/Application Support/orca/codex-accounts/0c0c5bde-be9a-4f6d-8de1-8bc461f0df9f/home/generated_images/01a1871a-5134-7803-b407-02997c6f2be0/exec-f93440be-270f-4c41-ae3f-1ad1ca59b82a.png`
- Browser-rendered implementation: `design-qa-artifacts/activity-builder-live-02.png`
- Full-view combined comparison: `design-qa-artifacts/activity-builder-source-vs-live.png`
- Focused VASK/questionnaire comparison: `design-qa-artifacts/activity-builder-focused-source-vs-live.png`
- Responsive evidence: `design-qa-artifacts/activity-builder-narrow-900.png`
- Interaction evidence: `design-qa-artifacts/activity-builder-walkthrough/2-teacher-groups.png`, `4-questionnaire-edited.png`, `6-review.png`, and `6-created-draft.png`
- State: English UI, authenticated as Chan Mei Ling (Subject Teacher), Activities > New activity, default VASK labels and suggested questionnaire visible.

## Viewport and normalization

- Source: 1485 × 1059 pixels.
- Implementation: 1485 × 1059 pixels at a 1485 × 1059 CSS viewport and device scale factor 1.
- Full-view comparison places the equal-size source and implementation captures side by side without rescaling.
- Focused comparison uses the same 1485 × 579 crop from each image (`y=480`) and places the crops side by side. No density-only differences were filed.
- The source shows a completed compact activity summary, while the implementation capture shows the editable identity panel required before that summary can exist. The shared VASK/questionnaire region is compared at matching scale and state.

## Full-view and focused comparison

The implementation preserves the approved split composition: VASK catalogue on the left, question builder on the right, flat low-contrast separators, teal controls, pastel category colours, orange primary actions, and a compact action footer. The live editor deliberately gives bilingual details, dates, classifications and group selectors more vertical space than the filled summary in the visual target; this is an intentional input-state difference and does not alter the approved VASK/questionnaire hierarchy.

The focused comparison confirms the dense controls that are not reliably readable in the full view: grouped V/A/S/K choices, selected counts, label-coloured suggestion chips, question order controls, required/optional controls, edit/remove actions, question-bank insertion and new-question actions.

## Required fidelity surfaces

- Fonts and typography: the live hierarchy uses the same restrained sans-serif treatment, small uppercase workflow labels, compact table metadata and clear heading weights. Text remains readable without truncating persistent actions.
- Spacing and layout rhythm: the two-column builder, separator-led sections and compact question rows track the source. The 900 px capture collapses to one column with `scrollWidth=900`, so no horizontal overflow remains.
- Colors and tokens: white surfaces, teal selection states, pastel VASK families, orange primary actions and low-contrast rules align with the approved target and repository visual rules.
- Image quality and asset fidelity: this interface has no decorative or product-image asset dependency. Phosphor icons remain sharp and consistent; no emoji, handcrafted SVG approximation or raster placeholder is used.
- Copy and content: the live copy makes VASK a default labelling catalogue, explicitly says labels are not assessment results, and describes question suggestions as editable recommendations rather than assessment mappings.
- Accessibility and interaction states: labels, fields, buttons, dialogs and required/optional selects are semantic. Keyboard-addressable popup selectors and review gating were exercised in the browser suite.

## Findings

- No actionable P0, P1 or P2 mismatch remains.
- P3: the editable identity panel is taller than the compact completed-summary region in the visual target. This is expected for the pre-draft input state; the review screen provides the compact package summary before creation.

## Comparison history

1. The initial live capture showed legacy non-VASK axes and a footer that could overlap the reporting-period notice. The implementation now limits the activity picker to `V/A/S/K + numeric code` labels and keeps the action footer in normal document flow. Post-fix evidence: `activity-builder-live-02.png` and `activity-builder-narrow-900.png`.
2. The first end-to-end review run exposed a P0 interaction defect: React could reuse the Review button as the submit control and submit on the first click. The create action is now an explicit `type="button"` that calls `requestSubmit()` only on the second click. Post-fix evidence: `activity-builder-walkthrough/6-review.png`, `6-created-draft.png`, and the 13-test browser suite.

## Primary interactions and error checks

- Tested bilingual details, both classification axes, class and teacher-group dialogs, automatic VASK defaults, label-driven suggestion refresh, question edit/required/add/remove controls, review, draft creation, form-approval gating and 900 px responsive behavior.
- Automated browser result: 13 passed, 0 failed.
- API result: 29 passed, 0 failed.
- Production build passed. Vite reports only the existing large-chunk advisory.
- Post-auth console errors: none. Page errors: none. The initial unauthenticated session probe returns the expected 401 before account selection.

final result: passed
