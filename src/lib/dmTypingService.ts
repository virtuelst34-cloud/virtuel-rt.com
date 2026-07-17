import { supabase } from './supabase';

interface DmTypingPayload {
  userId: string;
  userName: string;
  isTyping: boolean;
}

type DmTypingListener = (payload: DmTypingPayload) => void;

function channelName(userId1: string, userId2: string): string {
  return [userId1, userId2].sort().join(':');
}

class DmTypingService {
  private channels = new Map<string, ReturnType<typeof supabase.channel>>();
  private listeners = new Map<string, Set<DmTypingListener>>();

  private ensureChannel(key: string) {
    if (this.channels.has(key)) return this.channels.get(key)!;

    const channel = supabase
      .channel(`dm-typing:${key}`)
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        const data = payload as DmTypingPayload;
        for (const listener of this.listeners.get(key) || []) {
          listener(data);
        }
      })
      .subscribe();

    this.channels.set(key, channel);
    return channel;
  }

  subscribe(userId1: string, userId2: string, listener: DmTypingListener): () => void {
    const key = channelName(userId1, userId2);
    this.ensureChannel(key);
    if (!this.listeners.has(key)) this.listeners.set(key, new Set());
    this.listeners.get(key)!.add(listener);
    return () => {
      this.listeners.get(key)?.delete(listener);
    };
  }

  broadcast(userId1: string, userId2: string, payload: DmTypingPayload): void {
    const key = channelName(userId1, userId2);
    const channel = this.ensureChannel(key);
    void channel.send({ type: 'broadcast', event: 'typing', payload });
  }
}

export const dmTypingService = new DmTypingService();
