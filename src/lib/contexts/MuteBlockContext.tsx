import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { supabase } from '../supabase';
import { useUser } from './UserContext';

interface MuteBlockContextType {
  mutedUsers: string[];
  blockedUsers: string[];
  muteUser: (userId: string) => Promise<void>;
  unmuteUser: (userId: string) => Promise<void>;
  blockUser: (userId: string) => Promise<void>;
  unblockUser: (userId: string) => Promise<void>;
  isMuted: (userId: string) => boolean;
  isBlocked: (userId: string) => boolean;
}

const MuteBlockContext = createContext<MuteBlockContextType | null>(null);

const GUEST_MUTE_BLOCK_KEY = 'virtuel_rt_guest_mute_block';

interface GuestMuteBlockStore {
  muted: string[];
  blocked: string[];
}

function loadGuestStore(userId: string): GuestMuteBlockStore {
  try {
    const raw = localStorage.getItem(GUEST_MUTE_BLOCK_KEY);
    if (!raw) return { muted: [], blocked: [] };
    const all = JSON.parse(raw) as Record<string, GuestMuteBlockStore>;
    return all[userId] || { muted: [], blocked: [] };
  } catch {
    return { muted: [], blocked: [] };
  }
}

function saveGuestStore(userId: string, store: GuestMuteBlockStore): void {
  try {
    const raw = localStorage.getItem(GUEST_MUTE_BLOCK_KEY);
    const all = raw ? JSON.parse(raw) as Record<string, GuestMuteBlockStore> : {};
    all[userId] = store;
    localStorage.setItem(GUEST_MUTE_BLOCK_KEY, JSON.stringify(all));
  } catch {
    /* ignore */
  }
}

