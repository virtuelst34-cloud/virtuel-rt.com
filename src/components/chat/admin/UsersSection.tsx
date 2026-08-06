import React, { useMemo, useRef, useState, useEffect } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import {
  Users, Search, Ban, CheckCircle, VolumeX, Volume2, Trash2, Star, Award,
} from 'lucide-react';
import { toast } from 'sonner';
import Avatar from '../Avatar';
import UserDisplayName from '../UserDisplayName';
import { SectionTitle, StatCard } from './AdminComponents';
import { supabaseDbService } from '@/lib/supabaseDb';
import { supabase } from '@/lib/supabase';
import { SPECIAL_BADGES } from '@/lib/diamondBadges';
import {
  badgesFromProfile,
  profileFlagsFromBadges,
} from '@/lib/utils/profileBadges';

type FilterId = 'all' | 'online' | 'banned';

interface Props {
  readOnly?: boolean;
  profiles: Record<string, any>;
  setProfiles: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  banUser: (name: string, reason?: string) => void;
  unbanUser: (name: string) => void;
  muteUser: (name: string) => void;
  unmuteUser: (name: string) => void;
}

function getBadgeIds(profile: any): string[] {
  return profile.specialBadges || badgesFromProfile({
    is_founder: profile.isFounder,
    is_direction: profile.isDirection,
    is_master_op: profile.isMasterOp,
    is_iridescent: profile.isIridescent,
    special_badges: profile.specialBadges,
  });
}

