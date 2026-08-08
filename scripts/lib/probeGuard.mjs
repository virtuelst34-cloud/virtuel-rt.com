/**
 * Refuse accidental probes against production Supabase unless explicitly allowed.
 * Set ALLOW_PROD_PROBE=1 to override (local debugging only).
 */
export function assertProbeAllowed(connectionOrHttpUrl, { label = 'probe' } = {}) {
  if (process.env.ALLOW_PROD_PROBE === '1') {
    console.warn(`[${label}] ALLOW_PROD_PROBE=1 — prod probe autorisé`);
    return;
  }
  if (!connectionOrHttpUrl) {
    console.error(`[${label}] URL manquante`);
    process.exit(1);
  }

  let host = '';
  try {
    const normalized = String(connectionOrHttpUrl)
      .trim()
      .replace(/^postgres(ql)?:/i, 'http:');
    host = new URL(normalized).hostname;
  } catch {
    console.error(`[${label}] URL invalide: ${connectionOrHttpUrl}`);
    process.exit(1);
  }

  const isLocal =
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host.endsWith('.local') ||
    host.includes('staging');

  if (!isLocal) {
    console.error(
      `[${label}] Refusé: cible prod (${host}). Utilise un projet staging ou ALLOW_PROD_PROBE=1.`,
    );
    process.exit(1);
  }
}
