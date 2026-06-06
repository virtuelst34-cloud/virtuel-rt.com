import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { useNotifications } from './NotificationsContext';
import { useUser } from './UserContext';

const ModerationContext = createContext(null);

const BLOCKED_KEY = 'virtuel_st_blocked';

export function ModerationProvider({ children }) {
  const [blockedUsers, setBlockedUsers] = useState([]);
  const { addNotification } = useNotifications();
  const { profiles, setProfiles } = useUser();
  const timerRef = useRef(null);

  // Charger les utilisateurs bloqués depuis localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(BLOCKED_KEY);
      if (saved) setBlockedUsers(JSON.parse(saved));
    } catch {}
  }, []);

  // Persister avec debouncing
  useEffect(() => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      try {
        localStorage.setItem(BLOCKED_KEY, JSON.stringify(blockedUsers));
      } catch {}
    }, 300);
    return () => clearTimeout(timerRef.current);
  }, [blockedUsers]);

  const blockUser = useCallback((name) => {
    setBlockedUsers(prev => {
      if (prev.includes(name)) return prev;
      addNotification({ type: 'block', message: `🚫 ${name} a été bloqué.` });
      return [...prev, name];
    });
  }, [addNotification]);

  const unblockUser = useCallback((name) => {
    setBlockedUsers(prev => prev.filter(u => u !== name));
  }, []);

  const isBlocked = useCallback((name) => blockedUsers.includes(name), [blockedUsers]);

  const banUser = useCallback((name, reason = '') => {
    setProfiles(prev => {
      const p = prev[name];
      if (!p) return prev;
      return { ...prev, [name]: { ...p, isBanned: true, banReason: reason } };
    });
    addNotification({ type: 'mod', message: `🔨 ${name} a été banni.` });
  }, [addNotification, setProfiles]);

  const unbanUser = useCallback((name) => {
    setProfiles(prev => {
      const p = prev[name];
      if (!p) return prev;
      return { ...prev, [name]: { ...p, isBanned: false, banReason: '' } };
    });
  }, [setProfiles]);

  const muteUser = useCallback((name) => {
    setProfiles(prev => {
      const p = prev[name];
      if (!p) return prev;
      return { ...prev, [name]: { ...p, isMuted: true } };
    });
  }, [setProfiles]);

  const unmuteUser = useCallback((name) => {
    setProfiles(prev => {
      const p = prev[name];
      if (!p) return prev;
      return { ...prev, [name]: { ...p, isMuted: false } };
    });
  }, [setProfiles]);

  const isUserBanned = useCallback((name) => !!profiles[name]?.isBanned, [profiles]);
  const isUserMuted = useCallback((name) => !!profiles[name]?.isMuted, [profiles]);

  const reportMessage = useCallback((authorName) => {
    addNotification({ type: 'report', message: `⚠️ Message de ${authorName} signalé.` });
  }, [addNotification]);

  const value = {
    blockedUsers, blockUser, unblockUser, isBlocked,
    banUser, unbanUser, muteUser, unmuteUser, isUserBanned, isUserMuted,
    reportMessage
  };

  return (
    <ModerationContext.Provider value={value}>
      {children}
    </ModerationContext.Provider>
  );
}

export function useModeration() {
  const context = useContext(ModerationContext);
  if (!context) throw new Error('useModeration must be used inside ModerationProvider');
  return context;
}