export function MuteBlockProvider({ children }: { children: ReactNode }) {
  const { user, supabaseUser } = useUser();
  const [mutedUsers, setMutedUsers] = useState<string[]>([]);
  const [blockedUsers, setBlockedUsers] = useState<string[]>([]);

  const currentUserId = user?.name || supabaseUser?.name || null;
  const isGuest = !supabaseUser?.id;

  const loadMutedUsers = useCallback(async (userId: string) => {
    if (isGuest) {
      setMutedUsers(loadGuestStore(userId).muted);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('muted_users')
        .select('muted_user_id')
        .eq('user_id', userId);

      if (error) throw error;
      if (Array.isArray(data)) setMutedUsers(data.map(m => m.muted_user_id));
    } catch (error) {
      console.error('Erreur lors du chargement des utilisateurs rendus muets:', error);
    }
  }, [isGuest]);

  const loadBlockedUsers = useCallback(async (userId: string) => {
    if (isGuest) {
      const store = loadGuestStore(userId);
      setBlockedUsers(store.blocked);
      setMutedUsers(prev => [...new Set([...prev, ...store.blocked])]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('blocked_users')
        .select('blocked_user_id')
        .eq('user_id', userId);

      if (error) throw error;
      if (Array.isArray(data)) setBlockedUsers(data.map(b => b.blocked_user_id));
    } catch (error) {
      console.error('Erreur lors du chargement des utilisateurs bloqués:', error);
    }
  }, [isGuest]);

  useEffect(() => {
    if (!currentUserId) return;

    void loadMutedUsers(currentUserId);
    void loadBlockedUsers(currentUserId);

    if (isGuest) return;

    const mutedChannel = supabase
      .channel(`muted-users:${currentUserId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'muted_users' },
        (payload) => {
          const next = payload.new as any;
          const old = payload.old as any;
          if ((next?.user_id || old?.user_id) !== currentUserId) return;

          if (payload.eventType === 'DELETE') {
            setMutedUsers(prev => prev.filter(id => id !== old.muted_user_id));
          } else if (next?.muted_user_id) {
            setMutedUsers(prev => prev.includes(next.muted_user_id) ? prev : [...prev, next.muted_user_id]);
          }
        },
      )
      .subscribe();

    const blockedChannel = supabase
      .channel(`blocked-users:${currentUserId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'blocked_users' },
        (payload) => {
          const next = payload.new as any;
          const old = payload.old as any;
          if ((next?.user_id || old?.user_id) !== currentUserId) return;

          if (payload.eventType === 'DELETE') {
            setBlockedUsers(prev => prev.filter(id => id !== old.blocked_user_id));
          } else if (next?.blocked_user_id) {
            setBlockedUsers(prev => prev.includes(next.blocked_user_id) ? prev : [...prev, next.blocked_user_id]);
            setMutedUsers(prev => prev.includes(next.blocked_user_id) ? prev : [...prev, next.blocked_user_id]);
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(mutedChannel);
      supabase.removeChannel(blockedChannel);
    };
  }, [currentUserId, isGuest, loadMutedUsers, loadBlockedUsers]);

  const persistGuest = useCallback((muted: string[], blocked: string[]) => {
    if (!currentUserId || !isGuest) return;
    saveGuestStore(currentUserId, { muted, blocked });
  }, [currentUserId, isGuest]);

  const muteUser = useCallback(async (userId: string) => {
    if (!currentUserId) throw new Error('Utilisateur non connecté');
    setMutedUsers(prev => {
      const next = prev.includes(userId) ? prev : [...prev, userId];
      persistGuest(next, blockedUsers);
      return next;
    });

    if (supabaseUser?.id) {
      const { error } = await supabase.from('muted_users').upsert({ user_id: currentUserId, muted_user_id: userId });
      if (error) console.error('Erreur lors du rendu muet:', error);
    }
  }, [currentUserId, supabaseUser?.id, blockedUsers, persistGuest]);

  const unmuteUser = useCallback(async (userId: string) => {
    if (!currentUserId) return;
    setMutedUsers(prev => {
      const next = prev.filter(id => id !== userId);
      persistGuest(next, blockedUsers);
      return next;
    });

    if (supabaseUser?.id) {
      const { error } = await supabase.from('muted_users').delete().eq('user_id', currentUserId).eq('muted_user_id', userId);
      if (error) console.error('Erreur lors du rétablissement du son:', error);
    }
  }, [currentUserId, supabaseUser?.id, blockedUsers, persistGuest]);

  const blockUser = useCallback(async (userId: string) => {
    if (!currentUserId) throw new Error('Utilisateur non connecté');
    setBlockedUsers(prev => {
      const nextBlocked = prev.includes(userId) ? prev : [...prev, userId];
      setMutedUsers(mutedPrev => {
        const nextMuted = mutedPrev.includes(userId) ? mutedPrev : [...mutedPrev, userId];
        persistGuest(nextMuted, nextBlocked);
        return nextMuted;
      });
      return nextBlocked;
    });

    if (supabaseUser?.id) {
      const { error } = await supabase.from('blocked_users').upsert({ user_id: currentUserId, blocked_user_id: userId });
      if (error) console.error('Erreur lors du blocage:', error);
    }
  }, [currentUserId, supabaseUser?.id, persistGuest]);

  const unblockUser = useCallback(async (userId: string) => {
    if (!currentUserId) return;
    setBlockedUsers(prev => {
      const nextBlocked = prev.filter(id => id !== userId);
      setMutedUsers(mutedPrev => {
        const nextMuted = mutedPrev.filter(id => id !== userId);
        persistGuest(nextMuted, nextBlocked);
        return nextMuted;
      });
      return nextBlocked;
    });

    if (supabaseUser?.id) {
      const { error } = await supabase.from('blocked_users').delete().eq('user_id', currentUserId).eq('blocked_user_id', userId);
      if (error) console.error('Erreur lors du déblocage:', error);

      const { error: mutedError } = await supabase.from('muted_users').delete().eq('user_id', currentUserId).eq('muted_user_id', userId);
      if (mutedError) console.error('Erreur lors du rétablissement après déblocage:', mutedError);
    }
  }, [currentUserId, supabaseUser?.id, persistGuest]);

  const isMuted = useCallback((userId: string): boolean => mutedUsers.includes(userId), [mutedUsers]);
  const isBlocked = useCallback((userId: string): boolean => blockedUsers.includes(userId), [blockedUsers]);

  return (
    <MuteBlockContext.Provider value={{ mutedUsers, blockedUsers, muteUser, unmuteUser, blockUser, unblockUser, isMuted, isBlocked }}>
      {children}
    </MuteBlockContext.Provider>
  );
}

export function useMuteBlock(): MuteBlockContextType {
  const ctx = useContext(MuteBlockContext);
  if (!ctx) throw new Error('useMuteBlock must be used inside MuteBlockProvider');
  return ctx;
}
