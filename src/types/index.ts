export type MarketType = 'Forex' | 'Futures' | 'Crypto' | 'Stocks' | 'Indices' | 'Commodities' | 'CFDs';
export type TradeDirection = 'BUY' | 'SELL';
export type TradeStatus = 'OPEN' | 'CLOSED' | 'CANCELLED';
export type SessionType = 'London' | 'New York' | 'Asian' | 'Pre-Market' | 'After-Hours' | 'Overlap' | 'Sydney' | 'Custom';
export type CurrencyDisplayMode = 'USD' | 'PERCENT' | 'R_MULTIPLE' | 'TICKS' | 'PRIVACY';
export type TradeSource = 'manual' | 'mt5' | 'ctrader' | 'dxtrade' | 'matchtrader' | 'api' | 'csv';

export interface Trade {
  id: string;
  accountId: string;
  propFirmAccountId?: string;
  connectionId?: string;
  externalTradeId?: string;
  platform?: string;
  broker?: string;
  source?: TradeSource;
  orderId?: string;
  positionId?: string;
  symbol: string;
  market: MarketType;
  direction: TradeDirection;
  status: TradeStatus;
  entryDate: string; // ISO string
  exitDate?: string; // ISO string
  entryPrice: number;
  exitPrice?: number;
  stopLoss?: number;
  takeProfit?: number;
  quantity: number; // lots, contracts, or shares
  grossPnl: number;
  netPnl: number;
  commission: number;
  swap: number;
  fees: number;
  rMultiple: number; // e.g. +2.4R or -1.0R
  roiPercent: number;
  session: SessionType;
  strategyId?: string;
  playbookId?: string;
  setupId?: string;
  setupType: string;
  setupGrade?: 'A+' | 'A' | 'B' | 'C' | 'D';
  autoGrade?: 'A+' | 'A' | 'B' | 'C' | 'D';
  ruleCompliancePercent?: number;
  checkedRuleIds?: string[];
  brokenRuleIds?: string[];
  mistakeCategory?: string;
  mistakeDescription?: string;
  mistakeSeverity?: 'Low' | 'Medium' | 'High';
  rating: number; // 1 to 5 stars
  notes: string;
  tags: string[];
  mistakes: string[];
  rulesFollowed: boolean;
  screenshotUrl?: string;
  afterScreenshotUrl?: string;
  durationMinutes: number;
  emotionalState?: 'Disciplined' | 'Confident' | 'Neutral' | 'FOMO' | 'Revenge' | 'Hesitant' | 'Greedy';
  executionMethod?: 'MANUAL' | 'EA' | 'BOT' | 'API';
  isCopyTrade?: boolean;
  isNewsTrade?: boolean;
  leverage?: number;
}

export type ConnectionPlatform = 'MT5' | 'CTRADER' | 'DXTRADE' | 'MATCH_TRADER' | 'BROKER_API' | 'CSV';
export type ConnectionStatus = 'CONNECTED' | 'SYNCING' | 'SYNCED' | 'DISCONNECTED' | 'ERROR' | 'REAUTH_REQUIRED';

export interface TradingAccountConnection {
  id: string;
  userId: string;
  accountId: string;
  platform: ConnectionPlatform;
  broker: string;
  server?: string;
  accountNumber: string;
  accountName?: string;
  currency: string;
  accountType: 'LIVE' | 'DEMO' | 'PROP_FIRM';
  connectionStatus: ConnectionStatus;
  syncEnabled: boolean;
  autoSyncIntervalMins: number;
  importScope: 'ALL' | 'DATE';
  importStartDate?: string;
  lastSyncAt?: string;
  lastSyncError?: string;
  lastSyncTradesCount: number;
  balance: number;
  equity: number;
  leverage: number;
  metadata?: Record<string, any>;
  createdAt?: string;
  updatedAt?: string;
}

export interface ConnectionSyncLog {
  id: string;
  connectionId: string;
  userId: string;
  status: 'SUCCESS' | 'FAILED' | 'PARTIAL' | 'SYNCING';
  tradesImported: number;
  tradesUpdated: number;
  errorMessage?: string;
  details?: Record<string, any>;
  startedAt: string;
  completedAt?: string;
  durationMs?: number;
  createdAt?: string;
}

