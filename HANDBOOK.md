# HANDBOOK.md (v1.8.0)

## ① Project Vision
建立整合型 Market Engine V3，將「市場觀察 Web App」與「MARKET LAB 研發實驗室」合併為單一 Google Sheet & GAS 專案。透過客觀的歷史數據分位數校正與 18 年回測，建立統一、無歧義的市場位階決策體系（Single Source of Truth）。

## ② System Architecture
- **Data Layer**: Google Sheet 6 大結構化分頁 (`RAW_HISTORY`, `THRESHOLD_CONFIG`, `LAB_BACKTEST`, `DASHBOARD`, `HISTORY_LOG`, `DECISION_LOG`)
- **Engine Layer**: Google Apps Script (GAS) 核心算式與自動化維護腳本 ([程式碼.js](file:///f:/Projects/Market_Engine/%E7%A8%8B%E5%BC%8F%E7%A2%BC.js))
- **Presentation Layer**: GitHub Pages 靜態網頁 / GAS Web App ([index.html](file:///f:/Projects/Market_Engine/index.html)) / Google Sheet Dashboard

## ③ Database Schema
1. `RAW_HISTORY`: Date, TWII (GOOGLEFINANCE 原生收盤), VIX, MA60, MA240, Dist60 (季線乖離), Dist240 (年線乖離), MA60_Slope (季線5日斜率), Dist60_Delta (5日動能), EWT_Change (夜盤漲跌%)
2. `THRESHOLD_CONFIG`: 位階代號, 位階名稱, Dist60下限, Dist60上限, Dist240下限, Dist240上限, 策略建議與行動指引 (Single Source of Truth，含 P10, P25, P75, P90 分位數連動校正)
3. `LAB_BACKTEST`: 位階名稱, 歷史天數 (Count), 天數佔比 (%), 1年期平均報酬率 (%), 1年期正報酬勝率 (%), 驗證說明與結論
4. `DASHBOARD`: 市場最新數據, 今日市場位階, 趨勢動能燈號, 核心策略行動指引, 定期定額扣款決策卡, AI 顧問單一值班卡片 (07:30 老巴 / 14:30 小羅輪播)
5. `HISTORY_LOG`: Date, TWII, Dist60, Dist240, VIX, 今日位階, MA60_Slope, Dist60_Delta, 1年期前瞻報酬率, AI_Morning_Story, AI_Afternoon_Story
6. `DECISION_LOG`: 日期 (Date), 當時市場位階/訊號, 策略動作, 執行說明, 策略符合度, 策略思考與檢討備註

## ④ Function Library
- `onOpen()`: 於 Google Sheet 註冊自訂 UI 選單 `🚀 Market Engine V3`
- `applyRawHistoryFormulas()`: 全自動寫入原生 `GOOGLEFINANCE("TPE:TAIEX", "close", A3)` 與 `AVERAGE` 均線雙重保險算式
- `fetchRealMarketData()`: 即時金融行情對接器 (官方 API 讀取真實 TWII, VIX, EWT 行情)
- `fetchRealHistoricalMarketSeries()`: 全歷史 18 年交易日真實收盤價 API 抓取器
- `setupMarketEngineV3()`: 高效能主初始化建置函式
- `seedInitialData()` / `seedFullHistoricalData()`: 清空數據並寫入全歷史真實盤後點位與原生公式
- `buildLabBacktestSheet()`: 建立 1 年期前瞻報酬率與勝率統計回測表 (修復 `>= -1` 勝率分母算式)
- `buildDashboardSheet()`: 建立日常觀察卡片、今日位階判定與 AI 顧問值班卡片
- `generateMorningNavigation()` / `generateAfternoonNavigation()`: 老巴與小羅 AI 導航生成腳本
- `updateMorningMarketEngine()` / `updateAfternoonMarketEngine()`: 每日盤前與盤後自動更新腳本 (對接實體 API，免隨機亂數)
- `createDailyTrigger()`: 建立每日 07:30 與 14:30 雙時段時間驅動觸發器
- `doGet()`: Web App / API 入口
- `getMarketEngineData()`: 精準讀取 `RAW_HISTORY` Row 3 API

## ⑤ Decision Engine
- **單一位階判定邏輯**：依據 `RAW_HISTORY` 最新之 `Dist60` 與 `Dist240`，對照 `THRESHOLD_CONFIG` 門檻得出五大位階 (`極度恐慌`, `恐慌`, `順風/中性`, `過熱`, `狂熱`)。
- **動態分位數門檻校正**：門檻由 2008~2026 18年歷史真實分位數 (`P10`, `P25`, `P75`, `P90`) 自動計算產生。
- **行動指引與 DCA 扣款決策卡**：
  - 恐慌 / 極度恐慌 -> 🚀 `明天照常扣款，並且可以加碼多買一點！`
  - 順風 / 中性 -> 🟢 `明天照常扣款，維持原本扣款金額即可！`
  - 過熱 / 狂熱 -> ⚠️ `明天建議暫停扣款，把錢存起來等打折！`

## ⑥ AI Agents
- **巴菲特‧索羅斯 AI 戰情室 (Buffett & Soros AI Team)**
  - 老巴盤前 AI 導航 (`generateMorningNavigation`): 07:30 值班 (老巴早餐)
  - 小羅盤後 AI 導航 (`generateAfternoonNavigation`): 14:30 值班 (小羅午茶)
  - 專用模型: `gemini-flash-latest`

## ⑦ Dashboard / UI (v1.6.1 招財 3D 牛市圖示版)
- Google Sheet `DASHBOARD` 視覺化對照卡片
- Google Sheet 自訂選單 `🚀 Market Engine V3`
- **招財 App 圖示與 Favicon**: 3D 招財金牛與牛市上升 K 線強效 Icon (`favicon.png` / `icon.png`)
- **GitHub Pages 靜態網頁**: `https://voyagermartin.github.io/Market_Engine/`
- **GAS Web App**: `https://script.google.com/macros/s/AKfycbyXxiVbJqRjTDfFkU2XTtScTVdLGqIafbDaqfSJeG-JQs0sJZ-A0wlQtPN52xHQqmHJqA/exec`

## ⑧ Coding Rules
- 遵守 Universal Handbook Prompt v2.0 所有規則。
- 零容忍假數據：徹底清除所有非真實之種子/推算數據，直接寫入 Google Sheets 原生 `=GOOGLEFINANCE("TPE:TAIEX", "close", date)` 官方公式。

## ⑨ Current Sprint
v1.8.0 真實歷史數據校正完工版，100% 連動 GOOGLEFINANCE 原生官方盤後價與純量化門檻回測。

## ⑩ Current Version
v1.8.0 (真實歷史數據校正完工版)

## ⑪ Roadmap
- Milestone 1: 試算表基礎架構與原生 GOOGLEFINANCE 行情鏈結完工。
- **目前停止位置**: v1.8.0 真實歷史數據校正完工版，100% 對齊官方真實盤後價與量化回測！
- **下一步施工位置**: 系統維護完成，等待日常盤前/盤後維護。

---
## ⑫ 開發日誌 (Development Log)

### 📅 2026-07-26 全站架構升級、休市連動、品牌人設與護眼體驗完整發布 (v1.1.0 ~ v1.6.1)
- 核心架構與 AI 導航升級，完成雙時段自動觸發與品牌護眼視覺體驗發布。

### 📅 2026-07-27 系統維護、勝率修復與實體 API 對接 (v1.6.2 ~ v1.7.1)
- 修復 MARKET LAB 勝率統計算式 (`>= -1` 排除空字串虛胖)，並導入實體 API行情鏈結。

### 📅 2026-07-27 重建 RAW_HISTORY 100% 真實官方歷史股價 (v1.8.0)
- **數據清洗與原生連線 (Data Purge & Re-fetch)**：
  - 於 `RAW_HISTORY` 第 B 欄自動寫入 Google Sheets 原生官方連線公式 `=IFERROR(INDEX(GOOGLEFINANCE("TPE:TAIEX", "close", A3), 2, 2), "")`。
  - 徹底排除任何第三方轉換或時區落差偏離問題，使 `2026-05-13` 正確對齊 `41,374.50`、`2026-05-12` 正確對齊 `41,898.32`、`2026-07-20` 正確對齊 `42,449.70`，與證交所真盤 100% 完全吻合。
- **重算指標與門檻 (Recalculate Single Source of Truth)**：
  - 依據 100% 真實收盤價重算 MA60, MA240, Dist60 與 Dist240。
  - 重新計算 `THRESHOLD_CONFIG` 之 P10, P25, P75, P90 真實歷史分位數門檻。
- **重刷回測與歷史 Log (Re-run LAB Backtest & History Log)**：
  - 根據校正後真實門檻重跑 `LAB_BACKTEST` 5 大位階天數分佈、1 年期前瞻報酬率與勝率，刷新 `HISTORY_LOG`。
- **發布與驗收**：全數完成 `clasp push -f` 部署與 `git commit / push`。
