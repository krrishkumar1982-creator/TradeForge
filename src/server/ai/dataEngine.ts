import {
  Trade,
  TradingAccount,
  PropFirmAccount,
  Playbook,
  Strategy,
  JournalNote,
  RiskGoalSettings,
} from '../../types';
import {
  calculateComprehensiveMetrics,
  ComprehensiveMetrics,
  roundMoney,
  safeAdd,
  safeSub,
  safeDiv,
} from '../../lib/calcEngine';
import { PropFirmEngine } from '../../services/propFirmEngine';
import { ClassifiedIntent, ExtractedEntities } from './intentClassifier';

export interface GroupMetricSummary {
  key: string;
  tradesCount: number;
  winningCount: number;
  losingCount: number;
  winRate: number;
  netPnl: number;
  grossProfit: number;
  grossLoss: number;
  profitFactor: number | null;
  avgPnl: number;
  avgR: number | null;
  expectancy: number;
  sampleTier: 'LOW' | 'MODERATE' | 'STRONG';
}

export interface MistakeDetailSummary {
  name: string;
  occurrences: number;
  winningTrades: number;
  losingTrades: number;
  totalNetPnl: number;
  avgNetPnl: number;
  avgR: number | null;
  percentageOfAllTrades: number;
  worstLoss: number;
  recentOccurrences: number; // in last 10 trades
  sampleTier: 'LOW' | 'MODERATE' | 'STRONG';
}

export interface BehavioralPatternAnalysis {
  overtrading: {
    detected: boolean;
    maxTradesInOneDay: number;
    avgTradesPerActiveDay: number;
    daysWithMoreThan5Trades: number;
    rapidTradesWithin15Mins: number;
    description: string;
  };
  revengeTrading: {
    detected: boolean;
    instancesFound: number;
    netPnlImpact: number;
    description: string;
  };
  fomoTrading: {
    detected: boolean;
    fomoTradesCount: number;
    fomoNetPnl: number;
    fomoWinRate: number;
    description: string;
  };
  holdingLosersVsWinners: {
    detected: boolean;
    avgWinDurationMins: number;
    avgLossDurationMins: number;
    ratioLossToWinDuration: number;
    description: string;
  };
  earlyProfitTaking: {
    detected: boolean;
    avgRealizedR: number;
    tradesCutUnder1R: number;
    description: string;
  };
}

export interface ScenarioSimulationResult {
  scenarioName: string;
  description: string;
  baseline: {
    totalTrades: number;
    winRate: number;
    netPnl: number;
    profitFactor: number | null;
    avgR: number | null;
    maxDrawdown: number;
  };
  simulated: {
    totalTrades: number;
    winRate: number;
    netPnl: number;
    profitFactor: number | null;
    avgR: number | null;
    maxDrawdown: number;
  };
  delta: {
    netPnlChange: number;
    winRateChange: number;
    profitFactorChange: number;
    tradesRemovedCount: number;
  };
}

export interface StructuredAiContext {
  filterSummary: {
    appliedFilters: string[];
    dateScope: string;
    totalAvailableTrades: number;
    filteredTradesCount: number;
    sampleSizeTier: 'LOW' | 'MODERATE' | 'STRONG';
  };
  authoritativeMetrics: {
    netPnl: number;
    grossProfit: number;
    grossLoss: number;
    totalTrades: number;
    closedTrades: number;
    winningTrades: number;
    losingTrades: number;
    breakevenTrades: number;
    winRatePercent: number;
    lossRatePercent: number;
    profitFactor: number | null;
    averageWin: number;
    averageLoss: number;
    averageR: number | null;
    expectancyPerTrade: number;
    maxDrawdownDollars: number;
    maxDrawdownPercent: number;
    maxConsecutiveWins: number;
    maxConsecutiveLosses: number;
    currentStreak: { type: string; count: number };
    largestWin: number;
    largestLoss: number;
    totalTradingDays: number;
    winningDays: number;
    losingDays: number;
    bestDayPnl: number;
    worstDayPnl: number;
  };
  groupBreakdowns: {
    bySymbol: GroupMetricSummary[];
    bySetup: GroupMetricSummary[];
    bySession: GroupMetricSummary[];
    byDayOfWeek: GroupMetricSummary[];
    byTimeframe: GroupMetricSummary[];
    byDirection: GroupMetricSummary[];
  };
  mistakeIntelligence: {
    totalMistakeTrades: number;
    totalMistakePnlLoss: number;
    breakdown: MistakeDetailSummary[];
    mostExpensiveMistake?: MistakeDetailSummary;
    mostFrequentMistake?: MistakeDetailSummary;
  };
  behavioralDiagnostics: BehavioralPatternAnalysis;
  propFirmAudit?: {
    accounts: Array<{
      accountName: string;
      firmName: string;
      phase: string;
      startingBalance: number;
      currentBalance: number;
      currentEquity: number;
      highWaterMark: number;
      profitTargetPercent: number;
      profitTargetRemaining: number;
      dailyLossLimitPercent: number;
      dailyLossBufferRemaining: number;
      maxDrawdownBufferRemaining: number;
      tradingDaysCount: number;
      minTradingDays: number;
      isBreached: boolean;
      activeViolations: string[];
      riskState: string;
      payoutEligible?: boolean;
    }>;
  };
  scenarioResult?: ScenarioSimulationResult;
  journalHighlights?: Array<{
    title: string;
    date: string;
    tags: string[];
    lessonsOrSummary: string;
  }>;
}

