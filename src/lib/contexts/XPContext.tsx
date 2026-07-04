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
const MONTHLY_MONTH_KEY = 'virtuel_rt_monthly_month';

function xpForLevel(lvl: number): number { return lvl * lvl * 500; }

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
  const { addNotification } = useNotifications();
  const { user, updateProfile } = useUser();
  const { isPremium } = usePreferences();
  const timerRef = useRef<number | null>(null);

  // Charger depuis Supabase avec reset mensuel automatique
  const loadMonthlyXP = useCallback(async () => {
    if (!user) return;

    try {
      const currentMonth = new Date().toISOString().slice(0, 7); // 'YYYY-MM'
      const savedMonth = localStorage.getItem(MONTHLY_MONTH_KEY);

      if (savedMonth !== currentMonth) {
        // Nouveau mois : reset
        localStorage.setItem(MONTHLY_MONTH_KEY, currentMonth);
        setMonthlyXP({});
      } else {
        // Charger depuis Supabase
        const xp = await supabaseDbService.getMonthlyXP(user.name, currentMonth);
        setMonthlyXP({ [user.name]: xp });
      }
    } catch (error) {
      console.error('Erreur lors du chargement de l\'XP mensuel:', error);
    }
  }, [user]);

  // Charger l'XP au démarrage et quand l'utilisateur change
  useEffect(() => {
    loadMonthlyXP();
  }, [loadMonthlyXP]);

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

    // Mettre à jour l'XP mensuel dans Supabase
    const currentMonth = new Date().toISOString().slice(0, 7);
    const currentMonthlyXP = monthlyXP[user.name] || 0;
    const newMonthlyXP = currentMonthlyXP + gain;

    setMonthlyXP(m => ({ ...m, [user.name]: newMonthlyXP }));

    try {
      await supabaseDbService.updateMonthlyXP(user.name, currentMonth, newMonthlyXP);
    } catch (error) {
      console.error('Erreur lors de la mise à jour de l\'XP mensuel:', error);
    }

    return levelUp;
  }, [user, updateProfile, isPremium, addNotification, monthlyXP]);

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
