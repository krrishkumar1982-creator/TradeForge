import React, { useState } from 'react';
import { Info } from 'lucide-react';

export interface MetricRowData {
  label: string;
  value: React.ReactNode;
  valueColor?: 'profit' | 'loss' | 'neutral' | 'accent';
  tooltip?: string;
}

export interface MonthSummaryData {
  hasData: boolean;
  value: string;
  monthName: string;
  isProfit?: boolean;
  isLoss?: boolean;
}

export interface InstitutionalMetricTableProps {
  bestMonth: MonthSummaryData;
  worstMonth: MonthSummaryData;
  avgMonth: MonthSummaryData;
  leftMetrics: MetricRowData[];
  rightMetrics: MetricRowData[];
  title?: string;
  subtitle?: string;
}

export const InstitutionalMetricTable: React.FC<InstitutionalMetricTableProps> = ({
  bestMonth,
  worstMonth,
  avgMonth,
  leftMetrics,
  rightMetrics,
  title,
  subtitle,
}) => {
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);

  const getValueColorClass = (color?: 'profit' | 'loss' | 'neutral' | 'accent') => {
    switch (color) {
      case 'profit':
        return 'text-emerald-400 font-semibold';
      case 'loss':
        return 'text-rose-400 font-semibold';
      case 'accent':
        return 'text-blue-400 font-semibold';
      case 'neutral':
      default:
        return 'text-[#F5F5F5] font-medium';
    }
  };

  const renderMetricRow = (item: MetricRowData, key: string) => (
    <div
      key={key}
      className="group flex items-center justify-between py-2.5 px-3 border-b border-white/[0.06] text-xs transition-colors hover:bg-white/[0.02]"
    >
      <div className="flex items-center gap-1.5 min-w-0 pr-3">
        <span className="text-[#A1A1AA] font-normal truncate group-hover:text-[#D4D4D8] transition-colors">
          {item.label}
        </span>
        {item.tooltip && (
          <div className="relative inline-flex items-center shrink-0">
            <button
              type="button"
              onMouseEnter={() => setActiveTooltip(key)}
              onMouseLeave={() => setActiveTooltip(null)}
              onClick={() => setActiveTooltip(activeTooltip === key ? null : key)}
              className="text-[#52525B] hover:text-[#A1A1AA] transition p-0.5"
              aria-label={`Info for ${item.label}`}
            >
              <Info className="w-3 h-3" />
            </button>
            {activeTooltip === key && (
              <div className="absolute left-0 bottom-full mb-1.5 w-48 sm:w-56 p-2 rounded-lg border border-white/[0.12] bg-[#121212] shadow-2xl text-[11px] text-[#D4D4D8] font-normal leading-snug z-50 pointer-events-none animate-in fade-in">
                {item.tooltip}
              </div>
            )}
          </div>
        )}
      </div>
      <span className={`font-mono text-right shrink-0 ${getValueColorClass(item.valueColor)}`}>
        {item.value}
      </span>
    </div>
  );

  return (
    <div className="w-full bg-[#080808] border border-white/[0.08] rounded-xl overflow-hidden text-[#F5F5F5] select-none shadow-2xl">
      {/* Optional Card Title Bar */}
      {title && (
        <div className="px-6 py-4 border-b border-white/[0.06] bg-[#0A0A0A] flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-[#F5F5F5]">
              {title}
            </h3>
            {subtitle && (
              <p className="text-[11px] text-[#71717A] mt-0.5">{subtitle}</p>
            )}
          </div>
        </div>
      )}

      {/* 1. TOP SUMMARY: 3-Column Month Summary with subtle vertical dividers */}
      <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-white/[0.06] border-b border-white/[0.06] bg-[#090909]">
        {/* BEST MONTH */}
        <div className="px-6 py-5 space-y-1">
          <div className="text-[11px] font-bold uppercase tracking-wider text-[#A1A1AA]">
            BEST MONTH
          </div>
          <div className="text-2xl sm:text-3xl font-mono font-bold tracking-tight text-emerald-400">
            {bestMonth.hasData ? bestMonth.value : '—'}
          </div>
          <div className="text-xs text-[#71717A] font-medium">
            {bestMonth.hasData ? bestMonth.monthName : 'No data'}
          </div>
        </div>

        {/* WORST MONTH */}
        <div className="px-6 py-5 space-y-1">
          <div className="text-[11px] font-bold uppercase tracking-wider text-[#A1A1AA]">
            WORST MONTH
          </div>
          <div className="text-2xl sm:text-3xl font-mono font-bold tracking-tight text-rose-400">
            {worstMonth.hasData ? worstMonth.value : '—'}
          </div>
          <div className="text-xs text-[#71717A] font-medium">
            {worstMonth.hasData ? worstMonth.monthName : 'No data'}
          </div>
        </div>

        {/* AVERAGE */}
        <div className="px-6 py-5 space-y-1">
          <div className="text-[11px] font-bold uppercase tracking-wider text-[#A1A1AA]">
            AVERAGE
          </div>
          <div
            className={`text-2xl sm:text-3xl font-mono font-bold tracking-tight ${
              avgMonth.hasData
                ? avgMonth.isProfit
                  ? 'text-emerald-400'
                  : avgMonth.isLoss
                  ? 'text-rose-400'
                  : 'text-[#F5F5F5]'
                : 'text-[#F5F5F5]'
            }`}
          >
            {avgMonth.hasData ? avgMonth.value : '$0.00'}
          </div>
          <div className="text-xs text-[#71717A] font-medium">
            per Month
          </div>
        </div>
      </div>

      {/* 2. TWO-COLUMN FLAT METRICS TABLE (No Card Boxes, Pure Rows) */}
      <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-white/[0.06] p-2 sm:p-4 bg-[#080808]">
        {/* LEFT COLUMN */}
        <div className="pr-0 md:pr-4 space-y-0">
          {leftMetrics.map((item, idx) => renderMetricRow(item, `left-${idx}`))}
        </div>

        {/* RIGHT COLUMN */}
        <div className="pl-0 md:pl-4 pt-2 md:pt-0 space-y-0">
          {rightMetrics.map((item, idx) => renderMetricRow(item, `right-${idx}`))}
        </div>
      </div>
    </div>
  );
};