export default function UsersSection({
  readOnly = false,
  profiles,
  setProfiles,
  banUser,
  unbanUser,
  muteUser,
  unmuteUser,
}: Props) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterId>('all');
  const [premiumBusy, setPremiumBusy] = useState<string | null>(null);
  const [badgeBusy, setBadgeBusy] = useState<string | null>(null);
  const [badgeMenu, setBadgeMenu] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!badgeMenu) return;
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setBadgeMenu(null);
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [badgeMenu]);

  const stats = useMemo(() => {
    const all = Object.values(profiles || {});
    return {
      total: all.length,
      actifs: all.filter((p) => !p.isBanned).length,
      bannis: all.filter((p) => p.isBanned).length,
    };
  }, [profiles]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return Object.values(profiles || {})
      .filter((p) => {
        if (q && !String(p.name || '').toLowerCase().includes(q)) return false;
        if (filter === 'banned') return !!p.isBanned;
        if (filter === 'online') return !p.isBanned && (p.status || 'online') === 'online';
        return true;
      })
      .sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'fr'));
  }, [profiles, search, filter]);

  const useVirtual = filtered.length > 40;

  const virtualizer = useVirtualizer({
    count: useVirtual ? filtered.length : 0,
    getScrollElement: () => listRef.current,
    estimateSize: () => 48,
    overscan: 10,
    initialRect: { width: 600, height: 420 },
  });

  const togglePremium = async (profile: { name: string; isPremium?: boolean }) => {
    if (readOnly || premiumBusy) return;
    const next = !profile.isPremium;
    setPremiumBusy(profile.name);
    try {
      await supabaseDbService.adminSetPremium(profile.name, next);
      setProfiles((prev) => ({
        ...prev,
        [profile.name]: { ...prev[profile.name], isPremium: next },
      }));
      toast.success(next ? `Premium accordé à ${profile.name}` : `Premium retiré à ${profile.name}`);
    } catch {
      toast.error('Impossible de modifier Premium (droits admin requis)');
    } finally {
      setPremiumBusy(null);
    }
  };

  const toggleSpecialBadge = async (userName: string, badgeId: string) => {
    if (readOnly || badgeBusy) return;
    const profile = profiles[userName];
    if (!profile) return;

    const currentBadges = getBadgeIds(profile);
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

    setProfiles((prev) => ({ ...prev, [userName]: optimistic }));
    setBadgeBusy(userName);

    try {
      const { error } = await supabase
        .from('profiles')
        .update(profileFlagsFromBadges(newBadges))
        .eq('name', userName);
      if (error) throw error;
      const badge = SPECIAL_BADGES.find((b) => b.id === badgeId);
      const granted = newBadges.includes(badgeId);
      toast.success(
        granted
          ? `${badge?.label || badgeId} accordé à ${userName}`
          : `${badge?.label || badgeId} retiré à ${userName}`
      );
    } catch {
      setProfiles((prev) => ({ ...prev, [userName]: previousProfile }));
      toast.error('Impossible de sauvegarder ce badge (droits admin requis)');
    } finally {
      setBadgeBusy(null);
    }
  };

  const removeFromList = (name: string) => {
    if (readOnly) return;
    if (!confirm(`Retirer ${name} de la liste ?`)) return;
    setProfiles((p) => {
      const n = { ...p };
      delete n[name];
      return n;
    });
    toast.success(`${name} retiré de la liste`);
  };

  const btnClass = (color: string) =>
    `p-1.5 rounded-lg border transition-colors ${
      readOnly
        ? 'opacity-30 cursor-not-allowed bg-white/5 border-white/10 text-muted-foreground/40'
        : color
    }`;

  const filters: { id: FilterId; label: string }[] = [
    { id: 'all', label: 'Tous' },
    { id: 'online', label: 'En ligne' },
    { id: 'banned', label: 'Bannis' },
  ];

  const renderRow = (profile: any, key?: string) => {
    const badgeIds = getBadgeIds(profile);
    const menuOpen = badgeMenu === profile.name;

    return (
      <div
        key={key ?? profile.name}
        className={`flex items-center gap-2 rounded-lg border px-2 py-1.5 ${
          profile.isBanned
            ? 'bg-red-500/5 border-red-500/25'
            : profile.isMuted
              ? 'bg-amber-500/5 border-amber-500/20'
              : 'bg-secondary/80 border-border/80'
        }`}
      >
        <Avatar avatarClass={profile.avatar} initials={profile.initials} size="sm" profileName={profile.name} openProfileOnClick />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1 flex-wrap">
            <UserDisplayName
              name={profile.name}
              profile={profile}
              level={profile.level}
              size="xs"
              showSpecialLabels={false}
              nameClassName="text-xs font-medium text-foreground"
            />
            {badgeIds.map((id) => {
              const b = SPECIAL_BADGES.find((x) => x.id === id);
              return b ? (
                <span key={id} className="text-[11px] leading-none" title={b.label}>
                  {b.icon}
                </span>
              ) : null;
            })}
            {profile.isPremium && (
              <span className="text-[8px] bg-yellow-500/15 text-yellow-400 border border-yellow-500/30 rounded px-1 py-px">
                PREMIUM
              </span>
            )}
            {profile.isBanned && (
              <span className="text-[8px] bg-red-500/15 text-red-400 border border-red-500/30 rounded px-1 py-px">
                BANNI
              </span>
            )}
            {profile.isMuted && (
              <span className="text-[8px] bg-amber-500/15 text-amber-400 border border-amber-500/30 rounded px-1 py-px">
                MUTÉ
              </span>
            )}
          </div>
          <div className="text-[10px] text-muted-foreground/50 tabular-nums">
            Nv.{profile.level || 1} · {(profile.xp || 0).toLocaleString('fr-FR')} XP
          </div>
        </div>

        <div className="flex items-center gap-0.5 shrink-0">
          <div className="relative" ref={menuOpen ? menuRef : undefined}>
            <button
              type="button"
              onClick={() => !readOnly && setBadgeMenu(menuOpen ? null : profile.name)}
              disabled={readOnly || badgeBusy === profile.name}
              title="Badge spécial"
              className={btnClass(
                badgeIds.length > 0
                  ? 'bg-purple-500/15 border-purple-500/35 text-purple-300 hover:bg-purple-500/25'
                  : 'bg-white/5 border-white/10 text-muted-foreground/60 hover:bg-purple-500/10 hover:text-purple-300 hover:border-purple-500/30'
              )}
            >
              <Award className="w-3 h-3" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-full mt-1 z-30 min-w-[160px] rounded-lg border border-border bg-popover shadow-lg p-1">
                <p className="px-2 py-1 text-[9px] uppercase tracking-wider text-muted-foreground/50">
                  Badges spéciaux
                </p>
                {SPECIAL_BADGES.map((badge) => {
                  const has = badgeIds.includes(badge.id);
                  return (
                    <button
                      key={badge.id}
                      type="button"
                      onClick={() => void toggleSpecialBadge(profile.name, badge.id)}
                      className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-[11px] text-left transition-colors ${
                        has
                          ? 'bg-red-500/10 text-foreground'
                          : 'text-muted-foreground hover:bg-white/5 hover:text-foreground'
                      }`}
                    >
                      <span>{badge.icon}</span>
                      <span className="flex-1">{badge.label}</span>
                      {has && <CheckCircle className="w-3 h-3 text-emerald-400" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => void togglePremium(profile)}
            disabled={readOnly || premiumBusy === profile.name}
            title={profile.isPremium ? 'Retirer Premium' : 'Accorder Premium'}
            className={btnClass(
              profile.isPremium
                ? 'bg-yellow-500/20 border-yellow-500/40 text-yellow-300 hover:bg-yellow-500/30'
                : 'bg-white/5 border-white/10 text-muted-foreground/60 hover:bg-yellow-500/10 hover:text-yellow-400 hover:border-yellow-500/30'
            )}
          >
            <Star className="w-3 h-3" />
          </button>

          {!profile.isBanned ? (
            <button
              type="button"
              onClick={() => {
                if (readOnly) return;
                if (!confirm(`Bannir ${profile.name} ?`)) return;
                banUser(profile.name, 'Violation des règles');
              }}
              disabled={readOnly}
              title="Bannir"
              className={btnClass('bg-red-500/15 border-red-500/30 text-red-400 hover:bg-red-500/25')}
            >
              <Ban className="w-3 h-3" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => !readOnly && unbanUser(profile.name)}
              disabled={readOnly}
              title="Débannir"
              className={btnClass('bg-emerald-500/15 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25')}
            >
              <CheckCircle className="w-3 h-3" />
            </button>
          )}

          {!profile.isMuted ? (
            <button
              type="button"
              onClick={() => {
                if (readOnly) return;
                if (!confirm(`Muter ${profile.name} ?`)) return;
                muteUser(profile.name);
              }}
              disabled={readOnly}
              title="Muter"
              className={btnClass('bg-amber-500/15 border-amber-500/30 text-amber-400 hover:bg-amber-500/25')}
            >
              <VolumeX className="w-3 h-3" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => !readOnly && unmuteUser(profile.name)}
              disabled={readOnly}
              title="Démuter"
              className={btnClass('bg-blue-500/15 border-blue-500/30 text-blue-400 hover:bg-blue-500/25')}
            >
              <Volume2 className="w-3 h-3" />
            </button>
          )}

          <button
            type="button"
            onClick={() => removeFromList(profile.name)}
            disabled={readOnly}
            title="Retirer de la liste"
            className={btnClass(
              'bg-white/5 border-white/10 text-muted-foreground/60 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30'
            )}
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col min-h-0">
      <SectionTitle icon={Users}>Gestion des utilisateurs</SectionTitle>
      <div className="grid grid-cols-3 gap-2 mb-4">
        <StatCard value={stats.actifs} label="Actifs" color="green" />
        <StatCard value={stats.bannis} label="Bannis" color="red" />
        <StatCard value={stats.total} label="Total" color="blue" />
      </div>

      <div className="sticky top-0 z-10 -mx-1 px-1 pb-2 mb-1 bg-background/95 backdrop-blur-sm space-y-2">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground/40" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un utilisateur..."
            className="w-full bg-secondary border border-border rounded-lg pl-8 pr-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/40 outline-none focus:border-red-500/40"
          />
        </div>
        <div className="flex items-center gap-1.5">
          {filters.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-medium border transition-colors ${
                filter === f.id
                  ? 'bg-red-500/15 border-red-500/40 text-red-300'
                  : 'bg-white/5 border-white/10 text-muted-foreground/60 hover:text-muted-foreground'
              }`}
            >
              {f.label}
            </button>
          ))}
          <span className="ml-auto text-[10px] text-muted-foreground/40 tabular-nums">
            {filtered.length} / {stats.total}
          </span>
        </div>
      </div>

      {filtered.length === 0 && (
        <p className="text-xs text-muted-foreground/40 italic">Aucun profil trouvé.</p>
      )}

      <div
        ref={listRef}
        className="max-h-[min(420px,55vh)] overflow-y-auto pr-0.5 border border-border/60 rounded-xl bg-secondary/30"
      >
        {useVirtual ? (
          <div
            style={{
              height: `${virtualizer.getTotalSize()}px`,
              width: '100%',
              position: 'relative',
            }}
          >
            {virtualizer.getVirtualItems().map((virtualRow) => {
              const profile = filtered[virtualRow.index];
              return (
                <div
                  key={profile.name}
                  data-index={virtualRow.index}
                  ref={virtualizer.measureElement}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                  className="px-1.5 py-0.5"
                >
                  {renderRow(profile)}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="space-y-0.5 p-1.5">
            {filtered.map((profile) => renderRow(profile))}
          </div>
        )}
      </div>
    </div>
  );
}
