import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  registerGuestSession,
  validateGuestSession,
  getStoredGuestToken,
  storeGuestToken,
  clearGuestToken,
} from '@/lib/guestAuthService';

const rpcMock = vi.fn();
const fromMock = vi.fn();

vi.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: (...args: unknown[]) => rpcMock(...args),
    from: (...args: unknown[]) => fromMock(...args),
  },
}));

describe('guestAuthService', () => {
  beforeEach(() => {
    rpcMock.mockReset();
    fromMock.mockReset();
    localStorage.clear();
  });

  it('registerGuestSession stocke le token en cas de succès', async () => {
    rpcMock.mockResolvedValue({
      data: {
        success: true,
        session_token: 'abc123',
        guest_name: 'Player1',
        avatar: 'av2',
        initials: 'PL',
      },
      error: null,
    });

    const result = await registerGuestSession('Player1', 'av2', 'PL');
    expect(result.success).toBe(true);
    expect(getStoredGuestToken()).toBe('abc123');
  });

  it('registerGuestSession retourne une erreur si le pseudo est pris', async () => {
    rpcMock.mockResolvedValue({
      data: { success: false, error: 'Ce pseudo est déjà pris' },
      error: null,
    });

    const result = await registerGuestSession('Taken', 'av1', 'TA');
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/déjà pris/i);
  });

  it('validateGuestSession détecte une session expirée', async () => {
    storeGuestToken('expired-token');
    fromMock.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: {
              guest_name: 'OldGuest',
              avatar: 'av1',
              initials: 'OG',
              expires_at: new Date(Date.now() - 60_000).toISOString(),
              session_token: 'expired-token',
            },
            error: null,
          }),
        }),
      }),
    });

    const result = await validateGuestSession('expired-token');
    expect(result.success).toBe(false);
    expect(getStoredGuestToken()).toBeNull();
  });

  it('clearGuestToken supprime le token', () => {
    storeGuestToken('x');
    clearGuestToken();
    expect(getStoredGuestToken()).toBeNull();
  });
});
