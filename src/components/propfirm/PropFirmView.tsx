import React, { useState, useMemo } from 'react';
import {
  Shield,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Plus,
  TrendingUp,
  DollarSign,
  Calendar,
  Clock,
  Scale,
  Award,
  AlertOctagon,
  FileText,
  Sliders,
  Sparkles,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  Info,
  Check,
  RefreshCw,
  ExternalLink,
  Edit2,
  Trash2,
  Copy,
  Zap,
  Globe,
  Lock,
  Wallet,
  Building,
  FileCode,
  CheckSquare
} from 'lucide-react';
import { useTrading } from '../../context/TradingContext';
import {
  PropFirmAccount,
  PropFirmRule,
  PropFirmPhase,
  ProgramModelType,
  DrawdownModelType,
  DailyDrawdownModelType,
  PropFirmEnforcementMode,
} from '../../types';
import {
  PropFirmEngine,
  PROP_FIRM_TEMPLATES,
} from '../../services/propFirmEngine';
import { INITIAL_ECONOMIC_EVENTS } from '../../data/mockData';
import { PropFirmWizardModal } from './PropFirmWizardModal';

export const PropFirmView: React.FC = () => {
  const {
    theme,
    accounts,
    propFirmAccounts,
    selectedPropFirmAccountId,
    setSelectedPropFirmAccountId,
    addPropFirmAccount,
    updatePropFirmAccount,
    deletePropFirmAccount,
    recordPropFirmPayout,
    trades,
    addToast,
    formatCurrency,
  } = useTrading();

  const isLight = theme === 'light';

  const economicEvents = INITIAL_ECONOMIC_EVENTS;

  // Active Sub-Navigation Tab
  const [activeTab, setActiveTab] = useState<
    'overview' | 'rules' | 'pre-trade' | 'days' | 'exposures' | 'payouts' | 'violations'
  >('overview');

  // Modal Controls
  const [isAddAccountModalOpen, setIsAddAccountModalOpen] = useState(false);
  const [isEditAccountModalOpen, setIsEditAccountModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [accountPendingDelete, setAccountPendingDelete] = useState<PropFirmAccount | null>(null);
  const [isAddRuleModalOpen, setIsAddRuleModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<PropFirmRule | null>(null);
  const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false);

  // Edit Account Form State
  const [editAccountName, setEditAccountName] = useState<string>('');
  const [editStartingBalance, setEditStartingBalance] = useState<number>(50000);
  const [editDailyLossPercent, setEditDailyLossPercent] = useState<number>(4);
  const [editTotalLossPercent, setEditTotalLossPercent] = useState<number>(10);
  const [editTargetPercent, setEditTargetPercent] = useState<number>(8);
  const [editEnforcementMode, setEditEnforcementMode] = useState<PropFirmEnforcementMode>('MONITOR');

  // Selected Account
  const activeAccount = useMemo(() => {
    return (
      propFirmAccounts.find((a) => a.id === selectedPropFirmAccountId) ||
      propFirmAccounts[0] ||
      null
    );
  }, [propFirmAccounts, selectedPropFirmAccountId]);

  // Closed trades linked to active account
  const accountTrades = useMemo(() => {
    if (!activeAccount) return [];
    return trades.filter((t) => {
      if (t.status !== 'CLOSED') return false;
      // 1. Direct link by prop firm account id takes precedence
      if (t.propFirmAccountId === activeAccount.id) return true;
      // 2. If trade is explicitly assigned to another prop firm account, exclude it
      if (t.propFirmAccountId && t.propFirmAccountId !== activeAccount.id) return false;
      // 3. Fallback to broker account link if designated
      if (activeAccount.tradingAccountLink && activeAccount.tradingAccountLink !== 'all') {
        return t.accountId === activeAccount.tradingAccountLink;
      }
      return false;
    });
  }, [activeAccount, trades]);

  // Live Calculations from Engine (Comprehensive Multi-Phase & 20-Rule Evaluator)
  const evaluation = useMemo(() => {
    if (!activeAccount) return null;
    return PropFirmEngine.evaluatePropFirmAccount(activeAccount, accountTrades, economicEvents || []);
  }, [activeAccount, accountTrades, economicEvents]);

  const handleAdvancePhase = () => {
    if (!activeAccount) return;
    const updated = PropFirmEngine.advanceAccountPhase(activeAccount);
    updatePropFirmAccount(updated);
    addToast('Phase Advanced!', `Account advanced to ${updated.phaseName || updated.phase}`, 'success');
  };

  const maxDrawdownData = useMemo(() => {
    if (!activeAccount) return null;
    return PropFirmEngine.calculateMaxDrawdown(activeAccount, accountTrades);
  }, [activeAccount, accountTrades]);

  const dailyDrawdownData = useMemo(() => {
    if (!activeAccount) return null;
    return PropFirmEngine.calculateDailyDrawdown(activeAccount, accountTrades);
  }, [activeAccount, accountTrades]);

  const profitTargetData = useMemo(() => {
    if (!activeAccount) return null;
    return PropFirmEngine.calculateProfitTarget(activeAccount);
  }, [activeAccount]);

  const tradingDaysData = useMemo(() => {
    if (!activeAccount) return null;
    return PropFirmEngine.calculateTradingDays(activeAccount, accountTrades);
  }, [activeAccount, accountTrades]);

  const consistencyData = useMemo(() => {
    if (!activeAccount) return null;
    return PropFirmEngine.calculateConsistency(activeAccount, accountTrades);
  }, [activeAccount, accountTrades]);

  const symbolRiskData = useMemo(() => {
    if (!activeAccount) return [];
    return PropFirmEngine.calculateSymbolRiskExposure(activeAccount, accountTrades);
  }, [activeAccount, accountTrades]);

  const durationData = useMemo(() => {
    if (!activeAccount) return null;
    return PropFirmEngine.calculateTradeDurations(activeAccount, accountTrades);
  }, [activeAccount, accountTrades]);

  const inactivityData = useMemo(() => {
    if (!activeAccount) return null;
    return PropFirmEngine.calculateInactivity(activeAccount, accountTrades);
  }, [activeAccount, accountTrades]);

  const payoutData = useMemo(() => {
    if (!activeAccount) return null;
    return PropFirmEngine.calculatePayoutEligibility(activeAccount);
  }, [activeAccount]);

  const newsData = useMemo(() => {
    if (!activeAccount) return null;
    return PropFirmEngine.calculateNewsCompliance(activeAccount, accountTrades, economicEvents || []);
  }, [activeAccount, accountTrades, economicEvents]);

  // Pre-Trade Order Simulator Inputs
  const [preTradeSymbol, setPreTradeSymbol] = useState('NQ');
  const [preTradeDirection, setPreTradeDirection] = useState<'BUY' | 'SELL'>('BUY');
  const [preTradeQuantity, setPreTradeQuantity] = useState(2);
  const [preTradeStopLossPoints, setPreTradeStopLossPoints] = useState(15);
  const [preTradePointMultiplier, setPreTradePointMultiplier] = useState(20);
  const [preTradeValidation, setPreTradeValidation] = useState<any>(null);

  const handleRunPreTradeCheck = () => {
    if (!activeAccount) return;
    const estRisk = preTradeQuantity * preTradeStopLossPoints * preTradePointMultiplier;
    const result = PropFirmEngine.validatePreTrade(activeAccount, accountTrades, {
      symbol: preTradeSymbol,
      direction: preTradeDirection,
      quantity: preTradeQuantity,
      stopLossPoints: preTradeStopLossPoints,
      estimatedRiskDollar: estRisk,
    });
    setPreTradeValidation({ ...result, estRisk });
  };

  // Quick State badge styling helper
  const getRiskStateBadge = (state: string) => {
    switch (state) {
      case 'SAFE':
        return (
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
            isLight
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-emerald-950/70 border-emerald-500/30 text-emerald-400'
          }`}>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            SAFE
          </span>
        );
      case 'WARNING':
        return (
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
            isLight
              ? 'bg-amber-50 text-amber-700 border-amber-200'
              : 'bg-amber-950/70 border-amber-500/30 text-amber-400'
          }`}>
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            WARNING
          </span>
        );
      case 'CRITICAL':
        return (
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
            isLight
              ? 'bg-rose-50 text-rose-700 border-rose-200'
              : 'bg-rose-950/70 border-rose-500/30 text-rose-400'
          }`}>
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
            CRITICAL
          </span>
        );
      case 'BREACHED':
        return (
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
            isLight
              ? 'bg-red-50 text-red-700 border-red-200'
              : 'bg-red-950/90 border-red-500/50 text-red-300'
          }`}>
            <AlertOctagon className="w-3.5 h-3.5 text-red-500" />
            RULE BREACHED
          </span>
        );
      default:
        return null;
    }
  };

  const handleAccountCreated = (newAccount: PropFirmAccount) => {
    addPropFirmAccount(newAccount);
    setSelectedPropFirmAccountId(newAccount.id);
    setIsAddAccountModalOpen(false);
    addToast('Account Initialized', `Successfully initialized ${newAccount.name}`, 'success');
  };

  const handleOpenEditModal = () => {
    if (!activeAccount) return;
    setEditAccountName(activeAccount.name);
    setEditStartingBalance(activeAccount.startingBalance);
    setEditDailyLossPercent(activeAccount.dailyLossPercent || 4);
    setEditTotalLossPercent(activeAccount.totalLossPercent || 10);
    setEditTargetPercent(activeAccount.profitTargetPercent || 0);
    setEditEnforcementMode(activeAccount.enforcementMode || 'MONITOR');
    setIsEditAccountModalOpen(true);
  };

  const handleEditAccountSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!activeAccount) return;
    const updated: PropFirmAccount = {
      ...activeAccount,
      name: editAccountName.trim() || activeAccount.name,
      startingBalance: editStartingBalance,
      profitTargetPercent: editTargetPercent,
      dailyLossPercent: editDailyLossPercent,
      totalLossPercent: editTotalLossPercent,
      enforcementMode: editEnforcementMode,
    };
    updatePropFirmAccount(updated);
    setIsEditAccountModalOpen(false);
    addToast('Account Saved', `${updated.name} updated successfully`, 'success');
  };

  const handleOpenDeleteModal = () => {
    if (!activeAccount) return;
    setAccountPendingDelete(activeAccount);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDeleteAccount = () => {
    const target = accountPendingDelete || activeAccount;
    if (!target) return;
    const name = target.name;
    deletePropFirmAccount(target.id);
    setIsDeleteModalOpen(false);
    setAccountPendingDelete(null);
    addToast('Account Removed', `Prop firm account "${name}" has been deleted.`, 'info');
  };

  return (
    <div className={`max-w-7xl w-full mx-auto space-y-6 animate-fadeIn ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
      {!activeAccount ? (
        <div className={`p-8 sm:p-12 rounded-2xl border text-center space-y-4 max-w-xl mx-auto shadow-lg ${
          isLight ? 'bg-white border-[#E3E7EE] shadow-slate-200/50' : 'bg-[#12161D] border-[#1C232E]'
        }`}>
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600/20 via-indigo-600/20 to-purple-600/20 border border-indigo-500/30 text-indigo-400 mx-auto flex items-center justify-center">
            <Shield className="w-7 h-7" />
          </div>
          <div className="space-y-1.5">
            <h2 className={`text-xl font-bold tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
              No Prop Firm Accounts Configured
            </h2>
            <p className={`text-xs sm:text-sm leading-relaxed max-w-md mx-auto ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
              Create an evaluation account or load an institutional rule template (LegionFunding, FTMO, Topstep, Apex) to begin live compliance tracking.
            </p>
          </div>
          <button
            onClick={() => setIsAddAccountModalOpen(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white text-xs font-bold transition cursor-pointer active:scale-95 shadow-md shadow-indigo-600/25 border border-indigo-400/30"
          >
            <Plus className="w-4 h-4" />
            <span>Create Prop Firm Account</span>
          </button>
        </div>
      ) : (
        <>
          {/* Top Header Card */}
          <div className={`p-5 sm:p-6 rounded-2xl border shadow-lg flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${
            isLight ? 'bg-white border-[#E3E7EE] shadow-slate-200/50' : 'bg-[#12161D] border-[#1C232E] shadow-black/30'
          }`}>
            <div>
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl border shrink-0 ${
                  isLight
                    ? 'bg-blue-50 border-blue-200 text-blue-600'
                    : 'bg-gradient-to-br from-blue-600/20 to-purple-600/20 border-blue-500/30 text-blue-400'
                }`}>
                  <Shield className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2.5 text-left flex-wrap">
                    <h1 className={`text-xl sm:text-2xl font-bold tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
                      Prop Firm Hub
                    </h1>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                      isLight ? 'bg-purple-50 border-purple-200 text-purple-700' : 'bg-purple-500/10 border-purple-500/30 text-purple-300'
                    }`}>
                      Rules Engine
                    </span>
                    {/* Institutional Verified Badge with Pulse */}
                    <div className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold border ${
                      isLight
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.15)]'
                    }`}>
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                      </span>
                      <span>Telemetry Active</span>
                    </div>
                  </div>
                  <p className={`text-xs sm:text-sm mt-0.5 text-left flex items-center gap-1.5 flex-wrap ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                    <span>Institutional risk state monitor & multi-account compliance matrix.</span>
                    <span className={`text-[11px] font-mono ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>•</span>
                    <span className={`text-[11px] font-mono font-medium ${isLight ? 'text-indigo-600' : 'text-indigo-400'}`}>
                      Buffer: {(maxDrawdownData?.bufferPercent ?? 0).toFixed(1)}% Safe
                    </span>
                  </p>
                </div>
              </div>
            </div>

            {/* Account Selector Pills & New Account Button */}
            <div className="flex flex-wrap items-center gap-2.5">
              <div className={`flex items-center p-1.5 rounded-xl border overflow-x-auto max-w-full ${
                isLight ? 'bg-[#F8F9FB] border-[#E3E7EE]' : 'bg-[#0A0D14] border-[#1C232E]'
              }`}>
                {propFirmAccounts.map((acc) => {
                  const isSelected = acc.id === activeAccount.id;
                  return (
                    <button
                      key={acc.id}
                      onClick={() => setSelectedPropFirmAccountId(acc.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                        isSelected
                          ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-600/25 border border-indigo-400/30'
                          : isLight
                          ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
                          : 'text-slate-400 hover:text-white hover:bg-[#1A1F27]'
                      }`}
                    >
                      <span>{acc.name}</span>
                      <span
                        className={`w-2 h-2 rounded-full ${
                          acc.riskState === 'SAFE'
                            ? 'bg-emerald-500 shadow-[0_0_8px_#10B981]'
                            : acc.riskState === 'WARNING'
                            ? 'bg-amber-500 shadow-[0_0_8px_#F59E0B]'
                            : acc.riskState === 'CRITICAL'
                            ? 'bg-rose-500 shadow-[0_0_8px_#F43F5E]'
                            : 'bg-red-500 shadow-[0_0_8px_#EF4444]'
                        }`}
                      />
                    </button>
                  );
                })}
              </div>

              <button
                onClick={handleOpenEditModal}
                title="Edit Account Rules & Settings"
                className={`p-2 rounded-xl border text-xs font-bold transition cursor-pointer ${
                  isLight
                    ? 'bg-white hover:bg-slate-100 text-slate-700 hover:text-slate-900 border-[#E3E7EE]'
                    : 'bg-[#1A1F27] hover:bg-[#222936] text-slate-300 hover:text-white border-[#1C232E]'
                }`}
              >
                <Edit2 className="w-4 h-4" />
              </button>

              <button
                id="delete-prop-firm-account-button"
                onClick={handleOpenDeleteModal}
                title="Delete Prop Firm Account"
                aria-label="Delete Prop Firm Account"
                className={`p-2 rounded-xl border text-xs font-bold transition-all duration-150 cursor-pointer active:scale-95 flex items-center justify-center ${
                  isLight
                    ? 'bg-white hover:bg-rose-50 text-slate-500 hover:text-rose-600 border-[#E3E7EE] hover:border-rose-300 shadow-xs'
                    : 'bg-[#1A1F27] hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border-[#1C232E] hover:border-rose-500/40 shadow-xs'
                }`}
              >
                <Trash2 className="w-4 h-4" />
              </button>

              <button
                onClick={() => setIsAddAccountModalOpen(true)}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white text-xs font-bold transition shadow-md shadow-indigo-600/25 border border-indigo-400/30 active:scale-95 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Account</span>
              </button>
            </div>
          </div>

      {/* Legal Entity & Institution Banner for LegionFunding */}
      <div className={`p-4 rounded-2xl border flex flex-wrap items-center justify-between gap-3 text-xs ${
        isLight ? 'bg-white border-[#E3E7EE]' : 'bg-[#12161D] border-[#1C232E]'
      }`}>
        <div className="flex items-center gap-3">
          <Building className={`w-4 h-4 shrink-0 ${isLight ? 'text-blue-600' : 'text-blue-400'}`} />
          <div className="space-x-2">
            <span className={`font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>Legal Entity:</span>
            <span className={isLight ? 'text-slate-700' : 'text-slate-300'}>{activeAccount.legalEntity || 'Hyper Funded Ltd.'}</span>
            <span className={isLight ? 'text-slate-300' : 'text-slate-600'}>•</span>
            <span className={`font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>Trading Brand:</span>
            <span className={isLight ? 'text-slate-700' : 'text-slate-300'}>{activeAccount.tradingBrand || activeAccount.firmName}</span>
            <span className={isLight ? 'text-slate-300' : 'text-slate-600'}>•</span>
            <span className={`font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>Registration:</span>
            <span className={`font-mono font-semibold ${isLight ? 'text-blue-700' : 'text-blue-300'}`}>{activeAccount.registrationNumber || '2026-00324'}</span>
            <span className={isLight ? 'text-slate-300' : 'text-slate-600'}>•</span>
            <span className={`font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>Jurisdiction:</span>
            <span className={isLight ? 'text-slate-700' : 'text-slate-300'}>{activeAccount.jurisdiction || 'Saint Lucia'}</span>
          </div>
        </div>
        <div className={`flex items-center gap-2 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
          <span>Effective: {activeAccount.termsEffectiveDate || '1 July 2026'}</span>
          <span className={`px-2 py-0.5 rounded font-mono text-[10px] border ${
            isLight ? 'bg-slate-100 text-slate-700 border-slate-200' : 'bg-[#1A1F27] text-slate-300 border-[#1C232E]'
          }`}>
            Mode: {activeAccount.enforcementMode || 'MONITOR'}
          </span>
        </div>
      </div>

      {/* Live Risk State & Advice Banner */}
      <div
        className={`p-5 sm:p-6 rounded-2xl border transition backdrop-blur-2xl ${
          evaluation?.riskState === 'SAFE'
            ? isLight ? 'bg-emerald-50/80 border-emerald-200' : 'bg-emerald-950/20 border-emerald-500/30'
            : evaluation?.riskState === 'WARNING'
            ? isLight ? 'bg-amber-50/80 border-amber-200' : 'bg-amber-950/20 border-amber-500/35'
            : evaluation?.riskState === 'CRITICAL'
            ? isLight ? 'bg-rose-50/80 border-rose-200' : 'bg-rose-950/25 border-rose-500/45'
            : isLight ? 'bg-red-50/80 border-red-200' : 'bg-red-950/30 border-red-500/50'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-4 text-left">
            <div className={`p-3 rounded-2xl border shrink-0 ${
              isLight ? 'bg-white/80 border-slate-200 shadow-sm' : 'bg-white/[0.05] border-white/15'
            }`}>
              {evaluation?.riskState === 'SAFE' ? (
                <CheckCircle2 className="w-6 h-6 text-emerald-500" />
              ) : evaluation?.riskState === 'WARNING' ? (
                <AlertTriangle className="w-6 h-6 text-amber-500" />
              ) : (
                <AlertOctagon className="w-6 h-6 text-rose-500 animate-pulse" />
              )}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                {getRiskStateBadge(evaluation?.riskState || 'SAFE')}
                <span className={`text-xs sm:text-sm font-bold ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
                  {activeAccount.firmName} • {activeAccount.phaseName || activeAccount.phase}
                </span>
                <span className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>({activeAccount.sessionTimezone})</span>
              </div>
              <p className={`text-sm sm:text-base font-bold mt-1 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                {evaluation?.statusMessage}
              </p>
              <p className={`text-xs sm:text-sm mt-0.5 leading-relaxed ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                {evaluation?.actionableAdvice}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-end sm:self-center shrink-0 flex-wrap">
            {evaluation?.canAdvancePhase && (
              <button
                onClick={handleAdvancePhase}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 hover:to-teal-400 text-xs font-bold text-white transition flex items-center gap-2 shadow-lg shadow-emerald-600/30 animate-pulse cursor-pointer border border-emerald-400/40"
              >
                <CheckCircle2 className="w-4 h-4 text-white" />
                <span>Advance to Next Phase</span>
              </button>
            )}
            <button
              onClick={() => setActiveTab('pre-trade')}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-xs font-bold text-white transition flex items-center gap-2 shadow-sm cursor-pointer"
            >
              <Zap className="w-4 h-4 text-amber-300" />
              <span>Pre-Trade Check</span>
            </button>
            <button
              onClick={() => setIsEditAccountModalOpen(true)}
              className={`px-3.5 py-2 rounded-xl border text-xs font-bold transition flex items-center gap-2 shadow-sm cursor-pointer ${
                isLight
                  ? 'bg-white hover:bg-slate-100 text-slate-800 border-[#E3E7EE]'
                  : 'bg-[#1A1F27] hover:bg-[#222936] text-slate-200 border-[#1C232E]'
              }`}
            >
              <Sliders className="w-4 h-4 text-blue-500" />
              <span>Configure Account</span>
            </button>
          </div>
        </div>
      </div>

      {/* Multi-Phase Evaluation Progression Stepper */}
      {activeAccount.phases && activeAccount.phases.length > 0 && (
        <div className={`p-4 rounded-2xl border space-y-3 ${
          isLight ? 'bg-white border-[#E3E7EE]' : 'bg-[#12161D] border-[#1C232E]'
        }`}>
          <div className="flex items-center justify-between text-xs">
            <span className={`font-bold flex items-center gap-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>
              <Sparkles className="w-4 h-4 text-indigo-500" />
              <span>Program Progression Stepper</span>
              <span className={isLight ? 'text-slate-300' : 'text-slate-500'}>•</span>
              <span className={`capitalize ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>{activeAccount.programModel.toLowerCase().replace('_', ' ')}</span>
            </span>
            <span className={`text-[11px] font-mono px-2 py-0.5 rounded-full border ${
              isLight ? 'text-indigo-700 bg-indigo-50 border-indigo-200' : 'text-indigo-300 bg-indigo-500/10 border-indigo-500/20'
            }`}>
              Active: {activeAccount.phases[activeAccount.activePhaseIndex ?? 0]?.name || activeAccount.phase}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {activeAccount.phases.map((ph, idx) => {
              const isCurrent = idx === (activeAccount.activePhaseIndex ?? 0);
              const isDone = ph.status === 'COMPLETED' || idx < (activeAccount.activePhaseIndex ?? 0);
              return (
                <div
                  key={ph.id || idx}
                  className={`p-3 rounded-xl border text-left transition ${
                    isCurrent
                      ? isLight
                        ? 'bg-indigo-50/60 border-indigo-300 shadow-sm'
                        : 'bg-gradient-to-br from-indigo-950/50 via-[#12161D] to-blue-950/40 border-indigo-500/50 shadow-md shadow-indigo-950/50'
                      : isDone
                      ? isLight
                        ? 'bg-emerald-50/40 border-emerald-200 text-slate-700'
                        : 'bg-[#0A0D14] border-emerald-500/30 text-slate-300'
                      : isLight
                      ? 'bg-slate-50 border-[#E3E7EE] text-slate-500'
                      : 'bg-[#0A0D14] border-[#1C232E] text-slate-500'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-bold ${
                      isCurrent
                        ? isLight ? 'text-indigo-900' : 'text-white'
                        : isDone
                        ? isLight ? 'text-emerald-700' : 'text-emerald-400'
                        : isLight ? 'text-slate-600' : 'text-slate-400'
                    }`}>
                      {ph.name}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                        isCurrent
                          ? isLight
                            ? 'bg-indigo-100 text-indigo-700 border-indigo-300'
                            : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 animate-pulse'
                          : isDone
                          ? isLight
                            ? 'bg-emerald-100 text-emerald-700 border-emerald-300'
                            : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : isLight
                          ? 'bg-slate-100 text-slate-500 border-slate-200'
                          : 'bg-slate-800/40 text-slate-500 border border-slate-700/40'
                      }`}
                    >
                      {isDone ? 'Completed' : isCurrent ? 'Active Stage' : 'Locked'}
                    </span>
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-1.5 text-[10px] font-mono">
                    <div className={`p-1 rounded border ${isLight ? 'bg-white border-[#E3E7EE]' : 'bg-[#0A0D14]/70 border-[#1C232E]'}`}>
                      <span className={`block text-[9px] font-sans ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>Target</span>
                      <span className={ph.profitTargetPercent > 0 ? (isLight ? 'text-emerald-700 font-bold' : 'text-emerald-400 font-bold') : (isLight ? 'text-slate-600' : 'text-slate-400')}>
                        {ph.profitTargetPercent > 0 ? `+${ph.profitTargetPercent}%` : 'Funded'}
                      </span>
                    </div>
                    <div className={`p-1 rounded border ${isLight ? 'bg-white border-[#E3E7EE]' : 'bg-[#0A0D14]/70 border-[#1C232E]'}`}>
                      <span className={`block text-[9px] font-sans ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>Daily DD</span>
                      <span className={`font-bold ${isLight ? 'text-rose-600' : 'text-rose-400'}`}>-{ph.dailyLossPercent}%</span>
                    </div>
                    <div className={`p-1 rounded border ${isLight ? 'bg-white border-[#E3E7EE]' : 'bg-[#0A0D14]/70 border-[#1C232E]'}`}>
                      <span className={`block text-[9px] font-sans ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>Max DD</span>
                      <span className={`font-bold ${isLight ? 'text-rose-600' : 'text-rose-400'}`}>-{ph.totalLossPercent}%</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 4 Core Hero Metric Panels */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-5">
        {/* Card 1: Account Balance & Equity */}
        <div className={`p-5 rounded-2xl border transition-all duration-200 space-y-4 shadow-sm text-left hover:-translate-y-0.5 ${
          isLight
            ? 'bg-white border-[#E3E7EE] hover:border-slate-300 hover:bg-slate-50/60 shadow-[0_1px_3px_rgba(0,0,0,0.04)]'
            : 'bg-[#12161D] border-[#1C232E] hover:border-[#2A3444] hover:bg-[#151922] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]'
        }`}>
          <div className="flex items-center justify-between text-xs">
            <span className={`font-semibold uppercase tracking-wider text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Account Balance</span>
            <span className={`px-2 py-0.5 rounded font-mono tabular-nums text-[10px] font-semibold border ${
              isLight ? 'bg-slate-100 text-slate-700 border-slate-200' : 'bg-[#1A1F27] text-slate-300 border-[#1C232E]'
            }`}>
              Base: {formatCurrency(activeAccount.startingBalance)}
            </span>
          </div>
          <div className="space-y-1.5">
            <div className={`text-2xl sm:text-3xl font-black tracking-tight font-mono tabular-nums ${isLight ? 'text-slate-900' : 'text-white'}`}>
              <span className={`font-normal mr-0.5 text-xl sm:text-2xl ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>$</span>
              {activeAccount.currentBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span
                className={`font-semibold font-mono tabular-nums flex items-center ${
                  activeAccount.currentBalance >= activeAccount.startingBalance
                    ? isLight ? 'text-emerald-600' : 'text-emerald-400'
                    : isLight ? 'text-rose-600' : 'text-rose-400'
                }`}
              >
                {activeAccount.currentBalance >= activeAccount.startingBalance ? (
                  <ArrowUpRight className="w-4 h-4 mr-0.5" />
                ) : (
                  <ArrowDownRight className="w-4 h-4 mr-0.5" />
                )}
                {formatCurrency(activeAccount.currentBalance - activeAccount.startingBalance)} (
                {(((activeAccount.currentBalance - activeAccount.startingBalance) / activeAccount.startingBalance) * 100).toFixed(2)}%)
              </span>
            </div>
          </div>
          <div className={`pt-3 border-t flex items-center justify-between text-xs font-mono tabular-nums ${
            isLight ? 'border-[#E3E7EE] text-slate-500' : 'border-[#1C232E] text-slate-400'
          }`}>
            <span className="font-sans text-[11px]">High-Water Mark</span>
            <span className={`font-semibold ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
              {formatCurrency(maxDrawdownData?.peakEquity || activeAccount.startingBalance)}
            </span>
          </div>
        </div>

        {/* Card 2: Profit Target & Progress */}
        <div className={`p-5 rounded-2xl border transition-all duration-200 space-y-4 shadow-sm text-left hover:-translate-y-0.5 ${
          isLight
            ? 'bg-white border-[#E3E7EE] hover:border-slate-300 hover:bg-slate-50/60 shadow-[0_1px_3px_rgba(0,0,0,0.04)]'
            : 'bg-[#12161D] border-[#1C232E] hover:border-[#2A3444] hover:bg-[#151922] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]'
        }`}>
          <div className="flex items-center justify-between text-xs">
            <span className={`font-semibold uppercase tracking-wider text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Profit Target</span>
            <span
              className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold border ${
                profitTargetData?.isPassed
                  ? isLight
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                    : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : isLight
                  ? 'bg-slate-100 border-slate-200 text-slate-700'
                  : 'bg-[#1A1F27] border-[#1C232E] text-slate-300'
              }`}
            >
              {profitTargetData?.isPassed ? 'PASSED' : `${(profitTargetData?.progressPercent ?? 0).toFixed(0)}% DONE`}
            </span>
          </div>
          <div className="space-y-2">
            <div className={`text-2xl sm:text-3xl font-black tracking-tight font-mono tabular-nums flex items-baseline justify-between ${isLight ? 'text-slate-900' : 'text-white'}`}>
              <span>
                <span className={`font-normal mr-0.5 text-xl sm:text-2xl ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>$</span>
                {(profitTargetData?.currentProfit || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className={`text-xs font-semibold font-mono ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>
                / {formatCurrency(profitTargetData?.target || 0)}
              </span>
            </div>
            <div className={`w-full h-2 rounded-full overflow-hidden border ${isLight ? 'bg-slate-100 border-[#E3E7EE]' : 'bg-[#1A1F27] border-[#1C232E]'}`}>
              <div
                className="bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-400 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, profitTargetData?.progressPercent || 0)}%` }}
              />
            </div>
          </div>
          <div className={`pt-3 border-t flex items-center justify-between text-xs font-mono tabular-nums ${
            isLight ? 'border-[#E3E7EE] text-slate-500' : 'border-[#1C232E] text-slate-400'
          }`}>
            <span className="font-sans text-[11px]">Remaining to Target</span>
            <span className={`font-bold ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`}>
              {profitTargetData?.isPassed ? 'Goal Met!' : formatCurrency(profitTargetData?.remainingProfit || 0)}
            </span>
          </div>
        </div>

        {/* Card 3: Daily Drawdown & Multi-Segment Risk Gauge */}
        <div className={`p-5 rounded-2xl border transition-all duration-200 space-y-4 shadow-sm text-left hover:-translate-y-0.5 ${
          isLight
            ? 'bg-white border-[#E3E7EE] hover:border-slate-300 hover:bg-slate-50/60 shadow-[0_1px_3px_rgba(0,0,0,0.04)]'
            : 'bg-[#12161D] border-[#1C232E] hover:border-[#2A3444] hover:bg-[#151922] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]'
        }`}>
          <div className="flex items-center justify-between text-xs">
            <span className={`font-semibold uppercase tracking-wider text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Daily Loss Limit</span>
            <span className={`px-2 py-0.5 rounded font-mono tabular-nums text-[10px] font-semibold border ${
              isLight ? 'bg-slate-100 text-slate-700 border-slate-200' : 'bg-[#1A1F27] text-slate-300 border-[#1C232E]'
            }`}>
              Limit: {formatCurrency(dailyDrawdownData?.dailyLimit || 0)}
            </span>
          </div>
          <div className="space-y-2">
            <div className={`text-2xl sm:text-3xl font-black tracking-tight font-mono tabular-nums flex items-baseline justify-between ${isLight ? 'text-slate-900' : 'text-white'}`}>
              <span className={dailyDrawdownData?.todayLoss ? (isLight ? 'text-rose-600' : 'text-rose-400') : (isLight ? 'text-slate-800' : 'text-slate-100')}>
                <span className={`font-normal mr-0.5 text-xl sm:text-2xl ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>$</span>
                {(dailyDrawdownData?.todayLoss || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className={`text-[10px] uppercase font-semibold tracking-wider ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>today's loss</span>
            </div>

            {/* Institutional Multi-Segment Risk Gauge */}
            <div className="space-y-1">
              <div className="flex items-center gap-1 w-full h-2">
                {/* Safe segment (0 - 60%) */}
                <div className={`h-full flex-1 rounded-l-full relative overflow-hidden ${
                  isLight ? 'bg-emerald-100' : 'bg-emerald-950/40'
                }`}>
                  <div
                    className="h-full bg-emerald-500 transition-all duration-300"
                    style={{
                      width: `${Math.min(100, Math.max(0, ((100 - (dailyDrawdownData?.remainingDailyBufferPercent ?? 100)) / 60) * 100))}%`
                    }}
                  />
                </div>
                {/* Caution segment (60 - 85%) */}
                <div className={`h-full w-[25%] relative overflow-hidden ${
                  isLight ? 'bg-amber-100' : 'bg-amber-950/40'
                }`}>
                  <div
                    className="h-full bg-amber-500 transition-all duration-300"
                    style={{
                      width: `${Math.min(100, Math.max(0, (((100 - (dailyDrawdownData?.remainingDailyBufferPercent ?? 100)) - 60) / 25) * 100))}%`
                    }}
                  />
                </div>
                {/* Breach segment (85 - 100%) */}
                <div className={`h-full w-[15%] rounded-r-full relative overflow-hidden ${
                  isLight ? 'bg-rose-100' : 'bg-rose-950/40'
                }`}>
                  <div
                    className="h-full bg-rose-500 transition-all duration-300"
                    style={{
                      width: `${Math.min(100, Math.max(0, (((100 - (dailyDrawdownData?.remainingDailyBufferPercent ?? 100)) - 85) / 15) * 100))}%`
                    }}
                  />
                </div>
              </div>
              <div className="flex justify-between text-[9px] font-mono text-slate-500 pt-0.5">
                <span className="text-emerald-500 font-semibold">Safe Zone</span>
                <span className="text-amber-500">Caution</span>
                <span className="text-rose-500 font-semibold">Breach</span>
              </div>
            </div>
          </div>
          <div className={`pt-3 border-t flex items-center justify-between text-xs font-mono tabular-nums ${
            isLight ? 'border-[#E3E7EE] text-slate-500' : 'border-[#1C232E] text-slate-400'
          }`}>
            <span className="font-sans text-[11px]">Remaining Daily Buffer</span>
            <span className={`font-bold ${
              (dailyDrawdownData?.remainingDailyBufferPercent ?? 100) < 30
                ? 'text-rose-500'
                : (dailyDrawdownData?.remainingDailyBufferPercent ?? 100) < 60
                ? 'text-amber-500'
                : isLight ? 'text-slate-800' : 'text-slate-200'
            }`}>
              {formatCurrency(dailyDrawdownData?.remainingDailyBuffer || 0)} ({(dailyDrawdownData?.remainingDailyBufferPercent ?? 0).toFixed(0)}%)
            </span>
          </div>
        </div>

        {/* Card 4: Maximum Drawdown & Multi-Segment Risk Gauge */}
        <div className={`p-5 rounded-2xl border transition-all duration-200 space-y-4 shadow-sm text-left hover:-translate-y-0.5 ${
          isLight
            ? 'bg-white border-[#E3E7EE] hover:border-slate-300 hover:bg-slate-50/60 shadow-[0_1px_3px_rgba(0,0,0,0.04)]'
            : 'bg-[#12161D] border-[#1C232E] hover:border-[#2A3444] hover:bg-[#151922] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]'
        }`}>
          <div className="flex items-center justify-between text-xs">
            <span className={`font-semibold uppercase tracking-wider text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Max Drawdown</span>
            <span className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold border ${
              isLight ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-blue-500/10 text-blue-300 border-blue-500/30'
            }`}>
              {activeAccount.drawdownModel.replace('_', ' ')}
            </span>
          </div>
          <div className="space-y-2">
            <div className={`text-2xl sm:text-3xl font-black tracking-tight font-mono tabular-nums flex items-baseline justify-between ${isLight ? 'text-slate-900' : 'text-white'}`}>
              <span className={maxDrawdownData?.currentDrawdown ? (isLight ? 'text-amber-600' : 'text-amber-400') : (isLight ? 'text-slate-800' : 'text-slate-100')}>
                <span className={`font-normal mr-0.5 text-xl sm:text-2xl ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>$</span>
                {(maxDrawdownData?.currentDrawdown || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className={`text-xs font-semibold font-mono ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>
                / {formatCurrency(activeAccount.rules.find((r) => r.type === 'MAX_DRAWDOWN')?.threshold || 5000)}
              </span>
            </div>

            {/* Institutional Multi-Segment Risk Gauge */}
            <div className="space-y-1">
              <div className="flex items-center gap-1 w-full h-2">
                {/* Safe segment (0 - 60%) */}
                <div className={`h-full flex-1 rounded-l-full relative overflow-hidden ${
                  isLight ? 'bg-emerald-100' : 'bg-emerald-950/40'
                }`}>
                  <div
                    className="h-full bg-emerald-500 transition-all duration-300"
                    style={{
                      width: `${Math.min(100, Math.max(0, ((100 - (maxDrawdownData?.bufferPercent ?? 100)) / 60) * 100))}%`
                    }}
                  />
                </div>
                {/* Caution segment (60 - 85%) */}
                <div className={`h-full w-[25%] relative overflow-hidden ${
                  isLight ? 'bg-amber-100' : 'bg-amber-950/40'
                }`}>
                  <div
                    className="h-full bg-amber-500 transition-all duration-300"
                    style={{
                      width: `${Math.min(100, Math.max(0, (((100 - (maxDrawdownData?.bufferPercent ?? 100)) - 60) / 25) * 100))}%`
                    }}
                  />
                </div>
                {/* Breach segment (85 - 100%) */}
                <div className={`h-full w-[15%] rounded-r-full relative overflow-hidden ${
                  isLight ? 'bg-rose-100' : 'bg-rose-950/40'
                }`}>
                  <div
                    className="h-full bg-rose-500 transition-all duration-300"
                    style={{
                      width: `${Math.min(100, Math.max(0, (((100 - (maxDrawdownData?.bufferPercent ?? 100)) - 85) / 15) * 100))}%`
                    }}
                  />
                </div>
              </div>
              <div className="flex justify-between text-[9px] font-mono text-slate-500 pt-0.5">
                <span className="text-emerald-500 font-semibold">Safe Zone</span>
                <span className="text-amber-500">Caution</span>
                <span className="text-rose-500 font-semibold">Breach</span>
              </div>
            </div>
          </div>
          <div className={`pt-3 border-t flex items-center justify-between text-xs font-mono tabular-nums ${
            isLight ? 'border-[#E3E7EE] text-slate-500' : 'border-[#1C232E] text-slate-400'
          }`}>
            <span className="font-sans text-[11px]">Remaining Max Buffer</span>
            <span className={`font-bold ${
              (maxDrawdownData?.bufferPercent ?? 100) < 30
                ? 'text-rose-500'
                : (maxDrawdownData?.bufferPercent ?? 100) < 60
                ? 'text-amber-500'
                : isLight ? 'text-slate-800' : 'text-slate-200'
            }`}>
              {formatCurrency(maxDrawdownData?.bufferRemaining || 0)} ({(maxDrawdownData?.bufferPercent ?? 0).toFixed(0)}%)
            </span>
          </div>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className={`flex items-center gap-2 border-b overflow-x-auto pb-2 custom-scrollbar ${isLight ? 'border-[#E3E7EE]' : 'border-[#1C232E]'}`}>
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-2 border whitespace-nowrap cursor-pointer ${
            activeTab === 'overview'
              ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white border-indigo-400/40 shadow-md shadow-indigo-600/20'
              : isLight
              ? 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border-[#E3E7EE]'
              : 'bg-[#12161D] text-slate-400 hover:text-white hover:bg-[#1A1F27] border-[#1C232E]'
          }`}
        >
          <Shield className={`w-3.5 h-3.5 ${activeTab === 'overview' ? 'text-white' : isLight ? 'text-blue-600' : 'text-blue-400'}`} />
          <span>Rule Health Center</span>
        </button>

        <button
          onClick={() => setActiveTab('pre-trade')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-2 border whitespace-nowrap cursor-pointer ${
            activeTab === 'pre-trade'
              ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white border-indigo-400/40 shadow-md shadow-indigo-600/20'
              : isLight
              ? 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border-[#E3E7EE]'
              : 'bg-[#12161D] text-slate-400 hover:text-white hover:bg-[#1A1F27] border-[#1C232E]'
          }`}
        >
          <Zap className={`w-3.5 h-3.5 ${activeTab === 'pre-trade' ? 'text-white' : isLight ? 'text-amber-600' : 'text-amber-400'}`} />
          <span>Pre-Trade Order Simulator</span>
        </button>

        <button
          onClick={() => setActiveTab('days')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-2 border whitespace-nowrap cursor-pointer ${
            activeTab === 'days'
              ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white border-indigo-400/40 shadow-md shadow-indigo-600/20'
              : isLight
              ? 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border-[#E3E7EE]'
              : 'bg-[#12161D] text-slate-400 hover:text-white hover:bg-[#1A1F27] border-[#1C232E]'
          }`}
        >
          <Calendar className={`w-3.5 h-3.5 ${activeTab === 'days' ? 'text-white' : isLight ? 'text-purple-600' : 'text-purple-400'}`} />
          <span>Trading Days ({tradingDaysData?.daysCompleted || 0}/{tradingDaysData?.minDaysRequired || 0})</span>
        </button>

        <button
          onClick={() => setActiveTab('exposures')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-2 border whitespace-nowrap cursor-pointer ${
            activeTab === 'exposures'
              ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white border-indigo-400/40 shadow-md shadow-indigo-600/20'
              : isLight
              ? 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border-[#E3E7EE]'
              : 'bg-[#12161D] text-slate-400 hover:text-white hover:bg-[#1A1F27] border-[#1C232E]'
          }`}
        >
          <Scale className={`w-3.5 h-3.5 ${activeTab === 'exposures' ? 'text-white' : isLight ? 'text-emerald-600' : 'text-emerald-400'}`} />
          <span>Symbol Risk & Durations</span>
        </button>

        <button
          onClick={() => setActiveTab('rules')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-2 border whitespace-nowrap cursor-pointer ${
            activeTab === 'rules'
              ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white border-indigo-400/40 shadow-md shadow-indigo-600/20'
              : isLight
              ? 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border-[#E3E7EE]'
              : 'bg-[#12161D] text-slate-400 hover:text-white hover:bg-[#1A1F27] border-[#1C232E]'
          }`}
        >
          <Sliders className={`w-3.5 h-3.5 ${activeTab === 'rules' ? 'text-white' : isLight ? 'text-cyan-600' : 'text-cyan-400'}`} />
          <span>Rule Configuration & Presets</span>
        </button>

        <button
          onClick={() => setActiveTab('payouts')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-2 border whitespace-nowrap cursor-pointer ${
            activeTab === 'payouts'
              ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white border-indigo-400/40 shadow-md shadow-indigo-600/20'
              : isLight
              ? 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border-[#E3E7EE]'
              : 'bg-[#12161D] text-slate-400 hover:text-white hover:bg-[#1A1F27] border-[#1C232E]'
          }`}
        >
          <Wallet className={`w-3.5 h-3.5 ${activeTab === 'payouts' ? 'text-white' : isLight ? 'text-emerald-600' : 'text-emerald-400'}`} />
          <span>Payouts & Reward Split ({activeAccount.rewardSplitPercent || 80}%)</span>
        </button>

        <button
          onClick={() => setActiveTab('violations')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-2 border whitespace-nowrap cursor-pointer ${
            activeTab === 'violations'
              ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white border-indigo-400/40 shadow-md shadow-indigo-600/20'
              : isLight
              ? 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border-[#E3E7EE]'
              : 'bg-[#12161D] text-slate-400 hover:text-white hover:bg-[#1A1F27] border-[#1C232E]'
          }`}
        >
          <AlertTriangle className={`w-3.5 h-3.5 ${activeTab === 'violations' ? 'text-white' : isLight ? 'text-rose-600' : 'text-rose-400'}`} />
          <span>Violations & Audit Logs ({activeAccount.violations.length})</span>
        </button>
      </div>

      {/* TAB CONTENT 1: Rule Health Center Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className={`rounded-2xl border overflow-hidden shadow-lg text-left ${
            isLight ? 'bg-white border-[#E3E7EE] shadow-slate-200/50' : 'bg-[#12161D] border-[#1C232E] shadow-black/30'
          }`}>
            <div className={`p-5 sm:p-6 border-b flex flex-wrap items-center justify-between gap-4 ${
              isLight ? 'bg-[#F8F9FB] border-[#E3E7EE]' : 'bg-[#0A0D14] border-[#1C232E]'
            }`}>
              <div>
                <h3 className={`text-base sm:text-lg font-bold flex items-center gap-2.5 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  <Shield className="w-5 h-5 text-blue-500" />
                  <span>LegionFunding Institutional Compliance Matrix</span>
                </h3>
                <p className={`text-xs sm:text-sm mt-0.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                  Live status, threshold boundaries and calculation transparent formulas.
                </p>
              </div>
              <button
                onClick={() => setIsAddRuleModalOpen(true)}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold transition shadow-sm active:scale-95 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Custom Rule</span>
              </button>
            </div>

            <div className={`divide-y ${isLight ? 'divide-slate-200' : 'divide-white/5'}`}>
              {evaluation?.evaluatedRules.map((rule) => {
                const isSafe = rule.status === 'SAFE' || rule.status === 'COMPLETED';
                const isWarn = rule.status === 'WARNING';
                const isCrit = rule.status === 'CRITICAL';
                const isBreach = rule.status === 'BREACHED';

                return (
                  <div
                    key={rule.id}
                    className={`p-5 sm:p-6 transition flex flex-col md:flex-row md:items-center justify-between gap-5 ${
                      isLight ? 'hover:bg-slate-50/70' : 'hover:bg-white/[0.02]'
                    }`}
                  >
                    <div className="space-y-1.5 max-w-xl text-left">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <span className={`text-sm sm:text-base font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>{rule.name}</span>
                        <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-mono font-bold uppercase border ${
                          isLight ? 'bg-slate-100 border-slate-200 text-slate-700' : 'bg-white/[0.06] border-white/10 text-slate-300'
                        }`}>
                          {rule.type}
                        </span>
                        {!rule.enabled && (
                          <span className={`px-2 py-0.5 rounded-lg text-[10px] font-medium ${
                            isLight ? 'bg-slate-200 text-slate-500' : 'bg-zinc-800 text-zinc-500'
                          }`}>
                            Disabled
                          </span>
                        )}
                      </div>
                      <p className={`text-xs sm:text-sm leading-relaxed ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>{rule.description}</p>
                      <div className={`flex items-center gap-3 text-xs pt-1 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                        <span>
                          Formula:{' '}
                          <code className={`px-2 py-0.5 rounded border text-[11px] font-mono break-all ${
                            isLight ? 'text-blue-700 bg-blue-50 border-blue-200' : 'text-blue-300 bg-blue-500/10 border-blue-500/20'
                          }`}>
                            {rule.calculationMethodology}
                          </code>
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 sm:gap-5 self-start md:self-center shrink-0 flex-wrap sm:flex-nowrap">
                      <div className="text-left md:text-right">
                        <div className={`text-sm font-mono font-bold ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
                          {rule.details || `Threshold: ${rule.threshold} ${rule.unit}`}
                        </div>
                        <div className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                          Limit: {rule.threshold} {rule.unit}
                        </div>
                      </div>

                      <div className="min-w-[90px] sm:min-w-[110px] flex justify-end">
                        {isBreach ? (
                          <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                            isLight ? 'bg-rose-100 border-rose-300 text-rose-700' : 'bg-red-950/80 border-red-500/60 text-red-300'
                          }`}>
                            BREACHED
                          </span>
                        ) : isCrit ? (
                          <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                            isLight ? 'bg-rose-50 border-rose-200 text-rose-600' : 'bg-rose-950/80 border-rose-500/60 text-rose-300'
                          }`}>
                            CRITICAL
                          </span>
                        ) : isWarn ? (
                          <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                            isLight ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-amber-950/80 border-amber-500/50 text-amber-300'
                          }`}>
                            WARNING
                          </span>
                        ) : rule.status === 'COMPLETED' ? (
                          <span className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 ${
                            isLight ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-emerald-950/80 border-emerald-500/50 text-emerald-400'
                          }`}>
                            <Check className="w-3.5 h-3.5" />
                            COMPLETED
                          </span>
                        ) : (
                          <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                            isLight ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-emerald-950/50 border-emerald-500/40 text-emerald-400'
                          }`}>
                            SAFE
                          </span>
                        )}
                      </div>

                      <button
                        onClick={() => {
                          setEditingRule(rule);
                          setIsAddRuleModalOpen(true);
                        }}
                        className={`p-1.5 rounded-lg transition ${
                          isLight ? 'text-slate-400 hover:text-slate-700 hover:bg-slate-100' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                        }`}
                        title="Edit Rule"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT 2: Pre-Trade Compliance Checker */}
      {activeTab === 'pre-trade' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-left">
          <div className={`p-6 rounded-2xl border space-y-4 shadow-sm ${
            isLight ? 'bg-white border-[#E3E7EE] shadow-slate-200/50' : 'bg-[#12161D] border-[#1C232E]'
          }`}>
            <h3 className={`text-sm font-bold flex items-center gap-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>
              <Zap className="w-4 h-4 text-amber-500" />
              <span>Pre-Trade Order Simulator</span>
            </h3>
            <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
              Simulate proposed position parameters against live prop firm limits before opening trades.
            </p>

            <div className="space-y-3 pt-2">
              <div>
                <label className={`text-xs font-semibold block mb-1 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>Symbol / Asset</label>
                <input
                  type="text"
                  value={preTradeSymbol}
                  onChange={(e) => setPreTradeSymbol(e.target.value.toUpperCase())}
                  className={`w-full rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:border-indigo-500 border ${
                    isLight ? 'bg-[#F8F9FB] border-[#E3E7EE] text-slate-900 placeholder:text-slate-400' : 'bg-[#0A0D14] border-[#1C232E] text-white'
                  }`}
                  placeholder="e.g. NQ, ES, EURUSD"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={`text-xs font-semibold block mb-1 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>Direction</label>
                  <div className={`grid grid-cols-2 gap-1 p-1 rounded-xl border ${
                    isLight ? 'bg-[#F8F9FB] border-[#E3E7EE]' : 'bg-[#0A0D14] border-[#1C232E]'
                  }`}>
                    <button
                      onClick={() => setPreTradeDirection('BUY')}
                      className={`py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                        preTradeDirection === 'BUY'
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : isLight ? 'text-slate-500 hover:text-slate-900' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      BUY
                    </button>
                    <button
                      onClick={() => setPreTradeDirection('SELL')}
                      className={`py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                        preTradeDirection === 'SELL'
                          ? 'bg-rose-600 text-white shadow-sm'
                          : isLight ? 'text-slate-500 hover:text-slate-900' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      SELL
                    </button>
                  </div>
                </div>

                <div>
                  <label className={`text-xs font-semibold block mb-1 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>Quantity / Contracts</label>
                  <input
                    type="number"
                    min="1"
                    value={preTradeQuantity}
                    onChange={(e) => setPreTradeQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className={`w-full rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:border-indigo-500 border ${
                      isLight ? 'bg-[#F8F9FB] border-[#E3E7EE] text-slate-900' : 'bg-[#0A0D14] border-[#1C232E] text-white'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={`text-xs font-semibold block mb-1 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>Stop Loss (Points/Pips)</label>
                  <input
                    type="number"
                    min="1"
                    value={preTradeStopLossPoints}
                    onChange={(e) => setPreTradeStopLossPoints(Math.max(1, parseFloat(e.target.value) || 1))}
                    className={`w-full rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:border-indigo-500 border ${
                      isLight ? 'bg-[#F8F9FB] border-[#E3E7EE] text-slate-900' : 'bg-[#0A0D14] border-[#1C232E] text-white'
                    }`}
                  />
                </div>

                <div>
                  <label className={`text-xs font-semibold block mb-1 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>Point Multiplier ($)</label>
                  <input
                    type="number"
                    min="1"
                    value={preTradePointMultiplier}
                    onChange={(e) => setPreTradePointMultiplier(Math.max(1, parseFloat(e.target.value) || 1))}
                    className={`w-full rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:border-indigo-500 border ${
                      isLight ? 'bg-[#F8F9FB] border-[#E3E7EE] text-slate-900' : 'bg-[#0A0D14] border-[#1C232E] text-white'
                    }`}
                  />
                </div>
              </div>

              <div className={`p-3 rounded-xl border flex items-center justify-between text-xs font-mono ${
                isLight ? 'bg-[#F8F9FB] border-[#E3E7EE]' : 'bg-[#0A0D14] border-[#1C232E]'
              }`}>
                <span className={isLight ? 'text-slate-500' : 'text-slate-400'}>Total Dollar Risk:</span>
                <span className={`font-bold ${isLight ? 'text-rose-600' : 'text-rose-400'}`}>
                  {formatCurrency(preTradeQuantity * preTradeStopLossPoints * preTradePointMultiplier)}
                </span>
              </div>

              <button
                onClick={handleRunPreTradeCheck}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold text-xs transition flex items-center justify-center gap-2 shadow-md shadow-indigo-600/25 border border-indigo-400/30 cursor-pointer"
              >
                <Shield className="w-4 h-4" />
                <span>Evaluate Prop Firm Rules</span>
              </button>
            </div>
          </div>

          {/* Validation Result Box */}
          <div className={`lg:col-span-2 p-6 rounded-2xl border space-y-4 shadow-sm ${
            isLight ? 'bg-white border-[#E3E7EE] shadow-slate-200/50' : 'bg-[#12161D] border-[#1C232E]'
          }`}>
            <h3 className={`text-sm font-bold flex items-center gap-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>
              <Scale className="w-4 h-4 text-purple-500" />
              <span>Compliance Evaluation Result</span>
            </h3>

            {preTradeValidation ? (
              <div className="space-y-4">
                <div
                  className={`p-4 rounded-xl border flex items-center justify-between ${
                    preTradeValidation.status === 'APPROVED'
                      ? isLight
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                        : 'bg-emerald-950/60 border-emerald-500/40 text-emerald-400'
                      : preTradeValidation.status === 'WARNING'
                      ? isLight
                        ? 'bg-amber-50 border-amber-200 text-amber-800'
                        : 'bg-amber-950/60 border-amber-500/40 text-amber-400'
                      : isLight
                      ? 'bg-rose-50 border-rose-200 text-rose-800'
                      : 'bg-rose-950/60 border-rose-500/40 text-rose-400'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {preTradeValidation.status === 'APPROVED' ? (
                      <CheckCircle2 className="w-6 h-6" />
                    ) : preTradeValidation.status === 'WARNING' ? (
                      <AlertTriangle className="w-6 h-6" />
                    ) : (
                      <XCircle className="w-6 h-6" />
                    )}
                    <div>
                      <div className="text-base font-black tracking-wider">
                        TRADE {preTradeValidation.status}
                      </div>
                      <p className="text-xs opacity-90">{preTradeValidation.summary}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <span className={`text-xs font-bold uppercase tracking-wider ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                    Rule-by-Rule Compliance Checks
                  </span>
                  <div className={`divide-y border rounded-xl overflow-hidden ${
                    isLight ? 'divide-slate-200 border-[#E3E7EE] bg-[#F8F9FB]' : 'divide-[#1C232E] border-[#1C232E] bg-[#0A0D14]'
                  }`}>
                    {preTradeValidation.checks.map((c: any, i: number) => (
                      <div key={i} className="p-3 flex items-center justify-between text-xs">
                        <div className="space-y-0.5">
                          <div className={`font-bold ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>{c.ruleName}</div>
                          <div className={`text-[11px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>{c.message}</div>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                            c.status === 'PASS'
                              ? isLight
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                                : 'bg-emerald-950 text-emerald-400 border-emerald-500/30'
                              : c.status === 'WARN'
                              ? isLight
                                ? 'bg-amber-100 text-amber-800 border-amber-200'
                                : 'bg-amber-950 text-amber-400 border-amber-500/30'
                              : isLight
                              ? 'bg-rose-100 text-rose-800 border-rose-200'
                              : 'bg-rose-950 text-rose-400 border-rose-500/30'
                          }`}
                        >
                          {c.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className={`p-8 text-center space-y-2 ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>
                <Info className="w-8 h-8 mx-auto opacity-50" />
                <p className="text-xs">
                  Configure your simulated trade parameters and click "Evaluate Prop Firm Rules" to run pre-trade validation.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT 3: Trading Days & Qualifying Days */}
      {activeTab === 'days' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-left">
          {/* Trading Days Tracker */}
          <div className={`p-6 rounded-2xl border space-y-4 shadow-sm ${
            isLight ? 'bg-white border-[#E3E7EE] shadow-slate-200/50' : 'bg-[#12161D] border-[#1C232E]'
          }`}>
            <div className="flex items-center justify-between">
              <h3 className={`text-sm font-bold flex items-center gap-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                <Calendar className="w-4 h-4 text-purple-500" />
                <span>Trading Day & Qualifying Day Tracker</span>
              </h3>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-bold border ${
                isLight ? 'bg-purple-50 border-purple-200 text-purple-700' : 'bg-purple-950/60 border-purple-500/30 text-purple-300'
              }`}>
                {tradingDaysData?.daysCompleted} / {tradingDaysData?.minDaysRequired} Days
              </span>
            </div>
            <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
              LegionFunding rule: Minimum 3 active days. A qualifying trading day requires at least 0.5% realized profit ($250 on $50K).
            </p>

            <div className={`p-4 rounded-xl border space-y-2 ${
              isLight ? 'bg-[#F8F9FB] border-[#E3E7EE]' : 'bg-[#0A0D14] border-[#1C232E]'
            }`}>
              <div className="flex justify-between text-xs font-semibold">
                <span className={isLight ? 'text-slate-500' : 'text-slate-400'}>Requirement Status:</span>
                <span className={tradingDaysData?.isSatisfied ? (isLight ? 'text-emerald-700 font-bold' : 'text-emerald-400 font-bold') : (isLight ? 'text-amber-700 font-bold' : 'text-amber-400 font-bold')}>
                  {tradingDaysData?.isSatisfied
                    ? 'Minimum Days Satisfied'
                    : `${tradingDaysData?.daysRemaining} more trading days needed`}
                </span>
              </div>
              <div className={`w-full h-2.5 rounded-full overflow-hidden border ${isLight ? 'bg-slate-200 border-slate-300' : 'bg-[#0A0D14] border-[#1C232E]'}`}>
                <div
                  className="bg-gradient-to-r from-purple-500 to-indigo-500 h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(
                      100,
                      ((tradingDaysData?.daysCompleted || 0) / (tradingDaysData?.minDaysRequired || 1)) * 100
                    )}%`,
                  }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <span className={`text-xs font-bold uppercase tracking-wider ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Session Calendar Breakdown</span>
              <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
                {tradingDaysData?.dailyBreakdown.map((d, i) => (
                  <div
                    key={i}
                    className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
                      isLight ? 'bg-[#F8F9FB] border-[#E3E7EE]' : 'bg-[#0A0D14] border-[#1C232E]'
                    }`}
                  >
                    <div>
                      <span className={`font-mono font-bold ${isLight ? 'text-slate-900' : 'text-slate-200'}`}>{d.date}</span>
                      <span className={`ml-3 font-mono text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>P&L: {formatCurrency(d.netPnl)}</span>
                    </div>
                    {d.isQualifying ? (
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border flex items-center gap-1 ${
                        isLight ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-emerald-950 text-emerald-400 border-emerald-500/30'
                      }`}>
                        <Check className="w-3 h-3" /> Qualifying Day (+0.5%)
                      </span>
                    ) : (
                      <span className={`px-2 py-0.5 rounded text-[10px] border ${
                        isLight ? 'bg-slate-200 text-slate-600 border-slate-300' : 'bg-[#1A1F27] text-slate-400 border-[#1C232E]'
                      }`}>
                        Active Day
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Consistency Rule Engine */}
          <div className={`p-6 rounded-2xl border space-y-4 shadow-sm ${
            isLight ? 'bg-white border-[#E3E7EE] shadow-slate-200/50' : 'bg-[#12161D] border-[#1C232E]'
          }`}>
            <div className="flex items-center justify-between">
              <h3 className={`text-sm font-bold flex items-center gap-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                <Scale className="w-4 h-4 text-blue-500" />
                <span>Consistency Rule Breakdown</span>
              </h3>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-bold border ${
                  consistencyData?.isCompliant
                    ? isLight ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-emerald-950/60 border-emerald-500/30 text-emerald-300'
                    : isLight ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-amber-950/60 border-amber-500/30 text-amber-300'
                }`}
              >
                {consistencyData?.consistencyPercent}% / {consistencyData?.allowedPercent}% Limit
              </span>
            </div>
            <p className={`text-xs leading-relaxed ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
              Formula: <code>(Highest Single Day Profit / Total Accumulated Profit) × 100</code>. No single day can exceed {consistencyData?.allowedPercent}%.
            </p>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className={`p-3 rounded-xl border ${isLight ? 'bg-[#F8F9FB] border-[#E3E7EE]' : 'bg-[#0A0D14] border-[#1C232E]'}`}>
                <span className={`text-[10px] uppercase font-bold block ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>Best Single Day Profit</span>
                <span className={`text-lg font-bold font-mono ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  {formatCurrency(consistencyData?.bestDayProfit || 0)}
                </span>
              </div>
              <div className={`p-3 rounded-xl border ${isLight ? 'bg-[#F8F9FB] border-[#E3E7EE]' : 'bg-[#0A0D14] border-[#1C232E]'}`}>
                <span className={`text-[10px] uppercase font-bold block ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>Total Positive Profit</span>
                <span className={`text-lg font-bold font-mono ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  {formatCurrency(consistencyData?.totalProfit || 0)}
                </span>
              </div>
            </div>

            <div className={`p-4 rounded-xl border space-y-2 ${isLight ? 'bg-[#F8F9FB] border-[#E3E7EE]' : 'bg-[#0A0D14] border-[#1C232E]'}`}>
              <div className="flex justify-between text-xs font-semibold">
                <span className={isLight ? 'text-slate-500' : 'text-slate-400'}>Profit Concentration:</span>
                <span className={consistencyData?.isCompliant ? (isLight ? 'text-emerald-700 font-bold' : 'text-emerald-400 font-bold') : (isLight ? 'text-amber-700 font-bold' : 'text-amber-400 font-bold')}>
                  {consistencyData?.consistencyPercent}% ({consistencyData?.marginRemaining}% safety margin)
                </span>
              </div>
              <div className={`w-full h-2.5 rounded-full overflow-hidden border ${isLight ? 'bg-slate-200 border-slate-300' : 'bg-[#0A0D14] border-[#1C232E]'}`}>
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    (consistencyData?.consistencyPercent || 0) > (consistencyData?.allowedPercent || 20)
                      ? 'bg-amber-500'
                      : 'bg-blue-500'
                  }`}
                  style={{
                    width: `${Math.min(100, consistencyData?.consistencyPercent || 0)}%`,
                  }}
                />
              </div>
            </div>

            {consistencyData && !consistencyData.isCompliant && (
              <div className={`p-3 rounded-xl border text-xs space-y-1 ${
                isLight ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-amber-950/50 border-amber-500/40 text-amber-300'
              }`}>
                <div className="font-bold flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Consistency Adjustment Needed</span>
                </div>
                <p>
                  You need to generate an additional <strong>{formatCurrency(consistencyData.additionalProfitNeeded)}</strong> in profit across other trading days to reduce best-day concentration below {consistencyData.allowedPercent}%.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT 4: Symbol Exposure Risk & Trade Durations */}
      {activeTab === 'exposures' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-left">
          {/* Symbol Exposure Card */}
          <div className={`p-6 rounded-2xl border space-y-4 shadow-sm ${
            isLight ? 'bg-white border-[#E3E7EE] shadow-slate-200/50' : 'bg-[#12161D] border-[#1C232E]'
          }`}>
            <h3 className={`text-sm font-bold flex items-center gap-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>
              <Scale className="w-4 h-4 text-emerald-500" />
              <span>Max Risk Exposure Per Symbol</span>
            </h3>
            <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
              LegionFunding constraint: Combined open and closed risk exposure on a single symbol must not exceed {activeAccount.maxRiskPerSymbolPercent || 2}% of initial balance (${formatCurrency(activeAccount.startingBalance * ((activeAccount.maxRiskPerSymbolPercent || 2) / 100))}).
            </p>

            <div className="space-y-2 pt-2">
              {symbolRiskData.length > 0 ? (
                symbolRiskData.map((sym, idx) => (
                  <div key={idx} className={`p-3.5 rounded-xl border flex items-center justify-between text-xs ${
                    isLight ? 'bg-[#F8F9FB] border-[#E3E7EE]' : 'bg-[#0A0D14] border-[#1C232E]'
                  }`}>
                    <div className="space-y-0.5">
                      <div className={`font-bold flex items-center gap-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                        <span>{sym.symbol}</span>
                        <span className={`text-[10px] font-normal ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>({sym.totalTradesCount} trades)</span>
                      </div>
                      <div className={`text-[11px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                        Realized PnL: <span className={sym.realizedPnl >= 0 ? (isLight ? 'text-emerald-700 font-mono font-bold' : 'text-emerald-400 font-mono') : (isLight ? 'text-rose-700 font-mono font-bold' : 'text-rose-400 font-mono')}>{formatCurrency(sym.realizedPnl)}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`font-mono font-bold ${isLight ? 'text-slate-900' : 'text-slate-200'}`}>
                        Risk: {formatCurrency(sym.potentialRiskDollar)} / {formatCurrency(sym.maxAllowedRiskDollar)}
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                        sym.status === 'SAFE'
                          ? isLight ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-emerald-950 text-emerald-400 border-emerald-500/30'
                          : sym.status === 'WARNING'
                          ? isLight ? 'bg-amber-100 text-amber-800 border-amber-200' : 'bg-amber-950 text-amber-400 border-amber-500/30'
                          : isLight ? 'bg-rose-100 text-rose-800 border-rose-200' : 'bg-rose-950 text-rose-400 border-rose-500/30'
                      }`}>
                        {sym.status}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className={`p-6 text-center text-xs ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>
                  No symbol executions logged yet for risk exposure monitoring.
                </div>
              )}
            </div>
          </div>

          {/* Trade Duration Check */}
          <div className={`p-6 rounded-2xl border space-y-4 shadow-sm ${
            isLight ? 'bg-white border-[#E3E7EE] shadow-slate-200/50' : 'bg-[#12161D] border-[#1C232E]'
          }`}>
            <h3 className={`text-sm font-bold flex items-center gap-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>
              <Clock className="w-4 h-4 text-blue-500" />
              <span>Trade Duration Engine (Min 60 Seconds)</span>
            </h3>
            <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
              LegionFunding rule: Positions must be held open for at least {durationData?.minRequiredSec || 60} seconds to prevent high-frequency tick scalping.
            </p>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className={`p-3 rounded-xl border ${isLight ? 'bg-[#F8F9FB] border-[#E3E7EE]' : 'bg-[#0A0D14] border-[#1C232E]'}`}>
                <span className={`text-[10px] uppercase font-bold block ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>Avg Trade Duration</span>
                <span className={`text-lg font-bold font-mono ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  {Math.floor((durationData?.avgTradeDurationSec || 0) / 60)}m {(durationData?.avgTradeDurationSec || 0) % 60}s
                </span>
              </div>
              <div className={`p-3 rounded-xl border ${isLight ? 'bg-[#F8F9FB] border-[#E3E7EE]' : 'bg-[#0A0D14] border-[#1C232E]'}`}>
                <span className={`text-[10px] uppercase font-bold block ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>Duration Breaches</span>
                <span className={`text-lg font-bold font-mono ${(durationData?.durationBreachesCount || 0) > 0 ? (isLight ? 'text-rose-600' : 'text-rose-400') : (isLight ? 'text-emerald-600' : 'text-emerald-400')}`}>
                  {durationData?.durationBreachesCount || 0} Trades
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <span className={`text-xs font-bold uppercase tracking-wider ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Execution Audit</span>
              <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
                {durationData?.details.map((t, idx) => (
                  <div key={idx} className={`p-2.5 rounded-lg border flex items-center justify-between text-xs ${
                    isLight ? 'bg-[#F8F9FB] border-[#E3E7EE]' : 'bg-[#0A0D14] border-[#1C232E]'
                  }`}>
                    <span className={`font-mono font-bold ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>{t.symbol}</span>
                    <span className={`font-mono ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>{t.durationText}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                      t.isCompliant
                        ? isLight ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-emerald-950 text-emerald-400 border-emerald-500/30'
                        : isLight ? 'bg-rose-100 text-rose-800 border-rose-200' : 'bg-rose-950 text-rose-400 border-rose-500/30'
                    }`}>
                      {t.isCompliant ? 'COMPLIANT' : 'BREACH (< 60s)'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT 5: Rule Configuration & Presets */}
      {activeTab === 'rules' && (
        <div className="space-y-6 text-left">
          <div className={`p-6 rounded-2xl border space-y-4 shadow-sm ${
            isLight ? 'bg-white border-[#E3E7EE] shadow-slate-200/50' : 'bg-[#12161D] border-[#1C232E]'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className={`text-sm font-bold flex items-center gap-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  <Sliders className="w-4 h-4 text-cyan-500" />
                  <span>Configurable Prop Firm Parameters</span>
                </h3>
                <p className={`text-xs mt-0.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                  Customize loss calculation methods, enforcement modes, or load official LegionFunding presets.
                </p>
              </div>
              <button
                onClick={() => setIsAddAccountModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold transition cursor-pointer shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Preset Templates</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div className={`p-4 rounded-xl border space-y-2 ${isLight ? 'bg-[#F8F9FB] border-[#E3E7EE]' : 'bg-[#0A0D14] border-[#1C232E]'}`}>
                <label className={`text-xs font-bold block ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>Enforcement Mode</label>
                <select
                  value={activeAccount.enforcementMode || 'MONITOR'}
                  onChange={(e) => updatePropFirmAccount({ ...activeAccount, enforcementMode: e.target.value as any })}
                  className={`w-full rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none focus:border-indigo-500 border ${
                    isLight ? 'bg-white border-[#E3E7EE] text-slate-900' : 'bg-[#0A0D14] border-[#1C232E] text-white'
                  }`}
                >
                  <option value="MONITOR">MONITOR (Soft Warnings & Alerts)</option>
                  <option value="STRICT">STRICT (Hard Circuit Breakers)</option>
                </select>
              </div>

              <div className={`p-4 rounded-xl border space-y-2 ${isLight ? 'bg-[#F8F9FB] border-[#E3E7EE]' : 'bg-[#0A0D14] border-[#1C232E]'}`}>
                <label className={`text-xs font-bold block ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>Daily Loss Method</label>
                <select
                  value={activeAccount.dailyLossMethod || 'REALIZED_ONLY'}
                  onChange={(e) => updatePropFirmAccount({ ...activeAccount, dailyLossMethod: e.target.value as any })}
                  className={`w-full rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none focus:border-indigo-500 border ${
                    isLight ? 'bg-white border-[#E3E7EE] text-slate-900' : 'bg-[#0A0D14] border-[#1C232E] text-white'
                  }`}
                >
                  <option value="REALIZED_ONLY">REALIZED ONLY (Closed Trades)</option>
                  <option value="REALIZED_PLUS_FLOATING">REALIZED + FLOATING</option>
                  <option value="START_OF_DAY_BALANCE">START OF DAY BALANCE</option>
                  <option value="START_OF_DAY_EQUITY">START OF DAY EQUITY</option>
                </select>
              </div>

              <div className={`p-4 rounded-xl border space-y-2 ${isLight ? 'bg-[#F8F9FB] border-[#E3E7EE]' : 'bg-[#0A0D14] border-[#1C232E]'}`}>
                <label className={`text-xs font-bold block ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>Drawdown Model</label>
                <select
                  value={activeAccount.drawdownModel}
                  onChange={(e) => updatePropFirmAccount({ ...activeAccount, drawdownModel: e.target.value as any })}
                  className={`w-full rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none focus:border-indigo-500 border ${
                    isLight ? 'bg-white border-[#E3E7EE] text-slate-900' : 'bg-[#0A0D14] border-[#1C232E] text-white'
                  }`}
                >
                  <option value="STATIC">STATIC (Initial Balance Fixed)</option>
                  <option value="EOD_TRAILING">EOD TRAILING (End-of-day peak)</option>
                  <option value="INTRADAY_HWM_TRAILING">INTRADAY HWM TRAILING (Live high water)</option>
                </select>
              </div>
            </div>

            <div className={`space-y-3 pt-4 border-t ${isLight ? 'border-[#E3E7EE]' : 'border-[#1C232E]'}`}>
              <span className={`text-xs font-bold uppercase tracking-wider block ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>Active Rules List</span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activeAccount.rules.map((rule) => (
                  <div
                    key={rule.id}
                    className={`p-4 rounded-xl border space-y-3 ${
                      isLight ? 'bg-[#F8F9FB] border-[#E3E7EE]' : 'bg-[#0A0D14] border-[#1C232E]'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>{rule.name}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono border ${
                            isLight ? 'bg-slate-200 text-slate-700 border-slate-300' : 'bg-[#1A1F27] text-slate-400 border-[#1C232E]'
                          }`}>
                            {rule.type}
                          </span>
                        </div>
                        <p className={`text-[11px] mt-1 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>{rule.description}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            const updated = activeAccount.rules.map((r) =>
                              r.id === rule.id ? { ...r, enabled: !r.enabled } : r
                            );
                            updatePropFirmAccount({ ...activeAccount, rules: updated });
                          }}
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold transition cursor-pointer border ${
                            rule.enabled
                              ? isLight ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-emerald-950 text-emerald-400 border-emerald-500/30'
                              : isLight ? 'bg-slate-200 text-slate-500 border-slate-300' : 'bg-[#1A1F27] text-slate-500 border-[#1C232E]'
                          }`}
                        >
                          {rule.enabled ? 'Active' : 'Muted'}
                        </button>
                        <button
                          onClick={() => {
                            setEditingRule(rule);
                            setIsAddRuleModalOpen(true);
                          }}
                          className={`p-1 rounded cursor-pointer ${
                            isLight ? 'text-slate-400 hover:text-slate-700' : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    <div className={`pt-2 border-t flex items-center justify-between text-[11px] ${
                      isLight ? 'border-[#E3E7EE]' : 'border-[#1C232E]'
                    }`}>
                      <span className={isLight ? 'text-slate-500' : 'text-slate-400'}>Threshold:</span>
                      <span className={`font-mono font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                        {rule.threshold} {rule.unit}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 20 Modular Institutional Rule Evaluators Matrix */}
            {evaluation?.evaluators && (
              <div className={`space-y-3 pt-6 border-t ${isLight ? 'border-[#E3E7EE]' : 'border-[#1C232E]'}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <span className={`text-xs font-bold uppercase tracking-wider block flex items-center gap-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                      <Shield className="w-4 h-4 text-indigo-500" />
                      <span>20 Modular Institutional Rule Evaluators Matrix</span>
                    </span>
                    <p className={`text-[11px] mt-0.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                      Live real-time monitoring across all 20 institutional prop firm rules and risk parameters.
                    </p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                    isLight ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20'
                  }`}>
                    20 Active Monitors
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {[
                    {
                      name: '1. Profit Target',
                      evaluator: evaluation.evaluators.profitTarget,
                      desc: 'Phase profit target achievement tracking',
                    },
                    {
                      name: '2. Daily Drawdown',
                      evaluator: evaluation.evaluators.dailyLoss,
                      desc: 'Max loss per trading day monitor',
                    },
                    {
                      name: '3. Max Drawdown',
                      evaluator: evaluation.evaluators.maxDrawdown,
                      desc: 'Account overall drawdown threshold',
                    },
                    {
                      name: '4. Trading Days',
                      evaluator: evaluation.evaluators.tradingDays,
                      desc: 'Minimum required active trading days',
                    },
                    {
                      name: '5. Consistency Rule',
                      evaluator: evaluation.evaluators.consistency,
                      desc: 'Profit distribution & consistency limit',
                    },
                    {
                      name: '6. Lot Size Limit',
                      evaluator: (evaluation?.evaluators as any)?.lotSize,
                      desc: 'Max position sizing enforcement',
                    },
                    {
                      name: '7. News Trading',
                      evaluator: (evaluation?.evaluators as any)?.news,
                      desc: 'Red folder economic release buffer',
                    },
                    {
                      name: '8. Weekend Holding',
                      evaluator: (evaluation?.evaluators as any)?.weekendHolding,
                      desc: 'Weekend position carryover guard',
                    },
                    {
                      name: '9. Minimum Duration',
                      evaluator: (evaluation?.evaluators as any)?.holdingDuration,
                      desc: 'Ultra-fast scalp & tick trade filter',
                    },
                    {
                      name: '10. Inactivity Monitor',
                      evaluator: (evaluation?.evaluators as any)?.inactivity,
                      desc: '30-day dormant account auto-check',
                    },
                    {
                      name: '11. Martingale Detection',
                      evaluator: (evaluation?.evaluators as any)?.martingale,
                      desc: 'Exponential doubling size detector',
                    },
                    {
                      name: '12. Hedging Restriction',
                      evaluator: (evaluation?.evaluators as any)?.hedging,
                      desc: 'Simultaneous long/short protection',
                    },
                    {
                      name: '13. Stop-Loss Required',
                      evaluator: (evaluation?.evaluators as any)?.stopLossRequired,
                      desc: 'Mandatory defined protective stops',
                    },
                    {
                      name: '14. Daily Trade Count',
                      evaluator: (evaluation?.evaluators as any)?.dailyTradeCount,
                      desc: 'Overtrading prevention limit',
                    },
                    {
                      name: '15. Max Open Trades',
                      evaluator: (evaluation?.evaluators as any)?.maxOpenTrades,
                      desc: 'Simultaneous open exposure cap',
                    },
                    {
                      name: '16. Time of Day',
                      evaluator: (evaluation?.evaluators as any)?.timeOfDay,
                      desc: 'Permitted market session windows',
                    },
                    {
                      name: '17. Profit Cap',
                      evaluator: (evaluation?.evaluators as any)?.profitCap,
                      desc: 'Daily windfall max profit ceiling',
                    },
                    {
                      name: '18. Trailing Stop Rule',
                      evaluator: (evaluation?.evaluators as any)?.trailingStopRule,
                      desc: 'Dynamic high-water mark floor',
                    },
                    {
                      name: '19. Crypto Weekend Rule',
                      evaluator: (evaluation?.evaluators as any)?.cryptoHolding,
                      desc: 'Weekend crypto exposure policy',
                    },
                    {
                      name: '20. Restricted Pairs',
                      evaluator: (evaluation?.evaluators as any)?.restrictedPairs,
                      desc: 'Illiquid and prohibited asset audit',
                    },
                  ].map((item, idx) => {
                    const status = item.evaluator?.status || 'SAFE';
                    const isSafe = status === 'SAFE' || status === 'COMPLETED';
                    const isWarn = status === 'WARNING';
                    const isCrit = status === 'CRITICAL';

                    return (
                      <div
                        key={idx}
                        className={`p-3.5 rounded-xl border space-y-2 transition ${
                          isLight
                            ? 'bg-[#F8F9FB] border-[#E3E7EE] hover:border-slate-300'
                            : 'bg-[#0A0D14] border-[#1C232E] hover:border-[#2A3444]'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className={`text-xs font-bold truncate max-w-[130px] ${isLight ? 'text-slate-900' : 'text-white'}`}>
                            {item.name}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase border ${
                              isSafe
                                ? isLight ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-emerald-950/80 text-emerald-400 border-emerald-500/30'
                                : isWarn
                                ? isLight ? 'bg-amber-100 text-amber-800 border-amber-200' : 'bg-amber-950/80 text-amber-400 border-amber-500/30'
                                : isCrit
                                ? isLight ? 'bg-rose-100 text-rose-800 border-rose-200' : 'bg-rose-950/80 text-rose-400 border-rose-500/30'
                                : isLight ? 'bg-rose-200 text-rose-900 border-rose-300' : 'bg-red-950 text-red-300 border border-red-500/50'
                            }`}
                          >
                            {status}
                          </span>
                        </div>
                        <p className={`text-[10px] line-clamp-1 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>{item.desc}</p>
                        <div className={`p-1.5 rounded border text-[10px] font-mono ${
                          isLight ? 'bg-white border-[#E3E7EE] text-slate-700' : 'bg-[#0A0D14] border-[#1C232E] text-slate-300'
                        }`}>
                          {item.evaluator?.message || 'Rule evaluated & verified.'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT 6: Payouts & Profit Split */}
      {activeTab === 'payouts' && (
        <div className="space-y-6 text-left">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className={`p-4 rounded-2xl border space-y-1 shadow-sm ${
              isLight ? 'bg-white border-[#E3E7EE] shadow-slate-200/50' : 'bg-[#12161D] border-[#1C232E]'
            }`}>
              <span className={`text-[10px] uppercase font-bold ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Eligible Net Profit</span>
              <div className={`text-2xl font-black font-mono ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`}>
                {formatCurrency(payoutData?.eligibleProfit || 0)}
              </div>
              <span className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Above starting balance</span>
            </div>

            <div className={`p-4 rounded-2xl border space-y-1 shadow-sm ${
              isLight ? 'bg-white border-[#E3E7EE] shadow-slate-200/50' : 'bg-[#12161D] border-[#1C232E]'
            }`}>
              <span className={`text-[10px] uppercase font-bold ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Trader Share ({payoutData?.rewardSplitPercent || 80}%)</span>
              <div className={`text-2xl font-black font-mono ${isLight ? 'text-slate-900' : 'text-white'}`}>
                {formatCurrency(payoutData?.traderShare || 0)}
              </div>
              <span className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>80% Payout split</span>
            </div>

            <div className={`p-4 rounded-2xl border space-y-1 shadow-sm ${
              isLight ? 'bg-white border-[#E3E7EE] shadow-slate-200/50' : 'bg-[#12161D] border-[#1C232E]'
            }`}>
              <span className={`text-[10px] uppercase font-bold ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Firm Share (20%)</span>
              <div className={`text-2xl font-black font-mono ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                {formatCurrency(payoutData?.firmShare || 0)}
              </div>
              <span className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Hyper Funded Ltd.</span>
            </div>

            <div className={`p-4 rounded-2xl border flex flex-col justify-between shadow-sm ${
              isLight ? 'bg-white border-[#E3E7EE] shadow-slate-200/50' : 'bg-[#12161D] border-[#1C232E]'
            }`}>
              <span className={`text-[10px] uppercase font-bold ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Reward Claim Status</span>
              <button
                disabled={!payoutData?.isEligibleForRequest}
                onClick={() => setIsPayoutModalOpen(true)}
                className={`w-full py-2.5 rounded-xl text-white font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer ${
                  payoutData?.isEligibleForRequest
                    ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 shadow-md shadow-indigo-600/25 border border-indigo-400/30'
                    : isLight
                    ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                    : 'bg-[#1A1F27] text-slate-500 border border-[#1C232E] cursor-not-allowed'
                }`}
              >
                <Wallet className="w-3.5 h-3.5" />
                <span>Submit Reward Request</span>
              </button>
            </div>
          </div>

          <div className={`p-4 rounded-2xl border flex items-center justify-between text-xs shadow-sm ${
            isLight ? 'bg-white border-[#E3E7EE]' : 'bg-[#12161D] border-[#1C232E]'
          }`}>
            <div className="space-y-1">
              <span className={`font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>Reward Buffer Policy:</span>
              <p className={isLight ? 'text-slate-600' : 'text-slate-400'}>
                {payoutData?.rewardBufferPercent ? `Must hold a 3% profit buffer ($${payoutData.rewardBufferAmount}) before first payout.` : 'No active reward buffer restriction for this model.'}
              </p>
            </div>
            <span className={`px-3 py-1 rounded-full font-bold border ${
              payoutData?.rewardBufferMet
                ? isLight ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-emerald-950 text-emerald-400 border border-emerald-500/40'
                : isLight ? 'bg-amber-100 text-amber-800 border-amber-300' : 'bg-amber-950 text-amber-400 border border-amber-500/40'
            }`}>
              {payoutData?.rewardBufferMet ? 'Buffer Satisfied' : 'Buffer Pending'}
            </span>
          </div>
        </div>
      )}

      {/* TAB CONTENT 7: Violations & Audit Logs */}
      {activeTab === 'violations' && (
        <div className="space-y-6 text-left">
          <div className={`p-6 rounded-2xl border space-y-4 shadow-sm ${
            isLight ? 'bg-white border-[#E3E7EE] shadow-slate-200/50' : 'bg-[#12161D] border-[#1C232E]'
          }`}>
            <div className="flex items-center justify-between">
              <h3 className={`text-sm font-bold flex items-center gap-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                <AlertTriangle className="w-4 h-4 text-rose-500" />
                <span>Historical Rule Violations & Prohibited Behavior Monitor</span>
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className={`p-4 rounded-xl border space-y-2 ${isLight ? 'bg-[#F8F9FB] border-[#E3E7EE]' : 'bg-[#0A0D14] border-[#1C232E]'}`}>
                <span className={`text-xs font-bold block ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>Inactivity Rule Monitor (30 Days)</span>
                <div className={`text-sm font-mono ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                  Days Inactive: <strong className={isLight ? 'text-slate-900' : 'text-white'}>{inactivityData?.daysInactive} days</strong> (Max: 30)
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                  inactivityData?.status === 'SAFE'
                    ? isLight ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-emerald-950 text-emerald-400 border-emerald-500/30'
                    : isLight ? 'bg-rose-100 text-rose-800 border-rose-200' : 'bg-rose-950 text-rose-400 border-rose-500/30'
                }`}>
                  {inactivityData?.status}
                </span>
              </div>

              <div className={`p-4 rounded-xl border space-y-2 ${isLight ? 'bg-[#F8F9FB] border-[#E3E7EE]' : 'bg-[#0A0D14] border-[#1C232E]'}`}>
                <span className={`text-xs font-bold block ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>News Trading Audit</span>
                <div className={`text-sm font-mono ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                  Violating Trades: <strong className={isLight ? 'text-emerald-700' : 'text-emerald-400'}>{newsData?.violatingTradesCount || 0}</strong> (5m Window)
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                  isLight ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-emerald-950 text-emerald-400 border-emerald-500/30'
                }`}>
                  Compliant Window
                </span>
              </div>
            </div>

            {activeAccount.violations.length > 0 ? (
              <div className={`divide-y border rounded-xl overflow-hidden ${
                isLight ? 'divide-slate-200 border-[#E3E7EE] bg-[#F8F9FB]' : 'divide-[#1C232E] border-[#1C232E] bg-[#0A0D14]'
              }`}>
                {activeAccount.violations.map((v) => (
                  <div key={v.id} className="p-4 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-bold ${isLight ? 'text-rose-600' : 'text-rose-400'}`}>{v.ruleName}</span>
                      <span className={`text-[10px] font-mono ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>{new Date(v.timestamp).toLocaleString()}</span>
                    </div>
                    <p className={`text-xs ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>{v.explanation}</p>
                    <div className={`flex items-center gap-3 text-[11px] pt-1 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                      <span>Actual: <strong className={isLight ? 'text-rose-600' : 'text-rose-400'}>{v.actualValue}</strong></span>
                      <span>Allowed: <strong className={isLight ? 'text-slate-800' : 'text-slate-200'}>{v.allowedValue}</strong></span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className={`p-6 text-center text-xs space-y-1 ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`}>
                <CheckCircle2 className={`w-8 h-8 mx-auto opacity-80 ${isLight ? 'text-emerald-600' : 'text-emerald-500'}`} />
                <p className="font-bold">Zero Violations Recorded</p>
                <p className={isLight ? 'text-slate-500' : 'text-slate-400'}>Account has maintained 100% compliance across all active rules.</p>
              </div>
            )}
          </div>
        </div>
      )}
        </>
      )}

      {/* MODAL 1: Custom Prop Firm Configuration Wizard */}
      <PropFirmWizardModal
        isOpen={isAddAccountModalOpen}
        onClose={() => setIsAddAccountModalOpen(false)}
        onAccountCreated={handleAccountCreated}
      />

      {/* MODAL 2: Edit Existing Prop Firm Account */}
      {isEditAccountModalOpen && activeAccount && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className={`border rounded-2xl w-full max-w-lg p-6 space-y-4 text-left shadow-2xl ${
            isLight ? 'bg-white border-[#E3E7EE] shadow-slate-400/30' : 'bg-[#12161D] border-[#1C232E]'
          }`}>
            <div className={`flex items-center justify-between border-b pb-3 ${isLight ? 'border-[#E3E7EE]' : 'border-[#1C232E]'}`}>
              <h3 className={`text-base font-extrabold flex items-center gap-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                <Edit2 className="w-4 h-4 text-indigo-500" />
                <span>Edit Account Parameters</span>
              </h3>
              <button
                onClick={() => setIsEditAccountModalOpen(false)}
                className={`p-1 rounded-lg transition cursor-pointer ${
                  isLight ? 'text-slate-400 hover:text-slate-700 hover:bg-slate-100' : 'text-slate-400 hover:text-white hover:bg-[#1A1F27]'
                }`}
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className={`font-bold block mb-1 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>Account Name</label>
                <input
                  type="text"
                  value={editAccountName}
                  onChange={(e) => setEditAccountName(e.target.value)}
                  className={`w-full rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 border ${
                    isLight ? 'bg-[#F8F9FB] border-[#E3E7EE] text-slate-900' : 'bg-[#0A0D14] border-[#1C232E] text-white'
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`font-bold block mb-1 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>Starting Balance ($)</label>
                  <input
                    type="number"
                    value={editStartingBalance}
                    onChange={(e) => setEditStartingBalance(parseFloat(e.target.value) || 0)}
                    className={`w-full rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:border-indigo-500 border ${
                      isLight ? 'bg-[#F8F9FB] border-[#E3E7EE] text-slate-900' : 'bg-[#0A0D14] border-[#1C232E] text-white'
                    }`}
                  />
                </div>
                <div>
                  <label className={`font-bold block mb-1 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>Enforcement Mode</label>
                  <select
                    value={editEnforcementMode}
                    onChange={(e) => setEditEnforcementMode(e.target.value as any)}
                    className={`w-full rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 border ${
                      isLight ? 'bg-[#F8F9FB] border-[#E3E7EE] text-slate-900' : 'bg-[#0A0D14] border-[#1C232E] text-white'
                    }`}
                  >
                    <option value="MONITOR">MONITOR (Alerts Only)</option>
                    <option value="HARD_BREACH">HARD_BREACH (Locking)</option>
                    <option value="DISABLED">DISABLED</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className={`font-bold block mb-1 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>Profit Target %</label>
                  <input
                    type="number"
                    value={editTargetPercent}
                    onChange={(e) => setEditTargetPercent(parseFloat(e.target.value) || 0)}
                    className={`w-full rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:border-indigo-500 border ${
                      isLight ? 'bg-[#F8F9FB] border-[#E3E7EE] text-slate-900' : 'bg-[#0A0D14] border-[#1C232E] text-white'
                    }`}
                  />
                </div>
                <div>
                  <label className={`font-bold block mb-1 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>Daily Loss %</label>
                  <input
                    type="number"
                    value={editDailyLossPercent}
                    onChange={(e) => setEditDailyLossPercent(parseFloat(e.target.value) || 0)}
                    className={`w-full rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:border-indigo-500 border ${
                      isLight ? 'bg-[#F8F9FB] border-[#E3E7EE] text-slate-900' : 'bg-[#0A0D14] border-[#1C232E] text-white'
                    }`}
                  />
                </div>
                <div>
                  <label className={`font-bold block mb-1 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>Total Loss %</label>
                  <input
                    type="number"
                    value={editTotalLossPercent}
                    onChange={(e) => setEditTotalLossPercent(parseFloat(e.target.value) || 0)}
                    className={`w-full rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:border-indigo-500 border ${
                      isLight ? 'bg-[#F8F9FB] border-[#E3E7EE] text-slate-900' : 'bg-[#0A0D14] border-[#1C232E] text-white'
                    }`}
                  />
                </div>
              </div>
            </div>

            <div className={`pt-3 border-t flex items-center justify-end gap-3 ${isLight ? 'border-[#E3E7EE]' : 'border-[#1C232E]'}`}>
              <button
                type="button"
                onClick={() => setIsEditAccountModalOpen(false)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer border ${
                  isLight ? 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200' : 'bg-[#1A1F27] border-[#1C232E] text-slate-300 hover:text-white'
                }`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleEditAccountSubmit}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white text-xs font-bold transition shadow-lg shadow-indigo-600/25 border border-indigo-400/30 cursor-pointer"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: In-App Delete Prop Firm Account Confirmation Dialog */}
      {isDeleteModalOpen && (accountPendingDelete || activeAccount) && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => {
            setIsDeleteModalOpen(false);
            setAccountPendingDelete(null);
          }}
        >
          <div
            className={`border rounded-2xl w-full max-w-md p-6 space-y-5 text-left shadow-2xl animate-in zoom-in-95 duration-150 ${
              isLight ? 'bg-white border-[#E3E7EE] shadow-slate-400/30' : 'bg-[#12161D] border-[#1C232E]'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3.5">
              <div className={`p-3 rounded-xl border shrink-0 ${
                isLight ? 'bg-rose-50 text-rose-600 border-rose-200' : 'bg-rose-500/10 text-rose-400 border-rose-500/25'
              }`}>
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className={`text-base font-bold tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  Delete Prop Firm Account?
                </h3>
                <p className={`text-xs mt-1 leading-relaxed ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                  Are you sure you want to delete <span className="font-semibold text-slate-900 dark:text-white">"{(accountPendingDelete || activeAccount)?.name}"</span>? All linked evaluation rules, phase milestones, and live risk metrics will be removed.
                </p>
              </div>
            </div>

            {/* Account Quick Specs Summary Badge */}
            {(accountPendingDelete || activeAccount) && (
              <div className={`p-3.5 rounded-xl border text-xs space-y-2 ${
                isLight ? 'bg-slate-50 border-slate-200 text-slate-700' : 'bg-[#0A0D14] border-[#1C232E] text-slate-300'
              }`}>
                <div className="flex items-center justify-between text-[11px]">
                  <span className={isLight ? 'text-slate-500' : 'text-slate-400'}>Firm / Provider:</span>
                  <span className="font-semibold">{(accountPendingDelete || activeAccount)?.firmName}</span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className={isLight ? 'text-slate-500' : 'text-slate-400'}>Starting Balance:</span>
                  <span className="font-mono font-semibold">{formatCurrency((accountPendingDelete || activeAccount)?.startingBalance || 0)}</span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className={isLight ? 'text-slate-500' : 'text-slate-400'}>Program Model:</span>
                  <span className="font-medium capitalize">{(accountPendingDelete || activeAccount)?.programModel?.toLowerCase().replace('_', ' ')}</span>
                </div>
                {(accountPendingDelete || activeAccount)?.phase && (
                  <div className="flex items-center justify-between text-[11px]">
                    <span className={isLight ? 'text-slate-500' : 'text-slate-400'}>Current Phase:</span>
                    <span className="font-medium">{(accountPendingDelete || activeAccount)?.phaseName || (accountPendingDelete || activeAccount)?.phase}</span>
                  </div>
                )}
              </div>
            )}

            <div className={`pt-3 border-t flex items-center justify-end gap-3 ${isLight ? 'border-slate-100' : 'border-[#1C232E]'}`}>
              <button
                type="button"
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setAccountPendingDelete(null);
                }}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer border ${
                  isLight
                    ? 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                    : 'bg-[#1A1F27] border-[#1C232E] text-slate-300 hover:text-white'
                }`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteAccount}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 active:scale-95 text-white text-xs font-bold transition shadow-md shadow-rose-600/25 border border-rose-500/40 cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Account</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
