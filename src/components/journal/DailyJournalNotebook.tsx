import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Plus,
  Search,
  SlidersHorizontal,
  Folder as FolderIcon,
  BookOpen,
  Tag as TagIcon,
  Calendar,
  Clock,
  Star,
  Edit3,
  Trash2,
  MoreHorizontal,
  Paperclip,
  TrendingUp,
  TrendingDown,
  Sparkles,
  ExternalLink,
  Download,
  Share2,
  Copy,
  ChevronRight,
  ChevronLeft,
  FolderPlus,
  CheckCircle2,
  X,
  FileText,
  Image as ImageIcon,
  Check,
  Eye,
  Maximize2,
  FolderOpen
} from 'lucide-react';
import { useTrading } from '../../context/TradingContext';
import { safeFormatDate } from '../../utils/dateUtils';
import { JournalNote, JournalFolder, JournalAttachment } from '../../types';
import { JournalNoteModal } from './JournalNoteModal';
import { JournalTrashModal } from './JournalTrashModal';
import { SupabaseStorageService } from '../../services/supabaseStorage';
import { getTagColor, hexToRgba } from '../../utils/tagColors';

const SYSTEM_FOLDER_IDS = ['f-all', 'f-trade', 'f-daily', 'f-sessions', 'f-goals', 'f-plan', 'f-templates'];

