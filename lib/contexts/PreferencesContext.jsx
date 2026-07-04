import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useNotifications } from './NotificationsContext';

const PreferencesContext = createContext(null);

const THEME_KEY   = 'virtuel_rt_theme';
const PARTY_KEY   = 'virtuel_rt_party';
const PREMIUM_KEY = 'virtuel_rt_premium';
const ACCENT_KEY  = 'virtuel_rt_accent';

const ACCENT_COLORS = [
  { id: 'purple', label: 'Violet',  value: '263 70% 50%' },
  { id: 'blue',   label: 'Bleu',    value: '217 91% 60%' },
  { id: 'emerald',label: 'Émeraude',value: '160 84% 39%' },
  { id: 'rose',   label: 'Rose',    value: '330 81% 60%' },
  { id: 'amber',  label: 'Ambre',   value: '38 92% 50%'  },
  { id: 'red',    label: 'Rouge',   value: '0 84% 60%'   },
];

export { ACCENT_COLORS };

export function PreferencesProvider({ children }) {
  const [theme, setThemeState]       = useState('dark');
  const [partyMode, setPartyModeState] = useState(false);
  const [isPremium, setIsPremium]      = useState(false);
  const [accentColor, setAccentColor]  = useState(ACCENT_COLORS[0].id);
  const { addNotification } = useNotifications();

  const applyAccent = (colorId) => {
    const found = ACCENT_COLORS.find(c => c.id === colorId) || ACCENT_COLORS[0];
    document.documentElement.style.setProperty('--primary', found.value);
  };

  useEffect(() => {
    try {
      const savedTheme  = localStorage.getItem(THEME_KEY) || 'dark';
      setThemeState(savedTheme);
      document.documentElement.classList.toggle('light', savedTheme === 'light');
      setIsPremium(localStorage.getItem(PREMIUM_KEY) === 'true');
      const savedParty = localStorage.getItem(PARTY_KEY) === 'true';
      setPartyModeState(savedParty);
      document.documentElement.classList.toggle('party', savedParty);
      const savedAccent = localStorage.getItem(ACCENT_KEY) || ACCENT_COLORS[0].id;
      setAccentColor(savedAccent);
      applyAccent(savedAccent);
    } catch {}
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState(prev => {
      const next = prev === 'dark' ? 'light' : 'dark';
      localStorage.setItem(THEME_KEY, next);
      document.documentElement.classList.toggle('light', next === 'light');
      return next;
    });
  }, []);

  const togglePartyMode = useCallback(() => {
    setPartyModeState(prev => {
      const next = !prev;
      localStorage.setItem(PARTY_KEY, String(next));
      document.documentElement.classList.toggle('party', next);
      return next;
    });
  }, []);

  const activatePremium = useCallback(() => {
    setIsPremium(true);
    localStorage.setItem(PREMIUM_KEY, 'true');
    addNotification({ type: 'premium', message: '🌟 Bienvenue dans le club Premium !' });
  }, [addNotification]);

  const changeAccent = useCallback((colorId) => {
    setAccentColor(colorId);
    applyAccent(colorId);
    try { localStorage.setItem(ACCENT_KEY, colorId); } catch {}
  }, []);

  const value = {
    theme, toggleTheme, partyMode, togglePartyMode, isPremium, activatePremium,
    accentColor, changeAccent, ACCENT_COLORS,
  };

  return (
    <PreferencesContext.Provider value={value}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences() {
  const context = useContext(PreferencesContext);
  if (!context) throw new Error('usePreferences must be used inside PreferencesProvider');
  return context;
}
