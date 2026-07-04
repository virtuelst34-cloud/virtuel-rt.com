import React, { useState, useEffect, useRef, ChangeEvent } from 'react';
import { useUser, usePreferences, useXP, useBadges, useMuteBlock, useFriends } from '@/lib/contexts';
import { supabaseAuthService } from '@/lib/supabaseAuth';
import Avatar from './Avatar';
import DiamondBadge from './DiamondBadge';
import { getBadgeForLevel, getUnlockedBadges } from '@/lib/diamondBadges';
import { X, User, Palette, Shield, Check, Edit3, Sun, Moon, Flame, Calendar, UserX, Star, PartyPopper, Diamond, Minimize2, LucideIcon, Mail, Lock, AlertCircle, Eye, EyeOff, UserCheck, UserPlus, Trophy } from 'lucide-react';
import AchievementsSection from './AchievementsSection';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const AVATARS = ['av1', 'av2', 'av3', 'av4', 'av5', 'av6', 'av7', 'av8', 'av9', 'av10', 'av11', 'av12'] as const;

interface Tab {
  id: string;
  label: string;
  icon: LucideIcon;
}

const TABS: Tab[] = [
  { id: 'profile',  label: 'Profil',    icon: User },
  { id: 'account',  label: 'Compte',    icon: Mail },
  { id: 'theme',    label: 'Apparence', icon: Palette },
  { id: 'friends',  label: 'Amis',      icon: UserCheck },
  { id: 'achievements', label: 'Succès', icon: Trophy },
  { id: 'blocked',  label: 'Bloqués',   icon: Shield },
  { id: 'premium',  label: 'Premium',   icon: Star },
];

interface StatusOption {
  id: string;
  label: string;
  color: string;
}

const STATUSES: StatusOption[] = [
  { id: 'online',  label: 'En ligne',        color: 'bg-emerald-500' },
  { id: 'away',    label: 'Absent',           color: 'bg-amber-500' },
  { id: 'busy',    label: 'Ne pas déranger',  color: 'bg-red-500' },
  { id: 'offline', label: 'Invisible',        color: 'bg-muted-foreground/40' },
];

interface SettingsPanelProps {
  onClose: () => void;
}

