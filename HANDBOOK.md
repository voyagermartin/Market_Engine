# HANDBOOK.md (v1.6.7)

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
- `testMarketOpenStatus()`: 整合休市日判定與 Gemini API 連線自我診斷及可用模型清單獲取的測驗彈窗
- `getSpreadsheet()`: 取得或開啟當前試算表實例，整合 `getActiveSpreadsheet()` 與 `PropertiesService` 的 `SPREADSHEET_ID` 備份機制，防止自動觸發器執行時回傳 null
- `setupMarketEngineV3()`: 高效能主初始化建置函式（< 2 秒極速建置防逾時）
- `setupSheet()`: 取得/建立分頁，執行 `sheet.clear()` 徹底清除舊欄位殘留，並執行 `breakApart()` 防止合併衝突 Exception
- `setHeaderBanner()` / `setTableHeader()`: 統一繪製分頁第 1 列白話文說明與標題欄位
- `buildThresholdConfigSheet()`: 建立純門檻對照矩陣，動態連動 P10/P25/P75/P90 歷史分位數 (Single Source of Truth)
- `buildRawHistorySheet()`: 建立基礎數據表結構 (包含 J 欄 EWT_Change 夜盤漲跌%)
- `applyRawHistoryFormulas()`: 按實體數據列數高效批次寫入四項計算公式與 EWT 格式化
- `seedInitialData()`: 寫入初始化標準數據種子 (預設載入 2008~2026 18年完整歷史數據 ~4,840 交易日)
- `seedFullHistoricalData()`: 擴展載入 2008~2026 18年完整歷史數據 (~4,840 交易日) 並連動刷新 `LAB_BACKTEST`
- `applyHistoryLogFormulas()`: 歷史日誌公式批次擴展寫入（含修復版 IFS 5位階對稱判定與 1 年期前瞻報酬率算式）
- `buildLabBacktestSheet()`: 建立 1 年期前瞻報酬率與勝率統計回測表 (含修復版 `>= -1` 勝率分母篩選算式)
- `buildDashboardSheet()`: 建立日常觀察卡片、今日位階判定、趨勢動能燈號、明天定期定額扣款決策卡與 AI 顧問單一值班卡片
- `buildDecisionLogSheet()`: 建立去金流化純策略檢討紀錄模板
- `generateMorningNavigation()`: 老巴盤前 AI 導航腳本 (讀取 `MARKET_ENGINE_GEMINI_API_KEY` 金鑰，連動 isMarketOpen，休市日自動注入夜盤/VIX焦點 Prompt)
- `generateAfternoonNavigation()`: 小羅盤後 AI 導航腳本 (讀取 `MARKET_ENGINE_GEMINI_API_KEY` 金鑰，連動 isMarketOpen，休市日自動注入情緒/觀察焦點 Prompt)
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
  - 專用模型: `gemini-flash-latest`
  - 輸出位置: `DASHBOARD` `B23` (老巴早餐卡片) 與 `HISTORY_LOG` 第 3 列 J 欄 (`AI_Morning_Story`)
- **小羅盤後 AI 導航 (generateAfternoonNavigation)**:
  - 專用模型: `gemini-flash-latest`
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
v1.6.7 全面完成 MARKET LAB 18年歷史回測天數與勝率統計修復。

## ⑩ Current Version
v1.6.7 (MARKET LAB 18年歷史回測與勝率統計修復版)

## ⑪ Roadmap
- Milestone 1: 試算表基礎架構�- **目前停止位置**: v1.6.7 全面完成 MARKET LAB 18年歷史回測與勝率統計修復！
- **下一步施工位置**: 系統維護完成，等待下一步功能擴充或日常盤前/盤後維護。

---
## ⑫ 開發日誌 (Development Log)

