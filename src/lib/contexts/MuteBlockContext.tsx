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

export function MuteBlockProvider({ children }: { children: ReactNode }) {
  const { user, supabaseUser } = useUser();
  const [mutedUsers, setMutedUsers] = useState<string[]>([]);
  const [blockedUsers, setBlockedUsers] = useState<string[]>([]);

  const currentUserId = user?.name || supabaseUser?.name || null;

  const loadMutedUsers = useCallback(async (userId: string) => {
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
  }, []);

  const loadBlockedUsers = useCallback(async (userId: string) => {
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
  }, []);

  useEffect(() => {
    if (!currentUserId || !supabaseUser?.id) return;
    loadMutedUsers(currentUserId);
    loadBlockedUsers(currentUserId);

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
        }
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
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(mutedChannel);
      supabase.removeChannel(blockedChannel);
    };
  }, [currentUserId, supabaseUser?.id, loadMutedUsers, loadBlockedUsers]);

  const muteUser = useCallback(async (userId: string) => {
    if (!currentUserId) throw new Error('Utilisateur non connecté');
    setMutedUsers(prev => prev.includes(userId) ? prev : [...prev, userId]);

    if (supabaseUser?.id) {
      const { error } = await supabase.from('muted_users').upsert({ user_id: currentUserId, muted_user_id: userId });
      if (error) console.error('Erreur lors du rendu muet:', error);
    }
  }, [currentUserId, supabaseUser?.id]);

  const unmuteUser = useCallback(async (userId: string) => {
    if (!currentUserId) return;
    setMutedUsers(prev => prev.filter(id => id !== userId));

    if (supabaseUser?.id) {
      const { error } = await supabase.from('muted_users').delete().eq('user_id', currentUserId).eq('muted_user_id', userId);
      if (error) console.error('Erreur lors du rétablissement du son:', error);
    }
  }, [currentUserId, supabaseUser?.id]);

  const blockUser = useCallback(async (userId: string) => {
    if (!currentUserId) throw new Error('Utilisateur non connecté');
    setBlockedUsers(prev => prev.includes(userId) ? prev : [...prev, userId]);
    setMutedUsers(prev => prev.includes(userId) ? prev : [...prev, userId]);

    if (supabaseUser?.id) {
      const { error } = await supabase.from('blocked_users').upsert({ user_id: currentUserId, blocked_user_id: userId });
      if (error) console.error('Erreur lors du blocage:', error);
    }
  }, [currentUserId, supabaseUser?.id]);

  const unblockUser = useCallback(async (userId: string) => {
    if (!currentUserId) return;
    setBlockedUsers(prev => prev.filter(id => id !== userId));
    setMutedUsers(prev => prev.filter(id => id !== userId));

    if (supabaseUser?.id) {
      const { error } = await supabase.from('blocked_users').delete().eq('user_id', currentUserId).eq('blocked_user_id', userId);
      if (error) console.error('Erreur lors du déblocage:', error);

      const { error: mutedError } = await supabase.from('muted_users').delete().eq('user_id', currentUserId).eq('muted_user_id', userId);
      if (mutedError) console.error('Erreur lors du rétablissement après déblocage:', mutedError);
    }
  }, [currentUserId, supabaseUser?.id]);

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
