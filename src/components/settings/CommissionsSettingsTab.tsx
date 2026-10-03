import React, { useState } from 'react';
import {
  DollarSign,
  Plus,
  Trash2,
  Edit2,
  ExternalLink,
  CheckCircle2,
  Layers,
  HelpCircle,
  Percent,
  X,
  Save
} from 'lucide-react';
import { useTrading } from '../../context/TradingContext';
import { CommissionRule } from '../../types';

export const CommissionsSettingsTab: React.FC = () => {
  const {
    userSettings,
    updateUserSettings,
    accounts,
    addToast,
    addActivityLog,
    userProfile,
    theme,
  } = useTrading();

  const isLight = theme === 'light';

  const defaultRules: CommissionRule[] = [
    {
      id: 'cr-1',
      account: 'ALL',
      instrument: 'Futures',
      symbol: 'ES',
      mode: 'Per Contract',
      apply: 'Round-Trip',
      commission: 2.50,
      exchangeFee: 1.28,
      clearingFee: 0.20,
      platformFee: 0.50,
      otherFee: 0.00,
    },
    {
      id: 'cr-2',
      account: 'ALL',
      instrument: 'Futures',
      symbol: 'NQ',
      mode: 'Per Contract',
      apply: 'Round-Trip',
      commission: 2.50,
      exchangeFee: 1.28,
      clearingFee: 0.20,
      platformFee: 0.50,
      otherFee: 0.00,
    },
    {
      id: 'cr-3',
      account: 'ALL',
      instrument: 'Forex',
      symbol: 'ALL',
      mode: 'Per Lot',
      apply: 'Round-Trip',
      commission: 3.50,
      exchangeFee: 0,
      clearingFee: 0,
      platformFee: 0,
      otherFee: 0,
    },
    {
      id: 'cr-4',
      account: 'ALL',
      instrument: 'Stocks',
      symbol: 'ALL',
      mode: 'Per Share',
      apply: 'Per Fill',
      commission: 0.005,
      exchangeFee: 0.001,
      clearingFee: 0.0002,
      platformFee: 0,
      otherFee: 0,
    },
  ];

  const rules = (userSettings.commissionRules && userSettings.commissionRules.length > 0)
    ? userSettings.commissionRules
    : defaultRules;

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<CommissionRule | null>(null);

  // Form State
  const [account, setAccount] = useState('ALL');
  const [instrument, setInstrument] = useState<CommissionRule['instrument']>('Futures');
  const [symbol, setSymbol] = useState('ALL');
  const [mode, setMode] = useState<CommissionRule['mode']>('Per Contract');
  const [apply, setApply] = useState<CommissionRule['apply']>('Round-Trip');
  const [commission, setCommission] = useState(2.50);
  const [exchangeFee, setExchangeFee] = useState(1.25);
  const [clearingFee, setClearingFee] = useState(0.20);
  const [platformFee, setPlatformFee] = useState(0.50);

  const handleOpenCreate = () => {
    setEditingRule(null);
    setAccount('ALL');
    setInstrument('Futures');
    setSymbol('ALL');
    setMode('Per Contract');
    setApply('Round-Trip');
    setCommission(2.50);
    setExchangeFee(1.25);
    setClearingFee(0.20);
    setPlatformFee(0.50);
    setIsAddOpen(true);
  };

  const handleOpenEdit = (rule: CommissionRule) => {
    setEditingRule(rule);
    setAccount(rule.account);
    setInstrument(rule.instrument);
    setSymbol(rule.symbol);
    setMode(rule.mode);
    setApply(rule.apply);
    setCommission(rule.commission);
    setExchangeFee(rule.exchangeFee);
    setClearingFee(rule.clearingFee);
    setPlatformFee(rule.platformFee);
    setIsAddOpen(true);
  };

  const handleSaveRule = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const newRule: CommissionRule = {
        id: editingRule ? editingRule.id : `cr-${Date.now()}`,
        account,
        instrument,
        symbol: symbol.toUpperCase().trim() || 'ALL',
        mode,
        apply,
        commission: Number(commission) || 0,
        exchangeFee: Number(exchangeFee) || 0,
        clearingFee: Number(clearingFee) || 0,
        platformFee: Number(platformFee) || 0,
        otherFee: 0,
      };

      const updatedRules = editingRule
        ? rules.map(r => r.id === editingRule.id ? newRule : r)
        : [...rules, newRule];

      await updateUserSettings(prev => ({
        ...prev,
        commissionRules: updatedRules,
      }));

      await addActivityLog({
        action: editingRule ? 'UPDATE_COMMISSION_RULE' : 'ADD_COMMISSION_RULE',
        category: 'SETTINGS',
        object: `Fee Schedule: ${newRule.symbol}`,
        status: 'INFO',
        details: { instrument, symbol: newRule.symbol, commission: newRule.commission, mode: newRule.mode },
      });

      addToast('Commission Rule Saved', `Rule for ${newRule.symbol} registered.`, 'success');
      setIsAddOpen(false);
    } catch (err: any) {
      addToast('Save Failed', err.message || 'Could not save commission rule', 'error');
    }
  };

  const handleDeleteRule = async (id: string) => {
    if (!window.confirm('Delete this commission calculation rule?')) return;
    try {
      const updatedRules = rules.filter(r => r.id !== id);
      await updateUserSettings(prev => ({
        ...prev,
        commissionRules: updatedRules,
      }));
      addToast('Rule Removed', 'Commission schedule updated.', 'info');
    } catch (err: any) {
      addToast('Delete Failed', err.message || 'Could not remove rule', 'error');
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[rgba(255,255,255,0.06)]">
        <div>
          <h2 className="text-base font-semibold text-[#F4F5F7] flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-[#818CF8]" />
            Default Commission, Regulatory & Exchange Fees
          </h2>
          <p className="text-xs text-[#8A919D] mt-0.5">
            Auto-applied to uploaded executions when broker statements do not report explicit round-trip fee schedules.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreate}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-[#6366F1] hover:bg-[#4F46E5] text-white shadow-xs transition cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Fee Rule</span>
        </button>
      </div>

      {/* Rules Table */}
      <div className="rounded-2xl border border-[rgba(255,255,255,0.055)] bg-[#0D1014] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#090C10] text-[#8A919D] uppercase tracking-wider font-mono text-[10px] border-b border-[rgba(255,255,255,0.055)]">
              <tr>
                <th className="py-3 px-4">Account</th>
                <th className="py-3 px-4">Instrument</th>
                <th className="py-3 px-4">Symbol</th>
                <th className="py-3 px-4">Mode / Basis</th>
                <th className="py-3 px-4 text-right">Broker Comm.</th>
                <th className="py-3 px-4 text-right">Exchange Fee</th>
                <th className="py-3 px-4 text-right">Clearing / Plat</th>
                <th className="py-3 px-4 text-right">Total Est.</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(255,255,255,0.04)]">
              {rules.map(rule => {
                const totalFee = (rule.commission || 0) + (rule.exchangeFee || 0) + (rule.clearingFee || 0) + (rule.platformFee || 0);
                return (
                  <tr key={rule.id} className="hover:bg-[#151A20] transition">
                    <td className="py-3 px-4 font-semibold text-[#F4F5F7]">
                      {rule.account === 'ALL' ? 'All Accounts' : rule.account}
                    </td>
                    <td className="py-3 px-4 text-[#C2C7D0] font-medium">
                      {rule.instrument}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-[#818CF8]">
                      {rule.symbol}
                    </td>
                    <td className="py-3 px-4 text-[#8A919D] font-mono text-[11px]">
                      {rule.mode} ({rule.apply})
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-[#F4F5F7]">
                      ${rule.commission.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-[#8A919D]">
                      ${rule.exchangeFee.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-[#8A919D]">
                      ${((rule.clearingFee || 0) + (rule.platformFee || 0)).toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400">
                      ${totalFee.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(rule)}
                          className="p-1.5 rounded-lg bg-[#080A0D] hover:bg-[#151A20] text-[#C2C7D0] border border-[rgba(255,255,255,0.06)] transition cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteRule(rule.id)}
                          className="p-1.5 rounded-lg bg-[#080A0D] hover:bg-rose-500/20 text-[#8A919D] hover:text-rose-400 border border-[rgba(255,255,255,0.06)] transition cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal for Add / Edit Rule */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveRule}
            className="w-full max-w-lg rounded-2xl bg-[#0B0E12] border border-[rgba(255,255,255,0.08)] p-6 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between pb-3 border-b border-[rgba(255,255,255,0.06)]">
              <h3 className="text-sm font-semibold text-[#F4F5F7] flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-[#818CF8]" />
                {editingRule ? 'Edit Commission Schedule' : 'Create Commission Rule'}
              </h3>
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                className="text-[#8A919D] hover:text-[#F4F5F7] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-[#A7ADB7] font-medium mb-1">Target Account</label>
                <select
                  value={account}
                  onChange={e => setAccount(e.target.value)}
                  className="w-full bg-[#080A0D] border border-[rgba(255,255,255,0.08)] rounded-xl px-3 py-2 text-[#F4F5F7] focus:outline-none focus:border-[#6366F1] cursor-pointer"
                >
                  <option value="ALL" className="bg-[#0D1014] text-[#F4F5F7]">All Accounts (Global)</option>
                  {accounts.map(a => (
                    <option key={a.id} value={a.name} className="bg-[#0D1014] text-[#F4F5F7]">{a.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[#A7ADB7] font-medium mb-1">Asset Class</label>
                <select
                  value={instrument}
                  onChange={e => setInstrument(e.target.value as any)}
                  className="w-full bg-[#080A0D] border border-[rgba(255,255,255,0.08)] rounded-xl px-3 py-2 text-[#F4F5F7] focus:outline-none focus:border-[#6366F1] cursor-pointer"
                >
                  <option value="Futures" className="bg-[#0D1014] text-[#F4F5F7]">Futures (CME / NYMEX / CBOT)</option>
                  <option value="Forex" className="bg-[#0D1014] text-[#F4F5F7]">Forex</option>
                  <option value="Stocks" className="bg-[#0D1014] text-[#F4F5F7]">Stocks / Equities</option>
                  <option value="Crypto" className="bg-[#0D1014] text-[#F4F5F7]">Crypto</option>
                  <option value="CFD" className="bg-[#0D1014] text-[#F4F5F7]">CFD</option>
                </select>
              </div>

              <div>
                <label className="block text-[#A7ADB7] font-medium mb-1">Symbol Filter</label>
                <input
                  type="text"
                  value={symbol}
                  onChange={e => setSymbol(e.target.value)}
                  placeholder="e.g. ES, NQ, EURUSD, or ALL"
                  className="w-full bg-[#080A0D] border border-[rgba(255,255,255,0.08)] rounded-xl px-3 py-2 text-[#F4F5F7] placeholder-[#5E6570] focus:outline-none focus:border-[#6366F1] font-mono uppercase"
                />
              </div>

              <div>
                <label className="block text-[#A7ADB7] font-medium mb-1">Fee Mode</label>
                <select
                  value={mode}
                  onChange={e => setMode(e.target.value as any)}
                  className="w-full bg-[#080A0D] border border-[rgba(255,255,255,0.08)] rounded-xl px-3 py-2 text-[#F4F5F7] focus:outline-none focus:border-[#6366F1] cursor-pointer"
                >
                  <option value="Per Contract" className="bg-[#0D1014] text-[#F4F5F7]">Per Contract</option>
                  <option value="Per Lot" className="bg-[#0D1014] text-[#F4F5F7]">Per Lot (100k units)</option>
                  <option value="Per Share" className="bg-[#0D1014] text-[#F4F5F7]">Per Share</option>
                  <option value="Percentage" className="bg-[#0D1014] text-[#F4F5F7]">Percentage of Notional</option>
                  <option value="Flat" className="bg-[#0D1014] text-[#F4F5F7]">Flat Fee per Trade</option>
                </select>
              </div>

              <div>
                <label className="block text-[#A7ADB7] font-medium mb-1">Broker Execution Fee ($)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={commission}
                  onChange={e => setCommission(parseFloat(e.target.value) || 0)}
                  className="w-full bg-[#080A0D] border border-[rgba(255,255,255,0.08)] rounded-xl px-3 py-2 text-[#F4F5F7] font-mono focus:outline-none focus:border-[#6366F1]"
                />
              </div>

              <div>
                <label className="block text-[#A7ADB7] font-medium mb-1">Exchange Regulatory Fee ($)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={exchangeFee}
                  onChange={e => setExchangeFee(parseFloat(e.target.value) || 0)}
                  className="w-full bg-[#080A0D] border border-[rgba(255,255,255,0.08)] rounded-xl px-3 py-2 text-[#F4F5F7] font-mono focus:outline-none focus:border-[#6366F1]"
                />
              </div>

              <div>
                <label className="block text-[#A7ADB7] font-medium mb-1">Clearing Fee ($)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={clearingFee}
                  onChange={e => setClearingFee(parseFloat(e.target.value) || 0)}
                  className="w-full bg-[#080A0D] border border-[rgba(255,255,255,0.08)] rounded-xl px-3 py-2 text-[#F4F5F7] font-mono focus:outline-none focus:border-[#6366F1]"
                />
              </div>

              <div>
                <label className="block text-[#A7ADB7] font-medium mb-1">Platform Order Routing Fee ($)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={platformFee}
                  onChange={e => setPlatformFee(parseFloat(e.target.value) || 0)}
                  className="w-full bg-[#080A0D] border border-[rgba(255,255,255,0.08)] rounded-xl px-3 py-2 text-[#F4F5F7] font-mono focus:outline-none focus:border-[#6366F1]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[rgba(255,255,255,0.06)]">
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-medium bg-[#11151A] hover:bg-[#151A20] text-[#C2C7D0] hover:text-[#F4F5F7] border border-[rgba(255,255,255,0.08)] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#6366F1] hover:bg-[#4F46E5] text-white shadow-xs cursor-pointer"
              >
                {editingRule ? 'Save Changes' : 'Create Rule'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
