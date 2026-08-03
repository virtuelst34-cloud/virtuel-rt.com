import React, { useState, useRef, useCallback, FormEvent, useEffect, useMemo } from 'react';
import { useUser, useSalons, useNotifications, useXP, useMuteBlock, useUI, usePreferences, useDM, useGlobalSettings } from '@/lib/contexts';
import { Salon } from '@/lib/chatConfig';
import Avatar from './Avatar';
import DiamondBadge from './DiamondBadge';
import GenderIcon from './GenderIcon';
import UserDisplayName from './UserDisplayName';
import SpecialBadgeInline from './SpecialBadgeInline';
import UserProfileView from './UserProfileView';
import { SupabaseLogin } from '../auth/SupabaseLogin';
import { MessageSquare, Hand, Lock, X, Trophy, Flame, Mail, LogOut, Users, Scale, ShieldAlert, ChevronDown, ChevronRight, Star, Radio } from 'lucide-react';
import { presenceService } from '@/lib/presenceService';
import MembersPanel from './MembersPanel';
import DailySparkCard from './DailySparkCard';
import WeeklyChallengeCard from './WeeklyChallengeCard';
import { Link } from 'react-router-dom';
import { groupSalonsByCategory, mergeAndSortSalons } from '@/lib/salonUtils';
import { MENTIONS_LEGALES_HREF } from '@/lib/welcomeContent';
import { hasAdminAccess, hasStaffAccess } from '@/lib/utils/founderCheck';
import {
  getFavoriteSalonId,
  getLastSalonId,
} from '@/lib/onboarding';
import { supabase } from '@/lib/supabase';

interface DisplayOnlineUser {
  name: string;
  avatar: string;
  initials: string;
  level: number;
  salon: string | null;
  isFounder?: boolean;
  isDirection?: boolean;
  isMasterOp?: boolean;
  isIridescent?: boolean;
  specialBadges?: string[];
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
}

interface WelcomeScreenProps {
  onOpenDM?: (name?: string) => void;
  mobileSalonsOpen?: boolean;
  onMobileSalonsOpenChange?: (open: boolean) => void;
}

// Emoji par salon
const SALON_EMOJI: Record<string, string> = {
  bienvenue: '👋', annonces: '📢', general: '💬',
  musique60: '🎵', musique80: '🎸', musique90: '💿', musique2000: '🎧', karaoke: '🎤',
  cameras: '📹', bar: '🍷', humour: '😂', cuisine: '🍳', voyage: '✈️',
  amical: '🤝', jeunes: '👋', quarante: '☕',
  quiz: '🧠', blindtest: '🎼', gaming: '🎮', sport: '⚽',
  divorce: '💙', aide: '🤲',
  france: '🇫🇷', belgique: '🇧🇪', quebec: '🇨🇦', suisse: '🇨🇭',
  lgbt: '🌈', libre: '🚪', debat: '⚡', insulte: '😤',
  cinema: '🎬', series: '📺', livres: '📚', tech: '💻', ia: '🤖',
};

