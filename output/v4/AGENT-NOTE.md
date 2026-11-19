# V4 implementation note

Use `planning/schema-contract.csv` and the approved staged plan as the schema reference.

The CSV files under `import-examples/` are synthetic examples only. They are pre-V4 seed data and may be changed, regenerated, or removed during implementation. Do not infer final columns, workflow rules, or table completeness from the example rows.

The current V4 implementation is staged. A missing CSV does not mean the table is removed; check `planning/table-stage-map.csv` and `planning/staged-implementation-plan.json`.

The current Stage 1 SQLite database is seeded directly by the repository fixture code. The all-18-table CSV pack is not automatically loaded into SQLite.