### 📅 2026-07-26 全站架構升級、休市連動、品牌人設與護眼體驗完整發布 (v1.1.0 ~ v1.6.1)
- **核心架構與 AI 導航升級 (v1.1.0 ~ v1.4.2)**：
  - 新增「若明天要執行定期定額扣款」DCA 決策卡 (`B20`) 與動態買進/觀望邏輯。
  - 安裝每日 07:30 (老巴盤前) 與 14:30 (小羅盤後) 雙時段自動觸發器 (`createDailyTrigger`)。
  - 升級 `generateMorningNavigation()` 與 `generateAfternoonNavigation()`，100% 對齊 V3 Database Schema，從 RAW_HISTORY 實體列取數，連動 Single Source of Truth 位階並雙向備份至 HISTORY_LOG (`J3` / `K3`)。
  - 修正舊觸發器別名 `updateDailyMarketEngine()` 指向盤後更新，徹底解決雲端報錯；網頁端加入正則批題去重，排版更流暢。
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
  - 將 Gemini API 金鑰名稱從 `MARKET_WEB_GEMINI_API_KEY` 更名為 `MARKET_ENGINE_GEMINI_API_KEY`，確保對齊使用者現有之專案屬性設定。
- **部署**：全數完成 `clasp push`、`clasp deploy -i` (Deployment `@27`) 與 GitHub `main` 分支推播。

### 📅 2026-07-27 Web App API 存取權限與跨域存取問題修復 (v1.6.3)
- **設定與部署修復 (`appsscript.json`)**：
  - 於 `appsscript.json` 中配置 `"webapp"` 屬性，指定 `"executeAs": "USER_DEPLOYING"` 與 `"access": "ANYONE_ANONYMOUS"`。
  - 解決之前因為未明確認證權限，導致 API 回傳 Google Drive 權限錯誤網頁（找不到網頁），進而使前端網頁無法執行 JSONP 回呼（使得資料日期一直卡在 7/24 舊數據）的問題。
- **部署**：全數完成 `clasp push -f` 覆寫 manifest、`clasp deploy -i` (Deployment `@28`) 與 GitHub `main` 分支推播。

### 📅 2026-07-27 Gemini 2.0 Flash 升級與連線自我診斷強化 (v1.6.4)
- **模型升級**：將 Google Sheet 及 GAS 中老巴和小羅 AI 導航專用模型，以及自我測試 API 連線的模型，全面升級至最新且更快的 `gemini-2.0-flash` 模型。
- **自我診斷與模型探索**：重構 `testMarketOpenStatus()`，在 Gemini API 連線失敗時，新增自動呼叫 models API 取得可用模型清單，並於 UI 彈窗詳細呈現，以便管理員即時定位與診斷。
- **部署**：完成 `clasp push` 與 Git 提交推送至 GitHub。

### 📅 2026-07-27 Gemini 穩定版模型切換防禦 429 錯誤 (v1.6.5)
- **模型切換**：因應全新產生的 `AQ.` 前綴 API 金鑰在存取 deprecated / preview 版 `gemini-2.0-flash` 時會被系統強制限制 quota (429 錯誤)，而 `gemini-flash-latest` 可正常運作的特性，將程式碼中所有正式的生成端點統一改為 `gemini-flash-latest`。
- **程式碼修復**：同步更正 `testGeminiAPI()` 中的 `gemini-1.5-flash` 為 `gemini-flash-latest` 以排除 v1beta API 下 404/429 錯誤。
- **部署**：完成 `clasp push` 與 Git 提交推送至 GitHub。

### 📅 2026-07-27 MARKET LAB 歷史回測天數與勝率統計修復 (v1.6.7)
- **位階判定 IFS 重構**：重構 `HISTORY_LOG` F 欄位階判定邏輯，將 T5 (狂熱) 與 T4 (過熱) 擺放在 T3 (順風/中性) 之前判定，徹底消除因過度寬鬆之中性邏輯將過熱/狂熱天數攔截導致天數與實際分布不符的問題。
- **Google Sheets 勝率算式修復**：將 `LAB_BACKTEST` 第 E 欄 1年期勝率分母篩選條件從 `HISTORY_LOG!$I$3:$I, "<>"` 替換為 `HISTORY_LOG!$I$3:$I, ">= -1"`，排除近期未滿一年之 `""` 空字串導致的勝率分母虛胖。
- **數據載入對齊**：將 `seedInitialData` 預設生成範圍直接擴展至 `2008-01-02` ~ `2026-07-24` (~4,840 交易日)，並於 `seedFullHistoricalData` 中連動觸發 `buildLabBacktestSheet`，確保回測與勝率統計完美對齊 18 年歷史全貌。
- **部署**：完成 `clasp push` 與 Git 提交推送至 GitHub。

