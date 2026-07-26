/**
 * Market Engine V3 - 整合型 Google Sheet 自動建置與維護腳本
 * Single Source of Truth 架構：市場觀察 + MARKET LAB 合一
 */

/**
 * 試算表開啟時自動建立自訂選單
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('🚀 Market Engine V3')
    .addItem('建置/初始化所有分頁 (Full Setup)', 'setupMarketEngineV3')
    .addSeparator()
    .addItem('更新/套用計算公式與樣式', 'applyFormulasAndStyles')
    .addItem('寫入範例歷史測試數據', 'seedSampleData')
    .addToUi();
}

/**
 * 主要建置函式：建立或重設 6 個結構化分頁
 */
function setupMarketEngineV3() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // 1. 建立 THRESHOLD_CONFIG (門檻對照表 - 優先建立作為 reference)
  const configSheet = setupSheet(ss, 'THRESHOLD_CONFIG', 10, 10);
  buildThresholdConfigSheet(configSheet);
  
  // 2. 建立 RAW_HISTORY (基礎歷史數據)
  const rawSheet = setupSheet(ss, 'RAW_HISTORY', 100, 7);
  buildRawHistorySheet(rawSheet);
  
  // 3. 寫入範例歷史數據
  seedSampleData(rawSheet);

  // 4. 建立 HISTORY_LOG (歷史位階日誌)
  const historyLogSheet = setupSheet(ss, 'HISTORY_LOG', 100, 9);
  buildHistoryLogSheet(historyLogSheet);

  // 5. 建立 LAB_BACKTEST (門檻驗證與回測)
  const backtestSheet = setupSheet(ss, 'LAB_BACKTEST', 20, 6);
  buildLabBacktestSheet(backtestSheet);

  // 6. 建立 DASHBOARD (日常觀察儀表板)
  const dashboardSheet = setupSheet(ss, 'DASHBOARD', 30, 8);
  buildDashboardSheet(dashboardSheet);

  // 7. 建立 DECISION_LOG (交易決策紀錄)
  const decisionLogSheet = setupSheet(ss, 'DECISION_LOG', 50, 6);
  buildDecisionLogSheet(decisionLogSheet);

  // 將 DASHBOARD 移至第一個分頁並啟用
  ss.setActiveSheet(dashboardSheet);
  ss.moveActiveSheet(1);

  SpreadsheetApp.getUi().alert('✅ Market Engine V3 6大分頁建置完成！\n已成功寫入基礎結構、白話文說明與自動化計算公式。');
}

/**
 * 取得或新建指定名稱的分頁
 */
function setupSheet(ss, name, rows, cols) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }
  return sheet;
}

/**
 * 設定標頭 Banner (第1列白話文說明)
 */
function setHeaderBanner(sheet, text, lastColChar, bgColor = '#1e293b') {
  sheet.getRange(`A1:${lastColChar}1`).merge();
  const range = sheet.getRange('A1');
  range.setValue(text);
  range.setBackground(bgColor);
  range.setFontColor('#ffffff');
  range.setFontWeight('bold');
  range.setFontSize(11);
  range.setVerticalAlignment('middle');
  sheet.setRowHeight(1, 38);
}

/**
 * 設定標準表格標頭 (第2列)
 */
function setTableHeader(sheet, rangeStr, headers, bgColor = '#334155') {
  const range = sheet.getRange(rangeStr);
  range.setValues([headers]);
  range.setBackground(bgColor);
  range.setFontColor('#ffffff');
  range.setFontWeight('bold');
  range.setHorizontalAlignment('center');
  range.setVerticalAlignment('middle');
  sheet.setRowHeight(2, 28);
}

