# Codex plan — MVP offer lifecycle with gpt-6-luna subagents

狀態：2026-10-06 implementation and independent review delivered；既有四文件 checkpoint 已核對。輸入：[intent.md](intent.md) → [spec.md](spec.md) → [design.md](design.md)。

## 執行契約

- 每個開發、測試清點與獨立 reviewer subagent 固定 `model: gpt-6-luna`、`reasoning_effort: medium`、`fork_context: false`。
- 同時最多四個 open agents，reservation 到 close 都計入；工作完成先保存回覆與 diff/checks，再 close。紀錄 requested model、agent ID、任務、owned paths、launch/close 與可取得用量。後端身份／實際 reasoning 無 attestation 時明列 unavailable。
- 不建立新的 user-owned chat。使用可指定模型的 subagent tool；模型若不支援，報告工具限制，不偷偷換 model 或只以 prompt 宣稱 Luna。
- Parent 負責共享契約、串接、文件同步、最終測試與判斷。Luna 是 coding/review agents；不新增產品資料抽取 LLM，也不重跑 69 筆研究。
- 每個 agent 僅改 assigned paths；不得改 shared schema、package commands、公開 artifact、研究資料或 strict path。這些整合檔由 parent 唯一編輯。
- 依使用者執行順序開始實作；不自動 commit、push、deploy、開啟 recurring job 或採集新來源。

## 分工與依賴

| Agent                 | 工作與專屬寫入範圍                                                       | 前置條件                                    |
| --------------------- | ------------------------------------------------------------------------ | ------------------------------------------- |
| A：案例與來源能力清點 | `docs/changes/mvp-offer-lifecycle/evaluation/`、新案例 fixture；其餘唯讀 | Parent 確認 baseline 與來源清單             |
| B：日期政策           | `src/ingestion/mvp/date-policy.ts`、`tests/mvp-date-policy.test.ts`      | 共用契約与預先審查日期案例固定              |
| C：時段／假日         | `src/ingestion/mvp/schedule.ts`、`holiday-calendar.ts`、對應新 tests     | 共用契約与條件歸屬案例固定                  |
| D：觀測／生命週期     | `src/ingestion/mvp/source-observations/`、`lifecycle.ts`、對應新 tests   | 快照契約、TTL 與 capability 固定            |
| E：門店橋接           | `src/ingestion/mvp/outlets.ts`、`tests/mvp-outlet-policy.test.ts`        | 門店契約固定；B/C/D 任一完成後釋放 slot     |
| F：MVP 展示           | `src/components/mvp/OfferPolicyDetails.tsx`、對應新 UI tests             | Parent 完成 API/Listing contract 与 fixture |
| R：獨立 reviewer      | 全部 diff／驗收證據唯讀；不自行修改                                      | 串接与必要 checks 完成；未參與 authoring    |

Parent 專屬整合範圍：`src/domain/mvp.ts`、必要的 Listing MVP 選用型別、`src/ingestion/mvp/pipeline.ts`／`corpus.ts`、`src/server/mvp.ts`、`src/components/Explorer.tsx`、單次 CLI／build script／package commands、API 串接、四文件及 verification.md。

工作波次：A 清點 → parent 固定契約 → B/C/D 並行 → E → parent 串接 → F → parent 驗證 → R review → 有發現才做局部修復與受影響重驗。不得為了平行數量拆成大量每筆 extraction agents。

## P0 — 啟動前查核與凍結

- [x] 已查核目前 branch 是 `research/source-substitution-pilot`，四文件使用既有 `docs/changes/` 慣例。
- [x] 已檢視 MVP domain/pipeline/server/build、source runner／directory、既有測試与歷史研究界線。
- [x] 實作開始時重新檢查 Git/worktrees；優先使用適合的既有 checkout，必要時建立隔離 `codex/` branch/worktree。保留所有 unrelated changes，尤其目前 untracked 69-answer study；不對它們 add／clean／commit。
- [x] 保存實際 HEAD、dirty paths、原 artifact／corpus／研究输入／strict paths 與 next-env.d.ts 的 hashes。僅凍結必要受保護集合，不把新功能會修改的 MVP 檔誤標成完全不可變。
- [x] 讀 `node_modules/next/dist/docs/` 的相關 installed-version route／server-client／testing 指南，再寫 application code。若啟用 frontend skill，先讀其 instructions；skill 不得擴大本次功能範圍。
- [x] 核對四文件一致、明列 proposed defaults：14／7 天、stale live 隱藏、calendar-month 不滾動、Within listed offer hours、官方全文／Telegram privacy。

