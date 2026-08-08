/**
 * Service de Présence
 *
 * Gère la présence des utilisateurs en temps réel via Supabase
 * et fournit les comptes de connectés par salon.
 *
 * Écritures via RPCs (upsert_own_presence / touch_own_presence / delete_own_presence)
 * pour que auth + invités partagent la même clé (pseudo = current_actor_name).
 */

import { supabase } from './supabase';
import { getStoredGuestToken } from './guestAuthService';

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
  private presenceChannel: ReturnType<typeof supabase.channel> | null = null;
  private listeners: Set<() => void> = new Set();
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;
  private refreshInterval: ReturnType<typeof setInterval> | null = null;
  private selfUserId: string | null = null;
  private initializing: Promise<void> | null = null;

  /** Heartbeat client ~60s → hors ligne après ~3–4 battements manqués */
  private readonly CLEANUP_INTERVAL_MS = 60_000;
  /** REST reconciliation — Realtime is primary; keep this sparse to avoid flicker/load. */
  private readonly REFRESH_INTERVAL_MS = 150_000;
  private readonly OFFLINE_THRESHOLD_MS = 240_000; // 4 minutes
  private readonly HEARTBEAT_HINT_MS = 60_000;

  getHeartbeatIntervalMs(): number {
    return this.HEARTBEAT_HINT_MS;
  }

  private guestTokenArg(): string | null {
    return getStoredGuestToken();
  }

  private isFresh(lastSeen: Date): boolean {
    return Date.now() - lastSeen.getTime() <= this.OFFLINE_THRESHOLD_MS;
  }

  private toOnlineUser(presence: {
    user_id: string;
    name: string;
    avatar: string;
    initials: string;
    status?: string | null;
    current_salon_id?: string | null;
    last_seen: string;
  }): OnlineUser | null {
    const lastSeen = new Date(presence.last_seen);
    if (!this.isFresh(lastSeen)) return null;
    if (presence.status === 'offline' || presence.status === 'invisible') return null;

    return {
      userId: presence.user_id,
      name: presence.name,
      avatar: presence.avatar,
      initials: presence.initials,
      status: (presence.status as OnlineUser['status']) || 'online',
      currentSalonId: presence.current_salon_id || undefined,
      lastSeen,
    };
  }

  private upsertLocalUser(user: OnlineUser): void {
    this.onlineUsers.set(user.userId, user);
    this.removeFromSalonPresence(user.userId);
    this.updateSalonPresence(user);
    this.notifyListeners();
  }

  /**
   * Initialise le service de présence (abonnement Realtime + charge initiale).
   * Safe à appeler plusieurs fois : réutilise le channel, met à jour selfUserId.
   */
  async initialize(userId: string): Promise<void> {
    this.selfUserId = userId;

    if (this.presenceChannel) {
      return;
    }

    if (this.initializing) {
      await this.initializing;
      return;
    }

    this.initializing = this.doInitialize(userId);
    try {
      await this.initializing;
    } finally {
      this.initializing = null;
    }
  }

  private async doInitialize(userId: string): Promise<void> {
    console.log('[PresenceService] Initialisation avec userId:', userId);

    this.startCleanup();
    this.startPeriodicRefresh();

    this.presenceChannel = supabase
      .channel('presence_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_presence',
        },
        (payload: { eventType?: string; new?: Record<string, unknown>; old?: Record<string, unknown> }) => {
          this.handlePresenceChange(payload);
        },
      )
      .subscribe((status: string) => {
        console.log('[PresenceService] Status subscription:', status);
        if (status === 'SUBSCRIBED') {
          void this.loadInitialPresence();
        }
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          console.warn('[PresenceService] Channel lost, will allow re-init:', status);
          this.presenceChannel = null;
        }
      });

    await this.setOnline(userId);
  }

  /** Recharge depuis la DB (guerit Realtime manqué / fantômes). */
  private async loadInitialPresence(): Promise<void> {
    try {
      const freshSince = new Date(Date.now() - this.OFFLINE_THRESHOLD_MS).toISOString();
      const { data, error } = await supabase
        .from('user_presence')
        .select('user_id, name, avatar, initials, status, current_salon_id, last_seen')
        .gte('last_seen', freshSince);

      if (error) {
        console.error('[PresenceService] Erreur lors du chargement de la présence:', error);
        return;
      }

      const next = new Map<string, OnlineUser>();
      this.salonPresence.clear();

      (data || []).forEach((presence) => {
        const onlineUser = this.toOnlineUser(presence);
        if (!onlineUser) return;
        next.set(onlineUser.userId, onlineUser);
        this.updateSalonPresence(onlineUser);
      });

      // Conserver soi-même si optimistic local plus frais que la DB (upsert en vol)
      if (this.selfUserId) {
        const localSelf = this.onlineUsers.get(this.selfUserId);
        const dbSelf = next.get(this.selfUserId);
        if (localSelf && (!dbSelf || localSelf.lastSeen > dbSelf.lastSeen)) {
          next.set(this.selfUserId, localSelf);
          this.removeFromSalonPresence(this.selfUserId);
          this.updateSalonPresence(localSelf);
        }
      }

      this.onlineUsers = next;
      this.notifyListeners();
      console.log('[PresenceService] Utilisateurs en ligne chargés:', this.onlineUsers.size);
    } catch (error) {
      console.error('[PresenceService] Erreur lors du chargement de la présence:', error);
    }
  }

  private handlePresenceChange(payload: {
    eventType?: string;
    new?: Record<string, unknown>;
    old?: Record<string, unknown>;
  }): void {
    const eventType = payload.eventType;
    const newRecord = payload.new as
      | {
          user_id: string;
          name: string;
          avatar: string;
          initials: string;
          status?: string | null;
          current_salon_id?: string | null;
          last_seen: string;
        }
      | undefined;
    const oldRecord = payload.old as { user_id?: string } | undefined;

    if (eventType === 'INSERT' || eventType === 'UPDATE') {
      if (!newRecord?.user_id) return;

      if (newRecord.status === 'offline' || newRecord.status === 'invisible') {
        this.onlineUsers.delete(newRecord.user_id);
        this.removeFromSalonPresence(newRecord.user_id);
        this.notifyListeners();
        return;
      }

      const onlineUser = this.toOnlineUser(newRecord);
      if (!onlineUser) {
        this.onlineUsers.delete(newRecord.user_id);
        this.removeFromSalonPresence(newRecord.user_id);
        this.notifyListeners();
        return;
      }

      this.upsertLocalUser(onlineUser);
    } else if (eventType === 'DELETE') {
      const userId = oldRecord?.user_id;
      if (!userId) return;
      this.onlineUsers.delete(userId);
      this.removeFromSalonPresence(userId);
      this.notifyListeners();
    }
  }

  private updateSalonPresence(user: OnlineUser): void {
    if (!user.currentSalonId) return;

    let presence = this.salonPresence.get(user.currentSalonId);

    if (!presence) {
      presence = {
        salonId: user.currentSalonId,
        onlineCount: 0,
        users: [],
      };
      this.salonPresence.set(user.currentSalonId, presence);
    }

    const existingIndex = presence.users.findIndex((u) => u.userId === user.userId);

    if (existingIndex >= 0) {
      presence.users[existingIndex] = user;
    } else {
      presence.users.push(user);
    }

    presence.onlineCount = presence.users.length;
  }

  private removeFromSalonPresence(userId: string): void {
    for (const [salonId, presence] of this.salonPresence.entries()) {
      const index = presence.users.findIndex((u) => u.userId === userId);

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

  async setOnline(
    userId: string,
    salonId?: string,
    userData?: { name?: string; avatar?: string; initials?: string; status?: OnlineUser['status'] },
  ): Promise<void> {
    this.selfUserId = userId;

    if (userData?.status === 'offline') {
      await this.setOffline(userId);
      return;
    }

    const status = userData?.status || 'online';
    if (status === 'invisible') {
      this.onlineUsers.delete(userId);
      this.removeFromSalonPresence(userId);
      this.notifyListeners();
    } else {
      this.upsertLocalUser({
        userId,
        name: userData?.name || userId,
        avatar: userData?.avatar || 'av1',
        initials: userData?.initials || userId.slice(0, 2).toUpperCase(),
        status,
        currentSalonId: salonId || undefined,
        lastSeen: new Date(),
      });
    }

    try {
      const { error } = await supabase.rpc('upsert_own_presence', {
        p_user_id: userId,
        p_name: userData?.name || userId,
        p_avatar: userData?.avatar || 'av1',
        p_initials: userData?.initials || userId.slice(0, 2).toUpperCase(),
        p_status: status === 'invisible' ? 'invisible' : status,
        p_current_salon_id: salonId ?? null,
        p_guest_token: this.guestTokenArg(),
      });

      if (error) {
        console.error('[PresenceService] Erreur lors de la mise en ligne:', error);
      }
    } catch (error) {
      console.error('[PresenceService] Erreur lors de la mise en ligne:', error);
    }
  }

  async updateCurrentSalon(
    userId: string,
    salonId: string | null,
    userData?: { name?: string; avatar?: string; initials?: string; status?: OnlineUser['status'] },
  ): Promise<void> {
    if (userData?.status === 'offline') {
      await this.setOffline(userId);
      return;
    }

    const existing = this.onlineUsers.get(userId);
    const status = userData?.status || existing?.status || 'online';
    const name = userData?.name || existing?.name || userId;
    const avatar = userData?.avatar || existing?.avatar || 'av1';
    const initials = userData?.initials || existing?.initials || userId.slice(0, 2).toUpperCase();

    if (status !== 'invisible') {
      this.upsertLocalUser({
        userId,
        name,
        avatar,
        initials,
        status,
        currentSalonId: salonId || undefined,
        lastSeen: new Date(),
      });
    }

    try {
      const { error } = await supabase.rpc('upsert_own_presence', {
        p_user_id: userId,
        p_name: name,
        p_avatar: avatar,
        p_initials: initials,
        p_status: status === 'invisible' ? 'invisible' : status,
        p_current_salon_id: salonId,
        p_guest_token: this.guestTokenArg(),
      });

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

    if (nextStatus === 'invisible') {
      this.onlineUsers.delete(userId);
      this.removeFromSalonPresence(userId);
      this.notifyListeners();
    } else if (existing) {
      this.upsertLocalUser({ ...existing, status: nextStatus, lastSeen: new Date() });
    }

    try {
      const { error } = await supabase.rpc('touch_own_presence', {
        p_user_id: userId,
        p_status: nextStatus === 'invisible' ? 'invisible' : nextStatus,
        p_current_salon_id: null,
        p_guest_token: this.guestTokenArg(),
      });

      if (error) {
        console.error('Erreur lors de la mise à jour de l’activité:', error);
        // Recréer la ligne si touch échoue (RPC absente / ligne manquante)
        if (existing) {
          await this.setOnline(userId, existing.currentSalonId, {
            name: existing.name,
            avatar: existing.avatar,
            initials: existing.initials,
            status: nextStatus,
          });
        }
      }
    } catch (error) {
      console.error('Erreur lors de la mise à jour de l’activité:', error);
    }
  }

  async updateStatus(
    userId: string,
    status: OnlineUser['status'],
    userData?: { name: string; avatar: string; initials: string },
  ): Promise<void> {
    if (status === 'offline') {
      await this.setOffline(userId);
      return;
    }

    const existing = this.onlineUsers.get(userId);
    if (!existing) {
      await this.setOnline(userId, undefined, { ...userData, status });
      return;
    }

    await this.setOnline(userId, existing.currentSalonId, {
      name: userData?.name || existing.name,
      avatar: userData?.avatar || existing.avatar,
      initials: userData?.initials || existing.initials,
      status,
    });
  }

  /**
   * Marque l'utilisateur comme hors ligne.
   * Ne coupe PAS le channel Realtime (sinon plus de peers jusqu'au prochain login).
   */
  async setOffline(userId: string): Promise<void> {
    this.onlineUsers.delete(userId);
    this.removeFromSalonPresence(userId);
    this.notifyListeners();

    try {
      const { error } = await supabase.rpc('delete_own_presence', {
        p_user_id: userId,
        p_guest_token: this.guestTokenArg(),
      });

      if (error) {
        console.error('Erreur lors de la mise hors ligne:', error);
        // Fallback table delete (auth) si RPC pas encore migrée
        const { error: delErr } = await supabase.from('user_presence').delete().eq('user_id', userId);
        if (delErr) console.error('Erreur delete présence fallback:', delErr);
      }
    } catch (error) {
      console.error('Erreur lors de la mise hors ligne:', error);
    }
  }

  private startCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    this.cleanupInterval = setInterval(() => {
      this.runAutoCleanup();
    }, this.CLEANUP_INTERVAL_MS);
  }

  private startPeriodicRefresh(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }

    this.refreshInterval = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      void this.loadInitialPresence();
    }, this.REFRESH_INTERVAL_MS);

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', this.onVisibilityRefresh);
    }
  }

  private onVisibilityRefresh = (): void => {
    if (typeof document === 'undefined' || document.hidden) return;
    void this.loadInitialPresence();
  };

  private stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.onVisibilityRefresh);
    }
  }

  private runAutoCleanup(): void {
    const removed = this.removeInactiveUsers();
    if (removed > 0) {
      console.log('[PresenceService] Nettoyage des utilisateurs inactifs:', removed);
    }
  }

  getOnlineUsers(): OnlineUser[] {
    return Array.from(this.onlineUsers.values()).filter(
      (u) => u.status !== 'invisible' && u.status !== 'offline' && this.isFresh(u.lastSeen),
    );
  }

  getOnlineUsersInSalon(salonId: string): OnlineUser[] {
    const presence = this.salonPresence.get(salonId);
    return (presence?.users || []).filter(
      (u) => u.status !== 'invisible' && u.status !== 'offline' && this.isFresh(u.lastSeen),
    );
  }

  getOnlineCountInSalon(salonId: string): number {
    return this.getOnlineUsersInSalon(salonId).length;
  }

  getAllSalonPresence(): Map<string, SalonPresence> {
    const map = new Map<string, SalonPresence>();
    for (const [salonId, presence] of this.salonPresence.entries()) {
      const users = presence.users.filter(
        (u) => u.status !== 'invisible' && u.status !== 'offline' && this.isFresh(u.lastSeen),
      );
      if (users.length > 0) {
        map.set(salonId, { salonId, users, onlineCount: users.length });
      }
    }
    return map;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach((listener) => listener());
  }

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

  /** Déconnexion complète (logout) : channel + états locaux */
  disconnect(): void {
    this.stopCleanup();
    if (this.presenceChannel) {
      void supabase.removeChannel(this.presenceChannel);
      this.presenceChannel = null;
    }
    this.selfUserId = null;
    this.onlineUsers.clear();
    this.salonPresence.clear();
    this.listeners.clear();
  }
}

export const presenceService = new PresenceService();
