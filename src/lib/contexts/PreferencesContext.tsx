import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { useNotifications } from './NotificationsContext';

interface AccentColor {
  id: string;
  label: string;
  value: string;
}

interface PreferencesContextType {
  theme: string;
  toggleTheme: () => void;
  partyMode: boolean;
  togglePartyMode: () => void;
  isPremium: boolean;
  activatePremium: () => void;
  accentColor: string;
  changeAccent: (colorId: string) => void;
  ACCENT_COLORS: AccentColor[];
  compactMode: boolean;
  toggleCompactMode: () => void;
}

const PreferencesContext = createContext<PreferencesContextType | null>(null);

const THEME_KEY   = 'virtuel_st_theme';
const PARTY_KEY   = 'virtuel_st_party';
const PREMIUM_KEY = 'virtuel_st_premium';
const ACCENT_KEY  = 'virtuel_st_accent';
const COMPACT_KEY = 'virtuel_st_compact';

const ACCENT_COLORS: AccentColor[] = [
  { id: 'purple', label: 'Violet',  value: '263 70% 50%' },
  { id: 'blue',   label: 'Bleu',    value: '217 91% 60%' },
  { id: 'emerald',label: 'Émeraude',value: '160 84% 39%' },
  { id: 'rose',   label: 'Rose',    value: '330 81% 60%' },
  { id: 'amber',  label: 'Ambre',   value: '38 92% 50%'  },
  { id: 'red',    label: 'Rouge',   value: '0 84% 60%'   },
];

export { ACCENT_COLORS };

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState]       = useState<string>('dark');
  const [partyMode, setPartyModeState] = useState<boolean>(false);
  const [isPremium, setIsPremium]      = useState<boolean>(false);
  const [accentColor, setAccentColor]  = useState<string>(ACCENT_COLORS[0].id);
  const [compactMode, setCompactMode]  = useState<boolean>(false);
  const { addNotification } = useNotifications();

  const applyAccent = (colorId: string) => {
    const found = ACCENT_COLORS.find(c => c.id === colorId) || ACCENT_COLORS[0];
    document.documentElement.style.setProperty('--primary', found.value);
  };

  const applyTheme = (themeValue: string) => {
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(themeValue);
    document.documentElement.style.setProperty('--theme-transition', 'background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease');
  };

  useEffect(() => {
    try {
      // Détection des préférences système
      const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const savedTheme = localStorage.getItem(THEME_KEY) || (systemPrefersDark ? 'dark' : 'light');
      
      setThemeState(savedTheme);
      applyTheme(savedTheme);
      
      setIsPremium(localStorage.getItem(PREMIUM_KEY) === 'true');
      const savedParty = localStorage.getItem(PARTY_KEY) === 'true';
      setPartyModeState(savedParty);
      document.documentElement.classList.toggle('party', savedParty);
      const savedAccent = localStorage.getItem(ACCENT_KEY) || ACCENT_COLORS[0].id;
      setAccentColor(savedAccent);
      applyAccent(savedAccent);
      const savedCompact = localStorage.getItem(COMPACT_KEY) === 'true';
      setCompactMode(savedCompact);
      document.documentElement.classList.toggle('compact', savedCompact);

      // Écouter les changements de préférences système
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = (e: MediaQueryListEvent) => {
        if (!localStorage.getItem(THEME_KEY)) {
          const newTheme = e.matches ? 'dark' : 'light';
          setThemeState(newTheme);
          applyTheme(newTheme);
        }
      };
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    } catch {}
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState(prev => {
      const next = prev === 'dark' ? 'light' : 'dark';
      localStorage.setItem(THEME_KEY, next);
      applyTheme(next);
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

  const changeAccent = useCallback((colorId: string) => {
    setAccentColor(colorId);
    applyAccent(colorId);
    try { localStorage.setItem(ACCENT_KEY, colorId); } catch {}
  }, []);

  const toggleCompactMode = useCallback(() => {
    setCompactMode(prev => {
      const next = !prev;
      localStorage.setItem(COMPACT_KEY, String(next));
      document.documentElement.classList.toggle('compact', next);
      return next;
    });
  }, []);

  const value: PreferencesContextType = {
    theme, toggleTheme, partyMode, togglePartyMode, isPremium, activatePremium,
    accentColor, changeAccent, ACCENT_COLORS, compactMode, toggleCompactMode,
  };

  return (
    <PreferencesContext.Provider value={value}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences(): PreferencesContextType {
  const context = useContext(PreferencesContext);
  if (!context) throw new Error('usePreferences must be used inside PreferencesProvider');
  return context;
}
