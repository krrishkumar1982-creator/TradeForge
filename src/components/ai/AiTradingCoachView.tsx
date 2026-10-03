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
  Copy,
  MessageSquare,
  Search,
  Award,
  BookOpen,
  Filter,
  Flame,
  Scale,
  Crosshair,
  Lightbulb,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useTrading } from '../../context/TradingContext';
import {
  askTradeForgeIntelligence,
  generateAiTradeReview,
  TradeForgeIntelligenceResult,
  AiTradeReviewResult,
  ReferencedTradeSummary,
  CoachRole,
} from '../../services/geminiAi';
import { Trade } from '../../types';

interface ChatMessage {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  timestamp: string;
  roleUsed?: CoachRole;
  modelUsed?: string;
  focusTradeSummary?: string;
  result?: TradeForgeIntelligenceResult;
}

interface CoachRoleConfig {
  id: CoachRole;
  title: string;
  badge: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  accentColor: string;
  borderAccent: string;
  badgeBg: string;
  suggestedPrompts: string[];
}

const COACH_ROLES: CoachRoleConfig[] = [
  {
    id: 'lead_coach',
    title: 'Lead Institutional Coach',
    badge: 'QUANT OFFICER',
    description: 'Statistical edge, expectancy, capital preservation, and daily discipline',
    icon: Award,
    accentColor: 'text-emerald-400',
    borderAccent: 'border-emerald-500/30',
    badgeBg: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
    suggestedPrompts: [
      'Diagnose my current performance drawdown',
      'What is my true quantitative edge across all sessions?',
      'Identify my biggest capital leak and how to fix it',
      'Audit my last 20 closed executions for discipline',
    ],
  },
  {
    id: 'trade_reviewer',
    title: 'Trade Post-Mortem Auditor',
    badge: 'EXECUTION AUDITOR',
    description: 'Microscopic breakdown of individual setups, entry timing, and R-multiple capture',
    icon: Crosshair,
    accentColor: 'text-blue-400',
    borderAccent: 'border-blue-500/30',
    badgeBg: 'bg-blue-500/10 text-blue-300 border-blue-500/20',
    suggestedPrompts: [
      'Forensic audit of my worst loss this week',
      'Compare my winning entries vs losing entries',
      'Did I respect planned invalidation on my recent trades?',
      'Review my average hold time on winners vs losers',
    ],
  },
  {
    id: 'psychologist',
    title: 'Mindset & Tilt Coach',
    badge: 'PSYCHOLOGIST',
    description: 'Cognitive biases, emotional capital, FOMO/revenge regulation, and composure resets',
    icon: Brain,
    accentColor: 'text-purple-400',
    borderAccent: 'border-purple-500/30',
    badgeBg: 'bg-purple-500/10 text-purple-300 border-purple-500/20',
    suggestedPrompts: [
      'Analyze recurring emotional triggers in my journal notes',
      'Give me a cooling-off protocol after taking a stop loss',
      'Why do I struggle with early profit taking?',
      'How do I eliminate revenge trading after a red morning?',
    ],
  },
  {
    id: 'prop_firm_officer',
    title: 'Prop Firm Compliance Officer',
    badge: 'RISK COMPLIANCE',
    description: 'Daily loss limit buffers, trailing drawdown preservation, and rule enforcement',
    icon: ShieldCheck,
    accentColor: 'text-amber-400',
    borderAccent: 'border-amber-500/30',
    badgeBg: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
    suggestedPrompts: [
      'Calculate my exact buffer before hitting daily loss limit',
      'Audit my risk sizing to guarantee prop account survival',
      'Am I violating any funded consistency or news rules?',
      'What is my safe position size for next session?',
    ],
  },
  {
    id: 'playbook_architect',
    title: 'Playbook & Setup Architect',
    badge: 'EDGE ARCHITECT',
    description: 'Setup expectancies, rule checklist adherence, and negative-EV elimination',
    icon: Target,
    accentColor: 'text-cyan-400',
    borderAccent: 'border-cyan-500/30',
    badgeBg: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/20',
    suggestedPrompts: [
      'Which playbook setup has my highest expectancy?',
      'Identify any negative-EV setups I should stop trading',
      'How can I refine my entry trigger rules for London session?',
      'Evaluate my win rate when following 100% of checklist rules',
    ],
  },
];

const AVAILABLE_MODELS = [
  {
    id: 'gemini-3.8-flash',
    name: 'Gemini 3.8 Flash',
    speed: 'Balanced',
    desc: 'Real-time performance audits & conversational guidance',
    tag: 'DEFAULT',
  },
  {
    id: 'gemini-3.5-flash',
    name: 'Gemini 3.5 Flash',
    speed: 'Fast & Versatile',
    desc: 'General performance analytics & rapid calculations',
    tag: 'GENERAL',
  },
  {
    id: 'gemini-3.1-flash-lite',
    name: 'Gemini 3.1 Flash-Lite',
    speed: 'Ultra Fast',
    desc: 'High-speed pre-flight checks & instant rule lookups',
    tag: 'LIGHTWEIGHT',
  },
  {
    id: 'gemini-3.1-pro-preview',
    name: 'Gemini 3.1 Pro Preview',
    speed: 'Deep Reasoning',
    desc: 'Complex multi-variable trade post-mortems & quant modeling',
    tag: 'DEEP THINKING',
  },
];

