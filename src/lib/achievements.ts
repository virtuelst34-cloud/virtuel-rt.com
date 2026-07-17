/**
 * Système de Succès/Achievements
 * 
 * Gère les accomplissements des utilisateurs avec des badges et des récompenses.
 */

import { supabaseDbService } from './supabaseDb';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'messages' | 'activity' | 'social' | 'special';
  requirement: number;
  xpReward: number;
  unlockedAt?: Date;
}

export interface UserAchievements {
  userId: string;
  achievements: Achievement[];
  totalXP: number;
  level: number;
}

// Liste des succès disponibles
export const ACHIEVEMENTS: Achievement[] = [
  // Messages
  {
    id: 'first_message',
    name: 'Premier mot',
    description: 'Envoyez votre premier message',
    icon: '💬',
    category: 'messages',
    requirement: 1,
    xpReward: 10
  },
  {
    id: 'hundred_messages',
    name: 'Bavard',
    description: 'Envoyez 100 messages',
    icon: '🗣️',
    category: 'messages',
    requirement: 100,
    xpReward: 50
  },
  {
    id: 'thousand_messages',
    name: 'Oracle',
    description: 'Envoyez 1000 messages',
    icon: '📜',
    category: 'messages',
    requirement: 1000,
    xpReward: 200
  },
  {
    id: 'ten_thousand_messages',
    name: 'Légende',
    description: 'Envoyez 10 000 messages',
    icon: '👑',
    category: 'messages',
    requirement: 10000,
    xpReward: 1000
  },
  
  // Activité
  {
    id: 'first_day',
    name: 'Débutant',
    description: 'Connectez-vous pour la première fois',
    icon: '🌟',
    category: 'activity',
    requirement: 1,
    xpReward: 5
  },
  {
    id: 'week_streak',
    name: 'Semaine parfaite',
    description: '7 jours consécutifs d\'activité',
    icon: '🔥',
    category: 'activity',
    requirement: 7,
    xpReward: 100
  },
  {
    id: 'month_streak',
    name: 'Mois ininterrompu',
    description: '30 jours consécutifs d\'activité',
    icon: '💪',
    category: 'activity',
    requirement: 30,
    xpReward: 500
  },
  {
    id: 'year_activity',
    name: 'Année complète',
    description: '365 jours d\'activité',
    icon: '🎂',
    category: 'activity',
    requirement: 365,
    xpReward: 2000
  },
  
  // Social
  {
    id: 'first_reaction',
    name: 'Expressif',
    description: 'Utilisez votre première réaction',
    icon: '👍',
    category: 'social',
    requirement: 1,
    xpReward: 10
  },
  {
    id: 'hundred_reactions',
    name: 'Populaire',
    description: 'Recevez 100 réactions',
    icon: '❤️',
    category: 'social',
    requirement: 100,
    xpReward: 75
  },
  {
    id: 'first_mention',
    name: 'Mentionné',
    description: 'Soyez mentionné pour la première fois',
    icon: '@',
    category: 'social',
    requirement: 1,
    xpReward: 15
  },
  
  // Spécial
  {
    id: 'early_adopter',
    name: 'Pionnier',
    description: 'Inscrit lors du premier mois',
    icon: '🚀',
    category: 'special',
    requirement: 1,
    xpReward: 500
  },
  {
    id: 'bug_reporter',
    name: 'Chasseur de bugs',
    description: 'Signalez un bug',
    icon: '🐛',
    category: 'special',
    requirement: 1,
    xpReward: 100
  },
  {
    id: 'helper',
    name: 'Assistant',
    description: 'Aidez 10 nouveaux utilisateurs',
   icon: '🤝',
    category: 'special',
    requirement: 10,
    xpReward: 200
  }
];

