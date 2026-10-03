/**
 * TradeForge Unified Calculation & Financial Mathematics Engine
 * 
 * Single Source of Truth for all financial, statistical, risk, and prop-firm metrics.
 * Implements strict precision arithmetic, transparent edge-case handling, and configurable rules.
 */

import { Trade } from '../types';

// ============================================================================
// 1. PRECISION & MONEY MATH
// ============================================================================

/**
 * Rounds a number to a specified number of decimal places (default 2 for currency)
 * to avoid standard IEEE-754 floating-point errors.
 */
export function roundMoney(value: number, decimals: number = 2): number {
  if (value === undefined || value === null || isNaN(value) || !isFinite(value)) {
    return 0;
  }
  const factor = Math.pow(10, decimals);
  return Number(Math.round(Number(value + 'e' + decimals)) + 'e-' + decimals);
}

/**
 * Safe addition avoiding floating-point drift: 0.1 + 0.2 -> 0.30
 */
export function safeAdd(...numbers: number[]): number {
  const sum = numbers.reduce((acc, n) => acc + (Number.isFinite(n) ? n : 0), 0);
  return roundMoney(sum, 4);
}

/**
 * Safe subtraction: a - b
 */
export function safeSub(a: number, b: number): number {
  return roundMoney((Number.isFinite(a) ? a : 0) - (Number.isFinite(b) ? b : 0), 4);
}

/**
 * Safe multiplication
 */
export function safeMul(a: number, b: number): number {
  return roundMoney((Number.isFinite(a) ? a : 0) * (Number.isFinite(b) ? b : 0), 4);
}

/**
 * Safe division with zero division handling
 */
export function safeDiv(numerator: number, denominator: number, fallback: number | null = null): number | null {
  if (!Number.isFinite(denominator) || denominator === 0) {
    return fallback;
  }
  if (!Number.isFinite(numerator)) {
    return fallback;
  }
  return roundMoney(numerator / denominator, 4);
}

// ============================================================================
// 2. INSTRUMENT SPECIFICATIONS & MULTIPLIERS (SINGLE SOURCE OF TRUTH)
// ============================================================================

export interface InstrumentSpec {
  symbol: string;
  name: string;
  market: 'Futures' | 'Forex' | 'Crypto' | 'Stocks' | 'Indices' | 'Commodities' | 'CFDs';
  pointValue: number; // Dollar value of a full 1.0 point move per 1 unit/lot/contract
  tickSize: number;
  tickValue: number;
  unitLabel: 'contracts' | 'lots' | 'shares' | 'units';
  defaultCommission: number;
}

