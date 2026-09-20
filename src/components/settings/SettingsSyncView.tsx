import React, { useState } from 'react';
import {
  User,
  Shield,
  CreditCard,
  Building2,
  Receipt,
  Sliders,
  Globe,
  Tags,
  FileSpreadsheet,
  History,
  RotateCcw,
  Link2,
  Layers,
  Search,
  CheckCircle2,
  SlidersHorizontal,
  ChevronRight,
  Bell,
  Sparkles
} from 'lucide-react';
import { useTrading } from '../../context/TradingContext';

// Modular Tab Components
import { ProfileSettingsTab } from './ProfileSettingsTab';
import { SecuritySettingsTab } from './SecuritySettingsTab';
import { SubscriptionSettingsTab } from './SubscriptionSettingsTab';
import { AccountsSettingsTab } from './AccountsSettingsTab';
import { AutoSyncConnectionsManager } from './AutoSyncConnectionsManager';
import { CommissionsSettingsTab } from './CommissionsSettingsTab';
import { TradeSettingsTab } from './TradeSettingsTab';
import { GlobalSettingsTab } from './GlobalSettingsTab';
import { NotificationsSettingsTab } from './NotificationsSettingsTab';
import { AiPreferencesSettingsTab } from './AiPreferencesSettingsTab';
import { TagsSettingsTab } from './TagsSettingsTab';
import { ImportHistoryTab } from './ImportHistoryTab';
import { LogHistoryTab } from './LogHistoryTab';
import { BackupResetSettingsTab } from './BackupResetSettingsTab';

export type SettingsTab =
  | 'profile'
  | 'security'
  | 'subscription'
  | 'accounts'
  | 'integrations'
  | 'commissions'
  | 'trade-settings'
  | 'global'
  | 'notifications'
  | 'ai-preferences'
  | 'tags'
  | 'import-history'
  | 'log-history'
  | 'backup-reset';

interface SettingsSyncViewProps {
  onOpenImport?: () => void;
  initialTab?: SettingsTab;
}

