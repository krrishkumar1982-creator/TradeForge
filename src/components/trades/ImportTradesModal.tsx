import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  X,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  Download,
  Shield,
  Layers,
  ArrowRight,
  RefreshCw,
  Info,
  Check,
  ChevronRight,
  TrendingUp,
  FileText,
  Sparkles,
  Sliders,
  ExternalLink,
  Plus
} from 'lucide-react';
import { useTrading } from '../../context/TradingContext';
import { Trade, MarketType, TradeDirection } from '../../types';
import {
  parseDelimitedText,
  detectColumnMapping,
  processRawRow,
  downloadCsvTemplate,
  ColumnMapping,
  ParsedImportRow,
  SAMPLE_IMPORT_CSV,
  inferMarketFromSymbol
} from '../../lib/tradeImporter';
import { calculateTradeFinancials } from '../../lib/calcEngine';

interface ImportTradesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToTrades?: () => void;
  onNavigateToDashboard?: () => void;
}

type ImportMethod = 'UPLOAD' | 'PASTE';
type ModalStep = 'INPUT' | 'PREVIEW' | 'SUMMARY';

export const ImportTradesModal: React.FC<ImportTradesModalProps> = ({
  isOpen,
  onClose,
  onNavigateToTrades,
  onNavigateToDashboard,
}) => {
  const {
    importTrades,
    addToast,
    accounts,
    propFirmAccounts,
    selectedAccountId,
    trades: existingTrades,
    playbooks,
    addPlaybook,
  } = useTrading();

  const [step, setStep] = useState<ModalStep>('INPUT');
  const [method, setMethod] = useState<ImportMethod>('PASTE');
  const [csvText, setCsvText] = useState('');
  const [fileName, setFileName] = useState('TradeForge_Paste.csv');
  const [isDragOver, setIsDragOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Account Selection (Respects currently active account)
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

  // Parsed Structure & Column Mapping
  const [rawHeaders, setRawHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({
    symbol: null,
    direction: null,
    entryPrice: null,
    exitPrice: null,
    stopLoss: null,
    takeProfit: null,
    quantity: null,
    netPnl: null,
    rMultiple: null,
    setup: null,
    date: null,
    notes: null,
    market: null,
  });

  // Settings & Toggles
  const [showMappingConfig, setShowMappingConfig] = useState(false);
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [globalPreferCalculated, setGlobalPreferCalculated] = useState(true);
  const [autoCreatePlaybooks, setAutoCreatePlaybooks] = useState(false);

  // Excluded row indices
  const [excludedRowIndices, setExcludedRowIndices] = useState<Set<number>>(new Set());
  // Per-row override for using imported PnL
  const [rowPnlOverrides, setRowPnlOverrides] = useState<Record<number, boolean>>({});

  // Summary result state
  const [importedSummary, setImportedSummary] = useState<{
    tradesAdded: number;
    duplicatesSkipped: number;
    errorsSkipped: number;
    totalPnl: number;
    winningTrades: number;
    losingTrades: number;
    winRate: number;
    totalR: number;
    accountName: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Synchronize targetAccountId if selectedAccountId changes while modal is open
  useEffect(() => {
    if (selectedAccountId !== 'all' && accounts.some(a => a.id === selectedAccountId)) {
      setTargetAccountId(selectedAccountId);
    }
  }, [selectedAccountId, accounts]);

  // Handler to parse text input into headers and rows
  const handleParseText = (textToParse: string, customFileName?: string) => {
    const text = textToParse.trim();
    if (!text) {
      addToast('No Data', 'Please provide CSV content or paste text', 'warning');
      return;
    }

    const { headers, rows } = parseDelimitedText(text);
    if (rows.length === 0) {
      addToast('Parse Error', 'No data rows detected in the provided input', 'error');
      return;
    }

    setRawHeaders(headers);
    setRawRows(rows);
    if (customFileName) setFileName(customFileName);

    const detected = detectColumnMapping(headers);
    setMapping(detected);
    setExcludedRowIndices(new Set());
    setRowPnlOverrides({});
    setStep('PREVIEW');
  };

  // Process rows based on mapping and validation logic
  const processedRows: ParsedImportRow[] = useMemo(() => {
    if (rawRows.length === 0) return [];
    return rawRows.map((rawCols, idx) => {
      const row = processRawRow(
        rawCols,
        idx + 1,
        mapping,
        targetAccountId,
        existingTrades,
        playbooks
      );
      // Apply per-row override if specified, otherwise respect global preference
      if (rowPnlOverrides[idx] !== undefined) {
        row.useImportedPnl = rowPnlOverrides[idx];
      } else {
        row.useImportedPnl = !globalPreferCalculated;
      }
      return row;
    });
  }, [rawRows, mapping, targetAccountId, existingTrades, playbooks, rowPnlOverrides, globalPreferCalculated]);

  // Derived metrics for preview
  const previewStats = useMemo(() => {
    const total = processedRows.length;
    let validCount = 0;
    let warningCount = 0;
    let errorCount = 0;
    let duplicateCount = 0;
    let activeTotalPnl = 0;
    let activeWinners = 0;
    let activeLosers = 0;
    let activeTotalR = 0;
    let activeCount = 0;

    processedRows.forEach((row, idx) => {
      if (row.status === 'ERROR') errorCount++;
      if (row.status === 'WARNING') warningCount++;
      if (row.status === 'VALID') validCount++;
      if (row.isDuplicate) duplicateCount++;

      const isExcluded = excludedRowIndices.has(idx);
      const isDupeSkipped = skipDuplicates && row.isDuplicate;
      const isInvalid = row.status === 'ERROR';

      if (!isExcluded && !isDupeSkipped && !isInvalid) {
        activeCount++;
        const pnl = row.useImportedPnl && row.importedNetPnl !== undefined
          ? row.importedNetPnl
          : row.calculatedNetPnl;
        activeTotalPnl += pnl;
        if (pnl > 0) activeWinners++;
        else if (pnl < 0) activeLosers++;

        const r = row.useImportedPnl && row.importedRMultiple !== undefined
          ? row.importedRMultiple
          : (row.calculatedRMultiple ?? 0);
        activeTotalR += r;
      }
    });

    const winRate = activeCount > 0 ? (activeWinners / (activeWinners + activeLosers || 1)) * 100 : 0;

    return {
      total,
      validCount,
      warningCount,
      errorCount,
      duplicateCount,
      activeCount,
      activeTotalPnl: Math.round(activeTotalPnl * 100) / 100,
      activeWinners,
      activeLosers,
      winRate: Math.round(winRate * 10) / 10,
      activeTotalR: Math.round(activeTotalR * 100) / 100,
    };
  }, [processedRows, excludedRowIndices, skipDuplicates]);

  // Execute the real trade import and persistence
  const handleExecuteImport = async () => {
    setIsProcessing(true);
    try {
      const tradesToImport: Array<Omit<Trade, 'id'>> = [];
      let duplicatesSkipped = 0;
      let errorsSkipped = 0;

      for (let i = 0; i < processedRows.length; i++) {
        const row = processedRows[i];
        if (excludedRowIndices.has(i)) continue;

        if (row.status === 'ERROR') {
          errorsSkipped++;
          continue;
        }

        if (skipDuplicates && row.isDuplicate) {
          duplicatesSkipped++;
          continue;
        }

        // Determine PnL and R
        const effectiveNetPnl = row.useImportedPnl && row.importedNetPnl !== undefined
          ? row.importedNetPnl
          : row.calculatedNetPnl;

        const effectiveR = row.useImportedPnl && row.importedRMultiple !== undefined
          ? row.importedRMultiple
          : (row.calculatedRMultiple ?? (effectiveNetPnl > 0 ? 1.5 : -1.0));

        // Setup & Playbook linking
        let finalPlaybookId = row.matchedPlaybookId;
        if (!finalPlaybookId && row.setupName && autoCreatePlaybooks) {
          // Auto-create missing playbook
          addPlaybook({
            name: row.setupName,
            icon: 'TrendingUp',
            color: '#818CF8',
            description: `Imported playbook profile for ${row.setupName}`,
            market: row.market,
            status: 'STANDARD',
            rules: [
              {
                id: `rule-${Date.now()}-1`,
                text: 'Standard entry confirmation checklist',
                category: 'ENTRY',
                required: true,
              },
            ],
            exampleScreenshots: [],
            totalTrades: 0,
            winRate: 0,
            netPnl: 0,
            profitFactor: 0,
            avgWinner: 0,
            avgLoser: 0,
            expectancy: 0,
            missedTradesCount: 0,
            isPrivate: true,
          });
        }

        const tradePayload: Omit<Trade, 'id'> = {
          accountId: targetAccountId || accounts[0]?.id || 'acc-1',
          propFirmAccountId: targetPropFirmAccountId || undefined,
          symbol: row.symbol,
          market: row.market,
          direction: row.direction,
          status: 'CLOSED',
          entryDate: row.entryDate,
          exitDate: row.entryDate,
          entryPrice: row.entryPrice,
          exitPrice: row.exitPrice,
          stopLoss: row.stopLoss,
          takeProfit: row.takeProfit,
          quantity: row.quantity,
          commission: 0, // Commission strictly removed
          swap: 0,
          fees: 0,
          grossPnl: effectiveNetPnl,
          netPnl: effectiveNetPnl,
          rMultiple: effectiveR,
          roiPercent: row.entryPrice > 0 ? parseFloat(((effectiveNetPnl / (row.entryPrice * row.quantity)) * 100).toFixed(2)) : 0,
          session: 'New York',
          setupType: row.setupName || 'Standard Execution',
          playbookId: finalPlaybookId,
          rating: effectiveNetPnl > 0 ? 5 : 3,
          rulesFollowed: effectiveNetPnl >= 0,
          mistakes: [],
          notes: row.notes || `Imported trade execution (${row.symbol} ${row.direction})`,
          tags: ['IMPORT', 'CSV', ...(row.setupName ? [row.setupName] : [])],
          durationMinutes: 30,
          emotionalState: effectiveNetPnl > 0 ? 'Disciplined' : 'Neutral',
          executionMethod: 'MANUAL',
        };

        tradesToImport.push(tradePayload);
      }

      if (tradesToImport.length === 0) {
        addToast('No Valid Trades', 'No valid trades to import after filtering', 'warning');
        setIsProcessing(false);
        return;
      }

      const targetAcc = accounts.find(a => a.id === targetAccountId);
      const accountLabel = targetAcc ? `${targetAcc.name} (${targetAcc.broker})` : 'Primary Trading Account';

      // Persist trades and register audit log
      const importedBatch = await importTrades(tradesToImport, {
        source: 'CSV',
        fileName,
        tradesProcessed: processedRows.length,
        tradesAdded: tradesToImport.length,
        duplicatesCount: duplicatesSkipped,
        errorsCount: errorsSkipped,
        status: errorsSkipped > 0 ? 'PARTIAL' : 'COMPLETED',
        details: {
          account: accountLabel,
          totalPnl: previewStats.activeTotalPnl,
          fileName,
        },
      });

      // Calculate final summary metrics
      let winners = 0;
      let losers = 0;
      let totalPnl = 0;
      let totalR = 0;

      importedBatch.forEach(t => {
        totalPnl += t.netPnl;
        totalR += t.rMultiple || 0;
        if (t.netPnl > 0) winners++;
        else if (t.netPnl < 0) losers++;
      });

      const winRate = importedBatch.length > 0 ? (winners / (winners + losers || 1)) * 100 : 0;

      setImportedSummary({
        tradesAdded: importedBatch.length,
        duplicatesSkipped,
        errorsSkipped,
        totalPnl: Math.round(totalPnl * 100) / 100,
        winningTrades: winners,
        losingTrades: losers,
        winRate: Math.round(winRate * 10) / 10,
        totalR: Math.round(totalR * 100) / 100,
        accountName: accountLabel,
      });

      setStep('SUMMARY');
    } catch (err: any) {
      addToast('Import Failed', err?.message || 'Error occurred while saving trades', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = ev => {
        const content = ev.target?.result as string || '';
        setCsvText(content);
        handleParseText(content, file.name);
      };
      reader.readAsText(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = ev => {
        const content = ev.target?.result as string || '';
        setCsvText(content);
        handleParseText(content, file.name);
      };
      reader.readAsText(file);
    }
  };

  const toggleExcludeRow = (idx: number) => {
    setExcludedRowIndices(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const toggleRowPnlChoice = (idx: number) => {
    setRowPnlOverrides(prev => ({
      ...prev,
      [idx]: !prev[idx],
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xs p-3 sm:p-6 overflow-y-auto animate-in fade-in">
      <div className="w-full max-w-5xl rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#090C10] shadow-2xl flex flex-col max-h-[92vh] overflow-hidden my-auto animate-in zoom-in-95">
        
        {/* MODAL HEADER */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[rgba(255,255,255,0.07)] bg-[#0D1015]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#6366F1]/10 border border-[#6366F1]/20 flex items-center justify-center text-[#818CF8]">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-semibold text-[#F4F5F7] tracking-tight flex items-center gap-2">
                <span>Import Trades</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-[#1E232B] text-[#8A919D] border border-[rgba(255,255,255,0.06)]">
                  Institutional Terminal
                </span>
              </h2>
              <p className="text-xs text-[#8A919D]">
                Ingest CSV files, broker statement exports, or paste tabular trade data directly.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-[#8A919D] hover:text-[#F4F5F7] hover:bg-[#151A21] transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* STEP 1: INPUT WORKFLOW */}
        {step === 'INPUT' && (
          <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar flex-1">
            {/* Account Scope Configuration */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-[#080A0D] border border-[rgba(255,255,255,0.06)]">
              <div>
                <label className="block text-xs font-medium text-[#C2C7D0] mb-1.5 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-[#818CF8]" />
                  <span>Destination Trading Account</span>
                </label>
                <select
                  value={targetAccountId}
                  onChange={e => setTargetAccountId(e.target.value)}
                  className="w-full rounded-xl bg-[#0D1015] border border-[rgba(255,255,255,0.08)] px-3 py-2 text-xs font-medium text-[#F4F5F7] focus:outline-none focus:border-[#6366F1]"
                >
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id} className="bg-[#0D1015] text-[#F4F5F7]">
                      {acc.name} — {acc.broker} (${(acc.currentBalance ?? acc.initialBalance)?.toLocaleString() || '100,000'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#C2C7D0] mb-1.5 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-[#818CF8]" />
                  <span>Link to Prop Firm Account (Optional)</span>
                </label>
                <select
                  value={targetPropFirmAccountId}
                  onChange={e => setTargetPropFirmAccountId(e.target.value)}
                  className="w-full rounded-xl bg-[#0D1015] border border-[rgba(255,255,255,0.08)] px-3 py-2 text-xs font-medium text-[#F4F5F7] focus:outline-none focus:border-[#6366F1]"
                >
                  <option value="" className="bg-[#0D1015] text-[#8A919D]">None (Standard Broker Account)</option>
                  {propFirmAccounts.map(pf => (
                    <option key={pf.id} value={pf.id} className="bg-[#0D1015] text-[#F4F5F7]">
                      {pf.name} ({pf.firmName} — ${pf.accountSize?.toLocaleString() || '100k'})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Import Method Tabs */}
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-[rgba(255,255,255,0.06)]">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setMethod('PASTE')}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-2 ${
                      method === 'PASTE'
                        ? 'bg-[#6366F1] text-white shadow-xs'
                        : 'bg-[#0D1015] text-[#8A919D] hover:text-[#F4F5F7] hover:bg-[#151A21] border border-[rgba(255,255,255,0.06)]'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Paste Tabular CSV</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMethod('UPLOAD')}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-2 ${
                      method === 'UPLOAD'
                        ? 'bg-[#6366F1] text-white shadow-xs'
                        : 'bg-[#0D1015] text-[#8A919D] hover:text-[#F4F5F7] hover:bg-[#151A21] border border-[rgba(255,255,255,0.06)]'
                    }`}
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload CSV File</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setCsvText(SAMPLE_IMPORT_CSV);
                      setFileName('XAUUSD_Integration_Sample.csv');
                      addToast('Sample Loaded', 'Standard 4-trade XAUUSD test dataset populated', 'info');
                    }}
                    className="px-3 py-1.5 rounded-xl bg-[#0D1015] hover:bg-[#151A21] text-[#818CF8] hover:text-[#A5B4FC] text-xs font-medium border border-[rgba(99,102,241,0.25)] transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Use Sample Format</span>
                  </button>

                  <button
                    type="button"
                    onClick={downloadCsvTemplate}
                    className="px-3 py-1.5 rounded-xl bg-[#0D1015] hover:bg-[#151A21] text-[#C2C7D0] hover:text-[#F4F5F7] text-xs font-medium border border-[rgba(255,255,255,0.08)] transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-[#8A919D]" />
                    <span>CSV Template</span>
                  </button>
                </div>
              </div>
            </div>

            {/* PASTE DATA VIEW */}
            {method === 'PASTE' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-[#C2C7D0]">
                    Paste CSV Data Here (Comma, Tab, or Semicolon Separated)
                  </label>
                  {csvText && (
                    <button
                      type="button"
                      onClick={() => setCsvText('')}
                      className="text-[11px] text-[#8A919D] hover:text-rose-400 transition cursor-pointer"
                    >
                      Clear Editor
                    </button>
                  )}
                </div>

                <textarea
                  rows={8}
                  value={csvText}
                  onChange={e => setCsvText(e.target.value)}
                  placeholder={`Symbol,Direction,EntryPrice,ExitPrice,StopLoss,TakeProfit,Quantity,NetPnL,RMultiple,Setup,Date
XAUUSD,BUY,2650.00,2660.00,2645.00,2660.00,1,1000.00,2.00,London Liquidity Sweep,2026-10-01T09:30:00
XAUUSD,SELL,2670.00,2662.50,2675.00,2660.00,1,750.00,1.50,New York Reversal,2026-10-01T14:00:00`}
                  className="w-full rounded-xl bg-[#080A0D] border border-[rgba(255,255,255,0.08)] p-3 text-xs font-mono text-[#F4F5F7] placeholder-[#5E6570] focus:outline-none focus:border-[#6366F1] leading-relaxed custom-scrollbar"
                />

                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#8A919D]">
                  <span className="font-mono">
                    Required: Symbol, Direction, EntryPrice, ExitPrice, Quantity, Date
                  </span>
                  <span>Supports quotes, commas in setup names, ISO timestamps</span>
                </div>
              </div>
            )}

            {/* UPLOAD FILE VIEW */}
            {method === 'UPLOAD' && (
              <div className="space-y-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.txt,.tsv"
                  onChange={handleFileUpload}
                  className="hidden"
                />

                <div
                  onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
                  onDragLeave={() => setIsDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-10 text-center transition cursor-pointer ${
                    isDragOver
                      ? 'border-[#6366F1] bg-[#6366F1]/10'
                      : 'border-[rgba(255,255,255,0.08)] bg-[#080A0D]/80 hover:border-[rgba(255,255,255,0.18)] hover:bg-[#0D1015]'
                  }`}
                >
                  <Upload className="w-10 h-10 text-[#818CF8] mx-auto mb-3 animate-pulse" />
                  <p className="text-sm font-semibold text-[#F4F5F7]">
                    Click to select or drag & drop trade statement file
                  </p>
                  <p className="text-xs text-[#8A919D] mt-1">
                    Supports .CSV, .TXT, .TSV exports from NinjaTrader, Tradovate, MT4/MT5, cTrader, and IBKR
                  </p>
                </div>

                {csvText && (
                  <div className="p-3 rounded-xl bg-[#080A0D] border border-[rgba(255,255,255,0.06)] flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="w-4 h-4 text-[#818CF8]" />
                      <span className="text-xs font-mono text-[#F4F5F7]">{fileName}</span>
                      <span className="text-[11px] text-[#8A919D]">({csvText.length} characters loaded)</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setCsvText(''); setFileName(''); }}
                      className="text-xs text-rose-400 hover:text-rose-300 cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* STEP 2: PREVIEW & VERIFICATION WORKFLOW */}
        {step === 'PREVIEW' && (
          <div className="p-6 space-y-5 overflow-y-auto custom-scrollbar flex-1">
            {/* Top Metrics Banner */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-xl bg-[#0D1015] border border-[rgba(255,255,255,0.06)] space-y-0.5">
                <div className="text-[11px] font-medium text-[#8A919D]">Trades Ready</div>
                <div className="text-lg font-bold font-mono text-[#F4F5F7]">
                  {previewStats.activeCount} <span className="text-xs text-[#8A919D] font-normal">/ {previewStats.total}</span>
                </div>
                <div className="text-[10px] text-emerald-400 font-mono">
                  {previewStats.validCount} valid executions
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#0D1015] border border-[rgba(255,255,255,0.06)] space-y-0.5">
                <div className="text-[11px] font-medium text-[#8A919D]">Est. Batch Net P&L</div>
                <div className={`text-lg font-bold font-mono ${
                  previewStats.activeTotalPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}>
                  {previewStats.activeTotalPnl >= 0 ? '+' : ''}${previewStats.activeTotalPnl.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </div>
                <div className="text-[10px] text-[#8A919D] font-mono">
                  {previewStats.activeWinners}W · {previewStats.activeLosers}L ({previewStats.winRate}%)
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#0D1015] border border-[rgba(255,255,255,0.06)] space-y-0.5">
                <div className="text-[11px] font-medium text-[#8A919D]">Est. Total R</div>
                <div className={`text-lg font-bold font-mono ${
                  previewStats.activeTotalR >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}>
                  {previewStats.activeTotalR >= 0 ? '+' : ''}{previewStats.activeTotalR.toFixed(2)}R
                </div>
                <div className="text-[10px] text-[#8A919D] font-mono">
                  Risk-adjusted return
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#0D1015] border border-[rgba(255,255,255,0.06)] space-y-0.5">
                <div className="text-[11px] font-medium text-[#8A919D]">Integrity Status</div>
                <div className="text-lg font-bold font-mono text-[#818CF8]">
                  {previewStats.duplicateCount > 0 ? `${previewStats.duplicateCount} Dupes` : '100% Unique'}
                </div>
                <div className="text-[10px] text-[#8A919D] font-mono">
                  {previewStats.errorCount > 0 ? `${previewStats.errorCount} errors detected` : 'All rows verified'}
                </div>
              </div>
            </div>

            {/* Controls Bar: Column Mapping & Preferences */}
            <div className="p-3 rounded-xl bg-[#080A0D] border border-[rgba(255,255,255,0.06)] flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex flex-wrap items-center gap-4">
                <button
                  type="button"
                  onClick={() => setShowMappingConfig(!showMappingConfig)}
                  className="px-3 py-1.5 rounded-lg bg-[#0D1015] hover:bg-[#151A21] text-[#C2C7D0] border border-[rgba(255,255,255,0.08)] flex items-center gap-1.5 transition cursor-pointer font-medium"
                >
                  <Sliders className="w-3.5 h-3.5 text-[#818CF8]" />
                  <span>{showMappingConfig ? 'Hide Column Mappings' : 'View / Adjust Column Mappings'}</span>
                </button>

                <label className="flex items-center gap-2 cursor-pointer select-none text-[#C2C7D0]">
                  <input
                    type="checkbox"
                    checked={skipDuplicates}
                    onChange={e => setSkipDuplicates(e.target.checked)}
                    className="rounded bg-[#0D1015] border-[rgba(255,255,255,0.15)] text-[#6366F1] focus:ring-0"
                  />
                  <span>Skip duplicate trades automatically</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer select-none text-[#C2C7D0]">
                  <input
                    type="checkbox"
                    checked={globalPreferCalculated}
                    onChange={e => setGlobalPreferCalculated(e.target.checked)}
                    className="rounded bg-[#0D1015] border-[rgba(255,255,255,0.15)] text-[#6366F1] focus:ring-0"
                  />
                  <span title="Uses TradeForge central calculation engine for deterministic multiplier accuracy">
                    Use calculated instrument P&L as source of truth
                  </span>
                </label>
              </div>

              <div className="text-[11px] text-[#8A919D] font-mono">
                {fileName}
              </div>
            </div>

            {/* Optional Collapsible Column Mapping View */}
            {showMappingConfig && (
              <div className="p-4 rounded-xl bg-[#0D1015] border border-[rgba(99,102,241,0.25)] space-y-3 animate-in fade-in">
                <div className="text-xs font-semibold text-[#F4F5F7] flex items-center gap-2">
                  <Sliders className="w-3.5 h-3.5 text-[#818CF8]" />
                  <span>Column Field Mapping Matrix</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  {(['symbol', 'direction', 'entryPrice', 'exitPrice', 'stopLoss', 'takeProfit', 'quantity', 'netPnl', 'rMultiple', 'setup', 'date'] as const).map(colKey => (
                    <div key={colKey}>
                      <label className="block text-[10px] uppercase font-mono text-[#8A919D] mb-1">
                        {colKey.replace(/([A-Z])/g, ' $1')}
                      </label>
                      <select
                        value={mapping[colKey] !== null ? String(mapping[colKey]) : ''}
                        onChange={e => {
                          const val = e.target.value === '' ? null : parseInt(e.target.value);
                          setMapping(prev => ({ ...prev, [colKey]: val }));
                        }}
                        className="w-full bg-[#080A0D] border border-[rgba(255,255,255,0.08)] rounded-lg px-2 py-1 text-[11px] text-[#F4F5F7] focus:outline-none focus:border-[#6366F1]"
                      >
                        <option value="">-- Not Mapped --</option>
                        {rawHeaders.map((h, hIdx) => (
                          <option key={hIdx} value={String(hIdx)}>
                            {h} (Col {hIdx + 1})
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* PREVIEW TABLE */}
            <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#080A0D] overflow-hidden">
              <div className="overflow-x-auto max-h-[340px] custom-scrollbar">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-[#0D1015] text-[#8A919D] font-mono text-[10px] uppercase tracking-wider sticky top-0 z-10 border-b border-[rgba(255,255,255,0.06)]">
                    <tr>
                      <th className="py-2.5 px-3 w-10 text-center">#</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Symbol</th>
                      <th className="py-2.5 px-3">Side</th>
                      <th className="py-2.5 px-3 text-right">Entry</th>
                      <th className="py-2.5 px-3 text-right">Exit</th>
                      <th className="py-2.5 px-3 text-right">SL / TP</th>
                      <th className="py-2.5 px-3 text-center">Qty</th>
                      <th className="py-2.5 px-3 text-right">Net P&L</th>
                      <th className="py-2.5 px-3 text-right">R-Mult</th>
                      <th className="py-2.5 px-3">Setup</th>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3 text-center">Include</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[rgba(255,255,255,0.03)] font-mono text-[11px]">
                    {processedRows.map((row, idx) => {
                      const isExcluded = excludedRowIndices.has(idx);
                      const isDupeSkipped = skipDuplicates && row.isDuplicate;

                      return (
                        <tr
                          key={idx}
                          className={`transition ${
                            isExcluded || isDupeSkipped
                              ? 'opacity-40 bg-[#080A0D]'
                              : row.status === 'ERROR'
                              ? 'bg-rose-950/10 hover:bg-rose-950/20'
                              : 'hover:bg-[#11151A]'
                          }`}
                        >
                          <td className="py-2.5 px-3 text-center text-[#5E6570]">
                            {row.rowNumber}
                          </td>

                          {/* Status Badge */}
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            {row.status === 'ERROR' ? (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
                                ✕ {row.errors[0]}
                              </span>
                            ) : row.isDuplicate ? (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                                ⚠ Duplicate
                              </span>
                            ) : row.pnlStatus === 'MISMATCH' ? (
                              <span
                                title={`Imported: $${row.importedNetPnl} | Calc: $${row.calculatedNetPnl}`}
                                className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30"
                              >
                                ⚠ P&L Mismatch
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                                ✓ Verified
                              </span>
                            )}
                          </td>

                          {/* Symbol */}
                          <td className="py-2.5 px-3 font-bold text-[#F4F5F7] whitespace-nowrap">
                            {row.symbol}
                          </td>

                          {/* Direction */}
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              row.direction === 'BUY'
                                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                            }`}>
                              {row.direction}
                            </span>
                          </td>

                          {/* Entry */}
                          <td className="py-2.5 px-3 text-right text-[#C2C7D0]">
                            {row.entryPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </td>

                          {/* Exit */}
                          <td className="py-2.5 px-3 text-right text-[#C2C7D0]">
                            {row.exitPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </td>

                          {/* SL / TP */}
                          <td className="py-2.5 px-3 text-right text-[#8A919D] whitespace-nowrap">
                            {row.stopLoss !== undefined ? `${row.stopLoss}` : '—'} / {row.takeProfit !== undefined ? `${row.takeProfit}` : '—'}
                          </td>

                          {/* Quantity */}
                          <td className="py-2.5 px-3 text-center text-[#C2C7D0]">
                            {row.quantity}
                          </td>

                          {/* Net P&L */}
                          <td className="py-2.5 px-3 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              <span className={`font-bold ${
                                (row.useImportedPnl ? (row.importedNetPnl ?? row.calculatedNetPnl) : row.calculatedNetPnl) >= 0
                                  ? 'text-emerald-400'
                                  : 'text-rose-400'
                              }`}>
                                {(row.useImportedPnl ? (row.importedNetPnl ?? row.calculatedNetPnl) : row.calculatedNetPnl) >= 0 ? '+' : ''}
                                ${(row.useImportedPnl ? (row.importedNetPnl ?? row.calculatedNetPnl) : row.calculatedNetPnl).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                              </span>

                              {row.pnlStatus === 'MISMATCH' && (
                                <button
                                  type="button"
                                  onClick={() => toggleRowPnlChoice(idx)}
                                  className="text-[9px] px-1 py-0.5 rounded bg-[#151A21] text-[#818CF8] hover:bg-[#1E232B] transition cursor-pointer"
                                  title={row.useImportedPnl ? 'Switch to Calculated P&L' : 'Switch to Imported CSV P&L'}
                                >
                                  {row.useImportedPnl ? 'Using Imp' : 'Using Calc'}
                                </button>
                              )}
                            </div>
                          </td>

                          {/* R Multiple */}
                          <td className="py-2.5 px-3 text-right whitespace-nowrap">
                            <span className={
                              (row.useImportedPnl ? (row.importedRMultiple ?? (row.calculatedRMultiple ?? 0)) : (row.calculatedRMultiple ?? 0)) >= 0
                                ? 'text-emerald-400 font-medium'
                                : 'text-rose-400 font-medium'
                            }>
                              {(row.useImportedPnl ? (row.importedRMultiple ?? (row.calculatedRMultiple ?? 0)) : (row.calculatedRMultiple ?? 0)) >= 0 ? '+' : ''}
                              {(row.useImportedPnl ? (row.importedRMultiple ?? (row.calculatedRMultiple ?? 0)) : (row.calculatedRMultiple ?? 0)).toFixed(2)}R
                            </span>
                          </td>

                          {/* Setup */}
                          <td className="py-2.5 px-3 text-[#A7ADB7] font-sans text-xs whitespace-nowrap max-w-[140px] truncate">
                            {row.setupName ? (
                              <span className="flex items-center gap-1">
                                <span>{row.setupName}</span>
                                {row.matchedPlaybookId && (
                                  <span className="w-1.5 h-1.5 rounded-full bg-[#818CF8]" title="Matched to existing Playbook" />
                                )}
                              </span>
                            ) : (
                              <span className="text-[#5E6570]">—</span>
                            )}
                          </td>

                          {/* Date */}
                          <td className="py-2.5 px-3 text-[#8A919D] whitespace-nowrap text-[10px]">
                            {row.entryDate.slice(0, 10)} {row.entryDate.slice(11, 16)}
                          </td>

                          {/* Include Checkbox */}
                          <td className="py-2.5 px-3 text-center">
                            <input
                              type="checkbox"
                              checked={!isExcluded && !(skipDuplicates && row.isDuplicate)}
                              onChange={() => toggleExcludeRow(idx)}
                              disabled={row.status === 'ERROR'}
                              className="rounded bg-[#0D1015] border-[rgba(255,255,255,0.15)] text-[#6366F1] focus:ring-0 cursor-pointer disabled:opacity-30"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: IMPORT COMPLETE SUMMARY */}
        {step === 'SUMMARY' && importedSummary && (
          <div className="p-8 space-y-6 overflow-y-auto custom-scrollbar flex-1 text-center max-w-2xl mx-auto">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
              <Check className="w-7 h-7" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-[#F4F5F7]">Import Completed Successfully</h3>
              <p className="text-xs text-[#8A919D] mt-1">
                All valid trades have been calculated, verified, and saved to {importedSummary.accountName}.
              </p>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-left">
              <div className="p-4 rounded-xl bg-[#0D1015] border border-[rgba(255,255,255,0.06)] space-y-1">
                <div className="text-[11px] text-[#8A919D]">Trades Added</div>
                <div className="text-xl font-bold font-mono text-[#F4F5F7]">{importedSummary.tradesAdded}</div>
                <div className="text-[10px] text-emerald-400 font-mono">0 errors</div>
              </div>

              <div className="p-4 rounded-xl bg-[#0D1015] border border-[rgba(255,255,255,0.06)] space-y-1">
                <div className="text-[11px] text-[#8A919D]">Total Net P&L</div>
                <div className={`text-xl font-bold font-mono ${
                  importedSummary.totalPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}>
                  {importedSummary.totalPnl >= 0 ? '+' : ''}${importedSummary.totalPnl.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </div>
                <div className="text-[10px] text-[#8A919D] font-mono">Verified math</div>
              </div>

              <div className="p-4 rounded-xl bg-[#0D1015] border border-[rgba(255,255,255,0.06)] space-y-1">
                <div className="text-[11px] text-[#8A919D]">Win Rate</div>
                <div className="text-xl font-bold font-mono text-[#F4F5F7]">
                  {importedSummary.winRate}%
                </div>
                <div className="text-[10px] text-[#8A919D] font-mono">
                  {importedSummary.winningTrades}W · {importedSummary.losingTrades}L
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[#0D1015] border border-[rgba(255,255,255,0.06)] space-y-1">
                <div className="text-[11px] text-[#8A919D]">Total R Return</div>
                <div className={`text-xl font-bold font-mono ${
                  importedSummary.totalR >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}>
                  {importedSummary.totalR >= 0 ? '+' : ''}{importedSummary.totalR.toFixed(2)}R
                </div>
                <div className="text-[10px] text-[#8A919D] font-mono">Risk multiple</div>
              </div>
            </div>

            {/* Duplicates & Audit notice */}
            {importedSummary.duplicatesSkipped > 0 && (
              <div className="p-3 rounded-xl bg-[#080A0D] border border-amber-500/20 text-xs text-amber-400 flex items-center justify-center gap-2">
                <Info className="w-4 h-4" />
                <span>{importedSummary.duplicatesSkipped} duplicate trades were detected and safely skipped.</span>
              </div>
            )}
          </div>
        )}

        {/* MODAL FOOTER */}
        <div className="px-6 py-4 border-t border-[rgba(255,255,255,0.06)] bg-[#0D1015] flex flex-wrap items-center justify-between gap-3">
          {step === 'INPUT' && (
            <>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-[#11151A] hover:bg-[#151A21] text-xs font-medium text-[#C2C7D0] border border-[rgba(255,255,255,0.08)] transition cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => handleParseText(csvText)}
                disabled={!csvText.trim()}
                className="px-5 py-2 rounded-xl bg-[#6366F1] hover:bg-[#4F46E5] text-white text-xs font-semibold shadow-xs transition flex items-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <span>Validate & Preview Data</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </>
          )}

          {step === 'PREVIEW' && (
            <>
              <button
                type="button"
                onClick={() => setStep('INPUT')}
                className="px-4 py-2 rounded-xl bg-[#11151A] hover:bg-[#151A21] text-xs font-medium text-[#C2C7D0] border border-[rgba(255,255,255,0.08)] transition cursor-pointer"
              >
                Back to Edit Data
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-[#11151A] hover:bg-[#151A21] text-xs font-medium text-[#C2C7D0] border border-[rgba(255,255,255,0.08)] transition cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleExecuteImport}
                  disabled={previewStats.activeCount === 0 || isProcessing}
                  className="px-6 py-2 rounded-xl bg-[#6366F1] hover:bg-[#4F46E5] text-white text-xs font-semibold shadow-xs transition flex items-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving to Database...</span>
                    </>
                  ) : (
                    <>
                      <span>Confirm & Import {previewStats.activeCount} Trades</span>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </>
          )}

          {step === 'SUMMARY' && (
            <div className="w-full flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  setStep('INPUT');
                  setCsvText('');
                }}
                className="px-4 py-2 rounded-xl bg-[#11151A] hover:bg-[#151A21] text-xs font-medium text-[#C2C7D0] border border-[rgba(255,255,255,0.08)] transition cursor-pointer"
              >
                Import Another Batch
              </button>

              <div className="flex items-center gap-2">
                {onNavigateToTrades && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onNavigateToTrades();
                    }}
                    className="px-4 py-2 rounded-xl bg-[#11151A] hover:bg-[#151A21] text-xs font-medium text-[#C2C7D0] border border-[rgba(255,255,255,0.08)] transition cursor-pointer"
                  >
                    View in Trades Log
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    if (onNavigateToDashboard) onNavigateToDashboard();
                  }}
                  className="px-6 py-2 rounded-xl bg-[#6366F1] hover:bg-[#4F46E5] text-white text-xs font-semibold shadow-xs transition cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
