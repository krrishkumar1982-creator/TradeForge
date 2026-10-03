import React from 'react';
import { TradeStatus, TradeDirection } from '../../types';

interface TradeStatusBadgeProps {
  status: TradeStatus;
  className?: string;
}

export const TradeStatusBadge: React.FC<TradeStatusBadgeProps> = ({ status, className = '' }) => {
  if (status === 'OPEN') {
    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10.5px] font-semibold tracking-wider uppercase bg-blue-500/10 text-blue-400 border border-blue-500/25 ${className}`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
        <span>OPEN</span>
      </span>
    );
  }

  if (status === 'CANCELLED') {
    return (
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded text-[10.5px] font-semibold tracking-wider uppercase bg-[#18181B] text-[#71717A] border border-white/[0.08] ${className}`}
      >
        CANCELLED
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-[10.5px] font-semibold tracking-wider uppercase bg-[#141416] text-[#A1A1AA] border border-white/[0.06] ${className}`}
    >
      CLOSED
    </span>
  );
};

export const TradeDirectionBadge: React.FC<{ direction: TradeDirection; className?: string }> = ({
  direction,
  className = '',
}) => {
  const isBuy = direction === 'BUY';
  return (
    <span
      className={`inline-flex items-center justify-center px-2 py-0.5 rounded text-[10.5px] font-bold tracking-wider font-mono ${
        isBuy
          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
          : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
      } ${className}`}
    >
      {isBuy ? 'LONG' : 'SHORT'}
    </span>
  );
};
