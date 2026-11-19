# Barebones V4 all-table schema examples

This folder contains one minimal CSV example for each of the 18 proposed functional tables. It is a design aid, not a confirmed import contract. The files may change during implementation. Use `../../planning/schema-contract.csv` as the schema authority.

Time Infinity is represented as activity/source rows, attendance assignments and feedback proof. Media uses stable `media_id`, plus `source_key`, `external_reference` and `record_links` for provider flexibility.

## SQLite relationship

The current Stage 1 `portfolio-poc-v4/data/stage1.sqlite` is created by the Stage 1 repository seed function, not by importing these CSVs. The CSV pack is the all-stage design/example input. A later import stage may add CSV preview, validation and commit, but it must not silently become the source of truth without an approved contract.