export interface TradingAccount {
  id: string;
  name: string;
  broker: string;
  accountNumber?: string;
  type: 'LIVE' | 'DEMO' | 'PROP_FIRM';
  currency: string;
  initialBalance: number;
  startingBalance?: number;
  currentBalance: number;
  isDefault: boolean;
  isArchived?: boolean;
  color?: string;
  createdAt?: string;
  lastSync?: string;
  syncStatus: 'HEALTHY' | 'SYNCING' | 'DISCONNECTED' | 'ERROR';
}

export interface PlaybookRule {
  id: string;
  text: string;
  category: 'ENTRY' | 'EXIT' | 'RISK' | 'MARKET' | 'INVALIDATION';
  required: boolean;
  active?: boolean;
  order?: number;
}

export interface PlaybookSetupCondition {
  id: string;
  text: string;
  required: boolean;
}

export interface PlaybookSetup {
  id: string;
  playbookId?: string;
  name: string;
  description?: string;
  conditions: PlaybookSetupCondition[];
}

export interface Playbook {
  id: string;
  name: string;
  icon: string; // emoji or icon name
  color: string;
  description: string;
  market?: MarketType;
  instrument?: string;
  direction?: 'Long' | 'Short' | 'Both';
  session?: SessionType;
  primaryTimeframe?: string;
  strategyType?: string;
  riskPerTrade?: number; // percentage, e.g. 1%
  minRiskReward?: string; // e.g. "1:2"
  maxTradesPerSession?: number;
  dailyLossLimit?: number;
  status: 'A_PLUS' | 'STANDARD' | 'EXPERIMENTAL' | 'DEPRECATED' | 'Active' | 'Paused' | 'Archived';
  rules: PlaybookRule[];
  setups?: PlaybookSetup[];
  exampleScreenshots: string[];
  totalTrades: number;
  winRate: number;
  netPnl: number;
  profitFactor: number;
  avgWinner: number;
  avgLoser: number;
  expectancy: number;
  missedTradesCount: number;
  isPrivate: boolean;
  createdAt?: string;
}

export interface Strategy {
  id: string;
  name: string;
  description: string;
  timeframe: string;
  marketType: MarketType;
  winRate: number;
  totalTrades: number;
  netPnl: number;
  profitFactor: number;
  rules: string[];
  isActive: boolean;
}

export interface JournalAttachment {
  id: string;
  name: string;
  url: string;
  type: string;
  size?: number;
  date?: string;
}

export interface JournalNote {
  id: string;
  accountId: string;
  date: string;
  time?: string;
  title: string;
  folderId: string;
  tags: string[];
  content: string;
  tradeId?: string;
  symbol?: string;
  side?: 'Long' | 'Short' | 'BUY' | 'SELL';
  setup?: string;
  timeframe?: string;
  resultR?: string;
  accountName?: string;
  entryPrice?: number;
  exitPrice?: number;
  stopLoss?: number;
  takeProfit?: number;
  riskReward?: string;
  isDeleted?: boolean;
  deletedAt?: string;
  deletedBy?: string;
  originalFolderId?: string;
  attachments?: JournalAttachment[];
  preMarketPlan?: {
    bias?: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
    keyLevels?: string;
    newsEvents?: string;
    maxRiskPerTrade?: string;
    checklist?: { id: string; text: string; checked: boolean }[];
  };
  postMarketReview?: {
    whatWentWell?: string;
    whatWentWrong?: string;
    lessonsLearned?: string;
    disciplineRating?: number; // 1 to 5
    emotionalRating?: number; // 1 to 5
    executionGrade?: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
  };
  contractsTraded?: number;
  volume?: number;
  netPnl?: number;
  netRoi?: number;
  screenshots?: string[];
  templateUsed?: string;
  isFavorite?: boolean;
}

export interface JournalFolder {
  id: string;
  name: string;
  icon?: string;
  count?: number;
  isDeleted?: boolean;
  deletedAt?: string;
  deletedBy?: string;
}

export type RiskMode = 'FIXED_DOLLAR' | 'PERCENTAGE' | 'LOWER_OF_BOTH';
export type CircuitBreakerStatus = 'DISARMED' | 'ARMED' | 'CAUTION' | 'CRITICAL' | 'TRIGGERED' | 'LOCKED';
export type DrawdownMethodology = 'EQUITY_BASED' | 'END_OF_DAY' | 'STATIC' | 'PROP_RULE';
export type WeeklyTargetAction = 'CONTINUE' | 'REDUCE_RISK_WARN' | 'LOCK_TRADING';

