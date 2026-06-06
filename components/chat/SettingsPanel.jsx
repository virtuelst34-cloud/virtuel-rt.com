import React, { useState, useEffect, useRef } from 'react';
import { useUser, useModeration, usePreferences, useXP, useBadges } from '@/lib/contexts';
import Avatar from './Avatar';
import DiamondBadge from './DiamondBadge';
import { getBadgeForLevel, getUnlockedBadges } from '@/lib/diamondBadges';
import { X, User, Palette, Shield, Check, Edit3, Sun, Moon, Flame, Calendar, UserX, Star, PartyPopper, Diamond } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const AVATARS = ['av1', 'av2', 'av3', 'av4', 'av5', 'av6'];
const TABS = [
  { id: 'profile',  label: 'Profil',    icon: User },
  { id: 'theme',    label: 'Apparence', icon: Palette },
  { id: 'blocked',  label: 'Bloqués',   icon: Shield },
  { id: 'premium',  label: 'Premium',   icon: Star },
];

const STATUSES = [
  { id: 'online',  label: 'En ligne',        color: 'bg-emerald-500' },
  { id: 'away',    label: 'Absent',           color: 'bg-amber-500' },
  { id: 'busy',    label: 'Ne pas déranger',  color: 'bg-red-500' },
  { id: 'offline', label: 'Invisible',        color: 'bg-muted-foreground/40' },
];

