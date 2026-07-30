# HANDBOOK.md (v2.4.8)

## ① Project Vision
建立整合型 Market Engine V3，將「市場觀察 Web App」與「MARKET LAB 研發實驗室」合併為單一 Google Sheet & GAS 專案。透過客觀的歷史數據分位數校正與 18 年回測，建立統一、無歧義的市場位階決策體系（Single Source of Truth）。

## ② System Architecture
- **Data Layer**: Google Sheet 6 大結構化分頁 (`RAW_HISTORY`, `THRESHOLD_CONFIG`, `LAB_BACKTEST`, `DASHBOARD`, `HISTORY_LOG`, `DECISION_LOG`)
- **Engine Layer**: Google Apps Script (GAS) 核心算式與自動化維護腳本 ([程式碼.js](file:///f:/Projects/Market_Engine/%E7%A8%8B%E5%BC%8F%E7%A2%BC.js))
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
- `fetchRealMarketData()`: 即時金融行情對接器 (含 `regularMarketTime` 時間戳比對、台北時間 09:30 開盤防呆限制、`isMarketOpen` 交易日判定與防快取健康狀態指標)
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
- `generateMorningNavigation()` / `generateAfternoonNavigation()`: 老巴與小羅 AI 導航生成腳本
- `updateMorningMarketEngine()` / `updateAfternoonMarketEngine()`: 每日盤前與盤後自動更新腳本 (對接實體 API，含時間戳過濾)
- `createDailyTrigger()`: 建立每日 07:30 與 16:30 雙時段自動觸發器 (盤前 07:30 老巴早餐值班，盤後 16:30 小羅午茶值班，每月 1 日 01:00 月度對帳)
- `doGet()`: Web App / API 入口 (輸出健康狀態與即時時間戳，包含 AI 故事背景自動生成檢查)
- `getMarketEngineData()`: 精準讀取 `RAW_HISTORY` Row 3 API 與行情健康燈號

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
  - 小羅盤後 AI 導航 (`generateAfternoonNavigation`): 16:30 值班 (小羅午茶 - 時間校正修復)
  - 專用模型: `gemini-flash-latest`

## ⑦ Dashboard / UI (v2.4.6 SPA 分頁化、防快取 JSONP 與颱風假判定優化)
- **SPA 頁面分頁化重構 (Tab Navigation)**: 3 大 Glassmorphism 頁籤（☕ 今日戰情 `today`, 💡 觀念導航 `concepts`, 📈 歷史回測 `backtest`），極致流暢且兼顧響應式切換。
- **觀念導航 5 大指標圖卡大升級**: 包含 VIX (市場體溫計)、MA60/MA240 (趨勢守護地板)、Dist60 (小狗散步位階)、Slope/Delta (底氣與油門) 與 EWT 5 階門檻 (海外氣象球)，全面精簡去除「白話比喻：」前綴贅字。
- **前端 JSONP 快取防呆 (Cache Busting)**: 於 API 請求中加入隨機毫秒時間戳參數，徹底解決瀏覽器快取舊資料的問題，確保每次重整網頁均為最新狀態。
- **小羅 AI 導航時間點校正**: 盤後值班時段精準校正為 16:30。
- **MARKET LAB 月度回測 4 大維度自我驗證引擎**: 新增 `LAB_CALC_DATE` 對帳日期標籤與動態勝率計算。
- **品牌人情味與極致白話**: 巴菲特‧索羅斯的 Kopitiam (來喝咖啡看盤吧～)，全站乾淨狀態列與美味 Kopitiam 咖啡圖示 (`favicon.png` / `icon.png`)。
- **GitHub Pages 靜態網頁**: `https://voyagermartin.github.io/Market_Engine/`
- **GAS Web App**: `https://script.google.com/macros/s/AKfycbyXxiVbJqRjTDfFkU2XTtScTVdLGqIafbDaqfSJeG-JQs0sJZ-A0wlQtPN52xHQqmHJqA/exec`

## ⑧ Coding Rules
- 遵守 Universal Handbook Prompt v2.0 所有規則。
- 零容忍擬真數據：徹底刪除 `Math.random()` 及所有擬真推算公式，100% 連動證交所、CBOE 與 MSCI EWT 官方實體歷史盤後點位。

## ⑨ Current Sprint
v2.4.8 修正試算表插入行導致 DASHBOARD 公式參照漂移問題，引進 INDIRECT 公式與後端 JS 位階判定覆寫！

## ⑩ Current Version
v2.4.8 (引進 INDIRECT 公式防漂移與後端 JS 位階雙重覆寫強固版)

## ⑪ Roadmap
- Milestone 1: 試算表基礎架構與 100% 三全量真實歷史行情鏈結完工。
- Milestone 2: 數據健康狀態燈號與颱風假/臨時休市時間戳防呆完工。
- Milestone 3: Kopitiam 溫馨品牌軟化、白話翻譯卡片與美味咖啡圖示完工發布。
- Milestone 4: SPA 3 大分頁切換重構、觀念導航 5 大圖卡精簡與 MARKET LAB 4 大維度自我驗證引擎完工。
- **目前停止位置**: v2.4.8 修正試算表公式參照漂移，引入 INDIRECT 及後端動態 JS 位階雙重判定覆寫！
- **下一步施工位置**: 系統維護完成，安心運行日常與月度自動對帳更新。

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
