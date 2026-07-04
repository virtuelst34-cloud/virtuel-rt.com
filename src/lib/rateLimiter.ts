/**
 * Rate Limiter Service
 * 
 * Limite le nombre de requêtes pour éviter les abus et protéger l'API.
 * Utilise un algorithme de token bucket avec fenêtre glissante.
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

class RateLimiter {
  private limits: Map<string, RateLimitEntry> = new Map();
  private readonly maxRequests: number;
  private readonly windowMs: number;

  constructor(maxRequests: number = 100, windowMs: number = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  /**
   * Vérifie si une requête est autorisée
   * @param key Identifiant unique (ex: userId, IP address)
   * @returns true si autorisé, false si limité
   */
  canRequest(key: string): boolean {
    const now = Date.now();
    const entry = this.limits.get(key);

    if (!entry || now > entry.resetTime) {
      // Nouvelle fenêtre ou expirée
      this.limits.set(key, {
        count: 1,
        resetTime: now + this.windowMs
      });
      return true;
    }

    if (entry.count >= this.maxRequests) {
      return false;
    }

    entry.count++;
    return true;
  }

  /**
   * Obtient le nombre de requêtes restantes
   * @param key Identifiant unique
   */
  getRemainingRequests(key: string): number {
    const entry = this.limits.get(key);
    if (!entry || Date.now() > entry.resetTime) {
      return this.maxRequests;
    }
    return Math.max(0, this.maxRequests - entry.count);
  }

  /**
   * Obtient le temps avant réinitialisation (en ms)
   * @param key Identifiant unique
   */
  getResetTime(key: string): number {
    const entry = this.limits.get(key);
    if (!entry) return 0;
    return Math.max(0, entry.resetTime - Date.now());
  }

  /**
   * Réinitialise les limites pour une clé
   * @param key Identifiant unique
   */
  reset(key: string): void {
    this.limits.delete(key);
  }

  /**
   * Nettoie les entrées expirées
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.limits.entries()) {
      if (now > entry.resetTime) {
        this.limits.delete(key);
      }
    }
  }
}

// Instances préconfigurées pour différents cas d'usage
export const apiRateLimiter = new RateLimiter(100, 60000); // 100 req/min
export const authRateLimiter = new RateLimiter(5, 60000); // 5 req/min pour l'auth
export const messageRateLimiter = new RateLimiter(20, 60000); // 20 messages/min

export { RateLimiter };
