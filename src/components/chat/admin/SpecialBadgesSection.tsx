import React, { useState, useEffect } from 'react';
import { Award, Search, CheckCircle } from 'lucide-react';
import { SPECIAL_BADGES } from '@/lib/diamondBadges';
import Avatar from '../Avatar';
import { SectionTitle } from './AdminComponents';
import { supabase } from '@/lib/supabase';
import {
  badgesFromProfile,
  mapSupabaseProfile,
  profileFlagsFromBadges,
} from '@/lib/utils/profileBadges';
import { UserProfile as SupabaseUserProfile } from '@/lib/supabaseAuth';

interface Props {
  readOnly?: boolean;
  profiles: Record<string, any>;
  setProfiles: React.Dispatch<React.SetStateAction<Record<string, any>>>;
}

export default function SpecialBadgesSection({ readOnly = false, profiles, setProfiles }: Props) {
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    const loadProfiles = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .order('name');

        if (error) throw error;

        if (data) {
          setProfiles(prev => {
            const next = { ...prev };
            for (const row of data) {
              const mapped = mapSupabaseProfile(row as SupabaseUserProfile);
              next[mapped.name] = { ...next[mapped.name], ...mapped };
            }
            return next;
          });
        }
      } catch (error) {
        console.error('Erreur chargement profils pour badges:', error);
      } finally {
        setLoading(false);
      }
    };

    void loadProfiles();
  }, [setProfiles]);

  const toggleSpecialBadge = async (userName: string, badgeId: string) => {
    if (readOnly) return;

    const profile = profiles[userName];
    if (!profile) return;

    const currentBadges = profile.specialBadges || [];
    const newBadges = currentBadges.includes(badgeId)
      ? currentBadges.filter((b) => b !== badgeId)
      : [...currentBadges, badgeId];

    const previousProfile = profile;
    const optimistic = {
      ...profile,
      ...profileFlagsFromBadges(newBadges),
      specialBadges: newBadges,
      isFounder: newBadges.includes('founder'),
      isDirection: newBadges.includes('direction'),
      isMasterOp: newBadges.includes('master_op'),
      isIridescent: newBadges.includes('iridescent'),
      isAdmin:
        newBadges.includes('founder') ||
        newBadges.includes('direction') ||
        newBadges.includes('master_op') ||
        profile.isAdmin,
    };

    setProfiles(prev => ({ ...prev, [userName]: optimistic }));
    setSaving(userName);

    try {
      const { error } = await supabase
        .from('profiles')
        .update(profileFlagsFromBadges(newBadges))
        .eq('name', userName);

      if (error) throw error;
    } catch (error) {
      console.error('Erreur sauvegarde badge:', error);
      setProfiles(prev => ({ ...prev, [userName]: previousProfile }));
      alert('Impossible de sauvegarder ce badge. Vérifiez vos droits admin.');
    } finally {
      setSaving(null);
    }
  };

  const all = Object.values(profiles || {}).filter(p => !search || p.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <SectionTitle icon={Award}>Badges spéciaux</SectionTitle>
      <p className="text-[11px] text-muted-foreground/50 mb-4">Assignez des badges spéciaux (fondateur, modérateur, VIP) aux utilisateurs.</p>

      <div className="flex flex-wrap gap-2 mb-5 p-3 bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-xl">
        {SPECIAL_BADGES.map(badge => (
          <span key={badge.id} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[11px] font-semibold"
            style={{ color: badge.color, borderColor: badge.color + '40', background: badge.color + '15' }}>
            <span className="text-sm">{badge.icon}</span>
            {badge.label}
          </span>
        ))}
      </div>

      <div className="relative mb-4">
        <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground/40" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un utilisateur..."
          className="w-full bg-secondary border border-border rounded-lg pl-8 pr-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/40 outline-none focus:border-red-500/40" />
      </div>

      {loading && <p className="text-xs text-muted-foreground/40 italic mb-2">Chargement des profils…</p>}
      {!loading && all.length === 0 && <p className="text-xs text-muted-foreground/40 italic">Aucun profil trouvé.</p>}

      <div className="space-y-2 max-h-[400px] overflow-y-auto pr-0.5">
        {all.map(profile => {
          const badgeIds = profile.specialBadges || badgesFromProfile({
            is_founder: profile.isFounder,
            is_direction: profile.isDirection,
            is_master_op: profile.isMasterOp,
            is_iridescent: profile.isIridescent,
            special_badges: profile.specialBadges,
          });

          return (
          <div key={profile.name} className="bg-secondary border border-border rounded-xl px-3 py-2.5">
            <div className="flex items-center gap-2 mb-2">
              <Avatar avatarClass={profile.avatar} initials={profile.initials} size="sm" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-medium text-foreground truncate">{profile.name}</span>
                  {badgeIds.map((badgeId: string) => {
                    const badge = SPECIAL_BADGES.find(b => b.id === badgeId);
                    return badge ? <span key={badgeId} className="text-sm" title={badge.label}>{badge.icon}</span> : null;
                  })}
                </div>
                <div className="text-[10px] text-muted-foreground/50">Nv.{profile.level || 1} · {(profile.xp || 0).toLocaleString()} XP</div>
              </div>
            </div>

            <div className="flex gap-1.5 flex-wrap">
              {SPECIAL_BADGES.map(badge => {
                const hasBadge = badgeIds.includes(badge.id);
                return (
                  <button
                    key={badge.id}
                    onClick={() => toggleSpecialBadge(profile.name, badge.id)}
                    disabled={readOnly || saving === profile.name}
                    className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-medium transition-all disabled:opacity-30 disabled:cursor-not-allowed ${
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
        );
        })}
      </div>
    </div>
  );
}
