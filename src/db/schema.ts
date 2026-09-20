import { pgTable, serial, text, timestamp, doublePrecision, integer, boolean, jsonb, unique } from 'drizzle-orm/pg-core';

// Users table
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Auth UID or dev user identifier
  name: text('name').notNull(),
  email: text('email').notNull(),
  accountCode: text('account_code').notNull().unique(),
  experienceLevel: text('experience_level').notNull().default('Intermediate'),
  points: integer('points').notNull().default(100),
  role: text('role').notNull().default('USER'),
  isPublic: boolean('is_public').notNull().default(true),
  avatar: text('avatar').notNull().default('https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Profiles table (Supabase auth.users profile linkage)
export const profiles = pgTable('profiles', {
  id: text('id').primaryKey(), // Matches auth.users.id (UUID)
  fullName: text('full_name').notNull().default(''),
  email: text('email').notNull().default(''),
  accountCode: text('account_code'),
  experienceLevel: text('experience_level').default('Intermediate'),
  avatarUrl: text('avatar_url').default(''),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Trading Accounts table
export const tradingAccounts = pgTable('trading_accounts', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  name: text('name').notNull(),
  broker: text('broker').notNull(),
  type: text('type').notNull(),
  currency: text('currency').notNull().default('USD'),
  initialBalance: doublePrecision('initial_balance').notNull(),
  currentBalance: doublePrecision('current_balance').notNull(),
  isDefault: boolean('is_default').notNull().default(false),
  lastSync: text('last_sync'),
  syncStatus: text('sync_status').notNull().default('HEALTHY'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Trades table
export const trades = pgTable('trades', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  accountId: text('account_id').notNull(),
  connectionId: text('connection_id'),
  externalTradeId: text('external_trade_id'),
  platform: text('platform'),
  broker: text('broker'),
  source: text('source').notNull().default('manual'),
  orderId: text('order_id'),
  positionId: text('position_id'),
  symbol: text('symbol').notNull(),
  market: text('market').notNull(),
  direction: text('direction').notNull(),
  status: text('status').notNull(),
  entryDate: text('entry_date').notNull(),
  exitDate: text('exit_date'),
  entryPrice: doublePrecision('entry_price').notNull(),
  exitPrice: doublePrecision('exit_price'),
  stopLoss: doublePrecision('stop_loss'),
  takeProfit: doublePrecision('take_profit'),
  quantity: doublePrecision('quantity').notNull(),
  grossPnl: doublePrecision('gross_pnl').notNull(),
  netPnl: doublePrecision('net_pnl').notNull(),
  commission: doublePrecision('commission').notNull().default(0),
  swap: doublePrecision('swap').notNull().default(0),
  fees: doublePrecision('fees').notNull().default(0),
  rMultiple: doublePrecision('r_multiple').notNull().default(0),
  roiPercent: doublePrecision('roi_percent').notNull().default(0),
  session: text('session').notNull(),
  strategyId: text('strategy_id'),
  playbookId: text('playbook_id'),
  setupId: text('setup_id'),
  setupType: text('setup_type').notNull(),
  setupGrade: text('setup_grade'),
  autoGrade: text('auto_grade'),
  ruleCompliancePercent: doublePrecision('rule_compliance_percent'),
  checkedRuleIds: jsonb('checked_rule_ids').notNull().default([]),
  brokenRuleIds: jsonb('broken_rule_ids').notNull().default([]),
  mistakeCategory: text('mistake_category'),
  mistakeDescription: text('mistake_description'),
  mistakeSeverity: text('mistake_severity'),
  rating: integer('rating').notNull().default(3),
  notes: text('notes').notNull().default(''),
  tags: jsonb('tags').notNull().default([]),
  mistakes: jsonb('mistakes').notNull().default([]),
  rulesFollowed: boolean('rules_followed').notNull().default(true),
  screenshotUrl: text('screenshot_url'),
  afterScreenshotUrl: text('after_screenshot_url'),
  durationMinutes: integer('duration_minutes').notNull().default(0),
  emotionalState: text('emotional_state'),
  propFirmAccountId: text('prop_firm_account_id'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Playbooks table
export const playbooks = pgTable('playbooks', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  name: text('name').notNull(),
  icon: text('icon').notNull(),
  color: text('color').notNull(),
  description: text('description').notNull(),
  status: text('status').notNull(),
  rules: jsonb('rules').notNull().default([]),
  exampleScreenshots: jsonb('example_screenshots').notNull().default([]),
  totalTrades: integer('total_trades').notNull().default(0),
  winRate: doublePrecision('win_rate').notNull().default(0),
  netPnl: doublePrecision('net_pnl').notNull().default(0),
  profitFactor: doublePrecision('profit_factor').notNull().default(0),
  avgWinner: doublePrecision('avg_winner').notNull().default(0),
  avgLoser: doublePrecision('avg_loser').notNull().default(0),
  expectancy: doublePrecision('expectancy').notNull().default(0),
  missedTradesCount: integer('missed_trades_count').notNull().default(0),
  isPrivate: boolean('is_private').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow(),
});

// Strategies table
export const strategies = pgTable('strategies', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  timeframe: text('timeframe').notNull(),
  marketType: text('market_type').notNull(),
  winRate: doublePrecision('win_rate').notNull().default(0),
  totalTrades: integer('total_trades').notNull().default(0),
  netPnl: doublePrecision('net_pnl').notNull().default(0),
  profitFactor: doublePrecision('profit_factor').notNull().default(0),
  rules: jsonb('rules').notNull().default([]),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow(),
});

// Journal Notes table
export const journalNotes = pgTable('journal_notes', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  accountId: text('account_id').notNull(),
  date: text('date').notNull(),
  title: text('title').notNull(),
  folderId: text('folder_id'),
  tags: jsonb('tags').notNull().default([]),
  content: text('content').notNull().default(''),
  preMarketPlan: jsonb('pre_market_plan').notNull().default({}),
  postMarketReview: jsonb('post_market_review').notNull().default({}),
  contractsTraded: doublePrecision('contracts_traded'),
  volume: doublePrecision('volume'),
  netPnl: doublePrecision('net_pnl'),
  netRoi: doublePrecision('net_roi'),
  screenshots: jsonb('screenshots').notNull().default([]),
  templateUsed: text('template_used'),
  isFavorite: boolean('is_favorite').default(false),
  isDeleted: boolean('is_deleted').default(false),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  deletedBy: text('deleted_by'),
  originalFolderId: text('original_folder_id'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Journal Folders table
export const journalFolders = pgTable('journal_folders', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  name: text('name').notNull(),
  icon: text('icon'),
  count: integer('count').default(0),
  isDeleted: boolean('is_deleted').default(false),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  deletedBy: text('deleted_by'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Risk & Goals Settings table
export const riskGoals = pgTable('risk_goals', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  tradingAccountId: text('trading_account_id'),
  dailyProfitTarget: doublePrecision('daily_profit_target'),
  weeklyProfitTarget: doublePrecision('weekly_profit_target'),
  monthlyProfitTarget: doublePrecision('monthly_profit_target'),
  maxDailyLoss: doublePrecision('max_daily_loss'),
  dailyMaxLoss: doublePrecision('daily_max_loss'),
  maxWeeklyLoss: doublePrecision('max_weekly_loss'),
  weeklyLossLimit: doublePrecision('weekly_loss_limit'),
  maxDrawdown: doublePrecision('max_drawdown'),
  maxDrawdownLimit: doublePrecision('max_drawdown_limit'),
  trailingDrawdownLimit: doublePrecision('trailing_drawdown_limit'),
  maxRiskPerTradePercent: doublePrecision('max_risk_per_trade_percent'),
  maxRiskPerTradeAmount: doublePrecision('max_risk_per_trade_amount'),
  riskMode: text('risk_mode').default('LOWER_OF_BOTH'),
  maxTradesPerDay: integer('max_trades_per_day'),
  maxConsecutiveLosses: integer('max_consecutive_losses'),
  maxContractsPerTrade: integer('max_contracts_per_trade'),
  maxDailyLossStreak: integer('max_daily_loss_streak'),
  minRMultiple: doublePrecision('min_r_multiple'),
  maxPositionSize: doublePrecision('max_position_size'),
  maxOpenPositions: integer('max_open_positions'),
  enforceCircuitBreaker: boolean('enforce_circuit_breaker').default(false),
  circuitBreakerTriggered: boolean('circuit_breaker_triggered').default(false),
  circuitBreakerState: text('circuit_breaker_state').default('DISARMED'),
  hardLockEnabled: boolean('hard_lock_enabled').default(false),
  warningThresholdPercent: doublePrecision('warning_threshold_percent').default(75),
  criticalThresholdPercent: doublePrecision('critical_threshold_percent').default(90),
  timezone: text('timezone').default('America/New_York'),
  dailyResetTime: text('daily_reset_time').default('17:00'),
  includeFloatingPnl: boolean('include_floating_pnl').default(false),
  includeFees: boolean('include_fees').default(true),
  includeCommissions: boolean('include_commissions').default(true),
  drawdownMethodology: text('drawdown_methodology').default('EQUITY_BASED'),
  weeklyTargetAction: text('weekly_target_action').default('CONTINUE'),
  requireManualUnlock: boolean('require_manual_unlock').default(true),
  lockReason: text('lock_reason'),
  lockedAt: text('locked_at'),
  unlockedAt: text('unlocked_at'),
  unlockedBy: text('unlocked_by'),
  unlockReason: text('unlock_reason'),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Risk Events Audit Trail
export const riskEvents = pgTable('risk_events', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  accountId: text('account_id'),
  accountName: text('account_name'),
  eventType: text('event_type').notNull(),
  rule: text('rule').notNull(),
  currentValue: text('current_value'),
  limitValue: text('limit_value'),
  severity: text('severity').notNull(),
  actionTaken: text('action_taken').notNull(),
  notes: text('notes'),
  unlockedBy: text('unlocked_by'),
  unlockReason: text('unlock_reason'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Backtesting Sessions table
export const backtestSessions = pgTable('backtest_sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  title: text('title').notNull(),
  symbol: text('symbol').notNull(),
  timeframe: text('timeframe').notNull(),
  strategy: text('strategy').notNull(),
  startDate: text('start_date').notNull(),
  endDate: text('end_date').notNull(),
  initialBalance: doublePrecision('initial_balance').notNull(),
  currentBalance: doublePrecision('current_balance').notNull(),
  trades: jsonb('trades').notNull().default([]),
  totalTrades: integer('total_trades').notNull().default(0),
  winRate: doublePrecision('win_rate').notNull().default(0),
  netPnl: doublePrecision('net_pnl').notNull().default(0),
  profitFactor: doublePrecision('profit_factor').notNull().default(0),
  maxDrawdown: doublePrecision('max_drawdown').notNull().default(0),
  currentIndex: integer('current_index').notNull().default(0),
  notes: text('notes').notNull().default(''),
  createdAt: timestamp('created_at').defaultNow(),
});

// Community Posts table
export const communityPosts = pgTable('community_posts', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  authorName: text('author_name').notNull(),
  authorHandle: text('author_handle').notNull(),
  authorAvatar: text('author_avatar').notNull(),
  badge: text('badge'),
  timestamp: text('timestamp').notNull(),
  content: text('content').notNull(),
  symbol: text('symbol'),
  direction: text('direction'),
  pnl: text('pnl'),
  rMultiple: text('r_multiple'),
  imageUrl: text('image_url'),
  likes: integer('likes').default(0),
  hasLiked: boolean('has_liked').default(false),
  commentsCount: integer('comments_count').default(0),
  comments: jsonb('comments').default([]),
  createdAt: timestamp('created_at').defaultNow(),
});

// Post Likes table
export const postLikes = pgTable('post_likes', {
  id: text('id').primaryKey(),
  postId: text('post_id').notNull(),
  userId: text('user_id').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Post Comments table
export const postComments = pgTable('post_comments', {
  id: text('id').primaryKey(),
  postId: text('post_id').notNull(),
  userId: text('user_id').notNull(),
  authorName: text('author_name').notNull(),
  authorAvatar: text('author_avatar').notNull(),
  content: text('content').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Mentor Students table
export const mentorStudents = pgTable('mentor_students', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  code: text('code').notNull(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  avatar: text('avatar').notNull(),
  accountName: text('account_name').notNull(),
  currentBalance: doublePrecision('current_balance').default(0),
  netPnl: doublePrecision('net_pnl').default(0),
  winRate: doublePrecision('win_rate').default(0),
  profitFactor: doublePrecision('profit_factor').default(0),
  zellaScore: integer('zella_score').default(0),
  totalTrades: integer('total_trades').default(0),
  status: text('status').notNull().default('ACTIVE'),
  sharedAccounts: jsonb('shared_accounts').default([]),
  unreadNotesCount: integer('unread_notes_count').default(0),
  disciplineScore: integer('discipline_score').default(0),
  joinedDate: text('joined_date'),
  riskBreached: boolean('risk_breached').default(false),
  createdAt: timestamp('created_at').defaultNow(),
});

// Mentor Student Relationships table
export const mentorStudentRelationships = pgTable('mentor_student_relationships', {
  id: text('id').primaryKey(),
  mentorUserId: text('mentor_user_id').notNull(),
  studentUserId: text('student_user_id').notNull(),
  status: text('status').notNull().default('PENDING'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Student Sharing Permissions table
export const studentSharingPermissions = pgTable('student_sharing_permissions', {
  id: text('id').primaryKey(),
  studentUserId: text('student_user_id').notNull(),
  mentorUserId: text('mentor_user_id').notNull(),
  sharedAccountIds: jsonb('shared_account_ids').notNull().default([]),
  canViewAccountOverview: boolean('can_view_account_overview').notNull().default(true),
  canViewTrades: boolean('can_view_trades').notNull().default(true),
  canViewAnalytics: boolean('can_view_analytics').notNull().default(true),
  canViewEquityCurve: boolean('can_view_equity_curve').notNull().default(true),
  canViewDrawdown: boolean('can_view_drawdown').notNull().default(true),
  canViewPlaybooks: boolean('can_view_playbooks').notNull().default(false),
  canViewNotes: boolean('can_view_notes').notNull().default(false),
  canViewRiskControls: boolean('can_view_risk_controls').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Mentor Directives table
export const mentorDirectives = pgTable('mentor_directives', {
  id: text('id').primaryKey(),
  mentorId: text('mentor_id').notNull(),
  studentId: text('student_id').notNull(),
  type: text('type').notNull().default('DIRECTIVE'),
  content: text('content').notNull(),
  status: text('status').notNull().default('PENDING'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const mentorFeedback = mentorDirectives;

// Notifications table
export const notifications = pgTable('notifications', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  title: text('title').notNull(),
  message: text('message').notNull(),
  type: text('type').notNull(),
  timestamp: text('timestamp').notNull(),
  read: boolean('read').default(false),
  actionUrl: text('action_url'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Broker Integrations table
export const brokerIntegrations = pgTable('broker_integrations', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  accountId: text('account_id').notNull(),
  provider: text('provider').notNull(), // 'MT4' | 'MT5' | 'TRADINGVIEW' | 'CUSTOM_WEBHOOK'
  displayName: text('display_name').notNull(),
  status: text('status').notNull().default('CONNECTED'), // 'CONNECTED' | 'WAITING_FOR_EVENTS' | 'DISCONNECTED' | 'ERROR'
  secretHash: text('secret_hash').notNull(),
  externalAccountId: text('external_account_id'),
  lastSyncAt: text('last_sync_at'),
  lastEventAt: text('last_event_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Integration Events table (for audit trail & idempotency)
export const integrationEvents = pgTable('integration_events', {
  id: text('id').primaryKey(),
  integrationId: text('integration_id').notNull(),
  userId: text('user_id').notNull(),
  externalEventId: text('external_event_id').notNull(),
  eventType: text('event_type').notNull(),
  payload: jsonb('payload').notNull(),
  status: text('status').notNull().default('PROCESSED'),
  error: text('error'),
  createdAt: timestamp('created_at').defaultNow(),
  processingStatus: text('processing_status').notNull().default('RECEIVED'),
  attemptCount: integer('attempt_count').notNull().default(1),
  maxAttempts: integer('max_attempts').notNull().default(5),
  nextRetryAt: timestamp('next_retry_at'),
  lastAttemptAt: timestamp('last_attempt_at'),
  processedAt: timestamp('processed_at'),
  failedAt: timestamp('failed_at'),
  errorCode: text('error_code'),
  errorMessage: text('error_message'),
  correlationId: text('correlation_id'),
  idempotencyKey: text('idempotency_key'),
  sourceIpHash: text('source_ip_hash'),
  provider: text('provider'),
});

// Daily Checklist States table
export const dailyChecklistStates = pgTable('daily_checklist_states', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  date: text('date').notNull(),
  itemId: text('item_id').notNull(),
  completed: boolean('completed').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => [
  unique('uid_date_item_idx').on(table.userId, table.date, table.itemId)
]);

// Admin Audit Logs table
export const adminAuditLogs = pgTable('admin_audit_logs', {
  id: text('id').primaryKey(),
  adminId: text('admin_id').notNull(),
  targetUserId: text('target_user_id').notNull(),
  action: text('action').notNull(),
  previousValue: text('previous_value'),
  newValue: text('new_value'),
  reason: text('reason'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Backtest Drawings table
export const backtestDrawings = pgTable('backtest_drawings', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  sessionId: text('session_id').default('default'),
  symbol: text('symbol').notNull(),
  timeframe: text('timeframe').default('15m'),
  drawings: jsonb('drawings').notNull().default([]),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Chart Templates table
export const chartTemplates = pgTable('chart_templates', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  name: text('name').notNull(),
  description: text('description').default(''),
  chartType: text('chart_type').notNull().default('CANDLESTICK'),
  indicators: jsonb('indicators').notNull().default([]),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Trading Account Connections table (Auto-Sync Broker/Platform Connections)
export const tradingAccountConnections = pgTable('trading_account_connections', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  accountId: text('account_id').notNull(),
  platform: text('platform').notNull(), // 'MT5' | 'CTRADER' | 'DXTRADE' | 'MATCH_TRADER' | 'BROKER_API' | 'CSV'
  broker: text('broker').notNull(),
  server: text('server'),
  accountNumber: text('account_number').notNull(),
  accountName: text('account_name'),
  currency: text('currency').notNull().default('USD'),
  accountType: text('account_type').notNull().default('LIVE'), // 'LIVE' | 'DEMO' | 'PROP_FIRM'
  encryptedCredentials: text('encrypted_credentials').notNull(), // AES-256-GCM encrypted JSON payload
  connectionStatus: text('connection_status').notNull().default('CONNECTED'), // 'CONNECTED' | 'SYNCING' | 'SYNCED' | 'DISCONNECTED' | 'ERROR' | 'REAUTH_REQUIRED'
  syncEnabled: boolean('sync_enabled').notNull().default(true),
  autoSyncIntervalMins: integer('auto_sync_interval_mins').notNull().default(5),
  importScope: text('import_scope').notNull().default('ALL'), // 'ALL' | 'DATE'
  importStartDate: text('import_start_date'),
  lastSyncAt: text('last_sync_at'),
  lastSyncError: text('last_sync_error'),
  lastSyncTradesCount: integer('last_sync_trades_count').notNull().default(0),
  balance: doublePrecision('balance').default(0),
  equity: doublePrecision('equity').default(0),
  leverage: integer('leverage').default(100),
  metadata: jsonb('metadata').notNull().default({}),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Connection Sync Logs table (Audit trail for auto-sync events)
export const connectionSyncLogs = pgTable('connection_sync_logs', {
  id: text('id').primaryKey(),
  connectionId: text('connection_id').notNull(),
  userId: text('user_id').notNull(),
  status: text('status').notNull(), // 'SUCCESS' | 'FAILED' | 'PARTIAL' | 'SYNCING'
  tradesImported: integer('trades_imported').notNull().default(0),
  tradesUpdated: integer('trades_updated').notNull().default(0),
  errorMessage: text('error_message'),
  details: jsonb('details'),
  startedAt: text('started_at').notNull(),
  completedAt: text('completed_at'),
  durationMs: integer('duration_ms').default(0),
  createdAt: timestamp('created_at').defaultNow(),
});

// Prop Firm Accounts table (Multi-account institutional rules & evaluation tracking)
export const propFirmAccounts = pgTable('prop_firm_accounts', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  name: text('name').notNull(),
  firmName: text('firm_name').notNull(),
  tradingBrand: text('trading_brand'),
  legalEntity: text('legal_entity'),
  registrationNumber: text('registration_number'),
  jurisdiction: text('jurisdiction'),
  termsEffectiveDate: text('terms_effective_date'),
  rulesVersion: text('rules_version'),
  accountNumber: text('account_number'),
  accountSize: doublePrecision('account_size'),
  startingBalance: doublePrecision('starting_balance').notNull(),
  currentBalance: doublePrecision('current_balance').notNull(),
  equity: doublePrecision('equity').notNull(),
  highWaterMark: doublePrecision('high_water_mark'),
  currency: text('currency').notNull().default('USD'),
  programModel: text('program_model').notNull().default('TWO_STEP'),
  phases: jsonb('phases').notNull().default([]),
  activePhaseIndex: integer('active_phase_index').default(0),
  phase: text('phase').notNull().default('PHASE_1'),
  phaseName: text('phase_name'),
  status: text('status').notNull().default('ACTIVE'),
  riskState: text('risk_state').notNull().default('SAFE'),
  enforcementMode: text('enforcement_mode').default('MONITOR'),
  drawdownModel: text('drawdown_model').notNull().default('STATIC'),
  dailyDrawdownModel: text('daily_drawdown_model').notNull().default('START_OF_DAY_BALANCE'),
  dailyLossMethod: text('daily_loss_method').default('REALIZED_ONLY'),
  maxRiskPerSymbolPercent: doublePrecision('max_risk_per_symbol_percent'),
  minTradeDurationSec: integer('min_trade_duration_sec'),
  avgTradeDurationSec: integer('avg_trade_duration_sec'),
  minTradingDays: integer('min_trading_days').default(0),
  maxTradingDays: integer('max_trading_days').default(0),
  startDate: text('start_date'),
  deadline: text('deadline'),
  qualifyingDayProfitPercent: doublePrecision('qualifying_day_profit_percent'),
  profitTargetPercent: doublePrecision('profit_target_percent'),
  dailyLossPercent: doublePrecision('daily_loss_percent'),
  totalLossPercent: doublePrecision('total_loss_percent'),
  profitTargetAmount: doublePrecision('profit_target_amount'),
  dailyLossAmount: doublePrecision('daily_loss_amount'),
  totalLossAmount: doublePrecision('total_loss_amount'),
  consistencyMaxDayPercent: doublePrecision('consistency_max_day_percent'),
  maxProfitConcentrationPercent: doublePrecision('max_profit_concentration_percent'),
  newsTradingAllowed: text('news_trading_allowed').default('ALLOWED'),
  weekendHoldingAllowed: boolean('weekend_holding_allowed').default(true),
  overnightHoldingAllowed: boolean('overnight_holding_allowed').default(true),
  eaAllowed: text('ea_allowed').default('ALLOWED'),
  copyTradingAllowed: text('copy_trading_allowed').default('ALLOWED'),
  hedgingAllowed: text('hedging_allowed').default('ALLOWED'),
  maxLotSize: doublePrecision('max_lot_size'),
  minLotSize: doublePrecision('min_lot_size'),
  maxPositions: integer('max_positions'),
  maxLeverage: integer('max_leverage').default(100),
  ipRestrictions: jsonb('ip_restrictions').default({}),
  prohibitedStrategies: jsonb('prohibited_strategies').default([]),
  rewardBufferPercent: doublePrecision('reward_buffer_percent'),
  rewardSplitPercent: doublePrecision('reward_split_percent').default(80),
  profitSplitTraderPercent: doublePrecision('profit_split_trader_percent').default(80),
  profitSplitFirmPercent: doublePrecision('profit_split_firm_percent').default(20),
  minRewardRequest: doublePrecision('min_reward_request'),
  payoutFrequency: text('payout_frequency').default('BIWEEKLY'),
  activationFee: doublePrecision('activation_fee'),
  inactivityMaxDays: integer('inactivity_max_days').default(30),
  newsWindowMinutes: integer('news_window_minutes').default(5),
  sessionTimezone: text('session_timezone').default('America/New_York'),
  scalingRules: jsonb('scaling_rules').default({}),
  rules: jsonb('rules').notNull().default([]),
  violations: jsonb('violations').notNull().default([]),
  timeline: jsonb('timeline').default([]),
  payoutInfo: jsonb('payout_info').default({}),
  tradingAccountLink: text('trading_account_link'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// User Settings table (persists global and account-specific settings)
export const userSettings = pgTable('user_settings', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  accountId: text('account_id'),
  scope: text('scope').notNull().default('GLOBAL'),
  general: jsonb('general').notNull().default({}),
  notifications: jsonb('notifications').notNull().default({}),
  aiSettings: jsonb('ai_settings').notNull().default({}),
  tradeDefaults: jsonb('trade_defaults').notNull().default({}),
  commissionRules: jsonb('commission_rules').notNull().default([]),
  profile: jsonb('profile').notNull().default({}),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Custom Tags Management table
export const customTags = pgTable('custom_tags', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  name: text('name').notNull(),
  category: text('category').notNull().default('Custom'),
  color: text('color').notNull().default('#6366F1'),
  description: text('description').default(''),
  isArchived: boolean('is_archived').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Import History table
export const importHistory = pgTable('import_history', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  source: text('source').notNull().default('CSV'),
  fileName: text('file_name').notNull(),
  tradesProcessed: integer('trades_processed').notNull().default(0),
  tradesAdded: integer('trades_added').notNull().default(0),
  duplicatesCount: integer('duplicates_count').notNull().default(0),
  errorsCount: integer('errors_count').notNull().default(0),
  status: text('status').notNull().default('COMPLETED'),
  details: jsonb('details').default({}),
  createdAt: timestamp('created_at').defaultNow(),
});

// Activity / Audit Logs table
export const activityLogs = pgTable('activity_logs', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  action: text('action').notNull(),
  category: text('category').notNull().default('SYSTEM'),
  object: text('object').notNull(),
  status: text('status').notNull().default('SUCCESS'),
  source: text('source').default('Web Client'),
  details: jsonb('details').default({}),
  createdAt: timestamp('created_at').defaultNow(),
});

// User Backups table
export const userBackups = pgTable('user_backups', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  name: text('name').notNull(),
  sizeBytes: integer('size_bytes').notNull().default(0),
  tradeCount: integer('trade_count').notNull().default(0),
  notesCount: integer('notes_count').notNull().default(0),
  backupData: jsonb('backup_data').notNull().default({}),
  createdAt: timestamp('created_at').defaultNow(),
});



