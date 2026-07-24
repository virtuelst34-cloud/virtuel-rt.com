import React, { createContext, useContext, useState, useCallback, useRef, useEffect, ReactNode } from 'react';
import { useNotifications } from './NotificationsContext';
import { useUser } from './UserContext';
import { usePreferences } from './PreferencesContext';
import { streakService } from '../streaks';
import { supabaseDbService } from '../supabaseDb';

interface SoundsType {
  message: () => void;
  dm: () => void;
  levelup: () => void;
  join: () => void;
  notif: () => void;
}

interface XPContextType {
  monthlyXP: Record<string, number>;
  setMonthlyXP: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  awardXP: () => number | null;
  xpProgress: (u: { level?: number; xp?: number } | null) => number;
  xpForLevel: (lvl: number) => number;
  sounds: SoundsType;
  loadMonthlyXP: () => Promise<void>;
}

const XPContext = createContext<XPContextType | null>(null);

const XP_PER_MESSAGE = 15;
const XP_COOLDOWN_MS = 30000;
const MONTHLY_KEY = 'virtuel_rt_monthly';
const MONTHLY_MONTH_KEY = 'virtuel_rt_monthly_month';

function xpForLevel(lvl: number): number { return lvl * lvl * 500; }

function readLocalMonthlyXP(): Record<string, number> {
  try {
    const saved = localStorage.getItem(MONTHLY_KEY);
    if (!saved) return {};
    const parsed = JSON.parse(saved);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeLocalMonthlyXP(data: Record<string, number>): void {
  try {
    localStorage.setItem(MONTHLY_KEY, JSON.stringify(data));
  } catch {}
}

function mergeMonthlyXP(
  base: Record<string, number>,
  extra: Record<string, number>,
): Record<string, number> {
  const merged = { ...base };
  for (const [name, xp] of Object.entries(extra)) {
    if ((merged[name] || 0) < xp) merged[name] = xp;
  }
  return merged;
}

// Sons
let audioContextInstance: AudioContext | null = null;
function getAudioContext(): AudioContext | null {
  if (!audioContextInstance) {
    try {
      audioContextInstance = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (e) {
      console.warn('AudioContext non disponible:', e);
      return null;
    }
  }
  return audioContextInstance;
}

function createBeep(freq = 880, duration = 0.12, vol = 0.15): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.frequency.value = freq;
    osc.type = 'sine';
    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  } catch {}
}

const sounds: SoundsType = {
  message:  () => createBeep(880, 0.1, 0.12),
  dm:       () => createBeep(1100, 0.15, 0.15),
  levelup:  () => { createBeep(660, 0.1, 0.2); setTimeout(() => createBeep(880, 0.1, 0.2), 120); setTimeout(() => createBeep(1100, 0.2, 0.2), 240); },
  join:     () => createBeep(550, 0.08, 0.08),
  notif:    () => createBeep(750, 0.08, 0.1),
};

export function XPProvider({ children }: { children: ReactNode }) {
  const [monthlyXP, setMonthlyXP] = useState<Record<string, number>>({});
  const lastXpRef = useRef<number>(0);
  const persistTimerRef = useRef<number | null>(null);
  const { addNotification } = useNotifications();
  const { user, updateProfile } = useUser();
  const { isPremium } = usePreferences();

  const userName = user?.name;

  // Charger depuis Supabase + cache local, avec reset mensuel automatique
  const loadMonthlyXP = useCallback(async () => {
    if (!userName) return;

    try {
      const currentMonth = new Date().toISOString().slice(0, 7); // 'YYYY-MM'
      const savedMonth = localStorage.getItem(MONTHLY_MONTH_KEY);
      // Distinguer 1ère visite (savedMonth null) d'un vrai changement de mois
      const monthRolledOver = savedMonth != null && savedMonth !== currentMonth;

      if (savedMonth !== currentMonth) {
        localStorage.setItem(MONTHLY_MONTH_KEY, currentMonth);
        if (monthRolledOver) localStorage.removeItem(MONTHLY_KEY);
      }

      // Toujours charger le mois courant (vide naturellement si nouveau mois).
      // Fusionner avec l'état local / cache pour ne pas écraser un gain tout juste attribué.
      const allMonthly = await supabaseDbService.getAllMonthlyXP(currentMonth);
      setMonthlyXP(prev => {
        // Vrai nouveau mois : ignorer prev (ancien mois) et le cache disque
        if (monthRolledOver) {
          writeLocalMonthlyXP(allMonthly);
          return allMonthly;
        }
        // Même mois (ou 1ère visite) : fusionner serveur + cache + gains session
        const merged = mergeMonthlyXP(
          mergeMonthlyXP(allMonthly, readLocalMonthlyXP()),
          prev,
        );
        writeLocalMonthlyXP(merged);
        return merged;
      });
    } catch (error) {
      console.error('Erreur lors du chargement de l\'XP mensuel:', error);
      if (localStorage.getItem(MONTHLY_MONTH_KEY) === new Date().toISOString().slice(0, 7)) {
        setMonthlyXP(prev => mergeMonthlyXP(readLocalMonthlyXP(), prev));
      }
    }
  }, [userName]);

  // Charger une fois à la connexion (par nom), puis rafraîchir périodiquement
  useEffect(() => {
    if (!userName) return;

    loadMonthlyXP();

    const intervalId = window.setInterval(() => {
      loadMonthlyXP();
    }, 60_000);

    const onFocus = () => { loadMonthlyXP(); };
    window.addEventListener('focus', onFocus);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', onFocus);
    };
  }, [loadMonthlyXP, userName]);

  // Persister le cache local (debounced)
  useEffect(() => {
    if (persistTimerRef.current) window.clearTimeout(persistTimerRef.current);
    persistTimerRef.current = window.setTimeout(() => {
      writeLocalMonthlyXP(monthlyXP);
    }, 300);
    return () => {
      if (persistTimerRef.current) window.clearTimeout(persistTimerRef.current);
    };
  }, [monthlyXP]);

  const awardXP = useCallback(async (): Promise<number | null> => {
    const now = Date.now();
    if (now - lastXpRef.current < XP_COOLDOWN_MS) return null;
    lastXpRef.current = now;

    if (!user) return null;

    let levelUp: number | null = null;
    const baseGain = isPremium ? XP_PER_MESSAGE * 2 : XP_PER_MESSAGE;
    const gain = streakService.applyStreakBonus(user.name, baseGain);
    const newXp = (user.xp || 0) + gain;
    let newLvl = user.level || 1;

    while (newXp >= xpForLevel(newLvl)) newLvl++;

    if (newLvl > (user.level || 1)) {
      levelUp = newLvl;
      addNotification({ type: 'levelup', message: `🎉 Niveau ${newLvl} atteint !` });
      sounds.levelup();
    }

    updateProfile({ xp: newXp, level: newLvl });

    // Mettre à jour l'XP mensuel (état local + Supabase) sans dépendance stale
    const currentMonth = new Date().toISOString().slice(0, 7);
    let newMonthlyXP = gain;
    setMonthlyXP(m => {
      newMonthlyXP = (m[user.name] || 0) + gain;
      const next = { ...m, [user.name]: newMonthlyXP };
      writeLocalMonthlyXP(next);
      return next;
    });

    try {
      await supabaseDbService.updateMonthlyXP(user.name, currentMonth, newMonthlyXP);
    } catch (error) {
      console.error('Erreur lors de la mise à jour de l\'XP mensuel:', error);
    }

    return levelUp;
  }, [user, updateProfile, isPremium, addNotification]);

  const xpProgress = useCallback((u: { level?: number; xp?: number } | null): number => {
    if (!u) return 0;
    const lvl = u.level || 1;
    const prev = xpForLevel(lvl - 1);
    const next = xpForLevel(lvl);
    return Math.round((((u.xp ?? 0) - prev) / (next - prev)) * 100);
  }, []);

  const value: XPContextType = {
    monthlyXP, setMonthlyXP,
    awardXP, xpProgress, xpForLevel,
    sounds,
    loadMonthlyXP
  };

  return (
    <XPContext.Provider value={value}>
      {children}
    </XPContext.Provider>
  );
}

export function useXP(): XPContextType {
  const context = useContext(XPContext);
  if (!context) throw new Error('useXP must be used inside XPProvider');
  return context;
}
