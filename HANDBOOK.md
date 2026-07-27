# HANDBOOK.md (v1.7.1)

## ① Project Vision
建立整合型 Market Engine V3，將「市場觀察 Web App」與「MARKET LAB 研發實驗室」合併為單一 Google Sheet & GAS 專案。透過客觀的歷史數據分位數校正與 18 年回測，建立統一、無歧義的市場位階決策體系（Single Source of Truth）。

## ② System Architecture
- **Data Layer**: Google Sheet 6 大結構化分頁 (`RAW_HISTORY`, `THRESHOLD_CONFIG`, `LAB_BACKTEST`, `DASHBOARD`, `HISTORY_LOG`, `DECISION_LOG`)
- **Engine Layer**: Google Apps Script (GAS) 核心算式與自動化維護腳本 ([程式碼.js](file:///f:/Projects/Market_Engine/%E7%A8%8B%E5%BC%8F%E7%A2%BC.js))
- **Presentation Layer**: GitHub Pages 靜態網頁 / GAS Web App ([index.html](file:///f:/Projects/Market_Engine/index.html)) / Google Sheet Dashboard

## ③ Database Schema
1. `RAW_HISTORY`: Date, TWII (收盤), VIX, MA60, MA240, Dist60 (季線乖離), Dist240 (年線乖離), MA60_Slope (季線5日斜率), Dist60_Delta (5日動能), EWT_Change (夜盤漲跌%)
2. `THRESHOLD_CONFIG`: 位階代號, 位階名稱, Dist60下限, Dist60上限, Dist240下限, Dist240上限, 策略建議與行動指引 (Single Source of Truth，含 P10, P25, P75, P90 分位數連動校正)
3. `LAB_BACKTEST`: 位階名稱, 歷史天數 (Count), 天數佔比 (%), 1年期平均報酬率 (%), 1年期正報酬勝率 (%), 驗證說明與結論
4. `DASHBOARD`: 市場最新數據 (Date, TWII, Dist60, Dist240, VIX, MA60_Slope, Dist60_Delta, EWT_Change), 今日市場位階, 趨勢動能燈號, 核心策略行動指引, 定期定額扣款決策卡, AI 顧問單一值班卡片 (07:30 老巴 / 14:30 小羅輪播)
5. `HISTORY_LOG`: Date, TWII, Dist60, Dist240, VIX, 今日位階, MA60_Slope, Dist60_Delta, 1年期前瞻報酬率, AI_Morning_Story, AI_Afternoon_Story
6. `DECISION_LOG`: 日期 (Date), 當時市場位階/訊號, 策略動作, 執行說明, 策略符合度, 策略思考與檢討備註

## ④ Function Library
- `onOpen()`: 於 Google Sheet 註冊自訂 UI 選單 `🚀 Market Engine V3` (含即時行情 API 測試、老巴盤前/小羅盤後 AI 導航與休市日測試)
- `fetchRealMarketData()`: 即時金融行情對接器 (從官方/國際金融 API 讀取真實 TWII, VIX, EWT 行情)
- `fetchRealHistoricalMarketSeries()`: 全歷史 18 年交易日真實收盤價 API 抓取器 (連線證交所/Yahoo Finance `^TWII` `range=max`)
- `testRealMarketApiFetch()`: 即時行情 API 連線測試診斷彈窗
- `isMarketOpen()`: 休市日 Helper 函式 (過濾週六/週日及 Google Calendar 國定假日)
- `getSpreadsheet()`: 取得或開啟當前試算表實例防呆機制
- `setupMarketEngineV3()`: 高效能主初始化建置函式
- `applyRawHistoryFormulas()`: 批次寫入均線 (`AVERAGE`) 與乖離率四項計算公式
- `seedInitialData()`: 寫入初始化標準數據種子
- `seedFullHistoricalData()`: 載入 2008~2026 18年完整歷史數據並連動刷新 `LAB_BACKTEST`
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
- 休市防護機制：盤後自動腳本遇休市日自動跳過 `HISTORY_LOG` append，防止無效數據列。
- 嚴格數據真實性：杜絕 `Math.random()` 隨機擬真，全面連動實體金融 API。

## ⑨ Current Sprint
v1.7.1 全歷史數據精準度檢討與狀態紀錄完成，系統維持正常運作。

## ⑩ Current Version
v1.7.1 (全歷史數據精準度檢討與狀態紀錄版)

## ⑪ Roadmap
- Milestone 1: 試算表基礎架構與 API 行情鏈結連動。
- **目前停止位置**: v1.7.1 全歷史數據精準度檢討與狀態紀錄完成，系統維持正常運作。
- **下一步施工位置**: 等待與團隊/專家討論歷史數據導入與驗證最佳架構。

---
## ⑫ 開發日誌 (Development Log)

### 📅 2026-07-26 全站架構升級、休市連動、品牌人設與護眼體驗完整發布 (v1.1.0 ~ v1.6.1)
- **核心架構與 AI 導航升級 (v1.1.0 ~ v1.4.2)**：
  - 新增「若明天要執行定期定額扣款」DCA 決策卡 (`B20`) 與動態買進/觀望邏輯。
  - 安裝每日 07:30 (老巴盤前) 與 14:30 (小羅盤後) 雙時段自動觸發器 (`createDailyTrigger`)。
  - 升級 `generateMorningNavigation()` 與 `generateAfternoonNavigation()`, 100% 對齊 V3 Database Schema，從 RAW_HISTORY 實體列取數，連動 Single Source of Truth 位階並雙向備份至 HISTORY_LOG (`J3` / `K3`)。
- **休市日判定與情緒連動 (v1.5.0 ~ v1.5.1)**：
  - 實作 `isMarketOpen(targetDate)` Helper 函式，採用台北時區原生 JavaScript `getDay()` 精準過濾週六/週日及 Google Calendar 台灣國定假日。
- **品牌人設、護眼體驗與招財 3D Icon (v1.6.0 ~ v1.6.1)**：
  - 品牌升級為 `巴菲特‧索羅斯 AI 戰情室 (Buffett & Soros AI Team)`。
  - 打造 Warm Amber Gold 溫柔暗色調視覺，並生成 3D 招財金牛與牛市上升 K 線圖示 (`favicon.png` / `icon.png`)。

### 📅 2026-07-27 系統維護、勝率修復與實體 API 對接 (v1.6.2 ~ v1.7.1)
- **運算邏輯與 API 部署 (v1.6.2 ~ v1.6.5)**：
  - 重構盤前盤後更新邏輯與 Trigger 清理安裝機制，修復 Web App CORS 跨域存取。
  - 升級 Gemini API 模型端點至穩定版別名 `gemini-flash-latest`。
- **MARKET LAB 勝率統計修復 (v1.6.7)**：
  - 修復 `LAB_BACKTEST` 1 年期勝率算式分母篩選條件（由 `"<>"` 修正為 `">= -1"`），排除未滿 1 年空字串虛胖問題。
- **實體金融行情 API 鏈結 (v1.7.0 ~ v1.7.1)**：
  - 全面刪除 `Math.random()` 擬真亂數。
  - 實作 `fetchRealMarketData()` 與 `fetchRealHistoricalMarketSeries()`, 對接證交所與 Yahoo Finance API。
  - 均線 (MA60/MA240) 改由試算表公式 `=AVERAGE(B3:B62)` / `=AVERAGE(B3:B242)` 自動計算。
  - 根目錄新增 `.nojekyll` 解決 GitHub Pages 構建警報。

---
## ⑬ 待修與狀況紀錄 (Pending & Status Log)

### 📅 2026-07-27 全歷史 18 年交易日數據精準度檢討與待解決紀錄 (v1.7.1 暫停觀察狀態)
- **現狀問題紀錄 (Issue Note)**：
  - 用戶抽查 `RAW_HISTORY` 中的歷史收盤價，發現部分歷史交易日數值仍有偏差（例如 `2026-05-13` 實體收盤為 `41,374.50`，表內顯示 `44,316.74`；`2026-05-12` 實體收盤為 `41,898.32`；`2026-07-20` 實體收盤為 `42,449.70`）。
  - 用戶指示暫停修改，將此現狀完整記錄於 HANDBOOK 中，留待後續與團隊/專家共同研討最佳歷史數據導入與驗證方式（如原生 `GOOGLEFINANCE` 批量載入或官方歷史 CSV/DB 匯入）。
- **當前停止位置 (Current Checkpoint)**：v1.7.1 全歷史數據精準度檢討與狀態紀錄完成，系統維持正常運作。
