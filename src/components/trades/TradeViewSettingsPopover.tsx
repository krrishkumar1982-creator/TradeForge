import React, { useRef, useEffect } from 'react';
import {
  GripVertical,
  Check,
  ChevronDown,
  ArrowUp,
  ArrowDown,
  X,
  RotateCcw
} from 'lucide-react';

export type ColumnKey =
  | 'status'
  | 'symbol'
  | 'direction'
  | 'entryPrice'
  | 'exitPrice'
  | 'quantity'
  | 'grossPnl'
  | 'netPnl'
  | 'source'
  | 'entryDate'
  | 'exitDate'
  | 'durationMinutes'
  | 'swap'
  | 'accountId'
  | 'strategy'
  | 'tags'
  | 'rMultiple'
  | 'stopLoss'
  | 'takeProfit'
  | 'rulesFollowed'
  | 'rating';

export interface ColumnDef {
  key: ColumnKey;
  label: string;
  defaultVisible: boolean;
  minWidth?: number;
}

export const ALL_COLUMNS: ColumnDef[] = [
  { key: 'status', label: 'Open / Close', defaultVisible: true },
  { key: 'symbol', label: 'Symbol', defaultVisible: true },
  { key: 'direction', label: 'Type', defaultVisible: true },
  { key: 'entryPrice', label: 'Entry', defaultVisible: true },
  { key: 'exitPrice', label: 'Exit', defaultVisible: true },
  { key: 'quantity', label: 'Size', defaultVisible: true },
  { key: 'grossPnl', label: 'P&L', defaultVisible: true },
  { key: 'source', label: 'Source', defaultVisible: true },
  { key: 'entryDate', label: 'Open time', defaultVisible: false },
  { key: 'exitDate', label: 'Close time', defaultVisible: false },
  { key: 'durationMinutes', label: 'Duration', defaultVisible: false },
  { key: 'netPnl', label: 'Net P&L', defaultVisible: false },
  { key: 'swap', label: 'Swap', defaultVisible: false },
  { key: 'accountId', label: 'Account', defaultVisible: false },
  { key: 'strategy', label: 'Strategy', defaultVisible: false },
  { key: 'tags', label: 'Tags', defaultVisible: false },
  { key: 'rMultiple', label: 'R-Multiple', defaultVisible: false },
  { key: 'stopLoss', label: 'Risk (SL)', defaultVisible: false },
  { key: 'takeProfit', label: 'Reward (TP)', defaultVisible: false },
  { key: 'rulesFollowed', label: 'Rules Followed', defaultVisible: false },
  { key: 'rating', label: 'Rating', defaultVisible: false },
];

export type RowDensity = 'compact' | 'default' | 'relaxed';

export interface ViewSettings {
  columnOrder: ColumnKey[];
  visibleColumns: ColumnKey[];
  sortField: string;
  sortDirection: 'asc' | 'desc';
  density: RowDensity;
  pageSize: number;
  showColumnFilters: boolean;
}

interface TradeViewSettingsPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  settings: ViewSettings;
  onChange: (updated: ViewSettings) => void;
  anchorRef?: React.RefObject<HTMLButtonElement | null>;
}

