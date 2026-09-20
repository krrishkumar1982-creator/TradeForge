import {
  Trade,
  TradingAccount,
  RiskGoalSettings,
  RiskMode,
  CircuitBreakerStatus,
  DrawdownMethodology,
  RiskEvent,
  RiskMetricState,
} from '../types';

export interface InstrumentSpec {
  symbol: string;
  name: string;
  market: 'Futures' | 'Forex' | 'Crypto' | 'Stocks' | 'Indices' | 'Commodities' | 'CFDs';
  pointValue: number; // Dollar value of a full 1.0 point move per 1 unit
  tickSize: number;
  tickValue: number;
  unitLabel: 'contracts' | 'lots' | 'shares' | 'units';
  defaultCommission: number;
}

export const INSTRUMENT_SPECS: Record<string, InstrumentSpec> = {
  // Futures - Equity Indices
  ES: { symbol: 'ES', name: 'E-mini S&P 500', market: 'Futures', pointValue: 50, tickSize: 0.25, tickValue: 12.5, unitLabel: 'contracts', defaultCommission: 2.5 },
  MES: { symbol: 'MES', name: 'Micro E-mini S&P 500', market: 'Futures', pointValue: 5, tickSize: 0.25, tickValue: 1.25, unitLabel: 'contracts', defaultCommission: 0.62 },
  NQ: { symbol: 'NQ', name: 'E-mini Nasdaq 100', market: 'Futures', pointValue: 20, tickSize: 0.25, tickValue: 5.0, unitLabel: 'contracts', defaultCommission: 2.5 },
  MNQ: { symbol: 'MNQ', name: 'Micro E-mini Nasdaq 100', market: 'Futures', pointValue: 2, tickSize: 0.25, tickValue: 0.5, unitLabel: 'contracts', defaultCommission: 0.62 },
  YM: { symbol: 'YM', name: 'E-mini Dow Jones', market: 'Futures', pointValue: 5, tickSize: 1.0, tickValue: 5.0, unitLabel: 'contracts', defaultCommission: 2.5 },
  MYM: { symbol: 'MYM', name: 'Micro E-mini Dow Jones', market: 'Futures', pointValue: 0.5, tickSize: 1.0, tickValue: 0.5, unitLabel: 'contracts', defaultCommission: 0.62 },
  RTY: { symbol: 'RTY', name: 'E-mini Russell 2000', market: 'Futures', pointValue: 50, tickSize: 0.1, tickValue: 5.0, unitLabel: 'contracts', defaultCommission: 2.5 },
  M2K: { symbol: 'M2K', name: 'Micro E-mini Russell 2000', market: 'Futures', pointValue: 5, tickSize: 0.1, tickValue: 0.5, unitLabel: 'contracts', defaultCommission: 0.62 },

  // Futures - Commodities & Energy
  CL: { symbol: 'CL', name: 'Crude Oil', market: 'Futures', pointValue: 1000, tickSize: 0.01, tickValue: 10.0, unitLabel: 'contracts', defaultCommission: 2.5 },
  MCL: { symbol: 'MCL', name: 'Micro Crude Oil', market: 'Futures', pointValue: 100, tickSize: 0.01, tickValue: 1.0, unitLabel: 'contracts', defaultCommission: 0.62 },
  GC: { symbol: 'GC', name: 'Gold Futures', market: 'Futures', pointValue: 100, tickSize: 0.1, tickValue: 10.0, unitLabel: 'contracts', defaultCommission: 2.5 },
  MGC: { symbol: 'MGC', name: 'Micro Gold Futures', market: 'Futures', pointValue: 10, tickSize: 0.1, tickValue: 1.0, unitLabel: 'contracts', defaultCommission: 0.62 },
  SI: { symbol: 'SI', name: 'Silver Futures', market: 'Futures', pointValue: 5000, tickSize: 0.005, tickValue: 25.0, unitLabel: 'contracts', defaultCommission: 2.5 },
  HG: { symbol: 'HG', name: 'Copper Futures', market: 'Futures', pointValue: 25000, tickSize: 0.0005, tickValue: 12.5, unitLabel: 'contracts', defaultCommission: 2.5 },

  // Forex Spot / CFD (Standard lot = 100,000 units)
  EURUSD: { symbol: 'EURUSD', name: 'Euro / US Dollar', market: 'Forex', pointValue: 100000, tickSize: 0.00001, tickValue: 1.0, unitLabel: 'lots', defaultCommission: 3.5 },
  GBPUSD: { symbol: 'GBPUSD', name: 'British Pound / US Dollar', market: 'Forex', pointValue: 100000, tickSize: 0.00001, tickValue: 1.0, unitLabel: 'lots', defaultCommission: 3.5 },
  USDJPY: { symbol: 'USDJPY', name: 'US Dollar / Japanese Yen', market: 'Forex', pointValue: 666.67, tickSize: 0.001, tickValue: 0.67, unitLabel: 'lots', defaultCommission: 3.5 },
  AUDUSD: { symbol: 'AUDUSD', name: 'Australian Dollar / US Dollar', market: 'Forex', pointValue: 100000, tickSize: 0.00001, tickValue: 1.0, unitLabel: 'lots', defaultCommission: 3.5 },
  USDCAD: { symbol: 'USDCAD', name: 'US Dollar / Canadian Dollar', market: 'Forex', pointValue: 73000, tickSize: 0.00001, tickValue: 0.73, unitLabel: 'lots', defaultCommission: 3.5 },
  XAUUSD: { symbol: 'XAUUSD', name: 'Gold / US Dollar Spot', market: 'Commodities', pointValue: 100, tickSize: 0.01, tickValue: 1.0, unitLabel: 'lots', defaultCommission: 3.5 },

  // Crypto
  BTCUSD: { symbol: 'BTCUSD', name: 'Bitcoin / US Dollar', market: 'Crypto', pointValue: 1, tickSize: 0.1, tickValue: 0.1, unitLabel: 'units', defaultCommission: 5.0 },
  ETHUSD: { symbol: 'ETHUSD', name: 'Ethereum / US Dollar', market: 'Crypto', pointValue: 1, tickSize: 0.01, tickValue: 0.01, unitLabel: 'units', defaultCommission: 1.5 },
  SOLUSD: { symbol: 'SOLUSD', name: 'Solana / US Dollar', market: 'Crypto', pointValue: 1, tickSize: 0.01, tickValue: 0.01, unitLabel: 'units', defaultCommission: 0.5 },

  // Equities & Indices CFDs
  SPY: { symbol: 'SPY', name: 'SPDR S&P 500 ETF', market: 'Stocks', pointValue: 1, tickSize: 0.01, tickValue: 0.01, unitLabel: 'shares', defaultCommission: 0 },
  QQQ: { symbol: 'QQQ', name: 'Invesco QQQ ETF', market: 'Stocks', pointValue: 1, tickSize: 0.01, tickValue: 0.01, unitLabel: 'shares', defaultCommission: 0 },
  NVDA: { symbol: 'NVDA', name: 'Nvidia Corp', market: 'Stocks', pointValue: 1, tickSize: 0.01, tickValue: 0.01, unitLabel: 'shares', defaultCommission: 0 },
  AAPL: { symbol: 'AAPL', name: 'Apple Inc', market: 'Stocks', pointValue: 1, tickSize: 0.01, tickValue: 0.01, unitLabel: 'shares', defaultCommission: 0 },
  TSLA: { symbol: 'TSLA', name: 'Tesla Inc', market: 'Stocks', pointValue: 1, tickSize: 0.01, tickValue: 0.01, unitLabel: 'shares', defaultCommission: 0 },
};

