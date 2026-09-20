import React, { useState, useEffect, useRef } from 'react';
import {
  Menu,
  Bell,
  Search,
  Plus,
  Moon,
  Sun,
  ChevronDown,
  UserCheck,
  Check,
  Shield,
  DollarSign,
  Percent,
  Calendar,
  EyeOff,
  Hash,
  Sparkles,
  Settings,
  LogOut,
  Clock,
  Radio,
} from 'lucide-react';
import { useTrading } from '../../context/TradingContext';
import { CurrencyDisplayMode } from '../../types';
import { DateRangeDropdown, DateRangeState } from './DateRangeDropdown';
import { safeFormatDate } from '../../utils/dateUtils';

interface NavbarProps {
  onToggleMobileSidebar: () => void;
  onOpenNotifications: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onToggleMobileSidebar,
  onOpenNotifications,
}) => {
  const {
    notifications,
    currencyMode,
    setCurrencyMode,
    theme,
    setTheme,
    selectedAccountId,
    setSelectedAccountId,
    accounts,
    propFirmAccounts,
    setSelectedPropFirmAccountId,
    dateRange,
    setDateRange,
    activeStudentImpersonation,
    setActiveStudentImpersonation,
    userProfile,
    authUser,
    logout,
    setActiveView,
    setIsCommandPaletteOpen,
    setIsAddTradeOpen,
  } = useTrading();

  const unreadCount = (notifications || []).filter((n) => !n.read).length;

  const isLight = theme === 'light';

  // Dropdown visibility states
  const [isCurrencyDropdownOpen, setIsCurrencyDropdownOpen] = useState(false);
  const [isAccountDropdownOpen, setIsAccountDropdownOpen] = useState(false);
  const [isDateRangeOpen, setIsDateRangeOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState<string>('');
  const [imageError, setImageError] = useState(false);

  const currencyRef = useRef<HTMLDivElement>(null);
  const accountRef = useRef<HTMLDivElement>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  // Live Clock (Local & UTC)
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        })
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (currencyRef.current && !currencyRef.current.contains(e.target as Node)) {
        setIsCurrencyDropdownOpen(false);
      }
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) {
        setIsAccountDropdownOpen(false);
      }
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentAccount = accounts.find(a => a.id === selectedAccountId);
  const currentPropFirm = propFirmAccounts.find(p => p.id === selectedAccountId);

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

  const userInitials =
    accountName
      .split(' ')
      .filter(Boolean)
      .map((w: string) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'TR';

  useEffect(() => {
    setImageError(false);
  }, [avatarUrl]);

  return (
    <header
      className={`h-14 border-b px-3 sm:px-4 flex items-center justify-between sticky top-0 z-30 select-none transition-colors duration-150 ${
        isLight
          ? 'bg-white/95 backdrop-blur-md border-[#E2E8F0] text-slate-800'
          : 'bg-[#090A0E]/90 backdrop-blur-md border-[rgba(255,255,255,0.07)] text-slate-100'
      }`}
    >
      {/* =========================================================================
          ZONE 1 (LEFT): Market / Application State & Clock
          ========================================================================= */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Mobile Hamburger Toggle */}
        <button
          type="button"
          onClick={onToggleMobileSidebar}
          className={`lg:hidden p-1.5 rounded-lg border transition cursor-pointer ${
            isLight
              ? 'border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-700'
              : 'border-[rgba(255,255,255,0.08)] bg-[#101116] hover:bg-[#15171D] text-slate-300'
          }`}
          aria-label="Open Navigation Menu"
        >
          <Menu className="w-4 h-4" />
        </button>

        {/* Impersonation Banner if Active */}
        {activeStudentImpersonation && (
          <div className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/25 text-amber-400 px-2 py-0.5 rounded-full text-xs font-semibold shrink-0">
            <UserCheck className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Viewing: <strong>{activeStudentImpersonation.name}</strong></span>
            <button
              onClick={() => setActiveStudentImpersonation(null)}
              className="ml-1 text-[10px] bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 px-1.5 py-0.2 rounded transition cursor-pointer"
            >
              Exit
            </button>
          </div>
        )}

        {/* Live Market State & Clock */}
        <div
          className={`flex items-center gap-2 px-2.5 py-1 rounded-lg border text-xs shrink-0 ${
            isLight
              ? 'bg-slate-100/80 border-slate-300/80 text-slate-700 font-medium'
              : 'bg-[#101116] border-[rgba(255,255,255,0.06)] text-slate-300'
          }`}
        >
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
            </span>
            <span className="text-[10px] font-bold tracking-wider uppercase text-emerald-600 dark:text-emerald-400 hidden sm:inline">
              LIVE
            </span>
          </div>
          <span className={`${isLight ? 'text-slate-300' : 'text-slate-600'} hidden sm:inline`}>|</span>
          <div className={`flex items-center gap-1.5 font-mono text-[11px] tabular-nums font-semibold ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
            <Clock className={`w-3.5 h-3.5 ${isLight ? 'text-slate-600' : 'text-slate-400'} hidden md:inline`} />
            <span>{currentTime || '00:00:00'}</span>
          </div>
        </div>
      </div>

      {/* =========================================================================
          ZONE 2 (CENTER): Quick Search / Command Center & Global Filters
          ========================================================================= */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Command Center Quick Search Trigger */}
        <button
          onClick={() => setIsCommandPaletteOpen(true)}
          className={`flex items-center gap-2 rounded-lg border px-2.5 py-1 text-xs transition cursor-pointer ${
            isLight
              ? 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700'
              : 'border-[rgba(255,255,255,0.07)] bg-[#101116] hover:bg-[#15171D] hover:border-[rgba(255,255,255,0.12)] text-slate-400 hover:text-slate-200'
          }`}
          title="Open Command Center (⌘K)"
        >
          <Search className={`h-3.5 w-3.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`} />
          <span className={`hidden md:inline font-normal text-xs ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>Command Search...</span>
          <kbd className={`hidden md:inline-block rounded px-1.5 py-0.2 text-[10px] font-mono font-medium ${
            isLight ? 'bg-slate-200/70 border border-slate-300 text-slate-700' : 'bg-[#181A21] border border-[rgba(255,255,255,0.08)] text-slate-400'
          }`}>
            ⌘K
          </kbd>
        </button>

        {/* Currency Display Mode Filter */}
        <div className="relative" ref={currencyRef}>
          <button
            onClick={() => {
              setIsCurrencyDropdownOpen(!isCurrencyDropdownOpen);
              setIsAccountDropdownOpen(false);
              setIsDateRangeOpen(false);
            }}
            className={`flex items-center gap-1 rounded-lg border px-2 py-1 text-xs font-medium transition cursor-pointer ${
              isLight
                ? 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                : 'border-[rgba(255,255,255,0.07)] bg-[#101116] hover:bg-[#15171D] hover:border-[rgba(255,255,255,0.12)] text-slate-300 hover:text-white'
            }`}
            title="Display Units Mode"
          >
            {currencyMode === 'USD' && <DollarSign className="w-3.5 h-3.5 text-emerald-400" />}
            {currencyMode === 'PERCENT' && <Percent className="w-3.5 h-3.5 text-blue-400" />}
            {currencyMode === 'PRIVACY' && <EyeOff className="w-3.5 h-3.5 text-amber-400" />}
            {currencyMode === 'R_MULTIPLE' && <span className="font-bold text-xs text-indigo-400">R</span>}
            {currencyMode === 'TICKS' && <Hash className="w-3.5 h-3.5 text-emerald-400" />}
            <ChevronDown className="w-3 h-3 text-slate-500" />
          </button>

          {isCurrencyDropdownOpen && (
            <div className={`absolute left-0 sm:right-0 sm:left-auto mt-1.5 w-48 rounded-xl border p-1 shadow-[0_12px_36px_rgba(0,0,0,0.5)] z-50 animate-in fade-in duration-100 ${
              isLight ? 'border-slate-200 bg-white' : 'border-[rgba(255,255,255,0.10)] bg-[#181A21]'
            }`}>
              <div className={`px-2 py-1 text-[10px] font-semibold uppercase tracking-wider border-b ${
                isLight ? 'text-slate-500 border-slate-100' : 'text-slate-500 border-[rgba(255,255,255,0.06)]'
              }`}>
                Display Metrics In
              </div>
              {[
                { id: 'USD', label: 'Dollar ($)', desc: 'Realized currency', icon: DollarSign },
                { id: 'PERCENT', label: 'Percentage (%)', desc: 'Account growth', icon: Percent },
                { id: 'R_MULTIPLE', label: 'R-Multiple (R)', desc: 'Risk unit', icon: Sparkles },
                { id: 'TICKS', label: 'Ticks / Points', desc: 'Price steps', icon: Hash },
                { id: 'PRIVACY', label: 'Privacy Mode', desc: 'Hide amounts', icon: EyeOff },
              ].map(opt => (
                <button
                  key={opt.id}
                  onClick={() => {
                    setCurrencyMode(opt.id as CurrencyDisplayMode);
                    setIsCurrencyDropdownOpen(false);
                  }}
                  className={`flex w-full items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition cursor-pointer ${
                    currencyMode === opt.id
                      ? isLight ? 'bg-blue-50 text-blue-700 font-medium' : 'bg-blue-600/15 text-blue-400 font-medium'
                      : isLight ? 'hover:bg-slate-100 text-slate-700' : 'hover:bg-[#1E222D] text-slate-300 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <opt.icon className={`w-3.5 h-3.5 ${currencyMode === opt.id ? (isLight ? 'text-blue-600' : 'text-blue-400') : 'text-slate-400'}`} />
                    <span>{opt.label}</span>
                  </div>
                  {currencyMode === opt.id && <Check className={`w-3.5 h-3.5 ${isLight ? 'text-blue-600' : 'text-blue-400'}`} />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Global Date Range Filter */}
        <div className="relative">
          <button
            onClick={() => {
              setIsDateRangeOpen(!isDateRangeOpen);
              setIsCurrencyDropdownOpen(false);
              setIsAccountDropdownOpen(false);
            }}
            className={`flex items-center gap-1.5 rounded-lg border px-2 py-1 text-xs font-medium transition cursor-pointer ${
              isLight
                ? 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                : 'border-[rgba(255,255,255,0.07)] bg-[#101116] hover:bg-[#15171D] hover:border-[rgba(255,255,255,0.12)] text-slate-300 hover:text-white'
            }`}
          >
            <Calendar className="w-3.5 h-3.5 text-blue-400" />
            <span className={`hidden sm:inline max-w-[120px] truncate ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
              {dateRange.startDate && dateRange.endDate
                ? `${safeFormatDate(dateRange.startDate, '—', { month: 'short', day: 'numeric' })} - ${safeFormatDate(dateRange.endDate, '—', { month: 'short', day: 'numeric' })}`
                : dateRange.presetLabel || 'Dates'}
            </span>
            <ChevronDown className="w-3 h-3 text-slate-500" />
          </button>

          <DateRangeDropdown
            isOpen={isDateRangeOpen}
            onClose={() => setIsDateRangeOpen(false)}
            selectedRange={dateRange}
            onSelectRange={(newRange: DateRangeState) => {
              setDateRange(newRange);
            }}
          />
        </div>
      </div>

      {/* =========================================================================
          ZONE 3 (RIGHT): Account Switcher, Notifications, Theme & Add Trade CTA
          ========================================================================= */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {/* Account Selector Dropdown */}
        <div className="relative" ref={accountRef}>
          <button
            onClick={() => {
              setIsAccountDropdownOpen(!isAccountDropdownOpen);
              setIsCurrencyDropdownOpen(false);
              setIsDateRangeOpen(false);
            }}
            className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition cursor-pointer ${
              isLight
                ? 'border-slate-200 bg-white hover:bg-slate-50 text-slate-900'
                : 'border-[rgba(255,255,255,0.07)] bg-[#101116] hover:bg-[#15171D] hover:border-[rgba(255,255,255,0.12)] text-slate-200'
            }`}
          >
            <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${currentPropFirm ? 'bg-blue-400' : 'bg-emerald-400'}`} />
            <span className="hidden md:inline max-w-[110px] truncate">
              {selectedAccountId === 'all' ? (
                'All Accounts'
              ) : currentPropFirm ? (
                currentPropFirm.name
              ) : (
                currentAccount?.name || 'Account'
              )}
            </span>
            <ChevronDown className="w-3 h-3 text-slate-500 shrink-0" />
          </button>

          {isAccountDropdownOpen && (
            <div className={`absolute right-0 mt-1.5 w-64 max-h-[75vh] overflow-y-auto custom-scrollbar rounded-xl border p-1 shadow-[0_12px_36px_rgba(0,0,0,0.5)] z-50 animate-in fade-in duration-100 ${
              isLight ? 'border-slate-200 bg-white' : 'border-[rgba(255,255,255,0.10)] bg-[#181A21]'
            }`}>
              <div className={`px-2 py-1 text-[10px] font-semibold uppercase tracking-wider border-b ${
                isLight ? 'text-slate-500 border-slate-100' : 'text-slate-500 border-[rgba(255,255,255,0.06)]'
              }`}>
                Active Trading Portfolio
              </div>
              <button
                onClick={() => {
                  setSelectedAccountId('all');
                  setIsAccountDropdownOpen(false);
                }}
                className={`flex w-full items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition cursor-pointer ${
                  selectedAccountId === 'all'
                    ? isLight ? 'bg-blue-50 text-blue-700 font-medium' : 'bg-blue-600/15 text-blue-400 font-medium'
                    : isLight ? 'hover:bg-slate-100 text-slate-700' : 'hover:bg-[#1E222D] text-slate-300 hover:text-white'
                }`}
              >
                <span className="font-medium">All Accounts Combined</span>
                {selectedAccountId === 'all' && <Check className={`w-3.5 h-3.5 ${isLight ? 'text-blue-600' : 'text-blue-400'}`} />}
              </button>

              {/* Broker Accounts */}
              <div className={`px-2 pt-2 pb-0.5 text-[10px] font-semibold uppercase tracking-wider flex items-center justify-between ${
                isLight ? 'text-slate-500' : 'text-slate-500'
              }`}>
                <span>Broker Accounts</span>
                <span className="font-mono text-[9px]">{accounts.length}</span>
              </div>
              {accounts.map(acc => (
                <button
                  key={acc.id}
                  onClick={() => {
                    setSelectedAccountId(acc.id);
                    setIsAccountDropdownOpen(false);
                  }}
                  className={`flex w-full items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition cursor-pointer ${
                    selectedAccountId === acc.id
                      ? isLight ? 'bg-blue-50 text-blue-700 font-medium' : 'bg-blue-600/15 text-blue-400 font-medium'
                      : isLight ? 'hover:bg-slate-100 text-slate-700' : 'hover:bg-[#1E222D] text-slate-300 hover:text-white'
                  }`}
                >
                  <div className="text-left">
                    <div className={`font-medium ${isLight ? 'text-slate-900' : 'text-slate-200'}`}>{acc.name}</div>
                    <div className={`text-[10px] flex items-center gap-1.5 ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>
                      <span>{acc.broker}</span>
                      <span className="font-mono tabular-nums">${(acc?.currentBalance ?? 0).toLocaleString()}</span>
                    </div>
                  </div>
                  {selectedAccountId === acc.id && <Check className={`w-3.5 h-3.5 ${isLight ? 'text-blue-600' : 'text-blue-400'}`} />}
                </button>
              ))}

              {/* Prop Firm Accounts */}
              {propFirmAccounts.length > 0 && (
                <>
                  <div className={`px-2 pt-2 pb-0.5 text-[10px] font-semibold uppercase tracking-wider flex items-center justify-between border-t mt-1 ${
                    isLight ? 'border-slate-100 text-blue-600' : 'border-[rgba(255,255,255,0.06)] text-blue-400'
                  }`}>
                    <span>Prop Firm Accounts</span>
                    <span className="font-mono text-[9px]">{propFirmAccounts.length}</span>
                  </div>
                  {propFirmAccounts.map(pf => (
                    <button
                      key={pf.id}
                      onClick={() => {
                        setSelectedAccountId(pf.id);
                        setSelectedPropFirmAccountId(pf.id);
                        setIsAccountDropdownOpen(false);
                      }}
                      className={`flex w-full items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition cursor-pointer ${
                        selectedAccountId === pf.id
                          ? isLight ? 'bg-blue-50 text-blue-700 font-medium' : 'bg-blue-600/15 text-blue-400 font-medium'
                          : isLight ? 'hover:bg-slate-100 text-slate-700' : 'hover:bg-[#1E222D] text-slate-300 hover:text-white'
                      }`}
                    >
                      <div className="text-left">
                        <div className={`font-medium ${isLight ? 'text-slate-900' : 'text-slate-200'}`}>{pf.name}</div>
                        <div className={`text-[10px] flex items-center gap-1.5 ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>
                          <span>{pf.firmName}</span>
                          <span className="font-mono tabular-nums">${pf.startingBalance.toLocaleString()}</span>
                        </div>
                      </div>
                      {selectedAccountId === pf.id && <Check className={`w-3.5 h-3.5 ${isLight ? 'text-blue-600' : 'text-blue-400'}`} />}
                    </button>
                  ))}
                </>
              )}
            </div>
          )}
        </div>

        {/* Theme Toggle Button */}
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className={`rounded-lg border p-1.5 transition cursor-pointer ${
            isLight
              ? 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
              : 'border-[rgba(255,255,255,0.07)] bg-[#101116] hover:bg-[#15171D] hover:border-[rgba(255,255,255,0.12)] text-slate-400 hover:text-slate-200'
          }`}
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
        >
          {theme === 'dark' ? (
            <Moon className="w-3.5 h-3.5 text-blue-400" />
          ) : (
            <Sun className="w-3.5 h-3.5 text-amber-500" />
          )}
        </button>

        {/* Notification Center */}
        <button
          onClick={onOpenNotifications}
          className={`relative rounded-lg border p-1.5 transition cursor-pointer ${
            isLight
              ? 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
              : 'border-[rgba(255,255,255,0.07)] bg-[#101116] hover:bg-[#15171D] hover:border-[rgba(255,255,255,0.12)] text-slate-400 hover:text-slate-200'
          }`}
          title="Notifications & Risk Alerts"
        >
          <Bell className="w-3.5 h-3.5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-blue-600 text-[8px] font-bold text-white shadow-xs">
              {unreadCount}
            </span>
          )}
        </button>

        {/* User Profile Avatar */}
        <div className="relative" ref={profileMenuRef}>
          <button
            onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
            className={`flex items-center gap-1.5 rounded-lg p-1 border transition cursor-pointer ${
              isLight
                ? 'hover:bg-slate-100 border-transparent hover:border-slate-200'
                : 'hover:bg-[#15171D] border-transparent hover:border-[rgba(255,255,255,0.07)]'
            }`}
            title={accountName}
          >
            {avatarUrl && !imageError ? (
              <img
                src={avatarUrl}
                alt={accountName}
                referrerPolicy="no-referrer"
                onError={() => setImageError(true)}
                className="w-6 h-6 rounded-md object-cover ring-1 ring-blue-500/30"
              />
            ) : (
              <div className={`w-6 h-6 rounded-md font-semibold text-[11px] flex items-center justify-center ${
                isLight ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-[#181A21] text-blue-400 border border-[rgba(255,255,255,0.08)]'
              }`}>
                {userInitials}
              </div>
            )}
            <ChevronDown className="w-3 h-3 text-slate-500" />
          </button>

          {isProfileMenuOpen && (
            <div className={`absolute right-0 mt-1.5 w-56 rounded-xl border p-1.5 shadow-[0_12px_36px_rgba(0,0,0,0.5)] z-50 animate-in fade-in duration-100 ${
              isLight ? 'border-slate-200 bg-white' : 'border-[rgba(255,255,255,0.10)] bg-[#181A21]'
            }`}>
              <div className={`p-2 rounded-lg mb-1 border ${
                isLight ? 'bg-slate-50 border-slate-200/60' : 'bg-[#12141A] border-[rgba(255,255,255,0.06)]'
              }`}>
                <div className={`text-xs font-semibold truncate ${isLight ? 'text-slate-900' : 'text-white'}`}>{accountName}</div>
                <div className={`text-[10px] truncate font-mono mt-0.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                  {authUser?.email || 'Institutional Desk'}
                </div>
              </div>

              <button
                onClick={() => {
                  setActiveView('settings');
                  setIsProfileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-2 px-2.5 py-1.5 text-xs rounded-lg transition cursor-pointer text-left ${
                  isLight ? 'text-slate-700 hover:bg-slate-100' : 'text-slate-300 hover:text-white hover:bg-[#1E222D]'
                }`}
              >
                <Settings className="w-3.5 h-3.5 text-slate-400" />
                <span>Account Settings</span>
              </button>

              <button
                onClick={() => {
                  setActiveView('mentor-mode');
                  setIsProfileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-2 px-2.5 py-1.5 text-xs rounded-lg transition cursor-pointer text-left ${
                  isLight ? 'text-slate-700 hover:bg-slate-100' : 'text-slate-300 hover:text-white hover:bg-[#1E222D]'
                }`}
              >
                <Shield className="w-3.5 h-3.5 text-slate-400" />
                <span>Mentor Hub</span>
              </button>

              <div className={`my-1 border-t ${isLight ? 'border-slate-100' : 'border-[rgba(255,255,255,0.06)]'}`} />

              <button
                onClick={() => {
                  setIsProfileMenuOpen(false);
                  logout();
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-rose-500 hover:bg-rose-500/10 rounded-lg transition cursor-pointer text-left font-medium"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>

        {/* Primary CTA: Add Trade / New Execution */}
        <button
          onClick={() => setIsAddTradeOpen(true)}
          className="flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 text-xs font-semibold shadow-xs border border-blue-400/30 transition active:scale-[0.98] cursor-pointer shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Add Trade</span>
        </button>
      </div>
    </header>
  );
};
