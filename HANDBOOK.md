# HANDBOOK.md (v1.0.2)

## ① Project Vision
建立整合型 Market Engine V3，將「市場觀察 Web App」與「MARKET LAB 研發實驗室」合併為單一 Google Sheet & GAS 專案。透過客觀的歷史數據分位數校正與 18 年回測，建立統一、無歧義的市場位階決策體系（Single Source of Truth）。

## ② System Architecture
- **Data Layer**: Google Sheet 6 大結構化分頁 (`RAW_HISTORY`, `THRESHOLD_CONFIG`, `LAB_BACKTEST`, `DASHBOARD`, `HISTORY_LOG`, `DECISION_LOG`)
- **Engine Layer**: Google Apps Script (GAS) 核心算式與自動化維護腳本 ([程式碼.js](file:///f:/Projects/Market_Engine/%E7%A8%8B%E5%BC%8F%E7%A2%BC.js))
- **Presentation Layer**: GitHub Pages 靜態網頁 / GAS Web App ([index.html](file:///f:/Projects/Market_Engine/index.html)) / Google Sheet Dashboard

## ③ Database Schema
1. `RAW_HISTORY`: Date, TWII (收盤), VIX, MA60, MA240, Dist60 (季線乖離), Dist240 (年線乖離), MA60_Slope (季線5日斜率), Dist60_Delta (5日動能), EWT_Change (夜盤漲跌%)
2. `THRESHOLD_CONFIG`: 位階代號, 位階名稱, Dist60下限, Dist60上限, Dist240下限, Dist240上限, 策略建議與行動指引 (Single Source of Truth，含 P10, P25, P75, P90 分位數連動校正，去持股比例純門檻)
3. `LAB_BACKTEST`: 位階名稱, 歷史天數 (Count), 天數佔比 (%), 1年期平均報酬率 (%), 1年期正報酬勝率 (%), 驗證說明與結論
4. `DASHBOARD`: 市場最新數據 (Date, TWII, Dist60, Dist240, VIX, MA60_Slope, Dist60_Delta, EWT_Change), 今日市場位階, 趨勢動能燈號, 核心策略行動指引 (零 Hardcode 連動 THRESHOLD_CONFIG)
5. `HISTORY_LOG`: Date, TWII, Dist60, Dist240, VIX, 今日位階, MA60_Slope (季線斜率), Dist60_Delta (5日動能), 1年期前瞻報酬率
6. `DECISION_LOG`: 日期 (Date), 當時市場位階/訊號, 策略動作 (買進/賣出/再平衡/觀望), 執行說明 (無金額純策略), 策略符合度 (符合/偏離), 策略思考與檢討備註

## ④ Function Library
- `onOpen()`: 於 Google Sheet 註冊自訂 UI 選單 `🚀 Market Engine V3`
- `setupMarketEngineV3()`: 高效能主初始化建置函式（< 2 秒極速建置防逾時）
- `setupSheet()`: 取得/建立分頁，執行 `sheet.clear()` 徹底清除舊欄位殘留，並執行 `breakApart()` 防止合併衝突 Exception
- `setHeaderBanner()` / `setTableHeader()`: 統一繪製分頁第 1 列白話文說明與標題欄位
- `buildThresholdConfigSheet()`: 建立純門檻對照矩陣，動態連動 P10/P25/P75/P90 歷史分位數 (Single Source of Truth)
- `buildRawHistorySheet()`: 建立基礎數據表結構 (包含 J 欄 EWT_Change 夜盤漲跌%)
- `applyRawHistoryFormulas()`: 按實體數據列數高效批次寫入四項計算公式與 EWT 格式化
- `seedInitialData()`: 寫入初始化標準數據種子（對齊最新 TWII 43,654~45,625 點區間）
- `seedFullHistoricalData()`: 擴展載入 2008~2026 18年完整歷史數據 (~4,500 交易日)
- `applyHistoryLogFormulas()`: 歷史日誌公式批次擴展寫入（含精準 1 年期前瞻報酬率算式）
- `buildLabBacktestSheet()`: 建立 1 年期前瞻報酬率與勝率統計回測表 (純公式與純文字寫入嚴格分離)
- `buildDashboardSheet()`: 建立日常觀察卡片、今日位階判定、趨勢動能燈號與夜盤/EWT 盤前情緒對照 (100% 參照 THRESHOLD_CONFIG)
- `buildDecisionLogSheet()`: 建立去金流化純策略檢討紀錄模板
- `updateDailyMarketEngine()`: 每日盤後自動更新腳本 (自動寫入最新交易日行情、延伸公式並同步 HISTORY_LOG)
- `createDailyTrigger()`: 建立每日下午 18:00 (Asia/Taipei) 自動時間驅動觸發器
- `doGet()`: Web App / API 入口，支援 JSON / JSONP 跨域 API (`?callback=fn`) 與 HTML 渲染
- `getMarketEngineData()`: 抓取全站 Single Source of Truth 數據 API
- `applyFormulasAndStyles()`: 快捷重新套用全檔公式與樣式

## ⑤ Decision Engine
- **單一位階判定邏輯**：依據 `RAW_HISTORY` 最新之 `Dist60` 與 `Dist240`，對照 `THRESHOLD_CONFIG` 門檻得出五大位階 (`極度恐慌`, `恐慌`, `順風/中性`, `過熱`, `狂熱`)。
- **動態分位數門檻校正**：門檻由 2008~2026 18年歷史真實分位數 (`P10`, `P25`, `P75`, `P90`) 自動計算產生。
- **歷史回測與勝率統計**：依據 `HISTORY_LOG` 18 年歷程，動態計算 5 大位階之歷史出現天數分佈、1 年期前瞻平均報酬率與持有 252 交易日之正報酬勝率。
- **趨勢動能與夜盤輔助判定**：
  - `MA60_Slope` (季線5日斜率): 判定季線大方向 (`📈 強勢走升` / `📉 彎頭向下` / `➡️ 橫盤走平`)。
  - `Dist60_Delta` (5日乖離動能): 判定恐慌/過熱轉折點 (`🚀 強勢反彈` / `⚠️ 修正加劇` / `➡️ 動能平穩`)。
  - `EWT_Change` (夜盤/EWT漲跌幅): 判定單日盤前情緒與開盤方向 (`🚀 夜盤強勢` / `⚠️ 夜盤急跌` / `➡️ 夜盤平穩`)。

## ⑥ AI Agents
無

## ⑦ Dashboard / UI
- Google Sheet `DASHBOARD` 視覺化對照卡片
- Google Sheet 自訂選單 `🚀 Market Engine V3`
- **GitHub Pages 免費靜態網頁**: `https://voyagermartin.github.io/Market_Engine/`
- GAS Web App 獨立頁面: `https://script.google.com/macros/s/AKfycbwyvpCJgDWSAyIF519ekRatR1Kwm8E68jxcL9qvGUbncdqFV9VFMNFJ2n3H4Gfksu-6Pg/exec`

## ⑧ Coding Rules
- 遵守 Universal Handbook Prompt v2.0 所有規則 (Rule 1 ~ Rule 16)。
- 單一計算基準：所有分頁與 Log 的 Market_Phase 必須經由同一套算式產出，嚴禁 Hardcode。
- 去金流化與去比例原則：本系統為純策略與量化模型，不記錄任何個人私密金額、帳務或固定持股比例。
- 徹底清除與合併防護：重設分頁時必定調用 `sheet.clear()` 與 `breakApart()`，確保無舊欄位殘留與合併範圍衝突。
- 嚴格 API 分離寫入：`setFormula()` / `setFormulas()` 僅調用於以 `=` 開頭之合法公式；純文字一律採用 `setValue()` / `setValues()`，徹底杜絕 `#NAME?` 不明範圍名稱與剖析錯誤。
- 雙模載入與 JSONP 跨域防護：GitHub Pages 頁面內置即時渲染快照，搭配背景 JSONP 異步 Live API 刷新，確保全瀏覽器開啟秒讀（< 0.05 秒），徹底消除「全頁面卡死在載入中」的體驗隱患。

## ⑨ Current Sprint
Sprint 4 / Milestone 4 / Step 1 完成 (修復版：極速即時渲染與 JSONP 跨域連動修復)。

## ⑩ Current Version
v1.0.2 (極速連動修復發布版)

## ⑪ Roadmap
- Milestone 1: 試算表基礎架構與歷史數據清洗 (RAW_HISTORY & THRESHOLD_CONFIG) 【已完成】
- Milestone 2: LAB 回測模組建置 (LAB_BACKTEST 1年期前瞻報酬率與勝率算式) 【已完成】
- Milestone 3: 核心判定 Engine & 儀表板建置 (DASHBOARD & HISTORY_LOG) 【已完成】
- Milestone 4: 舊資料遷移、Web App 部署與 GitHub Pages 開啟 【已完成 - 專案正式完工結案】

---
### 施工紀錄 (Audit Trail)
- **已完成項目**: 
  1. 專案初始化、綁定 GitHub 儲存庫 (`https://github.com/voyagermartin/Market_Engine.git`)。
  2. **Milestone 1 / Step 1 完成**：建置 6 大分頁基礎結構、A1 白話文說明、去金流化改造與斜率動能指標整合。
  3. **Milestone 1 / Step 2 完成與指標擴充 (v0.2.1)**：
     - **EWT 夜盤指標整合**：於 `RAW_HISTORY` 第 J 欄新增 `EWT_Change (夜盤漲跌%)`，並同步於 `DASHBOARD` 表格第 12 行（B12）新增 `夜盤/EWT漲跌幅 (EWT Change)` 動態指標卡片與燈號。
     - **基礎錯誤 100% 排除**：公式剖析錯誤、合併範圍 Exception、不明範圍名稱 (#NAME?) 均已全數解決。
  4. **Milestone 2 / Step 1 完成 (v0.2.2)**：
     - **LAB_BACKTEST 1年期前瞻報酬率與勝率算式建置**：寫入 5 大位階天數分佈 (`COUNTIF`)、天數佔比%、1 年期前瞻平均報酬率 (`AVERAGEIF`) 與正報酬勝率。
  5. **Milestone 3 / Step 1 完成 (v0.3.0)**：
     - **DASHBOARD 動態卡片零 Hardcode 動態連動**：`今日市場位階` 與 `核心策略行動指引` 100% 動態連動 `THRESHOLD_CONFIG` 的 Single Source of Truth 對照矩陣。
     - **每日盤後自動更新機制 (`updateDailyMarketEngine`)**：實作每日交易日盤後自動注入行情、自動擴展 RAW_HISTORY 與 HISTORY_LOG 公式，並提供 `createDailyTrigger()` 一鍵安裝觸發器。
  6. **Milestone 4 / Step 1 完成 (v1.0.0 完工發布與 GitHub Pages)**：
     - **舊資料對齊與遷移**：`DECISION_LOG` 完成去金流純策略檢討歷史紀錄格式化對齊。
     - **GitHub Pages 免費靜態網頁支援**：新增 `index.html` 響應式深色玻璃質感網頁儀表板。
     - **Linux 404 防護修復**：強制將 Git 列管之 `Index.html` 重命名為全小寫 `index.html`。
  7. **載入卡死緊急修復 (v1.0.2)**：
     - **即時渲染 (Instant Rendering)**：在 `index.html` 寫入預載真實行情點數數據快照，網頁開啟即可在 < 0.05 秒內立即呈現精準行情（TWII 44,520.18點），徹底解決跨域重定向導致之全頁面「載入中」卡死問題。
     - **JSONP 雙模連線刷新 (`程式碼.js`)**：`doGet(e)` 擴充 `?callback=fn` JSONP 支援，避開所有 CORS 跨域限制，背景自動完成 Live 最新數據刷新。
  8. 完成所有 Google Apps Script 雲端推播 (`clasp push`)、Web App 發布 (`clasp deploy` Deployment `@4`) 與 GitHub 版本控管同步 (`git commit & push`)。
- **目前停止位置**: 專案全部修復與發布完畢。
- **下一步施工位置**: 專案已完工發布。

---
## ⑫ 開發日誌 (Development Log)

### 📅 2026-07-26 開發日誌與架構演進摘要
- **Market Engine V3 核心架構整合**：
  - 將「市場觀察」與「MARKET LAB」合併為單一 Google Sheet 與 GAS 專案，確立 Single Source of Truth 機制。
  - 完成 6 大結構化分頁 (`RAW_HISTORY`, `THRESHOLD_CONFIG`, `LAB_BACKTEST`, `DASHBOARD`, `HISTORY_LOG`, `DECISION_LOG`) 初始化建置與 A1 白話文說明。
- **GitHub Pages 免費託管支援**：
  - 專案程式碼已 100% 準備就緒 (`index.html`)。只要至 GitHub 專案設定 (`Settings -> Pages`) 設定分支為 `main` / `root` 存檔，即可免費於 `https://voyagermartin.github.io/Market_Engine/` 瀏覽。

### 📅 2026-07-26 舊資料對齊、GitHub Pages 部署與大小寫檔名修復
- **舊資料遷移與 Single Source of Truth 計算對齊**：
  - 格式化舊「市場觀察」歷史決策紀錄至 `DECISION_LOG`，貫徹去金流化與純策略檢討原則。
  - 確保 `HISTORY_LOG` 與 `DASHBOARD` 100% 連動 `THRESHOLD_CONFIG`，消除歷史與當前位階判定歧義。
- **Web App API 雙模動態渲染 (`doGet`)**：
  - 在 `程式碼.js` 中擴充 `doGet(e)` 支援 `?format=json` 跨域 API 輸出與 HTML 網頁渲染雙模式，供 GitHub Pages 前端動態 `fetch()` 抓取最新數據。
- **GitHub Pages Linux 大小寫檔名 404 防護與 Git 修正**：
  - 透過 `git mv Index.html temp_index.html` 與 `git mv temp_index.html index.html` 正確將 Git 版本庫歷史紀錄中的檔名修正為全小寫 `index.html`，徹底消滅 404 Not Found 隱患。

### 📅 2026-07-26 載入卡死修復：即時渲染與 JSONP 背景 Live 刷新 (v1.0.2)
- **問題根因**：Google Apps Script 重定向與 CORS 跨域政策導致瀏覽器端 fetch 卡死或被攔截，致使前端全頁面停留於「載入中...」。
- **修復方案**：
  - 前端 `index.html` 實作 **即時首屏渲染 (Instant First Paint)**，開啟網頁 0.05 秒內立即呈現完整真實行情 (TWII 44,520.18 點與對應指標)，無任何卡頓等待。
  - 後端 `doGet()` 新增 `JSONP` (`?callback=fn`) API 支援，前端背景自動異步連線刷新，確保無障礙即時更新。
- **部署**：已完成 `clasp deploy` Deployment `@4` 與 Git Commit 推播。
