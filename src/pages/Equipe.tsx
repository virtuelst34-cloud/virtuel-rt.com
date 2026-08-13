import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { ArrowLeft, Users } from 'lucide-react';
import { ChatProvider, useUser, useUI } from '@/lib/contexts';
import Avatar from '@/components/chat/Avatar';
import SpecialBadgeInline from '@/components/chat/SpecialBadgeInline';
import UserProfileView from '@/components/chat/UserProfileView';
import UserDisplayName from '@/components/chat/UserDisplayName';
import { getSpecialBadgeIdsForUser } from '@/lib/diamondBadges';
import type { UserProfile } from '@/lib/contexts/UserContext';
import { supabase } from '@/lib/supabase';
import { mapSupabaseProfile } from '@/lib/utils/profileBadges';
import type { UserProfile as SupabaseUserProfile } from '@/lib/supabaseAuth';

type TeamRole = 'Fondateur' | 'Direction' | 'Modération';

function teamRole(p: UserProfile): TeamRole | null {
  const ids = getSpecialBadgeIdsForUser(p);
  if (p.isFounder || ids.includes('founder')) return 'Fondateur';
  if (p.isDirection || ids.includes('direction')) return 'Direction';
  if (ids.includes('moderator') || p.isMasterOp || ids.includes('master_op')) return 'Modération';
  return null;
}

const ROLE_ORDER: TeamRole[] = ['Fondateur', 'Direction', 'Modération'];

function EquipeContent() {
  const { profiles, setProfiles } = useUser();
  const { profileTarget, openUserProfile, closeUserProfile } = useUI();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .or(
            'is_founder.eq.true,is_direction.eq.true,is_master_op.eq.true,special_badges.cs.{"moderator"},special_badges.cs.{"founder"},special_badges.cs.{"direction"},special_badges.cs.{"master_op"}',
          )
          .limit(80);
        if (error) throw error;
        if (cancelled || !data) return;
        setProfiles((prev) => {
          const next = { ...prev };
          for (const row of data) {
            const mapped = mapSupabaseProfile(row as SupabaseUserProfile);
            if (mapped.name) next[mapped.name] = { ...next[mapped.name], ...mapped };
          }
          return next;
        });
      } catch (err) {
        console.error('Équipe: chargement staff', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [setProfiles]);

  const groups = useMemo(() => {
    const byRole: Record<TeamRole, UserProfile[]> = {
      Fondateur: [],
      Direction: [],
      Modération: [],
    };
    const seen = new Set<string>();
    Object.values(profiles).forEach((p) => {
      if (!p?.name || seen.has(p.name)) return;
      const role = teamRole(p);
      if (!role) return;
      seen.add(p.name);
      byRole[role].push(p);
    });
    ROLE_ORDER.forEach((r) => {
      byRole[r].sort((a, b) => a.name.localeCompare(b.name, 'fr'));
    });
    return byRole;
  }, [profiles]);

  const total = ROLE_ORDER.reduce((n, r) => n + groups[r].length, 0);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0f0a1a] via-[#16102a] to-[#0c0814] text-foreground">
      <div className="max-w-2xl mx-auto px-5 py-10">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" /> Retour à Virtuel-RT
        </Link>

        <div className="flex items-center gap-3 mb-2">
          <Users className="w-7 h-7 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">Équipe</h1>
        </div>
        <p className="text-sm text-muted-foreground/65 mb-8">
          Fondateur, Direction et Modération — touchez un profil pour en savoir plus.
        </p>

        {loading && total === 0 ? (
          <p className="text-sm text-muted-foreground/50">Chargement de l’équipe…</p>
        ) : total === 0 ? (
          <p className="text-sm text-muted-foreground/50 italic">
            Aucun membre d’équipe public pour le moment.
          </p>
        ) : (
          <div className="space-y-8">
            {ROLE_ORDER.map((role) => {
              const list = groups[role];
              if (list.length === 0) return null;
              return (
                <section key={role}>
                  <h2 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/55 mb-3">
                    {role}
                  </h2>
                  <ul className="space-y-2">
                    {list.map((p) => (
                      <li key={p.name}>
                        <button
                          type="button"
                          onClick={() => openUserProfile(p.name)}
                          className="w-full flex items-center gap-3 rounded-xl border border-border/70 bg-card/60 px-3 py-3 text-left hover:bg-white/[0.04] hover:border-primary/30 transition-all touch-target"
                        >
                          <Avatar
                            avatarClass={p.avatar || 'av1'}
                            initials={p.initials || p.name.slice(0, 2).toUpperCase()}
                            size="md"
                            profileName={p.name}
                            openProfileOnClick
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <UserDisplayName
                                name={p.name}
                                profile={p}
                                size="sm"
                                showLevelDiamond={false}
                                showSpecialLabels={false}
                                nameClassName="text-sm font-semibold text-foreground"
                              />
                              <SpecialBadgeInline profile={p} size="sm" showLabels />
                            </div>
                            {p.bio && (
                              <p className="text-[11px] text-muted-foreground/55 truncate mt-0.5">{p.bio}</p>
                            )}
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>
        )}
      </div>

      {profileTarget && (
        <UserProfileView
          targetName={profileTarget}
          onClose={closeUserProfile}
        />
      )}
    </div>
  );
}

export default function Equipe() {
  return (
    <ChatProvider>
      <EquipeContent />
    </ChatProvider>
  );
}
