import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

interface TradesPaginationProps {
  currentPage: number;
  pageSize: number;
  totalTrades: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  pageSizeOptions?: number[];
}

export const TradesPagination: React.FC<TradesPaginationProps> = ({
  currentPage,
  pageSize,
  totalTrades,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 15, 25, 50, 100],
}) => {
  const totalPages = Math.max(1, Math.ceil(totalTrades / pageSize));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = totalTrades === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const endIndex = Math.min(safePage * pageSize, totalTrades);

  // Generate pagination page numbers with smart ellipsis
  const getPageNumbers = () => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const pages: (number | string)[] = [];
    if (safePage <= 4) {
      pages.push(1, 2, 3, 4, 5, '...', totalPages);
    } else if (safePage >= totalPages - 3) {
      pages.push(1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
    } else {
      pages.push(1, '...', safePage - 1, safePage, safePage + 1, '...', totalPages);
    }
    return pages;
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-white/[0.06] bg-[#0A0A0A] text-xs select-none">
      {/* Dynamic Summary Count & Page Size */}
      <div className="flex items-center gap-4 flex-wrap">
        <span className="text-[#A1A1AA]">
          {totalTrades > 0 ? (
            <>
              Showing <span className="font-mono font-semibold text-[#F5F5F5]">{startIndex}–{endIndex}</span> of{' '}
              <span className="font-mono font-semibold text-[#F5F5F5]">{totalTrades}</span> trades
            </>
          ) : (
            '0 trades'
          )}
        </span>

        <div className="flex items-center gap-1.5 border-l border-white/[0.08] pl-3.5">
          <span className="text-[11px] text-[#71717A]">Per page:</span>
          <div className="flex items-center gap-1">
            {pageSizeOptions.map(sz => (
              <button
                key={sz}
                type="button"
                onClick={() => onPageSizeChange(sz)}
                className={`px-2 py-0.5 rounded text-[11px] font-mono transition cursor-pointer ${
                  pageSize === sz
                    ? 'bg-blue-600 text-white font-bold'
                    : 'text-[#71717A] hover:text-[#F5F5F5] hover:bg-white/[0.04]'
                }`}
              >
                {sz}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Page Navigation Controls */}
      <div className="flex items-center gap-1">
        {/* Previous */}
        <button
          type="button"
          onClick={() => onPageChange(safePage - 1)}
          disabled={safePage <= 1}
          className={`px-2.5 py-1 rounded-md text-xs font-medium border border-white/[0.08] flex items-center gap-1 transition ${
            safePage <= 1
              ? 'opacity-30 cursor-not-allowed text-[#71717A] border-transparent'
              : 'bg-[#121212] hover:bg-[#1C1C1F] text-[#A1A1AA] hover:text-white cursor-pointer'
          }`}
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span>Previous</span>
        </button>

        {/* Page Buttons */}
        <div className="flex items-center gap-1">
          {getPageNumbers().map((p, idx) => {
            if (p === '...') {
              return (
                <span key={`dots-${idx}`} className="w-7 h-7 flex items-center justify-center text-[#71717A] text-xs">
                  ...
                </span>
              );
            }
            const pageNum = Number(p);
            const isActive = safePage === pageNum;
            return (
              <button
                key={`page-${pageNum}`}
                type="button"
                onClick={() => onPageChange(pageNum)}
                className={`w-7 h-7 rounded-md text-xs font-mono font-medium transition cursor-pointer ${
                  isActive
                    ? 'bg-blue-600 text-white font-bold shadow-[0_0_8px_rgba(37,99,235,0.3)]'
                    : 'text-[#A1A1AA] hover:text-white hover:bg-white/[0.05]'
                }`}
              >
                {pageNum}
              </button>
            );
          })}
        </div>

        {/* Next */}
        <button
          type="button"
          onClick={() => onPageChange(safePage + 1)}
          disabled={safePage >= totalPages || totalPages === 0}
          className={`px-2.5 py-1 rounded-md text-xs font-medium border border-white/[0.08] flex items-center gap-1 transition ${
            safePage >= totalPages || totalPages === 0
              ? 'opacity-30 cursor-not-allowed text-[#71717A] border-transparent'
              : 'bg-[#121212] hover:bg-[#1C1C1F] text-[#A1A1AA] hover:text-white cursor-pointer'
          }`}
        >
          <span>Next</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
