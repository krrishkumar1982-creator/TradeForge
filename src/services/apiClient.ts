import { supabase } from '../lib/supabase';
import {
  Trade,
  TradingAccount,
  Playbook,
  Strategy,
  JournalNote,
  JournalFolder,
  RiskGoalSettings,
  AppNotification,
  CommunityPost,
  MentorStudent,
  PropFirmAccount,
  UserSettings,
  CustomTag,
  ImportHistoryItem,
  ActivityLogItem,
  UserBackup,
} from '../types';
import {
  fetchProfileFromSupabase,
  upsertProfileToSupabase,
  fetchAccountsFromSupabase,
  upsertAccountToSupabase,
  deleteAccountFromSupabase,
  fetchTradesFromSupabase,
  insertTradeToSupabase,
  updateTradeInSupabase,
  deleteTradeFromSupabase,
  bulkDeleteTradesFromSupabase,
  bulkEditTradesInSupabase,
  fetchPropFirmAccountsFromSupabase,
  upsertPropFirmAccountToSupabase,
  deletePropFirmAccountFromSupabase,
  fetchPlaybooksFromSupabase,
  upsertPlaybookToSupabase,
  deletePlaybookFromSupabase,
  fetchStrategiesFromSupabase,
  upsertStrategyToSupabase,
  deleteStrategyFromSupabase,
  fetchJournalNotesFromSupabase,
  upsertJournalNoteToSupabase,
  deleteJournalNoteFromSupabase,
  softDeleteJournalNoteInSupabase,
  restoreJournalNoteInSupabase,
  fetchJournalFoldersFromSupabase,
  upsertJournalFolderToSupabase,
  deleteJournalFolderFromSupabase,
  softDeleteJournalFolderInSupabase,
  restoreJournalFolderInSupabase,
  purgeExpiredTrashFromSupabase,
  fetchRiskGoalsFromSupabase,
  upsertRiskGoalsToSupabase,
  fetchUserSettingsFromSupabase,
  upsertUserSettingsToSupabase,
  fetchCustomTagsFromSupabase,
  insertCustomTagToSupabase,
  deleteCustomTagFromSupabase,
  fetchBacktestSessionsFromSupabase,
  upsertBacktestSessionToSupabase,
  fetchNotificationsFromSupabase,
  markNotificationReadInSupabase,
  clearAllNotificationsInSupabase,
} from './supabaseDataService';

export async function getCurrentUserId(): Promise<string> {
  try {
    const { data } = await supabase.auth.getSession();
    if (data?.session?.user?.id) {
      try {
        localStorage.setItem('tradeforge_user_id', data.session.user.id);
      } catch {}
      return data.session.user.id;
    }
  } catch {}

  try {
    const stored = localStorage.getItem('tradeforge_user_id');
    if (stored) return stored;
  } catch {}

  try {
    const demoRaw = localStorage.getItem('tf_demo_session');
    if (demoRaw) {
      const parsed = JSON.parse(demoRaw);
      if (parsed?.user?.id) return parsed.user.id;
    }
  } catch {}

  return 'default_user_1';
}

const MIGRATION_KEY = 'duskflow_cloudsql_migrated_v1';

let currentIdToken: string | null = null;

export function setApiAuthToken(token: string | null) {
  currentIdToken = token;
}

async function getAuthHeaders(headers: Record<string, string> = {}): Promise<Record<string, string>> {
  const merged: Record<string, string> = { ...headers };
  try {
    const { data } = await supabase.auth.getSession();
    if (data?.session?.access_token) {
      currentIdToken = data.session.access_token;
      if (data.session.user?.id) {
        merged['x-user-id'] = data.session.user.id;
      }
    }
  } catch (e) {
    console.warn('Failed to retrieve Supabase session:', e);
  }

  if (!merged['x-user-id']) {
    try {
      const stored = localStorage.getItem('tradeforge_user_id');
      if (stored) merged['x-user-id'] = stored;
      else {
        const demoRaw = localStorage.getItem('tf_demo_session');
        if (demoRaw) {
          const parsed = JSON.parse(demoRaw);
          if (parsed?.user?.id) merged['x-user-id'] = parsed.user.id;
        }
      }
    } catch {}
  }

  if (currentIdToken) {
    merged['Authorization'] = `Bearer ${currentIdToken}`;
  }
  return merged;
}

export async function authenticatedFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const headers = await getAuthHeaders((init.headers as Record<string, string>) || {});
  let response = await fetch(url, { ...init, headers });

  if (response.status === 401) {
    try {
      const { data } = await supabase.auth.getSession();
      if (data?.session?.access_token) {
        currentIdToken = data.session.access_token;
        const retryHeaders = await getAuthHeaders((init.headers as Record<string, string>) || {});
        response = await fetch(url, { ...init, headers: retryHeaders });
      }
    } catch (e) {
      console.error('Auto token refresh on 401 failed:', e);
    }
  }

  return response;
}

