# HANDBOOK.md (v2.9.19)

## ① Project Vision
建立整合型 Market Engine V3，將「市場觀察 Web App」與「MARKET LAB 研發實驗室」合併為單一 Google Sheet & GAS 專案。透過客觀的 18 年歷史數據分位數校正與量化回測，建立統一、無歧義的 Single Source of Truth 市場位階決策大腦。

* **核心引言 Slogan**：`研究市場，是為了最後不再被市場牽著走。`
* **產品哲學**：`Market Engine 不是預測明天的機器，而是一套從「想預測市場」走到「理解市場」，最後學會「不必預測市場」的投資紀律實驗。`

---

## ② System Architecture
- **Data Layer (數據底座)**: Google Sheet 6 大結構化分頁 + 2 災難復原與封存頁
  - `RAW_HISTORY`: 18 年官方實體歷史數據底座 (Date, TWII, VIX*, MA60, MA240, Dist60, Dist240, MA60_Slope, Dist60_Delta, EWT_Change*)。*註：依 ANTI-83418 規範，新列 C/J 欄解耦留空，歷史資料全數保留。
  - `THRESHOLD_CONFIG`: 全站唯一門檻定義表 (Single Source of Truth，連動 18 年 P10/P25/P75/P90 原始分位數)。
  - `LAB_BACKTEST`: 1 年期前瞻報酬與勝率統計回測表 (Milestone 7.11 解耦為 GAS 讀取 RAW_HISTORY 直接計算寫入純值)。
  - `DASHBOARD`: 行情最新數據、今日位階、策略行動指引、動態轉折路徑與 AI 雙顧問值班卡片。
  - `AI_LOG`: Milestone 7.11 新增之 10 欄純值專用日誌（Record_ID, Trade_Date, Analyst, Generated_At, Model_ID, Generation_Status, Content, Input_Data_Snapshot, Morning_Record_ID, Idempotency_Key），Append-only 純值寫入、模型解耦與冪等防護。
  - `_ARCHIVE_HISTORY_LOG`: 原 HISTORY_LOG 完成歷史資料遷移與對帳後，更名並實施 `isWarningOnly=false` 強制唯讀實體保護與隱藏封存。
  - `DECISION_LOG`: 手動加碼/戰術決策審核檢討紀錄。
  - `_ROLLBACK_TMP`: 災難復原交易快照隱藏分頁（支援完整雙表鏡像、Pre-Fingerprints 與防篡改雜湊）。
  - `_BACKUP_HISTORY_LOG_PRE_MIGRATION`: 遷移前完整快照備份表。
