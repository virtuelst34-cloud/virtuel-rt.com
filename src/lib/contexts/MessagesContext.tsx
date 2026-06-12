import React, { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from 'react';

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
}

const MessagesContext = createContext<MessagesContextType | null>(null);

const MESSAGES_KEY = 'virtuel_st_messages';
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 jours
const MAX_PER_SALON = 200;

function pruneMessages(salonMessages: Record<string, Message[]>): Record<string, Message[]> {
  const cutoff = Date.now() - MAX_AGE_MS;
  return Object.fromEntries(
    Object.entries(salonMessages).map(([id, msgs]) => [
      id,
      msgs
        .filter(m => !m.timestamp || new Date(m.timestamp).getTime() > cutoff)
        .slice(-MAX_PER_SALON)
    ]).filter(([, msgs]) => msgs.length > 0)
  ) as Record<string, Message[]>;
}

export function MessagesProvider({ children }: { children: ReactNode }) {
  const [salonMessages, setSalonMessages] = useState<Record<string, Message[]>>({});
  const timerRef = useRef<number | null>(null);

  // Charger depuis localStorage avec purge des vieux messages
  useEffect(() => {
    try {
      const saved = localStorage.getItem(MESSAGES_KEY);
      if (saved) setSalonMessages(pruneMessages(JSON.parse(saved)));
    } catch {}
  }, []);

  // Persister avec debouncing
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      try {
        localStorage.setItem(MESSAGES_KEY, JSON.stringify(salonMessages));
      } catch {}
    }, 300);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [salonMessages]);

  const addMessage = useCallback((salonId: string, message: Message) => {
    setSalonMessages(prev => {
      const existing = prev[salonId] || [];
      if (message.id && existing.some(m => m.id === message.id)) return prev;
      const updated = [...existing, message].slice(-MAX_PER_SALON);
      return { ...prev, [salonId]: updated };
    });
  }, []);

  const getMessages = useCallback((salonId: string) => {
    return salonMessages[salonId] || [];
  }, [salonMessages]);

  const deleteMessage = useCallback((salonId: string, messageId: string) => {
    setSalonMessages(prev => ({
      ...prev,
      [salonId]: (prev[salonId] || []).filter(m => m.id !== messageId)
    }));
  }, []);

  const pinMessage = useCallback((salonId: string, messageId: string) => {
    setSalonMessages(prev => ({
      ...prev,
      // Fix: ne pas forcer pinned:false sur les autres messages
      [salonId]: (prev[salonId] || []).map(m =>
        m.id === messageId ? { ...m, pinned: !m.pinned } : m
      )
    }));
  }, []);

  const updateReaction = useCallback((salonId: string, messageId: string, reactions: Record<string, string[]>) => {
    setSalonMessages(prev => ({
      ...prev,
      [salonId]: (prev[salonId] || []).map(m =>
        m.id === messageId ? { ...m, reactions } : m
      )
    }));
  }, []);

  const value: MessagesContextType = {
    salonMessages, addMessage, getMessages, deleteMessage, pinMessage, updateReaction
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
