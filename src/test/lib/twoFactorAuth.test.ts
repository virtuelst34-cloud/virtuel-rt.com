import { describe, it, expect, vi, beforeEach } from 'vitest';

const upsert = vi.fn().mockResolvedValue({ error: null });
const selectChain = {
  eq: vi.fn().mockReturnThis(),
  maybeSingle: vi.fn(),
};

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      upsert,
      select: vi.fn(() => selectChain),
      update: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) })),
      delete: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) })),
    })),
  },
}));

describe('twoFactorAuth', () => {
  beforeEach(() => {
    vi.resetModules();
    upsert.mockClear();
    selectChain.maybeSingle.mockReset();
  });

  it('setupTwoFactor upsert en base', async () => {
    const { setupTwoFactor } = await import('@/lib/twoFactorAuth');
    const result = await setupTwoFactor('user-1', 'test@example.com');
    expect(result).not.toBeNull();
    expect(result?.secret).toBeTruthy();
    expect(result?.backupCodes).toHaveLength(10);
    expect(upsert).toHaveBeenCalled();
  });

  it('getTwoFactorStatus retourne disabled par défaut', async () => {
    selectChain.maybeSingle.mockResolvedValue({ data: null });
    const { getTwoFactorStatus } = await import('@/lib/twoFactorAuth');
    const status = await getTwoFactorStatus('user-1');
    expect(status.enabled).toBe(false);
  });
});
