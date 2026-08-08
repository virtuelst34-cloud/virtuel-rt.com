import { supabase } from './supabase';

const GUEST_TOKEN_KEY = 'virtuel_rt_guest_token';

export interface GuestSessionResult {
  success: boolean;
  error?: string;
  sessionToken?: string;
  guestName?: string;
  avatar?: string;
  initials?: string;
  expiresAt?: string;
}

export function getStoredGuestToken(): string | null {
  try {
    return localStorage.getItem(GUEST_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function storeGuestToken(token: string): void {
  try {
    localStorage.setItem(GUEST_TOKEN_KEY, token);
  } catch {
    /* ignore */
  }
}

export function clearGuestToken(): void {
  try {
    localStorage.removeItem(GUEST_TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

/** Définit le contexte RLS invité côté Postgres (à appeler avant requêtes anon sensibles). */
export async function ensureGuestSessionContext(): Promise<void> {
  const token = getStoredGuestToken();
  if (!token) return;
  const { error } = await supabase.rpc('set_guest_session', { p_token: token });
  if (error) console.warn('set_guest_session:', error.message);
}

export async function clearGuestSessionContext(): Promise<void> {
  await supabase.rpc('set_guest_session', { p_token: '' });
}

export async function registerGuestSession(
  name: string,
  avatar: string,
  initials: string,
  existingToken?: string | null,
): Promise<GuestSessionResult> {
  const token = existingToken || getStoredGuestToken() || undefined;

  const { data, error } = await supabase.rpc('register_guest_session', {
    p_name: name.trim(),
    p_avatar: avatar,
    p_initials: initials,
    p_session_token: token ?? null,
  });

  if (error) {
    console.error('register_guest_session:', error);
    return { success: false, error: error.message || 'Impossible de créer la session invité' };
  }

  const result = data as GuestSessionResult & { session_token?: string; guest_name?: string; expires_at?: string };
  if (!result?.success) {
    return { success: false, error: result?.error || 'Pseudo indisponible' };
  }

  const sessionToken = result.session_token || result.sessionToken;
  if (sessionToken) storeGuestToken(sessionToken);

  return {
    success: true,
    sessionToken,
    guestName: result.guest_name || result.guestName || name,
    avatar: result.avatar || avatar,
    initials: result.initials || initials,
    expiresAt: result.expires_at || result.expiresAt,
  };
}

export async function validateGuestSession(token: string): Promise<GuestSessionResult> {
  // RPC only — direct SELECT on guest_sessions is locked (token leak risk)
  const { data, error } = await supabase.rpc('validate_guest_session', { p_token: token });

  if (error) {
    return { success: false, error: error.message || 'Session invité invalide' };
  }

  const result = data as GuestSessionResult & {
    session_token?: string;
    guest_name?: string;
    expires_at?: string;
    error?: string;
  };

  if (!result?.success) {
    const err = result?.error || 'Session invité invalide';
    if (/expir/i.test(err)) clearGuestToken();
    return { success: false, error: err };
  }

  return {
    success: true,
    sessionToken: result.session_token || result.sessionToken || token,
    guestName: result.guest_name || result.guestName,
    avatar: result.avatar,
    initials: result.initials,
    expiresAt: result.expires_at || result.expiresAt,
  };
}
