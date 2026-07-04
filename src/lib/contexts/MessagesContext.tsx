import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { supabase } from '../supabase';
import { supabaseDbService, Message as SupabaseMessage } from '../supabaseDb';
import { offlineModeService } from '../offlineMode';

interface Message {
  id: string;
  author_name: string;
  author_avatar: string;
  author_initials: string;
  text: string;
  timestamp?: string;
  created_date: string;
  reactions?: Record<string, string[]>;
  pinned?: boolean;
  is_system?: boolean;
  is_announcement?: boolean;
  replyTo?: Message;
  image_url?: string;
}

interface MessagesContextType {
  salonMessages: Record<string, Message[]>;
  addMessage: (salonId: string, message: Message) => void;
  getMessages: (salonId: string) => Message[];
  deleteMessage: (salonId: string, messageId: string) => void;
  pinMessage: (salonId: string, messageId: string) => void;
  updateReaction: (salonId: string, messageId: string, reactions: Record<string, string[]>) => void;
  loadMessages: (salonId: string, limit?: number, offset?: number) => Promise<void>;
  loadMoreMessages: (salonId: string) => Promise<void>;
  setCurrentSalonId: (salonId: string | null) => void;
}

const MessagesContext = createContext<MessagesContextType | null>(null);

const MAX_PER_SALON = 200;
const PAGE_SIZE = 50;

function convertSupabaseMessage(supabaseMsg: SupabaseMessage): Message {
  return {
    id: supabaseMsg.id,
    author_name: supabaseMsg.author_name,
    author_avatar: supabaseMsg.author_avatar,
    author_initials: supabaseMsg.author_initials,
    text: supabaseMsg.text,
    created_date: supabaseMsg.created_date,
    reactions: supabaseMsg.reactions || undefined,
    pinned: supabaseMsg.pinned || undefined,
    is_system: supabaseMsg.is_system || undefined,
    is_announcement: supabaseMsg.is_announcement || undefined,
    reply_to: supabaseMsg.reply_to || undefined,
    image_url: supabaseMsg.image_url || undefined,
  };
}

