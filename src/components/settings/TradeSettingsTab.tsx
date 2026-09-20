import React, { useState, useEffect } from 'react';
import {
  Sliders,
  ShieldCheck,
  Percent,
  Layers,
  Save,
  Clock,
  Loader2,
  TrendingUp,
  Target,
} from 'lucide-react';
import { useTrading } from '../../context/TradingContext';
import { TradeEntryDefaults } from '../../types';
import { FormSection, FormGrid, FormField, ToggleSwitch } from '../common/FormControls';

export const TradeSettingsTab: React.FC = () => {
  const {
    userSettings,
    updateUserSettings,
    accounts,
    addToast,
    addActivityLog,
    formatCurrency,
  } = useTrading();

  const defaults: TradeEntryDefaults = userSettings.tradeDefaults || {
    defaultAccountId: '',
    defaultMarket: 'Futures',
    defaultDirection: 'BUY',
    defaultOrderType: 'MARKET',
    defaultQuantity: 1,
    defaultRiskValue: 1.0,
    defaultRiskUnit: 'PERCENT',
    defaultStopLossBehavior: 'POINTS',
    defaultTakeProfitBehavior: 'R_TARGET',
    defaultRTarget: 2.0,
    maxPlannedRisk: 500,
    defaultSetup: 'Opening Drive',
    defaultPlaybookId: '',
    defaultSession: 'New York',
    defaultStatus: 'CLOSED',
    requireSetup: false,
    requireStopLoss: false,
    requireTakeProfit: false,
    requireNotes: false,
    requireScreenshot: false,
    requireMistakeOnLoss: false,
    allowPartialExits: true,
    allowMultipleEntries: true,
    allowMultipleExits: true,
    trackCommissions: true,
    trackSwapFees: true,
    trackSlippage: false,
    defaultTableColumns: ['date', 'symbol', 'direction', 'market', 'entryPrice', 'exitPrice', 'netPnl', 'rMultiple', 'status'],
    defaultTradeSort: 'date_desc',
  };

  const [form, setForm] = useState<TradeEntryDefaults>(defaults);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (userSettings.tradeDefaults) {
      setForm(prev => ({
        ...prev,
        ...userSettings.tradeDefaults,
      }));
    }
  }, [userSettings.tradeDefaults]);

  const handleChange = <K extends keyof TradeEntryDefaults>(key: K, value: TradeEntryDefaults[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateUserSettings(prev => ({
        ...prev,
        tradeDefaults: form,
        general: prev.general ? {
          ...prev.general,
          defaultAccountId: form.defaultAccountId,
        } : undefined,
      }));

      await addActivityLog({
        action: 'UPDATE_TRADE_DEFAULTS',
        category: 'SETTINGS',
        object: 'Trade Entry Defaults',
        status: 'INFO',
        details: { market: form.defaultMarket, riskUnit: form.defaultRiskUnit, riskValue: form.defaultRiskValue },
      });

      addToast('Trade Settings Saved', 'Your default execution parameters and journaling rules are active.', 'success');
    } catch (err: any) {
      addToast('Save Failed', err.message || 'Could not update trade settings', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#1C232E]">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Sliders className="w-4 h-4 text-blue-400" />
            Trading Preferences & Execution Defaults
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Configure automated position sizing rules, default risk targets, and mandatory discipline guardrails.
          </p>
        </div>
        <button
          type="submit"
          disabled={isSaving}
          className="flex items-center gap-2 h-9 px-4 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-sm border border-blue-500/50 transition disabled:opacity-50 cursor-pointer"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Saving...</span>
            </>
          ) : (
            <>
              <Save className="w-3.5 h-3.5" />
              <span>Save Changes</span>
            </>
          )}
        </button>
      </div>

      {/* Group 1: Execution Sizing & Risk Parameters */}
      <FormSection
        title="Execution Sizing & Risk Rules"
        description="Pre-populated position sizing and risk boundaries applied to newly logged trades."
        icon={<Percent className="w-4 h-4 text-blue-400" />}
      >
        <FormGrid columns={3}>
          <FormField label="Default Asset Class">
            <select
              value={form.defaultMarket}
              onChange={e => handleChange('defaultMarket', e.target.value as any)}
              className="w-full bg-[#0A0D14] border border-[#1C232E] rounded-xl px-3.5 py-2.5 text-white text-xs focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="Futures">Futures (CME / NYMEX / CBOT)</option>
              <option value="Forex">Forex (Currencies / FX Pairs)</option>
              <option value="Crypto">Crypto (Spot & Perps)</option>
              <option value="Stocks">Equities / Stocks</option>
              <option value="CFDs">CFDs (Contracts for Difference)</option>
              <option value="Indices">Indices (Cash & Synthetic)</option>
              <option value="Commodities">Commodities (Metals & Energy)</option>
            </select>
          </FormField>

          <FormField label="Default Direction">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleChange('defaultDirection', 'BUY')}
                className={`py-2 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                  form.defaultDirection === 'BUY'
                    ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400'
                    : 'border-[#1C232E] bg-[#0A0D14] text-slate-400 hover:text-slate-200'
                }`}
              >
                BUY / Long
              </button>
              <button
                type="button"
                onClick={() => handleChange('defaultDirection', 'SELL')}
                className={`py-2 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                  form.defaultDirection === 'SELL'
                    ? 'border-rose-500/50 bg-rose-500/10 text-rose-400'
                    : 'border-[#1C232E] bg-[#0A0D14] text-slate-400 hover:text-slate-200'
                }`}
              >
                SELL / Short
              </button>
            </div>
          </FormField>

          <FormField label="Default Order Type">
            <select
              value={form.defaultOrderType}
              onChange={e => handleChange('defaultOrderType', e.target.value as any)}
              className="w-full bg-[#0A0D14] border border-[#1C232E] rounded-xl px-3.5 py-2.5 text-white text-xs focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="MARKET">Market Execution</option>
              <option value="LIMIT">Limit Order</option>
              <option value="STOP">Stop Market Order</option>
            </select>
          </FormField>

          <FormField label="Default Position Size (Lots/Qty)">
            <input
              type="number"
              step="any"
              min="0.01"
              value={form.defaultQuantity}
              onChange={e => handleChange('defaultQuantity', parseFloat(e.target.value) || 1)}
              className="w-full bg-[#0A0D14] border border-[#1C232E] rounded-xl px-3.5 py-2.5 text-white text-xs focus:outline-none focus:border-blue-500 font-mono"
            />
          </FormField>

          <FormField label="Default Planned Risk">
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                step="0.1"
                value={form.defaultRiskValue}
                onChange={e => handleChange('defaultRiskValue', parseFloat(e.target.value) || 0)}
                className="w-full bg-[#0A0D14] border border-[#1C232E] rounded-xl px-3.5 py-2.5 text-white text-xs focus:outline-none focus:border-blue-500 font-mono"
              />
              <select
                value={form.defaultRiskUnit}
                onChange={e => handleChange('defaultRiskUnit', e.target.value as any)}
                className="bg-[#0A0D14] border border-[#1C232E] rounded-xl px-2.5 py-2.5 text-white text-xs focus:outline-none focus:border-blue-500 cursor-pointer font-bold"
              >
                <option value="PERCENT">%</option>
                <option value="CURRENCY">$</option>
                <option value="R_MULTIPLE">R</option>
              </select>
            </div>
          </FormField>

          <FormField label="Default Profit Target (R:R)">
            <div className="relative">
              <input
                type="number"
                step="0.1"
                value={form.defaultRTarget}
                onChange={e => handleChange('defaultRTarget', parseFloat(e.target.value) || 2)}
                className="w-full bg-[#0A0D14] border border-[#1C232E] rounded-xl pl-3.5 pr-8 py-2.5 text-white text-xs focus:outline-none focus:border-blue-500 font-mono"
              />
              <span className="absolute right-3 top-2.5 text-slate-400 font-bold font-mono text-xs">R</span>
            </div>
          </FormField>
        </FormGrid>
      </FormSection>

      {/* Group 2: Session & Default Account Context */}
      <FormSection
        title="Session & Portfolio Mapping"
        description="Default trading hours and account context assigned when quickly logging executions."
        icon={<Clock className="w-4 h-4 text-blue-400" />}
      >
        <FormGrid columns={2}>
          <FormField label="Default Trading Session">
            <select
              value={form.defaultSession}
              onChange={e => handleChange('defaultSession', e.target.value as any)}
              className="w-full bg-[#0A0D14] border border-[#1C232E] rounded-xl px-3.5 py-2.5 text-white text-xs focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="New York">New York Session (09:30 - 16:00 EST)</option>
              <option value="London">London Session (03:00 - 11:30 EST)</option>
              <option value="Asian">Asian / Tokyo Session (19:00 - 02:00 EST)</option>
              <option value="Sydney">Sydney Session (17:00 - 02:00 EST)</option>
              <option value="Pre-Market">US Pre-Market (04:00 - 09:30 EST)</option>
              <option value="After-Hours">US After-Hours (16:00 - 20:00 EST)</option>
              <option value="Custom">Custom / Other Session</option>
            </select>
          </FormField>

          <FormField label="Default Linked Account">
            <select
              value={form.defaultAccountId}
              onChange={e => handleChange('defaultAccountId', e.target.value)}
              className="w-full bg-[#0A0D14] border border-[#1C232E] rounded-xl px-3.5 py-2.5 text-white text-xs focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="">Auto-Detect / Most Recently Active</option>
              {accounts.map(acc => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} • {acc.broker || acc.type} • ({formatCurrency(acc.currentBalance)})
                </option>
              ))}
            </select>
          </FormField>
        </FormGrid>
      </FormSection>

      {/* Group 3: Strict Discipline & Compliance Guardrails */}
      <FormSection
        title="Journaling Discipline Guardrails"
        description="Enforce institutional rigor: prevent unchecked impulsive trades and hold yourself accountable."
        icon={<ShieldCheck className="w-4 h-4 text-blue-400" />}
      >
        <div className="space-y-3 divide-y divide-[#1C232E]/60">
          <div className="pt-1">
            <ToggleSwitch
              checked={Boolean(form.requireSetup)}
              onChange={() => handleChange('requireSetup', !form.requireSetup)}
              label="Require Validated Setup / Confluence Tag"
              description="Disallow saving trades without selecting an established playbook or strategy pattern."
            />
          </div>

          <div className="pt-3">
            <ToggleSwitch
              checked={Boolean(form.requireStopLoss)}
              onChange={() => handleChange('requireStopLoss', !form.requireStopLoss)}
              label="Enforce Stop Loss on All Trades"
              description="No naked executions: every trade must have an explicit stop price defined."
            />
          </div>

          <div className="pt-3">
            <ToggleSwitch
              checked={Boolean(form.requireTakeProfit)}
              onChange={() => handleChange('requireTakeProfit', !form.requireTakeProfit)}
              label="Require Target / Exit Objective"
              description="Ensures a positive asymmetrical risk-to-reward objective is calculated prior to entry."
            />
          </div>

          <div className="pt-3">
            <ToggleSwitch
              checked={Boolean(form.requireMistakeOnLoss)}
              onChange={() => handleChange('requireMistakeOnLoss', !form.requireMistakeOnLoss)}
              label="Mandatory Mistake Attribution on Losses"
              description="Requires tagging the psychological or mechanical error when closing a trade in the red."
            />
          </div>

          <div className="pt-3">
            <ToggleSwitch
              checked={Boolean(form.trackCommissions)}
              onChange={() => handleChange('trackCommissions', !form.trackCommissions)}
              label="Automatically Deduct Commissions & Exchange Fees"
              description="Applies your defined commission rules to convert gross returns into true net PnL."
            />
          </div>

          <div className="pt-3">
            <ToggleSwitch
              checked={Boolean(form.allowPartialExits)}
              onChange={() => handleChange('allowPartialExits', !form.allowPartialExits)}
              label="Enable Multi-Tranche Scale-Out Exits"
              description="Permits logging multiple partial exit prices to calculate weighted average exit and R."
            />
          </div>
        </div>
      </FormSection>
    </form>
  );
};
