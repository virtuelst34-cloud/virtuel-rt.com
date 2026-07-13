import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchAllModeration, upsertUserModeration } from '@/lib/moderationService';

const fromMock = vi.fn();

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => fromMock(...args),
  },
}));

describe('moderationService', () => {
  beforeEach(() => {
    fromMock.mockReset();
  });

  it('fetchAllModeration retourne les enregistrements', async () => {
    fromMock.mockReturnValue({
      select: vi.fn().mockResolvedValue({
        data: [{ user_name: 'Alice', is_banned: true, is_muted: false, ban_reason: 'spam' }],
        error: null,
      }),
    });

    const rows = await fetchAllModeration();
    expect(rows).toHaveLength(1);
    expect(rows[0].user_name).toBe('Alice');
  });

  it('upsertUserModeration met à jour un utilisateur', async () => {
    fromMock.mockReturnValue({
      upsert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: { user_name: 'Bob', is_banned: false, is_muted: true, ban_reason: '' },
            error: null,
          }),
        }),
      }),
    });

    const row = await upsertUserModeration('Bob', { is_muted: true });
    expect(row?.is_muted).toBe(true);
  });
});
