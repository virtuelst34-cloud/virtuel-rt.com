import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { FriendsProvider, useFriends } from '@/lib/contexts/FriendsContext'
import { NotificationsProvider } from '@/lib/contexts/NotificationsContext'
import { UserProvider } from '@/lib/contexts/UserContext'
import type { ReactNode } from 'react'

vi.mock('@/lib/supabaseDb', () => ({
  supabaseDbService: {
    notifyUserByName: vi.fn().mockResolvedValue(undefined),
  },
}))

function wrapper({ children }: { children: ReactNode }) {
  return (
    <NotificationsProvider>
      <UserProvider>
        <FriendsProvider>{children}</FriendsProvider>
      </UserProvider>
    </NotificationsProvider>
  )
}

describe('FriendsContext', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('refuse une demande sans compte Supabase', async () => {
    const { result } = renderHook(() => useFriends(), { wrapper })

    await waitFor(() => {
      expect(result.current).toBeTruthy()
    })

    await expect(result.current.sendFriendRequest('AutreUser')).rejects.toThrow(
      /compte email|non connecté/i,
    )
  })

  it('expose pendingRequests et outgoingRequests vides au démarrage', async () => {
    const { result } = renderHook(() => useFriends(), { wrapper })

    await waitFor(() => {
      expect(result.current.pendingRequests).toEqual([])
      expect(result.current.outgoingRequests).toEqual([])
    })
  })

  it('ne plante pas si reloadFriends est appelé sans session', async () => {
    const { result } = renderHook(() => useFriends(), { wrapper })

    await act(async () => {
      await expect(result.current.reloadFriends()).resolves.toBeUndefined()
    })

    expect(result.current.friends).toEqual([])
  })
})