export interface RiskEvent {
  id: string;
  timestamp: string;
  userId?: string;
  accountId?: string;
  accountName?: string;
  eventType: 'BREACH' | 'WARNING' | 'CIRCUIT_BREAKER_TRIGGERED' | 'CIRCUIT_BREAKER_ARMED' | 'CIRCUIT_BREAKER_RESET' | 'HARD_LOCK' | 'MANUAL_UNLOCK' | 'ORDER_BLOCKED';
  rule: string;
  currentValue: string;
  limitValue: string;
  severity: 'INFO' | 'CAUTION' | 'CRITICAL' | 'BLOCKED';
  actionTaken: string;
  notes?: string;
  unlockedBy?: string;
  unlockReason?: string;
  metadata?: Record<string, any>;
}

export interface RiskMetricState {
  name: string;
  current: number;
  limit: number;
  unit: '$' | '%' | 'trades' | 'contracts' | 'R' | 'count';
  percentUsed: number;
  status: 'NORMAL' | 'CAUTION' | 'CRITICAL' | 'BREACHED';
  message: string;
}

export interface RiskGoalSettings {
  id?: string;
  userId?: string;
  tradingAccountId?: string;
  dailyProfitTarget?: number;
  weeklyProfitTarget?: number;
  monthlyProfitTarget?: number;
  maxDailyLoss?: number;
  dailyMaxLoss?: number;
  maxWeeklyLoss?: number;
  weeklyLossLimit?: number;
  maxDrawdown?: number;
  maxDrawdownLimit?: number;
  trailingDrawdownLimit?: number;
  maxRiskPerTradePercent?: number;
  maxRiskPerTradeAmount?: number;
  riskMode?: RiskMode;
  maxTradesPerDay?: number;
  maxConsecutiveLosses?: number;
  maxContractsPerTrade?: number;
  maxDailyLossStreak?: number;
  minRMultiple?: number;
  maxPositionSize?: number;
  maxOpenPositions?: number;
  enforceCircuitBreaker?: boolean;
  circuitBreakerTriggered?: boolean;
  circuitBreakerState?: CircuitBreakerStatus;
  hardLockEnabled?: boolean;
  warningThresholdPercent?: number;
  criticalThresholdPercent?: number;
  timezone?: string;
  dailyResetTime?: string;
  includeFloatingPnl?: boolean;
  includeFees?: boolean;
  includeCommissions?: boolean;
  drawdownMethodology?: DrawdownMethodology;
  weeklyTargetAction?: WeeklyTargetAction;
  requireManualUnlock?: boolean;
  lockReason?: string;
  lockedAt?: string;
  unlockedAt?: string;
  unlockedBy?: string;
  unlockReason?: string;
}

export interface EconomicEvent {
  id: string;
  time: string;
  date: string;
  country: string;
  currency: string;
  event: string;
  impact: 'HIGH' | 'MEDIUM' | 'LOW';
  actual?: string;
  forecast?: string;
  previous?: string;
  isFavorite?: boolean;
  hasReminder?: boolean;
}

