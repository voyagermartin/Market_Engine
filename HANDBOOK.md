# HANDBOOK.md (v0.1.1)

## ① Project Vision
建立整合型 Market Engine V3，將「市場觀察 Web App」與「MARKET LAB 研發實驗室」合併為單一 Google Sheet & GAS 專案。透過客觀的歷史數據分位數校正與 18 年回測，建立統一、無歧義的市場位階決策體系（Single Source of Truth）。

## ② System Architecture
- **Data Layer**: Google Sheet (`RAW_HISTORY`, `THRESHOLD_CONFIG`, `LAB_BACKTEST`, `HISTORY_LOG`, `DECISION_LOG`)
- **Engine Layer**: Google Apps Script (GAS) 核心模組
- **Presentation Layer**: GAS Web App / Google Sheet Dashboard

## ③ Database Schema
1. `RAW_HISTORY`: Date, TWII, VIX, MA60, MA240, Dist60, Dist240
2. `THRESHOLD_CONFIG`: Metric, P10 (極度恐慌), P25 (恐慌), P75 (順風), P90 (過熱)
3. `LAB_BACKTEST`: Phase, Count, WinRate_1Y, AvgReturn_1Y, MaxDrawdown
4. `DASHBOARD`: 市場位階, 資金池訊號, 建議策略, 更新時間
5. `HISTORY_LOG`: Date, TWII, Dist60, Dist240, Market_Phase, Action_Signal
6. `DECISION_LOG`: 日期, 當時位階/訊號, 策略動作, 執行說明 (無金額純策略), 策略符合度, 策略思考與備註

## ④ Function Library
- `onOpen()`: 註冊 UI 選單
- `setupMarketEngineV3()`: 建置 6 大分頁基礎結構、標題、樣式與自動化公式
- `seedSampleData()`: 寫入基礎測試數據

## ⑤ Decision Engine
- 單一判定邏輯：依據 `RAW_HISTORY` 最新之 `Dist60` 與 `Dist240`，對照 `THRESHOLD_CONFIG` 門檻得出 `Market_Phase`。

## ⑥ AI Agents
無

## ⑦ Dashboard / UI
- Google Sheet DASHBOARD 分頁
- GAS Web App 獨立頁面

## ⑧ Coding Rules
- 遵守 Universal Handbook Prompt v2.0 所有規則 (Rule 1 ~ Rule 16)
- 單一計算基準：所有分頁與 Log 的 Market_Phase 必須經由同一套算式產出，嚴禁 Hardcode。
- UI 使用一般使用者可理解之中文名稱。

## ⑨ Current Sprint
Sprint 1: 建置 Market Engine V3 核心 Google Sheet 6 大分頁基礎結構與說明 (Step 1 已完成)。

## ⑩ Current Version
v0.1.1

## ⑪ Roadmap
- Milestone 1: 試算表基礎架構與歷史數據清洗 (RAW_HISTORY & THRESHOLD_CONFIG)
- Milestone 2: LAB 回測模組建置 (LAB_BACKTEST)
- Milestone 3: 核心判定 Engine & 儀表板建置 (DASHBOARD & HISTORY_LOG)
- Milestone 4: 舊資料遷移與 Web App 部署

---
### 施工紀錄 (Audit Trail)
- **已完成項目**: 
  1. 專案初始化、HANDBOOK v0.1.0/v0.1.1 建立。
  2. 完成 Google Sheet 6 大分頁 (`RAW_HISTORY`, `THRESHOLD_CONFIG`, `LAB_BACKTEST`, `DASHBOARD`, `HISTORY_LOG`, `DECISION_LOG`) 基礎結構、A1 白話文說明及自動化公式建置。
  3. 完成 Google Apps Script (`clasp push`) 腳本部署與選單註冊。
- **目前停止位置**: Milestone 1 / Step 1 完成。
- **下一步施工位置**: Milestone 1 / Step 2 (載入/清洗 RAW_HISTORY 歷史數據與校正 THRESHOLD_CONFIG 分位數參數)。

