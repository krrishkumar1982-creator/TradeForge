import React, { useState, useMemo } from 'react';
import {
  ChevronDown,
  Plus,
  MoreHorizontal,
  X,
  LineChart,
  BarChart,
  Layers,
  Calendar,
  Trash2,
  RefreshCw,
  Info
} from 'lucide-react';
import { useTrading } from '../../context/TradingContext';
import { getMetricById } from './metricsCatalog';
import { calculateChartSeries, TimeGrouping, DimensionGrouping, formatMetricValue } from './metricsEngine';
import { CategorizedMetricDropdown } from './CategorizedMetricDropdown';

interface DynamicChartCardProps {
  initialPrimaryMetricId?: string;
  initialSecondaryMetricId?: string;
  cardTitle?: string;
  dimensionGrouping?: DimensionGrouping;
  onRemoveCard?: () => void;
  canRemoveCard?: boolean;
}

const SERIES_COLORS = [
  { stroke: '#3b82f6', fill: '#3b82f6', name: 'Blue' },
  { stroke: '#10b981', fill: '#10b981', name: 'Emerald' },
  { stroke: '#f59e0b', fill: '#f59e0b', name: 'Amber' },
  { stroke: '#ec4899', fill: '#ec4899', name: 'Pink' },
  { stroke: '#8b5cf6', fill: '#8b5cf6', name: 'Purple' },
];