export async function fetchInitialState(targetUserId?: string | null, retries = 1, delay = 200) {
  let userId: string | null = targetUserId || null;

  if (!userId) {
    try {
      const { data } = await supabase.auth.getSession();
      userId = data?.session?.user?.id || null;
    } catch {}
  }

  if (!userId) {
    try {
      userId = localStorage.getItem('tradeforge_user_id');
    } catch {}
  }

  if (!userId) {
    try {
      const demoRaw = localStorage.getItem('tf_demo_session');
      if (demoRaw) {
        const parsed = JSON.parse(demoRaw);
        if (parsed?.user?.id) userId = parsed.user.id;
      }
    } catch {}
  }

  // 1. Primary: Direct Supabase Data Load in parallel
  if (userId) {
    try {
      const results = await Promise.allSettled([
        fetchProfileFromSupabase(userId),
        fetchAccountsFromSupabase(userId),
        fetchTradesFromSupabase(userId),
        fetchPlaybooksFromSupabase(userId),
        fetchStrategiesFromSupabase(userId),
        fetchJournalNotesFromSupabase(userId),
        fetchJournalFoldersFromSupabase(userId),
        fetchRiskGoalsFromSupabase(userId),
        fetchPropFirmAccountsFromSupabase(userId),
        fetchUserSettingsFromSupabase(userId),
        fetchCustomTagsFromSupabase(userId),
        fetchNotificationsFromSupabase(userId),
      ]);

      const [
        profileRes,
        accountsRes,
        tradesRes,
        playbooksRes,
        strategiesRes,
        notesRes,
        foldersRes,
        riskGoalsRes,
        propFirmAccountsRes,
        settingsRes,
        tagsRes,
        notificationsRes,
      ] = results;

      const profile = profileRes.status === 'fulfilled' ? profileRes.value : null;
      const accounts = accountsRes.status === 'fulfilled' && Array.isArray(accountsRes.value) ? accountsRes.value : [];
      const trades = tradesRes.status === 'fulfilled' && Array.isArray(tradesRes.value) ? tradesRes.value : [];
      const playbooks = playbooksRes.status === 'fulfilled' && Array.isArray(playbooksRes.value) ? playbooksRes.value : [];
      const strategies = strategiesRes.status === 'fulfilled' && Array.isArray(strategiesRes.value) ? strategiesRes.value : [];
      const notes = notesRes.status === 'fulfilled' && Array.isArray(notesRes.value) ? notesRes.value : [];
      const folders = foldersRes.status === 'fulfilled' && Array.isArray(foldersRes.value) ? foldersRes.value : [];
      const riskGoals = riskGoalsRes.status === 'fulfilled' && riskGoalsRes.value ? riskGoalsRes.value : {};
      const propFirmAccounts = propFirmAccountsRes.status === 'fulfilled' && Array.isArray(propFirmAccountsRes.value) ? propFirmAccountsRes.value : [];
      const settings = settingsRes.status === 'fulfilled' ? settingsRes.value : null;
      const tags = tagsRes.status === 'fulfilled' && Array.isArray(tagsRes.value) ? tagsRes.value : [];
      const notifications = notificationsRes.status === 'fulfilled' && Array.isArray(notificationsRes.value) ? notificationsRes.value : [];

      return {
        success: true,
        profile,
        accounts,
        trades,
        playbooks,
        strategies,
        notes,
        folders,
        riskGoals,
        propFirmAccounts,
        userSettings: settings,
        customTags: tags,
        notifications,
        connections: [],
        communityPosts: [],
      };
    } catch (supabaseErr) {
      console.warn('[Supabase Initial State Notice]', supabaseErr);
    }
  }

  // 2. Secondary: Fallback to /api/state only if direct Supabase returned no data
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await authenticatedFetch('/api/state');
      if (response.ok) {
        const data = await response.json();
        if (data && data.success) {
          return data;
        }
      }
    } catch (error: any) {
      if (attempt < retries) {
        await new Promise((res) => setTimeout(res, delay));
        delay *= 1.5;
      }
    }
  }

  return null;
}

export async function saveAccountApi(account: TradingAccount) {
  try {
    const userId = await getCurrentUserId();
    await upsertAccountToSupabase(account, userId);
  } catch (err) {
    console.warn('saveAccountApi Supabase notice:', err);
  }
  try {
    await authenticatedFetch('/api/accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(account),
    });
  } catch (error) {
    // server optional
  }
}

export async function deleteAccountApi(id: string) {
  try {
    const userId = await getCurrentUserId();
    await deleteAccountFromSupabase(id, userId);
  } catch (err) {
    console.warn('deleteAccountApi Supabase notice:', err);
  }
  try {
    await authenticatedFetch(`/api/accounts/${id}`, {
      method: 'DELETE',
    });
  } catch (error) {
    // server optional
  }
}

export async function fetchPropFirmAccountsApi(): Promise<PropFirmAccount[]> {
  try {
    const userId = await getCurrentUserId();
    const accounts = await fetchPropFirmAccountsFromSupabase(userId);
    if (accounts && accounts.length > 0) return accounts;
  } catch {}
  try {
    const res = await authenticatedFetch('/api/prop-firm-accounts');
    if (!res.ok) throw new Error(`Fetch prop firm accounts failed with status ${res.status}`);
    const data = await res.json();
    return data.success && Array.isArray(data.accounts) ? data.accounts : [];
  } catch (err) {
    return [];
  }
}

export async function savePropFirmAccountApi(account: PropFirmAccount): Promise<boolean> {
  try {
    const userId = await getCurrentUserId();
    await upsertPropFirmAccountToSupabase(account, userId);
  } catch (err) {
    console.warn('savePropFirmAccountApi Supabase notice:', err);
  }
  try {
    const res = await authenticatedFetch('/api/prop-firm-accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(account),
    });
    if (res.ok) {
      const data = await res.json();
      return !!data.success;
    }
  } catch {}
  return true;
}

export async function deletePropFirmAccountApi(id: string): Promise<boolean> {
  try {
    const userId = await getCurrentUserId();
    await deletePropFirmAccountFromSupabase(id, userId);
  } catch (err) {
    console.warn('deletePropFirmAccountApi Supabase notice:', err);
  }
  try {
    const res = await authenticatedFetch(`/api/prop-firm-accounts/${id}`, {
      method: 'DELETE',
    });
    if (res.ok) {
      const data = await res.json();
      return !!data.success;
    }
  } catch {}
  return true;
}

export async function saveTradeApi(trade: Trade) {
  try {
    const userId = await getCurrentUserId();
    await insertTradeToSupabase(trade, userId);
  } catch (err) {
    console.warn('saveTradeApi Supabase notice:', err);
  }
  try {
    await authenticatedFetch('/api/trades', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(trade),
    });
  } catch (error) {
    // server optional
  }
}

export async function deleteTradeApi(id: string) {
  try {
    const userId = await getCurrentUserId();
    await deleteTradeFromSupabase(id, userId);
  } catch (err) {
    console.warn('deleteTradeApi Supabase notice:', err);
  }
  try {
    await authenticatedFetch(`/api/trades/${id}`, {
      method: 'DELETE',
    });
  } catch (error) {
    // server optional
  }
}

export async function bulkDeleteTradesApi(ids: string[]) {
  try {
    const userId = await getCurrentUserId();
    await bulkDeleteTradesFromSupabase(ids, userId);
  } catch (err) {
    console.warn('bulkDeleteTradesApi Supabase notice:', err);
  }
  try {
    await authenticatedFetch('/api/trades/bulk-delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
    });
  } catch (error) {
    // server optional
  }
}

