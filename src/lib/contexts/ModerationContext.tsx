import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { supabase } from '../supabase';
import { useNotifications } from './NotificationsContext';
import { useUser } from './UserContext';
import {
  fetchAllModeration,
  upsertUserModeration,
  type UserModerationRecord,
} from '../moderationService';

interface ModerationContextType {
  blockedUsers: string[];
  blockUser: (name: string) => void;
  unblockUser: (name: string) => void;
  isBlocked: (name: string) => boolean;
  banUser: (name: string, reason?: string) => Promise<void>;
  unbanUser: (name: string) => Promise<void>;
  muteUser: (name: string) => Promise<void>;
  unmuteUser: (name: string) => Promise<void>;
  isUserBanned: (name: string) => boolean;
  isUserMuted: (name: string) => boolean;
  reportMessage: (authorName: string) => void;
}

const ModerationContext = createContext<ModerationContextType | null>(null);

const BLOCKED_KEY = 'virtuel_rt_blocked';

function applyModerationToProfiles(
  records: UserModerationRecord[],
  setProfiles: ReturnType<typeof useUser>['setProfiles'],
) {
  setProfiles(prev => {
    const next = { ...prev };
    for (const record of records) {
      const existing = next[record.user_name];
      if (!existing) continue;
      next[record.user_name] = {
        ...existing,
        isBanned: record.is_banned,
        isMuted: record.is_muted,
        banReason: record.ban_reason || '',
      };
    }
    return next;
  });
}

export function ModerationProvider({ children }: { children: ReactNode }) {
  const [blockedUsers, setBlockedUsers] = useState<string[]>([]);
  const [moderationByName, setModerationByName] = useState<Record<string, UserModerationRecord>>({});
  const { addNotification } = useNotifications();
  const { user, profiles, setProfiles } = useUser();

  useEffect(() => {
    try {
      const saved = localStorage.getItem(BLOCKED_KEY);
      if (saved) setBlockedUsers(JSON.parse(saved));
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(BLOCKED_KEY, JSON.stringify(blockedUsers));
    } catch {
      /* ignore */
    }
  }, [blockedUsers]);

  useEffect(() => {
    let active = true;

    const load = async () => {
      const records = await fetchAllModeration();
      if (!active) return;
      const map: Record<string, UserModerationRecord> = {};
      for (const record of records) {
        map[record.user_name] = record;
      }
      setModerationByName(map);
      applyModerationToProfiles(records, setProfiles);
    };

    void load();

    const channel = supabase
      .channel('user_moderation_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_moderation' },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            const old = payload.old as UserModerationRecord;
            if (!old?.user_name) return;
            setModerationByName(prev => {
              const next = { ...prev };
              delete next[old.user_name];
              return next;
            });
            setProfiles(prev => {
              const p = prev[old.user_name];
              if (!p) return prev;
              return {
                ...prev,
                [old.user_name]: { ...p, isBanned: false, isMuted: false, banReason: '' },
              };
            });
            return;
          }

          const record = payload.new as UserModerationRecord;
          if (!record?.user_name) return;
          setModerationByName(prev => ({ ...prev, [record.user_name]: record }));
          setProfiles(prev => {
            const p = prev[record.user_name];
            if (!p) return prev;
            return {
              ...prev,
              [record.user_name]: {
                ...p,
                isBanned: record.is_banned,
                isMuted: record.is_muted,
                banReason: record.ban_reason || '',
              },
            };
          });
        },
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [setProfiles]);

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

  const syncRecord = useCallback((record: UserModerationRecord | null, userName: string) => {
    if (!record) return;
    setModerationByName(prev => ({ ...prev, [userName]: record }));
    setProfiles(prev => {
      const p = prev[userName];
      if (!p) return prev;
      return {
        ...prev,
        [userName]: {
          ...p,
          isBanned: record.is_banned,
          isMuted: record.is_muted,
          banReason: record.ban_reason || '',
        },
      };
    });
  }, [setProfiles]);

  const banUser = useCallback(async (name: string, reason = '') => {
    const record = await upsertUserModeration(name, {
      is_banned: true,
      ban_reason: reason,
      moderated_by: user?.name || null,
    });
    syncRecord(record, name);
    addNotification({ type: 'mod', message: `🔨 ${name} a été banni.` });
  }, [addNotification, syncRecord, user?.name]);

  const unbanUser = useCallback(async (name: string) => {
    const record = await upsertUserModeration(name, {
      is_banned: false,
      ban_reason: '',
      moderated_by: user?.name || null,
    });
    syncRecord(record, name);
  }, [syncRecord, user?.name]);

  const muteUser = useCallback(async (name: string) => {
    const record = await upsertUserModeration(name, {
      is_muted: true,
      moderated_by: user?.name || null,
    });
    syncRecord(record, name);
  }, [syncRecord, user?.name]);

  const unmuteUser = useCallback(async (name: string) => {
    const record = await upsertUserModeration(name, {
      is_muted: false,
      moderated_by: user?.name || null,
    });
    syncRecord(record, name);
  }, [syncRecord, user?.name]);

  const isUserBanned = useCallback(
    (name: string) => moderationByName[name]?.is_banned ?? !!profiles[name]?.isBanned,
    [moderationByName, profiles],
  );

  const isUserMuted = useCallback(
    (name: string) => moderationByName[name]?.is_muted ?? !!profiles[name]?.isMuted,
    [moderationByName, profiles],
  );

  const reportMessage = useCallback((authorName: string) => {
    addNotification({ type: 'report', message: `⚠️ Message de ${authorName} signalé.` });
  }, [addNotification]);

  const value: ModerationContextType = {
    blockedUsers,
    blockUser,
    unblockUser,
    isBlocked,
    banUser,
    unbanUser,
    muteUser,
    unmuteUser,
    isUserBanned,
    isUserMuted,
    reportMessage,
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