export const DynamicChartCard: React.FC<DynamicChartCardProps> = ({
  initialPrimaryMetricId = 'net_pnl',
  initialSecondaryMetricId,
  cardTitle,
  dimensionGrouping,
  onRemoveCard,
  canRemoveCard = false,
}) => {
  const { filteredTrades, theme } = useTrading();
  const isLight = theme === 'light';

  // Selected Metrics State
  const [metricIds, setMetricIds] = useState<string[]>(() => {
    const list = [initialPrimaryMetricId];
    if (initialSecondaryMetricId && initialSecondaryMetricId !== initialPrimaryMetricId) {
      list.push(initialSecondaryMetricId);
    }
    return list;
  });

  // Time Grouping
  const [timeGrouping, setTimeGrouping] = useState<TimeGrouping>('DAY');

  // Chart Type Override ('auto' | 'line' | 'area' | 'bar')
  const [chartTypeOverride, setChartTypeOverride] = useState<'auto' | 'line' | 'area' | 'bar'>('auto');

  // Metric selector dropdown state
  const [activeDropdownIndex, setActiveDropdownIndex] = useState<number | null>(null);
  const [isAddingMetric, setIsAddingMetric] = useState(false);

  // Options menu state
  const [isOptionsMenuOpen, setIsOptionsMenuOpen] = useState(false);

  // Hover state for tooltip
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  // Primary metric
  const primaryMetric = getMetricById(metricIds[0] || 'net_pnl');

  // Calculate chart series from actual filtered trades
  const chartData = useMemo(() => {
    return calculateChartSeries(filteredTrades, metricIds, timeGrouping, dimensionGrouping);
  }, [filteredTrades, metricIds, timeGrouping, dimensionGrouping]);

  // Handle changing metric at index
  const handleSelectMetric = (index: number, newMetricId: string) => {
    setMetricIds(prev => {
      const next = [...prev];
      next[index] = newMetricId;
      return next;
    });
    setActiveDropdownIndex(null);
  };

  // Add metric
  const handleAddMetric = (newMetricId: string) => {
    if (!metricIds.includes(newMetricId) && metricIds.length < 4) {
      setMetricIds(prev => [...prev, newMetricId]);
    }
    setIsAddingMetric(false);
  };

  // Remove metric
  const handleRemoveMetric = (index: number) => {
    if (metricIds.length > 1) {
      setMetricIds(prev => prev.filter((_, i) => i !== index));
    }
  };

  const activePoints = chartData.points;
  const activeSeries = chartData.series;

  return (
    <div className={`rounded-2xl border p-5 shadow-xl transition-all relative ${
      isLight
        ? 'bg-white border-zinc-200 text-zinc-900 shadow-zinc-200/50'
        : 'bg-[#12161D] border-[#1C232E] text-slate-100 shadow-black/60'
    }`}>
      {/* Top Header Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-zinc-200 dark:border-[#1C232E]">
        {/* Metric Selector Area */}
        <div className="flex flex-wrap items-center gap-2 relative">
          {metricIds.map((mId, idx) => {
            const mDef = getMetricById(mId);
            const color = SERIES_COLORS[idx % SERIES_COLORS.length];
            const isDropdownOpen = activeDropdownIndex === idx;

            return (
              <div key={`${mId}-${idx}`} className="relative flex items-center gap-1">
                <button
                  onClick={() => setActiveDropdownIndex(isDropdownOpen ? null : idx)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition ${
                    isLight
                      ? 'bg-zinc-50 border-zinc-300 hover:bg-zinc-100 text-zinc-900 shadow-xs'
                      : 'bg-[#0A0D14] border-[#1C232E] hover:bg-[#1A1F27] text-slate-100'
                  }`}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: color.stroke }}
                  />
                  <span className="truncate max-w-[180px]">{mDef.name}</span>
                  <ChevronDown className="w-3.5 h-3.5 opacity-60 ml-0.5" />
                </button>

                {/* Remove button if more than 1 metric */}
                {metricIds.length > 1 && (
                  <button
                    onClick={() => handleRemoveMetric(idx)}
                    className={`p-1 rounded-lg transition ${
                      isLight
                        ? 'text-zinc-400 hover:text-rose-600 hover:bg-zinc-100'
                        : 'text-slate-500 hover:text-rose-400 hover:bg-[#1A1F27]'
                    }`}
                    title="Remove metric"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}

                {/* Categorized Dropdown for editing metric */}
                <CategorizedMetricDropdown
                  selectedMetricId={mId}
                  onSelectMetric={newId => handleSelectMetric(idx, newId)}
                  isOpen={isDropdownOpen}
                  onClose={() => setActiveDropdownIndex(null)}
                  isLight={isLight}
                  title={`Select Metric ${idx + 1}`}
                  excludeMetricIds={metricIds.filter((_, i) => i !== idx)}
                />
              </div>
            );
          })}

          {/* + Add Metric Button */}
          {metricIds.length < 4 && (
            <div className="relative">
              <button
                onClick={() => setIsAddingMetric(!isAddingMetric)}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition ${
                  isLight
                    ? 'border-dashed border-zinc-300 bg-zinc-50 text-blue-700 hover:bg-blue-50/80 hover:border-blue-300'
                    : 'border-dashed border-[#273141] bg-[#0A0D14] text-blue-400 hover:bg-blue-950/40 hover:border-blue-500/50'
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Metric</span>
              </button>

              <CategorizedMetricDropdown
                selectedMetricId=""
                onSelectMetric={handleAddMetric}
                isOpen={isAddingMetric}
                onClose={() => setIsAddingMetric(false)}
                isLight={isLight}
                title="Add Metric to Chart"
                excludeMetricIds={metricIds}
              />
            </div>
          )}
        </div>

        {/* Right Action Controls (Time Grouping, Chart Type, Options) */}
        <div className="flex items-center gap-2">
          {/* Time Grouping Selector (Only show if not using dimension grouping) */}
          {!dimensionGrouping && (
            <div className={`flex items-center p-0.5 rounded-xl border ${
              isLight ? 'bg-zinc-100 border-zinc-200' : 'bg-[#0A0D14] border-[#1C232E]'
            }`}>
              {(['DAY', 'WEEK', 'MONTH', 'YEAR'] as TimeGrouping[]).map(g => (
                <button
                  key={g}
                  onClick={() => setTimeGrouping(g)}
                  className={`px-2 py-1 text-[11px] font-semibold rounded-lg transition cursor-pointer ${
                    timeGrouping === g
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/25'
                      : isLight
                      ? 'text-zinc-600 hover:text-zinc-900'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {g === 'DAY' ? 'Day' : g === 'WEEK' ? 'Week' : g === 'MONTH' ? 'Month' : 'Year'}
                </button>
              ))}
            </div>
          )}

          {/* Options Menu Toggle */}
          <div className="relative">
            <button
              onClick={() => setIsOptionsMenuOpen(!isOptionsMenuOpen)}
              className={`p-1.5 rounded-xl border transition ${
                isLight
                  ? 'border-zinc-200 bg-zinc-50 hover:bg-zinc-100 text-zinc-600'
                  : 'border-[#1C232E] bg-[#0A0D14] hover:bg-[#1A1F27] text-slate-300'
              }`}
              title="Chart options"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>

            {isOptionsMenuOpen && (
              <div
                className={`absolute right-0 top-full mt-2 w-48 rounded-xl border shadow-xl p-1.5 z-40 text-xs ${
                  isLight
                    ? 'bg-white border-zinc-200 text-zinc-800'
                    : 'bg-[#12161D] border-[#1C232E] text-slate-200'
                }`}
              >
                <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-slate-500">
                  Chart Style
                </div>
                {(['auto', 'line', 'area', 'bar'] as const).map(type => (
                  <button
                    key={type}
                    onClick={() => {
                      setChartTypeOverride(type);
                      setIsOptionsMenuOpen(false);
                    }}
                    className={`w-full text-left px-2 py-1.5 rounded-lg flex items-center justify-between capitalize transition ${
                      chartTypeOverride === type
                        ? isLight
                          ? 'bg-blue-50 text-blue-800 font-bold'
                          : 'bg-blue-600/20 text-blue-300 font-bold'
                        : isLight
                        ? 'hover:bg-zinc-100'
                        : 'hover:bg-[#1A1F27]'
                    }`}
                  >
                    <span>{type === 'auto' ? 'Default' : type}</span>
                    {chartTypeOverride === type && <span className="text-blue-500">✓</span>}
                  </button>
                ))}

                {canRemoveCard && onRemoveCard && (
                  <div className="pt-1 mt-1 border-t border-zinc-200 dark:border-[#1C232E]">
                    <button
                      onClick={() => {
                        setIsOptionsMenuOpen(false);
                        onRemoveCard();
                      }}
                      className="w-full text-left px-2 py-1.5 rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-1.5 font-medium"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remove Chart</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Summary KPI Pills */}
      <div className="flex flex-wrap items-center gap-4 py-3">
        {activeSeries.map((s, idx) => {
          const color = SERIES_COLORS[idx % SERIES_COLORS.length];
          const latestVal = s.values.length > 0 ? s.values[s.values.length - 1] : 0;
          const formatted = formatMetricValue(latestVal, s.metric.unit);
          const isPos = latestVal >= 0;

          return (
            <div key={s.metric.id} className="flex items-center gap-2">
              <span className="text-xs text-zinc-500 dark:text-slate-400 font-medium">
                {s.metric.name}:
              </span>
              <span className={`text-base font-black font-mono ${
                s.metric.unit === 'currency'
                  ? isPos
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-rose-600 dark:text-rose-400'
                  : isLight
                  ? 'text-zinc-900'
                  : 'text-slate-100'
              }`}>
                {formatted}
              </span>
            </div>
          );
        })}
      </div>

      {/* Chart Canvas Area */}
      <div
        className="h-[280px] w-full relative pt-2 pb-6"
        onMouseLeave={() => setHoverIndex(null)}
      >
        {activePoints.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center space-y-2 text-center text-zinc-400 dark:text-slate-500">
            <Info className="w-8 h-8 opacity-40" />
            <p className="text-xs font-semibold">No trade executions found matching active filters</p>
          </div>
        ) : (
          <svg
            viewBox="0 0 800 240"
            className="w-full h-full overflow-visible select-none"
          >
            <defs>
              {activeSeries.map((s, idx) => {
                const color = SERIES_COLORS[idx % SERIES_COLORS.length];
                return (
                  <linearGradient key={s.metric.id} id={`grad-${s.metric.id}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color.stroke} stopOpacity="0.35" />
                    <stop offset="100%" stopColor={color.stroke} stopOpacity="0.0" />
                  </linearGradient>
                );
              })}
            </defs>

            {(() => {
              const padX = 45;
              const padY = 20;
              const w = 800;
              const h = 240;

              // Find overall min and max across all active series for scaling
              let allVals: number[] = [];
              activeSeries.forEach(s => {
                allVals.push(...s.values);
              });
              if (allVals.length === 0) allVals = [0];

              let minVal = Math.min(0, ...allVals);
              let maxVal = Math.max(1, ...allVals);
              if (minVal === maxVal) {
                minVal -= 1;
                maxVal += 1;
              }
              const range = maxVal - minVal;

              const getX = (i: number) => padX + (i / (activePoints.length - 1 || 1)) * (w - 2 * padX);
              const getY = (val: number) => h - padY - ((val - minVal) / range) * (h - 2 * padY);
              const zeroY = getY(0);

              return (
                <>
                  {/* Grid Lines */}
                  <line x1={padX} y1={padY} x2={w - padX} y2={padY} stroke={isLight ? '#e4e4e7' : '#1e293b'} strokeWidth="1" />
                  <line x1={padX} y1={zeroY} x2={w - padX} y2={zeroY} stroke={isLight ? '#a1a1aa' : '#475569'} strokeWidth="1" strokeDasharray="3 3" />
                  <line x1={padX} y1={h - padY} x2={w - padX} y2={h - padY} stroke={isLight ? '#e4e4e7' : '#1e293b'} strokeWidth="1" />

                  {/* Y Axis Labels */}
                  <text x={padX - 8} y={padY + 4} fill={isLight ? '#71717a' : '#64748b'} fontSize="10" textAnchor="end" fontFamily="monospace">
                    {formatMetricValue(maxVal, primaryMetric.unit)}
                  </text>
                  <text x={padX - 8} y={zeroY + 3} fill={isLight ? '#a1a1aa' : '#94a3b8'} fontSize="10" textAnchor="end" fontFamily="monospace">
                    0
                  </text>
                  {minVal < 0 && (
                    <text x={padX - 8} y={h - padY + 3} fill={isLight ? '#71717a' : '#64748b'} fontSize="10" textAnchor="end" fontFamily="monospace">
                      {formatMetricValue(minVal, primaryMetric.unit)}
                    </text>
                  )}

                  {/* Render Each Series */}
                  {activeSeries.map((s, sIdx) => {
                    const color = SERIES_COLORS[sIdx % SERIES_COLORS.length];
                    const chartType = chartTypeOverride !== 'auto'
                      ? chartTypeOverride
                      : s.metric.defaultChartType;

                    const linePoints = s.values.map((v, i) => `${getX(i)},${getY(v)}`).join(' ');
                    const areaPoints = `${getX(0)},${zeroY} ${linePoints} ${getX(s.values.length - 1)},${zeroY}`;

                    if (chartType === 'green_red_bar' || chartType === 'bar') {
                      const barWidth = Math.max(4, Math.min(28, (w - 2 * padX) / activePoints.length - 4));
                      return (
                        <g key={s.metric.id}>
                          {s.values.map((v, i) => {
                            const x = getX(i) - barWidth / 2;
                            const y = v >= 0 ? getY(v) : zeroY;
                            const barH = Math.max(2, Math.abs(getY(v) - zeroY));
                            const isGreen = v >= 0;

                            const barFill = chartType === 'green_red_bar'
                              ? isGreen ? '#10b981' : '#ef4444'
                              : color.stroke;

                            return (
                              <rect
                                key={i}
                                x={x}
                                y={y}
                                width={barWidth}
                                height={barH}
                                rx="2"
                                fill={barFill}
                                opacity={hoverIndex === i ? 1 : 0.85}
                                className="transition-all cursor-pointer hover:brightness-125"
                                onMouseEnter={() => setHoverIndex(i)}
                              />
                            );
                          })}
                        </g>
                      );
                    }

                    return (
                      <g key={s.metric.id}>
                        {chartType === 'area' && (
                          <polygon points={areaPoints} fill={`url(#grad-${s.metric.id})`} />
                        )}
                        <polyline
                          fill="none"
                          stroke={color.stroke}
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          points={linePoints}
                        />
                        {s.values.map((v, i) => (
                          <circle
                            key={i}
                            cx={getX(i)}
                            cy={getY(v)}
                            r={hoverIndex === i ? 6 : 4}
                            fill={color.stroke}
                            className="hover:scale-125 transition-all cursor-pointer"
                            onMouseEnter={() => setHoverIndex(i)}
                          />
                        ))}
                      </g>
                    );
                  })}

                  {/* X Axis Labels */}
                  {activePoints.map((pt, i) => {
                    const step = Math.max(1, Math.floor(activePoints.length / 8));
                    if (i % step !== 0 && i !== activePoints.length - 1) return null;

                    return (
                      <text
                        key={i}
                        x={getX(i)}
                        y={h - 4}
                        fill={isLight ? '#71717a' : '#64748b'}
                        fontSize="10"
                        textAnchor="middle"
                        fontFamily="monospace"
                      >
                        {pt.label}
                      </text>
                    );
                  })}

                  {/* Hover Guide Line */}
                  {hoverIndex !== null && hoverIndex < activePoints.length && (
                    <line
                      x1={getX(hoverIndex)}
                      y1={padY}
                      x2={getX(hoverIndex)}
                      y2={h - padY}
                      stroke={isLight ? '#3b82f6' : '#60a5fa'}
                      strokeWidth="1.5"
                      strokeDasharray="3 3"
                    />
                  )}
                </>
              );
            })()}
          </svg>
        )}

        {/* Hover Tooltip Overlay */}
        {hoverIndex !== null && hoverIndex < activePoints.length && (
          <div className={`absolute top-2 right-4 p-3 rounded-xl border shadow-xl z-30 text-xs backdrop-blur-md transition-all ${
            isLight
              ? 'bg-white/95 border-zinc-300 text-zinc-900 shadow-zinc-300/60'
              : 'bg-[#0A0D14]/90 border-[#273141] text-slate-100 shadow-black'
          }`}>
            <div className="font-bold border-b pb-1 mb-1.5 border-zinc-200 dark:border-[#1C232E] text-[11px] text-zinc-500 dark:text-slate-400">
              {activePoints[hoverIndex].label}
            </div>
            <div className="space-y-1">
              {activeSeries.map((s, idx) => {
                const color = SERIES_COLORS[idx % SERIES_COLORS.length];
                const val = s.values[hoverIndex];
                const formatted = formatMetricValue(val, s.metric.unit);

                return (
                  <div key={s.metric.id} className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color.stroke }} />
                      <span className="font-medium text-zinc-700 dark:text-slate-300">{s.metric.name}:</span>
                    </div>
                    <span className="font-mono font-bold">{formatted}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
