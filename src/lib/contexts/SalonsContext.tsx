import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { useNotifications } from './NotificationsContext';
import { useUser } from './UserContext';
import { supabaseDbService, Salon as SupabaseSalon } from '../supabaseDb';
import { presenceService } from '../presenceService';

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
  loadCustomSalons: () => Promise<void>;
}

const SalonsContext = createContext<SalonsContextType | null>(null);

const HIDDEN_SALONS_KEY = 'virtuel_rt_hidden_salons';
const UNLOCKED_SALONS_KEY = 'virtuel_rt_unlocked_salons';

function convertSupabaseSalon(supabaseSalon: SupabaseSalon): Salon {
  return {
    id: supabaseSalon.id,
    name: supabaseSalon.name,
    type: supabaseSalon.type,
    isPrivate: !!supabaseSalon.password,
    password: supabaseSalon.password || undefined,
    live: supabaseSalon.live || undefined,
    count: supabaseSalon.count || undefined,
    welcome: supabaseSalon.welcome,
  };
}

export function SalonsProvider({ children }: { children: ReactNode }) {
  const [customSalons, setCustomSalons] = useState<Salon[]>([]);
  const [hiddenSalons, setHiddenSalons] = useState<string[]>([]);
  const [unlockedSalons, setUnlockedSalons] = useState<Record<string, boolean>>({});
  const [currentSalon, setCurrentSalonRaw] = useState<string | null>(null);
  const { user, supabaseUser } = useUser();

  // Nettoyer currentSalon quand il est mis à null (déconnexion ou quitter)
  const setCurrentSalon = useCallback((id: string | null) => {
    setCurrentSalonRaw(id);
    
    // Mettre à jour la présence quand on change de salon
    const userId = supabaseUser?.id || user?.name;
    if (userId) {
      presenceService.updateCurrentSalon(userId, id, {
        name: user?.name || userId,
        avatar: user?.avatar || 'av1',
        initials: user?.initials || userId.slice(0, 2).toUpperCase(),
        status: user?.status || 'online',
      });
    }
  }, [supabaseUser, user]);

  // Reset du salon courant à chaque montage (pas de salon fantôme persistant)
  // REMOVED: This was causing users to lose their salon on page reload
  // useEffect(() => {
  //   setCurrentSalonRaw(null);
  // }, []);

  const { addNotification } = useNotifications();

  // Charger depuis localStorage (hiddenSalons et unlockedSalons restent locaux)
  useEffect(() => {
    try {
      const savedHidden = localStorage.getItem(HIDDEN_SALONS_KEY);
      if (savedHidden) setHiddenSalons(JSON.parse(savedHidden));
      const savedUnlocked = localStorage.getItem(UNLOCKED_SALONS_KEY);
      if (savedUnlocked) setUnlockedSalons(JSON.parse(savedUnlocked));
      
      // Restaurer le dernier salon actif depuis le hash ou localStorage
      const hash = window.location.hash.replace('#', '');
      if (hash.startsWith('salon/')) {
        setCurrentSalonRaw(hash.replace('salon/', ''));
      }
    } catch {}
  }, []);

  // Persister hiddenSalons avec debouncing
  useEffect(() => {
    try {
      localStorage.setItem(HIDDEN_SALONS_KEY, JSON.stringify(hiddenSalons));
    } catch {}
  }, [hiddenSalons]);

  // Persister unlockedSalons avec debouncing
  useEffect(() => {
    try {
      localStorage.setItem(UNLOCKED_SALONS_KEY, JSON.stringify(unlockedSalons));
    } catch {}
  }, [unlockedSalons]);

  // Charger les salons personnalisés depuis Supabase
  const loadCustomSalons = useCallback(async () => {
    try {
      const salons = await supabaseDbService.getSalons();
      setCustomSalons(salons.map(convertSupabaseSalon));
    } catch (error) {
      console.error('Erreur lors du chargement des salons:', error);
    }
  }, []);

  // Charger les salons au démarrage
  useEffect(() => {
    loadCustomSalons();
  }, [loadCustomSalons]);

  // Écouter l'événement de navigation vers un salon depuis l'URL
  useEffect(() => {
    const handleSetSalonFromUrl = (event: CustomEvent) => {
      const { salonId } = event.detail;
      setCurrentSalonRaw(salonId);
    };

    window.addEventListener('set-salon-from-url', handleSetSalonFromUrl as EventListener);

    return () => {
      window.removeEventListener('set-salon-from-url', handleSetSalonFromUrl as EventListener);
    };
  }, []);

  const addSalon = useCallback(async (salon: Salon) => {
    setCustomSalons(prev => [...prev, salon]);
    addNotification({ type: 'system', message: `✅ Salon « ${salon.name} » créé.` });

    try {
      const supabaseSalon: Omit<SupabaseSalon, 'id' | 'created_at'> = {
        name: salon.name,
        type: salon.type || 'chat',
        icon: salon.emoji || 'MessageSquare',
        count: salon.count,
        live: salon.live,
        welcome: salon.welcome || '',
        password: salon.password,
      };
      await supabaseDbService.addSalon(supabaseSalon);
    } catch (error) {
      console.error('Erreur lors de l\'ajout du salon:', error);
    }
  }, [addNotification]);

  const deleteSalon = useCallback(async (salonId: string) => {
    setCustomSalons(prev => prev.filter(s => s.id !== salonId));
    setHiddenSalons(prev => prev.includes(salonId) ? prev : [...prev, salonId]);

    try {
      await supabaseDbService.deleteSalon(salonId);
    } catch (error) {
      console.error('Erreur lors de la suppression du salon:', error);
    }
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
    isSalonLocked, verifySalonPassword,
    loadCustomSalons
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