/**
 * Returns the point multiplier for an instrument symbol or market type
 */
export function getInstrumentPointMultiplier(symbol: string = '', market: string = 'Futures'): number {
  const cleanSymbol = symbol.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (INSTRUMENT_SPECS[cleanSymbol]) {
    return INSTRUMENT_SPECS[cleanSymbol].pointValue;
  }
  // Check market type fallback
  if (market === 'Forex') {
    return 100000;
  }
  if (market === 'Futures') {
    if (cleanSymbol.startsWith('M')) return 2; // Default micro
    return 20; // Default mini
  }
  return 1;
}

export function getInstrumentUnitLabel(symbol: string = '', market: string = 'Futures'): 'contracts' | 'lots' | 'shares' | 'units' {
  const cleanSymbol = symbol.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (INSTRUMENT_SPECS[cleanSymbol]) {
    return INSTRUMENT_SPECS[cleanSymbol].unitLabel;
  }
  if (market === 'Forex') return 'lots';
  if (market === 'Stocks') return 'shares';
  if (market === 'Futures') return 'contracts';
  return 'units';
}

/**
 * Helper to get local YYYY-MM-DD string
 */
export function getLocalDateString(dateInput: Date | string = new Date()): string {
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Helper to get Monday and Sunday of current week
 */
export function getStartAndEndOfWeek(dateInput: Date = new Date()) {
  const d = new Date(dateInput);
  const day = d.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return { monday, sunday };
}

export interface PositionRiskCalcParams {
  symbol: string;
  market?: any;
  direction: 'BUY' | 'SELL';
  entryPrice: number;
  stopLoss?: number;
  takeProfit?: number;
  quantity: number;
  accountBalance: number;
  riskMode?: RiskMode;
  maxRiskPerTradeAmount?: number;
  maxRiskPerTradePercent?: number;
}

export interface PositionRiskResult {
  multiplier: number;
  stopDistancePoints: number;
  riskPerUnit: number;
  grossRiskDollar: number;
  riskPercentOfBalance: number;
  effectiveMaxRiskDollar: number;
  isRiskExceeded: boolean;
  rewardDistancePoints: number;
  rewardDollar: number;
  rMultiple: number;
  unitLabel: string;
}

/**
 * Accurately calculate trade position risk in dollars and percent based on instrument specs
 */
export function calculatePositionRisk(params: PositionRiskCalcParams): PositionRiskResult {
  const {
    symbol,
    market = 'Futures',
    direction,
    entryPrice,
    stopLoss,
    takeProfit,
    quantity,
    accountBalance,
    riskMode = 'LOWER_OF_BOTH',
    maxRiskPerTradeAmount = 0,
    maxRiskPerTradePercent = 0,
  } = params;

  const multiplier = getInstrumentPointMultiplier(symbol, market);
  const unitLabel = getInstrumentUnitLabel(symbol, market);

  const effectiveEntry = Number(entryPrice) || 0;
  const effectiveQty = Number(quantity) || 1;

  let effectiveSL = Number(stopLoss);
  if (!effectiveSL || isNaN(effectiveSL)) {
    // Default 5 points away if not set
    effectiveSL = direction === 'BUY' ? effectiveEntry - 5 : effectiveEntry + 5;
  }

  const stopDistancePoints = Math.abs(effectiveEntry - effectiveSL);
  const riskPerUnit = stopDistancePoints * multiplier;
  const grossRiskDollar = riskPerUnit * effectiveQty;
  const riskPercentOfBalance = accountBalance > 0 ? (grossRiskDollar / accountBalance) * 100 : 0;

  // Calculate target reward and R:R
  let rewardDistancePoints = 0;
  let rewardDollar = 0;
  let rMultiple = 0;

  if (takeProfit && !isNaN(Number(takeProfit))) {
    const numTP = Number(takeProfit);
    rewardDistancePoints = direction === 'BUY' ? numTP - effectiveEntry : effectiveEntry - numTP;
    rewardDollar = Math.max(0, rewardDistancePoints * multiplier * effectiveQty);
    if (grossRiskDollar > 0) {
      rMultiple = parseFloat((rewardDollar / grossRiskDollar).toFixed(2));
    }
  }

  // Determine effective maximum risk based on Risk Mode
  const dollarCap = maxRiskPerTradeAmount > 0 ? maxRiskPerTradeAmount : Infinity;
  const percentCapDollar = maxRiskPerTradePercent > 0 && accountBalance > 0
    ? (accountBalance * maxRiskPerTradePercent) / 100
    : Infinity;

  let effectiveMaxRiskDollar = Infinity;
  if (riskMode === 'FIXED_DOLLAR') {
    effectiveMaxRiskDollar = dollarCap;
  } else if (riskMode === 'PERCENTAGE') {
    effectiveMaxRiskDollar = percentCapDollar;
  } else {
    // LOWER_OF_BOTH
    effectiveMaxRiskDollar = Math.min(dollarCap, percentCapDollar);
  }

  const isRiskExceeded = effectiveMaxRiskDollar !== Infinity && grossRiskDollar > (effectiveMaxRiskDollar + 0.01);

  return {
    multiplier,
    stopDistancePoints,
    riskPerUnit,
    grossRiskDollar,
    riskPercentOfBalance,
    effectiveMaxRiskDollar,
    isRiskExceeded,
    rewardDistancePoints,
    rewardDollar,
    rMultiple,
    unitLabel,
  };
}

/**
 * Calculate recommended position size to comply with max risk limit
 */
export function calculateRecommendedPositionSize(
  symbol: string,
  market: string,
  entryPrice: number,
  stopLoss: number,
  accountBalance: number,
  riskGoals: RiskGoalSettings
): number {
  if (!entryPrice || !stopLoss || entryPrice === stopLoss) return 1;

  const multiplier = getInstrumentPointMultiplier(symbol, market);
  const stopDistance = Math.abs(entryPrice - stopLoss);
  const riskPerContract = stopDistance * multiplier;
  if (riskPerContract <= 0) return 1;

  const dollarCap = riskGoals.maxRiskPerTradeAmount || Infinity;
  const percentCap = riskGoals.maxRiskPerTradePercent && accountBalance > 0
    ? (accountBalance * riskGoals.maxRiskPerTradePercent) / 100
    : Infinity;

  let maxAllowedDollar = Infinity;
  const mode = riskGoals.riskMode || 'LOWER_OF_BOTH';
  if (mode === 'FIXED_DOLLAR') {
    maxAllowedDollar = dollarCap;
  } else if (mode === 'PERCENTAGE') {
    maxAllowedDollar = percentCap;
  } else {
    maxAllowedDollar = Math.min(dollarCap, percentCap);
  }

  if (maxAllowedDollar === Infinity) {
    return riskGoals.maxContractsPerTrade || 1;
  }

  let idealQty = Math.floor(maxAllowedDollar / riskPerContract);
  if (idealQty < 1) idealQty = 1;

  if (riskGoals.maxContractsPerTrade && riskGoals.maxContractsPerTrade > 0) {
    idealQty = Math.min(idealQty, riskGoals.maxContractsPerTrade);
  }

  return idealQty;
}

export interface EvaluatedAccountRisk {
  accountId: string;
  accountName: string;
  accountBalance: number;
  currentEquity: number;
  peakEquity: number;
  todayRealizedPnl: number;
  todayGrossPnl: number;
  todayCommissions: number;
  todayFees: number;
  todayLossAbs: number;
  todayProfitAbs: number;
  todayTradeCount: number;
  todayClosedTradesCount: number;
  weekRealizedPnl: number;
  weekLossAbs: number;
  weekTradeCount: number;
  trailingDrawdown: number;
  trailingDrawdownPercent: number;
  drawdownPeak: number;
  openPositionsCount: number;
  portfolioHeatDollar: number;
  portfolioHeatPercent: number;
  consecutiveLossesStreak: number;
  circuitBreaker: {
    state: CircuitBreakerStatus;
    isLocked: boolean;
    reason?: string;
    warningThresholdPercent: number;
    criticalThresholdPercent: number;
  };
  metrics: {
    dailyLoss: RiskMetricState;
    weeklyLoss: RiskMetricState;
    weeklyProfitTarget: RiskMetricState;
    trailingDrawdown: RiskMetricState;
    dailyTrades: RiskMetricState;
    maxContracts: RiskMetricState;
    maxRiskPerTrade: RiskMetricState;
    consecutiveLosses: RiskMetricState;
    openPositions: RiskMetricState;
    minRMultiple: RiskMetricState;
  };
}

/**
 * Single authoritative calculation of all risk metrics for an account or all accounts
 */
export function evaluateAccountRisk(
  accountId: string,
  accounts: TradingAccount[],
  trades: Trade[],
  riskGoals: RiskGoalSettings,
  options?: {
    includeFloatingPnl?: boolean;
    includeFees?: boolean;
    includeCommissions?: boolean;
    drawdownMethodology?: DrawdownMethodology;
  }
): EvaluatedAccountRisk {
  const isAll = !accountId || accountId === 'all';
  const targetAccount = isAll ? null : accounts.find((a) => a.id === accountId) || null;
  const accountName = isAll
    ? 'All Accounts (Aggregated)'
    : targetAccount
    ? `${targetAccount.name} (${targetAccount.broker || targetAccount.type})`
    : 'Selected Account';

  // Filter trades for this account
  const accountTrades = isAll ? trades : trades.filter((t) => t.accountId === accountId);

  // Account Capital Baseline
  let accountBalance = 0;
  if (isAll) {
    accountBalance = accounts.reduce((sum, a) => sum + (Number(a.initialBalance) || 0), 0);
  } else if (targetAccount) {
    accountBalance = Number(targetAccount.initialBalance) || 0;
  }
  if (accountBalance <= 0) accountBalance = 50000; // Fallback sensible default if empty

  // Today Trades
  const todayStr = getLocalDateString(new Date());
  const todayTrades = accountTrades.filter((t) => {
    const entryStr = getLocalDateString(t.entryDate);
    const exitStr = getLocalDateString(t.exitDate);
    return entryStr === todayStr || exitStr === todayStr;
  });

  const todayClosedTrades = todayTrades.filter((t) => t.status === 'CLOSED');
  const todayOpenTrades = todayTrades.filter((t) => t.status === 'OPEN');

  // Today P&L
  let todayGrossPnl = 0;
  let todayCommissions = 0;
  let todayFees = 0;
  let todayRealizedPnl = 0;

  todayClosedTrades.forEach((t) => {
    todayGrossPnl += Number(t.grossPnl) || 0;
    todayCommissions += Number(t.commission) || 0;
    todayFees += Number(t.fees || t.swap) || 0;
    todayRealizedPnl += Number(t.netPnl) || 0;
  });

  // Optional: include floating P&L
  const includeFloating = options?.includeFloatingPnl ?? riskGoals.includeFloatingPnl ?? false;
  if (includeFloating) {
    todayOpenTrades.forEach((t) => {
      todayRealizedPnl += Number(t.netPnl || t.grossPnl) || 0;
    });
  }

  const todayLossAbs = todayRealizedPnl < 0 ? Math.abs(todayRealizedPnl) : 0;
  const todayProfitAbs = todayRealizedPnl > 0 ? todayRealizedPnl : 0;

  // Weekly Trades & P&L
  const { monday, sunday } = getStartAndEndOfWeek(new Date());
  const weekClosedTrades = accountTrades.filter((t) => {
    if (t.status !== 'CLOSED') return false;
    const dateStr = t.exitDate || t.entryDate;
    if (!dateStr) return false;
    const d = new Date(dateStr);
    return d >= monday && d <= sunday;
  });

  const weekRealizedPnl = weekClosedTrades.reduce((sum, t) => sum + (Number(t.netPnl) || 0), 0);
  const weekLossAbs = weekRealizedPnl < 0 ? Math.abs(weekRealizedPnl) : 0;

  // Trailing Drawdown & Equity Peak
  const closedTrades = accountTrades.filter((t) => t.status === 'CLOSED');
  const sortedClosedTrades = [...closedTrades].sort((a, b) => {
    const timeA = new Date(a.entryDate || a.exitDate || 0).getTime();
    const timeB = new Date(b.entryDate || b.exitDate || 0).getTime();
    return timeA - timeB;
  });

  let runningEquity = accountBalance;
  let peakEquity = accountBalance;

  sortedClosedTrades.forEach((t) => {
    runningEquity += Number(t.netPnl) || 0;
    if (runningEquity > peakEquity) {
      peakEquity = runningEquity;
    }
  });

  const currentEquity = runningEquity;
  const trailingDrawdown = Math.max(0, peakEquity - currentEquity);
  const trailingDrawdownPercent = peakEquity > 0 ? (trailingDrawdown / peakEquity) * 100 : 0;

  // Open Positions & Portfolio Heat (total dollar & percentage of open risk)
  const openPositions = accountTrades.filter((t) => t.status === 'OPEN');
  const openPositionsCount = openPositions.length;

  let portfolioHeatDollar = 0;
  openPositions.forEach((pos) => {
    const mult = getInstrumentPointMultiplier(pos.symbol, pos.market);
    if (pos.entryPrice && pos.stopLoss) {
      const dist = Math.abs(pos.entryPrice - pos.stopLoss);
      portfolioHeatDollar += dist * mult * (pos.quantity || 1);
    } else {
      // Default estimate 1% if SL not set
      portfolioHeatDollar += accountBalance * 0.01;
    }
  });
  const portfolioHeatPercent = accountBalance > 0 ? (portfolioHeatDollar / accountBalance) * 100 : 0;

  // Consecutive Losses Streak (from most recent closed trades backwards)
  const reverseSortedTrades = [...sortedClosedTrades].reverse();
  let consecutiveLossesStreak = 0;
  for (const t of reverseSortedTrades) {
    if ((Number(t.netPnl) || 0) < 0) {
      consecutiveLossesStreak++;
    } else if ((Number(t.netPnl) || 0) > 0) {
      break;
    }
  }

  // Circuit Breaker State Determination
  const dailyMaxLoss = riskGoals.dailyMaxLoss || riskGoals.maxDailyLoss || 0;
  const warningPct = riskGoals.warningThresholdPercent || 75;
  const criticalPct = riskGoals.criticalThresholdPercent || 90;
  const hardLockEnabled = !!riskGoals.hardLockEnabled;

  const isDailyBreached = dailyMaxLoss > 0 && todayLossAbs >= dailyMaxLoss;
  const isHardLocked = !!riskGoals.circuitBreakerTriggered && hardLockEnabled;

  let cbState: CircuitBreakerStatus = riskGoals.circuitBreakerState || 'DISARMED';
  let cbReason = '';

  if (isHardLocked) {
    cbState = 'LOCKED';
    cbReason = riskGoals.lockReason || 'Hard lockout engaged. Manual unlock authorization required.';
  } else if (riskGoals.circuitBreakerTriggered || isDailyBreached) {
    cbState = 'TRIGGERED';
    cbReason = `Daily loss limit reached ($${todayLossAbs.toFixed(2)} / $${dailyMaxLoss.toFixed(2)}). Entries blocked.`;
  } else if (cbState !== 'DISARMED') {
    if (dailyMaxLoss > 0 && todayLossAbs >= (dailyMaxLoss * criticalPct) / 100) {
      cbState = 'CRITICAL';
      cbReason = `Loss at ${Math.round((todayLossAbs / dailyMaxLoss) * 100)}% of daily limit. Approaching circuit trigger.`;
    } else if (dailyMaxLoss > 0 && todayLossAbs >= (dailyMaxLoss * warningPct) / 100) {
      cbState = 'CAUTION';
      cbReason = `Loss at ${Math.round((todayLossAbs / dailyMaxLoss) * 100)}% of daily limit. Caution advised.`;
    } else {
      cbState = 'ARMED';
    }
  }

  // Metrics Evaluation for Limit vs Current Matrix
  const weeklyLossLimit = riskGoals.weeklyLossLimit || riskGoals.maxWeeklyLoss || 0;
  const weeklyProfitTarget = riskGoals.weeklyProfitTarget || 0;
  const maxDrawdown = riskGoals.trailingDrawdownLimit || riskGoals.maxDrawdown || riskGoals.maxDrawdownLimit || 0;
  const maxTradesPerDay = riskGoals.maxTradesPerDay || 0;
  const maxContracts = riskGoals.maxContractsPerTrade || 0;
  const maxRiskDollar = riskGoals.maxRiskPerTradeAmount || 0;
  const maxLossStreak = riskGoals.maxConsecutiveLosses || 0;
  const maxOpenPos = riskGoals.maxOpenPositions || 0;
  const minR = riskGoals.minRMultiple || 0;

  const buildMetric = (
    name: string,
    current: number,
    limit: number,
    unit: '$' | '%' | 'trades' | 'contracts' | 'R' | 'count',
    isReverse: boolean = false // for target where higher current is better
  ): RiskMetricState => {
    if (limit <= 0) {
      return {
        name,
        current,
        limit,
        unit,
        percentUsed: 0,
        status: 'NORMAL',
        message: 'No limit configured',
      };
    }

    const pct = Math.round((current / limit) * 100);
    let status: 'NORMAL' | 'CAUTION' | 'CRITICAL' | 'BREACHED' = 'NORMAL';
    let message = `${pct}% of limit used`;

    if (!isReverse) {
      if (current >= limit) {
        status = 'BREACHED';
        message = `Limit breached (${current} / ${limit})`;
      } else if (pct >= criticalPct) {
        status = 'CRITICAL';
        message = `Critical usage (${pct}%)`;
      } else if (pct >= warningPct) {
        status = 'CAUTION';
        message = `Elevated usage (${pct}%)`;
      } else {
        status = 'NORMAL';
        message = `Safe buffer remaining`;
      }
    } else {
      // For profit target
      if (current >= limit) {
        status = 'NORMAL';
        message = `Target reached (${pct}%) 🎉`;
      } else {
        status = 'NORMAL';
        message = `${pct}% progress toward target`;
      }
    }

    return { name, current, limit, unit, percentUsed: pct, status, message };
  };

  return {
    accountId,
    accountName,
    accountBalance,
    currentEquity,
    peakEquity,
    todayRealizedPnl,
    todayGrossPnl,
    todayCommissions,
    todayFees,
    todayLossAbs,
    todayProfitAbs,
    todayTradeCount: todayTrades.length,
    todayClosedTradesCount: todayClosedTrades.length,
    weekRealizedPnl,
    weekLossAbs,
    weekTradeCount: weekClosedTrades.length,
    trailingDrawdown,
    trailingDrawdownPercent,
    drawdownPeak: peakEquity,
    openPositionsCount,
    portfolioHeatDollar,
    portfolioHeatPercent,
    consecutiveLossesStreak,
    circuitBreaker: {
      state: cbState,
      isLocked: isHardLocked || cbState === 'TRIGGERED' || cbState === 'LOCKED',
      reason: cbReason,
      warningThresholdPercent: warningPct,
      criticalThresholdPercent: criticalPct,
    },
    metrics: {
      dailyLoss: buildMetric('Daily Max Loss', todayLossAbs, dailyMaxLoss, '$'),
      weeklyLoss: buildMetric('Weekly Loss Limit', weekLossAbs, weeklyLossLimit, '$'),
      weeklyProfitTarget: buildMetric('Weekly Profit Target', Math.max(0, weekRealizedPnl), weeklyProfitTarget, '$', true),
      trailingDrawdown: buildMetric('Trailing Drawdown', trailingDrawdown, maxDrawdown, '$'),
      dailyTrades: buildMetric('Daily Trade Quota', todayTrades.length, maxTradesPerDay, 'trades'),
      maxContracts: buildMetric('Max Position Size', 0, maxContracts, 'contracts'),
      maxRiskPerTrade: buildMetric('Max Risk Per Trade', 0, maxRiskDollar, '$'),
      consecutiveLosses: buildMetric('Consecutive Loss Streak', consecutiveLossesStreak, maxLossStreak, 'count'),
      openPositions: buildMetric('Max Open Positions', openPositionsCount, maxOpenPos, 'count'),
      minRMultiple: buildMetric('Min Target R-Multiple', 0, minR, 'R'),
    },
  };
}

export interface PreTradeCheckItem {
  ruleId: string;
  name: string;
  status: 'PASS' | 'WARN' | 'FAIL';
  current: string | number;
  limit: string | number;
  message: string;
}

export interface PreTradeEvaluationResult {
  allowed: boolean;
  status: 'APPROVED' | 'WARNING' | 'BLOCKED';
  hardLocked: boolean;
  blockingReason?: string;
  suggestedMaxQty?: number;
  plannedRiskDollar: number;
  plannedRiskPercent: number;
  projectedDailyLoss: number;
  projectedDrawdown: number;
  checks: PreTradeCheckItem[];
}

/**
 * Authoritative 13-point Pre-Trade Risk Validation Engine
 */
export function validatePreTrade(
  tradeDraft: {
    symbol: string;
    market?: any;
    direction: 'BUY' | 'SELL';
    entryPrice: number;
    stopLoss?: number;
    takeProfit?: number;
    quantity: number;
  },
  account: TradingAccount,
  trades: Trade[],
  riskGoals: RiskGoalSettings
): PreTradeEvaluationResult {
  const accountId = account.id;
  const evalRisk = evaluateAccountRisk(accountId, [account], trades, riskGoals);

  const posRisk = calculatePositionRisk({
    symbol: tradeDraft.symbol,
    market: tradeDraft.market,
    direction: tradeDraft.direction,
    entryPrice: tradeDraft.entryPrice,
    stopLoss: tradeDraft.stopLoss,
    takeProfit: tradeDraft.takeProfit,
    quantity: tradeDraft.quantity,
    accountBalance: evalRisk.accountBalance,
    riskMode: riskGoals.riskMode,
    maxRiskPerTradeAmount: riskGoals.maxRiskPerTradeAmount,
    maxRiskPerTradePercent: riskGoals.maxRiskPerTradePercent,
  });

  const plannedRiskDollar = posRisk.grossRiskDollar;
  const plannedRiskPercent = posRisk.riskPercentOfBalance;
  const projectedDailyLoss = evalRisk.todayLossAbs + plannedRiskDollar;
  const projectedDrawdown = evalRisk.trailingDrawdown + plannedRiskDollar;

  const checks: PreTradeCheckItem[] = [];
  let blocked = false;
  let blockingReason = '';
  let hasWarning = false;

  // 1. Circuit Breaker / Hard Lock
  if (evalRisk.circuitBreaker.state === 'LOCKED') {
    blocked = true;
    blockingReason = 'Account is hard-locked by risk supervisor. Manual unlock required.';
    checks.push({
      ruleId: 'CB_LOCK',
      name: 'Circuit Breaker Status',
      status: 'FAIL',
      current: 'HARD-LOCKED',
      limit: 'UNLOCKED',
      message: 'Safety lockout active. Trade entries prohibited.',
    });
  } else if (evalRisk.circuitBreaker.state === 'TRIGGERED') {
    blocked = true;
    blockingReason = 'Circuit Breaker is TRIGGERED due to limit breach. Trade creation halted.';
    checks.push({
      ruleId: 'CB_TRIGGERED',
      name: 'Circuit Breaker Status',
      status: 'FAIL',
      current: 'TRIGGERED',
      limit: 'ARMED',
      message: 'Daily loss limit reached. Trading suspended.',
    });
  } else {
    checks.push({
      ruleId: 'CB_STATUS',
      name: 'Circuit Breaker Status',
      status: evalRisk.circuitBreaker.state === 'CAUTION' || evalRisk.circuitBreaker.state === 'CRITICAL' ? 'WARN' : 'PASS',
      current: evalRisk.circuitBreaker.state,
      limit: 'NORMAL',
      message: evalRisk.circuitBreaker.state === 'ARMED' ? 'Armed and safeguarding capital' : 'Standby mode',
    });
  }

  // 2. Daily Max Loss Limit (Realized + Planned Risk)
  const dailyMaxLoss = riskGoals.dailyMaxLoss || riskGoals.maxDailyLoss || 0;
  if (dailyMaxLoss > 0) {
    if (evalRisk.todayLossAbs >= dailyMaxLoss) {
      blocked = true;
      if (!blockingReason) blockingReason = `Daily Max Loss limit of $${dailyMaxLoss} has already been breached.`;
      checks.push({
        ruleId: 'DAILY_LOSS',
        name: 'Daily Loss Limit',
        status: 'FAIL',
        current: `$${evalRisk.todayLossAbs.toFixed(2)}`,
        limit: `$${dailyMaxLoss.toFixed(2)}`,
        message: 'Daily limit already breached.',
      });
    } else if (projectedDailyLoss > dailyMaxLoss) {
      blocked = true;
      if (!blockingReason) blockingReason = `Projected daily loss ($${projectedDailyLoss.toFixed(2)}) exceeds Daily Max Loss limit ($${dailyMaxLoss}).`;
      checks.push({
        ruleId: 'DAILY_LOSS_PROJ',
        name: 'Daily Loss Buffer',
        status: 'FAIL',
        current: `Proj: $${projectedDailyLoss.toFixed(2)}`,
        limit: `$${dailyMaxLoss.toFixed(2)}`,
        message: `Trade planned risk ($${plannedRiskDollar.toFixed(2)}) would breach daily limit.`,
      });
    } else if (projectedDailyLoss >= dailyMaxLoss * 0.85) {
      hasWarning = true;
      checks.push({
        ruleId: 'DAILY_LOSS_WARN',
        name: 'Daily Loss Buffer',
        status: 'WARN',
        current: `Proj: $${projectedDailyLoss.toFixed(2)}`,
        limit: `$${dailyMaxLoss.toFixed(2)}`,
        message: 'Planned trade consumes over 85% of remaining daily loss buffer.',
      });
    } else {
      checks.push({
        ruleId: 'DAILY_LOSS_PASS',
        name: 'Daily Loss Buffer',
        status: 'PASS',
        current: `$${evalRisk.todayLossAbs.toFixed(2)}`,
        limit: `$${dailyMaxLoss.toFixed(2)}`,
        message: `Sufficient daily buffer remaining ($${(dailyMaxLoss - projectedDailyLoss).toFixed(2)} left).`,
      });
    }
  }

  // 3. Weekly Loss Limit
  const weeklyLossLimit = riskGoals.weeklyLossLimit || riskGoals.maxWeeklyLoss || 0;
  if (weeklyLossLimit > 0) {
    const projectedWeekLoss = evalRisk.weekLossAbs + plannedRiskDollar;
    if (evalRisk.weekLossAbs >= weeklyLossLimit) {
      blocked = true;
      if (!blockingReason) blockingReason = `Weekly loss limit ($${weeklyLossLimit}) has been breached.`;
      checks.push({
        ruleId: 'WEEKLY_LOSS',
        name: 'Weekly Loss Limit',
        status: 'FAIL',
        current: `$${evalRisk.weekLossAbs.toFixed(2)}`,
        limit: `$${weeklyLossLimit.toFixed(2)}`,
        message: 'Weekly loss limit reached.',
      });
    } else if (projectedWeekLoss > weeklyLossLimit) {
      blocked = true;
      if (!blockingReason) blockingReason = `Projected weekly loss ($${projectedWeekLoss.toFixed(2)}) would exceed weekly limit ($${weeklyLossLimit}).`;
      checks.push({
        ruleId: 'WEEKLY_LOSS_PROJ',
        name: 'Weekly Loss Limit',
        status: 'FAIL',
        current: `Proj: $${projectedWeekLoss.toFixed(2)}`,
        limit: `$${weeklyLossLimit.toFixed(2)}`,
        message: 'Trade risk breaches weekly loss boundary.',
      });
    } else {
      checks.push({
        ruleId: 'WEEKLY_LOSS_PASS',
        name: 'Weekly Loss Limit',
        status: 'PASS',
        current: `$${evalRisk.weekLossAbs.toFixed(2)}`,
        limit: `$${weeklyLossLimit.toFixed(2)}`,
        message: `Within weekly loss threshold.`,
      });
    }
  }

  // 4. Trailing Drawdown Limit
  const maxDrawdown = riskGoals.trailingDrawdownLimit || riskGoals.maxDrawdown || riskGoals.maxDrawdownLimit || 0;
  if (maxDrawdown > 0) {
    if (evalRisk.trailingDrawdown >= maxDrawdown) {
      blocked = true;
      if (!blockingReason) blockingReason = `Max Trailing Drawdown limit ($${maxDrawdown}) reached.`;
      checks.push({
        ruleId: 'MAX_DD',
        name: 'Trailing Drawdown',
        status: 'FAIL',
        current: `$${evalRisk.trailingDrawdown.toFixed(2)}`,
        limit: `$${maxDrawdown.toFixed(2)}`,
        message: 'Account drawdown limit reached.',
      });
    } else if (projectedDrawdown > maxDrawdown) {
      blocked = true;
      if (!blockingReason) blockingReason = `Projected drawdown ($${projectedDrawdown.toFixed(2)}) would breach trailing drawdown limit ($${maxDrawdown}).`;
      checks.push({
        ruleId: 'MAX_DD_PROJ',
        name: 'Trailing Drawdown',
        status: 'FAIL',
        current: `Proj: $${projectedDrawdown.toFixed(2)}`,
        limit: `$${maxDrawdown.toFixed(2)}`,
        message: 'Trade risk would breach peak-to-trough drawdown threshold.',
      });
    } else {
      checks.push({
        ruleId: 'MAX_DD_PASS',
        name: 'Trailing Drawdown',
        status: 'PASS',
        current: `$${evalRisk.trailingDrawdown.toFixed(2)}`,
        limit: `$${maxDrawdown.toFixed(2)}`,
        message: `Drawdown within safety margin.`,
      });
    }
  }

  // 5. Daily Execution Quota
  const maxTrades = riskGoals.maxTradesPerDay || 0;
  if (maxTrades > 0) {
    if (evalRisk.todayTradeCount >= maxTrades) {
      blocked = true;
      if (!blockingReason) blockingReason = `Daily trade quota (${maxTrades} trades) reached. Overtrading guard active.`;
      checks.push({
        ruleId: 'DAILY_QUOTA',
        name: 'Daily Trade Quota',
        status: 'FAIL',
        current: `${evalRisk.todayTradeCount}`,
        limit: `${maxTrades}`,
        message: 'Daily execution quota reached.',
      });
    } else if (evalRisk.todayTradeCount === maxTrades - 1) {
      hasWarning = true;
      checks.push({
        ruleId: 'DAILY_QUOTA_LAST',
        name: 'Daily Trade Quota',
        status: 'WARN',
        current: `${evalRisk.todayTradeCount + 1}`,
        limit: `${maxTrades}`,
        message: 'This will be your final allowed trade of the day.',
      });
    } else {
      checks.push({
        ruleId: 'DAILY_QUOTA_PASS',
        name: 'Daily Trade Quota',
        status: 'PASS',
        current: `${evalRisk.todayTradeCount + 1}`,
        limit: `${maxTrades}`,
        message: `${maxTrades - evalRisk.todayTradeCount - 1} trade(s) remaining today.`,
      });
    }
  }

  // 6. Position Size / Contract Limit
  const maxContracts = riskGoals.maxContractsPerTrade || 0;
  if (maxContracts > 0) {
    if (tradeDraft.quantity > maxContracts) {
      blocked = true;
      if (!blockingReason) blockingReason = `Position size (${tradeDraft.quantity} ${posRisk.unitLabel}) exceeds maximum limit (${maxContracts} ${posRisk.unitLabel}).`;
      checks.push({
        ruleId: 'MAX_CONTRACTS',
        name: 'Position Size Limit',
        status: 'FAIL',
        current: `${tradeDraft.quantity} ${posRisk.unitLabel}`,
        limit: `${maxContracts} ${posRisk.unitLabel}`,
        message: `Exceeds max allowed size of ${maxContracts} ${posRisk.unitLabel}.`,
      });
    } else {
      checks.push({
        ruleId: 'MAX_CONTRACTS_PASS',
        name: 'Position Size Limit',
        status: 'PASS',
        current: `${tradeDraft.quantity} ${posRisk.unitLabel}`,
        limit: `${maxContracts} ${posRisk.unitLabel}`,
        message: 'Position size within permitted limits.',
      });
    }
  }

  // 7. Max Risk Per Trade (Fixed Dollar / Percentage / Lower of Both)
  if (posRisk.isRiskExceeded) {
    blocked = true;
    if (!blockingReason) blockingReason = `Planned risk ($${plannedRiskDollar.toFixed(2)}) exceeds maximum allowed risk ($${posRisk.effectiveMaxRiskDollar.toFixed(2)} under ${riskGoals.riskMode || 'Lower of Both'} mode).`;
    checks.push({
      ruleId: 'MAX_RISK_TRADE',
      name: 'Max Risk Per Trade',
      status: 'FAIL',
      current: `$${plannedRiskDollar.toFixed(2)} (${plannedRiskPercent.toFixed(2)}%)`,
      limit: `$${posRisk.effectiveMaxRiskDollar.toFixed(2)}`,
      message: `Risk exceeds ${riskGoals.riskMode || 'Lower of Both'} cap.`,
    });
  } else if (posRisk.effectiveMaxRiskDollar !== Infinity) {
    checks.push({
      ruleId: 'MAX_RISK_TRADE_PASS',
      name: 'Max Risk Per Trade',
      status: 'PASS',
      current: `$${plannedRiskDollar.toFixed(2)} (${plannedRiskPercent.toFixed(2)}%)`,
      limit: `$${posRisk.effectiveMaxRiskDollar.toFixed(2)}`,
      message: `Within allowed single-trade risk boundary.`,
    });
  }

  // 8. Consecutive Losses Streak
  const maxConsecutiveLosses = riskGoals.maxConsecutiveLosses || 0;
  if (maxConsecutiveLosses > 0 && evalRisk.consecutiveLossesStreak >= maxConsecutiveLosses) {
    blocked = true;
    if (!blockingReason) blockingReason = `Consecutive loss streak limit (${maxConsecutiveLosses} losses) hit. Forced cooling-off period active.`;
    checks.push({
      ruleId: 'MAX_CONSEC_LOSSES',
      name: 'Loss Streak Guard',
      status: 'FAIL',
      current: `${evalRisk.consecutiveLossesStreak} losses`,
      limit: `${maxConsecutiveLosses} losses`,
      message: 'Cooling-off triggered to prevent tilt trading.',
    });
  }

  // 9. Max Open Concurrent Positions
  const maxOpen = riskGoals.maxOpenPositions || 0;
  if (maxOpen > 0) {
    if (evalRisk.openPositionsCount >= maxOpen) {
      blocked = true;
      if (!blockingReason) blockingReason = `Max concurrent open positions (${maxOpen}) reached. Close an active position first.`;
      checks.push({
        ruleId: 'MAX_OPEN_POS',
        name: 'Concurrent Positions',
        status: 'FAIL',
        current: `${evalRisk.openPositionsCount}`,
        limit: `${maxOpen}`,
        message: 'Max simultaneous positions active.',
      });
    } else {
      checks.push({
        ruleId: 'MAX_OPEN_POS_PASS',
        name: 'Concurrent Positions',
        status: 'PASS',
        current: `${evalRisk.openPositionsCount + 1}`,
        limit: `${maxOpen}`,
        message: 'Concurrent position capacity available.',
      });
    }
  }

  // 10. Minimum Target R-Multiple
  const minR = riskGoals.minRMultiple || 0;
  if (minR > 0 && tradeDraft.takeProfit) {
    if (posRisk.rMultiple < minR) {
      hasWarning = true;
      checks.push({
        ruleId: 'MIN_R_MULTIPLE',
        name: 'Target R-Multiple',
        status: 'WARN',
        current: `${posRisk.rMultiple}R`,
        limit: `≥ ${minR}R`,
        message: `Expected reward-to-risk (${posRisk.rMultiple}R) is below target ${minR}R.`,
      });
    } else {
      checks.push({
        ruleId: 'MIN_R_MULTIPLE_PASS',
        name: 'Target R-Multiple',
        status: 'PASS',
        current: `${posRisk.rMultiple}R`,
        limit: `≥ ${minR}R`,
        message: `Meets or exceeds minimum R-multiple expectation.`,
      });
    }
  }

  // 11. Stop Loss Defined & Valid
  if (!tradeDraft.stopLoss || tradeDraft.stopLoss === tradeDraft.entryPrice) {
    hasWarning = true;
    checks.push({
      ruleId: 'SL_DEFINED',
      name: 'Stop Loss Defined',
      status: 'WARN',
      current: 'Undefined / 0',
      limit: 'Required',
      message: 'Trade has no explicit protective stop loss.',
    });
  } else {
    checks.push({
      ruleId: 'SL_DEFINED_PASS',
      name: 'Stop Loss Defined',
      status: 'PASS',
      current: `${tradeDraft.stopLoss}`,
      limit: 'Valid',
      message: `Stop defined at ${posRisk.stopDistancePoints.toFixed(2)} pts distance.`,
    });
  }

  // Calculate suggested max quantity if blocked by sizing
  const suggestedMaxQty = calculateRecommendedPositionSize(
    tradeDraft.symbol,
    tradeDraft.market,
    tradeDraft.entryPrice,
    tradeDraft.stopLoss || tradeDraft.entryPrice - 5,
    evalRisk.accountBalance,
    riskGoals
  );

  const finalStatus: 'APPROVED' | 'WARNING' | 'BLOCKED' = blocked
    ? 'BLOCKED'
    : hasWarning
    ? 'WARNING'
    : 'APPROVED';

  return {
    allowed: !blocked,
    status: finalStatus,
    hardLocked: evalRisk.circuitBreaker.state === 'LOCKED',
    blockingReason: blocked ? blockingReason : undefined,
    suggestedMaxQty,
    plannedRiskDollar,
    plannedRiskPercent,
    projectedDailyLoss,
    projectedDrawdown,
    checks,
  };
}

/**
 * Storage and management of persistent Risk Events
 */
const RISK_EVENTS_STORAGE_KEY = 'tradeforge_risk_events_v2';

export function getStoredRiskEvents(accountId?: string): RiskEvent[] {
  try {
    const raw = localStorage.getItem(RISK_EVENTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed: RiskEvent[] = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    if (!accountId || accountId === 'all') return parsed;
    return parsed.filter((e) => !e.accountId || e.accountId === accountId);
  } catch (e) {
    return [];
  }
}

export function logRiskEvent(event: Omit<RiskEvent, 'id' | 'timestamp'>): RiskEvent {
  const newEvent: RiskEvent = {
    ...event,
    id: `re_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString(),
  };

  try {
    const existing = getStoredRiskEvents();
    const updated = [newEvent, ...existing].slice(0, 200); // Keep latest 200 events
    localStorage.setItem(RISK_EVENTS_STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn('Failed to persist risk event to local storage', e);
  }

  return newEvent;
}

export function clearRiskEvents(accountId?: string): void {
  try {
    if (!accountId || accountId === 'all') {
      localStorage.removeItem(RISK_EVENTS_STORAGE_KEY);
    } else {
      const existing = getStoredRiskEvents();
      const filtered = existing.filter((e) => e.accountId !== accountId);
      localStorage.setItem(RISK_EVENTS_STORAGE_KEY, JSON.stringify(filtered));
    }
  } catch {}
}