/**
 * Filter trades based on extracted entities and date range
 */
export function filterTradesByEntities(
  trades: Trade[],
  entities: ExtractedEntities,
  activeAccountId?: string,
  activePropFirmAccountId?: string
): { filteredTrades: Trade[]; appliedFilters: string[]; dateScope: string } {
  const appliedFilters: string[] = [];
  let dateScope = 'All Time';

  let list = [...trades];

  // 1. Filter by Active Account / Prop Firm
  if (activePropFirmAccountId && activePropFirmAccountId !== 'ALL' && activePropFirmAccountId !== 'all') {
    list = list.filter(
      (t) =>
        t.propFirmAccountId === activePropFirmAccountId ||
        (t as any).tradingAccountLink === activePropFirmAccountId
    );
    appliedFilters.push(`Prop Firm Account ID: ${activePropFirmAccountId}`);
  } else if (activeAccountId && activeAccountId !== 'ALL' && activeAccountId !== 'all') {
    list = list.filter((t) => t.accountId === activeAccountId);
    appliedFilters.push(`Trading Account ID: ${activeAccountId}`);
  }

  // 2. Filter by Symbols
  if (entities.symbols.length > 0) {
    list = list.filter((t) =>
      entities.symbols.some((s) => (t.symbol || '').toUpperCase().includes(s.toUpperCase()))
    );
    appliedFilters.push(`Symbols: ${entities.symbols.join(', ')}`);
  }

  // 3. Filter by Sessions
  if (entities.sessions.length > 0) {
    list = list.filter((t) =>
      entities.sessions.some((s) => (t.session || '').toLowerCase().includes(s.toLowerCase()))
    );
    appliedFilters.push(`Sessions: ${entities.sessions.join(', ')}`);
  }

  // 4. Filter by Playbooks / Setups
  if (entities.playbooks.length > 0) {
    list = list.filter((t) =>
      entities.playbooks.some(
        (pb) =>
          (t.setupType || '').toLowerCase().includes(pb.toLowerCase()) ||
          (t.playbookId || '').toLowerCase().includes(pb.toLowerCase())
      )
    );
    appliedFilters.push(`Playbooks/Setups: ${entities.playbooks.join(', ')}`);
  }

  // 5. Filter by Direction
  if (entities.direction) {
    const dirTarget = entities.direction === 'LONG' ? 'BUY' : 'SELL';
    list = list.filter((t) => t.direction === dirTarget || (t.direction as string) === entities.direction);
    appliedFilters.push(`Direction: ${entities.direction}`);
  }

  // 6. Filter by Timeframe
  if (entities.timeframes.length > 0) {
    list = list.filter((t) =>
      entities.timeframes.some((tf) => ((t as any).timeframe || '').toLowerCase() === tf.toLowerCase())
    );
    appliedFilters.push(`Timeframe: ${entities.timeframes.join(', ')}`);
  }

  // 7. Filter by Date Range Text
  if (entities.dateRangeText) {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (entities.dateRangeText === 'today') {
      list = list.filter((t) => new Date(t.entryDate || t.exitDate || '') >= startOfToday);
      dateScope = 'Today';
      appliedFilters.push('Date: Today');
    } else if (entities.dateRangeText === 'yesterday') {
      const startOfYesterday = new Date(startOfToday.getTime() - 24 * 60 * 60 * 1000);
      list = list.filter((t) => {
        const d = new Date(t.entryDate || t.exitDate || '');
        return d >= startOfYesterday && d < startOfToday;
      });
      dateScope = 'Yesterday';
      appliedFilters.push('Date: Yesterday');
    } else if (entities.dateRangeText === 'this_week') {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday
      const startOfWeek = new Date(now.setDate(diff));
      startOfWeek.setHours(0, 0, 0, 0);
      list = list.filter((t) => new Date(t.entryDate || t.exitDate || '') >= startOfWeek);
      dateScope = 'This Week';
      appliedFilters.push('Date: This Week');
    } else if (entities.dateRangeText === 'last_week') {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1) - 7;
      const startOfLastWeek = new Date(now.setDate(diff));
      startOfLastWeek.setHours(0, 0, 0, 0);
      const endOfLastWeek = new Date(startOfLastWeek.getTime() + 7 * 24 * 60 * 60 * 1000);
      list = list.filter((t) => {
        const d = new Date(t.entryDate || t.exitDate || '');
        return d >= startOfLastWeek && d < endOfLastWeek;
      });
      dateScope = 'Last Week';
      appliedFilters.push('Date: Last Week');
    } else if (entities.dateRangeText === 'this_month') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      list = list.filter((t) => new Date(t.entryDate || t.exitDate || '') >= startOfMonth);
      dateScope = 'This Month';
      appliedFilters.push('Date: This Month');
    } else if (entities.dateRangeText === 'last_month') {
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
      list = list.filter((t) => {
        const d = new Date(t.entryDate || t.exitDate || '');
        return d >= startOfLastMonth && d <= endOfLastMonth;
      });
      dateScope = 'Last Month';
      appliedFilters.push('Date: Last Month');
    } else if (entities.dateRangeText === 'this_year') {
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      list = list.filter((t) => new Date(t.entryDate || t.exitDate || '') >= startOfYear);
      dateScope = 'This Year';
      appliedFilters.push('Date: This Year');
    } else {
      // Month name match (e.g. august)
      const months = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
      const monthIdx = months.indexOf(entities.dateRangeText.toLowerCase());
      if (monthIdx !== -1) {
        list = list.filter((t) => {
          const d = new Date(t.entryDate || t.exitDate || '');
          return d.getMonth() === monthIdx;
        });
        dateScope = entities.dateRangeText.toUpperCase();
        appliedFilters.push(`Month: ${entities.dateRangeText}`);
      }
    }
  }

  return { filteredTrades: list, appliedFilters, dateScope };
}