export interface BacktestCandle {
  time: string;
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface BacktestTrade {
  id: string;
  symbol: string;
  direction: 'BUY' | 'SELL';
  entryPrice: number;
  exitPrice?: number;
  stopLoss: number;
  takeProfit: number;
  quantity: number;
  entryIndex: number;
  exitIndex?: number;
  entryTime: string;
  exitTime?: string;
  pnl: number;
  rMultiple: number;
  status: 'OPEN' | 'CLOSED';
}

export interface BacktestSession {
  id: string;
  title: string;
  symbol: string;
  timeframe: string;
  strategy: string;
  startDate: string;
  endDate: string;
  initialBalance: number;
  currentBalance: number;
  trades: BacktestTrade[];
  totalTrades: number;
  winRate: number;
  netPnl: number;
  profitFactor: number;
  maxDrawdown: number;
  currentIndex: number;
  notes: string;
}

export interface CommunityPost {
  id: string;
  userId?: string;
  authorName: string;
  authorHandle: string;
  authorAvatar: string;
  badge?: string;
  timestamp: string;
  content: string;
  symbol?: string;
  direction?: 'BUY' | 'SELL';
  pnl?: string;
  rMultiple?: string;
  imageUrl?: string;
  likes: number;
  hasLiked?: boolean;
  commentsCount: number;
  comments?: {
    id: string;
    author: string;
    avatar: string;
    text: string;
    time: string;
    userId?: string;
  }[];
}

export interface MentorStudent {
  id: string;
  code: string;
  name: string;
  email: string;
  avatar: string;
  accountName: string;
  currentBalance: number;
  netPnl: number;
  winRate: number;
  profitFactor: number;
  zellaScore: number;
  totalTrades: number;
  status: 'ACTIVE' | 'PENDING' | 'PAUSED';
  sharedAccounts: string[];
  unreadNotesCount: number;
  disciplineScore?: number;
  joinedDate?: string;
  riskBreached?: boolean;
}

export interface MentorConnectionRequest {
  id: string;
  studentCode: string;
  studentName: string;
  studentEmail: string;
  mentorName: string;
  status: 'PENDING' | 'APPROVED' | 'DECLINED';
  createdAt: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  accountCode: string;
  experienceLevel: string;
  points?: number;
  role?: string;
  isPublic?: boolean;
  avatar?: string;
  avatarUrl?: string;
  country?: string;
  timezone?: string;
  preferredCurrency?: string;
  professionalTitle?: string;
  bio?: string;
  tradingStyle?: string;
  phone?: string;
  updatedAt?: string;
}

export interface MentorDirective {
  id: string;
  mentorId: string;
  studentId: string;
  type: string;
  content: string;
  status: 'PENDING' | 'ACKNOWLEDGED' | 'ACTIVE' | 'ARCHIVED';
  createdAt: string;
  updatedAt?: string;
}

export type MentorFeedback = MentorDirective;

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'TRADE_SYNC' | 'RISK_ALERT' | 'GOAL_ACHIEVED' | 'ECONOMIC_REMINDER' | 'JOURNAL_REMINDER' | 'MENTOR_UPDATE' | 'PROP_FIRM_ALERT';
  timestamp: string;
  read: boolean;
  actionUrl?: string;
}

export type PropFirmRiskState = 'SAFE' | 'WARNING' | 'CRITICAL' | 'BREACHED';
export type PropFirmPhase = 'PHASE_1' | 'PHASE_2' | 'EVALUATION' | 'FUNDED' | 'SIMULATED_FUNDED' | 'CUSTOM';
export type ProgramModelType = 'TWO_STEP' | 'ONE_STEP' | 'INSTANT_FUNDING' | 'FAST_TRACK' | 'CUSTOM';
export type DrawdownModelType = 'STATIC' | 'EOD_TRAILING' | 'INTRADAY_HWM_TRAILING' | 'BALANCE_TRAILING' | 'EQUITY_TRAILING' | 'CUSTOM';
export type DailyDrawdownModelType = 'START_OF_DAY_BALANCE' | 'START_OF_DAY_EQUITY' | 'HIGHEST_EQUITY_OF_DAY' | 'BALANCE_BASED' | 'EQUITY_BASED' | 'REALIZED_ONLY' | 'REALIZED_PLUS_FLOATING' | 'CUSTOM';
export type PropFirmEnforcementMode = 'MONITOR' | 'STRICT';

export type PropFirmRuleType =
  | 'DAILY_DRAWDOWN'
  | 'MAX_DRAWDOWN'
  | 'PROFIT_TARGET'
  | 'MIN_TRADING_DAYS'
  | 'QUALIFYING_DAY'
  | 'MAX_TRADING_DAYS'
  | 'INACTIVITY'
  | 'CONSISTENCY'
  | 'PROFIT_CONCENTRATION'
  | 'NEWS_RESTRICTION'
  | 'WEEKEND_RESTRICTION'
  | 'OVERNIGHT_RESTRICTION'
  | 'EA_RESTRICTION'
  | 'COPY_TRADING'
  | 'HEDGING'
  | 'MAX_POSITION_SIZE'
  | 'LEVERAGE'
  | 'IP_VPN_RESTRICTION'
  | 'PROHIBITED_STRATEGY'
  | 'PROHIBITED_BEHAVIOR'
  | 'PAYOUT_CONDITIONS'
  | 'SCALING_RULE'
  | 'REWARD_BUFFER'
  | 'SYMBOL_EXPOSURE_RISK'
  | 'MIN_TRADE_DURATION'
  | 'AVG_TRADE_DURATION'
  | 'MAX_OPEN_RISK'
  | 'CUSTOM';

