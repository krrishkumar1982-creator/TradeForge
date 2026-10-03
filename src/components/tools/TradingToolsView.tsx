import React, { useState, useMemo } from 'react';
import {
  Calculator,
  ShieldAlert,
  TrendingUp,
  Compass,
  Coins,
  Search,
  BookOpen,
  CheckSquare,
  FileText,
  Percent,
  TrendingDown,
  Layers,
  X,
  Sparkles,
  ArrowRight
} from 'lucide-react';

// Import newly created modular calculators
import { PositionSizeCalc } from './calculators/PositionSizeCalc';
import { DrawdownRecoveryCalc } from './calculators/DrawdownRecoveryCalc';
import { MonteCarloCalc } from './calculators/MonteCarloCalc';
import { KellyCriterionCalc } from './calculators/KellyCriterionCalc';
import { FuturesCalc } from './calculators/FuturesCalc';
import { FuturesMarginCalc } from './calculators/FuturesMarginCalc';
import { FibonacciCalc } from './calculators/FibonacciCalc';
import { OptionProfitCalc } from './calculators/OptionProfitCalc';
import { PropFirmRoiCalc } from './calculators/PropFirmRoiCalc';
import { RiskRewardCalc } from './calculators/RiskRewardCalc';
import { StockProfitCalc } from './calculators/StockProfitCalc';
import { CompoundGrowthCalc } from './calculators/CompoundGrowthCalc';
import { TradingJournalTemplateCalc } from './calculators/TradingJournalTemplateCalc';
import { TradingChecklistCalc } from './calculators/TradingChecklistCalc';
import { TradingPlanTemplateCalc } from './calculators/TradingPlanTemplateCalc';

type ToolCategory = 
  | 'ALL' 
  | 'RISK' 
  | 'FUTURES' 
  | 'TECHNICAL' 
  | 'PROP' 
  | 'ANALYSIS' 
  | 'OPTIONS' 
  | 'RESOURCES';

interface ToolItem {
  id: string;
  name: string;
  description: string;
  category: ToolCategory;
  categoryLabel: string;
  badge?: 'Popular' | 'New' | 'Standard';
  icon: React.ReactNode;
}

