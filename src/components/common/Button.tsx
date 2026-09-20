import React from 'react';
import { LucideIcon } from 'lucide-react';
import { useTrading } from '../../context/TradingContext';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'outline';
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: LucideIcon | React.ComponentType<{ className?: string }>;
  iconPosition?: 'left' | 'right';
  isLoading?: boolean;
  isActive?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'secondary',
  size = 'md',
  icon: Icon,
  iconPosition = 'left',
  isLoading = false,
  isActive = false,
  className = '',
  disabled,
  ...props
}) => {
  const { theme } = useTrading();
  const isLight = theme === 'light';

  const sizeClasses: Record<ButtonSize, string> = {
    xs: 'h-7 px-2.5 text-[11px] gap-1.5 rounded-lg',
    sm: 'h-8 px-3 text-xs gap-1.5 rounded-lg',
    md: 'h-9 px-3.5 text-xs gap-2 rounded-xl font-medium',
    lg: 'h-10 px-4 text-sm gap-2.5 rounded-xl font-semibold',
  };

  const iconSizes: Record<ButtonSize, string> = {
    xs: 'w-3 h-3',
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-4 h-4',
  };

  const variantClasses: Record<ButtonVariant, string> = {
    primary:
      'bg-blue-600 hover:bg-blue-500 text-white shadow-xs border border-blue-400/30 active:scale-[0.98]',
    secondary: isLight
      ? 'bg-white hover:bg-zinc-100 text-zinc-800 hover:text-zinc-900 border border-zinc-300 hover:border-zinc-400 shadow-xs active:scale-[0.98]'
      : 'bg-[#12141A] hover:bg-[#181A21] text-slate-200 hover:text-white border border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.14)] active:scale-[0.98]',
    ghost: isLight
      ? 'bg-transparent hover:bg-zinc-100 text-zinc-600 hover:text-zinc-900 border border-transparent'
      : 'bg-transparent hover:bg-[#12141A] text-slate-400 hover:text-slate-200 border border-transparent',
    danger: isLight
      ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 hover:text-rose-800 border border-rose-200 active:scale-[0.98]'
      : 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 border border-rose-500/25 active:scale-[0.98]',
    success: isLight
      ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 hover:text-emerald-800 border border-emerald-200 active:scale-[0.98]'
      : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 hover:text-emerald-300 border border-emerald-500/25 active:scale-[0.98]',
    outline: isLight
      ? 'bg-transparent hover:bg-blue-50 text-blue-700 hover:text-blue-800 border border-blue-300 active:scale-[0.98]'
      : 'bg-transparent hover:bg-blue-500/10 text-blue-400 hover:text-blue-300 border border-blue-500/30 active:scale-[0.98]',
  };

  const activeClasses = isActive
    ? isLight
      ? 'bg-blue-50 text-blue-700 border-blue-300 shadow-xs'
      : 'bg-blue-600/15 text-blue-400 border-blue-500/40'
    : variantClasses[variant];

  return (
    <button
      disabled={disabled || isLoading}
      className={`inline-flex items-center justify-center transition-all duration-140 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none select-none ${sizeClasses[size]} ${activeClasses} ${className}`}
      {...props}
    >
      {isLoading ? (
        <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0" />
      ) : Icon && iconPosition === 'left' ? (
        <Icon className={`${iconSizes[size]} shrink-0`} />
      ) : null}

      {children && <span className="truncate">{children}</span>}

      {!isLoading && Icon && iconPosition === 'right' && (
        <Icon className={`${iconSizes[size]} shrink-0`} />
      )}
    </button>
  );
};

export const TradeForgeButton = Button;
