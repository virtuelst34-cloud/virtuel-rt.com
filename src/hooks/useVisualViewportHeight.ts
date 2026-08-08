import { useEffect } from 'react';

/**
 * Sync `--vv-height` with the visual viewport so the mobile shell
 * shrinks above the on-screen keyboard (iOS/Android).
 */
export function useVisualViewportHeight(enabled = true): void {
  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    const root = document.documentElement;
    const vv = window.visualViewport;

    const sync = () => {
      const h = vv?.height ?? window.innerHeight;
      root.style.setProperty('--vv-height', `${Math.round(h)}px`);
    };

    sync();
    vv?.addEventListener('resize', sync);
    vv?.addEventListener('scroll', sync);
    window.addEventListener('resize', sync);

    return () => {
      vv?.removeEventListener('resize', sync);
      vv?.removeEventListener('scroll', sync);
      window.removeEventListener('resize', sync);
      root.style.removeProperty('--vv-height');
    };
  }, [enabled]);
}
