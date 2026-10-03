import { Trade, MarketType, TradeDirection } from '../types';
import { calculateTradeFinancials, getInstrumentSpec } from './calcEngine';

export interface ColumnMapping {
  symbol: number | null;
  direction: number | null;
  entryPrice: number | null;
  exitPrice: number | null;
  stopLoss: number | null;
  takeProfit: number | null;
  quantity: number | null;
  netPnl: number | null;
  rMultiple: number | null;
  setup: number | null;
  date: number | null;
  notes: number | null;
  market: number | null;
}

export type RowValidationStatus = 'VALID' | 'WARNING' | 'ERROR';
export type MatchStatus = 'MATCH' | 'MISMATCH' | 'CALCULATED';

export interface ParsedImportRow {
  rowNumber: number;
  rawCols: string[];
  status: RowValidationStatus;
  errors: string[];
  warnings: string[];
  isDuplicate: boolean;
  duplicateTradeId?: string;

  // Parsed and normalized trade fields
  symbol: string;
  market: MarketType;
  direction: TradeDirection;
  entryPrice: number;
  exitPrice: number;
  stopLoss?: number;
  takeProfit?: number;
  quantity: number;
  entryDate: string;
  setupName?: string;
  matchedPlaybookId?: string;
  notes?: string;

  // Comparison & financial calculations
  importedNetPnl?: number;
  calculatedNetPnl: number;
  pnlStatus: MatchStatus;
  pnlDifference?: number;

  importedRMultiple?: number;
  calculatedRMultiple: number | null;
  rStatus: MatchStatus;
  rDifference?: number;

  // User decision for this row: whether to prefer calculated or imported
  useImportedPnl: boolean;
}

export const CSV_TEMPLATE_CONTENT = `Symbol,Direction,EntryPrice,ExitPrice,StopLoss,TakeProfit,Quantity,NetPnL,RMultiple,Setup,Date
XAUUSD,BUY,2650.00,2660.00,2645.00,2660.00,1,1000.00,2.00,London Liquidity Sweep,2026-10-01T09:30:00`;

export const SAMPLE_IMPORT_CSV = `Symbol,Direction,EntryPrice,ExitPrice,StopLoss,TakeProfit,Quantity,NetPnL,RMultiple,Setup,Date
XAUUSD,BUY,2650.00,2660.00,2645.00,2660.00,1,1000.00,2.00,London Liquidity Sweep,2026-10-01T09:30:00
XAUUSD,SELL,2670.00,2662.50,2675.00,2660.00,1,750.00,1.50,New York Reversal,2026-10-01T14:00:00
XAUUSD,BUY,2640.00,2635.00,2635.00,2650.00,1,-500.00,-1.00,Failed Breakout,2026-10-02T10:15:00
XAUUSD,SELL,2680.00,2686.00,2685.00,2665.00,1,-600.00,-1.20,Supply Rejection,2026-10-02T15:30:00`;

/**
 * Robust CSV parser that handles quotes, escaped quotes, commas, tabs, semicolons,
 * and multiline cells without requiring external heavy libraries.
 */
