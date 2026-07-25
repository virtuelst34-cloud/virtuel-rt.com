import { supabase } from './supabase';
import type { ApplauseDetail } from './funFeatures';

interface MicPayload {
  userId: string;
  userName: string;
  micActive: boolean;
  level: number;
}

type MicListener = (payload: MicPayload) => void;
type ApplauseListener = (payload: ApplauseDetail) => void;

/** Cap Realtime mic traffic: ~4 updates/s, skip tiny level deltas. */
const MIC_MIN_INTERVAL_MS = 250;
const MIC_LEVEL_EPSILON = 4;

class MediaBroadcastService {
  private channels = new Map<string, ReturnType<typeof supabase.channel>>();
  private listeners = new Map<string, Set<MicListener>>();
  private applauseListeners = new Map<string, Set<ApplauseListener>>();
  private lastMicSent = new Map<string, { at: number; level: number; micActive: boolean }>();

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
      .on('broadcast', { event: 'applause' }, ({ payload }) => {
        const data = payload as ApplauseDetail;
        for (const listener of this.applauseListeners.get(salonId) || []) {
          listener(data);
        }
      })
      .subscribe();

    this.channels.set(salonId, channel);
    return channel;
  }

  private maybeRemoveChannel(salonId: string): void {
    const micCount = this.listeners.get(salonId)?.size ?? 0;
    const applauseCount = this.applauseListeners.get(salonId)?.size ?? 0;
    if (micCount > 0 || applauseCount > 0) return;

    const channel = this.channels.get(salonId);
    if (channel) {
      supabase.removeChannel(channel);
      this.channels.delete(salonId);
    }
    this.listeners.delete(salonId);
    this.applauseListeners.delete(salonId);
    this.lastMicSent.delete(salonId);
  }

  subscribe(salonId: string, listener: MicListener): () => void {
    this.ensureChannel(salonId);
    if (!this.listeners.has(salonId)) this.listeners.set(salonId, new Set());
    this.listeners.get(salonId)!.add(listener);
    return () => {
      this.listeners.get(salonId)?.delete(listener);
      this.maybeRemoveChannel(salonId);
    };
  }

  subscribeApplause(salonId: string, listener: ApplauseListener): () => void {
    this.ensureChannel(salonId);
    if (!this.applauseListeners.has(salonId)) this.applauseListeners.set(salonId, new Set());
    this.applauseListeners.get(salonId)!.add(listener);
    return () => {
      this.applauseListeners.get(salonId)?.delete(listener);
      this.maybeRemoveChannel(salonId);
    };
  }

  broadcastMic(salonId: string, payload: MicPayload): void {
    const now = Date.now();
    const prev = this.lastMicSent.get(salonId);
    const levelDelta = prev ? Math.abs(payload.level - prev.level) : Infinity;
    const stateChanged = !prev || prev.micActive !== payload.micActive;
    const due = !prev || now - prev.at >= MIC_MIN_INTERVAL_MS;

    // Always flush mic off immediately; otherwise throttle + skip tiny VU noise.
    if (!stateChanged && payload.micActive && (!due || levelDelta < MIC_LEVEL_EPSILON)) {
      return;
    }

    this.lastMicSent.set(salonId, {
      at: now,
      level: payload.level,
      micActive: payload.micActive,
    });

    const channel = this.ensureChannel(salonId);
    void channel.send({ type: 'broadcast', event: 'mic', payload });
  }

  broadcastApplause(salonId: string, payload: ApplauseDetail): void {
    const channel = this.ensureChannel(salonId);
    void channel.send({ type: 'broadcast', event: 'applause', payload });
  }

  dispose(): void {
    for (const channel of this.channels.values()) {
      supabase.removeChannel(channel);
    }
    this.channels.clear();
    this.listeners.clear();
    this.applauseListeners.clear();
    this.lastMicSent.clear();
  }
}

export const mediaBroadcastService = new MediaBroadcastService();
