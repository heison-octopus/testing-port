# BHSS V4 documents and simulated imports
> Implementation note: read `AGENT-NOTE.md` before using any V4 CSV example.

This folder is the canonical review/document area for V4.

- `planning/` contains the V4 staged plan, schema contract, table-stage map, SRS rewrite map, Archify diagram and Stage 1 approval/implementation notes.
- `import-examples/stage-1/` contains fresh synthetic CSV examples for the seven Stage 1 foundation tables.
- `../import-examples-v2/stage-1/` contains the pre-Stage-1 backup of the older flat import examples. It is an archive, not the V4 schema.
- `../../portfolio-poc-v4/` contains the runnable React + Vite and JavaScript backend source.

The `schema-contract.csv` is a column/table contract. The CSV files under `import-examples/stage-1/` are simulated rows that follow the Stage 1 subset of that contract. They are related, but they are not the same artifact. The full 18-table contract is not yet fully populated with simulated rows; later stages add those examples.
