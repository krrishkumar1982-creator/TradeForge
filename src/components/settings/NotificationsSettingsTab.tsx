import React, { useState } from 'react';
import {
  Bell,
  Volume2,
  ShieldAlert,
  Calendar,
  Save,
  CheckCircle2,
  Loader2,
  Flame,
  Radio,
  Clock,
} from 'lucide-react';
import { useTrading } from '../../context/TradingContext';
import { NotificationPreferences } from '../../types';
import { FormSection, ToggleSwitch } from '../common/FormControls';

export const NotificationsSettingsTab: React.FC = () => {
  const {
    userSettings,
    updateUserSettings,
    addToast,
    addActivityLog,
    theme,
  } = useTrading();

  const isLight = theme === 'light';

  const defaultNotifications: NotificationPreferences = {
    tradeAlerts: true,
    riskAlerts: true,
    propFirmWarnings: true,
    syncNotifications: true,
    dailyJournalReminder: true,
    weeklyPerformanceReview: true,
    soundEnabled: true,
  };

  const currentPrefs = userSettings?.notifications || defaultNotifications;
  const [prefs, setPrefs] = useState<NotificationPreferences>(currentPrefs);
  const [isSaving, setIsSaving] = useState(false);

  const toggle = (key: keyof NotificationPreferences) => {
    setPrefs(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateUserSettings(prev => ({
        ...prev,
        notifications: prefs,
      }));

      await addActivityLog({
        action: 'UPDATE_NOTIFICATIONS',
        category: 'SETTINGS',
        object: 'Notification Preferences',
        status: 'INFO',
        details: prefs,
      });

      addToast('Preferences Updated', 'Notification and sound alerts updated successfully.', 'success');
    } catch (err: any) {
      addToast('Save Failed', err.message || 'Could not update notification settings', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-6 max-w-3xl">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#1C232E]">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Bell className="w-4 h-4 text-blue-400" />
            Notifications & Sound Alerts
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Configure trade execution notices, risk alerts, routine reminders, and sound effects.
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

      {/* Group 1: Trade & Risk Alerts */}
      <FormSection
        title="Execution & Risk Alerts"
        description="Real-time alerts triggered by broker order events, risk boundaries, and prop rules."
        icon={<ShieldAlert className="w-4 h-4 text-blue-400" />}
      >
        <div className="space-y-3 divide-y divide-[#1C232E]/60">
          <div className="pt-1">
            <ToggleSwitch
              checked={prefs.tradeAlerts}
              onChange={() => toggle('tradeAlerts')}
              label="Trade Execution Alerts"
              description="Notify immediately when limit/stop orders fill or positions are closed."
            />
          </div>

          <div className="pt-3">
            <ToggleSwitch
              checked={prefs.riskAlerts}
              onChange={() => toggle('riskAlerts')}
              label="Risk Threshold Warnings"
              description="Alert when your current drawdown approaches daily risk or maximum drawdown caps."
            />
          </div>

          <div className="pt-3">
            <ToggleSwitch
              checked={prefs.propFirmWarnings}
              onChange={() => toggle('propFirmWarnings')}
              label="Prop Firm Rule Warnings"
              description="Receive instant alerts for minimum trading days, trailing drawdowns, or consistency limits."
            />
          </div>

          <div className="pt-3">
            <ToggleSwitch
              checked={prefs.syncNotifications}
              onChange={() => toggle('syncNotifications')}
              label="Broker Auto-Sync Confirmations"
              description="Send quiet notices when background auto-sync completes new trade imports."
            />
          </div>
        </div>
      </FormSection>

      {/* Group 2: Routine & Journaling Reminders */}
      <FormSection
        title="Discipline & Journaling Prompts"
        description="Scheduled prompts to maintain high-conviction journaling habits and weekly reviews."
        icon={<Clock className="w-4 h-4 text-blue-400" />}
      >
        <div className="space-y-3 divide-y divide-[#1C232E]/60">
          <div className="pt-1">
            <ToggleSwitch
              checked={prefs.dailyJournalReminder}
              onChange={() => toggle('dailyJournalReminder')}
              label="Daily Post-Market Journal Prompt"
              description="Gentle prompt at market close to tag mistakes, record psychology, and rate executions."
            />
          </div>

          <div className="pt-3">
            <ToggleSwitch
              checked={prefs.weeklyPerformanceReview}
              onChange={() => toggle('weeklyPerformanceReview')}
              label="Weekly Performance Digest"
              description="Automated weekend synthesis highlighting win rate, profit factor, and top playbooks."
            />
          </div>
        </div>
      </FormSection>

      {/* Group 3: Audio & Audio Feedback */}
      <FormSection
        title="Sound & Haptic Feedback"
        description="Auditory cues for rapid situational awareness during fast market sessions."
        icon={<Volume2 className="w-4 h-4 text-blue-400" />}
      >
        <div className="pt-1">
          <ToggleSwitch
            checked={prefs.soundEnabled}
            onChange={() => toggle('soundEnabled')}
            label="Enable Platform Audio Effects"
            description="Play distinct low-latency chimes on order fills, target hits, and risk breaches."
          />
        </div>
      </FormSection>
    </form>
  );
};
