# BHSS student growth portfolio lean MVP proposal

## Recommended outcome

The first release should provide one school-operated workflow that connects activities, reflections, evidence, teacher feedback, and the eight skill areas into a reviewed student portfolio. It should support student growth conversations and produce a reproducible period record. It should not automatically decide a student's skill step.

## Delivery approach

The MVP will use a responsive web application for students, teachers, authorized staff, and school administrators. External recipients will not require platform accounts. Authorized staff will generate an approved printable SLP/PDF and a controlled Excel evidence register when detailed review is required.

This approach minimizes access-control development while preserving traceability and formal reporting.

## Included workflow

1. Staff import users, classes, academic periods, and Time Infinity activity data by CSV or XLSX.
2. Staff or an assigned teacher creates an activity using the approved default form and selects the intended VASK areas.
3. The teacher confirms the roster, attendance, activity dates, and student response period.
4. Students submit the assigned reflection and permitted evidence.
5. Named peers complete peer feedback only when a teacher assigns them.
6. Teachers review the responses and evidence, provide feedback, and confirm relevant skill observations against the 16-step framework.
7. Authorized staff review exceptions and publish the reporting-period portfolio.
8. The system generates the student portfolio and official exports.

## User pages

### Students

- Home and outstanding tasks
- My activities
- Activity reflection and evidence submission
- External certificate or achievement submission
- Assigned peer review
- Proud Moments selection
- Published portfolio and feedback
- Privacy and correction requests

### Teachers

- Assigned activities and assessment tasks
- Activity roster attendance VASK and form
- Bulk assessment by screen or Excel upload
- Student evidence review
- Feedback and skill-step confirmation
- Peer-review assignment
- Published summaries for assigned students

### Authorized staff

- Operational review dashboard
- Activity and form approval
- Evidence and extraction review
- Assessment exception review
- User period and import management
- Portfolio publication
- PDF/SLP and Excel export

### School administrators

- User role group and academic-period administration
- Access upload consent and retention policy
- Source-system and import configuration
- Security and audit review

## Assessment rule

VASK describes the intended development areas of an activity. Questions and evidence may relate to one or more of the eight skill areas. The 16 steps describe evidenced development within each skill.

Student self-reflection, peer feedback, questionnaires, academic results, and media are supporting evidence. A teacher or assigned staff reviewer confirms any observation that contributes to a published skill step. Missing evidence is displayed as insufficient evidence and is not converted into a low score.

## Official output

Each reporting period produces a versioned student portfolio containing:

- academic and non-academic activity history;
- selected reflections and Proud Moments;
- reviewed teacher feedback;
- evidence-backed skill observations and next steps; and
- the source and reviewer of each published conclusion.

The formal human-readable output is a printable PDF/SLP. Excel is used for controlled data exchange, bulk teacher input, and authorized evidence review. Paper is generated from the approved PDF only when a physical copy or signature is required.

## Scope controls

The MVP uses one approved default activity form. It uses CSV/XLSX import before a live Time Infinity connection. It uses manual human confirmation instead of automatic skill scoring. It does not include an external-authority portal, public portfolio links, a general drag-and-drop form builder, voice identity matching, or an automated multi-source scoring formula.

## Estimated delivery effort

The expected effort is **95–130 mandays**, subject to confirmation of the default form, source data, approval roles, consent policy, official report layout, and hosting environment.

The estimate includes discovery confirmation, implementation, testing, security checks, user acceptance fixes, deployment, and handover. It excludes school decision waiting time, hardware procurement, historical data cleansing, and legal review.
