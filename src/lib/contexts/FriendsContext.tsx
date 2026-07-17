import React, { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from 'react';
import { supabase } from '../supabase';
import { useUser } from './UserContext';
import { useNotifications } from './NotificationsContext';
import { supabaseDbService } from '../supabaseDb';
import { formatSupabaseError } from '../utils/notificationNavigation';
import { isValidUuid } from '../utils/uuid';
import { ensureGuestSessionContext } from '../guestAuthService';

interface FriendRequest {
  id: string;
  user_id: string;
  friend_id: string;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
  updated_at: string;
}

interface FriendsContextType {
  friends: FriendRequest[];
  pendingRequests: FriendRequest[];
  outgoingRequests: FriendRequest[];
  sendFriendRequest: (friendName: string) => Promise<void>;
  acceptFriendRequest: (requestId: string) => Promise<void>;
  rejectFriendRequest: (requestId: string) => Promise<void>;
  acceptRequestFromSender: (senderName: string) => Promise<void>;
  rejectRequestFromSender: (senderName: string) => Promise<void>;
  removeFriend: (friendName: string) => Promise<void>;
  cancelFriendRequest: (requestId: string) => Promise<void>;
  cancelRequestToRecipient: (friendName: string) => Promise<void>;
  isFriend: (friendName: string) => boolean;
  reloadFriends: () => Promise<void>;
}

const FriendsContext = createContext<FriendsContextType | null>(null);

const nowIso = () => new Date().toISOString();

export function FriendsProvider({ children }: { children: ReactNode }) {
  const { user, supabaseUser } = useUser();
  const { addNotification } = useNotifications();
  const [friends, setFriends] = useState<FriendRequest[]>([]);

  const currentUserId = supabaseUser?.name || user?.name || null;
  const isGuest = !supabaseUser?.id;

  const acceptRef = useRef<(id: string) => Promise<void>>(async () => {});
  const rejectRef = useRef<(id: string) => Promise<void>>(async () => {});

  const prepareDb = useCallback(async () => {
    if (isGuest) await ensureGuestSessionContext();
  }, [isGuest]);

  const upsertLocalFriend = useCallback((friend: FriendRequest) => {
    setFriends(prev => {
      const existing = prev.find(f => f.id === friend.id);
      if (existing) return prev.map(f => f.id === friend.id ? friend : f);
      return [...prev, friend];
    });
  }, []);

  const loadFriends = useCallback(async (userId: string) => {
    try {
      await prepareDb();
      const { data, error } = await supabase
        .from('friends')
        .select('*')
        .or(`user_id.eq.${userId},friend_id.eq.${userId}`);

      if (error) throw error;
      if (Array.isArray(data)) {
        setFriends(data.filter(row => isValidUuid(row.id)));
      }
    } catch (error) {
      console.error('Erreur lors du chargement des amis:', error);
    }
  }, [prepareDb]);

  const acceptFriendRequest = useCallback(async (requestId: string) => {
    if (!isValidUuid(requestId)) {
      throw new Error('Demande d\'ami invalide — rechargez l\'onglet Amis');
    }
    if (!currentUserId) throw new Error('Utilisateur non connecté');

    const request = friends.find(f => f.id === requestId);
    setFriends(prev => prev.map(f => f.id === requestId ? { ...f, status: 'accepted', updated_at: nowIso() } : f));

    await prepareDb();
    const { error } = await supabase.from('friends').update({ status: 'accepted' }).eq('id', requestId);
    if (error) {
      console.error('Erreur lors de l\'acceptation de la demande d\'ami:', error);
      void loadFriends(currentUserId);
      throw new Error(formatSupabaseError(error));
    }

    if (request && currentUserId) {
      void supabaseDbService.notifyUserByName(
        request.user_id,
        'friend_accepted',
        `🤝 ${currentUserId} a accepté votre demande d'ami`,
        `friend-accepted:${currentUserId}`,
      );
    }
  }, [currentUserId, friends, loadFriends, prepareDb]);

  const rejectFriendRequest = useCallback(async (requestId: string) => {
    if (!isValidUuid(requestId)) {
      throw new Error('Demande d\'ami invalide — rechargez l\'onglet Amis');
    }
    if (!currentUserId) throw new Error('Utilisateur non connecté');

    setFriends(prev => prev.filter(f => f.id !== requestId));

    await prepareDb();
    const { error } = await supabase.from('friends').delete().eq('id', requestId);
    if (error) {
      console.error('Erreur lors du rejet de la demande d\'ami:', error);
      void loadFriends(currentUserId);
      throw new Error(formatSupabaseError(error));
    }
  }, [currentUserId, loadFriends, prepareDb]);

  acceptRef.current = acceptFriendRequest;
  rejectRef.current = rejectFriendRequest;

  const removeFriend = useCallback(async (friendName: string) => {
    if (!currentUserId) return;

    setFriends(prev => prev.filter(f => !(
      (f.user_id === currentUserId && f.friend_id === friendName) ||
      (f.user_id === friendName && f.friend_id === currentUserId)
    )));

    await prepareDb();
    const { error } = await supabase
      .from('friends')
      .delete()
      .or(`and(user_id.eq.${currentUserId},friend_id.eq.${friendName}),and(user_id.eq.${friendName},friend_id.eq.${currentUserId})`);
    if (error) console.error('Erreur lors de la suppression de l\'ami:', error);
  }, [currentUserId, prepareDb]);

  const cancelFriendRequest = useCallback(async (requestId: string) => {
    await rejectFriendRequest(requestId);
  }, [rejectFriendRequest]);

  const cancelRequestToRecipient = useCallback(async (friendName: string) => {
    if (!currentUserId) {
      throw new Error('Utilisateur non connecté');
    }

    let request = friends.find(
      f => f.status === 'pending' && f.user_id === currentUserId && f.friend_id === friendName,
    );
    if (!request || !isValidUuid(request.id)) {
      await prepareDb();
      const { data, error } = await supabase
        .from('friends')
        .select('*')
        .eq('user_id', currentUserId)
        .eq('friend_id', friendName)
        .eq('status', 'pending')
        .maybeSingle();
      if (error) throw new Error(formatSupabaseError(error));
      if (data) request = data as FriendRequest;
    }
    if (!request) throw new Error('Demande d\'ami introuvable');
    await rejectFriendRequest(request.id);
  }, [currentUserId, friends, prepareDb, rejectFriendRequest]);

  const isFriend = useCallback((friendName: string): boolean => {
    if (!currentUserId) return false;
    return friends.some(f =>
      f.status === 'accepted' &&
      ((f.user_id === currentUserId && f.friend_id === friendName) ||
       (f.user_id === friendName && f.friend_id === currentUserId))
    );
  }, [currentUserId, friends]);

  useEffect(() => {
    if (!currentUserId) return;

    void loadFriends(currentUserId);

    const channel = supabase
      .channel(`friends:${currentUserId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'friends' },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const friend = payload.new as FriendRequest;
            if (!friend?.id || !isValidUuid(friend.id)) return;
            upsertLocalFriend(friend);

            if (friend.status === 'pending' && friend.friend_id === currentUserId) {
              addNotification({
                type: 'friend_request',
                message: `${friend.user_id} vous a envoyé une demande d'ami`,
                groupKey: `friend-request:${friend.user_id}`,
                actions: [
                  {
                    label: 'Accepter',
                    onClick: () => {
                      void acceptRef.current(friend.id).catch((error: unknown) => {
                        addNotification({
                          type: 'system',
                          message: error instanceof Error ? error.message : 'Impossible d\'accepter la demande',
                        });
                      });
                    },
                    primary: true,
                  },
                  {
                    label: 'Refuser',
                    onClick: () => {
                      void rejectRef.current(friend.id).catch((error: unknown) => {
                        addNotification({
                          type: 'system',
                          message: error instanceof Error ? error.message : 'Impossible de refuser la demande',
                        });
                      });
                    },
                  },
                ],
              });
            } else if (
              friend.status === 'accepted' &&
              friend.user_id === currentUserId &&
              payload.eventType === 'UPDATE'
            ) {
              addNotification({
                type: 'friend_accepted',
                message: `🤝 ${friend.friend_id} a accepté votre demande d'ami`,
                groupKey: `friend-accepted:${friend.friend_id}`,
              });
            }
          } else if (payload.eventType === 'DELETE') {
            const deleted = payload.old as FriendRequest;
            if (deleted?.id) {
              setFriends(prev => prev.filter(f => f.id !== deleted.id));
            }
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, loadFriends, upsertLocalFriend, addNotification]);

  const reloadFriends = useCallback(async () => {
    if (!currentUserId) return;
    await loadFriends(currentUserId);
  }, [currentUserId, loadFriends]);

  const findPendingFromSender = useCallback((senderName: string) => {
    if (!currentUserId) return undefined;
    return friends.find(
      f => f.status === 'pending' && f.user_id === senderName && f.friend_id === currentUserId,
    );
  }, [currentUserId, friends]);

  const acceptRequestFromSender = useCallback(async (senderName: string) => {
    if (!currentUserId) {
      throw new Error('Utilisateur non connecté');
    }

    let request = findPendingFromSender(senderName);
    if (!request) {
      await prepareDb();
      const { data, error } = await supabase
        .from('friends')
        .select('*')
        .eq('user_id', senderName)
        .eq('friend_id', currentUserId)
        .eq('status', 'pending')
        .maybeSingle();
      if (error) throw new Error(formatSupabaseError(error));
      if (data) {
        request = data as FriendRequest;
        upsertLocalFriend(request);
      }
    }
    if (!request) throw new Error('Demande d\'ami introuvable');
    await acceptFriendRequest(request.id);
  }, [currentUserId, findPendingFromSender, prepareDb, upsertLocalFriend, acceptFriendRequest]);

  const rejectRequestFromSender = useCallback(async (senderName: string) => {
    if (!currentUserId) {
      throw new Error('Utilisateur non connecté');
    }

    let request = findPendingFromSender(senderName);
    if (!request) {
      await prepareDb();
      const { data, error } = await supabase
        .from('friends')
        .select('*')
        .eq('user_id', senderName)
        .eq('friend_id', currentUserId)
        .eq('status', 'pending')
        .maybeSingle();
      if (error) throw new Error(formatSupabaseError(error));
      if (data) request = data as FriendRequest;
    }
    if (!request) throw new Error('Demande d\'ami introuvable');
    await rejectFriendRequest(request.id);
  }, [currentUserId, findPendingFromSender, prepareDb, rejectFriendRequest]);

  const sendFriendRequest = useCallback(async (friendName: string) => {
    if (!currentUserId) throw new Error('Utilisateur non connecté');
    if (friendName === currentUserId) throw new Error('Impossible de s\'ajouter soi-même');

    const timestamp = nowIso();

    const existing = friends.find(
      f =>
        (f.user_id === currentUserId && f.friend_id === friendName) ||
        (f.user_id === friendName && f.friend_id === currentUserId),
    );
    if (existing) {
      if (existing.status === 'pending') throw new Error('Une demande est déjà en cours');
      if (existing.status === 'accepted') throw new Error('Vous êtes déjà amis');
    }

    await prepareDb();
    const { data, error } = await supabase
      .from('friends')
      .insert({
        user_id: currentUserId,
        friend_id: friendName,
        status: 'pending',
        created_at: timestamp,
        updated_at: timestamp,
      })
      .select()
      .single();

    if (error) {
      console.error('Erreur lors de la demande d\'ami:', error);
      throw new Error(formatSupabaseError(error));
    }
    if (data) {
      upsertLocalFriend(data as FriendRequest);
    }

    addNotification({
      type: 'system',
      message: `Demande d'ami envoyée à ${friendName}`,
    });

    void supabaseDbService.notifyUserByName(
      friendName,
      'friend_request',
      `👋 ${currentUserId} vous a envoyé une demande d'ami`,
      `friend-request:${currentUserId}`,
    );
  }, [currentUserId, friends, prepareDb, upsertLocalFriend, addNotification]);

  const pendingRequests = currentUserId
    ? friends.filter(f => f.status === 'pending' && f.friend_id === currentUserId)
    : [];

  const outgoingRequests = currentUserId
    ? friends.filter(f => f.status === 'pending' && f.user_id === currentUserId)
    : [];

  return (
    <FriendsContext.Provider value={{
      friends,
      pendingRequests,
      outgoingRequests,
      sendFriendRequest,
      acceptFriendRequest,
      rejectFriendRequest,
      acceptRequestFromSender,
      rejectRequestFromSender,
      removeFriend,
      cancelFriendRequest,
      cancelRequestToRecipient,
      isFriend,
      reloadFriends,
    }}>
      {children}
    </FriendsContext.Provider>
  );
}

export function useFriends(): FriendsContextType {
  const ctx = useContext(FriendsContext);
  if (!ctx) throw new Error('useFriends must be used inside FriendsProvider');
  return ctx;
}
