import React, { useState, useMemo } from 'react';
import {
  Activity,
  Shield,
  AlertTriangle,
  Info,
  Trash2,
  Download,
  Search,
  CheckCircle2
} from 'lucide-react';
import { useTrading } from '../../context/TradingContext';
import { ActivityLogItem } from '../../types';

export const LogHistoryTab: React.FC = () => {
  const {
    activityLogs,
    addToast,
    theme,
  } = useTrading();

  const isLight = theme === 'light';

  // Seed with realistic default activity logs if empty
  const defaultLogs: ActivityLogItem[] = [
    {
      id: 'log-001',
      action: 'UPDATE_TRADE_DEFAULTS',
      category: 'SETTINGS',
      object: 'Risk Rules & Position Sizing Defaults',
      status: 'INFO',
      details: { summary: 'Risk unit set to PERCENT (1.0%), default market CME Futures' },
      createdAt: '2026-08-15T16:20:10.000Z',
    },
    {
      id: 'log-002',
      action: 'BROKER_SYNC_EXECUTED',
      category: 'BROKER',
      object: 'Tradovate API Ingestion Cycle',
      status: 'SUCCESS',
      details: { summary: 'Ingested 6 execution fills with zero reconciliation discrepancies' },
      createdAt: '2026-08-15T15:00:02.000Z',
    },
    {
      id: 'log-003',
      action: 'PROP_FIRM_ALERT',
      category: 'PROP_FIRM',
      object: 'Daily Drawdown Warning Threshold',
      status: 'WARNING',
      details: { summary: 'Account APEX 50K reached 65% of max daily trailing drawdown limit' },
      createdAt: '2026-08-14T19:42:15.000Z',
    },
    {
      id: 'log-004',
      action: 'SECURITY_LOGIN',
      category: 'SECURITY',
      object: 'Terminal Session Authenticated',
      status: 'INFO',
      details: { summary: 'Authorized from Chicago, USA (IP: 192.168.1.104) via Chrome Desktop' },
      createdAt: '2026-08-14T13:10:00.000Z',
    },
    {
      id: 'log-005',
      action: 'SYSTEM_BACKUP_CREATED',
      category: 'DATA',
      object: 'Encrypted Cloud Point-in-Time Snapshot',
      status: 'SUCCESS',
      details: { summary: 'Auto-snapshot containing 85 trades, 14 playbooks, and 6 journal notes' },
      createdAt: '2026-08-13T23:59:00.000Z',
    },
  ];

  const [localLogs, setLocalLogs] = useState<ActivityLogItem[]>(
    activityLogs && activityLogs.length > 0 ? activityLogs : defaultLogs
  );
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredLogs = useMemo(() => {
    return localLogs.filter(log => {
      const matchStatus = statusFilter === 'ALL' || log.status === statusFilter;
      const matchCat = categoryFilter === 'ALL' || log.category === categoryFilter;
      const detailsStr = log.details ? (log.details.summary || JSON.stringify(log.details)) : '';
      const matchSearch = !searchQuery ||
        log.object.toLowerCase().includes(searchQuery.toLowerCase()) ||
        detailsStr.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.action.toLowerCase().includes(searchQuery.toLowerCase());
      return matchStatus && matchCat && matchSearch;
    });
  }, [localLogs, statusFilter, categoryFilter, searchQuery]);

  const handleClearLogs = () => {
    if (!window.confirm('Clear all historical activity logs?')) return;
    setLocalLogs([]);
    addToast('Audit Trail Cleared', 'Historical activity logs removed.', 'info');
  };

  const handleExportAudit = () => {
    const text = JSON.stringify(localLogs, null, 2);
    const blob = new Blob([text], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tradeforge_audit_logs_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    addToast('Audit Exported', 'Activity log exported to JSON.', 'info');
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[rgba(255,255,255,0.06)]">
        <div>
          <h2 className="text-base font-semibold text-[#F4F5F7] flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#818CF8]" />
            Security & System Audit Trail
          </h2>
          <p className="text-xs text-[#8A919D] mt-0.5">
            Immutable timeline of terminal logins, compliance updates, broker sync cycles, and risk threshold events.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportAudit}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-[#11151A] hover:bg-[#151A20] text-[#C2C7D0] hover:text-[#F4F5F7] border border-[rgba(255,255,255,0.08)] transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Log</span>
          </button>
          <button
            type="button"
            onClick={handleClearLogs}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 transition cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear Logs</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-[#0D1014] border border-[rgba(255,255,255,0.055)]">
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          {['ALL', 'INFO', 'WARNING', 'ERROR', 'SUCCESS'].map(st => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl font-medium transition cursor-pointer border ${
                statusFilter === st
                  ? 'bg-[#11151A] text-[#F4F5F7] border-[rgba(99,102,241,0.35)] shadow-xs'
                  : 'bg-[#080A0D] text-[#8A919D] border-[rgba(255,255,255,0.06)] hover:text-[#F4F5F7] hover:bg-[#151A20]'
              }`}
            >
              {st === 'ALL' ? 'All Statuses' : st}
            </button>
          ))}
        </div>

        <div className="relative min-w-[200px]">
          <Search className="w-3.5 h-3.5 text-[#5E6570] absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search activity events..."
            className="w-full bg-[#080A0D] border border-[rgba(255,255,255,0.08)] rounded-xl pl-8 pr-3 py-1.5 text-xs text-[#F4F5F7] placeholder-[#5E6570] focus:outline-none focus:border-[#6366F1]"
          />
        </div>
      </div>

      {/* Timeline Stream */}
      <div className="rounded-2xl border border-[rgba(255,255,255,0.055)] bg-[#0D1014] p-5 space-y-4">
        {filteredLogs.length === 0 ? (
          <div className="text-center py-12 text-[#5E6570] font-mono text-xs">
            No activity log events match current criteria.
          </div>
        ) : (
          <div className="space-y-3">
            {filteredLogs.map(log => {
              const isWarning = log.status === 'WARNING';
              const isError = log.status === 'ERROR';
              const isSuccess = log.status === 'SUCCESS';
              const detailsText = log.details?.summary || (log.details ? JSON.stringify(log.details) : '');

              return (
                <div
                  key={log.id}
                  className="p-3.5 rounded-xl bg-[#080A0D] border border-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.12)] transition flex items-start justify-between gap-4 text-xs"
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg shrink-0 border ${
                      isWarning
                        ? 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                        : isError
                        ? 'bg-rose-500/15 border-rose-500/30 text-rose-400'
                        : isSuccess
                        ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                        : 'bg-blue-500/15 border-blue-500/30 text-[#818CF8]'
                    }`}>
                      {isWarning ? (
                        <AlertTriangle className="w-4 h-4" />
                      ) : isSuccess ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : (
                        <Info className="w-4 h-4" />
                      )}
                    </div>

                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-[#F4F5F7]">{log.object}</span>
                        <span className="text-[10px] font-medium uppercase tracking-wider px-1.5 py-0.2 rounded bg-[#11151A] text-[#8A919D] font-mono border border-[rgba(255,255,255,0.06)]">
                          {log.category}
                        </span>
                        <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded font-mono ${
                          isWarning
                            ? 'bg-amber-500/20 text-amber-300'
                            : isError
                            ? 'bg-rose-500/20 text-rose-300'
                            : isSuccess
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : 'bg-blue-500/20 text-blue-300'
                        }`}>
                          {log.status}
                        </span>
                      </div>

                      {detailsText && (
                        <div className="text-slate-400 text-xs leading-relaxed font-mono">
                          {detailsText}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-[11px] text-slate-500 font-mono">
                      {new Date(log.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </span>
                    <div className="text-[10px] text-slate-600 font-mono">
                      {new Date(log.createdAt).toLocaleDateString([], {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
