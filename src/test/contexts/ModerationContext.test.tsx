import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { ModerationProvider, useModeration } from '@/lib/contexts/ModerationContext';
import { TestProviders } from '../utils/testProviders';

describe('ModerationContext', () => {
  it('devrait fournir les fonctions de modération', () => {
    const { result } = renderHook(() => useModeration(), {
      wrapper: ({ children }) => (
        <TestProviders>
          <ModerationProvider>{children}</ModerationProvider>
        </TestProviders>
      ),
    });

    expect(result.current).toBeDefined();
  });

  it('devrait avoir une fonction banUser', () => {
    const { result } = renderHook(() => useModeration(), {
      wrapper: ({ children }) => (
        <TestProviders>
          <ModerationProvider>{children}</ModerationProvider>
        </TestProviders>
      ),
    });

    expect(result.current.banUser).toBeDefined();
  });

  it('devrait avoir une fonction unbanUser', () => {
    const { result } = renderHook(() => useModeration(), {
      wrapper: ({ children }) => (
        <TestProviders>
          <ModerationProvider>{children}</ModerationProvider>
        </TestProviders>
      ),
    });

    expect(result.current.unbanUser).toBeDefined();
  });

  it('devrait avoir une fonction muteUser', () => {
    const { result } = renderHook(() => useModeration(), {
      wrapper: ({ children }) => (
        <TestProviders>
          <ModerationProvider>{children}</ModerationProvider>
        </TestProviders>
      ),
    });

    expect(result.current.muteUser).toBeDefined();
  });

  it('devrait avoir une fonction unmuteUser', () => {
    const { result } = renderHook(() => useModeration(), {
      wrapper: ({ children }) => (
        <TestProviders>
          <ModerationProvider>{children}</ModerationProvider>
        </TestProviders>
      ),
    });

    expect(result.current.unmuteUser).toBeDefined();
  });

  it('devrait avoir une fonction reportMessage', () => {
    const { result } = renderHook(() => useModeration(), {
      wrapper: ({ children }) => (
        <TestProviders>
          <ModerationProvider>{children}</ModerationProvider>
        </TestProviders>
      ),
    });

    expect(result.current.reportMessage).toBeDefined();
  });

  it('devrait avoir une fonction blockUser', () => {
    const { result } = renderHook(() => useModeration(), {
      wrapper: ({ children }) => (
        <TestProviders>
          <ModerationProvider>{children}</ModerationProvider>
        </TestProviders>
      ),
    });

    expect(result.current.blockUser).toBeDefined();
  });
});
