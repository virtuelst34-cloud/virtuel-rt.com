import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { UserProvider, useUser } from '@/lib/contexts/UserContext'

describe('UserContext', () => {
  beforeEach(() => {
    // Reset localStorage before each test
    localStorage.clear()
  })

  it('should provide user context', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <UserProvider>{children}</UserProvider>
    )

    const { result } = renderHook(() => useUser(), { wrapper })

    expect(result.current).toBeDefined()
    expect(result.current.user).toBeNull()
  })

  it('should allow setting user via login', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <UserProvider>{children}</UserProvider>
    )

    const { result } = renderHook(() => useUser(), { wrapper })

    act(() => {
      result.current.login('TestUser', 'av1', 'TU')
    })

    expect(result.current.user).toBeDefined()
    expect(result.current.user?.name).toBe('TestUser')
  })

  it('should allow updating profile', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <UserProvider>{children}</UserProvider>
    )

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
