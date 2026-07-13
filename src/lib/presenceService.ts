/**
 * Service de Présence
 * 
 * Gère la présence des utilisateurs en temps réel via Supabase
 * et fournit les comptes de connectés par salon
 */

import { supabase } from './supabase';

export interface OnlineUser {
  userId: string;
  name: string;
  avatar: string;
  initials: string;
  status: 'online' | 'away' | 'busy' | 'offline' | 'invisible';
  currentSalonId?: string;
  lastSeen: Date;
}

export interface SalonPresence {
  salonId: string;
  onlineCount: number;
  users: OnlineUser[];
}

class PresenceService {
  private onlineUsers: Map<string, OnlineUser> = new Map();
  private salonPresence: Map<string, SalonPresence> = new Map();
  private presenceChannel: any = null;
  private listeners: Set<() => void> = new Set();
  private cleanupInterval: any = null;
  private readonly CLEANUP_INTERVAL_MS = 60000; // Nettoyer toutes les minutes
  private readonly OFFLINE_THRESHOLD_MS = 300000; // 5 minutes d'inactivité = hors ligne

  private isFresh(lastSeen: Date): boolean {
    return Date.now() - lastSeen.getTime() <= this.OFFLINE_THRESHOLD_MS;
  }

  private upsertLocalUser(user: OnlineUser): void {
    this.onlineUsers.set(user.userId, user);
    this.removeFromSalonPresence(user.userId);
    this.updateSalonPresence(user);
    this.notifyListeners();
  }

  /**
   * Initialise le service de présence
   */
  async initialize(userId: string): Promise<void> {
    console.log('[PresenceService] Initialisation avec userId:', userId);
    
    // Si déjà initialisé, ne rien faire
    if (this.presenceChannel) {
      console.log('[PresenceService] Service déjà initialisé');
      return;
    }
    
    // Démarrer le nettoyage automatique des utilisateurs inactifs
    this.startCleanup();
    
    // S'abonner aux changements de présence en temps réel
    this.presenceChannel = supabase
      .channel('presence_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_presence',
        },
        (payload: any) => {
          console.log('[PresenceService] Changement de présence reçu:', payload);
          this.handlePresenceChange(payload);
        }
      )
      .subscribe((status: string) => {
        console.log('[PresenceService] Status subscription:', status);
        if (status === 'SUBSCRIBED') {
          console.log('Présence initialisée');
          this.loadInitialPresence();
        }
      });

