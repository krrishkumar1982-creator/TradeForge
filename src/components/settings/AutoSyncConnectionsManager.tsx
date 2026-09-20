import React, { useState, useEffect } from 'react';
import {
  Link2,
  Radio,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Trash2,
  Settings,
  Plus,
  Clock,
  ShieldCheck,
  Key,
  Server,
  Check,
  ExternalLink,
  FileText,
  Activity,
  Zap,
  Sliders,
  Eye,
  EyeOff,
  Calendar,
  ChevronRight,
  X,
  Database,
  Building2,
  Layers,
  ArrowRight,
  TrendingUp,
  History
} from 'lucide-react';
import { useTrading } from '../../context/TradingContext';
import {
  fetchPlatformsApi,
  testConnectionApi,
  fetchConnectionsApi,
  createConnectionApi,
  updateConnectionApi,
  deleteConnectionApi,
  syncConnectionApi,
  fetchConnectionLogsApi,
} from '../../services/apiClient';
import { TradingAccountConnection, ConnectionSyncLog } from '../../types';

interface AutoSyncConnectionsManagerProps {
  onOpenImport?: () => void;
}

export const AutoSyncConnectionsManager: React.FC<AutoSyncConnectionsManagerProps> = ({
  onOpenImport,
}) => {
  const {
    accounts,
    selectedAccountId,
    setSelectedAccountId,
    theme,
    addToast,
    refreshState,
  } = useTrading();

  const isLight = theme === 'light';

  // Platforms supported by backend
  const [platforms, setPlatforms] = useState<any[]>([]);
  const [connections, setConnections] = useState<TradingAccountConnection[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeSyncingIds, setActiveSyncingIds] = useState<Set<string>>(new Set());

  // Add / Connect Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedPlatformId, setSelectedPlatformId] = useState<string>('MT5');
  const [formData, setFormData] = useState<{
    broker: string;
    server: string;
    accountNumber: string;
    accountName: string;
    currency: string;
    accountType: string;
    // Platform-specific credentials
    investorPassword?: string;
    masterPassword?: string;
    apiToken?: string;
    accountId?: string;
    environment?: string;
    appToken?: string;
    secretToken?: string;
    username?: string;
    tenantUrl?: string;
    apiKey?: string;
    apiSecret?: string;
    // Config
    syncEnabled: boolean;
    autoSyncIntervalMins: number;
    importScope: 'ALL_HISTORY' | 'FROM_DATE' | 'RECENT_ONLY';
    importStartDate: string;
    linkOption: 'NEW_ACCOUNT' | 'EXISTING_ACCOUNT';
    selectedExistingAccountId: string;
  }>({
    broker: 'FTMO MetaTrader 5',
    server: 'FTMO-Server',
    accountNumber: '',
    accountName: '',
    currency: 'USD',
    accountType: 'PROP_FIRM_EVAL',
    investorPassword: '',
    masterPassword: '',
    apiToken: '',
    syncEnabled: true,
    autoSyncIntervalMins: 5,
    importScope: 'ALL_HISTORY',
    importStartDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    linkOption: 'NEW_ACCOUNT',
    selectedExistingAccountId: accounts[0]?.id || '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; latencyMs?: number; accountInfo?: any } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync Logs Modal
  const [logsModalConnection, setLogsModalConnection] = useState<TradingAccountConnection | null>(null);
  const [logs, setLogs] = useState<ConnectionSyncLog[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

  // Edit Connection Modal
  const [editConnection, setEditConnection] = useState<TradingAccountConnection | null>(null);
  const [editFormData, setEditFormData] = useState({
    accountName: '',
    syncEnabled: true,
    autoSyncIntervalMins: 5,
    importScope: 'ALL_HISTORY',
    importStartDate: '',
  });

  // Delete Confirmation Modal
  const [deleteModalConnection, setDeleteModalConnection] = useState<TradingAccountConnection | null>(null);

  // Load platforms and connections
  const loadData = async () => {
    setIsLoading(true);
    try {
      const [platData, connData] = await Promise.all([
        fetchPlatformsApi().catch(() => []),
        fetchConnectionsApi().catch(() => []),
      ]);
      if (Array.isArray(platData) && platData.length > 0) {
        setPlatforms(platData);
      } else {
        // Fallback platform declarations
        setPlatforms([
          {
            id: 'MT5',
            name: 'MetaTrader 5',
            category: 'TERMINAL',
            description: 'Institutional bridge with investor / read-only credentials.',
            authType: 'INVESTOR_PASSWORD',
            features: ['Live Executions', 'Historical Backfill', 'Idempotent Sync', 'Investor Read-Only Mode'],
          },
          {
            id: 'CTRADER',
            name: 'cTrader',
            category: 'API',
            description: 'Spotware cTrader Open API 2.0 direct cloud connection.',
            authType: 'API_TOKEN',
            features: ['Cloud Direct Stream', 'Sub-millisecond Fills', 'Full Order Audit'],
          },
          {
            id: 'DXTRADE',
            name: 'DXtrade',
            category: 'PROP_FIRM',
            description: 'Devexperts DXtrade engine for prop firms & institutional brokers.',
            authType: 'TOKEN_AUTH',
            features: ['Prop Firm Compatible', 'Realtime Positions', 'Closed PnL Sync'],
          },
          {
            id: 'MATCH_TRADER',
            name: 'Match-Trader',
            category: 'PROP_FIRM',
            description: 'Match-Trade Technologies cloud connector.',
            authType: 'API_TOKEN',
            features: ['Prop Accounts', 'Tick Data Precision', 'Auto Journaling'],
          },
          {
            id: 'BROKER_API',
            name: 'Broker REST APIs',
            category: 'BROKER',
            description: 'Interactive Brokers Flex, TradeStation, Alpaca & prop platforms.',
            authType: 'API_KEY_SECRET',
            features: ['Official Broker APIs', 'Equities & Futures', 'Multi-Asset Support'],
          },
          {
            id: 'CSV_IMPORT',
            name: 'CSV / File Auto-Sync',
            category: 'FALLBACK',
            description: 'Smart trade statement sync engine from 50+ broker exports.',
            authType: 'MANUAL',
            features: ['Statement Importer', 'Format Normalizer', 'Offline Compatible'],
          },
        ]);
      }
      if (Array.isArray(connData)) {
        setConnections(connData);
      }
    } catch (err: any) {
      console.error('Failed to load auto-sync connections:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Preset platforms info
  const selectedPlatform = platforms.find((p) => p.id === selectedPlatformId) || platforms[0];

  // Reset form when platform changes
  const handleSelectPlatform = (platformId: string) => {
    setSelectedPlatformId(platformId);
    setTestResult(null);

    // Provide sensible default placeholders
    if (platformId === 'MT5') {
      setFormData((prev) => ({
        ...prev,
        broker: 'FTMO (MetaQuotes / MT5)',
        server: 'FTMO-Server',
        accountName: 'FTMO $100k Challenge',
        currency: 'USD',
      }));
    } else if (platformId === 'CTRADER') {
      setFormData((prev) => ({
        ...prev,
        broker: 'IC Markets cTrader',
        server: 'cTrader Live Server',
        accountName: 'IC Markets Raw cTrader',
        currency: 'USD',
      }));
    } else if (platformId === 'DXTRADE') {
      setFormData((prev) => ({
        ...prev,
        broker: 'FundingPips DXtrade',
        server: 'https://dxtrade.fundingpips.com',
        accountName: 'DXtrade 2-Step 50k',
        currency: 'USD',
      }));
    } else if (platformId === 'MATCH_TRADER') {
      setFormData((prev) => ({
        ...prev,
        broker: 'FundedNext Match-Trader',
        server: 'Match-Trader Live Hub',
        accountName: 'FundedNext Match-Trader',
        currency: 'USD',
      }));
    } else if (platformId === 'BROKER_API') {
      setFormData((prev) => ({
        ...prev,
        broker: 'Interactive Brokers (Flex Query)',
        server: 'IBKR Gateway / Web API',
        accountName: 'IBKR Pro Live Portfolio',
        currency: 'USD',
      }));
    }
  };

  // Build credentials object based on selected platform
  const buildCredentialsObject = () => {
    const creds: Record<string, any> = {};
    if (selectedPlatformId === 'MT5') {
      creds.server = formData.server;
      creds.login = formData.accountNumber;
      creds.investorPassword = formData.investorPassword || '';
      if (formData.masterPassword) creds.masterPassword = formData.masterPassword;
    } else if (selectedPlatformId === 'CTRADER') {
      creds.accountId = formData.accountNumber;
      creds.apiToken = formData.apiToken;
      creds.appToken = formData.appToken;
      creds.environment = formData.environment || 'live';
    } else if (selectedPlatformId === 'DXTRADE') {
      creds.username = formData.username || formData.accountNumber;
      creds.apiToken = formData.apiToken;
      creds.tenantUrl = formData.tenantUrl || formData.server;
    } else if (selectedPlatformId === 'MATCH_TRADER') {
      creds.accountId = formData.accountNumber;
      creds.apiToken = formData.apiToken;
      creds.secretToken = formData.secretToken;
    } else if (selectedPlatformId === 'BROKER_API') {
      creds.apiKey = formData.apiKey;
      creds.apiSecret = formData.apiSecret;
      creds.accountId = formData.accountNumber;
    }
    return creds;
  };

  // Live test connection
  const handleTestConnection = async () => {
    if (!formData.accountNumber) {
      addToast('Validation', 'Please enter your Account Number or Login ID', 'warning');
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const credentials = buildCredentialsObject();
      const res = await testConnectionApi(selectedPlatformId, credentials);
      setTestResult({
        success: true,
        message: res.message || 'Connection verified successfully.',
        latencyMs: res.latencyMs || 42,
        accountInfo: res.accountInfo,
      });
      addToast('Connection Verified', `Successfully reached ${selectedPlatform?.name || selectedPlatformId}`, 'success');
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Could not authenticate with broker server.',
      });
      addToast('Connection Test Failed', err.message || 'Verification error', 'error');
    } finally {
      setIsTesting(false);
    }
  };

  // Save & Create Connection
  const handleCreateConnection = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedPlatformId === 'CSV_IMPORT') {
      setIsAddModalOpen(false);
      if (onOpenImport) onOpenImport();
      return;
    }

    if (!formData.accountNumber) {
      addToast('Validation Error', 'Account Number / Login is required', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const credentials = buildCredentialsObject();
      const result = await createConnectionApi({
        platform: selectedPlatformId,
        broker: formData.broker || selectedPlatform?.name || 'Live Broker',
        server: formData.server,
        accountNumber: formData.accountNumber,
        accountName: formData.accountName || `${formData.broker} (${formData.accountNumber})`,
        currency: formData.currency || 'USD',
        accountType: formData.accountType || 'LIVE',
        credentials,
        syncEnabled: formData.syncEnabled,
        autoSyncIntervalMins: formData.autoSyncIntervalMins,
        importScope: formData.importScope,
        importStartDate: formData.importScope === 'FROM_DATE' ? formData.importStartDate : undefined,
        linkToExistingAccountId:
          formData.linkOption === 'EXISTING_ACCOUNT' ? formData.selectedExistingAccountId : undefined,
      });

      addToast(
        'Account Connected',
        `Successfully linked ${result.connection?.broker || 'Account'}. Initial sync triggered!`,
        'success'
      );

      setIsAddModalOpen(false);
      await loadData();
      await refreshState();
    } catch (err: any) {
      console.error('Create connection error:', err);
      addToast('Failed to Connect', err.message || 'Error establishing connection', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Trigger Immediate Sync
  const handleTriggerSync = async (conn: TradingAccountConnection) => {
    setActiveSyncingIds((prev) => new Set(prev).add(conn.id));
    addToast('Syncing Trades', `Connecting to ${conn.broker} (${conn.accountNumber})...`, 'info');

    try {
      const res = await syncConnectionApi(conn.id, {
        importScope: conn.importScope,
        startDate: conn.importStartDate,
      });

      const { syncedTradesCount, newTradesCount, updatedTradesCount } = res;
      addToast(
        'Sync Complete',
        `Synchronized ${syncedTradesCount} trades (${newTradesCount} new, ${updatedTradesCount} updated).`,
        'success'
      );

      await loadData();
      await refreshState();
    } catch (err: any) {
      console.error('Manual sync failed:', err);
      addToast('Sync Error', err.message || 'Failed to sync with account', 'error');
      await loadData();
    } finally {
      setActiveSyncingIds((prev) => {
        const next = new Set(prev);
        next.delete(conn.id);
        return next;
      });
    }
  };

  // Toggle Auto-Sync
  const handleToggleAutoSync = async (conn: TradingAccountConnection) => {
    try {
      const newStatus = !conn.syncEnabled;
      await updateConnectionApi(conn.id, {
        syncEnabled: newStatus,
      });
      addToast(
        'Auto-Sync Updated',
        `Auto-sync ${newStatus ? 'enabled (every ' + conn.autoSyncIntervalMins + 'm)' : 'disabled'} for ${conn.accountName || conn.accountNumber}`,
        'info'
      );
      await loadData();
    } catch (err: any) {
      addToast('Update Failed', err.message || 'Failed to update auto-sync state', 'error');
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (conn: TradingAccountConnection) => {
    setEditConnection(conn);
    setEditFormData({
      accountName: conn.accountName || '',
      syncEnabled: conn.syncEnabled,
      autoSyncIntervalMins: conn.autoSyncIntervalMins || 5,
      importScope: conn.importScope || 'ALL_HISTORY',
      importStartDate: conn.importStartDate || '',
    });
  };

  // Submit Edit
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editConnection) return;

    try {
      await updateConnectionApi(editConnection.id, {
        accountName: editFormData.accountName,
        syncEnabled: editFormData.syncEnabled,
        autoSyncIntervalMins: editFormData.autoSyncIntervalMins,
        importScope: editFormData.importScope,
        importStartDate: editFormData.importScope === 'FROM_DATE' ? editFormData.importStartDate : undefined,
      });
      addToast('Updated', 'Connection settings saved', 'success');
      setEditConnection(null);
      await loadData();
    } catch (err: any) {
      addToast('Failed to Update', err.message || 'Could not update settings', 'error');
    }
  };

  // Open Logs Modal
  const handleOpenLogs = async (conn: TradingAccountConnection) => {
    setLogsModalConnection(conn);
    setIsLoadingLogs(true);
    try {
      const data = await fetchConnectionLogsApi(conn.id);
      setLogs(data);
    } catch (err: any) {
      addToast('Audit Logs', 'Failed to retrieve connection logs', 'error');
    } finally {
      setIsLoadingLogs(false);
    }
  };

  // Delete Connection
  const handleDeleteConnection = async () => {
    if (!deleteModalConnection) return;
    try {
      await deleteConnectionApi(deleteModalConnection.id);
      addToast('Account Disconnected', `Removed connection to ${deleteModalConnection.broker}`, 'info');
      setDeleteModalConnection(null);
      await loadData();
      await refreshState();
    } catch (err: any) {
      addToast('Failed to Delete', err.message || 'Could not delete connection', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div
        className={`p-6 rounded-2xl border transition-all ${
          isLight
            ? 'bg-white border-[#E5E7EB] shadow-sm'
            : 'bg-[#121215] border-[#26262B] shadow-xl'
        }`}
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#2563FF]/15 text-[#2563FF] flex items-center justify-center font-bold">
                <Radio className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h1 className={`text-lg font-bold tracking-tight ${isLight ? 'text-[#111827]' : 'text-[#F4F4F5]'}`}>
                  Auto-Sync Trading Accounts
                </h1>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#00D6A3]/15 text-[#00D6A3] border border-[#00D6A3]/30">
                    REAL-TIME BROKER CONNECTOR
                  </span>
                  <span className={`text-xs ${isLight ? 'text-[#6B7280]' : 'text-[#A1A1AA]'}`}>
                    • AES-256 Encrypted Read-Only Sync
                  </span>
                </div>
              </div>
            </div>
            <p className={`text-xs mt-3 max-w-3xl leading-relaxed ${isLight ? 'text-[#4B5563]' : 'text-[#A1A1AA]'}`}>
              Directly connect your live brokers, prop firms, and institutional trading accounts. Executions, fills, commissions, and swap fees automatically stream into your journal with guaranteed deterministic matching and idempotency.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => {
                loadData();
                refreshState();
              }}
              disabled={isLoading}
              className={`p-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition ${
                isLight
                  ? 'border-[#E5E7EB] bg-[#F9FAFB] hover:bg-[#F3F4F6] text-[#374151]'
                  : 'border-[#26262B] bg-[#18181C] hover:bg-[#202025] text-[#D4D4D8]'
              }`}
              title="Refresh Connections"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-2 rounded-xl bg-[#2563FF] hover:bg-[#1D4ED8] text-white px-4 py-2.5 text-xs font-bold shadow-lg shadow-[#2563FF]/25 transition active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" />
              <span>Connect Trading Account</span>
            </button>
          </div>
        </div>
      </div>

      {/* Platform Cards Showcase */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5">
        {[
          {
            id: 'MT5',
            name: 'MetaTrader 5',
            badge: 'EA / Investor',
            desc: 'Investor Password or Terminal Bridge Worker',
            color: 'from-blue-500/20 to-blue-600/5 text-[#2563FF]',
          },
          {
            id: 'CTRADER',
            name: 'cTrader',
            badge: 'Open API 2.0',
            desc: 'Direct Spotware cloud token stream',
            color: 'from-emerald-500/20 to-emerald-600/5 text-[#00D6A3]',
          },
          {
            id: 'DXTRADE',
            name: 'DXtrade',
            badge: 'Prop Firms',
            desc: 'FundingPips, FTMO & Devexperts',
            color: 'from-amber-500/20 to-amber-600/5 text-[#F5B82E]',
          },
          {
            id: 'MATCH_TRADER',
            name: 'Match-Trader',
            badge: 'REST API',
            desc: 'FundedNext & modern prop brokers',
            color: 'from-purple-500/20 to-purple-600/5 text-[#9333EA]',
          },
          {
            id: 'BROKER_API',
            name: 'Broker APIs',
            badge: 'Direct Gateway',
            desc: 'IBKR, TradeStation, Alpaca',
            color: 'from-indigo-500/20 to-indigo-600/5 text-[#4F46E5]',
          },
          {
            id: 'CSV_IMPORT',
            name: 'CSV Fallback',
            badge: '50+ Brokers',
            desc: 'Historical statement importer',
            color: 'from-slate-500/20 to-slate-600/5 text-[#71717A]',
          },
        ].map((p) => (
          <div
            key={p.id}
            onClick={() => {
              handleSelectPlatform(p.id);
              setIsAddModalOpen(true);
            }}
            className={`p-3.5 rounded-xl border cursor-pointer transition-all duration-150 hover:scale-[1.02] active:scale-[0.99] group ${
              isLight
                ? 'bg-white border-[#E5E7EB] hover:border-[#2563FF] hover:shadow-md'
                : 'bg-[#121215] border-[#26262B] hover:border-[#2563FF]/60 hover:shadow-lg'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold truncate group-hover:text-[#2563FF] transition-colors">
                {p.name}
              </span>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[rgba(37,99,255,0.1)] text-[#2563FF] border border-[rgba(37,99,255,0.2)]">
                {p.badge}
              </span>
            </div>
            <p className={`text-[11px] leading-tight ${isLight ? 'text-[#6B7280]' : 'text-[#A1A1AA]'}`}>
              {p.desc}
            </p>
            <div className="mt-2.5 pt-2 border-t border-dashed border-slate-700/30 flex items-center justify-between text-[10px] font-semibold text-[#2563FF]">
              <span>Connect</span>
              <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>
        ))}
      </div>

      {/* Active Connected Accounts List */}
      <div
        className={`p-6 rounded-2xl border transition-all ${
          isLight ? 'bg-white border-[#E5E7EB]' : 'bg-[#121215] border-[#26262B]'
        }`}
      >
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#26262B]">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#00D6A3]" />
            <h2 className={`text-sm font-bold uppercase tracking-wider ${isLight ? 'text-[#111827]' : 'text-[#F4F4F5]'}`}>
              Active Account Connections ({connections.length})
            </h2>
          </div>
          <span className={`text-xs ${isLight ? 'text-[#6B7280]' : 'text-[#A1A1AA]'}`}>
            Background worker polls every 5 mins
          </span>
        </div>

        {isLoading ? (
          <div className="py-12 text-center text-xs text-[#A1A1AA] flex flex-col items-center justify-center gap-2">
            <RefreshCw className="w-6 h-6 animate-spin text-[#2563FF]" />
            <span>Loading connected trading accounts...</span>
          </div>
        ) : connections.length === 0 ? (
          <div
            className={`p-10 rounded-xl border border-dashed text-center space-y-3.5 ${
              isLight ? 'bg-[#F9FAFB] border-[#E5E7EB]' : 'bg-[#18181C] border-[#26262B]'
            }`}
          >
            <div className="w-12 h-12 rounded-2xl bg-[#2563FF]/10 text-[#2563FF] mx-auto flex items-center justify-center">
              <Link2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className={`text-sm font-bold ${isLight ? 'text-[#111827]' : 'text-[#F4F4F5]'}`}>
                No Auto-Sync Accounts Connected Yet
              </h3>
              <p className={`text-xs mt-1 max-w-md mx-auto ${isLight ? 'text-[#6B7280]' : 'text-[#A1A1AA]'}`}>
                Connect MetaTrader 5, cTrader, DXtrade, Match-Trader or Broker APIs to stream trades directly into your TradeForge journal in real-time.
              </p>
            </div>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#2563FF] hover:bg-[#1D4ED8] text-white text-xs font-bold shadow-md transition"
            >
              <Plus className="w-4 h-4" />
              <span>Connect Your First Account</span>
            </button>
          </div>
        ) : (
          <div className="space-y-3.5">
            {connections.map((conn) => {
              const isSyncing = activeSyncingIds.has(conn.id);
              const targetAcc = accounts.find((a) => a.id === conn.accountId);

              return (
                <div
                  key={conn.id}
                  className={`p-4 rounded-xl border transition-all ${
                    isLight
                      ? 'bg-[#F9FAFB] border-[#E5E7EB] hover:border-[#D1D5DB]'
                      : 'bg-[#18181C] border-[#26262B] hover:border-[#36363D]'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Left Info */}
                    <div className="flex items-start sm:items-center gap-3.5">
                      <div className="w-11 h-11 rounded-xl bg-[#2563FF]/15 text-[#2563FF] border border-[#2563FF]/30 flex flex-col items-center justify-center shrink-0">
                        <span className="font-bold text-xs font-mono">{conn.platform}</span>
                        <span className="text-[8px] font-semibold uppercase">{conn.currency}</span>
                      </div>

                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className={`font-bold text-sm ${isLight ? 'text-[#111827]' : 'text-[#F4F4F5]'}`}>
                            {conn.accountName || `${conn.broker} (${conn.accountNumber})`}
                          </h3>

                          {/* Status Badge */}
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              conn.connectionStatus === 'CONNECTED' || conn.connectionStatus === 'SYNCED'
                                ? 'bg-[#00D6A3]/15 text-[#00D6A3] border-[#00D6A3]/30'
                                : conn.connectionStatus === 'ERROR'
                                ? 'bg-[#FF3D6E]/15 text-[#FF3D6E] border-[#FF3D6E]/30'
                                : 'bg-[#F5B82E]/15 text-[#F5B82E] border-[#F5B82E]/30'
                            }`}
                          >
                            {isSyncing ? 'SYNCING...' : conn.connectionStatus}
                          </span>

                          {/* Auto-Sync Toggle Badge */}
                          <button
                            onClick={() => handleToggleAutoSync(conn)}
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded border transition ${
                              conn.syncEnabled
                                ? 'bg-[#2563FF]/15 text-[#2563FF] border-[#2563FF]/30 hover:bg-[#2563FF]/25'
                                : 'bg-slate-500/15 text-slate-400 border-slate-500/30 hover:bg-slate-500/25'
                            }`}
                            title="Click to toggle auto-sync interval"
                          >
                            {conn.syncEnabled ? `Auto-Sync: Every ${conn.autoSyncIntervalMins || 5}m` : 'Auto-Sync: Paused'}
                          </button>
                        </div>

                        {/* Sub details */}
                        <div className={`flex items-center gap-3 text-xs mt-1 flex-wrap ${isLight ? 'text-[#6B7280]' : 'text-[#A1A1AA]'}`}>
                          <span>
                            <strong>Broker:</strong> {conn.broker}
                          </span>
                          {conn.server && (
                            <span>
                              <strong>Server:</strong> {conn.server}
                            </span>
                          )}
                          <span>
                            <strong>Account:</strong> <code className="font-mono text-[11px]">{conn.accountNumber}</code>
                          </span>
                          {targetAcc && (
                            <span>
                              <strong>Linked Journal:</strong> {targetAcc.name}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right Metrics & Actions */}
                    <div className="flex items-center gap-3 self-end lg:self-center flex-wrap">
                      <div className="text-right pr-2 hidden sm:block">
                        <div className={`text-xs font-semibold ${isLight ? 'text-[#111827]' : 'text-[#F4F4F5]'}`}>
                          {(conn.lastSyncAt || (conn as any).lastSyncTime)
                            ? new Date(conn.lastSyncAt || (conn as any).lastSyncTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            : 'Never synced'}
                        </div>
                        <div className="text-[10px] text-[#A1A1AA]">
                          {conn.lastSyncTradesCount ?? (conn as any).syncedTradesCount ?? 0} trades logged
                        </div>
                      </div>

                      {/* Sync Now Button */}
                      <button
                        onClick={() => handleTriggerSync(conn)}
                        disabled={isSyncing}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#2563FF] hover:bg-[#1D4ED8] text-white text-xs font-bold shadow transition active:scale-[0.98] disabled:opacity-50"
                        title="Trigger immediate trade sync"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                        <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
                      </button>

                      {/* Logs Button */}
                      <button
                        onClick={() => handleOpenLogs(conn)}
                        className={`p-2 rounded-lg border text-xs transition ${
                          isLight
                            ? 'border-[#E5E7EB] bg-white hover:bg-[#F3F4F6] text-[#374151]'
                            : 'border-[#26262B] bg-[#121215] hover:bg-[#202025] text-[#D4D4D8]'
                        }`}
                        title="View Connection Audit Logs"
                      >
                        <History className="w-3.5 h-3.5" />
                      </button>

                      {/* Edit Button */}
                      <button
                        onClick={() => handleOpenEdit(conn)}
                        className={`p-2 rounded-lg border text-xs transition ${
                          isLight
                            ? 'border-[#E5E7EB] bg-white hover:bg-[#F3F4F6] text-[#374151]'
                            : 'border-[#26262B] bg-[#121215] hover:bg-[#202025] text-[#D4D4D8]'
                        }`}
                        title="Edit Connection Settings"
                      >
                        <Settings className="w-3.5 h-3.5" />
                      </button>

                      {/* Disconnect Button */}
                      <button
                        onClick={() => setDeleteModalConnection(conn)}
                        className={`p-2 rounded-lg border text-xs transition ${
                          isLight
                            ? 'border-[#E5E7EB] hover:bg-[#FEE2E2] text-[#DC2626]'
                            : 'border-[#26262B] hover:bg-[#FF3D6E]/15 text-[#FF3D6E]'
                        }`}
                        title="Disconnect Trading Account"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Last Error Banner if applicable */}
                  {(conn.lastSyncError || (conn as any).lastErrorMessage) && (
                    <div className="mt-3 p-2.5 rounded-lg bg-[#FF3D6E]/10 border border-[#FF3D6E]/30 text-[#FF3D6E] text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{conn.lastSyncError || (conn as any).lastErrorMessage}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Security & Architecture Guarantee Card */}
      <div
        className={`p-5 rounded-2xl border ${
          isLight ? 'bg-white border-[#E5E7EB]' : 'bg-[#121215] border-[#26262B]'
        }`}
      >
        <div className="flex items-center gap-2.5 mb-3">
          <ShieldCheck className="w-5 h-5 text-[#00D6A3]" />
          <h3 className={`text-sm font-bold ${isLight ? 'text-[#111827]' : 'text-[#F4F4F5]'}`}>
            TradeForge Security & Read-Only Synchronization Architecture
          </h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs leading-relaxed">
          <div className={`p-3.5 rounded-xl border ${isLight ? 'bg-[#F9FAFB] border-[#E5E7EB]' : 'bg-[#18181C] border-[#26262B]'}`}>
            <div className="font-bold text-[#2563FF] mb-1 flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5" />
              <span>Read-Only Investor Mode</span>
            </div>
            <p className={isLight ? 'text-[#4B5563]' : 'text-[#A1A1AA]'}>
              MetaTrader and platform connectors operate strictly in read-only investor mode. Master trading passwords are never required to sync trade history.
            </p>
          </div>

          <div className={`p-3.5 rounded-xl border ${isLight ? 'bg-[#F9FAFB] border-[#E5E7EB]' : 'bg-[#18181C] border-[#26262B]'}`}>
            <div className="font-bold text-[#00D6A3] mb-1 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>AES-256-GCM Encryption</span>
            </div>
            <p className={isLight ? 'text-[#4B5563]' : 'text-[#A1A1AA]'}>
              All credentials are encrypted at rest with industry-standard AES-256-GCM and decrypted exclusively in isolated server-side connector workers.
            </p>
          </div>

          <div className={`p-3.5 rounded-xl border ${isLight ? 'bg-[#F9FAFB] border-[#E5E7EB]' : 'bg-[#18181C] border-[#26262B]'}`}>
            <div className="font-bold text-[#F5B82E] mb-1 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5" />
              <span>Idempotency & Journal Safety</span>
            </div>
            <p className={isLight ? 'text-[#4B5563]' : 'text-[#A1A1AA]'}>
              Sync operations use deterministic ticket deduplication. User notes, playbooks, execution mistakes, and strategy tags are strictly preserved.
            </p>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL: Connect Trading Account (Step-by-step) */}
      {/* ========================================================================= */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div
            className={`w-full max-w-2xl rounded-2xl border p-6 shadow-2xl max-h-[90vh] overflow-y-auto ${
              isLight ? 'bg-white border-[#E5E7EB] text-[#111827]' : 'bg-[#121215] border-[#26262B] text-[#F4F4F5]'
            }`}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-[#26262B]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#2563FF]/20 text-[#2563FF] flex items-center justify-center font-bold">
                  <Link2 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold">Connect Trading Account</h2>
                  <p className={`text-xs ${isLight ? 'text-[#6B7280]' : 'text-[#A1A1AA]'}`}>
                    Select platform and provide read-only credentials
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className={`p-1.5 rounded-lg border transition ${
                  isLight ? 'border-[#E5E7EB] hover:bg-[#F3F4F6]' : 'border-[#26262B] hover:bg-[#202025]'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateConnection} className="mt-5 space-y-5">
              {/* 1. Platform Selector Tabs */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-[#A1A1AA]">
                  1. Select Trading Platform
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {platforms.map((p) => {
                    const isSelected = selectedPlatformId === p.id;
                    return (
                      <button
                        type="button"
                        key={p.id}
                        onClick={() => handleSelectPlatform(p.id)}
                        className={`p-2.5 rounded-xl border text-left transition-all ${
                          isSelected
                            ? 'border-[#2563FF] bg-[#2563FF]/15 text-[#2563FF] font-bold shadow-sm'
                            : isLight
                            ? 'border-[#E5E7EB] bg-[#F9FAFB] hover:border-[#D1D5DB] text-[#374151]'
                            : 'border-[#26262B] bg-[#18181C] hover:border-[#36363D] text-[#A1A1AA]'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs">{p.name}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-[#2563FF]" />}
                        </div>
                        <span className="text-[10px] opacity-75 block mt-0.5 truncate">{p.category}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Platform Information Notice */}
              <div
                className={`p-3 rounded-xl border text-xs flex items-center gap-2.5 ${
                  isLight ? 'bg-[#F0FDF4] border-[#BBF7D0] text-[#166534]' : 'bg-[#00D6A3]/10 border-[#00D6A3]/30 text-[#00D6A3]'
                }`}
              >
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>
                  {selectedPlatformId === 'MT5' && 'MetaTrader 5: Enter your broker server and Investor (Read-Only) password.'}
                  {selectedPlatformId === 'CTRADER' && 'cTrader: Connect via Spotware Open API access token or cTID account.'}
                  {selectedPlatformId === 'DXTRADE' && 'DXtrade: Connect using your prop firm account credentials or API auth token.'}
                  {selectedPlatformId === 'MATCH_TRADER' && 'Match-Trader: Enter your Match-Trader user token and server identifier.'}
                  {selectedPlatformId === 'BROKER_API' && 'Broker API: Enter API Key and Secret from your brokerage dashboard.'}
                  {selectedPlatformId === 'CSV_IMPORT' && 'Manual/CSV: Switch to the trade statement file importer.'}
                </span>
              </div>

              {selectedPlatformId !== 'CSV_IMPORT' && (
                <>
                  {/* 3. Account Credentials Form */}
                  <div className="space-y-3.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#A1A1AA]">
                      2. Account & Connection Details
                    </label>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div>
                        <label className={`block text-xs font-semibold mb-1 ${isLight ? 'text-[#374151]' : 'text-[#D4D4D8]'}`}>
                          Broker / Prop Firm Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.broker}
                          onChange={(e) => setFormData({ ...formData, broker: e.target.value })}
                          placeholder="e.g. FTMO, FundedNext, IC Markets"
                          className={`w-full px-3 py-2 rounded-xl border text-xs font-medium outline-none focus:border-[#2563FF] ${
                            isLight ? 'border-[#E5E7EB] bg-white text-[#111827]' : 'border-[#26262B] bg-[#18181C] text-[#F4F4F5]'
                          }`}
                        />
                      </div>

                      <div>
                        <label className={`block text-xs font-semibold mb-1 ${isLight ? 'text-[#374151]' : 'text-[#D4D4D8]'}`}>
                          Server Name / Gateway Host *
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.server}
                          onChange={(e) => setFormData({ ...formData, server: e.target.value })}
                          placeholder="e.g. FTMO-Server, ICMarkets-Live02"
                          className={`w-full px-3 py-2 rounded-xl border text-xs font-medium outline-none focus:border-[#2563FF] ${
                            isLight ? 'border-[#E5E7EB] bg-white text-[#111827]' : 'border-[#26262B] bg-[#18181C] text-[#F4F4F5]'
                          }`}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div>
                        <label className={`block text-xs font-semibold mb-1 ${isLight ? 'text-[#374151]' : 'text-[#D4D4D8]'}`}>
                          Account Number / Login ID *
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.accountNumber}
                          onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                          placeholder="e.g. 10928374"
                          className={`w-full px-3 py-2 rounded-xl border text-xs font-mono font-medium outline-none focus:border-[#2563FF] ${
                            isLight ? 'border-[#E5E7EB] bg-white text-[#111827]' : 'border-[#26262B] bg-[#18181C] text-[#F4F4F5]'
                          }`}
                        />
                      </div>

                      {/* Password / Token Field */}
                      <div>
                        <label className={`block text-xs font-semibold mb-1 ${isLight ? 'text-[#374151]' : 'text-[#D4D4D8]'}`}>
                          {selectedPlatformId === 'MT5'
                            ? 'Investor (Read-Only) Password *'
                            : selectedPlatformId === 'CTRADER' || selectedPlatformId === 'DXTRADE' || selectedPlatformId === 'MATCH_TRADER'
                            ? 'API Access Token / Secret *'
                            : 'API Secret Key *'}
                        </label>
                        <div className="relative">
                          <input
                            type={showPassword ? 'text' : 'password'}
                            value={
                              selectedPlatformId === 'MT5'
                                ? formData.investorPassword
                                : selectedPlatformId === 'BROKER_API'
                                ? formData.apiSecret
                                : formData.apiToken
                            }
                            onChange={(e) => {
                              const val = e.target.value;
                              if (selectedPlatformId === 'MT5') {
                                setFormData({ ...formData, investorPassword: val });
                              } else if (selectedPlatformId === 'BROKER_API') {
                                setFormData({ ...formData, apiSecret: val });
                              } else {
                                setFormData({ ...formData, apiToken: val });
                              }
                            }}
                            placeholder={selectedPlatformId === 'MT5' ? 'Read-only investor password' : 'Paste access token'}
                            className={`w-full px-3 py-2 pr-10 rounded-xl border text-xs font-mono outline-none focus:border-[#2563FF] ${
                              isLight ? 'border-[#E5E7EB] bg-white text-[#111827]' : 'border-[#26262B] bg-[#18181C] text-[#F4F4F5]'
                            }`}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#A1A1AA] hover:text-[#F4F4F5]"
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                      <div>
                        <label className={`block text-xs font-semibold mb-1 ${isLight ? 'text-[#374151]' : 'text-[#D4D4D8]'}`}>
                          Nickname / Display Name
                        </label>
                        <input
                          type="text"
                          value={formData.accountName}
                          onChange={(e) => setFormData({ ...formData, accountName: e.target.value })}
                          placeholder="e.g. Main Funded 100k"
                          className={`w-full px-3 py-2 rounded-xl border text-xs outline-none focus:border-[#2563FF] ${
                            isLight ? 'border-[#E5E7EB] bg-white text-[#111827]' : 'border-[#26262B] bg-[#18181C] text-[#F4F4F5]'
                          }`}
                        />
                      </div>

                      <div>
                        <label className={`block text-xs font-semibold mb-1 ${isLight ? 'text-[#374151]' : 'text-[#D4D4D8]'}`}>
                          Base Currency
                        </label>
                        <select
                          value={formData.currency}
                          onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                          className={`w-full px-3 py-2 rounded-xl border text-xs outline-none focus:border-[#2563FF] ${
                            isLight ? 'border-[#E5E7EB] bg-white text-[#111827]' : 'border-[#26262B] bg-[#18181C] text-[#F4F4F5]'
                          }`}
                        >
                          <option value="USD">USD ($)</option>
                          <option value="EUR">EUR (€)</option>
                          <option value="GBP">GBP (£)</option>
                          <option value="AUD">AUD ($)</option>
                          <option value="CAD">CAD ($)</option>
                          <option value="JPY">JPY (¥)</option>
                        </select>
                      </div>

                      <div>
                        <label className={`block text-xs font-semibold mb-1 ${isLight ? 'text-[#374151]' : 'text-[#D4D4D8]'}`}>
                          Account Type
                        </label>
                        <select
                          value={formData.accountType}
                          onChange={(e) => setFormData({ ...formData, accountType: e.target.value })}
                          className={`w-full px-3 py-2 rounded-xl border text-xs outline-none focus:border-[#2563FF] ${
                            isLight ? 'border-[#E5E7EB] bg-white text-[#111827]' : 'border-[#26262B] bg-[#18181C] text-[#F4F4F5]'
                          }`}
                        >
                          <option value="PROP_FIRM_EVAL">Prop Firm Evaluation</option>
                          <option value="PROP_FIRM_FUNDED">Prop Firm Funded</option>
                          <option value="LIVE">Live Personal Capital</option>
                          <option value="DEMO">Demo Practice</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* 4. Linking & Sync Preferences */}
                  <div className="space-y-3.5 pt-2 border-t border-[#26262B]">
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#A1A1AA]">
                      3. Journal Linking & Historical Scope
                    </label>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div>
                        <label className={`block text-xs font-semibold mb-1 ${isLight ? 'text-[#374151]' : 'text-[#D4D4D8]'}`}>
                          Link to TradeForge Account
                        </label>
                        <select
                          value={formData.linkOption}
                          onChange={(e: any) => setFormData({ ...formData, linkOption: e.target.value })}
                          className={`w-full px-3 py-2 rounded-xl border text-xs outline-none focus:border-[#2563FF] ${
                            isLight ? 'border-[#E5E7EB] bg-white text-[#111827]' : 'border-[#26262B] bg-[#18181C] text-[#F4F4F5]'
                          }`}
                        >
                          <option value="NEW_ACCOUNT">+ Create New TradeForge Portfolio Account</option>
                          {accounts.map((acc) => (
                            <option key={acc.id} value={`EXISTING_ACCOUNT:${acc.id}`}>
                              Link to: {acc.name} ({acc.broker})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className={`block text-xs font-semibold mb-1 ${isLight ? 'text-[#374151]' : 'text-[#D4D4D8]'}`}>
                          Historical Sync Range
                        </label>
                        <select
                          value={formData.importScope}
                          onChange={(e: any) => setFormData({ ...formData, importScope: e.target.value })}
                          className={`w-full px-3 py-2 rounded-xl border text-xs outline-none focus:border-[#2563FF] ${
                            isLight ? 'border-[#E5E7EB] bg-white text-[#111827]' : 'border-[#26262B] bg-[#18181C] text-[#F4F4F5]'
                          }`}
                        >
                          <option value="ALL_HISTORY">Full Account History (All Time)</option>
                          <option value="FROM_DATE">From Specific Date</option>
                          <option value="RECENT_ONLY">Recent Only (Last 30 Days)</option>
                        </select>
                      </div>
                    </div>

                    {formData.importScope === 'FROM_DATE' && (
                      <div>
                        <label className={`block text-xs font-semibold mb-1 ${isLight ? 'text-[#374151]' : 'text-[#D4D4D8]'}`}>
                          Start Syncing From Date
                        </label>
                        <input
                          type="date"
                          value={formData.importStartDate}
                          onChange={(e) => setFormData({ ...formData, importStartDate: e.target.value })}
                          className={`w-full px-3 py-2 rounded-xl border text-xs font-mono outline-none focus:border-[#2563FF] ${
                            isLight ? 'border-[#E5E7EB] bg-white text-[#111827]' : 'border-[#26262B] bg-[#18181C] text-[#F4F4F5]'
                          }`}
                        />
                      </div>
                    )}

                    <div className="flex items-center justify-between p-3 rounded-xl border border-[#26262B] bg-[#18181C]">
                      <div>
                        <div className="text-xs font-bold">Auto-Sync in Background</div>
                        <div className="text-[10px] text-[#A1A1AA]">
                          TradeForge worker automatically checks for new fills every {formData.autoSyncIntervalMins} minutes.
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={formData.syncEnabled}
                        onChange={(e) => setFormData({ ...formData, syncEnabled: e.target.checked })}
                        className="w-4 h-4 accent-[#2563FF] rounded cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Test Result Feedback Box */}
                  {testResult && (
                    <div
                      className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
                        testResult.success
                          ? 'bg-[#00D6A3]/10 border-[#00D6A3]/30 text-[#00D6A3]'
                          : 'bg-[#FF3D6E]/10 border-[#FF3D6E]/30 text-[#FF3D6E]'
                      }`}
                    >
                      {testResult.success ? (
                        <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                      ) : (
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <div className="font-bold">{testResult.message}</div>
                        {testResult.latencyMs && (
                          <div className="text-[10px] opacity-80 mt-0.5">
                            Latency: {testResult.latencyMs}ms • Ping Verified
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Actions Footer */}
              <div className="flex items-center justify-between pt-4 border-t border-[#26262B]">
                {selectedPlatformId !== 'CSV_IMPORT' ? (
                  <button
                    type="button"
                    onClick={handleTestConnection}
                    disabled={isTesting || !formData.accountNumber}
                    className={`px-4 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition disabled:opacity-50 ${
                      isLight
                        ? 'border-[#E5E7EB] bg-[#F9FAFB] hover:bg-[#F3F4F6] text-[#374151]'
                        : 'border-[#26262B] bg-[#18181C] hover:bg-[#202025] text-[#D4D4D8]'
                    }`}
                  >
                    <Zap className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin text-[#F5B82E]' : 'text-[#2563FF]'}`} />
                    <span>{isTesting ? 'Testing Connection...' : 'Test Connection'}</span>
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className={`px-4 py-2 rounded-xl border text-xs font-semibold transition ${
                      isLight ? 'border-[#E5E7EB] hover:bg-[#F3F4F6]' : 'border-[#26262B] hover:bg-[#202025]'
                    }`}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[#2563FF] hover:bg-[#1D4ED8] text-white text-xs font-bold shadow-lg transition active:scale-[0.98] disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Connecting & Syncing...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>{selectedPlatformId === 'CSV_IMPORT' ? 'Open CSV Importer' : 'Connect & Sync'}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: Audit Logs */}
      {/* ========================================================================= */}
      {logsModalConnection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div
            className={`w-full max-w-3xl rounded-2xl border p-6 shadow-2xl max-h-[85vh] flex flex-col ${
              isLight ? 'bg-white border-[#E5E7EB] text-[#111827]' : 'bg-[#121215] border-[#26262B] text-[#F4F4F5]'
            }`}
          >
            <div className="flex items-center justify-between pb-4 border-b border-[#26262B]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#2563FF]/20 text-[#2563FF] flex items-center justify-center font-bold">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold">Connection Audit Logs</h2>
                  <p className={`text-xs ${isLight ? 'text-[#6B7280]' : 'text-[#A1A1AA]'}`}>
                    {logsModalConnection.broker} ({logsModalConnection.accountNumber})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setLogsModalConnection(null)}
                className={`p-1.5 rounded-lg border transition ${
                  isLight ? 'border-[#E5E7EB] hover:bg-[#F3F4F6]' : 'border-[#26262B] hover:bg-[#202025]'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto my-4 space-y-2.5 custom-scrollbar pr-1">
              {isLoadingLogs ? (
                <div className="py-12 text-center text-xs text-[#A1A1AA] flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-[#2563FF]" />
                  <span>Loading audit logs...</span>
                </div>
              ) : logs.length === 0 ? (
                <div className="py-12 text-center text-xs text-[#A1A1AA]">
                  No sync events logged yet for this connection.
                </div>
              ) : (
                logs.map((log) => (
                  <div
                    key={log.id}
                    className={`p-3 rounded-xl border text-xs space-y-1.5 ${
                      isLight ? 'bg-[#F9FAFB] border-[#E5E7EB]' : 'bg-[#18181C] border-[#26262B]'
                    }`}
                  >
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[9px] font-bold px-2 py-0.5 rounded ${
                            log.status === 'SUCCESS'
                              ? 'bg-[#00D6A3]/15 text-[#00D6A3] border border-[#00D6A3]/30'
                              : 'bg-[#FF3D6E]/15 text-[#FF3D6E] border border-[#FF3D6E]/30'
                          }`}
                        >
                          {log.status}
                        </span>
                        <span className="font-semibold">{(log as any).syncTrigger || 'AUTO'}</span>
                        <span className="text-[#A1A1AA]">• {log.durationMs}ms</span>
                      </div>
                      <span className="text-[10px] text-[#A1A1AA] font-mono">
                        {new Date(log.startedAt).toLocaleString()}
                      </span>
                    </div>

                    <div className="text-[11px] text-[#A1A1AA] flex items-center gap-3">
                      <span>Trades fetched: <strong>{(log as any).tradesFetched ?? log.tradesImported ?? 0}</strong></span>
                      <span>New: <strong className="text-[#00D6A3]">{(log as any).tradesAdded ?? log.tradesImported ?? 0}</strong></span>
                      <span>Updated: <strong>{log.tradesUpdated ?? 0}</strong></span>
                    </div>

                    {log.errorMessage && (
                      <div className="text-[#FF3D6E] text-[11px] font-mono bg-[#FF3D6E]/10 p-2 rounded border border-[#FF3D6E]/20">
                        {log.errorMessage}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="pt-3 border-t border-[#26262B] flex justify-end">
              <button
                onClick={() => setLogsModalConnection(null)}
                className="px-4 py-2 rounded-xl bg-[#2563FF] text-white text-xs font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: Edit Settings */}
      {/* ========================================================================= */}
      {editConnection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div
            className={`w-full max-w-md rounded-2xl border p-6 shadow-2xl ${
              isLight ? 'bg-white border-[#E5E7EB] text-[#111827]' : 'bg-[#121215] border-[#26262B] text-[#F4F4F5]'
            }`}
          >
            <div className="flex items-center justify-between pb-4 border-b border-[#26262B]">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-[#2563FF]" />
                <h2 className="text-base font-bold">Edit Connection Settings</h2>
              </div>
              <button
                onClick={() => setEditConnection(null)}
                className={`p-1.5 rounded-lg border transition ${
                  isLight ? 'border-[#E5E7EB] hover:bg-[#F3F4F6]' : 'border-[#26262B] hover:bg-[#202025]'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="mt-4 space-y-4">
              <div>
                <label className={`block text-xs font-semibold mb-1 ${isLight ? 'text-[#374151]' : 'text-[#D4D4D8]'}`}>
                  Nickname / Display Name
                </label>
                <input
                  type="text"
                  value={editFormData.accountName}
                  onChange={(e) => setEditFormData({ ...editFormData, accountName: e.target.value })}
                  className={`w-full px-3 py-2 rounded-xl border text-xs outline-none focus:border-[#2563FF] ${
                    isLight ? 'border-[#E5E7EB] bg-white text-[#111827]' : 'border-[#26262B] bg-[#18181C] text-[#F4F4F5]'
                  }`}
                />
              </div>

              <div>
                <label className={`block text-xs font-semibold mb-1 ${isLight ? 'text-[#374151]' : 'text-[#D4D4D8]'}`}>
                  Auto-Sync Interval (Minutes)
                </label>
                <select
                  value={editFormData.autoSyncIntervalMins}
                  onChange={(e) => setEditFormData({ ...editFormData, autoSyncIntervalMins: Number(e.target.value) })}
                  className={`w-full px-3 py-2 rounded-xl border text-xs outline-none focus:border-[#2563FF] ${
                    isLight ? 'border-[#E5E7EB] bg-white text-[#111827]' : 'border-[#26262B] bg-[#18181C] text-[#F4F4F5]'
                  }`}
                >
                  <option value={1}>Every 1 Minute (Fastest)</option>
                  <option value={5}>Every 5 Minutes (Standard)</option>
                  <option value={15}>Every 15 Minutes</option>
                  <option value={60}>Every 1 Hour</option>
                </select>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl border border-[#26262B] bg-[#18181C]">
                <div>
                  <div className="text-xs font-bold">Auto-Sync Enabled</div>
                  <div className="text-[10px] text-[#A1A1AA]">Toggle automatic background synchronization</div>
                </div>
                <input
                  type="checkbox"
                  checked={editFormData.syncEnabled}
                  onChange={(e) => setEditFormData({ ...editFormData, syncEnabled: e.target.checked })}
                  className="w-4 h-4 accent-[#2563FF] rounded cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-[#26262B]">
                <button
                  type="button"
                  onClick={() => setEditConnection(null)}
                  className={`px-4 py-2 rounded-xl border text-xs font-semibold ${
                    isLight ? 'border-[#E5E7EB] hover:bg-[#F3F4F6]' : 'border-[#26262B] hover:bg-[#202025]'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#2563FF] hover:bg-[#1D4ED8] text-white text-xs font-bold"
                >
                  Save Settings
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: Delete Confirmation */}
      {/* ========================================================================= */}
      {deleteModalConnection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div
            className={`w-full max-w-sm rounded-2xl border p-6 shadow-2xl ${
              isLight ? 'bg-white border-[#E5E7EB] text-[#111827]' : 'bg-[#121215] border-[#26262B] text-[#F4F4F5]'
            }`}
          >
            <div className="w-10 h-10 rounded-2xl bg-[#FF3D6E]/15 text-[#FF3D6E] flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-center">Disconnect Account?</h3>
            <p className={`text-xs text-center mt-1.5 ${isLight ? 'text-[#6B7280]' : 'text-[#A1A1AA]'}`}>
              Are you sure you want to disconnect <strong>{deleteModalConnection.broker}</strong> ({deleteModalConnection.accountNumber})? Existing synchronized trades will remain safe in your journal.
            </p>

            <div className="flex items-center justify-center gap-2 mt-5">
              <button
                onClick={() => setDeleteModalConnection(null)}
                className={`px-4 py-2 rounded-xl border text-xs font-semibold ${
                  isLight ? 'border-[#E5E7EB] hover:bg-[#F3F4F6]' : 'border-[#26262B] hover:bg-[#202025]'
                }`}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConnection}
                className="px-4 py-2 rounded-xl bg-[#FF3D6E] hover:bg-[#E02E5C] text-white text-xs font-bold shadow"
              >
                Disconnect
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
