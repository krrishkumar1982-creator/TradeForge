import React from 'react';
import {
  CheckSquare,
  Square,
  Copy,
  Trash2,
  Edit2,
  ExternalLink,
  Shield,
  Star,
  Clock
} from 'lucide-react';
import { Trade, TradingAccount, PropFirmAccount, Playbook } from '../../types';
import { ColumnKey, RowDensity } from './TradeViewSettingsPopover';
import { TradeStatusBadge, TradeDirectionBadge } from './TradeStatusBadge';
import { TradeSourceBadge } from './TradeSourceBadge';
import { safeFormatEntryTime } from '../../utils/dateUtils';

interface TradeRowProps {
  trade: Trade;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  onClick: (trade: Trade) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  visibleColumns: ColumnKey[];
  density: RowDensity;
  accounts: TradingAccount[];
  propFirmAccounts: PropFirmAccount[];
  playbooks: Playbook[];
  formatCurrency: (val: number) => string;
  formatRMultiple: (r: number) => string;
}

export const TradeRow: React.FC<TradeRowProps> = ({
  trade,
  isSelected,
  onToggleSelect,
  onClick,
  onDuplicate,
  onDelete,
  visibleColumns,
  density,
  accounts,
  propFirmAccounts,
  playbooks,
  formatCurrency,
  formatRMultiple,
}) => {
  const isWin = trade.netPnl > 0;
  const isLoss = trade.netPnl < 0;

  // Format price
  const formatPrice = (p?: number) => {
    if (p === undefined || p === null) return '—';
    return p.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
  };

  // Format PnL
  const renderPnl = (val: number) => {
    const isPos = val > 0;
    const isNeg = val < 0;
    const formatted = formatCurrency(val);
    const colorClass = isPos ? 'text-emerald-400 font-semibold' : isNeg ? 'text-rose-400 font-semibold' : 'text-[#A1A1AA]';
    return <span className={`font-mono ${colorClass}`}>{formatted}</span>;
  };

  // Format Duration
  const formatDuration = (mins?: number) => {
    if (!mins && mins !== 0) return '—';
    if (mins < 60) return `${mins}m`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  };

  // Account Name
  const accountObj = accounts.find(a => a.id === trade.accountId);
  const propFirmObj = trade.propFirmAccountId ? propFirmAccounts.find(p => p.id === trade.propFirmAccountId) : null;

  // Cell padding based on density
  const cellPadding =
    density === 'compact'
      ? 'py-1.5 px-3'
      : density === 'relaxed'
      ? 'py-3.5 px-3.5'
      : 'py-2.5 px-3';

  return (
    <tr
      onClick={() => onClick(trade)}
      className={`group border-b border-white/[0.04] transition-colors duration-150 cursor-pointer select-none ${
        isSelected
          ? 'bg-blue-950/20 hover:bg-blue-950/30'
          : 'hover:bg-white/[0.025]'
      }`}
    >
      {/* Checkbox Column */}
      <td
        className={`w-10 min-w-[40px] pl-3.5 pr-1 ${cellPadding} text-center align-middle`}
        onClick={e => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={() => onToggleSelect(trade.id)}
          aria-label={`Select trade ${trade.symbol}`}
          className="inline-flex items-center justify-center p-0.5 rounded text-[#71717A] hover:text-white transition cursor-pointer"
        >
          {isSelected ? (
            <CheckSquare className="w-4 h-4 text-blue-500" />
          ) : (
            <Square className="w-4 h-4 text-[#52525B]" />
          )}
        </button>
      </td>

      {/* Dynamic Columns according to visibleColumns */}
      {visibleColumns.map(col => {
        switch (col) {
          case 'status':
            return (
              <td key={col} className={`${cellPadding} whitespace-nowrap`}>
                <TradeStatusBadge status={trade.status} />
              </td>
            );

          case 'symbol':
            return (
              <td key={col} className={`${cellPadding} whitespace-nowrap`}>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono font-bold text-[13px] text-[#F5F5F5] tracking-tight">
                    {trade.symbol}
                  </span>
                  <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-white/[0.04] border border-white/[0.06] text-[#A1A1AA]">
                    {trade.market}
                  </span>
                  {propFirmObj && (
                    <span
                      className="text-[9px] font-semibold px-1 py-0.2 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 inline-flex items-center gap-0.5"
                      title={`Prop Firm: ${propFirmObj.firmName} (${propFirmObj.name})`}
                    >
                      <Shield className="w-2.5 h-2.5" />
                      <span>{propFirmObj.firmName}</span>
                    </span>
                  )}
                </div>
              </td>
            );

          case 'direction':
            return (
              <td key={col} className={`${cellPadding} whitespace-nowrap`}>
                <TradeDirectionBadge direction={trade.direction} />
              </td>
            );

          case 'entryPrice':
            return (
              <td key={col} className={`${cellPadding} font-mono text-[#F5F5F5] whitespace-nowrap`}>
                {formatPrice(trade.entryPrice)}
              </td>
            );

          case 'exitPrice':
            return (
              <td key={col} className={`${cellPadding} font-mono text-[#A1A1AA] whitespace-nowrap`}>
                {trade.exitPrice ? formatPrice(trade.exitPrice) : <span className="text-[#52525B]">—</span>}
              </td>
            );

          case 'quantity':
            return (
              <td key={col} className={`${cellPadding} font-mono text-[#A1A1AA] whitespace-nowrap`}>
                {trade.quantity} <span className="text-[10px] text-[#71717A]">{trade.market === 'Futures' ? 'pts' : 'lots'}</span>
              </td>
            );

          case 'grossPnl':
            return (
              <td key={col} className={`${cellPadding} font-mono whitespace-nowrap`}>
                {renderPnl(trade.grossPnl ?? trade.netPnl)}
              </td>
            );

          case 'netPnl':
            return (
              <td key={col} className={`${cellPadding} font-mono whitespace-nowrap`}>
                {renderPnl(trade.netPnl)}
              </td>
            );

          case 'source':
            return (
              <td key={col} className={`${cellPadding} whitespace-nowrap`}>
                <TradeSourceBadge source={trade.source} />
              </td>
            );

          case 'entryDate': {
            const timeObj = safeFormatEntryTime(trade.entryDate, '—');
            return (
              <td key={col} className={`${cellPadding} font-mono text-[11px] whitespace-nowrap`}>
                <span className="text-[#F5F5F5]">{timeObj.date}</span>
                {timeObj.time && <span className="text-[#71717A] ml-1.5">{timeObj.time}</span>}
              </td>
            );
          }

          case 'exitDate': {
            const timeObj = safeFormatEntryTime(trade.exitDate, '—');
            return (
              <td key={col} className={`${cellPadding} font-mono text-[11px] whitespace-nowrap`}>
                <span className="text-[#A1A1AA]">{timeObj.date}</span>
                {timeObj.time && <span className="text-[#71717A] ml-1.5">{timeObj.time}</span>}
              </td>
            );
          }

          case 'durationMinutes':
            return (
              <td key={col} className={`${cellPadding} font-mono text-[11px] text-[#A1A1AA] whitespace-nowrap`}>
                {formatDuration(trade.durationMinutes)}
              </td>
            );

          case 'swap':
            return (
              <td key={col} className={`${cellPadding} font-mono text-[11px] text-[#A1A1AA] whitespace-nowrap`}>
                {trade.swap ? `$${trade.swap.toFixed(2)}` : '$0.00'}
              </td>
            );

          case 'accountId':
            return (
              <td key={col} className={`${cellPadding} text-xs text-[#A1A1AA] whitespace-nowrap truncate max-w-[130px]`}>
                {accountObj?.name || 'Main Portfolio'}
              </td>
            );

          case 'strategy':
            return (
              <td key={col} className={`${cellPadding} text-xs text-[#F5F5F5] font-medium whitespace-nowrap truncate max-w-[140px]`}>
                {trade.setupType || 'Discretionary'}
              </td>
            );

          case 'tags':
            return (
              <td key={col} className={`${cellPadding} whitespace-nowrap`}>
                {trade.tags && trade.tags.length > 0 ? (
                  <div className="flex items-center gap-1">
                    {trade.tags.slice(0, 2).map((t, idx) => (
                      <span
                        key={idx}
                        className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-white/[0.04] border border-white/[0.06] text-[#A1A1AA]"
                      >
                        #{t}
                      </span>
                    ))}
                    {trade.tags.length > 2 && (
                      <span className="text-[10px] text-[#71717A] font-mono">
                        +{trade.tags.length - 2}
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="text-[#52525B]">—</span>
                )}
              </td>
            );

          case 'rMultiple':
            return (
              <td key={col} className={`${cellPadding} font-mono font-medium whitespace-nowrap`}>
                <span
                  className={
                    trade.rMultiple > 0
                      ? 'text-emerald-400'
                      : trade.rMultiple < 0
                      ? 'text-rose-400'
                      : 'text-[#A1A1AA]'
                  }
                >
                  {formatRMultiple(trade.rMultiple)}
                </span>
              </td>
            );

          case 'stopLoss':
            return (
              <td key={col} className={`${cellPadding} font-mono text-[11px] text-rose-400/90 whitespace-nowrap`}>
                {trade.stopLoss ? formatPrice(trade.stopLoss) : <span className="text-[#52525B]">—</span>}
              </td>
            );

          case 'takeProfit':
            return (
              <td key={col} className={`${cellPadding} font-mono text-[11px] text-emerald-400/90 whitespace-nowrap`}>
                {trade.takeProfit ? formatPrice(trade.takeProfit) : <span className="text-[#52525B]">—</span>}
              </td>
            );

          case 'rulesFollowed':
            return (
              <td key={col} className={`${cellPadding} whitespace-nowrap`}>
                {trade.rulesFollowed ? (
                  <span className="px-1.5 py-0.5 rounded text-[10.5px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Followed ✓
                  </span>
                ) : (
                  <span className="px-1.5 py-0.5 rounded text-[10.5px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                    Broken ✗
                  </span>
                )}
              </td>
            );

          case 'rating':
            return (
              <td key={col} className={`${cellPadding} whitespace-nowrap`}>
                <div className="flex items-center gap-0.5 text-amber-400">
                  {Array.from({ length: 5 }, (_, i) => (
                    <Star
                      key={i}
                      className={`w-3 h-3 ${
                        i < (trade.rating || 0)
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-[#3F3F46]'
                      }`}
                    />
                  ))}
                </div>
              </td>
            );

          default:
            return null;
        }
      })}

      {/* Row Hover Actions */}
      <td
        className={`w-16 pr-3.5 pl-1 ${cellPadding} text-right whitespace-nowrap`}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-end gap-1 opacity-40 group-hover:opacity-100 transition">
          <button
            type="button"
            onClick={() => onDuplicate(trade.id)}
            title="Duplicate trade"
            className="w-6 h-6 flex items-center justify-center rounded text-[#71717A] hover:text-[#F5F5F5] hover:bg-white/[0.08] transition"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(trade.id)}
            title="Delete trade"
            className="w-6 h-6 flex items-center justify-center rounded text-[#71717A] hover:text-rose-400 hover:bg-rose-500/15 transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </td>
    </tr>
  );
};
