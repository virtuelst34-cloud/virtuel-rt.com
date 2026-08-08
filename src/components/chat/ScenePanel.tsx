import React from 'react';
import { Mic, MicOff, MessageSquare, User } from 'lucide-react';
import Avatar from './Avatar';
import SpecialBadgeInline from './SpecialBadgeInline';
import { useUser } from '@/lib/contexts';

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
  onViewProfile?: (name: string) => void;
  onOpenDM?: (name: string) => void;
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

export default function ScenePanel({
  members,
  micActive,
  userMicLevel,
  onViewProfile,
  onOpenDM,
}: ScenePanelProps) {
  const { profiles } = useUser();
  const allMembers = micActive
    ? [...members, { name: 'Vous', avatar: 'av1', initials: 'V', speaking: userMicLevel > 8, micLevel: userMicLevel, isMe: true }]
    : members;

  if (allMembers.length === 0) return null;

  return (
    <div
      className="border-b border-border bg-card/60 px-2.5 sm:px-4 py-1.5 sm:py-3 shrink-0 max-h-[16vh] sm:max-h-[40vh] overflow-y-auto overscroll-contain"
      role="region"
      aria-label="Participants sur scène">
      <div className="text-[9.5px] text-muted-foreground/50 uppercase tracking-widest mb-1.5 sm:mb-2.5 flex items-center gap-1.5">
        <Mic className="w-3 h-3" aria-hidden="true" /> Sur scène ({allMembers.length})
      </div>
      <div className="flex gap-2 sm:gap-3 flex-wrap" role="list" aria-label="Liste des participants">
        {allMembers.map((m, i) => {
          const interactive = !m.isMe && (!!onViewProfile || !!onOpenDM);
          return (
            <div
              key={`${m.name}-${i}`}
              className={`group relative flex flex-col items-center gap-1.5 px-3 py-2 rounded-xl border transition-all ${
                m.speaking ? 'bg-emerald-500/8 border-emerald-500/30' : 'bg-secondary border-border'
              } ${m.isMe ? 'ring-1 ring-primary/40' : interactive ? 'hover:border-primary/40 hover:bg-primary/5' : ''}`}
              role="listitem"
              aria-label={`${m.name}${m.speaking ? ', en train de parler' : ''}${m.isMe ? ', c\'est vous' : ''}`}>
              <button
                type="button"
                disabled={!interactive || !onViewProfile}
                onClick={() => { if (!m.isMe) onViewProfile?.(m.name); }}
                className={`relative ${interactive && onViewProfile ? 'cursor-pointer transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded-full' : 'cursor-default'}`}
                aria-label={m.isMe ? m.name : `Voir le profil de ${m.name}`}
              >
                <Avatar avatarClass={m.avatar} initials={m.initials} size="md" />
                <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-card flex items-center justify-center ${m.speaking ? 'bg-emerald-500' : 'bg-muted-foreground/30'}`}
                  aria-hidden="true">
                  {m.speaking
                    ? <Mic className="w-2 h-2 text-white" aria-hidden="true" />
                    : <MicOff className="w-2 h-2 text-white/60" aria-hidden="true" />
                  }
                </div>
              </button>

              <button
                type="button"
                disabled={!interactive || !onViewProfile}
                onClick={() => { if (!m.isMe) onViewProfile?.(m.name); }}
                className={`text-[10px] font-medium truncate max-w-[72px] inline-flex items-center gap-0.5 ${
                  m.isMe ? 'text-primary cursor-default' : interactive && onViewProfile
                    ? 'text-foreground hover:text-primary cursor-pointer'
                    : 'text-foreground cursor-default'
                }`}
                aria-label={m.isMe ? m.name : `Ouvrir le profil de ${m.name}`}
              >
                <span className="truncate">{m.name}</span>
                {!m.isMe && (
                  <SpecialBadgeInline profile={profiles[m.name]} size="xs" showLabels={false} />
                )}
              </button>

              <VUBar speaking={m.speaking} level={m.micLevel ?? (m.speaking ? userMicLevel : 0)} />

              {interactive && (
                <div className="absolute top-1 right-1 flex gap-0.5 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
                  {onViewProfile && (
                    <button
                      type="button"
                      onClick={() => onViewProfile(m.name)}
                      className="p-1 rounded-md bg-card/90 border border-border text-muted-foreground hover:text-primary hover:bg-primary/10"
                      title="Profil"
                      aria-label={`Profil de ${m.name}`}
                    >
                      <User className="w-3 h-3" />
                    </button>
                  )}
                  {onOpenDM && (
                    <button
                      type="button"
                      onClick={() => onOpenDM(m.name)}
                      className="p-1 rounded-md bg-card/90 border border-border text-muted-foreground hover:text-emerald-400 hover:bg-emerald-500/10"
                      title="Message privé"
                      aria-label={`Envoyer un message à ${m.name}`}
                    >
                      <MessageSquare className="w-3 h-3" />
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
