import React from 'react';
import { useTrading } from '../../context/TradingContext';

export interface Column<T> {
  key: string;
  header: React.ReactNode;
  align?: 'left' | 'center' | 'right';
  width?: string;
  render?: (item: T, index: number) => React.ReactNode;
  sortable?: boolean;
}

export interface TradeForgeTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T, index: number) => string | number;
  onRowClick?: (item: T, index: number) => void;
  isLoading?: boolean;
  emptyMessage?: string;
  stickyHeader?: boolean;
  className?: string;
  sortColumn?: string;
  sortDirection?: 'asc' | 'desc';
  onSort?: (columnKey: string) => void;
}

export function TradeForgeTable<T>({
  columns,
  data,
  keyExtractor,
  onRowClick,
  isLoading = false,
  emptyMessage = 'No records found',
  stickyHeader = true,
  className = '',
  sortColumn,
  sortDirection,
  onSort,
}: TradeForgeTableProps<T>) {
  const { theme } = useTrading();
  const isLight = theme === 'light';

  return (
    <div className={`w-full overflow-x-auto custom-scrollbar ${className}`}>
      <table className="w-full text-left border-collapse text-xs">
        <thead className={stickyHeader ? 'sticky top-0 z-10' : ''}>
          <tr
            className={`border-b ${
              isLight
                ? 'border-zinc-200 bg-zinc-50/90 text-zinc-600'
                : 'border-[rgba(255,255,255,0.08)] bg-[#0C0D12] text-slate-400'
            }`}
          >
            {columns.map(col => {
              const alignClass =
                col.align === 'right'
                  ? 'text-right'
                  : col.align === 'center'
                  ? 'text-center'
                  : 'text-left';

              const isSorted = sortColumn === col.key;

              return (
                <th
                  key={col.key}
                  style={col.width ? { width: col.width } : undefined}
                  onClick={() => col.sortable && onSort?.(col.key)}
                  className={`py-2.5 px-3 font-semibold select-none tracking-tight ${
                    isLight ? 'text-zinc-600' : 'text-slate-400'
                  } ${alignClass} ${
                    col.sortable
                      ? isLight
                        ? 'cursor-pointer hover:text-zinc-900'
                        : 'cursor-pointer hover:text-slate-200'
                      : ''
                  }`}
                >
                  <div
                    className={`inline-flex items-center gap-1 ${
                      col.align === 'right' ? 'justify-end' : col.align === 'center' ? 'justify-center' : 'justify-start'
                    }`}
                  >
                    <span>{col.header}</span>
                    {col.sortable && isSorted && (
                      <span className="text-blue-500 text-[10px]">
                        {sortDirection === 'asc' ? '▲' : '▼'}
                      </span>
                    )}
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody
          className={`divide-y ${
            isLight
              ? 'divide-zinc-200/80 bg-white'
              : 'divide-[rgba(255,255,255,0.05)] bg-[#101116]'
          }`}
        >
          {isLoading ? (
            <tr>
              <td
                colSpan={columns.length}
                className={`py-12 text-center ${isLight ? 'text-zinc-400' : 'text-slate-500'}`}
              >
                <div className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  <span>Loading data...</span>
                </div>
              </td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className={`py-12 text-center font-medium ${
                  isLight ? 'text-zinc-400' : 'text-slate-500'
                }`}
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((item, index) => {
              const isClickable = Boolean(onRowClick);
              return (
                <tr
                  key={keyExtractor(item, index)}
                  onClick={() => onRowClick?.(item, index)}
                  className={`transition-colors duration-100 ${
                    isClickable
                      ? isLight
                        ? 'cursor-pointer hover:bg-zinc-50 active:bg-zinc-100'
                        : 'cursor-pointer hover:bg-[#161821] active:bg-[#1A1D27]'
                      : isLight
                      ? 'hover:bg-zinc-50/50'
                      : 'hover:bg-[#13151C]'
                  }`}
                >
                  {columns.map(col => {
                    const alignClass =
                      col.align === 'right'
                        ? 'text-right'
                        : col.align === 'center'
                        ? 'text-center'
                        : 'text-left';

                    const content = col.render
                      ? col.render(item, index)
                      : (item as Record<string, unknown>)[col.key] as React.ReactNode;

                    return (
                      <td
                        key={col.key}
                        className={`py-2 px-3 tabular-nums ${
                          isLight ? 'text-zinc-800' : 'text-slate-200'
                        } ${alignClass}`}
                      >
                        {content}
                      </td>
                    );
                  })}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

export const Table = TradeForgeTable;