export interface PropFirmRule {
  id: string;
  name: string;
  type: PropFirmRuleType;
  description: string;
  enabled: boolean;
  threshold: number;
  unit: 'USD' | 'PERCENT' | 'DAYS' | 'LOTS' | 'CONTRACTS' | 'MINUTES' | 'SECONDS' | 'CUSTOM';
  calculationMethodology: string;
  warningThreshold?: number;
  criticalThreshold?: number;
  currentValue?: number | string;
  status?: 'SAFE' | 'WARNING' | 'CRITICAL' | 'BREACHED' | 'INCOMPLETE' | 'COMPLETED';
  details?: string;
  config?: Record<string, any>;
}

export interface PropFirmPhaseConfig {
  id: string;
  name: string; // e.g. "Phase 1", "Phase 2", "Funded"
  phaseOrder: number;
  phaseType: PropFirmPhase; // 'PHASE_1' | 'PHASE_2' | 'FUNDED' | 'CUSTOM'
  status: 'INACTIVE' | 'ACTIVE' | 'COMPLETED' | 'BREACHED';
  startingBalance: number;
  profitTargetPercent: number;
  profitTargetAmount?: number;
  dailyLossPercent: number;
  dailyLossAmount?: number;
  totalLossPercent: number;
  totalLossAmount?: number;
  drawdownModel?: DrawdownModelType;
  dailyDrawdownModel?: DailyDrawdownModelType;
  minTradingDays?: number;
  maxTradingDays?: number; // 0 or undefined for unlimited
  qualifyingDayProfitPercent?: number;
  consistencyMaxDayPercent?: number;
  maxProfitConcentrationPercent?: number;
  rules?: PropFirmRule[];
  startedAt?: string;
  completedAt?: string;
}

export interface PropFirmViolation {
  id: string;
  accountId: string;
  ruleId: string;
  ruleName: string;
  ruleType: PropFirmRuleType | string;
  timestamp: string;
  relatedTradeId?: string;
  actualValue: number | string;
  allowedValue: number | string;
  severity: 'WARNING' | 'CRITICAL' | 'BREACH';
  explanation: string;
  status: 'ACTIVE' | 'RESOLVED' | 'WAIVED';
}

export interface PropFirmTimelineEvent {
  id: string;
  timestamp: string;
  title: string;
  description: string;
  type: 'CREATE' | 'TRADE' | 'PROGRESS' | 'WARNING' | 'BREACH' | 'QUALIFIED_DAY' | 'PHASE_PASS' | 'PAYOUT';
  metadata?: Record<string, any>;
}

export interface PropFirmPayoutRecord {
  id: string;
  date: string;
  amount: number;
  status: 'PAID' | 'PENDING' | 'REQUESTED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED';
  transactionRef?: string;
  profitSplit: number;
  traderShare?: number;
  firmShare?: number;
  notes?: string;
}

export interface PropFirmPayoutInfo {
  eligibilityDate?: string;
  nextPayoutDate?: string;
  minTradingDaysRequired: number;
  tradingDaysCompleted: number;
  profitSplitPercent: number;
  eligibleProfit: number;
  payoutAmount: number;
  rewardBufferPercent?: number;
  rewardBufferMet?: boolean;
  minRequestAmount?: number;
  payoutHistory: PropFirmPayoutRecord[];
}

