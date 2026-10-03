import React from 'react';
import { Trash2, AlertTriangle, X } from 'lucide-react';

interface TradeClearAllModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  tradeCount: number;
}

export const TradeClearAllModal: React.FC<TradeClearAllModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  tradeCount,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="w-full max-w-md bg-[#0B0B0B] border border-rose-500/25 rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.08] bg-[#0E0E0E]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center">
              <Trash2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#F5F5F5]">Clear Trades</h2>
              <p className="text-[11px] text-[#A1A1AA]">This cannot be undone.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-[#71717A] hover:text-[#F5F5F5] hover:bg-white/[0.06] transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 text-xs">
          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-rose-400">
              <AlertTriangle className="w-4 h-4" />
              <span>Delete All Trades</span>
            </div>
            <p className="text-[11px] text-rose-200/90 leading-relaxed">
              Are you sure you want to delete all <span className="font-bold text-white font-mono">{tradeCount}</span> trades?
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg border border-white/[0.10] bg-[#121212] hover:bg-white/[0.05] text-[#A1A1AA] hover:text-white font-medium text-xs transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs transition shadow-[0_0_12px_rgba(225,29,72,0.3)] flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear Trades</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
