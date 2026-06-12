import React from 'react';
import { useChat } from '@/lib/contexts';
import Avatar from './Avatar';
import DiamondBadge from './DiamondBadge';
import { getBadgeForLevel, getUnlockedBadges, getBadgeStats, SPECIAL_BADGES } from '@/lib/diamondBadges';
import { X, MessageSquare, UserX, Flame, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface UserProfileViewProps {
  targetName: string;
  onClose: () => void;
  onOpenDM?: (name: string) => void;
}

// Fiche profil en lecture seule d'un autre utilisateur
export default function UserProfileView({ targetName, onClose, onOpenDM }: UserProfileViewProps) {
  const { profiles, user, blockUser, isBlocked } = useChat();
  const target = profiles[targetName] || { name: targetName, avatar: 'av1', initials: targetName.slice(0, 2).toUpperCase(), level: 1, xp: 0 };

  const lvl      = target.level || 1;
  const badge    = getBadgeForLevel(lvl);
  const unlocked = getUnlockedBadges(lvl);
  const stats    = getBadgeStats();
  const targetSpecialBadges = (target as any)?.specialBadges || [];
  const blocked  = isBlocked(targetName);

  const handleBlock = () => { blockUser(targetName); onClose(); };
  const handleDM    = () => { onClose(); onOpenDM?.(targetName); };

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
        <div className="h-16 relative" style={{ background: `linear-gradient(135deg, ${badge.color}22, transparent)` }}>
          <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.2), rgba(236,72,153,0.1))' }} aria-hidden="true" />
          <button 
            onClick={onClose}
            className="absolute top-3 right-3 p-1.5 rounded-lg bg-black/30 text-white/60 hover:text-white hover:bg-black/50 transition-colors"
            aria-label="Fermer le profil">
            <X className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>

        <div className="px-5 pb-5">
          {/* Avatar + nom */}
          <div className="-mt-7 mb-4 flex items-end justify-between">
            <Avatar avatarClass={target.avatar} initials={target.initials} size="lg" />
            <div className="flex gap-2 mb-1">
              {user?.name !== targetName && (
                <>
                  <button 
                    onClick={handleDM}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/15 border border-primary/30 text-primary text-xs font-medium hover:bg-primary/25 transition-colors"
                    aria-label={`Envoyer un message à ${targetName}`}>
                    <MessageSquare className="w-3.5 h-3.5" aria-hidden="true" /> Message
                  </button>
                  {!blocked ? (
                    <button 
                      onClick={handleBlock}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-medium hover:bg-red-500/20 transition-colors"
                      aria-label={`Bloquer ${targetName}`}>
                      <UserX className="w-3.5 h-3.5" aria-hidden="true" /> Bloquer
                    </button>
                  ) : (
                    <span className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/5 border border-border text-muted-foreground/50 text-xs" role="status" aria-live="polite">
                      <UserX className="w-3.5 h-3.5" aria-hidden="true" /> Bloqué
                    </span>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Nom + badge */}
          <div className="mb-3">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[17px] font-bold text-foreground" id={`profile-title-${targetName}`}>{target.name}</span>
              <DiamondBadge level={lvl} size="sm" showLabel />
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