## P1 — 案例清點与評分契約（A + parent）

- [x] 從 exact original source 建立案例：兩個缺日期例、跨月／跨年／閏年／無效日、From 25th、整月開始、explicit contradiction、posted versus first_seen、重建不可續期。
- [x] 重建 34 historical units 的來源關係，清點 schedule phrase families。27 forms 若無法重建，記錄實際數量及原因；不手寫肯定此數。
- [x] 保存多價格／weekday／outlet、PH/eve、opening-to、point timeslot、last order／operating hours 與 ambiguous association 的完整原文。對 literal quotes/offsets 建立預期。
- [x] 評估既有官方列表 capability，至少準備完整 present／absence／valid empty／partial／HTTP failure／reappearance fixture。未證明目前列表語意的來源標 archive/permalink；不得啟動 open-ended 續期。
- [x] 建立不參與 parser 設計的來源級 holdout，按 source family／merchant／schedule family 分離；不可把同一原文的 child 放到不同 cohort。標注人員來源；agent notes 不冒稱 human gold。
- [x] 在看新 parser 結果前固定預期、denominators 與 gate：所有 mandatory 安全案例通過；holdout 上不能有新增不受支持的 date/clock endpoints、role reversal 或錯誤 disappearance。Coverage 完整報告；不設事後方便達標的百分比。

## P2 — 純函式與來源觀測模組（B/C/D，後接 E）

- [x] B：依 S1–S6 實作 date policy；literal evidence 與 derivation audit 分开；新增參數化 regression。只在 MVP 使用，不改既有 DateResolver 或 date-only validator。
- [x] C：解析 source-owned schedule groups，新增 nullable opening start、point／range 型別与 abstention；假日与eve單獨处理，按 S12–S15 计算 coverage 與狀態。
- [x] D：complete snapshot validator、stable identity、firstSeen immutability、presence／absence、cache／out-of-order／failure 與 TTL 邊界；temp local storage、single-writer／atomic replace 失敗保留旧檔。
- [x] E：唯讀官方名錄优先、既有 Google MVP lookup fallback；保留 source scope、exclusions、units/address 和 coordinate audit；named failure 不改 merchant-wide 查詢。
- [x] 各 agent 提交完成摘要、owned diff、實際 focused check 與未支援案例，再 close。Unsupported source wording 保持 unknown，不補造端點來提升 coverage。

## P3 — MVP 串接與可回復啟用（parent）

- [x] 新增 v3 artifact 與 v2 read-only reader；MVP schedule metadata 不放寬 shared strict hours／publication rules。
- [x] 新增現有已審查 direct candidates 到 MVP 的 DB-free input bridge，保留 source-owned text、trusted source kind、metadata provenance 與 immutable receipt。來源不具 capability 時不啟用 open-ended。
- [x] 新增明確单次 refresh CLI；fixture/offline 默认，live 需顯式 flag＋source。使用既有 bounded acquisition，不 import persistence／DB，不啟動 scheduler／startup hook。空列表 proof 不直接用既有 acquisition_ready。
- [x] 新增 policy-specific offline build/output。日期、schedule 與保存的 observations 合併成 preview artifact；build/read 不更新 firstSeen／lastSeen。
- [x] Serve 時重新判定 Singapore dates／TTL，不在 API request 抓外部來源。加入 default legacy、opt-in source_observed 與 rollback。
- [x] 原 v2 artifact 与 reviewed baseline 保留。新模式每筆差異先看原文，建立獨立 source-review ledger／新政策 expectations，再輸出已審查新 artifact；不把舊 golden 直接改成新 runtime 結果。

## P4 — 展示與 end-to-end（F + parent）

