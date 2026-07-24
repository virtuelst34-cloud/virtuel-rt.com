import { supabase } from './supabase';

const STUN_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

export type WebRtcSignalType = 'offer' | 'answer' | 'ice' | 'leave';

export interface WebRtcSignalPayload {
  type: WebRtcSignalType;
  fromId: string;
  fromName: string;
  toId: string;
  sdp?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
  hasVideo?: boolean;
}

export interface RemoteStreamInfo {
  peerId: string;
  peerName: string;
  stream: MediaStream;
  hasVideo: boolean;
}

type RemoteListener = (info: RemoteStreamInfo) => void;
type RemoteLeaveListener = (peerId: string) => void;

class WebRtcService {
  private localStream: MediaStream | null = null;
  private peers = new Map<string, RTCPeerConnection>();
  private remoteStreams = new Map<string, MediaStream>();
  private channel: ReturnType<typeof supabase.channel> | null = null;
  private salonId: string | null = null;
  private selfId = '';
  private selfName = '';
  private onRemoteStream: RemoteListener | null = null;
  private onRemoteLeave: RemoteLeaveListener | null = null;

  setListeners(onStream: RemoteListener, onLeave: RemoteLeaveListener): void {
    this.onRemoteStream = onStream;
    this.onRemoteLeave = onLeave;
  }

