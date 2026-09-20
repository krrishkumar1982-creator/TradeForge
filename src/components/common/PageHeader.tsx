import React from 'react';
import { LucideIcon } from 'lucide-react';
import { useTrading } from '../../context/TradingContext';

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon | React.ComponentType<{ className?: string }>;
  badge?: string;
  badgeVariant?: 'blue' | 'purple' | 'emerald' | 'amber';
  actions?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  id?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  icon: Icon,
  badge,
  badgeVariant = 'blue',
  actions,
  children,
  className = '',
  id,
}) => {
  const { theme } = useTrading();
  const isLight = theme === 'light';

  const badgeClasses: Record<string, string> = {
    blue: isLight
      ? 'bg-blue-50 text-blue-700 border-blue-200'
      : 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    purple: isLight
      ? 'bg-purple-50 text-purple-700 border-purple-200'
      : 'bg-purple-500/10 text-purple-300 border-purple-500/20',
    emerald: isLight
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
      : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    amber: isLight
      ? 'bg-amber-50 text-amber-700 border-amber-200'
      : 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  };

  return (
    <div id={id} className={`space-y-4 pb-1 ${className}`}>
      <div
        className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-5 rounded-xl border ${
          isLight
            ? 'bg-white border-zinc-200 shadow-xs'
            : 'bg-[#12141A] border-[rgba(255,255,255,0.08)] shadow-[0_4px_16px_rgba(0,0,0,0.35)]'
        }`}
      >
        <div className="flex items-start gap-3 min-w-0">
          {Icon && (
            <div
              className={`p-2 rounded-xl shrink-0 mt-0.5 ${
                isLight
                  ? 'bg-blue-50 border border-blue-200 text-blue-600'
                  : 'bg-blue-500/10 border border-blue-500/20 text-blue-400'
              }`}
            >
              <Icon className="w-5 h-5" />
            </div>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1
                className={`text-lg sm:text-xl font-bold tracking-tight truncate ${
                  isLight ? 'text-zinc-900' : 'text-white'
                }`}
              >
                {title}
              </h1>
              {badge && (
                <span
                  className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${badgeClasses[badgeVariant]}`}
                >
                  {badge}
                </span>
              )}
            </div>
            {subtitle && (
              <p
                className={`text-xs mt-0.5 line-clamp-1 ${
                  isLight ? 'text-zinc-500' : 'text-slate-400'
                }`}
              >
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {actions && (
          <div className="flex items-center gap-2 shrink-0 flex-wrap">{actions}</div>
        )}
      </div>

      {children}
    </div>
  );
};

export const TradeForgeSectionHeader = PageHeader;
export const TradeForgePageHeader = PageHeader;
