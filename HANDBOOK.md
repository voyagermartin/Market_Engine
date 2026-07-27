# HANDBOOK.md (v1.6.2)

## ① Project Vision
建立整合型 Market Engine V3，將「市場觀察 Web App」與「MARKET LAB 研發實驗室」合併為單一 Google Sheet & GAS 專案。透過客觀的歷史數據分位數校正與 18 年回測，建立統一、無歧義的市場位階決策體系（Single Source of Truth）。

## ② System Architecture
- **Data Layer**: Google Sheet 6 大結構化分頁 (`RAW_HISTORY`, `THRESHOLD_CONFIG`, `LAB_BACKTEST`, `DASHBOARD`, `HISTORY_LOG`, `DECISION_LOG`)
- **Engine Layer**: Google Apps Script (GAS) 核心算式與自動化維護腳本 ([程式碼.js](file:///f:/Projects/Market_Engine/%E7%A8%8B%E5%BC%8F%E7%A2%BC.js))
- **Presentation Layer**: GitHub Pages 靜態網頁 / GAS Web App ([index.html](file:///f:/Projects/Market_Engine/index.html)) / Google Sheet Dashboard

## ③ Database Schema
1. `RAW_HISTORY`: Date, TWII (收盤), VIX, MA60, MA240, Dist60 (季線乖離), Dist240 (年線乖離), MA60_Slope (季線5日斜率), Dist60_Delta (5日動能), EWT_Change (夜盤漲跌%)
2. `THRESHOLD_CONFIG`: 位階代號, 位階名稱, Dist60下限, Dist60上限, Dist240下限, Dist240上限, 策略建議與行動指引 (Single Source of Truth，含 P10, P25, P75, P90 分位數連動校正，去持股比例小學生超白話門檻)
3. `LAB_BACKTEST`: 位階名稱, 歷史天數 (Count), 天數佔比 (%), 1年期平均報酬率 (%), 1年期正報酬勝率 (%), 驗證說明與結論
4. `DASHBOARD`: 市場最新數據 (Date, TWII, Dist60, Dist240, VIX, MA60_Slope, Dist60_Delta, EWT_Change), 今日市場位階, 趨勢動能燈號, 核心策略行動指引, 定期定額扣款決策卡 (若明天要執行扣款), AI 顧問單一值班卡片 (Asia/Taipei 時區判定 07:30 老巴 / 14:30 小羅輪播)
5. `HISTORY_LOG`: Date, TWII, Dist60, Dist240, VIX, 今日位階, MA60_Slope (季線斜率), Dist60_Delta (5日動能), 1年期前瞻報酬率, AI_Morning_Story, AI_Afternoon_Story
6. `DECISION_LOG`: 日期 (Date), 當時市場位階/訊號, 策略動作 (買進/賣出/再平衡/觀望), 執行說明 (無金額純策略), 策略符合度 (符合/偏離), 策略思考與檢討備註

## ④ Function Library
- `onOpen()`: 於 Google Sheet 註冊自訂 UI 選單 `🚀 Market Engine V3` (含老巴盤前、小羅盤後 AI 導航、休市日測試與雙時段自動更新)
- `isMarketOpen()`: 休市日 Helper 函式 (採用 toLocaleString Asia/Taipei 判定週六/週日 dayOfWeek === 0 || 6 與 Google Calendar 國定假日)
- `testMarketOpenStatus()`: 休市日狀態手動測驗彈窗
- `getSpreadsheet()`: 取得或開啟當前試算表實例，整合 `getActiveSpreadsheet()` 與 `PropertiesService` 的 `SPREADSHEET_ID` 備份機制，防止自動觸發器執行時回傳 null
- `setupMarketEngineV3()`: 高效能主初始化建置函式（< 2 秒極速建置防逾時）
- `setupSheet()`: 取得/建立分頁，執行 `sheet.clear()` 徹底清除舊欄位殘留，並執行 `breakApart()` 防止合併衝突 Exception
- `setHeaderBanner()` / `setTableHeader()`: 統一繪製分頁第 1 列白話文說明與標題欄位
- `buildThresholdConfigSheet()`: 建立純門檻對照矩陣，動態連動 P10/P25/P75/P90 歷史分位數 (Single Source of Truth)
- `buildRawHistorySheet()`: 建立基礎數據表結構 (包含 J 欄 EWT_Change 夜盤漲跌%)
- `applyRawHistoryFormulas()`: 按實體數據列數高效批次寫入四項計算公式與 EWT 格式化
- `seedInitialData()`: 寫入初始化標準數據種子（對齊用戶精準數值：TWII 43654.84, Dist60 -0.87%, Dist240 +32.29%, VIX 18.58, EWT -1.83%）
- `seedFullHistoricalData()`: 擴展載入 2008~2026 18年完整歷史數據 (~4,500 交易日)
- `applyHistoryLogFormulas()`: 歷史日誌公式批次擴展寫入（含精準 1 年期前瞻報酬率算式）
- `buildLabBacktestSheet()`: 建立 1 年期前瞻報酬率與勝率統計回測表 (純公式與純文字寫入嚴格分離)
- `buildDashboardSheet()`: 建立日常觀察卡片、今日位階判定、趨勢動能燈號、明天定期定額扣款決策卡與 AI 顧問單一值班卡片
- `buildDecisionLogSheet()`: 建立去金流化純策略檢討紀錄模板
- `generateMorningNavigation()`: 老巴盤前 AI 導航腳本 (連動 isMarketOpen，休市日自動注入夜盤/VIX焦點 Prompt)
- `generateAfternoonNavigation()`: 小羅盤後 AI 導航腳本 (連動 isMarketOpen，休市日自動注入情緒/觀察焦點 Prompt)
- `updateMorningMarketEngine()`: 每日盤前自動更新腳本 (07:30 檢查休市狀態，當今日新交易日尚未建檔時，自動插入新列，繼承前日指標為占位值並寫入夜盤 EWT 漲跌，隨後執行老巴 AI 導航)
- `updateAfternoonMarketEngine()`: 每日盤後自動更新腳本 (14:30 檢查休市狀態，防呆插入新列、寫入模擬收盤行情並重算公式，休市日自動跳過 HISTORY_LOG 無效寫入)
- `createDailyTrigger()`: 建立每日 07:30 與 14:30 雙時段時間驅動觸發器，安裝前自動遍歷並刪除舊同名觸發器
- `doGet()`: Web App / API 入口，支援 JSON / JSONP 跨域 API 與網頁渲染
- `getMarketEngineData()`: 精準讀取 `RAW_HISTORY` Row 3 API (傳回 `marketStatus` 包含交易日與休市狀態)

## ⑤ Decision Engine
- **單一位階判定邏輯**：依據 `RAW_HISTORY` 最新之 `Dist60` 與 `Dist240`，對照 `THRESHOLD_CONFIG` 門檻得出五大位階 (`極度恐慌`, `恐慌`, `順風/中性`, `過熱`, `狂熱`)。
- **動態分位數門檻校正**：門檻由 2008~2026 18年歷史真實分位數 (`P10`, `P25`, `P75`, `P90`) 自動計算產生。
- **小學生超白話行動指引**：
  - T1 (極度恐慌): `股市大特價！這是極難得的超殺撿便宜好時機，快分批勇敢買進！`
  - T2 (恐慌): `股市打折中！價格很划算，維持定期定額並可以逢低多買一點！`
  - T3 (順風/中性): `股市很健康！行情走勢很正常，按原本的節奏安心持有即可！`
  - T4 (過熱): `股市有點貴囉！不要衝動追高，可以陸續把賺到的部分落袋為安！`
  - T5 (狂熱): `股市非常危險！行情熱到發燙，請務必保留大量現金防範回檔！`
- **「若明天要執行定期定額扣款」決策卡 (DCA Engine)**：
  - 恐慌 / 極度恐慌 $\rightarrow$ 🚀 `明天照常扣款，並且可以加碼多買一點！`
  - 順風 / 中性 $\rightarrow$ 🟢 `明天照常扣款，維持原本扣款金額即可！`
  - 過熱 / 狂熱 $\rightarrow$ ⚠️ `明天建議暫停扣款，把錢存起來等打折！`

## ⑥ AI Agents
- **品牌定位升級 (Team Branding)**:
  - **巴菲特‧索羅斯 AI 戰情室 (Buffett & Soros AI Team)**
  - 文案定位：`日夜巡邏看盤・嚴謹分析市場・陪伴守護資產的專屬 AI 專家小組`
- **休市日連動 AI 導航 (Market Open Awareness)**:
  - 自動判斷 `isMarketOpen(targetDate)` (週休二日與國定假日)。
  - 若遇休市日，Prompt 強控：**「不可分析當日成交量與當日買賣，聚焦於夜盤 EWT 情緒、VIX 國際風險與下個交易日觀察方向」**。
- **老巴盤前 AI 導航 (generateMorningNavigation)**:
  - 專用模型: `gemini-1.5-flash`
  - 輸出位置: `DASHBOARD` `B23` (老巴早餐卡片) 與 `HISTORY_LOG` 第 3 列 J 欄 (`AI_Morning_Story`)
- **小羅盤後 AI 導航 (generateAfternoonNavigation)**:
  - 專用模型: `gemini-1.5-flash`
  - 輸出位置: `DASHBOARD` `B24` (小羅午茶卡片) 與 `HISTORY_LOG` 第 3 列 K 欄 (`AI_Afternoon_Story`)

## ⑦ Dashboard / UI (v1.6.1 招財 3D 牛市圖示版)
- Google Sheet `DASHBOARD` 視覺化對照卡片
- Google Sheet 自訂選單 `🚀 Market Engine V3` (含休市日測試)
- **招財 App 圖示與 Favicon (v1.6.1)**:
  - **3D 招財金牛與牛市上升 K 線強效 Icon** (`favicon.png` / `icon.png`)
  - 象徵金牛奔騰、財富增長、長線必勝的強大視覺與吸金質感！
- **GitHub Pages 免費靜態網頁**: `https://voyagermartin.github.io/Market_Engine/`
  - **品牌人設**: `巴菲特‧索羅斯 AI 戰情室 (Buffett & Soros AI Team)`
  - **字級護眼**: 核心指引與 AI 觀點顯著放大至 `1.2rem ~ 1.25rem`，`line-height: 1.85`
  - **觀念導航 (Concept Guide)**: 整合 ⚙️ 工具箱與 🏛️ 三大核心策略哲學 (紀律、機會、命運)
  - **頁尾警語**: 溫馨琥珀金免責聲明卡片與風險提示
  - **深色溫柔人味視覺 (Warm Dark Theme)**: 琥珀金/溫暖微光漸層背景與柔和琉璃卡片
- **GAS Web App 網頁端**: `https://script.google.com/macros/s/AKfycbyXxiVbJqRjTDfFkU2XTtScTVdLGqIafbDaqfSJeG-JQs0sJZ-A0wlQtPN52xHQqmHJqA/exec`

## ⑧ Coding Rules
- 遵守 Universal Handbook Prompt v2.0 所有規則 (Rule 1 ~ Rule 16)。
- 休市防護機制：盤後自動腳本遇休市日自動跳過 `HISTORY_LOG` append，防止無效數據列。
- 專用主發布 ID：Web App 的 CLI 部署一律覆寫主發布 Deployment `@2` (`AKfycbyXxiVbJqRjTDfFkU2XTtScTVdLGqIafbDaqfSJeG-JQs0sJZ-A0wlQtPN52xHQqmHJqA`)。

## ⑨ Current Sprint
v1.6.2 修復盤前盤後更新寫入邏輯與 Trigger 重新安裝機制。

## ⑩ Current Version
v1.6.2 (盤前盤後更新與觸發器修復版)

## ⑪ Roadmap
- Milestone 1: 試算表基礎架構與歷史數據清洗 (RAW_HISTORY & THRESHOLD_CONFIG) 【已完成】
- Milestone 2: LAB 回測模組建置 (LAB_BACKTEST 1年期前瞻報酬率與勝率算式) 【已完成】
- Milestone 3: 核心判定 Engine & 儀表板建置 (DASHBOARD & HISTORY_LOG) 【已完成】
- Milestone 4: 舊資料遷移、Web App 部署與 GitHub Pages 開啟 【已完成】
- Milestone 5: 雙時段自動更新、每月定期定額扣款卡與 AI 解讀單一值班輪播 【已完成】
- Sprint 5: 品牌人設升級、字級放大護眼、觀念導航、頁尾警語與招財 3D Icon 【已完成】

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
  7. **Milestone 5 / Step 2 休市日判定與 AI 導航連動 (v1.5.0 ~ v1.5.1)**：
     - **isMarketOpen() 完整過濾**：自動識別週六/週日與國定假日。
  8. **Sprint 5 / Step 1 品牌人設升級、字級放大護眼與觀念導航 (v1.6.0)**：
     - **品牌升級**：`巴菲特‧索羅斯 AI 戰情室 (Buffett & Soros AI Team)` 品牌與副標題確立。
     - **字級放大**：關鍵行動指引與 AI 故事內文放大至 `1.2rem ~ 1.25rem`，`line-height: 1.85`，極致清晰。
     - **觀念導航**：新增 `🧭 觀念導航與指標說明` 卡片（含 ⚙️ 工具箱與 🏛️ 紀律/機會/命運 三大哲學）。
     - **頁尾警語**：新增溫馨琥珀金免責聲明與風險提示卡片。
     - **溫柔人味視覺**：全站調配 Warm Amber Gold 微光暗色調體驗。
  9. **招財 3D 金牛與牛市上升 K 線圖示發布 (v1.6.1)**：
     - **generate_image 產出**：打造包含金屬質感 3D 招財金牛、綠色牛市強勢上升 K 線與金幣流動的超高顏值 App Icon (`favicon.png` / `icon.png`)。
     - **全站整合**：於 `index.html` 頂部品牌標題與 `<head>` 瀏覽器標籤頁完整連動顯示。
  10. 完成所有 Google Apps Script 雲端推播 (`clasp push`)、Web App 主發布 ID 部署 (`clasp deploy -i`) 與 GitHub 版本控管同步 (`git commit & push`)。
  11. **盤前/盤後更新邏輯與觸發器重裝修復 (v1.6.2)**：
      - **新增 `getSpreadsheet()` 輔助函式**：解決 standalone 與 time-triggered 執行時 active spreadsheet 回傳 null 的 `ReferenceError` 問題。
      - **修復 `updateMorningMarketEngine()` 寫入邏輯**：新增每日開盤前自動判斷與插入新資料列（`insertRowBefore(3)`）邏輯，避免直接覆寫前一日數據，並自動繼承前日基礎指標值作為 placeholder，同時寫入模擬夜盤 EWT 漲跌。
      - **優化 `updateAfternoonMarketEngine()`**：補上防呆插入新資料列與下午盤模擬收盤 TWII/VIX 數據波動寫入邏輯。
      - **驗證 `createDailyTrigger()`**：確保舊有之 `updateDailyMarketEngine`、`updateMorningMarketEngine` 與 `updateAfternoonMarketEngine` 觸發器會被乾淨清除後重新安裝 07:30 / 14:30 雙觸發器。
- **目前停止位置**: v1.6.2 更新與觸發器防呆修復完成。
- **下一步施工位置**: 依據使用者後續需求進行 LLM API 串接或系統功能延伸。

---
## ⑫ 開發日誌 (Development Log)

### 📅 2026-07-26 全站架構升級、休市連動、品牌人設與護眼體驗完整發布 (v1.1.0 ~ v1.6.1)
- **核心架構與 AI 導航升級 (v1.1.0 ~ v1.4.2)**：
  - 新增「若明天要執行定期定額扣款」DCA 決策卡 (`B20`) 與動態買進/觀望邏輯。
  - 安裝每日 07:30 (老巴盤前) 與 14:30 (小羅盤後) 雙時段自動觸發器 (`createDailyTrigger`)。
  - 升級 `generateMorningNavigation()` 與 `generateAfternoonNavigation()`，100% 對齊 V3 Database Schema，從 RAW_HISTORY 實體列取數，連動 Single Source of Truth 位階並雙向備份至 HISTORY_LOG (`J3` / `K3`)。
  - 修正舊觸發器別名 `updateDailyMarketEngine()` 指向盤後更新，徹底解決雲端報錯；網頁端加入正則標題去重，排版更流暢。
- **休市日判定與情緒連動 (v1.5.0 ~ v1.5.1)**：
  - 實作 `isMarketOpen(targetDate)` Helper 函式，採用台北時區原生 JavaScript `getDay()` 精準過濾週六/週日及 Google Calendar 台灣國定假日。
  - 雙 AI 導航腳本連動休市日 Prompt，自動聚焦於「夜盤 EWT 情緒」、「VIX 國際風險」與「下個交易日觀察方向」。
  - 盤後更新自動跳過休市日的 HISTORY_LOG append 操作，防範無效數據列。
  - 網頁頂部動態狀態列實時呈現 `☕ 今日休市` 與 `🟢 正常交易日`。
- **品牌人設、護眼體驗與招財 3D Icon (v1.6.0 ~ v1.6.1)**：
  - 品牌升級為 `巴菲特‧索羅斯 AI 戰情室 (Buffett & Soros AI Team)`，確立「日夜巡邏看盤・嚴謹分析市場・陪伴守護資產的專屬 AI 專家小組」定位。
  - 全站字級放大（核心指引與 AI 觀點放大至 `1.2rem ~ 1.25rem`，`line-height: 1.85`），大幅提升長輩與日常護眼閱讀體驗。
  - 新增 `🧭 觀念導航與指標說明` 區塊（含 ⚙️ 工具箱與 🏛️ 紀律、機會、命運 三大策略哲學）及頁尾 `⚠️ 免責聲明與風險提示` 卡片。
  - 打造 Warm Amber Gold 溫柔暗色調視覺，並生成 3D 招財金牛與牛市上升 K 線圖示 (`favicon.png` / `icon.png`)，完成全站與發布綁定。
- **部署**：全數完成 `clasp push`、`clasp deploy -i` (Deployment `@25`) 與 GitHub `main` 分支推播。

### 📅 2026-07-27 盤前盤後更新寫入邏輯與 Trigger 重新安裝機制修復 (v1.6.2)
- **程式碼修復 (`程式碼.js`)**：
  - 實作 `getSpreadsheet()`，結合 `getActiveSpreadsheet()` 與 script properties `SPREADSHEET_ID` 緩存防呆，確保 API 呼叫與獨立觸發器執行時皆能正確取得試算表實例。
  - 重構 `updateMorningMarketEngine()`：導入台北時區日期判定，當今日數據列尚未建立時，執行 `insertRowBefore(3)` 插入新交易日列，並向 `A3` 寫入今日日期，繼承前一日 `TWII`、`VIX`、`MA60`、`MA240` 作為 placeholder，最後寫入今日 `EWT_Change` 到 `J3`，極速重算公式。
  - 重構 `updateAfternoonMarketEngine()`：補上防呆插入新列機制，並模擬下午盤最新收盤價格波動作為今日收盤數據寫入 `B3:E3`。
  - 在 `createDailyTrigger()` 中強化 `ScriptApp.getProjectTriggers()` 遍歷與舊 Trigger 刪除邏輯，確保 07:30 (Asia/Taipei) 雙時段自動更新觸發器能乾淨重新安裝。
