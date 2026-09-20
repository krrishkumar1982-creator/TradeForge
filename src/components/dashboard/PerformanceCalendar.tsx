import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Settings,
  Camera,
  Info,
  Calendar as CalendarIcon,
  TrendingUp,
  TrendingDown,
  Sparkles,
  RotateCcw
} from 'lucide-react';
import { Trade } from '../../types';
import { useTrading } from '../../context/TradingContext';
import { CalendarDayDetailsModal } from './CalendarDayDetailsModal';
import {
  MONTH_NAMES,
  MONTH_NAMES_SHORT,
  DAYS_OF_WEEK,
  toISODateKey,
  formatMonthYear,
  getLatestTradeMonth,
  getYearMonth,
  parseSafeDate,
  safeFormatDate
} from '../../utils/dateUtils';

interface PerformanceCalendarProps {
  trades: Trade[];
  formatCurrency: (val: number) => string;
  formatRMultiple?: (r: number) => string;
  onSelectTrade?: (trade: Trade) => void;
}

export const PerformanceCalendar: React.FC<PerformanceCalendarProps> = ({
  trades,
  formatCurrency,
  formatRMultiple,
  onSelectTrade,
}) => {
  const { theme, setIsAddTradeOpen, addToast } = useTrading();
  const isLight = theme === 'light';

  // Display customization options
  const [showCompactPnL, setShowCompactPnL] = useState(false);
  const [hideWeeklySummary, setHideWeeklySummary] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Month & Year state (0-indexed month: 0 = Jan, 11 = Dec)
  const [{ year, month }, setYearMonth] = useState<{ year: number; month: number }>(() => {
    if (trades && trades.length > 0) {
      return getLatestTradeMonth(trades);
    }
    return getYearMonth(new Date());
  });

  const hasUserNavigated = useRef(false);

  // Auto-sync to latest trade month when trades first load if user hasn't manually navigated
  useEffect(() => {
    if (!hasUserNavigated.current && trades && trades.length > 0) {
      const latest = getLatestTradeMonth(trades);
      setYearMonth(latest);
    }
  }, [trades]);

  // Deep Day Details Modal
  const [selectedDayTrades, setSelectedDayTrades] = useState<{
    date: string;
    dateObj: Date;
    trades: Trade[];
  } | null>(null);

  // Compute all unique months in trade history for quick jumping
  const availableTradeMonths = useMemo(() => {
    const set = new Set<string>();
    trades.forEach(t => {
      const dKey = toISODateKey(t.entryDate || t.exitDate);
      if (dKey && dKey.length >= 7) {
        set.add(dKey.slice(0, 7)); // YYYY-MM
      }
    });
    return Array.from(set).sort().reverse();
  }, [trades]);

  // Current Month ISO prefix (e.g. "2026-08")
  const currentMonthKey = `${year}-${String(month + 1).padStart(2, '0')}`;

  // Map trades by day of current month using normalized date keys
  const {
    tradesByDay,
    monthNetPnl,
    monthGrossWins,
    monthGrossLosses,
    tradingDaysCount,
    winDaysCount,
    lossDaysCount,
    totalTradesCount,
    closedTradesCount,
  } = useMemo(() => {
    const map: { [day: number]: Trade[] } = {};
    let netPnl = 0;
    let grossWins = 0;
    let grossLosses = 0;
    let totalTrades = 0;
    let closedTrades = 0;
    const activeDaysSet = new Set<number>();
    const winDaysSet = new Set<number>();
    const lossDaysSet = new Set<number>();

    // First, group by day
    trades.forEach(t => {
      const dKey = toISODateKey(t.entryDate || t.exitDate);
      if (!dKey) return;

      if (dKey.startsWith(currentMonthKey)) {
        const parts = dKey.split('-');
        const day = parseInt(parts[2], 10);
        if (!isNaN(day) && day >= 1 && day <= 31) {
          if (!map[day]) map[day] = [];
          map[day].push(t);
          totalTrades++;
          if (t.status === 'CLOSED') {
            closedTrades++;
            netPnl += t.netPnl;
            if (t.netPnl > 0) grossWins += t.netPnl;
            else if (t.netPnl < 0) grossLosses += Math.abs(t.netPnl);
          }
          activeDaysSet.add(day);
        }
      }
    });

    // Evaluate day-level win / loss counts
    activeDaysSet.forEach(day => {
      const dayTrades = map[day] || [];
      const dayClosed = dayTrades.filter(t => t.status === 'CLOSED');
      const dayPnl = dayClosed.reduce((sum, t) => sum + t.netPnl, 0);
      if (dayPnl > 0) winDaysSet.add(day);
      else if (dayPnl < 0) lossDaysSet.add(day);
    });

    return {
      tradesByDay: map,
      monthNetPnl: netPnl,
      monthGrossWins: grossWins,
      monthGrossLosses: grossLosses,
      tradingDaysCount: activeDaysSet.size,
      winDaysCount: winDaysSet.size,
      lossDaysCount: lossDaysSet.size,
      totalTradesCount: totalTrades,
      closedTradesCount: closedTrades,
    };
  }, [trades, currentMonthKey]);

  // Compute 6 weeks calendar grid + weekly aggregates
  const { weeks, daysInMonth } = useMemo(() => {
    // 0 = Sunday, 1 = Monday, etc.
    const firstDayIndex = new Date(year, month, 1).getDay();
    // Total days in current month (accounts for leap years)
    const totalDaysInMonth = new Date(year, month + 1, 0).getDate();

    const weeksList: Array<{
      weekNumber: number;
      days: Array<{ dayNum: number | null; inMonth: boolean; dateKey: string }>;
      weekPnl: number;
      activeDaysCount: number;
      tradesCount: number;
      winRate: number;
    }> = [];

    let currentDayCounter = 1 - firstDayIndex;

    for (let w = 0; w < 6; w++) {
      const daysRow: Array<{ dayNum: number | null; inMonth: boolean; dateKey: string }> = [];
      let weekPnl = 0;
      let activeDaysCount = 0;
      let weekTradesCount = 0;
      let weekWinTrades = 0;

      for (let d = 0; d < 7; d++) {
        if (currentDayCounter >= 1 && currentDayCounter <= totalDaysInMonth) {
          const dNum = currentDayCounter;
          const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(dNum).padStart(2, '0')}`;
          daysRow.push({ dayNum: dNum, inMonth: true, dateKey });

          const dTrades = tradesByDay[dNum] || [];
          const closed = dTrades.filter(t => t.status === 'CLOSED');
          if (dTrades.length > 0) {
            activeDaysCount++;
            weekTradesCount += dTrades.length;
            closed.forEach(t => {
              weekPnl += t.netPnl;
              if (t.netPnl > 0) weekWinTrades++;
            });
          }
        } else {
          daysRow.push({ dayNum: null, inMonth: false, dateKey: '' });
        }
        currentDayCounter++;
      }

      // Calculate approximate week number
      const sampleDay = daysRow.find(d => d.inMonth && d.dayNum !== null)?.dayNum || 1;
      const targetDate = new Date(year, month, sampleDay);
      const startOfYear = new Date(year, 0, 1);
      const pastDays = (targetDate.getTime() - startOfYear.getTime()) / 86400000;
      const weekNumber = Math.max(1, Math.ceil((pastDays + startOfYear.getDay() + 1) / 7));
      const winRate = weekTradesCount > 0 ? (weekWinTrades / weekTradesCount) * 100 : 0;

      // Only push week if it has at least one active day in this month
      if (daysRow.some(d => d.inMonth)) {
        weeksList.push({
          weekNumber,
          days: daysRow,
          weekPnl,
          activeDaysCount,
          tradesCount: weekTradesCount,
          winRate,
        });
      }
    }

    return { weeks: weeksList, daysInMonth: totalDaysInMonth };
  }, [year, month, tradesByDay]);

  // Navigation handlers
  const handlePrevMonth = () => {
    hasUserNavigated.current = true;
    setYearMonth(prev => {
      if (prev.month === 0) {
        return { year: prev.year - 1, month: 11 };
      }
      return { year: prev.year, month: prev.month - 1 };
    });
  };

  const handleNextMonth = () => {
    hasUserNavigated.current = true;
    setYearMonth(prev => {
      if (prev.month === 11) {
        return { year: prev.year + 1, month: 0 };
      }
      return { year: prev.year, month: prev.month + 1 };
    });
  };

  const handleThisMonth = () => {
    hasUserNavigated.current = true;
    setYearMonth(getYearMonth(new Date()));
  };

  const handleJumpToLatestTrades = () => {
    hasUserNavigated.current = true;
    setYearMonth(getLatestTradeMonth(trades));
  };

  // Compact currency formatter
  const formatCompactCurrency = (val: number) => {
    if (!showCompactPnL) {
      return formatCurrency(val);
    }
    const absVal = Math.abs(val);
    const sign = val < 0 ? '-' : val > 0 ? '+' : '';
    if (absVal >= 1000) {
      return `${sign}$${(absVal / 1000).toFixed(2).replace(/\.00$/, '')}K`;
    }
    return `${sign}$${absVal.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  };

  const formattedMonthTitle = formatMonthYear(year, month);
  const profitFactor = monthGrossLosses > 0 ? (monthGrossWins / monthGrossLosses).toFixed(2) : monthGrossWins > 0 ? '∞' : '—';
  const monthWinRate = tradingDaysCount > 0 ? Math.round((winDaysCount / tradingDaysCount) * 100) : 0;

  return (
    <div
      id="performance-calendar-card"
      className="tf-card p-4 sm:p-5 transition flex flex-col justify-between select-none"
    >
      {/* 1. Header Toolbar */}
      <div className={`flex flex-wrap items-center justify-between gap-3 pb-3.5 border-b mb-4 ${
        isLight ? 'border-slate-200' : 'border-[rgba(255,255,255,0.06)]'
      }`}>
        {/* Month Navigation */}
        <div className="flex items-center gap-2">
          <button
            id="btn-calendar-prev-month"
            onClick={handlePrevMonth}
            className={`p-1.5 rounded-md border transition cursor-pointer ${
              isLight
                ? 'border-slate-200 hover:bg-slate-100 text-slate-700'
                : 'border-[rgba(255,255,255,0.08)] bg-[#101116] hover:bg-[#181A21] text-slate-300 hover:text-white'
            }`}
            title="Previous Month"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <span
            id="calendar-current-month-heading"
            className={`text-sm sm:text-base font-bold min-w-[140px] text-center tracking-tight ${
              isLight ? 'text-slate-900' : 'text-slate-100'
            }`}
          >
            {formattedMonthTitle}
          </span>

          <button
            id="btn-calendar-next-month"
            onClick={handleNextMonth}
            className={`p-1.5 rounded-md border transition cursor-pointer ${
              isLight
                ? 'border-slate-200 hover:bg-slate-100 text-slate-700'
                : 'border-[rgba(255,255,255,0.08)] bg-[#101116] hover:bg-[#181A21] text-slate-300 hover:text-white'
            }`}
            title="Next Month"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <button
            id="btn-calendar-this-month"
            onClick={handleThisMonth}
            className={`text-xs font-semibold px-2.5 py-1 rounded-md border transition cursor-pointer ${
              isLight
                ? 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700'
                : 'border-[rgba(255,255,255,0.08)] bg-[#101116] hover:bg-[#181A21] text-slate-300 hover:text-white'
            }`}
          >
            Today
          </button>

          {/* Quick jump to months with trades if available */}
          {availableTradeMonths.length > 1 && (
            <select
              value={currentMonthKey}
              onChange={(e) => {
                hasUserNavigated.current = true;
                const [yStr, mStr] = e.target.value.split('-');
                setYearMonth({ year: parseInt(yStr, 10), month: parseInt(mStr, 10) - 1 });
              }}
              className={`text-xs font-medium px-2 py-1 rounded-md border outline-none cursor-pointer ${
                isLight
                  ? 'border-slate-200 bg-white text-slate-700'
                  : 'border-[rgba(255,255,255,0.08)] bg-[#101116] text-slate-300'
              }`}
            >
              {availableTradeMonths.map(key => {
                const [yStr, mStr] = key.split('-');
                const mIdx = parseInt(mStr, 10) - 1;
                return (
                  <option key={key} value={key}>
                    {MONTH_NAMES[mIdx]} {yStr}
                  </option>
                );
              })}
            </select>
          )}
        </div>

        {/* Right Header Stats & Actions */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Monthly Stats Badge */}
          <div className="flex items-center gap-2 text-xs">
            <span className={isLight ? 'text-slate-500 font-medium' : 'text-slate-400 font-medium'}>
              Month Net:
            </span>
            <span
              id="calendar-month-net-pnl"
              className={`font-mono font-bold px-2 py-0.5 rounded border ${
                monthNetPnl > 0
                  ? isLight
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : monthNetPnl < 0
                    ? isLight
                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                      : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                    : isLight
                      ? 'bg-slate-100 text-slate-700 border-slate-200'
                      : 'bg-slate-800 text-slate-300 border-slate-700'
              }`}
            >
              {monthNetPnl > 0 ? `+${formatCompactCurrency(monthNetPnl)}` : formatCompactCurrency(monthNetPnl)}
            </span>
            <span className={`font-mono text-[11px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
              ({tradingDaysCount} {tradingDaysCount === 1 ? 'day' : 'days'} • {totalTradesCount} trades)
            </span>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-1.5">
            <button
              id="btn-calendar-add-trade"
              onClick={() => setIsAddTradeOpen(true)}
              className={`p-1.5 rounded-md border transition cursor-pointer ${
                isLight
                  ? 'border-slate-200 hover:bg-slate-100 text-slate-700'
                  : 'border-[rgba(255,255,255,0.08)] bg-[#101116] hover:bg-[#181A21] text-slate-300 hover:text-white'
              }`}
              title="Add Trade"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>

            {/* Calendar Settings */}
            <div className="relative">
              <button
                id="btn-calendar-settings"
                onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                className={`p-1.5 rounded-md border transition cursor-pointer ${
                  isSettingsOpen
                    ? isLight ? 'bg-slate-200 text-slate-900' : 'bg-[#181A21] text-white'
                    : isLight ? 'border-slate-200 hover:bg-slate-100 text-slate-700' : 'border-[rgba(255,255,255,0.08)] bg-[#101116] hover:bg-[#181A21] text-slate-300'
                }`}
                title="Calendar Settings"
              >
                <Settings className="w-3.5 h-3.5" />
              </button>

              {isSettingsOpen && (
                <div className={`absolute right-0 mt-2 w-56 rounded-lg border p-3 shadow-xl z-30 space-y-2.5 ${
                  isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-[#14151C] border-[rgba(255,255,255,0.12)] text-slate-100 shadow-2xl'
                }`}>
                  <h4 className={`text-[10px] font-bold uppercase tracking-wider pb-1 border-b ${
                    isLight ? 'text-slate-500 border-slate-200' : 'text-slate-400 border-[rgba(255,255,255,0.08)]'
                  }`}>
                    Calendar Display
                  </h4>
                  <div className="space-y-2 text-xs">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={showCompactPnL}
                        onChange={(e) => setShowCompactPnL(e.target.checked)}
                        className="rounded text-blue-600 focus:ring-blue-500 h-3.5 w-3.5 cursor-pointer"
                      />
                      <span className="font-medium">Compact P&L Values</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={hideWeeklySummary}
                        onChange={(e) => setHideWeeklySummary(e.target.checked)}
                        className="rounded text-blue-600 focus:ring-blue-500 h-3.5 w-3.5 cursor-pointer"
                      />
                      <span className="font-medium">Hide Weekly Summaries</span>
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* Snapshot */}
            <button
              id="btn-calendar-snapshot"
              onClick={() => {
                addToast('Snapshot Exported', `Calendar view for ${formattedMonthTitle} recorded.`, 'success');
              }}
              className={`p-1.5 rounded-md border transition cursor-pointer ${
                isLight
                  ? 'border-slate-200 hover:bg-slate-100 text-slate-700'
                  : 'border-[rgba(255,255,255,0.08)] bg-[#101116] hover:bg-[#181A21] text-slate-300 hover:text-white'
              }`}
              title="Snapshot View"
            >
              <Camera className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 2. Zero trades notice if month is empty but trades exist in other months */}
      {tradingDaysCount === 0 && trades.length > 0 && (
        <div className={`mb-3.5 p-2.5 rounded-lg border flex items-center justify-between text-xs ${
          isLight ? 'bg-blue-50/60 border-blue-200 text-blue-800' : 'bg-blue-500/10 border-blue-500/20 text-blue-300'
        }`}>
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 shrink-0 text-blue-400" />
            <span>No trades in {formattedMonthTitle}. Trade history exists in other months.</span>
          </div>
          <button
            onClick={handleJumpToLatestTrades}
            className="font-semibold underline hover:no-underline ml-2 shrink-0 cursor-pointer"
          >
            Jump to latest trades →
          </button>
        </div>
      )}

      {/* 3. Main Calendar Layout: 7-Day Grid + Optional Weekly Summary Column */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-start">
        {/* Left Calendar Grid (7 columns) */}
        <div className={`${hideWeeklySummary ? 'md:col-span-12' : 'md:col-span-10'} space-y-1.5`}>
          {/* Day of Week Headers */}
          <div className="grid grid-cols-7 gap-1.5 text-center">
            {DAYS_OF_WEEK.map((day) => (
              <div
                key={day}
                className={`text-[11px] font-semibold py-1 uppercase tracking-wider ${
                  isLight ? 'text-slate-500' : 'text-slate-400'
                }`}
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Rows */}
          <div className="space-y-1.5">
            {weeks.map((week) => (
              <div key={week.weekNumber} className="grid grid-cols-7 gap-1.5">
                {week.days.map((slot, dIdx) => {
                  if (!slot.inMonth || slot.dayNum === null) {
                    return (
                      <div
                        key={`empty-${week.weekNumber}-${dIdx}`}
                        className={`min-h-[72px] sm:min-h-[82px] rounded-lg border border-dashed opacity-25 ${
                          isLight
                            ? 'bg-slate-50 border-slate-200'
                            : 'bg-[#080A0E] border-[rgba(255,255,255,0.04)]'
                        }`}
                      />
                    );
                  }

                  const dayNum = slot.dayNum;
                  const dayTrades = tradesByDay[dayNum] || [];
                  const closed = dayTrades.filter(t => t.status === 'CLOSED');
                  const dayPnl = closed.reduce((sum, t) => sum + t.netPnl, 0);
                  const winCount = closed.filter(t => t.netPnl > 0).length;
                  const lossCount = closed.filter(t => t.netPnl < 0).length;
                  const winRate = closed.length > 0 ? Math.round((winCount / closed.length) * 100) : 0;
                  const hasTrades = dayTrades.length > 0;
                  const isProfitable = dayPnl > 0;
                  const isLoss = dayPnl < 0;

                  // Today highlight check
                  const now = new Date();
                  const isToday =
                    now.getFullYear() === year &&
                    now.getMonth() === month &&
                    now.getDate() === dayNum;

                  return (
                    <div
                      key={`day-${dayNum}`}
                      id={`calendar-day-cell-${dayNum}`}
                      onClick={() => {
                        if (hasTrades) {
                          setSelectedDayTrades({
                            date: `${MONTH_NAMES[month]} ${dayNum}, ${year}`,
                            dateObj: new Date(year, month, dayNum),
                            trades: dayTrades,
                          });
                        }
                      }}
                      className={`min-h-[72px] sm:min-h-[82px] p-2 rounded-lg border transition-all duration-150 flex flex-col justify-between relative group ${
                        hasTrades
                          ? isProfitable
                            ? isLight
                              ? 'bg-emerald-50/80 border-emerald-300 hover:border-emerald-500 hover:shadow-md cursor-pointer'
                              : 'bg-emerald-950/20 border-emerald-500/30 hover:border-emerald-500/60 hover:bg-emerald-950/30 cursor-pointer'
                            : isLoss
                              ? isLight
                                ? 'bg-rose-50/80 border-rose-300 hover:border-rose-500 hover:shadow-md cursor-pointer'
                                : 'bg-rose-950/20 border-rose-500/30 hover:border-rose-500/60 hover:bg-rose-950/30 cursor-pointer'
                              : isLight
                                ? 'bg-slate-100 border-slate-300 hover:border-slate-400 cursor-pointer'
                                : 'bg-[#141720] border-[rgba(255,255,255,0.12)] hover:border-[rgba(255,255,255,0.25)] cursor-pointer'
                          : isLight
                            ? 'bg-white border-slate-200 text-slate-400'
                            : 'bg-[#0E1015] border-[rgba(255,255,255,0.05)] text-slate-500'
                      } ${isToday ? isLight ? 'ring-2 ring-blue-500 ring-offset-1 ring-offset-white' : 'ring-2 ring-blue-500 ring-offset-1 ring-offset-[#0A0C10]' : ''}`}
                    >
                      {/* Day Header: Left Event Icon / Today Dot + Right Day Number */}
                      <div className="flex items-center justify-between">
                        {isToday ? (
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500" title="Today" />
                        ) : hasTrades ? (
                          <span
                            className={`p-0.5 rounded text-[9px] font-mono font-semibold ${
                              isProfitable
                                ? isLight ? 'text-emerald-700' : 'text-emerald-400'
                                : isLoss
                                  ? isLight ? 'text-rose-700' : 'text-rose-400'
                                  : isLight ? 'text-slate-600' : 'text-slate-400'
                            }`}
                          >
                            {dayTrades.length}T
                          </span>
                        ) : (
                          <div className="w-2" />
                        )}

                        <span
                          className={`text-[10px] sm:text-xs font-bold ${
                            hasTrades
                              ? isLight ? 'text-slate-900' : 'text-white'
                              : isLight ? 'text-slate-400' : 'text-slate-500'
                          }`}
                        >
                          {dayNum}
                        </span>
                      </div>

                      {/* Day Content: Net P&L + win rate */}
                      {hasTrades ? (
                        <div className="space-y-0.5 text-center my-auto">
                          <div
                            className={`text-xs sm:text-sm font-mono font-bold tracking-tight truncate ${
                              isProfitable
                                ? isLight ? 'text-emerald-600' : 'text-emerald-400'
                                : isLoss
                                  ? isLight ? 'text-rose-600' : 'text-rose-400'
                                  : isLight ? 'text-slate-700' : 'text-slate-300'
                            }`}
                          >
                            {dayPnl > 0 ? `+${formatCompactCurrency(dayPnl)}` : formatCompactCurrency(dayPnl)}
                          </div>

                          <div className={`text-[9px] font-mono leading-tight truncate ${
                            isLight ? 'text-slate-600' : 'text-slate-400'
                          }`}>
                            <span>{winRate}% win</span>
                          </div>
                        </div>
                      ) : (
                        <div className="h-4 sm:h-5" />
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Right Weekly Summary Column */}
        {!hideWeeklySummary && (
          <div className="md:col-span-2 space-y-1.5 pt-6">
            {weeks.map((week) => {
              const isPositive = week.weekPnl > 0;
              const isNegative = week.weekPnl < 0;

              return (
                <div
                  key={`summary-${week.weekNumber}`}
                  className={`min-h-[72px] sm:min-h-[82px] p-2.5 rounded-lg border flex flex-col justify-center text-center transition-all ${
                    isLight
                      ? 'bg-slate-50 border-slate-200'
                      : 'bg-[#0E1015] border-[rgba(255,255,255,0.06)]'
                  }`}
                >
                  <span className={`text-[10px] uppercase font-semibold tracking-wider ${
                    isLight ? 'text-slate-500' : 'text-slate-400'
                  }`}>
                    Week {week.weekNumber}
                  </span>

                  <div
                    className={`text-xs sm:text-sm font-mono font-bold my-0.5 ${
                      isPositive
                        ? isLight ? 'text-emerald-600' : 'text-emerald-400'
                        : isNegative
                          ? isLight ? 'text-rose-600' : 'text-rose-400'
                          : isLight ? 'text-slate-600' : 'text-slate-400'
                    }`}
                  >
                    {week.weekPnl !== 0
                      ? week.weekPnl > 0 ? `+${formatCompactCurrency(week.weekPnl)}` : formatCompactCurrency(week.weekPnl)
                      : '—'}
                  </div>

                  <span className={`text-[9px] font-mono ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                    {week.tradesCount > 0 ? `${week.tradesCount} trades • ${week.activeDaysCount}d` : 'No trades'}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. Day Details Modal (Opens on day click) */}
      {selectedDayTrades && (
        <CalendarDayDetailsModal
          dateStr={selectedDayTrades.date}
          dateObj={selectedDayTrades.dateObj}
          trades={selectedDayTrades.trades}
          onClose={() => setSelectedDayTrades(null)}
          onSelectTrade={onSelectTrade}
        />
      )}
    </div>
  );
};
