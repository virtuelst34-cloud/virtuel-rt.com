import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { useNotifications } from './NotificationsContext';
import { useUser } from './UserContext';
import { supabaseDbService } from '../supabaseDb';
import { prefsStorageKey, readPrefsField, writePrefsField } from '../utils/prefsStorage';

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

const ACCENT_COLORS: AccentColor[] = [
  { id: 'purple', label: 'Violet',  value: '263 70% 50%' },
  { id: 'blue',   label: 'Bleu',    value: '217 91% 60%' },
  { id: 'emerald',label: 'Émeraude',value: '160 84% 39%' },
  { id: 'rose',   label: 'Rose',    value: '330 81% 60%' },
  { id: 'amber',  label: 'Ambre',   value: '38 92% 50%'  },
  { id: 'red',    label: 'Rouge',   value: '0 84% 60%'   },
];

export { ACCENT_COLORS };

function getSystemTheme(): string {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState]       = useState<string>('dark');
  const [partyMode, setPartyModeState] = useState<boolean>(false);
  const [isPremium, setIsPremium]      = useState<boolean>(false);
  const [accentColor, setAccentColor]  = useState<string>(ACCENT_COLORS[0].id);
  const [compactMode, setCompactMode]  = useState<boolean>(false);
  const { addNotification } = useNotifications();
  const { user, supabaseUser } = useUser();

  const userKey = supabaseUser?.id || user?.name || 'anonymous';

  const applyAccent = useCallback((colorId: string) => {
    const found = ACCENT_COLORS.find(c => c.id === colorId) || ACCENT_COLORS[0];
    document.documentElement.style.setProperty('--primary', found.value);
  }, []);

  const applyTheme = useCallback((themeValue: string) => {
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(themeValue);
    document.documentElement.style.setProperty('--theme-transition', 'background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease');
  }, []);

  const applyAll = useCallback((prefs: {
    theme: string;
    partyMode: boolean;
    isPremium: boolean;
    accentColor: string;
    compactMode: boolean;
  }) => {
    setThemeState(prefs.theme);
    applyTheme(prefs.theme);
    setPartyModeState(prefs.partyMode);
    document.documentElement.classList.toggle('party', prefs.partyMode);
    setIsPremium(prefs.isPremium);
    setAccentColor(prefs.accentColor);
    applyAccent(prefs.accentColor);
    setCompactMode(prefs.compactMode);
    document.documentElement.classList.toggle('compact', prefs.compactMode);
  }, [applyAccent, applyTheme]);

  const loadFromLocal = useCallback((key: string) => {
    const savedTheme = readPrefsField(key, 'theme');
    const savedParty = readPrefsField(key, 'party') === 'true';
    const savedAccent = readPrefsField(key, 'accent') || ACCENT_COLORS[0].id;
    const savedCompact = readPrefsField(key, 'compact') === 'true';
    const savedPremium = readPrefsField(key, 'premium') === 'true';

    applyAll({
      theme: savedTheme || getSystemTheme(),
      partyMode: savedParty,
      isPremium: savedPremium,
      accentColor: savedAccent,
      compactMode: savedCompact,
    });
  }, [applyAll]);

  const persistLocal = useCallback((key: string, prefs: {
    theme?: string;
    partyMode?: boolean;
    isPremium?: boolean;
    accentColor?: string;
    compactMode?: boolean;
  }) => {
    if (prefs.theme !== undefined) writePrefsField(key, 'theme', prefs.theme);
    if (prefs.partyMode !== undefined) writePrefsField(key, 'party', String(prefs.partyMode));
    if (prefs.isPremium !== undefined) writePrefsField(key, 'premium', String(prefs.isPremium));
    if (prefs.accentColor !== undefined) writePrefsField(key, 'accent', prefs.accentColor);
    if (prefs.compactMode !== undefined) writePrefsField(key, 'compact', String(prefs.compactMode));
  }, []);

  const loadPreferences = useCallback(async () => {
    if (!user) {
      loadFromLocal('anonymous');
      return;
    }

    try {
      const prefs = await supabaseDbService.getPreferences(user.name);
      if (prefs) {
        const merged = {
          theme: prefs.theme,
          partyMode: prefs.party_mode,
          isPremium: prefs.is_premium,
          accentColor: prefs.accent_color,
          compactMode: prefs.compact_mode,
        };
        applyAll(merged);
        persistLocal(userKey, merged);
        return;
      }
    } catch (error) {
      console.error('Erreur lors du chargement des préférences:', error);
    }

    loadFromLocal(userKey);
  }, [user, userKey, applyAll, loadFromLocal, persistLocal]);

  useEffect(() => {
    void loadPreferences();
  }, [loadPreferences]);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      if (!user && readPrefsField('anonymous', 'theme') === null) {
        const systemTheme = e.matches ? 'dark' : 'light';
        setThemeState(systemTheme);
        applyTheme(systemTheme);
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [user, applyTheme]);

  const syncPreferences = useCallback(async (updates: {
    theme?: 'dark' | 'light';
    party_mode?: boolean;
    is_premium?: boolean;
    accent_color?: string;
    compact_mode?: boolean;
  }) => {
    if (!user) return;
    try {
      await supabaseDbService.updatePreferences(user.name, updates);
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des préférences:', error);
    }
  }, [user]);

  const toggleTheme = useCallback(async () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    applyAll({ theme: next, partyMode, isPremium, accentColor, compactMode });
    persistLocal(userKey, { theme: next });
    await syncPreferences({ theme: next as 'dark' | 'light' });
  }, [theme, partyMode, isPremium, accentColor, compactMode, userKey, applyAll, persistLocal, syncPreferences]);

  const togglePartyMode = useCallback(async () => {
    const next = !partyMode;
    applyAll({ theme, partyMode: next, isPremium, accentColor, compactMode });
    persistLocal(userKey, { partyMode: next });
    await syncPreferences({ party_mode: next });
  }, [theme, partyMode, isPremium, accentColor, compactMode, userKey, applyAll, persistLocal, syncPreferences]);

  const activatePremium = useCallback(async () => {
    applyAll({ theme, partyMode, isPremium: true, accentColor, compactMode });
    persistLocal(userKey, { isPremium: true });
    addNotification({ type: 'premium', message: '🌟 Bienvenue dans le club Premium !' });
    await syncPreferences({ is_premium: true });
  }, [theme, partyMode, accentColor, compactMode, userKey, applyAll, persistLocal, addNotification, syncPreferences]);

  const changeAccent = useCallback(async (colorId: string) => {
    applyAll({ theme, partyMode, isPremium, accentColor: colorId, compactMode });
    persistLocal(userKey, { accentColor: colorId });
    await syncPreferences({ accent_color: colorId });
  }, [theme, partyMode, isPremium, compactMode, userKey, applyAll, persistLocal, syncPreferences]);

  const toggleCompactMode = useCallback(async () => {
    const next = !compactMode;
    applyAll({ theme, partyMode, isPremium, accentColor, compactMode: next });
    persistLocal(userKey, { compactMode: next });
    await syncPreferences({ compact_mode: next });
  }, [theme, partyMode, isPremium, accentColor, compactMode, userKey, applyAll, persistLocal, syncPreferences]);

  const value: PreferencesContextType = {
    theme, toggleTheme, partyMode, togglePartyMode, isPremium, activatePremium,
    accentColor, changeAccent, ACCENT_COLORS, compactMode, toggleCompactMode,
    loadPreferences,
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