/**
 * Group trades by key and calculate deterministic metrics
 */
export function groupTradesAndCalculate(
  trades: Trade[],
  groupByFn: (trade: Trade) => string | undefined
): GroupMetricSummary[] {
  const groups: Record<string, Trade[]> = {};

  trades.forEach((t) => {
    const key = groupByFn(t) || 'Unassigned';
    if (!groups[key]) groups[key] = [];
    groups[key].push(t);
  });

  return Object.entries(groups)
    .map(([key, groupTrades]) => {
      const closed = groupTrades.filter((t) => t.status === 'CLOSED');
      const metrics = calculateComprehensiveMetrics(groupTrades);

      const winningCount = metrics.winningTrades;
      const losingCount = metrics.losingTrades;
      const totalClosed = metrics.closedTrades;
      const winRate = totalClosed > 0 ? roundMoney((winningCount / totalClosed) * 100, 1) : 0;
      const netPnl = metrics.netPnl;
      const grossProfit = metrics.grossProfit;
      const grossLoss = metrics.grossLoss;
      const profitFactor = metrics.profitFactor;
      const avgPnl = totalClosed > 0 ? roundMoney(netPnl / totalClosed, 2) : 0;
      const avgR = metrics.avgRMultiple;
      const expectancy = metrics.monetaryExpectancy;

      let sampleTier: 'LOW' | 'MODERATE' | 'STRONG' = 'LOW';
      if (totalClosed >= 30) sampleTier = 'STRONG';
      else if (totalClosed >= 10) sampleTier = 'MODERATE';

      return {
        key,
        tradesCount: groupTrades.length,
        winningCount,
        losingCount,
        winRate,
        netPnl,
        grossProfit,
        grossLoss,
        profitFactor,
        avgPnl,
        avgR,
        expectancy,
        sampleTier,
      };
    })
    .sort((a, b) => b.netPnl - a.netPnl);
}

/**
 * Extract comprehensive mistake intelligence
 */
