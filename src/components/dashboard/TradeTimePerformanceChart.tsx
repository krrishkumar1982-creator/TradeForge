import React, { useState, useMemo, useRef } from 'react';
import { Trade } from '../../types';
import { useTrading } from '../../context/TradingContext';
import { Info, Settings, Sparkles, TrendingUp, TrendingDown, Clock } from 'lucide-react';
import { DashboardInfoTooltip, METRIC_INFOS } from './DashboardInfoTooltip';
import { parseSafeDate, safeFormatDate } from '../../utils/dateUtils';

interface TradeTimePerformanceChartProps {
  trades: Trade[];
  formatCurrency: (val: number) => string;
  onSelectTrade?: (trade: Trade) => void;
}

interface ScatterPoint {
  trade: Trade;
  timeMinutes: number; // 0 to 1440 minutes in a day
  timeLabel: string;
  pnl: number;
  isWin: boolean;
  isLoss: boolean;
  x: number; // percentage (0 to 100)
  y: number; // percentage (0 to 100)
}

export const TradeTimePerformanceChart: React.FC<TradeTimePerformanceChartProps> = ({
  trades,
  formatCurrency,
  onSelectTrade,
}) => {
  const { theme } = useTrading();
  const [hoveredPoint, setHoveredPoint] = useState<ScatterPoint | null>(null);
  const [filterSession, setFilterSession] = useState<'ALL' | 'NY' | 'LONDON' | 'ASIA'>('ALL');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Time Axis markers: 0:00, 2:00, 4:00, 6:00, 8:00, 10:00, 12:00, 14:00, 16:00, 18:00, 20:00, 22:00, 0:00 (matching screenshot)
  const timeLabels = [
    { label: '0:00', minutes: 0 },
    { label: '2:00', minutes: 120 },
    { label: '4:00', minutes: 240 },
    { label: '6:00', minutes: 360 },
    { label: '8:00', minutes: 480 },
    { label: '10:00', minutes: 600 },
    { label: '12:00', minutes: 720 },
    { label: '14:00', minutes: 840 },
    { label: '16:00', minutes: 960 },
    { label: '18:00', minutes: 1080 },
    { label: '20:00', minutes: 1200 },
    { label: '22:00', minutes: 1320 },
    { label: '0:00', minutes: 1440 },
  ];

  // Process closed trades into scatter data
  const { points, yTicks, minPnl, maxPnl, totalWins, totalLosses } = useMemo(() => {
    const closed = trades.filter(t => t.status === 'CLOSED');
    if (closed.length === 0) {
      return {
        points: [],
        yTicks: [-2000, -1000, 0, 1000, 2000, 3000, 4000, 5000, 6000],
        minPnl: -2000,
        maxPnl: 6000,
        totalWins: 0,
        totalLosses: 0,
      };
    }

    let min = 0;
    let max = 0;
    let wins = 0;
    let losses = 0;

    const rawPoints = closed.map(trade => {
      let hours = 9;
      let minutes = 30;
      const d = parseSafeDate(trade.entryDate || trade.exitDate);
      if (d) {
        hours = d.getHours();
        minutes = d.getMinutes();
      }
      const totalMinutes = hours * 60 + minutes;
      const formattedTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;

      if (trade.netPnl > max) max = trade.netPnl;
      if (trade.netPnl < min) min = trade.netPnl;
      if (trade.netPnl > 0) wins++;
      if (trade.netPnl < 0) losses++;

      return {
        trade,
        timeMinutes: totalMinutes,
        timeLabel: formattedTime,
        pnl: trade.netPnl,
        isWin: trade.netPnl > 0,
        isLoss: trade.netPnl < 0,
      };
    });

    // Provide symmetric / clean bounds
    const cleanMax = Math.max(1000, Math.ceil(max / 1000) * 1000);
    const cleanMin = Math.min(-500, Math.floor(min / 1000) * 1000);

    // Generate 5-7 step Y ticks
    const step = Math.max(500, Math.ceil((cleanMax - cleanMin) / 6 / 100) * 100);
    const ticks: number[] = [];
    for (let val = cleanMin; val <= cleanMax; val += step) {
      ticks.push(val);
    }
    if (!ticks.includes(0)) ticks.push(0);
    ticks.sort((a, b) => b - a); // descending for top-to-bottom

    const range = cleanMax - cleanMin || 1;

    const calculatedPoints: ScatterPoint[] = rawPoints.map(p => {
      // X maps 0 to 1440 minutes (0 to 100%)
      const x = (p.timeMinutes / 1440) * 100;
      // Y maps cleanMax (0%) to cleanMin (100%)
      const y = ((cleanMax - p.pnl) / range) * 100;
      return {
        ...p,
        x: Math.max(2, Math.min(98, x)),
        y: Math.max(2, Math.min(98, y)),
      };
    });

    return {
      points: calculatedPoints,
      yTicks: ticks,
      minPnl: cleanMin,
      maxPnl: cleanMax,
      totalWins: wins,
      totalLosses: losses,
    };
  }, [trades]);

  // Zero-line Y percentage
  const zeroY = useMemo(() => {
    const range = maxPnl - minPnl || 1;
    return ((maxPnl - 0) / range) * 100;
  }, [maxPnl, minPnl]);

  const filteredPoints = useMemo(() => {
    if (filterSession === 'ALL') return points;
    return points.filter(p => {
      const session = p.trade.session?.toLowerCase() || '';
      if (filterSession === 'NY') return session.includes('new york') || session.includes('ny');
      if (filterSession === 'LONDON') return session.includes('london');
      if (filterSession === 'ASIA') return session.includes('asia') || session.includes('tokyo');
      return true;
    });
  }, [points, filterSession]);

  return (
    <div
      className={`rounded-xl border p-4 shadow-sm transition flex flex-col justify-between relative select-none ${
        theme === 'light'
          ? 'bg-white border-[#E5E7EB]'
          : 'bg-[#0D111B] border-[#20283A]'
      }`}
    >
      {/* Widget Header */}
      <div className={`flex items-center justify-between pb-3 border-b mb-2 ${
        theme === 'light' ? 'border-[#E5E7EB]' : 'border-[#20283A]'
      }`}>
        <div className="flex items-center gap-2">
          <h3 className={`text-xs sm:text-sm font-semibold flex items-center gap-1.5 ${
            theme === 'light' ? 'text-[#111827]' : 'text-[#F3F6FB]'
          }`}>
            Trade time performance
            <span
              className={`${theme === 'light' ? 'text-[#6B7280] hover:text-[#111827]' : 'text-[#8C97AB] hover:text-[#F3F6FB]'} cursor-pointer`}
              title="Execution timing scatter plot: Each dot represents a trade entered at that time of day"
            >
              <Info className="w-3.5 h-3.5" />
            </span>
          </h3>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-[10px] font-mono">
            <span className={`flex items-center gap-1 font-semibold ${theme === 'light' ? 'text-[#059669]' : 'text-[#00D6A3]'}`}>
              <span className={`w-2 h-2 rounded-full inline-block ${theme === 'light' ? 'bg-[#059669]' : 'bg-[#00D6A3]'}`} />
              {totalWins} Wins
            </span>
            <span className={theme === 'light' ? 'text-[#D1D5DB]' : 'text-[#374151]'}>•</span>
            <span className={`flex items-center gap-1 font-semibold ${theme === 'light' ? 'text-[#DC2626]' : 'text-[#FF3D6E]'}`}>
              <span className={`w-2 h-2 rounded-full inline-block ${theme === 'light' ? 'bg-[#DC2626]' : 'bg-[#FF3D6E]'}`} />
              {totalLosses} Losses
            </span>
          </div>

          <button
            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
            className={`p-1 rounded-lg transition ${
              theme === 'light'
                ? 'text-[#6B7280] hover:text-[#111827] hover:bg-[#F1F5F9]'
                : 'text-[#8C97AB] hover:text-[#F3F6FB] hover:bg-[#111722]'
            }`}
            title="Filter Chart"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Filter bar when settings opened */}
      {isSettingsOpen && (
        <div className={`flex items-center justify-between gap-2 p-2 mb-2 rounded-lg border text-[11px] animate-in fade-in ${
          theme === 'light'
            ? 'bg-[#F8FAFC] border-[#E5E7EB]'
            : 'bg-[#0A0E16] border-[#20283A]'
        }`}>
          <span className={theme === 'light' ? 'text-[#6B7280]' : 'text-[#8C97AB]'}>Filter Session:</span>
          <div className="flex items-center gap-1">
            {(['ALL', 'NY', 'LONDON', 'ASIA'] as const).map(s => (
              <button
                key={s}
                onClick={() => setFilterSession(s)}
                className={`px-2 py-0.5 rounded-md font-semibold transition cursor-pointer ${
                  filterSession === s
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-xs'
                    : theme === 'light'
                    ? 'text-[#6B7280] hover:text-[#111827] hover:bg-[#E5E7EB]'
                    : 'text-[#8C97AB] hover:text-[#F3F6FB] hover:bg-[#172030]'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Scatter Plot Chart Area */}
      <div
        ref={containerRef}
        className="relative w-full h-[220px] sm:h-[260px] pt-2 pb-6 pl-14 pr-3 flex flex-col justify-end"
      >
        {/* Y-Axis Grid Lines & Tick Labels (Left) */}
        <div className="absolute inset-y-2 left-0 w-12 flex flex-col justify-between pointer-events-none text-right pr-1.5">
          {yTicks.map((val, idx) => (
            <span key={idx} className={`text-[10px] font-mono truncate ${
              theme === 'light' ? 'text-[#6B7280]' : 'text-[#8C97AB]'
            }`}>
              {val < 0 ? `-$${Math.abs(val).toLocaleString()}` : `$${val.toLocaleString()}`}
            </span>
          ))}
        </div>

        {/* Chart Canvas Area with Background Grid */}
        <div className={`relative w-full h-full border-l border-b rounded-bl-sm overflow-visible ${
          theme === 'light' ? 'border-[#E5E7EB]' : 'border-[#20283A]'
        }`}>
          {/* Horizontal Grid lines */}
          {yTicks.map((val, idx) => {
            const range = maxPnl - minPnl || 1;
            const topPct = ((maxPnl - val) / range) * 100;
            const isZero = val === 0;
            return (
              <div
                key={idx}
                className={`absolute left-0 right-0 ${
                  isZero
                    ? theme === 'light' ? 'border-b border-[#9CA3AF]' : 'border-b border-[#374151]'
                    : theme === 'light' ? 'border-b border-[#F1F5F9]' : 'border-b border-[#20283A]/50 border-dashed'
                }`}
                style={{ top: `${topPct}%` }}
              />
            );
          })}

          {/* Vertical Grid lines corresponding to major session markers (8:00, 10:00, 14:00, 16:00) */}
          {[480, 600, 840, 960].map(m => {
            const leftPct = (m / 1440) * 100;
            return (
              <div
                key={m}
                className={`absolute top-0 bottom-0 border-r border-dashed pointer-events-none ${
                  theme === 'light' ? 'border-[#F1F5F9]' : 'border-[#20283A]/40'
                }`}
                style={{ left: `${leftPct}%` }}
              />
            );
          })}

          {/* Scatter Points (Trades) */}
          {filteredPoints.map((pt, idx) => {
            const isHovered = hoveredPoint?.trade.id === pt.trade.id;
            return (
              <div
                key={pt.trade.id || idx}
                onClick={() => onSelectTrade && onSelectTrade(pt.trade)}
                onMouseEnter={() => setHoveredPoint(pt)}
                onMouseLeave={() => setHoveredPoint(null)}
                className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer z-10 transition-transform duration-100"
                style={{
                  left: `${pt.x}%`,
                  top: `${pt.y}%`,
                }}
              >
                <div
                  className={`rounded-full transition-all duration-150 ${
                    pt.isWin
                      ? 'bg-[#00D6A3] hover:opacity-90 ring-2 ring-[#00D6A3]/30'
                      : pt.isLoss
                      ? 'bg-[#FF3D6E] hover:opacity-90 ring-2 ring-[#FF3D6E]/30'
                      : 'bg-[#2563FF] hover:opacity-90 ring-2 ring-[#2563FF]/30'
                  } ${isHovered ? 'w-4 h-4 scale-125 z-30 shadow-lg shadow-black/50' : 'w-2.5 h-2.5 sm:w-3 sm:h-3'}`}
                />
              </div>
            );
          })}

          {/* Empty state when no trades exist */}
          {filteredPoints.length === 0 && (
            <div className={`absolute inset-0 flex flex-col items-center justify-center text-xs ${
              theme === 'light' ? 'text-[#9CA3AF]' : 'text-[#5F6B80]'
            }`}>
              <Clock className="w-6 h-6 mb-1 opacity-50" />
              <span>No trade execution times recorded</span>
            </div>
          )}

          {/* Interactive Floating Hover Tooltip */}
          {hoveredPoint && (
            <div
              className={`absolute z-40 transform -translate-x-1/2 -translate-y-full -mt-2.5 pointer-events-none p-2.5 rounded-lg shadow-xl border text-xs min-w-[160px] animate-in fade-in zoom-in-95 ${
                theme === 'light'
                  ? 'bg-white border-[#E5E7EB] text-[#111827]'
                  : 'bg-[#0D111B] border-[#28344A] text-[#F3F6FB]'
              }`}
              style={{
                left: `${hoveredPoint.x}%`,
                top: `${hoveredPoint.y}%`,
              }}
            >
              <div className={`flex items-center justify-between pb-1 border-b mb-1 ${
                theme === 'light' ? 'border-[#E5E7EB]' : 'border-[#20283A]'
              }`}>
                <span className="font-bold text-[11px] flex items-center gap-1.5">
                  <span
                    className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                      hoveredPoint.trade.direction === 'BUY'
                        ? 'bg-[rgba(0,214,163,0.15)] text-[#00D6A3]'
                        : 'bg-[rgba(255,61,110,0.15)] text-[#FF3D6E]'
                    }`}
                  >
                    {hoveredPoint.trade.direction}
                  </span>
                  {hoveredPoint.trade.symbol}
                </span>
                <span className={`font-mono text-[10px] ${theme === 'light' ? 'text-[#6B7280]' : 'text-[#8C97AB]'}`}>{hoveredPoint.timeLabel}</span>
              </div>

              <div className="space-y-0.5 text-[11px]">
                <div className="flex items-center justify-between">
                  <span className={theme === 'light' ? 'text-[#6B7280]' : 'text-[#8C97AB]'}>Net P&L:</span>
                  <span
                    className={`font-mono font-bold ${
                      hoveredPoint.pnl >= 0 ? (theme === 'light' ? 'text-[#059669]' : 'text-[#00D6A3]') : (theme === 'light' ? 'text-[#DC2626]' : 'text-[#FF3D6E]')
                    }`}
                  >
                    {formatCurrency(hoveredPoint.pnl)}
                  </span>
                </div>
                {hoveredPoint.trade.rMultiple !== undefined && (
                  <div className="flex items-center justify-between">
                    <span className={theme === 'light' ? 'text-[#6B7280]' : 'text-[#8C97AB]'}>R-Multiple:</span>
                    <span className="font-mono">{hoveredPoint.trade.rMultiple}R</span>
                  </div>
                )}
                {hoveredPoint.trade.setupType && (
                  <div className="flex items-center justify-between">
                    <span className={theme === 'light' ? 'text-[#6B7280]' : 'text-[#8C97AB]'}>Setup:</span>
                    <span className="text-[#2563FF] font-semibold truncate max-w-[90px]">
                      {hoveredPoint.trade.setupType}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* X-Axis Time Labels (Bottom) */}
        <div className={`absolute -bottom-1 left-14 right-3 flex justify-between text-[9.5px] font-mono pt-1 pointer-events-none ${
          theme === 'light' ? 'text-[#6B7280]' : 'text-[#8C97AB]'
        }`}>
          {timeLabels.map((tl, i) => (
            <span key={i} className="transform -translate-x-1/2">
              {tl.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};
