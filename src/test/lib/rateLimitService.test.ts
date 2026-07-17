import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkServerRateLimit } from '@/lib/rateLimitService';

describe('rateLimitService', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  it('autorise quand la fonction répond success', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true, remaining: 29 }),
    } as Response);

    const result = await checkServerRateLimit('message', 'Alice');
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(29);
  });

  it('bloque en cas de 429', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 429,
      json: async () => ({ success: false, error: 'Rate limit exceeded' }),
    } as Response);

    const result = await checkServerRateLimit('message', 'Alice');
    expect(result.allowed).toBe(false);
    expect(result.error).toContain('Rate limit');
  });

  it('fallback permissif si la fonction est indisponible', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('Network error'));

    const result = await checkServerRateLimit('message', 'Alice');
    expect(result.allowed).toBe(true);
  });
});
