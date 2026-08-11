import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  __checkVersionFileForTests,
  __resetAppUpdateForTests,
  getAppUpdateNeeded,
  subscribeAppUpdate,
} from '@/lib/appUpdate'

describe('appUpdate version detection', () => {
  beforeEach(() => {
    sessionStorage.clear()
    vi.stubGlobal('navigator', {
      ...navigator,
      onLine: true,
    })
  })

  afterEach(() => {
    __resetAppUpdateForTests()
    sessionStorage.clear()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('signale needRefresh quand version.json ≠ version du shell chargé', async () => {
    __resetAppUpdateForTests({ shellVersion: 'shell-old' })
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ version: 'deploy-new', builtAt: '2026-08-08T00:00:00.000Z' }),
      }),
    )

    let flag = false
    const unsub = subscribeAppUpdate((v) => {
      flag = v
    })

    await __checkVersionFileForTests()

    expect(getAppUpdateNeeded()).toBe(true)
    expect(flag).toBe(true)
    unsub()
  })

  it('ne signale pas needRefresh quand shell === remote', async () => {
    __resetAppUpdateForTests({ shellVersion: 'same-ver' })
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ version: 'same-ver' }),
      }),
    )

    await __checkVersionFileForTests()
    expect(getAppUpdateNeeded()).toBe(false)
  })

  it('re-propose la bannière si PENDING_APPLY mais shell toujours ancien', async () => {
    __resetAppUpdateForTests({ shellVersion: 'shell-old' })
    sessionStorage.setItem('virtuel-rt-pending-apply', '1')
    sessionStorage.setItem('virtuel-rt-applied-ver', 'deploy-new')

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ version: 'deploy-new' }),
      }),
    )

    await __checkVersionFileForTests()

    expect(getAppUpdateNeeded()).toBe(true)
    expect(sessionStorage.getItem('virtuel-rt-pending-apply')).toBeNull()
  })

  it('adopte la version après apply réussi (shell === remote)', async () => {
    __resetAppUpdateForTests({ shellVersion: 'deploy-new' })
    sessionStorage.setItem('virtuel-rt-pending-apply', '1')

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ version: 'deploy-new' }),
      }),
    )

    await __checkVersionFileForTests()

    expect(getAppUpdateNeeded()).toBe(false)
    expect(sessionStorage.getItem('virtuel-rt-pending-apply')).toBeNull()
    expect(sessionStorage.getItem('virtuel-rt-applied-ver')).toBe('deploy-new')
  })
})
