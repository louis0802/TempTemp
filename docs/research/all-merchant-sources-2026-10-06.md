# 全部店家來源整理

整理日期：**2026-10-06（Asia/Singapore）**。範圍是此專案現有 **138 個店家／平台名冊項目**，另完整列出 **67 筆店家身份待確認紀錄**。店家、集團、商場及平台名稱保留原有區別；這份名冊不是新加坡全部店家清單，也不是已上線地圖店家清單。

本文件彙整專案已保存的來源與目前程式設定。原始 export 為 2026-09-16，增補發現貼文涵蓋至 2026-09-30，官方及社群研究主要更新至 2026-10-02；本次沒有重新造訪網站或追蹤短網址。因此「已驗證」表示既有證據已驗證歸屬，網站目前可讀性、活動有效性及門店營業狀態仍須在實際收集時重查。

## 一眼看目前覆蓋

| 類別                          | 數量 | 意義                                                                      |
| ----------------------------- | ---: | ------------------------------------------------------------------------- |
| 店家／平台名冊                |  138 | 137 個有歷史發現貼文，1 個僅由 registry 加入（Paradise Group）            |
| 已啟用的直接來源              |    2 | Pepper Lunch、Shake Shack；完整候選仍須通過日期、條件、參與門店與入庫驗證 |
| 停用的直接來源                |    9 | 已有 adapter，可做研究預覽；沒有自動發布資格                              |
| 有來源 track 的店家／平台     |   32 | 包含官方網站、平台入口、社群候選與受阻來源                                |
| 未完成直接優惠來源評估的店家  |  106 | 通常只有歷史 Telegram 貼文及原文外連；部分另有官方門店 provider           |
| 已驗證 Instagram 帳號         |   14 | 帳號歸屬成立；不代表 feed 完整、貼文全部屬該帳號或已啟用自動擷取          |
| 已實作官方門店／場地 provider |    5 | Pepper Lunch、Shake Shack、Gourmet Carousel、Genki Sushi、Papi’s Tacos    |
| 通用獨立來源研究入口          |   19 | 媒體、商場、平台及銀行；與直接入庫來源分開                                |
| 店家身份待確認紀錄            |   67 | 保留原標籤、原始貼文與外連，附錄逐筆列出                                  |

**啟用不代表排程已在運行或候選已出現在地圖。** 目前直接來源入庫是單一 `--source` 一次性命令；沒有 `--all`、scheduler 或 startup hook。候選資訊不完整時仍進入審查。

### 店家狀態統計

| 店家狀態     | 名冊項目數 |
| ------------ | ---------: |
| 已啟用       |          2 |
| adapter 停用 |         10 |
| 有阻礙       |         10 |
| 來源候選     |         10 |
| 未評估       |        106 |

上表按逐筆名冊重算。9 個停用來源涵蓋 10 個店家項目，因為 Paradise Group 與 Paradise Hotpot 共用一個來源。既有 `merchants.json` 摘要的 `shadow_only: 9` 與逐筆項目的 10 有差異；本文件採用逐筆項目，沒有改寫舊證據。較舊 `merchant-source-map.md` 的 139 也不是目前數量；Ajumma’s 已有官方自我識別證據，合併為 Ajumma's Korean Restaurant。Marché／Marche、Smooy／Smöoy、Tofu G／Tofu G Gelato 仍保留各自項目。

## 來源在流程中的用途

| 來源                  | 用途                           | 要補的證據                                    |
| --------------------- | ------------------------------ | --------------------------------------------- |
| Telegram／媒體文章    | 發現優惠、保留歷史原文及外連   | 店家／發行方的活動事實、日期、條件、參與門店  |
| 店家官網優惠頁        | 優惠事實與可重複列舉的主要候選 | 歸屬、完整邊界、活動正文對應與有效日期        |
| 官方社群              | 帳號與特定貼文的活動原文       | 精確帳號／貼文身份、feed 邊界、文字與圖片事實 |
| 官方門店／商場租戶頁  | 實體店存在、地址及門店狀態     | 完整分店目錄、指定優惠的參與／排除關係        |
| Google Places／OneMap | 已確認實體店的身份及座標       | 不能用搜尋結果證明全分店清單或優惠參與        |

