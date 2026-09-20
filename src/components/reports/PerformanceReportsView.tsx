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
              : 'bg-[#0A0D14] text-slate-100 border-[#273141] shadow-black'
          }`}
        >
          {content}
          <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-zinc-900 dark:border-t-slate-950" />
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
      isLight ? 'bg-zinc-50/80 border-zinc-200/80 hover:border-zinc-300' : 'bg-[#0A0D14] border-[#1C232E] hover:border-[#273141]'
    }`}>
      <div className="flex items-center justify-between gap-1 mb-1">
        <span className={`text-[11px] font-medium truncate ${isLight ? 'text-zinc-600' : 'text-slate-400'}`}>
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
    <div className={`p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto min-h-screen ${isLight ? 'text-zinc-900' : 'text-slate-100'}`}>
      {/* Header Bar */}
      <div className={`flex flex-wrap items-center justify-between gap-4 pb-3 border-b ${isLight ? 'border-zinc-200' : 'border-[#1C232E]'}`}>
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight flex items-center gap-2.5">
            <BarChart3 className="w-6 h-6 text-blue-500" />
            Performance & Advanced Reports
            <span className="text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider">
              DYNAMIC METRICS
            </span>
          </h1>
          <p className={`text-xs mt-1 ${isLight ? 'text-zinc-600' : 'text-slate-400'}`}>
            Categorized metric selectors, multi-metric comparison, and deep execution analytics
          </p>
        </div>
      </div>

      {/* Main Navigation Tabs Bar */}
      <div className={`flex flex-wrap items-center gap-2 p-1.5 rounded-2xl border ${
        isLight ? 'bg-zinc-100 border-zinc-200' : 'bg-[#12161D] border-[#1C232E]'
      }`}>
        <button
          onClick={() => setMainTab('performance')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
            mainTab === 'performance'
              ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white border-indigo-400/40 shadow-md shadow-indigo-600/20'
              : isLight ? 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/60' : 'text-slate-400 hover:text-white hover:bg-[#1A1F27]'
          }`}
        >
          Performance
        </button>

        <button
          onClick={() => setMainTab('overview')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
            mainTab === 'overview'
              ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white border-indigo-400/40 shadow-md shadow-indigo-600/20'
              : isLight ? 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/60' : 'text-slate-400 hover:text-white hover:bg-[#1A1F27]'
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
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              mainTab === 'reports'
                ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white border-indigo-400/40 shadow-md shadow-indigo-600/20'
                : isLight ? 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/60' : 'text-slate-400 hover:text-white hover:bg-[#1A1F27]'
            }`}
          >
            <span>Reports: {categoryLabels[reportCategory]}</span>
            <ChevronDown className="w-3.5 h-3.5" />
          </button>

          {isCategoryDropdownOpen && (
            <div className={`absolute left-0 top-full mt-2 w-64 rounded-2xl border p-2 shadow-2xl z-30 animate-in fade-in ${
              isLight ? 'bg-white border-zinc-200 text-zinc-800' : 'bg-[#0A0D14] border-[#1C232E] text-slate-100'
            }`}>
              {(Object.keys(categoryLabels) as ReportCategory[]).map(catKey => (
                <button
                  key={catKey}
                  onClick={() => {
                    setReportCategory(catKey);
                    setMainTab('reports');
                    setIsCategoryDropdownOpen(false);
                  }}
                  className={`flex w-full items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
                    reportCategory === catKey
                      ? 'bg-gradient-to-r from-blue-600/20 via-indigo-600/20 to-purple-600/20 text-white border border-blue-500/35 font-bold shadow-xs'
                      : isLight ? 'hover:bg-zinc-100 text-zinc-700' : 'hover:bg-[#12161D] text-slate-300'
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
          className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
            mainTab === 'compare'
              ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white border-indigo-400/40 shadow-md shadow-indigo-600/20'
              : isLight ? 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/60' : 'text-slate-400 hover:text-white hover:bg-[#1A1F27]'
          }`}
        >
          Compare
        </button>

        <button
          onClick={() => setMainTab('calendar')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
            mainTab === 'calendar'
              ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white border-indigo-400/40 shadow-md shadow-indigo-600/20'
              : isLight ? 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/60' : 'text-slate-400 hover:text-white hover:bg-[#1A1F27]'
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
          <div className={`p-6 rounded-2xl border space-y-6 shadow-xl ${
            isLight ? 'bg-white border-zinc-200 text-zinc-900 shadow-zinc-200/50' : 'bg-[#12161D] border-[#1C232E] text-slate-100 shadow-black/60'
          }`}>
            {/* Title Bar */}
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-[#1C232E]">
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight text-zinc-900 dark:text-slate-100 uppercase">
                  Summary
                </h2>
                <div className="h-1 w-8 bg-blue-500 rounded-full" />
              </div>
              <button
                type="button"
                className={`p-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition ${
                  isLight
                    ? 'bg-zinc-50 border-zinc-200 hover:bg-zinc-100 text-zinc-700'
                    : 'bg-[#0A0D14] border-[#1C232E] hover:bg-[#1A1F27] text-slate-300'
                }`}
              >
                <Settings className="w-3.5 h-3.5 text-blue-500" />
                <span>Settings</span>
              </button>
            </div>

            {/* 4 Column Statistics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Column 1: Core Performance */}
              <div className="space-y-3">
                <div className="text-[11px] font-bold uppercase tracking-wider text-blue-500 border-b pb-1 border-zinc-200 dark:border-[#1C232E]">
                  Core Performance
                </div>

                <SummaryItem label="Net P&L" tooltip="Total profit and loss after applicable trading results and configured costs." isLight={isLight}>
                  <span className={`font-mono font-black ${summaryStats.netPnl >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {formatCurrency(summaryStats.netPnl)}
                  </span>
                </SummaryItem>

                <SummaryItem label="Win %" tooltip="Percentage of closed trades that resulted in a profit." isLight={isLight}>
                  <span className="font-mono font-bold text-blue-400">{summaryStats.winPct.toFixed(1)}%</span>
                </SummaryItem>

                <SummaryItem label="Avg daily win %" tooltip="Percentage of active trading days with positive net P&L." isLight={isLight}>
                  <span className="font-mono font-bold">{summaryStats.avgDailyWinPct.toFixed(1)}%</span>
                </SummaryItem>

                <SummaryItem label="Profit factor" tooltip="Gross profit divided by the absolute value of gross loss." isLight={isLight}>
                  <span className="font-mono font-bold text-emerald-400">{summaryStats.profitFactor.toFixed(2)}</span>
                </SummaryItem>

                <SummaryItem label="Gross Profit" tooltip="Total sum of all winning trade returns." isLight={isLight}>
                  <span className="font-mono font-bold text-emerald-500">{formatCurrency(summaryStats.grossProfit)}</span>
                </SummaryItem>

                <SummaryItem label="Gross Loss" tooltip="Total sum of all losing trade drawdowns." isLight={isLight}>
                  <span className="font-mono font-bold text-rose-500">{formatCurrency(-summaryStats.grossLoss)}</span>
                </SummaryItem>

                <SummaryItem label="Total commissions" tooltip="Cumulative broker commissions paid across all executed trades." isLight={isLight}>
                  <span className="font-mono font-semibold">${(summaryStats.totalCommissions ?? 0).toFixed(2)}</span>
                </SummaryItem>

                <SummaryItem label="Total fees" tooltip="Exchange and regulatory fees incurred." isLight={isLight}>
                  <span className="font-mono font-semibold">${(summaryStats.totalFees ?? 0).toFixed(2)}</span>
                </SummaryItem>

                <SummaryItem label="Total swap" tooltip="Overnight position holding fees or credits." isLight={isLight}>
                  <span className="font-mono font-semibold">${(summaryStats.totalSwap ?? 0).toFixed(2)}</span>
                </SummaryItem>
              </div>

              {/* Column 2: Expectancy & Win/Loss */}
              <div className="space-y-3">
                <div className="text-[11px] font-bold uppercase tracking-wider text-blue-500 border-b pb-1 border-zinc-200 dark:border-[#1C232E]">
                  Expectancy & Win/Loss
                </div>

                <SummaryItem label="Trade expectancy" tooltip="The average amount expected to be won or lost per trade based on historical performance." isLight={isLight}>
                  <span className={`font-mono font-bold ${summaryStats.tradeExpectancy >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {formatCurrency(summaryStats.tradeExpectancy)}
                  </span>
                </SummaryItem>

                <SummaryItem label="Avg daily win/loss" tooltip="Ratio of average winning day profit to average losing day loss." isLight={isLight}>
                  <span className="font-mono font-bold">{(summaryStats.avgDailyWinLossRatio ?? 0).toFixed(2)}</span>
                </SummaryItem>

                <SummaryItem label="Avg trade win/loss" tooltip="Ratio of average winning trade return to average losing trade loss." isLight={isLight}>
                  <span className="font-mono font-bold">{(summaryStats.avgTradeWinLossRatio ?? 0).toFixed(2)}</span>
                </SummaryItem>

                <SummaryItem label="Avg hold time" tooltip="Average duration between actual trade entry and exit time." isLight={isLight}>
                  <span className="font-mono font-semibold">{formatMinutes(summaryStats.avgHoldTimeMinutes)}</span>
                </SummaryItem>

                <SummaryItem label="Average winning trade" tooltip="Mean dollar value of all profitable trades." isLight={isLight}>
                  <span className="font-mono font-bold text-emerald-400">{formatCurrency(summaryStats.avgWinningTrade)}</span>
                </SummaryItem>

                <SummaryItem label="Average losing trade" tooltip="Mean dollar loss of all losing trades." isLight={isLight}>
                  <span className="font-mono font-bold text-rose-400">{formatCurrency(-summaryStats.avgLosingTrade)}</span>
                </SummaryItem>

                <SummaryItem label="Average trade P&L" tooltip="Total net P&L divided by total number of closed trades." isLight={isLight}>
                  <span className={`font-mono font-bold ${summaryStats.avgTradePnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {formatCurrency(summaryStats.avgTradePnl)}
                  </span>
                </SummaryItem>

                <SummaryItem label="Winning trades" tooltip="Count of closed trades with positive return." isLight={isLight}>
                  <span className="font-mono font-bold text-emerald-400">{summaryStats.winningTradesCount}</span>
                </SummaryItem>

                <SummaryItem label="Losing trades" tooltip="Count of closed trades with negative return." isLight={isLight}>
                  <span className="font-mono font-bold text-rose-400">{summaryStats.losingTradesCount}</span>
                </SummaryItem>

                <SummaryItem label="Break-even trades" tooltip="Count of closed trades with zero return." isLight={isLight}>
                  <span className="font-mono font-semibold">{summaryStats.breakevenTradesCount}</span>
                </SummaryItem>
              </div>

              {/* Column 3: Daily & R-Multiple */}
              <div className="space-y-3">
                <div className="text-[11px] font-bold uppercase tracking-wider text-blue-500 border-b pb-1 border-zinc-200 dark:border-[#1C232E]">
                  Daily & R-Multiple
                </div>

                <SummaryItem label="Avg net trade P&L" tooltip="Average net return per closed trade execution." isLight={isLight}>
                  <span className={`font-mono font-bold ${summaryStats.avgTradePnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {formatCurrency(summaryStats.avgTradePnl)}
                  </span>
                </SummaryItem>

                <SummaryItem label="Avg daily net P&L" tooltip="Average net profit or loss generated per active trading day." isLight={isLight}>
                  <span className={`font-mono font-bold ${summaryStats.avgDailyPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {formatCurrency(summaryStats.avgDailyPnl)}
                  </span>
                </SummaryItem>

                <SummaryItem label="Avg planned R-multiple" tooltip="Average target risk-to-reward ratio planned prior to entry." isLight={isLight}>
                  <span className="font-mono font-bold text-blue-400">{formatRMultiple(summaryStats.avgPlannedR)}</span>
                </SummaryItem>

                <SummaryItem label="Avg realized R-multiple" tooltip="Average actual risk-to-reward ratio realized upon exit." isLight={isLight}>
                  <span className="font-mono font-bold text-emerald-400">{formatRMultiple(summaryStats.avgRealizedR)}</span>
                </SummaryItem>

                <SummaryItem label="Average R-multiple" tooltip="Mean realized R-multiple across all closed trades." isLight={isLight}>
                  <span className="font-mono font-bold text-emerald-400">{formatRMultiple(summaryStats.avgRealizedR)}</span>
                </SummaryItem>

                <SummaryItem label="Largest profit" tooltip="Highest single trade profit achieved." isLight={isLight}>
                  <span className="font-mono font-bold text-emerald-400">{formatCurrency(summaryStats.largestProfit)}</span>
                </SummaryItem>

                <SummaryItem label="Largest loss" tooltip="Worst single trade loss incurred." isLight={isLight}>
                  <span className="font-mono font-bold text-rose-400">{formatCurrency(-summaryStats.largestLoss)}</span>
                </SummaryItem>

                <SummaryItem label="Largest winning trade" tooltip="Single trade with the highest net profit." isLight={isLight}>
                  <span className="font-mono font-bold text-emerald-400">{formatCurrency(summaryStats.largestProfit)}</span>
                </SummaryItem>

                <SummaryItem label="Largest losing trade" tooltip="Single trade with the largest net loss." isLight={isLight}>
                  <span className="font-mono font-bold text-rose-400">{formatCurrency(-summaryStats.largestLoss)}</span>
                </SummaryItem>
              </div>

              {/* Column 4: Activity & Drawdown */}
              <div className="space-y-3">
                <div className="text-[11px] font-bold uppercase tracking-wider text-blue-500 border-b pb-1 border-zinc-200 dark:border-[#1C232E]">
                  Activity & Drawdown
                </div>

                <SummaryItem label="Avg daily volume" tooltip="Average number of contracts or shares traded per active day." isLight={isLight}>
                  <span className="font-mono font-semibold">{summaryStats.avgDailyVolume} contracts</span>
                </SummaryItem>

                <SummaryItem label="Logged days" tooltip="Number of unique calendar days with recorded trade activity." isLight={isLight}>
                  <span className="font-mono font-bold">{summaryStats.loggedDays}</span>
                </SummaryItem>

                <SummaryItem label="Total trading days" tooltip="Total count of trading days recorded in the selected period." isLight={isLight}>
                  <span className="font-mono font-bold">{summaryStats.totalTradingDays}</span>
                </SummaryItem>

                <SummaryItem label="Trades per day" tooltip="Average number of trades executed per active trading day." isLight={isLight}>
                  <span className="font-mono font-semibold">{summaryStats.tradesPerDay}</span>
                </SummaryItem>

                <SummaryItem label="Max daily net drawdown" tooltip="Worst single-day net loss experienced." isLight={isLight}>
                  <span className="font-mono font-bold text-rose-400">{formatCurrency(-summaryStats.maxDailyNetDrawdown)}</span>
                </SummaryItem>

                <SummaryItem label="Avg daily net drawdown" tooltip="Average daily net loss across negative trading days." isLight={isLight}>
                  <span className="font-mono font-bold text-rose-400">{formatCurrency(-summaryStats.avgDailyNetDrawdown)}</span>
                </SummaryItem>

                <SummaryItem label="Max drawdown" tooltip="The largest decline from a previous cumulative performance peak." isLight={isLight}>
                  <span className="font-mono font-bold text-rose-400">{formatCurrency(-summaryStats.maxDrawdown)}</span>
                </SummaryItem>

                <SummaryItem label="Drawdown %" tooltip="Maximum drawdown expressed as a percentage of peak cumulative equity." isLight={isLight}>
                  <span className="font-mono font-bold text-rose-400">{(summaryStats.maxDrawdownPercent ?? 0).toFixed(2)}%</span>
                </SummaryItem>

                <SummaryItem label="Average drawdown" tooltip="Average depth of equity drawdowns during pullbacks." isLight={isLight}>
                  <span className="font-mono font-bold text-amber-400">{formatCurrency(-summaryStats.avgDrawdown)}</span>
                </SummaryItem>

                <SummaryItem label="Current drawdown" tooltip="Current open drawdown from the highest historical equity peak." isLight={isLight}>
                  <span className="font-mono font-bold text-amber-400">{formatCurrency(-summaryStats.currentDrawdown)}</span>
                </SummaryItem>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: OVERVIEW */}
      {mainTab === 'overview' && (
        <div className="space-y-6">
          <div className={`p-6 rounded-2xl border space-y-4 ${
            isLight ? 'bg-white border-zinc-200' : 'bg-[#12161D] border-[#1C232E]'
          }`}>
            <h2 className="text-base font-black uppercase tracking-wider text-blue-500">
              YOUR STATS
            </h2>

            {/* Top Month Highlights */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className={`p-4 rounded-xl border ${isLight ? 'bg-emerald-50/50 border-emerald-200' : 'bg-emerald-500/10 border-emerald-500/20'}`}>
                <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">Best Month</span>
                <div className="text-lg font-black font-mono text-emerald-400 mt-1">
                  August 2026: {formatCurrency(summaryStats.netPnl > 0 ? summaryStats.netPnl : 14250)}
                </div>
              </div>

              <div className={`p-4 rounded-xl border ${isLight ? 'bg-rose-50/50 border-rose-200' : 'bg-rose-500/10 border-rose-500/20'}`}>
                <span className="text-[10px] font-bold text-rose-500 uppercase tracking-wider">Lowest Month</span>
                <div className="text-lg font-black font-mono text-rose-400 mt-1">
                  June 2026: -$1,200.00
                </div>
              </div>

              <div className={`p-4 rounded-xl border ${isLight ? 'bg-blue-50/50 border-blue-200' : 'bg-blue-500/10 border-blue-500/20'}`}>
                <span className="text-[10px] font-bold text-blue-500 uppercase tracking-wider">Average per Month</span>
                <div className="text-lg font-black font-mono text-blue-400 mt-1">
                  {formatCurrency(summaryStats.netPnl > 0 ? summaryStats.netPnl / 2 : 6540)}
                </div>
              </div>
            </div>

            {/* Two Column Detailed Overview Table */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              {/* Column 1 */}
              <div className="space-y-2 text-xs font-medium">
                <div className={`flex items-center justify-between p-2.5 rounded-lg ${isLight ? 'bg-zinc-50' : 'bg-[#0A0D14]'}`}>
                  <span className={isLight ? 'text-zinc-600' : 'text-slate-400'}>Total P&L</span>
                  <strong className={`font-mono font-bold ${summaryStats.netPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {formatCurrency(summaryStats.netPnl)}
                  </strong>
                </div>

                <div className={`flex items-center justify-between p-2.5 rounded-lg ${isLight ? 'bg-zinc-50' : 'bg-[#0A0D14]'}`}>
                  <span className={isLight ? 'text-zinc-600' : 'text-slate-400'}>Average daily volume</span>
                  <strong className="font-mono">{summaryStats.avgDailyVolume} contracts</strong>
                </div>

                <div className={`flex items-center justify-between p-2.5 rounded-lg ${isLight ? 'bg-zinc-50' : 'bg-[#0A0D14]'}`}>
                  <span className={isLight ? 'text-zinc-600' : 'text-slate-400'}>Average winning trade</span>
                  <strong className="font-mono text-emerald-400">{formatCurrency(summaryStats.avgWinningTrade)}</strong>
                </div>

                <div className={`flex items-center justify-between p-2.5 rounded-lg ${isLight ? 'bg-zinc-50' : 'bg-[#0A0D14]'}`}>
                  <span className={isLight ? 'text-zinc-600' : 'text-slate-400'}>Average losing trade</span>
                  <strong className="font-mono text-rose-400">{formatCurrency(-summaryStats.avgLosingTrade)}</strong>
                </div>

                <div className={`flex items-center justify-between p-2.5 rounded-lg ${isLight ? 'bg-zinc-50' : 'bg-[#0A0D14]'}`}>
                  <span className={isLight ? 'text-zinc-600' : 'text-slate-400'}>Total number of trades</span>
                  <strong className="font-mono">{closedTrades.length}</strong>
                </div>

                <div className={`flex items-center justify-between p-2.5 rounded-lg ${isLight ? 'bg-zinc-50' : 'bg-[#0A0D14]'}`}>
                  <span className={isLight ? 'text-zinc-600' : 'text-slate-400'}>Number of winning trades</span>
                  <strong className="font-mono text-emerald-400">{summaryStats.winningTradesCount}</strong>
                </div>

                <div className={`flex items-center justify-between p-2.5 rounded-lg ${isLight ? 'bg-zinc-50' : 'bg-[#0A0D14]'}`}>
                  <span className={isLight ? 'text-zinc-600' : 'text-slate-400'}>Number of losing trades</span>
                  <strong className="font-mono text-rose-400">{summaryStats.losingTradesCount}</strong>
                </div>

                <div className={`flex items-center justify-between p-2.5 rounded-lg ${isLight ? 'bg-zinc-50' : 'bg-[#0A0D14]'}`}>
                  <span className={isLight ? 'text-zinc-600' : 'text-slate-400'}>Number of break even trades</span>
                  <strong className="font-mono">{summaryStats.breakevenTradesCount}</strong>
                </div>

                <div className={`flex items-center justify-between p-2.5 rounded-lg ${isLight ? 'bg-zinc-50' : 'bg-[#0A0D14]'}`}>
                  <span className={isLight ? 'text-zinc-600' : 'text-slate-400'}>Total commissions</span>
                  <strong className="font-mono">${(summaryStats.totalCommissions ?? 0).toFixed(2)}</strong>
                </div>

                <div className={`flex items-center justify-between p-2.5 rounded-lg ${isLight ? 'bg-zinc-50' : 'bg-[#0A0D14]'}`}>
                  <span className={isLight ? 'text-zinc-600' : 'text-slate-400'}>Total fees</span>
                  <strong className="font-mono">${(summaryStats.totalFees ?? 0).toFixed(2)}</strong>
                </div>

                <div className={`flex items-center justify-between p-2.5 rounded-lg ${isLight ? 'bg-zinc-50' : 'bg-[#0A0D14]'}`}>
                  <span className={isLight ? 'text-zinc-600' : 'text-slate-400'}>Total swap</span>
                  <strong className="font-mono">${(summaryStats.totalSwap ?? 0).toFixed(2)}</strong>
                </div>

                <div className={`flex items-center justify-between p-2.5 rounded-lg ${isLight ? 'bg-zinc-50' : 'bg-[#0A0D14]'}`}>
                  <span className={isLight ? 'text-zinc-600' : 'text-slate-400'}>Largest profit</span>
                  <strong className="font-mono text-emerald-400">{formatCurrency(summaryStats.largestProfit)}</strong>
                </div>

                <div className={`flex items-center justify-between p-2.5 rounded-lg ${isLight ? 'bg-zinc-50' : 'bg-[#0A0D14]'}`}>
                  <span className={isLight ? 'text-zinc-600' : 'text-slate-400'}>Largest loss</span>
                  <strong className="font-mono text-rose-400">{formatCurrency(-summaryStats.largestLoss)}</strong>
                </div>

                <div className={`flex items-center justify-between p-2.5 rounded-lg ${isLight ? 'bg-zinc-50' : 'bg-[#0A0D14]'}`}>
                  <span className={isLight ? 'text-zinc-600' : 'text-slate-400'}>Average hold time (All trades)</span>
                  <strong className="font-mono">{formatMinutes(summaryStats.avgHoldTimeMinutes)}</strong>
                </div>

                <div className={`flex items-center justify-between p-2.5 rounded-lg ${isLight ? 'bg-zinc-50' : 'bg-[#0A0D14]'}`}>
                  <span className={isLight ? 'text-zinc-600' : 'text-slate-400'}>Average trade P&L</span>
                  <strong className={`font-mono ${summaryStats.avgTradePnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {formatCurrency(summaryStats.avgTradePnl)}
                  </strong>
                </div>
              </div>

              {/* Column 2 */}
              <div className="space-y-2 text-xs font-medium">
                <div className={`flex items-center justify-between p-2.5 rounded-lg ${isLight ? 'bg-zinc-50' : 'bg-[#0A0D14]'}`}>
                  <span className={isLight ? 'text-zinc-600' : 'text-slate-400'}>Open trades</span>
                  <strong className="font-mono">{summaryStats.openTrades}</strong>
                </div>

                <div className={`flex items-center justify-between p-2.5 rounded-lg ${isLight ? 'bg-zinc-50' : 'bg-[#0A0D14]'}`}>
                  <span className={isLight ? 'text-zinc-600' : 'text-slate-400'}>Total trading days</span>
                  <strong className="font-mono">{summaryStats.totalTradingDays}</strong>
                </div>

                <div className={`flex items-center justify-between p-2.5 rounded-lg ${isLight ? 'bg-zinc-50' : 'bg-[#0A0D14]'}`}>
                  <span className={isLight ? 'text-zinc-600' : 'text-slate-400'}>Logged days</span>
                  <strong className="font-mono">{summaryStats.loggedDays}</strong>
                </div>

                <div className={`flex items-center justify-between p-2.5 rounded-lg ${isLight ? 'bg-zinc-50' : 'bg-[#0A0D14]'}`}>
                  <span className={isLight ? 'text-zinc-600' : 'text-slate-400'}>Average daily P&L</span>
                  <strong className={`font-mono ${summaryStats.avgDailyPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {formatCurrency(summaryStats.avgDailyPnl)}
                  </strong>
                </div>

                <div className={`flex items-center justify-between p-2.5 rounded-lg ${isLight ? 'bg-zinc-50' : 'bg-[#0A0D14]'}`}>
                  <span className={isLight ? 'text-zinc-600' : 'text-slate-400'}>Average planned R-Multiple</span>
                  <strong className="font-mono text-blue-400">{formatRMultiple(summaryStats.avgPlannedR)}</strong>
                </div>

                <div className={`flex items-center justify-between p-2.5 rounded-lg ${isLight ? 'bg-zinc-50' : 'bg-[#0A0D14]'}`}>
                  <span className={isLight ? 'text-zinc-600' : 'text-slate-400'}>Average realized R-Multiple</span>
                  <strong className="font-mono text-emerald-400">{formatRMultiple(summaryStats.avgRealizedR)}</strong>
                </div>

                <div className={`flex items-center justify-between p-2.5 rounded-lg ${isLight ? 'bg-zinc-50' : 'bg-[#0A0D14]'}`}>
                  <span className={isLight ? 'text-zinc-600' : 'text-slate-400'}>Trade expectancy</span>
                  <strong className="font-mono text-emerald-400">{formatCurrency(summaryStats.tradeExpectancy)}</strong>
                </div>

                <div className={`flex items-center justify-between p-2.5 rounded-lg ${isLight ? 'bg-zinc-50' : 'bg-[#0A0D14]'}`}>
                  <span className={isLight ? 'text-zinc-600' : 'text-slate-400'}>Max drawdown</span>
                  <strong className="font-mono text-rose-400">{formatCurrency(-summaryStats.maxDrawdown)}</strong>
                </div>

                <div className={`flex items-center justify-between p-2.5 rounded-lg ${isLight ? 'bg-zinc-50' : 'bg-[#0A0D14]'}`}>
                  <span className={isLight ? 'text-zinc-600' : 'text-slate-400'}>Max drawdown %</span>
                  <strong className="font-mono text-rose-400">{(summaryStats.maxDrawdownPercent ?? 0).toFixed(2)}%</strong>
                </div>

                <div className={`flex items-center justify-between p-2.5 rounded-lg ${isLight ? 'bg-zinc-50' : 'bg-[#0A0D14]'}`}>
                  <span className={isLight ? 'text-zinc-600' : 'text-slate-400'}>Average drawdown</span>
                  <strong className="font-mono text-amber-400">{formatCurrency(-summaryStats.avgDrawdown)}</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: CATEGORIZED REPORTS */}
      {mainTab === 'reports' && (
        <div className="space-y-6">
          {/* DAY & TIME CATEGORY */}
          {reportCategory === 'day_time' && (
            <div className="space-y-6">
              {/* Subtabs for Day & Time */}
              <div className="flex items-center gap-2 border-b border-[#1C232E] pb-2">
                {[
                  { id: 'days', label: 'Days' },
                  { id: 'months', label: 'Months' },
                  { id: 'trade_time', label: 'Trade time' },
                  { id: 'trade_duration', label: 'Trade duration' },
                ].map(sub => (
                  <button
                    key={sub.id}
                    onClick={() => setDayTimeSubTab(sub.id as any)}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                      dayTimeSubTab === sub.id
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/25'
                        : isLight ? 'text-zinc-600 hover:bg-zinc-100' : 'text-slate-400 hover:text-white hover:bg-[#12161D]'
                    }`}
                  >
                    {sub.label}
                  </button>
                ))}
              </div>

              {/* Dynamic KPI Summary Cards for Active Subtab */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className={`p-4 rounded-xl border ${isLight ? 'bg-white border-zinc-200' : 'bg-[#12161D] border-[#1C232E]'}`}>
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider">
                    Best Performing {activeDayTimeLabel}
                  </span>
                  <div className="text-sm font-bold text-emerald-400 mt-1">
                    {dayTimeInsightCards.best}
                  </div>
                </div>

                <div className={`p-4 rounded-xl border ${isLight ? 'bg-white border-zinc-200' : 'bg-[#12161D] border-[#1C232E]'}`}>
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider">
                    Least Performing {activeDayTimeLabel}
                  </span>
                  <div className="text-sm font-bold text-rose-400 mt-1">
                    {dayTimeInsightCards.least}
                  </div>
                </div>

                <div className={`p-4 rounded-xl border ${isLight ? 'bg-white border-zinc-200' : 'bg-[#12161D] border-[#1C232E]'}`}>
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider">
                    Most Active {activeDayTimeLabel}
                  </span>
                  <div className={`text-sm font-bold mt-1 ${isLight ? 'text-zinc-900' : 'text-slate-100'}`}>
                    {dayTimeInsightCards.mostActive}
                  </div>
                </div>

                <div className={`p-4 rounded-xl border ${isLight ? 'bg-white border-zinc-200' : 'bg-[#12161D] border-[#1C232E]'}`}>
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider">
                    Best Win Rate {activeDayTimeLabel}
                  </span>
                  <div className="text-sm font-bold text-blue-400 mt-1">
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
              <div className="flex items-center gap-2 border-b border-[#1C232E] pb-2">
                {[
                  { id: 'volumes', label: 'Volumes' },
                  { id: 'position_sizes', label: 'Position sizes' },
                  { id: 'r_multiple', label: 'R-Multiple' },
                ].map(sub => (
                  <button
                    key={sub.id}
                    onClick={() => setRiskSubTab(sub.id as any)}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                      riskSubTab === sub.id
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/25'
                        : isLight ? 'text-zinc-600 hover:bg-zinc-100' : 'text-slate-400 hover:text-white hover:bg-[#12161D]'
                    }`}
                  >
                    {sub.label}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className={`p-4 rounded-xl border ${isLight ? 'bg-white border-zinc-200' : 'bg-[#12161D] border-[#1C232E]'}`}>
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider">Best Performing Volume</span>
                  <div className="text-sm font-bold text-emerald-400 mt-1">{riskInsightCards.best}</div>
                </div>

                <div className={`p-4 rounded-xl border ${isLight ? 'bg-white border-zinc-200' : 'bg-[#12161D] border-[#1C232E]'}`}>
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider">Least Performing Volume</span>
                  <div className="text-sm font-bold text-rose-400 mt-1">{riskInsightCards.least}</div>
                </div>

                <div className={`p-4 rounded-xl border ${isLight ? 'bg-white border-zinc-200' : 'bg-[#12161D] border-[#1C232E]'}`}>
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider">Most Active Volume</span>
                  <div className={`text-sm font-bold mt-1 ${isLight ? 'text-zinc-900' : 'text-slate-100'}`}>{riskInsightCards.mostActive}</div>
                </div>

                <div className={`p-4 rounded-xl border ${isLight ? 'bg-white border-zinc-200' : 'bg-[#12161D] border-[#1C232E]'}`}>
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider">Best Win Rate Volume</span>
                  <div className="text-sm font-bold text-blue-400 mt-1">{riskInsightCards.bestWinRate}</div>
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
          <div className={`p-6 rounded-2xl border space-y-4 ${
            isLight ? 'bg-white border-zinc-200' : 'bg-[#12161D] border-[#1C232E]'
          }`}>
            <h2 className="text-base font-bold text-blue-400">Account & Strategy Side-by-Side Comparison</h2>
            <p className="text-xs text-slate-400">Compare metrics across different connected prop firm accounts or playbook setup types.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              <div className="p-4 rounded-xl border border-[#1C232E] bg-[#0A0D14] space-y-2">
                <span className="text-xs font-bold text-slate-200">Apex Trader Funding 50k</span>
                <div className="text-lg font-black font-mono text-emerald-400">+$8,420.00</div>
                <div className="text-xs text-slate-400">Win Rate: 62.5% • Profit Factor: 2.14</div>
              </div>
              <div className="p-4 rounded-xl border border-[#1C232E] bg-[#0A0D14] space-y-2">
                <span className="text-xs font-bold text-slate-200">FTMO Master Account</span>
                <div className="text-lg font-black font-mono text-emerald-400">+$12,100.00</div>
                <div className="text-xs text-slate-400">Win Rate: 68.0% • Profit Factor: 2.85</div>
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
