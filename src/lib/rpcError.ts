/** Message lisible depuis une erreur PostgREST / Supabase RPC. */
export function rpcErrorMessage(err: unknown, fallback: string): string {
  if (!err || typeof err !== 'object') {
    return err instanceof Error && err.message ? err.message : fallback;
  }
  const e = err as { message?: string; details?: string; hint?: string; code?: string };
  const parts = [e.message, e.details, e.hint].filter(
    (p): p is string => typeof p === 'string' && p.trim().length > 0,
  );
  if (parts.length === 0) return fallback;
  // Premier message suffit pour le toast (souvent l’EXCEPTION SQL)
  return parts[0].replace(/^.*ERROR:\s*/i, '').trim() || fallback;
}
