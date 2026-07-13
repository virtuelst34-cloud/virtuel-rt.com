import React from 'react';
import { Gavel, Ban, CheckCircle, VolumeX, Volume2 } from 'lucide-react';
import Avatar from '../Avatar';
import { SectionTitle } from './AdminComponents';

interface Props {
  readOnly?: boolean;
  profiles: Record<string, any>;
  unbanUser: (name: string) => void;
  unmuteUser: (name: string) => void;
}

export default function ModerationSection({ readOnly = false, profiles, unbanUser, unmuteUser }: Props) {
  const banned = Object.values(profiles || {}).filter(p => p.isBanned);
  const muted  = Object.values(profiles || {}).filter(p => p.isMuted);

  return (
    <div>
      <SectionTitle icon={Gavel}>Résumé de modération</SectionTitle>

      <div className="mb-5">
        <div className="text-[11px] font-semibold text-red-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
          <Ban className="w-3.5 h-3.5" /> Bannis ({banned.length})
        </div>
        {banned.length === 0
          ? <p className="text-[11px] text-muted-foreground/40 italic">Aucun utilisateur banni.</p>
          : banned.map(p => (
            <div key={p.name} className="flex items-center gap-2.5 bg-red-500/5 border border-red-500/20 rounded-xl px-3 py-2 mb-1.5">
              <Avatar avatarClass={p.avatar} initials={p.initials} size="xs" />
              <div className="flex-1 min-w-0">
                <span className="text-xs font-medium text-foreground">{p.name}</span>
                {p.banReason && <span className="text-[10px] text-red-400/70 ml-2">· {p.banReason}</span>}
              </div>
              <button
                onClick={() => !readOnly && unbanUser(p.name)}
                disabled={readOnly}
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] hover:bg-emerald-500/25 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <CheckCircle className="w-3 h-3" /> Débannir
              </button>
            </div>
          ))
        }
      </div>

      <div>
        <div className="text-[11px] font-semibold text-amber-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
          <VolumeX className="w-3.5 h-3.5" /> Mutés ({muted.length})
        </div>
        {muted.length === 0
          ? <p className="text-[11px] text-muted-foreground/40 italic">Aucun utilisateur muté.</p>
          : muted.map(p => (
            <div key={p.name} className="flex items-center gap-2.5 bg-amber-500/5 border border-amber-500/20 rounded-xl px-3 py-2 mb-1.5">
              <Avatar avatarClass={p.avatar} initials={p.initials} size="xs" />
              <span className="text-xs font-medium text-foreground flex-1">{p.name}</span>
              <button
                onClick={() => !readOnly && unmuteUser(p.name)}
                disabled={readOnly}
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-500/15 border border-blue-500/30 text-blue-400 text-[10px] hover:bg-blue-500/25 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <Volume2 className="w-3 h-3" /> Démuter
              </button>
            </div>
          ))
        }
      </div>
    </div>
  );
}