// ==========================================
// 1. THRESHOLD_CONFIG (門檻對照表)
// ==========================================
function buildThresholdConfigSheet(sheet) {
  setHeaderBanner(
    sheet, 
    '【位階門檻參數對照表】定義市場五大位階門檻及配置比例。全檔所有分頁（DASHBOARD, HISTORY_LOG, LAB_BACKTEST）統一參照本表 (Single Source of Truth)。', 
    'I', 
    '#0f172a'
  );

  setTableHeader(
    sheet, 
    'A3:I3', 
    ['位階代號', '位階名稱', 'Dist60 下限', 'Dist60 上限', 'Dist240 下限', 'Dist240 上限', '建議股票%', '建議現金%', '策略建議與行動指引'], 
    '#1e293b'
  );

  sheet.getRange('A2:I2').merge().setValue('📊 市場五大位階門檻與資產配置矩陣')
       .setFontWeight('bold').setFontSize(12).setBackground('#f1f5f9').setFontColor('#0f172a');
  sheet.setRowHeight(2, 30);

  const data = [
    ['T1', '極度恐慌', -9.99, -0.10, -9.99, -0.15, 0.90, 0.10, '市場呈現極度恐慌，股價大幅低於均線。建議分批強力加碼大盤與優質權值股。'],
    ['T2', '恐慌', -0.10, -0.03, -0.15, -0.05, 0.75, 0.25, '市場偏向低迷。建議維持中高持股水位，定期定額或逢低分批加碼。'],
    ['T3', '順風/中性', -0.03, 0.05, -0.05, 0.10, 0.55, 0.45, '市場處於正常中性/溫和通道。建議續抱核心部位，維持標準再平衡機制。'],
    ['T4', '過熱', 0.05, 0.12, 0.10, 0.20, 0.35, 0.65, '市場氣氛過熱。建議分批獲利了結高波段部位，提高現金水位備戰。'],
    ['T5', '狂熱', 0.12, 9.99, 0.20, 9.99, 0.15, 0.85, '市場情緒進入狂熱階段。建議嚴格控管風險，僅保留長期核心部位，大幅提升現金。']
  ];

  const range = sheet.getRange('A4:I8');
  range.setValues(data);

  // 格式化數字
  sheet.getRange('C4:F8').setNumberFormat('+0.00%;-0.00%;0.00%');
  sheet.getRange('G4:H8').setNumberFormat('0%');

  // 底色標記
  const rowColors = ['#dcfce7', '#e0f2fe', '#f8fafc', '#ffedd5', '#fee2e2'];
  for (let i = 0; i < rowColors.length; i++) {
    sheet.getRange(`A${4+i}:I${4+i}`).setBackground(rowColors[i]);
  }

  // 欄寬自訂
  sheet.setColumnWidth(1, 80);
  sheet.setColumnWidth(2, 110);
  sheet.setColumnWidth(3, 100);
  sheet.setColumnWidth(4, 100);
  sheet.setColumnWidth(5, 100);
  sheet.setColumnWidth(6, 100);
  sheet.setColumnWidth(7, 90);
  sheet.setColumnWidth(8, 90);
  sheet.setColumnWidth(9, 420);
}

// ==========================================
// 2. RAW_HISTORY (基礎歷史數據)
// ==========================================
function buildRawHistorySheet(sheet) {
  setHeaderBanner(
    sheet, 
    '【基礎歷史數據】存放台股 (TWII) 收盤價、VIX 恐慌指數、MA60 (季線) 與 MA240 (年線)，並自動計算季線與年線乖離率 (Dist60 / Dist240)。', 
    'G', 
    '#1e293b'
  );

  setTableHeader(
    sheet, 
    'A2:G2', 
    ['Date', 'TWII (收盤)', 'VIX', 'MA60 (季線)', 'MA240 (年線)', 'Dist60 (季線乖離)', 'Dist240 (年線乖離)'], 
    '#334155'
  );

  // 公式範例設定 (套用到前 100 行)
  const maxRow = 100;
  const formulasF = [];
  const formulasG = [];
  for (let i = 3; i <= maxRow; i++) {
    formulasF.push([`=IF(AND(ISNUMBER(B${i}), ISNUMBER(D${i}), D${i}>0), (B${i}-D${i})/D${i}, "")`]);
    formulasG.push([`=IF(AND(ISNUMBER(B${i}), ISNUMBER(E${i}), E${i}>0), (B${i}-E${i})/E${i}, "")`]);
  }
  sheet.getRange(`F3:F${maxRow}`).setFormulas(formulasF);
  sheet.getRange(`G3:G${maxRow}`).setFormulas(formulasG);

  // 數字格式
  sheet.getRange(`A3:A${maxRow}`).setNumberFormat('yyyy-mm-dd');
  sheet.getRange(`B3:B${maxRow}`).setNumberFormat('#,##0.00');
  sheet.getRange(`C3:C${maxRow}`).setNumberFormat('0.00');
  sheet.getRange(`D3:E${maxRow}`).setNumberFormat('#,##0.00');
  sheet.getRange(`F3:G${maxRow}`).setNumberFormat('+0.00%;-0.00%;0.00%');

  sheet.setColumnWidth(1, 110);
  sheet.setColumnWidth(2, 120);
  sheet.setColumnWidth(3, 80);
  sheet.setColumnWidth(4, 120);
  sheet.setColumnWidth(5, 120);
  sheet.setColumnWidth(6, 130);
  sheet.setColumnWidth(7, 130);
}