export async function bulkEditTradesApi(ids: string[], updates: Partial<Trade>) {
  try {
    const userId = await getCurrentUserId();
    await bulkEditTradesInSupabase(ids, updates, userId);
  } catch (err) {
    console.warn('bulkEditTradesApi Supabase notice:', err);
  }
  try {
    await authenticatedFetch('/api/trades/bulk-edit', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids, updates }),
    });
  } catch (error) {
    // server optional
  }
}

export async function savePlaybookApi(playbook: Playbook) {
  try {
    const userId = await getCurrentUserId();
    await upsertPlaybookToSupabase(playbook, userId);
  } catch (err) {
    console.warn('savePlaybookApi Supabase notice:', err);
  }
  try {
    await authenticatedFetch('/api/playbooks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(playbook),
    });
  } catch (error) {
    // server optional
  }
}

export async function deletePlaybookApi(id: string) {
  try {
    const userId = await getCurrentUserId();
    await deletePlaybookFromSupabase(id, userId);
  } catch (err) {
    console.warn('deletePlaybookApi Supabase notice:', err);
  }
  try {
    await authenticatedFetch(`/api/playbooks/${id}`, {
      method: 'DELETE',
    });
  } catch (error) {
    // server optional
  }
}

export async function saveStrategyApi(strategy: Strategy) {
  try {
    const userId = await getCurrentUserId();
    await upsertStrategyToSupabase(strategy, userId);
  } catch (err) {
    console.warn('saveStrategyApi Supabase notice:', err);
  }
  try {
    await authenticatedFetch('/api/strategies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(strategy),
    });
  } catch (error) {
    // server optional
  }
}

export async function deleteStrategyApi(id: string) {
  try {
    const userId = await getCurrentUserId();
    await deleteStrategyFromSupabase(id, userId);
  } catch (err) {
    console.warn('deleteStrategyApi Supabase notice:', err);
  }
  try {
    await authenticatedFetch(`/api/strategies/${id}`, {
      method: 'DELETE',
    });
  } catch (error) {
    // server optional
  }
}

export async function saveNoteApi(note: JournalNote): Promise<boolean> {
  let supabaseSuccess = false;
  try {
    const userId = await getCurrentUserId();
    supabaseSuccess = await upsertJournalNoteToSupabase(note, userId);
  } catch (err) {
    console.warn('saveNoteApi Supabase notice:', err);
  }
  
  let apiSuccess = false;
  try {
    const res = await authenticatedFetch('/api/journal/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(note),
    });
    apiSuccess = res.ok;
  } catch (error) {
    // server optional
  }
  
  return supabaseSuccess || apiSuccess;
}

/**
 * Soft deletes a note (moves to Trash).
 */
export async function softDeleteNoteApi(id: string, originalFolderId?: string): Promise<boolean> {
  let supabaseSuccess = false;
  try {
    const userId = await getCurrentUserId();
    supabaseSuccess = await softDeleteJournalNoteInSupabase(id, userId, originalFolderId);
  } catch (err) {
    console.warn('softDeleteNoteApi Supabase notice:', err);
  }

  let apiSuccess = false;
  try {
    const res = await authenticatedFetch(`/api/journal/notes/${id}`, {
      method: 'DELETE',
    });
    apiSuccess = res.ok;
  } catch (error) {
    // server optional
  }

  return supabaseSuccess || apiSuccess;
}

/**
 * Default deleteNoteApi moves note to Trash.
 */
export async function deleteNoteApi(id: string): Promise<boolean> {
  return await softDeleteNoteApi(id);
}

/**
 * Restores a note from Trash.
 */
export async function restoreNoteApi(id: string, originalFolderId?: string): Promise<boolean> {
  let supabaseSuccess = false;
  try {
    const userId = await getCurrentUserId();
    supabaseSuccess = await restoreJournalNoteInSupabase(id, userId, originalFolderId);
  } catch (err) {
    console.warn('restoreNoteApi Supabase notice:', err);
  }

  let apiSuccess = false;
  try {
    const res = await authenticatedFetch(`/api/journal/notes/${id}/restore`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ originalFolderId }),
    });
    apiSuccess = res.ok;
  } catch (error) {
    // server optional
  }

  return supabaseSuccess || apiSuccess;
}

/**
 * Permanently deletes a note from DB.
 */
export async function permanentDeleteNoteApi(id: string): Promise<boolean> {
  let supabaseSuccess = false;
  try {
    const userId = await getCurrentUserId();
    supabaseSuccess = await deleteJournalNoteFromSupabase(id, userId);
  } catch (err) {
    console.warn('permanentDeleteNoteApi Supabase notice:', err);
  }

  let apiSuccess = false;
  try {
    const res = await authenticatedFetch(`/api/journal/notes/${id}?permanent=true`, {
      method: 'DELETE',
    });
    apiSuccess = res.ok;
  } catch (error) {
    // server optional
  }

  return supabaseSuccess || apiSuccess;
}

export async function saveFolderApi(folder: JournalFolder): Promise<boolean> {
  let supabaseSuccess = false;
  try {
    const userId = await getCurrentUserId();
    supabaseSuccess = await upsertJournalFolderToSupabase(folder, userId);
  } catch (err) {
    console.warn('saveFolderApi Supabase notice:', err);
  }

  let apiSuccess = false;
  try {
    const res = await authenticatedFetch('/api/journal/folders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(folder),
    });
    apiSuccess = res.ok;
  } catch (error) {
    // server optional
  }

  return supabaseSuccess || apiSuccess;
}

/**
 * Soft deletes a folder (moves folder and its notes to Trash).
 */
export async function softDeleteFolderApi(id: string): Promise<boolean> {
  let supabaseSuccess = false;
  try {
    const userId = await getCurrentUserId();
    supabaseSuccess = await softDeleteJournalFolderInSupabase(id, userId);
  } catch (err) {
    console.warn('softDeleteFolderApi Supabase notice:', err);
  }

  let apiSuccess = false;
  try {
    const res = await authenticatedFetch(`/api/journal/folders/${id}`, {
      method: 'DELETE',
    });
    apiSuccess = res.ok;
  } catch (error) {
    // server optional
  }

  return supabaseSuccess || apiSuccess;
}

/**
 * Default deleteFolderApi moves folder to Trash.
 */
export async function deleteFolderApi(id: string): Promise<boolean> {
  return await softDeleteFolderApi(id);
}

/**
 * Restores a folder and its notes from Trash.
 */
