import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
  DEFAULT_GLOBAL_SETTINGS,
  fetchGlobalSettings,
  type GlobalSettings,
} from '@/lib/globalSettings';

interface GlobalSettingsContextValue {
  settings: GlobalSettings;
  loading: boolean;
  refresh: () => Promise<void>;
}

const GlobalSettingsContext = createContext<GlobalSettingsContextValue>({
  settings: DEFAULT_GLOBAL_SETTINGS,
  loading: true,
  refresh: async () => {},
});

export function GlobalSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<GlobalSettings>(DEFAULT_GLOBAL_SETTINGS);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    const next = await fetchGlobalSettings();
    setSettings(next);
    setLoading(false);
  };

  useEffect(() => {
    void refresh();
  }, []);

  return (
    <GlobalSettingsContext.Provider value={{ settings, loading, refresh }}>
      {children}
    </GlobalSettingsContext.Provider>
  );
}

export function useGlobalSettings() {
  return useContext(GlobalSettingsContext);
}
