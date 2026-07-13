import { expect, afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import '@testing-library/jest-dom'

const createQueryBuilder = () => {
  const response = { data: [] as unknown[], error: null as null }
  const builder: Record<string, unknown> = {
    select: vi.fn(() => builder),
    insert: vi.fn(() => builder),
    update: vi.fn(() => builder),
    delete: vi.fn(() => builder),
    upsert: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    neq: vi.fn(() => builder),
    order: vi.fn(() => builder),
    limit: vi.fn(() => builder),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
  }

  builder.then = (onFulfilled: (value: typeof response) => unknown) =>
    Promise.resolve(response).then(onFulfilled)

  return builder
}

vi.mock('@/lib/supabase', () => {
  const channel = {
    on: vi.fn(() => channel),
    subscribe: vi.fn(() => channel),
    unsubscribe: vi.fn(),
  }

  return {
    supabase: {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
        signUp: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
        signInWithPassword: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
        signInWithOAuth: vi.fn().mockResolvedValue({ data: {}, error: null }),
        signOut: vi.fn().mockResolvedValue({ error: null }),
        resend: vi.fn().mockResolvedValue({ error: null }),
        onAuthStateChange: vi.fn(() => ({
          data: { subscription: { unsubscribe: vi.fn() } },
        })),
      },
      from: vi.fn(() => createQueryBuilder()),
      channel: vi.fn(() => channel),
      removeChannel: vi.fn(),
    },
  }
})

vi.mock('@/lib/presenceService', () => ({
  presenceService: {
    initialize: vi.fn().mockResolvedValue(undefined),
    setOnline: vi.fn().mockResolvedValue(undefined),
    setOffline: vi.fn().mockResolvedValue(undefined),
    updateUserSalon: vi.fn().mockResolvedValue(undefined),
    updateStatus: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn(),
    subscribe: vi.fn(() => vi.fn()),
    getOnlineUsers: vi.fn(() => []),
    getOnlineUsersInSalon: vi.fn(() => []),
    getOnlineCountInSalon: vi.fn(() => 0),
    getAllSalonPresence: vi.fn(() => new Map()),
  },
}))

// Cleanup after each test
afterEach(() => {
  cleanup()
})

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})
