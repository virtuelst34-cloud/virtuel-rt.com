import React, { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from 'react';
import { useNotifications } from './NotificationsContext';

interface Salon {
  id: string;
  name: string;
  emoji?: string;
  type?: string;
  isPrivate?: boolean;
  password?: string;
  live?: boolean;
  count?: number;
  welcome?: string;
}

interface SalonsContextType {
  customSalons: Salon[];
  setCustomSalons: React.Dispatch<React.SetStateAction<Salon[]>>;
  hiddenSalons: string[];
  setHiddenSalons: React.Dispatch<React.SetStateAction<string[]>>;
  currentSalon: string | null;
  setCurrentSalon: (id: string | null) => void;
  addSalon: (salon: Salon) => void;
  deleteSalon: (salonId: string) => void;
  isSalonLocked: (salonId: string) => boolean;
  verifySalonPassword: (salonId: string, password: string) => boolean;
}

const SalonsContext = createContext<SalonsContextType | null>(null);

const SALONS_KEY = 'virtuel_st_custom_salons';
const HIDDEN_SALONS_KEY = 'virtuel_st_hidden_salons';
const UNLOCKED_SALONS_KEY = 'virtuel_st_unlocked_salons';

export function SalonsProvider({ children }: { children: ReactNode }) {
  const [customSalons, setCustomSalons] = useState<Salon[]>([]);
  const [hiddenSalons, setHiddenSalons] = useState<string[]>([]);
  const [unlockedSalons, setUnlockedSalons] = useState<Record<string, boolean>>({});
  const [currentSalon, setCurrentSalonRaw] = useState<string | null>(null);

  // Nettoyer currentSalon quand il est mis à null (déconnexion ou quitter)
  const setCurrentSalon = useCallback((id: string | null) => {
    setCurrentSalonRaw(id);
  }, []);

  // Reset du salon courant à chaque montage (pas de salon fantôme persistant)
  useEffect(() => {
    setCurrentSalonRaw(null);
  }, []);
  const { addNotification } = useNotifications();
  const customTimerRef = useRef<number | null>(null);
  const hiddenTimerRef = useRef<number | null>(null);

  // Charger depuis localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(SALONS_KEY);
      if (saved) setCustomSalons(JSON.parse(saved));
      const savedHidden = localStorage.getItem(HIDDEN_SALONS_KEY);
      if (savedHidden) setHiddenSalons(JSON.parse(savedHidden));
      const savedUnlocked = localStorage.getItem(UNLOCKED_SALONS_KEY);
      if (savedUnlocked) setUnlockedSalons(JSON.parse(savedUnlocked));
    } catch {}
  }, []);

  // Persister avec debouncing
  useEffect(() => {
    if (customTimerRef.current) clearTimeout(customTimerRef.current);
    customTimerRef.current = setTimeout(() => {
      try {
        localStorage.setItem(SALONS_KEY, JSON.stringify(customSalons));
      } catch {}
    }, 300);
    return () => {
      if (customTimerRef.current) clearTimeout(customTimerRef.current);
    };
  }, [customSalons]);

  useEffect(() => {
    if (hiddenTimerRef.current) clearTimeout(hiddenTimerRef.current);
    hiddenTimerRef.current = setTimeout(() => {
      try {
        localStorage.setItem(HIDDEN_SALONS_KEY, JSON.stringify(hiddenSalons));
      } catch {}
    }, 300);
    return () => {
      if (hiddenTimerRef.current) clearTimeout(hiddenTimerRef.current);
    };
  }, [hiddenSalons]);

  const unlockedTimerRef = useRef<number | null>(null);
  useEffect(() => {
    if (unlockedTimerRef.current) clearTimeout(unlockedTimerRef.current);
    unlockedTimerRef.current = setTimeout(() => {
      try {
        localStorage.setItem(UNLOCKED_SALONS_KEY, JSON.stringify(unlockedSalons));
      } catch {}
    }, 300);
    return () => {
      if (unlockedTimerRef.current) clearTimeout(unlockedTimerRef.current);
    };
  }, [unlockedSalons]);

  const addSalon = useCallback((salon: Salon) => {
    setCustomSalons(prev => [...prev, salon]);
    addNotification({ type: 'system', message: `✅ Salon « ${salon.name} » créé.` });
  }, [addNotification]);

  const deleteSalon = useCallback((salonId: string) => {
    setCustomSalons(prev => prev.filter(s => s.id !== salonId));
    setHiddenSalons(prev => prev.includes(salonId) ? prev : [...prev, salonId]);
  }, []);

  const isSalonLocked = useCallback((salonId: string): boolean => {
    const allSalons = [...customSalons];
    const salon = allSalons.find(s => s.id === salonId);
    return Boolean(salon?.isPrivate && !unlockedSalons[salonId]);
  }, [customSalons, unlockedSalons]);

  const verifySalonPassword = useCallback((salonId: string, password: string) => {
    const allSalons = [...customSalons];
    const salon = allSalons.find(s => s.id === salonId);
    if (!salon?.isPrivate) return true;
    if (salon.password === password) {
      setUnlockedSalons(prev => ({ ...prev, [salonId]: true }));
      return true;
    }
    return false;
  }, [customSalons]);

  const value: SalonsContextType = {
    customSalons, setCustomSalons, hiddenSalons, setHiddenSalons,
    currentSalon, setCurrentSalon,
    addSalon, deleteSalon,
    isSalonLocked, verifySalonPassword
  };

  return (
    <SalonsContext.Provider value={value}>
      {children}
    </SalonsContext.Provider>
  );
}

export function useSalons(): SalonsContextType {
  const context = useContext(SalonsContext);
  if (!context) throw new Error('useSalons must be used inside SalonsProvider');
  return context;
}
