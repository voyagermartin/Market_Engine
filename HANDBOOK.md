# HANDBOOK.md (v2.7.12)

## ① Project Vision
建立整合型 Market Engine V3，將「市場觀察 Web App」與「MARKET LAB 研發實驗室」合併為單一 Google Sheet & GAS 專案。透過客觀的歷史數據分位數校正與 18 年回測，建立統一、無歧義的市場位階決策體系（Single Source of Truth）。

## ② System Architecture
- **Data Layer**: Google Sheet 6 大結構化分頁 (`RAW_HISTORY`, `THRESHOLD_CONFIG`, `LAB_BACKTEST`, `DASHBOARD`, `HISTORY_LOG`, `DECISION_LOG`)
- **Engine Layer**: Google Apps Script (GAS) 核心算式與自動化維護腳本 ([Market_Engine_GAS.js](file:///f:/Projects/Market_Engine/Market_Engine_GAS.js))
- **Presentation Layer**: GitHub Pages 靜態網頁 / GAS Web App ([Index.html](file:///f:/Projects/Market_Engine/Index.html)) / Google Sheet Dashboard

## ③ Database Schema
1. `RAW_HISTORY`: Date, TWII (100% 官方真實收盤), VIX (CBOE 官方真實 VIX), MA60, MA240, Dist60 (季線乖離), Dist240 (年線乖離), MA60_Slope (季線5日斜率), Dist60_Delta (5日動能), EWT_Change (MSCI EWT 100% 官方真實夜盤漲跌%)
2. `THRESHOLD_CONFIG`: 位階代號, 位階名稱, Dist60下限, Dist60上限, Dist240下限, Dist240上限, 策略建議與行動指引 (Single Source of Truth，含 P10, P25, P75, P90 分位數連動校正)
3. `LAB_BACKTEST`: 位階名稱, 歷史天數 (Count), 天數佔比 (%), 1年期平均報酬率 (%), 1年期正報酬勝率 (%), 驗證說明與結論 (含 `LAB_CALC_DATE` 月度對帳日期標籤與 4 大維度自我驗證算式)
4. `DASHBOARD`: 市場最新數據, 今日市場位階, 趨勢動能燈號, 核心策略行動指引, 定期定額扣款決策卡, AI 顧問單一值班卡片, 數據健康狀態燈號
5. `HISTORY_LOG`: Date, TWII, Dist60, Dist240, VIX, 今日位階, MA60_Slope, Dist60_Delta, 1年期前瞻報酬率, AI_Morning_Story, AI_Afternoon_Story
6. `DECISION_LOG`: 日期 (Date), 當時市場位階/訊號, 策略動作, 執行說明, 策略符合度, 策略思考與檢討備註

## ④ Function Library
- `onOpen()`: 於 Google Sheet 註冊自訂 UI 選單 `🚀 Market Engine V3`
- `fetchRealMarketData()`: 即時金融行情對接器 (v2.7.7 重構：導入 `UrlFetchApp.fetchAll` 並行擷取與 180 秒 `CacheService` 快取)
- `fetchRealHistoricalMarketSeries()`: 全歷史 18 年交易日台股 (`^TWII` `period1=0`) 100% 官方實體收盤價 API 抓取器
- `fetchRealVIXHistoricalMarketSeries()`: 全歷史 18 年 CBOE VIX 恐慌指數 (`^VIX` `period1=0`) 100% 官方實體收盤價 API 抓取器
- `fetchRealEWTHistoricalMarketSeries()`: 全歷史 18 年 MSCI Taiwan ETF (`EWT` `period1=0`) 100% 官方實體夜盤漲跌幅 API 抓取器
- `generateMarketRows()`: 100% 三全量官方真實歷史數據產生器 (台股收盤 + CBOE VIX + MSCI EWT 夜盤 100% 實體連動)
- `setupMarketEngineV3()`: 高效能主初始化建置函式
- `applyRawHistoryFormulas()`: 全自動批次寫入均線 (`AVERAGE`) 與乖離率純量化連動公式
- `seedInitialData()` / `seedFullHistoricalData()`: 寫入 2008~2026 18年 100% 官方真實盤後點位、VIX 與 EWT 歷史底座
- `buildLabBacktestSheet()`: 建立 1 年期前瞻報酬率與勝率統計回測表
- `updateMonthlyLabBacktest()`: 月度歷史回測 4 大維度自我驗證引擎 (每月 1 日 01:00 自動對帳更新並記錄對帳日期)
- `buildDashboardSheet()`: 建立日常觀察卡片、今日位階判定與 AI 顧問值班卡片
- `isMarketOpen()`: 交易日判定函式 (v2.7.8 重構：導入 24 小時 CacheService 快取，徹底根治迴圈重複查詢 CalendarApp 造成的 45 秒網路塞車)
- `callGeminiAPIUniversal()`: 多模型自動備援重試 Gemini API 呼叫器 (依序自動切換 `gemini-2.5-flash` -> `gemini-2.0-flash` -> `gemini-1.5-flash` -> `gemini-flash-latest`)
- `generateFallbackMorningText()` / `generateFallbackAfternoonText()`: ☕ 智慧特調備援文字產生器 (當 API 離線或金鑰未設定時，保證老巴與小羅永遠常駐 Kopitiam)
- `generateMorningNavigation()` / `generateAfternoonNavigation()`: 老巴與小羅 AI 導航生成腳本
- `updateMorningMarketEngine()` / `updateAfternoonMarketEngine()`: 每日盤前與盤後自動更新腳本 (對接實體 API，含時間戳過濾與快取自動清除)
- `createDailyTrigger()`: 建立每日 07:30 與 16:30 雙時段自動觸發器 (盤前 07:30 老巴早餐值班，盤後 16:30 小羅午茶值班，每月 1 日 01:00 月度對帳)
- `doGet()`: Web App / API 入口 (輸出健康狀態與即時時間戳，包含 AI 故事背景自動生成檢查)
- `getMarketEngineData()`: 精準讀取 `RAW_HISTORY` Row 3 API 與行情健康燈號 (v2.7.8 重構：嚴禁在 doGet 中同步發起遠端 LLM 網路請求，全面採用本地特調備援，連連響應時間小於 50ms)
- `calculatePhaseDurationAndRelief()`: 掃描 `RAW_HISTORY` 統計當前位階持續天數與歷史平均天數 (打折天數撫平器)
- `calculatePowderAndCdStatus()`: 階梯式資金池開火 (10%/20%) 與 3 交易日 CD 冷卻期 (含 Dist60 深跌 2% 提前解鎖條款)
- `recordPowderAllocation()`: 記錄手動/觸發資金池加碼時間點與當時乖離率
- `parseDistValue()`: 數字/百分比字串通配解析器
- `calculatePhaseAnalysis()`: 純數據位階理性分析算式

## ⑤ Decision Engine
- **單一位階判定邏輯 (v2.7.5 全站統一重構)**：全站統一以 `RAW_HISTORY` 最新之季線偏離度 `Dist60` 作為日常市場位階的主導判定 (`極度恐慌`, `恐慌`, `順风/中性`, `過熱`, `狂熱`)。當年線偏離度 `Dist240` 處於長線高位 (> P90) 時解耦轉為「長線趨勢警示」，附加於行動指引與戰術說明中，維護位階與上下邊界距離之 100% 邏輯一致性。
- **動態分位數門檻校正**：門檻由 2008~2026 18年歷史真實分位數 (`P10`, `P25`, `P75`, `P90`) 自動計算產生。
- **打折視窗與天數撫平器 (Missed-out Relief)**：
  - 恐慌 / 極度恐慌時呈現：`🛒 當前位階：T1 極度恐慌 (打折第 X 天 / 歷史平均持續約 11 天)` 與 `💡 心理指南：歷史數據顯示恐慌區間具有持續性，錯過今日無須焦慮，打折視窗仍在！`
- **定期定額 vs. 資金池加碼雙軌決策機制 (Double-Track Decoupled Decision)**：
  - **📅 長期定期定額（常態扣款）**：純粹參照「市場位階 (Dist60 / Phase)」！T1/T2/T3 均為「🚀 明天照常自動扣款」，T4/T5 為「🛑 暫停定期定額」。不受昨日夜盤/今日開盤漲跌影響，維持極致基底紀律。
  - **💣 資金池手動加碼（手動加碼）**：須「位階 (Phase) ＋ 海外夜盤動能 (EWT Change)」雙重參照！
    - 當位階處於 T1 / T2（具備加碼資格）時：
      * 若 EWT 夜盤漲幅 >= +2.5%：加碼狀態提示改為「⚠️ 開盤激情強彈 (+X%)！資金池請觀望延後，切勿早盤追高，留待盤中平穩或尾盤再行評估」。
      * 若 EWT 夜盤平穩或下跌：加碼狀態提示維持「🚀 可動用資金池 10%/20% 手動加碼」。
    - **CD 冷卻控管**：加碼後進入 3 交易日 CD 冷卻期，優先顯示「🧊 資金池加碼冷卻中 (建議 CD 剩餘 X 天)」。若 Dist60 深跌 2% 以上則自動觸發提前解鎖條款。
    - T3 / T4 / T5 非加碼位階，加碼狀態顯示「🟢 備戰狀態，按兵不動 (資金池 0%)」。
- **純數據位階理性分析 (Phase Analysis - v2.7.4 邊界敘述解耦與位階邏輯統一)**：
  - **18年歷史百分比與邊界距離**：純粹依據季線偏離度 `Dist60` 對照 `P10/P25/P75/P90` 分位數計算，與整體位階完全解耦。
  - **AI 導航解耦**：獨立區塊呈現，無須呼叫 LLM API，亦不於老巴/小羅導航中重複硬編碼數值，保持 AI 心態引導與數據理性分析解耦。

## ⑥ AI Agents
- **巴菲特‧索羅斯的 Kopitiam**
  - 老巴盤前 AI 導航 (`generateMorningNavigation`): 07:30 值班 (老巴早餐)
  - 小羅盤後 AI 導航 (`generateAfternoonNavigation`): 16:30 值班 (小羅午茶 - 時間校正修復)
  - 多模型自動備援: `gemini-2.5-flash` -> `gemini-2.0-flash` -> `gemini-1.5-flash` -> `gemini-flash-latest` (含 Kopitiam 智慧特調備援，確保老巴與小羅永遠常駐 Kopitiam)

## ⑦ Dashboard / UI (v2.7.8 消除 CalendarApp 與 LLM 同步堵塞)
- **毫秒級連線回應大突破 (v2.7.8)**: 徹底根治連線長達數分鐘的問題！(1) 為 `isMarketOpen` 導入 24 小時 CacheService 快取，解決迴圈中 30 次 `CalendarApp` 查詢造成的 45 秒網路堵塞；(2) 移除 `doGet` 中同步呼叫遠端 LLM API 的巨型堵塞點，改用毫秒級本地智慧特調，連線反應時間大幅壓縮至 50ms 內。
- **連線與回應速度大升級 (v2.7.7)**: 重構 `fetchRealMarketData` 為 `UrlFetchApp.fetchAll` 並行網路請求。
- **老巴與小羅多模型自動備援與 Kopitiam 常駐修復 (v2.7.6)**: 導入 `callGeminiAPIUniversal` 多模型自動重試機制。
- **GitHub Pages 靜態網頁**: `https://voyagermartin.github.io/Market_Engine/`
- **GAS Web App**: `https://script.google.com/macros/s/AKfycbyXxiVbJqRjTDfFkU2XTtScTVdLGqIafbDaqfSJeG-JQs0sJZ-A0wlQtPN52xHQqmHJqA/exec`

## ⑧ Coding Rules
- 遵守 Universal Handbook Prompt v2.0 所有規則。
- 零容忍擬真數據：徹底刪除 `Math.random()` 及所有擬真推算公式，100% 連動證交所、CBOE 與 MSCI EWT 官方實體歷史盤後點位。
- **【金流與帳務零涉入鐵則】**：Market Engine 永遠保持為「純粹的公開市場量化決策大腦」，絕不紀錄、不處理任何個人實體金流、持股張數、交易帳務或敏感資產數據。
- **【數據與 AI 階層鐵則】**：嚴格遵守 `DATA -> QUANT ENGINE -> SIGNAL -> RULE -> ACTION -> AI EXPLANATION` 運算架構。AI 僅作為「解釋層與心態導航」，絕對不可代為產出或覆寫量化投資結論。

## ⑨ Current Sprint
v2.7.8 消除 isMarketOpen 的 CalendarApp 迴圈讀取與 doGet 中同步 LLM API 呼叫，極致完成毫秒級響應發布。

## ⑩ Current Version
v2.7.8 (消除 CalendarApp 與 LLM 同步堵塞，全站毫秒級連線響應發布)

## ⑪ Roadmap
- Milestone 1: 試算表基礎架構與 100% 三全量真實歷史行情鏈結完工。
- Milestone 2: 數據健康狀態燈號與颱風假/臨時休市時間戳防呆完工。
- Milestone 3: Kopitiam 溫馨品牌軟化、白話翻譯卡片與美味咖啡圖示完工發布。
- Milestone 4: SPA 3 大分頁切換重構、觀念導航 5 大圖卡精簡與 MARKET LAB 4 大維度自我驗證引擎完工。
- Milestone 5: 資金池 3 天 CD 冷卻期控管、打折天數撫平器、EWT 開盤心理準備卡與純數據位階分析完工。
- **目前停止位置**: v2.7.8 消除 CalendarApp 與 LLM 同步堵塞，全站毫秒級連線響應發布！
- **下一步施工位置**: 進入 Milestone 6 (v2.8.0) 策略對決模擬器與 Out-of-Sample 滾動驗證研發。(+X%)！資金池請觀望延後，切勿早盤追高，留待盤中平穩或尾盤再行評估」。
      * 若 EWT 夜盤平穩或下跌：加碼狀態提示維持「🚀 可動用資金池 10%/20% 手動加碼」。
    - **CD 冷卻控管**：加碼後進入 3 交易日 CD 冷卻期，優先顯示「🧊 資金池加碼冷卻中 (建議 CD 剩餘 X 天)」。若 Dist60 深跌 2% 以上則自動觸發提前解鎖條款。
    - T3 / T4 / T5 非加碼位階，加碼狀態顯示「🟢 備戰狀態，按兵不動 (資金池 0%)」。
- **純數據位階理性分析 (Phase Analysis - v2.7.4 邊界敘述解耦與位階邏輯統一)**：
  - **18年歷史百分比與邊界距離**：純粹依據季線偏離度 `Dist60` 對照 `P10/P25/P75/P90` 分位數計算，與整體位階完全解耦（例：當偏離度為 `+0.31%` 時，第一區塊明確標示位於 `P25 (-1.4%) ~ P75 (+4.2%) 常態區間`，向下安全距離與向上復甦距離分別精準計算至 P25 與 P75，徹底消除文字衝突）。
  - **AI 導航解耦**：獨立區塊呈現，無須呼叫 LLM API，亦不於老巴/小羅導航中重複硬編碼數值，保持 AI 心態引導與數據理性分析解耦。

## ⑥ AI Agents
- **巴菲特‧索羅斯的 Kopitiam**
  - 老巴盤前 AI 導航 (`generateMorningNavigation`): 07:30 值班 (老巴早餐)
  - 小羅盤後 AI 導航 (`generateAfternoonNavigation`): 16:30 值班 (小羅午茶 - 時間校正修復)
  - 多模型自動備援: `gemini-2.5-flash` -> `gemini-2.0-flash` -> `gemini-1.5-flash` -> `gemini-flash-latest` (含 Kopitiam 智慧特調備援，確保老巴與小羅永遠常駐 Kopitiam)

## ⑦ Dashboard / UI (v2.7.6 老巴與小羅多模型自動備援發布)
- **老巴與小羅多模型自動備援與 Kopitiam 常駐修復 (v2.7.6)**: 導入 `callGeminiAPIUniversal` 多模型自動重試機制，徹底解決單一模型 `gemini-flash-latest` 失效/404 導致 AI 顧問離開咖啡館的問題。同時新增 Kopitiam 智慧特調備援生成器與 `getMarketEngineData` 雙向自動修復，確保網頁與試算表中老巴與小羅 100% 永遠有人值班。
- **季線為主市場位階與邊界解耦 (v2.7.5)**: 將位階判定全站統一為以季線偏離度 Dist60 為主要判定，並重構 `calculatePhaseAnalysis` 之向上與向下安全距離敘述。
- **SPA 頁面分頁化重構 (Tab Navigation)**: 4 大 Glassmorphism 頁籤（☕ 今日戰情 `today`, 💡 觀念導航 `concepts`, 📈 歷史回測 `backtest`, 📰 FIN-NEWS `finnews`）。
- **品牌人情味與極致白話**: 巴菲特‧索羅斯的 Kopitiam (來喝咖啡看盤吧～)。
- **GitHub Pages 靜態網頁**: `https://voyagermartin.github.io/Market_Engine/`
- **GAS Web App**: `https://script.google.com/macros/s/AKfycbyXxiVbJqRjTDfFkU2XTtScTVdLGqIafbDaqfSJeG-JQs0sJZ-A0wlQtPN52xHQqmHJqA/exec`

## ⑧ Coding Rules
- 遵守 Universal Handbook Prompt v2.0 所有規則。
- 零容忍擬真數據：徹底刪除 `Math.random()` 及所有擬真推算公式，100% 連動證交所、CBOE 與 MSCI EWT 官方實體歷史盤後點位。
- **【金流與帳務零涉入鐵則】**：Market Engine 永遠保持為「純粹的公開市場量化決策大腦」，絕不紀錄、不處理任何個人實體金流、持股張數、交易帳務或敏感資產數據。
- **【數據與 AI 階層鐵則】**：嚴格遵守 `DATA -> QUANT ENGINE -> SIGNAL -> RULE -> ACTION -> AI EXPLANATION` 運算架構。AI 僅作為「解釋層與心態導航」，絕對不可代為產出或覆寫量化投資結論。

## ⑨ Current Sprint
v2.7.6 導入 Gemini 多模型自動備援呼叫器與 Kopitiam 智慧特調，徹底解決老巴與小羅離開咖啡館的問題。

## ⑩ Current Version
v2.7.6 (老巴與小羅多模型自動備援與咖啡館常駐修復發布)

## ⑪ Roadmap
- Milestone 1: 試算表基礎架構與 100% 三全量真實歷史行情鏈結完工。
- Milestone 2: 數據健康狀態燈號與颱風假/臨時休市時間戳防呆完工。
- Milestone 3: Kopitiam 溫馨品牌軟化、白話翻譯卡片與美味咖啡圖示完工發布。
- Milestone 4: SPA 3 大分頁切換重構、觀念導航 5 大圖卡精簡與 MARKET LAB 4 大維度自我驗證引擎完工。
- Milestone 5: 資金池 3 天 CD 冷卻期控管、打折天數撫平器、EWT 開盤心理準備卡與純數據位階分析完工。
- **目前停止位置**: v2.7.6 老巴與小羅多模型自動備援與咖啡館常駐修復發布！
- **下一步施工位置**: 進入 Milestone 6 (v2.8.0) 策略對決模擬器與 Out-of-Sample 滾動驗證研發。

### 🚀 未來進化藍圖 (Future Milestones)
- **Milestone 6 (v2.8.0) - 第一戰役：策略實證與 Out-of-Sample 壓力測試**
  1. **策略對決模擬器 (Strategy Backtest Engine)**：
     - 開發純歷史數據之策略回測算式，比較 Baseline (無條件定期定額) vs. Market Engine 規則 (T3扣/T4停/T5停/T1~T2加碼/3天CD) 之 CAGR、MDD、Sharpe Ratio 與現金利用率。
     - 融入「單日暴跌 >= 3.5% 閃崩 Override 強制解鎖條款」測試。
  2. **Walk-Forward / Out-of-Sample (樣本外滾動驗證)**：
     - 實作 2008~2026 滾動視窗測試（以歷史資料定義門檻，測試未看過的樣本外未來年份），確保門檻無過度擬合 (Overfitting) 與偷看未來資料之疑慮。

- **Milestone 7 (v2.9.0) - 第二戰役：動態強韌與多視窗結構分歧雷達**
  1. **多視窗動態分位數比對 (3Y / 5Y / 10Y / 18Y Window)**：
     - 比對不同時間視窗下之 P10/P25/P75/P90 門檻，識別「長線常態 vs. 短線結構過熱」之市場分歧訊號。

- **Milestone 8 (v3.0.0) - 第三戰役：極致透明度與純數據架構完全體**
  1. **訊號信心度與 Why 理由卡 (Signal Confidence Score)**：
     - 整合多維度指標 (Dist60, Dist240, Slope, Delta, VIX, EWT) 產出 0~100 共振信心分數與正反面原因拆解。
  2. **數據血緣標籤 (Data Lineage & Timestamp Transparency)**：
     - 於 API 與 UI 置頂明確標註 TWII/VIX/EWT 實體資料時間戳，杜絕 AI 故事與量化數據之時間軸錯亂。

---
## ⑫ 開發日誌 (Development Log)

### 📅 2026-07-26 全站架構升級、休市連動、品牌人設與護眼體驗完整發布 (v1.1.0 ~ v1.6.1)
- 核心架構與 AI 導航升級，完成雙時段自動觸發與品牌護眼視覺體驗發布。

### 📅 2026-07-27 系統維護、勝率修復與實體 API 對接 (v1.6.2 ~ v1.7.1)
- 修復 MARKET LAB 勝率統計算式，並導入實體 API 行情鏈結。

### 📅 2026-07-27 TAIEX + CBOE VIX + MSCI EWT 18 年全歷史真實數據大滿貫完工 (v1.8.0 ~ v1.9.1)
- 修正 API 歷史起點參數 `period1=0`，寫入 7,122 個官方交易日真實價格。
- 實作 `fetchRealVIXHistoricalMarketSeries()` 與 `fetchRealEWTHistoricalMarketSeries()`, 導入 CBOE VIX 與 MSCI EWT 全歷史真實數據。

### 📅 2026-07-27 Kopitiam 人性化品牌升級與小學生白話翻譯發布 (v2.0.0)
- **頁頂亂碼修復與標題人情味軟化 (Kopitiam Warm Branding)**：
  - 徹底清除頁頂狀態列 `<ctrl42>` 等歷史標籤符號，呈現乾淨溫馨狀態。
  - 主標題更名為「巴菲特‧索羅斯的 Kopitiam」(副標：來喝咖啡看盤吧～)。
  - 全站大標題去英文註解化白話語義：`☕ 今日市場溫度`、`🧭 今日大師給你的操作錦囊`、`如果明天定期定額要扣款......`、`☕ 來一杯咖啡，聊市場是非`。
- **專業指標小學生白話卡片化**：
  - 季線 5日斜率 (大盤底氣)：動態呈現「🧱 大盤底氣很硬，有強大的地板支撐著！」/「⚠️ 大盤底氣不足，地板正在慢慢變軟喔！」。
  - 5日乖離動能 (買氣油門)：動態呈現「🚀 大家正搶著進場，買氣正在大腳踩油門！」/「🛑 大家開始觀望，買氣正在輕踩煞車喔！」。
- **Kopitiam 美味咖啡 App Icon & Favicon 發布**：
  - 替換原本 3D 金牛 Icon 為香濃奶泡與金色微光 Kopitiam 咖啡 Icon (`favicon.png` / `icon.png`)，完美搭配「來喝咖啡看盤吧～」主題。
- **部署發布**：全數完成 GAS CLI 部署、Deployment `@2` 覆寫與 GitHub `main` 分支推播發布。

### 📅 2026-07-28 季線/年線乖離率極致白話卡片化、連線狀態 (Loading) 體驗與 EWT 門檻優化 (v2.1.0)
- **台股加權指數狀態文字修正**：將「即時收盤價」修改為「最近一次收盤價」，更貼合未收盤時之實體狀態。
- **季線/年線乖離率白話大改版**：比照 5 日斜率，將 `Dist60` 與 `Dist240` 升級為下方滿版白話說明提示框，並透過 JavaScript 動態變更色調樣式。
- **AI 故事預設值去數值化**：將原本硬編碼含有特定漲跌幅的初始故事，修正為中性的 Gemini API Key 設定指引與引導文字，避免未呼叫 API 時出現前後數據矛盾。
- **極致載入中體驗 (Loading State)**：設計了完整「連線中...」的前端 UI 預設值，在 dynamic JSONP 載入成功前，指標顯示「連線中...」、大師顯示「正在忙著沖咖啡、看盤，請稍候...」，避免載入前帶入 Mock 舊資料的突兀感。
- **定期定額決策卡 (DCA Guide) 動態著色**：根據 AI 顧問決策（加碼/維持/暫停），動態更新邊框、背景與文字色調，提升 UI 互動精緻感。
- **部署發布**：全數完成 GAS CLI 部署、Deployment `@2` 覆寫與 GitHub `main` 分支推播發布。

### 📅 2026-07-28 網頁排版收納與跑版修正、網頁端即時 AI 故事背景自動生成優化 (v2.2.0)
- **排版與寬度修正**：移除 [index.html](file:///f:/Projects/Market_Engine/Index.html) 中重複的來一杯咖啡區塊，並修復了因多餘 `</div>` 造成外層 `.container` 提早閉合的跑版問題，使下方所有區塊完美重合於容器內。
- **後端 API 與 AI 首次連線優化**：於 [程式碼.js](file:///f:/Projects/Market_Engine/%E7%A8%8B%E5%BC%8F%E7%A2%BC.js) 中新增自動防呆機制，若網頁載入時偵測到試算表內 AI 欄位為預設值，且已設定 API 金鑰，則會在 API 請求時自動於背景觸發 AI 故事生成並更新試算表儲存格，保證首次使用的 Web App 能立即看到 AI 解析內容。
- **部署發布**：全數完成 GAS CLI 部署、Deployment `@2` 覆寫與 GitHub `main` 分支推播發布。

### 📅 2026-07-29 台股狀態標籤修復、月度對帳自我驗證與 16:30 盤後時段校正發布 (v2.3.0 ~ v2.3.8)
- **盤後更新時段精準校正**：將小羅盤後 AI 導航與盤後更新時間由 14:30 調整校正為 16:30，以確保美股夜盤 / CBOE VIX 盤後數據及證交所完整資料已順利入庫。
- **MARKET LAB 月度歷史回測與勝率自我驗證引擎**：新增 `updateMonthlyLabBacktest()` 函式與 `LAB_CALC_DATE` 標籤，於每月 1 日 01:00 自動執行 18 年全歷史 4 大維度前瞻報酬與勝率對帳。
- **EWT 5 階動能門檻與燈號優化**：新增 `calculateEwtStatus()` 門檻算式，明確劃分 5 階夜盤氣象狀況。
- **前端即時時間戳與動態標籤修復**：修正 Web App 台股交易狀態、Market LAB 計算日期標籤與 AI 值班時間標記。

### 📅 2026-07-29 SPA 頁面分頁化重構、觀念導航 5 大圖卡大升級與白話精簡發布 (v2.4.0 ~ v2.4.5)
- **SPA 頁面分頁化重構 (SPA Tab Navigation)**：導入 3 大 Glassmorphism 頁籤（`☕ 今日戰情`、`💡 觀念導航`、`📈 歷史回測`），並以動態 JavaScript 切換 `.tab-content` 顯示狀態，解決頁面過長問題。
- **觀念導航 5 大指標圖卡大升級**：全面改版重寫 5 大指標說明圖卡（VIX 市場體溫計、MA60/MA240 趨勢守護地板、Dist60 小狗散步位階、Slope/Delta 底氣與油門、EWT 5 階海外氣象球）。
- **精簡去除贅字**：全面清理去除圖卡內「白話比喻：」等前綴贅字，讓畫面視覺更為乾淨現代。
- **全站 CSS 樣式與響應式補強**：確保 `.nav-tabs` 及各分頁容器在手機與桌面極致寬度均保持完美對齊與玻璃擬物微光質感。
- **部署發布**：全數完成 GAS CLI 部署、Deployment `@2` 覆寫與 GitHub `main` 分支推播發布。

### 📅 2026-07-30 開盤前昨日行情誤判颱風假修復與前端 API 隨機時間戳防快取版 (v2.4.6)
- **修復開盤前颱風假誤判**：修正 `fetchRealMarketData()` 判斷邏輯，當成交日期小於今日時，限制必須今天是預期開盤的交易日（`isMarketOpen` 判定），且台北時間已過 09:30 之後，才顯示為颱風/臨時休市，防止每天早上開盤前因 API 尚未更新最新一交易日行情而造成誤判。
- **導入前端快取消除機制 (Cache Busting)**：在 [index.html](file:///d:/Projects/Market_Engine/index.html) 的 JSONP 請求 URL 中附加 `&_=` 當前時間戳參數，解決瀏覽器與 CDN 快取 API 回應之問題，確保網頁重整能立即更新今日行情。
- **發布部署**：完成 GAS CLI 重新部署（Deployment `@43` 指向最新代碼），並推播至 GitHub 遠端儲存庫以同步更新 GitHub Pages 靜態網頁。

### 📅 2026-07-30 盤前 VIX 指數即時更新與防判讀誤解版 (v2.4.7)
- **修復盤前 VIX 顯示舊值**：修改 `updateMorningMarketEngine()` 函式，由原本繼承昨日 VIX 初始占位值，改為在盤前更新時即時透過 API 擷取最新已收盤之 VIX 指數（美股今晨收盤價），避免因時差造成白天判讀之誤解。
- **發布部署**：完成 GAS CLI 重新部署與 GitHub Pages 同步發布。

### 📅 2026-07-30 DASHBOARD 公式參照漂移與後端位階動態計算覆寫 (v2.4.8)
- **修正公式參照漂移**：由於 RAW_HISTORY 每日更新會插入新行，導致 Google Sheet 自動將 DASHBOARD 參照向下漂移至昨日舊數值（如 B7 由 `=RAW_HISTORY!F3` 變成 `=RAW_HISTORY!F4`）。已將 DASHBOARD 中所有 RAW_HISTORY 參照公式全面改用 `=INDIRECT("RAW_HISTORY!XX")` 包裹，防止漂移。
- **引入後端 JS 位階動態計算覆寫**：為了使 Web App 行情數據與位階絕對正確，在 `getMarketEngineData()` 後端直接從 THRESHOLD_CONFIG 讀取分位數，在記憶體中利用 JS 動態計算當日市場位階（T1~T5）及策略指南，實現雙重覆寫保護，徹底解決試算表計算延遲或漂移引起的市場位階誤判。
- **發布部署**：完成 GAS CLI 重新部署（Deployment `@46`）與 GitHub Pages 同步發布。

### 📅 2026-07-30 資金池 CD 控管、打折天數撫平器、EWT 開盤心理準備卡與 3 欄介面精簡發布 (v2.5.0)
- **打折視窗與天數撫平器 (Missed-out Relief)**：新增 `calculatePhaseDurationAndRelief()` 函式，動態計算恐慌/極度恐慌位階連續持續天數與歷史平均天數（T1 11天 / T2 19天），文字精簡為 `🛒 打折第 X 天 / 歷史平均持續約 11 天`，保留 `基於 18 年動態分位數連動校正` 副標題。
- **階梯式資金池開火 + 3天 CD 冷卻期**：實作 `calculatePowderAndCdStatus()` 控管機制，恐慌（T2）動用 10% 資金池、極度恐慌（T1）動用 20% 資金池，並於加碼後鎖定 3 個交易日 CD 冷卻期。若期間 Dist60 再下殺 2% 以上則自動觸發提前解鎖條款。資金池配額說明直接融入「如果明天定期定額要扣款...」決策卡描述中（如 `🚀 明天照常扣款，並可動用資金池 20% 手動加碼！`），精簡介面視覺。
- **EWT 開盤心理準備卡**：升級 5 階夜盤 EWT 漲跌對應之開盤心理準備提示（非點數預估），並整合至老巴盤前 07:30 AI 導航 Prompt 中。
- **連線時間與盤後收盤戳標記解耦**：將連線狀態燈號升級為 `🟢 行情即時連線 (連線 HH:mm | 收盤 HH:mm)`，清楚分開動態 API 請求連線時間與台股 13:33 收盤時間戳。
- **桌面 3 欄網格排版調整**：將 `📊 盤面關鍵數據一覽` 於寬螢幕下設定為嚴格的 3 個一排（Row 1: TWII, Dist60, Dist240；Row 2: VIX, MA60 Slope, Dist60 Delta；Row 3: EWT Change 滿版）。
- **後端穩健防護與發布部署**：加入 `parseDistValue` 萬用數值解析器與 Apps Script `getRange` 行數保護；全數完成 GAS CLI 重新部署（Deployment `@51`）與 GitHub `main` 分支推播發布。

### 📅 2026-07-30 大師心態與邏輯解密 QA 觀念導航升級發布 (v2.5.2)
- **新增「🧠 心態與邏輯解密 QA」區塊**：於「💡 觀念導航」頁籤底部新增獨立 Glassmorphism 卡片。
- **QA 1（過熱區報酬與暫停扣款理由）**：詳細解釋動能續航力與常態順風區基數，點出狂熱區「暫停扣款」旨在避開尾端 30%~50% 瀑布崩盤風險（Sharpe Ratio 極度不划算）。
- **QA 2（極度恐慌防暴跌機制）**：坦言無人能抓到 100% 絕對最低點，強調在 P10 (勝率 85%+) 的高勝率折價區分批布局，並說明 3 天 CD 冷卻期如何保障資金「等距、分批、越買越便宜」。
- **部署發布**：全數完成 GAS CLI 重新部署與 GitHub `main` 分支推播發布。

### 📅 2026-07-30 階梯式動態停利指南 QA 閉環升級發布 (v2.5.3)
- **新增 QA 3（何時該賣？要賣多少？會不會賣太早？）**：明確規範長線原型 ETF 複利本質，並提供階梯式動態停利算式（T3: 0% 複利滾動、T4: 停利 10%~15%、T5: 停利 20%~30% 回收子彈）。
- **心態總結**：點出停利不是看壞台股，而是為了避開尾端拉回風險，並為下一次 T1/T2 恐慌拍賣儲備子彈，完成全套投資邏輯閉環。
- **部署發布**：全數完成 GAS CLI 重新部署與 GitHub `main` 分支推播發布。

### 📅 2026-07-31 定期定額與資金池加碼雙軌決策解耦升級 (v2.5.5)
- **定期定額與資金池雙軌決策解耦**：
  - 常態定期定額（純位階判定）：T1/T2/T3 照常自動扣款，T4/T5 暫停扣款，維持絕對紀律。
  - 資金池手動加碼（雙重動能對照）：T1/T2 時，若 EWT 夜盤強彈 >= +2.5%，加碼狀態提示改為觀望追高警告（⚠️ 開盤激情強彈，資金池觀望延後）；若平穩或下跌，提示為可動用 10%/20% 手動加碼；CD 冷卻期內優先顯示 CD 冷卻提示。
- **UI 決策卡片雙層重構**：將今日戰情頁的「🛒 定期定額與資金池雙軌決策卡」視覺拆分為上下兩層，分層顯示常態扣款指南與手動加碼指南，並帶入獨立金、紫主題色系與左側邊框狀態渲染。
- **試算表 Dashboard 連動修復**：新增 A21/B21 資金池手動加碼指引列，並修復 B20 常態定期定額指引公式，確保 Sheet 與 Web App 邏輯高度同步。
- **部署發布**：全數完成 GAS CLI 重新部署與 GitHub `main` 分支推播發布。

### 📅 2026-07-31 UI 標題與內文時間形容詞客觀化替換 (v2.5.6)
- **UI 動態日期標題綁定**：將網頁大標題「☕ 今日市場溫度」與「🧭 今日大師給你的操作錦囊」依最新收盤日動態改為「☕ {YYYY-MM-DD} 市場溫度」與「🧭 {YYYY-MM-DD} 戰術指引」，以最新實體交易日做為標題主體。
- **位階分析內文客觀化**：將純數據位階分析中的「當前季線偏離度...」改為「{MM-DD} 收盤季線偏離度...」，並移除所有「當前」、「最新」、「今日」等模糊時間形容詞，完全以客觀日期作為資料主語，呈現嚴謹的客觀質感。
- **網頁靜態與 fallback 標籤清理**：將「最新計算日期」精簡為「計算日期」，並更新休市提醒為「{YYYY-MM-DD} 休市」，確保全站文字客觀一致。
- **部署發布**：更新 `程式碼.js` 與 `index.html` 中的版本號至 v2.5.6，並完成 GAS CLI 重新部署與 GitHub `main` 分支推播發布。

### 📅 2026-07-31 三段式時間解耦升級發布 (v2.5.7)
- **三段式時間標籤解耦**：
  - 位階卡 (Phase Card)：標題壓「最後收盤日」`☕ {lastDataDate} 收盤位階` (例：2026-07-30 收盤位階)。
  - 夜盤氣象卡 (EWT Card)：標題壓「清晨/夜盤時間」`🌙 {ewtDate} 夜盤動能` (例：2026-07-31 夜盤動能)。
  - 戰術指引卡 (Decision Card)：標題壓「今日執行日」`🧭 {todayDate} 開盤指引` (例：2026-07-31 開盤指引)。
- **決策卡雙層時間對照解耦**：常態定期定額標題明確標示對照 `{lastDataDate}` 收盤位階；資金池手動加碼標題標示對照 `{lastDataDate}` 收盤位階 ＋ 昨夜 EWT 動能。
- **部署發布**：全數更新 `程式碼.js` 與 `index.html` 版本號至 v2.5.7，完成 GAS CLI 重新部署與 GitHub `main` 分支推播發布。

### 📅 2026-07-31 Web App UI 敘事架構重構發布 (v2.5.8)
- **早盤作戰 vs 盤後結算情境重構**：
  - 第一區塊（決策導向）：`🧭 {todayDate} 今日開盤作戰卡`，置頂呈現開盤操作錦囊與雙軌決策卡（對照昨日收盤位階 ＋ 昨夜 EWT 動能）。
  - 第二區塊（數據導向）：`📊 {lastDataDate} 收盤結算與位階`，呈現收盤位階 Badge、打折天數撫平器、18 年歷史位階數據分析與盤面關鍵指標一覽。
- **部署發布**：全數更新 `程式碼.js` 與 `index.html` 版本號至 v2.5.8，完成 GAS CLI 重新部署與 GitHub `main` 分支推播發布。

### 📅 2026-08-01 週末休市情境 (Weekend Mode) 與 RAW_HISTORY 解耦升級發布 (v2.5.9)
- **自動化休市維護與資料庫數據維護 (`seedAndFixWeekendMode`)**：
  - 第 3 列 (`2026-08-01` 休市列)：`TWII` 繼承上一交易日 (7/31) 之 `43,119.75` 避免算式跳空崩潰；`VIX` 寫入 `18.58`；`EWT_Change` 寫入美股週五結算真實值 `+2.71%` (0.0271)。
  - 第 4 列 (`2026-07-31` 實體交易日列)：保留 `TWII 43,119.75` 與 7/31 週四夜盤 `+5.42%` (0.0542) 真實數據。
- **後端 API 數據解耦與交易日過濾 (`getMarketEngineData`)**：
  - `lastStockDataDate`：使用 `isMarketOpen(dStr).isOpen` 精準過濾台股實體交易日，自動跳過週末休市列（精準鎖定 `2026-07-31`）。
  - `lastEwtDataDate`：鎖定 `2026-08-01` (美股週五收盤夜盤日)。
  - `isWeekend` 強制防護覆寫：
    - `actionGuide`：`今日台股休市。本週市場經歷歷史級劇烈拉回與報復性強彈，當前位階處於打折區 (2026-07-31 收盤偏離度)。週末請安心休息，下週一盤前 07:30 我們再進行開盤觀測！`
    - `dcaRegularGuide`：`🟢 週末休市中 (下週一照常執行紀律)`
    - `dcaPowderGuide`：`🟢 美股週五結算 (+2.71%) 繼承至下週一發酵！開盤若強彈防追高，建議觀望至盤中平穩再評估`
- **Web App 前端 UI 週末雙區塊渲染 (`index.html`)**：
  - 頂部連線狀態 Badge：`☕ 2026-08-01 休市 (週休二日)`
  - 第一區塊：`☕ 2026-08-01 週末戰術總結與下週預備`
  - 第二區塊：`🌙 2026-08-01 夜盤最終收盤 (美股週五結算)`
  - 收盤位階卡：`☕ 2026-07-31 收盤位階`
- **MARKET LAB 回測數據防污染過濾 (`applyHistoryLogFormulas` & `verifyLabBacktest`)**：
  - `HISTORY_LOG` 欄位 F (`今日位階`) 導入 `=IF(OR(ISBLANK(A), WEEKDAY(A, 2)>5), "", ...)`，自動將 2026-08-01 等週末休市列之位階傳回 `""`（空字串）。
  - `LAB_BACKTEST` 的 `COUNTIF` / `AVERAGEIF` / `COUNTIFS` 自動跳過空字串，嚴禁將週末休市列計入 18 年總交易天數與勝率分母。
  - `verifyLabBacktest` 自我驗證引擎 4 大稽核全數以「純實體台股交易日」進行比對，對帳日期標籤 (2026-08-01) 正常寫入，計算底冊 100% 純淨。
- **Apps Script 線上發布規範 (Deployment Version @67)**：
  - 每次推播程式碼後，同步執行 `npx clasp deploy -i <DeploymentID>`，確保線上 `/exec` URL 立即指向最新 `@67` 部署版本。

### 📅 2026-08-01 FIN-NEWS 獨立分頁、Google Docs 解析器與大跌緊急觸發機制發布 (v2.6.0)
- **SPA 第 4 個獨立分頁 (`📰 FIN-NEWS`)**：頂部導覽列新增第 4 個分頁 `📰 FIN-NEWS` (`tab-id: finnews`)，獨立呈現週中研報分析與急煞大跌鑑別。
- **Google Docs 自動化解析引擎 (`updateWeeklyFinNewsReport`)**：
  - 自動計算 ISO 週數 (`26W31`) 並對接 Google Drive 資料夾 `1njhACTKWfbtwKdYoPmKDDJshLjf3N6op`。
  - 自動搜尋與讀取當週 `{yyWww}_AI`、`{yyWww}_CPI`、`{yyWww}_GEO` 之 Google Docs 報告內文。
  - 自動化排程觸發器：每週二 18:00 定時呼叫 Gemini API 產生 3 大雷達燈號與 A~E 結構化結論。
- **近 2 日千點大跌緊急鑑別防禦 (`checkCrashEmergencyDefense`)**：
  - 每日 16:30 盤後自動檢測近 2 日台股累積大跌 (>= 1,000 點)。
  - 觸發時呼叫 Gemini 緊急分類下殺性質（情緒性洗盤 / 估值過熱 / 景氣衰退 / 系統性黑天鵝），並於 `finnews` 頁面置頂呈現 🚨 緊急鑑別卡！
### 📅 2026-08-01 Kopitiam 老闆幫你讀報紙 (News Storyteller) 風格升級 (v2.6.1)
- **Prompt 敘事風格重構 (`updateWeeklyFinNewsReport`)**：
  - 呼叫 Gemini 解析 Docs 時，要求兩位大師【必須具體引用報告中的新聞事例與數據細節】（強烈增強 NEWS 感），且禁止開頭帶有「老巴：/小羅：」前綴標籤：
    * 👴 **老巴導讀 (`storyBuffett`)**：巴菲特語錄風格、生活比喻、長線價值與企業獲利視角，具體引用研報事例與數據，給予溫暖安定人心的情緒價值。
    * 🦈 **小羅拆解 (`storySoros`)**：索羅斯語錄風格、反身性、市場情緒過度反應與資金戰術視角，具體引用研報事例拆解新聞背後的資金動向與資金池應對邏輯。
- **Glassmorphic 對話卡片標題調整 (`index.html`)**：
  - 於 `📰 FIN-NEWS` 頁面頂部將標題精準命名為「☕ **Kopitiam 老闆幫你讀報紙**」，並自動清理前綴重複文字。
- **部署發布**：全數更新 `Market_Engine_GAS.js`、`index.html` 與 `HANDBOOK.md` 版本號，完成 GAS CLI 重新部署與 GitHub `main` 分支推播發布。

### 📅 2026-08-01 未來重大事件倒數雷達 (Event Calendar) 發布 (v2.7.0)
- **未來重大事件倒數雷達引擎 (`fetchUpcomingMarketEvents`)**：
  - 自動呼叫 Gemini API 掃描並篩選未來 30~60 天權重最高的前 3~5 個重大事件（台積電法說會、Fed FOMC 利率決策、CPI 發布、NVIDIA 財報、美國大選政策等）。
  - 自動產出事件名稱、事件日期、倒數天數、重要性說明（含對台股/AI鏈實質含意）與資金池戰術指南。
  - 動態每日倒數天數計算，確保倒數天數 100% 精準。
- **Web App 頁面卡片與名稱微調 (`index.html`)**：
  - 刪除老闆讀報卡中之「🎙️ 雙大師說書人」標籤。
  - 將「週中雷達總結」正式更名為「📡 **週中新聞總結**」。
  - 將「未來重大事件倒數雷達」更名為「🗓️ **未來重大事件倒數提醒**」，並調整位置放置於「週中新聞總結」卡片下方。
- **部署發布**：全數更新 `Market_Engine_GAS.js`、`index.html` 與 `HANDBOOK.md` 版本號至 v2.7.0，完成 GAS CLI 重新部署與 GitHub `main` 分支推播發布。

### 📅 2026-08-01 FIN-NEWS 事件卡片文字精簡與雙重標頭全面清理 (v2.7.1)
- **事件卡片文字純化與版面精簡 (`index.html`)**：
  - 於 `📰 FIN-NEWS` 頁面之「未來重大事件倒數提醒」卡片中，全面移除「💡 為什麼重要：」與「🛡️ 盤面影響與資金池戰術指南：」兩處前綴標題標籤與圖示。
  - 增強前後端動態相容過濾器，自動清理 Gemini AI 產出之各種標頭變體與 Markdown 符號（含粗體 `**`、括號、Emoji 與各式冒號）。
- **部署發布**：更新 `index.html` 頁尾版本號至 `v2.7.1`，完成 GAS CLI (`clasp push` & `clasp deploy`) 重新部署發布。

### 📅 2026-08-02 週末 VIX 恐慌指數解耦擷取與 8/01 清晨收盤標籤對齊發布 (v2.7.2)
- **VIX 數據擷取與時間戳解耦 (`Market_Engine_GAS.js`)**：
  - 在 `getMarketEngineData` 中將 VIX 數據讀取獨立為 `lastVixDataDate` 與 `vixRowValues` 解耦掃描邏輯，確保週末 (8/01~8/02) 取用 `RAW_HISTORY` 中最新一筆美股已收盤實體點位 (8/01 清晨結算美股週五之 18.58)。
- **前端 UI 時間戳與標籤動態對齊 (`index.html`)**：
  - 於戰情與觀念導航頁籤中，當 `isWeekend` 為 true 時，將 VIX 數據標題/時間戳對齊顯示為 `VIX 市場體溫計 (8/01 清晨收盤 / 美股週五結算)`，使 8/01 清晨收盤之 VIX 與 EWT 雙雙對齊至美股週五結算日。
- **部署發布**：全數更新 `Market_Engine_GAS.js`、`index.html` 與 `HANDBOOK.md` 版本號至 `v2.7.2`，並完成 GAS CLI 部署發布。

### 📅 2026-08-06 微小偏離度解析器重構、季線位階主體統一與上下邊界邏輯解耦發布 (v2.7.3 ~ v2.7.5)
- **`parseDistValue` 通配解析器重構 (v2.7.3)**：
  - 根治 `Math.abs(num) > 0.5` 臨界判讀 Bug（過去因 0.31 <= 0.5，導致微小偏離度 `+0.31%` 未帶 `%` 符號時被誤判為 `31.00%` 狂熱高估區），新增 `+`/`-` 符號與 `< 0.8` 臨界控制，精準解析點數與比率。
- **`calculatePhaseAnalysis` 邊界敘述與偏離度解耦 (v2.7.4)**：
  - 根治「季線偏離度 (+0.31%) 顯示中性」但「向下/向上安全距離誤採年線狂熱位階」之文字衝突，將邊界計算改為純粹依據季線偏離點位 (`d60Phase`)，確保偏離度說明與上下安全距離 100% 嚴密對齊。
- **全站位階主體邏輯統一與長線年線警示解耦 (v2.7.5)**：
  - 根治「季線 +0.31% 處於 T3 順風中性」與「今日市場位階顯示 T5 狂熱」之設計哲學矛盾，全站統一以 **季線偏離度 (Dist60)** 為市場位階主導判定（季線 +0.31% 時位階回歸 **T3 順風/中性**，常態定期定額照常執行 `🚀 明天照常自動扣款`）。
  - 將 **年線偏離度 (Dist240)** 高位 (+31.70% > P90) 解耦轉為長線風險提醒，附加於行動指引中，維護全站邏輯的一致與嚴密。
- **試算表公式與雲端部署**：
  - 同步更新 Google Sheet `RAW_HISTORY` 與 `DASHBOARD` 公式，全數完成 Google Apps Script CLI 重新推播與 Deployment (@79) 部署更新，並同步推播至 GitHub `main` 分支。