export default function SettingsPanel({ onClose }: SettingsPanelProps) {
  const { user, updateProfile, setStatus, supabaseUser, logout } = useUser();
  const { xpProgress, xpForLevel } = useXP();
  const { theme, toggleTheme, partyMode, togglePartyMode, isPremium, activatePremium, accentColor, changeAccent, ACCENT_COLORS, compactMode, toggleCompactMode } = usePreferences();
  const { mutedUsers, blockedUsers, unmuteUser, unblockUser } = useMuteBlock();
  const { friends, pendingRequests, outgoingRequests, acceptFriendRequest, rejectFriendRequest, removeFriend, cancelFriendRequest } = useFriends();
  const { customBadges } = useBadges();
  const [activeTab, setActiveTab] = useState('profile');
  const [editing, setEditing]     = useState(false);
  const [draft, setDraft]         = useState({ 
    bio: user?.bio || '', 
    avatar: user?.avatar || 'av1', 
    statusText: user?.statusText || '',
    name: user?.name || '',
    age: user?.age || '',
    city: user?.city || '',
    gender: user?.gender || 'prefer_not_to_say' as 'male' | 'female' | 'other' | 'prefer_not_to_say'
  });
  const [saved, setSaved]         = useState(false);
  const savedTimerRef             = useRef<number | null>(null);

  // Email linking state
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [linking, setLinking]     = useState(false);
  const [linkError, setLinkError] = useState('');
  const [linkSuccess, setLinkSuccess] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  useEffect(() => {
    setDraft({ 
      bio: user?.bio || '', 
      avatar: user?.avatar || 'av1', 
      statusText: user?.statusText || '',
      name: user?.name || '',
      age: user?.age || '',
      city: user?.city || '',
      gender: user?.gender || 'prefer_not_to_say' as 'male' | 'female' | 'other' | 'prefer_not_to_say'
    });
  }, [user]);

  if (!user) return null;

  const lvl      = user.level || 1;
  const xp       = user.xp || 0;
  const nextXp   = xpForLevel(lvl);
  const prog     = xpProgress(user);
  const badge    = getBadgeForLevel(lvl, customBadges || []);
  const unlocked = getUnlockedBadges(lvl, customBadges || []);
  const currentFriendKeys = [user.name, supabaseUser?.id].filter(Boolean);
  const acceptedFriends = friends
    .filter(f => f.status === 'accepted' && (currentFriendKeys.includes(f.user_id) || currentFriendKeys.includes(f.friend_id)))
    .map(f => currentFriendKeys.includes(f.user_id) ? f.friend_id : f.user_id);

  const handleSave = () => {
    updateProfile({ 
      bio: draft.bio, 
      avatar: draft.avatar, 
      statusText: draft.statusText,
      name: draft.name,
      age: draft.age ? parseInt(draft.age.toString()) : undefined,
      city: draft.city,
      gender: draft.gender
    });
    setEditing(false);
    setSaved(true);
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    savedTimerRef.current = setTimeout(() => setSaved(false), 2000);
  };

  const handleLinkEmail = async () => {
    if (!email || !password) {
      setLinkError('Veuillez remplir tous les champs');
      return;
    }

    setLinking(true);
    setLinkError('');
    setLinkSuccess(false);

    try {
      // Sign up with Supabase (this will create a new account)
      const result = await supabaseAuthService.signUp(email, password, user.name, user.avatar || 'av1');
      
      if (!result.success) {
        setLinkError(result.error || 'Erreur lors de la liaison');
      } else {
        setLinkSuccess(true);
        setEmail('');
        setPassword('');
        // The user will need to verify their email
        setTimeout(() => setLinkSuccess(false), 3000);
      }
    } catch (error: any) {
      setLinkError(error.message || 'Erreur lors de la liaison');
    } finally {
      setLinking(false);
    }
  };

  const handleResendConfirmation = async () => {
    if (!user.email) {
      setLinkError('Aucun email associé à ce compte');
      return;
    }

    setResending(true);
    setLinkError('');
    setResendSuccess(false);

    try {
      const result = await supabaseAuthService.resendConfirmationEmail(user.email);
      
      if (!result.success) {
        setLinkError(result.error || 'Erreur lors de l\'envoi de l\'email');
      } else {
        setResendSuccess(true);
        setTimeout(() => setResendSuccess(false), 3000);
      }
    } catch (error: any) {
      setLinkError(error.message || 'Erreur lors de l\'envoi de l\'email');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[2000] animate-in fade-in duration-300 p-4" onClick={onClose}>
      <div className="bg-card border-2 border-red-500/50 rounded-3xl w-full max-w-[580px] max-h-[90vh] flex flex-col overflow-hidden shadow-[0_32px_96px_rgba(0,0,0,0.5),0_0_0_1px_rgba(239,68,68,0.3)] animate-in zoom-in-95 duration-300"
        onClick={e => e.stopPropagation()}>

        <div className="px-5 py-4 border-b border-border flex items-center gap-2.5 shrink-0">
          <span className="text-[15px] font-semibold text-foreground flex-1">Paramètres</span>
          {saved && (
            <span className="text-[11px] bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 px-3 py-1 rounded-full flex items-center gap-1.5 animate-slide-in-up">
              <Check className="w-3 h-3" /> Sauvegardé
            </span>
          )}
          <button onClick={onClose} className="flex items-center justify-center p-1.5 rounded-lg border border-white/10 text-muted-foreground/60 hover:bg-white/5 hover:text-foreground transition-all duration-200 hover:scale-110 active:scale-95 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <div className="w-[150px] bg-secondary border-r border-border p-1.5 flex flex-col gap-0.5 shrink-0">
            {TABS.map((tab, index) => {
              const Icon = tab.icon;
              return (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs transition-all border ${activeTab === tab.id ? 'bg-primary/12 border-primary/25 text-primary scale-105' : 'border-transparent text-muted-foreground/60 hover:bg-white/[0.04] hover:text-muted-foreground hover:scale-[1.02]'} animate-slide-in-right`}
                  style={{ animationDelay: `${index * 50}ms` }}>
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
                    ? <button onClick={() => setEditing(true)} className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/15 border border-primary/30 text-primary text-xs hover:bg-primary/25 transition-all active:scale-95 cursor-pointer">
                        <Edit3 className="w-3.5 h-3.5" /> Modifier
                      </button>
                    : <div className="flex gap-2">
                        <button onClick={() => { 
                          setDraft({ 
                            bio: user.bio||'', 
                            avatar: user.avatar||'av1', 
                            statusText: user.statusText||'',
                            name: user.name||'',
                            age: user.age||'',
                            city: user.city||'',
                            gender: user.gender||'prefer_not_to_say' as 'male' | 'female' | 'other' | 'prefer_not_to_say'
                          }); 
                          setEditing(false); 
                        }} className="flex items-center justify-center px-3 py-1.5 rounded-lg bg-white/5 border border-border text-muted-foreground text-xs hover:bg-white/10 transition-all active:scale-95 cursor-pointer">Annuler</button>
                        <button onClick={handleSave} className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs hover:bg-emerald-500/25 transition-all active:scale-95 cursor-pointer"><Check className="w-3.5 h-3.5 pointer-events-none" /> Sauvegarder</button>
                      </div>
                  }
                </div>

                {/* Statut */}
                <div className="mb-4">
                  <div className="text-[10px] text-muted-foreground/50 uppercase tracking-widest mb-2">Statut</div>
                  <div className="flex gap-2 flex-wrap">
                    {STATUSES.map((s, index) => (
                      <button key={s.id} onClick={() => setStatus(s.id as any)}
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] transition-all duration-200 hover:scale-105 active:scale-95 ${(user.status || 'online') === s.id ? 'bg-primary/12 border-primary/30 text-primary' : 'bg-secondary border-border text-muted-foreground/60 hover:bg-white/5'}`}
                        style={{ animationDelay: `${index * 50}ms` }}>
                        <span className={`w-2 h-2 rounded-full ${s.color}`}/>{s.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Avatar */}
                <div className="mb-4">
                  <div className="text-[10px] text-muted-foreground/50 uppercase tracking-widest mb-2">Avatar</div>
                  {editing ? (
                    <div className="grid grid-cols-6 gap-2.5 max-w-[260px]">
                      {AVATARS.map((av, index) => (
                        <button key={av} onClick={() => setDraft(d => ({ ...d, avatar: av }))}
                          className={`rounded-full transition-all duration-200 hover:scale-110 active:scale-95 ${draft.avatar === av ? 'ring-2 ring-primary ring-offset-2 ring-offset-background scale-110' : 'opacity-60 hover:opacity-100'}`}
                          style={{ animationDelay: `${index * 30}ms` }}>
                          <Avatar avatarClass={av} initials={user.initials} size="md" />
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="relative inline-block transition-transform duration-200 hover:scale-110">
                      <Avatar avatarClass={user.avatar} initials={user.initials} size="lg" />
                      <div className="absolute -bottom-2 -right-2 animate-float">
                        <DiamondBadge level={lvl} size="sm" />
                      </div>
                    </div>
                  )}
                </div>

                {/* Nom */}
                <div className="mb-4">
                  <div className="text-[10px] text-muted-foreground/50 uppercase tracking-widest mb-1.5">Pseudo</div>
                  {editing ? (
                    <input 
                      value={draft.name} 
                      onChange={e => setDraft(d => ({ ...d, name: e.target.value }))}
                      maxLength={20}
                      placeholder="Votre pseudo"
                      className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/40 outline-none focus:border-primary/50 focus:shadow-lg focus:shadow-primary/10 transition-all duration-200" 
                    />
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-[15px] font-bold text-foreground">{user.name}</span>
                      <DiamondBadge level={lvl} size="sm" showLabel />
                      {isPremium && <span className="text-[10px] bg-yellow-500/15 border border-yellow-500/30 text-yellow-400 rounded-full px-2 py-px animate-pulse">PREMIUM</span>}
                    </div>
                  )}
                  {user.joinedAt && !editing && (
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground/50 mt-1">
                      <Calendar className="w-3 h-3" />
                      Membre depuis {format(new Date(user.joinedAt), 'd MMMM yyyy', { locale: fr })}
                    </div>
                  )}
                </div>

                {/* Informations personnelles */}
                <div className="mb-4 grid grid-cols-2 gap-3">
                  {/* Âge */}
                  <div>
                    <div className="text-[10px] text-muted-foreground/50 uppercase tracking-widest mb-1.5">Âge</div>
                    {editing ? (
                      <input 
                        type="number"
                        value={draft.age}
                        onChange={e => setDraft(d => ({ ...d, age: e.target.value }))}
                        min={13}
                        max={120}
                        placeholder="Âge"
                        className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/40 outline-none focus:border-primary/50 focus:shadow-lg focus:shadow-primary/10 transition-all duration-200" 
                      />
                    ) : (
                      <span className="text-sm text-muted-foreground/80">{user.age ? `${user.age} ans` : 'Non renseigné'}</span>
                    )}
                  </div>

                  {/* Ville */}
                  <div>
                    <div className="text-[10px] text-muted-foreground/50 uppercase tracking-widest mb-1.5">Ville</div>
                    {editing ? (
                      <input 
                        value={draft.city}
                        onChange={e => setDraft(d => ({ ...d, city: e.target.value }))}
                        maxLength={50}
                        placeholder="Votre ville"
                        className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/40 outline-none focus:border-primary/50 focus:shadow-lg focus:shadow-primary/10 transition-all duration-200" 
                      />
                    ) : (
                      <span className="text-sm text-muted-foreground/80">{user.city || 'Non renseigné'}</span>
                    )}
                  </div>
                </div>

                {/* Sexe */}
                <div className="mb-4">
                  <div className="text-[10px] text-muted-foreground/50 uppercase tracking-widest mb-1.5">Sexe</div>
                  {editing ? (
                    <div className="flex gap-2">
                      {[
                        { id: 'male', label: 'Homme' },
                        { id: 'female', label: 'Femme' },
                        { id: 'other', label: 'Autre' },
                        { id: 'prefer_not_to_say', label: 'Ne pas dire' }
                      ].map((option) => (
                        <button
                          key={option.id}
                          onClick={() => setDraft(d => ({ ...d, gender: option.id as any }))}
                          className={`flex-1 px-3 py-2 rounded-lg border text-xs transition-all duration-200 ${
                            draft.gender === option.id 
                              ? 'bg-primary/15 border-primary/30 text-primary' 
                              : 'bg-secondary border-border text-muted-foreground/60 hover:bg-white/5'
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground/80">
                      {user.gender === 'male' ? 'Homme' : 
                       user.gender === 'female' ? 'Femme' : 
                       user.gender === 'other' ? 'Autre' : 
                       'Non renseigné'}
                    </span>
                  )}
                </div>

                {/* Statut personnalisé */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="text-[10px] text-muted-foreground/50 uppercase tracking-widest">Statut personnalisé</div>
                    {editing && <div className="text-[10px] text-muted-foreground/40">{draft.statusText.length}/60</div>}
                  </div>
                  {editing ? (
                    <input value={draft.statusText} onChange={e => setDraft(d => ({ ...d, statusText: e.target.value }))}
                      maxLength={60} placeholder="Ex: 🎵 En train d'écouter..."
                      className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/40 outline-none focus:border-primary/50 focus:shadow-lg focus:shadow-primary/10 transition-all duration-200" />
                  ) : (
                    <p className="text-sm text-muted-foreground/80 italic">{user.statusText || 'Aucun statut défini.'}</p>
                  )}
                </div>

                {/* Bio */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="text-[10px] text-muted-foreground/50 uppercase tracking-widest">Bio</div>
                    {editing && <div className="text-[10px] text-muted-foreground/40">{draft.bio.length}/160</div>}
                  </div>
                  {editing ? (
                    <textarea value={draft.bio} onChange={e => setDraft(d => ({ ...d, bio: e.target.value }))}
                      maxLength={160} rows={3} placeholder="Parlez de vous..."
                      className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/40 outline-none focus:border-primary/50 focus:shadow-lg focus:shadow-primary/10 resize-none transition-all duration-200" />
                  ) : (
                    <p className="text-sm text-muted-foreground/80 italic">{user.bio || 'Aucune bio.'}</p>
                  )}
                </div>

                {/* XP */}
                <div className="bg-secondary border border-border rounded-xl p-3.5 mb-4 transition-all duration-200 hover:scale-[1.01] hover:shadow-lg hover:shadow-primary/10">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2"><Flame className="w-4 h-4 text-orange-400 animate-pulse"/><span className="text-xs font-semibold text-foreground">Niveau {lvl}</span></div>
                    <span className="text-[11px] text-muted-foreground/50">{xp.toLocaleString()} / {nextXp.toLocaleString()} XP</span>
                  </div>
                  <div className="bg-background rounded-full h-[6px] overflow-hidden">
                    <div className="h-full rounded-full xp-gradient transition-all duration-500" style={{ width: `${prog}%` }} />
                  </div>
                </div>

                {/* Badges */}
                <div>
                  <div className="text-[10px] text-muted-foreground/50 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                    <Diamond className="w-3 h-3 text-indigo-400 animate-float" /> Badges ({unlocked.length})
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {unlocked.map((b, index) => (
                      <span key={b.id} className="flex items-center gap-1 bg-secondary border rounded-full px-2 py-1 text-[10px] font-medium transition-all duration-200 hover:scale-110 hover:shadow-lg hover:shadow-indigo-500/20" style={{ color: b.color, borderColor: b.color + '44', animationDelay: `${index * 30}ms` }}>
                        <Diamond className="w-3 h-3 shrink-0" style={{ color: b.color, filter: `drop-shadow(0 0 3px ${b.glow})` }} />{b.label}
                      </span>
                    ))}
                    {unlocked.length === 0 && <span className="text-[11px] text-muted-foreground/40 italic">Aucun badge.</span>}
                  </div>
                </div>
              </div>
            )}

            {/* ── Compte ── */}
            {activeTab === 'account' && (
              <div>
                <h3 className="text-[13px] font-semibold text-foreground mb-5">Compte</h3>

                {/* Statut du compte */}
                <div className="bg-secondary border border-border rounded-xl p-4 mb-4">
                  <div className="flex items-center gap-3 mb-3">
                    {supabaseUser ? (
                      <div className="flex items-center gap-2 text-emerald-400">
                        <Check className="w-5 h-5" />
                        <span className="text-sm font-medium">Compte connecté</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-amber-400">
                        <AlertCircle className="w-5 h-5" />
                        <span className="text-sm font-medium">Mode invité</span>
                      </div>
                    )}
                  </div>

                  {supabaseUser ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground/60">
                        <Mail className="w-3.5 h-3.5" />
                        <span>{user.email || 'Email non disponible'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground/60">
                        <User className="w-3.5 h-3.5" />
                        <span>{user.name}</span>
                      </div>
                      {!user.emailVerified && user.email && (
                        <div className="mt-3">
                          {resendSuccess ? (
                            <div className="bg-emerald-500/15 border border-emerald-500/30 rounded-lg p-2 text-xs text-emerald-400 flex items-center gap-2">
                              <Check className="w-3.5 h-3.5 shrink-0" />
                              Email de confirmation renvoyé !
                            </div>
                          ) : (
                            <button
                              onClick={handleResendConfirmation}
                              disabled={resending}
                              className="w-full py-2 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs flex items-center justify-center gap-2 hover:bg-amber-500/25 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {resending ? (
                                <>
                                  <div className="w-3 h-3 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
                                  Envoi en cours...
                                </>
                              ) : (
                                <>
                                  <Mail className="w-3.5 h-3.5" />
                                  Renvoyer l'email de confirmation
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      )}
                      <div className="mt-3 pt-3 border-t border-border">
                        <button
                          onClick={logout}
                          className="w-full py-2 rounded-lg bg-red-500/15 border border-red-500/30 text-red-400 text-xs flex items-center justify-center gap-2 hover:bg-red-500/25 transition-all duration-200"
                        >
                          <UserX className="w-3.5 h-3.5" />
                          Se déconnecter
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground/60">
                      <p className="mb-2">Vous êtes en mode invité. Vos données sont stockées localement.</p>
                      <p>Liez votre compte à un email pour synchroniser vos données sur tous vos appareils.</p>
                    </div>
                  )}
                </div>

                {/* Formulaire de liaison email (pour invités) */}
                {!supabaseUser && (
                  <div className="bg-secondary/50 border border-border rounded-xl p-4">
                    <div className="text-[10px] text-muted-foreground/50 uppercase tracking-widest mb-3">Lier un email</div>
                    
                    {linkSuccess ? (
                      <div className="bg-emerald-500/15 border border-emerald-500/30 rounded-lg p-3 text-center">
                        <Check className="w-5 h-5 text-emerald-400 mx-auto mb-2" />
                        <p className="text-sm text-emerald-400">Compte créé ! Vérifiez votre email pour activer votre compte.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div>
                          <label className="text-[10px] text-muted-foreground/50 uppercase tracking-widest mb-1.5 block">Email</label>
                          <input
                            type="email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            placeholder="votre@email.com"
                            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/40 outline-none focus:border-primary/50 focus:shadow-lg focus:shadow-primary/10 transition-all duration-200"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-muted-foreground/50 uppercase tracking-widest mb-1.5 block">Mot de passe</label>
                          <div className="relative">
                            <input
                              type={showPassword ? 'text' : 'password'}
                              value={password}
                              onChange={e => setPassword(e.target.value)}
                              placeholder="••••••••"
                              className="w-full bg-background border border-border rounded-lg px-3 py-2 pr-10 text-sm text-foreground placeholder:text-muted-foreground/40 outline-none focus:border-primary/50 focus:shadow-lg focus:shadow-primary/10 transition-all duration-200"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                            >
                              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>
                        {linkError && (
                          <div className="bg-red-500/15 border border-red-500/30 rounded-lg p-2 text-xs text-red-400 flex items-center gap-2">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                            {linkError}
                          </div>
                        )}
                        <button
                          onClick={handleLinkEmail}
                          disabled={linking}
                          className="w-full py-2.5 rounded-lg bg-primary text-white font-medium text-sm flex items-center justify-center gap-2 hover:bg-primary/80 transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {linking ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              Création en cours...
                            </>
                          ) : (
                            <>
                              <Mail className="w-4 h-4" />
                              Créer un compte
                            </>
                          )}
                        </button>
                        <p className="text-[10px] text-muted-foreground/40 text-center">
                          En créant un compte, vous acceptez nos conditions d'utilisation.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Persistance invité */}
                {!supabaseUser && (
                  <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-xl p-4 mt-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Lock className="w-4 h-4 text-indigo-400" />
                      <span className="text-xs font-semibold text-indigo-400">Persistance invité</span>
                    </div>
                    <p className="text-xs text-muted-foreground/70">
                      Votre session invité persiste pendant 30 minutes après fermeture. Vous retrouverez votre compte automatiquement si vous revenez dans ce délai.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* ── Apparence ── */}
            {activeTab === 'theme' && (
              <div>
                <h3 className="text-[13px] font-semibold text-foreground mb-5">Apparence</h3>

                <div className="text-[10px] text-muted-foreground/50 uppercase tracking-widest mb-3">Thème</div>
                <div className="flex gap-3 mb-6">
                  {[{ id: 'dark', label: 'Sombre', icon: Moon }, { id: 'light', label: 'Clair', icon: Sun }].map(({ id, label, icon: Icon }, index) => (
                    <button key={id} onClick={() => theme !== id && toggleTheme()}
                      className={`flex-1 flex flex-col items-center gap-2 py-4 rounded-xl border transition-all duration-200 hover:scale-105 active:scale-95 ${theme === id ? 'bg-primary/12 border-primary/40 text-primary scale-105' : 'bg-secondary border-border text-muted-foreground/60 hover:bg-white/5'}`}
                      style={{ animationDelay: `${index * 50}ms` }}>
                      <Icon className="w-5 h-5" />
                      <span className="text-xs font-medium">{label}</span>
                      {theme === id && <span className="text-[9px] bg-primary/20 text-primary rounded-full px-2 py-px animate-pulse">Actif</span>}
                    </button>
                  ))}
                </div>

                {/* Couleur d'accent */}
                <div className="text-[10px] text-muted-foreground/50 uppercase tracking-widest mb-3 mt-6">Couleur d'accent</div>
                <div className="flex gap-2.5 flex-wrap">
                  {ACCENT_COLORS.map((c, index) => (
                    <button key={c.id} onClick={() => changeAccent(c.id)}
                      title={c.label}
                      className={`flex flex-col items-center gap-1.5 transition-all duration-200 hover:scale-110 active:scale-95 ${accentColor === c.id ? 'scale-110' : 'opacity-70 hover:opacity-100'}`}
                      style={{ animationDelay: `${index * 30}ms` }}>
                      <span
                        className={`w-8 h-8 rounded-full border-2 transition-all duration-200 ${accentColor === c.id ? 'border-foreground shadow-lg shadow-primary/30' : 'border-border'}`}
                        style={{ backgroundColor: `hsl(${c.value})` }}
                      />
                      <span className="text-[9px] text-muted-foreground/60">{c.label}</span>
                    </button>
                  ))}
                </div>

                {/* Mode soirée */}
                <div className="text-[10px] text-muted-foreground/50 uppercase tracking-widest mb-3">Mode soirée 🎉</div>
                <button onClick={togglePartyMode}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] ${partyMode ? 'bg-pink-500/15 border-pink-500/40 text-pink-400' : 'bg-secondary border-border text-muted-foreground/60 hover:bg-white/5'}`}>
                  <PartyPopper className="w-5 h-5 shrink-0" />
                  <div className="flex-1 text-left">
                    <div className="text-sm font-medium">{partyMode ? '🎊 Mode soirée actif !' : 'Activer le mode soirée'}</div>
                    <div className="text-[10px] opacity-60 mt-0.5">Fond animé, couleurs festives, particules</div>
                  </div>
                  <div className={`w-9 h-5 rounded-full transition-all duration-300 ${partyMode ? 'bg-pink-500' : 'bg-muted-foreground/20'} relative`}>
                    <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all duration-300 ${partyMode ? 'left-4' : 'left-0.5'}`} />
                  </div>
                </button>

                {/* Mode compact */}
                <div className="text-[10px] text-muted-foreground/50 uppercase tracking-widest mb-3 mt-6">Mode compact</div>
                <button onClick={toggleCompactMode}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] ${compactMode ? 'bg-indigo-500/15 border-indigo-500/40 text-indigo-400' : 'bg-secondary border-border text-muted-foreground/60 hover:bg-white/5'}`}>
                  <Minimize2 className="w-5 h-5 shrink-0" />
                  <div className="flex-1 text-left">
                    <div className="text-sm font-medium">{compactMode ? 'Mode compact actif' : 'Activer le mode compact'}</div>
                    <div className="text-[10px] opacity-60 mt-0.5">Affichage plus dense des messages</div>
                  </div>
                  <div className={`w-9 h-5 rounded-full transition-all duration-300 ${compactMode ? 'bg-indigo-500' : 'bg-muted-foreground/20'} relative`}>
                    <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all duration-300 ${compactMode ? 'left-4' : 'left-0.5'}`} />
                  </div>
                </button>
              </div>
            )}

            {/* ── Bloqués ── */}
            {activeTab === 'friends' && (
              <div>
                <h3 className="text-[13px] font-semibold text-foreground mb-5">Amis et demandes</h3>

                <div className="space-y-5">
                  <div>
                    <div className="text-[10px] text-muted-foreground/50 uppercase tracking-widest mb-2">Demandes reçues</div>
                    {pendingRequests.length === 0 ? (
                      <p className="text-xs text-muted-foreground/45 bg-secondary border border-border rounded-xl px-3 py-3">Aucune demande reçue.</p>
                    ) : (
                      <div className="space-y-2">
                        {pendingRequests.map(req => (
                          <div key={req.id} className="flex items-center gap-3 bg-secondary border border-border rounded-xl px-3 py-2.5">
                            <UserPlus className="w-4 h-4 text-blue-400 shrink-0" />
                            <span className="text-sm text-foreground flex-1">{req.user_id}</span>
                            <button onClick={() => acceptFriendRequest(req.id)} className="flex items-center justify-center px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[11px] hover:bg-emerald-500/25 transition-all active:scale-95 cursor-pointer">Accepter</button>
                            <button onClick={() => rejectFriendRequest(req.id)} className="flex items-center justify-center px-2.5 py-1 rounded-lg bg-red-500/10 border border-red-500/25 text-red-300 text-[11px] hover:bg-red-500/20 transition-all active:scale-95 cursor-pointer">Refuser</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="text-[10px] text-muted-foreground/50 uppercase tracking-widest mb-2">Demandes envoyées</div>
                    {outgoingRequests.length === 0 ? (
                      <p className="text-xs text-muted-foreground/45 bg-secondary border border-border rounded-xl px-3 py-3">Aucune demande envoyée.</p>
                    ) : (
                      <div className="space-y-2">
                        {outgoingRequests.map(req => (
                          <div key={req.id} className="flex items-center gap-3 bg-secondary border border-border rounded-xl px-3 py-2.5">
                            <UserPlus className="w-4 h-4 text-muted-foreground/50 shrink-0" />
                            <span className="text-sm text-foreground flex-1">{req.friend_id}</span>
                            <span className="text-[10px] text-muted-foreground/55">En attente</span>
                            <button onClick={() => cancelFriendRequest(req.id)} className="flex items-center justify-center px-2.5 py-1 rounded-lg bg-red-500/10 border border-red-500/25 text-red-300 text-[11px] hover:bg-red-500/20 transition-all active:scale-95 cursor-pointer">Annuler</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="text-[10px] text-muted-foreground/50 uppercase tracking-widest mb-2">Amis</div>
                    {acceptedFriends.length === 0 ? (
                      <p className="text-xs text-muted-foreground/45 bg-secondary border border-border rounded-xl px-3 py-3">Aucun ami pour le moment.</p>
                    ) : (
                      <div className="space-y-2">
                        {[...new Set(acceptedFriends)].map(name => (
                          <div key={name} className="flex items-center gap-3 bg-secondary border border-border rounded-xl px-3 py-2.5">
                            <UserCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                            <span className="text-sm text-foreground flex-1">{name}</span>
                            <button onClick={() => removeFriend(name)} className="flex items-center justify-center px-2.5 py-1 rounded-lg bg-red-500/10 border border-red-500/25 text-red-300 text-[11px] hover:bg-red-500/20 transition-all active:scale-95 cursor-pointer">Retirer</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'achievements' && (
              <AchievementsSection userId={user.name} />
            )}

            {activeTab === 'blocked' && (
              <div>
                <h3 className="text-[13px] font-semibold text-foreground mb-5">Utilisateurs masqués</h3>
                {blockedUsers.length === 0 && mutedUsers.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground/40">
                    <Shield className="w-8 h-8 animate-float" /><p className="text-xs">Aucun utilisateur masqué</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {[...new Set([...blockedUsers, ...mutedUsers])].map((name, index) => {
                      const blocked = blockedUsers.includes(name);
                      const muted = mutedUsers.includes(name);
                      return (
                      <div key={name} className="flex items-center gap-3 bg-secondary border border-border rounded-xl px-3 py-2.5 transition-all duration-200 hover:scale-[1.01] animate-slide-in-up"
                        style={{ animationDelay: `${index * 50}ms` }}>
                        <UserX className="w-4 h-4 text-muted-foreground/40 shrink-0" />
                        <span className="text-sm text-foreground flex-1">{name}</span>
                        <span className="text-[10px] text-muted-foreground/60">{blocked ? 'Bloqué' : 'Muet'}</span>
                        {muted && <button onClick={() => unmuteUser(name)} className="flex items-center justify-center px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[11px] hover:bg-emerald-500/25 transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer">Réactiver</button>}
                        {blocked && <button onClick={() => unblockUser(name)} className="flex items-center justify-center px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[11px] hover:bg-emerald-500/25 transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer">Débloquer</button>}
                      </div>
                    );})}
                  </div>
                )}
              </div>
            )}

            {/* ── Premium ── */}
            {activeTab === 'premium' && (
              <div>
                <h3 className="text-[13px] font-semibold text-foreground mb-5">Compte Premium</h3>
                {isPremium ? (
                  <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-5 text-center transition-all duration-200 hover:scale-[1.01] hover:shadow-lg hover:shadow-yellow-500/20">
                    <Star className="w-8 h-8 text-yellow-400 mx-auto mb-2 animate-float" />
                    <p className="text-sm font-semibold text-yellow-400 mb-1">Vous êtes Premium !</p>
                    <p className="text-[11px] text-muted-foreground/60">XP x2 activé sur tous vos messages.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-secondary border border-border rounded-xl p-4 space-y-2">
                      {['🎨 Badge Premium exclusif', '⚡ XP x2 par message', '🎵 Accès aux salons VIP', '🌟 Couleur de pseudo personnalisée', '📌 Messages épinglés'].map((f, index) => (
                        <div key={f} className="flex items-center gap-2 text-sm text-muted-foreground/80 transition-all duration-200 hover:scale-[1.01]"
                          style={{ animationDelay: `${index * 50}ms` }}>
                          <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />{f}
                        </div>
                      ))}
                    </div>
                    <button onClick={activatePremium} className="w-full py-3 rounded-xl premium-gradient text-white font-semibold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] cursor-pointer">
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
