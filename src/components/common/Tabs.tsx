import React from 'react';
import { useTrading } from '../../context/TradingContext';

export interface TabItem<T extends string = string> {
  id: T;
  label: string;
  count?: number | string;
  icon?: React.ComponentType<{ className?: string }>;
  badge?: string;
}

export interface TabsProps<T extends string = string> {
  tabs: TabItem<T>[];
  activeTab: T;
  onChange: (tabId: T) => void;
  variant?: 'pill' | 'underline' | 'segment';
  className?: string;
  size?: 'sm' | 'md';
}

export function Tabs<T extends string = string>({
  tabs,
  activeTab,
  onChange,
  variant = 'pill',
  className = '',
  size = 'md',
}: TabsProps<T>) {
  const { theme } = useTrading();
  const isLight = theme === 'light';

  if (variant === 'segment') {
    return (
      <div
        className={`flex items-center gap-1 p-1 rounded-xl overflow-x-auto custom-scrollbar ${
          isLight
            ? 'bg-zinc-100/90 border border-zinc-200'
            : 'bg-[#090A0E] border border-[rgba(255,255,255,0.08)]'
        } ${className}`}
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all duration-140 cursor-pointer ${
                isActive
                  ? isLight
                    ? 'bg-white text-zinc-900 border border-zinc-200 shadow-xs'
                    : 'bg-[#181A21] text-white border border-[rgba(255,255,255,0.12)] shadow-xs'
                  : isLight
                  ? 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/60 border border-transparent'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#12141A] border border-transparent'
              }`}
            >
              {Icon && <Icon className="w-3.5 h-3.5 shrink-0" />}
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  className={`text-[10px] font-mono tabular-nums px-1.5 py-0.2 rounded-md ${
                    isActive
                      ? isLight
                        ? 'bg-zinc-100 text-zinc-800'
                        : 'bg-[#252833] text-slate-200'
                      : isLight
                      ? 'bg-zinc-200 text-zinc-600'
                      : 'bg-[#12141A] text-slate-400'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  if (variant === 'underline') {
    return (
      <div
        className={`flex items-center gap-6 overflow-x-auto custom-scrollbar ${
          isLight ? 'border-b border-zinc-200' : 'border-b border-[rgba(255,255,255,0.08)]'
        } ${className}`}
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              className={`flex items-center gap-2 py-2.5 text-xs font-medium whitespace-nowrap border-b-2 transition-all duration-140 cursor-pointer -mb-px ${
                isActive
                  ? isLight
                    ? 'border-blue-600 text-blue-600 font-semibold'
                    : 'border-blue-500 text-white font-semibold'
                  : isLight
                  ? 'border-transparent text-zinc-500 hover:text-zinc-900 hover:border-zinc-300'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-600'
              }`}
            >
              {Icon && <Icon className="w-3.5 h-3.5 shrink-0" />}
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  className={`text-[10px] font-mono tabular-nums px-1.5 py-0.2 rounded-md ${
                    isActive
                      ? isLight
                        ? 'bg-blue-50 text-blue-700'
                        : 'bg-blue-500/20 text-blue-300'
                      : isLight
                      ? 'bg-zinc-100 text-zinc-500'
                      : 'bg-[#12141A] text-slate-400'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  // Pill variant
  return (
    <div
      className={`flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1 ${className}`}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`flex items-center gap-2 rounded-xl font-medium whitespace-nowrap transition-all duration-140 cursor-pointer border ${
              size === 'sm' ? 'px-3 py-1 text-xs' : 'px-3.5 py-1.5 text-xs'
            } ${
              isActive
                ? isLight
                  ? 'bg-white text-zinc-900 border-zinc-300 shadow-xs font-semibold'
                  : 'bg-[#181A21] text-white border-[rgba(255,255,255,0.14)] shadow-xs'
                : isLight
                ? 'bg-zinc-100/80 border-zinc-200 text-zinc-600 hover:text-zinc-900 hover:border-zinc-300 hover:bg-zinc-100'
                : 'bg-[#101116] border-[rgba(255,255,255,0.06)] text-slate-400 hover:text-white hover:border-[rgba(255,255,255,0.12)] hover:bg-[#15171D]'
            }`}
          >
            {Icon && <Icon className="w-3.5 h-3.5 shrink-0" />}
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span
                className={`text-[10px] font-mono tabular-nums px-1.5 py-0.5 rounded-md border ${
                  isActive
                    ? isLight
                      ? 'bg-zinc-100 text-zinc-800 border-zinc-200'
                      : 'bg-[#232733] text-slate-200 border-[rgba(255,255,255,0.12)]'
                    : isLight
                    ? 'bg-zinc-200/70 text-zinc-600 border-zinc-200'
                    : 'bg-[#0A0D12] text-slate-400 border-[rgba(255,255,255,0.05)]'
                }`}
              >
                {tab.count}
              </span>
            )}
            {tab.badge && (
              <span
                className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                  isLight
                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                    : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                }`}
              >
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export const TradeForgeTabs = Tabs;
