import React, { useState } from 'react';
import {
  CalendarDays,
  Star,
  Bell,
  Search,
  Globe,
  Clock,
  ExternalLink,
  TrendingUp,
  DollarSign,
  LineChart,
  Coins,
  Bitcoin,
  Newspaper,
  ShieldAlert,
  Sparkles,
  Bookmark
} from 'lucide-react';
import { useTrading } from '../../context/TradingContext';
import { PerformanceCalendar } from '../dashboard/PerformanceCalendar';
import { DrawdownChart } from '../dashboard/DrawdownChart';
import { TradeTimePerformanceChart } from '../dashboard/TradeTimePerformanceChart';

export interface ResourceItem {
  id: string;
  name: string;
  categoryName: string;
  badge: 'FEATURED' | 'FOREX' | 'CRYPTO' | 'MACRO' | 'MARKETS';
  description: string;
  website: string;
  directUrl: string;
  ctaText: string;
  categoryGroup: 'Forex' | 'Crypto' | 'Macro' | 'Global Markets';
  icon: React.ComponentType<{ className?: string }>;
  isFeatured?: boolean;
}

const MARKET_RESOURCES: ResourceItem[] = [
  {
    id: 'tradingview',
    name: 'TradingView',
    categoryName: 'Economic Calendar & Market Intelligence',
    badge: 'FEATURED',
    description: 'Track global economic events, central-bank decisions, market-moving releases and financial news.',
    website: 'https://www.tradingview.com/',
    directUrl: 'https://www.tradingview.com/economic-calendar/',
    ctaText: 'Open TradingView →',
    categoryGroup: 'Macro',
    icon: TrendingUp,
    isFeatured: true,
  },
  {
    id: 'forex-factory',
    name: 'Forex Factory',
    categoryName: 'Forex Resources',
    badge: 'FOREX',
    description: 'Forex economic calendar, market-moving releases, central-bank events and trader-focused market information.',
    website: 'https://www.forexfactory.com/',
    directUrl: 'https://www.forexfactory.com/calendar',
    ctaText: 'Open Forex Factory →',
    categoryGroup: 'Forex',
    icon: DollarSign,
  },
  {
    id: 'investing-com',
    name: 'Investing.com',
    categoryName: 'Forex Resources',
    badge: 'FOREX',
    description: 'Global economic calendar, market news, indicators and upcoming events.',
    website: 'https://www.investing.com/',
    directUrl: 'https://www.investing.com/economic-calendar',
    ctaText: 'Open Investing.com →',
    categoryGroup: 'Forex',
    icon: Globe,
  },
  {
    id: 'trading-economics',
    name: 'Trading Economics',
    categoryName: 'Forex Resources',
    badge: 'MACRO',
    description: 'Detailed macroeconomic indicators, forecasts, historical data and global economic events.',
    website: 'https://tradingeconomics.com/',
    directUrl: 'https://tradingeconomics.com/calendar',
    ctaText: 'Open Trading Economics →',
    categoryGroup: 'Forex',
    icon: LineChart,
  },
  {
    id: 'coinmarketcap',
    name: 'CoinMarketCap',
    categoryName: 'Crypto Resources',
    badge: 'CRYPTO',
    description: 'Crypto market data, prices, market capitalization, rankings and crypto-related information.',
    website: 'https://coinmarketcap.com/',
    directUrl: 'https://coinmarketcap.com/',
    ctaText: 'Open CoinMarketCap →',
    categoryGroup: 'Crypto',
    icon: Coins,
  },
  {
    id: 'coindesk',
    name: 'CoinDesk',
    categoryName: 'Crypto Resources',
    badge: 'CRYPTO',
    description: 'Crypto-focused financial news, market developments and digital-asset coverage.',
    website: 'https://www.coindesk.com/',
    directUrl: 'https://www.coindesk.com/',
    ctaText: 'Open CoinDesk →',
    categoryGroup: 'Crypto',
    icon: Bitcoin,
  },
  {
    id: 'reuters-markets',
    name: 'Reuters Markets',
    categoryName: 'Global Financial News',
    badge: 'MARKETS',
    description: 'Professional coverage of global financial markets, currencies, commodities, central banks and macroeconomic developments.',
    website: 'https://www.reuters.com/markets/',
    directUrl: 'https://www.reuters.com/markets/',
    ctaText: 'Open Reuters Markets →',
    categoryGroup: 'Global Markets',
    icon: Newspaper,
  },
];

