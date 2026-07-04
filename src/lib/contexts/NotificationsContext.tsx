import React, { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from 'react';

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
  actions?: NotificationAction[];
  groupKey?: string; // Pour grouper les notifications similaires
  groupCount?: number; // Nombre de notifications dans le groupe
}

interface NotificationsContextType {
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => void;
  markAllRead: () => void;
  clearNotifications: () => void;
  unreadCount: number;
  removeNotification: (id: number | string) => void;
}

const NotificationsContext = createContext<NotificationsContextType | null>(null);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const timersRef = useRef<Record<number, number>>({});

  // Nettoyer tous les timers au démontage
  useEffect(() => {
    return () => { Object.values(timersRef.current).forEach(clearTimeout); };
  }, []);

  const addNotification = useCallback((notification: Omit<Notification, 'id' | 'timestamp'>) => {
    const id = Date.now();
    
    // Vérifier si on doit grouper avec une notification existante
    if (notification.groupKey) {
      setNotifications(prev => {
        const existingGroup = prev.find(n => n.groupKey === notification.groupKey && !n.read);
        if (existingGroup) {
          // Mettre à jour le groupe existant
          return prev.map(n => 
            n.id === existingGroup.id 
              ? { ...n, message: notification.message, timestamp: new Date().toISOString(), groupCount: (n.groupCount || 1) + 1 }
              : n
          );
        }
        // Créer un nouveau groupe
        return [...prev, { ...notification, id, timestamp: new Date().toISOString(), groupCount: 1 }];
      });
    } else {
      setNotifications(prev => [...prev, { ...notification, id, timestamp: new Date().toISOString() }]);
    }
    
    // Auto-suppression après 15 secondes (sauf si actions sont présentes)
    if (!notification.actions || notification.actions.length === 0) {
      timersRef.current[id] = setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== id));
        delete timersRef.current[id];
      }, 15000);
    }
  }, []);

  const removeNotification = useCallback((id: number | string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    if (typeof id === 'number' && timersRef.current[id]) {
      clearTimeout(timersRef.current[id]);
      delete timersRef.current[id];
    }
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
    Object.values(timersRef.current).forEach(clearTimeout);
    timersRef.current = {};
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  const value: NotificationsContextType = {
    notifications, addNotification, markAllRead, clearNotifications, unreadCount, removeNotification
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
