import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { MessagesProvider, useMessages } from '@/lib/contexts/MessagesContext'

const getMessages = vi.fn()
const addMessage = vi.fn()
const subscribeToMessages = vi.fn(() => ({
  on: vi.fn().mockReturnThis(),
  subscribe: vi.fn().mockReturnThis(),
}))

vi.mock('@/lib/supabaseDb', () => ({
  supabaseDbService: {
    getMessages: (...args: unknown[]) => getMessages(...args),
    addMessage: (...args: unknown[]) => addMessage(...args),
    subscribeToMessages: (...args: unknown[]) => subscribeToMessages(...args),
    deleteMessage: vi.fn(),
    updateMessage: vi.fn(),
  },
}))

vi.mock('@/lib/offlineMode', () => ({
  offlineModeService: {
    setSyncHandler: vi.fn(),
    isOffline: vi.fn(() => false),
    addPendingAction: vi.fn(),
    cacheMessage: vi.fn(),
    clearSalonCache: vi.fn(),
    getCachedMessages: vi.fn(() => []),
  },
}))

function wrapper({ children }: { children: ReactNode }) {
  return <MessagesProvider>{children}</MessagesProvider>
}

function dbRow(partial: {
  id: string
  text: string
  created_at: string
  author_name?: string
}) {
  return {
    id: partial.id,
    salon_id: 'general',
    author_name: partial.author_name || 'Ami',
    author_avatar: 'av1',
    author_initials: 'AM',
    text: partial.text,
    created_at: partial.created_at,
    created_date: partial.created_at,
    reactions: {},
    pinned: false,
    is_system: false,
    is_announcement: false,
  }
}

describe('MessagesContext sync phone→PC', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getMessages.mockResolvedValue([])
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('ne remplace pas un message realtime déjà reçu quand le REST initial revient', async () => {
    let resolveFetch: (value: unknown[]) => void = () => {}
    getMessages.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveFetch = resolve
        }),
    )

    const { result } = renderHook(() => useMessages(), { wrapper })

    act(() => {
      result.current.setCurrentSalonId('general')
    })

    await waitFor(() => {
      expect(subscribeToMessages).toHaveBeenCalled()
    })

    const handlers = subscribeToMessages.mock.calls[0][1] as {
      onInsert: (row: ReturnType<typeof dbRow>) => void
    }

    // Ami envoie pendant le fetch REST (cas téléphone → PC)
    act(() => {
      handlers.onInsert(
        dbRow({
          id: 'realtime-1',
          text: 'depuis le tel',
          created_at: '2026-08-08T23:00:01.000Z',
        }),
      )
    })

    expect(result.current.salonMessages.general?.some((m) => m.id === 'realtime-1')).toBe(true)

    // REST revient sans ce message (race / stale) → doit merger, pas écraser
    await act(async () => {
      resolveFetch([
        dbRow({
          id: 'older-1',
          text: 'ancien',
          created_at: '2026-08-08T22:59:00.000Z',
        }),
      ])
      await Promise.resolve()
    })

    await waitFor(() => {
      const ids = (result.current.salonMessages.general || []).map((m) => m.id)
      expect(ids).toContain('realtime-1')
      expect(ids).toContain('older-1')
    })
  })

  it('retire la bulle fantôme si insert_own_message renvoie null', async () => {
    addMessage.mockResolvedValue(null)
    getMessages.mockResolvedValue([])

    const { result } = renderHook(() => useMessages(), { wrapper })

    await act(async () => {
      await result.current.addMessage('general', {
        id: 'temp-xyz',
        author_name: 'Moi',
        author_avatar: 'av1',
        author_initials: 'MO',
        text: 'fantôme',
        created_date: new Date().toISOString(),
      })
    })

    await waitFor(() => {
      expect(result.current.salonMessages.general?.some((m) => m.id === 'temp-xyz')).toBe(false)
    })
  })
})
