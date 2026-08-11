import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { SalonsProvider, useSalons } from '@/lib/contexts/SalonsContext';
import { TestProviders } from '../utils/testProviders';

describe('SalonsContext', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/');
  });

  afterEach(() => {
    window.history.replaceState(null, '', '/');
  });

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

  it('écrit #salon/:id à l’entrée et l’efface sur Accueil', () => {
    const { result } = renderHook(() => useSalons(), {
      wrapper: ({ children }) => (
        <TestProviders>
          <SalonsProvider>{children}</SalonsProvider>
        </TestProviders>
      ),
    });

    act(() => {
      result.current.setCurrentSalon('musique60');
    });
    expect(window.location.hash).toBe('#salon/musique60');

    act(() => {
      result.current.setCurrentSalon(null);
    });
    expect(window.location.hash).toBe('');
    expect(result.current.currentSalon).toBeNull();
  });

  it('ne restaure pas le dernier salon depuis localStorage sans hash', () => {
    localStorage.setItem('virtuel_rt_last_salon', 'musique60');
    window.history.replaceState(null, '', '/');

    const { result } = renderHook(() => useSalons(), {
      wrapper: ({ children }) => (
        <TestProviders>
          <SalonsProvider>{children}</SalonsProvider>
        </TestProviders>
      ),
    });

    expect(result.current.currentSalon).toBeNull();
    expect(window.location.hash).toBe('');
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
