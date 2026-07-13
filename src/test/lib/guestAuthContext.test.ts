import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockRpc = vi.fn();
const mockFrom = vi.fn();

vi.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: (...args: unknown[]) => mockRpc(...args),
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

describe('guestAuthService ensureGuestSessionContext', () => {
  beforeEach(() => {
    vi.resetModules();
    mockRpc.mockReset();
    localStorage.clear();
  });

  it('appelle set_guest_session si token présent', async () => {
    localStorage.setItem('virtuel_rt_guest_token', 'abc123');
    mockRpc.mockResolvedValue({ error: null });

    const { ensureGuestSessionContext } = await import('@/lib/guestAuthService');
    await ensureGuestSessionContext();

    expect(mockRpc).toHaveBeenCalledWith('set_guest_session', { p_token: 'abc123' });
  });

  it('ne fait rien sans token', async () => {
    const { ensureGuestSessionContext } = await import('@/lib/guestAuthService');
    await ensureGuestSessionContext();
    expect(mockRpc).not.toHaveBeenCalled();
  });
});