export function parseDelimitedText(text: string): { headers: string[]; rows: string[][] } {
  if (!text || !text.trim()) {
    return { headers: [], rows: [] };
  }

  // Detect delimiter: comma, semicolon, tab
  const sampleLine = text.split(/\r?\n/).find(l => l.trim().length > 0) || '';
  let delimiter = ',';
  if ((sampleLine.match(/\t/g) || []).length > (sampleLine.match(/,/g) || []).length) {
    delimiter = '\t';
  } else if ((sampleLine.match(/;/g) || []).length > (sampleLine.match(/,/g) || []).length) {
    delimiter = ';';
  }

  const lines = splitIntoLogicalCsvLines(text);
  if (lines.length === 0) {
    return { headers: [], rows: [] };
  }

  const parsedGrid: string[][] = [];
  for (const line of lines) {
    const row = parseSingleCsvLine(line, delimiter);
    if (row.some(c => c.trim().length > 0)) {
      parsedGrid.push(row);
    }
  }

  if (parsedGrid.length === 0) {
    return { headers: [], rows: [] };
  }

  // Check if first line is headers
  const firstRow = parsedGrid[0];
  const isHeaderRow = firstRow.some(col => {
    const clean = col.toLowerCase().replace(/[\s_-]/g, '');
    return ['symbol', 'ticker', 'direction', 'side', 'entryprice', 'exitprice', 'netpnl', 'pnl', 'date'].includes(clean);
  });

  if (isHeaderRow) {
    return {
      headers: firstRow.map(h => h.trim()),
      rows: parsedGrid.slice(1),
    };
  }

  // If no explicit header detected, generate col_0, col_1...
  const colCount = Math.max(...parsedGrid.map(r => r.length));
  const defaultHeaders = Array.from({ length: colCount }, (_, i) => `Column ${i + 1}`);
  return {
    headers: defaultHeaders,
    rows: parsedGrid,
  };
}

function splitIntoLogicalCsvLines(text: string): string[] {
  const result: string[] = [];
  let currentLine = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      if (inQuotes && text[i + 1] === '"') {
        currentLine += '""';
        i++;
      } else {
        inQuotes = !inQuotes;
        currentLine += char;
      }
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && text[i + 1] === '\n') {
        i++;
      }
      if (currentLine.trim()) {
        result.push(currentLine);
      }
      currentLine = '';
    } else {
      currentLine += char;
    }
  }

  if (currentLine.trim()) {
    result.push(currentLine);
  }

  return result;
}

function parseSingleCsvLine(line: string, delimiter: string): string[] {
  const cols: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      cols.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  cols.push(current.trim());
  return cols;
}

/**
 * Intelligent automatic header and alias detection
 */
export function detectColumnMapping(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {
    symbol: null,
    direction: null,
    entryPrice: null,
    exitPrice: null,
    stopLoss: null,
    takeProfit: null,
    quantity: null,
    netPnl: null,
    rMultiple: null,
    setup: null,
    date: null,
    notes: null,
    market: null,
  };

  const normalized = headers.map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ''));

  normalized.forEach((header, idx) => {
    // Symbol
    if (['symbol', 'ticker', 'instrument', 'asset', 'pair', 'contract', 'item'].includes(header)) {
      if (mapping.symbol === null) mapping.symbol = idx;
    }
    // Direction
    else if (['direction', 'side', 'type', 'action', 'position', 'positionside', 'buysell'].includes(header)) {
      if (mapping.direction === null) mapping.direction = idx;
    }
    // Entry Price
    else if (['entryprice', 'entry_price', 'entry', 'openprice', 'open_price', 'buyprice', 'open'].includes(header)) {
      if (mapping.entryPrice === null) mapping.entryPrice = idx;
    }
    // Exit Price
    else if (['exitprice', 'exit_price', 'exit', 'closeprice', 'close_price', 'sellprice', 'close'].includes(header)) {
      if (mapping.exitPrice === null) mapping.exitPrice = idx;
    }
    // Stop Loss
    else if (['stoploss', 'stop_loss', 'sl', 'stop', 'slprice'].includes(header)) {
      if (mapping.stopLoss === null) mapping.stopLoss = idx;
    }
    // Take Profit
    else if (['takeprofit', 'take_profit', 'tp', 'target', 'tpprice'].includes(header)) {
      if (mapping.takeProfit === null) mapping.takeProfit = idx;
    }
    // Quantity
    else if (['quantity', 'qty', 'size', 'lots', 'contracts', 'shares', 'volume', 'amount'].includes(header)) {
      if (mapping.quantity === null) mapping.quantity = idx;
    }
    // Net PnL
    else if (['netpnl', 'net_pnl', 'pnl', 'profit', 'profitloss', 'netprofit', 'realizedpnl', 'gain', 'netgain'].includes(header)) {
      if (mapping.netPnl === null) mapping.netPnl = idx;
    }
    // R Multiple
    else if (['rmultiple', 'r_multiple', 'r', 'rresult', 'rmult', 'rr', 'riskreward'].includes(header)) {
      if (mapping.rMultiple === null) mapping.rMultiple = idx;
    }
    // Setup / Playbook
    else if (['setup', 'setupname', 'strategy', 'strategyname', 'playbook', 'setuptype', 'model', 'system'].includes(header)) {
      if (mapping.setup === null) mapping.setup = idx;
    }
    // Date
    else if (['date', 'datetime', 'timestamp', 'entrydate', 'entry_date', 'time', 'opentime', 'closedate', 'closetime', 'exitdate'].includes(header)) {
      if (mapping.date === null) mapping.date = idx;
    }
    // Notes
    else if (['notes', 'note', 'comment', 'description', 'journal'].includes(header)) {
      if (mapping.notes === null) mapping.notes = idx;
    }
    // Market
    else if (['market', 'assetclass', 'markettype', 'category'].includes(header)) {
      if (mapping.market === null) mapping.market = idx;
    }
  });

  return mapping;
}