interface EconomicCalendarViewProps {
  defaultTab?: 'trading' | 'economic' | 'intelligence';
}

export const EconomicCalendarView: React.FC<EconomicCalendarViewProps> = ({ defaultTab = 'economic' }) => {
  const {
    calendarEvents,
    toggleEventFavorite,
    toggleEventReminder,
    filteredTrades,
    formatCurrency,
    formatRMultiple,
    setSelectedTrade,
  } = useTrading();

  const [viewTab, setViewTab] = useState<'trading' | 'economic' | 'intelligence'>(defaultTab);

  // Economic Calendar filters
  const [impactFilter, setImpactFilter] = useState<'ALL' | 'HIGH' | 'MEDIUM' | 'LOW'>('ALL');
  const [currencyFilter, setCurrencyFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Market Intelligence filters
  const [resourceCategoryFilter, setResourceCategoryFilter] = useState<'All' | 'Forex' | 'Crypto' | 'Macro' | 'Global Markets'>('All');
  const [resourceSearch, setResourceSearch] = useState('');

  const closedTrades = filteredTrades.filter(t => t.status === 'CLOSED');

  const filteredEvents = calendarEvents.filter(ev => {
    const matchesImpact = impactFilter === 'ALL' || ev.impact === impactFilter;
    const matchesCurrency = currencyFilter === 'ALL' || ev.currency === currencyFilter;
    const matchesSearch = ev.event.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesImpact && matchesCurrency && matchesSearch;
  });

  const filteredResources = MARKET_RESOURCES.filter(res => {
    const matchesCategory =
      resourceCategoryFilter === 'All' ||
      (resourceCategoryFilter === 'Forex' && res.categoryGroup === 'Forex') ||
      (resourceCategoryFilter === 'Crypto' && res.categoryGroup === 'Crypto') ||
      (resourceCategoryFilter === 'Macro' && (res.categoryGroup === 'Macro' || res.badge === 'MACRO')) ||
      (resourceCategoryFilter === 'Global Markets' && (res.categoryGroup === 'Global Markets' || res.badge === 'MARKETS'));

    const searchLower = resourceSearch.toLowerCase().trim();
    const matchesSearch =
      !searchLower ||
      res.name.toLowerCase().includes(searchLower) ||
      res.categoryName.toLowerCase().includes(searchLower) ||
      res.description.toLowerCase().includes(searchLower) ||
      res.badge.toLowerCase().includes(searchLower);

    return matchesCategory && matchesSearch;
  });

  const getBadgeStyle = (badge: ResourceItem['badge']) => {
    switch (badge) {
      case 'FEATURED':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'FOREX':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/40';
      case 'CRYPTO':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
      case 'MACRO':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/40';
      case 'MARKETS':
        return 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40';
      default:
        return 'bg-slate-800 text-slate-300 border-[#273141]';
    }
  };

  const featuredItem = MARKET_RESOURCES.find(r => r.isFeatured);
  const forexItems = filteredResources.filter(r => r.categoryGroup === 'Forex');
  const cryptoItems = filteredResources.filter(r => r.categoryGroup === 'Crypto');
  const globalItems = filteredResources.filter(r => r.categoryGroup === 'Global Markets');

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1520px] mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-[#1C232E]">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <CalendarDays className="w-6 h-6 text-indigo-400" />
            Macroeconomic Releases & Market Intelligence
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Essential external resources for macro events, Forex research, crypto markets and financial news.
          </p>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center gap-1 p-1 bg-[#12161D] border border-[#1C232E] rounded-xl">
          <button
            onClick={() => setViewTab('trading')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              viewTab === 'trading'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/25'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <CalendarDays className="w-3.5 h-3.5" />
            <span>Trading Calendar</span>
          </button>
          <button
            onClick={() => setViewTab('economic')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              viewTab === 'economic'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/25'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Economic Calendar</span>
          </button>
          <button
            onClick={() => setViewTab('intelligence')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              viewTab === 'intelligence'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/25'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Market Intelligence</span>
          </button>
        </div>
      </div>

      {/* View 1: Trading Performance Calendar */}
      {viewTab === 'trading' && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start animate-in fade-in">
          <div className="xl:col-span-8">
            <PerformanceCalendar
              trades={closedTrades}
              formatCurrency={formatCurrency}
              formatRMultiple={formatRMultiple}
              onSelectTrade={t => setSelectedTrade(t)}
            />
          </div>
          <div className="xl:col-span-4 space-y-4">
            <DrawdownChart
              trades={closedTrades}
              formatCurrency={formatCurrency}
            />
            <TradeTimePerformanceChart
              trades={closedTrades}
              formatCurrency={formatCurrency}
              onSelectTrade={t => setSelectedTrade(t)}
            />
          </div>
        </div>
      )}

      {/* View 2: Economic Calendar Events */}
      {viewTab === 'economic' && (
        <div className="space-y-6 animate-in fade-in">
          {/* Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-[#12161D] border border-[#1C232E] p-3 rounded-2xl">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search events (FOMC, CPI, GDP)..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full rounded-xl bg-[#0A0D14] border border-[#1C232E] py-1.5 pl-9 pr-4 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Impact Selector */}
            <div className="flex items-center gap-1.5 bg-[#0A0D14] border border-[#1C232E] rounded-xl p-0.5 text-xs">
              {(['ALL', 'HIGH', 'MEDIUM', 'LOW'] as const).map(imp => (
                <button
                  key={imp}
                  onClick={() => setImpactFilter(imp)}
                  className={`px-3 py-1 rounded-lg font-medium transition cursor-pointer ${
                    impactFilter === imp
                      ? imp === 'HIGH'
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/25'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {imp}
                </button>
              ))}
            </div>

            {/* Currency Filter */}
            <select
              value={currencyFilter}
              onChange={e => setCurrencyFilter(e.target.value)}
              className="rounded-xl bg-[#0A0D14] border border-[#1C232E] px-3 py-1.5 text-xs text-slate-300 focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Currencies</option>
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
              <option value="GBP">GBP (£)</option>
            </select>
          </div>

          {/* Calendar List */}
          <div className="rounded-2xl border border-[#1C232E] bg-[#12161D] shadow-xl overflow-hidden backdrop-blur-sm">
            <div className="divide-y divide-slate-800/60">
              {filteredEvents.map(event => {
                const isHigh = event.impact === 'HIGH';
                const isMed = event.impact === 'MEDIUM';

                return (
                  <div
                    key={event.id}
                    className="p-4 hover:bg-[#1A1F27]/40 transition flex flex-wrap items-center justify-between gap-4"
                  >
                    {/* Left: Time & Flag & Event Name */}
                    <div className="flex items-center gap-2.5 min-w-0 flex-1 flex-wrap sm:flex-nowrap">
                      <button
                        onClick={() => toggleEventFavorite(event.id)}
                        className="p-1 text-slate-500 hover:text-amber-400 transition shrink-0"
                      >
                        <Star
                          className={`w-4 h-4 ${event.isFavorite ? 'text-amber-400 fill-amber-400' : ''}`}
                        />
                      </button>

                      <div className="flex flex-col shrink-0">
                        <span className="text-xs font-mono font-bold text-slate-300 flex items-center gap-1.5">
                          <Clock className="w-3 h-3 text-slate-500" />
                          {event.time}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">{event.date}</span>
                      </div>

                      <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] font-bold text-slate-200 border border-[#273141] shrink-0">
                        {event.currency}
                      </span>

                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider shrink-0 ${
                          isHigh
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            : isMed
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {event.impact}
                      </span>

                      <span className="text-xs font-semibold text-slate-100 min-w-0 truncate">{event.event}</span>
                    </div>

                    {/* Right: Data Forecast, Previous, Actual + Reminder */}
                    <div className="flex items-center gap-3 sm:gap-6 font-mono text-xs shrink-0 flex-wrap">
                      <div>
                        <span className="text-[10px] text-slate-500 block">Actual</span>
                        <span className={`font-bold ${event.actual ? 'text-emerald-400' : 'text-slate-500'}`}>
                          {event.actual || 'Pending'}
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] text-slate-500 block">Forecast</span>
                        <span className="text-slate-300">{event.forecast}</span>
                      </div>

                      <div>
                        <span className="text-[10px] text-slate-500 block">Previous</span>
                        <span className="text-slate-400">{event.previous}</span>
                      </div>

                      <button
                        onClick={() => toggleEventReminder(event.id)}
                        className={`p-2 rounded-xl border transition ${
                          event.hasReminder
                            ? 'bg-indigo-600/20 text-indigo-400 border-indigo-500/40'
                            : 'border-[#1C232E] text-slate-500 hover:text-slate-300 hover:bg-[#1A1F27]'
                        }`}
                        title="Toggle Alert Reminder"
                      >
                        <Bell className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* View 3: Market Intelligence Hub */}
      {viewTab === 'intelligence' && (
        <div className="space-y-8 animate-in fade-in">
          {/* Subtitle Header Banner */}
          <div className="relative bg-gradient-to-r from-slate-900 via-slate-900/90 to-indigo-950/40 border border-[#1C232E] rounded-2xl p-6 overflow-hidden shadow-lg">
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1 max-w-2xl">
                <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold uppercase tracking-widest">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>Curated External Terminal Hub</span>
                </div>
                <h2 className="text-2xl font-extrabold text-white tracking-tight">Market Intelligence</h2>
                <p className="text-sm text-slate-300 leading-relaxed">
                  Essential external resources for macro events, Forex research, crypto markets and financial news.
                </p>
              </div>

              {/* Quick Summary Pill */}
              <div className="flex items-center gap-3 bg-[#0A0D14] border border-[#1C232E] rounded-xl px-4 py-3 shrink-0">
                <Bookmark className="w-5 h-5 text-indigo-400" />
                <div className="text-xs">
                  <span className="text-slate-400 block">Verified Platforms</span>
                  <span className="font-bold text-slate-200">7 Direct Market Tools</span>
                </div>
              </div>
            </div>
          </div>

          {/* Filter Bar & Search */}
          <div className="flex flex-wrap items-center justify-between gap-4 bg-[#12161D] border border-[#1C232E] p-3.5 rounded-2xl">
            {/* Category Filter Pills */}
            <div className="flex flex-wrap items-center gap-1.5">
              {(['All', 'Forex', 'Crypto', 'Macro', 'Global Markets'] as const).map(cat => (
                <button
                  key={cat}
                  onClick={() => setResourceCategoryFilter(cat)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                    resourceCategoryFilter === cat
                      ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-600/25'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-[#1A1F27]/60'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search resources..."
                value={resourceSearch}
                onChange={e => setResourceSearch(e.target.value)}
                className="w-full rounded-xl bg-[#0A0D14] border border-[#1C232E] py-2 pl-9 pr-4 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Featured Resource (TradingView) - Shown if filter allows */}
          {featuredItem &&
            (resourceCategoryFilter === 'All' || resourceCategoryFilter === 'Macro') &&
            !resourceSearch && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider">
                  <Sparkles className="w-4 h-4" />
                  <span>Primary Recommended Resource</span>
                </div>

                <div className="relative bg-gradient-to-br from-indigo-950/60 via-slate-900 to-slate-900/95 border-2 border-indigo-500/40 hover:border-indigo-500/70 rounded-2xl p-6 sm:p-8 transition-all shadow-xl group">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-3 max-w-3xl">
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-inner">
                          <featuredItem.icon className="w-6 h-6" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-xl sm:text-2xl font-bold text-white group-hover:text-indigo-300 transition">
                              {featuredItem.name}
                            </h3>
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase border ${getBadgeStyle(featuredItem.badge)}`}>
                              {featuredItem.badge}
                            </span>
                          </div>
                          <span className="text-xs font-medium text-indigo-400/90">
                            {featuredItem.categoryName}
                          </span>
                        </div>
                      </div>

                      <p className="text-sm sm:text-base text-slate-300 leading-relaxed font-normal">
                        "{featuredItem.description}"
                      </p>
                    </div>

                    <div className="shrink-0 flex items-center">
                      <a
                        href={featuredItem.directUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm transition-all shadow-lg shadow-indigo-600/30 hover:scale-[1.02] active:scale-[0.98]"
                      >
                        <span>{featuredItem.ctaText}</span>
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            )}

          {/* Grouped Resource Sections or Filter Grid */}
          {resourceCategoryFilter === 'All' && !resourceSearch ? (
            <div className="space-y-10">
              {/* Forex Resources */}
              {forexItems.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2 border-b border-[#1C232E] pb-2">
                    <DollarSign className="w-5 h-5 text-blue-400" />
                    Forex Resources
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {forexItems.map(item => (
                      <ResourceCard key={item.id} item={item} getBadgeStyle={getBadgeStyle} />
                    ))}
                  </div>
                </div>
              )}

              {/* Crypto Resources */}
              {cryptoItems.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2 border-b border-[#1C232E] pb-2">
                    <Coins className="w-5 h-5 text-emerald-400" />
                    Crypto Resources
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {cryptoItems.map(item => (
                      <ResourceCard key={item.id} item={item} getBadgeStyle={getBadgeStyle} />
                    ))}
                  </div>
                </div>
              )}

              {/* Global Financial News */}
              {globalItems.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2 border-b border-[#1C232E] pb-2">
                    <Newspaper className="w-5 h-5 text-indigo-400" />
                    Global Financial News
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {globalItems.map(item => (
                      <ResourceCard key={item.id} item={item} getBadgeStyle={getBadgeStyle} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Filtered or Searched Grid */
            <div className="space-y-4">
              {filteredResources.length === 0 ? (
                <div className="bg-[#12161D] border border-[#1C232E] rounded-2xl p-12 text-center space-y-3">
                  <Search className="w-8 h-8 text-slate-500 mx-auto" />
                  <h4 className="text-base font-bold text-slate-300">No matching resources found</h4>
                  <p className="text-xs text-slate-500">Try adjusting your search query or category filter.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {filteredResources.map(item => (
                    <ResourceCard key={item.id} item={item} getBadgeStyle={getBadgeStyle} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* External-Link Disclaimer */}
          <div className="pt-6 border-t border-[#1C232E]">
            <div className="flex items-center gap-2 text-xs text-slate-400/90 bg-[#0E121A] border border-[#1C232E] rounded-xl p-3.5 max-w-3xl">
              <ShieldAlert className="w-4 h-4 text-slate-400 shrink-0" />
              <span>
                External resources open in a new tab. TradeForge does not control the content, availability, or accuracy of third-party websites.
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

interface ResourceCardProps {
  item: ResourceItem;
  getBadgeStyle: (badge: ResourceItem['badge']) => string;
}

const ResourceCard: React.FC<ResourceCardProps> = ({ item, getBadgeStyle }) => {
  const IconComponent = item.icon;

  return (
    <div className="flex flex-col justify-between bg-[#12161D] hover:bg-[#12161D] border border-[#1C232E] hover:border-[#273141] rounded-2xl p-5 transition-all shadow-md group hover:shadow-lg hover:-translate-y-0.5">
      <div className="space-y-3">
        {/* Header: Logo / Icon, Name, Category Badge */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-800 border border-[#273141]/60 flex items-center justify-center text-slate-300 group-hover:text-indigo-400 group-hover:border-indigo-500/40 transition">
              <IconComponent className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-base font-bold text-white group-hover:text-indigo-300 transition flex items-center gap-1.5">
                {item.name}
              </h4>
              <span className="text-[11px] font-medium text-slate-400 block">{item.categoryName}</span>
            </div>
          </div>

          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border shrink-0 ${getBadgeStyle(item.badge)}`}>
            {item.badge}
          </span>
        </div>

        {/* Short Description */}
        <p className="text-xs text-slate-300/90 leading-relaxed font-normal min-h-[40px]">
          "{item.description}"
        </p>
      </div>

      {/* Footer CTA Button */}
      <div className="pt-4 mt-2 border-t border-[#1C232E] flex items-center justify-between">
        <a
          href={item.directUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full inline-flex items-center justify-between px-3.5 py-2 rounded-xl bg-slate-800/80 hover:bg-indigo-600 text-slate-200 hover:text-white text-xs font-semibold transition-all group/btn"
        >
          <span>{item.ctaText}</span>
          <ExternalLink className="w-3.5 h-3.5 opacity-70 group-hover/btn:opacity-100 group-hover/btn:translate-x-0.5 transition" />
        </a>
      </div>
    </div>
  );
};
