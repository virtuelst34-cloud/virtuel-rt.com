import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { BadgesProvider, useBadges } from '@/lib/contexts/BadgesContext';
import { TestProviders } from '../utils/testProviders';

describe('BadgesContext', () => {
  it('devrait fournir les fonctions de badges', () => {
    const { result } = renderHook(() => useBadges(), {
      wrapper: ({ children }) => (
        <TestProviders>
          <BadgesProvider>{children}</BadgesProvider>
        </TestProviders>
      ),
    });

    expect(result.current).toBeDefined();
  });

  it('devrait avoir customBadges défini', () => {
    const { result } = renderHook(() => useBadges(), {
      wrapper: ({ children }) => (
        <TestProviders>
          <BadgesProvider>{children}</BadgesProvider>
        </TestProviders>
      ),
    });

    expect(result.current.customBadges).toBeDefined();
  });

  it('devrait avoir une fonction setCustomBadges', () => {
    const { result } = renderHook(() => useBadges(), {
      wrapper: ({ children }) => (
        <TestProviders>
          <BadgesProvider>{children}</BadgesProvider>
        </TestProviders>
      ),
    });

    expect(result.current.setCustomBadges).toBeDefined();
  });

  it('devrait initialiser customBadges comme un tableau', () => {
    const { result } = renderHook(() => useBadges(), {
      wrapper: ({ children }) => (
        <TestProviders>
          <BadgesProvider>{children}</BadgesProvider>
        </TestProviders>
      ),
    });

    expect(Array.isArray(result.current.customBadges)).toBe(true);
  });
});
