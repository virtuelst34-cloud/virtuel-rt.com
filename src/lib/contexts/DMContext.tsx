import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
  ReactNode,
} from 'react';
import { checkServerRateLimit } from '../rateLimitService';
import { supabase } from '../supabase';
import { getStoredGuestToken } from '../guestAuthService';
import { useUser } from './UserContext';
import { useNotifications } from './NotificationsContext';
import { supabaseDbService } from '../supabaseDb';

interface DMMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  text: string;
  created_at: string;
  read_at?: string | null;
  reactions?: Record<string, string[]>;
  image_url?: string;
}

export interface DMDisplayMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  sender_name: string;
  sender_avatar: string;
  sender_initials: string;
  text: string;
  created_date: string;
  is_read: boolean;
  image_url?: string;
}

interface DMContextType {
  conversations: Record<string, DMMessage[]>;
  sendDM: (fromName: string, toName: string, text: string, imageUrl?: string | null) => Promise<void>;
  markRead: (userName: string, otherName: string) => Promise<void>;
  getConversation: (userName1: string, userName2: string) => DMDisplayMessage[];
  getUnreadCount: (userName: string) => number;
  loadConversation: (userName1: string, userName2: string) => Promise<void>;
  loadInbox: () => Promise<void>;
}

const DMContext = createContext<DMContextType | null>(null);

function conversationKey(name1: string, name2: string): string {
  return [name1, name2].sort().join('::');
}

function normalizeName(name: string | undefined | null): string | null {
  const trimmed = name?.trim();
  return trimmed && trimmed.length >= 2 ? trimmed : null;
}

function asDmMessages(data: unknown): DMMessage[] {
  if (!Array.isArray(data)) return [];
  return data.filter((row): row is DMMessage => !!row && typeof row === 'object' && 'id' in row);
}

function toDisplayMessage(
  message: DMMessage,
  profiles: Record<string, { avatar: string; initials: string; name: string }>,
): DMDisplayMessage {
  const senderName = message.sender_id;
  const senderProfile = profiles[senderName];

  return {
    id: message.id,
    sender_id: message.sender_id,
    receiver_id: message.receiver_id,
    sender_name: senderName,
    sender_avatar: senderProfile?.avatar || 'av1',
    sender_initials: senderProfile?.initials || senderName.slice(0, 2).toUpperCase(),
    text: message.text,
    created_date: message.created_at,
    is_read: !!message.read_at,
    image_url: message.image_url || undefined,
  };
}

