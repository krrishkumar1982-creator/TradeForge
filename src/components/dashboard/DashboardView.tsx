import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  SlidersHorizontal,
  Upload,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  Layers,
  Clock,
  Calendar,
  BarChart2,
  CalendarDays,
  LayoutGrid
} from 'lucide-react';
import { useTrading } from '../../context/TradingContext';
import { calculateComprehensiveMetrics } from '../../lib/calcEngine';
import { MultiSegmentSemicircleGauge, ProfitFactorDonut } from './SemicircleGauge';
import { RadarScoreCard } from './RadarScoreCard';
import { ProgressTrackerCard } from './ProgressTrackerCard';
import { CumulativePnlChart } from './CumulativePnlChart';
import { DailyPnlBarChart } from './DailyPnlBarChart';
import { AccountBalanceChart } from './AccountBalanceChart';
import { PerformanceCalendar } from './PerformanceCalendar';
import { DrawdownChart } from './DrawdownChart';
import { TradeTimePerformanceChart } from './TradeTimePerformanceChart';
import { DashboardInfoTooltip, METRIC_INFOS } from './DashboardInfoTooltip';
import { safeFormatDate } from '../../utils/dateUtils';
import { Trade } from '../../types';

interface DashboardViewProps {
  onSelectTrade: (trade: Trade) => void;
  onOpenImport: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onSelectTrade, onOpenImport }) => {
  const {
    filteredTrades,
    formatCurrency,
    formatRMultiple,
    setIsAddTradeOpen,
    setActiveView,
    accounts,
    selectedAccountId,
    theme,
  } = useTrading();

  const isLight = theme === 'light';

  const [dashboardMode, setDashboardMode] = useState<'overview' | 'calendar'>('overview');
  const [activeTab, setActiveTab] = useState<'recent' | 'open'>('recent');
  const [isEditWidgetsOpen, setIsEditWidgetsOpen] = useState(false);

  // Widget visibility state
  const [widgets, setWidgets] = useState({
    kpis: true,
    scoreCard: true,
    progressTracker: true,
    cumulativeChart: true,
    dailyBarChart: true,
    positionsTable: true,
    accountBalance: true,
    calendar: true,
    drawdown: true,
    tradeTimePerformance: true,
  });

  const selectedAccount = accounts.find(a => a.id === selectedAccountId);

  // Separate Closed and Open Trades
  const closedTrades = useMemo(() => {
    return filteredTrades.filter(t => t.status === 'CLOSED');
  }, [filteredTrades]);

  const openTrades = useMemo(() => {
    return filteredTrades.filter(t => t.status === 'OPEN');
  }, [filteredTrades]);

  // Real Trade Metrics Calculation using Unified Financial Engine
  const metrics = useMemo(() => {
    const startingCap = selectedAccount?.initialBalance || 50000;
    const m = calculateComprehensiveMetrics(closedTrades, { initialBalance: startingCap });
    const accountGrowthPercent = startingCap > 0 ? (m.netPnl / startingCap) * 100 : 0;

    return {
      totalNetPnl: m.netPnl,
      winTradesCount: m.winningTrades,
      lossTradesCount: m.losingTrades,
      beTradesCount: m.breakevenTrades,
      totalTradesCount: m.closedTrades,
      tradeWinRate: m.winRate !== null ? m.winRate : m.allTradesWinRate,
      grossProfit: m.grossProfit,
      grossLoss: m.grossLoss,
      profitFactor: m.profitFactor !== null && isFinite(m.profitFactor) ? m.profitFactor : (m.grossProfit > 0 ? 99.9 : 0),
      avgWin: m.avgWinningTrade,
      avgLoss: m.avgLosingTrade,
      avgWinLossRatio: m.payoffRatio !== null && isFinite(m.payoffRatio) ? m.payoffRatio : (m.avgWinningTrade > 0 ? m.avgWinningTrade : 0),
      winDays: m.winningDays,
      lossDays: m.losingDays,
      beDays: m.breakevenDays,
      totalDays: m.totalTradingDays,
      dayWinRate: m.dayWinRate !== null ? m.dayWinRate : 0,
      accountGrowthPercent,
    };
  }, [closedTrades, selectedAccount]);

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      {/* Top Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${
              isLight ? 'text-slate-900' : 'text-white'
            }`}>
              Executive Dashboard
            </h1>
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold font-mono tracking-wide bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              LIVE PORTFOLIO
            </span>
          </div>
          <p className={`text-xs mt-1 flex items-center gap-2 ${
            isLight ? 'text-slate-500' : 'text-slate-400'
          }`}>
            <span>Real-time trading performance & execution analytics</span>
            <span className={isLight ? 'text-slate-300' : 'text-slate-700'}>•</span>
            <span className={`font-mono font-medium ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
              {closedTrades.length} closed trades recorded
            </span>
          </p>
        </div>

        {/* Dashboard View Mode Tabs + Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className={`flex items-center gap-1 p-1 rounded-xl border transition ${
            isLight
              ? 'bg-slate-100 border-slate-200'
              : 'bg-[#12161D] border-[#1C232E]'
          }`}>
            <button
              onClick={() => setDashboardMode('overview')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                dashboardMode === 'overview'
                  ? isLight
                    ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                    : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/25'
                  : isLight
                    ? 'text-slate-600 hover:text-slate-900'
                    : 'text-slate-400 hover:text-white'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Overview</span>
            </button>
            <button
              onClick={() => setDashboardMode('calendar')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                dashboardMode === 'calendar'
                  ? isLight
                    ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                    : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/25'
                  : isLight
                    ? 'text-slate-600 hover:text-slate-900'
                    : 'text-slate-400 hover:text-white'
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>Calendar</span>
            </button>
          </div>

          <button
            onClick={() => setIsEditWidgetsOpen(true)}
            className={`flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
              isLight
                ? 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                : 'border-[#1C232E] bg-[#12161D] text-slate-300 hover:text-white hover:border-blue-500/40'
            }`}
          >
            <SlidersHorizontal className={`w-3.5 h-3.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`} />
            <span>Customize</span>
          </button>
          <button
            onClick={onOpenImport}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-3.5 py-1.5 text-xs font-semibold shadow-md shadow-blue-600/25 transition active:scale-[0.98] cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Import Trades</span>
          </button>
        </div>
      </div>

      {/* Mode 1: Trading Calendar & Execution Time Analytics Focused View */}
      {dashboardMode === 'calendar' && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start animate-in fade-in">
          {/* Left: Monthly Trading Calendar with Attached Weekly Summary Cards (8 cols on xl) */}
          {widgets.calendar && (
            <div className="xl:col-span-8">
              <PerformanceCalendar
                trades={closedTrades}
                formatCurrency={formatCurrency}
                formatRMultiple={formatRMultiple}
                onSelectTrade={onSelectTrade}
              />
            </div>
          )}

          {/* Right: Drawdown Curve & Trade Time Performance Scatter Plot (4 cols on xl) */}
          <div className="xl:col-span-4 space-y-5">
            {widgets.drawdown && (
              <DrawdownChart
                trades={closedTrades}
                formatCurrency={formatCurrency}
              />
            )}
            {widgets.tradeTimePerformance && (
              <TradeTimePerformanceChart
                trades={closedTrades}
                formatCurrency={formatCurrency}
                onSelectTrade={onSelectTrade}
              />
            )}
          </div>
        </div>
      )}

      {/* Mode 2: Executive Overview Widgets Suite (Default Visible) */}
      {dashboardMode === 'overview' && (
        <div className="space-y-6 animate-in fade-in">

      {/* Top 5 KPI Cards Row */}
      {widgets.kpis && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {/* 1. Net P&L Card */}
          <div className={`rounded-2xl border p-4 flex flex-col justify-between transition-all duration-200 hover:-translate-y-0.5 ${
            isLight
              ? 'border-slate-200 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-md hover:border-slate-300'
              : 'border-[#1C232E] bg-[#12161D] hover:border-[#2A3444] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] hover:bg-[#151922]'
          }`}>
            <div className="flex items-center justify-between text-xs">
              <span className={`font-medium flex items-center gap-1.5 ${
                isLight ? 'text-slate-600' : 'text-slate-400'
              }`}>
                Net P&L <DashboardInfoTooltip info={METRIC_INFOS.netPnl} />
              </span>
              <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold font-mono tabular-nums ${
                isLight
                  ? 'bg-slate-100 text-slate-600 border border-slate-200'
                  : 'bg-[#1A1F27] text-slate-400 border border-[#1C232E]'
              }`}>
                {metrics.totalTradesCount} trades
              </span>
            </div>
            <div className="flex items-center justify-between my-2.5">
              <div className={`text-2xl font-bold font-mono tabular-nums tracking-tight ${
                metrics.totalNetPnl >= 0
                  ? isLight ? 'text-emerald-600' : 'text-emerald-400'
                  : isLight ? 'text-rose-600' : 'text-rose-400'
              }`}>
                <span className={`font-normal mr-0.5 text-lg ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>$</span>
                {Math.abs(metrics.totalNetPnl).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                isLight
                  ? 'bg-blue-50 border border-blue-200 text-blue-600'
                  : 'bg-blue-500/10 border border-blue-500/20 text-blue-400'
              }`}>
                <BarChart2 className="w-4 h-4" />
              </div>
            </div>
            <div className={`text-[11px] flex items-center justify-between font-mono tabular-nums pt-2 border-t ${
              isLight ? 'text-slate-500 border-slate-100' : 'text-slate-400 border-[#1C232E]'
            }`}>
              <span className="font-sans text-[10px] uppercase font-semibold text-slate-500">Account Growth</span>
              <span className={`font-bold ${
                (metrics.accountGrowthPercent ?? 0) >= 0
                  ? isLight ? 'text-emerald-600' : 'text-emerald-400'
                  : isLight ? 'text-rose-600' : 'text-rose-400'
              }`}>
                {(metrics.accountGrowthPercent ?? 0) >= 0 ? '+' : ''}{(metrics.accountGrowthPercent ?? 0).toFixed(2)}%
              </span>
            </div>
          </div>

          {/* 2. Trade Win % Card */}
          <div className={`rounded-2xl border p-4 flex flex-col justify-between transition-all duration-200 hover:-translate-y-0.5 ${
            isLight
              ? 'border-slate-200 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-md hover:border-slate-300'
              : 'border-[#1C232E] bg-[#12161D] hover:border-[#2A3444] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] hover:bg-[#151922]'
          }`}>
            <div className="flex items-center justify-between text-xs">
              <span className={`font-medium flex items-center gap-1.5 ${
                isLight ? 'text-slate-600' : 'text-slate-400'
              }`}>
                Trade Win % <DashboardInfoTooltip info={METRIC_INFOS.tradeWinRate} />
              </span>
            </div>
            <div className="flex items-center justify-between my-2">
              <div className={`text-2xl font-bold font-mono tabular-nums tracking-tight ${
                isLight ? 'text-slate-900' : 'text-slate-100'
              }`}>
                {(metrics.tradeWinRate ?? 0).toFixed(1)}%
              </div>
              <MultiSegmentSemicircleGauge
                wins={metrics.winTradesCount}
                breakevens={metrics.beTradesCount}
                losses={metrics.lossTradesCount}
                size={68}
                strokeWidth={6}
              />
            </div>
            {/* Pill breakdown underneath gauge */}
            <div className={`flex items-center justify-between text-[11px] font-mono tabular-nums pt-2 border-t ${
              isLight ? 'text-slate-500 border-slate-100' : 'text-slate-400 border-[#1C232E]'
            }`}>
              <span className="text-[10px] uppercase font-semibold text-slate-500">Record</span>
              <div className="flex items-center gap-1.5">
                <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-semibold ${
                  isLight ? 'bg-emerald-50 text-emerald-700' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                }`}>
                  {metrics.winTradesCount}W
                </span>
                {metrics.beTradesCount > 0 && (
                  <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-semibold ${
                    isLight ? 'bg-blue-50 text-blue-700' : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                  }`}>
                    {metrics.beTradesCount}BE
                  </span>
                )}
                <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-semibold ${
                  isLight ? 'bg-rose-50 text-rose-700' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                }`}>
                  {metrics.lossTradesCount}L
                </span>
              </div>
            </div>
          </div>

          {/* 3. Profit Factor Card */}
          <div className={`rounded-2xl border p-4 flex flex-col justify-between transition-all duration-200 hover:-translate-y-0.5 ${
            isLight
              ? 'border-slate-200 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-md hover:border-slate-300'
              : 'border-[#1C232E] bg-[#12161D] hover:border-[#2A3444] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] hover:bg-[#151922]'
          }`}>
            <div className="flex items-center justify-between text-xs">
              <span className={`font-medium flex items-center gap-1.5 ${
                isLight ? 'text-slate-600' : 'text-slate-400'
              }`}>
                Profit Factor <DashboardInfoTooltip info={METRIC_INFOS.profitFactor} />
              </span>
            </div>
            <div className="flex items-center justify-between my-2">
              <div className={`text-2xl font-bold font-mono tabular-nums tracking-tight ${
                isLight ? 'text-slate-900' : 'text-slate-100'
              }`}>
                {(metrics.profitFactor ?? 0).toFixed(2)}
              </div>
              <ProfitFactorDonut
                grossProfit={metrics.grossProfit}
                grossLoss={metrics.grossLoss}
                profitFactor={metrics.profitFactor}
                size={52}
                strokeWidth={5.5}
              />
            </div>
            {/* Gross profit and loss breakdown */}
            <div className={`text-[11px] flex items-center justify-between font-mono tabular-nums pt-2 border-t ${
              isLight ? 'text-slate-500 border-slate-100' : 'text-slate-400 border-[#1C232E]'
            }`}>
              <span>
                W: <strong className={isLight ? 'text-emerald-600 font-bold' : 'text-emerald-400 font-bold'}>
                  ${Math.round(metrics.grossProfit).toLocaleString()}
                </strong>
              </span>
              <span>
                L: <strong className={isLight ? 'text-rose-600 font-bold' : 'text-rose-400 font-bold'}>
                  -${Math.round(metrics.grossLoss).toLocaleString()}
                </strong>
              </span>
            </div>
          </div>

          {/* 4. Day Win % Card */}
          <div className={`rounded-2xl border p-4 flex flex-col justify-between transition-all duration-200 hover:-translate-y-0.5 ${
            isLight
              ? 'border-slate-200 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-md hover:border-slate-300'
              : 'border-[#1C232E] bg-[#12161D] hover:border-[#2A3444] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] hover:bg-[#151922]'
          }`}>
            <div className="flex items-center justify-between text-xs">
              <span className={`font-medium flex items-center gap-1.5 ${
                isLight ? 'text-slate-600' : 'text-slate-400'
              }`}>
                Day Win % <DashboardInfoTooltip info={METRIC_INFOS.dayWinRate} />
              </span>
            </div>
            <div className="flex items-center justify-between my-2">
              <div className={`text-2xl font-bold font-mono tabular-nums tracking-tight ${
                isLight ? 'text-slate-900' : 'text-slate-100'
              }`}>
                {(metrics.dayWinRate ?? 0).toFixed(1)}%
              </div>
              <MultiSegmentSemicircleGauge
                wins={metrics.winDays}
                breakevens={metrics.beDays}
                losses={metrics.lossDays}
                size={68}
                strokeWidth={6}
              />
            </div>
            {/* Day counts pill breakdown */}
            <div className={`flex items-center justify-between text-[11px] font-mono tabular-nums pt-2 border-t ${
              isLight ? 'text-slate-500 border-slate-100' : 'text-slate-400 border-[#1C232E]'
            }`}>
              <span className="text-[10px] uppercase font-semibold text-slate-500">Days</span>
              <div className="flex items-center gap-1.5">
                <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-semibold ${
                  isLight ? 'bg-emerald-50 text-emerald-700' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                }`}>
                  {metrics.winDays} Green
                </span>
                <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-semibold ${
                  isLight ? 'bg-rose-50 text-rose-700' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                }`}>
                  {metrics.lossDays} Red
                </span>
              </div>
            </div>
          </div>

          {/* 5. Avg Win / Loss Trade Card */}
          <div className={`rounded-2xl border p-4 flex flex-col justify-between transition-all duration-200 hover:-translate-y-0.5 ${
            isLight
              ? 'border-slate-200 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-md hover:border-slate-300'
              : 'border-[#1C232E] bg-[#12161D] hover:border-[#2A3444] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] hover:bg-[#151922]'
          }`}>
            <div className="flex items-center justify-between text-xs">
              <span className={`font-medium flex items-center gap-1.5 ${
                isLight ? 'text-slate-600' : 'text-slate-400'
              }`}>
                Avg Win/Loss <DashboardInfoTooltip info={METRIC_INFOS.avgWinLoss} />
              </span>
            </div>
            <div className="flex items-center justify-between my-2">
              <div className={`text-2xl font-bold font-mono tabular-nums tracking-tight ${
                isLight ? 'text-slate-900' : 'text-slate-100'
              }`}>
                {(metrics.avgWinLossRatio ?? 0).toFixed(2)}
              </div>
              {/* Dual horizontal ratio bar */}
              <div className="w-20 flex flex-col gap-1">
                <div className={`h-2 w-full rounded-full overflow-hidden flex ${
                  isLight ? 'bg-slate-200' : 'bg-[#1A1F27]'
                }`}>
                  <div
                    className={`${isLight ? 'bg-emerald-500' : 'bg-emerald-400'} h-full transition-all`}
                    style={{ width: `${(metrics.avgWin / (metrics.avgWin + metrics.avgLoss || 1)) * 100}%` }}
                  />
                  <div
                    className={`${isLight ? 'bg-rose-500' : 'bg-rose-400'} h-full transition-all`}
                    style={{ width: `${(metrics.avgLoss / (metrics.avgWin + metrics.avgLoss || 1)) * 100}%` }}
                  />
                </div>
              </div>
            </div>
            <div className={`text-[11px] flex items-center justify-between font-mono tabular-nums pt-2 border-t ${
              isLight ? 'text-slate-500 border-slate-100' : 'text-slate-400 border-[#1C232E]'
            }`}>
              <span className={isLight ? 'text-emerald-600 font-bold' : 'text-emerald-400 font-bold'}>
                +${Math.round(metrics.avgWin).toLocaleString()}
              </span>
              <span className={isLight ? 'text-rose-600 font-bold' : 'text-rose-400 font-bold'}>
                -${Math.round(metrics.avgLoss).toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Middle Row (3 Columns: TradeForge Score, Progress Tracker, Cumulative P&L) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Card 1: TradeForge Radar Score */}
        {widgets.scoreCard && (
          <div className={`rounded-2xl border p-4 flex flex-col justify-between transition ${
            isLight
              ? 'border-slate-200 bg-white shadow-xs'
              : 'border-[#1C232E] bg-[#12161D]'
          }`}>
            <div className={`flex items-center justify-between pb-3 border-b ${
              isLight ? 'border-slate-100' : 'border-[#1C232E]'
            }`}>
              <span className={`text-xs font-semibold flex items-center gap-2 ${
                isLight ? 'text-slate-900' : 'text-slate-100'
              }`}>
                TradeForge Score <DashboardInfoTooltip info={METRIC_INFOS.tradeForgeScore || METRIC_INFOS.duskFlowScore} />
              </span>
            </div>
            <RadarScoreCard trades={closedTrades} />
          </div>
        )}

        {/* Card 2: Progress Tracker Activity Heatmap */}
        {widgets.progressTracker && (
          <div className={`rounded-2xl border p-4 flex flex-col justify-between transition ${
            isLight
              ? 'border-slate-200 bg-white shadow-xs'
              : 'border-[#1C232E] bg-[#12161D]'
          }`}>
            <div className={`flex items-center justify-between pb-3 border-b ${
              isLight ? 'border-slate-100' : 'border-[#1C232E]'
            }`}>
              <span className={`text-xs font-semibold flex items-center gap-2 ${
                isLight ? 'text-slate-900' : 'text-slate-100'
              }`}>
                Progress Tracker <DashboardInfoTooltip info={METRIC_INFOS.progressTracker} />
              </span>
              <button
                onClick={() => setDashboardMode('calendar')}
                className={`text-[11px] font-semibold transition cursor-pointer ${
                  isLight ? 'text-blue-600 hover:text-blue-700' : 'text-blue-400 hover:text-blue-300'
                }`}
              >
                View Full Calendar →
              </button>
            </div>
            <ProgressTrackerCard trades={closedTrades} formatCurrency={formatCurrency} onSelectTrade={onSelectTrade} />
          </div>
        )}

        {/* Card 3: Daily Net Cumulative P&L */}
        {widgets.cumulativeChart && (
          <div className={`rounded-2xl border p-4 flex flex-col justify-between transition ${
            isLight
              ? 'border-slate-200 bg-white shadow-xs'
              : 'border-[#1C232E] bg-[#12161D]'
          }`}>
            <div className={`flex items-center justify-between pb-3 border-b ${
              isLight ? 'border-slate-100' : 'border-[#1C232E]'
            }`}>
              <span className={`text-xs font-semibold flex items-center gap-2 ${
                isLight ? 'text-slate-900' : 'text-slate-100'
              }`}>
                Daily Cumulative Equity <DashboardInfoTooltip info={METRIC_INFOS.cumulativePnl} />
              </span>
              <span className={`text-xs font-mono font-bold ${
                metrics.totalNetPnl >= 0
                  ? isLight ? 'text-emerald-600' : 'text-emerald-400'
                  : isLight ? 'text-rose-600' : 'text-rose-400'
              }`}>
                {formatCurrency(metrics.totalNetPnl)}
              </span>
            </div>
            <CumulativePnlChart trades={closedTrades} formatCurrency={formatCurrency} />
          </div>
        )}
      </div>

      {/* Bottom Row (3 Columns: Net Daily P&L, Recent Trades/Open Positions, Account Balance) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* 1. Net Daily P&L */}
        {widgets.dailyBarChart && (
          <div className={`rounded-2xl border p-4 flex flex-col justify-between transition min-w-0 overflow-hidden ${
            isLight
              ? 'border-slate-200 bg-white shadow-xs'
              : 'border-[#1C232E] bg-[#12161D]'
          }`}>
            <div className={`flex items-center justify-between pb-3 border-b ${
              isLight ? 'border-slate-100' : 'border-[#1C232E]'
            }`}>
              <span className={`text-xs font-semibold flex items-center gap-2 ${
                isLight ? 'text-slate-900' : 'text-slate-100'
              }`}>
                Net Daily P&L Distribution <DashboardInfoTooltip info={METRIC_INFOS.netDailyPnl} />
              </span>
            </div>
            <DailyPnlBarChart trades={closedTrades} formatCurrency={formatCurrency} />
          </div>
        )}

        {/* 2. Recent Trades / Open Positions Tabs */}
        {widgets.positionsTable && (
          <div className={`rounded-2xl border p-4 flex flex-col justify-between transition min-w-0 overflow-hidden ${
            isLight
              ? 'border-slate-200 bg-white shadow-xs'
              : 'border-[#1C232E] bg-[#12161D]'
          }`}>
            <div>
              {/* Tab Selector */}
              <div className={`flex items-center gap-4 border-b pb-3 mb-3 ${
                isLight ? 'border-slate-100' : 'border-[#1C232E]'
              }`}>
                <button
                  onClick={() => setActiveTab('recent')}
                  className={`text-xs font-semibold pb-0.5 transition relative cursor-pointer ${
                    activeTab === 'recent'
                      ? isLight ? 'text-blue-600' : 'text-blue-400'
                      : isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Recent Executions
                  {activeTab === 'recent' && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full -mb-3 bg-gradient-to-r from-blue-600 to-indigo-600" />
                  )}
                </button>
                <button
                  onClick={() => setActiveTab('open')}
                  className={`text-xs font-semibold pb-0.5 transition relative cursor-pointer ${
                    activeTab === 'open'
                      ? isLight ? 'text-blue-600' : 'text-blue-400'
                      : isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Open Positions ({openTrades.length})
                  {activeTab === 'open' && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full -mb-3 bg-gradient-to-r from-blue-600 to-indigo-600" />
                  )}
                </button>
              </div>

              {/* Table Header */}
              <div className={`grid grid-cols-3 text-[10px] font-bold uppercase tracking-wider px-3 py-2 rounded-xl ${
                isLight ? 'bg-slate-100 text-slate-600' : 'bg-[#1A1F27] text-slate-400 border border-[#1C232E]'
              }`}>
                <span>Close Date</span>
                <span>Symbol / Side</span>
                <span className="text-right">Net P&L</span>
              </div>

              {/* Table Rows */}
              <div className="space-y-1 mt-2 max-h-[190px] overflow-y-auto custom-scrollbar">
                {(activeTab === 'recent' ? closedTrades.slice(0, 5) : openTrades).map(trade => (
                  <div
                    key={trade.id}
                    onClick={() => onSelectTrade(trade)}
                    className={`grid grid-cols-3 items-center px-3 py-2 rounded-xl border cursor-pointer transition text-xs ${
                      isLight
                        ? 'bg-slate-50 border-slate-200 hover:border-slate-300 text-slate-900'
                        : 'bg-[#0A0D14] border-[#1C232E] hover:border-blue-500/40 text-slate-200'
                    }`}
                  >
                    <span className={`font-mono text-[11px] ${
                      isLight ? 'text-slate-600' : 'text-slate-400'
                    }`}>
                      {safeFormatDate(trade.exitDate || trade.entryDate, 'Open', { month: '2-digit', day: '2-digit', year: 'numeric' })}
                    </span>
                    <span className={`font-semibold flex items-center gap-1.5 ${
                      isLight ? 'text-slate-900' : 'text-slate-100'
                    }`}>
                      {trade.symbol}
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-mono font-bold ${
                        trade.direction === 'BUY'
                          ? isLight ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : isLight ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}>
                        {trade.direction}
                      </span>
                    </span>
                    <span className={`text-right font-mono font-bold ${
                      trade.netPnl >= 0
                        ? isLight ? 'text-emerald-600' : 'text-emerald-400'
                        : isLight ? 'text-rose-600' : 'text-rose-400'
                    }`}>
                      {formatCurrency(trade.netPnl)}
                    </span>
                  </div>
                ))}

                {(activeTab === 'recent' ? closedTrades : openTrades).length === 0 && (
                  <div className={`text-center py-8 text-xs ${
                    isLight ? 'text-slate-400' : 'text-slate-500'
                  }`}>
                    {activeTab === 'recent' ? 'No closed trades recorded' : 'No open positions running'}
                  </div>
                )}
              </div>
            </div>

            {/* Quick Footer Action */}
            <div className={`pt-3 border-t mt-3 flex items-center justify-between text-xs ${
              isLight ? 'border-slate-100' : 'border-[#1C232E]'
            }`}>
              <button
                onClick={() => setIsAddTradeOpen(true)}
                className={`font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                  isLight ? 'text-blue-600 hover:text-blue-700' : 'text-blue-400 hover:text-blue-300'
                }`}
              >
                <Plus className="w-3.5 h-3.5" /> Log new trade
              </button>
              <button
                onClick={() => setActiveView('trades')}
                className={`transition font-medium cursor-pointer ${
                  isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-white'
                }`}
              >
                View all trades →
              </button>
            </div>
          </div>
        )}

        {/* 3. Account Balance / Equity Curve */}
        {widgets.accountBalance && (
          <div className={`rounded-2xl border p-4 flex flex-col justify-between transition min-w-0 overflow-hidden ${
            isLight
              ? 'border-slate-200 bg-white shadow-xs'
              : 'border-[#1C232E] bg-[#12161D]'
          }`}>
            <div className={`flex items-center justify-between pb-3 border-b ${
              isLight ? 'border-slate-100' : 'border-[#1C232E]'
            }`}>
              <span className={`text-xs font-semibold flex items-center gap-2 ${
                isLight ? 'text-slate-900' : 'text-slate-100'
              }`}>
                Portfolio Balance Curve <DashboardInfoTooltip info={METRIC_INFOS.accountBalance} />
              </span>
            </div>
            <AccountBalanceChart
              trades={closedTrades}
              account={selectedAccount}
              formatCurrency={formatCurrency}
            />
          </div>
        )}
      </div>

      {/* Additive Feature Section: Performance Calendar & Trade Time Analytics */}
      {(widgets.calendar || widgets.drawdown || widgets.tradeTimePerformance) && (
        <div className={`pt-5 border-t ${isLight ? 'border-slate-200' : 'border-[#1C232E]'}`}>
          <div className="flex items-center justify-between pb-4">
            <div className="flex items-center gap-2.5">
              <CalendarDays className="w-4 h-4 text-blue-400" />
              <h2 className={`text-sm font-semibold ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
                Monthly Performance & Execution Analytics
              </h2>
            </div>
            <button
              onClick={() => setDashboardMode('calendar')}
              className={`text-xs font-semibold transition cursor-pointer ${
                isLight ? 'text-blue-600 hover:text-blue-700' : 'text-blue-400 hover:text-blue-300'
              }`}
            >
              Expand to full calendar view →
            </button>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
            {/* Left: Monthly Trading Calendar (8 cols on xl) */}
            {widgets.calendar && (
              <div className="xl:col-span-8">
                <PerformanceCalendar
                  trades={closedTrades}
                  formatCurrency={formatCurrency}
                  formatRMultiple={formatRMultiple}
                  onSelectTrade={onSelectTrade}
                />
              </div>
            )}

            {/* Right: Drawdown Curve & Trade Time Performance (4 cols on xl) */}
            <div className="xl:col-span-4 space-y-5">
              {widgets.drawdown && (
                <DrawdownChart
                  trades={closedTrades}
                  formatCurrency={formatCurrency}
                />
              )}
              {widgets.tradeTimePerformance && (
                <TradeTimePerformanceChart
                  trades={closedTrades}
                  formatCurrency={formatCurrency}
                  onSelectTrade={onSelectTrade}
                />
              )}
            </div>
          </div>
        </div>
      )}
      </div>
      )}

      {/* Customize Dashboard Widgets Modal */}
      {isEditWidgetsOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in"
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsEditWidgetsOpen(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            className={`w-full max-w-md rounded-2xl border p-5 shadow-2xl space-y-4 ${
              isLight
                ? 'bg-white border-slate-200 text-slate-900 shadow-xl'
                : 'bg-[#12161D] border-[#1C232E] text-slate-100 shadow-2xl shadow-black/80'
            }`}
          >
            <div className={`flex items-center justify-between pb-3 border-b ${
              isLight ? 'border-slate-100' : 'border-[#1C232E]'
            }`}>
              <h3 className={`text-sm font-semibold flex items-center gap-2 ${
                isLight ? 'text-slate-900' : 'text-slate-100'
              }`}>
                <SlidersHorizontal className={`w-4 h-4 ${isLight ? 'text-blue-600' : 'text-blue-400'}`} />
                Customize Dashboard Widgets
              </h3>
              <button
                onClick={() => setIsEditWidgetsOpen(false)}
                className={`text-xs transition cursor-pointer ${
                  isLight ? 'text-slate-500 hover:text-slate-900' : 'text-slate-400 hover:text-white'
                }`}
              >
                Close
              </button>
            </div>

            <div className="space-y-2 max-h-[380px] overflow-y-auto custom-scrollbar pr-1">
              {[
                { key: 'calendar', label: 'Trading Calendar (Monthly Net P&L & Weekly Summaries)' },
                { key: 'drawdown', label: 'Drawdown Underwater Curve' },
                { key: 'tradeTimePerformance', label: 'Trade Time Performance Scatter Plot' },
                { key: 'kpis', label: 'Top KPI Cards (Net P&L, Win %, PF, Day Win %, Avg Win/Loss)' },
                { key: 'scoreCard', label: 'TradeForge Score Radar Card' },
                { key: 'progressTracker', label: 'Progress Tracker & Activity Heatmap' },
                { key: 'cumulativeChart', label: 'Daily Net Cumulative Equity Curve' },
                { key: 'dailyBarChart', label: 'Net Daily P&L Distribution Bar Chart' },
                { key: 'positionsTable', label: 'Recent Trades & Open Positions Widget' },
                { key: 'accountBalance', label: 'Account Balance & Equity Curve' },
              ].map(item => (
                <label
                  key={item.key}
                  className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer select-none transition ${
                    isLight
                      ? 'bg-slate-50 border-slate-200 hover:border-slate-300'
                      : 'bg-[#0A0D14] border-[#1C232E] hover:border-blue-500/40'
                  }`}
                >
                  <span className={`text-xs font-medium ${
                    isLight ? 'text-slate-900' : 'text-slate-100'
                  }`}>
                    {item.label}
                  </span>
                  <input
                    type="checkbox"
                    checked={(widgets as any)[item.key]}
                    onChange={e =>
                      setWidgets(prev => ({ ...prev, [item.key]: e.target.checked }))
                    }
                    className={`rounded text-blue-600 focus:ring-blue-500 h-4 w-4 ${
                      isLight ? 'border-slate-300 bg-white' : 'border-[#1C232E] bg-[#1A1F27]'
                    }`}
                  />
                </label>
              ))}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setIsEditWidgetsOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white transition active:scale-[0.98] shadow-md shadow-blue-600/25 cursor-pointer"
              >
                Save Layout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
