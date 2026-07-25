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
  description?: string;
  sort_order?: number;
  created_by?: string;
}

interface SalonsContextType {
  customSalons: Salon[];
  setCustomSalons: React.Dispatch<React.SetStateAction<Salon[]>>;
  hiddenSalons: string[];
  setHiddenSalons: React.Dispatch<React.SetStateAction<string[]>>;
  displayOrder: Record<string, number>;
  currentSalon: string | null;
  setCurrentSalon: (id: string | null) => void;
  addSalon: (salon: Salon) => void;
  updateSalon: (salonId: string, updates: Partial<Salon>) => Promise<void>;
  deleteSalon: (salonId: string) => void;
  reorderSalons: (orderedIds: string[]) => Promise<void>;
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
    description: supabaseSalon.description || '',
    sort_order: supabaseSalon.sort_order,
    created_by: supabaseSalon.created_by || undefined,
  };
}

function mergeSalonLists(existing: Salon[], incoming: Salon[]): Salon[] {
  const map = new Map<string, Salon>();
  for (const salon of incoming) map.set(salon.id, salon);
  for (const salon of existing) {
    if (!map.has(salon.id)) map.set(salon.id, salon);
  }
  return Array.from(map.values()).sort(
    (a, b) => (a.sort_order ?? 9999) - (b.sort_order ?? 9999),
  );
}

export function SalonsProvider({ children }: { children: ReactNode }) {
  const [customSalons, setCustomSalons] = useState<Salon[]>([]);
  const [hiddenSalons, setHiddenSalons] = useState<string[]>([]);
  const [unlockedSalons, setUnlockedSalons] = useState<Record<string, boolean>>({});
  const [displayOrder, setDisplayOrder] = useState<Record<string, number>>({});
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
      const [salons, order] = await Promise.all([
        supabaseDbService.getSalons(),
        supabaseDbService.getSalonDisplayOrder(),
      ]);
      setCustomSalons(prev => mergeSalonLists(prev, salons.map(convertSupabaseSalon)));
      setDisplayOrder(order);
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
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'salon_display_order' },
        () => {
          void supabaseDbService.getSalonDisplayOrder().then(setDisplayOrder);
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
        description: salon.description || '',
        sort_order: salon.sort_order ?? 1000,
        created_by: user?.name || salon.created_by,
      };
      const saved = await supabaseDbService.addSalon(supabaseSalon, user?.name);
      if (saved) {
        setCustomSalons(prev => mergeSalonLists(prev, [convertSupabaseSalon(saved)]));
        const order = await supabaseDbService.getSalonDisplayOrder();
        setDisplayOrder(order);
      }
      addNotification({ type: 'system', message: `✅ Salon « ${salon.name} » créé. Droits créateur accordés.` });
    } catch (error) {
      setCustomSalons(prev => prev.filter(s => s.id !== salon.id));
      console.error('Erreur lors de l\'ajout du salon:', error);
      addNotification({
        type: 'error',
        message: error instanceof Error ? error.message : `Impossible de créer le salon « ${salon.name} ».`,
      });
    }
  }, [addNotification, user?.name]);

  const updateSalon = useCallback(async (salonId: string, updates: Partial<Salon>) => {
    setCustomSalons(prev => prev.map(s => (s.id === salonId ? { ...s, ...updates } : s)));

    try {
      const dbUpdates: Partial<Omit<SupabaseSalon, 'id' | 'created_at'>> = {};
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.type !== undefined) dbUpdates.type = updates.type;
      if (updates.emoji !== undefined) dbUpdates.icon = updates.emoji;
      if (updates.welcome !== undefined) dbUpdates.welcome = updates.welcome;
      if (updates.description !== undefined) dbUpdates.description = updates.description;
      if (updates.sort_order !== undefined) dbUpdates.sort_order = updates.sort_order;
      if (updates.password !== undefined) dbUpdates.password = updates.password;
      if (updates.isPrivate === false) dbUpdates.password = undefined;
      if (updates.live !== undefined) dbUpdates.live = updates.live;

      const saved = await supabaseDbService.updateSalon(salonId, dbUpdates);
      if (saved) {
        setCustomSalons(prev => mergeSalonLists(prev, [convertSupabaseSalon(saved)]));
      }
      addNotification({ type: 'system', message: 'Salon mis à jour.' });
    } catch (error) {
      console.error('Erreur lors de la mise à jour du salon:', error);
      addNotification({
        type: 'error',
        message: error instanceof Error ? error.message : 'Impossible de mettre à jour le salon.',
      });
      await loadCustomSalons();
    }
  }, [addNotification, loadCustomSalons]);

  const deleteSalon = useCallback(async (salonId: string) => {
    setCustomSalons(prev => prev.filter(s => s.id !== salonId));
    setHiddenSalons(prev => prev.includes(salonId) ? prev : [...prev, salonId]);

    try {
      await supabaseDbService.deleteSalon(salonId);
    } catch (error) {
      console.error('Erreur lors de la suppression du salon:', error);
    }
  }, []);

  const reorderSalons = useCallback(async (orderedIds: string[]) => {
    const next: Record<string, number> = {};
    orderedIds.forEach((id, i) => { next[id] = i * 10; });
    setDisplayOrder(next);

    // Sync sort_order on custom salons locally
    setCustomSalons(prev => prev.map(s => ({
      ...s,
      sort_order: next[s.id] ?? s.sort_order,
    })));

    try {
      await supabaseDbService.setSalonDisplayOrder(orderedIds);
      addNotification({ type: 'system', message: 'Ordre des salons enregistré.' });
    } catch (error) {
      console.error('Erreur lors du réordonnancement:', error);
      addNotification({
        type: 'error',
        message: 'Impossible d\'enregistrer l\'ordre des salons.',
      });
      await loadCustomSalons();
    }
  }, [addNotification, loadCustomSalons]);

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
    displayOrder,
    currentSalon, setCurrentSalon,
    addSalon, updateSalon, deleteSalon, reorderSalons,
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
