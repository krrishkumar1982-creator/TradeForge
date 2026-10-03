import React, { useRef, useEffect } from 'react';
import { X, RotateCcw, Calendar, Check, SlidersHorizontal } from 'lucide-react';
import { useTrading } from '../../context/TradingContext';

export interface FilterState {
  searchQuery: string;
  datePreset: 'ALL' | 'TODAY' | 'YESTERDAY' | 'THIS_WEEK' | 'LAST_7_DAYS' | 'THIS_MONTH' | 'LAST_30_DAYS' | 'CUSTOM';
  startDate: string;
  endDate: string;
  accountId: string;
  symbol: string;
  direction: 'ALL' | 'BUY' | 'SELL';
  strategy: string;
  result: 'ALL' | 'WIN' | 'LOSS' | 'BREAKEVEN';
  source: 'ALL' | 'manual' | 'mt4' | 'mt5' | 'csv' | 'api';
  session: string;
  rulesFollowed: 'ALL' | 'YES' | 'NO';
  minPnl: string;
  maxPnl: string;
  selectedTags: string[];
}

export const INITIAL_FILTERS: FilterState = {
  searchQuery: '',
  datePreset: 'ALL',
  startDate: '',
  endDate: '',
  accountId: 'all',
  symbol: '',
  direction: 'ALL',
  strategy: 'ALL',
  result: 'ALL',
  source: 'ALL',
  session: 'ALL',
  rulesFollowed: 'ALL',
  minPnl: '',
  maxPnl: '',
  selectedTags: [],
};

interface TradeFiltersDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  filters: FilterState;
  onChange: (updated: FilterState) => void;
  onReset: () => void;
  activeCount: number;
}

