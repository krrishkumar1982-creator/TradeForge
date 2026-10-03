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
      group: 'Account',
      items: [
        { id: 'profile', label: 'Profile', icon: User, desc: 'Public handle, avatar & bio' },
        { id: 'security', label: 'Security', icon: Shield, desc: 'Password, 2FA & sessions' },
        { id: 'subscription', label: 'Billing', icon: CreditCard, desc: 'Plan & billing' },
      ],
    },
    {
      group: 'Preferences',
      items: [
        { id: 'accounts', label: 'Accounts', icon: Building2, desc: 'Trading accounts & brokers' },
        { id: 'integrations', label: 'Integrations', icon: Link2, desc: 'Broker sync & connections' },
        { id: 'trade-settings', label: 'Trading', icon: Sliders, desc: 'Default trade parameters' },
        { id: 'global', label: 'General', icon: Globe, desc: 'Theme, currency & timezone' },
        { id: 'notifications', label: 'Notifications', icon: Bell, desc: 'Alerts & reminders' },
        { id: 'ai-preferences', label: 'AI Review', icon: Sparkles, desc: 'Review coach settings' },
        { id: 'tags', label: 'Tags', icon: Tags, desc: 'Setups & mistake tags' },
        { id: 'import-history', label: 'Import History', icon: FileSpreadsheet, desc: 'Past trade imports' },
        { id: 'log-history', label: 'Activity Log', icon: History, desc: 'Account activity' },
        { id: 'backup-reset', label: 'Data & Backup', icon: RotateCcw, desc: 'Export & account reset' },
      ],
    },
  ];

  return (
    <div className={`min-h-full transition-colors ${isLight ? 'bg-zinc-50 text-zinc-900' : 'bg-[#030405] text-[#C2C7D0]'}`}>
      {/* Top Header Bar */}
      <div className={`border-b px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 sticky top-0 z-20 backdrop-blur-md ${
        isLight ? 'bg-white/90 border-zinc-200' : 'bg-[#06080B]/90 border-[rgba(255,255,255,0.06)]'
      }`}>
        <div>
          <div className="flex items-center gap-2">
            <h1 className={`text-xl font-bold tracking-tight ${isLight ? 'text-zinc-900' : 'text-[#F4F5F7]'}`}>
              Settings
            </h1>
          </div>
          <p className={`text-xs mt-0.5 ${isLight ? 'text-zinc-500' : 'text-[#8A919D]'}`}>
            Manage your account, trading preferences, and data.
          </p>
        </div>

        {/* Global Account Context Selector */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-2">
            <span className={`text-xs font-semibold ${isLight ? 'text-zinc-500' : 'text-[#8A919D]'}`}>Scope:</span>
            <select
              value={selectedAccountId || 'all'}
              onChange={e => setSelectedAccountId(e.target.value)}
              className={`rounded-xl border px-3 py-1.5 text-xs font-semibold focus:outline-none cursor-pointer ${
                isLight
                  ? 'bg-zinc-100 border-zinc-300 text-zinc-800 focus:border-indigo-500'
                  : 'bg-[#080A0D] border-[rgba(255,255,255,0.08)] text-[#F4F5F7] focus:border-[#6366F1]'
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
                  isLight ? 'text-zinc-400' : 'text-[#5E6570]'
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
                        className={`flex w-full items-center justify-between px-3.5 py-2.5 text-xs rounded-xl font-medium transition-all cursor-pointer ${
                          isActive
                            ? isLight
                              ? 'bg-indigo-50 text-indigo-900 border border-indigo-200 font-semibold'
                              : 'bg-[#11151A] text-[#F4F5F7] border border-[rgba(99,102,241,0.35)] shadow-xs font-semibold'
                            : isLight
                              ? 'text-zinc-600 hover:bg-zinc-200/70 hover:text-zinc-900 border border-transparent'
                              : 'text-[#8A919D] hover:bg-[#151A20] hover:text-[#F4F5F7] border border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Icon className={`w-4 h-4 ${isActive ? 'text-[#818CF8]' : 'text-[#5E6570]'}`} />
                          <span>{item.label}</span>
                        </div>
                        {isActive && <ChevronRight className="w-3.5 h-3.5 text-[#818CF8]" />}
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