export const DailyJournalNotebook: React.FC = () => {
  const {
    notes,
    folders,
    trades,
    selectedNote,
    setSelectedNote,
    addFolder,
    updateFolder,
    deleteFolder,
    updateNote,
    deleteNote,
    addNote,
    addToast,
    formatCurrency,
    theme,
    userSettings,
  } = useTrading();

  const isLight = theme === 'light';

  // State management
  const [selectedFolderId, setSelectedFolderId] = useState<string>('f-all');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [quickFilter, setQuickFilter] = useState<'all' | 'today' | 'favorites' | 'trades' | 'mistakes'>('all');
  const [selectedNoteId, setSelectedNoteId] = useState<string>('');
  const [mobileActiveView, setMobileActiveView] = useState<'sidebar' | 'list' | 'detail'>('list');
  const [showFilterMenu, setShowFilterMenu] = useState<boolean>(false);
  const [showMoreMenu, setShowMoreMenu] = useState<boolean>(false);

  // Modals
  const [isNoteModalOpen, setIsNoteModalOpen] = useState<boolean>(false);
  const [noteToEdit, setNoteToEdit] = useState<JournalNote | null>(null);
  const [isTrashModalOpen, setIsTrashModalOpen] = useState<boolean>(false);
  const [isAddFolderModalOpen, setIsAddFolderModalOpen] = useState<boolean>(false);
  const [newFolderName, setNewFolderName] = useState<string>('');
  const [selectedImagePreview, setSelectedImagePreview] = useState<string | null>(null);

  // Folder kebab menu & rename states
  const [folderMenuOpenId, setFolderMenuOpenId] = useState<string | null>(null);
  const [isRenameFolderModalOpen, setIsRenameFolderModalOpen] = useState<boolean>(false);
  const [folderToRename, setFolderToRename] = useState<JournalFolder | null>(null);
  const [renameFolderName, setRenameFolderName] = useState<string>('');

  // Close folder kebab menu on outside click
  useEffect(() => {
    const handleWindowClick = () => setFolderMenuOpenId(null);
    window.addEventListener('click', handleWindowClick);
    return () => window.removeEventListener('click', handleWindowClick);
  }, []);

  // File upload ref for attachment drag-and-drop
  const attachmentInputRef = useRef<HTMLInputElement | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState<boolean>(false);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState<boolean>(false);

  // Filter out soft-deleted notes for the active view
  const activeNotes = useMemo(() => {
    return notes.filter(n => !n.isDeleted);
  }, [notes]);

  const activeFolders = useMemo(() => {
    return folders.filter(f => !f.isDeleted);
  }, [folders]);

  const deletedCount = useMemo(() => {
    return notes.filter(n => n.isDeleted).length + folders.filter(f => f.isDeleted).length;
  }, [notes, folders]);

  // Dynamic tags list with real counts
  const allTagsWithCounts = useMemo(() => {
    const tagMap = new Map<string, number>();
    activeNotes.forEach(n => {
      if (n.tags && Array.isArray(n.tags)) {
        n.tags.forEach(t => {
          tagMap.set(t, (tagMap.get(t) || 0) + 1);
        });
      }
    });

    // Ensure reference image standard tags exist in view even with 0 counts if not yet added
    const standardTags = ['FOMC', 'Equities', 'Futures', 'Forex', 'A+ Setup', 'Mistake'];
    standardTags.forEach(st => {
      if (!tagMap.has(st)) {
        tagMap.set(st, 0);
      }
    });

    // Also include any user-configured tags from settings
    if (userSettings?.customTags) {
      userSettings.customTags.forEach(ct => {
        if (!tagMap.has(ct.name)) {
          tagMap.set(ct.name, 0);
        }
      });
    }

    return Array.from(tagMap.entries()).map(([name, count]) => ({
      name,
      count,
    }));
  }, [activeNotes, userSettings?.customTags]);

  // Dynamic folder counts
  const folderCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    folders.forEach(f => {
      counts[f.id] = activeNotes.filter(n => n.folderId === f.id).length;
    });
    return counts;
  }, [folders, activeNotes]);

  const uncategorizedCount = useMemo(() => {
    return activeNotes.filter(n => !n.folderId || n.folderId === '').length;
  }, [activeNotes]);

  // Overall Stats
  const totalNotesCount = activeNotes.length;
  const totalTagsCount = allTagsWithCounts.reduce((sum, t) => sum + (t.count > 0 ? t.count : 0), 0);
  const winningTradesCount = activeNotes.filter(n => n.resultR && n.resultR.startsWith('+')).length;

  // Filtered Notes
  const filteredNotes = useMemo(() => {
    return activeNotes.filter(note => {
      // Folder filter
      if (selectedFolderId === 'f-uncategorized') {
        if (note.folderId && note.folderId !== '') return false;
      } else if (selectedFolderId !== 'f-all' && note.folderId !== selectedFolderId) {
        return false;
      }

      // Tag filter
      if (selectedTag && (!note.tags || !note.tags.includes(selectedTag))) {
        return false;
      }

      // Quick filter
      if (quickFilter === 'favorites' && !note.isFavorite) return false;
      if (quickFilter === 'trades' && !note.tradeId && !note.symbol) return false;
      if (quickFilter === 'mistakes' && (!note.tags || !note.tags.includes('Mistake'))) return false;
      if (quickFilter === 'today') {
        const todayStr = new Date().toISOString().split('T')[0];
        if (note.date !== todayStr) return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const inTitle = note.title.toLowerCase().includes(q);
        const inContent = note.content.toLowerCase().includes(q);
        const inTags = note.tags?.some(t => t.toLowerCase().includes(q));
        const inSymbol = note.symbol?.toLowerCase().includes(q);
        const inSetup = note.setup?.toLowerCase().includes(q);
        if (!inTitle && !inContent && !inTags && !inSymbol && !inSetup) {
          return false;
        }
      }

      return true;
    });
  }, [activeNotes, selectedFolderId, selectedTag, quickFilter, searchQuery]);

  // Keep selected note synced
  useEffect(() => {
    if (selectedNote?.id && activeNotes.some(n => n.id === selectedNote.id)) {
      setSelectedNoteId(selectedNote.id);
    } else if (filteredNotes.length > 0 && (!selectedNoteId || !activeNotes.some(n => n.id === selectedNoteId))) {
      setSelectedNoteId(filteredNotes[0].id);
    }
  }, [selectedNote, filteredNotes, activeNotes, selectedNoteId]);

  // Current active note
  const currentNote = useMemo(() => {
    if (selectedNoteId) {
      const found = activeNotes.find(n => n.id === selectedNoteId);
      if (found) return found;
    }
    return filteredNotes[0] || activeNotes[0] || null;
  }, [selectedNoteId, activeNotes, filteredNotes]);

  // Group notes by relative time (Today, Yesterday, Older)
  const groupedNotes = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const groups: { label: string; notes: JournalNote[] }[] = [
      { label: 'Today', notes: [] },
      { label: 'Yesterday', notes: [] },
      { label: 'Older', notes: [] },
    ];

    filteredNotes.forEach(note => {
      if (note.date === todayStr) {
        groups[0].notes.push(note);
      } else if (note.date === yesterdayStr) {
        groups[1].notes.push(note);
      } else {
        groups[2].notes.push(note);
      }
    });

    return groups.filter(g => g.notes.length > 0);
  }, [filteredNotes]);

  // Handlers
  const handleToggleFavorite = (note: JournalNote) => {
    updateNote({
      ...note,
      isFavorite: !note.isFavorite,
    });
    addToast(
      note.isFavorite ? 'Removed from Favorites' : 'Added to Favorites',
      note.title,
      'info'
    );
  };

  const handleSelectNote = (note: JournalNote) => {
    setSelectedNoteId(note.id);
    setSelectedNote(note);
    try {
      localStorage.setItem('tradeforge_active_note_id', note.id);
    } catch {}
    setMobileActiveView('detail');
  };

  const handleSoftDelete = async (note: JournalNote) => {
    await deleteNote(note.id);
    // Select next note
    const remaining = activeNotes.filter(n => n.id !== note.id);
    if (remaining.length > 0) {
      handleSelectNote(remaining[0]);
    } else {
      setSelectedNoteId('');
      setSelectedNote(null);
    }
  };

  const handleOpenRenameFolder = (folder: JournalFolder, e: React.MouseEvent) => {
    e.stopPropagation();
    setFolderToRename(folder);
    setRenameFolderName(folder.name);
    setIsRenameFolderModalOpen(true);
    setFolderMenuOpenId(null);
  };

  const handleRenameFolderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!folderToRename || !renameFolderName.trim()) return;
    await updateFolder(folderToRename.id, renameFolderName.trim());
    setIsRenameFolderModalOpen(false);
    setFolderToRename(null);
    setRenameFolderName('');
  };

  const handleDeleteFolderClick = async (folder: JournalFolder, e: React.MouseEvent) => {
    e.stopPropagation();
    setFolderMenuOpenId(null);
    await deleteFolder(folder.id);
  };

  const handleOpenEdit = (note: JournalNote) => {
    setNoteToEdit(note);
    setIsNoteModalOpen(true);
  };

  const handleOpenNewNote = () => {
    setNoteToEdit(null);
    setIsNoteModalOpen(true);
  };

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    const name = newFolderName.trim();
    const created = await addFolder(name, 'Folder');
    setNewFolderName('');
    setIsAddFolderModalOpen(false);
    if (created) {
      setSelectedFolderId(created.id);
    }
  };

  const handleDuplicateNote = (note: JournalNote) => {
    const duplicated: Omit<JournalNote, 'id'> = {
      ...note,
      title: `${note.title} (Copy)`,
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
      isDeleted: false,
    };
    addNote(duplicated);
    setShowMoreMenu(false);
    addToast('Note Duplicated', duplicated.title, 'success');
  };

  const handleExportMarkdown = (note: JournalNote) => {
    const markdownContent = `# ${note.title}
Date: ${note.date} ${note.time || ''}
Tags: ${note.tags?.join(', ') || 'None'}
Symbol: ${note.symbol || 'N/A'}
Side: ${note.side || 'N/A'}
Result: ${note.resultR || 'N/A'}

## Thesis & Log
${note.content}
`;
    const blob = new Blob([markdownContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${note.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.md`;
    a.click();
    URL.revokeObjectURL(url);
    setShowMoreMenu(false);
    addToast('Exported to Markdown', note.title, 'info');
  };

  // Direct Attachment Upload onto current note
  const handleUploadFilesToCurrentNote = async (files: FileList | null) => {
    if (!files || files.length === 0 || !currentNote) return;

    setIsUploadingAttachment(true);
    try {
      const existingAttachments = currentNote.attachments || [];
      const newAtts: JournalAttachment[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        let fileUrl = '';
        try {
          fileUrl = await SupabaseStorageService.uploadJournalScreenshot(file, currentNote.id);
        } catch {
          fileUrl = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.readAsDataURL(file);
          });
        }

        newAtts.push({
          id: `att-${Date.now()}-${i}`,
          name: file.name,
          url: fileUrl,
          type: file.type.startsWith('image/') ? 'image' : file.type.includes('pdf') ? 'pdf' : 'document',
          size: file.size,
          date: new Date().toISOString().split('T')[0],
        });
      }

      const updated = {
        ...currentNote,
        attachments: [...existingAttachments, ...newAtts],
        screenshots: [
          ...(currentNote.screenshots || []),
          ...newAtts.filter(a => a.type === 'image').map(a => a.url),
        ],
      };

      updateNote(updated);
      addToast('Attachment Added', `${newAtts.length} file(s) attached to note`, 'success');
    } catch (err: any) {
      console.error(err);
      addToast('Upload Error', 'Could not upload attachment', 'error');
    } finally {
      setIsUploadingAttachment(false);
      if (attachmentInputRef.current) attachmentInputRef.current.value = '';
    }
  };

  const handleRemoveAttachmentFromNote = (attId: string) => {
    if (!currentNote) return;
    const updatedAtts = (currentNote.attachments || []).filter(a => a.id !== attId);
    const updatedScreenshots = updatedAtts.filter(a => a.type === 'image').map(a => a.url);
    updateNote({
      ...currentNote,
      attachments: updatedAtts,
      screenshots: updatedScreenshots,
    });
    addToast('Attachment Removed', 'File deleted from note', 'info');
  };

  // Helper styling for tag pills
  const getTagCustomStyle = (tag: string) => {
    const color = getTagColor(tag, userSettings?.customTags);
    return {
      backgroundColor: hexToRgba(color, 0.16),
      borderColor: hexToRgba(color, 0.4),
      color: color,
    };
  };

  return (
    <div
      id="daily-journal-workspace"
      className={`h-full flex flex-col overflow-hidden font-sans transition-colors duration-200 ${
        isLight ? 'bg-[#F3F5F8] text-zinc-900' : 'bg-[#07080B] text-slate-100'
      }`}
    >
      {/* Mobile Segmented Navigation Bar */}
      <div className={`md:hidden flex items-center justify-between p-2 border-b shrink-0 ${
        isLight ? 'border-zinc-200 bg-white' : 'border-[#1C232E] bg-[#12161D]'
      }`}>
        <div className="flex items-center gap-1 w-full">
          <button
            type="button"
            onClick={() => setMobileActiveView('sidebar')}
            className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
              mobileActiveView === 'sidebar'
                ? isLight
                  ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-2xs'
                  : 'bg-indigo-600/25 text-indigo-300 border border-indigo-500/40 shadow-xs'
                : isLight
                  ? 'text-zinc-600 hover:text-zinc-900'
                  : 'text-slate-400 hover:text-white'
            }`}
          >
            <FolderOpen className="w-3.5 h-3.5" />
            <span>Folders</span>
          </button>
          <button
            type="button"
            onClick={() => setMobileActiveView('list')}
            className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
              mobileActiveView === 'list'
                ? isLight
                  ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-2xs'
                  : 'bg-indigo-600/25 text-indigo-300 border border-indigo-500/40 shadow-xs'
                : isLight
                  ? 'text-zinc-600 hover:text-zinc-900'
                  : 'text-slate-400 hover:text-white'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Notes ({filteredNotes.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setMobileActiveView('detail')}
            className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
              mobileActiveView === 'detail'
                ? isLight
                  ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-2xs'
                  : 'bg-indigo-600/25 text-indigo-300 border border-indigo-500/40 shadow-xs'
                : isLight
                  ? 'text-zinc-600 hover:text-zinc-900'
                  : 'text-slate-400 hover:text-white'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Detail</span>
          </button>
        </div>
      </div>

      {/* Primary 3-Panel Grid */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        
        {/* ========================================================================= */}
        {/* PANEL 1: LEFT SIDEBAR (Folders, Tags, Journal Stats, Recently Deleted)  */}
        {/* ========================================================================= */}
        <aside
          id="journal-left-sidebar"
          className={`w-full md:w-56 lg:w-64 shrink-0 border-r flex flex-col justify-between overflow-y-auto custom-scrollbar p-3 space-y-4 ${
            isLight
              ? 'bg-white border-zinc-200'
              : 'bg-[#0A0E18] border-[#1C232E]'
          } ${mobileActiveView === 'sidebar' ? 'flex' : 'hidden md:flex'}`}
        >
          <div className="space-y-4">
            {/* + Add Folder Button */}
            <button
              id="btn-add-folder"
              onClick={() => setIsAddFolderModalOpen(true)}
              className={`w-full py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition shadow-2xs active:scale-[0.98] cursor-pointer ${
                isLight
                  ? 'bg-zinc-50 hover:bg-zinc-100 border-zinc-200 text-zinc-800'
                  : 'bg-[#1A1F27] hover:bg-[#1A233A] border-indigo-500/30 text-slate-200'
              }`}
            >
              <Plus className="w-3.5 h-3.5 text-indigo-500" />
              <span>+ Add Folder</span>
            </button>

            {/* Folders Section */}
            <div className="space-y-1">
              <div className="flex items-center justify-between px-2 py-1">
                <span className={`text-[10px] font-bold uppercase tracking-wider ${
                  isLight ? 'text-zinc-500' : 'text-slate-400'
                }`}>
                  FOLDERS
                </span>
                <span className={`text-[10px] font-mono ${
                  isLight ? 'text-zinc-400' : 'text-slate-500'
                }`}>
                  {folders.length + 1}
                </span>
              </div>

              {/* "All Notes" item */}
              <button
                onClick={() => {
                  setSelectedFolderId('f-all');
                  setSelectedTag(null);
                  setMobileActiveView('list');
                }}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition cursor-pointer ${
                  selectedFolderId === 'f-all' && !selectedTag
                    ? isLight
                      ? 'bg-indigo-50 text-indigo-900 font-semibold border border-indigo-200'
                      : 'bg-indigo-600/20 text-white font-semibold border border-indigo-500/30'
                    : isLight
                      ? 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
                      : 'text-slate-400 hover:bg-[#1A1F27] hover:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <BookOpen className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                  <span className="truncate">All Notes</span>
                </div>
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.5 rounded-md border ${
                    selectedFolderId === 'f-all' && !selectedTag
                      ? isLight
                        ? 'bg-indigo-100 text-indigo-700 border-indigo-200'
                        : 'bg-indigo-900/50 text-indigo-200 border-indigo-700/50'
                      : isLight
                        ? 'bg-zinc-100 text-zinc-600 border-zinc-200'
                        : 'bg-[#12161D] text-slate-400 border-[#1C232E]'
                  }`}
                >
                  {totalNotesCount}
                </span>
              </button>

              {/* Dynamic Folders */}
              {activeFolders.map(f => {
                const count = folderCounts[f.id] || 0;
                const isSelected = selectedFolderId === f.id && !selectedTag;
                const isSystemFolder = SYSTEM_FOLDER_IDS.includes(f.id);
                const isMenuOpen = folderMenuOpenId === f.id;

                return (
                  <div key={f.id} className="relative group flex items-center">
                    <button
                      onClick={() => {
                        setSelectedFolderId(f.id);
                        setSelectedTag(null);
                        setMobileActiveView('list');
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition cursor-pointer ${
                        !isSystemFolder ? 'pr-8' : ''
                      } ${
                        isSelected
                          ? isLight
                            ? 'bg-indigo-50 text-indigo-900 font-semibold border border-indigo-200'
                            : 'bg-indigo-600/20 text-white font-semibold border border-indigo-500/30'
                          : isLight
                            ? 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
                            : 'text-slate-400 hover:bg-[#1A1F27] hover:text-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <FolderIcon className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                        <span className="truncate">{f.name}</span>
                      </div>
                      <span
                        className={`text-[10px] font-mono px-1.5 py-0.5 rounded-md border ${
                          isSelected
                            ? isLight
                              ? 'bg-indigo-100 text-indigo-700 border-indigo-200'
                              : 'bg-indigo-900/50 text-indigo-200 border-indigo-700/50'
                            : isLight
                              ? 'bg-zinc-100 text-zinc-600 border-zinc-200'
                              : 'bg-slate-900/80 text-slate-400 border-slate-800'
                        }`}
                      >
                        {count}
                      </span>
                    </button>

                    {/* Kebab action for custom user folders */}
                    {!isSystemFolder && (
                      <div className="absolute right-1 top-1/2 -translate-y-1/2 z-10">
                        <button
                          type="button"
                          title="Folder options"
                          onClick={(e) => {
                            e.stopPropagation();
                            setFolderMenuOpenId(isMenuOpen ? null : f.id);
                          }}
                          className={`p-1 rounded transition opacity-0 group-hover:opacity-100 ${
                            isMenuOpen
                              ? isLight ? 'opacity-100 bg-zinc-200' : 'opacity-100 bg-[#1A1F27]'
                              : ''
                          } ${
                            isLight
                              ? 'hover:bg-zinc-200 text-zinc-500 hover:text-zinc-900'
                              : 'hover:bg-[#252D3A] text-slate-400 hover:text-white'
                          } cursor-pointer`}
                        >
                          <MoreHorizontal className="w-3.5 h-3.5" />
                        </button>

                        {isMenuOpen && (
                          <div
                            className={`absolute right-0 mt-1 w-36 rounded-xl border shadow-xl p-1 z-30 space-y-0.5 ${
                              isLight
                                ? 'bg-white border-zinc-200 text-zinc-800'
                                : 'bg-[#12161D] border-[#1C232E] text-slate-300'
                            }`}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              onClick={(e) => handleOpenRenameFolder(f, e)}
                              className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition text-left cursor-pointer ${
                                isLight
                                  ? 'text-zinc-700 hover:text-zinc-900 hover:bg-zinc-100'
                                  : 'text-slate-300 hover:text-white hover:bg-[#1A1F27]'
                              }`}
                            >
                              <Edit3 className="w-3.5 h-3.5 text-indigo-500" />
                              Rename Folder
                            </button>
                            <button
                              type="button"
                              onClick={(e) => handleDeleteFolderClick(f, e)}
                              className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-rose-500 hover:text-rose-600 transition text-left cursor-pointer ${
                                isLight ? 'hover:bg-rose-50' : 'hover:bg-rose-950/30'
                              }`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              Move to Trash
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Uncategorized Notes Folder (if any exist) */}
              {uncategorizedCount > 0 && (
                <button
                  onClick={() => {
                    setSelectedFolderId('f-uncategorized');
                    setSelectedTag(null);
                    setMobileActiveView('list');
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition cursor-pointer ${
                    selectedFolderId === 'f-uncategorized' && !selectedTag
                      ? isLight
                        ? 'bg-indigo-50 text-indigo-900 font-semibold border border-indigo-200'
                        : 'bg-indigo-600/20 text-white font-semibold border border-indigo-500/30'
                      : isLight
                        ? 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
                        : 'text-slate-400 hover:bg-[#1A1F27] hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <FolderIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">Uncategorized</span>
                  </div>
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.5 rounded-md border ${
                      selectedFolderId === 'f-uncategorized' && !selectedTag
                        ? isLight
                          ? 'bg-indigo-100 text-indigo-700 border-indigo-200'
                          : 'bg-indigo-900/50 text-indigo-200 border-indigo-700/50'
                        : isLight
                          ? 'bg-zinc-100 text-zinc-600 border-zinc-200'
                          : 'bg-slate-900/80 text-slate-400 border-slate-800'
                    }`}
                  >
                    {uncategorizedCount}
                  </span>
                </button>
              )}
            </div>

            {/* Tags Section */}
            <div className="space-y-1">
              <div className="flex items-center justify-between px-2 py-1">
                <span className={`text-[10px] font-bold uppercase tracking-wider ${
                  isLight ? 'text-zinc-500' : 'text-slate-400'
                }`}>
                  TAGS
                </span>
                {selectedTag && (
                  <button
                    onClick={() => setSelectedTag(null)}
                    className="text-[10px] text-purple-500 hover:text-purple-600 font-semibold cursor-pointer"
                  >
                    Clear Filter
                  </button>
                )}
              </div>

              {allTagsWithCounts.map(({ name, count }) => {
                const isSelected = selectedTag === name;
                const tagColor = getTagColor(name, userSettings?.customTags);
                return (
                  <button
                    key={name}
                    onClick={() => {
                      if (isSelected) {
                        setSelectedTag(null);
                      } else {
                        setSelectedTag(name);
                        setMobileActiveView('list');
                      }
                    }}
                    style={isSelected ? {
                      backgroundColor: hexToRgba(tagColor, isLight ? 0.12 : 0.2),
                      borderColor: hexToRgba(tagColor, isLight ? 0.45 : 0.55),
                      color: tagColor,
                    } : undefined}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition cursor-pointer border ${
                      isSelected
                        ? 'font-semibold'
                        : isLight
                          ? 'border-transparent text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
                          : 'border-transparent text-slate-400 hover:bg-[#1A1F27] hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: tagColor }} />
                      <span className="truncate">{name}</span>
                    </div>
                    <span
                      style={isSelected ? {
                        backgroundColor: hexToRgba(tagColor, isLight ? 0.2 : 0.3),
                        borderColor: hexToRgba(tagColor, isLight ? 0.5 : 0.6),
                        color: tagColor,
                      } : undefined}
                      className={`text-[10px] font-mono px-1.5 py-0.5 rounded-md border ${
                        isSelected
                          ? 'font-bold'
                          : isLight
                            ? 'bg-zinc-100 text-zinc-600 border-zinc-200'
                            : 'bg-[#12161D] text-slate-400 border-[#1C232E]'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Bottom Sidebar: Journal Stats Card & Trash */}
          <div className="space-y-3 pt-2">
            {/* Journal Stats Card */}
            <div
              id="card-journal-stats"
              className={`p-3 rounded-xl border space-y-2.5 ${
                isLight
                  ? 'bg-zinc-50 border-zinc-200'
                  : 'bg-[#12161D] border-[#1C232E]'
              }`}
            >
              <div className={`flex items-center gap-1.5 text-xs font-bold ${
                isLight ? 'text-zinc-800' : 'text-slate-200'
              }`}>
                <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
                <span>Journal Stats</span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className={`p-2 rounded-lg border ${
                  isLight
                    ? 'bg-white border-zinc-200 shadow-2xs'
                    : 'bg-[#0A0D14] border-[#1C232E]'
                }`}>
                  <span className={`text-[10px] block mb-0.5 ${isLight ? 'text-zinc-500' : 'text-slate-400'}`}>Total Notes</span>
                  <span className={`text-sm font-bold font-mono ${isLight ? 'text-zinc-900' : 'text-white'}`}>{totalNotesCount}</span>
                </div>
                <div className={`p-2 rounded-lg border ${
                  isLight
                    ? 'bg-white border-zinc-200 shadow-2xs'
                    : 'bg-[#0A0D14] border-[#1C232E]'
                }`}>
                  <span className={`text-[10px] block mb-0.5 ${isLight ? 'text-zinc-500' : 'text-slate-400'}`}>Total Tags</span>
                  <span className={`text-sm font-bold font-mono ${isLight ? 'text-zinc-900' : 'text-white'}`}>{totalTagsCount}</span>
                </div>
              </div>
            </div>

            {/* Recently Deleted (Trash Bin) */}
            <button
              id="btn-recently-deleted"
              onClick={() => setIsTrashModalOpen(true)}
              className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs transition border cursor-pointer ${
                isLight
                  ? 'bg-zinc-50 hover:bg-zinc-100 border-zinc-200 text-zinc-700'
                  : 'bg-[#12161D] hover:bg-[#1A1F27] border-[#1C232E] text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                <Trash2 className="w-3.5 h-3.5 text-slate-400" />
                <span>Recently Deleted</span>
              </div>
              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-md border ${
                isLight
                  ? 'bg-white text-zinc-600 border-zinc-200'
                  : 'bg-[#0A0D14] text-slate-400 border-[#1C232E]'
              }`}>
                {deletedCount}
              </span>
            </button>
          </div>
        </aside>

        {/* ========================================================================= */}
        {/* PANEL 2: MIDDLE NOTES LIST (Search, New Note, Grouped List, Active Card)  */}
        {/* ========================================================================= */}
        <section
          id="journal-middle-notes-list"
          className={`w-full md:w-80 lg:w-96 shrink-0 border-r flex flex-col overflow-hidden ${
            isLight
              ? 'bg-[#F8F9FB] border-zinc-200'
              : 'bg-[#0A0D14] border-[#1C232E]'
          } ${mobileActiveView === 'list' ? 'flex' : 'hidden md:flex'}`}
        >
          {/* Top Actions: + New Note & Search Bar */}
          <div className={`p-3.5 space-y-2.5 border-b shrink-0 ${
            isLight ? 'border-zinc-200 bg-white' : 'border-[#1C232E] bg-[#0A0D14]'
          }`}>
            {/* + New Note Button (Electric Blue / Purple Gradient) */}
            <button
              id="btn-new-note"
              onClick={handleOpenNewNote}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md shadow-indigo-600/20 border border-indigo-400/30 transition active:scale-[0.98] cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ New Note</span>
            </button>

            {/* Search and Filters */}
            <div className="flex items-center gap-2 relative">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search notes..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className={`w-full rounded-xl pl-9 pr-3 py-1.5 text-xs focus:outline-none border transition ${
                    isLight
                      ? 'bg-white border-zinc-200 text-zinc-900 placeholder-zinc-400 focus:border-indigo-500 shadow-2xs'
                      : 'bg-[#0A0D14] border-[#1C232E] text-white placeholder-slate-500 focus:border-indigo-500'
                  }`}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
                  >
                    ×
                  </button>
                )}
              </div>

              {/* Filter Button */}
              <div className="relative">
                <button
                  onClick={() => setShowFilterMenu(!showFilterMenu)}
                  className={`p-2 rounded-xl border transition cursor-pointer ${
                    quickFilter !== 'all'
                      ? 'bg-indigo-600/20 border-indigo-500 text-indigo-500 font-semibold'
                      : isLight
                        ? 'bg-white border-zinc-200 text-zinc-600 hover:text-zinc-900 shadow-2xs'
                        : 'bg-[#0A0D14] border-[#1C232E] text-slate-400 hover:text-white'
                  }`}
                  title="Filter options"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                </button>

                {showFilterMenu && (
                  <div
                    className={`absolute right-0 mt-1 w-44 rounded-xl border shadow-xl py-1.5 z-30 text-xs ${
                      isLight
                        ? 'bg-white border-zinc-200 text-zinc-800'
                        : 'bg-[#12161D] border-[#1C232E] text-slate-200'
                    }`}
                    onMouseLeave={() => setShowFilterMenu(false)}
                  >
                    <div className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${
                      isLight ? 'text-zinc-400' : 'text-slate-400'
                    }`}>
                      Quick Filters
                    </div>
                    {[
                      { key: 'all', label: 'All Notes' },
                      { key: 'today', label: "Today's Notes" },
                      { key: 'favorites', label: 'Starred Favorites' },
                      { key: 'trades', label: 'With Trade Data' },
                      { key: 'mistakes', label: 'Mistake Reviews' },
                    ].map(f => (
                      <button
                        key={f.key}
                        onClick={() => {
                          setQuickFilter(f.key as any);
                          setShowFilterMenu(false);
                        }}
                        className={`w-full text-left px-3 py-1.5 flex items-center justify-between transition cursor-pointer ${
                          isLight ? 'hover:bg-zinc-100' : 'hover:bg-[#1A1F27]'
                        } ${
                          quickFilter === f.key
                            ? 'text-indigo-600 font-semibold'
                            : isLight ? 'text-zinc-700' : 'text-slate-300'
                        }`}
                      >
                        <span>{f.label}</span>
                        {quickFilter === f.key && <Check className="w-3.5 h-3.5" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Grouped Notes List */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-4">
            {groupedNotes.length === 0 ? (
              <div className="text-center py-12 px-4 space-y-2">
                <FileText className={`w-8 h-8 mx-auto ${isLight ? 'text-zinc-400' : 'text-slate-600'}`} />
                <p className={`text-xs font-semibold ${isLight ? 'text-zinc-700' : 'text-slate-400'}`}>No notes found</p>
                <p className={`text-[11px] ${isLight ? 'text-zinc-500' : 'text-slate-500'}`}>
                  Try adjusting your search query, folder, or tag filters.
                </p>
              </div>
            ) : (
              groupedNotes.map(group => (
                <div key={group.label} className="space-y-2">
                  <div className={`text-[11px] font-bold px-1 pt-1 tracking-wide ${
                    isLight ? 'text-zinc-500' : 'text-slate-400'
                  }`}>
                    {group.label}
                  </div>

                  <div className="space-y-2">
                    {group.notes.map(note => {
                      const isSelected = currentNote?.id === note.id;
                      return (
                        <div
                          key={note.id}
                          id={`note-card-${note.id}`}
                          onClick={() => handleSelectNote(note)}
                          className={`p-3.5 rounded-xl border cursor-pointer transition-all duration-150 relative space-y-2 ${
                            isSelected
                              ? isLight
                                ? 'bg-indigo-50/90 border-indigo-400/90 shadow-sm ring-1 ring-indigo-300'
                                : 'bg-[#1A1F27] border-indigo-500/80 shadow-md shadow-indigo-950/40 ring-1 ring-indigo-500/40'
                              : isLight
                                ? 'bg-white hover:bg-zinc-50 border-zinc-200 hover:border-zinc-300 shadow-2xs'
                                : 'bg-[#12161D] hover:bg-[#1A1F27] border-[#1C232E] hover:border-[#2A3444]'
                          }`}
                        >
                          {/* Top Row: Title + Time */}
                          <div className="flex items-start justify-between gap-2">
                            <h3 className={`text-xs font-bold truncate leading-snug ${
                              isSelected
                                ? isLight ? 'text-indigo-950 font-extrabold' : 'text-white'
                                : isLight ? 'text-zinc-900' : 'text-white'
                            }`}>
                              {note.title}
                            </h3>
                            <span className={`text-[11px] font-mono shrink-0 ${
                              isLight ? 'text-zinc-500' : 'text-slate-400'
                            }`}>
                              {note.time || note.date}
                            </span>
                          </div>

                          {/* Excerpt */}
                          <p className={`text-[11px] line-clamp-2 leading-relaxed font-normal ${
                            isLight ? 'text-zinc-600' : 'text-slate-400'
                          }`}>
                            {note.content}
                          </p>

                          {/* Footer Tags & Trade Metric Pills */}
                          <div className="flex items-center justify-between gap-1.5 pt-0.5">
                            <div className="flex flex-wrap items-center gap-1.5">
                              {note.tags && note.tags.slice(0, 2).map(tag => {
                                const customStyle = getTagCustomStyle(tag);
                                return (
                                  <span
                                    key={tag}
                                    style={customStyle}
                                    className="text-[10px] px-2 py-0.5 rounded-md border font-medium inline-flex items-center gap-1 shadow-2xs"
                                  >
                                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: customStyle.color }} />
                                    {tag}
                                  </span>
                                );
                              })}
                              {note.tags && note.tags.length > 2 && (
                                <span className={`text-[10px] ${isLight ? 'text-zinc-400' : 'text-slate-500'}`}>
                                  +{note.tags.length - 2}
                                </span>
                              )}
                            </div>

                            {/* Result Pill if available */}
                            {note.resultR && (
                              <span
                                className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md border ${
                                  note.resultR.startsWith('+')
                                    ? isLight
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                      : 'bg-emerald-950/50 text-emerald-400 border-emerald-800/50'
                                    : isLight
                                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                                      : 'bg-rose-950/50 text-rose-400 border-rose-800/50'
                                }`}
                              >
                                {note.resultR}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Bottom Note Count Footer */}
          <div className={`py-2.5 px-3 border-t text-center shrink-0 ${
            isLight ? 'border-zinc-200 bg-white' : 'border-slate-800/70 bg-transparent'
          }`}>
            <span className={`text-[11px] ${isLight ? 'text-zinc-500' : 'text-slate-400'}`}>
              Showing {filteredNotes.length} of {activeNotes.length} notes
            </span>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* PANEL 3: RIGHT PANEL (Selected Note Details, Trade Summary, Attachments)  */}
        {/* ========================================================================= */}
        <main
          id="journal-right-detail-panel"
          className={`flex-1 flex flex-col overflow-y-auto custom-scrollbar p-4 sm:p-6 space-y-6 ${
            isLight ? 'bg-white' : 'bg-[#0A0D14]'
          } ${mobileActiveView === 'detail' ? 'flex' : 'hidden md:flex'}`}
        >
          {currentNote ? (
            <>
              {/* Mobile Back to Notes List Button */}
              <div className={`md:hidden flex items-center justify-between pb-2 border-b ${
                isLight ? 'border-zinc-200' : 'border-[#1C232E]'
              }`}>
                <button
                  type="button"
                  onClick={() => setMobileActiveView('list')}
                  className={`inline-flex items-center gap-1.5 text-xs font-semibold py-1.5 px-3 rounded-xl border cursor-pointer ${
                    isLight
                      ? 'bg-zinc-100 hover:bg-zinc-200 border-zinc-200 text-indigo-600'
                      : 'bg-[#1A1F27] border-[#1C232E] text-indigo-400 hover:text-indigo-300'
                  }`}
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Back to Notes List</span>
                </button>
              </div>

              {/* Header: Title, Star, Edit, Delete, More Actions */}
              <div className={`space-y-3 pb-2 border-b ${isLight ? 'border-zinc-200' : 'border-[#1C232E]'}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <h1 className={`text-lg sm:text-xl font-bold tracking-tight truncate ${
                      isLight ? 'text-zinc-900' : 'text-white'
                    }`}>
                      {currentNote.title}
                    </h1>
                    <button
                      onClick={() => handleToggleFavorite(currentNote)}
                      className={`p-1 rounded-lg transition cursor-pointer ${
                        isLight ? 'hover:bg-zinc-100' : 'hover:bg-[#1A1F27]'
                      }`}
                      title={currentNote.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                    >
                      <Star
                        className={`w-4 h-4 ${
                          currentNote.isFavorite
                            ? 'text-amber-500 fill-amber-500'
                            : isLight ? 'text-zinc-400 hover:text-amber-500' : 'text-slate-500 hover:text-amber-400'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Actions (Edit, Delete, More) */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      id="btn-edit-current-note"
                      onClick={() => handleOpenEdit(currentNote)}
                      className={`p-2 rounded-xl border transition shadow-2xs cursor-pointer ${
                        isLight
                          ? 'bg-zinc-50 hover:bg-zinc-100 border-zinc-200 text-zinc-700 hover:text-zinc-900'
                          : 'bg-[#12161D] hover:bg-[#1A1F27] border-[#1C232E] text-slate-300 hover:text-white'
                      }`}
                      title="Edit Note"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      id="btn-delete-current-note"
                      onClick={() => handleSoftDelete(currentNote)}
                      className={`p-2 rounded-xl border transition shadow-2xs cursor-pointer ${
                        isLight
                          ? 'bg-rose-50 hover:bg-rose-100 border-rose-200 text-rose-600'
                          : 'bg-rose-950/30 hover:bg-rose-900/50 border-rose-900/40 text-rose-400 hover:text-rose-300'
                      }`}
                      title="Move to Trash"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    {/* More Dropdown */}
                    <div className="relative">
                      <button
                        onClick={() => setShowMoreMenu(!showMoreMenu)}
                        className={`p-2 rounded-xl border transition shadow-2xs cursor-pointer ${
                          isLight
                            ? 'bg-zinc-50 hover:bg-zinc-100 border-zinc-200 text-zinc-700 hover:text-zinc-900'
                            : 'bg-[#12161D] hover:bg-[#1A1F27] border-[#1C232E] text-slate-300 hover:text-white'
                        }`}
                        title="More actions"
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </button>

                      {showMoreMenu && (
                        <div
                          className={`absolute right-0 mt-1.5 w-48 rounded-xl border shadow-xl py-1.5 z-30 text-xs ${
                            isLight
                              ? 'bg-white border-zinc-200 text-zinc-800'
                              : 'bg-[#12161D] border-[#1C232E] text-slate-200'
                          }`}
                          onMouseLeave={() => setShowMoreMenu(false)}
                        >
                          <button
                            onClick={() => handleDuplicateNote(currentNote)}
                            className={`w-full text-left px-3.5 py-2 flex items-center gap-2 transition ${
                              isLight ? 'hover:bg-zinc-100 text-zinc-700' : 'hover:bg-slate-800 text-slate-300'
                            }`}
                          >
                            <Copy className="w-3.5 h-3.5 text-indigo-500" />
                            <span>Duplicate Note</span>
                          </button>
                          <button
                            onClick={() => handleExportMarkdown(currentNote)}
                            className={`w-full text-left px-3.5 py-2 flex items-center gap-2 transition ${
                              isLight ? 'hover:bg-zinc-100 text-zinc-700' : 'hover:bg-slate-800 text-slate-300'
                            }`}
                          >
                            <Download className="w-3.5 h-3.5 text-emerald-500" />
                            <span>Export as Markdown</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Metadata Pills Row */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {/* Date Pill */}
                  <div className={`text-xs px-2.5 py-1 rounded-lg flex items-center gap-1.5 font-medium border ${
                    isLight
                      ? 'bg-zinc-100 border-zinc-200 text-zinc-700'
                      : 'bg-[#121829] border-slate-800 text-slate-300'
                  }`}>
                    <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                    <span>
                      {safeFormatDate(currentNote.date, '—', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  </div>

                  {/* Time Pill */}
                  {currentNote.time && (
                    <div className={`text-xs px-2.5 py-1 rounded-lg flex items-center gap-1.5 font-mono border ${
                      isLight
                        ? 'bg-zinc-100 border-zinc-200 text-zinc-700'
                        : 'bg-[#121829] border-slate-800 text-slate-300'
                    }`}>
                      <Clock className="w-3.5 h-3.5 text-indigo-500" />
                      <span>{currentNote.time}</span>
                    </div>
                  )}

                  {/* Tags */}
                  {currentNote.tags && currentNote.tags.map(tag => {
                    const customStyle = getTagCustomStyle(tag);
                    return (
                      <div
                        key={tag}
                        style={customStyle}
                        className="text-xs px-2.5 py-1 rounded-lg border flex items-center gap-1.5 font-medium shadow-2xs"
                      >
                        <TagIcon className="w-3 h-3" style={{ color: customStyle.color }} />
                        <span>{tag}</span>
                      </div>
                    );
                  })}

                  {/* Symbol Pill */}
                  {currentNote.symbol && (
                    <div className={`text-xs px-2.5 py-1 rounded-lg font-mono font-bold border ${
                      isLight
                        ? 'bg-zinc-100 border-zinc-200 text-zinc-900'
                        : 'bg-[#121829] border-slate-800 text-white'
                    }`}>
                      {currentNote.symbol}
                    </div>
                  )}

                  {/* Account Name */}
                  {currentNote.accountName && (
                    <div className={`text-xs px-2.5 py-1 rounded-lg border ${
                      isLight
                        ? 'bg-zinc-100 border-zinc-200 text-zinc-700'
                        : 'bg-[#121829] border-slate-800 text-slate-300'
                    }`}>
                      {currentNote.accountName}
                    </div>
                  )}
                </div>
              </div>

              {/* Note Content Section */}
              <div className="space-y-2">
                <div className={`text-xs font-bold uppercase tracking-wider ${
                  isLight ? 'text-indigo-600' : 'text-purple-400'
                }`}>
                  Note
                </div>
                <div
                  id="note-content-display"
                  className={`p-4 rounded-xl border leading-relaxed text-xs sm:text-sm font-sans space-y-3 whitespace-pre-line ${
                    isLight
                      ? 'bg-[#F8F9FB] border-zinc-200 text-zinc-800'
                      : 'bg-[#0B0E18] border-slate-800/80 text-slate-200'
                  }`}
                >
                  {currentNote.content}
                </div>
              </div>

              {/* Trade Summary Section (If Trade metadata or Result is available) */}
              {(currentNote.resultR || currentNote.setup || currentNote.side || currentNote.accountName || currentNote.symbol) && (
                <div className="space-y-2">
                  <div className={`text-xs font-bold uppercase tracking-wider ${
                    isLight ? 'text-indigo-600' : 'text-purple-400'
                  }`}>
                    Trade Summary
                  </div>

                  <div
                    id="trade-summary-card"
                    className={`p-4 rounded-xl border ${
                      isLight
                        ? 'bg-[#F8F9FB] border-zinc-200'
                        : 'bg-[#0B0E18] border-slate-800/80'
                    }`}
                  >
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                      {/* Symbol */}
                      <div>
                        <span className={`text-[10px] block mb-1 ${isLight ? 'text-zinc-500' : 'text-slate-400'}`}>Symbol</span>
                        <span className={`text-xs sm:text-sm font-mono font-bold ${
                          isLight ? 'text-zinc-900' : 'text-white'
                        }`}>
                          {currentNote.symbol || '--'}
                        </span>
                      </div>

                      {/* Side */}
                      <div>
                        <span className={`text-[10px] block mb-1 ${isLight ? 'text-zinc-500' : 'text-slate-400'}`}>Side</span>
                        <span
                          className={`text-xs sm:text-sm font-semibold ${
                            currentNote.side?.toLowerCase().includes('long') || currentNote.side === 'BUY'
                              ? 'text-emerald-500'
                              : currentNote.side?.toLowerCase().includes('short') || currentNote.side === 'SELL'
                                ? 'text-rose-500'
                                : isLight ? 'text-zinc-700' : 'text-slate-300'
                          }`}
                        >
                          {currentNote.side || '--'}
                        </span>
                      </div>

                      {/* Result (R:R) */}
                      <div>
                        <span className={`text-[10px] block mb-1 ${isLight ? 'text-zinc-500' : 'text-slate-400'}`}>Result (R:R)</span>
                        <span
                          className={`text-sm sm:text-base font-mono font-bold ${
                            currentNote.resultR?.startsWith('+')
                              ? 'text-emerald-500'
                              : currentNote.resultR?.startsWith('-')
                                ? 'text-rose-500'
                                : isLight ? 'text-zinc-900' : 'text-white'
                          }`}
                        >
                          {currentNote.resultR || '--'}
                        </span>
                      </div>

                      {/* Setup */}
                      <div>
                        <span className={`text-[10px] block mb-1 ${isLight ? 'text-zinc-500' : 'text-slate-400'}`}>Setup</span>
                        <span className={`text-xs sm:text-sm font-medium ${isLight ? 'text-zinc-800' : 'text-slate-200'}`}>
                          {currentNote.setup || '--'}
                        </span>
                      </div>

                      {/* Account */}
                      <div>
                        <span className={`text-[10px] block mb-1 ${isLight ? 'text-zinc-500' : 'text-slate-400'}`}>Account</span>
                        <span className={`text-xs sm:text-sm font-medium truncate block ${isLight ? 'text-zinc-800' : 'text-slate-200'}`} title={currentNote.accountName}>
                          {currentNote.accountName || 'Prop Firm'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Attachments Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className={`text-xs font-bold uppercase tracking-wider ${
                    isLight ? 'text-indigo-600' : 'text-purple-400'
                  }`}>
                    Attachments
                  </div>
                  <input
                    type="file"
                    ref={attachmentInputRef}
                    onChange={e => handleUploadFilesToCurrentNote(e.target.files)}
                    multiple
                    accept="image/*,application/pdf,.doc,.docx"
                    className="hidden"
                  />
                  <button
                    onClick={() => attachmentInputRef.current?.click()}
                    disabled={isUploadingAttachment}
                    className="text-xs text-indigo-500 hover:text-indigo-600 font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{isUploadingAttachment ? 'Uploading...' : '+ Add Attachment'}</span>
                  </button>
                </div>

                {/* Compact Drag & Drop Box */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDraggingOver(true);
                  }}
                  onDragLeave={() => setIsDraggingOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDraggingOver(false);
                    handleUploadFilesToCurrentNote(e.dataTransfer.files);
                  }}
                  onClick={() => attachmentInputRef.current?.click()}
                  className={`w-full h-[88px] border border-dashed rounded-xl px-4 py-2.5 transition flex items-center justify-center gap-3.5 cursor-pointer select-none ${
                    isDraggingOver
                      ? isLight ? 'border-indigo-500 bg-indigo-50' : 'border-indigo-500 bg-indigo-950/20'
                      : isLight
                        ? 'border-zinc-300 hover:border-indigo-500 bg-[#F8F9FB]'
                        : 'border-[#1C232E] hover:border-indigo-500/50 bg-[#0A0D14]'
                  }`}
                >
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500 shrink-0">
                    <Paperclip className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <p className={`text-xs font-semibold ${isLight ? 'text-zinc-800' : 'text-slate-200'}`}>
                      {isUploadingAttachment ? 'Uploading files...' : 'Drop files here or click to upload'}
                    </p>
                    <p className={`text-[11px] ${isLight ? 'text-zinc-500' : 'text-slate-400'}`}>
                      Images, PDFs, Documents · Max 10MB
                    </p>
                  </div>
                </div>

                {/* Uploaded Attachments Gallery */}
                {currentNote.attachments && currentNote.attachments.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
                    {currentNote.attachments.map(att => (
                      <div
                        key={att.id}
                        className={`p-3 rounded-xl border flex flex-col justify-between gap-2.5 transition ${
                          isLight
                            ? 'bg-[#F8F9FB] border-zinc-200'
                            : 'bg-[#12161D] border-slate-800/80 hover:border-slate-700'
                        }`}
                      >
                        {att.type === 'image' ? (
                          <div className="relative group rounded-lg overflow-hidden border border-zinc-200 dark:border-slate-800 aspect-video bg-black/40">
                            <img
                              src={att.url}
                              alt={att.name}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                            />
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                              <button
                                onClick={() => setSelectedImagePreview(att.url)}
                                className="p-1.5 rounded-lg bg-slate-900/80 text-white hover:bg-slate-800 cursor-pointer"
                                title="Enlarge Image"
                              >
                                <Maximize2 className="w-4 h-4" />
                              </button>
                              <a
                                href={att.url}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1.5 rounded-lg bg-slate-900/80 text-white hover:bg-slate-800 cursor-pointer"
                                title="Open in new tab"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            </div>
                          </div>
                        ) : (
                          <div className={`flex items-center gap-2.5 p-2 rounded-lg border ${
                            isLight
                              ? 'bg-white border-zinc-200'
                              : 'bg-slate-900/60 border-slate-800'
                          }`}>
                            <FileText className="w-5 h-5 text-indigo-500 shrink-0" />
                            <div className="truncate">
                              <span className={`text-xs block truncate ${isLight ? 'text-zinc-900 font-medium' : 'text-white'}`}>{att.name}</span>
                              <span className={`text-[10px] font-mono ${isLight ? 'text-zinc-500' : 'text-slate-500'}`}>
                                {att.size ? `${(att.size / 1024).toFixed(0)} KB` : 'Document'}
                              </span>
                            </div>
                          </div>
                        )}

                        <div className="flex items-center justify-between text-xs pt-1">
                          <span className={`text-[11px] truncate ${isLight ? 'text-zinc-500' : 'text-slate-400'}`}>{att.name}</span>
                          <button
                            onClick={() => handleRemoveAttachmentFromNote(att.id)}
                            className="text-slate-400 hover:text-rose-500 p-1 cursor-pointer"
                            title="Remove attachment"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-3">
              <div className={`w-14 h-14 rounded-2xl border flex items-center justify-center shadow-inner ${
                isLight
                  ? 'bg-zinc-100 border-zinc-200 text-zinc-400'
                  : 'bg-[#12161D] border-slate-800 text-slate-500'
              }`}>
                <BookOpen className="w-7 h-7 text-indigo-500" />
              </div>
              <h3 className={`text-base font-bold ${isLight ? 'text-zinc-900' : 'text-white'}`}>No Note Selected</h3>
              <p className={`text-xs max-w-sm ${isLight ? 'text-zinc-500' : 'text-slate-400'}`}>
                Select a journal note from the list on the left or create a new entry to log your thoughts and trading plans.
              </p>
              <button
                onClick={handleOpenNewNote}
                className="py-2 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition active:scale-95 cursor-pointer"
              >
                + Create New Note
              </button>
            </div>
          )}
        </main>
      </div>

      {/* ========================================================================= */}
      {/* MODALS: Note Creation / Edit, Trash Bin, Add Folder, Image Lightbox        */}
      {/* ========================================================================= */}

      {/* Note Creation / Edit Modal */}
      <JournalNoteModal
        isOpen={isNoteModalOpen}
        onClose={() => setIsNoteModalOpen(false)}
        noteToEdit={noteToEdit}
        defaultFolderId={selectedFolderId}
        defaultTag={selectedTag}
      />

      {/* Trash Bin Modal */}
      <JournalTrashModal
        isOpen={isTrashModalOpen}
        onClose={() => setIsTrashModalOpen(false)}
      />

      {/* Add Folder Modal */}
      {isAddFolderModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(4px)' }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsAddFolderModalOpen(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            className={`w-full max-w-md rounded-2xl border p-5 space-y-4 shadow-2xl ${
              isLight
                ? 'bg-white border-zinc-200 text-zinc-900'
                : 'bg-[#0B0F19] border-slate-800 text-white'
            }`}
          >
            <div className="flex items-center justify-between">
              <h3 className={`text-sm font-bold flex items-center gap-2 ${isLight ? 'text-zinc-900' : 'text-white'}`}>
                <FolderPlus className="w-4 h-4 text-indigo-500" />
                Add New Folder
              </h3>
              <button
                onClick={() => setIsAddFolderModalOpen(false)}
                className={`transition cursor-pointer ${isLight ? 'text-zinc-400 hover:text-zinc-700' : 'text-slate-400 hover:text-white'}`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateFolder} className="space-y-4">
              <div className="space-y-1">
                <label className={`text-xs font-semibold ${isLight ? 'text-zinc-700' : 'text-slate-300'}`}>Folder Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Weekly Reviews, Psychology, Macro"
                  value={newFolderName}
                  onChange={e => setNewFolderName(e.target.value)}
                  className={`w-full rounded-xl px-3.5 py-2 text-xs focus:outline-none border transition ${
                    isLight
                      ? 'bg-white border-zinc-300 text-zinc-900 placeholder-zinc-400 focus:border-indigo-500'
                      : 'bg-[#090D16] border-slate-800 text-white placeholder-slate-500 focus:border-indigo-500'
                  }`}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddFolderModalOpen(false)}
                  className={`px-3 py-1.5 rounded-lg text-xs transition cursor-pointer ${
                    isLight ? 'text-zinc-600 hover:text-zinc-900' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white text-xs font-bold shadow-md shadow-indigo-600/30 cursor-pointer"
                >
                  Create Folder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Rename Folder Modal */}
      {isRenameFolderModalOpen && folderToRename && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(4px)' }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsRenameFolderModalOpen(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            className={`w-full max-w-md rounded-2xl border p-5 space-y-4 shadow-2xl ${
              isLight
                ? 'bg-white border-zinc-200 text-zinc-900'
                : 'bg-[#0B0F19] border-slate-800 text-white'
            }`}
          >
            <div className="flex items-center justify-between">
              <h3 className={`text-sm font-bold flex items-center gap-2 ${isLight ? 'text-zinc-900' : 'text-white'}`}>
                <Edit3 className="w-4 h-4 text-indigo-500" />
                Rename Folder
              </h3>
              <button
                onClick={() => setIsRenameFolderModalOpen(false)}
                className={`transition cursor-pointer ${isLight ? 'text-zinc-400 hover:text-zinc-700' : 'text-slate-400 hover:text-white'}`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRenameFolderSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className={`text-xs font-semibold ${isLight ? 'text-zinc-700' : 'text-slate-300'}`}>Folder Name</label>
                <input
                  type="text"
                  required
                  placeholder="Enter folder name"
                  value={renameFolderName}
                  onChange={e => setRenameFolderName(e.target.value)}
                  className={`w-full rounded-xl px-3.5 py-2 text-xs focus:outline-none border transition ${
                    isLight
                      ? 'bg-white border-zinc-300 text-zinc-900 placeholder-zinc-400 focus:border-indigo-500'
                      : 'bg-[#090D16] border-slate-800 text-white placeholder-slate-500 focus:border-indigo-500'
                  }`}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsRenameFolderModalOpen(false)}
                  className={`px-3 py-1.5 rounded-lg text-xs transition cursor-pointer ${
                    isLight ? 'text-zinc-600 hover:text-zinc-900' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white text-xs font-bold shadow-md shadow-indigo-600/30 cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Image Lightbox Preview Modal */}
      {selectedImagePreview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.85)', backdropFilter: 'blur(8px)' }}
          onClick={() => setSelectedImagePreview(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] rounded-2xl overflow-hidden border border-slate-800 bg-black">
            <button
              onClick={() => setSelectedImagePreview(null)}
              className="absolute top-3 right-3 p-2 rounded-full bg-black/70 text-white hover:bg-black cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={selectedImagePreview}
              alt="Preview"
              referrerPolicy="no-referrer"
              className="max-h-[85vh] w-auto object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
};
