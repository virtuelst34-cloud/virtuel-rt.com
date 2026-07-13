import { supabase } from './supabase';

interface MicPayload {
  userId: string;
  userName: string;
  micActive: boolean;
  level: number;
}

type MicListener = (payload: MicPayload) => void;

class MediaBroadcastService {
  private channels = new Map<string, ReturnType<typeof supabase.channel>>();
  private listeners = new Map<string, Set<MicListener>>();

  private ensureChannel(salonId: string) {
    if (this.channels.has(salonId)) return this.channels.get(salonId)!;

    const channel = supabase
      .channel(`media:${salonId}`)
      .on('broadcast', { event: 'mic' }, ({ payload }) => {
        const data = payload as MicPayload;
        for (const listener of this.listeners.get(salonId) || []) {
          listener(data);
        }
      })
      .subscribe();

    this.channels.set(salonId, channel);
    return channel;
  }

  subscribe(salonId: string, listener: MicListener): () => void {
    this.ensureChannel(salonId);
    if (!this.listeners.has(salonId)) this.listeners.set(salonId, new Set());
    this.listeners.get(salonId)!.add(listener);
    return () => {
      this.listeners.get(salonId)?.delete(listener);
    };
  }

  broadcastMic(salonId: string, payload: MicPayload): void {
    const channel = this.ensureChannel(salonId);
    void channel.send({ type: 'broadcast', event: 'mic', payload });
  }

  dispose(): void {
    for (const channel of this.channels.values()) {
      supabase.removeChannel(channel);
    }
    this.channels.clear();
    this.listeners.clear();
  }
}

export const mediaBroadcastService = new MediaBroadcastService();