export function MessagesProvider({ children }: { children: ReactNode }) {
  const [salonMessages, setSalonMessages] = useState<Record<string, Message[]>>({});
  const [currentSalonId, setCurrentSalonId] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<any>(null);

  useEffect(() => {
    offlineModeService.setSyncHandler(async (action) => {
      if (action.type === 'send_message') {
        await supabaseDbService.addMessage(action.data);
      }
    });
    return () => offlineModeService.setSyncHandler(null);
  }, []);

  // Charger les messages depuis Supabase avec pagination
  const loadMessages = useCallback(async (salonId: string, limit: number = PAGE_SIZE, offset: number = 0) => {
    try {
      const messages = await supabaseDbService.getMessages(salonId, limit, offset);
      const converted = messages.map(convertSupabaseMessage);
      // Garder les messages système/accueil en tête et éviter les doublons
      const unique = converted.filter((m, i, arr) => arr.findIndex(x => x.id === m.id) === i);
      const sorted = unique.sort((a, b) => {
        if (a.is_announcement && !b.is_announcement) return -1;
        if (!a.is_announcement && b.is_announcement) return 1;
        return new Date(a.created_date).getTime() - new Date(b.created_date).getTime();
      });
      
      if (offset === 0) {
        setSalonMessages(prev => ({
          ...prev,
          [salonId]: sorted.slice(0, MAX_PER_SALON)
        }));
      } else {
        setSalonMessages(prev => {
          const existing = prev[salonId] || [];
          const combined = [...sorted, ...existing];
          const unique = combined.filter((m, i, arr) => arr.findIndex(x => x.id === m.id) === i);
          const finalSorted = unique.sort((a, b) => {
            if (a.is_announcement && !b.is_announcement) return -1;
            if (!a.is_announcement && b.is_announcement) return 1;
            return new Date(a.created_date).getTime() - new Date(b.created_date).getTime();
          });
          return { ...prev, [salonId]: finalSorted.slice(0, MAX_PER_SALON) };
        });
      }

      converted.forEach(msg => {
        offlineModeService.cacheMessage({
          id: msg.id,
          salonId,
          author: msg.author_name,
          text: msg.text,
          timestamp: new Date(msg.created_date),
          synced: true,
        });
      });
    } catch (error) {
      console.error('Erreur lors du chargement des messages:', error);
      const cached = offlineModeService.getCachedMessages(salonId, MAX_PER_SALON);
      if (cached.length > 0) {
        const fromCache: Message[] = cached.map(c => ({
          id: c.id,
          author_name: c.author,
          author_avatar: '',
          author_initials: c.author.slice(0, 2).toUpperCase(),
          text: c.text,
          created_date: c.timestamp.toISOString(),
        }));
        setSalonMessages(prev => ({ ...prev, [salonId]: fromCache.reverse() }));
      }
    }
  }, []);

  // Charger plus de messages (pagination)
  const loadMoreMessages = useCallback(async (salonId: string) => {
    const existing = salonMessages[salonId] || [];
    const offset = existing.length;
    await loadMessages(salonId, PAGE_SIZE, offset);
  }, [salonMessages, loadMessages]);

  // S'abonner aux messages en temps réel
  useEffect(() => {
    if (!currentSalonId) return;

    // Nettoyer l'abonnement précédente
    if (subscription) {
      supabase.removeChannel(subscription);
    }

    // Charger les messages existants
    loadMessages(currentSalonId);

    // S'abonner aux nouveaux messages
    const channel = supabaseDbService.subscribeToMessages(currentSalonId, (message) => {
      setSalonMessages(prev => {
        const existing = prev[currentSalonId] || [];
        const converted = convertSupabaseMessage(message);
        // Éviter les doublons
        if (existing.some(m => m.id === converted.id)) return prev;
        const updated = [...existing, converted].slice(-MAX_PER_SALON);
        return { ...prev, [currentSalonId]: updated };
      });
    });

    setSubscription(channel);

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentSalonId, loadMessages]);

  const addMessage = useCallback(async (salonId: string, message: Message) => {
    // Générer un ID temporaire si pas d'ID
    const tempId = message.id || `temp-${Date.now()}-${Math.random()}`;
    const messageWithId = { ...message, id: tempId };

    // Ajouter localement pour une réponse immédiate
    setSalonMessages(prev => {
      const existing = prev[salonId] || [];
      if (existing.some(m => m.id === tempId)) return prev;
      const updated = [...existing, messageWithId].slice(-MAX_PER_SALON);
      return { ...prev, [salonId]: updated };
    });

    // Synchroniser avec Supabase (ou mettre en file d'attente si hors ligne)
    const supabaseMessage: Omit<SupabaseMessage, 'id' | 'created_at'> = {
      salon_id: salonId,
      author_name: message.author_name,
      author_avatar: message.author_avatar,
      author_initials: message.author_initials,
      text: message.text,
      created_date: message.created_date,
      reactions: message.reactions || undefined,
      pinned: message.pinned || false,
      is_system: message.is_system || false,
      is_announcement: message.is_announcement || false,
      reply_to: message.replyTo?.id || undefined,
      image_url: message.image_url || undefined,
    };

    if (offlineModeService.isOffline()) {
      offlineModeService.addPendingAction({ type: 'send_message', data: supabaseMessage });
      offlineModeService.cacheMessage({
        id: tempId,
        salonId,
        author: message.author_name,
        text: message.text,
        timestamp: new Date(message.created_date),
        synced: false,
      });
      return;
    }

    try {
      const result = await supabaseDbService.addMessage(supabaseMessage);
      
      // Remplacer le message temporaire par le vrai message avec l'ID du serveur
      if (result && result.id !== tempId) {
        setSalonMessages(prev => {
          const existing = prev[salonId] || [];
          const updated = existing.map(m => m.id === tempId ? convertSupabaseMessage(result) : m);
          return { ...prev, [salonId]: updated };
        });
      }

      offlineModeService.cacheMessage({
        id: result?.id || tempId,
        salonId,
        author: message.author_name,
        text: message.text,
        timestamp: new Date(message.created_date),
        synced: true,
      });
    } catch (error) {
      console.error('Erreur lors de l\'ajout du message:', error);
      offlineModeService.addPendingAction({ type: 'send_message', data: supabaseMessage });
      offlineModeService.cacheMessage({
        id: tempId,
        salonId,
        author: message.author_name,
        text: message.text,
        timestamp: new Date(message.created_date),
        synced: false,
      });
    }
  }, []);

  const getMessages = useCallback((salonId: string) => {
    return salonMessages[salonId] || [];
  }, [salonMessages]);

  const deleteMessage = useCallback(async (salonId: string, messageId: string) => {
    setSalonMessages(prev => ({
      ...prev,
      [salonId]: (prev[salonId] || []).filter(m => m.id !== messageId)
    }));

    try {
      await supabaseDbService.deleteMessage(messageId);
    } catch (error) {
      console.error('Erreur lors de la suppression du message:', error);
    }
  }, []);

  const pinMessage = useCallback(async (salonId: string, messageId: string) => {
    setSalonMessages(prev => ({
      ...prev,
      [salonId]: (prev[salonId] || []).map(m =>
        m.id === messageId ? { ...m, pinned: !m.pinned } : m
      )
    }));

    try {
      const message = salonMessages[salonId]?.find(m => m.id === messageId);
      if (message) {
        await supabaseDbService.updateMessage(messageId, { pinned: !message.pinned });
      }
    } catch (error) {
      console.error('Erreur lors de l\'épinglage du message:', error);
    }
  }, [salonMessages]);

  const updateReaction = useCallback(async (salonId: string, messageId: string, reactions: Record<string, string[]>) => {
    setSalonMessages(prev => ({
      ...prev,
      [salonId]: (prev[salonId] || []).map(m =>
        m.id === messageId ? { ...m, reactions } : m
      )
    }));

    try {
      await supabaseDbService.updateMessage(messageId, { reactions });
    } catch (error) {
      console.error('Erreur lors de la mise à jour des réactions:', error);
    }
  }, []);

  const value: MessagesContextType = {
    salonMessages, addMessage, getMessages, deleteMessage, pinMessage, updateReaction, loadMessages, loadMoreMessages, setCurrentSalonId
  };

  return (
    <MessagesContext.Provider value={value}>
      {children}
    </MessagesContext.Provider>
  );
}

export function useMessages(): MessagesContextType {
  const context = useContext(MessagesContext);
  if (!context) throw new Error('useMessages must be used inside MessagesProvider');
  return context;
}