export function analyzeMistakes(trades: Trade[]): {
  totalMistakeTrades: number;
  totalMistakePnlLoss: number;
  breakdown: MistakeDetailSummary[];
  mostExpensiveMistake?: MistakeDetailSummary;
  mostFrequentMistake?: MistakeDetailSummary;
} {
  const mistakeMap: Record<
    string,
    {
      trades: Trade[];
      totalNetPnl: number;
      worstLoss: number;
      rMultiples: number[];
      recentCount: number;
    }
  > = {};

  const totalClosedTrades = trades.filter((t) => t.status === 'CLOSED').length;
  const recentTrades = [...trades]
    .filter((t) => t.status === 'CLOSED')
    .sort((a, b) => new Date(b.entryDate || 0).getTime() - new Date(a.entryDate || 0).getTime())
    .slice(0, 10);

  const mistakeTradeIds = new Set<string>();
  let totalMistakePnlLoss = 0;

  trades.forEach((t) => {
    if (t.status !== 'CLOSED') return;
    const mistakesLogged: string[] = [];

    if (t.mistakeCategory) mistakesLogged.push(t.mistakeCategory);
    if (t.mistakeDescription && !mistakesLogged.includes(t.mistakeDescription)) {
      mistakesLogged.push(t.mistakeDescription);
    }
    if (Array.isArray(t.mistakes)) {
      t.mistakes.forEach((m) => {
        if (m && !mistakesLogged.includes(m)) mistakesLogged.push(m);
      });
    }
    if (Array.isArray(t.tags)) {
      t.tags.forEach((tag) => {
        if (tag && (tag.toLowerCase().includes('fomo') || tag.toLowerCase().includes('chase') || tag.toLowerCase().includes('mistake'))) {
          if (!mistakesLogged.includes(tag)) mistakesLogged.push(tag);
        }
      });
    }

    if (mistakesLogged.length > 0) {
      mistakeTradeIds.add(t.id);
      if (t.netPnl < 0) {
        totalMistakePnlLoss = safeAdd(totalMistakePnlLoss, Math.abs(t.netPnl));
      }
    }

    const isRecent = recentTrades.some((rt) => rt.id === t.id);

    mistakesLogged.forEach((mName) => {
      if (!mistakeMap[mName]) {
        mistakeMap[mName] = {
          trades: [],
          totalNetPnl: 0,
          worstLoss: 0,
          rMultiples: [],
          recentCount: 0,
        };
      }
      mistakeMap[mName].trades.push(t);
      mistakeMap[mName].totalNetPnl = safeAdd(mistakeMap[mName].totalNetPnl, t.netPnl);
      if (t.netPnl < mistakeMap[mName].worstLoss) {
        mistakeMap[mName].worstLoss = t.netPnl;
      }
      if (typeof t.rMultiple === 'number' && !isNaN(t.rMultiple)) {
        mistakeMap[mName].rMultiples.push(t.rMultiple);
      }
      if (isRecent) {
        mistakeMap[mName].recentCount += 1;
      }
    });
  });

  const breakdown: MistakeDetailSummary[] = Object.entries(mistakeMap)
    .map(([name, data]) => {
      const occurrences = data.trades.length;
      const winningTrades = data.trades.filter((t) => t.netPnl > 0).length;
      const losingTrades = data.trades.filter((t) => t.netPnl < 0).length;
      const totalNetPnl = roundMoney(data.totalNetPnl, 2);
      const avgNetPnl = occurrences > 0 ? roundMoney(totalNetPnl / occurrences, 2) : 0;
      const avgR =
        data.rMultiples.length > 0
          ? roundMoney(data.rMultiples.reduce((a, b) => a + b, 0) / data.rMultiples.length, 2)
          : null;
      const percentageOfAllTrades =
        totalClosedTrades > 0 ? roundMoney((occurrences / totalClosedTrades) * 100, 1) : 0;

      let sampleTier: 'LOW' | 'MODERATE' | 'STRONG' = 'LOW';
      if (occurrences >= 20) sampleTier = 'STRONG';
      else if (occurrences >= 7) sampleTier = 'MODERATE';

      return {
        name,
        occurrences,
        winningTrades,
        losingTrades,
        totalNetPnl,
        avgNetPnl,
        avgR,
        percentageOfAllTrades,
        worstLoss: roundMoney(data.worstLoss, 2),
        recentOccurrences: data.recentCount,
        sampleTier,
      };
    })
    .sort((a, b) => a.totalNetPnl - b.totalNetPnl); // Most negative P&L first

  const mostExpensiveMistake = breakdown.length > 0 ? breakdown[0] : undefined;
  const mostFrequentMistake =
    breakdown.length > 0 ? [...breakdown].sort((a, b) => b.occurrences - a.occurrences)[0] : undefined;

  return {
    totalMistakeTrades: mistakeTradeIds.size,
    totalMistakePnlLoss: roundMoney(totalMistakePnlLoss, 2),
    breakdown,
    mostExpensiveMistake,
    mostFrequentMistake,
  };
}

/**
 * Detect Behavioral Patterns (Overtrading, Revenge Trading, FOMO, Holding Losers)
 */