// 寫入範例測試數據
function seedSampleData(sheet) {
  const targetSheet = sheet || SpreadsheetApp.getActiveSpreadsheet().getSheetByName('RAW_HISTORY');
  if (!targetSheet) return;

  const sampleData = [
    [new Date('2026-07-24'), 23500, 16.5, 22800, 21000],
    [new Date('2026-07-23'), 23350, 17.2, 22750, 20950],
    [new Date('2026-07-22'), 23100, 18.0, 22700, 20900],
    [new Date('2026-07-21'), 22800, 19.5, 22650, 20850],
    [new Date('2026-07-20'), 22400, 21.0, 22600, 20800],
    [new Date('2026-07-17'), 21900, 24.5, 22550, 20750],
    [new Date('2026-07-16'), 20200, 29.0, 22500, 20700],
    [new Date('2026-07-15'), 19800, 32.5, 22450, 20650],
    [new Date('2026-07-14'), 20100, 30.0, 22400, 20600],
    [new Date('2026-07-13'), 21500, 22.0, 22350, 20550]
  ];

  targetSheet.getRange(3, 1, sampleData.length, 5).setValues(sampleData);
}

// ==========================================
// 3. HISTORY_LOG (歷史位階日誌)
// ==========================================
function buildHistoryLogSheet(sheet) {
  setHeaderBanner(
    sheet, 
    '【歷史位階日誌】記錄每日市場指標與位階判定結果，邏輯與 DASHBOARD 完全一致，便於觀察位階轉折點與趨勢。', 
    'I', 
    '#1e293b'
  );

  setTableHeader(
    sheet, 
    'A2:I2', 
    ['Date', 'TWII', 'Dist60 (季線乖離)', 'Dist240 (年線乖離)', 'VIX', '今日位階', '建議股票%', '建議現金%', '1年期前瞻報酬率'], 
    '#334155'
  );

  const maxRow = 100;
  const formulas = [];

  for (let i = 3; i <= maxRow; i++) {
    const rawRow = i;
    formulas.push([
      `=RAW_HISTORY!A${rawRow}`,
      `=RAW_HISTORY!B${rawRow}`,
      `=RAW_HISTORY!F${rawRow}`,
      `=RAW_HISTORY!G${rawRow}`,
      `=RAW_HISTORY!C${rawRow}`,
      `=IF(ISBLANK(A${i}), "", IFS(OR(C${i}<THRESHOLD_CONFIG!$D$4, D${i}<THRESHOLD_CONFIG!$F$4), THRESHOLD_CONFIG!$B$4, OR(C${i}<THRESHOLD_CONFIG!$D$5, D${i}<THRESHOLD_CONFIG!$F$5), THRESHOLD_CONFIG!$B$5, AND(C${i}>=THRESHOLD_CONFIG!$C$6, C${i}<=THRESHOLD_CONFIG!$D$6), THRESHOLD_CONFIG!$B$6, OR(C${i}>THRESHOLD_CONFIG!$C$7, D${i}>THRESHOLD_CONFIG!$E$7), THRESHOLD_CONFIG!$B$7, TRUE, THRESHOLD_CONFIG!$B$8))`,
      `=IF(ISBLANK(F${i}), "", VLOOKUP(F${i}, THRESHOLD_CONFIG!$B$4:$I$8, 6, FALSE))`,
      `=IF(ISBLANK(F${i}), "", VLOOKUP(F${i}, THRESHOLD_CONFIG!$B$4:$I$8, 7, FALSE))`,
      `=IF(AND(ISNUMBER(B${i}), ISNUMBER(OFFSET(B${i}, -252, 0)), B${i}>0), (B${i}-OFFSET(B${i}, -252, 0))/OFFSET(B${i}, -252, 0), "")`
    ]);
  }

  sheet.getRange(`A3:I${maxRow}`).setFormulas(formulas);

  // 格式
  sheet.getRange(`A3:A${maxRow}`).setNumberFormat('yyyy-mm-dd');
  sheet.getRange(`B3:B${maxRow}`).setNumberFormat('#,##0.00');
  sheet.getRange(`C3:D${maxRow}`).setNumberFormat('+0.00%;-0.00%;0.00%');
  sheet.getRange(`E3:E${maxRow}`).setNumberFormat('0.00');
  sheet.getRange(`G3:H${maxRow}`).setNumberFormat('0%');
  sheet.getRange(`I3:I${maxRow}`).setNumberFormat('+0.00%;-0.00%;0.00%');

  sheet.setColumnWidth(1, 110);
  sheet.setColumnWidth(2, 110);
  sheet.setColumnWidth(3, 130);
  sheet.setColumnWidth(4, 130);
  sheet.setColumnWidth(5, 80);
  sheet.setColumnWidth(6, 120);
  sheet.setColumnWidth(7, 90);
  sheet.setColumnWidth(8, 90);
  sheet.setColumnWidth(9, 130);
}

