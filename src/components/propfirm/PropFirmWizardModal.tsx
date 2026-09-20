import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Shield,
  Layers,
  Sliders,
  DollarSign,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Building2,
  FileCheck,
  Check,
  Award,
} from 'lucide-react';
import {
  PropFirmWizardConfig,
  WIZARD_TEMPLATES,
  createCustomPropFirmAccount,
} from '../../services/propFirmEngine';
import {
  PropFirmAccount,
  ProgramModelType,
  DrawdownModelType,
  DailyDrawdownModelType,
} from '../../types';
import { useTrading } from '../../context/TradingContext';

interface PropFirmWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccountCreated: (account: PropFirmAccount) => void;
}

const STEPS = [
  { id: 1, label: 'Identity & Model', icon: Building2 },
  { id: 2, label: 'Phases & Targets', icon: Layers },
  { id: 3, label: 'Drawdown Engine', icon: Sliders },
  { id: 4, label: 'Trading Policies', icon: Shield },
  { id: 5, label: 'Payout & Scale', icon: DollarSign },
  { id: 6, label: 'Audit & Confirm', icon: FileCheck },
];

const QUICK_SIZES = [10000, 25000, 50000, 100000, 200000, 300000];
const CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD', 'AUD'];

const DEFAULT_CONFIG: PropFirmWizardConfig = {
  propFirmName: '',
  displayName: '',
  accountSize: 100000,
  currency: 'USD',
  programModel: 'TWO_STEP',
  tradingAccountLink: 'all',

  phase1: {
    profitTargetEnabled: true,
    profitTargetPercent: 8,
    dailyLossEnabled: true,
    dailyLossPercent: 4,
    dailyLossMethod: 'START_OF_DAY_BALANCE',
    maxLossEnabled: true,
    totalLossPercent: 10,
    drawdownModel: 'STATIC',
    minTradingDays: 5,
    maxTradingDays: 0,
    qualifyingDayProfitPercent: 0.5,
    inactivityMaxDays: 30,
  },

  phase2: {
    profitTargetEnabled: true,
    profitTargetPercent: 5,
    dailyLossEnabled: true,
    dailyLossPercent: 4,
    dailyLossMethod: 'START_OF_DAY_BALANCE',
    maxLossEnabled: true,
    totalLossPercent: 10,
    drawdownModel: 'STATIC',
    minTradingDays: 5,
    maxTradingDays: 0,
    qualifyingDayProfitPercent: 0.5,
    inactivityMaxDays: 30,
  },

  consistencyRule: true,
  consistencyMaxDayPercent: 50,
  maxProfitConcentrationPercent: 40,
  newsTrading: 'RESTRICTED',
  newsWindowMinutes: 5,
  weekendHolding: true,
  overnightHolding: true,
  eaTrading: 'ALLOWED',
  copyTrading: 'ALLOWED',
  hedging: 'ALLOWED',
  maxLotSize: 20,
  maxPositions: 10,
  maxTradesPerDay: 50,
  maxLeverage: 100,
  prohibitedStrategies: ['Martingale', 'Grid Trading', 'Latency Arbitrage', 'High-Frequency (HFT)'],
  vpnAllowed: true,
  vpsAllowed: true,
  singleIpOnly: false,

  payoutEnabled: true,
  profitSplitTraderPercent: 80,
  payoutFrequency: 'BIWEEKLY',
  minPayoutAmount: 100,
  firstPayoutDays: 14,
  minProfitableDaysForPayout: 5,

  scalingEnabled: true,
  scalingProfitPercent: 10,
  scalingIncrementAmount: 25000,
  maxScalingAccountSize: 2000000,
};

const STRATEGY_OPTIONS = [
  'Martingale',
  'Grid Trading',
  'Latency Arbitrage',
  'High-Frequency (HFT)',
  'Tick Scalping',
  'Reverse Arbitrage',
  'Account Mirroring',
  'Pass-the-Challenge Bot',
];