export const AiTradingCoachView: React.FC = () => {
  const {
    trades,
    filteredTrades,
    playbooks,
    notes,
    accounts,
    propFirmAccounts,
    selectedAccountId,
    selectedPropFirmAccountId,
    setSelectedAccountId,
    setSelectedPropFirmAccountId,
    setSelectedTrade,
    theme,
  } = useTrading();

  const isLight = theme === 'light';

  // Section tabs
  const [activeTab, setActiveTab] = useState<'chat' | 'post-mortem' | 'risk-matrix'>('chat');

  // Chat State
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState<string>('Initializing...');
  const [dateScope, setDateScope] = useState<'ALL' | '30D' | '7D' | 'MONTH'>('ALL');
  const [selectedRole, setSelectedRole] = useState<CoachRole>('lead_coach');
  const [selectedModel, setSelectedModel] = useState<string>('gemini-3.8-flash');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Focus Trade State for Chat & Post-Mortem
  const [activeFocusTrade, setActiveFocusTrade] = useState<Trade | null>(null);

  // Post-Mortem Studio State
  const [postMortemSelectedTradeId, setPostMortemSelectedTradeId] = useState<string>('');
  const [postMortemSearch, setPostMortemSearch] = useState<string>('');
  const [isAuditingTrade, setIsAuditingTrade] = useState<boolean>(false);
  const [auditResult, setAuditResult] = useState<AiTradeReviewResult | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Filtered active trades based on date scope
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

  // Deterministic live summary calculations for the context panel
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
          roleUsed: 'lead_coach',
          modelUsed: selectedModel,
          text: `Welcome to **TradeForge AI Review Coach** — your institutional multi-turn quantitative mentor and trade execution auditor.

I am connected to your live TradeForge database with **${activeTrades.length} recorded trades**, **${notes.length} journal notes**, and **${playbooks.length} playbooks** in **${liveSummary.accountName}**.

### 🛠️ What We Can Do:
1. **Interactive Coaching**: Select a specialized coach persona above (Lead Coach, Trade Reviewer, Mindset Coach, Prop Firm Officer, or Playbook Architect) to guide our multi-turn discussion.
2. **Trade Post-Mortem Studio**: Switch to the **Post-Mortem Studio** tab to audit any specific trade with process scoring (0-100), mistake identification, and psychological review.
3. **Multi-Turn Memory**: Ask follow-ups anytime — our conversation history and data citations are preserved.

How would you like to review your trading today?`,
        },
      ]);
    }
  }, [activeTrades.length, notes.length, playbooks.length, liveSummary.accountName]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const currentRoleConfig = useMemo(() => {
    return COACH_ROLES.find((r) => r.id === selectedRole) || COACH_ROLES[0];
  }, [selectedRole]);

  // Multi-Turn Message Handler
  const handleSendMessage = async (textToSend?: string, tradeOverride?: Trade) => {
    const query = (textToSend || input).trim();
    if (!query || isLoading) return;

    const targetFocusTrade = tradeOverride || activeFocusTrade;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      focusTradeSummary: targetFocusTrade
        ? `${targetFocusTrade.symbol} ${targetFocusTrade.direction} (${targetFocusTrade.netPnl >= 0 ? '+' : ''}$${targetFocusTrade.netPnl})`
        : undefined,
    };

    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput('');
    setIsLoading(true);
    setLoadingStage('Querying TradeForge trade database...');

    const stageTimer1 = setTimeout(() => {
      setLoadingStage('Calculating deterministic metrics & risk boundaries...');
    }, 600);

    const stageTimer2 = setTimeout(() => {
      setLoadingStage(`Analyzing executions with ${selectedModel} (${currentRoleConfig.title})...`);
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
        {
          activeAccountId: selectedAccountId || undefined,
          activePropFirmAccountId: selectedPropFirmAccountId || undefined,
          coachRole: selectedRole,
          model: selectedModel,
          focusTrade: targetFocusTrade || undefined,
          focusTradeId: targetFocusTrade?.id,
        }
      );

      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: result.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        roleUsed: selectedRole,
        modelUsed: selectedModel,
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
    setActiveFocusTrade(null);
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        sender: 'ai',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        roleUsed: selectedRole,
        modelUsed: selectedModel,
        text: `Workspace refreshed. Ready for a new quantitative audit across **${activeTrades.length} trades** in **${liveSummary.accountName}** using **${currentRoleConfig.title}**. What would you like to examine?`,
      },
    ]);
  };

  const handleCopyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
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

  // Trade Post-Mortem Audit Handler
  const handleRunPostMortemAudit = async (tradeToAudit: Trade) => {
    setIsAuditingTrade(true);
    setAuditResult(null);

    const targetPlaybook = playbooks.find(
      (p) => p.name === tradeToAudit.setupType || p.id === (tradeToAudit as any).playbookId
    );

    try {
      const res = await generateAiTradeReview(tradeToAudit, targetPlaybook);
      setAuditResult(res);
    } catch (err) {
      console.error('Post-mortem audit failed:', err);
    } finally {
      setIsAuditingTrade(false);
    }
  };

  // Switch to Chat tab to deep-dive into the audited trade
  const handleContinueTradeInChat = (trade: Trade) => {
    setActiveFocusTrade(trade);
    setSelectedRole('trade_reviewer');
    setActiveTab('chat');

    const promptText = `Conduct a comprehensive forensic post-mortem on my ${trade.symbol} ${trade.direction} execution on ${trade.entryDate.slice(0, 10)}.
- Result: ${trade.netPnl >= 0 ? '+' : ''}$${trade.netPnl.toLocaleString()} (${trade.rMultiple ? trade.rMultiple.toFixed(2) + 'R' : 'N/A'})
- Setup: ${trade.setupType || 'Discretionary'}
- Session: ${trade.session || 'Regular'}
- Rules Followed: ${trade.rulesFollowed ? 'YES' : 'NO'}
- Mistakes Logged: ${trade.mistakes?.join(', ') || 'None'}
- Emotional State: ${trade.emotionalState || 'Calm'}

Please critique my execution timing, invalidation discipline, and how I can optimize this exact setup for my next trade.`;

    handleSendMessage(promptText, trade);
  };

  // Filtered closed trades for Post-Mortem selector
  const closedTradesList = useMemo(() => {
    const list = activeTrades.filter((t) => t.status === 'CLOSED');
    if (!postMortemSearch.trim()) {
      return list.slice(0, 30);
    }
    const q = postMortemSearch.toLowerCase();
    return list
      .filter(
        (t) =>
          t.symbol.toLowerCase().includes(q) ||
          t.direction.toLowerCase().includes(q) ||
          (t.setupType && t.setupType.toLowerCase().includes(q)) ||
          (t.mistakes && t.mistakes.some((m) => m.toLowerCase().includes(q))) ||
          t.entryDate.includes(q)
      )
      .slice(0, 30);
  }, [activeTrades, postMortemSearch]);

  const currentlySelectedAuditTrade = useMemo(() => {
    return activeTrades.find((t) => t.id === postMortemSelectedTradeId) || closedTradesList[0] || null;
  }, [activeTrades, postMortemSelectedTradeId, closedTradesList]);

  return (
    <div
      id="tradeforge-ai-review-coach-page"
      className={`p-4 sm:p-6 lg:p-7 space-y-6 max-w-[1720px] mx-auto min-h-screen ${
        isLight ? 'text-slate-900 bg-slate-50/50' : 'text-[#F5F5F5]'
      }`}
    >
      {/* Institutional Header Bar */}
      <div
        id="ai-coach-header"
        className={`flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b ${
          isLight ? 'border-slate-200' : 'border-[rgba(255,255,255,0.07)]'
        }`}
      >
        <div className="space-y-1.5">
          <div className="flex items-center gap-3">
            <div
              className={`p-2.5 rounded-xl border shadow-inner ${
                isLight
                  ? 'bg-blue-50 border-blue-200 text-blue-600'
                  : 'bg-[#0B0B0B] border-[rgba(255,255,255,0.07)] text-blue-400'
              }`}
            >
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight font-mono">
                  AI REVIEW COACH
                </h1>
                <span className="flex items-center gap-1.5 text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 rounded-full uppercase tracking-wider font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Gemini Online
                </span>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${currentRoleConfig.badgeBg}`}>
                  {currentRoleConfig.badge}
                </span>
              </div>
              <p className={`text-xs ${isLight ? 'text-[#71717A]' : 'text-[#A1A1AA]'}`}>
                Review your trades and spot recurring mistakes.
              </p>
            </div>
          </div>
        </div>

        {/* Global Scope & Model Selection Controls */}
        <div className="flex flex-wrap items-center gap-2.5 text-xs">
          {/* Model Selector */}
          <div
            className={`flex items-center rounded-xl px-3 py-1.5 gap-2 border shadow-xs ${
              isLight ? 'bg-white border-slate-200 text-slate-700' : 'bg-[#0B0B0B] border-[rgba(255,255,255,0.07)] text-[#F5F5F5]'
            }`}
          >
            <Cpu className="w-3.5 h-3.5 text-blue-400" />
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="bg-transparent focus:outline-none cursor-pointer text-xs font-mono font-medium"
            >
              {AVAILABLE_MODELS.map((m) => (
                <option key={m.id} value={m.id} className={isLight ? 'bg-white text-slate-800' : 'bg-[#0B0B0B] text-[#F5F5F5]'}>
                  {m.name} ({m.speed})
                </option>
              ))}
            </select>
          </div>

          {/* Account Selector */}
          <div
            className={`flex items-center rounded-xl px-3 py-1.5 gap-2 border shadow-xs ${
              isLight ? 'bg-white border-slate-200 text-slate-700' : 'bg-[#0B0B0B] border-[rgba(255,255,255,0.07)] text-[#F5F5F5]'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-[#A1A1AA]" />
            <select
              value={selectedAccountId || 'all'}
              onChange={(e) => {
                setSelectedAccountId(e.target.value || 'all');
                setSelectedPropFirmAccountId('');
              }}
              className="bg-transparent focus:outline-none cursor-pointer text-xs font-medium"
            >
              <option value="all" className={isLight ? 'bg-white text-slate-800' : 'bg-[#0B0B0B] text-[#F5F5F5]'}>
                All Accounts (Aggregated)
              </option>
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id} className={isLight ? 'bg-white text-slate-800' : 'bg-[#0B0B0B] text-[#F5F5F5]'}>
                  {acc.name} (${acc.currentBalance.toLocaleString()})
                </option>
              ))}
              {propFirmAccounts.map((pAcc) => (
                <option key={pAcc.id} value={pAcc.id} className={isLight ? 'bg-white text-slate-800' : 'bg-[#0B0B0B] text-[#F5F5F5]'}>
                  [Prop] {pAcc.name} (${pAcc.accountSize.toLocaleString()})
                </option>
              ))}
            </select>
          </div>

          {/* Date Scope Filter */}
          <div
            className={`flex items-center rounded-xl p-1 gap-1 border shadow-xs ${
              isLight ? 'bg-white border-slate-200' : 'bg-[#0B0B0B] border-[rgba(255,255,255,0.07)]'
            }`}
          >
            {(['ALL', '30D', '7D', 'MONTH'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setDateScope(s)}
                className={`px-2.5 py-1 rounded-lg font-medium text-[11px] transition cursor-pointer ${
                  dateScope === s
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-xs'
                    : isLight
                    ? 'text-slate-600 hover:text-slate-900'
                    : 'text-[#A1A1AA] hover:text-white'
                }`}
              >
                {s === 'ALL' ? 'All Time' : s === '30D' ? '30D' : s === '7D' ? '7D' : 'Month'}
              </button>
            ))}
          </div>

          {/* Data Evidence Pill */}
          <div
            className={`flex items-center gap-1.5 border rounded-xl px-3 py-1.5 font-mono text-[11px] shadow-xs ${
              isLight ? 'bg-white border-slate-200 text-slate-600' : 'bg-[#0B0B0B] border-[rgba(255,255,255,0.07)] text-[#D4D4D8]'
            }`}
          >
            <Database className="w-3.5 h-3.5 text-[#A1A1AA]" />
            <span>{activeTrades.length} Trades</span>
            <span className="text-[#71717A]">•</span>
            <span>{notes.length} Journals</span>
          </div>
        </div>
      </div>

      {/* Coach Persona / Roles Switcher */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-[#A1A1AA] flex items-center gap-1.5 font-mono">
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            <span>Select Review Focus</span>
          </div>
          <span className="text-[11px] text-[#71717A]">
            Active: <strong className="text-blue-400 font-medium">{currentRoleConfig.title}</strong>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
          {COACH_ROLES.map((role) => {
            const Icon = role.icon;
            const isSelected = selectedRole === role.id;
            return (
              <button
                key={role.id}
                onClick={() => setSelectedRole(role.id)}
                className={`p-3 rounded-xl border text-left transition-all relative overflow-hidden cursor-pointer ${
                  isSelected
                    ? isLight
                      ? 'bg-blue-50/80 border-blue-500/50 shadow-sm'
                      : 'bg-[#151A24] border-blue-500/50 shadow-lg shadow-blue-500/5'
                    : isLight
                    ? 'bg-white border-slate-200 hover:border-slate-300'
                    : 'bg-[#0B0B0B] border-[rgba(255,255,255,0.07)] hover:border-[rgba(255,255,255,0.12)]'
                }`}
              >
                {isSelected && (
                  <div className="absolute top-0 right-0 w-8 h-8 overflow-hidden">
                    <div className="bg-blue-500 transform rotate-45 translate-x-3 -translate-y-3 w-8 h-8 flex items-center justify-center">
                      <Check className="w-2.5 h-2.5 text-white transform -rotate-45 translate-y-1" />
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-2 mb-1.5">
                  <div
                    className={`p-1.5 rounded-lg border ${
                      isSelected
                        ? 'bg-blue-500/10 border-blue-500/30 ' + role.accentColor
                        : isLight
                        ? 'bg-slate-100 border-slate-200 text-[#71717A]'
                        : 'bg-[#080808] border-[rgba(255,255,255,0.07)] text-[#A1A1AA]'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className={`text-xs font-bold ${isSelected ? (isLight ? 'text-blue-900' : 'text-white') : isLight ? 'text-slate-800' : 'text-[#F5F5F5]'}`}>
                      {role.title}
                    </div>
                    <div className={`text-[9px] font-mono uppercase font-semibold ${role.accentColor}`}>
                      {role.badge}
                    </div>
                  </div>
                </div>
                <p className={`text-[10px] line-clamp-2 ${isLight ? 'text-[#71717A]' : 'text-[#A1A1AA]'}`}>
                  {role.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Section Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-[rgba(255,255,255,0.07)] pb-3">
        <button
          onClick={() => setActiveTab('chat')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'chat'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25'
              : isLight
              ? 'text-slate-600 hover:bg-slate-100'
              : 'text-[#A1A1AA] hover:bg-[#0B0B0B] hover:text-[#F5F5F5]'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>Interactive AI Coach Chat</span>
          {messages.length > 1 && (
            <span className="bg-white/20 text-white text-[10px] px-1.5 py-0.2 rounded-full font-mono">
              {messages.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('post-mortem')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'post-mortem'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25'
              : isLight
              ? 'text-slate-600 hover:bg-slate-100'
              : 'text-[#A1A1AA] hover:bg-[#0B0B0B] hover:text-[#F5F5F5]'
          }`}
        >
          <Crosshair className="w-4 h-4" />
          <span>Trade Review</span>
        </button>

        <button
          onClick={() => setActiveTab('risk-matrix')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'risk-matrix'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25'
              : isLight
              ? 'text-slate-600 hover:bg-slate-100'
              : 'text-[#A1A1AA] hover:bg-[#0B0B0B] hover:text-[#F5F5F5]'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Metrics & Edge</span>
        </button>
      </div>

      {/* Focus Trade Banner in Chat if active */}
      {activeFocusTrade && activeTab === 'chat' && (
        <div
          className={`flex items-center justify-between p-3 rounded-xl border ${
            isLight
              ? 'bg-blue-50/70 border-blue-200 text-blue-900'
              : 'bg-blue-950/20 border-blue-800/40 text-blue-200'
          }`}
        >
          <div className="flex items-center gap-2.5 text-xs">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
            <span className="font-semibold">Active Trade Under Review:</span>
            <span className="font-mono font-bold">{activeFocusTrade.symbol}</span>
            <span
              className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-semibold ${
                activeFocusTrade.direction === 'BUY'
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'bg-rose-500/20 text-rose-400'
              }`}
            >
              {activeFocusTrade.direction}
            </span>
            <span className="font-mono">
              {activeFocusTrade.netPnl >= 0 ? '+' : ''}${activeFocusTrade.netPnl.toLocaleString()}
            </span>
            {activeFocusTrade.rMultiple && (
              <span className="font-mono text-[#A1A1AA]">({activeFocusTrade.rMultiple.toFixed(2)}R)</span>
            )}
          </div>
          <button
            onClick={() => setActiveFocusTrade(null)}
            className="text-[11px] hover:underline text-[#A1A1AA] hover:text-[#F5F5F5]"
          >
            Clear Trade Context
          </button>
        </div>
      )}

      {/* TAB 1: INTERACTIVE MULTI-TURN AI COACH CHAT */}
      {activeTab === 'chat' && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
          {/* Main Conversational Terminal (8 Cols) */}
          <div className="xl:col-span-8 flex flex-col space-y-4">
            {/* Quick Prompts Tailored to Active Role */}
            <div className="flex flex-wrap gap-2 items-center">
              <span className={`text-[11px] font-medium uppercase tracking-wider flex items-center gap-1 ${isLight ? 'text-[#71717A]' : 'text-[#A1A1AA]'}`}>
                <Sparkles className="w-3 h-3 text-blue-400" />
                {currentRoleConfig.title} Prompts:
              </span>
              {currentRoleConfig.suggestedPrompts.map((promptText) => (
                <button
                  key={promptText}
                  onClick={() => handleSendMessage(promptText)}
                  className={`text-xs px-3 py-1.5 rounded-xl border transition flex items-center gap-1.5 shadow-xs active:scale-95 cursor-pointer ${
                    isLight
                      ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                      : 'bg-[#0B0B0B] hover:bg-[#101010] text-[#D4D4D8] border-[rgba(255,255,255,0.07)]'
                  }`}
                >
                  <span>{promptText}</span>
                  <ChevronRight className="w-3 h-3 text-[#A1A1AA]" />
                </button>
              ))}
            </div>

            {/* Conversation Thread Box */}
            <div
              id="ai-coach-thread-container"
              className={`rounded-2xl border flex flex-col h-[700px] overflow-hidden shadow-2xl backdrop-blur-md ${
                isLight ? 'bg-white border-slate-200' : 'bg-[#0B0B0B] border-[rgba(255,255,255,0.07)]'
              }`}
            >
              {/* Terminal Header */}
              <div
                className={`px-5 py-3 border-b flex items-center justify-between text-xs ${
                  isLight ? 'bg-slate-50 border-slate-200 text-slate-600' : 'bg-[#080808] border-[rgba(255,255,255,0.07)] text-[#A1A1AA]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="font-mono font-semibold">
                    SESSION // {liveSummary.accountName} • {currentRoleConfig.title}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    {selectedModel}
                  </span>
                  <button
                    onClick={handleClearChat}
                    title="Reset conversation"
                    className="flex items-center gap-1 text-[11px] hover:text-rose-400 transition px-2 py-1 rounded-lg border border-transparent hover:border-slate-300 dark:hover:border-[rgba(255,255,255,0.07)] cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Reset</span>
                  </button>
                </div>
              </div>

              {/* Scrollable Message Thread */}
              <div className="flex-1 overflow-y-auto p-5 space-y-5 custom-scrollbar">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex items-start gap-3.5 ${msg.sender === 'user' ? 'flex-row-reverse' : ''}`}
                  >
                    {/* Avatar */}
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${
                        msg.sender === 'ai'
                          ? isLight
                            ? 'bg-blue-50 border-blue-200 text-blue-600'
                            : 'bg-[#0B0B0B] border-[rgba(255,255,255,0.07)] text-blue-400'
                          : isLight
                          ? 'bg-[#101010] text-white border-white/[0.10]'
                          : 'bg-[#101010] border-[rgba(255,255,255,0.07)] text-[#F5F5F5]'
                      }`}
                    >
                      {msg.sender === 'ai' ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                    </div>

                    {/* Message Body */}
                    <div
                      className={`max-w-3xl rounded-2xl p-4 text-xs leading-relaxed ${
                        msg.sender === 'user'
                          ? isLight
                            ? 'bg-blue-600 text-white shadow-md ml-auto'
                            : 'bg-[#101010] border border-[rgba(255,255,255,0.07)] text-[#F5F5F5] shadow-md ml-auto'
                          : isLight
                          ? 'bg-slate-50 border border-slate-200 text-slate-800 shadow-sm space-y-3.5 w-full'
                          : 'bg-[#0B0B0B] border border-[rgba(255,255,255,0.07)] text-[#F5F5F5] shadow-lg space-y-3.5 w-full'
                      }`}
                    >
                      {/* AI Header */}
                      {msg.sender === 'ai' && (
                        <div
                          className={`flex items-center justify-between border-b pb-2 text-[11px] ${
                            isLight ? 'border-slate-200 text-[#71717A]' : 'border-[rgba(255,255,255,0.07)] text-[#A1A1AA]'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-900 dark:text-[#F5F5F5]">TradeForge Coach</span>
                            {msg.roleUsed && (
                              <span className="font-mono text-[9px] uppercase px-1.5 py-0.2 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                {msg.roleUsed.replace('_', ' ')}
                              </span>
                            )}
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
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleCopyMessage(msg.id, msg.text)}
                              title="Copy response"
                              className="hover:text-blue-400 transition cursor-pointer"
                            >
                              {copiedId === msg.id ? (
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                            <span className="font-mono text-[10px] text-[#71717A]">{msg.timestamp}</span>
                          </div>
                        </div>
                      )}

                      {/* User Context indicator if linked to trade */}
                      {msg.sender === 'user' && msg.focusTradeSummary && (
                        <div className="text-[10px] font-mono bg-black/20 text-blue-200 px-2 py-0.5 rounded mb-1">
                          Context: {msg.focusTradeSummary}
                        </div>
                      )}

                      {/* Executive Summary Callout */}
                      {msg.result?.summary && (
                        <div
                          className={`rounded-xl p-3 ${
                            isLight
                              ? 'bg-emerald-50 border border-emerald-200 text-emerald-950'
                              : 'bg-emerald-500/5 border border-emerald-500/20 text-[#F5F5F5]'
                          }`}
                        >
                          <div className="text-[10px] uppercase font-mono font-bold text-emerald-500 tracking-wider mb-1 flex items-center gap-1.5">
                            <Activity className="w-3 h-3" /> Executive Summary
                          </div>
                          <div className="font-medium">{msg.result.summary}</div>
                        </div>
                      )}

                      {/* Deterministic Metrics Grid */}
                      {msg.result?.deterministicSummary && (
                        <div
                          className={`grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 rounded-xl border ${
                            isLight ? 'bg-white border-slate-200' : 'bg-[#080808] border-[rgba(255,255,255,0.07)]'
                          }`}
                        >
                          <div>
                            <div className="text-[10px] text-[#A1A1AA] uppercase font-mono">Net P&L</div>
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
                            <div className="text-[10px] text-[#A1A1AA] uppercase font-mono">Win Rate</div>
                            <div className="font-mono font-bold text-sm">
                              {msg.result.deterministicSummary.winRate.toFixed(1)}%
                            </div>
                          </div>
                          <div>
                            <div className="text-[10px] text-[#A1A1AA] uppercase font-mono">Expectancy</div>
                            <div
                              className={`font-mono font-bold text-sm ${
                                msg.result.deterministicSummary.expectancy >= 0 ? 'text-emerald-400' : 'text-rose-400'
                              }`}
                            >
                              ${msg.result.deterministicSummary.expectancy.toFixed(2)}/t
                            </div>
                          </div>
                          <div>
                            <div className="text-[10px] text-[#A1A1AA] uppercase font-mono">Profit Factor</div>
                            <div className="font-mono font-bold text-sm">
                              {msg.result.deterministicSummary.profitFactor?.toFixed(2) ?? 'N/A'}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Primary Leak Callout */}
                      {msg.result?.primaryLeak && (
                        <div
                          className={`rounded-xl p-3 border ${
                            isLight
                              ? 'bg-rose-50 border-rose-200 text-rose-950'
                              : 'bg-rose-500/5 border border-rose-500/20'
                          }`}
                        >
                          <div className="text-[10px] uppercase font-mono font-bold text-rose-400 tracking-wider mb-1 flex items-center gap-1.5">
                            <AlertTriangle className="w-3 h-3" /> Capital Leak: {msg.result.primaryLeak.name}
                          </div>
                          <div className="text-xs">
                            Identified in <strong>{msg.result.primaryLeak.occurrences} trades</strong> costing an
                            estimated{' '}
                            <span className="text-rose-400 font-mono font-semibold">
                              -${msg.result.primaryLeak.impactDollars.toLocaleString()}
                            </span>
                            .
                          </div>
                          <div className="text-[11px] text-[#A1A1AA] mt-1 italic">
                            "{msg.result.primaryLeak.recommendation}"
                          </div>
                        </div>
                      )}

                      {/* Markdown Text Body */}
                      <div className="markdown-body prose prose-invert prose-xs max-w-none leading-relaxed">
                        <ReactMarkdown>{msg.text}</ReactMarkdown>
                      </div>

                      {/* Referenced Trades Section */}
                      {msg.result?.referencedTrades && msg.result.referencedTrades.length > 0 && (
                        <div
                          className={`space-y-2 pt-2 border-t ${
                            isLight ? 'border-slate-200' : 'border-[rgba(255,255,255,0.07)]'
                          }`}
                        >
                          <div className="text-[11px] font-mono font-semibold text-[#A1A1AA] uppercase tracking-wider flex items-center justify-between">
                            <span className="flex items-center gap-1.5">
                              <Database className="w-3.5 h-3.5 text-[#A1A1AA]" /> Referenced Executions (Click to
                              Inspect)
                            </span>
                            <span className="text-[10px] text-[#71717A] font-normal">
                              {msg.result.referencedTrades.length} trades
                            </span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {msg.result.referencedTrades.map((t) => (
                              <button
                                key={t.id}
                                onClick={() => handleTradeClick(t)}
                                className={`text-left p-2.5 rounded-xl border transition flex items-center justify-between cursor-pointer ${
                                  isLight
                                    ? 'bg-white hover:bg-slate-100 border-slate-200'
                                    : 'bg-[#080808] hover:bg-[#151A24] border-[rgba(255,255,255,0.07)]'
                                }`}
                              >
                                <div className="space-y-0.5">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-mono font-bold text-xs">{t.symbol}</span>
                                    <span
                                      className={`text-[9px] font-mono px-1.5 py-0.2 rounded uppercase font-semibold ${
                                        t.direction === 'LONG' || t.direction === 'BUY'
                                          ? 'bg-emerald-500/10 text-emerald-400'
                                          : 'bg-rose-500/10 text-rose-400'
                                      }`}
                                    >
                                      {t.direction}
                                    </span>
                                    <span className="text-[10px] text-[#71717A]">{t.session}</span>
                                  </div>
                                  <div className="text-[10px] text-[#A1A1AA] flex items-center gap-2">
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
                                  <div className="text-[10px] text-[#71717A] font-mono">
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
                        <div
                          className={`border rounded-xl p-3 space-y-1.5 ${
                            isLight ? 'bg-white border-slate-200' : 'bg-[#080808] border-[rgba(255,255,255,0.07)]'
                          }`}
                        >
                          <div className="text-[10px] uppercase font-mono font-bold text-emerald-400 tracking-wider flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Prescribed Action Plan
                          </div>
                          <ul className="space-y-1 text-xs">
                            {msg.result.actionablePrescriptions.map((action, idx) => (
                              <li key={idx} className="flex items-start gap-2">
                                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                                <span>{action}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {/* Thinking Stage Indicator */}
                {isLoading && (
                  <div className="flex items-start gap-3.5">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border animate-pulse ${
                        isLight ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-[#0B0B0B] border-[rgba(255,255,255,0.07)] text-blue-400'
                      }`}
                    >
                      <Bot className="w-4 h-4" />
                    </div>
                    <div
                      className={`border rounded-2xl p-4 text-xs shadow-lg space-y-2 w-full max-w-lg ${
                        isLight ? 'bg-white border-slate-200' : 'bg-[#0B0B0B] border-[rgba(255,255,255,0.07)]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="relative flex h-2.5 w-2.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500" />
                        </span>
                        <span className="font-mono font-semibold">{loadingStage}</span>
                      </div>
                      <p className={`text-[11px] ${isLight ? 'text-[#71717A]' : 'text-[#A1A1AA]'}`}>
                        Executing multi-turn reasoning with {selectedModel} under the {currentRoleConfig.title} role.
                      </p>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input Bar */}
              <div
                className={`p-3.5 border-t flex items-center gap-2 ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#080808] border-[rgba(255,255,255,0.07)]'
                }`}
              >
                <input
                  id="tradeforge-ai-coach-input"
                  type="text"
                  placeholder={`Ask ${currentRoleConfig.title} (e.g., 'What caused my loss streak?', 'Review London breakout trades')...`}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  className={`flex-1 rounded-xl px-4 py-3 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 font-sans shadow-inner border ${
                    isLight
                      ? 'bg-white border-slate-200 text-slate-900 placeholder-slate-400'
                      : 'bg-[#0B0B0B] border-[rgba(255,255,255,0.07)] text-[#F5F5F5] placeholder-slate-500'
                  }`}
                />
                <button
                  id="tradeforge-ai-coach-send-btn"
                  onClick={() => handleSendMessage()}
                  disabled={isLoading || !input.trim()}
                  className="px-4 py-3 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-semibold disabled:opacity-40 transition shadow-md shadow-indigo-600/25 border border-indigo-400/30 flex items-center gap-1.5 text-xs shrink-0 cursor-pointer disabled:cursor-not-allowed"
                >
                  <Send className="w-4 h-4" />
                  <span className="hidden sm:inline">Ask Coach</span>
                </button>
              </div>
            </div>
          </div>

          {/* Right Sidebar: Live Risk & Edge Context (4 Cols) */}
          <div className="xl:col-span-4 space-y-4">
            {/* Live Metrics Card */}
            <div
              className={`border rounded-2xl p-4 space-y-3.5 shadow-lg backdrop-blur-sm ${
                isLight ? 'bg-white border-slate-200' : 'bg-[#0B0B0B] border-[rgba(255,255,255,0.07)]'
              }`}
            >
              <div
                className={`flex items-center justify-between border-b pb-2.5 ${
                  isLight ? 'border-slate-200' : 'border-[rgba(255,255,255,0.07)]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-emerald-400" />
                  <span className="font-mono text-xs font-bold uppercase tracking-wider">Live Account Context</span>
                </div>
                <span className="text-[10px] font-mono text-[#A1A1AA]">{liveSummary.accountName}</span>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div
                  className={`p-2.5 rounded-xl border ${
                    isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#080808] border-[rgba(255,255,255,0.07)]'
                  }`}
                >
                  <div className="text-[10px] text-[#A1A1AA] uppercase font-mono">Net P&L ({dateScope})</div>
                  <div
                    className={`font-mono font-bold text-sm ${
                      liveSummary.netPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {liveSummary.netPnl >= 0 ? '+' : ''}${liveSummary.netPnl.toLocaleString()}
                  </div>
                </div>

                <div
                  className={`p-2.5 rounded-xl border ${
                    isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#080808] border-[rgba(255,255,255,0.07)]'
                  }`}
                >
                  <div className="text-[10px] text-[#A1A1AA] uppercase font-mono">Win Rate</div>
                  <div className="font-mono font-bold text-sm">{liveSummary.winRate.toFixed(1)}%</div>
                </div>

                <div
                  className={`p-2.5 rounded-xl border ${
                    isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#080808] border-[rgba(255,255,255,0.07)]'
                  }`}
                >
                  <div className="text-[10px] text-[#A1A1AA] uppercase font-mono">Profit Factor</div>
                  <div className="font-mono font-bold text-sm">{liveSummary.profitFactor.toFixed(2)}</div>
                </div>

                <div
                  className={`p-2.5 rounded-xl border ${
                    isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#080808] border-[rgba(255,255,255,0.07)]'
                  }`}
                >
                  <div className="text-[10px] text-[#A1A1AA] uppercase font-mono">Expectancy</div>
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

            {/* Quantitative Edge Breakdown */}
            <div
              className={`border rounded-2xl p-4 space-y-3 shadow-lg backdrop-blur-sm ${
                isLight ? 'bg-white border-slate-200' : 'bg-[#0B0B0B] border-[rgba(255,255,255,0.07)]'
              }`}
            >
              <div
                className={`flex items-center justify-between border-b pb-2.5 ${
                  isLight ? 'border-slate-200' : 'border-[rgba(255,255,255,0.07)]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-blue-400" />
                  <span className="font-mono text-xs font-bold uppercase tracking-wider">Quant Edge Boundaries</span>
                </div>
                <span className="text-[10px] font-mono text-[#A1A1AA]">{activeTrades.length} trades</span>
              </div>

              <div className="space-y-2 text-xs">
                <div
                  className={`flex justify-between items-center py-1 border-b ${
                    isLight ? 'border-slate-200' : 'border-[rgba(255,255,255,0.07)]'
                  }`}
                >
                  <span className="text-[#A1A1AA]">Average R-Multiple</span>
                  <span className="font-mono font-bold">
                    {liveSummary.avgR ? `${liveSummary.avgR > 0 ? '+' : ''}${liveSummary.avgR.toFixed(2)}R` : 'N/A'}
                  </span>
                </div>

                <div
                  className={`flex justify-between items-center py-1 border-b ${
                    isLight ? 'border-slate-200' : 'border-[rgba(255,255,255,0.07)]'
                  }`}
                >
                  <span className="text-[#A1A1AA]">Payoff Ratio (Win/Loss)</span>
                  <span className="font-mono font-bold">
                    {liveSummary.payoffRatio > 0 ? `${liveSummary.payoffRatio.toFixed(2)}x` : 'N/A'}
                  </span>
                </div>

                <div
                  className={`flex justify-between items-center py-1 border-b ${
                    isLight ? 'border-slate-200' : 'border-[rgba(255,255,255,0.07)]'
                  }`}
                >
                  <span className="text-[#A1A1AA]">Max Historical Drawdown</span>
                  <span className="font-mono font-bold text-rose-400">-${liveSummary.maxDd.toLocaleString()}</span>
                </div>

                <div className="flex justify-between items-center py-1">
                  <span className="text-[#A1A1AA]">Avg Win / Avg Loss</span>
                  <span className="font-mono">
                    <span className="text-emerald-400">+${Math.round(liveSummary.avgWin)}</span> /{' '}
                    <span className="text-rose-400">-${Math.round(liveSummary.avgLoss)}</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Top Setup & Mistake Vectors */}
            <div
              className={`border rounded-2xl p-4 space-y-3 shadow-lg backdrop-blur-sm ${
                isLight ? 'bg-white border-slate-200' : 'bg-[#0B0B0B] border-[rgba(255,255,255,0.07)]'
              }`}
            >
              <div
                className={`flex items-center justify-between border-b pb-2.5 ${
                  isLight ? 'border-slate-200' : 'border-[rgba(255,255,255,0.07)]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Brain className="w-4 h-4 text-purple-400" />
                  <span className="font-mono text-xs font-bold uppercase tracking-wider">Alpha & Behavior Drain</span>
                </div>
              </div>

              {/* Best Setup */}
              <div
                className={`p-3 rounded-xl border space-y-1 ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#080808] border-[rgba(255,255,255,0.07)]'
                }`}
              >
                <div className="text-[10px] uppercase font-mono font-semibold text-emerald-400 flex items-center justify-between">
                  <span>Top Alpha Setup</span>
                  <span>{liveSummary.bestSetup?.winRate.toFixed(1) || 0}% WR</span>
                </div>
                <div className="text-xs font-semibold flex items-center justify-between">
                  <span>{liveSummary.bestSetup?.name || 'Opening Range Breakout'}</span>
                  <span className="font-mono text-emerald-400">
                    +${liveSummary.bestSetup?.pnl.toLocaleString() || '0'}
                  </span>
                </div>
              </div>

              {/* Top Mistake */}
              {liveSummary.topMistake ? (
                <div
                  className={`p-3 rounded-xl border space-y-1 ${
                    isLight ? 'bg-rose-50 border-rose-200' : 'bg-[#080808] border-[rgba(255,255,255,0.07)]'
                  }`}
                >
                  <div className="text-[10px] uppercase font-mono font-semibold text-rose-400 flex items-center justify-between">
                    <span>Primary Capital Drain</span>
                    <span>{liveSummary.topMistake.count} occurrences</span>
                  </div>
                  <div className="text-xs font-semibold flex items-center justify-between">
                    <span>{liveSummary.topMistake.name}</span>
                    <span className="font-mono text-rose-400">
                      -${liveSummary.topMistake.loss.toLocaleString()}
                    </span>
                  </div>
                </div>
              ) : (
                <div
                  className={`p-3 rounded-xl border text-xs text-[#A1A1AA] ${
                    isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#080808] border-[rgba(255,255,255,0.07)]'
                  }`}
                >
                  No recurring behavioral leaks logged.
                </div>
              )}

              <button
                onClick={() => handleSendMessage('Give me a full institutional audit of my trading edge and primary leaks')}
                className={`w-full py-2.5 px-3 rounded-xl font-medium text-xs border transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  isLight
                    ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800'
                    : 'bg-[#101010] hover:bg-[#18181B] text-[#F5F5F5] border-[rgba(255,255,255,0.07)]'
                }`}
              >
                <Activity className="w-3.5 h-3.5 text-emerald-400" />
                <span>Audit Edge & Leaks with AI</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: TRADE POST-MORTEM STUDIO */}
      {activeTab === 'post-mortem' && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
          {/* Left Column: Trade Selector (4 Cols) */}
          <div className="xl:col-span-4 space-y-4">
            <div
              className={`border rounded-2xl p-4 space-y-3.5 shadow-lg ${
                isLight ? 'bg-white border-slate-200' : 'bg-[#0B0B0B] border-[rgba(255,255,255,0.07)]'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Crosshair className="w-4 h-4 text-blue-400" />
                  <span className="font-mono text-xs font-bold uppercase tracking-wider">Select Trade to Audit</span>
                </div>
                <span className="text-[10px] font-mono text-[#A1A1AA]">{closedTradesList.length} available</span>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[#A1A1AA]" />
                <input
                  type="text"
                  placeholder="Filter by symbol, setup, date..."
                  value={postMortemSearch}
                  onChange={(e) => setPostMortemSearch(e.target.value)}
                  className={`w-full pl-8 pr-3 py-1.5 rounded-xl text-xs border focus:outline-none focus:ring-1 focus:ring-blue-500 font-sans ${
                    isLight
                      ? 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
                      : 'bg-[#080808] border-[rgba(255,255,255,0.07)] text-[#F5F5F5] placeholder-slate-500'
                  }`}
                />
              </div>

              {/* Trades List */}
              <div className="space-y-2 max-h-[550px] overflow-y-auto pr-1 custom-scrollbar">
                {closedTradesList.map((t) => {
                  const isSelected = (postMortemSelectedTradeId || currentlySelectedAuditTrade?.id) === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => {
                        setPostMortemSelectedTradeId(t.id);
                        setAuditResult(null);
                      }}
                      className={`w-full text-left p-3 rounded-xl border transition flex items-center justify-between cursor-pointer ${
                        isSelected
                          ? isLight
                            ? 'bg-blue-50 border-blue-500/50 shadow-xs'
                            : 'bg-[#151A24] border-blue-500/60 shadow-md'
                          : isLight
                          ? 'bg-white hover:bg-slate-50 border-slate-200'
                          : 'bg-[#080808] hover:bg-[#0B0B0B] border-[rgba(255,255,255,0.07)]'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-xs">{t.symbol}</span>
                          <span
                            className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-semibold uppercase ${
                              t.direction === 'BUY'
                                ? 'bg-emerald-500/10 text-emerald-400'
                                : 'bg-rose-500/10 text-rose-400'
                            }`}
                          >
                            {t.direction}
                          </span>
                          <span className="text-[10px] text-[#A1A1AA]">{t.entryDate.slice(0, 10)}</span>
                        </div>
                        <div className="text-[10px] text-[#A1A1AA] flex items-center gap-2">
                          <span>{t.setupType || 'Setup'}</span>
                          {t.mistakes && t.mistakes.length > 0 && (
                            <span className="text-rose-400">[{t.mistakes[0]}]</span>
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
                        <div className="text-[10px] text-[#A1A1AA] font-mono">
                          {t.rMultiple ? `${t.rMultiple > 0 ? '+' : ''}${t.rMultiple.toFixed(2)}R` : '-'}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column: Forensic Post-Mortem Audit Report (8 Cols) */}
          <div className="xl:col-span-8 space-y-4">
            {currentlySelectedAuditTrade ? (
              <div
                className={`border rounded-2xl p-5 space-y-5 shadow-2xl backdrop-blur-md ${
                  isLight ? 'bg-white border-slate-200' : 'bg-[#0B0B0B] border-[rgba(255,255,255,0.07)]'
                }`}
              >
                {/* Trade Header & Meta Bar */}
                <div
                  className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b ${
                    isLight ? 'border-slate-200' : 'border-[rgba(255,255,255,0.07)]'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-base">{currentlySelectedAuditTrade.symbol}</span>
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded font-semibold uppercase ${
                          currentlySelectedAuditTrade.direction === 'BUY'
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : 'bg-rose-500/10 text-rose-400'
                        }`}
                      >
                        {currentlySelectedAuditTrade.direction}
                      </span>
                      <span
                        className={`font-mono font-bold text-sm ${
                          currentlySelectedAuditTrade.netPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {currentlySelectedAuditTrade.netPnl >= 0 ? '+' : ''}$
                        {currentlySelectedAuditTrade.netPnl.toLocaleString()}
                      </span>
                      {currentlySelectedAuditTrade.rMultiple && (
                        <span className="text-xs font-mono text-[#A1A1AA]">
                          ({currentlySelectedAuditTrade.rMultiple.toFixed(2)}R)
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-[#A1A1AA] font-mono">
                      <span>Entry: {currentlySelectedAuditTrade.entryPrice}</span>
                      <span>Exit: {currentlySelectedAuditTrade.exitPrice || 'N/A'}</span>
                      <span>Session: {currentlySelectedAuditTrade.session || 'Regular'}</span>
                      <span>Date: {currentlySelectedAuditTrade.entryDate}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleRunPostMortemAudit(currentlySelectedAuditTrade)}
                      disabled={isAuditingTrade}
                      className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition flex items-center gap-1.5 shadow-md shadow-blue-600/25 cursor-pointer disabled:opacity-50"
                    >
                      {isAuditingTrade ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Reviewing trade...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>{auditResult ? 'Review Again' : 'Review Trade'}</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => handleContinueTradeInChat(currentlySelectedAuditTrade)}
                      className={`px-3 py-2 rounded-xl text-xs font-medium border transition flex items-center gap-1.5 cursor-pointer ${
                        isLight
                          ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800'
                          : 'bg-[#101010] hover:bg-[#252C38] border-[rgba(255,255,255,0.07)] text-[#F5F5F5]'
                      }`}
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-blue-400" />
                      <span>Discuss in Chat</span>
                    </button>
                  </div>
                </div>

                {/* Audit Result Display */}
                {auditResult ? (
                  <div className="space-y-4">
                    {/* Process Score Badge & Summary */}
                    <div
                      className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                        auditResult.score >= 80
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                          : auditResult.score >= 60
                          ? 'bg-blue-500/10 border-blue-500/30 text-blue-200'
                          : 'bg-rose-500/10 border-rose-500/30 text-rose-200'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="text-center">
                          <div className="text-3xl font-extrabold font-mono">{auditResult.score}</div>
                          <div className="text-[10px] uppercase font-mono font-semibold tracking-wider">
                            Process Score / 100
                          </div>
                        </div>
                        <div className="space-y-1">
                          <div className="text-xs font-bold uppercase tracking-wider">Review Summary</div>
                          <p className="text-xs leading-relaxed">{auditResult.executiveSummary}</p>
                        </div>
                      </div>
                    </div>

                    {/* Breakdown Matrix */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Strengths */}
                      <div
                        className={`p-4 rounded-xl border space-y-2 ${
                          isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#080808] border-[rgba(255,255,255,0.07)]'
                        }`}
                      >
                        <div className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Execution Strengths
                        </div>
                        <ul className="space-y-1.5 text-xs">
                          {auditResult.strengths.map((str, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <span className="text-emerald-400 shrink-0">•</span>
                              <span>{str}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Identified Mistakes */}
                      <div
                        className={`p-4 rounded-xl border space-y-2 ${
                          isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#080808] border-[rgba(255,255,255,0.07)]'
                        }`}
                      >
                        <div className="text-xs font-mono font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-400" /> Identified Mistakes & Violations
                        </div>
                        <ul className="space-y-1.5 text-xs">
                          {auditResult.mistakesIdentified.map((m, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <span className="text-rose-400 shrink-0">•</span>
                              <span>{m}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Psychology Insight */}
                      <div
                        className={`p-4 rounded-xl border space-y-2 ${
                          isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#080808] border-[rgba(255,255,255,0.07)]'
                        }`}
                      >
                        <div className="text-xs font-mono font-bold text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
                          <Brain className="w-3.5 h-3.5 text-purple-400" /> Psychology & Mindset Audit
                        </div>
                        <p className="text-xs leading-relaxed text-[#D4D4D8]">
                          {auditResult.psychologyInsight}
                        </p>
                      </div>

                      {/* Risk Evaluation */}
                      <div
                        className={`p-4 rounded-xl border space-y-2 ${
                          isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#080808] border-[rgba(255,255,255,0.07)]'
                        }`}
                      >
                        <div className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                          <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" /> Risk & Stop Discipline
                        </div>
                        <p className="text-xs leading-relaxed text-[#D4D4D8]">{auditResult.riskEvaluation}</p>
                      </div>
                    </div>

                    {/* Actionable Steps */}
                    {auditResult.actionableSteps && auditResult.actionableSteps.length > 0 && (
                      <div
                        className={`p-4 rounded-xl border space-y-2 ${
                          isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#080808] border-[rgba(255,255,255,0.07)]'
                        }`}
                      >
                        <div className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                          <Lightbulb className="w-3.5 h-3.5 text-emerald-400" /> Actionable Next Steps For This Setup
                        </div>
                        <ul className="space-y-1.5 text-xs">
                          {auditResult.actionableSteps.map((step, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                              <span>{step}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : (
                  <div
                    className={`p-12 text-center rounded-xl border border-dashed flex flex-col items-center justify-center space-y-3 ${
                      isLight ? 'bg-slate-50 border-slate-300' : 'bg-[#080808] border-[rgba(255,255,255,0.07)]'
                    }`}
                  >
                    <Crosshair className="w-8 h-8 text-blue-400 animate-bounce" />
                    <div className="space-y-1">
                      <h4 className="text-sm font-bold">Ready for Forensic Trade Audit</h4>
                      <p className={`text-xs max-w-md ${isLight ? 'text-[#71717A]' : 'text-[#A1A1AA]'}`}>
                        Click <strong>"Run AI Forensic Audit"</strong> above to have Gemini conduct an institutional
                        post-mortem on this execution, calculating process quality score, entry efficiency, and
                        psychological adherence.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div
                className={`p-12 text-center rounded-2xl border ${
                  isLight ? 'bg-white border-slate-200' : 'bg-[#0B0B0B] border-[rgba(255,255,255,0.07)]'
                }`}
              >
                <p className="text-xs text-[#A1A1AA]">Select a trade from the left column to begin forensic review.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: LIVE QUANT MATRIX & EDGE */}
      {activeTab === 'risk-matrix' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Card 1: Statistical Edge & Expectancy */}
          <div
            className={`border rounded-2xl p-5 space-y-4 shadow-lg ${
              isLight ? 'bg-white border-slate-200' : 'bg-[#0B0B0B] border-[rgba(255,255,255,0.07)]'
            }`}
          >
            <div className="flex items-center gap-2 border-b border-slate-200 dark:border-[rgba(255,255,255,0.07)] pb-3">
              <BarChart3 className="w-4 h-4 text-emerald-400" />
              <h3 className="font-mono text-xs font-bold uppercase tracking-wider">Quant Edge & Win Distribution</h3>
            </div>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-200 dark:border-[rgba(255,255,255,0.07)]">
                <span className="text-[#A1A1AA]">Total Closed Executions</span>
                <span className="font-mono font-bold">{liveSummary.totalTrades}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200 dark:border-[rgba(255,255,255,0.07)]">
                <span className="text-[#A1A1AA]">Calculated Win Rate</span>
                <span className="font-mono font-bold text-emerald-400">{liveSummary.winRate.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200 dark:border-[rgba(255,255,255,0.07)]">
                <span className="text-[#A1A1AA]">Profit Factor</span>
                <span className="font-mono font-bold">{liveSummary.profitFactor.toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200 dark:border-[rgba(255,255,255,0.07)]">
                <span className="text-[#A1A1AA]">Mathematical Expectancy</span>
                <span className="font-mono font-bold text-emerald-400">
                  ${liveSummary.expectancy.toFixed(2)} / trade
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200 dark:border-[rgba(255,255,255,0.07)]">
                <span className="text-[#A1A1AA]">Average R-Multiple</span>
                <span className="font-mono font-bold">{liveSummary.avgR.toFixed(2)}R</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-[#A1A1AA]">Payoff Ratio (Win / Loss)</span>
                <span className="font-mono font-bold">{liveSummary.payoffRatio.toFixed(2)}x</span>
              </div>
            </div>
          </div>

          {/* Card 2: Prop Firm Rule Compliance */}
          <div
            className={`border rounded-2xl p-5 space-y-4 shadow-lg ${
              isLight ? 'bg-white border-slate-200' : 'bg-[#0B0B0B] border-[rgba(255,255,255,0.07)]'
            }`}
          >
            <div className="flex items-center gap-2 border-b border-slate-200 dark:border-[rgba(255,255,255,0.07)] pb-3">
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              <h3 className="font-mono text-xs font-bold uppercase tracking-wider">Prop Firm Safety & Buffer</h3>
            </div>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-200 dark:border-[rgba(255,255,255,0.07)]">
                <span className="text-[#A1A1AA]">Active Account Target</span>
                <span className="font-mono font-bold">{liveSummary.accountName}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200 dark:border-[rgba(255,255,255,0.07)]">
                <span className="text-[#A1A1AA]">Max Historical Drawdown</span>
                <span className="font-mono font-bold text-rose-400">-${liveSummary.maxDd.toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200 dark:border-[rgba(255,255,255,0.07)]">
                <span className="text-[#A1A1AA]">Active Account Balance</span>
                <span className="font-mono font-bold">
                  $
                  {(
                    liveSummary.activeAccount?.currentBalance ||
                    liveSummary.activePropFirm?.accountSize ||
                    0
                  ).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200 dark:border-[rgba(255,255,255,0.07)]">
                <span className="text-[#A1A1AA]">Rules Compliance Status</span>
                <span className="font-mono font-bold text-emerald-400">NOMINAL / SECURE</span>
              </div>
              <button
                onClick={() => {
                  setSelectedRole('prop_firm_officer');
                  setActiveTab('chat');
                  handleSendMessage('Audit my prop firm risk parameters, trailing drawdown buffer, and daily loss limits.');
                }}
                className="w-full py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-medium transition cursor-pointer mt-2"
              >
                Run Prop Firm Deep Audit in Chat
              </button>
            </div>
          </div>

          {/* Card 3: Behavioral Leak Diagnostics */}
          <div
            className={`border rounded-2xl p-5 space-y-4 shadow-lg ${
              isLight ? 'bg-white border-slate-200' : 'bg-[#0B0B0B] border-[rgba(255,255,255,0.07)]'
            }`}
          >
            <div className="flex items-center gap-2 border-b border-slate-200 dark:border-[rgba(255,255,255,0.07)] pb-3">
              <Brain className="w-4 h-4 text-purple-400" />
              <h3 className="font-mono text-xs font-bold uppercase tracking-wider">Trading Habits</h3>
            </div>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-200 dark:border-[rgba(255,255,255,0.07)]">
                <span className="text-[#A1A1AA]">Primary Leak</span>
                <span className="font-mono font-bold text-rose-400">
                  {liveSummary.topMistake?.name || 'None Recorded'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200 dark:border-[rgba(255,255,255,0.07)]">
                <span className="text-[#A1A1AA]">Estimated Loss</span>
                <span className="font-mono font-bold text-rose-400">
                  -${(liveSummary.topMistake?.loss || 0).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200 dark:border-[rgba(255,255,255,0.07)]">
                <span className="text-[#A1A1AA]">Best Setup</span>
                <span className="font-mono font-bold text-emerald-400">
                  {liveSummary.bestSetup?.name || 'Breakout'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200 dark:border-[rgba(255,255,255,0.07)]">
                <span className="text-[#A1A1AA]">Top Setup P&L</span>
                <span className="font-mono font-bold text-emerald-400">
                  +${(liveSummary.bestSetup?.pnl || 0).toLocaleString()}
                </span>
              </div>
              <button
                onClick={() => {
                  setSelectedRole('psychologist');
                  setActiveTab('chat');
                  handleSendMessage('Analyze my emotional state logs and give me a concrete plan to avoid recurring leaks.');
                }}
                className="w-full py-2 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-medium transition cursor-pointer mt-2"
              >
                Consult Mindset Coach in Chat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