// ==========================================
// 4. LAB_BACKTEST (門檻驗證與回測)
// ==========================================
function buildLabBacktestSheet(sheet) {
  setHeaderBanner(
    sheet, 
    '【門檻驗證與歷史回測】自動統計歷史數據中各位階出現的天數分佈、佔比，以及持有一年 (252交易日) 後的前瞻平均報酬率與勝率。', 
    'F', 
    '#1e1b4b'
  );

  sheet.getRange('A2:F2').merge().setValue('📈 歷史位階分佈與 1 年期前瞻績效回測統計')
       .setFontWeight('bold').setFontSize(12).setBackground('#f1f5f9').setFontColor('#1e1b4b');

  setTableHeader(
    sheet, 
    'A3:F3', 
    ['位階名稱', '歷史天數 (Count)', '天數佔比 (%)', '1年期平均報酬率 (%)', '1年期正報酬勝率 (%)', '驗證說明與結論'], 
    '#312e81'
  );

  const tiers = [
    ['極度恐慌', '=COUNTIF(HISTORY_LOG!$F$3:$F, A4)', '=IF($B$9>0, B4/$B$9, 0)', '=IFERROR(AVERAGEIF(HISTORY_LOG!$F$3:$F, A4, HISTORY_LOG!$I$3:$I), "N/A")', '=IFERROR(COUNTIFS(HISTORY_LOG!$F$3:$F, A4, HISTORY_LOG!$I$3:$I, ">0")/MAX(1, B4), "N/A")', '歷史長線勝率極高，大盤超跌區'],
    ['恐慌', '=COUNTIF(HISTORY_LOG!$F$3:$F, A5)', '=IF($B$9>0, B5/$B$9, 0)', '=IFERROR(AVERAGEIF(HISTORY_LOG!$F$3:$F, A5, HISTORY_LOG!$I$3:$I), "N/A")', '=IFERROR(COUNTIFS(HISTORY_LOG!$F$3:$F, A5, HISTORY_LOG!$I$3:$I, ">0")/MAX(1, B5), "N/A")', '具備優良風險報酬比，適合定額加碼'],
    ['順風/中性', '=COUNTIF(HISTORY_LOG!$F$3:$F, A6)', '=IF($B$9>0, B6/$B$9, 0)', '=IFERROR(AVERAGEIF(HISTORY_LOG!$F$3:$F, A6, HISTORY_LOG!$I$3:$I), "N/A")', '=IFERROR(COUNTIFS(HISTORY_LOG!$F$3:$F, A6, HISTORY_LOG!$I$3:$I, ">0")/MAX(1, B6), "N/A")', '常態分佈分區，隨大盤長期成長'],
    ['過熱', '=COUNTIF(HISTORY_LOG!$F$3:$F, A7)', '=IF($B$9>0, B7/$B$9, 0)', '=IFERROR(AVERAGEIF(HISTORY_LOG!$F$3:$F, A7, HISTORY_LOG!$I$3:$I), "N/A")', '=IFERROR(COUNTIFS(HISTORY_LOG!$F$3:$F, A7, HISTORY_LOG!$I$3:$I, ">0")/MAX(1, B7), "N/A")', '回檔風險提高，前瞻報酬吸引力下降'],
    ['狂熱', '=COUNTIF(HISTORY_LOG!$F$3:$F, A8)', '=IF($B$9>0, B8/$B$9, 0)', '=IFERROR(AVERAGEIF(HISTORY_LOG!$F$3:$F, A8, HISTORY_LOG!$I$3:$I), "N/A")', '=IFERROR(COUNTIFS(HISTORY_LOG!$F$3:$F, A8, HISTORY_LOG!$I$3:$I, ">0")/MAX(1, B8), "N/A")', '極高修正風險，宜防守現金']
  ];

  sheet.getRange('A4:F8').setFormulas(tiers.map(r => [r[0], r[1], r[2], r[3], r[4], r[5]]));
  // A欄設定純文字
  for (let r = 0; r < 5; r++) {
    sheet.getRange(4 + r, 1).setValue(tiers[r][0]);
  }

  // 合計列
  sheet.getRange('A9').setValue('合計 (Total)').setFontWeight('bold');
  sheet.getRange('B9').setFormula('=SUM(B4:B8)').setFontWeight('bold');
  sheet.getRange('C9').setFormula('=SUM(C4:C8)').setFontWeight('bold');
  sheet.getRange('A9:F9').setBackground('#e0e7ff');

  // 格式
  sheet.getRange('B4:B9').setNumberFormat('#,##0');
  sheet.getRange('C4:C9').setNumberFormat('0.0%');
  sheet.getRange('D4:E8').setNumberFormat('+0.00%;-0.00%;0.00%');

  sheet.setColumnWidth(1, 120);
  sheet.setColumnWidth(2, 140);
  sheet.setColumnWidth(3, 110);
  sheet.setColumnWidth(4, 160);
  sheet.setColumnWidth(5, 160);
  sheet.setColumnWidth(6, 280);
}

