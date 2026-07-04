import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { UserProvider, useUser } from '@/lib/contexts/UserContext'
import { NotificationsProvider } from '@/lib/contexts/NotificationsContext'

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

  it('should allow setting user via login', () => {
    const { result } = renderHook(() => useUser(), { wrapper })

    act(() => {
      result.current.login('TestUser', 'av1', 'TU')
    })

    expect(result.current.user).toBeDefined()
    expect(result.current.user?.name).toBe('TestUser')
  })

  it('should allow updating profile', () => {
    const { result } = renderHook(() => useUser(), { wrapper })

    act(() => {
      result.current.login('TestUser', 'av1', 'TU')
    })

    act(() => {
      result.current.updateProfile({ bio: 'Test bio' })
    })

    expect(result.current.user?.bio).toBe('Test bio')
  })
})
