import React, { useState, useMemo } from 'react';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Percent,
  DollarSign,
  Activity,
  Calendar,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Award,
  Zap,
  RefreshCw,
  SlidersHorizontal,
  ChevronDown,
  Layers,
  Flame,
  ShieldAlert,
  Download,
  Info,
  Plus
} from 'lucide-react';
import { useTrading } from '../../context/TradingContext';
import { Trade } from '../../types';
import { safeFormatDate } from '../../utils/dateUtils';
import { calculatePerformanceMetrics } from './analyticsUtils';
import { DynamicChartCard } from '../reports/DynamicChartCard';

type TimeRangeFilter = 'TODAY' | '7D' | '30D' | '3M' | '6M' | '1Y' | 'ALL' | 'CUSTOM';
type OutcomeFilter = 'ALL' | 'WINNERS' | 'LOSERS' | 'BREAKEVEN';
type PnlInterval = 'DAILY' | 'WEEKLY' | 'MONTHLY';
type ChartTab = 'EQUITY' | 'CUMULATIVE' | 'DRAWDOWN' | 'PERIODIC' | 'DISTRIBUTION';

export const PerformanceAnalyticsView: React.FC = () => {
  const {
    trades,
    accounts,
    selectedAccountId,
    setSelectedAccountId,
    formatCurrency,
    formatRMultiple,
    playbooks,
    setSelectedTrade,
    theme,
  } = useTrading();

  const isLight = theme === 'light';

  // Dynamic Custom Chart Cards State
  const [customCharts, setCustomCharts] = useState<
    Array<{ id: string; primaryMetric: string; secondaryMetric?: string }>
  >([
    { id: 'custom-chart-1', primaryMetric: 'net_pnl', secondaryMetric: 'cumulative_pnl' },
    { id: 'custom-chart-2', primaryMetric: 'win_rate', secondaryMetric: 'profit_factor' },
  ]);

  const handleAddCustomChartCard = () => {
    const newId = `custom-chart-${Date.now()}`;
    setCustomCharts(prev => [
      ...prev,
      { id: newId, primaryMetric: 'logged_days_cum', secondaryMetric: 'avg_hold_time_cum' },
    ]);
  };

  const handleRemoveCustomChartCard = (id: string) => {
    setCustomCharts(prev => prev.filter(c => c.id !== id));
  };

  // Local Filters
  const [timeRange, setTimeRange] = useState<TimeRangeFilter>('ALL');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [outcomeFilter, setOutcomeFilter] = useState<OutcomeFilter>('ALL');
  const [selectedSymbol, setSelectedSymbol] = useState<string>('ALL');
  const [selectedStrategy, setSelectedStrategy] = useState<string>('ALL');
  const [activeChartTab, setActiveChartTab] = useState<ChartTab>('EQUITY');
  const [pnlInterval, setPnlInterval] = useState<PnlInterval>('DAILY');
  const [hoverDataPoint, setHoverDataPoint] = useState<{ label: string; value: string; sub?: string } | null>(null);

  // Extract unique symbols & strategies
  const availableSymbols = useMemo(() => {
    const syms = Array.from(new Set(trades.map(t => t.symbol).filter(Boolean)));
    return syms.sort();
  }, [trades]);

  const availableStrategies = useMemo(() => {
    const sets = Array.from(new Set(trades.map(t => t.setupType).filter(Boolean)));
    return sets.sort();
  }, [trades]);

  // Apply filters
  const filteredTrades = useMemo(() => {
    let list = [...trades];

    // Account Filter
    if (selectedAccountId !== 'all') {
      list = list.filter(t => t.accountId === selectedAccountId);
    }

    // Symbol Filter
    if (selectedSymbol !== 'ALL') {
      list = list.filter(t => t.symbol === selectedSymbol);
    }

    // Strategy Filter
    if (selectedStrategy !== 'ALL') {
      list = list.filter(t => t.setupType === selectedStrategy);
    }

    // Outcome Filter
    if (outcomeFilter === 'WINNERS') {
      list = list.filter(t => t.status === 'CLOSED' && t.netPnl > 0);
    } else if (outcomeFilter === 'LOSERS') {
      list = list.filter(t => t.status === 'CLOSED' && t.netPnl < 0);
    } else if (outcomeFilter === 'BREAKEVEN') {
      list = list.filter(t => t.status === 'CLOSED' && t.netPnl === 0);
    }

    // Time Range Filter
    const now = new Date().getTime();
    if (timeRange === 'TODAY') {
      const todayStr = new Date().toISOString().split('T')[0];
      list = list.filter(t => t.entryDate && t.entryDate.startsWith(todayStr));
    } else if (timeRange === '7D') {
      const cutoff = now - 7 * 24 * 60 * 60 * 1000;
      list = list.filter(t => t.entryDate && new Date(t.entryDate).getTime() >= cutoff);
    } else if (timeRange === '30D') {
      const cutoff = now - 30 * 24 * 60 * 60 * 1000;
      list = list.filter(t => t.entryDate && new Date(t.entryDate).getTime() >= cutoff);
    } else if (timeRange === '3M') {
      const cutoff = now - 90 * 24 * 60 * 60 * 1000;
      list = list.filter(t => t.entryDate && new Date(t.entryDate).getTime() >= cutoff);
    } else if (timeRange === '6M') {
      const cutoff = now - 180 * 24 * 60 * 60 * 1000;
      list = list.filter(t => t.entryDate && new Date(t.entryDate).getTime() >= cutoff);
    } else if (timeRange === '1Y') {
      const cutoff = now - 365 * 24 * 60 * 60 * 1000;
      list = list.filter(t => t.entryDate && new Date(t.entryDate).getTime() >= cutoff);
    } else if (timeRange === 'CUSTOM') {
      if (customStartDate) {
        const start = new Date(customStartDate).getTime();
        list = list.filter(t => t.entryDate && new Date(t.entryDate).getTime() >= start);
      }
      if (customEndDate) {
        const end = new Date(customEndDate).getTime() + 24 * 60 * 60 * 1000;
        list = list.filter(t => t.entryDate && new Date(t.entryDate).getTime() <= end);
      }
    }

    return list;
  }, [trades, selectedAccountId, selectedSymbol, selectedStrategy, outcomeFilter, timeRange, customStartDate, customEndDate]);

  // Performance metrics calculation
  const currentAccount = accounts.find(a => a.id === selectedAccountId);
  const initialBalance = currentAccount ? currentAccount.initialBalance : 50000;
  const metrics = useMemo(() => calculatePerformanceMetrics(filteredTrades, initialBalance), [filteredTrades, initialBalance]);

  // Chronological closed trades for charts
  const chronoTrades = useMemo(() => {
    return filteredTrades
      .filter(t => t.status === 'CLOSED')
      .sort((a, b) => new Date(a.entryDate).getTime() - new Date(b.entryDate).getTime());
  }, [filteredTrades]);

  // Reset Filters
  const handleResetFilters = () => {
    setTimeRange('ALL');
    setCustomStartDate('');
    setCustomEndDate('');
    setOutcomeFilter('ALL');
    setSelectedSymbol('ALL');
    setSelectedStrategy('ALL');
    setSelectedAccountId('all');
  };

  // CSV Export
  const handleExportCSV = () => {
    const headers = ['ID', 'Date', 'Symbol', 'Market', 'Direction', 'Status', 'Entry', 'Exit', 'Qty', 'Gross PnL', 'Net PnL', 'R Multiple', 'Setup', 'Session', 'Rules Followed'];
    const rows = filteredTrades.map(t => [
      t.id,
      t.entryDate,
      t.symbol,
      t.market,
      t.direction,
      t.status,
      t.entryPrice,
      t.exitPrice ?? '',
      t.quantity,
      t.grossPnl,
      t.netPnl,
      t.rMultiple,
      `"${t.setupType || ''}"`,
      t.session,
      t.rulesFollowed ? 'YES' : 'NO'
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `duskflow_performance_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ==========================================
  // CHART DATA GENERATORS
  // ==========================================

  // 1. Equity Curve Data
  const equityPoints = useMemo(() => {
    let current = initialBalance;
    let peak = initialBalance;
    const points = [{ date: 'Start', balance: initialBalance, pnl: 0, peak: initialBalance }];
    chronoTrades.forEach(t => {
      current += t.netPnl;
      if (current > peak) peak = current;
      points.push({
        date: safeFormatDate(t.entryDate, '', { month: 'short', day: 'numeric' }),
        balance: current,
        pnl: t.netPnl,
        peak,
      });
    });
    return points;
  }, [chronoTrades, initialBalance]);

  // 2. Cumulative PnL Points
  const cumulativePnlPoints = useMemo(() => {
    let running = 0;
    const points = [{ date: 'Start', cumulative: 0, pnl: 0 }];
    chronoTrades.forEach(t => {
      running += t.netPnl;
      points.push({
        date: safeFormatDate(t.entryDate, '', { month: 'short', day: 'numeric' }),
        cumulative: running,
        pnl: t.netPnl,
      });
    });
    return points;
  }, [chronoTrades]);

  // 3. Drawdown Curve Points
  const drawdownPoints = useMemo(() => {
    let current = initialBalance;
    let peak = initialBalance;
    const points = [{ date: 'Start', ddDollar: 0, ddPercent: 0 }];
    chronoTrades.forEach(t => {
      current += t.netPnl;
      if (current > peak) peak = current;
      const dd = peak - current;
      const ddPct = peak > 0 ? (dd / peak) * 100 : 0;
      points.push({
        date: safeFormatDate(t.entryDate, '', { month: 'short', day: 'numeric' }),
        ddDollar: dd,
        ddPercent: ddPct,
      });
    });
    return points;
  }, [chronoTrades, initialBalance]);

  // 4. Periodic PnL Data (Daily / Weekly / Monthly)
  const periodicData = useMemo(() => {
    const map: { [key: string]: { label: string; pnl: number; count: number; wins: number } } = {};

    chronoTrades.forEach(t => {
      if (!t.entryDate) return;
      const d = new Date(t.entryDate);
      let key = '';
      let label = '';

      if (pnlInterval === 'DAILY') {
        key = d.toISOString().split('T')[0];
        label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      } else if (pnlInterval === 'WEEKLY') {
        const startOfYear = new Date(d.getFullYear(), 0, 1);
        const weekNum = Math.ceil((((d.getTime() - startOfYear.getTime()) / 86400000) + startOfYear.getDay() + 1) / 7);
        key = `${d.getFullYear()}-W${weekNum}`;
        label = `Week ${weekNum}`;
      } else {
        key = `${d.getFullYear()}-${d.getMonth() + 1}`;
        label = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      }

      if (!map[key]) {
        map[key] = { label, pnl: 0, count: 0, wins: 0 };
      }
      map[key].pnl += t.netPnl;
      map[key].count += 1;
      if (t.netPnl > 0) map[key].wins += 1;
    });

    return Object.values(map);
  }, [chronoTrades, pnlInterval]);

  // 5. Distribution Buckets
  const distributionBuckets = useMemo(() => {
    const buckets = [
      { label: '> +$1k', min: 1000, max: Infinity, count: 0, pnl: 0, color: '#10b981' },
      { label: '+$500..$1k', min: 500, max: 1000, count: 0, pnl: 0, color: '#34d399' },
      { label: '+$100..$500', min: 100, max: 500, count: 0, pnl: 0, color: '#6ee7b7' },
      { label: '+$0..$100', min: 0.01, max: 100, count: 0, pnl: 0, color: '#a7f3d0' },
      { label: 'Breakeven $0', min: -0.01, max: 0.01, count: 0, pnl: 0, color: '#94a3b8' },
      { label: '-$0..$100', min: -100, max: -0.01, count: 0, pnl: 0, color: '#fca5a5' },
      { label: '-$100..$500', min: -500, max: -100, count: 0, pnl: 0, color: '#f87171' },
      { label: '-$500..$1k', min: -1000, max: -500, count: 0, pnl: 0, color: '#ef4444' },
      { label: '< -$1k', min: -Infinity, max: -1000, count: 0, pnl: 0, color: '#b91c1c' },
    ];

    chronoTrades.forEach(t => {
      for (const b of buckets) {
        if (t.netPnl >= b.min && (b.max === Infinity ? true : t.netPnl < b.max)) {
          b.count += 1;
          b.pnl += t.netPnl;
          break;
        }
      }
    });

    return buckets;
  }, [chronoTrades]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* ========================================================================= */}
      {/* 1. HEADER & BREADCRUMB */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1C232E]">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-400 uppercase tracking-wider mb-1">
            <span>Analytics</span>
            <span>/</span>
            <span className="text-slate-200">Performance Overview</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <BarChart3 className="w-6 h-6 text-blue-400" />
            Performance Analytics
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time institutional trade execution analytics, drawdown tracking, and capital performance
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#12161D] border border-[#1C232E] text-xs font-semibold text-slate-200 hover:bg-[#1A1F27] hover:border-[#273141] transition"
            title="Export filtered trades to CSV"
          >
            <Download className="w-3.5 h-3.5 text-blue-400" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. FILTER TOOLBAR */}
      {/* ========================================================================= */}
      <div className="rounded-2xl border border-[#1C232E] bg-[#12161D] p-4 shadow-xl backdrop-blur-sm space-y-3.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Time Range Pills */}
          <div className="flex flex-wrap items-center gap-1.5 bg-[#0A0D14] p-1 rounded-xl border border-[#1C232E]">
            {(['TODAY', '7D', '30D', '3M', '6M', '1Y', 'ALL', 'CUSTOM'] as TimeRangeFilter[]).map(tab => (
              <button
                key={tab}
                onClick={() => setTimeRange(tab)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition whitespace-nowrap cursor-pointer ${
                  timeRange === tab
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/25'
                    : 'text-slate-400 hover:text-white hover:bg-[#12161D]'
                }`}
              >
                {tab === 'TODAY' ? 'Today' : tab === 'ALL' ? 'All Time' : tab === 'CUSTOM' ? 'Custom' : tab}
              </button>
            ))}
          </div>

          {/* Outcome Filter */}
          <div className="flex items-center gap-1 bg-[#0A0D14] p-1 rounded-xl border border-[#1C232E]">
            {(['ALL', 'WINNERS', 'LOSERS', 'BREAKEVEN'] as OutcomeFilter[]).map(outcome => (
              <button
                key={outcome}
                onClick={() => setOutcomeFilter(outcome)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition whitespace-nowrap cursor-pointer ${
                  outcomeFilter === outcome
                    ? outcome === 'WINNERS'
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/25'
                      : outcome === 'LOSERS'
                      ? 'bg-rose-600 text-white shadow-md shadow-rose-600/25'
                      : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/25'
                    : 'text-slate-400 hover:text-white hover:bg-[#12161D]'
                }`}
              >
                {outcome === 'ALL' ? 'All Trades' : outcome === 'WINNERS' ? 'Winners' : outcome === 'LOSERS' ? 'Losers' : 'Break-even'}
              </button>
            ))}
          </div>
        </div>

        {/* Second Filter Row (Dropdowns & Custom Date Range) */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-[#1C232E]">
          {/* Account Selector */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-medium text-slate-400">Account:</span>
            <select
              value={selectedAccountId}
              onChange={e => setSelectedAccountId(e.target.value)}
              className="rounded-lg bg-[#0A0D14] border border-[#1C232E] px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
            >
              <option value="all">All Accounts ({accounts.length})</option>
              {accounts.map(acc => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} ({acc.broker})
                </option>
              ))}
            </select>
          </div>

          {/* Symbol Filter */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-medium text-slate-400">Symbol:</span>
            <select
              value={selectedSymbol}
              onChange={e => setSelectedSymbol(e.target.value)}
              className="rounded-lg bg-[#0A0D14] border border-[#1C232E] px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">All Symbols ({availableSymbols.length})</option>
              {availableSymbols.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Strategy Filter */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-medium text-slate-400">Setup:</span>
            <select
              value={selectedStrategy}
              onChange={e => setSelectedStrategy(e.target.value)}
              className="rounded-lg bg-[#0A0D14] border border-[#1C232E] px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">All Setups ({availableStrategies.length})</option>
              {availableStrategies.map(strat => (
                <option key={strat} value={strat}>{strat}</option>
              ))}
            </select>
          </div>

          {/* Custom Date Inputs */}
          {timeRange === 'CUSTOM' && (
            <div className="flex items-center gap-2 bg-[#0A0D14] px-2.5 py-1 rounded-lg border border-[#1C232E]">
              <input
                type="date"
                value={customStartDate}
                onChange={e => setCustomStartDate(e.target.value)}
                className="bg-transparent text-xs text-slate-200 focus:outline-none"
              />
              <span className="text-slate-500 text-xs">to</span>
              <input
                type="date"
                value={customEndDate}
                onChange={e => setCustomEndDate(e.target.value)}
                className="bg-transparent text-xs text-slate-200 focus:outline-none"
              />
            </div>
          )}

          {/* Reset Filters */}
          <button
            onClick={handleResetFilters}
            className="ml-auto flex items-center gap-1.5 text-xs text-slate-400 hover:text-blue-400 transition"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Reset Filters</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. PRIMARY EXECUTIVE KPI METRICS (24 Key Indicators) */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* Total Net PnL */}
        <div className="p-4 rounded-2xl bg-[#12161D] border border-[#1C232E] shadow-md space-y-1">
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 uppercase">
            <span>Net Realized P&L</span>
            <DollarSign className={`w-3.5 h-3.5 ${metrics.totalNetPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`} />
          </div>
          <div className={`text-xl font-black font-mono tracking-tight ${metrics.totalNetPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {formatCurrency(metrics.totalNetPnl)}
          </div>
          <div className="text-[10px] text-slate-400 flex items-center gap-1">
            <span>ROI:</span>
            <strong className={metrics.totalNetPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
              {metrics.totalNetPnl >= 0 ? '+' : ''}{((metrics.totalNetPnl / initialBalance) * 100).toFixed(1)}%
            </strong>
          </div>
        </div>

        {/* Win Rate */}
        <div className="p-4 rounded-2xl bg-[#12161D] border border-[#1C232E] shadow-md space-y-1">
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 uppercase">
            <span>Win Rate</span>
            <Percent className="w-3.5 h-3.5 text-blue-400" />
          </div>
          <div className="text-xl font-black font-mono tracking-tight text-slate-100">
            {metrics.winRate}%
          </div>
          <div className="text-[10px] text-slate-400">
            Loss Rate: <strong className="text-rose-400">{metrics.lossRate}%</strong>
          </div>
        </div>

        {/* Profit Factor */}
        <div className="p-4 rounded-2xl bg-[#12161D] border border-[#1C232E] shadow-md space-y-1">
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 uppercase">
            <span>Profit Factor</span>
            <Award className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-xl font-black font-mono tracking-tight text-slate-100">
            {metrics.profitFactor > 0 ? metrics.profitFactor.toFixed(2) : '0.00'}
          </div>
          <div className="text-[10px] text-slate-400">
            Expectancy: <strong className="text-emerald-400">${metrics.expectancy}</strong>
          </div>
        </div>

        {/* Average Trade P&L */}
        <div className="p-4 rounded-2xl bg-[#12161D] border border-[#1C232E] shadow-md space-y-1">
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 uppercase">
            <span>Avg Trade P&L</span>
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className={`text-xl font-black font-mono tracking-tight ${metrics.avgTradePnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {formatCurrency(metrics.avgTradePnl)}
          </div>
          <div className="text-[10px] text-slate-400">
            Avg R: <strong className="text-blue-400">{formatRMultiple(metrics.avgRMultiple)}</strong>
          </div>
        </div>

        {/* Maximum Drawdown */}
        <div className="p-4 rounded-2xl bg-[#12161D] border border-[#1C232E] shadow-md space-y-1">
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 uppercase">
            <span>Max Drawdown</span>
            <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
          </div>
          <div className="text-xl font-black font-mono tracking-tight text-rose-400">
            -${Math.round(metrics.maxDrawdownDollar).toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-400">
            Depth: <strong className="text-rose-400">-{metrics.maxDrawdownPercent}%</strong>
          </div>
        </div>

        {/* Streaks & Discipline */}
        <div className="p-4 rounded-2xl bg-[#12161D] border border-[#1C232E] shadow-md space-y-1">
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 uppercase">
            <span>Win Streak</span>
            <Flame className="w-3.5 h-3.5 text-orange-400" />
          </div>
          <div className="text-xl font-black font-mono tracking-tight text-emerald-400">
            {metrics.longestWinStreak} <span className="text-xs text-slate-400 font-normal">trades</span>
          </div>
          <div className="text-[10px] text-slate-400">
            Current: <strong className={metrics.currentStreak.type === 'WIN' ? 'text-emerald-400' : metrics.currentStreak.type === 'LOSS' ? 'text-rose-400' : 'text-slate-300'}>
              {metrics.currentStreak.type === 'WIN' ? `+${metrics.currentStreak.count} Wins` : metrics.currentStreak.type === 'LOSS' ? `-${metrics.currentStreak.count} Losses` : 'Neutral'}
            </strong>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. SECONDARY DETAILED PERFORMANCE METRIC GRID (18 Granular Stats) */}
      {/* ========================================================================= */}
      <div className="rounded-2xl border border-[#1C232E] bg-[#12161D] p-5 shadow-xl backdrop-blur-sm space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-[#1C232E]">
          <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-blue-400" />
            Executive Performance Roster
          </h3>
          <span className="text-xs text-slate-400 font-mono">
            {metrics.closedTrades} Closed / {metrics.totalTrades} Total Executions
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 text-xs">
          {/* Gross Profit */}
          <div className="p-3 rounded-xl bg-[#0A0D14] border border-[#1C232E]/70 space-y-1">
            <span className="text-[10px] text-slate-500 font-medium uppercase">Gross Profit</span>
            <div className="font-mono font-bold text-emerald-400 text-sm">+{formatCurrency(metrics.grossProfit)}</div>
            <div className="text-[10px] text-slate-400">{metrics.winningTrades} winning trades</div>
          </div>

          {/* Gross Loss */}
          <div className="p-3 rounded-xl bg-[#0A0D14] border border-[#1C232E]/70 space-y-1">
            <span className="text-[10px] text-slate-500 font-medium uppercase">Gross Loss</span>
            <div className="font-mono font-bold text-rose-400 text-sm">-{formatCurrency(metrics.grossLoss)}</div>
            <div className="text-[10px] text-slate-400">{metrics.losingTrades} losing trades</div>
          </div>

          {/* Average Win */}
          <div className="p-3 rounded-xl bg-[#0A0D14] border border-[#1C232E]/70 space-y-1">
            <span className="text-[10px] text-slate-500 font-medium uppercase">Average Win</span>
            <div className="font-mono font-bold text-emerald-400 text-sm">+{formatCurrency(metrics.avgWin)}</div>
            <div className="text-[10px] text-slate-400">Ratio: {metrics.winLossRatio}x</div>
          </div>

          {/* Average Loss */}
          <div className="p-3 rounded-xl bg-[#0A0D14] border border-[#1C232E]/70 space-y-1">
            <span className="text-[10px] text-slate-500 font-medium uppercase">Average Loss</span>
            <div className="font-mono font-bold text-rose-400 text-sm">-{formatCurrency(metrics.avgLoss)}</div>
            <div className="text-[10px] text-slate-400">Risk controlled</div>
          </div>

          {/* Largest Win */}
          <div className="p-3 rounded-xl bg-[#0A0D14] border border-[#1C232E]/70 space-y-1">
            <span className="text-[10px] text-slate-500 font-medium uppercase">Largest Win</span>
            <div className="font-mono font-bold text-emerald-400 text-sm">+{formatCurrency(metrics.largestWin)}</div>
            <div className="text-[10px] text-slate-400">Peak single trade</div>
          </div>

          {/* Largest Loss */}
          <div className="p-3 rounded-xl bg-[#0A0D14] border border-[#1C232E]/70 space-y-1">
            <span className="text-[10px] text-slate-500 font-medium uppercase">Largest Loss</span>
            <div className="font-mono font-bold text-rose-400 text-sm">{formatCurrency(metrics.largestLoss)}</div>
            <div className="text-[10px] text-slate-400">Max single risk</div>
          </div>

          {/* Break-even Count */}
          <div className="p-3 rounded-xl bg-[#0A0D14] border border-[#1C232E]/70 space-y-1">
            <span className="text-[10px] text-slate-500 font-medium uppercase">Break-even Trades</span>
            <div className="font-mono font-bold text-slate-300 text-sm">{metrics.breakevenTrades}</div>
            <div className="text-[10px] text-slate-400">{metrics.closedTrades ? ((metrics.breakevenTrades / metrics.closedTrades) * 100).toFixed(0) : 0}% of all trades</div>
          </div>

          {/* Current Drawdown */}
          <div className="p-3 rounded-xl bg-[#0A0D14] border border-[#1C232E]/70 space-y-1">
            <span className="text-[10px] text-slate-500 font-medium uppercase">Current Drawdown</span>
            <div className="font-mono font-bold text-amber-400 text-sm">
              -${Math.round(metrics.currentDrawdownDollar).toLocaleString()}
            </div>
            <div className="text-[10px] text-slate-400">-{metrics.currentDrawdownPercent}% from peak</div>
          </div>

          {/* Average Duration */}
          <div className="p-3 rounded-xl bg-[#0A0D14] border border-[#1C232E]/70 space-y-1">
            <span className="text-[10px] text-slate-500 font-medium uppercase">Avg Holding Time</span>
            <div className="font-mono font-bold text-slate-200 text-sm">
              {metrics.avgDurationMinutes >= 60
                ? `${Math.floor(metrics.avgDurationMinutes / 60)}h ${metrics.avgDurationMinutes % 60}m`
                : `${metrics.avgDurationMinutes} mins`}
            </div>
            <div className="text-[10px] text-slate-400">Intraday execution</div>
          </div>

          {/* Best Trading Day */}
          <div className="p-3 rounded-xl bg-[#0A0D14] border border-[#1C232E]/70 space-y-1">
            <span className="text-[10px] text-slate-500 font-medium uppercase">Best Trading Day</span>
            <div className="font-mono font-bold text-emerald-400 text-sm">
              +{formatCurrency(metrics.bestTradingDay.pnl)}
            </div>
            <div className="text-[10px] text-slate-400 truncate">{metrics.bestTradingDay.date}</div>
          </div>

          {/* Worst Trading Day */}
          <div className="p-3 rounded-xl bg-[#0A0D14] border border-[#1C232E]/70 space-y-1">
            <span className="text-[10px] text-slate-500 font-medium uppercase">Worst Trading Day</span>
            <div className="font-mono font-bold text-rose-400 text-sm">
              {formatCurrency(metrics.worstTradingDay.pnl)}
            </div>
            <div className="text-[10px] text-slate-400 truncate">{metrics.worstTradingDay.date}</div>
          </div>

          {/* Longest Loss Streak */}
          <div className="p-3 rounded-xl bg-[#0A0D14] border border-[#1C232E]/70 space-y-1">
            <span className="text-[10px] text-slate-500 font-medium uppercase">Max Losing Streak</span>
            <div className="font-mono font-bold text-rose-400 text-sm">{metrics.longestLossStreak} trades</div>
            <div className="text-[10px] text-slate-400">Rules followed: {metrics.rulesFollowedRate}%</div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4.5 DYNAMIC REPORT CHARTS (Metric Selector & Comparison Builder) */}
      {/* ========================================================================= */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-1">
          <div>
            <h2 className={`text-lg font-bold tracking-tight flex items-center gap-2 ${
              isLight ? 'text-zinc-900' : 'text-white'
            }`}>
              <BarChart3 className={`w-5 h-5 ${isLight ? 'text-blue-600' : 'text-blue-400'}`} />
              Dynamic Report Chart Builder
            </h2>
            <p className={`text-xs ${isLight ? 'text-zinc-500' : 'text-slate-400'}`}>
              Click any metric name to open the categorized dropdown across Profitability, Time Analysis, Risk, Volume & Streaks.
            </p>
          </div>

          <button
            onClick={handleAddCustomChartCard}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-md shadow-blue-600/20 transition active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Add Custom Chart Card</span>
          </button>
        </div>

        {/* Chart Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {customCharts.map(card => (
            <DynamicChartCard
              key={card.id}
              initialPrimaryMetricId={card.primaryMetric}
              initialSecondaryMetricId={card.secondaryMetric}
              canRemoveCard={customCharts.length > 1}
              onRemoveCard={() => handleRemoveCustomChartCard(card.id)}
            />
          ))}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 5. INTERACTIVE PERFORMANCE CHARTS */}
      {/* ========================================================================= */}
      <div className="rounded-2xl border border-[#1C232E] bg-[#12161D] p-5 shadow-xl backdrop-blur-sm space-y-4">
        {/* Chart Navigation Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#1C232E]">
          <div className="flex flex-wrap items-center gap-1.5 bg-[#0A0D14] p-1 rounded-xl border border-[#1C232E]">
            <button
              onClick={() => setActiveChartTab('EQUITY')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${
                activeChartTab === 'EQUITY'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/25'
                  : 'text-slate-400 hover:text-white hover:bg-[#12161D]'
              }`}
            >
              Equity Curve & Growth
            </button>
            <button
              onClick={() => setActiveChartTab('CUMULATIVE')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${
                activeChartTab === 'CUMULATIVE'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/25'
                  : 'text-slate-400 hover:text-white hover:bg-[#12161D]'
              }`}
            >
              Cumulative Net P&L
            </button>
            <button
              onClick={() => setActiveChartTab('DRAWDOWN')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${
                activeChartTab === 'DRAWDOWN'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/25'
                  : 'text-slate-400 hover:text-white hover:bg-[#12161D]'
              }`}
            >
              Drawdown Curve (Underwater)
            </button>
            <button
              onClick={() => setActiveChartTab('PERIODIC')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${
                activeChartTab === 'PERIODIC'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/25'
                  : 'text-slate-400 hover:text-white hover:bg-[#12161D]'
              }`}
            >
              Periodic Realized P&L
            </button>
            <button
              onClick={() => setActiveChartTab('DISTRIBUTION')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${
                activeChartTab === 'DISTRIBUTION'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/25'
                  : 'text-slate-400 hover:text-white hover:bg-[#12161D]'
              }`}
            >
              P&L & Win/Loss Distribution
            </button>
          </div>

          {activeChartTab === 'PERIODIC' && (
            <div className="flex items-center gap-1 bg-[#0A0D14] p-1 rounded-xl border border-[#1C232E]">
              {(['DAILY', 'WEEKLY', 'MONTHLY'] as PnlInterval[]).map(int => (
                <button
                  key={int}
                  onClick={() => setPnlInterval(int)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition cursor-pointer ${
                    pnlInterval === int
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/25'
                      : 'text-slate-400 hover:text-white hover:bg-[#12161D]'
                  }`}
                >
                  {int}
                </button>
              ))}
            </div>
          )}

          {hoverDataPoint && (
            <div className="text-xs font-mono bg-[#0A0D14] px-3 py-1 rounded-lg border border-[#1C232E] text-slate-300">
              <span className="text-slate-500">{hoverDataPoint.label}: </span>
              <span className="font-bold text-blue-400">{hoverDataPoint.value}</span>
              {hoverDataPoint.sub && <span className="text-slate-500 ml-1">({hoverDataPoint.sub})</span>}
            </div>
          )}
        </div>

        {/* Chart View Body */}
        <div className="h-[280px] w-full flex items-center justify-center">
          {chronoTrades.length === 0 ? (
            <div className="text-center space-y-2">
              <Info className="w-8 h-8 text-slate-500 mx-auto opacity-50" />
              <p className="text-sm text-slate-400">No closed trade executions match the active filter criteria.</p>
              <button
                onClick={handleResetFilters}
                className="text-xs text-blue-400 hover:underline"
              >
                Clear Filters
              </button>
            </div>
          ) : (
            <>
              {/* TAB 1: EQUITY CURVE */}
              {activeChartTab === 'EQUITY' && (
                <svg
                  viewBox="0 0 800 260"
                  className="w-full h-full overflow-visible select-none"
                  onMouseLeave={() => setHoverDataPoint(null)}
                >
                  <defs>
                    <linearGradient id="eqGreenGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366f1" stopOpacity="0.35" />
                      <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  {(() => {
                    const minVal = Math.min(...equityPoints.map(p => p.balance)) * 0.98;
                    const maxVal = Math.max(...equityPoints.map(p => p.peak)) * 1.02;
                    const range = maxVal - minVal || 1;
                    const padX = 40;
                    const padY = 25;
                    const w = 800;
                    const h = 260;

                    const getX = (i: number) => padX + (i / (equityPoints.length - 1 || 1)) * (w - 2 * padX);
                    const getY = (val: number) => h - padY - ((val - minVal) / range) * (h - 2 * padY);

                    const linePoints = equityPoints.map((d, i) => `${getX(i)},${getY(d.balance)}`).join(' ');
                    const peakPoints = equityPoints.map((d, i) => `${getX(i)},${getY(d.peak)}`).join(' ');
                    const areaPoints = `${getX(0)},${h - padY} ${linePoints} ${getX(equityPoints.length - 1)},${h - padY}`;

                    return (
                      <>
                        {/* Grid lines */}
                        <line x1={padX} y1={getY(initialBalance)} x2={w - padX} y2={getY(initialBalance)} stroke="#334155" strokeWidth="1" strokeDasharray="3 3" />
                        <line x1={padX} y1={padY} x2={w - padX} y2={padY} stroke="#1e293b" strokeWidth="1" />
                        <line x1={padX} y1={h - padY} x2={w - padX} y2={h - padY} stroke="#1e293b" strokeWidth="1" />

                        {/* Y-Axis Labels */}
                        <text x={padX - 8} y={padY + 4} fill="#64748b" fontSize="10" textAnchor="end" fontFamily="monospace">
                          ${Math.round(maxVal).toLocaleString()}
                        </text>
                        <text x={padX - 8} y={getY(initialBalance) + 3} fill="#818cf8" fontSize="10" textAnchor="end" fontFamily="monospace">
                          Init: ${initialBalance.toLocaleString()}
                        </text>
                        <text x={padX - 8} y={h - padY + 3} fill="#64748b" fontSize="10" textAnchor="end" fontFamily="monospace">
                          ${Math.round(minVal).toLocaleString()}
                        </text>

                        {/* High Water Mark line */}
                        <polyline fill="none" stroke="#475569" strokeWidth="1" strokeDasharray="4 4" points={peakPoints} />

                        {/* Fill & Curve */}
                        <polygon points={areaPoints} fill="url(#eqGreenGrad)" />
                        <polyline fill="none" stroke="#6366f1" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" points={linePoints} />

                        {/* Interactive Nodes */}
                        {equityPoints.map((pt, idx) => (
                          <circle
                            key={idx}
                            cx={getX(idx)}
                            cy={getY(pt.balance)}
                            r="4"
                            className="fill-indigo-500 hover:fill-white hover:r-6 cursor-pointer transition-all"
                            onMouseEnter={() => setHoverDataPoint({
                              label: `${pt.date}`,
                              value: `$${pt.balance.toLocaleString()}`,
                              sub: `${pt.pnl >= 0 ? '+' : ''}$${pt.pnl.toLocaleString()}`
                            })}
                          />
                        ))}
                      </>
                    );
                  })()}
                </svg>
              )}

              {/* TAB 2: CUMULATIVE PNL */}
              {activeChartTab === 'CUMULATIVE' && (
                <svg
                  viewBox="0 0 800 260"
                  className="w-full h-full overflow-visible select-none"
                  onMouseLeave={() => setHoverDataPoint(null)}
                >
                  <defs>
                    <linearGradient id="cumGreenGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  {(() => {
                    const minVal = Math.min(0, ...cumulativePnlPoints.map(p => p.cumulative));
                    const maxVal = Math.max(100, ...cumulativePnlPoints.map(p => p.cumulative));
                    const range = maxVal - minVal || 1;
                    const padX = 40;
                    const padY = 25;
                    const w = 800;
                    const h = 260;

                    const zeroY = h - padY - ((0 - minVal) / range) * (h - 2 * padY);
                    const getX = (i: number) => padX + (i / (cumulativePnlPoints.length - 1 || 1)) * (w - 2 * padX);
                    const getY = (val: number) => h - padY - ((val - minVal) / range) * (h - 2 * padY);

                    const linePoints = cumulativePnlPoints.map((d, i) => `${getX(i)},${getY(d.cumulative)}`).join(' ');
                    const areaPoints = `${getX(0)},${zeroY} ${linePoints} ${getX(cumulativePnlPoints.length - 1)},${zeroY}`;

                    return (
                      <>
                        <line x1={padX} y1={zeroY} x2={w - padX} y2={zeroY} stroke="#475569" strokeWidth="1.5" strokeDasharray="3 3" />
                        <text x={padX - 8} y={padY + 4} fill="#64748b" fontSize="10" textAnchor="end" fontFamily="monospace">
                          +${Math.round(maxVal).toLocaleString()}
                        </text>
                        <text x={padX - 8} y={zeroY + 3} fill="#94a3b8" fontSize="10" textAnchor="end" fontFamily="monospace">
                          $0
                        </text>
                        {minVal < 0 && (
                          <text x={padX - 8} y={h - padY + 3} fill="#64748b" fontSize="10" textAnchor="end" fontFamily="monospace">
                            -${Math.abs(Math.round(minVal)).toLocaleString()}
                          </text>
                        )}

                        <polygon points={areaPoints} fill="url(#cumGreenGrad)" />
                        <polyline fill="none" stroke="#10b981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" points={linePoints} />

                        {cumulativePnlPoints.map((pt, idx) => (
                          <circle
                            key={idx}
                            cx={getX(idx)}
                            cy={getY(pt.cumulative)}
                            r="4"
                            className="fill-emerald-400 hover:fill-white cursor-pointer transition-all"
                            onMouseEnter={() => setHoverDataPoint({
                              label: pt.date,
                              value: `${pt.cumulative >= 0 ? '+' : ''}$${pt.cumulative.toLocaleString()}`,
                              sub: `Trade: ${pt.pnl >= 0 ? '+' : ''}$${pt.pnl}`
                            })}
                          />
                        ))}
                      </>
                    );
                  })()}
                </svg>
              )}

              {/* TAB 3: DRAWDOWN UNDERWATER */}
              {activeChartTab === 'DRAWDOWN' && (
                <svg
                  viewBox="0 0 800 260"
                  className="w-full h-full overflow-visible select-none"
                  onMouseLeave={() => setHoverDataPoint(null)}
                >
                  <defs>
                    <linearGradient id="ddRedGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ef4444" stopOpacity="0.05" />
                      <stop offset="100%" stopColor="#ef4444" stopOpacity="0.45" />
                    </linearGradient>
                  </defs>
                  {(() => {
                    const maxDd = Math.max(5, ...drawdownPoints.map(p => p.ddDollar));
                    const padX = 40;
                    const padY = 25;
                    const w = 800;
                    const h = 260;

                    const getX = (i: number) => padX + (i / (drawdownPoints.length - 1 || 1)) * (w - 2 * padX);
                    const getY = (val: number) => padY + (val / (maxDd || 1)) * (h - 2 * padY);

                    const linePoints = drawdownPoints.map((d, i) => `${getX(i)},${getY(d.ddDollar)}`).join(' ');
                    const areaPoints = `${getX(0)},${padY} ${linePoints} ${getX(drawdownPoints.length - 1)},${padY}`;

                    return (
                      <>
                        <line x1={padX} y1={padY} x2={w - padX} y2={padY} stroke="#10b981" strokeWidth="1.5" />
                        <text x={padX - 8} y={padY + 4} fill="#10b981" fontSize="10" textAnchor="end" fontFamily="monospace">
                          Peak ($0 DD)
                        </text>
                        <text x={padX - 8} y={h - padY + 3} fill="#ef4444" fontSize="10" textAnchor="end" fontFamily="monospace">
                          -${Math.round(maxDd).toLocaleString()}
                        </text>

                        <polygon points={areaPoints} fill="url(#ddRedGrad)" />
                        <polyline fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" points={linePoints} />

                        {drawdownPoints.map((pt, idx) => (
                          <circle
                            key={idx}
                            cx={getX(idx)}
                            cy={getY(pt.ddDollar)}
                            r="4"
                            className="fill-rose-500 hover:fill-white cursor-pointer transition-all"
                            onMouseEnter={() => setHoverDataPoint({
                              label: pt.date,
                              value: `-$${Math.round(pt.ddDollar).toLocaleString()}`,
                              sub: `-${pt.ddPercent.toFixed(1)}%`
                            })}
                          />
                        ))}
                      </>
                    );
                  })()}
                </svg>
              )}

              {/* TAB 4: PERIODIC PNL (DAILY / WEEKLY / MONTHLY BARS) */}
              {activeChartTab === 'PERIODIC' && (
                <div className="w-full h-full flex items-end justify-around gap-2 px-6 pt-4 pb-8 overflow-x-auto custom-scrollbar">
                  {periodicData.map((item, idx) => {
                    const maxAbs = Math.max(100, ...periodicData.map(p => Math.abs(p.pnl)));
                    const heightPct = Math.min(100, Math.max(10, (Math.abs(item.pnl) / maxAbs) * 100));
                    const isWin = item.pnl >= 0;

                    return (
                      <div
                        key={idx}
                        className="flex-1 min-w-[36px] max-w-[64px] flex flex-col items-center justify-end h-full group relative cursor-pointer"
                        onMouseEnter={() => setHoverDataPoint({
                          label: item.label,
                          value: `${isWin ? '+' : ''}$${Math.round(item.pnl).toLocaleString()}`,
                          sub: `${item.count} trades (${item.wins} wins)`
                        })}
                      >
                        <span className={`text-[10px] font-mono font-bold mb-1 ${isWin ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {isWin ? '+' : ''}${Math.round(item.pnl)}
                        </span>
                        <div
                          style={{ height: `${heightPct * 0.75}%` }}
                          className={`w-full rounded-t-lg transition-all duration-300 group-hover:brightness-125 ${
                            isWin ? 'bg-emerald-500 shadow-lg shadow-emerald-500/20' : 'bg-rose-500 shadow-lg shadow-rose-500/20'
                          }`}
                        />
                        <span className="text-[10px] text-slate-400 font-mono mt-2 truncate w-full text-center">
                          {item.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* TAB 5: DISTRIBUTION BUCKETS */}
              {activeChartTab === 'DISTRIBUTION' && (
                <div className="w-full h-full flex items-end justify-around gap-2 px-4 pt-4 pb-8 overflow-x-auto custom-scrollbar">
                  {distributionBuckets.map((b, idx) => {
                    const maxCount = Math.max(1, ...distributionBuckets.map(item => item.count));
                    const heightPct = Math.max(8, (b.count / maxCount) * 100);

                    return (
                      <div
                        key={idx}
                        className="flex-1 min-w-[50px] max-w-[80px] flex flex-col items-center justify-end h-full group relative cursor-pointer"
                        onMouseEnter={() => setHoverDataPoint({
                          label: b.label,
                          value: `${b.count} trades`,
                          sub: `Net: ${b.pnl >= 0 ? '+' : ''}$${Math.round(b.pnl)}`
                        })}
                      >
                        <span className="text-[10px] font-mono font-bold text-slate-300 mb-1">
                          {b.count}
                        </span>
                        <div
                          style={{ height: `${heightPct * 0.75}%`, backgroundColor: b.color }}
                          className="w-full rounded-t-lg transition-all duration-300 group-hover:brightness-125 shadow-md"
                        />
                        <span className="text-[9px] text-slate-400 font-mono mt-2 truncate w-full text-center">
                          {b.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 6. DETAILED EXECUTION AUDIT TABLE (Filtered Subset) */}
      {/* ========================================================================= */}
      <div className="rounded-2xl border border-[#1C232E] bg-[#12161D] p-5 shadow-xl backdrop-blur-sm space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-[#1C232E]">
          <div>
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              Filtered Execution Log ({filteredTrades.length} Trades)
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Click any execution row to view granular tick breakdown, R-multiple audit, and AI critique
            </p>
          </div>
        </div>

        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#1C232E] text-[11px] font-bold uppercase text-slate-400 bg-[#0A0D14]">
                <th className="p-3">Date</th>
                <th className="p-3">Asset / Symbol</th>
                <th className="p-3">Direction</th>
                <th className="p-3">Status</th>
                <th className="p-3">Entry / Exit</th>
                <th className="p-3">Quantity</th>
                <th className="p-3 text-right">Net Realized P&L</th>
                <th className="p-3 text-right">R-Multiple</th>
                <th className="p-3">Setup</th>
                <th className="p-3 text-center">Rules</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {filteredTrades.slice(0, 15).map(trade => (
                <tr
                  key={trade.id}
                  onClick={() => setSelectedTrade(trade)}
                  className="hover:bg-[#1A1F27]/50 cursor-pointer transition"
                >
                  <td className="p-3 text-slate-400 text-[11px]">
                    {safeFormatDate(trade.entryDate, '—', { month: 'short', day: 'numeric' })}
                  </td>
                  <td className="p-3 font-bold text-slate-200">
                    {trade.symbol}
                    <span className="ml-1 text-[10px] text-slate-500 uppercase">{trade.market}</span>
                  </td>
                  <td className="p-3">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        trade.direction === 'BUY'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}
                    >
                      {trade.direction}
                    </span>
                  </td>
                  <td className="p-3 text-[11px] text-slate-400">{trade.status}</td>
                  <td className="p-3 text-slate-300">
                    ${trade.entryPrice.toFixed(2)} → ${trade.exitPrice ? trade.exitPrice.toFixed(2) : '—'}
                  </td>
                  <td className="p-3 text-slate-300">{trade.quantity}</td>
                  <td className={`p-3 text-right font-bold ${trade.netPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {trade.netPnl >= 0 ? '+' : ''}${trade.netPnl.toFixed(2)}
                  </td>
                  <td className="p-3 text-right font-bold text-indigo-300">
                    {formatRMultiple(trade.rMultiple)}
                  </td>
                  <td className="p-3 text-slate-300 font-sans">{trade.setupType || 'Discretionary'}</td>
                  <td className="p-3 text-center">
                    {trade.rulesFollowed ? (
                      <span className="text-emerald-400 text-[10px] font-bold font-sans">✓ PASS</span>
                    ) : (
                      <span className="text-rose-400 text-[10px] font-bold font-sans">✕ FAIL</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
