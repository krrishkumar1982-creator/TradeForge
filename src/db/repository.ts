import { db, ensureLoungeTables } from './index.ts';
import {
  users,
  profiles,
  tradingAccounts,
  trades,
  playbooks,
  strategies,
  journalNotes,
  journalFolders,
  riskGoals,
  backtestSessions,
  communityPosts,
  postLikes,
  postComments,
  mentorStudents,
  mentorStudentRelationships,
  studentSharingPermissions,
  mentorDirectives,
  notifications,
  brokerIntegrations,
  integrationEvents,
  dailyChecklistStates,
  adminAuditLogs,
  backtestDrawings,
  chartTemplates,
  tradingAccountConnections,
  connectionSyncLogs,
  propFirmAccounts,
  userSettings,
  customTags,
  importHistory,
  activityLogs,
  userBackups,
  riskEvents,
} from './schema.ts';
import { eq, and, inArray, desc, sql, not, lte, ilike, or } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import {
  Trade,
  TradingAccount,
  TradingAccountConnection,
  ConnectionSyncLog,
  Playbook,
  Strategy,
  JournalNote,
  JournalFolder,
  RiskGoalSettings,
  RiskEvent,
  CommunityPost,
  MentorStudent,
  AppNotification,
  MarketType,
  SessionType,
  TradeDirection,
  TradeSource,
  PropFirmAccount,
  UserSettings,
  CustomTag,
  ImportHistoryItem,
  ActivityLogItem,
  CommissionRule,
  TradeEntryDefaults,
  GlobalPreferences,
  NotificationPreferences,
  AiSettings,
  UserBackup,
} from '../types/index.ts';
import { calculatePlaybookMetrics } from '../lib/metrics.ts';

// Mentor Code Generator Helpers
export function isValidMentorCode(code?: string | null): boolean {
  if (!code) return false;
  return /^TF-MTR-[A-Z0-9]{6}$/i.test(code.trim());
}

export async function generateUniqueMentorCode(): Promise<string> {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  for (let attempt = 0; attempt < 100; attempt++) {
    let rand = '';
    for (let i = 0; i < 6; i++) {
      rand += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const candidate = `TF-MTR-${rand}`;
    const pCheck = await db.select({ id: profiles.id }).from(profiles).where(eq(profiles.accountCode, candidate)).limit(1);
    if (pCheck.length > 0) continue;
    const uCheck = await db.select({ id: users.id }).from(users).where(eq(users.accountCode, candidate)).limit(1);
    if (uCheck.length > 0) continue;
    return candidate;
  }
  return `TF-MTR-${Date.now().toString(36).toUpperCase().slice(-6)}`;
}

// User & Profile
export async function getUserProfile(userId: string) {
  try {
    let profile: any = null;
    const profileRows = await db.select().from(profiles).where(eq(profiles.id, userId));
    const userRows = await db.select().from(users).where(eq(users.uid, userId));

    if (profileRows.length > 0) {
      profile = profileRows[0];
    } else if (userRows.length > 0) {
      const u = userRows[0];
      profile = {
        id: u.uid,
        fullName: u.name,
        email: u.email,
        accountCode: u.accountCode,
        experienceLevel: u.experienceLevel,
        avatarUrl: u.avatar,
      };
    }

    // Determine if we already have a valid TF-MTR-XXXXXX code in profiles or users
    let existingValidCode: string | null = null;
    if (profile && isValidMentorCode(profile.accountCode)) {
      existingValidCode = profile.accountCode;
    } else if (userRows.length > 0 && isValidMentorCode(userRows[0].accountCode)) {
      existingValidCode = userRows[0].accountCode;
    }

    const now = new Date();

    // If profile row doesn't exist yet in profiles table, insert it
    if (profileRows.length === 0) {
      const finalCode = existingValidCode || (await generateUniqueMentorCode());
      console.log(`[MENTOR CODE] Creating new profile for ${userId}. Code: ${finalCode}. Generation triggered: ${!existingValidCode}`);

      const [created] = await db
        .insert(profiles)
        .values({
          id: userId,
          fullName: userRows.length > 0 ? userRows[0].name : 'Trader',
          email: userRows.length > 0 ? userRows[0].email : '',
          accountCode: finalCode,
          experienceLevel: 'Intermediate',
          avatarUrl: userRows.length > 0 ? userRows[0].avatar : '',
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoNothing()
        .returning();

      // Ensure users table also has this code
      if (userRows.length > 0 && userRows[0].accountCode !== finalCode) {
        await db.update(users).set({ accountCode: finalCode }).where(eq(users.uid, userId));
      }

      if (created) return created;
      const reFetch = await db.select().from(profiles).where(eq(profiles.id, userId));
      if (reFetch.length > 0) return reFetch[0];
    }

    // Profile row exists. Guarantee a valid, permanent TF-MTR-XXXXXX code
    if (!existingValidCode) {
      // Genuine NULL or invalid code: generate ONCE and persist
      const newCode = await generateUniqueMentorCode();
      console.log(`[MENTOR CODE] Generating code for existing profile without valid code for ${userId}: ${newCode}`);
      await db.update(profiles).set({ accountCode: newCode, updatedAt: now }).where(eq(profiles.id, userId));
      if (userRows.length > 0) {
        await db.update(users).set({ accountCode: newCode }).where(eq(users.uid, userId));
      }
      profile.accountCode = newCode;
    } else {
      console.log(`[MENTOR CODE] Existing code found for ${userId}: ${existingValidCode}. Generation skipped.`);
      profile.accountCode = existingValidCode;

      // Ensure profiles and users tables are in sync
      if (profileRows.length > 0 && profileRows[0].accountCode !== existingValidCode) {
        await db.update(profiles).set({ accountCode: existingValidCode, updatedAt: now }).where(eq(profiles.id, userId));
      }
      if (userRows.length > 0 && userRows[0].accountCode !== existingValidCode) {
        await db.update(users).set({ accountCode: existingValidCode }).where(eq(users.uid, userId));
      }
    }

    return profile;
  } catch (error) {
    console.error('getUserProfile error:', error);
    return null;
  }
}

export async function upsertUserProfile(
  userId: string,
  data: {
    fullName?: string;
    email?: string;
    accountCode?: string;
    experienceLevel?: string;
    avatarUrl?: string;
  }
) {
  try {
    const existingProfiles = await db.select().from(profiles).where(eq(profiles.id, userId));
    const existingUsers = await db.select().from(users).where(eq(users.uid, userId));
    const now = new Date();

    // Determine accountCode / trader handle:
    // If the user explicitly provided a non-empty accountCode, validate and use it!
    let permanentCode: string | null = null;
    const requestedCode = data.accountCode ? data.accountCode.trim().toUpperCase() : null;
    
    if (requestedCode && /^[A-Z0-9_-]{3,32}$/i.test(requestedCode)) {
      permanentCode = requestedCode;
    } else if (existingProfiles.length > 0 && existingProfiles[0].accountCode) {
      permanentCode = existingProfiles[0].accountCode;
    } else if (existingUsers.length > 0 && existingUsers[0].accountCode) {
      permanentCode = existingUsers[0].accountCode;
    } else {
      permanentCode = await generateUniqueMentorCode();
      console.log(`[MENTOR CODE] Generated new code in upsertUserProfile for ${userId}: ${permanentCode}`);
    }

    if (existingProfiles.length > 0) {
      const [updated] = await db
        .update(profiles)
        .set({
          fullName: data.fullName !== undefined ? data.fullName : existingProfiles[0].fullName,
          email: data.email !== undefined ? data.email : existingProfiles[0].email,
          accountCode: permanentCode,
          experienceLevel: data.experienceLevel !== undefined ? data.experienceLevel : existingProfiles[0].experienceLevel,
          avatarUrl: data.avatarUrl !== undefined ? data.avatarUrl : existingProfiles[0].avatarUrl,
          updatedAt: now,
        })
        .where(eq(profiles.id, userId))
        .returning();

      if (existingUsers.length > 0 && existingUsers[0].accountCode !== permanentCode) {
        await db.update(users).set({ accountCode: permanentCode }).where(eq(users.uid, userId));
      }

      return updated;
    } else {
      const [created] = await db
        .insert(profiles)
        .values({
          id: userId,
          fullName: data.fullName || 'Trader',
          email: data.email || '',
          accountCode: permanentCode,
          experienceLevel: data.experienceLevel || 'Intermediate',
          avatarUrl: data.avatarUrl || '',
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      if (existingUsers.length > 0 && existingUsers[0].accountCode !== permanentCode) {
        await db.update(users).set({ accountCode: permanentCode }).where(eq(users.uid, userId));
      }

      return created;
    }
  } catch (error) {
    console.error('upsertUserProfile error:', error);
    return null;
  }
}

export async function getOrCreateUser(
  uid: string,
  email = '',
  name = 'Trader',
  accountCode?: string
) {
  try {
    const profile = await getUserProfile(uid);
    const validCode = profile?.accountCode || (isValidMentorCode(accountCode) ? accountCode! : await generateUniqueMentorCode());

    const existingUsers = await db.select().from(users).where(eq(users.uid, uid));
    if (existingUsers.length > 0) {
      if (existingUsers[0].accountCode !== validCode) {
        await db.update(users).set({ accountCode: validCode }).where(eq(users.uid, uid));
        existingUsers[0].accountCode = validCode;
      }
      return existingUsers[0];
    }

    const [newUser] = await db
      .insert(users)
      .values({
        uid,
        email,
        name,
        accountCode: validCode,
        experienceLevel: 'Intermediate',
      })
      .onConflictDoNothing()
      .returning();

    if (newUser) return newUser;
    const refetched = await db.select().from(users).where(eq(users.uid, uid));
    return refetched[0];
  } catch (error) {
    console.error('getOrCreateUser error:', error);
    throw new Error('Failed to get or create user', { cause: error });
  }
}

// Trading Accounts
export async function getTradingAccounts(userId: string): Promise<TradingAccount[]> {
  try {
    const rows = await db
      .select()
      .from(tradingAccounts)
      .where(eq(tradingAccounts.userId, userId));
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      broker: r.broker,
      type: r.type as TradingAccount['type'],
      currency: r.currency,
      initialBalance: r.initialBalance,
      currentBalance: r.currentBalance,
      isDefault: r.isDefault,
      lastSync: r.lastSync || undefined,
      syncStatus: r.syncStatus as TradingAccount['syncStatus'],
    }));
  } catch (error) {
    console.error('getTradingAccounts error:', error);
    return [];
  }
}

export async function saveTradingAccount(userId: string, account: TradingAccount) {
  try {
    const existing = await db
      .select({ owner: tradingAccounts.userId })
      .from(tradingAccounts)
      .where(eq(tradingAccounts.id, account.id));

    if (existing.length > 0) {
      if (existing[0].owner !== userId) {
        throw new Error('Forbidden: Account belongs to another user');
      }
      await db
        .update(tradingAccounts)
        .set({
          name: account.name,
          broker: account.broker,
          type: account.type,
          currency: account.currency,
          initialBalance: account.initialBalance,
          currentBalance: account.currentBalance,
          isDefault: account.isDefault,
          lastSync: account.lastSync || null,
          syncStatus: account.syncStatus,
        })
        .where(and(eq(tradingAccounts.id, account.id), eq(tradingAccounts.userId, userId)));
    } else {
      await db.insert(tradingAccounts).values({
        id: account.id,
        userId,
        name: account.name,
        broker: account.broker,
        type: account.type,
        currency: account.currency,
        initialBalance: account.initialBalance,
        currentBalance: account.currentBalance,
        isDefault: account.isDefault,
        lastSync: account.lastSync || null,
        syncStatus: account.syncStatus,
      });
    }
  } catch (error) {
    console.error('saveTradingAccount error:', error);
    throw error;
  }
}

export async function deleteTradingAccount(userId: string, id: string) {
  try {
    const existing = await db
      .select({ owner: tradingAccounts.userId })
      .from(tradingAccounts)
      .where(eq(tradingAccounts.id, id));

    if (existing.length > 0 && existing[0].owner !== userId) {
      throw new Error('Forbidden: Account belongs to another user');
    }

    await db
      .delete(tradingAccounts)
      .where(and(eq(tradingAccounts.id, id), eq(tradingAccounts.userId, userId)));
  } catch (error) {
    console.error('deleteTradingAccount error:', error);
    throw error;
  }
}

// Trades
export async function getTrades(userId: string): Promise<Trade[]> {
  try {
    const rows = await db.select().from(trades).where(eq(trades.userId, userId));
    return rows.map((r) => ({
      id: r.id,
      accountId: r.accountId,
      propFirmAccountId: r.propFirmAccountId || undefined,
      connectionId: r.connectionId || undefined,
      externalTradeId: r.externalTradeId || undefined,
      platform: r.platform || undefined,
      broker: r.broker || undefined,
      source: (r.source as Trade['source']) || 'manual',
      orderId: r.orderId || undefined,
      positionId: r.positionId || undefined,
      symbol: r.symbol,
      market: r.market as Trade['market'],
      direction: r.direction as Trade['direction'],
      status: r.status as Trade['status'],
      entryDate: r.entryDate,
      exitDate: r.exitDate || undefined,
      entryPrice: r.entryPrice,
      exitPrice: r.exitPrice || undefined,
      stopLoss: r.stopLoss || undefined,
      takeProfit: r.takeProfit || undefined,
      quantity: r.quantity,
      grossPnl: r.grossPnl,
      netPnl: r.netPnl,
      commission: r.commission,
      swap: r.swap,
      fees: r.fees,
      rMultiple: r.rMultiple,
      roiPercent: r.roiPercent,
      session: r.session as Trade['session'],
      strategyId: r.strategyId || undefined,
      playbookId: r.playbookId || undefined,
      setupId: r.setupId || undefined,
      setupType: r.setupType,
      setupGrade: (r.setupGrade as Trade['setupGrade']) || undefined,
      autoGrade: (r.autoGrade as Trade['autoGrade']) || undefined,
      ruleCompliancePercent: r.ruleCompliancePercent !== null && r.ruleCompliancePercent !== undefined ? r.ruleCompliancePercent : undefined,
      checkedRuleIds: Array.isArray(r.checkedRuleIds) ? (r.checkedRuleIds as string[]) : undefined,
      brokenRuleIds: Array.isArray(r.brokenRuleIds) ? (r.brokenRuleIds as string[]) : undefined,
      mistakeCategory: r.mistakeCategory || undefined,
      mistakeDescription: r.mistakeDescription || undefined,
      mistakeSeverity: (r.mistakeSeverity as Trade['mistakeSeverity']) || undefined,
      rating: r.rating,
      notes: r.notes,
      tags: Array.isArray(r.tags) ? (r.tags as string[]) : [],
      mistakes: Array.isArray(r.mistakes) ? (r.mistakes as string[]) : [],
      rulesFollowed: r.rulesFollowed,
      screenshotUrl: r.screenshotUrl || undefined,
      afterScreenshotUrl: r.afterScreenshotUrl || undefined,
      durationMinutes: r.durationMinutes,
      emotionalState: (r.emotionalState as Trade['emotionalState']) || undefined,
    }));
  } catch (error) {
    console.error('getTrades error:', error);
    return [];
  }
}

export async function saveTrade(userId: string, trade: Trade) {
  try {
    const existing = await db
      .select({ owner: trades.userId })
      .from(trades)
      .where(eq(trades.id, trade.id));

    if (existing.length > 0) {
      if (existing[0].owner !== userId) {
        throw new Error('Forbidden: Trade belongs to another user');
      }
      await db
        .update(trades)
        .set({
          accountId: trade.accountId,
          propFirmAccountId: trade.propFirmAccountId || null,
          connectionId: trade.connectionId || null,
          externalTradeId: trade.externalTradeId || null,
          platform: trade.platform || null,
          broker: trade.broker || null,
          source: trade.source || 'manual',
          orderId: trade.orderId || null,
          positionId: trade.positionId || null,
          symbol: trade.symbol,
          market: trade.market,
          direction: trade.direction,
          status: trade.status,
          entryDate: trade.entryDate,
          exitDate: trade.exitDate || null,
          entryPrice: trade.entryPrice,
          exitPrice: trade.exitPrice || null,
          stopLoss: trade.stopLoss || null,
          takeProfit: trade.takeProfit || null,
          quantity: trade.quantity,
          grossPnl: trade.grossPnl,
          netPnl: trade.netPnl,
          commission: trade.commission,
          swap: trade.swap,
          fees: trade.fees,
          rMultiple: trade.rMultiple,
          roiPercent: trade.roiPercent,
          session: trade.session,
          strategyId: trade.strategyId || null,
          playbookId: trade.playbookId || null,
          setupId: trade.setupId || null,
          setupType: trade.setupType,
          setupGrade: trade.setupGrade || null,
          autoGrade: trade.autoGrade || null,
          ruleCompliancePercent: trade.ruleCompliancePercent !== undefined ? trade.ruleCompliancePercent : null,
          checkedRuleIds: trade.checkedRuleIds || [],
          brokenRuleIds: trade.brokenRuleIds || [],
          mistakeCategory: trade.mistakeCategory || null,
          mistakeDescription: trade.mistakeDescription || null,
          mistakeSeverity: trade.mistakeSeverity || null,
          rating: trade.rating,
          notes: trade.notes,
          tags: trade.tags || [],
          mistakes: trade.mistakes || [],
          rulesFollowed: trade.rulesFollowed,
          screenshotUrl: trade.screenshotUrl || null,
          afterScreenshotUrl: trade.afterScreenshotUrl || null,
          durationMinutes: trade.durationMinutes,
          emotionalState: trade.emotionalState || null,
        })
        .where(and(eq(trades.id, trade.id), eq(trades.userId, userId)));
    } else {
      await db.insert(trades).values({
        id: trade.id,
        userId,
        accountId: trade.accountId,
        propFirmAccountId: trade.propFirmAccountId || null,
        connectionId: trade.connectionId || null,
        externalTradeId: trade.externalTradeId || null,
        platform: trade.platform || null,
        broker: trade.broker || null,
        source: trade.source || 'manual',
        orderId: trade.orderId || null,
        positionId: trade.positionId || null,
        symbol: trade.symbol,
        market: trade.market,
        direction: trade.direction,
        status: trade.status,
        entryDate: trade.entryDate,
        exitDate: trade.exitDate || null,
        entryPrice: trade.entryPrice,
        exitPrice: trade.exitPrice || null,
        stopLoss: trade.stopLoss || null,
        takeProfit: trade.takeProfit || null,
        quantity: trade.quantity,
        grossPnl: trade.grossPnl,
        netPnl: trade.netPnl,
        commission: trade.commission,
        swap: trade.swap,
        fees: trade.fees,
        rMultiple: trade.rMultiple,
        roiPercent: trade.roiPercent,
        session: trade.session,
        strategyId: trade.strategyId || null,
        playbookId: trade.playbookId || null,
        setupId: trade.setupId || null,
        setupType: trade.setupType,
        setupGrade: trade.setupGrade || null,
        autoGrade: trade.autoGrade || null,
        ruleCompliancePercent: trade.ruleCompliancePercent !== undefined ? trade.ruleCompliancePercent : null,
        checkedRuleIds: trade.checkedRuleIds || [],
        brokenRuleIds: trade.brokenRuleIds || [],
        mistakeCategory: trade.mistakeCategory || null,
        mistakeDescription: trade.mistakeDescription || null,
        mistakeSeverity: trade.mistakeSeverity || null,
        rating: trade.rating,
        notes: trade.notes,
        tags: trade.tags || [],
        mistakes: trade.mistakes || [],
        rulesFollowed: trade.rulesFollowed,
        screenshotUrl: trade.screenshotUrl || null,
        afterScreenshotUrl: trade.afterScreenshotUrl || null,
        durationMinutes: trade.durationMinutes,
        emotionalState: trade.emotionalState || null,
      });
    }
  } catch (error) {
    console.error('saveTrade error:', error);
    throw error;
  }
}

export async function deleteTrade(userId: string, id: string) {
  try {
    const existing = await db
      .select({ owner: trades.userId })
      .from(trades)
      .where(eq(trades.id, id));

    if (existing.length > 0 && existing[0].owner !== userId) {
      throw new Error('Forbidden: Trade belongs to another user');
    }

    await db
      .delete(trades)
      .where(and(eq(trades.id, id), eq(trades.userId, userId)));
  } catch (error) {
    console.error('deleteTrade error:', error);
    throw error;
  }
}

export async function bulkDeleteTrades(userId: string, ids: string[]) {
  try {
    if (ids.length === 0) return;
    await db
      .delete(trades)
      .where(and(inArray(trades.id, ids), eq(trades.userId, userId)));
  } catch (error) {
    console.error('bulkDeleteTrades error:', error);
  }
}

// Playbooks
export async function getPlaybooks(userId: string): Promise<Playbook[]> {
  try {
    const rows = await db.select().from(playbooks).where(eq(playbooks.userId, userId));
    const allUserTrades = await getTrades(userId);
    const userTrades = allUserTrades.filter(t => t.status === 'CLOSED');

    return rows.map((r) => {
      const pbTrades = userTrades.filter(t => t.playbookId === r.id);
      const metrics = calculatePlaybookMetrics(pbTrades);

      return {
        id: r.id,
        name: r.name,
        icon: r.icon,
        color: r.color,
        description: r.description,
        status: r.status as Playbook['status'],
        rules: Array.isArray(r.rules) ? (r.rules as any[]) : [],
        exampleScreenshots: Array.isArray(r.exampleScreenshots)
          ? (r.exampleScreenshots as string[])
          : [],
        totalTrades: metrics.totalTrades,
        winRate: metrics.winRate,
        netPnl: metrics.netPnl,
        profitFactor: metrics.profitFactor,
        avgWinner: metrics.avgWinner,
        avgLoser: metrics.avgLoser,
        expectancy: metrics.expectancy,
        missedTradesCount: r.missedTradesCount,
        isPrivate: r.isPrivate,
      };
    });
  } catch (error) {
    console.error('getPlaybooks error:', error);
    return [];
  }
}

export async function savePlaybook(userId: string, pb: Playbook) {
  try {
    const existing = await db
      .select({ owner: playbooks.userId })
      .from(playbooks)
      .where(eq(playbooks.id, pb.id));

    if (existing.length > 0) {
      if (existing[0].owner !== userId) {
        throw new Error('Forbidden: Playbook belongs to another user');
      }
      await db
        .update(playbooks)
        .set({
          name: pb.name,
          icon: pb.icon,
          color: pb.color,
          description: pb.description,
          status: pb.status,
          rules: pb.rules || [],
          exampleScreenshots: pb.exampleScreenshots || [],
          totalTrades: pb.totalTrades,
          winRate: pb.winRate,
          netPnl: pb.netPnl,
          profitFactor: pb.profitFactor,
          avgWinner: pb.avgWinner,
          avgLoser: pb.avgLoser,
          expectancy: pb.expectancy,
          missedTradesCount: pb.missedTradesCount,
          isPrivate: pb.isPrivate,
        })
        .where(and(eq(playbooks.id, pb.id), eq(playbooks.userId, userId)));
    } else {
      await db.insert(playbooks).values({
        id: pb.id,
        userId,
        name: pb.name,
        icon: pb.icon,
        color: pb.color,
        description: pb.description,
        status: pb.status,
        rules: pb.rules || [],
        exampleScreenshots: pb.exampleScreenshots || [],
        totalTrades: pb.totalTrades,
        winRate: pb.winRate,
        netPnl: pb.netPnl,
        profitFactor: pb.profitFactor,
        avgWinner: pb.avgWinner,
        avgLoser: pb.avgLoser,
        expectancy: pb.expectancy,
        missedTradesCount: pb.missedTradesCount,
        isPrivate: pb.isPrivate,
      });
    }
  } catch (error) {
    console.error('savePlaybook error:', error);
    throw error;
  }
}

export async function deletePlaybook(userId: string, id: string) {
  try {
    const existing = await db
      .select({ owner: playbooks.userId })
      .from(playbooks)
      .where(eq(playbooks.id, id));

    if (existing.length > 0 && existing[0].owner !== userId) {
      throw new Error('Forbidden: Playbook belongs to another user');
    }

    await db
      .delete(playbooks)
      .where(and(eq(playbooks.id, id), eq(playbooks.userId, userId)));
  } catch (error) {
    console.error('deletePlaybook error:', error);
    throw error;
  }
}

// Strategies
export async function getStrategies(userId: string): Promise<Strategy[]> {
  try {
    const rows = await db.select().from(strategies).where(eq(strategies.userId, userId));
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      timeframe: r.timeframe,
      marketType: r.marketType as Strategy['marketType'],
      winRate: r.winRate,
      totalTrades: r.totalTrades,
      netPnl: r.netPnl,
      profitFactor: r.profitFactor,
      rules: Array.isArray(r.rules) ? (r.rules as string[]) : [],
      isActive: r.isActive,
    }));
  } catch (error) {
    console.error('getStrategies error:', error);
    return [];
  }
}