export async function restoreFolderApi(id: string): Promise<boolean> {
  let supabaseSuccess = false;
  try {
    const userId = await getCurrentUserId();
    supabaseSuccess = await restoreJournalFolderInSupabase(id, userId);
  } catch (err) {
    console.warn('restoreFolderApi Supabase notice:', err);
  }

  let apiSuccess = false;
  try {
    const res = await authenticatedFetch(`/api/journal/folders/${id}/restore`, {
      method: 'POST',
    });
    apiSuccess = res.ok;
  } catch (error) {
    // server optional
  }

  return supabaseSuccess || apiSuccess;
}

/**
 * Permanently deletes a folder and its contents.
 */
export async function permanentDeleteFolderApi(id: string): Promise<boolean> {
  let supabaseSuccess = false;
  try {
    const userId = await getCurrentUserId();
    supabaseSuccess = await deleteJournalFolderFromSupabase(id, userId);
  } catch (err) {
    console.warn('permanentDeleteFolderApi Supabase notice:', err);
  }

  let apiSuccess = false;
  try {
    const res = await authenticatedFetch(`/api/journal/folders/${id}?permanent=true`, {
      method: 'DELETE',
    });
    apiSuccess = res.ok;
  } catch (error) {
    // server optional
  }

  return supabaseSuccess || apiSuccess;
}

/**
 * Purges expired trash items older than 2 days.
 */
export async function purgeExpiredTrashApi(): Promise<void> {
  try {
    const userId = await getCurrentUserId();
    await purgeExpiredTrashFromSupabase(userId);
  } catch (err) {
    console.warn('purgeExpiredTrashApi Supabase notice:', err);
  }

  try {
    await authenticatedFetch('/api/journal/cleanup-expired', {
      method: 'POST',
    });
  } catch {}
}

export async function fetchRiskGoalsApi(accountId?: string): Promise<RiskGoalSettings | null> {
  try {
    const userId = await getCurrentUserId();
    const goals = await fetchRiskGoalsFromSupabase(userId, accountId);
    if (goals) return goals;
  } catch {}
  try {
    const url = accountId && accountId !== 'all' ? `/api/risk-goals?accountId=${encodeURIComponent(accountId)}` : '/api/risk-goals';
    const res = await authenticatedFetch(url);
    if (!res || !res.ok) return null;
    const data = await res.json().catch(() => null);
    return data?.riskGoals || null;
  } catch (error: any) {
    return null;
  }
}

export async function saveRiskGoalsApi(goals: RiskGoalSettings, accountId?: string) {
  const effectiveAccId = accountId || goals.tradingAccountId;
  try {
    const userId = await getCurrentUserId();
    await upsertRiskGoalsToSupabase(goals, userId, effectiveAccId);
  } catch (err) {
    console.warn('saveRiskGoalsApi Supabase notice:', err);
  }
  try {
    const payload = effectiveAccId && effectiveAccId !== 'all' ? { ...goals, tradingAccountId: effectiveAccId } : goals;
    await authenticatedFetch('/api/risk-goals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    // server optional
  }
}

export async function unlockRiskAccountApi(tradingAccountId: string, unlockReason: string, unlockedBy: string = 'Trader') {
  try {
    const res = await authenticatedFetch('/api/risk-goals/unlock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tradingAccountId, unlockReason, unlockedBy }),
    });
    if (res && res.ok) {
      const data = await res.json().catch(() => null);
      return data?.riskGoals || null;
    }
  } catch (err) {
    console.warn('unlockRiskAccountApi error:', err);
  }
  return null;
}

export async function fetchRiskEventsApi(accountId?: string) {
  try {
    const url = accountId && accountId !== 'all' ? `/api/risk-events?accountId=${encodeURIComponent(accountId)}` : '/api/risk-events';
    const res = await authenticatedFetch(url);
    if (res && res.ok) {
      const data = await res.json().catch(() => null);
      return data?.riskEvents || [];
    }
  } catch (err) {
    console.warn('fetchRiskEventsApi error:', err);
  }
  return [];
}

export async function saveRiskEventApi(event: any) {
  try {
    await authenticatedFetch('/api/risk-events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    });
  } catch (err) {
    console.warn('saveRiskEventApi error:', err);
  }
}

export async function saveNotificationApi(notification: AppNotification) {
  try {
    await authenticatedFetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(notification),
    });
  } catch (error) {
    console.error('saveNotificationApi error:', error);
  }
}

export async function fetchCommunityPostsApi(): Promise<CommunityPost[]> {
  try {
    const res = await authenticatedFetch('/api/community-posts');
    if (!res.ok) return [];
    const data = await res.json();
    return data.posts || [];
  } catch (error) {
    console.error('fetchCommunityPostsApi error:', error);
    return [];
  }
}

export async function saveCommunityPostApi(post: Partial<CommunityPost>) {
  try {
    const res = await authenticatedFetch('/api/community-posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(post),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Failed to create post');
    }
    const data = await res.json();
    return data.post;
  } catch (error) {
    console.error('saveCommunityPostApi error:', error);
    throw error;
  }
}

export async function editCommunityPostApi(id: string, updates: Partial<CommunityPost>) {
  try {
    const res = await authenticatedFetch(`/api/community-posts/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Failed to edit post');
    }
    const data = await res.json();
    return data.post;
  } catch (error) {
    console.error('editCommunityPostApi error:', error);
    throw error;
  }
}

export async function deleteCommunityPostApi(id: string) {
  try {
    const res = await authenticatedFetch(`/api/community-posts/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Failed to delete post');
    }
    return true;
  } catch (error) {
    console.error('deleteCommunityPostApi error:', error);
    throw error;
  }
}

