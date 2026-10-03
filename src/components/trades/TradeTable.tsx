import React from 'react';
import {
  CheckSquare,
  Square,
  ChevronUp,
  ChevronDown,
  ArrowUpDown,
  Search,
  Filter
} from 'lucide-react';
import { Trade, TradingAccount, PropFirmAccount, Playbook } from '../../types';
import { ColumnKey, ViewSettings, ALL_COLUMNS } from './TradeViewSettingsPopover';
import { TradeRow } from './TradeRow';
import { TradesEmptyState } from './TradesEmptyState';

interface ColumnFilterValues {
  [key: string]: string;
}

interface TradeTableProps {
  trades: Trade[];
  selectedTradeIds: string[];
  onToggleSelectAll: () => void;
  onToggleSelectTrade: (id: string) => void;
  onSelectTrade: (trade: Trade) => void;
  onDuplicateTrade: (id: string) => void;
  onDeleteTrade: (id: string) => void;
  settings: ViewSettings;
  onSortChange: (field: string) => void;
  columnFilters: ColumnFilterValues;
  onColumnFilterChange: (colKey: string, value: string) => void;
  accounts: TradingAccount[];
  propFirmAccounts: PropFirmAccount[];
  playbooks: Playbook[];
  formatCurrency: (val: number) => string;
  formatRMultiple: (r: number) => string;
  onClearFilters?: () => void;
  isFilterActive?: boolean;
}

