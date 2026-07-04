import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { useNotifications } from './NotificationsContext';
import { useUser } from './UserContext';
import { supabaseDbService } from '../supabaseDb';

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
  loadPreferences: () => Promise<void>;
}

const PreferencesContext = createContext<PreferencesContextType | null>(null);

const THEME_KEY   = 'virtuel_rt_theme';
const PARTY_KEY   = 'virtuel_rt_party';
const ACCENT_KEY  = 'virtuel_rt_accent';
const COMPACT_KEY = 'virtuel_rt_compact';

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
  const { user } = useUser();

  const applyAccent = (colorId: string) => {
    const found = ACCENT_COLORS.find(c => c.id === colorId) || ACCENT_COLORS[0];
    document.documentElement.style.setProperty('--primary', found.value);
  };

  const applyTheme = (themeValue: string) => {
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(themeValue);
    document.documentElement.style.setProperty('--theme-transition', 'background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease');
  };

  const getSystemTheme = (): string => {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  };

  // Charger les préférences depuis Supabase
  const loadPreferences = useCallback(async () => {
    if (!user) {
      // Pour les utilisateurs non connectés, utiliser le thème système
      const systemTheme = getSystemTheme();
      setThemeState(systemTheme);
      applyTheme(systemTheme);
      return;
    }

    try {
      const prefs = await supabaseDbService.getPreferences(user.name);
      if (prefs) {
        setThemeState(prefs.theme);
        applyTheme(prefs.theme);
        setPartyModeState(prefs.party_mode);
        document.documentElement.classList.toggle('party', prefs.party_mode);
        setIsPremium(prefs.is_premium);
        setAccentColor(prefs.accent_color);
        applyAccent(prefs.accent_color);
        setCompactMode(prefs.compact_mode);
        document.documentElement.classList.toggle('compact', prefs.compact_mode);
      } else {
        // Pas de préférences sauvegardées, utiliser le thème système
        const systemTheme = getSystemTheme();
        setThemeState(systemTheme);
        applyTheme(systemTheme);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des préférences:', error);
      // Fallback vers localStorage ou thème système
      try {
        const savedTheme = localStorage.getItem(THEME_KEY);
        if (savedTheme) {
          setThemeState(savedTheme);
          applyTheme(savedTheme);
        } else {
          const systemTheme = getSystemTheme();
          setThemeState(systemTheme);
          applyTheme(systemTheme);
        }
        const savedParty = localStorage.getItem(PARTY_KEY) === 'true';
        setPartyModeState(savedParty);
        document.documentElement.classList.toggle('party', savedParty);
        const savedAccent = localStorage.getItem(ACCENT_KEY) || ACCENT_COLORS[0].id;
        setAccentColor(savedAccent);
        applyAccent(savedAccent);
        const savedCompact = localStorage.getItem(COMPACT_KEY) === 'true';
        setCompactMode(savedCompact);
        document.documentElement.classList.toggle('compact', savedCompact);
      } catch {}
    }
  }, [user]);

  // Charger les préférences au démarrage et quand l'utilisateur change
  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  // Écouter les changements de préférences système
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      const systemTheme = e.matches ? 'dark' : 'light';
      // Ne changer que si l'utilisateur n'a pas de préférence explicite sauvegardée
      const hasExplicitPreference = localStorage.getItem(THEME_KEY) !== null;
      if (!hasExplicitPreference && !user) {
        setThemeState(systemTheme);
        applyTheme(systemTheme);
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [user]);

  const toggleTheme = useCallback(async () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setThemeState(next);
    applyTheme(next);
    localStorage.setItem(THEME_KEY, next);

    // Synchroniser avec Supabase
    if (user) {
      try {
        await supabaseDbService.updatePreferences(user.name, { theme: next as 'dark' | 'light' });
      } catch (error) {
        console.error('Erreur lors de la mise à jour du thème:', error);
      }
    }
  }, [theme, user]);

  const togglePartyMode = useCallback(async () => {
    const next = !partyMode;
    setPartyModeState(next);
    localStorage.setItem(PARTY_KEY, String(next));
    document.documentElement.classList.toggle('party', next);

    // Synchroniser avec Supabase
    if (user) {
      try {
        await supabaseDbService.updatePreferences(user.name, { party_mode: next });
      } catch (error) {
        console.error('Erreur lors de la mise à jour du mode party:', error);
      }
    }
  }, [partyMode, user]);

  const activatePremium = useCallback(async () => {
    setIsPremium(true);
    localStorage.setItem('virtuel_rt_premium', 'true');
    addNotification({ type: 'premium', message: '🌟 Bienvenue dans le club Premium !' });

    // Synchroniser avec Supabase
    if (user) {
      try {
        await supabaseDbService.updatePreferences(user.name, { is_premium: true });
      } catch (error) {
        console.error('Erreur lors de l\'activation du premium:', error);
      }
    }
  }, [addNotification, user]);

  const changeAccent = useCallback(async (colorId: string) => {
    setAccentColor(colorId);
    applyAccent(colorId);
    try { localStorage.setItem(ACCENT_KEY, colorId); } catch {}

    // Synchroniser avec Supabase
    if (user) {
      try {
        await supabaseDbService.updatePreferences(user.name, { accent_color: colorId });
      } catch (error) {
        console.error('Erreur lors de la mise à jour de l\'accent:', error);
      }
    }
  }, [user]);

  const toggleCompactMode = useCallback(async () => {
    const next = !compactMode;
    setCompactMode(next);
    localStorage.setItem(COMPACT_KEY, String(next));
    document.documentElement.classList.toggle('compact', next);

    // Synchroniser avec Supabase
    if (user) {
      try {
        await supabaseDbService.updatePreferences(user.name, { compact_mode: next });
      } catch (error) {
        console.error('Erreur lors de la mise à jour du mode compact:', error);
      }
    }
  }, [compactMode, user]);

  const value: PreferencesContextType = {
    theme, toggleTheme, partyMode, togglePartyMode, isPremium, activatePremium,
    accentColor, changeAccent, ACCENT_COLORS, compactMode, toggleCompactMode,
    loadPreferences
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