export async function toggleLikePostApi(id: string) {
  try {
    const res = await authenticatedFetch(`/api/community-posts/${id}/like`, {
      method: 'POST',
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Failed to toggle like');
    }
    return await res.json();
  } catch (error) {
    console.error('toggleLikePostApi error:', error);
    throw error;
  }
}

export async function fetchPostCommentsApi(id: string) {
  try {
    const res = await authenticatedFetch(`/api/community-posts/${id}/comments`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.comments || [];
  } catch (error) {
    console.error('fetchPostCommentsApi error:', error);
    return [];
  }
}

export async function addPostCommentApi(id: string, content: string) {
  try {
    const res = await authenticatedFetch(`/api/community-posts/${id}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Failed to add comment');
    }
    return await res.json();
  } catch (error) {
    console.error('addPostCommentApi error:', error);
    throw error;
  }
}

export async function deletePostCommentApi(postId: string, commentId: string) {
  try {
    const res = await authenticatedFetch(`/api/community-posts/${postId}/comments/${commentId}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Failed to delete comment');
    }
    return await res.json();
  } catch (error) {
    console.error('deletePostCommentApi error:', error);
    throw error;
  }
}

export async function saveMentorStudentApi(student: MentorStudent) {
  try {
    await authenticatedFetch('/api/mentor-students', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(student),
    });
  } catch (error) {
    console.error('saveMentorStudentApi error:', error);
  }
}

export async function deleteMentorStudentApi(id: string) {
  try {
    await authenticatedFetch(`/api/mentor-students/${id}`, {
      method: 'DELETE',
    });
  } catch (error) {
    console.error('deleteMentorStudentApi error:', error);
  }
}

export async function getBacktestSessionsApi() {
  try {
    const res = await authenticatedFetch('/api/backtesting/sessions');
    if (!res.ok) return [];
    const data = await res.json();
    return data.sessions || [];
  } catch (error) {
    console.error('getBacktestSessionsApi error:', error);
    return [];
  }
}

export async function saveBacktestSessionApi(session: any) {
  try {
    await authenticatedFetch('/api/backtesting/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(session),
    });
  } catch (error) {
    console.error('saveBacktestSessionApi error:', error);
  }
}

export async function deleteBacktestSessionApi(id: string) {
  try {
    await authenticatedFetch(`/api/backtesting/sessions/${id}`, {
      method: 'DELETE',
    });
  } catch (error) {
    console.error('deleteBacktestSessionApi error:', error);
  }
}

// Broker Integrations & Webhook Auto-Sync API methods
export async function fetchIntegrationsApi() {
  try {
    const res = await authenticatedFetch('/api/integrations');
    if (!res.ok) return [];
    const data = await res.json();
    return data.integrations || [];
  } catch (error) {
    console.error('fetchIntegrationsApi error:', error);
    return [];
  }
}

export async function createIntegrationApi(payload: {
  accountId: string;
  provider: string;
  displayName?: string;
  externalAccountId?: string;
}) {
  try {
    const res = await authenticatedFetch('/api/integrations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Failed to create integration');
    }
    const data = await res.json();
    return data;
  } catch (error) {
    console.error('createIntegrationApi error:', error);
    throw error;
  }
}

export async function deleteIntegrationApi(id: string) {
  try {
    const res = await authenticatedFetch(`/api/integrations/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Failed to delete integration');
    }
    return true;
  } catch (error) {
    console.error('deleteIntegrationApi error:', error);
    throw error;
  }
}

export async function getEaScriptApi(id: string) {
  try {
    const res = await authenticatedFetch(`/api/integrations/${id}/ea-script`);
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Failed to fetch EA script');
    }
    return await res.json();
  } catch (error) {
    console.error('getEaScriptApi error:', error);
    throw error;
  }
}

export async function sendTestWebhookApi(id: string, secret: string, payload: any) {
  try {
    const res = await fetch(`/api/integrations/webhook/${id}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${secret}`,
        'Idempotency-Key': `test_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Webhook call failed');
    }
    return data;
  } catch (error) {
    console.error('sendTestWebhookApi error:', error);
    throw error;
  }
}

export async function regenerateIntegrationApi(id: string) {
  try {
    const res = await authenticatedFetch(`/api/integrations/${id}/regenerate`, {
      method: 'POST',
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Failed to regenerate integration secret');
    }
    return await res.json();
  } catch (error) {
    console.error('regenerateIntegrationApi error:', error);
    throw error;
  }
}

export async function fetchIntegrationEventsApi(id: string, limit = 50, offset = 0) {
  try {
    const res = await authenticatedFetch(`/api/integrations/${id}/events?limit=${limit}&offset=${offset}`);
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Failed to fetch event history');
    }
    const data = await res.json();
    return data.events || [];
  } catch (error) {
    console.error('fetchIntegrationEventsApi error:', error);
    throw error;
  }
}

export async function fetchIntegrationHealthApi(id: string) {
  try {
    const res = await authenticatedFetch(`/api/integrations/${id}/health`);
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Failed to fetch integration health');
    }
    const data = await res.json();
    return data.health;
  } catch (error) {
    console.error('fetchIntegrationHealthApi error:', error);
    throw error;
  }
}

export async function retryIntegrationEventApi(id: string, eventId: string) {
  try {
    const res = await authenticatedFetch(`/api/integrations/${id}/events/${eventId}/retry`, {
      method: 'POST',
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Failed to retry integration event');
    }
    return await res.json();
  } catch (error) {
    console.error('retryIntegrationEventApi error:', error);
    throw error;
  }
}

export async function fetchDailyChecklist(date: string): Promise<string[]> {
  try {
    const res = await authenticatedFetch(`/api/checklist?date=${encodeURIComponent(date)}`);
    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      if (Array.isArray(data.completedItems)) {
        try {
          localStorage.setItem(`df_checklist_${date}`, JSON.stringify(data.completedItems));
        } catch {}
        return data.completedItems;
      }
    }
  } catch {
    // Network or server endpoint unreachable - gracefully fallback to local storage
  }

  // Graceful local cache fallback
  try {
    const saved = localStorage.getItem(`df_checklist_${date}`);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}

  return [];
}

