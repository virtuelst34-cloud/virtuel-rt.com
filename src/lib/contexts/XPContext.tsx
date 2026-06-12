import React, { createContext, useContext, useState, useCallback, useRef, useEffect, ReactNode } from 'react';
import { useNotifications } from './NotificationsContext';
import { useUser } from './UserContext';
import { usePreferences } from './PreferencesContext';

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
}

const XPContext = createContext<XPContextType | null>(null);

const XP_PER_MESSAGE = 15;
const XP_COOLDOWN_MS = 30000;
const MONTHLY_KEY = 'virtuel_st_monthly';
const MONTHLY_MONTH_KEY = 'virtuel_st_monthly_month';

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

  // Charger depuis localStorage avec reset mensuel automatique
  useEffect(() => {
    try {
      const currentMonth = new Date().toISOString().slice(0, 7); // 'YYYY-MM'
      const savedMonth = localStorage.getItem(MONTHLY_MONTH_KEY);
      if (savedMonth !== currentMonth) {
        // Nouveau mois : reset
        localStorage.setItem(MONTHLY_MONTH_KEY, currentMonth);
        localStorage.removeItem(MONTHLY_KEY);
      } else {
        const saved = localStorage.getItem(MONTHLY_KEY);
        if (saved) setMonthlyXP(JSON.parse(saved));
      }
    } catch {}
  }, []);

  // Persister avec debouncing
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      try {
        localStorage.setItem(MONTHLY_KEY, JSON.stringify(monthlyXP));
      } catch {}
    }, 300);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [monthlyXP]);

  const awardXP = useCallback((): number | null => {
    const now = Date.now();
    if (now - lastXpRef.current < XP_COOLDOWN_MS) return null;
    lastXpRef.current = now;
    
    if (!user) return null;
    
    let levelUp: number | null = null;
    const gain = isPremium ? XP_PER_MESSAGE * 2 : XP_PER_MESSAGE;
    const newXp = (user.xp || 0) + gain;
    let newLvl = user.level || 1;
    
    while (newXp >= xpForLevel(newLvl)) newLvl++;
    
    if (newLvl > (user.level || 1)) {
      levelUp = newLvl;
      addNotification({ type: 'levelup', message: `🎉 Niveau ${newLvl} atteint !` });
      sounds.levelup();
    }
    
    updateProfile({ xp: newXp, level: newLvl });
    setMonthlyXP(m => ({ ...m, [user.name]: (m[user.name] || 0) + gain }));
    
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
    sounds
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
