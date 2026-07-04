/**
 * Système de Streaks (Jours consécutifs d'activité)
 * 
 * Gère les streaks d'activité des utilisateurs avec des bonus XP
 * et un leaderboard des meilleurs streaks.
 */

export interface UserStreak {
  userId: string;
  currentStreak: number;
  longestStreak: number;
  lastActivityDate: Date;
  totalDaysActive: number;
  bonusXP: number;
}

export interface StreakBonus {
  days: number;
  multiplier: number;
  description: string;
}

// Bonus XP basés sur les streaks
export const STREAK_BONUSES: StreakBonus[] = [
  { days: 3, multiplier: 1.1, description: '+10% XP' },
  { days: 7, multiplier: 1.25, description: '+25% XP' },
  { days: 14, multiplier: 1.5, description: '+50% XP' },
  { days: 30, multiplier: 2, description: '+100% XP (Double XP!)' },
  { days: 60, multiplier: 2.5, description: '+150% XP' },
  { days: 90, multiplier: 3, description: '+200% XP (Triple XP!)' },
  { days: 180, multiplier: 4, description: '+300% XP' },
  { days: 365, multiplier: 5, description: '+400% XP (Quadruple XP!)' }
];

class StreakService {
  private userStreaks: Map<string, UserStreak> = new Map();
  private readonly storageKey = 'virtuel_rt_streaks';

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) return;
      const data: Record<string, UserStreak> = JSON.parse(raw);
      Object.entries(data).forEach(([userId, streak]) => {
        this.userStreaks.set(userId, {
          ...streak,
          lastActivityDate: new Date(streak.lastActivityDate),
        });
      });
    } catch {
      // ignore corrupt storage
    }
  }

  private saveToStorage(): void {
    try {
      const data = Object.fromEntries(this.userStreaks.entries());
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch {
      // ignore quota errors
    }
  }

  /**
   * Enregistre l'activité d'un utilisateur pour aujourd'hui
   */
  recordActivity(userId: string): UserStreak {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existing = this.userStreaks.get(userId);
    
    if (!existing) {
      // Premier enregistrement
      const newStreak: UserStreak = {
        userId,
        currentStreak: 1,
        longestStreak: 1,
        lastActivityDate: today,
        totalDaysActive: 1,
        bonusXP: 0
      };
      this.userStreaks.set(userId, newStreak);
      this.saveToStorage();
      return newStreak;
    }

    const lastActivity = new Date(existing.lastActivityDate);
    lastActivity.setHours(0, 0, 0, 0);

    const daysDiff = Math.floor((today.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24));

    if (daysDiff === 0) {
      // Activité déjà enregistrée aujourd'hui
      return existing;
    } else if (daysDiff === 1) {
      // Streak continu
      existing.currentStreak++;
      existing.totalDaysActive++;
      
      // Met à jour le plus long streak si nécessaire
      if (existing.currentStreak > existing.longestStreak) {
        existing.longestStreak = existing.currentStreak;
      }
    } else {
      // Streak brisé
      existing.currentStreak = 1;
      existing.totalDaysActive++;
    }

    existing.lastActivityDate = today;
    this.userStreaks.set(userId, existing);
    this.saveToStorage();
    
    return existing;
  }

  /**
   * Obtient le streak d'un utilisateur
   */
  getUserStreak(userId: string): UserStreak | null {
    return this.userStreaks.get(userId) || null;
  }

  /**
   * Calcule le multiplicateur de XP basé sur le streak actuel
   */
  getStreakMultiplier(userId: string): number {
    const streak = this.getUserStreak(userId);
    if (!streak) return 1;

    for (const bonus of STREAK_BONUSES) {
      if (streak.currentStreak >= bonus.days) {
        return bonus.multiplier;
      }
    }

    return 1;
  }

  /**
   * Obtient le bonus actuel pour un utilisateur
   */
  getCurrentBonus(userId: string): StreakBonus | null {
    const streak = this.getUserStreak(userId);
    if (!streak) return null;

    for (let i = STREAK_BONUSES.length - 1; i >= 0; i--) {
      if (streak.currentStreak >= STREAK_BONUSES[i].days) {
        return STREAK_BONUSES[i];
      }
    }

    return null;
  }

  /**
   * Applique le multiplicateur de streak au XP gagné
   */
  applyStreakBonus(userId: string, baseXP: number): number {
    const multiplier = this.getStreakMultiplier(userId);
    const bonusXP = Math.floor(baseXP * (multiplier - 1));
    
    if (bonusXP > 0) {
      const streak = this.userStreaks.get(userId);
      if (streak) {
        streak.bonusXP += bonusXP;
        this.userStreaks.set(userId, streak);
      }
    }

    return baseXP + bonusXP;
  }

  /**
   * Obtient le prochain bonus de streak
   */
  getNextBonus(userId: string): StreakBonus | null {
    const streak = this.getUserStreak(userId);
    if (!streak) return STREAK_BONUSES[0];

    for (const bonus of STREAK_BONUSES) {
      if (streak.currentStreak < bonus.days) {
        return bonus;
      }
    }

    return null; // Tous les bonus atteints
  }

  /**
   * Obtient les jours restants avant le prochain bonus
   */
  getDaysUntilNextBonus(userId: string): number | null {
    const streak = this.getUserStreak(userId);
    const nextBonus = this.getNextBonus(userId);
    
    if (!streak || !nextBonus) return null;
    
    return nextBonus.days - streak.currentStreak;
  }

  /**
   * Obtient le leaderboard des streaks
   */
  getLeaderboard(limit: number = 10): UserStreak[] {
    return Array.from(this.userStreaks.values())
      .sort((a, b) => b.currentStreak - a.currentStreak)
      .slice(0, limit);
  }

  /**
   * Obtient le leaderboard des plus longs streaks
   */
  getLongestStreakLeaderboard(limit: number = 10): UserStreak[] {
    return Array.from(this.userStreaks.values())
      .sort((a, b) => b.longestStreak - a.longestStreak)
      .slice(0, limit);
  }

  /**
   * Vérifie si le streak est en danger (pas d'activité depuis 23h)
   */
  isStreakInDanger(userId: string): boolean {
    const streak = this.getUserStreak(userId);
    if (!streak || streak.currentStreak < 2) return false;

    const now = new Date();
    const lastActivity = new Date(streak.lastActivityDate);
    const hoursSinceActivity = (now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60);

    return hoursSinceActivity >= 23;
  }

  /**
   * Obtient le temps restant avant que le streak ne soit brisé
   */
  getTimeUntilStreakBreak(userId: string): number | null {
    const streak = this.getUserStreak(userId);
    if (!streak) return null;

    const now = new Date();
    const lastActivity = new Date(streak.lastActivityDate);
    const deadline = new Date(lastActivity);
    deadline.setDate(deadline.getDate() + 1);
    deadline.setHours(0, 0, 0, 0);

    const remaining = deadline.getTime() - now.getTime();
    return Math.max(0, remaining);
  }

  /**
   * Réinitialise le streak d'un utilisateur (pour les tests ou admin)
   */
  resetStreak(userId: string): void {
    const streak = this.userStreaks.get(userId);
    if (streak) {
      streak.currentStreak = 0;
      this.userStreaks.set(userId, streak);
    }
  }

  /**
   * Obtient des statistiques globales sur les streaks
   */
  getGlobalStats(): {
    totalUsers: number;
    activeStreaks: number;
    averageStreak: number;
    longestStreak: number;
  } {
    const allStreaks = Array.from(this.userStreaks.values());
    const activeStreaks = allStreaks.filter(s => s.currentStreak > 0);
    
    const totalStreak = allStreaks.reduce((sum, s) => sum + s.currentStreak, 0);
    const averageStreak = activeStreaks.length > 0 ? totalStreak / activeStreaks.length : 0;
    const longestStreak = Math.max(...allStreaks.map(s => s.longestStreak), 0);

    return {
      totalUsers: allStreaks.length,
      activeStreaks: activeStreaks.length,
      averageStreak: Math.round(averageStreak * 10) / 10,
      longestStreak
    };
  }
}

export const streakService = new StreakService();