既有發現頻道：[SG Food Deals](https://t.me/sgfooddeals)、[TasteSoul](https://t.me/tastesoulsg)。下列「原文外連」可能是短網址、媒體、平台或官方連結，全部保留來源角色，沒有因名稱相似而自動升級為官方證據。多店 roundup 的原文外連／追蹤目的地以整篇貼文保留，可能包含其他店家；不能把每個外連都當成這家店的來源。已逐店查證的入口另列在來源表。

## 已登錄的 11 個直接優惠來源

| 店家／平台       | 優惠入口                                                                                                                                                                                                                                                                                                               | 狀態                    | 來源歸屬               | source ID             |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | ---------------------- | --------------------- |
| Pepper Lunch     | [www.pepperlunch.com.sg/promo/](https://www.pepperlunch.com.sg/promo/)                                                                                                                                                                                                                                                 | 已啟用，完整候選經 gate | 已驗證歸屬             | `pepper_lunch_sg`     |
| Paradise Group   | [www.paradisegp.com/](https://www.paradisegp.com/)、[www.paradisegp.com/paradise-hotpot/](https://www.paradisegp.com/paradise-hotpot/)                                                                                                                                                                                 | 停用／研究預覽          | 已驗證歸屬             | `paradise_group_sg`   |
| Shake Shack      | [www.shakeshack.com.sg/blog/](https://www.shakeshack.com.sg/blog/)                                                                                                                                                                                                                                                     | 已啟用，完整候選經 gate | 已驗證歸屬             | `shake_shack_sg`      |
| Gourmet Carousel | [www.royalplaza.com.sg/dine/barista](https://www.royalplaza.com.sg/dine/barista)、[www.royalplaza.com.sg/dine/offers](https://www.royalplaza.com.sg/dine/offers)                                                                                                                                                       | 停用／研究預覽          | 已驗證歸屬             | `gourmet_carousel_sg` |
| FairPrice        | [www.fairprice.com.sg/weekly-promotions](https://www.fairprice.com.sg/weekly-promotions)                                                                                                                                                                                                                               | 停用／研究預覽          | 已驗證歸屬             | `fairprice_sg`        |
| Kris+            | [www.krisplus.com/en/sg/promotions](https://www.krisplus.com/en/sg/promotions)                                                                                                                                                                                                                                         | 停用／研究預覽          | 已驗證歸屬             | `kris_plus_sg`        |
| Dian Xiao Er     | [www.dianxiaoer.com.sg/promo](https://www.dianxiaoer.com.sg/promo)                                                                                                                                                                                                                                                     | 停用／研究預覽          | 可能歸屬，尚未充分驗證 | `dian_xiao_er_sg`     |
| Bari Bari Steak  | [baribaristeak.com.sg/promotions/](https://baribaristeak.com.sg/promotions/)                                                                                                                                                                                                                                           | 停用／研究預覽          | 已驗證歸屬             | `bari_bari_steak_sg`  |
| Captain Kim      | [kingdomfood.sg/captain-kim-delivery/](https://kingdomfood.sg/captain-kim-delivery/)、[kingdomfood.sg/captain-kim-korean-bbq-hotpot-tamp-j10/](https://kingdomfood.sg/captain-kim-korean-bbq-hotpot-tamp-j10/)、[kingdomfood.sg/captain-kim-korean-bbq-hotpot/](https://kingdomfood.sg/captain-kim-korean-bbq-hotpot/) | 停用／研究預覽          | 已驗證歸屬             | `captain_kim_sg`      |
| Sushiro          | [www.sushiro.com.sg/promo/](https://www.sushiro.com.sg/promo/)                                                                                                                                                                                                                                                         | 停用／研究預覽          | 已驗證歸屬             | `sushiro_sg`          |
| McDonald's       | [www.mcdonalds.com.sg/McSaver](https://www.mcdonalds.com.sg/McSaver)、[www.mcdonalds.com.sg/bfmcsaver](https://www.mcdonalds.com.sg/bfmcsaver)                                                                                                                                                                         | 停用／研究預覽          | 已驗證歸屬             | `mcdonalds_sg`        |

## 全部 138 個店家索引

點店名可跳到逐店來源。歷史貼文數以不同 Telegram 貼文 URL 計算，同一篇可能包含多個優惠；數量不表示目前有效優惠數。

| 編號 | 店家／平台                                         | 直接優惠來源狀態 | 歷史貼文 | 已記錄來源類型         | 門店來源               |
| ---: | -------------------------------------------------- | ---------------- | -------: | ---------------------- | ---------------------- |
|    1 | [21 on Rajah](#merchant-001)                       | 未評估           |        1 | 原始貼文／外連         | 尚未記錄               |
|    2 | [4Fingers](#merchant-002)                          | 有阻礙           |        2 | 店家社群、店家網站     | 尚未記錄               |
|    3 | [7-Eleven](#merchant-003)                          | 未評估           |        2 | 原始貼文／外連         | 尚未記錄               |
|    4 | [AFTER HOURS](#merchant-004)                       | 未評估           |        1 | 原始貼文／外連         | 尚未記錄               |
|    5 | [Ajumma's Korean Restaurant](#merchant-005)        | 有阻礙           |        2 | 店家社群               | 尚未記錄               |
|    6 | [ALC Rice Bowls](#merchant-006)                    | 未評估           |        1 | 原始貼文／外連         | 尚未記錄               |
|    7 | [Andaz](#merchant-007)                             | 未評估           |        1 | 原始貼文／外連         | 尚未記錄               |
|    8 | [Baci Baci](#merchant-008)                         | 未評估           |        1 | 原始貼文／外連         | 尚未記錄               |
|    9 | [Bari Bari Grand](#merchant-009)                   | 未評估           |        1 | 原始貼文／外連         | 尚未記錄               |
|   10 | [Bari Bari Steak](#merchant-010)                   | adapter 停用     |        3 | 店家社群、店家網站     | 有研究入口，未完整接入 |
|   11 | [Beard Papa's](#merchant-011)                      | 來源候選         |        2 | 店家社群               | 尚未記錄               |
|   12 | [BlackTree](#merchant-012)                         | 未評估           |        1 | 原始貼文／外連         | 尚未記錄               |
|   13 | [BOMUL Samgyetang](#merchant-013)                  | 來源候選         |        1 | 店家社群               | 尚未記錄               |
|   14 | [Bottega JB](#merchant-014)                        | 未評估           |        1 | 原始貼文／外連         | 尚未記錄               |
|   15 | [Braek Acai & Coffee](#merchant-015)               | 未評估           |        1 | 原始貼文／外連         | 尚未記錄               |
|   16 | [Brash Boys Coffee](#merchant-016)                 | 未評估           |        1 | 原始貼文／外連         | 尚未記錄               |
|   17 | [Brasserie Astoria](#merchant-017)                 | 未評估           |        1 | 原始貼文／外連         | 尚未記錄               |
|   18 | [BURNT CONES](#merchant-018)                       | 未評估           |        2 | 原始貼文／外連         | 尚未記錄               |
|   19 | [Burnt Ends Bakery](#merchant-019)                 | 未評估           |        1 | 原始貼文／外連         | 尚未記錄               |
|   20 | [Cai-Ca](#merchant-020)                            | 未評估           |        1 | 原始貼文／外連         | 尚未記錄               |
|   21 | [Captain Kim](#merchant-021)                       | adapter 停用     |        2 | 店家社群、店家網站     | 有研究入口，未完整接入 |
|   22 | [Carlton City](#merchant-022)                      | 未評估           |        1 | 原始貼文／外連         | 尚未記錄               |
|   23 | [Carnaby](#merchant-023)                           | 未評估           |        1 | 原始貼文／外連         | 尚未記錄               |
|   24 | [Casa Lola](#merchant-024)                         | 未評估           |        1 | 原始貼文／外連         | 尚未記錄               |
|   25 | [Cavern Restaurant](#merchant-025)                 | 未評估           |        1 | 原始貼文／外連         | 尚未記錄               |
|   26 | [Central Plaza](#merchant-026)                     | 未評估           |        1 | 原始貼文／外連         | 尚未記錄               |
|   27 | [CHAGEE](#merchant-027)                            | 未評估           |        1 | 原始貼文／外連         | 尚未記錄               |
|   28 | [Chateraise](#merchant-028)                        | 未評估           |        1 | 原始貼文／外連         | 尚未記錄               |
|   29 | [Chinatown Tai Chong Kok](#merchant-029)           | 未評估           |        1 | 原始貼文／外連         | 尚未記錄               |
|   30 | [Chin Mee Chin](#merchant-030)                     | 未評估           |        1 | 原始貼文／外連         | 尚未記錄               |
|   31 | [Chix Hot Chicken](#merchant-031)                  | 未評估           |        1 | 原始貼文／外連         | 尚未記錄               |
|   32 | [Coffeehouse by Kobashi](#merchant-032)            | 未評估           |        1 | 原始貼文／外連         | 尚未記錄               |
|   33 | [Common Grill](#merchant-033)                      | 未評估           |        1 | 原始貼文／外連         | 尚未記錄               |
|   34 | [CS Foods](#merchant-034)                          | 有阻礙           |        1 | 店家網站               | 尚未記錄               |
|   35 | [Dancing Crab](#merchant-035)                      | 未評估           |        1 | 原始貼文／外連         | 尚未記錄               |
|   36 | [Daya Izakaya](#merchant-036)                      | 未評估           |        1 | 原始貼文／外連         | 尚未記錄               |
|   37 | [D'Cuisine](#merchant-037)                         | 來源候選         |        1 | 店家社群               | 尚未記錄               |
|   38 | [Dian Xiao Er](#merchant-038)                      | adapter 停用     |        2 | 店家網站               | 尚未記錄               |
|   39 | [Dill](#merchant-039)                              | 未評估           |        1 | 原始貼文／外連         | 尚未記錄               |
|   40 | [Din Tai Fung](#merchant-040)                      | 未評估           |        1 | 原始貼文／外連         | 尚未記錄               |
|   41 | [Domino’s](#merchant-041)                          | 未評估           |        1 | 原始貼文／外連         | 尚未記錄               |
|   42 | [dorra Slimming](#merchant-042)                    | 未評估           |        1 | 原始貼文／外連         | 尚未記錄               |
|   43 | [Estiatorio Milos](#merchant-043)                  | 未評估           |        1 | 原始貼文／外連         | 尚未記錄               |
|   44 | [FairPrice](#merchant-044)                         | adapter 停用     |        1 | 店家網站               | 尚未記錄               |
|   45 | [FAME by Dad's Corner](#merchant-045)              | 未評估           |        2 | 原始貼文／外連         | 尚未記錄               |
|   46 | [Family Mookata](#merchant-046)                    | 未評估           |        1 | 原始貼文／外連         | 尚未記錄               |
|   47 | [Fangko House](#merchant-047)                      | 未評估           |        1 | 原始貼文／外連         | 尚未記錄               |
|   48 | [foodpanda](#merchant-048)                         | 未評估           |        1 | 原始貼文／外連         | 尚未記錄               |
|   49 | [Gelare](#merchant-049)                            | 有阻礙           |        1 | 店家社群、店家網站     | 有研究入口，未完整接入 |
|   50 | [Genki Sushi](#merchant-050)                       | 未評估           |        1 | 原始貼文／外連         | 已實作 provider        |
|   51 | [Good Combo Hotpot & BBQ](#merchant-051)           | 未評估           |        1 | 原始貼文／外連         | 尚未記錄               |
|   52 | [Gourmet Carousel](#merchant-052)                  | adapter 停用     |        1 | 店家網站               | 已實作 provider        |
|   53 | [Grab](#merchant-053)                              | 來源候選         |        1 | 發行商／平台           | 尚未記錄               |
|   54 | [GrabFood](#merchant-054)                          | 未評估           |        1 | 原始貼文／外連         | 尚未記錄               |
|   55 | [Guzman y Gomez](#merchant-055)                    | 未評估           |        3 | 原始貼文／外連         | 尚未記錄               |
|   56 | [Gwanghwamun Mijin](#merchant-056)                 | 未評估           |        2 | 原始貼文／外連         | 尚未記錄               |
|   57 | [Happy Lamb](#merchant-057)                        | 未評估           |        1 | 原始貼文／外連         | 尚未記錄               |
|   58 | [Hello Arigato](#merchant-058)                     | 未評估           |        1 | 原始貼文／外連         | 尚未記錄               |
|   59 | [Hokkaido Baked Cheese Tart](#merchant-059)        | 未評估           |        1 | 原始貼文／外連         | 尚未記錄               |
|   60 | [IKEA](#merchant-060)                              | 未評估           |        1 | 原始貼文／外連         | 尚未記錄               |
|   61 | [I’m donut](#merchant-061)                         | 未評估           |        1 | 原始貼文／外連         | 尚未記錄               |
|   62 | [Jack’s Place](#merchant-062)                      | 未評估           |        1 | 原始貼文／外連         | 尚未記錄               |
|   63 | [JEN Shangri-La](#merchant-063)                    | 未評估           |        1 | 原始貼文／外連         | 尚未記錄               |
|   64 | [Kafey Haus](#merchant-064)                        | 未評估           |        1 | 原始貼文／外連         | 尚未記錄               |
|   65 | [Katsu-an](#merchant-065)                          | 未評估           |        1 | 原始貼文／外連         | 尚未記錄               |
|   66 | [Kei Kaisendon](#merchant-066)                     | 來源候選         |        5 | 店家社群、店家網站     | 有研究入口，未完整接入 |
|   67 | [KFC](#merchant-067)                               | 未評估           |        1 | 原始貼文／外連         | 尚未記錄               |
|   68 | [Kimpson's Table](#merchant-068)                   | 來源候選         |        3 | 店家社群、店家網站     | 尚未記錄               |
|   69 | [Koi Thé](#merchant-069)                           | 未評估           |        1 | 原始貼文／外連         | 尚未記錄               |
|   70 | [Kotuwa](#merchant-070)                            | 未評估           |        1 | 原始貼文／外連         | 尚未記錄               |
|   71 | [Kris+](#merchant-071)                             | adapter 停用     |        1 | 發行商／平台           | 尚未記錄               |
|   72 | [Lao Beijing](#merchant-072)                       | 未評估           |        1 | 原始貼文／外連         | 尚未記錄               |
|   73 | [LiHO](#merchant-073)                              | 未評估           |        1 | 原始貼文／外連         | 尚未記錄               |
|   74 | [LiXin Teochew Fishball Noodles](#merchant-074)    | 未評估           |        1 | 原始貼文／外連         | 尚未記錄               |
|   75 | [Marché](#merchant-075)                            | 未評估           |        1 | 原始貼文／外連         | 尚未記錄               |
|   76 | [Marche](#merchant-076)                            | 來源候選         |        1 | 店家社群               | 尚未記錄               |
|   77 | [McDonald's](#merchant-077)                        | adapter 停用     |        4 | 店家社群、店家網站     | 有研究入口，未完整接入 |
|   78 | [Meat Smith](#merchant-078)                        | 未評估           |        2 | 原始貼文／外連         | 尚未記錄               |
|   79 | [MilkyShop](#merchant-079)                         | 未評估           |        1 | 原始貼文／外連         | 尚未記錄               |
|   80 | [More Yogurt](#merchant-080)                       | 有阻礙           |        3 | 店家網站               | 有研究入口，未完整接入 |
|   81 | [Morganfield's](#merchant-081)                     | 未評估           |        2 | 原始貼文／外連         | 尚未記錄               |
|   82 | [MOS Burger](#merchant-082)                        | 未評估           |        1 | 原始貼文／外連         | 尚未記錄               |
|   83 | [MUKAI](#merchant-083)                             | 未評估           |        1 | 原始貼文／外連         | 尚未記錄               |
|   84 | [Nasty Cookie](#merchant-084)                      | 未評估           |        2 | 原始貼文／外連         | 尚未記錄               |
|   85 | [New Ubin Seafood](#merchant-085)                  | 未評估           |        1 | 原始貼文／外連         | 尚未記錄               |
|   86 | [Next Door Spanish Cafe](#merchant-086)            | 未評估           |        1 | 原始貼文／外連         | 尚未記錄               |
|   87 | [noci bakehouse](#merchant-087)                    | 未評估           |        1 | 原始貼文／外連         | 尚未記錄               |
|   88 | [NomNom JB](#merchant-088)                         | 未評估           |        1 | 原始貼文／外連         | 尚未記錄               |
|   89 | [Nouri](#merchant-089)                             | 未評估           |        1 | 原始貼文／外連         | 尚未記錄               |
|   90 | [OMMA Korean Charcoal BBQ](#merchant-090)          | 未評估           |        1 | 原始貼文／外連         | 尚未記錄               |
|   91 | [Omuplace](#merchant-091)                          | 未評估           |        1 | 原始貼文／外連         | 尚未記錄               |
|   92 | [Papi’s Tacos](#merchant-092)                      | 未評估           |        2 | 原始貼文／外連         | 已實作 provider        |
|   93 | [Paradise Group](#merchant-093)                    | adapter 停用     |        0 | 店家網站               | 尚未記錄               |
|   94 | [Paradise Hotpot](#merchant-094)                   | adapter 停用     |        1 | 店家網站               | 尚未記錄               |
|   95 | [Park Side](#merchant-095)                         | 未評估           |        1 | 原始貼文／外連         | 尚未記錄               |
|   96 | [Pepper Lunch](#merchant-096)                      | 已啟用           |        2 | 店家網站               | 已實作 provider        |
|   97 | [Petite Menu](#merchant-097)                       | 未評估           |        1 | 原始貼文／外連         | 尚未記錄               |
|   98 | [Pizza Hut](#merchant-098)                         | 來源候選         |        3 | 店家社群、店家網站     | 有研究入口，未完整接入 |
|   99 | [Poke Theory](#merchant-099)                       | 來源候選         |        1 | 店家社群               | 尚未記錄               |
|  100 | [POKKA](#merchant-100)                             | 未評估           |        1 | 原始貼文／外連         | 尚未記錄               |
|  101 | [Potato Corner](#merchant-101)                     | 未評估           |        1 | 原始貼文／外連         | 尚未記錄               |
|  102 | [POUT Rooftop Cafe](#merchant-102)                 | 未評估           |        1 | 原始貼文／外連         | 尚未記錄               |
|  103 | [Racines](#merchant-103)                           | 未評估           |        1 | 原始貼文／外連         | 尚未記錄               |
|  104 | [Rollney](#merchant-104)                           | 未評估           |        1 | 原始貼文／外連         | 尚未記錄               |
|  105 | [Saizeriya](#merchant-105)                         | 未評估           |        1 | 原始貼文／外連         | 尚未記錄               |
|  106 | [San Shu Gong](#merchant-106)                      | 未評估           |        1 | 原始貼文／外連         | 尚未記錄               |
|  107 | [Secret Recipe](#merchant-107)                     | 未評估           |        1 | 原始貼文／外連         | 尚未記錄               |
|  108 | [Seoul Garden](#merchant-108)                      | 未評估           |        1 | 原始貼文／外連         | 尚未記錄               |
|  109 | [Shake Shack](#merchant-109)                       | 已啟用           |        2 | 店家網站、發行商／平台 | 已實作 provider        |
|  110 | [Shi Li Fang](#merchant-110)                       | 未評估           |        1 | 原始貼文／外連         | 尚未記錄               |
|  111 | [Shin Katsu](#merchant-111)                        | 未評估           |        1 | 原始貼文／外連         | 尚未記錄               |
|  112 | [SHINRAI](#merchant-112)                           | 有阻礙           |        1 | 店家社群               | 尚未記錄               |
|  113 | [Shiok Burger](#merchant-113)                      | 有阻礙           |        2 | 店家社群、店家網站     | 有研究入口，未完整接入 |
|  114 | [SIDES by the Sidemen](#merchant-114)              | 未評估           |        1 | 原始貼文／外連         | 尚未記錄               |
|  115 | [Singapore Chinese Cultural Centre](#merchant-115) | 未評估           |        1 | 原始貼文／外連         | 尚未記錄               |
|  116 | [Sinpopo Brand](#merchant-116)                     | 有阻礙           |        1 | 店家社群               | 尚未記錄               |
|  117 | [Sip Sip](#merchant-117)                           | 未評估           |        1 | 原始貼文／外連         | 尚未記錄               |
|  118 | [Smooy](#merchant-118)                             | 未評估           |        1 | 原始貼文／外連         | 尚未記錄               |
|  119 | [Smöoy](#merchant-119)                             | 未評估           |        1 | 原始貼文／外連         | 尚未記錄               |
|  120 | [Spicy Noodles SG](#merchant-120)                  | 未評估           |        1 | 原始貼文／外連         | 尚未記錄               |
|  121 | [Starbucks](#merchant-121)                         | 有阻礙           |        3 | 店家社群               | 尚未記錄               |
|  122 | [Subway](#merchant-122)                            | 未評估           |        1 | 原始貼文／外連         | 尚未記錄               |
|  123 | [Sukiya](#merchant-123)                            | 未評估           |        1 | 原始貼文／外連         | 尚未記錄               |
|  124 | [Sushidan](#merchant-124)                          | 未評估           |        1 | 原始貼文／外連         | 尚未記錄               |
|  125 | [Sushi Express](#merchant-125)                     | 未評估           |        2 | 原始貼文／外連         | 尚未記錄               |
|  126 | [Sushiro](#merchant-126)                           | adapter 停用     |        4 | 店家社群、店家網站     | 有研究入口，未完整接入 |
|  127 | [Takashimaya](#merchant-127)                       | 未評估           |        1 | 原始貼文／外連         | 尚未記錄               |
|  128 | [Tavola Aperta](#merchant-128)                     | 未評估           |        1 | 原始貼文／外連         | 尚未記錄               |
|  129 | [The Coffee Bean & Tea Leaf](#merchant-129)        | 有阻礙           |        3 | 店家社群、店家網站     | 有研究入口，未完整接入 |
|  130 | [The Summer Açaí](#merchant-130)                   | 未評估           |        1 | 原始貼文／外連         | 尚未記錄               |
|  131 | [Tofu G](#merchant-131)                            | 未評估           |        2 | 原始貼文／外連         | 尚未記錄               |
|  132 | [Tofu G Gelato](#merchant-132)                     | 來源候選         |        1 | 店家社群               | 尚未記錄               |
|  133 | [Viva Lavender](#merchant-133)                     | 未評估           |        1 | 原始貼文／外連         | 尚未記錄               |
|  134 | [White Restaurant](#merchant-134)                  | 未評估           |        1 | 原始貼文／外連         | 尚未記錄               |
|  135 | [Window on The Park](#merchant-135)                | 未評估           |        1 | 原始貼文／外連         | 尚未記錄               |
|  136 | [Yakiniku Like](#merchant-136)                     | 未評估           |        1 | 原始貼文／外連         | 尚未記錄               |
|  137 | [Yo-Chi](#merchant-137)                            | 未評估           |        1 | 原始貼文／外連         | 尚未記錄               |
|  138 | [Zapangi Coffee](#merchant-138)                    | 未評估           |        1 | 原始貼文／外連         | 尚未記錄               |

## 逐店來源明細

<a id="merchant-001"></a>

### 001 · 21 on Rajah

- **狀態：** 未完成直接優惠來源評估。
- **原始發現貼文（1 篇）：** [sgfooddeals/4928](https://t.me/sgfooddeals/4928)。
- **同篇原文外連（未逐店驗證關聯）：** [tco.sg/7RSwAhjRO](https://tco.sg/7RSwAhjRO)、[tco.sg/91D7DJD8G](https://tco.sg/91D7DJD8G)、[tco.sg/TXH4bNk4I](https://tco.sg/TXH4bNk4I)、[tco.sg/uMf2SHTNQ](https://tco.sg/uMf2SHTNQ)、[tco.sg/uYNyopLz1](https://tco.sg/uYNyopLz1)。
- **直接優惠來源：** 名冊尚未記錄已評估的官網／官方社群優惠 track；這不表示店家沒有官網。
- **門店／場地來源：** 本次盤點資料尚未記錄可用的完整官方目錄／runtime provider；需補充，不能由 Google 搜尋直接宣稱全店參與。
- **待補／阻礙：** 尚無已保存的直接優惠來源評估（`no_captured_direct_source_assessment`）。

<a id="merchant-002"></a>

### 002 · 4Fingers

- **狀態：** 已研究，目前有阻礙。
- **原始發現貼文（2 篇）：** [sgfooddeals/4890](https://t.me/sgfooddeals/4890)、[tastesoulsg/4466](https://t.me/tastesoulsg/4466)。
- **名冊記錄的營運方：** 4Fingers Pte. Ltd.。
- **同篇原文外連（未逐店驗證關聯）：** [bit.ly/4gNBcI6](http://bit.ly/4gNBcI6)、[tco.sg/cBHpXk17i](https://tco.sg/cBHpXk17i)。

| 類型／帳號                           | 來源入口或已保存貼文                                                                                                                                                                                                   | 歸屬       | 列舉狀態         | 接入狀態 |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ---------------- | -------- |
| 店家社群 · instagram · gimme4fingers | [www.instagram.com/gimme4fingers/](https://www.instagram.com/gimme4fingers/)                                                                                                                                           | 已驗證歸屬 | 有阻礙           | 有阻礙   |
| 店家網站                             | [order.4fingers.com.sg/corp/my_profile](https://order.4fingers.com.sg/corp/my_profile)、[www.4fingers.com.sg/](https://www.4fingers.com.sg/)、[www.4fingers.com.sg/promotions](https://www.4fingers.com.sg/promotions) | 已驗證歸屬 | 未建立可列舉入口 | 有阻礙   |

- **instagram 帳號入口：** [gimme4fingers](https://www.instagram.com/gimme4fingers/)；已驗證歸屬。帳號與每篇貼文對應、feed 完整性另外驗證。
- **歸屬／身份查證的已記錄網頁：** [order.4fingers.com.sg/corp/my_profile](https://order.4fingers.com.sg/corp/my_profile)。查證結論以來源表及既有 review 為準；保留未驗證候選。
- **門店／場地來源：** 本次盤點資料尚未記錄可用的完整官方目錄／runtime provider；需補充，不能由 Google 搜尋直接宣稱全店參與。
- **待補／阻礙：** 既有研究未建立重複自動存取條件（`automated_access_permission_unestablished`）；有限範圍內的 feed 完整邊界未證明（`bounded_feed_boundary_unproven`）；沒有已證明的公開有限列舉方式（`no_public_bounded_enumeration`）；貼文與帳號的對應未證明（`post_account_association_unproven`）；公開優惠 HTML 只有 JavaScript 外殼（`public_promotion_html_js_shell`）；後續載入／分頁未知（`unknown_continuation`）。

<a id="merchant-003"></a>

### 003 · 7-Eleven

- **狀態：** 未完成直接優惠來源評估。
- **原始發現貼文（2 篇）：** [sgfooddeals/4870](https://t.me/sgfooddeals/4870)、[tastesoulsg/4445](https://t.me/tastesoulsg/4445)。
- **同篇原文外連（未逐店驗證關聯）：** [bit.ly/4iuUX9C](http://bit.ly/4iuUX9C)、[tco.sg/Z54juGVH9](http://tco.sg/Z54juGVH9)。
- **直接優惠來源：** 名冊尚未記錄已評估的官網／官方社群優惠 track；這不表示店家沒有官網。
- **門店／場地來源：** 本次盤點資料尚未記錄可用的完整官方目錄／runtime provider；需補充，不能由 Google 搜尋直接宣稱全店參與。
- **待補／阻礙：** 尚無已保存的直接優惠來源評估（`no_captured_direct_source_assessment`）。

<a id="merchant-004"></a>

### 004 · AFTER HOURS

- **狀態：** 未完成直接優惠來源評估。
- **原始發現貼文（1 篇）：** [tastesoulsg/4414](https://t.me/tastesoulsg/4414)。
- **同篇原文外連（未逐店驗證關聯）：** [bit.ly/4z9pj7y](http://bit.ly/4z9pj7y)。
- **直接優惠來源：** 名冊尚未記錄已評估的官網／官方社群優惠 track；這不表示店家沒有官網。
- **門店／場地來源：** 本次盤點資料尚未記錄可用的完整官方目錄／runtime provider；需補充，不能由 Google 搜尋直接宣稱全店參與。
- **待補／阻礙：** 尚無已保存的直接優惠來源評估（`no_captured_direct_source_assessment`）。

<a id="merchant-005"></a>

### 005 · Ajumma's Korean Restaurant

- **狀態：** 已研究，目前有阻礙。
- **原始發現貼文（2 篇）：** [sgfooddeals/4932](https://t.me/sgfooddeals/4932)、[tastesoulsg/4474](https://t.me/tastesoulsg/4474)。
- **名冊保留的原始名稱：** Ajumma's Korean Restaurant、Ajumma’s。
- **同篇原文外連（未逐店驗證關聯）：** [bit.ly/4hcYNDb](http://bit.ly/4hcYNDb)、[tco.sg/PBcgXrqA2](http://tco.sg/PBcgXrqA2)。
- **同篇貼文已追蹤的候選目的地：** [www.instagram.com/p/Dc-kxPJzx9B/](https://www.instagram.com/p/Dc-kxPJzx9B/?utm_source=telegram&utm_medium=sep2026&utm_campaign=sgfooddeals)。目的地可被找到，不代表與這家店的關聯、歸屬、活動事實或目前可讀性已驗證。

| 類型／帳號                      | 來源入口或已保存貼文                                                                                                                         | 歸屬       | 列舉狀態 | 接入狀態 |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | -------- | -------- |
| 店家社群 · instagram · ajummasg | [www.instagram.com/p/Dc-kxPJzx9B/](https://www.instagram.com/p/Dc-kxPJzx9B/?utm_source=telegram&utm_medium=sep2026&utm_campaign=sgfooddeals) | 已驗證歸屬 | 有阻礙   | 有阻礙   |

- **instagram 帳號入口：** [ajummasg](https://www.instagram.com/ajummasg/)；已驗證歸屬。帳號與每篇貼文對應、feed 完整性另外驗證。
- **歸屬／身份查證的已記錄網頁：** [www.ajummassg.com/](https://www.ajummassg.com/)。查證結論以來源表及既有 review 為準；保留未驗證候選。
- **門店／場地來源：** 本次盤點資料尚未記錄可用的完整官方目錄／runtime provider；需補充，不能由 Google 搜尋直接宣稱全店參與。
- **待補／阻礙：** 既有研究未建立重複自動存取條件（`automated_access_permission_unestablished`）；有限範圍內的 feed 完整邊界未證明（`bounded_feed_boundary_unproven`）；公開回應未暴露可完整列舉的 feed（`public_feed_not_exposed`）；後續載入／分頁未知（`unknown_continuation`）。

<a id="merchant-006"></a>

### 006 · ALC Rice Bowls

- **狀態：** 未完成直接優惠來源評估。
- **原始發現貼文（1 篇）：** [sgfooddeals/4879](https://t.me/sgfooddeals/4879)。
- **同篇原文外連（未逐店驗證關聯）：** [tco.sg/6QoggzgFF](https://tco.sg/6QoggzgFF)、[tco.sg/dlFybU4ac](https://tco.sg/dlFybU4ac)、[tco.sg/p0fcsGKLO](https://tco.sg/p0fcsGKLO)、[tco.sg/qvdxn4dox](https://tco.sg/qvdxn4dox)、[tco.sg/vDrh4OQwD](https://tco.sg/vDrh4OQwD)。
- **直接優惠來源：** 名冊尚未記錄已評估的官網／官方社群優惠 track；這不表示店家沒有官網。
- **門店／場地來源：** 本次盤點資料尚未記錄可用的完整官方目錄／runtime provider；需補充，不能由 Google 搜尋直接宣稱全店參與。
- **待補／阻礙：** 尚無已保存的直接優惠來源評估（`no_captured_direct_source_assessment`）。

<a id="merchant-007"></a>

### 007 · Andaz

- **狀態：** 未完成直接優惠來源評估。
- **原始發現貼文（1 篇）：** [sgfooddeals/4920](https://t.me/sgfooddeals/4920)。
- **同篇原文外連（未逐店驗證關聯）：** [tco.sg/2iFIZirzm](https://tco.sg/2iFIZirzm)、[tco.sg/X1iavOqAD](https://tco.sg/X1iavOqAD)、[tco.sg/h2B1A4ia3](https://tco.sg/h2B1A4ia3)、[tco.sg/xEkGQpKMK](https://tco.sg/xEkGQpKMK)、[tco.sg/zZyWmtovq](https://tco.sg/zZyWmtovq)。
- **直接優惠來源：** 名冊尚未記錄已評估的官網／官方社群優惠 track；這不表示店家沒有官網。
- **門店／場地來源：** 本次盤點資料尚未記錄可用的完整官方目錄／runtime provider；需補充，不能由 Google 搜尋直接宣稱全店參與。
- **待補／阻礙：** 尚無已保存的直接優惠來源評估（`no_captured_direct_source_assessment`）。

<a id="merchant-008"></a>

### 008 · Baci Baci

- **狀態：** 未完成直接優惠來源評估。
- **原始發現貼文（1 篇）：** [tastesoulsg/4440](https://t.me/tastesoulsg/4440)。
- **同篇原文外連（未逐店驗證關聯）：** [bit.ly/4wGoeBF](http://bit.ly/4wGoeBF)。
- **直接優惠來源：** 名冊尚未記錄已評估的官網／官方社群優惠 track；這不表示店家沒有官網。
- **門店／場地來源：** 本次盤點資料尚未記錄可用的完整官方目錄／runtime provider；需補充，不能由 Google 搜尋直接宣稱全店參與。
- **待補／阻礙：** 尚無已保存的直接優惠來源評估（`no_captured_direct_source_assessment`）。

<a id="merchant-009"></a>

### 009 · Bari Bari Grand

- **狀態：** 未完成直接優惠來源評估。
- **原始發現貼文（1 篇）：** [tastesoulsg/4458](https://t.me/tastesoulsg/4458)。
- **同篇原文外連（未逐店驗證關聯）：** [bit.ly/4ion0Yz](http://bit.ly/4ion0Yz)。
- **直接優惠來源：** 名冊尚未記錄已評估的官網／官方社群優惠 track；這不表示店家沒有官網。
- **門店／場地來源：** 本次盤點資料尚未記錄可用的完整官方目錄／runtime provider；需補充，不能由 Google 搜尋直接宣稱全店參與。
- **待補／阻礙：** 尚無已保存的直接優惠來源評估（`no_captured_direct_source_assessment`）。

<a id="merchant-010"></a>

### 010 · Bari Bari Steak

- **狀態：** 已有 adapter，仍停用／研究預覽。
- **原始發現貼文（3 篇）：** [sgfooddeals/4935](https://t.me/sgfooddeals/4935)、[tastesoulsg/4483](https://t.me/tastesoulsg/4483)、[tastesoulsg/4500](https://t.me/tastesoulsg/4500)。
- **名冊記錄的營運方：** EN Group。
- **同篇原文外連（未逐店驗證關聯）：** [bit.ly/3UQ8n6u](http://bit.ly/3UQ8n6u)、[bit.ly/3V4Xk9C](http://bit.ly/3V4Xk9C)、[tco.sg/tEJE53L6r](http://tco.sg/tEJE53L6r)。
- **同篇貼文已追蹤的候選目的地：** [www.facebook.com/reel/2213996399456039](https://www.facebook.com/reel/2213996399456039?utm_source=telegram&utm_medium=sep2026&utm_campaign=sgfooddeals)、[www.instagram.com/p/DdF3_bwEeGK/](https://www.instagram.com/p/DdF3_bwEeGK/?hl=en&utm_source=Telegram&utm_medium=TS&utm_campaign=TS_BariBariSteak-1f1)、[www.instagram.com/p/DdbNN-YicMs/](https://www.instagram.com/p/DdbNN-YicMs/?utm_source=telegram&utm_medium=TS)。目的地可被找到，不代表與這家店的關聯、歸屬、活動事實或目前可讀性已驗證。

| 類型／帳號                             | 來源入口或已保存貼文                                                                                                                                                                                                                                                   | 歸屬       | 列舉狀態           | 接入狀態       |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ------------------ | -------------- |
| 店家社群 · facebook · 61583504727882   | [www.facebook.com/reel/2213996399456039](https://www.facebook.com/reel/2213996399456039?utm_source=telegram&utm_medium=sep2026&utm_campaign=sgfooddeals)                                                                                                               | 已驗證歸屬 | 未評估             | 候選           |
| 店家社群 · instagram · baribaristeaksg | [www.instagram.com/p/DdF3_bwEeGK/](https://www.instagram.com/p/DdF3_bwEeGK/?hl=en&utm_source=Telegram&utm_medium=TS&utm_campaign=TS_BariBariSteak-1f1)、[www.instagram.com/p/DdbNN-YicMs/](https://www.instagram.com/p/DdbNN-YicMs/?utm_source=telegram&utm_medium=TS) | 已驗證歸屬 | 有阻礙             | 有阻礙         |
| 店家網站                               | [baribaristeak.com.sg/promotions/](https://baribaristeak.com.sg/promotions/)                                                                                                                                                                                           | 已驗證歸屬 | 部分，完整性未成立 | 停用／研究預覽 |

- **facebook 帳號入口：** [61583504727882](https://www.facebook.com/profile.php?id=61583504727882)；已驗證歸屬。帳號與每篇貼文對應、feed 完整性另外驗證。
- **instagram 帳號入口：** [baribaristeaksg](https://www.instagram.com/baribaristeaksg/)；已驗證歸屬。帳號與每篇貼文對應、feed 完整性另外驗證。
- **歸屬／身份查證的已記錄網頁：** [baribaristeak.com.sg/](https://baribaristeak.com.sg/)、[engroup.com.sg/](https://engroup.com.sg/)。查證結論以來源表及既有 review 為準；保留未驗證候選。
- **門店／場地來源：** [baribaristeak.com.sg/locations/](https://baribaristeak.com.sg/locations/)。既有研究確認官方 locations 頁；尚未加入 direct-source runtime 門店 provider。Bari Bari Grand 保留為不同店家。
- **待補／阻礙：** 既有研究未建立重複自動存取條件（`automated_access_permission_unestablished`）；優惠卡片網格的延伸／完整性未證明（`bari_grid_continuation_unproven`）；有限範圍內的 feed 完整邊界未證明（`bounded_feed_boundary_unproven`）；活動有效日期未指定（`campaign_validity_unspecified`）；活動詳細頁正文與指定活動未能確實對應（`detail_campaign_body_unassociated`）；不同門店／時段群組需審查（`outlet_time_groups_require_review`）；後續載入／分頁未知（`unknown_continuation`）。

<a id="merchant-011"></a>

### 011 · Beard Papa's

- **狀態：** 來源候選，尚未完成資格驗證。
- **原始發現貼文（2 篇）：** [sgfooddeals/4954](https://t.me/sgfooddeals/4954)、[tastesoulsg/4510](https://t.me/tastesoulsg/4510)。
- **名冊保留的原始名稱：** Beard Papa's、Beard Papa’s。
- **同篇原文外連（未逐店驗證關聯）：** [bit.ly/46ELtSe](http://bit.ly/46ELtSe)、[tco.sg/yM6I8WSDH](http://tco.sg/yM6I8WSDH)。
- **同篇貼文已追蹤的候選目的地：** [www.instagram.com/p/DdsjWF1jKhg/](https://www.instagram.com/p/DdsjWF1jKhg/?utm_source=telegram&utm_medium=TS&utm_content=beard+papa%27s+1for1+bugis)、[www.instagram.com/p/DdsjWF1jKhg/](https://www.instagram.com/p/DdsjWF1jKhg/?utm_source=telegram&utm_medium=oct2026&utm_campaign=sgfooddeals)。目的地可被找到，不代表與這家店的關聯、歸屬、活動事實或目前可讀性已驗證。

| 類型／帳號           | 來源入口或已保存貼文                                                                                                                                  | 歸屬       | 列舉狀態 | 接入狀態 |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | -------- | -------- |
| 店家社群 · instagram | [www.instagram.com/p/DdsjWF1jKhg/](https://www.instagram.com/p/DdsjWF1jKhg/?utm_source=telegram&utm_medium=oct2026&utm_campaign=sgfooddeals)          | 未驗證歸屬 | 未評估   | 候選     |
| 店家社群 · instagram | [www.instagram.com/p/DdsjWF1jKhg/](https://www.instagram.com/p/DdsjWF1jKhg/?utm_source=telegram&utm_medium=TS&utm_content=beard+papa%27s+1for1+bugis) | 未驗證歸屬 | 未評估   | 候選     |

- **門店／場地來源：** 本次盤點資料尚未記錄可用的完整官方目錄／runtime provider；需補充，不能由 Google 搜尋直接宣稱全店參與。
- **待補／阻礙：** 貼文所屬精確帳號未確認（`exact_account_unresolved`）；來源歸屬未驗證（`ownership_unverified`）。

<a id="merchant-012"></a>

### 012 · BlackTree

- **狀態：** 未完成直接優惠來源評估。
- **原始發現貼文（1 篇）：** [tastesoulsg/4428](https://t.me/tastesoulsg/4428)。
- **同篇原文外連（未逐店驗證關聯）：** [bit.ly/4xFP3qy](http://bit.ly/4xFP3qy)。
- **直接優惠來源：** 名冊尚未記錄已評估的官網／官方社群優惠 track；這不表示店家沒有官網。
- **門店／場地來源：** 本次盤點資料尚未記錄可用的完整官方目錄／runtime provider；需補充，不能由 Google 搜尋直接宣稱全店參與。
- **待補／阻礙：** 尚無已保存的直接優惠來源評估（`no_captured_direct_source_assessment`）。

<a id="merchant-013"></a>

### 013 · BOMUL Samgyetang

- **狀態：** 來源候選，尚未完成資格驗證。
- **原始發現貼文（1 篇）：** [tastesoulsg/4507](https://t.me/tastesoulsg/4507)。
- **同篇原文外連（未逐店驗證關聯）：** [bit.ly/3TLpm9O](http://bit.ly/3TLpm9O)。
- **同篇貼文已追蹤的候選目的地：** [www.instagram.com/p/DdjTKPTzKUo/](https://www.instagram.com/p/DdjTKPTzKUo/?utm_source=telegram&utm_medium=TS)。目的地可被找到，不代表與這家店的關聯、歸屬、活動事實或目前可讀性已驗證。

| 類型／帳號           | 來源入口或已保存貼文                                                                                           | 歸屬       | 列舉狀態 | 接入狀態 |
| -------------------- | -------------------------------------------------------------------------------------------------------------- | ---------- | -------- | -------- |
| 店家社群 · instagram | [www.instagram.com/p/DdjTKPTzKUo/](https://www.instagram.com/p/DdjTKPTzKUo/?utm_source=telegram&utm_medium=TS) | 未驗證歸屬 | 未評估   | 候選     |

- **門店／場地來源：** 本次盤點資料尚未記錄可用的完整官方目錄／runtime provider；需補充，不能由 Google 搜尋直接宣稱全店參與。
- **待補／阻礙：** 貼文所屬精確帳號未確認（`exact_account_unresolved`）；來源歸屬未驗證（`ownership_unverified`）。

<a id="merchant-014"></a>

### 014 · Bottega JB

- **狀態：** 未完成直接優惠來源評估。
- **原始發現貼文（1 篇）：** [tastesoulsg/4416](https://t.me/tastesoulsg/4416)。
- **同篇原文外連（未逐店驗證關聯）：** [bit.ly/3Uu9DvF](http://bit.ly/3Uu9DvF)、[t.me/confirmgood](https://t.me/confirmgood)。
- **直接優惠來源：** 名冊尚未記錄已評估的官網／官方社群優惠 track；這不表示店家沒有官網。
- **門店／場地來源：** 本次盤點資料尚未記錄可用的完整官方目錄／runtime provider；需補充，不能由 Google 搜尋直接宣稱全店參與。
- **待補／阻礙：** 尚無已保存的直接優惠來源評估（`no_captured_direct_source_assessment`）。

<a id="merchant-015"></a>

### 015 · Braek Acai & Coffee

- **狀態：** 未完成直接優惠來源評估。
- **原始發現貼文（1 篇）：** [sgfooddeals/4895](https://t.me/sgfooddeals/4895)。
- **同篇原文外連（未逐店驗證關聯）：** [tco.sg/onwLjK3nP](http://tco.sg/onwLjK3nP)。
- **直接優惠來源：** 名冊尚未記錄已評估的官網／官方社群優惠 track；這不表示店家沒有官網。
- **門店／場地來源：** 本次盤點資料尚未記錄可用的完整官方目錄／runtime provider；需補充，不能由 Google 搜尋直接宣稱全店參與。
- **待補／阻礙：** 尚無已保存的直接優惠來源評估（`no_captured_direct_source_assessment`）。

<a id="merchant-016"></a>

### 016 · Brash Boys Coffee

- **狀態：** 未完成直接優惠來源評估。
- **原始發現貼文（1 篇）：** [sgfooddeals/4924](https://t.me/sgfooddeals/4924)。
- **同篇原文外連（未逐店驗證關聯）：** [tco.sg/44jVMtedr](https://tco.sg/44jVMtedr)。
- **直接優惠來源：** 名冊尚未記錄已評估的官網／官方社群優惠 track；這不表示店家沒有官網。
- **門店／場地來源：** 本次盤點資料尚未記錄可用的完整官方目錄／runtime provider；需補充，不能由 Google 搜尋直接宣稱全店參與。
- **待補／阻礙：** 尚無已保存的直接優惠來源評估（`no_captured_direct_source_assessment`）。

<a id="merchant-017"></a>

### 017 · Brasserie Astoria

- **狀態：** 未完成直接優惠來源評估。
- **原始發現貼文（1 篇）：** [sgfooddeals/4910](https://t.me/sgfooddeals/4910)。
- **同篇原文外連（未逐店驗證關聯）：** [tco.sg/hsbcdiningxsgfd](http://tco.sg/hsbcdiningxsgfd)。
- **直接優惠來源：** 名冊尚未記錄已評估的官網／官方社群優惠 track；這不表示店家沒有官網。
- **門店／場地來源：** 本次盤點資料尚未記錄可用的完整官方目錄／runtime provider；需補充，不能由 Google 搜尋直接宣稱全店參與。
- **待補／阻礙：** 尚無已保存的直接優惠來源評估（`no_captured_direct_source_assessment`）。

<a id="merchant-018"></a>

### 018 · BURNT CONES

- **狀態：** 未完成直接優惠來源評估。
- **原始發現貼文（2 篇）：** [sgfooddeals/4877](https://t.me/sgfooddeals/4877)、[tastesoulsg/4411](https://t.me/tastesoulsg/4411)。
- **名冊保留的原始名稱：** BURNT CONES、Burnt Cones。
- **同篇原文外連（未逐店驗證關聯）：** [bit.ly/4cfVtV3](http://bit.ly/4cfVtV3)、[tco.sg/gYRtSCk2L](http://tco.sg/gYRtSCk2L)。
- **直接優惠來源：** 名冊尚未記錄已評估的官網／官方社群優惠 track；這不表示店家沒有官網。
- **門店／場地來源：** 本次盤點資料尚未記錄可用的完整官方目錄／runtime provider；需補充，不能由 Google 搜尋直接宣稱全店參與。
- **待補／阻礙：** 尚無已保存的直接優惠來源評估（`no_captured_direct_source_assessment`）。

<a id="merchant-019"></a>

### 019 · Burnt Ends Bakery

- **狀態：** 未完成直接優惠來源評估。
- **原始發現貼文（1 篇）：** [sgfooddeals/4910](https://t.me/sgfooddeals/4910)。
- **同篇原文外連（未逐店驗證關聯）：** [tco.sg/hsbcdiningxsgfd](http://tco.sg/hsbcdiningxsgfd)。
- **直接優惠來源：** 名冊尚未記錄已評估的官網／官方社群優惠 track；這不表示店家沒有官網。
- **門店／場地來源：** 本次盤點資料尚未記錄可用的完整官方目錄／runtime provider；需補充，不能由 Google 搜尋直接宣稱全店參與。
- **待補／阻礙：** 尚無已保存的直接優惠來源評估（`no_captured_direct_source_assessment`）。

<a id="merchant-020"></a>

### 020 · Cai-Ca

- **狀態：** 未完成直接優惠來源評估。
- **原始發現貼文（1 篇）：** [sgfooddeals/4900](https://t.me/sgfooddeals/4900)。
- **同篇原文外連（未逐店驗證關聯）：** [tco.sg/caicasgxcollab](http://tco.sg/caicasgxcollab)、[t.me/sgadulting101](https://t.me/sgadulting101)、[tco.sg/caicaigxcollab](https://tco.sg/caicaigxcollab)、[tco.sg/solcoffeeinstaxcollab](https://tco.sg/solcoffeeinstaxcollab)。
- **直接優惠來源：** 名冊尚未記錄已評估的官網／官方社群優惠 track；這不表示店家沒有官網。
- **門店／場地來源：** 本次盤點資料尚未記錄可用的完整官方目錄／runtime provider；需補充，不能由 Google 搜尋直接宣稱全店參與。
- **待補／阻礙：** 尚無已保存的直接優惠來源評估（`no_captured_direct_source_assessment`）。

<a id="merchant-021"></a>

### 021 · Captain Kim

- **狀態：** 已有 adapter，仍停用／研究預覽。
- **原始發現貼文（2 篇）：** [sgfooddeals/4874](https://t.me/sgfooddeals/4874)、[sgfooddeals/4916](https://t.me/sgfooddeals/4916)。
- **名冊記錄的營運方：** Kingdom Food Holding Pte Ltd。
- **同篇原文外連（未逐店驗證關聯）：** [tco.sg/QqtjofdjG](http://tco.sg/QqtjofdjG)、[tco.sg/pMxLWeVvU](http://tco.sg/pMxLWeVvU)。

| 類型／帳號                          | 來源入口或已保存貼文                                                                                                                                                                                                                                                                                                   | 歸屬       | 列舉狀態           | 接入狀態       |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ------------------ | -------------- |
| 店家社群 · instagram · captainkimsg | [www.instagram.com/captainkimsg/](https://www.instagram.com/captainkimsg/)                                                                                                                                                                                                                                             | 已驗證歸屬 | 有阻礙             | 有阻礙         |
| 店家網站                            | [kingdomfood.sg/captain-kim-delivery/](https://kingdomfood.sg/captain-kim-delivery/)、[kingdomfood.sg/captain-kim-korean-bbq-hotpot-tamp-j10/](https://kingdomfood.sg/captain-kim-korean-bbq-hotpot-tamp-j10/)、[kingdomfood.sg/captain-kim-korean-bbq-hotpot/](https://kingdomfood.sg/captain-kim-korean-bbq-hotpot/) | 已驗證歸屬 | 部分，完整性未成立 | 停用／研究預覽 |

- **instagram 帳號入口：** [captainkimsg](https://www.instagram.com/captainkimsg/)；已驗證歸屬。帳號與每篇貼文對應、feed 完整性另外驗證。
- **歸屬／身份查證的已記錄網頁：** [kingdomfood.sg/captain-kim-korean-bbq-hotpot-tamp-j10/](https://kingdomfood.sg/captain-kim-korean-bbq-hotpot-tamp-j10/)、[kingdomfood.sg/terms-of-use-privacy-policy/](https://kingdomfood.sg/terms-of-use-privacy-policy/)。查證結論以來源表及既有 review 為準；保留未驗證候選。
- **門店／場地來源：** [kingdomfood.sg/captain-kim-korean-bbq-hotpot-tamp-j10/](https://kingdomfood.sg/captain-kim-korean-bbq-hotpot-tamp-j10/)。官方 Tampines Junction／Junction 10 場地頁；尚無 runtime 門店 provider。
- **門店／場地來源：** [kingdomfood.sg/captain-kim-korean-bbq-hotpot/](https://kingdomfood.sg/captain-kim-korean-bbq-hotpot/)。官方 Clementi Grantral Mall 場地頁；場地與各優惠對應仍需審查。
- **待補／阻礙：** 既有研究未建立重複自動存取條件（`automated_access_permission_unestablished`）；有限範圍內的 feed 完整邊界未證明（`bounded_feed_boundary_unproven`）；活動散落於中央索引之外（`captain_campaigns_outside_central_index`）；圖片與文字活動內容等價性未證明（`image_text_equivalence_unproven`）；貼文與帳號的對應未證明（`post_account_association_unproven`）；後續載入／分頁未知（`unknown_continuation`）；場地頁與優惠適用範圍需審查（`venue_page_scope_requires_review`）。

<a id="merchant-022"></a>

### 022 · Carlton City

- **狀態：** 未完成直接優惠來源評估。
- **原始發現貼文（1 篇）：** [sgfooddeals/4882](https://t.me/sgfooddeals/4882)。
- **同篇原文外連（未逐店驗證關聯）：** [tco.sg/7103UMnKz](https://tco.sg/7103UMnKz)、[tco.sg/97OSlurTa](https://tco.sg/97OSlurTa)、[tco.sg/bpaapFAMo](https://tco.sg/bpaapFAMo)、[tco.sg/fDd6T5Bvo](https://tco.sg/fDd6T5Bvo)、[tco.sg/n1DPyldXG](https://tco.sg/n1DPyldXG)。
- **直接優惠來源：** 名冊尚未記錄已評估的官網／官方社群優惠 track；這不表示店家沒有官網。
- **門店／場地來源：** 本次盤點資料尚未記錄可用的完整官方目錄／runtime provider；需補充，不能由 Google 搜尋直接宣稱全店參與。
- **待補／阻礙：** 尚無已保存的直接優惠來源評估（`no_captured_direct_source_assessment`）。

<a id="merchant-023"></a>

### 023 · Carnaby

- **狀態：** 未完成直接優惠來源評估。
- **原始發現貼文（1 篇）：** [sgfooddeals/4875](https://t.me/sgfooddeals/4875)。
- **同篇原文外連（未逐店驗證關聯）：** [tco.sg/2QLeDtHDw](https://tco.sg/2QLeDtHDw)。
- **直接優惠來源：** 名冊尚未記錄已評估的官網／官方社群優惠 track；這不表示店家沒有官網。
- **門店／場地來源：** 本次盤點資料尚未記錄可用的完整官方目錄／runtime provider；需補充，不能由 Google 搜尋直接宣稱全店參與。
- **待補／阻礙：** 尚無已保存的直接優惠來源評估（`no_captured_direct_source_assessment`）。

<a id="merchant-024"></a>

### 024 · Casa Lola

- **狀態：** 未完成直接優惠來源評估。
- **原始發現貼文（1 篇）：** [tastesoulsg/4449](https://t.me/tastesoulsg/4449)。
- **同篇原文外連（未逐店驗證關聯）：** [bit.ly/4gwpWzA](http://bit.ly/4gwpWzA)。
- **直接優惠來源：** 名冊尚未記錄已評估的官網／官方社群優惠 track；這不表示店家沒有官網。
- **門店／場地來源：** 本次盤點資料尚未記錄可用的完整官方目錄／runtime provider；需補充，不能由 Google 搜尋直接宣稱全店參與。
- **待補／阻礙：** 尚無已保存的直接優惠來源評估（`no_captured_direct_source_assessment`）。

<a id="merchant-025"></a>

### 025 · Cavern Restaurant

- **狀態：** 未完成直接優惠來源評估。
- **原始發現貼文（1 篇）：** [tastesoulsg/4461](https://t.me/tastesoulsg/4461)。
- **同篇原文外連（未逐店驗證關聯）：** [bit.ly/4ylfzWN](http://bit.ly/4ylfzWN)。
- **直接優惠來源：** 名冊尚未記錄已評估的官網／官方社群優惠 track；這不表示店家沒有官網。
- **門店／場地來源：** 本次盤點資料尚未記錄可用的完整官方目錄／runtime provider；需補充，不能由 Google 搜尋直接宣稱全店參與。
- **待補／阻礙：** 尚無已保存的直接優惠來源評估（`no_captured_direct_source_assessment`）。

<a id="merchant-026"></a>

### 026 · Central Plaza

- **狀態：** 未完成直接優惠來源評估。
- **原始發現貼文（1 篇）：** [sgfooddeals/4920](https://t.me/sgfooddeals/4920)。
- **同篇原文外連（未逐店驗證關聯）：** [tco.sg/2iFIZirzm](https://tco.sg/2iFIZirzm)、[tco.sg/X1iavOqAD](https://tco.sg/X1iavOqAD)、[tco.sg/h2B1A4ia3](https://tco.sg/h2B1A4ia3)、[tco.sg/xEkGQpKMK](https://tco.sg/xEkGQpKMK)、[tco.sg/zZyWmtovq](https://tco.sg/zZyWmtovq)。
- **直接優惠來源：** 名冊尚未記錄已評估的官網／官方社群優惠 track；這不表示店家沒有官網。
- **門店／場地來源：** 本次盤點資料尚未記錄可用的完整官方目錄／runtime provider；需補充，不能由 Google 搜尋直接宣稱全店參與。
- **待補／阻礙：** 尚無已保存的直接優惠來源評估（`no_captured_direct_source_assessment`）。

<a id="merchant-027"></a>

### 027 · CHAGEE

- **狀態：** 未完成直接優惠來源評估。
- **原始發現貼文（1 篇）：** [tastesoulsg/4432](https://t.me/tastesoulsg/4432)。
- **同篇原文外連（未逐店驗證關聯）：** [bit.ly/4gq0RX6](http://bit.ly/4gq0RX6)。
- **直接優惠來源：** 名冊尚未記錄已評估的官網／官方社群優惠 track；這不表示店家沒有官網。
- **門店／場地來源：** 本次盤點資料尚未記錄可用的完整官方目錄／runtime provider；需補充，不能由 Google 搜尋直接宣稱全店參與。
- **待補／阻礙：** 尚無已保存的直接優惠來源評估（`no_captured_direct_source_assessment`）。

<a id="merchant-028"></a>

### 028 · Chateraise

- **狀態：** 未完成直接優惠來源評估。
- **原始發現貼文（1 篇）：** [sgfooddeals/4898](https://t.me/sgfooddeals/4898)。
- **同篇原文外連（未逐店驗證關聯）：** [tco.sg/aPaTZcEn4](http://tco.sg/aPaTZcEn4)。
- **直接優惠來源：** 名冊尚未記錄已評估的官網／官方社群優惠 track；這不表示店家沒有官網。
- **門店／場地來源：** 本次盤點資料尚未記錄可用的完整官方目錄／runtime provider；需補充，不能由 Google 搜尋直接宣稱全店參與。
- **待補／阻礙：** 尚無已保存的直接優惠來源評估（`no_captured_direct_source_assessment`）。

<a id="merchant-029"></a>

### 029 · Chinatown Tai Chong Kok

- **狀態：** 未完成直接優惠來源評估。
- **原始發現貼文（1 篇）：** [sgfooddeals/4920](https://t.me/sgfooddeals/4920)。
- **同篇原文外連（未逐店驗證關聯）：** [tco.sg/2iFIZirzm](https://tco.sg/2iFIZirzm)、[tco.sg/X1iavOqAD](https://tco.sg/X1iavOqAD)、[tco.sg/h2B1A4ia3](https://tco.sg/h2B1A4ia3)、[tco.sg/xEkGQpKMK](https://tco.sg/xEkGQpKMK)、[tco.sg/zZyWmtovq](https://tco.sg/zZyWmtovq)。
- **直接優惠來源：** 名冊尚未記錄已評估的官網／官方社群優惠 track；這不表示店家沒有官網。
- **門店／場地來源：** 本次盤點資料尚未記錄可用的完整官方目錄／runtime provider；需補充，不能由 Google 搜尋直接宣稱全店參與。
- **待補／阻礙：** 尚無已保存的直接優惠來源評估（`no_captured_direct_source_assessment`）。

<a id="merchant-030"></a>

### 030 · Chin Mee Chin

- **狀態：** 未完成直接優惠來源評估。
- **原始發現貼文（1 篇）：** [tastesoulsg/4425](https://t.me/tastesoulsg/4425)。
- **同篇原文外連（未逐店驗證關聯）：** [bit.ly/4wAlt54](http://bit.ly/4wAlt54)。
- **直接優惠來源：** 名冊尚未記錄已評估的官網／官方社群優惠 track；這不表示店家沒有官網。
- **門店／場地來源：** 本次盤點資料尚未記錄可用的完整官方目錄／runtime provider；需補充，不能由 Google 搜尋直接宣稱全店參與。
- **待補／阻礙：** 尚無已保存的直接優惠來源評估（`no_captured_direct_source_assessment`）。

<a id="merchant-031"></a>

### 031 · Chix Hot Chicken

- **狀態：** 未完成直接優惠來源評估。
- **原始發現貼文（1 篇）：** [sgfooddeals/4887](https://t.me/sgfooddeals/4887)。
- **同篇原文外連（未逐店驗證關聯）：** [tco.sg/wE3ilLhZ2](http://tco.sg/wE3ilLhZ2)。
- **直接優惠來源：** 名冊尚未記錄已評估的官網／官方社群優惠 track；這不表示店家沒有官網。
- **門店／場地來源：** 本次盤點資料尚未記錄可用的完整官方目錄／runtime provider；需補充，不能由 Google 搜尋直接宣稱全店參與。
- **待補／阻礙：** 尚無已保存的直接優惠來源評估（`no_captured_direct_source_assessment`）。

<a id="merchant-032"></a>

### 032 · Coffeehouse by Kobashi

- **狀態：** 未完成直接優惠來源評估。
- **原始發現貼文（1 篇）：** [tastesoulsg/4456](https://t.me/tastesoulsg/4456)。
- **同篇原文外連（未逐店驗證關聯）：** [bit.ly/4xvu4XH](http://bit.ly/4xvu4XH)。
- **直接優惠來源：** 名冊尚未記錄已評估的官網／官方社群優惠 track；這不表示店家沒有官網。
- **門店／場地來源：** 本次盤點資料尚未記錄可用的完整官方目錄／runtime provider；需補充，不能由 Google 搜尋直接宣稱全店參與。
- **待補／阻礙：** 尚無已保存的直接優惠來源評估（`no_captured_direct_source_assessment`）。

<a id="merchant-033"></a>

### 033 · Common Grill

- **狀態：** 未完成直接優惠來源評估。
- **原始發現貼文（1 篇）：** [sgfooddeals/4912](https://t.me/sgfooddeals/4912)。
- **同篇原文外連（未逐店驗證關聯）：** [tco.sg/lmm5hfaTJ](http://tco.sg/lmm5hfaTJ)、[t.me/myfoodpromos](https://t.me/myfoodpromos)、[t.me/mymakanmurah](https://t.me/mymakanmurah)、[t.me/renodealssg](https://t.me/renodealssg)。
- **直接優惠來源：** 名冊尚未記錄已評估的官網／官方社群優惠 track；這不表示店家沒有官網。
- **門店／場地來源：** 本次盤點資料尚未記錄可用的完整官方目錄／runtime provider；需補充，不能由 Google 搜尋直接宣稱全店參與。
- **待補／阻礙：** 尚無已保存的直接優惠來源評估（`no_captured_direct_source_assessment`）。

<a id="merchant-034"></a>

### 034 · CS Foods

- **狀態：** 已研究，目前有阻礙。
- **原始發現貼文（1 篇）：** [sgfooddeals/4946](https://t.me/sgfooddeals/4946)。
- **名冊記錄的營運方：** Chee Song Foods Pte Ltd。
- **同篇原文外連（未逐店驗證關聯）：** [tco.sg/dIHsvtuul](http://tco.sg/dIHsvtuul)、[tco.sg/72RL4qyLX](https://tco.sg/72RL4qyLX)、[tco.sg/CBMgBoBAp](https://tco.sg/CBMgBoBAp)、[tco.sg/OYFsyfJUy](https://tco.sg/OYFsyfJUy)、[tco.sg/T69K5lkSy](https://tco.sg/T69K5lkSy)、[tco.sg/fBqloU7bA](https://tco.sg/fBqloU7bA)、[tco.sg/riE5a0ZI3](https://tco.sg/riE5a0ZI3)。
- **同篇貼文已追蹤的候選目的地：** [csfoods.sg/shop/beef/marinated-beef/cubes/japanese-black-pepper-beef-cubes/](https://csfoods.sg/shop/beef/marinated-beef/cubes/japanese-black-pepper-beef-cubes/?utm_source=telegram&utm_medium=sep2026&utm_campaign=sgfooddeals)、[csfoods.sg/shop/beef/primary-cuts/umami-prime-beef-striploin/](https://csfoods.sg/shop/beef/primary-cuts/umami-prime-beef-striploin/?utm_source=telegram&utm_medium=sep2026&utm_campaign=sgfooddeals)、[csfoods.sg/shop/finger-food/meat/freezepak-chicken-nuggets/](https://csfoods.sg/shop/finger-food/meat/freezepak-chicken-nuggets/?utm_source=telegram&utm_medium=sep2026&utm_campaign=sgfooddeals)、[csfoods.sg/shop/finger-food/potato/mccain-original-shoestring-6-6-mm-fries/](https://csfoods.sg/shop/finger-food/potato/mccain-original-shoestring-6-6-mm-fries/?utm_source=telegram&utm_medium=sep2026&utm_campaign=sgfooddeals)、[csfoods.sg/shop/poultry/marinated-chicken-poultry/thigh-marinated-chicken-poultry/teriyaki-chic](https://csfoods.sg/shop/poultry/marinated-chicken-poultry/thigh-marinated-chicken-poultry/teriyaki-chicken-thigh/?utm_source=telegram&utm_medium=sep2026&utm_campaign=sgfooddeals)、[csfoods.sg/shop/ready-to-eat/ready-dishes/rendang-beef-ready-to-eat/](https://csfoods.sg/shop/ready-to-eat/ready-dishes/rendang-beef-ready-to-eat/?utm_source=telegram&utm_medium=sep2026&utm_campaign=sgfooddeals)、[csfoods.sg/unbeatable-halal-meat-sale/](https://csfoods.sg/unbeatable-halal-meat-sale/?utm_source=telegram&utm_medium=sep2026&utm_campaign=sgfooddeals)。目的地可被找到，不代表與這家店的關聯、歸屬、活動事實或目前可讀性已驗證。

| 類型／帳號 | 來源入口或已保存貼文                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | 歸屬       | 列舉狀態           | 接入狀態 |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ------------------ | -------- |
| 店家網站   | [csfoods.sg/shop/beef/marinated-beef/cubes/japanese-black-pepper-beef-cubes/](https://csfoods.sg/shop/beef/marinated-beef/cubes/japanese-black-pepper-beef-cubes/?utm_source=telegram&utm_medium=sep2026&utm_campaign=sgfooddeals)、[csfoods.sg/shop/beef/primary-cuts/umami-prime-beef-striploin/](https://csfoods.sg/shop/beef/primary-cuts/umami-prime-beef-striploin/?utm_source=telegram&utm_medium=sep2026&utm_campaign=sgfooddeals)、[csfoods.sg/shop/finger-food/meat/freezepak-chicken-nuggets/](https://csfoods.sg/shop/finger-food/meat/freezepak-chicken-nuggets/?utm_source=telegram&utm_medium=sep2026&utm_campaign=sgfooddeals)、[csfoods.sg/shop/finger-food/potato/mccain-original-shoestring-6-6-mm-fries/](https://csfoods.sg/shop/finger-food/potato/mccain-original-shoestring-6-6-mm-fries/?utm_source=telegram&utm_medium=sep2026&utm_campaign=sgfooddeals)、[csfoods.sg/shop/poultry/marinated-chicken-poultry/thigh-marinated-chicken-poultry/teriyaki-chic](https://csfoods.sg/shop/poultry/marinated-chicken-poultry/thigh-marinated-chicken-poultry/teriyaki-chicken-thigh/?utm_source=telegram&utm_medium=sep2026&utm_campaign=sgfooddeals)、[csfoods.sg/shop/ready-to-eat/ready-dishes/rendang-beef-ready-to-eat/](https://csfoods.sg/shop/ready-to-eat/ready-dishes/rendang-beef-ready-to-eat/?utm_source=telegram&utm_medium=sep2026&utm_campaign=sgfooddeals)、[csfoods.sg/unbeatable-halal-meat-sale/](https://csfoods.sg/unbeatable-halal-meat-sale/?utm_source=telegram&utm_medium=sep2026&utm_campaign=sgfooddeals) | 已驗證歸屬 | 部分，完整性未成立 | 有阻礙   |

- **門店／場地來源：** 本次盤點資料尚未記錄可用的完整官方目錄／runtime provider；需補充，不能由 Google 搜尋直接宣稱全店參與。
- **待補／阻礙：** 公開擷取受阻（`access_blocked`）；活動有效日期無法取得（`campaign_validity_unavailable`）；特價商品目錄無法代表完整活動列舉（`sale_catalogue_not_complete_campaign_enumeration`）。
- **專案查證紀錄：** [docs/changes/direct-source-batch-1/research.md](</Users/louis/Documents/Projects/vibe coding/PromotionAroundYou/docs/changes/direct-source-batch-1/research.md>)。

<a id="merchant-035"></a>

### 035 · Dancing Crab

- **狀態：** 未完成直接優惠來源評估。
- **原始發現貼文（1 篇）：** [tastesoulsg/4470](https://t.me/tastesoulsg/4470)。
- **同篇原文外連（未逐店驗證關聯）：** [bit.ly/3VfYYFi](http://bit.ly/3VfYYFi)。
- **直接優惠來源：** 名冊尚未記錄已評估的官網／官方社群優惠 track；這不表示店家沒有官網。
- **門店／場地來源：** 本次盤點資料尚未記錄可用的完整官方目錄／runtime provider；需補充，不能由 Google 搜尋直接宣稱全店參與。
- **待補／阻礙：** 尚無已保存的直接優惠來源評估（`no_captured_direct_source_assessment`）。

<a id="merchant-036"></a>

### 036 · Daya Izakaya

- **狀態：** 未完成直接優惠來源評估。
- **原始發現貼文（1 篇）：** [sgfooddeals/4885](https://t.me/sgfooddeals/4885)。
- **同篇原文外連（未逐店驗證關聯）：** [tco.sg/e0MqMxNI2](http://tco.sg/e0MqMxNI2)、[tco.sg/lSAXSCQlj](http://tco.sg/lSAXSCQlj)。
- **直接優惠來源：** 名冊尚未記錄已評估的官網／官方社群優惠 track；這不表示店家沒有官網。
- **門店／場地來源：** 本次盤點資料尚未記錄可用的完整官方目錄／runtime provider；需補充，不能由 Google 搜尋直接宣稱全店參與。
- **待補／阻礙：** 尚無已保存的直接優惠來源評估（`no_captured_direct_source_assessment`）。

<a id="merchant-037"></a>

### 037 · D'Cuisine

- **狀態：** 來源候選，尚未完成資格驗證。
- **原始發現貼文（1 篇）：** [sgfooddeals/4955](https://t.me/sgfooddeals/4955)。
- **同篇原文外連（未逐店驗證關聯）：** [tco.sg/EQTgZ0Z1m](http://tco.sg/EQTgZ0Z1m)。
- **同篇貼文已追蹤的候選目的地：** [www.tiktok.com/@dcuisines.restaurant/photo/7676695985245981960](https://www.tiktok.com/@dcuisines.restaurant/photo/7676695985245981960?is_from_webapp=1&sender_device=pc&utm_source=telegram&utm_medium=sep2026&utm_campaign=sgfooddeals)。目的地可被找到，不代表與這家店的關聯、歸屬、活動事實或目前可讀性已驗證。

| 類型／帳號                               | 來源入口或已保存貼文                                                                                                                                                                                                                       | 歸屬       | 列舉狀態 | 接入狀態 |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------- | -------- | -------- |
| 店家社群 · tiktok · dcuisines.restaurant | [www.tiktok.com/@dcuisines.restaurant/photo/7676695985245981960](https://www.tiktok.com/@dcuisines.restaurant/photo/7676695985245981960?is_from_webapp=1&sender_device=pc&utm_source=telegram&utm_medium=sep2026&utm_campaign=sgfooddeals) | 未驗證歸屬 | 未評估   | 候選     |

- **門店／場地來源：** 本次盤點資料尚未記錄可用的完整官方目錄／runtime provider；需補充，不能由 Google 搜尋直接宣稱全店參與。
- **待補／阻礙：** 來源歸屬未驗證（`ownership_unverified`）。

<a id="merchant-038"></a>

### 038 · Dian Xiao Er

- **狀態：** 已有 adapter，仍停用／研究預覽。
- **原始發現貼文（2 篇）：** [sgfooddeals/4940](https://t.me/sgfooddeals/4940)、[tastesoulsg/4479](https://t.me/tastesoulsg/4479)。
- **名冊記錄的營運方：** Dian Xiao Er (legal operator not independently established)。
- **同篇原文外連（未逐店驗證關聯）：** [bit.ly/4ykZJes](http://bit.ly/4ykZJes)、[tco.sg/PBcgXrqA2](http://tco.sg/PBcgXrqA2)、[tco.sg/5vXdQ0mXj](https://tco.sg/5vXdQ0mXj)、[tco.sg/8zCH6BE3j](https://tco.sg/8zCH6BE3j)、[tco.sg/V6ViWP149](https://tco.sg/V6ViWP149)、[tco.sg/gBzs5A1yo](https://tco.sg/gBzs5A1yo)、[tco.sg/q81wOC8Ep](https://tco.sg/q81wOC8Ep)、[tco.sg/yUxhAaOdw](https://tco.sg/yUxhAaOdw)。
- **同篇貼文已追蹤的候選目的地：** [t.me/sgstudentpromos/1868](https://t.me/sgstudentpromos/1868?utm_source=telegram&utm_medium=sep2026&utm_campaign=sgfooddeals)、[www.dianxiaoer.com.sg/promo](https://www.dianxiaoer.com.sg/promo?lightbox=dataItem-msxym06a&utm_source=telegram&utm_medium=sep2026&utm_campaign=sgfooddeals)、[www.instagram.com/p/Dc-kxPJzx9B/](https://www.instagram.com/p/Dc-kxPJzx9B/?utm_source=telegram&utm_medium=sep2026&utm_campaign=sgfooddeals)、[www.instagram.com/p/DclNIIIj1Xk/](https://www.instagram.com/p/DclNIIIj1Xk/?utm_source=telegram&utm_medium=sep2026&utm_campaign=sgfooddeals)、[www.instagram.com/p/DctAeflziKI/](https://www.instagram.com/p/DctAeflziKI/?utm_source=telegram&utm_medium=sep2026&utm_campaign=sgfooddeals)、[www.pepperlunch.com.sg/promo/uper-value-deal/](https://www.pepperlunch.com.sg/promo/uper-value-deal/?utm_source=telegram&utm_medium=sep2026&utm_campaign=sgfooddeals)。目的地可被找到，不代表與這家店的關聯、歸屬、活動事實或目前可讀性已驗證。

| 類型／帳號 | 來源入口或已保存貼文                                               | 歸屬                   | 列舉狀態           | 接入狀態       |
| ---------- | ------------------------------------------------------------------ | ---------------------- | ------------------ | -------------- |
| 店家網站   | [www.dianxiaoer.com.sg/promo](https://www.dianxiaoer.com.sg/promo) | 可能歸屬，尚未充分驗證 | 部分，完整性未成立 | 停用／研究預覽 |

- **歸屬／身份查證的已記錄網頁：** [www.dianxiaoer.com.sg/](https://www.dianxiaoer.com.sg/)、[www.dianxiaoer.com.sg/membership](https://www.dianxiaoer.com.sg/membership)。查證結論以來源表及既有 review 為準；保留未驗證候選。
- **門店／場地來源：** 本次盤點資料尚未記錄可用的完整官方目錄／runtime provider；需補充，不能由 Google 搜尋直接宣稱全店參與。
- **待補／阻礙：** 活動必要事實只在圖片內（`image_only_campaign_facts`）；圖片 lightbox 與活動對應未解（`lightbox_mapping_unresolved`）；來源歸屬未驗證（`ownership_unverified`）；來源列舉不完整（`partial_enumeration`）。
- **專案查證紀錄：** [docs/changes/direct-source-batch-1/research.md](</Users/louis/Documents/Projects/vibe coding/PromotionAroundYou/docs/changes/direct-source-batch-1/research.md>)。

<a id="merchant-039"></a>

### 039 · Dill

- **狀態：** 未完成直接優惠來源評估。
- **原始發現貼文（1 篇）：** [tastesoulsg/4473](https://t.me/tastesoulsg/4473)。
- **同篇原文外連（未逐店驗證關聯）：** [bit.ly/3TgezUQ](http://bit.ly/3TgezUQ)。
- **直接優惠來源：** 名冊尚未記錄已評估的官網／官方社群優惠 track；這不表示店家沒有官網。
- **門店／場地來源：** 本次盤點資料尚未記錄可用的完整官方目錄／runtime provider；需補充，不能由 Google 搜尋直接宣稱全店參與。
- **待補／阻礙：** 尚無已保存的直接優惠來源評估（`no_captured_direct_source_assessment`）。

<a id="merchant-040"></a>

### 040 · Din Tai Fung

- **狀態：** 未完成直接優惠來源評估。
- **原始發現貼文（1 篇）：** [tastesoulsg/4454](https://t.me/tastesoulsg/4454)。
- **同篇原文外連（未逐店驗證關聯）：** [bit.ly/46w4w0R](http://bit.ly/46w4w0R)。
- **直接優惠來源：** 名冊尚未記錄已評估的官網／官方社群優惠 track；這不表示店家沒有官網。
- **門店／場地來源：** 本次盤點資料尚未記錄可用的完整官方目錄／runtime provider；需補充，不能由 Google 搜尋直接宣稱全店參與。
- **待補／阻礙：** 尚無已保存的直接優惠來源評估（`no_captured_direct_source_assessment`）。

<a id="merchant-041"></a>

### 041 · Domino’s

- **狀態：** 未完成直接優惠來源評估。
- **原始發現貼文（1 篇）：** [tastesoulsg/4441](https://t.me/tastesoulsg/4441)。
- **同篇原文外連（未逐店驗證關聯）：** [bit.ly/4xjd6vB](http://bit.ly/4xjd6vB)。
- **直接優惠來源：** 名冊尚未記錄已評估的官網／官方社群優惠 track；這不表示店家沒有官網。
- **門店／場地來源：** 本次盤點資料尚未記錄可用的完整官方目錄／runtime provider；需補充，不能由 Google 搜尋直接宣稱全店參與。
- **待補／阻礙：** 尚無已保存的直接優惠來源評估（`no_captured_direct_source_assessment`）。

<a id="merchant-042"></a>

### 042 · dorra Slimming

- **狀態：** 未完成直接優惠來源評估。
- **原始發現貼文（1 篇）：** [tastesoulsg/4450](https://t.me/tastesoulsg/4450)。
- **同篇原文外連（未逐店驗證關聯）：** [bit.ly/4csSZTF](http://bit.ly/4csSZTF)。
- **直接優惠來源：** 名冊尚未記錄已評估的官網／官方社群優惠 track；這不表示店家沒有官網。
- **門店／場地來源：** 本次盤點資料尚未記錄可用的完整官方目錄／runtime provider；需補充，不能由 Google 搜尋直接宣稱全店參與。
- **待補／阻礙：** 尚無已保存的直接優惠來源評估（`no_captured_direct_source_assessment`）。

<a id="merchant-043"></a>

### 043 · Estiatorio Milos

- **狀態：** 未完成直接優惠來源評估。
- **原始發現貼文（1 篇）：** [tastesoulsg/4476](https://t.me/tastesoulsg/4476)。
- **同篇原文外連（未逐店驗證關聯）：** [bit.ly/4yrXWV8](http://bit.ly/4yrXWV8)。
- **直接優惠來源：** 名冊尚未記錄已評估的官網／官方社群優惠 track；這不表示店家沒有官網。
- **門店／場地來源：** 本次盤點資料尚未記錄可用的完整官方目錄／runtime provider；需補充，不能由 Google 搜尋直接宣稱全店參與。
- **待補／阻礙：** 尚無已保存的直接優惠來源評估（`no_captured_direct_source_assessment`）。

<a id="merchant-044"></a>

### 044 · FairPrice

- **狀態：** 已有 adapter，仍停用／研究預覽。
- **原始發現貼文（1 篇）：** [sgfooddeals/4938](https://t.me/sgfooddeals/4938)。
- **名冊記錄的營運方：** NTUC FairPrice Co-operative Limited。
- **同篇原文外連（未逐店驗證關聯）：** [tco.sg/fruitreexsgfd](http://tco.sg/fruitreexsgfd)。
- **同篇貼文已追蹤的候選目的地：** [www.fairprice.com.sg/product/13137742](https://www.fairprice.com.sg/product/13137742?utm_source=telegram&utm_medium=sep2026&utm_campaign=sgfooddeals)。目的地可被找到，不代表與這家店的關聯、歸屬、活動事實或目前可讀性已驗證。

| 類型／帳號 | 來源入口或已保存貼文                                                                     | 歸屬       | 列舉狀態           | 接入狀態       |
| ---------- | ---------------------------------------------------------------------------------------- | ---------- | ------------------ | -------------- |
| 店家網站   | [www.fairprice.com.sg/weekly-promotions](https://www.fairprice.com.sg/weekly-promotions) | 已驗證歸屬 | 部分，完整性未成立 | 停用／研究預覽 |

- **歸屬／身份查證的已記錄網頁：** [help.fairprice.com.sg/hc/en-us/articles/360025882372-Terms-Conditions](https://help.fairprice.com.sg/hc/en-us/articles/360025882372-Terms-Conditions)。查證結論以來源表及既有 review 為準；保留未驗證候選。
- **門店／場地來源：** 本次盤點資料尚未記錄可用的完整官方目錄／runtime provider；需補充，不能由 Google 搜尋直接宣稱全店參與。
- **待補／阻礙：** 商品明細活動事實無法取得（`catalogue_detail_facts_unavailable`）；商品集合完整性未確認（`catalogue_product_set_unresolved`）；來源列舉不完整（`partial_enumeration`）；實體參與門店未確認（`physical_participation_unresolved`）。
- **專案查證紀錄：** [docs/changes/direct-source-batch-1/research.md](</Users/louis/Documents/Projects/vibe coding/PromotionAroundYou/docs/changes/direct-source-batch-1/research.md>)。

<a id="merchant-045"></a>

### 045 · FAME by Dad's Corner

- **狀態：** 未完成直接優惠來源評估。
- **原始發現貼文（2 篇）：** [sgfooddeals/4894](https://t.me/sgfooddeals/4894)、[sgfooddeals/4928](https://t.me/sgfooddeals/4928)。
- **名冊保留的原始名稱：** FAME by Dad's Corner、Fame by Dads Corner。
- **同篇原文外連（未逐店驗證關聯）：** [tco.sg/7RSwAhjRO](https://tco.sg/7RSwAhjRO)、[tco.sg/91D7DJD8G](https://tco.sg/91D7DJD8G)、[tco.sg/TXH4bNk4I](https://tco.sg/TXH4bNk4I)、[tco.sg/cNTDw7QBF](https://tco.sg/cNTDw7QBF)、[tco.sg/uMf2SHTNQ](https://tco.sg/uMf2SHTNQ)、[tco.sg/uYNyopLz1](https://tco.sg/uYNyopLz1)。
- **直接優惠來源：** 名冊尚未記錄已評估的官網／官方社群優惠 track；這不表示店家沒有官網。
- **門店／場地來源：** 本次盤點資料尚未記錄可用的完整官方目錄／runtime provider；需補充，不能由 Google 搜尋直接宣稱全店參與。
- **待補／阻礙：** 尚無已保存的直接優惠來源評估（`no_captured_direct_source_assessment`）。

<a id="merchant-046"></a>

### 046 · Family Mookata

- **狀態：** 未完成直接優惠來源評估。
- **原始發現貼文（1 篇）：** [sgfooddeals/4882](https://t.me/sgfooddeals/4882)。
- **同篇原文外連（未逐店驗證關聯）：** [tco.sg/7103UMnKz](https://tco.sg/7103UMnKz)、[tco.sg/97OSlurTa](https://tco.sg/97OSlurTa)、[tco.sg/bpaapFAMo](https://tco.sg/bpaapFAMo)、[tco.sg/fDd6T5Bvo](https://tco.sg/fDd6T5Bvo)、[tco.sg/n1DPyldXG](https://tco.sg/n1DPyldXG)。
- **直接優惠來源：** 名冊尚未記錄已評估的官網／官方社群優惠 track；這不表示店家沒有官網。
- **門店／場地來源：** 本次盤點資料尚未記錄可用的完整官方目錄／runtime provider；需補充，不能由 Google 搜尋直接宣稱全店參與。
- **待補／阻礙：** 尚無已保存的直接優惠來源評估（`no_captured_direct_source_assessment`）。

<a id="merchant-047"></a>

### 047 · Fangko House

- **狀態：** 未完成直接優惠來源評估。
- **原始發現貼文（1 篇）：** [tastesoulsg/4455](https://t.me/tastesoulsg/4455)。
- **同篇原文外連（未逐店驗證關聯）：** [bit.ly/4gsv7ll](http://bit.ly/4gsv7ll)。
- **直接優惠來源：** 名冊尚未記錄已評估的官網／官方社群優惠 track；這不表示店家沒有官網。
- **門店／場地來源：** 本次盤點資料尚未記錄可用的完整官方目錄／runtime provider；需補充，不能由 Google 搜尋直接宣稱全店參與。
- **待補／阻礙：** 尚無已保存的直接優惠來源評估（`no_captured_direct_source_assessment`）。

<a id="merchant-048"></a>

### 048 · foodpanda

- **狀態：** 未完成直接優惠來源評估。
- **原始發現貼文（1 篇）：** [sgfooddeals/4915](https://t.me/sgfooddeals/4915)。
- **同篇原文外連（未逐店驗證關聯）：** [tco.sg/iyavqV2Yp](http://tco.sg/iyavqV2Yp)、[tco.sg/wLGghSyXz](http://tco.sg/wLGghSyXz)。
- **直接優惠來源：** 名冊尚未記錄已評估的官網／官方社群優惠 track；這不表示店家沒有官網。
- **門店／場地來源：** 本次盤點資料尚未記錄可用的完整官方目錄／runtime provider；需補充，不能由 Google 搜尋直接宣稱全店參與。
- **待補／阻礙：** 尚無已保存的直接優惠來源評估（`no_captured_direct_source_assessment`）。

<a id="merchant-049"></a>

### 049 · Gelare

- **狀態：** 已研究，目前有阻礙。
- **原始發現貼文（1 篇）：** [sgfooddeals/4904](https://t.me/sgfooddeals/4904)。
- **名冊記錄的營運方：** Gelare Singapore (local legal operator unverified)。
- **同篇原文外連（未逐店驗證關聯）：** [tco.sg/aBuXbktKy](http://tco.sg/aBuXbktKy)。

| 類型／帳號                      | 來源入口或已保存貼文                                                                                                                                                                                                                                                   | 歸屬       | 列舉狀態   | 接入狀態 |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ---------- | -------- |
| 店家社群 · instagram · gelaresg | [www.instagram.com/gelaresg/](https://www.instagram.com/gelaresg/)                                                                                                                                                                                                     | 已驗證歸屬 | 有阻礙     | 有阻礙   |
| 店家網站                        | [www.gelare.com.sg/](https://www.gelare.com.sg/)、[www.gelare.com.sg/contact-us/](https://www.gelare.com.sg/contact-us/)、[www.gelare.com.sg/our-story/](https://www.gelare.com.sg/our-story/)、[www.gelare.com.sg/promotions/](https://www.gelare.com.sg/promotions/) | 已驗證歸屬 | 可見圖片集 | 有阻礙   |

- **instagram 帳號入口：** [gelaresg](https://www.instagram.com/gelaresg/)；已驗證歸屬。帳號與每篇貼文對應、feed 完整性另外驗證。
- **歸屬／身份查證的已記錄網頁：** [www.gelare.com.sg/](https://www.gelare.com.sg/)。查證結論以來源表及既有 review 為準；保留未驗證候選。
- **門店／場地來源：** [www.gelare.com.sg/contact-us/](https://www.gelare.com.sg/contact-us/)。有官方聯絡／位置頁；完整門店列舉未證明。
- **待補／阻礙：** 既有研究未建立重複自動存取條件（`automated_access_permission_unestablished`）；有限範圍內的 feed 完整邊界未證明（`bounded_feed_boundary_unproven`）；活動必要事實只在圖片內（`image_only_campaign_facts`）；圖片集標題無法對應活動事實（`opaque_gallery_titles`）；貼文與帳號的對應未證明（`post_account_association_unproven`）；尚無可用的可靠文字擷取方式（`safe_textual_acquisition_unavailable`）；後續載入／分頁未知（`unknown_continuation`）。

<a id="merchant-050"></a>

### 050 · Genki Sushi

- **狀態：** 未完成直接優惠來源評估。
- **原始發現貼文（1 篇）：** [tastesoulsg/4457](https://t.me/tastesoulsg/4457)。
- **同篇原文外連（未逐店驗證關聯）：** [bit.ly/4cmgQEo](http://bit.ly/4cmgQEo)。
- **直接優惠來源：** 名冊尚未記錄已評估的官網／官方社群優惠 track；這不表示店家沒有官網。
- **門店／場地來源：** [www.genkisushi.com.sg/locate-us/](https://www.genkisushi.com.sg/locate-us/)。已實作官方門店 provider；直接優惠來源仍未 onboarding。
- **待補／阻礙：** 尚無已保存的直接優惠來源評估（`no_captured_direct_source_assessment`）。

<a id="merchant-051"></a>

### 051 · Good Combo Hotpot & BBQ

- **狀態：** 未完成直接優惠來源評估。
- **原始發現貼文（1 篇）：** [sgfooddeals/4882](https://t.me/sgfooddeals/4882)。
- **同篇原文外連（未逐店驗證關聯）：** [tco.sg/7103UMnKz](https://tco.sg/7103UMnKz)、[tco.sg/97OSlurTa](https://tco.sg/97OSlurTa)、[tco.sg/bpaapFAMo](https://tco.sg/bpaapFAMo)、[tco.sg/fDd6T5Bvo](https://tco.sg/fDd6T5Bvo)、[tco.sg/n1DPyldXG](https://tco.sg/n1DPyldXG)。
- **直接優惠來源：** 名冊尚未記錄已評估的官網／官方社群優惠 track；這不表示店家沒有官網。
- **門店／場地來源：** 本次盤點資料尚未記錄可用的完整官方目錄／runtime provider；需補充，不能由 Google 搜尋直接宣稱全店參與。
- **待補／阻礙：** 尚無已保存的直接優惠來源評估（`no_captured_direct_source_assessment`）。

<a id="merchant-052"></a>

### 052 · Gourmet Carousel

- **狀態：** 已有 adapter，仍停用／研究預覽。
- **原始發現貼文（1 篇）：** [sgfooddeals/4957](https://t.me/sgfooddeals/4957)。
- **名冊記錄的營運方：** Royal Plaza on Scotts。
- **同篇原文外連（未逐店驗證關聯）：** [tco.sg/DhTFq7kx0](https://tco.sg/DhTFq7kx0)、[tco.sg/Odx5twUF8](https://tco.sg/Odx5twUF8)、[tco.sg/XqDA5nOOx](https://tco.sg/XqDA5nOOx)、[tco.sg/u2SWkdIty](https://tco.sg/u2SWkdIty)。
- **同篇貼文已追蹤的候選目的地：** [www.facebook.com/share/p/1C5yPtNv4u/](https://www.facebook.com/share/p/1C5yPtNv4u/?utm_source=telegram&utm_medium=sep2026&utm_campaign=sgfooddeals)、[www.instagram.com/p/Dd0AjG3E06V/](https://www.instagram.com/p/Dd0AjG3E06V/?utm_source=telegram&utm_medium=sep2026&utm_campaign=sgfooddeals)、[www.instagram.com/p/Dd5Grf1CMnZ/](https://www.instagram.com/p/Dd5Grf1CMnZ/?utm_source=telegram&utm_medium=sep2026&utm_campaign=sgfooddeals)、[www.royalplaza.com.sg/dine/barista](https://www.royalplaza.com.sg/dine/barista?utm_source=telegram&utm_medium=sep2026&utm_campaign=sgfooddeals)。目的地可被找到，不代表與這家店的關聯、歸屬、活動事實或目前可讀性已驗證。

| 類型／帳號 | 來源入口或已保存貼文                                                                                                                                             | 歸屬       | 列舉狀態           | 接入狀態       |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ------------------ | -------------- |
| 店家網站   | [www.royalplaza.com.sg/dine/barista](https://www.royalplaza.com.sg/dine/barista)、[www.royalplaza.com.sg/dine/offers](https://www.royalplaza.com.sg/dine/offers) | 已驗證歸屬 | 部分，完整性未成立 | 停用／研究預覽 |

- **歸屬／身份查證的已記錄網頁：** [www.royalplaza.com.sg/dine/barista](https://www.royalplaza.com.sg/dine/barista)、[www.royalplaza.com.sg/policies/privacy-policy](https://www.royalplaza.com.sg/policies/privacy-policy)。查證結論以來源表及既有 review 為準；保留未驗證候選。
- **門店／場地來源：** [www.royalplaza.com.sg/dine/barista](https://www.royalplaza.com.sg/dine/barista)。已實作單一場地 provider；不代表完整飯店餐飲活動。
- **待補／阻礙：** 服務頁活動完整邊界未證明（`gourmet_service_boundary_unproven`）；來源列舉不完整（`partial_enumeration`）；部分服務頁活動未列於優惠索引（`service_page_campaign_outside_listing`）。
- **專案查證紀錄：** [docs/changes/gourmet-carousel-direct-source/verification.md](</Users/louis/Documents/Projects/vibe coding/PromotionAroundYou/docs/changes/gourmet-carousel-direct-source/verification.md>)。

<a id="merchant-053"></a>

### 053 · Grab

- **狀態：** 來源候選，尚未完成資格驗證。
- **原始發現貼文（1 篇）：** [sgfooddeals/4936](https://t.me/sgfooddeals/4936)。
- **同篇原文外連（未逐店驗證關聯）：** [tco.sg/salebrationxsgfd](http://tco.sg/salebrationxsgfd)。
- **同篇貼文已追蹤的候選目的地：** [www.grab.com/sg/grab-salebration/](https://www.grab.com/sg/grab-salebration/?pid=EDM&c=SG_NA_PAX_GF_AW-CONV_LOC__MegaSale-GF_NA_MegaSale-GF&is_retargeting=true&af_dp=grab%3A%2F%2Fopen%3FscreenType%3DGRABFOOD%26campaignLandingID%3D17424%26headerColor%3D0B54A8%26headerSize%3Dmedium&af_force_deeplink=true&af_sub5=edm&af_ad=MegaSale-GF)。目的地可被找到，不代表與這家店的關聯、歸屬、活動事實或目前可讀性已驗證。

| 類型／帳號   | 來源入口或已保存貼文                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | 歸屬       | 列舉狀態           | 接入狀態 |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ------------------ | -------- |
| 發行商／平台 | [www.grab.com/sg/full-house-mission/](https://www.grab.com/sg/full-house-mission/?af_force_deeplink=true&af_ad=ESGJalanBesar-SGFoodDeals&c=SG_NA_PAX_GF_AW-CONV_LOC__DineOut_NA_ESGJalanBesar-SGFoodDeals&pid=telegram-organic&is_retargeting=true&deep_link_value=grab%3A%2F%2Fopen%3FscreenType%3DSANDBOX%26sandboxDeepLinkUrl%3Dpages%2FDPG-9134db80-a1bc-11f1-a14f-7765dba32ff2%26sourceID%3Dtele_organic%26sourceCampaignName%3DESG-JB&af_sub5=social-paid&af_dp=grab%3A%2F%2Fopen%3FscreenType%3DSANDBOX%26sandboxDeepLinkUrl%3Dpages%2FDPG-9134db80-a1bc-11f1-a14f-7765dba32ff2%26sourceID%3Dtele_organic%26sourceCampaignName%3DESG-JB) | 已驗證歸屬 | 無已證明的列舉入口 | 候選     |

- **門店／場地來源：** 本次盤點資料尚未記錄可用的完整官方目錄／runtime provider；需補充，不能由 Google 搜尋直接宣稱全店參與。
- **待補／阻礙：** Distinct deal sections have different terms/validity; no merged universal offer；Participating outlet details remain app-dependent；Stable sandbox campaign path from chain is not an enumeration endpoint。

<a id="merchant-054"></a>

### 054 · GrabFood

- **狀態：** 未完成直接優惠來源評估。
- **原始發現貼文（1 篇）：** [sgfooddeals/4915](https://t.me/sgfooddeals/4915)。
- **同篇原文外連（未逐店驗證關聯）：** [tco.sg/iyavqV2Yp](http://tco.sg/iyavqV2Yp)、[tco.sg/wLGghSyXz](http://tco.sg/wLGghSyXz)。
- **直接優惠來源：** 名冊尚未記錄已評估的官網／官方社群優惠 track；這不表示店家沒有官網。
- **門店／場地來源：** 本次盤點資料尚未記錄可用的完整官方目錄／runtime provider；需補充，不能由 Google 搜尋直接宣稱全店參與。
- **待補／阻礙：** 尚無已保存的直接優惠來源評估（`no_captured_direct_source_assessment`）。

<a id="merchant-055"></a>

### 055 · Guzman y Gomez

- **狀態：** 未完成直接優惠來源評估。
- **原始發現貼文（3 篇）：** [tastesoulsg/4459](https://t.me/tastesoulsg/4459)、[tastesoulsg/4487](https://t.me/tastesoulsg/4487)、[tastesoulsg/4503](https://t.me/tastesoulsg/4503)。
- **同篇原文外連（未逐店驗證關聯）：** [bit.ly/4Ax6OuE](http://bit.ly/4Ax6OuE)、[bit.ly/4cT7aBo](http://bit.ly/4cT7aBo)、[bit.ly/4dEzOGJ](http://bit.ly/4dEzOGJ)。
- **直接優惠來源：** 名冊尚未記錄已評估的官網／官方社群優惠 track；這不表示店家沒有官網。
- **門店／場地來源：** 本次盤點資料尚未記錄可用的完整官方目錄／runtime provider；需補充，不能由 Google 搜尋直接宣稱全店參與。
- **待補／阻礙：** 尚無已保存的直接優惠來源評估（`no_captured_direct_source_assessment`）。

<a id="merchant-056"></a>

### 056 · Gwanghwamun Mijin

- **狀態：** 未完成直接優惠來源評估。
- **原始發現貼文（2 篇）：** [sgfooddeals/4897](https://t.me/sgfooddeals/4897)、[tastesoulsg/4435](https://t.me/tastesoulsg/4435)。
- **同篇原文外連（未逐店驗證關聯）：** [bit.ly/4zuOfqm](http://bit.ly/4zuOfqm)、[tco.sg/z7VpRqKif](http://tco.sg/z7VpRqKif)。
- **直接優惠來源：** 名冊尚未記錄已評估的官網／官方社群優惠 track；這不表示店家沒有官網。
- **門店／場地來源：** 本次盤點資料尚未記錄可用的完整官方目錄／runtime provider；需補充，不能由 Google 搜尋直接宣稱全店參與。
- **待補／阻礙：** 尚無已保存的直接優惠來源評估（`no_captured_direct_source_assessment`）。

<a id="merchant-057"></a>

### 057 · Happy Lamb

- **狀態：** 未完成直接優惠來源評估。
- **原始發現貼文（1 篇）：** [sgfooddeals/4928](https://t.me/sgfooddeals/4928)。
- **同篇原文外連（未逐店驗證關聯）：** [tco.sg/7RSwAhjRO](https://tco.sg/7RSwAhjRO)、[tco.sg/91D7DJD8G](https://tco.sg/91D7DJD8G)、[tco.sg/TXH4bNk4I](https://tco.sg/TXH4bNk4I)、[tco.sg/uMf2SHTNQ](https://tco.sg/uMf2SHTNQ)、[tco.sg/uYNyopLz1](https://tco.sg/uYNyopLz1)。
- **直接優惠來源：** 名冊尚未記錄已評估的官網／官方社群優惠 track；這不表示店家沒有官網。
- **門店／場地來源：** 本次盤點資料尚未記錄可用的完整官方目錄／runtime provider；需補充，不能由 Google 搜尋直接宣稱全店參與。
- **待補／阻礙：** 尚無已保存的直接優惠來源評估（`no_captured_direct_source_assessment`）。

<a id="merchant-058"></a>

### 058 · Hello Arigato

- **狀態：** 未完成直接優惠來源評估。
- **原始發現貼文（1 篇）：** [sgfooddeals/4906](https://t.me/sgfooddeals/4906)。
- **同篇原文外連（未逐店驗證關聯）：** [tco.sg/MGKspPYqz](http://tco.sg/MGKspPYqz)、[tco.sg/y7NCCjemu](https://tco.sg/y7NCCjemu)。
- **直接優惠來源：** 名冊尚未記錄已評估的官網／官方社群優惠 track；這不表示店家沒有官網。
- **門店／場地來源：** 本次盤點資料尚未記錄可用的完整官方目錄／runtime provider；需補充，不能由 Google 搜尋直接宣稱全店參與。
- **待補／阻礙：** 尚無已保存的直接優惠來源評估（`no_captured_direct_source_assessment`）。

<a id="merchant-059"></a>

### 059 · Hokkaido Baked Cheese Tart

- **狀態：** 未完成直接優惠來源評估。
- **原始發現貼文（1 篇）：** [tastesoulsg/4453](https://t.me/tastesoulsg/4453)。
- **同篇原文外連（未逐店驗證關聯）：** [bit.ly/4zR7Jpq](http://bit.ly/4zR7Jpq)。
- **直接優惠來源：** 名冊尚未記錄已評估的官網／官方社群優惠 track；這不表示店家沒有官網。
- **門店／場地來源：** 本次盤點資料尚未記錄可用的完整官方目錄／runtime provider；需補充，不能由 Google 搜尋直接宣稱全店參與。
- **待補／阻礙：** 尚無已保存的直接優惠來源評估（`no_captured_direct_source_assessment`）。

<a id="merchant-060"></a>

### 060 · IKEA

- **狀態：** 未完成直接優惠來源評估。
- **原始發現貼文（1 篇）：** [tastesoulsg/4430](https://t.me/tastesoulsg/4430)。
- **同篇原文外連（未逐店驗證關聯）：** [bit.ly/3U9idzU](http://bit.ly/3U9idzU)。
- **直接優惠來源：** 名冊尚未記錄已評估的官網／官方社群優惠 track；這不表示店家沒有官網。
- **門店／場地來源：** 本次盤點資料尚未記錄可用的完整官方目錄／runtime provider；需補充，不能由 Google 搜尋直接宣稱全店參與。
- **待補／阻礙：** 尚無已保存的直接優惠來源評估（`no_captured_direct_source_assessment`）。

<a id="merchant-061"></a>

### 061 · I’m donut

- **狀態：** 未完成直接優惠來源評估。
- **原始發現貼文（1 篇）：** [tastesoulsg/4515](https://t.me/tastesoulsg/4515)。
- **同篇原文外連（未逐店驗證關聯）：** [bit.ly/4juFkzv](http://bit.ly/4juFkzv)。
- **直接優惠來源：** 名冊尚未記錄已評估的官網／官方社群優惠 track；這不表示店家沒有官網。
- **門店／場地來源：** 本次盤點資料尚未記錄可用的完整官方目錄／runtime provider；需補充，不能由 Google 搜尋直接宣稱全店參與。
- **待補／阻礙：** 尚無已保存的直接優惠來源評估（`no_captured_direct_source_assessment`）。

<a id="merchant-062"></a>

### 062 · Jack’s Place

- **狀態：** 未完成直接優惠來源評估。
- **原始發現貼文（1 篇）：** [tastesoulsg/4426](https://t.me/tastesoulsg/4426)。
- **同篇原文外連（未逐店驗證關聯）：** [bit.ly/4zpJFcT](http://bit.ly/4zpJFcT)。
- **直接優惠來源：** 名冊尚未記錄已評估的官網／官方社群優惠 track；這不表示店家沒有官網。
- **門店／場地來源：** 本次盤點資料尚未記錄可用的完整官方目錄／runtime provider；需補充，不能由 Google 搜尋直接宣稱全店參與。
- **待補／阻礙：** 尚無已保存的直接優惠來源評估（`no_captured_direct_source_assessment`）。

<a id="merchant-063"></a>

### 063 · JEN Shangri-La

- **狀態：** 未完成直接優惠來源評估。
- **原始發現貼文（1 篇）：** [sgfooddeals/4928](https://t.me/sgfooddeals/4928)。
- **同篇原文外連（未逐店驗證關聯）：** [tco.sg/7RSwAhjRO](https://tco.sg/7RSwAhjRO)、[tco.sg/91D7DJD8G](https://tco.sg/91D7DJD8G)、[tco.sg/TXH4bNk4I](https://tco.sg/TXH4bNk4I)、[tco.sg/uMf2SHTNQ](https://tco.sg/uMf2SHTNQ)、[tco.sg/uYNyopLz1](https://tco.sg/uYNyopLz1)。
- **直接優惠來源：** 名冊尚未記錄已評估的官網／官方社群優惠 track；這不表示店家沒有官網。
- **門店／場地來源：** 本次盤點資料尚未記錄可用的完整官方目錄／runtime provider；需補充，不能由 Google 搜尋直接宣稱全店參與。
- **待補／阻礙：** 尚無已保存的直接優惠來源評估（`no_captured_direct_source_assessment`）。

<a id="merchant-064"></a>

### 064 · Kafey Haus

- **狀態：** 未完成直接優惠來源評估。
- **原始發現貼文（1 篇）：** [sgfooddeals/4907](https://t.me/sgfooddeals/4907)。
- **同篇原文外連（未逐店驗證關聯）：** [tco.sg/NkB8SCl23](http://tco.sg/NkB8SCl23)。
- **直接優惠來源：** 名冊尚未記錄已評估的官網／官方社群優惠 track；這不表示店家沒有官網。
- **門店／場地來源：** 本次盤點資料尚未記錄可用的完整官方目錄／runtime provider；需補充，不能由 Google 搜尋直接宣稱全店參與。
- **待補／阻礙：** 尚無已保存的直接優惠來源評估（`no_captured_direct_source_assessment`）。

<a id="merchant-065"></a>

### 065 · Katsu-an

- **狀態：** 未完成直接優惠來源評估。
- **原始發現貼文（1 篇）：** [sgfooddeals/4879](https://t.me/sgfooddeals/4879)。
- **同篇原文外連（未逐店驗證關聯）：** [tco.sg/6QoggzgFF](https://tco.sg/6QoggzgFF)、[tco.sg/dlFybU4ac](https://tco.sg/dlFybU4ac)、[tco.sg/p0fcsGKLO](https://tco.sg/p0fcsGKLO)、[tco.sg/qvdxn4dox](https://tco.sg/qvdxn4dox)、[tco.sg/vDrh4OQwD](https://tco.sg/vDrh4OQwD)。
- **直接優惠來源：** 名冊尚未記錄已評估的官網／官方社群優惠 track；這不表示店家沒有官網。
- **門店／場地來源：** 本次盤點資料尚未記錄可用的完整官方目錄／runtime provider；需補充，不能由 Google 搜尋直接宣稱全店參與。
- **待補／阻礙：** 尚無已保存的直接優惠來源評估（`no_captured_direct_source_assessment`）。

<a id="merchant-066"></a>

### 066 · Kei Kaisendon

- **狀態：** 來源候選，尚未完成資格驗證。
- **原始發現貼文（5 篇）：** [tastesoulsg/4417](https://t.me/tastesoulsg/4417)、[tastesoulsg/4447](https://t.me/tastesoulsg/4447)、[tastesoulsg/4462](https://t.me/tastesoulsg/4462)、[tastesoulsg/4488](https://t.me/tastesoulsg/4488)、[tastesoulsg/4494](https://t.me/tastesoulsg/4494)。
- **名冊記錄的營運方：** Kei Kaisendon (legal entity not declared in captured terms)。
- **同篇原文外連（未逐店驗證關聯）：** [bit.ly/3VgHDMt](http://bit.ly/3VgHDMt)、[bit.ly/45LZKMv](http://bit.ly/45LZKMv)、[bit.ly/4cFrs15](http://bit.ly/4cFrs15)、[bit.ly/4gB5K0U](http://bit.ly/4gB5K0U)、[bit.ly/4rri8Es](http://bit.ly/4rri8Es)。
- **同篇貼文已追蹤的候選目的地：** [www.instagram.com/p/DdMLD32Ivbz/](https://www.instagram.com/p/DdMLD32Ivbz/?utm_source=telegram&utm_medium=TS)、[www.instagram.com/p/DdWQHfKBdiK/](https://www.instagram.com/p/DdWQHfKBdiK/?utm_source=telegram&utm_medium=TS)。目的地可被找到，不代表與這家店的關聯、歸屬、活動事實或目前可讀性已驗證。

| 類型／帳號                          | 來源入口或已保存貼文                                                                                                                                                                                                           | 歸屬       | 列舉狀態         | 接入狀態 |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------- | ---------------- | -------- |
| 店家社群 · instagram · keikaisendon | [www.instagram.com/p/DdMLD32Ivbz/](https://www.instagram.com/p/DdMLD32Ivbz/?utm_source=telegram&utm_medium=TS)、[www.instagram.com/p/DdWQHfKBdiK/](https://www.instagram.com/p/DdWQHfKBdiK/?utm_source=telegram&utm_medium=TS) | 已驗證歸屬 | 有阻礙           | 有阻礙   |
| 店家社群 · instagram                | [www.instagram.com/p/DdMLD32Ivbz/](https://www.instagram.com/p/DdMLD32Ivbz/?utm_source=telegram&utm_medium=TS)                                                                                                                 | 未驗證歸屬 | 未評估           | 候選     |
| 店家社群 · instagram                | [www.instagram.com/p/DdWQHfKBdiK/](https://www.instagram.com/p/DdWQHfKBdiK/?utm_source=telegram&utm_medium=TS)                                                                                                                 | 未驗證歸屬 | 未評估           | 候選     |
| 店家網站                            | [www.keikaisendon.com/](https://www.keikaisendon.com/)、[www.keikaisendon.com/find-us/](https://www.keikaisendon.com/find-us/)、[www.keikaisendon.com/terms-conditions/](https://www.keikaisendon.com/terms-conditions/)       | 已驗證歸屬 | 未建立可列舉入口 | 有阻礙   |

- **instagram 帳號入口：** [keikaisendon](https://www.instagram.com/keikaisendon/)；已驗證歸屬。帳號與每篇貼文對應、feed 完整性另外驗證。
- **歸屬／身份查證的已記錄網頁：** [www.keikaisendon.com/](https://www.keikaisendon.com/)。查證結論以來源表及既有 review 為準；保留未驗證候選。
- **門店／場地來源：** [www.keikaisendon.com/find-us/](https://www.keikaisendon.com/find-us/)。已研究的官方門店入口；未實作完整 runtime 門店 provider。
- **待補／阻礙：** 既有研究未建立重複自動存取條件（`automated_access_permission_unestablished`）；有限範圍內的 feed 完整邊界未證明（`bounded_feed_boundary_unproven`）；快取社群 widget 無法證明完整官方 feed（`cached_social_widget_not_authoritative_feed`）；貼文所屬精確帳號未確認（`exact_account_unresolved`）；來源歸屬未驗證（`ownership_unverified`）；貼文與帳號的對應未證明（`post_account_association_unproven`）；未找到可用的優惠目錄（`promotion_directory_absent`）；後續載入／分頁未知（`unknown_continuation`）。

<a id="merchant-067"></a>

### 067 · KFC

- **狀態：** 未完成直接優惠來源評估。
- **原始發現貼文（1 篇）：** [tastesoulsg/4429](https://t.me/tastesoulsg/4429)。
- **同篇原文外連（未逐店驗證關聯）：** [bit.ly/3SGPQbW](http://bit.ly/3SGPQbW)、[t.me/tastesouls](https://t.me/tastesouls)。
- **直接優惠來源：** 名冊尚未記錄已評估的官網／官方社群優惠 track；這不表示店家沒有官網。
- **門店／場地來源：** 本次盤點資料尚未記錄可用的完整官方目錄／runtime provider；需補充，不能由 Google 搜尋直接宣稱全店參與。
- **待補／阻礙：** 尚無已保存的直接優惠來源評估（`no_captured_direct_source_assessment`）。

<a id="merchant-068"></a>

### 068 · Kimpson's Table

- **狀態：** 來源候選，尚未完成資格驗證。
- **原始發現貼文（3 篇）：** [sgfooddeals/4872](https://t.me/sgfooddeals/4872)、[sgfooddeals/4927](https://t.me/sgfooddeals/4927)、[tastesoulsg/4463](https://t.me/tastesoulsg/4463)。
- **名冊保留的原始名稱：** Kimpson's Table、Kimpson’s Table。
- **同篇原文外連（未逐店驗證關聯）：** [bit.ly/3SuC8ci](http://bit.ly/3SuC8ci)、[tco.sg/Z1tgKhn12](http://tco.sg/Z1tgKhn12)、[tco.sg/q81wOC8Ep](http://tco.sg/q81wOC8Ep)。

| 類型／帳號                              | 來源入口或已保存貼文                                                               | 歸屬       | 列舉狀態         | 接入狀態 |
| --------------------------------------- | ---------------------------------------------------------------------------------- | ---------- | ---------------- | -------- |
| 店家社群 · instagram · kimpsonstable.sg | [www.instagram.com/kimpsonstable.sg/](https://www.instagram.com/kimpsonstable.sg/) | 未驗證歸屬 | 未評估           | 候選     |
| 店家社群 · instagram · kimpsonstable    | [www.instagram.com/kimpsonstable/](https://www.instagram.com/kimpsonstable/)       | 已驗證歸屬 | 有阻礙           | 有阻礙   |
| 店家網站                                | [kimpsontable.cococart.co/](https://kimpsontable.cococart.co/)                     | 已驗證歸屬 | 未建立可列舉入口 | 有阻礙   |

- **instagram 帳號入口：** [kimpsonstable.sg](https://www.instagram.com/kimpsonstable.sg/)；未驗證歸屬。帳號與每篇貼文對應、feed 完整性另外驗證。
- **instagram 帳號入口：** [kimpsonstable](https://www.instagram.com/kimpsonstable/)；已驗證歸屬。帳號與每篇貼文對應、feed 完整性另外驗證。
- **歸屬／身份查證的已記錄網頁：** [kimpsontable.cococart.co/](https://kimpsontable.cococart.co/)、[www.fareastmalls.com.sg/en/discover/Kimpsons-Table](https://www.fareastmalls.com.sg/en/discover/Kimpsons-Table)。查證結論以來源表及既有 review 為準；保留未驗證候選。
- **門店／場地來源：** 本次盤點資料尚未記錄可用的完整官方目錄／runtime provider；需補充，不能由 Google 搜尋直接宣稱全店參與。
- **待補／阻礙：** 既有研究未建立重複自動存取條件（`automated_access_permission_unestablished`）；有限範圍內的 feed 完整邊界未證明（`bounded_feed_boundary_unproven`）；目前場地對應帳號的歸屬未驗證（`current_venue_account_ownership_unverified`）；來源歸屬未驗證（`ownership_unverified`）；貼文與帳號的對應未證明（`post_account_association_unproven`）；未找到可用的優惠目錄（`promotion_directory_absent`）；公開回應未暴露可完整列舉的 feed（`public_feed_not_exposed`）；已保存的商店頁顯示關閉（`storefront_closed`）。

<a id="merchant-069"></a>

### 069 · Koi Thé

- **狀態：** 未完成直接優惠來源評估。
- **原始發現貼文（1 篇）：** [tastesoulsg/4486](https://t.me/tastesoulsg/4486)。
- **同篇原文外連（未逐店驗證關聯）：** [bit.ly/4gTTqJh](http://bit.ly/4gTTqJh)。
- **直接優惠來源：** 名冊尚未記錄已評估的官網／官方社群優惠 track；這不表示店家沒有官網。
- **門店／場地來源：** 本次盤點資料尚未記錄可用的完整官方目錄／runtime provider；需補充，不能由 Google 搜尋直接宣稱全店參與。
- **待補／阻礙：** 尚無已保存的直接優惠來源評估（`no_captured_direct_source_assessment`）。

<a id="merchant-070"></a>

### 070 · Kotuwa

- **狀態：** 未完成直接優惠來源評估。
- **原始發現貼文（1 篇）：** [sgfooddeals/4910](https://t.me/sgfooddeals/4910)。
- **同篇原文外連（未逐店驗證關聯）：** [tco.sg/hsbcdiningxsgfd](http://tco.sg/hsbcdiningxsgfd)。
- **直接優惠來源：** 名冊尚未記錄已評估的官網／官方社群優惠 track；這不表示店家沒有官網。
- **門店／場地來源：** 本次盤點資料尚未記錄可用的完整官方目錄／runtime provider；需補充，不能由 Google 搜尋直接宣稱全店參與。
- **待補／阻礙：** 尚無已保存的直接優惠來源評估（`no_captured_direct_source_assessment`）。

<a id="merchant-071"></a>

### 071 · Kris+

- **狀態：** 已有 adapter，仍停用／研究預覽。
- **原始發現貼文（1 篇）：** [sgfooddeals/4952](https://t.me/sgfooddeals/4952)。
- **名冊記錄的營運方：** Kris+ Pte Ltd。
- **同篇原文外連（未逐店驗證關聯）：** [tco.sg/krisplusbbxsgfd](http://tco.sg/krisplusbbxsgfd)。
- **同篇貼文已追蹤的候選目的地：** [app.krisplus.com/Oct26_SG_BBash_SGFD](https://app.krisplus.com/Oct26_SG_BBash_SGFD)。目的地可被找到，不代表與這家店的關聯、歸屬、活動事實或目前可讀性已驗證。

| 類型／帳號   | 來源入口或已保存貼文                                                                 | 歸屬                   | 列舉狀態           | 接入狀態       |
| ------------ | ------------------------------------------------------------------------------------ | ---------------------- | ------------------ | -------------- |
| 發行商／平台 | [www.krisplus.com/en/sg/promotions](https://www.krisplus.com/en/sg/promotions)       | 已驗證歸屬             | 部分，完整性未成立 | 停用／研究預覽 |
| 發行商／平台 | [app.krisplus.com/Oct26_SG_BBash_SGFD](https://app.krisplus.com/Oct26_SG_BBash_SGFD) | 可能歸屬，尚未充分驗證 | 無已證明的列舉入口 | 候選           |

- **歸屬／身份查證的已記錄網頁：** [www.krisplus.com/en/sg/terms-and-conditions](https://www.krisplus.com/en/sg/terms-and-conditions)。查證結論以來源表及既有 review 為準；保留未驗證候選。
- **門店／場地來源：** 本次盤點資料尚未記錄可用的完整官方目錄／runtime provider；需補充，不能由 Google 搜尋直接宣稱全店參與。
- **待補／阻礙：** Confirm independent ownership link for exact app hostname；Load-more completeness and linked campaign fact extraction remain follow-up; do not use private APIs；Public directory is independently discoverable; sampled Birthday Bash correspondence not found；不同優惠的適用範圍未確認（`campaign_offer_scopes_unresolved`）；來源列舉不完整（`partial_enumeration`）；平台與合作店家的發布設定尚未建模（`partner_publication_configuration_unmodeled`）；Load More 完整性未解（`unresolved_load_more`）。
- **專案查證紀錄：** [docs/changes/direct-source-batch-1/research.md](</Users/louis/Documents/Projects/vibe coding/PromotionAroundYou/docs/changes/direct-source-batch-1/research.md>)。

<a id="merchant-072"></a>

### 072 · Lao Beijing

- **狀態：** 未完成直接優惠來源評估。
- **原始發現貼文（1 篇）：** [tastesoulsg/4413](https://t.me/tastesoulsg/4413)。
- **同篇原文外連（未逐店驗證關聯）：** [bit.ly/4wTp27m](http://bit.ly/4wTp27m)。
- **直接優惠來源：** 名冊尚未記錄已評估的官網／官方社群優惠 track；這不表示店家沒有官網。
- **門店／場地來源：** 本次盤點資料尚未記錄可用的完整官方目錄／runtime provider；需補充，不能由 Google 搜尋直接宣稱全店參與。
- **待補／阻礙：** 尚無已保存的直接優惠來源評估（`no_captured_direct_source_assessment`）。

<a id="merchant-073"></a>

### 073 · LiHO

- **狀態：** 未完成直接優惠來源評估。
- **原始發現貼文（1 篇）：** [tastesoulsg/4516](https://t.me/tastesoulsg/4516)。
- **同篇原文外連（未逐店驗證關聯）：** [bit.ly/4xLUow9](http://bit.ly/4xLUow9)。
- **直接優惠來源：** 名冊尚未記錄已評估的官網／官方社群優惠 track；這不表示店家沒有官網。
- **門店／場地來源：** 本次盤點資料尚未記錄可用的完整官方目錄／runtime provider；需補充，不能由 Google 搜尋直接宣稱全店參與。
- **待補／阻礙：** 尚無已保存的直接優惠來源評估（`no_captured_direct_source_assessment`）。

<a id="merchant-074"></a>

### 074 · LiXin Teochew Fishball Noodles

- **狀態：** 未完成直接優惠來源評估。
- **原始發現貼文（1 篇）：** [tastesoulsg/4438](https://t.me/tastesoulsg/4438)。
- **同篇原文外連（未逐店驗證關聯）：** [bit.ly/4gvczQe](http://bit.ly/4gvczQe)。
- **直接優惠來源：** 名冊尚未記錄已評估的官網／官方社群優惠 track；這不表示店家沒有官網。
- **門店／場地來源：** 本次盤點資料尚未記錄可用的完整官方目錄／runtime provider；需補充，不能由 Google 搜尋直接宣稱全店參與。
- **待補／阻礙：** 尚無已保存的直接優惠來源評估（`no_captured_direct_source_assessment`）。

<a id="merchant-075"></a>

### 075 · Marché

- **狀態：** 未完成直接優惠來源評估。
- **原始發現貼文（1 篇）：** [tastesoulsg/4513](https://t.me/tastesoulsg/4513)。
- **同篇原文外連（未逐店驗證關聯）：** [bit.ly/4dYRywE](http://bit.ly/4dYRywE)。
- **直接優惠來源：** 名冊尚未記錄已評估的官網／官方社群優惠 track；這不表示店家沒有官網。
- **門店／場地來源：** 本次盤點資料尚未記錄可用的完整官方目錄／runtime provider；需補充，不能由 Google 搜尋直接宣稱全店參與。
- **待補／阻礙：** 尚無已保存的直接優惠來源評估（`no_captured_direct_source_assessment`）。

<a id="merchant-076"></a>

### 076 · Marche

- **狀態：** 來源候選，尚未完成資格驗證。
- **原始發現貼文（1 篇）：** [sgfooddeals/4947](https://t.me/sgfooddeals/4947)。
- **同篇原文外連（未逐店驗證關聯）：** [tco.sg/Hb1vbUNpF](http://tco.sg/Hb1vbUNpF)。
- **同篇貼文已追蹤的候選目的地：** [www.instagram.com/p/DdSzWl-jaY0/](https://www.instagram.com/p/DdSzWl-jaY0/?hl=en&utm_source=telegram&utm_medium=sep2026&utm_campaign=sgfooddeals)。目的地可被找到，不代表與這家店的關聯、歸屬、活動事實或目前可讀性已驗證。

| 類型／帳號           | 來源入口或已保存貼文                                                                                                                               | 歸屬       | 列舉狀態 | 接入狀態 |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | -------- | -------- |
| 店家社群 · instagram | [www.instagram.com/p/DdSzWl-jaY0/](https://www.instagram.com/p/DdSzWl-jaY0/?hl=en&utm_source=telegram&utm_medium=sep2026&utm_campaign=sgfooddeals) | 未驗證歸屬 | 未評估   | 候選     |

- **門店／場地來源：** 本次盤點資料尚未記錄可用的完整官方目錄／runtime provider；需補充，不能由 Google 搜尋直接宣稱全店參與。
- **待補／阻礙：** 貼文所屬精確帳號未確認（`exact_account_unresolved`）；來源歸屬未驗證（`ownership_unverified`）。

<a id="merchant-077"></a>

### 077 · McDonald's

- **狀態：** 已有 adapter，仍停用／研究預覽。
- **原始發現貼文（4 篇）：** [tastesoulsg/4410](https://t.me/tastesoulsg/4410)、[tastesoulsg/4427](https://t.me/tastesoulsg/4427)、[tastesoulsg/4485](https://t.me/tastesoulsg/4485)、[tastesoulsg/4509](https://t.me/tastesoulsg/4509)。
- **名冊保留的原始名稱：** McDonald's、McDonald’s。
- **名冊記錄的營運方：** McDonald's Singapore (website controller; local legal entity not stated in captured terms)。
- **同篇原文外連（未逐店驗證關聯）：** [bit.ly/4fXyYpa](http://bit.ly/4fXyYpa)、[bit.ly/4qmO2RP](http://bit.ly/4qmO2RP)、[bit.ly/4xWc21l](http://bit.ly/4xWc21l)、[bit.ly/4yjGC52](http://bit.ly/4yjGC52)。
- **同篇貼文已追蹤的候選目的地：** [www.instagram.com/p/DdQIFcCB6TP/](https://www.instagram.com/p/DdQIFcCB6TP/?utm_source=Telegram&utm_medium=TS&utm_campaign=TS_$6McSpicy)、[www.instagram.com/p/Ddp7EmljAbm/](https://www.instagram.com/p/Ddp7EmljAbm/?utm_source=telegram&utm_medium=TS)。目的地可被找到，不代表與這家店的關聯、歸屬、活動事實或目前可讀性已驗證。

| 類型／帳號                   | 來源入口或已保存貼文                                                                                                                                                                                                                                     | 歸屬       | 列舉狀態           | 接入狀態       |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ------------------ | -------------- |
| 店家社群 · instagram · mcdsg | [www.instagram.com/p/DdQIFcCB6TP/](https://www.instagram.com/p/DdQIFcCB6TP/?utm_source=Telegram&utm_medium=TS&utm_campaign=TS_$6McSpicy)、[www.instagram.com/p/Ddp7EmljAbm/](https://www.instagram.com/p/Ddp7EmljAbm/?utm_source=telegram&utm_medium=TS) | 已驗證歸屬 | 有阻礙             | 有阻礙         |
| 店家網站                     | [www.mcdonalds.com.sg/McSaver](https://www.mcdonalds.com.sg/McSaver)、[www.mcdonalds.com.sg/bfmcsaver](https://www.mcdonalds.com.sg/bfmcsaver)                                                                                                           | 已驗證歸屬 | 部分，完整性未成立 | 停用／研究預覽 |

- **instagram 帳號入口：** [mcdsg](https://www.instagram.com/mcdsg/)；已驗證歸屬。帳號與每篇貼文對應、feed 完整性另外驗證。
- **歸屬／身份查證的已記錄網頁：** [www.mcdonalds.com.sg/](https://www.mcdonalds.com.sg/)、[www.mcdonalds.com.sg/website-terms](https://www.mcdonalds.com.sg/website-terms)。查證結論以來源表及既有 review 為準；保留未驗證候選。
- **門店／場地來源：** [www.mcdonalds.com.sg/locate-us](https://www.mcdonalds.com.sg/locate-us)。已保存的官方頁引導至 app；未取得公開完整官方門店清單。
- **待補／阻礙：** 既有研究未建立重複自動存取條件（`automated_access_permission_unestablished`）；有限範圍內的 feed 完整邊界未證明（`bounded_feed_boundary_unproven`）；活動位於新聞索引之外（`mcd_campaigns_outside_news_directory`）；新聞 Load More 完整性未解（`mcd_news_load_more_unresolved`）；多個獨立優惠／活動需拆分審查（`multiple_propositions_require_review`）；官方門店目錄需透過 app（`official_outlet_directory_app_only`）；後續載入／分頁未知（`unknown_continuation`）。

<a id="merchant-078"></a>

### 078 · Meat Smith

- **狀態：** 未完成直接優惠來源評估。
- **原始發現貼文（2 篇）：** [sgfooddeals/4905](https://t.me/sgfooddeals/4905)、[sgfooddeals/4910](https://t.me/sgfooddeals/4910)。
- **名冊保留的原始名稱：** Meat Smith、Meatsmith。
- **同篇原文外連（未逐店驗證關聯）：** [tco.sg/EQ0wZr1D6](http://tco.sg/EQ0wZr1D6)、[tco.sg/hsbcdiningxsgfd](http://tco.sg/hsbcdiningxsgfd)。
- **直接優惠來源：** 名冊尚未記錄已評估的官網／官方社群優惠 track；這不表示店家沒有官網。
- **門店／場地來源：** 本次盤點資料尚未記錄可用的完整官方目錄／runtime provider；需補充，不能由 Google 搜尋直接宣稱全店參與。
- **待補／阻礙：** 尚無已保存的直接優惠來源評估（`no_captured_direct_source_assessment`）。

<a id="merchant-079"></a>

### 079 · MilkyShop

- **狀態：** 未完成直接優惠來源評估。
- **原始發現貼文（1 篇）：** [tastesoulsg/4472](https://t.me/tastesoulsg/4472)。
- **同篇原文外連（未逐店驗證關聯）：** [bit.ly/3TcJAce](http://bit.ly/3TcJAce)。
- **直接優惠來源：** 名冊尚未記錄已評估的官網／官方社群優惠 track；這不表示店家沒有官網。
- **門店／場地來源：** 本次盤點資料尚未記錄可用的完整官方目錄／runtime provider；需補充，不能由 Google 搜尋直接宣稱全店參與。
- **待補／阻礙：** 尚無已保存的直接優惠來源評估（`no_captured_direct_source_assessment`）。

<a id="merchant-080"></a>

### 080 · More Yogurt

- **狀態：** 已研究，目前有阻礙。
- **原始發現貼文（3 篇）：** [sgfooddeals/4883](https://t.me/sgfooddeals/4883)、[tastesoulsg/4418](https://t.me/tastesoulsg/4418)、[tastesoulsg/4452](https://t.me/tastesoulsg/4452)。
- **名冊保留的原始名稱：** More Yogurt、moreyogurt。
- **名冊記錄的營運方：** Shanghai BUOY Catering Management Co., Ltd (global brand only; Singapore operator unverified)。
- **同篇原文外連（未逐店驗證關聯）：** [bit.ly/3S1ZPbF](http://bit.ly/3S1ZPbF)、[bit.ly/4wPfSrt](http://bit.ly/4wPfSrt)、[tco.sg/0IDAWDLdg](https://tco.sg/0IDAWDLdg)、[tco.sg/inLWoLGOG](https://tco.sg/inLWoLGOG)。

| 類型／帳號 | 來源入口或已保存貼文                                                                                                                                 | 歸屬                   | 列舉狀態 | 接入狀態 |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- | -------- | -------- |
| 店家網站   | [www.more-yogurt.com/index/about](https://www.more-yogurt.com/index/about)、[www.more-yogurt.com/index/news](https://www.more-yogurt.com/index/news) | 可能歸屬，尚未充分驗證 | 尚未建立 | 有阻礙   |

- **門店／場地來源：** [www.jewelchangiairport.com/en/dine/more-yogurt.html](https://www.jewelchangiairport.com/en/dine/more-yogurt.html)。商場租戶頁僅證明 Jewel 一個場地，不能代表全店目錄或活動參與。
- **待補／阻礙：** 全球新聞無法代表新加坡優惠活動（`global_news_not_singapore_campaign_authority`）；新加坡營運方與網域歸屬未驗證（`singapore_operator_and_domain_unverified`）；新加坡官方門店目錄無法取得（`singapore_outlet_directory_unavailable`）。

<a id="merchant-081"></a>

### 081 · Morganfield's

- **狀態：** 未完成直接優惠來源評估。
- **原始發現貼文（2 篇）：** [sgfooddeals/4902](https://t.me/sgfooddeals/4902)、[tastesoulsg/4436](https://t.me/tastesoulsg/4436)。
- **名冊保留的原始名稱：** Morganfield's、Morganfield’s。
- **同篇原文外連（未逐店驗證關聯）：** [bit.ly/4hLYxMq](http://bit.ly/4hLYxMq)、[tco.sg/api30jmn2](http://tco.sg/api30jmn2)。
- **直接優惠來源：** 名冊尚未記錄已評估的官網／官方社群優惠 track；這不表示店家沒有官網。
- **門店／場地來源：** 本次盤點資料尚未記錄可用的完整官方目錄／runtime provider；需補充，不能由 Google 搜尋直接宣稱全店參與。
- **待補／阻礙：** 尚無已保存的直接優惠來源評估（`no_captured_direct_source_assessment`）。

<a id="merchant-082"></a>

### 082 · MOS Burger

- **狀態：** 未完成直接優惠來源評估。
- **原始發現貼文（1 篇）：** [tastesoulsg/4423](https://t.me/tastesoulsg/4423)。
- **同篇原文外連（未逐店驗證關聯）：** [bit.ly/4gb6gB3](http://bit.ly/4gb6gB3)。
- **直接優惠來源：** 名冊尚未記錄已評估的官網／官方社群優惠 track；這不表示店家沒有官網。
- **門店／場地來源：** 本次盤點資料尚未記錄可用的完整官方目錄／runtime provider；需補充，不能由 Google 搜尋直接宣稱全店參與。
- **待補／阻礙：** 尚無已保存的直接優惠來源評估（`no_captured_direct_source_assessment`）。

<a id="merchant-083"></a>

### 083 · MUKAI

- **狀態：** 未完成直接優惠來源評估。
- **原始發現貼文（1 篇）：** [tastesoulsg/4442](https://t.me/tastesoulsg/4442)。
- **同篇原文外連（未逐店驗證關聯）：** [bit.ly/4xlKNwN](http://bit.ly/4xlKNwN)。
- **直接優惠來源：** 名冊尚未記錄已評估的官網／官方社群優惠 track；這不表示店家沒有官網。
- **門店／場地來源：** 本次盤點資料尚未記錄可用的完整官方目錄／runtime provider；需補充，不能由 Google 搜尋直接宣稱全店參與。
- **待補／阻礙：** 尚無已保存的直接優惠來源評估（`no_captured_direct_source_assessment`）。

<a id="merchant-084"></a>

### 084 · Nasty Cookie

- **狀態：** 未完成直接優惠來源評估。
- **原始發現貼文（2 篇）：** [tastesoulsg/4481](https://t.me/tastesoulsg/4481)、[tastesoulsg/4519](https://t.me/tastesoulsg/4519)。
- **同篇原文外連（未逐店驗證關聯）：** [bit.ly/46TgqC4](http://bit.ly/46TgqC4)、[bit.ly/4AHapGe](http://bit.ly/4AHapGe)。
- **直接優惠來源：** 名冊尚未記錄已評估的官網／官方社群優惠 track；這不表示店家沒有官網。
- **門店／場地來源：** 本次盤點資料尚未記錄可用的完整官方目錄／runtime provider；需補充，不能由 Google 搜尋直接宣稱全店參與。
- **待補／阻礙：** 尚無已保存的直接優惠來源評估（`no_captured_direct_source_assessment`）。

<a id="merchant-085"></a>

### 085 · New Ubin Seafood

- **狀態：** 未完成直接優惠來源評估。
- **原始發現貼文（1 篇）：** [sgfooddeals/4896](https://t.me/sgfooddeals/4896)。
- **同篇原文外連（未逐店驗證關聯）：** [tco.sg/MMQ0xi395](http://tco.sg/MMQ0xi395)。
- **直接優惠來源：** 名冊尚未記錄已評估的官網／官方社群優惠 track；這不表示店家沒有官網。
- **門店／場地來源：** 本次盤點資料尚未記錄可用的完整官方目錄／runtime provider；需補充，不能由 Google 搜尋直接宣稱全店參與。
- **待補／阻礙：** 尚無已保存的直接優惠來源評估（`no_captured_direct_source_assessment`）。

<a id="merchant-086"></a>

### 086 · Next Door Spanish Cafe

- **狀態：** 未完成直接優惠來源評估。
- **原始發現貼文（1 篇）：** [tastesoulsg/4464](https://t.me/tastesoulsg/4464)。
- **同篇原文外連（未逐店驗證關聯）：** [bit.ly/4h6cOTg](http://bit.ly/4h6cOTg)。
- **直接優惠來源：** 名冊尚未記錄已評估的官網／官方社群優惠 track；這不表示店家沒有官網。
- **門店／場地來源：** 本次盤點資料尚未記錄可用的完整官方目錄／runtime provider；需補充，不能由 Google 搜尋直接宣稱全店參與。
- **待補／阻礙：** 尚無已保存的直接優惠來源評估（`no_captured_direct_source_assessment`）。

<a id="merchant-087"></a>

### 087 · noci bakehouse

- **狀態：** 未完成直接優惠來源評估。
- **原始發現貼文（1 篇）：** [tastesoulsg/4506](https://t.me/tastesoulsg/4506)。
- **同篇原文外連（未逐店驗證關聯）：** [bit.ly/4yU9MYp](http://bit.ly/4yU9MYp)。
- **直接優惠來源：** 名冊尚未記錄已評估的官網／官方社群優惠 track；這不表示店家沒有官網。
- **門店／場地來源：** 本次盤點資料尚未記錄可用的完整官方目錄／runtime provider；需補充，不能由 Google 搜尋直接宣稱全店參與。
- **待補／阻礙：** 尚無已保存的直接優惠來源評估（`no_captured_direct_source_assessment`）。

<a id="merchant-088"></a>

### 088 · NomNom JB

- **狀態：** 未完成直接優惠來源評估。
- **原始發現貼文（1 篇）：** [tastesoulsg/4419](https://t.me/tastesoulsg/4419)。
- **同篇原文外連（未逐店驗證關聯）：** [bit.ly/45qNEYT](http://bit.ly/45qNEYT)。
- **直接優惠來源：** 名冊尚未記錄已評估的官網／官方社群優惠 track；這不表示店家沒有官網。
- **門店／場地來源：** 本次盤點資料尚未記錄可用的完整官方目錄／runtime provider；需補充，不能由 Google 搜尋直接宣稱全店參與。
- **待補／阻礙：** 尚無已保存的直接優惠來源評估（`no_captured_direct_source_assessment`）。

<a id="merchant-089"></a>

### 089 · Nouri

- **狀態：** 未完成直接優惠來源評估。
- **原始發現貼文（1 篇）：** [sgfooddeals/4910](https://t.me/sgfooddeals/4910)。
- **同篇原文外連（未逐店驗證關聯）：** [tco.sg/hsbcdiningxsgfd](http://tco.sg/hsbcdiningxsgfd)。
- **直接優惠來源：** 名冊尚未記錄已評估的官網／官方社群優惠 track；這不表示店家沒有官網。
- **門店／場地來源：** 本次盤點資料尚未記錄可用的完整官方目錄／runtime provider；需補充，不能由 Google 搜尋直接宣稱全店參與。
- **待補／阻礙：** 尚無已保存的直接優惠來源評估（`no_captured_direct_source_assessment`）。

<a id="merchant-090"></a>

### 090 · OMMA Korean Charcoal BBQ

- **狀態：** 未完成直接優惠來源評估。
- **原始發現貼文（1 篇）：** [tastesoulsg/4443](https://t.me/tastesoulsg/4443)。
- **同篇原文外連（未逐店驗證關聯）：** [bit.ly/4qDjCLt](http://bit.ly/4qDjCLt)。
- **直接優惠來源：** 名冊尚未記錄已評估的官網／官方社群優惠 track；這不表示店家沒有官網。
- **門店／場地來源：** 本次盤點資料尚未記錄可用的完整官方目錄／runtime provider；需補充，不能由 Google 搜尋直接宣稱全店參與。
- **待補／阻礙：** 尚無已保存的直接優惠來源評估（`no_captured_direct_source_assessment`）。

<a id="merchant-091"></a>

### 091 · Omuplace

- **狀態：** 未完成直接優惠來源評估。
- **原始發現貼文（1 篇）：** [sgfooddeals/4908](https://t.me/sgfooddeals/4908)。
- **同篇原文外連（未逐店驗證關聯）：** [tco.sg/3kbj1nVsj](http://tco.sg/3kbj1nVsj)、[t.me/myfoodpromos](https://t.me/myfoodpromos)、[t.me/mymakanmurah](https://t.me/mymakanmurah)、[t.me/renodealssg](https://t.me/renodealssg)。
- **直接優惠來源：** 名冊尚未記錄已評估的官網／官方社群優惠 track；這不表示店家沒有官網。
- **門店／場地來源：** 本次盤點資料尚未記錄可用的完整官方目錄／runtime provider；需補充，不能由 Google 搜尋直接宣稱全店參與。
- **待補／阻礙：** 尚無已保存的直接優惠來源評估（`no_captured_direct_source_assessment`）。

<a id="merchant-092"></a>

### 092 · Papi’s Tacos

- **狀態：** 未完成直接優惠來源評估。
- **原始發現貼文（2 篇）：** [tastesoulsg/4471](https://t.me/tastesoulsg/4471)、[tastesoulsg/4478](https://t.me/tastesoulsg/4478)。
- **同篇原文外連（未逐店驗證關聯）：** [bit.ly/4xcjmVg](http://bit.ly/4xcjmVg)、[bit.ly/4yrAI1p](http://bit.ly/4yrAI1p)。
- **直接優惠來源：** 名冊尚未記錄已評估的官網／官方社群優惠 track；這不表示店家沒有官網。
- **門店／場地來源：** [www.papis-tacos.com/](https://www.papis-tacos.com/)。已實作官方門店 provider；目錄數量／卡片／導航須一致。原地址 Tyrwhitt Roard 保留，不能自行改成 Road。
- **待補／阻礙：** 尚無已保存的直接優惠來源評估（`no_captured_direct_source_assessment`）。

<a id="merchant-093"></a>

### 093 · Paradise Group

- **狀態：** 已有 adapter，仍停用／研究預覽。
- **原始發現貼文（0 篇）：** 未記錄。
- **名冊記錄的營運方：** Paradise Group Holdings Pte. Ltd.。
- **同篇原文外連（未逐店驗證關聯）：** 未記錄。

| 類型／帳號 | 來源入口或已保存貼文                                                                                                                   | 歸屬       | 列舉狀態           | 接入狀態       |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ------------------ | -------------- |
| 店家網站   | [www.paradisegp.com/](https://www.paradisegp.com/)、[www.paradisegp.com/paradise-hotpot/](https://www.paradisegp.com/paradise-hotpot/) | 已驗證歸屬 | 部分，完整性未成立 | 停用／研究預覽 |

- **歸屬／身份查證的已記錄網頁：** [www.paradisegp.com/paradise-hotpot/](https://www.paradisegp.com/paradise-hotpot/)、[www.paradisegp.com/privacy-policy/](https://www.paradisegp.com/privacy-policy/)。查證結論以來源表及既有 review 為準；保留未驗證候選。
- **門店／場地來源：** 本次盤點資料尚未記錄可用的完整官方目錄／runtime provider；需補充，不能由 Google 搜尋直接宣稱全店參與。
- **待補／阻礙：** 部分證據超過既有擷取大小上限（`oversized_evidence`）；來源列舉不完整（`partial_enumeration`）；Load More 完整性未解（`unresolved_load_more`）。
- **專案查證紀錄：** [docs/changes/autonomous-direct-source-ingestion/verification.md](</Users/louis/Documents/Projects/vibe coding/PromotionAroundYou/docs/changes/autonomous-direct-source-ingestion/verification.md>)。

<a id="merchant-094"></a>

### 094 · Paradise Hotpot

- **狀態：** 已有 adapter，仍停用／研究預覽。
- **原始發現貼文（1 篇）：** [sgfooddeals/4933](https://t.me/sgfooddeals/4933)。
- **名冊記錄的營運方：** Paradise Group Holdings Pte. Ltd.。
- **同篇原文外連（未逐店驗證關聯）：** [tco.sg/nEz04NnPZ](http://tco.sg/nEz04NnPZ)。
- **同篇貼文已追蹤的候選目的地：** [www.paradisegp.com/wp-content/uploads/Paradise-Hotpot-Menu_-Aug-2025.pdf](https://www.paradisegp.com/wp-content/uploads/Paradise-Hotpot-Menu_-Aug-2025.pdf?utm_source=telegram&utm_medium=sep2026&utm_campaign=sgfooddeals)。目的地可被找到，不代表與這家店的關聯、歸屬、活動事實或目前可讀性已驗證。

| 類型／帳號 | 來源入口或已保存貼文                                                                                                                   | 歸屬       | 列舉狀態           | 接入狀態       |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ------------------ | -------------- |
| 店家網站   | [www.paradisegp.com/](https://www.paradisegp.com/)、[www.paradisegp.com/paradise-hotpot/](https://www.paradisegp.com/paradise-hotpot/) | 已驗證歸屬 | 部分，完整性未成立 | 停用／研究預覽 |

- **歸屬／身份查證的已記錄網頁：** [www.paradisegp.com/paradise-hotpot/](https://www.paradisegp.com/paradise-hotpot/)、[www.paradisegp.com/privacy-policy/](https://www.paradisegp.com/privacy-policy/)。查證結論以來源表及既有 review 為準；保留未驗證候選。
- **門店／場地來源：** 本次盤點資料尚未記錄可用的完整官方目錄／runtime provider；需補充，不能由 Google 搜尋直接宣稱全店參與。
- **待補／阻礙：** 部分證據超過既有擷取大小上限（`oversized_evidence`）；來源列舉不完整（`partial_enumeration`）；Load More 完整性未解（`unresolved_load_more`）。
- **專案查證紀錄：** [docs/changes/autonomous-direct-source-ingestion/verification.md](</Users/louis/Documents/Projects/vibe coding/PromotionAroundYou/docs/changes/autonomous-direct-source-ingestion/verification.md>)。

<a id="merchant-095"></a>

### 095 · Park Side

- **狀態：** 未完成直接優惠來源評估。
- **原始發現貼文（1 篇）：** [tastesoulsg/4431](https://t.me/tastesoulsg/4431)。
- **同篇原文外連（未逐店驗證關聯）：** [bit.ly/3SiDczB](http://bit.ly/3SiDczB)。
- **直接優惠來源：** 名冊尚未記錄已評估的官網／官方社群優惠 track；這不表示店家沒有官網。
- **門店／場地來源：** 本次盤點資料尚未記錄可用的完整官方目錄／runtime provider；需補充，不能由 Google 搜尋直接宣稱全店參與。
- **待補／阻礙：** 尚無已保存的直接優惠來源評估（`no_captured_direct_source_assessment`）。

<a id="merchant-096"></a>

### 096 · Pepper Lunch

- **狀態：** 已啟用：完整候選可經驗證入庫。
- **原始發現貼文（2 篇）：** [sgfooddeals/4940](https://t.me/sgfooddeals/4940)、[tastesoulsg/4460](https://t.me/tastesoulsg/4460)。
- **名冊記錄的營運方：** Hot Palette (Asia Pacific) Pte. Ltd.。
- **同篇原文外連（未逐店驗證關聯）：** [bit.ly/4yfJkbp](http://bit.ly/4yfJkbp)、[tco.sg/PBcgXrqA2](http://tco.sg/PBcgXrqA2)、[tco.sg/5vXdQ0mXj](https://tco.sg/5vXdQ0mXj)、[tco.sg/8zCH6BE3j](https://tco.sg/8zCH6BE3j)、[tco.sg/V6ViWP149](https://tco.sg/V6ViWP149)、[tco.sg/gBzs5A1yo](https://tco.sg/gBzs5A1yo)、[tco.sg/q81wOC8Ep](https://tco.sg/q81wOC8Ep)、[tco.sg/yUxhAaOdw](https://tco.sg/yUxhAaOdw)。
- **同篇貼文已追蹤的候選目的地：** [t.me/sgstudentpromos/1868](https://t.me/sgstudentpromos/1868?utm_source=telegram&utm_medium=sep2026&utm_campaign=sgfooddeals)、[www.dianxiaoer.com.sg/promo](https://www.dianxiaoer.com.sg/promo?lightbox=dataItem-msxym06a&utm_source=telegram&utm_medium=sep2026&utm_campaign=sgfooddeals)、[www.instagram.com/p/Dc-kxPJzx9B/](https://www.instagram.com/p/Dc-kxPJzx9B/?utm_source=telegram&utm_medium=sep2026&utm_campaign=sgfooddeals)、[www.instagram.com/p/DclNIIIj1Xk/](https://www.instagram.com/p/DclNIIIj1Xk/?utm_source=telegram&utm_medium=sep2026&utm_campaign=sgfooddeals)、[www.instagram.com/p/DctAeflziKI/](https://www.instagram.com/p/DctAeflziKI/?utm_source=telegram&utm_medium=sep2026&utm_campaign=sgfooddeals)、[www.pepperlunch.com.sg/promo/uper-value-deal/](https://www.pepperlunch.com.sg/promo/uper-value-deal/?utm_source=telegram&utm_medium=sep2026&utm_campaign=sgfooddeals)。目的地可被找到，不代表與這家店的關聯、歸屬、活動事實或目前可讀性已驗證。

| 類型／帳號 | 來源入口或已保存貼文                                                   | 歸屬       | 列舉狀態       | 接入狀態 |
| ---------- | ---------------------------------------------------------------------- | ---------- | -------------- | -------- |
| 店家網站   | [www.pepperlunch.com.sg/promo/](https://www.pepperlunch.com.sg/promo/) | 已驗證歸屬 | 完整邊界已建立 | 已啟用   |

- **歸屬／身份查證的已記錄網頁：** [www.pepperlunch.com.sg/privacy/](https://www.pepperlunch.com.sg/privacy/)。查證結論以來源表及既有 review 為準；保留未驗證候選。
- **門店／場地來源：** [www.pepperlunch.com.sg/location/](https://www.pepperlunch.com.sg/location/)。已實作官方門店 provider；門店格式、目錄完整性及優惠參與仍須各自通過驗證。
- **剩餘驗證：** 來源已啟用；仍逐優惠檢查有效日期、必要條件、參與門店與座標，未通過者待審查。
- **專案查證紀錄：** [docs/changes/autonomous-direct-source-ingestion/verification.md](</Users/louis/Documents/Projects/vibe coding/PromotionAroundYou/docs/changes/autonomous-direct-source-ingestion/verification.md>)。

<a id="merchant-097"></a>

### 097 · Petite Menu

- **狀態：** 未完成直接優惠來源評估。
- **原始發現貼文（1 篇）：** [sgfooddeals/4882](https://t.me/sgfooddeals/4882)。
- **同篇原文外連（未逐店驗證關聯）：** [tco.sg/7103UMnKz](https://tco.sg/7103UMnKz)、[tco.sg/97OSlurTa](https://tco.sg/97OSlurTa)、[tco.sg/bpaapFAMo](https://tco.sg/bpaapFAMo)、[tco.sg/fDd6T5Bvo](https://tco.sg/fDd6T5Bvo)、[tco.sg/n1DPyldXG](https://tco.sg/n1DPyldXG)。
- **直接優惠來源：** 名冊尚未記錄已評估的官網／官方社群優惠 track；這不表示店家沒有官網。
- **門店／場地來源：** 本次盤點資料尚未記錄可用的完整官方目錄／runtime provider；需補充，不能由 Google 搜尋直接宣稱全店參與。
- **待補／阻礙：** 尚無已保存的直接優惠來源評估（`no_captured_direct_source_assessment`）。

<a id="merchant-098"></a>

### 098 · Pizza Hut

- **狀態：** 來源候選，尚未完成資格驗證。
- **原始發現貼文（3 篇）：** [sgfooddeals/4901](https://t.me/sgfooddeals/4901)、[sgfooddeals/4939](https://t.me/sgfooddeals/4939)、[tastesoulsg/4409](https://t.me/tastesoulsg/4409)。
- **名冊記錄的營運方：** Pizza Hut Singapore Pte Ltd (official indexed policy; captured page is JS shell)。
- **同篇原文外連（未逐店驗證關聯）：** [bit.ly/4whvUu6](http://bit.ly/4whvUu6)、[tco.sg/BCdJfH9cb](http://tco.sg/BCdJfH9cb)、[tco.sg/f7MoI3IQi](http://tco.sg/f7MoI3IQi)。
- **同篇貼文已追蹤的候選目的地：** [www.instagram.com/p/DdDr_9tigEc/](https://www.instagram.com/p/DdDr_9tigEc/?utm_source=telegram&utm_medium=sep2026&utm_campaign=sgfooddeals)。目的地可被找到，不代表與這家店的關聯、歸屬、活動事實或目前可讀性已驗證。

| 類型／帳號                         | 來源入口或已保存貼文                                                                                                                                                                                                                                                       | 歸屬                   | 列舉狀態         | 接入狀態 |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- | ---------------- | -------- |
| 店家社群 · instagram · pizzahut_sg | [www.instagram.com/p/DdDr_9tigEc/](https://www.instagram.com/p/DdDr_9tigEc/?utm_source=telegram&utm_medium=sep2026&utm_campaign=sgfooddeals)                                                                                                                               | 未驗證歸屬             | 未評估           | 候選     |
| 店家網站                           | [www.pizzahut.com.sg/](https://www.pizzahut.com.sg/)、[www.pizzahut.com.sg/find-a-hut](https://www.pizzahut.com.sg/find-a-hut)、[www.pizzahut.com.sg/hot-deals](https://www.pizzahut.com.sg/hot-deals)、[www.pizzahut.com.sg/privacy](https://www.pizzahut.com.sg/privacy) | 可能歸屬，尚未充分驗證 | 未建立可列舉入口 | 有阻礙   |

- **instagram 帳號入口：** [pizzahut_sg](https://www.instagram.com/pizzahut_sg/)；未驗證歸屬。帳號與每篇貼文對應、feed 完整性另外驗證。
- **歸屬／身份查證的已記錄網頁：** [www.pizzahut.com.sg/](https://www.pizzahut.com.sg/)。查證結論以來源表及既有 review 為準；保留未驗證候選。
- **門店／場地來源：** [www.pizzahut.com.sg/find-a-hut](https://www.pizzahut.com.sg/find-a-hut)。入口存在，但已保存回應為 JS 外殼／位置相關流程，未證明完整門店列舉。
- **待補／阻礙：** 既有研究未建立重複自動存取條件（`automated_access_permission_unestablished`）；公開存取中斷／受阻（`blocked_public_access`）；有限範圍內的 feed 完整邊界未證明（`bounded_feed_boundary_unproven`）；未取得可驗證精確社群帳號的官方反向連結（`exact_social_ownership_backlink_unavailable`）；依位置變動的購物流程未解（`location_dependent_commerce_unresolved`）；來源歸屬未驗證（`ownership_unverified`）；公開優惠 HTML 只有 JavaScript 外殼（`public_promotion_html_js_shell`）；後續載入／分頁未知（`unknown_continuation`）。

<a id="merchant-099"></a>

### 099 · Poke Theory

- **狀態：** 來源候選，尚未完成資格驗證。
- **原始發現貼文（1 篇）：** [tastesoulsg/4497](https://t.me/tastesoulsg/4497)。
- **同篇原文外連（未逐店驗證關聯）：** [bit.ly/4yHzcs2](http://bit.ly/4yHzcs2)。
- **同篇貼文已追蹤的候選目的地：** [www.instagram.com/p/DdiCeMoDVZk/](https://www.instagram.com/p/DdiCeMoDVZk/?utm_source=telegram&utm_medium=TS)。目的地可被找到，不代表與這家店的關聯、歸屬、活動事實或目前可讀性已驗證。

| 類型／帳號           | 來源入口或已保存貼文                                                                                           | 歸屬       | 列舉狀態 | 接入狀態 |
| -------------------- | -------------------------------------------------------------------------------------------------------------- | ---------- | -------- | -------- |
| 店家社群 · instagram | [www.instagram.com/p/DdiCeMoDVZk/](https://www.instagram.com/p/DdiCeMoDVZk/?utm_source=telegram&utm_medium=TS) | 未驗證歸屬 | 未評估   | 候選     |

- **門店／場地來源：** 本次盤點資料尚未記錄可用的完整官方目錄／runtime provider；需補充，不能由 Google 搜尋直接宣稱全店參與。
- **待補／阻礙：** 貼文所屬精確帳號未確認（`exact_account_unresolved`）；來源歸屬未驗證（`ownership_unverified`）。

<a id="merchant-100"></a>

### 100 · POKKA

- **狀態：** 未完成直接優惠來源評估。
- **原始發現貼文（1 篇）：** [sgfooddeals/4891](https://t.me/sgfooddeals/4891)。
- **同篇原文外連（未逐店驗證關聯）：** [tco.sg/pokkaaugxsgfd](http://tco.sg/pokkaaugxsgfd)。
- **直接優惠來源：** 名冊尚未記錄已評估的官網／官方社群優惠 track；這不表示店家沒有官網。
- **門店／場地來源：** 本次盤點資料尚未記錄可用的完整官方目錄／runtime provider；需補充，不能由 Google 搜尋直接宣稱全店參與。
- **待補／阻礙：** 尚無已保存的直接優惠來源評估（`no_captured_direct_source_assessment`）。

<a id="merchant-101"></a>

### 101 · Potato Corner

- **狀態：** 未完成直接優惠來源評估。
- **原始發現貼文（1 篇）：** [tastesoulsg/4433](https://t.me/tastesoulsg/4433)。
- **同篇原文外連（未逐店驗證關聯）：** [bit.ly/45HaZFU](http://bit.ly/45HaZFU)。
- **直接優惠來源：** 名冊尚未記錄已評估的官網／官方社群優惠 track；這不表示店家沒有官網。
- **門店／場地來源：** 本次盤點資料尚未記錄可用的完整官方目錄／runtime provider；需補充，不能由 Google 搜尋直接宣稱全店參與。
- **待補／阻礙：** 尚無已保存的直接優惠來源評估（`no_captured_direct_source_assessment`）。

<a id="merchant-102"></a>

### 102 · POUT Rooftop Cafe

- **狀態：** 未完成直接優惠來源評估。
- **原始發現貼文（1 篇）：** [tastesoulsg/4422](https://t.me/tastesoulsg/4422)。
- **同篇原文外連（未逐店驗證關聯）：** [bit.ly/45LAbeB](http://bit.ly/45LAbeB)。
- **直接優惠來源：** 名冊尚未記錄已評估的官網／官方社群優惠 track；這不表示店家沒有官網。
- **門店／場地來源：** 本次盤點資料尚未記錄可用的完整官方目錄／runtime provider；需補充，不能由 Google 搜尋直接宣稱全店參與。
- **待補／阻礙：** 尚無已保存的直接優惠來源評估（`no_captured_direct_source_assessment`）。

<a id="merchant-103"></a>

### 103 · Racines

- **狀態：** 未完成直接優惠來源評估。
- **原始發現貼文（1 篇）：** [tastesoulsg/4480](https://t.me/tastesoulsg/4480)。
- **同篇原文外連（未逐店驗證關聯）：** [bit.ly/4xOPyzd](http://bit.ly/4xOPyzd)。
- **直接優惠來源：** 名冊尚未記錄已評估的官網／官方社群優惠 track；這不表示店家沒有官網。
- **門店／場地來源：** 本次盤點資料尚未記錄可用的完整官方目錄／runtime provider；需補充，不能由 Google 搜尋直接宣稱全店參與。
- **待補／阻礙：** 尚無已保存的直接優惠來源評估（`no_captured_direct_source_assessment`）。

<a id="merchant-104"></a>

### 104 · Rollney

- **狀態：** 未完成直接優惠來源評估。
- **原始發現貼文（1 篇）：** [sgfooddeals/4918](https://t.me/sgfooddeals/4918)。
- **同篇原文外連（未逐店驗證關聯）：** [tco.sg/o2wdz3VcE](http://tco.sg/o2wdz3VcE)。
- **直接優惠來源：** 名冊尚未記錄已評估的官網／官方社群優惠 track；這不表示店家沒有官網。
- **門店／場地來源：** 本次盤點資料尚未記錄可用的完整官方目錄／runtime provider；需補充，不能由 Google 搜尋直接宣稱全店參與。
- **待補／阻礙：** 尚無已保存的直接優惠來源評估（`no_captured_direct_source_assessment`）。

<a id="merchant-105"></a>

### 105 · Saizeriya

- **狀態：** 未完成直接優惠來源評估。
- **原始發現貼文（1 篇）：** [sgfooddeals/4879](https://t.me/sgfooddeals/4879)。
- **同篇原文外連（未逐店驗證關聯）：** [tco.sg/6QoggzgFF](https://tco.sg/6QoggzgFF)、[tco.sg/dlFybU4ac](https://tco.sg/dlFybU4ac)、[tco.sg/p0fcsGKLO](https://tco.sg/p0fcsGKLO)、[tco.sg/qvdxn4dox](https://tco.sg/qvdxn4dox)、[tco.sg/vDrh4OQwD](https://tco.sg/vDrh4OQwD)。
- **直接優惠來源：** 名冊尚未記錄已評估的官網／官方社群優惠 track；這不表示店家沒有官網。
- **門店／場地來源：** 本次盤點資料尚未記錄可用的完整官方目錄／runtime provider；需補充，不能由 Google 搜尋直接宣稱全店參與。
- **待補／阻礙：** 尚無已保存的直接優惠來源評估（`no_captured_direct_source_assessment`）。

<a id="merchant-106"></a>

### 106 · San Shu Gong

- **狀態：** 未完成直接優惠來源評估。
- **原始發現貼文（1 篇）：** [tastesoulsg/4434](https://t.me/tastesoulsg/4434)。
- **同篇原文外連（未逐店驗證關聯）：** [bit.ly/4xR3QPs](http://bit.ly/4xR3QPs)。
- **直接優惠來源：** 名冊尚未記錄已評估的官網／官方社群優惠 track；這不表示店家沒有官網。
- **門店／場地來源：** 本次盤點資料尚未記錄可用的完整官方目錄／runtime provider；需補充，不能由 Google 搜尋直接宣稱全店參與。
- **待補／阻礙：** 尚無已保存的直接優惠來源評估（`no_captured_direct_source_assessment`）。

<a id="merchant-107"></a>

### 107 · Secret Recipe

- **狀態：** 未完成直接優惠來源評估。
- **原始發現貼文（1 篇）：** [tastesoulsg/4451](https://t.me/tastesoulsg/4451)。
- **同篇原文外連（未逐店驗證關聯）：** [bit.ly/46rPVU8](http://bit.ly/46rPVU8)。
- **直接優惠來源：** 名冊尚未記錄已評估的官網／官方社群優惠 track；這不表示店家沒有官網。
- **門店／場地來源：** 本次盤點資料尚未記錄可用的完整官方目錄／runtime provider；需補充，不能由 Google 搜尋直接宣稱全店參與。
- **待補／阻礙：** 尚無已保存的直接優惠來源評估（`no_captured_direct_source_assessment`）。

<a id="merchant-108"></a>

### 108 · Seoul Garden

- **狀態：** 未完成直接優惠來源評估。
- **原始發現貼文（1 篇）：** [sgfooddeals/4928](https://t.me/sgfooddeals/4928)。
- **同篇原文外連（未逐店驗證關聯）：** [tco.sg/7RSwAhjRO](https://tco.sg/7RSwAhjRO)、[tco.sg/91D7DJD8G](https://tco.sg/91D7DJD8G)、[tco.sg/TXH4bNk4I](https://tco.sg/TXH4bNk4I)、[tco.sg/uMf2SHTNQ](https://tco.sg/uMf2SHTNQ)、[tco.sg/uYNyopLz1](https://tco.sg/uYNyopLz1)。
- **直接優惠來源：** 名冊尚未記錄已評估的官網／官方社群優惠 track；這不表示店家沒有官網。
- **門店／場地來源：** 本次盤點資料尚未記錄可用的完整官方目錄／runtime provider；需補充，不能由 Google 搜尋直接宣稱全店參與。
- **待補／阻礙：** 尚無已保存的直接優惠來源評估（`no_captured_direct_source_assessment`）。

<a id="merchant-109"></a>

### 109 · Shake Shack

- **狀態：** 已啟用：完整候選可經驗證入庫。
- **原始發現貼文（2 篇）：** [tastesoulsg/4490](https://t.me/tastesoulsg/4490)、[tastesoulsg/4501](https://t.me/tastesoulsg/4501)。
- **名冊記錄的營運方：** Shake Shack Singapore Jewel Ptd Ltd。
- **同篇原文外連（未逐店驗證關聯）：** [bit.ly/4dIvHcK](http://bit.ly/4dIvHcK)、[bit.ly/4yTPrT9](http://bit.ly/4yTPrT9)。
- **同篇貼文已追蹤的候選目的地：** [app.happypointcard.com.sg/](https://app.happypointcard.com.sg/?utm_source=telegram&utm_medium=TS)、[www.shakeshack.com.sg/national-cheeseburger-day/](https://www.shakeshack.com.sg/national-cheeseburger-day/?utm_source=telegram&utm_medium=TS)。目的地可被找到，不代表與這家店的關聯、歸屬、活動事實或目前可讀性已驗證。

| 類型／帳號   | 來源入口或已保存貼文                                                                               | 歸屬                   | 列舉狀態           | 接入狀態 |
| ------------ | -------------------------------------------------------------------------------------------------- | ---------------------- | ------------------ | -------- |
| 發行商／平台 | [app.happypointcard.com.sg/](https://app.happypointcard.com.sg/?utm_source=telegram&utm_medium=TS) | 可能歸屬，尚未充分驗證 | 無已證明的列舉入口 | 候選     |
| 店家網站     | [www.shakeshack.com.sg/blog/](https://www.shakeshack.com.sg/blog/)                                 | 已驗證歸屬             | 完整邊界已建立     | 已啟用   |

- **歸屬／身份查證的已記錄網頁：** [www.shakeshack.com.sg/wp-content/uploads/2024/12/SS-Data-Protection-Notice-for-Customers.pdf](https://www.shakeshack.com.sg/wp-content/uploads/2024/12/SS-Data-Protection-Notice-for-Customers.pdf)。查證結論以來源表及既有 review 為準；保留未驗證候選。
- **門店／場地來源：** [www.shakeshack.com.sg/locations/](https://www.shakeshack.com.sg/locations/)。已實作官方門店 provider；存在於目錄不等於參與每個優惠。
- **待補／阻礙：** Exact app/operator ownership needs independent confirmation；No stable offer ID; tracking parameters are not campaign identity；Separate Cheeseburger campaign is not evidence of the sampled Summer Greek Chicken offer。
- **專案查證紀錄：** [docs/changes/shake-shack-autonomous-activation/verification.md](</Users/louis/Documents/Projects/vibe coding/PromotionAroundYou/docs/changes/shake-shack-autonomous-activation/verification.md>)、[docs/changes/shake-shack-direct-source/research.md](</Users/louis/Documents/Projects/vibe coding/PromotionAroundYou/docs/changes/shake-shack-direct-source/research.md>)。

<a id="merchant-110"></a>

### 110 · Shi Li Fang

- **狀態：** 未完成直接優惠來源評估。
- **原始發現貼文（1 篇）：** [sgfooddeals/4879](https://t.me/sgfooddeals/4879)。
- **同篇原文外連（未逐店驗證關聯）：** [tco.sg/6QoggzgFF](https://tco.sg/6QoggzgFF)、[tco.sg/dlFybU4ac](https://tco.sg/dlFybU4ac)、[tco.sg/p0fcsGKLO](https://tco.sg/p0fcsGKLO)、[tco.sg/qvdxn4dox](https://tco.sg/qvdxn4dox)、[tco.sg/vDrh4OQwD](https://tco.sg/vDrh4OQwD)。
- **直接優惠來源：** 名冊尚未記錄已評估的官網／官方社群優惠 track；這不表示店家沒有官網。
- **門店／場地來源：** 本次盤點資料尚未記錄可用的完整官方目錄／runtime provider；需補充，不能由 Google 搜尋直接宣稱全店參與。
- **待補／阻礙：** 尚無已保存的直接優惠來源評估（`no_captured_direct_source_assessment`）。

<a id="merchant-111"></a>

### 111 · Shin Katsu

- **狀態：** 未完成直接優惠來源評估。
- **原始發現貼文（1 篇）：** [tastesoulsg/4467](https://t.me/tastesoulsg/4467)。
- **同篇原文外連（未逐店驗證關聯）：** [bit.ly/4zPLos5](http://bit.ly/4zPLos5)。
- **直接優惠來源：** 名冊尚未記錄已評估的官網／官方社群優惠 track；這不表示店家沒有官網。
- **門店／場地來源：** 本次盤點資料尚未記錄可用的完整官方目錄／runtime provider；需補充，不能由 Google 搜尋直接宣稱全店參與。
- **待補／阻礙：** 尚無已保存的直接優惠來源評估（`no_captured_direct_source_assessment`）。

<a id="merchant-112"></a>

### 112 · SHINRAI

- **狀態：** 已研究，目前有阻礙。
- **原始發現貼文（1 篇）：** [sgfooddeals/4950](https://t.me/sgfooddeals/4950)。
- **同篇原文外連（未逐店驗證關聯）：** [tco.sg/uBSgEjvYj](http://tco.sg/uBSgEjvYj)、[t.me/myfoodpromos](https://t.me/myfoodpromos)、[t.me/mymakanmurah](https://t.me/mymakanmurah)、[t.me/renodealssg](https://t.me/renodealssg)。
- **同篇貼文已追蹤的候選目的地：** [t.me/myfoodpromos](https://t.me/myfoodpromos)、[t.me/mymakanmurah](https://t.me/mymakanmurah)、[t.me/renodealssg](https://t.me/renodealssg)、[www.instagram.com/p/DDJfz9bynW-/](https://www.instagram.com/p/DDJfz9bynW-/?utm_source=telegram&utm_medium=sep2026&utm_campaign=sgfooddeals)。目的地可被找到，不代表與這家店的關聯、歸屬、活動事實或目前可讀性已驗證。

| 類型／帳號                        | 來源入口或已保存貼文                                                                                                                         | 歸屬       | 列舉狀態 | 接入狀態 |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | -------- | -------- |
| 店家社群 · instagram · shinrai.sg | [www.instagram.com/p/DDJfz9bynW-/](https://www.instagram.com/p/DDJfz9bynW-/?utm_source=telegram&utm_medium=sep2026&utm_campaign=sgfooddeals) | 已驗證歸屬 | 有阻礙   | 有阻礙   |

- **instagram 帳號入口：** [shinrai.sg](https://www.instagram.com/shinrai.sg/)；已驗證歸屬。帳號與每篇貼文對應、feed 完整性另外驗證。
- **歸屬／身份查證的已記錄網頁：** [www.shinrai.sg/](https://www.shinrai.sg/)。查證結論以來源表及既有 review 為準；保留未驗證候選。
- **門店／場地來源：** 本次盤點資料尚未記錄可用的完整官方目錄／runtime provider；需補充，不能由 Google 搜尋直接宣稱全店參與。
- **待補／阻礙：** 既有研究未建立重複自動存取條件（`automated_access_permission_unestablished`）；有限範圍內的 feed 完整邊界未證明（`bounded_feed_boundary_unproven`）；後續載入／分頁未知（`unknown_continuation`）。

<a id="merchant-113"></a>

### 113 · Shiok Burger

- **狀態：** 已研究，目前有阻礙。
- **原始發現貼文（2 篇）：** [sgfooddeals/4925](https://t.me/sgfooddeals/4925)、[tastesoulsg/4469](https://t.me/tastesoulsg/4469)。
- **同篇原文外連（未逐店驗證關聯）：** [bit.ly/4A0HhJI](http://bit.ly/4A0HhJI)、[tco.sg/NYQMADnIk](http://tco.sg/NYQMADnIk)。

| 類型／帳號                            | 來源入口或已保存貼文                                                           | 歸屬       | 列舉狀態         | 接入狀態 |
| ------------------------------------- | ------------------------------------------------------------------------------ | ---------- | ---------------- | -------- |
| 店家社群 · instagram · shiokburger_sg | [www.instagram.com/shiokburger_sg/](https://www.instagram.com/shiokburger_sg/) | 已驗證歸屬 | 有阻礙           | 有阻礙   |
| 店家網站                              | [www.shiokburger.com/](https://www.shiokburger.com/)                           | 已驗證歸屬 | 未建立可列舉入口 | 有阻礙   |

- **instagram 帳號入口：** [shiokburger_sg](https://www.instagram.com/shiokburger_sg/)；已驗證歸屬。帳號與每篇貼文對應、feed 完整性另外驗證。
- **歸屬／身份查證的已記錄網頁：** [www.shiokburger.com/](https://www.shiokburger.com/)。查證結論以來源表及既有 review 為準；保留未驗證候選。
- **門店／場地來源：** [www.shiokburger.com/find-us](https://www.shiokburger.com/find-us)。早期研究的定位入口；可見圖片／辦公地址不足以證明完整實體門店清單。
- **待補／阻礙：** 既有研究未建立重複自動存取條件（`automated_access_permission_unestablished`）；有限範圍內的 feed 完整邊界未證明（`bounded_feed_boundary_unproven`）；未取得完整官方門店目錄（`official_outlet_directory_unavailable`）；貼文與帳號的對應未證明（`post_account_association_unproven`）；未找到可用的優惠目錄（`promotion_directory_absent`）；後續載入／分頁未知（`unknown_continuation`）。

<a id="merchant-114"></a>

### 114 · SIDES by the Sidemen

- **狀態：** 未完成直接優惠來源評估。
- **原始發現貼文（1 篇）：** [tastesoulsg/4484](https://t.me/tastesoulsg/4484)。
- **同篇原文外連（未逐店驗證關聯）：** [bit.ly/46mhH4E](http://bit.ly/46mhH4E)。
- **直接優惠來源：** 名冊尚未記錄已評估的官網／官方社群優惠 track；這不表示店家沒有官網。
- **門店／場地來源：** 本次盤點資料尚未記錄可用的完整官方目錄／runtime provider；需補充，不能由 Google 搜尋直接宣稱全店參與。
- **待補／阻礙：** 尚無已保存的直接優惠來源評估（`no_captured_direct_source_assessment`）。

<a id="merchant-115"></a>

### 115 · Singapore Chinese Cultural Centre

- **狀態：** 未完成直接優惠來源評估。
- **原始發現貼文（1 篇）：** [sgfooddeals/4920](https://t.me/sgfooddeals/4920)。
- **同篇原文外連（未逐店驗證關聯）：** [tco.sg/2iFIZirzm](https://tco.sg/2iFIZirzm)、[tco.sg/X1iavOqAD](https://tco.sg/X1iavOqAD)、[tco.sg/h2B1A4ia3](https://tco.sg/h2B1A4ia3)、[tco.sg/xEkGQpKMK](https://tco.sg/xEkGQpKMK)、[tco.sg/zZyWmtovq](https://tco.sg/zZyWmtovq)。
- **直接優惠來源：** 名冊尚未記錄已評估的官網／官方社群優惠 track；這不表示店家沒有官網。
- **門店／場地來源：** 本次盤點資料尚未記錄可用的完整官方目錄／runtime provider；需補充，不能由 Google 搜尋直接宣稱全店參與。
- **待補／阻礙：** 尚無已保存的直接優惠來源評估（`no_captured_direct_source_assessment`）。

<a id="merchant-116"></a>

### 116 · Sinpopo Brand

- **狀態：** 已研究，目前有阻礙。
- **原始發現貼文（1 篇）：** [sgfooddeals/4949](https://t.me/sgfooddeals/4949)。
- **同篇原文外連（未逐店驗證關聯）：** [tco.sg/N2zDDY2Lv](http://tco.sg/N2zDDY2Lv)。
- **同篇貼文已追蹤的候選目的地：** [www.instagram.com/p/DdQA3EChsjx/](https://www.instagram.com/p/DdQA3EChsjx/?hl=en&utm_source=telegram&utm_medium=sep2026&utm_campaign=sgfooddeals)。目的地可被找到，不代表與這家店的關聯、歸屬、活動事實或目前可讀性已驗證。

| 類型／帳號                          | 來源入口或已保存貼文                                                                                                                               | 歸屬       | 列舉狀態 | 接入狀態 |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | -------- | -------- |
| 店家社群 · instagram · sinpopobrand | [www.instagram.com/p/DdQA3EChsjx/](https://www.instagram.com/p/DdQA3EChsjx/?hl=en&utm_source=telegram&utm_medium=sep2026&utm_campaign=sgfooddeals) | 已驗證歸屬 | 有阻礙   | 有阻礙   |

- **instagram 帳號入口：** [sinpopobrand](https://www.instagram.com/sinpopobrand/)；已驗證歸屬。帳號與每篇貼文對應、feed 完整性另外驗證。
- **歸屬／身份查證的已記錄網頁：** [www.sinpopo.com/](https://www.sinpopo.com/)。查證結論以來源表及既有 review 為準；保留未驗證候選。
- **門店／場地來源：** 本次盤點資料尚未記錄可用的完整官方目錄／runtime provider；需補充，不能由 Google 搜尋直接宣稱全店參與。
- **待補／阻礙：** 既有研究未建立重複自動存取條件（`automated_access_permission_unestablished`）；有限範圍內的 feed 完整邊界未證明（`bounded_feed_boundary_unproven`）；後續載入／分頁未知（`unknown_continuation`）。

<a id="merchant-117"></a>

### 117 · Sip Sip

- **狀態：** 未完成直接優惠來源評估。
- **原始發現貼文（1 篇）：** [tastesoulsg/4446](https://t.me/tastesoulsg/4446)。
- **同篇原文外連（未逐店驗證關聯）：** [bit.ly/4qzP8ty](http://bit.ly/4qzP8ty)。
- **直接優惠來源：** 名冊尚未記錄已評估的官網／官方社群優惠 track；這不表示店家沒有官網。
- **門店／場地來源：** 本次盤點資料尚未記錄可用的完整官方目錄／runtime provider；需補充，不能由 Google 搜尋直接宣稱全店參與。
- **待補／阻礙：** 尚無已保存的直接優惠來源評估（`no_captured_direct_source_assessment`）。

<a id="merchant-118"></a>

### 118 · Smooy

- **狀態：** 未完成直接優惠來源評估。
- **原始發現貼文（1 篇）：** [sgfooddeals/4931](https://t.me/sgfooddeals/4931)。
- **同篇原文外連（未逐店驗證關聯）：** [tco.sg/MBBq3YBDd](https://tco.sg/MBBq3YBDd)、[tco.sg/Vgh4xMisj](https://tco.sg/Vgh4xMisj)。
- **直接優惠來源：** 名冊尚未記錄已評估的官網／官方社群優惠 track；這不表示店家沒有官網。
- **門店／場地來源：** 本次盤點資料尚未記錄可用的完整官方目錄／runtime provider；需補充，不能由 Google 搜尋直接宣稱全店參與。
- **待補／阻礙：** 尚無已保存的直接優惠來源評估（`no_captured_direct_source_assessment`）。

<a id="merchant-119"></a>

### 119 · Smöoy

- **狀態：** 未完成直接優惠來源評估。
- **原始發現貼文（1 篇）：** [tastesoulsg/4407](https://t.me/tastesoulsg/4407)。
- **同篇原文外連（未逐店驗證關聯）：** [bit.ly/4wcTp7w](http://bit.ly/4wcTp7w)。
- **直接優惠來源：** 名冊尚未記錄已評估的官網／官方社群優惠 track；這不表示店家沒有官網。
- **門店／場地來源：** 本次盤點資料尚未記錄可用的完整官方目錄／runtime provider；需補充，不能由 Google 搜尋直接宣稱全店參與。
- **待補／阻礙：** 尚無已保存的直接優惠來源評估（`no_captured_direct_source_assessment`）。

<a id="merchant-120"></a>

### 120 · Spicy Noodles SG

- **狀態：** 未完成直接優惠來源評估。
- **原始發現貼文（1 篇）：** [tastesoulsg/4437](https://t.me/tastesoulsg/4437)。
- **同篇原文外連（未逐店驗證關聯）：** [bit.ly/4xWNB3q](http://bit.ly/4xWNB3q)。
- **直接優惠來源：** 名冊尚未記錄已評估的官網／官方社群優惠 track；這不表示店家沒有官網。
- **門店／場地來源：** 本次盤點資料尚未記錄可用的完整官方目錄／runtime provider；需補充，不能由 Google 搜尋直接宣稱全店參與。
- **待補／阻礙：** 尚無已保存的直接優惠來源評估（`no_captured_direct_source_assessment`）。

<a id="merchant-121"></a>

### 121 · Starbucks

- **狀態：** 已研究，目前有阻礙。
- **原始發現貼文（3 篇）：** [sgfooddeals/4893](https://t.me/sgfooddeals/4893)、[sgfooddeals/4944](https://t.me/sgfooddeals/4944)、[tastesoulsg/4421](https://t.me/tastesoulsg/4421)。
- **同篇原文外連（未逐店驗證關聯）：** [bit.ly/4zcyiot](http://bit.ly/4zcyiot)、[tco.sg/CKFt36HKc](http://tco.sg/CKFt36HKc)、[tco.sg/w81CeMLwx](http://tco.sg/w81CeMLwx)。
- **同篇貼文已追蹤的候選目的地：** [www.instagram.com/p/DdfecQUjNZ5/](https://www.instagram.com/p/DdfecQUjNZ5/?utm_source=telegram&utm_medium=sep2026&utm_campaign=sgfooddeals)。目的地可被找到，不代表與這家店的關聯、歸屬、活動事實或目前可讀性已驗證。

| 類型／帳號                         | 來源入口或已保存貼文                                                                                                                         | 歸屬       | 列舉狀態 | 接入狀態 |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | -------- | -------- |
| 店家社群 · instagram · starbuckssg | [www.instagram.com/p/DdfecQUjNZ5/](https://www.instagram.com/p/DdfecQUjNZ5/?utm_source=telegram&utm_medium=sep2026&utm_campaign=sgfooddeals) | 已驗證歸屬 | 有阻礙   | 有阻礙   |

- **instagram 帳號入口：** [starbuckssg](https://www.instagram.com/starbuckssg/)；已驗證歸屬。帳號與每篇貼文對應、feed 完整性另外驗證。
- **歸屬／身份查證的已記錄網頁：** [www.starbucks.com.sg/](https://www.starbucks.com.sg/)。查證結論以來源表及既有 review 為準；保留未驗證候選。
- **門店／場地來源：** 本次盤點資料尚未記錄可用的完整官方目錄／runtime provider；需補充，不能由 Google 搜尋直接宣稱全店參與。
- **補充歷史研究入口：** [www.starbucks.com.sg/menu/beverages/unicorn-frappuccino](https://www.starbucks.com.sg/menu/beverages/unicorn-frappuccino)。2026-09-20 原短網址目的地檢查為 HTTP 404；不代表現在仍為 404，本次未重查。
- **待補／阻礙：** 既有研究未建立重複自動存取條件（`automated_access_permission_unestablished`）；有限範圍內的 feed 完整邊界未證明（`bounded_feed_boundary_unproven`）；後續載入／分頁未知（`unknown_continuation`）。

<a id="merchant-122"></a>

### 122 · Subway

- **狀態：** 未完成直接優惠來源評估。
- **原始發現貼文（1 篇）：** [tastesoulsg/4468](https://t.me/tastesoulsg/4468)。
- **同篇原文外連（未逐店驗證關聯）：** [bit.ly/4ifYdWl](http://bit.ly/4ifYdWl)。
- **直接優惠來源：** 名冊尚未記錄已評估的官網／官方社群優惠 track；這不表示店家沒有官網。
- **門店／場地來源：** 本次盤點資料尚未記錄可用的完整官方目錄／runtime provider；需補充，不能由 Google 搜尋直接宣稱全店參與。
- **待補／阻礙：** 尚無已保存的直接優惠來源評估（`no_captured_direct_source_assessment`）。

<a id="merchant-123"></a>

### 123 · Sukiya

- **狀態：** 未完成直接優惠來源評估。
- **原始發現貼文（1 篇）：** [sgfooddeals/4926](https://t.me/sgfooddeals/4926)。
- **同篇原文外連（未逐店驗證關聯）：** [tco.sg/72KaXgJub](http://tco.sg/72KaXgJub)。
- **直接優惠來源：** 名冊尚未記錄已評估的官網／官方社群優惠 track；這不表示店家沒有官網。
- **門店／場地來源：** 本次盤點資料尚未記錄可用的完整官方目錄／runtime provider；需補充，不能由 Google 搜尋直接宣稱全店參與。
- **補充歷史研究入口：** [www.sukiya.com.sg/new-sukiya-breakfast](https://www.sukiya.com.sg/new-sukiya-breakfast)。2026-09-20 研究確認的官方早餐頁；屬菜單／時段資料，尚未證明具日期的促銷與完整參與門店。
- **待補／阻礙：** 尚無已保存的直接優惠來源評估（`no_captured_direct_source_assessment`）。

<a id="merchant-124"></a>

### 124 · Sushidan

- **狀態：** 未完成直接優惠來源評估。
- **原始發現貼文（1 篇）：** [tastesoulsg/4439](https://t.me/tastesoulsg/4439)。
- **同篇原文外連（未逐店驗證關聯）：** [bit.ly/4wKnbRi](http://bit.ly/4wKnbRi)。
- **直接優惠來源：** 名冊尚未記錄已評估的官網／官方社群優惠 track；這不表示店家沒有官網。
- **門店／場地來源：** 本次盤點資料尚未記錄可用的完整官方目錄／runtime provider；需補充，不能由 Google 搜尋直接宣稱全店參與。
- **待補／阻礙：** 尚無已保存的直接優惠來源評估（`no_captured_direct_source_assessment`）。

<a id="merchant-125"></a>

### 125 · Sushi Express

- **狀態：** 未完成直接優惠來源評估。
- **原始發現貼文（2 篇）：** [tastesoulsg/4408](https://t.me/tastesoulsg/4408)、[tastesoulsg/4498](https://t.me/tastesoulsg/4498)。
- **同篇原文外連（未逐店驗證關聯）：** [bit.ly/4hdPcwh](http://bit.ly/4hdPcwh)、[bit.ly/4q5GiUf](http://bit.ly/4q5GiUf)。
- **直接優惠來源：** 名冊尚未記錄已評估的官網／官方社群優惠 track；這不表示店家沒有官網。
- **門店／場地來源：** 本次盤點資料尚未記錄可用的完整官方目錄／runtime provider；需補充，不能由 Google 搜尋直接宣稱全店參與。
- **待補／阻礙：** 尚無已保存的直接優惠來源評估（`no_captured_direct_source_assessment`）。

<a id="merchant-126"></a>

### 126 · Sushiro

- **狀態：** 已有 adapter，仍停用／研究預覽。
- **原始發現貼文（4 篇）：** [sgfooddeals/4899](https://t.me/sgfooddeals/4899)、[tastesoulsg/4420](https://t.me/tastesoulsg/4420)、[tastesoulsg/4477](https://t.me/tastesoulsg/4477)、[tastesoulsg/4518](https://t.me/tastesoulsg/4518)。
- **名冊記錄的營運方：** SUSHIRO GH SINGAPORE PTE. LTD.。
- **同篇原文外連（未逐店驗證關聯）：** [bit.ly/3TqnbZb](http://bit.ly/3TqnbZb)、[bit.ly/4wpszJe](http://bit.ly/4wpszJe)、[bit.ly/4yxtCsn](http://bit.ly/4yxtCsn)、[tco.sg/DOp2ydBjd](http://tco.sg/DOp2ydBjd)。
- **同篇貼文已追蹤的候選目的地：** [www.instagram.com/p/Ddp3ov4Fwng/](https://www.instagram.com/p/Ddp3ov4Fwng/?img_index=1&utm_source=telegram&utm_medium=TS)。目的地可被找到，不代表與這家店的關聯、歸屬、活動事實或目前可讀性已驗證。

| 類型／帳號                              | 來源入口或已保存貼文                                                                                                       | 歸屬       | 列舉狀態           | 接入狀態       |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ---------- | ------------------ | -------------- |
| 店家社群 · instagram · sushirosingapore | [www.instagram.com/p/Ddp3ov4Fwng/](https://www.instagram.com/p/Ddp3ov4Fwng/?img_index=1&utm_source=telegram&utm_medium=TS) | 已驗證歸屬 | 有阻礙             | 有阻礙         |
| 店家網站                                | [www.sushiro.com.sg/promo/](https://www.sushiro.com.sg/promo/)                                                             | 已驗證歸屬 | 部分，完整性未成立 | 停用／研究預覽 |

- **instagram 帳號入口：** [sushirosingapore](https://www.instagram.com/sushirosingapore/)；已驗證歸屬。帳號與每篇貼文對應、feed 完整性另外驗證。
- **歸屬／身份查證的已記錄網頁：** [www.sushiro.com.sg/contact-location/](https://www.sushiro.com.sg/contact-location/)、[www.sushiro.com.sg/privacy-policy/](https://www.sushiro.com.sg/privacy-policy/)、[www.sushiro.com.sg/promo/](https://www.sushiro.com.sg/promo/)。查證結論以來源表及既有 review 為準；保留未驗證候選。
- **門店／場地來源：** [www.sushiro.com.sg/contact-location/](https://www.sushiro.com.sg/contact-location/)。官方門店頁包含營業、即將開幕及已關閉狀態；尚無 runtime 門店 provider，參與優惠未明示。
- **待補／阻礙：** 既有研究未建立重複自動存取條件（`automated_access_permission_unestablished`）；有限範圍內的 feed 完整邊界未證明（`bounded_feed_boundary_unproven`）；未明示參與門店（`outlet_participation_unstated`）；優惠目錄完整邊界未證明（`sushiro_directory_boundary_unproven`）；後續載入／分頁未知（`unknown_continuation`）；優惠日期沒有明確年份（`validity_year_unstated`）。

<a id="merchant-127"></a>

### 127 · Takashimaya

- **狀態：** 未完成直接優惠來源評估。
- **原始發現貼文（1 篇）：** [sgfooddeals/4920](https://t.me/sgfooddeals/4920)。
- **同篇原文外連（未逐店驗證關聯）：** [tco.sg/2iFIZirzm](https://tco.sg/2iFIZirzm)、[tco.sg/X1iavOqAD](https://tco.sg/X1iavOqAD)、[tco.sg/h2B1A4ia3](https://tco.sg/h2B1A4ia3)、[tco.sg/xEkGQpKMK](https://tco.sg/xEkGQpKMK)、[tco.sg/zZyWmtovq](https://tco.sg/zZyWmtovq)。
- **直接優惠來源：** 名冊尚未記錄已評估的官網／官方社群優惠 track；這不表示店家沒有官網。
- **門店／場地來源：** 本次盤點資料尚未記錄可用的完整官方目錄／runtime provider；需補充，不能由 Google 搜尋直接宣稱全店參與。
- **待補／阻礙：** 尚無已保存的直接優惠來源評估（`no_captured_direct_source_assessment`）。

<a id="merchant-128"></a>

### 128 · Tavola Aperta

- **狀態：** 未完成直接優惠來源評估。
- **原始發現貼文（1 篇）：** [sgfooddeals/4881](https://t.me/sgfooddeals/4881)。
- **同篇原文外連（未逐店驗證關聯）：** [tco.sg/lSAXSCQlj](http://tco.sg/lSAXSCQlj)。
- **直接優惠來源：** 名冊尚未記錄已評估的官網／官方社群優惠 track；這不表示店家沒有官網。
- **門店／場地來源：** 本次盤點資料尚未記錄可用的完整官方目錄／runtime provider；需補充，不能由 Google 搜尋直接宣稱全店參與。
- **待補／阻礙：** 尚無已保存的直接優惠來源評估（`no_captured_direct_source_assessment`）。

<a id="merchant-129"></a>

### 129 · The Coffee Bean & Tea Leaf

- **狀態：** 已研究，目前有阻礙。
- **原始發現貼文（3 篇）：** [sgfooddeals/4943](https://t.me/sgfooddeals/4943)、[tastesoulsg/4415](https://t.me/tastesoulsg/4415)、[tastesoulsg/4424](https://t.me/tastesoulsg/4424)。
- **名冊記錄的營運方：** The Coffee Bean & Tea Leaf Pte Ltd。
- **同篇原文外連（未逐店驗證關聯）：** [bit.ly/4g7seF4](http://bit.ly/4g7seF4)、[bit.ly/4ghSMDR](http://bit.ly/4ghSMDR)、[tco.sg/AzR8QVqX3](http://tco.sg/AzR8QVqX3)。
- **同篇貼文已追蹤的候選目的地：** [www.instagram.com/p/DdgiQp9jdIl/](https://www.instagram.com/p/DdgiQp9jdIl/?hl=en&utm_source=telegram&utm_medium=sep2026&utm_campaign=sgfooddeals)。目的地可被找到，不代表與這家店的關聯、歸屬、活動事實或目前可讀性已驗證。

| 類型／帳號                          | 來源入口或已保存貼文                                                                                                                                                                                                                   | 歸屬       | 列舉狀態         | 接入狀態 |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ---------------- | -------- |
| 店家社群 · instagram · coffeebeansg | [www.instagram.com/p/DdgiQp9jdIl/](https://www.instagram.com/p/DdgiQp9jdIl/?hl=en&utm_source=telegram&utm_medium=sep2026&utm_campaign=sgfooddeals)                                                                                     | 已驗證歸屬 | 有阻礙           | 有阻礙   |
| 店家網站                            | [www.coffeebean.com.sg/](https://www.coffeebean.com.sg/)、[www.coffeebean.com.sg/amlocator](https://www.coffeebean.com.sg/amlocator)、[www.coffeebean.com.sg/terms-and-conditions](https://www.coffeebean.com.sg/terms-and-conditions) | 已驗證歸屬 | 未建立可列舉入口 | 有阻礙   |

- **instagram 帳號入口：** [coffeebeansg](https://www.instagram.com/coffeebeansg/)；已驗證歸屬。帳號與每篇貼文對應、feed 完整性另外驗證。
- **歸屬／身份查證的已記錄網頁：** [www.coffeebean.com.sg/](https://www.coffeebean.com.sg/)。查證結論以來源表及既有 review 為準；保留未驗證候選。
- **門店／場地來源：** [www.coffeebean.com.sg/amlocator](https://www.coffeebean.com.sg/amlocator)。已研究的官方 locator；門店存在與優惠參與要分別驗證。
- **待補／阻礙：** app 優惠券有效日期未公開提供（`app_voucher_validity_not_public`）；既有研究未建立重複自動存取條件（`automated_access_permission_unestablished`）；有限範圍內的 feed 完整邊界未證明（`bounded_feed_boundary_unproven`）；購物商品目錄不等於優惠活動目錄（`commerce_catalogue_not_campaigns`）；未找到可用的優惠目錄（`promotion_directory_absent`）；後續載入／分頁未知（`unknown_continuation`）。

<a id="merchant-130"></a>

### 130 · The Summer Açaí

- **狀態：** 未完成直接優惠來源評估。
- **原始發現貼文（1 篇）：** [tastesoulsg/4492](https://t.me/tastesoulsg/4492)。
- **同篇原文外連（未逐店驗證關聯）：** [bit.ly/4y1jlVu](http://bit.ly/4y1jlVu)。
- **直接優惠來源：** 名冊尚未記錄已評估的官網／官方社群優惠 track；這不表示店家沒有官網。
- **門店／場地來源：** 本次盤點資料尚未記錄可用的完整官方目錄／runtime provider；需補充，不能由 Google 搜尋直接宣稱全店參與。
- **待補／阻礙：** 尚無已保存的直接優惠來源評估（`no_captured_direct_source_assessment`）。

<a id="merchant-131"></a>

### 131 · Tofu G

- **狀態：** 未完成直接優惠來源評估。
- **原始發現貼文（2 篇）：** [tastesoulsg/4412](https://t.me/tastesoulsg/4412)、[tastesoulsg/4512](https://t.me/tastesoulsg/4512)。
- **同篇原文外連（未逐店驗證關聯）：** [bit.ly/3S1y9ne](http://bit.ly/3S1y9ne)、[bit.ly/4AvRz4V](http://bit.ly/4AvRz4V)。
- **直接優惠來源：** 名冊尚未記錄已評估的官網／官方社群優惠 track；這不表示店家沒有官網。
- **門店／場地來源：** 本次盤點資料尚未記錄可用的完整官方目錄／runtime provider；需補充，不能由 Google 搜尋直接宣稱全店參與。
- **待補／阻礙：** 尚無已保存的直接優惠來源評估（`no_captured_direct_source_assessment`）。

<a id="merchant-132"></a>

### 132 · Tofu G Gelato

- **狀態：** 來源候選，尚未完成資格驗證。
- **原始發現貼文（1 篇）：** [tastesoulsg/4495](https://t.me/tastesoulsg/4495)。
- **同篇原文外連（未逐店驗證關聯）：** [bit.ly/4cUVHl0](http://bit.ly/4cUVHl0)。
- **同篇貼文已追蹤的候選目的地：** [www.instagram.com/p/DdYsy1NyTF_/](https://www.instagram.com/p/DdYsy1NyTF_/?utm_source=Telegram&utm_medium=TS&utm_campaign=TS_TofuGSuntec)。目的地可被找到，不代表與這家店的關聯、歸屬、活動事實或目前可讀性已驗證。

| 類型／帳號           | 來源入口或已保存貼文                                                                                                                       | 歸屬       | 列舉狀態 | 接入狀態 |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ---------- | -------- | -------- |
| 店家社群 · instagram | [www.instagram.com/p/DdYsy1NyTF_/](https://www.instagram.com/p/DdYsy1NyTF_/?utm_source=Telegram&utm_medium=TS&utm_campaign=TS_TofuGSuntec) | 未驗證歸屬 | 未評估   | 候選     |

- **門店／場地來源：** 本次盤點資料尚未記錄可用的完整官方目錄／runtime provider；需補充，不能由 Google 搜尋直接宣稱全店參與。
- **待補／阻礙：** 貼文所屬精確帳號未確認（`exact_account_unresolved`）；來源歸屬未驗證（`ownership_unverified`）。

<a id="merchant-133"></a>

### 133 · Viva Lavender

- **狀態：** 未完成直接優惠來源評估。
- **原始發現貼文（1 篇）：** [tastesoulsg/4482](https://t.me/tastesoulsg/4482)。
- **同篇原文外連（未逐店驗證關聯）：** [bit.ly/46TcSzK](http://bit.ly/46TcSzK)。
- **直接優惠來源：** 名冊尚未記錄已評估的官網／官方社群優惠 track；這不表示店家沒有官網。
- **門店／場地來源：** 本次盤點資料尚未記錄可用的完整官方目錄／runtime provider；需補充，不能由 Google 搜尋直接宣稱全店參與。
- **待補／阻礙：** 尚無已保存的直接優惠來源評估（`no_captured_direct_source_assessment`）。

<a id="merchant-134"></a>

### 134 · White Restaurant

- **狀態：** 未完成直接優惠來源評估。
- **原始發現貼文（1 篇）：** [sgfooddeals/4879](https://t.me/sgfooddeals/4879)。
- **同篇原文外連（未逐店驗證關聯）：** [tco.sg/6QoggzgFF](https://tco.sg/6QoggzgFF)、[tco.sg/dlFybU4ac](https://tco.sg/dlFybU4ac)、[tco.sg/p0fcsGKLO](https://tco.sg/p0fcsGKLO)、[tco.sg/qvdxn4dox](https://tco.sg/qvdxn4dox)、[tco.sg/vDrh4OQwD](https://tco.sg/vDrh4OQwD)。
- **直接優惠來源：** 名冊尚未記錄已評估的官網／官方社群優惠 track；這不表示店家沒有官網。
- **門店／場地來源：** 本次盤點資料尚未記錄可用的完整官方目錄／runtime provider；需補充，不能由 Google 搜尋直接宣稱全店參與。
- **待補／阻礙：** 尚無已保存的直接優惠來源評估（`no_captured_direct_source_assessment`）。

<a id="merchant-135"></a>

### 135 · Window on The Park

- **狀態：** 未完成直接優惠來源評估。
- **原始發現貼文（1 篇）：** [sgfooddeals/4882](https://t.me/sgfooddeals/4882)。
- **同篇原文外連（未逐店驗證關聯）：** [tco.sg/7103UMnKz](https://tco.sg/7103UMnKz)、[tco.sg/97OSlurTa](https://tco.sg/97OSlurTa)、[tco.sg/bpaapFAMo](https://tco.sg/bpaapFAMo)、[tco.sg/fDd6T5Bvo](https://tco.sg/fDd6T5Bvo)、[tco.sg/n1DPyldXG](https://tco.sg/n1DPyldXG)。
- **直接優惠來源：** 名冊尚未記錄已評估的官網／官方社群優惠 track；這不表示店家沒有官網。
- **門店／場地來源：** 本次盤點資料尚未記錄可用的完整官方目錄／runtime provider；需補充，不能由 Google 搜尋直接宣稱全店參與。
- **待補／阻礙：** 尚無已保存的直接優惠來源評估（`no_captured_direct_source_assessment`）。

<a id="merchant-136"></a>

### 136 · Yakiniku Like

- **狀態：** 未完成直接優惠來源評估。
- **原始發現貼文（1 篇）：** [tastesoulsg/4448](https://t.me/tastesoulsg/4448)。
- **同篇原文外連（未逐店驗證關聯）：** [bit.ly/4gAaMcy](http://bit.ly/4gAaMcy)。
- **直接優惠來源：** 名冊尚未記錄已評估的官網／官方社群優惠 track；這不表示店家沒有官網。
- **門店／場地來源：** 本次盤點資料尚未記錄可用的完整官方目錄／runtime provider；需補充，不能由 Google 搜尋直接宣稱全店參與。
- **待補／阻礙：** 尚無已保存的直接優惠來源評估（`no_captured_direct_source_assessment`）。

<a id="merchant-137"></a>

### 137 · Yo-Chi

- **狀態：** 未完成直接優惠來源評估。
- **原始發現貼文（1 篇）：** [sgfooddeals/4923](https://t.me/sgfooddeals/4923)。
- **同篇原文外連（未逐店驗證關聯）：** [tco.sg/circlelifeychixsgfd](http://tco.sg/circlelifeychixsgfd)。
- **直接優惠來源：** 名冊尚未記錄已評估的官網／官方社群優惠 track；這不表示店家沒有官網。
- **門店／場地來源：** 本次盤點資料尚未記錄可用的完整官方目錄／runtime provider；需補充，不能由 Google 搜尋直接宣稱全店參與。
- **待補／阻礙：** 尚無已保存的直接優惠來源評估（`no_captured_direct_source_assessment`）。

<a id="merchant-138"></a>

### 138 · Zapangi Coffee

- **狀態：** 未完成直接優惠來源評估。
- **原始發現貼文（1 篇）：** [tastesoulsg/4444](https://t.me/tastesoulsg/4444)。
- **同篇原文外連（未逐店驗證關聯）：** [bit.ly/4zD74Yh](http://bit.ly/4zD74Yh)。
- **直接優惠來源：** 名冊尚未記錄已評估的官網／官方社群優惠 track；這不表示店家沒有官網。
- **門店／場地來源：** 本次盤點資料尚未記錄可用的完整官方目錄／runtime provider；需補充，不能由 Google 搜尋直接宣稱全店參與。
- **待補／阻礙：** 尚無已保存的直接優惠來源評估（`no_captured_direct_source_assessment`）。

## 通用獨立來源研究入口（19 個）

這些入口來自 revision 6 的研究監測 registry。它們可發現多家店的優惠，尚未接成直接來源的正式入庫橋接；本次沒有啟動或變更監測排程，也沒有查證目前 process 是否在運行。研究核心來源只有 ConfirmGood、Eatbook、EverydayOnSales，其餘為 supplemental。來源沒有日期或列舉有缺口時，仍須保留未知。

| source ID                  | 入口                                                                                                                                                                                                   | 類型                                | 研究角色           | registry 列舉標記          | 限制                                                                                                                                                                                              |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------- | ------------------ | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `singpromos_ongoing`       | [singpromos.com/bydate/ontoday/](https://singpromos.com/bydate/ontoday/)                                                                                                                               | `publisher_active_index`            | `supplemental`     | 可列舉（有邊界／上限）     | Current listing enumeration does not prove downtime history traversal.                                                                                                                            |
| `confirmgood_deals`        | [confirmgood.com/post/category/deals/](https://confirmgood.com/post/category/deals/)                                                                                                                   | `publisher_date_archive`            | `core_replacement` | 可列舉（有邊界／上限）     | Complete-capable only: durable checkpoint, crossed boundary, verified overlap/order/pagination, no cap or listing failure. Every recovery must prove completeness; capability alone is not proof. |
| `eatbook_deals`            | [eatbook.sg/category/news/deals/](https://eatbook.sg/category/news/deals/)                                                                                                                             | `publisher_date_archive`            | `core_replacement` | 可列舉（有邊界／上限）     | Complete-capable only: durable checkpoint, crossed boundary, verified overlap/order/pagination, no cap or listing failure. Every recovery must prove completeness; capability alone is not proof. |
| `mustsharenews_deals`      | [mustsharenews.com/category/deals/](https://mustsharenews.com/category/deals/)                                                                                                                         | `publisher_date_archive`            | `supplemental`     | 可列舉（有邊界／上限）     | Current listing enumeration does not prove downtime history traversal.                                                                                                                            |
| `everydayonsales_food`     | [sg.everydayonsales.com/sales-category/food-restaurant-pub/](https://sg.everydayonsales.com/sales-category/food-restaurant-pub/)                                                                       | `secondary_date_archive`            | `core_replacement` | 可列舉（有邊界／上限）     | Complete-capable only: durable checkpoint, crossed boundary, verified overlap/order/pagination, no cap or listing failure. Every recovery must prove completeness; capability alone is not proof. |
| `great_world_promotions`   | [shop.greatworld.com.sg/happenings/promotions/](https://shop.greatworld.com.sg/happenings/promotions/)                                                                                                 | `mall_active_index`                 | `supplemental`     | 可列舉（有邊界／上限）     | Current listing enumeration does not prove downtime history traversal.                                                                                                                            |
| `capitaland_mall_deals`    | [www.capitaland.com/sg/en/shop/malls/deals.html](https://www.capitaland.com/sg/en/shop/malls/deals.html)                                                                                               | `mall_index_probe`                  | `supplemental`     | 探查入口，未證明可完整列舉 | Current listing enumeration does not prove downtime history traversal.                                                                                                                            |
| `jewel_general_promotions` | [www.jewelchangiairport.com/en/promotion.html](https://www.jewelchangiairport.com/en/promotion.html)                                                                                                   | `mall_index_probe`                  | `supplemental`     | 探查入口，未證明可完整列舉 | Current listing enumeration does not prove downtime history traversal.                                                                                                                            |
| `jewel_student_privileges` | [www.jewelchangiairport.com/en/promotion/Student-Privileges.html](https://www.jewelchangiairport.com/en/promotion/Student-Privileges.html)                                                             | `mall_programme_directory`          | `supplemental`     | 可列舉（有邊界／上限）     | Current listing enumeration does not prove downtime history traversal.                                                                                                                            |
| `jewel_ticket_privileges`  | [www.jewelchangiairport.com/en/promotion/exclusively-for-jewel-attractions-ticket-holders.html](https://www.jewelchangiairport.com/en/promotion/exclusively-for-jewel-attractions-ticket-holders.html) | `mall_programme_directory`          | `supplemental`     | 可列舉（有邊界／上限）     | Current listing enumeration does not prove downtime history traversal.                                                                                                                            |
| `singapore_river_festival` | [www.srf.sg/promotions/](https://www.srf.sg/promotions/)                                                                                                                                               | `festival_promotion_directory`      | `supplemental`     | 可列舉（有邊界／上限）     | Current listing enumeration does not prove downtime history traversal.                                                                                                                            |
| `grab_promo_codes`         | [www.grab.com/sg/campaign/grab-promo-codes/](https://www.grab.com/sg/campaign/grab-promo-codes/)                                                                                                       | `official_campaign_table`           | `supplemental`     | 可列舉（有邊界／上限）     | Current listing enumeration does not prove downtime history traversal.                                                                                                                            |
| `grab_full_house`          | [www.grab.com/sg/full-house-mission/](https://www.grab.com/sg/full-house-mission/)                                                                                                                     | `official_campaign_probe`           | `supplemental`     | 探查入口，未證明可完整列舉 | Current listing enumeration does not prove downtime history traversal.                                                                                                                            |
| `grab_dineout_directory`   | [dineout.grab.com/sg/en](https://dineout.grab.com/sg/en)                                                                                                                                               | `official_location_directory_probe` | `supplemental`     | 探查入口，未證明可完整列舉 | Current listing enumeration does not prove downtime history traversal.                                                                                                                            |
| `divedeals_food`           | [divedeals.sg/](https://divedeals.sg/)                                                                                                                                                                 | `secondary_deal_directory`          | `supplemental`     | 可列舉（有邊界／上限）     | Current listing enumeration does not prove downtime history traversal.                                                                                                                            |
| `hsbc_dining`              | [cardpromotions.hsbc.com.sg/dining/whats-new/](https://cardpromotions.hsbc.com.sg/dining/whats-new/)                                                                                                   | `official_card_dining_directory`    | `supplemental`     | 可列舉（有邊界／上限）     | Current listing enumeration does not prove downtime history traversal.                                                                                                                            |
| `syioknya_central_food`    | [sg.syioknya.com/location/promotion/japanese-food/central-region/](https://sg.syioknya.com/location/promotion/japanese-food/central-region/)                                                           | `secondary_location_directory`      | `supplemental`     | 可列舉（有邊界／上限）     | Current listing enumeration does not prove downtime history traversal.                                                                                                                            |
| `ordinary_patrons_news`    | [ordinarypatrons.com/fb-news-and-deals/](https://ordinarypatrons.com/fb-news-and-deals/)                                                                                                               | `publisher_rolling_roundup`         | `supplemental`     | 可列舉（有邊界／上限）     | Current listing enumeration does not prove downtime history traversal.                                                                                                                            |
| `misslobang_roundup`       | [www.misslobang.com/](https://www.misslobang.com/)                                                                                                                                                     | `publisher_roundup_probe`           | `supplemental`     | 探查入口，未證明可完整列舉 | Current listing enumeration does not prove downtime history traversal.                                                                                                                            |

## 附錄：67 筆店家身份待確認紀錄

每列保留一筆原名冊 unresolved record，包括同篇貼文中的不同優惠。空白店名、名稱夾入網址的解析結果、平台 roundup 均未自行正規化成新店家。以下標籤可以作為人工查找線索，還不具有已確認店家身份。

| 編號 | 原始店家標籤                          | 原始貼文                                          | 原文標題線索                                                                                                                                                                                                           | 原文外連                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | 記錄 ID                                                                   |
| ---: | ------------------------------------- | ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
|    1 | 空白／未解析                          | [sgfooddeals/4884](https://t.me/sgfooddeals/4884) | 未記錄                                                                                                                                                                                                                 | [tco.sg/5eFeOHp65](https://tco.sg/5eFeOHp65)、[tco.sg/BYQIWO4pR](https://tco.sg/BYQIWO4pR)、[tco.sg/IBS14YCvt](https://tco.sg/IBS14YCvt)、[tco.sg/NJCCXBj83](https://tco.sg/NJCCXBj83)、[tco.sg/RZcDfmjdP](https://tco.sg/RZcDfmjdP)、[tco.sg/XDsndrIbx](https://tco.sg/XDsndrIbx)                                                                                                                                                                                                                                   | `reviewed:0491417a-92d0-5c7b-a1cc-47f5cee368a1`                           |
|    2 | 空白／未解析                          | [tastesoulsg/4475](https://t.me/tastesoulsg/4475) | Up to 15% OFF your total bill with Grab Dine Out at Moonchild, La Levain & more!                                                                                                                                       | [bit.ly/4dlK4U7](http://bit.ly/4dlK4U7)                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | `reviewed:0ec7ecd0-2cbe-567a-afaa-760cdf96ecf1`                           |
|    3 | 空白／未解析                          | [sgfooddeals/4917](https://t.me/sgfooddeals/4917) | 未記錄                                                                                                                                                                                                                 | [t.me/sgweekend](https://t.me/sgweekend)、[tco.sg/0iKeDLsgR](https://tco.sg/0iKeDLsgR)、[tco.sg/5hZMHuxsd](https://tco.sg/5hZMHuxsd)、[tco.sg/PL07GIq41](https://tco.sg/PL07GIq41)、[tco.sg/Q2ZGfJu1X](https://tco.sg/Q2ZGfJu1X)、[tco.sg/U2p4RYCRI](https://tco.sg/U2p4RYCRI)、[tco.sg/UwtNQlzpk](https://tco.sg/UwtNQlzpk)、[tco.sg/doDZJoWzG](https://tco.sg/doDZJoWzG)、[tco.sg/gQXgss9Ip](https://tco.sg/gQXgss9Ip)、[tco.sg/ngjuYXlOu](https://tco.sg/ngjuYXlOu)、[tco.sg/tqxozRgxH](https://tco.sg/tqxozRgxH) | `reviewed:116ca8f6-dba6-5fb5-af9d-4c0514db250e`                           |
|    4 | 空白／未解析                          | [sgfooddeals/4909](https://t.me/sgfooddeals/4909) | 未記錄                                                                                                                                                                                                                 | [tco.sg/brandsjellyxsgfd](http://tco.sg/brandsjellyxsgfd)、[t.me/sgfooddealssg](https://t.me/sgfooddealssg)                                                                                                                                                                                                                                                                                                                                                                                                          | `reviewed:1a51e784-f95b-5537-a866-5907bf01aa64`                           |
|    5 | 空白／未解析                          | [sgfooddeals/4921](https://t.me/sgfooddeals/4921) | 未記錄                                                                                                                                                                                                                 | [tco.sg/9a7ZvObJ2](https://tco.sg/9a7ZvObJ2)、[tco.sg/KjdnMo3kJ](https://tco.sg/KjdnMo3kJ)、[tco.sg/NnEbPe5Lq](https://tco.sg/NnEbPe5Lq)、[tco.sg/RTy6GvixK](https://tco.sg/RTy6GvixK)、[tco.sg/h9SiZox4d](https://tco.sg/h9SiZox4d)、[tco.sg/vA65A7AVr](https://tco.sg/vA65A7AVr)                                                                                                                                                                                                                                   | `reviewed:387ee731-ebab-5f5b-ac90-0e8ec1bc86a0`                           |
|    6 | 空白／未解析                          | [sgfooddeals/4930](https://t.me/sgfooddeals/4930) | 未記錄                                                                                                                                                                                                                 | [tco.sg/ywIh02WYN](http://tco.sg/ywIh02WYN)                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | `reviewed:45910e22-329a-566c-a633-f03160f660b8`                           |
|    7 | 空白／未解析                          | [sgfooddeals/4884](https://t.me/sgfooddeals/4884) | 未記錄                                                                                                                                                                                                                 | [tco.sg/5eFeOHp65](https://tco.sg/5eFeOHp65)、[tco.sg/BYQIWO4pR](https://tco.sg/BYQIWO4pR)、[tco.sg/IBS14YCvt](https://tco.sg/IBS14YCvt)、[tco.sg/NJCCXBj83](https://tco.sg/NJCCXBj83)、[tco.sg/RZcDfmjdP](https://tco.sg/RZcDfmjdP)、[tco.sg/XDsndrIbx](https://tco.sg/XDsndrIbx)                                                                                                                                                                                                                                   | `reviewed:513c40d7-9ca9-5ffb-a1b2-fd63ee418949`                           |
|    8 | 空白／未解析                          | [sgfooddeals/4880](https://t.me/sgfooddeals/4880) | 未記錄                                                                                                                                                                                                                 | [tco.sg/mbscharityxsgfd](http://tco.sg/mbscharityxsgfd)、[tco.sg/mbsawwa](https://tco.sg/mbsawwa)                                                                                                                                                                                                                                                                                                                                                                                                                    | `reviewed:5637306f-5e37-5389-aa72-cf688debaf33`                           |
|    9 | 空白／未解析                          | [sgfooddeals/4917](https://t.me/sgfooddeals/4917) | 未記錄                                                                                                                                                                                                                 | [t.me/sgweekend](https://t.me/sgweekend)、[tco.sg/0iKeDLsgR](https://tco.sg/0iKeDLsgR)、[tco.sg/5hZMHuxsd](https://tco.sg/5hZMHuxsd)、[tco.sg/PL07GIq41](https://tco.sg/PL07GIq41)、[tco.sg/Q2ZGfJu1X](https://tco.sg/Q2ZGfJu1X)、[tco.sg/U2p4RYCRI](https://tco.sg/U2p4RYCRI)、[tco.sg/UwtNQlzpk](https://tco.sg/UwtNQlzpk)、[tco.sg/doDZJoWzG](https://tco.sg/doDZJoWzG)、[tco.sg/gQXgss9Ip](https://tco.sg/gQXgss9Ip)、[tco.sg/ngjuYXlOu](https://tco.sg/ngjuYXlOu)、[tco.sg/tqxozRgxH](https://tco.sg/tqxozRgxH) | `reviewed:6065be9d-e369-5162-abe6-58ab2c5258be`                           |
|   10 | 空白／未解析                          | [sgfooddeals/4884](https://t.me/sgfooddeals/4884) | 未記錄                                                                                                                                                                                                                 | [tco.sg/5eFeOHp65](https://tco.sg/5eFeOHp65)、[tco.sg/BYQIWO4pR](https://tco.sg/BYQIWO4pR)、[tco.sg/IBS14YCvt](https://tco.sg/IBS14YCvt)、[tco.sg/NJCCXBj83](https://tco.sg/NJCCXBj83)、[tco.sg/RZcDfmjdP](https://tco.sg/RZcDfmjdP)、[tco.sg/XDsndrIbx](https://tco.sg/XDsndrIbx)                                                                                                                                                                                                                                   | `reviewed:629350a3-1a4f-5846-a59e-c1d15d5200dc`                           |
|   11 | 空白／未解析                          | [sgfooddeals/4913](https://t.me/sgfooddeals/4913) | 未記錄                                                                                                                                                                                                                 | [tco.sg/T3AJyOv1b](http://tco.sg/T3AJyOv1b)、[t.me/sgweekend](https://t.me/sgweekend)                                                                                                                                                                                                                                                                                                                                                                                                                                | `reviewed:697b1e55-4a67-5519-a7ca-c274bbce89ed`                           |
|   12 | 空白／未解析                          | [sgfooddeals/4921](https://t.me/sgfooddeals/4921) | 未記錄                                                                                                                                                                                                                 | [tco.sg/9a7ZvObJ2](https://tco.sg/9a7ZvObJ2)、[tco.sg/KjdnMo3kJ](https://tco.sg/KjdnMo3kJ)、[tco.sg/NnEbPe5Lq](https://tco.sg/NnEbPe5Lq)、[tco.sg/RTy6GvixK](https://tco.sg/RTy6GvixK)、[tco.sg/h9SiZox4d](https://tco.sg/h9SiZox4d)、[tco.sg/vA65A7AVr](https://tco.sg/vA65A7AVr)                                                                                                                                                                                                                                   | `reviewed:6c9c9cda-245b-5b39-a973-b5d2602d2482`                           |
|   13 | 空白／未解析                          | [sgfooddeals/4934](https://t.me/sgfooddeals/4934) | 未記錄                                                                                                                                                                                                                 | [tco.sg/grabperksxsgfd](http://tco.sg/grabperksxsgfd)                                                                                                                                                                                                                                                                                                                                                                                                                                                                | `reviewed:73e4b6b6-b2e0-5926-a592-c994b385e189`                           |
|   14 | 空白／未解析                          | [sgfooddeals/4909](https://t.me/sgfooddeals/4909) | 未記錄                                                                                                                                                                                                                 | [tco.sg/brandsjellyxsgfd](http://tco.sg/brandsjellyxsgfd)、[t.me/sgfooddealssg](https://t.me/sgfooddealssg)                                                                                                                                                                                                                                                                                                                                                                                                          | `reviewed:75b2e30d-30ee-5045-abb2-716f1c17f8d1`                           |
|   15 | 空白／未解析                          | [sgfooddeals/4917](https://t.me/sgfooddeals/4917) | 未記錄                                                                                                                                                                                                                 | [t.me/sgweekend](https://t.me/sgweekend)、[tco.sg/0iKeDLsgR](https://tco.sg/0iKeDLsgR)、[tco.sg/5hZMHuxsd](https://tco.sg/5hZMHuxsd)、[tco.sg/PL07GIq41](https://tco.sg/PL07GIq41)、[tco.sg/Q2ZGfJu1X](https://tco.sg/Q2ZGfJu1X)、[tco.sg/U2p4RYCRI](https://tco.sg/U2p4RYCRI)、[tco.sg/UwtNQlzpk](https://tco.sg/UwtNQlzpk)、[tco.sg/doDZJoWzG](https://tco.sg/doDZJoWzG)、[tco.sg/gQXgss9Ip](https://tco.sg/gQXgss9Ip)、[tco.sg/ngjuYXlOu](https://tco.sg/ngjuYXlOu)、[tco.sg/tqxozRgxH](https://tco.sg/tqxozRgxH) | `reviewed:7637745d-9879-5c17-a6e2-a1b0f7a87a9d`                           |
|   16 | 空白／未解析                          | [sgfooddeals/4921](https://t.me/sgfooddeals/4921) | 未記錄                                                                                                                                                                                                                 | [tco.sg/9a7ZvObJ2](https://tco.sg/9a7ZvObJ2)、[tco.sg/KjdnMo3kJ](https://tco.sg/KjdnMo3kJ)、[tco.sg/NnEbPe5Lq](https://tco.sg/NnEbPe5Lq)、[tco.sg/RTy6GvixK](https://tco.sg/RTy6GvixK)、[tco.sg/h9SiZox4d](https://tco.sg/h9SiZox4d)、[tco.sg/vA65A7AVr](https://tco.sg/vA65A7AVr)                                                                                                                                                                                                                                   | `reviewed:7c71d767-7624-5961-ab0c-27b32c318f93`                           |
|   17 | 空白／未解析                          | [sgfooddeals/4921](https://t.me/sgfooddeals/4921) | 未記錄                                                                                                                                                                                                                 | [tco.sg/9a7ZvObJ2](https://tco.sg/9a7ZvObJ2)、[tco.sg/KjdnMo3kJ](https://tco.sg/KjdnMo3kJ)、[tco.sg/NnEbPe5Lq](https://tco.sg/NnEbPe5Lq)、[tco.sg/RTy6GvixK](https://tco.sg/RTy6GvixK)、[tco.sg/h9SiZox4d](https://tco.sg/h9SiZox4d)、[tco.sg/vA65A7AVr](https://tco.sg/vA65A7AVr)                                                                                                                                                                                                                                   | `reviewed:7de120dc-578c-518a-a5e9-a26341e776a0`                           |
|   18 | 空白／未解析                          | [sgfooddeals/4876](https://t.me/sgfooddeals/4876) | 未記錄                                                                                                                                                                                                                 | [tco.sg/0I9J7mmCZ](https://tco.sg/0I9J7mmCZ)、[tco.sg/4lEc5ro9y](https://tco.sg/4lEc5ro9y)、[tco.sg/7t07px6Ez](https://tco.sg/7t07px6Ez)、[tco.sg/Qm0ItNPNa](https://tco.sg/Qm0ItNPNa)、[tco.sg/tytPCTqjp](https://tco.sg/tytPCTqjp)                                                                                                                                                                                                                                                                                 | `reviewed:7f205b4c-889b-5d32-a9a9-52f4bfce7af4`                           |
|   19 | 空白／未解析                          | [sgfooddeals/4889](https://t.me/sgfooddeals/4889) | manual review required.\]                                                                                                                                                                                              | 未記錄                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | `reviewed:874236b7-bf42-58be-a593-169e3ccbc500`                           |
|   20 | 空白／未解析                          | [sgfooddeals/4917](https://t.me/sgfooddeals/4917) | 未記錄                                                                                                                                                                                                                 | [t.me/sgweekend](https://t.me/sgweekend)、[tco.sg/0iKeDLsgR](https://tco.sg/0iKeDLsgR)、[tco.sg/5hZMHuxsd](https://tco.sg/5hZMHuxsd)、[tco.sg/PL07GIq41](https://tco.sg/PL07GIq41)、[tco.sg/Q2ZGfJu1X](https://tco.sg/Q2ZGfJu1X)、[tco.sg/U2p4RYCRI](https://tco.sg/U2p4RYCRI)、[tco.sg/UwtNQlzpk](https://tco.sg/UwtNQlzpk)、[tco.sg/doDZJoWzG](https://tco.sg/doDZJoWzG)、[tco.sg/gQXgss9Ip](https://tco.sg/gQXgss9Ip)、[tco.sg/ngjuYXlOu](https://tco.sg/ngjuYXlOu)、[tco.sg/tqxozRgxH](https://tco.sg/tqxozRgxH) | `reviewed:8b88cba3-7314-54e3-a22b-313838f31e94`                           |
|   21 | 空白／未解析                          | [sgfooddeals/4903](https://t.me/sgfooddeals/4903) | 未記錄                                                                                                                                                                                                                 | [tco.sg/UNhXWSmHa](http://tco.sg/UNhXWSmHa)                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | `reviewed:8dc6284c-6b2f-5157-a4d3-2640f1544963`                           |
|   22 | 空白／未解析                          | [sgfooddeals/4888](https://t.me/sgfooddeals/4888) | 未記錄                                                                                                                                                                                                                 | [tco.sg/mGzRxVnrV](http://tco.sg/mGzRxVnrV)                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | `reviewed:9c3083d2-4d87-5ce6-a4cf-b50726a6b25c`                           |
|   23 | 空白／未解析                          | [sgfooddeals/4917](https://t.me/sgfooddeals/4917) | 未記錄                                                                                                                                                                                                                 | [t.me/sgweekend](https://t.me/sgweekend)、[tco.sg/0iKeDLsgR](https://tco.sg/0iKeDLsgR)、[tco.sg/5hZMHuxsd](https://tco.sg/5hZMHuxsd)、[tco.sg/PL07GIq41](https://tco.sg/PL07GIq41)、[tco.sg/Q2ZGfJu1X](https://tco.sg/Q2ZGfJu1X)、[tco.sg/U2p4RYCRI](https://tco.sg/U2p4RYCRI)、[tco.sg/UwtNQlzpk](https://tco.sg/UwtNQlzpk)、[tco.sg/doDZJoWzG](https://tco.sg/doDZJoWzG)、[tco.sg/gQXgss9Ip](https://tco.sg/gQXgss9Ip)、[tco.sg/ngjuYXlOu](https://tco.sg/ngjuYXlOu)、[tco.sg/tqxozRgxH](https://tco.sg/tqxozRgxH) | `reviewed:9f23b919-c2f2-50ac-aeee-fc609581f246`                           |
|   24 | 空白／未解析                          | [sgfooddeals/4917](https://t.me/sgfooddeals/4917) | 未記錄                                                                                                                                                                                                                 | [t.me/sgweekend](https://t.me/sgweekend)、[tco.sg/0iKeDLsgR](https://tco.sg/0iKeDLsgR)、[tco.sg/5hZMHuxsd](https://tco.sg/5hZMHuxsd)、[tco.sg/PL07GIq41](https://tco.sg/PL07GIq41)、[tco.sg/Q2ZGfJu1X](https://tco.sg/Q2ZGfJu1X)、[tco.sg/U2p4RYCRI](https://tco.sg/U2p4RYCRI)、[tco.sg/UwtNQlzpk](https://tco.sg/UwtNQlzpk)、[tco.sg/doDZJoWzG](https://tco.sg/doDZJoWzG)、[tco.sg/gQXgss9Ip](https://tco.sg/gQXgss9Ip)、[tco.sg/ngjuYXlOu](https://tco.sg/ngjuYXlOu)、[tco.sg/tqxozRgxH](https://tco.sg/tqxozRgxH) | `reviewed:9fe59a2c-e0ad-5840-a3b4-ab29b0baa489`                           |
|   25 | 空白／未解析                          | [sgfooddeals/4917](https://t.me/sgfooddeals/4917) | 未記錄                                                                                                                                                                                                                 | [t.me/sgweekend](https://t.me/sgweekend)、[tco.sg/0iKeDLsgR](https://tco.sg/0iKeDLsgR)、[tco.sg/5hZMHuxsd](https://tco.sg/5hZMHuxsd)、[tco.sg/PL07GIq41](https://tco.sg/PL07GIq41)、[tco.sg/Q2ZGfJu1X](https://tco.sg/Q2ZGfJu1X)、[tco.sg/U2p4RYCRI](https://tco.sg/U2p4RYCRI)、[tco.sg/UwtNQlzpk](https://tco.sg/UwtNQlzpk)、[tco.sg/doDZJoWzG](https://tco.sg/doDZJoWzG)、[tco.sg/gQXgss9Ip](https://tco.sg/gQXgss9Ip)、[tco.sg/ngjuYXlOu](https://tco.sg/ngjuYXlOu)、[tco.sg/tqxozRgxH](https://tco.sg/tqxozRgxH) | `reviewed:a251e440-1d01-55ac-a7e4-e86b19ad299e`                           |
|   26 | 空白／未解析                          | [sgfooddeals/4917](https://t.me/sgfooddeals/4917) | 未記錄                                                                                                                                                                                                                 | [t.me/sgweekend](https://t.me/sgweekend)、[tco.sg/0iKeDLsgR](https://tco.sg/0iKeDLsgR)、[tco.sg/5hZMHuxsd](https://tco.sg/5hZMHuxsd)、[tco.sg/PL07GIq41](https://tco.sg/PL07GIq41)、[tco.sg/Q2ZGfJu1X](https://tco.sg/Q2ZGfJu1X)、[tco.sg/U2p4RYCRI](https://tco.sg/U2p4RYCRI)、[tco.sg/UwtNQlzpk](https://tco.sg/UwtNQlzpk)、[tco.sg/doDZJoWzG](https://tco.sg/doDZJoWzG)、[tco.sg/gQXgss9Ip](https://tco.sg/gQXgss9Ip)、[tco.sg/ngjuYXlOu](https://tco.sg/ngjuYXlOu)、[tco.sg/tqxozRgxH](https://tco.sg/tqxozRgxH) | `reviewed:bdc9aa4f-ed5e-5bdc-a7b1-951fbb5bd265`                           |
|   27 | 空白／未解析                          | [sgfooddeals/4884](https://t.me/sgfooddeals/4884) | 未記錄                                                                                                                                                                                                                 | [tco.sg/5eFeOHp65](https://tco.sg/5eFeOHp65)、[tco.sg/BYQIWO4pR](https://tco.sg/BYQIWO4pR)、[tco.sg/IBS14YCvt](https://tco.sg/IBS14YCvt)、[tco.sg/NJCCXBj83](https://tco.sg/NJCCXBj83)、[tco.sg/RZcDfmjdP](https://tco.sg/RZcDfmjdP)、[tco.sg/XDsndrIbx](https://tco.sg/XDsndrIbx)                                                                                                                                                                                                                                   | `reviewed:bdd48f65-6e46-5c6a-a4ad-20b3903d856d`                           |
|   28 | 空白／未解析                          | [sgfooddeals/4871](https://t.me/sgfooddeals/4871) | 未記錄                                                                                                                                                                                                                 | [tco.sg/Vm5ANIsJy](http://tco.sg/Vm5ANIsJy)                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | `reviewed:bf5eaca0-1b09-5cdb-a1a3-0bb5b5fc6d47`                           |
|   29 | 空白／未解析                          | [sgfooddeals/4917](https://t.me/sgfooddeals/4917) | 未記錄                                                                                                                                                                                                                 | [t.me/sgweekend](https://t.me/sgweekend)、[tco.sg/0iKeDLsgR](https://tco.sg/0iKeDLsgR)、[tco.sg/5hZMHuxsd](https://tco.sg/5hZMHuxsd)、[tco.sg/PL07GIq41](https://tco.sg/PL07GIq41)、[tco.sg/Q2ZGfJu1X](https://tco.sg/Q2ZGfJu1X)、[tco.sg/U2p4RYCRI](https://tco.sg/U2p4RYCRI)、[tco.sg/UwtNQlzpk](https://tco.sg/UwtNQlzpk)、[tco.sg/doDZJoWzG](https://tco.sg/doDZJoWzG)、[tco.sg/gQXgss9Ip](https://tco.sg/gQXgss9Ip)、[tco.sg/ngjuYXlOu](https://tco.sg/ngjuYXlOu)、[tco.sg/tqxozRgxH](https://tco.sg/tqxozRgxH) | `reviewed:c35cea11-a53d-5fce-a771-93b7f9a610a6`                           |
|   30 | 空白／未解析                          | [sgfooddeals/4884](https://t.me/sgfooddeals/4884) | 未記錄                                                                                                                                                                                                                 | [tco.sg/5eFeOHp65](https://tco.sg/5eFeOHp65)、[tco.sg/BYQIWO4pR](https://tco.sg/BYQIWO4pR)、[tco.sg/IBS14YCvt](https://tco.sg/IBS14YCvt)、[tco.sg/NJCCXBj83](https://tco.sg/NJCCXBj83)、[tco.sg/RZcDfmjdP](https://tco.sg/RZcDfmjdP)、[tco.sg/XDsndrIbx](https://tco.sg/XDsndrIbx)                                                                                                                                                                                                                                   | `reviewed:cc56581e-177c-543d-a10a-01116c44f74f`                           |
|   31 | 空白／未解析                          | [sgfooddeals/4921](https://t.me/sgfooddeals/4921) | 未記錄                                                                                                                                                                                                                 | [tco.sg/9a7ZvObJ2](https://tco.sg/9a7ZvObJ2)、[tco.sg/KjdnMo3kJ](https://tco.sg/KjdnMo3kJ)、[tco.sg/NnEbPe5Lq](https://tco.sg/NnEbPe5Lq)、[tco.sg/RTy6GvixK](https://tco.sg/RTy6GvixK)、[tco.sg/h9SiZox4d](https://tco.sg/h9SiZox4d)、[tco.sg/vA65A7AVr](https://tco.sg/vA65A7AVr)                                                                                                                                                                                                                                   | `reviewed:cd905a2b-cc88-5c87-a882-55b2708b523f`                           |
|   32 | 空白／未解析                          | [sgfooddeals/4876](https://t.me/sgfooddeals/4876) | 未記錄                                                                                                                                                                                                                 | [tco.sg/0I9J7mmCZ](https://tco.sg/0I9J7mmCZ)、[tco.sg/4lEc5ro9y](https://tco.sg/4lEc5ro9y)、[tco.sg/7t07px6Ez](https://tco.sg/7t07px6Ez)、[tco.sg/Qm0ItNPNa](https://tco.sg/Qm0ItNPNa)、[tco.sg/tytPCTqjp](https://tco.sg/tytPCTqjp)                                                                                                                                                                                                                                                                                 | `reviewed:d21c2122-fdb0-5d96-ad63-0abb282ace25`                           |
|   33 | 空白／未解析                          | [sgfooddeals/4919](https://t.me/sgfooddeals/4919) | 未記錄                                                                                                                                                                                                                 | [tco.sg/A3U7K6XoV](http://tco.sg/A3U7K6XoV)、[t.me/sgadulting101](https://t.me/sgadulting101)、[tco.sg/WPOvYfNat](https://tco.sg/WPOvYfNat)                                                                                                                                                                                                                                                                                                                                                                          | `reviewed:d48eceda-1ced-55b7-a057-a42dee2d0960`                           |
|   34 | 空白／未解析                          | [sgfooddeals/4921](https://t.me/sgfooddeals/4921) | 未記錄                                                                                                                                                                                                                 | [tco.sg/9a7ZvObJ2](https://tco.sg/9a7ZvObJ2)、[tco.sg/KjdnMo3kJ](https://tco.sg/KjdnMo3kJ)、[tco.sg/NnEbPe5Lq](https://tco.sg/NnEbPe5Lq)、[tco.sg/RTy6GvixK](https://tco.sg/RTy6GvixK)、[tco.sg/h9SiZox4d](https://tco.sg/h9SiZox4d)、[tco.sg/vA65A7AVr](https://tco.sg/vA65A7AVr)                                                                                                                                                                                                                                   | `reviewed:d80a6e74-ca65-58af-a6dc-94a41fc5ccb6`                           |
|   35 | 空白／未解析                          | [sgfooddeals/4876](https://t.me/sgfooddeals/4876) | 未記錄                                                                                                                                                                                                                 | [tco.sg/0I9J7mmCZ](https://tco.sg/0I9J7mmCZ)、[tco.sg/4lEc5ro9y](https://tco.sg/4lEc5ro9y)、[tco.sg/7t07px6Ez](https://tco.sg/7t07px6Ez)、[tco.sg/Qm0ItNPNa](https://tco.sg/Qm0ItNPNa)、[tco.sg/tytPCTqjp](https://tco.sg/tytPCTqjp)                                                                                                                                                                                                                                                                                 | `reviewed:da48cc8e-5233-528c-a763-60a5efae344e`                           |
|   36 | 空白／未解析                          | [sgfooddeals/4876](https://t.me/sgfooddeals/4876) | 未記錄                                                                                                                                                                                                                 | [tco.sg/0I9J7mmCZ](https://tco.sg/0I9J7mmCZ)、[tco.sg/4lEc5ro9y](https://tco.sg/4lEc5ro9y)、[tco.sg/7t07px6Ez](https://tco.sg/7t07px6Ez)、[tco.sg/Qm0ItNPNa](https://tco.sg/Qm0ItNPNa)、[tco.sg/tytPCTqjp](https://tco.sg/tytPCTqjp)                                                                                                                                                                                                                                                                                 | `reviewed:ddd69ba4-447f-59e8-a7c2-80b962eef5a4`                           |
|   37 | 空白／未解析                          | [sgfooddeals/4876](https://t.me/sgfooddeals/4876) | 未記錄                                                                                                                                                                                                                 | [tco.sg/0I9J7mmCZ](https://tco.sg/0I9J7mmCZ)、[tco.sg/4lEc5ro9y](https://tco.sg/4lEc5ro9y)、[tco.sg/7t07px6Ez](https://tco.sg/7t07px6Ez)、[tco.sg/Qm0ItNPNa](https://tco.sg/Qm0ItNPNa)、[tco.sg/tytPCTqjp](https://tco.sg/tytPCTqjp)                                                                                                                                                                                                                                                                                 | `reviewed:e0a18fca-b2f2-58fe-a41a-702d1b9e4f06`                           |
|   38 | 空白／未解析                          | [sgfooddeals/4878](https://t.me/sgfooddeals/4878) | 未記錄                                                                                                                                                                                                                 | [tco.sg/8rfTOW3gh](https://tco.sg/8rfTOW3gh)                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | `reviewed:f763a80f-f5ff-5880-ad88-695ca5c44cad`                           |
|   39 | 空白／未解析                          | [sgfooddeals/4884](https://t.me/sgfooddeals/4884) | 未記錄                                                                                                                                                                                                                 | [tco.sg/5eFeOHp65](https://tco.sg/5eFeOHp65)、[tco.sg/BYQIWO4pR](https://tco.sg/BYQIWO4pR)、[tco.sg/IBS14YCvt](https://tco.sg/IBS14YCvt)、[tco.sg/NJCCXBj83](https://tco.sg/NJCCXBj83)、[tco.sg/RZcDfmjdP](https://tco.sg/RZcDfmjdP)、[tco.sg/XDsndrIbx](https://tco.sg/XDsndrIbx)                                                                                                                                                                                                                                   | `reviewed:fbb7927c-367d-5fc8-aa72-7e8d929a50d4`                           |
|   40 | 空白／未解析                          | [tastesoulsg/4489](https://t.me/tastesoulsg/4489) | 未記錄                                                                                                                                                                                                                 | [bit.ly/4r9MfzQ](http://bit.ly/4r9MfzQ)                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | `signal:08fccdf2a832d1eb57d592cc8d1b7e2c44c5d98e813c3d6f4ea7e3a48ea0b147` |
|   41 | BBRC Cafe Set Meal (https             | [sgfooddeals/4940](https://t.me/sgfooddeals/4940) | //tco.sg/5vXdQ0mXj) ／ //tco.sg/8zCH6BE3j) ／ //tco.sg/PBcgXrqA2) ／ //tco.sg/V6ViWP149) ／ //tco.sg/gBzs5A1yo) ／ //tco.sg/q81wOC8Ep) ／ //tco.sg/yUxhAaOdw)                                                          | [tco.sg/PBcgXrqA2](http://tco.sg/PBcgXrqA2)、[tco.sg/5vXdQ0mXj](https://tco.sg/5vXdQ0mXj)、[tco.sg/8zCH6BE3j](https://tco.sg/8zCH6BE3j)、[tco.sg/V6ViWP149](https://tco.sg/V6ViWP149)、[tco.sg/gBzs5A1yo](https://tco.sg/gBzs5A1yo)、[tco.sg/q81wOC8Ep](https://tco.sg/q81wOC8Ep)、[tco.sg/yUxhAaOdw](https://tco.sg/yUxhAaOdw)                                                                                                                                                                                      | `signal:22d330504665493a941f07e00ea3646d7954414cd56b30ddbe1552435acc4953` |
|   42 | 空白／未解析                          | [sgfooddeals/4953](https://t.me/sgfooddeals/4953) | 未記錄                                                                                                                                                                                                                 | [tco.sg/D15e6jIbS](http://tco.sg/D15e6jIbS)                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | `signal:274976a1345abb6f7f690a04fde88c0aeec826f8dfe862a766f04822c59d3905` |
|   43 | Dine out with Grab SALEbration        | [tastesoulsg/4491](https://t.me/tastesoulsg/4491) | Enjoy up to 50% OFF Dine Out Deals                                                                                                                                                                                     | [bit.ly/4xCmP0u](http://bit.ly/4xCmP0u)、[t.me/tastesoul](https://t.me/tastesoul)                                                                                                                                                                                                                                                                                                                                                                                                                                    | `signal:2862c7acabab605a2fad875c1a3286272a8d3861ca9c6e602373560adc8dec47` |
|   44 | Jollibee Shiok Savers Sets (https     | [sgfooddeals/4940](https://t.me/sgfooddeals/4940) | //tco.sg/5vXdQ0mXj) ／ //tco.sg/8zCH6BE3j) ／ //tco.sg/PBcgXrqA2) ／ //tco.sg/V6ViWP149) ／ //tco.sg/gBzs5A1yo) ／ //tco.sg/q81wOC8Ep) ／ //tco.sg/yUxhAaOdw)                                                          | [tco.sg/PBcgXrqA2](http://tco.sg/PBcgXrqA2)、[tco.sg/5vXdQ0mXj](https://tco.sg/5vXdQ0mXj)、[tco.sg/8zCH6BE3j](https://tco.sg/8zCH6BE3j)、[tco.sg/V6ViWP149](https://tco.sg/V6ViWP149)、[tco.sg/gBzs5A1yo](https://tco.sg/gBzs5A1yo)、[tco.sg/q81wOC8Ep](https://tco.sg/q81wOC8Ep)、[tco.sg/yUxhAaOdw](https://tco.sg/yUxhAaOdw)                                                                                                                                                                                      | `signal:293766e81f551b78d311eb34bd9676a0a890b7492f2e1de00d66266f2ee020d3` |
|   45 | 空白／未解析                          | [sgfooddeals/4941](https://t.me/sgfooddeals/4941) | 未記錄                                                                                                                                                                                                                 | [tco.sg/kopitamxsgfd](http://tco.sg/kopitamxsgfd)、[tco.sg/kopitiamarticlexsgfd](https://tco.sg/kopitiamarticlexsgfd)                                                                                                                                                                                                                                                                                                                                                                                                | `signal:314c3ce7275374eb3fe6c49a00b06bbd01fee32773e4f3d3cc89649c1d2de35d` |
|   46 | 空白／未解析                          | [sgfooddeals/4956](https://t.me/sgfooddeals/4956) | 未記錄                                                                                                                                                                                                                 | [tco.sg/luckin100xsgfd](http://tco.sg/luckin100xsgfd)                                                                                                                                                                                                                                                                                                                                                                                                                                                                | `signal:5423e94bf822765ebd5acdd10a1bad17969d217404e656753abff9e8ac9f6078` |
|   47 | 空白／未解析                          | [sgfooddeals/4945](https://t.me/sgfooddeals/4945) | 未記錄                                                                                                                                                                                                                 | [tco.sg/bkappxsgfd](http://tco.sg/bkappxsgfd)                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | `signal:5663a4665f0de120d30beedb43eec7bf26f3019aac838f65c3584fe7b4f227ff` |
|   48 | 空白／未解析                          | [tastesoulsg/4505](https://t.me/tastesoulsg/4505) | 未記錄                                                                                                                                                                                                                 | [bit.ly/4hgXSk1](http://bit.ly/4hgXSk1)                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | `signal:61c0307e9353bbef7835ed4f93ea0f48c5a3b79869409a4922cd3c594cb7368d` |
|   49 | 空白／未解析                          | [tastesoulsg/4493](https://t.me/tastesoulsg/4493) | 未記錄                                                                                                                                                                                                                 | [bit.ly/46ux6Qh](http://bit.ly/46ux6Qh)                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | `signal:708b6683ae75b61d18cf42c4500636a2bdab77a6bebc21ff8314d4ecd79b7317` |
|   50 | Basil King (Lucky Plaza) (https       | [sgfooddeals/4951](https://t.me/sgfooddeals/4951) | //tco.sg/LX1Udny4P)                                                                                                                                                                                                    | [t.me/myfoodpromos](https://t.me/myfoodpromos)、[t.me/mymakanmurah](https://t.me/mymakanmurah)、[t.me/renodealssg](https://t.me/renodealssg)、[tco.sg/14B0pYve8](https://tco.sg/14B0pYve8)、[tco.sg/4uLiRQ6nQ](https://tco.sg/4uLiRQ6nQ)、[tco.sg/84LjqS0l4](https://tco.sg/84LjqS0l4)、[tco.sg/9p5JHlKZ3](https://tco.sg/9p5JHlKZ3)、[tco.sg/LX1Udny4P](https://tco.sg/LX1Udny4P)、[tco.sg/hOgKGRD5a](https://tco.sg/hOgKGRD5a)                                                                                     | `signal:74529a170de797a0cd162b838f540776d851ea2307b4d0e3f095475d1ae17a8b` |
|   51 | 空白／未解析                          | [tastesoulsg/4517](https://t.me/tastesoulsg/4517) | 未記錄                                                                                                                                                                                                                 | [bit.ly/4AA6hYR](http://bit.ly/4AA6hYR)                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | `signal:75fb35677aa211ab8857ec8917e3cc0ec6bbbfdd2452c8fba9324b4ec6f7fd9d` |
|   52 | 空白／未解析                          | [tastesoulsg/4502](https://t.me/tastesoulsg/4502) | 未記錄                                                                                                                                                                                                                 | [bit.ly/4iBDFYB](http://bit.ly/4iBDFYB)                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | `signal:8305be3af1260b37869e167cb2e27b4b68f92ad9af5c687a3555c4e4f5f433f0` |
|   53 | Kimpson's Table Korean Noodles (https | [sgfooddeals/4940](https://t.me/sgfooddeals/4940) | //tco.sg/5vXdQ0mXj) ／ //tco.sg/8zCH6BE3j) ／ //tco.sg/PBcgXrqA2) ／ //tco.sg/V6ViWP149) ／ //tco.sg/gBzs5A1yo) ／ //tco.sg/q81wOC8Ep) ／ //tco.sg/yUxhAaOdw)                                                          | [tco.sg/PBcgXrqA2](http://tco.sg/PBcgXrqA2)、[tco.sg/5vXdQ0mXj](https://tco.sg/5vXdQ0mXj)、[tco.sg/8zCH6BE3j](https://tco.sg/8zCH6BE3j)、[tco.sg/V6ViWP149](https://tco.sg/V6ViWP149)、[tco.sg/gBzs5A1yo](https://tco.sg/gBzs5A1yo)、[tco.sg/q81wOC8Ep](https://tco.sg/q81wOC8Ep)、[tco.sg/yUxhAaOdw](https://tco.sg/yUxhAaOdw)                                                                                                                                                                                      | `signal:857085fe541899b1ace9d6d2ed7973673b473d01d9dceeed4fb6129f3fd8ca02` |
|   54 | 空白／未解析                          | [tastesoulsg/4508](https://t.me/tastesoulsg/4508) | 未記錄                                                                                                                                                                                                                 | [bit.ly/4hHUCzE](http://bit.ly/4hHUCzE)                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | `signal:8769c52dc31427082530f1ddf3783ff8cd6a3a1054ed295854a37717ad52dc49` |
|   55 | luckin coffee (https                  | [sgfooddeals/4957](https://t.me/sgfooddeals/4957) | //tco.sg/DhTFq7kx0): Free Coffee-based Drinks (1 Oct) ／ //tco.sg/Odx5twUF8): Free Coffee with purchase (1 Oct) ／ //tco.sg/XqDA5nOOx): $2.99 Drinks (Till 2 Oct) ／ //tco.sg/u2SWkdIty…（只縮短索引標題，原文在貼文） | [tco.sg/DhTFq7kx0](https://tco.sg/DhTFq7kx0)、[tco.sg/Odx5twUF8](https://tco.sg/Odx5twUF8)、[tco.sg/XqDA5nOOx](https://tco.sg/XqDA5nOOx)、[tco.sg/u2SWkdIty](https://tco.sg/u2SWkdIty)                                                                                                                                                                                                                                                                                                                               | `signal:899707055b1bd4c0becd5d1100970b92baa4e097f59daf9aba9cce9d52f6de00` |
|   56 | 空白／未解析                          | [tastesoulsg/4504](https://t.me/tastesoulsg/4504) | Get $5 OFF GrabFood Delivery when you chope your first table with Grab Dine Out                                                                                                                                        | [bit.ly/46FnbHH](http://bit.ly/46FnbHH)                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | `signal:9235104196e6a7e75d3263c971469e27344f4059c1467be360541a1d7ebde98b` |
|   57 | 空白／未解析                          | [sgfooddeals/4942](https://t.me/sgfooddeals/4942) | 未記錄                                                                                                                                                                                                                 | [tco.sg/xOHJyfTdy](http://tco.sg/xOHJyfTdy)                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | `signal:9a586eb52d7c136d446b498f8e6c41ea4a5dc83e87c0f3c2030b88b80d1e6ba5` |
|   58 | 空白／未解析                          | [tastesoulsg/4496](https://t.me/tastesoulsg/4496) | 未記錄                                                                                                                                                                                                                 | [bit.ly/4yGGQTv](http://bit.ly/4yGGQTv)                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | `signal:9dc7e2340b8fcae6577305fc41231113c0c07961831cefc9798f4a129c1d77af` |
|   59 | Cedele (https                         | [sgfooddeals/4957](https://t.me/sgfooddeals/4957) | //tco.sg/DhTFq7kx0): Free Coffee-based Drinks (1 Oct) ／ //tco.sg/Odx5twUF8): Free Coffee with purchase (1 Oct) ／ //tco.sg/XqDA5nOOx): $2.99 Drinks (Till 2 Oct) ／ //tco.sg/u2SWkdIty…（只縮短索引標題，原文在貼文） | [tco.sg/DhTFq7kx0](https://tco.sg/DhTFq7kx0)、[tco.sg/Odx5twUF8](https://tco.sg/Odx5twUF8)、[tco.sg/XqDA5nOOx](https://tco.sg/XqDA5nOOx)、[tco.sg/u2SWkdIty](https://tco.sg/u2SWkdIty)                                                                                                                                                                                                                                                                                                                               | `signal:a88b70a217b1d9031629e6691210653089748a924d5aaeae59dc91e0683650ec` |
|   60 | 空白／未解析                          | [tastesoulsg/4520](https://t.me/tastesoulsg/4520) | 未記錄                                                                                                                                                                                                                 | [bit.ly/4hnx6ry](http://bit.ly/4hnx6ry)                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | `signal:a9f3594bfaa4370a046f5b14d13087981a4fcf6166a1a34fbaf1e173e17344b3` |
|   61 | Borderless Coffee (https              | [sgfooddeals/4957](https://t.me/sgfooddeals/4957) | //tco.sg/DhTFq7kx0): Free Coffee-based Drinks (1 Oct) ／ //tco.sg/Odx5twUF8): Free Coffee with purchase (1 Oct) ／ //tco.sg/XqDA5nOOx): $2.99 Drinks (Till 2 Oct) ／ //tco.sg/u2SWkdIty…（只縮短索引標題，原文在貼文） | [tco.sg/DhTFq7kx0](https://tco.sg/DhTFq7kx0)、[tco.sg/Odx5twUF8](https://tco.sg/Odx5twUF8)、[tco.sg/XqDA5nOOx](https://tco.sg/XqDA5nOOx)、[tco.sg/u2SWkdIty](https://tco.sg/u2SWkdIty)                                                                                                                                                                                                                                                                                                                               | `signal:b58a5aa36888356a6034ca2f93cda1336fdf876f75f526b235c90cc6d2aa64c1` |
|   62 | 空白／未解析                          | [tastesoulsg/4499](https://t.me/tastesoulsg/4499) | 未記錄                                                                                                                                                                                                                 | [bit.ly/3TC6Sse](http://bit.ly/3TC6Sse)                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | `signal:b7fdd71eb74c1260a944b4af9040c28d7f5356b8fea89fcb49720b8e049921c0` |
|   63 | 空白／未解析                          | [tastesoulsg/4514](https://t.me/tastesoulsg/4514) | 未記錄                                                                                                                                                                                                                 | [bit.ly/3Vint4T](http://bit.ly/3Vint4T)                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | `signal:bc28e4c290be1499ddf932b6de69922a76b492e56923b916a1d63c876d5ecd5c` |
|   64 | 空白／未解析                          | [tastesoulsg/4511](https://t.me/tastesoulsg/4511) | 未記錄                                                                                                                                                                                                                 | [bit.ly/4xIVLeY](http://bit.ly/4xIVLeY)                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | `signal:d47d0288dfc62add14d7b703b5267745ce62692a822510653a27496dd4fa644f` |
|   65 | Ajumma Off-Peak Deals (http           | [sgfooddeals/4940](https://t.me/sgfooddeals/4940) | //tco.sg/5vXdQ0mXj) ／ //tco.sg/8zCH6BE3j) ／ //tco.sg/PBcgXrqA2) ／ //tco.sg/V6ViWP149) ／ //tco.sg/gBzs5A1yo) ／ //tco.sg/q81wOC8Ep) ／ //tco.sg/yUxhAaOdw)                                                          | [tco.sg/PBcgXrqA2](http://tco.sg/PBcgXrqA2)、[tco.sg/5vXdQ0mXj](https://tco.sg/5vXdQ0mXj)、[tco.sg/8zCH6BE3j](https://tco.sg/8zCH6BE3j)、[tco.sg/V6ViWP149](https://tco.sg/V6ViWP149)、[tco.sg/gBzs5A1yo](https://tco.sg/gBzs5A1yo)、[tco.sg/q81wOC8Ep](https://tco.sg/q81wOC8Ep)、[tco.sg/yUxhAaOdw](https://tco.sg/yUxhAaOdw)                                                                                                                                                                                      | `signal:dbc1f962254eb4f16b44dc193a2994f8ebe10b9ea8797d81082101a4eb6ab024` |
|   66 | 空白／未解析                          | [sgfooddeals/4937](https://t.me/sgfooddeals/4937) | 未記錄                                                                                                                                                                                                                 | [tco.sg/plqmallxsgfd](http://tco.sg/plqmallxsgfd)、[tco.sg/plqllxsgfd](https://tco.sg/plqllxsgfd)                                                                                                                                                                                                                                                                                                                                                                                                                    | `signal:e5e4914f063c0dae79e55fa9903dc10862e46cfa46b0425c8bd8ac486482f5a5` |
|   67 | Morganfield’s Lunch Deal (https       | [sgfooddeals/4940](https://t.me/sgfooddeals/4940) | //tco.sg/5vXdQ0mXj) ／ //tco.sg/8zCH6BE3j) ／ //tco.sg/PBcgXrqA2) ／ //tco.sg/V6ViWP149) ／ //tco.sg/gBzs5A1yo) ／ //tco.sg/q81wOC8Ep) ／ //tco.sg/yUxhAaOdw)                                                          | [tco.sg/PBcgXrqA2](http://tco.sg/PBcgXrqA2)、[tco.sg/5vXdQ0mXj](https://tco.sg/5vXdQ0mXj)、[tco.sg/8zCH6BE3j](https://tco.sg/8zCH6BE3j)、[tco.sg/V6ViWP149](https://tco.sg/V6ViWP149)、[tco.sg/gBzs5A1yo](https://tco.sg/gBzs5A1yo)、[tco.sg/q81wOC8Ep](https://tco.sg/q81wOC8Ep)、[tco.sg/yUxhAaOdw](https://tco.sg/yUxhAaOdw)                                                                                                                                                                                      | `signal:f9c1b5ae655ad2f933638dfa9ef01fad5dd93baaf91155221bc5e9f973986a6d` |

## 資料依據與整理驗證

主要依據：[最新逐店名冊](</Users/louis/Documents/Projects/vibe coding/PromotionAroundYou/docs/research/merchants.json>)、[直接來源設定](</Users/louis/Documents/Projects/vibe coding/PromotionAroundYou/src/ingestion/direct-sources/registry.ts>)、[新增來源設定](</Users/louis/Documents/Projects/vibe coding/PromotionAroundYou/src/ingestion/direct-sources/coverage-batch-2-definitions.ts>)、[社群名冊](</Users/louis/Documents/Projects/vibe coding/PromotionAroundYou/docs/research/social-source-inventory.json>)、[第二批來源研究](</Users/louis/Documents/Projects/vibe coding/PromotionAroundYou/docs/changes/coverage-batch-2/research.md>)、[門店證據研究](</Users/louis/Documents/Projects/vibe coding/PromotionAroundYou/docs/changes/production-evidence-coverage/source-research.md>)、[19 個研究入口](</Users/louis/Documents/Projects/vibe coding/PromotionAroundYou/scripts/research/source-monitor/protocol/source-registry-revision-6.json>)。

- 已核對 138 個名冊項目與逐店章節一一對應，沒有漏項或新增推測店家。
- 原始發現貼文逐店重建，全部與名冊的歷史貼文數一致；Ajumma’s 只套用已有官方證據的 alias。
- 11 個直接來源的入口與 enabled flag 均對照 runtime registry；2 啟用、9 停用。
- 按逐筆項目重算狀態：2 已啟用、10 adapter 停用、10 有阻礙、10 候選、106 未評估，合計 138。
- 19 個研究入口、67 筆 unresolved record 完整保留；未重新解析短網址或新增網路爬取。
- 此次只新增文件；原始語料、研究評分、程式設定、資料庫及凍結實驗保持原樣。

### 讀取輸入的 SHA-256

下列 hash 固定本文件使用的本地版本；不是對外網站目前內容的 hash。

| 本地資料／程式來源                                                                                                                                                                                                          | SHA-256                                                            |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| [.local/source-origin-audit/2026-09-30-social-corrected-offline/audit.json](</Users/louis/Documents/Projects/vibe coding/PromotionAroundYou/.local/source-origin-audit/2026-09-30-social-corrected-offline/audit.json>)     | `a0cb366e8beebc638f0f85e35c28d1acf88ef5718a142d99ced0d5b95fbcd99f` |
| [.local/source-origin-audit/2026-09-30-social-corrected-offline/signals.json](</Users/louis/Documents/Projects/vibe coding/PromotionAroundYou/.local/source-origin-audit/2026-09-30-social-corrected-offline/signals.json>) | `43ecab993bc5b6640e56c385d9b2a2b13e8f29ae51a94cf0a7eadcef76e08d87` |
| [data/mvp-source-evidence.json](</Users/louis/Documents/Projects/vibe coding/PromotionAroundYou/data/mvp-source-evidence.json>)                                                                                             | `8b61de49ff4a370e3d1e12ebe3221d8eeb84ba31dbb9f92c8131492e592f4fda` |
| [docs/changes/coverage-batch-2/research.md](</Users/louis/Documents/Projects/vibe coding/PromotionAroundYou/docs/changes/coverage-batch-2/research.md>)                                                                     | `b6daf429d6040ab5edfc2878d5ab197301e2cc2f8cb9e20c89dc3335d85f1833` |
| [docs/changes/production-evidence-coverage/source-research.md](</Users/louis/Documents/Projects/vibe coding/PromotionAroundYou/docs/changes/production-evidence-coverage/source-research.md>)                               | `83056dc8c79691f5976262226247986c025c7c85137144ce68e0000dc7c9abb8` |
| [docs/research/merchant-identity-review.json](</Users/louis/Documents/Projects/vibe coding/PromotionAroundYou/docs/research/merchant-identity-review.json>)                                                                 | `e3163c9ee9ef0fb09285e6ea8f2f2dd9ba0f7fa62e9ec8ff4672f02f76c7bcea` |
| [docs/research/merchant-source-map-review.json](</Users/louis/Documents/Projects/vibe coding/PromotionAroundYou/docs/research/merchant-source-map-review.json>)                                                             | `0ad4ad7269e90f92548a1dec7ade62a26ea31c56ea07c734f9e1680d8e3151d1` |
| [docs/research/merchants.json](</Users/louis/Documents/Projects/vibe coding/PromotionAroundYou/docs/research/merchants.json>)                                                                                               | `3966a53144f90b0f9bee4ab34719e8859ce9f1dc67f854d318723645af5294c6` |
| [docs/research/social-source-authority-review.json](</Users/louis/Documents/Projects/vibe coding/PromotionAroundYou/docs/research/social-source-authority-review.json>)                                                     | `18e2c72f2daeed4773eff6f7213bb5d2ccdfefcda07dd4a86d67d5493273a92e` |
| [docs/research/social-source-inventory.json](</Users/louis/Documents/Projects/vibe coding/PromotionAroundYou/docs/research/social-source-inventory.json>)                                                                   | `9a42b5f1e32abe52e0b395fc295d40941e1d225d349aa1761c74cd48083fb320` |
| [exports/review-inbox-2026-09-16/review-inbox.json](</Users/louis/Documents/Projects/vibe coding/PromotionAroundYou/exports/review-inbox-2026-09-16/review-inbox.json>)                                                     | `660db39adcf6c63c554eecbad0579471046786151f74b4e5ef99aa0c772d3d2a` |
| [scripts/research/source-monitor/protocol/source-registry-revision-6.json](</Users/louis/Documents/Projects/vibe coding/PromotionAroundYou/scripts/research/source-monitor/protocol/source-registry-revision-6.json>)       | `76a1bdd8bbbc53157ed53b6ec88d94e7eacf751d0a27756c9f1d41d0a232e086` |
| [src/ingestion/direct-sources/adapters/coverage-batch-2.ts](</Users/louis/Documents/Projects/vibe coding/PromotionAroundYou/src/ingestion/direct-sources/adapters/coverage-batch-2.ts>)                                     | `995734210706455ca1e482e666481964588fd825f04dbe2f77a39f7b86d602a2` |
| [src/ingestion/direct-sources/adapters/gourmet-carousel-outlets.ts](</Users/louis/Documents/Projects/vibe coding/PromotionAroundYou/src/ingestion/direct-sources/adapters/gourmet-carousel-outlets.ts>)                     | `eb0be0c94f082d89cd4a5140ff8e7abb55bbe66032f3e75e656b4e3f528d57f8` |
| [src/ingestion/direct-sources/adapters/pepper-outlets.ts](</Users/louis/Documents/Projects/vibe coding/PromotionAroundYou/src/ingestion/direct-sources/adapters/pepper-outlets.ts>)                                         | `d0e68b3426f05ef92b656a497744253a8ebbf7affe21303a51127eafd456a472` |
| [src/ingestion/direct-sources/adapters/shake-shack-outlets.ts](</Users/louis/Documents/Projects/vibe coding/PromotionAroundYou/src/ingestion/direct-sources/adapters/shake-shack-outlets.ts>)                               | `f7ea10a7a97c43fe54a23bcb3bf85c99e6a04ab29861e38283b5a1f9e878aa1f` |
| [src/ingestion/direct-sources/coverage-batch-2-definitions.ts](</Users/louis/Documents/Projects/vibe coding/PromotionAroundYou/src/ingestion/direct-sources/coverage-batch-2-definitions.ts>)                               | `89539dd8f39fda2109fb18c93c9c727af6015bf41e84812167a41d748adcfc1b` |
| [src/ingestion/direct-sources/outlet-resolution.ts](</Users/louis/Documents/Projects/vibe coding/PromotionAroundYou/src/ingestion/direct-sources/outlet-resolution.ts>)                                                     | `35832b991b4ff70eb217d048684d147f812777f57a0d8e0d6f6eeabfdfafe84f` |
| [src/ingestion/direct-sources/registry.ts](</Users/louis/Documents/Projects/vibe coding/PromotionAroundYou/src/ingestion/direct-sources/registry.ts>)                                                                       | `01a3ad4a7ad08780459f2398187ca8189afdbd55f2cfadab9ee58cae2f6fde50` |
| [src/ingestion/resolution/directory.ts](</Users/louis/Documents/Projects/vibe coding/PromotionAroundYou/src/ingestion/resolution/directory.ts>)                                                                             | `a26e9bd614e1802f8ef932dbc5fd155e9a78177d5ab7c76995e6641c1e684ec6` |
| [src/ingestion/resolution/papis-directory.ts](</Users/louis/Documents/Projects/vibe coding/PromotionAroundYou/src/ingestion/resolution/papis-directory.ts>)                                                                 | `e2821c17a9c26a9cefa3bdcb6d481987350e4d3afed580e6fe55c1d85139ef0d` |
| [tests/corpus/mvp-conformance-reviewed.json](</Users/louis/Documents/Projects/vibe coding/PromotionAroundYou/tests/corpus/mvp-conformance-reviewed.json>)                                                                   | `680ce13809180fb76715253ceafefb73ba4f53eb88a394d44ed0e6e887918986` |
