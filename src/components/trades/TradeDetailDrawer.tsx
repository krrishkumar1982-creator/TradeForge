import React, { useState } from 'react';
import {
  X,
  Share2,
  Edit2,
  Trash2,
  Copy,
  CheckCircle2,
  XCircle,
  Minus,
  Star,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  Plus,
  AlertTriangle,
  Bot,
  Sparkles,
  ExternalLink,
  Shield,
  Clock,
  DollarSign
} from 'lucide-react';
import { useTrading } from '../../context/TradingContext';
import { Trade } from '../../types';
import { generateAiTradeReview, AiTradeReviewResult } from '../../services/geminiAi';
import { getTagColor, hexToRgba } from '../../utils/tagColors';

interface TradeDetailDrawerProps {
  trade: Trade | null;
  onClose: () => void;
  onOpenEdit: (trade: Trade) => void;
}

export const TradeDetailDrawer: React.FC<TradeDetailDrawerProps> = ({ trade, onClose, onOpenEdit }) => {
  const {
    playbooks,
    strategies,
    accounts,
    propFirmAccounts,
    deleteTrade,
    duplicateTrade,
    formatCurrency,
    formatRMultiple,
    addCommunityPost,
    addToast,
    userSettings,
  } = useTrading();

  const [aiReview, setAiReview] = useState<AiTradeReviewResult | null>(null);
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  const [isAiAuditOpen, setIsAiAuditOpen] = useState(false);
  const [isDetailsCollapsed, setIsDetailsCollapsed] = useState(true);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [expandedImage, setExpandedImage] = useState<string | null>(null);

  if (!trade) return null;

  const isWin = trade.netPnl > 0;
  const isLoss = trade.netPnl < 0;

  // Resolve matching playbook
  const matchedPlaybook = playbooks.find(
    p => p.id === trade.playbookId || p.name.toLowerCase() === trade.setupType?.toLowerCase()
  );

  // Resolve account & prop firm
  const matchedAccount = accounts.find(a => a.id === trade.accountId);
  const matchedPropFirm = propFirmAccounts.find(p => p.id === trade.propFirmAccountId);
  const matchedStrategy = strategies.find(s => s.id === trade.strategyId);

  // Format date helper
  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return dateStr;
    }
  };

  const shortId = trade.id ? (trade.id.length > 8 ? trade.id.slice(-6).toUpperCase() : trade.id) : '';

  // Rule verification statistics
  const totalRules = matchedPlaybook?.rules?.length || 0;
  const followedCount = matchedPlaybook?.rules
    ? matchedPlaybook.rules.filter(rule => {
        if (trade.checkedRuleIds && trade.checkedRuleIds.length > 0) {
          return trade.checkedRuleIds.includes(rule.id);
        }
        if (trade.brokenRuleIds && trade.brokenRuleIds.includes(rule.id)) {
          return false;
        }
        return trade.rulesFollowed;
      }).length
    : 0;

  const handleDuplicate = () => {
    duplicateTrade(trade.id);
    addToast('Trade Duplicated', `Created a copy of ${trade.symbol}`, 'success');
  };

  const handleDelete = () => {
    deleteTrade(trade.id);
    addToast('Trade Deleted', `Trade #${shortId} has been removed`, 'info');
    setIsConfirmDeleteOpen(false);
    onClose();
  };

  const handleShareToLounge = () => {
    addCommunityPost(
      `Closed ${trade.symbol} ${trade.direction} for ${formatCurrency(trade.netPnl)} (${formatRMultiple(trade.rMultiple)}). Setup: ${trade.setupType || 'Standard Execution'}.`,
      trade.symbol,
      formatCurrency(trade.netPnl),
      formatRMultiple(trade.rMultiple)
    );
    addToast('Shared', 'Trade posted to Traders Lounge', 'success');
  };

  const handleRunAiAudit = async () => {
    setIsLoadingAi(true);
    try {
      const result = await generateAiTradeReview(trade, matchedPlaybook);
      setAiReview(result);
      setIsAiAuditOpen(true);
      addToast('AI Review Complete', `Scored ${result.score}/100 with tactical review`, 'success');
    } catch {
      addToast('Error', 'Could not run AI critique', 'error');
    } finally {
      setIsLoadingAi(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/75 backdrop-blur-[2px] transition-opacity duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[540px] h-full bg-[#050608] border-l border-[#1C2129] shadow-2xl flex flex-col overflow-hidden text-left"
        onClick={e => e.stopPropagation()}
      >
        {/* ==================================================================== */}
        {/* 1. HEADER SECTION                                                    */}
        {/* ==================================================================== */}
        <div className="px-6 py-4.5 border-b border-[#1C2129] bg-[#0A0C10] shrink-0">
          <div className="flex items-start justify-between gap-3">
            {/* Left: Direction badge, Symbol, ID, and Subtitle */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2.5">
                <span
                  className={`px-2 py-0.5 rounded text-[11px] font-bold font-mono tracking-wider uppercase shrink-0 border ${
                    trade.direction === 'BUY'
                      ? 'bg-[#10B981]/10 text-[#10B981] border-[#10B981]/30'
                      : 'bg-[#F43F5E]/10 text-[#F43F5E] border-[#F43F5E]/30'
                  }`}
                >
                  {trade.direction}
                </span>

                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#F3F4F6] font-mono leading-none">
                  {trade.symbol}
                </h1>

                <span className="text-xs font-mono text-[#68707C]">
                  #{shortId}
                </span>

                {matchedPropFirm && (
                  <span
                    className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#6366F1]/15 text-[#818CF8] border border-[#6366F1]/30 inline-flex items-center gap-1 shrink-0"
                    title={matchedPropFirm.name}
                  >
                    <Shield className="w-2.5 h-2.5 text-[#818CF8]" />
                    <span>{matchedPropFirm.firmName}</span>
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 flex-wrap text-xs text-[#A1A8B3] mt-2 font-sans">
                <span>{formatDateTime(trade.entryDate)}</span>
                <span className="text-[#68707C]" aria-hidden="true">·</span>
                <span>{trade.session || 'New York'} Session</span>
                <span className="text-[#68707C]" aria-hidden="true">·</span>
                <span className="text-[#F3F4F6] font-medium">
                  {matchedAccount?.name || 'Primary Account'}
                </span>
              </div>
            </div>

            {/* Right: Action Buttons */}
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => onOpenEdit(trade)}
                className="p-1.5 rounded-lg border border-transparent hover:border-[#1C2129] bg-transparent hover:bg-[#12151B] text-[#A1A8B3] hover:text-[#F3F4F6] transition-colors cursor-pointer"
                title="Edit Trade"
                aria-label="Edit Trade"
              >
                <Edit2 className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={handleDuplicate}
                className="p-1.5 rounded-lg border border-transparent hover:border-[#1C2129] bg-transparent hover:bg-[#12151B] text-[#A1A8B3] hover:text-[#F3F4F6] transition-colors cursor-pointer"
                title="Duplicate Trade"
                aria-label="Duplicate Trade"
              >
                <Copy className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => setIsConfirmDeleteOpen(true)}
                className="p-1.5 rounded-lg border border-transparent hover:border-rose-500/30 bg-transparent hover:bg-rose-500/10 text-[#68707C] hover:text-[#F43F5E] transition-colors cursor-pointer"
                title="Delete Trade"
                aria-label="Delete Trade"
              >
                <Trash2 className="w-4 h-4" />
              </button>

              <div className="w-px h-4 bg-[#1C2129] mx-1" />

              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg border border-transparent hover:border-[#1C2129] bg-transparent hover:bg-[#12151B] text-[#A1A8B3] hover:text-[#F3F4F6] transition-colors cursor-pointer"
                title="Close Drawer"
                aria-label="Close Drawer"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>
          </div>
        </div>

        {/* ==================================================================== */}
        {/* SCROLLABLE DRAWER BODY                                               */}
        {/* ==================================================================== */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#050608] custom-scrollbar">

          {/* ==================================================================== */}
          {/* 2. TRADE RESULT (HERO SECTION)                                       */}
          {/* ==================================================================== */}
          <section className="p-5 rounded-xl bg-[#0A0C10] border border-[#1C2129] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#68707C] font-mono">
                Realized Net P&L
              </span>
              {trade.roiPercent !== undefined && (
                <span className={`text-xs font-mono font-medium ${trade.roiPercent >= 0 ? 'text-[#10B981]' : 'text-[#F43F5E]'}`}>
                  {trade.roiPercent >= 0 ? '+' : ''}{trade.roiPercent.toFixed(2)}% ROI
                </span>
              )}
            </div>

            <div
              className={`text-3xl sm:text-4xl font-bold font-mono tracking-tight ${
                isWin ? 'text-[#10B981]' : isLoss ? 'text-[#F43F5E]' : 'text-[#F3F4F6]'
              }`}
            >
              {formatCurrency(trade.netPnl)}
            </div>

            {/* Metrics Strip */}
            <div className="grid grid-cols-3 gap-3 pt-3 border-t border-[#1C2129]/70 text-xs">
              <div>
                <span className="text-[10px] uppercase font-semibold text-[#68707C] font-mono block">
                  R-Multiple
                </span>
                <span className={`font-mono font-semibold text-sm mt-0.5 block ${trade.rMultiple >= 0 ? 'text-[#10B981]' : 'text-[#F43F5E]'}`}>
                  {formatRMultiple(trade.rMultiple)}
                </span>
              </div>

              <div>
                <span className="text-[10px] uppercase font-semibold text-[#68707C] font-mono block">
                  Duration
                </span>
                <span className="font-mono font-medium text-sm text-[#F3F4F6] mt-0.5 block">
                  {trade.durationMinutes > 0 ? `${trade.durationMinutes}m` : '< 1m'}
                </span>
              </div>

              <div>
                <span className="text-[10px] uppercase font-semibold text-[#68707C] font-mono block">
                  Status
                </span>
                <span className={`font-mono font-medium text-sm mt-0.5 block ${trade.status === 'OPEN' ? 'text-[#818CF8]' : 'text-[#A1A8B3]'}`}>
                  {trade.status || 'CLOSED'}
                </span>
              </div>
            </div>
          </section>

          {/* ==================================================================== */}
          {/* 3. EXECUTION DETAILS GRID                                            */}
          {/* ==================================================================== */}
          <section className="space-y-2">
            <h2 className="text-[11px] font-semibold uppercase tracking-wider font-mono text-[#68707C]">
              Execution Details
            </h2>

            <div className="rounded-xl bg-[#0A0C10] border border-[#1C2129] p-4 text-xs divide-y divide-[#1C2129]/60">
              {/* Row 1: Entry, Exit, Stop Loss, Take Profit */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pb-3.5">
                <div>
                  <span className="text-[10px] uppercase font-semibold text-[#68707C] font-mono block">
                    Entry Price
                  </span>
                  <span className="font-mono font-semibold text-sm text-[#F3F4F6] mt-0.5 block">
                    {trade.entryPrice ? `$${trade.entryPrice.toLocaleString()}` : '—'}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-semibold text-[#68707C] font-mono block">
                    Exit Price
                  </span>
                  <span className="font-mono font-semibold text-sm text-[#F3F4F6] mt-0.5 block">
                    {trade.exitPrice ? `$${trade.exitPrice.toLocaleString()}` : (trade.status === 'OPEN' ? 'Open' : '—')}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-semibold text-[#68707C] font-mono block">
                    Stop Loss
                  </span>
                  <span className="font-mono font-semibold text-sm text-[#F43F5E] mt-0.5 block">
                    {trade.stopLoss ? `$${trade.stopLoss.toLocaleString()}` : '—'}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-semibold text-[#68707C] font-mono block">
                    Take Profit
                  </span>
                  <span className="font-mono font-semibold text-sm text-[#10B981] mt-0.5 block">
                    {trade.takeProfit ? `$${trade.takeProfit.toLocaleString()}` : '—'}
                  </span>
                </div>
              </div>

              {/* Row 2: Quantity, Planned Risk, Position Value, Execution Method */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-3.5">
                <div>
                  <span className="text-[10px] uppercase font-semibold text-[#68707C] font-mono block">
                    Quantity
                  </span>
                  <span className="font-mono font-medium text-xs text-[#F3F4F6] mt-0.5 block">
                    {trade.quantity ? `${trade.quantity} ${trade.market === 'Futures' ? 'contracts' : trade.market === 'Stocks' ? 'shares' : 'lots'}` : '—'}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-semibold text-[#68707C] font-mono block">
                    Planned Risk
                  </span>
                  <span className="font-mono font-medium text-xs text-[#A1A8B3] mt-0.5 block">
                    {trade.stopLoss && trade.quantity
                      ? formatCurrency(Math.abs(trade.entryPrice - trade.stopLoss) * trade.quantity)
                      : '—'}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-semibold text-[#68707C] font-mono block">
                    Position Value
                  </span>
                  <span className="font-mono font-medium text-xs text-[#A1A8B3] mt-0.5 block">
                    {trade.entryPrice && trade.quantity
                      ? formatCurrency(trade.entryPrice * trade.quantity)
                      : '—'}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-semibold text-[#68707C] font-mono block">
                    Execution
                  </span>
                  <span className="font-mono font-medium text-xs text-[#A1A8B3] mt-0.5 block">
                    {trade.executionMethod || 'Manual'}
                  </span>
                </div>
              </div>

              {/* Row 3: Timestamps (Entry Date & Time, Exit Date & Time) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3.5">
                <div>
                  <span className="text-[10px] uppercase font-semibold text-[#68707C] font-mono block">
                    Entry Date & Time
                  </span>
                  <span className="font-mono text-xs text-[#F3F4F6] mt-0.5 block">
                    {trade.entryDate ? new Date(trade.entryDate).toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                      hour12: true,
                    }) : '—'}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-semibold text-[#68707C] font-mono block">
                    Exit Date & Time
                  </span>
                  <span className="font-mono text-xs text-[#F3F4F6] mt-0.5 block">
                    {trade.exitDate ? new Date(trade.exitDate).toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                      hour12: true,
                    }) : trade.status === 'OPEN' ? 'Position Active / Open' : '—'}
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* ==================================================================== */}
          {/* 4. STRATEGY / PLAYBOOK & SETUP GRADE                                 */}
          {/* ==================================================================== */}
          <section className="space-y-2">
            <h2 className="text-[11px] font-semibold uppercase tracking-wider font-mono text-[#68707C]">
              Playbook & Setup
            </h2>

            <div className="p-4 rounded-xl bg-[#0A0C10] border border-[#1C2129] flex items-center justify-between gap-3">
              <div>
                <span className="text-[10px] uppercase font-semibold text-[#68707C] font-mono block">
                  Playbook
                </span>
                <span className="text-sm font-semibold text-[#F3F4F6] mt-0.5 block">
                  {trade.setupType || matchedPlaybook?.name || 'No Playbook Assigned'}
                </span>
              </div>

              <div className="text-right">
                <span className="text-[10px] uppercase font-semibold text-[#68707C] font-mono block">
                  Setup Grade
                </span>
                <div className="mt-0.5 inline-block">
                  {trade.setupGrade ? (
                    <span className="px-2 py-0.5 rounded text-xs font-mono font-bold border border-[#1C2129] bg-[#0F1217] text-[#F3F4F6]">
                      Grade {trade.setupGrade}
                    </span>
                  ) : (
                    <span className="text-xs font-mono text-[#68707C]">—</span>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* ==================================================================== */}
          {/* 5. RISK & RULE ADHERENCE CHECKLIST                                   */}
          {/* ==================================================================== */}
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-[11px] font-semibold uppercase tracking-wider font-mono text-[#68707C]">
                Rule Adherence
              </h2>
              {matchedPlaybook && totalRules > 0 && (
                <span className="text-xs font-mono text-[#A1A8B3]">
                  <strong className={followedCount === totalRules ? 'text-[#10B981]' : 'text-[#F43F5E]'}>
                    {followedCount} / {totalRules}
                  </strong> followed
                </span>
              )}
            </div>

            <div className="rounded-xl bg-[#0A0C10] border border-[#1C2129] p-4 text-xs space-y-3">
              {matchedPlaybook && matchedPlaybook.rules && matchedPlaybook.rules.length > 0 ? (
                <div className="divide-y divide-[#1C2129]/60">
                  {matchedPlaybook.rules.map((rule) => {
                    let isFollowed = false;
                    let isBroken = false;

                    if (trade.checkedRuleIds && trade.checkedRuleIds.length > 0) {
                      isFollowed = trade.checkedRuleIds.includes(rule.id);
                    } else if (trade.brokenRuleIds && trade.brokenRuleIds.length > 0) {
                      isBroken = trade.brokenRuleIds.includes(rule.id);
                      isFollowed = !isBroken;
                    } else {
                      isFollowed = trade.rulesFollowed;
                    }

                    return (
                      <div key={rule.id} className="py-2.5 first:pt-0 last:pb-0 flex items-start gap-3">
                        <div className="shrink-0 mt-0.5">
                          {isFollowed ? (
                            <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
                          ) : isBroken ? (
                            <XCircle className="w-4 h-4 text-[#F43F5E]" />
                          ) : (
                            <Minus className="w-4 h-4 text-[#68707C]" />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-[#A1A8B3] block mb-0.5">
                            {rule.category}
                          </span>
                          <p className="text-[13px] text-[#F3F4F6] font-normal leading-snug">
                            {rule.text}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-3 space-y-2">
                  <p className="text-xs text-[#68707C]">
                    No execution rules linked to this trade.
                  </p>
                  <button
                    type="button"
                    onClick={() => onOpenEdit(trade)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#1C2129] bg-[#0F1217] hover:bg-[#12151B] text-xs text-[#A1A8B3] hover:text-[#F3F4F6] transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Assign Playbook Setup</span>
                  </button>
                </div>
              )}
            </div>
          </section>

          {/* ==================================================================== */}
          {/* 6. MISTAKE / TRADE REVIEW                                            */}
          {/* ==================================================================== */}
          <section className="space-y-2">
            <h2 className="text-[11px] font-semibold uppercase tracking-wider font-mono text-[#68707C]">
              Trade Review
            </h2>

            <div className="p-4 rounded-xl bg-[#0A0C10] border border-[#1C2129] text-xs space-y-2.5">
              {trade.mistakeCategory || trade.mistakeDescription || (trade.mistakes && trade.mistakes.length > 0) ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-semibold text-[#68707C] font-mono block">
                        Mistake Detected
                      </span>
                      <span className="font-semibold text-sm text-[#F43F5E] mt-0.5 flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-[#F43F5E] shrink-0" />
                        <span>{trade.mistakeCategory || trade.mistakes?.[0] || 'Execution Fault'}</span>
                      </span>
                    </div>

                    {trade.mistakeSeverity && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-[#F43F5E]/10 text-[#F43F5E] border border-[#F43F5E]/30">
                        {trade.mistakeSeverity} Severity
                      </span>
                    )}
                  </div>

                  {trade.mistakeDescription && (
                    <div className="pt-2 border-t border-[#1C2129]/60">
                      <span className="text-[10px] uppercase font-semibold text-[#68707C] font-mono block mb-1">
                        Explanation
                      </span>
                      <p className="text-xs text-[#A1A8B3] leading-relaxed">
                        {trade.mistakeDescription}
                      </p>
                    </div>
                  )}

                  {trade.mistakes && trade.mistakes.length > 1 && (
                    <div className="pt-2 border-t border-[#1C2129]/60 flex flex-wrap gap-1.5">
                      {trade.mistakes.slice(1).map((m, idx) => (
                        <span key={idx} className="px-2 py-0.5 rounded text-[11px] bg-[#12151B] border border-[#1C2129] text-[#A1A8B3]">
                          {m}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-xs text-[#A1A8B3]">
                  No execution mistakes recorded
                </div>
              )}
            </div>
          </section>

          {/* ==================================================================== */}
          {/* 7. PSYCHOLOGY & QUALITY RATING                                       */}
          {/* ==================================================================== */}
          <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Psychology Card */}
            <div className="space-y-2">
              <h2 className="text-[11px] font-semibold uppercase tracking-wider font-mono text-[#68707C]">
                Psychology
              </h2>
              <div className="p-4 rounded-xl bg-[#0A0C10] border border-[#1C2129] text-xs h-[88px] flex flex-col justify-center">
                {trade.emotionalState ? (
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-[#68707C] font-mono block">
                      Emotional State
                    </span>
                    <span className="font-semibold text-sm text-[#F3F4F6] mt-0.5 block">
                      {trade.emotionalState}
                    </span>
                  </div>
                ) : (
                  <span className="text-xs text-[#68707C]">
                    No psychology data recorded
                  </span>
                )}
              </div>
            </div>

            {/* Quality Rating Card */}
            <div className="space-y-2">
              <h2 className="text-[11px] font-semibold uppercase tracking-wider font-mono text-[#68707C]">
                Trade Quality
              </h2>
              <div className="p-4 rounded-xl bg-[#0A0C10] border border-[#1C2129] text-xs h-[88px] flex flex-col justify-center">
                {trade.rating ? (
                  <div>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`w-3.5 h-3.5 ${
                            star <= (trade.rating || 0)
                              ? 'text-amber-400 fill-amber-400'
                              : 'text-[#1C2129] fill-[#12151B]'
                          }`}
                        />
                      ))}
                      <span className="ml-1.5 text-xs font-mono font-medium text-[#A1A8B3]">
                        {trade.rating} / 5
                      </span>
                    </div>
                    <span className="text-[10px] text-[#68707C] font-mono uppercase mt-1 block">
                      User Rating
                    </span>
                  </div>
                ) : (
                  <span className="text-xs text-[#68707C]">
                    No rating assigned
                  </span>
                )}
              </div>
            </div>
          </section>

          {/* ==================================================================== */}
          {/* 8. JOURNAL NOTES                                                     */}
          {/* ==================================================================== */}
          <section className="space-y-2">
            <h2 className="text-[11px] font-semibold uppercase tracking-wider font-mono text-[#68707C]">
              Notes
            </h2>

            <div className="p-4 rounded-xl bg-[#0A0C10] border border-[#1C2129] text-xs">
              {trade.notes && trade.notes.trim().length > 0 ? (
                <p className="text-[#F3F4F6] leading-relaxed whitespace-pre-wrap font-sans text-xs">
                  {trade.notes}
                </p>
              ) : (
                <div className="flex items-center justify-between text-[#68707C]">
                  <span>No notes added</span>
                  <button
                    type="button"
                    onClick={() => onOpenEdit(trade)}
                    className="text-xs text-[#818CF8] hover:text-[#A5B4FC] transition-colors cursor-pointer font-medium flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add note</span>
                  </button>
                </div>
              )}
            </div>
          </section>

          {/* ==================================================================== */}
          {/* 9. CHARTS & ATTACHMENTS                                              */}
          {/* ==================================================================== */}
          <section className="space-y-2">
            <h2 className="text-[11px] font-semibold uppercase tracking-wider font-mono text-[#68707C]">
              Charts & Attachments
            </h2>

            {trade.screenshotUrl || trade.afterScreenshotUrl ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {trade.screenshotUrl && (
                  <div
                    onClick={() => setExpandedImage(trade.screenshotUrl || null)}
                    className="group relative rounded-xl overflow-hidden border border-[#1C2129] bg-[#0A0C10] cursor-pointer hover:border-[#6366F1]/50 transition-colors"
                  >
                    <img
                      src={trade.screenshotUrl}
                      alt="Execution Chart"
                      className="w-full h-44 object-cover object-center group-hover:scale-[1.02] transition-transform duration-200"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-80 group-hover:opacity-100 transition-opacity" />
                    <div className="absolute bottom-2 left-2.5 right-2.5 flex items-center justify-between text-[11px] text-[#F3F4F6] font-mono">
                      <span>Entry Execution</span>
                      <ExternalLink className="w-3.5 h-3.5 text-[#A1A8B3]" />
                    </div>
                  </div>
                )}

                {trade.afterScreenshotUrl && (
                  <div
                    onClick={() => setExpandedImage(trade.afterScreenshotUrl || null)}
                    className="group relative rounded-xl overflow-hidden border border-[#1C2129] bg-[#0A0C10] cursor-pointer hover:border-[#6366F1]/50 transition-colors"
                  >
                    <img
                      src={trade.afterScreenshotUrl}
                      alt="Outcome Chart"
                      className="w-full h-44 object-cover object-center group-hover:scale-[1.02] transition-transform duration-200"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-80 group-hover:opacity-100 transition-opacity" />
                    <div className="absolute bottom-2 left-2.5 right-2.5 flex items-center justify-between text-[11px] text-[#F3F4F6] font-mono">
                      <span>Outcome / Exit</span>
                      <ExternalLink className="w-3.5 h-3.5 text-[#A1A8B3]" />
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-[#0A0C10] border border-[#1C2129] flex items-center justify-between text-xs text-[#68707C]">
                <span>No screenshots attached</span>
                <button
                  type="button"
                  onClick={() => onOpenEdit(trade)}
                  className="text-xs text-[#818CF8] hover:text-[#A5B4FC] transition-colors cursor-pointer font-medium flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add screenshot</span>
                </button>
              </div>
            )}
          </section>

          {/* ==================================================================== */}
          {/* 10. COLLAPSIBLE TRADE DETAILS (SECONDARY METADATA)                   */}
          {/* ==================================================================== */}
          <section className="space-y-2">
            <button
              type="button"
              onClick={() => setIsDetailsCollapsed(!isDetailsCollapsed)}
              className="w-full flex items-center justify-between py-2 text-[11px] font-semibold uppercase tracking-wider font-mono text-[#68707C] hover:text-[#A1A8B3] transition-colors cursor-pointer"
            >
              <span>Trade Details</span>
              <div className="flex items-center gap-1">
                <span>{isDetailsCollapsed ? 'Show' : 'Hide'}</span>
                {isDetailsCollapsed ? (
                  <ChevronDown className="w-3.5 h-3.5" />
                ) : (
                  <ChevronUp className="w-3.5 h-3.5" />
                )}
              </div>
            </button>

            {!isDetailsCollapsed && (
              <div className="rounded-xl bg-[#0A0C10] border border-[#1C2129] p-4 text-xs space-y-2.5">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-3 gap-x-4 text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-[#68707C] font-mono block">
                      Account
                    </span>
                    <span className="text-[#F3F4F6] font-medium mt-0.5 block truncate">
                      {matchedAccount?.name || trade.accountId}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-semibold text-[#68707C] font-mono block">
                      Symbol
                    </span>
                    <span className="text-[#F3F4F6] font-mono font-medium mt-0.5 block">
                      {trade.symbol}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-semibold text-[#68707C] font-mono block">
                      Direction
                    </span>
                    <span className="text-[#F3F4F6] font-mono font-medium mt-0.5 block">
                      {trade.direction}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-semibold text-[#68707C] font-mono block">
                      Market
                    </span>
                    <span className="text-[#F3F4F6] font-medium mt-0.5 block">
                      {trade.market || 'Futures'}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-semibold text-[#68707C] font-mono block">
                      Session
                    </span>
                    <span className="text-[#F3F4F6] font-medium mt-0.5 block">
                      {trade.session || '—'}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-semibold text-[#68707C] font-mono block">
                      Strategy
                    </span>
                    <span className="text-[#F3F4F6] font-medium mt-0.5 block truncate">
                      {matchedStrategy?.name || '—'}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-semibold text-[#68707C] font-mono block">
                      Playbook
                    </span>
                    <span className="text-[#F3F4F6] font-medium mt-0.5 block truncate">
                      {trade.setupType || matchedPlaybook?.name || '—'}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-semibold text-[#68707C] font-mono block">
                      Broker / Platform
                    </span>
                    <span className="text-[#F3F4F6] font-medium mt-0.5 block truncate">
                      {trade.broker || trade.platform || trade.source || 'Manual'}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-semibold text-[#68707C] font-mono block">
                      Order / ID
                    </span>
                    <span className="text-[#A1A8B3] font-mono text-[11px] mt-0.5 block truncate">
                      {trade.orderId || trade.positionId || trade.externalTradeId || trade.id}
                    </span>
                  </div>
                </div>

                {/* Custom Tags if any */}
                {trade.tags && trade.tags.length > 0 && (
                  <div className="pt-2.5 border-t border-[#1C2129]/60">
                    <span className="text-[10px] uppercase font-semibold text-[#68707C] font-mono block mb-1.5">
                      Tags
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {trade.tags.map((tag, idx) => {
                        const color = getTagColor(tag, userSettings.customTags);
                        return (
                          <span
                            key={idx}
                            style={{
                              backgroundColor: hexToRgba(color, 0.12),
                              borderColor: hexToRgba(color, 0.3),
                              color: color,
                            }}
                            className="px-2 py-0.5 rounded text-[11px] font-medium border"
                          >
                            #{tag}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* ==================================================================== */}
          {/* OPTIONAL AI TACTICAL REVIEW (RESTRAINED INSTITUTIONAL STYLE)         */}
          {/* ==================================================================== */}
          <section className="p-4 rounded-xl bg-[#0A0C10] border border-[#1C2129] space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bot className="w-4 h-4 text-[#818CF8]" />
                <span className="text-xs font-semibold text-[#F3F4F6]">
                  Tactical Execution Audit
                </span>
              </div>

              {!aiReview && (
                <button
                  type="button"
                  onClick={handleRunAiAudit}
                  disabled={isLoadingAi}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border border-[#1C2129] bg-[#0F1217] hover:bg-[#12151B] text-[#A1A8B3] hover:text-[#F3F4F6] font-medium transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#818CF8]" />
                  <span>{isLoadingAi ? 'Auditing...' : 'Run Audit'}</span>
                </button>
              )}
            </div>

            {aiReview && (
              <div className="space-y-3 pt-2 border-t border-[#1C2129]/60">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#A1A8B3]">Audit Score</span>
                  <span className="font-mono font-bold text-sm text-[#10B981]">
                    {aiReview.score} / 100
                  </span>
                </div>
                <p className="text-xs text-[#F3F4F6] leading-relaxed">
                  {aiReview.executiveSummary}
                </p>

                {(aiReview.strengths?.length || 0) > 0 && (
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono uppercase font-semibold text-[#10B981] block">
                      Strengths
                    </span>
                    {aiReview.strengths.map((s, i) => (
                      <div key={i} className="text-xs text-[#A1A8B3] flex items-start gap-1.5">
                        <span className="text-[#10B981]">•</span>
                        <span>{s}</span>
                      </div>
                    ))}
                  </div>
                )}

                {(aiReview.mistakesIdentified?.length || 0) > 0 && (
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono uppercase font-semibold text-[#F43F5E] block">
                      Identified Mistakes
                    </span>
                    {aiReview.mistakesIdentified.map((m, i) => (
                      <div key={i} className="text-xs text-[#A1A8B3] flex items-start gap-1.5">
                        <span className="text-[#F43F5E]">•</span>
                        <span>{m}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </section>

        </div>

        {/* ==================================================================== */}
        {/* FOOTER ACTIONS                                                       */}
        {/* ==================================================================== */}
        <div className="px-6 py-3.5 border-t border-[#1C2129] bg-[#0A0C10] flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={handleShareToLounge}
            className="flex items-center gap-1.5 text-xs text-[#A1A8B3] hover:text-[#F3F4F6] font-medium transition-colors cursor-pointer"
          >
            <Share2 className="w-3.5 h-3.5 text-[#818CF8]" />
            <span>Share Trade</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-[#0F1217] hover:bg-[#12151B] border border-[#1C2129] text-xs font-medium text-[#F3F4F6] transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>

        {/* ==================================================================== */}
        {/* DELETE CONFIRMATION MODAL                                            */}
        {/* ==================================================================== */}
        {isConfirmDeleteOpen && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
            <div className="w-full max-w-sm rounded-xl border border-rose-500/30 bg-[#0A0C10] p-5 shadow-2xl space-y-3">
              <div className="flex items-center gap-2.5 text-[#F43F5E]">
                <AlertTriangle className="w-5 h-5" />
                <h4 className="text-sm font-semibold text-[#F3F4F6]">
                  Delete Trade?
                </h4>
              </div>
              <p className="text-xs text-[#A1A8B3] leading-relaxed">
                Are you sure you want to permanently delete trade #{shortId} ({trade.symbol} {trade.direction})? This action cannot be undone.
              </p>
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsConfirmDeleteOpen(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-[#A1A8B3] hover:text-[#F3F4F6] bg-[#0F1217] border border-[#1C2129] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  className="px-3.5 py-1.5 rounded-lg bg-[#F43F5E] hover:bg-rose-600 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                >
                  Delete Forever
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ==================================================================== */}
        {/* IMAGE LIGHTBOX MODAL                                                 */}
        {/* ==================================================================== */}
        {expandedImage && (
          <div
            className="fixed inset-0 z-60 flex items-center justify-center bg-black/90 p-4"
            onClick={() => setExpandedImage(null)}
          >
            <div className="relative max-w-5xl max-h-[90vh] overflow-hidden" onClick={e => e.stopPropagation()}>
              <button
                type="button"
                onClick={() => setExpandedImage(null)}
                className="absolute top-3 right-3 p-2 rounded-xl bg-black/70 hover:bg-black text-[#F3F4F6] border border-[#1C2129] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
              <img
                src={expandedImage}
                alt="Enlarged Trade Chart"
                className="max-w-full max-h-[85vh] object-contain rounded-xl border border-[#1C2129]"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
