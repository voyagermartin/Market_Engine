# HANDBOOK.md (v2.8.10)

## ① Project Vision
建立整合型 Market Engine V3，將「市場觀察 Web App」與「MARKET LAB 研發實驗室」合併為單一 Google Sheet & GAS 專案。透過客觀的 18 年歷史數據分位數校正與量化回測，建立統一、無歧義的 Single Source of Truth 市場位階決策大腦。

* **核心引言 Slogan**：`研究市場，是為了最後不再被市場牽著走。`
* **產品哲學**：`Market Engine 不是預測明天的機器，而是一套從「想預測市場」走到「理解市場」，最後學會「不必預測市場」的投資紀律實驗。`

## ② System Architecture
- **Data Layer**: Google Sheet 6 大結構化分頁 (`RAW_HISTORY`, `THRESHOLD_CONFIG`, `LAB_BACKTEST`, `DASHBOARD`, `HISTORY_LOG`, `DECISION_LOG`)
- **Engine Layer**: Google Apps Script 核心算式與自動化維護腳本 ([Market_Engine_GAS.js](file:///f:/Projects/Market_Engine/Market_Engine_GAS.js))
- **Presentation Layer**: GitHub Pages 靜態網頁與 GAS Web App ([index.html](file:///f:/Projects/Market_Engine/index.html))

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
- **策略對決與樣本外驗證**: `calculateStrategyBacktest()` (18年全歷史實體行情對決 Baseline vs Market Engine，採用真實投資組合權益曲線 `Total Equity = Shares × Index + Cash` 精準計算 MDD), `calculateWalkForwardValidation()` (10年滾動樣本外 Out-of-Sample 無未來資料偏誤驗證)
- **AI 雙顧問與新聞研報**: `callGeminiAPIUniversal()` (4 模型自動備援重試), `generateFallbackMorningText()` / `generateFallbackAfternoonText()`, `updateMorningMarketEngine()` / `updateAfternoonMarketEngine()`, `updateWeeklyFinNewsReport()` (🤖AI/📈CPI/🌐GEO 三大主題讀報), `fetchUpcomingMarketEvents()` (未來重大事件過期自動過濾)
- **量化決策算式**: `calculatePhaseDurationAndRelief()` (位階持續天數計算，嚴格以 Single Source of Truth `Dist60` 判定歷史每列位階，修復 `d240` 與格式解析造成重複斷裂歸 1 BUG), `calculatePowderAndCdStatus()` (資金池 10%/20% + 3天 CD 冷卻 + 暴跌 3.5% Override), `calculatePhaseAnalysis()` (純數據位階分析), `parseDistValue()`

## ⑤ Decision Engine & 鐵則
- **單一位階判定**: 全站以 `RAW_HISTORY` 最新季線偏離度 `Dist60` 主導判定 (`T1極度恐慌`, `T2恐慌`, `T3順風/中性`, `T4過熱`, `T5狂熱`)。年線偏離度 `Dist240 > P90` 解耦轉為長線風險提醒。
- **三大角色與核心哲學**:
  - 🧱 **1. 基石 (持續投入)**：固定扣款是資產累積的主體，讓時間與人類頂尖企業的成長替你工作。
  - 💣 **2. 彈藥 (保留選擇權)**：高利水庫保留流動性是為了「在極端崩盤時擁有勇氣」，而非試圖猜測高低點。
  - 🛡️ **3. 護欄 (阻止自己犯錯)**：市場過熱時阻止貪婪 FOMO 追高，市場崩盤時阻止恐慌砍在阿呆谷。
- **🚫 長期持有鐵則 (徹底移除高檔停利誤導)**:
  - 不因「市場太高」而隨意賣出長期核心資產。
  - 18.6 年真實回測證明：對於長期向上的原型大盤指數，主動高檔停利會造成嚴重的「結構性踏空成本」。賣出只留給退休生活、資產再平衡與人生緊急需求。
- **核心鐵則**: (1) 零擬真數據 (100% 官方實體行情)；(2) 零個人帳務/金流涉入；(3) 嚴格遵守 `DATA -> QUANT ENGINE -> SIGNAL -> RULE -> ACTION -> AI EXPLANATION` 階層。

## ⑥ AI Agents & Kopitiam 人設 (升級版)
- **老巴 (巴菲特 / 盤前 07:30)**: 護城河價值投資、農場種子向下扎根比喻、鼓勵專注本業工作與生活，喝杯咖啡後安心出發。
- **小羅 (索羅斯 / 盤後 16:30)**: 理性拆解群眾情緒、提醒勿在過熱時追高、恐慌時保持冷靜，鼓勵關掉螢幕與報價，好好陪伴家人。
- **新聞讀報 (週二 18:00)**: 綜合敘述 🤖AI、📈CPI、🌐GEO 三大主題，提供專屬對立哲學解讀。

## ⑦ System Endpoints & Version Status
- **Current Version**: `v2.8.10` (核心敘事重構、回測頁面精簡與位階天數連線全套修復完成)
- **GAS Deployment**: `@100`
- **GitHub Pages**: `https://voyagermartin.github.io/Market_Engine/`

## ⑧ Roadmap & Milestones
- **Milestone 1~6 (COMPLETED)**:
  - M1: 18 年三全量真實行情與試算表底座。
  - M2: 數據健康燈號與休市時間戳防呆。
  - M3: Kopitiam 品牌軟化與白話翻譯卡片。
  - M4: SPA 4 大分頁切換 (`today`, `concepts`, `backtest`, `finnews`) 與 MARKET LAB 驗證引擎。
  - M5: 資金池 3 天 CD 冷卻、打折天數撫平器、EWT 氣象與純數據位階分析。
  - M5.1 (v2.7.6~v2.7.12): Gemini 4 模型備援、UrlFetchApp.fetchAll 並行加速、0ms 假日查表、doGet < 50ms 響應、AI/CPI/GEO 三大新聞與未來事件過濾。
  - M6 (v2.8.0 COMPLETED): ⚔️ 策略對決模擬器 (Baseline vs Market Engine 全指標對比) + 🔬 Walk-Forward 10年滾動樣本外測試 (Zero Overfitting 驗證) + 💡 白話導讀與 534 萬本金差異 QA 卡片。
  - M6.5 (v2.8.5 COMPLETED): 🌟 核心敘事重構 (Narrative Refactoring) – 「研究市場，是為了最後不再被市場牽著走」。完成 3 年探索時間軸 (Road to Simplicity)、三大角色重定義、徹底移除高檔停利誤導性敘事、長期持有鐵則發布、雙顧問溫暖文風升級。
  - M6.6 (v2.8.7 COMPLETED): 🧹 回測頁面精簡清理 – 徹底移除導讀卡片與雙欄數據對照卡片，保留「三年探索時間軸 (Road to Simplicity)」與客觀標準「18年歷史位階前瞻報酬與勝率統計表」，維持極致純粹之 Glassmorphism 視覺質感。
  - **M6.7 (v2.8.10 COMPLETED)**: 🐛 位階天數與 API 連線全套修復 – 修復 `calculatePhaseDurationAndRelief` 中因舊式 `d240` 與原生 `Number()` 門檻解析導致歷史位階比對中斷歸 1 之問題，並升級前端 `GAS_API_BASE` 指向主部署網址 (`@100`)。
- **🚀 目前停止位置**: `v2.8.10` (核心敘事重構與位階天數全套發布完工)
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
| **2026-08-26** | `v2.8.0` | **策略對決與視覺白話全套優化**：(1) 重構 MDD 為真實投資組合權益曲線算式 (`Total Equity = Shares × Index + Cash`，Baseline -29.56% vs Market Engine -27.25%)；(2) 前端動態 MDD 顯著改善標籤連動發布 (>= 0.5% 門檻觸發)；(3) UI 排版與跨裝置字體對齊優化；(4) 新增『💡 18 年實戰模擬白話導讀』Glassmorphism 卡片與『❓ 總本金差異 534 萬來源與效率證明』QA 解答區塊；(5) 雲端 GAS 部署升級至 `@94`。 |
| **2026-08-27** | `v2.8.5~v2.8.10` | **里程碑 Milestone 6 核心敘事重構與系統大修復**：(1) 升級 Slogan「研究市場，是為了最後不再被市場牽著走」與核心引言；(2) 重定義三大角色（基石、彈藥、護欄）並加入長期持有鐵則卡；(3) 回測頁發布「三年探索時間軸 (Road to Simplicity)」，並清理導讀卡與對照卡；(4) 修復 `calculatePhaseDurationAndRelief` 中舊 `d240` 邏輯與門檻格式解析 Bug；(5) 重構 `GAS_API_BASE` 與主 API Deployment ID 強制升級部署至 `@100`。 |