export interface PropFirmAccount {
  id: string;
  name: string;
  firmName: string;
  legalEntity?: string;
  tradingBrand?: string;
  registrationNumber?: string;
  jurisdiction?: string;
  termsEffectiveDate?: string;
  rulesVersion?: string;
  accountNumber?: string;
  accountSize?: number;
  startingBalance: number;
  currentBalance: number;
  equity: number;
  highWaterMark?: number;
  programModel?: ProgramModelType;
  phases?: PropFirmPhaseConfig[];
  activePhaseIndex?: number;
  phase: PropFirmPhase;
  phaseName?: string;
  status: 'ACTIVE' | 'WARNING' | 'PASSED' | 'BREACHED' | 'SUSPENDED' | 'COMPLETED' | 'ARCHIVED' | 'FAILED' | 'PAUSED';
  riskState: PropFirmRiskState;
  enforcementMode?: PropFirmEnforcementMode; // MONITOR vs STRICT
  drawdownModel: DrawdownModelType;
  dailyDrawdownModel: DailyDrawdownModelType;
  dailyLossMethod?: 'REALIZED_ONLY' | 'REALIZED_PLUS_FLOATING' | 'START_OF_DAY_EQUITY' | 'START_OF_DAY_BALANCE' | 'HIGHEST_EQUITY_OF_DAY' | 'CUSTOM';
  maxRiskPerSymbolPercent?: number; // e.g. 2% or 1%
  minTradeDurationSec?: number; // e.g. 60 seconds
  avgTradeDurationSec?: number;
  minTradingDays?: number;
  maxTradingDays?: number; // 0 or undefined = unlimited
  startDate?: string;
  deadline?: string;
  qualifyingDayProfitPercent?: number; // e.g. 0.5%
  profitTargetPercent?: number; // e.g. 8%, 5%, 10%, 6%
  dailyLossPercent?: number;
  totalLossPercent?: number;
  profitTargetAmount?: number;
  dailyLossAmount?: number;
  totalLossAmount?: number;
  consistencyMaxDayPercent?: number; // e.g. 20% or 40%
  maxProfitConcentrationPercent?: number; // max % of total profit from single trade/day/symbol
  newsTradingAllowed?: 'ALLOWED' | 'RESTRICTED' | 'PROHIBITED';
  weekendHoldingAllowed?: boolean;
  overnightHoldingAllowed?: boolean;
  eaAllowed?: 'ALLOWED' | 'RESTRICTED' | 'PROHIBITED';
  copyTradingAllowed?: 'ALLOWED' | 'RESTRICTED' | 'PROHIBITED';
  hedgingAllowed?: 'ALLOWED' | 'RESTRICTED' | 'PROHIBITED';
  maxLotSize?: number;
  minLotSize?: number;
  maxPositions?: number;
  maxLeverage?: number;
  ipRestrictions?: { vpnAllowed: boolean; vpsAllowed: boolean; singleIpOnly: boolean };
  prohibitedStrategies?: string[];
  rewardBufferPercent?: number; // e.g. 3%
  rewardSplitPercent?: number; // e.g. 80%
  profitSplitTraderPercent?: number; // e.g. 80%
  profitSplitFirmPercent?: number; // e.g. 20%
  minRewardRequest?: number; // e.g. $100
  payoutFrequency?: 'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'ON_REQUEST';
  activationFee?: number; // Challenge price / activation fee
  inactivityMaxDays?: number; // default 30 days
  newsWindowMinutes?: number; // 5 mins before + 5 mins after
  sessionTimezone: string; // e.g. 'America/New_York', 'UTC'
  currency: string;
  scalingRules?: {
    enabled: boolean;
    thresholdAmount: number;
    scalingPercentage: number;
    maxAccountSize: number;
    currentScaleLevel?: number;
  };
  rules: PropFirmRule[];
  violations: PropFirmViolation[];
  timeline?: PropFirmTimelineEvent[];
  payoutInfo?: PropFirmPayoutInfo;
  tradingAccountLink?: string; // links to TradingAccount id for automatic trade ingestion
  createdAt: string;
  updatedAt?: string;
  notes?: string;
}

export interface PreTradeValidationCheck {
  ruleName: string;
  status: 'PASS' | 'WARN' | 'FAIL';
  message: string;
  metric?: string;
}

export interface PreTradeValidationResult {
  status: 'APPROVED' | 'WARNING' | 'BLOCKED';
  summary: string;
  checks: PreTradeValidationCheck[];
}

