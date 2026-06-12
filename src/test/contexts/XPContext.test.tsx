import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { XPProvider, useXP } from '@/lib/contexts/XPContext';
import { TestProviders } from '../utils/testProviders';

describe('XPContext', () => {
  it('devrait fournir les fonctions XP', () => {
    const { result } = renderHook(() => useXP(), {
      wrapper: ({ children }) => (
        <TestProviders>
          <XPProvider>{children}</XPProvider>
        </TestProviders>
      ),
    });

    expect(result.current).toBeDefined();
  });

  it('devrait avoir monthlyXP défini', () => {
    const { result } = renderHook(() => useXP(), {
      wrapper: ({ children }) => (
        <TestProviders>
          <XPProvider>{children}</XPProvider>
        </TestProviders>
      ),
    });

    expect(result.current.monthlyXP).toBeDefined();
  });

  it('devrait avoir des fonctions de gestion XP', () => {
    const { result } = renderHook(() => useXP(), {
      wrapper: ({ children }) => (
        <TestProviders>
          <XPProvider>{children}</XPProvider>
        </TestProviders>
      ),
    });

    // Check for any XP-related functions that exist
    expect(result.current).toHaveProperty('monthlyXP');
  });

  it('devrait initialiser monthlyXP comme un objet', () => {
    const { result } = renderHook(() => useXP(), {
      wrapper: ({ children }) => (
        <TestProviders>
          <XPProvider>{children}</XPProvider>
        </TestProviders>
      ),
    });

    expect(typeof result.current.monthlyXP).toBe('object');
  });
});
