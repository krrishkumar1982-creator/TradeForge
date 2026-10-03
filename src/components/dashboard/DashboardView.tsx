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
              Trading Overview
            </h1>
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold font-mono tracking-wide bg-blue-500/10 text-blue-400 border border-blue-500/20">
              PORTFOLIO
            </span>
          </div>
          <p className={`text-xs mt-1 flex items-center gap-2 ${
            isLight ? 'text-[#71717A]' : 'text-[#A1A1AA]'
          }`}>
            <span>Review the session. Stay with the plan.</span>
            <span className={isLight ? 'text-[#D4D4D8]' : 'text-slate-700'}>•</span>
            <span className={`font-mono font-medium ${isLight ? 'text-slate-800' : 'text-[#F5F5F5]'}`}>
              {closedTrades.length} trades recorded
            </span>
          </p>
        </div>

        {/* Dashboard View Mode Tabs + Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className={`flex items-center gap-1 p-1 rounded-xl border transition ${
            isLight
              ? 'bg-slate-100 border-slate-200'
              : 'bg-[#06080B] border-[rgba(255,255,255,0.055)]'
          }`}>
            <button
              onClick={() => setDashboardMode('overview')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                dashboardMode === 'overview'
                  ? isLight
                    ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                    : 'bg-[linear-gradient(90deg,rgba(59,130,246,0.16),rgba(124,58,237,0.18))] text-[#F4F5F7] border border-[rgba(99,102,241,0.35)] shadow-xs'
                  : isLight
                    ? 'text-slate-600 hover:text-slate-900'
                    : 'text-[#8A919D] hover:text-[#F4F5F7]'
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
                    : 'bg-[linear-gradient(90deg,rgba(59,130,246,0.16),rgba(124,58,237,0.18))] text-[#F4F5F7] border border-[rgba(99,102,241,0.35)] shadow-xs'
                  : isLight
                    ? 'text-slate-600 hover:text-slate-900'
                    : 'text-[#8A919D] hover:text-[#F4F5F7]'
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
                : 'border-[rgba(255,255,255,0.07)] bg-[#11151A] text-[#C2C7D0] hover:text-[#F4F5F7] hover:bg-[#151A20]'
            }`}
          >
            <SlidersHorizontal className={`w-3.5 h-3.5 ${isLight ? 'text-[#71717A]' : 'text-[#8A919D]'}`} />
            <span>Customize</span>
          </button>
          <button
            onClick={onOpenImport}
            className="flex items-center gap-2 rounded-xl bg-[linear-gradient(135deg,#2563EB,#7C3AED)] hover:opacity-95 text-white px-3.5 py-1.5 text-xs font-semibold shadow-xs border border-blue-400/30 transition active:scale-[0.98] cursor-pointer"
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
              : 'border-[rgba(255,255,255,0.055)] bg-[#0D1014] hover:border-[rgba(255,255,255,0.09)] shadow-[0_4px_20px_rgba(0,0,0,0.25)] hover:bg-[#151A20]'
          }`}>
            <div className="flex items-center justify-between text-xs">
              <span className={`font-medium flex items-center gap-1.5 ${
                isLight ? 'text-slate-600' : 'text-[#A7ADB7]'
              }`}>
                Net P&L <DashboardInfoTooltip info={METRIC_INFOS.netPnl} />
              </span>
              <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold font-mono tabular-nums ${
                isLight
                  ? 'bg-slate-100 text-slate-600 border border-slate-200'
                  : 'bg-[#11151A] text-[#C2C7D0] border border-[rgba(255,255,255,0.07)]'
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
                <span className={`font-normal mr-0.5 text-lg ${isLight ? 'text-[#A1A1AA]' : 'text-[#8A919D]'}`}>$</span>
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
              isLight ? 'text-[#71717A] border-slate-100' : 'text-[#8A919D] border-[rgba(255,255,255,0.055)]'
            }`}>
              <span className="font-sans text-[10px] uppercase font-semibold text-[#8A919D]">Growth</span>
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
              : 'border-[rgba(255,255,255,0.055)] bg-[#0D1014] hover:border-[rgba(255,255,255,0.09)] shadow-[0_4px_20px_rgba(0,0,0,0.25)] hover:bg-[#151A20]'
          }`}>
            <div className="flex items-center justify-between text-xs">
              <span className={`font-medium flex items-center gap-1.5 ${
                isLight ? 'text-slate-600' : 'text-[#A7ADB7]'
              }`}>
                Trade Win % <DashboardInfoTooltip info={METRIC_INFOS.tradeWinRate} />
              </span>
            </div>
            <div className="flex items-center justify-between my-2">
              <div className={`text-2xl font-bold font-mono tabular-nums tracking-tight ${
                isLight ? 'text-slate-900' : 'text-[#F4F5F7]'
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
              isLight ? 'text-[#71717A] border-slate-100' : 'text-[#8A919D] border-[rgba(255,255,255,0.055)]'
            }`}>
              <span className="text-[10px] uppercase font-semibold text-[#8A919D]">Record</span>
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
              : 'border-[rgba(255,255,255,0.055)] bg-[#0D1014] hover:border-[rgba(255,255,255,0.09)] shadow-[0_4px_20px_rgba(0,0,0,0.25)] hover:bg-[#151A20]'
          }`}>
            <div className="flex items-center justify-between text-xs">
              <span className={`font-medium flex items-center gap-1.5 ${
                isLight ? 'text-slate-600' : 'text-[#A7ADB7]'
              }`}>
                Profit Factor <DashboardInfoTooltip info={METRIC_INFOS.profitFactor} />
              </span>
            </div>
            <div className="flex items-center justify-between my-2">
              <div className={`text-2xl font-bold font-mono tabular-nums tracking-tight ${
                isLight ? 'text-slate-900' : 'text-[#F4F5F7]'
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
              isLight ? 'text-[#71717A] border-slate-100' : 'text-[#8A919D] border-[rgba(255,255,255,0.055)]'
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
              : 'border-[rgba(255,255,255,0.055)] bg-[#0D1014] hover:border-[rgba(255,255,255,0.09)] shadow-[0_4px_20px_rgba(0,0,0,0.25)] hover:bg-[#151A20]'
          }`}>
            <div className="flex items-center justify-between text-xs">
              <span className={`font-medium flex items-center gap-1.5 ${
                isLight ? 'text-slate-600' : 'text-[#A7ADB7]'
              }`}>
                Day Win % <DashboardInfoTooltip info={METRIC_INFOS.dayWinRate} />
              </span>
            </div>
            <div className="flex items-center justify-between my-2">
              <div className={`text-2xl font-bold font-mono tabular-nums tracking-tight ${
                isLight ? 'text-slate-900' : 'text-[#F4F5F7]'
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
              isLight ? 'text-[#71717A] border-slate-100' : 'text-[#8A919D] border-[rgba(255,255,255,0.055)]'
            }`}>
              <span className="text-[10px] uppercase font-semibold text-[#8A919D]">Days</span>
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
              : 'border-[rgba(255,255,255,0.055)] bg-[#0D1014] hover:border-[rgba(255,255,255,0.09)] shadow-[0_4px_20px_rgba(0,0,0,0.25)] hover:bg-[#151A20]'
          }`}>
            <div className="flex items-center justify-between text-xs">
              <span className={`font-medium flex items-center gap-1.5 ${
                isLight ? 'text-slate-600' : 'text-[#A7ADB7]'
              }`}>
                Avg Win/Loss <DashboardInfoTooltip info={METRIC_INFOS.avgWinLoss} />
              </span>
            </div>
            <div className="flex items-center justify-between my-2">
              <div className={`text-2xl font-bold font-mono tabular-nums tracking-tight ${
                isLight ? 'text-slate-900' : 'text-[#F4F5F7]'
              }`}>
                {(metrics.avgWinLossRatio ?? 0).toFixed(2)}
              </div>
              {/* Dual horizontal ratio bar */}
              <div className="w-20 flex flex-col gap-1">
                <div className={`h-2 w-full rounded-full overflow-hidden flex ${
                  isLight ? 'bg-slate-200' : 'bg-[#11151A]'
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
              isLight ? 'text-[#71717A] border-slate-100' : 'text-[#8A919D] border-[rgba(255,255,255,0.055)]'
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

      {/* Middle Row (3 Columns: Performance Profile, Trading Activity, Equity Curve) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Card 1: Performance Profile */}
        {widgets.scoreCard && (
          <div className={`rounded-2xl border p-4 flex flex-col justify-between transition ${
            isLight
              ? 'border-slate-200 bg-white shadow-xs'
              : 'border-[rgba(255,255,255,0.055)] bg-[#0D1014] shadow-[0_4px_20px_rgba(0,0,0,0.25)]'
          }`}>
            <div className={`flex items-center justify-between pb-3 border-b ${
              isLight ? 'border-slate-100' : 'border-[rgba(255,255,255,0.055)]'
            }`}>
              <span className={`text-xs font-semibold flex items-center gap-2 ${
                isLight ? 'text-slate-900' : 'text-[#F4F5F7]'
              }`}>
                Performance Profile <DashboardInfoTooltip info={METRIC_INFOS.tradeForgeScore || METRIC_INFOS.duskFlowScore} />
              </span>
            </div>
            <RadarScoreCard trades={closedTrades} />
          </div>
        )}

        {/* Card 2: Trading Activity */}
        {widgets.progressTracker && (
          <div className={`rounded-2xl border p-4 flex flex-col justify-between transition ${
            isLight
              ? 'border-slate-200 bg-white shadow-xs'
              : 'border-[rgba(255,255,255,0.055)] bg-[#0D1014] shadow-[0_4px_20px_rgba(0,0,0,0.25)]'
          }`}>
            <div className={`flex items-center justify-between pb-3 border-b ${
              isLight ? 'border-slate-100' : 'border-[rgba(255,255,255,0.055)]'
            }`}>
              <span className={`text-xs font-semibold flex items-center gap-2 ${
                isLight ? 'text-slate-900' : 'text-[#F4F5F7]'
              }`}>
                Trading Activity <DashboardInfoTooltip info={METRIC_INFOS.progressTracker} />
              </span>
              <button
                onClick={() => setDashboardMode('calendar')}
                className={`text-[11px] font-semibold transition cursor-pointer ${
                  isLight ? 'text-blue-600 hover:text-blue-700' : 'text-blue-400 hover:text-blue-300'
                }`}
              >
                Calendar →
              </button>
            </div>
            <ProgressTrackerCard trades={closedTrades} formatCurrency={formatCurrency} onSelectTrade={onSelectTrade} />
          </div>
        )}

        {/* Card 3: Equity Curve */}
        {widgets.cumulativeChart && (
          <div className={`rounded-2xl border p-4 flex flex-col justify-between transition ${
            isLight
              ? 'border-slate-200 bg-white shadow-xs'
              : 'border-[rgba(255,255,255,0.055)] bg-[#0D1014] shadow-[0_4px_20px_rgba(0,0,0,0.25)]'
          }`}>
            <div className={`flex items-center justify-between pb-3 border-b ${
              isLight ? 'border-slate-100' : 'border-[rgba(255,255,255,0.055)]'
            }`}>
              <span className={`text-xs font-semibold flex items-center gap-2 ${
                isLight ? 'text-slate-900' : 'text-[#F4F5F7]'
              }`}>
                Equity Curve <DashboardInfoTooltip info={METRIC_INFOS.cumulativePnl} />
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

      {/* Bottom Row (3 Columns: Daily P&L, Recent Trades/Open Trades, Balance Curve) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* 1. Daily P&L */}
        {widgets.dailyBarChart && (
          <div className={`rounded-2xl border p-4 flex flex-col justify-between transition min-w-0 overflow-hidden ${
            isLight
              ? 'border-slate-200 bg-white shadow-xs'
              : 'border-[rgba(255,255,255,0.055)] bg-[#0D1014] shadow-[0_4px_20px_rgba(0,0,0,0.25)]'
          }`}>
            <div className={`flex items-center justify-between pb-3 border-b ${
              isLight ? 'border-slate-100' : 'border-[rgba(255,255,255,0.055)]'
            }`}>
              <span className={`text-xs font-semibold flex items-center gap-2 ${
                isLight ? 'text-slate-900' : 'text-[#F4F5F7]'
              }`}>
                Daily P&L <DashboardInfoTooltip info={METRIC_INFOS.netDailyPnl} />
              </span>
            </div>
            <DailyPnlBarChart trades={closedTrades} formatCurrency={formatCurrency} />
          </div>
        )}

        {/* 2. Recent Trades / Open Trades Tabs */}
        {widgets.positionsTable && (
          <div className={`rounded-2xl border p-4 flex flex-col justify-between transition min-w-0 overflow-hidden ${
            isLight
              ? 'border-slate-200 bg-white shadow-xs'
              : 'border-[rgba(255,255,255,0.055)] bg-[#0D1014] shadow-[0_4px_20px_rgba(0,0,0,0.25)]'
          }`}>
            <div>
              {/* Tab Selector */}
              <div className={`flex items-center gap-4 border-b pb-3 mb-3 ${
                isLight ? 'border-slate-100' : 'border-[rgba(255,255,255,0.055)]'
              }`}>
                <button
                  onClick={() => setActiveTab('recent')}
                  className={`text-xs font-semibold pb-0.5 transition relative cursor-pointer ${
                    activeTab === 'recent'
                      ? isLight ? 'text-blue-600' : 'text-blue-400'
                      : isLight ? 'text-slate-600 hover:text-slate-900' : 'text-[#8A919D] hover:text-[#F4F5F7]'
                  }`}
                >
                  Recent Trades
                  {activeTab === 'recent' && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full -mb-3 bg-blue-500" />
                  )}
                </button>
                <button
                  onClick={() => setActiveTab('open')}
                  className={`text-xs font-semibold pb-0.5 transition relative cursor-pointer ${
                    activeTab === 'open'
                      ? isLight ? 'text-blue-600' : 'text-blue-400'
                      : isLight ? 'text-slate-600 hover:text-slate-900' : 'text-[#8A919D] hover:text-[#F4F5F7]'
                  }`}
                >
                  Open Trades ({openTrades.length})
                  {activeTab === 'open' && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full -mb-3 bg-blue-500" />
                  )}
                </button>
              </div>

              {/* Table Header */}
              <div className={`grid grid-cols-3 text-[10px] font-bold uppercase tracking-wider px-3 py-2 rounded-xl ${
                isLight ? 'bg-slate-100 text-slate-600' : 'bg-[#090C10] text-[#8A919D] border border-[rgba(255,255,255,0.055)]'
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
                        : 'bg-[#0D1014] border-[rgba(255,255,255,0.055)] hover:border-[rgba(255,255,255,0.09)] hover:bg-[#151A20] text-[#F4F5F7]'
                    }`}
                  >
                    <span className={`font-mono text-[11px] ${
                      isLight ? 'text-slate-600' : 'text-[#8A919D]'
                    }`}>
                      {safeFormatDate(trade.exitDate || trade.entryDate, 'Open', { month: '2-digit', day: '2-digit', year: 'numeric' })}
                    </span>
                    <span className={`font-semibold flex items-center gap-1.5 ${
                      isLight ? 'text-slate-900' : 'text-[#F4F5F7]'
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
                    isLight ? 'text-[#A1A1AA]' : 'text-[#8A919D]'
                  }`}>
                    {activeTab === 'recent' ? 'No trades yet.' : 'No open trades.'}
                  </div>
                )}
              </div>
            </div>

            {/* Quick Footer Action */}
            <div className={`pt-3 border-t mt-3 flex items-center justify-between text-xs ${
              isLight ? 'border-slate-100' : 'border-[rgba(255,255,255,0.055)]'
            }`}>
              <button
                onClick={() => setIsAddTradeOpen(true)}
                className={`font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                  isLight ? 'text-blue-600 hover:text-blue-700' : 'text-blue-400 hover:text-blue-300'
                }`}
              >
                <Plus className="w-3.5 h-3.5" /> Add trade
              </button>
              <button
                onClick={() => setActiveView('trades')}
                className={`transition font-medium cursor-pointer ${
                  isLight ? 'text-slate-600 hover:text-slate-900' : 'text-[#8A919D] hover:text-[#F4F5F7]'
                }`}
              >
                View trades →
              </button>
            </div>
          </div>
        )}

        {/* 3. Balance Curve */}
        {widgets.accountBalance && (
          <div className={`rounded-2xl border p-4 flex flex-col justify-between transition min-w-0 overflow-hidden ${
            isLight
              ? 'border-slate-200 bg-white shadow-xs'
              : 'border-[rgba(255,255,255,0.055)] bg-[#0D1014] shadow-[0_4px_20px_rgba(0,0,0,0.25)]'
          }`}>
            <div className={`flex items-center justify-between pb-3 border-b ${
              isLight ? 'border-slate-100' : 'border-[rgba(255,255,255,0.055)]'
            }`}>
              <span className={`text-xs font-semibold flex items-center gap-2 ${
                isLight ? 'text-slate-900' : 'text-[#F4F5F7]'
              }`}>
                Balance Curve <DashboardInfoTooltip info={METRIC_INFOS.accountBalance} />
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

      {/* Feature Section: Calendar & Trade Time */}
      {(widgets.calendar || widgets.drawdown || widgets.tradeTimePerformance) && (
        <div className={`pt-5 border-t ${isLight ? 'border-slate-200' : 'border-[rgba(255,255,255,0.055)]'}`}>
          <div className="flex items-center justify-between pb-4">
            <div className="flex items-center gap-2.5">
              <CalendarDays className="w-4 h-4 text-blue-400" />
              <h2 className={`text-sm font-semibold ${isLight ? 'text-slate-900' : 'text-[#F4F5F7]'}`}>
                Performance & Execution
              </h2>
            </div>
            <button
              onClick={() => setDashboardMode('calendar')}
              className={`text-xs font-semibold transition cursor-pointer ${
                isLight ? 'text-blue-600 hover:text-blue-700' : 'text-blue-400 hover:text-blue-300'
              }`}
            >
              View calendar →
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
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in"
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
                : 'bg-[#0B0E12] border-[rgba(255,255,255,0.07)] text-[#F4F5F7] shadow-[0_20px_50px_rgba(0,0,0,0.72)]'
            }`}
          >
            <div className={`flex items-center justify-between pb-3 border-b ${
              isLight ? 'border-slate-100' : 'border-[rgba(255,255,255,0.07)]'
            }`}>
              <h3 className={`text-sm font-semibold flex items-center gap-2 ${
                isLight ? 'text-slate-900' : 'text-[#F4F5F7]'
              }`}>
                <SlidersHorizontal className={`w-4 h-4 ${isLight ? 'text-blue-600' : 'text-blue-400'}`} />
                Customize Widgets
              </h3>
              <button
                onClick={() => setIsEditWidgetsOpen(false)}
                className={`text-xs transition cursor-pointer ${
                  isLight ? 'text-[#71717A] hover:text-slate-900' : 'text-[#8A919D] hover:text-[#F4F5F7]'
                }`}
              >
                Close
              </button>
            </div>

            <div className="space-y-2 max-h-[380px] overflow-y-auto custom-scrollbar pr-1">
              {[
                { key: 'calendar', label: 'Trading Calendar' },
                { key: 'drawdown', label: 'Drawdown Curve' },
                { key: 'tradeTimePerformance', label: 'Trade Time Scatter' },
                { key: 'kpis', label: 'Top Metrics (P&L, Win %, PF, Daily Win %, Payoff)' },
                { key: 'scoreCard', label: 'Performance Profile' },
                { key: 'progressTracker', label: 'Trading Activity' },
                { key: 'cumulativeChart', label: 'Equity Curve' },
                { key: 'dailyBarChart', label: 'Daily P&L Distribution' },
                { key: 'positionsTable', label: 'Recent & Open Trades' },
                { key: 'accountBalance', label: 'Balance Curve' },
              ].map(item => (
                <label
                  key={item.key}
                  className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer select-none transition ${
                    isLight
                      ? 'bg-slate-50 border-slate-200 hover:border-slate-300'
                      : 'bg-[#0D1014] border-[rgba(255,255,255,0.055)] hover:border-[rgba(255,255,255,0.09)] hover:bg-[#151A20]'
                  }`}
                >
                  <span className={`text-xs font-medium ${
                    isLight ? 'text-slate-900' : 'text-[#F4F5F7]'
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
                      isLight ? 'border-slate-300 bg-white' : 'border-[rgba(255,255,255,0.08)] bg-[#080A0D]'
                    }`}
                  />
                </label>
              ))}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setIsEditWidgetsOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-[linear-gradient(135deg,#2563EB,#7C3AED)] hover:opacity-95 text-white transition active:scale-[0.98] shadow-xs border border-blue-400/30 cursor-pointer"
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