  async joinSalon(
    salonId: string,
    userId: string,
    userName: string,
    options: { audio: boolean; video: boolean },
  ): Promise<MediaStream | null> {
    await this.leaveSalon();

    this.salonId = salonId;
    this.selfId = userId;
    this.selfName = userName;

    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: options.audio,
        video: options.video,
      });
    } catch (error) {
      console.error('WebRTC getUserMedia:', error);
      // Si la caméra échoue, rejoindre en audio puis ajouter la vidéo à part
      if (options.video && options.audio) {
        try {
          this.localStream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: false,
          });
        } catch (audioError) {
          console.error('WebRTC getUserMedia audio fallback:', audioError);
          return null;
        }
      } else {
        return null;
      }
    }

    this.bindChannel(salonId);

    if (options.video) {
      await this.ensureVideoTrack();
    }

    return this.localStream;
  }

  /** Canal de signalisation sans media (réception d'appels DM). */
  async joinSignalOnly(salonId: string, userId: string, userName: string): Promise<void> {
    if (this.salonId === salonId && this.channel) {
      this.selfId = userId;
      this.selfName = userName;
      return;
    }
    await this.leaveSalon();
    this.salonId = salonId;
    this.selfId = userId;
    this.selfName = userName;
    this.bindChannel(salonId);
  }

  private bindChannel(salonId: string): void {
    this.channel = supabase
      .channel(`webrtc:${salonId}`)
      .on('broadcast', { event: 'signal' }, ({ payload }) => {
        void this.handleSignal(payload as WebRtcSignalPayload);
      })
      .subscribe();
  }

  private async ensureLocalMedia(wantVideo: boolean): Promise<boolean> {
    if (this.localStream) {
      if (wantVideo) await this.ensureVideoTrack();
      return true;
    }
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: wantVideo,
      });
      return true;
    } catch (error) {
      console.error('WebRTC ensureLocalMedia:', error);
      return false;
    }
  }

  private async handleSignal(payload: WebRtcSignalPayload): Promise<void> {
    if (!this.salonId || payload.fromId === this.selfId) return;

    // leave est broadcast à tous (toId = '*')
    if (payload.type === 'leave') {
      this.closePeer(payload.fromId);
      return;
    }

    if (payload.toId !== this.selfId) return;

    let pc = this.peers.get(payload.fromId);
    if (!pc && payload.type === 'offer') {
      const ok = await this.ensureLocalMedia(!!payload.hasVideo);
      if (!ok) return;
      pc = this.createPeer(payload.fromId, payload.fromName, false);
      this.peers.set(payload.fromId, pc);
    }
    if (!pc) return;

    try {
      if (payload.type === 'offer' && payload.sdp) {
        await pc.setRemoteDescription(payload.sdp);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        this.sendSignal({
          type: 'answer',
          fromId: this.selfId,
          fromName: this.selfName,
          toId: payload.fromId,
          sdp: answer,
          hasVideo: !!this.localStream?.getVideoTracks().length,
        });
      } else if (payload.type === 'answer' && payload.sdp) {
        await pc.setRemoteDescription(payload.sdp);
      } else if (payload.type === 'ice' && payload.candidate) {
        await pc.addIceCandidate(payload.candidate);
      }
    } catch (error) {
      console.error('WebRTC signal error:', error);
    }
  }

  private createPeer(peerId: string, peerName: string, initiator: boolean): RTCPeerConnection {
    const pc = new RTCPeerConnection({ iceServers: STUN_SERVERS });

    this.localStream?.getTracks().forEach(track => {
      pc.addTrack(track, this.localStream!);
    });

    pc.onicecandidate = (event) => {
      if (!event.candidate) return;
      this.sendSignal({
        type: 'ice',
        fromId: this.selfId,
        fromName: this.selfName,
        toId: peerId,
        candidate: event.candidate.toJSON(),
      });
    };

    pc.ontrack = (event) => {
      const stream = event.streams[0] ?? new MediaStream([event.track]);
      this.remoteStreams.set(peerId, stream);
      this.onRemoteStream?.({
        peerId,
        peerName,
        stream,
        hasVideo: stream.getVideoTracks().length > 0,
      });
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        this.closePeer(peerId);
      }
    };

    if (initiator) {
      void pc.createOffer().then(async (offer) => {
        await pc.setLocalDescription(offer);
        this.sendSignal({
          type: 'offer',
          fromId: this.selfId,
          fromName: this.selfName,
          toId: peerId,
          sdp: offer,
          hasVideo: !!this.localStream?.getVideoTracks().length,
        });
      });
    }

    return pc;
  }

  connectToPeer(peerId: string, peerName: string): void {
    if (!this.channel || !this.localStream) return;
    if (peerId === this.selfId || this.peers.has(peerId)) return;
    const pc = this.createPeer(peerId, peerName, true);
    this.peers.set(peerId, pc);
  }

  getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  isJoined(): boolean {
    return !!this.salonId && !!this.channel;
  }

  async ensureVideoTrack(): Promise<boolean> {
    if (!this.localStream) {
      try {
        this.localStream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: true,
        });
      } catch {
        try {
          this.localStream = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: true,
          });
        } catch (error) {
          console.error('WebRTC ensureVideoTrack (no stream):', error);
          return false;
        }
      }
    }

    const live = this.localStream.getVideoTracks().find((t) => t.readyState === 'live');
    if (live) {
      live.enabled = true;
      return true;
    }

    // Réactiver une piste arrêtée / désactivée si encore présente
    const existing = this.localStream.getVideoTracks()[0];
    if (existing && existing.readyState !== 'ended') {
      existing.enabled = true;
      return true;
    }

    try {
      const videoStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      const track = videoStream.getVideoTracks()[0];
      if (!track) return false;
      this.localStream.addTrack(track);
      await this.renegotiateWithVideo(track);
      return true;
    } catch (error) {
      console.error('WebRTC ensureVideoTrack:', error);
      return false;
    }
  }

  /** Après ajout d'une piste vidéo, renégocie les peers déjà connectés. */
  private async renegotiateWithVideo(track: MediaStreamTrack): Promise<void> {
    if (!this.localStream) return;
    for (const [peerId, pc] of this.peers.entries()) {
      const already = pc.getSenders().some((s) => s.track?.id === track.id);
      if (!already) {
        pc.addTrack(track, this.localStream);
      }
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        this.sendSignal({
          type: 'offer',
          fromId: this.selfId,
          fromName: this.selfName,
          toId: peerId,
          sdp: offer,
          hasVideo: true,
        });
      } catch (error) {
        console.error('WebRTC renegotiate video:', error);
      }
    }
  }

  toggleTrack(kind: 'audio' | 'video', enabled: boolean): void {
    this.localStream?.getTracks()
      .filter(t => t.kind === kind)
      .forEach(t => { t.enabled = enabled; });
  }

  private sendSignal(payload: WebRtcSignalPayload): void {
    if (!this.channel) return;
    void this.channel.send({ type: 'broadcast', event: 'signal', payload });
  }

  private closePeer(peerId: string): void {
    const pc = this.peers.get(peerId);
    if (pc) {
      pc.close();
      this.peers.delete(peerId);
    }
    this.remoteStreams.delete(peerId);
    this.onRemoteLeave?.(peerId);
  }

  async leaveSalon(): Promise<void> {
    if (this.channel && this.salonId) {
      void this.channel.send({
        type: 'broadcast',
        event: 'signal',
        payload: {
          type: 'leave',
          fromId: this.selfId,
          fromName: this.selfName,
          toId: '*',
        } as WebRtcSignalPayload,
      });
      supabase.removeChannel(this.channel);
    }

    for (const peerId of [...this.peers.keys()]) {
      this.closePeer(peerId);
    }

    this.localStream?.getTracks().forEach(t => t.stop());
    this.localStream = null;
    this.channel = null;
    this.salonId = null;
  }
}

export const webrtcService = new WebRtcService();
