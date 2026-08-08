import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, MicOff, Video, VideoOff, PhoneOff } from 'lucide-react';
import { toast } from 'sonner';
import { useUser, useSalons } from '@/lib/contexts';
import { SALONS } from '@/lib/chatConfig';
import { mediaBroadcastService } from '@/lib/mediaBroadcastService';
import { webrtcService, RemoteStreamInfo } from '@/lib/webrtcService';
import { presenceService } from '@/lib/presenceService';

interface MediaBarProps {
  onMicChange?: (active: boolean, level: number) => void;
  onRemoteStreams?: (streams: RemoteStreamInfo[]) => void;
}

function isMediaSalonType(type?: string): boolean {
  return type === 'vocal' || type === 'chat vocal' || type === 'video';
}

export default function MediaBar({ onMicChange, onRemoteStreams }: MediaBarProps) {
  const { user } = useUser();
  const { currentSalon, setCurrentSalon, customSalons = [] } = useSalons();
  const [micActive, setMicActive] = useState(false);
  const [camActive, setCamActive] = useState(false);
  const [bars, setBars] = useState([3, 5, 7, 5, 3]);
  const [remoteStreams, setRemoteStreams] = useState<RemoteStreamInfo[]>([]);

  const streamRef = useRef<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const isRequestingRef = useRef(false);
  const webrtcJoinedRef = useRef(false);

  const allSalons = [...SALONS, ...(customSalons || [])];
  const salon = allSalons.find((s) => s.id === currentSalon);
  const mediaSalon = isMediaSalonType(salon?.type);

  useEffect(() => {
    webrtcService.setListeners(
      (info) => {
        setRemoteStreams((prev) => {
          const next = prev.filter((s) => s.peerId !== info.peerId);
          next.push(info);
          return next;
        });
      },
      (peerId) => {
        setRemoteStreams((prev) => prev.filter((s) => s.peerId !== peerId));
      },
    );
  }, []);

  useEffect(() => {
    onRemoteStreams?.(remoteStreams);
  }, [remoteStreams, onRemoteStreams]);

  // Aperçu local de la caméra
  useEffect(() => {
    const el = localVideoRef.current;
    if (!el) return;
    if (camActive && streamRef.current) {
      el.srcObject = streamRef.current;
      void el.play().catch(() => undefined);
    } else {
      el.srcObject = null;
    }
  }, [camActive]);

  const ensureWebRtc = useCallback(async (wantVideo: boolean) => {
    if (!currentSalon || !user?.name) {
      throw new Error('not ready');
    }
    if (webrtcJoinedRef.current && webrtcService.isJoined()) {
      if (wantVideo) {
        const ok = await webrtcService.ensureVideoTrack();
        if (!ok) throw new Error('no video');
      }
      streamRef.current = webrtcService.getLocalStream();
      return;
    }
    const stream = await webrtcService.joinSalon(
      currentSalon,
      user.id || user.name,
      user.name,
      { audio: true, video: wantVideo },
    );
    if (!stream) throw new Error('join failed');
    streamRef.current = stream;
    webrtcJoinedRef.current = true;
    if (wantVideo && !stream.getVideoTracks().some((t) => t.readyState === 'live')) {
      const ok = await webrtcService.ensureVideoTrack();
      if (!ok) throw new Error('no video');
      streamRef.current = webrtcService.getLocalStream();
    }
  }, [currentSalon, user]);

  const startVU = useCallback((stream: MediaStream) => {
    const audioTracks = stream.getAudioTracks();
    if (!audioTracks.length) return;

    const ctx = new (window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext!)();
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 32;
    source.connect(analyser);
    audioCtxRef.current = ctx;
    analyserRef.current = analyser;

    const data = new Uint8Array(analyser.frequencyBinCount);
    const tick = () => {
      analyser.getByteFrequencyData(data);
      const b = [
        Math.max(3, (data[1] / 255) * 22),
        Math.max(4, (data[2] / 255) * 28),
        Math.max(6, (data[3] / 255) * 32),
        Math.max(4, (data[4] / 255) * 28),
        Math.max(3, (data[5] / 255) * 22),
      ];
      setBars(b);
      const level = data.reduce((s, v) => s + v, 0) / data.length;
      onMicChange?.(true, level);
      if (currentSalon && user?.name) {
        mediaBroadcastService.broadcastMic(currentSalon, {
          userId: user.id || user.name,
          userName: user.name,
          micActive: true,
          level,
        });
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [onMicChange, currentSalon, user]);

  const stopVU = useCallback(() => {
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    if (audioCtxRef.current) { audioCtxRef.current.close(); audioCtxRef.current = null; }
    setBars([3, 5, 7, 5, 3]);
    onMicChange?.(false, 0);
    if (currentSalon && user?.name) {
      mediaBroadcastService.broadcastMic(currentSalon, {
        userId: user.id || user.name,
        userName: user.name,
        micActive: false,
        level: 0,
      });
    }
  }, [onMicChange, currentSalon, user]);

  useEffect(() => {
    if (!mediaSalon) {
      if (webrtcJoinedRef.current) {
        webrtcJoinedRef.current = false;
        void webrtcService.leaveSalon();
        setRemoteStreams([]);
        setMicActive(false);
        setCamActive(false);
        stopVU();
      }
    }
  }, [mediaSalon, stopVU]);

  useEffect(() => {
    if (!mediaSalon || !currentSalon || !user?.name || (!micActive && !camActive)) return;
    if (!webrtcService.isJoined()) return;

    const peers = presenceService
      .getOnlineUsersInSalon(currentSalon)
      .filter((u) => u.name !== user.name);

    for (const peer of peers) {
      webrtcService.connectToPeer(peer.userId || peer.name, peer.name);
    }
  }, [currentSalon, mediaSalon, user?.name, micActive, camActive]);

  const toggleMic = async () => {
    if (!mediaSalon) {
      toast.message('Rejoins un salon vocal ou vidéo pour utiliser le micro.');
      return;
    }
    if (isRequestingRef.current) return;
    if (micActive) {
      webrtcService.toggleTrack('audio', false);
      stopVU();
      setMicActive(false);
    } else {
      isRequestingRef.current = true;
      try {
        await ensureWebRtc(camActive);
        webrtcService.toggleTrack('audio', true);
        const stream = webrtcService.getLocalStream() || await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
        setMicActive(true);
        startVU(stream);
      } catch {
        toast.error('Impossible d\'accéder au microphone. Vérifie les permissions du navigateur.');
      } finally {
        isRequestingRef.current = false;
      }
    }
  };

  const toggleCam = async () => {
    if (!mediaSalon) {
      toast.message('Rejoins un salon vocal ou vidéo (ex. Caméras live) pour utiliser la caméra.');
      return;
    }
    if (isRequestingRef.current) return;
    if (camActive) {
      webrtcService.toggleTrack('video', false);
      setCamActive(false);
    } else {
      isRequestingRef.current = true;
      try {
        await ensureWebRtc(true);
        const ok = await webrtcService.ensureVideoTrack();
        const stream = webrtcService.getLocalStream();
        const hasVideo = !!stream?.getVideoTracks().some((t) => t.readyState === 'live');
        if (!ok && !hasVideo) {
          throw new Error('no video');
        }
        webrtcService.toggleTrack('video', true);
        if (stream) streamRef.current = stream;
        setCamActive(true);
        toast.success('Caméra activée');
        if (micActive && stream?.getAudioTracks().length) startVU(stream);
      } catch {
        toast.error('Impossible d\'accéder à la caméra. Autorise l\'accès dans le navigateur.');
      } finally {
        isRequestingRef.current = false;
      }
    }
  };

  const handleLeave = async () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    stopVU();
    setMicActive(false);
    setCamActive(false);
    webrtcJoinedRef.current = false;
    await webrtcService.leaveSalon();
    setRemoteStreams([]);
    setCurrentSalon(null);
  };

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      stopVU();
      void webrtcService.leaveSalon();
    };
  }, [stopVU]);

  if (!currentSalon) return null;
  // Salons texte : pas de barre média (le retour se fait via le header).
  // Évite de pousser la zone d’écriture hors écran sur téléphone.
  if (!mediaSalon) return null;

  return (
    <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-1.5 sm:py-2 bg-card border-t border-border shrink-0" data-testid="media-bar">
      <button
        type="button"
        onClick={toggleMic}
        title={mediaSalon ? (micActive ? 'Couper le micro' : 'Activer le micro') : 'Salon vocal/vidéo requis'}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${micActive ? 'bg-emerald-500/15 border-emerald-500/60 text-emerald-400' : 'bg-secondary border-border text-muted-foreground/60 hover:bg-secondary/80'}`}
      >
        {micActive ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />}
        <span className="hidden sm:inline">{micActive ? 'Micro actif' : 'Micro'}</span>
      </button>

      <div className={`flex items-end gap-[2px] h-5 transition-opacity ${micActive ? 'opacity-100' : 'opacity-20'}`}>
        {bars.map((h, i) => (
          <div
            key={i}
            className={`w-[3px] rounded-sm transition-all duration-75 ${micActive ? 'bg-emerald-400' : 'bg-muted-foreground/40'}`}
            style={{ height: Math.round(h) }}
          />
        ))}
      </div>

      <button
        type="button"
        onClick={toggleCam}
        title={mediaSalon ? (camActive ? 'Couper la caméra' : 'Activer la caméra') : 'Salon vocal/vidéo requis'}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${camActive ? 'bg-blue-500/15 border-blue-500/60 text-blue-400' : 'bg-secondary border-border text-muted-foreground/60 hover:bg-secondary/80'}`}
      >
        {camActive ? <Video className="w-3.5 h-3.5" /> : <VideoOff className="w-3.5 h-3.5" />}
        <span className="hidden sm:inline">{camActive ? 'Caméra active' : 'Caméra'}</span>
      </button>

      {camActive && (
        <div className="relative w-16 h-12 rounded-lg overflow-hidden border border-blue-500/40 bg-black shrink-0">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover mirror"
            style={{ transform: 'scaleX(-1)' }}
          />
        </div>
      )}

      <div className="flex-1" />

      <button
        type="button"
        onClick={handleLeave}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-500/40 bg-red-500/10 text-red-400 text-xs font-medium hover:bg-red-500/20 transition-colors"
      >
        <PhoneOff className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Quitter</span>
      </button>
    </div>
  );
}