export const TradeViewSettingsPopover: React.FC<TradeViewSettingsPopoverProps> = ({
  isOpen,
  onClose,
  settings,
  onChange,
}) => {
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const totalCols = settings.columnOrder.length;
  const visibleCount = settings.visibleColumns.length;

  const toggleColumn = (key: ColumnKey) => {
    let updatedVisible = [...settings.visibleColumns];
    if (updatedVisible.includes(key)) {
      if (updatedVisible.length <= 1) return; // keep at least 1
      updatedVisible = updatedVisible.filter(k => k !== key);
    } else {
      updatedVisible.push(key);
    }
    onChange({ ...settings, visibleColumns: updatedVisible });
  };

  const showAllColumns = () => {
    onChange({ ...settings, visibleColumns: [...settings.columnOrder] });
  };

  const resetToDefaults = () => {
    const defaultVisible = ALL_COLUMNS.filter(c => c.defaultVisible).map(c => c.key);
    const defaultOrder = ALL_COLUMNS.map(c => c.key);
    onChange({
      ...settings,
      columnOrder: defaultOrder,
      visibleColumns: defaultVisible,
      density: 'default',
      pageSize: 15,
      showColumnFilters: false,
      sortField: 'entryDate',
      sortDirection: 'desc',
    });
  };

  const moveColumn = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= settings.columnOrder.length) return;
    const updated = [...settings.columnOrder];
    const [moved] = updated.splice(index, 1);
    updated.splice(targetIndex, 0, moved);
    onChange({ ...settings, columnOrder: updated });
  };

  // Helper map for labels
  const colMap = new Map(ALL_COLUMNS.map(c => [c.key, c]));

  return (
    <div
      ref={popoverRef}
      className="absolute right-0 top-full mt-2 w-[560px] max-w-[95vw] bg-[#0E0E0E] border border-white/[0.12] rounded-xl shadow-2xl z-50 overflow-hidden text-xs animate-in fade-in zoom-in-95 duration-150"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-white/[0.08]">
        {/* Left Column: Column Customization List */}
        <div className="p-4 flex flex-col max-h-[460px]">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
            <span className="text-[11px] font-bold font-mono text-[#A1A1AA] uppercase tracking-wider">
              COLUMNS · {visibleCount} OF {totalCols}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={showAllColumns}
                className="text-xs text-blue-400 hover:text-blue-300 font-semibold cursor-pointer"
              >
                Show all
              </button>
              <button
                type="button"
                onClick={resetToDefaults}
                title="Reset to default columns"
                className="text-[#71717A] hover:text-[#F5F5F5] p-0.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Scrollable Column Checkbox List */}
          <div className="flex-1 overflow-y-auto pt-2 space-y-1 custom-scrollbar pr-1">
            {settings.columnOrder.map((colKey, index) => {
              const def = colMap.get(colKey);
              if (!def) return null;
              const isChecked = settings.visibleColumns.includes(colKey);

              return (
                <div
                  key={colKey}
                  className={`flex items-center justify-between px-2 py-1.5 rounded-lg group transition ${
                    isChecked ? 'hover:bg-white/[0.03]' : 'opacity-60 hover:opacity-100 hover:bg-white/[0.02]'
                  }`}
                >
                  <label className="flex items-center gap-2.5 cursor-pointer select-none flex-1 min-w-0">
                    {/* Grip Icon */}
                    <div className="text-[#52525B] group-hover:text-[#A1A1AA] transition shrink-0 cursor-grab">
                      <GripVertical className="w-3.5 h-3.5" />
                    </div>

                    {/* Custom Checkbox */}
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleColumn(colKey)}
                      className="sr-only"
                    />
                    <div
                      className={`w-4 h-4 rounded flex items-center justify-center border transition shrink-0 ${
                        isChecked
                          ? 'bg-blue-600 border-blue-500 text-white'
                          : 'bg-[#18181B] border-white/[0.12] text-transparent'
                      }`}
                    >
                      <Check className="w-3 h-3 stroke-[2.5]" />
                    </div>

                    <span className={`truncate text-xs ${isChecked ? 'text-[#F5F5F5] font-medium' : 'text-[#71717A]'}`}>
                      {def.label}
                    </span>
                  </label>

                  {/* Reorder Up/Down arrows on hover */}
                  <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition shrink-0">
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => moveColumn(index, 'up')}
                      className="p-1 text-[#71717A] hover:text-white disabled:opacity-20 cursor-pointer"
                      title="Move Up"
                    >
                      <ArrowUp className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      disabled={index === settings.columnOrder.length - 1}
                      onClick={() => moveColumn(index, 'down')}
                      className="p-1 text-[#71717A] hover:text-white disabled:opacity-20 cursor-pointer"
                      title="Move Down"
                    >
                      <ArrowDown className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Sort, Display & Tips */}
        <div className="p-4 flex flex-col justify-between space-y-4 max-h-[460px] overflow-y-auto custom-scrollbar">
          {/* SORT Section */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold text-[#71717A] uppercase tracking-wider block">
              SORT
            </span>
            <p className="text-[11px] text-[#A1A1AA] leading-snug">
              Newest trades first. Click a column header to sort, Shift+click to add another.
            </p>

            <div className="relative pt-1">
              <select
                value={`${settings.sortField}_${settings.sortDirection}`}
                onChange={e => {
                  const val = e.target.value;
                  const [f, d] = val.split('_');
                  onChange({
                    ...settings,
                    sortField: f,
                    sortDirection: d as 'asc' | 'desc',
                  });
                }}
                className="w-full appearance-none bg-[#141416] border border-white/[0.10] focus:border-blue-500 rounded-lg px-3 py-2 text-xs text-[#F5F5F5] cursor-pointer focus:outline-none transition pr-8"
              >
                <option value="entryDate_desc">Date: Newest first</option>
                <option value="entryDate_asc">Date: Oldest first</option>
                <option value="pnl_desc">P&L: Highest profit</option>
                <option value="pnl_asc">P&L: Largest loss</option>
                <option value="rMultiple_desc">R-Multiple: Highest</option>
                <option value="rMultiple_asc">R-Multiple: Lowest</option>
                <option value="symbol_asc">Symbol: A → Z</option>
                <option value="symbol_desc">Symbol: Z → A</option>
                <option value="duration_desc">Duration: Longest first</option>
                <option value="size_desc">Position Size: Largest first</option>
              </select>
              <ChevronDown className="w-4 h-4 absolute right-2.5 top-3.5 pointer-events-none text-[#71717A]" />
            </div>
          </div>

          {/* DISPLAY Section */}
          <div className="space-y-3 pt-2 border-t border-white/[0.08]">
            <span className="text-[10px] font-bold text-[#71717A] uppercase tracking-wider block">
              DISPLAY
            </span>

            {/* Row height */}
            <div>
              <span className="text-xs text-[#A1A1AA] font-medium block mb-1.5">Row height</span>
              <div className="grid grid-cols-3 gap-1 p-1 bg-[#141416] border border-white/[0.06] rounded-lg">
                {(['compact', 'default', 'relaxed'] as const).map(d => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => onChange({ ...settings, density: d })}
                    className={`py-1 text-xs font-medium rounded-md capitalize transition cursor-pointer ${
                      settings.density === d
                        ? 'bg-blue-600 text-white font-semibold shadow-xs'
                        : 'text-[#A1A1AA] hover:text-[#F5F5F5]'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            {/* Trades per page */}
            <div>
              <span className="text-xs text-[#A1A1AA] font-medium block mb-1.5">Trades per page</span>
              <div className="grid grid-cols-5 gap-1 p-1 bg-[#141416] border border-white/[0.06] rounded-lg">
                {[10, 15, 25, 50, 100].map(sz => (
                  <button
                    key={sz}
                    type="button"
                    onClick={() => onChange({ ...settings, pageSize: sz })}
                    className={`py-1 text-xs font-mono font-medium rounded-md transition cursor-pointer ${
                      settings.pageSize === sz
                        ? 'bg-blue-600 text-white font-semibold shadow-xs'
                        : 'text-[#A1A1AA] hover:text-[#F5F5F5]'
                    }`}
                  >
                    {sz}
                  </button>
                ))}
              </div>
            </div>

            {/* Filter under each column */}
            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-[#A1A1AA] font-medium">Filter under each column</span>
              <button
                type="button"
                onClick={() =>
                  onChange({
                    ...settings,
                    showColumnFilters: !settings.showColumnFilters,
                  })
                }
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  settings.showColumnFilters ? 'bg-blue-600' : 'bg-[#27272A]'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                    settings.showColumnFilters ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* TIPS Section */}
          <div className="p-2.5 rounded-lg bg-[#141416] border border-white/[0.06] space-y-1">
            <span className="text-[10px] font-bold text-[#71717A] uppercase tracking-wider block">
              TIPS
            </span>
            <p className="text-[11px] text-[#A1A1AA] leading-relaxed">
              Drag across cells to see their sum and average. <kbd className="px-1 py-0.5 rounded bg-black/50 text-[#F5F5F5] font-mono text-[10px]">Shift</kbd> extends a selection and <kbd className="px-1 py-0.5 rounded bg-black/50 text-[#F5F5F5] font-mono text-[10px]">Ctrl / ⌘ + C</kbd> copies it. Drag a column header to move it, or its edge to resize.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