export const TradeFiltersDrawer: React.FC<TradeFiltersDrawerProps> = ({
  isOpen,
  onClose,
  filters,
  onChange,
  onReset,
  activeCount,
}) => {
  const { accounts, propFirmAccounts, playbooks, customTags } = useTrading();
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (drawerRef.current && !drawerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleDatePreset = (preset: FilterState['datePreset']) => {
    const today = new Date();
    let start = '';
    let end = today.toISOString().split('T')[0];

    if (preset === 'TODAY') {
      start = end;
    } else if (preset === 'YESTERDAY') {
      const y = new Date();
      y.setDate(y.getDate() - 1);
      start = y.toISOString().split('T')[0];
      end = start;
    } else if (preset === 'LAST_7_DAYS') {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      start = d.toISOString().split('T')[0];
    } else if (preset === 'THIS_MONTH') {
      const d = new Date(today.getFullYear(), today.getMonth(), 1);
      start = d.toISOString().split('T')[0];
    } else if (preset === 'LAST_30_DAYS') {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      start = d.toISOString().split('T')[0];
    } else if (preset === 'THIS_WEEK') {
      const day = today.getDay();
      const diff = today.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(today.setDate(diff));
      start = monday.toISOString().split('T')[0];
      end = new Date().toISOString().split('T')[0];
    } else if (preset === 'ALL') {
      start = '';
      end = '';
    }

    onChange({
      ...filters,
      datePreset: preset,
      startDate: start,
      endDate: end,
    });
  };

  const toggleTag = (tagName: string) => {
    const exists = filters.selectedTags.includes(tagName);
    const updated = exists
      ? filters.selectedTags.filter(t => t !== tagName)
      : [...filters.selectedTags, tagName];
    onChange({ ...filters, selectedTags: updated });
  };

  return (
    <div
      ref={drawerRef}
      className="absolute right-0 top-full mt-2 w-[440px] max-w-[95vw] bg-[#0E0E0E] border border-white/[0.12] rounded-xl shadow-2xl z-50 overflow-hidden text-xs animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[85vh]"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.08] bg-[#0E0E0E]">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-blue-400" />
          <h3 className="font-bold text-sm text-[#F5F5F5]">Filter Trades</h3>
          {activeCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-blue-600/20 text-blue-400 text-[10px] font-mono font-bold">
              {activeCount} active
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {activeCount > 0 && (
            <button
              type="button"
              onClick={onReset}
              className="text-[11px] text-[#A1A1AA] hover:text-[#F5F5F5] flex items-center gap-1 transition cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="w-6 h-6 flex items-center justify-center rounded text-[#71717A] hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="p-5 overflow-y-auto space-y-4 custom-scrollbar">
        {/* Date Presets */}
        <div>
          <label className="block text-[11px] font-semibold text-[#A1A1AA] uppercase tracking-wider mb-1.5">
            Date Range
          </label>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5 mb-2">
            {[
              { id: 'ALL', label: 'All Time' },
              { id: 'TODAY', label: 'Today' },
              { id: 'YESTERDAY', label: 'Yesterday' },
              { id: 'THIS_WEEK', label: 'This Week' },
              { id: 'LAST_7_DAYS', label: 'Last 7D' },
              { id: 'THIS_MONTH', label: 'This Month' },
              { id: 'LAST_30_DAYS', label: 'Last 30D' },
              { id: 'CUSTOM', label: 'Custom' },
            ].map(p => (
              <button
                key={p.id}
                type="button"
                onClick={() => handleDatePreset(p.id as any)}
                className={`py-1 px-2 rounded-md text-[11px] font-medium transition cursor-pointer ${
                  filters.datePreset === p.id
                    ? 'bg-blue-600 text-white font-semibold'
                    : 'bg-[#141416] text-[#A1A1AA] hover:text-white border border-white/[0.04]'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Custom Date Pickers */}
          {filters.datePreset === 'CUSTOM' && (
            <div className="grid grid-cols-2 gap-2 pt-1 animate-in fade-in">
              <div>
                <span className="text-[10px] text-[#71717A] block mb-1">From:</span>
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={e => onChange({ ...filters, startDate: e.target.value })}
                  className="w-full bg-[#141416] border border-white/[0.10] rounded px-2.5 py-1 text-xs text-[#F5F5F5] focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <span className="text-[10px] text-[#71717A] block mb-1">To:</span>
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={e => onChange({ ...filters, endDate: e.target.value })}
                  className="w-full bg-[#141416] border border-white/[0.10] rounded px-2.5 py-1 text-xs text-[#F5F5F5] focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          )}
        </div>

        {/* Direction & Result */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-[#A1A1AA] uppercase tracking-wider mb-1.5">
              Direction
            </label>
            <div className="flex rounded-md p-0.5 bg-[#141416] border border-white/[0.06]">
              {(['ALL', 'BUY', 'SELL'] as const).map(d => (
                <button
                  key={d}
                  type="button"
                  onClick={() => onChange({ ...filters, direction: d })}
                  className={`flex-1 py-1 text-[11px] font-semibold rounded transition cursor-pointer ${
                    filters.direction === d
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-[#A1A1AA] hover:text-white'
                  }`}
                >
                  {d === 'BUY' ? 'LONG' : d === 'SELL' ? 'SHORT' : 'ALL'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-[#A1A1AA] uppercase tracking-wider mb-1.5">
              Result
            </label>
            <select
              value={filters.result}
              onChange={e => onChange({ ...filters, result: e.target.value as any })}
              className="w-full bg-[#141416] border border-white/[0.10] focus:border-blue-500 focus:outline-none rounded-lg px-2.5 py-1.5 text-xs text-[#F5F5F5] cursor-pointer"
            >
              <option value="ALL">All Outcomes</option>
              <option value="WIN">Winners Only (+P&L)</option>
              <option value="LOSS">Losses Only (-P&L)</option>
              <option value="BREAKEVEN">Breakeven ($0)</option>
            </select>
          </div>
        </div>

        {/* Account / Prop Firm */}
        <div>
          <label className="block text-[11px] font-semibold text-[#A1A1AA] uppercase tracking-wider mb-1.5">
            Account
          </label>
          <select
            value={filters.accountId}
            onChange={e => onChange({ ...filters, accountId: e.target.value })}
            className="w-full bg-[#141416] border border-white/[0.10] focus:border-blue-500 focus:outline-none rounded-lg px-3 py-1.5 text-xs text-[#F5F5F5] cursor-pointer"
          >
            <option value="all">All Accounts (Consolidated)</option>
            <optgroup label="Trading Portfolios">
              {accounts.map(a => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.broker || a.type})
                </option>
              ))}
            </optgroup>
            {propFirmAccounts.length > 0 && (
              <optgroup label="Prop Firm Evaluations">
                {propFirmAccounts.map(pf => (
                  <option key={pf.id} value={pf.id}>
                    {pf.name} · {pf.firmName}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        </div>

        {/* Strategy / Playbook */}
        <div>
          <label className="block text-[11px] font-semibold text-[#A1A1AA] uppercase tracking-wider mb-1.5">
            Strategy / Playbook
          </label>
          <select
            value={filters.strategy}
            onChange={e => onChange({ ...filters, strategy: e.target.value })}
            className="w-full bg-[#141416] border border-white/[0.10] focus:border-blue-500 focus:outline-none rounded-lg px-3 py-1.5 text-xs text-[#F5F5F5] cursor-pointer"
          >
            <option value="ALL">All Strategies & Setups</option>
            {playbooks.map(pb => (
              <option key={pb.id} value={pb.name}>
                {pb.name} ({pb.market || 'All'})
              </option>
            ))}
          </select>
        </div>

        {/* Source & Session */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-[#A1A1AA] uppercase tracking-wider mb-1.5">
              Source
            </label>
            <select
              value={filters.source}
              onChange={e => onChange({ ...filters, source: e.target.value as any })}
              className="w-full bg-[#141416] border border-white/[0.10] focus:border-blue-500 focus:outline-none rounded-lg px-2.5 py-1.5 text-xs text-[#F5F5F5] cursor-pointer"
            >
              <option value="ALL">All Sources</option>
              <option value="manual">Manual Entry</option>
              <option value="mt5">MetaTrader 5 (MT5)</option>
              <option value="mt4">MetaTrader 4 (MT4)</option>
              <option value="csv">CSV Import</option>
              <option value="api">Broker API</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-[#A1A1AA] uppercase tracking-wider mb-1.5">
              Session
            </label>
            <select
              value={filters.session}
              onChange={e => onChange({ ...filters, session: e.target.value })}
              className="w-full bg-[#141416] border border-white/[0.10] focus:border-blue-500 focus:outline-none rounded-lg px-2.5 py-1.5 text-xs text-[#F5F5F5] cursor-pointer"
            >
              <option value="ALL">All Sessions</option>
              <option value="New York">New York</option>
              <option value="London">London</option>
              <option value="Asian">Asian</option>
              <option value="Pre-Market">Pre-Market</option>
              <option value="After-Hours">After-Hours</option>
              <option value="Overlap">Overlap</option>
            </select>
          </div>
        </div>

        {/* Rules Followed Discipline */}
        <div>
          <label className="block text-[11px] font-semibold text-[#A1A1AA] uppercase tracking-wider mb-1.5">
            Rule Discipline
          </label>
          <div className="flex rounded-md p-0.5 bg-[#141416] border border-white/[0.06]">
            {(['ALL', 'YES', 'NO'] as const).map(rf => (
              <button
                key={rf}
                type="button"
                onClick={() => onChange({ ...filters, rulesFollowed: rf })}
                className={`flex-1 py-1 text-[11px] font-semibold rounded transition cursor-pointer ${
                  filters.rulesFollowed === rf
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-[#A1A1AA] hover:text-white'
                }`}
              >
                {rf === 'YES' ? 'Followed ✓' : rf === 'NO' ? 'Broken ✗' : 'ALL'}
              </button>
            ))}
          </div>
        </div>

        {/* Tags Selection */}
        {customTags && customTags.length > 0 && (
          <div>
            <label className="block text-[11px] font-semibold text-[#A1A1AA] uppercase tracking-wider mb-1.5">
              Tags
            </label>
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto custom-scrollbar">
              {customTags.map(tag => {
                const isSelected = filters.selectedTags.includes(tag.name);
                return (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => toggleTag(tag.name)}
                    className={`px-2 py-0.5 rounded text-[11px] font-medium border transition cursor-pointer ${
                      isSelected
                        ? 'bg-blue-600/20 border-blue-500 text-blue-300'
                        : 'bg-[#141416] border-white/[0.08] text-[#71717A] hover:text-[#F5F5F5]'
                    }`}
                  >
                    #{tag.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-5 py-3 border-t border-white/[0.08] bg-[#0A0A0A]">
        <button
          type="button"
          onClick={onReset}
          className="text-xs text-[#A1A1AA] hover:text-white transition"
        >
          Reset All
        </button>
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition shadow-[0_0_12px_rgba(37,99,235,0.3)]"
        >
          Done
        </button>
      </div>
    </div>
  );
};