export const TradingToolsView: React.FC = () => {
  // Navigation & Search State
  const [activeCategory, setActiveCategory] = useState<ToolCategory>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Active modal state
  const [activeToolId, setActiveToolId] = useState<string | null>(null);

  // Categories metadata
  const categoriesList = [
    { id: 'ALL', label: 'All Tools' },
    { id: 'RISK', label: 'Risk Management' },
    { id: 'FUTURES', label: 'Futures' },
    { id: 'TECHNICAL', label: 'Technical' },
    { id: 'PROP', label: 'Prop Firm' },
    { id: 'ANALYSIS', label: 'Trade Analysis' },
    { id: 'OPTIONS', label: 'Options' },
    { id: 'RESOURCES', label: 'Resources' }
  ] as const;

  // The 15 master tools metadata
  const tools: ToolItem[] = [
    {
      id: 'position-size',
      name: 'Position Size Calculator',
      description: 'Precision risk modeling and contract sizing across Futures, Forex, Stocks, and Cryptocurrencies.',
      category: 'RISK',
      categoryLabel: 'Risk Management',
      badge: 'Popular',
      icon: <ShieldAlert className="w-5 h-5 text-indigo-400" />
    },
    {
      id: 'drawdown-recovery',
      name: 'Drawdown Recovery Calculator',
      description: 'Simulate required recovery gains, break-even symmetries, and mathematical trade counts needed to recover capital peaks.',
      category: 'RISK',
      categoryLabel: 'Risk Management',
      badge: 'Popular',
      icon: <TrendingDown className="w-5 h-5 text-rose-400" />
    },
    {
      id: 'monte-carlo',
      name: 'Monte Carlo Simulator',
      description: 'Generate randomized equity path projections to evaluate probability of ruin, drawdown thresholds, and statistical win expectation.',
      category: 'RISK',
      categoryLabel: 'Risk Management',
      badge: 'New',
      icon: <TrendingUp className="w-5 h-5 text-emerald-400" />
    },
    {
      id: 'kelly-criterion',
      name: 'Kelly Criterion Calculator',
      description: 'Calculate mathematically optimal risk sizing fractions per trade based on historical win-rates and reward-to-risk R-multiples.',
      category: 'RISK',
      categoryLabel: 'Risk Management',
      icon: <Compass className="w-5 h-5 text-indigo-400" />
    },
    {
      id: 'futures-calc',
      name: 'Futures Profit Calculator',
      description: 'Calculate points, ticks captured, contract values, roundtrip commissions, and net dollar returns for index and commodity contracts.',
      category: 'FUTURES',
      categoryLabel: 'Futures',
      badge: 'New',
      icon: <Coins className="w-5 h-5 text-indigo-400" />
    },
    {
      id: 'futures-margin',
      name: 'Futures Margin Calculator',
      description: 'Check Initial, Maintenance, and Intraday day trading margin limits against account cash cushion boundaries.',
      category: 'FUTURES',
      categoryLabel: 'Futures',
      icon: <Layers className="w-5 h-5 text-slate-400" />
    },
    {
      id: 'fibonacci',
      name: 'Fibonacci Level Calculator',
      description: 'Calculate and map uptrend support retracements and downtrend resistance extensions using high and low swing values.',
      category: 'TECHNICAL',
      categoryLabel: 'Technical Analysis',
      icon: <Calculator className="w-5 h-5 text-slate-400" />
    },
    {
      id: 'options-profit',
      name: 'Option Profit Calculator',
      description: 'Model option payoffs, breakeven thresholds, maximum risk caps, and dynamic expiration profit curves for calls and puts.',
      category: 'OPTIONS',
      categoryLabel: 'Options Sizing',
      badge: 'New',
      icon: <Percent className="w-5 h-5 text-indigo-400" />
    },
    {
      id: 'prop-firm-roi',
      name: 'Prop Firm ROI Calculator',
      description: 'Compare capital purchase leverage ratios, evaluation fee payouts, splits, and ROI performance against trading raw personal capital.',
      category: 'PROP',
      categoryLabel: 'Prop Firm Sizing',
      icon: <Sparkles className="w-5 h-5 text-indigo-400" />
    },
    {
      id: 'risk-reward',
      name: 'Risk/Reward Calculator',
      description: 'Plot scaling target distributions, blended take-profit levels, risk limits, and mathematical breakeven win rate boundaries.',
      category: 'ANALYSIS',
      categoryLabel: 'Trade Analysis',
      badge: 'New',
      icon: <TrendingUp className="w-5 h-5 text-emerald-400" />
    },
    {
      id: 'stock-profit',
      name: 'Stock Profit Calculator',
      description: 'Evaluate stock purchase returns inclusive of entry/exit commissions, exchange SEC taxes, and margin leverage limits.',
      category: 'ANALYSIS',
      categoryLabel: 'Trade Analysis',
      badge: 'New',
      icon: <Coins className="w-5 h-5 text-indigo-400" />
    },
    {
      id: 'compound-growth',
      name: 'Compound Growth Calculator',
      description: 'Calculate compounded interest growth, principal additions, and generate multi-year projection charts.',
      category: 'ANALYSIS',
      categoryLabel: 'Trade Analysis',
      icon: <TrendingUp className="w-5 h-5 text-indigo-400" />
    },
    {
      id: 'trading-journal',
      name: 'Trading Journal Template',
      description: 'Log custom trade records, setup compliance ratings, emotional notes, and sync entries directly with the central database.',
      category: 'RESOURCES',
      categoryLabel: 'Templates & Resources',
      badge: 'New',
      icon: <BookOpen className="w-5 h-5 text-indigo-400" />
    },
    {
      id: 'trading-checklist',
      name: 'Trading Checklist',
      description: 'Interactive pre-market checklist. Toggle, add, and check off setup confluences before committing real capital.',
      category: 'RESOURCES',
      categoryLabel: 'Templates & Resources',
      badge: 'New',
      icon: <CheckSquare className="w-5 h-5 text-emerald-400" />
    },
    {
      id: 'trading-plan',
      name: 'Trading Plan Template',
      description: 'Draft customized risk management bounds, styling structures, setups, and export to markdown.',
      category: 'RESOURCES',
      categoryLabel: 'Templates & Resources',
      badge: 'New',
      icon: <FileText className="w-5 h-5 text-indigo-400" />
    }
  ];

  // Filtering Logic
  const filteredTools = useMemo(() => {
    return tools.filter(tool => {
      const matchesCategory = activeCategory === 'ALL' || tool.category === activeCategory;
      const matchesSearch = tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            tool.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            tool.categoryLabel.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, searchQuery]);

  // Modal rendering selector
  const renderActiveCalculator = () => {
    switch (activeToolId) {
      case 'position-size':
        return <PositionSizeCalc onClose={() => setActiveToolId(null)} />;
      case 'drawdown-recovery':
        return <DrawdownRecoveryCalc onClose={() => setActiveToolId(null)} />;
      case 'monte-carlo':
        return <MonteCarloCalc onClose={() => setActiveToolId(null)} />;
      case 'kelly-criterion':
        return <KellyCriterionCalc onClose={() => setActiveToolId(null)} />;
      case 'futures-calc':
        return <FuturesCalc onClose={() => setActiveToolId(null)} />;
      case 'futures-margin':
        return <FuturesMarginCalc onClose={() => setActiveToolId(null)} />;
      case 'fibonacci':
        return <FibonacciCalc onClose={() => setActiveToolId(null)} />;
      case 'options-profit':
        return <OptionProfitCalc onClose={() => setActiveToolId(null)} />;
      case 'prop-firm-roi':
        return <PropFirmRoiCalc onClose={() => setActiveToolId(null)} />;
      case 'risk-reward':
        return <RiskRewardCalc onClose={() => setActiveToolId(null)} />;
      case 'stock-profit':
        return <StockProfitCalc onClose={() => setActiveToolId(null)} />;
      case 'compound-growth':
        return <CompoundGrowthCalc onClose={() => setActiveToolId(null)} />;
      case 'trading-journal':
        return <TradingJournalTemplateCalc onClose={() => setActiveToolId(null)} />;
      case 'trading-checklist':
        return <TradingChecklistCalc onClose={() => setActiveToolId(null)} />;
      case 'trading-plan':
        return <TradingPlanTemplateCalc onClose={() => setActiveToolId(null)} />;
      default:
        return null;
    }
  };

  // Find metadata for the active tool inside modal
  const activeToolMetadata = tools.find(t => t.id === activeToolId);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="pb-4 border-b border-[rgba(255,255,255,0.06)]">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#F4F5F7] flex items-center gap-2">
          <Calculator className="w-6 h-6 text-[#818CF8]" />
          Position Sizing & Analytics
        </h1>
        <p className="text-xs text-[#8A919D] mt-1 leading-relaxed">
          Institutional calculators for position sizing, risk mitigation, and mathematical modeling.
        </p>
      </div>

      {/* Search & Navigation Bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-[#0D1014] p-4 rounded-2xl border border-[rgba(255,255,255,0.055)]">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-[#5E6570]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search calculators... (e.g. position, kelly)"
            className="w-full rounded-xl bg-[#080A0D] border border-[rgba(255,255,255,0.08)] p-2.5 pl-10 text-xs text-[#F4F5F7] placeholder-[#5E6570] focus:outline-none focus:border-[#6366F1]"
          />
        </div>

        {/* Dynamic tool count */}
        <div className="text-xs font-medium text-[#8A919D] font-mono">
          {filteredTools.length} {filteredTools.length === 1 ? 'tool' : 'tools'} available
        </div>
      </div>

      {/* Categories Pills Bar */}
      <div className="flex flex-wrap gap-2.5">
        {categoriesList.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition cursor-pointer border ${
              activeCategory === cat.id
                ? 'bg-[#11151A] text-[#F4F5F7] border-[rgba(99,102,241,0.35)] shadow-xs'
                : 'bg-[#080A0D] border-[rgba(255,255,255,0.06)] text-[#8A919D] hover:text-[#F4F5F7] hover:border-[rgba(255,255,255,0.12)] hover:bg-[#151A20]'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Tools Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTools.map((tool) => (
          <div
            key={tool.id}
            onClick={() => setActiveToolId(tool.id)}
            className="group rounded-2xl border border-[rgba(255,255,255,0.055)] bg-[#0D1014] p-5 shadow-xs hover:border-[rgba(99,102,241,0.35)] hover:bg-[#11151A] transition-all duration-200 cursor-pointer flex flex-col justify-between space-y-4"
          >
            <div className="space-y-3">
              {/* Top info and badge */}
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-semibold uppercase tracking-wider text-[#5E6570]">
                  {tool.categoryLabel}
                </span>
                {tool.badge && (
                  <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded ${
                    tool.badge === 'Popular' 
                      ? 'bg-[#6366F1]/10 text-[#818CF8] border border-[#6366F1]/20' 
                      : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  }`}>
                    ★ {tool.badge}
                  </span>
                )}
              </div>

              {/* Title & icon */}
              <div className="flex items-start gap-3">
                <div className="p-2 bg-[#080A0D] rounded-xl border border-[rgba(255,255,255,0.06)] group-hover:border-[#6366F1]/30 transition-colors">
                  {tool.icon}
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[#F4F5F7] group-hover:text-[#818CF8] transition-colors leading-snug">
                    {tool.name}
                  </h3>
                </div>
              </div>

              {/* Description */}
              <p className="text-xs text-[#8A919D] leading-relaxed">
                {tool.description}
              </p>
            </div>

            {/* Action footer */}
            <div className="pt-2 flex items-center justify-between text-xs text-[#818CF8] group-hover:text-[#A5B4FC] font-medium">
              <span>Open Tool</span>
              <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1.5 transition-transform" />
            </div>
          </div>
        ))}
      </div>

      {/* Main Tool Modal Overlay */}
      {activeToolId && activeToolMetadata && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            onClick={() => setActiveToolId(null)}
            className="absolute inset-0 bg-black/80 backdrop-blur-xs"
          />

          {/* Modal Container */}
          <div className="relative bg-[#0B0E12] border border-[rgba(255,255,255,0.08)] rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
            {/* Header */}
            <div className="p-5 border-b border-[rgba(255,255,255,0.06)] flex items-center justify-between bg-[#06080B]">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-[#080A0D] rounded-xl border border-[rgba(255,255,255,0.06)] text-[#818CF8]">
                  {activeToolMetadata.icon}
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-[#F4F5F7]">{activeToolMetadata.name}</h2>
                  <p className="text-[10px] text-[#8A919D] mt-0.5">{activeToolMetadata.description}</p>
                </div>
              </div>

              <button
                onClick={() => setActiveToolId(null)}
                className="p-1.5 rounded-lg text-[#8A919D] hover:text-[#F4F5F7] hover:bg-[#151A20] transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
              {renderActiveCalculator()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
