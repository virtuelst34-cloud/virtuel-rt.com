import { describe, expect, it } from 'vitest';
import { rpcErrorMessage } from '@/lib/rpcError';

describe('rpcErrorMessage', () => {
  it('extrait le message PostgREST', () => {
    expect(
      rpcErrorMessage(
        { message: 'Accès refusé : admin requis', code: 'P0001' },
        'fallback',
      ),
    ).toBe('Accès refusé : admin requis');
  });

  it('utilise le fallback si vide', () => {
    expect(rpcErrorMessage({}, 'fallback')).toBe('fallback');
    expect(rpcErrorMessage(null, 'fallback')).toBe('fallback');
  });
});