export async function saveDailyChecklistItemApi(itemId: string, date: string, completed: boolean): Promise<void> {
  // Update local-first cache immediately
  try {
    const saved = localStorage.getItem(`df_checklist_${date}`);
    let items: string[] = saved ? JSON.parse(saved) : [];
    if (!Array.isArray(items)) items = [];
    if (completed && !items.includes(itemId)) {
      items.push(itemId);
    } else if (!completed && items.includes(itemId)) {
      items = items.filter(id => id !== itemId);
    }
    localStorage.setItem(`df_checklist_${date}`, JSON.stringify(items));
  } catch {}

  try {
    await authenticatedFetch(`/api/checklist/${encodeURIComponent(itemId)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date, completed }),
    });
  } catch {
    // Offline or server unreachable - local cache is already preserved
  }
}

export async function saveDailyChecklistBulkApi(date: string, completedItems: string[]): Promise<void> {
  // Update local-first cache immediately
  try {
    localStorage.setItem(`df_checklist_${date}`, JSON.stringify(completedItems));
  } catch {}

  try {
    await authenticatedFetch('/api/checklist/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date, completedItems }),
    });
  } catch {
    // Offline or server unreachable - local cache is already preserved
  }
}

export async function fetchDirectivesApi() {
  try {
    const res = await authenticatedFetch('/api/mentor/directives');
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Failed to fetch mentor directives');
    }
    return await res.json();
  } catch (error) {
    console.error('fetchDirectivesApi error:', error);
    throw error;
  }
}

export async function createDirectiveApi(studentCode: string, content: string, type = 'DIRECTIVE') {
  try {
    const res = await authenticatedFetch('/api/mentor/directives', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentCode, content, type }),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Failed to dispatch directive');
    }
    return await res.json();
  } catch (error) {
    console.error('createDirectiveApi error:', error);
    throw error;
  }
}

export async function acknowledgeDirectiveApi(id: string) {
  try {
    const res = await authenticatedFetch(`/api/mentor/directives/${id}/acknowledge`, {
      method: 'PATCH',
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Failed to acknowledge directive');
    }
    return await res.json();
  } catch (error) {
    console.error('acknowledgeDirectiveApi error:', error);
    throw error;
  }
}

export async function fetchMentorStudentFeedback(studentId: string) {
  try {
    const res = await authenticatedFetch(`/api/mentor/students/${encodeURIComponent(studentId)}/feedback`);
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Failed to fetch student feedback');
    }
    const data = await res.json();
    return data.feedback || [];
  } catch (error) {
    console.error('fetchMentorStudentFeedback error:', error);
    throw error;
  }
}

export async function createMentorFeedback(studentId: string, payload: { content: string; type?: string }) {
  try {
    const res = await authenticatedFetch(`/api/mentor/students/${encodeURIComponent(studentId)}/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Failed to create student feedback');
    }
    return await res.json();
  } catch (error) {
    console.error('createMentorFeedback error:', error);
    throw error;
  }
}

export async function updateMentorFeedback(id: string, payload: { content?: string; status?: string; type?: string }) {
  try {
    const res = await authenticatedFetch(`/api/mentor/feedback/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Failed to update feedback');
    }
    return await res.json();
  } catch (error) {
    console.error('updateMentorFeedback error:', error);
    throw error;
  }
}

export async function deleteMentorFeedback(id: string) {
  try {
    const res = await authenticatedFetch(`/api/mentor/feedback/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Failed to delete feedback');
    }
    return true;
  } catch (error) {
    console.error('deleteMentorFeedback error:', error);
    throw error;
  }
}

export async function fetchStudentMentorsApi() {
  try {
    const res = await authenticatedFetch('/api/student/mentors');
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Failed to fetch mentors');
    }
    const data = await res.json();
    return data.mentors || [];
  } catch (error) {
    console.error('fetchStudentMentorsApi error:', error);
    return [];
  }
}

export async function fetchMentorStudentsFullApi() {
  try {
    const res = await authenticatedFetch('/api/mentor/students-full');
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Failed to fetch students');
    }
    const data = await res.json();
    return data.students || [];
  } catch (error) {
    console.error('fetchMentorStudentsFullApi error:', error);
    return [];
  }
}

export async function fetchStudentDetailsForMentorApi(studentId: string) {
  try {
    const res = await authenticatedFetch(`/api/mentor/students/${encodeURIComponent(studentId)}/details`);
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Failed to fetch student details');
    }
    const data = await res.json();
    return data.details || null;
  } catch (error) {
    console.error('fetchStudentDetailsForMentorApi error:', error);
    throw error;
  }
}

export async function searchMentorAccountsApi(query: string) {
  try {
    const res = await authenticatedFetch(`/api/mentor/search?q=${encodeURIComponent(query)}`);
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Failed to search mentor accounts');
    }
    const data = await res.json();
    return data.results || [];
  } catch (error) {
    console.error('searchMentorAccountsApi error:', error);
    throw error;
  }
}

export async function searchStudentByCodeApi(code: string) {
  try {
    const res = await authenticatedFetch(`/api/mentor/search-student?code=${encodeURIComponent(code)}`);
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Student not found. Check the Unique Mentor Code.');
    }
    return data.student;
  } catch (error) {
    console.error('searchStudentByCodeApi error:', error);
    throw error;
  }
}

export async function connectMentorByCodeApi(mentorCode: string, role?: 'mentor' | 'student') {
  try {
    const res = await authenticatedFetch('/api/mentor/connect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mentorCode, role }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to connect');
    }
    return data;
  } catch (error) {
    console.error('connectMentorByCodeApi error:', error);
    throw error;
  }
}

export async function updateStudentSharingPermissionsApi(mentorUserId: string, permissions: any) {
  try {
    const res = await authenticatedFetch('/api/student/permissions', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mentorUserId, permissions }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to update permissions');
    }
    return data.permissions;
  } catch (error) {
    console.error('updateStudentSharingPermissionsApi error:', error);
    throw error;
  }
}

export async function disconnectMentorRelationshipApi(targetUserId: string) {
  try {
    const res = await authenticatedFetch(`/api/mentor/relationship/${encodeURIComponent(targetUserId)}`, {
      method: 'DELETE',
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to disconnect relationship');
    }
    return true;
  } catch (error) {
    console.error('disconnectMentorRelationshipApi error:', error);
    throw error;
  }
}

// Leaderboard & Admin API calls
export async function fetchLeaderboardApi(retries = 3, delay = 500) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await authenticatedFetch('/api/leaderboard');
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to fetch leaderboard');
      }
      return await res.json();
    } catch (error) {
      if (attempt === retries) {
        console.warn('fetchLeaderboardApi error after retries:', error);
        return { success: true, leaderboard: [] };
      }
      await new Promise((resolve) => setTimeout(resolve, delay * attempt));
    }
  }
  return { success: true, leaderboard: [] };
}

export async function updateUserPointsAdminApi(userId: string, points: number, reason?: string) {
  try {
    const res = await authenticatedFetch(`/api/admin/leaderboard/${userId}/points`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ points, reason }),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Failed to update user points');
    }
    return await res.json();
  } catch (error) {
    console.error('updateUserPointsAdminApi error:', error);
    throw error;
  }
}