export interface CustomTag {
  id: string;
  name: string;
  category: 'Behavior' | 'Mistake' | 'Setup' | 'Market' | 'Execution' | 'Psychology' | 'Custom';
  color: string;
  description?: string;
  isArchived?: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface ImportHistoryItem {
  id: string;
  source: 'CSV' | 'BROKER_SYNC' | 'MANUAL';
  fileName: string;
  tradesProcessed: number;
  tradesAdded: number;
  duplicatesCount: number;
  errorsCount: number;
  status: 'COMPLETED' | 'FAILED' | 'PARTIAL';
  details?: Record<string, any>;
  createdAt: string;
}

export interface ActivityLogItem {
  id: string;
  action: string;
  category: 'TRADE' | 'ACCOUNT' | 'SETTINGS' | 'BROKER' | 'TAG' | 'JOURNAL' | 'PLAYBOOK' | 'PROP_FIRM' | 'SECURITY' | 'DATA' | 'SYSTEM';
  object: string;
  status: 'SUCCESS' | 'INFO' | 'WARNING' | 'ERROR';
  source?: string;
  details?: Record<string, any>;
  createdAt: string;
}

export interface CommissionRule {
  id: string;
  account: string; // 'ALL' or specific accountId
  instrument: 'Futures' | 'Forex' | 'Crypto' | 'Stocks' | 'CFD';
  symbol: string; // 'ALL' or specific symbol (e.g. 'ES', 'NQ')
  mode: 'Per Contract' | 'Per Lot' | 'Per Share' | 'Percentage' | 'Flat';
  apply: 'Round-Trip' | 'Both Sides' | 'Per Fill';
  commission: number;
  exchangeFee: number;
  clearingFee: number;
  platformFee: number;
  otherFee: number;
}

export interface TradeEntryDefaults {
  defaultAccountId: string;
  defaultMarket: 'Futures' | 'Forex' | 'Crypto' | 'Stocks';
  defaultDirection: 'BUY' | 'SELL';
  defaultOrderType: 'MARKET' | 'LIMIT' | 'STOP';
  defaultQuantity: number;
  defaultRiskValue: number;
  defaultRiskUnit: 'PERCENT' | 'CURRENCY' | 'R_MULTIPLE';
  defaultStopLossBehavior: 'MANUAL' | 'POINTS' | 'PERCENT' | 'ATR';
  defaultTakeProfitBehavior: 'MANUAL' | 'R_TARGET' | 'PERCENT';
  defaultRTarget: number;
  maxPlannedRisk: number;
  defaultSetup: string;
  defaultPlaybookId: string;
  defaultSession: 'New York' | 'London' | 'Asian';
  defaultStatus: 'CLOSED' | 'OPEN';
  requireSetup: boolean;
  requireStopLoss: boolean;
  requireTakeProfit: boolean;
  requireNotes: boolean;
  requireScreenshot: boolean;
  requireMistakeOnLoss: boolean;
  allowPartialExits: boolean;
  allowMultipleEntries: boolean;
  allowMultipleExits: boolean;
  trackCommissions: boolean;
  trackSwapFees: boolean;
  trackSlippage: boolean;
  defaultTableColumns: string[];
  defaultTradeSort: 'date_desc' | 'date_asc' | 'pnl_desc' | 'pnl_asc';
}

export interface GlobalPreferences {
  theme: 'dark' | 'light' | 'system';
  accentColor: string;
  density: 'compact' | 'comfortable' | 'spacious';
  chartAnimations: boolean;
  reducedMotion: boolean;
  currency: string;
  currencyMode: 'USD' | 'PERCENT' | 'R_MULTIPLE' | 'TICKS' | 'PRIVACY';
  numberFormat: 'en-US' | 'de-DE' | 'fr-FR' | 'en-GB';
  decimalPrecision: number;
  percentagePrecision: number;
  roundingBehavior: 'round' | 'floor' | 'ceil';
  timezone: string;
  dateFormat: 'YYYY-MM-DD' | 'MM/DD/YYYY' | 'DD/MM/YYYY';
  timeFormat: '12h' | '24h';
  firstDayOfWeek: 'Sunday' | 'Monday';
  calendarTimezone: string;
  sessionTimezone: string;
  defaultAccountId?: string;
}

export interface NotificationPreferences {
  tradeAlerts: boolean;
  riskAlerts: boolean;
  propFirmWarnings: boolean;
  syncNotifications: boolean;
  dailyJournalReminder: boolean;
  weeklyPerformanceReview: boolean;
  soundEnabled: boolean;
}

export interface AiSettings {
  aiCoachEnabled: boolean;
  responseStyle: 'concise' | 'institutional' | 'educational' | 'direct';
  analysisScope: 'all' | 'filtered' | 'active_account';
  autoReviewTrades: boolean;
}

export interface UserSettings {
  id: string;
  userId: string;
  accountId?: string;
  scope: 'GLOBAL' | 'ACCOUNT';
  general: GlobalPreferences;
  notifications: NotificationPreferences;
  aiSettings: AiSettings;
  tradeDefaults: TradeEntryDefaults;
  commissionRules: CommissionRule[];
  customTags?: CustomTag[];
  profile?: {
    bio?: string;
    country?: string;
    professionalTitle?: string;
    phone?: string;
    tradingStyle?: string;
  };
  updatedAt?: string;
}

export interface UserBackup {
  id: string;
  name: string;
  sizeBytes: number;
  tradeCount: number;
  notesCount: number;
  backupData?: any;
  createdAt: string;
}


