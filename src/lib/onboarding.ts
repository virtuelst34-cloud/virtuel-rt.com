/** Onboarding court post-login / invité — dismissible, une seule fois. */

export const ONBOARDING_DONE_KEY = 'virtuel_rt_onboarding_done';
export const LAST_SALON_KEY = 'virtuel_rt_last_salon';
export const FAVORITE_SALON_KEY = 'virtuel_rt_favorite_salon';
export const FEATURED_SALON_KEY = 'virtuel_rt_featured_salon';

export function isOnboardingDone(): boolean {
  try {
    return localStorage.getItem(ONBOARDING_DONE_KEY) === '1';
  } catch {
    return false;
  }
}

export function markOnboardingDone(): void {
  try {
    localStorage.setItem(ONBOARDING_DONE_KEY, '1');
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
