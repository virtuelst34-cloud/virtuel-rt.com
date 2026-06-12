import React, { useState } from 'react';
import { Award, Search, CheckCircle } from 'lucide-react';
import { useUser } from '@/lib/contexts';
import { SPECIAL_BADGES } from '@/lib/diamondBadges';
import Avatar from '../Avatar';
import { SectionTitle } from './AdminComponents';

export default function SpecialBadgesSection() {
  const { profiles, setProfiles } = useUser();
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const all = Object.values(profiles).filter(p => !search || p.name.toLowerCase().includes(search.toLowerCase()));

  const toggleSpecialBadge = (userName: string, badgeId: string) => {
    setProfiles(prev => {
      const user = prev[userName];
      if (!user) return prev;
      const currentBadges = (user as any).specialBadges || [];
      const newBadges = currentBadges.includes(badgeId)
        ? currentBadges.filter((b: string) => b !== badgeId)
        : [...currentBadges, badgeId];
      return { ...prev, [userName]: { ...user, specialBadges: newBadges } as any };
    });
  };

  return (
    <div>
      <SectionTitle icon={Award}>Badges spéciaux</SectionTitle>
      <p className="text-[11px] text-muted-foreground/50 mb-4">Assignez des badges spéciaux (fondateur, modérateur, VIP) aux utilisateurs.</p>

      {/* Liste des badges spéciaux disponibles */}
      <div className="flex flex-wrap gap-2 mb-5 p-3 bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-xl">
        {SPECIAL_BADGES.map(badge => (
          <span key={badge.id} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[11px] font-semibold"
            style={{ color: badge.color, borderColor: badge.color + '40', background: badge.color + '15' }}>
            <span className="text-sm">{badge.icon}</span>
            {badge.label}
          </span>
        ))}
      </div>

      {/* Recherche utilisateur */}
      <div className="relative mb-4">
        <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground/40" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un utilisateur..."
          className="w-full bg-secondary border border-border rounded-lg pl-8 pr-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/40 outline-none focus:border-red-500/40" />
      </div>

      {all.length === 0 && <p className="text-xs text-muted-foreground/40 italic">Aucun profil trouvé.</p>}

      <div className="space-y-2 max-h-[400px] overflow-y-auto pr-0.5">
        {all.map(profile => (
          <div key={profile.name} className="bg-secondary border border-border rounded-xl px-3 py-2.5">
            <div className="flex items-center gap-2 mb-2">
              <Avatar avatarClass={profile.avatar} initials={profile.initials} size="sm" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-medium text-foreground truncate">{profile.name}</span>
                  {((profile as any).specialBadges || []).map((badgeId: string) => {
                    const badge = SPECIAL_BADGES.find(b => b.id === badgeId);
                    return badge ? <span key={badgeId} className="text-sm" title={badge.label}>{badge.icon}</span> : null;
                  })}
                </div>
                <div className="text-[10px] text-muted-foreground/50">Nv.{profile.level||1} · {(profile.xp||0).toLocaleString()} XP</div>
              </div>
            </div>

            {/* Boutons d'assignation */}
            <div className="flex gap-1.5 flex-wrap">
              {SPECIAL_BADGES.map(badge => {
                const hasBadge = ((profile as any).specialBadges || []).includes(badge.id);
                return (
                  <button
                    key={badge.id}
                    onClick={() => toggleSpecialBadge(profile.name, badge.id)}
                    className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-medium transition-all ${
                      hasBadge
                        ? 'bg-primary/20 border border-primary/40 text-primary'
                        : 'bg-white/5 border border-white/10 text-muted-foreground/60 hover:bg-white/10'
                    }`}
                  >
                    <span>{badge.icon}</span>
                    {badge.label}
                    {hasBadge && <CheckCircle className="w-3 h-3" />}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