export default function SettingsPanel({ onClose }) {
  const { user, updateProfile, setStatus } = useUser();
  const { xpProgress, xpForLevel } = useXP();
  const { theme, toggleTheme, partyMode, togglePartyMode, isPremium, activatePremium, accentColor, changeAccent, ACCENT_COLORS } = usePreferences();
  const { blockedUsers, unblockUser } = useModeration();
  const { customBadges } = useBadges();
  const [activeTab, setActiveTab] = useState('profile');
  const [editing, setEditing]     = useState(false);
  const [draft, setDraft]         = useState({ bio: user?.bio || '', avatar: user?.avatar || 'av1', statusText: user?.statusText || '' });
  const [saved, setSaved]         = useState(false);
  const savedTimerRef             = useRef(null);

  useEffect(() => {
    setDraft({ bio: user?.bio || '', avatar: user?.avatar || 'av1' });
  }, [user]);

  if (!user) return null;

  const lvl      = user.level || 1;
  const xp       = user.xp || 0;
  const nextXp   = xpForLevel(lvl);
  const prog     = xpProgress(user);
  const badge    = getBadgeForLevel(lvl, customBadges || []);
  const unlocked = getUnlockedBadges(lvl, customBadges || []);

  const handleSave = () => {
    updateProfile({ bio: draft.bio, avatar: draft.avatar, statusText: draft.statusText });
    setEditing(false);
    setSaved(true);
    clearTimeout(savedTimerRef.current);
    savedTimerRef.current = setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[2000]" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl w-[560px] max-w-[96vw] max-h-[88vh] flex flex-col overflow-hidden shadow-[0_24px_80px_rgba(0,0,0,0.6)]"
        onClick={e => e.stopPropagation()}>

        <div className="px-5 py-4 border-b border-border flex items-center gap-2.5 shrink-0">
          <span className="text-[15px] font-semibold text-foreground flex-1">Paramètres</span>
          {saved && (
            <span className="text-[11px] bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 px-3 py-1 rounded-full flex items-center gap-1.5">
              <Check className="w-3 h-3" /> Sauvegardé
            </span>
          )}
          <button onClick={onClose} className="p-1.5 rounded-lg border border-white/10 text-muted-foreground/60 hover:bg-white/5 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <div className="w-[150px] bg-secondary border-r border-border p-1.5 flex flex-col gap-0.5 shrink-0">
            {TABS.map(tab => {
              const Icon = tab.icon;
              return (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs transition-all border ${activeTab === tab.id ? 'bg-primary/12 border-primary/25 text-primary' : 'border-transparent text-muted-foreground/60 hover:bg-white/[0.04] hover:text-muted-foreground'}`}>
                  <Icon className="w-3.5 h-3.5" />{tab.label}
                </button>
              );
            })}
          </div>

          <div className="flex-1 overflow-y-auto p-5">

            {/* ── Profil ── */}
            {activeTab === 'profile' && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-[13px] font-semibold text-foreground">Mon profil</h3>
                  {!editing
                    ? <button onClick={() => setEditing(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/15 border border-primary/30 text-primary text-xs hover:bg-primary/25 transition-colors">
                        <Edit3 className="w-3.5 h-3.5" /> Modifier
                      </button>
                    : <div className="flex gap-2">
                        <button onClick={() => { setDraft({ bio: user.bio||'', avatar: user.avatar||'av1' }); setEditing(false); }} className="px-3 py-1.5 rounded-lg bg-white/5 border border-border text-muted-foreground text-xs hover:bg-white/10 transition-colors">Annuler</button>
                        <button onClick={handleSave} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs hover:bg-emerald-500/25 transition-colors"><Check className="w-3.5 h-3.5" /> Sauvegarder</button>
                      </div>
                  }
                </div>

                {/* Statut */}
                <div className="mb-4">
                  <div className="text-[10px] text-muted-foreground/50 uppercase tracking-widest mb-2">Statut</div>
                  <div className="flex gap-2 flex-wrap">
                    {STATUSES.map(s => (
                      <button key={s.id} onClick={() => setStatus(s.id)}
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] transition-all ${(user.status || 'online') === s.id ? 'bg-primary/12 border-primary/30 text-primary' : 'bg-secondary border-border text-muted-foreground/60 hover:bg-white/5'}`}>
                        <span className={`w-2 h-2 rounded-full ${s.color}`} />{s.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Avatar */}
                <div className="mb-4">
                  <div className="text-[10px] text-muted-foreground/50 uppercase tracking-widest mb-2">Avatar</div>
                  {editing ? (
                    <div className="flex gap-2 flex-wrap">
                      {AVATARS.map(av => (
                        <button key={av} onClick={() => setDraft(d => ({ ...d, avatar: av }))}
                          className={`rounded-full transition-all ${draft.avatar === av ? 'ring-2 ring-primary scale-110' : 'opacity-60 hover:opacity-100'}`}>
                          <Avatar avatarClass={av} initials={user.initials} size="md" />
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="relative inline-block">
                      <Avatar avatarClass={user.avatar} initials={user.initials} size="lg" />
                      <div className="absolute -bottom-2 -right-2">
                        <DiamondBadge level={lvl} size="sm" />
                      </div>
                    </div>
                  )}
                </div>

                {/* Nom */}
                <div className="mb-4">
                  <div className="text-[10px] text-muted-foreground/50 uppercase tracking-widest mb-1.5">Nom</div>
                  <div className="flex items-center gap-2">
                    <span className="text-[15px] font-bold text-foreground">{user.name}</span>
                    <DiamondBadge level={lvl} size="sm" showLabel />
                    {isPremium && <span className="text-[10px] bg-yellow-500/15 border border-yellow-500/30 text-yellow-400 rounded-full px-2 py-px">PREMIUM</span>}
                  </div>
                  {user.joinedAt && (
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground/50 mt-1">
                      <Calendar className="w-3 h-3" />
                      Membre depuis {format(new Date(user.joinedAt), 'd MMMM yyyy', { locale: fr })}
                    </div>
                  )}
                </div>

                {/* Statut personnalisé */}
                <div className="mb-4">
                  <div className="text-[10px] text-muted-foreground/50 uppercase tracking-widest mb-1.5">Statut personnalisé</div>
                  {editing ? (
                    <input value={draft.statusText} onChange={e => setDraft(d => ({ ...d, statusText: e.target.value }))}
                      maxLength={60} placeholder="Ex: 🎵 En train d'écouter..."
                      className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/40 outline-none focus:border-primary/50 transition-colors" />
                  ) : (
                    <p className="text-sm text-muted-foreground/80 italic">{user.statusText || 'Aucun statut défini.'}</p>
                  )}
                </div>

                {/* Bio */}
                <div className="mb-4">
                  <div className="text-[10px] text-muted-foreground/50 uppercase tracking-widest mb-1.5">Bio</div>
                  {editing ? (
                    <textarea value={draft.bio} onChange={e => setDraft(d => ({ ...d, bio: e.target.value }))}
                      maxLength={160} rows={3} placeholder="Parlez de vous..."
                      className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/40 outline-none focus:border-primary/50 resize-none transition-colors" />
                  ) : (
                    <p className="text-sm text-muted-foreground/80 italic">{user.bio || 'Aucune bio.'}</p>
                  )}
                </div>

                {/* XP */}
                <div className="bg-secondary border border-border rounded-xl p-3.5 mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2"><Flame className="w-4 h-4 text-orange-400" /><span className="text-xs font-semibold text-foreground">Niveau {lvl}</span></div>
                    <span className="text-[11px] text-muted-foreground/50">{xp.toLocaleString()} / {nextXp.toLocaleString()} XP</span>
                  </div>
                  <div className="bg-background rounded-full h-[6px] overflow-hidden">
                    <div className="h-full rounded-full xp-gradient transition-all duration-500" style={{ width: `${prog}%` }} />
                  </div>
                </div>

                {/* Badges */}
                <div>
                  <div className="text-[10px] text-muted-foreground/50 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                    <Diamond className="w-3 h-3 text-indigo-400" /> Badges ({unlocked.length})
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {unlocked.map(b => (
                      <span key={b.id} className="flex items-center gap-1 bg-secondary border rounded-full px-2 py-1 text-[10px] font-medium" style={{ color: b.color, borderColor: b.color + '44' }}>
                        <Diamond className="w-3 h-3 shrink-0" style={{ color: b.color, filter: `drop-shadow(0 0 3px ${b.glow})` }} />{b.label}
                      </span>
                    ))}
                    {unlocked.length === 0 && <span className="text-[11px] text-muted-foreground/40 italic">Aucun badge.</span>}
                  </div>
                </div>
              </div>
            )}

            {/* ── Apparence ── */}
            {activeTab === 'theme' && (
              <div>
                <h3 className="text-[13px] font-semibold text-foreground mb-5">Apparence</h3>

                <div className="text-[10px] text-muted-foreground/50 uppercase tracking-widest mb-3">Thème</div>
                <div className="flex gap-3 mb-6">
                  {[{ id: 'dark', label: 'Sombre', icon: Moon }, { id: 'light', label: 'Clair', icon: Sun }].map(({ id, label, icon: Icon }) => (
                    <button key={id} onClick={() => theme !== id && toggleTheme()}
                      className={`flex-1 flex flex-col items-center gap-2 py-4 rounded-xl border transition-all ${theme === id ? 'bg-primary/12 border-primary/40 text-primary' : 'bg-secondary border-border text-muted-foreground/60 hover:bg-white/5'}`}>
                      <Icon className="w-5 h-5" />
                      <span className="text-xs font-medium">{label}</span>
                      {theme === id && <span className="text-[9px] bg-primary/20 text-primary rounded-full px-2 py-px">Actif</span>}
                    </button>
                  ))}
                </div>

                {/* Mode soirée */}
                <div className="text-[10px] text-muted-foreground/50 uppercase tracking-widest mb-3">Mode soirée 🎉</div>
                <button onClick={togglePartyMode}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${partyMode ? 'bg-pink-500/15 border-pink-500/40 text-pink-400' : 'bg-secondary border-border text-muted-foreground/60 hover:bg-white/5'}`}>
                  <PartyPopper className="w-5 h-5 shrink-0" />
                  <div className="flex-1 text-left">
                    <div className="text-sm font-medium">{partyMode ? '🎊 Mode soirée actif !' : 'Activer le mode soirée'}</div>
                    <div className="text-[10px] opacity-60 mt-0.5">Fond animé, couleurs festives, particules</div>
                  </div>
                  <div className={`w-9 h-5 rounded-full transition-all ${partyMode ? 'bg-pink-500' : 'bg-muted-foreground/20'} relative`}>
                    <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${partyMode ? 'left-4' : 'left-0.5'}`} />
                  </div>
                </button>
              </div>
            )}

            {/* ── Bloqués ── */}
            {activeTab === 'blocked' && (
              <div>
                <h3 className="text-[13px] font-semibold text-foreground mb-5">Utilisateurs bloqués</h3>
                {blockedUsers.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground/40">
                    <Shield className="w-8 h-8" /><p className="text-xs">Aucun utilisateur bloqué</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {blockedUsers.map(name => (
                      <div key={name} className="flex items-center gap-3 bg-secondary border border-border rounded-xl px-3 py-2.5">
                        <UserX className="w-4 h-4 text-muted-foreground/40 shrink-0" />
                        <span className="text-sm text-foreground flex-1">{name}</span>
                        <button onClick={() => unblockUser(name)} className="px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[11px] hover:bg-emerald-500/25 transition-colors">Débloquer</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── Premium ── */}
            {activeTab === 'premium' && (
              <div>
                <h3 className="text-[13px] font-semibold text-foreground mb-5">Compte Premium</h3>
                {isPremium ? (
                  <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-5 text-center">
                    <Star className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-yellow-400 mb-1">Vous êtes Premium !</p>
                    <p className="text-[11px] text-muted-foreground/60">XP x2 activé sur tous vos messages.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-secondary border border-border rounded-xl p-4 space-y-2">
                      {['🎨 Badge Premium exclusif', '⚡ XP x2 par message', '🎵 Accès aux salons VIP', '🌟 Couleur de pseudo personnalisée', '📌 Messages épinglés'].map(f => (
                        <div key={f} className="flex items-center gap-2 text-sm text-muted-foreground/80">
                          <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />{f}
                        </div>
                      ))}
                    </div>
                    <button onClick={activatePremium} className="w-full py-3 rounded-xl premium-gradient text-white font-semibold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-opacity">
                      <Star className="w-4 h-4" /> Activer Premium (démo)
                    </button>
                    <p className="text-[10px] text-muted-foreground/40 text-center">Mode démo — aucun paiement requis</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
