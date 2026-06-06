import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';

const MessagesContext = createContext(null);

const MESSAGES_KEY = 'virtuel_st_messages';
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 jours
const MAX_PER_SALON = 200;

function pruneMessages(salonMessages) {
  const cutoff = Date.now() - MAX_AGE_MS;
  return Object.fromEntries(
    Object.entries(salonMessages).map(([id, msgs]) => [
      id,
      msgs
        .filter(m => !m.timestamp || new Date(m.timestamp).getTime() > cutoff)
        .slice(-MAX_PER_SALON)
    ]).filter(([, msgs]) => msgs.length > 0)
  );
}

export function MessagesProvider({ children }) {
  const [salonMessages, setSalonMessages] = useState({});
  const timerRef = useRef(null);

  // Charger depuis localStorage avec purge des vieux messages
  useEffect(() => {
    try {
      const saved = localStorage.getItem(MESSAGES_KEY);
      if (saved) setSalonMessages(pruneMessages(JSON.parse(saved)));
    } catch {}
  }, []);

  // Persister avec debouncing
  useEffect(() => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      try {
        localStorage.setItem(MESSAGES_KEY, JSON.stringify(salonMessages));
      } catch {}
    }, 300);
    return () => clearTimeout(timerRef.current);
  }, [salonMessages]);

  const addMessage = useCallback((salonId, message) => {
    setSalonMessages(prev => {
      const existing = prev[salonId] || [];
      if (message.id && existing.some(m => m.id === message.id)) return prev;
      const updated = [...existing, message].slice(-MAX_PER_SALON);
      return { ...prev, [salonId]: updated };
    });
  }, []);

  const getMessages = useCallback((salonId) => {
    return salonMessages[salonId] || [];
  }, [salonMessages]);

  const deleteMessage = useCallback((salonId, messageId) => {
    setSalonMessages(prev => ({
      ...prev,
      [salonId]: (prev[salonId] || []).filter(m => m.id !== messageId)
    }));
  }, []);

  const pinMessage = useCallback((salonId, messageId) => {
    setSalonMessages(prev => ({
      ...prev,
      // Fix: ne pas forcer pinned:false sur les autres messages
      [salonId]: (prev[salonId] || []).map(m =>
        m.id === messageId ? { ...m, pinned: !m.pinned } : m
      )
    }));
  }, []);

  const updateReaction = useCallback((salonId, messageId, reactions) => {
    setSalonMessages(prev => ({
      ...prev,
      [salonId]: (prev[salonId] || []).map(m =>
        m.id === messageId ? { ...m, reactions } : m
      )
    }));
  }, []);

  const value = {
    salonMessages, addMessage, getMessages, deleteMessage, pinMessage, updateReaction
  };

  return (
    <MessagesContext.Provider value={value}>
      {children}
    </MessagesContext.Provider>
  );
}

export function useMessages() {
  const context = useContext(MessagesContext);
  if (!context) throw new Error('useMessages must be used inside MessagesProvider');
  return context;
}
