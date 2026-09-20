import React, { useState, useMemo } from 'react';
import {
  Tag,
  Plus,
  Trash2,
  Edit2,
  Sparkles,
  CheckCircle2,
  Search,
  Filter,
  Layers,
  AlertTriangle,
  X,
  Save,
  RotateCcw
} from 'lucide-react';
import { useTrading } from '../../context/TradingContext';
import { CustomTag } from '../../types';
import { DEFAULT_TAGS_FALLBACK } from '../../utils/defaultSettings';
import { getTagCardStyle, hexToRgba } from '../../utils/tagColors';

const COLOR_PALETTES = [
  { name: 'Indigo', bg: 'bg-indigo-500/20', text: 'text-indigo-400', border: 'border-indigo-500/40', hex: '#6366F1' },
  { name: 'Emerald', bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/40', hex: '#10B981' },
  { name: 'Rose', bg: 'bg-rose-500/20', text: 'text-rose-400', border: 'border-rose-500/40', hex: '#F43F5E' },
  { name: 'Amber', bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/40', hex: '#F59E0B' },
  { name: 'Purple', bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500/40', hex: '#A855F7' },
  { name: 'Cyan', bg: 'bg-cyan-500/20', text: 'text-cyan-400', border: 'border-cyan-500/40', hex: '#06B6D4' },
  { name: 'Blue', bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/40', hex: '#3B82F6' },
  { name: 'Slate', bg: 'bg-slate-500/20', text: 'text-slate-400', border: 'border-slate-500/40', hex: '#64748B' },
];

export const TagsSettingsTab: React.FC = () => {
  const {
    customTags,
    addCustomTag,
    updateCustomTag,
    deleteCustomTag,
    trades,
    addToast,
    addActivityLog,
    userProfile,
    theme,
  } = useTrading();

  const isLight = theme === 'light';

  const [activeCategory, setActiveCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [editingTag, setEditingTag] = useState<CustomTag | null>(null);

  // Form state
  const [tagName, setTagName] = useState('');
  const [tagCategory, setTagCategory] = useState<CustomTag['category']>('Setup');
  const [tagColor, setTagColor] = useState('#6366F1');
  const [tagDesc, setTagDesc] = useState('');

  // Calculate usage count for each tag across all trades
  const tagUsageMap = useMemo(() => {
    const counts: Record<string, number> = {};
    trades.forEach(t => {
      if (t.setupType) counts[t.setupType] = (counts[t.setupType] || 0) + 1;
      if (t.setupId) counts[t.setupId] = (counts[t.setupId] || 0) + 1;
      if (Array.isArray(t.mistakes)) {
        t.mistakes.forEach(m => {
          counts[m] = (counts[m] || 0) + 1;
        });
      }
      if (Array.isArray(t.tags)) {
        t.tags.forEach(tg => {
          counts[tg] = (counts[tg] || 0) + 1;
        });
      }
    });
    return counts;
  }, [trades]);

  const filteredTags = useMemo(() => {
    return customTags.filter(t => {
      const matchesCat = activeCategory === 'ALL' || t.category === activeCategory;
      const matchesSearch = !searchQuery || t.name.toLowerCase().includes(searchQuery.toLowerCase()) || (t.description || '').toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCat && matchesSearch;
    });
  }, [customTags, activeCategory, searchQuery]);

  const handleOpenCreate = () => {
    setEditingTag(null);
    setTagName('');
    setTagCategory('Setup');
    setTagColor('#6366F1');
    setTagDesc('');
    setIsCreating(true);
  };

  const handleOpenEdit = (tag: CustomTag) => {
    setEditingTag(tag);
    setTagName(tag.name);
    setTagCategory(tag.category);
    setTagColor(tag.color || '#6366F1');
    setTagDesc(tag.description || '');
    setIsCreating(true);
  };

  const handleSaveTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tagName.trim()) return;

    try {
      if (editingTag) {
        await updateCustomTag({
          ...editingTag,
          name: tagName.trim(),
          category: tagCategory,
          color: tagColor,
          description: tagDesc.trim(),
        });
        addToast('Tag Updated', `Tag "${tagName}" modified successfully.`, 'success');
      } else {
        await addCustomTag({
          name: tagName.trim(),
          category: tagCategory,
          color: tagColor,
          description: tagDesc.trim(),
        });
        addToast('Tag Created', `Tag "${tagName}" added to taxonomy.`, 'success');
      }

      await addActivityLog({
        action: editingTag ? 'UPDATE_TAG' : 'CREATE_TAG',
        category: 'TAG',
        object: tagName,
        status: 'INFO',
        details: { category: tagCategory },
      });

      setIsCreating(false);
    } catch (err: any) {
      addToast('Error', err.message || 'Failed to save tag', 'error');
    }
  };

  const handleDeleteTag = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete tag "${name}"?`)) return;
    try {
      await deleteCustomTag(id);
      addToast('Tag Deleted', `Tag "${name}" removed.`, 'info');
    } catch (err: any) {
      addToast('Error', err.message || 'Failed to delete tag', 'error');
    }
  };

  const handleRestoreDefaults = async () => {
    if (!window.confirm('Restore standard institutional trading taxonomy?')) return;
    try {
      for (const t of DEFAULT_TAGS_FALLBACK) {
        if (!customTags.some(existing => existing.name.toLowerCase() === t.name.toLowerCase())) {
          await addCustomTag({
            name: t.name,
            category: t.category,
            color: t.color,
            description: t.description,
          });
        }
      }
      addToast('Taxonomy Restored', 'Standard institutional setup & mistake tags populated.', 'success');
    } catch (err: any) {
      addToast('Error', err.message || 'Failed to seed default tags', 'error');
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#1C232E]">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Tag className="w-4 h-4 text-indigo-400" />
            Tags Management & Analytical Taxonomy
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Organize high-confluence setups, psychological mistakes, and market conditions for deep quantitative filtering.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleRestoreDefaults}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-[#1A1F27] hover:bg-[#232B36] text-slate-300 border border-[#1C232E] transition cursor-pointer"
            title="Load default setups and mistake categories"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>
          <button
            type="button"
            onClick={handleOpenCreate}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white shadow-md shadow-indigo-600/25 border border-indigo-400/30 transition cursor-pointer active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add New Tag</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-[#12161D] border border-[#1C232E]">
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          {[
            { id: 'ALL', label: 'All Tags' },
            { id: 'Setup', label: 'Setups' },
            { id: 'Mistake', label: 'Mistakes' },
            { id: 'Market', label: 'Market Regimes' },
            { id: 'Psychology', label: 'Psychology' },
            { id: 'Behavior', label: 'Behavior' },
            { id: 'Custom', label: 'Custom' },
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveCategory(tab.id)}
              className={`px-3 py-1.5 rounded-xl font-semibold transition cursor-pointer border ${
                activeCategory === tab.id
                  ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white border-indigo-400/40 shadow-md shadow-indigo-600/20'
                  : 'bg-[#0A0D14] text-slate-400 border-[#1C232E] hover:text-white hover:border-[#273141]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative min-w-[220px]">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search tags..."
            className="w-full bg-[#0A0D14] border border-[#1C232E] rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Tags Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredTags.length === 0 ? (
          <div className="col-span-full text-center py-12 rounded-2xl bg-[#12161D] border border-[#1C232E] text-slate-500 text-xs font-mono">
            No tags found matching criteria. Click "Add New Tag" to create one.
          </div>
        ) : (
          filteredTags.map(tag => {
            const usageCount = tagUsageMap[tag.name] || 0;
            const color = tag.color || '#6366F1';
            const cardStyle = getTagCardStyle(color, isLight);

            return (
              <div
                key={tag.id}
                style={cardStyle}
                className="p-4 rounded-xl transition-all duration-200 flex flex-col justify-between space-y-3 group hover:scale-[1.01]"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className="px-2.5 py-1 rounded-lg text-xs font-bold border font-mono flex items-center gap-1.5 shadow-sm"
                      style={{
                        backgroundColor: hexToRgba(color, 0.22),
                        borderColor: hexToRgba(color, 0.55),
                        color: color,
                      }}
                    >
                      <span className="w-2 h-2 rounded-full shadow-sm shrink-0" style={{ backgroundColor: color }} />
                      <span className="truncate">{tag.name}</span>
                    </span>

                    <span
                      className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border shrink-0"
                      style={{
                        backgroundColor: isLight ? 'rgba(240, 240, 245, 0.85)' : 'rgba(10, 13, 20, 0.75)',
                        borderColor: hexToRgba(color, 0.25),
                        color: isLight ? '#475569' : '#94A3B8',
                      }}
                    >
                      {tag.category}
                    </span>
                  </div>

                  {tag.description && (
                    <p className={`text-xs line-clamp-2 pt-1 leading-relaxed ${isLight ? 'text-zinc-600' : 'text-slate-300'}`}>
                      {tag.description}
                    </p>
                  )}
                </div>

                <div
                  className="flex items-center justify-between pt-2.5 border-t text-xs transition"
                  style={{ borderColor: hexToRgba(color, 0.22) }}
                >
                  <span className={`font-mono text-[11px] ${isLight ? 'text-zinc-600' : 'text-slate-300'}`}>
                    Used in <strong className={isLight ? 'text-zinc-900' : 'text-white'}>{usageCount}</strong> {usageCount === 1 ? 'trade' : 'trades'}
                  </span>

                  <div className="flex items-center gap-1.5 opacity-80 group-hover:opacity-100 transition">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(tag)}
                      style={{
                        backgroundColor: isLight ? 'rgba(255, 255, 255, 0.9)' : 'rgba(10, 13, 20, 0.85)',
                        borderColor: hexToRgba(color, 0.35),
                      }}
                      className="p-1.5 rounded-lg text-slate-300 hover:text-white border transition cursor-pointer"
                      title="Edit Tag"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteTag(tag.id, tag.name)}
                      style={{
                        backgroundColor: isLight ? 'rgba(255, 255, 255, 0.9)' : 'rgba(10, 13, 20, 0.85)',
                        borderColor: hexToRgba(color, 0.35),
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/20 border transition cursor-pointer"
                      title="Delete Tag"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal for Create / Edit Tag */}
      {isCreating && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveTag}
            className="w-full max-w-md rounded-2xl bg-[#12161D] border border-indigo-500/30 p-6 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#1C232E]">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Tag className="w-4 h-4 text-indigo-400" />
                {editingTag ? 'Edit Quantitative Tag' : 'Create New Analytical Tag'}
              </h3>
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Tag Name</label>
                <input
                  type="text"
                  required
                  value={tagName}
                  onChange={e => setTagName(e.target.value)}
                  placeholder="e.g. Liquidity Sweep, FOMO Entry"
                  className="w-full bg-[#0A0D14] border border-[#1C232E] rounded-xl px-3 py-2 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Taxonomy Category</label>
                <select
                  value={tagCategory}
                  onChange={e => setTagCategory(e.target.value as any)}
                  className="w-full bg-[#0A0D14] border border-[#1C232E] rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  <option value="Setup">Setup (Confluence / Strategy Trigger)</option>
                  <option value="Mistake">Mistake (Discipline / Execution Error)</option>
                  <option value="Market">Market (Regime, Volatility, Session)</option>
                  <option value="Psychology">Psychology (Mindset / Emotion)</option>
                  <option value="Behavior">Behavior (Habit / Routine)</option>
                  <option value="Execution">Execution (Order Entry / Slippage)</option>
                  <option value="Custom">Custom (General Tag)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1.5">Color Accent</label>
                <div className="flex flex-wrap gap-2">
                  {COLOR_PALETTES.map(col => (
                    <button
                      key={col.hex}
                      type="button"
                      onClick={() => setTagColor(col.hex)}
                      className={`w-7 h-7 rounded-lg border-2 transition cursor-pointer flex items-center justify-center ${
                        tagColor === col.hex ? 'border-white scale-110 shadow-md' : 'border-transparent opacity-80 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: col.hex }}
                    >
                      {tagColor === col.hex && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Description & Trading Rules</label>
                <textarea
                  rows={3}
                  value={tagDesc}
                  onChange={e => setTagDesc(e.target.value)}
                  placeholder="Define when this tag should be attributed..."
                  className="w-full bg-[#0A0D14] border border-[#1C232E] rounded-xl p-3 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#1C232E]">
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#1A1F27] hover:bg-[#232B36] text-slate-300 border border-[#1C232E]"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-600/25 border border-indigo-400/30"
              >
                {editingTag ? 'Save Changes' : 'Create Tag'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