export async function saveStrategy(userId: string, s: Strategy) {
  try {
    const existing = await db
      .select({ owner: strategies.userId })
      .from(strategies)
      .where(eq(strategies.id, s.id));

    if (existing.length > 0) {
      if (existing[0].owner !== userId) {
        throw new Error('Forbidden: Strategy belongs to another user');
      }
      await db
        .update(strategies)
        .set({
          name: s.name,
          description: s.description,
          timeframe: s.timeframe,
          marketType: s.marketType,
          winRate: s.winRate,
          totalTrades: s.totalTrades,
          netPnl: s.netPnl,
          profitFactor: s.profitFactor,
          rules: s.rules || [],
          isActive: s.isActive,
        })
        .where(and(eq(strategies.id, s.id), eq(strategies.userId, userId)));
    } else {
      await db.insert(strategies).values({
        id: s.id,
        userId,
        name: s.name,
        description: s.description,
        timeframe: s.timeframe,
        marketType: s.marketType,
        winRate: s.winRate,
        totalTrades: s.totalTrades,
        netPnl: s.netPnl,
        profitFactor: s.profitFactor,
        rules: s.rules || [],
        isActive: s.isActive,
      });
    }
  } catch (error) {
    console.error('saveStrategy error:', error);
    throw error;
  }
}

export async function deleteStrategy(userId: string, id: string) {
  try {
    const existing = await db
      .select({ owner: strategies.userId })
      .from(strategies)
      .where(eq(strategies.id, id));

    if (existing.length > 0 && existing[0].owner !== userId) {
      throw new Error('Forbidden: Strategy belongs to another user');
    }

    await db
      .delete(strategies)
      .where(and(eq(strategies.id, id), eq(strategies.userId, userId)));
  } catch (error) {
    console.error('deleteStrategy error:', error);
    throw error;
  }
}

// Journal Notes
export async function getJournalNotes(userId: string): Promise<JournalNote[]> {
  try {
    const rows = await db.select().from(journalNotes).where(eq(journalNotes.userId, userId));
    return rows.map((r) => ({
      id: r.id,
      accountId: r.accountId,
      date: r.date,
      title: r.title,
      folderId: r.folderId || '',
      tags: Array.isArray(r.tags) ? (r.tags as string[]) : [],
      content: r.content,
      preMarketPlan: (r.preMarketPlan as any) || {},
      postMarketReview: (r.postMarketReview as any) || {},
      contractsTraded: r.contractsTraded || undefined,
      volume: r.volume || undefined,
      netPnl: r.netPnl || undefined,
      netRoi: r.netRoi || undefined,
      screenshots: Array.isArray(r.screenshots) ? (r.screenshots as string[]) : [],
      templateUsed: r.templateUsed || undefined,
      isFavorite: r.isFavorite || false,
      isDeleted: Boolean(r.isDeleted),
      deletedAt: r.deletedAt ? new Date(r.deletedAt).toISOString() : undefined,
      deletedBy: r.deletedBy || undefined,
      originalFolderId: r.originalFolderId || undefined,
    }));
  } catch (error) {
    console.error('getJournalNotes error:', error);
    return [];
  }
}

export async function saveJournalNote(userId: string, note: JournalNote) {
  try {
    const existing = await db
      .select({ owner: journalNotes.userId })
      .from(journalNotes)
      .where(eq(journalNotes.id, note.id));

    const cleanFolderId = (note.folderId && note.folderId.trim()) ? note.folderId.trim() : null;
    const isDel = Boolean(note.isDeleted);
    const delAt = note.deletedAt ? new Date(note.deletedAt) : null;
    const delBy = note.deletedBy || (isDel ? userId : null);
    const origFolderId = note.originalFolderId || (isDel ? (note.folderId || null) : null);

    if (existing.length > 0) {
      if (existing[0].owner !== userId) {
        throw new Error('Forbidden: Journal note belongs to another user');
      }
      await db
        .update(journalNotes)
        .set({
          accountId: note.accountId || 'default',
          date: note.date,
          title: note.title,
          folderId: cleanFolderId,
          tags: note.tags || [],
          content: note.content || '',
          preMarketPlan: note.preMarketPlan || {},
          postMarketReview: note.postMarketReview || {},
          contractsTraded: note.contractsTraded || null,
          volume: note.volume || null,
          netPnl: note.netPnl || null,
          netRoi: note.netRoi || null,
          screenshots: note.screenshots || [],
          templateUsed: note.templateUsed || null,
          isFavorite: note.isFavorite || false,
          isDeleted: isDel,
          deletedAt: delAt,
          deletedBy: delBy,
          originalFolderId: origFolderId,
        })
        .where(and(eq(journalNotes.id, note.id), eq(journalNotes.userId, userId)));
    } else {
      await db.insert(journalNotes).values({
        id: note.id,
        userId,
        accountId: note.accountId || 'default',
        date: note.date,
        title: note.title,
        folderId: cleanFolderId,
        tags: note.tags || [],
        content: note.content || '',
        preMarketPlan: note.preMarketPlan || {},
        postMarketReview: note.postMarketReview || {},
        contractsTraded: note.contractsTraded || null,
        volume: note.volume || null,
        netPnl: note.netPnl || null,
        netRoi: note.netRoi || null,
        screenshots: note.screenshots || [],
        templateUsed: note.templateUsed || null,
        isFavorite: note.isFavorite || false,
        isDeleted: isDel,
        deletedAt: delAt,
        deletedBy: delBy,
        originalFolderId: origFolderId,
      });
    }
  } catch (error) {
    console.error('saveJournalNote error:', error);
    throw error;
  }
}

export async function softDeleteJournalNote(userId: string, id: string) {
  try {
    const existing = await db
      .select({ owner: journalNotes.userId, folderId: journalNotes.folderId })
      .from(journalNotes)
      .where(eq(journalNotes.id, id));

    if (existing.length > 0 && existing[0].owner !== userId) {
      throw new Error('Forbidden: Journal note belongs to another user');
    }

    const currentFolder = existing.length > 0 ? existing[0].folderId : null;

    await db
      .update(journalNotes)
      .set({
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: userId,
        originalFolderId: currentFolder,
      })
      .where(and(eq(journalNotes.id, id), eq(journalNotes.userId, userId)));
  } catch (error) {
    console.error('softDeleteJournalNote error:', error);
    throw error;
  }
}

export async function restoreJournalNote(userId: string, id: string, originalFolderId?: string) {
  try {
    const existing = await db
      .select({ owner: journalNotes.userId, originalFolderId: journalNotes.originalFolderId, folderId: journalNotes.folderId })
      .from(journalNotes)
      .where(eq(journalNotes.id, id));

    if (existing.length > 0 && existing[0].owner !== userId) {
      throw new Error('Forbidden: Journal note belongs to another user');
    }

    const targetFolder = originalFolderId || existing[0]?.originalFolderId || existing[0]?.folderId || null;

    await db
      .update(journalNotes)
      .set({
        isDeleted: false,
        deletedAt: null,
        deletedBy: null,
        folderId: targetFolder,
      })
      .where(and(eq(journalNotes.id, id), eq(journalNotes.userId, userId)));
  } catch (error) {
    console.error('restoreJournalNote error:', error);
    throw error;
  }
}

export async function deleteJournalNote(userId: string, id: string, permanent: boolean = false) {
  if (!permanent) {
    return await softDeleteJournalNote(userId, id);
  }
  try {
    const existing = await db
      .select({ owner: journalNotes.userId })
      .from(journalNotes)
      .where(eq(journalNotes.id, id));

    if (existing.length > 0 && existing[0].owner !== userId) {
      throw new Error('Forbidden: Journal note belongs to another user');
    }

    await db
      .delete(journalNotes)
      .where(and(eq(journalNotes.id, id), eq(journalNotes.userId, userId)));
  } catch (error) {
    console.error('deleteJournalNote error:', error);
    throw error;
  }
}

export async function permanentDeleteJournalNote(userId: string, id: string) {
  return await deleteJournalNote(userId, id, true);
}

// Journal Folders
export async function getJournalFolders(userId: string): Promise<JournalFolder[]> {
  try {
    const rows = await db
      .select()
      .from(journalFolders)
      .where(eq(journalFolders.userId, userId));
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      icon: r.icon || undefined,
      count: r.count || 0,
      isDeleted: Boolean(r.isDeleted),
      deletedAt: r.deletedAt ? new Date(r.deletedAt).toISOString() : undefined,
      deletedBy: r.deletedBy || undefined,
    }));
  } catch (error) {
    console.error('getJournalFolders error:', error);
    return [];
  }
}

export async function saveJournalFolder(userId: string, folder: JournalFolder) {
  try {
    const existing = await db
      .select({ owner: journalFolders.userId })
      .from(journalFolders)
      .where(eq(journalFolders.id, folder.id));

    const isDel = Boolean(folder.isDeleted);
    const delAt = folder.deletedAt ? new Date(folder.deletedAt) : null;
    const delBy = folder.deletedBy || (isDel ? userId : null);

    if (existing.length > 0) {
      if (existing[0].owner !== userId) {
        throw new Error('Forbidden: Folder belongs to another user');
      }
      await db
        .update(journalFolders)
        .set({
          name: folder.name,
          icon: folder.icon || null,
          count: folder.count || 0,
          isDeleted: isDel,
          deletedAt: delAt,
          deletedBy: delBy,
        })
        .where(and(eq(journalFolders.id, folder.id), eq(journalFolders.userId, userId)));
    } else {
      await db.insert(journalFolders).values({
        id: folder.id,
        userId,
        name: folder.name,
        icon: folder.icon || null,
        count: folder.count || 0,
        isDeleted: isDel,
        deletedAt: delAt,
        deletedBy: delBy,
      });
    }
  } catch (error) {
    console.error('saveJournalFolder error:', error);
    throw error;
  }
}

export async function softDeleteJournalFolder(userId: string, id: string) {
  try {
    const existing = await db
      .select({ owner: journalFolders.userId })
      .from(journalFolders)
      .where(eq(journalFolders.id, id));

    if (existing.length > 0 && existing[0].owner !== userId) {
      throw new Error('Forbidden: Folder belongs to another user');
    }

    const now = new Date();

    // 1. Soft delete the folder
    await db
      .update(journalFolders)
      .set({
        isDeleted: true,
        deletedAt: now,
        deletedBy: userId,
      })
      .where(and(eq(journalFolders.id, id), eq(journalFolders.userId, userId)));

    // 2. Cascade soft-delete notes inside this folder
    await db
      .update(journalNotes)
      .set({
        isDeleted: true,
        deletedAt: now,
        deletedBy: userId,
        originalFolderId: id,
      })
      .where(and(eq(journalNotes.folderId, id), eq(journalNotes.userId, userId)));
  } catch (error) {
    console.error('softDeleteJournalFolder error:', error);
    throw error;
  }
}

export async function restoreJournalFolder(userId: string, id: string) {
  try {
    const existing = await db
      .select({ owner: journalFolders.userId })
      .from(journalFolders)
      .where(eq(journalFolders.id, id));

    if (existing.length > 0 && existing[0].owner !== userId) {
      throw new Error('Forbidden: Folder belongs to another user');
    }

    // 1. Restore folder
    await db
      .update(journalFolders)
      .set({
        isDeleted: false,
        deletedAt: null,
        deletedBy: null,
      })
      .where(and(eq(journalFolders.id, id), eq(journalFolders.userId, userId)));

    // 2. Restore child notes
    await db
      .update(journalNotes)
      .set({
        isDeleted: false,
        deletedAt: null,
        deletedBy: null,
        folderId: id,
      })
      .where(and(
        or(eq(journalNotes.folderId, id), eq(journalNotes.originalFolderId, id)),
        eq(journalNotes.userId, userId)
      ));
  } catch (error) {
    console.error('restoreJournalFolder error:', error);
    throw error;
  }
}

export async function deleteJournalFolder(userId: string, id: string, permanent: boolean = false) {
  if (!permanent) {
    return await softDeleteJournalFolder(userId, id);
  }
  try {
    const existing = await db
      .select({ owner: journalFolders.userId })
      .from(journalFolders)
      .where(eq(journalFolders.id, id));

    if (existing.length > 0 && existing[0].owner !== userId) {
      throw new Error('Forbidden: Folder belongs to another user');
    }

    // Cascade delete notes inside this folder
    await db
      .delete(journalNotes)
      .where(and(
        or(eq(journalNotes.folderId, id), eq(journalNotes.originalFolderId, id)),
        eq(journalNotes.userId, userId)
      ));

    // Delete folder
    await db
      .delete(journalFolders)
      .where(and(eq(journalFolders.id, id), eq(journalFolders.userId, userId)));
  } catch (error) {
    console.error('deleteJournalFolder error:', error);
    throw error;
  }
}

export async function permanentDeleteJournalFolder(userId: string, id: string) {
  return await deleteJournalFolder(userId, id, true);
}

// 2-Day Automatic Trash Purge Engine
export async function purgeExpiredTrash(userId?: string) {
  try {
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);

    // 1. Delete notes in trash older than 2 days
    const noteCondition = userId
      ? and(eq(journalNotes.isDeleted, true), lte(journalNotes.deletedAt, twoDaysAgo), eq(journalNotes.userId, userId))
      : and(eq(journalNotes.isDeleted, true), lte(journalNotes.deletedAt, twoDaysAgo));

    const purgedNotes = await db.delete(journalNotes).where(noteCondition).returning({ id: journalNotes.id });

    // 2. Delete folders in trash older than 2 days
    const folderCondition = userId
      ? and(eq(journalFolders.isDeleted, true), lte(journalFolders.deletedAt, twoDaysAgo), eq(journalFolders.userId, userId))
      : and(eq(journalFolders.isDeleted, true), lte(journalFolders.deletedAt, twoDaysAgo));

    const purgedFolders = await db.delete(journalFolders).where(folderCondition).returning({ id: journalFolders.id });

    return {
      purgedNotesCount: purgedNotes.length,
      purgedFoldersCount: purgedFolders.length,
    };
  } catch (error) {
    console.error('purgeExpiredTrash error:', error);
    return { purgedNotesCount: 0, purgedFoldersCount: 0 };
  }
}

// Risk & Goals Settings
export async function getRiskGoals(userId: string, tradingAccountId?: string): Promise<RiskGoalSettings> {
  try {
    let rows: any[] = [];
    if (tradingAccountId && tradingAccountId !== 'all') {
      rows = await db
        .select()
        .from(riskGoals)
        .where(and(eq(riskGoals.userId, userId), eq(riskGoals.tradingAccountId, tradingAccountId)));
    }
    if (!rows || rows.length === 0) {
      rows = await db.select().from(riskGoals).where(eq(riskGoals.userId, userId));
    }
    if (rows.length === 0) return {};
    const r = rows[0];
    return {
      id: r.id,
      userId: r.userId,
      tradingAccountId: r.tradingAccountId || undefined,
      dailyProfitTarget: r.dailyProfitTarget || undefined,
      weeklyProfitTarget: r.weeklyProfitTarget || undefined,
      monthlyProfitTarget: r.monthlyProfitTarget || undefined,
      maxDailyLoss: r.maxDailyLoss || r.dailyMaxLoss || undefined,
      dailyMaxLoss: r.dailyMaxLoss || r.maxDailyLoss || undefined,
      maxWeeklyLoss: r.maxWeeklyLoss || r.weeklyLossLimit || undefined,
      weeklyLossLimit: r.weeklyLossLimit || r.maxWeeklyLoss || undefined,
      maxDrawdown: r.maxDrawdown || r.maxDrawdownLimit || r.trailingDrawdownLimit || undefined,
      maxDrawdownLimit: r.maxDrawdownLimit || r.maxDrawdown || r.trailingDrawdownLimit || undefined,
      trailingDrawdownLimit: r.trailingDrawdownLimit || r.maxDrawdown || r.maxDrawdownLimit || undefined,
      maxRiskPerTradePercent: r.maxRiskPerTradePercent || undefined,
      maxRiskPerTradeAmount: r.maxRiskPerTradeAmount || undefined,
      riskMode: (r.riskMode as any) || 'LOWER_OF_BOTH',
      maxTradesPerDay: r.maxTradesPerDay || undefined,
      maxConsecutiveLosses: r.maxConsecutiveLosses || undefined,
      maxContractsPerTrade: r.maxContractsPerTrade || undefined,
      maxDailyLossStreak: r.maxDailyLossStreak || undefined,
      minRMultiple: r.minRMultiple || undefined,
      maxPositionSize: r.maxPositionSize || undefined,
      maxOpenPositions: r.maxOpenPositions || undefined,
      enforceCircuitBreaker: r.enforceCircuitBreaker || false,
      circuitBreakerTriggered: r.circuitBreakerTriggered || false,
      circuitBreakerState: (r.circuitBreakerState as any) || 'DISARMED',
      hardLockEnabled: r.hardLockEnabled || false,
      warningThresholdPercent: r.warningThresholdPercent ?? 75,
      criticalThresholdPercent: r.criticalThresholdPercent ?? 90,
      timezone: r.timezone || 'America/New_York',
      dailyResetTime: r.dailyResetTime || '17:00',
      includeFloatingPnl: r.includeFloatingPnl || false,
      includeFees: r.includeFees ?? true,
      includeCommissions: r.includeCommissions ?? true,
      drawdownMethodology: (r.drawdownMethodology as any) || 'EQUITY_BASED',
      weeklyTargetAction: (r.weeklyTargetAction as any) || 'CONTINUE',
      requireManualUnlock: r.requireManualUnlock ?? true,
      lockReason: r.lockReason || undefined,
      lockedAt: r.lockedAt || undefined,
      unlockedAt: r.unlockedAt || undefined,
      unlockedBy: r.unlockedBy || undefined,
      unlockReason: r.unlockReason || undefined,
    };
  } catch (error) {
    console.error('getRiskGoals error:', error);
    return {};
  }
}

