import React, { useState } from 'react';
import {
  X,
  Link2,
  Server,
  Key,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Building2,
  Lock,
  ArrowRight
} from 'lucide-react';
import { useTrading } from '../../context/TradingContext';
import {
  createConnectionApi,
  testConnectionApi,
  syncConnectionApi,
} from '../../services/apiClient';

interface TradeConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TradeConnectModal: React.FC<TradeConnectModalProps> = ({ isOpen, onClose }) => {
  const { accounts, refreshState, addToast } = useTrading();

  const [platform, setPlatform] = useState<'MT5' | 'MT4'>('MT5');
  const [broker, setBroker] = useState('FTMO MetaTrader');
  const [server, setServer] = useState('FTMO-Server');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [investorPassword, setInvestorPassword] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [syncScope, setSyncScope] = useState<'ALL_HISTORY' | 'RECENT_ONLY'>('ALL_HISTORY');
  const [linkAccountId, setLinkAccountId] = useState(accounts[0]?.id || '');

  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; latencyMs?: number } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    if (!accountNumber || !investorPassword) {
      addToast('Missing Details', 'Please provide Account Number and Investor Password', 'warning');
      return;
    }
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await testConnectionApi(platform, {
        broker,
        server,
        accountNumber,
        investorPassword,
      });
      setTestResult({
        success: res.success,
        message: res.message || (res.success ? 'Broker handshake verified' : 'Connection failed'),
        latencyMs: res.latencyMs || 24,
      });
      if (res.success) {
        addToast('Connection Verified', 'Terminal bridge handshake successful', 'success');
      } else {
        addToast('Connection Failed', res.message || 'Check broker credentials', 'error');
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Could not contact terminal bridge',
      });
      addToast('Error', err.message || 'Test failed', 'error');
    } finally {
      setIsTesting(false);
    }
  };

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountNumber) {
      addToast('Validation Error', 'Account number is required', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await createConnectionApi({
        platform,
        broker,
        server,
        accountNumber,
        accountName: accountName || `${broker} (${accountNumber})`,
        currency,
        accountType: 'PROP_FIRM',
        credentials: {
          investorPassword,
        },
        syncEnabled: true,
        autoSyncIntervalMins: 5,
        importScope: syncScope === 'ALL_HISTORY' ? 'ALL' : 'DATE',
        linkToExistingAccountId: linkAccountId,
      });

      if (created) {
        addToast('Bridge Connected', `${platform} account bridge established`, 'success');
        // Trigger initial sync
        try {
          await syncConnectionApi(created.id);
        } catch {
          // background sync
        }
        await refreshState();
        onClose();
      }
    } catch (err: any) {
      addToast('Connection Failed', err.message || 'Could not establish connection', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="w-full max-w-lg bg-[#0B0B0B] border border-white/[0.10] rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.08] bg-[#0E0E0E]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
              <Link2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#F5F5F5] tracking-tight">Connect MT4 / MT5 Bridge</h2>
              <p className="text-[11px] text-[#A1A1AA]">Real-time execution ingestion & historical sync</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-[#71717A] hover:text-[#F5F5F5] hover:bg-white/[0.06] transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleConnect} className="p-5 overflow-y-auto space-y-4 custom-scrollbar text-xs">
          {/* Platform Toggle */}
          <div>
            <label className="block text-[11px] font-semibold text-[#A1A1AA] uppercase tracking-wider mb-1.5">
              Trading Platform
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(['MT5', 'MT4'] as const).map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPlatform(p)}
                  className={`py-2 px-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-2 transition ${
                    platform === p
                      ? 'bg-blue-600/15 border-blue-500 text-white shadow-[0_0_10px_rgba(37,99,235,0.2)]'
                      : 'bg-[#121212] border-white/[0.08] text-[#A1A1AA] hover:text-white hover:border-white/[0.15]'
                  }`}
                >
                  <Server className="w-3.5 h-3.5" />
                  <span>MetaTrader {p === 'MT5' ? '5 (MT5)' : '4 (MT4)'}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Broker & Server */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-[#A1A1AA] mb-1">
                Broker / Prop Firm
              </label>
              <input
                type="text"
                value={broker}
                onChange={e => setBroker(e.target.value)}
                placeholder="e.g. FTMO, Topstep, IC Markets"
                required
                className="w-full bg-[#121212] border border-white/[0.08] focus:border-blue-500 focus:outline-none rounded-lg px-3 py-2 text-xs text-[#F5F5F5] placeholder-[#71717A] transition"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-[#A1A1AA] mb-1">
                Server Name
              </label>
              <input
                type="text"
                value={server}
                onChange={e => setServer(e.target.value)}
                placeholder="e.g. FTMO-Live, ICMarketsSC-Demo"
                required
                className="w-full bg-[#121212] border border-white/[0.08] focus:border-blue-500 focus:outline-none rounded-lg px-3 py-2 text-xs text-[#F5F5F5] placeholder-[#71717A] transition"
              />
            </div>
          </div>

          {/* Account Number & Investor Password */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-[#A1A1AA] mb-1">
                Account Login / Number
              </label>
              <input
                type="text"
                value={accountNumber}
                onChange={e => setAccountNumber(e.target.value)}
                placeholder="e.g. 5928172"
                required
                className="w-full bg-[#121212] border border-white/[0.08] focus:border-blue-500 focus:outline-none rounded-lg px-3 py-2 text-xs text-[#F5F5F5] font-mono placeholder-[#71717A] transition"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-[#A1A1AA] mb-1">
                Investor (Read-Only) Password
              </label>
              <input
                type="password"
                value={investorPassword}
                onChange={e => setInvestorPassword(e.target.value)}
                placeholder="Read-only password"
                required
                className="w-full bg-[#121212] border border-white/[0.08] focus:border-blue-500 focus:outline-none rounded-lg px-3 py-2 text-xs text-[#F5F5F5] font-mono placeholder-[#71717A] transition"
              />
            </div>
          </div>

          {/* Security Notice */}
          <div className="p-2.5 rounded-lg bg-[#0F0F0F] border border-white/[0.06] flex items-start gap-2.5 text-[11px] text-[#A1A1AA]">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-white">Institutional Read-Only Security:</span> TradeForge only requests your Investor Password. No order placement or withdrawal permissions are ever requested.
            </div>
          </div>

          {/* Link to Portfolio Account */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-[#A1A1AA] mb-1">
                Map To TradeForge Account
              </label>
              <select
                value={linkAccountId}
                onChange={e => setLinkAccountId(e.target.value)}
                className="w-full bg-[#121212] border border-white/[0.08] focus:border-blue-500 focus:outline-none rounded-lg px-3 py-2 text-xs text-[#F5F5F5] transition"
              >
                {accounts.map(acc => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({acc.currency} {acc.type})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-medium text-[#A1A1AA] mb-1">
                Historical Sync Scope
              </label>
              <select
                value={syncScope}
                onChange={e => setSyncScope(e.target.value as any)}
                className="w-full bg-[#121212] border border-white/[0.08] focus:border-blue-500 focus:outline-none rounded-lg px-3 py-2 text-xs text-[#F5F5F5] transition"
              >
                <option value="ALL_HISTORY">Full Trade History (All time)</option>
                <option value="RECENT_ONLY">Recent 90 Days</option>
              </select>
            </div>
          </div>

          {/* Test connection result badge */}
          {testResult && (
            <div
              className={`p-2.5 rounded-lg border text-xs flex items-center justify-between ${
                testResult.success
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              }`}
            >
              <div className="flex items-center gap-2">
                {testResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                )}
                <span>{testResult.message}</span>
              </div>
              {testResult.latencyMs && (
                <span className="font-mono text-[10px] text-emerald-400/80">
                  {testResult.latencyMs}ms
                </span>
              )}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center justify-between pt-3 border-t border-white/[0.08]">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={isTesting}
              className="px-3.5 py-1.5 rounded-lg border border-white/[0.12] bg-[#121212] hover:bg-white/[0.06] text-[#A1A1AA] hover:text-white font-medium text-xs transition flex items-center gap-1.5"
            >
              {isTesting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Lock className="w-3.5 h-3.5" />}
              <span>{isTesting ? 'Testing...' : 'Test Connection'}</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 rounded-lg border border-transparent text-[#A1A1AA] hover:text-white transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition shadow-[0_0_12px_rgba(37,99,235,0.3)] flex items-center gap-1.5"
              >
                {isSubmitting ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <ArrowRight className="w-3.5 h-3.5" />
                )}
                <span>{isSubmitting ? 'Connecting...' : 'Connect Bridge'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