// ==========================================
// 5. DASHBOARD (日常觀察儀表板)
// ==========================================
function buildDashboardSheet(sheet) {
  setHeaderBanner(
    sheet, 
    '【日常觀察儀表板】即時抓取最新一筆 RAW_HISTORY 數據，套用 THRESHOLD_CONFIG 門檻，顯示今日正確的市場位階與策略建議。', 
    'E', 
    '#0f172a'
  );

  // 區塊 1: 市場最新數據概覽
  sheet.getRange('A3:E3').merge().setValue('📊 市場最新數據概覽 (Latest Market Indicators)')
       .setFontWeight('bold').setFontSize(12).setBackground('#1e293b').setFontColor('#ffffff');

  setTableHeader(sheet, 'A4:E4', ['指標名稱', '最新數值', '參考指標', '單項狀態', '備註說明'], '#334155');

  const metrics = [
    ['最新資料日期', '=INDEX(RAW_HISTORY!A3:A, COUNTA(RAW_HISTORY!A3:A))', 'Trading Date', '最新交易日', '自動同步 RAW_HISTORY'],
    ['台股收盤 (TWII)', '=INDEX(RAW_HISTORY!B3:B, COUNTA(RAW_HISTORY!A3:A))', '加權指數', '市場價格', '即時收盤價'],
    ['季線乖離率 (Dist60)', '=INDEX(RAW_HISTORY!F3:F, COUNTA(RAW_HISTORY!A3:A))', 'MA60 季線', '=IF(B7<0, "偏低/恐慌", "偏高/熱絡")', '中短期位階指標'],
    ['年線乖離率 (Dist240)', '=INDEX(RAW_HISTORY!G3:G, COUNTA(RAW_HISTORY!A3:A))', 'MA240 年線', '=IF(B8<0, "偏低/恐慌", "偏高/熱絡")', '中長期趨勢指標'],
    ['VIX 恐慌指數', '=INDEX(RAW_HISTORY!C3:C, COUNTA(RAW_HISTORY!A3:A))', 'VIX Index', '=IF(B9>=30, "🚨 恐慌爆發", IF(B9>=20, "⚠️ 警戒", "✅ 平穩"))', '市場波動度情緒']
  ];

  for (let i = 0; i < metrics.length; i++) {
    const row = 5 + i;
    sheet.getRange(`A${row}`).setValue(metrics[i][0]).setFontWeight('bold');
    sheet.getRange(`B${row}`).setFormula(metrics[i][1]);
    sheet.getRange(`C${row}`).setValue(metrics[i][2]);
    sheet.getRange(`D${row}`).setFormula(metrics[i][3]);
    sheet.getRange(`E${row}`).setValue(metrics[i][4]);
  }

  sheet.getRange('B5').setNumberFormat('yyyy-mm-dd');
  sheet.getRange('B6').setNumberFormat('#,##0.00');
  sheet.getRange('B7:B8').setNumberFormat('+0.00%;-0.00%;0.00%');
  sheet.getRange('B9').setNumberFormat('0.00');

  // 區塊 2: 今日位階與策略建議
  sheet.getRange('A11:E11').merge().setValue('🎯 今日市場位階與配置決策卡片')
       .setFontWeight('bold').setFontSize(12).setBackground('#0284c7').setFontColor('#ffffff');

  sheet.getRange('A12').setValue('今日市場位階').setFontWeight('bold');
  sheet.getRange('B12:E12').merge().setFormula(
    '=IFS(OR(B7<THRESHOLD_CONFIG!D4, B8<THRESHOLD_CONFIG!F4), THRESHOLD_CONFIG!B4, OR(B7<THRESHOLD_CONFIG!D5, B8<THRESHOLD_CONFIG!F5), THRESHOLD_CONFIG!B5, AND(B7>=THRESHOLD_CONFIG!C6, B7<=THRESHOLD_CONFIG!D6), THRESHOLD_CONFIG!B6, OR(B7>THRESHOLD_CONFIG!C7, B8>THRESHOLD_CONFIG!E7), THRESHOLD_CONFIG!B7, TRUE, THRESHOLD_CONFIG!B8)'
  ).setFontWeight('bold').setFontSize(14).setHorizontalAlignment('center').setBackground('#e0f2fe').setFontColor('#0369a1');

  sheet.getRange('A13').setValue('建議股票部位 %').setFontWeight('bold');
  sheet.getRange('B13').setFormula('=VLOOKUP(B12, THRESHOLD_CONFIG!$B$4:$I$8, 6, FALSE)').setNumberFormat('0%').setFontWeight('bold');

  sheet.getRange('A14').setValue('建議現金部位 %').setFontWeight('bold');
  sheet.getRange('B14').setFormula('=VLOOKUP(B12, THRESHOLD_CONFIG!$B$4:$I$8, 7, FALSE)').setNumberFormat('0%').setFontWeight('bold');

  sheet.getRange('A15').setValue('核心策略行動指引').setFontWeight('bold');
  sheet.getRange('B15:E15').merge().setFormula('=VLOOKUP(B12, THRESHOLD_CONFIG!$B$4:$I$8, 8, FALSE)')
       .setWrap(true).setBackground('#f8fafc').setFontWeight('bold');

  sheet.setColumnWidth(1, 160);
  sheet.setColumnWidth(2, 160);
  sheet.setColumnWidth(3, 140);
  sheet.setColumnWidth(4, 140);
  sheet.setColumnWidth(5, 240);
}

