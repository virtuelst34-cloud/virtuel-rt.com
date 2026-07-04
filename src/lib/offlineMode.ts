/**
 * Service Mode Offline
 * 
 * Gère le cache des messages, la lecture hors ligne
 * et la synchronisation automatique au retour en ligne
 */

import React from 'react';

export interface CachedMessage {
  id: string;
  salonId: string;
  author: string;
  text: string;
  timestamp: Date;
  synced: boolean;
}

export interface OfflineAction {
  type: 'send_message' | 'edit_message' | 'delete_message' | 'react';
  data: any;
  timestamp: Date;
  synced: boolean;
}

class OfflineModeService {
  private messageCache: Map<string, CachedMessage> = new Map();
  private pendingActions: OfflineAction[] = [];
  private isOnline: boolean = true;
  private listeners: Set<(online: boolean) => void> = new Set();
  private syncInProgress: boolean = false;
  private syncHandler: ((action: OfflineAction) => Promise<void>) | null = null;

  /**
   * Enregistre le handler de synchronisation (ex: envoi Supabase)
   */
  setSyncHandler(handler: ((action: OfflineAction) => Promise<void>) | null): void {
    this.syncHandler = handler;
  }

  constructor() {
    this.loadFromStorage();
    this.watchConnectivity();
    this.setupSyncOnReconnect();
  }

  /**
   * Charge le cache depuis le localStorage
   */
  private loadFromStorage(): void {
    try {
      const cached = localStorage.getItem('offline-message-cache');
      if (cached) {
        const messages = JSON.parse(cached);
        messages.forEach((msg: CachedMessage) => {
          this.messageCache.set(msg.id, {
            ...msg,
            timestamp: new Date(msg.timestamp)
          });
        });
      }

      const actions = localStorage.getItem('offline-pending-actions');
      if (actions) {
        this.pendingActions = JSON.parse(actions).map((action: OfflineAction) => ({
          ...action,
          timestamp: new Date(action.timestamp)
        }));
      }
    } catch (error) {
      console.error('Erreur lors du chargement du cache offline:', error);
    }
  }

  /**
   * Sauvegarde le cache dans le localStorage
   */
  private saveToStorage(): void {
    try {
      localStorage.setItem(
        'offline-message-cache',
        JSON.stringify(Array.from(this.messageCache.values()))
      );
      localStorage.setItem(
        'offline-pending-actions',
        JSON.stringify(this.pendingActions)
      );
    } catch (error) {
      console.error('Erreur lors de la sauvegarde du cache offline:', error);
    }
  }

  /**
   * Surveille la connectivité
   */
  private watchConnectivity(): void {
    if (typeof window === 'undefined' || !window.navigator) {
      return;
    }

    const updateOnlineStatus = () => {
      const wasOnline = this.isOnline;
      this.isOnline = navigator.onLine;

      if (wasOnline !== this.isOnline) {
        this.listeners.forEach(listener => listener(this.isOnline));

        if (this.isOnline && !this.syncInProgress) {
          this.syncPendingActions();
        }
      }
    };

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    // État initial
    this.isOnline = navigator.onLine;
  }

  /**
   * Configure la synchronisation automatique
   */
  private setupSyncOnReconnect(): void {
    if (typeof window === 'undefined') return;

    window.addEventListener('online', () => {
      if (!this.syncInProgress) {
        this.syncPendingActions();
      }
    });
  }

  /**
   * Ajoute un message au cache
   */
  cacheMessage(message: CachedMessage): void {
    this.messageCache.set(message.id, message);
    this.saveToStorage();
  }

