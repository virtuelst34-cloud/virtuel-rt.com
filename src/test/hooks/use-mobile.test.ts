import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useIsMobile } from '@/hooks/use-mobile'

describe('useIsMobile', () => {
  let originalInnerWidth: number

  beforeEach(() => {
    originalInnerWidth = window.innerWidth
  })

  afterEach(() => {
    window.innerWidth = originalInnerWidth
  })

  it('should return false for desktop screens', () => {
    window.innerWidth = 1024
    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(false)
  })

  it('should return true for mobile screens', () => {
    window.innerWidth = 375
    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(true)
  })

  it('should return false at breakpoint', () => {
    window.innerWidth = 768
    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(false)
  })

  it('should return true just below breakpoint', () => {
    window.innerWidth = 767
    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(true)
  })
})
