import React from 'react';
import { Plus, FilterX, Layers } from 'lucide-react';

interface TradesEmptyStateProps {
  type: 'no-trades' | 'no-filter-match';
  onAddTrade?: () => void;
  onClearFilters?: () => void;
}

export const TradesEmptyState: React.FC<TradesEmptyStateProps> = ({
  type,
  onAddTrade,
  onClearFilters,
}) => {
  if (type === 'no-filter-match') {
    return (
      <div className="py-20 px-4 flex flex-col items-center justify-center text-center select-none">
        <div className="w-12 h-12 rounded-xl bg-[#141416] border border-white/[0.08] flex items-center justify-center text-[#71717A] mb-3.5 shadow-lg">
          <FilterX className="w-5 h-5" />
        </div>
        <h3 className="text-sm font-bold text-[#F5F5F5] tracking-tight">
          No trades match these filters.
        </h3>
        <p className="text-xs text-[#71717A] mt-1 max-w-sm">
          Try adjusting your filters.
        </p>
        {onClearFilters && (
          <button
            type="button"
            onClick={onClearFilters}
            className="mt-4 px-4 py-2 rounded-lg bg-[#18181B] hover:bg-[#202024] border border-white/[0.12] text-xs font-semibold text-[#F5F5F5] transition cursor-pointer"
          >
            Clear Filters
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="py-20 px-4 flex flex-col items-center justify-center text-center select-none">
      <div className="w-14 h-14 rounded-2xl bg-[#121212] border border-white/[0.08] flex items-center justify-center text-blue-400 mb-4 shadow-xl">
        <Layers className="w-6 h-6" />
      </div>
      <h3 className="text-base font-bold text-[#F5F5F5] tracking-tight">
        No trades yet.
      </h3>
      <p className="text-xs text-[#A1A1AA] mt-1 max-w-sm leading-relaxed">
        Add your first trade to start building your journal.
      </p>
      {onAddTrade && (
        <button
          type="button"
          onClick={onAddTrade}
          className="mt-5 flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition cursor-pointer shadow-[0_0_15px_rgba(37,99,235,0.35)]"
        >
          <Plus className="w-4 h-4" />
          <span>Add Trade</span>
        </button>
      )}
    </div>
  );
};
