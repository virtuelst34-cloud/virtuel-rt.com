const PREFIX = 'virtuel_rt';

export function prefsStorageKey(userKey: string, field: string): string {
  return `${PREFIX}_${field}_${userKey}`;
}

export function readPrefsField(userKey: string, field: string): string | null {
  try {
    return localStorage.getItem(prefsStorageKey(userKey, field));
  } catch {
    return null;
  }
}

export function writePrefsField(userKey: string, field: string, value: string): void {
  try {
    localStorage.setItem(prefsStorageKey(userKey, field), value);
  } catch {
    /* ignore */
  }
}

export const GUEST_PROFILE_CACHE_KEY = `${PREFIX}_guest_profile_cache`;

export function saveGuestProfileCache(profile: Record<string, unknown>): void {
  try {
    localStorage.setItem(GUEST_PROFILE_CACHE_KEY, JSON.stringify(profile));
  } catch {
    /* ignore */
  }
}

export function loadGuestProfileCache(): Record<string, unknown> | null {
  try {
    const raw = localStorage.getItem(GUEST_PROFILE_CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
