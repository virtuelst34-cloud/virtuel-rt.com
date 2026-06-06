import React, { useState, useRef } from 'react';
import { useChat } from '@/lib/ChatContext';
import Avatar from './Avatar';
import DiamondBadge from './DiamondBadge';
import { getBadgeForLevel, getUnlockedBadges } from '@/lib/diamondBadges';
import { X, Edit3, Check, Flame, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const AVATARS = ['av1', 'av2', 'av3', 'av4', 'av5', 'av6'];

export default function UserProfileModal({ onClose }) {
  const { user, updateProfile, xpProgress, xpForLevel } = useChat();
  const [editing, setEditing]   = useState(false);
  const [draft, setDraft]       = useState({ bio: user?.bio || '', avatar: user?.avatar || 'av1' });
  const [saved, setSaved]       = useState(false);
  const savedTimerRef           = useRef(null);

  if (!user) return null;

  const lvl      = user.level || 1;
  const xp       = user.xp || 0;
  const nextXp   = xpForLevel(lvl);
  const prog     = xpProgress(user);
  const badge    = getBadgeForLevel(lvl);
  const unlocked = getUnlockedBadges(lvl);

  const handleSave = () => {
    updateProfile({ bio: draft.bio, avatar: draft.avatar, initials: user.initials });
    setEditing(false);
    setSaved(true);
    clearTimeout(savedTimerRef.current);
    savedTimerRef.current = setTimeout(() => setSaved(false), 2000);
  };

  const handleCancel = () => {
    setDraft({ bio: user.bio || '', avatar: user.avatar || 'av1' });
    setEditing(false);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[2000]"
      onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl w-[400px] max-w-[95vw] overflow-hidden shadow-[0_24px_80px_rgba(0,0,0,0.6)]"
        onClick={e => e.stopPropagation()}>

        {/* Banner */}
        <div className="h-20 relative" style={{ background: `linear-gradient(135deg, ${badge.color}22, transparent)` }}>
          <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.3), rgba(236,72,153,0.15))' }} />
          <button onClick={onClose}
            className="absolute top-3 right-3 p-1.5 rounded-lg bg-black/30 text-white/60 hover:text-white hover:bg-black/50 transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
          {saved && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-[11px] px-3 py-1 rounded-full flex items-center gap-1.5">
              <Check className="w-3 h-3" /> Profil sauvegardé !
            </div>
          )}
        </div>

        <div className="px-5 pb-5">
          {/* Avatar + nom */}
          <div className="-mt-8 mb-4 flex items-end justify-between">
            <div className="relative">
              {editing ? (
                <div className="flex gap-1.5 flex-wrap">
                  {AVATARS.map(av => (
                    <button key={av} type="button" onClick={() => setDraft(d => ({ ...d, avatar: av }))}
                      className={`rounded-full transition-all ${draft.avatar === av ? 'ring-2 ring-white scale-110' : 'opacity-60 hover:opacity-100'}`}>
                      <Avatar avatarClass={av} initials={user.initials} size="md" />
                    </button>
                  ))}
                </div>
              ) : (
                <>
                  <Avatar avatarClass={user.avatar} initials={user.initials} size="lg" />
                  <div className="absolute -bottom-2 -right-2">
                    <DiamondBadge level={lvl} size="sm" />
                  </div>
                </>
              )}
            </div>

            <div className="flex gap-2 mb-1">
              {!editing ? (
                <button onClick={() => setEditing(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/15 border border-primary/30 text-primary text-xs font-medium hover:bg-primary/25 transition-colors">
                  <Edit3 className="w-3.5 h-3.5" /> Modifier
                </button>
              ) : (
                <>
                  <button onClick={handleCancel}
                    className="px-3 py-1.5 rounded-lg bg-white/5 border border-border text-muted-foreground text-xs hover:bg-white/10 transition-colors">
                    Annuler
                  </button>
                  <button onClick={handleSave}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-medium hover:bg-emerald-500/25 transition-colors">
                    <Check className="w-3.5 h-3.5" /> Sauvegarder
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Nom + date */}
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[17px] font-bold text-foreground">{user.name}</span>
              <DiamondBadge level={lvl} size="sm" showLabel />
            </div>
            {user.joinedAt && (
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground/50">
                <Calendar className="w-3 h-3" />
                Membre depuis {format(new Date(user.joinedAt), 'd MMMM yyyy', { locale: fr })}
              </div>
            )}
          </div>

          {/* Bio */}
          <div className="mb-4">
            <div className="text-[10px] text-muted-foreground/50 uppercase tracking-widest mb-1.5">Bio</div>
            {editing ? (
              <textarea
                value={draft.bio}
                onChange={e => setDraft(d => ({ ...d, bio: e.target.value }))}
                maxLength={160}
                rows={3}
                placeholder="Parlez de vous en quelques mots..."
                className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/40 outline-none focus:border-primary/50 resize-none transition-colors"
              />
            ) : (
              <p className="text-sm text-muted-foreground/80 italic">
                {user.bio || 'Aucune bio — cliquez sur Modifier pour en ajouter une.'}
              </p>
            )}
          </div>

          {/* XP & Niveau */}
          <div className="bg-secondary border border-border rounded-xl p-3.5 mb-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-orange-400" />
                <span className="text-xs font-semibold text-foreground">Niveau {lvl}</span>
              </div>
              <span className="text-[11px] text-muted-foreground/50">{xp.toLocaleString()} / {nextXp.toLocaleString()} XP</span>
            </div>
            <div className="bg-background rounded-full h-[6px] overflow-hidden">
              <div className="h-full rounded-full xp-gradient transition-all duration-500" style={{ width: `${prog}%` }} />
            </div>
            <div className="text-[10px] text-muted-foreground/40 mt-1.5 flex justify-between">
              <span>+{15} XP par message (cooldown 30s)</span>
              <span>{(nextXp - xp).toLocaleString()} XP restants</span>
            </div>
          </div>

          {/* Badges débloqués */}
          <div>
            <div className="text-[10px] text-muted-foreground/50 uppercase tracking-widest mb-2 flex items-center gap-1.5">
              <DiamondBadge level={lvl} size="xs" /> Badges débloqués ({unlocked.length})
            </div>
            <div className="flex flex-wrap gap-2">
              {unlocked.map(b => (
                <span key={b.id}
                  className="flex items-center gap-2 bg-secondary border rounded-xl px-3 py-1.5"
                  style={{ borderColor: b.color + '44', background: b.color + '12' }}>
                  <DiamondBadge level={b.minLevel} size="sm" />
                  <span className="text-[11px] font-semibold" style={{ color: b.color }}>{b.label}</span>
                </span>
              ))}
              {unlocked.length === 0 && (
                <span className="text-[11px] text-muted-foreground/40 italic">Aucun badge débloqué pour l'instant.</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
