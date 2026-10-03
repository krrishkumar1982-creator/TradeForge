import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Target,
  ShieldAlert,
  ShieldCheck,
  Shield,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  Flame,
  Zap,
  Lock,
  Unlock,
  Save,
  BarChart3,
  TrendingDown,
  RefreshCw,
  Clock,
  History,
  Info,
  Check,
  Ban,
  Activity,
  ChevronRight,
  Filter,
  Trash2,
  FileSpreadsheet,
} from 'lucide-react';
import { useTrading } from '../../context/TradingContext';
import { fetchRiskGoalsApi, saveRiskGoalsApi, fetchRiskEventsApi } from '../../services/apiClient';
import { evaluateAccountRisk, getStoredRiskEvents, clearRiskEvents, logRiskEvent } from '../../services/riskEngine';
import { RiskGoalSettings, CircuitBreakerStatus, RiskEvent } from '../../types';
import { safeFormatDateTime } from '../../utils/dateUtils';

export const GoalsRiskView: React.FC = () => {
  const {
    trades,
    accounts,
    selectedAccountId,
    riskGoals,
    getAccountRiskGoals,
    updateRiskGoals,
    unlockRiskAccount,
    formatCurrency,
    addToast,
    theme,
  } = useTrading();

  const isLight = theme === 'light';

  // Navigation tabs within Risk Center
  const [activeTab, setActiveTab] = useState<'MONITOR' | 'CIRCUIT_BREAKER' | 'CONFIG' | 'AUDIT_LOG'>('MONITOR');

  // Selected account detail
  const selectedAccountName = useMemo(() => {
    if (selectedAccountId === 'all') return 'All Accounts (Aggregated)';
    const acc = accounts.find((a) => a.id === selectedAccountId);
    return acc ? `${acc.name} (${acc.broker || acc.type})` : 'Selected Account';
  }, [accounts, selectedAccountId]);

  // Authoritative Risk Evaluation from RiskEngine
  const effectiveRiskGoals = useMemo(() => {
    return getAccountRiskGoals ? getAccountRiskGoals(selectedAccountId) : riskGoals;
  }, [getAccountRiskGoals, selectedAccountId, riskGoals]);

  const evaluatedRisk = useMemo(() => {
    return evaluateAccountRisk(selectedAccountId, accounts, trades, effectiveRiskGoals);
  }, [selectedAccountId, accounts, trades, effectiveRiskGoals]);

  // Form State for Risk Parameters Configuration
  const [dailyMaxLoss, setDailyMaxLoss] = useState<number>(0);
  const [weeklyLossLimit, setWeeklyLossLimit] = useState<number>(0);
  const [maxDrawdown, setMaxDrawdown] = useState<number>(0);
  const [weeklyProfitTarget, setWeeklyProfitTarget] = useState<number>(0);
  const [dailyProfitTarget, setDailyProfitTarget] = useState<number>(0);
  const [maxTradesPerDay, setMaxTradesPerDay] = useState<number>(0);
  const [maxContractsPerTrade, setMaxContractsPerTrade] = useState<number>(0);
  const [maxRiskPerTradeAmount, setMaxRiskPerTradeAmount] = useState<number>(0);
  const [maxRiskPerTradePercent, setMaxRiskPerTradePercent] = useState<number>(0);
  const [riskMode, setRiskMode] = useState<'PERCENTAGE' | 'FIXED_DOLLAR' | 'LOWER_OF_BOTH'>('LOWER_OF_BOTH');
  const [maxConsecutiveLosses, setMaxConsecutiveLosses] = useState<number>(0);
  const [maxDailyLossStreak, setMaxDailyLossStreak] = useState<number>(0);
  const [minRMultiple, setMinRMultiple] = useState<number>(0);
  const [maxPositionSize, setMaxPositionSize] = useState<number>(0);
  const [maxOpenPositions, setMaxOpenPositions] = useState<number>(0);
  const [warningThresholdPercent, setWarningThresholdPercent] = useState<number>(75);
  const [criticalThresholdPercent, setCriticalThresholdPercent] = useState<number>(90);
  const [enforceCircuitBreaker, setEnforceCircuitBreaker] = useState<boolean>(true);
  const [hardLockEnabled, setHardLockEnabled] = useState<boolean>(true);
  const [includeFees, setIncludeFees] = useState<boolean>(true);
  const [includeCommissions, setIncludeCommissions] = useState<boolean>(true);
  const [includeFloatingPnl, setIncludeFloatingPnl] = useState<boolean>(true);

  const [isSaving, setIsSaving] = useState(false);

  // Sync Form State when account or effectiveRiskGoals changes
  useEffect(() => {
    const goalsToUse = effectiveRiskGoals || {};
    setDailyMaxLoss(goalsToUse.dailyMaxLoss || goalsToUse.maxDailyLoss || 0);
    setWeeklyLossLimit(goalsToUse.weeklyLossLimit || 0);
    setMaxDrawdown(goalsToUse.maxDrawdown || goalsToUse.maxDrawdownLimit || 0);
    setWeeklyProfitTarget(goalsToUse.weeklyProfitTarget || 0);
    setDailyProfitTarget(goalsToUse.dailyProfitTarget || 0);
    setMaxTradesPerDay(goalsToUse.maxTradesPerDay || 0);
    setMaxContractsPerTrade(goalsToUse.maxContractsPerTrade || 0);
    setMaxRiskPerTradeAmount(goalsToUse.maxRiskPerTradeAmount || 0);
    setMaxRiskPerTradePercent(goalsToUse.maxRiskPerTradePercent || 0);
    setRiskMode(goalsToUse.riskMode || 'LOWER_OF_BOTH');
    setMaxConsecutiveLosses(goalsToUse.maxConsecutiveLosses || 0);
    setMaxDailyLossStreak(goalsToUse.maxDailyLossStreak || 0);
    setMinRMultiple(goalsToUse.minRMultiple || 0);
    setMaxPositionSize(goalsToUse.maxPositionSize || 0);
    setMaxOpenPositions(goalsToUse.maxOpenPositions || 0);
    setWarningThresholdPercent(goalsToUse.warningThresholdPercent || 75);
    setCriticalThresholdPercent(goalsToUse.criticalThresholdPercent || 90);
    setEnforceCircuitBreaker(goalsToUse.enforceCircuitBreaker !== undefined ? !!goalsToUse.enforceCircuitBreaker : true);
    setHardLockEnabled(goalsToUse.hardLockEnabled !== undefined ? !!goalsToUse.hardLockEnabled : true);
    setIncludeFees(goalsToUse.includeFees !== undefined ? !!goalsToUse.includeFees : true);
    setIncludeCommissions(goalsToUse.includeCommissions !== undefined ? !!goalsToUse.includeCommissions : true);
    setIncludeFloatingPnl(goalsToUse.includeFloatingPnl !== undefined ? !!goalsToUse.includeFloatingPnl : true);
  }, [selectedAccountId, effectiveRiskGoals]);

  // Unlock Modal State
  const [isUnlockModalOpen, setIsUnlockModalOpen] = useState(false);
  const [unlockReason, setUnlockReason] = useState('');
  const [supervisorName, setSupervisorName] = useState('');
  const [unlockAcknowledged, setUnlockAcknowledged] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);

  // Risk Events Audit Log
  const [riskEvents, setRiskEvents] = useState<RiskEvent[]>([]);
  const [eventFilter, setEventFilter] = useState<'ALL' | 'ORDER_BLOCKED' | 'CIRCUIT_BREAKER_TRIGGERED' | 'MANUAL_UNLOCK' | 'LIMIT_WARNING'>('ALL');

  const refreshRiskEvents = useCallback(async () => {
    try {
      const serverEvents = await fetchRiskEventsApi(selectedAccountId);
      const localEvents = getStoredRiskEvents(selectedAccountId);
      const combined = [...serverEvents];
      // Merge unique local events
      localEvents.forEach((le) => {
        if (!combined.find((se) => se.id === le.id)) {
          combined.push(le);
        }
      });
      // Sort newest first
      combined.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setRiskEvents(combined);
    } catch {
      setRiskEvents(getStoredRiskEvents(selectedAccountId));
    }
  }, [selectedAccountId]);

  useEffect(() => {
    refreshRiskEvents();
  }, [selectedAccountId, refreshRiskEvents]);

  // Toggle Circuit Breaker Arming
  const toggleArming = async () => {
    const currentStatus = evaluatedRisk.circuitBreaker.state;
    let nextState: CircuitBreakerStatus;

    if (currentStatus === 'LOCKED' || currentStatus === 'TRIGGERED') {
      setIsUnlockModalOpen(true);
      return;
    } else if (currentStatus === 'ARMED' || currentStatus === 'CAUTION' || currentStatus === 'CRITICAL') {
      nextState = 'DISARMED';
      addToast('Circuit Breaker Disarmed', 'Protection system is now in standby mode.', 'info');
    } else {
      nextState = 'ARMED';
      addToast('Circuit Breaker ARMED 🛡️', 'Automatic lock active if risk thresholds are breached.', 'success');
    }

    const updated: RiskGoalSettings = {
      ...effectiveRiskGoals,
      circuitBreakerState: nextState,
      circuitBreakerTriggered: false,
      tradingAccountId: selectedAccountId !== 'all' ? selectedAccountId : undefined,
    };

    const targetAccId = selectedAccountId !== 'all' ? selectedAccountId : undefined;
    updateRiskGoals(updated, targetAccId);
    try {
      await saveRiskGoalsApi(updated, targetAccId);
    } catch (e) {
      console.error('Failed to save arming state', e);
    }
  };

  // Perform Manual Unlock with Reflection & Audit
  const handlePerformUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unlockReason.trim() || !unlockAcknowledged) {
      addToast('Unlock Incomplete', 'Please provide a reflection rationale and acknowledge responsibility.', 'error');
      return;
    }

    setIsUnlocking(true);
    try {
      if (unlockRiskAccount) {
        await unlockRiskAccount(selectedAccountId, unlockReason, supervisorName || 'Trader Override');
      }

      addToast('Account Unlocked', `Trading access restored for ${selectedAccountName}.`, 'success');
      setIsUnlockModalOpen(false);
      setUnlockReason('');
      setSupervisorName('');
      setUnlockAcknowledged(false);
      refreshRiskEvents();
    } catch {
      addToast('Unlock Failed', 'Could not unlock account. Please try again.', 'error');
    } finally {
      setIsUnlocking(false);
    }
  };

  // Save Configuration Form
  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    const updatedSettings: RiskGoalSettings = {
      ...effectiveRiskGoals,
      dailyMaxLoss,
      maxDailyLoss: dailyMaxLoss,
      weeklyLossLimit,
      maxDrawdown,
      maxDrawdownLimit: maxDrawdown,
      weeklyProfitTarget,
      dailyProfitTarget,
      maxTradesPerDay,
      maxContractsPerTrade,
      maxRiskPerTradeAmount,
      maxRiskPerTradePercent,
      riskMode,
      maxConsecutiveLosses,
      maxDailyLossStreak,
      minRMultiple,
      maxPositionSize,
      maxOpenPositions,
      warningThresholdPercent,
      criticalThresholdPercent,
      enforceCircuitBreaker,
      hardLockEnabled,
      includeFees,
      includeCommissions,
      includeFloatingPnl,
      circuitBreakerState: evaluatedRisk.circuitBreaker.state,
      circuitBreakerTriggered: evaluatedRisk.circuitBreaker.isLocked,
      tradingAccountId: selectedAccountId !== 'all' ? selectedAccountId : undefined,
    };

    try {
      const targetAccId = selectedAccountId !== 'all' ? selectedAccountId : undefined;
      await updateRiskGoals(updatedSettings, targetAccId);
      await saveRiskGoalsApi(updatedSettings, targetAccId);
      addToast('Risk Controls Saved', `Risk parameters updated for ${selectedAccountName}`, 'success');
    } catch {
      addToast('Save Failed', 'Failed to save risk parameters to database.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Filtered Events
  const filteredEvents = useMemo(() => {
    if (eventFilter === 'ALL') return riskEvents;
    return riskEvents.filter((ev) => ev.eventType === eventFilter);
  }, [riskEvents, eventFilter]);

  const cb = evaluatedRisk.circuitBreaker;
  const metrics = evaluatedRisk.metrics;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header & Account Identity */}
      <div className={`pb-4 border-b flex flex-wrap items-center justify-between gap-4 ${isLight ? 'border-slate-200' : 'border-[rgba(255,255,255,0.07)]'}`}>
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className={`text-xl sm:text-2xl font-bold tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  Risk Overview
                </h1>
                <span className={`text-[11px] font-mono px-2.5 py-0.5 rounded-full font-bold border ${
                  isLight ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-indigo-950/60 border-indigo-800 text-indigo-300'
                }`}>
                  {selectedAccountName}
                </span>
              </div>
              <p className={`text-xs mt-0.5 ${isLight ? 'text-[#71717A]' : 'text-[#A1A1AA]'}`}>
                Track your limits. Stay within plan.
              </p>
            </div>
          </div>
        </div>

        {/* Top Actions: Circuit Breaker Status & Manual Arming */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={toggleArming}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition shadow-lg border ${
              cb.state === 'LOCKED' || cb.state === 'TRIGGERED'
                ? 'bg-rose-600 hover:bg-rose-500 text-white border-rose-500 animate-pulse shadow-rose-900/30'
                : cb.state === 'CRITICAL'
                ? 'bg-orange-500/20 text-orange-300 border-orange-500/40 hover:bg-orange-500/30'
                : cb.state === 'CAUTION'
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                : cb.state === 'ARMED'
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                : isLight
                ? 'bg-white border-slate-300 hover:bg-slate-50 text-slate-700'
                : 'bg-[#0B0B0B] border-[rgba(255,255,255,0.10)] hover:border-slate-600 text-[#D4D4D8]'
            }`}
          >
            {cb.state === 'LOCKED' || cb.state === 'TRIGGERED' ? (
              <AlertOctagon className="w-4 h-4 animate-bounce" />
            ) : cb.state === 'ARMED' ? (
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            ) : (
              <Lock className="w-4 h-4" />
            )}
            <span className="font-mono">
              {cb.state === 'LOCKED'
                ? 'Circuit Breaker: Locked'
                : cb.state === 'TRIGGERED'
                ? 'Circuit Breaker: Triggered'
                : cb.state === 'CRITICAL'
                ? 'Circuit Breaker: Critical (90%+)'
                : cb.state === 'CAUTION'
                ? 'Circuit Breaker: Caution (75%+)'
                : cb.state === 'ARMED'
                ? 'Circuit Breaker: Active'
                : 'Circuit Breaker: Off'}
            </span>
          </button>

          {(cb.state === 'LOCKED' || cb.state === 'TRIGGERED') && (
            <button
              type="button"
              onClick={() => setIsUnlockModalOpen(true)}
              className="px-3.5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shadow-lg flex items-center gap-1.5"
            >
              <Unlock className="w-3.5 h-3.5" />
              <span>Unlock Account</span>
            </button>
          )}
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className={`flex items-center gap-2 border-b pb-2 ${isLight ? 'border-slate-200' : 'border-[rgba(255,255,255,0.07)]'}`}>
        <button
          onClick={() => setActiveTab('MONITOR')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
            activeTab === 'MONITOR'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : isLight
              ? 'text-slate-600 hover:bg-slate-100'
              : 'text-[#A1A1AA] hover:bg-[#0B0B0B]'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Risk Overview</span>
        </button>

        <button
          onClick={() => setActiveTab('CIRCUIT_BREAKER')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
            activeTab === 'CIRCUIT_BREAKER'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : isLight
              ? 'text-slate-600 hover:bg-slate-100'
              : 'text-[#A1A1AA] hover:bg-[#0B0B0B]'
          }`}
        >
          <Lock className="w-4 h-4" />
          <span>Circuit Breaker</span>
          {cb.isLocked && (
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('CONFIG')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
            activeTab === 'CONFIG'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : isLight
              ? 'text-slate-600 hover:bg-slate-100'
              : 'text-[#A1A1AA] hover:bg-[#0B0B0B]'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Account Limits</span>
        </button>

        <button
          onClick={() => setActiveTab('AUDIT_LOG')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
            activeTab === 'AUDIT_LOG'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : isLight
              ? 'text-slate-600 hover:bg-slate-100'
              : 'text-[#A1A1AA] hover:bg-[#0B0B0B]'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Audit Log</span>
          {riskEvents.length > 0 && (
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
              isLight ? 'bg-slate-200 text-slate-800' : 'bg-[rgba(255,255,255,0.07)] text-[#D4D4D8]'
            }`}>
              {riskEvents.length}
            </span>
          )}
        </button>
      </div>

      {/* Flashing Emergency Lockout Banner */}
      {cb.isLocked && (
        <div className="rounded-2xl border-2 border-rose-600 bg-rose-950/70 p-4 text-rose-200 shadow-2xl flex flex-wrap items-center justify-between gap-4 animate-pulse">
          <div className="flex items-start gap-3.5">
            <AlertOctagon className="w-8 h-8 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  EMERGENCY CIRCUIT BREAKER LOCKOUT ACTIVE
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-500/30 text-rose-200 font-black border border-rose-500/40">
                  ENTRIES BLOCKED
                </span>
              </div>
              <p className="text-xs text-rose-300 mt-1">
                {cb.reason || 'Trading halted due to risk limit breach. All manual trade creation in TradeForge is locked.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsUnlockModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-white hover:bg-slate-100 text-rose-900 text-xs font-extrabold shadow-lg transition flex items-center gap-1.5 shrink-0"
          >
            <Unlock className="w-3.5 h-3.5 text-rose-700" />
            <span>Complete Reflection & Unlock</span>
          </button>
        </div>
      )}

      {/* TAB 1: LIVE MONITOR & HEADROOM MATRIX */}
      {activeTab === 'MONITOR' && (
        <div className="space-y-6">
          {/* Top 4 Real-time Limit vs Current State Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Daily Max Loss */}
            <div className={`rounded-2xl border p-5 shadow-lg space-y-3.5 transition-all ${
              isLight ? 'bg-white border-slate-200' : 'bg-[#0B0B0B] border-[rgba(255,255,255,0.07)]'
            }`}>
              <div className="flex items-center justify-between">
                <span className={`text-xs font-bold flex items-center gap-1.5 ${isLight ? 'text-slate-700' : 'text-[#F5F5F5]'}`}>
                  <ShieldAlert className="w-4 h-4 text-rose-500" />
                  Daily Max Loss
                </span>
                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                  metrics.dailyLoss.limit === 0
                    ? isLight ? 'bg-slate-100 text-[#71717A] border-slate-200' : 'bg-[#101010] text-[#A1A1AA] border-[rgba(255,255,255,0.10)]'
                    : metrics.dailyLoss.status === 'BREACHED'
                    ? 'bg-rose-500/20 text-rose-400 border-rose-500/40 animate-pulse'
                    : metrics.dailyLoss.status === 'CRITICAL'
                    ? 'bg-orange-500/20 text-orange-400 border-orange-500/40'
                    : metrics.dailyLoss.status === 'CAUTION'
                    ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                    : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                }`}>
                  {metrics.dailyLoss.limit === 0 ? 'NOT SET' : metrics.dailyLoss.status}
                </span>
              </div>

              <div className="space-y-1">
                <div className="flex items-baseline justify-between">
                  <span className={`text-2xl font-mono font-extrabold ${
                    evaluatedRisk.todayLossAbs > 0
                      ? 'text-rose-400'
                      : evaluatedRisk.todayRealizedPnl > 0
                      ? 'text-emerald-400'
                      : isLight ? 'text-slate-800' : 'text-[#F5F5F5]'
                  }`}>
                    {evaluatedRisk.todayLossAbs > 0
                      ? `-${formatCurrency(evaluatedRisk.todayLossAbs)}`
                      : evaluatedRisk.todayRealizedPnl > 0
                      ? `+${formatCurrency(evaluatedRisk.todayRealizedPnl)}`
                      : '$0.00'}
                  </span>
                  <span className="text-xs font-mono font-bold text-[#A1A1AA]">
                    {metrics.dailyLoss.limit > 0 ? `${metrics.dailyLoss.percentUsed}% Used` : '—'}
                  </span>
                </div>

                <div className={`h-2.5 w-full rounded-full overflow-hidden ${isLight ? 'bg-slate-100' : 'bg-[#101010]'}`}>
                  <div
                    style={{ width: `${Math.min(100, metrics.dailyLoss.percentUsed)}%` }}
                    className={`h-full transition-all duration-500 ${
                      metrics.dailyLoss.status === 'BREACHED'
                        ? 'bg-rose-500'
                        : metrics.dailyLoss.status === 'CRITICAL'
                        ? 'bg-orange-500'
                        : metrics.dailyLoss.status === 'CAUTION'
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] font-mono pt-1 border-t border-[rgba(255,255,255,0.07)]/40">
                <div>
                  <span className="text-[#71717A] block">Daily Limit</span>
                  <span className={`font-semibold ${isLight ? 'text-slate-700' : 'text-[#D4D4D8]'}`}>
                    {metrics.dailyLoss.limit > 0 ? formatCurrency(metrics.dailyLoss.limit) : 'Not Set'}
                  </span>
                </div>
                <div>
                  <span className="text-[#71717A] block">Remaining Buffer</span>
                  <span className={`font-semibold ${
                    metrics.dailyLoss.limit > 0
                      ? (metrics.dailyLoss.limit - metrics.dailyLoss.current) <= 0
                        ? 'text-rose-400'
                        : 'text-emerald-400'
                      : 'text-[#71717A]'
                  }`}>
                    {metrics.dailyLoss.limit > 0 ? formatCurrency(Math.max(0, metrics.dailyLoss.limit - metrics.dailyLoss.current)) : '—'}
                  </span>
                </div>
              </div>
            </div>

            {/* Card 2: Trailing Drawdown Guardrail */}
            <div className={`rounded-2xl border p-5 shadow-lg space-y-3.5 transition-all ${
              isLight ? 'bg-white border-slate-200' : 'bg-[#0B0B0B] border-[rgba(255,255,255,0.07)]'
            }`}>
              <div className="flex items-center justify-between">
                <span className={`text-xs font-bold flex items-center gap-1.5 ${isLight ? 'text-slate-700' : 'text-[#F5F5F5]'}`}>
                  <TrendingDown className="w-4 h-4 text-rose-400" />
                  Trailing Drawdown
                </span>
                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                  metrics.trailingDrawdown.limit === 0
                    ? isLight ? 'bg-slate-100 text-[#71717A] border-slate-200' : 'bg-[#101010] text-[#A1A1AA] border-[rgba(255,255,255,0.10)]'
                    : metrics.trailingDrawdown.status === 'BREACHED'
                    ? 'bg-rose-500/20 text-rose-400 border-rose-500/40 animate-pulse'
                    : metrics.trailingDrawdown.status === 'CRITICAL'
                    ? 'bg-orange-500/20 text-orange-400 border-orange-500/40'
                    : metrics.trailingDrawdown.status === 'CAUTION'
                    ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                    : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                }`}>
                  {metrics.trailingDrawdown.limit === 0 ? 'NOT SET' : metrics.trailingDrawdown.status}
                </span>
              </div>

              <div className="space-y-1">
                <div className="flex items-baseline justify-between">
                  <span className={`text-2xl font-mono font-extrabold ${
                    evaluatedRisk.trailingDrawdown > 0 ? 'text-rose-400' : isLight ? 'text-slate-800' : 'text-[#F5F5F5]'
                  }`}>
                    {formatCurrency(evaluatedRisk.trailingDrawdown)}
                  </span>
                  <span className="text-xs font-mono font-bold text-[#A1A1AA]">
                    {metrics.trailingDrawdown.limit > 0 ? `${metrics.trailingDrawdown.percentUsed}% Used` : '—'}
                  </span>
                </div>

                <div className={`h-2.5 w-full rounded-full overflow-hidden ${isLight ? 'bg-slate-100' : 'bg-[#101010]'}`}>
                  <div
                    style={{ width: `${Math.min(100, metrics.trailingDrawdown.percentUsed)}%` }}
                    className={`h-full transition-all duration-500 ${
                      metrics.trailingDrawdown.status === 'BREACHED'
                        ? 'bg-rose-500'
                        : metrics.trailingDrawdown.status === 'CRITICAL'
                        ? 'bg-orange-500'
                        : metrics.trailingDrawdown.status === 'CAUTION'
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] font-mono pt-1 border-t border-[rgba(255,255,255,0.07)]/40">
                <div>
                  <span className="text-[#71717A] block">Peak Equity</span>
                  <span className={`font-semibold ${isLight ? 'text-slate-700' : 'text-[#D4D4D8]'}`}>
                    {formatCurrency(evaluatedRisk.peakEquity)}
                  </span>
                </div>
                <div>
                  <span className="text-[#71717A] block">Drawdown Cushion</span>
                  <span className={`font-semibold ${
                    metrics.trailingDrawdown.limit > 0
                      ? (metrics.trailingDrawdown.limit - metrics.trailingDrawdown.current) <= 0
                        ? 'text-rose-400'
                        : 'text-[#F5F5F5]'
                      : 'text-[#71717A]'
                  }`}>
                    {metrics.trailingDrawdown.limit > 0 ? formatCurrency(Math.max(0, metrics.trailingDrawdown.limit - metrics.trailingDrawdown.current)) : '—'}
                  </span>
                </div>
              </div>
            </div>

            {/* Card 3: Weekly Profit Target & Progress */}
            <div className={`rounded-2xl border p-5 shadow-lg space-y-3.5 transition-all ${
              isLight ? 'bg-white border-slate-200' : 'bg-[#0B0B0B] border-[rgba(255,255,255,0.07)]'
            }`}>
              <div className="flex items-center justify-between">
                <span className={`text-xs font-bold flex items-center gap-1.5 ${isLight ? 'text-slate-700' : 'text-[#F5F5F5]'}`}>
                  <Flame className="w-4 h-4 text-amber-500" />
                  Weekly Target & Net
                </span>
                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                  metrics.weeklyProfitTarget.limit === 0
                    ? isLight ? 'bg-slate-100 text-[#71717A] border-slate-200' : 'bg-[#101010] text-[#A1A1AA] border-[rgba(255,255,255,0.10)]'
                    : metrics.weeklyProfitTarget.percentUsed >= 100
                    ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                    : evaluatedRisk.weekRealizedPnl > 0
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                    : 'bg-[#101010] text-[#A1A1AA] border-[rgba(255,255,255,0.10)]'
                }`}>
                  {metrics.weeklyProfitTarget.limit === 0
                    ? 'NOT SET'
                    : metrics.weeklyProfitTarget.percentUsed >= 100
                    ? 'ACHIEVED 🎉'
                    : evaluatedRisk.weekRealizedPnl > 0
                    ? 'ON TRACK'
                    : 'BEHIND'}
                </span>
              </div>

              <div className="space-y-1">
                <div className="flex items-baseline justify-between">
                  <span className={`text-2xl font-mono font-extrabold ${
                    evaluatedRisk.weekRealizedPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}>
                    {evaluatedRisk.weekRealizedPnl >= 0
                      ? `+${formatCurrency(evaluatedRisk.weekRealizedPnl)}`
                      : formatCurrency(evaluatedRisk.weekRealizedPnl)}
                  </span>
                  <span className="text-xs font-mono font-bold text-emerald-400">
                    {metrics.weeklyProfitTarget.limit > 0 ? `${metrics.weeklyProfitTarget.percentUsed}%` : '—'}
                  </span>
                </div>

                <div className={`h-2.5 w-full rounded-full overflow-hidden ${isLight ? 'bg-slate-100' : 'bg-[#101010]'}`}>
                  <div
                    style={{ width: `${Math.min(100, metrics.weeklyProfitTarget.percentUsed)}%` }}
                    className="h-full bg-gradient-to-r from-violet-600 to-indigo-500 transition-all duration-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] font-mono pt-1 border-t border-[rgba(255,255,255,0.07)]/40">
                <div>
                  <span className="text-[#71717A] block">Weekly Target</span>
                  <span className={`font-semibold ${isLight ? 'text-slate-700' : 'text-[#D4D4D8]'}`}>
                    {metrics.weeklyProfitTarget.limit > 0 ? formatCurrency(metrics.weeklyProfitTarget.limit) : 'Not Set'}
                  </span>
                </div>
                <div>
                  <span className="text-[#71717A] block">To Target</span>
                  <span className="font-semibold text-[#D4D4D8]">
                    {metrics.weeklyProfitTarget.limit > 0 ? formatCurrency(Math.max(0, metrics.weeklyProfitTarget.limit - evaluatedRisk.weekRealizedPnl)) : '—'}
                  </span>
                </div>
              </div>
            </div>

            {/* Card 4: Daily Execution Quota & Streak */}
            <div className={`rounded-2xl border p-5 shadow-lg space-y-3.5 transition-all ${
              isLight ? 'bg-white border-slate-200' : 'bg-[#0B0B0B] border-[rgba(255,255,255,0.07)]'
            }`}>
              <div className="flex items-center justify-between">
                <span className={`text-xs font-bold flex items-center gap-1.5 ${isLight ? 'text-slate-700' : 'text-[#F5F5F5]'}`}>
                  <Zap className="w-4 h-4 text-indigo-400" />
                  Daily Trades Quota
                </span>
                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                  metrics.dailyTrades.limit === 0
                    ? isLight ? 'bg-slate-100 text-[#71717A] border-slate-200' : 'bg-[#101010] text-[#A1A1AA] border-[rgba(255,255,255,0.10)]'
                    : metrics.dailyTrades.status === 'BREACHED'
                    ? 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                    : metrics.dailyTrades.status === 'CAUTION'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                }`}>
                  {metrics.dailyTrades.limit === 0 ? 'NOT SET' : metrics.dailyTrades.status}
                </span>
              </div>

              <div className="space-y-1">
                <div className="flex items-baseline justify-between">
                  <span className={`text-2xl font-mono font-extrabold ${isLight ? 'text-slate-800' : 'text-[#F5F5F5]'}`}>
                    {evaluatedRisk.todayTradeCount}{' '}
                    <span className="text-xs font-normal text-[#A1A1AA]">
                      {metrics.dailyTrades.limit > 0 ? `/ ${metrics.dailyTrades.limit} max` : 'trades today'}
                    </span>
                  </span>
                  <span className="text-xs font-mono font-bold text-indigo-400">
                    {metrics.dailyTrades.limit > 0 ? `${metrics.dailyTrades.percentUsed}%` : '—'}
                  </span>
                </div>

                <div className={`h-2.5 w-full rounded-full overflow-hidden ${isLight ? 'bg-slate-100' : 'bg-[#101010]'}`}>
                  <div
                    style={{ width: `${Math.min(100, metrics.dailyTrades.percentUsed)}%` }}
                    className={`h-full transition-all duration-500 ${
                      metrics.dailyTrades.status === 'BREACHED'
                        ? 'bg-rose-500'
                        : metrics.dailyTrades.status === 'CAUTION'
                        ? 'bg-amber-500'
                        : 'bg-indigo-500'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] font-mono pt-1 border-t border-[rgba(255,255,255,0.07)]/40">
                <div>
                  <span className="text-[#71717A] block">Consecutive Losses</span>
                  <span className={`font-semibold ${
                    evaluatedRisk.consecutiveLossesStreak >= 3 ? 'text-rose-400' : 'text-[#D4D4D8]'
                  }`}>
                    {evaluatedRisk.consecutiveLossesStreak} in a row
                  </span>
                </div>
                <div>
                  <span className="text-[#71717A] block">Quota Remaining</span>
                  <span className="font-semibold text-[#D4D4D8]">
                    {metrics.dailyTrades.limit > 0 ? `${Math.max(0, metrics.dailyTrades.limit - metrics.dailyTrades.current)} left` : 'Unlimited'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Secondary Matrix: Advanced Position & Capital Guardrails */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Box 1: Open Risk */}
            <div className={`p-5 rounded-2xl border ${isLight ? 'bg-white border-slate-200' : 'bg-[#0B0B0B] border-[rgba(255,255,255,0.07)]'}`}>
              <div className="flex items-center justify-between pb-2 border-b border-[rgba(255,255,255,0.07)]/40">
                <span className="text-xs font-bold text-[#D4D4D8] flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-orange-400" />
                  Open Risk
                </span>
                <span className="text-xs font-mono font-bold text-orange-400">
                  {evaluatedRisk.portfolioHeatPercent.toFixed(2)}%
                </span>
              </div>
              <div className="mt-3 space-y-2">
                <div className="flex justify-between items-baseline text-xs font-mono">
                  <span className="text-[#A1A1AA]">Open Risk:</span>
                  <span className="font-bold text-[#F5F5F5]">{formatCurrency(evaluatedRisk.portfolioHeatDollar)}</span>
                </div>
                <div className="flex justify-between items-baseline text-xs font-mono">
                  <span className="text-[#A1A1AA]">Active Open Positions:</span>
                  <span className="font-bold text-[#F5F5F5]">{evaluatedRisk.openPositionsCount}</span>
                </div>
                <div className="flex justify-between items-baseline text-xs font-mono">
                  <span className="text-[#A1A1AA]">Max Allowed Positions:</span>
                  <span className="text-[#D4D4D8]">{effectiveRiskGoals.maxOpenPositions || 'Unlimited'}</span>
                </div>
              </div>
            </div>

            {/* Box 2: Per-Trade Risk */}
            <div className={`p-5 rounded-2xl border ${isLight ? 'bg-white border-slate-200' : 'bg-[#0B0B0B] border-[rgba(255,255,255,0.07)]'}`}>
              <div className="flex items-center justify-between pb-2 border-b border-[rgba(255,255,255,0.07)]/40">
                <span className="text-xs font-bold text-[#D4D4D8] flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-indigo-400" />
                  Risk Per Trade
                </span>
                <span className="text-[11px] font-mono font-bold text-indigo-400 uppercase">
                  {effectiveRiskGoals.riskMode || 'LOWER_OF_BOTH'}
                </span>
              </div>
              <div className="mt-3 space-y-2">
                <div className="flex justify-between items-baseline text-xs font-mono">
                  <span className="text-[#A1A1AA]">Max Dollar Per Trade:</span>
                  <span className="font-bold text-[#F5F5F5]">
                    {effectiveRiskGoals.maxRiskPerTradeAmount ? formatCurrency(effectiveRiskGoals.maxRiskPerTradeAmount) : 'Not Set'}
                  </span>
                </div>
                <div className="flex justify-between items-baseline text-xs font-mono">
                  <span className="text-[#A1A1AA]">Max Capital % Per Trade:</span>
                  <span className="font-bold text-[#F5F5F5]">
                    {effectiveRiskGoals.maxRiskPerTradePercent ? `${effectiveRiskGoals.maxRiskPerTradePercent}%` : 'Not Set'}
                  </span>
                </div>
                <div className="flex justify-between items-baseline text-xs font-mono">
                  <span className="text-[#A1A1AA]">Max Contracts / Lots:</span>
                  <span className="text-[#D4D4D8]">{effectiveRiskGoals.maxContractsPerTrade || 'Unlimited'}</span>
                </div>
              </div>
            </div>

            {/* Box 3: Discipline & Execution Constraints */}
            <div className={`p-5 rounded-2xl border ${isLight ? 'bg-white border-slate-200' : 'bg-[#0B0B0B] border-[rgba(255,255,255,0.07)]'}`}>
              <div className="flex items-center justify-between pb-2 border-b border-[rgba(255,255,255,0.07)]/40">
                <span className="text-xs font-bold text-[#D4D4D8] flex items-center gap-1.5">
                  <Target className="w-4 h-4 text-emerald-400" />
                  Execution Quality Rules
                </span>
                <span className="text-[11px] font-mono font-bold text-emerald-400">
                  {effectiveRiskGoals.minRMultiple ? `${effectiveRiskGoals.minRMultiple}R Minimum` : 'Flexible'}
                </span>
              </div>
              <div className="mt-3 space-y-2">
                <div className="flex justify-between items-baseline text-xs font-mono">
                  <span className="text-[#A1A1AA]">Min Target R-Multiple:</span>
                  <span className="font-bold text-[#F5F5F5]">{effectiveRiskGoals.minRMultiple || 'None'}</span>
                </div>
                <div className="flex justify-between items-baseline text-xs font-mono">
                  <span className="text-[#A1A1AA]">Max Consec. Losses Stop:</span>
                  <span className="font-bold text-[#F5F5F5]">{effectiveRiskGoals.maxConsecutiveLosses || 'None'}</span>
                </div>
                <div className="flex justify-between items-baseline text-xs font-mono">
                  <span className="text-[#A1A1AA]">Commissions & Fees Calc:</span>
                  <span className="text-emerald-400 font-semibold">Included in Net P&L</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CIRCUIT BREAKER STATE & LOCKOUT CONTROL */}
      {activeTab === 'CIRCUIT_BREAKER' && (
        <div className="space-y-6">
          <div className={`p-6 rounded-2xl border ${isLight ? 'bg-white border-slate-200' : 'bg-[#0B0B0B] border-[rgba(255,255,255,0.07)]'}`}>
            <div className="flex items-center justify-between pb-4 border-b border-[rgba(255,255,255,0.07)]">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Lock className="w-5 h-5 text-indigo-400" />
                  Circuit Breaker Health & Trip State
                </h3>
                <p className="text-xs text-[#A1A1AA] mt-1">
                  Active stateful monitoring preventing catastrophic blowouts. Automatically escalates based on daily loss headroom.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className={`text-xs font-mono font-black px-3 py-1 rounded-full uppercase border ${
                  cb.state === 'LOCKED' || cb.state === 'TRIGGERED'
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/50 animate-pulse'
                    : cb.state === 'CRITICAL'
                    ? 'bg-orange-500/20 text-orange-300 border-orange-500/40'
                    : cb.state === 'CAUTION'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : cb.state === 'ARMED'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : 'bg-[#101010] text-[#A1A1AA] border-white/[0.10]'
                }`}>
                  STATUS: {cb.state}
                </span>
              </div>
            </div>

            {/* Circuit Breaker States Stepper */}
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-5 gap-3">
              {[
                { state: 'DISARMED', desc: 'Circuit Breaker offline. Manual trades allowed freely without hard safety locks.', icon: Shield },
                { state: 'ARMED', desc: 'Active & watching. Buffer < 75% utilized. All entries vetted against 13 risk rules.', icon: ShieldCheck },
                { state: 'CAUTION', desc: 'Loss threshold reached 75%. Pre-trade warnings triggered in TradeForge.', icon: AlertTriangle },
                { state: 'CRITICAL', desc: 'Loss threshold exceeded 90%. Severe risk warning; orders blocked unless auto-scaled.', icon: AlertOctagon },
                { state: 'LOCKED', desc: 'Daily stop limit breached or supervisor trip. All trade entries strictly prohibited.', icon: Lock },
              ].map((step, idx) => {
                const isActive = cb.state === step.state;
                const IconComponent = step.icon;
                return (
                  <div
                    key={idx}
                    className={`p-4 rounded-xl border transition-all ${
                      isActive
                        ? step.state === 'LOCKED'
                          ? 'bg-rose-950/40 border-rose-500 shadow-lg shadow-rose-950/40'
                          : step.state === 'CRITICAL'
                          ? 'bg-orange-950/40 border-orange-500'
                          : step.state === 'CAUTION'
                          ? 'bg-amber-950/40 border-amber-500'
                          : step.state === 'ARMED'
                          ? 'bg-emerald-950/40 border-emerald-500'
                          : 'bg-indigo-950/40 border-indigo-500'
                        : 'bg-[#080808] border-[rgba(255,255,255,0.07)] opacity-70'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <IconComponent className={`w-4 h-4 ${
                        isActive
                          ? step.state === 'LOCKED' ? 'text-rose-400' : step.state === 'CRITICAL' ? 'text-orange-400' : 'text-emerald-400'
                          : 'text-[#71717A]'
                      }`} />
                      <span className={`text-xs font-bold uppercase tracking-wider ${
                        isActive ? 'text-white' : 'text-[#A1A1AA]'
                      }`}>
                        {step.state}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#A1A1AA] leading-relaxed">{step.desc}</p>
                  </div>
                );
              })}
            </div>

            {/* Actions & Emergency Controls */}
            <div className="mt-6 pt-5 border-t border-[rgba(255,255,255,0.07)] flex flex-wrap items-center justify-between gap-4">
              <div className="text-xs text-[#A1A1AA]">
                Current Daily Buffer Utilization: <span className="font-mono font-bold text-white">{metrics.dailyLoss.percentUsed}%</span>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={toggleArming}
                  className="px-4 py-2 rounded-xl bg-[rgba(255,255,255,0.07)] hover:bg-[rgba(255,255,255,0.10)] text-[#F5F5F5] text-xs font-semibold transition"
                >
                  {cb.state === 'ARMED' || cb.state === 'CAUTION' || cb.state === 'CRITICAL'
                    ? 'Disarm Circuit Breaker'
                    : 'Arm Circuit Breaker'}
                </button>

                {cb.isLocked && (
                  <button
                    type="button"
                    onClick={() => setIsUnlockModalOpen(true)}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg transition flex items-center gap-1.5"
                  >
                    <Unlock className="w-4 h-4" />
                    <span>Complete Reflection & Unlock Account</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: CONFIGURATION FORM */}
      {activeTab === 'CONFIG' && (
        <form onSubmit={handleSaveConfig} className={`rounded-2xl border p-6 shadow-xl space-y-6 ${
          isLight ? 'bg-white border-slate-200' : 'bg-[#0B0B0B] border-[rgba(255,255,255,0.07)]'
        }`}>
          <div className="flex items-center justify-between pb-3 border-b border-[rgba(255,255,255,0.07)]">
            <div>
              <h3 className={`text-sm font-bold uppercase tracking-wider flex items-center gap-2 ${
                isLight ? 'text-slate-900' : 'text-[#F5F5F5]'
              }`}>
                <Sliders className="w-4 h-4 text-indigo-400" />
                Configure Risk Parameters & Guardrails
              </h3>
              <p className="text-xs text-[#A1A1AA] mt-0.5">
                Parameters apply specifically to {selectedAccountName}. Evaluated in real time by the TradeForge Risk Engine.
              </p>
            </div>
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/25 transition disabled:opacity-50"
            >
              {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>{isSaving ? 'Saving...' : 'Save Parameters'}</span>
            </button>
          </div>

          {/* Section 1: Capital Protection & Loss Limits */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" /> 1. Capital Protection & Maximum Loss Limits
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="text-xs text-[#A1A1AA] mb-1 block">Daily Max Loss Limit ($)</label>
                <input
                  type="number"
                  min="0"
                  step="50"
                  value={dailyMaxLoss || ''}
                  placeholder="e.g. 1000"
                  onChange={(e) => setDailyMaxLoss(Number(e.target.value))}
                  className={`w-full rounded-xl border px-3.5 py-2 text-xs font-mono focus:outline-none focus:border-indigo-500 ${
                    isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-[#080808] border-[rgba(255,255,255,0.07)] text-[#F5F5F5]'
                  }`}
                />
                <span className="text-[10px] text-[#71717A] mt-1 block">Hard stop cap per calendar trading day</span>
              </div>

              <div>
                <label className="text-xs text-[#A1A1AA] mb-1 block">Weekly Loss Limit ($)</label>
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={weeklyLossLimit || ''}
                  placeholder="e.g. 3000"
                  onChange={(e) => setWeeklyLossLimit(Number(e.target.value))}
                  className={`w-full rounded-xl border px-3.5 py-2 text-xs font-mono focus:outline-none focus:border-indigo-500 ${
                    isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-[#080808] border-[rgba(255,255,255,0.07)] text-[#F5F5F5]'
                  }`}
                />
                <span className="text-[10px] text-[#71717A] mt-1 block">Maximum cumulative loss for the week</span>
              </div>

              <div>
                <label className="text-xs text-[#A1A1AA] mb-1 block">Max Trailing Drawdown ($)</label>
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={maxDrawdown || ''}
                  placeholder="e.g. 2500"
                  onChange={(e) => setMaxDrawdown(Number(e.target.value))}
                  className={`w-full rounded-xl border px-3.5 py-2 text-xs font-mono focus:outline-none focus:border-indigo-500 ${
                    isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-[#080808] border-[rgba(255,255,255,0.07)] text-[#F5F5F5]'
                  }`}
                />
                <span className="text-[10px] text-[#71717A] mt-1 block">Max allowed drop from peak equity</span>
              </div>

              <div>
                <label className="text-xs text-[#A1A1AA] mb-1 block">Weekly Profit Target ($)</label>
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={weeklyProfitTarget || ''}
                  placeholder="e.g. 2500"
                  onChange={(e) => setWeeklyProfitTarget(Number(e.target.value))}
                  className={`w-full rounded-xl border px-3.5 py-2 text-xs font-mono focus:outline-none focus:border-indigo-500 ${
                    isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-[#080808] border-[rgba(255,255,255,0.07)] text-[#F5F5F5]'
                  }`}
                />
                <span className="text-[10px] text-[#71717A] mt-1 block">Target net profit milestone for week</span>
              </div>
            </div>
          </div>

          {/* Section 2: Trade Sizing & Risk Modes */}
          <div className="space-y-3 pt-4 border-t border-[rgba(255,255,255,0.07)]">
            <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
              <Zap className="w-4 h-4" /> 2. Per-Trade Risk Sizing & Execution Quotas
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="text-xs text-[#A1A1AA] mb-1 block">Risk Sizing Mode</label>
                <select
                  value={riskMode}
                  onChange={(e) => setRiskMode(e.target.value as any)}
                  className={`w-full rounded-xl border px-3.5 py-2 text-xs font-medium focus:outline-none focus:border-indigo-500 ${
                    isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-[#080808] border-[rgba(255,255,255,0.07)] text-[#F5F5F5]'
                  }`}
                >
                  <option value="LOWER_OF_BOTH">Lower of Both ($ and %)</option>
                  <option value="FIXED_DOLLAR">Fixed Dollar Cap Only</option>
                  <option value="PERCENTAGE">Account Balance % Only</option>
                  <option value="GREATER_OF_BOTH">Greater of Both</option>
                </select>
                <span className="text-[10px] text-[#71717A] mt-1 block">Methodology for position sizing</span>
              </div>

              <div>
                <label className="text-xs text-[#A1A1AA] mb-1 block">Max Risk Per Trade ($)</label>
                <input
                  type="number"
                  min="0"
                  step="25"
                  value={maxRiskPerTradeAmount || ''}
                  placeholder="e.g. 250"
                  onChange={(e) => setMaxRiskPerTradeAmount(Number(e.target.value))}
                  className={`w-full rounded-xl border px-3.5 py-2 text-xs font-mono focus:outline-none focus:border-indigo-500 ${
                    isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-[#080808] border-[rgba(255,255,255,0.07)] text-[#F5F5F5]'
                  }`}
                />
                <span className="text-[10px] text-[#71717A] mt-1 block">Maximum dollar risk at stop loss</span>
              </div>

              <div>
                <label className="text-xs text-[#A1A1AA] mb-1 block">Max Risk Per Trade (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={maxRiskPerTradePercent || ''}
                  placeholder="e.g. 2"
                  onChange={(e) => setMaxRiskPerTradePercent(Number(e.target.value))}
                  className={`w-full rounded-xl border px-3.5 py-2 text-xs font-mono focus:outline-none focus:border-indigo-500 ${
                    isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-[#080808] border-[rgba(255,255,255,0.07)] text-[#F5F5F5]'
                  }`}
                />
                <span className="text-[10px] text-[#71717A] mt-1 block">% of account balance risk cap</span>
              </div>

              <div>
                <label className="text-xs text-[#A1A1AA] mb-1 block">Max Contracts / Lots Per Trade</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={maxContractsPerTrade || ''}
                  placeholder="e.g. 5"
                  onChange={(e) => setMaxContractsPerTrade(Number(e.target.value))}
                  className={`w-full rounded-xl border px-3.5 py-2 text-xs font-mono focus:outline-none focus:border-indigo-500 ${
                    isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-[#080808] border-[rgba(255,255,255,0.07)] text-[#F5F5F5]'
                  }`}
                />
                <span className="text-[10px] text-[#71717A] mt-1 block">Hard position contract cap</span>
              </div>
            </div>
          </div>

          {/* Section 3: Quotas & Discipline Rules */}
          <div className="space-y-3 pt-4 border-t border-[rgba(255,255,255,0.07)]">
            <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
              <Target className="w-4 h-4" /> 3. Discipline Quotas & Trade Quality Rules
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="text-xs text-[#A1A1AA] mb-1 block">Max Daily Trades Quota</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={maxTradesPerDay || ''}
                  placeholder="e.g. 5"
                  onChange={(e) => setMaxTradesPerDay(Number(e.target.value))}
                  className={`w-full rounded-xl border px-3.5 py-2 text-xs font-mono focus:outline-none focus:border-indigo-500 ${
                    isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-[#080808] border-[rgba(255,255,255,0.07)] text-[#F5F5F5]'
                  }`}
                />
                <span className="text-[10px] text-[#71717A] mt-1 block">Prevents overtrading</span>
              </div>

              <div>
                <label className="text-xs text-[#A1A1AA] mb-1 block">Max Consecutive Losses</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={maxConsecutiveLosses || ''}
                  placeholder="e.g. 3"
                  onChange={(e) => setMaxConsecutiveLosses(Number(e.target.value))}
                  className={`w-full rounded-xl border px-3.5 py-2 text-xs font-mono focus:outline-none focus:border-indigo-500 ${
                    isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-[#080808] border-[rgba(255,255,255,0.07)] text-[#F5F5F5]'
                  }`}
                />
                <span className="text-[10px] text-[#71717A] mt-1 block">Blocks revenge trading streak</span>
              </div>

              <div>
                <label className="text-xs text-[#A1A1AA] mb-1 block">Minimum Target R-Multiple</label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={minRMultiple || ''}
                  placeholder="e.g. 1.5"
                  onChange={(e) => setMinRMultiple(Number(e.target.value))}
                  className={`w-full rounded-xl border px-3.5 py-2 text-xs font-mono focus:outline-none focus:border-indigo-500 ${
                    isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-[#080808] border-[rgba(255,255,255,0.07)] text-[#F5F5F5]'
                  }`}
                />
                <span className="text-[10px] text-[#71717A] mt-1 block">Reward-to-risk ratio minimum</span>
              </div>

              <div>
                <label className="text-xs text-[#A1A1AA] mb-1 block">Max Open Positions</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={maxOpenPositions || ''}
                  placeholder="e.g. 2"
                  onChange={(e) => setMaxOpenPositions(Number(e.target.value))}
                  className={`w-full rounded-xl border px-3.5 py-2 text-xs font-mono focus:outline-none focus:border-indigo-500 ${
                    isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-[#080808] border-[rgba(255,255,255,0.07)] text-[#F5F5F5]'
                  }`}
                />
                <span className="text-[10px] text-[#71717A] mt-1 block">Concurrent open trades limit</span>
              </div>
            </div>
          </div>

          {/* Section 4: Automated Circuit Breaker & Safety Toggles */}
          <div className="space-y-4 pt-4 border-t border-[rgba(255,255,255,0.07)]">
            <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
              <Lock className="w-4 h-4" /> 4. Circuit Breaker Automation & Audit Safeguards
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-[#A1A1AA] mb-1 block">Caution Warning Threshold (%)</label>
                <input
                  type="number"
                  min="50"
                  max="95"
                  value={warningThresholdPercent}
                  onChange={(e) => setWarningThresholdPercent(Number(e.target.value))}
                  className={`w-full rounded-xl border px-3.5 py-2 text-xs font-mono focus:outline-none focus:border-indigo-500 ${
                    isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-[#080808] border-[rgba(255,255,255,0.07)] text-[#F5F5F5]'
                  }`}
                />
                <span className="text-[10px] text-[#71717A] mt-1 block">Default: 75% of daily loss limit</span>
              </div>

              <div>
                <label className="text-xs text-[#A1A1AA] mb-1 block">Critical Warning Threshold (%)</label>
                <input
                  type="number"
                  min="60"
                  max="99"
                  value={criticalThresholdPercent}
                  onChange={(e) => setCriticalThresholdPercent(Number(e.target.value))}
                  className={`w-full rounded-xl border px-3.5 py-2 text-xs font-mono focus:outline-none focus:border-indigo-500 ${
                    isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-[#080808] border-[rgba(255,255,255,0.07)] text-[#F5F5F5]'
                  }`}
                />
                <span className="text-[10px] text-[#71717A] mt-1 block">Default: 90% of daily loss limit</span>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={enforceCircuitBreaker}
                  onChange={(e) => setEnforceCircuitBreaker(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 bg-[#080808] border-[rgba(255,255,255,0.07)]"
                />
                <span className={`text-xs font-semibold ${isLight ? 'text-slate-800' : 'text-[#F5F5F5]'}`}>
                  Enforce Hard Circuit Breaker Lockout on Daily Loss Breach
                </span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hardLockEnabled}
                  onChange={(e) => setHardLockEnabled(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 bg-[#080808] border-[rgba(255,255,255,0.07)]"
                />
                <span className={`text-xs font-semibold ${isLight ? 'text-slate-800' : 'text-[#F5F5F5]'}`}>
                  Require Written Reflection & Supervisor Rationale to Unlock
                </span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeCommissions && includeFees}
                  onChange={(e) => {
                    setIncludeCommissions(e.target.checked);
                    setIncludeFees(e.target.checked);
                  }}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 bg-[#080808] border-[rgba(255,255,255,0.07)]"
                />
                <span className={`text-xs font-semibold ${isLight ? 'text-slate-800' : 'text-[#F5F5F5]'}`}>
                  Include Commissions & Regulatory Fees in Realized Loss Buffer
                </span>
              </label>
            </div>
          </div>

          {/* Footer Save */}
          <div className="pt-4 border-t border-[rgba(255,255,255,0.07)] flex items-center justify-between">
            <div className="text-xs text-[#A1A1AA]">
              Settings synced with server & localStorage. Authoritative risk calculations active.
            </div>
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/25 transition disabled:opacity-50"
            >
              {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>{isSaving ? 'Saving Parameters...' : 'Save Parameters'}</span>
            </button>
          </div>
        </form>
      )}

      {/* TAB 4: RISK AUDIT LOG & EVENTS */}
      {activeTab === 'AUDIT_LOG' && (
        <div className={`rounded-2xl border p-6 shadow-xl space-y-4 ${
          isLight ? 'bg-white border-slate-200' : 'bg-[#0B0B0B] border-[rgba(255,255,255,0.07)]'
        }`}>
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[rgba(255,255,255,0.07)]">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <History className="w-4 h-4 text-indigo-400" />
                Risk Events & Guardrail Audit Trail
              </h3>
              <p className="text-xs text-[#A1A1AA] mt-0.5">
                Complete chronological log of blocked trade orders, circuit breaker triggers, and unlock rationale.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={eventFilter}
                onChange={(e) => setEventFilter(e.target.value as any)}
                className="rounded-xl bg-[#080808] border border-[rgba(255,255,255,0.07)] px-3 py-1.5 text-xs text-[#F5F5F5] focus:outline-none focus:border-indigo-500 font-medium"
              >
                <option value="ALL">All Event Types</option>
                <option value="ORDER_BLOCKED">Orders Blocked Only</option>
                <option value="CIRCUIT_BREAKER_TRIGGERED">Circuit Breaker Only</option>
                <option value="MANUAL_UNLOCK">Unlocks Only</option>
                <option value="LIMIT_WARNING">Warnings Only</option>
              </select>

              <button
                type="button"
                onClick={() => {
                  clearRiskEvents(selectedAccountId);
                  refreshRiskEvents();
                  addToast('Audit Log Cleared', 'Cleared local risk events for this session.', 'info');
                }}
                className="p-2 rounded-xl bg-[rgba(255,255,255,0.07)] hover:bg-[rgba(255,255,255,0.10)] text-[#A1A1AA] hover:text-rose-400 transition text-xs"
                title="Clear local audit log"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {filteredEvents.length === 0 ? (
            <div className="py-12 text-center text-[#71717A] text-xs">
              <ShieldCheck className="w-10 h-10 text-emerald-500/30 mx-auto mb-2" />
              <span>No risk events recorded for {selectedAccountName}. Trading operates within standard parameters.</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[rgba(255,255,255,0.07)] text-[#A1A1AA] font-mono text-[11px]">
                    <th className="py-2.5 px-3">Timestamp</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3">Rule Breached</th>
                    <th className="py-2.5 px-3">Value vs Limit</th>
                    <th className="py-2.5 px-3">Severity</th>
                    <th className="py-2.5 px-3">Action Taken</th>
                    <th className="py-2.5 px-3">Notes & Reflection</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[rgba(255,255,255,0.07)]/40 font-mono">
                  {filteredEvents.map((ev) => (
                    <tr key={ev.id} className="hover:bg-[#161C26]/50 transition">
                      <td className="py-3 px-3 text-[#A1A1AA] text-[11px] whitespace-nowrap">
                        {safeFormatDateTime(ev.timestamp)}
                      </td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          ev.eventType === 'ORDER_BLOCKED'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                            : ev.eventType === 'CIRCUIT_BREAKER_TRIGGERED'
                            ? 'bg-orange-500/20 text-orange-300 border border-orange-500/40'
                            : ev.eventType === 'MANUAL_UNLOCK'
                            ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        }`}>
                          {ev.eventType}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-semibold text-[#F5F5F5]">
                        {ev.rule}
                      </td>
                      <td className="py-3 px-3 text-[#D4D4D8]">
                        {ev.currentValue} / <span className="text-[#A1A1AA]">{ev.limitValue}</span>
                      </td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                          ev.severity === 'BLOCKED' || ev.severity === 'CRITICAL'
                            ? 'text-rose-400'
                            : ev.severity === 'CAUTION'
                            ? 'text-amber-400'
                            : 'text-indigo-400'
                        }`}>
                          {ev.severity}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-[#D4D4D8] text-[11px]">
                        {ev.actionTaken}
                      </td>
                      <td className="py-3 px-3 text-[#A1A1AA] text-[11px] max-w-xs truncate font-sans" title={ev.notes}>
                        {ev.notes || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Manual Unlock & Reflection Modal */}
      {isUnlockModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-[#0F131A] border border-rose-500/40 p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 border-b border-[rgba(255,255,255,0.07)] pb-3">
              <div className="p-2 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-400">
                <Lock className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  Circuit Breaker Override & Account Unlock
                </h3>
                <p className="text-xs text-[#A1A1AA]">
                  {selectedAccountName} — Mandatory Trader Reflection Protocol
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300">
              <p className="font-semibold mb-1">⚠️ Risk Warning</p>
              Trading lockouts are instituted to protect your hard-earned capital from tilt and blowout. Overriding requires recording your rationale in the audit trail.
            </div>

            <form onSubmit={handlePerformUnlock} className="space-y-3.5">
              <div>
                <label className="text-xs text-[#D4D4D8] mb-1 block font-semibold">
                  Trader Reflection & Rationale <span className="text-rose-400">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={unlockReason}
                  onChange={(e) => setUnlockReason(e.target.value)}
                  placeholder="Explain the root cause of the limit breach, emotional state, and the adjustment you will make before resuming trading..."
                  className="w-full rounded-xl bg-[#080808] border border-[rgba(255,255,255,0.07)] p-3 text-xs text-[#F5F5F5] placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs text-[#D4D4D8] mb-1 block font-semibold">
                  Authorized By / Supervisor Name
                </label>
                <input
                  type="text"
                  value={supervisorName}
                  onChange={(e) => setSupervisorName(e.target.value)}
                  placeholder="e.g. Lead Risk Supervisor / Self-Authorized"
                  className="w-full rounded-xl bg-[#080808] border border-[rgba(255,255,255,0.07)] px-3 py-2 text-xs text-[#F5F5F5] placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="pt-1">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    required
                    checked={unlockAcknowledged}
                    onChange={(e) => setUnlockAcknowledged(e.target.checked)}
                    className="w-4 h-4 rounded mt-0.5 text-indigo-600 focus:ring-indigo-500 bg-[#080808] border-[rgba(255,255,255,0.07)]"
                  />
                  <span className="text-xs text-[#D4D4D8] leading-snug">
                    I acknowledge this override will be permanently logged in the audit ledger. I commit to strict discipline and adhering to my playbook.
                  </span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[rgba(255,255,255,0.07)]">
                <button
                  type="button"
                  onClick={() => setIsUnlockModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[rgba(255,255,255,0.07)] hover:bg-[rgba(255,255,255,0.10)] text-[#D4D4D8] text-xs font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUnlocking || !unlockReason.trim() || !unlockAcknowledged}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg transition disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isUnlocking ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Unlock className="w-3.5 h-3.5" />}
                  <span>Authorize Unlock</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
