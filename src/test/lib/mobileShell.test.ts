import { describe, it, expect } from 'vitest';
import type { MobileSurface } from '@/lib/mobileShell';

/** Miroir de la dérivation Home — garde le contrat 1 surface active. */
function deriveSurface(opts: {
  showSettings: boolean;
  showNotif: boolean;
  showDM: boolean;
  mobileSalonsOpen: boolean;
  currentSalon: string | null;
}): MobileSurface {
  if (opts.showSettings) return 'settings';
  if (opts.showNotif) return 'notifs';
  if (opts.showDM) return 'dm';
  if (opts.mobileSalonsOpen) return 'salons';
  if (opts.currentSalon) return 'salon';
  return 'home';
}

describe('mobile shell surface', () => {
  it('priorise settings / notifs / dm sur le salon', () => {
    expect(
      deriveSurface({
        showSettings: true,
        showNotif: true,
        showDM: true,
        mobileSalonsOpen: true,
        currentSalon: 'general',
      }),
    ).toBe('settings');
  });

  it('salons plein écran avant accueil', () => {
    expect(
      deriveSurface({
        showSettings: false,
        showNotif: false,
        showDM: false,
        mobileSalonsOpen: true,
        currentSalon: null,
      }),
    ).toBe('salons');
  });

  it('salon actif sans overlay', () => {
    expect(
      deriveSurface({
        showSettings: false,
        showNotif: false,
        showDM: false,
        mobileSalonsOpen: false,
        currentSalon: 'general',
      }),
    ).toBe('salon');
  });
});
