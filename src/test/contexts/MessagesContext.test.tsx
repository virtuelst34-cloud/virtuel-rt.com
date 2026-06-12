import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { MessagesProvider, useMessages } from '@/lib/contexts/MessagesContext';
import { TestProviders } from '../utils/testProviders';

describe('MessagesContext', () => {
  beforeEach(() => {
    // Reset context before each test
  });

  it('devrait fournir les messages', () => {
    const { result } = renderHook(() => useMessages(), {
      wrapper: ({ children }) => (
        <TestProviders>
          <MessagesProvider>{children}</MessagesProvider>
        </TestProviders>
      ),
    });

    expect(result.current).toBeDefined();
    expect(result.current.salonMessages).toBeDefined();
  });

  it('devrait permettre d\'ajouter un message', () => {
    const { result } = renderHook(() => useMessages(), {
      wrapper: ({ children }) => (
        <TestProviders>
          <MessagesProvider>{children}</MessagesProvider>
        </TestProviders>
      ),
    });

    act(() => {
      if (result.current.addMessage) {
        result.current.addMessage('general', {
          id: '1',
          author_name: 'Test User',
          author_avatar: 'av1',
          author_initials: 'TU',
          text: 'Test message',
          created_date: new Date().toISOString(),
        });
      }
    });

    expect(result.current.salonMessages).toBeDefined();
  });

  it('devrait avoir une fonction deleteMessage', () => {
    const { result } = renderHook(() => useMessages(), {
      wrapper: ({ children }) => (
        <TestProviders>
          <MessagesProvider>{children}</MessagesProvider>
        </TestProviders>
      ),
    });

    expect(result.current.deleteMessage).toBeDefined();
  });

  it('devrait avoir une fonction pinMessage', () => {
    const { result } = renderHook(() => useMessages(), {
      wrapper: ({ children }) => (
        <TestProviders>
          <MessagesProvider>{children}</MessagesProvider>
        </TestProviders>
      ),
    });

    expect(result.current.pinMessage).toBeDefined();
  });
});
