# Identity and lifecycle test plan

Status: test scope approved by user; UI design and unresolved lifecycle policies require review. These are planned cases, not evidence of implemented behavior. Use isolated seeded databases and separate browser contexts. Never test against retained school data.

## Vitest API and integration tests

- Session: missing cookie => 401; missing/wrong request key => 403; valid session succeeds; logout invalidates the session; suspended account cannot authenticate; active session is revoked on suspension.
- User administration (proposed API): school administrator lists own-school users; unauthorized teacher/student denied; cross-school list/detail and mutations denied; avoid leaking user data in errors.
- Suspension (proposed): require reason and authorized actor; refuse last eligible administrator; record actor, reason and time; preserve historical references; invalidate all sessions; reject repeated or invalid transitions according to documented contract.
- Restoration (proposed): require authorization and same-school target; record action; permit new login; previously revoked sessions remain invalid.
- Activity: allowed actor may perform supported withdrawal; unauthorized/cross-school actor denied; reason and lifecycle constraints enforced; linked evidence and audit history remain traceable.
- Portfolio: test supported draft and published-state transitions, authorization and history. Withdrawal, restoration and successor policy are open unless the current architecture expressly provides them.
- Catalogue: test independently configured descriptive labels and assessment-capable custom rubric; labels alone do not produce levels; rubric assessment requires versioned axes, ordered levels and conditions; version and authorization checks preserve existing observations.

## Playwright browser tests (@smoke for critical paths)

- Independent browser contexts for SchoolAdmin, SuperTeacher/staff, Teacher and Student; verify assigned pages, absent access and direct URL navigation, with protected API calls checked independently.
- Administrator finds and suspends fixture user; suspended user loses access; non-admin cannot access management controls or call the API.
- Authorized activity lifecycle action and preservation of linked information.
- Custom rubric and vocabulary-only catalogue demonstrate their distinct assessment capabilities.

## Execution order

1. Review proposed UI and answer numbered workflow questions through ui-fix-loop; leave product policy marked open when no decision exists.
2. Add Vitest integration fixtures with disposable databases and deterministic accounts; write intended API tests before implementing missing functionality.
3. Add Playwright tests with role-isolated contexts and @smoke tagging before implementation.
4. Implement approved scope and run targeted Vitest and Playwright smoke tests, existing API suite, build, and full relevant E2E tests.

Vitest was installed; existing Node test and Playwright scripts remain in place. No unapproved production login, hard deletion, universal restoration, or rubric mapping is assumed.