export const INSTRUMENT_SPECS: Record<string, InstrumentSpec> = {
  // Commodities & Precious Metals (1 Standard Lot XAUUSD = 100 troy oz -> $100/point move)
  XAUUSD: { symbol: 'XAUUSD', name: 'Gold / US Dollar Spot', market: 'Commodities', pointValue: 100, tickSize: 0.01, tickValue: 1.0, unitLabel: 'lots', defaultCommission: 0 },
  GOLD: { symbol: 'GOLD', name: 'Gold Spot', market: 'Commodities', pointValue: 100, tickSize: 0.01, tickValue: 1.0, unitLabel: 'lots', defaultCommission: 0 },
  XAGUSD: { symbol: 'XAGUSD', name: 'Silver / US Dollar Spot', market: 'Commodities', pointValue: 5000, tickSize: 0.005, tickValue: 25.0, unitLabel: 'lots', defaultCommission: 0 },
  SILVER: { symbol: 'SILVER', name: 'Silver Spot', market: 'Commodities', pointValue: 5000, tickSize: 0.005, tickValue: 25.0, unitLabel: 'lots', defaultCommission: 0 },
  USOIL: { symbol: 'USOIL', name: 'WTI Crude Oil Spot/CFD', market: 'Commodities', pointValue: 1000, tickSize: 0.01, tickValue: 10.0, unitLabel: 'lots', defaultCommission: 0 },
  UKOIL: { symbol: 'UKOIL', name: 'Brent Crude Oil Spot/CFD', market: 'Commodities', pointValue: 1000, tickSize: 0.01, tickValue: 10.0, unitLabel: 'lots', defaultCommission: 0 },

  // Futures - Equity Indices
  ES: { symbol: 'ES', name: 'E-mini S&P 500', market: 'Futures', pointValue: 50, tickSize: 0.25, tickValue: 12.5, unitLabel: 'contracts', defaultCommission: 0 },
  MES: { symbol: 'MES', name: 'Micro E-mini S&P 500', market: 'Futures', pointValue: 5, tickSize: 0.25, tickValue: 1.25, unitLabel: 'contracts', defaultCommission: 0 },
  NQ: { symbol: 'NQ', name: 'E-mini Nasdaq 100', market: 'Futures', pointValue: 20, tickSize: 0.25, tickValue: 5.0, unitLabel: 'contracts', defaultCommission: 0 },
  MNQ: { symbol: 'MNQ', name: 'Micro E-mini Nasdaq 100', market: 'Futures', pointValue: 2, tickSize: 0.25, tickValue: 0.5, unitLabel: 'contracts', defaultCommission: 0 },
  YM: { symbol: 'YM', name: 'E-mini Dow Jones', market: 'Futures', pointValue: 5, tickSize: 1.0, tickValue: 5.0, unitLabel: 'contracts', defaultCommission: 0 },
  MYM: { symbol: 'MYM', name: 'Micro E-mini Dow Jones', market: 'Futures', pointValue: 0.5, tickSize: 1.0, tickValue: 0.5, unitLabel: 'contracts', defaultCommission: 0 },
  RTY: { symbol: 'RTY', name: 'E-mini Russell 2000', market: 'Futures', pointValue: 50, tickSize: 0.1, tickValue: 5.0, unitLabel: 'contracts', defaultCommission: 0 },
  M2K: { symbol: 'M2K', name: 'Micro E-mini Russell 2000', market: 'Futures', pointValue: 5, tickSize: 0.1, tickValue: 0.5, unitLabel: 'contracts', defaultCommission: 0 },
  FDAX: { symbol: 'FDAX', name: 'DAX Futures', market: 'Futures', pointValue: 25, tickSize: 0.5, tickValue: 12.5, unitLabel: 'contracts', defaultCommission: 0 },

  // Futures - Commodities & Energy
  CL: { symbol: 'CL', name: 'Crude Oil Futures', market: 'Futures', pointValue: 1000, tickSize: 0.01, tickValue: 10.0, unitLabel: 'contracts', defaultCommission: 0 },
  MCL: { symbol: 'MCL', name: 'Micro Crude Oil Futures', market: 'Futures', pointValue: 100, tickSize: 0.01, tickValue: 1.0, unitLabel: 'contracts', defaultCommission: 0 },
  GC: { symbol: 'GC', name: 'Gold Futures', market: 'Futures', pointValue: 100, tickSize: 0.1, tickValue: 10.0, unitLabel: 'contracts', defaultCommission: 0 },
  MGC: { symbol: 'MGC', name: 'Micro Gold Futures', market: 'Futures', pointValue: 10, tickSize: 0.1, tickValue: 1.0, unitLabel: 'contracts', defaultCommission: 0 },
  SI: { symbol: 'SI', name: 'Silver Futures', market: 'Futures', pointValue: 5000, tickSize: 0.005, tickValue: 25.0, unitLabel: 'contracts', defaultCommission: 0 },
  SIL: { symbol: 'SIL', name: 'Micro Silver Futures', market: 'Futures', pointValue: 1000, tickSize: 0.005, tickValue: 5.0, unitLabel: 'contracts', defaultCommission: 0 },
  HG: { symbol: 'HG', name: 'Copper Futures', market: 'Futures', pointValue: 25000, tickSize: 0.0005, tickValue: 12.5, unitLabel: 'contracts', defaultCommission: 0 },
  NG: { symbol: 'NG', name: 'Natural Gas Futures', market: 'Futures', pointValue: 10000, tickSize: 0.001, tickValue: 10.0, unitLabel: 'contracts', defaultCommission: 0 },
  ZB: { symbol: 'ZB', name: '30Y Treasury Bond Futures', market: 'Futures', pointValue: 1000, tickSize: 0.03125, tickValue: 31.25, unitLabel: 'contracts', defaultCommission: 0 },
  ZN: { symbol: 'ZN', name: '10Y Treasury Note Futures', market: 'Futures', pointValue: 1000, tickSize: 0.015625, tickValue: 15.625, unitLabel: 'contracts', defaultCommission: 0 },

  // Forex Spot / CFD (Standard lot = 100,000 units)
  EURUSD: { symbol: 'EURUSD', name: 'Euro / US Dollar', market: 'Forex', pointValue: 100000, tickSize: 0.00001, tickValue: 1.0, unitLabel: 'lots', defaultCommission: 0 },
  GBPUSD: { symbol: 'GBPUSD', name: 'British Pound / US Dollar', market: 'Forex', pointValue: 100000, tickSize: 0.00001, tickValue: 1.0, unitLabel: 'lots', defaultCommission: 0 },
  USDJPY: { symbol: 'USDJPY', name: 'US Dollar / Japanese Yen', market: 'Forex', pointValue: 666.67, tickSize: 0.001, tickValue: 0.67, unitLabel: 'lots', defaultCommission: 0 },
  AUDUSD: { symbol: 'AUDUSD', name: 'Australian Dollar / US Dollar', market: 'Forex', pointValue: 100000, tickSize: 0.00001, tickValue: 1.0, unitLabel: 'lots', defaultCommission: 0 },
  NZDUSD: { symbol: 'NZDUSD', name: 'New Zealand Dollar / US Dollar', market: 'Forex', pointValue: 100000, tickSize: 0.00001, tickValue: 1.0, unitLabel: 'lots', defaultCommission: 0 },
  USDCAD: { symbol: 'USDCAD', name: 'US Dollar / Canadian Dollar', market: 'Forex', pointValue: 73000, tickSize: 0.00001, tickValue: 0.73, unitLabel: 'lots', defaultCommission: 0 },
  USDCHF: { symbol: 'USDCHF', name: 'US Dollar / Swiss Franc', market: 'Forex', pointValue: 110000, tickSize: 0.00001, tickValue: 1.10, unitLabel: 'lots', defaultCommission: 0 },
  EURJPY: { symbol: 'EURJPY', name: 'Euro / Japanese Yen', market: 'Forex', pointValue: 666.67, tickSize: 0.001, tickValue: 0.67, unitLabel: 'lots', defaultCommission: 0 },
  GBPJPY: { symbol: 'GBPJPY', name: 'British Pound / Japanese Yen', market: 'Forex', pointValue: 666.67, tickSize: 0.001, tickValue: 0.67, unitLabel: 'lots', defaultCommission: 0 },

  // Indices CFDs (1 point move = $1 per 1 lot)
  US30: { symbol: 'US30', name: 'Wall Street 30 Index CFD', market: 'Indices', pointValue: 1, tickSize: 1.0, tickValue: 1.0, unitLabel: 'contracts', defaultCommission: 0 },
  NAS100: { symbol: 'NAS100', name: 'US Tech 100 Index CFD', market: 'Indices', pointValue: 1, tickSize: 0.25, tickValue: 0.25, unitLabel: 'contracts', defaultCommission: 0 },
  SPX500: { symbol: 'SPX500', name: 'US 500 Index CFD', market: 'Indices', pointValue: 1, tickSize: 0.1, tickValue: 0.1, unitLabel: 'contracts', defaultCommission: 0 },
  GER40: { symbol: 'GER40', name: 'Germany 40 Index CFD', market: 'Indices', pointValue: 1, tickSize: 0.5, tickValue: 0.5, unitLabel: 'contracts', defaultCommission: 0 },

  // Crypto (1 coin = 1 unit)
  BTCUSD: { symbol: 'BTCUSD', name: 'Bitcoin / US Dollar', market: 'Crypto', pointValue: 1, tickSize: 0.1, tickValue: 0.1, unitLabel: 'units', defaultCommission: 0 },
  BTC: { symbol: 'BTC', name: 'Bitcoin', market: 'Crypto', pointValue: 1, tickSize: 0.1, tickValue: 0.1, unitLabel: 'units', defaultCommission: 0 },
  ETHUSD: { symbol: 'ETHUSD', name: 'Ethereum / US Dollar', market: 'Crypto', pointValue: 1, tickSize: 0.01, tickValue: 0.01, unitLabel: 'units', defaultCommission: 0 },
  ETH: { symbol: 'ETH', name: 'Ethereum', market: 'Crypto', pointValue: 1, tickSize: 0.01, tickValue: 0.01, unitLabel: 'units', defaultCommission: 0 },
  SOLUSD: { symbol: 'SOLUSD', name: 'Solana / US Dollar', market: 'Crypto', pointValue: 1, tickSize: 0.01, tickValue: 0.01, unitLabel: 'units', defaultCommission: 0 },
  SOL: { symbol: 'SOL', name: 'Solana', market: 'Crypto', pointValue: 1, tickSize: 0.01, tickValue: 0.01, unitLabel: 'units', defaultCommission: 0 },

  // Stocks (1 share = 1 unit)
  SPY: { symbol: 'SPY', name: 'SPDR S&P 500 ETF', market: 'Stocks', pointValue: 1, tickSize: 0.01, tickValue: 0.01, unitLabel: 'shares', defaultCommission: 0 },
  QQQ: { symbol: 'QQQ', name: 'Invesco QQQ ETF', market: 'Stocks', pointValue: 1, tickSize: 0.01, tickValue: 0.01, unitLabel: 'shares', defaultCommission: 0 },
  NVDA: { symbol: 'NVDA', name: 'Nvidia Corp', market: 'Stocks', pointValue: 1, tickSize: 0.01, tickValue: 0.01, unitLabel: 'shares', defaultCommission: 0 },
  AAPL: { symbol: 'AAPL', name: 'Apple Inc', market: 'Stocks', pointValue: 1, tickSize: 0.01, tickValue: 0.01, unitLabel: 'shares', defaultCommission: 0 },
  TSLA: { symbol: 'TSLA', name: 'Tesla Inc', market: 'Stocks', pointValue: 1, tickSize: 0.01, tickValue: 0.01, unitLabel: 'shares', defaultCommission: 0 },
  AMZN: { symbol: 'AMZN', name: 'Amazon.com Inc', market: 'Stocks', pointValue: 1, tickSize: 0.01, tickValue: 0.01, unitLabel: 'shares', defaultCommission: 0 },
  MSFT: { symbol: 'MSFT', name: 'Microsoft Corp', market: 'Stocks', pointValue: 1, tickSize: 0.01, tickValue: 0.01, unitLabel: 'shares', defaultCommission: 0 },
  META: { symbol: 'META', name: 'Meta Platforms Inc', market: 'Stocks', pointValue: 1, tickSize: 0.01, tickValue: 0.01, unitLabel: 'shares', defaultCommission: 0 },
  GOOGL: { symbol: 'GOOGL', name: 'Alphabet Inc', market: 'Stocks', pointValue: 1, tickSize: 0.01, tickValue: 0.01, unitLabel: 'shares', defaultCommission: 0 },
};