export function analyzeBehavioralPatterns(trades: Trade[]): BehavioralPatternAnalysis {
  const closed = [...trades]
    .filter((t) => t.status === 'CLOSED')
    .sort((a, b) => new Date(a.entryDate || 0).getTime() - new Date(b.entryDate || 0).getTime());

  // 1. Overtrading
  const tradesByDate: Record<string, Trade[]> = {};
  closed.forEach((t) => {
    const d = (t.entryDate || t.exitDate || '').split('T')[0] || 'unknown';
    if (!tradesByDate[d]) tradesByDate[d] = [];
    tradesByDate[d].push(t);
  });

  const dailyCounts = Object.values(tradesByDate).map((arr) => arr.length);
  const maxTradesInOneDay = dailyCounts.length > 0 ? Math.max(...dailyCounts) : 0;
  const avgTradesPerActiveDay =
    dailyCounts.length > 0
      ? roundMoney(dailyCounts.reduce((a, b) => a + b, 0) / dailyCounts.length, 1)
      : 0;
  const daysWithMoreThan5Trades = dailyCounts.filter((c) => c >= 5).length;

  // Check rapid trade entries within 15 minutes of previous exit
  let rapidTradesWithin15Mins = 0;
  for (let i = 1; i < closed.length; i++) {
    const prev = closed[i - 1];
    const curr = closed[i];
    const prevExitTime = new Date(prev.exitDate || prev.entryDate || 0).getTime();
    const currEntryTime = new Date(curr.entryDate || 0).getTime();
    if (currEntryTime >= prevExitTime && (currEntryTime - prevExitTime) <= 15 * 60 * 1000) {
      rapidTradesWithin15Mins++;
    }
  }

  const overtradingDetected = maxTradesInOneDay >= 6 || daysWithMoreThan5Trades >= 3;

  // 2. Revenge Trading
  let revengeInstances = 0;
  let revengePnlImpact = 0;
  for (let i = 1; i < closed.length; i++) {
    const prev = closed[i - 1];
    const curr = closed[i];
    if (prev.netPnl < 0) {
      const prevExitTime = new Date(prev.exitDate || prev.entryDate || 0).getTime();
      const currEntryTime = new Date(curr.entryDate || 0).getTime();
      const timeDiffMins = (currEntryTime - prevExitTime) / (60 * 1000);
      if (timeDiffMins >= 0 && timeDiffMins <= 30) {
        // Entered quickly after a loss
        const isSameOrHigherSize = (curr.quantity || 1) >= (prev.quantity || 1);
        const hasRevengeTag =
          (curr.emotionalState && curr.emotionalState.toLowerCase().includes('revenge')) ||
          (curr.mistakeCategory && curr.mistakeCategory.toLowerCase().includes('revenge'));
        if (isSameOrHigherSize || hasRevengeTag) {
          revengeInstances++;
          revengePnlImpact = safeAdd(revengePnlImpact, curr.netPnl);
        }
      }
    }
  }

  // 3. FOMO Trading
  const fomoTrades = closed.filter(
    (t) =>
      (t.emotionalState && t.emotionalState.toLowerCase().includes('fomo')) ||
      (t.mistakeCategory && t.mistakeCategory.toLowerCase().includes('fomo')) ||
      (Array.isArray(t.tags) && t.tags.some((tg) => tg.toLowerCase().includes('fomo'))) ||
      (Array.isArray(t.mistakes) && t.mistakes.some((m) => m.toLowerCase().includes('fomo')))
  );
  const fomoWins = fomoTrades.filter((t) => t.netPnl > 0).length;
  const fomoWinRate = fomoTrades.length > 0 ? roundMoney((fomoWins / fomoTrades.length) * 100, 1) : 0;
  const fomoNetPnl = fomoTrades.reduce((acc, t) => safeAdd(acc, t.netPnl), 0);

  // 4. Holding Losers vs Winners
  const winners = closed.filter((t) => t.netPnl > 0);
  const losers = closed.filter((t) => t.netPnl < 0);
  const avgWinDurationMins =
    winners.length > 0
      ? roundMoney(winners.reduce((acc, t) => acc + (t.durationMinutes || 0), 0) / winners.length, 1)
      : 0;
  const avgLossDurationMins =
    losers.length > 0
      ? roundMoney(losers.reduce((acc, t) => acc + (t.durationMinutes || 0), 0) / losers.length, 1)
      : 0;
  const ratioLossToWinDuration =
    avgWinDurationMins > 0 ? roundMoney(avgLossDurationMins / avgWinDurationMins, 2) : 1;
  const holdingLosersDetected = ratioLossToWinDuration >= 1.8 && losers.length >= 3;

  // 5. Early Profit Taking
  const tradesCutUnder1R = closed.filter((t) => t.netPnl > 0 && typeof t.rMultiple === 'number' && t.rMultiple < 1.0).length;
  const avgRealizedR =
    winners.length > 0
      ? roundMoney(winners.reduce((acc, t) => acc + (t.rMultiple || 0), 0) / winners.length, 2)
      : 0;

  return {
    overtrading: {
      detected: overtradingDetected,
      maxTradesInOneDay,
      avgTradesPerActiveDay,
      daysWithMoreThan5Trades,
      rapidTradesWithin15Mins,
      description: overtradingDetected
        ? `Observed high trading volume clusters: up to ${maxTradesInOneDay} executions in a single day (${daysWithMoreThan5Trades} sessions with ≥5 trades).`
        : `Execution volume is well-controlled (average ${avgTradesPerActiveDay} trades per active session).`,
    },
    revengeTrading: {
      detected: revengeInstances >= 2,
      instancesFound: revengeInstances,
      netPnlImpact: roundMoney(revengePnlImpact, 2),
      description:
        revengeInstances >= 2
          ? `Detected ${revengeInstances} trade entries within 30 minutes of a prior loss with maintained/increased sizing (Total Net P&L: $${revengePnlImpact}).`
          : `No significant revenge trading patterns identified in the dataset.`,
    },
    fomoTrading: {
      detected: fomoTrades.length >= 2,
      fomoTradesCount: fomoTrades.length,
      fomoNetPnl: roundMoney(fomoNetPnl, 2),
      fomoWinRate,
      description:
        fomoTrades.length >= 2
          ? `Logged ${fomoTrades.length} FOMO-tagged trades producing $${fomoNetPnl} net P&L with a ${fomoWinRate}% win rate.`
          : `Minimal FOMO-tagged executions logged.`,
    },
    holdingLosersVsWinners: {
      detected: holdingLosersDetected,
      avgWinDurationMins,
      avgLossDurationMins,
      ratioLossToWinDuration,
      description: holdingLosersDetected
        ? `Losing trades are held for an average of ${avgLossDurationMins} minutes vs ${avgWinDurationMins} minutes for winning trades (${ratioLossToWinDuration}x longer), suggesting reluctance to take predetermined invalidations.`
        : `Hold duration is balanced (Avg win: ${avgWinDurationMins}m, Avg loss: ${avgLossDurationMins}m).`,
    },
    earlyProfitTaking: {
      detected: tradesCutUnder1R >= 5 && avgRealizedR < 1.4,
      avgRealizedR,
      tradesCutUnder1R,
      description:
        tradesCutUnder1R >= 5
          ? `${tradesCutUnder1R} winning trades were closed below 1.0R (average winning R is ${avgRealizedR}R), indicating potential premature exit before technical take-profit targets.`
          : `Take profit discipline is sound with an average realized winner of ${avgRealizedR}R.`,
    },
  };
}

