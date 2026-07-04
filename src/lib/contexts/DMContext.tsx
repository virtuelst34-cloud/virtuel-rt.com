import React, { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from 'react';
import { supabase } from '../supabase';

interface DMMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  text: string;
  created_at: string;
  read_at?: string;
  reactions?: Record<string, string[]>;
  image_url?: string;
}

interface DMContextType {
  conversations: Record<string, DMMessage[]>;
  sendDM: (senderId: string, receiverId: string, text: string) => Promise<void>;
  markRead: (messageId: string) => Promise<void>;
  getConversation: (userId1: string, userId2: string) => DMMessage[];
  getUnreadCount: (userId: string) => number;
  loadConversation: (userId1: string, userId2: string) => Promise<void>;
}

const DMContext = createContext<DMContextType | null>(null);

export function DMProvider({ children }: { children: ReactNode }) {
  const [conversations, setConversations] = useState<Record<string, DMMessage[]>>({});
  const [subscription, setSubscription] = useState<any>(null);

  // Charger une conversation depuis Supabase
  const loadConversation = useCallback(async (userId1: string, userId2: string) => {
    try {
      const key = [userId1, userId2].sort().join('::');
      const { data, error } = await supabase
        .from('direct_messages')
        .select('*')
        .or(`and(sender_id.eq.${userId1},receiver_id.eq.${userId2}),and(sender_id.eq.${userId2},receiver_id.eq.${userId1})`)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setConversations(prev => ({ ...prev, [key]: data || [] }));
    } catch (error) {
      console.error('Erreur lors du chargement de la conversation:', error);
    }
  }, []);

  // S'abonner aux nouveaux messages en temps réel
  const subscribeToDMs = useCallback((userId: string) => {
    if (subscription) {
      supabase.removeChannel(subscription);
    }

    const channel = supabase
      .channel(`direct_messages:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'direct_messages',
          filter: `or(sender_id.eq.${userId},receiver_id.eq.${userId})`,
        },
        (payload) => {
          const message = payload.new as DMMessage;
          const key = [message.sender_id, message.receiver_id].sort().join('::');
          setConversations(prev => ({
            ...prev,
            [key]: [...(prev[key] || []), message],
          }));
        }
      )
      .subscribe();

    setSubscription(channel);

    return () => {
      supabase.removeChannel(channel);
    };
  }, [subscription]);

  const sendDM = useCallback(async (senderId: string, receiverId: string, text: string) => {
    try {
      const { error } = await supabase
        .from('direct_messages')
        .insert({
          sender_id: senderId,
          receiver_id: receiverId,
          text,
        });

      if (error) throw error;
    } catch (error) {
      console.error('Erreur lors de l\'envoi du message privé:', error);
      throw error;
    }
  }, []);

  const markRead = useCallback(async (messageId: string) => {
    try {
      const { error } = await supabase
        .from('direct_messages')
        .update({ read_at: new Date().toISOString() })
        .eq('id', messageId);

      if (error) throw error;

      setConversations(prev => {
        const updated: Record<string, DMMessage[]> = {};
        for (const [key, messages] of Object.entries(prev)) {
          updated[key] = messages.map(m =>
            m.id === messageId ? { ...m, read_at: new Date().toISOString() } : m
          );
        }
        return updated;
      });
    } catch (error) {
      console.error('Erreur lors du marquage comme lu:', error);
    }
  }, []);

  const getConversation = useCallback((userId1: string, userId2: string): DMMessage[] => {
    const key = [userId1, userId2].sort().join('::');
    return conversations[key] || [];
  }, [conversations]);

  const getUnreadCount = useCallback((userId: string): number => {
    return Object.values(conversations).flat()
      .filter(m => m.receiver_id === userId && !m.read_at).length;
  }, [conversations]);

  const value: DMContextType = {
    conversations,
    sendDM,
    markRead,
    getConversation,
    getUnreadCount,
    loadConversation,
  };

  return <DMContext.Provider value={value}>{children}</DMContext.Provider>;
}

export function useDM(): DMContextType {
  const ctx = useContext(DMContext);
  if (!ctx) throw new Error('useDM must be used inside DMProvider');
  return ctx;
}