export async function saveRiskGoals(userId: string, goals: RiskGoalSettings, tradingAccountId?: string) {
  try {
    const accId = tradingAccountId || goals.tradingAccountId;
    const recordId = accId && accId !== 'all' ? `rg_${userId}_${accId}` : `rg_${userId}`;

    await db
      .insert(riskGoals)
      .values({
        id: recordId,
        userId,
        tradingAccountId: accId && accId !== 'all' ? accId : null,
        dailyProfitTarget: goals.dailyProfitTarget || null,
        weeklyProfitTarget: goals.weeklyProfitTarget || null,
        monthlyProfitTarget: goals.monthlyProfitTarget || null,
        maxDailyLoss: goals.dailyMaxLoss || goals.maxDailyLoss || null,
        dailyMaxLoss: goals.dailyMaxLoss || goals.maxDailyLoss || null,
        maxWeeklyLoss: goals.weeklyLossLimit || goals.maxWeeklyLoss || null,
        weeklyLossLimit: goals.weeklyLossLimit || goals.maxWeeklyLoss || null,
        maxDrawdown: goals.trailingDrawdownLimit || goals.maxDrawdown || goals.maxDrawdownLimit || null,
        maxDrawdownLimit: goals.trailingDrawdownLimit || goals.maxDrawdown || goals.maxDrawdownLimit || null,
        trailingDrawdownLimit: goals.trailingDrawdownLimit || goals.maxDrawdown || goals.maxDrawdownLimit || null,
        maxRiskPerTradePercent: goals.maxRiskPerTradePercent || null,
        maxRiskPerTradeAmount: goals.maxRiskPerTradeAmount || null,
        riskMode: goals.riskMode || 'LOWER_OF_BOTH',
        maxTradesPerDay: goals.maxTradesPerDay || null,
        maxConsecutiveLosses: goals.maxConsecutiveLosses || null,
        maxContractsPerTrade: goals.maxContractsPerTrade || null,
        maxDailyLossStreak: goals.maxDailyLossStreak || null,
        minRMultiple: goals.minRMultiple || null,
        maxPositionSize: goals.maxPositionSize || null,
        maxOpenPositions: goals.maxOpenPositions || null,
        enforceCircuitBreaker: goals.enforceCircuitBreaker || false,
        circuitBreakerTriggered: goals.circuitBreakerTriggered || false,
        circuitBreakerState: goals.circuitBreakerState || 'DISARMED',
        hardLockEnabled: goals.hardLockEnabled || false,
        warningThresholdPercent: goals.warningThresholdPercent ?? 75,
        criticalThresholdPercent: goals.criticalThresholdPercent ?? 90,
        timezone: goals.timezone || 'America/New_York',
        dailyResetTime: goals.dailyResetTime || '17:00',
        includeFloatingPnl: goals.includeFloatingPnl || false,
        includeFees: goals.includeFees ?? true,
        includeCommissions: goals.includeCommissions ?? true,
        drawdownMethodology: goals.drawdownMethodology || 'EQUITY_BASED',
        weeklyTargetAction: goals.weeklyTargetAction || 'CONTINUE',
        requireManualUnlock: goals.requireManualUnlock ?? true,
        lockReason: goals.lockReason || null,
        lockedAt: goals.lockedAt || null,
        unlockedAt: goals.unlockedAt || null,
        unlockedBy: goals.unlockedBy || null,
        unlockReason: goals.unlockReason || null,
      })
      .onConflictDoUpdate({
        target: riskGoals.id,
        set: {
          tradingAccountId: accId && accId !== 'all' ? accId : null,
          dailyProfitTarget: goals.dailyProfitTarget || null,
          weeklyProfitTarget: goals.weeklyProfitTarget || null,
          monthlyProfitTarget: goals.monthlyProfitTarget || null,
          maxDailyLoss: goals.dailyMaxLoss || goals.maxDailyLoss || null,
          dailyMaxLoss: goals.dailyMaxLoss || goals.maxDailyLoss || null,
          maxWeeklyLoss: goals.weeklyLossLimit || goals.maxWeeklyLoss || null,
          weeklyLossLimit: goals.weeklyLossLimit || goals.maxWeeklyLoss || null,
          maxDrawdown: goals.trailingDrawdownLimit || goals.maxDrawdown || goals.maxDrawdownLimit || null,
          maxDrawdownLimit: goals.trailingDrawdownLimit || goals.maxDrawdown || goals.maxDrawdownLimit || null,
          trailingDrawdownLimit: goals.trailingDrawdownLimit || goals.maxDrawdown || goals.maxDrawdownLimit || null,
          maxRiskPerTradePercent: goals.maxRiskPerTradePercent || null,
          maxRiskPerTradeAmount: goals.maxRiskPerTradeAmount || null,
          riskMode: goals.riskMode || 'LOWER_OF_BOTH',
          maxTradesPerDay: goals.maxTradesPerDay || null,
          maxConsecutiveLosses: goals.maxConsecutiveLosses || null,
          maxContractsPerTrade: goals.maxContractsPerTrade || null,
          maxDailyLossStreak: goals.maxDailyLossStreak || null,
          minRMultiple: goals.minRMultiple || null,
          maxPositionSize: goals.maxPositionSize || null,
          maxOpenPositions: goals.maxOpenPositions || null,
          enforceCircuitBreaker: goals.enforceCircuitBreaker || false,
          circuitBreakerTriggered: goals.circuitBreakerTriggered || false,
          circuitBreakerState: goals.circuitBreakerState || 'DISARMED',
          hardLockEnabled: goals.hardLockEnabled || false,
          warningThresholdPercent: goals.warningThresholdPercent ?? 75,
          criticalThresholdPercent: goals.criticalThresholdPercent ?? 90,
          timezone: goals.timezone || 'America/New_York',
          dailyResetTime: goals.dailyResetTime || '17:00',
          includeFloatingPnl: goals.includeFloatingPnl || false,
          includeFees: goals.includeFees ?? true,
          includeCommissions: goals.includeCommissions ?? true,
          drawdownMethodology: goals.drawdownMethodology || 'EQUITY_BASED',
          weeklyTargetAction: goals.weeklyTargetAction || 'CONTINUE',
          requireManualUnlock: goals.requireManualUnlock ?? true,
          lockReason: goals.lockReason || null,
          lockedAt: goals.lockedAt || null,
          unlockedAt: goals.unlockedAt || null,
          unlockedBy: goals.unlockedBy || null,
          unlockReason: goals.unlockReason || null,
          updatedAt: new Date(),
        },
      });
  } catch (error) {
    console.error('saveRiskGoals error:', error);
    throw error;
  }
}

export async function getRiskEvents(userId: string, accountId?: string): Promise<RiskEvent[]> {
  try {
    const rows = await db
      .select()
      .from(riskEvents)
      .where(eq(riskEvents.userId, userId))
      .orderBy(desc(riskEvents.createdAt))
      .limit(100);

    return rows.map((r) => ({
      id: r.id,
      userId: r.userId,
      accountId: r.accountId || undefined,
      accountName: r.accountName || undefined,
      eventType: r.eventType as any,
      rule: r.rule,
      currentValue: r.currentValue || '',
      limitValue: r.limitValue || '',
      severity: r.severity as any,
      actionTaken: r.actionTaken,
      notes: r.notes || undefined,
      unlockedBy: r.unlockedBy || undefined,
      unlockReason: r.unlockReason || undefined,
      timestamp: r.createdAt ? new Date(r.createdAt).toISOString() : new Date().toISOString(),
      metadata: (r.metadata as any) || undefined,
    }));
  } catch (error) {
    console.error('getRiskEvents error:', error);
    return [];
  }
}

export async function saveRiskEvent(userId: string, event: Partial<RiskEvent>) {
  try {
    const id = event.id || `re_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    await db.insert(riskEvents).values({
      id,
      userId,
      accountId: event.accountId || null,
      accountName: event.accountName || null,
      eventType: event.eventType || 'WARNING',
      rule: event.rule || 'General Risk Rule',
      currentValue: event.currentValue || null,
      limitValue: event.limitValue || null,
      severity: event.severity || 'CAUTION',
      actionTaken: event.actionTaken || 'Notification',
      notes: event.notes || null,
      unlockedBy: event.unlockedBy || null,
      unlockReason: event.unlockReason || null,
      metadata: event.metadata || null,
    });
    return id;
  } catch (error) {
    console.error('saveRiskEvent error:', error);
    return null;
  }
}

// Notifications
export async function getNotifications(userId: string): Promise<AppNotification[]> {
  try {
    const rows = await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId));
    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      message: r.message,
      type: r.type as AppNotification['type'],
      timestamp: r.timestamp,
      read: r.read || false,
      actionUrl: r.actionUrl || undefined,
    }));
  } catch (error) {
    console.error('getNotifications error:', error);
    return [];
  }
}

export async function saveNotification(userId: string, n: AppNotification) {
  try {
    const existing = await db
      .select({ owner: notifications.userId })
      .from(notifications)
      .where(eq(notifications.id, n.id));

    if (existing.length > 0) {
      if (existing[0].owner !== userId) {
        throw new Error('Forbidden: Notification belongs to another user');
      }
      await db
        .update(notifications)
        .set({
          title: n.title,
          message: n.message,
          type: n.type,
          timestamp: n.timestamp,
          read: n.read,
          actionUrl: n.actionUrl || null,
        })
        .where(and(eq(notifications.id, n.id), eq(notifications.userId, userId)));
    } else {
      await db.insert(notifications).values({
        id: n.id,
        userId,
        title: n.title,
        message: n.message,
        type: n.type,
        timestamp: n.timestamp,
        read: n.read,
        actionUrl: n.actionUrl || null,
      });
    }
  } catch (error) {
    console.error('saveNotification error:', error);
    throw error;
  }
}

// Community Posts
export async function getCommunityPosts(userId: string): Promise<CommunityPost[]> {
  try {
    await ensureLoungeTables();
    const rows = await db
      .select()
      .from(communityPosts)
      .orderBy(desc(communityPosts.createdAt));

    // Get liked post IDs for current user
    let userLikedPostIds = new Set<string>();
    if (userId) {
      const userLikes = await db
        .select({ postId: postLikes.postId })
        .from(postLikes)
        .where(eq(postLikes.userId, userId));
      userLikedPostIds = new Set(userLikes.map((l) => l.postId));
    }

    // Get comments for each post
    const allComments = await db
      .select()
      .from(postComments)
      .orderBy(desc(postComments.createdAt));

    const commentsMap: Record<string, any[]> = {};
    for (const c of allComments) {
      if (!commentsMap[c.postId]) {
        commentsMap[c.postId] = [];
      }
      commentsMap[c.postId].push({
        id: c.id,
        author: c.authorName,
        avatar: c.authorAvatar,
        text: c.content,
        time: c.createdAt
          ? new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : 'Just now',
        userId: c.userId,
      });
    }

    return rows.map((r) => {
      const postCommentsList = commentsMap[r.id] || (Array.isArray(r.comments) ? (r.comments as any[]) : []);
      return {
        id: r.id,
        userId: r.userId,
        authorName: r.authorName,
        authorHandle: r.authorHandle,
        authorAvatar: r.authorAvatar,
        badge: r.badge || undefined,
        timestamp: r.timestamp,
        content: r.content,
        symbol: r.symbol || undefined,
        direction: (r.direction as CommunityPost['direction']) || undefined,
        pnl: r.pnl || undefined,
        rMultiple: r.rMultiple || undefined,
        imageUrl: r.imageUrl || undefined,
        likes: r.likes || 0,
        hasLiked: userLikedPostIds.has(r.id),
        commentsCount: Math.max(r.commentsCount || 0, postCommentsList.length),
        comments: postCommentsList,
      };
    });
  } catch (error) {
    console.error('getCommunityPosts error:', error);
    return [];
  }
}

export async function saveCommunityPost(userId: string, post: Partial<CommunityPost>): Promise<CommunityPost> {
  try {
    await ensureLoungeTables();
    const existing = await db
      .select({ owner: communityPosts.userId })
      .from(communityPosts)
      .where(eq(communityPosts.id, post.id!));

    if (existing.length > 0) {
      if (existing[0].owner !== userId) {
        throw new Error('Forbidden: Post belongs to another user');
      }
      await db
        .update(communityPosts)
        .set({
          content: post.content,
          symbol: post.symbol || null,
          pnl: post.pnl || null,
          rMultiple: post.rMultiple || null,
          imageUrl: post.imageUrl || null,
        })
        .where(eq(communityPosts.id, post.id!));

      const [updated] = await db.select().from(communityPosts).where(eq(communityPosts.id, post.id!));
      return {
        id: updated.id,
        userId: updated.userId,
        authorName: updated.authorName,
        authorHandle: updated.authorHandle,
        authorAvatar: updated.authorAvatar,
        badge: updated.badge || undefined,
        timestamp: updated.timestamp,
        content: updated.content,
        symbol: updated.symbol || undefined,
        direction: (updated.direction as CommunityPost['direction']) || undefined,
        pnl: updated.pnl || undefined,
        rMultiple: updated.rMultiple || undefined,
        imageUrl: updated.imageUrl || undefined,
        likes: updated.likes || 0,
        hasLiked: false,
        commentsCount: updated.commentsCount || 0,
        comments: [],
      };
    } else {
      const postId = post.id || `post-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const newPostValues = {
        id: postId,
        userId,
        authorName: post.authorName || 'Trader',
        authorHandle: post.authorHandle || `@trader_${userId.slice(0, 6)}`,
        authorAvatar: post.authorAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80',
        badge: post.badge || 'PRO',
        timestamp: post.timestamp || 'Just now',
        content: post.content || '',
        symbol: post.symbol || null,
        direction: post.direction || null,
        pnl: post.pnl || null,
        rMultiple: post.rMultiple || null,
        imageUrl: post.imageUrl || null,
        likes: 0,
        hasLiked: false,
        commentsCount: 0,
        comments: [],
      };

      await db.insert(communityPosts).values(newPostValues);

      return {
        id: postId,
        userId,
        authorName: newPostValues.authorName,
        authorHandle: newPostValues.authorHandle,
        authorAvatar: newPostValues.authorAvatar,
        badge: newPostValues.badge,
        timestamp: newPostValues.timestamp,
        content: newPostValues.content,
        symbol: newPostValues.symbol || undefined,
        direction: (newPostValues.direction as CommunityPost['direction']) || undefined,
        pnl: newPostValues.pnl || undefined,
        rMultiple: newPostValues.rMultiple || undefined,
        imageUrl: newPostValues.imageUrl || undefined,
        likes: 0,
        hasLiked: false,
        commentsCount: 0,
        comments: [],
      };
    }
  } catch (error) {
    console.error('saveCommunityPost error:', error);
    throw error;
  }
}

export async function deleteCommunityPost(userId: string, postId: string) {
  try {
    await ensureLoungeTables();
    const existing = await db
      .select({ owner: communityPosts.userId })
      .from(communityPosts)
      .where(eq(communityPosts.id, postId));

    if (existing.length === 0) return;

    if (existing[0].owner !== userId) {
      throw new Error('Forbidden: Post belongs to another user');
    }

    await db.delete(communityPosts).where(eq(communityPosts.id, postId));
    await db.delete(postLikes).where(eq(postLikes.postId, postId));
    await db.delete(postComments).where(eq(postComments.postId, postId));
  } catch (error) {
    console.error('deleteCommunityPost error:', error);
    throw error;
  }
}

