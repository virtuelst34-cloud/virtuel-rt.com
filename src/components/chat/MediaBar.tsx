import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, MicOff, Video, VideoOff, PhoneOff } from 'lucide-react';
import { toast } from 'sonner';
import { useChat } from '@/lib/contexts';

interface MediaBarProps {
  onMicChange?: (active: boolean, level: number) => void;
}

export default function MediaBar({ onMicChange }: MediaBarProps) {
  const { currentSalon, setCurrentSalon } = useChat();
  const [micActive, setMicActive]   = useState(false);
  const [camActive, setCamActive]   = useState(false);
  const [bars, setBars]             = useState([3, 5, 7, 5, 3]);

  const streamRef       = useRef<MediaStream | null>(null);
  const audioCtxRef     = useRef<AudioContext | null>(null);
  const analyserRef     = useRef<AnalyserNode | null>(null);
  const rafRef          = useRef<number | null>(null);
  const isRequestingRef = useRef(false); // évite les doubles appels getUserMedia

  // Anime les barres VU depuis l'analyser Web Audio
  const startVU = useCallback((stream: MediaStream) => {
    const ctx      = new (window.AudioContext || (window as any).webkitAudioContext)();
    const source   = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 32;
    source.connect(analyser);
    audioCtxRef.current  = ctx;
    analyserRef.current  = analyser;

    const data = new Uint8Array(analyser.frequencyBinCount);
    const tick = () => {
      analyser.getByteFrequencyData(data);
      // Prendre 5 bandes représentatives
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
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [onMicChange]);

  const stopVU = useCallback(() => {
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    if (audioCtxRef.current) { audioCtxRef.current.close(); audioCtxRef.current = null; }
    setBars([3, 5, 7, 5, 3]);
    onMicChange?.(false, 0);
  }, [onMicChange]);

  const toggleMic = async () => {
    if (isRequestingRef.current) return;
    if (micActive) {
      streamRef.current?.getAudioTracks().forEach(t => t.stop());
      stopVU();
      setMicActive(false);
    } else {
      isRequestingRef.current = true;
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (streamRef.current) {
          stream.getAudioTracks().forEach(t => streamRef.current!.addTrack(t));
        } else {
          streamRef.current = stream;
        }
        setMicActive(true);
        startVU(streamRef.current);
      } catch {
        toast.error('Impossible d\'accéder au microphone.');
      } finally {
        isRequestingRef.current = false;
      }
    }
  };

  const toggleCam = async () => {
    if (isRequestingRef.current) return;
    if (camActive) {
      streamRef.current?.getVideoTracks().forEach(t => t.stop());
      setCamActive(false);
    } else {
      isRequestingRef.current = true;
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (streamRef.current) {
          stream.getVideoTracks().forEach(t => streamRef.current!.addTrack(t));
        } else {
          streamRef.current = stream;
        }
        setCamActive(true);
      } catch {
        toast.error('Impossible d\'accéder à la caméra.');
      } finally {
        isRequestingRef.current = false;
      }
    }
  };

  const handleLeave = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    stopVU();
    setMicActive(false);
    setCamActive(false);
    setCurrentSalon(null);
  };

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach(t => t.stop());
      stopVU();
    };
  }, [stopVU]);

  if (!currentSalon) return null;

  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-card border-t border-border shrink-0">

      {/* Bouton micro */}
      <button onClick={toggleMic}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${micActive ? 'bg-emerald-500/15 border-emerald-500/60 text-emerald-400' : 'bg-secondary border-border text-muted-foreground/60 hover:bg-secondary/80'}`}>
        {micActive ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />}
        <span className="hidden sm:inline">{micActive ? 'Micro actif' : 'Micro'}</span>
      </button>

      {/* VU-mètre */}
      <div className={`flex items-end gap-[2px] h-5 transition-opacity ${micActive ? 'opacity-100' : 'opacity-20'}`}>
        {bars.map((h, i) => (
          <div key={i}
            className={`w-[3px] rounded-sm transition-all duration-75 ${micActive ? 'bg-emerald-400' : 'bg-muted-foreground/40'}`}
            style={{ height: Math.round(h) }} />
        ))}
      </div>

      {/* Bouton caméra */}
      <button onClick={toggleCam}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${camActive ? 'bg-blue-500/15 border-blue-500/60 text-blue-400' : 'bg-secondary border-border text-muted-foreground/60 hover:bg-secondary/80'}`}>
        {camActive ? <Video className="w-3.5 h-3.5" /> : <VideoOff className="w-3.5 h-3.5" />}
        <span className="hidden sm:inline">{camActive ? 'Caméra active' : 'Caméra'}</span>
      </button>

      <div className="flex-1" />

      {/* Quitter le salon */}
      <button onClick={handleLeave}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-500/40 bg-red-500/10 text-red-400 text-xs font-medium hover:bg-red-500/20 transition-colors">
        <PhoneOff className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Quitter</span>
      </button>
    </div>
  );
}
