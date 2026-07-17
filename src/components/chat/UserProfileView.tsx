import React from 'react';
import { useChat, useFriends, useMuteBlock, useNotifications } from '@/lib/contexts';
import Avatar from './Avatar';
import DiamondBadge from './DiamondBadge';
import GenderIcon from './GenderIcon';
import { getBadgeForLevel, getUnlockedBadges, getBadgeStats, SPECIAL_BADGES, getSpecialBadgeForUser } from '@/lib/diamondBadges';
import { X, MessageSquare, UserX, Flame, Calendar, VolumeX, UserCheck, UserPlus, UserMinus } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface UserProfileViewProps {
  targetName: string;
  onClose: () => void;
  onOpenDM?: (name: string) => void;
}

// Fiche profil en lecture seule d'un autre utilisateur
export default function UserProfileView({ targetName, onClose, onOpenDM }: UserProfileViewProps) {
  const { profiles, user } = useChat();
  const { addNotification } = useNotifications();
  const { isFriend, sendFriendRequest, acceptRequestFromSender, rejectRequestFromSender, cancelRequestToRecipient, removeFriend, pendingRequests, outgoingRequests } = useFriends();
  const { isMuted, isBlocked, muteUser, unmuteUser, blockUser, unblockUser } = useMuteBlock();
  const target = profiles[targetName] || { name: targetName, avatar: 'av1', initials: targetName.slice(0, 2).toUpperCase(), level: 1, xp: 0 };

  const lvl      = target.level || 1;
  const badge    = getBadgeForLevel(lvl);
  const unlocked = getUnlockedBadges(lvl);
  const stats    = getBadgeStats();
  const targetSpecialBadges = (target as any)?.specialBadges || [];
  const blocked  = isBlocked(targetName);
  const muted   = isMuted(targetName);
  const friend   = isFriend(targetName);
  const incomingRequest = pendingRequests.find(r => r.user_id === targetName);
  const outgoingRequest = outgoingRequests.find(r => r.friend_id === targetName);

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

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[2000] animate-in fade-in duration-300 p-4" 
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby={`profile-title-${targetName}`}>
      <div 
        className="bg-card border border-border/50 rounded-3xl w-full max-w-[380px] max-h-[90vh] overflow-hidden shadow-[0_32px_96px_rgba(0,0,0,0.5)] animate-in zoom-in-95 duration-300"
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
              <Avatar avatarClass={target.avatar} initials={target.initials} size="lg" />
              <div className="absolute -bottom-2 -right-2">
                <DiamondBadge level={lvl} size="sm" specialBadge={getSpecialBadgeForUser(target) || undefined} />
              </div>
              <GenderIcon gender={(target as any).gender} size={14} className="absolute -top-1 -right-1" />
            </div>
            <div className="flex gap-2 flex-wrap justify-end">
              {user?.name !== targetName && (
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
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[17px] font-bold text-foreground" id={`profile-title-${targetName}`}>{target.name}</span>
              <DiamondBadge level={lvl} size="sm" showLabel specialBadge={getSpecialBadgeForUser(target) || undefined} />
              {targetSpecialBadges.map((specialId: string) => {
                const special = SPECIAL_BADGES.find(b => b.id === specialId);
                return special ? (
                  <span key={specialId} className="text-lg" title={special.label} aria-label={special.label}>{special.icon}</span>
                ) : null;
              })}
            </div>
            {(target as any).joinedAt && (
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground/50">
                <Calendar className="w-3 h-3" aria-hidden="true" />
                Membre depuis {format(new Date((target as any).joinedAt), 'd MMMM yyyy', { locale: fr })}
              </div>
            )}
          </div>

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
