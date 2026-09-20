import React, { useState, useMemo, useRef } from 'react';
import { Trade } from '../../types';
import { useTrading } from '../../context/TradingContext';
import { parseSafeDate, safeFormatDate, toISODateKey } from '../../utils/dateUtils';

interface CumulativePnlChartProps {
  trades: Trade[];
  formatCurrency: (val: number) => string;
}

interface DataPoint {
  dateStr: string;
  rawDate: string;
  dailyPnl: number;
  cumulativePnl: number;
  tradeCount: number;
  wins: number;
  losses: number;
}

// Generate smooth cubic Bezier curve for SVG paths
function createSmoothCurve(points: { x: number; y: number }[]): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  if (points.length === 2) return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;

  let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i === 0 ? 0 : i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2 < points.length ? i + 2 : i + 1];

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;

    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return d;
}

export const CumulativePnlChart: React.FC<CumulativePnlChartProps> = ({ trades, formatCurrency }) => {
  const { theme } = useTrading();
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Group trades by date and calculate cumulative P&L
  const dataPoints: DataPoint[] = useMemo(() => {
    const closed = trades.filter(t => t.status === 'CLOSED');
    if (closed.length === 0) return [];

    const map: { [dateStr: string]: { dailyPnl: number; count: number; wins: number; losses: number; rawDate: string } } = {};

    closed.forEach(t => {
      const dKey = toISODateKey(t.entryDate || t.exitDate);
      if (!dKey) return;
      if (!map[dKey]) {
        map[dKey] = { dailyPnl: 0, count: 0, wins: 0, losses: 0, rawDate: t.entryDate || t.exitDate || '' };
      }
      map[dKey].dailyPnl += t.netPnl;
      map[dKey].count += 1;
      if (t.netPnl > 0) map[dKey].wins += 1;
      else if (t.netPnl < 0) map[dKey].losses += 1;
    });

    const sortedDates = Object.keys(map).sort();

    let runningCum = 0;
    const result: DataPoint[] = [];

    sortedDates.forEach(d => {
      runningCum += map[d].dailyPnl;
      const parsed = parseSafeDate(map[d].rawDate) || parseSafeDate(d);
      const displayLabel = parsed
        ? safeFormatDate(parsed, d, { month: 'short', day: 'numeric' })
        : d.slice(5);

      result.push({
        dateStr: displayLabel,
        rawDate: map[d].rawDate,
        dailyPnl: map[d].dailyPnl,
        cumulativePnl: runningCum,
        tradeCount: map[d].count,
        wins: map[d].wins,
        losses: map[d].losses,
      });
    });

    return result;
  }, [trades]);

  if (dataPoints.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[210px] text-slate-500 text-xs">
        <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center mb-2">
          <span className="text-slate-400 font-mono">📈</span>
        </div>
        <span>No closed trades to plot performance curve</span>
      </div>
    );
  }

  const isLight = theme === 'light';

  // SVG Chart Geometry
  const width = 480;
  const height = 195;
  const paddingLeft = 55;
  const paddingRight = 20;
  const paddingTop = 18;
  const paddingBottom = 26;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  const pnlValues = dataPoints.map(d => d.cumulativePnl);
  const minVal = Math.min(0, ...pnlValues);
  const maxVal = Math.max(100, ...pnlValues);
  const range = maxVal - minVal || 1;

  const getX = (idx: number) => {
    if (dataPoints.length <= 1) return paddingLeft + chartWidth / 2;
    return paddingLeft + (idx / (dataPoints.length - 1)) * chartWidth;
  };

  const getY = (val: number) => {
    return paddingTop + chartHeight - ((val - minVal) / range) * chartHeight;
  };

  const zeroY = getY(0);

  // Raw point coordinates
  const coords = dataPoints.map((d, i) => ({ x: getX(i), y: getY(d.cumulativePnl) }));

  // Smooth Bezier curve path and closed area path
  const smoothCurvePath = createSmoothCurve(coords);
  const areaPath = coords.length > 0
    ? `${smoothCurvePath} L ${coords[coords.length - 1].x.toFixed(1)} ${zeroY.toFixed(1)} L ${coords[0].x.toFixed(1)} ${zeroY.toFixed(1)} Z`
    : '';

  // Y-axis tick marks
  const yTicks = [maxVal, maxVal / 2, 0, minVal < 0 ? minVal : null].filter(
    (v): v is number => v !== null
  );

  const activeIdx = hoverIndex;
  const activePoint = activeIdx !== null ? dataPoints[activeIdx] : null;

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[220px] flex flex-col justify-between select-none"
      onMouseLeave={() => setHoverIndex(null)}
    >
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-full overflow-visible"
        onMouseMove={(e) => {
          if (!containerRef.current) return;
          const rect = containerRef.current.getBoundingClientRect();
          const mouseX = e.clientX - rect.left;
          const relativeX = (mouseX / rect.width) * width;
          const clampedX = Math.max(paddingLeft, Math.min(width - paddingRight, relativeX));
          const fraction = (clampedX - paddingLeft) / chartWidth;
          const closestIndex = Math.min(
            dataPoints.length - 1,
            Math.max(0, Math.round(fraction * (dataPoints.length - 1)))
          );
          setHoverIndex(closestIndex);
        }}
      >
        <defs>
          <linearGradient id="cumPnlGreen" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10B981" stopOpacity={isLight ? "0.26" : "0.28"} />
            <stop offset="65%" stopColor="#10B981" stopOpacity={isLight ? "0.08" : "0.07"} />
            <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
          </linearGradient>
          <linearGradient id="cumPnlRed" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#F43F5E" stopOpacity="0.0" />
            <stop offset="65%" stopColor="#F43F5E" stopOpacity={isLight ? "0.08" : "0.07"} />
            <stop offset="100%" stopColor="#F43F5E" stopOpacity={isLight ? "0.26" : "0.28"} />
          </linearGradient>
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Horizontal Gridlines */}
        <line
          x1={paddingLeft}
          y1={zeroY}
          x2={width - paddingRight}
          y2={zeroY}
          stroke={isLight ? '#CBD5E1' : 'rgba(255,255,255,0.12)'}
          strokeWidth="1"
          strokeDasharray="4 3"
        />
        <line
          x1={paddingLeft}
          y1={paddingTop}
          x2={width - paddingRight}
          y2={paddingTop}
          stroke={isLight ? '#F1F5F9' : 'rgba(255,255,255,0.03)'}
          strokeWidth="1"
        />
        <line
          x1={paddingLeft}
          y1={height - paddingBottom}
          x2={width - paddingRight}
          y2={height - paddingBottom}
          stroke={isLight ? '#F1F5F9' : 'rgba(255,255,255,0.03)'}
          strokeWidth="1"
        />

        {/* Y Axis Numerical Labels */}
        {yTicks.map((val, idx) => (
          <text
            key={idx}
            x={paddingLeft - 8}
            y={getY(val) + 3}
            fill={isLight ? '#64748B' : '#94A3B8'}
            fontSize="9"
            textAnchor="end"
            fontFamily="monospace"
            className="tabular-nums font-mono font-medium"
          >
            {formatCurrency(Math.round(val))}
          </text>
        ))}

        {/* Area Fill under Smooth Bezier Curve */}
        {areaPath && (
          <path
            d={areaPath}
            fill={pnlValues[pnlValues.length - 1] >= 0 ? "url(#cumPnlGreen)" : "url(#cumPnlRed)"}
          />
        )}

        {/* Ambient Glow Line (Soft luminous halo) */}
        {smoothCurvePath && (
          <path
            d={smoothCurvePath}
            fill="none"
            stroke={pnlValues[pnlValues.length - 1] >= 0 ? '#10B981' : '#F43F5E'}
            strokeWidth="5"
            strokeOpacity={isLight ? "0.15" : "0.22"}
            strokeLinecap="round"
          />
        )}

        {/* Main High-Precision Bezier Curve Line */}
        {smoothCurvePath && (
          <path
            d={smoothCurvePath}
            fill="none"
            stroke={pnlValues[pnlValues.length - 1] >= 0 ? (isLight ? '#059669' : '#10B981') : (isLight ? '#E11D48' : '#F43F5E')}
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* Active Hover / Highlight Point with Precision Crosshairs */}
        {activeIdx !== null && activePoint && (
          <g>
            {/* Vertical Crosshair */}
            <line
              x1={getX(activeIdx)}
              y1={paddingTop}
              x2={getX(activeIdx)}
              y2={height - paddingBottom}
              stroke={isLight ? '#3B82F6' : '#60A5FA'}
              strokeWidth="1"
              strokeDasharray="2 2"
              strokeOpacity="0.8"
            />
            {/* Glowing active point */}
            <circle
              cx={getX(activeIdx)}
              cy={getY(activePoint.cumulativePnl)}
              r="7"
              fill={isLight ? 'rgba(37,99,235,0.2)' : 'rgba(96,165,250,0.25)'}
            />
            <circle
              cx={getX(activeIdx)}
              cy={getY(activePoint.cumulativePnl)}
              r="4.5"
              fill={isLight ? '#2563EB' : '#3B82F6'}
              stroke="#ffffff"
              strokeWidth="2"
              className="transition-all"
            />
          </g>
        )}
      </svg>

      {/* Institutional Glass Hover Tooltip Card */}
      {activeIdx !== null && activePoint && (
        <div
          className="absolute z-30 px-3.5 py-2 rounded-xl text-xs pointer-events-none transition-all duration-150 glass-tooltip"
          style={{
            top: '4px',
            left: `${Math.min(74, Math.max(26, (getX(activeIdx) / width) * 100))}%`,
            transform: 'translateX(-50%)',
          }}
        >
          <div className={`text-[10px] font-semibold border-b pb-1 flex items-center justify-between gap-4 ${
            isLight ? 'text-slate-500 border-slate-200' : 'text-slate-400 border-white/10'
          }`}>
            <span className="font-sans tracking-tight">{activePoint.dateStr}</span>
            <span className={`px-1.5 py-0.2 rounded font-mono text-[9px] font-semibold border ${
              isLight ? 'bg-slate-100 text-slate-700 border-slate-200' : 'bg-white/[0.06] text-slate-300 border-white/10'
            }`}>
              {activePoint.tradeCount} trades
            </span>
          </div>
          <div className="mt-1.5 space-y-1 text-[11px] font-mono tabular-nums">
            <div className="flex items-center justify-between gap-4">
              <span className={`text-[10px] font-sans ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Cumulative:</span>
              <span
                className={`font-bold text-xs ${
                  activePoint.cumulativePnl >= 0
                    ? isLight ? 'text-emerald-600' : 'text-emerald-400'
                    : isLight ? 'text-rose-600' : 'text-rose-400'
                }`}
              >
                {formatCurrency(activePoint.cumulativePnl)}
              </span>
            </div>
            {activePoint.dailyPnl !== 0 && (
              <div className="flex items-center justify-between gap-4 text-[10px]">
                <span className={`font-sans ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Daily P&L:</span>
                <span className={`font-semibold ${activePoint.dailyPnl >= 0 ? (isLight ? 'text-emerald-600' : 'text-emerald-400') : (isLight ? 'text-rose-600' : 'text-rose-400')}`}>
                  {activePoint.dailyPnl >= 0 ? '+' : ''}
                  {formatCurrency(activePoint.dailyPnl)}
                </span>
              </div>
            )}
            <div className={`text-[9px] pt-1 border-t flex items-center justify-between ${
              isLight ? 'border-slate-100 text-slate-400' : 'border-white/5 text-slate-500'
            }`}>
              <span className="font-sans">Session W/L</span>
              <span className="space-x-1">
                <span className="text-emerald-500 font-semibold">{activePoint.wins}W</span>
                <span>/</span>
                <span className="text-rose-500 font-semibold">{activePoint.losses}L</span>
              </span>
            </div>
          </div>
        </div>
      )}

      {/* X Axis Date Labels */}
      <div className={`flex justify-between px-10 text-[9px] font-mono uppercase tracking-wider ${
        isLight ? 'text-slate-500' : 'text-slate-400'
      }`}>
        <span>{dataPoints[0]?.dateStr || ''}</span>
        {dataPoints.length > 2 && <span>{dataPoints[Math.floor(dataPoints.length / 2)]?.dateStr || ''}</span>}
        <span>{dataPoints[dataPoints.length - 1]?.dateStr || ''}</span>
      </div>
    </div>
  );
};