- [x] F：summary、lastSeen、standing line、來源 link、官方純文字全文、stale／unknown文字與 listed-hours status；不加 assumptions badges/icons。
- [x] Parent：Explorer 只對 MVP metadata 使用新 UI；strict Available now 與 privacy 不變。多門店 schedule 選擇保留 source identity。
- [x] API + desktop/mobile 演練 dated/upcoming/expired、fresh open-ended、stale/absent/reappearance、opening-to、holiday eve、named/default-all 與官方／Telegram全文差異。
- [x] 所有 browser automation 攔截 public tiles，使用 `tests/fixtures/tile.png` 測 MapLibre 真實 layout。Base URL 3100，先確認 app heading。

## P5 — 驗證、獨立 review 與交付

| 驗收 | 實際要執行的證據                                                                                                                                 |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| A1   | 新 date-policy focused tests；每筆日期原文、anchor、rule、expected／actual                                                                       |
| A2   | 新 observation／lifecycle／storage tests；零內容也有結構 proof；失敗不撤回／不續期                                                               |
| A3   | 新 schedule／calendar tests；來源级 holdout；分組、端點与棄權逐筆 review                                                                         |
| A4   | 新 outlet-policy 與既有 MVP source-location／location replay tests；provider全部 mocks/captured                                                  |
| A5   | MVP preview/API units 与 `tests/e2e/mvp.spec.ts`、新 lifecycle UI cases；desktop/mobile screenshots 視覺檢查                                     |
| A6   | 136 原文与其MVP衍生 records 分層 report，34-unit 診斷另列；holdout 單獨報告                                                                      |
| A7   | strict tests、protected hashes、dependency/diff review、legacy-mode conformance、兩次離線 byte comparison、rollback 與失敗 artifact preservation |
| A8   | 最終 type/lint/format/build、corpus、R reviewer findings 與 disposition                                                                          |

命令以實作後存在的路徑調整，不把擬新增 tests 當成已存在：

```sh
npx vitest run tests/mvp-date-policy.test.ts tests/mvp-schedule.test.ts tests/mvp-source-observations.test.ts tests/mvp-lifecycle.test.ts tests/mvp-outlet-policy.test.ts
npx vitest run tests/mvp.test.ts tests/mvp-preview.test.ts tests/mvp-build.test.ts tests/mvp-source-location.test.ts tests/validity.test.ts tests/resolution.test.ts
npm run test:corpus
npm run typecheck
npm run lint
npm run build
npx playwright test tests/e2e/mvp.spec.ts
npm test -- --maxWorkers=1
git diff --check
```

另對實際 changed files 執行 scoped Prettier check；不跑 repo-wide `npm run format` 製造無關 diff。NLP frozen snapshot checks 可能因新 MVP feature files／shared Listing type 出現 preservation assertion，需明確區分已授權變更与真正研究改寫；不能改舊研究 seals 或聲稱既有所有 snapshot checks 必然適用。

UI/build 檢查前記錄 next-env.d.ts；Next 產生檔若有變更，報告並處理，不覆蓋使用者既有內容。Docker integration 只在有相關共用 DB 行為疑慮或既有 suite 要求時執行，使用 isolated local DB；本方案無 migrations 或 hosted DB 驗證。

- [x] Parent 完成必要 checks 後，啟動 R（gpt-6-luna/medium/fork_context=false），提供四文件、exact diff、案例与真實 logs。R 不得改檔、不可把 parent 自評稱獨立評審。
- [x] 解決 actionable findings，只重跑受影響與尚未驗證 checks；同步四文件、report/source-review 与 verification.md。
- [x] Report 分開呈現 source availability、parser coverage／semantic correctness、freshness capability、map coverage。Google observed locations 不是全部門店，推定日期不是 LLM accuracy。
- [x] 記錄 agents 全部 close、模型 attestation 可取得性、dirty paths／diff範圍、原 artifact保留与rollback。交付可 review 結果；commit／啟用／live採集／排程須依當次授權，不由 planning 自動觸發。

## 本次交付

- [x] 建立 intent.md、spec.md、design.md、plan.md。
- [x] Application implementation／agents execution／test execution 已執行；限制見 verification.md。
- [x] Fixture/offline artifact regeneration 完成；live capture、commit、push、deployment、schedule 未執行。

