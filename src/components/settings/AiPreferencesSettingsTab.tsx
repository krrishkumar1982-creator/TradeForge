import React, { useState } from 'react';
import {
  Sparkles,
  Bot,
  Brain,
  Sliders,
  Save,
  CheckCircle2,
  Loader2,
  Check,
  Target,
  Zap,
  GraduationCap,
  Shield,
} from 'lucide-react';
import { useTrading } from '../../context/TradingContext';
import { AiSettings } from '../../types';
import { FormSection, ToggleSwitch } from '../common/FormControls';

export const AiPreferencesSettingsTab: React.FC = () => {
  const {
    userSettings,
    updateUserSettings,
    addToast,
    addActivityLog,
  } = useTrading();

  const defaultAiSettings: AiSettings = {
    aiCoachEnabled: true,
    responseStyle: 'institutional',
    analysisScope: 'active_account',
    autoReviewTrades: true,
  };

  const currentSettings = userSettings?.aiSettings || defaultAiSettings;
  const [settings, setSettings] = useState<AiSettings>(currentSettings);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateUserSettings(prev => ({
        ...prev,
        aiSettings: settings,
      }));

      await addActivityLog({
        action: 'UPDATE_AI_SETTINGS',
        category: 'SETTINGS',
        object: 'AI Coach Preferences',
        status: 'INFO',
        details: settings,
      });

      addToast('AI Preferences Saved', 'TradeForge AI Coach parameters updated.', 'success');
    } catch (err: any) {
      addToast('Save Failed', err.message || 'Could not update AI preferences', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const responseStyles = [
    {
      id: 'institutional' as const,
      label: 'Institutional Desk Manager',
      icon: Shield,
      description: 'Focuses on expected value (EV), drawdown containment, sizing variance, and playbook repeatability.',
    },
    {
      id: 'concise' as const,
      label: 'Concise Bullet Summary',
      icon: Zap,
      description: 'Ultra-fast, high-density takeaways designed for active trading sessions with zero filler.',
    },
    {
      id: 'educational' as const,
      label: 'Educational & Socratic',
      icon: GraduationCap,
      description: 'Detailed analysis explaining why market structure formed, auction theory, and psychological triggers.',
    },
    {
      id: 'direct' as const,
      label: 'Direct & Disciplined',
      icon: Target,
      description: 'Blunt, candid feedback calling out rule violations, revenge trades, and emotional departures.',
    },
  ];

  return (
    <form onSubmit={handleSave} className="space-y-6 max-w-3xl">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#1C232E]">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-400" />
            AI Coach & Model Preferences
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Calibrate intelligence models, mentor communication style, and automatic trade analysis.
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

      {/* Group 1: General Intelligence Engine */}
      <FormSection
        title="Intelligence Engine"
        description="Master toggles for the TradeForge AI coach and automated execution review."
        icon={<Brain className="w-4 h-4 text-blue-400" />}
      >
        <div className="space-y-3 divide-y divide-[#1C232E]/60">
          <div className="pt-1">
            <ToggleSwitch
              checked={settings.aiCoachEnabled}
              onChange={() => setSettings(prev => ({ ...prev, aiCoachEnabled: !prev.aiCoachEnabled }))}
              label="Enable TradeForge AI Coach"
              description="Activates real-time trade grading, playbook optimization, and psychology suggestions."
            />
          </div>

          <div className="pt-3">
            <ToggleSwitch
              checked={settings.autoReviewTrades}
              onChange={() => setSettings(prev => ({ ...prev, autoReviewTrades: !prev.autoReviewTrades }))}
              label="Automatic Trade Ingestion Review"
              description="Automatically generate AI critique whenever a trade is closed or synced from your broker."
            />
          </div>
        </div>
      </FormSection>

      {/* Group 2: Coach Persona & Tone */}
      <FormSection
        title="Coach Persona & Feedback Style"
        description="Select the voice and analytical framing TradeForge AI uses when grading your execution."
        icon={<Bot className="w-4 h-4 text-blue-400" />}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          {responseStyles.map(item => {
            const Icon = item.icon;
            const isSelected = settings.responseStyle === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSettings(prev => ({ ...prev, responseStyle: item.id }))}
                className={`p-4 rounded-xl text-left border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-blue-600/10 border-blue-500 text-white shadow-sm'
                    : 'bg-[#0A0D14] border-[#1C232E] text-slate-300 hover:border-[#273141] hover:bg-[#161B23]'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <Icon className={`w-4 h-4 ${isSelected ? 'text-blue-400' : 'text-slate-400'}`} />
                    <span className="font-semibold text-xs text-white">{item.label}</span>
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5 text-blue-400" />}
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">{item.description}</p>
              </button>
            );
          })}
        </div>
      </FormSection>

      {/* Group 3: Analysis Scope */}
      <FormSection
        title="Analysis Context & Scope"
        description="Define which trades are fed into AI models for multi-trade pattern recognition."
        icon={<Sliders className="w-4 h-4 text-blue-400" />}
      >
        <div className="space-y-1.5 pt-1">
          <label className="block text-xs font-semibold text-slate-200">Default Query Scope</label>
          <select
            value={settings.analysisScope}
            onChange={e => setSettings(prev => ({ ...prev, analysisScope: e.target.value as any }))}
            className="w-full sm:w-80 px-3.5 py-2.5 rounded-xl bg-[#0A0D14] border border-[#1C232E] text-white text-xs focus:outline-none focus:border-blue-500 cursor-pointer"
          >
            <option value="active_account">Active Selected Account Only (Recommended)</option>
            <option value="filtered">Current Filtered View (Respect Date & Ticker Filters)</option>
            <option value="all">Global Workspace (All Linked Portfolios Combined)</option>
          </select>
          <p className="text-xs text-slate-400 mt-1">
            Restricting to the active account prevents evaluation accounts from contaminating funded analytics.
          </p>
        </div>
      </FormSection>
    </form>
  );
};
