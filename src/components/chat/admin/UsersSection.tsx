import React, { useState } from 'react';
import { Users, Search, Ban, CheckCircle, VolumeX, Volume2, Trash2 } from 'lucide-react';
import { useUser, useModeration } from '@/lib/contexts';
import Avatar from '../Avatar';
import { SectionTitle, StatCard } from './AdminComponents';

const STATUS_OPTIONS = [
  { id: 'online',  label: 'En ligne',       color: 'bg-emerald-500' },
  { id: 'away',    label: 'Absent',         color: 'bg-amber-500' },
  { id: 'busy',    label: 'Ne pas déranger',color: 'bg-red-500' },
  { id: 'offline', label: 'Invisible',      color: 'bg-muted-foreground/40' },
];

export default function UsersSection() {
  const { profiles, setProfiles, setUserStatusAdmin } = useUser();
  const { banUser, unbanUser, muteUser, unmuteUser } = useModeration();
  const [search, setSearch] = useState('');
  const [banReason, setBanReason] = useState<Record<string, string>>({});
  const all = Object.values(profiles).filter(p => !search || p.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <SectionTitle icon={Users}>Gestion des utilisateurs</SectionTitle>
      <div className="grid grid-cols-3 gap-2 mb-4">
        <StatCard value={Object.values(profiles).filter(p => !p.isBanned).length} label="Actifs"  color="green" />
        <StatCard value={Object.values(profiles).filter(p => p.isBanned).length}  label="Bannis"  color="red" />
        <StatCard value={Object.keys(profiles).length}                             label="Total"   color="blue" />
      </div>
      <div className="relative mb-3">
        <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground/40" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un utilisateur..."
          className="w-full bg-secondary border border-border rounded-lg pl-8 pr-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/40 outline-none focus:border-red-500/40" />
      </div>
      {all.length === 0 && <p className="text-xs text-muted-foreground/40 italic">Aucun profil trouvé.</p>}
      <div className="space-y-2 max-h-[340px] overflow-y-auto pr-0.5">
        {all.map(profile => (
          <div key={profile.name} className={`rounded-xl border px-3 py-2.5 ${profile.isBanned ? 'bg-red-500/5 border-red-500/25' : profile.isMuted ? 'bg-amber-500/5 border-amber-500/20' : 'bg-secondary border-border'}`}>
            <div className="flex items-center gap-2 mb-2">
              <Avatar avatarClass={profile.avatar} initials={profile.initials} size="sm" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-medium text-foreground truncate">{profile.name}</span>
                  {profile.isBanned && <span className="text-[9px] bg-red-500/15 text-red-400 border border-red-500/30 rounded px-1.5 py-px">BANNI</span>}
                  {profile.isMuted  && <span className="text-[9px] bg-amber-500/15 text-amber-400 border border-amber-500/30 rounded px-1.5 py-px">MUTÉ</span>}
                </div>
                <div className="text-[10px] text-muted-foreground/50">Nv.{profile.level||1} · {(profile.xp||0).toLocaleString()} XP</div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {!profile.isBanned
                  ? <button onClick={() => banUser(profile.name, banReason[profile.name] || 'Violation des règles')} title="Bannir" className="p-1.5 rounded-lg bg-red-500/15 border border-red-500/30 text-red-400 hover:bg-red-500/25 transition-colors"><Ban className="w-3 h-3" /></button>
                  : <button onClick={() => unbanUser(profile.name)} title="Débannir" className="p-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25 transition-colors"><CheckCircle className="w-3 h-3" /></button>
                }
                {!profile.isMuted
                  ? <button onClick={() => muteUser(profile.name)} title="Muter" className="p-1.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-400 hover:bg-amber-500/25 transition-colors"><VolumeX className="w-3 h-3" /></button>
                  : <button onClick={() => unmuteUser(profile.name)} title="Démuter" className="p-1.5 rounded-lg bg-blue-500/15 border border-blue-500/30 text-blue-400 hover:bg-blue-500/25 transition-colors"><Volume2 className="w-3 h-3" /></button>
                }
                <button onClick={() => { if (!confirm(`Supprimer ${profile.name} ?`)) return; setProfiles(p => { const n={...p}; delete n[profile.name]; return n; }); }}
                  className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-muted-foreground/60 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30 transition-colors"><Trash2 className="w-3 h-3" /></button>
              </div>
            </div>

            {/* Gestion statut */}
            <div className="flex items-center gap-1.5 mb-2">
              <span className="text-[10px] text-muted-foreground/40 mr-1">Statut :</span>
              {STATUS_OPTIONS.map(s => (
                <button key={s.id} onClick={() => setUserStatusAdmin(profile.name, s.id as any)}
                  title={s.label}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] border transition-all ${(profile.status || 'online') === s.id ? 'border-white/30 bg-white/10 text-foreground' : 'border-transparent text-muted-foreground/40 hover:text-muted-foreground/70'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${s.color}`} />{s.label}
                </button>
              ))}
            </div>

            {/* Gestion badges */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-muted-foreground/40 mr-1">Niveau :</span>
              <span className="text-[9px] text-purple-400 font-semibold">Nv.{profile.level || 1}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