    // Marquer l'utilisateur comme en ligne
    await this.setOnline(userId);
  }

  /**
   * Charge la présence initiale depuis Supabase
   */
  private async loadInitialPresence(): Promise<void> {
    try {
      console.log('[PresenceService] Chargement de la présence initiale...');
      const { data, error } = await supabase
        .from('user_presence')
        .select('*');

      if (error) {
        console.error('[PresenceService] Erreur lors du chargement de la présence:', error);
        return;
      }

      console.log('[PresenceService] Données reçues:', data);

      if (data) {
        this.onlineUsers.clear();
        this.salonPresence.clear();

        data.forEach((presence: any) => {
          const lastSeen = new Date(presence.last_seen);
          if (!this.isFresh(lastSeen)) return;
          if (presence.status === 'offline') return;
          if (presence.status === 'invisible') return; // Ne pas afficher les utilisateurs invisibles

          const onlineUser: OnlineUser = {
            userId: presence.user_id,
            name: presence.name,
            avatar: presence.avatar,
            initials: presence.initials,
            status: presence.status || 'online',
            currentSalonId: presence.current_salon_id,
            lastSeen
          };

          this.onlineUsers.set(presence.user_id, onlineUser);
          this.updateSalonPresence(onlineUser);
        });

        console.log('[PresenceService] Utilisateurs en ligne chargés:', this.onlineUsers.size);
        console.log('[PresenceService] Salon presence:', Array.from(this.salonPresence.entries()));
        this.notifyListeners();
      }
    } catch (error) {
      console.error('[PresenceService] Erreur lors du chargement de la présence:', error);
    }
  }

  /**
   * Gère les changements de présence
   */
  private handlePresenceChange(payload: any): void {
    const { eventType, new: newRecord, old: oldRecord } = payload;

    if (eventType === 'INSERT' || eventType === 'UPDATE') {
      if (newRecord.status === 'offline') {
        this.onlineUsers.delete(newRecord.user_id);
        this.removeFromSalonPresence(newRecord.user_id);
        this.notifyListeners();
        return;
      }

      if (newRecord.status === 'invisible') {
        this.onlineUsers.delete(newRecord.user_id);
        this.removeFromSalonPresence(newRecord.user_id);
        this.notifyListeners();
        return;
      }

      const onlineUser: OnlineUser = {
        userId: newRecord.user_id,
        name: newRecord.name,
        avatar: newRecord.avatar,
        initials: newRecord.initials,
        status: newRecord.status || 'online',
        currentSalonId: newRecord.current_salon_id,
        lastSeen: new Date(newRecord.last_seen)
      };

      this.upsertLocalUser(onlineUser);
    } else if (eventType === 'DELETE') {
      const userId = oldRecord.user_id;
      this.onlineUsers.delete(userId);
      this.removeFromSalonPresence(userId);
      this.notifyListeners();
    }
  }

  /**
   * Met à jour la présence d'un salon
   */
  private updateSalonPresence(user: OnlineUser): void {
    if (!user.currentSalonId) return;

    let presence = this.salonPresence.get(user.currentSalonId);
    
    if (!presence) {
      presence = {
        salonId: user.currentSalonId,
        onlineCount: 0,
        users: []
      };
      this.salonPresence.set(user.currentSalonId, presence);
    }

    // Vérifier si l'utilisateur est déjà dans la liste
    const existingIndex = presence.users.findIndex(u => u.userId === user.userId);
    
    if (existingIndex >= 0) {
      presence.users[existingIndex] = user;
    } else {
      presence.users.push(user);
    }

    presence.onlineCount = presence.users.length;
  }

  /**
   * Retire un utilisateur de la présence d'un salon
   */
  private removeFromSalonPresence(userId: string): void {
    for (const [salonId, presence] of this.salonPresence.entries()) {
      const index = presence.users.findIndex(u => u.userId === userId);
      
      if (index >= 0) {
        presence.users.splice(index, 1);
        presence.onlineCount = presence.users.length;
        
        if (presence.onlineCount === 0) {
          this.salonPresence.delete(salonId);
        }
        break;
      }
    }
  }

  /**
   * Marque l'utilisateur comme en ligne
   */
  async setOnline(userId: string, salonId?: string, userData?: { name?: string; avatar?: string; initials?: string; status?: OnlineUser['status'] }): Promise<void> {
    console.log('[PresenceService] setOnline appelé avec:', { userId, salonId, userData });
    if (userData?.status === 'offline') {
      await this.setOffline(userId);
      return;
    }

    const status = userData?.status || 'online';
    this.upsertLocalUser({
      userId,
      name: userData?.name || userId,
      avatar: userData?.avatar || 'av1',
      initials: userData?.initials || userId.slice(0, 2).toUpperCase(),
      status,
      currentSalonId: salonId || undefined,
      lastSeen: new Date()
    });

    try {
      const row = {
        user_id: userId,
        name: userData?.name || userId,
        avatar: userData?.avatar || 'av1',
        initials: userData?.initials || userId.slice(0, 2).toUpperCase(),
        status,
        current_salon_id: salonId ?? null,
        last_seen: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('user_presence')
        .upsert(row, { onConflict: 'user_id' });

      if (error) {
        console.error('[PresenceService] Erreur lors de la mise en ligne:', error);
      } else {
        console.log('[PresenceService] Présence enregistrée');
      }
    } catch (error) {
      console.error('[PresenceService] Erreur lors de la mise en ligne:', error);
    }
  }

  /**
   * Met à jour le salon actuel de l'utilisateur
   */
  async updateCurrentSalon(userId: string, salonId: string | null, userData?: { name?: string; avatar?: string; initials?: string; status?: OnlineUser['status'] }): Promise<void> {
    if (userData?.status === 'offline') {
      await this.setOffline(userId);
      return;
    }

    const existing = this.onlineUsers.get(userId);
    const status = userData?.status || existing?.status || 'online';
    this.upsertLocalUser({
      userId,
      name: userData?.name || existing?.name || userId,
      avatar: userData?.avatar || existing?.avatar || 'av1',
      initials: userData?.initials || existing?.initials || userId.slice(0, 2).toUpperCase(),
      status,
      currentSalonId: salonId || undefined,
      lastSeen: new Date()
    });

    try {
      const { error } = await supabase
        .from('user_presence')
        .upsert({
          user_id: userId,
          name: userData?.name || existing?.name || userId,
          avatar: userData?.avatar || existing?.avatar || 'av1',
          initials: userData?.initials || existing?.initials || userId.slice(0, 2).toUpperCase(),
          status,
          current_salon_id: salonId,
          last_seen: new Date().toISOString(),
        }, { onConflict: 'user_id' });

      if (error) {
        console.error('Erreur lors de la mise à jour du salon:', error);
      }
    } catch (error) {
      console.error('Erreur lors de la mise à jour du salon:', error);
    }
  }

  async touch(userId: string, status?: OnlineUser['status']): Promise<void> {
    if (status === 'offline') {
      await this.setOffline(userId);
      return;
    }

    const existing = this.onlineUsers.get(userId);
    const nextStatus = status || existing?.status || 'online';
    if (existing) {
      this.upsertLocalUser({ ...existing, status: nextStatus, lastSeen: new Date() });
    }

    try {
      const { error } = await supabase
        .from('user_presence')
        .update({
          status: nextStatus,
          last_seen: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (error) {
        console.error('Erreur lors de la mise à jour de l’activité:', error);
      }
    } catch (error) {
      console.error('Erreur lors de la mise à jour de l’activité:', error);
    }
  }

  async updateStatus(userId: string, status: OnlineUser['status'], userData?: { name: string; avatar: string; initials: string }): Promise<void> {
    if (status === 'offline') {
      await this.setOffline(userId);
      return;
    }

    const existing = this.onlineUsers.get(userId);
    if (!existing) {
      await this.setOnline(userId, undefined, { ...userData, status });
      return;
    }

    this.upsertLocalUser({
      ...existing,
      name: userData?.name || existing.name,
      avatar: userData?.avatar || existing.avatar,
      initials: userData?.initials || existing.initials,
      status,
      lastSeen: new Date(),
    });

    try {
      const { error } = await supabase
        .from('user_presence')
        .update({
          status,
          last_seen: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (error) {
        console.error('Erreur lors de la mise à jour du statut de présence:', error);
      }
    } catch (error) {
      console.error('Erreur lors de la mise à jour du statut de présence:', error);
    }
  }

  /**
   * Marque l'utilisateur comme hors ligne
   */
  async setOffline(userId: string): Promise<void> {
    this.onlineUsers.delete(userId);
    this.removeFromSalonPresence(userId);
    this.notifyListeners();

    try {
      const { error } = await supabase
        .from('user_presence')
        .delete()
        .eq('user_id', userId);

      if (error) {
        console.error('Erreur lors de la mise hors ligne:', error);
      }
      
      // Nettoyer le channel
      if (this.presenceChannel) {
        await supabase.removeChannel(this.presenceChannel);
        this.presenceChannel = null;
      }
      
      // Arrêter le nettoyage automatique
      this.stopCleanup();
      
    } catch (error) {
      console.error('Erreur lors de la mise hors ligne:', error);
    }
  }

  /**
   * Démarre le nettoyage automatique des utilisateurs inactifs
   */
  private startCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    
    this.cleanupInterval = setInterval(() => {
      this.runAutoCleanup();
    }, this.CLEANUP_INTERVAL_MS);
    
    console.log('[PresenceService] Nettoyage automatique démarré');
  }

  /**
   * Arrête le nettoyage automatique
   */
  private stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      console.log('[PresenceService] Nettoyage automatique arrêté');
    }
  }

  /**
   * Nettoie les utilisateurs inactifs (plus de 5 minutes sans activité)
   */
  private runAutoCleanup(): void {
    const removed = this.removeInactiveUsers();
    if (removed > 0) {
      console.log('[PresenceService] Nettoyage des utilisateurs inactifs:', removed);
    }
  }

  /**
   * Obtient tous les utilisateurs en ligne
   */
  getOnlineUsers(): OnlineUser[] {
    return Array.from(this.onlineUsers.values());
  }

  /**
   * Obtient les utilisateurs en ligne dans un salon spécifique
   */
  getOnlineUsersInSalon(salonId: string): OnlineUser[] {
    const presence = this.salonPresence.get(salonId);
    return presence?.users || [];
  }

  /**
   * Obtient le nombre d'utilisateurs en ligne dans un salon
   */
  getOnlineCountInSalon(salonId: string): number {
    const presence = this.salonPresence.get(salonId);
    return presence?.onlineCount || 0;
  }

  /**
   * Obtient la présence de tous les salons
   */
  getAllSalonPresence(): Map<string, SalonPresence> {
    return new Map(this.salonPresence);
  }

  /**
   * S'abonne aux changements de présence
   */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Notifie tous les listeners
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => listener());
  }

  /**
   * Nettoie les utilisateurs inactifs (plus de 5 minutes)
   */
  cleanupInactiveUsers(): number {
    return this.removeInactiveUsers();
  }

  private removeInactiveUsers(): number {
    let removed = 0;

    for (const [userId, user] of this.onlineUsers.entries()) {
      if (!this.isFresh(user.lastSeen)) {
        this.onlineUsers.delete(userId);
        this.removeFromSalonPresence(userId);
        removed++;
      }
    }

    if (removed > 0) {
      this.notifyListeners();
    }

    return removed;
  }

  /**
   * Déconnecte le service
   */
  disconnect(): void {
    if (this.presenceChannel) {
      supabase.removeChannel(this.presenceChannel);
      this.presenceChannel = null;
    }
    this.onlineUsers.clear();
    this.salonPresence.clear();
    this.listeners.clear();
  }
}

export const presenceService = new PresenceService();
