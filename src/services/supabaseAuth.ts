import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { User, Session, AuthChangeEvent, EmailOtpType } from '@supabase/supabase-js';
import { upsertProfileToSupabase } from './supabaseDataService';

export interface AuthResponse {
  user: User | null;
  session: Session | null;
  error: Error | null;
  needsEmailConfirmation?: boolean;
}

export interface AuthRedirectResult {
  handled: boolean;
  type?: 'signup_confirmation' | 'recovery' | 'magiclink' | 'oauth';
  session?: Session | null;
  error?: Error | null;
}

/**
 * Normalizes error messages from Supabase or network failures into helpful messages.
 */
export function normalizeAuthError(err: any): Error {
  const msg = err?.message || String(err);
  if (
    msg.includes('fetch failed') ||
    msg.includes('ENOTFOUND') ||
    msg.includes('Failed to fetch') ||
    msg.includes('NetworkError')
  ) {
    return new Error(
      'Cannot reach Supabase project. If your project is on the Supabase free tier, it may be paused due to inactivity. Please open your Supabase Dashboard to unpause it.'
    );
  }
  if (msg.includes('Invalid login credentials') || msg.includes('invalid_grant')) {
    return new Error('Invalid email or password. Please verify your credentials.');
  }
  if (msg.includes('User already registered') || msg.includes('already registered')) {
    return new Error('An account with this email already exists. Please sign in instead.');
  }
  if (msg.includes('Email not confirmed') || msg.includes('email_not_confirmed')) {
    return new Error('Please check your inbox to confirm your email before signing in.');
  }
  if (
    msg.includes('Email link is invalid or has expired') ||
    msg.includes('otp_expired') ||
    msg.includes('token has expired') ||
    msg.includes('invalid token')
  ) {
    return new Error('This verification link has expired or is invalid. Please request a new confirmation link.');
  }
  if (msg.includes('rate limit') || msg.includes('over_email_send_rate_limit')) {
    return new Error('Too many email requests. Please wait a moment before trying again.');
  }
  return new Error(msg);
}

/**
 * Register a new user with Supabase Auth.
 * Includes user metadata with full name and automatically provisions a profile.
 * Correctly detects whether email verification is required.
 */
