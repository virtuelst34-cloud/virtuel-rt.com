import React from 'react';
import { LayoutDashboard } from 'lucide-react';
import { SALONS } from '@/lib/chatConfig';
import Avatar from '../Avatar';
import DiamondBadge from '../DiamondBadge';
import { SectionTitle, StatCard } from './AdminComponents';

interface Props {
  profiles: Record<string, any>;
  customSalons: any[];
  salonMessages: Record<string, any[]>;
  monthlyXP: Record<string, number>;
}

export default function DashboardSection({ profiles, customSalons, salonMessages, monthlyXP }: Props) {
  const all = Object.values(profiles);
  const top = [...all].sort((a, b) => (b.xp || 0) - (a.xp || 0)).slice(0, 5);
  const totalSalons = SALONS.length + (customSalons?.length || 0);
  const totalMessages = Object.values(salonMessages || {}).reduce((acc, msgs) => acc + msgs.length, 0);

  return (
    <div>
      <SectionTitle icon={LayoutDashboard}>Tableau de bord</SectionTitle>
      <div className="grid grid-cols-3 gap-2.5 mb-5">
        <StatCard value={all.length}                                        label="Profils"         color="blue" />
        <StatCard value={all.filter(p => !p.isBanned && !p.isMuted).length} label="Actifs"          color="green" />
        <StatCard value={totalSalons}                                        label="Salons"          color="purple" />
        <StatCard value={totalMessages}                                      label="Messages total"  color="yellow" />
        <StatCard value={all.filter(p => p.isBanned).length}                label="Bannis"          color="red" />
        <StatCard value={all.filter(p => p.isMuted).length}                 label="Mutés"           color="yellow" />
      </div>
      <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-2.5">Top XP</div>
      {top.length === 0 && <p className="text-[11px] text-muted-foreground/40 italic">Aucun profil enregistré.</p>}
      <div className="space-y-1.5">
        {top.map((p, i) => (
          <div key={p.name} className="flex items-center gap-2.5 bg-secondary border border-border rounded-xl px-3 py-2">
            <span className="text-[11px] text-muted-foreground/40 w-4">#{i+1}</span>
            <Avatar avatarClass={p.avatar} initials={p.initials} size="xs" />
            <span className="text-xs text-foreground flex-1 truncate">{p.name}</span>
            <DiamondBadge level={p.level || 1} size="xs" />
            <span className="text-[10px] text-purple-400 font-bold">Nv.{p.level||1}</span>
            <span className="text-[10px] text-muted-foreground/50">{(p.xp||0).toLocaleString()} XP</span>
          </div>
        ))}
      </div>
    </div>
  );
}
