import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  BookOpen,
  ListOrdered,
  BookmarkCheck,
  BarChart3,
  TrendingUp,
  Shield,
  Users2,
  Target,
  Globe,
  Bot,
  Calculator,
  MessageSquare,
  Settings,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  LogOut,
  X,
  Layers,
} from 'lucide-react';
import { useTrading, ActiveView } from '../../context/TradingContext';

interface SidebarProps {
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  isMobileOpen?: boolean;
  setIsMobileOpen?: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isCollapsed,
  setIsCollapsed,
  isMobileOpen = false,
  setIsMobileOpen,
}) => {
  const { activeView, setActiveView, theme, userProfile, authUser, logout } = useTrading();
  const isLight = theme === 'light';
  const [imageError, setImageError] = useState(false);

  const handleNavClick = (viewId: ActiveView) => {
    setActiveView(viewId);
    if (setIsMobileOpen) {
      setIsMobileOpen(false);
    }
  };

  const avatarUrl =
    userProfile?.avatarUrl ||
    userProfile?.avatar ||
    authUser?.user_metadata?.avatar_url ||
    authUser?.user_metadata?.picture ||
    '';

  const accountName =
    userProfile?.name?.trim() ||
    authUser?.user_metadata?.full_name?.trim() ||
    authUser?.user_metadata?.name?.trim() ||
    (authUser as any)?.displayName?.trim() ||
    (authUser?.email ? authUser.email.split('@')[0] : '') ||
    'Trader';

  const userInitials = accountName
    .split(' ')
    .filter(Boolean)
    .map((w: string) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'TR';

  useEffect(() => {
    setImageError(false);
  }, [avatarUrl]);

  // Grouped navigation hierarchy
  const navSections: Array<{
    title: string;
    items: Array<{
      id: ActiveView;
      label: string;
      icon: React.ComponentType<{ className?: string }>;
      badge?: string;
      badgeVariant?: 'accent' | 'emerald' | 'amber';
    }>;
  }> = [
    {
      title: 'Core',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'notebook', label: 'Journal', icon: BookOpen },
        { id: 'trades', label: 'Trades', icon: ListOrdered },
      ],
    },
    {
      title: 'Performance',
      items: [
        { id: 'prop-firm', label: 'Prop Firm Hub', icon: Shield, badge: 'PRO', badgeVariant: 'accent' },
        { id: 'reports', label: 'Reports', icon: BarChart3 },
        { id: 'advanced-analytics', label: 'Analytics', icon: TrendingUp },
      ],
    },
    {
      title: 'Strategy',
      items: [
        { id: 'playbook', label: 'Playbooks', icon: BookmarkCheck },
        { id: 'goals', label: 'Goals', icon: Target },
        { id: 'news', label: 'Market', icon: Globe },
        { id: 'ai-coach', label: 'AI Review Coach', icon: Bot, badge: 'AI', badgeVariant: 'accent' },
      ],
    },
    {
      title: 'Workspace',
      items: [
        { id: 'tools', label: 'Position Sizing', icon: Calculator },
        { id: 'mentor-mode', label: 'Mentor', icon: Users2 },
        { id: 'lounge', label: 'Community', icon: MessageSquare },
      ],
    },
    {
      title: 'System',
      items: [
        { id: 'settings', label: 'Settings', icon: Settings },
        { id: 'help', label: 'Help', icon: HelpCircle },
      ],
    },
  ];

  const renderNavList = (collapsed: boolean, onSelect: (id: ActiveView) => void) => (
    <div className="flex-1 overflow-y-auto px-2.5 py-3 space-y-4 custom-scrollbar">
      {navSections.map((section, idx) => (
        <div key={section.title} className={idx > 0 ? `pt-1 border-t ${isLight ? 'border-slate-200' : 'border-[rgba(255,255,255,0.04)]'}` : ''}>
          {!collapsed && (
            <div className={`px-2.5 pb-1.5 text-xs font-medium text-[#71717A]`}>
              {section.title}
            </div>
          )}
          <nav className="space-y-0.5">
            {section.items.map(item => {
              const Icon = item.icon;
              const isActive = activeView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelect(item.id)}
                  className={`group relative flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13.5px] font-medium transition-all duration-140 cursor-pointer ${
                    isActive
                      ? isLight
                        ? 'bg-slate-100 text-slate-900 border border-slate-200 font-semibold'
                        : 'bg-[#11151A] text-[#F4F5F7] border border-[rgba(99,102,241,0.35)] shadow-xs'
                      : isLight
                      ? 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-transparent'
                      : 'text-[#C2C7D0] hover:bg-[#151A20] hover:text-[#F4F5F7] border border-transparent'
                  } ${collapsed ? 'justify-center px-0' : ''}`}
                  title={collapsed ? item.label : undefined}
                >
                  {isActive && (
                    <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full bg-[#6366F1]" />
                  )}
                  <Icon
                    className={`h-4 w-4 shrink-0 transition-colors duration-140 ${
                      isActive
                        ? isLight ? 'text-blue-600' : 'text-[#818CF8]'
                        : isLight ? 'text-slate-400 group-hover:text-slate-700' : 'text-[#8A919D] group-hover:text-[#F4F5F7]'
                    }`}
                  />
                  {!collapsed && (
                    <span className="truncate flex-1 text-left tracking-normal">{item.label}</span>
                  )}
                  {!collapsed && item.badge && (
                    <span
                      className={`ml-auto text-[11px] font-medium px-2 py-0.5 rounded-full ${
                        item.badgeVariant === 'accent'
                          ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                          : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      ))}
    </div>
  );

  return (
    <>
      {/* 1. Desktop Aside (Hidden on Mobile/Tablet < 1024px) */}
      <aside
        className={`relative hidden lg:flex flex-col h-screen border-r transition-all duration-150 z-30 select-none overflow-hidden shrink-0 ${
          isLight
            ? 'bg-white border-[#E2E8F0] text-slate-900'
            : 'bg-[#030405] border-[rgba(255,255,255,0.055)] text-[#C2C7D0]'
        } ${isCollapsed ? 'w-16' : 'w-60'}`}
      >
        {/* Brand Header */}
        <div
          className={`h-14 flex items-center border-b transition-all duration-140 select-none ${
            isLight ? 'border-[#E2E8F0]' : 'border-[rgba(255,255,255,0.055)]'
          } ${isCollapsed ? 'justify-center px-2' : 'px-4'}`}
        >
          {isCollapsed ? (
            <div className="flex items-center justify-center cursor-pointer" onClick={() => setIsCollapsed(false)} title="TradeForge">
              <img
                src="/tradeforge-symbol.svg"
                alt="TradeForge"
                className="h-7 w-7 object-contain"
              />
            </div>
          ) : (
            <div className="flex items-center justify-between w-full min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <img
                  src={isLight ? '/tradeforge-logo-light.svg' : '/tradeforge-logo.svg'}
                  alt="TradeForge"
                  className="h-6 w-auto max-w-[145px] object-contain shrink-0 select-none"
                />
              </div>
              <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 shrink-0">
                PRO
              </span>
            </div>
          )}
        </div>

        {/* Navigation Body */}
        {renderNavList(isCollapsed, setActiveView)}

        {/* Footer Collapse Toggle & User Badge */}
        <div className={`p-2.5 border-t flex items-center justify-between ${
          isLight ? 'border-[#E2E8F0] bg-slate-50' : 'border-[rgba(255,255,255,0.055)] bg-[#06080B]'
        }`}>
          {!isCollapsed ? (
            <div className="flex items-center justify-between w-full px-1">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="relative">
                  {avatarUrl && !imageError ? (
                    <img
                      src={avatarUrl}
                      alt={accountName}
                      referrerPolicy="no-referrer"
                      onError={() => setImageError(true)}
                      className="w-7 h-7 rounded-lg object-cover ring-1 ring-blue-500/30"
                    />
                  ) : (
                    <div className={`w-7 h-7 rounded-lg font-semibold text-xs flex items-center justify-center ${
                      isLight ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-[#0D1014] text-blue-400 border border-[rgba(255,255,255,0.07)]'
                    }`}>
                      {userInitials}
                    </div>
                  )}
                  <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-[#030405]" />
                </div>
                <div className="flex flex-col min-w-0 text-left">
                  <span className={`text-xs font-medium truncate ${isLight ? 'text-slate-900' : 'text-[#F4F5F7]'}`} title={accountName}>
                    {accountName}
                  </span>
                  <span className="text-xs text-[#9CA3AF] truncate" title={userProfile?.professionalTitle || 'Active Trader'}>
                    {userProfile?.professionalTitle || 'Active Trader'}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-0.5">
                <button
                  onClick={() => logout()}
                  className={`p-1.5 rounded-lg transition cursor-pointer ${
                    isLight
                      ? 'text-slate-500 hover:text-rose-600 hover:bg-rose-50'
                      : 'text-[#8A919D] hover:text-rose-400 hover:bg-rose-500/10'
                  }`}
                  title="Sign Out"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setIsCollapsed(true)}
                  className={`p-1.5 rounded-lg transition cursor-pointer ${
                    isLight
                      ? 'text-slate-500 hover:text-slate-900 hover:bg-slate-200'
                      : 'text-[#8A919D] hover:text-white hover:bg-[#151A20]'
                  }`}
                  title="Collapse Sidebar"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setIsCollapsed(false)}
              className={`w-full flex justify-center p-1.5 rounded-lg transition cursor-pointer ${
                isLight
                  ? 'text-slate-500 hover:text-slate-900 hover:bg-slate-200'
                  : 'text-[#8A919D] hover:text-white hover:bg-[#151A20]'
              }`}
              title="Expand Sidebar"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </aside>

      {/* 2. Mobile Drawer Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-xs z-50 lg:hidden transition-opacity duration-150"
          onClick={() => setIsMobileOpen?.(false)}
          aria-hidden="true"
        />
      )}

      {/* 3. Mobile Slide-Out Drawer Aside (< 1024px) */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] flex flex-col h-screen border-r shadow-2xl transition-transform duration-200 ease-out lg:hidden select-none overflow-hidden ${
          isLight
            ? 'bg-white border-[#E2E8F0] text-slate-900'
            : 'bg-[#030405] border-[rgba(255,255,255,0.055)] text-[#C2C7D0]'
        } ${isMobileOpen ? 'translate-x-0' : '-translate-x-full pointer-events-none'}`}
      >
        {/* Mobile Header with Logo + Close Button */}
        <div
          className={`h-14 flex items-center justify-between px-4 border-b select-none shrink-0 ${
            isLight ? 'border-[#E2E8F0]' : 'border-[rgba(255,255,255,0.055)]'
          }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            <img
              src={isLight ? '/tradeforge-logo-light.svg' : '/tradeforge-logo.svg'}
              alt="TradeForge"
              className="h-6 w-auto max-w-[140px] object-contain shrink-0"
            />
            <span className="text-[9px] font-mono font-semibold tracking-wider px-1.5 py-0.2 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 shrink-0">
              PRO
            </span>
          </div>
          <button
            type="button"
            onClick={() => setIsMobileOpen?.(false)}
            className={`p-1.5 rounded-lg transition cursor-pointer ${
              isLight
                ? 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                : 'text-[#8A919D] hover:text-white hover:bg-[#151A20]'
            }`}
            aria-label="Close Navigation"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mobile Navigation Body */}
        {renderNavList(false, handleNavClick)}

        {/* Mobile Footer with User & Signout */}
        <div className={`p-3 border-t flex items-center justify-between shrink-0 ${
          isLight ? 'border-[#E2E8F0] bg-slate-50' : 'border-[rgba(255,255,255,0.055)] bg-[#06080B]'
        }`}>
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="relative shrink-0">
              {avatarUrl && !imageError ? (
                <img
                  src={avatarUrl}
                  alt={accountName}
                  referrerPolicy="no-referrer"
                  onError={() => setImageError(true)}
                  className="w-8 h-8 rounded-lg object-cover ring-1 ring-blue-500/30"
                />
              ) : (
                <div className={`w-8 h-8 rounded-lg font-semibold text-xs flex items-center justify-center ${
                  isLight ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-[#0D1014] text-blue-400 border border-[rgba(255,255,255,0.07)]'
                }`}>
                  {userInitials}
                </div>
              )}
              <span className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 ring-2 ${isLight ? 'ring-white' : 'ring-[#030405]'}`} />
            </div>
            <div className="flex flex-col min-w-0 text-left">
              <span className={`text-xs font-semibold truncate ${isLight ? 'text-slate-900' : 'text-[#F4F5F7]'}`}>
                {accountName}
              </span>
              <span className="text-[10px] text-[#8A919D] truncate">
                {userProfile?.professionalTitle || 'Active Trader'}
              </span>
            </div>
          </div>
          <button
            onClick={() => {
              logout();
              setIsMobileOpen?.(false);
            }}
            className={`p-1.5 rounded-lg transition cursor-pointer ${
              isLight
                ? 'text-slate-500 hover:text-rose-600 hover:bg-rose-50'
                : 'text-[#8A919D] hover:text-rose-400 hover:bg-rose-500/10'
            }`}
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>
    </>
  );
};
