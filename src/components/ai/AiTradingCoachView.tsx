import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Bot,
  Sparkles,
  Send,
  User,
  Zap,
  TrendingUp,
  TrendingDown,
  Brain,
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  FileText,
  Activity,
  Layers,
  Target,
  AlertTriangle,
  RefreshCw,
  Trash2,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Calendar,
  Database,
  BarChart3,
  Cpu,
  ChevronRight,
  Check,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useTrading } from '../../context/TradingContext';
import {
  askTradeForgeIntelligence,
  TradeForgeIntelligenceResult,
  ReferencedTradeSummary,
} from '../../services/geminiAi';
import { Trade } from '../../types';

interface ChatMessage {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  timestamp: string;
  result?: TradeForgeIntelligenceResult;
}

export const AiTradingCoachView: React.FC = () => {
  const {
    trades,
    filteredTrades,
    playbooks,
    strategies,
    notes,
    accounts,
    propFirmAccounts,
    selectedAccountId,
    selectedPropFirmAccountId,
    setSelectedAccountId,
    setSelectedPropFirmAccountId,
    formatCurrency,
    setSelectedTrade,
  } = useTrading();

  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState<string>('Initializing...');
  const [dateScope, setDateScope] = useState<'ALL' | '30D' | '7D' | 'MONTH'>('ALL');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Determine active trades based on date scope
  const activeTrades = useMemo(() => {
    const base = filteredTrades && filteredTrades.length > 0 ? filteredTrades : trades;
    if (dateScope === 'ALL') return base;

    const now = new Date();
    if (dateScope === '7D') {
      const cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return base.filter((t) => new Date(t.entryDate) >= cutoff);
    }
    if (dateScope === '30D') {
      const cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      return base.filter((t) => new Date(t.entryDate) >= cutoff);
    }
    if (dateScope === 'MONTH') {
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();
      return base.filter((t) => {
        const d = new Date(t.entryDate);
        return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
      });
    }
    return base;
  }, [trades, filteredTrades, dateScope]);

  // Deterministic live summary calculations for the right panel
  const liveSummary = useMemo(() => {
    const closed = activeTrades.filter((t) => t.status === 'CLOSED');
    const totalTrades = closed.length;
    const wins = closed.filter((t) => t.netPnl > 0);
    const losses = closed.filter((t) => t.netPnl < 0);
    const winCount = wins.length;
    const lossCount = losses.length;
    const winRate = totalTrades > 0 ? (winCount / totalTrades) * 100 : 0;
    const netPnl = closed.reduce((sum, t) => sum + t.netPnl, 0);
    const grossProfit = wins.reduce((sum, t) => sum + t.netPnl, 0);
    const grossLoss = Math.abs(losses.reduce((sum, t) => sum + t.netPnl, 0));
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 99.9 : 0;
    const avgWin = winCount > 0 ? grossProfit / winCount : 0;
    const avgLoss = lossCount > 0 ? grossLoss / lossCount : 0;
    const payoffRatio = avgLoss > 0 ? avgWin / avgLoss : 0;
    const expectancy = totalTrades > 0 ? netPnl / totalTrades : 0;

    const rValues = closed.map((t) => t.rMultiple).filter((r): r is number => typeof r === 'number' && !isNaN(r));
    const avgR = rValues.length > 0 ? rValues.reduce((a, b) => a + b, 0) / rValues.length : 0;

    // Peak to trough drawdown
    let peak = 0;
    let running = 0;
    let maxDd = 0;
    const sorted = [...closed].sort((a, b) => new Date(a.entryDate).getTime() - new Date(b.entryDate).getTime());
    for (const t of sorted) {
      running += t.netPnl;
      if (running > peak) peak = running;
      const dd = peak - running;
      if (dd > maxDd) maxDd = dd;
    }

    // Top mistake
    const mistakeMap: Record<string, { count: number; loss: number }> = {};
    closed.forEach((t) => {
      if (t.mistakes && t.mistakes.length > 0) {
        t.mistakes.forEach((m) => {
          if (!mistakeMap[m]) mistakeMap[m] = { count: 0, loss: 0 };
          mistakeMap[m].count += 1;
          if (t.netPnl < 0) mistakeMap[m].loss += Math.abs(t.netPnl);
        });
      }
    });
    const mistakeList = Object.entries(mistakeMap).map(([name, data]) => ({ name, ...data }));
    mistakeList.sort((a, b) => b.loss - a.loss);
    const topMistake = mistakeList[0];

    // Top setup
    const setupMap: Record<string, { count: number; pnl: number; wins: number }> = {};
    closed.forEach((t) => {
      const s = t.setupType || 'Discretionary';
      if (!setupMap[s]) setupMap[s] = { count: 0, pnl: 0, wins: 0 };
      setupMap[s].count += 1;
      setupMap[s].pnl += t.netPnl;
      if (t.netPnl > 0) setupMap[s].wins += 1;
    });
    const setupList = Object.entries(setupMap).map(([name, data]) => ({
      name,
      ...data,
      winRate: data.count > 0 ? (data.wins / data.count) * 100 : 0,
    }));
    setupList.sort((a, b) => b.pnl - a.pnl);
    const bestSetup = setupList[0];

    // Current active account
    const activeAccount = accounts.find((a) => a.id === selectedAccountId);
    const activePropFirm = propFirmAccounts.find((a) => a.id === selectedPropFirmAccountId);

    return {
      totalTrades,
      winRate,
      netPnl,
      profitFactor,
      expectancy,
      avgWin,
      avgLoss,
      payoffRatio,
      avgR,
      maxDd,
      topMistake,
      bestSetup,
      activeAccount,
      activePropFirm,
      accountName: activeAccount?.name || activePropFirm?.name || 'All Accounts (Aggregated)',
    };
  }, [activeTrades, accounts, propFirmAccounts, selectedAccountId, selectedPropFirmAccountId]);

  // Initial welcome message
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          id: 'welcome-1',
          sender: 'ai',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          text: `TradeForge Intelligence analysis engine is online and connected to your active database.

I have loaded **${activeTrades.length} recorded executions**, **${notes.length} journal notes**, and **${playbooks.length} active playbooks** across **${liveSummary.accountName}**.

Ask any specific question about your trading performance, execution leaks, prop-firm rules compliance, or setup expectancies.`,
        },
      ]);
    }
  }, [activeTrades.length, notes.length, playbooks.length, liveSummary.accountName]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || isLoading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput('');
    setIsLoading(true);
    setLoadingStage('Querying TradeForge data engine...');

    const stageTimer1 = setTimeout(() => {
      setLoadingStage('Calculating deterministic metrics & risk buffers...');
    }, 600);

    const stageTimer2 = setTimeout(() => {
      setLoadingStage('Reasoning over executions with Gemini Intelligence...');
    }, 1400);

    try {
      const conversationHistory = updatedMessages.map((m) => ({
        sender: m.sender,
        text: m.text,
      }));

      const result = await askTradeForgeIntelligence(
        query,
        activeTrades,
        playbooks,
        conversationHistory,
        selectedAccountId || undefined,
        selectedPropFirmAccountId || undefined
      );

      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: result.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        result,
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `ai-err-${Date.now()}`,
          sender: 'ai',
          text: `⚠️ **Diagnostic Engine Notice**: Unable to complete query processing. Gemini engine is temporarily unavailable, but your TradeForge trading data remains fully intact and secured.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      clearTimeout(stageTimer1);
      clearTimeout(stageTimer2);
      setIsLoading(false);
    }
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        sender: 'ai',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: `Workspace refreshed. Ready for a new quantitative audit across **${activeTrades.length} trades** in **${liveSummary.accountName}**. What would you like to examine?`,
      },
    ]);
  };

  const handleTradeClick = (refTrade: ReferencedTradeSummary) => {
    const fullTrade = trades.find((t) => t.id === refTrade.id);
    if (fullTrade) {
      setSelectedTrade(fullTrade);
    } else {
      const syntheticTrade: Trade = {
        id: refTrade.id,
        accountId: selectedAccountId || 'default',
        symbol: refTrade.symbol,
        direction: (refTrade.direction === 'SELL' || refTrade.direction === 'SHORT' ? 'SELL' : 'BUY'),
        market: 'Futures',
        entryPrice: refTrade.entryPrice,
        exitPrice: refTrade.exitPrice ?? refTrade.entryPrice,
        quantity: 1,
        netPnl: refTrade.netPnl,
        grossPnl: refTrade.netPnl,
        commission: 0,
        swap: 0,
        fees: 0,
        rMultiple: refTrade.rMultiple ?? 0,
        roiPercent: 0,
        rating: 4,
        notes: '',
        tags: [],
        rulesFollowed: true,
        durationMinutes: refTrade.durationMinutes ?? 15,
        entryDate: refTrade.entryDate,
        exitDate: refTrade.entryDate,
        status: 'CLOSED',
        session: (refTrade.session as any) || 'New York',
        setupType: refTrade.setupType || 'Setup',
        mistakes: refTrade.mistakes || [],
      };
      setSelectedTrade(syntheticTrade);
    }
  };

  const quickPrompts = [
    { label: 'Diagnose my current drawdown', icon: AlertTriangle },
    { label: 'Find my biggest performance leak', icon: TrendingDown },
    { label: 'Compare London vs New York session', icon: Clock },
    { label: 'Which setup has the highest expectancy?', icon: Target },
    { label: 'Analyze my last 20 trades', icon: BarChart3 },
    { label: 'Prop firm rule compliance status', icon: ShieldCheck },
  ];

  return (
    <div id="tradeforge-intelligence-page" className="p-4 sm:p-6 lg:p-7 space-y-5 max-w-[1680px] mx-auto min-h-screen text-slate-100">
      {/* Institutional Header Bar */}
      <div id="intelligence-header" className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#1C232E]">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[#12161D] border border-[#1C232E] text-emerald-400 shadow-inner">
              <Cpu className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl font-bold tracking-tight text-white font-mono">
                  TRADEFORGE INTELLIGENCE
                </h1>
                <span className="flex items-center gap-1.5 text-[10px] font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Gemini 3.8 Flash Online
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Institutional Quant Research Terminal & Real-Time Performance Auditor
              </p>
            </div>
          </div>
        </div>

        {/* Global Scope Controls */}
        <div id="intelligence-scope-bar" className="flex flex-wrap items-center gap-2.5 text-xs">
          {/* Account Selector */}
          <div className="flex items-center bg-[#12161D] border border-[#1C232E] rounded-xl px-3 py-1.5 gap-2 shadow-sm">
            <Layers className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedAccountId || 'all'}
              onChange={(e) => {
                setSelectedAccountId(e.target.value || 'all');
                setSelectedPropFirmAccountId('');
              }}
              className="bg-transparent text-slate-200 focus:outline-none cursor-pointer text-xs font-medium"
            >
              <option value="all" className="bg-[#12161D] text-slate-200">
                All Accounts (Aggregated)
              </option>
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id} className="bg-[#12161D] text-slate-200">
                  {acc.name} (${acc.currentBalance.toLocaleString()})
                </option>
              ))}
              {propFirmAccounts.map((pAcc) => (
                <option key={pAcc.id} value={pAcc.id} className="bg-[#12161D] text-slate-200">
                  [Prop] {pAcc.name} (${pAcc.accountSize.toLocaleString()})
                </option>
              ))}
            </select>
          </div>

          {/* Date Scope Filter */}
          <div className="flex items-center bg-[#12161D] border border-[#1C232E] rounded-xl p-1 gap-1 shadow-sm">
            {(['ALL', '30D', '7D', 'MONTH'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setDateScope(s)}
                className={`px-2.5 py-1 rounded-lg font-medium text-[11px] transition cursor-pointer ${
                  dateScope === s
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/25'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {s === 'ALL' ? 'All Time' : s === '30D' ? '30 Days' : s === '7D' ? '7 Days' : 'This Month'}
              </button>
            ))}
          </div>

          {/* Dataset Evidence Pill */}
          <div className="flex items-center gap-1.5 bg-[#12161D] border border-[#1C232E] text-slate-300 rounded-xl px-3 py-1.5 font-mono text-[11px]">
            <Database className="w-3.5 h-3.5 text-slate-400" />
            <span>{activeTrades.length} Trades</span>
            <span className="text-slate-600">•</span>
            <span>{notes.length} Journals</span>
          </div>
        </div>
      </div>

      {/* Main Terminal Grid: 2 Columns */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
        {/* LEFT / CENTER: Conversational Intelligence Terminal (8 Cols) */}
        <div className="xl:col-span-8 flex flex-col space-y-4">
          {/* Quick Command Chips */}
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-emerald-400" /> Quick Audits:
            </span>
            {quickPrompts.map((p) => {
              const IconComp = p.icon;
              return (
                <button
                  key={p.label}
                  onClick={() => handleSendMessage(p.label)}
                  className="text-xs bg-[#12161D] hover:bg-[#1A1F27] hover:border-[#1C232E] text-slate-300 border border-[#1C232E] px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 shadow-sm active:scale-95"
                >
                  <IconComp className="w-3.5 h-3.5 text-slate-400" />
                  <span>{p.label}</span>
                </button>
              );
            })}
          </div>

          {/* Conversation Terminal Box */}
          <div
            id="intelligence-conversation-container"
            className="rounded-2xl border border-[#1C232E] bg-[#12161D] shadow-2xl flex flex-col h-[650px] overflow-hidden backdrop-blur-md"
          >
            {/* Terminal Header */}
            <div className="px-5 py-3 border-b border-[#1C232E] bg-[#0A0D14] flex items-center justify-between text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="font-mono text-slate-300 font-semibold">TERMINAL SESSION // {liveSummary.accountName}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleClearChat}
                  title="Clear conversation"
                  className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-rose-400 transition px-2 py-1 rounded-lg hover:bg-[#12161D] border border-transparent hover:border-[#1C232E]"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>New Analysis</span>
                </button>
              </div>
            </div>

            {/* Message Stream */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5 custom-scrollbar">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex items-start gap-3.5 ${
                    msg.sender === 'user' ? 'flex-row-reverse' : ''
                  }`}
                >
                  {/* Avatar */}
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${
                      msg.sender === 'ai'
                        ? 'bg-[#12161D] text-emerald-400 border-[#1C232E] shadow-sm'
                        : 'bg-[#1A1F27] text-slate-200 border-[#1C232E]'
                    }`}
                  >
                    {msg.sender === 'ai' ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                  </div>

                  {/* Message Card */}
                  <div
                    className={`max-w-3xl rounded-2xl p-4 text-xs leading-relaxed ${
                      msg.sender === 'user'
                        ? 'bg-[#1A1F27] border border-[#1C232E] text-slate-100 shadow-md ml-auto'
                        : 'bg-[#12161D] border border-[#1C232E] text-slate-200 shadow-lg space-y-3.5 w-full'
                    }`}
                  >
                    {/* AI Message Meta Header */}
                    {msg.sender === 'ai' && (
                      <div className="flex items-center justify-between border-b border-[#1C232E] pb-2.5 text-[11px] text-slate-400">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-200">TradeForge Intelligence</span>
                          {msg.result?.sampleSizeTier && (
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold ${
                                msg.result.sampleSizeTier === 'STRONG'
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                  : msg.result.sampleSizeTier === 'MODERATE'
                                  ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                  : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              }`}
                            >
                              {msg.result.sampleSizeTier} SAMPLE
                            </span>
                          )}
                        </div>
                        <span className="font-mono text-slate-500">{msg.timestamp}</span>
                      </div>
                    )}

                    {/* Executive Summary Callout if available */}
                    {msg.result?.summary && (
                      <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-3 text-slate-300">
                        <div className="text-[10px] uppercase font-mono font-bold text-emerald-400 tracking-wider mb-1 flex items-center gap-1.5">
                          <Activity className="w-3 h-3" /> Executive Summary
                        </div>
                        <div className="font-medium text-slate-200">{msg.result.summary}</div>
                      </div>
                    )}

                    {/* Deterministic Key Metric Grid */}
                    {msg.result?.deterministicSummary && (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-[#0A0D14] p-3 rounded-xl border border-[#1C232E]">
                        <div>
                          <div className="text-[10px] text-slate-400 uppercase font-mono">Net P&L</div>
                          <div
                            className={`font-mono font-bold text-sm ${
                              msg.result.deterministicSummary.netPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                          >
                            {msg.result.deterministicSummary.netPnl >= 0 ? '+' : ''}$
                            {msg.result.deterministicSummary.netPnl.toLocaleString()}
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] text-slate-400 uppercase font-mono">Win Rate</div>
                          <div className="font-mono font-bold text-sm text-slate-100">
                            {msg.result.deterministicSummary.winRate.toFixed(1)}%
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] text-slate-400 uppercase font-mono">Expectancy</div>
                          <div
                            className={`font-mono font-bold text-sm ${
                              msg.result.deterministicSummary.expectancy >= 0 ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                          >
                            ${msg.result.deterministicSummary.expectancy.toFixed(2)}/t
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] text-slate-400 uppercase font-mono">Profit Factor</div>
                          <div className="font-mono font-bold text-sm text-slate-100">
                            {msg.result.deterministicSummary.profitFactor?.toFixed(2) ?? 'N/A'}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Primary Performance Leak Callout */}
                    {msg.result?.primaryLeak && (
                      <div className="bg-rose-500/5 border border-rose-500/20 rounded-xl p-3">
                        <div className="text-[10px] uppercase font-mono font-bold text-rose-400 tracking-wider mb-1 flex items-center gap-1.5">
                          <AlertTriangle className="w-3 h-3" /> Primary Capital Leak: {msg.result.primaryLeak.name}
                        </div>
                        <div className="text-slate-300 text-xs">
                          Identified in <strong>{msg.result.primaryLeak.occurrences} trades</strong> costing an estimated{' '}
                          <span className="text-rose-400 font-mono font-semibold">
                            -${msg.result.primaryLeak.impactDollars.toLocaleString()}
                          </span>
                          .
                        </div>
                        <div className="text-[11px] text-slate-400 mt-1 italic">
                          "{msg.result.primaryLeak.recommendation}"
                        </div>
                      </div>
                    )}

                    {/* Main Markdown Body */}
                    <div className="markdown-body prose prose-invert prose-xs max-w-none text-slate-200 leading-relaxed">
                      <ReactMarkdown>{msg.text}</ReactMarkdown>
                    </div>

                    {/* Referenced Trades Section (Clickable to open TradeDetailDrawer!) */}
                    {msg.result?.referencedTrades && msg.result.referencedTrades.length > 0 && (
                      <div className="space-y-2 pt-2 border-t border-[#1C232E]">
                        <div className="text-[11px] font-mono font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <Database className="w-3.5 h-3.5 text-slate-400" /> Referenced Executions (Click to Inspect)
                          </span>
                          <span className="text-[10px] text-slate-500 font-normal">
                            {msg.result.referencedTrades.length} trades
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {msg.result.referencedTrades.map((t) => (
                            <button
                              key={t.id}
                              onClick={() => handleTradeClick(t)}
                              className="text-left bg-[#0A0D14] hover:bg-[#12161D] border border-[#1C232E] hover:border-[#1C232E] p-2.5 rounded-xl transition flex items-center justify-between group"
                            >
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-mono font-bold text-slate-100 text-xs">{t.symbol}</span>
                                  <span
                                    className={`text-[9px] font-mono px-1.5 py-0.2 rounded uppercase font-semibold ${
                                      t.direction === 'LONG'
                                        ? 'bg-emerald-500/10 text-emerald-400'
                                        : 'bg-rose-500/10 text-rose-400'
                                    }`}
                                  >
                                    {t.direction}
                                  </span>
                                  <span className="text-[10px] text-slate-500">{t.session}</span>
                                </div>
                                <div className="text-[10px] text-slate-400 flex items-center gap-2">
                                  <span>{t.setupType || 'Discretionary'}</span>
                                  {t.mistakes && t.mistakes.length > 0 && (
                                    <span className="text-rose-400 font-medium">[{t.mistakes[0]}]</span>
                                  )}
                                </div>
                              </div>
                              <div className="text-right">
                                <div
                                  className={`font-mono font-bold text-xs ${
                                    t.netPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
                                  }`}
                                >
                                  {t.netPnl >= 0 ? '+' : ''}${t.netPnl.toLocaleString()}
                                </div>
                                <div className="text-[10px] text-slate-500 font-mono">
                                  {t.rMultiple ? `${t.rMultiple > 0 ? '+' : ''}${t.rMultiple}R` : t.entryDate.slice(0, 10)}
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Actionable Prescriptions */}
                    {msg.result?.actionablePrescriptions && msg.result.actionablePrescriptions.length > 0 && (
                      <div className="bg-[#0A0D14] border border-[#1C232E] rounded-xl p-3 space-y-1.5">
                        <div className="text-[10px] uppercase font-mono font-bold text-slate-300 tracking-wider flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Prescribed Action Plan
                        </div>
                        <ul className="space-y-1 text-slate-300 text-xs">
                          {msg.result.actionablePrescriptions.map((action, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                              <span>{action}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Evidence & Data Sources Bar */}
                    {msg.result?.evidence && (
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#1C232E] text-[10px] text-slate-500 font-mono">
                        <div className="flex items-center gap-1.5">
                          <Database className="w-3 h-3 text-slate-500" />
                          <span>Sources: {msg.result.evidence.sources.join(' • ')}</span>
                        </div>
                        <div>Scope: {msg.result.evidence.accountName}</div>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Real-Time Thinking Stage Indicator */}
              {isLoading && (
                <div className="flex items-start gap-3.5">
                  <div className="w-8 h-8 rounded-xl bg-[#12161D] text-emerald-400 border border-[#1C232E] flex items-center justify-center shrink-0 animate-pulse">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div className="bg-[#12161D] border border-[#1C232E] rounded-2xl p-4 text-xs text-slate-300 shadow-lg space-y-2 w-full max-w-lg">
                    <div className="flex items-center gap-2.5">
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                      </span>
                      <span className="font-mono text-slate-200 font-semibold">{loadingStage}</span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Querying TradeForge trade database, executing deterministic statistical calculations, and generating grounded institutional analysis.
                    </p>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Bar */}
            <div className="p-3.5 border-t border-[#1C232E] bg-[#0A0D14] flex items-center gap-2">
              <input
                id="tradeforge-intelligence-input"
                type="text"
                placeholder="Ask TradeForge Intelligence anything (e.g., 'What caused my losses this week?', 'Compare London vs NY', 'Show worst 5 trades')..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                className="flex-1 rounded-xl bg-[#12161D] border border-[#1C232E] px-4 py-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500/80 focus:ring-1 focus:ring-emerald-500/20 font-sans shadow-inner"
              />
              <button
                id="tradeforge-intelligence-send-btn"
                onClick={() => handleSendMessage()}
                disabled={isLoading || !input.trim()}
                className="px-4 py-3 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-semibold disabled:opacity-40 transition shadow-md shadow-indigo-600/25 border border-indigo-400/30 flex items-center gap-1.5 text-xs shrink-0 cursor-pointer disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4" />
                <span className="hidden sm:inline">Ask AI</span>
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT: Live Performance & Risk Context Panel (4 Cols) */}
        <div className="xl:col-span-4 space-y-4">
          {/* Account Matrix Card */}
          <div className="bg-[#12161D] border border-[#1C232E] rounded-2xl p-4 space-y-3.5 shadow-lg backdrop-blur-sm">
            <div className="flex items-center justify-between border-b border-[#1C232E] pb-2.5">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-emerald-400" />
                <span className="font-mono text-xs font-bold text-slate-200 uppercase tracking-wider">
                  Live Account Context
                </span>
              </div>
              <span className="text-[10px] font-mono text-slate-400">
                {liveSummary.accountName}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#0A0D14] p-2.5 rounded-xl border border-[#1C232E]">
                <div className="text-[10px] text-slate-400 uppercase font-mono">Net P&L ({dateScope})</div>
                <div
                  className={`font-mono font-bold text-sm ${
                    liveSummary.netPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {liveSummary.netPnl >= 0 ? '+' : ''}${liveSummary.netPnl.toLocaleString()}
                </div>
              </div>
              <div className="bg-[#0A0D14] p-2.5 rounded-xl border border-[#1C232E]">
                <div className="text-[10px] text-slate-400 uppercase font-mono">Win Rate</div>
                <div className="font-mono font-bold text-sm text-slate-100">
                  {liveSummary.winRate.toFixed(1)}%
                </div>
              </div>
              <div className="bg-[#0A0D14] p-2.5 rounded-xl border border-[#1C232E]">
                <div className="text-[10px] text-slate-400 uppercase font-mono">Profit Factor</div>
                <div className="font-mono font-bold text-sm text-slate-100">
                  {liveSummary.profitFactor.toFixed(2)}
                </div>
              </div>
              <div className="bg-[#0A0D14] p-2.5 rounded-xl border border-[#1C232E]">
                <div className="text-[10px] text-slate-400 uppercase font-mono">Avg Expectancy</div>
                <div
                  className={`font-mono font-bold text-sm ${
                    liveSummary.expectancy >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  ${liveSummary.expectancy.toFixed(2)}/t
                </div>
              </div>
            </div>
          </div>

          {/* Quantitative Edge Matrix */}
          <div className="bg-[#12161D] border border-[#1C232E] rounded-2xl p-4 space-y-3 shadow-lg backdrop-blur-sm">
            <div className="flex items-center justify-between border-b border-[#1C232E] pb-2.5">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-blue-400" />
                <span className="font-mono text-xs font-bold text-slate-200 uppercase tracking-wider">
                  Quantitative Edge Metrics
                </span>
              </div>
              <span className="text-[10px] font-mono text-slate-400">{activeTrades.length} trades</span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-[#1C232E]">
                <span className="text-slate-400">Average R-Multiple</span>
                <span className="font-mono font-bold text-slate-200">
                  {liveSummary.avgR ? `${liveSummary.avgR > 0 ? '+' : ''}${liveSummary.avgR.toFixed(2)}R` : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-[#1C232E]">
                <span className="text-slate-400">Payoff Ratio (Win/Loss)</span>
                <span className="font-mono font-bold text-slate-200">
                  {liveSummary.payoffRatio > 0 ? `${liveSummary.payoffRatio.toFixed(2)}x` : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-[#1C232E]">
                <span className="text-slate-400">Max Historical Drawdown</span>
                <span className="font-mono font-bold text-rose-400">
                  -${liveSummary.maxDd.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-400">Avg Win / Avg Loss</span>
                <span className="font-mono text-slate-200">
                  <span className="text-emerald-400">+${Math.round(liveSummary.avgWin)}</span> /{' '}
                  <span className="text-rose-400">-${Math.round(liveSummary.avgLoss)}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Behavioral Leak & Best Setup Card */}
          <div className="bg-[#12161D] border border-[#1C232E] rounded-2xl p-4 space-y-3 shadow-lg backdrop-blur-sm">
            <div className="flex items-center justify-between border-b border-[#1C232E] pb-2.5">
              <div className="flex items-center gap-2">
                <Brain className="w-4 h-4 text-amber-400" />
                <span className="font-mono text-xs font-bold text-slate-200 uppercase tracking-wider">
                  Behavior & Playbook Edge
                </span>
              </div>
            </div>

            {/* Top Playbook */}
            <div className="bg-[#0A0D14] p-3 rounded-xl border border-[#1C232E] space-y-1">
              <div className="text-[10px] uppercase font-mono font-semibold text-emerald-400 flex items-center justify-between">
                <span>Top Alpha Setup</span>
                <span>{liveSummary.bestSetup?.winRate.toFixed(1) || 0}% WR</span>
              </div>
              <div className="text-xs font-semibold text-slate-100 flex items-center justify-between">
                <span>{liveSummary.bestSetup?.name || 'Opening Liquidity Sweep'}</span>
                <span className="font-mono text-emerald-400">
                  +${liveSummary.bestSetup?.pnl.toLocaleString() || '0'}
                </span>
              </div>
            </div>

            {/* Top Mistake */}
            {liveSummary.topMistake ? (
              <div className="bg-[#0A0D14] p-3 rounded-xl border border-[#1C232E] space-y-1">
                <div className="text-[10px] uppercase font-mono font-semibold text-rose-400 flex items-center justify-between">
                  <span>Primary Capital Drain</span>
                  <span>{liveSummary.topMistake.count} occurrences</span>
                </div>
                <div className="text-xs font-semibold text-slate-100 flex items-center justify-between">
                  <span>{liveSummary.topMistake.name}</span>
                  <span className="font-mono text-rose-400">
                    -${liveSummary.topMistake.loss.toLocaleString()}
                  </span>
                </div>
              </div>
            ) : (
              <div className="bg-[#0A0D14] p-3 rounded-xl border border-[#1C232E] text-xs text-slate-400">
                No recurring behavioral leaks logged.
              </div>
            )}

            {/* Quick Drilldown Button */}
            <button
              onClick={() => handleSendMessage('Give me a full institutional audit of my trading edge and primary leaks')}
              className="w-full py-2.5 px-3 rounded-xl bg-[#1A1F27] hover:bg-[#222936] text-slate-200 font-medium text-xs border border-[#1C232E] transition flex items-center justify-center gap-1.5"
            >
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
              <span>Audit Edge & Leaks with AI</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