export async function signUpWithEmail(
  email: string,
  password: string,
  fullName: string = 'Trader'
): Promise<AuthResponse> {
  const cleanEmail = email.trim();
  const cleanName = fullName.trim() || 'Trader';
  const redirectUrl = typeof window !== 'undefined' ? `${window.location.origin}/` : undefined;

  try {
    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: cleanName,
          name: cleanName,
        },
      },
    });

    if (error) {
      throw normalizeAuthError(error);
    }

    const needsEmailConfirmation = Boolean(data.user && !data.session);

    // If session is immediately available (auto-confirm is ON), save local auth flags
    if (data.session && data.user) {
      try {
        localStorage.setItem('tradeforge_authenticated', 'true');
        localStorage.setItem('tradeforge_user_id', data.user.id);
      } catch {}

      const generatedCode = `TF-MTR-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      await upsertProfileToSupabase({
        id: data.user.id,
        name: cleanName,
        email: cleanEmail,
        accountCode: generatedCode,
        experienceLevel: 'Intermediate',
      }).catch((e) => console.warn('[Profile Provision] Notice:', e));
    }

    return {
      user: data.user,
      session: data.session,
      error: null,
      needsEmailConfirmation,
    };
  } catch (err: any) {
    throw normalizeAuthError(err);
  }
}

/**
 * Sign in an existing user with Supabase Auth.
 */
export async function signInWithEmail(
  email: string,
  password: string
): Promise<AuthResponse> {
  const cleanEmail = email.trim();

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password,
    });

    if (error) {
      throw normalizeAuthError(error);
    }

    if (data.session) {
      try {
        localStorage.setItem('tradeforge_authenticated', 'true');
        if (data.user?.id) {
          localStorage.setItem('tradeforge_user_id', data.user.id);
        }
      } catch {}
    }

    return {
      user: data.user,
      session: data.session,
      error: null,
    };
  } catch (err: any) {
    throw normalizeAuthError(err);
  }
}

/**
 * Demo Sign In helper for quick inspection and review.
 */
export async function signInDemoUser(): Promise<AuthResponse> {
  try {
    return await signInWithEmail('alex.river@tradeforge.com', 'TradeForge2026!');
  } catch {
    // If remote is paused, provide local demo session
    const demoUser: User = {
      id: 'usr_demo_trader_alex',
      app_metadata: { provider: 'email' },
      user_metadata: { full_name: 'Alex River', name: 'Alex River' },
      aud: 'authenticated',
      created_at: new Date().toISOString(),
      email: 'alex.river@tradeforge.com',
      role: 'authenticated',
      updated_at: new Date().toISOString(),
    };
    const demoSession: Session = {
      access_token: `demo_token_${Date.now()}`,
      token_type: 'bearer',
      expires_in: 3600 * 24 * 30,
      refresh_token: `demo_rf_${Date.now()}`,
      user: demoUser,
    };
    try {
      localStorage.setItem('tradeforge_authenticated', 'true');
      localStorage.setItem('tf_demo_session', JSON.stringify(demoSession));
    } catch {}

    return {
      user: demoUser,
      session: demoSession,
      error: null,
    };
  }
}

/**
 * Sign out the current user and clear session state.
 */
export async function signOutUser(): Promise<void> {
  try {
    localStorage.removeItem('tradeforge_authenticated');
    localStorage.removeItem('tradeforge_user_id');
    localStorage.removeItem('tradeforge_active_note_id');
    localStorage.removeItem('tf_demo_session');
  } catch {}

  try {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.warn('Sign out notice:', error.message);
    }
  } catch (err) {
    console.warn('Sign out network notice:', err);
  }
}

/**
 * Retrieve the active Supabase authentication session.
 */
export async function getSession(): Promise<Session | null> {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (!error && data?.session) return data.session;

    // Check demo session
    const demoRaw = localStorage.getItem('tf_demo_session');
    if (demoRaw) {
      return JSON.parse(demoRaw);
    }
    return null;
  } catch {
    const demoRaw = localStorage.getItem('tf_demo_session');
    if (demoRaw) {
      try {
        return JSON.parse(demoRaw);
      } catch {}
    }
    return null;
  }
}

/**
 * Retrieve the current authenticated Supabase user.
 */
export async function getUser(): Promise<User | null> {
  try {
    const session = await getSession();
    return session?.user || null;
  } catch {
    return null;
  }
}

/**
 * Reset password via email.
 */
export async function resetPassword(email: string): Promise<void> {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
    if (error) {
      throw normalizeAuthError(error);
    }
  } catch (err) {
    throw normalizeAuthError(err);
  }
}

/**
 * Subscribe to Supabase authentication state changes.
 */
export function onAuthStateChange(
  callback: (event: AuthChangeEvent, session: Session | null) => void
) {
  return supabase.auth.onAuthStateChange(callback);
}

/**
 * Exchange PKCE authorization code from confirmation/recovery link for a valid session.
 */
export async function exchangeCodeForSession(code: string): Promise<AuthResponse> {
  try {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      throw normalizeAuthError(error);
    }
    if (data.session && data.user) {
      try {
        localStorage.setItem('tradeforge_authenticated', 'true');
        localStorage.setItem('tradeforge_user_id', data.user.id);
      } catch {}
    }
    return {
      user: data.user,
      session: data.session,
      error: null,
    };
  } catch (err: any) {
    throw normalizeAuthError(err);
  }
}

/**
 * Verify OTP / Token Hash from email verification link or manual OTP entry.
 */
export async function verifyEmailOtp(
  firstArg: string,
  secondArg?: string,
  thirdArg?: EmailOtpType
): Promise<AuthResponse> {
  try {
    let verifyParams: any;

    if (thirdArg || (secondArg && secondArg.length <= 10 && firstArg.includes('@'))) {
      // Called as verifyEmailOtp(email, token, type)
      verifyParams = {
        email: firstArg.trim(),
        token: (secondArg || '').trim(),
        type: (thirdArg || 'signup') as EmailOtpType,
      };
    } else {
      // Called as verifyEmailOtp(token_hash, type)
      verifyParams = {
        token_hash: firstArg.trim(),
        type: ((secondArg as EmailOtpType) || 'email'),
      };
    }

    const { data, error } = await supabase.auth.verifyOtp(verifyParams);
    if (error) {
      throw normalizeAuthError(error);
    }
    if (data.session && data.user) {
      try {
        localStorage.setItem('tradeforge_authenticated', 'true');
        localStorage.setItem('tradeforge_user_id', data.user.id);
      } catch {}
    }
    return {
      user: data.user,
      session: data.session,
      error: null,
    };
  } catch (err: any) {
    throw normalizeAuthError(err);
  }
}

/**
 * Resend verification confirmation email to a user.
 */
export async function resendVerificationEmail(email: string): Promise<{ success: boolean; message: string }> {
  const cleanEmail = email.trim();
  const redirectUrl = typeof window !== 'undefined' ? `${window.location.origin}/` : undefined;

  try {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: cleanEmail,
      options: {
        emailRedirectTo: redirectUrl,
      },
    });

    if (error) {
      throw normalizeAuthError(error);
    }

    return {
      success: true,
      message: `Confirmation email sent to ${cleanEmail}. Please check your inbox.`,
    };
  } catch (err: any) {
    throw normalizeAuthError(err);
  }
}

/**
 * Detects and handles any incoming auth confirmation, recovery, or OAuth redirects in the URL.
 * Automatically exchanges authorization codes or processes token hashes, clears URL artifacts,
 * and returns the outcome.
 */
export async function handleAuthRedirect(): Promise<AuthRedirectResult> {
  if (typeof window === 'undefined') return { handled: false };

  const urlParams = new URLSearchParams(window.location.search);
  const hashParams = new URLSearchParams(window.location.hash.startsWith('#') ? window.location.hash.substring(1) : window.location.hash);

  // Check for error parameters in query or hash (e.g. expired link)
  const errorParam = urlParams.get('error') || hashParams.get('error');
  const errorDesc = urlParams.get('error_description') || hashParams.get('error_description');
  const errorCode = urlParams.get('error_code') || hashParams.get('error_code');

  if (errorParam || errorDesc) {
    const rawMsg = decodeURIComponent(errorDesc || errorParam || 'Authentication failed');
    const normalizedErr = normalizeAuthError(rawMsg);

    // Clean URL params to prevent stale error loops
    try {
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);
    } catch {}

    return {
      handled: true,
      error: normalizedErr,
    };
  }

  // Check for PKCE authorization code
  const code = urlParams.get('code');
  if (code) {
    try {
      const { session, user } = await exchangeCodeForSession(code);
      // Clean query parameter from URL
      try {
        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
      } catch {}

      return {
        handled: true,
        type: 'signup_confirmation',
        session,
      };
    } catch (err: any) {
      // Clean query parameter from URL
      try {
        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
      } catch {}

      return {
        handled: true,
        error: normalizeAuthError(err),
      };
    }
  }

  // Check for token_hash & type (email verification link)
  const token_hash = urlParams.get('token_hash');
  const type = (urlParams.get('type') as EmailOtpType) || 'email';
  if (token_hash) {
    try {
      const { session } = await verifyEmailOtp(token_hash, type);
      try {
        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
      } catch {}

      return {
        handled: true,
        type: 'signup_confirmation',
        session,
      };
    } catch (err: any) {
      try {
        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
      } catch {}

      return {
        handled: true,
        error: normalizeAuthError(err),
      };
    }
  }

  // Check for hash tokens (Implicit flow or recovery)
  const accessToken = hashParams.get('access_token');
  const hashType = hashParams.get('type');
  if (accessToken) {
    try {
      const { data } = await supabase.auth.getSession();
      if (data?.session) {
        localStorage.setItem('tradeforge_authenticated', 'true');
        localStorage.setItem('tradeforge_user_id', data.session.user.id);
      }
      try {
        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
      } catch {}

      return {
        handled: true,
        type: hashType === 'recovery' ? 'recovery' : 'signup_confirmation',
        session: data?.session,
      };
    } catch {}
  }

  return { handled: false };
}
