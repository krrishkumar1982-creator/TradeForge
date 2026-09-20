import React from 'react';
import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useTrading } from '../../context/TradingContext';

export interface MetricCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  change?: number | string;
  trend?: 'up' | 'down' | 'neutral';
  icon?: LucideIcon | React.ComponentType<{ className?: string }>;
  variant?: 'default' | 'success' | 'danger' | 'warning' | 'accent';
  size?: 'sm' | 'md' | 'lg';
  statusBadge?: string;
  className?: string;
  tooltip?: string;
  id?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  subValue,
  change,
  trend,
  icon: Icon,
  variant = 'default',
  size = 'md',
  statusBadge,
  className = '',
  tooltip,
  id,
}) => {
  const { theme } = useTrading();
  const isLight = theme === 'light';

  const variantStyles = {
    default: {
      border: isLight ? 'border-zinc-200' : 'border-[rgba(255,255,255,0.08)]',
      iconBg: isLight
        ? 'bg-zinc-100 text-zinc-700 border border-zinc-200'
        : 'bg-[#181A21] text-slate-300 border border-[rgba(255,255,255,0.06)]',
      valueColor: isLight ? 'text-zinc-900' : 'text-slate-100',
    },
    success: {
      border: isLight ? 'border-emerald-200' : 'border-emerald-500/25',
      iconBg: isLight
        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
        : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
      valueColor: isLight ? 'text-emerald-700' : 'text-emerald-400',
    },
    danger: {
      border: isLight ? 'border-rose-200' : 'border-rose-500/25',
      iconBg: isLight
        ? 'bg-rose-50 text-rose-700 border border-rose-200'
        : 'bg-rose-500/10 text-rose-400 border border-rose-500/20',
      valueColor: isLight ? 'text-rose-700' : 'text-rose-400',
    },
    warning: {
      border: isLight ? 'border-amber-200' : 'border-amber-500/25',
      iconBg: isLight
        ? 'bg-amber-50 text-amber-700 border border-amber-200'
        : 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
      valueColor: isLight ? 'text-amber-800' : 'text-amber-400',
    },
    accent: {
      border: isLight ? 'border-blue-200' : 'border-blue-500/25',
      iconBg: isLight
        ? 'bg-blue-50 text-blue-700 border border-blue-200'
        : 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
      valueColor: isLight ? 'text-blue-700' : 'text-blue-400',
    },
  };

  const style = variantStyles[variant];

  const sizeClasses = {
    sm: 'p-3',
    md: 'p-3.5 sm:p-4',
    lg: 'p-4 sm:p-5',
  };

  const valueSizes = {
    sm: 'text-base sm:text-lg',
    md: 'text-lg sm:text-xl',
    lg: 'text-xl sm:text-2xl',
  };

  return (
    <div
      id={id}
      title={tooltip}
      className={`relative rounded-xl border transition-all duration-140 ${
        isLight
          ? 'bg-white shadow-xs hover:border-zinc-300'
          : 'bg-[#12141A] hover:border-[rgba(255,255,255,0.14)]'
      } ${style.border} ${sizeClasses[size]} ${className}`}
    >
      <div className="flex items-start justify-between gap-2.5">
        <div className="space-y-1 min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span
              className={`text-[11px] font-medium tracking-tight select-none truncate ${
                isLight ? 'text-zinc-500' : 'text-slate-400'
              }`}
            >
              {label}
            </span>
            {statusBadge && (
              <span
                className={`text-[9px] font-semibold px-1.5 py-0.2 rounded-full border ${
                  isLight
                    ? 'bg-zinc-100 text-zinc-700 border-zinc-200'
                    : 'bg-[#181A21] text-slate-300 border-[rgba(255,255,255,0.08)]'
                }`}
              >
                {statusBadge}
              </span>
            )}
          </div>

          <div
            className={`font-mono tabular-nums font-bold tracking-tight truncate ${style.valueColor} ${valueSizes[size]}`}
          >
            {value}
          </div>

          {(subValue || change !== undefined) && (
            <div className="flex items-center gap-1.5 text-[11px] pt-0.5">
              {trend && (
                <span className="flex items-center gap-0.5 font-medium">
                  {trend === 'up' && (
                    <TrendingUp className={`w-3 h-3 ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`} />
                  )}
                  {trend === 'down' && (
                    <TrendingDown className={`w-3 h-3 ${isLight ? 'text-rose-600' : 'text-rose-400'}`} />
                  )}
                  {trend === 'neutral' && (
                    <Minus className={`w-3 h-3 ${isLight ? 'text-zinc-400' : 'text-slate-400'}`} />
                  )}
                </span>
              )}
              {change !== undefined && (
                <span
                  className={`font-mono font-medium ${
                    trend === 'up'
                      ? isLight
                        ? 'text-emerald-700'
                        : 'text-emerald-400'
                      : trend === 'down'
                      ? isLight
                        ? 'text-rose-700'
                        : 'text-rose-400'
                      : isLight
                      ? 'text-zinc-500'
                      : 'text-slate-400'
                  }`}
                >
                  {typeof change === 'number' && change > 0 ? `+${change}` : change}
                </span>
              )}
              {subValue && (
                <span
                  className={`font-normal truncate ${
                    isLight ? 'text-zinc-500' : 'text-slate-500'
                  }`}
                >
                  {subValue}
                </span>
              )}
            </div>
          )}
        </div>

        {Icon && (
          <div className={`p-2 rounded-lg shrink-0 ${style.iconBg}`}>
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>
    </div>
  );
};

export const TradeForgeKPI = MetricCard;