export async function togglePostLike(userId: string, postId: string) {
  try {
    await ensureLoungeTables();
    const existingLike = await db
      .select()
      .from(postLikes)
      .where(and(eq(postLikes.postId, postId), eq(postLikes.userId, userId)));

    const postRows = await db
      .select({ likes: communityPosts.likes })
      .from(communityPosts)
      .where(eq(communityPosts.id, postId));

    if (postRows.length === 0) {
      throw new Error('Post not found');
    }

    let newLikes = postRows[0].likes || 0;
    let liked = false;

    if (existingLike.length > 0) {
      await db
        .delete(postLikes)
        .where(and(eq(postLikes.postId, postId), eq(postLikes.userId, userId)));
      newLikes = Math.max(0, newLikes - 1);
      liked = false;
    } else {
      await db.insert(postLikes).values({
        id: `like-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        postId,
        userId,
      });
      newLikes += 1;
      liked = true;
    }

    await db
      .update(communityPosts)
      .set({ likes: newLikes })
      .where(eq(communityPosts.id, postId));

    return { liked, likesCount: newLikes };
  } catch (error) {
    console.error('togglePostLike error:', error);
    throw error;
  }
}

export async function getPostComments(postId: string) {
  try {
    await ensureLoungeTables();
    const comments = await db
      .select()
      .from(postComments)
      .where(eq(postComments.postId, postId))
      .orderBy(postComments.createdAt);

    return comments.map((c) => ({
      id: c.id,
      author: c.authorName,
      avatar: c.authorAvatar,
      text: c.content,
      time: c.createdAt
        ? new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : 'Just now',
      userId: c.userId,
    }));
  } catch (error) {
    console.error('getPostComments error:', error);
    return [];
  }
}

export async function addPostComment(
  userId: string,
  authorName: string,
  authorAvatar: string,
  postId: string,
  content: string
) {
  try {
    await ensureLoungeTables();
    const commentId = `cmt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const newComment = {
      id: commentId,
      postId,
      userId,
      authorName,
      authorAvatar,
      content,
    };

    await db.insert(postComments).values(newComment);

    const postRows = await db
      .select({ commentsCount: communityPosts.commentsCount })
      .from(communityPosts)
      .where(eq(communityPosts.id, postId));

    const currentCount = postRows.length > 0 ? postRows[0].commentsCount || 0 : 0;
    const newCount = currentCount + 1;

    await db
      .update(communityPosts)
      .set({ commentsCount: newCount })
      .where(eq(communityPosts.id, postId));

    return {
      comment: {
        id: commentId,
        author: authorName,
        avatar: authorAvatar,
        text: content,
        time: 'Just now',
        userId,
      },
      commentsCount: newCount,
    };
  } catch (error) {
    console.error('addPostComment error:', error);
    throw error;
  }
}

export async function deletePostComment(userId: string, postId: string, commentId: string) {
  try {
    await ensureLoungeTables();
    const commentRows = await db
      .select()
      .from(postComments)
      .where(and(eq(postComments.id, commentId), eq(postComments.postId, postId)));

    if (commentRows.length === 0) return { commentsCount: 0 };

    const comment = commentRows[0];
    const postRows = await db
      .select({ owner: communityPosts.userId, commentsCount: communityPosts.commentsCount })
      .from(communityPosts)
      .where(eq(communityPosts.id, postId));

    const postOwner = postRows.length > 0 ? postRows[0].owner : null;

    if (comment.userId !== userId && postOwner !== userId) {
      throw new Error('Forbidden: Cannot delete this comment');
    }

    await db.delete(postComments).where(eq(postComments.id, commentId));

    const currentCount = postRows.length > 0 ? postRows[0].commentsCount || 0 : 1;
    const newCount = Math.max(0, currentCount - 1);

    await db
      .update(communityPosts)
      .set({ commentsCount: newCount })
      .where(eq(communityPosts.id, postId));

    return { commentsCount: newCount };
  } catch (error) {
    console.error('deletePostComment error:', error);
    throw error;
  }
}

// Mentor Students
export async function getMentorStudents(userId: string): Promise<MentorStudent[]> {
  try {
    const rows = await db
      .select()
      .from(mentorStudents)
      .where(eq(mentorStudents.userId, userId));
    return rows.map((r) => ({
      id: r.id,
      code: r.code,
      name: r.name,
      email: r.email,
      avatar: r.avatar,
      accountName: r.accountName,
      currentBalance: r.currentBalance || 0,
      netPnl: r.netPnl || 0,
      winRate: r.winRate || 0,
      profitFactor: r.profitFactor || 0,
      zellaScore: r.zellaScore || 0,
      totalTrades: r.totalTrades || 0,
      status: r.status as MentorStudent['status'],
      sharedAccounts: Array.isArray(r.sharedAccounts)
        ? (r.sharedAccounts as string[])
        : [],
      unreadNotesCount: r.unreadNotesCount || 0,
      disciplineScore: r.disciplineScore || 0,
      joinedDate: r.joinedDate || undefined,
      riskBreached: r.riskBreached || false,
    }));
  } catch (error) {
    console.error('getMentorStudents error:', error);
    return [];
  }
}

export async function saveMentorStudent(userId: string, st: MentorStudent) {
  try {
    const existing = await db
      .select({ owner: mentorStudents.userId })
      .from(mentorStudents)
      .where(eq(mentorStudents.id, st.id));

    if (existing.length > 0) {
      if (existing[0].owner !== userId) {
        throw new Error('Forbidden: Mentor relationship belongs to another user');
      }
      await db
        .update(mentorStudents)
        .set({
          code: st.code,
          name: st.name,
          email: st.email,
          avatar: st.avatar,
          accountName: st.accountName,
          currentBalance: st.currentBalance,
          netPnl: st.netPnl,
          winRate: st.winRate,
          profitFactor: st.profitFactor,
          zellaScore: st.zellaScore,
          totalTrades: st.totalTrades,
          status: st.status,
          sharedAccounts: st.sharedAccounts || [],
          unreadNotesCount: st.unreadNotesCount,
          disciplineScore: st.disciplineScore || 0,
          joinedDate: st.joinedDate || null,
          riskBreached: st.riskBreached || false,
        })
        .where(and(eq(mentorStudents.id, st.id), eq(mentorStudents.userId, userId)));
    } else {
      await db.insert(mentorStudents).values({
        id: st.id,
        userId,
        code: st.code,
        name: st.name,
        email: st.email,
        avatar: st.avatar,
        accountName: st.accountName,
        currentBalance: st.currentBalance,
        netPnl: st.netPnl,
        winRate: st.winRate,
        profitFactor: st.profitFactor,
        zellaScore: st.zellaScore,
        totalTrades: st.totalTrades,
        status: st.status,
        sharedAccounts: st.sharedAccounts || [],
        unreadNotesCount: st.unreadNotesCount,
        disciplineScore: st.disciplineScore || 0,
        joinedDate: st.joinedDate || null,
        riskBreached: st.riskBreached || false,
      });
    }
  } catch (error) {
    console.error('saveMentorStudent error:', error);
    throw error;
  }
}

export async function deleteMentorStudent(userId: string, id: string) {
  try {
    const existing = await db
      .select({ owner: mentorStudents.userId })
      .from(mentorStudents)
      .where(eq(mentorStudents.id, id));

    if (existing.length > 0 && existing[0].owner !== userId) {
      throw new Error('Forbidden: Mentor relationship belongs to another user');
    }

    await db
      .delete(mentorStudents)
      .where(and(eq(mentorStudents.id, id), eq(mentorStudents.userId, userId)));
  } catch (error) {
    console.error('deleteMentorStudent error:', error);
    throw error;
  }
}

// Mentor Directives & Feedback
export async function getMentorDirectivesForMentor(mentorId: string, studentIdentifier?: string) {
  try {
    if (studentIdentifier) {
      // Validate mentor-student relationship first
      const studentMatches = await db
        .select()
        .from(mentorStudents)
        .where(
          and(
            eq(mentorStudents.userId, mentorId),
            sql`(${mentorStudents.code} = ${studentIdentifier} OR ${mentorStudents.id} = ${studentIdentifier})`
          )
        )
        .limit(1);

      if (studentMatches.length === 0) {
        // Also check if studentIdentifier matches student UID
        const studentUser = await db
          .select({ accountCode: users.accountCode, uid: users.uid })
          .from(users)
          .where(eq(users.uid, studentIdentifier))
          .limit(1);

        if (studentUser.length > 0) {
          const linkedWithUser = await db
            .select()
            .from(mentorStudents)
            .where(
              and(
                eq(mentorStudents.userId, mentorId),
                eq(mentorStudents.code, studentUser[0].accountCode)
              )
            )
            .limit(1);
          if (linkedWithUser.length === 0) {
            throw new Error('Forbidden: You do not have permission to view feedback for this student');
          }
        } else {
          throw new Error('Forbidden: You do not have permission to view feedback for this student');
        }
      }

      const matchCode = studentMatches[0]?.code;
      const matchId = studentMatches[0]?.id;

      return await db
        .select()
        .from(mentorDirectives)
        .where(
          and(
            eq(mentorDirectives.mentorId, mentorId),
            sql`(${mentorDirectives.studentId} = ${studentIdentifier} OR ${mentorDirectives.studentId} = ${matchCode || ''} OR ${mentorDirectives.studentId} = ${matchId || ''})`
          )
        )
        .orderBy(desc(mentorDirectives.createdAt));
    }

    return await db
      .select()
      .from(mentorDirectives)
      .where(eq(mentorDirectives.mentorId, mentorId))
      .orderBy(desc(mentorDirectives.createdAt));
  } catch (error) {
    console.error('getMentorDirectivesForMentor error:', error);
    throw error;
  }
}

export async function getMentorDirectivesForStudent(studentId: string) {
  try {
    const studentUser = await db
      .select({ accountCode: users.accountCode })
      .from(users)
      .where(eq(users.uid, studentId))
      .limit(1);

    const studentCode = studentUser.length > 0 ? studentUser[0].accountCode : null;

    let condition = eq(mentorDirectives.studentId, studentId);
    if (studentCode) {
      condition = sql`(${mentorDirectives.studentId} = ${studentId} OR ${mentorDirectives.studentId} = ${studentCode})`;
    }

    return await db
      .select()
      .from(mentorDirectives)
      .where(condition)
      .orderBy(desc(mentorDirectives.createdAt));
  } catch (error) {
    console.error('getMentorDirectivesForStudent error:', error);
    return [];
  }
}

export async function createMentorDirective(
  mentorId: string,
  studentIdentifier: string,
  content: string,
  type = 'DIRECTIVE'
) {
  try {
    const cleanContent = content ? content.trim() : '';
    if (!cleanContent) {
      throw new Error('Validation Error: Directive content cannot be empty');
    }
    if (cleanContent.length > 5000) {
      throw new Error('Validation Error: Directive content exceeds maximum length of 5,000 characters');
    }

    // 1. Check if student is linked to this mentor by code or ID
    const linked = await db
      .select()
      .from(mentorStudents)
      .where(
        and(
          eq(mentorStudents.userId, mentorId),
          sql`(${mentorStudents.code} = ${studentIdentifier} OR ${mentorStudents.id} = ${studentIdentifier})`
        )
      )
      .limit(1);

    if (linked.length === 0) {
      // Also check if studentIdentifier matches student UID
      const studentUser = await db
        .select({ accountCode: users.accountCode, uid: users.uid })
        .from(users)
        .where(eq(users.uid, studentIdentifier))
        .limit(1);

      if (studentUser.length === 0) {
        throw new Error('Forbidden: Student is not linked to this mentor');
      }

      const linkedByUser = await db
        .select()
        .from(mentorStudents)
        .where(
          and(
            eq(mentorStudents.userId, mentorId),
            eq(mentorStudents.code, studentUser[0].accountCode)
          )
        )
        .limit(1);

      if (linkedByUser.length === 0) {
        throw new Error('Forbidden: Student is not linked to this mentor');
      }
    }

    // 2. Resolve student's real user uid by their accountCode or studentIdentifier
    const targetCode = linked[0]?.code || studentIdentifier;
    const studentUser = await db
      .select({ uid: users.uid })
      .from(users)
      .where(eq(users.accountCode, targetCode))
      .limit(1);

    // If the student has signed in, store their UID; otherwise targetCode
    const resolvedStudentId = studentUser.length > 0 ? studentUser[0].uid : targetCode;

    const newDirective = {
      id: `dir_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      mentorId,
      studentId: resolvedStudentId,
      type: type || 'DIRECTIVE',
      content: cleanContent,
      status: 'PENDING',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.insert(mentorDirectives).values(newDirective);
    return newDirective;
  } catch (error) {
    console.error('createMentorDirective error:', error);
    throw error;
  }
}

export async function updateMentorDirective(
  mentorId: string,
  directiveId: string,
  updates: { content?: string; status?: string; type?: string }
) {
  try {
    const existing = await db
      .select()
      .from(mentorDirectives)
      .where(eq(mentorDirectives.id, directiveId))
      .limit(1);

    if (existing.length === 0) {
      throw new Error('Directive not found');
    }

    if (existing[0].mentorId !== mentorId) {
      throw new Error('Forbidden: You cannot modify directives created by another mentor');
    }

    const payload: any = { updatedAt: new Date() };
    if (updates.content !== undefined) {
      const clean = updates.content.trim();
      if (!clean) throw new Error('Validation Error: Content cannot be empty');
      payload.content = clean;
    }
    if (updates.status !== undefined) {
      payload.status = updates.status;
    }
    if (updates.type !== undefined) {
      payload.type = updates.type;
    }

    const updated = await db
      .update(mentorDirectives)
      .set(payload)
      .where(and(eq(mentorDirectives.id, directiveId), eq(mentorDirectives.mentorId, mentorId)))
      .returning();

    return updated[0] || null;
  } catch (error) {
    console.error('updateMentorDirective error:', error);
    throw error;
  }
}

export async function deleteMentorDirective(mentorId: string, directiveId: string) {
  try {
    const existing = await db
      .select()
      .from(mentorDirectives)
      .where(eq(mentorDirectives.id, directiveId))
      .limit(1);

    if (existing.length === 0) {
      throw new Error('Directive not found');
    }

    if (existing[0].mentorId !== mentorId) {
      throw new Error('Forbidden: You cannot delete directives created by another mentor');
    }

    await db
      .delete(mentorDirectives)
      .where(and(eq(mentorDirectives.id, directiveId), eq(mentorDirectives.mentorId, mentorId)));

    return true;
  } catch (error) {
    console.error('deleteMentorDirective error:', error);
    throw error;
  }
}

export async function acknowledgeMentorDirective(studentId: string, id: string) {
  try {
    // Determine studentCode if studentId is a code, or do both checks to be extremely safe
    const studentUser = await db
      .select({ accountCode: users.accountCode })
      .from(users)
      .where(eq(users.uid, studentId))
      .limit(1);

    const studentCode = studentUser.length > 0 ? studentUser[0].accountCode : null;

    let condition = eq(mentorDirectives.studentId, studentId);
    if (studentCode) {
      condition = sql`(${mentorDirectives.studentId} = ${studentId} OR ${mentorDirectives.studentId} = ${studentCode})`;
    }

    const updated = await db
      .update(mentorDirectives)
      .set({ status: 'ACKNOWLEDGED', updatedAt: new Date() })
      .where(and(eq(mentorDirectives.id, id), condition))
      .returning();

    return updated.length > 0;
  } catch (error) {
    console.error('acknowledgeMentorDirective error:', error);
    throw error;
  }
}

// Backtest Sessions
export async function getBacktestSessions(userId: string): Promise<any[]> {
  try {
    const rows = await db
      .select()
      .from(backtestSessions)
      .where(eq(backtestSessions.userId, userId));
    return rows.map((r) => {
      const payload = r.trades as any;
      if (payload && typeof payload === 'object' && payload.id) {
        return payload;
      }
      return {
        id: r.id,
        name: r.title,
        createdAt: r.createdAt ? new Date(r.createdAt).getTime() : Date.now(),
        updatedAt: Date.now(),
        symbol: r.symbol,
        timeframe: r.timeframe,
        chartType: 'CANDLESTICK',
        startDate: r.startDate,
        startIndex: r.currentIndex || 50,
        currentIndex: r.currentIndex || 50,
        account: {
          startingBalance: r.initialBalance,
          balance: r.currentBalance,
          equity: r.currentBalance,
          currency: 'USD',
          leverage: 100,
          usedMargin: 0,
          freeMargin: r.currentBalance,
          marginLevel: 100,
          realizedPnl: r.netPnl,
          unrealizedPnl: 0,
          totalReturnPercent: 0,
          maxDrawdown: r.maxDrawdown,
          maxDrawdownPercent: 0,
          peakEquity: r.initialBalance,
        },
        positions: [],
        pendingOrders: [],
        trades: [],
        drawings: [],
        indicators: [],
        alerts: [],
        notes: r.notes || '',
        settings: {},
      };
    });
  } catch (error) {
    console.error('getBacktestSessions error:', error);
    return [];
  }
}

export async function saveBacktestSession(userId: string, session: any) {
  try {
    const title = session.name || `${session.symbol} ${session.timeframe} Replay`;
    const netPnl = session.account?.realizedPnl || 0;
    const initialBal = session.account?.startingBalance || 10000;
    const currentBal = session.account?.balance || 10000;
    const totalTrades = session.trades?.length || 0;
    const winRate =
      totalTrades > 0
        ? (session.trades.filter((t: any) => (t.realizedPnl || 0) > 0).length /
            totalTrades) *
          100
        : 0;

    const existing = await db
      .select({ owner: backtestSessions.userId })
      .from(backtestSessions)
      .where(eq(backtestSessions.id, session.id));

    if (existing.length > 0) {
      if (existing[0].owner !== userId) {
        throw new Error('Forbidden: Backtest session belongs to another user');
      }
      await db
        .update(backtestSessions)
        .set({
          title,
          symbol: session.symbol || 'XAUUSD',
          timeframe: session.timeframe || '15m',
          strategy: session.settings?.tradingSession || 'ALL',
          startDate: session.startDate || new Date().toISOString().split('T')[0],
          initialBalance: initialBal,
          currentBalance: currentBal,
          trades: session,
          totalTrades,
          winRate,
          netPnl,
          maxDrawdown: session.account?.maxDrawdown || 0,
          currentIndex: session.currentIndex || 50,
          notes: session.notes || '',
        })
        .where(
          and(
            eq(backtestSessions.id, session.id),
            eq(backtestSessions.userId, userId)
          )
        );
    } else {
      await db.insert(backtestSessions).values({
        id: session.id,
        userId,
        title,
        symbol: session.symbol || 'XAUUSD',
        timeframe: session.timeframe || '15m',
        strategy: session.settings?.tradingSession || 'ALL',
        startDate: session.startDate || new Date().toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
        initialBalance: initialBal,
        currentBalance: currentBal,
        trades: session,
        totalTrades,
        winRate,
        netPnl,
        profitFactor: 1.0,
        maxDrawdown: session.account?.maxDrawdown || 0,
        currentIndex: session.currentIndex || 50,
        notes: session.notes || '',
      });
    }
  } catch (error) {
    console.error('saveBacktestSession error:', error);
    throw error;
  }
}

export async function deleteBacktestSession(userId: string, id: string) {
  try {
    const existing = await db
      .select({ owner: backtestSessions.userId })
      .from(backtestSessions)
      .where(eq(backtestSessions.id, id));

    if (existing.length > 0 && existing[0].owner !== userId) {
      throw new Error('Forbidden: Backtest session belongs to another user');
    }

    await db
      .delete(backtestSessions)
      .where(and(eq(backtestSessions.id, id), eq(backtestSessions.userId, userId)));
  } catch (error) {
    console.error('deleteBacktestSession error:', error);
    throw error;
  }
}

// ==========================================
// BROKER INTEGRATIONS & WEBHOOK AUTO-SYNC
// ==========================================

export async function getBrokerIntegrations(userId: string) {
  try {
    const list = await db
      .select({
        id: brokerIntegrations.id,
        userId: brokerIntegrations.userId,
        accountId: brokerIntegrations.accountId,
        provider: brokerIntegrations.provider,
        displayName: brokerIntegrations.displayName,
        status: brokerIntegrations.status,
        externalAccountId: brokerIntegrations.externalAccountId,
        lastSyncAt: brokerIntegrations.lastSyncAt,
        lastEventAt: brokerIntegrations.lastEventAt,
        createdAt: brokerIntegrations.createdAt,
        updatedAt: brokerIntegrations.updatedAt,
      })
      .from(brokerIntegrations)
      .where(eq(brokerIntegrations.userId, userId));
    return list;
  } catch (error) {
    console.error('getBrokerIntegrations error:', error);
    return [];
  }
}

export async function getBrokerIntegrationById(userId: string, id: string) {
  try {
    const list = await db
      .select({
        id: brokerIntegrations.id,
        userId: brokerIntegrations.userId,
        accountId: brokerIntegrations.accountId,
        provider: brokerIntegrations.provider,
        displayName: brokerIntegrations.displayName,
        status: brokerIntegrations.status,
        externalAccountId: brokerIntegrations.externalAccountId,
        lastSyncAt: brokerIntegrations.lastSyncAt,
        lastEventAt: brokerIntegrations.lastEventAt,
        createdAt: brokerIntegrations.createdAt,
        updatedAt: brokerIntegrations.updatedAt,
      })
      .from(brokerIntegrations)
      .where(and(eq(brokerIntegrations.id, id), eq(brokerIntegrations.userId, userId)));
    return list[0] || null;
  } catch (error) {
    console.error('getBrokerIntegrationById error:', error);
    return null;
  }
}

export async function getBrokerIntegrationGlobalById(id: string) {
  try {
    const list = await db
      .select()
      .from(brokerIntegrations)
      .where(eq(brokerIntegrations.id, id));
    return list[0] || null;
  } catch (error) {
    console.error('getBrokerIntegrationGlobalById error:', error);
    return null;
  }
}

export async function getBrokerIntegrationBySecret(secret: string) {
  try {
    if (!secret) return null;

    let candidateIntegrationId: string | null = null;
    const parts = secret.split('_');
    
    // Check if new format: df_live_int_TIMESTAMP_RANDOM_xyz
    if (secret.startsWith('df_live_int_') && parts.length >= 5) {
      candidateIntegrationId = `int_${parts[3]}_${parts[4]}`;
    }

    if (candidateIntegrationId) {
      const list = await db
        .select()
        .from(brokerIntegrations)
        .where(eq(brokerIntegrations.id, candidateIntegrationId));
      
      const found = list[0];
      if (!found || found.status === 'DISCONNECTED') return null;

      const isValid = await bcrypt.compare(secret, found.secretHash);
      if (isValid) {
        return found;
      }
      return null;
    } else {
      // Legacy secret format fallback: slow iteration
      const list = await db
        .select()
        .from(brokerIntegrations)
        .where(not(eq(brokerIntegrations.status, 'DISCONNECTED')));
        
      for (const integration of list) {
        if (!integration.secretHash) continue;
        const isValid = await bcrypt.compare(secret, integration.secretHash);
        if (isValid) {
          return integration;
        }
      }
      return null;
    }
  } catch (error) {
    console.error('getBrokerIntegrationBySecret error:', error);
    return null;
  }
}

export async function saveBrokerIntegration(userId: string, integration: {
  id: string;
  accountId: string;
  provider: string;
  displayName: string;
  status?: string;
  secretHash: string;
  externalAccountId?: string;
}) {
  try {
    const existing = await db
      .select()
      .from(brokerIntegrations)
      .where(and(eq(brokerIntegrations.id, integration.id), eq(brokerIntegrations.userId, userId)));

    if (existing.length > 0) {
      await db
        .update(brokerIntegrations)
        .set({
          accountId: integration.accountId,
          provider: integration.provider,
          displayName: integration.displayName,
          status: integration.status || 'CONNECTED',
          secretHash: integration.secretHash,
          externalAccountId: integration.externalAccountId || null,
          updatedAt: new Date(),
        })
        .where(and(eq(brokerIntegrations.id, integration.id), eq(brokerIntegrations.userId, userId)));
    } else {
      await db.insert(brokerIntegrations).values({
        id: integration.id,
        userId,
        accountId: integration.accountId,
        provider: integration.provider,
        displayName: integration.displayName,
        status: integration.status || 'CONNECTED',
        secretHash: integration.secretHash,
        externalAccountId: integration.externalAccountId || null,
      });
    }
    return true;
  } catch (error) {
    console.error('saveBrokerIntegration error:', error);
    throw error;
  }
}

export async function deleteBrokerIntegration(userId: string, id: string) {
  try {
    const existing = await db
      .select({ owner: brokerIntegrations.userId })
      .from(brokerIntegrations)
      .where(eq(brokerIntegrations.id, id));

    if (existing.length > 0 && existing[0].owner !== userId) {
      throw new Error('Forbidden: Integration belongs to another user');
    }

    // Set status to DISCONNECTED to invalidate secret immediately
    await db
      .update(brokerIntegrations)
      .set({ status: 'DISCONNECTED', secretHash: `revoked_${Date.now()}` })
      .where(and(eq(brokerIntegrations.id, id), eq(brokerIntegrations.userId, userId)));

    await db
      .delete(brokerIntegrations)
      .where(and(eq(brokerIntegrations.id, id), eq(brokerIntegrations.userId, userId)));
    return true;
  } catch (error) {
    console.error('deleteBrokerIntegration error:', error);
    throw error;
  }
}

export async function hasProcessedEvent(integrationId: string, externalEventId: string): Promise<boolean> {
  try {
    if (!externalEventId) return false;
    const existing = await db
      .select({ id: integrationEvents.id })
      .from(integrationEvents)
      .where(
        and(
          eq(integrationEvents.integrationId, integrationId),
          eq(integrationEvents.externalEventId, externalEventId)
        )
      );
    return existing.length > 0;
  } catch (error) {
    console.error('hasProcessedEvent error:', error);
    return false;
  }
}

export function sanitizePayload(payload: any): any {
  if (payload === null || payload === undefined) return payload;
  if (Array.isArray(payload)) {
    return payload.map(item => sanitizePayload(item));
  }
  if (typeof payload === 'object') {
    const sanitized: any = {};
    const keysToRedact = new Set([
      'secret',
      'secret_hash',
      'secrethash',
      'authorization',
      'bearer',
      'token',
      'idtoken',
      'accesstoken',
      'refreshtoken',
      'password',
      'apikey',
      'api_key',
      'privatekey',
      'credential',
      'credentials'
    ]);
    for (const [key, value] of Object.entries(payload)) {
      if (keysToRedact.has(key.toLowerCase())) {
        sanitized[key] = '[REDACTED_SENSITIVE_CREDENTIAL]';
      } else {
        sanitized[key] = sanitizePayload(value);
      }
    }
    return sanitized;
  }
  return payload;
}

export async function recordIntegrationEvent(event: {
  id: string;
  integrationId: string;
  userId: string;
  externalEventId: string;
  eventType: string;
  payload: any;
  status?: string;
  error?: string;
  processingStatus?: string;
  attemptCount?: number;
  maxAttempts?: number;
  nextRetryAt?: Date;
  lastAttemptAt?: Date;
  processedAt?: Date;
  failedAt?: Date;
  errorCode?: string;
  errorMessage?: string;
  correlationId?: string;
  idempotencyKey?: string;
  sourceIpHash?: string;
  provider?: string;
}) {
  try {
    const sanitizedPayload = sanitizePayload(event.payload || {});
    await db.insert(integrationEvents).values({
      id: event.id,
      integrationId: event.integrationId,
      userId: event.userId,
      externalEventId: event.externalEventId,
      eventType: event.eventType,
      payload: sanitizedPayload,
      status: event.status || 'PROCESSED',
      error: event.error || null,
      processingStatus: event.processingStatus || 'RECEIVED',
      attemptCount: event.attemptCount !== undefined ? event.attemptCount : 1,
      maxAttempts: event.maxAttempts !== undefined ? event.maxAttempts : 5,
      nextRetryAt: event.nextRetryAt || null,
      lastAttemptAt: event.lastAttemptAt || null,
      processedAt: event.processedAt || null,
      failedAt: event.failedAt || null,
      errorCode: event.errorCode || null,
      errorMessage: event.errorMessage || null,
      correlationId: event.correlationId || null,
      idempotencyKey: event.idempotencyKey || null,
      sourceIpHash: event.sourceIpHash || null,
      provider: event.provider || null,
    });
  } catch (error) {
    console.error('recordIntegrationEvent error:', error);
  }
}

export async function getIntegrationEventsByIntegrationId(
  userId: string,
  integrationId: string,
  limit: number = 50,
  offset: number = 0
) {
  try {
    return await db
      .select()
      .from(integrationEvents)
      .where(
        and(
          eq(integrationEvents.userId, userId),
          eq(integrationEvents.integrationId, integrationId)
        )
      )
      .orderBy(desc(integrationEvents.createdAt))
      .limit(limit)
      .offset(offset);
  } catch (error) {
    console.error('getIntegrationEventsByIntegrationId error:', error);
    return [];
  }
}

export async function upsertBrokerTrade(
  userId: string,
  integration: any,
  eventPayload: {
    eventId?: string;
    eventType?: string;
    externalTradeId?: string;
    symbol: string;
    direction: 'BUY' | 'SELL';
    entryDate?: string;
    exitDate?: string;
    entryPrice: number;
    exitPrice?: number;
    quantity?: number;
    volume?: number;
    netPnl?: number;
    grossPnl?: number;
    commission?: number;
    swap?: number;
    fees?: number;
    setupType?: string;
    session?: string;
    status?: 'OPEN' | 'CLOSED';
    notes?: string;
  }
) {
  try {
    const extId = eventPayload.externalTradeId || eventPayload.eventId || `evt_${Date.now()}`;
    const extTag = `[EXT:${extId}]`;
    const accountId = integration.accountId;
    const nowIso = new Date().toISOString();

    // Check if trade already exists for this account and external ID tag
    const userTrades = await db
      .select()
      .from(trades)
      .where(and(eq(trades.userId, userId), eq(trades.accountId, accountId)));

    const existingTrade = userTrades.find(
      t => t.id === extId || (t.notes && t.notes.includes(extTag))
    );

    const qty = eventPayload.quantity || eventPayload.volume || 1;
    const entryP = eventPayload.entryPrice || 100;
    const exitP = eventPayload.exitPrice ?? (eventPayload.status === 'CLOSED' ? entryP : undefined);
    const comm = eventPayload.commission || 0;
    const swap = eventPayload.swap || 0;
    const fees = eventPayload.fees || 0;
    const netPnl = eventPayload.netPnl ?? (exitP !== undefined ? (eventPayload.direction === 'BUY' ? (exitP - entryP) * qty : (entryP - exitP) * qty) - comm - swap - fees : 0);
    const grossPnl = eventPayload.grossPnl ?? (netPnl + comm + swap + fees);
    const tradeStatus = eventPayload.status || (exitP !== undefined ? 'CLOSED' : 'OPEN');

    let savedTrade: Trade;

    if (existingTrade) {
      // Update existing trade
      const updatedNotes = existingTrade.notes.includes(extTag)
        ? existingTrade.notes
        : `${existingTrade.notes} ${extTag}`.trim();

      const existingTags = Array.isArray(existingTrade.tags) ? existingTrade.tags : [];
      const updatedTradeData: Trade = {
        ...(existingTrade as Trade),
        source: (existingTrade.source as TradeSource) || 'manual',
        market: (existingTrade.market || 'Futures') as MarketType,
        session: (existingTrade.session || 'New York') as SessionType,
        direction: (existingTrade.direction || 'BUY') as TradeDirection,
        emotionalState: (existingTrade.emotionalState || 'Disciplined') as any,
        setupGrade: (existingTrade.setupGrade as any) || undefined,
        autoGrade: (existingTrade.autoGrade as any) || undefined,
        checkedRuleIds: Array.isArray(existingTrade.checkedRuleIds) ? existingTrade.checkedRuleIds : [],
        brokenRuleIds: Array.isArray(existingTrade.brokenRuleIds) ? existingTrade.brokenRuleIds : [],
        mistakes: Array.isArray(existingTrade.mistakes) ? (existingTrade.mistakes as string[]) : [],
        exitPrice: exitP ?? existingTrade.exitPrice,
        exitDate: eventPayload.exitDate || nowIso,
        status: tradeStatus,
        netPnl: netPnl,
        grossPnl: grossPnl,
        commission: comm,
        swap: swap,
        fees: fees,
        notes: updatedNotes,
        tags: Array.from(new Set([...existingTags, 'AUTO_SYNC', integration.provider])),
      };

      await saveTrade(userId, updatedTradeData);
      savedTrade = updatedTradeData;
    } else {
      // Create new trade
      const newTradeData: Trade = {
        id: `trd_${extId.replace(/[^a-zA-Z0-9_-]/g, '_')}`,
        accountId,
        symbol: (eventPayload.symbol || 'XAUUSD').toUpperCase(),
        market: 'Futures' as MarketType,
        direction: eventPayload.direction || 'BUY',
        status: tradeStatus,
        entryDate: eventPayload.entryDate || nowIso,
        exitDate: tradeStatus === 'CLOSED' ? (eventPayload.exitDate || nowIso) : undefined,
        entryPrice: entryP,
        exitPrice: exitP,
        quantity: qty,
        commission: comm,
        swap: swap,
        fees: fees,
        grossPnl: grossPnl,
        netPnl: netPnl,
        rMultiple: parseFloat((netPnl / (Math.max(1, entryP * 0.01))).toFixed(2)),
        roiPercent: parseFloat(((netPnl / (entryP * qty || 1)) * 100).toFixed(2)),
        rating: 4,
        setupType: eventPayload.setupType || `${integration.provider} Auto-Sync`,
        session: (eventPayload.session || 'New York') as SessionType,
        rulesFollowed: netPnl >= 0,
        mistakes: [],
        emotionalState: 'Disciplined',
        notes: `${eventPayload.notes || `Synced via ${integration.provider} integration (${integration.displayName})`} ${extTag}`.trim(),
        durationMinutes: 15,
        tags: ['AUTO_SYNC', integration.provider],
      };

      await saveTrade(userId, newTradeData);
      savedTrade = newTradeData;
    }

    // Update integration last sync timestamp
    await db
      .update(brokerIntegrations)
      .set({
        lastSyncAt: nowIso,
        lastEventAt: nowIso,
        status: 'CONNECTED',
      })
      .where(and(eq(brokerIntegrations.id, integration.id), eq(brokerIntegrations.userId, userId)));

    // Recalculate account balance
    const updatedAccountTrades = await db
      .select({ netPnl: trades.netPnl, status: trades.status })
      .from(trades)
      .where(and(eq(trades.userId, userId), eq(trades.accountId, accountId)));

    const totalClosedPnl = updatedAccountTrades
      .filter(t => t.status === 'CLOSED')
      .reduce((sum, t) => sum + (t.netPnl || 0), 0);

    const accountList = await db
      .select()
      .from(tradingAccounts)
      .where(and(eq(tradingAccounts.id, accountId), eq(tradingAccounts.userId, userId)));

    if (accountList.length > 0) {
      const acc = accountList[0];
      const newBal = acc.initialBalance + totalClosedPnl;
      await db
        .update(tradingAccounts)
        .set({ currentBalance: newBal, lastSync: nowIso, syncStatus: 'HEALTHY' })
        .where(and(eq(tradingAccounts.id, accountId), eq(tradingAccounts.userId, userId)));
    }

    return savedTrade;
  } catch (error) {
    console.error('upsertBrokerTrade error:', error);
    throw error;
  }
}

export async function updateIntegrationEvent(eventId: string, updates: Partial<typeof integrationEvents.$inferInsert>) {
  try {
    await db
      .update(integrationEvents)
      .set(updates)
      .where(eq(integrationEvents.id, eventId));
  } catch (error) {
    console.error('updateIntegrationEvent error:', error);
  }
}

export async function getIntegrationEventById(userId: string, eventId: string) {
  try {
    const results = await db
      .select()
      .from(integrationEvents)
      .where(
        and(
          eq(integrationEvents.id, eventId),
          eq(integrationEvents.userId, userId)
        )
      )
      .limit(1);
    return results[0] || null;
  } catch (error) {
    console.error('getIntegrationEventById error:', error);
    return null;
  }
}

export async function getDueRetryEvents(limit: number = 20) {
  try {
    return await db
      .select()
      .from(integrationEvents)
      .where(
        and(
          eq(integrationEvents.processingStatus, 'RETRY_SCHEDULED'),
          lte(integrationEvents.nextRetryAt, new Date())
        )
      )
      .limit(limit);
  } catch (error) {
    console.error('getDueRetryEvents error:', error);
    return [];
  }
}

export async function getIntegrationStatsAndHealth(userId: string, integrationId: string) {
  try {
    const integrationList = await db
      .select()
      .from(brokerIntegrations)
      .where(
        and(
          eq(brokerIntegrations.id, integrationId),
          eq(brokerIntegrations.userId, userId)
        )
      )
      .limit(1);
    
    if (integrationList.length === 0) {
      return null;
    }
    const integration = integrationList[0];

    const events = await db
      .select()
      .from(integrationEvents)
      .where(eq(integrationEvents.integrationId, integrationId))
      .orderBy(desc(integrationEvents.createdAt));

    const totalEvents = events.length;
    
    const successEvents = events.filter(e => e.processingStatus === 'PROCESSED' || e.status === 'PROCESSED');
    const failedEvents = events.filter(e => 
      e.processingStatus === 'FAILED' || 
      e.processingStatus === 'RETRY_EXHAUSTED' || 
      e.processingStatus === 'REJECTED' ||
      e.status === 'FAILED'
    );
    const pendingRetryEvents = events.filter(e => e.processingStatus === 'RETRY_SCHEDULED');
    
    let totalRetriesCount = 0;
    events.forEach(e => {
      if (e.attemptCount && e.attemptCount > 1) {
        totalRetriesCount += (e.attemptCount - 1);
      }
    });

    const successCount = successEvents.length;
    const failedCount = failedEvents.length;
    const pendingRetryCount = pendingRetryEvents.length;

    const successRate = totalEvents > 0 ? Math.round((successCount / totalEvents) * 100) : 100;
    const failureRate = totalEvents > 0 ? Math.round((failedCount / totalEvents) * 100) : 0;

    const lastSuccessfulEvent = successEvents[0];
    const lastSuccessfulSync = lastSuccessfulEvent ? lastSuccessfulEvent.processedAt || lastSuccessfulEvent.createdAt : null;

    const lastWebhookReceived = events[0] ? events[0].createdAt : null;

    const lastFailedEvent = failedEvents[0];
    const lastFailure = lastFailedEvent ? lastFailedEvent.failedAt || lastFailedEvent.createdAt : null;

    let totalDurationMs = 0;
    let durationCount = 0;
    successEvents.forEach(e => {
      if (e.processedAt && e.createdAt) {
        const diff = new Date(e.processedAt).getTime() - new Date(e.createdAt).getTime();
        if (diff >= 0 && diff < 600000) {
          totalDurationMs += diff;
          durationCount++;
        }
      }
    });
    const avgProcessingTimeMs = durationCount > 0 ? Math.round(totalDurationMs / durationCount) : null;

    let healthStatus = 'UNKNOWN';
    
    if (integration.status === 'DISCONNECTED') {
      healthStatus = 'OFFLINE';
    } else if (totalEvents === 0) {
      healthStatus = 'UNKNOWN';
    } else {
      const recentEvents = events.slice(0, 10);
      const recentFailures = recentEvents.filter(e => 
        e.processingStatus === 'FAILED' || 
        e.processingStatus === 'RETRY_EXHAUSTED' || 
        e.processingStatus === 'REJECTED' ||
        e.status === 'FAILED'
      );
      const recentRetries = recentEvents.filter(e => e.processingStatus === 'RETRY_SCHEDULED');

      if (recentFailures.length >= 3) {
        healthStatus = 'DEGRADED';
      } else if (recentFailures.length > 0 || recentRetries.length > 0) {
        healthStatus = 'WARNING';
      } else {
        healthStatus = 'HEALTHY';
      }
    }

    return {
      integrationId,
      healthStatus,
      lastSyncTime: lastSuccessfulSync,
      lastSuccessTime: lastSuccessfulSync,
      lastFailureTime: lastFailure,
      lastWebhookReceived,
      eventCounts: {
        total: totalEvents,
        success: successCount,
        failed: failedCount,
        pendingRetry: pendingRetryCount,
        retries: totalRetriesCount,
      },
      successRate,
      failureRate,
      avgProcessingTimeMs,
      pendingRetryCount,
    };
  } catch (error) {
    console.error('getIntegrationStatsAndHealth error:', error);
    return null;
  }
}

// Daily Checklist persistence
export async function getDailyChecklist(userId: string, date: string): Promise<string[]> {
  try {
    const rows = await db
      .select()
      .from(dailyChecklistStates)
      .where(
        and(
          eq(dailyChecklistStates.userId, userId),
          eq(dailyChecklistStates.date, date)
        )
      );
    return rows.filter(r => r.completed).map(r => r.itemId);
  } catch (error) {
    console.error('getDailyChecklist error:', error);
    return [];
  }
}

export async function saveDailyChecklistItem(
  userId: string,
  date: string,
  itemId: string,
  completed: boolean
): Promise<void> {
  try {
    const id = `chk_${userId}_${date}_${itemId}`;
    await db
      .insert(dailyChecklistStates)
      .values({
        id,
        userId,
        date,
        itemId,
        completed,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [dailyChecklistStates.userId, dailyChecklistStates.date, dailyChecklistStates.itemId],
        set: {
          completed,
          updatedAt: new Date(),
        },
      });
  } catch (error) {
    console.error('saveDailyChecklistItem error:', error);
    throw error;
  }
}

export async function saveDailyChecklistBulk(
  userId: string,
  date: string,
  itemIds: string[]
): Promise<void> {
  try {
    const allItemIds = ['plan', 'risk', 'overtrade', 'journal', 'review'];
    for (const itemId of allItemIds) {
      const completed = itemIds.includes(itemId);
      await saveDailyChecklistItem(userId, date, itemId, completed);
    }
  } catch (error) {
    console.error('saveDailyChecklistBulk error:', error);
    throw error;
  }
}

// ==========================================
// STEP 7 & 7.1 - REAL BACKED LEADERBOARD & ADMIN
// ==========================================

export async function getLeaderboardData() {
  try {
    // 1. Fetch all public users
    const allUsers = await db
      .select({
        uid: users.uid,
        name: users.name,
        points: users.points,
        role: users.role,
        avatar: users.avatar,
        email: users.email,
        accountCode: users.accountCode,
      })
      .from(users)
      .where(eq(users.isPublic, true));

    // 2. Fetch trade statistics per user
    const leaderboardWithStats = await Promise.all(
      allUsers.map(async (u) => {
        const userTrades = await db
          .select({
            netPnl: trades.netPnl,
          })
          .from(trades)
          .where(eq(trades.userId, u.uid));

        const totalTrades = userTrades.length;
        const winningTrades = userTrades.filter((t) => t.netPnl > 0).length;
        const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
        const totalNetPnl = userTrades.reduce((sum, t) => sum + (t.netPnl || 0), 0);

        return {
          userId: u.uid,
          name: u.name,
          avatar: u.avatar,
          points: u.points,
          role: u.role,
          email: u.email,
          accountCode: u.accountCode,
          winRate: winRate.toFixed(1) + '%',
          winRateValue: winRate,
          pnlValue: totalNetPnl,
          pnl: totalNetPnl >= 0 ? `+$${totalNetPnl.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : `-$${Math.abs(totalNetPnl).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          totalTrades,
        };
      })
    );

    // Sort by points desc, then by pnlValue desc
    leaderboardWithStats.sort((a, b) => {
      if (b.points !== a.points) {
        return b.points - a.points;
      }
      return b.pnlValue - a.pnlValue;
    });

    // Add rank
    return leaderboardWithStats.map((item, index) => ({
      ...item,
      rank: index + 1,
    }));
  } catch (error) {
    console.error('getLeaderboardData error:', error);
    return [];
  }
}

export async function updateUserPointsAdmin(adminUserId: string, targetUserId: string, points: number, reason = 'Administrative Adjustment') {
  try {
    // 1. Verify admin role of the caller
    const adminUser = await db
      .select({ role: users.role })
      .from(users)
      .where(eq(users.uid, adminUserId))
      .limit(1);

    if (adminUser.length === 0 || adminUser[0].role !== 'ADMIN') {
      throw new Error('Forbidden: Only administrators can update points.');
    }

    // 2. Fetch current points for auditing
    const targetUser = await db
      .select({ points: users.points })
      .from(users)
      .where(eq(users.uid, targetUserId))
      .limit(1);

    const prevPoints = targetUser.length > 0 ? targetUser[0].points : 0;

    // 3. Perform points update
    await db
      .update(users)
      .set({ points })
      .where(eq(users.uid, targetUserId));

    // 4. Persist audit trail
    await db.insert(adminAuditLogs).values({
      id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      adminId: adminUserId,
      targetUserId: targetUserId,
      action: 'UPDATE_POINTS',
      previousValue: String(prevPoints),
      newValue: String(points),
      reason,
    });

    console.log(`[AUDIT] Admin ${adminUserId} updated points of user ${targetUserId} from ${prevPoints} to ${points}`);
    return true;
  } catch (error) {
    console.error('updateUserPointsAdmin error:', error);
    throw error;
  }
}

export async function updateUserRoleAdmin(adminUserId: string, targetUserId: string, role: string, reason = 'Administrative Adjustment') {
  try {
    // 1. Verify admin role of the caller
    const adminUser = await db
      .select({ role: users.role })
      .from(users)
      .where(eq(users.uid, adminUserId))
      .limit(1);

    if (adminUser.length === 0 || adminUser[0].role !== 'ADMIN') {
      throw new Error('Forbidden: Only administrators can update roles.');
    }

    // 2. Fetch current role for auditing
    const targetUser = await db
      .select({ role: users.role })
      .from(users)
      .where(eq(users.uid, targetUserId))
      .limit(1);

    const prevRole = targetUser.length > 0 ? targetUser[0].role : 'USER';

    // 3. Perform role update
    await db
      .update(users)
      .set({ role })
      .where(eq(users.uid, targetUserId));

    // 4. Persist audit trail
    await db.insert(adminAuditLogs).values({
      id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      adminId: adminUserId,
      targetUserId: targetUserId,
      action: 'UPDATE_ROLE',
      previousValue: prevRole,
      newValue: role,
      reason,
    });

    console.log(`[AUDIT] Admin ${adminUserId} updated role of user ${targetUserId} from ${prevRole} to ${role}`);
    return true;
  } catch (error) {
    console.error('updateUserRoleAdmin error:', error);
    throw error;
  }
}

// ==========================================
// STEP 8 - BACKTESTING DRAWINGS & TEMPLATES CLOUD PERSISTENCE
// ==========================================

export async function getBacktestDrawings(userId: string, symbol?: string, sessionId: string = 'default') {
  try {
    let conditions = eq(backtestDrawings.userId, userId);
    if (symbol) {
      conditions = and(eq(backtestDrawings.userId, userId), eq(backtestDrawings.symbol, symbol)) as any;
    }

    const rows = await db
      .select()
      .from(backtestDrawings)
      .where(conditions);

    return rows.map(r => ({
      id: r.id,
      userId: r.userId,
      sessionId: r.sessionId,
      symbol: r.symbol,
      timeframe: r.timeframe,
      drawings: r.drawings as any[],
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));
  } catch (error) {
    console.error('getBacktestDrawings error:', error);
    return [];
  }
}

export async function saveBacktestDrawings(
  userId: string,
  symbol: string,
  drawingsList: any[],
  sessionId: string = 'default',
  timeframe: string = '15m'
) {
  try {
    const existing = await db
      .select()
      .from(backtestDrawings)
      .where(
        and(
          eq(backtestDrawings.userId, userId),
          eq(backtestDrawings.symbol, symbol),
          eq(backtestDrawings.sessionId, sessionId)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(backtestDrawings)
        .set({
          drawings: drawingsList,
          timeframe,
          updatedAt: new Date(),
        })
        .where(eq(backtestDrawings.id, existing[0].id));

      return { id: existing[0].id, success: true };
    } else {
      const id = `draw_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      await db.insert(backtestDrawings).values({
        id,
        userId,
        sessionId,
        symbol,
        timeframe,
        drawings: drawingsList,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      return { id, success: true };
    }
  } catch (error) {
    console.error('saveBacktestDrawings error:', error);
    throw error;
  }
}

export async function getChartTemplates(userId: string) {
  try {
    const templates = await db
      .select()
      .from(chartTemplates)
      .where(eq(chartTemplates.userId, userId))
      .orderBy(desc(chartTemplates.createdAt));

    return templates.map(t => ({
      id: t.id,
      name: t.name,
      description: t.description || '',
      chartType: t.chartType,
      indicators: t.indicators as any[],
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    }));
  } catch (error) {
    console.error('getChartTemplates error:', error);
    return [];
  }
}

export async function saveChartTemplate(
  userId: string,
  template: {
    id?: string;
    name: string;
    description?: string;
    chartType: string;
    indicators: any[];
  }
) {
  try {
    const id = template.id || `custom-${Date.now()}`;
    const existing = await db
      .select()
      .from(chartTemplates)
      .where(and(eq(chartTemplates.id, id), eq(chartTemplates.userId, userId)))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(chartTemplates)
        .set({
          name: template.name,
          description: template.description || '',
          chartType: template.chartType,
          indicators: template.indicators,
          updatedAt: new Date(),
        })
        .where(and(eq(chartTemplates.id, id), eq(chartTemplates.userId, userId)));

      return { id, success: true };
    } else {
      await db.insert(chartTemplates).values({
        id,
        userId,
        name: template.name,
        description: template.description || '',
        chartType: template.chartType,
        indicators: template.indicators,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      return { id, success: true };
    }
  } catch (error) {
    console.error('saveChartTemplate error:', error);
    throw error;
  }
}

export async function deleteChartTemplate(userId: string, templateId: string) {
  try {
    await db
      .delete(chartTemplates)
      .where(and(eq(chartTemplates.id, templateId), eq(chartTemplates.userId, userId)));

    return { success: true };
  } catch (error) {
    console.error('deleteChartTemplate error:', error);
    throw error;
  }
}

// ==========================================
// Auto-Sync Trading Account Connections
// ==========================================

export async function getTradingAccountConnections(userId: string): Promise<TradingAccountConnection[]> {
  try {
    const rows = await db
      .select()
      .from(tradingAccountConnections)
      .where(eq(tradingAccountConnections.userId, userId));

    return rows.map((r) => ({
      id: r.id,
      userId: r.userId,
      accountId: r.accountId,
      platform: r.platform as TradingAccountConnection['platform'],
      broker: r.broker,
      server: r.server || undefined,
      accountNumber: r.accountNumber,
      accountName: r.accountName || undefined,
      currency: r.currency,
      accountType: (r.accountType as TradingAccountConnection['accountType']) || 'LIVE',
      connectionStatus: (r.connectionStatus as TradingAccountConnection['connectionStatus']) || 'CONNECTED',
      syncEnabled: r.syncEnabled,
      autoSyncIntervalMins: r.autoSyncIntervalMins,
      importScope: (r.importScope as 'ALL' | 'DATE') || 'ALL',
      importStartDate: r.importStartDate || undefined,
      lastSyncAt: r.lastSyncAt || undefined,
      lastSyncError: r.lastSyncError || undefined,
      lastSyncTradesCount: r.lastSyncTradesCount || 0,
      balance: r.balance || 0,
      equity: r.equity || 0,
      leverage: r.leverage || 100,
      metadata: (r.metadata as Record<string, any>) || {},
      createdAt: r.createdAt ? r.createdAt.toISOString() : undefined,
      updatedAt: r.updatedAt ? r.updatedAt.toISOString() : undefined,
    }));
  } catch (error) {
    console.error('getTradingAccountConnections error:', error);
    return [];
  }
}

export async function getTradingAccountConnectionById(userId: string, id: string) {
  try {
    const rows = await db
      .select()
      .from(tradingAccountConnections)
      .where(and(eq(tradingAccountConnections.id, id), eq(tradingAccountConnections.userId, userId)));
    return rows.length > 0 ? rows[0] : null;
  } catch (error) {
    console.error('getTradingAccountConnectionById error:', error);
    return null;
  }
}

export async function saveTradingAccountConnection(
  userId: string,
  connection: {
    id: string;
    accountId: string;
    platform: string;
    broker: string;
    server?: string;
    accountNumber: string;
    accountName?: string;
    currency?: string;
    accountType?: string;
    encryptedCredentials?: string;
    connectionStatus?: string;
    syncEnabled?: boolean;
    autoSyncIntervalMins?: number;
    importScope?: string;
    importStartDate?: string;
    lastSyncAt?: string;
    lastSyncError?: string;
    lastSyncTradesCount?: number;
    balance?: number;
    equity?: number;
    leverage?: number;
    metadata?: Record<string, any>;
  }
) {
  try {
    const existing = await db
      .select({ id: tradingAccountConnections.id, owner: tradingAccountConnections.userId })
      .from(tradingAccountConnections)
      .where(eq(tradingAccountConnections.id, connection.id));

    if (existing.length > 0) {
      if (existing[0].owner !== userId) {
        throw new Error('Forbidden: Connection belongs to another user');
      }

      const updatePayload: Record<string, any> = {
        updatedAt: new Date(),
      };
      if (connection.broker !== undefined) updatePayload.broker = connection.broker;
      if (connection.server !== undefined) updatePayload.server = connection.server;
      if (connection.accountNumber !== undefined) updatePayload.accountNumber = connection.accountNumber;
      if (connection.accountName !== undefined) updatePayload.accountName = connection.accountName;
      if (connection.currency !== undefined) updatePayload.currency = connection.currency;
      if (connection.accountType !== undefined) updatePayload.accountType = connection.accountType;
      if (connection.encryptedCredentials !== undefined) updatePayload.encryptedCredentials = connection.encryptedCredentials;
      if (connection.connectionStatus !== undefined) updatePayload.connectionStatus = connection.connectionStatus;
      if (connection.syncEnabled !== undefined) updatePayload.syncEnabled = connection.syncEnabled;
      if (connection.autoSyncIntervalMins !== undefined) updatePayload.autoSyncIntervalMins = connection.autoSyncIntervalMins;
      if (connection.importScope !== undefined) updatePayload.importScope = connection.importScope;
      if (connection.importStartDate !== undefined) updatePayload.importStartDate = connection.importStartDate;
      if (connection.lastSyncAt !== undefined) updatePayload.lastSyncAt = connection.lastSyncAt;
      if (connection.lastSyncError !== undefined) updatePayload.lastSyncError = connection.lastSyncError;
      if (connection.lastSyncTradesCount !== undefined) updatePayload.lastSyncTradesCount = connection.lastSyncTradesCount;
      if (connection.balance !== undefined) updatePayload.balance = connection.balance;
      if (connection.equity !== undefined) updatePayload.equity = connection.equity;
      if (connection.leverage !== undefined) updatePayload.leverage = connection.leverage;
      if (connection.metadata !== undefined) updatePayload.metadata = connection.metadata;

      await db
        .update(tradingAccountConnections)
        .set(updatePayload)
        .where(and(eq(tradingAccountConnections.id, connection.id), eq(tradingAccountConnections.userId, userId)));
    } else {
      await db.insert(tradingAccountConnections).values({
        id: connection.id,
        userId,
        accountId: connection.accountId,
        platform: connection.platform,
        broker: connection.broker,
        server: connection.server || null,
        accountNumber: connection.accountNumber,
        accountName: connection.accountName || null,
        currency: connection.currency || 'USD',
        accountType: connection.accountType || 'LIVE',
        encryptedCredentials: connection.encryptedCredentials || '',
        connectionStatus: connection.connectionStatus || 'CONNECTED',
        syncEnabled: connection.syncEnabled !== undefined ? connection.syncEnabled : true,
        autoSyncIntervalMins: connection.autoSyncIntervalMins || 5,
        importScope: connection.importScope || 'ALL',
        importStartDate: connection.importStartDate || null,
        lastSyncAt: connection.lastSyncAt || null,
        lastSyncError: connection.lastSyncError || null,
        lastSyncTradesCount: connection.lastSyncTradesCount || 0,
        balance: connection.balance || 0,
        equity: connection.equity || 0,
        leverage: connection.leverage || 100,
        metadata: connection.metadata || {},
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
  } catch (error) {
    console.error('saveTradingAccountConnection error:', error);
    throw error;
  }
}

export async function deleteTradingAccountConnection(userId: string, id: string) {
  try {
    const existing = await db
      .select({ owner: tradingAccountConnections.userId })
      .from(tradingAccountConnections)
      .where(eq(tradingAccountConnections.id, id));

    if (existing.length > 0 && existing[0].owner !== userId) {
      throw new Error('Forbidden: Connection belongs to another user');
    }

    await db
      .delete(tradingAccountConnections)
      .where(and(eq(tradingAccountConnections.id, id), eq(tradingAccountConnections.userId, userId)));

    // Clean up associated sync logs
    await db
      .delete(connectionSyncLogs)
      .where(and(eq(connectionSyncLogs.connectionId, id), eq(connectionSyncLogs.userId, userId)));
  } catch (error) {
    console.error('deleteTradingAccountConnection error:', error);
    throw error;
  }
}

export async function getConnectionSyncLogs(userId: string, connectionId?: string, limit = 50): Promise<ConnectionSyncLog[]> {
  try {
    let query = db
      .select()
      .from(connectionSyncLogs)
      .where(
        connectionId
          ? and(eq(connectionSyncLogs.userId, userId), eq(connectionSyncLogs.connectionId, connectionId))
          : eq(connectionSyncLogs.userId, userId)
      )
      .orderBy(desc(connectionSyncLogs.createdAt))
      .limit(limit);

    const rows = await query;
    return rows.map((r) => ({
      id: r.id,
      connectionId: r.connectionId,
      userId: r.userId,
      status: r.status as ConnectionSyncLog['status'],
      tradesImported: r.tradesImported,
      tradesUpdated: r.tradesUpdated,
      errorMessage: r.errorMessage || undefined,
      details: (r.details as Record<string, any>) || undefined,
      startedAt: r.startedAt,
      completedAt: r.completedAt || undefined,
      durationMs: r.durationMs || 0,
      createdAt: r.createdAt ? r.createdAt.toISOString() : undefined,
    }));
  } catch (error) {
    console.error('getConnectionSyncLogs error:', error);
    return [];
  }
}

export async function createConnectionSyncLog(userId: string, log: Omit<ConnectionSyncLog, 'userId' | 'createdAt'>) {
  try {
    await db.insert(connectionSyncLogs).values({
      id: log.id,
      connectionId: log.connectionId,
      userId,
      status: log.status,
      tradesImported: log.tradesImported,
      tradesUpdated: log.tradesUpdated,
      errorMessage: log.errorMessage || null,
      details: log.details || null,
      startedAt: log.startedAt,
      completedAt: log.completedAt || null,
      durationMs: log.durationMs || 0,
      createdAt: new Date(),
    });
  } catch (error) {
    console.error('createConnectionSyncLog error:', error);
  }
}

/**
 * Idempotent upsert of an auto-synced normalized trade.
 * CRITICAL RULE: If trade already exists (identified by externalTradeId + userId or id),
 * updates execution data (exitPrice, exitDate, pnl, etc.) WITHOUT overwriting
 * the user's manual notes, tags, playbook, strategy, rating, or mistakes!
 */
export async function upsertSyncedTrade(
  userId: string,
  accountId: string,
  connectionId: string,
  trade: {
    externalTradeId: string;
    platform: string;
    broker: string;
    symbol: string;
    market: Trade['market'];
    direction: Trade['direction'];
    status: Trade['status'];
    entryDate: string;
    exitDate?: string;
    entryPrice: number;
    exitPrice?: number;
    stopLoss?: number;
    takeProfit?: number;
    quantity: number;
    grossPnl: number;
    netPnl: number;
    commission?: number;
    swap?: number;
    fees?: number;
    rMultiple?: number;
    roiPercent?: number;
    session?: Trade['session'];
    setupType?: string;
    orderId?: string;
    positionId?: string;
    notes?: string;
  }
): Promise<{ isNew: boolean; id: string }> {
  try {
    const existing = await db
      .select()
      .from(trades)
      .where(and(eq(trades.userId, userId), eq(trades.externalTradeId, trade.externalTradeId)));

    if (existing.length > 0) {
      const current = existing[0];
      // Update only financial/execution metrics while preserving user's journaled annotations
      await db
        .update(trades)
        .set({
          accountId,
          connectionId,
          platform: trade.platform,
          broker: trade.broker,
          source: trade.platform.toLowerCase() as Trade['source'],
          orderId: trade.orderId || current.orderId,
          positionId: trade.positionId || current.positionId,
          status: trade.status,
          exitDate: trade.exitDate || current.exitDate,
          exitPrice: trade.exitPrice !== undefined ? trade.exitPrice : current.exitPrice,
          stopLoss: trade.stopLoss !== undefined ? trade.stopLoss : current.stopLoss,
          takeProfit: trade.takeProfit !== undefined ? trade.takeProfit : current.takeProfit,
          quantity: trade.quantity,
          grossPnl: trade.grossPnl,
          netPnl: trade.netPnl,
          commission: trade.commission !== undefined ? trade.commission : current.commission,
          swap: trade.swap !== undefined ? trade.swap : current.swap,
          fees: trade.fees !== undefined ? trade.fees : current.fees,
          rMultiple: trade.rMultiple !== undefined ? trade.rMultiple : current.rMultiple,
          roiPercent: trade.roiPercent !== undefined ? trade.roiPercent : current.roiPercent,
        })
        .where(eq(trades.id, current.id));

      return { isNew: false, id: current.id };
    } else {
      const newId = `sync_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      await db.insert(trades).values({
        id: newId,
        userId,
        accountId,
        connectionId,
        externalTradeId: trade.externalTradeId,
        platform: trade.platform,
        broker: trade.broker,
        source: trade.platform.toLowerCase() as Trade['source'],
        orderId: trade.orderId || null,
        positionId: trade.positionId || null,
        symbol: trade.symbol,
        market: trade.market,
        direction: trade.direction,
        status: trade.status,
        entryDate: trade.entryDate,
        exitDate: trade.exitDate || null,
        entryPrice: trade.entryPrice,
        exitPrice: trade.exitPrice || null,
        stopLoss: trade.stopLoss || null,
        takeProfit: trade.takeProfit || null,
        quantity: trade.quantity,
        grossPnl: trade.grossPnl,
        netPnl: trade.netPnl,
        commission: trade.commission || 0,
        swap: trade.swap || 0,
        fees: trade.fees || 0,
        rMultiple: trade.rMultiple || 0,
        roiPercent: trade.roiPercent || 0,
        session: trade.session || 'New York',
        strategyId: null,
        playbookId: null,
        setupType: trade.setupType || 'Auto-Synced Execution',
        rating: 3,
        notes: trade.notes || '',
        tags: [],
        mistakes: [],
        rulesFollowed: true,
        screenshotUrl: null,
        afterScreenshotUrl: null,
        durationMinutes: 0,
        emotionalState: 'Disciplined',
      });

      return { isNew: true, id: newId };
    }
  } catch (error) {
    console.error('upsertSyncedTrade error:', error);
    throw error;
  }
}

// ==========================================
// MENTOR HUB & ACCOUNT SHARING REPOSITORY
// ==========================================

export async function searchAccountsForMentorship(currentUserId: string, rawQuery: string) {
  const query = rawQuery.trim();
  if (!query) return [];

  const formattedCode = query.toUpperCase();

  // Query profiles matching name or accountCode (STRICTLY NO EMAIL)
  const matches = await db
    .select({
      id: profiles.id,
      fullName: profiles.fullName,
      accountCode: profiles.accountCode,
      avatarUrl: profiles.avatarUrl,
    })
    .from(profiles)
    .where(
      and(
        not(eq(profiles.id, currentUserId)),
        or(
          ilike(profiles.fullName, `%${query}%`),
          eq(profiles.accountCode, formattedCode),
          ilike(profiles.accountCode, `%${query}%`)
        )
      )
    )
    .limit(20);

  if (matches.length > 0) {
    return matches.map((p) => ({
      id: p.id,
      displayName: p.fullName || 'TradeForge Trader',
      accountCode: p.accountCode || 'TF-MTR-UNKNOWN',
      avatarUrl: p.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80',
      role: 'Mentor / Student',
    }));
  }

  // Fallback to users table if profiles doesn't have it
  const userMatches = await db
    .select({
      id: users.uid,
      name: users.name,
      accountCode: users.accountCode,
      avatar: users.avatar,
    })
    .from(users)
    .where(
      and(
        not(eq(users.uid, currentUserId)),
        or(
          ilike(users.name, `%${query}%`),
          eq(users.accountCode, formattedCode),
          ilike(users.accountCode, `%${query}%`)
        )
      )
    )
    .limit(20);

  return userMatches.map((u) => ({
    id: u.id,
    displayName: u.name || 'TradeForge Trader',
    accountCode: u.accountCode || 'TF-MTR-UNKNOWN',
    avatarUrl: u.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80',
    role: 'Mentor / Student',
  }));
}

export async function connectMentorByCode(studentUserId: string, inputCodeOrId: string) {
  const clean = inputCodeOrId.trim();
  if (!clean) {
    throw new Error('Unique Mentor Code is required.');
  }
  const cleanUpper = clean.toUpperCase();

  // Find mentor profile
  let mentorUser: { id: string; name: string; accountCode: string; avatarUrl: string } | null = null;

  const profileRows = await db
    .select({
      id: profiles.id,
      name: profiles.fullName,
      accountCode: profiles.accountCode,
      avatarUrl: profiles.avatarUrl,
    })
    .from(profiles)
    .where(or(eq(profiles.accountCode, cleanUpper), eq(profiles.id, clean)))
    .limit(1);

  if (profileRows.length > 0) {
    mentorUser = {
      id: profileRows[0].id,
      name: profileRows[0].name || 'Trader',
      accountCode: profileRows[0].accountCode || 'TF-MTR-UNKNOWN',
      avatarUrl: profileRows[0].avatarUrl || '',
    };
  } else {
    const userRows = await db
      .select({
        id: users.uid,
        name: users.name,
        accountCode: users.accountCode,
        avatar: users.avatar,
      })
      .from(users)
      .where(or(eq(users.accountCode, cleanUpper), eq(users.uid, clean)))
      .limit(1);

    if (userRows.length > 0) {
      mentorUser = {
        id: userRows[0].id,
        name: userRows[0].name || 'Trader',
        accountCode: userRows[0].accountCode || 'TF-MTR-UNKNOWN',
        avatarUrl: userRows[0].avatar || '',
      };
    }
  }

  if (!mentorUser) {
    throw new Error('No TradeForge account found with that Unique Mentor Code.');
  }

  if (mentorUser.id === studentUserId) {
    throw new Error('You cannot connect with your own Mentor Code.');
  }

  // Check existing relationship
  const existingRel = await db
    .select()
    .from(mentorStudentRelationships)
    .where(
      and(
        eq(mentorStudentRelationships.mentorUserId, mentorUser.id),
        eq(mentorStudentRelationships.studentUserId, studentUserId)
      )
    )
    .limit(1);

  if (existingRel.length > 0) {
    const status = existingRel[0].status;
    if (status === 'APPROVED' || status === 'ACTIVE') {
      throw new Error('You are already connected.');
    } else if (status === 'PENDING') {
      throw new Error('Request already pending.');
    }
  }

  const relId = `rel_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date();

  // Create relationship record
  if (existingRel.length > 0) {
    await db
      .update(mentorStudentRelationships)
      .set({ status: 'APPROVED', updatedAt: now })
      .where(eq(mentorStudentRelationships.id, existingRel[0].id));
  } else {
    await db.insert(mentorStudentRelationships).values({
      id: relId,
      mentorUserId: mentorUser.id,
      studentUserId: studentUserId,
      status: 'APPROVED',
      createdAt: now,
      updatedAt: now,
    });
  }

  // Ensure default student_sharing_permissions record
  const existingPerms = await db
    .select()
    .from(studentSharingPermissions)
    .where(
      and(
        eq(studentSharingPermissions.studentUserId, studentUserId),
        eq(studentSharingPermissions.mentorUserId, mentorUser.id)
      )
    )
    .limit(1);

  if (existingPerms.length === 0) {
    await db.insert(studentSharingPermissions).values({
      id: `perm_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      studentUserId,
      mentorUserId: mentorUser.id,
      sharedAccountIds: [],
      canViewAccountOverview: true,
      canViewTrades: true,
      canViewAnalytics: true,
      canViewEquityCurve: true,
      canViewDrawdown: true,
      canViewPlaybooks: false,
      canViewNotes: false,
      canViewRiskControls: false,
      createdAt: now,
      updatedAt: now,
    });
  }

  // Sync to legacy mentorStudents table for backwards compatibility
  const studentProfile = await getUserProfile(studentUserId);
  const studentAccounts = await getTradingAccounts(studentUserId);
  const mainAcc = studentAccounts[0];

  const mentorStudentId = `ms_${mentorUser.id}_${studentUserId}`;
  const existingMS = await db.select().from(mentorStudents).where(eq(mentorStudents.id, mentorStudentId)).limit(1);

  if (existingMS.length === 0) {
    await db.insert(mentorStudents).values({
      id: mentorStudentId,
      userId: mentorUser.id,
      code: studentProfile?.accountCode || 'TF-MTR-UNKNOWN',
      name: studentProfile?.fullName || 'Student Trader',
      email: '', // Never expose email
      avatar: studentProfile?.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80',
      accountName: mainAcc?.name || 'Main Trading Account',
      currentBalance: mainAcc?.currentBalance || 10000,
      netPnl: 0,
      winRate: 0,
      profitFactor: 0,
      zellaScore: 85,
      totalTrades: 0,
      status: 'ACTIVE',
      sharedAccounts: mainAcc ? [mainAcc.id] : [],
      unreadNotesCount: 0,
      disciplineScore: 90,
      joinedDate: new Date().toISOString().split('T')[0],
      riskBreached: false,
    });
  }

  return {
    relationshipId: relId,
    mentor: {
      id: mentorUser.id,
      displayName: mentorUser.name,
      accountCode: mentorUser.accountCode,
      avatarUrl: mentorUser.avatarUrl,
      role: 'Mentor',
    },
  };
}

export async function connectStudentByCode(mentorUserId: string, inputCodeOrId: string) {
  const clean = inputCodeOrId.trim();
  if (!clean) {
    throw new Error('Student Unique Mentor Code is required.');
  }
  const cleanUpper = clean.toUpperCase();

  // Find student profile
  let studentUser: { id: string; name: string; accountCode: string; avatarUrl: string } | null = null;

  const profileRows = await db
    .select({
      id: profiles.id,
      name: profiles.fullName,
      accountCode: profiles.accountCode,
      avatarUrl: profiles.avatarUrl,
    })
    .from(profiles)
    .where(or(eq(profiles.accountCode, cleanUpper), eq(profiles.id, clean)))
    .limit(1);

  if (profileRows.length > 0) {
    studentUser = {
      id: profileRows[0].id,
      name: profileRows[0].name || 'Student Trader',
      accountCode: profileRows[0].accountCode || 'TF-MTR-UNKNOWN',
      avatarUrl: profileRows[0].avatarUrl || '',
    };
  } else {
    const userRows = await db
      .select({
        id: users.uid,
        name: users.name,
        accountCode: users.accountCode,
        avatar: users.avatar,
      })
      .from(users)
      .where(or(eq(users.accountCode, cleanUpper), eq(users.uid, clean)))
      .limit(1);

    if (userRows.length > 0) {
      studentUser = {
        id: userRows[0].id,
        name: userRows[0].name || 'Student Trader',
        accountCode: userRows[0].accountCode || 'TF-MTR-UNKNOWN',
        avatarUrl: userRows[0].avatar || '',
      };
    }
  }

  if (!studentUser) {
    throw new Error('Student not found. Check the Unique Mentor Code.');
  }

  if (studentUser.id === mentorUserId) {
    throw new Error('You cannot add yourself as a student.');
  }

  // Check existing relationship
  const existingRel = await db
    .select()
    .from(mentorStudentRelationships)
    .where(
      and(
        eq(mentorStudentRelationships.mentorUserId, mentorUserId),
        eq(mentorStudentRelationships.studentUserId, studentUser.id)
      )
    )
    .limit(1);

  if (existingRel.length > 0) {
    const status = existingRel[0].status;
    if (status === 'APPROVED' || status === 'ACTIVE') {
      throw new Error('You are already connected to this student.');
    } else if (status === 'PENDING') {
      throw new Error('Connection request already pending.');
    }
  }

  const relId = `rel_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date();

  if (existingRel.length > 0) {
    await db
      .update(mentorStudentRelationships)
      .set({ status: 'APPROVED', updatedAt: now })
      .where(eq(mentorStudentRelationships.id, existingRel[0].id));
  } else {
    await db.insert(mentorStudentRelationships).values({
      id: relId,
      mentorUserId: mentorUserId,
      studentUserId: studentUser.id,
      status: 'APPROVED',
      createdAt: now,
      updatedAt: now,
    });
  }

  // Ensure default permissions record
  const existingPerms = await db
    .select()
    .from(studentSharingPermissions)
    .where(
      and(
        eq(studentSharingPermissions.studentUserId, studentUser.id),
        eq(studentSharingPermissions.mentorUserId, mentorUserId)
      )
    )
    .limit(1);

  if (existingPerms.length === 0) {
    await db.insert(studentSharingPermissions).values({
      id: `perm_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      studentUserId: studentUser.id,
      mentorUserId: mentorUserId,
      sharedAccountIds: [],
      canViewAccountOverview: true,
      canViewTrades: true,
      canViewAnalytics: true,
      canViewEquityCurve: true,
      canViewDrawdown: true,
      canViewPlaybooks: false,
      canViewNotes: false,
      canViewRiskControls: false,
      createdAt: now,
      updatedAt: now,
    });
  }

  return {
    relationshipId: relId,
    student: {
      id: studentUser.id,
      displayName: studentUser.name,
      accountCode: studentUser.accountCode,
      avatarUrl: studentUser.avatarUrl,
      role: 'Student',
    },
  };
}

export async function searchStudentByMentorCode(mentorUserId: string, code: string) {
  const clean = code.trim().toUpperCase();
  if (!clean) throw new Error('Student Unique Mentor Code is required.');

  // Exact code matching on profiles
  const profileMatches = await db
    .select({
      id: profiles.id,
      fullName: profiles.fullName,
      accountCode: profiles.accountCode,
      avatarUrl: profiles.avatarUrl,
    })
    .from(profiles)
    .where(eq(profiles.accountCode, clean))
    .limit(1);

  if (profileMatches.length > 0) {
    const p = profileMatches[0];
    if (p.id === mentorUserId) {
      throw new Error('You cannot add yourself as a student.');
    }
    return {
      id: p.id,
      displayName: p.fullName || 'TradeForge Trader',
      accountCode: p.accountCode,
      avatarUrl: p.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80',
      role: 'Student / Mentor',
    };
  }

  // Fallback to users table
  const userMatches = await db
    .select({
      id: users.uid,
      name: users.name,
      accountCode: users.accountCode,
      avatar: users.avatar,
    })
    .from(users)
    .where(eq(users.accountCode, clean))
    .limit(1);

  if (userMatches.length > 0) {
    const u = userMatches[0];
    if (u.id === mentorUserId) {
      throw new Error('You cannot add yourself as a student.');
    }
    return {
      id: u.id,
      displayName: u.name || 'TradeForge Trader',
      accountCode: u.accountCode,
      avatarUrl: u.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80',
      role: 'Student / Mentor',
    };
  }

  throw new Error('Student not found. Check the Unique Mentor Code.');
}

export async function getStudentMentors(studentUserId: string) {
  const rels = await db
    .select()
    .from(mentorStudentRelationships)
    .where(
      and(
        eq(mentorStudentRelationships.studentUserId, studentUserId),
        or(
          eq(mentorStudentRelationships.status, 'APPROVED'),
          eq(mentorStudentRelationships.status, 'ACTIVE'),
          eq(mentorStudentRelationships.status, 'PENDING')
        )
      )
    );

  const mentorsList = [];

  for (const rel of rels) {
    const profile = await getUserProfile(rel.mentorUserId);
    const perms = await getStudentSharingPermissions(studentUserId, rel.mentorUserId);

    mentorsList.push({
      relationshipId: rel.id,
      mentorUserId: rel.mentorUserId,
      displayName: profile?.fullName || 'TradeForge Mentor',
      accountCode: profile?.accountCode || 'TF-MTR-UNKNOWN',
      avatarUrl: profile?.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80',
      status: rel.status,
      connectedDate: rel.createdAt ? new Date(rel.createdAt).toLocaleDateString() : 'Recently',
      permissions: perms,
    });
  }

  return mentorsList;
}

export async function getMentorStudentsFull(mentorUserId: string) {
  const rels = await db
    .select()
    .from(mentorStudentRelationships)
    .where(
      and(
        eq(mentorStudentRelationships.mentorUserId, mentorUserId),
        or(
          eq(mentorStudentRelationships.status, 'APPROVED'),
          eq(mentorStudentRelationships.status, 'ACTIVE')
        )
      )
    );

  const studentsList = [];

  for (const rel of rels) {
    const studentProfile = await getUserProfile(rel.studentUserId);
    const studentAccounts = await getTradingAccounts(rel.studentUserId);
    const studentTrades = await getTrades(rel.studentUserId);

    const mainAccount = studentAccounts[0];
    const totalTrades = studentTrades.length;
    const wins = studentTrades.filter((t) => (t.netPnl || 0) > 0).length;
    const winRate = totalTrades > 0 ? Math.round((wins / totalTrades) * 100) : 0;
    const netPnl = studentTrades.reduce((acc, t) => acc + (t.netPnl || 0), 0);

    studentsList.push({
      id: rel.studentUserId,
      relationshipId: rel.id,
      code: studentProfile?.accountCode || 'TF-MTR-UNKNOWN',
      name: studentProfile?.fullName || 'Student Trader',
      avatar: studentProfile?.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80',
      accountName: mainAccount?.name || 'Main Trading Account',
      currentBalance: mainAccount?.currentBalance || 10000,
      netPnl,
      winRate,
      totalTrades,
      status: rel.status,
      joinedDate: rel.createdAt ? new Date(rel.createdAt).toLocaleDateString() : 'Recently',
      riskBreached: false,
    });
  }

  return studentsList;
}

export async function getStudentSharingPermissions(studentUserId: string, mentorUserId: string) {
  const perms = await db
    .select()
    .from(studentSharingPermissions)
    .where(
      and(
        eq(studentSharingPermissions.studentUserId, studentUserId),
        eq(studentSharingPermissions.mentorUserId, mentorUserId)
      )
    )
    .limit(1);

  if (perms.length > 0) {
    const p = perms[0];
    return {
      sharedAccountIds: Array.isArray(p.sharedAccountIds) ? (p.sharedAccountIds as string[]) : [],
      canViewAccountOverview: p.canViewAccountOverview,
      canViewTrades: p.canViewTrades,
      canViewAnalytics: p.canViewAnalytics,
      canViewEquityCurve: p.canViewEquityCurve,
      canViewDrawdown: p.canViewDrawdown,
      canViewPlaybooks: p.canViewPlaybooks,
      canViewNotes: p.canViewNotes,
      canViewRiskControls: p.canViewRiskControls,
    };
  }

  return {
    sharedAccountIds: [],
    canViewAccountOverview: true,
    canViewTrades: true,
    canViewAnalytics: true,
    canViewEquityCurve: true,
    canViewDrawdown: true,
    canViewPlaybooks: false,
    canViewNotes: false,
    canViewRiskControls: false,
  };
}

export async function updateStudentSharingPermissions(
  studentUserId: string,
  mentorUserId: string,
  permissions: Partial<{
    sharedAccountIds: string[];
    canViewAccountOverview: boolean;
    canViewTrades: boolean;
    canViewAnalytics: boolean;
    canViewEquityCurve: boolean;
    canViewDrawdown: boolean;
    canViewPlaybooks: boolean;
    canViewNotes: boolean;
    canViewRiskControls: boolean;
  }>
) {
  const existing = await db
    .select()
    .from(studentSharingPermissions)
    .where(
      and(
        eq(studentSharingPermissions.studentUserId, studentUserId),
        eq(studentSharingPermissions.mentorUserId, mentorUserId)
      )
    )
    .limit(1);

  const now = new Date();

  if (existing.length > 0) {
    const [updated] = await db
      .update(studentSharingPermissions)
      .set({
        sharedAccountIds: permissions.sharedAccountIds !== undefined ? permissions.sharedAccountIds : existing[0].sharedAccountIds,
        canViewAccountOverview: permissions.canViewAccountOverview !== undefined ? permissions.canViewAccountOverview : existing[0].canViewAccountOverview,
        canViewTrades: permissions.canViewTrades !== undefined ? permissions.canViewTrades : existing[0].canViewTrades,
        canViewAnalytics: permissions.canViewAnalytics !== undefined ? permissions.canViewAnalytics : existing[0].canViewAnalytics,
        canViewEquityCurve: permissions.canViewEquityCurve !== undefined ? permissions.canViewEquityCurve : existing[0].canViewEquityCurve,
        canViewDrawdown: permissions.canViewDrawdown !== undefined ? permissions.canViewDrawdown : existing[0].canViewDrawdown,
        canViewPlaybooks: permissions.canViewPlaybooks !== undefined ? permissions.canViewPlaybooks : existing[0].canViewPlaybooks,
        canViewNotes: permissions.canViewNotes !== undefined ? permissions.canViewNotes : existing[0].canViewNotes,
        canViewRiskControls: permissions.canViewRiskControls !== undefined ? permissions.canViewRiskControls : existing[0].canViewRiskControls,
        updatedAt: now,
      })
      .where(eq(studentSharingPermissions.id, existing[0].id))
      .returning();
    return updated;
  } else {
    const [created] = await db
      .insert(studentSharingPermissions)
      .values({
        id: `perm_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        studentUserId,
        mentorUserId,
        sharedAccountIds: permissions.sharedAccountIds || [],
        canViewAccountOverview: permissions.canViewAccountOverview ?? true,
        canViewTrades: permissions.canViewTrades ?? true,
        canViewAnalytics: permissions.canViewAnalytics ?? true,
        canViewEquityCurve: permissions.canViewEquityCurve ?? true,
        canViewDrawdown: permissions.canViewDrawdown ?? true,
        canViewPlaybooks: permissions.canViewPlaybooks ?? false,
        canViewNotes: permissions.canViewNotes ?? false,
        canViewRiskControls: permissions.canViewRiskControls ?? false,
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    return created;
  }
}

export async function getStudentDetailsForMentor(mentorUserId: string, studentUserId: string) {
  // Check active relationship
  const rels = await db
    .select()
    .from(mentorStudentRelationships)
    .where(
      and(
        eq(mentorStudentRelationships.mentorUserId, mentorUserId),
        eq(mentorStudentRelationships.studentUserId, studentUserId),
        or(
          eq(mentorStudentRelationships.status, 'APPROVED'),
          eq(mentorStudentRelationships.status, 'ACTIVE')
        )
      )
    )
    .limit(1);

  if (rels.length === 0) {
    throw new Error('Unauthorized: You do not have permission to view this student\'s data.');
  }

  const perms = await getStudentSharingPermissions(studentUserId, mentorUserId);
  const studentProfile = await getUserProfile(studentUserId);
  const allAccounts = await getTradingAccounts(studentUserId);

  // Filter accounts if student selected specific shared account IDs
  const sharedAccounts = perms.sharedAccountIds && perms.sharedAccountIds.length > 0
    ? allAccounts.filter((a) => perms.sharedAccountIds.includes(a.id))
    : allAccounts;

  const sharedAccountIdsSet = new Set(sharedAccounts.map((a) => a.id));

  // Fetch student trades for shared accounts
  const allTrades = await getTrades(studentUserId);
  const filteredTrades = perms.canViewTrades
    ? (sharedAccountIdsSet.size > 0 ? allTrades.filter((t) => sharedAccountIdsSet.has(t.accountId)) : allTrades)
    : [];

  // Overview metrics
  let overview = null;
  if (perms.canViewAccountOverview) {
    const totalBalance = sharedAccounts.reduce((sum, a) => sum + (a.currentBalance || 0), 0);
    const initialBalance = sharedAccounts.reduce((sum, a) => sum + (a.initialBalance || 10000), 0);
    const netPnl = filteredTrades.reduce((sum, t) => sum + (t.netPnl || 0), 0);
    const currentEquity = totalBalance + netPnl;

    overview = {
      totalBalance,
      initialBalance,
      currentEquity,
      netPnl,
      overallPnlPercent: initialBalance > 0 ? ((netPnl / initialBalance) * 100).toFixed(2) : '0.00',
      accountCount: sharedAccounts.length,
    };
  }

  // Performance analytics
  let performance = null;
  if (perms.canViewAnalytics || perms.canViewTrades) {
    const totalTrades = filteredTrades.length;
    const wins = filteredTrades.filter((t) => (t.netPnl || 0) > 0);
    const losses = filteredTrades.filter((t) => (t.netPnl || 0) < 0);
    const winRate = totalTrades > 0 ? Math.round((wins.length / totalTrades) * 100) : 0;

    const totalGain = wins.reduce((sum, t) => sum + (t.netPnl || 0), 0);
    const totalLoss = Math.abs(losses.reduce((sum, t) => sum + (t.netPnl || 0), 0));
    const profitFactor = totalLoss > 0 ? (totalGain / totalLoss).toFixed(2) : totalGain > 0 ? '999.00' : '0.00';

    const avgWin = wins.length > 0 ? totalGain / wins.length : 0;
    const avgLoss = losses.length > 0 ? totalLoss / losses.length : 0;
    const avgR = totalTrades > 0 ? (filteredTrades.reduce((sum, t) => sum + (t.rMultiple || 0), 0) / totalTrades).toFixed(2) : '0.00';

    performance = {
      totalTrades,
      winningTrades: wins.length,
      losingTrades: losses.length,
      winRate,
      profitFactor,
      avgWin,
      avgLoss,
      avgR,
    };
  }

  // Optional modules
  const playbooks = perms.canViewPlaybooks ? await getPlaybooks(studentUserId) : [];
  const notes = perms.canViewNotes ? await getJournalNotes(studentUserId) : [];
  const riskGoals = perms.canViewRiskControls ? await getRiskGoals(studentUserId) : null;

  return {
    studentProfile: {
      id: studentProfile?.id || studentUserId,
      displayName: studentProfile?.fullName || 'Student Trader',
      accountCode: studentProfile?.accountCode || 'TF-MTR-UNKNOWN',
      avatarUrl: studentProfile?.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80',
    },
    permissions: perms,
    sharedAccounts,
    overview,
    performance,
    trades: filteredTrades,
    playbooks,
    notes,
    riskGoals,
  };
}

export async function disconnectMentorStudentRelationship(userId: string, targetUserId: string) {
  await db
    .delete(mentorStudentRelationships)
    .where(
      or(
        and(
          eq(mentorStudentRelationships.mentorUserId, userId),
          eq(mentorStudentRelationships.studentUserId, targetUserId)
        ),
        and(
          eq(mentorStudentRelationships.studentUserId, userId),
          eq(mentorStudentRelationships.mentorUserId, targetUserId)
        )
      )
    );

  // Also remove from legacy mentorStudents
  const legacyId1 = `ms_${userId}_${targetUserId}`;
  const legacyId2 = `ms_${targetUserId}_${userId}`;
  await db.delete(mentorStudents).where(or(eq(mentorStudents.id, legacyId1), eq(mentorStudents.id, legacyId2)));

  return true;
}

// Prop Firm Accounts CRUD
export async function getPropFirmAccounts(userId: string): Promise<PropFirmAccount[]> {
  try {
    const rows = await db
      .select()
      .from(propFirmAccounts)
      .where(eq(propFirmAccounts.userId, userId))
      .orderBy(desc(propFirmAccounts.createdAt));

    return rows.map((r: any) => ({
      id: r.id,
      name: r.name,
      firmName: r.firmName,
      tradingBrand: r.tradingBrand || undefined,
      legalEntity: r.legalEntity || undefined,
      registrationNumber: r.registrationNumber || undefined,
      jurisdiction: r.jurisdiction || undefined,
      termsEffectiveDate: r.termsEffectiveDate || undefined,
      rulesVersion: r.rulesVersion || undefined,
      accountNumber: r.accountNumber || undefined,
      accountSize: r.accountSize ?? r.startingBalance,
      startingBalance: r.startingBalance,
      currentBalance: r.currentBalance,
      equity: r.equity,
      highWaterMark: r.highWaterMark ?? undefined,
      currency: r.currency || 'USD',
      programModel: r.programModel || 'TWO_STEP',
      phases: Array.isArray(r.phases) ? r.phases : [],
      activePhaseIndex: r.activePhaseIndex ?? 0,
      phase: r.phase || 'PHASE_1',
      phaseName: r.phaseName || undefined,
      status: r.status || 'ACTIVE',
      riskState: r.riskState || 'SAFE',
      enforcementMode: r.enforcementMode || 'MONITOR',
      drawdownModel: r.drawdownModel || 'STATIC',
      dailyDrawdownModel: r.dailyDrawdownModel || 'START_OF_DAY_BALANCE',
      dailyLossMethod: r.dailyLossMethod || 'REALIZED_ONLY',
      maxRiskPerSymbolPercent: r.maxRiskPerSymbolPercent ?? undefined,
      minTradeDurationSec: r.minTradeDurationSec ?? undefined,
      avgTradeDurationSec: r.avgTradeDurationSec ?? undefined,
      minTradingDays: r.minTradingDays ?? 0,
      maxTradingDays: r.maxTradingDays ?? 0,
      startDate: r.startDate || undefined,
      deadline: r.deadline || undefined,
      qualifyingDayProfitPercent: r.qualifyingDayProfitPercent ?? undefined,
      profitTargetPercent: r.profitTargetPercent ?? undefined,
      dailyLossPercent: r.dailyLossPercent ?? undefined,
      totalLossPercent: r.totalLossPercent ?? undefined,
      profitTargetAmount: r.profitTargetAmount ?? undefined,
      dailyLossAmount: r.dailyLossAmount ?? undefined,
      totalLossAmount: r.totalLossAmount ?? undefined,
      consistencyMaxDayPercent: r.consistencyMaxDayPercent ?? undefined,
      maxProfitConcentrationPercent: r.maxProfitConcentrationPercent ?? undefined,
      newsTradingAllowed: r.newsTradingAllowed || 'ALLOWED',
      weekendHoldingAllowed: r.weekendHoldingAllowed ?? true,
      overnightHoldingAllowed: r.overnightHoldingAllowed ?? true,
      eaAllowed: r.eaAllowed || 'ALLOWED',
      copyTradingAllowed: r.copyTradingAllowed || 'ALLOWED',
      hedgingAllowed: r.hedgingAllowed || 'ALLOWED',
      maxLotSize: r.maxLotSize ?? undefined,
      minLotSize: r.minLotSize ?? undefined,
      maxPositions: r.maxPositions ?? undefined,
      maxLeverage: r.maxLeverage ?? 100,
      ipRestrictions: r.ipRestrictions || {},
      prohibitedStrategies: Array.isArray(r.prohibitedStrategies) ? r.prohibitedStrategies : [],
      rewardBufferPercent: r.rewardBufferPercent ?? undefined,
      rewardSplitPercent: r.rewardSplitPercent ?? 80,
      profitSplitTraderPercent: r.profitSplitTraderPercent ?? 80,
      profitSplitFirmPercent: r.profitSplitFirmPercent ?? 20,
      minRewardRequest: r.minRewardRequest ?? undefined,
      payoutFrequency: r.payoutFrequency || 'BIWEEKLY',
      activationFee: r.activationFee ?? undefined,
      inactivityMaxDays: r.inactivityMaxDays ?? 30,
      newsWindowMinutes: r.newsWindowMinutes ?? 5,
      sessionTimezone: r.sessionTimezone || 'America/New_York',
      scalingRules: r.scalingRules || {},
      rules: Array.isArray(r.rules) ? r.rules : [],
      violations: Array.isArray(r.violations) ? r.violations : [],
      timeline: Array.isArray(r.timeline) ? r.timeline : [],
      payoutInfo: r.payoutInfo || {},
      tradingAccountLink: r.tradingAccountLink || undefined,
      notes: r.notes || undefined,
      createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : new Date().toISOString(),
      updatedAt: r.updatedAt ? new Date(r.updatedAt).toISOString() : undefined,
    }));
  } catch (error) {
    console.error('getPropFirmAccounts error:', error);
    return [];
  }
}

export async function savePropFirmAccount(userId: string, account: PropFirmAccount): Promise<PropFirmAccount> {
  try {
    const existing = await db
      .select({ id: propFirmAccounts.id, owner: propFirmAccounts.userId })
      .from(propFirmAccounts)
      .where(eq(propFirmAccounts.id, account.id));

    const now = new Date();

    const dbValues = {
      id: account.id,
      userId,
      name: account.name,
      firmName: account.firmName,
      tradingBrand: account.tradingBrand || null,
      legalEntity: account.legalEntity || null,
      registrationNumber: account.registrationNumber || null,
      jurisdiction: account.jurisdiction || null,
      termsEffectiveDate: account.termsEffectiveDate || null,
      rulesVersion: account.rulesVersion || null,
      accountNumber: account.accountNumber || null,
      accountSize: account.accountSize ?? account.startingBalance,
      startingBalance: account.startingBalance,
      currentBalance: account.currentBalance,
      equity: account.equity,
      highWaterMark: account.highWaterMark ?? null,
      currency: account.currency || 'USD',
      programModel: account.programModel || 'TWO_STEP',
      phases: account.phases || [],
      activePhaseIndex: account.activePhaseIndex ?? 0,
      phase: account.phase || 'PHASE_1',
      phaseName: account.phaseName || null,
      status: account.status || 'ACTIVE',
      riskState: account.riskState || 'SAFE',
      enforcementMode: account.enforcementMode || 'MONITOR',
      drawdownModel: account.drawdownModel || 'STATIC',
      dailyDrawdownModel: account.dailyDrawdownModel || 'START_OF_DAY_BALANCE',
      dailyLossMethod: account.dailyLossMethod || 'REALIZED_ONLY',
      maxRiskPerSymbolPercent: account.maxRiskPerSymbolPercent ?? null,
      minTradeDurationSec: account.minTradeDurationSec ?? null,
      avgTradeDurationSec: account.avgTradeDurationSec ?? null,
      minTradingDays: account.minTradingDays ?? 0,
      maxTradingDays: account.maxTradingDays ?? 0,
      startDate: account.startDate || null,
      deadline: account.deadline || null,
      qualifyingDayProfitPercent: account.qualifyingDayProfitPercent ?? null,
      profitTargetPercent: account.profitTargetPercent ?? null,
      dailyLossPercent: account.dailyLossPercent ?? null,
      totalLossPercent: account.totalLossPercent ?? null,
      profitTargetAmount: account.profitTargetAmount ?? null,
      dailyLossAmount: account.dailyLossAmount ?? null,
      totalLossAmount: account.totalLossAmount ?? null,
      consistencyMaxDayPercent: account.consistencyMaxDayPercent ?? null,
      maxProfitConcentrationPercent: account.maxProfitConcentrationPercent ?? null,
      newsTradingAllowed: account.newsTradingAllowed || 'ALLOWED',
      weekendHoldingAllowed: account.weekendHoldingAllowed ?? true,
      overnightHoldingAllowed: account.overnightHoldingAllowed ?? true,
      eaAllowed: account.eaAllowed || 'ALLOWED',
      copyTradingAllowed: account.copyTradingAllowed || 'ALLOWED',
      hedgingAllowed: account.hedgingAllowed || 'ALLOWED',
      maxLotSize: account.maxLotSize ?? null,
      minLotSize: account.minLotSize ?? null,
      maxPositions: account.maxPositions ?? null,
      maxLeverage: account.maxLeverage ?? 100,
      ipRestrictions: account.ipRestrictions || {},
      prohibitedStrategies: account.prohibitedStrategies || [],
      rewardBufferPercent: account.rewardBufferPercent ?? null,
      rewardSplitPercent: account.rewardSplitPercent ?? 80,
      profitSplitTraderPercent: account.profitSplitTraderPercent ?? 80,
      profitSplitFirmPercent: account.profitSplitFirmPercent ?? 20,
      minRewardRequest: account.minRewardRequest ?? null,
      payoutFrequency: account.payoutFrequency || 'BIWEEKLY',
      activationFee: account.activationFee ?? null,
      inactivityMaxDays: account.inactivityMaxDays ?? 30,
      newsWindowMinutes: account.newsWindowMinutes ?? 5,
      sessionTimezone: account.sessionTimezone || 'America/New_York',
      scalingRules: account.scalingRules || {},
      rules: account.rules || [],
      violations: account.violations || [],
      timeline: account.timeline || [],
      payoutInfo: account.payoutInfo || {},
      tradingAccountLink: account.tradingAccountLink || null,
      notes: account.notes || null,
      updatedAt: now,
    };

    if (existing.length > 0) {
      if (existing[0].owner !== userId) {
        throw new Error('Forbidden: Prop firm account belongs to another user');
      }
      await db
        .update(propFirmAccounts)
        .set(dbValues)
        .where(eq(propFirmAccounts.id, account.id));
    } else {
      await db
        .insert(propFirmAccounts)
        .values({
          ...dbValues,
          createdAt: account.createdAt ? new Date(account.createdAt) : now,
        });
    }

    return account;
  } catch (error) {
    console.error('savePropFirmAccount error:', error);
    throw error;
  }
}

export async function deletePropFirmAccount(userId: string, accountId: string): Promise<boolean> {
  try {
    const existing = await db
      .select({ owner: propFirmAccounts.userId })
      .from(propFirmAccounts)
      .where(eq(propFirmAccounts.id, accountId));

    if (existing.length === 0) return true;
    if (existing[0].owner !== userId) {
      throw new Error('Forbidden: Prop firm account belongs to another user');
    }

    await db.delete(propFirmAccounts).where(eq(propFirmAccounts.id, accountId));
    return true;
  } catch (error) {
    console.error('deletePropFirmAccount error:', error);
    throw error;
  }
}

// ---------------------------------------------------------------------------
// DEFAULT SETTINGS GENERATOR
// ---------------------------------------------------------------------------
export function getDefaultUserSettings(userId: string, accountId?: string): UserSettings {
  return {
    id: accountId ? `set_${userId}_${accountId}` : `set_${userId}`,
    userId,
    accountId,
    scope: accountId ? 'ACCOUNT' : 'GLOBAL',
    general: {
      theme: 'dark',
      accentColor: '#3B82F6',
      density: 'comfortable',
      chartAnimations: true,
      reducedMotion: false,
      currency: 'USD',
      currencyMode: 'USD',
      numberFormat: 'en-US',
      decimalPrecision: 2,
      percentagePrecision: 2,
      roundingBehavior: 'round',
      timezone: 'America/New_York',
      dateFormat: 'YYYY-MM-DD',
      timeFormat: '12h',
      firstDayOfWeek: 'Sunday',
      calendarTimezone: 'America/New_York',
      sessionTimezone: 'America/New_York',
    },
    notifications: {
      tradeAlerts: true,
      riskAlerts: true,
      propFirmWarnings: true,
      syncNotifications: true,
      dailyJournalReminder: true,
      weeklyPerformanceReview: true,
      soundEnabled: true,
    },
    aiSettings: {
      aiCoachEnabled: true,
      responseStyle: 'institutional',
      analysisScope: 'all',
      autoReviewTrades: true,
    },
    tradeDefaults: {
      defaultAccountId: '',
      defaultMarket: 'Futures',
      defaultDirection: 'BUY',
      defaultOrderType: 'MARKET',
      defaultQuantity: 1,
      defaultRiskValue: 1.0,
      defaultRiskUnit: 'PERCENT',
      defaultStopLossBehavior: 'POINTS',
      defaultTakeProfitBehavior: 'R_TARGET',
      defaultRTarget: 2.0,
      maxPlannedRisk: 500,
      defaultSetup: 'Opening Drive',
      defaultPlaybookId: '',
      defaultSession: 'New York',
      defaultStatus: 'CLOSED',
      requireSetup: false,
      requireStopLoss: false,
      requireTakeProfit: false,
      requireNotes: false,
      requireScreenshot: false,
      requireMistakeOnLoss: false,
      allowPartialExits: true,
      allowMultipleEntries: true,
      allowMultipleExits: true,
      trackCommissions: true,
      trackSwapFees: true,
      trackSlippage: false,
      defaultTableColumns: ['date', 'symbol', 'direction', 'market', 'entryPrice', 'exitPrice', 'netPnl', 'rMultiple', 'status'],
      defaultTradeSort: 'date_desc',
    },
    commissionRules: [
      {
        id: 'cr-default-futures',
        account: 'ALL',
        instrument: 'Futures',
        symbol: 'ALL',
        mode: 'Per Contract',
        apply: 'Round-Trip',
        commission: 2.50,
        exchangeFee: 1.25,
        clearingFee: 0.20,
        platformFee: 0.50,
        otherFee: 0,
      },
      {
        id: 'cr-default-forex',
        account: 'ALL',
        instrument: 'Forex',
        symbol: 'ALL',
        mode: 'Per Lot',
        apply: 'Round-Trip',
        commission: 3.50,
        exchangeFee: 0,
        clearingFee: 0,
        platformFee: 0,
        otherFee: 0,
      },
      {
        id: 'cr-default-stocks',
        account: 'ALL',
        instrument: 'Stocks',
        symbol: 'ALL',
        mode: 'Per Share',
        apply: 'Both Sides',
        commission: 0.005,
        exchangeFee: 0.001,
        clearingFee: 0.0005,
        platformFee: 0,
        otherFee: 0,
      },
      {
        id: 'cr-default-crypto',
        account: 'ALL',
        instrument: 'Crypto',
        symbol: 'ALL',
        mode: 'Percentage',
        apply: 'Both Sides',
        commission: 0.05,
        exchangeFee: 0,
        clearingFee: 0,
        platformFee: 0,
        otherFee: 0,
      },
    ],
    profile: {
      bio: 'Quantitative price action trader specializing in index futures and momentum breakouts.',
      country: 'United States',
      professionalTitle: 'Independent Prop Trader',
      phone: '',
      tradingStyle: 'Day Trader',
    },
  };
}

// ---------------------------------------------------------------------------
// USER SETTINGS REPOSITORY
// ---------------------------------------------------------------------------
export async function getUserSettings(userId: string, accountId?: string): Promise<UserSettings> {
  await ensureLoungeTables();
  try {
    const id = accountId ? `set_${userId}_${accountId}` : `set_${userId}`;
    const found = await db.select().from(userSettings).where(eq(userSettings.id, id)).limit(1);

    if (found.length > 0) {
      const row = found[0];
      const defaults = getDefaultUserSettings(userId, accountId);
      return {
        id: row.id,
        userId: row.userId,
        accountId: row.accountId || undefined,
        scope: (row.scope as 'GLOBAL' | 'ACCOUNT') || 'GLOBAL',
        general: { ...defaults.general, ...(row.general as any) },
        notifications: { ...defaults.notifications, ...(row.notifications as any) },
        aiSettings: { ...defaults.aiSettings, ...(row.aiSettings as any) },
        tradeDefaults: { ...defaults.tradeDefaults, ...(row.tradeDefaults as any) },
        commissionRules: Array.isArray(row.commissionRules) && row.commissionRules.length > 0
          ? (row.commissionRules as any)
          : defaults.commissionRules,
        profile: { ...defaults.profile, ...(row.profile as any) },
        updatedAt: row.updatedAt ? row.updatedAt.toISOString() : undefined,
      };
    }

    // If account-specific setting not found, fallback to global
    if (accountId) {
      return getUserSettings(userId);
    }

    // Return defaults if none created yet
    return getDefaultUserSettings(userId);
  } catch (error) {
    console.warn('getUserSettings warning, returning defaults:', error);
    return getDefaultUserSettings(userId, accountId);
  }
}

export async function saveUserSettings(userId: string, settings: UserSettings, accountId?: string): Promise<UserSettings> {
  await ensureLoungeTables();
  try {
    const targetId = accountId ? `set_${userId}_${accountId}` : `set_${userId}`;
    const scope = accountId ? 'ACCOUNT' : 'GLOBAL';

    const existing = await db.select().from(userSettings).where(eq(userSettings.id, targetId)).limit(1);

    if (existing.length > 0) {
      await db
        .update(userSettings)
        .set({
          general: settings.general as any,
          notifications: settings.notifications as any,
          aiSettings: settings.aiSettings as any,
          tradeDefaults: settings.tradeDefaults as any,
          commissionRules: settings.commissionRules as any,
          profile: settings.profile as any,
          updatedAt: new Date(),
        })
        .where(eq(userSettings.id, targetId));
    } else {
      await db.insert(userSettings).values({
        id: targetId,
        userId,
        accountId: accountId || null,
        scope,
        general: settings.general as any,
        notifications: settings.notifications as any,
        aiSettings: settings.aiSettings as any,
        tradeDefaults: settings.tradeDefaults as any,
        commissionRules: settings.commissionRules as any,
        profile: settings.profile as any,
      });
    }

    return {
      ...settings,
      id: targetId,
      userId,
      accountId,
      scope,
      updatedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error('saveUserSettings error:', error);
    throw error;
  }
}

// ---------------------------------------------------------------------------
// DEFAULT TAGS GENERATOR & REPOSITORY
// ---------------------------------------------------------------------------
const DEFAULT_SYSTEM_TAGS: Array<Omit<CustomTag, 'id' | 'createdAt'>> = [
  { name: 'A+ Setup', category: 'Setup', color: '#10B981', description: 'Optimal execution matching all playbook rules perfectly' },
  { name: 'Opening Drive', category: 'Setup', color: '#3B82F6', description: 'Aggressive opening bell market auction trend' },
  { name: 'Revenge Trading', category: 'Mistake', color: '#EF4444', description: 'Impulsive entry following a loss without a valid signal' },
  { name: 'FOMO', category: 'Psychology', color: '#F59E0B', description: 'Fear of missing out on rapid price movement' },
  { name: 'Breakout', category: 'Market', color: '#8B5CF6', description: 'Key support/resistance level expansion' },
  { name: 'Early Exit', category: 'Execution', color: '#EC4899', description: 'Closed position prematurely prior to target' },
  { name: 'Moved Stop', category: 'Mistake', color: '#DC2626', description: 'Violated risk parameters by shifting stop loss further' },
  { name: 'Disciplined', category: 'Psychology', color: '#06B6D4', description: 'Flawless mental focus and rule compliance' },
  { name: 'Clean Trend', category: 'Market', color: '#14B8A6', description: 'Clear directional sequence of higher highs/lower lows' },
  { name: 'News Volatility', category: 'Market', color: '#6366F1', description: 'CPI, FOMC, or economic report catalyst' },
];

export async function getCustomTags(userId: string): Promise<CustomTag[]> {
  await ensureLoungeTables();
  try {
    const rows = await db
      .select()
      .from(customTags)
      .where(eq(customTags.userId, userId))
      .orderBy(desc(customTags.createdAt));

    if (rows.length === 0) {
      // Seed initial default tags for new user
      const initialTags: CustomTag[] = [];
      for (let i = 0; i < DEFAULT_SYSTEM_TAGS.length; i++) {
        const item = DEFAULT_SYSTEM_TAGS[i];
        const tag: CustomTag = {
          id: `tag-${userId.replace(/[^a-zA-Z0-9]/g, '')}-${i + 1}`,
          name: item.name,
          category: item.category,
          color: item.color,
          description: item.description,
          isArchived: false,
          createdAt: new Date(Date.now() - (DEFAULT_SYSTEM_TAGS.length - i) * 60000).toISOString(),
        };
        try {
          await db.insert(customTags).values({
            id: tag.id,
            userId,
            name: tag.name,
            category: tag.category,
            color: tag.color,
            description: tag.description,
            isArchived: false,
          });
          initialTags.push(tag);
        } catch {
          // ignore duplicate insert errors
        }
      }
      return initialTags;
    }

    return rows.map(r => ({
      id: r.id,
      name: r.name,
      category: r.category as any,
      color: r.color,
      description: r.description || undefined,
      isArchived: r.isArchived,
      createdAt: r.createdAt ? r.createdAt.toISOString() : new Date().toISOString(),
      updatedAt: r.updatedAt ? r.updatedAt.toISOString() : undefined,
    }));
  } catch (error) {
    console.warn('getCustomTags error, returning fallback:', error);
    return DEFAULT_SYSTEM_TAGS.map((t, idx) => ({
      id: `tag-fallback-${idx}`,
      ...t,
      isArchived: false,
      createdAt: new Date().toISOString(),
    }));
  }
}

export async function saveCustomTag(userId: string, tag: CustomTag): Promise<CustomTag> {
  await ensureLoungeTables();
  try {
    const existing = await db.select().from(customTags).where(eq(customTags.id, tag.id)).limit(1);

    if (existing.length > 0) {
      if (existing[0].userId !== userId) {
        throw new Error('Forbidden: Tag belongs to another user');
      }
      await db
        .update(customTags)
        .set({
          name: tag.name.trim(),
          category: tag.category,
          color: tag.color,
          description: tag.description || '',
          isArchived: !!tag.isArchived,
          updatedAt: new Date(),
        })
        .where(eq(customTags.id, tag.id));
    } else {
      await db.insert(customTags).values({
        id: tag.id || `tag-${Date.now()}`,
        userId,
        name: tag.name.trim(),
        category: tag.category,
        color: tag.color,
        description: tag.description || '',
        isArchived: !!tag.isArchived,
      });
    }

    return tag;
  } catch (error) {
    console.error('saveCustomTag error:', error);
    throw error;
  }
}

export async function deleteCustomTag(userId: string, tagId: string): Promise<boolean> {
  await ensureLoungeTables();
  try {
    const existing = await db.select().from(customTags).where(eq(customTags.id, tagId)).limit(1);
    if (existing.length === 0) return true;
    if (existing[0].userId !== userId) {
      throw new Error('Forbidden: Tag belongs to another user');
    }
    await db.delete(customTags).where(eq(customTags.id, tagId));
    return true;
  } catch (error) {
    console.error('deleteCustomTag error:', error);
    throw error;
  }
}

// ---------------------------------------------------------------------------
// IMPORT HISTORY REPOSITORY
// ---------------------------------------------------------------------------
export async function getImportHistory(userId: string): Promise<ImportHistoryItem[]> {
  await ensureLoungeTables();
  try {
    const rows = await db
      .select()
      .from(importHistory)
      .where(eq(importHistory.userId, userId))
      .orderBy(desc(importHistory.createdAt));

    return rows.map(r => ({
      id: r.id,
      source: (r.source as any) || 'CSV',
      fileName: r.fileName,
      tradesProcessed: r.tradesProcessed,
      tradesAdded: r.tradesAdded,
      duplicatesCount: r.duplicatesCount,
      errorsCount: r.errorsCount,
      status: (r.status as any) || 'COMPLETED',
      details: (r.details as any) || {},
      createdAt: r.createdAt ? r.createdAt.toISOString() : new Date().toISOString(),
    }));
  } catch (error) {
    console.warn('getImportHistory error:', error);
    return [];
  }
}

export async function recordImportHistory(userId: string, item: ImportHistoryItem): Promise<ImportHistoryItem> {
  await ensureLoungeTables();
  try {
    await db.insert(importHistory).values({
      id: item.id || `imp-${Date.now()}`,
      userId,
      source: item.source || 'CSV',
      fileName: item.fileName,
      tradesProcessed: item.tradesProcessed || 0,
      tradesAdded: item.tradesAdded || 0,
      duplicatesCount: item.duplicatesCount || 0,
      errorsCount: item.errorsCount || 0,
      status: item.status || 'COMPLETED',
      details: item.details || {},
    });
    return item;
  } catch (error) {
    console.error('recordImportHistory error:', error);
    throw error;
  }
}

// ---------------------------------------------------------------------------
// ACTIVITY / AUDIT LOGS REPOSITORY
// ---------------------------------------------------------------------------
export async function getActivityLogs(userId: string, limit = 100): Promise<ActivityLogItem[]> {
  await ensureLoungeTables();
  try {
    const rows = await db
      .select()
      .from(activityLogs)
      .where(eq(activityLogs.userId, userId))
      .orderBy(desc(activityLogs.createdAt))
      .limit(limit);

    return rows.map(r => ({
      id: r.id,
      action: r.action,
      category: (r.category as any) || 'SYSTEM',
      object: r.object,
      status: (r.status as any) || 'SUCCESS',
      source: r.source || 'Web Client',
      details: (r.details as any) || {},
      createdAt: r.createdAt ? r.createdAt.toISOString() : new Date().toISOString(),
    }));
  } catch (error) {
    console.warn('getActivityLogs error:', error);
    return [];
  }
}

export async function recordActivityLog(userId: string, item: Omit<ActivityLogItem, 'id' | 'createdAt'> & { id?: string }): Promise<ActivityLogItem> {
  await ensureLoungeTables();
  try {
    const id = item.id || `act-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const fullItem: ActivityLogItem = {
      id,
      action: item.action,
      category: item.category,
      object: item.object,
      status: item.status,
      source: item.source || 'Web Client',
      details: item.details || {},
      createdAt: new Date().toISOString(),
    };

    await db.insert(activityLogs).values({
      id,
      userId,
      action: fullItem.action,
      category: fullItem.category,
      object: fullItem.object,
      status: fullItem.status,
      source: fullItem.source,
      details: fullItem.details,
    });

    return fullItem;
  } catch (error) {
    console.warn('recordActivityLog warning:', error);
    return {
      id: `act-${Date.now()}`,
      ...item,
      createdAt: new Date().toISOString(),
    };
  }
}

// ---------------------------------------------------------------------------
// USER BACKUPS REPOSITORY
// ---------------------------------------------------------------------------
export async function getUserBackups(userId: string): Promise<UserBackup[]> {
  await ensureLoungeTables();
  try {
    const rows = await db
      .select()
      .from(userBackups)
      .where(eq(userBackups.userId, userId))
      .orderBy(desc(userBackups.createdAt));

    return rows.map(r => ({
      id: r.id,
      name: r.name,
      sizeBytes: r.sizeBytes,
      tradeCount: r.tradeCount,
      notesCount: r.notesCount,
      backupData: r.backupData,
      createdAt: r.createdAt ? r.createdAt.toISOString() : new Date().toISOString(),
    }));
  } catch (error) {
    console.warn('getUserBackups error:', error);
    return [];
  }
}

export async function saveUserBackup(userId: string, backup: UserBackup): Promise<UserBackup> {
  await ensureLoungeTables();
  try {
    await db.insert(userBackups).values({
      id: backup.id || `bak-${Date.now()}`,
      userId,
      name: backup.name,
      sizeBytes: backup.sizeBytes,
      tradeCount: backup.tradeCount,
      notesCount: backup.notesCount,
      backupData: backup.backupData || {},
    });
    return backup;
  } catch (error) {
    console.error('saveUserBackup error:', error);
    throw error;
  }
}

export async function deleteUserBackup(userId: string, backupId: string): Promise<boolean> {
  await ensureLoungeTables();
  try {
    const existing = await db.select().from(userBackups).where(eq(userBackups.id, backupId)).limit(1);
    if (existing.length === 0) return true;
    if (existing[0].userId !== userId) {
      throw new Error('Forbidden: Backup belongs to another user');
    }
    await db.delete(userBackups).where(eq(userBackups.id, backupId));
    return true;
  } catch (error) {
    console.error('deleteUserBackup error:', error);
    throw error;
  }
}

// ---------------------------------------------------------------------------
// DATA RESET REPOSITORY (STRICT CONFIRMATION GUARD)
// ---------------------------------------------------------------------------
export async function resetUserData(
  userId: string,
  options: {
    deleteTrades?: boolean;
    deleteJournal?: boolean;
    resetSettings?: boolean;
    wipeAll?: boolean;
  }
): Promise<{ success: boolean; message: string }> {
  await ensureLoungeTables();
  try {
    if (options.wipeAll) {
      await db.delete(trades).where(eq(trades.userId, userId));
      await db.delete(journalNotes).where(eq(journalNotes.userId, userId));
      await db.delete(journalFolders).where(eq(journalFolders.userId, userId));
      await db.delete(playbooks).where(eq(playbooks.userId, userId));
      await db.delete(strategies).where(eq(strategies.userId, userId));
      await db.delete(userSettings).where(eq(userSettings.userId, userId));
      await db.delete(customTags).where(eq(customTags.userId, userId));
      await db.delete(importHistory).where(eq(importHistory.userId, userId));
      await db.delete(userBackups).where(eq(userBackups.userId, userId));

      await recordActivityLog(userId, {
        action: 'Wipe All Workspace Data',
        category: 'DATA',
        object: 'Workspace Data',
        status: 'WARNING',
        source: 'Web Client',
        details: { resetType: 'FULL_WIPE' },
      });

      return { success: true, message: 'All workspace data wiped successfully' };
    }

    if (options.deleteTrades) {
      await db.delete(trades).where(eq(trades.userId, userId));
      await recordActivityLog(userId, {
        action: 'Delete All Trades',
        category: 'TRADE',
        object: 'All Trades',
        status: 'WARNING',
        source: 'Web Client',
      });
    }

    if (options.deleteJournal) {
      await db.delete(journalNotes).where(eq(journalNotes.userId, userId));
      await recordActivityLog(userId, {
        action: 'Delete All Journal Notes',
        category: 'JOURNAL',
        object: 'All Notes',
        status: 'WARNING',
        source: 'Web Client',
      });
    }

    if (options.resetSettings) {
      await db.delete(userSettings).where(eq(userSettings.userId, userId));
      await recordActivityLog(userId, {
        action: 'Reset Settings to Defaults',
        category: 'SETTINGS',
        object: 'Platform Settings',
        status: 'INFO',
        source: 'Web Client',
      });
    }

    return { success: true, message: 'Data reset operation completed' };
  } catch (error) {
    console.error('resetUserData error:', error);
    throw error;
  }
}