export function getInstrumentSpec(symbol: string = '', market: string = 'Futures'): InstrumentSpec {
  const cleanSymbol = symbol.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (INSTRUMENT_SPECS[cleanSymbol]) {
    return INSTRUMENT_SPECS[cleanSymbol];
  }

  // Handle common variations
  if (cleanSymbol.includes('XAU') || cleanSymbol.includes('GOLD')) {
    return INSTRUMENT_SPECS['XAUUSD'];
  }
  if (cleanSymbol.includes('XAG') || cleanSymbol.includes('SILVER')) {
    return INSTRUMENT_SPECS['XAGUSD'];
  }
  if (cleanSymbol.includes('BTC')) return INSTRUMENT_SPECS['BTCUSD'];
  if (cleanSymbol.includes('ETH')) return INSTRUMENT_SPECS['ETHUSD'];
  if (cleanSymbol.includes('SOL')) return INSTRUMENT_SPECS['SOLUSD'];

  // Market-level fallbacks
  if (market === 'Forex') {
    return {
      symbol: cleanSymbol || 'FOREX',
      name: `${cleanSymbol} Forex Pair`,
      market: 'Forex',
      pointValue: 100000,
      tickSize: 0.00001,
      tickValue: 1.0,
      unitLabel: 'lots',
      defaultCommission: 0,
    };
  }

  if (market === 'Commodities') {
    return {
      symbol: cleanSymbol || 'COMMODITY',
      name: `${cleanSymbol} Commodity`,
      market: 'Commodities',
      pointValue: 100, // Standard 100 multiplier for gold/commodities
      tickSize: 0.01,
      tickValue: 1.0,
      unitLabel: 'lots',
      defaultCommission: 0,
    };
  }

  if (market === 'Futures') {
    const isMicro = cleanSymbol.startsWith('M');
    return {
      symbol: cleanSymbol || 'FUTURES',
      name: `${cleanSymbol} Futures Contract`,
      market: 'Futures',
      pointValue: isMicro ? 2 : 20,
      tickSize: 0.25,
      tickValue: isMicro ? 0.5 : 5.0,
      unitLabel: 'contracts',
      defaultCommission: 0,
    };
  }

  if (market === 'Stocks') {
    return {
      symbol: cleanSymbol || 'STOCK',
      name: `${cleanSymbol} Stock`,
      market: 'Stocks',
      pointValue: 1,
      tickSize: 0.01,
      tickValue: 0.01,
      unitLabel: 'shares',
      defaultCommission: 0,
    };
  }

  if (market === 'Crypto') {
    return {
      symbol: cleanSymbol || 'CRYPTO',
      name: `${cleanSymbol} Crypto Asset`,
      market: 'Crypto',
      pointValue: 1,
      tickSize: 0.01,
      tickValue: 0.01,
      unitLabel: 'units',
      defaultCommission: 0,
    };
  }

  return {
    symbol: cleanSymbol || 'DEFAULT',
    name: cleanSymbol,
    market: 'Futures',
    pointValue: 1,
    tickSize: 0.01,
    tickValue: 0.01,
    unitLabel: 'units',
    defaultCommission: 0,
  };
}

export function getInstrumentPointMultiplier(symbol: string = '', market: string = 'Futures'): number {
  return getInstrumentSpec(symbol, market).pointValue;
}

export function getInstrumentUnitLabel(symbol: string = '', market: string = 'Futures'): 'contracts' | 'lots' | 'shares' | 'units' {
  return getInstrumentSpec(symbol, market).unitLabel;
}

// ============================================================================
// 3. CORE DETERMINISTIC TRADE FINANCIALS ENGINE (SINGLE SOURCE OF TRUTH)
// ============================================================================

