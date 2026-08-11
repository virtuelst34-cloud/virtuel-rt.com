import React, { useMemo, useState, useEffect } from 'react';
import { useUser, useFriends, useMuteBlock, useNotifications, useModeration } from '@/lib/contexts';
import Avatar from './Avatar';
import DiamondBadge from './DiamondBadge';
import GenderIcon from './GenderIcon';
import UserDisplayName from './UserDisplayName';
import { getBadgeForLevel, getUnlockedBadges, getBadgeStats, SPECIAL_BADGES } from '@/lib/diamondBadges';
import {
  X, MessageSquare, UserX, Flame, Calendar, VolumeX, UserCheck, UserPlus, UserMinus, Heart,
  Shield, Ban, Star, Award, CheckCircle, Volume2,
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { getMood, getSignature } from '@/lib/funFeatures';
import { hasStaffAccess } from '@/lib/utils/founderCheck';
import { supabaseDbService } from '@/lib/supabaseDb';
import { moderationAlertService } from '@/lib/moderationAlertService';
import { supabase } from '@/lib/supabase';
import { rpcErrorMessage } from '@/lib/rpcError';
import {
  badgesFromProfile,
  profileFlagsFromBadges,
} from '@/lib/utils/profileBadges';
import {
  canUseStaffProfileAction,
  loadStaffProfileActions,
  staffRolesFromUser,
  type StaffProfileActionsSettings,
} from '@/lib/staffProfileActions';
import { toast } from 'sonner';

interface UserProfileViewProps {
  targetName: string;
  onClose: () => void;
  onOpenDM?: (name: string) => void;
}

const MERCI_GUEST_KEY = 'virtuel_rt_merci_modo_at';

function getBadgeIds(profile: Record<string, unknown> | object | null | undefined): string[] {
  if (!profile) return [];
  const p = profile as Record<string, unknown>;
  const special = p.specialBadges as string[] | undefined;
  if (Array.isArray(special) && special.length) return special;
  return badgesFromProfile({
    is_founder: p.isFounder as boolean | undefined,
    is_direction: p.isDirection as boolean | undefined,
    is_master_op: p.isMasterOp as boolean | undefined,
    is_iridescent: p.isIridescent as boolean | undefined,
    special_badges: special,
  });
}

// Fiche profil en lecture seule d'un autre utilisateur (+ actions staff)
export default function UserProfileView({ targetName, onClose, onOpenDM }: UserProfileViewProps) {
  const { profiles, setProfiles, user, supabaseUser } = useUser();
  const { addNotification } = useNotifications();
  const { isFriend, sendFriendRequest, acceptRequestFromSender, rejectRequestFromSender, cancelRequestToRecipient, removeFriend, pendingRequests, outgoingRequests } = useFriends();
  const { isMuted, isBlocked, muteUser, unmuteUser, blockUser, unblockUser } = useMuteBlock();
  const { banUser, unbanUser, muteUser: staffMute, unmuteUser: staffUnmute, isUserBanned, isUserMuted } = useModeration();
  const target = profiles[targetName] || { name: targetName, avatar: 'av1', initials: targetName.slice(0, 2).toUpperCase(), level: 1, xp: 0 };
  const [merciBusy, setMerciBusy] = useState(false);
  const [staffBusy, setStaffBusy] = useState<string | null>(null);
  const [badgeMenuOpen, setBadgeMenuOpen] = useState(false);
  const [staffSettings, setStaffSettings] = useState<StaffProfileActionsSettings>(() => loadStaffProfileActions());

  useEffect(() => {
    setStaffSettings(loadStaffProfileActions());
  }, [targetName]);

  const lvl      = target.level || 1;
  const badge    = getBadgeForLevel(lvl);
  const unlocked = getUnlockedBadges(lvl);
  const stats    = getBadgeStats();
  const blocked  = isBlocked(targetName);
  const muted   = isMuted(targetName);
  const friend   = isFriend(targetName);
  const incomingRequest = pendingRequests.find(r => r.user_id === targetName);
  const outgoingRequest = outgoingRequests.find(r => r.friend_id === targetName);
  const targetIsStaff = hasStaffAccess(target as typeof user);
  const canMerci = !!user && user.name !== targetName && targetIsStaff;
  const isSelf = user?.name === targetName;

  const viewerIsStaff = hasStaffAccess(user);
  const viewerRoles = useMemo(() => staffRolesFromUser(user), [user]);
  const staffBanned = isUserBanned(targetName) || !!(target as { isBanned?: boolean }).isBanned;
  const staffMuted = isUserMuted(targetName) || !!(target as { isMuted?: boolean }).isMuted;
  const badgeIds = getBadgeIds(target);
  const isVip = badgeIds.includes('vip');
  const isPremium = !!(target as { isPremium?: boolean }).isPremium;

  const showVip = viewerIsStaff && !isSelf && canUseStaffProfileAction('grant_vip', viewerRoles, staffSettings);
  const showPremium = viewerIsStaff && !isSelf && canUseStaffProfileAction('grant_premium', viewerRoles, staffSettings);
  const showBadges = viewerIsStaff && !isSelf && canUseStaffProfileAction('assign_badges', viewerRoles, staffSettings);
  const showStaffMute = viewerIsStaff && !isSelf && canUseStaffProfileAction('staff_mute', viewerRoles, staffSettings);
  const showStaffBan = viewerIsStaff && !isSelf && canUseStaffProfileAction('staff_ban', viewerRoles, staffSettings);
  const showStaffPanel = showVip || showPremium || showBadges || showStaffMute || showStaffBan;

  const handleBlock = async () => { 
    if (blocked) {
      await unblockUser(targetName);
    } else {
      await blockUser(targetName);
    }
  };
  
  const handleMute = async () => {
    if (muted) {
      await unmuteUser(targetName);
    } else {
      await muteUser(targetName);
    }
  };

  const handleFriend = async () => {
    try {
      if (friend) {
        await removeFriend(targetName);
        addNotification({ type: 'system', message: `${targetName} retiré de vos amis` });
      } else if (incomingRequest) {
        await acceptRequestFromSender(targetName);
        addNotification({ type: 'system', message: `Vous êtes maintenant ami avec ${targetName}` });
      } else if (outgoingRequest) {
        await cancelRequestToRecipient(targetName);
        addNotification({ type: 'system', message: `Demande à ${targetName} annulée` });
      } else {
        await sendFriendRequest(targetName);
        addNotification({ type: 'system', message: `Demande d'ami envoyée à ${targetName}` });
      }
    } catch (error) {
      addNotification({
        type: 'system',
        message: error instanceof Error ? error.message : 'Impossible de modifier la relation d\'ami',
      });
    }
  };

  const handleDM = () => { onClose(); onOpenDM?.(targetName); };

  const handleMerciModo = async () => {
    if (!user || merciBusy || !canMerci) return;
    setMerciBusy(true);
    try {
      if (supabaseUser?.id) {
        await supabaseDbService.sendMerciModo(targetName);
      } else {
        const raw = localStorage.getItem(MERCI_GUEST_KEY);
        if (raw && Date.now() - Number(raw) < 60 * 60 * 1000) {
          throw new Error('Merci déjà envoyé récemment — réessayez dans une heure');
        }
        await moderationAlertService.dispatch(
          'merci_modo',
          `${user.name} a dit « Merci modo » à ${targetName}`,
          { from_name: user.name, to_name: targetName, event_type: 'merci_modo', staff: true },
          user.name,
        );
        localStorage.setItem(MERCI_GUEST_KEY, String(Date.now()));
      }
      addNotification({ type: 'system', message: `Merci envoyé à ${targetName}` });
    } catch (error) {
      addNotification({
        type: 'system',
        message: error instanceof Error ? error.message.replace(/^.*Exception:?\s*/i, '') : 'Impossible d’envoyer le merci',
      });
    } finally {
      setMerciBusy(false);
    }
  };

  const patchLocalProfile = (patch: Record<string, unknown>) => {
    setProfiles((prev) => ({
      ...prev,
      [targetName]: { ...(prev[targetName] || target), ...patch },
    }));
  };

  const toggleVip = async () => {
    if (staffBusy) return;
    setStaffBusy('vip');
    try {
      const current = getBadgeIds(profiles[targetName] || target);
      const next = current.includes('vip')
        ? current.filter((b) => b !== 'vip')
        : [...current, 'vip'];
      const flags = profileFlagsFromBadges(next);
      const { error } = await supabase.from('profiles').update(flags).eq('name', targetName);
      if (error) throw error;
      patchLocalProfile({
        ...flags,
        specialBadges: next,
        isFounder: next.includes('founder'),
        isDirection: next.includes('direction'),
        isMasterOp: next.includes('master_op'),
        isIridescent: next.includes('iridescent'),
        isPremium: badgesImplyPremium(next) || isPremium,
      });
      toast.success(next.includes('vip') ? `VIP accordé à ${targetName}` : `VIP retiré à ${targetName}`);
    } catch {
      toast.error('Impossible de modifier VIP');
    } finally {
      setStaffBusy(null);
    }
  };

  const togglePremium = async () => {
    if (staffBusy) return;
    setStaffBusy('premium');
    try {
      const next = !isPremium;
      await supabaseDbService.adminSetPremium(targetName, next);
      patchLocalProfile({ isPremium: next });
      toast.success(next ? `Premium accordé à ${targetName}` : `Premium retiré à ${targetName}`);
    } catch (e: unknown) {
      toast.error(rpcErrorMessage(e, 'Impossible de modifier Premium'));
    } finally {
      setStaffBusy(null);
    }
  };

  const toggleSpecialBadge = async (badgeId: string) => {
    if (staffBusy) return;
    setStaffBusy(`badge-${badgeId}`);
    try {
      const current = getBadgeIds(profiles[targetName] || target);
      const next = current.includes(badgeId)
        ? current.filter((b) => b !== badgeId)
        : [...current, badgeId];
      const flags = profileFlagsFromBadges(next);
      const { error } = await supabase.from('profiles').update(flags).eq('name', targetName);
      if (error) throw error;
      patchLocalProfile({
        ...flags,
        specialBadges: next,
        isFounder: next.includes('founder'),
        isDirection: next.includes('direction'),
        isMasterOp: next.includes('master_op'),
        isIridescent: next.includes('iridescent'),
      });
      const meta = SPECIAL_BADGES.find((b) => b.id === badgeId);
      toast.success(
        next.includes(badgeId)
          ? `${meta?.label || badgeId} accordé à ${targetName}`
          : `${meta?.label || badgeId} retiré à ${targetName}`,
      );
    } catch {
      toast.error('Impossible de sauvegarder ce badge');
    } finally {
      setStaffBusy(null);
    }
  };

  const handleStaffMute = async () => {
    if (staffBusy) return;
    setStaffBusy('mute');
    try {
      if (staffMuted) {
        await staffUnmute(targetName);
        toast.success(`${targetName} démuté`);
      } else {
        if (!confirm(`Muter ${targetName} (staff) ?`)) return;
        await staffMute(targetName);
        toast.success(`${targetName} muté`);
      }
    } catch {
      toast.error('Action mute impossible');
    } finally {
      setStaffBusy(null);
    }
  };

  const handleStaffBan = async () => {
    if (staffBusy) return;
    setStaffBusy('ban');
    try {
      if (staffBanned) {
        await unbanUser(targetName);
        toast.success(`${targetName} débanni`);
      } else {
        if (!confirm(`Bannir ${targetName} ?`)) return;
        await banUser(targetName, 'Violation des règles');
        toast.success(`${targetName} banni`);
      }
    } catch {
      toast.error('Action ban impossible');
    } finally {
      setStaffBusy(null);
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[2000] animate-in fade-in duration-300 p-4" 
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby={`profile-title-${targetName}`}>
      <div 
        className="bg-card border border-border/50 rounded-3xl w-full max-w-[380px] max-h-[90vh] overflow-y-auto overflow-x-hidden shadow-[0_32px_96px_rgba(0,0,0,0.5)] animate-in zoom-in-95 duration-300"
        onClick={e => e.stopPropagation()}
        role="document">

        {/* Banner */}
        <div className="h-16 relative z-0" style={{ background: `linear-gradient(135deg, ${badge.color}22, transparent)` }}>
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.2), rgba(236,72,153,0.1))' }}
            aria-hidden="true"
          />
          <button 
            onClick={onClose}
            className="absolute top-3 right-3 p-1.5 rounded-lg bg-black/30 text-white/60 hover:text-white hover:bg-black/50 transition-colors"
            aria-label="Fermer le profil">
            <X className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>

        <div className="px-5 pb-5 relative z-10">
          {/* Avatar + nom */}
          <div className="-mt-7 mb-4 flex items-end justify-between">
            <div className="relative">
              <Avatar avatarClass={target.avatar} initials={target.initials} size="lg" mood={getMood(targetName)} />
              <div className="absolute -bottom-2 -right-2 flex items-center gap-0.5">
                <DiamondBadge level={lvl} size="sm" />
              </div>
              <GenderIcon gender={(target as any).gender} size={14} className="absolute -top-1 -right-1" />
            </div>
            <div className="flex gap-2 flex-wrap justify-end">
              {!isSelf && (
                <>
                  <button 
                    onClick={handleDM}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-primary/15 border border-primary/30 text-primary text-xs font-medium hover:bg-primary/25 transition-all active:scale-95 cursor-pointer min-h-[32px]"
                    aria-label={`Envoyer un message à ${targetName}`}>
                    <MessageSquare className="w-3.5 h-3.5 pointer-events-none" aria-hidden="true" /> Message
                  </button>
                  <button 
                    onClick={handleFriend}
                    className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all active:scale-95 cursor-pointer min-h-[32px] ${
                      friend 
                        ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20' 
                        : incomingRequest
                        ? 'bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20'
                        : outgoingRequest
                        ? 'bg-white/5 border border-border text-muted-foreground hover:bg-white/10'
                        : 'bg-blue-500/10 border border-blue-500/30 text-blue-400 hover:bg-blue-500/20'
                    }`}
                    aria-label={friend ? `Retirer ${targetName} des amis` : incomingRequest ? `Accepter la demande de ${targetName}` : outgoingRequest ? `Annuler la demande envoyée à ${targetName}` : `Ajouter ${targetName} en ami`}>
                    {friend ? <UserCheck className="w-3.5 h-3.5 pointer-events-none" aria-hidden="true" /> : outgoingRequest ? <UserMinus className="w-3.5 h-3.5 pointer-events-none" aria-hidden="true" /> : <UserPlus className="w-3.5 h-3.5 pointer-events-none" aria-hidden="true" />}
                    {friend ? 'Ami' : incomingRequest ? 'Accepter' : outgoingRequest ? 'Envoyée' : 'Ajouter'}
                  </button>
                  <button 
                    onClick={handleMute}
                    className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all active:scale-95 cursor-pointer min-h-[32px] ${
                      muted 
                        ? 'bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20' 
                        : 'bg-white/5 border border-border/30 text-muted-foreground hover:bg-white/10'
                    }`}
                    aria-label={muted ? `Rétablir le son de ${targetName}` : `Rendre ${targetName} muet`}>
                    <VolumeX className="w-3.5 h-3.5 pointer-events-none" aria-hidden="true" /> {muted ? 'Désilencer' : 'Muet'}
                  </button>
                  <button 
                    onClick={handleBlock}
                    className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all active:scale-95 cursor-pointer min-h-[32px] ${
                      blocked 
                        ? 'bg-white/5 border border-border text-muted-foreground/50' 
                        : 'bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20'
                    }`}
                    aria-label={blocked ? `Débloquer ${targetName}` : `Bloquer ${targetName}`}>
                    <UserX className="w-3.5 h-3.5 pointer-events-none" aria-hidden="true" /> {blocked ? 'Débloquer' : 'Bloquer'}
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Nom + badge */}
          <div className="mb-3">
            <div className="flex items-center gap-2 mb-0.5 flex-wrap">
              <UserDisplayName
                name={target.name}
                profile={target}
                level={lvl}
                size="sm"
                showSpecialLabels
                openProfileOnClick={false}
                nameClassName="text-[17px] font-bold text-foreground"
                id={`profile-title-${targetName}`}
              />
            </div>
            {canMerci && (
              <button
                type="button"
                disabled={merciBusy}
                onClick={() => void handleMerciModo()}
                className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-[11px] font-medium hover:bg-rose-500/20 disabled:opacity-50 transition-all"
              >
                <Heart className="w-3.5 h-3.5" />
                {merciBusy ? 'Envoi…' : 'Merci modo'}
              </button>
            )}
            {(target as any).joinedAt && (
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground/50">
                <Calendar className="w-3 h-3" aria-hidden="true" />
                Membre depuis {format(new Date((target as any).joinedAt), 'd MMMM yyyy', { locale: fr })}
              </div>
            )}
          </div>

          {/* Actions staff */}
          {showStaffPanel && (
            <div className="mb-4 rounded-xl border border-amber-500/25 bg-amber-500/5 p-3 space-y-2">
              <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-amber-400/90 font-semibold">
                <Shield className="w-3.5 h-3.5" />
                Actions staff
              </div>
              <div className="flex flex-wrap gap-1.5">
                {showVip && (
                  <button
                    type="button"
                    disabled={!!staffBusy}
                    onClick={() => void toggleVip()}
                    className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-[11px] font-medium transition-colors disabled:opacity-50 ${
                      isVip
                        ? 'bg-purple-500/20 border-purple-500/40 text-purple-300'
                        : 'bg-white/5 border-border text-muted-foreground hover:bg-purple-500/10'
                    }`}
                  >
                    <Award className="w-3 h-3" />
                    {isVip ? 'Retirer VIP' : 'Donner VIP'}
                  </button>
                )}
                {showPremium && (
                  <button
                    type="button"
                    disabled={!!staffBusy}
                    onClick={() => void togglePremium()}
                    className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-[11px] font-medium transition-colors disabled:opacity-50 ${
                      isPremium
                        ? 'bg-yellow-500/20 border-yellow-500/40 text-yellow-300'
                        : 'bg-white/5 border-border text-muted-foreground hover:bg-yellow-500/10'
                    }`}
                  >
                    <Star className="w-3 h-3" />
                    {isPremium ? 'Retirer Premium' : 'Premium'}
                  </button>
                )}
                {showStaffMute && (
                  <button
                    type="button"
                    disabled={!!staffBusy}
                    onClick={() => void handleStaffMute()}
                    className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-[11px] font-medium transition-colors disabled:opacity-50 ${
                      staffMuted
                        ? 'bg-blue-500/15 border-blue-500/35 text-blue-300'
                        : 'bg-amber-500/15 border-amber-500/35 text-amber-300'
                    }`}
                  >
                    {staffMuted ? <Volume2 className="w-3 h-3" /> : <VolumeX className="w-3 h-3" />}
                    {staffMuted ? 'Démuter' : 'Mute staff'}
                  </button>
                )}
                {showStaffBan && (
                  <button
                    type="button"
                    disabled={!!staffBusy}
                    onClick={() => void handleStaffBan()}
                    className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-[11px] font-medium transition-colors disabled:opacity-50 ${
                      staffBanned
                        ? 'bg-emerald-500/15 border-emerald-500/35 text-emerald-300'
                        : 'bg-red-500/15 border-red-500/35 text-red-300'
                    }`}
                  >
                    {staffBanned ? <CheckCircle className="w-3 h-3" /> : <Ban className="w-3 h-3" />}
                    {staffBanned ? 'Débannir' : 'Bannir'}
                  </button>
                )}
                {showBadges && (
                  <div className="relative">
                    <button
                      type="button"
                      disabled={!!staffBusy}
                      onClick={() => setBadgeMenuOpen((o) => !o)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-border bg-white/5 text-[11px] font-medium text-muted-foreground hover:bg-white/10 disabled:opacity-50"
                    >
                      <Award className="w-3 h-3" />
                      Badges
                    </button>
                    {badgeMenuOpen && (
                      <div className="absolute left-0 top-full mt-1 z-30 min-w-[170px] rounded-lg border border-border bg-popover shadow-lg p-1 max-h-48 overflow-y-auto">
                        {SPECIAL_BADGES.map((b) => {
                          const has = badgeIds.includes(b.id);
                          return (
                            <button
                              key={b.id}
                              type="button"
                              onClick={() => void toggleSpecialBadge(b.id)}
                              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-[11px] text-left ${
                                has ? 'bg-primary/10 text-foreground' : 'text-muted-foreground hover:bg-white/5'
                              }`}
                            >
                              <span>{b.icon}</span>
                              <span className="flex-1">{b.label}</span>
                              {has && <CheckCircle className="w-3 h-3 text-emerald-400" />}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Informations personnelles */}
          <div className="mb-4 grid grid-cols-3 gap-2">
            <div className="bg-secondary/50 border border-border/30 rounded-xl px-2.5 py-2">
              <div className="text-[9px] text-muted-foreground/50 uppercase tracking-wider mb-1">Âge</div>
              <div className="text-sm font-medium text-foreground">{(target as any).age ? `${(target as any).age} ans` : '-'}</div>
            </div>
            <div className="bg-secondary/50 border border-border/30 rounded-xl px-2.5 py-2">
              <div className="text-[9px] text-muted-foreground/50 uppercase tracking-wider mb-1">Ville</div>
              <div className="text-sm font-medium text-foreground truncate">{(target as any).city || '-'}</div>
            </div>
            <div className="bg-secondary/50 border border-border/30 rounded-xl px-2.5 py-2">
              <div className="text-[9px] text-muted-foreground/50 uppercase tracking-wider mb-1">Sexe</div>
              <div className="text-sm font-medium text-foreground">
                {(target as any).gender === 'male' ? 'H' : 
                 (target as any).gender === 'female' ? 'F' : 
                 (target as any).gender === 'other' ? 'A' : 
                 '-'}
              </div>
            </div>
          </div>

          {/* Bio */}
          <div className="mb-4 bg-secondary border border-border rounded-xl px-3 py-2.5">
            <div className="text-[10px] text-muted-foreground/50 uppercase tracking-widest mb-1">Bio</div>
            <p className="text-sm text-muted-foreground/80 italic">
              {(target as any).bio || 'Cet utilisateur n\'a pas encore de bio.'}
            </p>
          </div>

          {getSignature(targetName) && (
            <div className="mb-4 bg-secondary/60 border border-border rounded-xl px-3 py-2">
              <div className="text-[10px] text-muted-foreground/50 uppercase tracking-widest mb-1">Signature chat</div>
              <p className="text-xs text-muted-foreground/70 italic">{getSignature(targetName)}</p>
            </div>
          )}

          {/* XP & Niveau */}
          <div className="bg-secondary border border-border rounded-xl p-3 mb-4">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-orange-400" aria-hidden="true" />
                <span className="text-xs font-semibold text-foreground">Niveau {lvl}</span>
              </div>
              <span className="text-[11px] text-muted-foreground/50">{((target.xp || 0) as number).toLocaleString()} XP</span>
            </div>
            <div 
              className="bg-background rounded-full h-1.5 overflow-hidden"
              role="progressbar"
              aria-label={`Progression XP vers le niveau ${lvl + 1}`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.min(100, (((target.xp || 0) as number) / (lvl * lvl * 500)) * 100)}>
              <div className="h-full rounded-full xp-gradient" style={{ width: `${Math.min(100, (((target.xp || 0) as number) / (lvl * lvl * 500)) * 100)}%` }} />
            </div>
          </div>

          {/* Badges */}
          {unlocked.length > 0 && (
            <div>
              <div className="text-[10px] text-muted-foreground/50 uppercase tracking-widest mb-2">
                Badges débloqués ({unlocked.length}/{stats.total})
              </div>
              <div className="flex flex-wrap gap-2">
                {unlocked.map(b => (
                  <span key={b.id}
                    className="flex items-center gap-2 border rounded-xl px-3 py-1.5"
                    style={{ borderColor: b.color + '44', background: b.color + '12' }}>
                    <DiamondBadge level={b.minLevel} size="sm" />
                    <span className="text-[11px] font-semibold" style={{ color: b.color }}>{b.label}</span>
                  </span>
                ))}
              </div>
              <div className="text-[9px] text-muted-foreground/30 mt-2">
                Niveau max: {stats.maxLevel}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
