# V4 staged implementation

Open [the staged preview](http://localhost:8791/bhss-mvp/v4-staged-implementation.html) while the local canvas server is running. The saved HTML is `staged-implementation-plan.html`; its decision controls require that server.

The initial planning round created no runnable code. The user subsequently approved Stage 1 in chat. Stage 1 is now locally implemented; see `stage-1-implementation.md`, `stage-1-approval.json` and the application README. Stages 2–7 remain planned.

- `staged-implementation-plan.json`: eight stages, actor paths, proposed APIs, acceptance cases and open rules.
- `schema-contract.csv`: copy of the accepted relational schema contract.
- `table-stage-map.csv`: every functional table introduced once.
- `srs-rewrite-map.csv`: proposed SRS work by stage, without rewriting original sources.
- `v4-stage-dependencies.html`: Archify workflow; source and receipts are located by `archify-location.json`.
- `preview-walkthrough.mjs`: T1 preview replay derived from ui-loop-core's template; captures DOM snapshots because Ego screenshot transport timed out in this session. This is not application acceptance evidence.

Stage 1 status: IMPLEMENTED locally after explicit approval. Executor: direct Codex in the active workspace. Future multi-role stage verification uses isolated Playwright contexts. No PR, deployment or production-provider activation is implied.

Risks of condensation: typed tables require strict kind/parent/link validation; polymorphic links need server enforcement; scalar history must reconstruct complete graphs atomically. The staged gates prove these progressively. Rubric configuration artifacts must remain immutable and retrievable by version/hash after updates.
