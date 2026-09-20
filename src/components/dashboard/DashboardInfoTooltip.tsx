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
    description: 'The total realized dollar profit or loss across all closed trades in the selected period, minus all broker commissions and fees.',
    formula: 'Net P&L = Gross Profits - Gross Losses - Fees',
    interpretation: 'A positive Net P&L indicates overall account profitability.',
    tips: 'Focus on asymmetrical risk-to-reward setups and cut losing trades swiftly.'
  },
  tradeWinRate: {
    title: 'Trade Win %',
    description: 'The percentage of closed trades that resulted in a positive net profit.',
    formula: 'Trade Win % = (Winning Trades / Total Closed Trades) × 100',
    interpretation: 'A win rate of 40%–60% is highly profitable when Average Win / Loss ratio exceeds 1.5R–2.0R.',
    tips: 'Aim for high-conviction playbook setups rather than overtrading.'
  },
  profitFactor: {
    title: 'Profit Factor',
    description: 'The ratio of gross profits to gross losses. It measures how many dollars you earn for every dollar you lose.',
    formula: 'Profit Factor = Total Gross Profits / |Total Gross Losses|',
    interpretation: 'Above 1.5 is solid profitability; above 2.0 is institutional edge.',
    tips: 'Improve Profit Factor by letting winning trades reach higher targets.'
  },
  dayWinRate: {
    title: 'Day Win %',
    description: 'The percentage of unique trading days where cumulative daily net P&L was positive.',
    formula: 'Day Win % = (Winning Trading Days / Total Completed Trading Days) × 100',
    interpretation: 'Measures day-to-day psychological discipline and consistency.',
    tips: 'Enforce a daily max loss stop to protect your day win rate.'
  },
  avgWinLoss: {
    title: 'Avg Win / Loss Trade',
    description: 'The ratio between your average dollar gain on winning trades versus your average dollar loss on losing trades.',
    formula: 'Avg Win/Loss = Avg Win $ / Avg Loss $',
    interpretation: 'A ratio > 2.0x means your winners are more than twice the size of your losers.',
    tips: 'Avoid averaging down into losing positions.'
  },
  tradeForgeScore: {
    title: 'TradeForge Performance Score',
    description: 'A 0–100 radar metric evaluating overall competency across 6 performance pillars.',
    formula: 'Composite weighted index of Win %, Profit Factor, Avg Win/Loss, Max DD, Consistency, and Recovery.',
    interpretation: '80+ is exceptional edge; 65+ is solid profitability.',
    tips: 'Inspect the radar card to locate and eliminate your largest trading leak.'
  },
  duskFlowScore: {
    title: 'TradeForge Performance Score',
    description: 'A 0–100 radar metric evaluating overall competency across 6 performance pillars.',
    formula: 'Composite weighted index of Win %, Profit Factor, Avg Win/Loss, Max DD, Consistency, and Recovery.',
    interpretation: '80+ is exceptional edge; 65+ is solid profitability.',
    tips: 'Inspect the radar card to locate and eliminate your largest trading leak.'
  },
  progressTracker: {
    title: 'Progress Tracker',
    description: 'Visual calendar heatmap tracking daily execution frequency and checklist compliance.',
    formula: 'Daily session trade frequency and net profitability.',
    interpretation: 'Visualizes consistency across recent trading weeks.',
    tips: 'Maintain strict pre-trade and post-trade checklist compliance.'
  },
  cumulativePnl: {
    title: 'Daily Net Cumulative P&L',
    description: 'Chronological growth curve of your total realized net profit over time.',
    formula: 'Cumulative PnL = Sum of Daily Realized Net P&L',
    interpretation: 'Upward slope with shallow pullbacks demonstrates strong edge and low drawdown.',
    tips: 'Hover over data points to inspect individual session P&L and trade counts.'
  },
  netDailyPnl: {
    title: 'Net Daily P&L',
    description: 'Daily bar chart displaying net profit (green) and loss (red) for each active trading day.',
    formula: 'Sum of all closed trade net P&L executed on that specific calendar date.',
    interpretation: 'Look for green bars consistently exceeding red bars.',
    tips: 'Never allow a single losing day to wipe out multiple winning days.'
  },
  accountBalance: {
    title: 'Account Balance',
    description: 'Real-time account valuation calculated from starting portfolio balance + cumulative net gains.',
    formula: 'Account Balance = Starting Balance + Cumulative Net P&L',
    interpretation: 'Reflects total portfolio value over time.',
    tips: 'Monitor equity curve all-time highs to calibrate position sizing.'
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
        className="text-slate-400 hover:text-blue-400 p-0.5 rounded-full hover:bg-[#1A1F27] transition-colors focus:outline-none"
        title={info.title}
        aria-label={`Info about ${info.title}`}
      >
        <span className="w-3.5 h-3.5 rounded-full border border-slate-500 text-[10px] font-serif font-bold inline-flex items-center justify-center text-slate-400 hover:text-blue-400 hover:border-blue-400">
          i
        </span>
      </button>

      {isOpen && (
        <div
          className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 rounded-xl bg-[#12161D] border border-[#273141] p-3.5 shadow-2xl backdrop-blur-md text-left animate-in fade-in zoom-in-95 pointer-events-auto select-text"
        >
          <div className="flex items-center justify-between pb-1.5 border-b border-[#1C232E]">
            <h4 className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              {info.title}
            </h4>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(false);
              }}
              className="text-slate-400 hover:text-slate-200 p-0.5 rounded"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <p className="text-[11px] text-slate-300 mt-2 leading-relaxed">
            {info.description}
          </p>

          {info.formula && (
            <div className="mt-2 p-1.5 rounded-lg bg-[#0A0D14]/90 border border-[#1C232E] font-mono text-[10px] text-blue-300">
              <span className="text-slate-400">Formula: </span>
              {info.formula}
            </div>
          )}

          {info.interpretation && (
            <div className="mt-2 text-[10.5px] text-slate-300">
              <strong className="text-slate-200">Interpretation: </strong>
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
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px w-2 h-2 bg-[#12161D] border-r border-b border-[#273141] rotate-45" />
        </div>
      )}
    </div>
  );
};
