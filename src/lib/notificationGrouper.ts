/**
 * Service de Groupement des Notifications
 * 
 * Regroupe les notifications similaires pour éviter la surcharge
 * et améliorer l'expérience utilisateur.
 */

export interface Notification {
  id: string;
  type: 'message' | 'mention' | 'reaction' | 'achievement' | 'system';
  title: string;
  message?: string;
  userId?: string;
  salonId?: string;
  timestamp: Date;
  read: boolean;
}

export interface GroupedNotification {
  id: string;
  type: Notification['type'];
  title: string;
  count: number;
  notifications: Notification[];
  latestTimestamp: Date;
  read: boolean;
  groupedBy: string; // Clé de groupement (ex: userId, salonId)
}

class NotificationGrouper {
  private notifications: Map<string, Notification> = new Map();
  private groupingRules: Map<Notification['type'], (n: Notification) => string> = new Map();

  constructor() {
    // Règles de groupement par type de notification
    this.groupingRules.set('message', (n) => n.salonId || 'global');
    this.groupingRules.set('mention', (n) => n.userId || 'unknown');
    this.groupingRules.set('reaction', (n) => n.userId || 'unknown');
    this.groupingRules.set('achievement', (n) => n.userId || 'unknown');
    this.groupingRules.set('system', (n) => 'system');
  }

  /**
   * Ajoute une notification
   */
  addNotification(notification: Notification): void {
    this.notifications.set(notification.id, notification);
  }

  /**
   * Supprime une notification
   */
  removeNotification(id: string): void {
    this.notifications.delete(id);
  }

  /**
   * Marque une notification comme lue
   */
  markAsRead(id: string): void {
    const notification = this.notifications.get(id);
    if (notification) {
      notification.read = true;
      this.notifications.set(id, notification);
    }
  }

  /**
   * Marque toutes les notifications comme lues
   */
  markAllAsRead(): void {
    for (const [id, notification] of this.notifications.entries()) {
      notification.read = true;
      this.notifications.set(id, notification);
    }
  }

  /**
   * Obtient la clé de groupement pour une notification
   */
  private getGroupingKey(notification: Notification): string {
    const rule = this.groupingRules.get(notification.type);
    if (rule) {
      return `${notification.type}:${rule(notification)}`;
    }
    return notification.type;
  }

  /**
   * Regroupe les notifications similaires
   */
  groupNotifications(maxAge: number = 5 * 60 * 1000): GroupedNotification[] {
    const groups: Map<string, Notification[]> = new Map();
    const now = Date.now();

    // Regrouper par clé de groupement et temps
    for (const notification of this.notifications.values()) {
      const age = now - notification.timestamp.getTime();
      
      // Ignorer les notifications trop anciennes
      if (age > maxAge) continue;

      const key = this.getGroupingKey(notification);
      
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(notification);
    }

    // Convertir en GroupedNotification
    const grouped: GroupedNotification[] = [];
    
    for (const [key, notifications] of groups.entries()) {
      if (notifications.length === 0) continue;

      const latest = notifications.reduce((a, b) => 
        a.timestamp > b.timestamp ? a : b
      );
      
      const allRead = notifications.every(n => n.read);
      const groupedBy = key.split(':')[1];

      let title = latest.title;
      
      // Adapter le titre si groupé
      if (notifications.length > 1) {
        title = this.getGroupedTitle(notifications[0].type, notifications.length);
      }

      grouped.push({
        id: `group:${key}`,
        type: notifications[0].type,
        title,
        count: notifications.length,
        notifications,
        latestTimestamp: latest.timestamp,
        read: allRead,
        groupedBy
      });
    }

    // Trier par timestamp (plus récent en premier)
    return grouped.sort((a, b) => 
      b.latestTimestamp.getTime() - a.latestTimestamp.getTime()
    );
  }

  /**
   * Génère un titre groupé
   */
  private getGroupedTitle(type: Notification['type'], count: number): string {
    switch (type) {
      case 'message':
        return `${count} nouveaux messages`;
      case 'mention':
        return `${count} nouvelles mentions`;
      case 'reaction':
        return `${count} nouvelles réactions`;
      case 'achievement':
        return `${count} nouveaux succès`;
      case 'system':
        return `${count} notifications système`;
      default:
        return `${count} notifications`;
    }
  }

  /**
   * Obtient toutes les notifications non groupées
   */
  getAllNotifications(): Notification[] {
    return Array.from(this.notifications.values())
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Obtient les notifications non lues
   */
  getUnreadNotifications(): Notification[] {
    return Array.from(this.notifications.values())
      .filter(n => !n.read)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Obtient le nombre de notifications non lues
   */
  getUnreadCount(): number {
    return Array.from(this.notifications.values()).filter(n => !n.read).length;
  }

  /**
   * Obtient le nombre de notifications groupées non lues
   */
  getUnreadGroupedCount(): number {
    const grouped = this.groupNotifications();
    return grouped.filter(g => !g.read).length;
  }

  /**
   * Nettoie les anciennes notifications
   */
  cleanup(maxAge: number = 24 * 60 * 60 * 1000): number {
    const now = Date.now();
    let removed = 0;

    for (const [id, notification] of this.notifications.entries()) {
      const age = now - notification.timestamp.getTime();
      if (age > maxAge) {
        this.notifications.delete(id);
        removed++;
      }
    }

    return removed;
  }

  /**
   * Vide toutes les notifications
   */
  clearAll(): void {
    this.notifications.clear();
  }

  /**
   * Obtient des statistiques sur les notifications
   */
  getStats(): {
    total: number;
    unread: number;
    byType: Record<Notification['type'], number>;
  } {
    const all = Array.from(this.notifications.values());
    const unread = all.filter(n => !n.read);
    
    const byType: Record<Notification['type'], number> = {
      message: 0,
      mention: 0,
      reaction: 0,
      achievement: 0,
      system: 0
    };

    for (const notification of all) {
      byType[notification.type]++;
    }

    return {
      total: all.length,
      unread: unread.length,
      byType
    };
  }
}

export const notificationGrouper = new NotificationGrouper();
