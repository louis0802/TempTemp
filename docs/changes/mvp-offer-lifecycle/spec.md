# Specification — MVP offer policy

狀態：2026-10-06 驗收紀錄已保存；原驗收規則未調低。輸入：[intent.md](intent.md)。

## 使用情境

使用者在地圖找優惠時，可看到短摘要、來源觀測日期、時段資訊及來源連結。資訊不足時可查看原文；系統不把未解讀的限制轉成確定的可兌換狀態。

來源管理者可執行一次來源重查。成功觀測、完整列表消失、來源暫時失敗及資料過期，具有不同結果；重查不影響正式驗證優惠資料。

## 日期規則

S1. 日期 anchor 優先取可信的原始發文日期；否則使用第一次實際觀測該優惠的日期。皆以新加坡日期計算。發現時間不可在重查或重建時重設；歷史匯入不能冒充新的觀測。

S2. 僅針對原文明確屬於該優惠的日期片段補值。發文日期、競賽截止日、預約發布日或其他優惠的日期不作本優惠有效期間。

S3. 日期片段的角色由措辭決定：from 為開始，till/until 為結束，valid on 為單日；缺開始日使用 anchor。整月表達本身已提供月初開始，優先於缺開始日的預設。

S4. 缺年取 anchor 年；缺月取 anchor 月。僅結束日期可依缺失單位向後調整：缺月按月，缺年按年。補值後早於 anchor 或開始日期時，取同一缺失單位下第一個不早於兩者的合法日期。明確提供的年／月／日不能為了使優惠有效而改寫。

S5. 日期不存在、角色不明、多個不相容期間或無法保留條件歸屬時，保持待確認。初次補值或向後調整時若遇不存在的日期，立即待確認；不跳過該月尋找下一個合法日期，不自動溢位或改成月底。

S6. 整月期間使用 anchor 年的該月第一日至最後一日，不單獨滾動其結束日期。例如十二月首次看到「Valid in January」，同年一月期間保留為已結束；明確寫 next January 才可另作有證據的未來期間。開始日期不為了使資料有效而向後移動。

| 原文與 anchor                             | 預期期間／狀態                               |
| ----------------------------------------- | -------------------------------------------- |
| Till 5th；2026-10-28                      | 2026-10-28 至 2026-11-05                     |
| Till 15 Jan；2026-12-20                   | 2026-12-20 至 2027-01-15                     |
| From 25th；2026-10-28；每週模式、無截止日 | 開始 2026-10-25；結束 null；有效性依來源觀測 |
| Valid on 15 Nov；2026-10-28               | 2026-11-15 單日，尚未開始                    |
| Valid in December；2026-10-28             | 2026-12-01 至 2026-12-31，尚未開始           |
| Till end of month；2026-10-28             | 2026-10-28 至 2026-10-31                     |
| 明寫 2026-11-30 至 2026-11-01             | 待確認；不得修成隔年                         |

## 有效期間與來源觀測

S7. 有可解讀活動截止日的優惠是 dated；有每週模式而無截止日的優惠是 open_ended，結束日期維持 null。不符合這兩類者保留未知有效性，不因首次發現而取得新期限。

S8. Open-ended 優惠須有合格的「目前優惠列表」觀測才可持續進入 live map。歷史文章、社群 permalink 或單獨仍能開啟的詳情頁，不具有續期效果。官方身份本身不等於目前優惠列表能力。

S9. 只有實際讀取且成功辨識該優惠的合格觀測可更新最後出現時間。讀取舊 cache、重建 artifact、API 查詢、頁面 HTTP 200 但結構不明，都不能更新此時間。未到開始日者仍是 upcoming。

S10. 成功且完整取得合格列表後，既有優惠確實消失才撤回；有效的空列表也可以證明消失。抓取失敗、結構變更、截斷、分頁不完整、分類未完成或身份不明，不撤回優惠。完整列表重新出現同一優惠可恢復，其舊觀測與撤回事件仍保留。

S11. 正常 open-ended 新鮮度預設 14 天；有每週模式的 limited-time 優惠預設 7 天。只有 limited time 而無日期及每週模式者維持 needs_validity。超過期限的 open-ended 從 live map 隱藏，在 development corpus 保留並顯示「May have ended, check source」。明確過期、尚未開始及 online-only 的原有處理保留。

## 時段與假日