/**
 * Simulate What-If Scenarios Deterministically
 */
export function calculateScenario(
  trades: Trade[],
  scenarioType: ExtractedEntities['scenarioType'],
  targetMistake?: string
): ScenarioSimulationResult | undefined {
  const closed = trades.filter((t) => t.status === 'CLOSED');
  if (closed.length === 0) return undefined;

  const baselineMetrics = calculateComprehensiveMetrics(trades);
  let simulatedTrades = [...trades];
  let scenarioName = 'Custom Scenario';
  let description = 'Hypothetical trade set simulation';

  if (scenarioType === 'REMOVE_MISTAKE') {
    const mistakeName = targetMistake || 'FOMO';
    scenarioName = `Remove All '${mistakeName}' Trades`;
    description = `Eliminating all executions tagged with mistake or label '${mistakeName}'`;
    simulatedTrades = simulatedTrades.filter((t) => {
      const matchCategory = (t.mistakeCategory || '').toLowerCase().includes(mistakeName.toLowerCase());
      const matchDesc = (t.mistakeDescription || '').toLowerCase().includes(mistakeName.toLowerCase());
      const matchMistakes = Array.isArray(t.mistakes) && t.mistakes.some((m) => m.toLowerCase().includes(mistakeName.toLowerCase()));
      const matchTags = Array.isArray(t.tags) && t.tags.some((tag) => tag.toLowerCase().includes(mistakeName.toLowerCase()));
      return !(matchCategory || matchDesc || matchMistakes || matchTags);
    });
  } else if (scenarioType === 'REMOVE_WORST_TRADES') {
    scenarioName = 'Remove Top 5 Worst Trades';
    description = 'Filtering out the 5 largest dollar loss tickets';
    const sortedByLoss = [...closed].sort((a, b) => a.netPnl - b.netPnl);
    const worst5Ids = new Set(sortedByLoss.slice(0, 5).map((t) => t.id));
    simulatedTrades = simulatedTrades.filter((t) => !worst5Ids.has(t.id));
  } else if (scenarioType === 'REMOVE_WORST_SYMBOL') {
    const symbolGroups = groupTradesAndCalculate(closed, (t) => t.symbol);
    const worstSymbol = symbolGroups.length > 0 ? symbolGroups[symbolGroups.length - 1].key : '';
    scenarioName = `Remove Worst Instrument (${worstSymbol})`;
    description = `Eliminating all trades on the lowest cumulative P&L instrument (${worstSymbol})`;
    simulatedTrades = simulatedTrades.filter((t) => t.symbol !== worstSymbol);
  } else if (scenarioType === 'STOP_AFTER_2_LOSSES') {
    scenarioName = 'Stop Trading After 2 Losses Per Day';
    description = 'Simulating an automatic circuit breaker that halts trading for the remainder of the session after 2 losses in a day';
    const tradesByDay: Record<string, Trade[]> = {};
    const sortedChronological = [...closed].sort(
      (a, b) => new Date(a.entryDate || 0).getTime() - new Date(b.entryDate || 0).getTime()
    );

    const allowedIds = new Set<string>();
    sortedChronological.forEach((t) => {
      const day = (t.entryDate || t.exitDate || '').split('T')[0] || 'unknown';
      if (!tradesByDay[day]) tradesByDay[day] = [];
      const currentDayTrades = tradesByDay[day];
      const lossCountSoFar = currentDayTrades.filter((ct) => ct.netPnl < 0).length;
      if (lossCountSoFar < 2) {
        currentDayTrades.push(t);
        allowedIds.add(t.id);
      }
    });

    simulatedTrades = simulatedTrades.filter((t) => allowedIds.has(t.id));
  } else if (scenarioType === 'ONLY_A_PLUS_SETUPS') {
    scenarioName = 'Only A+ & Rule-Followed Setups';
    description = 'Simulating results if only trades with 100% rule adherence were executed';
    simulatedTrades = simulatedTrades.filter((t) => t.rulesFollowed === true);
  } else if (scenarioType === 'REDUCE_SIZE_50') {
    scenarioName = 'Reduce Position Size by 50%';
    description = 'Simulating 50% scaling across all positions and dollar outcomes';
    simulatedTrades = simulatedTrades.map((t) => ({
      ...t,
      netPnl: roundMoney(t.netPnl * 0.5, 2),
      grossPnl: roundMoney((t.grossPnl || t.netPnl) * 0.5, 2),
    }));
  }

  const simulatedMetrics = calculateComprehensiveMetrics(simulatedTrades);

  return {
    scenarioName,
    description,
    baseline: {
      totalTrades: baselineMetrics.closedTrades,
      winRate: baselineMetrics.winRate || 0,
      netPnl: baselineMetrics.netPnl,
      profitFactor: baselineMetrics.profitFactor,
      avgR: baselineMetrics.avgRMultiple,
      maxDrawdown: baselineMetrics.maxDrawdownDollars,
    },
    simulated: {
      totalTrades: simulatedMetrics.closedTrades,
      winRate: simulatedMetrics.winRate || 0,
      netPnl: simulatedMetrics.netPnl,
      profitFactor: simulatedMetrics.profitFactor,
      avgR: simulatedMetrics.avgRMultiple,
      maxDrawdown: simulatedMetrics.maxDrawdownDollars,
    },
    delta: {
      netPnlChange: roundMoney(simulatedMetrics.netPnl - baselineMetrics.netPnl, 2),
      winRateChange: roundMoney((simulatedMetrics.winRate || 0) - (baselineMetrics.winRate || 0), 1),
      profitFactorChange: roundMoney(
        (simulatedMetrics.profitFactor || 0) - (baselineMetrics.profitFactor || 0),
        2
      ),
      tradesRemovedCount: baselineMetrics.closedTrades - simulatedMetrics.closedTrades,
    },
  };
}

