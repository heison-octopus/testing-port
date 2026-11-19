# Stage 1 implementation record

Status: local implementation; final evidence is in `v4-stage-1.evidence.json` at repository root.

Reference: approved V4 staged plan and explicit chat approval. Run: `v4-stage1-20261118-01`. Direct Codex in the active checkout; no branch, commit, PR or deployment requested.

Layout remains provisional: white canvas, low-contrast separators, pastel orange actions, simple sidebar, People/Assignments, School Definitions, Roles, Audit and own Workspace. A final product layout/design system has not been approved.

Current call path: React domain page → shared API client → Express route/session/request-key checks → controller → foundation service → SQLite repository → atomic row + scalar snapshot transaction → response → refreshed domain query. Authentication is a new V4 flow; there was no runnable V4 before-state to trace. Browser tests exercise real API requests throughout the implemented journey.

Acceptance replay follows the planned actor paths: Admin login → People → teacher assignment → Audit snapshot; Teacher login → Workspace → refresh after deassignment; Student login → own identity → direct admin denial; Denied fixture and School B school-A request denial. Additional checks exercise new role/person/class creation and mobile overflow. No future stage behaviour is implied by these passes.

Known Stage 1 limits: demo action profiles have only manage/workspace; domain-specific named reviewer controls arrive with those domains. Session storage is process-local. Snapshot graphs cover foundation entities only. Rubric artifact validation exists but no activation UI or official rubric package is installed. Wider school policy/feature/retention controls are still documented requirements, not claimed as complete.
