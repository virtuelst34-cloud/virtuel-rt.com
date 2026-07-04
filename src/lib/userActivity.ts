/**
 * Suivi d'activité utilisateur (stats locales + succès + streaks)
 */

import { achievementService, type Achievement } from './achievements';
import { streakService } from './streaks';

const STATS_KEY = 'virtuel_rt_user_stats';

interface UserStats {
  messageCount: number;
  reactionCount: number;
  mentionCount: number;
}

type StatsStore = Record<string, UserStats>;

function loadStats(): StatsStore {
  try {
    const raw = localStorage.getItem(STATS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveStats(store: StatsStore): void {
  localStorage.setItem(STATS_KEY, JSON.stringify(store));
}

function getOrCreateStats(userId: string): UserStats {
  const store = loadStats();
  if (!store[userId]) {
    store[userId] = { messageCount: 0, reactionCount: 0, mentionCount: 0 };
    saveStats(store);
  }
  return store[userId];
}

function buildAchievementStats(userId: string) {
  const stats = getOrCreateStats(userId);
  const streak = streakService.getUserStreak(userId);
  return {
    messageCount: stats.messageCount,
    reactionCount: stats.reactionCount,
    mentionCount: stats.mentionCount,
    streakDays: streak?.currentStreak ?? 0,
    activityDays: streak?.totalDaysActive ?? 0,
  };
}

function notifyAchievements(
  achievements: Achievement[],
  onUnlock?: (achievement: Achievement) => void
): void {
  achievements.forEach(a => onUnlock?.(a));
}

export function recordLogin(
  userId: string,
  onUnlock?: (achievement: Achievement) => void
): Achievement[] {
  streakService.recordActivity(userId);
  const unlocked = achievementService.checkAchievements(userId, buildAchievementStats(userId));
  notifyAchievements(unlocked, onUnlock);
  return unlocked;
}

export function recordMessageSent(
  userId: string,
  onUnlock?: (achievement: Achievement) => void
): Achievement[] {
  const store = loadStats();
  const stats = getOrCreateStats(userId);
  stats.messageCount += 1;
  store[userId] = stats;
  saveStats(store);

  streakService.recordActivity(userId);
  const unlocked = achievementService.checkAchievements(userId, buildAchievementStats(userId));
  notifyAchievements(unlocked, onUnlock);
  return unlocked;
}

export function recordReaction(
  userId: string,
  onUnlock?: (achievement: Achievement) => void
): Achievement[] {
  const store = loadStats();
  const stats = getOrCreateStats(userId);
  stats.reactionCount += 1;
  store[userId] = stats;
  saveStats(store);

  const unlocked = achievementService.checkAchievements(userId, buildAchievementStats(userId));
  notifyAchievements(unlocked, onUnlock);
  return unlocked;
}

export function getUnlockedAchievements(userId: string): Achievement[] {
  return achievementService.getUserAchievements(userId)?.achievements ?? [];
}

export function getLockedAchievements(userId: string): Achievement[] {
  return achievementService.getLockedAchievements(userId);
}

export function getUserStreak(userId: string) {
  return streakService.getUserStreak(userId);
}

export function getStreakMultiplier(userId: string): number {
  return streakService.getStreakMultiplier(userId);
}

export function getCurrentStreakBonus(userId: string) {
  return streakService.getCurrentBonus(userId);
}
