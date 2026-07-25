import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { useNotifications } from './NotificationsContext';
import { useUser } from './UserContext';
import { supabaseDbService } from '../supabaseDb';
import { readPrefsField, writePrefsField } from '../utils/prefsStorage';

interface AccentColor {
  id: string;
  label: string;
  value: string;
}

export type AmbianceMode = 'off' | 'nebula' | 'phosphor' | 'abyss' | 'braises' | 'spectre' | 'aurore' | 'coquin';

export interface AmbianceOption {
  id: Exclude<AmbianceMode, 'off'>;
  label: string;
  description: string;
  emoji: string;
  activeClass: string;
  /** Réservé Premium */
  premiumOnly?: boolean;
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
  ambianceMode: AmbianceMode;
  setAmbianceMode: (mode: AmbianceMode) => void;
  AMBIANCE_OPTIONS: AmbianceOption[];
  coquinMode: boolean;
  setCoquinMode: (on: boolean) => boolean;
  toggleCoquinMode: () => boolean;
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

export const AMBIANCE_OPTIONS: AmbianceOption[] = [
  {
    id: 'nebula',
    label: 'Nébuleuse',
    description: 'Aurores cosmiques, brume violette et cyan',
    emoji: '🌌',
    activeClass: 'bg-violet-500/15 border-violet-400/40 text-violet-300',
  },
  {
    id: 'phosphor',
    label: 'Phosphore',
    description: 'Terminal CRT, scanlines et vert phosphorescent',
    emoji: '🖥️',
    activeClass: 'bg-emerald-500/15 border-emerald-400/40 text-emerald-300',
  },
  {
    id: 'abyss',
    label: 'Abysse',
    description: 'Océan profond, bioluminescence et reflets',
    emoji: '🌊',
    activeClass: 'bg-cyan-500/15 border-cyan-400/40 text-cyan-300',
  },
  {
    id: 'braises',
    label: 'Braises',
    description: 'Braises vivantes, étincelles et chaleur ambrée',
    emoji: '🔥',
    activeClass: 'bg-orange-500/15 border-orange-400/40 text-orange-300',
  },
  {
    id: 'spectre',
    label: 'Spectre',
    description: 'Holo irisé, scintillement prismatique animé',
    emoji: '👻',
    activeClass: 'bg-fuchsia-500/15 border-fuchsia-400/40 text-fuchsia-300',
  },
  {
    id: 'aurore',
    label: 'Aurore',
    description: 'Lumière douce du matin, pastels clairs',
    emoji: '🌅',
    activeClass: 'bg-sky-500/15 border-sky-400/50 text-sky-700 dark:text-sky-300',
  },
  {
    id: 'coquin',
    label: 'Coquin',
    description: 'Soirée 18+ rose & violet — réservé Premium',
    emoji: '💋',
    activeClass: 'bg-rose-500/15 border-rose-400/45 text-rose-300',
    premiumOnly: true,
  },
];

const AMBIANCE_CLASSES = [
  'ambiance-nebula',
  'ambiance-phosphor',
  'ambiance-abyss',
  'ambiance-braises',
  'ambiance-spectre',
  'ambiance-aurore',
  'ambiance-coquin',
] as const;

export { ACCENT_COLORS };

function getSystemTheme(): string {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function parseAmbiance(raw: string | null): AmbianceMode {
  if (
    raw === 'nebula' ||
    raw === 'phosphor' ||
    raw === 'abyss' ||
    raw === 'braises' ||
    raw === 'spectre' ||
    raw === 'aurore' ||
    raw === 'coquin'
  ) {
    return raw;
  }
  return 'off';
}

function applyAmbianceClass(mode: AmbianceMode) {
  const root = document.documentElement;
  for (const cls of AMBIANCE_CLASSES) root.classList.remove(cls);
  if (mode !== 'off') root.classList.add(`ambiance-${mode}`);
  root.classList.toggle('coquin-mode', mode === 'coquin');
}

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState]       = useState<string>('dark');
  const [partyMode, setPartyModeState] = useState<boolean>(false);
  const [isPremium, setIsPremium]      = useState<boolean>(false);
  const [accentColor, setAccentColor]  = useState<string>(ACCENT_COLORS[0].id);
  const [compactMode, setCompactMode]  = useState<boolean>(false);
  const [ambianceMode, setAmbianceModeState] = useState<AmbianceMode>('off');
  const [coquinMode, setCoquinModeState] = useState<boolean>(false);
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
    ambianceMode: AmbianceMode;
    coquinMode: boolean;
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
    // Coquin ambiance implies coquinMode; coquinMode can be on without ambiance
    const effectiveAmbiance = prefs.ambianceMode;
    const effectiveCoquin = prefs.coquinMode || effectiveAmbiance === 'coquin';
    setAmbianceModeState(effectiveAmbiance);
    applyAmbianceClass(effectiveAmbiance);
    setCoquinModeState(effectiveCoquin);
    document.documentElement.classList.toggle('coquin-mode', effectiveCoquin);
  }, [applyAccent, applyTheme]);

  const loadFromLocal = useCallback((key: string) => {
    const savedTheme = readPrefsField(key, 'theme');
    const savedParty = readPrefsField(key, 'party') === 'true';
    const savedAccent = readPrefsField(key, 'accent') || ACCENT_COLORS[0].id;
    const savedCompact = readPrefsField(key, 'compact') === 'true';
    const savedPremium = readPrefsField(key, 'premium') === 'true';
    const savedAmbiance = parseAmbiance(readPrefsField(key, 'ambiance'));
    const savedCoquin = readPrefsField(key, 'coquin') === 'true' || savedAmbiance === 'coquin';

    applyAll({
      theme: savedTheme || getSystemTheme(),
      partyMode: savedParty,
      isPremium: savedPremium,
      accentColor: savedAccent,
      compactMode: savedCompact,
      ambianceMode: savedPremium ? savedAmbiance : (savedAmbiance === 'coquin' ? 'off' : savedAmbiance),
      coquinMode: savedPremium && savedCoquin,
    });
  }, [applyAll]);

  const persistLocal = useCallback((key: string, prefs: {
    theme?: string;
    partyMode?: boolean;
    isPremium?: boolean;
    accentColor?: string;
    compactMode?: boolean;
    ambianceMode?: AmbianceMode;
    coquinMode?: boolean;
  }) => {
    if (prefs.theme !== undefined) writePrefsField(key, 'theme', prefs.theme);
    if (prefs.partyMode !== undefined) writePrefsField(key, 'party', String(prefs.partyMode));
    if (prefs.isPremium !== undefined) writePrefsField(key, 'premium', String(prefs.isPremium));
    if (prefs.accentColor !== undefined) writePrefsField(key, 'accent', prefs.accentColor);
    if (prefs.compactMode !== undefined) writePrefsField(key, 'compact', String(prefs.compactMode));
    if (prefs.ambianceMode !== undefined) writePrefsField(key, 'ambiance', prefs.ambianceMode);
    if (prefs.coquinMode !== undefined) writePrefsField(key, 'coquin', String(prefs.coquinMode));
  }, []);

  const loadPreferences = useCallback(async () => {
    if (!user) {
      loadFromLocal('anonymous');
      return;
    }

    try {
      const prefs = await supabaseDbService.getPreferences(user.name);
      if (prefs) {
        const localAmbiance = parseAmbiance(readPrefsField(userKey, 'ambiance'));
        const localCoquin = readPrefsField(userKey, 'coquin') === 'true' || localAmbiance === 'coquin';
        const premium = prefs.is_premium;
        const merged = {
          theme: prefs.theme,
          partyMode: prefs.party_mode,
          isPremium: premium,
          accentColor: prefs.accent_color,
          compactMode: prefs.compact_mode,
          ambianceMode: (premium ? localAmbiance : (localAmbiance === 'coquin' ? 'off' : localAmbiance)) as AmbianceMode,
          coquinMode: premium && localCoquin,
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
    applyAll({ theme: next, partyMode, isPremium, accentColor, compactMode, ambianceMode, coquinMode });
    persistLocal(userKey, { theme: next });
    await syncPreferences({ theme: next as 'dark' | 'light' });
  }, [theme, partyMode, isPremium, accentColor, compactMode, ambianceMode, coquinMode, userKey, applyAll, persistLocal, syncPreferences]);

  const togglePartyMode = useCallback(async () => {
    const next = !partyMode;
    const nextAmbiance: AmbianceMode = next ? 'off' : ambianceMode;
    applyAll({ theme, partyMode: next, isPremium, accentColor, compactMode, ambianceMode: nextAmbiance, coquinMode });
    persistLocal(userKey, { partyMode: next, ambianceMode: nextAmbiance });
    await syncPreferences({ party_mode: next });
  }, [theme, partyMode, isPremium, accentColor, compactMode, ambianceMode, coquinMode, userKey, applyAll, persistLocal, syncPreferences]);

  const activatePremium = useCallback(async () => {
    applyAll({ theme, partyMode, isPremium: true, accentColor, compactMode, ambianceMode, coquinMode });
    persistLocal(userKey, { isPremium: true });
    addNotification({ type: 'premium', message: '🌟 Bienvenue dans le club Premium !' });
    await syncPreferences({ is_premium: true });
  }, [theme, partyMode, accentColor, compactMode, ambianceMode, coquinMode, userKey, applyAll, persistLocal, addNotification, syncPreferences]);

  const changeAccent = useCallback(async (colorId: string) => {
    applyAll({ theme, partyMode, isPremium, accentColor: colorId, compactMode, ambianceMode, coquinMode });
    persistLocal(userKey, { accentColor: colorId });
    await syncPreferences({ accent_color: colorId });
  }, [theme, partyMode, isPremium, compactMode, ambianceMode, coquinMode, userKey, applyAll, persistLocal, syncPreferences]);

  const toggleCompactMode = useCallback(async () => {
    const next = !compactMode;
    applyAll({ theme, partyMode, isPremium, accentColor, compactMode: next, ambianceMode, coquinMode });
    persistLocal(userKey, { compactMode: next });
    await syncPreferences({ compact_mode: next });
  }, [theme, partyMode, isPremium, accentColor, compactMode, ambianceMode, coquinMode, userKey, applyAll, persistLocal, syncPreferences]);

  const setCoquinMode = useCallback((on: boolean): boolean => {
    if (on && !isPremium) {
      addNotification({
        type: 'premium',
        message: '🔒 Mode coquin réservé Premium — activez Premium pour débloquer.',
      });
      return false;
    }
    const nextAmbiance: AmbianceMode = on
      ? (ambianceMode === 'off' ? 'coquin' : ambianceMode === 'coquin' ? 'coquin' : ambianceMode)
      : (ambianceMode === 'coquin' ? 'off' : ambianceMode);
    const nextParty = on ? false : partyMode;
    applyAll({
      theme,
      partyMode: nextParty,
      isPremium,
      accentColor,
      compactMode,
      ambianceMode: nextAmbiance,
      coquinMode: on,
    });
    persistLocal(userKey, { coquinMode: on, ambianceMode: nextAmbiance, partyMode: nextParty });
    if (nextParty !== partyMode) void syncPreferences({ party_mode: nextParty });
    addNotification({
      type: 'system',
      message: on
        ? '🔥 Mode coquin activé — salons & jeux adultes débloqués (18+).'
        : 'Mode coquin désactivé — contenu adulte masqué.',
    });
    return true;
  }, [isPremium, ambianceMode, partyMode, theme, accentColor, compactMode, userKey, applyAll, persistLocal, syncPreferences, addNotification]);

  const toggleCoquinMode = useCallback(() => setCoquinMode(!coquinMode), [setCoquinMode, coquinMode]);

  const setAmbianceMode = useCallback((mode: AmbianceMode) => {
    const opt = AMBIANCE_OPTIONS.find(o => o.id === mode);
    if (mode !== 'off' && opt?.premiumOnly && !isPremium) {
      addNotification({
        type: 'premium',
        message: '🔒 Ambiance Coquin réservée Premium.',
      });
      return;
    }
    const next = ambianceMode === mode ? 'off' : mode;
    const nextParty = next !== 'off' ? false : partyMode;
    const nextCoquin = next === 'coquin' ? true : (next === 'off' && ambianceMode === 'coquin' ? false : coquinMode);
    applyAll({
      theme,
      partyMode: nextParty,
      isPremium,
      accentColor,
      compactMode,
      ambianceMode: next,
      coquinMode: nextCoquin,
    });
    persistLocal(userKey, { ambianceMode: next, partyMode: nextParty, coquinMode: nextCoquin });
    if (nextParty !== partyMode) {
      void syncPreferences({ party_mode: nextParty });
    }
  }, [theme, partyMode, isPremium, accentColor, compactMode, ambianceMode, coquinMode, userKey, applyAll, persistLocal, syncPreferences, addNotification]);

  const value: PreferencesContextType = {
    theme, toggleTheme, partyMode, togglePartyMode, isPremium, activatePremium,
    accentColor, changeAccent, ACCENT_COLORS, compactMode, toggleCompactMode,
    ambianceMode, setAmbianceMode, AMBIANCE_OPTIONS,
    coquinMode, setCoquinMode, toggleCoquinMode,
    loadPreferences,
  };

  return (
    <PreferencesContext.Provider value={value}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences() {
  const ctx = useContext(PreferencesContext);
  if (!ctx) throw new Error('usePreferences must be used within PreferencesProvider');
  return ctx;
}