export interface TradeCostBreakdown {
  commission: number;
  fees: number;
  swap: number;
  totalCosts: number;
}

/**
 * Extracts and sums all explicit transaction costs for a trade.
 */
export function getTradeCosts(trade: Partial<Trade>): TradeCostBreakdown {
  const commission = Number.isFinite(trade.commission) ? Number(trade.commission) : 0;
  const fees = Number.isFinite(trade.fees) ? Number(trade.fees) : 0;
  const swap = Number.isFinite(trade.swap) ? Number(trade.swap) : 0;
  const totalCosts = roundMoney(commission + fees + swap, 2);
  return { commission, fees, swap, totalCosts };
}

export interface TradeFinancials {
  grossPnl: number;
  netPnl: number;
  rMultiple: number | null;
  riskAmount: number;
  pointMove: number;
  tickMove: number;
  quantity: number;
  multiplier: number;
  currency: string;
  isWinner: boolean;
  isLoser: boolean;
  isBreakeven: boolean;
  roiPercent: number;
}

/**
 * Authoritative deterministic calculation for any individual trade.
 * Correctly applies instrument multipliers (e.g. XAUUSD 100, MES 5, ES 50, EURUSD 100k)
 * and direction (LONG: exit - entry, SHORT: entry - exit).
 */
export function calculateTradeFinancials(
  trade: Partial<Trade> & { contractMultiplier?: number; riskAmount?: number }
): TradeFinancials {
  const spec = getInstrumentSpec(trade.symbol || '', trade.market || 'Futures');
  const multiplier =
    trade.contractMultiplier && trade.contractMultiplier > 0
      ? trade.contractMultiplier
      : spec.pointValue;

  const isShort = trade.direction === 'SELL' || (trade.direction as string) === 'SHORT';
  const qty = Number.isFinite(trade.quantity) && Number(trade.quantity) > 0 ? Number(trade.quantity) : 1;
  const entry = Number.isFinite(trade.entryPrice) ? Number(trade.entryPrice) : 0;

  const isClosed = trade.status === undefined || trade.status === 'CLOSED';
  const hasExit = trade.exitPrice !== undefined && trade.exitPrice !== null && Number.isFinite(Number(trade.exitPrice));
  const exit = hasExit ? Number(trade.exitPrice) : (isClosed ? entry : 0);

  let pointMove = 0;
  let tickMove = 0;
  let grossPnl = 0;

  if (entry > 0 && hasExit) {
    pointMove = isShort ? (entry - exit) : (exit - entry);
    tickMove = spec.tickSize > 0 ? pointMove / spec.tickSize : pointMove;
    grossPnl = roundMoney(pointMove * qty * multiplier, 2);
  } else if (Number.isFinite(trade.grossPnl)) {
    grossPnl = roundMoney(trade.grossPnl!, 2);
  } else if (Number.isFinite(trade.netPnl)) {
    grossPnl = roundMoney(trade.netPnl! + getTradeCosts(trade).totalCosts, 2);
  }

  // Fees / costs (TradeForge has 0 commissions by default)
  const costs = getTradeCosts(trade).totalCosts;
  const netPnl = roundMoney(grossPnl - costs, 2);

  // Stop Loss, Risk Amount & R-Multiple
  const stop = Number.isFinite(trade.stopLoss) ? Number(trade.stopLoss) : 0;
  let riskAmount = 0;
  let rMultiple: number | null = null;

  if (stop > 0 && entry > 0) {
    const riskDistance = isShort ? (stop - entry) : (entry - stop);
    if (riskDistance > 0) {
      riskAmount = roundMoney(riskDistance * qty * multiplier, 2);
      if (riskAmount > 0) {
        rMultiple = roundMoney(grossPnl / riskAmount, 2);
      }
    }
  } else if (trade.riskAmount && trade.riskAmount > 0) {
    riskAmount = roundMoney(trade.riskAmount, 2);
    if (riskAmount > 0) {
      rMultiple = roundMoney(grossPnl / riskAmount, 2);
    }
  }

  if (rMultiple === null && Number.isFinite(trade.rMultiple) && trade.rMultiple !== 0) {
    rMultiple = roundMoney(trade.rMultiple!, 2);
  }

  const investedCapital = entry * qty * (spec.market === 'Forex' || spec.market === 'Commodities' ? 1 : multiplier);
  const roiPercent = investedCapital > 0 ? roundMoney((netPnl / investedCapital) * 100, 2) : 0;

  const breakevenThreshold = 0.001;
  const isWinner = isClosed && netPnl > breakevenThreshold;
  const isLoser = isClosed && netPnl < -breakevenThreshold;
  const isBreakeven = isClosed && Math.abs(netPnl) <= breakevenThreshold;

  return {
    grossPnl,
    netPnl,
    rMultiple,
    riskAmount,
    pointMove: roundMoney(pointMove, 4),
    tickMove: roundMoney(tickMove, 2),
    quantity: qty,
    multiplier,
    currency: 'USD',
    isWinner,
    isLoser,
    isBreakeven,
    roiPercent,
  };
}

/**
 * Computes Gross and Net P&L for a trade using the unified calculation engine.
 */
export function calculateTradePnl(
  trade: Partial<Trade> & { contractMultiplier?: number; riskAmount?: number }
): { grossPnl: number; netPnl: number; costs: number } {
  const fin = calculateTradeFinancials(trade);
  const costs = getTradeCosts(trade).totalCosts;
  return { grossPnl: fin.grossPnl, netPnl: fin.netPnl, costs };
}

/**
 * Calculates R-Multiple for a trade using the unified calculation engine.
 */
export function calculateTradeRMultiple(
  trade: Partial<Trade> & { riskAmount?: number }
): number | null {
  return calculateTradeFinancials(trade).rMultiple;
}

// ============================================================================
// 3. AGGREGATE PERFORMANCE METRICS ENGINE
// ============================================================================

export interface ComprehensiveMetrics {
  // Counts
  totalTrades: number;
  closedTrades: number;
  openTrades: number;
  winningTrades: number;
  losingTrades: number;
  breakevenTrades: number;
  decisiveTrades: number; // winningTrades + losingTrades

  // Win Rates
  winRate: number | null; // Primary: Wins / (Wins + Losses) * 100. Null if decisiveTrades === 0
  allTradesWinRate: number; // Secondary: Wins / Total Closed Trades * 100
  lossRate: number | null; // Losses / (Wins + Losses) * 100. Null if decisiveTrades === 0
  breakevenRate: number; // Breakevens / Total Closed Trades * 100

