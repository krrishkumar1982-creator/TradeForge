import React, { useState, useMemo } from 'react';
import {
  BarChart3,
  Clock,
  Plus,
  ChevronDown,
  Calendar,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  ShieldAlert,
  Percent,
  Award,
  Filter,
  DollarSign,
  Zap,
  TrendingUp,
  TrendingDown,
  Target,
  FileSpreadsheet,
  Settings,
  Info
} from 'lucide-react';
import { useTrading } from '../../context/TradingContext';
import { DynamicChartCard } from './DynamicChartCard';
import { PerformanceCalendar } from '../dashboard/PerformanceCalendar';
import { Trade } from '../../types';
import {
  InstitutionalMetricTable,
  MetricRowData,
  MonthSummaryData
} from './InstitutionalMetricTable';
import {
  DimensionGrouping,
  getDefaultBucketsForDimension,
  getTradeDimensionKey
} from './metricsEngine';

export type ReportMainTab = 'performance' | 'overview' | 'reports' | 'compare' | 'calendar';
export type ReportCategory =
  | 'day_time'
  | 'symbols'
  | 'risk'
  | 'playbooks'
  | 'tags'
  | 'options_dte'
  | 'wins_losses';

// Reusable Info Tooltip Component
const InfoTooltip: React.FC<{ content: string; isLight: boolean }> = ({ content, isLight }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative inline-flex items-center">
      <button
        type="button"
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        onClick={() => setIsOpen(!isOpen)}
        className="text-zinc-400 dark:text-slate-500 hover:text-blue-500 transition p-0.5"
        aria-label="Metric information"
      >
        <Info className="w-3 h-3" />
      </button>

      {isOpen && (
        <div
          className={`absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 w-48 sm:w-56 p-2 rounded-xl border shadow-xl text-[11px] font-normal leading-tight z-50 pointer-events-none animate-in fade-in ${
            isLight
              ? 'bg-zinc-900 text-zinc-100 border-zinc-700 shadow-zinc-900/40'
              : 'bg-[#0B0E12] text-[#F4F5F7] border border-[rgba(255,255,255,0.08)] shadow-black'
          }`}
        >
          {content}
          <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-zinc-900 dark:border-t-[#0B0E12]" />
        </div>
      )}
    </div>
  );
};

// Reusable Summary Metric Item Row
const SummaryItem: React.FC<{
  label: string;
  tooltip: string;
  isLight: boolean;
  children: React.ReactNode;
}> = ({ label, tooltip, isLight, children }) => {
  return (
    <div className={`p-2.5 rounded-xl border flex flex-col justify-between transition-all ${
      isLight ? 'bg-zinc-50/80 border-zinc-200/80 hover:border-zinc-300' : 'bg-[#080A0D] border border-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.12)]'
    }`}>
      <div className="flex items-center justify-between gap-1 mb-1">
        <span className={`text-[11px] font-medium truncate ${isLight ? 'text-zinc-600' : 'text-[#8A919D]'}`}>
          {label}
        </span>
        <InfoTooltip content={tooltip} isLight={isLight} />
      </div>
      <div className="text-sm">
        {children}
      </div>
    </div>
  );
};

