import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { supabase } from '../supabase';
import { useUser } from './UserContext';
import { useNotifications } from './NotificationsContext';
import { supabaseDbService } from '../supabaseDb';

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
  removeFriend: (friendName: string) => Promise<void>;
  cancelFriendRequest: (requestId: string) => Promise<void>;
  isFriend: (friendName: string) => boolean;
}

const FriendsContext = createContext<FriendsContextType | null>(null);

const createFriendId = (userId: string, friendId: string) => `${userId}:${friendId}`;
const nowIso = () => new Date().toISOString();

export function FriendsProvider({ children }: { children: ReactNode }) {
  const { user, supabaseUser } = useUser();
  const { addNotification } = useNotifications();
  const [friends, setFriends] = useState<FriendRequest[]>([]);
  const [subscription, setSubscription] = useState<any>(null);

  const currentUserId = user?.name || supabaseUser?.name || null;
  const currentSupabaseId = supabaseUser?.id || null;

  const upsertLocalFriend = useCallback((friend: FriendRequest) => {
    setFriends(prev => {
      const existing = prev.find(f => f.id === friend.id);
      if (existing) return prev.map(f => f.id === friend.id ? friend : f);
      return [...prev, friend];
    });
  }, []);

  const loadFriends = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('friends')
        .select('*')
        .or(`user_id.eq.${userId},friend_id.eq.${userId}`);

      if (error) throw error;
      if (Array.isArray(data)) setFriends(data);
    } catch (error) {
      console.error('Erreur lors du chargement des amis:', error);
    }
  }, []);

  const acceptFriendRequest = useCallback(async (requestId: string) => {
    const request = friends.find(f => f.id === requestId);
    setFriends(prev => prev.map(f => f.id === requestId ? { ...f, status: 'accepted', updated_at: nowIso() } : f));

    if (currentSupabaseId) {
      const { error } = await supabase.from('friends').update({ status: 'accepted' }).eq('id', requestId);
      if (error) console.error('Erreur lors de l\'acceptation de la demande d\'ami:', error);
    }

    if (request && currentUserId) {
      void supabaseDbService.notifyUserByName(
        request.user_id,
        'friend_accepted',
        `🤝 ${currentUserId} a accepté votre demande d'ami`,
        `friend-accepted:${currentUserId}`,
      );
    }
  }, [currentSupabaseId, currentUserId, friends]);

  const rejectFriendRequest = useCallback(async (requestId: string) => {
    setFriends(prev => prev.filter(f => f.id !== requestId));

    if (currentSupabaseId) {
      const { error } = await supabase.from('friends').delete().eq('id', requestId);
      if (error) console.error('Erreur lors du rejet de la demande d\'ami:', error);
    }
  }, [currentSupabaseId]);

  const removeFriend = useCallback(async (friendName: string) => {
    if (!currentUserId) return;

    setFriends(prev => prev.filter(f => !(
      (f.user_id === currentUserId && f.friend_id === friendName) ||
      (f.user_id === friendName && f.friend_id === currentUserId)
    )));

    if (currentSupabaseId) {
      const { error } = await supabase
        .from('friends')
        .delete()
        .or(`and(user_id.eq.${currentUserId},friend_id.eq.${friendName}),and(user_id.eq.${friendName},friend_id.eq.${currentUserId})`);
      if (error) console.error('Erreur lors de la suppression de l\'ami:', error);
    }
  }, [currentUserId, currentSupabaseId]);

  const cancelFriendRequest = useCallback(async (requestId: string) => {
    setFriends(prev => prev.filter(f => f.id !== requestId));

    if (currentSupabaseId) {
      const { error } = await supabase.from('friends').delete().eq('id', requestId);
      if (error) console.error('Erreur lors de l\'annulation de la demande d\'ami:', error);
    }
  }, [currentSupabaseId]);

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

    // Charger depuis Supabase si connecté
    if (currentSupabaseId) {
      loadFriends(currentUserId);
    }

    if (subscription) supabase.removeChannel(subscription);

    const channel = supabase
      .channel(`friends:${currentUserId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'friends',
        },
        (payload) => {
          const friend = payload.new as FriendRequest;
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            upsertLocalFriend(friend);
            if (friend.status === 'pending' && friend.friend_id === currentUserId) {
              // Charger le profil de l'expéditeur pour obtenir son nom
              // friend.user_id est maintenant un pseudo, donc on query par name
              const loadSenderProfile = async () => {
                const { data: profile } = await supabase
                  .from('profiles')
                  .select('name')
                  .eq('name', friend.user_id)
                  .single();
                
                const senderName = profile?.name || friend.user_id;
                
                addNotification({
                  type: 'friend_request',
                  message: `${senderName} vous a envoyé une demande d'ami`,
                  groupKey: `friend-request:${friend.user_id}`,
                  actions: [
                    {
                      label: 'Accepter',
                      onClick: () => acceptFriendRequest(friend.id),
                      primary: true
                    },
                    {
                      label: 'Refuser',
                      onClick: () => rejectFriendRequest(friend.id)
                    }
                  ]
                });
              };
              
              loadSenderProfile();
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
            setFriends(prev => prev.filter(f => f.id !== deleted.id));
          }
        }
      )
      .subscribe();

    setSubscription(channel);

    return () => {
      supabase.removeChannel(channel);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSupabaseId, currentUserId, loadFriends, upsertLocalFriend, addNotification, acceptFriendRequest, rejectFriendRequest]);

  const sendFriendRequest = useCallback(async (friendName: string) => {
    if (!currentUserId) throw new Error('Utilisateur non connecté');

    const timestamp = nowIso();
    const localFriend: FriendRequest = {
      id: '', // Sera remplacé par l'UUID généré par Supabase
      user_id: currentUserId,
      friend_id: friendName,
      status: currentSupabaseId ? 'pending' : 'accepted',
      created_at: timestamp,
      updated_at: timestamp,
    };

    if (currentSupabaseId) {
      const { data, error } = await supabase.from('friends').insert(localFriend).select().single();
      if (error) {
        console.error('Erreur lors de la demande d\'ami:', error);
        throw error;
      }
      if (data) {
        upsertLocalFriend(data as FriendRequest);
      }
    } else {
      // Mode invité
      localFriend.id = createFriendId(currentUserId, friendName);
      upsertLocalFriend(localFriend);
    }
  }, [currentUserId, currentSupabaseId, upsertLocalFriend]);

  const pendingRequests = currentUserId
    ? friends.filter(f => f.status === 'pending' && f.friend_id === currentUserId)
    : [];

  const outgoingRequests = currentUserId
    ? friends.filter(f => f.status === 'pending' && f.user_id === currentUserId)
    : [];

  return (
    <FriendsContext.Provider value={{ friends, pendingRequests, outgoingRequests, sendFriendRequest, acceptFriendRequest, rejectFriendRequest, removeFriend, cancelFriendRequest, isFriend }}>
      {children}
    </FriendsContext.Provider>
  );
}

export function useFriends(): FriendsContextType {
  const ctx = useContext(FriendsContext);
  if (!ctx) throw new Error('useFriends must be used inside FriendsProvider');
  return ctx;
}
