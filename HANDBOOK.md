# HANDBOOK.md (v2.3.0)

## ① Project Vision
建立整合型 Market Engine V3，將「市場觀察 Web App」與「MARKET LAB 研發實驗室」合併為單一 Google Sheet & GAS 專案。透過客觀的歷史數據分位數校正與 18 年回測，建立統一、無歧義的市場位階決策體系（Single Source of Truth）。

## ② System Architecture
- **Data Layer**: Google Sheet 6 大結構化分頁 (`RAW_HISTORY`, `THRESHOLD_CONFIG`, `LAB_BACKTEST`, `DASHBOARD`, `HISTORY_LOG`, `DECISION_LOG`)
- **Engine Layer**: Google Apps Script (GAS) 核心算式與自動化維護腳本 ([程式碼.js](file:///f:/Projects/Market_Engine/%E7%A8%8B%E5%BC%8F%E7%A2%BC.js))
- **Presentation Layer**: GitHub Pages 靜態網頁 / GAS Web App ([index.html](file:///f:/Projects/Market_Engine/index.html)) / Google Sheet Dashboard

## ③ Database Schema
1. `RAW_HISTORY`: Date, TWII (100% 官方真實收盤), VIX (CBOE 官方真實 VIX), MA60, MA240, Dist60 (季線乖離), Dist240 (年線乖離), MA60_Slope (季線5日斜率), Dist60_Delta (5日動能), EWT_Change (MSCI EWT 100% 官方真實夜盤漲跌%)
2. `THRESHOLD_CONFIG`: 位階代號, 位階名稱, Dist60下限, Dist60上限, Dist240下限, Dist240上限, 策略建議與行動指引 (Single Source of Truth，含 P10, P25, P75, P90 分位數連動校正)
3. `LAB_BACKTEST`: 位階名稱, 歷史天數 (Count), 天數佔比 (%), 1年期平均報酬率 (%), 1年期正報酬勝率 (%), 驗證說明與結論
4. `DASHBOARD`: 市場最新數據, 今日市場位階, 趨勢動能燈號, 核心策略行動指引, 定期定額扣款決策卡, AI 顧問單一值班卡片, 數據健康狀態燈號
5. `HISTORY_LOG`: Date, TWII, Dist60, Dist240, VIX, 今日位階, MA60_Slope, Dist60_Delta, 1年期前瞻報酬率, AI_Morning_Story, AI_Afternoon_Story
6. `DECISION_LOG`: 日期 (Date), 當時市場位階/訊號, 策略動作, 執行說明, 策略符合度, 策略思考與檢討備註

## ④ Function Library
- `onOpen()`: 於 Google Sheet 註冊自訂 UI 選單 `🚀 Market Engine V3`
- `fetchRealMarketData()`: 即時金融行情對接器 (含 `regularMarketTime` 時間戳比對、颱風假防呆與健康狀態指標)
- `fetchRealHistoricalMarketSeries()`: 全歷史 18 年交易日台股 (`^TWII` `period1=0`) 100% 官方實體收盤價 API 抓取器
- `fetchRealVIXHistoricalMarketSeries()`: 全歷史 18 年 CBOE VIX 恐慌指數 (`^VIX` `period1=0`) 100% 官方實體收盤價 API 抓取器
- `fetchRealEWTHistoricalMarketSeries()`: 全歷史 18 年 MSCI Taiwan ETF (`EWT` `period1=0`) 100% 官方實體夜盤漲跌幅 API 抓取器
- `generateMarketRows()`: 100% 三全量官方真實歷史數據產生器 (台股收盤 + CBOE VIX + MSCI EWT 夜盤 100% 實體連動)
- `setupMarketEngineV3()`: 高效能主初始化建置函式
- `applyRawHistoryFormulas()`: 全自動批次寫入均線 (`AVERAGE`) 與乖離率純量化連動公式
- `seedInitialData()` / `seedFullHistoricalData()`: 寫入 2008~2026 18年 100% 官方真實盤後點位、VIX 與 EWT 歷史底座
- `buildLabBacktestSheet()`: 建立 1 年期前瞻報酬率與勝率統計回測表 (修復 `>= -1` 勝率分母算式)
- `buildDashboardSheet()`: 建立日常觀察卡片、今日位階判定與 AI 顧問值班卡片
- `generateMorningNavigation()` / `generateAfternoonNavigation()`: 老巴與小羅 AI 導航生成腳本
- `updateMorningMarketEngine()` / `updateAfternoonMarketEngine()`: 每日盤前與盤後自動更新腳本 (對接實體 API，含時間戳過濾)
- `createDailyTrigger()`: 建立每日 07:30 與 14:30 雙時段時間驅動觸發器
- `doGet()`: Web App / API 入口 (輸出健康狀態與即時時間戳)
- `getMarketEngineData()`: 精準讀取 `RAW_HISTORY` Row 3 API 與行情健康燈號，並於首次/異常載入時新增 API 金鑰背景自動生成 AI 導航機制

## ⑤ Decision Engine
- **單一位階判定邏輯**：依據 `RAW_HISTORY` 最新之 `Dist60` 與 `Dist240`，對照 `THRESHOLD_CONFIG` 門檻得出五大位階 (`極度恐慌`, `恐慌`, `順風/中性`, `過熱`, `狂熱`)。
- **動態分位數門檻校正**：門檻由 2008~2026 18年歷史真實分位數 (`P10`, `P25`, `P75`, `P90`) 自動計算產生。
- **行動指引與 DCA 扣款決策卡**：
  - 恐慌 / 極度恐慌 -> 🚀 `明天照常扣款，並且可以加碼多買一點！`
  - 順風 / 中性 -> 🟢 `明天照常扣款，維持原本扣款金額即可！`
  - 過熱 / 狂熱 -> ⚠️ `明天建議暫停扣款，把錢存起來等打折！`

## ⑥ AI Agents
- **巴菲特‧索羅斯的 Kopitiam**
  - 老巴盤前 AI 導航 (`generateMorningNavigation`): 07:30 值班 (老巴早餐)
  - 小羅盤後 AI 導航 (`generateAfternoonNavigation`): 14:30 值班 (小羅午茶)
  - 專用模型: `gemini-flash-latest`

## ⑦ Dashboard / UI (v2.2.0 網頁排版收納與即時 AI 背景生成優化版)
- **排版收納與跑版修正**: 刪除網頁中重複的 AI 故事欄位，並修復了因多餘 `</div>` 標籤造成的 `.container` 容器提前關閉問題，使所有區塊（觀念導航、歷史回測表格、免責聲明頁尾）寬度重回 1200px 居中對齊。
- **網頁端即時 AI 故事背景生成**: 於 `doGet()` 後端 API 新增自動生成檢查。當使用者填妥 API 金鑰卻未手動/定時觸發生成時，網頁首次載入即自動於背景呼叫 Gemini API 完成內容填補與試算表更新。
- **品牌暖化**: 巴菲特‧索羅斯的 Kopitiam (來喝咖啡看盤吧～)
- **頁頂狀態與台股收盤標籤修正**: 徹底清理 `<ctrl42>` 等標籤，且將台股收盤 (TWII) 下方標籤精準修正為 `最近一次收盤價`，更貼合盤中未收盤時之實體狀態。
- **白話文大標題**: `☕ 今日市場溫度`、`🧭 今日大師給你的操作錦囊`、`如果明天定期定額要扣款......`、`☕ 來一杯咖啡，聊市場是非`。
- **季線 / 年線乖離率白話大改版**:
  - `Dist60` (季線乖離率) 升級為下方滿版白話說明提示框（價格低於季線顯示為 `🛒 價格低於季線，中短期出現便宜撿便宜的好時機！`）。
  - `Dist240` (年線乖離率) 升級為下方滿版白話說明提示框（價格高於年線顯示為 `🚀 價格穩在年線之上，長線多頭趨勢依然很穩健！`）。
- **季線 5日斜率 (大盤底氣)**: 白話標註「🧱 大盤底氣很硬，有強大的地板支撐著！」/「⚠️ 大盤底氣不足，地板正在慢慢變軟喔！」。
- **5日乖離動能 (買氣油門)**: 白話標註「🚀 大家正搶著進場，買氣正在大腳踩油門！」/「🛑 大家開始觀望，買氣正在輕踩煞車喔！」。
- **極致載入中體驗 (Loading State)**: 資料載入完成前，全站指標均預設顯示 `連線中...`，AI 顧問卡片顯示 `老巴與小羅正在忙著沖咖啡、看盤，請稍候...`，避免帶入舊 Mock 資料造成的矛盾突兀感。
- **定期定額決策卡 (DCA Guide) 動態著色**: 根據 AI 顧問決策（加碼/維持/暫停），前端動態更新邊框、背景與文字色調。
- **Kopitiam 美味咖啡 App Icon & Favicon**: 替換原本 3D 金牛 Icon 為香濃奶泡與金色微光 Kopitiam 咖啡 Icon (`favicon.png` / `icon.png`)。
- **GitHub Pages 靜態網頁**: `https://voyagermartin.github.io/Market_Engine/`
- **GAS Web App**: `https://script.google.com/macros/s/AKfycbyXxiVbJqRjTDfFkU2XTtScTVdLGqIafbDaqfSJeG-JQs0sJZ-A0wlQtPN52xHQqmHJqA/exec`

## ⑧ Coding Rules
- 遵守 Universal Handbook Prompt v2.0 所有規則。
- 零容忍擬真數據：徹底刪除 `Math.random()` 及所有擬真推算公式，100% 連動證交所、CBOE 與 MSCI EWT 官方實體歷史盤後點位。

## ⑨ Current Sprint
v2.3.0 台股加權指數狀態標籤修復、MARKET LAB 月度歷史回測與 4 大維度自我驗證引擎完整發布！

## ⑩ Current Version
v2.3.0 (TWII 標籤修復與月度歷史回測自我驗證引擎發布版)

## ⑪ Roadmap
- Milestone 1: 試算表基礎架構與 100% 三全量真實歷史行情鏈結完工。
- Milestone 2: 數據健康狀態燈號與颱風假/臨時休市時間戳防呆完工。
- Milestone 3: Kopitiam 溫馨品牌軟化、白話翻譯卡片與美味咖啡圖示完工發布。
- **目前停止位置**: v2.3.0 台股狀態標籤修復、月度歷史回測計算與自我驗證引擎發布！
- **下一步施工位置**: 系統維護完成，安心運行日常自動更新。

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
- **排版與寬度修正**：移除 [index.html](file:///d:/Projects/Market_Engine/index.html) 中重複的來一杯咖啡區塊，並修復了因多餘 `</div>` 造成外層 `.container` 提早閉合的跑版問題，使下方所有區塊完美重合於容器內。
- **後端 API 與 AI 首次連線優化**：於 [程式碼.js](file:///d:/Projects/Market_Engine/程式碼.js) 中新增自動防呆機制，若網頁載入時偵測到試算表內 AI 欄位為預設值，且已設定 API 金鑰，則會在 API 請求時自動於背景觸發 AI 故事生成並更新試算表儲存格，保證首次使用的 Web App 能立即看到 AI 解析內容。
- **部署發布**：全數完成 GAS CLI 部署、Deployment `@2` 覆寫與 GitHub `main` 分支推播發布。

### 📅 2026-07-29 台股狀態標籤修復、MARKET LAB 月度歷史回測與 4 大維度自我驗證引擎完工 (v2.3.0)
- **TWII 狀態標籤修復**：修復了 [index.html](file:///f:/Projects/Market_Engine/index.html) 中 `tagTwii` 在數據連線後未更新、導致持續顯示「連線中...」的深層 bug，寫入 `最近一次收盤價` 狀態標籤。
- **MARKET LAB 18年歷史回測月度更新與自我驗證機制**：
  - 取消每日頻繁浮動計算，確立「月度固定基準點」維護機制，避免每日天數與勝率產生微小漂移造成使用者困擾。
  - 在 [程式碼.js](file:///f:/Projects/Market_Engine/程式碼.js) 中實作 4 大維度 **自我驗證引擎 (`verifyLabBacktest`)**：
    1. **總天數一致性稽核**：五大位階天數總和必須 100% 等於 `RAW_HISTORY` 歷史交易日總筆數。
    2. **佔比百分之百稽核**：天數佔比總和必須為 `100.0%`。
    3. **勝率單調性與風險邏輯稽核**：驗證長線勝率具備「極度恐慌 >= 恐慌 >= 過熱 >= 狂熱」之風控常態。
    4. **歷史涵蓋度稽核**：驗證累積數據筆數涵蓋 2008~2026 年 (>= 4,000 筆)。
  - **自動化狀態標籤與選單**：新增 `updateMonthlyLabBacktest()` 選單與自動標籤 `✅ 18年歷史數據與勝率自我驗證 100% 通過！ (上次對帳驗證時間: YYYY-MM-DD HH:mm)`。
- **部署發布**：全數完成 GAS CLI 部署、Deployment `@2` 覆寫與 GitHub `main` 分支推播發布。