S12. 星期、時段及假日排除從原文解析。無法辨識或無法歸屬的片段保留原文，不猜測、不把時間點變成零長度區間。

S13. 不同星期、門店或價格條件可有多組時段。單一時間點／timeslot 與連續區間分開表示；最後點餐時間不冒充營業結束。

S14. 「Opening until 5pm」保留未提供的開始時間；不把它填為午夜。缺實際開門時間時不能判定已進入時段，但過了明確結束時間或在不適用星期可判定不在時段。

S15. PH 與 PH eve／Lunar New Year eve 分開處理。只有原文明確排除的類別才排除。可靠假日日曆需覆蓋 dated 的 min(endDate, today + N)，open-ended 的 today + N。缺日曆時保留優惠來源資訊，時段狀態為 Check source；不強制把未驗證日曆轉成可兌換判斷。

## 門店與展示

S16. 明確參與的門店只用那些；排除門店不列入。未明示參與門店時，以官方名錄優先，Google merchant locations 作 MVP fallback。保留 selected／excluded 等限制，即使未能解出完整名稱；地點只表示找到的店家位置，未建立完整名錄或參與證明。

S17. Named lookup 失敗不可改成全部門店。Online-only 不查實體地點、不產生 pins；所有 pins 仍需真實來源座標或既有 accepted cache，不補造座標。

S18. 顯示簡短摘要、觀測日期、固定「Summary only. Check the source before you go.」及 View source。官方來源全文可公開，以純文字呈現；Telegram 原文沿用目前 production 不公開全文的行為。未知時段直接顯示 Check source；不新增 assumptions badges 或 icons。

S19. MVP live status 使用 Within listed offer hours／Outside listed offer hours／Check source。它只描述可解讀的時間規則，不表示參與門店、庫存或個人資格已確認。Strict path 的既有 Available now 判斷不變。

S20. 查核紀錄保存原文證據、推定規則、日期依據、參與範圍依據、首次觀測、最後合格出現及最後完整成功檢查。內部記錄不以 badges 展示。

## 驗收條件

- A1（S1–S6）：表列日期、缺失單位、月底／閏年、跨年、明確矛盾、日期角色及 anchor 不可變案例全部通過；逐筆保留補值理由。
- A2（S7–S11）：完整 presence／absence／empty／reappearance、失敗／partial／cache、stale 邊界及尚未開始案例全部通過；沒有因抓取失敗或舊 permalink 續期而錯誤進 live map。
- A3（S12–S15）：多組星期／門店／價格、單點、opening-to、午夜、last order、PH 與 eve 歸屬可驗證；未支援片段有棄權紀錄，沒有新增不受支持的時段端點。
- A4（S16–S17）：官方名錄優先、Google fallback、named 失敗、排除及 online-only 的保護案例通過；範圍依據不會被抹除。
- A5（S18–S20）：desktop／mobile 展示與 API 測試證明官方全文、Telegram privacy、摘要、來源連結、live 狀態及 stale 隱藏符合規則；可重現 audit。
- A6：136-source corpus、既有 MVP records 與研究案例分別報告 coverage／correctness／abstention／unknown；每筆變更有原文依據。34-unit 案例不得當作獨立整體準確率。
- A7：strict publication、原研究與凍結 baseline 不變；離線重播可重現；artifact 失敗保留上一版；default legacy 模式無行為變更，回復舊模式可用。
- A8：依 plan 執行必要單元、corpus、typecheck、lint、format、build、UI 與獨立 review，記錄真實結果與限制，不為通過而修改凍結資料。

## 規劃預設與證據限制

採 intent 所列新鮮度及 stale 顯示預設；驗收 evidence 見 verification.md；本文件不作整體準確率承諾。27 種時段形式若可重建，先保留完整來源及出處再計數；未完成清點前不宣稱已驗證此數量。獨立 holdout 評估與最低 coverage 門檻在模型／新 parser 結果出現前固定，不能事後挑選成功案例。

## Review 決策的保留

每筆新政策差異由獨立 agent 審查原文，沒有 human gold。不能確認的解讀保留為 corpus 記錄，排除於 opt-in live。這是依 S5/S12/S20 保存未知的具體處理，不把 mechanically passing 輸出一律批准。每個 review 引用的 preview／ledger bytes 需一致；重建後不能沿用過期 review。
