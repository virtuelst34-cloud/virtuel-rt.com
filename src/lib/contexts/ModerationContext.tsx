import React, { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from 'react';
import { useNotifications } from './NotificationsContext';
import { useUser } from './UserContext';

interface ModerationContextType {
  blockedUsers: string[];
  blockUser: (name: string) => void;
  unblockUser: (name: string) => void;
  isBlocked: (name: string) => boolean;
  banUser: (name: string, reason?: string) => void;
  unbanUser: (name: string) => void;
  muteUser: (name: string) => void;
  unmuteUser: (name: string) => void;
  isUserBanned: (name: string) => boolean;
  isUserMuted: (name: string) => boolean;
  reportMessage: (authorName: string) => void;
}

const ModerationContext = createContext<ModerationContextType | null>(null);

const BLOCKED_KEY = 'virtuel_rt_blocked';

export function ModerationProvider({ children }: { children: ReactNode }) {
  const [blockedUsers, setBlockedUsers] = useState<string[]>([]);
  const { addNotification } = useNotifications();
  const { profiles, setProfiles } = useUser();
  const timerRef = useRef<number | null>(null);

  // Charger les utilisateurs bloqués depuis localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(BLOCKED_KEY);
      if (saved) setBlockedUsers(JSON.parse(saved));
    } catch {}
  }, []);

  // Persister avec debouncing
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      try {
        localStorage.setItem(BLOCKED_KEY, JSON.stringify(blockedUsers));
      } catch {}
    }, 300);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [blockedUsers]);

  const blockUser = useCallback((name: string) => {
    setBlockedUsers(prev => {
      if (prev.includes(name)) return prev;
      addNotification({ type: 'block', message: `🚫 ${name} a été bloqué.` });
      return [...prev, name];
    });
  }, [addNotification]);

  const unblockUser = useCallback((name: string) => {
    setBlockedUsers(prev => prev.filter(u => u !== name));
  }, []);

  const isBlocked = useCallback((name: string) => blockedUsers.includes(name), [blockedUsers]);

  const banUser = useCallback((name: string, reason = '') => {
    setProfiles(prev => {
      const p = prev[name];
      if (!p) return prev;
      return { ...prev, [name]: { ...p, isBanned: true, banReason: reason } };
    });
    addNotification({ type: 'mod', message: `🔨 ${name} a été banni.` });
  }, [addNotification, setProfiles]);

  const unbanUser = useCallback((name: string) => {
    setProfiles(prev => {
      const p = prev[name];
      if (!p) return prev;
      return { ...prev, [name]: { ...p, isBanned: false, banReason: '' } };
    });
  }, [setProfiles]);

  const muteUser = useCallback((name: string) => {
    setProfiles(prev => {
      const p = prev[name];
      if (!p) return prev;
      return { ...prev, [name]: { ...p, isMuted: true } };
    });
  }, [setProfiles]);

  const unmuteUser = useCallback((name: string) => {
    setProfiles(prev => {
      const p = prev[name];
      if (!p) return prev;
      return { ...prev, [name]: { ...p, isMuted: false } };
    });
  }, [setProfiles]);

  const isUserBanned = useCallback((name: string) => !!profiles[name]?.isBanned, [profiles]);
  const isUserMuted = useCallback((name: string) => !!profiles[name]?.isMuted, [profiles]);

  const reportMessage = useCallback((authorName: string) => {
    addNotification({ type: 'report', message: `⚠️ Message de ${authorName} signalé.` });
  }, [addNotification]);

  const value: ModerationContextType = {
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

export function useModeration(): ModerationContextType {
  const context = useContext(ModerationContext);
  if (!context) throw new Error('useModeration must be used inside ModerationProvider');
  return context;
}