function PulseDot({ color = 'bg-emerald-500' }: { color?: string }) {
  return (
    <span className="relative flex h-2 w-2 shrink-0">
      <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${color} opacity-60`} />
      <span className={`relative inline-flex rounded-full h-2 w-2 ${color}`} />
    </span>
  );
}

export default function WelcomeScreen({ onOpenDM, mobileSalonsOpen, onMobileSalonsOpenChange }: WelcomeScreenProps) {
  const { setCurrentSalon, customSalons, hiddenSalons, displayOrder, categories, isSalonLocked, verifySalonPassword } = useSalons();
  const { coquinMode } = usePreferences();
  const { user, profiles, loginWithSupabase, logout } = useUser();
  const { addNotification } = useNotifications();
  const { xpProgress, xpForLevel, monthlyXP } = useXP();
  const { isMuted, isBlocked } = useMuteBlock();
  const { openAdmin } = useUI();
  const { getUnreadCount } = useDM();
  const { settings, refresh: refreshSettings } = useGlobalSettings();
  const canModerate = hasAdminAccess(user) || hasStaffAccess(user);
  const unreadDMs = user ? getUnreadCount(user.name) : 0;
  const [waved, setWaved]             = useState<Record<string, boolean>>({});
  const [filter, setFilter]           = useState('all');
  const [viewProfile, setViewProfile] = useState<string | null>(null);
  const [passwordPrompt, setPasswordPrompt] = useState<Salon | null>(null);
  const [passwordError, setPasswordError] = useState('');
  const [showSupabaseLogin, setShowSupabaseLogin] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<DisplayOnlineUser[]>([]);
  const [salonCounts, setSalonCounts] = useState<Record<string, number>>({});
  const [showMembersPanel, setShowMembersPanel] = useState(false);
  const [localSalonsOpen, setLocalSalonsOpen] = useState(false);
  const [collapsedCats, setCollapsedCats] = useState<Record<string, boolean>>({});
  const waveTimersRef                 = useRef<Record<string, number>>({});

  const salonsDrawerOpen = mobileSalonsOpen ?? localSalonsOpen;
  const setSalonsDrawerOpen = onMobileSalonsOpenChange ?? setLocalSalonsOpen;

  // Charger les utilisateurs en ligne et les counts de salons
  useEffect(() => {
    const loadPresenceData = () => {
      const presenceUsers = presenceService
        .getOnlineUsers()
        .filter(p => p.name !== user?.name && !isMuted(p.name) && !isBlocked(p.name));
      const salonPresence = presenceService.getAllSalonPresence();

      const displayUsers: DisplayOnlineUser[] = presenceUsers.map(p => {
        const profile = profiles[p.name];
        return {
          name: p.name,
          avatar: p.avatar || profile?.avatar || 'av1',
          initials: p.initials || profile?.initials || p.name.slice(0, 2).toUpperCase(),
          level: profile?.level || 1,
          salon: p.currentSalonId || null,
          isFounder: profile?.isFounder,
          isDirection: profile?.isDirection,
          isMasterOp: profile?.isMasterOp,
          isIridescent: profile?.isIridescent,
          specialBadges: profile?.specialBadges,
          gender: profile?.gender,
        };
      });

      setOnlineUsers(displayUsers);

      // Compteurs par salon : présence dans le salon (currentSalonId), hors soi / mute / block
      const counts: Record<string, number> = {};
      presenceUsers.forEach((p) => {
        if (!p.currentSalonId) return;
        counts[p.currentSalonId] = (counts[p.currentSalonId] || 0) + 1;
      });
      // Compléter avec la map salonPresence si des entrées manquent
      salonPresence.forEach((presence, salonId) => {
        const n = presence.users.filter(p => p.name !== user?.name && !isMuted(p.name) && !isBlocked(p.name)).length;
        if (n > (counts[salonId] || 0)) counts[salonId] = n;
      });
      setSalonCounts(counts);
    };

    loadPresenceData();

    const unsubscribe = presenceService.subscribe(() => {
      loadPresenceData();
    });

    return unsubscribe;
  }, [profiles, user?.name, isMuted, isBlocked]);

  const allSalons = mergeAndSortSalons(
    customSalons || [],
    hiddenSalons || [],
    displayOrder || {},
    { coquinMode },
  );

  const mostActiveSalon = useMemo(() => {
    let best: { id: string; count: number } | null = null;
    for (const s of allSalons) {
      const count = salonCounts[s.id] || 0;
      if (count <= 0) continue;
      if (!best || count > best.count) best = { id: s.id, count };
    }
    return best ? allSalons.find((s) => s.id === best!.id) || null : null;
  }, [allSalons, salonCounts]);

  const featuredSalon = useMemo(() => {
    const pinnedId = settings.featured_salon_id || null;
    if (pinnedId) {
      const pinned = allSalons.find((s) => s.id === pinnedId);
      if (pinned) return { salon: pinned, reason: 'pin' as const };
    }
    if (mostActiveSalon) return { salon: mostActiveSalon, reason: 'live' as const };
    return null;
  }, [allSalons, mostActiveSalon, settings.featured_salon_id]);

  const setFeaturedSalonRemote = useCallback(async (salonId: string | null) => {
    try {
      const id = settings.id;
      if (id) {
        await supabase.from('global_settings').update({ featured_salon_id: salonId }).eq('id', id);
      } else {
        await supabase.from('global_settings').update({ featured_salon_id: salonId }).neq('id', '00000000-0000-0000-0000-000000000000');
      }
      await refreshSettings();
    } catch (err) {
      console.error('featured_salon_id:', err);
      addNotification({ type: 'system', message: 'Impossible d’épingler le salon (droits admin ?)' });
    }
  }, [settings.id, refreshSettings, addNotification]);

  const shortcutSalon = useMemo(() => {
    const fav = getFavoriteSalonId();
    if (fav && allSalons.some((s) => s.id === fav)) return fav;
    const last = getLastSalonId();
    if (last && allSalons.some((s) => s.id === last)) return last;
    return null;
  }, [allSalons]);

  const shortcutSalonMeta = shortcutSalon ? allSalons.find((s) => s.id === shortcutSalon) : null;

  // Données XP
  const lvl = user?.level || 1;
  const xp = user?.xp || 0;
  const next = xpForLevel ? xpForLevel(lvl) : 500;
  const prog = user && xpProgress ? xpProgress(user) : 0;

  // Classement mensuel (XP du mois > 0 uniquement)
  const monthlyRanked = Object.entries(monthlyXP || {})
    .filter(([, mxp]) => (mxp as number) > 0)
    .map(([name, mxp]) => ({ ...(profiles[name] || {}), name, mxp: mxp as number }))
    .sort((a, b) => b.mxp - a.mxp)
    .slice(0, 10);

  // Classement global
  const ranked = Object.values(profiles)
    .sort((a, b) => (b.level || 1) - (a.level || 1) || (b.xp || 0) - (a.xp || 0))
    .slice(0, 10);

  const filteredSalons = allSalons.filter(s =>
    filter === 'all' ||
    (filter === 'vocal' && (s.type === 'vocal' || s.type === 'chat vocal')) ||
    (filter === 'chat'  && s.type === 'chat') ||
    (filter === 'video' && s.type === 'video')
  );

  const categoryGroups = useMemo(() => {
    const catMeta = (categories || []).map(c => ({
      id: c.id,
      name: c.name,
      emoji: c.emoji,
      description: c.description,
      sort_order: c.sort_order,
      subcategories: c.subcategories || [],
      isCoquin: c.isCoquin,
    }));
    return groupSalonsByCategory(filteredSalons, catMeta, salonCounts, { coquinMode });
  }, [filteredSalons, categories, salonCounts, coquinMode]);

  const toggleCat = useCallback((id: string) => {
    setCollapsedCats(prev => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const handleWave = useCallback((name: string) => {
    setWaved(prev => ({ ...prev, [name]: true }));
    addNotification({ type: 'dm', message: `👋 Vous avez salué ${name} !` });
    clearTimeout(waveTimersRef.current[name]);
    waveTimersRef.current[name] = setTimeout(() => {
      setWaved(prev => ({ ...prev, [name]: false }));
      delete waveTimersRef.current[name];
    }, 2000);
  }, [addNotification]);

  const handleSalonClick = useCallback((salon: Salon) => {
    if (isSalonLocked(salon.id)) {
      setPasswordPrompt(salon);
      setPasswordError('');
    } else {
      setCurrentSalon(salon.id);
      setSalonsDrawerOpen(false);
    }
  }, [isSalonLocked, setCurrentSalon, setSalonsDrawerOpen]);

  const handlePasswordSubmit = useCallback((e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const password = (e.target as any).password.value;
    if (passwordPrompt && verifySalonPassword(passwordPrompt.id, password)) {
      setCurrentSalon(passwordPrompt.id);
      setPasswordPrompt(null);
      setPasswordError('');
      setSalonsDrawerOpen(false);
    } else {
      setPasswordError('Mot de passe incorrect');
    }
  }, [passwordPrompt, verifySalonPassword, setCurrentSalon, setSalonsDrawerOpen]);

  return (
    <div className="flex-1 flex min-h-0 overflow-hidden relative">

      {/* ── Colonne gauche : liste des salons (drawer mobile) ── */}
      {salonsDrawerOpen && (
        <button
          type="button"
          className="md:hidden absolute inset-0 bg-black/50 z-30"
          aria-label="Fermer la liste des salons"
          onClick={() => setSalonsDrawerOpen(false)}
        />
      )}
      <div className={`
        absolute md:relative inset-y-0 left-0 z-40 md:z-auto
        w-[min(100%,300px)] md:w-[260px] border-r border-border flex flex-col shrink-0 bg-card
        transition-transform duration-200 ease-out
        ${salonsDrawerOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="px-4 py-3 border-b border-border flex items-center justify-between gap-2">
          <h3 className="text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-widest">Salons</h3>
          <button
            type="button"
            className="md:hidden p-2 rounded-lg border border-white/10 text-muted-foreground hover:text-foreground touch-target"
            onClick={() => setSalonsDrawerOpen(false)}
            aria-label="Fermer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Filtres */}
        <div className="flex gap-1 px-3 py-2 border-b border-border">
          {[
            { id: 'all', label: 'Tous' },
            { id: 'vocal', label: 'Vocal' },
            { id: 'chat', label: 'Chat' },
            { id: 'video', label: 'Vidéo' }
          ].map(({ id, label }) => (
            <button key={id} onClick={() => setFilter(id)}
              className={`flex-1 py-1 rounded-md text-[10px] font-medium transition-all duration-200 ${filter === id ? 'bg-primary/15 text-primary scale-105' : 'text-muted-foreground/50 hover:text-muted-foreground hover:bg-white/5'}`}>
              {label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto py-1.5 px-2">
          {categoryGroups.map(group => {
            const collapsed = !!collapsedCats[group.category.id];
            return (
              <div key={group.category.id} className="mb-2">
                <button
                  type="button"
                  onClick={() => toggleCat(group.category.id)}
                  className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-left hover:bg-white/[0.04] transition-colors group/cat"
                >
                  {collapsed
                    ? <ChevronRight className="w-3 h-3 text-muted-foreground/40 shrink-0" />
                    : <ChevronDown className="w-3 h-3 text-muted-foreground/40 shrink-0" />}
                  <span className="text-sm shrink-0" aria-hidden>{group.category.emoji}</span>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70 flex-1 truncate">
                    {group.category.name}
                  </span>
                  <span className="text-[9px] text-muted-foreground/40 tabular-nums">{group.salons.length}</span>
                  {group.category.isCoquin && (
                    <span className="text-[8px] px-1.5 py-px rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/30">18+</span>
                  )}
                </button>
                {!collapsed && (
                  <div className="mt-0.5 space-y-0.5 border-l border-border/40 ml-3 pl-1">
                    {group.salons.map((salon, index) => {
                      const count = salonCounts[salon.id] || 0;
                      return (
                      <button
                        key={salon.id}
                        type="button"
                        onClick={() => handleSalonClick(salon)}
                        className="w-full flex items-center gap-3 px-2.5 py-2 rounded-xl hover:bg-white/[0.05] transition-all duration-200 text-left group hover:scale-[1.02] active:scale-[0.98]"
                        style={{ animationDelay: `${index * 30}ms` }}
                      >
                        <div className="w-8 h-8 rounded-xl bg-secondary border border-border flex items-center justify-center text-base shrink-0 group-hover:scale-110 transition-transform duration-300">
                          {salon.emoji || SALON_EMOJI[salon.id] || '💬'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[12px] font-medium text-foreground truncate group-hover:text-primary transition-colors">{salon.name}</span>
                            {salon.isPrivate && <Lock className="w-3 h-3 text-amber-400 shrink-0" />}
                            {salon.live && <PulseDot color="bg-red-500" />}
                            {salon.isCoquin && <span className="text-[8px] text-rose-300/80 shrink-0">🔥</span>}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {salon.subcategory && (
                              <span className="text-[9px] text-muted-foreground/40 truncate">{salon.subcategory}</span>
                            )}
                            {salon.live && <span className="text-[9px] bg-red-500/15 text-red-400 border border-red-500/30 rounded px-1.5 py-px font-semibold animate-pulse">LIVE</span>}
                          </div>
                        </div>
                        {count > 0 && (
                          <span
                            className="shrink-0 inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-semibold tabular-nums px-1.5 py-0.5"
                            title={`${count} en ligne dans ce salon`}
                            aria-label={`${count} utilisateurs en ligne`}
                          >
                            <PulseDot color="bg-emerald-500" />
                            {count}
                          </span>
                        )}
                      </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
          {categoryGroups.length === 0 && (
            <p className="text-[11px] text-muted-foreground/50 px-3 py-4 text-center italic">Aucun salon pour ce filtre.</p>
          )}
        </div>
      </div>

      {/* ── Centre : épuré ── */}
      <div className="flex-1 flex flex-col items-center justify-center gap-3 sm:gap-4 text-center px-4 sm:px-8 select-none overflow-y-auto min-w-0 py-6">
        <button
          type="button"
          onClick={() => setSalonsDrawerOpen(true)}
          className="md:hidden self-start mb-1 inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-secondary border border-border text-xs text-foreground touch-target"
        >
          <Users className="w-3.5 h-3.5 text-primary" /> Voir les salons
        </button>
        <div className="relative mb-1">
          <div className="absolute inset-0 rounded-2xl bg-primary/25 blur-2xl scale-90 opacity-70" aria-hidden />
          <div className="relative w-40 h-40 sm:w-64 sm:h-64 md:w-72 md:h-72 rounded-2xl overflow-hidden shadow-lg shadow-primary/25 ring-1 ring-primary/20">
            <img
              src="/logo.png"
              alt="Virtuel-RT Logo"
              className="w-full h-full object-contain"
            />
          </div>
        </div>
        <h2 className="text-lg sm:text-xl font-bold text-foreground">Bienvenue sur Virtuel-RT</h2>
        <p className="inline-flex items-center gap-1.5 text-[10px] sm:text-[11px] text-amber-800 dark:text-amber-200/85 bg-amber-500/10 border border-amber-500/25 rounded-full px-2.5 py-1">
          <Scale className="w-3 h-3 shrink-0" /> Interdit aux mineurs · réservé aux 18 ans
        </p>

        {/* Raccourcis mobiles / Accueil */}
        {user && (
          <div className="w-full max-w-sm flex flex-wrap gap-2 justify-center">
            <button
              type="button"
              onClick={() => onOpenDM?.()}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border bg-secondary/70 text-[11px] text-foreground touch-target relative"
            >
              <MessageSquare className="w-3.5 h-3.5 text-primary" />
              MP
              {unreadDMs > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-primary text-[9px] font-bold text-white flex items-center justify-center">
                  {unreadDMs > 9 ? '9+' : unreadDMs}
                </span>
              )}
            </button>
            {shortcutSalonMeta && (
              <button
                type="button"
                onClick={() => handleSalonClick(shortcutSalonMeta)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border bg-secondary/70 text-[11px] text-foreground touch-target max-w-[46%]"
                title={shortcutSalonMeta.name}
              >
                <Star className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="truncate">{shortcutSalonMeta.name}</span>
              </button>
            )}
            {mostActiveSalon && (
              <button
                type="button"
                onClick={() => handleSalonClick(mostActiveSalon)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-[11px] text-emerald-300 touch-target"
              >
                <Radio className="w-3.5 h-3.5 shrink-0" />
                Rejoindre un salon actif
              </button>
            )}
          </div>
        )}

        {/* Salon du moment */}
        {featuredSalon && (
          <button
            type="button"
            onClick={() => handleSalonClick(featuredSalon.salon)}
            className="w-full max-w-sm text-left rounded-xl border border-primary/30 bg-primary/10 px-4 py-3 hover:bg-primary/15 transition-all touch-target"
          >
            <div className="flex items-center gap-2 mb-1">
              <Flame className="w-3.5 h-3.5 text-primary" />
              <span className="text-[11px] font-semibold uppercase tracking-wider text-primary">
                Salon du moment
              </span>
              {featuredSalon.reason === 'pin' && (
                <span className="text-[9px] text-muted-foreground/50">épinglé</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg">{featuredSalon.salon.emoji || '💬'}</span>
              <span className="text-sm font-medium text-foreground truncate">{featuredSalon.salon.name}</span>
              {(salonCounts[featuredSalon.salon.id] || 0) > 0 && (
                <span className="ml-auto text-[10px] text-emerald-400 tabular-nums">
                  {salonCounts[featuredSalon.salon.id]} en ligne
                </span>
              )}
            </div>
          </button>
        )}

        {canModerate && (
          <div className="w-full max-w-sm flex flex-wrap gap-2 justify-center text-[10px]">
            {featuredSalon?.reason === 'pin' ? (
              <button
                type="button"
                onClick={() => {
                  void setFeaturedSalonRemote(null);
                  addNotification({ type: 'system', message: 'Épinglage du salon du moment retiré' });
                }}
                className="text-muted-foreground/60 hover:text-foreground underline"
              >
                Retirer l’épingle
              </button>
            ) : mostActiveSalon ? (
              <button
                type="button"
                onClick={() => {
                  void setFeaturedSalonRemote(mostActiveSalon.id);
                  addNotification({ type: 'system', message: `« ${mostActiveSalon.name} » épinglé comme salon du moment` });
                }}
                className="text-muted-foreground/60 hover:text-foreground underline"
              >
                Épingler le salon actif
              </button>
            ) : null}
          </div>
        )}

        <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-lg px-4 py-2 mb-1">
          <p className="text-sm font-semibold text-purple-700 dark:text-purple-300">🎉 Pour l&apos;ouverture, Premium offert en essai !</p>
        </div>
        <DailySparkCard className="w-full max-w-sm" />
        <WeeklyChallengeCard className="w-full max-w-sm" />

        <Link
          to="/equipe"
          className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground/70 hover:text-primary transition-colors"
        >
          <Users className="w-3.5 h-3.5" /> Voir l’équipe
        </Link>

        {/* En ligne — visible sur mobile / tablette (colonne droite masquée sous lg) */}
        <div className="lg:hidden w-full max-w-sm text-left">
          <div className="flex items-center justify-between mb-2 px-0.5">
            <h3 className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-widest flex items-center gap-1.5">
              <PulseDot /> En ligne
            </h3>
            <div className="flex items-center gap-2">
              <span className="text-[9px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 rounded-full px-2 py-px tabular-nums">
                {onlineUsers.length + (user ? 1 : 0)}
              </span>
              <button
                type="button"
                onClick={() => setShowMembersPanel(true)}
                className="text-[10px] text-primary/80 hover:text-primary touch-target px-1"
                title="Voir tous les membres"
              >
                Voir tout
              </button>
            </div>
          </div>
          {onlineUsers.length === 0 ? (
            <p className="text-[11px] text-muted-foreground/45 italic px-0.5 py-2">
              {user ? 'Aucun autre utilisateur en ligne.' : 'Connectez-vous pour voir qui est en ligne.'}
            </p>
          ) : (
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 snap-x snap-mandatory scrollbar-thin">
              {onlineUsers
                .slice()
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((u) => {
                  const salonName = u.salon ? allSalons.find(s => s.id === u.salon)?.name : null;
                  return (
                    <div
                      key={u.name}
                      className="snap-start shrink-0 w-[132px] rounded-xl border border-border/60 bg-secondary/40 p-2.5 flex flex-col items-center gap-1.5"
                    >
                      <button
                        type="button"
                        onClick={() => setViewProfile(u.name)}
                        className="flex flex-col items-center gap-1.5 w-full touch-target"
                        title={`Profil de ${u.name}`}
                      >
                        <div className="relative">
                          <Avatar avatarClass={u.avatar || 'av1'} initials={u.initials || u.name.slice(0, 2).toUpperCase()} size="sm" />
                          <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-card rounded-full" />
                        </div>
                        <span className="text-[11px] font-medium text-foreground truncate w-full text-center flex items-center justify-center gap-0.5">
                          <span className="truncate">{u.name}</span>
                          <SpecialBadgeInline profile={profiles[u.name] || u} size="xs" showLabels={false} />
                        </span>
                        <span className="text-[9px] text-emerald-400/75 truncate w-full text-center">
                          {salonName ? `Dans ${salonName}` : 'En ligne'}
                        </span>
                      </button>
                      <div className="flex items-center gap-1 w-full mt-0.5">
                        <button
                          type="button"
                          onClick={() => setViewProfile(u.name)}
                          className="flex-1 py-1 rounded-lg text-[9px] font-medium border border-border text-muted-foreground hover:text-foreground hover:bg-white/5 touch-target"
                        >
                          Profil
                        </button>
                        {onOpenDM && (
                          <button
                            type="button"
                            onClick={() => onOpenDM(u.name)}
                            className="flex-1 py-1 rounded-lg text-[9px] font-medium border border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 touch-target"
                          >
                            MP
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>

        {canModerate && (
          <button
            type="button"
            onClick={() => openAdmin(user, 'modhub')}
            className="w-full max-w-sm flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/35 text-red-600 dark:text-red-400 text-sm font-semibold hover:bg-red-500/20 transition-colors touch-target"
          >
            <ShieldAlert className="w-4 h-4 shrink-0" />
            Centre de modération
          </button>
        )}
        <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
          Choisissez un salon pour rejoindre une discussion,
          ou envoyez un message privé à quelqu'un.
        </p>
        <Link
          to={MENTIONS_LEGALES_HREF}
          className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-purple-700 dark:hover:text-purple-300 transition-colors"
        >
          <Scale className="w-3 h-3" /> Mentions légales · 18+
        </Link>
        {user ? (
          <div className="mt-2 flex items-center gap-3">
            <div className="flex items-center gap-2 bg-secondary border border-border rounded-full px-4 py-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs text-muted-foreground/70">Connecté en tant que{' '}
                <UserDisplayName
                  name={user.name}
                  profile={user}
                  level={user.level}
                  size="xs"
                  showSpecialLabels={false}
                  nameClassName="text-foreground font-medium"
                  className="inline-flex"
                />
              </span>
            </div>
            <button
              onClick={logout}
              title="Se déconnecter"
              className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-secondary border border-border text-muted-foreground/60 hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400 transition-all duration-200 text-xs"
            >
              <LogOut className="w-3.5 h-3.5" />
              Déconnexion
            </button>
          </div>
        ) : (
          <div className="mt-4 flex flex-col gap-2">
            <button
              onClick={() => setShowSupabaseLogin(true)}
              className="flex items-center gap-2 bg-primary text-white px-6 py-2.5 rounded-full font-semibold hover:bg-primary/80 transition-all duration-200 hover:scale-105 active:scale-95"
            >
              <Mail className="w-4 h-4" />
              Se connecter avec Email
            </button>
            <p className="text-[10px] text-muted-foreground/40">Authentification sécurisée par Supabase</p>
          </div>
        )}
      </div>

      {/* ── Colonne droite : XP, classement et connectés ── */}
      <div className="hidden lg:flex w-[240px] border-l border-border flex-col shrink-0 bg-card overflow-y-auto">
        
        {/* XP du joueur */}
        <div className="p-3 border-b border-border">
          <div className="text-[9.5px] text-muted-foreground/50 uppercase tracking-widest mb-2">Ton diamant</div>
          <div className="text-center py-1">
            {user ? (
              <div className="flex flex-col items-center gap-1.5">
                <DiamondBadge level={lvl} size="md" showLabel />
                <SpecialBadgeInline profile={user} size="sm" showLabels />
              </div>
            ) : (
              <div className="w-7 h-7 bg-indigo-400/20 rounded-lg mx-auto mb-1" />
            )}
            <div className="text-xs text-purple-300 font-semibold mt-1">Niveau {lvl}</div>
            <div className="text-[10px] text-muted-foreground/50 mt-0.5">{xp.toLocaleString()} / {next.toLocaleString()} XP</div>
            <div className="bg-secondary rounded h-[3px] mt-2">
              <div className="h-[3px] rounded xp-gradient transition-all duration-500" style={{ width: `${prog}%` }} />
            </div>
          </div>
        </div>

        {/* Classement mensuel */}
        <div className="p-3 border-b border-border">
          <div className="flex items-center gap-1.5 mb-3">
            <Trophy className="w-3 h-3 text-yellow-400" />
            <span className="text-[9.5px] text-muted-foreground/50 uppercase tracking-widest">Top du mois</span>
          </div>
          {monthlyRanked.length === 0 ? (
            <p className="text-[10px] text-muted-foreground/40 italic">Aucune activité ce mois.</p>
          ) : monthlyRanked.slice(0, 5).map((r, i) => {
            const isMe = r.name === user?.name;
            return (
              <div key={r.name} className={`flex items-center gap-1.5 py-1 px-1 rounded-lg mb-0.5 ${isMe ? 'bg-yellow-500/8 border border-yellow-500/18' : ''}`}>
                <span className="text-[10px] w-4 text-center shrink-0">{['🥇','🥈','🥉','4','5'][i] || i+1}</span>
                <Avatar avatarClass={r.avatar || 'av1'} initials={r.initials || r.name?.slice(0,2).toUpperCase()} size="xs" />
                <div className="flex-1 min-w-0">
                  <UserDisplayName
                    name={r.name}
                    profile={r}
                    level={r.level}
                    size="xs"
                    showSpecialLabels={false}
                    nameClassName={`text-[10px] font-medium ${isMe ? 'text-yellow-300' : 'text-muted-foreground'}`}
                  />
                  <span className="text-[8px] text-muted-foreground/40">{r.mxp.toLocaleString()} XP</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Classement global */}
        <div className="p-3 border-b border-border">
          <div className="flex items-center gap-1.5 mb-3">
            <Flame className="w-3 h-3 text-orange-400" />
            <span className="text-[9.5px] text-muted-foreground/50 uppercase tracking-widest">Classement</span>
          </div>
          {ranked.length === 0
            ? <p className="text-[10px] text-muted-foreground/40 italic">Aucun profil.</p>
            : ranked.slice(0, 5).map((r, i) => {
              const isMe = r.name === user?.name;
              return (
                <div key={r.name} className={`flex items-center gap-1 py-1 px-1 rounded-lg mb-0.5 ${isMe ? 'bg-purple-500/8 border border-purple-500/18' : ''}`}>
                  <span className="text-[9px] text-muted-foreground/40 w-4 text-center shrink-0">{i+1}</span>
                  <Avatar avatarClass={r.avatar || 'av1'} initials={r.initials || r.name?.slice(0,2).toUpperCase()} size="xs" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1 justify-between min-w-0">
                      <UserDisplayName
                        name={r.name}
                        profile={r}
                        level={r.level}
                        size="xs"
                        showSpecialLabels={false}
                        nameClassName={`text-[10px] font-medium ${isMe ? 'text-purple-300' : 'text-muted-foreground'}`}
                        className="min-w-0 flex-1"
                      />
                      <span className="text-[9px] text-purple-400 font-bold shrink-0">Nv.{r.level||1}</span>
                    </div>
                  </div>
                </div>
              );
            })
          }
        </div>

        {/* En ligne */}
        <div className="p-3">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-[9.5px] text-muted-foreground/50 uppercase tracking-widest">En ligne</h3>
            <div className="flex items-center gap-2">
              <span className="text-[9px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 rounded-full px-2 py-px">
                {onlineUsers.length + (user ? 1 : 0)}
              </span>
              <button
                onClick={() => setShowMembersPanel(true)}
                className="p-1 rounded-lg text-muted-foreground/40 hover:text-foreground hover:bg-white/5 transition-all"
                title="Voir tous les membres"
              >
                <Users className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Moi */}
          {user && (
            <div className="flex items-center gap-2 px-2 py-1.5 rounded-xl mb-1 bg-primary/5 border border-primary/15">
              <div className="relative shrink-0">
                <Avatar avatarClass={user.avatar} initials={user.initials} size="xs" />
                <span className="absolute -bottom-px -right-px w-2 h-2 bg-emerald-500 border-2 border-card rounded-full" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1 min-w-0">
                  <GenderIcon gender={user.gender} size={10} />
                  <UserDisplayName
                    name={user.name}
                    profile={user}
                    level={user.level || 1}
                    size="xs"
                    showSpecialLabels={false}
                    nameClassName="text-[11px] font-semibold text-primary"
                  />
                </div>
                <span className="text-[9px] text-muted-foreground/40">Vous</span>
              </div>
            </div>
          )}

          {/* Autres utilisateurs en ligne */}
          {onlineUsers.length === 0 ? (
            <p className="text-[10px] text-muted-foreground/40 italic px-2">Aucun autre utilisateur en ligne.</p>
          ) : (
            <div className="flex flex-col gap-1 mt-1">
              {onlineUsers
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((u) => {
                  const salonName = u.salon ? allSalons.find(s => s.id === u.salon)?.name : null;
                  const profile = profiles[u.name] || u;
                  return (
                    <button
                      key={u.name}
                      type="button"
                      onClick={() => setViewProfile(u.name)}
                      className="flex items-center gap-2 px-2 py-1.5 rounded-xl w-full text-left bg-secondary/20 border border-border/40 hover:bg-white/[0.04] hover:border-border transition-all"
                    >
                      <div className="relative shrink-0">
                        <Avatar avatarClass={u.avatar || 'av1'} initials={u.initials || u.name.slice(0, 2).toUpperCase()} size="xs" />
                        <span className="absolute -bottom-px -right-px w-2 h-2 bg-emerald-500 border-2 border-card rounded-full animate-pulse" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1 min-w-0">
                          <GenderIcon gender={u.gender} size={10} />
                          <UserDisplayName
                            name={u.name}
                            profile={profile}
                            level={u.level || profile.level || 1}
                            size="xs"
                            showSpecialLabels={false}
                            nameClassName="text-[11px] font-medium text-foreground"
                          />
                        </div>
                        <span className="text-[9px] text-emerald-400/70 truncate block">
                          {salonName ? `Dans ${salonName}` : 'En ligne'}
                        </span>
                      </div>
                    </button>
                  );
                })}
            </div>
          )}
        </div>
      </div>

      {viewProfile && (
        <UserProfileView
          targetName={viewProfile}
          onClose={() => setViewProfile(null)}
          onOpenDM={(name) => { setViewProfile(null); onOpenDM?.(name); }}
        />
      )}

      {/* Modal de mot de passe */}
      {passwordPrompt && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[2000] animate-in fade-in duration-300 p-4" onClick={() => setPasswordPrompt(null)}>
          <div className="bg-card border border-border/50 rounded-3xl w-full max-w-[380px] overflow-hidden shadow-[0_32px_96px_rgba(0,0,0,0.5)] animate-in zoom-in-95 duration-300"
            onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-border flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-amber-400 animate-pulse">
                <Lock className="w-4 h-4" />
              </div>
              <span className="text-[15px] font-semibold text-foreground flex-1">Salon privé</span>
              <button onClick={() => setPasswordPrompt(null)} className="p-1.5 rounded-lg border border-white/10 text-muted-foreground/60 hover:bg-white/5 hover:text-foreground transition-all duration-200 hover:scale-110 active:scale-95">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5">
              <p className="text-sm text-muted-foreground mb-4">
                Le salon <span className="text-foreground font-semibold">{passwordPrompt.name}</span> est protégé par un mot de passe.
              </p>
              <form onSubmit={handlePasswordSubmit}>
                <input
                  name="password"
                  type="password"
                  autoFocus
                  placeholder="Entrez le mot de passe..."
                  className="w-full bg-secondary border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/40 outline-none focus:border-amber-500/50 focus:shadow-lg focus:shadow-amber-500/10 transition-all duration-200 mb-3"
                />
                {passwordError && <p className="text-[11px] text-red-400 mb-3 animate-slide-in-up">{passwordError}</p>}
                <button
                  type="submit"
                  className="w-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl px-4 py-3 text-sm font-semibold text-white hover:shadow-lg hover:shadow-amber-500/25 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
                >
                  Entrer
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal Supabase Login */}
      {showSupabaseLogin && (
        <SupabaseLogin
          onSuccess={(user) => {
            loginWithSupabase(user);
            setShowSupabaseLogin(false);
            addNotification({ type: 'success', message: 'Connexion réussie !' });
          }}
          onCancel={() => setShowSupabaseLogin(false)}
        />
      )}

      {/* Members Panel */}
      {showMembersPanel && <MembersPanel onClose={() => setShowMembersPanel(false)} onOpenDM={onOpenDM} />}
    </div>
  );
}



