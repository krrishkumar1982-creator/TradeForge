import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef, ReactNode } from 'react';
import confetti from 'canvas-confetti';
import {
  Trade,
  TradingAccount,
  Playbook,
  Strategy,
  JournalNote,
  JournalFolder,
  EconomicEvent,
  CommunityPost,
  MentorStudent,
  MentorConnectionRequest,
  UserProfile,
  AppNotification,
  RiskGoalSettings,
  CurrencyDisplayMode,
  PropFirmAccount,
  PropFirmViolation,
  PropFirmPayoutRecord,
  TradingAccountConnection,
  UserSettings,
  CustomTag,
  ImportHistoryItem,
  ActivityLogItem,
  UserBackup,
} from '../types';
import { calculatePlaybookMetrics } from '../lib/metrics';
import { createDefaultUserSettings, DEFAULT_TAGS_FALLBACK } from '../utils/defaultSettings';
import {
  INITIAL_ACCOUNTS,
  INITIAL_PLAYBOOKS,
  INITIAL_STRATEGIES,
  INITIAL_TRADES,
  INITIAL_FOLDERS,
  INITIAL_NOTES,
  INITIAL_ECONOMIC_EVENTS,
  INITIAL_RISK_GOALS,
  INITIAL_NOTIFICATIONS,
  INITIAL_MENTOR_STUDENTS,
  INITIAL_COMMUNITY_POSTS,
  INITIAL_PROP_FIRM_ACCOUNTS,
} from '../data/mockData';
import {
  fetchInitialState,
  setApiAuthToken,
  saveAccountApi,
  deleteAccountApi,
  saveTradeApi,
  deleteTradeApi,
  bulkDeleteTradesApi,
  bulkEditTradesApi,
  savePlaybookApi,
  deletePlaybookApi,
  saveStrategyApi,
  saveNoteApi,
  deleteNoteApi,
  softDeleteNoteApi,
  restoreNoteApi,
  permanentDeleteNoteApi,
  saveFolderApi,
  deleteFolderApi,
  softDeleteFolderApi,
  restoreFolderApi,
  permanentDeleteFolderApi,
  purgeExpiredTrashApi,
  saveRiskGoalsApi,
  fetchRiskGoalsApi,
  unlockRiskAccountApi,
  saveNotificationApi,
  fetchCommunityPostsApi,
  saveCommunityPostApi,
  editCommunityPostApi,
  deleteCommunityPostApi,
  toggleLikePostApi,
  fetchPostCommentsApi,
  addPostCommentApi,
  deletePostCommentApi,
  saveMentorStudentApi,
  deleteMentorStudentApi,
  fetchDirectivesApi,
  createDirectiveApi,
  acknowledgeDirectiveApi,
  fetchLeaderboardApi,
  updateUserPointsAdminApi,
  updateUserRoleAdminApi,
  fetchUserProfileApi,
  updateUserProfileApi,
  savePropFirmAccountApi,
  deletePropFirmAccountApi,
  getUserSettingsApi,
  saveUserSettingsApi,
  getCustomTagsApi,
  saveCustomTagApi,
  deleteCustomTagApi,
  getImportHistoryApi,
  recordImportHistoryApi,
  getActivityLogsApi,
  recordActivityLogApi,
  getUserBackupsApi,
  createUserBackupApi,
  deleteUserBackupApi,
  executeDataResetApi,
} from '../services/apiClient';
import { formatTimezoneDate, formatTimezoneTime, formatTradeTimestamp as utilsFormatTradeTimestamp } from '../utils/dateUtils';
import { io } from 'socket.io-client';
import { onAuthStateChange, signOutUser, getSession, getUser, handleAuthRedirect, resendVerificationEmail } from '../services/supabaseAuth';
import { User, Session } from '@supabase/supabase-js';
import { SupabaseStorageService } from '../services/supabaseStorage.ts';

export type ActiveView = 
  | 'dashboard'
  | 'trades'
  | 'journal'
  | 'notebook'
  | 'playbook'
  | 'reports'
  | 'advanced-analytics'
  | 'prop-firm'
  | 'mentor-mode'
  | 'goals'
  | 'calendar'
  | 'news'
  | 'ai-coach'
  | 'tools'
  | 'lounge'
  | 'integrations'
  | 'settings'
  | 'help';

interface Toast {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
}

interface TradingContextType {
  // Navigation & View
  activeView: ActiveView;
  setActiveView: (view: ActiveView) => void;
  currencyMode: CurrencyDisplayMode;
  setCurrencyMode: (mode: CurrencyDisplayMode) => void;
  theme: 'dark' | 'light';
  setTheme: (t: 'dark' | 'light') => void;
  
  // Accounts
  accounts: TradingAccount[];
  selectedAccountId: string; // 'all' or accountId
  setSelectedAccountId: (id: string) => void;
  addAccount: (account: Omit<TradingAccount, 'id'>) => void;
  updateAccount: (account: TradingAccount) => void;
  deleteAccount: (id: string) => void;

  // Auto-Sync Trading Account Connections
  connections: TradingAccountConnection[];
  setConnections: React.Dispatch<React.SetStateAction<TradingAccountConnection[]>>;
  refreshState: () => Promise<void>;

  // Prop Firm Accounts & Rule Engine
  propFirmAccounts: PropFirmAccount[];
  selectedPropFirmAccountId: string;
  setSelectedPropFirmAccountId: (id: string) => void;
  addPropFirmAccount: (account: Omit<PropFirmAccount, 'id' | 'createdAt'> | PropFirmAccount) => void;
  updatePropFirmAccount: (account: PropFirmAccount) => void;
  deletePropFirmAccount: (id: string) => void;
  addPropFirmViolation: (accountId: string, violation: Omit<PropFirmViolation, 'id' | 'timestamp'>) => void;
  recordPropFirmPayout: (accountId: string, payout: Omit<PropFirmPayoutRecord, 'id'>) => void;
  
  // Trades
  trades: Trade[];
  filteredTrades: Trade[];
  addTrade: (trade: Omit<Trade, 'id'>) => void;
  updateTrade: (trade: Trade) => void;
  deleteTrade: (id: string) => void;
  duplicateTrade: (id: string) => void;
  bulkDeleteTrades: (ids: string[]) => void;
  bulkEditTrades: (ids: string[], updates: Partial<Trade>) => void;
  importTrades: (newTrades: Array<Omit<Trade, 'id'>>) => void;
  undoLastDelete: () => void;
  canUndo: boolean;
  
  // Trade Selection & Filters
  selectedTrade: Trade | null;
  setSelectedTrade: (trade: Trade | null) => void;
  isAddTradeOpen: boolean;
  setIsAddTradeOpen: (open: boolean) => void;
  isCommandPaletteOpen: boolean;
  setIsCommandPaletteOpen: (open: boolean) => void;
  dateRange: { startDate: string | null; endDate: string | null; presetLabel: string };
  setDateRange: (range: { startDate: string | null; endDate: string | null; presetLabel: string }) => void;
  
  // Playbooks & Strategies
  playbooks: Playbook[];
  addPlaybook: (pb: Omit<Playbook, 'id'>) => void;
  updatePlaybook: (pb: Playbook) => void;
  deletePlaybook: (id: string) => void;
  duplicatePlaybook: (id: string) => void;
  archivePlaybook: (id: string, newStatus?: 'Active' | 'Paused' | 'Archived') => void;
  strategies: Strategy[];
  addStrategy: (strat: Omit<Strategy, 'id'>) => void;
  
  // Journal & Notes
  notes: JournalNote[];
  folders: JournalFolder[];
  selectedNote: JournalNote | null;
  setSelectedNote: (note: JournalNote | null) => void;
  selectedFolderId: string;
  setSelectedFolderId: (id: string) => void;
  addNote: (note: Omit<JournalNote, 'id'>) => Promise<JournalNote | null>;
  updateNote: (note: JournalNote, options?: { silent?: boolean }) => Promise<boolean>;
  deleteNote: (id: string) => Promise<boolean>;
  softDeleteNote: (id: string) => Promise<boolean>;
  restoreNote: (id: string, originalFolderId?: string) => Promise<boolean>;
  permanentDeleteNote: (id: string) => Promise<boolean>;
  addFolder: (name: string, icon?: string) => Promise<JournalFolder | null>;
  updateFolder: (id: string, name: string, icon?: string) => Promise<boolean>;
  deleteFolder: (id: string) => Promise<boolean>;
  softDeleteFolder: (id: string) => Promise<boolean>;
  restoreFolder: (id: string) => Promise<boolean>;
  permanentDeleteFolder: (id: string) => Promise<boolean>;
  emptyTrash: () => Promise<void>;
  purgeExpiredTrash: () => Promise<void>;
  
  // Risk & Goals
  riskGoals: RiskGoalSettings;
  accountRiskProfiles: Record<string, RiskGoalSettings>;
  updateRiskGoals: (goals: Partial<RiskGoalSettings>, accountId?: string) => Promise<void>;
  getAccountRiskGoals: (accountId?: string) => RiskGoalSettings;
  unlockRiskAccount: (accountId: string, unlockReason: string, unlockedBy?: string) => Promise<boolean>;
  
  // Economic Calendar
  calendarEvents: EconomicEvent[];
  toggleEventFavorite: (id: string) => void;
  toggleEventReminder: (id: string) => void;
  
  // Notifications
  notifications: AppNotification[];
  markNotificationRead: (id: string) => void;
  clearAllNotifications: () => void;
  
  // User Profile & Unique Account Code
  userProfile: UserProfile;
  updateUserProfile: (profile: Partial<UserProfile>) => void;
  regenerateAccountCode: () => string;

  // Mentor & Student Connections
  mentorStudents: MentorStudent[];
  mentorRequests: MentorConnectionRequest[];
  activeStudentImpersonation: MentorStudent | null;
  setActiveStudentImpersonation: (st: MentorStudent | null) => void;
  connectStudentByCode: (code: string) => boolean;
  approveMentorRequest: (requestId: string) => void;
  declineMentorRequest: (requestId: string) => void;
  disconnectStudent: (studentId: string) => void;
  mentorDirectivesSent: any[];
  mentorDirectivesReceived: any[];
  dispatchMentorDirective: (studentCode: string, content: string, type?: string) => Promise<void>;
  acknowledgeMentorDirective: (id: string) => Promise<void>;
  
  // Community Lounge
  communityPosts: CommunityPost[];
  currentUserId: string;
  toggleLikePost: (id: string) => Promise<void>;
  addCommunityPost: (content: string, symbol?: string, pnl?: string, rMultiple?: string, imageUrl?: string) => Promise<void>;
  deleteCommunityPost: (id: string) => Promise<void>;
  addPostComment: (postId: string, content: string) => Promise<void>;
  deletePostComment: (postId: string, commentId: string) => Promise<void>;
  leaderboard: any[];
  fetchLeaderboard: () => Promise<void>;
  updateUserPointsAdmin: (userId: string, points: number, reason?: string) => Promise<void>;
  updateUserRoleAdmin: (userId: string, role: string, reason?: string) => Promise<void>;
  
