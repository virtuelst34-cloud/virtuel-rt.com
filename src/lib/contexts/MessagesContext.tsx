import React, { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from 'react';
import { supabase } from '../supabase';
import { supabaseDbService, Message as SupabaseMessage } from '../supabaseDb';
import { offlineModeService } from '../offlineMode';
import {
  ChatMessage,
  convertSupabaseMessage,
  resolveReplyReferences,
  toDbMessageUpdates,
  dedupeAndSortMessages,
} from '../utils/messageUtils';

type Message = ChatMessage;

interface MessagesContextType {
  salonMessages: Record<string, Message[]>;
  addMessage: (salonId: string, message: Message) => void;
  getMessages: (salonId: string) => Message[];
  deleteMessage: (salonId: string, messageId: string) => void;
  pinMessage: (salonId: string, messageId: string) => void;
  updateMessage: (salonId: string, messageId: string, updates: Partial<Message>) => void;
  updateReaction: (salonId: string, messageId: string, reactions: Record<string, string[]>, actorName?: string) => void;
  loadMessages: (salonId: string, limit?: number, offset?: number) => Promise<void>;
  loadMoreMessages: (salonId: string) => Promise<void>;
  setCurrentSalonId: (salonId: string | null) => void;
  isLoadingHistory: boolean;
}

const MessagesContext = createContext<MessagesContextType | null>(null);

const MAX_PER_SALON = 200;
const PAGE_SIZE = 50;

function mergeIncomingMessage(existing: Message[], incoming: Message): Message[] {
  const resolved = resolveReplyReferences([...existing, incoming]);
  const incomingResolved = resolved[resolved.length - 1];
  if (existing.some(m => m.id === incomingResolved.id)) return existing;
  return [...existing, incomingResolved].slice(-MAX_PER_SALON);
}

export function MessagesProvider({ children }: { children: ReactNode }) {
  const [salonMessages, setSalonMessages] = useState<Record<string, Message[]>>({});
  const [currentSalonId, setCurrentSalonId] = useState<string | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const subscriptionRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const loadingHistoryRef = useRef(false);
  const historyExhaustedRef = useRef<Record<string, boolean>>({});

  useEffect(() => {
    offlineModeService.setSyncHandler(async (action) => {
      if (action.type === 'send_message') {
        await supabaseDbService.addMessage(action.data);
      }
    });
    return () => offlineModeService.setSyncHandler(null);
  }, []);

  const applyLoadedMessages = useCallback((salonId: string, rawMessages: ReturnType<typeof convertSupabaseMessage>[], offset: number) => {
    const resolved = resolveReplyReferences(rawMessages);
    const sorted = dedupeAndSortMessages(resolved);

    if (rawMessages.length < PAGE_SIZE) {
      historyExhaustedRef.current[salonId] = true;
    }

    setSalonMessages(prev => {
      if (offset === 0) {
        return { ...prev, [salonId]: sorted.slice(0, MAX_PER_SALON) };
      }

      const existing = prev[salonId] || [];
      const combined = dedupeAndSortMessages([...sorted, ...existing]);
      return { ...prev, [salonId]: combined.slice(0, MAX_PER_SALON) };
    });

    resolved.forEach(msg => {
      offlineModeService.cacheMessage({
        id: msg.id,
        salonId,
        author: msg.author_name,
        text: msg.text,
        timestamp: new Date(msg.created_date),
        synced: true,
      });
    });
  }, []);

  const loadMessages = useCallback(async (salonId: string, limit: number = PAGE_SIZE, offset: number = 0) => {
    try {
      const messages = await supabaseDbService.getMessages(salonId, limit, offset);
      const converted = messages.map(convertSupabaseMessage);
      applyLoadedMessages(salonId, converted, offset);
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
  }, [applyLoadedMessages]);

  const loadMoreMessages = useCallback(async (salonId: string) => {
    if (loadingHistoryRef.current || historyExhaustedRef.current[salonId]) return;

    loadingHistoryRef.current = true;
    setIsLoadingHistory(true);
    try {
      const existing = salonMessages[salonId] || [];
      await loadMessages(salonId, PAGE_SIZE, existing.length);
    } finally {
      loadingHistoryRef.current = false;
      setIsLoadingHistory(false);
    }
  }, [salonMessages, loadMessages]);

  useEffect(() => {
    if (!currentSalonId) return;

    if (subscriptionRef.current) {
      supabase.removeChannel(subscriptionRef.current);
      subscriptionRef.current = null;
    }

    historyExhaustedRef.current[currentSalonId] = false;
    loadMessages(currentSalonId);

    const channel = supabaseDbService.subscribeToMessages(currentSalonId, {
      onInsert: (message) => {
        setSalonMessages(prev => {
          const existing = prev[currentSalonId] || [];
          const converted = convertSupabaseMessage(message);
          return { ...prev, [currentSalonId]: mergeIncomingMessage(existing, converted) };
        });
      },
      onUpdate: (message) => {
        setSalonMessages(prev => {
          const existing = prev[currentSalonId] || [];
          const converted = convertSupabaseMessage(message);
          const without = existing.filter(m => m.id !== converted.id);
          return { ...prev, [currentSalonId]: mergeIncomingMessage(without, converted) };
        });
      },
      onDelete: (messageId) => {
        setSalonMessages(prev => ({
          ...prev,
          [currentSalonId]: (prev[currentSalonId] || []).filter(m => m.id !== messageId),
        }));
      },
    });

    subscriptionRef.current = channel;

    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
        subscriptionRef.current = null;
      }
    };
  }, [currentSalonId, loadMessages]);

  const addMessage = useCallback(async (salonId: string, message: Message) => {
    const tempId = message.id || `temp-${Date.now()}-${Math.random()}`;
    const messageWithId = { ...message, id: tempId };

    setSalonMessages(prev => {
      const existing = prev[salonId] || [];
      if (existing.some(m => m.id === tempId)) return prev;
      return { ...prev, [salonId]: mergeIncomingMessage(existing, messageWithId) };
    });

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

      if (result && result.id !== tempId) {
        setSalonMessages(prev => {
          const existing = prev[salonId] || [];
          const withoutTemp = existing.filter(m => m.id !== tempId);
          const converted = convertSupabaseMessage(result);
          return { ...prev, [salonId]: mergeIncomingMessage(withoutTemp, converted) };
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
      [salonId]: (prev[salonId] || []).filter(m => m.id !== messageId),
    }));

    try {
      await supabaseDbService.deleteMessage(messageId);
    } catch (error) {
      console.error('Erreur lors de la suppression du message:', error);
    }
  }, []);

  const pinMessage = useCallback(async (salonId: string, messageId: string) => {
    let newPinned = false;

    setSalonMessages(prev => {
      const message = prev[salonId]?.find(m => m.id === messageId);
      if (!message) return prev;
      newPinned = !message.pinned;
      return {
        ...prev,
        [salonId]: (prev[salonId] || []).map(m =>
          m.id === messageId ? { ...m, pinned: newPinned } : m
        ),
      };
    });

    try {
      await supabaseDbService.updateMessage(messageId, { pinned: newPinned });
    } catch (error) {
      console.error('Erreur lors de l\'épinglage du message:', error);
    }
  }, []);

  const updateMessage = useCallback(async (salonId: string, messageId: string, updates: Partial<Message>) => {
    setSalonMessages(prev => ({
      ...prev,
      [salonId]: (prev[salonId] || []).map(m =>
        m.id === messageId ? { ...m, ...updates } : m
      ),
    }));

    try {
      await supabaseDbService.updateMessage(messageId, toDbMessageUpdates(updates));
    } catch (error) {
      console.error('Erreur lors de la mise à jour du message:', error);
    }
  }, []);

  const updateReaction = useCallback(async (salonId: string, messageId: string, reactions: Record<string, string[]>, actorName?: string) => {
    setSalonMessages(prev => ({
      ...prev,
      [salonId]: (prev[salonId] || []).map(m =>
        m.id === messageId ? { ...m, reactions } : m
      ),
    }));

    try {
      await supabaseDbService.updateMessage(messageId, { reactions }, actorName);
    } catch (error) {
      console.error('Erreur lors de la mise à jour des réactions:', error);
    }
  }, []);

  const value: MessagesContextType = {
    salonMessages,
    addMessage,
    getMessages,
    deleteMessage,
    pinMessage,
    updateMessage,
    updateReaction,
    loadMessages,
    loadMoreMessages,
    setCurrentSalonId,
    isLoadingHistory,
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
