import React, { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { isValidUuid } from '@/lib/utils/uuid';
import { getStoredGuestToken } from '@/lib/guestAuthService';

interface NotificationAction {
  label: string;
  onClick: () => void;
  primary?: boolean;
}

interface Notification {
  id: number | string;
  type: string;
  message: string;
  timestamp: string;
  read?: boolean;
  readAt?: string;
  actions?: NotificationAction[];
  groupKey?: string;
  groupCount?: number;
  metadata?: any;
}

interface NotificationsContextType {
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => void;
  markAllRead: () => void;
  markNotificationRead: (id: number | string) => void;
  clearNotifications: () => void;
  unreadCount: number;
  removeNotification: (id: number | string) => void;
}

const NotificationsContext = createContext<NotificationsContextType | null>(null);

const DB_NOTIFICATION_TYPES = new Set(['dm', 'friend_request', 'friend_accepted', 'system', 'mention']);
const GUEST_NOTIFS_KEY = 'virtuel_rt_guest_notifications';
const PERSISTENT_TYPES = new Set(['dm', 'mention', 'friend_request', 'friend_accepted', 'mod', 'report']);

type StoredNotification = Omit<Notification, 'actions'>;

function guestBucketKey(): string {
  return getStoredGuestToken() || 'guest';
}

function loadGuestNotifications(bucket = guestBucketKey()): StoredNotification[] {
  try {
    const raw = localStorage.getItem(GUEST_NOTIFS_KEY);
    if (!raw) return [];
    const all = JSON.parse(raw) as Record<string, StoredNotification[]>;
    const primary = Array.isArray(all[bucket]) ? all[bucket] : [];
    // Migration soft: fusionner l'ancien bucket générique si un token apparaît
    if (bucket !== 'guest' && Array.isArray(all.guest) && all.guest.length > 0) {
      const merged = [...all.guest, ...primary];
      const seen = new Set<string>();
      return merged.filter((n) => {
        const id = String(n.id);
        if (seen.has(id)) return false;
        seen.add(id);
        return true;
      });
    }
    return primary;
  } catch {
    return [];
  }
}

function saveGuestNotifications(notifs: Notification[], bucket = guestBucketKey()): void {
  try {
    const raw = localStorage.getItem(GUEST_NOTIFS_KEY);
    const all = raw ? (JSON.parse(raw) as Record<string, StoredNotification[]>) : {};
    const serializable: StoredNotification[] = notifs
      .filter((n) => PERSISTENT_TYPES.has(n.type) || n.read === false)
      .slice(0, 50)
      .map(({ actions: _actions, ...rest }) => rest);
    all[bucket] = serializable;
    if (bucket !== 'guest') delete all.guest;
    localStorage.setItem(GUEST_NOTIFS_KEY, JSON.stringify(all));
  } catch {
    /* ignore */
  }
}

function clearGuestNotifications(bucket = guestBucketKey()): void {
  try {
    const raw = localStorage.getItem(GUEST_NOTIFS_KEY);
    if (!raw) return;
    const all = JSON.parse(raw) as Record<string, StoredNotification[]>;
    delete all[bucket];
    delete all.guest;
    localStorage.setItem(GUEST_NOTIFS_KEY, JSON.stringify(all));
  } catch {
    /* ignore */
  }
}

function toDbNotificationType(type: string): string {
  return DB_NOTIFICATION_TYPES.has(type) ? type : 'system';
}

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [localNotifications, setLocalNotifications] = useState<Notification[]>([]);
  const timersRef = useRef<Record<number | string, number>>({});
  const [supabaseUserId, setSupabaseUserId] = useState<string | null>(null);
  const syncedGuestRef = useRef(false);

  // Hydrater les notifications invité au démarrage / focus
  useEffect(() => {
    const hydrateGuest = () => {
      if (supabaseUserId) return;
      const stored = loadGuestNotifications();
      if (stored.length > 0) {
        setLocalNotifications((prev) => {
          const ids = new Set(prev.map((n) => String(n.id)));
          const merged = [...stored.filter((n) => !ids.has(String(n.id))), ...prev];
          return merged;
        });
      }
    };
    hydrateGuest();
    window.addEventListener('focus', hydrateGuest);
    return () => window.removeEventListener('focus', hydrateGuest);
  }, [supabaseUserId]);

  // Persister les notifs locales tant qu'invité
  useEffect(() => {
    if (supabaseUserId) return;
    saveGuestNotifications(localNotifications);
  }, [localNotifications, supabaseUserId]);

  // Écouter les changements d'authentification pour récupérer l'ID utilisateur
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setSupabaseUserId(session.user.id);
      } else {
        setSupabaseUserId(null);
        setNotifications([]);
        syncedGuestRef.current = false;
        const stored = loadGuestNotifications();
        if (stored.length > 0) setLocalNotifications(stored);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Sync guest → DB à la connexion email
  useEffect(() => {
    if (!supabaseUserId || !isValidUuid(supabaseUserId) || syncedGuestRef.current) return;

    const sync = async () => {
      const pending = loadGuestNotifications();
      if (pending.length === 0) {
        syncedGuestRef.current = true;
        return;
      }

      try {
        for (const n of pending) {
          await supabase.from('notifications').insert({
            user_id: supabaseUserId,
            type: toDbNotificationType(n.type),
            message: n.message,
            group_key: n.groupKey,
            group_count: n.groupCount || 1,
            metadata: n.metadata || {},
            read_at: n.read ? (n.readAt || new Date().toISOString()) : null,
          });
        }
      } catch (error) {
        console.error('Sync notifications invité → compte:', error);
      } finally {
        clearGuestNotifications();
        setLocalNotifications([]);
        syncedGuestRef.current = true;
      }
    };

    void sync();
  }, [supabaseUserId]);

  // Charger les notifications depuis Supabase au démarrage
  useEffect(() => {
    if (!supabaseUserId || !isValidUuid(supabaseUserId)) return;

    const loadNotifications = async () => {
      try {
        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', supabaseUserId)
          .order('created_at', { ascending: false })
          .limit(50);

        if (error) {
          console.error('Erreur lors du chargement des notifications:', error);
          if (error.code === '42P01') {
            console.log('Table notifications non créée encore, fonctionnalité désactivée');
            return;
          }
          return;
        }

        if (data) {
          const mapped = data.map(n => ({
            id: n.id,
            type: n.type,
            message: n.message,
            timestamp: n.created_at,
            read: !!n.read_at,
            readAt: n.read_at,
            groupKey: n.group_key,
            groupCount: n.group_count || 1,
            metadata: n.metadata
          }));
          setNotifications(mapped);
        }
      } catch (error) {
        console.error('Erreur lors du chargement des notifications:', error);
      }
    };

    loadNotifications();

    let channel: any;
    try {
      channel = supabase
        .channel('notifications-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${supabaseUserId}`
          },
          (payload) => {
            if (payload.eventType === 'INSERT') {
              const newNotif = {
                id: payload.new.id,
                type: payload.new.type,
                message: payload.new.message,
                timestamp: payload.new.created_at,
                read: !!payload.new.read_at,
                readAt: payload.new.read_at,
                groupKey: payload.new.group_key,
                groupCount: payload.new.group_count || 1,
                metadata: payload.new.metadata
              };
              setNotifications(prev => {
                if (newNotif.groupKey && prev.some(n => n.groupKey === newNotif.groupKey && !n.read)) {
                  return prev.map(n =>
                    n.groupKey === newNotif.groupKey
                      ? { ...n, message: newNotif.message, timestamp: newNotif.timestamp, groupCount: newNotif.groupCount }
                      : n,
                  );
                }
                return [newNotif, ...prev];
              });
            } else if (payload.eventType === 'UPDATE') {
              setNotifications(prev =>
                prev.map(n =>
                  n.id === payload.new.id
                    ? { ...n, read: !!payload.new.read_at, readAt: payload.new.read_at }
                    : n
                )
              );
            } else if (payload.eventType === 'DELETE') {
              setNotifications(prev => prev.filter(n => n.id !== payload.old.id));
            }
          }
        )
        .subscribe((status: string) => {
          if (status === 'SUBSCRIPTION_ERROR') {
            console.log('Erreur de souscription aux notifications, fonctionnalité désactivée');
          }
        });
    } catch (error) {
      console.error('Erreur lors de la création du channel notifications:', error);
    }

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [supabaseUserId]);

  const allNotifications = [...localNotifications, ...notifications].sort((a, b) =>
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  useEffect(() => {
    return () => { Object.values(timersRef.current).forEach(clearTimeout); };
  }, []);

  const addNotification = useCallback(async (notification: Omit<Notification, 'id' | 'timestamp'>) => {
    const id = Date.now().toString();
    const timestamp = new Date().toISOString();
    
    setLocalNotifications(prev => {
      if (notification.groupKey) {
        const existingGroup = prev.find(n => n.groupKey === notification.groupKey && !n.read);
        if (existingGroup) {
          return prev.map(n => 
            n.id === existingGroup.id 
              ? { ...n, message: notification.message, timestamp, groupCount: (n.groupCount || 1) + 1 }
              : n
          );
        }
        return [...prev, { ...notification, id, timestamp, groupCount: 1 }];
      }
      return [...prev, { ...notification, id, timestamp }];
    });

    if (supabaseUserId && isValidUuid(supabaseUserId)) {
      try {
        const { error } = await supabase.from('notifications').insert({
          user_id: supabaseUserId,
          type: toDbNotificationType(notification.type),
          message: notification.message,
          group_key: notification.groupKey,
          group_count: notification.groupCount || 1,
          metadata: notification.actions ? { actions: notification.actions } : {}
        });

        if (error) {
          if (error.code === '42P01') {
            console.log('Table notifications non créée encore, notification locale uniquement');
          } else {
            console.error('Erreur lors de la sauvegarde de la notification:', error);
          }
        }
      } catch (error) {
        console.error('Erreur lors de la sauvegarde de la notification:', error);
      }
    }
    
    if ((!notification.actions || notification.actions.length === 0) && !PERSISTENT_TYPES.has(notification.type)) {
      timersRef.current[id] = setTimeout(() => {
        setLocalNotifications(prev => prev.filter(n => n.id !== id));
        delete timersRef.current[id];
      }, 15000);
    }
  }, [supabaseUserId]);

  const removeNotification = useCallback(async (id: number | string) => {
    setLocalNotifications(prev => prev.filter(n => n.id !== id));
    setNotifications(prev => prev.filter(n => n.id !== id));

    if (supabaseUserId && isValidUuid(supabaseUserId) && isValidUuid(id)) {
      try {
        const { error } = await supabase.from('notifications').delete().eq('id', id);
        if (error && error.code !== '42P01') {
          console.error('Erreur lors de la suppression de la notification:', error);
        }
      } catch (error) {
        console.error('Erreur lors de la suppression de la notification:', error);
      }
    }

    if (timersRef.current[id]) {
      clearTimeout(timersRef.current[id]);
      delete timersRef.current[id];
    }
  }, [supabaseUserId]);

  const markAllRead = useCallback(async () => {
    setLocalNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setNotifications(prev => prev.map(n => ({ ...n, read: true, readAt: new Date().toISOString() })));

    if (supabaseUserId && isValidUuid(supabaseUserId)) {
      try {
        const { error } = await supabase.rpc('mark_all_notifications_read', { p_user_id: supabaseUserId });
        if (error) {
          if (error.code === '42883') {
            console.log('Fonction mark_all_notifications_read non créée encore');
          } else {
            console.error('Erreur lors du marquage des notifications comme lues:', error);
          }
        }
      } catch (error) {
        console.error('Erreur lors du marquage des notifications comme lues:', error);
      }
    }
  }, [supabaseUserId]);

  const clearNotifications = useCallback(async () => {
    setLocalNotifications([]);
    setNotifications([]);
    Object.values(timersRef.current).forEach(clearTimeout);
    timersRef.current = {};
    if (!supabaseUserId) clearGuestNotifications();

    if (supabaseUserId && isValidUuid(supabaseUserId)) {
      try {
        const { error } = await supabase.from('notifications').delete().eq('user_id', supabaseUserId);
        if (error && error.code !== '42P01') {
          console.error('Erreur lors de la suppression des notifications:', error);
        }
      } catch (error) {
        console.error('Erreur lors de la suppression des notifications:', error);
      }
    }
  }, [supabaseUserId]);

  const markNotificationRead = useCallback(async (id: number | string) => {
    const readAt = new Date().toISOString();
    setLocalNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true, readAt } : n));
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true, readAt } : n));

    if (supabaseUserId && isValidUuid(supabaseUserId) && isValidUuid(id)) {
      try {
        await supabase.from('notifications').update({ read_at: readAt }).eq('id', id);
      } catch (error) {
        console.error('Erreur marquage notification lue:', error);
      }
    }
  }, [supabaseUserId]);

  const unreadCount = allNotifications.filter(n => !n.read).length;

  const value: NotificationsContextType = {
    notifications: allNotifications,
    addNotification,
    markAllRead,
    markNotificationRead,
    clearNotifications,
    unreadCount,
    removeNotification
  };

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications(): NotificationsContextType {
  const context = useContext(NotificationsContext);
  if (!context) throw new Error('useNotifications must be used inside NotificationsProvider');
  return context;
}
