import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Plus,
  BookmarkCheck,
  Lock,
  Globe,
  MoreVertical,
  X,
  CheckSquare,
  Square,
  Trash2,
  Edit2,
  Copy,
  Zap,
  Target,
  TrendingUp,
  Activity,
  Crosshair,
  ChevronDown,
  RotateCcw,
  AlertTriangle,
  ArrowRight
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
  if (n.includes('drive') || n.includes('breakout') || n.includes('🚀') || n.includes('lightning') || n.includes('⚡')) return Zap;
  if (n.includes('absorption') || n.includes('reversal') || n.includes('🔄') || n.includes('target') || n.includes('🎯')) return Target;
  if (n.includes('trend') || n.includes('continuation') || n.includes('📈')) return TrendingUp;
  if (n.includes('vwap') || n.includes('bounce') || n.includes('crosshair')) return Crosshair;
  if (n.includes('fomo') || n.includes('impulse') || n.includes('activity')) return Activity;
  return BookmarkCheck;
};

const getCategoryColor = (category?: string) => {
  switch (category?.toUpperCase()) {
    case 'MARKET':
      return 'text-[#9CA3AF]';
    case 'ENTRY':
      return 'text-[#818CF8]';
    case 'EXIT':
      return 'text-[#38BDF8]';
    case 'RISK':
      return 'text-[#F59E0B]';
    case 'MANAGEMENT':
      return 'text-[#A78BFA]';
    default:
      return 'text-[#9CA3AF]';
  }
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
    setIsAddTradeOpen,
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

  // Form State for new playbook with natural trader default rules
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('⚡');
  const [color, setColor] = useState('#6366F1');
  const [description, setDescription] = useState('');
  const [whenToTrade, setWhenToTrade] = useState('');
  const [rules, setRules] = useState<PlaybookRule[]>([
    { id: 'r-1', text: 'Price taps or sweeps the higher-timeframe level', category: 'MARKET', required: true },
    { id: 'r-2', text: '5m structure shift with volume confirmation', category: 'ENTRY', required: true },
    { id: 'r-3', text: 'Stop goes beyond the invalidation wick', category: 'RISK', required: true },
    { id: 'r-4', text: 'Take profit at opposing liquidity pool (minimum 2.0R)', category: 'EXIT', required: true },
  ]);
  const [newRuleText, setNewRuleText] = useState('');
  const [newRuleCategory, setNewRuleCategory] = useState<'ENTRY' | 'EXIT' | 'RISK' | 'MARKET' | 'MANAGEMENT'>('ENTRY');

  // Edit form state
  const [editName, setEditName] = useState('');
  const [editIcon, setEditIcon] = useState('⚡');
  const [editColor, setEditColor] = useState('#6366F1');
  const [editDescription, setEditDescription] = useState('');
  const [editWhenToTrade, setEditWhenToTrade] = useState('');
  const [editRules, setEditRules] = useState<PlaybookRule[]>([]);
  const [newEditRuleText, setNewEditRuleText] = useState('');
  const [newEditRuleCategory, setNewEditRuleCategory] = useState<'ENTRY' | 'EXIT' | 'RISK' | 'MARKET' | 'MANAGEMENT'>('ENTRY');

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
      icon: icon || '⚡',
      color: color || '#6366F1',
      description: description.trim(), // Optional: never inject placeholder filler
      whenToTrade: whenToTrade.trim(),
      status: 'A_PLUS',
      rules: finalRules,
      exampleScreenshots: [],
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
    setWhenToTrade('');
    setNewRuleText('');
    setIcon('⚡');
    setColor('#6366F1');
    setRules([
      { id: 'r-1', text: 'Price taps or sweeps the higher-timeframe level', category: 'MARKET', required: true },
      { id: 'r-2', text: '5m structure shift with volume confirmation', category: 'ENTRY', required: true },
      { id: 'r-3', text: 'Stop goes beyond the invalidation wick', category: 'RISK', required: true },
      { id: 'r-4', text: 'Take profit at opposing liquidity pool (minimum 2.0R)', category: 'EXIT', required: true },
    ]);
    addToast('Playbook Created', `"${name}" playbook successfully created`, 'success');
  };

  const handleOpenEdit = (pb: Playbook) => {
    setEditingPlaybook(pb);
    setEditName(pb.name);
    setEditIcon(pb.icon || '⚡');
    setEditColor(pb.color || '#6366F1');
    setEditDescription(pb.description || '');
    setEditWhenToTrade(pb.whenToTrade || '');
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
      icon: editIcon || '⚡',
      color: editColor || '#6366F1',
      description: editDescription.trim(),
      whenToTrade: editWhenToTrade.trim(),
      rules: finalRules,
    };

    updatePlaybook(updated);
    setEditingPlaybook(null);
    setNewEditRuleText('');
    addToast('Playbook Updated', `"${editName}" updated successfully`, 'success');
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

    setTrashedPlaybooks(prev => [
      {
        playbook: playbookToTrash,
        trashedAt: new Date().toISOString()
      },
      ...prev.filter(t => t.playbook.id !== playbookToTrash.id)
    ]);

    deletePlaybook(playbookToTrash.id);
    addToast('Moved to Trash', `"${playbookToTrash.name}" moved to Trash. You can restore it anytime.`, 'info');
    setPlaybookToTrash(null);
    setActiveMenuPlaybookId(null);
  };

  const handleRestorePlaybook = (item: TrashedPlaybookItem) => {
    addPlaybook(item.playbook);
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
    <div className={`relative w-full max-w-[1320px] mx-auto space-y-6 pb-8 ${
      isLight ? 'text-zinc-900' : 'text-[#F3F4F6]'
    }`}>
      {/* Top Header Bar */}
      <div className={`flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl border ${
        isLight
          ? 'bg-white border-zinc-200 shadow-xs'
          : 'bg-[#0B0D10] border-[#1C2027]'
      }`}>
        <div className="text-left">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              isLight ? 'bg-indigo-50 text-indigo-600' : 'bg-[#101318] border border-[#1C2027] text-[#818CF8]'
            }`}>
              <BookmarkCheck className="w-4 h-4" />
            </div>
            <h1 className={`text-lg sm:text-xl font-semibold tracking-tight ${isLight ? 'text-zinc-900' : 'text-[#F3F4F6]'}`}>
              Strategy Playbooks
            </h1>
          </div>
          <p className={`text-xs mt-1 ml-10.5 ${isLight ? 'text-zinc-500' : 'text-[#9CA3AF]'}`}>
            Trading setups, execution rules, and strategy performance.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Create Playbook Action Button */}
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-1.5 rounded-xl bg-[#6366F1] hover:bg-[#4F46E5] text-white px-4 py-2 text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Playbook</span>
          </button>

          {/* Sort Selector */}
          <div className="relative">
            <div className={`flex items-center gap-1.5 text-xs rounded-xl px-3 py-2 border transition-all ${
              isLight
                ? 'bg-white border-zinc-300 text-zinc-700'
                : 'bg-[#080A0D] border-[#1C2027] text-[#C2C7D0]'
            }`}>
              <span className={isLight ? 'text-zinc-500' : 'text-[#6B7280]'}>Sort:</span>
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as any)}
                className={`appearance-none bg-transparent font-medium focus:outline-none cursor-pointer pr-4 ${
                  isLight ? 'text-zinc-900' : 'text-[#F3F4F6]'
                }`}
              >
                <option value="pnl" className={isLight ? 'bg-white text-zinc-900' : 'bg-[#0B0D10] text-[#F3F4F6]'}>Net P&L</option>
                <option value="winrate" className={isLight ? 'bg-white text-zinc-900' : 'bg-[#0B0D10] text-[#F3F4F6]'}>Win Rate</option>
                <option value="trades" className={isLight ? 'bg-white text-zinc-900' : 'bg-[#0B0D10] text-[#F3F4F6]'}>Trades Count</option>
                <option value="name" className={isLight ? 'bg-white text-zinc-900' : 'bg-[#0B0D10] text-[#F3F4F6]'}>Name</option>
              </select>
              <ChevronDown className={`w-3.5 h-3.5 absolute right-2.5 top-3 pointer-events-none ${
                isLight ? 'text-zinc-500' : 'text-[#6B7280]'
              }`} />
            </div>
          </div>
        </div>
      </div>

      {/* Playbook Cards Grid */}
      {sortedPlaybooks.length === 0 ? (
        <div className={`rounded-2xl border p-10 text-center space-y-3 ${
          isLight
            ? 'bg-white border-zinc-200 shadow-xs'
            : 'border-[#1C2027] bg-[#0B0D10]'
        }`}>
          <div className={`w-11 h-11 rounded-xl mx-auto flex items-center justify-center border ${
            isLight ? 'bg-zinc-100 border-zinc-200 text-zinc-600' : 'bg-[#101318] border-[#1C2027] text-[#818CF8]'
          }`}>
            <BookmarkCheck className="w-5 h-5" />
          </div>
          <h3 className={`text-base font-semibold ${isLight ? 'text-zinc-900' : 'text-[#F3F4F6]'}`}>
            No playbooks created yet
          </h3>
          <p className={`text-xs max-w-md mx-auto ${isLight ? 'text-zinc-500' : 'text-[#9CA3AF]'}`}>
            Define the setup rules, entry criteria, and risk parameters you use to trade.
          </p>
          <div className="pt-2 flex justify-center gap-3">
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-[#6366F1] hover:bg-[#4F46E5] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              + Create Playbook
            </button>
            {trashedPlaybooks.length > 0 && (
              <button
                type="button"
                onClick={() => setIsTrashModalOpen(true)}
                className={`px-4 py-2 rounded-xl text-xs font-medium border transition-colors cursor-pointer ${
                  isLight
                    ? 'bg-zinc-100 hover:bg-zinc-200 border-zinc-300 text-zinc-700'
                    : 'bg-[#101318] hover:bg-[#151A20] text-[#C2C7D0] border-[#1C2027]'
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
            const hasTrades = pb.totalTrades > 0;
            const isProfitable = pb.netPnl > 0;
            const isLoss = pb.netPnl < 0;
            const IconComponent = getPlaybookLucideIcon(pb.name, pb.icon);
            const winRatePercent = Math.min(100, Math.max(0, Math.round(pb.winRate || 0)));
            const isMenuOpen = activeMenuPlaybookId === pb.id;

            return (
              <div
                key={pb.id}
                className={`group relative rounded-2xl border p-5 flex flex-col justify-between transition-colors duration-150 text-left ${
                  isLight
                    ? 'bg-white border-zinc-200 shadow-xs hover:border-zinc-300'
                    : 'bg-[#0B0D10] border-[#1C2027] hover:border-[#282E38] hover:bg-[#0E1015]'
                }`}
              >
                <div className="space-y-4">
                  {/* Card Header: Icon, Name, Privacy · Trades, Kebab Menu */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {/* 42-44px restrained icon container */}
                      <div
                        className={`w-11 h-11 rounded-xl border flex items-center justify-center shrink-0 transition-colors ${
                          isLight
                            ? 'bg-zinc-100 border-zinc-200 text-zinc-700'
                            : 'bg-[#101318] border-[#1C2027] text-[#C2C7D0] group-hover:border-[#282E38] group-hover:text-[#F3F4F6]'
                        }`}
                      >
                        <IconComponent className="w-5 h-5" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <h3
                          className={`text-[17px] font-semibold tracking-tight truncate leading-snug ${
                            isLight ? 'text-zinc-900' : 'text-[#F3F4F6]'
                          }`}
                          title={pb.name}
                        >
                          {pb.name}
                        </h3>
                        <div className="flex items-center gap-1.5 mt-0.5 text-[12px] text-[#9CA3AF]">
                          <span>{pb.isPrivate ? 'Private' : 'Shared'}</span>
                          <span aria-hidden="true" className="text-[#6B7280]">·</span>
                          <span className="font-mono">
                            {pb.totalTrades} {pb.totalTrades === 1 ? 'trade' : 'trades'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Context Menu Button */}
                    <div className="relative shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenuPlaybookId(isMenuOpen ? null : pb.id);
                        }}
                        className={`p-1.5 rounded-lg border transition-colors cursor-pointer flex items-center justify-center ${
                          isLight
                            ? 'text-zinc-500 hover:text-zinc-900 bg-zinc-100 hover:bg-zinc-200/80 border-zinc-200'
                            : 'text-[#6B7280] hover:text-[#F3F4F6] bg-[#101318] hover:bg-[#151A20] border-[#1C2027]'
                        }`}
                        title="Playbook Actions"
                        aria-label="Playbook Actions"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      {/* Dropdown Menu */}
                      <AnimatePresence>
                        {isMenuOpen && (
                          <motion.div
                            ref={menuRef}
                            initial={{ opacity: 0, scale: 0.96, y: -4 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.96, y: -4 }}
                            transition={{ duration: 0.12 }}
                            className={`absolute right-0 top-full mt-1.5 z-40 w-44 rounded-xl border shadow-xl p-1 text-xs ${
                              isLight
                                ? 'bg-white border-zinc-200 text-zinc-900'
                                : 'bg-[#0B0E12] border-[#1C2027] text-[#F3F4F6]'
                            }`}
                          >
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenEdit(pb);
                              }}
                              className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer ${
                                isLight
                                  ? 'text-zinc-700 hover:text-zinc-900 hover:bg-zinc-100'
                                  : 'text-[#C2C7D0] hover:text-[#F3F4F6] hover:bg-[#151A20]'
                              }`}
                            >
                              <Edit2 className="w-3.5 h-3.5 text-[#818CF8]" />
                              <span>Edit Playbook</span>
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveMenuPlaybookId(null);
                                duplicatePlaybook(pb.id);
                              }}
                              className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer ${
                                isLight
                                  ? 'text-zinc-700 hover:text-zinc-900 hover:bg-zinc-100'
                                  : 'text-[#C2C7D0] hover:text-[#F3F4F6] hover:bg-[#151A20]'
                              }`}
                            >
                              <Copy className="w-3.5 h-3.5 text-[#818CF8]" />
                              <span>Duplicate</span>
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                openRuleChecker(pb);
                              }}
                              className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer ${
                                isLight
                                  ? 'text-zinc-700 hover:text-zinc-900 hover:bg-zinc-100'
                                  : 'text-[#C2C7D0] hover:text-[#F3F4F6] hover:bg-[#151A20]'
                              }`}
                            >
                              <CheckSquare className="w-3.5 h-3.5 text-[#818CF8]" />
                              <span>Review Rules</span>
                            </button>
                            <div className={`my-1 border-t ${isLight ? 'border-zinc-200' : 'border-[#1C2027]'}`} />
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveMenuPlaybookId(null);
                                setPlaybookToTrash(pb);
                              }}
                              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Move to Trash</span>
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                  {/* Description: ONLY displayed if user actually provided one */}
                  {pb.description && pb.description.trim().length > 0 && (
                    <p className={`text-[13px] line-clamp-2 leading-relaxed ${
                      isLight ? 'text-zinc-600' : 'text-[#9CA3AF]'
                    }`}>
                      {pb.description}
                    </p>
                  )}

                  {/* Rules Section: Compact, Structured Rows with Sequence Numbers */}
                  <div className={`pt-3.5 border-t space-y-2.5 ${
                    isLight ? 'border-zinc-200' : 'border-[#1C2027]'
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-medium ${
                        isLight ? 'text-zinc-500' : 'text-[#9CA3AF]'
                      }`}>
                        Rules · {pb.rules?.length || 0}
                      </span>
                      {pb.rules && pb.rules.length > 0 && (
                        <button
                          type="button"
                          onClick={() => openRuleChecker(pb)}
                          className="text-xs font-medium text-[#818CF8] hover:text-[#A5B4FC] transition-colors cursor-pointer flex items-center gap-1"
                        >
                          <span>Review rules</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>

                    {pb.rules && pb.rules.length > 0 ? (
                      <div className="space-y-1">
                        {pb.rules.slice(0, 3).map((rule, rIdx) => {
                          const seq = String(rIdx + 1).padStart(2, '0');
                          return (
                            <div
                              key={rule.id}
                              className={`py-2 border-b last:border-b-0 space-y-1 ${
                                isLight ? 'border-zinc-100' : 'border-[#1C2027]/70'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-[11px] font-medium text-[#6B7280] select-none shrink-0">
                                  {seq}
                                </span>
                                <span className={`text-[10px] font-semibold tracking-wider uppercase font-mono ${getCategoryColor(rule.category)}`}>
                                  {rule.category}
                                </span>
                              </div>
                              <p className={`text-[13px] leading-snug pl-6 line-clamp-2 ${
                                isLight ? 'text-zinc-800' : 'text-[#D1D5DB]'
                              }`}>
                                {rule.text}
                              </p>
                            </div>
                          );
                        })}
                        {pb.rules.length > 3 && (
                          <button
                            type="button"
                            onClick={() => openRuleChecker(pb)}
                            className={`text-[11px] font-medium transition-colors cursor-pointer pt-1 block ${
                              isLight ? 'text-zinc-500 hover:text-zinc-800' : 'text-[#6B7280] hover:text-[#9CA3AF]'
                            }`}
                          >
                            +{pb.rules.length - 3} more {pb.rules.length - 3 === 1 ? 'rule' : 'rules'} · View all
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className={`text-xs py-2 italic ${isLight ? 'text-zinc-400' : 'text-[#6B7280]'}`}>
                        No rules defined for this setup.
                      </div>
                    )}
                  </div>
                </div>

                {/* Performance Strip / Statistics Section */}
                {!hasTrades ? (
                  /* Clean 0-Trades Empty State with Muted Metric Strip */
                  <div className={`mt-4 pt-3.5 border-t space-y-3 ${
                    isLight ? 'border-zinc-200' : 'border-[#1C2027]'
                  }`}>
                    <div className={`p-3 rounded-xl border text-center ${
                      isLight ? 'bg-zinc-50 border-zinc-200' : 'bg-[#080A0D] border-[#1C2027]'
                    }`}>
                      <div className={`text-xs font-semibold ${isLight ? 'text-zinc-700' : 'text-[#C2C7D0]'}`}>
                        No trades yet
                      </div>
                      <div className={`text-[11px] mt-0.5 leading-normal ${isLight ? 'text-zinc-500' : 'text-[#6B7280]'}`}>
                        Performance will appear here after you log a trade using this playbook.
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsAddTradeOpen(true)}
                        className={`mt-2.5 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors cursor-pointer ${
                          isLight
                            ? 'bg-white hover:bg-zinc-100 text-zinc-700 border-zinc-200'
                            : 'bg-[#101318] hover:bg-[#151A20] text-[#9CA3AF] hover:text-[#F3F4F6] border-[#1C2027]'
                        }`}
                      >
                        <Plus className="w-3 h-3" />
                        <span>Add Trade</span>
                      </button>
                    </div>

                    {/* Muted metrics strip showing dashes */}
                    <div className="space-y-2 pt-0.5">
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <div className="text-[10px] font-semibold uppercase tracking-wider text-[#6B7280]">Win Rate</div>
                          <div className="text-[18px] font-semibold font-mono text-[#6B7280] mt-0.5">—</div>
                        </div>
                        <div>
                          <div className="text-[10px] font-semibold uppercase tracking-wider text-[#6B7280]">Net P&L</div>
                          <div className="text-[18px] font-semibold font-mono text-[#6B7280] mt-0.5">$0</div>
                        </div>
                        <div>
                          <div className="text-[10px] font-semibold uppercase tracking-wider text-[#6B7280]">Trades</div>
                          <div className="text-[18px] font-semibold font-mono text-[#6B7280] mt-0.5">0</div>
                        </div>
                      </div>

                      <div className={`grid grid-cols-4 gap-2 pt-2 border-t text-[11px] ${
                        isLight ? 'border-zinc-100' : 'border-[#1C2027]/60'
                      }`}>
                        <div>
                          <div className="text-[9.5px] uppercase tracking-wider text-[#6B7280]">Profit Factor</div>
                          <div className="font-mono text-[#6B7280] mt-0.5">—</div>
                        </div>
                        <div>
                          <div className="text-[9.5px] uppercase tracking-wider text-[#6B7280]">Expectancy</div>
                          <div className="font-mono text-[#6B7280] mt-0.5">—</div>
                        </div>
                        <div>
                          <div className="text-[9.5px] uppercase tracking-wider text-[#6B7280]">Avg Win</div>
                          <div className="font-mono text-[#6B7280] mt-0.5">—</div>
                        </div>
                        <div>
                          <div className="text-[9.5px] uppercase tracking-wider text-[#6B7280]">Avg Loss</div>
                          <div className="font-mono text-[#6B7280] mt-0.5">—</div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Active Trades Performance Strip */
                  <div className={`mt-4 pt-3.5 border-t space-y-2.5 ${
                    isLight ? 'border-zinc-200' : 'border-[#1C2027]'
                  }`}>
                    {/* Row 1: Win Rate, Net P&L, Total Trades */}
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <div className={`text-xs font-medium ${isLight ? 'text-zinc-500' : 'text-[#9CA3AF]'}`}>
                          Win Rate
                        </div>
                        <div className={`text-[17px] font-semibold font-mono tracking-tight mt-0.5 ${
                          winRatePercent >= 50
                            ? (isLight ? 'text-emerald-600' : 'text-[#10B981]')
                            : (isLight ? 'text-zinc-900' : 'text-[#F3F4F6]')
                        }`}>
                          {pb.winRate}%
                        </div>
                      </div>

                      <div>
                        <div className={`text-xs font-medium ${isLight ? 'text-zinc-500' : 'text-[#9CA3AF]'}`}>
                          Net P&L
                        </div>
                        <div className={`text-[17px] font-semibold font-mono tracking-tight mt-0.5 ${
                          isProfitable
                            ? (isLight ? 'text-emerald-600' : 'text-[#10B981]')
                            : isLoss
                            ? (isLight ? 'text-rose-600' : 'text-[#F43F5E]')
                            : (isLight ? 'text-zinc-900' : 'text-[#F3F4F6]')
                        }`}>
                          {formatCurrency(pb.netPnl)}
                        </div>
                      </div>

                      <div>
                        <div className={`text-xs font-medium ${isLight ? 'text-zinc-500' : 'text-[#9CA3AF]'}`}>
                          Trades
                        </div>
                        <div className={`text-[17px] font-semibold font-mono tracking-tight mt-0.5 ${
                          isLight ? 'text-zinc-900' : 'text-[#F3F4F6]'
                        }`}>
                          {pb.totalTrades}
                        </div>
                      </div>
                    </div>

                    {/* Row 2: Profit Factor, Expectancy, Avg Win, Avg Loss */}
                    <div className={`grid grid-cols-4 gap-2 pt-2 border-t text-xs ${
                      isLight ? 'border-zinc-100' : 'border-[#1C2027]/60'
                    }`}>
                      <div>
                        <div className={`text-[11px] ${isLight ? 'text-zinc-500' : 'text-[#71717A]'}`}>
                          Profit Factor
                        </div>
                        <div className={`font-mono font-medium mt-0.5 ${isLight ? 'text-zinc-800' : 'text-[#C2C7D0]'}`}>
                          {pb.profitFactor != null && pb.profitFactor > 0 ? pb.profitFactor.toFixed(2) : '—'}
                        </div>
                      </div>

                      <div>
                        <div className={`text-[11px] ${isLight ? 'text-zinc-500' : 'text-[#71717A]'}`}>
                          Expectancy
                        </div>
                        <div className={`font-mono font-medium mt-0.5 ${isLight ? 'text-zinc-800' : 'text-[#C2C7D0]'}`}>
                          {pb.expectancy != null ? formatCurrency(pb.expectancy) : '—'}
                        </div>
                      </div>

                      <div>
                        <div className={`text-[11px] ${isLight ? 'text-zinc-500' : 'text-[#71717A]'}`}>
                          Avg Win
                        </div>
                        <div className={`font-mono font-medium mt-0.5 ${isLight ? 'text-emerald-600' : 'text-[#10B981]'}`}>
                          {pb.avgWinner ? formatCurrency(Math.round(pb.avgWinner)) : '—'}
                        </div>
                      </div>

                      <div>
                        <div className={`text-[9.5px] uppercase tracking-wider ${isLight ? 'text-zinc-500' : 'text-[#6B7280]'}`}>
                          Avg Loss
                        </div>
                        <div className={`font-mono font-medium mt-0.5 ${isLight ? 'text-rose-600' : 'text-[#F43F5E]'}`}>
                          {pb.avgLoser ? formatCurrency(Math.round(pb.avgLoser)) : '—'}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Bottom Utility Bar with Trash Access */}
      <div className={`pt-4 pb-2 flex flex-wrap items-center justify-between gap-3 border-t text-xs ${
        isLight ? 'border-zinc-200 text-zinc-500' : 'border-[#1C2027] text-[#6B7280]'
      }`}>
        <div className="flex items-center gap-2">
          <span className={`font-medium ${isLight ? 'text-zinc-700' : 'text-[#9CA3AF]'}`}>Playbooks</span>
          <span>•</span>
          <span>{playbooks.length} {playbooks.length === 1 ? 'strategy active' : 'strategies active'}</span>
        </div>

        <button
          type="button"
          onClick={() => setIsTrashModalOpen(true)}
          className={`relative flex items-center gap-1.5 text-xs rounded-xl px-3 py-1.5 border transition-colors cursor-pointer ${
            isLight
              ? 'bg-white hover:bg-zinc-50 border-zinc-300 text-zinc-700'
              : 'bg-[#101318] hover:bg-[#151A20] border-[#1C2027] hover:border-[#282E38] text-[#9CA3AF] hover:text-[#F3F4F6]'
          }`}
          title="View Trashed Playbooks"
        >
          <Trash2 className="w-3.5 h-3.5 text-[#6B7280]" />
          <span>Trash Bin</span>
          {trashedPlaybooks.length > 0 && (
            <span className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold border ${
              isLight
                ? 'bg-rose-50 border-rose-200 text-rose-700'
                : 'bg-rose-500/20 text-rose-400 border-rose-500/30'
            }`}>
              {trashedPlaybooks.length}
            </span>
          )}
        </button>
      </div>

      {/* CONFIRM MOVE TO TRASH MODAL */}
      <AnimatePresence>
        {playbookToTrash && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.15 }}
              className={`w-full max-w-md rounded-2xl border p-6 shadow-2xl space-y-4 ${
                isLight
                  ? 'bg-white border-zinc-200 text-zinc-900'
                  : 'bg-[#0B0D10] border-[#1C2027] text-[#F3F4F6]'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 shrink-0">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className={`text-base font-semibold ${isLight ? 'text-zinc-900' : 'text-[#F3F4F6]'}`}>
                    Move Playbook to Trash?
                  </h3>
                  <p className={`text-xs mt-0.5 ${isLight ? 'text-zinc-500' : 'text-[#9CA3AF]'}`}>
                    "{playbookToTrash.name}"
                  </p>
                </div>
              </div>

              <p className={`text-xs leading-relaxed ${isLight ? 'text-zinc-600' : 'text-[#C2C7D0]'}`}>
                This playbook will be moved to the Trash. You can review and restore it at any time from the Trash Bin.
              </p>

              <div className={`pt-3 border-t flex justify-end gap-2.5 ${isLight ? 'border-zinc-200' : 'border-[#1C2027]'}`}>
                <button
                  type="button"
                  onClick={() => setPlaybookToTrash(null)}
                  className={`px-4 py-2 rounded-xl text-xs font-medium border transition-colors cursor-pointer ${
                    isLight
                      ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border-zinc-300'
                      : 'bg-[#101318] hover:bg-[#151A20] text-[#9CA3AF] border-[#1C2027]'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmMoveToTrash}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-medium shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
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
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.15 }}
              className={`w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl border p-6 shadow-2xl space-y-4.5 ${
                isLight
                  ? 'bg-white border-zinc-200 text-zinc-900'
                  : 'bg-[#0B0D10] border-[#1C2027] text-[#F3F4F6]'
              }`}
            >
              <div className={`flex items-center justify-between pb-3 border-b ${isLight ? 'border-zinc-200' : 'border-[#1C2027]'}`}>
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
                    <Trash2 className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <h2 className={`text-base font-semibold flex items-center gap-2 ${isLight ? 'text-zinc-900' : 'text-[#F3F4F6]'}`}>
                      Playbook Trash
                      <span className={`text-xs font-mono font-normal ${isLight ? 'text-zinc-500' : 'text-[#9CA3AF]'}`}>
                        ({trashedPlaybooks.length})
                      </span>
                    </h2>
                    <p className={`text-[11px] ${isLight ? 'text-zinc-500' : 'text-[#6B7280]'}`}>
                      Restorable strategies before permanent deletion
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {trashedPlaybooks.length > 0 && (
                    <button
                      type="button"
                      onClick={handleEmptyTrash}
                      className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-medium transition-colors cursor-pointer"
                    >
                      Empty Trash
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsTrashModalOpen(false)}
                    className={`transition-colors p-1 cursor-pointer ${
                      isLight ? 'text-zinc-400 hover:text-zinc-800' : 'text-[#6B7280] hover:text-[#F3F4F6]'
                    }`}
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {trashedPlaybooks.length === 0 ? (
                <div className="py-12 text-center space-y-2.5">
                  <div className={`w-11 h-11 rounded-xl mx-auto flex items-center justify-center border ${
                    isLight ? 'bg-zinc-100 border-zinc-200 text-zinc-400' : 'bg-[#101318] border-[#1C2027] text-[#6B7280]'
                  }`}>
                    <Trash2 className="w-5 h-5" />
                  </div>
                  <h4 className={`text-sm font-semibold ${isLight ? 'text-zinc-900' : 'text-[#F3F4F6]'}`}>Trash is Empty</h4>
                  <p className={`text-xs max-w-sm mx-auto ${isLight ? 'text-zinc-500' : 'text-[#6B7280]'}`}>
                    Playbooks moved to trash will appear here and can be restored back to your active list at any time.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[55vh] overflow-y-auto pr-1">
                  {trashedPlaybooks.map(item => (
                    <div
                      key={item.playbook.id}
                      className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 transition-colors ${
                        isLight
                          ? 'bg-zinc-50 border-zinc-200 hover:border-zinc-300'
                          : 'bg-[#080A0D] border-[#1C2027] hover:border-[#282E38]'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${
                          isLight ? 'bg-zinc-100 border-zinc-200 text-zinc-700' : 'bg-[#101318] border-[#1C2027] text-[#C2C7D0]'
                        }`}>
                          <BookmarkCheck className="w-4.5 h-4.5" />
                        </div>
                        <div>
                          <h4 className={`text-xs font-semibold ${isLight ? 'text-zinc-900' : 'text-[#F3F4F6]'}`}>
                            {item.playbook.name}
                          </h4>
                          <div className={`flex items-center gap-2 text-[11px] mt-0.5 ${isLight ? 'text-zinc-500' : 'text-[#6B7280]'}`}>
                            <span>{item.playbook.totalTrades} trades</span>
                            <span>•</span>
                            <span className="font-mono text-emerald-400">
                              {formatCurrency(item.playbook.netPnl || 0)}
                            </span>
                            <span>•</span>
                            <span>
                              {new Date(item.trashedAt).toLocaleDateString(undefined, {
                                month: 'short',
                                day: 'numeric',
                              })}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleRestorePlaybook(item)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-colors cursor-pointer ${
                            isLight
                              ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                              : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-[#10B981] border-emerald-500/30'
                          }`}
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Restore</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setPlaybookToPermanentDelete(item.playbook)}
                          className={`p-1.5 rounded-xl border border-transparent transition-colors cursor-pointer ${
                            isLight
                              ? 'text-zinc-400 hover:text-rose-600 hover:bg-rose-50'
                              : 'text-[#6B7280] hover:text-rose-400 hover:bg-rose-500/10'
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

              <div className={`pt-3 border-t flex justify-end ${isLight ? 'border-zinc-200' : 'border-[#1C2027]'}`}>
                <button
                  type="button"
                  onClick={() => setIsTrashModalOpen(false)}
                  className={`px-4 py-2 rounded-xl text-xs font-medium border transition-colors cursor-pointer ${
                    isLight
                      ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border-zinc-300'
                      : 'bg-[#101318] hover:bg-[#151A20] text-[#9CA3AF] border-[#1C2027]'
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
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.12 }}
              className={`w-full max-w-sm rounded-2xl border p-5 shadow-2xl space-y-3.5 ${
                isLight
                  ? 'bg-white border-zinc-200 text-zinc-900'
                  : 'bg-[#0B0D10] border-rose-500/30 text-[#F3F4F6]'
              }`}
            >
              <div className="flex items-center gap-2.5 text-rose-400">
                <AlertTriangle className="w-5 h-5" />
                <h4 className={`text-sm font-semibold ${isLight ? 'text-zinc-900' : 'text-[#F3F4F6]'}`}>
                  Permanently Delete?
                </h4>
              </div>
              <p className={`text-xs leading-relaxed ${isLight ? 'text-zinc-600' : 'text-[#C2C7D0]'}`}>
                Are you sure you want to permanently delete "{playbookToPermanentDelete.name}"? This action cannot be undone.
              </p>
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setPlaybookToPermanentDelete(null)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium cursor-pointer ${
                    isLight
                      ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700'
                      : 'bg-[#101318] hover:bg-[#151A20] text-[#9CA3AF]'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handlePermanentDelete}
                  className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
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
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.98, y: 6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 6 }}
              transition={{ duration: 0.15 }}
              className={`w-full max-w-2xl max-h-[86vh] flex flex-col rounded-2xl border shadow-2xl overflow-hidden ${
                isLight
                  ? 'bg-white border-zinc-200 text-zinc-900'
                  : 'bg-[#0B0D10] border-[#1C2027] text-[#F3F4F6]'
              }`}
            >
              {/* Header */}
              <div className={`px-6 py-4.5 border-b flex items-center justify-between shrink-0 ${
                isLight ? 'border-zinc-200 bg-zinc-50' : 'border-[#1C2027] bg-[#06080B]'
              }`}>
                <div>
                  <h2 className={`text-base font-semibold tracking-tight ${isLight ? 'text-zinc-900' : 'text-[#F3F4F6]'}`}>
                    Edit Playbook
                  </h2>
                  <p className={`text-xs mt-0.5 ${isLight ? 'text-zinc-500' : 'text-[#9CA3AF]'}`}>
                    Define the setup, rules, and risk parameters for this strategy.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingPlaybook(null)}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                    isLight ? 'text-zinc-400 hover:text-zinc-700' : 'text-[#6B7280] hover:text-[#F3F4F6]'
                  }`}
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable Form Body */}
              <form onSubmit={handleSaveEditPlaybook} className="flex-1 overflow-y-auto p-6 space-y-5">
                {/* SECTION 1: BASIC INFORMATION */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className={`text-[11px] font-semibold uppercase tracking-wider ${isLight ? 'text-zinc-500' : 'text-[#9CA3AF]'}`}>
                      Basic Information
                    </h3>

                    {/* Restrained optional styling controls */}
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-xs ${isLight ? 'text-zinc-500' : 'text-[#6B7280]'}`}>Icon</span>
                        <select
                          value={editIcon}
                          onChange={(e) => setEditIcon(e.target.value)}
                          className={`text-xs rounded-lg px-2 py-1 border transition-colors cursor-pointer focus:outline-none ${
                            isLight
                              ? 'bg-zinc-50 border-zinc-300 text-zinc-800 focus:border-[#6366F1]'
                              : 'bg-[#080A0D] border-[#1C2027] text-[#F3F4F6] focus:border-[#6366F1]'
                          }`}
                        >
                          <option value="⚡">⚡ Breakout</option>
                          <option value="🎯">🎯 Reversal</option>
                          <option value="📈">📈 Trend</option>
                          <option value="🔄">🔄 Pullback</option>
                          <option value="📊">📊 Volume</option>
                          <option value="🛡️">🛡️ Defense</option>
                        </select>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className={`text-xs ${isLight ? 'text-zinc-500' : 'text-[#6B7280]'}`}>Accent</span>
                        <div className="flex items-center gap-1.5">
                          <span
                            className="w-3.5 h-3.5 rounded-full border border-white/20 shrink-0"
                            style={{ backgroundColor: editColor }}
                          />
                          <input
                            type="color"
                            value={editColor}
                            onChange={(e) => setEditColor(e.target.value)}
                            className="w-5 h-5 rounded cursor-pointer bg-transparent border-0 p-0"
                            title="Accent color"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Playbook Name */}
                  <div>
                    <label className={`text-xs font-medium block mb-1.5 ${isLight ? 'text-zinc-700' : 'text-[#A7ADB7]'}`}>
                      Playbook Name
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. London session breakout"
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      className={`w-full rounded-xl px-3.5 py-2.5 text-xs transition-colors focus:outline-none border ${
                        isLight
                          ? 'bg-zinc-50 border-zinc-300 text-zinc-900 placeholder-zinc-400 focus:border-[#6366F1]'
                          : 'bg-[#080A0D] border-[#1C2027] text-[#F3F4F6] placeholder-[#5E6570] focus:border-[#6366F1]'
                      }`}
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label className={`text-xs font-medium block mb-1.5 ${isLight ? 'text-zinc-700' : 'text-[#A7ADB7]'}`}>
                      Description <span className="text-[#6B7280] font-normal">(Optional)</span>
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Briefly describe when and why you take this setup..."
                      value={editDescription}
                      onChange={e => setEditDescription(e.target.value)}
                      className={`w-full rounded-xl px-3.5 py-2 text-xs leading-relaxed transition-colors focus:outline-none resize-none border ${
                        isLight
                          ? 'bg-zinc-50 border-zinc-300 text-zinc-900 placeholder-zinc-400 focus:border-[#6366F1]'
                          : 'bg-[#080A0D] border-[#1C2027] text-[#F3F4F6] placeholder-[#5E6570] focus:border-[#6366F1]'
                      }`}
                    />
                  </div>

                  {/* When I Trade It */}
                  <div>
                    <label className={`text-xs font-medium block mb-1.5 ${isLight ? 'text-zinc-700' : 'text-[#A7ADB7]'}`}>
                      When I Trade It <span className="text-[#6B7280] font-normal">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. High volume London open between 03:00 - 05:00 EST"
                      value={editWhenToTrade}
                      onChange={e => setEditWhenToTrade(e.target.value)}
                      className={`w-full rounded-xl px-3.5 py-2 text-xs transition-colors focus:outline-none border ${
                        isLight
                          ? 'bg-zinc-50 border-zinc-300 text-zinc-900 placeholder-zinc-400 focus:border-[#6366F1]'
                          : 'bg-[#080A0D] border-[#1C2027] text-[#F3F4F6] placeholder-[#5E6570] focus:border-[#6366F1]'
                      }`}
                    />
                  </div>
                </div>

                {/* SECTION 2: RULES */}
                <div className={`space-y-3 pt-4 border-t ${isLight ? 'border-zinc-200' : 'border-[#1C2027]'}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className={`text-[11px] font-semibold uppercase tracking-wider ${isLight ? 'text-zinc-500' : 'text-[#9CA3AF]'}`}>
                        Rules · {editRules.length}
                      </h3>
                      <p className={`text-xs mt-0.5 ${isLight ? 'text-zinc-500' : 'text-[#6B7280]'}`}>
                        Add the conditions and criteria you use to trade this setup.
                      </p>
                    </div>
                  </div>

                  {/* Rules List */}
                  <div className="space-y-1.5 max-h-52 overflow-y-auto pr-0.5">
                    {editRules.map((rule, idx) => (
                      <div
                        key={rule.id}
                        className={`flex items-center justify-between gap-3 p-2.5 rounded-xl border transition-colors ${
                          isLight
                            ? 'bg-zinc-50 border-zinc-200'
                            : 'bg-[#080A0D] border-[#1C2027]'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <span className="font-mono text-[11px] text-[#6B7280] shrink-0">
                            {String(idx + 1).padStart(2, '0')}
                          </span>
                          <span className="text-[10px] font-semibold tracking-wider uppercase text-[#9CA3AF] shrink-0">
                            {rule.category}
                          </span>
                          <span className={`text-xs truncate ${isLight ? 'text-zinc-800' : 'text-[#D1D5DB]'}`}>
                            {rule.text}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveEditRule(rule.id)}
                          className={`p-1 rounded transition-colors cursor-pointer shrink-0 ${
                            isLight
                              ? 'text-zinc-400 hover:text-rose-600'
                              : 'text-[#6B7280] hover:text-rose-400'
                          }`}
                          title="Remove rule"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Add Rule Single Compact Row */}
                  <div className="flex items-center gap-2 pt-1">
                    <select
                      value={newEditRuleCategory}
                      onChange={e => setNewEditRuleCategory(e.target.value as any)}
                      className={`text-xs rounded-xl px-3 py-2 border transition-colors cursor-pointer focus:outline-none shrink-0 ${
                        isLight
                          ? 'bg-zinc-50 border-zinc-300 text-zinc-800 focus:border-[#6366F1]'
                          : 'bg-[#080A0D] border-[#1C2027] text-[#F3F4F6] focus:border-[#6366F1]'
                      }`}
                    >
                      <option value="MARKET" className="bg-[#0B0D10] text-[#F3F4F6]">Market</option>
                      <option value="ENTRY" className="bg-[#0B0D10] text-[#F3F4F6]">Entry</option>
                      <option value="RISK" className="bg-[#0B0D10] text-[#F3F4F6]">Risk</option>
                      <option value="EXIT" className="bg-[#0B0D10] text-[#F3F4F6]">Exit</option>
                      <option value="MANAGEMENT" className="bg-[#0B0D10] text-[#F3F4F6]">Management</option>
                    </select>

                    <input
                      type="text"
                      placeholder="Add a trading rule..."
                      value={newEditRuleText}
                      onChange={e => setNewEditRuleText(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddEditRule();
                        }
                      }}
                      className={`flex-1 min-w-0 rounded-xl px-3 py-2 text-xs transition-colors focus:outline-none border ${
                        isLight
                          ? 'bg-zinc-50 border-zinc-300 text-zinc-900 placeholder-zinc-400 focus:border-[#6366F1]'
                          : 'bg-[#080A0D] border-[#1C2027] text-[#F3F4F6] placeholder-[#5E6570] focus:border-[#6366F1]'
                      }`}
                    />

                    <button
                      type="button"
                      onClick={handleAddEditRule}
                      className={`px-3 py-2 rounded-xl text-xs font-medium border transition-colors cursor-pointer shrink-0 ${
                        isLight
                          ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border-zinc-300'
                          : 'bg-[#101318] hover:bg-[#151A20] text-[#F3F4F6] border-[#1C2027]'
                      }`}
                    >
                      Add
                    </button>
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className={`pt-4 border-t flex items-center justify-end gap-2.5 ${
                  isLight ? 'border-zinc-200' : 'border-[#1C2027]'
                }`}>
                  <button
                    type="button"
                    onClick={() => setEditingPlaybook(null)}
                    className={`px-4 py-2 rounded-xl text-xs font-medium border transition-colors cursor-pointer ${
                      isLight
                        ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border-zinc-300'
                        : 'bg-[#101318] hover:bg-[#151A20] text-[#9CA3AF] border-[#1C2027]'
                    }`}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-[#6366F1] hover:bg-[#4F46E5] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
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
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.98, y: 6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 6 }}
              transition={{ duration: 0.15 }}
              className={`w-full max-w-2xl max-h-[86vh] flex flex-col rounded-2xl border shadow-2xl overflow-hidden ${
                isLight
                  ? 'bg-white border-zinc-200 text-zinc-900'
                  : 'bg-[#0B0D10] border-[#1C2027] text-[#F3F4F6]'
              }`}
            >
              {/* Header */}
              <div className={`px-6 py-4.5 border-b flex items-center justify-between shrink-0 ${
                isLight ? 'border-zinc-200 bg-zinc-50' : 'border-[#1C2027] bg-[#06080B]'
              }`}>
                <div>
                  <h2 className={`text-base font-semibold tracking-tight ${isLight ? 'text-zinc-900' : 'text-[#F3F4F6]'}`}>
                    Create Playbook
                  </h2>
                  <p className={`text-xs mt-0.5 ${isLight ? 'text-zinc-500' : 'text-[#9CA3AF]'}`}>
                    Define the setup, rules, and risk parameters for this strategy.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                    isLight ? 'text-zinc-400 hover:text-zinc-700' : 'text-[#6B7280] hover:text-[#F3F4F6]'
                  }`}
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable Form Body */}
              <form onSubmit={handleCreatePlaybook} className="flex-1 overflow-y-auto p-6 space-y-5">
                {/* SECTION 1: BASIC INFORMATION */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className={`text-[11px] font-semibold uppercase tracking-wider ${isLight ? 'text-zinc-500' : 'text-[#9CA3AF]'}`}>
                      Basic Information
                    </h3>

                    {/* Restrained appearance controls */}
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-xs ${isLight ? 'text-zinc-500' : 'text-[#6B7280]'}`}>Icon</span>
                        <select
                          value={icon}
                          onChange={(e) => setIcon(e.target.value)}
                          className={`text-xs rounded-lg px-2 py-1 border transition-colors cursor-pointer focus:outline-none ${
                            isLight
                              ? 'bg-zinc-50 border-zinc-300 text-zinc-800 focus:border-[#6366F1]'
                              : 'bg-[#080A0D] border-[#1C2027] text-[#F3F4F6] focus:border-[#6366F1]'
                          }`}
                        >
                          <option value="⚡">⚡ Breakout</option>
                          <option value="🎯">🎯 Reversal</option>
                          <option value="📈">📈 Trend</option>
                          <option value="🔄">🔄 Pullback</option>
                          <option value="📊">📊 Volume</option>
                          <option value="🛡️">🛡️ Defense</option>
                        </select>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className={`text-xs ${isLight ? 'text-zinc-500' : 'text-[#6B7280]'}`}>Accent</span>
                        <div className="flex items-center gap-1.5">
                          <span
                            className="w-3.5 h-3.5 rounded-full border border-white/20 shrink-0"
                            style={{ backgroundColor: color }}
                          />
                          <input
                            type="color"
                            value={color}
                            onChange={(e) => setColor(e.target.value)}
                            className="w-5 h-5 rounded cursor-pointer bg-transparent border-0 p-0"
                            title="Accent color"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Playbook Name */}
                  <div>
                    <label className={`text-xs font-medium block mb-1.5 ${isLight ? 'text-zinc-700' : 'text-[#A7ADB7]'}`}>
                      Playbook Name
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. London session breakout"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className={`w-full rounded-xl px-3.5 py-2.5 text-xs transition-colors focus:outline-none border ${
                        isLight
                          ? 'bg-zinc-50 border-zinc-300 text-zinc-900 placeholder-zinc-400 focus:border-[#6366F1]'
                          : 'bg-[#080A0D] border-[#1C2027] text-[#F3F4F6] placeholder-[#5E6570] focus:border-[#6366F1]'
                      }`}
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label className={`text-xs font-medium block mb-1.5 ${isLight ? 'text-zinc-700' : 'text-[#A7ADB7]'}`}>
                      Description <span className="text-[#6B7280] font-normal">(Optional)</span>
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Briefly describe when and why you take this setup..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className={`w-full rounded-xl px-3.5 py-2 text-xs leading-relaxed transition-colors focus:outline-none resize-none border ${
                        isLight
                          ? 'bg-zinc-50 border-zinc-300 text-zinc-900 placeholder-zinc-400 focus:border-[#6366F1]'
                          : 'bg-[#080A0D] border-[#1C2027] text-[#F3F4F6] placeholder-[#5E6570] focus:border-[#6366F1]'
                      }`}
                    />
                  </div>

                  {/* When I Trade It */}
                  <div>
                    <label className={`text-xs font-medium block mb-1.5 ${isLight ? 'text-zinc-700' : 'text-[#A7ADB7]'}`}>
                      When I Trade It <span className="text-[#6B7280] font-normal">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. High volume London open between 03:00 - 05:00 EST"
                      value={whenToTrade}
                      onChange={(e) => setWhenToTrade(e.target.value)}
                      className={`w-full rounded-xl px-3.5 py-2 text-xs transition-colors focus:outline-none border ${
                        isLight
                          ? 'bg-zinc-50 border-zinc-300 text-zinc-900 placeholder-zinc-400 focus:border-[#6366F1]'
                          : 'bg-[#080A0D] border-[#1C2027] text-[#F3F4F6] placeholder-[#5E6570] focus:border-[#6366F1]'
                      }`}
                    />
                  </div>
                </div>

                {/* SECTION 2: RULES */}
                <div className={`space-y-3 pt-4 border-t ${isLight ? 'border-zinc-200' : 'border-[#1C2027]'}`}>
                  <div>
                    <h3 className={`text-[11px] font-semibold uppercase tracking-wider ${isLight ? 'text-zinc-500' : 'text-[#9CA3AF]'}`}>
                      Rules · {rules.length}
                    </h3>
                    <p className={`text-xs mt-0.5 ${isLight ? 'text-zinc-500' : 'text-[#6B7280]'}`}>
                      Add the conditions and criteria you follow when trading this setup.
                    </p>
                  </div>

                  {/* Rules List */}
                  <div className="space-y-1.5 max-h-52 overflow-y-auto pr-0.5">
                    {rules.map((rule, idx) => (
                      <div
                        key={rule.id}
                        className={`flex items-center justify-between gap-3 p-2.5 rounded-xl border transition-colors ${
                          isLight
                            ? 'bg-zinc-50 border-zinc-200'
                            : 'bg-[#080A0D] border-[#1C2027]'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <span className="font-mono text-[11px] text-[#6B7280] shrink-0">
                            {String(idx + 1).padStart(2, '0')}
                          </span>
                          <span className="text-[10px] font-semibold tracking-wider uppercase text-[#9CA3AF] shrink-0">
                            {rule.category}
                          </span>
                          <span className={`text-xs truncate ${isLight ? 'text-zinc-800' : 'text-[#D1D5DB]'}`}>
                            {rule.text}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveRule(rule.id)}
                          className={`p-1 rounded transition-colors cursor-pointer shrink-0 ${
                            isLight
                              ? 'text-zinc-400 hover:text-rose-600'
                              : 'text-[#6B7280] hover:text-rose-400'
                          }`}
                          title="Remove rule"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Add Rule Single Compact Row */}
                  <div className="flex items-center gap-2 pt-1">
                    <select
                      value={newRuleCategory}
                      onChange={(e) => setNewRuleCategory(e.target.value as any)}
                      className={`text-xs rounded-xl px-3 py-2 border transition-colors cursor-pointer focus:outline-none shrink-0 ${
                        isLight
                          ? 'bg-zinc-50 border-zinc-300 text-zinc-800 focus:border-[#6366F1]'
                          : 'bg-[#080A0D] border-[#1C2027] text-[#F3F4F6] focus:border-[#6366F1]'
                      }`}
                    >
                      <option value="MARKET" className="bg-[#0B0D10] text-[#F3F4F6]">Market</option>
                      <option value="ENTRY" className="bg-[#0B0D10] text-[#F3F4F6]">Entry</option>
                      <option value="RISK" className="bg-[#0B0D10] text-[#F3F4F6]">Risk</option>
                      <option value="EXIT" className="bg-[#0B0D10] text-[#F3F4F6]">Exit</option>
                      <option value="MANAGEMENT" className="bg-[#0B0D10] text-[#F3F4F6]">Management</option>
                    </select>

                    <input
                      type="text"
                      placeholder="Add a trading rule..."
                      value={newRuleText}
                      onChange={(e) => setNewRuleText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddRule();
                        }
                      }}
                      className={`flex-1 min-w-0 rounded-xl px-3 py-2 text-xs transition-colors focus:outline-none border ${
                        isLight
                          ? 'bg-zinc-50 border-zinc-300 text-zinc-900 placeholder-zinc-400 focus:border-[#6366F1]'
                          : 'bg-[#080A0D] border-[#1C2027] text-[#F3F4F6] placeholder-[#5E6570] focus:border-[#6366F1]'
                      }`}
                    />

                    <button
                      type="button"
                      onClick={handleAddRule}
                      className={`px-3 py-2 rounded-xl text-xs font-medium border transition-colors cursor-pointer shrink-0 ${
                        isLight
                          ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border-zinc-300'
                          : 'bg-[#101318] hover:bg-[#151A20] text-[#F3F4F6] border-[#1C2027]'
                      }`}
                    >
                      Add
                    </button>
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className={`pt-4 border-t flex items-center justify-end gap-2.5 ${
                  isLight ? 'border-zinc-200' : 'border-[#1C2027]'
                }`}>
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className={`px-4 py-2 rounded-xl text-xs font-medium border transition-colors cursor-pointer ${
                      isLight
                        ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border-zinc-300'
                        : 'bg-[#101318] hover:bg-[#151A20] text-[#9CA3AF] border-[#1C2027]'
                    }`}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-[#6366F1] hover:bg-[#4F46E5] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                  >
                    Create Playbook
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* RULE CHECKER / REVIEW RULES MODAL */}
      <AnimatePresence>
        {activeChecklistPlaybook && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.15 }}
              className={`w-full max-w-lg rounded-2xl border p-5 shadow-2xl space-y-4 ${
                isLight
                  ? 'bg-white border-zinc-200 text-zinc-900'
                  : 'bg-[#0B0D10] border-[#1C2027] text-[#F3F4F6]'
              }`}
            >
              <div className={`flex items-center justify-between pb-3 border-b ${isLight ? 'border-zinc-200' : 'border-[#1C2027]'}`}>
                <div className="flex items-center gap-2.5">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    isLight ? 'bg-zinc-100 text-zinc-700' : 'bg-[#101318] border border-[#1C2027] text-[#818CF8]'
                  }`}>
                    <BookmarkCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className={`text-sm font-semibold ${isLight ? 'text-zinc-900' : 'text-[#F3F4F6]'}`}>
                      {activeChecklistPlaybook.name}
                    </h3>
                    <p className={`text-[11px] ${isLight ? 'text-zinc-500' : 'text-[#6B7280]'}`}>
                      Execution Rules Checklist
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveChecklistPlaybook(null)}
                  className={`transition-colors p-1 cursor-pointer ${
                    isLight ? 'text-zinc-400 hover:text-zinc-800' : 'text-[#6B7280] hover:text-[#F3F4F6]'
                  }`}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Rules Followed Counter and Progress Bar */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className={`font-medium ${isLight ? 'text-zinc-600' : 'text-[#9CA3AF]'}`}>
                    Rules followed
                  </span>
                  <span className="font-mono text-xs font-semibold text-emerald-400">
                    {Object.values(checkedRules).filter(Boolean).length} of {(activeChecklistPlaybook.rules || []).length}
                  </span>
                </div>
                <div className={`h-1.5 w-full rounded-full overflow-hidden ${isLight ? 'bg-zinc-100' : 'bg-[#101318]'}`}>
                  <div
                    style={{
                      width: `${(Object.values(checkedRules).filter(Boolean).length / ((activeChecklistPlaybook.rules || []).length || 1)) * 100}%`,
                    }}
                    className="h-full bg-emerald-500 rounded-full transition-all duration-200"
                  />
                </div>
              </div>

              {/* Checklist items by category */}
              <div className="space-y-3 py-1 max-h-64 overflow-y-auto pr-0.5">
                {['MARKET', 'ENTRY', 'RISK', 'EXIT', 'MANAGEMENT'].map(cat => {
                  const catRules = (activeChecklistPlaybook.rules || []).filter(r => r.category === cat);
                  if (catRules.length === 0) return null;
                  return (
                    <div key={cat} className="space-y-1.5">
                      <div className={`text-[10px] font-semibold uppercase tracking-wider font-mono ${
                        isLight ? 'text-zinc-400' : 'text-[#6B7280]'
                      }`}>
                        {cat}
                      </div>
                      {catRules.map((r, idx) => {
                        const isChecked = !!checkedRules[r.id];
                        return (
                          <div
                            key={r.id}
                            onClick={() => setCheckedRules(prev => ({ ...prev, [r.id]: !prev[r.id] }))}
                            className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer text-xs transition-colors select-none ${
                              isChecked
                                ? isLight
                                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900 font-medium'
                                  : 'bg-[#10B981]/10 border-[#10B981]/30 text-[#F3F4F6] font-medium'
                                : isLight
                                ? 'bg-zinc-50 border-zinc-200 hover:border-zinc-300 text-zinc-700'
                                : 'bg-[#080A0D] border-[#1C2027] hover:border-[#282E38] text-[#C2C7D0]'
                            }`}
                          >
                            <div className="mt-0.5">
                              {isChecked ? (
                                <CheckSquare className="w-4 h-4 shrink-0 text-[#10B981]" />
                              ) : (
                                <Square className="w-4 h-4 shrink-0 text-[#6B7280]" />
                              )}
                            </div>
                            <span className="leading-snug flex-1">{r.text}</span>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>

              <div className={`pt-3 border-t flex justify-end ${isLight ? 'border-zinc-200' : 'border-[#1C2027]'}`}>
                <button
                  type="button"
                  onClick={() => {
                    setActiveChecklistPlaybook(null);
                    addToast('Rules Checked', 'Execution checklist confirmed.', 'info');
                  }}
                  className="px-4 py-2 rounded-xl bg-[#6366F1] hover:bg-[#4F46E5] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
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
