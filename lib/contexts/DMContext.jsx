import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';

const DMContext = createContext(null);
const DM_KEY = 'virtuel_rt_dm';

export function DMProvider({ children }) {
  const [conversations, setConversations] = useState({});
  const timerRef = useRef(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(DM_KEY);
      if (saved) setConversations(JSON.parse(saved));
    } catch {}
  }, []);

  useEffect(() => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      try { localStorage.setItem(DM_KEY, JSON.stringify(conversations)); } catch {}
    }, 300);
    return () => clearTimeout(timerRef.current);
  }, [conversations]);

  const sendDM = useCallback((fromUser, toName, text) => {
    const key = [fromUser.name, toName].sort().join('::');
    const msg = {
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

  const markRead = useCallback((userName, otherName) => {
    const key = [userName, otherName].sort().join('::');
    setConversations(prev => ({
      ...prev,
      [key]: (prev[key] || []).map(m =>
        m.sender_name !== userName ? { ...m, is_read: true } : m
      ),
    }));
  }, []);

  const getConversation = useCallback((a, b) => {
    const key = [a, b].sort().join('::');
    return conversations[key] || [];
  }, [conversations]);

  const getUnreadCount = useCallback((userName) => {
    return Object.values(conversations).flat()
      .filter(m => m.recipient_name === userName && !m.is_read).length;
  }, [conversations]);

  const value = { conversations, sendDM, markRead, getConversation, getUnreadCount };

  return <DMContext.Provider value={value}>{children}</DMContext.Provider>;
}

export function useDM() {
  const ctx = useContext(DMContext);
  if (!ctx) throw new Error('useDM must be used inside DMProvider');
  return ctx;
}
