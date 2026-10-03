import { describe, it, expect } from 'vitest';
import {
  parseDelimitedText,
  detectColumnMapping,
  processRawRow,
  SAMPLE_IMPORT_CSV,
  normalizeDirection,
  parseNumberSafe,
  parseDateSafe,
} from './tradeImporter';
import { calculateTradeFinancials } from './calcEngine';

describe('tradeImporter: CSV / Delimited Parser', () => {
  it('correctly parses comma-delimited rows with quoted fields', () => {
    const raw = `Symbol,Direction,EntryPrice,ExitPrice,StopLoss,TakeProfit,Quantity,NetPnL,RMultiple,Setup,Date
XAUUSD,BUY,2650.00,2660.00,2645.00,2660.00,1,1000.00,2.00,"London Liquidity Sweep",2026-10-01T09:30:00
XAUUSD,SELL,2670.00,2662.50,2675.00,2660.00,1,750.00,1.50,"New York Reversal, Failed",2026-10-01T14:00:00`;

    const { headers, rows } = parseDelimitedText(raw);
    expect(headers).toEqual([
      'Symbol',
      'Direction',
      'EntryPrice',
      'ExitPrice',
      'StopLoss',
      'TakeProfit',
      'Quantity',
      'NetPnL',
      'RMultiple',
      'Setup',
      'Date',
    ]);
    expect(rows.length).toBe(2);
    expect(rows[0][9]).toBe('London Liquidity Sweep');
    expect(rows[1][9]).toBe('New York Reversal, Failed');
  });

  it('detects column mapping and known aliases automatically', () => {
    const headers = [
      'Ticker',
      'Side',
      'OpenPrice',
      'ClosePrice',
      'SL',
      'TP',
      'Size',
      'Profit',
      'R_Multiple',
      'Strategy',
      'Timestamp',
    ];
    const mapping = detectColumnMapping(headers);
    expect(mapping.symbol).toBe(0);
    expect(mapping.direction).toBe(1);
    expect(mapping.entryPrice).toBe(2);
    expect(mapping.exitPrice).toBe(3);
    expect(mapping.stopLoss).toBe(4);
    expect(mapping.takeProfit).toBe(5);
    expect(mapping.quantity).toBe(6);
    expect(mapping.netPnl).toBe(7);
    expect(mapping.rMultiple).toBe(8);
    expect(mapping.setup).toBe(9);
    expect(mapping.date).toBe(10);
  });

  it('normalizes directions safely', () => {
    expect(normalizeDirection('BUY')).toBe('BUY');
    expect(normalizeDirection('long')).toBe('BUY');
    expect(normalizeDirection('CALL')).toBe('BUY');
    expect(normalizeDirection('SELL')).toBe('SELL');
    expect(normalizeDirection('short')).toBe('SELL');
    expect(normalizeDirection('PUT')).toBe('SELL');
  });

  it('parses numbers and dates safely', () => {
    expect(parseNumberSafe('$1,250.50')).toBe(1250.5);
    expect(parseNumberSafe('-$500.00')).toBe(-500);
    expect(parseNumberSafe('+2.50R')).toBe(2.5);
    expect(parseDateSafe('2026-10-01T09:30:00').isValid).toBe(true);
  });
});