/**
 * Normalizes direction string to strict 'BUY' or 'SELL'
 */
export function normalizeDirection(raw: string): TradeDirection {
  const clean = String(raw || '').trim().toUpperCase();
  if (['SELL', 'SHORT', 'S', 'PUT', '-1', 'SHORT POSITION'].includes(clean)) {
    return 'SELL';
  }
  return 'BUY';
}

/**
 * Cleans and parses numeric strings (handles $, +, commas, %, R)
 */
export function parseNumberSafe(raw: any, defaultValue: number = 0): number {
  if (raw === undefined || raw === null || raw === '') return defaultValue;
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : defaultValue;

  const cleaned = String(raw)
    .replace(/[$€£,\s]/g, '')
    .replace(/[rR%]/g, '')
    .replace(/\+/g, '')
    .trim();

  const num = parseFloat(cleaned);
  return Number.isFinite(num) ? num : defaultValue;
}

/**
 * Cleans and normalizes Date to ISO string, with robust fallback
 */
export function parseDateSafe(raw: any): { iso: string; isValid: boolean } {
  if (!raw) {
    return { iso: new Date().toISOString(), isValid: false };
  }

  const str = String(raw).trim();
  // Attempt direct Date parse
  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    return { iso: d.toISOString(), isValid: true };
  }

  // Attempt standard YYYY-MM-DD HH:mm:ss without timezone shift
  const match = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[ T](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
  if (match) {
    const year = parseInt(match[1]);
    const month = parseInt(match[2]) - 1;
    const day = parseInt(match[3]);
    const hour = match[4] ? parseInt(match[4]) : 12;
    const min = match[5] ? parseInt(match[5]) : 0;
    const sec = match[6] ? parseInt(match[6]) : 0;
    const dateObj = new Date(Date.UTC(year, month, day, hour, min, sec));
    if (!isNaN(dateObj.getTime())) {
      return { iso: dateObj.toISOString(), isValid: true };
    }
  }

  return { iso: new Date().toISOString(), isValid: false };
}

/**
 * Determine asset market from symbol if not explicitly supplied
 */
export function inferMarketFromSymbol(symbol: string): MarketType {
  const s = (symbol || '').toUpperCase().trim();
  if (['XAUUSD', 'XAGUSD', 'USOIL', 'UKOIL', 'BRENT', 'GOLD', 'SILVER'].includes(s)) {
    return 'Commodities';
  }
  if (['ES', 'MES', 'NQ', 'MNQ', 'YM', 'MYM', 'RTY', 'M2K', 'CL', 'MCL', 'GC', 'MGC', 'ZB', 'ZN', 'ZF', '6E', '6B', '6J'].some(f => s.startsWith(f))) {
    return 'Futures';
  }
  if (['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD', 'USDCHF', 'NZDUSD', 'EURJPY', 'GBPJPY'].includes(s)) {
    return 'Forex';
  }
  if (['BTCUSD', 'BTCUSDT', 'ETHUSD', 'ETHUSDT', 'SOLUSD', 'SOLUSDT', 'BTC', 'ETH', 'SOL'].includes(s)) {
    return 'Crypto';
  }
  return 'Futures';
}