// ==========================================
// 6. DECISION_LOG (策略決策紀錄 - 無個人金流純策略模板)
// ==========================================
function buildDecisionLogSheet(sheet) {
  setHeaderBanner(
    sheet, 
    '【策略決策紀錄】供投資人記錄依據 Market Engine 位階訊號所執行的策略動作類別、紀律執行點與心得檢討（本表為純策略模板，不記錄任何個人金流與私密金額）。', 
    'F', 
    '#0f172a'
  );

  setTableHeader(
    sheet, 
    'A2:F2', 
    ['日期 (Date)', '當時市場位階/訊號', '策略動作 (買進/賣出/再平衡/觀望)', '執行說明 (無金額純策略)', '策略符合度', '策略思考與檢討備註'], 
    '#334155'
  );

  const sampleRows = [
    [new Date('2026-07-16'), '恐慌', '分批加碼', '核心大盤部位權重調整', '符合 (Compliant)', '季線乖離率達到 -10.2%，依照位階紀律執行加碼。'],
    [new Date('2026-06-01'), '順風/中性', '定期再平衡', '核心與防禦部位按 55:45 再平衡', '符合 (Compliant)', '維持正常通道配置，無特別加減碼。']
  ];

  sheet.getRange(3, 1, sampleRows.length, 6).setValues(sampleRows);

  // 格式
  sheet.getRange('A3:A50').setNumberFormat('yyyy-mm-dd');
  sheet.setColumnWidth(1, 120);
  sheet.setColumnWidth(2, 140);
  sheet.setColumnWidth(3, 210);
  sheet.setColumnWidth(4, 220);
  sheet.setColumnWidth(5, 140);
  sheet.setColumnWidth(6, 350);
}

/**
 * 快捷重新套用公式與樣式
 */
function applyFormulasAndStyles() {
  setupMarketEngineV3();
}
