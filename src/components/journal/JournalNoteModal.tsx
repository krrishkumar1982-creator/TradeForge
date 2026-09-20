import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Sparkles,
  Link2,
  Tag as TagIcon,
  Calendar,
  Clock,
  Folder,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Paperclip,
  Trash2,
  Image as ImageIcon,
  FileText,
  Check,
  ChevronDown,
  Plus
} from 'lucide-react';
import { useTrading } from '../../context/TradingContext';
import { JournalNote, JournalFolder, Trade, JournalAttachment } from '../../types';
import { safeFormatDate } from '../../utils/dateUtils';
import { SupabaseStorageService } from '../../services/supabaseStorage';

interface JournalNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  noteToEdit?: JournalNote | null;
  defaultFolderId?: string;
  defaultTag?: string | null;
}

const NOTE_TEMPLATES = [
  {
    name: 'Pre-Market & Post-Session',
    content: `Took a long on NQ after the liquidity sweep on 1H.

Price respected the mitigation block and gave a strong displacement.

Managed risk well and moved SL to BE after 1:2 R:R.

Overall a clean trade.`,
    tags: ['Futures', 'A+ Setup'],
  },
  {
    name: 'Morning Session Plan',
    content: `Today I will be focusing on London session liquidity sweeps and watching ES/NQ volume delta during the 9:45 AM opening range drive.

Rules for today:
1. Max 2 executions allowed.
2. Wait for 5m candle close confirmation before market orders.
3. Keep hard stop on every trade.`,
    tags: ['Plan', 'Futures'],
  },
  {
    name: 'Mistake Review & Post-Mortem',
    content: `Took 3 trades in a row without proper setup confirmation.

Recognized that I was reacting emotionally to FOMO after missing the initial move. Chased a green candle without waiting for a retest.

Corrective Action:
- Enforce the 2-trade circuit breaker rule strictly.
- Step away from the screen for at least 30 minutes after any loss.`,
    tags: ['Mistake'],
  },
  {
    name: 'FOMC Reaction Plan',
    content: `### Pre-FOMC Strategy
Pre-FOMC consolidation on tech equities (NVDA, AAPL). Kept position sizing at 50% max allocation until press conference volatility settles.

### Key Focus
- Primary focus on 128.50 key breakout level.
- Flatten all open scalp positions 10m before the rate decision statement.`,
    tags: ['FOMC', 'Equities'],
  }
];

