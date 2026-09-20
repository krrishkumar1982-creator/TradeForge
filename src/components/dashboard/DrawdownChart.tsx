import React, { useState, useMemo, useRef } from 'react';
import { Trade } from '../../types';
import { useTrading } from '../../context/TradingContext';
import { Info, TrendingDown } from 'lucide-react';
import { parseSafeDate, safeFormatDate, toISODateKey } from '../../utils/dateUtils';

interface DrawdownChartProps {
  trades: Trade[];
  formatCurrency: (val: number) => string;
}

interface DrawdownPoint {
  dateStr: string;
  displayDate: string;
  drawdownDollar: number;
  drawdownPercent: number;
  peakEquity: number;
  currentEquity: number;
  x: number; // percentage (0 to 100)
  y: number; // percentage (0 to 100)
}

export const DrawdownChart: React.FC<DrawdownChartProps> = ({ trades, formatCurrency }) => {
  const { theme, accounts, selectedAccountId } = useTrading();
  const currentAccount = accounts.find(a => a.id === selectedAccountId) || accounts[0];
  const [hoveredPoint, setHoveredPoint] = useState<DrawdownPoint | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Group trades chronologically and calculate running Drawdown
  const { points, yTicks, maxDrawdown, dateLabels } = useMemo(() => {
    const closed = trades
      .filter(t => t.status === 'CLOSED' && (t.entryDate || t.exitDate))
      .sort((a, b) => {
        const timeA = parseSafeDate(a.entryDate)?.getTime() || 0;
        const timeB = parseSafeDate(b.entryDate)?.getTime() || 0;
        return timeA - timeB;
      });

    if (closed.length === 0) {
      return {
        points: [],
        yTicks: [0, -100, -200, -300, -400, -500, -600, -700, -800, -900],
        maxDrawdown: 900,
        dateLabels: [],
      };
    }

    // Daily aggregation
    const dayPnlMap: { [d: string]: { pnl: number; rawDate: string } } = {};
    closed.forEach(t => {
      const dKey = toISODateKey(t.entryDate || t.exitDate);
      if (!dKey) return;
      if (!dayPnlMap[dKey]) {
        dayPnlMap[dKey] = { pnl: 0, rawDate: t.entryDate || t.exitDate || '' };
      }
      dayPnlMap[dKey].pnl += t.netPnl;
    });

    const sortedDates = Object.keys(dayPnlMap).sort();
    const startingBalance = currentAccount?.initialBalance || currentAccount?.currentBalance || 50000;
    let runningEquity = startingBalance;
    let peakEquity = startingBalance;
    let maxDd = 0;

    const rawPoints = sortedDates.map((dateStr, idx) => {
      runningEquity += dayPnlMap[dateStr].pnl;
      if (runningEquity > peakEquity) {
        peakEquity = runningEquity;
      }
      const ddDollar = Math.max(0, peakEquity - runningEquity);
      const ddPercent = peakEquity > 0 ? (ddDollar / peakEquity) * 100 : 0;
      if (ddDollar > maxDd) maxDd = ddDollar;

      const parsed = parseSafeDate(dayPnlMap[dateStr].rawDate) || parseSafeDate(dateStr);
      const displayDate = parsed
        ? safeFormatDate(parsed, dateStr, { month: '2-digit', day: '2-digit', year: '2-digit' })
        : dateStr;

      return {
        dateStr,
        displayDate,
        drawdownDollar: -ddDollar, // negative for underwater chart
        drawdownPercent: ddPercent,
        peakEquity,
        currentEquity: runningEquity,
      };
    });

    // Provide clean round bounds for Y-Axis (e.g. 0 down to -$900 or -$2000)
    const chartMaxDepth = Math.max(900, Math.ceil(maxDd / 100) * 100);
    const step = Math.max(100, Math.ceil(chartMaxDepth / 9 / 50) * 50);

    const ticks: number[] = [];
    for (let val = 0; val <= chartMaxDepth; val += step) {
      ticks.push(-val);
    }
    if (ticks.length < 5) {
      ticks.length = 0;
      for (let i = 0; i <= 9; i++) {
        ticks.push(-Math.round((chartMaxDepth / 9) * i));
      }
    }

    const n = rawPoints.length;
    const calculatedPoints: DrawdownPoint[] = rawPoints.map((p, idx) => {
      const x = n > 1 ? (idx / (n - 1)) * 100 : 50;
      // Y maps 0 (top = 0%) to -chartMaxDepth (bottom = 100%)
      const y = (Math.abs(p.drawdownDollar) / chartMaxDepth) * 100;
      return {
        ...p,
        x: Math.max(0, Math.min(100, x)),
        y: Math.max(0, Math.min(100, y)),
      };
    });

    // Pick 4 evenly spaced date labels
    const sampleDates: string[] = [];
    if (sortedDates.length <= 4) {
      sampleDates.push(...calculatedPoints.map(p => p.displayDate));
    } else {
      const stepIdx = (calculatedPoints.length - 1) / 3;
      for (let i = 0; i < 4; i++) {
        const pt = calculatedPoints[Math.min(calculatedPoints.length - 1, Math.round(i * stepIdx))];
        if (pt) sampleDates.push(pt.displayDate);
      }
    }

    return {
      points: calculatedPoints,
      yTicks: ticks,
      maxDrawdown: chartMaxDepth,
      dateLabels: sampleDates,
    };
  }, [trades]);

  // Generate SVG path for the underwater drawdown line & area
  const { linePath, areaPath } = useMemo(() => {
    if (points.length === 0) return { linePath: '', areaPath: '' };
    if (points.length === 1) {
      return {
        linePath: `M 0 ${points[0].y} L 100 ${points[0].y}`,
        areaPath: `M 0 0 L 0 ${points[0].y} L 100 ${points[0].y} L 100 0 Z`,
      };
    }

    let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
    for (let i = 1; i < points.length; i++) {
      d += ` L ${points[i].x.toFixed(1)} ${points[i].y.toFixed(1)}`;
    }

    const area = `${d} L ${points[points.length - 1].x.toFixed(1)} 0 L ${points[0].x.toFixed(1)} 0 Z`;
    return { linePath: d, areaPath: area };
  }, [points]);

  return (
    <div
      className={`rounded-2xl border p-4 sm:p-5 transition-all duration-200 flex flex-col justify-between relative select-none ${
        theme === 'light'
          ? 'bg-white border-[#E5E7EB] shadow-xs'
          : 'bg-[#12141A] border-[rgba(255,255,255,0.08)] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]'
      }`}
    >
      {/* Header */}
      <div className={`flex items-center justify-between pb-3 border-b mb-2 ${
        theme === 'light' ? 'border-[#E5E7EB]' : 'border-[rgba(255,255,255,0.08)]'
      }`}>
        <h3 className={`text-xs sm:text-sm font-semibold flex items-center gap-1.5 ${
          theme === 'light' ? 'text-[#111827]' : 'text-[#F8FAFC]'
        }`}>
          Drawdown
          <span
            className={`${theme === 'light' ? 'text-[#6B7280] hover:text-[#111827]' : 'text-[#8C97AB] hover:text-[#F3F6FB]'} cursor-pointer`}
            title="Underwater equity drawdown curve showing depth and recovery from account peaks"
          >
            <Info className="w-3.5 h-3.5" />
          </span>
        </h3>

        <div className="text-xs font-mono tabular-nums flex items-center gap-1.5">
          <span className={theme === 'light' ? 'text-[#6B7280]' : 'text-[#8C97AB]'}>Max DD: </span>
          <span className={`px-2 py-0.5 rounded font-bold border text-[11px] ${
            theme === 'light'
              ? 'bg-rose-50 text-rose-700 border-rose-200'
              : 'bg-rose-500/10 text-rose-400 border-rose-500/25'
          }`}>
            -${maxDrawdown.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Chart Canvas Area */}
      <div
        ref={containerRef}
        className="relative w-full h-[180px] sm:h-[200px] pt-1 pb-6 pl-12 pr-2 flex flex-col justify-end"
      >
        {/* Y-Axis Tick Labels (Left) */}
        <div className="absolute inset-y-1 left-0 w-11 flex flex-col justify-between pointer-events-none text-right pr-1.5">
          {yTicks.map((val, idx) => (
            <span key={idx} className={`text-[10px] font-mono truncate ${
              theme === 'light' ? 'text-[#6B7280]' : 'text-[#8C97AB]'
            }`}>
              {val === 0 ? '$0' : `-$${Math.abs(val).toLocaleString()}`}
            </span>
          ))}
        </div>

        {/* SVG Drawing Canvas */}
        <div className={`relative w-full h-full border-l border-t rounded-tl-sm overflow-hidden ${
          theme === 'light' ? 'border-[#E5E7EB]' : 'border-[#20283A]'
        }`}>
          {/* Subtle horizontal grid lines */}
          {yTicks.map((val, idx) => {
            const topPct = (Math.abs(val) / maxDrawdown) * 100;
            return (
              <div
                key={idx}
                className={`absolute left-0 right-0 border-b border-dashed ${
                  theme === 'light' ? 'border-[#E5E7EB]' : 'border-[#20283A]/50'
                }`}
                style={{ top: `${topPct}%` }}
              />
            );
          })}

          <svg
            className="absolute inset-0 w-full h-full overflow-visible"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="drawdownGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#FF3D6E" stopOpacity="0.04" />
                <stop offset="100%" stopColor="#FF3D6E" stopOpacity="0.30" />
              </linearGradient>
            </defs>

            {/* Filled Underwater Area */}
            {areaPath && (
              <path d={areaPath} fill="url(#drawdownGradient)" className="transition-all duration-300" />
            )}

            {/* Drawdown Depth Line */}
            {linePath && (
              <path
                d={linePath}
                fill="none"
                stroke="#FF3D6E"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
                className="transition-all duration-300"
              />
            )}
          </svg>

          {/* Invisible hover detectors for smooth data inspection */}
          <div className="absolute inset-0 flex">
            {points.map((pt, idx) => (
              <div
                key={idx}
                className="flex-1 h-full cursor-crosshair relative group"
                onMouseEnter={() => setHoveredPoint(pt)}
                onMouseLeave={() => setHoveredPoint(null)}
              >
                {hoveredPoint?.dateStr === pt.dateStr && (
                  <>
                    {/* Vertical guideline */}
                    <div
                      className="absolute top-0 bottom-0 w-[1px] bg-[#FF3D6E]/60 pointer-events-none"
                      style={{ left: '50%' }}
                    />
                    {/* Intersection Dot */}
                    <div
                      className="absolute w-2.5 h-2.5 rounded-full bg-[#FF3D6E] ring-2 ring-white transform -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                      style={{
                        left: '50%',
                        top: `${pt.y}%`,
                      }}
                    />
                  </>
                )}
              </div>
            ))}
          </div>

          {/* Hover Tooltip */}
          {hoveredPoint && (
            <div
              className="absolute z-30 transform -translate-x-1/2 -translate-y-full -mt-2.5 pointer-events-none p-3 rounded-xl glass-tooltip text-xs min-w-[160px] animate-in fade-in"
              style={{
                left: `${hoveredPoint.x}%`,
                top: `${Math.max(25, hoveredPoint.y)}%`,
              }}
            >
              <div className={`text-[10px] pb-1 border-b mb-1.5 font-mono flex items-center justify-between ${
                theme === 'light' ? 'text-[#6B7280] border-slate-200' : 'text-[#8C97AB] border-white/10'
              }`}>
                <span>{hoveredPoint.displayDate}</span>
                <span className="text-[9px] uppercase font-semibold text-rose-500">Peak DD</span>
              </div>
              <div className="space-y-1 font-mono tabular-nums">
                <div className="flex items-center justify-between text-[11px]">
                  <span className={theme === 'light' ? 'text-[#6B7280]' : 'text-[#8C97AB]'}>Drawdown:</span>
                  <span className={`font-bold ${theme === 'light' ? 'text-[#DC2626]' : 'text-[#FF3D6E]'}`}>
                    {formatCurrency(hoveredPoint.drawdownDollar)}
                  </span>
                </div>
                <div className={`flex items-center justify-between text-[10px] ${theme === 'light' ? 'text-[#6B7280]' : 'text-[#8C97AB]'}`}>
                  <span>Depth %:</span>
                  <span className={`font-semibold ${theme === 'light' ? 'text-[#DC2626]' : 'text-[#FF3D6E]'}`}>
                    -{hoveredPoint.drawdownPercent.toFixed(1)}%
                  </span>
                </div>
                <div className={`flex items-center justify-between text-[10px] pt-1 border-t ${
                  theme === 'light' ? 'border-slate-100 text-slate-500' : 'border-white/5 text-slate-400'
                }`}>
                  <span>Account Equity:</span>
                  <span className="font-semibold">{formatCurrency(hoveredPoint.currentEquity)}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* X-Axis Date Labels (Bottom) */}
        <div className={`absolute -bottom-1 left-12 right-2 flex justify-between text-[9.5px] font-mono pt-1 pointer-events-none ${
          theme === 'light' ? 'text-[#6B7280]' : 'text-[#8C97AB]'
        }`}>
          {dateLabels.map((lbl, i) => (
            <span key={i} className="transform -translate-x-1/2">
              {lbl}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};