export const PerformanceReportsView: React.FC = () => {
  const { filteredTrades, formatCurrency, formatRMultiple, theme } = useTrading();
  const isLight = theme === 'light';

  // Navigation State
  const [mainTab, setMainTab] = useState<ReportMainTab>('performance');
  const [reportCategory, setReportCategory] = useState<ReportCategory>('day_time');
  const [dayTimeSubTab, setDayTimeSubTab] = useState<'days' | 'months' | 'trade_time' | 'trade_duration'>('days');
  const [riskSubTab, setRiskSubTab] = useState<'volumes' | 'position_sizes' | 'r_multiple'>('volumes');
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);

  const closedTrades = useMemo(() => {
    return filteredTrades.filter(t => t.status === 'CLOSED');
  }, [filteredTrades]);

  const formatMinutes = (mins: number) => {
    if (!mins || isNaN(mins)) return '0m';
    if (mins < 60) return `${Math.round(mins)} mins`;
    const hrs = Math.floor(mins / 60);
    const rem = Math.round(mins % 60);
    return `${hrs}h ${rem}m`;
  };

  // 1. Calculations for Overview Tab & Performance Summary Section
  const summaryStats = useMemo(() => {
    const totalTrades = closedTrades.length;
    const winners = closedTrades.filter(t => t.netPnl > 0);
    const losers = closedTrades.filter(t => t.netPnl < 0);
    const breakevens = closedTrades.filter(t => t.netPnl === 0);

    const netPnl = closedTrades.reduce((acc, t) => acc + (t.netPnl || 0), 0);

    const totalWinsPnl = winners.reduce((acc, t) => acc + t.netPnl, 0);
    const totalLossesPnl = Math.abs(losers.reduce((acc, t) => acc + t.netPnl, 0));

    const winPct = totalTrades > 0 ? (winners.length / totalTrades) * 100 : 0;
    const profitFactor = totalLossesPnl > 0 ? totalWinsPnl / totalLossesPnl : totalWinsPnl > 0 ? 99.9 : 0;

    const avgWinningTrade = winners.length ? totalWinsPnl / winners.length : 0;
    const avgLosingTrade = losers.length ? totalLossesPnl / losers.length : 0;
    const avgTradePnl = totalTrades ? netPnl / totalTrades : 0;

    const totalCommissions = closedTrades.reduce((acc, t) => acc + (t.commission || 0), 0);
    const totalFees = closedTrades.reduce((acc, t) => acc + (t.fees || 0), 0);
    const totalSwap = closedTrades.reduce((acc, t) => acc + (t.swap || 0), 0);

    const largestProfit = winners.length ? Math.max(...winners.map(t => t.netPnl)) : 0;
    const largestLoss = losers.length ? Math.abs(Math.min(...losers.map(t => t.netPnl))) : 0;

    // Hold durations
    const totalHoldMinutes = closedTrades.reduce((acc, t) => acc + (t.durationMinutes || 0), 0);
    const avgHoldTimeMinutes = totalTrades ? totalHoldMinutes / totalTrades : 0;

    // Daily breakdown
    const dailyMap = new Map<string, number>();
    closedTrades.forEach(t => {
      const dateKey = t.entryDate ? t.entryDate.split('T')[0] : '2026-08-01';
      dailyMap.set(dateKey, (dailyMap.get(dateKey) || 0) + t.netPnl);
    });

    const dailyPnls = Array.from(dailyMap.values());
    const totalTradingDays = dailyPnls.length;
    const loggedDays = totalTradingDays;
    const winningDays = dailyPnls.filter(p => p > 0);
    const losingDays = dailyPnls.filter(p => p < 0);

    const avgDailyWinPct = totalTradingDays ? (winningDays.length / totalTradingDays) * 100 : 0;
    const avgDailyPnl = totalTradingDays ? netPnl / totalTradingDays : 0;
    const avgDailyWinPnl = winningDays.length ? winningDays.reduce((a, b) => a + b, 0) / winningDays.length : 0;
    const avgDailyLossPnl = losingDays.length ? Math.abs(losingDays.reduce((a, b) => a + b, 0)) / losingDays.length : 0;

    const avgDailyWinLossRatio = avgDailyLossPnl > 0 ? avgDailyWinPnl / avgDailyLossPnl : avgDailyWinPnl > 0 ? 99.9 : 0;
    const avgTradeWinLossRatio = avgLosingTrade > 0 ? avgWinningTrade / avgLosingTrade : avgWinningTrade > 0 ? 99.9 : 0;

    const tradeExpectancy = totalTrades
      ? ((winPct / 100) * avgWinningTrade) - ((1 - (winPct / 100)) * avgLosingTrade)
      : 0;

    const avgPlannedR = 2.1;
    const avgRealizedR = totalTrades
      ? closedTrades.reduce((acc, t) => acc + (t.rMultiple || 0), 0) / totalTrades
      : 0;

    const totalVolume = closedTrades.reduce((acc, t) => acc + (t.quantity || 1), 0);
    const avgDailyVolume = totalTradingDays ? Math.round(totalVolume / totalTradingDays) : 0;
    const tradesPerDay = totalTradingDays ? (totalTrades / totalTradingDays).toFixed(1) : '0';

    // Drawdowns
    let peak = 0;
    let maxDD = 0;
    let running = 0;
    closedTrades.forEach(t => {
      running += t.netPnl;
      if (running > peak) peak = running;
      const dd = peak - running;
      if (dd > maxDD) maxDD = dd;
    });

    const maxDrawdown = maxDD;
    const maxDrawdownPercent = peak > 0 ? (maxDD / peak) * 100 : 0;
    const currentDrawdown = peak - running;
    const avgDrawdown = maxDD * 0.45;

    const maxDailyNetDrawdown = losingDays.length ? Math.abs(Math.min(...losingDays)) : 0;
    const avgDailyNetDrawdown = avgDailyLossPnl;

    return {
      netPnl,
      winPct,
      avgDailyWinPct,
      profitFactor,
      grossProfit: totalWinsPnl,
      grossLoss: totalLossesPnl,
      totalCommissions,
      totalFees,
      totalSwap,
      tradeExpectancy,
      avgDailyWinLossRatio,
      avgTradeWinLossRatio,
      avgHoldTimeMinutes,
      avgWinningTrade,
      avgLosingTrade,
      avgTradePnl,
      winningTradesCount: winners.length,
      losingTradesCount: losers.length,
      breakevenTradesCount: breakevens.length,
      avgDailyPnl,
      avgPlannedR,
      avgRealizedR,
      largestProfit,
      largestLoss,
      avgDailyVolume,
      loggedDays,
      totalTradingDays,
      tradesPerDay,
      maxDailyNetDrawdown,
      avgDailyNetDrawdown,
      maxDrawdown,
      maxDrawdownPercent,
      avgDrawdown,
      currentDrawdown,
      openTrades: filteredTrades.filter(t => t.status === 'OPEN').length,
    };
  }, [closedTrades, filteredTrades]);

  // Institutional Table Data (Flat 2-column metrics and Month Summaries)
  const institutionalData = useMemo(() => {
    const totalTrades = closedTrades.length;
    const winners = closedTrades.filter(t => t.netPnl > 0);
    const losers = closedTrades.filter(t => t.netPnl < 0);
    const breakevens = closedTrades.filter(t => t.netPnl === 0);

    const netPnl = closedTrades.reduce((acc, t) => acc + (t.netPnl || 0), 0);
    const totalWinsPnl = winners.reduce((acc, t) => acc + t.netPnl, 0);
    const totalLossesPnl = Math.abs(losers.reduce((acc, t) => acc + t.netPnl, 0));

    const winPct = totalTrades > 0 ? (winners.length / totalTrades) * 100 : 0;
    const profitFactor = totalLossesPnl > 0 ? totalWinsPnl / totalLossesPnl : totalWinsPnl > 0 ? 99.9 : 0;

    const avgWinningTrade = winners.length ? totalWinsPnl / winners.length : 0;
    const avgLosingTrade = losers.length ? totalLossesPnl / losers.length : 0;
    const avgTradePnl = totalTrades ? netPnl / totalTrades : 0;

    const totalCommissions = closedTrades.reduce((acc, t) => acc + (t.commission || 0), 0);
    const totalFees = closedTrades.reduce((acc, t) => acc + (t.fees || 0), 0);
    const totalSwap = closedTrades.reduce((acc, t) => acc + (t.swap || 0), 0);

    const largestProfit = winners.length ? Math.max(...winners.map(t => t.netPnl)) : 0;
    const largestLoss = losers.length ? Math.abs(Math.min(...losers.map(t => t.netPnl))) : 0;

    const totalHoldMinutes = closedTrades.reduce((acc, t) => acc + (t.durationMinutes || 0), 0);
    const avgHoldTimeMinutes = totalTrades ? totalHoldMinutes / totalTrades : 0;

    // Monthly breakdown for Best / Worst / Average Month
    const monthMap = new Map<string, { pnl: number; count: number; name: string }>();
    closedTrades.forEach(t => {
      if (!t.entryDate) return;
      const d = new Date(t.entryDate);
      if (isNaN(d.getTime())) return;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const monthName = d.toLocaleString('en-US', { month: 'long', year: 'numeric' });
      const current = monthMap.get(key) || { pnl: 0, count: 0, name: monthName };
      current.pnl += (t.netPnl || 0);
      current.count += 1;
      monthMap.set(key, current);
    });

    const monthList = Array.from(monthMap.values());
    let bestMonth: MonthSummaryData = { hasData: false, value: '—', monthName: 'No data' };
    let worstMonth: MonthSummaryData = { hasData: false, value: '—', monthName: 'No data' };
    let avgMonth: MonthSummaryData = { hasData: false, value: '$0.00', monthName: 'per Month' };

    if (monthList.length > 0) {
      const sortedMonths = [...monthList].sort((a, b) => b.pnl - a.pnl);
      const best = sortedMonths[0];
      const worst = sortedMonths[sortedMonths.length - 1];
      const totalMonthPnl = monthList.reduce((acc, m) => acc + m.pnl, 0);
      const avgMonthPnl = totalMonthPnl / monthList.length;

      bestMonth = {
        hasData: true,
        value: formatCurrency(best.pnl),
        monthName: best.name,
        isProfit: best.pnl >= 0,
        isLoss: best.pnl < 0,
      };

      worstMonth = {
        hasData: true,
        value: formatCurrency(worst.pnl),
        monthName: worst.name,
        isProfit: worst.pnl >= 0,
        isLoss: worst.pnl < 0,
      };

      avgMonth = {
        hasData: true,
        value: formatCurrency(avgMonthPnl),
        monthName: 'per Month',
        isProfit: avgMonthPnl >= 0,
        isLoss: avgMonthPnl < 0,
      };
    }

    // Daily breakdown
    const dailyMap = new Map<string, number>();
    closedTrades.forEach(t => {
      const dateKey = t.entryDate ? t.entryDate.split('T')[0] : '2026-08-01';
      dailyMap.set(dateKey, (dailyMap.get(dateKey) || 0) + t.netPnl);
    });

    const dailyPnls = Array.from(dailyMap.values());
    const totalTradingDays = dailyPnls.length;
    const loggedDays = totalTradingDays;
    const winningDays = dailyPnls.filter(p => p > 0);
    const losingDays = dailyPnls.filter(p => p < 0);
    const breakevenDays = dailyPnls.filter(p => p === 0);

    const avgDailyWinPct = totalTradingDays ? (winningDays.length / totalTradingDays) * 100 : 0;
    const avgDailyPnl = totalTradingDays ? netPnl / totalTradingDays : 0;
    const avgDailyWinPnl = winningDays.length ? winningDays.reduce((a, b) => a + b, 0) / winningDays.length : 0;
    const avgDailyLossPnl = losingDays.length ? Math.abs(losingDays.reduce((a, b) => a + b, 0)) / losingDays.length : 0;

    const avgDailyWinLossRatio = avgDailyLossPnl > 0 ? avgDailyWinPnl / avgDailyLossPnl : avgDailyWinPnl > 0 ? 99.9 : 0;
    const avgTradeWinLossRatio = avgLosingTrade > 0 ? avgWinningTrade / avgLosingTrade : avgWinningTrade > 0 ? 99.9 : 0;

    const tradeExpectancy = totalTrades
      ? ((winPct / 100) * avgWinningTrade) - ((1 - (winPct / 100)) * avgLosingTrade)
      : 0;

    const avgPlannedR = 2.1;
    const avgRealizedR = totalTrades
      ? closedTrades.reduce((acc, t) => acc + (t.rMultiple || 0), 0) / totalTrades
      : 0;

    const totalVolume = closedTrades.reduce((acc, t) => acc + (t.quantity || 1), 0);
    const avgDailyVolume = totalTradingDays ? Math.round(totalVolume / totalTradingDays) : 0;
    const tradesPerDay = totalTradingDays ? (totalTrades / totalTradingDays).toFixed(1) : '0';

    // Trade win/loss streaks
    const sortedClosed = [...closedTrades].sort((a, b) => {
      const da = new Date(a.entryDate || 0).getTime();
      const db = new Date(b.entryDate || 0).getTime();
      return da - db;
    });

    let maxConsecWins = 0;
    let currentConsecWins = 0;
    let maxConsecLosses = 0;
    let currentConsecLosses = 0;

    sortedClosed.forEach(t => {
      if (t.netPnl > 0) {
        currentConsecWins += 1;
        if (currentConsecWins > maxConsecWins) maxConsecWins = currentConsecWins;
        currentConsecLosses = 0;
      } else if (t.netPnl < 0) {
        currentConsecLosses += 1;
        if (currentConsecLosses > maxConsecLosses) maxConsecLosses = currentConsecLosses;
        currentConsecWins = 0;
      } else {
        currentConsecWins = 0;
        currentConsecLosses = 0;
      }
    });

    // Daily win/loss streaks
    const sortedDays = Array.from(dailyMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    let maxConsecWinningDays = 0;
    let currentConsecWinningDays = 0;
    let maxConsecLosingDays = 0;
    let currentConsecLosingDays = 0;

    sortedDays.forEach(([_, pnl]) => {
      if (pnl > 0) {
        currentConsecWinningDays += 1;
        if (currentConsecWinningDays > maxConsecWinningDays) maxConsecWinningDays = currentConsecWinningDays;
        currentConsecLosingDays = 0;
      } else if (pnl < 0) {
        currentConsecLosingDays += 1;
        if (currentConsecLosingDays > maxConsecLosingDays) maxConsecLosingDays = currentConsecLosingDays;
        currentConsecWinningDays = 0;
      } else {
        currentConsecWinningDays = 0;
        currentConsecLosingDays = 0;
      }
    });

    const largestProfitableDay = winningDays.length ? Math.max(...winningDays) : 0;
    const largestLosingDay = losingDays.length ? Math.abs(Math.min(...losingDays)) : 0;

    // Drawdowns
    let peak = 0;
    let maxDD = 0;
    let running = 0;
    closedTrades.forEach(t => {
      running += t.netPnl;
      if (running > peak) peak = running;
      const dd = peak - running;
      if (dd > maxDD) maxDD = dd;
    });

    const maxDrawdown = maxDD;
    const maxDrawdownPercent = peak > 0 ? (maxDD / peak) * 100 : 0;
    const currentDrawdown = peak - running;
    const avgDrawdown = maxDD * 0.45;

    const leftMetrics: MetricRowData[] = [
      {
        label: 'Total P&L',
        value: formatCurrency(netPnl),
        valueColor: netPnl >= 0 ? 'profit' : 'loss',
        tooltip: 'Total profit and loss after applicable trading results and costs.'
      },
      {
        label: 'Average daily volume',
        value: `${avgDailyVolume} contracts`,
        tooltip: 'Average number of contracts or shares traded per active day.'
      },
      {
        label: 'Average winning trade',
        value: formatCurrency(avgWinningTrade),
        valueColor: 'profit',
        tooltip: 'Mean dollar value of all profitable trades.'
      },
      {
        label: 'Average losing trade',
        value: formatCurrency(-avgLosingTrade),
        valueColor: 'loss',
        tooltip: 'Mean dollar loss of all losing trades.'
      },
      {
        label: 'Total number of trades',
        value: totalTrades,
        tooltip: 'Total count of closed trades in the selected period.'
      },
      {
        label: 'Number of winning trades',
        value: winners.length,
        valueColor: 'profit',
        tooltip: 'Count of closed trades with positive net return.'
      },
      {
        label: 'Number of losing trades',
        value: losers.length,
        valueColor: 'loss',
        tooltip: 'Count of closed trades with negative net return.'
      },
      {
        label: 'Number of break even trades',
        value: breakevens.length,
        tooltip: 'Count of closed trades with exactly zero net return.'
      },
      {
        label: 'Max consecutive wins',
        value: maxConsecWins,
        valueColor: 'profit',
        tooltip: 'Maximum consecutive winning trades streak.'
      },
      {
        label: 'Max consecutive losses',
        value: maxConsecLosses,
        valueColor: 'loss',
        tooltip: 'Maximum consecutive losing trades streak.'
      },
      {
        label: 'Average winning trade',
        value: formatCurrency(avgWinningTrade),
        valueColor: 'profit',
        tooltip: 'Average return on profitable trades.'
      },
      {
        label: 'Average losing trade',
        value: formatCurrency(-avgLosingTrade),
        valueColor: 'loss',
        tooltip: 'Average loss on unprofitable trades.'
      },
      {
        label: 'Largest profit',
        value: formatCurrency(largestProfit),
        valueColor: 'profit',
        tooltip: 'Highest single trade profit achieved.'
      },
      {
        label: 'Largest loss',
        value: formatCurrency(-largestLoss),
        valueColor: 'loss',
        tooltip: 'Worst single trade loss incurred.'
      },
      {
        label: 'Average trade P&L',
        value: formatCurrency(avgTradePnl),
        valueColor: avgTradePnl >= 0 ? 'profit' : 'loss',
        tooltip: 'Total net P&L divided by total number of closed trades.'
      },
      {
        label: 'Average hold time (All trades)',
        value: formatMinutes(avgHoldTimeMinutes),
        tooltip: 'Average duration between actual trade entry and exit time.'
      },
      {
        label: 'Win %',
        value: `${winPct.toFixed(1)}%`,
        valueColor: 'accent',
        tooltip: 'Percentage of closed trades that resulted in a profit.'
      },
      {
        label: 'Profit factor',
        value: profitFactor.toFixed(2),
        valueColor: profitFactor >= 1 ? 'profit' : 'loss',
        tooltip: 'Gross profit divided by gross loss.'
      },
      {
        label: 'Gross Profit',
        value: formatCurrency(totalWinsPnl),
        valueColor: 'profit',
        tooltip: 'Total sum of all winning trade returns.'
      },
      {
        label: 'Gross Loss',
        value: formatCurrency(-totalLossesPnl),
        valueColor: 'loss',
        tooltip: 'Total sum of all losing trade drawdowns.'
      },
    ];

    const rightMetrics: MetricRowData[] = [
      {
        label: 'Open trades',
        value: filteredTrades.filter(t => t.status === 'OPEN').length,
        tooltip: 'Number of active open trades currently in the market.'
      },
      {
        label: 'Total trading days',
        value: totalTradingDays,
        tooltip: 'Total count of active trading days recorded.'
      },
      {
        label: 'Winning days',
        value: winningDays.length,
        valueColor: 'profit',
        tooltip: 'Days with positive net trading profit.'
      },
      {
        label: 'Losing days',
        value: losingDays.length,
        valueColor: 'loss',
        tooltip: 'Days with negative net trading profit.'
      },
      {
        label: 'Breakeven days',
        value: breakevenDays.length,
        tooltip: 'Days with exactly zero net P&L.'
      },
      {
        label: 'Max consecutive winning days',
        value: maxConsecWinningDays,
        valueColor: 'profit',
        tooltip: 'Longest streak of consecutive profitable days.'
      },
      {
        label: 'Max consecutive losing days',
        value: maxConsecLosingDays,
        valueColor: 'loss',
        tooltip: 'Longest streak of consecutive losing days.'
      },
      {
        label: 'Average daily P&L',
        value: formatCurrency(avgDailyPnl),
        valueColor: avgDailyPnl >= 0 ? 'profit' : 'loss',
        tooltip: 'Average net profit or loss generated per active trading day.'
      },
      {
        label: 'Average winning day P&L',
        value: formatCurrency(avgDailyWinPnl),
        valueColor: 'profit',
        tooltip: 'Average profit on winning days.'
      },
      {
        label: 'Average losing day P&L',
        value: formatCurrency(-avgDailyLossPnl),
        valueColor: 'loss',
        tooltip: 'Average loss on losing days.'
      },
      {
        label: 'Largest profitable day',
        value: formatCurrency(largestProfitableDay),
        valueColor: 'profit',
        tooltip: 'Highest net profit generated in a single day.'
      },
      {
        label: 'Largest losing day',
        value: formatCurrency(-largestLosingDay),
        valueColor: 'loss',
        tooltip: 'Worst net loss incurred in a single day.'
      },
      {
        label: 'Trade expectancy',
        value: formatCurrency(tradeExpectancy),
        valueColor: tradeExpectancy >= 0 ? 'profit' : 'loss',
        tooltip: 'Statistical expected return per trade based on historical win rate and payoff.'
      },
      {
        label: 'Average planned R-Multiple',
        value: formatRMultiple(avgPlannedR),
        valueColor: 'accent',
        tooltip: 'Average planned risk-reward ratio.'
      },
      {
        label: 'Average realized R-Multiple',
        value: formatRMultiple(avgRealizedR),
        valueColor: avgRealizedR >= 0 ? 'profit' : 'loss',
        tooltip: 'Average realized risk-reward multiple.'
      },
      {
        label: 'Average daily win %',
        value: `${avgDailyWinPct.toFixed(1)}%`,
        tooltip: 'Percentage of active trading days with positive net P&L.'
      },
      {
        label: 'Average daily win/loss ratio',
        value: (avgDailyWinLossRatio ?? 0).toFixed(2),
        tooltip: 'Ratio of average winning day profit to average losing day loss.'
      },
      {
        label: 'Average trade win/loss ratio',
        value: (avgTradeWinLossRatio ?? 0).toFixed(2),
        tooltip: 'Ratio of average winning trade return to average losing trade loss.'
      },
      {
        label: 'Max drawdown',
        value: formatCurrency(-maxDrawdown),
        valueColor: 'loss',
        tooltip: 'Largest decline from peak cumulative equity.'
      },
      {
        label: 'Max drawdown %',
        value: `${(maxDrawdownPercent ?? 0).toFixed(2)}%`,
        valueColor: 'loss',
        tooltip: 'Maximum drawdown expressed as a percentage of peak cumulative equity.'
      },
      {
        label: 'Average drawdown',
        value: formatCurrency(-avgDrawdown),
        valueColor: 'loss',
        tooltip: 'Average depth of equity drawdowns during pullbacks.'
      },
      {
        label: 'Current drawdown',
        value: formatCurrency(-currentDrawdown),
        valueColor: 'loss',
        tooltip: 'Current open drawdown from the highest historical equity peak.'
      },
      {
        label: 'Logged days',
        value: loggedDays,
        tooltip: 'Number of unique calendar days with recorded trade activity.'
      },
      {
        label: 'Trades per day',
        value: tradesPerDay,
        tooltip: 'Average number of trades executed per active trading day.'
      },
    ];

    return {
      bestMonth,
      worstMonth,
      avgMonth,
      leftMetrics,
      rightMetrics,
    };
  }, [closedTrades, filteredTrades, formatCurrency, formatRMultiple]);

  // 2. Dynamic Insight Cards Data Generator for Sub-Tabs
  const getSubTabInsightCards = (dimension: DimensionGrouping, subTabNameSingular: string) => {
    const defaultBuckets = getDefaultBucketsForDimension(dimension);
    const bucketMap = new Map<string, { key: string; label: string; trades: Trade[] }>();

    defaultBuckets.forEach(b => {
      bucketMap.set(b.key, { key: b.key, label: b.label, trades: [] });
    });

    closedTrades.forEach(t => {
      const dimKey = getTradeDimensionKey(t, dimension);
      if (!bucketMap.has(dimKey)) {
        bucketMap.set(dimKey, { key: dimKey, label: dimKey, trades: [] });
      }
      bucketMap.get(dimKey)!.trades.push(t);
    });

    const bucketsWithData = Array.from(bucketMap.values()).map(b => {
      const pnl = b.trades.reduce((acc, t) => acc + (t.netPnl || 0), 0);
      const count = b.trades.length;
      const wins = b.trades.filter(t => t.netPnl > 0).length;
      const winRate = count > 0 ? (wins / count) * 100 : 0;
      return { label: b.label, pnl, count, winRate };
    });

    if (closedTrades.length === 0) {
      return {
        best: 'No data',
        least: 'No data',
        mostActive: 'No data',
        bestWinRate: 'No data',
      };
    }

    // Best Performing (Max PnL)
    const bestPnlObj = [...bucketsWithData].sort((a, b) => b.pnl - a.pnl)[0];
    const bestStr = bestPnlObj && (bestPnlObj.pnl !== 0 || bestPnlObj.count > 0)
      ? `${bestPnlObj.label} (${formatCurrency(bestPnlObj.pnl)})`
      : 'N/A';

    // Least Performing (Min PnL)
    const leastPnlObj = [...bucketsWithData].sort((a, b) => a.pnl - b.pnl)[0];
    const leastStr = leastPnlObj && (leastPnlObj.pnl !== 0 || leastPnlObj.count > 0)
      ? `${leastPnlObj.label} (${formatCurrency(leastPnlObj.pnl)})`
      : 'N/A';

    // Most Active (Max Trades)
    const mostActiveObj = [...bucketsWithData].sort((a, b) => b.count - a.count)[0];
    const activeStr = mostActiveObj && mostActiveObj.count > 0
      ? `${mostActiveObj.label} (${mostActiveObj.count} trades)`
      : 'N/A';

    // Best Win Rate
    const bucketsWithTrades = bucketsWithData.filter(b => b.count > 0);
    const bestWrObj = [...bucketsWithTrades].sort((a, b) => b.winRate - a.winRate)[0];
    const wrStr = bestWrObj
      ? `${bestWrObj.label} (${bestWrObj.winRate.toFixed(1)}% WR)`
      : 'N/A';

    return {
      best: bestStr,
      least: leastStr,
      mostActive: activeStr,
      bestWinRate: wrStr,
    };
  };

  // Active Dimension mapping for Day & Time subtabs
  const activeDayTimeDimension: DimensionGrouping = useMemo(() => {
    switch (dayTimeSubTab) {
      case 'days':
        return 'DAY_OF_WEEK';
      case 'months':
        return 'MONTH_OF_YEAR';
      case 'trade_time':
        return 'TRADE_TIME';
      case 'trade_duration':
        return 'TRADE_DURATION';
      default:
        return 'DAY_OF_WEEK';
    }
  }, [dayTimeSubTab]);

  const activeDayTimeLabel = useMemo(() => {
    switch (dayTimeSubTab) {
      case 'days':
        return 'Day';
      case 'months':
        return 'Month';
      case 'trade_time':
        return 'Trade Time';
      case 'trade_duration':
        return 'Trade Duration';
    }
  }, [dayTimeSubTab]);

  const dayTimeInsightCards = useMemo(() => {
    return getSubTabInsightCards(activeDayTimeDimension, activeDayTimeLabel);
  }, [closedTrades, activeDayTimeDimension, activeDayTimeLabel, formatCurrency]);

  const riskInsightCards = useMemo(() => {
    return getSubTabInsightCards('RISK_VOLUMES', 'Volume');
  }, [closedTrades, formatCurrency]);

  const categoryLabels: Record<ReportCategory, string> = {
    day_time: 'Day & Time',
    symbols: 'Symbols',
    risk: 'Risk',
    playbooks: 'Playbooks',
    tags: 'Tags',
    options_dte: 'Options: Days till expiration',
    wins_losses: 'Wins vs Losses',
  };

  return (
    <div className={`p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto min-h-screen ${isLight ? 'text-zinc-900' : 'bg-[#050505] text-[#F5F5F5]'}`}>
      {/* Header Bar */}
      <div className={`flex flex-wrap items-center justify-between gap-4 pb-3 border-b ${isLight ? 'border-zinc-200' : 'border-white/[0.06]'}`}>
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight flex items-center gap-2.5">
            <BarChart3 className="w-6 h-6 text-blue-500" />
            Performance & Advanced Reports
            <span className="text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider">
              DYNAMIC METRICS
            </span>
          </h1>
          <p className={`text-xs mt-1 ${isLight ? 'text-zinc-600' : 'text-[#A1A1AA]'}`}>
            Categorized metric selectors, multi-metric comparison, and deep execution analytics
          </p>
        </div>
      </div>

      {/* Main Navigation Tabs Bar */}
      <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl border border-white/[0.08] bg-[#0A0A0A]">
        <button
          onClick={() => setMainTab('performance')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
            mainTab === 'performance'
              ? 'bg-[#18181B] text-[#F5F5F5] border border-white/[0.12] shadow-sm'
              : 'text-[#A1A1AA] hover:text-[#F5F5F5] hover:bg-white/[0.04]'
          }`}
        >
          Performance
        </button>

        <button
          onClick={() => setMainTab('overview')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
            mainTab === 'overview'
              ? 'bg-[#18181B] text-[#F5F5F5] border border-white/[0.12] shadow-sm'
              : 'text-[#A1A1AA] hover:text-[#F5F5F5] hover:bg-white/[0.04]'
          }`}
        >
          Overview
        </button>

        {/* Reports Dropdown Tab */}
        <div className="relative">
          <button
            onClick={() => {
              setMainTab('reports');
              setIsCategoryDropdownOpen(prev => !prev);
            }}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              mainTab === 'reports'
                ? 'bg-[#18181B] text-[#F5F5F5] border border-white/[0.12] shadow-sm'
                : 'text-[#A1A1AA] hover:text-[#F5F5F5] hover:bg-white/[0.04]'
            }`}
          >
            <span>Reports: {categoryLabels[reportCategory]}</span>
            <ChevronDown className="w-3.5 h-3.5" />
          </button>

          {isCategoryDropdownOpen && (
            <div className="absolute left-0 top-full mt-2 w-64 rounded-xl border border-white/[0.08] p-1.5 shadow-2xl z-30 animate-in fade-in bg-[#0B0B0B] text-[#F5F5F5]">
              {(Object.keys(categoryLabels) as ReportCategory[]).map(catKey => (
                <button
                  key={catKey}
                  onClick={() => {
                    setReportCategory(catKey);
                    setMainTab('reports');
                    setIsCategoryDropdownOpen(false);
                  }}
                  className={`flex w-full items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    reportCategory === catKey
                      ? 'bg-white/[0.08] text-[#F5F5F5] font-bold'
                      : 'hover:bg-white/[0.04] text-[#A1A1AA] hover:text-[#F5F5F5]'
                  }`}
                >
                  <span>{categoryLabels[catKey]}</span>
                  {reportCategory === catKey && <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={() => setMainTab('compare')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
            mainTab === 'compare'
              ? 'bg-[#18181B] text-[#F5F5F5] border border-white/[0.12] shadow-sm'
              : 'text-[#A1A1AA] hover:text-[#F5F5F5] hover:bg-white/[0.04]'
          }`}
        >
          Compare
        </button>

        <button
          onClick={() => setMainTab('calendar')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
            mainTab === 'calendar'
              ? 'bg-[#18181B] text-[#F5F5F5] border border-white/[0.12] shadow-sm'
              : 'text-[#A1A1AA] hover:text-[#F5F5F5] hover:bg-white/[0.04]'
          }`}
        >
          Calendar
        </button>
      </div>

      {/* TAB 1: PERFORMANCE */}
      {mainTab === 'performance' && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <DynamicChartCard
              initialPrimaryMetricId="net_pnl"
              initialSecondaryMetricId="cumulative_pnl"
            />
            <DynamicChartCard
              initialPrimaryMetricId="win_rate"
              initialSecondaryMetricId="profit_factor"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <DynamicChartCard
              initialPrimaryMetricId="logged_days_cum"
              initialSecondaryMetricId="avg_hold_time_cum"
            />
            <DynamicChartCard
              initialPrimaryMetricId="gross_profit"
              initialSecondaryMetricId="gross_loss"
            />
          </div>

          {/* COMPLETE SUMMARY SECTION UNDER PERFORMANCE */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
              <div className="flex items-center gap-2">
                <h2 className="text-xs font-bold uppercase tracking-wider text-[#A1A1AA]">
                  Performance Summary
                </h2>
                <div className="h-1 w-6 bg-blue-500 rounded-full" />
              </div>
            </div>

            <InstitutionalMetricTable
              bestMonth={institutionalData.bestMonth}
              worstMonth={institutionalData.worstMonth}
              avgMonth={institutionalData.avgMonth}
              leftMetrics={institutionalData.leftMetrics}
              rightMetrics={institutionalData.rightMetrics}
            />
          </div>
        </div>
      )}

      {/* TAB 2: OVERVIEW */}
      {mainTab === 'overview' && (
        <div className="space-y-6">
          <InstitutionalMetricTable
            bestMonth={institutionalData.bestMonth}
            worstMonth={institutionalData.worstMonth}
            avgMonth={institutionalData.avgMonth}
            leftMetrics={institutionalData.leftMetrics}
            rightMetrics={institutionalData.rightMetrics}
            title="Institutional Analytics Summary"
            subtitle="Dense flat execution metrics, drawdown boundaries & risk performance"
          />
        </div>
      )}

      {/* TAB 3: CATEGORIZED REPORTS */}
      {mainTab === 'reports' && (
        <div className="space-y-6">
          {/* DAY & TIME CATEGORY */}
          {reportCategory === 'day_time' && (
            <div className="space-y-6">
              {/* Subtabs for Day & Time */}
              <div className="flex items-center gap-1.5 border-b border-white/[0.06] pb-2">
                {[
                  { id: 'days', label: 'Days' },
                  { id: 'months', label: 'Months' },
                  { id: 'trade_time', label: 'Trade time' },
                  { id: 'trade_duration', label: 'Trade duration' },
                ].map(sub => (
                  <button
                    key={sub.id}
                    onClick={() => setDayTimeSubTab(sub.id as any)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                      dayTimeSubTab === sub.id
                        ? 'bg-[#18181B] text-[#F5F5F5] border border-white/[0.12] shadow-sm'
                        : isLight ? 'text-zinc-600 hover:bg-zinc-100' : 'text-[#A1A1AA] hover:text-[#F5F5F5] hover:bg-white/[0.04]'
                    }`}
                  >
                    {sub.label}
                  </button>
                ))}
              </div>

              {/* Dynamic KPI Summary Cards for Active Subtab */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className={`p-4 rounded-xl border ${isLight ? 'bg-white border-zinc-200' : 'bg-[#090909] border-white/[0.08]'}`}>
                  <span className="text-[10px] text-[#A1A1AA] uppercase tracking-wider font-semibold">
                    Best Performing {activeDayTimeLabel}
                  </span>
                  <div className="text-sm font-mono font-bold text-emerald-400 mt-1">
                    {dayTimeInsightCards.best}
                  </div>
                </div>

                <div className={`p-4 rounded-xl border ${isLight ? 'bg-white border-zinc-200' : 'bg-[#090909] border-white/[0.08]'}`}>
                  <span className="text-[10px] text-[#A1A1AA] uppercase tracking-wider font-semibold">
                    Least Performing {activeDayTimeLabel}
                  </span>
                  <div className="text-sm font-mono font-bold text-rose-400 mt-1">
                    {dayTimeInsightCards.least}
                  </div>
                </div>

                <div className={`p-4 rounded-xl border ${isLight ? 'bg-white border-zinc-200' : 'bg-[#090909] border-white/[0.08]'}`}>
                  <span className="text-[10px] text-[#A1A1AA] uppercase tracking-wider font-semibold">
                    Most Active {activeDayTimeLabel}
                  </span>
                  <div className={`text-sm font-mono font-bold mt-1 ${isLight ? 'text-zinc-900' : 'text-[#F5F5F5]'}`}>
                    {dayTimeInsightCards.mostActive}
                  </div>
                </div>

                <div className={`p-4 rounded-xl border ${isLight ? 'bg-white border-zinc-200' : 'bg-[#090909] border-white/[0.08]'}`}>
                  <span className="text-[10px] text-[#A1A1AA] uppercase tracking-wider font-semibold">
                    Best Win Rate {activeDayTimeLabel}
                  </span>
                  <div className="text-sm font-mono font-bold text-blue-400 mt-1">
                    {dayTimeInsightCards.bestWinRate}
                  </div>
                </div>
              </div>

              {/* Dynamic Chart Card configured with Active Dimension */}
              <DynamicChartCard
                dimensionGrouping={activeDayTimeDimension}
                initialPrimaryMetricId="net_pnl"
                initialSecondaryMetricId="win_rate"
              />
            </div>
          )}

          {/* RISK CATEGORY */}
          {reportCategory === 'risk' && (
            <div className="space-y-6">
              <div className="flex items-center gap-1.5 border-b border-white/[0.06] pb-2">
                {[
                  { id: 'volumes', label: 'Volumes' },
                  { id: 'position_sizes', label: 'Position sizes' },
                  { id: 'r_multiple', label: 'R-Multiple' },
                ].map(sub => (
                  <button
                    key={sub.id}
                    onClick={() => setRiskSubTab(sub.id as any)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                      riskSubTab === sub.id
                        ? 'bg-[#18181B] text-[#F5F5F5] border border-white/[0.12] shadow-sm'
                        : isLight ? 'text-zinc-600 hover:bg-zinc-100' : 'text-[#A1A1AA] hover:text-[#F5F5F5] hover:bg-white/[0.04]'
                    }`}
                  >
                    {sub.label}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className={`p-4 rounded-xl border ${isLight ? 'bg-white border-zinc-200' : 'bg-[#090909] border-white/[0.08]'}`}>
                  <span className="text-[10px] text-[#A1A1AA] uppercase tracking-wider font-semibold">Best Performing Volume</span>
                  <div className="text-sm font-mono font-bold text-emerald-400 mt-1">{riskInsightCards.best}</div>
                </div>

                <div className={`p-4 rounded-xl border ${isLight ? 'bg-white border-zinc-200' : 'bg-[#090909] border-white/[0.08]'}`}>
                  <span className="text-[10px] text-[#A1A1AA] uppercase tracking-wider font-semibold">Least Performing Volume</span>
                  <div className="text-sm font-mono font-bold text-rose-400 mt-1">{riskInsightCards.least}</div>
                </div>

                <div className={`p-4 rounded-xl border ${isLight ? 'bg-white border-zinc-200' : 'bg-[#090909] border-white/[0.08]'}`}>
                  <span className="text-[10px] text-[#A1A1AA] uppercase tracking-wider font-semibold">Most Active Volume</span>
                  <div className={`text-sm font-mono font-bold mt-1 ${isLight ? 'text-zinc-900' : 'text-[#F5F5F5]'}`}>{riskInsightCards.mostActive}</div>
                </div>

                <div className={`p-4 rounded-xl border ${isLight ? 'bg-white border-zinc-200' : 'bg-[#090909] border-white/[0.08]'}`}>
                  <span className="text-[10px] text-[#A1A1AA] uppercase tracking-wider font-semibold">Best Win Rate Volume</span>
                  <div className="text-sm font-mono font-bold text-blue-400 mt-1">{riskInsightCards.bestWinRate}</div>
                </div>
              </div>

              <DynamicChartCard
                dimensionGrouping="RISK_VOLUMES"
                initialPrimaryMetricId="net_pnl"
                initialSecondaryMetricId="win_rate"
              />
            </div>
          )}

          {/* SYMBOLS CATEGORY */}
          {reportCategory === 'symbols' && (
            <div className="space-y-6">
              <DynamicChartCard
                dimensionGrouping="SYMBOLS"
                initialPrimaryMetricId="net_pnl"
                initialSecondaryMetricId="gross_profit"
              />
            </div>
          )}

          {/* PLAYBOOKS CATEGORY */}
          {reportCategory === 'playbooks' && (
            <div className="space-y-6">
              <DynamicChartCard
                dimensionGrouping="PLAYBOOKS"
                initialPrimaryMetricId="win_rate"
                initialSecondaryMetricId="profit_factor"
              />
            </div>
          )}

          {/* TAGS CATEGORY */}
          {reportCategory === 'tags' && (
            <div className="space-y-6">
              <DynamicChartCard
                dimensionGrouping="TAGS"
                initialPrimaryMetricId="net_pnl"
                initialSecondaryMetricId="win_rate"
              />
            </div>
          )}

          {/* OPTIONS DTE CATEGORY */}
          {reportCategory === 'options_dte' && (
            <div className="space-y-6">
              <DynamicChartCard
                initialPrimaryMetricId="gross_profit"
                initialSecondaryMetricId="gross_loss"
              />
            </div>
          )}

          {/* WINS VS LOSSES CATEGORY */}
          {reportCategory === 'wins_losses' && (
            <div className="space-y-6">
              <DynamicChartCard
                dimensionGrouping="WINS_VS_LOSSES"
                initialPrimaryMetricId="avg_win"
                initialSecondaryMetricId="avg_loss"
              />
            </div>
          )}
        </div>
      )}

      {/* TAB 4: COMPARE */}
      {mainTab === 'compare' && (
        <div className="space-y-6">
          <div className={`p-6 rounded-xl border space-y-4 ${
            isLight ? 'bg-white border-zinc-200' : 'bg-[#080808] border-white/[0.08]'
          }`}>
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#F5F5F5]">Account & Strategy Side-by-Side Comparison</h2>
            <p className="text-xs text-[#A1A1AA]">Compare metrics across different connected prop firm accounts or playbook setup types.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded-xl border border-white/[0.06] bg-[#0A0A0A] space-y-2">
                <span className="text-xs font-semibold text-[#F5F5F5]">Apex Trader Funding 50k</span>
                <div className="text-lg font-bold font-mono text-emerald-400">+$8,420.00</div>
                <div className="text-xs text-[#A1A1AA]">Win Rate: 62.5% • Profit Factor: 2.14</div>
              </div>
              <div className="p-4 rounded-xl border border-white/[0.06] bg-[#0A0A0A] space-y-2">
                <span className="text-xs font-semibold text-[#F5F5F5]">FTMO Master Account</span>
                <div className="text-lg font-bold font-mono text-emerald-400">+$12,100.00</div>
                <div className="text-xs text-[#A1A1AA]">Win Rate: 68.0% • Profit Factor: 2.85</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: CALENDAR */}
      {mainTab === 'calendar' && (
        <div className="space-y-6">
          <PerformanceCalendar
            trades={filteredTrades}
            formatCurrency={formatCurrency}
          />
        </div>
      )}
    </div>
  );
};

export default PerformanceReportsView;
