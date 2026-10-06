# Intent — MVP offer dates, schedules and source lifecycle

狀態：2026-10-06 實作與驗證已交付（限制見 verification.md）。沿用 gpt-6-luna／medium、fork_context=false，最多四個並行。

## 問題與價值

MVP 目前需要完整開始／結束日期才能出現在 live map。原文的「Till 5th」、「Valid in December」與沒有截止日的每週優惠，不能完整表達。部分時段研究出現單一時間點被合成區間的錯誤；優惠來源重查也尚未連到 MVP 的有效性判斷。

使用者希望在 MVP 接受日期補值與未明示門店的預設範圍，以增加可用資訊；同時保留來源全文、來源連結及簡短提醒，讓使用者能自行核對。

本次要把日期推定、時段解析及來源新鮮度變成可重現的規則，並讓地圖展示反映已知範圍與未知資訊。

## 預期結果

- 可解釋地補足部分日期，保留可靠發文日期或不可變的首次發現時間作為依據。
- 每週無截止日優惠保留 null 結束日期，依合格來源觀測維持有效、撤回或變為待確認。
- 時段規則由程式解析；不同星期、價格條件及門店的規則不會被錯誤合併。
- 地圖沿用 MVP 的門店風險接受政策，保留指定及排除門店資訊。
- 來源全文、簡短摘要與提醒可供核對；時段狀態不暗示參與門店或顧客資格已驗證。

## 成功衡量

按唯一原文來源、來源內優惠單位及日期／時段事實分別報告覆蓋率、正確率、棄權及剩餘未知。舊 34-unit 下游研究只提供案例，不作整體成功率；136 原文與其衍生 MVP records 不視為獨立樣本。

日期補值、時段歸屬與來源狀態轉移的必要回歸案例必須通過。新增功能不得改變 strict publication 的允許範圍，來源抓取失敗也不得撤回一批優惠。具體驗收見 [spec.md](spec.md)。

## 範圍與限制

只改 MVP 資料與呈現路徑。使用既有來源 adapters 的唯讀採集能力、官方名錄與既有 Google MVP lookup，新增功能不寫 production DB，不接管研究 monitor。

不新增產品 runtime LLM 呼叫；gpt-6-luna 是開發與 review subagents 的指定模型。既有 LLM 抽取研究、69 筆新首答與凍結評分保留不動。

不部署、不 push、不啟動 recurring worker／monitor、不自動提交實作。必要的新來源重查工具只設計成明確呼叫的單次操作；本次只執行 fixture/offline 的單次驗證，不作 live collection。

## 草案預設

來源新鮮度 N 預設 14 天；有每週模式且明示 limited time 的 open-ended 優惠使用 7 天。來源過期後從 live map 隱藏，保留在 development corpus 並顯示「May have ended, check source」。只有 limited time、沒有日期與週期的資料仍待確認。

這些是依討論提出的預設，並非宣稱使用者已逐項批准。後續若要求按本計畫實作，可採這些明示預設；新發現的重大歧義需記錄並處理。
