import { supabase } from './supabase';

export type DmGameType = 'morpion' | 'pfc' | 'reflex';

export type DmGameEventType =
  | 'invite'
  | 'accept'
  | 'decline'
  | 'cancel'
  | 'move'
  | 'state'
  | 'end';

export interface DmGamePayload {
  event: DmGameEventType;
  gameId: string;
  gameType: DmGameType;
  from: string;
  to: string;
  fromId: string;
  /** Données spécifiques au jeu (plateau, choix, temps…) */
  data?: Record<string, unknown>;
  ts: number;
}

type DmGameListener = (payload: DmGamePayload) => void;

export const DM_GAME_LABELS: Record<DmGameType, string> = {
  morpion: 'Morpion',
  pfc: 'Pierre-feuille-ciseaux',
  reflex: 'Réflexe',
};

function channelKey(userId1: string, userId2: string): string {
  return [userId1, userId2].sort().join(':');
}

class DmGameService {
  private channels = new Map<string, ReturnType<typeof supabase.channel>>();
  private listeners = new Map<string, Set<DmGameListener>>();

  private ensureChannel(key: string) {
    if (this.channels.has(key)) return this.channels.get(key)!;

    const channel = supabase
      .channel(`dm-game:${key}`)
      .on('broadcast', { event: 'game' }, ({ payload }) => {
        const data = payload as DmGamePayload;
        for (const listener of this.listeners.get(key) || []) {
          listener(data);
        }
      })
      .subscribe();

    this.channels.set(key, channel);
    return channel;
  }

  private maybeRemoveChannel(key: string): void {
    if ((this.listeners.get(key)?.size ?? 0) > 0) return;
    const channel = this.channels.get(key);
    if (channel) {
      supabase.removeChannel(channel);
      this.channels.delete(key);
    }
    this.listeners.delete(key);
  }

  subscribe(userId1: string, userId2: string, listener: DmGameListener): () => void {
    const key = channelKey(userId1, userId2);
    this.ensureChannel(key);
    if (!this.listeners.has(key)) this.listeners.set(key, new Set());
    this.listeners.get(key)!.add(listener);
    return () => {
      this.listeners.get(key)?.delete(listener);
      this.maybeRemoveChannel(key);
    };
  }

  broadcast(userId1: string, userId2: string, payload: DmGamePayload): void {
    const key = channelKey(userId1, userId2);
    const channel = this.ensureChannel(key);
    void channel.send({ type: 'broadcast', event: 'game', payload });
  }

  newGameId(): string {
    return `g_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  }
}

export const dmGameService = new DmGameService();
