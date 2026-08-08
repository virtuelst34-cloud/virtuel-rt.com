import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useIsMobile, useIsPhone } from '@/hooks/use-mobile'

describe('useIsMobile / useIsPhone', () => {
  let originalInnerWidth: number

  beforeEach(() => {
    originalInnerWidth = window.innerWidth
  })

  afterEach(() => {
    window.innerWidth = originalInnerWidth
  })

  it('useIsMobile: false on desktop', async () => {
    window.innerWidth = 1024
    const { result } = renderHook(() => useIsMobile())
    await waitFor(() => expect(result.current).toBe(false))
  })

  it('useIsMobile: true below md', async () => {
    window.innerWidth = 375
    const { result } = renderHook(() => useIsMobile())
    await waitFor(() => expect(result.current).toBe(true))
  })

  it('useIsMobile: false at 768', async () => {
    window.innerWidth = 768
    const { result } = renderHook(() => useIsMobile())
    await waitFor(() => expect(result.current).toBe(false))
  })

  it('useIsPhone: true only below sm (640)', async () => {
    window.innerWidth = 639
    const { result } = renderHook(() => useIsPhone())
    await waitFor(() => expect(result.current).toBe(true))
  })

  it('useIsPhone: false at 640 (sidebar desktop)', async () => {
    window.innerWidth = 640
    const { result } = renderHook(() => useIsPhone())
    await waitFor(() => expect(result.current).toBe(false))
  })
})
