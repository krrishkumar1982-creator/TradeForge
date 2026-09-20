import React, { useState } from 'react';
import {
  Trash2,
  RotateCcw,
  X,
  AlertTriangle,
  FileText,
  Calendar,
  Tag as TagIcon,
  Folder as FolderIcon,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import { useTrading } from '../../context/TradingContext';
import { JournalNote, JournalFolder } from '../../types';

interface JournalTrashModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const JournalTrashModal: React.FC<JournalTrashModalProps> = ({ isOpen, onClose }) => {
  const {
    notes,
    folders,
    restoreNote,
    permanentDeleteNote,
    restoreFolder,
    permanentDeleteFolder,
    emptyTrash,
    theme,
  } = useTrading();

  const isLight = theme === 'light';
  const [activeTab, setActiveTab] = useState<'all' | 'notes' | 'folders'>('all');
  const [isConfirmEmptyOpen, setIsConfirmEmptyOpen] = useState(false);

  const deletedNotes = notes.filter((n) => n.isDeleted);
  const deletedFolders = folders.filter((f) => f.isDeleted);
  const totalDeleted = deletedNotes.length + deletedFolders.length;

  const handleRestoreNote = async (id: string) => {
    await restoreNote(id);
  };

  const handlePermanentDeleteNote = async (id: string) => {
    await permanentDeleteNote(id);
  };

  const handleRestoreFolder = async (id: string) => {
    await restoreFolder(id);
  };

  const handlePermanentDeleteFolder = async (id: string) => {
    await permanentDeleteFolder(id);
  };

  const handleEmptyAll = async () => {
    await emptyTrash();
    setIsConfirmEmptyOpen(false);
  };

  const formatDeletedDate = (dateStr?: string) => {
    if (!dateStr) return 'Recently';
    try {
      const d = new Date(dateStr);
      const diffHrs = Math.round((Date.now() - d.getTime()) / (1000 * 60 * 60));
      if (diffHrs < 1) return 'Just now';
      if (diffHrs < 24) return `${diffHrs}h ago`;
      const diffDays = Math.round(diffHrs / 24);
      return `${diffDays}d ago (${48 - diffHrs > 0 ? `${48 - diffHrs}h until auto-purge` : 'Expiring soon'})`;
    } catch {
      return dateStr;
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 animate-in fade-in"
      style={{
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        className={`w-full max-w-2xl max-h-[88vh] rounded-2xl border flex flex-col shadow-2xl overflow-hidden transition-all ${
          isLight
            ? 'bg-white border-zinc-200 text-zinc-900'
            : 'bg-[#12161D] border-[#1C232E] text-slate-100 shadow-2xl shadow-indigo-950/40'
        }`}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between px-6 py-4 border-b shrink-0 ${
            isLight ? 'border-zinc-200 bg-zinc-50' : 'border-[#1C232E] bg-[#12161D]'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-500">
              <Trash2 className="w-4.5 h-4.5" />
            </div>
            <div>
              <h2 className={`text-base font-bold tracking-tight flex items-center gap-2 ${
                isLight ? 'text-zinc-900' : 'text-white'
              }`}>
                Trash & Recently Deleted
                <span className={`text-xs px-2 py-0.5 rounded-full font-mono border ${
                  isLight
                    ? 'bg-zinc-200/80 border-zinc-300 text-zinc-700'
                    : 'bg-[#1A1F27] border-[#1C232E] text-slate-300'
                }`}>
                  {totalDeleted}
                </span>
              </h2>
              <p className={`text-xs ${isLight ? 'text-zinc-500' : 'text-slate-400'}`}>
                Items are retained in Supabase for 2 days before automated permanent deletion.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {totalDeleted > 0 && (
              <button
                onClick={() => setIsConfirmEmptyOpen(true)}
                className={`text-xs px-3 py-1.5 rounded-xl border font-semibold transition cursor-pointer ${
                  isLight
                    ? 'bg-rose-50 hover:bg-rose-100 border-rose-200 text-rose-700'
                    : 'bg-rose-950/40 hover:bg-rose-900/60 border-rose-800/50 text-rose-300'
                }`}
              >
                Empty Trash
              </button>
            )}
            <button
              onClick={onClose}
              className={`p-1.5 rounded-lg transition cursor-pointer ${
                isLight ? 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100' : 'text-slate-400 hover:text-white hover:bg-[#1A1F27]'
              }`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Confirmation Banner for Empty Trash */}
        {isConfirmEmptyOpen && (
          <div className={`border-b px-6 py-3 flex items-center justify-between gap-4 ${
            isLight
              ? 'bg-rose-50 border-rose-200'
              : 'bg-rose-950/40 border-rose-800/40'
          }`}>
            <div className={`flex items-center gap-2 text-xs ${isLight ? 'text-rose-900 font-medium' : 'text-rose-200'}`}>
              <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>
                Permanently destroy all {totalDeleted} item(s) and their cloud attachments? This cannot be undone.
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleEmptyAll}
                className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition cursor-pointer"
              >
                Yes, Empty All
              </button>
              <button
                onClick={() => setIsConfirmEmptyOpen(false)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                  isLight
                    ? 'bg-white hover:bg-zinc-100 border border-zinc-300 text-zinc-700'
                    : 'bg-[#1A1F27] hover:bg-[#252D3A] text-slate-300'
                }`}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Retention Policy Banner */}
        <div className={`border-b px-6 py-2.5 flex items-center justify-between text-[11px] ${
          isLight
            ? 'bg-[#F8F9FB] border-zinc-200 text-zinc-600'
            : 'bg-[#0A0D14]/70 border-[#1C232E] text-slate-400'
        }`}>
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-amber-500" />
            <span>
              <strong className={isLight ? 'text-zinc-800' : 'text-slate-300'}>2-Day Auto-Purge Policy:</strong> Any note or folder in Trash &gt; 48 hours is deleted automatically from Supabase.
            </span>
          </div>

          {/* Filter tabs */}
          <div className={`flex items-center gap-1 p-0.5 rounded-lg border ${
            isLight
              ? 'bg-white border-zinc-200 shadow-2xs'
              : 'bg-[#12161D] border-[#1C232E]'
          }`}>
            <button
              onClick={() => setActiveTab('all')}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition cursor-pointer ${
                activeTab === 'all'
                  ? isLight
                    ? 'bg-indigo-50 text-indigo-700 font-bold border border-indigo-200'
                    : 'bg-indigo-600/30 text-indigo-300 font-semibold'
                  : isLight
                    ? 'text-zinc-600 hover:text-zinc-900'
                    : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All ({totalDeleted})
            </button>
            <button
              onClick={() => setActiveTab('notes')}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition cursor-pointer ${
                activeTab === 'notes'
                  ? isLight
                    ? 'bg-indigo-50 text-indigo-700 font-bold border border-indigo-200'
                    : 'bg-indigo-600/30 text-indigo-300 font-semibold'
                  : isLight
                    ? 'text-zinc-600 hover:text-zinc-900'
                    : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Notes ({deletedNotes.length})
            </button>
            <button
              onClick={() => setActiveTab('folders')}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition cursor-pointer ${
                activeTab === 'folders'
                  ? isLight
                    ? 'bg-indigo-50 text-indigo-700 font-bold border border-indigo-200'
                    : 'bg-indigo-600/30 text-indigo-300 font-semibold'
                  : isLight
                    ? 'text-zinc-600 hover:text-zinc-900'
                    : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Folders ({deletedFolders.length})
            </button>
          </div>
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-3">
          {totalDeleted === 0 ? (
            <div className="text-center py-16 space-y-2">
              <div className={`w-12 h-12 mx-auto rounded-full border flex items-center justify-center ${
                isLight
                  ? 'bg-zinc-100 border-zinc-200 text-zinc-400'
                  : 'bg-[#1A1F27] border-[#1C232E] text-slate-500'
              }`}>
                <Trash2 className="w-6 h-6" />
              </div>
              <p className={`text-sm font-semibold ${isLight ? 'text-zinc-800' : 'text-slate-300'}`}>Trash is Empty</p>
              <p className={`text-xs ${isLight ? 'text-zinc-500' : 'text-slate-500'}`}>No deleted journal notes or folders in the recycle bin.</p>
            </div>
          ) : (
            <>
              {/* Deleted Folders */}
              {(activeTab === 'all' || activeTab === 'folders') &&
                deletedFolders.map((folder) => {
                  const childNotes = notes.filter(
                    (n) => n.folderId === folder.id || n.originalFolderId === folder.id
                  );
                  return (
                    <div
                      key={folder.id}
                      className={`p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition ${
                        isLight
                          ? 'bg-white border-zinc-200 shadow-2xs hover:border-zinc-300'
                          : 'bg-[#0A0D14] border-[#1C232E] hover:border-[#2A3444]'
                      }`}
                    >
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <FolderIcon className="w-4 h-4 text-purple-500 shrink-0" />
                          <h3 className={`text-xs sm:text-sm font-bold truncate ${
                            isLight ? 'text-zinc-900' : 'text-slate-200'
                          }`}>
                            Folder: {folder.name}
                          </h3>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono border ${
                            isLight
                              ? 'bg-purple-50 border-purple-200 text-purple-700'
                              : 'bg-purple-950/40 border-purple-800/40 text-purple-300'
                          }`}>
                            {childNotes.length} note(s) inside
                          </span>
                        </div>
                        <div className={`flex items-center gap-3 text-[11px] ${isLight ? 'text-zinc-500' : 'text-slate-400'}`}>
                          <span className="flex items-center gap-1">
                            <Clock className={`w-3 h-3 ${isLight ? 'text-zinc-400' : 'text-slate-500'}`} />
                            {formatDeletedDate(folder.deletedAt)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        <button
                          onClick={() => handleRestoreFolder(folder.id)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition cursor-pointer ${
                            isLight
                              ? 'bg-indigo-50 hover:bg-indigo-100 border-indigo-200 text-indigo-700'
                              : 'bg-indigo-600/20 hover:bg-indigo-600/40 border-indigo-500/30 text-indigo-300'
                          }`}
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          Restore Folder & Notes
                        </button>
                        <button
                          onClick={() => handlePermanentDeleteFolder(folder.id)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition cursor-pointer ${
                            isLight
                              ? 'bg-rose-50 hover:bg-rose-100 border-rose-200 text-rose-600'
                              : 'bg-rose-950/40 hover:bg-rose-900/60 border-rose-800/40 text-rose-400'
                          }`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Purge
                        </button>
                      </div>
                    </div>
                  );
                })}

              {/* Deleted Notes */}
              {(activeTab === 'all' || activeTab === 'notes') &&
                deletedNotes.map((note) => (
                  <div
                    key={note.id}
                    className={`p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition ${
                      isLight
                        ? 'bg-white border-zinc-200 shadow-2xs hover:border-zinc-300'
                        : 'bg-[#0A0D14] border-[#1C232E] hover:border-[#2A3444]'
                    }`}
                  >
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <FileText className={`w-4 h-4 shrink-0 ${isLight ? 'text-zinc-500' : 'text-slate-400'}`} />
                        <h3 className={`text-xs sm:text-sm font-bold truncate ${
                          isLight ? 'text-zinc-900' : 'text-slate-200'
                        }`}>
                          {note.title}
                        </h3>
                        {note.symbol && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono border ${
                            isLight
                              ? 'bg-blue-50 border-blue-200 text-blue-700'
                              : 'bg-blue-950/40 border-blue-800/40 text-blue-300'
                          }`}>
                            {note.symbol}
                          </span>
                        )}
                      </div>
                      <div className={`flex items-center gap-3 text-[11px] ${isLight ? 'text-zinc-500' : 'text-slate-400'}`}>
                        <span className="flex items-center gap-1">
                          <Calendar className={`w-3 h-3 ${isLight ? 'text-zinc-400' : 'text-slate-500'}`} />
                          {note.date}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className={`w-3 h-3 ${isLight ? 'text-zinc-400' : 'text-slate-500'}`} />
                          {formatDeletedDate(note.deletedAt)}
                        </span>
                        {note.tags && note.tags.length > 0 && (
                          <span className="flex items-center gap-1">
                            <TagIcon className="w-3 h-3 text-purple-500" />
                            {note.tags.join(', ')}
                          </span>
                        )}
                      </div>
                      <p className={`text-[11px] line-clamp-1 ${isLight ? 'text-zinc-600' : 'text-slate-400'}`}>{note.content}</p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      <button
                        onClick={() => handleRestoreNote(note.id)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition cursor-pointer ${
                          isLight
                            ? 'bg-indigo-50 hover:bg-indigo-100 border-indigo-200 text-indigo-700'
                            : 'bg-indigo-600/20 hover:bg-indigo-600/40 border-indigo-500/30 text-indigo-300'
                        }`}
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Restore
                      </button>
                      <button
                        onClick={() => handlePermanentDeleteNote(note.id)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition cursor-pointer ${
                          isLight
                            ? 'bg-rose-50 hover:bg-rose-100 border-rose-200 text-rose-600'
                            : 'bg-rose-950/40 hover:bg-rose-900/60 border-rose-800/40 text-rose-400'
                        }`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Purge
                      </button>
                    </div>
                  </div>
                ))}
            </>
          )}
        </div>

        {/* Footer */}
        <div
          className={`flex items-center justify-between px-6 py-3 border-t shrink-0 ${
            isLight ? 'border-zinc-200 bg-zinc-50' : 'border-[#1C232E] bg-[#12161D]'
          }`}
        >
          <span className="text-xs text-slate-500">
            Backed by Supabase PostgreSQL database & storage
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-[#1A1F27] hover:bg-[#222936] border border-[#1C232E] text-white text-xs font-semibold transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
