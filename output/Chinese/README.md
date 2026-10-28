# 中文文件索引

本資料夾集中存放繁體中文版的架構、規劃及對外文件。原始證據和共用原型仍放在原有位置，以免與翻譯文件或已確認要求混淆。

| 文件 | 用途 | 英文版本 |
| --- | --- | --- |
| `核心資料關係.md` | 唯一權威領域關係模型：操作流程、實體、基數、狀態、佐證、批核及發布規則 | `../English/Core data relationships.md` |
| `討論問題.md` | 高、中、低層次未決問題、狀態及答案紀錄的權威清單 | `../English/Discussion questions.md` |
| `最新發現及問題 v2.md` | 最新會議發現、已採納架構、產品建議及尚待確認事項 | `../English/Current findings and questions v2.md` |
| `角色及權限.md` | 角色職責、存取界線及批核權限 | `../English/Roles and permissions.md` |
| `簡報議程.md` | 輸入、流程、輸出、未決問題及簡報次序 | `../English/Presentation agenda.md` |
| `資料欄位修訂.md` | 非權威的修改前／後實體及欄位說明；如有差異以核心文件為準 | `../English/Aspects updated.md` |
| `內部系統檢視及人日估算.md` | 內部範圍分析及開發估算 | `../English/Internal system review and manday estimate.md` |
| `對外精簡MVP方案.md` | 對外使用的建議 MVP 範圍 | `../English/External lean MVP proposal.md` |
| `BHSS探索結果及客戶確認問題.docx` | 客戶探索及確認問題文件 | `../English/BHSS discovery findings and client clarification questions.docx` |
| [`SRS/`](SRS/) | 模組化及可驗收的軟件需求，包括存取控制、欄位限制、基礎設施及頁面可見範圍 | [`../English/SRS/`](../English/SRS/) |

## 共用來源及示範

- `../../Design ideas.docx` 及 `../../Assessment/` 保存原始證據。
- `../Questions.docx` 是中英混合的探索資料，內容保持不變。
- `../import-examples/` 保存共用 CSV 格式。
- `../../D3 bhss-portfolio-ppt/` 保存雙語簡報及互動 POC。
- `../../playground/` 是雙語本機示範版本選擇器：`../../portfolio-poc/` 保留為 Playground v1；按 Core／CSV 3.0 實作的 `../../portfolio-poc-v2/` 則作為 Playground v2。兩個版本各自使用獨立 API 及 SQLite 資料庫。Playground v2 設有英文／繁體中文切換、沒有執行路由但保留來源連結的模擬 AI 覆核畫面，以及按 SRS-12 整理的頁面覆蓋目錄。

如中英文版本出現差異，應先按原始證據核對；校方確認決定後，再同步更新兩套架構文件。

標籤為 `Discussed on Meeting Oct 26 - kickstart` 的關聯資料修訂已同步至中英文版本，包括：按活動日期自動找出學段、具生效日期的角色分派、題目本身的能力定義、可互換 Rubric 的功能條件、具類型的佐證清單、`MAX-CONFIRMED` 進展規則、只產生正面候選內容的 AI 界線，以及凍結回望／展望實際輸入資料。

2026 年 10 月 27 日獲批准的系統分析架構決定亦已同步：以不可變 `SchoolId` 隔離學校、`schools.is_disabled` 整校停用、按校及預設拒絕的功能政策、P1 供應商中立 `ExtractionProvider`／`PortfolioGenerator` 合約、P2 正式供應商實作，以及視覺化只讀取已批核的凍結快照。這是內部架構決定，不代表 BHSS 或 JC 已批准校本政策。

2026 年 10 月 28 日的系統分析架構決定亦已同步為內部產品決定，並非 BHSS／JC 批准：職銜與可疊加功能角色／權限及工作範圍分開；部門、科目及教師群組成為核心範圍；明確拒絕優先；教師搜尋／篩選列為必要功能；各流程採用可設定的精簡批核模式及升級處理；活動在已批核修訂之間保留穩定 ID；正式 Portfolio 採用最新已批核工作版本，同時保留較新草稿。