/**
 * Build the master structured context for the AI Engine
 */
export function buildStructuredAiContext(params: {
  trades: Trade[];
  tradingAccounts: TradingAccount[];
  propFirmAccounts: PropFirmAccount[];
  playbooks: Playbook[];
  strategies: Strategy[];
  journalNotes: JournalNote[];
  riskGoals?: RiskGoalSettings;
  intent: ClassifiedIntent;
  activeAccountId?: string;
  activePropFirmAccountId?: string;
}): StructuredAiContext {
  const {
    trades,
    propFirmAccounts,
    playbooks,
    journalNotes,
    intent,
    activeAccountId,
    activePropFirmAccountId,
  } = params;

  // 1. Filter trades
  const { filteredTrades, appliedFilters, dateScope } = filterTradesByEntities(
    trades,
    intent.entities,
    activeAccountId,
    activePropFirmAccountId
  );

  // 2. Authoritative Metrics
  const metrics = calculateComprehensiveMetrics(filteredTrades);
  const totalClosed = metrics.closedTrades;

  let sampleSizeTier: 'LOW' | 'MODERATE' | 'STRONG' = 'LOW';
  if (totalClosed >= 30) sampleSizeTier = 'STRONG';
  else if (totalClosed >= 10) sampleSizeTier = 'MODERATE';

  // 3. Group Breakdowns
  const bySymbol = groupTradesAndCalculate(filteredTrades, (t) => t.symbol);
  const bySetup = groupTradesAndCalculate(filteredTrades, (t) => t.setupType || t.playbookId);
  const bySession = groupTradesAndCalculate(filteredTrades, (t) => t.session);
  const byDayOfWeek = groupTradesAndCalculate(filteredTrades, (t) => {
    if (!t.entryDate) return 'Unknown';
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return dayNames[new Date(t.entryDate).getDay()];
  });
  const byTimeframe = groupTradesAndCalculate(filteredTrades, (t) => (t as any).timeframe || '15m');
  const byDirection = groupTradesAndCalculate(filteredTrades, (t) => t.direction);

  // 4. Mistake Intelligence
  const mistakeIntelligence = analyzeMistakes(filteredTrades);

  // 5. Behavioral Diagnostics
  const behavioralDiagnostics = analyzeBehavioralPatterns(filteredTrades);

  // 6. Prop Firm Status
  let propFirmAudit: StructuredAiContext['propFirmAudit'] | undefined;
  if (propFirmAccounts && propFirmAccounts.length > 0) {
    propFirmAudit = {
      accounts: propFirmAccounts.map((acc) => {
        const evalResult = PropFirmEngine.evaluatePropFirmAccount(acc, trades);
        const dailyDD = PropFirmEngine.calculateDailyDrawdown(acc, trades);
        const maxDD = PropFirmEngine.calculateMaxDrawdown(acc, trades);
        const profitTarget = PropFirmEngine.calculateProfitTarget(acc);
        const tradingDays = PropFirmEngine.calculateTradingDays(acc, trades);

        return {
          accountName: acc.name,
          firmName: acc.firmName,
          phase: acc.phase,
          startingBalance: acc.startingBalance,
          currentBalance: acc.currentBalance,
          currentEquity: acc.equity ?? acc.currentBalance,
          highWaterMark: maxDD.peakEquity,
          profitTargetPercent: acc.profitTargetPercent || 0,
          profitTargetRemaining: profitTarget.remainingProfit,
          dailyLossLimitPercent: acc.dailyLossPercent || 0,
          dailyLossBufferRemaining: dailyDD.remainingDailyBuffer,
          maxDrawdownBufferRemaining: maxDD.bufferRemaining,
          tradingDaysCount: tradingDays.daysCompleted,
          minTradingDays: acc.minTradingDays || 0,
          isBreached: evalResult.riskState === 'BREACHED' || dailyDD.isBreached || maxDD.isBreached,
          activeViolations: evalResult.newViolations.map((v) => `${v.ruleName}: actual ${v.actualValue}, limit ${v.allowedValue} (${v.severity})`),
          riskState: evalResult.riskState,
          payoutEligible: evalResult.isEvaluationPassed,
        };
      }),
    };
  }

  // 7. Scenario Analysis (if requested)
  let scenarioResult: ScenarioSimulationResult | undefined;
  if (intent.entities.scenarioType) {
    scenarioResult = calculateScenario(
      trades,
      intent.entities.scenarioType,
      intent.entities.targetMistake
    );
  }

  // 8. Journal Highlights
  const journalHighlights = journalNotes.slice(0, 5).map((n) => ({
    title: n.title,
    date: n.date,
    tags: n.tags || [],
    lessonsOrSummary: (n.content || '').substring(0, 250),
  }));

  return {
    filterSummary: {
      appliedFilters,
      dateScope,
      totalAvailableTrades: trades.length,
      filteredTradesCount: filteredTrades.length,
      sampleSizeTier,
    },
    authoritativeMetrics: {
      netPnl: metrics.netPnl,
      grossProfit: metrics.grossProfit,
      grossLoss: metrics.grossLoss,
      totalTrades: metrics.totalTrades,
      closedTrades: metrics.closedTrades,
      winningTrades: metrics.winningTrades,
      losingTrades: metrics.losingTrades,
      breakevenTrades: metrics.breakevenTrades,
      winRatePercent: metrics.winRate || 0,
      lossRatePercent: metrics.lossRate || 0,
      profitFactor: metrics.profitFactor,
      averageWin: metrics.avgWinningTrade,
      averageLoss: metrics.avgLosingTrade,
      averageR: metrics.avgRMultiple,
      expectancyPerTrade: metrics.monetaryExpectancy,
      maxDrawdownDollars: metrics.maxDrawdownDollars,
      maxDrawdownPercent: metrics.maxDrawdownPercent,
      maxConsecutiveWins: metrics.maxConsecutiveWins,
      maxConsecutiveLosses: metrics.maxConsecutiveLosses,
      currentStreak: metrics.currentStreak,
      largestWin: metrics.largestWin,
      largestLoss: metrics.largestLoss,
      totalTradingDays: metrics.totalTradingDays,
      winningDays: metrics.winningDays,
      losingDays: metrics.losingDays,
      bestDayPnl: metrics.bestDayPnl,
      worstDayPnl: metrics.worstDayPnl,
    },
    groupBreakdowns: {
      bySymbol,
      bySetup,
      bySession,
      byDayOfWeek,
      byTimeframe,
      byDirection,
    },
    mistakeIntelligence,
    behavioralDiagnostics,
    propFirmAudit,
    scenarioResult,
    journalHighlights,
  };
}