class AchievementService {
  private userAchievements: Map<string, UserAchievements> = new Map();
  private readonly storageKey = 'virtuel_rt_achievements';

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) return;
      const data: Record<string, UserAchievements> = JSON.parse(raw);
      Object.entries(data).forEach(([userId, user]) => {
        this.userAchievements.set(userId, {
          ...user,
          achievements: user.achievements.map(a => ({
            ...a,
            unlockedAt: a.unlockedAt ? new Date(a.unlockedAt) : undefined,
          })),
        });
      });
    } catch {
      // ignore corrupt storage
    }
  }

  private saveToStorage(): void {
    try {
      const data = Object.fromEntries(this.userAchievements.entries());
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch {
      // ignore quota errors
    }
  }

  /**
   * Vérifie si un utilisateur a débloqué un succès
   */
  hasAchievement(userId: string, achievementId: string): boolean {
    const user = this.userAchievements.get(userId);
    if (!user) return false;
    return user.achievements.some(a => a.id === achievementId);
  }

  /**
   * Obtient tous les succès d'un utilisateur
   */
  getUserAchievements(userId: string): UserAchievements | null {
    return this.userAchievements.get(userId) || null;
  }

  /**
   * Vérifie et débloque les succès basés sur les statistiques
   */
  checkAchievements(
    userId: string,
    stats: {
      messageCount: number;
      reactionCount: number;
      mentionCount: number;
      streakDays: number;
      activityDays: number;
    }
  ): Achievement[] {
    const user = this.userAchievements.get(userId) || {
      userId,
      achievements: [],
      totalXP: 0,
      level: 1
    };

    const newAchievements: Achievement[] = [];

    for (const achievement of ACHIEVEMENTS) {
      // Skip si déjà débloqué
      if (this.hasAchievement(userId, achievement.id)) continue;

      let unlocked = false;

      switch (achievement.category) {
        case 'messages':
          unlocked = stats.messageCount >= achievement.requirement;
          break;
        case 'activity':
          if (achievement.id.includes('streak')) {
            unlocked = stats.streakDays >= achievement.requirement;
          } else {
            unlocked = stats.activityDays >= achievement.requirement;
          }
          break;
        case 'social':
          if (achievement.id.includes('reaction')) {
            unlocked = stats.reactionCount >= achievement.requirement;
          } else if (achievement.id.includes('mention')) {
            unlocked = stats.mentionCount >= achievement.requirement;
          }
          break;
        case 'special':
          break;
      }

      if (unlocked) {
        const unlockedAchievement = { ...achievement, unlockedAt: new Date() };
        user.achievements.push(unlockedAchievement);
        user.totalXP += achievement.xpReward;
        user.level = this.calculateLevel(user.totalXP);
        newAchievements.push(unlockedAchievement);
      }
    }

    if (newAchievements.length > 0) {
      this.userAchievements.set(userId, user);
      this.saveToStorage();
      for (const a of newAchievements) {
        void supabaseDbService.unlockAchievement(userId, a.id);
      }
    }

    return newAchievements;
  }

  /**
   * Calcule le niveau basé sur le XP total
   */
  private calculateLevel(totalXP: number): number {
    return Math.floor(Math.sqrt(totalXP / 100)) + 1;
  }

  /**
   * Obtient le XP nécessaire pour le niveau suivant
   */
  getXPForNextLevel(currentLevel: number): number {
    return currentLevel * currentLevel * 100;
  }

  /**
   * Obtient la progression vers le niveau suivant (0-100)
   */
  getLevelProgress(userId: string): number {
    const user = this.userAchievements.get(userId);
    if (!user) return 0;

    const currentLevelXP = (user.level - 1) * (user.level - 1) * 100;
    const nextLevelXP = user.level * user.level * 100;
    const xpInCurrentLevel = user.totalXP - currentLevelXP;
    const xpNeededForNextLevel = nextLevelXP - currentLevelXP;

    return Math.min(100, (xpInCurrentLevel / xpNeededForNextLevel) * 100);
  }

  /**
   * Débloque manuellement un succès (pour les succès spéciaux)
   */
  unlockAchievement(userId: string, achievementId: string): Achievement | null {
    const achievement = ACHIEVEMENTS.find(a => a.id === achievementId);
    if (!achievement) return null;

    if (this.hasAchievement(userId, achievementId)) return null;

    const user = this.userAchievements.get(userId) || {
      userId,
      achievements: [],
      totalXP: 0,
      level: 1
    };

    const unlockedAchievement = { ...achievement, unlockedAt: new Date() };
    user.achievements.push(unlockedAchievement);
    user.totalXP += achievement.xpReward;
    user.level = this.calculateLevel(user.totalXP);

    this.userAchievements.set(userId, user);
    this.saveToStorage();
    void supabaseDbService.unlockAchievement(userId, achievementId);

    return unlockedAchievement;
  }

  /**
   * Obtient les succès non débloqués triés par catégorie
   */
  getLockedAchievements(userId: string): Achievement[] {
    const user = this.userAchievements.get(userId);
    if (!user) return [...ACHIEVEMENTS];

    const unlockedIds = new Set(user.achievements.map(a => a.id));
    return ACHIEVEMENTS.filter(a => !unlockedIds.has(a.id));
  }
}

export const achievementService = new AchievementService();