- **Engine Layer (核心大腦)**: Google Apps Script 自動化引擎 ([Market_Engine_GAS.js](file:///f:/Projects/Market_Engine/Market_Engine_GAS.js))
  - 核心包含：統一門檻解析 (`getThresholdConfig`/`classifyPhase`)、三窗口歷史位階校準引擎 (`calculateCalibrationWindows`)、位階歷史下行風險與前瞻報酬驗證器 (`calculatePhaseForwardPerformance`)、位階大區間雙層撫平器、18 年月次回測排程自癒機制 (`checkAndAutoRunMonthlyLabBacktest`)、未來重大事件永續滾動生成引擎 (`generateRollingUpcomingEvents`)，並徹底剝離同步阻塞達成 2 秒極速響應。
  - AI 分析導航升級：老巴盤前 4 大區塊與時段標記、小羅盤後 5 大區塊程式精算漲跌與早晨三分類驗證；AI_LOG_FLOW_ACTIVE 開啟時優先讀寫 `AI_LOG` 純值分頁。
  - 遷移與安全啟用防護：步驟 1~6 冪等遷移、三態紀錄分類 (`VALID_MIGRATION`, `NORMAL_AI_RECORD`, `INVALID_MIGRATION`)、日期正規化防禦、新增遷移與既有重複獨立對帳。
- **Presentation & Cache Layer (展示與快取層)**: GitHub Pages 靜態前端與 GAS Web App ([index.html](file:///f:/Projects/Market_Engine/index.html))
  - 實現 **SWR (Stale-While-Revalidate)** 本地優先快取（0 毫秒即時渲染上次報表，完全消除 F5 轉圈感）。
  - **PWA (Progressive Web App) 完整支援 (v2.9.19)**：
    - 支援 Android Chrome / Edge / 三星瀏覽器與 iOS Safari 桌面獨立安裝。
    - 具備完整 `manifest.json`、`sw.js`（Service Worker 離線快取 App Shell）、全套多解析度圖示（192x192, 512x512, maskable, apple-touch-icon）。
    - 內建 Android `beforeinstallprompt` 原生一鍵安裝提示、iOS Safari「加入主畫面」圖文引導彈窗與獨立視窗 (`standalone`) 自動識別。
  - **三窗口歷史位階校準實驗室 (18Y / 10Y / 5Y Calibration Lab)**：0ms 即時切換、歷史百分位排位、橫向門檻比較表、絕對差值標註與位階敏感度分析。
  - **海外即時觀測卡片 (ANTI-83420)**：獨立讀取 `OVERSEAS_OBSERVATION_JSON`，具備最後成功有效數值防覆蓋保護與時效標籤。
  - **歷史下行風險與前瞻報酬驗證 (Risk & Forward Return)**：選定窗口 T1~T5 詳細前瞻績效表與三窗口橫向對比矩陣。
  - **常態轉折路徑標籤 (Persistent Transition Breadcrumb)**：清晰呈現「前一位階歷史脈絡 → 今日位階」，賦予決策連續性。

---

## ③ Database Schema & 欄位規範
1. `RAW_HISTORY`: 官方實體歷史數據底座 (A: Date, B: TWII, C: VIX, D: MA60, E: MA240, F: Dist60, G: Dist240, H: MA60_Slope, I: Dist60_Delta, J: EWT)。新列第 3 列起 C、J 欄停止寫入保持空白。
2. `THRESHOLD_CONFIG`: 位階門檻定義表 (連動 18 年 P10/P25/P75/P90 原始分位數)。
3. `LAB_BACKTEST`: 1 年期前瞻報酬與勝率統計回測表 (GAS 直接自 RAW_HISTORY 計算純值寫入)。
4. `DASHBOARD`: 行情最新數據、今日位階 (B15)、DASHBOARD!B12 (`=INDIRECT("RAW_HISTORY!J3")` 原樣保留)、AI 老巴早餐 (B23)、AI 小羅午茶 (B24)。
5. `AI_LOG`: 10 欄標準純值紀錄表 (A: Record_ID, B: Trade_Date, C: Analyst, D: Generated_At, E: Model_ID, F: Generation_Status, G: Content, H: Input_Data_Snapshot, I: Morning_Record_ID, J: Idempotency_Key)。
6. `_ARCHIVE_HISTORY_LOG`: 歷史退役分頁，實施強制唯讀保護與隱藏，A:I 為歷史客觀量化數據，J/K 為歷史分析紀錄。
7. `DECISION_LOG`: 加碼與紀律執行紀錄。
8. `_ROLLBACK_TMP`: 災難復原交易快照隱藏分頁，保存雙表鏡像與中繼簽章。
9. `_BACKUP_HISTORY_LOG_PRE_MIGRATION`: 遷移前完整備份表。

---

## ④ Function Library (核心函式索引)
- **AI 雙分析師導航 (v2.9.17 升級)**:
  - `generateMorningNavigation()`: 老巴早盤 AI 導航（07:30 執行），標記台股未開盤事實、美股指數未收錄提醒，輸出 4 大標準區塊，寫入 `DASHBOARD!B23`、`HISTORY_LOG!J3` 並存入 `LAST_MORNING_ANALYSIS_JSON`。
  - `generateAfternoonNavigation()`: 小羅盤後 AI 導航（16:30 執行），程式精算漲跌點數與幅度、標記成交量未收錄禁猜測、讀取早晨分析進行三分類驗證（已觀察到/尚未發生或無法確認/與早晨預期不同），輸出 5 大標準區塊，寫入 `DASHBOARD!B24` 與 `HISTORY_LOG!K3`。
  - `generateFallbackMorningText()`: 老巴智慧特調備援函式，維持 4 大區塊結構並標記 `[系統備援文字，非正式 AI 分析]`。
  - `generateFallbackAfternoonText()`: 小羅智慧特調備援函式，維持 5 大區塊結構、程式精算漲跌與早晨分析三分類隔離，標記備援狀態。
- **海外市場觀測與解耦 (ANTI-83418 ~ ANTI-83420)**:
  - `getOverseasObservation_()` / `saveOverseasObservation_()`: 海外即時觀測讀寫，存入 ScriptProperties 與本機持久快取，與歷史數據庫徹底解耦。
  - `evaluateOverseasObservation_()` / `formatOverseasNavigationStatus_()`: 獨立評估 VIX/EWT 5 種狀態碼 (`FRESH_VALID`, `FETCH_FAILED_WITH_CACHED`, `FETCH_FAILED_NO_DATA`, `MISSING_TIMESTAMP`, `STALE_DATA`) 與時效標示。
- **每日盤後原子提交流程與防呆**:
  - `validateAfternoonMarketData_()`: 盤後驗證閘門，僅以 TWII 收盤數據及交易日為寫入門檻，VIX/EWT 異常不阻擋歷史歸檔。
  - `updateAfternoonMarketEngine()`: 16:30 盤後更新，採先取行情後寫入、雙表對稱檢查與空白防呆（ANTI-83411/83412）。
  - `executeHardenedTransaction_()`: 交易事務執行，雙表插列、注入 A:I 公式包，保持新列 C/J/E 留空並呼叫盤後導航。
- **門檻定義與位階判定單一來源**:
  - `getThresholdConfig(sheet)`: 從 `THRESHOLD_CONFIG` 動態提取 P10/P25/P75/P90 百分比。
  - `classifyPhase(dist60, thresholdConfig)`: 單一出口劃分 T1~T5 位階。
- **三窗口歷史位階校準模組**:
  - `calculateCalibrationWindows()`, `buildCalibrationWindowsResult()`, `calculatePhaseForwardPerformance()`: 18Y / 10Y / 5Y 日曆年切片，Dist60/Dist240 分位數與前瞻下行風險統計。
- **交易日與快取控管**:
  - `isMarketOpen()`: 本地 Hash 表 + `NON_MARKET_HOLIDAYS` 過濾。
  - `getMarketEngineData()`: 300s API 快取 + 批次 Range 讀取，極速 2 秒出圖。

---

## ⑤ Decision Engine & 核心鐵則
- **單一位階判定**: 全站以 `RAW_HISTORY` 最新季線偏離度 `Dist60` 主導判定 (`T1極度恐慌`, `T2恐慌`, `T3順風/中性`, `T4過熱`, `T5狂熱`)。年線偏離度 `Dist240 > P90` 解耦轉為長線風險提醒。
- **海外觀測即時性原則 (ANTI-83418)**:
  - VIX 與 EWT 僅作為「當下即時海外市場觀測」，**不寫入 RAW_HISTORY 新列 C/J 欄，不注入 HISTORY_LOG 新列 E 欄公式，不參與歷史校準**。
  - 歷史既有數據 100% 原始保留，不刪除、不回填、不重算。
- **海外觀測資料留存原則 (ANTI-83420)**:
  - 更新成功顯示最新數值與交易日；更新失敗保留最後一次有效數據並標記「本次更新失敗，以下為最後有效資料」及原交易日；僅從未取得有效資料時顯示「尚無可用資料」。
- **AI 分析師原則 (v2.9.17)**:
  - 兩位分析師均落實「先交代客觀事實，再給予觀點」，嚴格區分已發生事實、推論與未知。
  - 嚴禁捏造行情、成交量或因果關係；現有資料來源無成交量數據時如實標明，切勿自行猜測量能數字。
  - 小羅比對早晨老巴分析採三分類（已觀察到、尚未發生或無法確認、與早晨預期不同）；早晨若為備援文字或未執行，嚴格禁止批判備援文字。
- **核心公式不可變更**:
  - `DASHBOARD!B12` 永遠保留原始公式：`=INDIRECT("RAW_HISTORY!J3")`。
  - 不修改投資策略、T1～T5 門檻及歷史量化資料。

---

## ⑥ AI Agents & Kopitiam 人設
- **老巴 (早晨分析師 / 每日 07:30 執行)**:
  - 角色設定：溫暖、沉穩、篤定。以長期資產累積、護城河企業價值、農場種子向下扎根比喻鼓勵專注本業工作與生活。
  - 輸出結構（4 大區塊）：【昨日市場基準】、【海外市場觀察】、【今日關鍵觀察】、【老巴的提醒】。
  - 儲存目標：`DASHBOARD!B23`、`HISTORY_LOG!J3` 與 `ScriptProperties.LAST_MORNING_ANALYSIS_JSON`。
- **小羅 (收盤分析師 / 每日 16:30 執行)**:
  - 角色設定：理性、細膩、觀察細節。理性拆解群眾情緒，提醒勿在過熱時追高、恐慌時失序，盤後關掉螢幕陪伴家人。
  - 輸出結構（5 大區塊）：【今日收盤總覽】、【今日市場變化】、【海外市場觀察】、【早晨觀察驗證】、【明日值得留意】。
  - 儲存目標：`DASHBOARD!B24` 與 `HISTORY_LOG!K3`。
- **新聞讀報 (週二 18:00 執行)**: 綜合敘述 🤖AI、📈CPI、🌐GEO 三大主題，提供對立哲學解讀。

---

## ⑦ System Endpoints & Version Status
- **Current Version**: `v2.9.19` (`main` 分支)
- **GAS Production Deployment**: **Version 156 (`@156`)**
  - **Deployment ID**: `AKfycbxkc3sjplCOGuDcktq_ZYhHzy87k9v6L2UxeVZt2cxTt7amV0_l6ARVS4ggqCT_MjGrxw`
  - **HEAD Status**: 已同步 Milestone 7.11 步驟 6 獨立核對防護邏輯與 PWA 介面整合。
  - **Rollback Baseline**: **Version 155 (`@155`)**
- **Production Spreadsheet**: `Market_Engine_V3` (`1mbOW4hyoiAJFxGxpSfMPqg21M9d0EhcbTihab7J49Rw`)
- **GitHub Pages (PWA 正式站台)**: `https://voyagermartin.github.io/Market_Engine/`
  - 支援 Android Chrome / Edge 與 iOS Safari 桌面獨立安裝，離線 App Shell 快取啟用。
- **Data Status**: 基準交易日 `2026-11-13`，收盤 `43,675.12`，`Dist60: -5.52%`，`Dist240: +35.74%`，位階 `極度恐慌` (T1)。

---

## ⑧ Roadmap & Milestones
- **Milestone 1 ~ 6.9 (COMPLETED)**: 18年歷史行情底座、SPA四大分頁、策略對決模擬器、Walk-Forward驗證、SWR極速載入、轉折路徑常態化與永續事件引擎（doGet < 2s）。
- **Milestone 7 (v2.9.0~v2.9.1 COMPLETED)**: 三窗口歷史位階校準實驗室 (18Y / 10Y / 5Y Calibration Lab) 與歷史下行風險前瞻報酬驗證 (Risk & Forward Return)。
- **Milestone 7.5 ~ 7.7 (v2.9.2~v2.9.8 COMPLETED)**: 盤前徹底唯讀化、海外時序解耦、頂端插列公式防漂移實證、獨立交易快照與災難復原引擎 (02B-8.1 ~ 02B-8.4-G，195 項全套故障注入測試 100% PASS)。
- **Milestone 7.8 (v2.9.9~v2.9.16 COMPLETED)**: 
  - (1) **ANTI-83411 ~ 83413**: 盤後更新時序反轉（先取行情後寫入）與雙表中斷防呆。
  - (2) **ANTI-83414 ~ 83416**: VIX 夏冬令動態換算與歷史前視偏誤清查。
  - (3) **ANTI-83417 ~ 83419**: VIX/EWT 歷史依賴徹底解除，停止寫入 RAW C/J 與 HIST E 欄，校準實驗室回歸雙核心，正式環境發布 (@153)。
  - (4) **ANTI-83420**: 前端 VIX/EWT 顯示邏輯與更新失敗快取加固發布 (@154)。
- **Milestone 7.9 (v2.9.17 COMPLETED)**: 🤖 **老巴與小羅 AI 分析品質全面升級與早晚分析銜接規範**
  - (1) **老巴（07:30 早晨分析）**：時段標註、美股指數未收錄宣告、4 大標準區塊、事實先行、寫入 `DASHBOARD!B23` / `HISTORY_LOG!J3` 與元資料快取。
  - (2) **小羅（16:30 收盤分析）**：程式精算漲跌幅、成交量未收錄禁猜測標記、早晨三分類比對、5 大標準區塊、寫入 `DASHBOARD!B24` / `HISTORY_LOG!K3`。
  - (3) **早晚銜接與防呆**：歷史 A:I 量化數據隔離，早晨為備援文字時嚴禁小羅批判解讀，正式環境發布 **Version 155 (`@155`)**。
- **Milestone 7.10 (v2.9.18 COMPLETED)**: 🚀 **AI 分析模型架構換代升級 (Switch to gemini-3.8-flash & 3.5-flash-lite)**
  - (1) 徹底移除所有已退役/關閉模型，主力全站切換為 `gemini-3.8-flash`。
  - (2) 配置 `gemini-3.5-flash-lite` 極速保底，防禦瞬時限流並消除掉入特調備援之延遲。
  - (3) 對齊四大呼叫端點，正式發布 **Version 156 (`@156`)**。
- **Milestone 7.11 (v2.9.19 COMPLETED)**: 📋 **HISTORY_LOG 退役與 AI_LOG 純值架構實施**
  - (1) **分頁建立與保全**：建立 10 欄標準純值 `AI_LOG` 表，保留完整備份 `_BACKUP_HISTORY_LOG_PRE_MIGRATION`。
  - (2) **無損遷移與對帳報告**：歷史真實 J/K 分析無損遷移，生成 `MIGRATION_RECONCILIATION_REPORT` 對帳報告。
  - (3) **舊表實體保護退役**：`_ARCHIVE_HISTORY_LOG` 實施 `isWarningOnly=false` 強制唯讀實體保護與隱藏。
  - (4) **步驟 6 啟用防護加固**：實體紀錄三態分類 (`VALID_MIGRATION`, `NORMAL_AI_RECORD`, `INVALID_MIGRATION`)、日期正規化防禦、排除現場正常模型誤判，並將新增遷移筆數（BU 2, LO 2）與既有重複筆數（1:1 比對 Record_ID 與內文）分離獨立核對（18/18 測試全數通過）。
  - (5) **Feature Flag 動態管控**：以 `AI_LOG_FLOW_ACTIVE` 控制切換，支援秒級無損 Rollback 回退舊制。
- **Milestone 7.12 (v2.9.19 COMPLETED)**: 📱 **PWA (Progressive Web App) 行動裝置原生獨立 App 支援**
  - (1) **Web App Manifest**：建立標準 `manifest.json`，配置專屬名稱、`#0c0a09` 主題色、`standalone` 獨立全螢幕模式與相對路徑。
  - (2) **Service Worker 智慧快取**：建立 `sw.js`，離線預載 App Shell，即時行情 API 保持網路優先搭配 `localStorage` SWR 快取。
  - (3) **完整規格圖標**：產出 192x192、512x512、自適應安全區 maskable 與 iOS 專用 apple-touch-icon。
  - (4) **雙平台安裝導覽**：Android 原生一鍵安裝提示、iOS Safari「加入主畫面」圖文引導彈窗與 Google 試算表內嵌環境自動轉導提示。
  - (5) **GitHub Pages 部署發布**：正式推送至 `origin/main`，線上 HTTP 200 實測通過。
- **🚀 目前停止位置與起點記錄**: `main` 分支（Commit `a53b15c`，正式環境 GAS 部署 **Version 156 (`@156`)**，HEAD 同步最新防護，GitHub Pages PWA 部署上線）。
- **🎯 下一步施工目標 (下個開發起點記錄)**:
  - **目標 1 (試算表正式啟用 AI_LOG 資料流)**：前往 Google 試算表執行「步驟 6: 正式啟用 AI_LOG 資料流」，確認 8 項核對全綠（🟢）並正式啟動 Feature Flag。
  - **目標 2 (盤中/盤後自動資料流觀察)**：觀察明日 07:30 老巴早晨分析與 16:30 小羅盤後分析純值寫入 `AI_LOG` 的運作狀態。
  - **目標 3 (手機端 PWA App 使用反饋)**：在手機桌面上以獨立全螢幕模式開啟 Market Engine App，驗證日常操作與 0ms 載入體驗。

---

## ⑨ 開發日誌歷程 (Development History)
| 日期 | 版本 | 核心更新摘要 |
| :--- | :--- | :--- |
| **2026-07 ~ 2026-08** | `v1.0~v2.7.12` | 初始版本建置、18年實體行情底座、SPA四大分頁、FIN-NEWS 新聞研報、Gemini 4 模型備援與 0ms 假日查表。 |
| **2026-08-25 ~ 08-27** | `v2.8.0~v2.8.10` | Milestone 6 完工：18 年全歷史真實權益曲線策略對決模擬器、10年滾動樣本外驗證、核心敘事升級與三大角色定義。 |
| **2026-09 ~ 2026-10** | `v2.8.11~v2.8.18` | 非休市紀念日過濾、SWR 本地優先快取 (0ms)、轉折脈絡常態常駐化、月次回測自癒排程、未來重大事件永續滾動生成引擎 (GAS @150)。 |
| **2026-10-18** | `v2.9.0~v2.9.1` | Milestone 7 完工：三窗口歷史位階校準實驗室 (18Y / 10Y / 5Y Calibration Lab) 與前瞻下行風險勝率驗證 (Risk & Forward Return) (GAS @152)。 |
| **2026-11-09 ~ 11-12** | `v2.9.2` | Milestone 7.5~7.6：盤前 07:30 徹底唯讀化、海外時序解耦、公開 doGet 嚴格唯讀隔離、備份建立與修復演練。 |
| **2026-11-14** | `v2.9.3~v2.9.8` | Milestone 7.7 完工：02B-7 頂端插列公式防漂移實證與新 Row 3 公式包；02B-8 獨立交易快照、原子提交與災難復原引擎 (195/195 PASS)。 |
| **2026-11-15** | `v2.9.9~v2.9.15` | Milestone 7.8 完工 (ANTI-83411~83419)：盤後更新時序反轉（先取後寫）、VIX 夏冬令動態時間戳與前視偏誤修正、VIX/EWT 歷史依賴徹底解除（RAW C/J 與 HIST E 新列留空，校準實驗室回歸雙核心，DASHBOARD!B12 原樣保留），正式環境合併發布 (GAS @153)。 |
| **2026-11-15** | `v2.9.16` | ANTI-83420：VIX/EWT 前端顯示與更新快取加固（成功顯示最新、失敗保留最後有效數據並標記警示、獨立判定互不影響、無資料顯示「尚無可用資料」），正式環境發布 (GAS @154)。 |
| **2026-11-15** | `v2.9.17` | **Milestone 7.9 完工：老巴與小羅 AI 分析品質全面升級**：老巴 4 大區塊與時段標記、小羅 5 大區塊程式精算漲跌與早晨三分類比對、A:I 量化歷史數據隔離、J3/K3 寫入規範確立與備援文字解耦，正式環境發布 (GAS @155，Commit `1afaf8b`)。 |
| **2026-11-16** | `v2.9.18` | **Milestone 7.10 完工：AI 模型世代升級**：主力全站採用 `gemini-3.8-flash`，配置 `gemini-3.5-flash-lite` 極速保底，正式發布 (GAS @156)。 |
| **2026-11-18** | `v2.9.19` | **Milestone 7.11 完工：HISTORY_LOG 退役與 AI_LOG 純值架構實施**：10 欄 AI_LOG 分頁建立、歷史真實 J/K 無損遷移、舊表實體保護封存、三態紀錄分類 (`VALID_MIGRATION`/`NORMAL_AI_RECORD`/`INVALID_MIGRATION`)、新增與重複獨立對帳（18/18 測試通過）、Feature Flag 動態管控與 Rollback 機制。 |
| **2026-11-18** | `v2.9.19` | **Milestone 7.12 完工：PWA (Progressive Web App) 原生獨立 App 支援**：`manifest.json` 與 `sw.js` 智慧快取、全套圖標規格、Android 原生一鍵安裝提示、iOS Safari 引導彈窗與 GitHub Pages 正式發布。 |
