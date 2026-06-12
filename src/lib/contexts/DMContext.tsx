import React, { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from 'react';

interface DMMessage {
  id: string;
  sender_name: string;
  sender_avatar: string;
  sender_initials: string;
  recipient_name: string;
  text: string;
  is_read: boolean;
  created_date: string;
}

interface DMContextType {
  conversations: Record<string, DMMessage[]>;
  sendDM: (fromUser: { name: string; avatar: string; initials: string }, toName: string, text: string) => DMMessage;
  markRead: (userName: string, otherName: string) => void;
  getConversation: (a: string, b: string) => DMMessage[];
  getUnreadCount: (userName: string) => number;
}

const DMContext = createContext<DMContextType | null>(null);
const DM_KEY = 'virtuel_st_dm';

export function DMProvider({ children }: { children: ReactNode }) {
  const [conversations, setConversations] = useState<Record<string, DMMessage[]>>({});
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(DM_KEY);
      if (saved) setConversations(JSON.parse(saved));
    } catch {}
  }, []);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      try { localStorage.setItem(DM_KEY, JSON.stringify(conversations)); } catch {}
    }, 300);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [conversations]);

  const sendDM = useCallback((fromUser: { name: string; avatar: string; initials: string }, toName: string, text: string): DMMessage => {
    const key = [fromUser.name, toName].sort().join('::');
    const msg: DMMessage = {
      id: Date.now().toString(),
      sender_name: fromUser.name,
      sender_avatar: fromUser.avatar,
      sender_initials: fromUser.initials,
      recipient_name: toName,
      text,
      is_read: false,
      created_date: new Date().toISOString(),
    };
    setConversations(prev => ({ ...prev, [key]: [...(prev[key] || []), msg] }));
    return msg;
  }, []);

  const markRead = useCallback((userName: string, otherName: string) => {
    const key = [userName, otherName].sort().join('::');
    setConversations(prev => ({
      ...prev,
      [key]: (prev[key] || []).map(m =>
        m.sender_name !== userName ? { ...m, is_read: true } : m
      ),
    }));
  }, []);

  const getConversation = useCallback((a: string, b: string): DMMessage[] => {
    const key = [a, b].sort().join('::');
    return conversations[key] || [];
  }, [conversations]);

  const getUnreadCount = useCallback((userName: string): number => {
    return Object.values(conversations).flat()
      .filter(m => m.recipient_name === userName && !m.is_read).length;
  }, [conversations]);

  const value: DMContextType = { conversations, sendDM, markRead, getConversation, getUnreadCount };

  return <DMContext.Provider value={value}>{children}</DMContext.Provider>;
}

export function useDM(): DMContextType {
  const ctx = useContext(DMContext);
  if (!ctx) throw new Error('useDM must be used inside DMProvider');
  return ctx;
}
