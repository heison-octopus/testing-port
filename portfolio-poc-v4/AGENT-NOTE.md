# Agent note for V4

For schema work, use `../output/v4/planning/schema-contract.csv` and the approved staged plan as the authority.

Do not treat CSV files in `../output/v4/import-examples/` as stable schema. They are synthetic pre-V4 examples and may change during implementation. Do not infer final columns, workflow rules, or table completeness from their rows.

Check `../output/v4/planning/table-stage-map.csv` before deciding whether a table is implemented. The V4 schema is staged; absent example data is not evidence that a planned table was removed.

The current Stage 1 SQLite database is seeded directly by repository fixture code. The all-18-table CSV pack is design/example input only and is not automatically loaded into SQLite.
