import React, { useState, useEffect, useMemo } from 'react';
import { Trade } from '../../types';
import { CheckSquare, Square, X, CalendarCheck2, Trophy } from 'lucide-react';
import { DashboardInfoTooltip } from './DashboardInfoTooltip';
import { useTrading } from '../../context/TradingContext';
import { fetchDailyChecklist, saveDailyChecklistItemApi, saveDailyChecklistBulkApi } from '../../services/apiClient';
import { toISODateKey, safeFormatDate } from '../../utils/dateUtils';
import { CalendarDayDetailsModal } from './CalendarDayDetailsModal';

interface ProgressTrackerCardProps {
  trades: Trade[];
  formatCurrency: (val: number) => string;
  onViewCalendar?: () => void;
  onSelectTrade?: (trade: Trade) => void;
}

interface ChecklistItem {
  id: string;
  label: string;
  category: string;
}

const CHECKLIST_ITEMS: ChecklistItem[] = [
  { id: 'plan', label: 'Followed trading plan & A+ playbook setup criteria', category: 'Execution' },
  { id: 'risk', label: 'Respected max daily risk limits & position sizing', category: 'Risk' },
  { id: 'overtrade', label: 'Did not overtrade, chase price, or revenge trade', category: 'Psychology' },
  { id: 'journal', label: 'Journaled trade thesis, emotions, and exit reasons', category: 'Process' },
  { id: 'review', label: 'Reviewed daily metrics and tagged execution quality', category: 'Growth' },
];

