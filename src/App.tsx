import React, { useState } from 'react';
import { TradingProvider, useTrading } from './context/TradingContext';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { CommandPalette } from './components/layout/CommandPalette';
import { NotificationDrawer } from './components/layout/NotificationDrawer';
import { ToastContainer } from './components/layout/ToastContainer';

import { DashboardView } from './components/dashboard/DashboardView';
import { TradesListView } from './components/trades/TradesListView';
import { DailyJournalNotebook } from './components/journal/DailyJournalNotebook';
import { PlaybookView } from './components/playbook/PlaybookView';
import { PerformanceAnalyticsView } from './components/analytics/PerformanceAnalyticsView';
import { PerformanceReportsView } from './components/reports/PerformanceReportsView';
import { AdvancedAnalyticsView } from './components/analytics/AdvancedAnalyticsView';
import { PropFirmView } from './components/propfirm/PropFirmView';
import { MentorModeView } from './components/mentor/MentorModeView';
import { GoalsRiskView } from './components/goals/GoalsRiskView';
import { EconomicCalendarView } from './components/calendar/EconomicCalendarView';
import { AiTradingCoachView } from './components/ai/AiTradingCoachView';
import { TradingToolsView } from './components/tools/TradingToolsView';
import { TradersLoungeView } from './components/lounge/TradersLoungeView';
import { SettingsSyncView } from './components/settings/SettingsSyncView';

import { AddEditTradeModal } from './components/trades/AddEditTradeModal';
import { TradeDetailDrawer } from './components/trades/TradeDetailDrawer';
import { ImportTradesModal } from './components/trades/ImportTradesModal';
import { AuthModal } from './components/auth/AuthModal';
import { LoginPage } from './components/auth/LoginPage';
import { Trade } from './types';
import { BookOpen, Sparkles, ExternalLink } from 'lucide-react';

