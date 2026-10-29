# Portfolio v2 import UI fix-loop audit

**Audit date:** 29 October 2026  
**Scope:** `portfolio-poc-v2` only  
**Status:** Internal System Analyst implementation check; not BHSS or JC approval

## Outcome

The activity-roster ingestion path and the separate existing-activity catalogue delta path are now usable through the live UI. An assigned activity editor can stage CSV/XLSX or fetch an allow-listed JSON roster. An authorized school-scoped operator can export the editable activity catalogue, stage explicit deltas, distinguish no-op rows from material/lifecycle actions, and commit without any hard-delete action. Activity approval and publication remain separate.

The audit used Chan Mei Ling, the live unpublished “E2E 2026-10-29 Student podcast workshop” activity, and Time Infinity fixture key `TI-ACT-8812`. The resulting committed batch is `IB-DEMO-4f9d74d7-398a-4a9a-8288-18db43042871`.

## Numbered walkthrough and health

1. **Baseline teacher entry — unhealthy before the fix.** Chan’s navigation had no Data imports entry, so the ingestion lifecycle was not discoverable even though import-related requirements existed. Evidence: [`01-before-teacher-no-import-entry.png`](./import-ui-audit-artifacts/01-before-teacher-no-import-entry.png).

2. **Capability-driven import entry and direct route — healthy after the fix.** Assigned activity creators/editors now receive **Data imports** under Input and can open `/imports/:batchId`. SchoolAdmin receives the ledger/source-management surface; students receive neither the navigation entry nor the API capability.

3. **Allow-listed connector staging — healthy for the POC boundary.** The live browser fetched `TI-ACT-8812` through the Node adapter, not browser JavaScript. The response entered activity-roster contract 1.0 and became `ready_to_commit` without changing the activity. Evidence: [`02-after-connector-roster.jpg`](./import-ui-audit-artifacts/02-after-connector-roster.jpg).

4. **Source custody and row validation — healthy.** The detail shows source, channel, service requester, opaque source key/filename, upstream source time, platform receive time and SHA-256. Both student identifiers resolved in the same school. The two visible warnings are deliberate fixture name mismatches (`Alex Chan`/`Alex Lam` and `Chris Wong`/`Chris Lee`); they do not silently replace the entered name or block a valid identity match. Evidence: [`03-after-custody-and-rows.jpg`](./import-ui-audit-artifacts/03-after-custody-and-rows.jpg).

5. **Separate authorized commit — healthy.** Chan committed two validated rows. The import status and row states changed to `committed`; activity approval/publication state did not change. Existing identical membership is retained as `no_change`; changed membership is superseded and a new active row is linked to the source record. Evidence: [`05-committed-live-batch.jpg`](./import-ui-audit-artifacts/05-committed-live-batch.jpg).

6. **No-hard-delete correction path — healthy for the roster link.** A committed row exposes an append-only decision panel. Excluding/restoring creates a new decision and marks the entity link for human review; it explicitly does not delete the activity assignment. Corrections are available only before commit, preserving the immutable committed batch.

7. **Student direct-link access — healthy.** Alex Lam was signed in against the exact committed batch URL. The route returned to Overview, displayed the blocked-workspace explanation, exposed no Data imports navigation, and the server API independently denies import reads and writes.

8. **Responsive visual check — corrected during the loop.** The first 1280px screenshot showed the ledger column consuming too much width and compressing the commit area. The UI now narrows the ledger and row columns below 1400px, changes commit/resolution actions to two columns, and stacks the ledger above detail below 1100px. The input label was also corrected from “Target activity draft” to “Target unpublished activity.” Evidence before the responsive adjustment: [`03-after-custody-and-rows.jpg`](./import-ui-audit-artifacts/03-after-custody-and-rows.jpg); after adjustment: [`04-after-responsive-fix.jpg`](./import-ui-audit-artifacts/04-after-responsive-fix.jpg).

9. **Activity catalogue policy round trip — healthy for existing activities.** SchoolAdmin exported an editable CSV that includes stable ID, expected revision, governed fields, current owner, action and reason while omitting original author/uploader. A one-row `upsert` matching revision 1 of `ACT-SPORT-001` staged as `NO CHANGE`; the screen explicitly states that absent rows remain unchanged and commit records a no-op link. The no-op was committed live without changing the activity. Evidence: [`activity-catalogue-policy-export.csv`](./import-ui-audit-artifacts/activity-catalogue-policy-export.csv) and [`activity-catalogue-delta-live.png`](./import-ui-audit-artifacts/activity-catalogue-delta-live.png).

10. **Lifecycle wording — corrected during the loop.** The initial catalogue detail reused a roster-specific default reason, and “Disable batch” could be confused with activity disable. The default is now contract-neutral, the field says “Commit / import-batch reason,” and the button says “Disable this import batch.” Only a file row with `lifecycle_action=disable` can disable the activity.

11. **Regression and contract health — healthy.** The TypeScript/Vite production build passes, all 27 API/contract tests pass, and all 12 Chromium end-to-end scenarios pass. Automated coverage includes stale revision rejection, successor draft/original-author preservation, staged-disable exclusion, explicit disable/restore, student-surface denial, editable-export field policy and the live no-op UI round trip.

## Visual assessment

- The restored v1 hierarchy is present: white page, restrained teal structure, orange primary actions, line-separated records, compact status labels and no nested rounded-card treatment.
- Input, process and result are visible in one flow: ingestion choices at the top, provenance ledger/detail beneath, then row decisions and commit state.
- Source times and identifiers use a monospace treatment, while warning/error state uses text and borders rather than colour alone.
- The current long ledger is bounded and scrollable. Runtime batches in an assigned editor’s view are scoped to their activities; SchoolAdmin can inspect the complete seeded provenance ledger.

## Evidence limits

- The connector is a deterministic local Time Infinity fixture. It proves allow-listing, server-only configuration and contract normalization, not a production Time Infinity agreement or API.
- Screenshot and automated keyboard/DOM checks do not establish WCAG conformance. A formal keyboard-only, screen-reader, focus-order and contrast pass is still required.
- The activity-catalogue contract updates existing activities. Brand-new imported activity creation remains blocked until the initial owner/source-authorship rule is selected and implemented.
- There is no separate downloadable audit export yet; the editable export intentionally omits original author/uploader.
- Activity disable registers proof/submission/observation/Proud Moment/Portfolio impacts and removes student activity/response/assessment/curation access. Real media retrieval and automated published-output withdrawal/reissue remain SRS gaps.
- Runtime form-definition, response-entry, academic-result, external-achievement and media imports remain incomplete.