---
## ⑬ 待修與待辦事項 (Pending Issues)
- **無 (All Bugs Resolved & System Fully Operational)**orningMarketEngine` 與 `updateAfternoonMarketEngine` 觸發器會被乾淨清除後重新安裝 07:30 / 14:30 雙觸發器。
      - **更名金鑰屬性**：將 API Key 屬性設定名稱更名為 `MARKET_ENGINE_GEMINI_API_KEY`，確保對齊使用者現有環境。
  12. **Web App API 存取權限與跨域存取問題修復 (v1.6.3)**：
      - 於 `appsscript.json` 中配置 `"webapp"` 屬性，指定 `"executeAs": "USER_DEPLOYING"` 與 `"access": "ANYONE_ANONYMOUS"`。
      - 解決之前因為未明確認證權限，導致 API 回傳 Google Drive 權限錯誤網頁（找不到網頁），進而使前端網頁無法執行 JSONP 回呼（使得資料日期一直卡在 7/24 舊數據）的問題。
  13. **Gemini 2.0 Flash 升級與連線自我診斷強化 (v1.6.4)**：
      - **模型升級**：將 `程式碼.js` 中所有 API 端點之模型從 `gemini-1.5-flash` 升級為 `gemini-2.0-flash`。
      - **連線診斷**：重構 `testMarketOpenStatus()` 測試連線邏輯，若連線失敗則自動呼叫可用模型清單端點獲取可用模型清單，並回傳顯示於 UI 彈窗中，提高錯誤診斷的能見度。
  14. **Gemini API 穩定版模型切換以防禦 429 錯誤 (v1.6.5)**：
      - **端點變更**：將 `generateMorningNavigation`、`generateAfternoonNavigation` 及 `testGeminiAPI` 中所調用的 `gemini-2.0-flash` 及 `gemini-1.5-flash` 統一更換為官方最新的穩定版別名 `gemini-flash-latest`。
      - **連線優化**：解決全新 API 金鑰（`AQ.` 前綴）在免費層級存取 deprecated/preview 版 2.0 模型時，遭遇 HTTP 429 配額限制的問題。
  15. **回測天數錯誤註記 (v1.6.6)**：
      - **問題現象**：於待修事項中詳細記錄 `LAB_BACKTEST` 歷史天數與勝率統計錯誤問題，以利晚間開工後快速定位修復。
- **目前停止位置**: v1.6.6 歷史回測天數與勝率統計錯誤註記完成，等待晚間開工修復。
- **下一步施工位置**: 深入檢視 `buildLabBacktestSheet()` 或 `applyHistoryLogFormulas()` 內的前瞻報酬率與勝率統計公式/資料範圍，修正日數計算邏輯。

---
## ⑫ 開發日誌 (Development Log)

### 📅 2026-07-26 全站架構升級、休市連動、品牌人設與護眼體驗完整發布 (v1.1.0 ~ v1.6.1)
- **核心架構與 AI 導航升級 (v1.1.0 ~ v1.4.2)**：
  - 新增「若明天要執行定期定額扣款」DCA 決策卡 (`B20`) 與動態買進/觀望邏輯。
  - 安裝每日 07:30 (老巴盤前) 與 14:30 (小羅盤後) 雙時段自動觸發器 (`createDailyTrigger`)。
  - 升級 `generateMorningNavigation()` 與 `generateAfternoonNavigation()`，100% 對齊 V3 Database Schema，從 RAW_HISTORY 實體列取數，連動 Single Source of Truth 位階並雙向備份至 HISTORY_LOG (`J3` / `K3`)。
  - 修正舊觸發器別名 `updateDailyMarketEngine()` 指向盤後更新，徹底解決雲端報錯；網頁端加入正則批題去重，排版更流暢。
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
  - 將 Gemini API 金鑰名稱從 `MARKET_WEB_GEMINI_API_KEY` 更名為 `MARKET_ENGINE_GEMINI_API_KEY`，確保對齊使用者現有之專案屬性設定。
- **部署**：全數完成 `clasp push`、`clasp deploy -i` (Deployment `@27`) 與 GitHub `main` 分支推播。

### 📅 2026-07-27 Web App API 存取權限與跨域存取問題修復 (v1.6.3)
- **設定與部署修復 (`appsscript.json`)**：
  - 於 `appsscript.json` 中配置 `"webapp"` 屬性，指定 `"executeAs": "USER_DEPLOYING"` 與 `"access": "ANYONE_ANONYMOUS"`。
  - 解決之前因為未明確認證權限，導致 API 回傳 Google Drive 權限錯誤網頁（找不到網頁），進而使前端網頁無法執行 JSONP 回呼（使得資料日期一直卡在 7/24 舊數據）的問題。
- **部署**：全數完成 `clasp push -f` 覆寫 manifest、`clasp deploy -i` (Deployment `@28`) 與 GitHub `main` 分支推播。

### 📅 2026-07-27 Gemini 2.0 Flash 升級與連線自我診斷強化 (v1.6.4)
- **模型升級**：將 Google Sheet 及 GAS 中老巴和小羅 AI 導航專用模型，以及自我測試 API 連線的模型，全面升級至最新且更快的 `gemini-2.0-flash` 模型。
- **自我診斷與模型探索**：重構 `testMarketOpenStatus()`，在 Gemini API 連線失敗時，新增自動呼叫 models API 取得可用模型清單，並於 UI 彈窗詳細呈現，以便管理員即時定位與診斷。
- **部署**：完成 `clasp push` 與 Git 提交推送到 GitHub。

### 📅 2026-07-27 Gemini 穩定版模型切換防禦 429 錯誤 (v1.6.5)
- **模型切換**：因應全新產生的 `AQ.` 前綴 API 金鑰在存取 deprecated / preview 版 `gemini-2.0-flash` 時會被系統強制限制 quota (429 錯誤)，而 `gemini-flash-latest` 可正常運作的特性，將程式碼中所有正式的生成端點統一改為 `gemini-flash-latest`。
- **程式碼修復**：同步更正 `testGeminiAPI()` 中的 `gemini-1.5-flash` 為 `gemini-flash-latest` 以排除 v1beta API 下 404/429 錯誤。
- **部署**：完成 `clasp push` 與 Git 提交推送至 GitHub。

### 📅 2026-07-27 MARKET LAB 歷史回測天數與勝率統計錯誤註記 (v1.6.6)
- **待辦紀錄**：記錄 `LAB_BACKTEST` 中 18年歷史回測天數與勝率統計有明顯錯誤的問題（各分類日數總和與真實歷史不符），移至待修事項，留待晚間進一步除錯。
- **部署**：完成 `clasp push` 與 Git 提交推送至 GitHub。

---
## ⑬ 待修與待辦事項 (Pending Issues)
- **MARKET LAB 18年歷史回測日數與勝率統計錯誤** (v1.6.6 待修)：
  - **問題現象**：`LAB_BACKTEST` 歷史回測與勝率統計中，各個市場位階對應的「歷史天數 (Count)」有明顯錯誤（例如：極度恐慌為 158 天，恐慌為 167 天，與 18年 ~4,500 交易日之真實分布不符）。
  - **預期修復**：待晚間重新開工後，深入檢視 `buildLabBacktestSheet()` 或 `applyHistoryLogFormulas()` 內的前瞻報酬率與勝率統計公式/資料範圍，修正日數計算邏輯。


### 📅 2026-07-27 全歷史 18 年交易日數據精準度檢討與待解決紀錄 (v1.7.1 暫停觀察狀態)
- **現狀問題紀錄 (Issue Note)**：
  - 用戶抽查 RAW_HISTORY 中的歷史收盤價，發現部分歷史交易日數值仍有偏差（例如 2026-05-13 實體收盤為 41,374.50，表內顯示 44,316.74；2026-05-12 實體收盤為 41,898.32；2026-07-20 實體收盤為 42,449.70）。
  - 用戶指示暫停修改，將此現狀完整記錄於 HANDBOOK 中，留待後續與團隊/專家共同研討最佳歷史數據導入與驗證方式（如原生 GOOGLEFINANCE 批量載入或官方歷史 CSV 匯入）。
- **當前停止位置 (Current Checkpoint)**：v1.7.1 全歷史數據精準度檢討與狀態紀錄完成，暫停施工。
