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
      return null;
    }

    this.channel = supabase
      .channel(`webrtc:${salonId}`)
      .on('broadcast', { event: 'signal' }, ({ payload }) => {
        void this.handleSignal(payload as WebRtcSignalPayload);
      })
      .subscribe();

    return this.localStream;
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
    if (!this.localStream) return false;
    if (this.localStream.getVideoTracks().some((t) => t.readyState === 'live')) {
      this.toggleTrack('video', true);
      return true;
    }
    try {
      const videoStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      const track = videoStream.getVideoTracks()[0];
      if (!track) return false;
      this.localStream.addTrack(track);
      for (const pc of this.peers.values()) {
        pc.addTrack(track, this.localStream);
      }
      return true;
    } catch (error) {
      console.error('WebRTC ensureVideoTrack:', error);
      return false;
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
