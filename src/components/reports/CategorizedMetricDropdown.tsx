import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Search,
  ChevronDown,
  ChevronRight,
  Check,
  BarChart2,
  Clock,
  TrendingUp,
  ShieldAlert,
  Activity,
  Flame,
  X
} from 'lucide-react';
import { METRIC_CATEGORIES, MetricDefinition, getMetricById } from './metricsCatalog';

interface CategorizedMetricDropdownProps {
  selectedMetricId: string;
  onSelectMetric: (metricId: string) => void;
  isOpen: boolean;
  onClose: () => void;
  isLight?: boolean;
  title?: string;
  excludeMetricIds?: string[];
}

export const CategorizedMetricDropdown: React.FC<CategorizedMetricDropdownProps> = ({
  selectedMetricId,
  onSelectMetric,
  isOpen,
  onClose,
  isLight = false,
  title = 'Select Metric',
  excludeMetricIds = [],
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedCategories, setCollapsedCategories] = useState<{ [catId: string]: boolean }>({});
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Focus search input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setSearchQuery('');
    }
  }, [isOpen]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Toggle category collapse
  const toggleCategory = (catId: string) => {
    setCollapsedCategories(prev => ({
      ...prev,
      [catId]: !prev[catId],
    }));
  };

  // Filter categories and metrics based on search query
  const filteredCategories = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return METRIC_CATEGORIES.map(category => {
      const filteredMetrics = category.metrics.filter(metric => {
        if (excludeMetricIds.includes(metric.id)) return false;
        if (!query) return true;
        return (
          metric.name.toLowerCase().includes(query) ||
          metric.description.toLowerCase().includes(query) ||
          category.name.toLowerCase().includes(query)
        );
      });

      return {
        ...category,
        metrics: filteredMetrics,
      };
    }).filter(category => category.metrics.length > 0);
  }, [searchQuery, excludeMetricIds]);

  if (!isOpen) return null;

  const currentMetricDef = getMetricById(selectedMetricId);

  // Category Icon helper
  const getCategoryIcon = (id: string) => {
    switch (id) {
      case 'time_analysis':
        return <Clock className="w-4 h-4 text-amber-500" />;
      case 'profitability':
        return <TrendingUp className="w-4 h-4 text-emerald-500" />;
      case 'risk_drawdown':
        return <ShieldAlert className="w-4 h-4 text-rose-500" />;
      case 'trading_activity':
        return <Activity className="w-4 h-4 text-blue-500" />;
      case 'streaks_consistency':
        return <Flame className="w-4 h-4 text-orange-500" />;
      default:
        return <BarChart2 className="w-4 h-4 text-purple-500" />;
    }
  };

  return (
    <div
      ref={dropdownRef}
      className={`absolute z-50 top-full left-0 mt-2 w-80 sm:w-96 rounded-2xl border shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150 ${
        isLight
          ? 'bg-white border-zinc-200 text-zinc-900 shadow-zinc-300/50'
          : 'bg-[#12161D] border-[#273141] text-slate-100 shadow-black/80'
      }`}
      style={{ maxHeight: '480px' }}
    >
      {/* Header */}
      <div className={`p-3 border-b flex items-center justify-between gap-2 ${
        isLight ? 'bg-zinc-50 border-zinc-200' : 'bg-[#0A0D14] border-[#1C232E]'
      }`}>
        <div className="flex items-center gap-2">
          <BarChart2 className={`w-4 h-4 ${isLight ? 'text-blue-600' : 'text-blue-400'}`} />
          <span className="text-xs font-bold tracking-tight uppercase">{title}</span>
        </div>
        <button
          onClick={onClose}
          className={`p-1 rounded-lg transition ${
            isLight
              ? 'text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200'
              : 'text-slate-400 hover:text-slate-100 hover:bg-[#1A1F27]'
          }`}
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Search Bar */}
      <div className={`p-2.5 border-b ${isLight ? 'border-zinc-100' : 'border-[#1C232E]'}`}>
        <div className={`relative flex items-center rounded-xl border px-2.5 py-1.5 transition ${
          isLight
            ? 'bg-zinc-100/80 border-zinc-300 focus-within:border-blue-500 focus-within:bg-white'
            : 'bg-[#0A0D14] border-[#1C232E] focus-within:border-blue-500'
        }`}>
          <Search className={`w-3.5 h-3.5 shrink-0 ${isLight ? 'text-zinc-400' : 'text-slate-500'}`} />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search metrics (e.g. Net P&L, Win Rate)..."
            className={`w-full bg-transparent pl-2 text-xs focus:outline-none placeholder:text-xs ${
              isLight
                ? 'text-zinc-900 placeholder:text-zinc-400'
                : 'text-slate-100 placeholder:text-slate-500'
            }`}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className={`p-0.5 rounded-full ${isLight ? 'text-zinc-400 hover:text-zinc-700' : 'text-slate-500 hover:text-slate-300'}`}
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Categorized Metric List */}
      <div className="overflow-y-auto custom-scrollbar p-2 space-y-1.5 max-h-[360px]">
        {filteredCategories.length === 0 ? (
          <div className={`text-center py-8 text-xs ${isLight ? 'text-zinc-400' : 'text-slate-500'}`}>
            No metrics matching "{searchQuery}"
          </div>
        ) : (
          filteredCategories.map(cat => {
            const isCollapsed = collapsedCategories[cat.id] && !searchQuery;

            return (
              <div
                key={cat.id}
                className={`rounded-xl overflow-hidden border ${
                  isLight ? 'border-zinc-100/80 bg-zinc-50/50' : 'border-[#1C232E] bg-[#0A0D14]/40'
                }`}
              >
                {/* Category Header */}
                <button
                  onClick={() => toggleCategory(cat.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 text-xs font-bold transition text-left ${
                    isLight
                      ? 'bg-zinc-100/70 hover:bg-zinc-200/70 text-zinc-800'
                      : 'bg-[#0A0D14] hover:bg-[#1A1F27]/60 text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {getCategoryIcon(cat.id)}
                    <span>{cat.name}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-normal ${
                      isLight ? 'bg-zinc-200 text-zinc-600' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {cat.metrics.length}
                    </span>
                  </div>
                  {isCollapsed ? (
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                  )}
                </button>

                {/* Metrics Items */}
                {!isCollapsed && (
                  <div className={`p-1 space-y-0.5 divide-y ${
                    isLight ? 'divide-zinc-100' : 'divide-slate-800/40'
                  }`}>
                    {cat.metrics.map(metric => {
                      const isSelected = metric.id === selectedMetricId;

                      return (
                        <button
                          key={metric.id}
                          onClick={() => {
                            onSelectMetric(metric.id);
                            onClose();
                          }}
                          className={`w-full flex items-center justify-between p-2 rounded-lg text-xs transition text-left group ${
                            isSelected
                              ? isLight
                                ? 'bg-blue-50 text-blue-900 font-semibold border border-blue-200'
                                : 'bg-blue-600/20 text-blue-300 font-semibold border border-blue-500/30'
                              : isLight
                              ? 'text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 border border-transparent'
                              : 'text-slate-300 hover:bg-[#1A1F27]/80 hover:text-slate-100 border border-transparent'
                          }`}
                        >
                          <div className="space-y-0.5 pr-2">
                            <div className="flex items-center gap-1.5 font-medium">
                              <span>{metric.name}</span>
                              {metric.isCumulative && (
                                <span className={`text-[9px] font-mono px-1 py-0.2 rounded ${
                                  isLight
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-blue-950 text-blue-300 border border-blue-800'
                                }`}>
                                  Cum.
                                </span>
                              )}
                            </div>
                            <p className={`text-[10px] line-clamp-1 ${
                              isSelected
                                ? isLight ? 'text-blue-700' : 'text-blue-300/80'
                                : isLight ? 'text-zinc-400' : 'text-slate-400'
                            }`}>
                              {metric.description}
                            </p>
                          </div>

                          {isSelected && (
                            <Check className={`w-4 h-4 shrink-0 ${isLight ? 'text-blue-600' : 'text-blue-400'}`} />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Footer Info */}
      <div className={`p-2.5 border-t text-[10px] flex items-center justify-between ${
        isLight
          ? 'bg-zinc-50 border-zinc-200 text-zinc-500'
          : 'bg-[#0A0D14] border-[#1C232E] text-slate-400'
      }`}>
        <span>Currently displaying:</span>
        <strong className={`font-semibold ${isLight ? 'text-blue-700' : 'text-blue-400'}`}>
          {currentMetricDef.name}
        </strong>
      </div>
    </div>
  );
};
