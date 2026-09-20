import React from 'react';
import { LucideIcon } from 'lucide-react';
import { useTrading } from '../../context/TradingContext';

export type CardVariant = 'default' | 'elevated' | 'subtle' | 'interactive' | 'warning';
export type CardPadding = 'none' | 'xs' | 'sm' | 'md' | 'lg';

export interface CardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  children: React.ReactNode;
  variant?: CardVariant;
  padding?: CardPadding;
  hoverable?: boolean;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: LucideIcon | React.ComponentType<{ className?: string }>;
  action?: React.ReactNode;
  headerBorder?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  padding = 'md',
  hoverable = false,
  title,
  subtitle,
  icon: Icon,
  action,
  headerBorder = true,
  className = '',
  id,
  ...props
}) => {
  const { theme } = useTrading();
  const isLight = theme === 'light';

  const variantClasses: Record<CardVariant, string> = {
    default: isLight
      ? 'bg-white border-zinc-200 shadow-xs'
      : 'bg-[#12141A] border-[rgba(255,255,255,0.08)] shadow-[0_4px_16px_rgba(0,0,0,0.35)]',
    elevated: isLight
      ? 'bg-white border-zinc-200 shadow-sm'
      : 'bg-[#181A21] border-[rgba(255,255,255,0.12)] shadow-[0_8px_30px_rgba(0,0,0,0.5)]',
    subtle: isLight
      ? 'bg-zinc-50/80 border-zinc-200'
      : 'bg-[#0E1015] border-[rgba(255,255,255,0.05)]',
    interactive: isLight
      ? 'bg-white border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50/60 cursor-pointer shadow-xs'
      : 'bg-[#12141A] border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.14)] hover:bg-[#161821] cursor-pointer',
    warning: isLight
      ? 'bg-amber-50/70 border-amber-200 shadow-amber-500/5'
      : 'bg-[#14120E] border-amber-500/25 shadow-amber-500/5',
  };

  const paddingClasses: Record<CardPadding, string> = {
    none: 'p-0',
    xs: 'p-2 sm:p-2.5',
    sm: 'p-3 sm:p-3.5',
    md: 'p-4 sm:p-5',
    lg: 'p-5 sm:p-6',
  };

  const hasHeader = title || action;

  return (
    <div
      id={id}
      className={`rounded-xl border transition-all duration-150 ${variantClasses[variant]} ${
        hoverable
          ? isLight
            ? 'hover:border-zinc-300 hover:bg-zinc-50/60'
            : 'hover:border-[rgba(255,255,255,0.14)] hover:bg-[#161821]'
          : ''
      } ${className}`}
      {...props}
    >
      {hasHeader && (
        <div
          className={`flex items-center justify-between gap-3 px-4 sm:px-5 py-3 ${
            headerBorder
              ? isLight
                ? 'border-b border-zinc-200'
                : 'border-b border-[rgba(255,255,255,0.07)]'
              : ''
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            {Icon && (
              <div
                className={`p-1.5 rounded-lg shrink-0 ${
                  isLight
                    ? 'bg-blue-50 text-blue-600 border border-blue-200'
                    : 'bg-blue-500/10 border border-blue-500/20 text-blue-400'
                }`}
              >
                <Icon className="w-4 h-4" />
              </div>
            )}
            <div className="min-w-0">
              {typeof title === 'string' ? (
                <h3
                  className={`text-xs sm:text-sm font-semibold truncate tracking-tight ${
                    isLight ? 'text-zinc-900' : 'text-slate-100'
                  }`}
                >
                  {title}
                </h3>
              ) : (
                title
              )}
              {subtitle && (
                <p
                  className={`text-[11px] truncate mt-0.5 ${
                    isLight ? 'text-zinc-500' : 'text-slate-400'
                  }`}
                >
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          {action && <div className="flex items-center gap-2 shrink-0">{action}</div>}
        </div>
      )}
      <div className={paddingClasses[padding]}>{children}</div>
    </div>
  );
};

export const TradeForgeCard = Card;