export const TradeTable: React.FC<TradeTableProps> = ({
  trades,
  selectedTradeIds,
  onToggleSelectAll,
  onToggleSelectTrade,
  onSelectTrade,
  onDuplicateTrade,
  onDeleteTrade,
  settings,
  onSortChange,
  columnFilters,
  onColumnFilterChange,
  accounts,
  propFirmAccounts,
  playbooks,
  formatCurrency,
  formatRMultiple,
  onClearFilters,
  isFilterActive,
}) => {
  const colMap = new Map(ALL_COLUMNS.map(c => [c.key, c]));

  // Active visible columns in order
  const activeColumns = settings.columnOrder.filter(k => settings.visibleColumns.includes(k));

  const allCurrentSelected = trades.length > 0 && trades.every(t => selectedTradeIds.includes(t.id));
  const someCurrentSelected = trades.some(t => selectedTradeIds.includes(t.id));

  const renderSortIcon = (colKey: string) => {
    let field = colKey;
    if (colKey === 'grossPnl' || colKey === 'netPnl') field = 'pnl';
    if (colKey === 'entryDate' || colKey === 'status') field = 'entryDate';

    const isActive = settings.sortField === field;
    if (isActive) {
      return settings.sortDirection === 'asc' ? (
        <ChevronUp className="w-3.5 h-3.5 text-blue-400 shrink-0" />
      ) : (
        <ChevronDown className="w-3.5 h-3.5 text-blue-400 shrink-0" />
      );
    }
    return <ArrowUpDown className="w-3 h-3 text-[#52525B] group-hover:text-[#A1A1AA] transition shrink-0" />;
  };

  return (
    <div className="w-full overflow-hidden">
      {/* Desktop / Tablet Professional Table */}
      <div className="hidden md:block overflow-x-auto custom-scrollbar">
        <table className="w-full text-left text-xs border-collapse border-spacing-0">
          {/* Sticky Header */}
          <thead className="sticky top-0 z-10 bg-[#0E0E0E] border-b border-white/[0.08] select-none text-[11px] font-semibold text-[#A1A1AA] uppercase tracking-wider">
            <tr>
              {/* Checkbox Header */}
              <th className="w-10 min-w-[40px] pl-3.5 pr-1 py-3 text-center align-middle">
                <button
                  type="button"
                  onClick={onToggleSelectAll}
                  aria-label="Select all current page trades"
                  className="inline-flex items-center justify-center p-0.5 rounded text-[#71717A] hover:text-white transition cursor-pointer"
                >
                  {allCurrentSelected ? (
                    <CheckSquare className="w-4 h-4 text-blue-500" />
                  ) : someCurrentSelected ? (
                    <div className="w-4 h-4 rounded bg-blue-500/20 border border-blue-500 flex items-center justify-center">
                      <div className="w-2 h-0.5 bg-blue-400 rounded-full" />
                    </div>
                  ) : (
                    <Square className="w-4 h-4 text-[#52525B]" />
                  )}
                </button>
              </th>

              {/* Dynamic Column Headers */}
              {activeColumns.map(colKey => {
                const def = colMap.get(colKey);
                if (!def) return null;

                return (
                  <th
                    key={colKey}
                    onClick={() => {
                      let sortTarget: string = colKey;
                      if (colKey === 'grossPnl' || colKey === 'netPnl') sortTarget = 'pnl';
                      if (colKey === 'status') sortTarget = 'entryDate';
                      onSortChange(sortTarget);
                    }}
                    className="px-3 py-3 font-semibold text-[#A1A1AA] hover:text-[#F5F5F5] transition cursor-pointer whitespace-nowrap group"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>{def.label}</span>
                      {renderSortIcon(colKey)}
                    </div>
                  </th>
                );
              })}

              {/* Actions Header */}
              <th className="w-16 pr-3.5 pl-1 py-3 text-right">
                <span className="sr-only">Actions</span>
              </th>
            </tr>

            {/* Optional: Filter under each column row */}
            {settings.showColumnFilters && (
              <tr className="bg-[#121212] border-b border-white/[0.06] text-xs">
                <th className="py-1.5 px-2 text-center text-[#52525B]">
                  <Search className="w-3 h-3 mx-auto" />
                </th>
                {activeColumns.map(colKey => (
                  <th key={`filter-${colKey}`} className="py-1.5 px-2 font-normal">
                    <input
                      type="text"
                      placeholder={`Filter ${colMap.get(colKey)?.label || ''}...`}
                      value={columnFilters[colKey] || ''}
                      onChange={e => onColumnFilterChange(colKey, e.target.value)}
                      className="w-full bg-[#0A0A0A] border border-white/[0.08] focus:border-blue-500 focus:outline-none rounded px-2 py-0.5 text-[11px] text-[#F5F5F5] placeholder-[#52525B]"
                    />
                  </th>
                ))}
                <th className="py-1.5 px-2" />
              </tr>
            )}
          </thead>

          {/* Table Body */}
          <tbody className="divide-y divide-white/[0.03]">
            {trades.map(trade => (
              <TradeRow
                key={trade.id}
                trade={trade}
                isSelected={selectedTradeIds.includes(trade.id)}
                onToggleSelect={onToggleSelectTrade}
                onClick={onSelectTrade}
                onDuplicate={onDuplicateTrade}
                onDelete={onDeleteTrade}
                visibleColumns={activeColumns}
                density={settings.density}
                accounts={accounts}
                propFirmAccounts={propFirmAccounts}
                playbooks={playbooks}
                formatCurrency={formatCurrency}
                formatRMultiple={formatRMultiple}
              />
            ))}
          </tbody>
        </table>

        {/* Empty state if 0 trades in table */}
        {trades.length === 0 && (
          <TradesEmptyState
            type={isFilterActive ? 'no-filter-match' : 'no-trades'}
            onClearFilters={onClearFilters}
          />
        )}
      </div>

      {/* Mobile Professional Cards View */}
      <div className="md:hidden divide-y divide-white/[0.06]">
        {trades.map(trade => {
          const isSelected = selectedTradeIds.includes(trade.id);
          const isWin = trade.netPnl > 0;
          const isLoss = trade.netPnl < 0;

          return (
            <div
              key={trade.id}
              onClick={() => onSelectTrade(trade)}
              className={`p-4 transition cursor-pointer ${
                isSelected ? 'bg-blue-950/20' : 'hover:bg-white/[0.02]'
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={e => {
                      e.stopPropagation();
                      onToggleSelectTrade(trade.id);
                    }}
                    className="p-1 text-[#71717A]"
                  >
                    {isSelected ? (
                      <CheckSquare className="w-4 h-4 text-blue-500" />
                    ) : (
                      <Square className="w-4 h-4 text-[#52525B]" />
                    )}
                  </button>
                  <span className="font-mono font-bold text-sm text-[#F5F5F5]">
                    {trade.symbol}
                  </span>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                    trade.direction === 'BUY'
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                  }`}>
                    {trade.direction === 'BUY' ? 'LONG' : 'SHORT'}
                  </span>
                </div>

                <div className="text-right">
                  <div className={`font-mono font-bold text-sm ${
                    isWin ? 'text-emerald-400' : isLoss ? 'text-rose-400' : 'text-[#A1A1AA]'
                  }`}>
                    {formatCurrency(trade.netPnl)}
                  </div>
                  <div className="font-mono text-[11px] text-[#A1A1AA]">
                    {trade.rMultiple > 0 ? `+${trade.rMultiple.toFixed(2)}R` : `${trade.rMultiple.toFixed(2)}R`}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs text-[#A1A1AA] pt-1">
                <div>
                  <span className="text-[10px] text-[#71717A] block">Entry → Exit</span>
                  <span className="font-mono text-[#F5F5F5]">
                    ${trade.entryPrice.toLocaleString()} → {trade.exitPrice ? `$${trade.exitPrice.toLocaleString()}` : '—'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-[#71717A] block">Setup / Strategy</span>
                  <span className="text-[#F5F5F5] truncate block">
                    {trade.setupType || 'Discretionary'}
                  </span>
                </div>
              </div>
            </div>
          );
        })}

        {trades.length === 0 && (
          <TradesEmptyState
            type={isFilterActive ? 'no-filter-match' : 'no-trades'}
            onClearFilters={onClearFilters}
          />
        )}
      </div>
    </div>
  );
};
