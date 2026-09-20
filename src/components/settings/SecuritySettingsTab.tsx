import React, { useState } from 'react';
import {
  Shield,
  Key,
  Smartphone,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertTriangle,
  Copy,
  RefreshCw,
  LogOut,
  Laptop,
  Smartphone as PhoneIcon,
  Clock,
  Save,
  Check
} from 'lucide-react';
import { useTrading } from '../../context/TradingContext';

interface ActiveSession {
  id: string;
  device: string;
  browser: string;
  ip: string;
  location: string;
  lastActive: string;
  isCurrent: boolean;
}

export const SecuritySettingsTab: React.FC = () => {
  const { addToast, addActivityLog, userProfile, theme } = useTrading();
  const isLight = theme === 'light';

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  // 2FA state
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(true);
  const [isSettingUp2FA, setIsSettingUp2FA] = useState(false);

  // API Token state
  const [apiKey, setApiKey] = useState('tf_live_9a87f4c3d2e1b0a9f8e7d6c5b4a3');
  const [webhookSecret, setWebhookSecret] = useState('whsec_8392f01928374a1029384b');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Auto-lock state
  const [sessionTimeout, setSessionTimeout] = useState<'15m' | '30m' | '1h' | '4h' | 'never'>('30m');

  // Active Sessions
  const [sessions, setSessions] = useState<ActiveSession[]>([
    {
      id: 'sess-1',
      device: 'MacBook Pro 16" (macOS Sonoma)',
      browser: 'Chrome 128.0.0',
      ip: '192.168.1.104',
      location: 'Chicago, USA',
      lastActive: 'Active Now (Current Session)',
      isCurrent: true,
    },
    {
      id: 'sess-2',
      device: 'iPhone 15 Pro (iOS 17.5)',
      browser: 'Safari Mobile',
      ip: '172.56.42.19',
      location: 'New York, USA',
      lastActive: '3 hours ago',
      isCurrent: false,
    },
    {
      id: 'sess-3',
      device: 'Trading Desk PC (Windows 11)',
      browser: 'Brave Browser',
      ip: '24.120.98.50',
      location: 'Dallas, USA',
      lastActive: 'Yesterday at 16:45',
      isCurrent: false,
    },
  ]);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) {
      addToast('Current Password Required', 'Please provide your current security password.', 'error');
      return;
    }
    if (newPassword.length < 8) {
      addToast('Password Too Short', 'New password must be at least 8 characters with numbers and symbols.', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      addToast('Passwords Do Not Match', 'The confirmation password does not match.', 'error');
      return;
    }

    setIsUpdatingPassword(true);
    setTimeout(async () => {
      setIsUpdatingPassword(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      await addActivityLog({
        action: 'UPDATE_PASSWORD',
        category: 'SECURITY',
        object: 'Master Security Password',
        status: 'SUCCESS',
        details: { method: 'credential_update' },
      });
      addToast('Security Password Updated', 'Your master account password has been updated securely.', 'success');
    }, 600);
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(label);
    addToast('Copied to Clipboard', `${label} copied to system clipboard.`, 'info');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleRevokeSession = (sessionId: string) => {
    setSessions(prev => prev.filter(s => s.id !== sessionId));
    addToast('Session Terminated', 'Remote terminal session revoked successfully.', 'info');
  };

  const handleRevokeOtherSessions = () => {
    setSessions(prev => prev.filter(s => s.isCurrent));
    addToast('All Other Sessions Terminated', 'Logged out of all other devices.', 'success');
  };

  const handleRegenerateApiKey = () => {
    const newKey = `tf_live_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
    setApiKey(newKey);
    addToast('API Key Regenerated', 'Old credentials invalidated. Remember to update your trading bridge.', 'info');
  };

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#1C232E]">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Shield className="w-4 h-4 text-indigo-400" />
            Security & Authentication Center
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Manage multi-factor verification, API bridge tokens, session locks, and terminal credentials.
          </p>
        </div>
      </div>

      {/* Two-Factor Authentication Card */}
      <div className="p-5 rounded-2xl bg-[#12161D] border border-[#1C232E] space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-100 flex items-center gap-2">
                <span>Two-Factor Authentication (2FA)</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  twoFactorEnabled
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                    : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                }`}>
                  {twoFactorEnabled ? 'ENFORCED' : 'DISABLED'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Protects your trading journal and live prop account configurations via Google Authenticator or hardware YubiKey.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              const next = !twoFactorEnabled;
              setTwoFactorEnabled(next);
              addToast(
                next ? '2FA Enforced' : '2FA Deactivated',
                next ? 'Hardware token requirement enabled' : 'Two-factor requirement turned off',
                next ? 'success' : 'warning'
              );
            }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer border ${
              twoFactorEnabled
                ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border-rose-500/30'
                : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
            }`}
          >
            {twoFactorEnabled ? 'Deactivate 2FA' : 'Enable 2FA'}
          </button>
        </div>
      </div>

      {/* Change Password Card */}
      <form onSubmit={handleUpdatePassword} className="p-5 rounded-2xl bg-[#12161D] border border-[#1C232E] space-y-4">
        <div className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
          <Lock className="w-4 h-4 text-indigo-400" />
          Update Master Password
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div>
            <label className="block text-slate-400 font-semibold mb-1.5">Current Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-[#0A0D14] border border-[#1C232E] rounded-xl px-3 py-2 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-400 font-semibold mb-1.5">New Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="Min 8 chars, 1 number"
                className="w-full bg-[#0A0D14] border border-[#1C232E] rounded-xl px-3 py-2 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-400 font-semibold mb-1.5">Confirm New Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Repeat password"
                className="w-full bg-[#0A0D14] border border-[#1C232E] rounded-xl px-3 py-2 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-[#1C232E]/60">
          <button
            type="button"
            onClick={() => setShowPassword(prev => !prev)}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 cursor-pointer"
          >
            {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            <span>{showPassword ? 'Hide Passwords' : 'Show Passwords'}</span>
          </button>

          <button
            type="submit"
            disabled={isUpdatingPassword || !newPassword}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#1A1F27] hover:bg-[#232B36] text-slate-200 border border-[#1C232E] transition disabled:opacity-50 cursor-pointer"
          >
            {isUpdatingPassword ? 'Updating...' : 'Update Password'}
          </button>
        </div>
      </form>

      {/* Institutional API Keys & Bridges */}
      <div className="p-5 rounded-2xl bg-[#12161D] border border-[#1C232E] space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
            <Key className="w-4 h-4 text-indigo-400" />
            Terminal API Bridge & Webhook Credentials
          </div>
          <button
            type="button"
            onClick={handleRegenerateApiKey}
            className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 font-medium cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" />
            Regenerate Keys
          </button>
        </div>

        <div className="space-y-3 text-xs">
          <div>
            <label className="block text-slate-400 font-semibold mb-1">Read-Only Trade Journal API Token</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={apiKey}
                className="flex-1 bg-[#0A0D14] border border-[#1C232E] rounded-xl px-3 py-2 text-slate-200 font-mono text-xs select-all"
              />
              <button
                type="button"
                onClick={() => handleCopy(apiKey, 'API Token')}
                className="p-2 rounded-xl bg-[#1A1F27] hover:bg-[#232B36] text-slate-300 border border-[#1C232E] cursor-pointer"
                title="Copy API Key"
              >
                {copiedKey === 'API Token' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-slate-400 font-semibold mb-1">TradingView / Webhook Execution Secret</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={webhookSecret}
                className="flex-1 bg-[#0A0D14] border border-[#1C232E] rounded-xl px-3 py-2 text-slate-200 font-mono text-xs select-all"
              />
              <button
                type="button"
                onClick={() => handleCopy(webhookSecret, 'Webhook Secret')}
                className="p-2 rounded-xl bg-[#1A1F27] hover:bg-[#232B36] text-slate-300 border border-[#1C232E] cursor-pointer"
                title="Copy Webhook Secret"
              >
                {copiedKey === 'Webhook Secret' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Active Login Sessions */}
      <div className="p-5 rounded-2xl bg-[#12161D] border border-[#1C232E] space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-400" />
            Active Terminal Sessions ({sessions.length})
          </div>
          {sessions.length > 1 && (
            <button
              type="button"
              onClick={handleRevokeOtherSessions}
              className="text-xs text-rose-400 hover:text-rose-300 font-semibold cursor-pointer"
            >
              Revoke All Other Devices
            </button>
          )}
        </div>

        <div className="space-y-2.5">
          {sessions.map(sess => (
            <div
              key={sess.id}
              className={`p-3 rounded-xl border flex items-center justify-between text-xs transition ${
                sess.isCurrent
                  ? 'bg-indigo-500/10 border-indigo-500/30'
                  : 'bg-[#0A0D14] border-[#1C232E]'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-[#1A1F27] text-slate-300 border border-[#1C232E]">
                  {sess.device.includes('iPhone') ? <PhoneIcon className="w-4 h-4" /> : <Laptop className="w-4 h-4" />}
                </div>
                <div>
                  <div className="font-bold text-slate-100 flex items-center gap-2">
                    <span>{sess.device}</span>
                    {sess.isCurrent && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-500 text-white font-mono font-bold">
                        THIS DEVICE
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                    {sess.browser} • {sess.ip}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-[11px] text-slate-400">{sess.lastActive}</span>
                {!sess.isCurrent && (
                  <button
                    type="button"
                    onClick={() => handleRevokeSession(sess.id)}
                    className="p-1.5 rounded-lg bg-[#1A1F27] hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-[#1C232E] transition cursor-pointer"
                    title="Terminate this session"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