/**
 * Creates a unique trade fingerprint for duplicate detection
 */
export function generateTradeFingerprint(
  accountId: string,
  symbol: string,
  direction: string,
  entryPrice: number,
  exitPrice: number,
  quantity: number,
  entryDate: string
): string {
  const dateKey = (entryDate || '').slice(0, 16); // Up to minute resolution
  return `${accountId}_${symbol.toUpperCase()}_${direction.toUpperCase()}_${entryPrice.toFixed(4)}_${exitPrice.toFixed(4)}_${quantity}_${dateKey}`;
}

/**
 * Processes, calculates, and validates a parsed raw row against TradeForge standards
 */
export function processRawRow(
  rawCols: string[],
  rowNumber: number,
  mapping: ColumnMapping,
  targetAccountId: string,
  existingTrades: Trade[],
  existingPlaybooks: Array<{ id: string; name: string }> = []
): ParsedImportRow {
  const errors: string[] = [];
  const warnings: string[] = [];

  const getCol = (idx: number | null): string => {
    if (idx === null || idx >= rawCols.length) return '';
    return rawCols[idx] || '';
  };

  // 1. Symbol
  const rawSymbol = getCol(mapping.symbol).trim();
  const symbol = (rawSymbol || '').toUpperCase().replace(/[^A-Z0-9._-]/g, '');
  if (!symbol) {
    errors.push('Missing Symbol');
  }

  // 2. Direction
  const rawDir = getCol(mapping.direction);
  const direction = normalizeDirection(rawDir);

  // 3. Prices
  const rawEntry = getCol(mapping.entryPrice);
  const entryPrice = parseNumberSafe(rawEntry, 0);
  if (!rawEntry || entryPrice <= 0) {
    errors.push('Invalid Entry Price');
  }

  const rawExit = getCol(mapping.exitPrice);
  const exitPrice = parseNumberSafe(rawExit, 0);
  if (!rawExit || exitPrice <= 0) {
    errors.push('Invalid Exit Price');
  }

  // 4. Quantity
  const rawQty = getCol(mapping.quantity);
  const quantity = parseNumberSafe(rawQty, 1);
  if (quantity <= 0) {
    errors.push('Quantity must be greater than 0');
  }

  // 5. SL / TP (Optional)
  const rawSL = getCol(mapping.stopLoss);
  const stopLoss = rawSL ? parseNumberSafe(rawSL) : undefined;

  const rawTP = getCol(mapping.takeProfit);
  const takeProfit = rawTP ? parseNumberSafe(rawTP) : undefined;

  // 6. Date
  const rawDate = getCol(mapping.date);
  const { iso: entryDate, isValid: isDateValid } = parseDateSafe(rawDate);
  if (!rawDate || !isDateValid) {
    warnings.push(`Date parsed as ${entryDate.slice(0, 10)} (original: "${rawDate || 'empty'}")`);
  }

  // 7. Market
  const rawMarket = getCol(mapping.market);
  const market: MarketType = rawMarket
    ? (rawMarket as MarketType)
    : inferMarketFromSymbol(symbol);

  // 8. Setup / Playbook
  const rawSetup = getCol(mapping.setup).trim();
  const setupName = rawSetup || undefined;
  let matchedPlaybookId: string | undefined = undefined;
  if (setupName && existingPlaybooks.length > 0) {
    const cleanSetup = setupName.toLowerCase();
    const matched = existingPlaybooks.find(
      p => p.name.toLowerCase() === cleanSetup || p.name.toLowerCase().includes(cleanSetup)
    );
    if (matched) {
      matchedPlaybookId = matched.id;
    }
  }

  // 9. Notes
  const notes = getCol(mapping.notes).trim() || undefined;

  // 10. Financial Calculation (Single Source of Truth)
  const tempTrade: Partial<Trade> = {
    symbol,
    market,
    direction,
    entryPrice,
    exitPrice,
    stopLoss,
    takeProfit,
    quantity,
    status: 'CLOSED',
    entryDate,
    exitDate: entryDate,
  };

  const financials = calculateTradeFinancials(tempTrade);
  const calculatedNetPnl = financials.netPnl;
  const calculatedRMultiple = financials.rMultiple;

  // 11. Compare Imported P&L vs Calculated P&L
  const rawNetPnl = getCol(mapping.netPnl);
  let importedNetPnl: number | undefined = undefined;
  let pnlStatus: MatchStatus = 'CALCULATED';
  let pnlDifference: number | undefined = undefined;

  if (rawNetPnl !== '') {
    importedNetPnl = parseNumberSafe(rawNetPnl);
    pnlDifference = Math.round((importedNetPnl - calculatedNetPnl) * 100) / 100;
    if (Math.abs(pnlDifference) <= 0.05) {
      pnlStatus = 'MATCH';
    } else {
      pnlStatus = 'MISMATCH';
      warnings.push(
        `P&L Mismatch: Imported $${importedNetPnl.toFixed(2)} vs Calculated $${calculatedNetPnl.toFixed(2)} (Diff: $${pnlDifference.toFixed(2)})`
      );
    }
  }

  // 12. Compare Imported R vs Calculated R
  const rawR = getCol(mapping.rMultiple);
  let importedRMultiple: number | undefined = undefined;
  let rStatus: MatchStatus = 'CALCULATED';
  let rDifference: number | undefined = undefined;

  if (rawR !== '') {
    importedRMultiple = parseNumberSafe(rawR);
    if (calculatedRMultiple !== null) {
      rDifference = Math.round((importedRMultiple - calculatedRMultiple) * 100) / 100;
      if (Math.abs(rDifference) <= 0.05) {
        rStatus = 'MATCH';
      } else {
        rStatus = 'MISMATCH';
        warnings.push(`R-Multiple Mismatch: Imported ${importedRMultiple}R vs Calculated ${calculatedRMultiple}R`);
      }
    } else {
      rStatus = 'CALCULATED';
    }
  }

  // 13. Duplicate Detection
  const fingerprint = generateTradeFingerprint(
    targetAccountId,
    symbol,
    direction,
    entryPrice,
    exitPrice,
    quantity,
    entryDate
  );

  let isDuplicate = false;
  let duplicateTradeId: string | undefined = undefined;

  const existingMatch = existingTrades.find(t => {
    const existingFp = generateTradeFingerprint(
      t.accountId,
      t.symbol,
      t.direction,
      t.entryPrice,
      t.exitPrice || t.entryPrice,
      t.quantity,
      t.entryDate
    );
    return existingFp === fingerprint;
  });

  if (existingMatch) {
    isDuplicate = true;
    duplicateTradeId = existingMatch.id;
    warnings.push('Duplicate Trade: identical execution already exists in account');
  }

  // Overall status
  let status: RowValidationStatus = 'VALID';
  if (errors.length > 0) {
    status = 'ERROR';
  } else if (warnings.length > 0) {
    status = 'WARNING';
  }

  return {
    rowNumber,
    rawCols,
    status,
    errors,
    warnings,
    isDuplicate,
    duplicateTradeId,
    symbol: symbol || 'UNKNOWN',
    market,
    direction,
    entryPrice,
    exitPrice,
    stopLoss,
    takeProfit,
    quantity,
    entryDate,
    setupName,
    matchedPlaybookId,
    notes,
    importedNetPnl,
    calculatedNetPnl,
    pnlStatus,
    pnlDifference,
    importedRMultiple,
    calculatedRMultiple,
    rStatus,
    rDifference,
    useImportedPnl: false, // Default to calculated source of truth
  };
}

/**
 * Downloads a template CSV file directly to the user's browser
 */
export function downloadCsvTemplate() {
  const blob = new Blob([CSV_TEMPLATE_CONTENT], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', 'tradeforge_import_template.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