export const PropFirmWizardModal: React.FC<PropFirmWizardModalProps> = ({
  isOpen,
  onClose,
  onAccountCreated,
}) => {
  const { accounts } = useTrading();
  const [currentStep, setCurrentStep] = useState(1);
  const [config, setConfig] = useState<PropFirmWizardConfig>(DEFAULT_CONFIG);
  const [selectedTemplateKey, setSelectedTemplateKey] = useState<string>('custom');

  // Prevent scrolling on document body when modal is active
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Template pre-fill handler
  const handleApplyTemplate = (templateKey: string) => {
    setSelectedTemplateKey(templateKey);
    const tmpl = WIZARD_TEMPLATES[templateKey];
    if (!tmpl) return;

    setConfig((prev) => ({
      ...prev,
      ...tmpl.config,
      phase1: {
        ...prev.phase1,
        ...(tmpl.config.phase1 || {}),
      },
      phase2: {
        ...prev.phase2,
        ...(tmpl.config.phase2 || {}),
      },
    }));
  };

  // Dynamic calculations for preview
  const calcP1Target = config.phase1.profitTargetEnabled ? (config.accountSize * config.phase1.profitTargetPercent) / 100 : 0;
  const calcP1Daily = (config.accountSize * config.phase1.dailyLossPercent) / 100;
  const calcP1Total = (config.accountSize * config.phase1.totalLossPercent) / 100;

  const calcP2Target = config.phase2.profitTargetEnabled ? (config.accountSize * config.phase2.profitTargetPercent) / 100 : 0;
  const calcP2Daily = (config.accountSize * config.phase2.dailyLossPercent) / 100;
  const calcP2Total = (config.accountSize * config.phase2.totalLossPercent) / 100;

  const toggleStrategy = (strat: string) => {
    setConfig((prev) => {
      const exists = prev.prohibitedStrategies.includes(strat);
      const updated = exists
        ? prev.prohibitedStrategies.filter((s) => s !== strat)
        : [...prev.prohibitedStrategies, strat];
      return { ...prev, prohibitedStrategies: updated };
    });
  };

  const handleFinalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalAccount = createCustomPropFirmAccount(config);
    onAccountCreated(finalAccount);
    onClose();
  };

  const canProceedStep1 = config.propFirmName.trim().length > 0 && config.accountSize > 0;

  const modalContent = (
    <div
      className="fixed inset-0 z-[9990] flex items-center justify-center p-3 sm:p-5 md:p-6 bg-black/75 backdrop-blur-md overflow-hidden animate-fadeIn select-none"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="relative w-full max-w-5xl max-h-[calc(100vh-32px)] sm:max-h-[calc(100vh-48px)] bg-[#12161D]/95 border border-[#1C232E] rounded-2xl shadow-[0_25px_80px_rgba(0,0,0,0.7),0_0_50px_rgba(99,102,241,0.08)] flex flex-col overflow-hidden text-slate-200 z-[9991] backdrop-blur-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* =========================================================================
            1. FIXED MODAL HEADER (CLEAN & COMPACT)
            ========================================================================= */}
        <div className="shrink-0 flex items-center justify-between px-6 sm:px-7 py-3.5 border-b border-[#1C232E] bg-[#12161D]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
              <Shield className="w-4.5 h-4.5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  Configure Prop Firm Account
                </h2>
                <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-blue-500/10 text-blue-300 border border-blue-500/20">
                  Custom Rules
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 hidden sm:block">
                Configure evaluation phases, drawdown engines, and risk rules.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-[#1A1F27] border border-transparent hover:border-[#1C232E] transition-all cursor-pointer"
            title="Close Wizard"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* =========================================================================
            2. FIXED STEP PROGRESS NAVIGATION (SLEEK & BALANCED)
            ========================================================================= */}
        <div className="shrink-0 px-6 sm:px-7 py-2.5 bg-[#0A0D14] border-b border-[#1C232E] flex items-center justify-between overflow-x-auto gap-2 no-scrollbar">
          {STEPS.map((s) => {
            const Icon = s.icon;
            const isCompleted = currentStep > s.id;
            const isCurrent = currentStep === s.id;

            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setCurrentStep(s.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  isCurrent
                    ? 'bg-blue-600/10 border border-blue-500/40 text-blue-200 shadow-sm'
                    : isCompleted
                    ? 'bg-[#12161D] border border-[#1C232E] text-slate-300 hover:text-white hover:border-[#273141]'
                    : 'text-slate-500 hover:text-slate-300 hover:bg-[#12161D]/50'
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors ${
                    isCurrent
                      ? 'bg-blue-600 text-white'
                      : isCompleted
                      ? 'bg-blue-950/80 text-blue-400 border border-blue-500/30'
                      : 'bg-[#1A1F27] text-slate-500 border border-[#1C232E]'
                  }`}
                >
                  {isCompleted ? <Check className="w-3 h-3 stroke-[2.5]" /> : s.id}
                </span>
                <span className="hidden sm:inline">{s.label}</span>
              </button>
            );
          })}
        </div>

        {/* =========================================================================
            3. SCROLLABLE MODAL CONTENT (GENEROUS BOTTOM BREATHING ROOM)
            ========================================================================= */}
        <div className="flex-1 overflow-y-auto custom-scrollbar px-6 sm:px-7 py-6 pb-20 space-y-6 min-h-0 text-left">
          
          {/* STEP 1: IDENTITY & MODEL */}
          {currentStep === 1 && (
            <div className="space-y-6">
              {/* Optional Preset Quick-Loader */}
              <div className="p-4 sm:p-5 rounded-2xl bg-[#12161D] border border-[#1C232E] space-y-3.5">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-blue-400">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Quick Templates (Optional)</span>
                  </div>
                  <span className="text-xs text-slate-400">Pre-populates industry standard rules</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {Object.entries(WIZARD_TEMPLATES).map(([key, tmpl]) => {
                    const isSelected = selectedTemplateKey === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => handleApplyTemplate(key)}
                        className={`p-3 text-left rounded-xl text-xs border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-blue-600/10 border-blue-500/60 text-white shadow-sm'
                            : 'bg-[#0A0D14] border-[#1C232E] text-slate-300 hover:border-[#273141] hover:bg-[#161B23] hover:text-white'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-white truncate">{tmpl.label}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-blue-400 shrink-0" />}
                        </div>
                        <div className="text-[11px] text-slate-400 capitalize">
                          {tmpl.model.replace('_', ' ').toLowerCase()}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Primary Identity Form */}
              <div className="p-5 sm:p-6 rounded-2xl bg-[#12161D] border border-[#1C232E] space-y-4">
                <h3 className="text-sm font-bold text-white tracking-tight">
                  Account Identity
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-200">
                      Prop Firm Name <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. FundedNext, FTMO, Apex, Topstep"
                      value={config.propFirmName}
                      onChange={(e) => setConfig({ ...config, propFirmName: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#0A0D14] border border-[#1C232E] text-white text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 focus:outline-none transition-colors"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-200">
                      Account Display Label <span className="text-slate-400 font-normal">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 100K Stellar Phase 1"
                      value={config.displayName}
                      onChange={(e) => setConfig({ ...config, displayName: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#0A0D14] border border-[#1C232E] text-white text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 focus:outline-none transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* Account Size & Currency */}
              <div className="p-5 sm:p-6 rounded-2xl bg-[#12161D] border border-[#1C232E] space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h3 className="text-sm font-bold text-white tracking-tight">
                    Account Capital Size <span className="text-rose-400">*</span>
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">Currency:</span>
                    <select
                      value={config.currency}
                      onChange={(e) => setConfig({ ...config, currency: e.target.value })}
                      className="px-2.5 py-1 bg-[#0A0D14] border border-[#1C232E] text-white rounded-lg text-xs font-mono focus:outline-none focus:border-blue-500 cursor-pointer"
                    >
                      {CURRENCIES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    {QUICK_SIZES.map((sz) => {
                      const isSelected = config.accountSize === sz;
                      return (
                        <button
                          key={sz}
                          type="button"
                          onClick={() => setConfig({ ...config, accountSize: sz })}
                          className={`px-3.5 py-2 rounded-xl text-xs font-mono font-semibold transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-blue-600 text-white shadow-sm border border-blue-500'
                              : 'bg-[#0A0D14] border border-[#1C232E] text-slate-300 hover:border-[#273141] hover:text-white hover:bg-[#161B23]'
                          }`}
                        >
                          ${(sz / 1000)}K
                        </button>
                      );
                    })}
                  </div>

                  <div className="relative">
                    <span className="absolute left-3.5 top-2.5 text-slate-400 text-sm font-mono">$</span>
                    <input
                      type="number"
                      min={1000}
                      step={1000}
                      value={config.accountSize}
                      onChange={(e) => setConfig({ ...config, accountSize: Math.max(1000, parseFloat(e.target.value) || 0) })}
                      placeholder="Custom capital size..."
                      className="w-full pl-8 pr-3.5 py-2.5 rounded-xl bg-[#0A0D14] border border-[#1C232E] text-white text-sm font-semibold focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 focus:outline-none font-mono transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* Program Model Selection */}
              <div className="p-5 sm:p-6 rounded-2xl bg-[#12161D] border border-[#1C232E] space-y-4">
                <h3 className="text-sm font-bold text-white tracking-tight">
                  Program Architecture <span className="text-rose-400">*</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {[
                    {
                      id: 'TWO_STEP' as ProgramModelType,
                      title: 'Two-Step Challenge',
                      desc: 'Phase 1 Evaluation → Phase 2 Verification → Live Simulated Funded status.',
                      badge: 'Standard',
                    },
                    {
                      id: 'ONE_STEP' as ProgramModelType,
                      title: 'One-Step Evaluation',
                      desc: 'Single evaluation stage leading directly into Funded capital allocation.',
                      badge: 'Fast-Track',
                    },
                    {
                      id: 'INSTANT_FUNDING' as ProgramModelType,
                      title: 'Instant Funding',
                      desc: 'Direct live funded allocation with immediate payouts and no profit targets.',
                      badge: 'Direct',
                    },
                  ].map((m) => {
                    const isSelected = config.programModel === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setConfig({ ...config, programModel: m.id })}
                        className={`p-4 rounded-xl text-left border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-blue-600/10 border-blue-500 text-white shadow-sm'
                            : 'bg-[#0A0D14] border-[#1C232E] text-slate-400 hover:border-[#273141] hover:text-slate-200 hover:bg-[#161B23]'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-semibold text-sm text-white">{m.title}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${
                            isSelected
                              ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                              : 'bg-[#1A1F27] text-slate-400 border-[#1C232E]'
                          }`}>
                            {m.badge}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 leading-relaxed">{m.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Trade Source Link */}
              <div className="p-5 sm:p-6 rounded-2xl bg-[#12161D] border border-[#1C232E] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-bold text-white tracking-tight">Link to Trade Source</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Audit compliance against all closed trades or a specific linked trading account.
                  </p>
                </div>
                <select
                  value={config.tradingAccountLink}
                  onChange={(e) => setConfig({ ...config, tradingAccountLink: e.target.value })}
                  className="w-full sm:w-64 px-3.5 py-2.5 bg-[#0A0D14] border border-[#1C232E] text-white rounded-xl text-xs focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="all">All Closed Trades (Global Feed)</option>
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({acc.broker || 'Manual'}) - {acc.accountNumber || acc.id}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* STEP 2: PHASES & TARGETS */}
          {currentStep === 2 && (
            <div className="space-y-6">
              {/* Header Context */}
              <div className="flex items-center justify-between flex-wrap gap-3 pb-2 border-b border-[#1C232E]">
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
                    Target & Loss Calibration
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Configure phase profit objectives, daily loss limits, and trading day constraints.
                  </p>
                </div>
                <div className="text-xs font-mono font-bold px-3 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400">
                  ${config.accountSize.toLocaleString()} {config.currency}
                </div>
              </div>

              {/* PHASE 1 (OR SINGLE EVALUATION) */}
              <div className="p-5 sm:p-6 rounded-2xl bg-[#12161D] border border-[#1C232E] space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-[#1C232E]">
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded-lg bg-blue-600 text-white flex items-center justify-center text-xs font-bold shadow-sm">
                      1
                    </span>
                    <span className="text-sm font-bold text-white">
                      {config.programModel === 'ONE_STEP'
                        ? 'Evaluation Phase'
                        : config.programModel === 'INSTANT_FUNDING'
                        ? 'Instant Funded Rules'
                        : 'Phase 1: Evaluation Stage'}
                    </span>
                  </div>
                  <span className="text-xs text-slate-400 font-mono">
                    Baseline Capital: ${config.accountSize.toLocaleString()}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Profit Target */}
                  {config.programModel !== 'INSTANT_FUNDING' && (
                    <div className="p-4 rounded-xl bg-[#0A0D14] border border-[#1C232E] space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-emerald-400">Profit Target</label>
                        <input
                          type="checkbox"
                          checked={config.phase1.profitTargetEnabled}
                          onChange={(e) =>
                            setConfig({
                              ...config,
                              phase1: { ...config.phase1, profitTargetEnabled: e.target.checked },
                            })
                          }
                          className="w-4 h-4 rounded border-[#1C232E] bg-[#12161D] text-blue-600 focus:ring-0 cursor-pointer"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <input
                            type="number"
                            step={0.5}
                            min={0}
                            value={config.phase1.profitTargetPercent}
                            onChange={(e) =>
                              setConfig({
                                ...config,
                                phase1: { ...config.phase1, profitTargetPercent: parseFloat(e.target.value) || 0 },
                              })
                            }
                            className="w-full px-3 py-2 rounded-xl bg-[#12161D] border border-[#1C232E] text-white font-mono text-xs font-bold focus:border-blue-500 focus:outline-none"
                          />
                        </div>
                        <span className="text-xs text-slate-400 font-mono">%</span>
                        <div className="font-mono text-xs text-emerald-400 font-bold whitespace-nowrap">
                          +${calcP1Target.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Daily Loss Limit */}
                  <div className="p-4 rounded-xl bg-[#0A0D14] border border-[#1C232E] space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-amber-400">Daily Loss Limit</label>
                      <span className="text-[10px] text-slate-500">Per session</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <input
                          type="number"
                          step={0.5}
                          min={1}
                          value={config.phase1.dailyLossPercent}
                          onChange={(e) =>
                            setConfig({
                              ...config,
                              phase1: { ...config.phase1, dailyLossPercent: parseFloat(e.target.value) || 0 },
                            })
                          }
                          className="w-full px-3 py-2 rounded-xl bg-[#12161D] border border-[#1C232E] text-white font-mono text-xs font-bold focus:border-blue-500 focus:outline-none"
                        />
                      </div>
                      <span className="text-xs text-slate-400 font-mono">%</span>
                      <div className="font-mono text-xs text-amber-400 font-bold whitespace-nowrap">
                        -${calcP1Daily.toLocaleString()}
                      </div>
                    </div>
                  </div>

                  {/* Max Total Loss */}
                  <div className="p-4 rounded-xl bg-[#0A0D14] border border-[#1C232E] space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-rose-400">Maximum Drawdown</label>
                      <span className="text-[10px] text-slate-500">Account floor</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <input
                          type="number"
                          step={0.5}
                          min={1}
                          value={config.phase1.totalLossPercent}
                          onChange={(e) =>
                            setConfig({
                              ...config,
                              phase1: { ...config.phase1, totalLossPercent: parseFloat(e.target.value) || 0 },
                            })
                          }
                          className="w-full px-3 py-2 rounded-xl bg-[#12161D] border border-[#1C232E] text-white font-mono text-xs font-bold focus:border-blue-500 focus:outline-none"
                        />
                      </div>
                      <span className="text-xs text-slate-400 font-mono">%</span>
                      <div className="font-mono text-xs text-rose-400 font-bold whitespace-nowrap">
                        -${calcP1Total.toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Day Constraints */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-200">Min Trading Days</label>
                    <input
                      type="number"
                      min={0}
                      value={config.phase1.minTradingDays}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          phase1: { ...config.phase1, minTradingDays: parseInt(e.target.value, 10) || 0 },
                        })
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#0A0D14] border border-[#1C232E] text-white text-xs font-mono focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-200">Max Trading Days (0 = Unlimited)</label>
                    <input
                      type="number"
                      min={0}
                      value={config.phase1.maxTradingDays}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          phase1: { ...config.phase1, maxTradingDays: parseInt(e.target.value, 10) || 0 },
                        })
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#0A0D14] border border-[#1C232E] text-white text-xs font-mono focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-200">Qualifying Day Min Profit (%)</label>
                    <input
                      type="number"
                      step={0.1}
                      min={0}
                      value={config.phase1.qualifyingDayProfitPercent || 0}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          phase1: { ...config.phase1, qualifyingDayProfitPercent: parseFloat(e.target.value) || 0 },
                        })
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#0A0D14] border border-[#1C232E] text-white text-xs font-mono focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* PHASE 2 (IF TWO-STEP) */}
              {config.programModel === 'TWO_STEP' && (
                <div className="p-5 sm:p-6 rounded-2xl bg-[#12161D] border border-[#1C232E] space-y-5">
                  <div className="flex items-center justify-between pb-3 border-b border-[#1C232E]">
                    <div className="flex items-center gap-2.5">
                      <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-xs font-bold shadow-sm">
                        2
                      </span>
                      <span className="text-sm font-bold text-white">Phase 2: Verification Stage</span>
                    </div>
                    <span className="text-xs text-slate-400 font-mono">
                      Verification Targets & Rules
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="p-4 rounded-xl bg-[#0A0D14] border border-[#1C232E] space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-emerald-400">Profit Target</label>
                        <input
                          type="checkbox"
                          checked={config.phase2.profitTargetEnabled}
                          onChange={(e) =>
                            setConfig({
                              ...config,
                              phase2: { ...config.phase2, profitTargetEnabled: e.target.checked },
                            })
                          }
                          className="w-4 h-4 rounded border-[#1C232E] bg-[#12161D] text-blue-600 focus:ring-0 cursor-pointer"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          step={0.5}
                          min={0}
                          value={config.phase2.profitTargetPercent}
                          onChange={(e) =>
                            setConfig({
                              ...config,
                              phase2: { ...config.phase2, profitTargetPercent: parseFloat(e.target.value) || 0 },
                            })
                          }
                          className="w-full px-3 py-2 rounded-xl bg-[#12161D] border border-[#1C232E] text-white font-mono text-xs font-bold focus:border-blue-500 focus:outline-none"
                        />
                        <span className="text-xs text-slate-400 font-mono">%</span>
                        <div className="font-mono text-xs text-emerald-400 font-bold whitespace-nowrap">
                          +${calcP2Target.toLocaleString()}
                        </div>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-[#0A0D14] border border-[#1C232E] space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-amber-400">Daily Loss Limit</label>
                        <span className="text-[10px] text-slate-500">Per session</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          step={0.5}
                          min={1}
                          value={config.phase2.dailyLossPercent}
                          onChange={(e) =>
                            setConfig({
                              ...config,
                              phase2: { ...config.phase2, dailyLossPercent: parseFloat(e.target.value) || 0 },
                            })
                          }
                          className="w-full px-3 py-2 rounded-xl bg-[#12161D] border border-[#1C232E] text-white font-mono text-xs font-bold focus:border-blue-500 focus:outline-none"
                        />
                        <span className="text-xs text-slate-400 font-mono">%</span>
                        <div className="font-mono text-xs text-amber-400 font-bold whitespace-nowrap">
                          -${calcP2Daily.toLocaleString()}
                        </div>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-[#0A0D14] border border-[#1C232E] space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-rose-400">Maximum Drawdown</label>
                        <span className="text-[10px] text-slate-500">Account floor</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          step={0.5}
                          min={1}
                          value={config.phase2.totalLossPercent}
                          onChange={(e) =>
                            setConfig({
                              ...config,
                              phase2: { ...config.phase2, totalLossPercent: parseFloat(e.target.value) || 0 },
                            })
                          }
                          className="w-full px-3 py-2 rounded-xl bg-[#12161D] border border-[#1C232E] text-white font-mono text-xs font-bold focus:border-blue-500 focus:outline-none"
                        />
                        <span className="text-xs text-slate-400 font-mono">%</span>
                        <div className="font-mono text-xs text-rose-400 font-bold whitespace-nowrap">
                          -${calcP2Total.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-slate-200">Min Trading Days (Phase 2)</label>
                      <input
                        type="number"
                        min={0}
                        value={config.phase2.minTradingDays}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            phase2: { ...config.phase2, minTradingDays: parseInt(e.target.value, 10) || 0 },
                          })
                        }
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#0A0D14] border border-[#1C232E] text-white text-xs font-mono focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-slate-200">Qualifying Day Profit (%)</label>
                      <input
                        type="number"
                        step={0.1}
                        min={0}
                        value={config.phase2.qualifyingDayProfitPercent || 0}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            phase2: { ...config.phase2, qualifyingDayProfitPercent: parseFloat(e.target.value) || 0 },
                          })
                        }
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#0A0D14] border border-[#1C232E] text-white text-xs font-mono focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 3: DRAWDOWN ENGINE */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="pb-2 border-b border-[#1C232E]">
                <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
                  Drawdown Calculation Engine
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Select how daily loss and overall maximum drawdowns are measured by the evaluation engine.
                </p>
              </div>

              {/* Daily Loss Reset Methodology */}
              <div className="p-5 sm:p-6 rounded-2xl bg-[#12161D] border border-[#1C232E] space-y-4">
                <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                  Daily Loss Reset Methodology
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    {
                      id: 'START_OF_DAY_BALANCE' as DailyDrawdownModelType,
                      name: 'Start of Day Balance',
                      desc: 'Resets at 00:00 server time. Loss limit calculated strictly from opening cash balance.',
                    },
                    {
                      id: 'START_OF_DAY_EQUITY' as DailyDrawdownModelType,
                      name: 'Start of Day Equity (Open Floating)',
                      desc: 'Resets at 00:00 server time. Takes the higher of balance or equity including open floating trades.',
                    },
                    {
                      id: 'REALIZED_ONLY' as DailyDrawdownModelType,
                      name: 'Realized Only (Closed Trades)',
                      desc: 'Calculated exclusively on closed trades booked during the active session calendar day.',
                    },
                    {
                      id: 'HIGHEST_EQUITY_TRAIL' as DailyDrawdownModelType,
                      name: 'Trailing Intraday Peak',
                      desc: 'Drawdown limit trails current peak equity during active intraday sessions.',
                    },
                  ].map((m) => {
                    const isSelected = config.phase1.dailyLossMethod === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() =>
                          setConfig({
                            ...config,
                            phase1: { ...config.phase1, dailyLossMethod: m.id },
                            phase2: { ...config.phase2, dailyLossMethod: m.id },
                          })
                        }
                        className={`p-4 rounded-xl text-left border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-blue-600/10 border-blue-500 text-white shadow-sm'
                            : 'bg-[#0A0D14] border-[#1C232E] text-slate-400 hover:border-[#273141] hover:text-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-bold text-xs text-white">{m.name}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-blue-400 shrink-0" />}
                        </div>
                        <p className="text-xs text-slate-400 leading-relaxed">{m.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Maximum Drawdown Model */}
              <div className="p-5 sm:p-6 rounded-2xl bg-[#12161D] border border-[#1C232E] space-y-4">
                <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                  Maximum Drawdown Model (Floor Calculation)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    {
                      id: 'STATIC' as DrawdownModelType,
                      name: 'Static Absolute Loss (Fixed Floor)',
                      desc: `Drawdown floor stays permanently fixed at $${(config.accountSize - calcP1Total).toLocaleString()} throughout the challenge.`,
                    },
                    {
                      id: 'TRAILING_BALANCE' as DrawdownModelType,
                      name: 'Trailing Balance',
                      desc: 'Floor trails upwards as closed profits increase, locking permanently at initial starting balance.',
                    },
                    {
                      id: 'INTRADAY_HWM_TRAILING' as DrawdownModelType,
                      name: 'Intraday High-Water Mark Trailing',
                      desc: 'Floor trails active unrealized peak equity tick-by-tick (Futures / Combine standard).',
                    },
                    {
                      id: 'EOD_TRAILING' as DrawdownModelType,
                      name: 'End-of-Day Trailing (EOD)',
                      desc: 'Trails peak balance only after daily market close settlement at end of trading day.',
                    },
                  ].map((m) => {
                    const isSelected = config.phase1.drawdownModel === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() =>
                          setConfig({
                            ...config,
                            phase1: { ...config.phase1, drawdownModel: m.id },
                            phase2: { ...config.phase2, drawdownModel: m.id },
                          })
                        }
                        className={`p-4 rounded-xl text-left border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-rose-500/10 border-rose-500 text-white shadow-sm'
                            : 'bg-[#0A0D14] border-[#1C232E] text-slate-400 hover:border-[#273141] hover:text-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-bold text-xs text-white">{m.name}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-rose-400 shrink-0" />}
                        </div>
                        <p className="text-xs text-slate-400 leading-relaxed">{m.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: TRADING POLICIES */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div className="pb-2 border-b border-[#1C232E]">
                <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
                  Institutional Trading Rules & Restrictions
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Configure consistency rules, holding windows, EA policies, and restricted strategies.
                </p>
              </div>

              {/* Consistency Rule */}
              <div className="p-5 sm:p-6 rounded-2xl bg-[#12161D] border border-[#1C232E] space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-white">Consistency Rule Enforcement</h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Restricts single-day windfall profits to prevent reckless lottery trading.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={config.consistencyRule}
                    onChange={(e) => setConfig({ ...config, consistencyRule: e.target.checked })}
                    className="w-4 h-4 rounded border-[#1C232E] bg-[#0A0D14] text-blue-600 focus:ring-0 cursor-pointer"
                  />
                </div>

                {config.consistencyRule && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-[#1C232E]">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-slate-200">Max Single-Day Profit Share (%)</label>
                      <input
                        type="number"
                        min={10}
                        max={90}
                        value={config.consistencyMaxDayPercent}
                        onChange={(e) => setConfig({ ...config, consistencyMaxDayPercent: parseFloat(e.target.value) || 40 })}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#0A0D14] border border-[#1C232E] text-white font-mono text-xs focus:border-blue-500 focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-slate-200">Max Profit Concentration Cap (%)</label>
                      <input
                        type="number"
                        min={10}
                        max={90}
                        value={config.maxProfitConcentrationPercent}
                        onChange={(e) => setConfig({ ...config, maxProfitConcentrationPercent: parseFloat(e.target.value) || 40 })}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#0A0D14] border border-[#1C232E] text-white font-mono text-xs focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Holding & News Segmented Policies */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* News Trading */}
                <div className="p-5 rounded-2xl bg-[#12161D] border border-[#1C232E] space-y-3">
                  <div className="text-xs font-bold text-slate-200">High-Impact News Trading</div>
                  <div className="flex rounded-xl overflow-hidden border border-[#1C232E] p-1 bg-[#0A0D14] gap-1">
                    {(['ALLOWED', 'RESTRICTED', 'PROHIBITED'] as const).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setConfig({ ...config, newsTrading: mode })}
                        className={`flex-1 py-2 text-xs font-semibold transition-all rounded-lg cursor-pointer ${
                          config.newsTrading === mode
                            ? mode === 'ALLOWED'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : mode === 'RESTRICTED'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Weekend Holding */}
                <div className="p-5 rounded-2xl bg-[#12161D] border border-[#1C232E] space-y-3">
                  <div className="text-xs font-bold text-slate-200">Weekend Position Holding</div>
                  <div className="flex rounded-xl overflow-hidden border border-[#1C232E] p-1 bg-[#0A0D14] gap-1">
                    <button
                      type="button"
                      onClick={() => setConfig({ ...config, weekendHolding: true })}
                      className={`flex-1 py-2 text-xs font-semibold transition-all rounded-lg cursor-pointer ${
                        config.weekendHolding
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      ALLOWED
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfig({ ...config, weekendHolding: false })}
                      className={`flex-1 py-2 text-xs font-semibold transition-all rounded-lg cursor-pointer ${
                        !config.weekendHolding
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      PROHIBITED
                    </button>
                  </div>
                </div>

                {/* Overnight Holding */}
                <div className="p-5 rounded-2xl bg-[#12161D] border border-[#1C232E] space-y-3">
                  <div className="text-xs font-bold text-slate-200">Overnight Position Holding</div>
                  <div className="flex rounded-xl overflow-hidden border border-[#1C232E] p-1 bg-[#0A0D14] gap-1">
                    <button
                      type="button"
                      onClick={() => setConfig({ ...config, overnightHolding: true })}
                      className={`flex-1 py-2 text-xs font-semibold transition-all rounded-lg cursor-pointer ${
                        config.overnightHolding
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      ALLOWED
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfig({ ...config, overnightHolding: false })}
                      className={`flex-1 py-2 text-xs font-semibold transition-all rounded-lg cursor-pointer ${
                        !config.overnightHolding
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      INTRADAY ONLY
                    </button>
                  </div>
                </div>

                {/* EA / Bots */}
                <div className="p-5 rounded-2xl bg-[#12161D] border border-[#1C232E] space-y-3">
                  <div className="text-xs font-bold text-slate-200">EA / Algorithmic Bots</div>
                  <div className="flex rounded-xl overflow-hidden border border-[#1C232E] p-1 bg-[#0A0D14] gap-1">
                    {(['ALLOWED', 'RESTRICTED', 'PROHIBITED'] as const).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setConfig({ ...config, eaTrading: mode })}
                        className={`flex-1 py-2 text-xs font-semibold transition-all rounded-lg cursor-pointer ${
                          config.eaTrading === mode
                            ? mode === 'ALLOWED'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : mode === 'RESTRICTED'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Position & Risk Caps */}
              <div className="p-5 sm:p-6 rounded-2xl bg-[#12161D] border border-[#1C232E] space-y-4">
                <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                  Position Caps & Leverage Boundaries
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-200">Max Lot Size Cap</label>
                    <input
                      type="number"
                      min={0}
                      value={config.maxLotSize || ''}
                      placeholder="e.g. 20 (0 = no cap)"
                      onChange={(e) => setConfig({ ...config, maxLotSize: parseFloat(e.target.value) || undefined })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#0A0D14] border border-[#1C232E] text-white text-xs font-mono focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-200">Max Concurrent Positions</label>
                    <input
                      type="number"
                      min={0}
                      value={config.maxPositions || ''}
                      placeholder="e.g. 10 (0 = no cap)"
                      onChange={(e) => setConfig({ ...config, maxPositions: parseInt(e.target.value, 10) || undefined })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#0A0D14] border border-[#1C232E] text-white text-xs font-mono focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-200">Max Leverage (1:X)</label>
                    <input
                      type="number"
                      min={1}
                      value={config.maxLeverage || 100}
                      onChange={(e) => setConfig({ ...config, maxLeverage: parseInt(e.target.value, 10) || 100 })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#0A0D14] border border-[#1C232E] text-white text-xs font-mono focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Prohibited Strategies Checkbox Matrix */}
              <div className="p-5 sm:p-6 rounded-2xl bg-[#12161D] border border-[#1C232E] space-y-3">
                <div className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                  Prohibited Strategy Tags
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {STRATEGY_OPTIONS.map((strat) => {
                    const isSelected = config.prohibitedStrategies.includes(strat);
                    return (
                      <button
                        key={strat}
                        type="button"
                        onClick={() => toggleStrategy(strat)}
                        className={`px-3 py-2.5 rounded-xl text-xs font-medium text-left border transition-all flex items-center justify-between cursor-pointer ${
                          isSelected
                            ? 'bg-rose-500/10 border-rose-500/50 text-rose-300 shadow-sm'
                            : 'bg-[#0A0D14] border-[#1C232E] text-slate-400 hover:border-[#273141] hover:text-white'
                        }`}
                      >
                        <span className="truncate">{strat}</span>
                        <span className="text-xs font-bold">{isSelected ? '✕' : '+'}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: PAYOUT & SCALING */}
          {currentStep === 5 && (
            <div className="space-y-6">
              <div className="pb-2 border-b border-[#1C232E]">
                <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
                  Profit Split, Payout Schedule & Account Scaling
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Configure trader payout shares, withdrawal waiting periods, and account tier upgrades.
                </p>
              </div>

              {/* Payout Terms */}
              <div className="p-5 sm:p-6 rounded-2xl bg-[#12161D] border border-[#1C232E] space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-[#1C232E]">
                  <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                    Trader Profit Split & Schedule
                  </h4>
                  <div className="text-xs font-mono text-emerald-400 font-bold px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                    {config.profitSplitTraderPercent}% Trader / {100 - config.profitSplitTraderPercent}% Firm
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-300 font-semibold">Profit Split Share:</span>
                    <span className="font-mono font-bold text-white text-sm">{config.profitSplitTraderPercent}%</span>
                  </div>
                  <input
                    type="range"
                    min={50}
                    max={95}
                    step={5}
                    value={config.profitSplitTraderPercent}
                    onChange={(e) => setConfig({ ...config, profitSplitTraderPercent: parseInt(e.target.value, 10) })}
                    className="w-full accent-blue-500 bg-slate-800 rounded-lg cursor-pointer h-2"
                  />
                  <div className="flex justify-between text-[11px] text-slate-500 font-mono">
                    <span>50%</span>
                    <span>70%</span>
                    <span>80%</span>
                    <span>90%</span>
                    <span>95%</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-200">Payout Frequency</label>
                    <select
                      value={config.payoutFrequency}
                      onChange={(e) => setConfig({ ...config, payoutFrequency: e.target.value as any })}
                      className="w-full px-3.5 py-2.5 bg-[#0A0D14] border border-[#1C232E] text-white rounded-xl text-xs focus:outline-none focus:border-blue-500 cursor-pointer"
                    >
                      <option value="BIWEEKLY">Bi-Weekly (Every 14 days)</option>
                      <option value="WEEKLY">Weekly (Every 7 days)</option>
                      <option value="MONTHLY">Monthly (Every 30 days)</option>
                      <option value="ON_REQUEST">On-Demand / On Request</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-200">First Payout Days Delay</label>
                    <input
                      type="number"
                      min={0}
                      value={config.firstPayoutDays}
                      onChange={(e) => setConfig({ ...config, firstPayoutDays: parseInt(e.target.value, 10) || 0 })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#0A0D14] border border-[#1C232E] text-white text-xs font-mono focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-200">Min Payout Amount ($)</label>
                    <input
                      type="number"
                      min={10}
                      value={config.minPayoutAmount}
                      onChange={(e) => setConfig({ ...config, minPayoutAmount: parseInt(e.target.value, 10) || 0 })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#0A0D14] border border-[#1C232E] text-white text-xs font-mono focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Scaling Plan */}
              <div className="p-5 sm:p-6 rounded-2xl bg-[#12161D] border border-[#1C232E] space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-white">Account Scaling Tier Plan</h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Automatically track scale eligibility when cumulative profit milestones are achieved.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={config.scalingEnabled}
                    onChange={(e) => setConfig({ ...config, scalingEnabled: e.target.checked })}
                    className="w-4 h-4 rounded border-[#1C232E] bg-[#0A0D14] text-blue-600 focus:ring-0 cursor-pointer"
                  />
                </div>

                {config.scalingEnabled && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-[#1C232E]">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-slate-200">Profit Target for Scale (%)</label>
                      <input
                        type="number"
                        min={5}
                        value={config.scalingProfitPercent}
                        onChange={(e) => setConfig({ ...config, scalingProfitPercent: parseFloat(e.target.value) || 10 })}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#0A0D14] border border-[#1C232E] text-white text-xs font-mono focus:border-blue-500 focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-slate-200">Scale Increment ($)</label>
                      <input
                        type="number"
                        min={1000}
                        step={5000}
                        value={config.scalingIncrementAmount}
                        onChange={(e) => setConfig({ ...config, scalingIncrementAmount: parseFloat(e.target.value) || 25000 })}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#0A0D14] border border-[#1C232E] text-white text-xs font-mono focus:border-blue-500 focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-slate-200">Maximum Scaling Ceiling ($)</label>
                      <input
                        type="number"
                        min={50000}
                        step={50000}
                        value={config.maxScalingAccountSize}
                        onChange={(e) => setConfig({ ...config, maxScalingAccountSize: parseFloat(e.target.value) || 2000000 })}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#0A0D14] border border-[#1C232E] text-white text-xs font-mono focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 6: AUDIT & CONFIRM */}
          {currentStep === 6 && (
            <div className="space-y-6">
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <div className="text-xs text-emerald-200">
                  <span className="font-bold">Configuration Verified:</span> Ready to initialize this prop-firm account. All compliance parameters and tracking rules will activate immediately.
                </div>
              </div>

              {/* Master Summary Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Identity & Structure Card */}
                <div className="p-5 rounded-2xl bg-[#12161D] border border-[#1C232E] space-y-3">
                  <div className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center justify-between">
                    <span>Account Identity</span>
                    <span className="px-2 py-0.5 rounded-md bg-[#1A1F27] text-[11px] text-white font-mono border border-[#1C232E]">
                      {config.programModel.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="space-y-2 text-xs divide-y divide-[#1C232E]/60">
                    <div className="flex justify-between pt-1">
                      <span className="text-slate-400">Prop Firm:</span>
                      <span className="font-semibold text-white">{config.propFirmName}</span>
                    </div>
                    <div className="flex justify-between pt-2">
                      <span className="text-slate-400">Account Label:</span>
                      <span className="font-semibold text-white">{config.displayName || `${config.propFirmName} $${(config.accountSize/1000)}K`}</span>
                    </div>
                    <div className="flex justify-between pt-2">
                      <span className="text-slate-400">Capital Size:</span>
                      <span className="font-mono font-bold text-white">${config.accountSize.toLocaleString()} {config.currency}</span>
                    </div>
                    <div className="flex justify-between pt-2">
                      <span className="text-slate-400">Trade Data Link:</span>
                      <span className="text-slate-200 font-mono text-xs">{config.tradingAccountLink === 'all' ? 'All Closed Trades' : 'Linked Account'}</span>
                    </div>
                  </div>
                </div>

                {/* Risk Parameters Card */}
                <div className="p-5 rounded-2xl bg-[#12161D] border border-[#1C232E] space-y-3">
                  <div className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center justify-between">
                    <span>Calibration Targets</span>
                    <span className="text-blue-400 font-mono text-xs">Phase 1 Active</span>
                  </div>
                  <div className="space-y-2 text-xs divide-y divide-[#1C232E]/60">
                    <div className="flex justify-between pt-1">
                      <span className="text-slate-400">Profit Target:</span>
                      <span className="font-mono text-emerald-400 font-bold">
                        {config.phase1.profitTargetEnabled ? `+${config.phase1.profitTargetPercent}% (+$${calcP1Target.toLocaleString()})` : 'None'}
                      </span>
                    </div>
                    <div className="flex justify-between pt-2">
                      <span className="text-slate-400">Daily Loss Limit:</span>
                      <span className="font-mono text-amber-400 font-bold">
                        -{config.phase1.dailyLossPercent}% (-${calcP1Daily.toLocaleString()})
                      </span>
                    </div>
                    <div className="flex justify-between pt-2">
                      <span className="text-slate-400">Max Drawdown Floor:</span>
                      <span className="font-mono text-rose-400 font-bold">
                        -{config.phase1.totalLossPercent}% (-${calcP1Total.toLocaleString()})
                      </span>
                    </div>
                    <div className="flex justify-between pt-2">
                      <span className="text-slate-400">Min Trading Days:</span>
                      <span className="font-mono text-white">{config.phase1.minTradingDays} Days</span>
                    </div>
                  </div>
                </div>

                {/* Policies & Restrictions */}
                <div className="p-5 rounded-2xl bg-[#12161D] border border-[#1C232E] space-y-3">
                  <div className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                    Enforced Trading Policies
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 rounded-xl bg-[#0A0D14] border border-[#1C232E] flex justify-between">
                      <span className="text-slate-400">News Trading:</span>
                      <span className="font-semibold text-white">{config.newsTrading}</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-[#0A0D14] border border-[#1C232E] flex justify-between">
                      <span className="text-slate-400">Weekend Hold:</span>
                      <span className={config.weekendHolding ? 'text-emerald-400 font-semibold' : 'text-rose-400 font-semibold'}>
                        {config.weekendHolding ? 'Allowed' : 'Prohibited'}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-[#0A0D14] border border-[#1C232E] flex justify-between">
                      <span className="text-slate-400">Consistency:</span>
                      <span className={config.consistencyRule ? 'text-blue-300 font-semibold' : 'text-slate-400'}>
                        {config.consistencyRule ? `${config.consistencyMaxDayPercent}% Cap` : 'Disabled'}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-[#0A0D14] border border-[#1C232E] flex justify-between">
                      <span className="text-slate-400">EA / Bots:</span>
                      <span className="text-white font-semibold">{config.eaTrading}</span>
                    </div>
                  </div>
                </div>

                {/* Payout & Scaling */}
                <div className="p-5 rounded-2xl bg-[#12161D] border border-[#1C232E] space-y-3">
                  <div className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                    Payout & Scaling
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 rounded-xl bg-[#0A0D14] border border-[#1C232E] flex justify-between">
                      <span className="text-slate-400">Profit Split:</span>
                      <span className="font-semibold text-emerald-400">{config.profitSplitTraderPercent}% Trader</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-[#0A0D14] border border-[#1C232E] flex justify-between">
                      <span className="text-slate-400">Frequency:</span>
                      <span className="font-semibold text-white">{config.payoutFrequency}</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-[#0A0D14] border border-[#1C232E] flex justify-between">
                      <span className="text-slate-400">Scaling:</span>
                      <span className={config.scalingEnabled ? 'text-blue-300 font-semibold' : 'text-slate-400'}>
                        {config.scalingEnabled ? `+${config.scalingProfitPercent}% Target` : 'Disabled'}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-[#0A0D14] border border-[#1C232E] flex justify-between">
                      <span className="text-slate-400">Max Cap:</span>
                      <span className="text-white font-mono">${(config.maxScalingAccountSize/1000).toFixed(0)}K</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* =========================================================================
            4. FIXED MODAL FOOTER
            ========================================================================= */}
        <div className="shrink-0 px-6 sm:px-7 py-4 border-t border-[#1C232E] bg-[#12161D] flex items-center justify-between">
          <button
            type="button"
            onClick={() => setCurrentStep((prev) => Math.max(1, prev - 1))}
            disabled={currentStep === 1}
            className="flex items-center gap-1.5 h-10 px-4 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-[#1A1F27] hover:bg-[#222936] border border-[#1C232E] disabled:opacity-40 disabled:pointer-events-none transition-all cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Previous</span>
          </button>

          <div className="flex items-center gap-3">
            {currentStep < 6 ? (
              <button
                type="button"
                onClick={() => setCurrentStep((prev) => Math.min(6, prev + 1))}
                disabled={currentStep === 1 && !canProceedStep1}
                className="flex items-center gap-1.5 h-10 px-5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 shadow-sm disabled:opacity-40 disabled:pointer-events-none transition-all cursor-pointer border border-blue-500/50"
              >
                <span>Continue</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFinalSubmit}
                className="flex items-center gap-2 h-10 px-5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 shadow-sm transition-all cursor-pointer border border-blue-500/50"
              >
                <Award className="w-4 h-4" />
                <span>Initialize Account</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
