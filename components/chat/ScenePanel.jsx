import React, { useEffect, useState } from 'react';
import { Mic, MicOff } from 'lucide-react';
import Avatar from './Avatar';
import { AVATAR_STYLES } from '@/lib/chatConfig';

// Barre VU animée pour un membre qui parle
function VUBar({ speaking }) {
  const [bars, setBars] = useState([3, 5, 7, 5, 3]);

  useEffect(() => {
    if (!speaking) { setBars([3, 5, 7, 5, 3]); return; }
    const id = setInterval(() => {
      setBars([
        Math.floor(Math.random() * 10) + 3,
        Math.floor(Math.random() * 14) + 4,
        Math.floor(Math.random() * 18) + 6,
        Math.floor(Math.random() * 14) + 4,
        Math.floor(Math.random() * 10) + 3,
      ]);
    }, 120);
    return () => clearInterval(id);
  }, [speaking]);

  return (
    <div className="flex items-end gap-[2px] h-5">
      {bars.map((h, i) => (
        <div key={i}
          className={`w-[3px] rounded-sm transition-all duration-100 ${speaking ? 'bg-emerald-400' : 'bg-muted-foreground/20'}`}
          style={{ height: h }} />
      ))}
    </div>
  );
}

export default function ScenePanel({ salonId, members, micActive, userMicLevel }) {
  // Ajouter l'utilisateur courant si son micro est actif
  const allMembers = micActive
    ? [...members, { name: 'Vous', avatar: 'av1', initials: 'V', speaking: true, isMe: true }]
    : members;

  if (allMembers.length === 0) return null;

  return (
    <div className="border-b border-border bg-card/60 px-4 py-3 shrink-0">
      <div className="text-[9.5px] text-muted-foreground/50 uppercase tracking-widest mb-2.5 flex items-center gap-1.5">
        <Mic className="w-3 h-3" /> Sur scène ({allMembers.length})
      </div>
      <div className="flex gap-3 flex-wrap">
        {allMembers.map((m, i) => (
          <div key={`${m.name}-${i}`}
            className={`flex flex-col items-center gap-1.5 px-3 py-2 rounded-xl border transition-all ${m.speaking ? 'bg-emerald-500/8 border-emerald-500/30' : 'bg-secondary border-border'} ${m.isMe ? 'ring-1 ring-primary/40' : ''}`}>
            <div className="relative">
              <Avatar avatarClass={m.avatar} initials={m.initials} size="md" />
              <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-card flex items-center justify-center ${m.speaking ? 'bg-emerald-500' : 'bg-muted-foreground/30'}`}>
                {m.speaking
                  ? <Mic className="w-2 h-2 text-white" />
                  : <MicOff className="w-2 h-2 text-white/60" />
                }
              </div>
            </div>
            <span className={`text-[10px] font-medium truncate max-w-[60px] ${m.isMe ? 'text-primary' : 'text-foreground'}`}>{m.name}</span>
            <VUBar speaking={m.speaking} />
          </div>
        ))}
      </div>
    </div>
  );
}
