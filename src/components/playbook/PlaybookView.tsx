import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Plus,
  BookmarkCheck,
  CheckCircle2,
  Lock,
  Globe,
  SlidersHorizontal,
  TrendingUp,
  Award,
  MoreVertical,
  X,
  CheckSquare,
  Square,
  Sparkles,
  Trash2,
  Edit2,
  Zap,
  Target,
  Compass,
  Layers,
  Flame,
  Activity,
  Crosshair,
  ShieldCheck,
  BarChart3,
  ChevronDown,
  ArrowUpRight,
  TrendingDown,
  Percent,
  Check,
  RotateCcw,
  AlertTriangle
} from 'lucide-react';
import { useTrading } from '../../context/TradingContext';
import { Playbook, PlaybookRule } from '../../types';

const TRASH_STORAGE_KEY = 'tf_trashed_playbooks_v1';

interface TrashedPlaybookItem {
  playbook: Playbook;
  trashedAt: string;
}

const getPlaybookLucideIcon = (name: string, iconStr?: string) => {
  const n = (name + ' ' + (iconStr || '')).toLowerCase();
  if (n.includes('drive') || n.includes('breakout') || n.includes('🚀')) return Zap;
  if (n.includes('absorption') || n.includes('reversal') || n.includes('🔄')) return Target;
  if (n.includes('gap') || n.includes('top') || n.includes('⚡')) return Flame;
  if (n.includes('trend') || n.includes('continuation') || n.includes('📈')) return TrendingUp;
  if (n.includes('vwap') || n.includes('bounce') || n.includes('🎯')) return Crosshair;
  if (n.includes('fomo') || n.includes('impulse') || n.includes('⚠️')) return Activity;
  return BookmarkCheck;
};

