import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useVisualViewportHeight } from '@/hooks/useVisualViewportHeight';

describe('useVisualViewportHeight', () => {
  beforeEach(() => {
    document.documentElement.style.removeProperty('--vv-height');
  });

  afterEach(() => {
    document.documentElement.style.removeProperty('--vv-height');
  });

  it('sets --vv-height when enabled', () => {
    renderHook(() => useVisualViewportHeight(true));
    const v = document.documentElement.style.getPropertyValue('--vv-height');
    expect(v).toMatch(/^\d+px$/);
  });

  it('does nothing when disabled', () => {
    renderHook(() => useVisualViewportHeight(false));
    expect(document.documentElement.style.getPropertyValue('--vv-height')).toBe('');
  });

  it('cleans up on unmount', () => {
    const { unmount } = renderHook(() => useVisualViewportHeight(true));
    expect(document.documentElement.style.getPropertyValue('--vv-height')).toMatch(/px$/);
    unmount();
    expect(document.documentElement.style.getPropertyValue('--vv-height')).toBe('');
  });
});
