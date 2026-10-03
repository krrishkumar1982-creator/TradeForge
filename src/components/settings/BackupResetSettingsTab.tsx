import React, { useState } from 'react';
import {
  Database,
  Download,
  UploadCloud,
  RotateCcw,
  Trash2,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Plus,
  FileCode,
  Sparkles,
  HardDrive,
  FileCheck
} from 'lucide-react';
import { useTrading } from '../../context/TradingContext';
import { UserBackup } from '../../types';

export const BackupResetSettingsTab: React.FC = () => {
  const {
    userBackups,
    createBackup,
    deleteBackup,
    restoreBackup,
    resetToSampleData,
    clearAllTradesData,
    trades,
    notes,
    playbooks,
    accounts,
    userSettings,
    addToast,
    addActivityLog,
    userProfile,
    theme,
  } = useTrading();

  const isLight = theme === 'light';

  const [backupName, setBackupName] = useState('');
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [showWipeModal, setShowWipeModal] = useState(false);
  const [wipeConfirmInput, setWipeConfirmInput] = useState('');
  const [isWiping, setIsWiping] = useState(false);

  const handleCreateBackup = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = backupName.trim() || `Snapshot ${new Date().toLocaleDateString()}`;
    setIsCreatingBackup(true);
    try {
      const fullPayload = {
        exportedAt: new Date().toISOString(),
        version: '2.5.0',
        platform: 'TradeForge Institutional',
        trades,
        notes,
        playbooks,
        accounts,
        userSettings,
      };

      await createBackup(name, fullPayload);
      setBackupName('');
      addToast('Backup Created', `Snapshot "${name}" saved to encrypted store.`, 'success');
    } catch (err: any) {
      addToast('Backup Failed', err.message || 'Unable to generate snapshot', 'error');
    } finally {
      setIsCreatingBackup(false);
    }
  };

  const handleDownloadFullExport = () => {
    const fullPayload = {
      exportedAt: new Date().toISOString(),
      version: '2.5.0',
      platform: 'TradeForge Institutional',
      trades,
      notes,
      playbooks,
      accounts,
      userSettings,
    };

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(fullPayload, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    const dateStr = new Date().toISOString().split('T')[0];
    downloadAnchor.setAttribute('download', `tradeforge_institutional_backup_${dateStr}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    addToast('Backup Exported', `Saved complete archive with ${trades.length} trades.`, 'success');
  };

  const handleFileRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);
        if (!parsed.trades && !parsed.accounts) {
          throw new Error('Invalid TradeForge backup schema');
        }

        if (window.confirm(`Restore backup from "${file.name}"? This will overwrite current journal data.`)) {
          await restoreBackup({
            id: `restored-${Date.now()}`,
            name: file.name,
            sizeBytes: file.size,
            tradeCount: parsed.trades?.length || 0,
            notesCount: parsed.notes?.length || 0,
            backupData: parsed,
            createdAt: new Date().toISOString(),
          });
          addToast('Restore Complete', `Restored ${parsed.trades?.length || 0} trades from file.`, 'success');
        }
      } catch (err: any) {
        addToast('Restore Error', err.message || 'Failed to parse backup JSON', 'error');
      }
    };
    reader.readAsText(file);
  };

  const handleExecuteWipe = async () => {
    if (wipeConfirmInput.trim() !== 'CONFIRM WIPE') {
      addToast('Confirmation Failed', 'You must type CONFIRM WIPE exactly to proceed.', 'error');
      return;
    }

    setIsWiping(true);
    try {
      await clearAllTradesData();
      await addActivityLog({
        action: 'WIPE_ALL_DATA',
        category: 'DATA',
        object: 'Trade History Store',
        status: 'WARNING',
        details: { summary: 'Trader executed nuclear database wipe' },
      });
      setShowWipeModal(false);
      setWipeConfirmInput('');
      addToast('Database Wiped', 'All trades cleared. Your journal is now blank and ready for fresh logging.', 'info');
    } catch (err: any) {
      addToast('Wipe Failed', err.message || 'Could not wipe trade history', 'error');
    } finally {
      setIsWiping(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[rgba(255,255,255,0.06)]">
        <div>
          <h2 className="text-base font-semibold text-[#F4F5F7] flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-[#818CF8]" />
            Data Resilience, Snapshots & Disaster Recovery
          </h2>
          <p className="text-xs text-[#8A919D] mt-0.5">
            Manage point-in-time cloud snapshots, full offline JSON exports, and controlled environment resets.
          </p>
        </div>
      </div>

      {/* Instant Snapshot Card */}
      <div className="p-5 rounded-2xl bg-[#0D1014] border border-[rgba(255,255,255,0.055)] space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-xs font-semibold text-[#F4F5F7] uppercase tracking-wider flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#818CF8]" />
            Create Named Point-in-Time Snapshot
          </div>
          <span className="text-[11px] text-[#8A919D] font-mono">
            {trades.length} Trades • {notes.length} Journals
          </span>
        </div>

        <form onSubmit={handleCreateBackup} className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={backupName}
            onChange={e => setBackupName(e.target.value)}
            placeholder="e.g. Pre-August NQ Roll, Month-End Baseline..."
            className="flex-1 bg-[#080A0D] border border-[rgba(255,255,255,0.08)] rounded-xl px-3.5 py-2 text-xs text-[#F4F5F7] placeholder-[#5E6570] focus:outline-none focus:border-[#6366F1]"
          />
          <button
            type="submit"
            disabled={isCreatingBackup}
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-[#6366F1] hover:bg-[#4F46E5] text-white shadow-xs transition disabled:opacity-50 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{isCreatingBackup ? 'Saving Snapshot...' : 'Create Snapshot'}</span>
          </button>
        </form>

        {/* Existing Snapshots List */}
        <div className="space-y-2 pt-2">
          <div className="text-xs text-[#8A919D] font-medium">Saved Terminal Snapshots:</div>
          {userBackups.length === 0 ? (
            <div className="p-4 rounded-xl bg-[#080A0D] border border-[rgba(255,255,255,0.06)] text-center text-[#5E6570] text-xs font-mono">
              No point-in-time snapshots created yet. Create one above to preserve your exact journal state.
            </div>
          ) : (
            userBackups.map(b => (
              <div
                key={b.id}
                className="p-3.5 rounded-xl bg-[#080A0D] border border-[rgba(255,255,255,0.06)] flex items-center justify-between text-xs transition hover:border-[rgba(255,255,255,0.12)]"
              >
                <div className="space-y-0.5">
                  <div className="font-medium text-[#F4F5F7] flex items-center gap-2">
                    <span>{b.name}</span>
                    <span className="text-[10px] text-[#818CF8] font-mono font-normal">
                      ({(b.sizeBytes ? (b.sizeBytes / 1024).toFixed(1) : '24.5')} KB)
                    </span>
                  </div>
                  <div className="text-[11px] text-[#8A919D] font-mono">
                    {new Date(b.createdAt).toLocaleString()} • {b.tradeCount || trades.length} trades recorded
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm(`Restore from snapshot "${b.name}"?`)) {
                        restoreBackup(b);
                        addToast('Snapshot Restored', `Restored state from ${b.name}`, 'success');
                      }
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#6366F1]/15 hover:bg-[#6366F1]/25 text-[#818CF8] border border-[#6366F1]/30 font-medium transition cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Restore</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm(`Delete snapshot "${b.name}"?`)) {
                        deleteBackup(b.id);
                        addToast('Snapshot Deleted', 'Backup removed from storage.', 'info');
                      }
                    }}
                    className="p-1.5 rounded-lg bg-[#11151A] hover:bg-rose-500/20 text-[#8A919D] hover:text-rose-400 border border-[rgba(255,255,255,0.06)] transition cursor-pointer"
                    title="Delete Snapshot"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Export & Import JSON Archive */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
        <div className="p-5 rounded-2xl bg-[#0D1014] border border-[rgba(255,255,255,0.055)] space-y-3 flex flex-col justify-between">
          <div className="space-y-1.5">
            <div className="font-semibold text-[#F4F5F7] flex items-center gap-2">
              <Download className="w-4 h-4 text-[#818CF8]" />
              Download Offline Master Archive
            </div>
            <p className="text-[#8A919D] leading-relaxed">
              Export an unencrypted JSON document containing all executed trades, accounts, playbooks, notes, and custom risk parameters.
            </p>
          </div>

          <button
            type="button"
            onClick={handleDownloadFullExport}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#11151A] hover:bg-[#151A20] text-[#C2C7D0] hover:text-[#F4F5F7] border border-[rgba(255,255,255,0.08)] font-medium transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download tradeforge_backup.json</span>
          </button>
        </div>

        <div className="p-5 rounded-2xl bg-[#0D1014] border border-[rgba(255,255,255,0.055)] space-y-3 flex flex-col justify-between">
          <div className="space-y-1.5">
            <div className="font-semibold text-[#F4F5F7] flex items-center gap-2">
              <UploadCloud className="w-4 h-4 text-[#818CF8]" />
              Restore from Backup File
            </div>
            <p className="text-[#8A919D] leading-relaxed">
              Upload a previously downloaded TradeForge `.json` file to restore all trades, journals, and institutional configurations.
            </p>
          </div>

          <label className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#11151A] hover:bg-[#151A20] text-[#C2C7D0] hover:text-[#F4F5F7] border border-[rgba(255,255,255,0.08)] font-medium transition cursor-pointer">
            <UploadCloud className="w-3.5 h-3.5" />
            <span>Upload & Restore .JSON</span>
            <input
              type="file"
              accept=".json"
              onChange={handleFileRestore}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Dataset Reset Controls */}
      <div className="p-5 rounded-2xl bg-[#0D1014] border border-[rgba(255,255,255,0.055)] space-y-4">
        <div className="text-xs font-semibold text-[#F4F5F7] uppercase tracking-wider flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#818CF8]" />
          Controlled Sample Datasets & Factory Reset
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-[#080A0D] border border-[rgba(255,255,255,0.06)] space-y-2.5 flex flex-col justify-between">
            <div className="space-y-1">
              <div className="font-semibold text-[#F4F5F7]">Load Benchmark Sample Dataset</div>
              <p className="text-[#8A919D] text-[11px]">
                Populates your terminal with a curated institutional dataset of 85+ trades across Futures, Forex, and Equities, plus playbooks and journal reviews.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                if (window.confirm('Reset journal and load sample dataset?')) {
                  resetToSampleData();
                  addToast('Sample Data Restored', 'Platform reset to comprehensive institutional sample dataset.', 'info');
                }
              }}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-[#6366F1]/15 hover:bg-[#6366F1]/25 text-[#818CF8] border border-[#6366F1]/30 font-medium cursor-pointer transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Load Sample Trading Data</span>
            </button>
          </div>

          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 space-y-2.5 flex flex-col justify-between">
            <div className="space-y-1">
              <div className="font-semibold text-rose-300 flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4" />
                <span>Wipe All Trade History</span>
              </div>
              <p className="text-[#8A919D] text-[11px]">
                Irreversibly deletes all logged trades and executions to start fresh with a completely empty journal.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowWipeModal(true)}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 font-semibold cursor-pointer transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Wipe All Trades</span>
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Modal for Nuclear Wipe */}
      {showWipeModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-[#0B0E12] border border-rose-500/40 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-400 pb-3 border-b border-[rgba(255,255,255,0.06)]">
              <div className="p-2 rounded-xl bg-rose-500/20 border border-rose-500/30">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-[#F4F5F7]">Nuclear Wipe Confirmation</h3>
                <p className="text-[11px] text-rose-300 font-mono">THIS ACTION CANNOT BE UNDONE</p>
              </div>
            </div>

            <p className="text-xs text-[#C2C7D0] leading-relaxed">
              You are about to permanently delete <strong>{trades.length} recorded trades</strong>, associated notes, screenshots, and execution fills.
            </p>

            <div className="space-y-1.5 text-xs">
              <label className="block text-[#C2C7D0] font-medium">
                Type <span className="text-rose-400 font-mono font-bold">CONFIRM WIPE</span> below to proceed:
              </label>
              <input
                type="text"
                value={wipeConfirmInput}
                onChange={e => setWipeConfirmInput(e.target.value)}
                placeholder="CONFIRM WIPE"
                className="w-full bg-[#080A0D] border border-[rgba(255,255,255,0.08)] focus:border-rose-500 rounded-xl px-3 py-2 text-[#F4F5F7] font-mono text-xs focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[rgba(255,255,255,0.06)]">
              <button
                type="button"
                onClick={() => {
                  setShowWipeModal(false);
                  setWipeConfirmInput('');
                }}
                className="px-4 py-2 rounded-xl text-xs font-medium bg-[#11151A] hover:bg-[#151A20] text-[#C2C7D0] hover:text-[#F4F5F7] border border-[rgba(255,255,255,0.08)] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={wipeConfirmInput.trim() !== 'CONFIRM WIPE' || isWiping}
                onClick={handleExecuteWipe}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white transition disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
              >
                {isWiping ? 'Wiping...' : 'Permanently Delete Trades'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
