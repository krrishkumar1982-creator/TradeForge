import React, { useState } from 'react';
import {
  Monitor,
  Sun,
  Moon,
  DollarSign,
  Clock,
  Save,
  Sparkles,
  Layout,
  Percent,
  Hash,
  Loader2,
  Check,
} from 'lucide-react';
import { useTrading } from '../../context/TradingContext';
import { GlobalPreferences } from '../../types';
import { TIMEZONES, CURRENCIES } from './countries';
import { FormSection, FormGrid, FormField } from '../common/FormControls';

export const GlobalSettingsTab: React.FC = () => {
  const {
    userSettings,
    updateUserSettings,
    theme,
    setTheme,
    currencyMode,
    setCurrencyMode,
    addToast,
    addActivityLog,
    updateUserProfile,
  } = useTrading();

  const general: GlobalPreferences = userSettings.general || {
    theme: 'dark',
    accentColor: '#3B82F6',
    density: 'comfortable',
    chartAnimations: true,
    reducedMotion: false,
    currency: 'USD',
    currencyMode: 'USD',
    numberFormat: 'en-US',
    decimalPrecision: 2,
    percentagePrecision: 2,
    roundingBehavior: 'round',
    timezone: 'America/New_York',
    dateFormat: 'YYYY-MM-DD',
    timeFormat: '12h',
    firstDayOfWeek: 'Sunday',
    calendarTimezone: 'America/New_York',
    sessionTimezone: 'America/New_York',
  };

  const [formGeneral, setFormGeneral] = useState<GlobalPreferences>(general);
  const [isSaving, setIsSaving] = useState(false);

  const handleThemeChange = (newTheme: 'dark' | 'light' | 'system') => {
    setFormGeneral(prev => ({ ...prev, theme: newTheme }));
    const resolvedTheme = newTheme === 'system'
      ? (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark')
      : newTheme;
    setTheme(resolvedTheme);
  };

  const handleCurrencyModeChange = (mode: 'USD' | 'PERCENT' | 'R_MULTIPLE' | 'TICKS' | 'PRIVACY') => {
    setFormGeneral(prev => ({ ...prev, currencyMode: mode }));
    setCurrencyMode(mode);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateUserSettings(prev => ({
        ...prev,
        general: formGeneral,
      }));

      // Keep userProfile in sync
      if (formGeneral.timezone || formGeneral.currency) {
        await updateUserProfile({
          ...(formGeneral.timezone ? { timezone: formGeneral.timezone } : {}),
          ...(formGeneral.currency ? { preferredCurrency: formGeneral.currency } : {}),
        });
      }

      await addActivityLog({
        action: 'UPDATE_GLOBAL_SETTINGS',
        category: 'SETTINGS',
        object: 'Display & Formatting Preferences',
        status: 'INFO',
        details: { timezone: formGeneral.timezone, currency: formGeneral.currency, theme: formGeneral.theme },
      });

      addToast('Preferences Saved', 'Display and formatting preferences updated.', 'success');
    } catch (err: any) {
      addToast('Save Failed', err.message || 'Could not update global settings', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[rgba(255,255,255,0.06)]">
        <div>
          <h2 className="text-base font-semibold text-[#F4F5F7] flex items-center gap-2">
            <Layout className="w-4 h-4 text-[#818CF8]" />
            Display & Formatting Preferences
          </h2>
          <p className="text-xs text-[#8A919D] mt-0.5">
            Configure terminal theme, layout density, currency display format, and market timezones.
          </p>
        </div>

        <button
          type="submit"
          disabled={isSaving}
          className="flex items-center gap-2 h-9 px-4 rounded-xl text-xs font-semibold bg-[#6366F1] hover:bg-[#4F46E5] text-white shadow-xs border border-[#6366F1]/30 transition disabled:opacity-50 cursor-pointer"
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

      {/* Group 1: Appearance & Theme */}
      <FormSection
        title="Visual Theme"
        description="Select the interface appearance for charts, tables, and execution widgets."
        icon={<Sparkles className="w-4 h-4 text-[#818CF8]" />}
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { id: 'dark' as const, label: 'Dark Mode', desc: 'Institutional charcoal (#030405)', icon: Moon },
            { id: 'light' as const, label: 'Light Mode', desc: 'High-contrast clean studio', icon: Sun },
            { id: 'system' as const, label: 'System Auto', desc: 'Follow device appearance', icon: Monitor },
          ].map(t => {
            const Icon = t.icon;
            const isSelected = formGeneral.theme === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => handleThemeChange(t.id)}
                className={`p-4 rounded-xl text-left border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#11151A] border-[rgba(99,102,241,0.35)] text-[#F4F5F7] shadow-xs'
                    : 'bg-[#080A0D] border-[rgba(255,255,255,0.06)] text-[#8A919D] hover:text-[#F4F5F7] hover:border-[rgba(255,255,255,0.12)]'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <Icon className={`w-4 h-4 ${isSelected ? 'text-[#818CF8]' : 'text-[#8A919D]'}`} />
                  {isSelected && <Check className="w-3.5 h-3.5 text-[#818CF8]" />}
                </div>
                <div className="font-semibold text-xs text-[#F4F5F7]">{t.label}</div>
                <div className="text-[11px] text-[#8A919D] mt-0.5">{t.desc}</div>
              </button>
            );
          })}
        </div>
      </FormSection>

      {/* Group 2: Currency & Metric Mode */}
      <FormSection
        title="Currency & Primary Metric Mode"
        description="Choose how PnL and account returns are rendered across your dashboard."
        icon={<DollarSign className="w-4 h-4 text-[#818CF8]" />}
      >
        <FormGrid columns={2}>
          <FormField label="Base Ledger Currency">
            <select
              value={formGeneral.currency}
              onChange={e => setFormGeneral(prev => ({ ...prev, currency: e.target.value }))}
              className="w-full bg-[#080A0D] border border-[rgba(255,255,255,0.08)] rounded-xl px-3.5 py-2.5 text-[#F4F5F7] text-xs focus:outline-none focus:border-[#6366F1] cursor-pointer"
            >
              {CURRENCIES.map(curr => (
                <option key={curr.code} value={curr.code} className="bg-[#0D1014] text-[#F4F5F7]">
                  {curr.symbol} - {curr.code} ({curr.name})
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Primary Display Metric">
            <select
              value={formGeneral.currencyMode}
              onChange={e => handleCurrencyModeChange(e.target.value as any)}
              className="w-full bg-[#080A0D] border border-[rgba(255,255,255,0.08)] rounded-xl px-3.5 py-2.5 text-[#F4F5F7] text-xs focus:outline-none focus:border-[#6366F1] cursor-pointer"
            >
              <option value="USD" className="bg-[#0D1014] text-[#F4F5F7]">Dollar P&L ($1,250.00)</option>
              <option value="PERCENT" className="bg-[#0D1014] text-[#F4F5F7]">Percentage Return (+2.45%)</option>
              <option value="R_MULTIPLE" className="bg-[#0D1014] text-[#F4F5F7]">R-Multiple (+2.15R)</option>
              <option value="TICKS" className="bg-[#0D1014] text-[#F4F5F7]">Points / Ticks (+45.5 pts)</option>
              <option value="PRIVACY" className="bg-[#0D1014] text-[#F4F5F7]">Privacy Mode (••••••)</option>
            </select>
          </FormField>
        </FormGrid>
      </FormSection>

      {/* Group 3: Timezone & Clock Standards */}
      <FormSection
        title="Timezone & Clock Standards"
        description="Ensure trade executions and economic events align with your desk hours."
        icon={<Clock className="w-4 h-4 text-[#818CF8]" />}
      >
        <FormGrid columns={3}>
          <FormField label="Chart & Trade Timezone">
            <select
              value={formGeneral.timezone}
              onChange={e => setFormGeneral(prev => ({ ...prev, timezone: e.target.value }))}
              className="w-full bg-[#080A0D] border border-[rgba(255,255,255,0.08)] rounded-xl px-3.5 py-2.5 text-[#F4F5F7] text-xs focus:outline-none focus:border-[#6366F1] cursor-pointer"
            >
              {TIMEZONES.map(tz => (
                <option key={tz.value} value={tz.value} className="bg-[#0D1014] text-[#F4F5F7]">
                  {tz.label}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Date Format">
            <select
              value={formGeneral.dateFormat}
              onChange={e => setFormGeneral(prev => ({ ...prev, dateFormat: e.target.value as any }))}
              className="w-full bg-[#080A0D] border border-[rgba(255,255,255,0.08)] rounded-xl px-3.5 py-2.5 text-[#F4F5F7] text-xs focus:outline-none focus:border-[#6366F1] cursor-pointer"
            >
              <option value="YYYY-MM-DD" className="bg-[#0D1014] text-[#F4F5F7]">YYYY-MM-DD (2026-08-15)</option>
              <option value="MM/DD/YYYY" className="bg-[#0D1014] text-[#F4F5F7]">MM/DD/YYYY (08/15/2026)</option>
              <option value="DD/MM/YYYY" className="bg-[#0D1014] text-[#F4F5F7]">DD/MM/YYYY (15/08/2026)</option>
            </select>
          </FormField>

          <FormField label="Clock Standard">
            <select
              value={formGeneral.timeFormat}
              onChange={e => setFormGeneral(prev => ({ ...prev, timeFormat: e.target.value as any }))}
              className="w-full bg-[#080A0D] border border-[rgba(255,255,255,0.08)] rounded-xl px-3.5 py-2.5 text-[#F4F5F7] text-xs focus:outline-none focus:border-[#6366F1] cursor-pointer"
            >
              <option value="12h" className="bg-[#0D1014] text-[#F4F5F7]">12-Hour (02:30 PM)</option>
              <option value="24h" className="bg-[#0D1014] text-[#F4F5F7]">24-Hour Military (14:30)</option>
            </select>
          </FormField>
        </FormGrid>
      </FormSection>
    </form>
  );
};
