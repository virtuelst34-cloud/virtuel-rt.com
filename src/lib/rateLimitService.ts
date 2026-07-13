export type RateLimitAction = "message" | "reaction" | "dm" | "salon_create";

export interface RateLimitResult {
  allowed: boolean;
  error?: string;
  remaining?: number;
}

/**
 * Vérifie le rate limit côté serveur via l'Edge Function Supabase.
 * En cas d'indisponibilité (fonction non déployée), ne bloque pas l'action.
 */
export async function checkServerRateLimit(
  action: RateLimitAction,
  userId: string,
): Promise<RateLimitResult> {
  const baseUrl = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!baseUrl || !anonKey) {
    return { allowed: true };
  }

  try {
    const response = await fetch(`${baseUrl}/functions/v1/rate-limit`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${anonKey}`,
        apikey: anonKey,
      },
      body: JSON.stringify({ action, userId }),
    });

    const data = await response.json().catch(() => ({}));

    if (response.status === 429) {
      return {
        allowed: false,
        error: data.error || "Trop de requêtes. Veuillez patienter.",
        remaining: data.remaining,
      };
    }

    if (!response.ok) {
      // Fonction absente ou erreur serveur → fallback client-side uniquement
      return { allowed: true };
    }

    return {
      allowed: data.success !== false,
      remaining: data.remaining,
      error: data.error,
    };
  } catch {
    return { allowed: true };
  }
}
