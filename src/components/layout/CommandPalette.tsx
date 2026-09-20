import React, { useState, useEffect } from 'react';
import {
  Search,
  Plus,
  BookOpen,
  Shield,
  TrendingUp,
  Calculator,
  Bot,
  Zap,
  RotateCcw,
  Globe,
  CornerDownLeft,
} from 'lucide-react';
import { useTrading } from '../../context/TradingContext';

export const CommandPalette: React.FC = () => {
  const {
    isCommandPaletteOpen,
    setIsCommandPaletteOpen,
    setActiveView,
    setIsAddTradeOpen,
    trades,
    playbooks,
    setSelectedTrade,
    resetToSampleData,
    theme,
  } = useTrading();

  const isLight = theme === 'light';
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (isCommandPaletteOpen) {
      setQuery('');
    }
  }, [isCommandPaletteOpen]);

  if (!isCommandPaletteOpen) return null;

  const quickActions = [
    {
      id: 'add-trade',
      label: 'Log New Trade',
      desc: 'Open trade manual entry modal',
      icon: Plus,
      action: () => {
        setIsCommandPaletteOpen(false);
        setIsAddTradeOpen(true);
      },
    },
    {
      id: 'nav-dashboard',
      label: 'Open Dashboard',
      desc: 'View balance, P&L calendar, and radar score',
      icon: TrendingUp,
      action: () => {
        setIsCommandPaletteOpen(false);
        setActiveView('dashboard');
      },
    },
    {
      id: 'nav-performance',
      label: 'Performance Analytics',
      desc: 'View Net P&L, win rate, equity curve, drawdown, and reports',
      icon: TrendingUp,
      action: () => {
        setIsCommandPaletteOpen(false);
        setActiveView('reports');
      },
    },
    {
      id: 'nav-advanced-analytics',
      label: 'Advanced Analytics & Diagnostics',
      desc: 'Uncover patterns across symbols, setups, time heatmaps, and psychology',
      icon: Zap,
      action: () => {
        setIsCommandPaletteOpen(false);
        setActiveView('advanced-analytics');
      },
    },
    {
      id: 'nav-journal',
      label: 'Open Daily Journal',
      desc: 'Review pre-market plan and post-market notes',
      icon: BookOpen,
      action: () => {
        setIsCommandPaletteOpen(false);
        setActiveView('notebook');
      },
    },
    {
      id: 'nav-prop-firm',
      label: 'Prop Firm Compliance Hub',
      desc: 'Monitor drawdown, profit targets, daily loss limits & pre-trade risk',
      icon: Shield,
      action: () => {
        setIsCommandPaletteOpen(false);
        setActiveView('prop-firm');
      },
    },
    {
      id: 'nav-ai',
      label: 'Ask AI Trading Coach',
      desc: 'Analyze mistakes, FOMO, and get actionable review',
      icon: Bot,
      action: () => {
        setIsCommandPaletteOpen(false);
        setActiveView('ai-coach');
      },
    },
    {
      id: 'nav-news',
      label: 'Market Intelligence & External Resources',
      desc: 'Essential resources for Forex, Crypto, Macro events & Financial news',
      icon: Globe,
      action: () => {
        setIsCommandPaletteOpen(false);
        setActiveView('news');
      },
    },
    {
      id: 'nav-calc',
      label: 'Position Size & Risk Calculator',
      desc: 'Calculate precise contracts/lots per stop loss',
      icon: Calculator,
      action: () => {
        setIsCommandPaletteOpen(false);
        setActiveView('tools');
      },
    },
    {
      id: 'reset-data',
      label: 'Reset to Realistic Sample Data',
      desc: 'Restore fresh sample portfolio with 40+ trades',
      icon: RotateCcw,
      action: () => {
        setIsCommandPaletteOpen(false);
        resetToSampleData();
      },
    },
  ];

  const filteredActions = quickActions.filter(a =>
    a.label.toLowerCase().includes(query.toLowerCase()) ||
    a.desc.toLowerCase().includes(query.toLowerCase())
  );

  const matchedTrades = trades.filter(t =>
    t.symbol.toLowerCase().includes(query.toLowerCase()) ||
    t.setupType.toLowerCase().includes(query.toLowerCase()) ||
    t.notes.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 5);

  const matchedPlaybooks = playbooks.filter(p =>
    p.name.toLowerCase().includes(query.toLowerCase()) ||
    p.description.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-[rgba(7,8,11,0.82)] backdrop-blur-sm pt-20 px-4 animate-in fade-in duration-140">
      <div
        className={`w-full max-w-2xl rounded-2xl border shadow-[0_20px_50px_rgba(0,0,0,0.8)] overflow-hidden animate-in zoom-in-95 duration-140 ${
          isLight
            ? 'bg-white border-slate-200 text-slate-900 shadow-2xl'
            : 'bg-[#181A21] border-[rgba(255,255,255,0.10)] text-slate-100'
        }`}
        onClick={e => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className={`flex items-center gap-3 border-b px-4 py-3.5 ${
          isLight ? 'border-slate-200 bg-white' : 'border-[rgba(255,255,255,0.07)] bg-[#12141A]'
        }`}>
          <Search className={`w-4 h-4 shrink-0 ${isLight ? 'text-blue-600' : 'text-blue-400'}`} />
          <input
            type="text"
            autoFocus
            placeholder="Type a command, symbol (MES, EURUSD), setup, or shortcut..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            className={`w-full bg-transparent text-sm focus:outline-none placeholder:text-slate-400 font-normal ${
              isLight ? 'text-slate-900' : 'text-slate-100'
            }`}
          />
          <kbd className={`rounded px-1.5 py-0.5 text-[10px] font-mono font-medium ${
            isLight
              ? 'bg-slate-100 text-slate-600 border border-slate-200'
              : 'bg-[#1E222D] text-slate-400 border border-[rgba(255,255,255,0.08)]'
          }`}>
            ESC
          </kbd>
        </div>

        {/* Results Container */}
        <div className={`max-h-96 overflow-y-auto p-2.5 space-y-3 custom-scrollbar ${
          isLight ? 'bg-white' : 'bg-[#181A21]'
        }`}>
          {/* Quick Actions */}
          <div>
            <div className={`px-2.5 pb-1 text-[10px] font-semibold uppercase tracking-wider ${
              isLight ? 'text-slate-400' : 'text-slate-500'
            }`}>
              Quick Actions
            </div>
            <div className="space-y-0.5">
              {filteredActions.map(action => {
                const Icon = action.icon;
                return (
                  <button
                    key={action.id}
                    onClick={action.action}
                    className={`flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition cursor-pointer group ${
                      isLight
                        ? 'hover:bg-slate-100 text-slate-800'
                        : 'hover:bg-[#1E222D] text-slate-200'
                    }`}
                  >
                    <div className={`flex h-7 w-7 items-center justify-center rounded-lg border transition ${
                      isLight
                        ? 'bg-blue-50 text-blue-600 border-blue-200 group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600'
                        : 'bg-blue-500/10 text-blue-400 border-blue-500/20 group-hover:bg-blue-600 group-hover:text-white'
                    }`}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`text-xs font-medium ${
                        isLight ? 'text-slate-900 group-hover:text-slate-900' : 'text-slate-100 group-hover:text-white'
                      }`}>{action.label}</div>
                      <div className={`text-[11px] truncate ${
                        isLight ? 'text-slate-500' : 'text-slate-400'
                      }`}>{action.desc}</div>
                    </div>
                    <CornerDownLeft className={`w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition ${
                      isLight ? 'text-slate-400' : 'text-slate-400'
                    }`} />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Matched Trades */}
          {query.trim().length > 0 && matchedTrades.length > 0 && (
            <div>
              <div className={`px-2.5 pb-1 text-[10px] font-semibold uppercase tracking-wider border-t pt-2 ${
                isLight ? 'text-slate-400 border-slate-100' : 'text-slate-500 border-[rgba(255,255,255,0.06)]'
              }`}>
                Matching Trades
              </div>
              <div className="space-y-0.5">
                {matchedTrades.map(trade => (
                  <button
                    key={trade.id}
                    onClick={() => {
                      setSelectedTrade(trade);
                      setIsCommandPaletteOpen(false);
                      setActiveView('trades');
                    }}
                    className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left transition cursor-pointer ${
                      isLight ? 'hover:bg-slate-100 text-slate-800' : 'hover:bg-[#1E222D] text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-bold ${
                        trade.direction === 'BUY'
                          ? isLight
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25'
                          : isLight
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : 'bg-rose-500/15 text-rose-400 border border-rose-500/25'
                      }`}>
                        {trade.direction}
                      </span>
                      <span className={`font-semibold text-xs ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>{trade.symbol}</span>
                      <span className={`text-[11px] truncate max-w-[180px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>{trade.setupType}</span>
                    </div>
                    <div className="text-right font-mono tabular-nums">
                      <span className={`text-xs font-semibold ${
                        trade.netPnl >= 0
                          ? isLight ? 'text-emerald-600' : 'text-emerald-400'
                          : isLight ? 'text-rose-600' : 'text-rose-400'
                      }`}>
                        {trade.netPnl >= 0 ? '+' : ''}${trade.netPnl.toFixed(2)}
                      </span>
                      <span className={`text-[10px] ml-1.5 ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>
                        ({trade.rMultiple >= 0 ? '+' : ''}{trade.rMultiple}R)
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Matched Playbooks */}
          {query.trim().length > 0 && matchedPlaybooks.length > 0 && (
            <div>
              <div className={`px-2.5 pb-1 text-[10px] font-semibold uppercase tracking-wider border-t pt-2 ${
                isLight ? 'text-slate-400 border-slate-100' : 'text-slate-500 border-[rgba(255,255,255,0.06)]'
              }`}>
                Matching Playbooks
              </div>
              <div className="space-y-0.5">
                {matchedPlaybooks.map(pb => (
                  <button
                    key={pb.id}
                    onClick={() => {
                      setIsCommandPaletteOpen(false);
                      setActiveView('playbook');
                    }}
                    className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left transition cursor-pointer ${
                      isLight ? 'hover:bg-slate-100 text-slate-800' : 'hover:bg-[#1E222D] text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{pb.icon}</span>
                      <span className={`text-xs font-semibold ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>{pb.name}</span>
                    </div>
                    <span className={`text-xs font-mono font-medium ${isLight ? 'text-blue-600' : 'text-blue-400'}`}>{pb.winRate}% WR</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer shortcuts */}
        <div className={`border-t px-4 py-2 text-[11px] flex items-center justify-between ${
          isLight ? 'border-slate-200 bg-slate-50 text-slate-600' : 'border-[rgba(255,255,255,0.07)] bg-[#12141A] text-slate-400'
        }`}>
          <div className="flex items-center gap-3">
            <span><strong className={`font-mono ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>↑↓</strong> navigate</span>
            <span><strong className={`font-mono ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>↵</strong> select</span>
            <span><strong className={`font-mono ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>esc</strong> close</span>
          </div>
          <span className={`font-mono text-[10px] ${isLight ? 'text-blue-600' : 'text-blue-400'}`}>TradeForge Command Bar</span>
        </div>
      </div>
      <div className="fixed inset-0 -z-10" onClick={() => setIsCommandPaletteOpen(false)} />
    </div>
  );
};
