import React, { useState, useMemo } from 'react';
import { Trade } from '../../types';
import { useTrading } from '../../context/TradingContext';

interface DailyPnlBarChartProps {
  trades: Trade[];
  formatCurrency: (val: number) => string;
}

interface BarData {
  dateKey: string;
  displayDate: string;
  pnl: number;
  tradeCount: number;
  wins: number;
  losses: number;
}

export const DailyPnlBarChart: React.FC<DailyPnlBarChartProps> = ({ trades, formatCurrency }) => {
  const { theme } = useTrading();
  const [hoveredBar, setHoveredBar] = useState<BarData | null>(null);

  const isLight = theme === 'light';

  // Group trades by date
  const bars: BarData[] = useMemo(() => {
    const closed = trades.filter(t => t.status === 'CLOSED');
    if (closed.length === 0) return [];

    const map: { [dateStr: string]: { pnl: number; count: number; wins: number; losses: number; rawDate: string } } = {};

    closed.forEach(t => {
      if (!t.entryDate) return;
      const d = t.entryDate.split('T')[0];
      if (!map[d]) {
        map[d] = { pnl: 0, count: 0, wins: 0, losses: 0, rawDate: t.entryDate };
      }
      map[d].pnl += t.netPnl;
      map[d].count += 1;
      if (t.netPnl > 0) map[d].wins += 1;
      else if (t.netPnl < 0) map[d].losses += 1;
    });

    const sortedDates = Object.keys(map).sort(
      (a, b) => new Date(a).getTime() - new Date(b).getTime()
    );

    return sortedDates.map(d => {
      const dateObj = new Date(map[d].rawDate);
      return {
        dateKey: d,
        displayDate: dateObj.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' }),
        pnl: map[d].pnl,
        tradeCount: map[d].count,
        wins: map[d].wins,
        losses: map[d].losses,
      };
    });
  }, [trades]);

  // Decide how often to show labels based on total count to prevent overlapping
  const labelInterval = useMemo(() => {
    const total = bars.length;
    if (total > 20) return 4;
    if (total > 14) return 3;
    if (total > 8) return 2;
    return 1;
  }, [bars]);

  if (bars.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[210px] text-slate-500 text-xs">
        <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center mb-2">
          <span className="text-slate-400 font-mono">📊</span>
        </div>
        <span>No daily trade distribution available</span>
      </div>
    );
  }

  const maxAbs = Math.max(150, ...bars.map(b => Math.abs(b.pnl)));

  return (
    <div className="relative w-full h-[220px] flex flex-col justify-between select-none">
      {/* Bars Container */}
      <div className={`flex-1 flex items-center justify-between px-3 pt-4 pb-2 ${
        bars.length > 15 ? 'gap-0.5' : bars.length > 8 ? 'gap-1' : 'gap-1.5'
      }`}>
        {bars.map((bar, idx) => {
          const isPos = bar.pnl >= 0;
          const heightPercent = Math.max(8, (Math.abs(bar.pnl) / maxAbs) * 85);

          return (
            <div
              key={idx}
              className="flex-1 flex flex-col items-center justify-center h-full relative group cursor-pointer min-w-0"
              onMouseEnter={() => setHoveredBar(bar)}
              onMouseLeave={() => setHoveredBar(null)}
            >
              {/* Split Upper & Lower for zero-centered bars */}
              <div className="w-full h-full flex flex-col justify-center items-center">
                {/* Positive (Top) */}
                {isPos ? (
                  <div className="w-full flex flex-col items-center justify-end h-1/2">
                    <div
                      style={{ height: `${heightPercent}%` }}
                      className="w-full max-w-[14px] rounded-t-sm transition-all bg-emerald-500 hover:opacity-90"
                    />
                  </div>
                ) : (
                  <div className="w-full h-1/2" />
                )}

                {/* Zero baseline line */}
                <div className={`w-full h-[1px] ${isLight ? 'bg-slate-200' : 'bg-[rgba(255,255,255,0.08)]'}`} />

                {/* Negative (Bottom) */}
                {!isPos ? (
                  <div className="w-full flex flex-col items-center justify-start h-1/2">
                    <div
                      style={{ height: `${heightPercent}%` }}
                      className="w-full max-w-[14px] rounded-b-sm transition-all bg-rose-500 hover:opacity-90"
                    />
                  </div>
                ) : (
                  <div className="w-full h-1/2" />
                )}
              </div>

              {/* Date label */}
              {idx % labelInterval === 0 ? (
                <span className={`text-[9px] mt-1 font-mono whitespace-nowrap ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                  {bar.displayDate}
                </span>
              ) : (
                <span className="text-[9px] mt-1 font-mono h-3" />
              )}
            </div>
          );
        })}
      </div>

      {/* Hover tooltip */}
      {hoveredBar && (
        <div
          className="absolute top-1 right-4 px-3.5 py-2 rounded-xl text-xs z-20 pointer-events-none animate-in fade-in glass-tooltip"
        >
          <div className={`text-[10px] font-semibold flex items-center justify-between gap-4 border-b pb-1 ${
            isLight ? 'border-slate-200 text-slate-500' : 'border-white/10 text-slate-400'
          }`}>
            <span className="font-sans">{hoveredBar.dateKey}</span>
            <span className={`px-1.5 py-0.2 rounded font-mono text-[9px] font-semibold border ${
              isLight ? 'bg-slate-100 text-slate-700 border-slate-200' : 'bg-white/[0.06] text-slate-300 border-white/10'
            }`}>
              {hoveredBar.tradeCount} trades
            </span>
          </div>
          <div className="mt-1.5 flex items-center justify-between gap-4 font-mono tabular-nums">
            <span className={`text-[11px] font-sans ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Net P&L:</span>
            <span className={`text-[12px] font-bold ${hoveredBar.pnl >= 0 ? (isLight ? 'text-emerald-600' : 'text-emerald-400') : (isLight ? 'text-rose-600' : 'text-rose-400')}`}>
              {hoveredBar.pnl >= 0 ? '+' : ''}{formatCurrency(hoveredBar.pnl)}
            </span>
          </div>
          <div className="text-[10px] text-slate-400 mt-1 flex items-center justify-between gap-2 font-mono tabular-nums border-t pt-1 border-white/5">
            <span className="text-[9px] font-sans text-slate-500">Record:</span>
            <span className="space-x-1.5">
              <span className={isLight ? 'text-emerald-600 font-semibold' : 'text-emerald-400 font-semibold'}>{hoveredBar.wins}W</span>
              <span>•</span>
              <span className={isLight ? 'text-rose-600 font-semibold' : 'text-rose-400 font-semibold'}>{hoveredBar.losses}L</span>
            </span>
          </div>
        </div>
      )}

      {/* Bottom Summary Bar */}
      <div className={`flex justify-between px-3 text-[10px] border-t pt-1.5 font-mono tabular-nums ${
        isLight ? 'text-slate-500 border-slate-100' : 'text-slate-400 border-[rgba(255,255,255,0.06)]'
      }`}>
        <span>{bars.length} Trading Days</span>
        <span className={isLight ? 'text-slate-800' : 'text-slate-200'}>
          Peak Session Range: <strong className={isLight ? 'text-emerald-600' : 'text-emerald-400'}>+{formatCurrency(Math.round(maxAbs))}</strong>
        </span>
      </div>
    </div>
  );
};
