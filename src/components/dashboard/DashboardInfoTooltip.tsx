import React, { useState, useRef, useEffect } from 'react';
import { Info, X } from 'lucide-react';

export interface MetricInfo {
  title: string;
  description: string;
  formula?: string;
  interpretation?: string;
  tips?: string;
}

interface DashboardInfoTooltipProps {
  info: MetricInfo;
  className?: string;
  size?: 'sm' | 'md';
}

export const METRIC_INFOS: Record<string, MetricInfo> = {
  netPnl: {
    title: 'Net P&L',
    description: 'Total realized profit or loss from closed trades.',
    formula: 'Net P&L = Total Gross Profit - Total Gross Loss',
    interpretation: 'Shows overall trading profitability for the selected period.',
  },
  tradeWinRate: {
    title: 'Win Rate',
    description: 'Percentage of closed trades that were profitable.',
    formula: 'Win Rate = (Winning Trades / Total Trades) × 100',
    interpretation: 'Measured alongside your average win/loss ratio.',
  },
  profitFactor: {
    title: 'Profit Factor',
    description: 'Gross profit divided by gross loss.',
    formula: 'Profit Factor = Total Gross Profit / Total Gross Loss',
    interpretation: 'Measures dollars made per dollar lost.',
  },
  dayWinRate: {
    title: 'Day Win Rate',
    description: 'Percentage of trading days with positive net P&L.',
    formula: 'Day Win Rate = (Winning Days / Total Active Days) × 100',
    interpretation: 'Reflects daily session consistency.',
  },
  avgWinLoss: {
    title: 'Average Win / Loss',
    description: 'Average profit on winning trades divided by average loss on losing trades.',
    formula: 'Average Win / Average Loss',
    interpretation: 'Higher payoff reduces the win rate needed for profitability.',
  },
  tradeForgeScore: {
    title: 'Performance Score',
    description: 'Overall score based on win rate, profit factor, drawdown, and consistency.',
    formula: 'Weighted average across key execution metrics.',
    interpretation: 'Highlights areas of strength and potential leaks.',
  },
  duskFlowScore: {
    title: 'Performance Score',
    description: 'Overall score based on win rate, profit factor, drawdown, and consistency.',
    formula: 'Weighted average across key execution metrics.',
    interpretation: 'Highlights areas of strength and potential leaks.',
  },
  progressTracker: {
    title: 'Trading Activity',
    description: 'Calendar view showing trade frequency and daily results.',
    interpretation: 'Helps review session consistency over time.',
  },
  cumulativePnl: {
    title: 'Equity Curve',
    description: 'Cumulative realized net profit over time.',
    formula: 'Sum of daily net P&L.',
    interpretation: 'Shows account trajectory and drawdown recovery.',
  },
  netDailyPnl: {
    title: 'Daily P&L',
    description: 'Net profit or loss for each trading day.',
    interpretation: 'Displays daily session distribution.',
  },
  accountBalance: {
    title: 'Account Balance',
    description: 'Starting balance plus cumulative net P&L.',
    interpretation: 'Reflects total account equity over time.',
  }
};

export const DashboardInfoTooltip: React.FC<DashboardInfoTooltipProps> = ({
  info,
  className = '',
  size = 'sm'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (tooltipRef.current && !tooltipRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div className={`relative inline-flex items-center ${className}`} ref={tooltipRef}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          setIsOpen(prev => !prev);
        }}
        className="text-[#A1A1AA] hover:text-blue-400 p-0.5 rounded-full hover:bg-[#101010] transition-colors focus:outline-none"
        title={info.title}
        aria-label={`Info about ${info.title}`}
      >
        <span className="w-3.5 h-3.5 rounded-full border border-slate-500 text-[10px] font-serif font-bold inline-flex items-center justify-center text-[#A1A1AA] hover:text-blue-400 hover:border-blue-400">
          i
        </span>
      </button>

      {isOpen && (
        <div
          className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 rounded-xl bg-[#0B0B0B] border border-[rgba(255,255,255,0.10)] p-3.5 shadow-2xl backdrop-blur-md text-left animate-in fade-in zoom-in-95 pointer-events-auto select-text"
        >
          <div className="flex items-center justify-between pb-1.5 border-b border-[rgba(255,255,255,0.07)]">
            <h4 className="text-xs font-bold text-[#F5F5F5] flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              {info.title}
            </h4>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(false);
              }}
              className="text-[#A1A1AA] hover:text-[#F5F5F5] p-0.5 rounded"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <p className="text-[11px] text-[#D4D4D8] mt-2 leading-relaxed">
            {info.description}
          </p>

          {info.formula && (
            <div className="mt-2 p-1.5 rounded-lg bg-[#080808]/90 border border-[rgba(255,255,255,0.07)] font-mono text-[10px] text-blue-300">
              <span className="text-[#A1A1AA]">Formula: </span>
              {info.formula}
            </div>
          )}

          {info.interpretation && (
            <div className="mt-2 text-[10.5px] text-[#D4D4D8]">
              <strong className="text-[#F5F5F5]">Interpretation: </strong>
              {info.interpretation}
            </div>
          )}

          {info.tips && (
            <div className="mt-1.5 text-[10.5px] text-emerald-400 font-medium">
              <strong>Pro Tip: </strong>
              {info.tips}
            </div>
          )}

          {/* Arrow */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px w-2 h-2 bg-[#0B0B0B] border-r border-b border-[rgba(255,255,255,0.10)] rotate-45" />
        </div>
      )}
    </div>
  );
};