  // P&L
  grossProfit: number;
  grossLoss: number;
  netPnl: number;
  totalCosts: number;
  totalCommissions: number;
  totalFees: number;
  totalSwap: number;

  // Profit Factor & Ratios
  profitFactor: number | null; // Gross Profit / Gross Loss. Infinity if Gross Loss === 0 and Gross Profit > 0
  payoffRatio: number | null; // Avg Win / Avg Loss. Infinity if Avg Loss === 0 and Avg Win > 0
  
  // Averages & Trade Sizes
  avgTradePnl: number; // Net PnL / Total Closed Trades
  avgWinningTrade: number; // Gross Profit / Winning Trades
  avgLosingTrade: number; // Gross Loss / Losing Trades
  largestWin: number;
  largestLoss: number;

  // Expectancy
  monetaryExpectancy: number; // (WinRate * AvgWin) - (LossRate * AvgLoss) - AvgCosts
  rMultipleExpectancy: number | null; // (WinRate * AvgWinR) - (LossRate * AvgLossR)
  avgRMultiple: number | null;
  totalRMultiple: number;

  // Drawdown & Capital
  maxDrawdownDollars: number;
  maxDrawdownPercent: number;
  currentDrawdownDollars: number;
  currentDrawdownPercent: number;
  peakEquity: number;
  finalEquity: number;
  recoveryFactor: number | null; // Net PnL / Max Drawdown Dollars

  // Streaks
  currentStreak: { type: 'WIN' | 'LOSS' | 'NONE'; count: number };
  maxConsecutiveWins: number;
  maxConsecutiveLosses: number;

  // Daily Consistency
  totalTradingDays: number;
  winningDays: number;
  losingDays: number;
  breakevenDays: number;
  dayWinRate: number | null;
  bestDayPnl: number;
  worstDayPnl: number;
  avgDailyPnl: number;
  maxConsecutiveGreenDays: number;
  maxConsecutiveRedDays: number;

  // Risk & Statistics
  dailyStdDev: number;
  sharpeRatio: number | null;
  sortinoRatio: number | null;
  profitTargetProgress?: number;
}

export interface MetricsCalculationOptions {
  initialBalance?: number;
  timezone?: string;
  breakevenThreshold?: number;
  riskFreeRateAnnual?: number;
}

/**
 * Computes all authoritative performance metrics for any set of trades.
 */
