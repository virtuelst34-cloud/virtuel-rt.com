import React from 'react';
import { Mic, MicOff } from 'lucide-react';
import Avatar from './Avatar';

interface SceneMember {
  name: string;
  avatar: string;
  initials: string;
  speaking: boolean;
  micLevel?: number;
  isMe?: boolean;
}

interface ScenePanelProps {
  salonId: string;
  members: SceneMember[];
  micActive: boolean;
  userMicLevel: number;
}

// Barre VU basée sur le niveau micro réel (0–100)
function VUBar({ speaking, level = 0 }: { speaking: boolean; level?: number }) {
  const normalized = speaking ? Math.min(100, Math.max(0, level)) / 100 : 0;
  const heights = [0.35, 0.55, 0.85, 0.55, 0.35].map(
    factor => Math.round(4 + normalized * 18 * factor)
  );

  return (
    <div className="flex items-end gap-[2px] h-5" aria-hidden="true">
      {heights.map((h, i) => (
        <div key={i}
          className={`w-[3px] rounded-sm transition-all duration-100 ${speaking ? 'bg-emerald-400' : 'bg-muted-foreground/20'}`}
          style={{ height: h }} />
      ))}
    </div>
  );
}

export default function ScenePanel({ members, micActive, userMicLevel }: ScenePanelProps) {
  const allMembers = micActive
    ? [...members, { name: 'Vous', avatar: 'av1', initials: 'V', speaking: userMicLevel > 8, micLevel: userMicLevel, isMe: true }]
    : members;

  if (allMembers.length === 0) return null;

  return (
    <div
      className="border-b border-border bg-card/60 px-4 py-3 shrink-0"
      role="region"
      aria-label="Participants sur scène">
      <div className="text-[9.5px] text-muted-foreground/50 uppercase tracking-widest mb-2.5 flex items-center gap-1.5">
        <Mic className="w-3 h-3" aria-hidden="true" /> Sur scène ({allMembers.length})
      </div>
      <div className="flex gap-3 flex-wrap" role="list" aria-label="Liste des participants">
        {allMembers.map((m, i) => (
          <div key={`${m.name}-${i}`}
            className={`flex flex-col items-center gap-1.5 px-3 py-2 rounded-xl border transition-all ${m.speaking ? 'bg-emerald-500/8 border-emerald-500/30' : 'bg-secondary border-border'} ${m.isMe ? 'ring-1 ring-primary/40' : ''}`}
            role="listitem"
            aria-label={`${m.name}${m.speaking ? ', en train de parler' : ''}${m.isMe ? ', c\'est vous' : ''}`}>
            <div className="relative">
              <Avatar avatarClass={m.avatar} initials={m.initials} size="md" />
              <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-card flex items-center justify-center ${m.speaking ? 'bg-emerald-500' : 'bg-muted-foreground/30'}`}
                aria-label={m.speaking ? 'Microphone activé' : 'Microphone désactivé'}>
                {m.speaking
                  ? <Mic className="w-2 h-2 text-white" aria-hidden="true" />
                  : <MicOff className="w-2 h-2 text-white/60" aria-hidden="true" />
                }
              </div>
            </div>
            <span className={`text-[10px] font-medium truncate max-w-[60px] ${m.isMe ? 'text-primary' : 'text-foreground'}`}>{m.name}</span>
            <VUBar speaking={m.speaking} level={m.micLevel ?? (m.speaking ? userMicLevel : 0)} />
          </div>
        ))}
      </div>
    </div>
  );
}
