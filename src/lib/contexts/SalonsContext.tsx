import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { useNotifications } from './NotificationsContext';
import { useUser } from './UserContext';
import { supabaseDbService, Salon as SupabaseSalon } from '../supabaseDb';
import { presenceService } from '../presenceService';
import { supabase } from '../supabase';

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
    emoji: supabaseSalon.icon || '💬',
    isPrivate: !!supabaseSalon.password,
    password: supabaseSalon.password || undefined,
    live: supabaseSalon.live || undefined,
    count: supabaseSalon.count || undefined,
    welcome: supabaseSalon.welcome,
  };
}

function mergeSalonLists(existing: Salon[], incoming: Salon[]): Salon[] {
  const map = new Map<string, Salon>();
  for (const salon of incoming) map.set(salon.id, salon);
  for (const salon of existing) {
    if (!map.has(salon.id)) map.set(salon.id, salon);
  }
  return Array.from(map.values());
}

export function SalonsProvider({ children }: { children: ReactNode }) {
  const [customSalons, setCustomSalons] = useState<Salon[]>([]);
  const [hiddenSalons, setHiddenSalons] = useState<string[]>([]);
  const [unlockedSalons, setUnlockedSalons] = useState<Record<string, boolean>>({});
  const [currentSalon, setCurrentSalonRaw] = useState<string | null>(null);
  const { user, supabaseUser } = useUser();

  const setCurrentSalon = useCallback((id: string | null) => {
    setCurrentSalonRaw(id);

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

  const { addNotification } = useNotifications();

  useEffect(() => {
    try {
      const savedHidden = localStorage.getItem(HIDDEN_SALONS_KEY);
      if (savedHidden) setHiddenSalons(JSON.parse(savedHidden));
      const savedUnlocked = localStorage.getItem(UNLOCKED_SALONS_KEY);
      if (savedUnlocked) setUnlockedSalons(JSON.parse(savedUnlocked));

      const hash = window.location.hash.replace('#', '');
      if (hash.startsWith('salon/')) {
        setCurrentSalonRaw(hash.replace('salon/', ''));
      }
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(HIDDEN_SALONS_KEY, JSON.stringify(hiddenSalons));
    } catch {}
  }, [hiddenSalons]);

  useEffect(() => {
    try {
      localStorage.setItem(UNLOCKED_SALONS_KEY, JSON.stringify(unlockedSalons));
    } catch {}
  }, [unlockedSalons]);

  const loadCustomSalons = useCallback(async () => {
    try {
      const salons = await supabaseDbService.getSalons();
      setCustomSalons(prev => mergeSalonLists(prev, salons.map(convertSupabaseSalon)));
    } catch (error) {
      console.error('Erreur lors du chargement des salons:', error);
    }
  }, []);

  useEffect(() => {
    loadCustomSalons();
  }, [loadCustomSalons]);

  useEffect(() => {
    const channel = supabase
      .channel('salons-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'salons' },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            const deleted = payload.old as SupabaseSalon;
            if (deleted?.id) {
              setCustomSalons(prev => prev.filter(s => s.id !== deleted.id));
            }
            return;
          }
          const row = payload.new as SupabaseSalon;
          if (!row?.id) return;
          const salon = convertSupabaseSalon(row);
          setCustomSalons(prev => mergeSalonLists(prev, [salon]));
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

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
    setCustomSalons(prev => mergeSalonLists(prev, [salon]));

    try {
      const supabaseSalon: Omit<SupabaseSalon, 'created_at'> = {
        id: salon.id,
        name: salon.name,
        type: salon.type || 'chat',
        icon: salon.emoji || '💬',
        count: salon.count,
        live: salon.live,
        welcome: salon.welcome || '',
        password: salon.password,
      };
      const saved = await supabaseDbService.addSalon(supabaseSalon, user?.name);
      if (!saved) {
        setCustomSalons(prev => prev.filter(s => s.id !== salon.id));
        addNotification({
          type: 'error',
          message: `Impossible de créer le salon « ${salon.name} ».`,
        });
        return;
      }
      setCustomSalons(prev => mergeSalonLists(prev, [convertSupabaseSalon(saved)]));
      addNotification({ type: 'system', message: `✅ Salon « ${salon.name} » créé.` });
    } catch (error) {
      setCustomSalons(prev => prev.filter(s => s.id !== salon.id));
      console.error('Erreur lors de l\'ajout du salon:', error);
      addNotification({
        type: 'error',
        message: error instanceof Error ? error.message : 'Impossible de créer le salon',
      });
    }
  }, [addNotification, user?.name]);

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
    const salon = customSalons.find(s => s.id === salonId);
    return Boolean(salon?.isPrivate && !unlockedSalons[salonId]);
  }, [customSalons, unlockedSalons]);

  const verifySalonPassword = useCallback((salonId: string, password: string) => {
    const salon = customSalons.find(s => s.id === salonId);
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