export const ProgressTrackerCard: React.FC<ProgressTrackerCardProps> = ({
  trades,
  formatCurrency,
  onSelectTrade,
}) => {
  const { theme, authUser } = useTrading();
  const isLight = theme === 'light';
  const userId = authUser?.id || (authUser as any)?.uid || null;

  const [isChecklistOpen, setIsChecklistOpen] = useState(false);
  const [selectedDayData, setSelectedDayData] = useState<{
    dateStr: string;
    dateObj: Date;
    trades: Trade[];
  } | null>(null);

  const [hoveredCell, setHoveredCell] = useState<{
    dateStr: string;
    tradeCount: number;
    netPnl: number;
    winRate: number;
  } | null>(null);

  // Today's date string YYYY-MM-DD
  const todayKey = useMemo(() => toISODateKey(new Date()) || new Date().toISOString().split('T')[0], []);

  // Daily checklist state
  const [completedItems, setCompletedItems] = useState<string[]>(['plan']);

  // Fetch from PostgreSQL and perform legacy localStorage migration if logged in
  useEffect(() => {
    let isMounted = true;

    async function loadAndMigrate() {
      if (!userId) {
        try {
          const saved = localStorage.getItem(`df_checklist_${todayKey}`);
          if (saved && isMounted) {
            setCompletedItems(JSON.parse(saved));
          }
        } catch {
          // ignore
        }
        return;
      }

      const dbItems = await fetchDailyChecklist(todayKey);
      const migrationMarker = `duskflow_checklist_cloudsql_migrated_v1_${userId}`;
      const hasMigrated = localStorage.getItem(migrationMarker);

      if (!hasMigrated) {
        try {
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('df_checklist_')) {
              const dateStr = key.replace('df_checklist_', '');
              const valStr = localStorage.getItem(key);
              if (valStr && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
                try {
                  const items = JSON.parse(valStr);
                  if (Array.isArray(items)) {
                    await saveDailyChecklistBulkApi(dateStr, items);
                  }
                } catch (e) {
                  console.warn('Error parsing legacy checklist key:', key, e);
                }
              }
            }
          }

          localStorage.setItem(migrationMarker, 'true');

          const keysToDelete: string[] = [];
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('df_checklist_')) {
              keysToDelete.push(key);
            }
          }
          keysToDelete.forEach(k => localStorage.removeItem(k));

          const freshDbItems = await fetchDailyChecklist(todayKey);
          if (isMounted) {
            setCompletedItems(freshDbItems.length > 0 ? freshDbItems : ['plan']);
          }
        } catch (err) {
          console.error('Checklist migration failed:', err);
          if (isMounted) {
            setCompletedItems(dbItems.length > 0 ? dbItems : ['plan']);
          }
        }
      } else {
        if (isMounted) {
          setCompletedItems(dbItems.length > 0 ? dbItems : ['plan']);
        }
      }
    }

    loadAndMigrate();

    return () => {
      isMounted = false;
    };
  }, [userId, todayKey]);

  const toggleItem = async (id: string) => {
    const isCompleted = completedItems.includes(id);
    const updated = isCompleted
      ? completedItems.filter(item => item !== id)
      : [...completedItems, id];

    setCompletedItems(updated);

    try {
      localStorage.setItem(`df_checklist_${todayKey}`, JSON.stringify(updated));
    } catch {}

    if (userId) {
      try {
        await saveDailyChecklistItemApi(id, todayKey, !isCompleted);
      } catch {
        // Handled silently by local-first cache
      }
    }
  };

  // Group trade history by date (using safe date key)
  const { tradeMap, tradesByDate } = useMemo(() => {
    const map: { [dateStr: string]: { count: number; netPnl: number; wins: number } } = {};
    const listMap: { [dateStr: string]: Trade[] } = {};

    trades.forEach(t => {
      if (!t.entryDate) return;
      const key = toISODateKey(t.entryDate);
      if (!key) return;

      if (!map[key]) {
        map[key] = { count: 0, netPnl: 0, wins: 0 };
        listMap[key] = [];
      }
      map[key].count += 1;
      map[key].netPnl += t.netPnl;
      if (t.netPnl > 0) map[key].wins += 1;
      listMap[key].push(t);
    });

    return { tradeMap: map, tradesByDate: listMap };
  }, [trades]);

  // Generate calendar grid for past 11 weeks (77 days)
  const { weeks, monthHeaders } = useMemo(() => {
    const today = new Date();
    // Anchor to Sunday 10 weeks ago
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - (10 * 7 + today.getDay()));
    startDate.setHours(0, 0, 0, 0);

    const weeksList: Array<Array<{
      date: Date;
      dateKey: string;
      formattedDate: string;
      tradeCount: number;
      netPnl: number;
      winRate: number;
      trades: Trade[];
    }>> = [];

    const monthStarts: Array<{ name: string; weekIndex: number }> = [];
    let lastMonth = -1;

    for (let w = 0; w < 11; w++) {
      const weekDays: Array<{
        date: Date;
        dateKey: string;
        formattedDate: string;
        tradeCount: number;
        netPnl: number;
        winRate: number;
        trades: Trade[];
      }> = [];

      for (let d = 0; d < 7; d++) {
        const cellDate = new Date(startDate);
        cellDate.setDate(startDate.getDate() + w * 7 + d);

        const currentMonth = cellDate.getMonth();
        if (currentMonth !== lastMonth && d <= 3) {
          monthStarts.push({
            name: cellDate.toLocaleDateString('en-US', { month: 'short' }),
            weekIndex: w,
          });
          lastMonth = currentMonth;
        }

        const dateKey = toISODateKey(cellDate);
        const data = tradeMap[dateKey];
        const count = data ? data.count : 0;
        const pnl = data ? data.netPnl : 0;
        const winRate = count > 0 ? (data.wins / count) * 100 : 0;
        const dayTradesList = tradesByDate[dateKey] || [];

        weekDays.push({
          date: cellDate,
          dateKey,
          formattedDate: safeFormatDate(cellDate, '—', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          }),
          tradeCount: count,
          netPnl: pnl,
          winRate,
          trades: dayTradesList,
        });
      }
      weeksList.push(weekDays);
    }

    return { weeks: weeksList, monthHeaders: monthStarts };
  }, [tradeMap, tradesByDate]);

  const daysOfWeek = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  // Intensity color mapper with semantic P&L awareness
  const getCellColor = (count: number, pnl: number) => {
    if (count === 0) {
      return isLight
        ? 'bg-slate-100/90 border-slate-200 hover:border-slate-300'
        : 'bg-[#10131B] border-[rgba(255,255,255,0.05)] hover:border-[rgba(255,255,255,0.15)]';
    }

    if (pnl > 0) {
      if (count === 1) {
        return isLight ? 'bg-emerald-100 border-emerald-300' : 'bg-emerald-500/25 border-emerald-500/40';
      }
      if (count === 2) {
        return isLight ? 'bg-emerald-300 border-emerald-400' : 'bg-emerald-500/50 border-emerald-500/60';
      }
      if (count <= 4) {
        return isLight ? 'bg-emerald-500 border-emerald-600' : 'bg-emerald-500/80 border-emerald-400';
      }
      return 'bg-emerald-600 border-emerald-400 text-white';
    }

    if (pnl < 0) {
      if (count === 1) {
        return isLight ? 'bg-rose-100 border-rose-300' : 'bg-rose-500/25 border-rose-500/40';
      }
      if (count === 2) {
        return isLight ? 'bg-rose-300 border-rose-400' : 'bg-rose-500/50 border-rose-500/60';
      }
      if (count <= 4) {
        return isLight ? 'bg-rose-500 border-rose-600' : 'bg-rose-500/80 border-rose-400';
      }
      return 'bg-rose-600 border-rose-400 text-white';
    }

    // Breakeven (0 P&L with trades)
    return isLight ? 'bg-blue-200 border-blue-300' : 'bg-blue-500/30 border-blue-500/40';
  };

  const todayScore = completedItems.length;

  return (
    <div className="flex flex-col justify-between w-full h-full pt-1 pb-1 select-none">
      {/* Heatmap Area */}
      <div className="relative">
        {/* Month Headers */}
        <div className="flex text-[10px] font-mono text-slate-400 pl-6 mb-1.5 h-4 relative">
          {monthHeaders.map((m, idx) => (
            <span
              key={`${m.name}-${idx}`}
              className="absolute text-slate-400 font-medium"
              style={{ left: `calc(1.5rem + ${m.weekIndex * 9.09}%)` }}
            >
              {m.name}
            </span>
          ))}
        </div>

        {/* Heatmap Grid (Sun-Sat rows x Week columns) */}
        <div className="flex gap-1.5 items-start">
          {/* Day of Week Labels */}
          <div className={`flex flex-col gap-1 text-[9px] font-mono pr-1 pt-0.5 select-none w-5 ${
            isLight ? 'text-slate-400' : 'text-slate-500'
          }`}>
            {daysOfWeek.map((d, i) => (
              <span key={`${d}-${i}`} className="h-3 sm:h-3.5 leading-none flex items-center justify-end">
                {i % 2 === 1 ? d : ''}
              </span>
            ))}
          </div>

          {/* Grid Columns */}
          <div className="flex-1 grid grid-cols-11 gap-1">
            {weeks.map((week, wIdx) => (
              <div key={wIdx} className="flex flex-col gap-1">
                {week.map((day, dIdx) => (
                  <button
                    key={dIdx}
                    type="button"
                    onClick={() => {
                      if (day.tradeCount > 0) {
                        setSelectedDayData({
                          dateStr: day.formattedDate,
                          dateObj: day.date,
                          trades: day.trades,
                        });
                      }
                    }}
                    onMouseEnter={() =>
                      setHoveredCell({
                        dateStr: day.formattedDate,
                        tradeCount: day.tradeCount,
                        netPnl: day.netPnl,
                        winRate: day.winRate,
                      })
                    }
                    onMouseLeave={() => setHoveredCell(null)}
                    className={`w-full aspect-square rounded-[3px] border transition-transform hover:scale-125 cursor-pointer ${getCellColor(
                      day.tradeCount,
                      day.netPnl
                    )}`}
                    title={`${day.formattedDate}: ${day.tradeCount} trades, ${formatCurrency(day.netPnl)}`}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Heatmap Legend (Less -> More with Green/Red cues) */}
        <div className={`flex items-center justify-between mt-2.5 text-[9px] font-mono ${
          isLight ? 'text-slate-500' : 'text-slate-400'
        }`}>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 text-[9px]">
              <span className="w-2 h-2 rounded-xs bg-emerald-500/80 inline-block" />
              <span>Profit</span>
            </span>
            <span className="flex items-center gap-1 text-[9px]">
              <span className="w-2 h-2 rounded-xs bg-rose-500/80 inline-block" />
              <span>Loss</span>
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span>Less</span>
            <div className={`w-2 h-2 rounded-xs ${isLight ? 'bg-slate-100 border border-slate-200' : 'bg-[#10131B] border border-[rgba(255,255,255,0.05)]'}`} />
            <div className={`w-2 h-2 rounded-xs ${isLight ? 'bg-emerald-200' : 'bg-emerald-500/30'}`} />
            <div className={`w-2 h-2 rounded-xs ${isLight ? 'bg-emerald-400' : 'bg-emerald-500/60'}`} />
            <div className={`w-2 h-2 rounded-xs ${isLight ? 'bg-emerald-600' : 'bg-emerald-500'}`} />
            <span>More</span>
          </div>
        </div>

        {/* Floating Cell Tooltip */}
        {hoveredCell && (
          <div className={`absolute -top-1 right-0 px-2.5 py-1.5 rounded-lg text-xs shadow-xl z-30 pointer-events-none animate-in fade-in border ${
            isLight
              ? 'bg-white border-slate-200 text-slate-900 shadow-slate-200/50'
              : 'bg-[#0E121A] border-[rgba(255,255,255,0.12)] text-slate-100 shadow-black/60'
          }`}>
            <div className="font-semibold text-[11px]">{hoveredCell.dateStr}</div>
            <div className="flex items-center gap-1.5 mt-0.5 text-[10px] font-mono">
              <span className="text-slate-400">{hoveredCell.tradeCount} trades</span>
              <span className="text-slate-600">•</span>
              <span className={`font-semibold ${hoveredCell.netPnl >= 0 ? (isLight ? 'text-emerald-600' : 'text-emerald-400') : (isLight ? 'text-rose-600' : 'text-rose-400')}`}>
                {formatCurrency(hoveredCell.netPnl)}
              </span>
              {hoveredCell.tradeCount > 0 && (
                <>
                  <span className="text-slate-600">•</span>
                  <span className="text-blue-400">{hoveredCell.winRate.toFixed(0)}% Win</span>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Row: Today's Score & Daily Checklist button */}
      <div className={`mt-3 pt-2.5 border-t flex items-center justify-between gap-3 ${
        isLight ? 'border-slate-200' : 'border-[rgba(255,255,255,0.06)]'
      }`}>
        <div className="flex-1">
          <div className="flex items-center gap-1 text-[11px] text-slate-400 mb-1">
            <span>Today's discipline</span>
            <DashboardInfoTooltip
              info={{
                title: "Today's Discipline Score",
                description: 'Measures compliance with your daily trading checklist and execution rules.',
                interpretation: '5/5 score indicates 100% adherence to risk management, trade journaling, and mental discipline.',
              }}
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-xs text-slate-200">
              {todayScore}/5
            </span>
            <div className={`h-1.5 flex-1 max-w-[120px] rounded-full overflow-hidden ${
              isLight ? 'bg-slate-200' : 'bg-[#151922]'
            }`}>
              <div
                className="h-full bg-blue-500 rounded-full transition-all duration-300"
                style={{ width: `${(todayScore / 5) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Daily Checklist Button */}
        <button
          onClick={() => setIsChecklistOpen(true)}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium transition cursor-pointer ${
            isLight
              ? 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
              : 'border-[rgba(255,255,255,0.08)] bg-[#12161F] hover:bg-[#181D28] text-slate-300 hover:text-white'
          }`}
        >
          <CalendarCheck2 className="w-3.5 h-3.5 text-blue-400" />
          <span>Checklist</span>
        </button>
      </div>

      {/* Daily Checklist Modal */}
      {isChecklistOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in"
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsChecklistOpen(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            className={`w-full max-w-md rounded-2xl border p-5 shadow-2xl space-y-4 ${
              isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-[#0E1118] border-[rgba(255,255,255,0.08)] text-slate-100'
            }`}
          >
            <div className={`flex items-center justify-between pb-3 border-b ${
              isLight ? 'border-slate-200' : 'border-[rgba(255,255,255,0.06)]'
            }`}>
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  <Trophy className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-100">Daily Execution Checklist</h3>
                  <p className="text-[10px] font-mono text-slate-400">Today: {todayKey}</p>
                </div>
              </div>
              <button
                onClick={() => setIsChecklistOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Checklist Items */}
            <div className="space-y-2">
              {CHECKLIST_ITEMS.map(item => {
                const isChecked = completedItems.includes(item.id);
                return (
                  <div
                    key={item.id}
                    onClick={() => toggleItem(item.id)}
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition select-none ${
                      isChecked
                        ? isLight
                          ? 'bg-blue-50 border-blue-200 text-blue-900'
                          : 'bg-blue-500/10 border-blue-500/25 text-slate-100'
                        : isLight
                        ? 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300'
                        : 'bg-[#121620] border-[rgba(255,255,255,0.05)] text-slate-300 hover:border-[rgba(255,255,255,0.12)]'
                    }`}
                  >
                    <div className="mt-0.5">
                      {isChecked ? (
                        <CheckSquare className="w-4 h-4 shrink-0 text-blue-400" />
                      ) : (
                        <Square className="w-4 h-4 shrink-0 text-slate-500" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium">{item.label}</span>
                        <span className={`text-[9px] font-mono font-semibold px-1.5 py-0.2 rounded ${
                          isLight ? 'text-slate-600 bg-slate-200' : 'text-slate-400 bg-[#161B26]'
                        }`}>
                          {item.category}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Progress Footer */}
            <div className={`pt-3 border-t flex items-center justify-between ${
              isLight ? 'border-slate-200' : 'border-[rgba(255,255,255,0.06)]'
            }`}>
              <div className="text-xs text-slate-400">
                Discipline: <strong className="font-mono text-blue-400">{todayScore} / 5</strong>
              </div>
              <button
                onClick={() => setIsChecklistOpen(false)}
                className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition cursor-pointer"
              >
                Save & Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Selected Day Details Modal */}
      {selectedDayData && (
        <CalendarDayDetailsModal
          dateStr={selectedDayData.dateStr}
          dateObj={selectedDayData.dateObj}
          trades={selectedDayData.trades}
          onClose={() => setSelectedDayData(null)}
          onSelectTrade={onSelectTrade}
        />
      )}
    </div>
  );
};