## 執行紀錄（2026-10-06）

P1 frozen manifests 與安全期望先保存，A 的來源／商家／schedule-family folds 後補但在 parser 結果前固定。A 完成後釋放 slot，E 啟動；D/B 完成釋放 slot，F 啟動；A 以相同 agent/model 恢復一次編写 reusable evaluator。最多四個 open agents，所有作者已 close，R 獨立唯讀評審進行中。Model backend attestation 與用量工具未提供；不宣稱實際 backend 已證明為 Luna。

已完成日期／schedule／calendar／observations／lifecycle／門店模組、MVP v3 reader、DB-free direct bridge、offline preview builder、one-shot source refresh、Explorer 專用分支。日期補值 audit 補上 Today literal 與初始/中間不合法月份棄權；範圍歸屬不明保持未知。

來源能力有重大證據限制：Pepper 的官方 promotion listing 不能證明 active-only；與 Shake blog 同為 historical_archive。沒有可實際續期的合格來源，本輪 open-ended live map 只透過標示 synthetic fixtures 驗證，不能聲稱實際在網路上持續有效。此限制符合 S8 gate，不擴大到新增來源研究。

新增 evaluator 類型保護：`src/domain/promotion.ts` 原本因必要 shared type 一起保存 hash；保留原 hash mismatch 報告，另以 exact outside-Listing 比較與 reviewed before/after hash 驗證已授權型別改動。Next 產生 dev imports 後還原原 bytes；不更改 frozen research seals。

UI 首次失敗揭露 .js virtual extension 在 Turbopack 無法解析，已改 extensionless。兩組既有 browser 測試依賴當天時間，使舊 corpus 中 upcoming／Genki 逾期；改用固定參考日期的 fixture responses，保留實際 API list/detail expiry 測試與新 production privacy/TTL/API 測試。所有 public tiles 攔截，36 desktop/mobile checks 通過並檢視截圖。

原 `npm run lint` 的五個 .local 研究腳本 any errors 保留報告，tracked/source lint 另外執行；不修改無關研究。完整結果、限制與 rollback 見 [verification.md](verification.md)。

## Independent review 修復階段

R 發現 P2 MVP filter 接錯 strict eligibility 與 P1 mechanical ledger 不等於語意 review。Parent 已修復新 metadata 的時段 filter（desktop/mobile 6/6 regression）；R 繼續依 exact original text 審查全部 104 變更／新增時段 records。四筆語意問題已以一般 grammar／abstention 規則修復並新增 meaningful regressions；原 review v1 留作證據，新 v2 引用新的 input hashes。`artifact-review.ts` 將任何 withheld records 保留 corpus、阻擋 live，明確區分 fact review 與 source current-list capability。

本次 additional read-only fixture check 重播 Shake10archive candidates；它們在獨立 diagnostics artifact217中另列，不加到 canonical207的來源級評分。Canonical observations fixture directory 只含原 Pepper state unchanged bytes。所有新 sources、live capture 與 scheduling 仍未執行。

## Final delivered scope and deviations

所有軟體 slices 與單次 offline commands 已交付，canonical207 records 的 separate reviewed artifact已保存，70 withheld rows 不能進live；defaultlegacy維持。無 migration／DBwrite／deployment／recurring process。

Holdout 需限制解讀：源級28-source hash split部分來源也屬於 mandatory development fixtures，不能冒称整體獨立holdout accuracy；worker 未見的四safe-fact cases單獨4/4報告。79family folds是相關diagnostics；34unit不當作整體樣本，27forms未重建。完整 corpus/source ledger 與 row decisions 維持可稽核。

Global lint5ignored-local failures和歷史 NLP Next generated-file hash1failure保留，不修改 frozen expectations。所有 affectedfocused/checks pass；四文件下 Acceptance mapping 記錄實際結果。

R 最終針對 output-path 修復複查：沒有 open actionable findings。全部七個 agents 已 close，A 曾恢復一次且配置維持。保存 tool operation順序、requested Luna/medium/fork_context=false、maxopen4；backend identity及用量未提供attestation，不冒稱已證實。
