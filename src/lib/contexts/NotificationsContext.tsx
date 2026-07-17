import React, { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { isValidUuid } from '@/lib/utils/uuid';

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

function toDbNotificationType(type: string): string {
  return DB_NOTIFICATION_TYPES.has(type) ? type : 'system';
}

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [localNotifications, setLocalNotifications] = useState<Notification[]>([]);
  const timersRef = useRef<Record<number | string, number>>({});
  const [supabaseUserId, setSupabaseUserId] = useState<string | null>(null);

  // Écouter les changements d'authentification pour récupérer l'ID utilisateur
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setSupabaseUserId(session.user.id);
      } else {
        setSupabaseUserId(null);
        setNotifications([]);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

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
          // Si la table n'existe pas, on ignore silencieusement
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

    // S'abonner aux nouvelles notifications en temps réel
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

  // Fusionner les notifications locales et Supabase
  const allNotifications = [...localNotifications, ...notifications].sort((a, b) =>
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  // Nettoyer tous les timers au démontage
  useEffect(() => {
    return () => { Object.values(timersRef.current).forEach(clearTimeout); };
  }, []);

  const addNotification = useCallback(async (notification: Omit<Notification, 'id' | 'timestamp'>) => {
    const id = Date.now().toString();
    const timestamp = new Date().toISOString();
    
    // Ajouter localement pour affichage immédiat
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

    // Sauvegarder dans Supabase si l'utilisateur est connecté
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
          // Si la table n'existe pas, on ignore silencieusement
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
    
    // Auto-suppression locale après 15 secondes (sauf interactions importantes)
    const persistentTypes = new Set(['dm', 'mention', 'friend_request', 'friend_accepted', 'mod', 'report']);
    if ((!notification.actions || notification.actions.length === 0) && !persistentTypes.has(notification.type)) {
      timersRef.current[id] = setTimeout(() => {
        setLocalNotifications(prev => prev.filter(n => n.id !== id));
        delete timersRef.current[id];
      }, 15000);
    }
  }, [supabaseUserId]);

  const removeNotification = useCallback(async (id: number | string) => {
    // Supprimer localement
    setLocalNotifications(prev => prev.filter(n => n.id !== id));
    setNotifications(prev => prev.filter(n => n.id !== id));

    // Supprimer de Supabase si c'est une notification persistante
    if (supabaseUserId && isValidUuid(supabaseUserId) && isValidUuid(id)) {
      try {
        const { error } = await supabase.from('notifications').delete().eq('id', id);
        if (error) {
          // Si la table n'existe pas, on ignore silencieusement
          if (error.code !== '42P01') {
            console.error('Erreur lors de la suppression de la notification:', error);
          }
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
    // Marquer localement
    setLocalNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setNotifications(prev => prev.map(n => ({ ...n, read: true, readAt: new Date().toISOString() })));

    // Marquer dans Supabase
    if (supabaseUserId && isValidUuid(supabaseUserId)) {
      try {
        const { error } = await supabase.rpc('mark_all_notifications_read', { p_user_id: supabaseUserId });
        if (error) {
          // Si la fonction n'existe pas, on ignore silencieusement
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

    // Supprimer toutes les notifications de Supabase
    if (supabaseUserId && isValidUuid(supabaseUserId)) {
      try {
        const { error } = await supabase.from('notifications').delete().eq('user_id', supabaseUserId);
        if (error) {
          // Si la table n'existe pas, on ignore silencieusement
          if (error.code !== '42P01') {
            console.error('Erreur lors de la suppression des notifications:', error);
          }
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