function DMProviderInner({ children }: { children: ReactNode }) {
  const { user, supabaseUser, profiles } = useUser();
  const { addNotification } = useNotifications();
  const [conversations, setConversations] = useState<Record<string, DMMessage[]>>({});

  const currentUserName = user?.name ?? null;

  const resolveName = useCallback(
    (nameOrId: string | undefined | null): string | null => {
      const direct = normalizeName(nameOrId);
      if (!direct) return null;
      if (profiles[direct]) return direct;
      if (supabaseUser?.name === direct) return direct;
      if (user?.name === direct) return direct;
      return direct;
    },
    [profiles, supabaseUser?.name, user?.name],
  );

  const loadConversation = useCallback(
    async (userName1: string, userName2: string) => {
      const name1 = resolveName(userName1);
      const name2 = resolveName(userName2);
      if (!name1 || !name2 || !currentUserName) return;

      const self = resolveName(currentUserName);
      if (!self || (name1 !== self && name2 !== self)) return;
      const peer = name1 === self ? name2 : name1;

      try {
        const key = conversationKey(self, peer);
        const { data, error } = await supabase.rpc('list_own_dms', {
          p_actor: self,
          p_peer: peer,
          p_guest_token: getStoredGuestToken(),
        });
        if (error) throw error;
        setConversations(prev => ({ ...prev, [key]: asDmMessages(data) }));
      } catch (error) {
        console.error('Erreur lors du chargement de la conversation:', error);
      }
    },
    [resolveName, currentUserName],
  );

  const loadInbox = useCallback(async () => {
    if (!currentUserName) return;
    const self = resolveName(currentUserName);
    if (!self) return;

    try {
      const { data, error } = await supabase.rpc('list_own_dm_inbox', {
        p_actor: self,
        p_guest_token: getStoredGuestToken(),
      });
      if (error) throw error;

      const grouped: Record<string, DMMessage[]> = {};
      // Newest-first fetch → reverse for chronological UI per conversation
      for (const message of [...asDmMessages(data)].reverse()) {
        const key = conversationKey(message.sender_id, message.receiver_id);
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(message);
      }
      setConversations(prev => ({ ...prev, ...grouped }));
    } catch (error) {
      console.error('Erreur chargement inbox DM:', error);
    }
  }, [currentUserName, resolveName]);

  useEffect(() => {
    if (currentUserName) void loadInbox();
  }, [currentUserName, loadInbox]);

  useEffect(() => {
    if (!currentUserName) return;

    const channel = supabase
      .channel(`direct_messages:${currentUserName}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'direct_messages' },
        (payload) => {
          const message = payload.new as DMMessage;
          if (![message.sender_id, message.receiver_id].includes(currentUserName)) return;

          const key = conversationKey(message.sender_id, message.receiver_id);
          setConversations(prev => {
            const existing = prev[key] || [];
            if (existing.some(m => m.id === message.id)) return prev;
            return { ...prev, [key]: [...existing, message] };
          });

          if (message.receiver_id === currentUserName && message.sender_id !== currentUserName) {
            const preview = message.text.length > 80 ? `${message.text.slice(0, 80)}…` : message.text;
            addNotification({
              type: 'dm',
              message: `💬 ${message.sender_id} : ${preview}`,
              groupKey: `dm:${message.sender_id}`,
            });
            if ('Notification' in window && Notification.permission === 'granted' && document.hidden) {
              new Notification(`Message de ${message.sender_id}`, { body: preview, icon: '/favicon.ico' });
            }
          }
        },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'direct_messages' },
        (payload) => {
          const message = payload.new as DMMessage;
          if (![message.sender_id, message.receiver_id].includes(currentUserName)) return;

          const key = conversationKey(message.sender_id, message.receiver_id);
          setConversations(prev => ({
            ...prev,
            [key]: (prev[key] || []).map(m => (m.id === message.id ? message : m)),
          }));
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserName, addNotification]);

  const sendDM = useCallback(
    async (fromName: string, toName: string, text: string, imageUrl?: string | null) => {
      const rate = await checkServerRateLimit('dm', fromName);
      if (!rate.allowed) {
        throw new Error(rate.error || 'Trop de messages privés. Veuillez patienter.');
      }

      const senderName = resolveName(fromName);
      const receiverName = resolveName(toName);
      if (!senderName || !receiverName) {
        throw new Error('Impossible d\'envoyer le message : utilisateur introuvable');
      }
      if (senderName === receiverName) {
        throw new Error('Impossible de s\'envoyer un message à soi-même');
      }

      const trimmed = text.trim();
      const media = imageUrl?.trim() || null;
      if (!trimmed && !media) {
        throw new Error('Message vide');
      }

      const { data, error } = await supabase.rpc('send_own_dm', {
        p_sender_id: senderName,
        p_receiver_id: receiverName,
        p_text: trimmed || (media ? '📎 Fichier' : ''),
        p_image_url: media,
        p_guest_token: getStoredGuestToken(),
      });

      if (error) throw error;

      if (data) {
        const key = conversationKey(senderName, receiverName);
        setConversations(prev => {
          const existing = prev[key] || [];
          if (existing.some(m => m.id === data.id)) return prev;
          return { ...prev, [key]: [...existing, data as DMMessage] };
        });

        void supabaseDbService.notifyUserByName(
          receiverName,
          'dm',
          `💬 ${senderName} vous a envoyé un message`,
          `dm:${senderName}`,
        );
      }
    },
    [resolveName],
  );

  const markRead = useCallback(
    async (userName: string, otherName: string) => {
      const selfName = resolveName(userName);
      const other = resolveName(otherName);
      if (!selfName || !other) return;

      const key = conversationKey(selfName, other);
      const unread = (conversations[key] || []).filter(
        m => m.receiver_id === selfName && !m.read_at,
      );
      if (unread.length === 0) return;

      const readAt = new Date().toISOString();
      const { error } = await supabase.rpc('mark_own_dms_read', {
        p_actor: selfName,
        p_peer: other,
        p_guest_token: getStoredGuestToken(),
      });
      if (error) {
        console.error('Erreur marquage lu:', error);
        return;
      }

      setConversations(prev => ({
        ...prev,
        [key]: (prev[key] || []).map(m =>
          m.receiver_id === selfName && !m.read_at ? { ...m, read_at: readAt } : m,
        ),
      }));
    },
    [conversations, resolveName],
  );

  const getConversation = useCallback(
    (userName1: string, userName2: string): DMDisplayMessage[] => {
      const name1 = resolveName(userName1);
      const name2 = resolveName(userName2);
      if (!name1 || !name2) return [];

      const key = conversationKey(name1, name2);
      return (conversations[key] || []).map(message => toDisplayMessage(message, profiles));
    },
    [conversations, resolveName, profiles],
  );

  const getUnreadCount = useCallback(
    (userName: string): number => {
      const selfName = resolveName(userName);
      if (!selfName) return 0;
      return Object.values(conversations).reduce((total, messages) => {
        return total + messages.filter(m => m.receiver_id === selfName && !m.read_at).length;
      }, 0);
    },
    [conversations, resolveName],
  );

  const value = useMemo(
    () => ({
      conversations,
      sendDM,
      markRead,
      getConversation,
      getUnreadCount,
      loadConversation,
      loadInbox,
    }),
    [conversations, sendDM, markRead, getConversation, getUnreadCount, loadConversation, loadInbox],
  );

  return <DMContext.Provider value={value}>{children}</DMContext.Provider>;
}

export function DMProvider({ children }: { children: ReactNode }) {
  return <DMProviderInner>{children}</DMProviderInner>;
}

export function useDM(): DMContextType {
  const ctx = useContext(DMContext);
  if (!ctx) throw new Error('useDM must be used inside DMProvider');
  return ctx;
}