describe('tradeImporter: Integration Test with the 4 Exact Test Trades', () => {
  it('validates and verifies all 4 XAUUSD trades with exact mathematical matching', () => {
    const { headers, rows } = parseDelimitedText(SAMPLE_IMPORT_CSV);
    const mapping = detectColumnMapping(headers);

    const processed = rows.map((r, idx) =>
      processRawRow(r, idx + 1, mapping, 'acc-1', [], [
        { id: 'pb-1', name: 'London Liquidity Sweep' },
        { id: 'pb-2', name: 'New York Reversal' },
      ])
    );

    expect(processed.length).toBe(4);

    // Row 1: XAUUSD BUY 2650 -> 2660, SL 2645, NetPnL 1000, R 2.00
    const row1 = processed[0];
    expect(row1.status).toBe('VALID');
    expect(row1.symbol).toBe('XAUUSD');
    expect(row1.direction).toBe('BUY');
    expect(row1.calculatedNetPnl).toBe(1000);
    expect(row1.importedNetPnl).toBe(1000);
    expect(row1.pnlStatus).toBe('MATCH');
    expect(row1.calculatedRMultiple).toBe(2);
    expect(row1.importedRMultiple).toBe(2);
    expect(row1.rStatus).toBe('MATCH');
    expect(row1.matchedPlaybookId).toBe('pb-1');

    // Row 2: XAUUSD SELL 2670 -> 2662.50, SL 2675, NetPnL 750, R 1.50
    const row2 = processed[1];
    expect(row2.status).toBe('VALID');
    expect(row2.direction).toBe('SELL');
    expect(row2.calculatedNetPnl).toBe(750);
    expect(row2.importedNetPnl).toBe(750);
    expect(row2.pnlStatus).toBe('MATCH');
    expect(row2.calculatedRMultiple).toBe(1.5);
    expect(row2.importedRMultiple).toBe(1.5);
    expect(row2.rStatus).toBe('MATCH');
    expect(row2.matchedPlaybookId).toBe('pb-2');

    // Row 3: XAUUSD BUY 2640 -> 2635, SL 2635, NetPnL -500, R -1.00
    const row3 = processed[2];
    expect(row3.status).toBe('VALID');
    expect(row3.direction).toBe('BUY');
    expect(row3.calculatedNetPnl).toBe(-500);
    expect(row3.importedNetPnl).toBe(-500);
    expect(row3.pnlStatus).toBe('MATCH');
    expect(row3.calculatedRMultiple).toBe(-1);
    expect(row3.importedRMultiple).toBe(-1);
    expect(row3.rStatus).toBe('MATCH');

    // Row 4: XAUUSD SELL 2680 -> 2686, SL 2685, NetPnL -600, R -1.20
    const row4 = processed[3];
    expect(row4.status).toBe('VALID');
    expect(row4.direction).toBe('SELL');
    expect(row4.calculatedNetPnl).toBe(-600);
    expect(row4.importedNetPnl).toBe(-600);
    expect(row4.pnlStatus).toBe('MATCH');
    expect(row4.calculatedRMultiple).toBe(-1.2);
    expect(row4.importedRMultiple).toBe(-1.2);
    expect(row4.rStatus).toBe('MATCH');

    // Overall aggregate math
    const totalPnl = processed.reduce((sum, r) => sum + r.calculatedNetPnl, 0);
    expect(totalPnl).toBe(650);

    const winners = processed.filter(r => r.calculatedNetPnl > 0).length;
    const losers = processed.filter(r => r.calculatedNetPnl < 0).length;
    expect(winners).toBe(2);
    expect(losers).toBe(2);
    expect((winners / (winners + losers)) * 100).toBe(50);

    const totalR = processed.reduce((sum, r) => sum + (r.calculatedRMultiple ?? 0), 0);
    expect(Math.round(totalR * 100) / 100).toBe(1.3);
  });

  it('flags P&L mismatch when imported differs from deterministic calculation', () => {
    const raw = `Symbol,Direction,EntryPrice,ExitPrice,Quantity,NetPnL,Date
XAUUSD,BUY,2650.00,2660.00,1,100.00,2026-10-01T09:30:00`;

    const { headers, rows } = parseDelimitedText(raw);
    const mapping = detectColumnMapping(headers);
    const processed = rows.map((r, idx) => processRawRow(r, idx + 1, mapping, 'acc-1', []));

    expect(processed[0].calculatedNetPnl).toBe(1000);
    expect(processed[0].importedNetPnl).toBe(100);
    expect(processed[0].pnlStatus).toBe('MISMATCH');
    expect(processed[0].pnlDifference).toBe(-900);
    expect(processed[0].warnings.length).toBeGreaterThan(0);
  });
});
