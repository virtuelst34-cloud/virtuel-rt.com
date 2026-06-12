import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { SalonsProvider, useSalons } from '@/lib/contexts/SalonsContext';
import { TestProviders } from '../utils/testProviders';

describe('SalonsContext', () => {
  it('devrait fournir les salons', () => {
    const { result } = renderHook(() => useSalons(), {
      wrapper: ({ children }) => (
        <TestProviders>
          <SalonsProvider>{children}</SalonsProvider>
        </TestProviders>
      ),
    });

    expect(result.current).toBeDefined();
    expect(result.current.customSalons).toBeDefined();
  });

  it('devrait avoir une fonction addSalon', () => {
    const { result } = renderHook(() => useSalons(), {
      wrapper: ({ children }) => (
        <TestProviders>
          <SalonsProvider>{children}</SalonsProvider>
        </TestProviders>
      ),
    });

    expect(result.current.addSalon).toBeDefined();
  });

  it('devrait avoir une fonction deleteSalon', () => {
    const { result } = renderHook(() => useSalons(), {
      wrapper: ({ children }) => (
        <TestProviders>
          <SalonsProvider>{children}</SalonsProvider>
        </TestProviders>
      ),
    });

    expect(result.current.deleteSalon).toBeDefined();
  });

  it('devrait avoir une fonction setHiddenSalons', () => {
    const { result } = renderHook(() => useSalons(), {
      wrapper: ({ children }) => (
        <TestProviders>
          <SalonsProvider>{children}</SalonsProvider>
        </TestProviders>
      ),
    });

    expect(result.current.setHiddenSalons).toBeDefined();
  });

  it('devrait avoir hiddenSalons défini', () => {
    const { result } = renderHook(() => useSalons(), {
      wrapper: ({ children }) => (
        <TestProviders>
          <SalonsProvider>{children}</SalonsProvider>
        </TestProviders>
      ),
    });

    expect(result.current.hiddenSalons).toBeDefined();
  });
});
