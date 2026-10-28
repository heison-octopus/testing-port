# English document index

This folder contains the current English architecture, planning, and stakeholder documents. Original evidence and shared prototypes remain outside this folder so they are not mistaken for translated or approved requirements.

| Document | Purpose | Chinese counterpart |
| --- | --- | --- |
| `Core data relationships.md` | Primary operational model, relationships, lifecycle, evidence, and publication rules | `../Chinese/核心資料關係.md` |
| `Discussion questions.md` | Authoritative high-, mid-, and low-level decision checklist with answer fields | `../Chinese/討論問題.md` |
| `Current findings and questions v2.md` | Latest meeting findings, approved interpretations, product proposals, and unresolved dependencies | `../Chinese/最新發現及問題 v2.md` |
| `Roles and permissions.md` | Role responsibilities, access boundaries, and approval authority | `../Chinese/角色及權限.md` |
| `Presentation agenda.md` | Inputs, process, outputs, open decisions, and presentation sequence | `../Chinese/簡報議程.md` |
| `Aspects updated.md` | Detailed entity and field revisions | `../Chinese/資料欄位修訂.md` |
| `Internal system review and manday estimate.md` | Internal scope analysis and delivery estimate | `../Chinese/內部系統檢視及人日估算.md` |
| `External lean MVP proposal.md` | Stakeholder-facing recommended MVP | `../Chinese/對外精簡MVP方案.md` |
| `BHSS discovery findings and client clarification questions.docx` | Client discovery and clarification document | `../Chinese/BHSS探索結果及客戶確認問題.docx` |
| [`SRS/`](SRS/) | Modular, testable software requirements including access control, field limits, infrastructure and page visibility | [`../Chinese/SRS/`](../Chinese/SRS/) |

## Shared sources and demonstrations

- `../../Design ideas.docx` and `../../Assessment/` contain original supplied evidence.
- `../Questions.docx` is a mixed-language discovery source and remains unchanged.
- `../import-examples/` contains shared CSV contracts.
- `../../D3 bhss-portfolio-ppt/` contains the bilingual presentation and interactive POC.

When the language versions differ, resolve the difference against the original evidence and record the confirmed decision in both architecture sets.

The linked-data revision tagged `Discussed on Meeting Oct 26 - kickstart` is now reflected across both editions: date-resolved school periods, effective role assignments, question-owned abilities, interchangeable rubric capability, a typed Evidence / Proof List, `MAX-CONFIRMED` progression, positive-only AI candidates, and frozen review/outlook memory inputs.

The System Analyst architecture decision approved on 27 October 2026 is also synchronized: immutable `SchoolId` isolation, `schools.is_disabled`, deny-by-default per-school feature availability, provider-neutral `ExtractionProvider` / `PortfolioGenerator` contracts in P1, production provider implementations in P2, and visualization from an approved frozen snapshot only. This is an internal architecture decision, not a BHSS or JC policy approval.
