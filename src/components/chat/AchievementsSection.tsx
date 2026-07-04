import React from 'react';
import { Trophy, Flame, Lock } from 'lucide-react';
import {
  getUnlockedAchievements,
  getLockedAchievements,
  getUserStreak,
  getCurrentStreakBonus,
} from '@/lib/userActivity';

interface AchievementsSectionProps {
  userId: string;
}

export default function AchievementsSection({ userId }: AchievementsSectionProps) {
  const unlocked = getUnlockedAchievements(userId);
  const locked = getLockedAchievements(userId);
  const streak = getUserStreak(userId);
  const bonus = getCurrentStreakBonus(userId);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border/50 bg-white/[0.03] p-4">
        <div className="flex items-center gap-2 mb-3">
          <Flame className="w-4 h-4 text-orange-400" />
          <h3 className="text-sm font-semibold">Série d'activité</h3>
        </div>
        <div className="grid grid-cols-2 gap-3 text-center">
          <div className="rounded-xl bg-white/[0.04] p-3">
            <div className="text-2xl font-bold text-orange-400">{streak?.currentStreak ?? 0}</div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Jours consécutifs</div>
          </div>
          <div className="rounded-xl bg-white/[0.04] p-3">
            <div className="text-2xl font-bold text-primary">{streak?.longestStreak ?? 0}</div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Record</div>
          </div>
        </div>
        {bonus && (
          <p className="mt-3 text-xs text-emerald-400 text-center">
            Bonus actif : {bonus.description}
          </p>
        )}
      </div>

      <div>
        <div className="flex items-center gap-2 mb-3">
          <Trophy className="w-4 h-4 text-amber-400" />
          <h3 className="text-sm font-semibold">Succès débloqués ({unlocked.length})</h3>
        </div>
        {unlocked.length === 0 ? (
          <p className="text-xs text-muted-foreground">Envoyez votre premier message pour débloquer un succès !</p>
        ) : (
          <div className="grid gap-2">
            {unlocked.map(a => (
              <div key={a.id} className="flex items-center gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 px-3 py-2">
                <span className="text-xl" aria-hidden="true">{a.icon}</span>
                <div className="min-w-0">
                  <div className="text-xs font-medium">{a.name}</div>
                  <div className="text-[10px] text-muted-foreground truncate">{a.description}</div>
                </div>
                <span className="ml-auto text-[10px] text-amber-400 shrink-0">+{a.xpReward} XP</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {locked.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Lock className="w-4 h-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold text-muted-foreground">À débloquer</h3>
          </div>
          <div className="grid gap-2">
            {locked.slice(0, 6).map(a => (
              <div key={a.id} className="flex items-center gap-3 rounded-xl border border-border/30 bg-white/[0.02] px-3 py-2 opacity-60">
                <span className="text-xl grayscale" aria-hidden="true">{a.icon}</span>
                <div className="min-w-0">
                  <div className="text-xs font-medium">{a.name}</div>
                  <div className="text-[10px] text-muted-foreground truncate">{a.description}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
