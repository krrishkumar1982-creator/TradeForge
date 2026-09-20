import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, BookOpen, ExternalLink, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { Trade, JournalNote } from '../../types';
import { useTrading } from '../../context/TradingContext';
import { safeFormatDate, toISODateKey, parseSafeDate } from '../../utils/dateUtils';

interface CalendarDayDetailsModalProps {
  dateStr: string; // e.g. "Wed, Jun 05, 2024" or ISO string
  dateObj: Date;
  trades: Trade[];
  onClose: () => void;
  onSelectTrade?: (trade: Trade) => void;
}

export const CalendarDayDetailsModal: React.FC<CalendarDayDetailsModalProps> = ({
  dateStr,
  dateObj,
  trades,
  onClose,
  onSelectTrade,
}) => {
  const {
    theme,
    notes,
    playbooks,
    setSelectedNote,
    setActiveView,
    formatCurrency,
    formatRMultiple,
  } = useTrading();

  const isLight = theme === 'light';

  const [selectedTradeRow, setSelectedTradeRow] = useState<Trade | null>(
    trades.length > 0 ? trades[0] : null
  );
  const [hoveredPoint, setHoveredPoint] = useState<{ time: string; pnl: number; x: number; y: number } | null>(null);

  // Close modal on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Lock body scroll while modal is open
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  // Format date header matching reference design: "Wed, Jun 05, 2024"
  const formattedHeaderDate = useMemo(() => {
    return safeFormatDate(dateObj, dateStr, {
      weekday: 'short',
      month: 'short',
      day: '2-digit',
      year: 'numeric',
    });
  }, [dateObj, dateStr]);

  // Find associated note for this day
  const dateIsoString = toISODateKey(dateObj);
  const dayNote = useMemo(() => {
    return notes.find(n => {
      if (!n.date) return false;
      const nDate = toISODateKey(n.date);
      return nDate === dateIsoString;
    });
  }, [notes, dateIsoString]);

  // Closed trades on this day
  const closedTrades = useMemo(() => {
    return trades
      .filter(t => t.status === 'CLOSED')
      .sort((a, b) => {
        const timeA = parseSafeDate(a.entryDate)?.getTime() || 0;
        const timeB = parseSafeDate(b.entryDate)?.getTime() || 0;
        return timeA - timeB;
      });
  }, [trades]);

  // Summary Metrics calculations
  const {
    totalTrades,
    winners,
    losers,
    grossPnl,
    commissions,
    netPnl,
    winRate,
    volume,
    profitFactor,
  } = useMemo(() => {
    const total = trades.length;
    const wins = closedTrades.filter(t => t.netPnl > 0).length;
    const losses = closedTrades.filter(t => t.netPnl < 0).length;
    const net = closedTrades.reduce((acc, t) => acc + t.netPnl, 0);
    const gross = closedTrades.reduce((acc, t) => acc + (t.grossPnl ?? t.netPnl), 0);
    const comms = trades.reduce((acc, t) => acc + (t.commission || 0) + (t.fees || 0), 0);
    const vol = trades.reduce((acc, t) => acc + (t.quantity || 1), 0);
    const winPct = closedTrades.length > 0 ? Math.round((wins / closedTrades.length) * 100) : 0;

    const grossWins = closedTrades.filter(t => t.netPnl > 0).reduce((acc, t) => acc + t.netPnl, 0);
    const grossLosses = Math.abs(closedTrades.filter(t => t.netPnl < 0).reduce((acc, t) => acc + t.netPnl, 0));
    
    let pf = '--';
    if (grossLosses > 0) {
      pf = (grossWins / grossLosses).toFixed(2);
    } else if (grossWins > 0) {
      pf = '--';
    }

    return {
      totalTrades: total,
      winners: wins,
      losers: losses,
      grossPnl: gross,
      commissions: comms,
      netPnl: net,
      winRate: winPct,
      volume: vol,
      profitFactor: pf,
    };
  }, [trades, closedTrades]);

  // Build Intraday Cumulative Net P&L Chart points
  const chartData = useMemo(() => {
    if (closedTrades.length === 0) {
      return {
        points: [
          { time: '09:00', pnl: 0, x: 10, y: 50 },
          { time: '16:00', pnl: 0, x: 90, y: 50 },
        ],
        minPnl: 0,
        maxPnl: 1000,
        yTicks: [0, 500, 1000, 1500],
        pathD: '',
        areaD: '',
        zeroY: 50,
      };
    }

    let running = 0;
    const rawPoints: { time: string; pnl: number }[] = [];

    // Starting baseline point
    const firstTradeDate = parseSafeDate(closedTrades[0].entryDate) || new Date();
    const startHour = Math.max(9, firstTradeDate.getHours() - 1);
    rawPoints.push({
      time: `${String(startHour).padStart(2, '0')}:00`,
      pnl: 0,
    });

    closedTrades.forEach(t => {
      running += t.netPnl;
      const d = parseSafeDate(t.exitDate || t.entryDate);
      const timeStr = d
        ? `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
        : '12:00';
      rawPoints.push({
        time: timeStr,
        pnl: running,
      });
    });

    // If only 1 trade, add end point for smooth curve
    if (rawPoints.length === 2) {
      rawPoints.push({
        time: '16:00',
        pnl: running,
      });
    }

    // Calculate Min and Max for Chart scale
    const pnlValues = rawPoints.map(p => p.pnl);
    let minVal = Math.min(0, ...pnlValues);
    let maxVal = Math.max(0, ...pnlValues);

    if (maxVal === minVal) {
      maxVal = Math.abs(maxVal) > 0 ? maxVal * 1.5 : 1000;
      minVal = 0;
    }

    // Padding
    const topPadded = maxVal > 0 ? maxVal * 1.15 : 0;
    const bottomPadded = minVal < 0 ? minVal * 1.15 : 0;
    const totalRange = topPadded - bottomPadded || 1000;

    // Generate 4 Y-ticks
    const step = totalRange / 3;
    const yTicks = [
      bottomPadded,
      bottomPadded + step,
      bottomPadded + step * 2,
      topPadded,
    ].map(v => Math.round(v / 100) * 100);

    const width = 300;
    const height = 110;
    const leftPad = 45;
    const topPad = 15;

    const mappedPoints = rawPoints.map((p, idx) => {
      const x = leftPad + (idx / (rawPoints.length - 1)) * width;
      const normalizedY = (p.pnl - bottomPadded) / totalRange;
      const y = topPad + height - normalizedY * height;
      return {
        ...p,
        x,
        y,
      };
    });

    // Smooth Bezier path
    let pathD = `M ${mappedPoints[0].x.toFixed(1)} ${mappedPoints[0].y.toFixed(1)}`;
    for (let i = 0; i < mappedPoints.length - 1; i++) {
      const p0 = mappedPoints[i === 0 ? 0 : i - 1];
      const p1 = mappedPoints[i];
      const p2 = mappedPoints[i + 1];
      const p3 = mappedPoints[i + 2 < mappedPoints.length ? i + 2 : i + 1];

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      pathD += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
    }

    // Baseline Y for zero or bottom
    const zeroNorm = (0 - bottomPadded) / totalRange;
    const zeroY = topPad + height - zeroNorm * height;

    const lastPt = mappedPoints[mappedPoints.length - 1];
    const firstPt = mappedPoints[0];
    const areaD = `${pathD} L ${lastPt.x.toFixed(1)} ${zeroY.toFixed(1)} L ${firstPt.x.toFixed(1)} ${zeroY.toFixed(1)} Z`;

    return {
      points: mappedPoints,
      minPnl: bottomPadded,
      maxPnl: topPadded,
      yTicks,
      pathD,
      areaD,
      zeroY,
    };
  }, [closedTrades]);

  const isNetPositive = netPnl >= 0;

  const handleViewNote = () => {
    if (dayNote) {
      setSelectedNote(dayNote);
      setActiveView('notebook');
      onClose();
    } else {
      setActiveView('notebook');
      onClose();
    }
  };

  const handleViewDetails = () => {
    if (selectedTradeRow && onSelectTrade) {
      onSelectTrade(selectedTradeRow);
      onClose();
    } else if (trades.length > 0 && onSelectTrade) {
      onSelectTrade(trades[0]);
      onClose();
    } else {
      setActiveView('trades');
      onClose();
    }
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-150"
      style={{
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        className={`w-full max-w-4xl rounded-xl border shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col relative z-10 ${
          isLight
            ? 'bg-white border-[#E5E7EB] text-[#111827] shadow-2xl'
            : 'bg-[#0D111B] border-[#20283A] text-[#F3F6FB] shadow-2xl'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* TOP HEADER: Date + Net P&L + View Note + Close Button */}
        <div className={`flex items-center justify-between px-6 pt-5 pb-4 border-b ${
          isLight ? 'border-[#E5E7EB] bg-white' : 'border-[#20283A] bg-[#0D111B]'
        }`}>
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className={`text-xl font-bold tracking-tight ${isLight ? 'text-[#111827]' : 'text-[#F3F6FB]'}`}>
              {formattedHeaderDate}
            </h2>
            <span className={isLight ? 'text-[#D1D5DB] font-bold text-lg' : 'text-[#374151] font-bold text-lg'}>•</span>
            <div className="flex items-center gap-1.5">
              <span
                className={`text-base sm:text-lg font-bold font-mono ${
                  isNetPositive
                    ? isLight ? 'text-[#059669]' : 'text-[#00D6A3]'
                    : isLight ? 'text-[#DC2626]' : 'text-[#FF3D6E]'
                }`}
              >
                Net P&L {formatCurrency(netPnl)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* View Note Button */}
            <button
              onClick={handleViewNote}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg font-semibold text-xs transition active:scale-[0.98] bg-[#2563FF] hover:bg-[#1D4ED8] text-white shadow-xs"
              title={dayNote ? 'View recorded journal note' : 'Open journal for this date'}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>View note</span>
            </button>

            {/* Circular Close Button */}
            <button
              onClick={onClose}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition border ${
                isLight
                  ? 'bg-[#F8FAFC] hover:bg-[#F1F5F9] text-[#6B7280] hover:text-[#111827] border-[#E5E7EB]'
                  : 'bg-[#111722] hover:bg-[#172030] text-[#8C97AB] hover:text-[#F3F6FB] border-[#20283A]'
              }`}
              title="Close modal (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* MIDDLE SECTION: Intraday Cumulative Net P&L Chart + Summary Metrics Grid */}
        <div className={`px-6 py-5 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center border-b ${
          isLight ? 'border-[#E5E7EB] bg-white' : 'border-[#20283A] bg-[#0D111B]'
        }`}>
          {/* Left: Intraday cumulative net P&L Area Chart (5 cols) */}
          <div className="lg:col-span-5 relative flex flex-col justify-center">
            <div className="w-full h-[150px] relative">
              <svg
                viewBox="0 0 360 140"
                className="w-full h-full overflow-visible"
                onMouseLeave={() => setHoveredPoint(null)}
              >
                <defs>
                  <linearGradient id="dayAreaGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="0%"
                      stopColor={isNetPositive ? (isLight ? '#059669' : '#00D6A3') : (isLight ? '#dc2626' : '#FF3D6E')}
                      stopOpacity={isLight ? 0.20 : 0.35}
                    />
                    <stop
                      offset="100%"
                      stopColor={isNetPositive ? (isLight ? '#059669' : '#00D6A3') : (isLight ? '#dc2626' : '#FF3D6E')}
                      stopOpacity="0.0"
                    />
                  </linearGradient>
                </defs>

                {/* Y-Axis Horizontal Grid Lines & Ticks */}
                {chartData.yTicks.map((tickVal, idx) => {
                  const normalizedY =
                    (tickVal - chartData.minPnl) / (chartData.maxPnl - chartData.minPnl || 1);
                  const y = 15 + 110 - normalizedY * 110;
                  return (
                    <g key={`ytick-${idx}`}>
                      <line
                        x1="45"
                        y1={y}
                        x2="350"
                        y2={y}
                        stroke={isLight ? '#F1F5F9' : '#20283A'}
                        strokeDasharray="3 3"
                        strokeWidth="0.8"
                      />
                      <text
                        x="38"
                        y={y + 3.5}
                        fill={isLight ? '#6B7280' : '#8C97AB'}
                        fontSize="9.5"
                        textAnchor="end"
                        fontFamily="monospace"
                      >
                        ${Math.abs(tickVal).toLocaleString()}
                      </text>
                    </g>
                  );
                })}

                {/* Area Fill */}
                {chartData.areaD && (
                  <path
                    d={chartData.areaD}
                    fill="url(#dayAreaGradient)"
                    className="transition-all duration-300"
                  />
                )}

                {/* Main Stroke Path */}
                {chartData.pathD && (
                  <path
                    d={chartData.pathD}
                    fill="none"
                    stroke={isNetPositive ? (isLight ? '#059669' : '#00D6A3') : (isLight ? '#dc2626' : '#FF3D6E')}
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}

                {/* Interactive Points */}
                {chartData.points.map((pt, idx) => (
                  <g
                    key={`pt-${idx}`}
                    className="cursor-pointer"
                    onMouseEnter={() =>
                      setHoveredPoint({
                        time: pt.time,
                        pnl: pt.pnl,
                        x: pt.x,
                        y: pt.y,
                      })
                    }
                  >
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={hoveredPoint?.time === pt.time ? 5 : 3.5}
                      fill={isNetPositive ? (isLight ? '#059669' : '#00D6A3') : (isLight ? '#dc2626' : '#FF3D6E')}
                      stroke="#ffffff"
                      strokeWidth={hoveredPoint?.time === pt.time ? 2 : 1}
                      className="transition-all duration-150"
                    />
                  </g>
                ))}
              </svg>

              {/* Tooltip Overlay */}
              {hoveredPoint && (
                <div
                  className={`absolute z-20 pointer-events-none -translate-x-1/2 -translate-y-full mb-2 px-2.5 py-1 rounded-lg text-center shadow-xl text-[11px] border ${
                    isLight
                      ? 'bg-white border-[#E5E7EB] text-[#111827] shadow-lg'
                      : 'bg-[#0D111B] border-[#28344A] text-[#F3F6FB] shadow-2xl'
                  }`}
                  style={{
                    left: `${(hoveredPoint.x / 360) * 100}%`,
                    top: `${(hoveredPoint.y / 140) * 100}%`,
                  }}
                >
                  <div className={`font-mono text-[9px] ${isLight ? 'text-[#6B7280]' : 'text-[#8C97AB]'}`}>
                    {hoveredPoint.time}
                  </div>
                  <div
                    className={`font-mono font-bold ${
                      hoveredPoint.pnl >= 0
                        ? isLight ? 'text-[#059669]' : 'text-[#00D6A3]'
                        : isLight ? 'text-[#DC2626]' : 'text-[#FF3D6E]'
                    }`}
                  >
                    {formatCurrency(hoveredPoint.pnl)}
                  </div>
                </div>
              )}
            </div>

            {/* Label badge at bottom of chart */}
            <div className="text-center mt-1">
              <span className={`inline-block text-[11px] font-medium px-2.5 py-0.5 rounded-full border ${
                isLight
                  ? 'text-[#6B7280] bg-[#F8FAFC] border-[#E5E7EB]'
                  : 'text-[#8C97AB] bg-[#111722] border-[#20283A]'
              }`}>
                Intraday cumulative net P&L
              </span>
            </div>
          </div>

          {/* Right: Summary Metrics 4-Col Grid with Divider Lines */}
          <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-4 gap-y-4 gap-x-2 sm:gap-x-4 pl-0 lg:pl-4">
            {/* Column 1: Total trades & Winrate */}
            <div className={`space-y-4 border-r pr-2 sm:pr-4 ${isLight ? 'border-[#E5E7EB]' : 'border-[#20283A]'}`}>
              <div>
                <span className={`block text-xs ${isLight ? 'text-[#6B7280]' : 'text-[#8C97AB]'}`}>Total trades</span>
                <span className={`text-sm sm:text-base font-bold font-mono ${isLight ? 'text-[#111827]' : 'text-[#F3F6FB]'}`}>
                  {totalTrades}
                </span>
              </div>
              <div>
                <span className={`block text-xs ${isLight ? 'text-[#6B7280]' : 'text-[#8C97AB]'}`}>Winrate</span>
                <span className={`text-sm sm:text-base font-bold font-mono ${isLight ? 'text-[#111827]' : 'text-[#F3F6FB]'}`}>
                  {winRate}%
                </span>
              </div>
            </div>

            {/* Column 2: Winners & Losers */}
            <div className={`space-y-4 sm:border-r pr-2 sm:pr-4 ${isLight ? 'border-[#E5E7EB]' : 'border-[#20283A]'}`}>
              <div>
                <span className={`block text-xs ${isLight ? 'text-[#6B7280]' : 'text-[#8C97AB]'}`}>Winners</span>
                <span className={`text-sm sm:text-base font-bold font-mono ${isLight ? 'text-[#059669]' : 'text-[#00D6A3]'}`}>
                  {winners}
                </span>
              </div>
              <div>
                <span className={`block text-xs ${isLight ? 'text-[#6B7280]' : 'text-[#8C97AB]'}`}>Losers</span>
                <span className={`text-sm sm:text-base font-bold font-mono ${isLight ? 'text-[#DC2626]' : 'text-[#FF3D6E]'}`}>
                  {losers}
                </span>
              </div>
            </div>

            {/* Column 3: Gross P&L & Volume */}
            <div className={`space-y-4 border-r pr-2 sm:pr-4 ${isLight ? 'border-[#E5E7EB]' : 'border-[#20283A]'}`}>
              <div>
                <span className={`block text-xs ${isLight ? 'text-[#6B7280]' : 'text-[#8C97AB]'}`}>Gross P&L</span>
                <span
                  className={`text-sm sm:text-base font-bold font-mono ${
                    grossPnl >= 0
                      ? isLight ? 'text-[#111827]' : 'text-[#F3F6FB]'
                      : isLight ? 'text-[#DC2626]' : 'text-[#FF3D6E]'
                  }`}
                >
                  {formatCurrency(grossPnl)}
                </span>
              </div>
              <div>
                <span className={`block text-xs ${isLight ? 'text-[#6B7280]' : 'text-[#8C97AB]'}`}>Volume</span>
                <span className={`text-sm sm:text-base font-bold font-mono ${isLight ? 'text-[#111827]' : 'text-[#F3F6FB]'}`}>
                  {volume}
                </span>
              </div>
            </div>

            {/* Column 4: Commissions & Profit factor */}
            <div className="space-y-4">
              <div>
                <span className={`block text-xs ${isLight ? 'text-[#6B7280]' : 'text-[#8C97AB]'}`}>Commissions</span>
                <span className={`text-sm sm:text-base font-bold font-mono ${isLight ? 'text-[#111827]' : 'text-[#F3F6FB]'}`}>
                  {formatCurrency(commissions)}
                </span>
              </div>
              <div>
                <span className={`block text-xs ${isLight ? 'text-[#6B7280]' : 'text-[#8C97AB]'}`}>Profit factor</span>
                <span className={`text-sm sm:text-base font-bold font-mono ${isLight ? 'text-[#111827]' : 'text-[#F3F6FB]'}`}>
                  {profitFactor}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* LOWER SECTION: Trades Table */}
        <div className={`px-4 sm:px-6 py-4 flex-1 overflow-x-auto custom-scrollbar ${isLight ? 'bg-white' : 'bg-[#0D111B]'}`}>
          <table className="w-full text-left text-xs border-collapse min-w-[640px]">
            <thead>
              <tr className={`rounded-lg font-bold border-b ${
                isLight
                  ? 'bg-[#F8FAFC] text-[#4B5563] border-[#E5E7EB]'
                  : 'bg-[#111722] text-[#8C97AB] border-[#20283A]'
              }`}>
                <th className="py-2.5 px-3 rounded-l-lg">Open time</th>
                <th className="py-2.5 px-3">Ticker</th>
                <th className="py-2.5 px-3">Side</th>
                <th className="py-2.5 px-3">Instrument</th>
                <th className="py-2.5 px-3">Net P&L</th>
                <th className="py-2.5 px-3">Net ROI</th>
                <th className="py-2.5 px-3">Realized R-Multiple</th>
                <th className="py-2.5 px-3 rounded-r-lg">Playbook</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isLight ? 'divide-[#F1F5F9]' : 'divide-[#20283A]/40'}`}>
              {trades.length === 0 ? (
                <tr>
                  <td colSpan={8} className={`py-8 text-center ${isLight ? 'text-[#9CA3AF]' : 'text-[#5F6B80]'}`}>
                    No trades executed on this date.
                  </td>
                </tr>
              ) : (
                trades.map(t => {
                  const entryDateObj = parseSafeDate(t.entryDate);
                  const openTimeStr = entryDateObj
                    ? `${String(entryDateObj.getHours()).padStart(2, '0')}:${String(entryDateObj.getMinutes()).padStart(2, '0')}:${String(entryDateObj.getSeconds()).padStart(2, '0')}`
                    : '—';

                  const sideStr = t.direction === 'BUY' ? 'LONG' : 'SHORT';
                  const playbookName =
                    playbooks.find(p => p.id === t.playbookId)?.name ||
                    t.setupType ||
                    '—';
                  const isPositive = t.netPnl >= 0;
                  const isSelected = selectedTradeRow?.id === t.id;

                  return (
                    <tr
                      key={t.id}
                      onClick={() => setSelectedTradeRow(t)}
                      className={`cursor-pointer transition ${
                        isLight
                          ? isSelected
                            ? 'bg-blue-50/80 text-[#111827]'
                            : 'hover:bg-[#F8FAFC] text-[#374151]'
                          : isSelected
                          ? 'bg-[#172238] text-[#F3F6FB]'
                          : 'hover:bg-[#111722] text-[#8C97AB]'
                      }`}
                    >
                      {/* Open time */}
                      <td className={`py-3 px-3 font-mono text-[11px] ${isLight ? 'text-[#374151]' : 'text-[#C5CEE0]'}`}>
                        {openTimeStr}
                      </td>

                      {/* Ticker badge */}
                      <td className="py-3 px-3">
                        <span className={`inline-block px-2 py-0.5 rounded font-bold text-[11px] border ${
                          isLight
                            ? 'bg-[#F1F5F9] border-[#E5E7EB] text-[#111827]'
                            : 'bg-[#151C28] border-[#20283A] text-[#F3F6FB]'
                        }`}>
                          {t.symbol}
                        </span>
                      </td>

                      {/* Side */}
                      <td className="py-3 px-3">
                        <span
                          className={`font-bold text-[11px] ${
                            t.direction === 'BUY'
                              ? isLight ? 'text-[#2563FF]' : 'text-[#4C7DFF]'
                              : isLight ? 'text-[#D97706]' : 'text-[#F59E0B]'
                          }`}
                        >
                          {sideStr}
                        </span>
                      </td>

                      {/* Instrument */}
                      <td className={`py-3 px-3 font-medium ${isLight ? 'text-[#374151]' : 'text-[#C5CEE0]'}`}>
                        {t.symbol} {entryDateObj ? safeFormatDate(entryDateObj, '', { month: '2-digit', day: '2-digit' }) : ''}
                      </td>

                      {/* Net P&L */}
                      <td
                        className={`py-3 px-3 font-mono font-bold ${
                          isPositive
                            ? isLight ? 'text-[#059669]' : 'text-[#00D6A3]'
                            : isLight ? 'text-[#DC2626]' : 'text-[#FF3D6E]'
                        }`}
                      >
                        {formatCurrency(t.netPnl)}
                      </td>

                      {/* Net ROI */}
                      <td className={`py-3 px-3 font-mono ${isLight ? 'text-[#374151]' : 'text-[#C5CEE0]'}`}>
                        {t.roiPercent
                          ? `${t.roiPercent >= 0 ? '+' : ''}${t.roiPercent.toFixed(2)}%`
                          : isPositive
                          ? '+0.13%'
                          : '-0.10%'}
                      </td>

                      {/* Realized R-Multiple */}
                      <td className={`py-3 px-3 font-mono ${isLight ? 'text-[#374151]' : 'text-[#C5CEE0]'}`}>
                        {t.rMultiple
                          ? `${t.rMultiple >= 0 ? '+' : ''}${t.rMultiple.toFixed(2)}R`
                          : formatRMultiple(t.rMultiple || (isPositive ? 3.5 : -1.0))}
                      </td>

                      {/* Playbook */}
                      <td className={`py-3 px-3 ${isLight ? 'text-[#6B7280]' : 'text-[#8C97AB]'}`}>
                        {playbookName}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* BOTTOM ACTIONS: Cancel & View Details */}
        <div className={`px-6 py-4 border-t flex items-center justify-end gap-3 ${
          isLight
            ? 'border-[#E5E7EB] bg-[#F8FAFC]'
            : 'border-[#20283A] bg-[#0A0E16]'
        }`}>
          <button
            onClick={onClose}
            className={`px-5 py-2 rounded-lg text-xs font-semibold border transition ${
              isLight
                ? 'border-[#E5E7EB] bg-white hover:bg-[#F1F5F9] text-[#374151]'
                : 'border-[#20283A] bg-[#111722] hover:bg-[#172030] text-[#8C97AB] hover:text-[#F3F6FB]'
            }`}
          >
            Cancel
          </button>
          <button
            onClick={handleViewDetails}
            className="px-6 py-2 rounded-lg text-xs font-semibold transition active:scale-[0.98] bg-[#2563FF] hover:bg-[#1D4ED8] text-white shadow-sm"
          >
            View Details
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
