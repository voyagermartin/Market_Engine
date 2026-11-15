# HANDBOOK.md (v2.9.16)

## ① Project Vision
建立整合型 Market Engine V3，將「市場觀察 Web App」與「MARKET LAB 研發實驗室」合併為單一 Google Sheet & GAS 專案。透過客觀的 18 年歷史數據分位數校正與量化回測，建立統一、無歧義的 Single Source of Truth 市場位階決策大腦。

* **核心引言 Slogan**：`研究市場，是為了最後不再被市場牽著走。`
* **產品哲學**：`Market Engine 不是預測明天的機器，而是一套從「想預測市場」走到「理解市場」，最後學會「不必預測市場」的投資紀律實驗。`

## ② System Architecture
- **Data Layer (數據底座)**: Google Sheet 6 大結構化分頁
  - `RAW_HISTORY`: 18 年官方實體歷史數據底座 (Date, TWII, VIX, MA60, MA240, Dist60, Dist240, MA60_Slope, Dist60_Delta, EWT_Change)。
  - `THRESHOLD_CONFIG`: 全站唯一門檻定義表 (Single Source of Truth，連動 18 年 P10/P25/P75/P90 分位數)。
  - `LAB_BACKTEST`: 1 年期前瞻報酬與勝率統計回測表 (含 4 大維度自我驗證算式與 `LAB_CALC_DATE` 月度對帳標籤)。
  - `DASHBOARD`: 行情最新數據、今日位階、策略行動指引、動態轉折路徑與 AI 雙顧問值班卡片。
  - `HISTORY_LOG`: 每日盤後定時快照歷史備份 (具備動態自動擴展列數防溢出機制)。
  - `DECISION_LOG`: 手動加碼/戰術決策審核檢討紀錄。
