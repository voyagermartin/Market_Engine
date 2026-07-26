# HANDBOOK.md (v0.1.3)

## ① Project Vision
建立整合型 Market Engine V3，將「市場觀察 Web App」與「MARKET LAB 研發實驗室」合併為單一 Google Sheet & GAS 專案。透過客觀的歷史數據分位數校正與 18 年回測，建立統一、無歧義的市場位階決策體系（Single Source of Truth）。

## ② System Architecture
- **Data Layer**: Google Sheet 6 大結構化分頁 (`RAW_HISTORY`, `THRESHOLD_CONFIG`, `LAB_BACKTEST`, `DASHBOARD`, `HISTORY_LOG`, `DECISION_LOG`)
- **Engine Layer**: Google Apps Script (GAS) 核心算式與自動化維護腳本 ([程式碼.js](file:///f:/Projects/Market_Engine/%E7%A8%8B%E5%BC%8F%E7%A2%BC.js))
- **Presentation Layer**: Google Sheet DASHBOARD 視覺卡片 / GAS Web App 獨立頁面

## ③ Database Schema
1. `RAW_HISTORY`: Date, TWII (收盤), VIX, MA60, MA240, Dist60 (季線乖離), Dist240 (年線乖離), MA60_Slope (季線5日斜率), Dist60_Delta (5日動能)
2. `THRESHOLD_CONFIG`: 位階代號, 位階名稱, Dist60下限, Dist60上限, Dist240下限, Dist240上限, 建議股票%, 建議現金%, 策略建議與行動指引 (Single Source of Truth)
3. `LAB_BACKTEST`: 位階名稱, 歷史天數, 天數佔比%, 1年期平均報酬率%, 1年期正報酬勝率%, 驗證說明與結論
4. `DASHBOARD`: 市場最新數據 (Date, TWII, Dist60, Dist240, VIX, MA60_Slope, Dist60_Delta), 今日市場位階, 趨勢動能燈號, 建議股票/現金比例, 核心策略行動指引
5. `HISTORY_LOG`: Date, TWII, Dist60, Dist240, VIX, 今日位階, MA60_Slope (季線斜率), Dist60_Delta (5日動能), 1年期前瞻報酬率
6. `DECISION_LOG`: 日期 (Date), 當時市場位階/訊號, 策略動作 (買進/賣出/再平衡/觀望), 執行說明 (無金額純策略), 策略符合度 (符合/偏離), 策略思考與檢討備註

## ④ Function Library
- `onOpen()`: 於 Google Sheet 註冊自訂 UI 選單 `🚀 Market Engine V3`
- `setupMarketEngineV3()`: 主初始化建置函式，建立/重設 6 大分頁、注入 Banner 說明、套用公式與美化樣式
- `setHeaderBanner()` / `setTableHeader()`: 統一繪製分頁第 1 列白話文說明與標題欄位
- `buildThresholdConfigSheet()`: 建立門檻與配置對照矩陣 (Single Source of Truth)
- `buildRawHistorySheet()`: 建立基礎數據表並注入乖離率、5日斜率與動能計算公式
- `buildHistoryLogSheet()`: 建立歷史日誌，簡化移除個人持股比例，加入斜率與動能轉折
- `buildLabBacktestSheet()`: 建立 1 年期前瞻報酬率與勝率統計回測表
- `buildDashboardSheet()`: 建立日常觀察卡片、今日位階判定與趨勢動能燈號
- `buildDecisionLogSheet()`: 建立去金流化純策略檢討紀錄模板
- `seedSampleData()`: 寫入基礎歷史測試數據
- `applyFormulasAndStyles()`: 快捷重新套用全檔公式與樣式

## ⑤ Decision Engine
- **單一位階判定邏輯**：依據 `RAW_HISTORY` 最新之 `Dist60` 與 `Dist240`，對照 `THRESHOLD_CONFIG` 門檻得出五大位階 (`極度恐慌`, `恐慌`, `順風/中性`, `過熱`, `狂熱`)。
- **趨勢動能輔助判定**：
  - `MA60_Slope` (季線5日斜率): 判定季線大方向 (`📈 強勢走升` / `📉 彎頭向下` / `➡️ 橫盤走平`)。
  - `Dist60_Delta` (5日乖離動能): 判定恐慌/過熱轉折點 (`🚀 強勢反彈` / `⚠️ 修正加劇` / `➡️ 動能平穩`)。

## ⑥ AI Agents
無

## ⑦ Dashboard / UI
- Google Sheet `DASHBOARD` 視覺化對照卡片
- Google Sheet 自訂選單 `🚀 Market Engine V3`
- GAS Web App 獨立頁面

## ⑧ Coding Rules
- 遵守 Universal Handbook Prompt v2.0 所有規則 (Rule 1 ~ Rule 16)。
- 單一計算基準：所有分頁與 Log 的 Market_Phase 必須經由同一套算式產出，嚴禁 Hardcode。
- 去金流化原則：本系統為純策略與量化模型，不記錄任何個人私密金額或帳務。
- UI 使用一般使用者可理解之中文名稱與白話文 Banner 說明。

## ⑨ Current Sprint
Sprint 1: 建置 Market Engine V3 核心 Google Sheet 6 大分頁基礎結構、斜率動能指標與說明 (Step 1 已完成)。

## ⑩ Current Version
v0.1.3

## ⑪ Roadmap
- Milestone 1: 試算表基礎架構與歷史數據清洗 (RAW_HISTORY & THRESHOLD_CONFIG)
- Milestone 2: LAB 回測模組建置 (LAB_BACKTEST)
- Milestone 3: 核心判定 Engine & 儀表板建置 (DASHBOARD & HISTORY_LOG)
- Milestone 4: 舊資料遷移與 Web App 部署

---
### 施工紀錄 (Audit Trail)
- **已完成項目**: 
  1. 專案初始化、綁定 GitHub 儲存庫 (`https://github.com/voyagermartin/Market_Engine.git`)。
  2. 完成 Google Sheet 6 大分頁 (`RAW_HISTORY`, `THRESHOLD_CONFIG`, `LAB_BACKTEST`, `DASHBOARD`, `HISTORY_LOG`, `DECISION_LOG`) 基礎結構與 A1 白話文說明。
  3. **`THRESHOLD_CONFIG` 門檻 Single Source of Truth 設計**：全檔位階與配置統一連動參照。
  4. **`DECISION_LOG` 去金流化改造**：移除個人金額與交易私密欄位，轉為安心公開分享的純策略與紀律檢討模板。
  5. **`HISTORY_LOG` 簡化與斜率動能整合**：移除股票/現金比欄位，於 `RAW_HISTORY`、`HISTORY_LOG` 及 `DASHBOARD` 新增「季線5日斜率 % (MA60_Slope)」與「5日乖離動能 (Dist60_Delta)」指標及趨勢燈號。
  6. 完成所有 Google Apps Script 雲端推播 (`clasp push`) 與 GitHub 版本控管同步 (`git commit & push`)。
- **目前停止位置**: Milestone 1 / Step 1 完成。
- **下一步施工位置**: Milestone 1 / Step 2 (載入/清洗 RAW_HISTORY 歷史數據與校正 THRESHOLD_CONFIG 分位數參數)。
