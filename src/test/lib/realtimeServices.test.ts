import { describe, it, expect, vi } from 'vitest';

describe('webrtcService', () => {
  it('expose joinSalon et leaveSalon', async () => {
    const { webrtcService } = await import('@/lib/webrtcService');
    expect(typeof webrtcService.joinSalon).toBe('function');
    expect(typeof webrtcService.leaveSalon).toBe('function');
    expect(typeof webrtcService.connectToPeer).toBe('function');
  });

  it('getLocalStream null avant join', async () => {
    const { webrtcService } = await import('@/lib/webrtcService');
    expect(webrtcService.getLocalStream()).toBeNull();
  });
});

describe('mediaBroadcastService', () => {
  it('subscribe retourne une fonction unsubscribe', async () => {
    const { mediaBroadcastService } = await import('@/lib/mediaBroadcastService');
    const unsub = mediaBroadcastService.subscribe('salon1', vi.fn());
    expect(typeof unsub).toBe('function');
    unsub();
  });
});

describe('dmTypingService', () => {
  it('subscribe retourne une fonction unsubscribe', async () => {
    const { dmTypingService } = await import('@/lib/dmTypingService');
    const unsub = dmTypingService.subscribe('a', 'b', vi.fn());
    expect(typeof unsub).toBe('function');
    unsub();
  });
});
