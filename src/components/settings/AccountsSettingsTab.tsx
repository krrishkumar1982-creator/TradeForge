import React, { useState } from 'react';
import {
  Building2,
  Plus,
  Trash2,
  CheckCircle2,
  DollarSign,
  Layers,
  ArrowRight,
  TrendingUp,
  X,
  ExternalLink,
  ShieldCheck
} from 'lucide-react';
import { useTrading } from '../../context/TradingContext';
import { TradingAccount } from '../../types';

export const AccountsSettingsTab: React.FC = () => {
  const {
    accounts,
    addAccount,
    deleteAccount,
    selectedAccountId,
    setSelectedAccountId,
    formatCurrency,
    addToast,
    addActivityLog,
    userProfile,
    theme,
  } = useTrading();

  const isLight = theme === 'light';

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [name, setName] = useState('');
  const [broker, setBroker] = useState('Tradovate');
  const [accountType, setAccountType] = useState<'LIVE' | 'DEMO' | 'PROP_FIRM'>('LIVE');
  const [balance, setBalance] = useState('50000');
  const [currency, setCurrency] = useState('USD');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      const initialBal = parseFloat(balance) || 0;
      await addAccount({
        name: name.trim(),
        broker: broker.trim(),
        type: accountType,
        initialBalance: initialBal,
        currentBalance: initialBal,
        currency,
        isDefault: false,
        syncStatus: 'HEALTHY',
      });

      await addActivityLog({
        action: 'CREATE_ACCOUNT',
        category: 'ACCOUNT',
        object: name,
        status: 'INFO',
        details: { broker, initialBalance: initialBal },
      });

      addToast('Account Registered', `Account "${name}" added to TradeForge.`, 'success');
      setName('');
      setBalance('50000');
      setIsAddOpen(false);
    } catch (err: any) {
      addToast('Error', err.message || 'Could not register account', 'error');
    }
  };

  const handleDelete = async (id: string, accName: string) => {
    if (!window.confirm(`Delete trading account "${accName}"? Existing trade executions associated with this account may become unassigned.`)) return;
    try {
      await deleteAccount(id);
      addToast('Account Deleted', `Account "${accName}" removed.`, 'info');
    } catch (err: any) {
      addToast('Delete Error', err.message || 'Could not remove account', 'error');
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#1C232E]">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Building2 className="w-4 h-4 text-indigo-400" />
            Trading Accounts & Portfolios
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Manage live trading balances, prop firm challenge sizes, and connected broker accounts.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsAddOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white shadow-md shadow-indigo-600/25 border border-indigo-400/30 transition cursor-pointer active:scale-95"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Account</span>
        </button>
      </div>

      {/* Account Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {accounts.map(acc => {
          const isSelected = selectedAccountId === acc.id;
          return (
            <div
              key={acc.id}
              className={`p-5 rounded-2xl border transition space-y-4 ${
                isSelected
                  ? 'bg-indigo-500/10 border-indigo-500/40 shadow-sm'
                  : 'bg-[#12161D] border-[#1C232E] hover:border-slate-600'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-bold text-sm text-slate-100 flex items-center gap-2">
                    <span>{acc.name}</span>
                    {isSelected && (
                      <span className="text-[9px] font-bold font-mono px-1.5 py-0.2 rounded bg-indigo-500 text-white">
                        ACTIVE DESK
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {acc.broker || 'Independent Broker'} • <span className="text-indigo-400 font-medium">{acc.type}</span>
                  </div>
                </div>

                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  ONLINE
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-[#0A0D14] border border-[#1C232E] text-xs">
                <div>
                  <div className="text-[10px] text-slate-500 uppercase font-mono">Current Balance</div>
                  <div className="text-sm font-mono font-bold text-white mt-0.5">
                    {formatCurrency(acc.currentBalance)}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500 uppercase font-mono">Initial Size</div>
                  <div className="text-sm font-mono font-medium text-slate-300 mt-0.5">
                    {formatCurrency(acc.initialBalance)}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedAccountId(acc.id);
                    addToast('Account Switched', `Active desk set to ${acc.name}`, 'info');
                  }}
                  className={`px-3 py-1.5 rounded-xl font-semibold transition cursor-pointer border ${
                    isSelected
                      ? 'bg-indigo-600 text-white border-indigo-500 shadow-xs'
                      : 'bg-[#0A0D14] text-slate-300 border-[#1C232E] hover:text-white hover:border-slate-500'
                  }`}
                >
                  {isSelected ? 'Active Selection' : 'Select for Dashboard'}
                </button>

                {accounts.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleDelete(acc.id, acc.name)}
                    className="p-1.5 rounded-lg bg-[#0A0D14] hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-[#1C232E] transition cursor-pointer"
                    title="Delete Account"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal for Add Account */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleCreate}
            className="w-full max-w-md rounded-2xl bg-[#12161D] border border-indigo-500/30 p-6 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#1C232E]">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Building2 className="w-4 h-4 text-indigo-400" />
                Register New Account
              </h3>
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Account Label</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. APEX 50K Funded #1, Ninja Live CME"
                  className="w-full bg-[#0A0D14] border border-[#1C232E] rounded-xl px-3 py-2 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Broker / Prop Firm</label>
                  <input
                    type="text"
                    value={broker}
                    onChange={e => setBroker(e.target.value)}
                    placeholder="e.g. Tradovate, Topstep, IBKR"
                    className="w-full bg-[#0A0D14] border border-[#1C232E] rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Account Type</label>
                  <select
                    value={accountType}
                    onChange={e => setAccountType(e.target.value as any)}
                    className="w-full bg-[#0A0D14] border border-[#1C232E] rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="LIVE">Live Real Money</option>
                    <option value="PROP_FIRM">Prop Firm (Funded / Evaluation)</option>
                    <option value="DEMO">Paper / Demo</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Starting Balance ($)</label>
                  <input
                    type="number"
                    step="any"
                    value={balance}
                    onChange={e => setBalance(e.target.value)}
                    className="w-full bg-[#0A0D14] border border-[#1C232E] rounded-xl px-3 py-2 text-slate-100 font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Currency</label>
                  <select
                    value={currency}
                    onChange={e => setCurrency(e.target.value)}
                    className="w-full bg-[#0A0D14] border border-[#1C232E] rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="AUD">AUD ($)</option>
                    <option value="CAD">CAD ($)</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#1C232E]">
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#1A1F27] hover:bg-[#232B36] text-slate-300 border border-[#1C232E]"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-600/25 border border-indigo-400/30"
              >
                Register Account
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