export function calculateComprehensiveMetrics(
  trades: Trade[],
  options: MetricsCalculationOptions = {}
): ComprehensiveMetrics {
  const initialBalance = options.initialBalance ?? 50000;
  const breakevenThreshold = options.breakevenThreshold ?? 0.001;
  const riskFreeRateAnnual = options.riskFreeRateAnnual ?? 0.04;

  const closed = trades.filter(t => t.status === 'CLOSED');
  const openTradesCount = trades.filter(t => t.status === 'OPEN').length;
  const totalClosed = closed.length;

  if (totalClosed === 0) {
    return {
      totalTrades: trades.length,
      closedTrades: 0,
      openTrades: openTradesCount,
      winningTrades: 0,
      losingTrades: 0,
      breakevenTrades: 0,
      decisiveTrades: 0,
      winRate: null,
      allTradesWinRate: 0,
      lossRate: null,
      breakevenRate: 0,
      grossProfit: 0,
      grossLoss: 0,
      netPnl: 0,
      totalCosts: 0,
      totalCommissions: 0,
      totalFees: 0,
      totalSwap: 0,
      profitFactor: null,
      payoffRatio: null,
      avgTradePnl: 0,
      avgWinningTrade: 0,
      avgLosingTrade: 0,
      largestWin: 0,
      largestLoss: 0,
      monetaryExpectancy: 0,
      rMultipleExpectancy: null,
      avgRMultiple: null,
      totalRMultiple: 0,
      maxDrawdownDollars: 0,
      maxDrawdownPercent: 0,
      currentDrawdownDollars: 0,
      currentDrawdownPercent: 0,
      peakEquity: initialBalance,
      finalEquity: initialBalance,
      recoveryFactor: null,
      currentStreak: { type: 'NONE', count: 0 },
      maxConsecutiveWins: 0,
      maxConsecutiveLosses: 0,
      totalTradingDays: 0,
      winningDays: 0,
      losingDays: 0,
      breakevenDays: 0,
      dayWinRate: null,
      bestDayPnl: 0,
      worstDayPnl: 0,
      avgDailyPnl: 0,
      maxConsecutiveGreenDays: 0,
      maxConsecutiveRedDays: 0,
      dailyStdDev: 0,
      sharpeRatio: null,
      sortinoRatio: null,
    };
  }

  // Sort chronologically for streak and drawdown calculations
  const sortedClosed = [...closed].sort((a, b) => {
    const timeA = new Date(a.entryDate || a.exitDate || 0).getTime();
    const timeB = new Date(b.entryDate || b.exitDate || 0).getTime();
    return timeA - timeB;
  });

  const winners: Trade[] = [];
  const losers: Trade[] = [];
  const breakevens: Trade[] = [];

  let grossProfit = 0;
  let grossLoss = 0;
  let netPnl = 0;
  let totalCommissions = 0;
  let totalFees = 0;
  let totalSwap = 0;
  let largestWin = 0;
  let largestLoss = 0;

  // Streaks
  let currentStreakType: 'WIN' | 'LOSS' | 'NONE' = 'NONE';
  let currentStreakCount = 0;
  let maxConsecutiveWins = 0;
  let maxConsecutiveLosses = 0;
  let tempWinStreak = 0;
  let tempLossStreak = 0;

  // R-Multiple calculations
  let validRCount = 0;
  let sumRMultiple = 0;
  let sumWinningR = 0;
  let sumLosingR = 0;
  let winningRCount = 0;
  let losingRCount = 0;

  // Drawdown tracking
  let runningEquity = initialBalance;
  let peakEquity = initialBalance;
  let maxDrawdownDollars = 0;
  let maxDrawdownPercent = 0;

  sortedClosed.forEach(t => {
    const fin = calculateTradeFinancials(t);
    const tradePnl = fin.netPnl;
    const costs = getTradeCosts(t);
    totalCommissions = safeAdd(totalCommissions, costs.commission);
    totalFees = safeAdd(totalFees, costs.fees);
    totalSwap = safeAdd(totalSwap, costs.swap);
    netPnl = safeAdd(netPnl, tradePnl);

    // Equity and Peak-to-Trough Drawdown
    runningEquity = safeAdd(runningEquity, tradePnl);
    if (runningEquity > peakEquity) {
      peakEquity = runningEquity;
    }
    const currentDdDollars = safeSub(peakEquity, runningEquity);
    const currentDdPercent = peakEquity > 0 ? roundMoney((currentDdDollars / peakEquity) * 100, 2) : 0;
    
    if (currentDdDollars > maxDrawdownDollars) {
      maxDrawdownDollars = currentDdDollars;
    }
    if (currentDdPercent > maxDrawdownPercent) {
      maxDrawdownPercent = currentDdPercent;
    }

    // Outcome classification with breakeven threshold
    if (tradePnl > breakevenThreshold) {
      winners.push(t);
      grossProfit = safeAdd(grossProfit, tradePnl);
      if (tradePnl > largestWin) largestWin = tradePnl;

      // Streaks
      tempWinStreak += 1;
      tempLossStreak = 0;
      if (tempWinStreak > maxConsecutiveWins) maxConsecutiveWins = tempWinStreak;
      currentStreakType = 'WIN';
      currentStreakCount = tempWinStreak;
    } else if (tradePnl < -breakevenThreshold) {
      losers.push(t);
      const absLoss = Math.abs(tradePnl);
      grossLoss = safeAdd(grossLoss, absLoss);
      if (absLoss > largestLoss) largestLoss = absLoss;

      // Streaks
      tempLossStreak += 1;
      tempWinStreak = 0;
      if (tempLossStreak > maxConsecutiveLosses) maxConsecutiveLosses = tempLossStreak;
      currentStreakType = 'LOSS';
      currentStreakCount = tempLossStreak;
    } else {
      breakevens.push(t);
      tempWinStreak = 0;
      tempLossStreak = 0;
    }

    // R-Multiple
    const r = fin.rMultiple;
    if (r !== null && Number.isFinite(r)) {
      validRCount += 1;
      sumRMultiple = safeAdd(sumRMultiple, r);
      if (r > 0) {
        sumWinningR = safeAdd(sumWinningR, r);
        winningRCount += 1;
      } else if (r < 0) {
        sumLosingR = safeAdd(sumLosingR, Math.abs(r));
        losingRCount += 1;
      }
    }
  });

  const totalCosts = safeAdd(totalCommissions, totalFees, totalSwap);
  const winningTrades = winners.length;
  const losingTrades = losers.length;
  const breakevenTrades = breakevens.length;
  const decisiveTrades = winningTrades + losingTrades;

  // Win Rate: Primary (Wins / Decisive Trades) and Secondary (Wins / Total Closed)
  const winRate = decisiveTrades > 0 ? roundMoney((winningTrades / decisiveTrades) * 100, 2) : null;
  const allTradesWinRate = totalClosed > 0 ? roundMoney((winningTrades / totalClosed) * 100, 2) : 0;
  const lossRate = decisiveTrades > 0 ? roundMoney((losingTrades / decisiveTrades) * 100, 2) : null;
  const breakevenRate = totalClosed > 0 ? roundMoney((breakevenTrades / totalClosed) * 100, 2) : 0;

  // Profit Factor: Gross Profit / Gross Loss
  let profitFactor: number | null = null;
  if (grossLoss > 0) {
    profitFactor = roundMoney(grossProfit / grossLoss, 2);
  } else if (grossProfit > 0) {
    profitFactor = Infinity;
  } else {
    profitFactor = null;
  }

  // Averages
  const avgWinningTrade = winningTrades > 0 ? roundMoney(grossProfit / winningTrades, 2) : 0;
  const avgLosingTrade = losingTrades > 0 ? roundMoney(grossLoss / losingTrades, 2) : 0;
  const avgTradePnl = totalClosed > 0 ? roundMoney(netPnl / totalClosed, 2) : 0;

  // Payoff Ratio (Avg Win / Avg Loss)
  let payoffRatio: number | null = null;
  if (avgLosingTrade > 0) {
    payoffRatio = roundMoney(avgWinningTrade / avgLosingTrade, 2);
  } else if (avgWinningTrade > 0) {
    payoffRatio = Infinity;
  }

  // Monetary Expectancy: (WinRateDecisive% * AvgWin) - (LossRateDecisive% * AvgLoss)
  let monetaryExpectancy = 0;
  if (decisiveTrades > 0 && winRate !== null && lossRate !== null) {
    const wProb = winRate / 100;
    const lProb = lossRate / 100;
    monetaryExpectancy = roundMoney((wProb * avgWinningTrade) - (lProb * avgLosingTrade), 2);
  } else if (totalClosed > 0) {
    monetaryExpectancy = avgTradePnl;
  }

  // R-Multiple Expectancy
  let rMultipleExpectancy: number | null = null;
  let avgRMultiple: number | null = null;
  if (validRCount > 0) {
    avgRMultiple = roundMoney(sumRMultiple / validRCount, 2);
    if (decisiveTrades > 0 && winRate !== null && lossRate !== null) {
      const avgWinR = winningRCount > 0 ? sumWinningR / winningRCount : 0;
      const avgLossR = losingRCount > 0 ? sumLosingR / losingRCount : 1;
      const wProb = winRate / 100;
      const lProb = lossRate / 100;
      rMultipleExpectancy = roundMoney((wProb * avgWinR) - (lProb * avgLossR), 2);
    }
  }

  // Current Drawdown
  const currentDrawdownDollars = safeSub(peakEquity, runningEquity);
  const currentDrawdownPercent = peakEquity > 0 ? roundMoney((currentDrawdownDollars / peakEquity) * 100, 2) : 0;
  
  // Recovery Factor = Net PnL / Max Drawdown Dollars
  let recoveryFactor: number | null = null;
  if (maxDrawdownDollars > 0) {
    recoveryFactor = roundMoney(netPnl / maxDrawdownDollars, 2);
  } else if (netPnl > 0) {
    recoveryFactor = Infinity;
  }

  // ==========================================
  // Daily Grouping & Consistency Statistics
  // ==========================================
  const dayPnlMap = new Map<string, number>();
  sortedClosed.forEach(t => {
    const fin = calculateTradeFinancials(t);
    const dateKey = t.entryDate ? t.entryDate.split('T')[0] : 'UNKNOWN_DAY';
    const currentDayPnl = dayPnlMap.get(dateKey) || 0;
    dayPnlMap.set(dateKey, safeAdd(currentDayPnl, fin.netPnl));
  });

  const dailyPnls = Array.from(dayPnlMap.values());
  const totalTradingDays = dailyPnls.length;
  const winningDays = dailyPnls.filter(pnl => pnl > breakevenThreshold).length;
  const losingDays = dailyPnls.filter(pnl => pnl < -breakevenThreshold).length;
  const breakevenDays = dailyPnls.filter(pnl => Math.abs(pnl) <= breakevenThreshold).length;
  const decisiveDays = winningDays + losingDays;
  const dayWinRate = decisiveDays > 0 ? roundMoney((winningDays / decisiveDays) * 100, 2) : null;

  const bestDayPnl = dailyPnls.length > 0 ? Math.max(...dailyPnls) : 0;
  const worstDayPnl = dailyPnls.length > 0 ? Math.min(...dailyPnls) : 0;
  const avgDailyPnl = totalTradingDays > 0 ? roundMoney(netPnl / totalTradingDays, 2) : 0;

  // Daily consecutive streaks
  let maxConsecutiveGreenDays = 0;
  let maxConsecutiveRedDays = 0;
  let tempGreen = 0;
  let tempRed = 0;

  dailyPnls.forEach(pnl => {
    if (pnl > breakevenThreshold) {
      tempGreen += 1;
      tempRed = 0;
      if (tempGreen > maxConsecutiveGreenDays) maxConsecutiveGreenDays = tempGreen;
    } else if (pnl < -breakevenThreshold) {
      tempRed += 1;
      tempGreen = 0;
      if (tempRed > maxConsecutiveRedDays) maxConsecutiveRedDays = tempRed;
    } else {
      tempGreen = 0;
      tempRed = 0;
    }
  });

  // Daily Standard Deviation & Sharpe/Sortino Ratios
  let dailyStdDev = 0;
  let sharpeRatio: number | null = null;
  let sortinoRatio: number | null = null;

  if (totalTradingDays > 1) {
    const meanDaily = netPnl / totalTradingDays;
    const variance = dailyPnls.reduce((acc, pnl) => acc + Math.pow(pnl - meanDaily, 2), 0) / (totalTradingDays - 1);
    dailyStdDev = roundMoney(Math.sqrt(variance), 2);

    const downsideVariance = dailyPnls
      .filter(pnl => pnl < 0)
      .reduce((acc, pnl) => acc + Math.pow(pnl, 2), 0) / (totalTradingDays - 1);
    const downsideStdDev = Math.sqrt(downsideVariance);

    const dailyRiskFreeReturn = (initialBalance * riskFreeRateAnnual) / 252;
    const excessMeanReturn = meanDaily - dailyRiskFreeReturn;

    if (dailyStdDev > 0) {
      sharpeRatio = roundMoney((excessMeanReturn / dailyStdDev) * Math.sqrt(252), 2);
    }
    if (downsideStdDev > 0) {
      sortinoRatio = roundMoney((excessMeanReturn / downsideStdDev) * Math.sqrt(252), 2);
    }
  }

  return {
    totalTrades: trades.length,
    closedTrades: totalClosed,
    openTrades: openTradesCount,
    winningTrades,
    losingTrades,
    breakevenTrades,
    decisiveTrades,
    winRate,
    allTradesWinRate,
    lossRate,
    breakevenRate,
    grossProfit,
    grossLoss,
    netPnl,
    totalCosts,
    totalCommissions,
    totalFees,
    totalSwap,
    profitFactor,
    payoffRatio,
    avgTradePnl,
    avgWinningTrade,
    avgLosingTrade,
    largestWin,
    largestLoss,
    monetaryExpectancy,
    rMultipleExpectancy,
    avgRMultiple,
    totalRMultiple: sumRMultiple,
    maxDrawdownDollars,
    maxDrawdownPercent,
    currentDrawdownDollars,
    currentDrawdownPercent,
    peakEquity,
    finalEquity: runningEquity,
    recoveryFactor,
    currentStreak: { type: currentStreakType, count: currentStreakCount },
    maxConsecutiveWins,
    maxConsecutiveLosses,
    totalTradingDays,
    winningDays,
    losingDays,
    breakevenDays,
    dayWinRate,
    bestDayPnl,
    worstDayPnl,
    avgDailyPnl,
    maxConsecutiveGreenDays,
    maxConsecutiveRedDays,
    dailyStdDev,
    sharpeRatio,
    sortinoRatio,
  };
}

