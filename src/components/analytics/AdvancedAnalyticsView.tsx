import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  Brain,
  Layers,
  Sparkles,
  Clock,
  Calendar,
  Compass,
  Tag,
  Smile,
  ShieldCheck,
  AlertTriangle,
  Flame,
  Award,
  BarChart3,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Eye,
  Sliders
} from 'lucide-react';
import { useTrading } from '../../context/TradingContext';
import { Trade } from '../../types';
import { generateSmartInsights, calculatePerformanceMetrics, SmartInsight } from './analyticsUtils';

type BreakdownTab =
  | 'INSIGHTS'
  | 'INSTRUMENT'
  | 'STRATEGY'
  | 'DIRECTION'
  | 'TIME_HEATMAP'
  | 'MARKET_SESSION'
  | 'DURATION'
  | 'TAGS'
  | 'PSYCHOLOGY';

export const AdvancedAnalyticsView: React.FC = () => {
  const { filteredTrades, formatCurrency, formatRMultiple, setSelectedTrade, accounts, selectedAccountId, theme } = useTrading();
  const isLight = theme === 'light';

  const [activeTab, setActiveTab] = useState<BreakdownTab>('INSIGHTS');
  const [hoverDetail, setHoverDetail] = useState<{ title: string; subtitle: string } | null>(null);

  // Closed trades
  const closedTrades = useMemo(() => {
    return filteredTrades.filter(t => t.status === 'CLOSED');
  }, [filteredTrades]);

  // Overall metrics
  const metrics = useMemo(() => calculatePerformanceMetrics(filteredTrades), [filteredTrades]);

  // Dynamically generated smart insights
  const dynamicInsights = useMemo(() => generateSmartInsights(filteredTrades), [filteredTrades]);

  // ==========================================
  // 1. INSTRUMENT BREAKDOWN
  // ==========================================
  const instrumentData = useMemo(() => {
    const map: {
      [symbol: string]: {
        symbol: string;
        market: string;
        count: number;
        wins: number;
        losses: number;
        netPnl: number;
        grossProfit: number;
        grossLoss: number;
        avgR: number;
      };
    } = {};

    closedTrades.forEach(t => {
      const s = t.symbol || 'UNKNOWN';
      if (!map[s]) {
        map[s] = {
          symbol: s,
          market: t.market,
          count: 0,
          wins: 0,
          losses: 0,
          netPnl: 0,
          grossProfit: 0,
          grossLoss: 0,
          avgR: 0,
        };
      }
      map[s].count += 1;
      map[s].netPnl += t.netPnl;
      map[s].avgR += (t.rMultiple || 0);
      if (t.netPnl > 0) {
        map[s].wins += 1;
        map[s].grossProfit += t.netPnl;
      } else if (t.netPnl < 0) {
        map[s].losses += 1;
        map[s].grossLoss += Math.abs(t.netPnl);
      }
    });

    return Object.values(map).map(item => {
      const winRate = item.count > 0 ? (item.wins / item.count) * 100 : 0;
      const profitFactor = item.grossLoss > 0 ? item.grossProfit / item.grossLoss : item.grossProfit > 0 ? 99.9 : 0;
      const avgWin = item.wins > 0 ? item.grossProfit / item.wins : 0;
      const avgLoss = item.losses > 0 ? item.grossLoss / item.losses : 0;
      return {
        ...item,
        winRate: Math.round(winRate),
        profitFactor: parseFloat(profitFactor.toFixed(2)),
        avgR: parseFloat((item.avgR / (item.count || 1)).toFixed(2)),
        avgWin,
        avgLoss,
      };
    }).sort((a, b) => b.netPnl - a.netPnl);
  }, [closedTrades]);

  const topSymbol = instrumentData[0];
  const worstSymbol = [...instrumentData].sort((a, b) => a.netPnl - b.netPnl)[0];
  const mostTradedSymbol = [...instrumentData].sort((a, b) => b.count - a.count)[0];

  // ==========================================
  // 2. STRATEGY / PLAYBOOK BREAKDOWN
  // ==========================================
  const strategyData = useMemo(() => {
    const map: {
      [strategy: string]: {
        name: string;
        count: number;
        wins: number;
        netPnl: number;
        grossProfit: number;
        grossLoss: number;
        avgR: number;
        rulesFollowedCount: number;
      };
    } = {};

    closedTrades.forEach(t => {
      const st = t.setupType || 'Discretionary';
      if (!map[st]) {
        map[st] = {
          name: st,
          count: 0,
          wins: 0,
          netPnl: 0,
          grossProfit: 0,
          grossLoss: 0,
          avgR: 0,
          rulesFollowedCount: 0,
        };
      }
      map[st].count += 1;
      map[st].netPnl += t.netPnl;
      map[st].avgR += (t.rMultiple || 0);
      if (t.rulesFollowed) map[st].rulesFollowedCount += 1;
      if (t.netPnl > 0) {
        map[st].wins += 1;
        map[st].grossProfit += t.netPnl;
      } else if (t.netPnl < 0) {
        map[st].grossLoss += Math.abs(t.netPnl);
      }
    });

    return Object.values(map).map(item => {
      const winRate = item.count > 0 ? (item.wins / item.count) * 100 : 0;
      const profitFactor = item.grossLoss > 0 ? item.grossProfit / item.grossLoss : item.grossProfit > 0 ? 99.9 : 0;
      const complianceRate = item.count > 0 ? (item.rulesFollowedCount / item.count) * 100 : 0;
      return {
        ...item,
        winRate: Math.round(winRate),
        profitFactor: parseFloat(profitFactor.toFixed(2)),
        avgR: parseFloat((item.avgR / (item.count || 1)).toFixed(2)),
        complianceRate: Math.round(complianceRate),
      };
    }).sort((a, b) => b.netPnl - a.netPnl);
  }, [closedTrades]);

  const bestStrategy = strategyData[0];
  const worstStrategy = [...strategyData].sort((a, b) => a.netPnl - b.netPnl)[0];

  // ==========================================
  // 3. DIRECTIONAL BREAKDOWN (LONG VS SHORT)
  // ==========================================
  const directionData = useMemo(() => {
    const longs = closedTrades.filter(t => t.direction === 'BUY');
    const shorts = closedTrades.filter(t => t.direction === 'SELL');

    const computeDir = (list: Trade[], name: 'BUY' | 'SELL') => {
      const count = list.length;
      const winners = list.filter(t => t.netPnl > 0);
      const losers = list.filter(t => t.netPnl < 0);
      const netPnl = list.reduce((a, b) => a + b.netPnl, 0);
      const grossProfit = winners.reduce((a, b) => a + b.netPnl, 0);
      const grossLoss = Math.abs(losers.reduce((a, b) => a + b.netPnl, 0));
      const winRate = count > 0 ? (winners.length / count) * 100 : 0;
      const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 99.9 : 0;
      const avgWin = winners.length > 0 ? grossProfit / winners.length : 0;
      const avgLoss = losers.length > 0 ? grossLoss / losers.length : 0;
      const avgR = count > 0 ? list.reduce((a, b) => a + (b.rMultiple || 0), 0) / count : 0;
      const maxWin = winners.length > 0 ? Math.max(...winners.map(t => t.netPnl)) : 0;
      const maxLoss = losers.length > 0 ? Math.min(...losers.map(t => t.netPnl)) : 0;

      return {
        name,
        count,
        wins: winners.length,
        losses: losers.length,
        winRate: Math.round(winRate),
        netPnl,
        grossProfit,
        grossLoss,
        profitFactor: parseFloat(profitFactor.toFixed(2)),
        avgWin,
        avgLoss,
        avgR: parseFloat(avgR.toFixed(2)),
        maxWin,
        maxLoss,
      };
    };

    return {
      long: computeDir(longs, 'BUY'),
      short: computeDir(shorts, 'SELL'),
    };
  }, [closedTrades]);

  // ==========================================
  // 4. TIME & DAY-OF-WEEK HEATMAP
  // ==========================================
  const dayOfWeekData = useMemo(() => {
    const days = [
      { dayIndex: 1, name: 'Monday', short: 'Mon' },
      { dayIndex: 2, name: 'Tuesday', short: 'Tue' },
      { dayIndex: 3, name: 'Wednesday', short: 'Wed' },
      { dayIndex: 4, name: 'Thursday', short: 'Thu' },
      { dayIndex: 5, name: 'Friday', short: 'Fri' },
      { dayIndex: 6, name: 'Saturday', short: 'Sat' },
      { dayIndex: 0, name: 'Sunday', short: 'Sun' },
    ];

    return days.map(d => {
      const list = closedTrades.filter(t => t.entryDate && new Date(t.entryDate).getDay() === d.dayIndex);
      const wins = list.filter(t => t.netPnl > 0).length;
      const netPnl = list.reduce((a, b) => a + b.netPnl, 0);
      const winRate = list.length > 0 ? (wins / list.length) * 100 : 0;
      const avgPnl = list.length > 0 ? netPnl / list.length : 0;
      return {
        ...d,
        count: list.length,
        wins,
        netPnl,
        winRate: Math.round(winRate),
        avgPnl,
      };
    });
  }, [closedTrades]);

  const bestTradingDay = [...dayOfWeekData].filter(d => d.count > 0).sort((a, b) => b.netPnl - a.netPnl)[0];
  const worstTradingDay = [...dayOfWeekData].filter(d => d.count > 0).sort((a, b) => a.netPnl - b.netPnl)[0];

  // Hour of Day Data (0 to 23)
  const hourOfDayData = useMemo(() => {
    const hours = Array.from({ length: 24 }, (_, i) => i);
    return hours.map(hour => {
      const list = closedTrades.filter(t => t.entryDate && new Date(t.entryDate).getUTCHours() === hour);
      const wins = list.filter(t => t.netPnl > 0).length;
      const netPnl = list.reduce((a, b) => a + b.netPnl, 0);
      const winRate = list.length > 0 ? (wins / list.length) * 100 : 0;
      return {
        hour,
        label: `${hour.toString().padStart(2, '0')}:00`,
        count: list.length,
        wins,
        netPnl,
        winRate: Math.round(winRate),
      };
    });
  }, [closedTrades]);

  const activeHours = hourOfDayData.filter(h => h.count > 0);
  const bestTradingHour = [...activeHours].sort((a, b) => b.netPnl - a.netPnl)[0];
  const worstTradingHour = [...activeHours].sort((a, b) => a.netPnl - b.netPnl)[0];

  // ==========================================
  // 5. MARKET SESSION BREAKDOWN
  // ==========================================
  const sessionData = useMemo(() => {
    const sessions = [
      { id: 'London', name: 'London Session', desc: '07:00 - 16:00 UTC' },
      { id: 'New York', name: 'New York Session', desc: '13:00 - 21:00 UTC' },
      { id: 'Asian', name: 'Asian Session', desc: '00:00 - 08:00 UTC' },
      { id: 'Overlap', name: 'London/NY Overlap', desc: '13:00 - 16:00 UTC' },
      { id: 'Pre-Market', name: 'Pre-Market / Extended', desc: 'Off-hours liquidity' },
    ];

    return sessions.map(sess => {
      const list = closedTrades.filter(t => t.session === sess.id);
      const wins = list.filter(t => t.netPnl > 0);
      const losers = list.filter(t => t.netPnl < 0);
      const netPnl = list.reduce((a, b) => a + b.netPnl, 0);
      const grossProfit = wins.reduce((a, b) => a + b.netPnl, 0);
      const grossLoss = Math.abs(losers.reduce((a, b) => a + b.netPnl, 0));
      const winRate = list.length > 0 ? (wins.length / list.length) * 100 : 0;
      const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 99.9 : 0;
      const avgWin = wins.length > 0 ? grossProfit / wins.length : 0;
      const avgLoss = losers.length > 0 ? grossLoss / losers.length : 0;
      const avgR = list.length > 0 ? list.reduce((a, b) => a + (b.rMultiple || 0), 0) / list.length : 0;

      return {
        ...sess,
        count: list.length,
        wins: wins.length,
        winRate: Math.round(winRate),
        netPnl,
        grossProfit,
        grossLoss,
        profitFactor: parseFloat(profitFactor.toFixed(2)),
        avgWin,
        avgLoss,
        avgR: parseFloat(avgR.toFixed(2)),
      };
    }).sort((a, b) => b.netPnl - a.netPnl);
  }, [closedTrades]);

  // ==========================================
  // 6. HOLDING TIME / DURATION BREAKDOWN
  // ==========================================
  const durationData = useMemo(() => {
    const buckets = [
      { id: 'ultra-scalp', label: 'Ultra Scalp (< 5 min)', min: 0, max: 5 },
      { id: 'scalp', label: 'Scalp (5 - 15 min)', min: 5, max: 15 },
      { id: 'short-intraday', label: 'Intraday (15 - 60 min)', min: 15, max: 60 },
      { id: 'extended-intraday', label: 'Extended Intraday (1 - 4 hrs)', min: 60, max: 240 },
      { id: 'swing', label: 'Swing (> 4 hrs)', min: 240, max: Infinity },
    ];

    return buckets.map(b => {
      const list = closedTrades.filter(t => {
        const dur = t.durationMinutes || 0;
        return dur >= b.min && (b.max === Infinity ? true : dur < b.max);
      });
      const wins = list.filter(t => t.netPnl > 0);
      const losers = list.filter(t => t.netPnl < 0);
      const netPnl = list.reduce((a, c) => a + c.netPnl, 0);
      const grossProfit = wins.reduce((a, c) => a + c.netPnl, 0);
      const grossLoss = Math.abs(losers.reduce((a, c) => a + c.netPnl, 0));
      const winRate = list.length > 0 ? (wins.length / list.length) * 100 : 0;
      const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 99.9 : 0;
      const avgDuration = list.length > 0 ? list.reduce((a, c) => a + (c.durationMinutes || 0), 0) / list.length : 0;

      return {
        ...b,
        count: list.length,
        wins: wins.length,
        winRate: Math.round(winRate),
        netPnl,
        profitFactor: parseFloat(profitFactor.toFixed(2)),
        avgDuration: Math.round(avgDuration),
      };
    });
  }, [closedTrades]);

  // ==========================================
  // 7. TAGS & MISTAKES BREAKDOWN
  // ==========================================
  const tagsData = useMemo(() => {
    const tagMap: { [tag: string]: { name: string; count: number; wins: number; netPnl: number; avgR: number } } = {};

    closedTrades.forEach(t => {
      (t.tags || []).forEach(tag => {
        if (!tagMap[tag]) {
          tagMap[tag] = { name: tag, count: 0, wins: 0, netPnl: 0, avgR: 0 };
        }
        tagMap[tag].count += 1;
        tagMap[tag].netPnl += t.netPnl;
        tagMap[tag].avgR += (t.rMultiple || 0);
        if (t.netPnl > 0) tagMap[tag].wins += 1;
      });
    });

    return Object.values(tagMap).map(item => ({
      ...item,
      winRate: item.count > 0 ? Math.round((item.wins / item.count) * 100) : 0,
      avgR: parseFloat((item.avgR / (item.count || 1)).toFixed(2)),
    })).sort((a, b) => b.netPnl - a.netPnl);
  }, [closedTrades]);

  // ==========================================
  // 8. PSYCHOLOGY & JOURNAL AUDIT
  // ==========================================
  const psychologyData = useMemo(() => {
    // Emotions
    const emotions = ['Disciplined', 'Confident', 'Neutral', 'FOMO', 'Revenge', 'Hesitant', 'Greedy'] as const;
    const emotionStats = emotions.map(em => {
      const list = closedTrades.filter(t => t.emotionalState === em);
      const wins = list.filter(t => t.netPnl > 0);
      const netPnl = list.reduce((a, b) => a + b.netPnl, 0);
      const winRate = list.length > 0 ? Math.round((wins.length / list.length) * 100) : 0;
      return { emotion: em, count: list.length, wins: wins.length, netPnl, winRate };
    }).filter(e => e.count > 0);

    // Rule Followed vs Broken
    const followed = closedTrades.filter(t => t.rulesFollowed);
    const broken = closedTrades.filter(t => !t.rulesFollowed);

    const followedPnl = followed.reduce((a, b) => a + b.netPnl, 0);
    const brokenPnl = broken.reduce((a, b) => a + b.netPnl, 0);
    const followedWR = followed.length > 0 ? Math.round((followed.filter(t => t.netPnl > 0).length / followed.length) * 100) : 0;
    const brokenWR = broken.length > 0 ? Math.round((broken.filter(t => t.netPnl > 0).length / broken.length) * 100) : 0;

    // Rating (1 to 5 stars)
    const ratings = [5, 4, 3, 2, 1].map(r => {
      const list = closedTrades.filter(t => t.rating === r);
      const netPnl = list.reduce((a, b) => a + b.netPnl, 0);
      const wins = list.filter(t => t.netPnl > 0).length;
      const winRate = list.length > 0 ? Math.round((wins / list.length) * 100) : 0;
      return { rating: r, count: list.length, netPnl, winRate };
    }).filter(r => r.count > 0);

    return {
      emotionStats,
      ruleAdherence: {
        followed: { count: followed.length, netPnl: followedPnl, winRate: followedWR },
        broken: { count: broken.length, netPnl: brokenPnl, winRate: brokenWR },
      },
      ratings,
    };
  }, [closedTrades]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* ========================================================================= */}
      {/* 1. HEADER & BREADCRUMB */}
      {/* ========================================================================= */}
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b ${
        isLight ? 'border-slate-200' : 'border-[#1C232E]'
      }`}>
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-500 uppercase tracking-wider mb-1">
            <span>Analytics</span>
            <span>/</span>
            <span className={isLight ? 'text-slate-700 font-medium' : 'text-slate-200'}>Advanced Edge Diagnostics</span>
          </div>
          <h1 className={`text-2xl font-bold tracking-tight flex items-center gap-2.5 ${
            isLight ? 'text-slate-900' : 'text-white'
          }`}>
            <TrendingUp className="w-6 h-6 text-indigo-500" />
            Advanced Analytics
          </h1>
          <p className={`text-xs mt-1 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
            Deep causal breakdown: Uncover exactly why you win or lose across symbols, sessions, time of day, setups, and psychological patterns
          </p>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. NAVIGATION SUB-TABS */}
      {/* ========================================================================= */}
      <div className={`flex flex-wrap items-center gap-1.5 p-1.5 rounded-2xl border ${
        isLight ? 'bg-slate-100/90 border-slate-300 shadow-sm' : 'bg-[#12161D] border-[#1C232E] shadow-lg'
      }`}>
        {[
          { id: 'INSIGHTS', label: 'Key Smart Insights', icon: Brain },
          { id: 'INSTRUMENT', label: 'By Instrument', icon: BarChart3 },
          { id: 'STRATEGY', label: 'By Strategy / Setup', icon: Layers },
          { id: 'DIRECTION', label: 'Long vs Short', icon: Compass },
          { id: 'TIME_HEATMAP', label: 'Time & Heatmaps', icon: Calendar },
          { id: 'MARKET_SESSION', label: 'Market Sessions', icon: Clock },
          { id: 'DURATION', label: 'Holding Duration', icon: Zap },
          { id: 'TAGS', label: 'Execution Tags', icon: Tag },
          { id: 'PSYCHOLOGY', label: 'Psychology & Rules', icon: ShieldCheck },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as BreakdownTab)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
                isActive
                  ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white border-indigo-400/40 shadow-md shadow-indigo-600/20'
                  : isLight
                  ? 'text-slate-700 hover:text-slate-900 hover:bg-white border border-transparent hover:border-slate-200 shadow-none'
                  : 'text-slate-400 hover:text-white hover:bg-[#1A1F27]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* TAB CONTENT 1: SMART KEY INSIGHTS */}
      {/* ========================================================================= */}
      {activeTab === 'INSIGHTS' && (
        <div className="space-y-6">
          <div className={`rounded-2xl border p-5 space-y-3 ${
            isLight
              ? 'border-indigo-200 bg-indigo-50/70 text-slate-800 shadow-sm'
              : 'border-indigo-500/20 bg-indigo-500/5 text-slate-300 shadow-xl'
          }`}>
            <div className="flex items-center justify-between">
              <h2 className={`text-sm font-bold uppercase tracking-wider flex items-center gap-2 ${
                isLight ? 'text-indigo-900' : 'text-indigo-300'
              }`}>
                <Sparkles className="w-4 h-4 text-indigo-500" />
                Algorithmic Alpha Insights (Auto-Generated from {closedTrades.length} Trades)
              </h2>
              <span className={`text-xs font-mono ${isLight ? 'text-indigo-600 font-semibold' : 'text-indigo-300/70'}`}>
                Edge Engine v4.2
              </span>
            </div>
            <p className={`text-xs leading-relaxed ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
              These insights analyze statistical variance, edge clustering, emotional state attribution, and session drawdown risks computed directly from your closed trades.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {dynamicInsights.map(ins => (
              <div
                key={ins.id}
                className={`p-5 rounded-2xl border space-y-3 transition ${
                  isLight
                    ? 'bg-white border-slate-200 hover:border-slate-300 shadow-sm hover:shadow'
                    : 'bg-[#12161D] border-[#1C232E] hover:border-[#273141] shadow-xl'
                } ${
                  ins.type === 'POSITIVE'
                    ? isLight ? 'border-l-4 border-l-emerald-500' : 'border-emerald-500/30'
                    : ins.type === 'WARNING'
                    ? isLight ? 'border-l-4 border-l-amber-500' : 'border-amber-500/30'
                    : ins.type === 'NEGATIVE'
                    ? isLight ? 'border-l-4 border-l-rose-500' : 'border-rose-500/30'
                    : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${
                      ins.type === 'POSITIVE'
                        ? isLight ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : ins.type === 'WARNING'
                        ? isLight ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        : ins.type === 'NEGATIVE'
                        ? isLight ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                        : isLight ? 'bg-slate-100 text-slate-700 border-slate-200' : 'bg-slate-800 text-slate-300 border-[#273141]'
                    }`}
                  >
                    {ins.category}
                  </span>
                  <span className={`font-mono font-bold text-xs px-2 py-0.5 rounded border ${
                    isLight
                      ? 'text-indigo-800 bg-indigo-50 border-indigo-200'
                      : 'text-indigo-300 bg-indigo-950/80 border-indigo-500/30'
                  }`}>
                    {ins.metricBadge}
                  </span>
                </div>

                <h3 className={`text-sm font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>{ins.title}</h3>
                <p className={`text-xs leading-relaxed ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>{ins.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB CONTENT 2: INSTRUMENT BREAKDOWN */}
      {/* ========================================================================= */}
      {activeTab === 'INSTRUMENT' && (
        <div className="space-y-6">
          {/* Executive Symbol Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className={`p-4 rounded-2xl border space-y-1 ${
              isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#12161D] border-[#1C232E]'
            }`}>
              <div className={`flex items-center justify-between text-[11px] font-semibold uppercase ${
                isLight ? 'text-slate-500' : 'text-slate-400'
              }`}>
                <span>Most Profitable Symbol</span>
                <Award className={`w-4 h-4 ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`} />
              </div>
              <div className={`text-xl font-black font-mono ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`}>
                {topSymbol ? topSymbol.symbol : '—'}
              </div>
              <div className={`text-xs ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
                {topSymbol ? `+${formatCurrency(topSymbol.netPnl)} (${topSymbol.winRate}% WR)` : 'N/A'}
              </div>
            </div>

            <div className={`p-4 rounded-2xl border space-y-1 ${
              isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#12161D] border-[#1C232E]'
            }`}>
              <div className={`flex items-center justify-between text-[11px] font-semibold uppercase ${
                isLight ? 'text-slate-500' : 'text-slate-400'
              }`}>
                <span>Least Profitable Symbol</span>
                <AlertTriangle className={`w-4 h-4 ${isLight ? 'text-rose-600' : 'text-rose-400'}`} />
              </div>
              <div className={`text-xl font-black font-mono ${isLight ? 'text-rose-600' : 'text-rose-400'}`}>
                {worstSymbol ? worstSymbol.symbol : '—'}
              </div>
              <div className={`text-xs ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
                {worstSymbol ? `${formatCurrency(worstSymbol.netPnl)} (${worstSymbol.winRate}% WR)` : 'N/A'}
              </div>
            </div>

            <div className={`p-4 rounded-2xl border space-y-1 ${
              isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#12161D] border-[#1C232E]'
            }`}>
              <div className={`flex items-center justify-between text-[11px] font-semibold uppercase ${
                isLight ? 'text-slate-500' : 'text-slate-400'
              }`}>
                <span>Most Traded Symbol</span>
                <BarChart3 className="w-4 h-4 text-indigo-500" />
              </div>
              <div className={`text-xl font-black font-mono ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
                {mostTradedSymbol ? mostTradedSymbol.symbol : '—'}
              </div>
              <div className={`text-xs ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
                {mostTradedSymbol ? `${mostTradedSymbol.count} Executions (${formatCurrency(mostTradedSymbol.netPnl)})` : 'N/A'}
              </div>
            </div>
          </div>

          {/* Symbol Comparison Table */}
          <div className={`rounded-2xl border p-5 space-y-4 ${
            isLight ? 'border-slate-200 bg-white shadow-sm' : 'border-[#1C232E] bg-[#12161D] shadow-xl backdrop-blur-sm'
          }`}>
            <h3 className={`text-xs font-bold uppercase tracking-wider ${
              isLight ? 'text-slate-800' : 'text-slate-200'
            }`}>
              Asset & Symbol Edge Roster ({instrumentData.length} Symbols)
            </h3>

            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className={`border-b text-[11px] font-bold uppercase ${
                    isLight
                      ? 'border-slate-200 text-slate-600 bg-slate-50'
                      : 'border-[#1C232E] text-slate-400 bg-[#0A0D14]'
                  }`}>
                    <th className="p-3">Symbol</th>
                    <th className="p-3">Market</th>
                    <th className="p-3 text-center">Trades</th>
                    <th className="p-3 text-center">Win Rate</th>
                    <th className="p-3 text-right">Net Realized P&L</th>
                    <th className="p-3 text-right">Profit Factor</th>
                    <th className="p-3 text-right">Avg Win</th>
                    <th className="p-3 text-right">Avg Loss</th>
                    <th className="p-3 text-right">Avg R</th>
                  </tr>
                </thead>
                <tbody className={`font-mono divide-y ${
                  isLight ? 'divide-slate-200 text-slate-700' : 'divide-slate-800/60 text-slate-300'
                }`}>
                  {instrumentData.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-slate-400 font-sans text-xs">
                        No closed trades found matching the selected account and date filters.
                      </td>
                    </tr>
                  ) : (
                    instrumentData.map(sym => (
                      <tr key={sym.symbol} className={`transition ${
                        isLight ? 'hover:bg-slate-50/80' : 'hover:bg-[#1A1F27]/50'
                      }`}>
                        <td className={`p-3 font-bold text-sm font-sans ${isLight ? 'text-slate-900' : 'text-white'}`}>{sym.symbol}</td>
                        <td className={`p-3 uppercase text-[11px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>{sym.market}</td>
                        <td className={`p-3 text-center ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>{sym.count}</td>
                        <td className="p-3 text-center font-bold">
                          <span className={sym.winRate >= 50 ? (isLight ? 'text-emerald-600' : 'text-emerald-400') : (isLight ? 'text-rose-600' : 'text-rose-400')}>
                            {sym.winRate}%
                          </span>
                        </td>
                        <td className={`p-3 text-right font-bold text-sm ${
                          sym.netPnl >= 0 ? (isLight ? 'text-emerald-600' : 'text-emerald-400') : (isLight ? 'text-rose-600' : 'text-rose-400')
                        }`}>
                          {sym.netPnl >= 0 ? '+' : ''}${Math.round(sym.netPnl).toLocaleString()}
                        </td>
                        <td className={`p-3 text-right font-bold ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
                          {sym.profitFactor > 0 ? sym.profitFactor.toFixed(2) : '0.00'}
                        </td>
                        <td className={`p-3 text-right ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`}>+${Math.round(sym.avgWin)}</td>
                        <td className={`p-3 text-right ${isLight ? 'text-rose-600' : 'text-rose-400'}`}>-${Math.round(sym.avgLoss)}</td>
                        <td className={`p-3 text-right font-bold ${isLight ? 'text-indigo-600' : 'text-indigo-300'}`}>{formatRMultiple(sym.avgR)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB CONTENT 3: STRATEGY & SETUP BREAKDOWN */}
      {/* ========================================================================= */}
      {activeTab === 'STRATEGY' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className={`p-5 rounded-2xl border space-y-2 ${
              isLight ? 'bg-emerald-50/50 border-emerald-200 shadow-sm' : 'bg-[#12161D] border-emerald-500/30'
            }`}>
              <span className={`text-[10px] font-bold uppercase tracking-wider ${
                isLight ? 'text-emerald-700' : 'text-emerald-400'
              }`}>
                ★ Best Performing Strategy Setup
              </span>
              <div className={`text-xl font-black ${isLight ? 'text-slate-900' : 'text-white'}`}>
                {bestStrategy ? bestStrategy.name : '—'}
              </div>
              <div className={`flex items-center gap-4 text-xs font-mono pt-1 ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
                <span>Net P&L: <strong className={isLight ? 'text-emerald-600 font-bold' : 'text-emerald-400'}>+{formatCurrency(bestStrategy ? bestStrategy.netPnl : 0)}</strong></span>
                <span>Win Rate: <strong className={isLight ? 'text-emerald-600 font-bold' : 'text-emerald-400'}>{bestStrategy ? bestStrategy.winRate : 0}%</strong></span>
                <span>PF: <strong className={isLight ? 'text-slate-800' : 'text-slate-200'}>{bestStrategy ? bestStrategy.profitFactor : 0}</strong></span>
              </div>
            </div>

            <div className={`p-5 rounded-2xl border space-y-2 ${
              isLight ? 'bg-rose-50/50 border-rose-200 shadow-sm' : 'bg-[#12161D] border-rose-500/30'
            }`}>
              <span className={`text-[10px] font-bold uppercase tracking-wider ${
                isLight ? 'text-rose-700' : 'text-rose-400'
              }`}>
                ⚠ Weakest Strategy Setup
              </span>
              <div className={`text-xl font-black ${isLight ? 'text-slate-900' : 'text-white'}`}>
                {worstStrategy ? worstStrategy.name : '—'}
              </div>
              <div className={`flex items-center gap-4 text-xs font-mono pt-1 ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
                <span>Net P&L: <strong className={isLight ? 'text-rose-600 font-bold' : 'text-rose-400'}>{formatCurrency(worstStrategy ? worstStrategy.netPnl : 0)}</strong></span>
                <span>Win Rate: <strong className={isLight ? 'text-rose-600 font-bold' : 'text-rose-400'}>{worstStrategy ? worstStrategy.winRate : 0}%</strong></span>
                <span>PF: <strong className={isLight ? 'text-slate-800' : 'text-slate-200'}>{worstStrategy ? worstStrategy.profitFactor : 0}</strong></span>
              </div>
            </div>
          </div>

          <div className={`rounded-2xl border p-5 space-y-4 ${
            isLight ? 'border-slate-200 bg-white shadow-sm' : 'border-[#1C232E] bg-[#12161D] shadow-xl backdrop-blur-sm'
          }`}>
            <h3 className={`text-xs font-bold uppercase tracking-wider ${
              isLight ? 'text-slate-800' : 'text-slate-200'
            }`}>
              Setup & Playbook Compliance Matrix
            </h3>

            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className={`border-b text-[11px] font-bold uppercase ${
                    isLight
                      ? 'border-slate-200 text-slate-600 bg-slate-50'
                      : 'border-[#1C232E] text-slate-400 bg-[#0A0D14]'
                  }`}>
                    <th className="p-3">Strategy / Setup</th>
                    <th className="p-3 text-center">Trades</th>
                    <th className="p-3 text-center">Win Rate</th>
                    <th className="p-3 text-right">Realized Net P&L</th>
                    <th className="p-3 text-right">Profit Factor</th>
                    <th className="p-3 text-right">Average R</th>
                    <th className="p-3 text-center">Rule Compliance</th>
                  </tr>
                </thead>
                <tbody className={`font-mono divide-y ${
                  isLight ? 'divide-slate-200 text-slate-700' : 'divide-slate-800/60 text-slate-300'
                }`}>
                  {strategyData.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400 font-sans text-xs">
                        No strategy setup data recorded for closed trades matching current filters.
                      </td>
                    </tr>
                  ) : (
                    strategyData.map(st => (
                      <tr key={st.name} className={`transition ${
                        isLight ? 'hover:bg-slate-50/80' : 'hover:bg-[#1A1F27]/50'
                      }`}>
                        <td className={`p-3 font-bold text-sm font-sans ${isLight ? 'text-slate-900' : 'text-white'}`}>{st.name}</td>
                        <td className={`p-3 text-center ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>{st.count}</td>
                        <td className="p-3 text-center font-bold">
                          <span className={st.winRate >= 50 ? (isLight ? 'text-emerald-600' : 'text-emerald-400') : (isLight ? 'text-rose-600' : 'text-rose-400')}>
                            {st.winRate}%
                          </span>
                        </td>
                        <td className={`p-3 text-right font-bold ${
                          st.netPnl >= 0 ? (isLight ? 'text-emerald-600' : 'text-emerald-400') : (isLight ? 'text-rose-600' : 'text-rose-400')
                        }`}>
                          {st.netPnl >= 0 ? '+' : ''}${Math.round(st.netPnl).toLocaleString()}
                        </td>
                        <td className={`p-3 text-right font-bold ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>{st.profitFactor.toFixed(2)}</td>
                        <td className={`p-3 text-right font-bold ${isLight ? 'text-indigo-600' : 'text-indigo-300'}`}>{formatRMultiple(st.avgR)}</td>
                        <td className="p-3 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            st.complianceRate >= 80
                              ? isLight ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-emerald-500/15 text-emerald-400'
                              : isLight ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-amber-500/15 text-amber-400'
                          }`}>
                            {st.complianceRate}%
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB CONTENT 4: LONG VS SHORT DIRECTIONAL EDGE */}
      {/* ========================================================================= */}
      {activeTab === 'DIRECTION' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Long Card */}
          <div className={`rounded-2xl border p-6 space-y-5 ${
            isLight ? 'border-emerald-200 bg-white shadow-sm' : 'border-emerald-500/30 bg-[#12161D] shadow-xl'
          }`}>
            <div className={`flex items-center justify-between pb-3 border-b ${
              isLight ? 'border-slate-200' : 'border-[#1C232E]'
            }`}>
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${
                  isLight
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                }`}>
                  BUY / LONG POSITIONS
                </span>
                <span className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>({directionData.long.count} Trades)</span>
              </div>
              <span className={`text-sm font-mono font-bold ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`}>
                {directionData.long.winRate}% Win Rate
              </span>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Net Realized P&L:</span>
                <span className={`text-2xl font-black font-mono ${
                  directionData.long.netPnl >= 0 ? (isLight ? 'text-emerald-600' : 'text-emerald-400') : (isLight ? 'text-rose-600' : 'text-rose-400')
                }`}>
                  {formatCurrency(directionData.long.netPnl)}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 text-xs font-mono">
                <div className={`p-3 rounded-xl border ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#0A0D14] border-[#1C232E]'
                }`}>
                  <span className={`text-[10px] uppercase block ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>Profit Factor</span>
                  <strong className={isLight ? 'text-slate-900 font-bold' : 'text-slate-100'}>{directionData.long.profitFactor}</strong>
                </div>
                <div className={`p-3 rounded-xl border ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#0A0D14] border-[#1C232E]'
                }`}>
                  <span className={`text-[10px] uppercase block ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>Average R</span>
                  <strong className={isLight ? 'text-indigo-600 font-bold' : 'text-indigo-400'}>{formatRMultiple(directionData.long.avgR)}</strong>
                </div>
                <div className={`p-3 rounded-xl border ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#0A0D14] border-[#1C232E]'
                }`}>
                  <span className={`text-[10px] uppercase block ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>Avg Winner</span>
                  <strong className={isLight ? 'text-emerald-600 font-bold' : 'text-emerald-400'}>+{formatCurrency(directionData.long.avgWin)}</strong>
                </div>
                <div className={`p-3 rounded-xl border ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#0A0D14] border-[#1C232E]'
                }`}>
                  <span className={`text-[10px] uppercase block ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>Avg Loser</span>
                  <strong className={isLight ? 'text-rose-600 font-bold' : 'text-rose-400'}>-{formatCurrency(directionData.long.avgLoss)}</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Short Card */}
          <div className={`rounded-2xl border p-6 space-y-5 ${
            isLight ? 'border-rose-200 bg-white shadow-sm' : 'border-rose-500/30 bg-[#12161D] shadow-xl'
          }`}>
            <div className={`flex items-center justify-between pb-3 border-b ${
              isLight ? 'border-slate-200' : 'border-[#1C232E]'
            }`}>
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${
                  isLight
                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                    : 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                }`}>
                  SELL / SHORT POSITIONS
                </span>
                <span className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>({directionData.short.count} Trades)</span>
              </div>
              <span className={`text-sm font-mono font-bold ${isLight ? 'text-rose-700' : 'text-rose-400'}`}>
                {directionData.short.winRate}% Win Rate
              </span>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Net Realized P&L:</span>
                <span className={`text-2xl font-black font-mono ${
                  directionData.short.netPnl >= 0 ? (isLight ? 'text-emerald-600' : 'text-emerald-400') : (isLight ? 'text-rose-600' : 'text-rose-400')
                }`}>
                  {formatCurrency(directionData.short.netPnl)}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 text-xs font-mono">
                <div className={`p-3 rounded-xl border ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#0A0D14] border-[#1C232E]'
                }`}>
                  <span className={`text-[10px] uppercase block ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>Profit Factor</span>
                  <strong className={isLight ? 'text-slate-900 font-bold' : 'text-slate-100'}>{directionData.short.profitFactor}</strong>
                </div>
                <div className={`p-3 rounded-xl border ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#0A0D14] border-[#1C232E]'
                }`}>
                  <span className={`text-[10px] uppercase block ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>Average R</span>
                  <strong className={isLight ? 'text-indigo-600 font-bold' : 'text-indigo-400'}>{formatRMultiple(directionData.short.avgR)}</strong>
                </div>
                <div className={`p-3 rounded-xl border ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#0A0D14] border-[#1C232E]'
                }`}>
                  <span className={`text-[10px] uppercase block ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>Avg Winner</span>
                  <strong className={isLight ? 'text-emerald-600 font-bold' : 'text-emerald-400'}>+{formatCurrency(directionData.short.avgWin)}</strong>
                </div>
                <div className={`p-3 rounded-xl border ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#0A0D14] border-[#1C232E]'
                }`}>
                  <span className={`text-[10px] uppercase block ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>Avg Loser</span>
                  <strong className={isLight ? 'text-rose-600 font-bold' : 'text-rose-400'}>-{formatCurrency(directionData.short.avgLoss)}</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB CONTENT 5: TIME OF DAY & DAY-OF-WEEK HEATMAP */}
      {/* ========================================================================= */}
      {activeTab === 'TIME_HEATMAP' && (
        <div className="space-y-6">
          {/* Day of Week Heatmap */}
          <div className={`rounded-2xl border p-5 space-y-4 ${
            isLight ? 'border-slate-200 bg-white shadow-sm' : 'border-[#1C232E] bg-[#12161D] shadow-xl backdrop-blur-sm'
          }`}>
            <div className={`flex items-center justify-between pb-2 border-b ${
              isLight ? 'border-slate-200' : 'border-[#1C232E]'
            }`}>
              <h3 className={`text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${
                isLight ? 'text-slate-800' : 'text-slate-200'
              }`}>
                <Calendar className="w-4 h-4 text-indigo-500" />
                Day of Week Performance Heatmap
              </h3>
              <div className={`text-xs font-mono ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                Best: <strong className={isLight ? 'text-emerald-600 font-bold' : 'text-emerald-400'}>{bestTradingDay?.name || 'N/A'}</strong> | Worst: <strong className={isLight ? 'text-rose-600 font-bold' : 'text-rose-400'}>{worstTradingDay?.name || 'N/A'}</strong>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
              {dayOfWeekData.map(d => {
                const isProfitable = d.netPnl > 0;
                const isLoss = d.netPnl < 0;

                return (
                  <div
                    key={d.name}
                    className={`p-4 rounded-xl border space-y-2 transition ${
                      d.count === 0
                        ? isLight ? 'bg-slate-50 border-slate-200 opacity-60' : 'bg-[#0A0D14]/40 border-[#1C232E]/40 opacity-60'
                        : isProfitable
                        ? isLight ? 'bg-emerald-50/70 border-emerald-200' : 'bg-emerald-950/20 border-emerald-500/30'
                        : isLoss
                        ? isLight ? 'bg-rose-50/70 border-rose-200' : 'bg-rose-950/20 border-rose-500/30'
                        : isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#0A0D14] border-[#1C232E]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-bold ${isLight ? 'text-slate-900' : 'text-slate-200'}`}>{d.name}</span>
                      <span className={`text-[10px] font-mono ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>{d.count} trades</span>
                    </div>

                    <div className={`text-base font-black font-mono ${
                      isProfitable
                        ? isLight ? 'text-emerald-600' : 'text-emerald-400'
                        : isLoss
                        ? isLight ? 'text-rose-600' : 'text-rose-400'
                        : isLight ? 'text-slate-500' : 'text-slate-400'
                    }`}>
                      {d.count > 0 ? `${isProfitable ? '+' : ''}$${Math.round(d.netPnl).toLocaleString()}` : '$0'}
                    </div>

                    <div className={`flex items-center justify-between text-[11px] pt-1 border-t font-mono ${
                      isLight ? 'border-slate-200 text-slate-500' : 'border-[#1C232E] text-slate-400'
                    }`}>
                      <span>Win Rate:</span>
                      <strong className={d.winRate >= 50 ? (isLight ? 'text-emerald-600 font-bold' : 'text-emerald-400') : (isLight ? 'text-slate-700' : 'text-slate-300')}>
                        {d.count > 0 ? `${d.winRate}%` : '—'}
                      </strong>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Hour of Day Hourly Grid */}
          <div className={`rounded-2xl border p-5 space-y-4 ${
            isLight ? 'border-slate-200 bg-white shadow-sm' : 'border-[#1C232E] bg-[#12161D] shadow-xl backdrop-blur-sm'
          }`}>
            <div className={`flex items-center justify-between pb-2 border-b ${
              isLight ? 'border-slate-200' : 'border-[#1C232E]'
            }`}>
              <h3 className={`text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${
                isLight ? 'text-slate-800' : 'text-slate-200'
              }`}>
                <Clock className="w-4 h-4 text-indigo-500" />
                24-Hour Execution Distribution (UTC)
              </h3>
              <div className={`text-xs font-mono ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                Prime Hour: <strong className={isLight ? 'text-emerald-600 font-bold' : 'text-emerald-400'}>{bestTradingHour?.label || 'N/A'}</strong>
              </div>
            </div>

            <div className="h-[200px] w-full flex items-end justify-between gap-1 px-2 pt-4 pb-6 overflow-x-auto custom-scrollbar">
              {hourOfDayData.map(h => {
                const maxAbs = Math.max(100, ...hourOfDayData.map(item => Math.abs(item.netPnl)));
                const heightPct = h.count > 0 ? Math.min(100, Math.max(15, (Math.abs(h.netPnl) / maxAbs) * 100)) : 4;
                const isWin = h.netPnl >= 0 && h.count > 0;

                return (
                  <div
                    key={h.hour}
                    className="flex-1 min-w-[28px] max-w-[40px] flex flex-col items-center justify-end h-full group relative cursor-pointer"
                    onMouseEnter={() => setHoverDetail({
                      title: `${h.label} UTC`,
                      subtitle: `${h.count} trades | Net: ${h.netPnl >= 0 ? '+' : ''}$${Math.round(h.netPnl)} (${h.winRate}% WR)`
                    })}
                  >
                    <div
                      style={{ height: `${heightPct * 0.7}%` }}
                      className={`w-full rounded-t-md transition-all duration-300 group-hover:brightness-125 ${
                        h.count === 0
                          ? isLight ? 'bg-slate-200' : 'bg-slate-800/40'
                          : isWin
                          ? 'bg-emerald-500 shadow-md shadow-emerald-500/20'
                          : 'bg-rose-500 shadow-md shadow-rose-500/20'
                      }`}
                    />
                    <span className={`text-[9px] font-mono mt-1 ${isLight ? 'text-slate-500 font-semibold' : 'text-slate-500'}`}>
                      {h.hour % 3 === 0 ? `${h.hour}h` : ''}
                    </span>
                  </div>
                );
              })}
            </div>

            {hoverDetail && (
              <div className={`text-xs font-mono p-2.5 rounded-lg border text-center ${
                isLight ? 'bg-slate-100 border-slate-300 text-slate-800 font-medium' : 'bg-[#0A0D14] border-[#1C232E] text-slate-300'
              }`}>
                <strong>{hoverDetail.title}</strong> — {hoverDetail.subtitle}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB CONTENT 6: MARKET SESSION BREAKDOWN */}
      {/* ========================================================================= */}
      {activeTab === 'MARKET_SESSION' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {sessionData.map(sess => (
              <div
                key={sess.id}
                className={`p-5 rounded-2xl border space-y-4 ${
                  isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#12161D] border-[#1C232E] shadow-xl'
                }`}
              >
                <div className={`flex items-center justify-between pb-2 border-b ${
                  isLight ? 'border-slate-200' : 'border-[#1C232E]'
                }`}>
                  <div>
                    <h4 className={`text-sm font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>{sess.name}</h4>
                    <span className={`text-[10px] font-mono ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>{sess.desc}</span>
                  </div>
                  <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${
                    isLight
                      ? 'text-indigo-700 bg-indigo-50 border-indigo-200'
                      : 'text-indigo-400 bg-indigo-950/70 border-indigo-500/30'
                  }`}>
                    {sess.count} trades
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Net Realized P&L:</span>
                  <span className={`text-xl font-black font-mono ${
                    sess.netPnl >= 0 ? (isLight ? 'text-emerald-600' : 'text-emerald-400') : (isLight ? 'text-rose-600' : 'text-rose-400')
                  }`}>
                    {formatCurrency(sess.netPnl)}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-1">
                  <div className={`p-2.5 rounded-lg border ${
                    isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#0A0D14] border-[#1C232E]'
                  }`}>
                    <span className={`text-[10px] uppercase block ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>Win Rate</span>
                    <strong className={sess.winRate >= 50 ? (isLight ? 'text-emerald-600 font-bold' : 'text-emerald-400') : (isLight ? 'text-rose-600 font-bold' : 'text-rose-400')}>
                      {sess.winRate}%
                    </strong>
                  </div>
                  <div className={`p-2.5 rounded-lg border ${
                    isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#0A0D14] border-[#1C232E]'
                  }`}>
                    <span className={`text-[10px] uppercase block ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>Profit Factor</span>
                    <strong className={isLight ? 'text-slate-900 font-bold' : 'text-slate-100'}>{sess.profitFactor}</strong>
                  </div>
                  <div className={`p-2.5 rounded-lg border ${
                    isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#0A0D14] border-[#1C232E]'
                  }`}>
                    <span className={`text-[10px] uppercase block ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>Average Win</span>
                    <strong className={isLight ? 'text-emerald-600 font-bold' : 'text-emerald-400'}>+{formatCurrency(sess.avgWin)}</strong>
                  </div>
                  <div className={`p-2.5 rounded-lg border ${
                    isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#0A0D14] border-[#1C232E]'
                  }`}>
                    <span className={`text-[10px] uppercase block ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>Average R</span>
                    <strong className={isLight ? 'text-indigo-600 font-bold' : 'text-indigo-400'}>{formatRMultiple(sess.avgR)}</strong>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB CONTENT 7: HOLDING DURATION */}
      {/* ========================================================================= */}
      {activeTab === 'DURATION' && (
        <div className={`rounded-2xl border p-5 space-y-5 ${
          isLight ? 'border-slate-200 bg-white shadow-sm' : 'border-[#1C232E] bg-[#12161D] shadow-xl backdrop-blur-sm'
        }`}>
          <div className={`flex items-center justify-between pb-2 border-b ${
            isLight ? 'border-slate-200' : 'border-[#1C232E]'
          }`}>
            <div>
              <h3 className={`text-xs font-bold uppercase tracking-wider ${
                isLight ? 'text-slate-800' : 'text-slate-200'
              }`}>
                Holding Time vs Realized Alpha
              </h3>
              <p className={`text-[11px] mt-0.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                Understand if quick scalps or patient multi-hour swings generate your highest edge
              </p>
            </div>
            <span className={`text-xs font-mono font-semibold ${isLight ? 'text-indigo-600' : 'text-indigo-400'}`}>
              Avg Duration: {metrics.avgDurationMinutes}m
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {durationData.map(d => (
              <div key={d.id} className={`p-4 rounded-xl border space-y-3 ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#0A0D14] border-[#1C232E]'
              }`}>
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-bold ${isLight ? 'text-slate-900' : 'text-slate-200'}`}>{d.label}</span>
                  <span className={`text-[10px] font-mono ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>{d.count} trades</span>
                </div>

                <div className={`text-lg font-black font-mono ${
                  d.netPnl >= 0 ? (isLight ? 'text-emerald-600' : 'text-emerald-400') : (isLight ? 'text-rose-600' : 'text-rose-400')
                }`}>
                  {d.netPnl >= 0 ? '+' : ''}${Math.round(d.netPnl).toLocaleString()}
                </div>

                <div className={`flex items-center justify-between text-xs pt-1 border-t font-mono ${
                  isLight ? 'border-slate-200 text-slate-600' : 'border-[#1C232E] text-slate-400'
                }`}>
                  <span>Win Rate: <strong className={isLight ? 'text-slate-900' : 'text-slate-200'}>{d.winRate}%</strong></span>
                  <span>PF: <strong className={isLight ? 'text-slate-900' : 'text-slate-200'}>{d.profitFactor}</strong></span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB CONTENT 8: TAGS & EXECUTION MISTAKES */}
      {/* ========================================================================= */}
      {activeTab === 'TAGS' && (
        <div className={`rounded-2xl border p-5 space-y-4 ${
          isLight ? 'border-slate-200 bg-white shadow-sm' : 'border-[#1C232E] bg-[#12161D] shadow-xl backdrop-blur-sm'
        }`}>
          <h3 className={`text-xs font-bold uppercase tracking-wider ${
            isLight ? 'text-slate-800' : 'text-slate-200'
          }`}>
            Execution Tag Statistical Breakdown ({tagsData.length} Tags)
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {tagsData.map(t => (
              <div key={t.name} className={`p-3.5 rounded-xl border space-y-2 ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#0A0D14] border-[#1C232E]'
              }`}>
                <div className="flex items-center justify-between">
                  <span className={`px-2 py-0.5 rounded text-xs font-bold border ${
                    isLight
                      ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                      : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                  }`}>
                    #{t.name}
                  </span>
                  <span className={`text-[10px] font-mono ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>{t.count} trades</span>
                </div>

                <div className="flex items-center justify-between font-mono pt-1">
                  <span className={`font-bold text-sm ${
                    t.netPnl >= 0 ? (isLight ? 'text-emerald-600' : 'text-emerald-400') : (isLight ? 'text-rose-600' : 'text-rose-400')
                  }`}>
                    {t.netPnl >= 0 ? '+' : ''}${Math.round(t.netPnl).toLocaleString()}
                  </span>
                  <span className={`text-xs ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
                    WR: <strong className={isLight ? 'text-slate-900' : ''}>{t.winRate}%</strong>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB CONTENT 9: PSYCHOLOGY & RULES COMPLIANCE */}
      {/* ========================================================================= */}
      {activeTab === 'PSYCHOLOGY' && (
        <div className="space-y-6">
          {/* Rules Followed vs Broken Impact Card */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className={`p-5 rounded-2xl border space-y-3 ${
              isLight
                ? 'bg-emerald-50/50 border-emerald-200 shadow-sm'
                : 'bg-emerald-950/20 border-emerald-500/30'
            }`}>
              <div className="flex items-center gap-2">
                <CheckCircle2 className={`w-5 h-5 ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`} />
                <h4 className={`text-sm font-bold ${isLight ? 'text-emerald-800' : 'text-emerald-400'}`}>Rules Strictly Followed</h4>
              </div>
              <div className={`text-2xl font-black font-mono ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`}>
                +{formatCurrency(psychologyData.ruleAdherence.followed.netPnl)}
              </div>
              <div className={`flex items-center justify-between text-xs font-mono pt-1 ${
                isLight ? 'text-slate-600' : 'text-slate-300'
              }`}>
                <span>Total Trades: <strong>{psychologyData.ruleAdherence.followed.count}</strong></span>
                <span>Win Rate: <strong className={isLight ? 'text-emerald-700' : ''}>{psychologyData.ruleAdherence.followed.winRate}%</strong></span>
              </div>
            </div>

            <div className={`p-5 rounded-2xl border space-y-3 ${
              isLight
                ? 'bg-rose-50/50 border-rose-200 shadow-sm'
                : 'bg-rose-950/20 border-rose-500/30'
            }`}>
              <div className="flex items-center gap-2">
                <XCircle className={`w-5 h-5 ${isLight ? 'text-rose-600' : 'text-rose-400'}`} />
                <h4 className={`text-sm font-bold ${isLight ? 'text-rose-800' : 'text-rose-400'}`}>Rules Broken / Deviations</h4>
              </div>
              <div className={`text-2xl font-black font-mono ${isLight ? 'text-rose-600' : 'text-rose-400'}`}>
                {formatCurrency(psychologyData.ruleAdherence.broken.netPnl)}
              </div>
              <div className={`flex items-center justify-between text-xs font-mono pt-1 ${
                isLight ? 'text-slate-600' : 'text-slate-300'
              }`}>
                <span>Total Trades: <strong>{psychologyData.ruleAdherence.broken.count}</strong></span>
                <span>Win Rate: <strong className={isLight ? 'text-rose-700' : ''}>{psychologyData.ruleAdherence.broken.winRate}%</strong></span>
              </div>
            </div>
          </div>

          {/* Emotional State Matrix */}
          <div className={`rounded-2xl border p-5 space-y-4 ${
            isLight ? 'border-slate-200 bg-white shadow-sm' : 'border-[#1C232E] bg-[#12161D] shadow-xl'
          }`}>
            <h3 className={`text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${
              isLight ? 'text-slate-800' : 'text-slate-200'
            }`}>
              <Smile className="w-4 h-4 text-indigo-500" />
              Emotional Mindset Attribution
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {psychologyData.emotionStats.map(em => (
                <div key={em.emotion} className={`p-3.5 rounded-xl border space-y-1.5 ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#0A0D14] border-[#1C232E]'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>{em.emotion}</span>
                    <span className={`text-[10px] font-mono ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>{em.count}</span>
                  </div>
                  <div className={`text-sm font-black font-mono ${
                    em.netPnl >= 0 ? (isLight ? 'text-emerald-600' : 'text-emerald-400') : (isLight ? 'text-rose-600' : 'text-rose-400')
                  }`}>
                    {em.netPnl >= 0 ? '+' : ''}${Math.round(em.netPnl).toLocaleString()}
                  </div>
                  <div className={`text-[10px] font-mono ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                    WR: <strong className={isLight ? 'text-slate-900' : 'text-slate-200'}>{em.winRate}%</strong>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
