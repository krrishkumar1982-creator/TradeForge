import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient, User, Session, AuthChangeEvent } from '@supabase/supabase-js';

// Retrieve and sanitize environment variables for Supabase (Vite client environment)
const getEnv = (key: string): string => {
  let val = '';
  try {
    if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
      val = (import.meta as any).env[key] || '';
    }
  } catch {}
  if (!val) {
    try {
      if (typeof process !== 'undefined' && process.env) {
        val = process.env[key] || '';
      }
    } catch {}
  }
  return typeof val === 'string' ? val.trim().replace(/^["']|["']$/g, '') : '';
};

const rawUrl = getEnv('VITE_SUPABASE_URL') || getEnv('SUPABASE_URL') || '';
const rawKey = getEnv('VITE_SUPABASE_ANON_KEY') || getEnv('SUPABASE_ANON_KEY') || '';

// Cleaned URL: remove trailing slash if present
export const supabaseUrl = rawUrl.replace(/\/+$/, '');
export const supabaseAnonKey = rawKey;

/**
 * Checks whether valid Supabase client credentials are provided in the environment.
 */
export const isSupabaseConfigured = (): boolean => {
  return Boolean(
    supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl.startsWith('http') &&
    !supabaseUrl.includes('placeholder.supabase.co') &&
    !supabaseAnonKey.includes('placeholder-anon-key')
  );
};

/**
 * Validates actual network connectivity to the Supabase endpoint.
 */
export async function checkSupabaseConnectivity(): Promise<{
  ok: boolean;
  isPaused: boolean;
  message: string;
}> {
  if (!isSupabaseConfigured()) {
    return {
      ok: false,
      isPaused: false,
      message: 'Supabase credentials are not configured in environment variables.',
    };
  }

  try {
    // Ping Supabase Auth settings endpoint which is lightweight and public
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(`${supabaseUrl}/auth/v1/settings`, {
      method: 'GET',
      headers: {
        apikey: supabaseAnonKey,
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok || res.status === 200 || res.status === 401) {
      return {
        ok: true,
        isPaused: false,
        message: 'Connected to Supabase project.',
      };
    }

    if (res.status === 503 || res.status === 521 || res.status === 522) {
      return {
        ok: false,
        isPaused: true,
        message: 'Supabase project may be paused. Please unpause it in the Supabase Dashboard.',
      };
    }

    return {
      ok: false,
      isPaused: false,
      message: `Supabase returned status ${res.status}: ${res.statusText}`,
    };
  } catch (err: any) {
    const errStr = err?.message || String(err);
    const isDnsOrNetwork =
      errStr.includes('fetch failed') ||
      errStr.includes('ENOTFOUND') ||
      errStr.includes('Failed to fetch') ||
      errStr.includes('NetworkError') ||
      errStr.includes('aborted');

    return {
      ok: false,
      isPaused: isDnsOrNetwork,
      message: isDnsOrNetwork
        ? 'Cannot resolve Supabase project host. If you are on the Supabase free tier, your project may be paused. Unpause it in your Supabase Dashboard.'
        : `Network error connecting to Supabase: ${errStr}`,
    };
  }
}

/**
 * Single canonical Supabase client for authentication, database queries, and storage.
 */
const clientUrl = isSupabaseConfigured() ? supabaseUrl : 'https://placeholder.supabase.co';
const clientKey = isSupabaseConfigured() ? supabaseAnonKey : 'placeholder-anon-key';

export const supabase: SupabaseClient = createClient(clientUrl, clientKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  },
  global: {
    headers: {
      'x-application-name': 'tradeforge',
    },
  },
});

/**
 * Default storage buckets for TradeForge trading journal assets.
 */
export const STORAGE_BUCKETS = {
  TRADE_ATTACHMENTS: 'trade-attachments',
  SCREENSHOTS: 'screenshots',
  AVATARS: 'avatars',
  JOURNAL_ASSETS: 'journal-assets',
} as const;

/**
 * Upload an image or file asset to Supabase Storage and obtain its public CDN URL.
 */
export async function uploadToSupabaseStorage(
  file: File | Blob | string,
  bucket: string = STORAGE_BUCKETS.SCREENSHOTS,
  customPath?: string
): Promise<string> {
  if (!isSupabaseConfigured()) {
    if (typeof file === 'string') {
      return file;
    }
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(file as Blob);
    });
  }

  try {
    let fileBody: File | Blob;
    let contentType = 'image/png';
    let fileExtension = 'png';

    if (typeof file === 'string') {
      if (file.startsWith('data:')) {
        const matches = file.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
          contentType = matches[1];
          fileExtension = contentType.split('/')[1] || 'png';
          const byteCharacters = atob(matches[2]);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          fileBody = new Blob([byteArray], { type: contentType });
        } else {
          return file;
        }
      } else {
        return file;
      }
    } else {
      fileBody = file;
      contentType = file.type || 'image/png';
      fileExtension = file.type?.split('/')[1] || (file as File).name?.split('.').pop() || 'png';
    }

    const fileName = customPath || `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExtension}`;
    const filePath = fileName.startsWith('/') ? fileName.substring(1) : fileName;

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, fileBody, {
        contentType,
        upsert: true,
      });

    if (uploadError) {
      console.warn('[Supabase Storage] Upload warning:', uploadError.message);
      if (typeof file === 'string') return file;
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(fileBody);
      });
    }

    const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
    return data?.publicUrl || filePath;
  } catch (err: any) {
    console.warn('[Supabase Storage] Notice during upload:', err);
    if (typeof file === 'string') return file;
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(file as Blob);
    });
  }
}

/**
 * Delete a file or asset from Supabase Storage by its public URL or relative path.
 */
export async function deleteFromSupabaseStorage(
  filePathOrUrl: string,
  bucket: string = STORAGE_BUCKETS.JOURNAL_ASSETS
): Promise<boolean> {
  if (!isSupabaseConfigured() || !filePathOrUrl) return false;
  try {
    let cleanPath = filePathOrUrl;
    if (filePathOrUrl.includes('/storage/v1/object/public/')) {
      const parts = filePathOrUrl.split(`/storage/v1/object/public/${bucket}/`);
      if (parts.length > 1) {
        cleanPath = parts[1];
      }
    } else if (filePathOrUrl.startsWith('http://') || filePathOrUrl.startsWith('https://')) {
      // Not a standard bucket path or external URL
      return false;
    }
    const cleanRelativePath = cleanPath.startsWith('/') ? cleanPath.substring(1) : cleanPath;
    const { error } = await supabase.storage.from(bucket).remove([cleanRelativePath]);
    if (error) {
      console.warn(`[Supabase Storage] Notice during delete of ${cleanRelativePath}:`, error.message);
      return false;
    }
    return true;
  } catch (err: any) {
    console.warn('[Supabase Storage] Notice during delete:', err?.message || err);
    return false;
  }
}

