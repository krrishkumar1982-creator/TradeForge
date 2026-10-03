import React from 'react';
import { LucideIcon } from 'lucide-react';
import { Button } from './Button';
import { useTrading } from '../../context/TradingContext';

export interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  actionIcon?: LucideIcon;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  className?: string;
  children?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionIcon,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  className = '',
  children,
}) => {
  const { theme } = useTrading();
  const isLight = theme === 'light';

  return (
    <div
      className={`rounded-2xl border p-8 sm:p-12 text-center max-w-xl mx-auto space-y-4 ${
        isLight
          ? 'bg-white border-zinc-200 shadow-xs'
          : 'border-[rgba(255,255,255,0.055)] bg-[#0D1014] shadow-[0_4px_20px_rgba(0,0,0,0.25)]'
      } ${className}`}
    >
      <div
        className={`w-14 h-14 rounded-2xl mx-auto flex items-center justify-center border ${
          isLight
            ? 'bg-blue-50 border-blue-200 text-blue-600'
            : 'bg-blue-500/10 border-blue-500/20 text-blue-400'
        }`}
      >
        <Icon className="w-7 h-7" />
      </div>

      <div className="space-y-1.5 max-w-md mx-auto">
        <h3
          className={`text-base sm:text-lg font-bold tracking-tight ${
            isLight ? 'text-zinc-900' : 'text-[#F4F5F7]'
          }`}
        >
          {title}
        </h3>
        <p
          className={`text-xs sm:text-sm leading-relaxed ${
            isLight ? 'text-zinc-500' : 'text-[#8A919D]'
          }`}
        >
          {description}
        </p>
      </div>

      {(actionLabel || secondaryActionLabel) && (
        <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
          {secondaryActionLabel && onSecondaryAction && (
            <Button variant="secondary" size="md" onClick={onSecondaryAction}>
              {secondaryActionLabel}
            </Button>
          )}
          {actionLabel && onAction && (
            <Button
              variant="primary"
              size="md"
              icon={actionIcon}
              onClick={onAction}
            >
              {actionLabel}
            </Button>
          )}
        </div>
      )}

      {children}
    </div>
  );
};
