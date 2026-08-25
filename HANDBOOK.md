# HANDBOOK.md (v2.8.0)

## ① Project Vision
建立整合型 Market Engine V3，將「市場觀察 Web App」與「MARKET LAB 研發實驗室」合併為單一 Google Sheet & GAS 專案。透過客觀的 18 年歷史數據分位數校正與量化回測，建立統一、無歧義的 Single Source of Truth 市場位階決策大腦。

## ② System Architecture
- **Data Layer**: Google Sheet 6 大結構化分頁 (`RAW_HISTORY`, `THRESHOLD_CONFIG`, `LAB_BACKTEST`, `DASHBOARD`, `HISTORY_LOG`, `DECISION_LOG`)
- **Engine Layer**: Google Apps Script 核心算式與自動化維護腳本 ([Market_Engine_GAS.js](file:///f:/Projects/Market_Engine/Market_Engine_GAS.js))
- **Presentation Layer**: GitHub Pages 靜態網頁與 GAS Web App ([Index.html](file:///f:/Projects/Market_Engine/Index.html))

## ③ Database Schema (6 大 Sheet 職責)
1. `RAW_HISTORY`: 100% 官方實體歷史數據底座 (Date, TWII, VIX, MA60, MA240, Dist60, Dist240, MA60_Slope, Dist60_Delta, EWT_Change)。
2. `THRESHOLD_CONFIG`: 位階門檻定義表 (Single Source of Truth，連動 18 年 P10/P25/P75/P90 分位數)。
3. `LAB_BACKTEST`: 1 年期前瞻報酬與勝率統計回測表 (含 4 大維度自我驗證算式與 `LAB_CALC_DATE` 月度對帳標籤)。
4. `DASHBOARD`: 行情最新數據、今日位階、策略行動指引與 AI 顧問值班卡片。
5. `HISTORY_LOG`: 每日盤後定時快照歷史備份。
6. `DECISION_LOG`: 手動加碼/戰術決策審核檢討紀錄。

## ④ Function Library (核心函式索引)
- **行情與歷史對接**: `fetchRealMarketData()` (UrlFetchApp.fetchAll 並行 + 180s 快取), `fetchRealHistoricalMarketSeries()`, `fetchRealVIXHistoricalMarketSeries()`, `fetchRealEWTHistoricalMarketSeries()`, `generateMarketRows()`, `seedInitialData()`
- **初始化與後台對帳**: `setupMarketEngineV3()`, `applyRawHistoryFormulas()`, `buildLabBacktestSheet()`, `updateMonthlyLabBacktest()`, `updateTaiwanHolidaysCalendar()` (月度 Google Calendar 同步)
- **交易日與快取控管**: `isMarketOpen()` (0ms 本地 Hash 表 + ScriptProperties 查表), `getMarketEngineData()` (60s 全 API 快取 + 批次 Range 讀取)
- **策略對決與樣本外驗證**: `calculateStrategyBacktest()` (18年全歷史實體行情對決 Baseline vs Market Engine), `calculateWalkForwardValidation()` (10年滾動樣本外 Out-of-Sample 無未來資料偏誤驗證)
- **AI 雙顧問與新聞研報**: `callGeminiAPIUniversal()` (4 模型自動備援重試), `generateFallbackMorningText()` / `generateFallbackAfternoonText()`, `updateMorningMarketEngine()` / `updateAfternoonMarketEngine()`, `updateWeeklyFinNewsReport()` (🤖AI/📈CPI/🌐GEO 三大主題讀報), `fetchUpcomingMarketEvents()` (未來重大事件過期自動過濾)
- **量化決策算式**: `calculatePhaseDurationAndRelief()` (打折天數撫平器), `calculatePowderAndCdStatus()` (資金池 10%/20% + 3天 CD 冷卻 + 暴跌 3.5% Override), `calculatePhaseAnalysis()` (純數據位階分析), `parseDistValue()`

## ⑤ Decision Engine & 鐵則
- **單一位階判定**: 全站以 `RAW_HISTORY` 最新季線偏離度 `Dist60` 主導判定 (`T1極度恐慌`, `T2恐慌`, `T3順風/中性`, `T4過熱`, `T5狂熱`)。年線偏離度 `Dist240 > P90` 解耦轉為長線風險提醒。
- **雙軌決策機制**:
  - **📅 定期定額 (常態扣款)**: 獨占參照位階 (`Dist60`)！T1~T3 保持「🚀 明天照常自動扣款」，T4/T5「🛑 暫停扣款」。
  - **💣 資金池 (手動加碼)**: 雙重參照位階 (`T1/T2`) + 海外夜盤 (`EWT Change`)。加碼後進入 3 交易日 CD 冷卻期 (Dist60 深跌 2% 或當日暴跌 3.5% 自動提前解鎖)。
- **核心鐵則**: (1) 零擬真數據 (100% 官方實體行情)；(2) 零個人帳務/金流涉入；(3) 嚴格遵守 `DATA -> QUANT ENGINE -> SIGNAL -> RULE -> ACTION -> AI EXPLANATION` 階層。

## ⑥ AI Agents & Kopitiam 人設
- **老巴 (巴菲特 / 盤前 07:30)**: 護城河價值投資、農場與實體作物比喻、溫暖安定人心。
- **小羅 (索羅斯 / 盤後 16:30)**: 反身性哲學、情緒過度反應拆解、Pricing-in 與流動性防守。
- **新聞讀報 (週二 18:00)**: 綜合敘述 🤖AI、📈CPI、🌐GEO 三大主題，提供專屬對立哲學解讀。

## ⑦ System Endpoints & Version Status
- **Current Version**: `v2.8.0` (Milestone 6 策略對決模擬器與 Walk-Forward 樣本外驗證正式發布)
- **GAS Deployment**: `@91` (`https://script.google.com/macros/s/AKfycbyXxiVbJqRjTDfFkU2XTtScTVdLGqIafbDaqfSJeG-JQs0sJZ-A0wlQtPN52xHQqmHJqA/exec`)
- **GitHub Pages**: `https://voyagermartin.github.io/Market_Engine/`

## ⑧ Roadmap & Milestones
- **Milestone 1~6 (COMPLETED)**:
  - M1: 18 年三全量真實行情與試算表底座。
  - M2: 數據健康燈號與休市時間戳防呆。
  - M3: Kopitiam 品牌軟化與白話翻譯卡片。
  - M4: SPA 4 大分頁切換 (`today`, `concepts`, `backtest`, `finnews`) 與 MARKET LAB 驗證引擎。
  - M5: 資金池 3 天 CD 冷卻、打折天數撫平器、EWT 氣象與純數據位階分析。
  - M5.1 (v2.7.6~v2.7.12): Gemini 4 模型備援、UrlFetchApp.fetchAll 並行加速、0ms 假日查表、doGet < 50ms 響應、AI/CPI/GEO 三大新聞與未來事件過濾。
  - **M6 (v2.8.0 COMPLETED)**: ⚔️ 策略對決模擬器 (Baseline vs Market Engine 全指標對比) + 🔬 Walk-Forward 10年滾動樣本外測試 (Zero Overfitting 驗證)。
- **🚀 目前停止位置**: `v2.8.0` (Milestone 6 完工發布)
- **🎯 下一步施工目標 (Milestone 7 / v2.9.0)**:
  - **多視窗動態分位數比對 (3Y / 5Y / 10Y / 18Y Window)**: 比對不同時間視窗下之 P10/P25/P75/P90 門檻，識別「長線常態 vs. 短線結構過熱」之市場分歧訊號。

---
## ⑨ 開發日誌歷程 (Development History)
| 日期 | 版本 | 核心更新摘要 |
| :--- | :--- | :--- |
| **2026-07-26** | `v1.0~v1.6.1` | 全站 V3 初始建置、18年實體歷史行情鏈結、SPA UI 頁籤、Kopitiam 人設與深色護眼模式。 |
| **2026-08-01** | `v2.6.0~v2.7.1` | `📰 FIN-NEWS` 分頁發布、Google Docs 動態解析、近2日千點大跌鑑別、未來重大事件提醒卡。 |
| **2026-08-02** | `v2.7.2` | 週末 VIX / EWT 時間戳解耦與美股週五結算日對齊。 |
| **2026-08-06** | `v2.7.3~v2.7.5` | `parseDistValue` 通配解析器重構、季線位階 (`Dist60`) 全站統一、年線高位轉為長線風險提醒。 |
| **2026-08-25** | `v2.7.6~v2.7.12` | (1) Gemini 4 模型自動備援；(2) `fetchAll` 並行擷取與雙層 CacheService 快取；(3) 消除 CalendarApp 迴圈與 LLM 同步堵塞 (doGet < 50ms)；(4) `TAIWAN_HOLIDAYS_PRESET` 0ms 假日查表；(5) AI/CPI/GEO 三大主題實質新聞讀報；(6) 未來重大事件自動過濾歷史舊事件。 |
| **2026-08-25** | `v2.8.0` | **Milestone 6 完工發布**：(1) 實作 `calculateStrategyBacktest` 全歷史 18 年策略對決模擬器 (本金、終值、CAGR、MDD、Sharpe Ratio、資金效率)；(2) 實作 `calculateWalkForwardValidation` 10年滾動樣本外驗證；(3) 前端 `📈 歷史回測` 頁面發布對戰與驗證卡片。 |