export const PlaybookView: React.FC = () => {
  const {
    playbooks,
    addPlaybook,
    updatePlaybook,
    deletePlaybook,
    duplicatePlaybook,
    formatCurrency,
    addToast,
    theme,
  } = useTrading();

  const isLight = theme === 'light';

  const [sortBy, setSortBy] = useState<'pnl' | 'winrate' | 'trades' | 'name'>('pnl');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [activeChecklistPlaybook, setActiveChecklistPlaybook] = useState<Playbook | null>(null);
  const [checkedRules, setCheckedRules] = useState<{ [ruleId: string]: boolean }>({});

  // Card Menu & Deletion / Trash state
  const [activeMenuPlaybookId, setActiveMenuPlaybookId] = useState<string | null>(null);
  const [isTrashModalOpen, setIsTrashModalOpen] = useState(false);
  const [playbookToTrash, setPlaybookToTrash] = useState<Playbook | null>(null);
  const [editingPlaybook, setEditingPlaybook] = useState<Playbook | null>(null);
  const [playbookToPermanentDelete, setPlaybookToPermanentDelete] = useState<Playbook | null>(null);

  // Trashed playbooks stored in local storage
  const [trashedPlaybooks, setTrashedPlaybooks] = useState<TrashedPlaybookItem[]>(() => {
    try {
      const saved = localStorage.getItem(TRASH_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(TRASH_STORAGE_KEY, JSON.stringify(trashedPlaybooks));
    } catch {
      // ignore
    }
  }, [trashedPlaybooks]);

  // Click outside to close active card kebab menu
  const menuRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setActiveMenuPlaybookId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Form State for new playbook
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('🚀');
  const [color, setColor] = useState('#3B82F6');
  const [description, setDescription] = useState('');
  const [rules, setRules] = useState<PlaybookRule[]>([
    { id: 'r-1', text: 'Clean higher timeframe structure tap / sweep', category: 'MARKET', required: true },
    { id: 'r-2', text: '5-minute market structure shift with volume delta', category: 'ENTRY', required: true },
    { id: 'r-3', text: 'Stop Loss strictly placed beyond invalidation wick', category: 'RISK', required: true },
    { id: 'r-4', text: 'Take Profit at opposing liquidity pool (minimum 2.0R)', category: 'EXIT', required: true },
  ]);
  const [newRuleText, setNewRuleText] = useState('');
  const [newRuleCategory, setNewRuleCategory] = useState<'ENTRY' | 'EXIT' | 'RISK' | 'MARKET'>('ENTRY');

  // Edit form state
  const [editName, setEditName] = useState('');
  const [editIcon, setEditIcon] = useState('🚀');
  const [editColor, setEditColor] = useState('#3B82F6');
  const [editDescription, setEditDescription] = useState('');
  const [editRules, setEditRules] = useState<PlaybookRule[]>([]);
  const [newEditRuleText, setNewEditRuleText] = useState('');
  const [newEditRuleCategory, setNewEditRuleCategory] = useState<'ENTRY' | 'EXIT' | 'RISK' | 'MARKET'>('ENTRY');

  // Sorting
  const sortedPlaybooks = [...playbooks].sort((a, b) => {
    if (sortBy === 'pnl') return b.netPnl - a.netPnl;
    if (sortBy === 'winrate') return b.winRate - a.winRate;
    if (sortBy === 'trades') return b.totalTrades - a.totalTrades;
    return a.name.localeCompare(b.name);
  });

  const handleCreatePlaybook = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      addToast('Name Required', 'Please enter a playbook setup name', 'error');
      return;
    }

    let finalRules = [...rules];
    if (newRuleText.trim()) {
      finalRules.push({
        id: 'r-' + Date.now(),
        text: newRuleText.trim(),
        category: newRuleCategory,
        required: true,
      });
    }

    addPlaybook({
      name: name.trim(),
      icon,
      color,
      description: description || 'Predefined trading rules setup for consistent edge.',
      status: 'A_PLUS',
      rules: finalRules,
      exampleScreenshots: ['https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&auto=format&fit=crop&q=80'],
      totalTrades: 0,
      winRate: 0,
      netPnl: 0,
      profitFactor: 0,
      avgWinner: 0,
      avgLoser: 0,
      expectancy: 0,
      missedTradesCount: 0,
      isPrivate: true,
    });

    setIsCreateModalOpen(false);
    setName('');
    setDescription('');
    setNewRuleText('');
    setIcon('🚀');
    setColor('#3B82F6');
    setRules([
      { id: 'r-1', text: 'Clean higher timeframe structure tap / sweep', category: 'MARKET', required: true },
      { id: 'r-2', text: '5-minute market structure shift with volume delta', category: 'ENTRY', required: true },
      { id: 'r-3', text: 'Stop Loss strictly placed beyond invalidation wick', category: 'RISK', required: true },
      { id: 'r-4', text: 'Take Profit at opposing liquidity pool (minimum 2.0R)', category: 'EXIT', required: true },
    ]);
    addToast('Playbook Created', `"${name}" playbook successfully configured`, 'success');
  };

  const handleOpenEdit = (pb: Playbook) => {
    setEditingPlaybook(pb);
    setEditName(pb.name);
    setEditIcon(pb.icon || '🚀');
    setEditColor(pb.color || '#3B82F6');
    setEditDescription(pb.description || '');
    setEditRules(pb.rules ? [...pb.rules] : []);
    setNewEditRuleText('');
    setActiveMenuPlaybookId(null);
  };

  const handleSaveEditPlaybook = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlaybook || !editName.trim()) return;

    let finalRules = [...editRules];
    if (newEditRuleText.trim()) {
      finalRules.push({
        id: 'r-' + Date.now(),
        text: newEditRuleText.trim(),
        category: newEditRuleCategory,
        required: true,
      });
    }

    const updated: Playbook = {
      ...editingPlaybook,
      name: editName.trim(),
      icon: editIcon,
      color: editColor,
      description: editDescription.trim(),
      rules: finalRules,
    };

    updatePlaybook(updated);
    setEditingPlaybook(null);
    setNewEditRuleText('');
    addToast('Playbook Updated', `"${editName}" changes saved`, 'success');
  };

  const handleAddRule = () => {
    if (!newRuleText.trim()) return;
    setRules(prev => [
      ...prev,
      {
        id: 'r-' + Date.now(),
        text: newRuleText.trim(),
        category: newRuleCategory,
        required: true,
      },
    ]);
    setNewRuleText('');
  };

  const handleRemoveRule = (ruleId: string) => {
    setRules(prev => prev.filter(r => r.id !== ruleId));
  };

  const handleAddEditRule = () => {
    if (!newEditRuleText.trim()) return;
    setEditRules(prev => [
      ...prev,
      {
        id: 'r-' + Date.now(),
        text: newEditRuleText.trim(),
        category: newEditRuleCategory,
        required: true,
      },
    ]);
    setNewEditRuleText('');
  };

  const handleRemoveEditRule = (ruleId: string) => {
    setEditRules(prev => prev.filter(r => r.id !== ruleId));
  };

  const openRuleChecker = (pb: Playbook) => {
    setActiveChecklistPlaybook(pb);
    const initialChecked: { [k: string]: boolean } = {};
    (pb.rules || []).forEach((r, idx) => {
      initialChecked[r.id] = idx === 0;
    });
    setCheckedRules(initialChecked);
    setActiveMenuPlaybookId(null);
  };

  // Trash & Delete Handlers
  const handleConfirmMoveToTrash = () => {
    if (!playbookToTrash) return;

    // Add to trash list
    setTrashedPlaybooks(prev => [
      {
        playbook: playbookToTrash,
        trashedAt: new Date().toISOString()
      },
      ...prev.filter(t => t.playbook.id !== playbookToTrash.id)
    ]);

    // Remove from active list
    deletePlaybook(playbookToTrash.id);
    addToast('Moved to Trash', `"${playbookToTrash.name}" moved to Trash. You can restore it anytime.`, 'info');
    setPlaybookToTrash(null);
    setActiveMenuPlaybookId(null);
  };

  const handleRestorePlaybook = (item: TrashedPlaybookItem) => {
    // Add back to active playbooks
    addPlaybook(item.playbook);
    // Remove from trash
    setTrashedPlaybooks(prev => prev.filter(t => t.playbook.id !== item.playbook.id));
    addToast('Playbook Restored', `"${item.playbook.name}" has been restored to your playbooks`, 'success');
  };

  const handlePermanentDelete = () => {
    if (!playbookToPermanentDelete) return;
    setTrashedPlaybooks(prev => prev.filter(t => t.playbook.id !== playbookToPermanentDelete.id));
    addToast('Permanently Deleted', `"${playbookToPermanentDelete.name}" permanently deleted`, 'info');
    setPlaybookToPermanentDelete(null);
  };

  const handleEmptyTrash = () => {
    if (trashedPlaybooks.length === 0) return;
    setTrashedPlaybooks([]);
    addToast('Trash Emptied', 'All items in trash have been cleared', 'info');
  };

  return (
    <div className={`relative w-full max-w-[1300px] mx-auto space-y-6 pb-6 ${
      isLight ? 'text-zinc-900' : 'text-white'
    }`}>
      {/* Background Lighting: Subtle institutional ambient glow in dark mode only */}
      {!isLight && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden -z-10">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[350px] rounded-full bg-blue-600/10 blur-[130px] opacity-40" />
          <div className="absolute top-1/3 left-1/3 w-[600px] h-[400px] rounded-full bg-indigo-600/10 blur-[140px] opacity-50" />
          <div className="absolute bottom-10 right-1/4 w-[450px] h-[300px] rounded-full bg-purple-600/10 blur-[120px] opacity-30" />
        </div>
      )}

      <div className="space-y-5">
        {/* Top Header Bar */}
        <div className={`flex flex-wrap items-center justify-between gap-4 p-4.5 rounded-2xl border ${
          isLight
            ? 'bg-white border-zinc-200 shadow-2xs'
            : 'bg-[#12161D] border-[#1C232E] shadow-sm'
        }`}>
          <div className="text-left">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-indigo-500/15 border border-indigo-500/30 text-indigo-500">
                <BookmarkCheck className="w-5 h-5" />
              </div>
              <h1 className={`text-xl sm:text-2xl font-bold tracking-tight ${isLight ? 'text-zinc-900' : 'text-white'}`}>
                Trading Playbooks & A+ Setups
              </h1>
            </div>
            <p className={`text-xs mt-1 ml-9 ${isLight ? 'text-zinc-500' : 'text-slate-400'}`}>
              Define precise entry, exit, and risk rules to measure playbook edge and discipline
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Create Playbook Action Button */}
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white px-4 py-2 text-xs font-semibold shadow-md shadow-indigo-600/25 border border-indigo-400/30 transition-all duration-200 active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create Playbook</span>
            </button>

            {/* Sort Selector */}
            <div className="relative">
              <div className={`flex items-center gap-1.5 text-xs rounded-xl px-3 py-2 shadow-2xs border transition-all ${
                isLight
                  ? 'bg-white border-zinc-300 text-zinc-700 hover:border-zinc-400'
                  : 'bg-[#0A0D14] border-[#1C232E] text-slate-300 hover:border-[#2A3444]'
              }`}>
                <span className={isLight ? 'text-zinc-500' : 'text-slate-500'}>Sort by:</span>
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value as any)}
                  className={`appearance-none bg-transparent font-semibold focus:outline-none cursor-pointer pr-4 ${
                    isLight ? 'text-zinc-900' : 'text-white'
                  }`}
                >
                  <option value="pnl" className={isLight ? 'bg-white text-zinc-900' : 'bg-[#12161D] text-white'}>Net P&L</option>
                  <option value="winrate" className={isLight ? 'bg-white text-zinc-900' : 'bg-[#12161D] text-white'}>Win Rate</option>
                  <option value="trades" className={isLight ? 'bg-white text-zinc-900' : 'bg-[#12161D] text-white'}>Total Trades</option>
                  <option value="name" className={isLight ? 'bg-white text-zinc-900' : 'bg-[#12161D] text-white'}>Name A-Z</option>
                </select>
                <ChevronDown className={`w-3.5 h-3.5 absolute right-2.5 top-3 pointer-events-none ${
                  isLight ? 'text-zinc-500' : 'text-slate-500'
                }`} />
              </div>
            </div>
          </div>
        </div>

        {/* Playbook Cards Responsive Grid */}
        {sortedPlaybooks.length === 0 ? (
          <div className={`rounded-3xl border p-10 text-center space-y-3 ${
            isLight
              ? 'bg-white border-zinc-200 shadow-2xs'
              : 'border-white/[0.08] bg-[#0A0C13]/60 backdrop-blur-2xl'
          }`}>
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-500 mx-auto flex items-center justify-center">
              <BookmarkCheck className="w-6 h-6" />
            </div>
            <h3 className={`text-base font-bold ${isLight ? 'text-zinc-900' : 'text-white'}`}>No active playbooks found</h3>
            <p className={`text-xs max-w-md mx-auto ${isLight ? 'text-zinc-500' : 'text-[#8E90A0]'}`}>
              Create your first trading playbook or check the Trash if you previously moved one there.
            </p>
            <div className="pt-2 flex justify-center gap-3">
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/25 transition cursor-pointer"
              >
                + Create Playbook
              </button>
              {trashedPlaybooks.length > 0 && (
                <button
                  type="button"
                  onClick={() => setIsTrashModalOpen(true)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                    isLight
                      ? 'bg-zinc-100 hover:bg-zinc-200 border-zinc-300 text-zinc-700'
                      : 'bg-white/[0.05] hover:bg-white/[0.1] text-[#A1A3B4] border-white/[0.08]'
                  }`}
                >
                  View Trash ({trashedPlaybooks.length})
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4.5">
            {sortedPlaybooks.map((pb, index) => {
              const isProfitable = pb.netPnl > 0;
              const isLoss = pb.netPnl < 0;
              const IconComponent = getPlaybookLucideIcon(pb.name, pb.icon);
              const winRatePercent = Math.min(100, Math.max(0, Math.round(pb.winRate || 0)));
              const isMenuOpen = activeMenuPlaybookId === pb.id;

              return (
                <motion.div
                  key={pb.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: index * 0.05 }}
                  className={`group relative rounded-[20px] border p-5 flex flex-col justify-between transition-all duration-300 text-sm leading-normal text-left font-sans ${
                    isLight
                      ? 'bg-white border-zinc-200 shadow-2xs hover:border-indigo-400/60 hover:shadow-md'
                      : 'border-white/[0.08] bg-[#0A0C13]/80 backdrop-blur-2xl shadow-xl hover:border-cyan-500/40 hover:shadow-[0_0_30px_rgba(0,210,255,0.12)]'
                  }`}
                >
                  {/* Top Subtle Gradient Edge Highlight */}
                  <div
                    className="absolute top-0 left-0 right-0 h-[2px] opacity-70 group-hover:opacity-100 transition-opacity duration-300 rounded-t-[20px]"
                    style={{
                      background: `linear-gradient(90deg, ${pb.color || '#3B82F6'}, ${pb.color || '#3B82F6'}88, transparent)`
                    }}
                  />

                  <div>
                    {/* Card Header: Icon, Name, Trades count, Privacy, Check Rules and Context Menu */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div
                          style={{
                            backgroundColor: `${pb.color || '#3B82F6'}15`,
                            borderColor: `${pb.color || '#3B82F6'}35`,
                            color: pb.color || '#3B82F6'
                          }}
                          className="w-10 h-10 rounded-xl border flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform shrink-0"
                        >
                          <IconComponent className="w-4.5 h-4.5" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <h3
                            className={`text-sm font-bold tracking-tight truncate transition-colors ${
                              isLight
                                ? 'text-zinc-900 group-hover:text-indigo-600'
                                : 'text-white group-hover:text-cyan-300'
                            }`}
                            title={pb.name}
                          >
                            {pb.name}
                          </h3>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className={`text-[11px] font-mono font-medium whitespace-nowrap ${
                              isLight ? 'text-zinc-500' : 'text-[#A1A3B4]'
                            }`}>
                              {pb.totalTrades} {pb.totalTrades === 1 ? 'trade' : 'trades'}
                            </span>
                            <span className={isLight ? 'text-zinc-300' : 'text-[#3A3D4E]'}>•</span>
                            <span className={`text-[11px] flex items-center gap-1 whitespace-nowrap ${
                              isLight ? 'text-zinc-500' : 'text-[#717483]'
                            }`}>
                              {pb.isPrivate ? <Lock className="w-3 h-3 text-zinc-400" /> : <Globe className="w-3 h-3 text-zinc-400" />}
                              {pb.isPrivate ? 'Private' : 'Shared'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => openRuleChecker(pb)}
                          className={`text-[11px] font-semibold px-2 py-1 rounded-xl transition-all duration-200 shadow-2xs active:scale-95 cursor-pointer flex items-center gap-1 whitespace-nowrap border ${
                            isLight
                              ? 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200'
                              : 'text-cyan-400 hover:text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/20 border-cyan-500/30 hover:border-cyan-500/50'
                          }`}
                        >
                          <span>Check Rules</span>
                        </button>

                        {/* Card Context Menu */}
                        <div className="relative">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveMenuPlaybookId(isMenuOpen ? null : pb.id);
                            }}
                            className={`p-1.5 rounded-xl border transition-all cursor-pointer flex items-center justify-center ${
                              isLight
                                ? 'text-zinc-500 hover:text-zinc-900 bg-zinc-100 hover:bg-zinc-200/80 border-zinc-200'
                                : 'text-[#717483] hover:text-white bg-white/[0.03] hover:bg-white/[0.08] border-white/[0.06] hover:border-white/[0.12]'
                            }`}
                            title="Playbook Actions"
                          >
                            <MoreVertical className="w-3.5 h-3.5" />
                          </button>

                          {/* Dropdown Menu */}
                          <AnimatePresence>
                            {isMenuOpen && (
                              <motion.div
                                ref={menuRef}
                                initial={{ opacity: 0, scale: 0.95, y: -4 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: -4 }}
                                transition={{ duration: 0.15 }}
                                className={`absolute right-0 top-full mt-1.5 z-40 w-44 rounded-2xl border shadow-2xl p-1.5 text-xs ${
                                  isLight
                                    ? 'bg-white border-zinc-200 text-zinc-900'
                                    : 'bg-[#0C0E16]/95 border-white/[0.12] backdrop-blur-2xl text-white'
                                }`}
                              >
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenEdit(pb);
                                  }}
                                  className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl transition-colors cursor-pointer ${
                                    isLight
                                      ? 'text-zinc-700 hover:text-zinc-900 hover:bg-zinc-100'
                                      : 'text-[#D1D3E0] hover:text-white hover:bg-white/[0.08]'
                                  }`}
                                >
                                  <Edit2 className="w-3.5 h-3.5 text-blue-500" />
                                  <span>Edit Playbook</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveMenuPlaybookId(null);
                                    duplicatePlaybook(pb.id);
                                  }}
                                  className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl transition-colors cursor-pointer ${
                                    isLight
                                      ? 'text-zinc-700 hover:text-zinc-900 hover:bg-zinc-100'
                                      : 'text-[#D1D3E0] hover:text-white hover:bg-white/[0.08]'
                                  }`}
                                >
                                  <Sparkles className="w-3.5 h-3.5 text-purple-500" />
                                  <span>Duplicate</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openRuleChecker(pb);
                                  }}
                                  className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl transition-colors cursor-pointer ${
                                    isLight
                                      ? 'text-zinc-700 hover:text-zinc-900 hover:bg-zinc-100'
                                      : 'text-[#D1D3E0] hover:text-white hover:bg-white/[0.08]'
                                  }`}
                                >
                                  <CheckSquare className="w-3.5 h-3.5 text-indigo-500" />
                                  <span>Check Rules</span>
                                </button>
                                <div className={`my-1 border-t ${isLight ? 'border-zinc-200' : 'border-white/[0.08]'}`} />
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveMenuPlaybookId(null);
                                    setPlaybookToTrash(pb);
                                  }}
                                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>Move to Trash</span>
                                </button>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    </div>

                    {/* Thesis / Description */}
                    <p className={`text-xs mt-3 line-clamp-2 leading-relaxed ${
                      isLight ? 'text-zinc-600' : 'text-[#8E90A0]'
                    }`}>
                      {pb.description}
                    </p>

                    {/* Playbook Rules List Preview */}
                    {pb.rules && pb.rules.length > 0 && (
                      <div className={`mt-3 pt-2.5 border-t space-y-1.5 ${
                        isLight ? 'border-zinc-200' : 'border-white/[0.06]'
                      }`}>
                        <div className="flex items-center justify-between text-xs">
                          <span className={`font-semibold uppercase tracking-wider text-[10px] flex items-center gap-1 ${
                            isLight ? 'text-zinc-500' : 'text-[#717483]'
                          }`}>
                            <BookmarkCheck className="w-3 h-3 text-indigo-500" />
                            Playbook Rules ({pb.rules.length})
                          </span>
                          <button
                            type="button"
                            onClick={() => openRuleChecker(pb)}
                            className={`text-[10px] font-semibold transition-colors cursor-pointer ${
                              isLight ? 'text-indigo-600 hover:text-indigo-700' : 'text-cyan-400 hover:text-cyan-300'
                            }`}
                          >
                            Verify Rules
                          </button>
                        </div>
                        <div className="space-y-1 max-h-24 overflow-y-auto custom-scrollbar pr-1">
                          {pb.rules.slice(0, 4).map(rule => (
                            <div key={rule.id} className={`flex items-center gap-1.5 text-xs rounded-lg px-2 py-1 border ${
                              isLight
                                ? 'bg-zinc-50 border-zinc-200 text-zinc-800'
                                : 'bg-white/[0.02] border-white/[0.05] text-[#C4C7D7]'
                            }`}>
                              <span className={`text-[9px] font-bold font-mono px-1.5 py-0.5 rounded border shrink-0 ${
                                isLight
                                  ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                  : 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                              }`}>
                                {rule.category}
                              </span>
                              <span className="truncate">{rule.text}</span>
                            </div>
                          ))}
                          {pb.rules.length > 4 && (
                            <span className={`text-[10px] italic block pl-1 ${
                              isLight ? 'text-zinc-400' : 'text-[#717483]'
                            }`}>
                              +{pb.rules.length - 4} more rules...
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Primary Metrics Row */}
                    <div className={`grid grid-cols-2 gap-4 mt-3.5 pt-3 border-t ${
                      isLight ? 'border-zinc-200' : 'border-white/[0.07]'
                    }`}>
                      {/* Win Rate with Circular Ring */}
                      <div className="flex items-center gap-2.5">
                        <div className={`relative w-9 h-9 rounded-full flex items-center justify-center shrink-0 border ${
                          isLight
                            ? 'bg-zinc-50 border-zinc-200'
                            : 'bg-white/[0.02] border-white/[0.08]'
                        }`}>
                          <svg className="w-9 h-9 -rotate-90" viewBox="0 0 36 36">
                            <path
                              className={isLight ? "text-zinc-200" : "text-white/[0.06]"}
                              strokeWidth="3.5"
                              stroke="currentColor"
                              fill="none"
                              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            />
                            <path
                              className={winRatePercent >= 50 ? (isLight ? "text-emerald-500" : "text-[#00E599]") : "text-blue-500"}
                              strokeDasharray={`${winRatePercent}, 100`}
                              strokeWidth="3.5"
                              strokeLinecap="round"
                              stroke="currentColor"
                              fill="none"
                              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            />
                          </svg>
                          <span className={`absolute text-[10px] font-mono font-bold ${
                            isLight ? 'text-zinc-800' : 'text-white'
                          }`}>
                            {winRatePercent}%
                          </span>
                        </div>

                        <div>
                          <div className={`text-[10px] uppercase tracking-wider font-semibold ${
                            isLight ? 'text-zinc-500' : 'text-[#717483]'
                          }`}>
                            Win Rate
                          </div>
                          <div className={`text-sm font-bold font-mono ${
                            isLight ? 'text-zinc-900' : 'text-white'
                          }`}>
                            {pb.winRate}%
                          </div>
                        </div>
                      </div>

                      {/* Net P&L */}
                      <div>
                        <div className={`text-[10px] uppercase tracking-wider font-semibold ${
                          isLight ? 'text-zinc-500' : 'text-[#717483]'
                        }`}>
                          Net P&L
                        </div>
                        <div className={`text-base font-mono font-black tracking-tight ${
                          isProfitable
                            ? isLight ? 'text-emerald-600' : 'text-[#00E599]'
                            : isLoss
                            ? isLight ? 'text-rose-600' : 'text-[#FF4D6D]'
                            : isLight ? 'text-zinc-900' : 'text-white'
                        }`}>
                          {formatCurrency(pb.netPnl)}
                        </div>
                      </div>
                    </div>

                    {/* Secondary Metrics Inset Card */}
                    <div className={`grid grid-cols-3 gap-2 mt-3 p-2.5 rounded-xl text-xs border ${
                      isLight
                        ? 'bg-[#F8F9FB] border-zinc-200'
                        : 'bg-white/[0.02] border-white/[0.06]'
                    }`}>
                      <div>
                        <div className={`text-[9.5px] font-medium uppercase tracking-wider ${
                          isLight ? 'text-zinc-500' : 'text-[#717483]'
                        }`}>
                          Profit Factor
                        </div>
                        <div className={`font-mono font-bold mt-0.5 text-xs ${
                          isLight ? 'text-zinc-900' : 'text-[#F4F4F6]'
                        }`}>
                          {(pb.profitFactor ?? 0).toFixed(2)}
                        </div>
                      </div>
                      <div>
                        <div className={`text-[9.5px] font-medium uppercase tracking-wider ${
                          isLight ? 'text-zinc-500' : 'text-[#717483]'
                        }`}>
                          Expectancy
                        </div>
                        <div className={`font-mono font-bold mt-0.5 text-xs ${
                          isLight ? 'text-indigo-600' : 'text-[#3B82F6]'
                        }`}>
                          {formatCurrency(pb.expectancy || 0)}
                        </div>
                      </div>
                      <div>
                        <div className={`text-[9.5px] font-medium uppercase tracking-wider ${
                          isLight ? 'text-zinc-500' : 'text-[#717483]'
                        }`}>
                          Missed
                        </div>
                        <div className="font-mono font-bold text-amber-500 mt-0.5 text-xs">
                          {pb.missedTradesCount || 0}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Row: Avg Win & Avg Loss */}
                  <div className={`mt-4 pt-2.5 border-t flex items-center justify-between text-xs ${
                    isLight ? 'border-zinc-200 text-zinc-600' : 'border-white/[0.07] text-[#8E90A0]'
                  }`}>
                    <div className="flex items-center gap-1">
                      <TrendingUp className={`w-3.5 h-3.5 ${isLight ? 'text-emerald-600' : 'text-[#00E599]'}`} />
                      <span>Avg Win:</span>
                      <strong className={`font-mono font-bold ${isLight ? 'text-emerald-600' : 'text-[#00E599]'}`}>
                        ${Math.round(pb.avgWinner || 0)}
                      </strong>
                    </div>
                    <div className="flex items-center gap-1">
                      <TrendingDown className={`w-3.5 h-3.5 ${isLight ? 'text-rose-600' : 'text-[#FF4D6D]'}`} />
                      <span>Avg Loss:</span>
                      <strong className={`font-mono font-bold ${isLight ? 'text-rose-600' : 'text-[#FF4D6D]'}`}>
                        ${Math.round(pb.avgLoser || 0)}
                      </strong>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom Utility Bar with Trash Access */}
      <div className={`mt-2 pt-4 pb-2 flex flex-wrap items-center justify-between gap-3 border-t text-xs ${
        isLight ? 'border-zinc-200 text-zinc-500' : 'border-white/[0.06] text-[#717483]'
      }`}>
        <div className="flex items-center gap-2">
          <span className={`font-medium ${isLight ? 'text-zinc-700' : 'text-[#8E90A0]'}`}>Trading Playbooks & A+ Setups</span>
          <span>•</span>
          <span>{playbooks.length} {playbooks.length === 1 ? 'Active Setup' : 'Active Setups'}</span>
        </div>

        <button
          type="button"
          onClick={() => setIsTrashModalOpen(true)}
          className={`relative flex items-center gap-1.5 text-xs rounded-xl px-3 py-1.5 shadow-2xs border transition-all duration-200 cursor-pointer group ${
            isLight
              ? 'bg-white hover:bg-zinc-50 border-zinc-300 text-zinc-700'
              : 'bg-[#0E1017]/80 hover:bg-[#141824] backdrop-blur-xl border-white/[0.08] hover:border-white/[0.18] text-[#8E90A0] hover:text-white'
          }`}
          title="View Trashed Playbooks"
        >
          <Trash2 className="w-3.5 h-3.5 text-zinc-400 group-hover:text-rose-500 transition-colors" />
          <span>Trash Bin</span>
          {trashedPlaybooks.length > 0 && (
            <span className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold border ${
              isLight
                ? 'bg-rose-50 border-rose-200 text-rose-700'
                : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
            }`}>
              {trashedPlaybooks.length}
            </span>
          )}
        </button>
      </div>

      {/* CONFIRM MOVE TO TRASH MODAL (Does not delete directly) */}
      <AnimatePresence>
        {playbookToTrash && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.2 }}
              className={`w-full max-w-md rounded-3xl border p-6 shadow-2xl space-y-4 ${
                isLight
                  ? 'bg-white border-zinc-200 text-zinc-900'
                  : 'bg-[#0A0C13]/95 border-white/[0.12] backdrop-blur-2xl text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-rose-500/10 border border-rose-500/25 text-rose-500 shrink-0">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className={`text-base font-bold ${isLight ? 'text-zinc-900' : 'text-white'}`}>Move Playbook to Trash?</h3>
                  <p className={`text-xs mt-0.5 ${isLight ? 'text-zinc-500' : 'text-[#8E90A0]'}`}>
                    "{playbookToTrash.name}"
                  </p>
                </div>
              </div>

              <p className={`text-xs leading-relaxed ${isLight ? 'text-zinc-600' : 'text-[#B2B5C6]'}`}>
                This playbook will be moved to the Trash. You can easily view and restore it at any time from the Trash menu.
              </p>

              <div className={`pt-3 border-t flex justify-end gap-2.5 ${isLight ? 'border-zinc-200' : 'border-white/[0.08]'}`}>
                <button
                  type="button"
                  onClick={() => setPlaybookToTrash(null)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                    isLight
                      ? 'bg-zinc-100 hover:bg-zinc-200/80 text-zinc-700 border-zinc-300'
                      : 'bg-white/[0.05] hover:bg-white/[0.1] text-[#A1A3B4] border-white/[0.08]'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmMoveToTrash}
                  className="px-4.5 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white text-xs font-semibold shadow-lg shadow-rose-600/25 border border-white/10 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Move to Trash</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* TRASH MANAGEMENT MODAL */}
      <AnimatePresence>
        {isTrashModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.2 }}
              className={`w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-3xl border p-6 shadow-2xl space-y-4.5 custom-scrollbar ${
                isLight
                  ? 'bg-white border-zinc-200 text-zinc-900'
                  : 'bg-[#0A0C13]/95 border-white/[0.12] backdrop-blur-2xl text-white'
              }`}
            >
              <div className={`flex items-center justify-between pb-3 border-b ${isLight ? 'border-zinc-200' : 'border-white/[0.08]'}`}>
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-500">
                    <Trash2 className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <h2 className={`text-base font-bold flex items-center gap-2 ${isLight ? 'text-zinc-900' : 'text-white'}`}>
                      Playbook Trash
                      <span className={`text-xs font-mono font-normal ${isLight ? 'text-zinc-500' : 'text-[#8E90A0]'}`}>
                        ({trashedPlaybooks.length} items)
                      </span>
                    </h2>
                    <p className={`text-[11px] ${isLight ? 'text-zinc-500' : 'text-[#717483]'}`}>
                      Restorable items before permanent removal
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {trashedPlaybooks.length > 0 && (
                    <button
                      type="button"
                      onClick={handleEmptyTrash}
                      className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/30 text-xs font-semibold transition-all cursor-pointer"
                    >
                      Empty Trash
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsTrashModalOpen(false)}
                    className={`transition-colors p-1 cursor-pointer ${
                      isLight ? 'text-zinc-400 hover:text-zinc-800' : 'text-[#717483] hover:text-white'
                    }`}
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {trashedPlaybooks.length === 0 ? (
                <div className="py-12 text-center space-y-2.5">
                  <div className={`w-12 h-12 rounded-2xl mx-auto flex items-center justify-center border ${
                    isLight ? 'bg-zinc-100 border-zinc-200 text-zinc-400' : 'bg-white/[0.03] border-white/[0.08] text-[#5A5D70]'
                  }`}>
                    <Trash2 className="w-5 h-5" />
                  </div>
                  <h4 className={`text-sm font-semibold ${isLight ? 'text-zinc-900' : 'text-white'}`}>Trash is Empty</h4>
                  <p className={`text-xs max-w-sm mx-auto ${isLight ? 'text-zinc-500' : 'text-[#717483]'}`}>
                    Playbooks moved to trash will appear here and can be restored back to your active list at any time.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[55vh] overflow-y-auto custom-scrollbar pr-1">
                  {trashedPlaybooks.map(item => (
                    <div
                      key={item.playbook.id}
                      className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 transition-all ${
                        isLight
                          ? 'bg-zinc-50 border-zinc-200 hover:border-zinc-300'
                          : 'bg-white/[0.02] border-white/[0.07] hover:border-white/[0.14]'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          style={{
                            backgroundColor: `${item.playbook.color || '#3B82F6'}15`,
                            borderColor: `${item.playbook.color || '#3B82F6'}35`,
                            color: item.playbook.color || '#3B82F6'
                          }}
                          className="w-10 h-10 rounded-xl border flex items-center justify-center shrink-0"
                        >
                          <span className="text-base">{item.playbook.icon || '🚀'}</span>
                        </div>
                        <div>
                          <h4 className={`text-xs font-bold ${isLight ? 'text-zinc-900' : 'text-white'}`}>{item.playbook.name}</h4>
                          <div className={`flex items-center gap-2 text-[11px] mt-0.5 ${isLight ? 'text-zinc-500' : 'text-[#717483]'}`}>
                            <span>{item.playbook.totalTrades} trades</span>
                            <span>•</span>
                            <span className={`font-mono ${isLight ? 'text-emerald-600' : 'text-[#00E599]'}`}>
                              {formatCurrency(item.playbook.netPnl || 0)}
                            </span>
                            <span>•</span>
                            <span>
                              {new Date(item.trashedAt).toLocaleDateString(undefined, {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleRestorePlaybook(item)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer active:scale-95 ${
                            isLight
                              ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                              : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-[#00E599] border-emerald-500/30'
                          }`}
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Restore</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setPlaybookToPermanentDelete(item.playbook)}
                          className={`p-1.5 rounded-xl border border-transparent transition-all cursor-pointer ${
                            isLight
                              ? 'text-zinc-400 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-200'
                              : 'text-[#717483] hover:text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/20'
                          }`}
                          title="Delete Permanently"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className={`pt-3 border-t flex justify-end ${isLight ? 'border-zinc-200' : 'border-white/[0.08]'}`}>
                <button
                  type="button"
                  onClick={() => setIsTrashModalOpen(false)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                    isLight
                      ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border-zinc-300'
                      : 'bg-white/[0.05] hover:bg-white/[0.1] text-[#A1A3B4] border-white/[0.08]'
                  }`}
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CONFIRM PERMANENT DELETE MODAL */}
      <AnimatePresence>
        {playbookToPermanentDelete && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.15 }}
              className={`w-full max-w-sm rounded-3xl border p-5 shadow-2xl space-y-3.5 ${
                isLight
                  ? 'bg-white border-zinc-200 text-zinc-900'
                  : 'bg-[#0C0E16] border-rose-500/30 text-white'
              }`}
            >
              <div className="flex items-center gap-2.5 text-rose-500">
                <AlertTriangle className="w-5 h-5" />
                <h4 className={`text-sm font-bold ${isLight ? 'text-zinc-900' : 'text-white'}`}>Permanently Delete?</h4>
              </div>
              <p className={`text-xs leading-relaxed ${isLight ? 'text-zinc-600' : 'text-[#B2B5C6]'}`}>
                Are you sure you want to permanently delete "{playbookToPermanentDelete.name}"? This action cannot be undone.
              </p>
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setPlaybookToPermanentDelete(null)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer ${
                    isLight
                      ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700'
                      : 'bg-white/[0.05] hover:bg-white/[0.1] text-[#A1A3B4]'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handlePermanentDelete}
                  className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-lg shadow-rose-600/30 transition-all cursor-pointer"
                >
                  Delete Forever
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* EDIT PLAYBOOK MODAL */}
      <AnimatePresence>
        {editingPlaybook && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.2 }}
              className={`w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border p-6 shadow-2xl space-y-4.5 custom-scrollbar ${
                isLight
                  ? 'bg-white border-zinc-200 text-zinc-900'
                  : 'bg-[#0A0C13]/95 border-white/[0.12] backdrop-blur-2xl text-white'
              }`}
            >
              <div className={`flex items-center justify-between pb-3 border-b ${isLight ? 'border-zinc-200' : 'border-white/[0.08]'}`}>
                <h2 className={`text-base font-bold flex items-center gap-2 ${isLight ? 'text-zinc-900' : 'text-white'}`}>
                  <div className="p-1 rounded-md bg-blue-500/10 border border-blue-500/30 text-blue-500">
                    <Edit2 className="w-4 h-4" />
                  </div>
                  Edit Playbook: {editingPlaybook.name}
                </h2>
                <button
                  type="button"
                  onClick={() => setEditingPlaybook(null)}
                  className={`transition-colors p-1 cursor-pointer ${
                    isLight ? 'text-zinc-400 hover:text-zinc-800' : 'text-[#717483] hover:text-white'
                  }`}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveEditPlaybook} className="space-y-4">
                <div className="space-y-3">
                  <label className={`text-[11px] font-bold uppercase tracking-wider ${isLight ? 'text-zinc-500' : 'text-[#8E90A0]'}`}>
                    General Information
                  </label>
                  <div>
                    <label className={`text-xs mb-1 block ${isLight ? 'text-zinc-700' : 'text-[#A1A3B4]'}`}>Playbook Name</label>
                    <input
                      type="text"
                      required
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      className={`w-full rounded-xl px-3.5 py-2 text-xs transition-colors focus:outline-none focus:border-indigo-500 border ${
                        isLight
                          ? 'bg-zinc-50 border-zinc-300 text-zinc-900 placeholder-zinc-400'
                          : 'bg-[#06070B] border-white/[0.1] text-white placeholder-[#5A5C69]'
                      }`}
                    />
                  </div>

                  <div className={`p-3.5 rounded-2xl border space-y-3.5 ${
                    isLight
                      ? 'bg-[#F8F9FB] border-zinc-200'
                      : 'bg-white/[0.02] border-white/[0.08]'
                  }`}>
                    {/* Icon / Emoji Selection + Custom Emoji Input */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className={`text-xs font-bold uppercase tracking-wider ${isLight ? 'text-zinc-700' : 'text-[#A1A3B4]'}`}>
                          Icon / Emoji
                        </label>
                        <span className={`text-[10px] ${isLight ? 'text-zinc-400' : 'text-[#717483]'}`}>Choose preset or enter custom emoji</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {['🚀', '🟧', '🔄', '⚡', '🎯', '🌊', '📈', '📊', '🔥', '💎', '🛡️', '🧠'].map(emoji => (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => setEditIcon(emoji)}
                            className={`text-base w-8 h-8 rounded-xl border flex items-center justify-center transition-all cursor-pointer ${
                              editIcon === emoji
                                ? 'border-indigo-500 bg-indigo-500/20 scale-105 shadow-md ring-1 ring-indigo-500/50'
                                : isLight
                                ? 'border-zinc-300 bg-white hover:border-zinc-400 hover:bg-zinc-100'
                                : 'border-white/[0.08] bg-[#06070B] hover:border-white/[0.2] hover:bg-white/[0.05]'
                            }`}
                          >
                            {emoji}
                          </button>
                        ))}
                        <div className={`flex items-center gap-1.5 pl-2 ml-1 border-l ${isLight ? 'border-zinc-300' : 'border-white/[0.12]'}`}>
                          <span className={`text-[11px] font-semibold ${isLight ? 'text-zinc-600' : 'text-[#8E90A0]'}`}>Custom:</span>
                          <input
                            type="text"
                            value={editIcon}
                            onChange={e => setEditIcon(e.target.value)}
                            placeholder="Emoji"
                            className={`w-16 rounded-xl border px-2 py-1 text-center text-sm font-bold focus:outline-none focus:border-indigo-500 ${
                              isLight
                                ? 'bg-white border-zinc-300 text-zinc-900'
                                : 'bg-[#06070B] border-white/[0.15] text-white'
                            }`}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Accent Color Selection */}
                    <div className={`pt-3 border-t ${isLight ? 'border-zinc-200' : 'border-white/[0.06]'}`}>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className={`text-xs font-bold uppercase tracking-wider ${isLight ? 'text-zinc-700' : 'text-[#A1A3B4]'}`}>
                          Accent Theme Color
                        </label>
                        <span className={`text-[10px] ${isLight ? 'text-zinc-400' : 'text-[#717483]'}`}>Select swatch or pick hex</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {['#3b82f6', '#f59e0b', '#06b6d4', '#ec4899', '#10b981', '#8b5cf6', '#f43f5e', '#a855f7'].map(c => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => setEditColor(c)}
                            style={{ backgroundColor: c }}
                            className={`w-7 h-7 rounded-full border-2 transition-all cursor-pointer ${
                              editColor === c ? 'border-indigo-600 scale-110 shadow-lg ring-2 ring-indigo-400/40' : 'border-transparent opacity-80 hover:opacity-100 hover:scale-105'
                            }`}
                          />
                        ))}
                        <div className={`flex items-center gap-1.5 pl-2 ml-1 border-l ${isLight ? 'border-zinc-300' : 'border-white/[0.12]'}`}>
                          <input
                            type="color"
                            value={editColor}
                            onChange={e => setEditColor(e.target.value)}
                            className="w-7 h-7 rounded-full bg-transparent border-0 cursor-pointer p-0 overflow-hidden"
                            title="Pick Custom Color"
                          />
                          <span className={`text-[10px] font-mono uppercase ${isLight ? 'text-zinc-500' : 'text-[#8E90A0]'}`}>{editColor}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className={`text-xs mb-1 block ${isLight ? 'text-zinc-700' : 'text-[#A1A3B4]'}`}>Setup Thesis / Market Premise</label>
                    <input
                      type="text"
                      value={editDescription}
                      onChange={e => setEditDescription(e.target.value)}
                      className={`w-full rounded-xl px-3.5 py-2 text-xs transition-colors focus:outline-none focus:border-indigo-500 border ${
                        isLight
                          ? 'bg-zinc-50 border-zinc-300 text-zinc-900 placeholder-zinc-400'
                          : 'bg-[#06070B] border-white/[0.1] text-white placeholder-[#5A5C69]'
                      }`}
                    />
                  </div>
                </div>

                {/* Rules Editor */}
                <div className={`space-y-3 pt-3 border-t ${isLight ? 'border-zinc-200' : 'border-white/[0.08]'}`}>
                  <label className={`text-[11px] font-bold uppercase tracking-wider ${isLight ? 'text-zinc-500' : 'text-[#8E90A0]'}`}>
                    Execution Rules
                  </label>
                  <div className="space-y-2 max-h-36 overflow-y-auto custom-scrollbar">
                    {editRules.map(rule => (
                      <div
                        key={rule.id}
                        className={`flex items-center justify-between p-2.5 rounded-xl border text-xs ${
                          isLight
                            ? 'bg-zinc-50 border-zinc-200'
                            : 'bg-[#06070B] border-white/[0.08]'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                            isLight
                              ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                              : 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                          }`}>
                            {rule.category}
                          </span>
                          <span className={isLight ? 'text-zinc-800' : 'text-[#E1E3EB]'}>{rule.text}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveEditRule(rule.id)}
                          className="text-zinc-400 hover:text-rose-500 p-1 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <select
                      value={newEditRuleCategory}
                      onChange={e => setNewEditRuleCategory(e.target.value as any)}
                      className={`rounded-lg px-2 py-2 text-xs focus:outline-none border ${
                        isLight
                          ? 'bg-zinc-50 border-zinc-300 text-zinc-900'
                          : 'bg-[#06070B] border-white/[0.1] text-[#E1E3EB]'
                      }`}
                    >
                      <option value="MARKET">MARKET</option>
                      <option value="ENTRY">ENTRY</option>
                      <option value="RISK">RISK</option>
                      <option value="EXIT">EXIT</option>
                    </select>
                    <input
                      type="text"
                      placeholder="Add new rule requirement..."
                      value={newEditRuleText}
                      onChange={e => setNewEditRuleText(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddEditRule();
                        }
                      }}
                      className={`flex-1 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 border ${
                        isLight
                          ? 'bg-zinc-50 border-zinc-300 text-zinc-900 placeholder-zinc-400'
                          : 'bg-[#06070B] border-white/[0.1] text-white placeholder-[#5A5C69]'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={handleAddEditRule}
                      className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                        isLight
                          ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border-zinc-300'
                          : 'bg-white/[0.08] hover:bg-white/[0.14] text-white border-white/[0.1]'
                      }`}
                    >
                      + Add
                    </button>
                  </div>
                </div>

                <div className={`pt-3.5 border-t flex justify-end gap-2 ${isLight ? 'border-zinc-200' : 'border-white/[0.08]'}`}>
                  <button
                    type="button"
                    onClick={() => setEditingPlaybook(null)}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                      isLight
                        ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border-zinc-300'
                        : 'bg-white/[0.05] hover:bg-white/[0.1] text-[#A1A3B4] border-white/[0.08]'
                    }`}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/25 border border-white/10 transition-all cursor-pointer"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CREATE PLAYBOOK MODAL */}
      <AnimatePresence>
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.2 }}
              className={`w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border p-6 shadow-2xl space-y-4.5 custom-scrollbar ${
                isLight
                  ? 'bg-white border-zinc-200 text-zinc-900'
                  : 'bg-[#0A0C13]/95 border-white/[0.12] backdrop-blur-2xl text-white'
              }`}
            >
              <div className={`flex items-center justify-between pb-3 border-b ${isLight ? 'border-zinc-200' : 'border-white/[0.08]'}`}>
                <h2 className={`text-base font-bold flex items-center gap-2 ${isLight ? 'text-zinc-900' : 'text-white'}`}>
                  <div className="p-1 rounded-md bg-blue-500/10 border border-blue-500/30 text-blue-500">
                    <BookmarkCheck className="w-4 h-4" />
                  </div>
                  Create A+ Trading Playbook
                </h2>
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className={`transition-colors p-1 cursor-pointer ${
                    isLight ? 'text-zinc-400 hover:text-zinc-800' : 'text-[#717483] hover:text-white'
                  }`}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreatePlaybook} className="space-y-4">
                {/* General Information */}
                <div className="space-y-3">
                  <label className={`text-[11px] font-bold uppercase tracking-wider ${isLight ? 'text-zinc-500' : 'text-[#8E90A0]'}`}>
                    General Information
                  </label>
                  <div>
                    <label className={`text-xs mb-1 block ${isLight ? 'text-zinc-700' : 'text-[#A1A3B4]'}`}>Playbook Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Absorption Reversal, Opening Drive, VWAP Pullback"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      className={`w-full rounded-xl px-3.5 py-2 text-xs transition-colors focus:outline-none focus:border-indigo-500 border ${
                        isLight
                          ? 'bg-zinc-50 border-zinc-300 text-zinc-900 placeholder-zinc-400'
                          : 'bg-[#06070B] border-white/[0.1] text-white placeholder-[#5A5C69]'
                      }`}
                    />
                  </div>

                  <div className={`p-3.5 rounded-2xl border space-y-3.5 ${
                    isLight
                      ? 'bg-[#F8F9FB] border-zinc-200'
                      : 'bg-white/[0.02] border-white/[0.08]'
                  }`}>
                    {/* Icon / Emoji Selection + Custom Emoji Input */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className={`text-xs font-bold uppercase tracking-wider ${isLight ? 'text-zinc-700' : 'text-[#A1A3B4]'}`}>
                          Icon / Emoji
                        </label>
                        <span className={`text-[10px] ${isLight ? 'text-zinc-400' : 'text-[#717483]'}`}>Choose preset or enter custom emoji</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {['🚀', '🟧', '🔄', '⚡', '🎯', '🌊', '📈', '📊', '🔥', '💎', '🛡️', '🧠'].map(emoji => (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => setIcon(emoji)}
                            className={`text-base w-8 h-8 rounded-xl border flex items-center justify-center transition-all cursor-pointer ${
                              icon === emoji
                                ? 'border-indigo-500 bg-indigo-500/20 scale-105 shadow-md ring-1 ring-indigo-500/50'
                                : isLight
                                ? 'border-zinc-300 bg-white hover:border-zinc-400 hover:bg-zinc-100'
                                : 'border-white/[0.08] bg-[#06070B] hover:border-white/[0.2] hover:bg-white/[0.05]'
                            }`}
                          >
                            {emoji}
                          </button>
                        ))}
                        <div className={`flex items-center gap-1.5 pl-2 ml-1 border-l ${isLight ? 'border-zinc-300' : 'border-white/[0.12]'}`}>
                          <span className={`text-[11px] font-semibold ${isLight ? 'text-zinc-600' : 'text-[#8E90A0]'}`}>Custom:</span>
                          <input
                            type="text"
                            value={icon}
                            onChange={e => setIcon(e.target.value)}
                            placeholder="Emoji"
                            className={`w-16 rounded-xl border px-2 py-1 text-center text-sm font-bold focus:outline-none focus:border-indigo-500 ${
                              isLight
                                ? 'bg-white border-zinc-300 text-zinc-900'
                                : 'bg-[#06070B] border-white/[0.15] text-white'
                            }`}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Accent Color Selection */}
                    <div className={`pt-3 border-t ${isLight ? 'border-zinc-200' : 'border-white/[0.06]'}`}>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className={`text-xs font-bold uppercase tracking-wider ${isLight ? 'text-zinc-700' : 'text-[#A1A3B4]'}`}>
                          Accent Theme Color
                        </label>
                        <span className={`text-[10px] ${isLight ? 'text-zinc-400' : 'text-[#717483]'}`}>Select swatch or pick hex</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {['#3b82f6', '#f59e0b', '#06b6d4', '#ec4899', '#10b981', '#8b5cf6', '#f43f5e', '#a855f7'].map(c => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => setColor(c)}
                            style={{ backgroundColor: c }}
                            className={`w-7 h-7 rounded-full border-2 transition-all cursor-pointer ${
                              color === c ? 'border-indigo-600 scale-110 shadow-lg ring-2 ring-indigo-400/40' : 'border-transparent opacity-80 hover:opacity-100 hover:scale-105'
                            }`}
                          />
                        ))}
                        <div className={`flex items-center gap-1.5 pl-2 ml-1 border-l ${isLight ? 'border-zinc-300' : 'border-white/[0.12]'}`}>
                          <input
                            type="color"
                            value={color}
                            onChange={e => setColor(e.target.value)}
                            className="w-7 h-7 rounded-full bg-transparent border-0 cursor-pointer p-0 overflow-hidden"
                            title="Pick Custom Color"
                          />
                          <span className={`text-[10px] font-mono uppercase ${isLight ? 'text-zinc-500' : 'text-[#8E90A0]'}`}>{color}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className={`text-xs mb-1 block ${isLight ? 'text-zinc-700' : 'text-[#A1A3B4]'}`}>Setup Thesis / Market Premise</label>
                    <input
                      type="text"
                      placeholder="e.g. We are approaching or trading at a high timeframe liquidity zone"
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                      className={`w-full rounded-xl px-3.5 py-2 text-xs transition-colors focus:outline-none focus:border-indigo-500 border ${
                        isLight
                          ? 'bg-zinc-50 border-zinc-300 text-zinc-900 placeholder-zinc-400'
                          : 'bg-[#06070B] border-white/[0.1] text-white placeholder-[#5A5C69]'
                      }`}
                    />
                  </div>
                </div>

                {/* Trading Playbook Rules Builder */}
                <div className={`space-y-3 pt-3 border-t ${isLight ? 'border-zinc-200' : 'border-white/[0.08]'}`}>
                  <label className={`text-[11px] font-bold uppercase tracking-wider ${isLight ? 'text-zinc-500' : 'text-[#8E90A0]'}`}>
                    Playbook Execution Rules
                  </label>
                  <p className={`text-[11px] ${isLight ? 'text-zinc-500' : 'text-[#717483]'}`}>
                    List your strict non-negotiable rules to calculate rules-followed discipline scores.
                  </p>

                  {/* Existing Rules List */}
                  <div className="space-y-2 max-h-36 overflow-y-auto custom-scrollbar">
                    {rules.map(rule => (
                      <div
                        key={rule.id}
                        className={`flex items-center justify-between p-2.5 rounded-xl border text-xs ${
                          isLight
                            ? 'bg-zinc-50 border-zinc-200'
                            : 'bg-[#06070B] border-white/[0.08]'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                            isLight
                              ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                              : 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                          }`}>
                            {rule.category}
                          </span>
                          <span className={isLight ? 'text-zinc-800' : 'text-[#E1E3EB]'}>{rule.text}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveRule(rule.id)}
                          className="text-zinc-400 hover:text-rose-500 p-1 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Add Rule Input Row */}
                  <div className="flex items-center gap-2 pt-1">
                    <select
                      value={newRuleCategory}
                      onChange={e => setNewRuleCategory(e.target.value as any)}
                      className={`rounded-lg px-2 py-2 text-xs focus:outline-none border ${
                        isLight
                          ? 'bg-zinc-50 border-zinc-300 text-zinc-900'
                          : 'bg-[#06070B] border-white/[0.1] text-[#E1E3EB]'
                      }`}
                    >
                      <option value="MARKET">MARKET</option>
                      <option value="ENTRY">ENTRY</option>
                      <option value="RISK">RISK</option>
                      <option value="EXIT">EXIT</option>
                    </select>
                    <input
                      type="text"
                      placeholder="Enter rule requirement..."
                      value={newRuleText}
                      onChange={e => setNewRuleText(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddRule();
                        }
                      }}
                      className={`flex-1 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 border ${
                        isLight
                          ? 'bg-zinc-50 border-zinc-300 text-zinc-900 placeholder-zinc-400'
                          : 'bg-[#06070B] border-white/[0.1] text-white placeholder-[#5A5C69]'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={handleAddRule}
                      className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                        isLight
                          ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border-zinc-300'
                          : 'bg-white/[0.08] hover:bg-white/[0.14] text-white border-white/[0.1]'
                      }`}
                    >
                      + Add
                    </button>
                  </div>
                </div>

                <div className={`pt-3.5 border-t flex justify-end gap-2 ${isLight ? 'border-zinc-200' : 'border-white/[0.08]'}`}>
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                      isLight
                        ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border-zinc-300'
                        : 'bg-white/[0.05] hover:bg-white/[0.1] text-[#A1A3B4] border-white/[0.08]'
                    }`}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/25 border border-white/10 transition-all cursor-pointer"
                  >
                    Create Playbook
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* RULE CHECKER POPUP MODAL */}
      <AnimatePresence>
        {activeChecklistPlaybook && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.2 }}
              className={`w-full max-w-md rounded-3xl border p-5 shadow-2xl space-y-4 ${
                isLight
                  ? 'bg-white border-zinc-200 text-zinc-900'
                  : 'bg-[#0A0C13]/95 border-white/[0.12] backdrop-blur-2xl text-white'
              }`}
            >
              <div className={`flex items-center justify-between pb-2.5 border-b ${isLight ? 'border-zinc-200' : 'border-white/[0.08]'}`}>
                <div className="flex items-center gap-2.5">
                  <span className="text-xl">{activeChecklistPlaybook.icon}</span>
                  <div>
                    <h3 className={`text-sm font-bold ${isLight ? 'text-zinc-900' : 'text-white'}`}>{activeChecklistPlaybook.name}</h3>
                    <p className={`text-[11px] ${isLight ? 'text-zinc-500' : 'text-[#717483]'}`}>A+ Setup Discipline Checklist</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveChecklistPlaybook(null)}
                  className={`transition-colors p-1 cursor-pointer ${
                    isLight ? 'text-zinc-400 hover:text-zinc-800' : 'text-[#717483] hover:text-white'
                  }`}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Rules Followed Progress Bar */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className={`font-semibold ${isLight ? 'text-zinc-600' : 'text-[#8E90A0]'}`}>Rules Followed</span>
                  <span className={`font-mono font-bold ${isLight ? 'text-emerald-600' : 'text-[#00E599]'}`}>
                    {Object.values(checkedRules).filter(Boolean).length} / {(activeChecklistPlaybook.rules || []).length}
                  </span>
                </div>
                <div className={`h-2 w-full rounded-full overflow-hidden ${isLight ? 'bg-zinc-100' : 'bg-white/[0.08]'}`}>
                  <div
                    style={{
                      width: `${(Object.values(checkedRules).filter(Boolean).length / ((activeChecklistPlaybook.rules || []).length || 1)) * 100}%`,
                    }}
                    className="h-full bg-gradient-to-r from-emerald-500 to-[#00E599] rounded-full transition-all duration-300"
                  />
                </div>
              </div>

              {/* Checklist items by category */}
              <div className="space-y-3 py-1 max-h-60 overflow-y-auto custom-scrollbar">
                {['MARKET', 'ENTRY', 'RISK', 'EXIT'].map(cat => {
                  const catRules = (activeChecklistPlaybook.rules || []).filter(r => r.category === cat);
                  if (catRules.length === 0) return null;
                  return (
                    <div key={cat} className="space-y-1.5">
                      <div className={`text-[10px] font-bold uppercase tracking-wider ${isLight ? 'text-zinc-400' : 'text-[#646777]'}`}>
                        {cat}
                      </div>
                      {catRules.map(r => {
                        const isChecked = !!checkedRules[r.id];
                        return (
                          <div
                            key={r.id}
                            onClick={() => setCheckedRules(prev => ({ ...prev, [r.id]: !prev[r.id] }))}
                            className={`flex items-center gap-2.5 p-2 rounded-xl border cursor-pointer text-xs transition-all ${
                              isChecked
                                ? isLight
                                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900 font-medium'
                                  : 'bg-emerald-500/10 border-emerald-500/30 text-white font-medium'
                                : isLight
                                ? 'bg-zinc-50 border-zinc-200 hover:border-zinc-300 text-zinc-600'
                                : 'bg-[#06070B] border-white/[0.06] hover:border-white/[0.15] text-[#8E90A0]'
                            }`}
                          >
                            {isChecked ? (
                              <CheckSquare className={`w-4 h-4 shrink-0 ${isLight ? 'text-emerald-600' : 'text-[#00E599]'}`} />
                            ) : (
                              <Square className={`w-4 h-4 shrink-0 ${isLight ? 'text-zinc-400' : 'text-[#4E5162]'}`} />
                            )}
                            <span className={isChecked ? (isLight ? 'text-zinc-900' : 'text-white') : (isLight ? 'text-zinc-600' : 'text-[#8E90A0]')}>{r.text}</span>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>

              <div className={`pt-2.5 border-t flex justify-end ${isLight ? 'border-zinc-200' : 'border-white/[0.08]'}`}>
                <button
                  type="button"
                  onClick={() => {
                    setActiveChecklistPlaybook(null);
                    addToast('Rules Verified', 'Discipline score logged for this execution', 'success');
                  }}
                  className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/20 border border-white/10 transition-all cursor-pointer"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
