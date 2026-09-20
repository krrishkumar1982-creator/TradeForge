import { supabase, isSupabaseConfigured } from '../lib/supabase';
import {
  Trade,
  TradingAccount,
  Playbook,
  Strategy,
  JournalNote,
  JournalFolder,
  RiskGoalSettings,
  PropFirmAccount,
  UserSettings,
  CustomTag,
  ImportHistoryItem,
  ActivityLogItem,
  UserBackup,
  BacktestSession,
  AppNotification,
  UserProfile,
} from '../types';

// Local cache storage helper for offline resilience
function getLocalCache<T>(key: string, fallback: T): T {
  try {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') return fallback;
    const raw = localStorage.getItem(`tf_cache_${key}`);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function setLocalCache<T>(key: string, value: T): void {
  try {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
    localStorage.setItem(`tf_cache_${key}`, JSON.stringify(value));
  } catch (err) {
    console.warn('[Cache] Storage quota or write warning:', err);
  }
}

// ==========================================
// 1. User Profile
// ==========================================
export async function fetchProfileFromSupabase(userId: string): Promise<UserProfile | null> {
  const cacheKey = `profile_${userId}`;
  try {
    if (!isSupabaseConfigured()) return getLocalCache(cacheKey, null);

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.warn('[Supabase Profile] Fetch notice:', error.message);
      return getLocalCache(cacheKey, null);
    }

    if (data) {
      const profile: UserProfile = {
        id: data.id,
        name: data.full_name || 'Trader',
        email: data.email || '',
        accountCode: data.account_code || '',
        experienceLevel: data.experience_level || 'Intermediate',
        avatarUrl: data.avatar_url || '',
      };
      setLocalCache(cacheKey, profile);
      return profile;
    }
  } catch (err) {
    console.warn('[Supabase Profile] Network/fetch warning:', err);
  }
  return getLocalCache(cacheKey, null);
}

export async function upsertProfileToSupabase(profile: Partial<UserProfile> & { id: string }): Promise<boolean> {
  const cacheKey = `profile_${profile.id}`;
  setLocalCache(cacheKey, profile);

  if (!isSupabaseConfigured()) return true;

  try {
    const dbPayload: any = {
      id: profile.id,
      updated_at: new Date().toISOString(),
    };
    if (profile.name !== undefined) dbPayload.full_name = profile.name;
    if (profile.email !== undefined) dbPayload.email = profile.email;
    if (profile.accountCode !== undefined) dbPayload.account_code = profile.accountCode;
    if (profile.experienceLevel !== undefined) dbPayload.experience_level = profile.experienceLevel;
    if (profile.avatarUrl !== undefined) dbPayload.avatar_url = profile.avatarUrl;

    const { error } = await supabase
      .from('profiles')
      .upsert(dbPayload, { onConflict: 'id' });

    if (error) {
      console.warn('[Supabase Profile] Upsert notice:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('[Supabase Profile] Save error:', err);
    return false;
  }
}

// ==========================================
// 2. Trading Accounts
// ==========================================
export async function fetchAccountsFromSupabase(userId: string): Promise<TradingAccount[]> {
  const cacheKey = `accounts_${userId}`;
  try {
    if (!isSupabaseConfigured()) return getLocalCache(cacheKey, []);

    const { data, error } = await supabase
      .from('trading_accounts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('[Supabase Accounts] Fetch notice:', error.message);
      return getLocalCache(cacheKey, []);
    }

    if (data && Array.isArray(data)) {
      const accounts: TradingAccount[] = data.map((row) => ({
        id: row.id,
        name: row.name,
        broker: row.broker,
        type: row.type as any,
        currency: row.currency || 'USD',
        initialBalance: Number(row.initial_balance || 0),
        currentBalance: Number(row.current_balance || 0),
        isDefault: Boolean(row.is_default),
        lastSync: row.last_sync,
        syncStatus: row.sync_status || 'HEALTHY',
        createdAt: row.created_at,
      }));
      setLocalCache(cacheKey, accounts);
      return accounts;
    }
  } catch (err) {
    console.warn('[Supabase Accounts] Network notice:', err);
  }
  return getLocalCache(cacheKey, []);
}

export async function upsertAccountToSupabase(account: TradingAccount, userId: string): Promise<boolean> {
  // Update local cache first
  const cacheKey = `accounts_${userId}`;
  const existing = getLocalCache<TradingAccount[]>(cacheKey, []);
  const next = [account, ...existing.filter((a) => a.id !== account.id)];
  setLocalCache(cacheKey, next);

  if (!isSupabaseConfigured()) return true;

  try {
    const dbPayload = {
      id: account.id,
      user_id: userId,
      name: account.name,
      broker: account.broker,
      type: account.type,
      currency: account.currency || 'USD',
      initial_balance: account.initialBalance,
      current_balance: account.currentBalance,
      is_default: account.isDefault,
      last_sync: account.lastSync || new Date().toISOString(),
      sync_status: account.syncStatus || 'HEALTHY',
    };

    const { error } = await supabase
      .from('trading_accounts')
      .upsert(dbPayload, { onConflict: 'id' });

    if (error) {
      console.warn('[Supabase Accounts] Save notice:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('[Supabase Accounts] Save error:', err);
    return false;
  }
}

export async function deleteAccountFromSupabase(accountId: string, userId: string): Promise<boolean> {
  const cacheKey = `accounts_${userId}`;
  const existing = getLocalCache<TradingAccount[]>(cacheKey, []);
  setLocalCache(cacheKey, existing.filter((a) => a.id !== accountId));

  if (!isSupabaseConfigured()) return true;

  try {
    const { error } = await supabase
      .from('trading_accounts')
      .delete()
      .eq('id', accountId)
      .eq('user_id', userId);

    if (error) {
      console.warn('[Supabase Accounts] Delete notice:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('[Supabase Accounts] Delete error:', err);
    return false;
  }
}

// ==========================================
// 3. Trades (Core Entity)
// ==========================================
function mapRowToTrade(row: any): Trade {
  return {
    id: row.id,
    accountId: row.account_id,
    propFirmAccountId: row.prop_firm_account_id,
    symbol: row.symbol,
    market: row.market,
    direction: row.direction,
    status: row.status,
    entryDate: row.entry_date,
    exitDate: row.exit_date,
    entryPrice: Number(row.entry_price || 0),
    exitPrice: row.exit_price !== null && row.exit_price !== undefined ? Number(row.exit_price) : undefined,
    stopLoss: row.stop_loss !== null && row.stop_loss !== undefined ? Number(row.stop_loss) : undefined,
    takeProfit: row.take_profit !== null && row.take_profit !== undefined ? Number(row.take_profit) : undefined,
    quantity: Number(row.quantity || 0),
    grossPnl: Number(row.gross_pnl || 0),
    netPnl: Number(row.net_pnl || 0),
    commission: Number(row.commission || 0),
    swap: Number(row.swap || 0),
    fees: Number(row.fees || 0),
    rMultiple: Number(row.r_multiple || 0),
    roiPercent: Number(row.roi_percent || 0),
    session: row.session || 'London',
    strategyId: row.strategy_id,
    playbookId: row.playbook_id,
    setupType: row.setup_type || 'Custom',
    setupGrade: row.setup_grade,
    autoGrade: row.auto_grade,
    rating: Number(row.rating || 3),
    notes: row.notes || '',
    tags: Array.isArray(row.tags) ? row.tags : [],
    mistakes: Array.isArray(row.mistakes) ? row.mistakes : [],
    rulesFollowed: row.rules_followed ?? true,
    screenshotUrl: row.screenshot_url,
    afterScreenshotUrl: row.after_screenshot_url,
    durationMinutes: Number(row.duration_minutes || 0),
    emotionalState: row.emotional_state,
    checkedRuleIds: Array.isArray(row.checked_rule_ids) ? row.checked_rule_ids : [],
    brokenRuleIds: Array.isArray(row.broken_rule_ids) ? row.broken_rule_ids : [],
  };
}

function mapTradeToRow(trade: Trade, userId: string): any {
  return {
    id: trade.id,
    user_id: userId,
    account_id: trade.accountId,
    prop_firm_account_id: trade.propFirmAccountId || null,
    symbol: trade.symbol,
    market: trade.market,
    direction: trade.direction,
    status: trade.status,
    entry_date: trade.entryDate,
    exit_date: trade.exitDate || null,
    entry_price: trade.entryPrice,
    exit_price: trade.exitPrice ?? null,
    stop_loss: trade.stopLoss ?? null,
    take_profit: trade.takeProfit ?? null,
    quantity: trade.quantity,
    gross_pnl: trade.grossPnl,
    net_pnl: trade.netPnl,
    commission: trade.commission || 0,
    swap: trade.swap || 0,
    fees: trade.fees || 0,
    r_multiple: trade.rMultiple || 0,
    roi_percent: trade.roiPercent || 0,
    session: trade.session,
    strategy_id: trade.strategyId || null,
    playbook_id: trade.playbookId || null,
    setup_type: trade.setupType,
    setup_grade: trade.setupGrade || null,
    auto_grade: trade.autoGrade || null,
    rating: trade.rating || 3,
    notes: trade.notes || '',
    tags: trade.tags || [],
    mistakes: trade.mistakes || [],
    rules_followed: trade.rulesFollowed ?? true,
    screenshot_url: trade.screenshotUrl || null,
    after_screenshot_url: trade.afterScreenshotUrl || null,
    duration_minutes: trade.durationMinutes || 0,
    emotional_state: trade.emotionalState || null,
  };
}

export async function fetchTradesFromSupabase(userId: string): Promise<Trade[]> {
  const cacheKey = `trades_${userId}`;
  try {
    if (!isSupabaseConfigured()) return getLocalCache(cacheKey, []);

    const { data, error } = await supabase
      .from('trades')
      .select('*')
      .eq('user_id', userId)
      .order('entry_date', { ascending: false });

    if (error) {
      console.warn('[Supabase Trades] Fetch notice:', error.message);
      return getLocalCache(cacheKey, []);
    }

    if (data && Array.isArray(data)) {
      const trades = data.map(mapRowToTrade);
      setLocalCache(cacheKey, trades);
      return trades;
    }
  } catch (err) {
    console.warn('[Supabase Trades] Network notice:', err);
  }
  return getLocalCache(cacheKey, []);
}

export async function insertTradeToSupabase(trade: Trade, userId: string): Promise<boolean> {
  const cacheKey = `trades_${userId}`;
  const existing = getLocalCache<Trade[]>(cacheKey, []);
  setLocalCache(cacheKey, [trade, ...existing.filter((t) => t.id !== trade.id)]);

  if (!isSupabaseConfigured()) return true;

  try {
    const row = mapTradeToRow(trade, userId);
    const { error } = await supabase
      .from('trades')
      .insert(row);

    if (error) {
      console.warn('[Supabase Trades] Insert notice:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('[Supabase Trades] Insert error:', err);
    return false;
  }
}

export async function updateTradeInSupabase(trade: Trade, userId: string): Promise<boolean> {
  const cacheKey = `trades_${userId}`;
  const existing = getLocalCache<Trade[]>(cacheKey, []);
  setLocalCache(cacheKey, existing.map((t) => (t.id === trade.id ? trade : t)));

  if (!isSupabaseConfigured()) return true;

  try {
    const row = mapTradeToRow(trade, userId);
    const { error } = await supabase
      .from('trades')
      .update(row)
      .eq('id', trade.id)
      .eq('user_id', userId);

    if (error) {
      console.warn('[Supabase Trades] Update notice:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('[Supabase Trades] Update error:', err);
    return false;
  }
}

export async function deleteTradeFromSupabase(tradeId: string, userId: string): Promise<boolean> {
  const cacheKey = `trades_${userId}`;
  const existing = getLocalCache<Trade[]>(cacheKey, []);
  setLocalCache(cacheKey, existing.filter((t) => t.id !== tradeId));

  if (!isSupabaseConfigured()) return true;

  try {
    const { error } = await supabase
      .from('trades')
      .delete()
      .eq('id', tradeId)
      .eq('user_id', userId);

    if (error) {
      console.warn('[Supabase Trades] Delete notice:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('[Supabase Trades] Delete error:', err);
    return false;
  }
}

export async function bulkDeleteTradesFromSupabase(tradeIds: string[], userId: string): Promise<boolean> {
  const cacheKey = `trades_${userId}`;
  const existing = getLocalCache<Trade[]>(cacheKey, []);
  const idSet = new Set(tradeIds);
  setLocalCache(cacheKey, existing.filter((t) => !idSet.has(t.id)));

  if (!isSupabaseConfigured() || tradeIds.length === 0) return true;

  try {
    const { error } = await supabase
      .from('trades')
      .delete()
      .in('id', tradeIds)
      .eq('user_id', userId);

    if (error) {
      console.warn('[Supabase Trades] Bulk delete notice:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('[Supabase Trades] Bulk delete error:', err);
    return false;
  }
}

export async function bulkEditTradesInSupabase(
  tradeIds: string[],
  updates: Partial<Trade>,
  userId: string
): Promise<boolean> {
  const cacheKey = `trades_${userId}`;
  const existing = getLocalCache<Trade[]>(cacheKey, []);
  const idSet = new Set(tradeIds);
  setLocalCache(cacheKey, existing.map((t) => (idSet.has(t.id) ? { ...t, ...updates } : t)));

  if (!isSupabaseConfigured() || tradeIds.length === 0) return true;

  try {
    const rowUpdates: any = {};
    if (updates.rating !== undefined) rowUpdates.rating = updates.rating;
    if (updates.setupType !== undefined) rowUpdates.setup_type = updates.setupType;
    if (updates.session !== undefined) rowUpdates.session = updates.session;
    if (updates.tags !== undefined) rowUpdates.tags = updates.tags;
    if (updates.notes !== undefined) rowUpdates.notes = updates.notes;
    if (updates.strategyId !== undefined) rowUpdates.strategy_id = updates.strategyId;
    if (updates.playbookId !== undefined) rowUpdates.playbook_id = updates.playbookId;

    const { error } = await supabase
      .from('trades')
      .update(rowUpdates)
      .in('id', tradeIds)
      .eq('user_id', userId);

    if (error) {
      console.warn('[Supabase Trades] Bulk edit notice:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('[Supabase Trades] Bulk edit error:', err);
    return false;
  }
}

// ==========================================
// 4. Prop Firm Accounts
// ==========================================
export async function fetchPropFirmAccountsFromSupabase(userId: string): Promise<PropFirmAccount[]> {
  const cacheKey = `prop_firm_accounts_${userId}`;
  try {
    if (!isSupabaseConfigured()) return getLocalCache(cacheKey, []);

    const { data, error } = await supabase
      .from('prop_firm_accounts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('[Supabase PropFirm] Fetch notice:', error.message);
      return getLocalCache(cacheKey, []);
    }

    if (data && Array.isArray(data)) {
      const accounts: PropFirmAccount[] = data.map((row) => ({
        id: row.id,
        name: row.name,
        firmName: row.firm_name || row.firm || 'Apex Trader Funding',
        accountSize: Number(row.account_size || row.starting_balance || 50000),
        startingBalance: Number(row.starting_balance || 50000),
        currentBalance: Number(row.current_balance || row.starting_balance || 50000),
        equity: Number(row.equity || row.current_balance || row.starting_balance || 50000),
        highWaterMark: Number(row.high_watermark || row.high_water_mark || row.current_balance || 50000),
        phase: (row.phase as any) || 'EVALUATION',
        status: (row.status as any) || 'ACTIVE',
        riskState: (row.risk_state as any) || 'NORMAL',
        drawdownModel: (row.drawdown_model as any) || 'TRAILING_END_OF_DAY',
        dailyDrawdownModel: (row.daily_drawdown_model as any) || 'STATIC_BALANCE',
        sessionTimezone: row.session_timezone || 'America/New_York',
        currency: row.currency || 'USD',
        rules: Array.isArray(row.rules) ? row.rules : [],
        violations: Array.isArray(row.violations) ? row.violations : [],
        createdAt: row.created_at || new Date().toISOString(),
        updatedAt: row.updated_at,
      }));
      setLocalCache(cacheKey, accounts);
      return accounts;
    }
  } catch (err) {
    console.warn('[Supabase PropFirm] Network notice:', err);
  }
  return getLocalCache(cacheKey, []);
}

export async function upsertPropFirmAccountToSupabase(account: PropFirmAccount, userId: string): Promise<boolean> {
  const cacheKey = `prop_firm_accounts_${userId}`;
  const existing = getLocalCache<PropFirmAccount[]>(cacheKey, []);
  setLocalCache(cacheKey, [account, ...existing.filter((a) => a.id !== account.id)]);

  if (!isSupabaseConfigured()) return true;

  try {
    const dbPayload = {
      id: account.id,
      user_id: userId,
      name: account.name,
      firm_name: account.firmName,
      account_size: account.accountSize || account.startingBalance,
      starting_balance: account.startingBalance,
      current_balance: account.currentBalance,
      equity: account.equity || account.currentBalance,
      high_watermark: account.highWaterMark || account.currentBalance,
      phase: account.phase,
      status: account.status,
      risk_state: account.riskState,
      drawdown_model: account.drawdownModel,
      daily_drawdown_model: account.dailyDrawdownModel,
      session_timezone: account.sessionTimezone || 'America/New_York',
      currency: account.currency || 'USD',
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('prop_firm_accounts')
      .upsert(dbPayload, { onConflict: 'id' });

    if (error) {
      console.warn('[Supabase PropFirm] Save notice:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('[Supabase PropFirm] Save error:', err);
    return false;
  }
}

export async function deletePropFirmAccountFromSupabase(accountId: string, userId: string): Promise<boolean> {
  const cacheKey = `prop_firm_accounts_${userId}`;
  const existing = getLocalCache<PropFirmAccount[]>(cacheKey, []);
  setLocalCache(cacheKey, existing.filter((a) => a.id !== accountId));

  if (!isSupabaseConfigured()) return true;

  try {
    const { error } = await supabase
      .from('prop_firm_accounts')
      .delete()
      .eq('id', accountId)
      .eq('user_id', userId);

    if (error) {
      console.warn('[Supabase PropFirm] Delete notice:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('[Supabase PropFirm] Delete error:', err);
    return false;
  }
}

// ==========================================
// 5. Playbooks & Strategies
// ==========================================
export async function fetchPlaybooksFromSupabase(userId: string): Promise<Playbook[]> {
  const cacheKey = `playbooks_${userId}`;
  try {
    if (!isSupabaseConfigured()) return getLocalCache(cacheKey, []);

    const { data, error } = await supabase
      .from('playbooks')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('[Supabase Playbooks] Fetch notice:', error.message);
      return getLocalCache(cacheKey, []);
    }

    if (data && Array.isArray(data)) {
      const playbooks: Playbook[] = data.map((row) => ({
        id: row.id,
        name: row.name,
        icon: row.icon,
        color: row.color,
        description: row.description,
        status: row.status as any,
        rules: Array.isArray(row.rules) ? row.rules : [],
        exampleScreenshots: Array.isArray(row.example_screenshots) ? row.example_screenshots : [],
        totalTrades: Number(row.total_trades || 0),
        winRate: Number(row.win_rate || 0),
        netPnl: Number(row.net_pnl || 0),
        profitFactor: Number(row.profit_factor || 0),
        avgWinner: Number(row.avg_winner || 0),
        avgLoser: Number(row.avg_loser || 0),
        expectancy: Number(row.expectancy || 0),
        missedTradesCount: Number(row.missed_trades_count || 0),
        isPrivate: Boolean(row.is_private),
      }));
      setLocalCache(cacheKey, playbooks);
      return playbooks;
    }
  } catch (err) {
    console.warn('[Supabase Playbooks] Network notice:', err);
  }
  return getLocalCache(cacheKey, []);
}

export async function upsertPlaybookToSupabase(playbook: Playbook, userId: string): Promise<boolean> {
  const cacheKey = `playbooks_${userId}`;
  const existing = getLocalCache<Playbook[]>(cacheKey, []);
  setLocalCache(cacheKey, [playbook, ...existing.filter((p) => p.id !== playbook.id)]);

  if (!isSupabaseConfigured()) return true;

  try {
    const dbPayload = {
      id: playbook.id,
      user_id: userId,
      name: playbook.name,
      icon: playbook.icon,
      color: playbook.color,
      description: playbook.description,
      status: playbook.status,
      rules: playbook.rules || [],
      example_screenshots: playbook.exampleScreenshots || [],
      total_trades: playbook.totalTrades || 0,
      win_rate: playbook.winRate || 0,
      net_pnl: playbook.netPnl || 0,
      profit_factor: playbook.profitFactor || 0,
      avg_winner: playbook.avgWinner || 0,
      avg_loser: playbook.avgLoser || 0,
      expectancy: playbook.expectancy || 0,
      missed_trades_count: playbook.missedTradesCount || 0,
      is_private: playbook.isPrivate ?? false,
    };

    const { error } = await supabase
      .from('playbooks')
      .upsert(dbPayload, { onConflict: 'id' });

    if (error) {
      console.warn('[Supabase Playbooks] Save notice:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('[Supabase Playbooks] Save error:', err);
    return false;
  }
}

export async function deletePlaybookFromSupabase(playbookId: string, userId: string): Promise<boolean> {
  const cacheKey = `playbooks_${userId}`;
  const existing = getLocalCache<Playbook[]>(cacheKey, []);
  setLocalCache(cacheKey, existing.filter((p) => p.id !== playbookId));

  if (!isSupabaseConfigured()) return true;

  try {
    const { error } = await supabase
      .from('playbooks')
      .delete()
      .eq('id', playbookId)
      .eq('user_id', userId);

    if (error) {
      console.warn('[Supabase Playbooks] Delete notice:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('[Supabase Playbooks] Delete error:', err);
    return false;
  }
}

export async function fetchStrategiesFromSupabase(userId: string): Promise<Strategy[]> {
  const cacheKey = `strategies_${userId}`;
  try {
    if (!isSupabaseConfigured()) return getLocalCache(cacheKey, []);

    const { data, error } = await supabase
      .from('strategies')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('[Supabase Strategies] Fetch notice:', error.message);
      return getLocalCache(cacheKey, []);
    }

    if (data && Array.isArray(data)) {
      const strategies: Strategy[] = data.map((row) => ({
        id: row.id,
        name: row.name,
        description: row.description,
        timeframe: row.timeframe,
        marketType: row.market_type as any,
        winRate: Number(row.win_rate || 0),
        totalTrades: Number(row.total_trades || 0),
        netPnl: Number(row.net_pnl || 0),
        profitFactor: Number(row.profit_factor || 0),
        rules: Array.isArray(row.rules) ? row.rules : [],
        isActive: Boolean(row.is_active),
      }));
      setLocalCache(cacheKey, strategies);
      return strategies;
    }
  } catch (err) {
    console.warn('[Supabase Strategies] Network notice:', err);
  }
  return getLocalCache(cacheKey, []);
}

export async function upsertStrategyToSupabase(strategy: Strategy, userId: string): Promise<boolean> {
  const cacheKey = `strategies_${userId}`;
  const existing = getLocalCache<Strategy[]>(cacheKey, []);
  setLocalCache(cacheKey, [strategy, ...existing.filter((s) => s.id !== strategy.id)]);

  if (!isSupabaseConfigured()) return true;

  try {
    const dbPayload = {
      id: strategy.id,
      user_id: userId,
      name: strategy.name,
      description: strategy.description,
      timeframe: strategy.timeframe,
      market_type: strategy.marketType,
      win_rate: strategy.winRate || 0,
      total_trades: strategy.totalTrades || 0,
      net_pnl: strategy.netPnl || 0,
      profit_factor: strategy.profitFactor || 0,
      rules: strategy.rules || [],
      is_active: strategy.isActive ?? true,
    };

    const { error } = await supabase
      .from('strategies')
      .upsert(dbPayload, { onConflict: 'id' });

    if (error) {
      console.warn('[Supabase Strategies] Save notice:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('[Supabase Strategies] Save error:', err);
    return false;
  }
}

export async function deleteStrategyFromSupabase(strategyId: string, userId: string): Promise<boolean> {
  const cacheKey = `strategies_${userId}`;
  const existing = getLocalCache<Strategy[]>(cacheKey, []);
  setLocalCache(cacheKey, existing.filter((s) => s.id !== strategyId));

  if (!isSupabaseConfigured()) return true;

  try {
    const { error } = await supabase
      .from('strategies')
      .delete()
      .eq('id', strategyId)
      .eq('user_id', userId);

    if (error) {
      console.warn('[Supabase Strategies] Delete notice:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('[Supabase Strategies] Delete error:', err);
    return false;
  }
}

// ==========================================
// 6. Journal Notes & Folders
// ==========================================
export function mapRowToJournalNote(row: any): JournalNote {
  const meta = (row.pre_market_plan && typeof row.pre_market_plan === 'object') ? row.pre_market_plan.__meta || {} : {};
  const attachments = Array.isArray(meta.attachments) && meta.attachments.length > 0
    ? meta.attachments
    : (Array.isArray(row.screenshots) ? row.screenshots.map((url: string, i: number) => ({
        id: `att-${row.id}-${i}`,
        name: `Attachment #${i + 1}`,
        url,
        type: 'image' as const,
        date: row.date,
      })) : []);

  return {
    id: row.id,
    accountId: row.account_id,
    date: row.date,
    time: meta.time || row.time || '6:30 PM',
    title: row.title || 'Untitled Note',
    folderId: row.folder_id || '',
    tags: Array.isArray(row.tags) ? row.tags : [],
    content: row.content || '',
    tradeId: meta.tradeId || row.trade_id || '',
    symbol: meta.symbol || row.symbol || '',
    side: meta.side || row.side || '',
    setup: meta.setup || row.setup || '',
    timeframe: meta.timeframe || row.timeframe || '',
    resultR: meta.resultR || row.result_r || '',
    accountName: meta.accountName || row.account_name || '',
    attachments,
    preMarketPlan: {
      bias: row.pre_market_plan?.bias,
      keyLevels: row.pre_market_plan?.keyLevels,
      newsEvents: row.pre_market_plan?.newsEvents,
      maxRiskPerTrade: row.pre_market_plan?.maxRiskPerTrade,
      checklist: row.pre_market_plan?.checklist,
    },
    postMarketReview: row.post_market_review || {},
    contractsTraded: Number(row.contracts_traded || 0),
    volume: Number(row.volume || 0),
    netPnl: Number(row.net_pnl || 0),
    netRoi: Number(row.net_roi || 0),
    screenshots: Array.isArray(row.screenshots) ? row.screenshots : [],
    templateUsed: row.template_used,
    isFavorite: Boolean(row.is_favorite),
    isDeleted: Boolean(row.is_deleted ?? meta.isDeleted),
    deletedAt: row.deleted_at || meta.deletedAt || undefined,
    deletedBy: row.deleted_by || meta.deletedBy || undefined,
    originalFolderId: row.original_folder_id || meta.originalFolderId || undefined,
  };
}

export const STANDARD_SYSTEM_FOLDERS: JournalFolder[] = [
  { id: 'f-trade', name: 'Trade Notes', icon: 'FileText', count: 0 },
  { id: 'f-daily', name: 'Daily Journal', icon: 'BookOpen', count: 0 },
  { id: 'f-sessions', name: 'Sessions Recap', icon: 'Activity', count: 0 },
  { id: 'f-goals', name: 'Quarterly Goals 📅', icon: 'Target', count: 0 },
  { id: 'f-plan', name: 'Trading Plan 📈', icon: 'Compass', count: 0 },
  { id: 'f-templates', name: 'Templates', icon: 'Layout', count: 0 },
];

export async function fetchJournalNotesFromSupabase(userId: string): Promise<JournalNote[]> {
  const cacheKey = `journal_notes_${userId}`;
  try {
    if (!isSupabaseConfigured()) return getLocalCache(cacheKey, []);

    const { data, error } = await supabase
      .from('journal_notes')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('[Supabase Notes] Fetch notice:', error.message);
      return getLocalCache(cacheKey, []);
    }

    if (data && Array.isArray(data)) {
      const notes: JournalNote[] = data.map(mapRowToJournalNote);
      setLocalCache(cacheKey, notes);
      return notes;
    }
  } catch (err) {
    console.warn('[Supabase Notes] Network notice:', err);
  }
  return getLocalCache(cacheKey, []);
}

export async function upsertJournalNoteToSupabase(note: JournalNote, userId: string): Promise<boolean> {
  const cacheKey = `journal_notes_${userId}`;
  const existing = getLocalCache<JournalNote[]>(cacheKey, []);
  setLocalCache(cacheKey, [note, ...existing.filter(n => n.id !== note.id)]);

  if (!isSupabaseConfigured()) return true;

  try {
    const isDel = Boolean(note.isDeleted);
    const delAt = note.deletedAt ? new Date(note.deletedAt).toISOString() : null;
    const delBy = note.deletedBy || (isDel ? userId : null);
    const origFolderId = note.originalFolderId || (isDel ? (note.folderId || null) : null);

    const metaPayload = {
      time: note.time || '',
      symbol: note.symbol || '',
      side: note.side || '',
      setup: note.setup || '',
      timeframe: note.timeframe || '',
      resultR: note.resultR || '',
      tradeId: note.tradeId || '',
      accountName: note.accountName || '',
      attachments: note.attachments || [],
      isDeleted: isDel,
      deletedAt: delAt,
      deletedBy: delBy,
      originalFolderId: origFolderId,
    };

    const dbPayload: any = {
      id: note.id,
      user_id: userId,
      account_id: note.accountId || 'default',
      date: note.date || new Date().toISOString().split('T')[0],
      title: note.title || 'Untitled Note',
      folder_id: (note.folderId && note.folderId.trim()) ? note.folderId.trim() : null,
      tags: note.tags || [],
      content: note.content || '',
      pre_market_plan: {
        ...(note.preMarketPlan || {}),
        __meta: metaPayload,
      },
      post_market_review: note.postMarketReview || {},
      contracts_traded: note.contractsTraded || 0,
      volume: note.volume || 0,
      net_pnl: note.netPnl || 0,
      net_roi: note.netRoi || 0,
      screenshots: Array.isArray(note.screenshots) && note.screenshots.length > 0
        ? note.screenshots
        : (note.attachments?.filter(a => a.type === 'image').map(a => a.url) || []),
      template_used: note.templateUsed || null,
      is_favorite: Boolean(note.isFavorite),
      is_deleted: isDel,
      deleted_at: delAt,
      deleted_by: delBy,
      original_folder_id: origFolderId,
    };

    const { data, error } = await supabase
      .from('journal_notes')
      .upsert(dbPayload, { onConflict: 'id' })
      .select()
      .single();

    if (error) {
      console.warn('[Supabase Notes] Save notice:', error.message);
      return false;
    }

    if (data) {
      const parsed = mapRowToJournalNote(data);
      const existingUpdated = getLocalCache<JournalNote[]>(cacheKey, []);
      setLocalCache(cacheKey, [parsed, ...existingUpdated.filter(n => n.id !== parsed.id)]);
    }
    return true;
  } catch (err) {
    console.warn('[Supabase Notes] Save error:', err);
    return false;
  }
}

export async function softDeleteJournalNoteInSupabase(noteId: string, userId: string, originalFolderId?: string): Promise<boolean> {
  const cacheKey = `journal_notes_${userId}`;
  const now = new Date().toISOString();

  // Optimistic cache update
  const existing = getLocalCache<JournalNote[]>(cacheKey, []);
  setLocalCache(cacheKey, existing.map(n => n.id === noteId ? {
    ...n,
    isDeleted: true,
    deletedAt: now,
    deletedBy: userId,
    originalFolderId: originalFolderId || n.originalFolderId || n.folderId,
  } : n));

  if (!isSupabaseConfigured()) return true;

  try {
    const { error } = await supabase
      .from('journal_notes')
      .update({
        is_deleted: true,
        deleted_at: now,
        deleted_by: userId,
        original_folder_id: originalFolderId || null,
      })
      .eq('id', noteId)
      .eq('user_id', userId);

    if (error) {
      console.warn('[Supabase Notes] Soft-delete notice:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('[Supabase Notes] Soft-delete error:', err);
    return false;
  }
}

export async function restoreJournalNoteInSupabase(noteId: string, userId: string, targetFolderId?: string): Promise<boolean> {
  const cacheKey = `journal_notes_${userId}`;

  // Optimistic cache update
  const existing = getLocalCache<JournalNote[]>(cacheKey, []);
  setLocalCache(cacheKey, existing.map(n => n.id === noteId ? {
    ...n,
    isDeleted: false,
    deletedAt: undefined,
    deletedBy: undefined,
    folderId: targetFolderId !== undefined ? targetFolderId : (n.originalFolderId || n.folderId),
  } : n));

  if (!isSupabaseConfigured()) return true;

  try {
    const updatePayload: any = {
      is_deleted: false,
      deleted_at: null,
      deleted_by: null,
    };
    if (targetFolderId !== undefined) {
      updatePayload.folder_id = targetFolderId || null;
    }

    const { error } = await supabase
      .from('journal_notes')
      .update(updatePayload)
      .eq('id', noteId)
      .eq('user_id', userId);

    if (error) {
      console.warn('[Supabase Notes] Restore notice:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('[Supabase Notes] Restore error:', err);
    return false;
  }
}

export async function deleteJournalNoteFromSupabase(noteId: string, userId: string): Promise<boolean> {
  const cacheKey = `journal_notes_${userId}`;
  const existing = getLocalCache<JournalNote[]>(cacheKey, []);
  setLocalCache(cacheKey, existing.filter(n => n.id !== noteId));

  if (!isSupabaseConfigured()) return true;

  try {
    const { error } = await supabase
      .from('journal_notes')
      .delete()
      .eq('id', noteId)
      .eq('user_id', userId);

    if (error) {
      console.warn('[Supabase Notes] Delete notice:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('[Supabase Notes] Delete error:', err);
    return false;
  }
}

export async function fetchJournalFoldersFromSupabase(userId: string): Promise<JournalFolder[]> {
  const cacheKey = `journal_folders_${userId}`;
  try {
    if (!isSupabaseConfigured()) {
      const cached = getLocalCache<JournalFolder[]>(cacheKey, []);
      return cached.length > 0 ? cached : STANDARD_SYSTEM_FOLDERS;
    }

    const { data, error } = await supabase
      .from('journal_folders')
      .select('*')
      .eq('user_id', userId)
      .order('name');

    if (error) {
      console.warn('[Supabase Folders] Fetch notice:', error.message);
      const cached = getLocalCache<JournalFolder[]>(cacheKey, []);
      return cached.length > 0 ? cached : STANDARD_SYSTEM_FOLDERS;
    }

    const dbFolders: JournalFolder[] = (data && Array.isArray(data))
      ? data.map((row) => ({
          id: row.id,
          name: row.name,
          icon: row.icon || undefined,
          count: Number(row.count || 0),
          isDeleted: Boolean(row.is_deleted),
          deletedAt: row.deleted_at || undefined,
          deletedBy: row.deleted_by || undefined,
        }))
      : [];

    // Ensure all standard system folders exist in the folder set
    const folderMap = new Map<string, JournalFolder>();
    STANDARD_SYSTEM_FOLDERS.forEach(sf => folderMap.set(sf.id, { ...sf, isDeleted: false }));
    dbFolders.forEach(df => folderMap.set(df.id, df));

    const mergedFolders = Array.from(folderMap.values());
    setLocalCache(cacheKey, mergedFolders);

    // Asynchronously seed any missing standard folders into Supabase for this user
    const missingStandard = STANDARD_SYSTEM_FOLDERS.filter(
      sf => !dbFolders.some(df => df.id === sf.id)
    );
    if (missingStandard.length > 0) {
      Promise.all(
        missingStandard.map(folder =>
          supabase.from('journal_folders').upsert({
            id: folder.id,
            user_id: userId,
            name: folder.name,
            icon: folder.icon,
            count: 0,
            is_deleted: false,
          }, { onConflict: 'id' })
        )
      ).catch(e => console.warn('[Supabase Folders] Standard seeding notice:', e));
    }

    return mergedFolders;
  } catch (err) {
    console.warn('[Supabase Folders] Network notice:', err);
  }
  const cached = getLocalCache<JournalFolder[]>(cacheKey, []);
  return cached.length > 0 ? cached : STANDARD_SYSTEM_FOLDERS;
}

export async function upsertJournalFolderToSupabase(folder: JournalFolder, userId: string): Promise<boolean> {
  const cacheKey = `journal_folders_${userId}`;
  const existing = getLocalCache<JournalFolder[]>(cacheKey, []);
  setLocalCache(cacheKey, [folder, ...existing.filter((f) => f.id !== folder.id)]);

  if (!isSupabaseConfigured()) return true;

  try {
    const isDel = Boolean(folder.isDeleted);
    const delAt = folder.deletedAt ? new Date(folder.deletedAt).toISOString() : null;
    const delBy = folder.deletedBy || (isDel ? userId : null);

    const dbPayload = {
      id: folder.id,
      user_id: userId,
      name: folder.name,
      icon: folder.icon || null,
      count: folder.count || 0,
      is_deleted: isDel,
      deleted_at: delAt,
      deleted_by: delBy,
    };

    const { error } = await supabase
      .from('journal_folders')
      .upsert(dbPayload, { onConflict: 'id' });

    if (error) {
      console.warn('[Supabase Folders] Save notice:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('[Supabase Folders] Save error:', err);
    return false;
  }
}

export async function softDeleteJournalFolderInSupabase(folderId: string, userId: string): Promise<boolean> {
  const cacheKeyFolders = `journal_folders_${userId}`;
  const cacheKeyNotes = `journal_notes_${userId}`;
  const now = new Date().toISOString();

  // Optimistic update
  const folders = getLocalCache<JournalFolder[]>(cacheKeyFolders, []);
  setLocalCache(cacheKeyFolders, folders.map(f => f.id === folderId ? {
    ...f,
    isDeleted: true,
    deletedAt: now,
    deletedBy: userId,
  } : f));

  const notes = getLocalCache<JournalNote[]>(cacheKeyNotes, []);
  setLocalCache(cacheKeyNotes, notes.map(n => n.folderId === folderId ? {
    ...n,
    isDeleted: true,
    deletedAt: now,
    deletedBy: userId,
    originalFolderId: folderId,
  } : n));

  if (!isSupabaseConfigured()) return true;

  try {
    // 1. Soft delete folder
    const { error: folderError } = await supabase
      .from('journal_folders')
      .update({
        is_deleted: true,
        deleted_at: now,
        deleted_by: userId,
      })
      .eq('id', folderId)
      .eq('user_id', userId);

    if (folderError) {
      console.warn('[Supabase Folders] Soft-delete error:', folderError.message);
    }

    // 2. Cascade soft-delete child notes
    const { error: notesError } = await supabase
      .from('journal_notes')
      .update({
        is_deleted: true,
        deleted_at: now,
        deleted_by: userId,
        original_folder_id: folderId,
      })
      .eq('folder_id', folderId)
      .eq('user_id', userId);

    if (notesError) {
      console.warn('[Supabase Notes] Cascade soft-delete error:', notesError.message);
    }

    return true;
  } catch (err) {
    console.warn('[Supabase Folders] Soft-delete error:', err);
    return false;
  }
}

export async function restoreJournalFolderInSupabase(folderId: string, userId: string): Promise<boolean> {
  const cacheKeyFolders = `journal_folders_${userId}`;
  const cacheKeyNotes = `journal_notes_${userId}`;

  // Optimistic update
  const folders = getLocalCache<JournalFolder[]>(cacheKeyFolders, []);
  setLocalCache(cacheKeyFolders, folders.map(f => f.id === folderId ? {
    ...f,
    isDeleted: false,
    deletedAt: undefined,
    deletedBy: undefined,
  } : f));

  const notes = getLocalCache<JournalNote[]>(cacheKeyNotes, []);
  setLocalCache(cacheKeyNotes, notes.map(n => (n.folderId === folderId || n.originalFolderId === folderId) ? {
    ...n,
    isDeleted: false,
    deletedAt: undefined,
    deletedBy: undefined,
    folderId: folderId,
  } : n));

  if (!isSupabaseConfigured()) return true;

  try {
    // 1. Restore folder
    await supabase
      .from('journal_folders')
      .update({
        is_deleted: false,
        deleted_at: null,
        deleted_by: null,
      })
      .eq('id', folderId)
      .eq('user_id', userId);

    // 2. Restore child notes
    await supabase
      .from('journal_notes')
      .update({
        is_deleted: false,
        deleted_at: null,
        deleted_by: null,
        folder_id: folderId,
      })
      .or(`folder_id.eq.${folderId},original_folder_id.eq.${folderId}`)
      .eq('user_id', userId);

    return true;
  } catch (err) {
    console.warn('[Supabase Folders] Restore error:', err);
    return false;
  }
}

export async function deleteJournalFolderFromSupabase(folderId: string, userId: string): Promise<boolean> {
  const cacheKeyFolders = `journal_folders_${userId}`;
  const cacheKeyNotes = `journal_notes_${userId}`;

  const folders = getLocalCache<JournalFolder[]>(cacheKeyFolders, []);
  setLocalCache(cacheKeyFolders, folders.filter((f) => f.id !== folderId));

  const notes = getLocalCache<JournalNote[]>(cacheKeyNotes, []);
  setLocalCache(cacheKeyNotes, notes.filter((n) => n.folderId !== folderId && n.originalFolderId !== folderId));

  if (!isSupabaseConfigured()) return true;

  try {
    // 1. Permanently delete child notes
    await supabase
      .from('journal_notes')
      .delete()
      .or(`folder_id.eq.${folderId},original_folder_id.eq.${folderId}`)
      .eq('user_id', userId);

    // 2. Permanently delete folder
    const { error } = await supabase
      .from('journal_folders')
      .delete()
      .eq('id', folderId)
      .eq('user_id', userId);

    if (error) {
      console.warn('[Supabase Folders] Permanent delete error:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('[Supabase Folders] Permanent delete error:', err);
    return false;
  }
}

export async function purgeExpiredTrashFromSupabase(userId: string): Promise<void> {
  if (!isSupabaseConfigured()) return;
  try {
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();

    await supabase
      .from('journal_notes')
      .delete()
      .eq('user_id', userId)
      .eq('is_deleted', true)
      .lte('deleted_at', twoDaysAgo);

    await supabase
      .from('journal_folders')
      .delete()
      .eq('user_id', userId)
      .eq('is_deleted', true)
      .lte('deleted_at', twoDaysAgo);
  } catch (err) {
    console.warn('[Supabase Trash Purge] Notice:', err);
  }
}

// ==========================================
// 7. Risk Goals
// ==========================================
export async function fetchRiskGoalsFromSupabase(userId: string, accountId?: string): Promise<RiskGoalSettings | null> {
  const accKey = accountId && accountId !== 'all' ? `_${accountId}` : '';
  const cacheKey = `risk_goals_${userId}${accKey}`;
  try {
    if (!isSupabaseConfigured()) return getLocalCache(cacheKey, null);

    let query = supabase.from('risk_goals').select('*').eq('user_id', userId);
    if (accountId && accountId !== 'all') {
      query = query.eq('trading_account_id', accountId);
    }
    const { data, error } = await query.maybeSingle();

    if (error) {
      console.warn('[Supabase RiskGoals] Fetch notice:', error.message);
      return getLocalCache(cacheKey, null);
    }

    if (data) {
      const goals: RiskGoalSettings = {
        id: data.id,
        userId: data.user_id,
        tradingAccountId: data.trading_account_id,
        dailyProfitTarget: data.daily_profit_target,
        weeklyProfitTarget: data.weekly_profit_target,
        monthlyProfitTarget: data.monthly_profit_target,
        maxDailyLoss: data.max_daily_loss ?? data.daily_max_loss,
        dailyMaxLoss: data.daily_max_loss ?? data.max_daily_loss,
        maxWeeklyLoss: data.max_weekly_loss ?? data.weekly_loss_limit,
        weeklyLossLimit: data.weekly_loss_limit ?? data.max_weekly_loss,
        maxDrawdown: data.max_drawdown ?? data.max_drawdown_limit ?? data.trailing_drawdown_limit,
        maxDrawdownLimit: data.max_drawdown_limit ?? data.max_drawdown,
        trailingDrawdownLimit: data.trailing_drawdown_limit ?? data.max_drawdown,
        maxRiskPerTradePercent: data.max_risk_per_trade_percent,
        maxRiskPerTradeAmount: data.max_risk_per_trade_amount,
        riskMode: data.risk_mode || 'LOWER_OF_BOTH',
        maxTradesPerDay: data.max_trades_per_day,
        maxConsecutiveLosses: data.max_consecutive_losses,
        maxContractsPerTrade: data.max_contracts_per_trade,
        maxDailyLossStreak: data.max_daily_loss_streak,
        minRMultiple: data.min_r_multiple,
        maxPositionSize: data.max_position_size,
        maxOpenPositions: data.max_open_positions,
        enforceCircuitBreaker: data.enforce_circuit_breaker,
        circuitBreakerTriggered: data.circuit_breaker_triggered,
        circuitBreakerState: data.circuit_breaker_state || 'DISARMED',
        hardLockEnabled: data.hard_lock_enabled || false,
        warningThresholdPercent: data.warning_threshold_percent ?? 75,
        criticalThresholdPercent: data.critical_threshold_percent ?? 90,
        timezone: data.timezone || 'America/New_York',
        dailyResetTime: data.daily_reset_time || '17:00',
        includeFloatingPnl: data.include_floating_pnl || false,
        includeFees: data.include_fees ?? true,
        includeCommissions: data.include_commissions ?? true,
        drawdownMethodology: data.drawdown_methodology || 'EQUITY_BASED',
        weeklyTargetAction: data.weekly_target_action || 'CONTINUE',
        requireManualUnlock: data.require_manual_unlock ?? true,
        lockReason: data.lock_reason,
        lockedAt: data.locked_at,
        unlockedAt: data.unlocked_at,
        unlockedBy: data.unlocked_by,
        unlockReason: data.unlock_reason,
      };
      setLocalCache(cacheKey, goals);
      return goals;
    }
  } catch (err) {
    console.warn('[Supabase RiskGoals] Network notice:', err);
  }
  return getLocalCache(cacheKey, null);
}

export async function upsertRiskGoalsToSupabase(goals: Partial<RiskGoalSettings>, userId: string, accountId?: string): Promise<boolean> {
  const effectiveAccId = accountId || goals.tradingAccountId;
  const accKey = effectiveAccId && effectiveAccId !== 'all' ? `_${effectiveAccId}` : '';
  const cacheKey = `risk_goals_${userId}${accKey}`;
  const existing = getLocalCache<RiskGoalSettings>(cacheKey, {});
  setLocalCache(cacheKey, { ...existing, ...goals });

  if (!isSupabaseConfigured()) return true;

  try {
    const recordId = effectiveAccId && effectiveAccId !== 'all' ? `rg_${userId}_${effectiveAccId}` : `rg_${userId}`;
    const dbPayload: any = {
      id: recordId,
      user_id: userId,
      trading_account_id: effectiveAccId && effectiveAccId !== 'all' ? effectiveAccId : null,
      updated_at: new Date().toISOString(),
    };
    if (goals.dailyProfitTarget !== undefined) dbPayload.daily_profit_target = goals.dailyProfitTarget;
    if (goals.weeklyProfitTarget !== undefined) dbPayload.weekly_profit_target = goals.weeklyProfitTarget;
    if (goals.monthlyProfitTarget !== undefined) dbPayload.monthly_profit_target = goals.monthlyProfitTarget;
    if (goals.maxDailyLoss !== undefined || goals.dailyMaxLoss !== undefined) {
      const v = goals.dailyMaxLoss ?? goals.maxDailyLoss;
      dbPayload.max_daily_loss = v;
      dbPayload.daily_max_loss = v;
    }
    if (goals.maxWeeklyLoss !== undefined || goals.weeklyLossLimit !== undefined) {
      const v = goals.weeklyLossLimit ?? goals.maxWeeklyLoss;
      dbPayload.max_weekly_loss = v;
      dbPayload.weekly_loss_limit = v;
    }
    if (goals.maxDrawdown !== undefined || goals.trailingDrawdownLimit !== undefined) {
      const v = goals.trailingDrawdownLimit ?? goals.maxDrawdown;
      dbPayload.max_drawdown = v;
      dbPayload.max_drawdown_limit = v;
      dbPayload.trailing_drawdown_limit = v;
    }
    if (goals.maxRiskPerTradePercent !== undefined) dbPayload.max_risk_per_trade_percent = goals.maxRiskPerTradePercent;
    if (goals.maxRiskPerTradeAmount !== undefined) dbPayload.max_risk_per_trade_amount = goals.maxRiskPerTradeAmount;
    if (goals.riskMode !== undefined) dbPayload.risk_mode = goals.riskMode;
    if (goals.maxTradesPerDay !== undefined) dbPayload.max_trades_per_day = goals.maxTradesPerDay;
    if (goals.maxConsecutiveLosses !== undefined) dbPayload.max_consecutive_losses = goals.maxConsecutiveLosses;
    if (goals.maxContractsPerTrade !== undefined) dbPayload.max_contracts_per_trade = goals.maxContractsPerTrade;
    if (goals.maxDailyLossStreak !== undefined) dbPayload.max_daily_loss_streak = goals.maxDailyLossStreak;
    if (goals.minRMultiple !== undefined) dbPayload.min_r_multiple = goals.minRMultiple;
    if (goals.maxPositionSize !== undefined) dbPayload.max_position_size = goals.maxPositionSize;
    if (goals.maxOpenPositions !== undefined) dbPayload.max_open_positions = goals.maxOpenPositions;
    if (goals.enforceCircuitBreaker !== undefined) dbPayload.enforce_circuit_breaker = goals.enforceCircuitBreaker;
    if (goals.circuitBreakerTriggered !== undefined) dbPayload.circuit_breaker_triggered = goals.circuitBreakerTriggered;
    if (goals.circuitBreakerState !== undefined) dbPayload.circuit_breaker_state = goals.circuitBreakerState;
    if (goals.hardLockEnabled !== undefined) dbPayload.hard_lock_enabled = goals.hardLockEnabled;
    if (goals.warningThresholdPercent !== undefined) dbPayload.warning_threshold_percent = goals.warningThresholdPercent;
    if (goals.criticalThresholdPercent !== undefined) dbPayload.critical_threshold_percent = goals.criticalThresholdPercent;
    if (goals.timezone !== undefined) dbPayload.timezone = goals.timezone;
    if (goals.dailyResetTime !== undefined) dbPayload.daily_reset_time = goals.dailyResetTime;
    if (goals.includeFloatingPnl !== undefined) dbPayload.include_floating_pnl = goals.includeFloatingPnl;
    if (goals.includeFees !== undefined) dbPayload.include_fees = goals.includeFees;
    if (goals.includeCommissions !== undefined) dbPayload.include_commissions = goals.includeCommissions;
    if (goals.drawdownMethodology !== undefined) dbPayload.drawdown_methodology = goals.drawdownMethodology;
    if (goals.weeklyTargetAction !== undefined) dbPayload.weekly_target_action = goals.weeklyTargetAction;
    if (goals.requireManualUnlock !== undefined) dbPayload.require_manual_unlock = goals.requireManualUnlock;
    if (goals.lockReason !== undefined) dbPayload.lock_reason = goals.lockReason;
    if (goals.lockedAt !== undefined) dbPayload.locked_at = goals.lockedAt;
    if (goals.unlockedAt !== undefined) dbPayload.unlocked_at = goals.unlockedAt;
    if (goals.unlockedBy !== undefined) dbPayload.unlocked_by = goals.unlockedBy;
    if (goals.unlockReason !== undefined) dbPayload.unlock_reason = goals.unlockReason;

    const { error } = await supabase
      .from('risk_goals')
      .upsert(dbPayload, { onConflict: 'id' });

    if (error) {
      console.warn('[Supabase RiskGoals] Save notice:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('[Supabase RiskGoals] Save error:', err);
    return false;
  }
}

// ==========================================
// 8. User Settings & Custom Tags
// ==========================================
export async function fetchUserSettingsFromSupabase(userId: string): Promise<UserSettings | null> {
  const cacheKey = `user_settings_${userId}`;
  try {
    if (!isSupabaseConfigured()) return getLocalCache(cacheKey, null);

    const { data, error } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.warn('[Supabase Settings] Fetch notice:', error.message);
      return getLocalCache(cacheKey, null);
    }

    if (data) {
      const settings: UserSettings = {
        id: data.id || `settings-${userId}`,
        userId,
        scope: 'GLOBAL',
        general: data.general || {
          theme: 'dark',
          timezone: 'America/New_York',
          currency: 'USD',
          dateFormat: 'MM/DD/YYYY',
          timeFormat: '12h',
          currencyMode: 'USD',
          animationsEnabled: true,
        },
        notifications: data.notifications || {
          tradeAlerts: true,
          riskAlerts: true,
          propFirmWarnings: true,
          syncNotifications: true,
          dailyJournalReminder: false,
          weeklyPerformanceReview: true,
          soundEnabled: true,
        },
        aiSettings: data.ai_settings || {
          aiCoachEnabled: true,
          responseStyle: 'institutional',
          analysisScope: 'all',
          autoReviewTrades: true,
        },
        tradeDefaults: data.trade_defaults || {
          defaultAssetClass: 'FUTURES',
          defaultDirection: 'LONG',
          defaultSession: 'NY_AM',
          riskPercentPerTrade: 1.0,
          rMultipleTarget: 2.0,
        },
        commissionRules: Array.isArray(data.commission_rules) ? data.commission_rules : (data.commissions || []),
        profile: data.profile || {},
        updatedAt: data.updated_at,
      };
      setLocalCache(cacheKey, settings);
      return settings;
    }
  } catch (err) {
    console.warn('[Supabase Settings] Network notice:', err);
  }
  return getLocalCache(cacheKey, null);
}

export async function upsertUserSettingsToSupabase(settings: UserSettings, userId: string): Promise<boolean> {
  const cacheKey = `user_settings_${userId}`;
  setLocalCache(cacheKey, settings);

  if (!isSupabaseConfigured()) return true;

  try {
    const dbPayload = {
      user_id: userId,
      general: settings.general || {},
      notifications: settings.notifications || {},
      commission_rules: settings.commissionRules || [],
      trade_defaults: settings.tradeDefaults || {},
      profile: settings.profile || {},
      ai_settings: settings.aiSettings || {},
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('user_settings')
      .upsert(dbPayload, { onConflict: 'user_id' });

    if (error) {
      console.warn('[Supabase Settings] Save notice:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('[Supabase Settings] Save error:', err);
    return false;
  }
}

export async function fetchCustomTagsFromSupabase(userId: string): Promise<CustomTag[]> {
  const cacheKey = `custom_tags_${userId}`;
  try {
    if (!isSupabaseConfigured()) return getLocalCache(cacheKey, []);

    const { data, error } = await supabase
      .from('custom_tags')
      .select('*')
      .eq('user_id', userId)
      .order('name');

    if (error) {
      console.warn('[Supabase Tags] Fetch notice:', error.message);
      return getLocalCache(cacheKey, []);
    }

    if (data && Array.isArray(data)) {
      const tags: CustomTag[] = data.map((row) => ({
        id: row.id,
        name: row.name,
        category: (row.category as any) || 'Setup',
        color: row.color || '#3B82F6',
        description: row.description || '',
        isArchived: Boolean(row.is_archived),
        createdAt: row.created_at || new Date().toISOString(),
        updatedAt: row.updated_at,
      }));
      setLocalCache(cacheKey, tags);
      return tags;
    }
  } catch (err) {
    console.warn('[Supabase Tags] Network notice:', err);
  }
  return getLocalCache(cacheKey, []);
}

export async function insertCustomTagToSupabase(tag: CustomTag, userId: string): Promise<boolean> {
  const cacheKey = `custom_tags_${userId}`;
  const existing = getLocalCache<CustomTag[]>(cacheKey, []);
  setLocalCache(cacheKey, [tag, ...existing.filter((t) => t.id !== tag.id)]);

  if (!isSupabaseConfigured()) return true;

  try {
    const dbPayload = {
      id: tag.id,
      user_id: userId,
      name: tag.name,
      category: tag.category,
      color: tag.color,
      description: tag.description || null,
      is_archived: tag.isArchived ?? false,
      created_at: tag.createdAt || new Date().toISOString(),
    };

    const { error } = await supabase
      .from('custom_tags')
      .upsert(dbPayload, { onConflict: 'id' });

    if (error) {
      console.warn('[Supabase Tags] Save notice:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('[Supabase Tags] Save error:', err);
    return false;
  }
}

export async function deleteCustomTagFromSupabase(tagId: string, userId: string): Promise<boolean> {
  const cacheKey = `custom_tags_${userId}`;
  const existing = getLocalCache<CustomTag[]>(cacheKey, []);
  setLocalCache(cacheKey, existing.filter((t) => t.id !== tagId));

  if (!isSupabaseConfigured()) return true;

  try {
    const { error } = await supabase
      .from('custom_tags')
      .delete()
      .eq('id', tagId)
      .eq('user_id', userId);

    if (error) {
      console.warn('[Supabase Tags] Delete notice:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('[Supabase Tags] Delete error:', err);
    return false;
  }
}

// ==========================================
// 9. Backtest Sessions
// ==========================================
export async function fetchBacktestSessionsFromSupabase(userId: string): Promise<BacktestSession[]> {
  const cacheKey = `backtests_${userId}`;
  try {
    if (!isSupabaseConfigured()) return getLocalCache(cacheKey, []);

    const { data, error } = await supabase
      .from('backtest_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('[Supabase Backtests] Fetch notice:', error.message);
      return getLocalCache(cacheKey, []);
    }

    if (data && Array.isArray(data)) {
      const sessions: BacktestSession[] = data.map((row) => ({
        id: row.id,
        title: row.title,
        symbol: row.symbol,
        timeframe: row.timeframe,
        strategy: row.strategy,
        startDate: row.start_date,
        endDate: row.end_date,
        initialBalance: Number(row.initial_balance || 0),
        currentBalance: Number(row.current_balance || 0),
        trades: Array.isArray(row.trades) ? row.trades : [],
        totalTrades: Number(row.total_trades || 0),
        winRate: Number(row.win_rate || 0),
        netPnl: Number(row.net_pnl || 0),
        profitFactor: Number(row.profit_factor || 0),
        maxDrawdown: Number(row.max_drawdown || 0),
        currentIndex: Number(row.current_index || 0),
        notes: row.notes || '',
      }));
      setLocalCache(cacheKey, sessions);
      return sessions;
    }
  } catch (err) {
    console.warn('[Supabase Backtests] Network notice:', err);
  }
  return getLocalCache(cacheKey, []);
}

export async function upsertBacktestSessionToSupabase(session: BacktestSession, userId: string): Promise<boolean> {
  const cacheKey = `backtests_${userId}`;
  const existing = getLocalCache<BacktestSession[]>(cacheKey, []);
  setLocalCache(cacheKey, [session, ...existing.filter((s) => s.id !== session.id)]);

  if (!isSupabaseConfigured()) return true;

  try {
    const dbPayload = {
      id: session.id,
      user_id: userId,
      title: session.title,
      symbol: session.symbol,
      timeframe: session.timeframe,
      strategy: session.strategy,
      start_date: session.startDate,
      end_date: session.endDate,
      initial_balance: session.initialBalance,
      current_balance: session.currentBalance,
      trades: session.trades || [],
      total_trades: session.totalTrades || 0,
      win_rate: session.winRate || 0,
      net_pnl: session.netPnl || 0,
      profit_factor: session.profitFactor || 0,
      max_drawdown: session.maxDrawdown || 0,
      current_index: session.currentIndex || 0,
      notes: session.notes || '',
    };

    const { error } = await supabase
      .from('backtest_sessions')
      .upsert(dbPayload, { onConflict: 'id' });

    if (error) {
      console.warn('[Supabase Backtests] Save notice:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('[Supabase Backtests] Save error:', err);
    return false;
  }
}

// ==========================================
// 10. Notifications
// ==========================================
export async function fetchNotificationsFromSupabase(userId: string): Promise<AppNotification[]> {
  const cacheKey = `notifications_${userId}`;
  try {
    if (!isSupabaseConfigured()) return getLocalCache(cacheKey, []);

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('timestamp', { ascending: false })
      .limit(30);

    if (error) {
      console.warn('[Supabase Notifications] Fetch notice:', error.message);
      return getLocalCache(cacheKey, []);
    }

    if (data && Array.isArray(data)) {
      const notifs: AppNotification[] = data.map((row) => ({
        id: row.id,
        title: row.title,
        message: row.message,
        type: row.type as any,
        timestamp: row.timestamp,
        read: Boolean(row.read),
        actionUrl: row.action_url,
      }));
      setLocalCache(cacheKey, notifs);
      return notifs;
    }
  } catch (err) {
    console.warn('[Supabase Notifications] Network notice:', err);
  }
  return getLocalCache(cacheKey, []);
}

export async function markNotificationReadInSupabase(notifId: string, userId: string): Promise<boolean> {
  const cacheKey = `notifications_${userId}`;
  const existing = getLocalCache<AppNotification[]>(cacheKey, []);
  setLocalCache(cacheKey, existing.map((n) => (n.id === notifId ? { ...n, read: true } : n)));

  if (!isSupabaseConfigured()) return true;

  try {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notifId)
      .eq('user_id', userId);

    return !error;
  } catch {
    return false;
  }
}

export async function clearAllNotificationsInSupabase(userId: string): Promise<boolean> {
  const cacheKey = `notifications_${userId}`;
  setLocalCache(cacheKey, []);

  if (!isSupabaseConfigured()) return true;

  try {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('user_id', userId);

    return !error;
  } catch {
    return false;
  }
}
