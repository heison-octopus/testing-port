# Learner profile design QA

- Source visual truth: `qa/source-rethinking-assessment-reference.png`
- Source pixels: 1167 × 893 PNG
- Implementation screenshot: `qa/implementation-student-portfolio-final.jpg`
- Implementation pixels: 1920 × 923 JPEG
- CSS viewport: 1920 × 923 at device scale factor 1
- State: Chan Mei signed in; published learner portfolio; source details collapsed
- Density normalization: both captures were reviewed at their native 1× density. The source and implementation have different desktop aspect ratios, so comparison focused on the app-owned learner-profile region rather than browser/sidebar width.

## Findings

No actionable P0, P1 or P2 mismatch remains for the requested adaptation.

The implementation deliberately adapts rather than clones the reference. It preserves the visible profile rail, teal section headers, pale learner-summary surface, orange emphasis, evidence imagery, interest tags and compact multi-widget composition. The source's 3Cs radar, courses and achievement constructs were not reproduced because they are not the BHSS Skills Builder evidence model.

## Required fidelity surfaces

- Fonts and typography: the implementation uses a clean system sans stack with a strong teal hierarchy, compact metadata and readable body text. It is less rounded than the source display font; this is a P3 brand-polish difference, not a hierarchy or readability issue.
- Spacing and layout rhythm: the profile rail and main widget column align consistently; separators and section headers provide the same compact editorial rhythm without nested card clutter. No horizontal overflow was found at 1920 px or the measured 390 px responsive state.
- Colors and visual tokens: teal, pale blue-green, restrained orange and white closely follow the source while retaining the repository's rose unresolved-state and brown AI-material conventions.
- Image quality and asset fidelity: the profile and piano images are high-resolution, entirely fictional generated assets with appropriate crops. No source logo or branded image was copied or approximated.
- Copy and content: all visible text is tailored to the fictional BHSS learner scenario. Skills Builder wording is explicitly POC-only; VASK remains descriptive. Source tags use human-readable activity/type labels rather than raw IDs.

## Full-view comparison evidence

The source and final implementation were opened together. Both show a persistent learner identity rail and a denser main profile area. The implementation replaces the source radar with all eight Skills Builder axes, including explicit “Not enough evidence” states, and replaces generic testimonials/courses with evidence stories, a retained growth record and expandable contribution tags.

## Focused-region comparison evidence

The identity rail, Skills Builder grid and “Me as a learner” region are clearly readable at native resolution in the paired comparison, so separate cropped evidence was not required. The implementation shows eight skill positions, the class-teacher approval state, fictional evidence imagery and the source tags within the same above-the-fold capture.

## Interaction and browser verification

- Student: privacy-filtered portfolio opened; a skill source trace expanded successfully.
- Peer reviewer: three assigned reviews appeared separately from self review.
- Assigned staff: thirty reviews appeared, one pending review was approved and converted to a sanitized statement; pending count changed from three to two.
- Class teacher: source proof, 28 approved peer statements, editable summary and approval action rendered.
- SchoolAdmin: regeneration-role policy, empty privacy adapter contract and Time Infinity expected contract rendered.
- Responsive measurement: at 390 px CSS width, document scroll width was 390 px and the skill grid collapsed to one column.
- Console: a clean reload produced no runtime exception or log warning/error events.

## Comparison history

### Pass 1

- P2: only six assessed axes were visible, which could imply that Problem solving and Leadership did not belong to the framework.
- P2: the expanded source-trace list used a single long column and weakened the requested compact layout.

Fixes: the Skills Builder widget now always shows all eight axes, using “Not enough evidence” instead of zero or omission; the default source-trace section now uses a two-column desktop layout.

### Pass 2

The revised capture shows all eight axes, keeps missing evidence distinct from zero, and restores a compact above-the-fold composition. No actionable P0/P1/P2 issue remains.

## Follow-up polish

- P3: a school-approved display typeface could more closely match the rounded character of the reference.
- P3: an approved radar visualization could be added later, but only when the selected rubric has versioned axes, ordered levels and authorized display rules.

## Implementation checklist

- [x] Reusable widget registry controls order, width, title, visibility and variant.
- [x] All eight skill axes are visible without inventing zero scores.
- [x] Student-facing output hides raw reviewer and internal decision data.
- [x] Source contribution remains visible through human-readable tags.
- [x] Compact desktop and single-column responsive states are usable.
- [x] Fictional images are project-local and clearly identified.

final result: passed