export const SettingsSyncView: React.FC<SettingsSyncViewProps> = ({
  onOpenImport,
  initialTab = 'profile',
}) => {
  const {
    accounts,
    selectedAccountId,
    setSelectedAccountId,
    theme,
    userProfile,
  } = useTrading();

  const isLight = theme === 'light';
  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab);
  const [searchFilter, setSearchFilter] = useState('');

  const navGroups = [
    {
      group: 'User Identity',
      items: [
        { id: 'profile', label: 'Profile', icon: User, desc: 'Public trader handle, avatar & bio' },
        { id: 'security', label: 'Security', icon: Shield, desc: 'Passwords, 2FA & active sessions' },
        { id: 'subscription', label: 'Subscription', icon: CreditCard, desc: 'Plan status, invoices & tier' },
      ],
    },
    {
      group: 'Trading & Platform Rules',
      items: [
        { id: 'accounts', label: 'Accounts', icon: Building2, desc: 'Multi-portfolio balances & brokers' },
        { id: 'integrations', label: 'Broker Auto-Sync', icon: Link2, desc: 'Live MT4/5, Tradovate & Ninja bridges' },
        { id: 'commissions', label: 'Commissions & fees', icon: Receipt, desc: 'Default round-trip fee schedules' },
        { id: 'trade-settings', label: 'Trade settings', icon: Sliders, desc: 'Default risk, sizing & discipline checks' },
        { id: 'global', label: 'Global settings', icon: Globe, desc: 'Theme, currency & chart timezones' },
        { id: 'notifications', label: 'Notifications', icon: Bell, desc: 'Risk alerts, audio cues & schedule reminders' },
        { id: 'ai-preferences', label: 'AI Coach & Insights', icon: Sparkles, desc: 'Response tone, auto-review & scope' },
        { id: 'tags', label: 'Tags management', icon: Tags, desc: 'Setup, mistake & market taxonomy' },
        { id: 'import-history', label: 'Import history', icon: FileSpreadsheet, desc: 'Execution ingestion audit log' },
        { id: 'log-history', label: 'Log history', icon: History, desc: 'System & security audit trail' },
        { id: 'backup-reset', label: 'Data Reset & Backup', icon: RotateCcw, desc: 'Point-in-time snapshots & cloud wipes' },
      ],
    },
  ];

  return (
    <div className={`min-h-full transition-colors ${isLight ? 'bg-zinc-50 text-zinc-900' : 'bg-[#0A0D14] text-slate-200'}`}>
      {/* Top Header Bar */}
      <div className={`border-b px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 sticky top-0 z-20 backdrop-blur-md ${
        isLight ? 'bg-white/90 border-zinc-200' : 'bg-[#12161D]/90 border-[#1C232E]'
      }`}>
        <div>
          <div className="flex items-center gap-2">
            <h1 className={`text-xl font-black tracking-tight ${isLight ? 'text-zinc-900' : 'text-slate-100'}`}>
              Settings Center
            </h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
              INSTITUTIONAL
            </span>
          </div>
          <p className={`text-xs mt-0.5 ${isLight ? 'text-zinc-500' : 'text-slate-400'}`}>
            Enterprise execution controls, broker synchronization, compliance rules, and data resilience.
          </p>
        </div>

        {/* Global Account Context Selector */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-2">
            <span className={`text-xs font-semibold ${isLight ? 'text-zinc-500' : 'text-slate-400'}`}>Scope:</span>
            <select
              value={selectedAccountId || 'all'}
              onChange={e => setSelectedAccountId(e.target.value)}
              className={`rounded-xl border px-3 py-1.5 text-xs font-semibold focus:outline-none cursor-pointer ${
                isLight
                  ? 'bg-zinc-100 border-zinc-300 text-zinc-800 focus:border-indigo-500'
                  : 'bg-[#0A0D14] border-[#1C232E] text-slate-200 focus:border-indigo-500'
              }`}
            >
              <option value="all">Global Workspace (All Accounts)</option>
              {accounts.map(acc => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} ({acc.broker || acc.type})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        <div className="flex flex-col md:flex-row gap-8 items-start">
          {/* Left Sticky Sidebar Navigation */}
          <aside className="w-full md:w-64 shrink-0 space-y-6">
            {navGroups.map(group => (
              <div key={group.group} className="space-y-1.5">
                <div className={`px-3 text-[10px] font-bold uppercase tracking-wider font-mono ${
                  isLight ? 'text-zinc-400' : 'text-slate-500'
                }`}>
                  {group.group}
                </div>

                <nav className="space-y-1">
                  {group.items.map(item => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setActiveTab(item.id as SettingsTab)}
                        className={`flex w-full items-center justify-between px-3.5 py-2.5 text-xs rounded-xl font-semibold transition-all cursor-pointer ${
                          isActive
                            ? isLight
                              ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-600/25 border border-indigo-400/30'
                              : 'bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-600/25 border border-indigo-400/40'
                            : isLight
                              ? 'text-zinc-600 hover:bg-zinc-200/70 hover:text-zinc-900 border border-transparent'
                              : 'text-slate-400 hover:bg-[#12161D] hover:text-slate-200 border border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                          <span>{item.label}</span>
                        </div>
                        {isActive && <ChevronRight className="w-3.5 h-3.5 opacity-80" />}
                      </button>
                    );
                  })}
                </nav>
              </div>
            ))}
          </aside>

          {/* Right Main Settings Workspace */}
          <main className="flex-1 w-full min-w-0">
            {activeTab === 'profile' && <ProfileSettingsTab />}
            {activeTab === 'security' && <SecuritySettingsTab />}
            {activeTab === 'subscription' && <SubscriptionSettingsTab />}
            {activeTab === 'accounts' && <AccountsSettingsTab />}
            {activeTab === 'integrations' && (
              <AutoSyncConnectionsManager onOpenImport={onOpenImport} />
            )}
            {activeTab === 'commissions' && <CommissionsSettingsTab />}
            {activeTab === 'trade-settings' && <TradeSettingsTab />}
            {activeTab === 'global' && <GlobalSettingsTab />}
            {activeTab === 'notifications' && <NotificationsSettingsTab />}
            {activeTab === 'ai-preferences' && <AiPreferencesSettingsTab />}
            {activeTab === 'tags' && <TagsSettingsTab />}
            {activeTab === 'import-history' && (
              <ImportHistoryTab onOpenImportModal={onOpenImport} />
            )}
            {activeTab === 'log-history' && <LogHistoryTab />}
            {activeTab === 'backup-reset' && <BackupResetSettingsTab />}
          </main>
        </div>
      </div>
    </div>
  );
};