// ============================================================================
// 4. POSITION SIZING & RISK CALCULATOR ENGINE
// ============================================================================

export type AssetClass = 'FUTURES' | 'FOREX' | 'STOCKS' | 'CRYPTO';

export interface PositionSizeInput {
  assetClass: AssetClass;
  accountBalance: number;
  riskPercent?: number;
  riskDollars?: number;
  entryPrice: number;
  stopLossPrice: number;
  takeProfitPrice?: number;
  
  // Asset specific specs
  futuresTickSize?: number;
  futuresTickValue?: number;
  futuresContractMultiplier?: number;
  forexPipSize?: number;
  forexPipValuePerStandardLot?: number;
}

export interface PositionSizeResult {
  riskAmount: number;
  positionUnits: number;
  maxContracts: number;
  stopLossDistance: number;
  stopLossTicksOrPips: number;
  totalPositionValue: number;
  estimatedProfitAtTarget: number | null;
  riskRewardRatio: number | null;
  rMultiple: number | null;
  riskPercentOfAccount: number;
}

/**
 * Calculates exact position sizing with mathematically verified tick/pip values.
 */
export function calculatePositionSize(input: PositionSizeInput): PositionSizeResult {
  const balance = Math.max(1, input.accountBalance);
  let riskAmount = input.riskDollars ?? 0;

  if (input.riskPercent !== undefined && input.riskPercent > 0) {
    riskAmount = roundMoney((balance * input.riskPercent) / 100, 2);
  }

  const entry = input.entryPrice;
  const stop = input.stopLossPrice;
  const tp = input.takeProfitPrice;
  const priceDistance = Math.abs(entry - stop);

  if (priceDistance <= 0 || riskAmount <= 0) {
    return {
      riskAmount: 0,
      positionUnits: 0,
      maxContracts: 0,
      stopLossDistance: 0,
      stopLossTicksOrPips: 0,
      totalPositionValue: 0,
      estimatedProfitAtTarget: null,
      riskRewardRatio: null,
      rMultiple: null,
      riskPercentOfAccount: 0,
    };
  }

  let positionUnits = 0;
  let stopLossTicksOrPips = 0;
  let totalPositionValue = 0;

  switch (input.assetClass) {
    case 'FUTURES': {
      const tickSize = input.futuresTickSize || 0.25;
      const tickValue = input.futuresTickValue || 5.0;
      stopLossTicksOrPips = roundMoney(priceDistance / tickSize, 1);
      const riskPerContract = stopLossTicksOrPips * tickValue;
      positionUnits = riskPerContract > 0 ? Math.floor(riskAmount / riskPerContract) : 0;
      totalPositionValue = positionUnits * entry * (input.futuresContractMultiplier || 20);
      break;
    }
    case 'FOREX': {
      const pipSize = input.forexPipSize || 0.0001;
      const pipValuePerLot = input.forexPipValuePerStandardLot || 10.0;
      stopLossTicksOrPips = roundMoney(priceDistance / pipSize, 1);
      const riskPerStandardLot = stopLossTicksOrPips * pipValuePerLot;
      positionUnits = riskPerStandardLot > 0 ? roundMoney(riskAmount / riskPerStandardLot, 2) : 0;
      totalPositionValue = positionUnits * 100000 * entry;
      break;
    }
    case 'STOCKS':
    case 'CRYPTO':
    default: {
      stopLossTicksOrPips = roundMoney(priceDistance, 2);
      positionUnits = priceDistance > 0 ? Math.floor(riskAmount / priceDistance) : 0;
      totalPositionValue = roundMoney(positionUnits * entry, 2);
      break;
    }
  }

  // Risk / Reward & Target Profit
  let estimatedProfitAtTarget: number | null = null;
  let riskRewardRatio: number | null = null;

  if (tp && tp > 0) {
    const targetDistance = Math.abs(tp - entry);
    riskRewardRatio = roundMoney(targetDistance / priceDistance, 2);
    estimatedProfitAtTarget = roundMoney(riskAmount * riskRewardRatio, 2);
  }

  const riskPercentOfAccount = roundMoney((riskAmount / balance) * 100, 2);

  return {
    riskAmount,
    positionUnits,
    maxContracts: positionUnits,
    stopLossDistance: roundMoney(priceDistance, 4),
    stopLossTicksOrPips,
    totalPositionValue: roundMoney(totalPositionValue, 2),
    estimatedProfitAtTarget,
    riskRewardRatio,
    rMultiple: riskRewardRatio,
    riskPercentOfAccount,
  };
}

