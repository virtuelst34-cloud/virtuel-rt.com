import React, { useEffect, useRef } from 'react';
import { webrtcService, RemoteStreamInfo } from '@/lib/webrtcService';

interface Props {
  streams: RemoteStreamInfo[];
}

export default function WebRtcRemotePanel({ streams }: Props) {
  const refs = useRef<Map<string, HTMLVideoElement>>(new Map());

  useEffect(() => {
    for (const info of streams) {
      const el = refs.current.get(info.peerId);
      if (el && el.srcObject !== info.stream) {
        el.srcObject = info.stream;
        void el.play().catch(() => undefined);
      }
    }
  }, [streams]);

  if (streams.length === 0) return null;

  return (
    <div className="flex gap-2 px-4 py-2 border-b border-border bg-card/40 overflow-x-auto shrink-0" data-testid="webrtc-remote-panel">
      {streams.map(info => (
        <div key={info.peerId} className="relative shrink-0 w-32 h-24 rounded-xl overflow-hidden bg-black border border-border">
          <video
            ref={el => { if (el) refs.current.set(info.peerId, el); }}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
          <span className="absolute bottom-1 left-1 text-[9px] bg-black/60 text-white px-1 rounded">
            {info.peerName}{info.hasVideo ? '' : ' 🎤'}
          </span>
        </div>
      ))}
    </div>
  );
}
