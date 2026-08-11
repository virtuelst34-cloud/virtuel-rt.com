/** Onboarding court post-login / invité — dismissible, une seule fois par identité. */

export const ONBOARDING_DONE_KEY = 'virtuel_rt_onboarding_done';
export const LAST_SALON_KEY = 'virtuel_rt_last_salon';
export const FAVORITE_SALON_KEY = 'virtuel_rt_favorite_salon';
export const FEATURED_SALON_KEY = 'virtuel_rt_featured_salon';

/** Identité stable pour le flag « done » (évite qu’un skip global bloque les nouveaux comptes). */
export function onboardingUserKey(user: {
  id?: string | null;
  name?: string | null;
} | null | undefined): string | null {
  if (!user?.name?.trim()) return null;
  // Compte auth : id UUID ; invité : pas d’id → clé par pseudo
  if (user.id) return `uid:${user.id}`;
  return `guest:${user.name.trim().toLowerCase()}`;
}

function storageKeyFor(userKey: string): string {
  return `${ONBOARDING_DONE_KEY}:${userKey}`;
}

export function isOnboardingDone(userKey?: string | null): boolean {
  try {
    if (!userKey) return false;
    return localStorage.getItem(storageKeyFor(userKey)) === '1';
  } catch {
    return false;
  }
}

/** Ne marquer « done » qu’après Terminer ou Passer explicite — jamais à l’entrée. */
export function markOnboardingDone(userKey?: string | null): void {
  try {
    if (!userKey) return;
    localStorage.setItem(storageKeyFor(userKey), '1');
    // Ancienne clé globale : ne plus s’en servir pour bloquer d’autres comptes
    localStorage.removeItem(ONBOARDING_DONE_KEY);
  } catch {
    /* ignore */
  }
}

/** Dev / admin : réaffiche le guide pour l’identité courante. */
export function resetOnboardingDone(userKey?: string | null): void {
  try {
    if (userKey) localStorage.removeItem(storageKeyFor(userKey));
    localStorage.removeItem(ONBOARDING_DONE_KEY);
  } catch {
    /* ignore */
  }
}

export function getLastSalonId(): string | null {
  try {
    return localStorage.getItem(LAST_SALON_KEY);
  } catch {
    return null;
  }
}

export function setLastSalonId(salonId: string): void {
  try {
    localStorage.setItem(LAST_SALON_KEY, salonId);
  } catch {
    /* ignore */
  }
}

export function getFavoriteSalonId(): string | null {
  try {
    return localStorage.getItem(FAVORITE_SALON_KEY);
  } catch {
    return null;
  }
}

export function setFavoriteSalonId(salonId: string | null): void {
  try {
    if (!salonId) localStorage.removeItem(FAVORITE_SALON_KEY);
    else localStorage.setItem(FAVORITE_SALON_KEY, salonId);
  } catch {
    /* ignore */
  }
}

export function getFeaturedSalonId(): string | null {
  try {
    return localStorage.getItem(FEATURED_SALON_KEY);
  } catch {
    return null;
  }
}

export function setFeaturedSalonId(salonId: string | null): void {
  try {
    if (!salonId) localStorage.removeItem(FEATURED_SALON_KEY);
    else localStorage.setItem(FEATURED_SALON_KEY, salonId);
  } catch {
    /* ignore */
  }
}