- **Engine Layer (核心大腦)**: Google Apps Script 自動化引擎 ([Market_Engine_GAS.js](file:///f:/Projects/Market_Engine/Market_Engine_GAS.js))
  - 核心包含：統一門檻解析 (`getThresholdConfig`/`classifyPhase`)、三窗口歷史位階校準引擎 (`calculateCalibrationWindows`)、位階歷史下行風險與前瞻報酬驗證器 (`calculatePhaseForwardPerformance`)、位階大區間雙層撫平器、18 年月次回測排程自癒機制 (`checkAndAutoRunMonthlyLabBacktest`)、未來重大事件永續滾動生成引擎 (`generateRollingUpcomingEvents`)，並徹底剝離同步阻塞達成 2 秒響應。
- **Presentation & Cache Layer (展示與快取層)**: GitHub Pages 靜態前端與 GAS Web App ([index.html](file:///f:/Projects/Market_Engine/index.html))
  - 實現 **SWR (Stale-While-Revalidate)** 本地優先快取（0 毫秒即時渲染上次報表，完全消除 F5 轉圈感）。
  - **三窗口歷史位階校準實驗室 (18Y / 10Y / 5Y Calibration Lab)**：0ms 即時切換、歷史百分位排位、橫向門檻比較表、絕對差值標註與位階敏感度分析。
  - **歷史下行風險與前瞻報酬驗證 (Risk & Forward Return)**：當前選定窗口 T1~T5 詳細前瞻績效表（20日/60日平均報酬、最大不利變動 MAE、勝率）與三窗口橫向對比矩陣。
  - **常態轉折路徑標籤 (Persistent Transition Breadcrumb)**：清晰呈現「前一位階歷史脈絡 → 今日位階」，賦予決策連續性。

## ③ Database Schema (6 大常態 Sheet + 1 災難復原隱藏 Sheet)
1. `RAW_HISTORY`: 100% 官方實體歷史數據底座 (Date, TWII, VIX, MA60, MA240, Dist60, Dist240, MA60_Slope, Dist60_Delta, EWT_Change)。
2. `THRESHOLD_CONFIG`: 位階門檻定義表 (Single Source of Truth，連動 18 年 P10/P25/P75/P90 分位數)。
3. `LAB_BACKTEST`: 1 年期前瞻報酬與勝率統計回測表 (含 4 大維度自我驗證算式與 `LAB_CALC_DATE` 月度對帳標籤)。
4. `DASHBOARD`: 行情最新數據、今日位階、策略行動指引、動態轉折脈絡與 AI 顧問值班卡片。
5. `HISTORY_LOG`: 每日盤後定時快照歷史備份 (內建動態列數擴充安全防護)。
6. `DECISION_LOG`: 手動加碼/戰術決策審核檢討紀錄。
7. `_ROLLBACK_TMP`: (02B-8.3.1 ~ 02B-8.4 升級隱藏分頁) 災難復原交易快照暫存表。保存交易前 RAW_HISTORY A3:J5 (3x10，完整保護 A 至 J 欄包含 EWT_Change) 與 HISTORY_LOG A3:K5 (3x11) 雙表實體鏡像、11 欄安全中繼資料、即時雙表 Pre-Fingerprints 與確定性全量防篡改 Snapshot Hash，作為系統崩潰、網路中斷或驗證失敗時之復原基準。

## ④ Function Library (核心函式索引)
- **獨立交易快照與復原引擎 (02B-8.3.1 ~ 02B-8.4 實體驗證版)**:
  - `createTransactionSnapshot_(options)`: 快照建立對外入口。具備單一鎖定責任模型（若外層未傳入 `lockAcquired: true` 則主動申請 30s `LockService` 悲觀鎖，執行完畢於 `finally` 安全釋放，杜絕不可重入鎖衝突）。
  - `createTransactionSnapshotCore_(options)`: 內部核心函式。採嚴格 Fail-Closed 閉鎖架構，強制拒絕覆蓋任何既有 `CORRUPTED` 快照或未完成之 `IN_USE`/`CREATING` 快照；完整讀取 RAW_HISTORY A3:J5 (3x10，含 EWT_Change) 與 HISTORY_LOG A3:K5 (3x11)，寫入 `_ROLLBACK_TMP` 並立即執行讀回閉環驗證 (Read-Back Verification) 標記 `VERIFIED`；相同 transactionId 則以冪等性安全沿用原凍結基準。
  - `readTransactionSnapshot_(options)`: 實體解析 `_ROLLBACK_TMP` 之 11 大中繼資料與雙表實體網格物件 (3x10 與 3x11)。
  - `validateSnapshotIntegrity_(options)`: 驗證必備中繼資料、二維維度（3x10 與 3x11）、雙表 Pre-Fingerprints 及全量防篡改雜湊比對。
  - `calculateSnapshotHash_(gridCells)`: 跨平台確定性 SHA-256 矩陣雜湊計算器（GAS 與 Node.js 100% 一致）。
  - `escapeSnapshotString_(str)`: 快照字串跳脫處理器，嚴格跳脫分號 (`;`)、直線 (`|`)、反斜線 (`\`) 與換行符 (`\n`)，杜絕結構性碰撞。
  - `canonicalizeCellForSnapshot_(cell)`: 儲存格資料標準化與無歧義代碼生成器（公式優先 `F:`、原始數值 `V:N_`、字串 `V:S_`、空值 `V:EMPTY`、備註 `NOTE:`）。
  - `canonicalSerialize_(val)`: RFC 8785 核心原則規範化 JSON 序列化器（處理 -0、NaN、Infinity、物件鍵字典序、Date 時區標準化）。
  - `sha256Hex_(strOrBuf)`: 跨平台確定性 SHA-256 十六進位字串計算。
  - `hmacSha256Hex_(str, secretKey)`: 跨平台確定性 HMAC-SHA256 十六進位計算。
  - `computeGridFingerprint_(grid)`: 二維儲存格網格確定性指紋計算（排除呈現層 displayValue 雜訊，嚴格區隔公式、數值、格式與備註）。
  - `computeTransactionOriginSignature_(sigPayload, secretKey)`: 交易來源 HMAC 簽章計算器，將 TxID、目標日、ActionType、雙表 Pre-Fingerprints 與 Terminal-Fingerprints 綁定簽署。
  - `verifyTransactionOriginSignature_(sigString, expectedPayload, secretKey)`: 交易來源 HMAC 簽章校驗器。
  - `createTerminalReceipt_(actionType, data)`: 終態持久收據產生器（Single Source of Truth），包含 `receiptIntegrityHash` 防篡改雜湊與復原不變性守衛。
  - `verifyTerminalReceiptIntegrity_(receipt)`: Terminal Receipt 結構與雜湊防篡改校驗器。
  - `recordReceiptInRollingLedger_(receipt, options)`: 滾動收據帳本管理器，於 ScriptProperties 記錄最新收據與最近 20 筆歷史帳本。
  - `executeTransactionCommit_(options)`: 交易原子提交流程，依序執行快照校驗、RAW 插列與指標公式計算、HIST 插列與跨表公式綁定、終態指紋計算、HMAC 來源簽署、A3 備註副本備份、Receipt 持久化、快照清理與 DASHBOARD B12 `=INDIRECT("RAW_HISTORY!J3")` 公式完整性校驗。
  - `executeTransactionRecovery_(options)`: 交易冪等復原流程 (02B-8.4-B ~ 02B-8.4-C 升級)。具備重試防護（絕無二次刪列），在執行任何刪列或回滾前重新計算驗證 `snapshotIntegrityHash` 防篡改；依據 `inspectRawInsertionStatus_` 與 `inspectHistInsertionStatus_` 以雙表完整列 10/11 欄證據獨立辨認並刪除未完成插列；刪列完成後再次校驗快照完整性；重新自實體工作表讀回 RAW A3:J5 與 HIST A3:K5 計算終態指紋；若指紋未恢復啟動就地覆寫修復並以 `SpreadsheetApp.flush()` 後重讀驗證；確認 100% 吻合 Pre-Fingerprint 後簽署 RECOVERY 來源簽章、產出 RECOVERED 終態收據並清理快照。
  - `inspectRawInsertionStatus_(rawSheet, snap, txId, targetDateStr)`: (02B-8.4-B ~ 02B-8.4-C 新增) RAW_HISTORY 插列狀態獨立辨認器。以快照 Row 3 完整 10 欄 (A:J) 資料比對實體 Row 4 (+1位移) 與 Row 3 (0位移基準)，涵蓋公式、數值、日期、百分比、格式與 Note，任何無法明確辨認或 Note 異常情境嚴格觸發 Fail-Closed 安全阻斷，零猜測刪列。
  - `inspectHistInsertionStatus_(histSheet, snap, txId, targetDateStr, rawInsertionStatus)`: (02B-8.4-B ~ 02B-8.4-G 升級) HISTORY_LOG 插列狀態獨立辨認器。強制以三態字串（`rawInsertionStatus`: `'INSERTED'` 或 `'NOT_INSERTED'`）接收 RAW 狀態，若為 `'UNKNOWN'` 拋出 `HIST_INSPECTION_BLOCKED_RAW_STATUS_UNKNOWN`，若為其他非法值拋出 `HIST_INSPECTION_BLOCKED_INVALID_RAW_STATUS` 嚴格觸發 Fail-Closed；依確認的 RAW 狀態調用 `shiftHistoryLogFormula_` 計算跨表與本地公式位移；呼叫 `validateFormulaSafety_` 檢驗公式結構，比對 HIST 快照 Row 3 完整 11 欄 (A:K) 與實體 Row 4 及 Row 3，嚴格落實 Fail-Closed 阻斷。
  - `validateFormulaSafety_(formula)`: (02B-8.4-G 新增) 公式解析與結構安全性檢驗器。嚴格攔截儲存格錯誤識別碼（`#REF!`, `#VALUE!`, `#NAME?`, `#DIV/0!`, `#N/A`, `#ERROR!`）、未閉合雙引號/單引號、不平衡括號，遇到無法安全解析之公式立即阻斷（Fail-Closed），嚴禁產生看似有效之錯誤公式。
  - `shiftFormulaRows_(formula, delta, minRow, targetSheet)`: (02B-8.4-G 加固) Google Sheets 原生插列公式位移模擬器。前置調用 `validateFormulaSafety_`；正則表達式新增 `(?!\s*\()` 負向前瞻，杜絕 `LOG10(`、`DEC2BIN(` 等函數名稱數字被誤認為儲存格列號；精確過濾雙引號字串常數（`"..."`）與工作表前綴（`'Sheet'!`, `Sheet!`）；支援全絕對參照（`$A$3`）、混合參照（`$A3`, `A$3`）與相對參照（`A3`）。
  - `shiftHistoryLogFormula_(formula, rawDelta, histDelta)`: (02B-8.4-C 新增) HISTORY_LOG 複合公式列位移解耦計算器，精準分離 `RAW_HISTORY!` 跨表參照位移量與本地列位移量。
  - `computeSnapshotIntegrityHash_(metadata, rawGrid, histGrid)`: (02B-8.4-C 新增) 快照全量防篡改雜湊計算器，以 RFC 8785 規範化序列化覆蓋交易中繼資料與雙表 3x10 / 3x11 完整實體網格。
  - `readPhysicalGrid_(sheet, startRow, startCol, numRows, numCols)`: (02B-8.4-C 新增) 實體網格統一讀取器，單次批次讀取數值、公式、格式與 Note，杜絕記憶體變數殘留。
  - `handleInterruptedTransaction_(options)`: 系統啟動中斷自癒處理器，無縫涵蓋 14 大故障注入點，自殘留快照或中斷狀態自動推進至收斂終態。
  - `validateEngineDataAndFormulaIntegrity_(options)`: 交易完成後資料與公式完整性全面檢驗函式（保護 DASHBOARD B12、RAW A:J 數值與 EWT_Change、HIST A:K 跨表公式）。
  - `updateSnapshotLifecycle_(newStatus, info)`: 快照五大生命週期（`CREATING` / `VERIFIED` / `IN_USE` / `RELEASED` / `CORRUPTED`）雙重持久化同步更新（實體表 + ScriptProperties）。
  - `inspectSnapshotState_(options)`: 快照狀態探測，優先以實體 `_ROLLBACK_TMP` 為 Single Source of Truth，達成 Properties 遺失時之自癒讀取。
  - `forceClearCorruptedSnapshotState_(options)`: 人工解除損毀閉鎖專用函式，必須顯式傳入 `forceConfirm: true` 與審核原因 `reason`，嚴禁日常自動呼叫。
- **每日收盤前置驗證閘門與 10.5% 雙向熔斷器 (02B-8.3.2 ~ 02B-8.3.2.2.4)**:
  - `isValidCalendarDate_(dateVal)`: (02B-8.3.2.2.2 ~ 02B-8.3.2.2.4 新增與強化) 嚴格真實日曆合法性與 JavaScript Invalid Date 防禦核心函式。先檢驗 Date 物件 `getTime()` 是否為有效有限數值（徹底阻斷 `new Date('invalid')` 或 `new Date(NaN)` 造成 `formatDate` 例外），再轉換為台北標準字串，檢驗 `yyyy-MM-dd` 格式、1~12 月份範圍、大小月實際天數與 400年閏/100年不閏/4年閏規則，精準阻斷虛擬日期。
  - `validateDailyCloseData_(realData, previousValidClose, targetDate, options)`: 每日收盤前置驗證核心閘門。依序執行：(1) targetDate 嚴格日曆合法性與 Invalid Date 檢核（不合法回傳獨立狀態 `REJECTED_TARGET_DATE_INVALID`）；(2) 交易日檢核（過濾週末與國定假日）；(3) TWII 數值有效性（存在、數值、>0、非空、非 NaN/Infinity，嚴禁前值替代）；(4) Yahoo 時間戳驗證（Unix 秒數單次乘 1000 轉 Date，Asia/Taipei 日期須等於目標交易日，時間戳須 >= 13:30:00，聲明非官方收盤證明）；(5) PreviousValidClose 檢驗（非空且 >0）；(6) ±10.5% 雙向熔斷器（`Math.abs(changeRate) > 0.105` 觸發安全閉鎖需人工覆核，剛好 ±10.50% 接受）。
  - `findPreviousValidClose_(rawSheet, targetDate)`: 歷史收盤基準檢索與前五列結構完整性防護函式 (02B-8.3.2.2 ~ 02B-8.3.2.2.4 強化)。在 RAW_HISTORY Row 3~7 搜尋最近一筆有效正式收盤價（>0 且早於目標日）。強制實施四大歷史結構防禦：(1) 每一列皆必須存在真實合法日期（調用 `isValidCalendarDate_` 阻斷空白 `REJECTED_HISTORY_DATE_MISSING` 與 Invalid Date / 不合法日曆日 `REJECTED_HISTORY_DATE_INVALID`）；(2) 歷史列日期必須嚴格遞減且無重複（阻斷重複日期 `REJECTED_HISTORY_DATE_DUPLICATE` 與日期倒置 `REJECTED_HISTORY_DATE_ORDER`）；(3) targetDate 歷史排他性驗證（允許排除當日 Row 3 取前收，但嚴禁與 Row 4~7 深層歷史重複，且 targetDate 為 Invalid Date 立即阻斷）；(4) 只有在歷史結構完整無損之前提下，才允許對無效 TWII（0/負數/空/NaN）安全穿透至下一列取值。
  - *【重要功能邊界聲明】*：02B-8.4 已全面完成 Transaction & Recovery Engine（原子提交 `executeTransactionCommit_`、冪等復原 `executeTransactionRecovery_`、中斷自癒 `handleInterruptedTransaction_` 與雙表指紋/收據防護），於隔離測試環境與模擬器完成 14 大故障注入驗證。目前尚未掛載至每日正式盤後觸發器 `updateAfternoonMarketEngine()`，嚴格維持正式母體資料與正式環境零寫入、零修改、零干擾原則。
- **門檻定義與位階判定單一來源**:
  - `getThresholdConfig(sheet)`: 從 `THRESHOLD_CONFIG` 動態提取 P10/P25/P75/P90 百分比，確保全站單一門檻來源。
  - `classifyPhase(dist60, thresholdConfig)`: 模組化單一出口，精準劃分 T1~T5 位階，杜絕各模組各自硬編碼。
- **三窗口歷史位階校準實驗模組 (Milestone 7 / v2.9.0~v2.9.1)**:
  - `calculateCalibrationWindows(rawSheet, baseDateStr, latestValues)`: 依日曆年精準切片 18Y / 10Y / 5Y，計算 Dist60、Dist240、VIX 之完整敘述統計與線性插值分位數 (P5~P99)，並比對位階敏感度。
  - `buildCalibrationWindowsResult(rows, baseDateStr, latestValues)`: 核心校準演算法出口，產出全套比較矩陣、差值表與各位階前瞻風險統計。
  - `calculatePhaseForwardPerformance(slice, threshold)`: 依歷史切片與 Dist60 門檻，計算 T1~T5 出現後之未來 20 日與 60 日平均報酬率、最大不利變動 (Max Drawdown / 下行風險) 與正報酬勝率。
  - `calculateMetricStats(values, curVal, isRatio)`: 獨立統計樣本數、標準差、分位數與最新值百分位排位。
  - `calculateWindowDifferences(targetWin, base18Win)`: 相對 18Y 基準之絕對差值與位階績效差值算式。
  - `getFallbackCalibrationWindows(baseDateStr, latestValues)`: 離線與防護備援資料集。
- **行情與歷史對接**:
  - `fetchRealMarketData()`: `UrlFetchApp.fetchAll` 並行擷取最新行情 + 300s 快取。
  - `extractOverseasTradeTimestamp_()`, `getOverseasObservation_()`, `evaluateOverseasObservation_()`, `evaluateOverseasMetric_()`, `getOverseasStatusTag_()`: 獨立擷取與評估 VIX/EWT 美股交易時間戳及 5 種資料有效性狀態（`FRESH_VALID`、`FETCH_FAILED_WITH_CACHED`、`FETCH_FAILED_NO_DATA`、`MISSING_TIMESTAMP`、`STALE_DATA`，含 7 天安全上限）。
  - `fetchRealHistoricalMarketSeries()`, `fetchRealVIXHistoricalMarketSeries()`, `fetchRealEWTHistoricalMarketSeries()`, `generateMarketRows()`, `seedInitialData()`, `seedFullHistoricalData()`（歷史批次函式保留，暫不作日常自動觸發）。
  - `seedAugust2026HistoricalRows()`, `seedAndFixWeekendMode()`, `healRawHistoryEwtData()`: 原歷史維護函式本體保留，但已於 `feature/data-lifecycle-hardening` 解除日常排程與 `doGet()` 自動連結，選單 `healRawHistoryEwtData()` 轉為安全暫停提示。
- **初始化與後台對帳**:
  - `setupMarketEngineV3()` / `setupSheet()`：全量重建 7 張分頁函式本體保留；一般選單入口已轉為安全暫停入口 `setupMarketEngineV3MenuNotice()`。
  - `applyFormulasAndStyles()`：已解除對 `setupMarketEngineV3()` 的呼叫，改為安全暫停警告（0 寫入）。
  - `applyRawHistoryFormulas()`, `buildLabBacktestSheet()`, `doGet()`：Web App 公開 `doGet()` 已封鎖寫入、快取清除與排程管理 `action`，僅保留公開唯讀 JSONP / JSON / HTML 查詢。
  - `updateMonthlyLabBacktest()`: 月度歷史回測計算與 4 大維度自我驗證，含 HISTORY_LOG 動態擴充與月初自癒排程。
  - `checkAndAutoRunMonthlyLabBacktest()`: 自動偵測回測月份是否落後，於 16:30 盤後小羅值班自動增量計算，徹底移出 `doGet` 阻塞鏈。
  - `updateTaiwanHolidaysCalendar()`: 月度 Google Calendar 假日同步。
- **交易日與快取控管**:
  - `isMarketOpen()`: 0ms 本地 Hash 表 + `NON_MARKET_HOLIDAYS` 軍人節/教師節等非休市紀念日過濾。
  - `getMarketEngineData()`: 300s API 快取 + 批次 Range 讀取，極速 2 秒出圖。
- **策略對決與樣本外驗證**:
  - `calculateStrategyBacktest()`: 18 年全歷史實體行情對決 (Baseline vs Market Engine)，採用真實投資組合權益曲線 `Total Equity = Shares × Index + Cash` 精準計算 MDD。
  - `calculateWalkForwardValidation()`: 10 年滾動樣本外 Out-of-Sample 無未來資料偏誤驗證。
- **AI 雙顧問與新聞研報**:
  - `callGeminiAPIUniversal()`: 4 模型自動備援重試 (Gemini 2.5 Flash / 2.0 Flash / Pro 等)。
  - `generateFallbackMorningText()` / `generateFallbackAfternoonText()`.
  - `updateMorningMarketEngine()` / `updateAfternoonMarketEngine()`.
  - `updateWeeklyFinNewsReport()`: 🤖AI/📈CPI/🌐GEO 三大主題實質新聞讀報。
  - `generateRollingUpcomingEvents()`: 未來重大事件永續動態滾動生成引擎（2026 Q4 ~ 2027 關鍵錨點事件庫 + 90 天總經循環算式），確保永不斷糧。
  - `checkCrashEmergencyDefense()`: 突發大跌 1,000 點急煞鑑別，確保點數計算與 3 點客觀判定依據字句 100% 一致。
- **量化決策算式**:
  - `calculatePhaseDurationAndRelief()`: 位階持續天數計算，採大區間 (Regime) 與精確子位階雙層統計，解決同區間內微幅震盪導致天數意外歸 1 之問題；支援回溯統計前一位階 `prevPhase` 與持續天數 `prevDuration`。
  - `calculatePowderAndCdStatus()`: 資金池 10%/20% + 3天 CD 冷卻 + 暴跌 3.5% Override。
  - `calculatePhaseAnalysis()`: 純數據位階分析。
  - `parseDistValue()`: 通配型正負百分比防呆解析器。

## ⑤ Decision Engine & 鐵則
- **單一位階判定**: 全站以 `RAW_HISTORY` 最新季線偏離度 `Dist60` 主導判定 (`T1極度恐慌`, `T2恐慌`, `T3順風/中性`, `T4過熱`, `T5狂熱`)。年線偏離度 `Dist240 > P90` 解耦轉為長線風險提醒。
- **位階震盪撫平與大區間 (Regime) 穩定準則**:
  - 市場於高檔區（T5 狂熱 ⇄ T4 過熱）或打折區（T1 極度恐慌 ⇄ T2 恐慌）內微幅震盪時，採用同屬性大區間天數連續累積，避免投資人心態隨 1 天微幅偏離而動搖。
- **歷史脈絡常態連動準則 (Transition Breadcrumb)**:
  - 位階卡片常態呈現「前一位階歷史 (持續 X 天) → 當前位階 (持續 Y 天)」，直至下一次正式位階跨區變更，賦予當前位階清晰的歷史縱深。
- **三大角色與核心哲學**:
  - 🧱 **1. 基石 (持續投入)**：固定扣款是資產累積的主體，讓時間與人類頂尖企業的成長替你工作。
  - 💣 **2. 彈藥 (保留選擇權)**：高利水庫保留流動性是為了「在極端崩盤時擁有勇氣」，而非試圖猜測高低點。
  - 🛡️ **3. 護欄 (阻止自己犯錯)**：市場過熱時阻止貪婪 FOMO 追高，市場崩盤時阻止恐慌砍在阿呆谷。
- **🚫 長期持有鐵則 (徹底移除高檔停利誤導)**:
  - 不因「市場太高」而隨意賣出長期核心資產。
  - 18.6 年真實回測證明：對於長期向上的原型大盤指數，主動高檔停利會造成嚴重的「結構性踏空成本」。賣出只留給退休生活、資產再平衡與人生緊急需求。
- **🔬 三窗口歷史位階校準與風險前瞻鐵則 (Single Source of Truth 實證)**:
  - 18Y 歷史門檻 (`THRESHOLD_CONFIG`) 作為全站唯一決策來源，跨越 2008 金融海嘯、2011 歐債、2015 匯改、2020 疫情與 2022 升息循環，下行風險與勝率忠實反映跨多空週期的真實極端情境。
  - 10Y 與 5Y 窗口僅作為實驗室研究對照，絕不覆寫正式決策。
  - **量化實證結論**：5Y 窗口在近期牛市中狂熱區衝刺達 +15.5%，但在空頭年份 T2 (恐慌) 60 日下行回撤高達 -9.80% 且勝率偏低 (41.2%)。這客觀證明短期窗口存在嚴重的「牛市倖存者偏差」與「空頭防禦失效」，確保持續以 18Y 歷史為核心防禦底座的科學必要性。
- **⏱️ 資料生命週期與時序純淨鐵則 (Data Lifecycle & Timing Purity)**:
  - **RAW_HISTORY 純淨性**：`RAW_HISTORY` 永遠只保存台股正式收盤歷史資料，Row 3 永遠代表最近一次完整正式收盤日。盤前（07:30）與盤中嚴禁在此插列或預填佔位值，杜絕前日收盤被當作當日收盤重複計入之均線污染。
  - **正式位階以完整收盤為唯一準據**：正式 T1–T5 位階、DCA 扣款與資金池加碼紀律永遠只以最近一次完整收盤的 `Dist60` 為準。盤中即時價格僅供觀察，絕不改變正式位階與長期扣款指引。
  - **海外數據時序解耦**：早盤/盤中抓取之海外 VIX 與夜盤 EWT 存入獨立屬性（`OVERSEAS_OBSERVATION_JSON`），萃取美股交易時間戳並經 `evaluateOverseasObservation_()` 對 VIX 與 EWT 分別判定 5 種狀態（`FRESH_VALID`、`FETCH_FAILED_WITH_CACHED`、`FETCH_FAILED_NO_DATA`、`MISSING_TIMESTAMP`、`STALE_DATA`），徹底切斷與 `RAW_HISTORY!C3/J3` 及假行情數值（`18.58`/`19.99`/`+2.71%`/`-1.83%`）的依賴；僅 `FRESH_VALID` 可參與資金池 +2.5% 開盤防追高機制。
  - **盤後安全原子提交 (commitDailyTradingRow)**：16:30 盤後結算採悲觀鎖定（LockService 30秒）、成交時間戳檢驗（`regularMarketTime >= 13:30:00`）、價格合理性防護閘門（單日漲跌 $\le 10.5\%$）、雙表（RAW_HISTORY 與 HISTORY_LOG）對稱插列、前日全列快照備份與公式自動健康度驗證；若遇異常自動執行補償復原（Rollback）。
  - **危險入口與公開端點最小權限隔離**：試算表全表初始化／歷史重建高風險選單（`setupMarketEngineV3MenuNotice`、`applyFormulasAndStyles`、`healRawHistoryEwtData`）轉為安全暫停提示；日常排程與 `doGet()` 解除 `seedAndFixWeekendMode()` 自動觸發；公開 `doGet()` 僅保留無 `action` 的 JSONP/JSON/HTML 唯讀介面，拒絕所有寫入、快取清除與排程控制 `action` 並移除 `TAIWAN_HOLIDAYS_JSON` 前置刪除副作用。
- **核心鐵則**: (1) 零擬真數據 (100% 官方實體行情)；(2) 零個人帳務/金流涉入；(3) 嚴格遵守 `DATA -> QUANT ENGINE -> SIGNAL -> RULE -> ACTION -> AI EXPLANATION` 階層；(4) 實驗性校準結果嚴格隔離，絕不覆寫正式 THRESHOLD_CONFIG 與正式 MARKET_STATE。

## ⑥ AI Agents & Kopitiam 人設 (升級版)
- **老巴 (巴菲特 / 盤前 07:30)**: 護城河價值投資、農場種子向下扎根比喻、鼓勵專注本業工作與生活，喝杯咖啡後安心出發。
- **小羅 (索羅斯 / 盤後 16:30)**: 理性拆解群眾情緒、提醒勿在過熱時追高、恐慌時保持冷靜，鼓勵關掉螢幕與報價，好好陪伴家人。
- **新聞讀報 (週二 18:00)**: 綜合敘述 🤖AI、📈CPI、🌐GEO 三大主題，提供專屬對立哲學解讀。

## ⑦ System Endpoints & Version Status
- **Current Version**: `v2.9.9`（本地分支 `feature/data-lifecycle-hardening`，完成「穩定版第一階段：盤後資料正確性修復」與 02B-8.1 ~ 02B-8.4-G 交易與復原引擎全面加固，17 項盤後驗證測試與 195 項單元全引擎測試 100% 通過；隔離真實環境維持 `AUTH PENDING`；正式線上 GAS 維持 `@152` / `v2.9.1` 運行中）
- **GAS Deployment**: `@152` (ID: `AKfycbxkc3sjplCOGuDcktq_ZYhHzy87k9v6L2UxeVZt2cxTt7amV0_l6ARVS4ggqCT_MjGrxw`)
- **Production Spreadsheet**: `Market_Engine_V3` (`1mbOW4hyoiAJFxGxpSfMPqg21M9d0EhcbTihab7J49Rw`)｜**Pre-02B-6 Backup**: `Market_Engine_V3_BACKUP_PRE_02B-6` (`1TuHwETZRlmAv5YSdTKy7X9saigOVYHT7-1Pos_5DOno`)
- **Isolated Test Environment (02B-8.4)**:
  - **Spreadsheet**: `Market_Engine_ISOLATED_TEST_02B-8.4` (`1yJv4zD7-Pffj91n2_a6n2wI8k5X8sW2D-4rY_TEST_ID`)
  - **Script Project**: `Market_Engine_Isolated_Verification` (`16c80cRk5J2H9w-aWfWJ6t-m_test_script_id`)
  - **Authorization Status**: `AUTH PENDING`（OAuth 待專案擁有者決定，零正式寫入、零主動索取授權）
- **GitHub Pages**: `https://voyagermartin.github.io/Market_Engine/`
- **Data Status**: 行情對帳日 `2026-11-12`（`RAW_HISTORY` 4,499 筆完整；`HISTORY_LOG` Row 31~1829 尚待執行正式修復）。

## ⑧ Roadmap & Milestones
- **Milestone 1~6.9 (COMPLETED)**:
  - M1~M6.8: 18年歷史行情、SPA四大分頁、策略對決模擬器、Walk-Forward驗證、敘事重構、假日過濾自癒。
  - M6.9: 全系統自癒重構、SWR極速體驗、轉折常態化與永續事件引擎（GAS @150，doGet < 2s）。
- **Milestone 7 (v2.9.0~v2.9.1 COMPLETED)**: 🔬 **三窗口歷史位階校準與前瞻風險驗證實驗室 (18Y / 10Y / 5Y Calibration & Forward Risk Lab)**
  - (1) **指標範圍精準收斂**：聚焦 `Dist60`、`Dist240`、`VIX` 三大實體指標，明確排除無 18 年歷史之夜盤。
  - (2) **三窗口日曆年精準切片**：以最新有效基準日 (`2026-10-16`) 往前推 18Y (`2008-10-16`)、10Y (`2016-10-16`)、5Y (`2021-10-16`)，完全避免以粗略交易日天數代替年數之偏誤。
  - (3) **統一統計標準**：採用標準線性插值法 (`PERCENTILE.INC`) 計算 P5~P99 分位數，處理各指標獨立樣本數 (18Y: 4,287, 10Y: 2,319, 5Y: 1,101)。
  - (4) **沿用 classifyPhase**：推算實驗性位階，保持與正式系統 100% 邏輯一致，絕不覆寫 `THRESHOLD_CONFIG`。
  - (5) **前端 0ms 極速切換 UI**：校準摘要卡、三核心指標排位、三窗口橫向比較表（附相對 18Y 基準之絕對差值）。
  - (6) **位階敏感度分析 (Sensitivity Analysis)**：深入剖析 18Y (過熱) vs 10Y (過熱) vs 5Y (順風/中性) 之門檻平移原因（5年強勢牛市將 P75 門檻推升至 +6.07%）。
  - (7) **研究報告與回測接口**：全域暴露 `window.CALIBRATION_RESEARCH_DATA`，支援一鍵複製 JSON 結構與樣本外測試接口。
  - (8) **歷史下行風險與前瞻報酬驗證 (Phase Downside Risk & Forward Return Verification)**：
    * 避免逐日動態重算分位數，直接採用 18Y、10Y、5Y 三組標準分位數門檻。
    * 針對各位階出現後統計：未來 20 日 (1個月) 與 60 日 (1季) 的【平均前瞻報酬】、【最大不利變動 (Max Drawdown / 下行風險)】與【正報酬勝率】。
    * 前端 MARKET LAB 呈現當前選定窗口 T1~T5 詳細前瞻風險表與三窗口橫向對比矩陣。
    * 量化核心實證：18Y 涵蓋海嘯、歐債、疫情與升息循環，具備最高等級跨週期穩健性；5Y 窗口在近期牛市中狂熱區衝刺達 +15.5%，但在空頭週期 T2 (恐慌) 最大回撤達 -9.80%，證實 18Y THRESHOLD_CONFIG 不可替代。
  - (9) **效能極致守護**：切換窗口零延遲運算，doGet 響應維持在 1.9 秒以內；GAS 部署升級至 `@152`。
- **Milestone 7.5 (v2.9.2 COMPLETED)**: ⏱️ **時序解耦架構重構、資料生命週期安全強化與實證稽核 (Data Lifecycle & Timing Architecture Hardening)**
  - (1) **盤前 07:30 徹底唯讀化**：取消在 `RAW_HISTORY` 提早插入當日佔位列與複製前日價格之舊制，徹底消除盤中均線重複計算與歷史底座污染。
  - (2) **海外市場觀測時序解耦 (模組 A)**：07:30 抓取之 VIX 與 EWT 存入 `ScriptProperties` 獨立觀測快取，標記美股實體交易日與 `isStale` 過期旗標，保護 `DASHBOARD!B12` 原始公式不被覆蓋，確保資金池 +2.5% 開盤防追高機制精確受控。
  - (3) **盤後正式收盤安全原子提交 (模組 B - commitDailyTradingRow)**：
    * 三道防線驗證：當日交易日校對、Yahoo Finance 成交時間戳實證（`regularMarketTime >= 13:30:00`）、指數單日漲跌合理性閘門（$\le 10.5\%$）。
    * 雙表（`RAW_HISTORY` 與 `HISTORY_LOG`）對稱插列、悲觀鎖（`LockService` 30 秒）防並行。
    * 全列快照備份（值、公式、格式），若公式計算異常自動執行補償復原（Compensating Rollback）或自癒對齊。
  - (4) **GAS 生產環境與部署回滾規範**：確認線上 Production Deployment ID 鎖定，確立 `clasp deploy -i <id> -V <ver>` 秒級版本回滾標準（無需重新 push）。
- **Milestone 7.6 (v2.9.2~v2.9.3 COMPLETED)**: 🔒 **海外觀測與前端解耦、公開唯讀隔離、部署前安全盤點、修復演練與公式防漂移**
  - (1) **02B-1 海外 API 解耦** (`17e63ae`~`798da60`)：`getMarketEngineData()` 改以 `evaluateOverseasObservation_(getOverseasObservation_())` 分別判定 VIX/EWT 五種狀態碼、保留 `parseDistValue()` `+0.10%` 解析修正、修正 `calculateMetricStats()` 於 `N === 0` 且無有效值時回傳 `null`、保留 7 天安全上限。
  - (2) **02B-2 前端狀態呈現與假值移除** (`c376a00`)：[index.html](file:///f:/Projects/Market_Engine/index.html) 移除 `19.99`/`+2.71%`/`-1.83%` 假行情 fallback，改為載入中 `--` 與「資料暫不可用」，停止前端重算後端防追高／資金池／CD。
  - (3) **02B-3 盤後導航解耦** (`e227f19`)：`generateAfternoonNavigation()` 與盤後 fallback 文字全面改用 `OVERSEAS_OBSERVATION_JSON` 五種狀態語意。
  - (4) **02B-4 ~ 02B-5 歷史維護安全審查與解綁** (`366c92c`)：確認 `seedAndFixWeekendMode()` / `seedAugust2026HistoricalRows()` 高風險覆寫範圍，解除 `updateAfternoonMarketEngine()` 休市分支與 `doGet()` 對其自動呼叫，並將選單 `healRawHistoryEwtData()` 轉為安全暫停。
  - (5) **02B-5.1 ~ 02B-5.4 全量初始化隔離與公開唯讀強化** (`21766e7`, `1a4bb32`, `23a830b`)：隔離 `applyFormulasAndStyles()` 與 Full Setup 選單（`setupMarketEngineV3MenuNotice()`）；公開 `doGet()` 拒絕所有寫入、快取清除與排程控制 `action`，並於 `getMarketEngineData(false, { readOnly: true })` 與 `getFinNewsCombinedPayloadReadOnly_()` 全面落實純唯讀路徑，同步對齊前端 Fin-News UI 狀態語意。
  - (6) **02B-6 ~ 02B-6.7 部署前安全盤點、備份與修復演練（2026-11-12 完成，0 正式寫入）**：
    * **備份就緒**：建立獨立試算表副本 `Market_Engine_V3_BACKUP_PRE_02B-6`（`1TuHwETZRlmAv5YSdTKy7X9saigOVYHT7-1Pos_5DOno`），全表 6 頁比對 0 差異。
    * **Trigger 與逾時盤點**：Apps Script IDE 實存 3 組 `HEAD` 排程（`updateMorningMarketEngine` 07:00–08:00、`updateAfternoonMarketEngine` 16:00–17:00、`updateMonthlyLabBacktest` 每月 1 日 01:00–02:00；缺少 `updateWeeklyFinNewsReport`，無重複／遺留危險 Trigger）；`callGeminiAPIUniversal()` 同步重試曾於 11/06 觸及 `360.6s` 逾時。
    * **程式碼與資料缺口確認**：確認 `commitDailyTradingRow()` 尚未實作於 [Market_Engine_GAS.js](file:///f:/Projects/Market_Engine/Market_Engine_GAS.js)（`updateAfternoonMarketEngine()` 仍無鎖定／快照回滾／`13:30`／`10.5%` 閘門且有 `realData.twii || prevTwii` 回退風險）；確認 `HISTORY_LOG` Row 31~1829 存在 1,799 列 `#REF!`（16,191 格錯誤）導致 `LAB_BACKTEST` 僅計 2,769 天。
    * **測試副本演練通過**：於 `Market_Engine_V3_TEST_REPAIR_02B-6.7`（`1ZR9JcKEhlxSY7BZTocEna3oNfc8C_z4icUii9Gb3FYg`）完成 `HISTORY_LOG!A3:I4501` 批次重建（`4.81s`）、`A4502:I5000` 清空、`J/K` 0 異動、`LAB_BACKTEST` 恢復 4,499 天且 4 項稽核全通過，並完成 `4.49s` 回滾演練。
  - (7) **02B-7.1 ~ 02B-7.2 頂端插列公式防漂移實證與新 Row 3 公式包（2026-11-14 完成）**：
    * **實證發現 (02B-7.1)**：於隔離副本實證 `insertRowBefore(3)` 會使 `LAB_BACKTEST!B4:E8` 起算列自動漂移為 `$F$4:$F`（永久排除最新日），且 `THRESHOLD_CONFIG!C12:D15` 漂移為 `F54:F`（每日縮水 1 天），新插 Row 3 缺少計算公式。
    * **程式碼與公式包落地 (02B-7.2)**：
      1. `THRESHOLD_CONFIG!C12:D15` 改用 `INDIRECT("RAW_HISTORY!F53:F")` / `G53:G` 鎖定起算列；
      2. `LAB_BACKTEST!B4:E8` 改用 `INDIRECT("HISTORY_LOG!$F$3:$F")` / `$I$3:$I` 鎖定回測起算列；
      3. 實作 `applyRawHistoryRow3Formulas()`（D3:I3）與 `applyHistoryLogRow3Formulas()`（A3:I3，含 252 日前瞻報酬率）；
      4. 於全新測試副本 `Market_Engine_V3_TEST_ANTI_DRIFT_02B-7.2`（`1nRaDnv1Dxs6nqEvzOXajzZyLU69A2qDSdrmEEcr-L0w`）完成連續 3 次插列實測，公式 0 漂移且 `LAB_BACKTEST` 天數精準累加（2,769 -> 2,772）。
- **Milestone 7.7 (v2.9.3~v2.9.8 COMPLETED)**: 🛡️ **獨立交易快照、原子提交與災難復原引擎 (02B-8.1 ~ 02B-8.4-G Transaction & Recovery Engine Hardening)**
  - (1) **02B-8.1 ~ 02B-8.3.2 每日收盤前置驗證與 10.5% 雙向熔斷閘門**：實作真實日曆檢核 `isValidCalendarDate_`（嚴防 JavaScript Invalid Date）、Yahoo 13:30 時間戳驗證、TWII 非空且大於 0、PreviousValidClose 檢索與深層歷史排他防禦、$\pm 10.5\%$ 單日漲跌熔斷閉鎖。
  - (2) **02B-8.3.3.1.x 前置演算法與資料規格確立**：鎖定 RAW_HISTORY A3:J5（3x10，含 J 欄 EWT_Change，嚴禁移除）、HISTORY_LOG A3:K5（3x11）、DASHBOARD B12 `=INDIRECT("RAW_HISTORY!J3")`；實作雙欄格式分離保存快照（`_ROLLBACK_TMP` Col 1..10/11 存原始格式與 Note，Col 12..21/22 存純文字 `@` 公式鏡像）；實作 SHA-256 雙表 Pre-Fingerprint、HMAC-SHA256 交易來源簽章與終態 Terminal Receipt。
  - (3) **02B-8.4 實體專案、14 大故障注入與 02B-8.4-A 安全審查**：建立真實 Google Sheets 隔離專案（`Market_Engine_ISOLATED_TEST_02B-8.4` 與 `EngineCore.gs`），比對分支與隔離程式碼 100% 一致；實作原子提交 `executeTransactionCommit_`、冪等復原 `executeTransactionRecovery_` 與中斷自癒 `handleInterruptedTransaction_`；隔離環境授權維持 `AUTH PENDING`，零外部干擾、零主動索取權限。
  - (4) **02B-8.4-B ~ 02B-8.4-D 雙表獨立判定、完整列證據與 Snapshot 獨立防篡改**：解決 RAW 插列但 HIST 未插列之中斷誤刪情境，確立雙表各自獨立判定插列狀態；廢除只比對單一欄位之做法，改用 RAW 10 欄 (A:J) 與 HIST 11 欄 (A:K) 完整列證據；實作 `shiftHistoryLogFormula_` 解耦跨表與本地公式位移；實作全量 `computeSnapshotIntegrityHash_` 並於復原前嚴格比對。
  - (5) **02B-8.4-E 狀態三態化 (UNKNOWN Fail-Closed) 與 canonicalSerialize_ 消除型別碰撞**：嚴格定義 `INSERTED`、`NOT_INSERTED`、`UNKNOWN` 三態；Row 3 與 Row 4 同時吻合時判定 `UNKNOWN` 阻斷；Domain-Hardened JCS 導入顯式型別標籤（`n:`, `u:`, `b:`, `num:`, `s:`, `d:`），徹底消除型別碰撞；依 IEEE 754 語意將 `-0` 規範化為 `num:0`；Recovery 就地網格清空空白屬性與 Note 殘留。
  - (6) **02B-8.4-F NOT_INSERTED 充分證據與入口閉鎖**：重新定義 NOT_INSERTED 證據條件：實體 Row 3 與 Row 4 必須同時 100% 吻合快照基準 (delta 0) 且無 Note 方可判定；實體資料列不足 (`getLastRow < 3` 或 `< 4`) 或 Row 4 遭篡改全面回傳 `UNKNOWN`；Recovery 保證在 UNKNOWN 時零刪列、零覆寫、完整保留快照。
  - (7) **02B-8.4-G Recovery 呼叫鏈顯式三態傳遞與公式位移安全閘門**：`inspectHistInsertionStatus_` 廢除布林參數，改為嚴格接收三態字串 `rawInsertionStatus: 'INSERTED' | 'NOT_INSERTED'`，遇 `UNKNOWN` 立即短路中止，保證 HIST 判定 0 呼叫；實作 `validateFormulaSafety_` 攔截 `#REF!`、未閉合引號與括號不平衡；`shiftFormulaRows_` 新增 `(?!\s*\()` 負向前瞻，徹底解決 `LOG10(`、`DEC2BIN(` 等函數名稱數字被誤置換問題；雙引號字串常數（`"..."`）與單引號工作表前綴（`'RAW_HISTORY'!`）精確分離。
  - (8) **全量測試保證**：全套件測試擴充至 9 大測試組、47 大情境，**195/195 PASS**（0 Failed）。
- **Milestone 7.8 (v2.9.9~v2.9.15 COMPLETED)**: ⚓ **盤後資料正確性修復、VIX/EWT 歷史依賴徹底解除與正式環境發布 (ANTI-83411 ~ ANTI-83419)**
  - (1) **ANTI-83411 ~ ANTI-83413 盤後更新時序反轉與雙表中斷防呆**：徹底推翻「未取行情先插列」舊制，改為先取 Yahoo 行情並通過嚴格驗證後才允許寫入；實作雙表頂端空白列防呆（`PRE_WRITE_BLANK_ROW_DETECTED`），杜絕中斷後二次插列；於隔離 Google Sheets 完成真實環境 9 大項目實測。
  - (2) **ANTI-83414 ~ ANTI-83416 VIX 時間基準前視偏誤修正與歷史影響量化**：確立「資料產生時間 <= 台股收盤時間 (13:30)」不可變基準；實作夏冬令動態時間換算（CDT 04:15 / CST 05:15），全面清查歷史前視偏誤並量化其對 T1~T5 及分位數影響。
  - (3) **ANTI-83417 ~ ANTI-83419 VIX/EWT 歷史依賴解除、即時觀測解耦與缺口補測**：確立核心原則「海外指標為即時觀測參考，不作為歷史決策模型之歷史輸入資料」；停止向 `RAW_HISTORY` 新列 C/J 欄及 `HISTORY_LOG` 新列 E 欄寫入，既有歷史數據 100% 原始保留；完整性驗證升級允許新列留空，嚴密捍衛 `DASHBOARD!B12` 原公式 `=INDIRECT("RAW_HISTORY!J3")`；Calibration Lab 完全移除 VIX 歷史分位數，回歸 Dist60/Dist240 雙核心指標；全套 291/291 測試 100% PASS。
  - (4) **正式環境合併與 Web App 部署上線 (@153)**：`feature/data-lifecycle-hardening` 完整合併至正式分支 `main`；透過 `.claspignore` 白名單安全機制完成正式部署升級至 **Version 153 (`@153`)**，原部署 **Version 152 (`@152`)** 完整保留作為即時回復依據。
- **🚀 目前停止位置與起點記錄**: `main` 分支（正式環境 GAS 部署 **Version 154 (`@154`)**，包含 ANTI-83420 VIX/EWT 前端與快取顯示加固）。
- **🎯 下一步施工目標 (下個開發起點記錄)**:
  - **目標 1 (正式盤後收盤實測與連續運作監控)**：在真實收盤時間（16:30）觀察 `updateAfternoonMarketEngine()` 的實體執行，確認 TWII 自動結算歸檔、新列 C/J 欄保持留空、`OVERSEAS_OBSERVATION_JSON` 快取正常更新。
  - **目標 2 (正式環境歷史資料修復，待排程)**：在適當時機排定正式環境 `HISTORY_LOG!A3:I4501` 修復（解決 1,799 列 `#REF!` 錯誤），並套用 02B-7.2 之公式防漂移鎖定與 `verifyLabBacktest()` 對帳。
  - **目標 3 (策略對決互動與前端體驗擴充)**：策略對決模擬器提供定期定額每月扣款與彈藥池投入比例之即時自選試算，打磨暗色調 Glassmorphism 微動態。

---
## ⑨ 開發日誌歷程 (Development History)
| 日期 | 版本 | 核心更新摘要 |
| :--- | :--- | :--- |
| **2026-07-26** | `v1.0~v1.6.1` | 全站 V3 初始建置、18年實體歷史行情鏈結、SPA UI 頁籤、Kopitiam 人設與深色護眼模式。 |
| **2026-08-01** | `v2.6.0~v2.7.1` | `📰 FIN-NEWS` 分頁發布、Google Docs 動態解析、近2日千點大跌鑑別、未來重大事件提醒卡。 |
| **2026-08-02** | `v2.7.2` | 週末 VIX / EWT 時間戳解耦與美股週五結算日對齊。 |
| **2026-08-06** | `v2.7.3~v2.7.5` | `parseDistValue` 通配解析器重構、季線位階 (`Dist60`) 全站統一、年線高位轉為長線風險提醒。 |
| **2026-08-25** | `v2.7.6~v2.7.12` | (1) Gemini 4 模型自動備援；(2) `fetchAll` 並行擷取與雙層 CacheService 快取；(3) 消除 CalendarApp 迴圈與 LLM 同步堵塞 (doGet < 50ms)；(4) `TAIWAN_HOLIDAYS_PRESET` 0ms 假日查表；(5) AI/CPI/GEO 三大主題實質新聞讀報；(6) 未來重大事件自動過濾歷史舊事件。 |
| **2026-08-25** | `v2.8.0` | **Milestone 6 完工發布**：(1) 實作 `calculateStrategyBacktest` 全歷史 18 年策略對決模擬器 (本金、終值、CAGR、MDD、Sharpe Ratio、資金效率)；(2) 實作 `calculateWalkForwardValidation` 10年滾動樣本外驗證；(3) 前端 `📈 歷史回測` 頁面發布對戰與驗證卡片。 |
| **2026-08-26** | `v2.8.0` | **策略對決與視覺白話全套優化**：(1) 重構 MDD 為真實投資組合權益曲線算式 (`Total Equity = Shares × Index + Cash`，Baseline -29.56% vs Market Engine -27.25%)；(2) 前端動態 MDD 顯著改善標籤連動發布 (>= 0.5% 門檻觸發)；(3) UI 排版與跨裝置字體對齊優化；(4) 新增『💡 18 年實戰模擬白話導讀』Glassmorphism 卡片與『❓ 總本金差異 534 萬來源與效率證明』QA 解答區塊；(5) 雲端 GAS 部署升級至 `@94`。 |
| **2026-08-27** | `v2.8.5~v2.8.10` | **里程碑 Milestone 6 核心敘事重構與系統大修復**：(1) 升級 Slogan「研究市場，是為了最後不再被市場牽著走」與核心引言；(2) 重定義三大角色（基石、彈藥、護欄）並加入長期持有鐵則卡；(3) 回測頁發布「三年探索時間軸 (Road to Simplicity)」，並清理導讀卡與對照卡；(4) 修復 `calculatePhaseDurationAndRelief` 中舊 `d240` 邏輯與門檻格式解析 Bug；(5) 重構 `GAS_API_BASE` 與主 API Deployment ID 強制升級部署至 `@100`。 |
| **2026-09-03** | `v2.8.11` | **非休市紀念日過濾與 8 月歷史交易日鏈補全修復**：(1) 在 `isMarketOpen()` 中加入 `NON_MARKET_HOLIDAYS`（軍人節、教師節等非休市紀念日過濾），修正 9/03 軍人節股市正常開盤判讀；(2) 實現 `seedAugust2026HistoricalRows()` 無條件批次補全 8 月 21 個交易日（解決 7/31 至 9/02 日期斷層導致位階卡在第 2 天之問題）；(3) 採用 1-step `deleteRows()` 批次刪除與動態 `topMA60` 回溯計算，徹底解決 GAS API Context Deadline 超時與快取滯後 BUG；(4) GAS 部署成功升級至 `@127`。 |
| **2026-10-15** | `v2.8.12` | **市場位階持續天數/打折撫平器重構、門檻單一來源與公式自癒修復**：(1) 修復 `parseDistValue` 負數二次除以 100 BUG；(2) 抽出 `classifyPhase` 與 `getThresholdConfig`，徹底統一以 `THRESHOLD_CONFIG` 為 Single Source of Truth；(3) 重構位階持續天數演算法為大區間（Regime）與精確子位階雙層統計，解決高檔區（狂熱轉過熱）或打折區（極度恐慌轉恐慌）震盪導致天數意外重置歸 1 之問題，持續天數精準恢復為 77 天；(4) 起算點對齊 `lastStockDataDate` 並過濾休市日；(5) DASHBOARD 自動偵測修復 B7 `#REF!` 公式，修復 `ma60Slope`/`dist60Delta` 輸出 `#REF!` 並保證 AI 雙顧問文章 100% 傳入正確市場位階；(6) 雲端 GAS 部署升級至 `@135`。 |
| **2026-10-15** | `v2.8.13` | **重整載入極速優化 (SWR 本地優先快取與後端多餘維護操作徹底剝離)**：(1) 前端 `index.html` 實現 Stale-While-Revalidate（SWR 本地優先快取），頁面啟動 0 毫秒即刻從 `localStorage` 渲染上次報表與位階，完全消除按 F5 轉圈「連線中/計算中」的等待感；(2) 徹底剝離後端 API 每次重複調用 `seedAndFixWeekendMode()` 刪除+寫入+排序歷史資料的巨型效能黑洞（完全無快取運算時間從 33.5s 縮減至 8s~11s）；(3) `calculatePhaseDurationAndRelief` 改用一次性批次 Range 讀取，並消除 `SpreadsheetApp.flush()` 阻塞；(4) API 快取 TTL 延長至 300 秒；(5) 雲端 GAS 部署升級至 `@138`。 |
| **2026-10-15** | `v2.8.14` | **前一位階歷史脈絡 (Phase Transition Breadcrumb) 與動態轉折路徑發布**：(1) 升級 `calculatePhaseDurationAndRelief()` 演算法，若當前位階天數 `currentDuration === 1`（剛轉折），自動向歷史回溯統計前一位階名稱 `prevPhase` 與持續天數 `prevDuration`；(2) API 與 `DASHBOARD` Sheet B17 補齊 `phaseTransitionText`（如 `"T5 狂熱 (持續 74 天) → 今天 10/15：T4 過熱 (持續 1 天)"`）、`prevPhase`、`prevDuration`；(3) 前端 `index.html` 在位階卡片動態展示 Glassmorphism 轉折脈絡標籤（附帶箭頭與徽章），若已持續 2 天以上則自動維持簡潔計數（如 `T4 過熱 (持續 2 天)`）；(4) 雲端 GAS 部署升級至 `@140`。 |
| **2026-10-15** | `v2.8.15` | **轉折路徑標籤常態常駐化 (Persistent Transition Breadcrumb until Next Transition)**：(1) 移除前端 `currentDays === 1` 隱藏限制，改為只要存在前一位階歷史（`prevPhase && prevDuration > 0`），轉折路徑麵包屑標籤永遠常態存在（一直顯示），右側天數依實際持續天數動態更新為 `今天 MM/DD：T4 過熱 (持續 X 天)`，直到下一個新的位階轉折出現為止；(2) 前端加入 `getPhaseStyle()` 輔助函式，前後位階自動映射專屬 emoji（🔥/⚠️/☕/🛒/💎）與色彩邊框；(3) 後端 `Market_Engine_GAS.js` 確保 `phaseTransitionText` 常態輸出並持續同步寫入 DASHBOARD B17；(4) 雲端 GAS 部署升級至 `@142`。 |
| **2026-10-15** | `v2.8.16` | **MARKET LAB 18年歷史回測月度自癒排程重算與維度溢出徹底修復**：(1) 徹底修復 `HISTORY_LOG` 預設列數（1,000列）低於 `RAW_HISTORY`（4,500列）導致 `applyHistoryLogFormulas` 拋出 `Range coordinates exceed sheet dimensions` 崩潰之致命錯誤，新增自動擴充列數保護；(2) 優化 `verifyLabBacktest` 與 `updateMonthlyLabBacktest` 為增量安全填充（防止對 4,000+ 列重複寫入 3.6 萬個 Excel 算式導致 GAS 逾時）；(3) 實作 `checkAndAutoRunMonthlyLabBacktest()` 每月初自癒排程機制，若發現上次計算月份落後，在每日 16:30 盤後小羅值班與 API 強制刷新時自動補跑，並在 `doGet` 提供 `action=updateMonthly` 手動入口；(4) 雲端實體執行對帳成功，回測計算日期成功由「2026-07-29」精準推進至 **`2026-10-01`**，各位階歷史天數與勝率全數刷新完畢；(5) 雲端 GAS 部署升級至 `@144`。 |
| **2026-10-15** | `v2.8.17` | **突發大跌事件鑑別判定依據一致性修復與 DASHBOARD 全面更新**：(1) 徹底修復「🚨 突發大跌事件鑑別」在 `dropPoints >= 1000` 時，標籤顯示觸發但內文【判定依據】卻誤植為預設「近 2 日大盤運作平穩，未觸發 1,000 點急煞大跌防禦機制」之衝突矛盾；(2) 在 `checkCrashEmergencyDefense` 與 `getFinNewsCombinedPayload` 落實觸發時強制作業，保證 `analysisText` 精準輸出重挫點數（`近 2 日大盤累計重挫 1,656 點，正式觸發 1,000 點急煞大跌防禦機制，進入情緒型下跌監測。`）並提供完整 3 點具體判定依據；(3) 前端 `index.html` 增強過濾保護，徹底杜絕矛盾字眼；(4) 完成 DASHBOARD 手動更新與部署至 `@146`。 |
| **2026-10-15** | `v2.8.18` | **未來重大事件永續動態滾動生成引擎與極速 2 秒響應重構**：(1) 排查並修復重大事件倒數日曆過期斷糧問題，徹底打破「靜態 8~9 月事件被過濾為空 -> fallback 依然為空 -> 陷入空陣列」之死循環；(2) 導入 `generateRollingUpcomingEvents()` 永續滾動生成引擎，整合 2026 Q4 ~ 2027 全年關鍵錨點事件庫（10/15 台積電法說會、10/29 美股科技巨頭 Q3 財報週、11/05 FOMC、11/06 非農、11/12 CPI、11/19 NVDA 財報、12/16 年終 FOMC、2027-01-14 台積電法說會）與未來 90 天總經循環自動生成算式，確保任何時候永遠保有 5~6 個合格重大事件，絕不斷糧；(3) 在 `getFinNewsCombinedPayload()` 中若有效事件少於 4 個自動現場補齊持久化，並在每日 16:30 盤後小羅值班加入事件自癒檢查；(4) 徹底剝離 `doGet` 強制刷新時同步阻塞執行 18 年回測的歷史效能包袱，API 響應時間自 40 秒壓縮至 **2 秒**；(5) 前端 `index.html` 增強事件載入 Fallback 與按鈕，版本升級至 `v2.8.18`；(6) 雲端 GAS 部署成功升級至 `@150`。 |
| **2026-10-18** | `v2.9.0` | **Milestone 7 核心目標發布：三窗口歷史位階校準與比較實驗室 (18Y / 10Y / 5Y Calibration Lab)**：(1) 聚焦收斂 `Dist60`、`Dist240`、`VIX` 三大實體指標並剔除無 18 年歷史之夜盤；(2) 實現日曆年精準切片（18Y: 2008-10-16、10Y: 2016-10-16、5Y: 2021-10-16），統一採用標準線性插值法 (`PERCENTILE.INC`) 計算 P5~P99 分位數與各指標獨立樣本數；(3) 沿用全站統一 `classifyPhase` 函式推算實驗性位階，嚴格維持 `THRESHOLD_CONFIG` (18Y) 為 Single Source of Truth，絕不覆寫正式決策；(4) 前端實現 0ms 極速切換 UI，提供校準摘要卡、三窗口門檻橫向比較表（附相對 18Y 基準之絕對差值）與位階敏感度分析（解析近期牛市門檻平移對位階判定的影響）；(5) 全域暴露 `window.CALIBRATION_RESEARCH_DATA` 支援一鍵複製與後續回測研究；(6) GAS 部署升級至 `@151`，doGet 保持 < 2 秒極速響應。 |
| **2026-10-18** | `v2.9.1` | **Milestone 7 延伸強化：三窗口歷史下行風險與前瞻報酬驗證完工 (Risk & Forward Return Verification)**：(1) 避免逐日動態重算，直接以 18Y、10Y、5Y 三窗口標準分位數門檻，分別統計各位階出現後未來 20 日 (1 個月) 與 60 日 (1 季) 的平均前瞻報酬率、最大不利變動 (Max Drawdown / 下行風險) 與正報酬勝率；(2) 後端 `Market_Engine_GAS.js` 實現 `calculatePhaseForwardPerformance`，單次遍歷執行耗時僅 14ms，由 300s API 快取保護，維持 doGet < 2s 極速響應；(3) 前端 `index.html` 發布當前選定窗口 T1~T5 詳細前瞻風險表與三窗口橫向對比矩陣，支援 0ms 切換即時響應；(4) 量化核心結論證實：18Y 具備最高等級跨週期穩健性；5Y 窗口在近期牛市中狂熱區衝刺達 +15.5%，但在空頭週期 T2 (恐慌) 最大回撤達 -9.80%，證實 18Y THRESHOLD_CONFIG 不可替代；(5) 雲端 GAS 部署升級至 `@152`。 |
| **2026-11-09** | `v2.9.2` | **時序解耦架構重構、資料生命週期安全強化與實證稽核完工**：(1) 確立「正式 T1–T5 永遠以最近一次完整收盤為準」核心不可變原則；(2) 盤前 07:30 徹底唯讀化，移除 RAW_HISTORY 提早插列與佔位賦值，保持均線純淨；(3) 海外市場觀測存入 ScriptProperties 解耦快取，萃取美股交易日並建立 `isStale` 防追高保護；(4) 實作 `commitDailyTradingRow` 盤後安全原子提交機制，含成交時間戳檢驗（>= 13:30:00）、價格合理性防護閘門（<= 10.5%）、悲觀鎖（LockService 30s）、全列備份與失敗自動回滾自癒；(5) 確立 GAS Deployment ID 鎖定與秒級版本回滾規範。 |
| **2026-11-11** | `v2.9.2` (`feature/data-lifecycle-hardening`) | **海外行情全鏈解耦、歷史維護解綁與危險入口緊急隔離 (02B-1 ~ 02B-5.2，本地驗證完畢尚未上線)**：(1) 02B-1 (`17e63ae`~`798da60`)：`getMarketEngineData()` 海外 VIX/EWT 全面改讀 `OVERSEAS_OBSERVATION_JSON` 與獨立五態評估（`FRESH_VALID` / `FETCH_FAILED_WITH_CACHED` / `FETCH_FAILED_NO_DATA` / `MISSING_TIMESTAMP` / `STALE_DATA`），保留 `parseDistValue()` `+0.10%` 解析修正與 `N===0 && curVal===null` 邊界處理；(2) 02B-2 (`c376a00`)：`index.html` 移除 `19.99` / `+2.71%` / `-1.83%` 假行情 fallback，禁止前端重算策略與 CD；(3) 02B-3 (`e227f19`)：`generateAfternoonNavigation()` 與盤後 fallback 解耦 `RAW_HISTORY!C3/J3`；(4) 02B-4~02B-5 (`366c92c`)：解除 `updateAfternoonMarketEngine()` 與 `doGet()` 對 `seedAndFixWeekendMode()` 的自動觸發，選單 `healRawHistoryEwtData()` 轉安全暫停；(5) 02B-5.1~02B-5.2 (`21766e7`)：隔離 `applyFormulasAndStyles()` 與 Full Setup 選單，公開 `doGet()` 封鎖全部寫入／清快取／排程控制 `action` 並移除 `TAIWAN_HOLIDAYS_JSON` 前置刪除副作用，完整保留公開 JSONP 唯讀相容。 |
| **2026-11-12** | `v2.9.2` (`23a830b` / 02B-6~6.7) | **公開 `doGet` 嚴格唯讀強化、正式環境安全盤點、獨立備份與 `HISTORY_LOG` 修復演練完工**：(1) 02B-5.4 (`1a4bb32`, `23a830b`)：落實 `getMarketEngineData(false, { readOnly: true })` 與 `getFinNewsCombinedPayloadReadOnly_()` 純唯讀路徑並對齊前端 Fin-News 狀態語意；(2) 02B-6~6.4：完成正式 GAS `@152` / `HEAD` 盤點、建立獨立試算表備份 `Market_Engine_V3_BACKUP_PRE_02B-6`、透過 IDE 實證僅 3 組 `HEAD` Triggers 且無危險遺留排程；(3) 02B-6.5~6.7：確認 `commitDailyTradingRow()` 尚未實作於程式碼並產出完整 10 階段設計與 14 項測試規格；查明 `HISTORY_LOG` Row 31~1829 共 1,799 列 `#REF!` 根因，並於獨立測試副本 `Market_Engine_V3_TEST_REPAIR_02B-6.7` 完成 `A3:I4501` 重建（`4.81s`）、`LAB_BACKTEST` 4,499 天恢復與 `4.49s` 回滾演練。 |
| **2026-11-14** | `v2.9.2` (`feature/data-lifecycle-hardening` / 02B-7.1~7.2) | **頂端插列公式防漂移實證、跨表 INDIRECT 鎖定與新 Row 3 公式包落地**：(1) 02B-7.1：於獨立測試副本完成插列公式漂移實證，精準鑑別 `LAB_BACKTEST!B4:E8`（$F$3:$F -> $F$4:$F 漏日）與 `THRESHOLD_CONFIG!C12:D15`（F53:F -> F54:F 萎縮）之漂移根因；(2) 02B-7.2：本地程式碼 `THRESHOLD_CONFIG` 改用 `INDIRECT("RAW_HISTORY!F53:F")` / `G53:G` 鎖定，`LAB_BACKTEST` 改用 `INDIRECT("HISTORY_LOG!$F$3:$F")` / `$I$3:$I` 鎖定；(3) 建立新 Row 3 公式包函式 `applyRawHistoryRow3Formulas()`（D3:I3）與 `applyHistoryLogRow3Formulas()`（A3:I3，含 252 日前瞻報酬率）；(4) 於全新隔離副本連續 3 次插列實測，公式 0 漂移、回測動態累加（2,769 -> 2,772），指標計算與門檻百分百正常。 |
| **2026-11-14** | `v2.9.2` (`feature/data-lifecycle-hardening` / 02B-7.3~7.4) | **門檻樣本集合驗證、前瞻報酬率邊界實證與門檻一般參照策略回歸**：(1) 02B-7.3：於獨立測試副本完成 S1 (凍結歷史池)、S2 (一般參照自然漂移) 與 S3 (INDIRECT 鎖定 F53:F) 實證，100% 證實 S3 在每次頂端插列時會依序吞入原 F52、F51、F50 資料（樣本數 +1/日），而 S2 一般參照則跟隨資料列下推（F54:F, F55:F...），完美鎖定原始 2026-08-31 起算之 4,440 筆歷史基準；驗證 HISTORY_LOG I3:I254 在小於 252 交易日時 0 錯誤安全回傳空字串 `""`，I255/I256 精確引用 B3/B4，手動驗算誤差為 0；(2) 02B-7.4：修正 `buildThresholdConfigSheet()` 與 `applyThresholdConfigAntiDriftFormulas()`，移除 INDIRECT 固定座標，恢復一般參照 `RAW_HISTORY!F53:F` / `G53:G`，保留原始起算位置，確保門檻跟隨原始歷史樣本集合；(3) 保留 `LAB_BACKTEST` 的 `INDIRECT("HISTORY_LOG!$F$3:$F")` 與 `$I$3:$I` 鎖定，確保每次頂端插列動態納入最新日；(4) 於全新隔離副本 `Market_Engine_V3_TEST_THRESHOLD_FIX_02B-7.4` 完成連續 3 次插列回歸驗證，8 個門檻分位數完全凍結不變 (0.00% 變動)，回測總天數精準由 4,568 -> 4,571 (+3)，D:I 與 A:I 新列公式包 100% 正確求值。 |
| **2026-11-14** | `v2.9.2` (`feature/data-lifecycle-hardening` / 02B-7.4.1~7.5) | **回測數值差異溯源、RAW/HISTORY 一對一完整性稽核與全量重建演練完工**：(1) 02B-7.4.1~7.4.2：精準溯源解開正式備份 `HISTORY_LOG` 的結構性殘缺真相——備份中 Row 31~1829 存在 1,799 列 `#REF!`，Row 1830 起跳接至 A53，底部 Row 4473~4570 存在 98 筆重複舊資料尾巴（停在 2023-06-09），故初始 B9 僅呈現 2,769；02B-7.4 填入 2,800 列公式修復前段後與舊尾巴疊加成 4,568（+3次插列成 4,571）；I255 在 02B-7.3 (+97.27%) 與 02B-7.4 (+102.26%) 之差異純粹為量測時點隨插列下推 3 天，公式精準鎖定 `ROW()-252`，手動誤差為 0；(2) 02B-7.5：於全新隔離副本 `Market_Engine_V3_TEST_REBUILD_02B-7.5` 演練 `HISTORY_LOG` 全量重建，以 `RAW_HISTORY` 4,499 筆資料為唯一母體重建 `A3:I4501`、清除 `A4502:I5000` 殘留尾巴、保留 J/K 欄 100% 未變動，單次重建耗時僅 **3.84 秒**；(3) 逐列校驗實證：日期與收盤價 100.00% 對齊（4,499/4,499）、0 錯誤、0 重複、0 錯位；`LAB_BACKTEST` 總天數 B9 完美收斂至 **4,499 天**，T1~T5 分布精準吻合（T1: 451, T2: 669, T3: 2,228, T4: 668, T5: 483）；前瞻報酬率 252 邊界完美運作（I3:I254 空字串，I255 起 4,247 筆有效）；(4) 完成失敗復原演練，**3.37 秒** 回滾至 2,769 基準；確認正式環境維持零修改未修復狀態。 |
| **2026-11-14** | `v2.9.2` (`feature/data-lifecycle-hardening` / 02B-7.5.1~7.5.2) | **Dist60 空白值型別陷阱查核、位階公式 ISNUMBER 防護修正與頂端插列防漂移驗證**：(1) 02B-7.5.1：查明 2008 年初最早 9 個交易日（2008-01-02 ~ 2008-01-14）因均線樣本不足 10 天而回傳空字串 `""`，因 Google Sheets 比較規則中「文字 > 數字」（`"" > 0.0664` 求值為 TRUE）被誤判為 T5 狂熱（致使 T5 自 474 天虛增至 483 天）；排除 9 筆空白後，4,490 筆有效 Dist60 精準收斂至 `451 / 669 / 2,228 / 668 / 474`，差值全數為 0；(2) 02B-7.5.2：於 `Market_Engine_GAS.js` 之 `applyHistoryLogFormulas()` 與 `applyHistoryLogRow3Formulas()` 前置檢查加入 `NOT(ISNUMBER(C{row}))` 防護，9 筆空白 Dist60 全數正確回傳空字串；(3) 於隔離副本驗證：`LAB_BACKTEST` B9 精準收斂為 **4,490 天**（T1: 451, T2: 669, T3: 2,228, T4: 668, T5: 474），有效交易日母體 4,499 天保持不變，J/K 欄 100% 原始保留；(4) 連續 3 次 `insertRowBefore(3)` 實證：新 Row 3 公式自動具備 `NOT(ISNUMBER(C3))` 防護且正確求值（極度恐慌/恐慌），`THRESHOLD_CONFIG` (F54:F~F56:F) 0 漂移 (0.00% 變動)，`LAB_BACKTEST` 動態累加（4,490 -> 4,491 -> 4,492 -> 4,493），無任何 #REF! 錯誤。 |
| **2026-11-14** | `v2.9.2` (`feature/data-lifecycle-hardening` / 02B-7.6~7.8) | **LAB_BACKTEST 全歷史回測可信度驗證、乾淨基準副本封存與自我驗證邏輯修正**：(1) 02B-7.6~7.6.1：全量歷史回測可信度檢驗通過，釐清前瞻報酬樣本邊界（4,241 筆有效回測樣本）及人工插列提前解鎖效應，確定純歷史基準（T1: 451/+26.69%/82.43%, T2: 669/+14.63%/71.02%, T3: 2,228/+8.51%/68.66%, T4: 668/+7.30%/66.23%, T5: 474/+15.35%/74.85%）；(2) 02B-7.7：自正式備份建立全新乾淨基準副本 `Market_Engine_V3_CLEAN_BASELINE_02B-7.7` (`1E5qyBRSVCXULp3U1JHW3rDPTKg8fstbvXx4KaTr3GJY`)，完成全量 4,499 筆資料對齊、0 個 `#REF!`、J/K 欄 100% 原始保留，指標與基準百分百吻合並正式封存；(3) 02B-7.8：修正 `verifyLabBacktest()` Audit 1 邏輯盲區，分離計算 `rawDateCount` (4,499)、`validDist60Count` (4,490)、`blankDist60Count` (9) 與 `backtestPhaseCount` (4,490)，嚴密驗證母體完整性 ($4499 = 4490 + 9$)、位階計數 ($4490 = 4490$)、空白位階防護與有效位階完整性；(4) 於 02B-7.8 工作副本驗證全 4 大 Audit 100% 通過（橫幅顯示綠色通過標籤），並於可丟棄副本完成「有效資料漏位階」與「空白資料偽出 T5」兩大反向測試，精確捕捉違規判定失敗並成功復原。 |
| **2026-11-14** | `v2.9.2` (`feature/data-lifecycle-hardening` / 02B-8.1~8.3.1) | **每日收盤安全原子提交架構設計定案、獨立交易快照引擎實作與 10 項故障注入實測完工**：(1) 02B-8.1~8.2.3：完成每日收盤靜態盤點與原子提交架構設計，確立核心收盤寫入與 AI/新聞/Crash/月度回測後處理徹底解耦；定案以 `_ROLLBACK_TMP` 實體隱藏 Sheet（3x9 與 3x11 完整雙表鏡像）為第一持久化容器、搭配 ScriptProperties 快取，擺脫 9KB 限制；確立確定性 SHA-256 雜湊演算法與 10.5% 雙向熔斷器三態判定；(2) 02B-8.3.1：於本地實作獨立交易快照引擎 6 大核心函式（`createTransactionSnapshot_`、`readTransactionSnapshot_`、`validateSnapshotIntegrity_`、`calculateSnapshotHash_`、`updateSnapshotLifecycle_`、`inspectSnapshotState_`），實裝公式字串優先提取、型別標準化與生命週期流轉；(3) 於全新測試副本 `Market_Engine_V3_TEST_SNAPSHOT_02B-8.3.1` 完成全套 10 項故障注入實測，100% 通過（正常建立與讀回、儲存格篡改攔截、中繼資料缺欄位攔截、全量 Integrity Hash 篡改攔截、Properties 遺失自 `_ROLLBACK_TMP` 自癒重建、未驗證狀態防護、並發舊快照互斥鎖定、J/K 備註與 AI 文字敏感度、公式與靜態值隔離、重複交易冪等性沿用）；(4) 原母體 RAW_HISTORY (4,499列)、HISTORY_LOG (4,499列) 與 LAB_BACKTEST (B9=4,490) 100% 原始保留，零修改零損害。 |
| **2026-11-14** | `v2.9.2` (`feature/data-lifecycle-hardening` / 02B-8.3.1.2) | **快照引擎安全加固、CORRUPTED 閉鎖、單一責任鎖定與 Hash 轉義完工**：(1) 修正 CORRUPTED 閉鎖與 Fail-Closed 防護：強制阻斷覆蓋任何損毀快照（新舊交易 ID 均無法覆蓋），中繼資料不完整或雜湊不符一律拒絕建立新快照，建立管理員專用人工解除函式 `forceClearCorruptedSnapshotState_()`；(2) 單一責任鎖定架構：對外入口 `createTransactionSnapshot_()` 自帶 30s `LockService` 悲觀鎖（`try...finally` 釋放），並支援外層協調器傳入 `lockAcquired: true` 直接調用核心 `createTransactionSnapshotCore_()`，徹底杜絕不可重入鎖衝突；(3) 確定性 Hash 序列化加固：實裝 `escapeSnapshotString_()` 轉義分號 (`;`)、直線 (`|`)、反斜線 (`\`) 與換行符 (`\n`)，杜絕結構性字串碰撞；(4) 補齊 `HANDBOOK.md` 第 ③ 節 `_ROLLBACK_TMP` 職責與第 ④ 節快照函式庫索引；(5) 於測試副本完成原有 10 項測試及新增 8 項安全加固測試，100% PASS。 |
| **2026-11-14** | `v2.9.2` (`feature/data-lifecycle-hardening` / 02B-8.3.2) | **每日收盤前置驗證閘門與 10.5% 雙向熔斷器實作完工**：(1) 實作 `validateDailyCloseData_` 前置驗證核心閘門，徹底回答「今天取得的行情資料是否符合寫入 RAW_HISTORY 基本條件」；(2) 實裝五層防禦防線：交易日檢核（過濾週末/國定假日）、TWII 有效性（拒絕 0/負數/空值/NaN/Infinity，嚴禁前值替代）、Yahoo `regularMarketTime` 時間戳檢驗（>= 13:30:00 且日期相符，聲明非官方收盤證明）、PreviousValidClose 檢驗與 ±10.5% 雙向熔斷器（`Math.abs(changeRate) > 0.105` 觸發安全閉鎖需人工覆核，剛好 ±10.50% 通過）；(3) 實作 `findPreviousValidClose_` 在 RAW_HISTORY Row 3~7 自動尋找最近有效收盤，並強制校驗歷史列日期嚴格遞減且無重複；(4) 完成全套 20 項驗證案例測試，20/20 全部通過；(5) 原母體與正式環境維持零修改零接觸。 |
| **2026-11-14** | `v2.9.2` (`feature/data-lifecycle-hardening` / 02B-8.3.2.2) | **PreviousValidClose 歷史資料結構完整性防護強化完工**：(1) 補強 `findPreviousValidClose_` 解決 02B-8.3.2.1 發現之 WARNING-01 歷史空白列盲區；(2) 建立前五列 (Row 3~7) 嚴格結構防線：每列必須存在有效標準日期，嚴格拒絕空白日期 (`REJECTED_HISTORY_DATE_MISSING`)、格式異常 (`REJECTED_HISTORY_DATE_INVALID`)、重複日期 (`REJECTED_HISTORY_DATE_DUPLICATE`)、日期倒置 (`REJECTED_HISTORY_DATE_ORDER`) 及深層歷史與 targetDate 衝突；(3) 明確劃分兩大穿透行為：只有在日期結構 100% 完整無損前提下，才允許 TWII 無效（0/負數/空/NaN）安全穿透至下一列取值，遇日期損毀一律 fail-closed；(4) 14 項專項測試全部通過 (14/14 PASS)，原 20 項驗證案例全數回歸通過；(5) 正式資料與策略維持零修改零接觸。 |
| **2026-11-14** | `v2.9.2` (`feature/data-lifecycle-hardening` / 02B-8.3.2.2.2) | **交易日期真實性與日曆合法性防護完工**：(1) 實作 `isValidCalendarDate_` 解決 02B-8.3.2.2.1 發現之 WARN-02（非現有日曆日如 2/30 穿透盲區）；(2) 導入嚴格日曆真實性檢驗，精準整合 400年閏/100年不閏/4年閏規則與大小月天數對照，徹底杜絕平年 2/29、2/30、4/31 等虛擬日期；(3) 於 `findPreviousValidClose_`（歷史前五列 A3:A7）與 `validateDailyCloseData_`（`targetDate` 獨立狀態 `REJECTED_TARGET_DATE_INVALID`）全面套用嚴格檢核，落實 Fail-Closed 拒絕；(4) 26 項日曆與整合測試全數通過 (26/26 PASS)，原 14 項與 20 項測試全數回歸通過；(5) 正式資料與策略維持零修改零接觸。 |
| **2026-11-14** | `v2.9.2` (`feature/data-lifecycle-hardening` / 02B-8.3.2.2.4) | **Invalid Date 防禦與日期解析例外處理完工**：(1) 解決 02B-8.3.2.2.3 發現之 WARN-02（無效 Date 物件導致 `formatDate` 拋出未處理例外）；(2) 於 `isValidCalendarDate_`、`findPreviousValidClose_` 與 `validateDailyCloseData_` 入口加入 `dateVal.getTime()` 數值與有限性前置防衛，徹底杜絕 `new Date('invalid')` 或 `new Date(NaN)` 造成未捕捉例外；(3) 嚴格區分拒絕狀態：歷史列 Invalid Date 回傳 `REJECTED_HISTORY_DATE_INVALID`（不穿透），目標日 Invalid Date 回傳 `REJECTED_TARGET_DATE_INVALID`，拒絕後立即退出絕不進入 10.5% 熔斷器；(4) 17 項專項測試全數 PASS，原有 26 項、14 項、20 項三套回歸測試 100% 通過；(5) 正式資料與策略維持零修改零接觸。 |
| **2026-11-14** | `v2.9.3` (`feature/data-lifecycle-hardening` / 02B-8.4) | **Transaction & Recovery Engine 實體驗證版完工**：(1) 雙表完整範圍保護：快照引擎全面升級保護 RAW_HISTORY A3:J5 (3x10，含 J 欄 EWT_Change) 與 HISTORY_LOG A3:K5 (3x11)；(2) 跨平台確定性密碼學與指紋：實裝 RFC 8785 規範化序列化 `canonicalSerialize_`、確定性 SHA-256 / HMAC-SHA256 與 `computeGridFingerprint_`（排除呈現層 displayValue 雜訊，嚴格區分 0 與 null、標準化 Date 時區）；(3) 終態持久收據 (Terminal Receipt as SSoT) 與滾動帳本：簽署 HMAC 交易來源簽章，實裝 `receiptIntegrityHash` 防篡改收據並建立 ScriptProperties 20 筆滾動帳本；(4) 原子提交流程 `executeTransactionCommit_`：實裝頂端插列、跨表公式原生自動位移確認、A3 備註副本備份與 DASHBOARD B12 `=INDIRECT("RAW_HISTORY!J3")` 零受損驗證；(5) 冪等復原流程 `executeTransactionRecovery_`：實裝未完成插列刪除、跨表公式原生 de-shift 還原回 A3、Pre-Fingerprint 比對與就地網格修復、短路冪等防護（絕無二次刪列）；(6) 系統中斷自癒處理器 `handleInterruptedTransaction_`：全面通過 14 大故障注入案例測試 (26/26 PASS)；(7) 真實隔離環境驗證：建立獨立隔離 Google 試算表與獨立 Apps Script 專案及 Web App 部署，全套 96 項單元與整合測試 100% 通過，正式環境零修改零接觸。 |
| **2026-11-14** | `v2.9.4` (`feature/data-lifecycle-hardening` / 02B-8.4-B) | **Transaction Engine 實體測試前阻斷問題修正**：(1) **雙表各自獨立判定插列狀態**：修正部分插列誤刪歷史資料重大缺陷，新增 `inspectRawInsertionStatus_` 與 `inspectHistInsertionStatus_`，嚴格依據儲存格 Note (`TX_PENDING:${txId}`)、目標交易日及 Row 4/Row 3 比對獨立識別，不得以一張表狀態推定另一張表；(2) **Fail-Closed 阻斷防護**：無法明確辨認列歸屬時立即拋出例外阻斷，嚴禁猜測刪列；(3) **快照保存守衛**：Recovery 刪列完成後重新讀取實體資料並校驗 Pre-Fingerprints，確認原始資料安全復原前嚴禁清除 Snapshot 工作表；(4) **HMAC 密鑰安全性強化**：正式路徑全面移除預設密鑰 fallback，未傳入有效密鑰時拋出 `HMAC_KEY_MISSING` 拒絕執行 (Fail-Closed)；隔離環境使用獨立測試密鑰；(5) **分支與隔離程式碼 100% 一致**：隔離專案 `EngineCore.gs` 完整同步分支 `Market_Engine_GAS.js` 核心邏輯；(6) **9 大故障注入套件完工**：覆蓋 RAW 部分插列、HIST 插列、雙表插列、快照未提交、中途復原重啟、重複 Recovery 等場景，單元與全引擎測試 35/35 全數通過；隔離專案部署 Version 4。 |
| **2026-11-14** | `v2.9.5` (`feature/data-lifecycle-hardening` / 02B-8.4-C) | **Recovery 證據強化與 Snapshot 完整性補正**：(1) **雙表插列辨認改用完整列證據**：`inspectRawInsertionStatus_` 以 RAW 快照 Row 3 完整 10 欄（A:J）對照實體 Row 4（+1 位移）；`inspectHistInsertionStatus_` 支援獨立接收 `rawIsInserted` 狀態，以 `shiftHistoryLogFormula_` 解耦跨表與本地公式位移，比對 HIST 快照 Row 3 完整 11 欄（A:K）對照實體 Row 4；`TX_PENDING` Note 僅作交易輔助證據，任何列內容不符或模糊情境嚴格觸發 Fail-Closed 安全阻斷，零猜測刪列；(2) **快照雙欄分離保存原始格式**：`_ROLLBACK_TMP` 實作 Col 1..10/11 保存原始數值、日期、百分比及原始 `numberFormat` 與 Note，Col 12..21/22 獨立保存純文字公式鏡像（`@`），徹底解決格式被覆蓋遺失問題；復原時完整還原公式與原始 `numberFormat`；(3) **Snapshot Integrity Hash 獨立防篡改驗證**：明確定義 Hash 涵蓋雙表網格與必要中繼資料（`transactionId`, `tradeDate`, `snapshotId`, `snapshotVersion`, `preRawFingerprint`, `preHistFingerprint`）；在寫入實體快照後重新讀回計算並驗證；在 Recovery 執行任何刪列或回滾前重新計算驗證，任一儲存格或中繼資料遭篡改時立即阻斷並保留快照；(4) **Recovery 實體重新讀取驗證**：刪列或就地覆寫完成後執行 `SpreadsheetApp.flush()`，重新讀回實體雙表資料計算 Terminal 指紋，嚴禁使用舊記憶體變數，100% 吻合 Pre-Fingerprint 後方可標記 RECOVERED 終態並清除快照；(5) **全面通過 6 大測試組 69 項驗證**：含 17 大故障注入、雙表 6 大邊界情境、3 大快照實體篡改攔截與格式保存測試，全數 69/69 PASS。 |
| **2026-11-14** | `v2.9.6` (`feature/data-lifecycle-hardening` / 02B-8.4-E) | **Recovery 判定與快照型別安全修正**：(1) **雙表插列辨認回傳 UNKNOWN 與 Fail-Closed**：`inspectRawInsertionStatus_` 與 `inspectHistInsertionStatus_` 嚴格定義 `INSERTED`、`NOT_INSERTED`、`UNKNOWN` 三態；當 Row 3 與 Row 4 同時吻合快照基準時判定 `UNKNOWN`，廢除同日重跑猜測；RAW 日期相同或 HIST 故事相同絕不得作為未插列之充分證據；Row 4 位移但內容或格式受損判定 `UNKNOWN`；Note 僅作輔助證據，與列內容衝突時判定 `UNKNOWN`；`UNKNOWN` 立即觸發 Fail-Closed，零猜測刪列、零就地覆寫；(2) **canonicalSerialize_ 消除型別碰撞 (Domain-Hardened JCS)**：導入顯式型別標籤（`n:null`, `u:undefined`, `b:bool`, `num:val`, `s:str`, `d:date`），徹底消除 `NaN` vs `"NaN"`、`Infinity` vs `"Infinity"`、`Date` vs 日期字串、`null` vs `undefined` 等型別碰撞；依 IEEE 754 語意刻意將 `-0` 規範化為 `num:0`；(3) **Recovery 徹底清除空白屬性與格式殘留**：還原就地網格屬性時無條件調用 `setNumberFormat(orig.numberFormat || '')` 與 `setNote(orig.note || '')`，確保受損或殘留格式/Note 100% 歸零清除；實體 flush 後重新計算 Pre-Fingerprint 比對無誤方可簽署 RECOVERED 收據；(4) **全面通過 7 大測試組 110 項驗證**：含 14 組成對無碰撞測試、歧義情境 UNKNOWN 阻斷、殘留屬性清空還原驗證，110/110 全數 PASS。 |
| **2026-11-14** | `v2.9.7` (`feature/data-lifecycle-hardening` / 02B-8.4-F) | **插列判定最後一道 Fail-Closed 修正**：(1) **NOT_INSERTED 充分證據重新定義**：修正以「Row 3 符合快照、Row 4 不符位移後內容」推定未插列之盲區；實體 Row 3 與 Row 4 必須各自 100% 吻合快照基準 Row 3 與 Row 4 (delta 0)，且 Row 4 絕不吻合插列位移 (delta 1)，且無任何交易 Note，方可判定 `NOT_INSERTED`；(2) **全情境 Fail-Closed 閉鎖**：實體資料列不足 (`getLastRow < 3` 或 `< 4`) 嚴格回傳 `UNKNOWN`，絕不視為未插列；Row 3 符合快照但 Row 4 單欄/多欄遭竄改、缺少資料、日期不同或內容異常時，全面回傳 `UNKNOWN`；(3) **Recovery 入口零副作用保證**：Recovery 接收到任何表之 `UNKNOWN` 狀態時，於執行刪列前立即中斷拋出阻斷例外，保證雙表零刪列、零儲存格覆寫、零收據簽發、Snapshot 實體現場 100% 完整保留；(4) **全面通過 8 大測試組 142 項驗證**：新增 Cases 35~40 專項測試，全數 142/142 PASS。 |
| **2026-11-14** | `v2.9.8` (`feature/data-lifecycle-hardening` / 02B-8.4-G) | **Recovery 呼叫鏈與跨表位移安全性審查**：(1) **RAW → HIST 三態顯式傳遞**：`inspectHistInsertionStatus_` 將舊有布林參數全面重構為嚴格三態參數 `rawInsertionStatus`（`'INSERTED'`, `'NOT_INSERTED'`, `'UNKNOWN'`）；若接收到 `'UNKNOWN'` 拋出 `HIST_INSPECTION_BLOCKED_RAW_STATUS_UNKNOWN` 立即短路中止，若為非法/未定義值拋出 `HIST_INSPECTION_BLOCKED_INVALID_RAW_STATUS`，嚴禁任何將 UNKNOWN 誤推定為 delta 0 之漏洞；(2) **Recovery 順序呼叫鏈確立**：建立 RAW 獨立判定 → Fail-Closed 短路守衛 → HIST 依已確認 RAW 狀態獨立判定 → 雙表獨立刪列 → 實體 Pre-Fingerprint 重讀驗證之不可逆單向呼叫鏈，RAW UNKNOWN 時保證零呼叫 HIST、零刪列、零覆寫；(3) **公式位移安全閘門與語法加固**：實作 `validateFormulaSafety_` 攔截 `#REF!` 等錯誤碼、未閉合引號與括號不平衡；`shiftFormulaRows_` 新增 `(?!\s*\()` 負向前瞻，徹底解決 `LOG10(`、`DEC2BIN(` 等函數名稱數字被誤置換問題；雙引號字串常數（`"..."`）與單引號工作表前綴（`'RAW_HISTORY'!`）精確分離；(4) **全面通過 9 大測試組 195 項驗證**：新增 Cases 41~47 專項測試，全數 195/195 PASS。 |
| **2026-11-15** | `v2.9.9` (`feature/data-lifecycle-hardening` / ANTI-83411) | **盤後資料正確性修復與真實環境驗證準備 (ANTI-83411)**：(1) **先取得行情再修改試算表**：徹底翻轉未取行情先插列之舊制，先調用 `fetchRealMarketData({ ignoreCache: true })` 取得最新行情，通過檢驗後才允許更動試算表；(2) **TWII 資料來源限制宣告**：明確揭露行情來自 Yahoo Finance 第三方 API，非臺灣證券交易所官方結算證明，不具法定收盤憑證效力；`fetchRealMarketData` 額外萃取日線 `twiiClose` 與交易時段結束時間戳；(3) **VIX 資料日期辨識與 Stale 狀態標示**：提取 VIX 日線實際美股交易日 `vixTradeDate` 與時區，若與台股目標日不符，保留可用數值但於 `RAW_HISTORY` Row 3 Col 3 註解顯式標註 `[STALE: 前一美股收盤，非台股同日]`，絕不將美股前日冒充為當日 VIX，既有策略與回測公式 100% 零破壞；(4) **跨工作表寫入最小防呆方案**：實作寫入前雙表頂部基準列日期對稱檢查（`rawLastDate === histLastDate`），不一致時立即阻斷（`PRE_WRITE_ASYMMETRY_DETECTED`）；寫入過程包覆獨立 try-catch，中途中斷立即停止後續所有 AI 導航與回測流程（`WRITE_ABORTED_MIDWAY`）；寫入後強制執行對稱性與收盤價核對（`POST_WRITE_VERIFICATION_FAILED`），不引進大型複雜架構；(5) **測試驗證全數通過**：22 項專項測試（含 9 大基礎場景與 ANTI-83411 專項測試）22/22 100% PASS，全套 195 項 02B-8.4 測試無回歸。 |
| **2026-11-15** | `v2.9.10` (`feature/data-lifecycle-hardening` / ANTI-83412) | **雙表空白列中斷情境防呆確認 (ANTI-83412)**：(1) **漏洞根因識別**：發現前置不對稱檢查 `rawLastDate !== histLastDate` 在「雙表插列後未寫入即中斷」時，因 `"" !== ""` 為 false 而失靈，造成下一次執行二度插列；(2) **最小防呆實作**：於 Step 4 新增 4.1 步檢查 `rawLastDate === '' || histLastDate === ''`，偵測到空白即判定 `PRE_WRITE_BLANK_ROW_DETECTED` 立即阻斷，嚴禁二度插列與資料覆寫；(3) **測試全數通過**：新增 Case 15 中斷情境專項測試，23/23 通過，全引擎 195 測試無回歸。 |
| **2026-11-15** | `v2.9.11` (`feature/data-lifecycle-hardening` / ANTI-83413) | **隔離 Google Sheets 真實環境實測 (ANTI-83413)**：(1) **實測環境鎖定**：鎖定獨立測試試算表 `19PdpErWxYAbB1Alb6g8Lz18QbuxLWLldCSnFVaHAlmI` 與獨立 GAS 專案 `1b1eRx8B22A6wdnvhEbxxooCCZds4_QBmFBHSzL5c_hI2Jx3JwjRKpJTp`，正式環境 100% 零修改零接觸；(2) **9 大項目全面驗證**：真實 Yahoo Finance API 連線抓取、TWII/VIX 辨識、RAW/HIST Row 3 寫入與跨表公式位移、VIX Note 呈現、flush 讀回驗證、執行耗時 230ms（遠低於 6 分鐘限制）、重複執行冪等防護（零二次插列）、中斷防呆攔截阻斷，9 大項目 9/9 100% PASS。 |
| **2026-11-15** | `v2.9.12` (`feature/data-lifecycle-hardening` / ANTI-83414) | **VIX 時間基準與前視偏誤修正 (ANTI-83414)**：(1) **前視偏誤根除**：美股當日收盤於台北時間次日清晨（04:15~05:15）方結算，台股 13:30 收盤時美股尚未開盤；確立台股交易日 `T` 基準時，VIX 必須嚴格符合 `資料產生時間 <= 台股收盤時間 (T 13:30:00)`；(2) **自動回退機制**：`fetchRealMarketData` 改採 `range=5d` 取得日線 bars；`validateAfternoonMarketData_` 遇 `vixTradeDate >= targetDateStr` 自動向前檢索回退至台股 13:30 前已結算之最新美股交易日（如台股 11-13 自動選取美股 11-12 收盤 18.70，嚴禁使用 11-13 未來資料 19.30）；(3) **單一未來報價阻斷**：無歷史 bars 可回退且單一報價晚於台股基準時，拋出 `REJECTED_VIX_LOOKAHEAD_VIOLATION` 嚴格阻斷；(4) **透明時區 Note 標記**：註解載明美股交易日、原生交易所時區（`America/Chicago`）與台北產生時間（如 `2026-11-13 05:15:00`），時序因果完全可追溯；(5) **測試驗證全數通過**：6 大專項測試 7/7 100% PASS，23 項盤後測試 100% PASS，195 項全引擎回歸 100% PASS；隔離專案部署 Version 9。 |
| **2026-11-15** | `v2.9.13` (`feature/data-lifecycle-hardening` / ANTI-83415) | **VIX 夏令時間換算動態化與歷史前視偏誤全面清查 (ANTI-83415)**：(1) **動態夏令時間換算實作**：徹底移除全年固定 UTC+8 `05:15:00` 計算，新增 `resolveVixBarCloseTiming_` 函式；優先採用 Yahoo 日線 bar 的實際 epoch timestamp (`epochSec` / `closeEpochMs`)；無時間戳時依美股交易所時區動態辨識 CDT/EDT 夏令（台北次日 `04:15:00`，UTC 20:15）與 CST/EST 冬令（台北次日 `05:15:00`，UTC 21:15）；(2) **時間戳直接毫秒比對**：全面以 `closeEpochMs <= twCutoffMs` (台股 13:30:00) 嚴格判定時序先後；(3) **歷史資料前視偏誤清查**：對全歷史 7,122 筆交易日進行全面時序審查，確認既有同日曆日配對（`twDate === usDate`）存在 100%（6,893 筆）前視偏誤；如 2020-03-16 誤用美股當日收盤 82.69（14.75 小時後才產生），非前視合規應採用前一美股收盤 57.83（差距高達 24.86 點）；(4) **最小歷史修正方案**：提出非破壞性影子對比欄位方案，嚴格遵行唯讀原則，未經確認絕不批次修改正式或隔離歷史；(5) **測試驗證全數通過**：夏冬令專項測試 7/7 100% PASS、83414 專項測試 7/7 100% PASS、23 項盤後測試 100% PASS、195 項全引擎回歸 100% PASS；隔離專案部署 Version 10。 |
| **2026-11-15** | `v2.9.14` (`feature/data-lifecycle-hardening` / ANTI-83417~83418) | **VIX / EWT 歷史依賴徹底解除與即時觀測解耦實作 (ANTI-83418)**：(1) **核心原則落地**：VIX、EWT 定位為當下海外市場觀察指標，徹底與 Market Engine 歷史資料庫 (`RAW_HISTORY` / `HISTORY_LOG`) 解耦，不作為歷史決策模型的輸入資料，不參與歷史校準；(2) **盤後更新閘門重構**：`validateAfternoonMarketData_` 與 `updateAfternoonMarketEngine` 僅以 TWII 收盤資料與交易日作為歷史寫入門檻，VIX 缺漏、零值或未來報價不阻斷歷史更新；停止向 `RAW_HISTORY` 新列 C 欄寫入 VIX 與 Note、停止向 J 欄寫入 EWT；停止向 `HISTORY_LOG` 新列 E 欄注入 `=RAW_HISTORY!C3` 公式（留空）；既有歷史數據 100% 原始保留，不刪除、不回填、不重算；(3) **完整性驗證相容升級**：`validateEngineDataAndFormulaIntegrity_` 允許新列 C 欄、J 欄與 `HISTORY_LOG!E3` 公式為空，同時嚴密捍衛 `DASHBOARD!B12` 原公式 `=INDIRECT("RAW_HISTORY!J3")` 零受損；(4) **Calibration Lab 歷史解耦**：移除 `calculateCalibrationWindows`、`buildCalibrationWindowsResult`、`getFallbackCalibrationWindows` 及 UI 前端差異表之 VIX 分位數計算與卡片，回歸 Dist60 / Dist240 雙核心位階門檻；(5) **即時海外觀測獨立運作**：海外觀測卡片直接使用 `OVERSEAS_OBSERVATION_JSON`，完整保留即時數值、實際交易日、原生時區與 Stale 狀態；(6) **測試驗證全數通過**：ANTI-83418 專項測試 73/73 100% PASS，02B-8.4 全引擎 195 項回歸測試 100% PASS。 |
| **2026-11-15** | `v2.9.15` (`feature/data-lifecycle-hardening` / ANTI-83419) | **83418 驗收缺口補測與隔離試算表實測 (ANTI-83419)**：(1) **舊測試失敗根因查明與過時標記退役**：查明 ANTI-83414 (Tests 1.1, 5) 與 ANTI-83415 (Test 6) 退出碼 1 為「斷言舊有歷史寫入與阻斷行為」所致；依 ANTI-83418 解耦規則明確標記退役，改為驗證解耦後留空與非阻斷行為，兩大專項測試恢復 100% PASS (7/7, 7/7)；(2) **隔離 Google Sheets 7 大項目實測全數通過**：於隔離試算表模型驗證合法 TWII 且無 VIX/EWT 時成功歸檔 (列數 5->6)、VIX 異常/未來報價零阻擋 TWII、RAW_HISTORY 新列 C/J 欄及 Note 嚴格保持空白、HISTORY_LOG 新列 E 欄保持空白公式、均線/乖離率/位階公式正常維護、即時海外觀測快取正常讀取、DASHBOARD!B12 原樣保留且完整性驗證通過，9/9 100% PASS；(3) **執行限制嚴格遵守**：零 commit、零 push、零 merge、零正式環境碰觸。 |
| **2026-11-15** | `v2.9.15` (`main` / 正式環境部署升級) | **正式環境發布與完整生命週期加固合併 (ANTI-83411~83419 驗收上線)**：(1) **正式分支合併**：`feature/data-lifecycle-hardening` 以 Fast-forward 完整合併至 `main` 分支（Git Commit `c1efb8f`）；(2) **正式 GAS 部署升級**：透過 `.claspignore` 白名單安全機制（僅推送 `appsscript.json`、`index.html`、`Market_Engine_GAS.js`、`verify_api.js` 4 大檔案），正式 Web App 部署更新至 **Version 153 (`@153`)**，完整保留原部署 **Version 152 (`@152`)** 作為即時回滾基準；(3) **正式線上驗收確認**：Web App 端點實測 HTTP 200 OK，正式讀取 2026-11-13 收盤 43,675.12、Dist60 -5.52%、Dist240 +35.74%、位階「極度恐慌」；歷史 VIX 安全解耦（回傳 N/A，不回填歷史），Calibration Lab 前端已完全移除 VIX 歷史分位數，DASHBOARD!B12 嚴格維持原公式 `=INDIRECT("RAW_HISTORY!J3")`；(4) 全套 291 項單元與整合測試 100% PASS。 |
| **2026-11-15** | `v2.9.16` (`main` / 正式環境 Web App `@154`) | **VIX / EWT 前端顯示與更新快取加固 (ANTI-83420)**：(1) **更新成功**：顯示最新成功取得的交易日與數值（如 18.70、+0.13%）及「最新有效觀測」標籤；(2) **更新失敗**：嚴格保留並顯示最後一次成功取得的交易日與數值，禁止因更新失敗而清空資料或顯示 N/A；(3) **非最新警示標註**：顯式標記「最後有效交易日：YYYY-MM-DD」與「⚠️ 本次更新失敗，以下為最後有效資料」；(4) **獨立互不干擾**：VIX 與 EWT 各自獨立判定與顯示；(5) **無資料防護**：僅在系統從未取得過有效資料時顯示「尚無可用資料」；(6) **快取雙重保護**：後端 `saveOverseasObservation_` 與前端獨立本地持久化快取（`MARKET_ENGINE_LAST_VALID_VIX/EWT`），杜絕後續空值沖刷抹除；GAS Web App 部署升級至 **Version 154 (`@154`)**。 |
