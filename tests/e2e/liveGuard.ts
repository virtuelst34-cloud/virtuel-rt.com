/**
 * E2E writes against a live Supabase project create real guests/messages.
 * Require E2E_ALLOW_LIVE=1 when VITE_SUPABASE_URL points at *.supabase.co (non-staging).
 */
export function assertE2ELiveAllowed(): void {
  if (process.env.E2E_ALLOW_LIVE === '1') return;

  const url = process.env.VITE_SUPABASE_URL || '';
  if (!url) return; // no supabase env → unit-like / mocked

  let host = '';
  try {
    host = new URL(url).hostname;
  } catch {
    return;
  }

  const isLocal =
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host.includes('staging');

  if (!isLocal && host.includes('supabase.co')) {
    throw new Error(
      `E2E refusé sur prod Supabase (${host}). Définis E2E_ALLOW_LIVE=1 pour forcer (pollue les données).`,
    );
  }
}
