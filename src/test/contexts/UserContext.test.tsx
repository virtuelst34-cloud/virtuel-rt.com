import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { UserProvider, useUser } from '@/lib/contexts/UserContext'
import { NotificationsProvider } from '@/lib/contexts/NotificationsContext'

vi.mock('@/lib/guestAuthService', () => ({
  registerGuestSession: vi.fn(async (name: string, avatar: string, initials: string) => ({
    success: true,
    guestName: name,
    avatar,
    initials,
    sessionToken: 'test-token',
  })),
  validateGuestSession: vi.fn(async () => ({ success: false })),
  getStoredGuestToken: vi.fn(() => null),
  clearGuestToken: vi.fn(),
  storeGuestToken: vi.fn(),
}))

function wrapper({ children }: { children: React.ReactNode }) {
  return (
    <NotificationsProvider>
      <UserProvider>{children}</UserProvider>
    </NotificationsProvider>
  )
}

describe('UserContext', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('should provide user context', () => {
    const { result } = renderHook(() => useUser(), { wrapper })

    expect(result.current).toBeDefined()
    expect(result.current.user).toBeNull()
  })

  it('should allow setting user via login', async () => {
    const { result } = renderHook(() => useUser(), { wrapper })

    await act(async () => {
      await result.current.login('TestUser', 'av1', 'TU')
    })

    await waitFor(() => {
      expect(result.current.user?.name).toBe('TestUser')
    })
  })

  it('should allow updating profile', async () => {
    const { result } = renderHook(() => useUser(), { wrapper })

    await act(async () => {
      await result.current.login('TestUser', 'av1', 'TU')
    })

    act(() => {
      result.current.updateProfile({ bio: 'Test bio' })
    })

    expect(result.current.user?.bio).toBe('Test bio')
  })
})
