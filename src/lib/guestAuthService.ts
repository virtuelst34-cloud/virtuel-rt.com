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
  const { data, error } = await supabase
    .from('guest_sessions')
    .select('guest_name, avatar, initials, expires_at, session_token')
    .eq('session_token', token)
    .maybeSingle();

  if (error || !data) {
    return { success: false, error: 'Session invité invalide' };
  }

  if (new Date(data.expires_at).getTime() < Date.now()) {
    clearGuestToken();
    return { success: false, error: 'Session invité expirée' };
  }

  return {
    success: true,
    sessionToken: data.session_token,
    guestName: data.guest_name,
    avatar: data.avatar,
    initials: data.initials,
    expiresAt: data.expires_at,
  };
}
