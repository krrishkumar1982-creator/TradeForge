import React, { useState } from 'react';
import {
  X,
  Bot,
  Sparkles,
  TrendingUp,
  Clock,
  ShieldCheck,
  AlertTriangle,
  Smile,
  Frown,
  Share2,
  Edit2,
  Trash2,
  Copy,
  CheckCircle2,
  Calendar,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Shield,
  Star,
  Tag
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

  if (!trade) return null;

  const matchedPlaybook = playbooks.find(p => p.name === trade.setupType);
  const isWin = trade.netPnl > 0;
  const isLoss = trade.netPnl < 0;

  const handleRunAiAudit = async () => {
    setIsLoadingAi(true);
    try {
      const result = await generateAiTradeReview(trade, matchedPlaybook);
      setAiReview(result);
      addToast('AI Audit Complete', `Scored ${result.score}/100 with tactical review`, 'success');
    } catch (err) {
      addToast('Error', 'Could not run AI critique', 'error');
    } finally {
      setIsLoadingAi(false);
    }
  };

  const handleShareToLounge = () => {
    addCommunityPost(
      `Just closed ${trade.symbol} ${trade.direction} for ${formatCurrency(trade.netPnl)} (${formatRMultiple(trade.rMultiple)}). Setup: ${trade.setupType}. Notes: ${trade.notes}`,
      trade.symbol,
      formatCurrency(trade.netPnl),
      formatRMultiple(trade.rMultiple)
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div
        className="w-full max-w-2xl h-full bg-[#12161D] border-l border-[#1C232E] shadow-2xl flex flex-col animate-in slide-in-from-right duration-200 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1C232E] bg-[#07090D]">
          <div className="flex items-center gap-3">
            <span
              className={`px-2.5 py-1 rounded-lg text-xs font-black tracking-wide ${
                trade.direction === 'BUY'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
              }`}
            >
              {trade.direction}
            </span>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                {trade.symbol}
                <span className="text-xs font-mono text-slate-400 font-normal">
                  #{trade?.id ? (trade.id.length > 6 ? trade.id.substring(trade.id.length - 6) : trade.id) : ''}
                </span>
                {trade.propFirmAccountId && (() => {
                  const pf = propFirmAccounts.find(p => p.id === trade.propFirmAccountId);
                  return (
                    <span
                      className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/15 text-blue-300 border border-blue-500/30 flex items-center gap-1"
                      title={pf ? `${pf.name} • ${pf.firmName}` : 'Prop Firm Linked'}
                    >
                      <Shield className="w-2.5 h-2.5 text-blue-400" />
                      <span>{pf?.firmName || 'Prop Firm'}</span>
                    </span>
                  );
                })()}
              </h2>
              <div className="flex items-center gap-2 flex-wrap text-[11px] text-slate-400 font-mono mt-0.5">
                <span>{(trade?.entryDate ? new Date(trade.entryDate) : new Date()).toLocaleString()}</span>
                <span>•</span>
                <span>{trade?.session || 'New York'} Session</span>
                <span>•</span>
                <span className="text-slate-300">
                  {accounts.find(a => a.id === trade.accountId)?.name || 'Account'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onOpenEdit(trade)}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-[#1A1F27] transition"
              title="Edit Trade"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => duplicateTrade(trade.id)}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-[#1A1F27] transition"
              title="Duplicate"
            >
              <Copy className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                deleteTrade(trade.id);
                onClose();
              }}
              className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-[#1A1F27] transition"
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-[#1A1F27] transition ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-[#12161D]">
          {/* Main P&L Banner */}
          <div className="p-4 rounded-2xl bg-[#0A0D14] border border-[#1C232E] flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="text-xs text-slate-400">Realized Net P&L</span>
              <div
                className={`text-2xl sm:text-3xl font-black font-mono tracking-tight ${
                  isWin ? 'text-emerald-400' : isLoss ? 'text-rose-400' : 'text-slate-400'
                }`}
              >
                {formatCurrency(trade.netPnl)}
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs font-mono">
              <div>
                <span className="text-[10px] text-slate-500 block">R-Multiple</span>
                <span className={`font-bold text-sm ${trade.rMultiple >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {formatRMultiple(trade.rMultiple)}
                </span>
              </div>
              <div className="border-l border-[#1C232E] pl-4">
                <span className="text-[10px] text-slate-500 block">Duration</span>
                <span className="font-bold text-sm text-slate-200">{trade.durationMinutes} mins</span>
              </div>
              <div className="border-l border-[#1C232E] pl-4">
                <span className="text-[10px] text-slate-500 block">Commission & Fees</span>
                <span className="font-bold text-sm text-slate-400">${trade.commission.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Execution Details Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#0A0D14] p-4 rounded-2xl border border-[#1C232E] text-xs">
            <div>
              <span className="text-slate-500 block text-[10px]">Entry Price</span>
              <span className="font-mono font-bold text-slate-100">${trade.entryPrice}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px]">Exit Price</span>
              <span className="font-mono font-bold text-slate-100">{trade.exitPrice ? `$${trade.exitPrice}` : 'Open'}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px]">Stop Loss</span>
              <span className="font-mono font-bold text-rose-400">{trade.stopLoss ? `$${trade.stopLoss}` : 'None'}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px]">Take Profit</span>
              <span className="font-mono font-bold text-emerald-400">{trade.takeProfit ? `$${trade.takeProfit}` : 'None'}</span>
            </div>
          </div>

          {/* Setup & Discipline Status */}
          <div className="p-4 rounded-2xl bg-[#0A0D14] border border-[#1C232E] space-y-3">
            <div className="flex items-center justify-between text-xs border-b border-[#1C232E] pb-2.5">
              <span className="text-slate-400 font-medium">Assigned Playbook & Setup</span>
              <div className="flex items-center gap-2">
                <span className="font-bold text-blue-400">{trade.setupType}</span>
                {trade.setupGrade && (
                  <span className={`px-2 py-0.5 rounded text-[11px] font-mono font-black ${
                    trade.setupGrade === 'A+' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                    trade.setupGrade === 'A' ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/20' :
                    trade.setupGrade === 'B' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' :
                    trade.setupGrade === 'C' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                    'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                  }`}>
                    Grade {trade.setupGrade}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-medium">Rule Adherence Compliance</span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[11px] font-bold text-slate-300">
                  {trade.ruleCompliancePercent !== undefined ? `${trade.ruleCompliancePercent}%` : trade.rulesFollowed ? '100%' : '< 100%'}
                </span>
                <span
                  className={`font-semibold px-2 py-0.5 rounded text-[11px] ${
                    trade.rulesFollowed || trade.ruleCompliancePercent === 100
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                  }`}
                >
                  {trade.rulesFollowed || trade.ruleCompliancePercent === 100 ? '100% Rules Followed' : 'Rule Violation Detected'}
                </span>
              </div>
            </div>

            {/* Display rule breakdown if matchedPlaybook exists */}
            {matchedPlaybook && matchedPlaybook.rules && matchedPlaybook.rules.length > 0 && (
              <div className="pt-2 border-t border-[#1C232E] space-y-1.5">
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">Rule Execution Verification:</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {matchedPlaybook.rules.map((rule) => {
                    const isChecked = trade.checkedRuleIds ? trade.checkedRuleIds.includes(rule.id) : trade.rulesFollowed;
                    return (
                      <div
                        key={rule.id}
                        className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-[11px] ${
                          isChecked
                            ? 'bg-emerald-950/20 border-emerald-500/20 text-emerald-200'
                            : 'bg-rose-950/20 border-rose-500/20 text-rose-300 line-through opacity-80'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isChecked ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                        <span className="truncate">{rule.text}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Mistake Detail Card */}
            {(trade.mistakeCategory || trade.mistakeDescription || (trade.mistakes && trade.mistakes.length > 0)) && (
              <div className="p-3 rounded-xl bg-rose-950/20 border border-rose-500/30 space-y-1 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-rose-400 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                    <span>Mistake: {trade.mistakeCategory || 'Execution Fault'}</span>
                  </span>
                  {trade.mistakeSeverity && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-rose-500/20 text-rose-300 border border-rose-500/30">
                      {trade.mistakeSeverity} Severity
                    </span>
                  )}
                </div>
                <p className="text-slate-300 text-[11px]">
                  {trade.mistakeDescription || (trade.mistakes && trade.mistakes.join(', '))}
                </p>
              </div>
            )}

            <div className="flex items-center justify-between text-xs pt-1 border-t border-[#1C232E]">
              <span className="text-slate-400 font-medium">Emotional Baseline</span>
              <span className="text-slate-200 font-medium">{trade.emotionalState || 'Disciplined & Calm'}</span>
            </div>

            {/* Quality Rating */}
            {trade.rating && (
              <div className="flex items-center justify-between text-xs pt-1 border-t border-[#1C232E]">
                <span className="text-slate-400 font-medium">Quality Rating</span>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-3.5 h-3.5 ${
                        star <= (trade.rating || 0)
                          ? 'text-amber-400 fill-amber-400'
                          : 'text-slate-700'
                      }`}
                    />
                  ))}
                  <span className="ml-1 text-[11px] font-mono text-slate-400">
                    {trade.rating}/5
                  </span>
                </div>
              </div>
            )}

            {/* Custom Tags */}
            {trade.tags && trade.tags.length > 0 && (
              <div className="pt-2 border-t border-[#1C232E] space-y-1.5">
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider flex items-center gap-1">
                  <Tag className="w-3 h-3 text-blue-400" />
                  <span>Custom Tags:</span>
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {trade.tags.map((tag, idx) => {
                    const color = getTagColor(tag, userSettings.customTags);
                    return (
                      <span
                        key={idx}
                        style={{
                          backgroundColor: hexToRgba(color, 0.15),
                          borderColor: hexToRgba(color, 0.4),
                          color: color,
                        }}
                        className="px-2.5 py-0.5 rounded-full text-[11px] font-medium border inline-flex items-center gap-1 shadow-xs"
                      >
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
                        #{tag}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* AI Trading Coach Audit Card */}
          <div className="p-5 rounded-2xl border border-blue-500/30 bg-[#1A1F27] space-y-4 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-blue-600/30 text-blue-300">
                  <Bot className="w-4 h-4" />
                </div>
                <h3 className="text-xs font-bold text-blue-200 uppercase tracking-wider">
                  AI Tactical Trade Audit
                </h3>
              </div>
              {!aiReview && (
                <button
                  onClick={handleRunAiAudit}
                  disabled={isLoadingAi}
                  className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-3 py-1.5 text-xs font-semibold shadow-md shadow-blue-600/20 transition disabled:opacity-50"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{isLoadingAi ? 'Auditing...' : 'Run AI Review'}</span>
                </button>
              )}
            </div>

            {aiReview ? (
              <div className="space-y-3 text-xs animate-in fade-in">
                {/* Score badge */}
                <div className="flex items-center justify-between bg-[#0A0D14] p-3 rounded-xl border border-blue-500/20">
                  <span className="text-slate-300 font-medium">Execution Quality Score</span>
                  <span className="text-base font-black font-mono text-emerald-400">{aiReview.score} / 100</span>
                </div>

                {/* Executive Summary */}
                <p className="text-slate-200 leading-relaxed font-sans">{aiReview.executiveSummary}</p>

                {/* Strengths */}
                {(aiReview.strengths?.length || 0) > 0 && (
                  <div className="space-y-1">
                    <div className="text-[11px] font-bold text-emerald-400 uppercase">Key Strengths</div>
                    {aiReview.strengths.map((s, i) => (
                      <div key={i} className="text-slate-300 flex items-start gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        <span>{s}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Mistakes */}
                {(aiReview.mistakesIdentified?.length || 0) > 0 && (
                  <div className="space-y-1">
                    <div className="text-[11px] font-bold text-rose-400 uppercase">Critical Mistakes</div>
                    {aiReview.mistakesIdentified.map((m, i) => (
                      <div key={i} className="text-slate-300 flex items-start gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                        <span>{m}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Actionable steps */}
                {(aiReview.actionableSteps?.length || 0) > 0 && (
                  <div className="space-y-1 pt-1">
                    <div className="text-[11px] font-bold text-blue-400 uppercase">Action Plan for Next Trade</div>
                    {aiReview.actionableSteps.map((step, i) => (
                      <div key={i} className="text-slate-300 font-mono text-[11px]">
                        • {step}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-slate-400">
                Click "Run AI Review" to generate an institutional critique on execution, R-multiple capture, and psychological bias for this trade.
              </p>
            )}
          </div>

          {/* Trade Chart Attachment */}
          {trade.screenshotUrl && (
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Execution Chart Screenshot
              </label>
              <div className="rounded-xl overflow-hidden border border-[#1C232E] bg-[#0A0D14]">
                <img src={trade.screenshotUrl} alt="Execution Chart" className="w-full h-auto max-h-72 object-contain" />
              </div>
            </div>
          )}

          {/* Trader Notes */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Trader Journal Notes
            </label>
            <div className="p-4 rounded-xl bg-[#0A0D14] border border-[#1C232E] text-xs text-slate-300 font-mono leading-relaxed">
              {trade.notes || 'No custom notes logged for this trade execution.'}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-[#1C232E] bg-[#07090D] flex items-center justify-between">
          <button
            onClick={handleShareToLounge}
            className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 font-semibold cursor-pointer"
          >
            <Share2 className="w-4 h-4" />
            <span>Share in Traders Lounge</span>
          </button>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[#1A1F27] hover:bg-[#222834] border border-[#1C232E] text-xs font-semibold text-slate-200 cursor-pointer"
          >
            Close Drawer
          </button>
        </div>
      </div>
      <div className="flex-1" onClick={onClose} />
    </div>
  );
};
