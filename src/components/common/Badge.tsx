import React from 'react';
import { Check, AlertTriangle, AlertOctagon, Lock, Shield, Sparkles } from 'lucide-react';
import { useTrading } from '../../context/TradingContext';

export type BadgeVariant =
  | 'safe'
  | 'caution'
  | 'critical'
  | 'breached'
  | 'locked'
  | 'active'
  | 'neutral'
  | 'success'
  | 'danger'
  | 'warning'
  | 'info'
  | 'purple';

export type BadgeSize = 'xs' | 'sm' | 'md';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  className?: string;
  icon?: React.ComponentType<{ className?: string }>;
  pill?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'sm',
  className = '',
  icon: IconProp,
  pill = true,
}) => {
  const { theme } = useTrading();
  const isLight = theme === 'light';

  const sizeClasses: Record<BadgeSize, string> = {
    xs: 'text-[9px] px-1.5 py-0.5 gap-1 font-medium',
    sm: 'text-[10px] px-2 py-0.5 gap-1 font-medium tracking-tight',
    md: 'text-xs px-2.5 py-1 gap-1.5 font-medium',
  };

  const iconSizes: Record<BadgeSize, string> = {
    xs: 'w-2.5 h-2.5',
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
  };

  // Map legacy variants to new semantic variants
  const effectiveVariant: BadgeVariant =
    variant === 'success' ? 'safe' :
    variant === 'warning' ? 'caution' :
    variant === 'danger' ? 'critical' :
    variant === 'info' ? 'active' :
    variant;

  const variantClasses: Record<BadgeVariant, string> = {
    safe: isLight
      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
      : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25',
    caution: isLight
      ? 'bg-amber-50 text-amber-800 border border-amber-200'
      : 'bg-amber-500/10 text-amber-400 border border-amber-500/25',
    critical: isLight
      ? 'bg-rose-50 text-rose-700 border border-rose-200'
      : 'bg-rose-500/10 text-rose-400 border border-rose-500/25',
    breached: isLight
      ? 'bg-red-100 text-red-800 border border-red-300 font-semibold'
      : 'bg-red-500/15 text-red-300 border border-red-500/35 font-semibold',
    locked: isLight
      ? 'bg-red-100 text-red-900 border border-red-300 font-bold'
      : 'bg-red-950/40 text-red-300 border border-red-500/40 font-bold',
    active: isLight
      ? 'bg-blue-50 text-blue-700 border border-blue-200'
      : 'bg-blue-500/10 text-blue-400 border border-blue-500/25',
    neutral: isLight
      ? 'bg-zinc-100 text-zinc-700 border border-zinc-200'
      : 'bg-[#181A21] text-slate-300 border border-[rgba(255,255,255,0.08)]',
    success: isLight
      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
      : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25',
    danger: isLight
      ? 'bg-rose-50 text-rose-700 border border-rose-200'
      : 'bg-rose-500/10 text-rose-400 border border-rose-500/25',
    warning: isLight
      ? 'bg-amber-50 text-amber-800 border border-amber-200'
      : 'bg-amber-500/10 text-amber-400 border border-amber-500/25',
    info: isLight
      ? 'bg-blue-50 text-blue-700 border border-blue-200'
      : 'bg-blue-500/10 text-blue-400 border border-blue-500/25',
    purple: isLight
      ? 'bg-purple-50 text-purple-700 border border-purple-200'
      : 'bg-purple-500/10 text-purple-300 border border-purple-500/25',
  };

  const getDefaultIcon = () => {
    switch (effectiveVariant) {
      case 'safe':
        return Check;
      case 'caution':
        return AlertTriangle;
      case 'critical':
      case 'breached':
        return AlertOctagon;
      case 'locked':
        return Lock;
      case 'active':
        return Shield;
      default:
        return null;
    }
  };

  const IconComponent = IconProp || getDefaultIcon();

  return (
    <span
      className={`inline-flex items-center justify-center shrink-0 border whitespace-nowrap leading-none ${
        pill ? 'rounded-full' : 'rounded-md'
      } ${sizeClasses[size]} ${variantClasses[effectiveVariant]} ${className}`}
    >
      {IconComponent && <IconComponent className={`${iconSizes[size]} shrink-0`} />}
      <span>{children}</span>
    </span>
  );
};

export const TradeForgeBadge = Badge;