export async function updateUserRoleAdminApi(userId: string, role: string, reason?: string) {
  try {
    const res = await authenticatedFetch(`/api/admin/leaderboard/${userId}/role`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role, reason }),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Failed to update user role');
    }
    return await res.json();
  } catch (error) {
    console.error('updateUserRoleAdminApi error:', error);
    throw error;
  }
}

// Backtesting Drawings & Templates API calls
export async function fetchBacktestDrawingsApi(symbol?: string, sessionId: string = 'default') {
  try {
    const url = symbol
      ? `/api/backtest/drawings?symbol=${encodeURIComponent(symbol)}&sessionId=${encodeURIComponent(sessionId)}`
      : `/api/backtest/drawings?sessionId=${encodeURIComponent(sessionId)}`;
    const res = await authenticatedFetch(url);
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Failed to fetch drawings');
    }
    const data = await res.json();
    return data.drawings || [];
  } catch (error) {
    console.error('fetchBacktestDrawingsApi error:', error);
    return [];
  }
}

export async function saveBacktestDrawingsApi(
  symbol: string,
  drawings: any[],
  sessionId: string = 'default',
  timeframe: string = '15m'
) {
  try {
    const res = await authenticatedFetch('/api/backtest/drawings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symbol, drawings, sessionId, timeframe }),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Failed to save drawings');
    }
    return await res.json();
  } catch (error) {
    console.error('saveBacktestDrawingsApi error:', error);
    throw error;
  }
}

export async function fetchChartTemplatesApi() {
  try {
    const res = await authenticatedFetch('/api/backtest/templates');
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Failed to fetch templates');
    }
    const data = await res.json();
    return data.templates || [];
  } catch (error) {
    console.error('fetchChartTemplatesApi error:', error);
    return [];
  }
}

export async function saveChartTemplateApi(template: {
  id?: string;
  name: string;
  description?: string;
  chartType: string;
  indicators: any[];
}) {
  try {
    const res = await authenticatedFetch('/api/backtest/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(template),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Failed to save template');
    }
    return await res.json();
  } catch (error) {
    console.error('saveChartTemplateApi error:', error);
    throw error;
  }
}

export async function deleteChartTemplateApi(templateId: string) {
  try {
    const res = await authenticatedFetch(`/api/backtest/templates/${encodeURIComponent(templateId)}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Failed to delete template');
    }
    return await res.json();
  } catch (error) {
    console.error('deleteChartTemplateApi error:', error);
    throw error;
  }
}

export async function fetchUserProfileApi() {
  try {
    const res = await authenticatedFetch('/api/user/profile');
    if (!res.ok) return null;
    const data = await res.json();
    return data.profile || null;
  } catch (error) {
    console.error('fetchUserProfileApi error:', error);
    return null;
  }
}

export async function uploadAvatarApi(fileData: string, contentType: string = 'image/png'): Promise<string> {
  try {
    const res = await authenticatedFetch('/api/storage/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileData,
        bucket: 'avatars',
        contentType,
      }),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Failed to upload avatar');
    }
    const data = await res.json();
    return data.url;
  } catch (error) {
    console.error('uploadAvatarApi error:', error);
    throw error;
  }
}

export async function updateUserProfileApi(profileData: {
  fullName?: string;
  name?: string;
  email?: string;
  accountCode?: string;
  experienceLevel?: string;
  avatarUrl?: string;
  country?: string;
  timezone?: string;
  preferredCurrency?: string;
  professionalTitle?: string;
  bio?: string;
  tradingStyle?: string;
  phone?: string;
}) {
  try {
    const userId = await getCurrentUserId();
    await upsertProfileToSupabase({
      id: userId,
      name: profileData.name || profileData.fullName || 'Trader',
      email: profileData.email || '',
      accountCode: profileData.accountCode || '',
      experienceLevel: profileData.experienceLevel || 'Intermediate',
      avatarUrl: profileData.avatarUrl || '',
      country: profileData.country,
      timezone: profileData.timezone,
      preferredCurrency: profileData.preferredCurrency,
      professionalTitle: profileData.professionalTitle,
      bio: profileData.bio,
      tradingStyle: profileData.tradingStyle,
      phone: profileData.phone,
    });
  } catch (err) {
    console.warn('updateUserProfileApi Supabase notice:', err);
  }
  try {
    const res = await authenticatedFetch('/api/user/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profileData),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Failed to update profile');
    }
    return await res.json();
  } catch (error) {
    return { success: true, profile: profileData };
  }
}

// ============================================================================
// Auto-Sync Trading Account Connections API Helpers
// ============================================================================

export async function fetchPlatformsApi() {
  try {
    const res = await authenticatedFetch('/api/connections/platforms');
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Failed to fetch supported platforms');
    }
    const data = await res.json();
    return data.platforms || [];
  } catch (error) {
    console.error('fetchPlatformsApi error:', error);
    throw error;
  }
}

export async function testConnectionApi(platform: string, credentials: Record<string, any>) {
  try {
    const res = await authenticatedFetch('/api/connections/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ platform, credentials }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || data.message || 'Connection test failed');
    }
    return data;
  } catch (error) {
    console.error('testConnectionApi error:', error);
    throw error;
  }
}

export async function fetchConnectionsApi() {
  try {
    const res = await authenticatedFetch('/api/connections');
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Failed to fetch connections');
    }
    const data = await res.json();
    return data.connections || [];
  } catch (error) {
    console.error('fetchConnectionsApi error:', error);
    throw error;
  }
}

export async function createConnectionApi(connectionData: {
  platform: string;
  broker: string;
  server?: string;
  accountNumber: string;
  accountName?: string;
  currency?: string;
  accountType?: string;
  credentials: Record<string, any>;
  syncEnabled?: boolean;
  autoSyncIntervalMins?: number;
  importScope?: string;
  importStartDate?: string;
  linkToExistingAccountId?: string;
}) {
  try {
    const res = await authenticatedFetch('/api/connections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(connectionData),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to create connection');
    }
    return data;
  } catch (error) {
    console.error('createConnectionApi error:', error);
    throw error;
  }
}

export async function updateConnectionApi(
  id: string,
  updateData: {
    accountName?: string;
    syncEnabled?: boolean;
    autoSyncIntervalMins?: number;
    importScope?: string;
    importStartDate?: string;
    credentials?: Record<string, any>;
  }
) {
  try {
    const res = await authenticatedFetch(`/api/connections/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to update connection');
    }
    return data;
  } catch (error) {
    console.error('updateConnectionApi error:', error);
    throw error;
  }
}

