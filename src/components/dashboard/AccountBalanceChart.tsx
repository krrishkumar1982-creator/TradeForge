import React, { useState, useMemo, useRef } from 'react';
import { Trade, TradingAccount } from '../../types';
import { useTrading } from '../../context/TradingContext';

interface AccountBalanceChartProps {
  trades: Trade[];
  account?: TradingAccount;
  formatCurrency: (val: number) => string;
}

interface BalancePoint {
  dateStr: string;
  rawDate: string;
  balance: number;
  pnlChange: number;
  cumulativePnl: number;
  drawdownDollars: number;
  drawdownPercent: number;
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

export const AccountBalanceChart: React.FC<AccountBalanceChartProps> = ({
  trades,
  account,
  formatCurrency,
}) => {
  const { theme } = useTrading();
  const [viewMode, setViewMode] = useState<'balance' | 'drawdown'>('balance');
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const isLight = theme === 'light';
  const initialBalance = account?.initialBalance || 50000;

  const dataPoints: BalancePoint[] = useMemo(() => {
    const closed = trades.filter(t => t.status === 'CLOSED');
    if (closed.length === 0) return [];

    const sorted = [...closed].sort(
      (a, b) => new Date(a.entryDate).getTime() - new Date(b.entryDate).getTime()
    );

    let currentBal = initialBalance;
    let peakBal = initialBalance;
    let runningPnl = 0;

    const points: BalancePoint[] = [
      {
        dateStr: 'Start',
        rawDate: sorted[0]?.entryDate || new Date().toISOString(),
        balance: initialBalance,
        pnlChange: 0,
        cumulativePnl: 0,
        drawdownDollars: 0,
        drawdownPercent: 0,
      },
    ];

    sorted.forEach(t => {
      currentBal += t.netPnl;
      runningPnl += t.netPnl;
      if (currentBal > peakBal) {
        peakBal = currentBal;
      }
      const ddDollars = peakBal - currentBal;
      const ddPercent = peakBal > 0 ? (ddDollars / peakBal) * 100 : 0;

      const dObj = new Date(t.entryDate);
      points.push({
        dateStr: dObj.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' }),
        rawDate: t.entryDate,
        balance: currentBal,
        pnlChange: t.netPnl,
        cumulativePnl: runningPnl,
        drawdownDollars: ddDollars,
        drawdownPercent: ddPercent,
      });
    });

    return points;
  }, [trades, initialBalance]);

  if (dataPoints.length <= 1) {
    return (
      <div className="flex flex-col items-center justify-center h-[210px] text-zinc-500 text-xs">
        <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center mb-2">
          <span className="text-zinc-400 font-mono">📈</span>
        </div>
        <span>No closed trades to plot equity curve</span>
      </div>
    );
  }

  const width = 480;
  const height = 195;
  const paddingLeft = 55;
  const paddingRight = 20;
  const paddingTop = 18;
  const paddingBottom = 26;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  // Values based on view mode
  const values = viewMode === 'balance'
    ? dataPoints.map(d => d.balance)
    : dataPoints.map(d => -d.drawdownDollars);

  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const range = maxVal - minVal || 1;

  const getX = (idx: number) => paddingLeft + (idx / (dataPoints.length - 1)) * chartWidth;
  const getY = (val: number) => paddingTop + chartHeight - ((val - minVal) / range) * chartHeight;

  const coords = dataPoints.map((d, i) => ({
    x: getX(i),
    y: getY(viewMode === 'balance' ? d.balance : -d.drawdownDollars),
  }));

  const linePoints = coords.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const zeroY = viewMode === 'drawdown' ? getY(0) : getY(minVal);
  const areaPolyPoints = `${coords[0].x.toFixed(1)},${zeroY.toFixed(1)} ${linePoints} ${coords[coords.length - 1].x.toFixed(1)},${zeroY.toFixed(1)}`;

  const yTicks = [maxVal, (maxVal + minVal) / 2, minVal];
  const activeIdx = hoverIndex;
  const activePoint = activeIdx !== null ? dataPoints[activeIdx] : null;

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[220px] flex flex-col justify-between select-none"
      onMouseLeave={() => setHoverIndex(null)}
    >
      {/* Sub Header View Toggle (Balance / Drawdown) */}
      <div className="flex items-center justify-end gap-2 px-3 pt-0.5 pb-1">
        <div className={`flex items-center gap-1 p-0.5 rounded-lg border text-[10px] ${
          isLight ? 'bg-slate-100 border-slate-200' : 'bg-[#101116] border-[rgba(255,255,255,0.06)]'
        }`}>
          <button
            onClick={() => setViewMode('balance')}
            className={`px-2 py-0.5 rounded-md font-semibold transition cursor-pointer ${
              viewMode === 'balance'
                ? 'bg-blue-600 text-white shadow-xs'
                : isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-white'
            }`}
          >
            Equity Balance
          </button>
          <button
            onClick={() => setViewMode('drawdown')}
            className={`px-2 py-0.5 rounded-md font-semibold transition cursor-pointer ${
              viewMode === 'drawdown'
                ? 'bg-rose-600 text-white shadow-xs'
                : isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-white'
            }`}
          >
            Drawdown
          </button>
        </div>
      </div>

      {/* SVG Chart */}
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
          <linearGradient id="balanceGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.0" />
          </linearGradient>

          <linearGradient id="drawdownGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#F43F5E" stopOpacity="0.0" />
            <stop offset="100%" stopColor="#F43F5E" stopOpacity="0.25" />
          </linearGradient>
        </defs>

        {/* Horizontal gridlines */}
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
          y1={paddingTop + chartHeight / 2}
          x2={width - paddingRight}
          y2={paddingTop + chartHeight / 2}
          stroke={isLight ? '#E2E8F0' : 'rgba(255,255,255,0.06)'}
          strokeWidth="1"
          strokeDasharray="2 2"
        />
        <line
          x1={paddingLeft}
          y1={height - paddingBottom}
          x2={width - paddingRight}
          y2={height - paddingBottom}
          stroke={isLight ? '#F1F5F9' : 'rgba(255,255,255,0.03)'}
          strokeWidth="1"
        />

        {/* Y Axis Labels */}
        {yTicks.map((val, idx) => (
          <text
            key={idx}
            x={paddingLeft - 8}
            y={getY(val) + 3}
            fill={isLight ? '#64748B' : '#94A3B8'}
            fontSize="9"
            textAnchor="end"
            fontFamily="monospace"
          >
            {formatCurrency(Math.round(val))}
          </text>
        ))}

        {/* Fill Area */}
        <polygon
          points={areaPolyPoints}
          fill={viewMode === 'balance' ? 'url(#balanceGrad)' : 'url(#drawdownGrad)'}
        />

        {/* Line Curve */}
        <polyline
          fill="none"
          stroke={viewMode === 'balance' ? (isLight ? '#2563EB' : '#3B82F6') : '#F43F5E'}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={linePoints}
        />

        {/* Interactive Hover Crosshair */}
        {activeIdx !== null && activePoint && (
          <g>
            <line
              x1={getX(activeIdx)}
              y1={paddingTop}
              x2={getX(activeIdx)}
              y2={height - paddingBottom}
              stroke={isLight ? '#3B82F6' : '#60A5FA'}
              strokeWidth="1"
              strokeDasharray="2 2"
            />
            <circle
              cx={getX(activeIdx)}
              cy={getY(viewMode === 'balance' ? activePoint.balance : -activePoint.drawdownDollars)}
              r="4"
              fill={viewMode === 'balance' ? '#3B82F6' : '#F43F5E'}
              stroke="#ffffff"
              strokeWidth="2"
            />
          </g>
        )}
      </svg>

      {/* Floating Tooltip */}
      {activeIdx !== null && activePoint && (
        <div
          className={`absolute z-30 px-3 py-1.5 rounded-lg text-xs pointer-events-none transition-all duration-150 border ${
            isLight
              ? 'bg-white border-slate-200 text-slate-900 shadow-xl'
              : 'bg-[#181A21] border-[rgba(255,255,255,0.10)] text-slate-100 shadow-2xl'
          }`}
          style={{
            top: '32px',
            left: `${Math.min(70, Math.max(20, (getX(activeIdx) / width) * 100))}%`,
            transform: 'translateX(-50%)',
          }}
        >
          <div className={`text-[10px] font-semibold border-b pb-0.5 ${
            isLight ? 'text-slate-500 border-slate-100' : 'text-slate-400 border-[rgba(255,255,255,0.06)]'
          }`}>
            {activePoint.dateStr}
          </div>
          <div className="mt-0.5 space-y-0.5 text-[11px] font-mono">
            <div className="flex items-center justify-between gap-3">
              <span className={isLight ? 'text-slate-500' : 'text-slate-400'}>Balance:</span>
              <span className={`font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>{formatCurrency(activePoint.balance)}</span>
            </div>
            {viewMode === 'drawdown' ? (
              <div className={`flex items-center justify-between gap-3 ${isLight ? 'text-rose-600' : 'text-rose-400'}`}>
                <span>Drawdown:</span>
                <span>-{formatCurrency(activePoint.drawdownDollars)} ({activePoint.drawdownPercent.toFixed(1)}%)</span>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-3">
                <span className={isLight ? 'text-slate-500' : 'text-slate-400'}>Cum P&L:</span>
                <span className={activePoint.cumulativePnl >= 0 ? (isLight ? 'text-emerald-600 font-bold' : 'text-emerald-400 font-bold') : (isLight ? 'text-rose-600 font-bold' : 'text-rose-400 font-bold')}>
                  {formatCurrency(activePoint.cumulativePnl)}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* X Axis Date labels */}
      <div className={`flex justify-between px-10 text-[9px] font-mono uppercase tracking-wider ${
        isLight ? 'text-slate-500' : 'text-slate-400'
      }`}>
        <span>{dataPoints[0]?.dateStr || 'Start'}</span>
        <span>{dataPoints[dataPoints.length - 1]?.dateStr || 'Today'}</span>
      </div>
    </div>
  );
};
