import React, { useEffect, useState } from 'react';
import { BarChart2 } from 'lucide-react';
import { SALONS } from '@/lib/chatConfig';
import { presenceService } from '@/lib/presenceService';
import { supabaseDbService } from '@/lib/supabaseDb';
import { SectionTitle, StatCard } from './AdminComponents';

interface Props {
  profiles: Record<string, any>;
  customSalons: any[];
  salonMessages: Record<string, any[]>;
  monthlyXP: Record<string, number>;
}

export default function StatsSection({ profiles, customSalons, salonMessages, monthlyXP }: Props) {
  const [dbMessageCounts, setDbMessageCounts] = useState<Record<string, number> | null>(null);

  const all = Object.values(profiles || {});
  const totalSalons = SALONS.length + (customSalons?.length || 0);
  const allSalons = [...SALONS, ...(customSalons || [])];

  useEffect(() => {
    const salonIds = allSalons.map(s => s.id);
    void supabaseDbService.getMessageCountsBySalon(salonIds).then(setDbMessageCounts);
  }, [customSalons?.length]);

  // Messages par salon (comptage DB si disponible, sinon messages chargés en mémoire)
  const salonStats = allSalons.map(s => ({
    name: s.name,
    count: dbMessageCounts?.[s.id] ?? (salonMessages?.[s.id] || []).length,
  })).sort((a, b) => b.count - a.count);

  // Classement mensuel
  const monthlyRanked = Object.entries(monthlyXP || {})
    .map(([name, xp]) => ({ name, xp }))
    .sort((a, b) => b.xp - a.xp)
    .slice(0, 5);

  const totalMessages = salonStats.reduce((acc, s) => acc + s.count, 0);
  const avgLevel = all.length ? Math.round(all.reduce((acc, p) => acc + (p.level || 1), 0) / all.length) : 0;
  const premiumCount = all.filter(p => p.isPremium).length;
  const totalXP = all.reduce((acc, p) => acc + (p.xp || 0), 0);
  const onlineUsers = presenceService.getOnlineUsers().length;
  const activeUsers = all.filter(p => !p.isBanned && !p.isMuted).length;

  return (
    <div>
      <SectionTitle icon={BarChart2}>Statistiques détaillées</SectionTitle>

      {/* Statistiques générales */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6">
        <StatCard value={all.length}        label="Profils"         color="blue" />
        <StatCard value={onlineUsers}      label="En ligne"        color="green" />
        <StatCard value={activeUsers}      label="Actifs"          color="emerald" />
        <StatCard value={premiumCount}     label="Premium"         color="yellow" />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6">
        <StatCard value={totalMessages.toLocaleString()}  label="Messages"        color="purple" />
        <StatCard value={totalXP.toLocaleString()}        label="XP total"        color="amber" />
        <StatCard value={avgLevel}                       label="Niveau moyen"    color="indigo" />
        <StatCard value={totalSalons}                    label="Salons"          color="pink" />
      </div>

      {/* Messages par salon */}
      <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-2.5">Messages par salon</div>
      <div className="space-y-1.5 mb-6">
        {salonStats.map(s => (
          <div key={s.name} className="flex items-center justify-between bg-secondary border border-border rounded-xl px-3 py-2">
            <span className="text-xs text-foreground truncate flex-1 mr-2">{s.name}</span>
            <span className="text-[10px] text-purple-400 font-bold shrink-0">{s.count} msgs</span>
          </div>
        ))}
      </div>

      {/* Classement mensuel */}
      <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-2.5">Top XP mensuel</div>
      <div className="space-y-1.5">
        {monthlyRanked.length === 0 && <p className="text-[11px] text-muted-foreground/40 italic">Aucune activité ce mois.</p>}
        {monthlyRanked.map((r, i) => (
          <div key={r.name} className="flex items-center justify-between bg-secondary border border-border rounded-xl px-3 py-2">
            <span className="text-xs text-foreground truncate flex-1 mr-2">{r.name}</span>
            <span className="text-[10px] text-purple-400 font-bold shrink-0">{r.xp.toLocaleString()} XP</span>
          </div>
        ))}
      </div>
    </div>
  );
}