export async function deleteConnectionApi(id: string) {
  try {
    const res = await authenticatedFetch(`/api/connections/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to delete connection');
    }
    return data;
  } catch (error) {
    console.error('deleteConnectionApi error:', error);
    throw error;
  }
}

export async function syncConnectionApi(
  id: string,
  options?: { importScope?: string; startDate?: string }
) {
  try {
    const res = await authenticatedFetch(`/api/connections/${encodeURIComponent(id)}/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options || {}),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Sync request failed');
    }
    return data;
  } catch (error) {
    console.error('syncConnectionApi error:', error);
    throw error;
  }
}

export async function fetchConnectionLogsApi(id: string) {
  try {
    const res = await authenticatedFetch(`/api/connections/${encodeURIComponent(id)}/logs`);
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to fetch logs');
    }
    return data.logs || [];
  } catch (error) {
    console.error('fetchConnectionLogsApi error:', error);
    throw error;
  }
}

// ---------------------------------------------------------------------------
// SETTINGS API CLIENT FUNCTIONS
// ---------------------------------------------------------------------------
export async function getUserSettingsApi(accountId?: string): Promise<UserSettings | null> {
  try {
    const url = accountId ? `/api/user/settings?accountId=${encodeURIComponent(accountId)}` : '/api/user/settings';
    const res = await authenticatedFetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    return data.settings || null;
  } catch (err) {
    console.warn('getUserSettingsApi error:', err);
    return null;
  }
}

export async function saveUserSettingsApi(settings: UserSettings, accountId?: string): Promise<UserSettings> {
  try {
    const userId = await getCurrentUserId();
    await upsertUserSettingsToSupabase(settings, userId);
  } catch (err) {
    console.warn('saveUserSettingsApi Supabase notice:', err);
  }
  try {
    const res = await authenticatedFetch('/api/user/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ settings, accountId }),
    });
    const data = await res.json();
    if (data && data.success && data.settings) {
      return data.settings;
    }
  } catch (err) {
    // server optional
  }
  return settings;
}

// ---------------------------------------------------------------------------
// CUSTOM TAGS API CLIENT FUNCTIONS
// ---------------------------------------------------------------------------
export async function getCustomTagsApi(): Promise<CustomTag[]> {
  try {
    const res = await authenticatedFetch('/api/tags');
    if (!res.ok) return [];
    const data = await res.json();
    return data.tags || [];
  } catch (err) {
    console.warn('getCustomTagsApi error:', err);
    return [];
  }
}

export async function saveCustomTagApi(tag: CustomTag): Promise<CustomTag> {
  try {
    const isUpdate = !!tag.id && !tag.id.startsWith('new-');
    const url = isUpdate ? `/api/tags/${encodeURIComponent(tag.id)}` : '/api/tags';
    const method = isUpdate ? 'PUT' : 'POST';

    const res = await authenticatedFetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tag),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to save tag');
    }
    return data.tag;
  } catch (err) {
    console.error('saveCustomTagApi error:', err);
    throw err;
  }
}

export async function deleteCustomTagApi(id: string): Promise<boolean> {
  try {
    const res = await authenticatedFetch(`/api/tags/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    return res.ok;
  } catch (err) {
    console.error('deleteCustomTagApi error:', err);
    throw err;
  }
}

// ---------------------------------------------------------------------------
// IMPORT HISTORY API CLIENT FUNCTIONS
// ---------------------------------------------------------------------------
export async function getImportHistoryApi(): Promise<ImportHistoryItem[]> {
  try {
    const res = await authenticatedFetch('/api/import-history');
    if (!res.ok) return [];
    const data = await res.json();
    return data.history || [];
  } catch (err) {
    console.warn('getImportHistoryApi error:', err);
    return [];
  }
}

export async function recordImportHistoryApi(item: ImportHistoryItem): Promise<ImportHistoryItem> {
  try {
    const res = await authenticatedFetch('/api/import-history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    });
    const data = await res.json();
    return data.item || item;
  } catch (err) {
    console.warn('recordImportHistoryApi error:', err);
    return item;
  }
}

// ---------------------------------------------------------------------------
// ACTIVITY LOGS API CLIENT FUNCTIONS
// ---------------------------------------------------------------------------
export async function getActivityLogsApi(limit = 100): Promise<ActivityLogItem[]> {
  try {
    const res = await authenticatedFetch(`/api/activity-logs?limit=${limit}`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.logs || [];
  } catch (err) {
    console.warn('getActivityLogsApi error:', err);
    return [];
  }
}

export async function recordActivityLogApi(item: Omit<ActivityLogItem, 'id' | 'createdAt'>): Promise<ActivityLogItem | null> {
  try {
    const res = await authenticatedFetch('/api/activity-logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    });
    const data = await res.json();
    return data.log || null;
  } catch (err) {
    console.warn('recordActivityLogApi warning:', err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// BACKUPS & DATA RESET API CLIENT FUNCTIONS
// ---------------------------------------------------------------------------
export async function getUserBackupsApi(): Promise<UserBackup[]> {
  try {
    const res = await authenticatedFetch('/api/backups');
    if (!res.ok) return [];
    const data = await res.json();
    return data.backups || [];
  } catch (err) {
    console.warn('getUserBackupsApi error:', err);
    return [];
  }
}

export async function createUserBackupApi(name?: string, backupData?: any): Promise<UserBackup> {
  try {
    const res = await authenticatedFetch('/api/backups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, backupData }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to create backup');
    }
    return data.backup;
  } catch (err) {
    console.error('createUserBackupApi error:', err);
    throw err;
  }
}

export async function deleteUserBackupApi(id: string): Promise<boolean> {
  try {
    const res = await authenticatedFetch(`/api/backups/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    return res.ok;
  } catch (err) {
    console.error('deleteUserBackupApi error:', err);
    throw err;
  }
}

export async function executeDataResetApi(
  resetType: 'wipeAll' | 'trades' | 'journal' | 'settings',
  confirmationPhrase: string
): Promise<{ success: boolean; message: string }> {
  try {
    const res = await authenticatedFetch('/api/data-reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resetType, confirmationPhrase }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Data reset failed');
    }
    return data;
  } catch (err) {
    console.error('executeDataResetApi error:', err);
    throw err;
  }
}