// ============================================================================
// 5. COMPOUNDING PROJECTION ENGINE
// ============================================================================

export interface CompoundingMonthResult {
  month: number;
  startBalance: number;
  monthlyGain: number;
  monthlyContribution: number;
  endBalance: number;
  cumulativeProfit: number;
  cumulativeGrowthPercent: number;
}

export interface CompoundingProjectionResult {
  initialBalance: number;
  finalBalance: number;
  totalNetProfit: number;
  totalContributions: number;
  totalGrowthPercent: number;
  monthlyBreakdown: CompoundingMonthResult[];
}

/**
 * Calculates accurate monthly compounding growth projection.
 */
export function calculateCompoundingProjection(
  initialBalance: number,
  monthlyGainPercent: number,
  months: number,
  monthlyContribution: number = 0
): CompoundingProjectionResult {
  const breakdown: CompoundingMonthResult[] = [];
  let currentBalance = Math.max(0, initialBalance);
  let totalContributions = 0;

  for (let m = 1; m <= months; m++) {
    const startBalance = currentBalance;
    const monthlyGain = roundMoney(startBalance * (monthlyGainPercent / 100), 2);
    const contribution = roundMoney(monthlyContribution, 2);
    totalContributions = safeAdd(totalContributions, contribution);
    currentBalance = safeAdd(startBalance, monthlyGain, contribution);

    const cumulativeProfit = safeSub(currentBalance, safeAdd(initialBalance, totalContributions));
    const cumulativeGrowthPercent = initialBalance > 0
      ? roundMoney(((currentBalance - initialBalance) / initialBalance) * 100, 2)
      : 0;

    breakdown.push({
      month: m,
      startBalance,
      monthlyGain,
      monthlyContribution: contribution,
      endBalance: currentBalance,
      cumulativeProfit,
      cumulativeGrowthPercent,
    });
  }

  const finalBalance = currentBalance;
  const totalNetProfit = safeSub(finalBalance, safeAdd(initialBalance, totalContributions));
  const totalGrowthPercent = initialBalance > 0
    ? roundMoney(((finalBalance - initialBalance) / initialBalance) * 100, 2)
    : 0;

  return {
    initialBalance,
    finalBalance,
    totalNetProfit,
    totalContributions,
    totalGrowthPercent,
    monthlyBreakdown: breakdown,
  };
}

// ============================================================================
// 6. FORMATTING UTILITIES FOR TRANSPARENT UI DISPLAY
// ============================================================================

/**
 * Safely formats a win rate or percentage.
 * Returns 'N/A' when value is null.
 */
export function formatPercentage(val: number | null | undefined, decimals: number = 1): string {
  if (val === null || val === undefined || isNaN(val)) {
    return 'N/A';
  }
  return `${val.toFixed(decimals)}%`;
}

/**
 * Safely formats a Profit Factor.
 * Handles Infinity cleanly as '∞' or 'Infinite (0 Losses)'.
 */
export function formatProfitFactor(val: number | null | undefined): string {
  if (val === null || val === undefined || isNaN(val)) {
    return 'N/A';
  }
  if (!isFinite(val) || val === Infinity) {
    return '∞';
  }
  return val.toFixed(2);
}

/**
 * Safely formats an R-Multiple value.
 */
export function formatRValue(val: number | null | undefined): string {
  if (val === null || val === undefined || isNaN(val)) {
    return 'N/A';
  }
  return `${val >= 0 ? '+' : ''}${val.toFixed(2)}R`;
}