export const JournalNoteModal: React.FC<JournalNoteModalProps> = ({
  isOpen,
  onClose,
  noteToEdit,
  defaultFolderId = 'f-all',
  defaultTag = null,
}) => {
  const {
    folders,
    trades,
    accounts,
    propFirmAccounts,
    addNote,
    updateNote,
    addToast,
    formatCurrency,
    theme,
  } = useTrading();

  const isLight = theme === 'light';

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [folderId, setFolderId] = useState('f-trade');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState(new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }));
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [selectedTradeId, setSelectedTradeId] = useState<string>('');
  const [symbol, setSymbol] = useState('');
  const [side, setSide] = useState<'Long' | 'Short' | 'BUY' | 'SELL' | ''>('');
  const [setup, setSetup] = useState('');
  const [timeframe, setTimeframe] = useState('');
  const [resultR, setResultR] = useState('');
  const [accountName, setAccountName] = useState('');
  const [attachments, setAttachments] = useState<JournalAttachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (noteToEdit) {
      setTitle(noteToEdit.title || '');
      setContent(noteToEdit.content || '');
      setFolderId(noteToEdit.folderId || 'f-trade');
      setDate(noteToEdit.date || new Date().toISOString().split('T')[0]);
      setTime(noteToEdit.time || '6:30 PM');
      setTags(noteToEdit.tags || []);
      setSelectedTradeId(noteToEdit.tradeId || '');
      setSymbol(noteToEdit.symbol || '');
      setSide(noteToEdit.side || '');
      setSetup(noteToEdit.setup || '');
      setTimeframe(noteToEdit.timeframe || '');
      setResultR(noteToEdit.resultR || '');
      setAccountName(noteToEdit.accountName || '');
      setAttachments(noteToEdit.attachments || (noteToEdit.screenshots || []).map((url, i) => ({
        id: `att-${i}`,
        name: `Chart Screenshot #${i + 1}`,
        url,
        type: 'image',
        date: noteToEdit.date,
      })));
    } else {
      const now = new Date();
      setTitle('');
      setContent('');
      const matchingFolder = folders.find(f => f.id === defaultFolderId);
      setFolderId(matchingFolder ? matchingFolder.id : (defaultFolderId && defaultFolderId !== 'f-all' ? defaultFolderId : ''));
      setDate(now.toISOString().split('T')[0]);
      setTime(now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }));
      setTags(defaultTag ? [defaultTag] : ['Futures']);
      setSelectedTradeId('');
      setSymbol('');
      setSide('');
      setSetup('');
      setTimeframe('1H');
      setResultR('');
      setAccountName('Prop Firm');
      setAttachments([]);
    }
  }, [noteToEdit, defaultFolderId, defaultTag, isOpen]);

  // When a trade is linked from the existing trades store
  const handleSelectTrade = (tradeId: string) => {
    setSelectedTradeId(tradeId);
    if (!tradeId) return;

    const tr = trades.find(t => t.id === tradeId);
    if (tr) {
      setSymbol(tr.symbol || '');
      setSide(tr.direction === 'BUY' ? 'Long' : 'Short');
      setSetup(tr.setupType || tr.strategyId || 'Price Action');
      setTimeframe('15m');
      const r = tr.rMultiple !== undefined ? `${tr.rMultiple >= 0 ? '+' : ''}${tr.rMultiple.toFixed(2)}R` : '';
      setResultR(r);
      setAccountName(tr.market === 'Futures' ? 'Prop Firm' : 'Live Trading Account');
      if (!title.trim()) {
        setTitle(`${tr.symbol} : ${safeFormatDate(tr.entryDate, '—', { month: 'short', day: 'numeric', year: 'numeric' })} Execution`);
      }
      if (!content.trim() && tr.notes) {
        setContent(tr.notes);
      }
      if (tr.tags && tr.tags.length > 0) {
        const merged = Array.from(new Set([...tags, ...tr.tags]));
        setTags(merged);
      }
    }
  };

  const handleAddTag = () => {
    const trimmed = tagInput.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (t: string) => {
    setTags(tags.filter(tag => tag !== t));
  };

  const processFiles = async (fileList: FileList | File[]) => {
    if (!fileList || fileList.length === 0) return;

    setIsUploading(true);
    try {
      const newItems: JournalAttachment[] = [];
      for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i];
        let fileUrl = '';
        try {
          fileUrl = await SupabaseStorageService.uploadJournalScreenshot(file, noteToEdit?.id || 'new');
        } catch {
          // Fallback to local Base64 / blob URL for 100% offline resilience
          fileUrl = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.readAsDataURL(file);
          });
        }

        newItems.push({
          id: `att-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 4)}`,
          name: file.name,
          url: fileUrl,
          type: file.type.startsWith('image/') ? 'image' : file.type.includes('pdf') ? 'pdf' : 'document',
          size: file.size,
          date: new Date().toISOString().split('T')[0],
        });
      }

      setAttachments(prev => [...prev, ...newItems]);
      addToast('File Attached', `${newItems.length} file${newItems.length > 1 ? 's' : ''} uploaded successfully`, 'success');
    } catch (err: any) {
      console.error('File upload error:', err);
      addToast('Upload Error', 'Could not process attachment', 'error');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(e.target.files);
    }
  };

  const handleRemoveAttachment = (id: string) => {
    setAttachments(prev => prev.filter(a => a.id !== id));
  };

  const handleApplyTemplate = (tmpl: typeof NOTE_TEMPLATES[0]) => {
    setContent(tmpl.content);
    const mergedTags = Array.from(new Set([...tags, ...tmpl.tags]));
    setTags(mergedTags);
    if (!title.trim()) {
      setTitle(tmpl.name);
    }
    addToast('Template Applied', tmpl.name, 'info');
  };

  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      addToast('Missing Title', 'Please enter a title for this journal note', 'warning');
      return;
    }

    const linkedTrade = trades.find(t => t.id === selectedTradeId);

    const notePayload: Omit<JournalNote, 'id'> = {
      accountId: linkedTrade?.accountId || 'acc-1',
      date,
      time: time || '6:30 PM',
      title: title.trim(),
      folderId: folderId || '',
      tags: tags.length > 0 ? tags : ['Futures'],
      content: content.trim() || 'No note content provided.',
      tradeId: selectedTradeId || undefined,
      symbol: symbol.trim() || (selectedTradeId ? linkedTrade?.symbol : undefined),
      side: side ? side : (linkedTrade?.direction === 'BUY' ? 'Long' : linkedTrade?.direction === 'SELL' ? 'Short' : undefined),
      setup: setup.trim() || linkedTrade?.setupType || undefined,
      timeframe: timeframe.trim() || '1H',
      resultR: resultR.trim() || (linkedTrade?.rMultiple !== undefined ? `${linkedTrade.rMultiple >= 0 ? '+' : ''}${linkedTrade.rMultiple.toFixed(2)}R` : undefined),
      accountName: accountName.trim() || (linkedTrade?.market === 'Futures' ? 'Prop Firm' : 'Live Account'),
      attachments,
      screenshots: attachments.filter(a => a.type === 'image').map(a => a.url),
      netPnl: linkedTrade?.netPnl,
      netRoi: linkedTrade?.roiPercent,
      contractsTraded: linkedTrade?.quantity,
      volume: linkedTrade?.quantity,
      isFavorite: noteToEdit?.isFavorite || false,
      isDeleted: false,
    };

    setIsSaving(true);
    try {
      if (noteToEdit) {
        const success = await updateNote({
          ...noteToEdit,
          ...notePayload,
          id: noteToEdit.id,
        });
        if (success) {
          onClose();
        }
      } else {
        const created = await addNote(notePayload);
        if (created) {
          onClose();
        }
      }
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 animate-in fade-in"
      style={{
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        className={`w-full max-w-3xl max-h-[92vh] rounded-2xl border flex flex-col shadow-2xl overflow-hidden transition-all ${
          isLight
            ? 'bg-white border-zinc-200 text-zinc-900 shadow-2xl'
            : 'bg-[#12161D] border-[#1C232E] text-slate-100 shadow-2xl shadow-indigo-950/40'
        }`}
      >
        {/* Header */}
        <div className={`flex items-center justify-between px-6 py-4 border-b shrink-0 ${
          isLight ? 'border-zinc-200 bg-zinc-50/90' : 'border-[#1C232E] bg-[#12161D]'
        }`}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-purple-600 flex items-center justify-center text-white shadow-sm">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className={`text-sm sm:text-base font-bold tracking-tight ${isLight ? 'text-zinc-900' : 'text-white'}`}>
                {noteToEdit ? 'Edit Journal Entry' : 'Create New Journal Entry'}
              </h2>
              <p className={`text-[11px] ${isLight ? 'text-zinc-500' : 'text-slate-400'}`}>
                Log technical thesis, execution takeaways, and link trading statistics
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className={`p-1.5 rounded-lg transition ${
              isLight ? 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100' : 'text-slate-400 hover:text-white hover:bg-[#1A1F27]'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-5">
          {/* Quick Template Selector */}
          <div className="space-y-1.5">
            <span className={`text-[10px] font-bold uppercase tracking-wider ${isLight ? 'text-zinc-500' : 'text-slate-400'}`}>Quick Templates</span>
            <div className="flex flex-wrap gap-1.5">
              {NOTE_TEMPLATES.map((tmpl) => (
                <button
                  key={tmpl.name}
                  type="button"
                  onClick={() => handleApplyTemplate(tmpl)}
                  className={`text-[11px] font-medium px-2.5 py-1 rounded-lg border transition cursor-pointer ${
                    isLight
                      ? 'bg-zinc-100 hover:bg-zinc-200 border-zinc-200 text-zinc-700'
                      : 'bg-[#1A1F27] hover:bg-indigo-950/40 border-[#1C232E] hover:border-indigo-500/40 text-slate-300'
                  }`}
                >
                  + {tmpl.name}
                </button>
              ))}
            </div>
          </div>

          {/* Title & Folder */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 space-y-1">
              <label className={`text-xs font-semibold ${isLight ? 'text-zinc-700' : 'text-slate-300'}`}>Note Title *</label>
              <input
                type="text"
                required
                placeholder="e.g. FOMC Day Reaction Trade"
                value={title}
                onChange={e => setTitle(e.target.value)}
                className={`w-full rounded-xl px-3.5 py-2 text-xs focus:outline-none border font-medium ${
                  isLight
                    ? 'bg-white border-zinc-300 text-zinc-900 placeholder-zinc-400 focus:border-indigo-500'
                    : 'bg-[#0A0D14] border-[#1C232E] text-white placeholder-slate-500 focus:border-indigo-500'
                }`}
              />
            </div>

            <div className="space-y-1">
              <label className={`text-xs font-semibold ${isLight ? 'text-zinc-700' : 'text-slate-300'}`}>Target Folder</label>
              <select
                value={folderId}
                onChange={e => setFolderId(e.target.value)}
                className={`w-full rounded-xl px-3 py-2 text-xs focus:outline-none border ${
                  isLight
                    ? 'bg-white border-zinc-300 text-zinc-900 focus:border-indigo-500'
                    : 'bg-[#0A0D14] border-[#1C232E] text-slate-200 focus:border-indigo-500'
                }`}
                disabled={isSaving}
              >
                <option value="">No Folder (Standalone)</option>
                {folders.filter(f => f.id !== 'f-all' && !f.isDeleted).map(f => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Date, Time & Link Trade */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className={`text-xs font-semibold flex items-center gap-1 ${isLight ? 'text-zinc-700' : 'text-slate-300'}`}>
                <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                Date
              </label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className={`w-full rounded-xl px-3 py-2 text-xs focus:outline-none border ${
                  isLight
                    ? 'bg-white border-zinc-300 text-zinc-900 focus:border-indigo-500'
                    : 'bg-[#0A0D14] border-[#1C232E] text-slate-200 focus:border-indigo-500'
                }`}
              />
            </div>

            <div className="space-y-1">
              <label className={`text-xs font-semibold flex items-center gap-1 ${isLight ? 'text-zinc-700' : 'text-slate-300'}`}>
                <Clock className="w-3.5 h-3.5 text-indigo-500" />
                Time
              </label>
              <input
                type="text"
                placeholder="e.g. 6:30 PM"
                value={time}
                onChange={e => setTime(e.target.value)}
                className={`w-full rounded-xl px-3 py-2 text-xs focus:outline-none border font-mono ${
                  isLight
                    ? 'bg-white border-zinc-300 text-zinc-900 placeholder-zinc-400 focus:border-indigo-500'
                    : 'bg-[#0A0D14] border-[#1C232E] text-slate-200 focus:border-indigo-500'
                }`}
              />
            </div>

            <div className="space-y-1">
              <label className={`text-xs font-semibold flex items-center gap-1 ${isLight ? 'text-zinc-700' : 'text-slate-300'}`}>
                <Link2 className="w-3.5 h-3.5 text-indigo-500" />
                Link Trade (Optional)
              </label>
              <select
                value={selectedTradeId}
                onChange={e => handleSelectTrade(e.target.value)}
                className={`w-full rounded-xl px-3 py-2 text-xs focus:outline-none border truncate ${
                  isLight
                    ? 'bg-white border-zinc-300 text-zinc-900 focus:border-indigo-500'
                    : 'bg-[#0A0D14] border-[#1C232E] text-slate-200 focus:border-indigo-500'
                }`}
              >
                <option value="">-- None (Standalone Note) --</option>
                {trades.map(tr => (
                  <option key={tr.id} value={tr.id}>
                    {tr.symbol} • {tr.direction} • {tr.netPnl !== undefined ? formatCurrency(tr.netPnl) : ''} ({safeFormatDate(tr.entryDate, '—')})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* TRADE SUMMARY */}
          <div className={`p-4 rounded-xl border space-y-3 ${
            isLight
              ? 'bg-[#F8F9FB] border-zinc-200'
              : 'bg-[#0A0D14] border-[#1C232E]'
          }`}>
            <div className="flex items-center justify-between">
              <span className={`text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                isLight ? 'text-indigo-600' : 'text-purple-400'
              }`}>
                <TrendingUp className="w-3.5 h-3.5" />
                Trade Summary
              </span>
              <span className={`text-[10px] ${isLight ? 'text-zinc-500' : 'text-slate-400'}`}>Symbol, Execution & Setup Metrics</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
              {/* Symbol */}
              <div>
                <label className={`text-[10px] font-semibold block mb-1 ${isLight ? 'text-zinc-600' : 'text-slate-300'}`}>
                  Symbol
                </label>
                <input
                  type="text"
                  placeholder="e.g. NQ"
                  value={symbol}
                  onChange={e => setSymbol(e.target.value.toUpperCase())}
                  className={`w-full rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold border focus:outline-none transition ${
                    isLight ? 'bg-white border-zinc-300 text-zinc-900 placeholder-zinc-400 focus:border-indigo-500' : 'bg-[#12161D] border-[#1C232E] text-white focus:border-indigo-500'
                  }`}
                />
              </div>

              {/* Side */}
              <div>
                <label className={`text-[10px] font-semibold block mb-1 ${isLight ? 'text-zinc-600' : 'text-slate-300'}`}>
                  Side
                </label>
                <select
                  value={side}
                  onChange={e => setSide(e.target.value as any)}
                  className={`w-full rounded-lg px-2 py-1.5 text-xs border focus:outline-none transition ${
                    side === 'Long' || side === 'BUY'
                      ? 'text-emerald-500 font-semibold'
                      : side === 'Short' || side === 'SELL'
                        ? 'text-rose-500 font-semibold'
                        : isLight ? 'text-zinc-800' : 'text-slate-200'
                  } ${
                    isLight ? 'bg-white border-zinc-300 text-zinc-900 focus:border-indigo-500' : 'bg-[#12161D] border-[#1C232E] text-white focus:border-indigo-500'
                  }`}
                >
                  <option value="">-- Side --</option>
                  <option value="Long">Long</option>
                  <option value="Short">Short</option>
                </select>
              </div>

              {/* Result (R:R) */}
              <div>
                <label className={`text-[10px] font-semibold block mb-1 ${isLight ? 'text-zinc-600' : 'text-slate-300'}`}>
                  Result (R:R)
                </label>
                <input
                  type="text"
                  placeholder="e.g. +2.45R"
                  value={resultR}
                  onChange={e => setResultR(e.target.value)}
                  className={`w-full rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold border focus:outline-none transition ${
                    resultR?.startsWith('+')
                      ? isLight ? 'bg-emerald-50 text-emerald-700 border-emerald-300' : 'text-emerald-400 border-emerald-500/30'
                      : resultR?.startsWith('-')
                        ? isLight ? 'bg-rose-50 text-rose-700 border-rose-300' : 'text-rose-400 border-rose-500/30'
                        : isLight
                          ? 'bg-white border-zinc-300 text-zinc-900 focus:border-indigo-500'
                          : 'bg-[#12161D] border-[#1C232E] text-white focus:border-indigo-500'
                  }`}
                />
              </div>

              {/* Setup */}
              <div>
                <label className={`text-[10px] font-semibold block mb-1 ${isLight ? 'text-zinc-600' : 'text-slate-300'}`}>
                  Setup
                </label>
                <input
                  type="text"
                  list="trade-setup-options-modal"
                  placeholder="e.g. Breaker Block"
                  value={setup}
                  onChange={e => setSetup(e.target.value)}
                  className={`w-full rounded-lg px-2.5 py-1.5 text-xs border focus:outline-none transition ${
                    isLight ? 'bg-white border-zinc-300 text-zinc-900 placeholder-zinc-400 focus:border-indigo-500' : 'bg-[#12161D] border-[#1C232E] text-white focus:border-indigo-500'
                  }`}
                />
                <datalist id="trade-setup-options-modal">
                  <option value="Breaker Block" />
                  <option value="Liquidity Sweep" />
                  <option value="Order Block" />
                  <option value="Fair Value Gap (FVG)" />
                  <option value="Break & Retest" />
                  <option value="Range Expansion" />
                  <option value="Opening Range Breakout" />
                  <option value="Mitigation Block" />
                  <option value="Trend Pullback" />
                  <option value="Supply & Demand" />
                </datalist>
              </div>

              {/* Account */}
              <div className="col-span-2 sm:col-span-1">
                <label className={`text-[10px] font-semibold block mb-1 ${isLight ? 'text-zinc-600' : 'text-slate-300'}`}>
                  Account
                </label>
                <select
                  value={accountName}
                  onChange={e => setAccountName(e.target.value)}
                  className={`w-full rounded-lg px-2 py-1.5 text-xs border focus:outline-none transition truncate ${
                    isLight ? 'bg-white border-zinc-300 text-zinc-900 focus:border-indigo-500' : 'bg-[#12161D] border-[#1C232E] text-white focus:border-indigo-500'
                  }`}
                >
                  <option value="">-- Select Account --</option>
                  <option value="Prop Firm">Prop Firm</option>
                  <option value="Live Trading Account">Live Trading Account</option>
                  <option value="Personal Account">Personal Account</option>
                  {accounts && accounts.map(acc => (
                    <option key={acc.id} value={acc.name}>
                      {acc.name}
                    </option>
                  ))}
                  {propFirmAccounts && propFirmAccounts.map(p => (
                    <option key={p.id} value={`${p.firmName} - ${p.name}`}>
                      {p.firmName} ({p.name})
                    </option>
                  ))}
                  {accountName && !['Prop Firm', 'Live Trading Account', 'Personal Account', ...(accounts || []).map(a => a.name), ...(propFirmAccounts || []).map(p => `${p.firmName} - ${p.name}`)].includes(accountName) && (
                    <option value={accountName}>{accountName}</option>
                  )}
                </select>
              </div>
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-1.5">
            <label className={`text-xs font-semibold flex items-center gap-1.5 ${isLight ? 'text-zinc-700' : 'text-slate-300'}`}>
              <TagIcon className="w-3.5 h-3.5 text-indigo-500" />
              Tags
            </label>
            <div className="flex flex-wrap items-center gap-1.5">
              {['FOMC', 'Equities', 'Futures', 'Forex', 'A+ Setup', 'Mistake', 'Plan'].map(preset => {
                const active = tags.includes(preset);
                return (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => {
                      if (active) setTags(tags.filter(t => t !== preset));
                      else setTags([...tags, preset]);
                    }}
                    className={`text-[11px] px-2.5 py-0.5 rounded-lg border transition cursor-pointer ${
                      active
                        ? isLight
                          ? 'bg-indigo-50 border-indigo-400 text-indigo-700 font-bold'
                          : 'bg-purple-950/70 border-purple-600 text-purple-200 font-bold'
                        : isLight
                          ? 'bg-zinc-100 hover:bg-zinc-200 border-zinc-200 text-zinc-600'
                          : 'bg-[#1A1F27] hover:bg-[#222936] border-[#1C232E] text-slate-400'
                    }`}
                  >
                    {preset} {active ? '✓' : '+'}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="text"
                placeholder="Type custom tag and press Enter..."
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
                className={`flex-1 rounded-lg px-3 py-1.5 text-xs focus:outline-none border ${
                  isLight
                    ? 'bg-white border-zinc-300 text-zinc-900 placeholder-zinc-400 focus:border-indigo-500'
                    : 'bg-[#0A0D14] border-[#1C232E] text-slate-200 focus:border-indigo-500'
                }`}
              />
              <button
                type="button"
                onClick={handleAddTag}
                className={`px-3 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer ${
                  isLight
                    ? 'bg-zinc-100 hover:bg-zinc-200 border-zinc-300 text-zinc-800'
                    : 'bg-[#1A1F27] hover:bg-[#222936] border-[#1C232E] text-white'
                }`}
              >
                Add
              </button>
            </div>

            {/* Currently assigned tags */}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {tags.map(t => (
                  <span
                    key={t}
                    className={`text-[11px] px-2 py-0.5 rounded-md border flex items-center gap-1 ${
                      isLight
                        ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                        : 'bg-purple-950/60 border-purple-800 text-purple-300'
                    }`}
                  >
                    {t}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(t)}
                      className="hover:text-rose-500 ml-0.5 cursor-pointer"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Note Content */}
          <div className="space-y-1.5">
            <label className={`text-xs font-semibold ${isLight ? 'text-zinc-700' : 'text-slate-300'}`}>Journal Note Content *</label>
            <textarea
              required
              rows={7}
              placeholder="Took a long on NQ after the liquidity sweep on 1H. Price respected the mitigation block and gave a strong displacement..."
              value={content}
              onChange={e => setContent(e.target.value)}
              className={`w-full rounded-xl p-3.5 text-xs leading-relaxed font-mono focus:outline-none border custom-scrollbar ${
                isLight
                  ? 'bg-white border-zinc-300 text-zinc-900 placeholder-zinc-400 focus:border-indigo-500'
                  : 'bg-[#0A0D14] border-[#1C232E] text-slate-100 placeholder-slate-500 focus:border-indigo-500'
              }`}
            />
          </div>

          {/* ATTACHMENTS */}
          <div className="space-y-2.5 pt-1">
            <div className="flex items-center justify-between">
              <span className={`text-xs font-semibold flex items-center gap-1.5 ${isLight ? 'text-zinc-700' : 'text-slate-300'}`}>
                <Paperclip className="w-3.5 h-3.5 text-indigo-500" />
                ATTACHMENTS
              </span>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="text-xs text-indigo-500 hover:text-indigo-600 font-semibold flex items-center gap-1 transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{isUploading ? 'Uploading...' : '+ Add Attachment'}</span>
              </button>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              multiple
              accept="image/*,application/pdf,.doc,.docx"
              className="hidden"
            />

            {/* Compact Drag & Drop Zone (approx 80-95px height) */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                  processFiles(e.dataTransfer.files);
                }
              }}
              onClick={() => fileInputRef.current?.click()}
              className={`w-full h-[88px] border border-dashed rounded-xl px-4 py-2.5 transition flex items-center justify-center gap-3.5 cursor-pointer select-none ${
                isDragging
                  ? 'border-indigo-500 bg-indigo-950/30'
                  : isLight
                    ? 'border-zinc-300 hover:border-indigo-500 hover:bg-zinc-50 bg-zinc-50/50'
                    : 'border-[#1C232E] hover:border-indigo-500/50 hover:bg-[#151B24] bg-[#0A0D14]'
              }`}
            >
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
                <Paperclip className="w-4 h-4" />
              </div>
              <div className="text-left">
                <p className={`text-xs font-semibold ${isLight ? 'text-zinc-800' : 'text-slate-200'}`}>
                  {isUploading ? 'Uploading files...' : 'Drop files here or click to upload'}
                </p>
                <p className={`text-[11px] ${isLight ? 'text-zinc-500' : 'text-slate-400'}`}>
                  Images, PDFs, Documents · Max 10MB
                </p>
              </div>
            </div>

            {/* Uploaded Attachments Grid (prominent, immediately below the drop zone, never covered) */}
            {attachments.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <div className={`text-[10px] font-bold uppercase tracking-wider ${isLight ? 'text-zinc-500' : 'text-slate-400'}`}>
                  Uploaded Attachments ({attachments.length})
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                  {attachments.map((att) => (
                    <div
                      key={att.id}
                      className={`group relative rounded-xl border overflow-hidden flex flex-col justify-between p-2 transition ${
                        isLight
                          ? 'bg-zinc-50 border-zinc-200 hover:border-zinc-300'
                          : 'bg-[#0E121A] border-[#1C232E] hover:border-slate-700'
                      }`}
                    >
                      {att.type === 'image' ? (
                        <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-black/50 mb-1.5 border border-slate-800/60">
                          <img
                            src={att.url}
                            alt={att.name}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-full aspect-video rounded-lg bg-indigo-950/20 border border-indigo-500/20 flex flex-col items-center justify-center gap-1 mb-1.5">
                          <FileText className="w-5 h-5 text-indigo-400" />
                          <span className="text-[10px] font-mono text-slate-400 uppercase">
                            {att.name.split('.').pop() || 'DOC'}
                          </span>
                        </div>
                      )}

                      <div className="flex items-center justify-between gap-1 w-full min-w-0">
                        <span className={`text-[11px] font-medium truncate ${isLight ? 'text-zinc-800' : 'text-slate-200'}`} title={att.name}>
                          {att.name}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveAttachment(att.id);
                          }}
                          className="w-5 h-5 rounded-md flex items-center justify-center text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition shrink-0 cursor-pointer"
                          title="Remove attachment"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </form>

        {/* Footer Actions */}
        <div className={`flex items-center justify-end gap-2.5 px-6 py-3.5 border-t shrink-0 ${
          isLight ? 'border-zinc-200 bg-zinc-50' : 'border-[#1C232E] bg-[#12161D]'
        }`}>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
              isLight ? 'text-zinc-600 hover:text-zinc-900 disabled:opacity-50' : 'text-slate-400 hover:text-white disabled:opacity-50'
            }`}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center justify-center gap-2 min-w-[120px] px-5 py-2 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition disabled:opacity-50 disabled:active:scale-100 active:scale-95 cursor-pointer"
          >
            {isSaving ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Saving...
              </>
            ) : noteToEdit ? (
              'Save Changes'
            ) : (
              'Create Note'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
