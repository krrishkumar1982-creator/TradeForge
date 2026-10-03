import React from 'react';
import { TradeSource } from '../../types';

interface TradeSourceBadgeProps {
  source?: TradeSource | string;
  className?: string;
}

export const TradeSourceBadge: React.FC<TradeSourceBadgeProps> = ({ source, className = '' }) => {
  const norm = (source || 'manual').toLowerCase();

  let label = 'Manual';
  let badgeClasses = 'text-[#A1A1AA] bg-white/[0.04] border-white/[0.08]';

  if (norm.includes('mt5')) {
    label = 'MT5';
    badgeClasses = 'text-blue-400 bg-blue-500/10 border-blue-500/20';
  } else if (norm.includes('mt4')) {
    label = 'MT4';
    badgeClasses = 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20';
  } else if (norm.includes('csv')) {
    label = 'CSV';
    badgeClasses = 'text-amber-400 bg-amber-500/10 border-amber-500/20';
  } else if (norm.includes('api')) {
    label = 'API';
    badgeClasses = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
  } else if (norm.includes('ctrader')) {
    label = 'cTrader';
    badgeClasses = 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20';
  }

  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-medium border ${badgeClasses} ${className}`}
    >
      {label}
    </span>
  );
};