  /**
   * Obtient les messages d'un salon depuis le cache
   */
  getCachedMessages(salonId: string, limit: number = 50): CachedMessage[] {
    return Array.from(this.messageCache.values())
      .filter(msg => msg.salonId === salonId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Obtient tous les messages du cache
   */
  getAllCachedMessages(): CachedMessage[] {
    return Array.from(this.messageCache.values())
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Ajoute une action en attente (pour sync)
   */
  addPendingAction(action: Omit<OfflineAction, 'timestamp' | 'synced'>): void {
    this.pendingActions.push({
      ...action,
      timestamp: new Date(),
      synced: false
    });
    this.saveToStorage();
  }

  /**
   * Synchronise les actions en attente
   */
  async syncPendingActions(): Promise<void> {
    if (!this.isOnline || this.syncInProgress || this.pendingActions.length === 0) {
      return;
    }

    this.syncInProgress = true;

    try {
      // Simuler la synchronisation
      // En production, appeler l'API réelle
      for (const action of this.pendingActions) {
        await this.syncAction(action);
        action.synced = true;
      }

      // Supprimer les actions synchronisées
      this.pendingActions = this.pendingActions.filter(a => !a.synced);
      this.saveToStorage();
    } catch (error) {
      console.error('Erreur lors de la synchronisation:', error);
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Synchronise une action individuelle
   */
  private async syncAction(action: OfflineAction): Promise<void> {
    if (this.syncHandler) {
      await this.syncHandler(action);
      return;
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  /**
   * Vide le cache des messages
   */
  clearMessageCache(): void {
    this.messageCache.clear();
    this.saveToStorage();
  }

  /**
   * Vide les actions en attente
   */
  clearPendingActions(): void {
    this.pendingActions = [];
    this.saveToStorage();
  }

  /**
   * Obtient le nombre d'actions en attente
   */
  getPendingActionsCount(): number {
    return this.pendingActions.length;
  }

  /**
   * Vérifie si on est en mode offline
   */
  isOffline(): boolean {
    return !this.isOnline;
  }

  /**
   * S'abonne aux changements de connectivité
   */
  subscribe(listener: (online: boolean) => void): () => void {
    this.listeners.add(listener);
    
    // Appeler immédiatement avec l'état actuel
    listener(this.isOnline);

    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Force la synchronisation manuelle
   */
  async forceSync(): Promise<void> {
    if (this.isOnline) {
      await this.syncPendingActions();
    }
  }

  /**
   * Obtient des statistiques sur le cache
   */
  getCacheStats(): {
    cachedMessages: number;
    pendingActions: number;
    isOnline: boolean;
    cacheSize: number;
  } {
    const cacheSize = JSON.stringify(Array.from(this.messageCache.values())).length;

    return {
      cachedMessages: this.messageCache.size,
      pendingActions: this.pendingActions.length,
      isOnline: this.isOnline,
      cacheSize
    };
  }

  /**
   * Nettoie les anciens messages du cache
   */
  cleanupOldMessages(maxAge: number = 7 * 24 * 60 * 60 * 1000): number {
    const now = Date.now();
    let removed = 0;

    for (const [id, message] of this.messageCache.entries()) {
      const age = now - message.timestamp.getTime();
      if (age > maxAge) {
        this.messageCache.delete(id);
        removed++;
      }
    }

    if (removed > 0) {
      this.saveToStorage();
    }

    return removed;
  }
}

export const offlineModeService = new OfflineModeService();

// Hook React pour utiliser le mode offline
export function useOfflineMode() {
  const [isOnline, setIsOnline] = React.useState(() => !offlineModeService.isOffline());
  const [pendingCount, setPendingCount] = React.useState(() => offlineModeService.getPendingActionsCount());

  React.useEffect(() => {
    const unsubscribe = offlineModeService.subscribe((online) => {
      setIsOnline(online);
    });

    // Mettre à jour le compteur périodiquement
    const interval = setInterval(() => {
      setPendingCount(offlineModeService.getPendingActionsCount());
    }, 1000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  return {
    isOnline,
    pendingCount,
    cacheMessage: (msg: CachedMessage) => offlineModeService.cacheMessage(msg),
    getCachedMessages: (salonId: string) => offlineModeService.getCachedMessages(salonId),
    forceSync: () => offlineModeService.forceSync(),
    getCacheStats: () => offlineModeService.getCacheStats(),
    isOffline: () => offlineModeService.isOffline(),
  };
}