  // Toasts
  toasts: Toast[];
  addToast: (title: string, message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
  removeToast: (id: string) => void;
  
  // Formatters
  formatCurrency: (value: number, customMode?: CurrencyDisplayMode) => string;
  formatRMultiple: (r: number) => string;
  currentTimezone: string;
  formatDate: (date: string | number | Date | null | undefined, options?: Intl.DateTimeFormatOptions) => string;
  formatTime: (date: string | number | Date | null | undefined, options?: Intl.DateTimeFormatOptions) => string;
  formatTradeTimestamp: (date: string | number | Date | null | undefined) => { date: string; time: string; full: string };
  
  // Quick Actions & Data Reset
  resetToSampleData: () => void;
  clearAllTradesData: () => void;

  // Real Authentication
  authUser: User | null;
  isAuthenticated: boolean;
  setIsAuthenticated: (auth: boolean) => void;
  isAuthLoading: boolean;
  isSyncingData: boolean;
  refreshInitialState: () => Promise<void>;
  resendEmailVerification: (email: string) => Promise<{ success: boolean; message: string }>;
  isAuthModalOpen: boolean;
  setIsAuthModalOpen: (open: boolean) => void;
  logout: () => Promise<void>;

  // Institutional Settings Center
  userSettings: UserSettings;
  updateUserSettings: (newSettings: Partial<UserSettings> | ((prev: UserSettings) => UserSettings)) => Promise<void>;
  saveUserSettingsToServer: (settingsToSave?: UserSettings, accountId?: string) => Promise<UserSettings>;
  customTags: CustomTag[];
  addCustomTag: (tag: Omit<CustomTag, 'id' | 'createdAt'>) => Promise<CustomTag>;
  updateCustomTag: (tag: CustomTag) => Promise<CustomTag>;
  deleteCustomTag: (id: string) => Promise<void>;
  importHistory: ImportHistoryItem[];
  addImportHistoryRecord: (item: ImportHistoryItem) => Promise<void>;
  activityLogs: ActivityLogItem[];
  addActivityLog: (item: Omit<ActivityLogItem, 'id' | 'createdAt'>) => Promise<void>;
  userBackups: UserBackup[];
  createBackup: (name?: string, backupData?: any) => Promise<UserBackup>;
  deleteBackup: (id: string) => Promise<void>;
  restoreBackup: (backup: UserBackup) => Promise<void>;
  executeDataReset: (resetType: 'wipeAll' | 'trades' | 'journal' | 'settings', confirmationPhrase: string) => Promise<void>;
}

const TradingContext = createContext<TradingContextType | undefined>(undefined);

const getViewFromUrl = (): ActiveView => {
  try {
    const path = window.location.pathname.toLowerCase();
    const hash = window.location.hash.toLowerCase();
    
    if (path.includes('/analytics/performance') || hash.includes('analytics/performance') || hash.includes('reports')) {
      return 'reports';
    }
    if (path.includes('/analytics/advanced') || hash.includes('analytics/advanced')) {
      return 'advanced-analytics';
    }
    if (path.includes('/trades') || hash.includes('trades')) return 'trades';
    if (path.includes('/journal') || hash.includes('journal') || hash.includes('notebook')) return 'notebook';
    if (path.includes('/playbook') || hash.includes('playbook')) return 'playbook';
    if (path.includes('/prop-firm') || hash.includes('prop-firm') || path.includes('/propfirm') || hash.includes('propfirm') || path.includes('/backtesting') || hash.includes('backtesting')) return 'prop-firm';
    if (path.includes('/goals') || hash.includes('goals')) return 'goals';
    if (path.includes('/calendar') || hash.includes('calendar')) return 'calendar';
    if (path.includes('/news') || hash.includes('news')) return 'news';
    if (path.includes('/coach') || hash.includes('coach')) return 'ai-coach';
    if (path.includes('/tools') || hash.includes('tools')) return 'tools';
    if (path.includes('/lounge') || hash.includes('lounge')) return 'lounge';
    if (path.includes('/settings') || hash.includes('settings')) return 'settings';
  } catch {
    // ignore
  }
  return 'dashboard';
};

const getInitialStoredData = <T,>(cacheKey: string, fallback: T): T => {
  try {
    if (typeof window === 'undefined') return fallback;
    const uid = localStorage.getItem('tradeforge_user_id');
    if (uid) {
      const scoped = localStorage.getItem(`tf_cache_${cacheKey}_${uid}`);
      if (scoped) {
        const parsed = JSON.parse(scoped);
        if (parsed !== undefined && parsed !== null) return parsed;
      }
    }
    const general = localStorage.getItem(`tf_cache_${cacheKey}`);
    if (general) {
      const parsed = JSON.parse(general);
      if (parsed !== undefined && parsed !== null) return parsed;
    }
  } catch {}
  return fallback;
};

export const TradingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [activeView, setActiveView] = useState<ActiveView>(getViewFromUrl);
  const [currencyMode, setCurrencyMode] = useState<CurrencyDisplayMode>('USD');
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    try {
      const savedTheme = localStorage.getItem('df_theme');
      if (savedTheme === 'light' || savedTheme === 'dark') return savedTheme;
    } catch {
      // ignore
    }
    return 'dark';
  });

  const [accounts, setAccounts] = useState<TradingAccount[]>(() => getInitialStoredData('accounts', []));
  const [selectedAccountId, setSelectedAccountId] = useState<string>('all');
  const [connections, setConnections] = useState<TradingAccountConnection[]>([]);
  
  // Prop Firm Accounts state scoped per user with fallback cache
  const [propFirmAccounts, setPropFirmAccounts] = useState<PropFirmAccount[]>(() => {
    try {
      if (typeof localStorage !== 'undefined') {
        const storedUid = localStorage.getItem('tradeforge_user_id');
        if (storedUid) {
          const userCache = localStorage.getItem(`tf_prop_firm_accounts_${storedUid}`);
          if (userCache !== null) {
            const parsed = JSON.parse(userCache);
            if (Array.isArray(parsed)) return parsed;
          }
        }
        const generalCache = localStorage.getItem('tf_prop_firm_accounts_cache');
        if (generalCache !== null) {
          const parsed = JSON.parse(generalCache);
          if (Array.isArray(parsed)) return parsed;
        }
        const keys = Object.keys(localStorage).filter((k) => k.startsWith('tf_prop_firm_accounts'));
        for (const k of keys) {
          const item = localStorage.getItem(k);
          if (item !== null) {
            const parsed = JSON.parse(item);
            if (Array.isArray(parsed)) return parsed;
          }
        }
      }
    } catch {
      // ignore
    }
    return [];
  });
  const [selectedPropFirmAccountId, setSelectedPropFirmAccountId] = useState<string>(() => {
    try {
      if (typeof localStorage !== 'undefined') {
        const storedUid = localStorage.getItem('tradeforge_user_id');
        if (storedUid) {
          const userCache = localStorage.getItem(`tf_prop_firm_accounts_${storedUid}`);
          if (userCache !== null) {
            const parsed = JSON.parse(userCache);
            if (Array.isArray(parsed) && parsed.length > 0) return parsed[0].id;
          }
        }
        const generalCache = localStorage.getItem('tf_prop_firm_accounts_cache');
        if (generalCache !== null) {
          const parsed = JSON.parse(generalCache);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed[0].id;
        }
      }
    } catch {}
    return '';
  });

  // Settings & Customization States
  const [userSettings, setUserSettings] = useState<UserSettings>(() => createDefaultUserSettings());
  const [customTags, setCustomTags] = useState<CustomTag[]>(DEFAULT_TAGS_FALLBACK);
  const [importHistory, setImportHistory] = useState<ImportHistoryItem[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLogItem[]>([]);
  const [userBackups, setUserBackups] = useState<UserBackup[]>([]);

  const persistPropFirmAccounts = (next: PropFirmAccount[]) => {
    try {
      if (typeof localStorage === 'undefined') return;
      localStorage.setItem('tf_prop_firm_accounts_cache', JSON.stringify(next));
      const authUid = authUser?.id || (authUser as any)?.uid;
      if (authUid) {
        localStorage.setItem(`tf_prop_firm_accounts_${authUid}`, JSON.stringify(next));
      }
      const storedUid = localStorage.getItem('tradeforge_user_id');
      if (storedUid && storedUid !== authUid) {
        localStorage.setItem(`tf_prop_firm_accounts_${storedUid}`, JSON.stringify(next));
      }
      const allKeys = Object.keys(localStorage).filter(
        (k) => k.startsWith('tf_prop_firm_accounts') || k.startsWith('tf_cache_prop_firm_accounts')
      );
      for (const k of allKeys) {
        if (
          k !== 'tf_prop_firm_accounts_cache' &&
          (!authUid || k !== `tf_prop_firm_accounts_${authUid}`) &&
          (!storedUid || k !== `tf_prop_firm_accounts_${storedUid}`)
        ) {
          localStorage.removeItem(k);
        }
      }
    } catch {
      // ignore
    }
  };

  // Prop Firm Accounts helpers (user-scoped with PostgreSQL cloud persistence)
  const addPropFirmAccount = (newAcc: Omit<PropFirmAccount, 'id' | 'createdAt'> | PropFirmAccount) => {
    const created: PropFirmAccount = {
      ...newAcc,
      id: 'id' in newAcc && newAcc.id ? newAcc.id : `pf-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      createdAt: 'createdAt' in newAcc && newAcc.createdAt ? newAcc.createdAt : new Date().toISOString(),
    };
    setPropFirmAccounts((prev) => {
      const next = [created, ...prev.filter((a) => a.id !== created.id)];
      persistPropFirmAccounts(next);
      return next;
    });
    setSelectedPropFirmAccountId(created.id);
    savePropFirmAccountApi(created).catch((err) => console.error('Failed to save prop firm account to DB:', err));
  };

  const updatePropFirmAccount = (updated: PropFirmAccount) => {
    const withUpdate: PropFirmAccount = { ...updated, updatedAt: new Date().toISOString() };
    setPropFirmAccounts((prev) => {
      const next = prev.map((acc) => (acc.id === updated.id ? withUpdate : acc));
      persistPropFirmAccounts(next);
      return next;
    });
    savePropFirmAccountApi(withUpdate).catch((err) => console.error('Failed to update prop firm account in DB:', err));
  };

  const deletePropFirmAccount = (id: string) => {
    let nextList: PropFirmAccount[] = [];
    setPropFirmAccounts((prev) => {
      nextList = prev.filter((acc) => acc.id !== id);
      persistPropFirmAccounts(nextList);
      return nextList;
    });
    setSelectedPropFirmAccountId((prevSelectedId) => {
      if (prevSelectedId === id || !prevSelectedId || !nextList.some((a) => a.id === prevSelectedId)) {
        return nextList.length > 0 ? nextList[0].id : '';
      }
      return prevSelectedId;
    });
    deletePropFirmAccountApi(id).catch((err) => console.error('Failed to delete prop firm account from DB:', err));
  };

  const addPropFirmViolation = (
    accountId: string,
    violation: Omit<PropFirmViolation, 'id' | 'timestamp'>
  ) => {
    const newViol: PropFirmViolation = {
      ...violation,
      id: `viol-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
    };
    setPropFirmAccounts((prev) => {
      let changedAcc: PropFirmAccount | null = null;
      const next = prev.map((acc) => {
        if (acc.id === accountId) {
          changedAcc = {
            ...acc,
            violations: [newViol, ...acc.violations],
            riskState: newViol.severity === 'BREACH' ? 'BREACHED' : 'CRITICAL',
          };
          return changedAcc;
        }
        return acc;
      });
      persistPropFirmAccounts(next);
      if (changedAcc) {
        savePropFirmAccountApi(changedAcc).catch((err) => console.error('Failed to persist violation to DB:', err));
      }
      return next;
    });
  };

  const recordPropFirmPayout = (
    accountId: string,
    payout: Omit<PropFirmPayoutRecord, 'id'>
  ) => {
    const record: PropFirmPayoutRecord = {
      ...payout,
      id: `pay-${Date.now()}`,
    };
    setPropFirmAccounts((prev) => {
      let changedAcc: PropFirmAccount | null = null;
      const next = prev.map((acc) => {
        if (acc.id !== accountId) return acc;
        const currentPayoutInfo = acc.payoutInfo || {
          minTradingDaysRequired: 10,
          tradingDaysCompleted: 10,
          profitSplitPercent: 80,
          eligibleProfit: 0,
          payoutAmount: 0,
          payoutHistory: [],
        };
        changedAcc = {
          ...acc,
          payoutInfo: {
            ...currentPayoutInfo,
            payoutHistory: [record, ...currentPayoutInfo.payoutHistory],
          },
        };
        return changedAcc;
      });
      persistPropFirmAccounts(next);
      if (changedAcc) {
        savePropFirmAccountApi(changedAcc).catch((err) => console.error('Failed to persist payout to DB:', err));
      }
      return next;
    });
  };
  const [trades, setTrades] = useState<Trade[]>(() => getInitialStoredData('trades', []));
  const [deletedTradesStack, setDeletedTradesStack] = useState<Trade[]>([]);
  const [playbooks, setPlaybooks] = useState<Playbook[]>(() => getInitialStoredData('playbooks', []));
  const [strategies, setStrategies] = useState<Strategy[]>(() => getInitialStoredData('strategies', []));
  const [notes, setNotes] = useState<JournalNote[]>(() => getInitialStoredData('notes', []));
  const [folders, setFolders] = useState<JournalFolder[]>(() => getInitialStoredData('folders', []));
  const [selectedNote, setSelectedNoteState] = useState<JournalNote | null>(null);
  const setSelectedNote = (note: JournalNote | null) => {
    setSelectedNoteState(note);
    try {
      if (note?.id) {
        localStorage.setItem('tradeforge_active_note_id', note.id);
      }
    } catch {}
  };
  const activeUserIdRef = useRef<string | null>(null);
  const toastCacheRef = useRef<Map<string, number>>(new Map());
  const [selectedFolderId, setSelectedFolderId] = useState<string>('f-all');
  const [riskGoals, setRiskGoals] = useState<RiskGoalSettings>(() => getInitialStoredData('risk_goals', {}));
  const [accountRiskProfiles, setAccountRiskProfiles] = useState<Record<string, RiskGoalSettings>>({});
  
  const [userProfile, setUserProfile] = useState<UserProfile>(() => 
    getInitialStoredData('profile', {
      id: '',
      name: 'Trader',
      email: '',
      accountCode: '',
      experienceLevel: '5+ Years (Full-Time Funded)',
      professionalTitle: 'Senior Quantitative Futures Trader',
      country: 'United States',
      timezone: 'America/New_York',
      preferredCurrency: 'USD',
      bio: '',
      avatarUrl: '',
    })
  );

  const [mentorStudents, setMentorStudents] = useState<MentorStudent[]>([]);
  const [mentorDirectivesSent, setMentorDirectivesSent] = useState<any[]>([]);
  const [mentorDirectivesReceived, setMentorDirectivesReceived] = useState<any[]>([]);
  const [mentorRequests, setMentorRequests] = useState<MentorConnectionRequest[]>([]);

  const [activeStudentImpersonation, setActiveStudentImpersonation] = useState<MentorStudent | null>(null);
  const [calendarEvents, setCalendarEvents] = useState<EconomicEvent[]>(INITIAL_ECONOMIC_EVENTS);
  const [notifications, setNotifications] = useState<AppNotification[]>(INITIAL_NOTIFICATIONS);
  const [communityPosts, setCommunityPosts] = useState<CommunityPost[]>(INITIAL_COMMUNITY_POSTS);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);

  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);
  const [isAddTradeOpen, setIsAddTradeOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [dateRange, setDateRange] = useState<{ startDate: string | null; endDate: string | null; presetLabel: string }>({
    startDate: null,
    endDate: null,
    presetLabel: 'All Dates',
  });
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      return localStorage.getItem('tradeforge_authenticated') === 'true';
    } catch {
      return false;
    }
  });
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);
  const [apiAuthToken, setApiAuthTokenState] = useState<string | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const currentUserId = authUser?.id || (authUser as any)?.uid || 'default_user_1';
  const currentUserIdRef = useRef(currentUserId);
  const userAccountCodeRef = useRef(userProfile.accountCode);

  useEffect(() => {
    currentUserIdRef.current = currentUserId;
    userAccountCodeRef.current = userProfile.accountCode;
  }, [currentUserId, userProfile.accountCode]);

  // Real-time Socket.IO listener for Community Lounge
  useEffect(() => {
    const socket = io(window.location.origin, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      auth: {
        token: apiAuthToken,
      },
    });

    socket.on('community:post_created', ({ post }: { post: CommunityPost }) => {
      setCommunityPosts((prev) => {
        if (prev.some((p) => p.id === post.id)) {
          return prev.map((p) => (p.id === post.id ? { ...p, ...post } : p));
        }
        return [post, ...prev];
      });
    });

    socket.on('community:post_updated', ({ postId, post }: { postId: string; post: CommunityPost }) => {
      setCommunityPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, ...post } : p))
      );
    });

    socket.on('community:post_deleted', ({ postId }: { postId: string }) => {
      setCommunityPosts((prev) => prev.filter((p) => p.id !== postId));
    });

    socket.on('community:like_toggled', ({ postId, likes, userId: likerUserId, liked }: { postId: string; likes: number; userId: string; liked: boolean }) => {
      setCommunityPosts((prev) =>
        prev.map((p) => {
          if (p.id === postId) {
            const isMe = currentUserIdRef.current === likerUserId;
            return {
              ...p,
              likes,
              hasLiked: isMe ? liked : p.hasLiked,
            };
          }
          return p;
        })
      );
    });

    socket.on('community:comment_added', ({ postId, comment, commentsCount }: { postId: string; comment: any; commentsCount: number }) => {
      setCommunityPosts((prev) =>
        prev.map((p) => {
          if (p.id === postId) {
            const existingComments = p.comments || [];
            const commentExists = existingComments.some((c) => c.id === comment.id);
            const newComments = commentExists ? existingComments : [...existingComments, comment];
            return {
              ...p,
              commentsCount: Math.max(commentsCount, newComments.length),
              comments: newComments,
            };
          }
          return p;
        })
      );
    });

    socket.on('community:comment_deleted', ({ postId, commentId, commentsCount }: { postId: string; commentId: string; commentsCount: number }) => {
      setCommunityPosts((prev) =>
        prev.map((p) => {
          if (p.id === postId) {
            const newComments = (p.comments || []).filter((c) => c.id !== commentId);
            return {
              ...p,
              commentsCount: Math.max(commentsCount, newComments.length),
              comments: newComments,
            };
          }
          return p;
        })
      );
    });

    socket.on('user_trade_synced', ({ trade, provider }: { trade: Trade; accountId: string; provider: string }) => {
      setTrades((prev) => {
        const exists = prev.some((t) => t.id === trade.id);
        if (exists) {
          return prev.map((t) => (t.id === trade.id ? { ...t, ...trade } : t));
        }
        return [trade, ...prev];
      });

      addToast(
        `Auto-Sync Execution (${provider || 'Broker'})`,
        `${trade.symbol} ${trade.direction} trade ${trade.status === 'CLOSED' ? `closed (${trade.netPnl >= 0 ? '+' : ''}$${trade.netPnl.toFixed(2)})` : 'opened'}`,
        trade.netPnl >= 0 ? 'success' : 'info'
      );

      if (trade.status === 'CLOSED' && trade.netPnl > 200) {
        try {
          confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
        } catch {
          // ignore
        }
      }
    });

    socket.on('mentor_directive_created', (directive: any) => {
      if (directive.mentorId === currentUserIdRef.current) {
        setMentorDirectivesSent((prev) => {
          if (prev.some((d) => d.id === directive.id)) return prev;
          return [directive, ...prev];
        });
      }
      if (directive.studentId === currentUserIdRef.current || (userAccountCodeRef.current && directive.studentId === userAccountCodeRef.current)) {
        setMentorDirectivesReceived((prev) => {
          if (prev.some((d) => d.id === directive.id)) return prev;
          return [directive, ...prev];
        });
        addToast(
          'New Coach Directive Received',
          `Your coach has issued a new trading directive: "${directive.content.substring(0, 45)}${directive.content.length > 45 ? '...' : ''}"`,
          'info'
        );
      }
    });

    socket.on('mentor_directive_updated', (directive: any) => {
      if (directive.mentorId === currentUserIdRef.current) {
        setMentorDirectivesSent((prev) =>
          prev.map((d) => (d.id === directive.id ? directive : d))
        );
      }
      if (directive.studentId === currentUserIdRef.current || (userAccountCodeRef.current && directive.studentId === userAccountCodeRef.current)) {
        setMentorDirectivesReceived((prev) =>
          prev.map((d) => (d.id === directive.id ? directive : d))
        );
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [apiAuthToken]);

  const logout = async () => {
    try {
      localStorage.removeItem('tradeforge_authenticated');
    } catch {
      // ignore
    }
    setIsAuthenticated(false);
    setApiAuthToken(null);
    setApiAuthTokenState(null);
    setAuthUser(null);
    setAccounts([]);
    setConnections([]);
    setTrades([]);
    setPlaybooks([]);
    setStrategies([]);
    setNotes([]);
    setFolders([]);
    setSelectedNote(null);
    setPropFirmAccounts([]);
    setSelectedPropFirmAccountId('');
    setMentorStudents([]);
    setMentorDirectivesSent([]);
    setMentorDirectivesReceived([]);
    setRiskGoals({});
    setUserProfile({
      id: '',
      name: 'Trader',
      email: '',
      accountCode: '',
      experienceLevel: 'Trader',
    });
    try {
      localStorage.removeItem('tradeforge_authenticated');
    } catch {}
    await signOutUser();
    addToast('Signed Out', 'You have been signed out', 'info');
  };

  // Tracking refs to eliminate redundant database calls
  const isFetchingStateRef = useRef<boolean>(false);
  const lastFetchedUserIdRef = useRef<string | null>(null);
  const [isSyncingData, setIsSyncingData] = useState<boolean>(false);

  const applyFetchedState = useCallback((data: any, user: User, initialName: string, realAuthEmail: string) => {
    if (!data || !data.success) return;

    if (data.profile) {
      setUserProfile((prev) => ({
        ...prev,
        id: data.profile.id || user.id,
        name: data.profile.name || initialName,
        email: realAuthEmail || data.profile.email || '',
        accountCode: data.profile.accountCode || prev.accountCode,
        experienceLevel: data.profile.experienceLevel || prev.experienceLevel,
        professionalTitle: data.profile.professionalTitle || prev.professionalTitle,
        avatarUrl: data.profile.avatarUrl || prev.avatarUrl,
        country: data.profile.country || prev.country,
        timezone: data.profile.timezone || prev.timezone,
        preferredCurrency: data.profile.preferredCurrency || prev.preferredCurrency,
        bio: data.profile.bio || prev.bio,
        tradingStyle: data.profile.tradingStyle || prev.tradingStyle,
        phone: data.profile.phone || prev.phone,
      }));
    }

    if (Array.isArray(data.accounts)) setAccounts(data.accounts);
    if (Array.isArray(data.connections)) setConnections(data.connections);
    if (Array.isArray(data.trades)) setTrades(data.trades);
    if (Array.isArray(data.playbooks)) setPlaybooks(data.playbooks);
    if (Array.isArray(data.strategies)) setStrategies(data.strategies);
    if (Array.isArray(data.notes)) {
      setNotes(data.notes);
      let targetNote: JournalNote | null = null;
      const activeNotes = data.notes.filter((n: JournalNote) => !n.isDeleted);
      try {
        const savedId = localStorage.getItem('tradeforge_active_note_id');
        if (savedId) {
          targetNote = activeNotes.find((n: JournalNote) => n.id === savedId) || null;
        }
      } catch {}
      if (!targetNote && activeNotes.length > 0) {
        targetNote = activeNotes[0];
      }
      if (targetNote) {
        setSelectedNote(targetNote);
      }
    }
    if (Array.isArray(data.folders)) setFolders(data.folders);
    if (data.riskGoals && typeof data.riskGoals === 'object') {
      setRiskGoals((prev) => ({ ...prev, ...data.riskGoals }));
    }
    if (Array.isArray(data.notifications)) setNotifications(data.notifications);
    if (Array.isArray(data.communityPosts)) setCommunityPosts(data.communityPosts);
    if (Array.isArray(data.mentorStudents)) setMentorStudents(data.mentorStudents);
    if (Array.isArray(data.mentorDirectivesSent)) setMentorDirectivesSent(data.mentorDirectivesSent);
    if (Array.isArray(data.mentorDirectivesReceived)) setMentorDirectivesReceived(data.mentorDirectivesReceived);
    if (Array.isArray(data.propFirmAccounts)) {
      setPropFirmAccounts(data.propFirmAccounts);
      persistPropFirmAccounts(data.propFirmAccounts);
      setSelectedPropFirmAccountId((curr) =>
        curr && data.propFirmAccounts.some((a: PropFirmAccount) => a.id === curr)
          ? curr
          : (data.propFirmAccounts.length > 0 ? data.propFirmAccounts[0].id : '')
      );
    }

    if (data.userSettings || data.settings) {
      const sett = data.userSettings || data.settings;
      setUserSettings(sett);
      if (sett.general?.currencyMode) {
        setCurrencyMode(sett.general.currencyMode);
      }
      if (sett.general?.theme) {
        const resolvedTheme =
          sett.general.theme === 'system'
            ? typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
              ? 'dark'
              : 'light'
            : sett.general.theme;
        setTheme(resolvedTheme);
      }
    }
    if (Array.isArray(data.customTags) && data.customTags.length > 0) {
      setCustomTags(data.customTags);
    }
    if (Array.isArray(data.importHistory)) {
      setImportHistory(data.importHistory);
    }
    if (Array.isArray(data.activityLogs)) {
      setActivityLogs(data.activityLogs);
    }
    if (Array.isArray(data.userBackups)) {
      setUserBackups(data.userBackups);
    }

    fetchLeaderboard();
  }, []);

  const syncUserData = useCallback(async (user: User, token?: string, force = false) => {
    if (!user?.id) return;
    if (!force && isFetchingStateRef.current) return;
    if (!force && lastFetchedUserIdRef.current === user.id) return;

    isFetchingStateRef.current = true;
    setIsSyncingData(true);

    const realAuthEmail = user.email && !user.email.includes('duskflow.io') ? user.email : '';
    const initialName =
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      (realAuthEmail ? realAuthEmail.split('@')[0] : 'Trader');

    try {
      const data = await fetchInitialState(user.id);
      applyFetchedState(data, user, initialName, realAuthEmail);
      lastFetchedUserIdRef.current = user.id;
    } catch (err) {
      console.warn('[TradingContext] Sync notice:', err);
    } finally {
      isFetchingStateRef.current = false;
      setIsSyncingData(false);
    }
  }, [applyFetchedState]);

  const refreshInitialState = useCallback(async () => {
    if (authUser) {
      await syncUserData(authUser, apiAuthToken || undefined, true);
    }
  }, [authUser, apiAuthToken, syncUserData]);

  const resendEmailVerification = useCallback(async (email: string) => {
    return await resendVerificationEmail(email);
  }, []);

  // Listen to Supabase Auth state changes and load user-isolated data
  useEffect(() => {
    let isMounted = true;

    // 1. Process any incoming redirect parameters (e.g. Email verification PKCE code, token_hash, or error)
    (async () => {
      try {
        const redirectResult = await handleAuthRedirect();
        if (!isMounted) return;
        if (redirectResult.error) {
          addToast('Verification Notice', redirectResult.error.message, 'warning');
        } else if (redirectResult.handled && redirectResult.type === 'signup_confirmation') {
          addToast('Email Verified', 'Your email has been confirmed! Welcome to TradeForge.', 'success');
        }
      } catch (err) {
        console.warn('[AuthRedirect] Notice:', err);
      }

      // 2. Immediately check session to unblock UI on refresh with zero lag
      try {
        const session = await getSession();
        if (!isMounted) return;
        if (session?.user) {
          activeUserIdRef.current = session.user.id;
          setApiAuthToken(session.access_token);
          setApiAuthTokenState(session.access_token);
          setAuthUser(session.user);
          setIsAuthenticated(true);
          // UNBLOCK UI IMMEDIATELY
          setIsAuthLoading(false);

          try {
            localStorage.setItem('tradeforge_authenticated', 'true');
            localStorage.setItem('tradeforge_user_id', session.user.id);
            const userPropKey = `tf_prop_firm_accounts_${session.user.id}`;
            const savedProps = localStorage.getItem(userPropKey);
            if (savedProps !== null) {
              const parsed = JSON.parse(savedProps);
              if (Array.isArray(parsed)) {
                setPropFirmAccounts(parsed);
                setSelectedPropFirmAccountId(parsed.length > 0 ? parsed[0].id : '');
              }
            }
          } catch {}

          // Background sync from Supabase
          syncUserData(session.user, session.access_token);
        } else {
          setIsAuthLoading(false);
        }
      } catch {
        if (isMounted) setIsAuthLoading(false);
      }
    })();

    // 3. Keep state synchronized with auth change events
    const {
      data: { subscription },
    } = onAuthStateChange(async (event, session) => {
      if (!isMounted) return;

      if (event === 'TOKEN_REFRESHED') {
        if (session?.access_token) {
          setApiAuthToken(session.access_token);
          setApiAuthTokenState(session.access_token);
        }
        return;
      }

      const previousUserId = activeUserIdRef.current;
      const newUserId = session?.user?.id || null;

      // Only reset state if switching to a different user or explicitly logging out
      if (previousUserId && previousUserId !== newUserId) {
        setAccounts([]);
        setConnections([]);
        setTrades([]);
        setPlaybooks([]);
        setStrategies([]);
        setNotes([]);
        setFolders([]);
        setSelectedNote(null);
        setPropFirmAccounts([]);
        setSelectedPropFirmAccountId('');
        setMentorStudents([]);
        setMentorDirectivesSent([]);
        setMentorDirectivesReceived([]);
        setRiskGoals({});
        lastFetchedUserIdRef.current = null;
      }
      activeUserIdRef.current = newUserId;

      if (session?.user) {
        const user = session.user;
        const token = session.access_token;
        setApiAuthToken(token);
        setApiAuthTokenState(token);
        setAuthUser(user);
        setIsAuthenticated(true);
        setIsAuthLoading(false);

        try {
          localStorage.setItem('tradeforge_authenticated', 'true');
          localStorage.setItem('tradeforge_user_id', user.id);
          const userPropKey = `tf_prop_firm_accounts_${user.id}`;
          const savedProps = localStorage.getItem(userPropKey);
          if (savedProps !== null) {
            const parsed = JSON.parse(savedProps);
            if (Array.isArray(parsed)) {
              setPropFirmAccounts(parsed);
              setSelectedPropFirmAccountId(parsed.length > 0 ? parsed[0].id : '');
            }
          }
        } catch {}

        syncUserData(user, token);
      } else {
        setApiAuthToken(null);
        setApiAuthTokenState(null);
        setAuthUser(null);
        setIsAuthenticated(false);
        setIsAuthLoading(false);
        setUserProfile({
          id: '',
          name: 'Trader',
          email: '',
          accountCode: '',
          experienceLevel: 'Trader',
        });
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [syncUserData]);

  // Theme effect
  useEffect(() => {
    try {
      localStorage.setItem('df_theme', theme);
    } catch {
      // ignore
    }
    document.documentElement.classList.remove('theme-dark', 'theme-light', 'theme-liquid-glass', 'dark', 'light');
    document.body.classList.remove('theme-dark', 'theme-light', 'theme-liquid-glass', 'dark', 'light');

    if (theme === 'dark') {
      document.documentElement.classList.add('dark', 'theme-dark');
      document.body.classList.add('theme-dark', 'dark');
    } else {
      document.documentElement.classList.add('light', 'theme-light');
      document.body.classList.add('theme-light', 'light');
    }
  }, [theme]);

  // URL sync
  useEffect(() => {
    try {
      let targetPath = '/';
      if (activeView === 'reports') targetPath = '/analytics/performance';
      else if (activeView === 'advanced-analytics') targetPath = '/analytics/advanced';
      else if (activeView === 'trades') targetPath = '/trades';
      else if (activeView === 'notebook' || activeView === 'journal') targetPath = '/journal';
      else if (activeView === 'playbook') targetPath = '/playbook';
      else if (activeView === 'prop-firm') targetPath = '/prop-firm';
      else if (activeView === 'mentor-mode') targetPath = '/mentor';
      else if (activeView === 'goals') targetPath = '/goals';
      else if (activeView === 'calendar') targetPath = '/calendar';
      else if (activeView === 'news') targetPath = '/news';
      else if (activeView === 'ai-coach') targetPath = '/coach';
      else if (activeView === 'tools') targetPath = '/tools';
      else if (activeView === 'lounge') targetPath = '/lounge';
      else if (activeView === 'settings' || activeView === 'integrations') targetPath = '/settings';

      if (window.location.pathname !== targetPath && window.history.pushState) {
        window.history.pushState({ view: activeView }, '', targetPath);
      }
    } catch {
      // ignore
    }
  }, [activeView]);

  useEffect(() => {
    const handlePopState = () => {
      const derived = getViewFromUrl();
      setActiveView(derived);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const addToast = (title: string, message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    // Deduplicate rapid identical toasts (2s debounce)
    const toastKey = `${title}:::${message || ''}:::${type}`;
    const now = Date.now();
    const lastTime = toastCacheRef.current.get(toastKey);
    if (lastTime && now - lastTime < 2000) {
      return;
    }
    toastCacheRef.current.set(toastKey, now);

    const id = 't-' + now + Math.random().toString(36).substring(2, 5);
    setToasts(prev => [...prev, { id, title, message, type }].slice(-3));
    setTimeout(() => {
      removeToast(id);
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(prev => !prev);
      } else if (e.key === 'Escape') {
        setIsCommandPaletteOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const updateUserProfile = async (profileUpdate: Partial<UserProfile>) => {
    try {
      setUserProfile(prev => {
        const merged = { ...prev, ...profileUpdate };
        
        // Immediately sync related fields into userSettings so global preferences update instantly
        setUserSettings(prevSettings => ({
          ...prevSettings,
          general: {
            ...prevSettings.general,
            ...(profileUpdate.timezone ? { timezone: profileUpdate.timezone } : {}),
            ...(profileUpdate.preferredCurrency ? { currency: profileUpdate.preferredCurrency } : {}),
          },
          profile: {
            ...prevSettings.profile,
            ...(profileUpdate.bio !== undefined ? { bio: profileUpdate.bio } : {}),
            ...(profileUpdate.country !== undefined ? { country: profileUpdate.country } : {}),
            ...(profileUpdate.professionalTitle !== undefined ? { professionalTitle: profileUpdate.professionalTitle } : {}),
            ...(profileUpdate.tradingStyle !== undefined ? { tradingStyle: profileUpdate.tradingStyle } : {}),
            ...(profileUpdate.phone !== undefined ? { phone: profileUpdate.phone } : {}),
          },
        }));

        updateUserProfileApi({
          fullName: merged.name,
          name: merged.name,
          email: merged.email,
          accountCode: merged.accountCode || undefined,
          experienceLevel: merged.experienceLevel,
          avatarUrl: merged.avatarUrl,
          country: merged.country,
          timezone: merged.timezone,
          preferredCurrency: merged.preferredCurrency,
          professionalTitle: merged.professionalTitle,
          bio: merged.bio,
          tradingStyle: merged.tradingStyle,
          phone: merged.phone,
        })
          .then(res => {
            if (res?.profile) {
              setUserProfile(curr => ({
                ...curr,
                ...res.profile,
                name: res.profile.fullName || res.profile.name || curr.name,
              }));
            }
            if (res?.settings) {
              setUserSettings(res.settings);
            }
          })
          .catch(e => console.warn('Failed to sync profile update to database:', e));

        return merged;
      });
      addToast('Profile Updated', 'Your identity, credentials and preferences have been saved.', 'success');
    } catch (err: any) {
      console.error('updateUserProfile error:', err);
      addToast('Update Failed', err?.message || 'Failed to update profile', 'error');
    }
  };

  const regenerateAccountCode = (): string => {
    addToast('Feature Disabled', 'Regenerating mentor code is disabled to ensure code stability', 'warning');
    return userProfile.accountCode;
  };

  const connectStudentByCode = (rawCode: string): boolean => {
    const cleanCode = rawCode.trim().toUpperCase();
    if (!cleanCode) {
      addToast('Error', 'Please enter a valid unique account code', 'error');
      return false;
    }

    const existing = mentorStudents.find(s => s.code.toUpperCase() === cleanCode);
    if (existing) {
      addToast('Already Connected', `${existing.name} is already in your Mentor Hub`, 'warning');
      return false;
    }

    const newStudent: MentorStudent = {
      id: 'st-' + Date.now(),
      code: cleanCode,
      name: `Trader (${cleanCode})`,
      email: `trader.${cleanCode.toLowerCase()}@duskflow.trade`,
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80',
      accountName: 'Apex 50k Express',
      currentBalance: 51850.00,
      netPnl: 1850.00,
      winRate: 58.40,
      profitFactor: 2.15,
      zellaScore: 85,
      totalTrades: 28,
      status: 'ACTIVE',
      sharedAccounts: ['Primary Account'],
      unreadNotesCount: 1,
      disciplineScore: 82,
      joinedDate: new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
      riskBreached: false,
    };

    setMentorStudents(prev => [newStudent, ...prev]);
    saveMentorStudentApi(newStudent);
    addToast('Student Added', `Account ${cleanCode} connected to your Mentor Workspace!`, 'success');
    return true;
  };

  const approveMentorRequest = (requestId: string) => {
    setMentorRequests(prev => prev.map(r => r.id === requestId ? { ...r, status: 'APPROVED' } : r));
    addToast('Request Approved', 'Your mentor now has access to review your journal & trades', 'success');
  };

  const declineMentorRequest = (requestId: string) => {
    setMentorRequests(prev => prev.map(r => r.id === requestId ? { ...r, status: 'DECLINED' } : r));
    addToast('Request Declined', 'Mentor access request declined', 'info');
  };

  const disconnectStudent = (studentId: string) => {
    setMentorStudents(prev => prev.filter(s => s.id !== studentId));
    deleteMentorStudentApi(studentId);
    if (activeStudentImpersonation?.id === studentId) {
      setActiveStudentImpersonation(null);
    }
    addToast('Student Disconnected', 'Student removed from your Mentor Hub', 'info');
  };

  const dispatchMentorDirective = async (studentCode: string, content: string, type = 'DIRECTIVE') => {
    try {
      const data = await createDirectiveApi(studentCode, content, type);
      if (data && data.success && data.directive) {
        setMentorDirectivesSent((prev) => {
          if (prev.some((d) => d.id === data.directive.id)) return prev;
          return [data.directive, ...prev];
        });
        addToast(
          'Directive Dispatched',
          `Direct mentor directive dispatched to student ${studentCode}`,
          'success'
        );
      }
    } catch (err: any) {
      console.error('dispatchMentorDirective error:', err);
      addToast('Dispatch Failed', err.message || 'Failed to dispatch directive', 'error');
      throw err;
    }
  };

  const acknowledgeMentorDirective = async (id: string) => {
    try {
      const data = await acknowledgeDirectiveApi(id);
      if (data && data.success) {
        setMentorDirectivesReceived((prev) =>
          prev.map((d) => (d.id === id ? { ...d, status: 'ACKNOWLEDGED' } : d))
        );
        addToast('Directive Acknowledged', 'You have marked this directive as read and acknowledged.', 'success');
      }
    } catch (err: any) {
      console.error('acknowledgeMentorDirective error:', err);
      addToast('Acknowledge Failed', err.message || 'Failed to acknowledge directive', 'error');
      throw err;
    }
  };

  const fetchLeaderboard = async () => {
    try {
      const data = await fetchLeaderboardApi();
      if (data && data.success && Array.isArray(data.leaderboard)) {
        setLeaderboard(data.leaderboard);
      }
    } catch (err: any) {
      console.warn('fetchLeaderboard note:', err?.message || err);
    }
  };

  const updateUserPointsAdmin = async (userId: string, points: number, reason?: string) => {
    try {
      const data = await updateUserPointsAdminApi(userId, points, reason);
      if (data && data.success) {
        addToast('Points Updated', `Successfully updated trader's points to ${points}`, 'success');
        await fetchLeaderboard();
      }
    } catch (err: any) {
      console.error('updateUserPointsAdmin error:', err);
      addToast('Update Failed', err.message || 'Failed to update points', 'error');
      throw err;
    }
  };

  const updateUserRoleAdmin = async (userId: string, role: string, reason?: string) => {
    try {
      const data = await updateUserRoleAdminApi(userId, role, reason);
      if (data && data.success) {
        addToast('Role Updated', `Successfully updated trader's role to ${role}`, 'success');
        await fetchLeaderboard();
      }
    } catch (err: any) {
      console.error('updateUserRoleAdmin error:', err);
      addToast('Update Failed', err.message || 'Failed to update role', 'error');
      throw err;
    }
  };

  const filteredTrades = useMemo(() => {
    let result = trades;
    if (selectedAccountId !== 'all') {
      const isPropFirm = propFirmAccounts.some(pf => pf.id === selectedAccountId);
      if (isPropFirm) {
        const pf = propFirmAccounts.find(p => p.id === selectedAccountId);
        result = result.filter(t => {
          if (t.propFirmAccountId === selectedAccountId) return true;
          if (pf?.tradingAccountLink && pf.tradingAccountLink !== 'all' && t.accountId === pf.tradingAccountLink) {
            return !t.propFirmAccountId || t.propFirmAccountId === selectedAccountId;
          }
          return false;
        });
      } else {
        result = result.filter(t => t.accountId === selectedAccountId);
      }
    }
    if (dateRange.startDate) {
      const start = new Date(dateRange.startDate + 'T00:00:00');
      result = result.filter(t => {
        if (!t.entryDate) return true;
        const entry = new Date(t.entryDate);
        return entry >= start;
      });
    }
    if (dateRange.endDate) {
      const end = new Date(dateRange.endDate + 'T23:59:59');
      result = result.filter(t => {
        if (!t.entryDate) return true;
        const entry = new Date(t.entryDate);
        return entry <= end;
      });
    }
    return result;
  }, [trades, selectedAccountId, dateRange, propFirmAccounts]);

  const computedPlaybooks = useMemo(() => {
    return playbooks.map(pb => {
      const pbTrades = trades.filter(t => {
        if (t.status !== 'CLOSED') return false;
        if (t.playbookId === pb.id) return true;
        if (t.setupType && pb.name && t.setupType.trim().toLowerCase() === pb.name.trim().toLowerCase()) return true;
        return false;
      });
      const metrics = calculatePlaybookMetrics(pbTrades);

      return {
        ...pb,
        totalTrades: metrics.totalTrades,
        winRate: metrics.winRate,
        netPnl: metrics.netPnl,
        profitFactor: metrics.profitFactor,
        avgWinner: metrics.avgWinner,
        avgLoser: metrics.avgLoser,
        expectancy: metrics.expectancy,
      };
    });
  }, [playbooks, trades]);

  const computedStrategies = useMemo(() => {
    return strategies.map(strat => {
      const stratTrades = trades.filter(t => {
        if (t.status !== 'CLOSED') return false;
        if (t.strategyId === strat.id) return true;
        if (t.setupType && strat.name && t.setupType.trim().toLowerCase() === strat.name.trim().toLowerCase()) return true;
        return false;
      });
      const metrics = calculatePlaybookMetrics(stratTrades);

      return {
        ...strat,
        totalTrades: metrics.totalTrades,
        winRate: metrics.winRate,
        netPnl: metrics.netPnl,
        profitFactor: metrics.profitFactor,
      };
    });
  }, [strategies, trades]);

  // Trade CRUD
  const addTrade = (tradeData: Omit<Trade, 'id'>) => {
    const newTrade: Trade = {
      ...tradeData,
      id: 'tr-' + Date.now(),
    };
    setTrades(prev => [newTrade, ...prev]);
    saveTradeApi(newTrade);
    addToast('Trade Added', `${newTrade.symbol} ${newTrade.direction} trade logged successfully`, 'success');
    if (newTrade.netPnl > 500) {
      try {
        confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });
      } catch {
        // ignore
      }
    }
  };

  const updateTrade = (updatedTrade: Trade) => {
    setTrades(prev => prev.map(t => (t.id === updatedTrade.id ? updatedTrade : t)));
    saveTradeApi(updatedTrade);
    addToast('Trade Updated', `Trade #${updatedTrade.symbol} saved`, 'success');
  };

  const deleteTrade = (id: string) => {
    const toDelete = trades.find(t => t.id === id);
    if (toDelete) {
      setDeletedTradesStack(prev => [...prev, toDelete]);
      setTrades(prev => prev.filter(t => t.id !== id));
      deleteTradeApi(id);
      addToast('Trade Deleted', 'Trade removed. You can undo this action.', 'warning');
    }
  };

  const duplicateTrade = (id: string) => {
    const target = trades.find(t => t.id === id);
    if (target) {
      const duplicated: Trade = {
        ...target,
        id: 'tr-' + Date.now(),
        entryDate: new Date().toISOString(),
        notes: `Copy of ${target.symbol} - ${target.notes}`,
      };
      setTrades(prev => [duplicated, ...prev]);
      saveTradeApi(duplicated);
      addToast('Trade Duplicated', `${duplicated.symbol} trade duplicated`, 'info');
    }
  };

  const bulkDeleteTrades = (ids: string[]) => {
    const toDelete = trades.filter(t => ids.includes(t.id));
    setDeletedTradesStack(prev => [...prev, ...toDelete]);
    setTrades(prev => prev.filter(t => !ids.includes(t.id)));
    bulkDeleteTradesApi(ids);
    addToast('Bulk Deleted', `${ids.length} trades deleted`, 'warning');
  };

  const bulkEditTrades = (ids: string[], updates: Partial<Trade>) => {
    setTrades(prev => prev.map(t => ids.includes(t.id) ? { ...t, ...updates } : t));
    bulkEditTradesApi(ids, updates);
    addToast('Bulk Updated', `${ids.length} trades updated`, 'success');
  };

  const importTrades = (newTrades: Array<Omit<Trade, 'id'>>) => {
    const formatted = newTrades.map((t, idx) => ({
      ...t,
      id: `tr-imp-${Date.now()}-${idx}`,
    }));
    setTrades(prev => [...formatted, ...prev]);
    for (const tr of formatted) {
      saveTradeApi(tr);
    }
    addToast('Import Successful', `${formatted.length} trades imported cleanly`, 'success');
  };

  const undoLastDelete = () => {
    if (deletedTradesStack.length === 0) return;
    const last = deletedTradesStack[deletedTradesStack.length - 1];
    setDeletedTradesStack(prev => prev.slice(0, -1));
    setTrades(prev => [last, ...prev]);
    saveTradeApi(last);
    addToast('Restored', `Trade #${last.symbol} restored`, 'info');
  };

  // Accounts CRUD
  const addAccount = (acc: Omit<TradingAccount, 'id'>) => {
    const newAcc: TradingAccount = { ...acc, id: 'acc-' + Date.now() };
    setAccounts(prev => [...prev, newAcc]);
    saveAccountApi(newAcc);
    addToast('Account Connected', `${newAcc.name} added`, 'success');
  };

  const updateAccount = (acc: TradingAccount) => {
    setAccounts(prev => prev.map(a => a.id === acc.id ? acc : a));
    saveAccountApi(acc);
    addToast('Account Saved', acc.name, 'success');
  };

  const deleteAccount = (id: string) => {
    setAccounts(prev => prev.filter(a => a.id !== id));
    deleteAccountApi(id);
    if (selectedAccountId === id) setSelectedAccountId('all');
    if (
      userSettings.tradeDefaults?.defaultAccountId === id ||
      userSettings.general?.defaultAccountId === id
    ) {
      updateUserSettings(prev => ({
        ...prev,
        tradeDefaults: prev.tradeDefaults ? { ...prev.tradeDefaults, defaultAccountId: '' } : undefined,
        general: prev.general ? { ...prev.general, defaultAccountId: '' } : undefined,
      }));
    }
    addToast('Account Removed', 'Account deleted', 'warning');
  };

  // Playbooks CRUD
  const addPlaybook = (pb: Omit<Playbook, 'id'>) => {
    const newPb: Playbook = { ...pb, id: 'pb-' + Date.now() };
    setPlaybooks(prev => [...prev, newPb]);
    savePlaybookApi(newPb);
    addToast('Playbook Created', `Playbook "${newPb.name}" ready`, 'success');
  };

  const updatePlaybook = (pb: Playbook) => {
    setPlaybooks(prev => prev.map(p => p.id === pb.id ? pb : p));
    savePlaybookApi(pb);
    addToast('Playbook Saved', pb.name, 'success');
  };

  const deletePlaybook = (id: string) => {
    setPlaybooks(prev => prev.filter(p => p.id !== id));
    deletePlaybookApi(id);
    addToast('Playbook Deleted', '', 'info');
  };

  const duplicatePlaybook = (id: string) => {
    const source = playbooks.find(p => p.id === id);
    if (!source) return;
    const duplicated: Playbook = {
      ...source,
      id: 'pb-' + Date.now(),
      name: `${source.name} (Copy)`,
      totalTrades: 0,
      winRate: 0,
      netPnl: 0,
      profitFactor: 0,
      avgWinner: 0,
      avgLoser: 0,
      expectancy: 0,
      createdAt: new Date().toISOString(),
    };
    setPlaybooks(prev => [...prev, duplicated]);
    savePlaybookApi(duplicated);
    addToast('Playbook Duplicated', `Created "${duplicated.name}"`, 'success');
  };

  const archivePlaybook = (id: string, newStatus: 'Active' | 'Paused' | 'Archived' = 'Archived') => {
    setPlaybooks(prev => prev.map(p => {
      if (p.id === id) {
        const updated: Playbook = { ...p, status: newStatus as any };
        savePlaybookApi(updated);
        return updated;
      }
      return p;
    }));
    addToast('Status Updated', `Playbook status set to ${newStatus}`, 'info');
  };

  // Strategy CRUD
  const addStrategy = (strat: Omit<Strategy, 'id'>) => {
    const newStrat: Strategy = { ...strat, id: 'strat-' + Date.now() };
    setStrategies(prev => [...prev, newStrat]);
    saveStrategyApi(newStrat);
    addToast('Strategy Created', newStrat.name, 'success');
  };

  // Notes CRUD
  const addNote = async (noteData: Omit<JournalNote, 'id'>): Promise<JournalNote | null> => {
    const newNote: JournalNote = { ...noteData, id: 'note-' + Date.now() };
    const success = await saveNoteApi(newNote);
    if (!success) {
      addToast('Error', 'Failed to save note to database', 'error');
      return null;
    }
    setNotes(prev => [newNote, ...prev]);
    setSelectedNote(newNote);
    addToast('Note Created', newNote.title, 'success');
    return newNote;
  };

  const updateNote = async (note: JournalNote, options?: { silent?: boolean }): Promise<boolean> => {
    const success = await saveNoteApi(note);
    if (!success) {
      addToast('Error', 'Failed to update note in database', 'error');
      return false;
    }
    setNotes(prev => prev.map(n => n.id === note.id ? note : n));
    if (selectedNote?.id === note.id) setSelectedNote(note);
    if (!options?.silent) {
      addToast('Note Updated', note.title, 'success');
    }
    return true;
  };

  const deleteNote = async (id: string): Promise<boolean> => {
    return await softDeleteNote(id);
  };

  const softDeleteNote = async (id: string): Promise<boolean> => {
    const targetNote = notes.find(n => n.id === id);
    const origFolder = targetNote?.folderId || '';
    const nowIso = new Date().toISOString();

    const success = await softDeleteNoteApi(id, origFolder);
    if (!success) {
      addToast('Error', 'Failed to move note to Trash in database', 'error');
      return false;
    }

    setNotes(prev => prev.map(n => n.id === id ? {
      ...n,
      isDeleted: true,
      deletedAt: nowIso,
      deletedBy: currentUserId,
      originalFolderId: origFolder,
    } : n));

    if (selectedNote?.id === id) {
      const remainingActive = notes.filter(n => n.id !== id && !n.isDeleted);
      setSelectedNote(remainingActive.length > 0 ? remainingActive[0] : null);
    }

    addToast('Moved to Trash', 'Note moved to Trash. Permanently deleted in 2 days.', 'info');
    return true;
  };

  const restoreNote = async (id: string, originalFolderId?: string): Promise<boolean> => {
    const target = notes.find(n => n.id === id);
    const restoredFolderId = originalFolderId !== undefined ? originalFolderId : (target?.originalFolderId || target?.folderId || '');

    const success = await restoreNoteApi(id, restoredFolderId);
    if (!success) {
      addToast('Error', 'Failed to restore note from database', 'error');
      return false;
    }

    const restoredNote: JournalNote | undefined = target ? {
      ...target,
      isDeleted: false,
      deletedAt: undefined,
      deletedBy: undefined,
      folderId: restoredFolderId,
    } : undefined;

    setNotes(prev => prev.map(n => n.id === id ? (restoredNote || { ...n, isDeleted: false, deletedAt: undefined, deletedBy: undefined, folderId: restoredFolderId }) : n));

    if (restoredNote) {
      setSelectedNote(restoredNote);
    }
    addToast('Note Restored', 'Note has been restored to your journal', 'success');
    return true;
  };

  const permanentDeleteNote = async (id: string): Promise<boolean> => {
    const targetNote = notes.find(n => n.id === id);

    // Delete attachments and screenshots from Supabase Storage
    if (targetNote) {
      const urlsToDelete: string[] = [
        ...(targetNote.screenshots || []),
        ...(targetNote.attachments?.map(a => a.url) || []),
      ].filter(Boolean);
      if (urlsToDelete.length > 0) {
        SupabaseStorageService.deleteMultipleJournalAttachments(urlsToDelete).catch(e =>
          console.warn('[Storage] Error deleting note attachments:', e)
        );
      }
    }

    const success = await permanentDeleteNoteApi(id);
    if (!success) {
      addToast('Error', 'Failed to permanently delete note from database', 'error');
      return false;
    }

    setNotes(prev => prev.filter(n => n.id !== id));
    if (selectedNote?.id === id) {
      const remainingActive = notes.filter(n => n.id !== id && !n.isDeleted);
      setSelectedNote(remainingActive.length > 0 ? remainingActive[0] : null);
    }

    addToast('Permanently Deleted', 'Note and attachments deleted forever', 'info');
    return true;
  };

  const addFolder = async (name: string, icon = 'Folder'): Promise<JournalFolder | null> => {
    const trimmed = name.trim();
    if (!trimmed) return null;
    const newFolder: JournalFolder = {
      id: 'f-' + Date.now(),
      name: trimmed,
      icon,
      count: 0,
      isDeleted: false,
    };
    const success = await saveFolderApi(newFolder);
    if (!success) {
      addToast('Error', 'Failed to save folder to database', 'error');
      return null;
    }
    setFolders(prev => [...prev, newFolder]);
    setSelectedFolderId(newFolder.id);
    addToast('Folder Created', `Folder "${trimmed}" ready`, 'success');
    return newFolder;
  };

  const updateFolder = async (id: string, name: string, icon?: string): Promise<boolean> => {
    const trimmed = name.trim();
    if (!trimmed) return false;
    const folder = folders.find(f => f.id === id);
    const updated: JournalFolder = {
      ...(folder || { id, name: trimmed, icon: icon || 'Folder', count: 0 }),
      name: trimmed,
      icon: icon || folder?.icon || 'Folder',
    };
    const success = await saveFolderApi(updated);
    if (!success) {
      addToast('Error', 'Failed to update folder in database', 'error');
      return false;
    }
    setFolders(prev => prev.map(f => f.id === id ? updated : f));
    addToast('Folder Saved', trimmed, 'success');
    return true;
  };

  const deleteFolder = async (id: string): Promise<boolean> => {
    return await softDeleteFolder(id);
  };

  const softDeleteFolder = async (id: string): Promise<boolean> => {
    if (['f-all', 'f-trade', 'f-daily', 'f-sessions', 'f-goals', 'f-plan', 'f-templates'].includes(id)) {
      addToast('System Folder', 'Default system folders cannot be deleted', 'warning');
      return false;
    }
    const success = await softDeleteFolderApi(id);
    if (!success) {
      addToast('Error', 'Failed to delete folder from database', 'error');
      return false;
    }
    const nowIso = new Date().toISOString();
    // Soft delete folder and notes in state
    setFolders(prev => prev.map(f => f.id === id ? { ...f, isDeleted: true, deletedAt: nowIso, deletedBy: currentUserId } : f));
    setNotes(prev => prev.map(n => n.folderId === id ? { ...n, isDeleted: true, deletedAt: nowIso, deletedBy: currentUserId, originalFolderId: id } : n));

    if (selectedFolderId === id) setSelectedFolderId('f-all');
    if (selectedNote && selectedNote.folderId === id) {
      const remainingActive = notes.filter(n => n.folderId !== id && !n.isDeleted);
      setSelectedNote(remainingActive.length > 0 ? remainingActive[0] : null);
    }
    addToast('Folder Moved to Trash', 'Folder and its notes moved to Trash (auto-deleted in 2 days)', 'info');
    return true;
  };

  const restoreFolder = async (id: string): Promise<boolean> => {
    const success = await restoreFolderApi(id);
    if (!success) {
      addToast('Error', 'Failed to restore folder from database', 'error');
      return false;
    }
    setFolders(prev => prev.map(f => f.id === id ? { ...f, isDeleted: false, deletedAt: undefined, deletedBy: undefined } : f));
    setNotes(prev => prev.map(n => (n.folderId === id || n.originalFolderId === id) ? { ...n, isDeleted: false, deletedAt: undefined, deletedBy: undefined, folderId: id } : n));
    addToast('Folder Restored', 'Folder and its notes have been restored', 'success');
    return true;
  };

  const permanentDeleteFolder = async (id: string): Promise<boolean> => {
    // Delete attachments of all child notes
    const childNotes = notes.filter(n => n.folderId === id || n.originalFolderId === id);
    const urlsToDelete = childNotes.flatMap(n => [
      ...(n.screenshots || []),
      ...(n.attachments?.map(a => a.url) || []),
    ]).filter(Boolean);

    if (urlsToDelete.length > 0) {
      SupabaseStorageService.deleteMultipleJournalAttachments(urlsToDelete).catch(e =>
        console.warn('[Storage] Error deleting folder attachments:', e)
      );
    }

    const success = await permanentDeleteFolderApi(id);
    if (!success) {
      addToast('Error', 'Failed to permanently delete folder from database', 'error');
      return false;
    }

    setFolders(prev => prev.filter(f => f.id !== id));
    setNotes(prev => prev.filter(n => n.folderId !== id && n.originalFolderId !== id));

    if (selectedFolderId === id) setSelectedFolderId('f-all');
    addToast('Folder Permanently Deleted', 'Folder and its notes permanently removed', 'info');
    return true;
  };

  const emptyTrash = async (): Promise<void> => {
    const deletedNotes = notes.filter(n => n.isDeleted);
    const deletedFolders = folders.filter(f => f.isDeleted);

    // Delete all attachments
    const urlsToDelete = deletedNotes.flatMap(n => [
      ...(n.screenshots || []),
      ...(n.attachments?.map(a => a.url) || []),
    ]).filter(Boolean);

    if (urlsToDelete.length > 0) {
      SupabaseStorageService.deleteMultipleJournalAttachments(urlsToDelete).catch(console.warn);
    }

    // Call permanent delete for each note & folder
    await Promise.allSettled([
      ...deletedNotes.map(n => permanentDeleteNoteApi(n.id)),
      ...deletedFolders.map(f => permanentDeleteFolderApi(f.id)),
    ]);

    setNotes(prev => prev.filter(n => !n.isDeleted));
    setFolders(prev => prev.filter(f => !f.isDeleted));
    addToast('Trash Emptied', 'All items in trash permanently deleted', 'info');
  };

  const purgeExpiredTrash = async (): Promise<void> => {
    const twoDaysAgo = Date.now() - 2 * 24 * 60 * 60 * 1000;
    const expiredNotes = notes.filter(n => n.isDeleted && n.deletedAt && new Date(n.deletedAt).getTime() <= twoDaysAgo);

    if (expiredNotes.length > 0) {
      const urlsToDelete = expiredNotes.flatMap(n => [
        ...(n.screenshots || []),
        ...(n.attachments?.map(a => a.url) || []),
      ]).filter(Boolean);
      if (urlsToDelete.length > 0) {
        SupabaseStorageService.deleteMultipleJournalAttachments(urlsToDelete).catch(console.warn);
      }
    }

    await purgeExpiredTrashApi();

    setNotes(prev => prev.filter(n => !(n.isDeleted && n.deletedAt && new Date(n.deletedAt).getTime() <= twoDaysAgo)));
    setFolders(prev => prev.filter(f => !(f.isDeleted && f.deletedAt && new Date(f.deletedAt).getTime() <= twoDaysAgo)));
  };

  // Goals & Risk Engine
  const getAccountRiskGoals = useCallback((accountId?: string): RiskGoalSettings => {
    if (accountId && accountId !== 'all' && accountRiskProfiles[accountId]) {
      return { ...riskGoals, ...accountRiskProfiles[accountId] };
    }
    return riskGoals;
  }, [riskGoals, accountRiskProfiles]);

  const updateRiskGoals = async (goals: Partial<RiskGoalSettings>, accountId?: string) => {
    const isSpecific = accountId && accountId !== 'all';
    if (isSpecific) {
      const existing = accountRiskProfiles[accountId] || riskGoals;
      const updated: RiskGoalSettings = { ...existing, ...goals, tradingAccountId: accountId };
      setAccountRiskProfiles(prev => ({ ...prev, [accountId]: updated }));
      await saveRiskGoalsApi(updated, accountId);
    } else {
      const updated: RiskGoalSettings = { ...riskGoals, ...goals };
      setRiskGoals(updated);
      await saveRiskGoalsApi(updated);
    }
    addToast('Risk Rules Updated', 'New targets and limit parameters saved', 'success');
  };

  const unlockRiskAccount = async (accountId: string, unlockReason: string, unlockedBy: string = 'Trader'): Promise<boolean> => {
    try {
      const res = await unlockRiskAccountApi(accountId, unlockReason, unlockedBy);
      if (res) {
        if (accountId && accountId !== 'all') {
          setAccountRiskProfiles(prev => ({ ...prev, [accountId]: res }));
        } else {
          setRiskGoals(res);
        }
      } else {
        const fallbackGoals: Partial<RiskGoalSettings> = {
          circuitBreakerTriggered: false,
          circuitBreakerState: 'ARMED',
          hardLockEnabled: false,
          unlockedAt: new Date().toISOString(),
          unlockedBy,
          unlockReason,
        };
        await updateRiskGoals(fallbackGoals, accountId);
      }
      addToast('Account Unlocked', 'Circuit Breaker reset. Trading authorization restored.', 'success');
      return true;
    } catch (e) {
      addToast('Unlock Error', 'Failed to unlock account', 'error');
      return false;
    }
  };

  // Calendar
  const toggleEventFavorite = (id: string) => {
    setCalendarEvents(prev => prev.map(ev => ev.id === id ? { ...ev, isFavorite: !ev.isFavorite } : ev));
  };

  const toggleEventReminder = (id: string) => {
    setCalendarEvents(prev => prev.map(ev => ev.id === id ? { ...ev, hasReminder: !ev.hasReminder } : ev));
    addToast('Reminder Toggled', 'Notification set for economic release', 'info');
  };

  // Notifications
  const markNotificationRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
    addToast('Cleared', 'All notifications cleared', 'info');
  };

  // Lounge
  const toggleLikePost = async (id: string) => {
    // Optimistic UI update
    setCommunityPosts((prev) =>
      prev.map((p) => {
        if (p.id === id) {
          const hasLiked = !p.hasLiked;
          return {
            ...p,
            hasLiked,
            likes: hasLiked ? p.likes + 1 : Math.max(0, p.likes - 1),
          };
        }
        return p;
      })
    );
    try {
      const res = await toggleLikePostApi(id);
      if (res && typeof res.likesCount === 'number') {
        setCommunityPosts((prev) =>
          prev.map((p) => (p.id === id ? { ...p, likes: res.likesCount, hasLiked: res.liked } : p))
        );
      }
    } catch (error: any) {
      addToast('Error', error.message || 'Failed to toggle like', 'error');
      const freshPosts = await fetchCommunityPostsApi();
      if (freshPosts.length > 0) setCommunityPosts(freshPosts);
    }
  };

  const addCommunityPost = async (content: string, symbol?: string, pnl?: string, rMultiple?: string, imageUrl?: string) => {
    try {
      const saved = await saveCommunityPostApi({
        content,
        symbol,
        pnl,
        rMultiple,
        imageUrl,
      });
      if (saved) {
        setCommunityPosts((prev) => {
          if (prev.some((p) => p.id === saved.id)) return prev;
          return [saved, ...prev];
        });
        addToast('Post Published', 'Trade idea shared in Lounge', 'success');
      }
    } catch (error: any) {
      addToast('Post Failed', error.message || 'Could not publish post', 'error');
    }
  };

  const deleteCommunityPost = async (id: string) => {
    try {
      await deleteCommunityPostApi(id);
      setCommunityPosts((prev) => prev.filter((p) => p.id !== id));
      addToast('Post Deleted', 'Your post has been removed', 'info');
    } catch (error: any) {
      addToast('Action Failed', error.message || 'Could not delete post', 'error');
    }
  };

  const addPostComment = async (postId: string, content: string) => {
    try {
      const res = await addPostCommentApi(postId, content);
      if (res && res.comment) {
        setCommunityPosts((prev) =>
          prev.map((p) => {
            if (p.id === postId) {
              const existing = p.comments || [];
              const commentExists = existing.some((c) => c.id === res.comment.id);
              const newComments = commentExists ? existing : [...existing, res.comment];
              return {
                ...p,
                commentsCount: Math.max(res.commentsCount, newComments.length),
                comments: newComments,
              };
            }
            return p;
          })
        );
      }
    } catch (error: any) {
      addToast('Comment Failed', error.message || 'Could not post comment', 'error');
    }
  };

  const deletePostComment = async (postId: string, commentId: string) => {
    try {
      const res = await deletePostCommentApi(postId, commentId);
      setCommunityPosts((prev) =>
        prev.map((p) => {
          if (p.id === postId) {
            const newComments = (p.comments || []).filter((c) => c.id !== commentId);
            return {
              ...p,
              commentsCount: Math.max(res.commentsCount, newComments.length),
              comments: newComments,
            };
          }
          return p;
        })
      );
      addToast('Comment Removed', 'Comment deleted', 'info');
    } catch (error: any) {
      addToast('Action Failed', error.message || 'Could not delete comment', 'error');
    }
  };

  // Formatters
  const formatCurrency = (val: number, customMode?: CurrencyDisplayMode) => {
    const mode = customMode || currencyMode || userSettings.general?.currencyMode || 'USD';
    if (mode === 'PRIVACY') {
      return '••••••';
    }
    if (mode === 'PERCENT') {
      const activeAccount = accounts.find(a => a.id === selectedAccountId);
      const base = activeAccount?.startingBalance || 50000;
      const pct = (val / base) * 100;
      const precision = typeof userSettings.general?.percentagePrecision === 'number'
        ? userSettings.general.percentagePrecision
        : 2;
      return `${pct >= 0 ? '+' : ''}${pct.toFixed(precision)}%`;
    }
    if (mode === 'R_MULTIPLE') {
      const riskPerR = userSettings.tradeDefaults?.maxPlannedRisk || 400;
      const r = val / riskPerR;
      return `${r >= 0 ? '+' : ''}${r.toFixed(2)}R`;
    }
    if (mode === 'TICKS') {
      const ticks = Math.round(val / 12.5);
      return `${ticks >= 0 ? '+' : ''}${ticks} ticks`;
    }

    const activeCurrency = userProfile.preferredCurrency || userSettings.general?.currency || 'USD';
    const numberFormatLocale = userSettings.general?.numberFormat || 'en-US';
    const decimalPrecision = typeof userSettings.general?.decimalPrecision === 'number'
      ? userSettings.general.decimalPrecision
      : 2;

    let formatted = '';
    try {
      formatted = new Intl.NumberFormat(numberFormatLocale, {
        style: 'currency',
        currency: activeCurrency,
        minimumFractionDigits: decimalPrecision,
        maximumFractionDigits: decimalPrecision,
      }).format(Math.abs(val));
    } catch {
      try {
        formatted = new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: activeCurrency,
          minimumFractionDigits: decimalPrecision,
          maximumFractionDigits: decimalPrecision,
        }).format(Math.abs(val));
      } catch {
        formatted = new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: decimalPrecision,
          maximumFractionDigits: decimalPrecision,
        }).format(Math.abs(val));
      }
    }

    return val < 0 ? `-${formatted}` : formatted;
  };

  const formatRMultiple = (r: number) => {
    return `${r >= 0 ? '+' : ''}${r.toFixed(2)}R`;
  };

  const currentTimezone = userProfile.timezone || userSettings.general?.timezone || 'America/New_York';
  const currentDateFormat = userSettings.general?.dateFormat || 'YYYY-MM-DD';
  const currentTimeFormat = userSettings.general?.timeFormat || '12h';

  const formatDate = (
    dateInput: string | number | Date | null | undefined,
    options?: Intl.DateTimeFormatOptions
  ) => {
    return formatTimezoneDate(dateInput, currentTimezone, options, currentDateFormat);
  };

  const formatTime = (
    dateInput: string | number | Date | null | undefined,
    options?: Intl.DateTimeFormatOptions
  ) => {
    return formatTimezoneTime(dateInput, currentTimezone, options, currentTimeFormat);
  };

  const formatTradeTimestamp = (
    dateInput: string | number | Date | null | undefined
  ) => {
    return utilsFormatTradeTimestamp(dateInput, currentTimezone, currentDateFormat, currentTimeFormat);
  };

  const resetToSampleData = () => {
    setTrades(INITIAL_TRADES);
    setAccounts(INITIAL_ACCOUNTS);
    setPlaybooks(INITIAL_PLAYBOOKS);
    setNotes(INITIAL_NOTES);
    setRiskGoals(INITIAL_RISK_GOALS);
    addToast('Data Reset', 'Restored pristine sample trading records', 'info');
  };

  const clearAllTradesData = () => {
    setTrades([]);
    addToast('Cleared All Trades', 'Trade history wiped clean', 'warning');
  };

  // Institutional Settings Handlers
  const updateUserSettings = async (
    newSettings: Partial<UserSettings> | ((prev: UserSettings) => UserSettings)
  ) => {
    setUserSettings((prev) => {
      const updated = typeof newSettings === 'function' ? newSettings(prev) : { ...prev, ...newSettings };
      if (updated.general?.theme) {
        const resolvedTheme = updated.general.theme === 'system'
          ? (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
          : updated.general.theme;
        if (resolvedTheme !== theme) {
          setTheme(resolvedTheme);
        }
      }
      if (updated.general?.currencyMode && updated.general.currencyMode !== currencyMode) {
        setCurrencyMode(updated.general.currencyMode);
      }
      saveUserSettingsApi(updated, updated.accountId).catch((err) =>
        console.warn('Failed to persist user settings:', err)
      );
      return updated;
    });
  };

  const saveUserSettingsToServer = async (settingsToSave?: UserSettings, accountId?: string): Promise<UserSettings> => {
    const target = settingsToSave || userSettings;
    try {
      const saved = await saveUserSettingsApi(target, accountId);
      setUserSettings(saved);
      addToast('Settings Saved', 'All preferences and rules persisted successfully', 'success');
      return saved;
    } catch (err: any) {
      addToast('Save Failed', err?.message || 'Could not persist settings', 'error');
      throw err;
    }
  };

  const addCustomTag = async (tag: Omit<CustomTag, 'id' | 'createdAt'>): Promise<CustomTag> => {
    const newTag: CustomTag = {
      ...tag,
      id: `tag-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
    };
    setCustomTags((prev) => [newTag, ...prev]);
    try {
      const saved = await saveCustomTagApi(newTag);
      addToast('Tag Created', `Tag "${saved.name}" added to library`, 'success');
      return saved;
    } catch (err) {
      console.warn('Failed to save tag to server:', err);
      return newTag;
    }
  };

  const updateCustomTag = async (tag: CustomTag): Promise<CustomTag> => {
    setCustomTags((prev) => prev.map((t) => (t.id === tag.id ? tag : t)));
    try {
      const saved = await saveCustomTagApi(tag);
      addToast('Tag Updated', `Tag "${saved.name}" updated`, 'success');
      return saved;
    } catch (err) {
      console.warn('Failed to update tag:', err);
      return tag;
    }
  };

  const deleteCustomTag = async (id: string): Promise<void> => {
    setCustomTags((prev) => prev.filter((t) => t.id !== id));
    try {
      await deleteCustomTagApi(id);
      addToast('Tag Deleted', 'Tag removed from library', 'info');
    } catch (err) {
      console.warn('Failed to delete tag:', err);
    }
  };

  const addImportHistoryRecord = async (item: ImportHistoryItem): Promise<void> => {
    setImportHistory((prev) => [item, ...prev]);
    try {
      await recordImportHistoryApi(item);
    } catch (err) {
      console.warn('Failed to save import history:', err);
    }
  };

  const addActivityLog = async (item: Omit<ActivityLogItem, 'id' | 'createdAt'>): Promise<void> => {
    const logItem: ActivityLogItem = {
      ...item,
      id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
    };
    setActivityLogs((prev) => [logItem, ...prev]);
    try {
      await recordActivityLogApi(item);
    } catch (err) {
      console.warn('Failed to record activity log:', err);
    }
  };

  const createBackup = async (name?: string, backupData?: any): Promise<UserBackup> => {
    const dataToStore = backupData || {
      trades,
      notes,
      folders,
      playbooks,
      strategies,
      riskGoals,
      settings: userSettings,
      tags: customTags,
      exportDate: new Date().toISOString(),
    };
    try {
      const backup = await createUserBackupApi(name, dataToStore);
      setUserBackups((prev) => [backup, ...prev]);
      addToast('Backup Created', `Snapshot "${backup.name}" created successfully`, 'success');
      return backup;
    } catch (err: any) {
      addToast('Backup Failed', err?.message || 'Could not create backup', 'error');
      throw err;
    }
  };

  const deleteBackup = async (id: string): Promise<void> => {
    setUserBackups((prev) => prev.filter((b) => b.id !== id));
    try {
      await deleteUserBackupApi(id);
      addToast('Backup Deleted', 'Backup snapshot removed', 'info');
    } catch (err) {
      console.warn('Failed to delete backup:', err);
    }
  };

  const restoreBackup = async (backup: UserBackup): Promise<void> => {
    try {
      const data = backup.backupData;
      if (!data) throw new Error('Backup data is empty');
      if (Array.isArray(data.trades)) {
        setTrades(data.trades);
      }
      if (Array.isArray(data.notes)) {
        setNotes(data.notes);
      }
      if (Array.isArray(data.folders)) {
        setFolders(data.folders);
      }
      if (Array.isArray(data.playbooks)) {
        setPlaybooks(data.playbooks);
      }
      if (Array.isArray(data.strategies)) {
        setStrategies(data.strategies);
      }
      if (data.settings) {
        setUserSettings(data.settings);
      }
      if (Array.isArray(data.tags)) {
        setCustomTags(data.tags);
      }
      addToast('Backup Restored', `Restored data from snapshot "${backup.name}"`, 'success');
    } catch (err: any) {
      addToast('Restore Failed', err?.message || 'Failed to restore snapshot', 'error');
      throw err;
    }
  };

  const executeDataReset = async (
    resetType: 'wipeAll' | 'trades' | 'journal' | 'settings',
    confirmationPhrase: string
  ): Promise<void> => {
    try {
      const result = await executeDataResetApi(resetType, confirmationPhrase);
      if (resetType === 'trades') {
        setTrades([]);
      } else if (resetType === 'journal') {
        setNotes([]);
        setFolders([]);
      } else if (resetType === 'settings') {
        setUserSettings(createDefaultUserSettings());
      } else if (resetType === 'wipeAll') {
        setTrades([]);
        setNotes([]);
        setFolders([]);
        setUserSettings(createDefaultUserSettings());
      }
      addToast('Data Reset Complete', result.message || 'Operation executed successfully', 'warning');
    } catch (err: any) {
      addToast('Reset Failed', err?.message || 'Operation rejected', 'error');
      throw err;
    }
  };

  const refreshState = async () => {
    try {
      const data = await fetchInitialState();
      if (data && data.success) {
        if (Array.isArray(data.accounts)) setAccounts(data.accounts);
        if (Array.isArray(data.connections)) setConnections(data.connections);
        if (Array.isArray(data.trades)) setTrades(data.trades);
        if (Array.isArray(data.playbooks)) setPlaybooks(data.playbooks);
        if (Array.isArray(data.strategies)) setStrategies(data.strategies);
        if (Array.isArray(data.propFirmAccounts)) {
          setPropFirmAccounts(data.propFirmAccounts);
          persistPropFirmAccounts(data.propFirmAccounts);
          if (data.propFirmAccounts.length > 0) {
            setSelectedPropFirmAccountId((curr) =>
              curr && data.propFirmAccounts.some((a: PropFirmAccount) => a.id === curr)
                ? curr
                : data.propFirmAccounts[0].id
            );
          }
        }
      }
    } catch (e) {
      console.warn('refreshState failed:', e);
    }
  };

  return (
    <TradingContext.Provider
      value={{
        activeView,
        setActiveView,
        currencyMode,
        setCurrencyMode,
        theme,
        setTheme,
        accounts,
        selectedAccountId,
        setSelectedAccountId,
        addAccount,
        updateAccount,
        deleteAccount,
        connections,
        setConnections,
        refreshState,
        propFirmAccounts,
        selectedPropFirmAccountId,
        setSelectedPropFirmAccountId,
        addPropFirmAccount,
        updatePropFirmAccount,
        deletePropFirmAccount,
        addPropFirmViolation,
        recordPropFirmPayout,
        trades,
        filteredTrades,
        addTrade,
        updateTrade,
        deleteTrade,
        duplicateTrade,
        bulkDeleteTrades,
        bulkEditTrades,
        importTrades,
        undoLastDelete,
        canUndo: deletedTradesStack.length > 0,
        selectedTrade,
        setSelectedTrade,
        isAddTradeOpen,
        setIsAddTradeOpen,
        isCommandPaletteOpen,
        setIsCommandPaletteOpen,
        dateRange,
        setDateRange,
        playbooks: computedPlaybooks,
        addPlaybook,
        updatePlaybook,
        deletePlaybook,
        duplicatePlaybook,
        archivePlaybook,
        strategies: computedStrategies,
        addStrategy,
        notes,
        folders,
        selectedNote,
        setSelectedNote,
        selectedFolderId,
        setSelectedFolderId,
        addNote,
        updateNote,
        deleteNote,
        softDeleteNote,
        restoreNote,
        permanentDeleteNote,
        addFolder,
        updateFolder,
        deleteFolder,
        softDeleteFolder,
        restoreFolder,
        permanentDeleteFolder,
        emptyTrash,
        purgeExpiredTrash,
        riskGoals,
        accountRiskProfiles,
        getAccountRiskGoals,
        updateRiskGoals,
        unlockRiskAccount,
        calendarEvents,
        toggleEventFavorite,
        toggleEventReminder,
        notifications,
        markNotificationRead,
        clearAllNotifications,
        userProfile,
        updateUserProfile,
        regenerateAccountCode,
        mentorStudents,
        mentorRequests,
        activeStudentImpersonation,
        setActiveStudentImpersonation,
        connectStudentByCode,
        approveMentorRequest,
        declineMentorRequest,
        disconnectStudent,
        mentorDirectivesSent,
        mentorDirectivesReceived,
        dispatchMentorDirective,
        acknowledgeMentorDirective,
        communityPosts,
        currentUserId,
        toggleLikePost,
        addCommunityPost,
        deleteCommunityPost,
        addPostComment,
        deletePostComment,
        leaderboard,
        fetchLeaderboard,
        updateUserPointsAdmin,
        updateUserRoleAdmin,
        toasts,
        addToast,
        removeToast,
        formatCurrency,
        formatRMultiple,
        currentTimezone,
        formatDate,
        formatTime,
        formatTradeTimestamp,
        resetToSampleData,
        clearAllTradesData,
        authUser,
        isAuthenticated,
        setIsAuthenticated,
        isAuthLoading,
        isSyncingData,
        refreshInitialState,
        resendEmailVerification,
        isAuthModalOpen,
        setIsAuthModalOpen,
        logout,
        userSettings,
        updateUserSettings,
        saveUserSettingsToServer,
        customTags,
        addCustomTag,
        updateCustomTag,
        deleteCustomTag,
        importHistory,
        addImportHistoryRecord,
        activityLogs,
        addActivityLog,
        userBackups,
        createBackup,
        deleteBackup,
        restoreBackup,
        executeDataReset,
      }}
    >
      {children}
    </TradingContext.Provider>
  );
};

export const useTrading = () => {
  const context = useContext(TradingContext);
  if (!context) {
    throw new Error('useTrading must be used within a TradingProvider');
  }
  return context;
};
