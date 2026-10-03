import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  SlidersHorizontal,
  Sliders,
  Download,
  Upload,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  Trash2,
  CheckSquare,
  Square,
  ArrowRight,
  Shield,
  Layers
} from 'lucide-react';
import { useTrading } from '../../context/TradingContext';
import { Trade } from '../../types';
import { TradesHeader } from './TradesHeader';
import { TradeTable } from './TradeTable';
import { TradesPagination } from './TradesPagination';
import { TradeFiltersDrawer, FilterState, INITIAL_FILTERS } from './TradeFiltersDrawer';
import {
  TradeViewSettingsPopover,
  ViewSettings,
  ALL_COLUMNS,
  ColumnKey,
} from './TradeViewSettingsPopover';

interface TradesListViewProps {
  onOpenAddTrade: () => void;
  onOpenImport: () => void;
}

const STORAGE_KEY_VIEW_SETTINGS = 'tradeforge_trade_view_settings_v2';
const STORAGE_KEY_FILTERS = 'tradeforge_trade_filters_v2';

export const TradesListView: React.FC<TradesListViewProps> = ({
  onOpenAddTrade,
  onOpenImport,
}) => {
  const {
    trades,
    filteredTrades,
    selectedAccountId,
    selectedTrade,
    setSelectedTrade,
    deleteTrade,
    duplicateTrade,
    bulkDeleteTrades,
    bulkEditTrades,
    clearAllTradesData,
    undoLastDelete,
    canUndo,
    accounts,
    propFirmAccounts,
    playbooks,
    formatCurrency,
    formatRMultiple,
    addToast,
    userProfile,
    setActiveView,
  } = useTrading();

  // Load / initialize View Settings from localStorage
  const [viewSettings, setViewSettings] = useState<ViewSettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_VIEW_SETTINGS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.visibleColumns) && Array.isArray(parsed.columnOrder)) {
          return {
            columnOrder: parsed.columnOrder,
            visibleColumns: parsed.visibleColumns,
            density: parsed.density || 'default',
            pageSize: parsed.pageSize || 15,
            showColumnFilters: Boolean(parsed.showColumnFilters),
            sortField: parsed.sortField || 'entryDate',
            sortDirection: parsed.sortDirection || 'desc',
          };
        }
      }
    } catch {}

    const defaultVisible = ALL_COLUMNS.filter(c => c.defaultVisible).map(c => c.key);
    const defaultOrder = ALL_COLUMNS.map(c => c.key);
    return {
      columnOrder: defaultOrder,
      visibleColumns: defaultVisible,
      density: 'default',
      pageSize: 15,
      showColumnFilters: false,
      sortField: 'entryDate',
      sortDirection: 'desc',
    };
  });

  // Save view settings to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_VIEW_SETTINGS, JSON.stringify(viewSettings));
    } catch {}
  }, [viewSettings]);

  // Filters State
  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS);
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});

  // UI Popover states
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [isViewSettingsOpen, setIsViewSettingsOpen] = useState(false);

  // Pagination & Multi-Select
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedTradeIds, setSelectedTradeIds] = useState<string[]>([]);

  // Calculate active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.searchQuery) count++;
    if (filters.datePreset !== 'ALL') count++;
    if (filters.direction !== 'ALL') count++;
    if (filters.accountId !== 'all') count++;
    if (filters.strategy !== 'ALL') count++;
    if (filters.result !== 'ALL') count++;
    if (filters.source !== 'ALL') count++;
    if (filters.session !== 'ALL') count++;
    if (filters.rulesFollowed !== 'ALL') count++;
    if (filters.selectedTags.length > 0) count++;
    if (Object.values(columnFilters).some(v => Boolean(v.trim()))) count++;
    return count;
  }, [filters, columnFilters]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters, columnFilters, viewSettings.sortField, viewSettings.sortDirection, viewSettings.pageSize]);

  // Main Filtering and Sorting Pipeline using Real Data
  const processedTrades = useMemo(() => {
    // Start with trades that adhere to global account/date filters from context
    let list = [...trades];

    // Filter by Account (if specifically chosen in local filter or context)
    const effectiveAccountId = filters.accountId !== 'all' ? filters.accountId : selectedAccountId;
    if (effectiveAccountId && effectiveAccountId !== 'all') {
      const isPropFirm = propFirmAccounts.some(pf => pf.id === effectiveAccountId);
      if (isPropFirm) {
        const pf = propFirmAccounts.find(p => p.id === effectiveAccountId);
        list = list.filter(t => {
          if (t.propFirmAccountId === effectiveAccountId) return true;
          if (pf?.tradingAccountLink && pf.tradingAccountLink !== 'all' && t.accountId === pf.tradingAccountLink) {
            return !t.propFirmAccountId || t.propFirmAccountId === effectiveAccountId;
          }
          return false;
        });
      } else {
        list = list.filter(t => t.accountId === effectiveAccountId);
      }
    }

    // Filter by Date Range
    if (filters.startDate) {
      const start = new Date(filters.startDate + 'T00:00:00');
      list = list.filter(t => {
        if (!t.entryDate) return true;
        return new Date(t.entryDate) >= start;
      });
    }
    if (filters.endDate) {
      const end = new Date(filters.endDate + 'T23:59:59');
      list = list.filter(t => {
        if (!t.entryDate) return true;
        return new Date(t.entryDate) <= end;
      });
    }

    // Filter by Direction
    if (filters.direction !== 'ALL') {
      list = list.filter(t => t.direction === filters.direction);
    }

    // Filter by Outcome / Result
    if (filters.result === 'WIN') {
      list = list.filter(t => t.netPnl > 0);
    } else if (filters.result === 'LOSS') {
      list = list.filter(t => t.netPnl < 0);
    } else if (filters.result === 'BREAKEVEN') {
      list = list.filter(t => t.netPnl === 0);
    }

    // Filter by Strategy
    if (filters.strategy !== 'ALL') {
      list = list.filter(
        t => t.setupType?.toLowerCase() === filters.strategy.toLowerCase() || t.playbookId === filters.strategy
      );
    }

    // Filter by Source
    if (filters.source !== 'ALL') {
      list = list.filter(t => (t.source || 'manual').toLowerCase() === filters.source.toLowerCase());
    }

    // Filter by Session
    if (filters.session !== 'ALL') {
      list = list.filter(t => t.session === filters.session);
    }

    // Filter by Rules Followed
    if (filters.rulesFollowed === 'YES') {
      list = list.filter(t => t.rulesFollowed);
    } else if (filters.rulesFollowed === 'NO') {
      list = list.filter(t => !t.rulesFollowed);
    }

    // Filter by Tags
    if (filters.selectedTags.length > 0) {
      list = list.filter(t =>
        t.tags && filters.selectedTags.every(selTag => t.tags.includes(selTag))
      );
    }

    // Filter by Search Query
    if (filters.searchQuery.trim()) {
      const q = filters.searchQuery.toLowerCase();
      list = list.filter(
        t =>
          t.symbol.toLowerCase().includes(q) ||
          t.setupType?.toLowerCase().includes(q) ||
          t.notes?.toLowerCase().includes(q) ||
          t.market?.toLowerCase().includes(q)
      );
    }

    // Filter by Column-specific inputs
    for (const [colKey, val] of Object.entries(columnFilters)) {
      if (!val || !val.trim()) continue;
      const lower = val.toLowerCase().trim();

      list = list.filter(t => {
        if (colKey === 'symbol') return t.symbol.toLowerCase().includes(lower);
        if (colKey === 'direction') return t.direction.toLowerCase().includes(lower);
        if (colKey === 'source') return (t.source || 'manual').toLowerCase().includes(lower);
        if (colKey === 'strategy') return (t.setupType || '').toLowerCase().includes(lower);
        if (colKey === 'status') return t.status.toLowerCase().includes(lower);
        if (colKey === 'grossPnl' || colKey === 'netPnl') {
          const num = Number(lower);
          if (!isNaN(num)) return t.netPnl >= num;
        }
        return true;
      });
    }

    // Sorting
    list.sort((a, b) => {
      let diff = 0;
      const field = viewSettings.sortField;

      if (field === 'entryDate' || field === 'date') {
        diff = new Date(a.entryDate || 0).getTime() - new Date(b.entryDate || 0).getTime();
      } else if (field === 'pnl') {
        diff = a.netPnl - b.netPnl;
      } else if (field === 'rMultiple') {
        diff = a.rMultiple - b.rMultiple;
      } else if (field === 'symbol') {
        diff = a.symbol.localeCompare(b.symbol);
      } else if (field === 'duration') {
        diff = (a.durationMinutes || 0) - (b.durationMinutes || 0);
      } else if (field === 'size' || field === 'quantity') {
        diff = (a.quantity || 0) - (b.quantity || 0);
      } else {
        diff = new Date(a.entryDate || 0).getTime() - new Date(b.entryDate || 0).getTime();
      }

      return viewSettings.sortDirection === 'desc' ? -diff : diff;
    });

    return list;
  }, [
    trades,
    filters,
    selectedAccountId,
    propFirmAccounts,
    columnFilters,
    viewSettings.sortField,
    viewSettings.sortDirection,
  ]);

  // Dynamic Free/Pro Limit calculation
  // Check user tier: if user is not explicitly marked as free or has plan limit
  const isFreePlan = userProfile.role === 'free';
  const planTradeLimit = isFreePlan ? 15 : undefined;
  const totalUserTradesCount = trades.length;

  // Pagination Slicing
  const totalTradesCount = processedTrades.length;
  const pageSize = viewSettings.pageSize;
  const totalPages = Math.max(1, Math.ceil(totalTradesCount / pageSize));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const paginatedTrades = processedTrades.slice(startIndex, startIndex + pageSize);

  // Dynamic Summary Text
  const summaryText = useMemo(() => {
    if (totalTradesCount === 0) {
      return activeFilterCount > 0 ? 'No trades match filters' : '0 trades';
    }
    const end = Math.min(startIndex + pageSize, totalTradesCount);
    if (totalTradesCount <= pageSize) {
      return `${totalTradesCount} ${totalTradesCount === 1 ? 'trade' : 'trades'}`;
    }
    return `Showing ${startIndex + 1}–${end} of ${totalTradesCount}`;
  }, [totalTradesCount, startIndex, pageSize, activeFilterCount]);

  // Bulk Selection Handlers
  const handleToggleSelectAll = () => {
    const pageIds = paginatedTrades.map(t => t.id);
    const allSelected = pageIds.every(id => selectedTradeIds.includes(id));
    if (allSelected) {
      setSelectedTradeIds(prev => prev.filter(id => !pageIds.includes(id)));
    } else {
      setSelectedTradeIds(prev => Array.from(new Set([...prev, ...pageIds])));
    }
  };

  const handleToggleSelectTrade = (id: string) => {
    setSelectedTradeIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  // CSV Export - Authoritative export of filtered database trades
  const handleExportCSV = () => {
    const headers = [
      'Trade ID',
      'Symbol',
      'Market',
      'Direction',
      'Status',
      'Open Time',
      'Close Time',
      'Entry Price',
      'Exit Price',
      'Size',
      'Net PnL ($)',
      'Gross PnL ($)',
      'R-Multiple',
      'Strategy',
      'Source',
      'Duration (Mins)',
      'Swap',
      'Rules Followed',
      'Notes',
    ];

    const escapeCsvValue = (val: any): string => {
      if (val === null || val === undefined) return '';
      const str = String(val);
      if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const rows = processedTrades.map(t => [
      escapeCsvValue(t.id),
      escapeCsvValue(t.symbol),
      escapeCsvValue(t.market),
      escapeCsvValue(t.direction),
      escapeCsvValue(t.status),
      escapeCsvValue(t.entryDate || ''),
      escapeCsvValue(t.exitDate || ''),
      escapeCsvValue(t.entryPrice),
      escapeCsvValue(t.exitPrice !== undefined && t.exitPrice !== null ? t.exitPrice : ''),
      escapeCsvValue(t.quantity),
      escapeCsvValue(t.netPnl),
      escapeCsvValue(t.grossPnl !== undefined && t.grossPnl !== null ? t.grossPnl : t.netPnl),
      escapeCsvValue(t.rMultiple !== undefined && t.rMultiple !== null ? t.rMultiple : ''),
      escapeCsvValue(t.setupType || ''),
      escapeCsvValue(t.source || 'manual'),
      escapeCsvValue(t.durationMinutes !== undefined && t.durationMinutes !== null ? t.durationMinutes : ''),
      escapeCsvValue(t.swap !== undefined && t.swap !== null ? t.swap : 0),
      escapeCsvValue(t.rulesFollowed ? 'YES' : 'NO'),
      escapeCsvValue(t.notes || ''),
    ]);

    const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `TradeForge_Trades_${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    if (processedTrades.length === 0) {
      addToast('CSV Exported', '0 trades exported matching current filters (headers only)', 'info');
    } else {
      addToast('CSV Exported', `${processedTrades.length} trades exported cleanly to CSV`, 'success');
    }
  };

  // Handle Sort Change from Table Column Header
  const handleSortChange = (field: string) => {
    setViewSettings(prev => {
      if (prev.sortField === field) {
        return {
          ...prev,
          sortDirection: prev.sortDirection === 'asc' ? 'desc' : 'asc',
        };
      }
      return {
        ...prev,
        sortField: field,
        sortDirection: 'desc',
      };
    });
  };

  return (
    <div className="w-full space-y-4 font-sans text-[#F5F5F5]">
      {/* 1. Page Header (Trades, Dynamic Connection, [Connect MT4/MT5], [Clear All], [+ Add Trade]) */}
      <TradesHeader
        onOpenAddTrade={onOpenAddTrade}
        tradeCount={trades.length}
      />

      {/* 2. Undo Delete Bar (If available) */}
      {canUndo && (
        <div className="flex items-center justify-between px-4 py-2.5 rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs">
          <span>A trade was deleted. You can undo this action.</span>
          <button
            type="button"
            onClick={undoLastDelete}
            className="flex items-center gap-1.5 px-3 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 font-semibold cursor-pointer transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Undo Delete</span>
          </button>
        </div>
      )}

      {/* 3. Bulk Action Banner (When checkboxes are checked) */}
      {selectedTradeIds.length > 0 && (
        <div className="flex items-center justify-between px-4 py-2 rounded-lg bg-blue-950/40 border border-blue-500/30 text-blue-300 text-xs animate-in fade-in duration-150">
          <span className="font-semibold text-white">
            {selectedTradeIds.length} {selectedTradeIds.length === 1 ? 'trade' : 'trades'} selected
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                bulkEditTrades(selectedTradeIds, { rulesFollowed: true });
                setSelectedTradeIds([]);
              }}
              className="px-2.5 py-1 rounded bg-blue-600/20 hover:bg-blue-600/30 text-blue-200 border border-blue-500/30 transition cursor-pointer"
            >
              Mark Rules Followed
            </button>
            <button
              type="button"
              onClick={() => {
                bulkDeleteTrades(selectedTradeIds);
                setSelectedTradeIds([]);
              }}
              className="px-2.5 py-1 rounded bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 transition cursor-pointer flex items-center gap-1"
            >
              <Trash2 className="w-3 h-3" />
              <span>Delete Selected</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedTradeIds([])}
              className="text-[#A1A1AA] hover:text-white px-2 py-1"
            >
              Deselect
            </button>
          </div>
        </div>
      )}

      {/* 4. Main Trade History Container (Black institutional surface) */}
      <div className="bg-[#0B0B0B] border border-white/[0.08] rounded-xl shadow-2xl overflow-hidden relative">
        {/* Top Table Controls Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-white/[0.07] bg-[#0E0E0E]">
          {/* Left: "Trade History" and dynamic summary text */}
          <div className="flex items-center gap-3">
            <h2 className="text-base font-bold text-[#F5F5F5] tracking-tight">
              Trade History
            </h2>
            <span className="text-xs text-[#71717A] font-medium">
              {summaryText}
            </span>
          </div>

          {/* Right: [Filters • ] [View] [Export] */}
          <div className="relative flex items-center gap-2">
            {/* Filters Button */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setIsFiltersOpen(prev => !prev);
                  setIsViewSettingsOpen(false);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition cursor-pointer ${
                  activeFilterCount > 0
                    ? 'bg-blue-600/15 border-blue-500/40 text-blue-400 hover:bg-blue-600/25'
                    : 'bg-[#121212] border-white/[0.08] text-[#A1A1AA] hover:text-[#F5F5F5] hover:bg-white/[0.04]'
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Filters</span>
                {activeFilterCount > 0 && (
                  <span className="ml-0.5 inline-flex items-center gap-1 text-[11px] font-mono text-blue-400">
                    • {activeFilterCount}
                  </span>
                )}
              </button>

              {/* Filters Drawer / Popover */}
              <TradeFiltersDrawer
                isOpen={isFiltersOpen}
                onClose={() => setIsFiltersOpen(false)}
                filters={filters}
                onChange={setFilters}
                onReset={() => {
                  setFilters(INITIAL_FILTERS);
                  setColumnFilters({});
                }}
                activeCount={activeFilterCount}
              />
            </div>

            {/* View / Column Customization Button */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setIsViewSettingsOpen(prev => !prev);
                  setIsFiltersOpen(false);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition cursor-pointer ${
                  isViewSettingsOpen
                    ? 'bg-white/[0.08] border-white/[0.15] text-[#F5F5F5]'
                    : 'bg-[#121212] border-white/[0.08] text-[#A1A1AA] hover:text-[#F5F5F5] hover:bg-white/[0.04]'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Columns</span>
              </button>

              {/* View Popover */}
              <TradeViewSettingsPopover
                isOpen={isViewSettingsOpen}
                onClose={() => setIsViewSettingsOpen(false)}
                settings={viewSettings}
                onChange={setViewSettings}
              />
            </div>

            {/* Export Button */}
            <button
              type="button"
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#121212] hover:bg-white/[0.04] border border-white/[0.08] text-xs font-medium text-[#A1A1AA] hover:text-[#F5F5F5] transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export</span>
            </button>
          </div>
        </div>

        {/* Dynamic Free / Pro Limit Banner */}
        {planTradeLimit ? (
          <div className="px-5 py-2.5 bg-[#0D1014] border-b border-[rgba(99,102,241,0.25)] flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-[#8A919D]">
              <Sparkles className="w-4 h-4 text-[#818CF8] shrink-0" />
              <span>
                Free plan loads <strong className="text-[#F4F5F7] font-semibold">your last {planTradeLimit} trades</strong> ({totalUserTradesCount} / {planTradeLimit} trades used). Upgrade to Pro to unlock unlimited executions and automated sync.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setActiveView('settings')}
              className="text-xs font-semibold text-[#818CF8] hover:text-[#A5B4FC] flex items-center gap-1 transition cursor-pointer"
            >
              <span>Upgrade to Pro</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : null}

        {/* 5. Trade Table */}
        <TradeTable
          trades={paginatedTrades}
          selectedTradeIds={selectedTradeIds}
          onToggleSelectAll={handleToggleSelectAll}
          onToggleSelectTrade={handleToggleSelectTrade}
          onSelectTrade={t => setSelectedTrade(t)}
          onDuplicateTrade={duplicateTrade}
          onDeleteTrade={deleteTrade}
          settings={viewSettings}
          onSortChange={handleSortChange}
          columnFilters={columnFilters}
          onColumnFilterChange={(k, v) =>
            setColumnFilters(prev => ({ ...prev, [k]: v }))
          }
          accounts={accounts}
          propFirmAccounts={propFirmAccounts}
          playbooks={playbooks}
          formatCurrency={formatCurrency}
          formatRMultiple={formatRMultiple}
          onClearFilters={() => {
            setFilters(INITIAL_FILTERS);
            setColumnFilters({});
          }}
          isFilterActive={activeFilterCount > 0}
        />

        {/* 6. Dynamic Pagination */}
        {totalTradesCount > 0 && (
          <TradesPagination
            currentPage={safePage}
            pageSize={pageSize}
            totalTrades={totalTradesCount}
            onPageChange={setCurrentPage}
            onPageSizeChange={sz => setViewSettings(prev => ({ ...prev, pageSize: sz }))}
            pageSizeOptions={[10, 15, 25, 50, 100]}
          />
        )}
      </div>
    </div>
  );
};

export default TradesListView;
