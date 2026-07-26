# HANDBOOK.md (v1.0.7)

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
- `seedInitialData()`: 寫入初始化標準數據種子（對齊最新 TWII 43,654.84 實體行情）
- `seedFullHistoricalData()`: 擴展載入 2008~2026 18年完整歷史數據 (~4,500 交易日)
- `applyHistoryLogFormulas()`: 歷史日誌公式批次擴展寫入（含精準 1 年期前瞻報酬率算式）
- `buildLabBacktestSheet()`: 建立 1 年期前瞻報酬率與勝率統計回測表 (純公式與純文字寫入嚴格分離)
- `buildDashboardSheet()`: 建立日常觀察卡片、今日位階判定、趨勢動能燈號與夜盤/EWT 盤前情緒對照 (對齊 RAW_HISTORY Row 3)
- `buildDecisionLogSheet()`: 建立去金流化純策略檢討紀錄模板
- `updateDailyMarketEngine()`: 每日盤後自動更新腳本 (自動寫入最新交易日行情、延伸公式並同步 HISTORY_LOG)
- `createDailyTrigger()`: 建立每日下午 18:00 (Asia/Taipei) 自動時間驅動觸發器
- `doGet()`: Web App / API 入口，支援 JSON / JSONP 跨域 API 與網頁渲染
- `getMarketEngineData()`: 強控直接讀取 `RAW_HISTORY` Row 3 最新實體交易日 API (確保 100% 傳回 TWII 43,654.84)
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
- GAS Web App 獨立頁面: `https://script.google.com/macros/s/AKfycbxKs87AY9XiYV86fXoE0GShpqp9mzXucwdmGe9zhrvg8cDoVZcdCWuwR1FsbyU5gQlayw/exec`

## ⑧ Coding Rules
- 遵守 Universal Handbook Prompt v2.0 所有規則 (Rule 1 ~ Rule 16)。
- 單一計算基準：所有分頁與 Log 的 Market_Phase 必須經由同一套算式產出，嚴禁 Hardcode。
- 去金流化與去比例原則：本系統為純策略與量化模型，不記錄任何個人私密金額、帳務或固定持股比例。
- 徹底清除與合併防護：重設分頁時必定調用 `sheet.clear()` 與 `breakApart()`，確保無舊欄位殘留與合併範圍衝突。
- 嚴格 API 分離寫入：`setFormula()` / `setFormulas()` 僅調用於以 `=` 開頭之合法公式；純文字一律採用 `setValue()` / `setValues()`，徹底杜絕 `#NAME?` 不明範圍名稱與剖析錯誤。
- 最新數據直讀法則：`getMarketEngineData()` 直捷對齊 `RAW_HISTORY` 第 3 列最新交易日，排除一切多餘中轉公式導致之舊資料覆蓋。

## ⑨ Current Sprint
Sprint 4 / Milestone 4 / Step 1 完成 (修復完成：RAW_HISTORY Row 3 實體行情強控讀取)。

## ⑩ Current Version
v1.0.7 (行情強控對齊發布版)

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
     - **EWT 夜盤指標整合**：於 `RAW_HISTORY` 第 J 欄新增 `EWT_Change (夜盤漲跌%)`，並同步於 `DASHBOARD` 表格第 12 行（B12）新增指標卡片與燈號。
  4. **Milestone 2 / Step 1 完成 (v0.2.2)**：
     - **LAB_BACKTEST 1年期前瞻報酬率與勝率算式建置**：寫入 5 大位階天數分佈、1 年期前瞻平均報酬率與正報酬勝率。
  5. **Milestone 3 / Step 1 完成 (v0.3.0)**：
     - **DASHBOARD 動態卡片零 Hardcode 動態連動**：`今日市場位階` 與 `核心策略行動指引` 100% 動態連動 `THRESHOLD_CONFIG`。
  6. **Milestone 4 / Step 1 完成 (v1.0.0 完工發布與 GitHub Pages)**：
     - **舊資料對齊與遷移**：`DECISION_LOG` 完成去金流純策略檢討歷史紀錄格式化對齊。
  7. **RAW_HISTORY Row 3 實體行情強控讀取 (v1.0.7)**：
     - **`getMarketEngineData()` 強控讀取**：直接對齊 `RAW_HISTORY` 第 3 列（最新交易日），100% 精準傳回 TWII `43,654.84` 點、Dist60 `+1.14%`、Dist240 `+10.22%` 等最新指標。
     - **`DASHBOARD` 直連公式**：B5~B12 改為直接對照 `=RAW_HISTORY!A3` ~ `=RAW_HISTORY!J3`，徹底終結舊連動偏移問題。
  8. 完成所有 Google Apps Script 雲端推播 (`clasp push`)、Web App 發布 (`clasp deploy` Deployment `@9`) 與 GitHub 版本控管同步 (`git commit & push`)。
- **目前停止位置**: 專案全部修復與發布完畢。
- **下一步施工位置**: 專案已完工發布。

---
## ⑫ 開發日誌 (Development Log)

### 📅 2026-07-26 RAW_HISTORY Row 3 實體行情強控對齊 (v1.0.7)
- **修復細節**：
  - 改寫 `程式碼.js` 的 `getMarketEngineData()`，讓 API 固定直接讀取 `RAW_HISTORY` 第 3 列 (最新一筆實體交易日)。
  - 將 `DASHBOARD` 的連動公式由中轉 INDEX 改為 `=RAW_HISTORY!B3` 等直接引用。
  - 確保 Web App API JSON 與 GitHub Pages 前端顯示之台股加權指數 100% 絕對等於 **`43,654.84`** 點。
- **部署**：`clasp deploy` Deployment `@9` 與 Git Push 成功發布。
