import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { useNotifications } from './NotificationsContext';
import { useUser } from './UserContext';
import { usePreferences } from './PreferencesContext';

const XPContext = createContext(null);

const XP_PER_MESSAGE = 15;
const XP_COOLDOWN_MS = 30000;
const MONTHLY_KEY = 'virtuel_st_monthly';
const MONTHLY_MONTH_KEY = 'virtuel_st_monthly_month';

function xpForLevel(lvl) { return lvl * lvl * 500; }

// Sons
let audioContextInstance = null;
function getAudioContext() {
  if (!audioContextInstance) {
    try {
      audioContextInstance = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      console.warn('AudioContext non disponible:', e);
      return null;
    }
  }
  return audioContextInstance;
}

function createBeep(freq = 880, duration = 0.12, vol = 0.15) {
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

const sounds = {
  message:  () => createBeep(880, 0.1, 0.12),
  dm:       () => createBeep(1100, 0.15, 0.15),
  levelup:  () => { createBeep(660, 0.1, 0.2); setTimeout(() => createBeep(880, 0.1, 0.2), 120); setTimeout(() => createBeep(1100, 0.2, 0.2), 240); },
  join:     () => createBeep(550, 0.08, 0.08),
  notif:    () => createBeep(750, 0.08, 0.1),
};

export function XPProvider({ children }) {
  const [monthlyXP, setMonthlyXP] = useState({});
  const lastXpRef = useRef(0);
  const { addNotification } = useNotifications();
  const { user, updateProfile } = useUser();
  const { isPremium } = usePreferences();
  const timerRef = useRef(null);

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
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      try {
        localStorage.setItem(MONTHLY_KEY, JSON.stringify(monthlyXP));
      } catch {}
    }, 300);
    return () => clearTimeout(timerRef.current);
  }, [monthlyXP]);

  const awardXP = useCallback(() => {
    const now = Date.now();
    if (now - lastXpRef.current < XP_COOLDOWN_MS) return null;
    lastXpRef.current = now;
    
    if (!user) return null;
    
    let levelUp = null;
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

  const xpProgress = useCallback((u) => {
    if (!u) return 0;
    const lvl = u.level || 1;
    const prev = xpForLevel(lvl - 1);
    const next = xpForLevel(lvl);
    return Math.round((((u.xp ?? 0) - prev) / (next - prev)) * 100);
  }, []);

  const value = {
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

export function useXP() {
  const context = useContext(XPContext);
  if (!context) throw new Error('useXP must be used inside XPProvider');
  return context;
}
