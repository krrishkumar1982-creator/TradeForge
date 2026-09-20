import React, { useState } from 'react';
import {
  X,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  Download,
  Shield
} from 'lucide-react';
import { useTrading } from '../../context/TradingContext';
import { Trade } from '../../types';

interface ImportTradesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ImportTradesModal: React.FC<ImportTradesModalProps> = ({ isOpen, onClose }) => {
  const { importTrades, addToast, accounts, propFirmAccounts, selectedAccountId } = useTrading();
  const [csvText, setCsvText] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [targetAccountId, setTargetAccountId] = useState<string>(() => {
    return selectedAccountId !== 'all' && accounts.some(a => a.id === selectedAccountId)
      ? selectedAccountId
      : (accounts[0]?.id || 'acc-1');
  });
  const [targetPropFirmAccountId, setTargetPropFirmAccountId] = useState<string>(() => {
    return selectedAccountId !== 'all' && propFirmAccounts.some(pf => pf.id === selectedAccountId)
      ? selectedAccountId
      : '';
  });

  if (!isOpen) return null;

  const sampleCsv = `Symbol,Direction,EntryPrice,ExitPrice,NetPnL,RMultiple,Setup,Date
MES,BUY,5640.00,5665.00,625.00,2.50,Opening Drive,2026-08-20T09:35:00.000Z
NQ,SELL,19850.00,19780.00,700.00,3.00,Absorption Reversal,2026-08-21T10:15:00.000Z
ES,BUY,5635.00,5630.00,-250.00,-1.00,Gap Up and Fail,2026-08-22T09:40:00.000Z`;

  const handleParseAndImport = () => {
    const text = csvText.trim() || sampleCsv;
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

    if (lines.length <= 1) {
      addToast('Invalid CSV', 'Please provide CSV rows with headers', 'error');
      return;
    }

    const newTrades: Array<Omit<Trade, 'id'>> = [];
    const rows = lines.slice(1);

    rows.forEach(row => {
      const cols = row.split(',').map(c => c.trim().replace(/^"|"$/g, ''));
      if (cols.length >= 5) {
        const symbol = cols[0] || 'MES';
        const direction = (cols[1]?.toUpperCase() === 'SELL' ? 'SELL' : 'BUY') as 'BUY' | 'SELL';
        const entryPrice = parseFloat(cols[2]) || 5640;
        const exitPrice = parseFloat(cols[3]) || 5650;
        const netPnl = parseFloat(cols[4]) || 100;
        const rMultiple = parseFloat(cols[5]) || 1.5;
        const setup = cols[6] || 'Opening Drive';
        const date = cols[7] || new Date().toISOString();

        newTrades.push({
          accountId: targetAccountId || accounts[0]?.id || 'acc-1',
          propFirmAccountId: targetPropFirmAccountId || undefined,
          symbol,
          market: 'Futures',
          direction,
          status: 'CLOSED',
          entryDate: date,
          exitDate: date,
          entryPrice,
          exitPrice,
          quantity: 2,
          commission: 5.0,
          swap: 0,
          fees: 0,
          grossPnl: netPnl + 5.0,
          netPnl,
          rMultiple,
          roiPercent: parseFloat(((netPnl / (entryPrice * 2)) * 100).toFixed(2)),
          rating: 4,
          setupType: setup,
          session: 'New York',
          rulesFollowed: netPnl > 0,
          mistakes: [],
          emotionalState: 'Disciplined',
          notes: `Imported from CSV execution log (${symbol} ${direction})`,
          durationMinutes: 25,
          tags: ['CSV_IMPORT', setup],
        });
      }
    });

    if (newTrades.length > 0) {
      importTrades(newTrades);
      onClose();
    } else {
      addToast('Import Error', 'Could not parse any valid trade rows', 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#07090D]/80 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="w-full max-w-xl rounded-2xl border border-[#1C232E] bg-[#12161D] p-6 shadow-2xl space-y-4 animate-in zoom-in-95">
        <div className="flex items-center justify-between pb-3 border-b border-[#1C232E]">
          <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <Upload className="w-4 h-4 text-indigo-400" />
            Import Trades via CSV / Broker Export
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Portfolio Destination Selectors */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl bg-[#0A0D14] border border-[#1C232E]">
          <div>
            <label className="block text-[11px] font-semibold text-slate-300 mb-1">
              Target Broker Account
            </label>
            <select
              value={targetAccountId}
              onChange={e => setTargetAccountId(e.target.value)}
              className="w-full rounded-lg bg-[#12161D] border border-[#1C232E] px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
            >
              {accounts.map(acc => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} ({acc.broker})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-indigo-300 mb-1 flex items-center gap-1">
              <Shield className="w-3 h-3 text-indigo-400" />
              <span>Link to Prop Firm Account</span>
            </label>
            <select
              value={targetPropFirmAccountId}
              onChange={e => setTargetPropFirmAccountId(e.target.value)}
              className="w-full rounded-lg bg-[#12161D] border border-indigo-500/40 px-2.5 py-1.5 text-xs text-indigo-200 focus:outline-none focus:border-indigo-400"
            >
              <option value="">None (Personal Trades)</option>
              {propFirmAccounts.map(pf => (
                <option key={pf.id} value={pf.id}>
                  🛡️ {pf.name} ({pf.firmName})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Drag Drop Area */}
        <div
          onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={e => {
            e.preventDefault();
            setIsDragOver(false);
            const file = e.dataTransfer.files[0];
            if (file) {
              const reader = new FileReader();
              reader.onload = ev => setCsvText(ev.target?.result as string || '');
              reader.readAsText(file);
            }
          }}
          className={`border-2 border-dashed rounded-2xl p-6 text-center transition cursor-pointer ${
            isDragOver ? 'border-indigo-500 bg-indigo-500/10' : 'border-[#1C232E] bg-[#0A0D14]/60 hover:border-[#1C232E]'
          }`}
        >
          <FileSpreadsheet className="w-8 h-8 text-indigo-400 mx-auto mb-2" />
          <p className="text-xs font-semibold text-slate-200">
            Drag & Drop your NinjaTrader, Tradovate, IBKR, or MT4/5 CSV export here
          </p>
          <p className="text-[11px] text-slate-500 mt-1">or paste raw CSV text in the box below</p>
        </div>

        {/* Text Area */}
        <div>
          <label className="text-xs text-slate-400 mb-1 block">Raw CSV Data</label>
          <textarea
            rows={5}
            value={csvText}
            onChange={e => setCsvText(e.target.value)}
            placeholder={sampleCsv}
            className="w-full rounded-xl bg-[#0A0D14] border border-[#1C232E] p-3 text-[11px] font-mono text-slate-200 focus:outline-none focus:border-indigo-500 custom-scrollbar"
          />
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-[#1C232E] flex items-center justify-between">
          <button
            onClick={() => setCsvText(sampleCsv)}
            className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold"
          >
            Insert Sample CSV Data
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-[#1A1F27] hover:bg-[#222936] text-xs font-semibold text-slate-300"
            >
              Cancel
            </button>
            <button
              onClick={handleParseAndImport}
              className="px-5 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold shadow-md shadow-violet-600/20"
            >
              Import Trades
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