const MainLayout: React.FC = () => {
  const {
    theme,
    activeView,
    selectedTrade,
    setSelectedTrade,
    isAddTradeOpen,
    setIsAddTradeOpen,
    isAuthModalOpen,
    setIsAuthModalOpen,
    authUser,
    isAuthenticated,
    isAuthLoading,
    setIsAuthenticated,
  } = useTrading();

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [tradeToEdit, setTradeToEdit] = useState<Trade | null>(null);

  const handleOpenEdit = (trade: Trade) => {
    setTradeToEdit(trade);
    setIsAddTradeOpen(true);
  };

  // While checking Supabase session, show subtle loading state to prevent login flash
  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-[#07090D] flex flex-col items-center justify-center text-center p-6 select-none">
        <div className="w-14 h-14 rounded-2xl bg-[#0D1117] border border-[#1C232E] flex items-center justify-center shadow-2xl mb-4 animate-pulse">
          <div className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 font-black text-sm tracking-wider">
            TF
          </div>
        </div>
        <h2 className="text-sm font-semibold text-slate-200 tracking-wide">Connecting to TradeForge</h2>
        <p className="text-xs text-slate-500 mt-1">Syncing workspace with Supabase...</p>
      </div>
    );
  }

  // If user is not authenticated, show the full-screen TradeForge Login Page
  if (!isAuthenticated && !authUser) {
    return (
      <LoginPage
        onSuccess={() => setIsAuthenticated(true)}
        onContinueAsGuest={() => setIsAuthenticated(true)}
      />
    );
  }

  return (
    <div
      className={`relative flex h-screen w-full overflow-hidden font-sans ${
        theme === 'light'
          ? 'bg-[#F3F5F8] text-slate-900'
          : 'bg-[#08090C] text-slate-100'
      }`}
    >
      {/* Sidebar */}
      <Sidebar
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
        isMobileOpen={isMobileSidebarOpen}
        setIsMobileOpen={setIsMobileSidebarOpen}
      />

      {/* Main Content Workspace Container */}
      <div className="relative z-10 flex flex-1 flex-col overflow-hidden min-w-0">
        {/* Top Header */}
        <Navbar
          onOpenNotifications={() => setIsNotificationsOpen(true)}
          onToggleMobileSidebar={() => setIsMobileSidebarOpen(prev => !prev)}
        />

        {/* Scrollable View Area */}
        <main
          className={`flex-1 min-w-0 ${
            activeView === 'notebook' || activeView === 'journal'
              ? 'p-0 overflow-hidden'
              : 'overflow-y-auto overflow-x-hidden custom-scrollbar p-3 sm:p-5 lg:p-6'
          } ${
            theme === 'light' ? 'bg-[#F3F5F8] text-slate-900' : 'bg-[#08090C] text-slate-100'
          }`}
        >
          {activeView === 'dashboard' && (
            <DashboardView
              onSelectTrade={t => setSelectedTrade(t)}
              onOpenImport={() => setIsImportOpen(true)}
            />
          )}

          {activeView === 'prop-firm' && (
            <PropFirmView />
          )}

          {activeView === 'trades' && (
            <TradesListView
              onOpenAddTrade={() => {
                setTradeToEdit(null);
                setIsAddTradeOpen(true);
              }}
              onOpenImport={() => setIsImportOpen(true)}
            />
          )}

          {(activeView === 'notebook' || activeView === 'journal') && (
            <DailyJournalNotebook />
          )}

          {activeView === 'playbook' && <PlaybookView />}

          {activeView === 'reports' && <PerformanceReportsView />}

          {activeView === 'advanced-analytics' && <AdvancedAnalyticsView />}

          {activeView === 'mentor-mode' && <MentorModeView />}

          {activeView === 'goals' && <GoalsRiskView />}

          {activeView === 'calendar' && <EconomicCalendarView />}

          {activeView === 'news' && <EconomicCalendarView defaultTab="intelligence" />}

          {activeView === 'ai-coach' && <AiTradingCoachView />}

          {activeView === 'tools' && <TradingToolsView />}

          {activeView === 'lounge' && <TradersLoungeView />}

          {(activeView === 'integrations' || activeView === 'settings') && (
            <SettingsSyncView onOpenImport={() => setIsImportOpen(true)} />
          )}

          {activeView === 'help' && (
            <div className="max-w-5xl mx-auto space-y-6">
              <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl border shadow-lg ${
                theme === 'light'
                  ? 'bg-white border-[#E3E7EE] shadow-slate-200/50'
                  : 'bg-[#12161D] border-[#1C232E] shadow-black/30'
              }`}>
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl border shrink-0 ${
                    theme === 'light'
                      ? 'bg-indigo-50 border-indigo-200 text-indigo-600'
                      : 'bg-gradient-to-br from-blue-600/20 to-purple-600/20 border-blue-500/30 text-blue-400'
                  }`}>
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div>
                    <h1 className={`text-xl sm:text-2xl font-bold tracking-tight ${
                      theme === 'light' ? 'text-slate-900' : 'text-white'
                    }`}>
                      TradeForge Institutional Platform Guide
                    </h1>
                    <p className={`text-xs mt-0.5 ${
                      theme === 'light' ? 'text-slate-500' : 'text-slate-400'
                    }`}>
                      Operational manual for execution protocol, prop firm risk management, and analytics
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className={`p-5 rounded-2xl border transition-all space-y-2.5 shadow-sm ${
                  theme === 'light'
                    ? 'bg-white border-[#E3E7EE] hover:border-[#D9DEE7]'
                    : 'bg-[#12161D] border-[#1C232E] hover:border-[#2A3444]'
                }`}>
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs font-bold flex items-center justify-center font-mono">
                      1
                    </span>
                    <h3 className={`text-sm font-bold ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
                      Daily Journaling & Execution Protocol
                    </h3>
                  </div>
                  <p className={`text-xs leading-relaxed ${theme === 'light' ? 'text-slate-600' : 'text-slate-400'}`}>
                    Start each session in the Daily Journal with the pre-market checklist. Mark HTF levels and define max risk before clicking order submission.
                  </p>
                </div>

                <div className={`p-5 rounded-2xl border transition-all space-y-2.5 shadow-sm ${
                  theme === 'light'
                    ? 'bg-white border-[#E3E7EE] hover:border-[#D9DEE7]'
                    : 'bg-[#12161D] border-[#1C232E] hover:border-[#2A3444]'
                }`}>
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold flex items-center justify-center font-mono">
                      2
                    </span>
                    <h3 className={`text-sm font-bold ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
                      Prop Firm Rule Compliance & Edge
                    </h3>
                  </div>
                  <p className={`text-xs leading-relaxed ${theme === 'light' ? 'text-slate-600' : 'text-slate-400'}`}>
                    Track multi-account evaluation limits, trailing drawdowns (EOD & Intraday HWM), daily loss buffers, and profit targets with real-time pre-trade simulations.
                  </p>
                </div>

                <div className={`p-5 rounded-2xl border transition-all space-y-2.5 shadow-sm ${
                  theme === 'light'
                    ? 'bg-white border-[#E3E7EE] hover:border-[#D9DEE7]'
                    : 'bg-[#12161D] border-[#1C232E] hover:border-[#2A3444]'
                }`}>
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20 text-xs font-bold flex items-center justify-center font-mono">
                      3
                    </span>
                    <h3 className={`text-sm font-bold ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
                      Circuit Breaker & Safety Locks
                    </h3>
                  </div>
                  <p className={`text-xs leading-relaxed ${theme === 'light' ? 'text-slate-600' : 'text-slate-400'}`}>
                    Hard daily loss caps automatically trigger emergency locks to prevent revenge trading spirals and account breaches.
                  </p>
                </div>

                <div className={`p-5 rounded-2xl border transition-all space-y-2.5 shadow-sm ${
                  theme === 'light'
                    ? 'bg-white border-[#E3E7EE] hover:border-[#D9DEE7]'
                    : 'bg-[#12161D] border-[#1C232E] hover:border-[#2A3444]'
                }`}>
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20 text-xs font-bold flex items-center justify-center font-mono">
                      4
                    </span>
                    <h3 className={`text-sm font-bold ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
                      TradeForge AI Intelligence
                    </h3>
                  </div>
                  <p className={`text-xs leading-relaxed ${theme === 'light' ? 'text-slate-600' : 'text-slate-400'}`}>
                    Get institutional-grade trade critique, psychological leak diagnosis, and actionable tactical next steps.
                  </p>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Global Modals, Drawers & Overlays */}
      <AddEditTradeModal
        isOpen={isAddTradeOpen}
        onClose={() => {
          setIsAddTradeOpen(false);
          setTradeToEdit(null);
        }}
        tradeToEdit={tradeToEdit}
      />

      <TradeDetailDrawer
        trade={selectedTrade}
        onClose={() => setSelectedTrade(null)}
        onOpenEdit={handleOpenEdit}
      />

      <ImportTradesModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
      />

      <NotificationDrawer
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />

      <CommandPalette />
      <ToastContainer />
    </div>
  );
};

export function App() {
  return (
    <TradingProvider>
      <MainLayout />
    </TradingProvider>
  );
}

export default App;
