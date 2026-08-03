import React, { useState, useEffect, useRef, ChangeEvent } from 'react';
import { useUser, usePreferences, useXP, useBadges, useMuteBlock, useFriends, useNotifications } from '@/lib/contexts';
import { supabaseAuthService } from '@/lib/supabaseAuth';
import Avatar from './Avatar';
import DiamondBadge from './DiamondBadge';
import UserDisplayName from './UserDisplayName';
import { getBadgeForLevel, getUnlockedBadges } from '@/lib/diamondBadges';
import { X, User, Palette, Shield, Check, Edit3, Sun, Moon, Flame, Calendar, UserX, Star, PartyPopper, Diamond, Minimize2, LucideIcon, Mail, Lock, AlertCircle, Eye, EyeOff, UserCheck, UserPlus, Trophy, MessageSquare, Scale, Zap, Bookmark, Smartphone } from 'lucide-react';
import AchievementsSection from './AchievementsSection';
import TwoFactorSection from './TwoFactorSection';
import DailySparkCard from './DailySparkCard';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { AVATAR_IDS } from '@/lib/chatConfig';
import { supabase } from '@/lib/supabase';
import {
  MOOD_OPTIONS,
  getMood,
  setMood,
  getSignature,
  setSignature,
  getQuickReplies,
  setQuickReplies,
  getBookmarks,
  type MoodId,
  type QuickReply,
} from '@/lib/funFeatures';
import { Link } from 'react-router-dom';
import { MENTIONS_LEGALES_HREF } from '@/lib/welcomeContent';

interface Tab {
  id: string;
  label: string;
  icon: LucideIcon;
}

const TABS: Tab[] = [
  { id: 'profile',  label: 'Profil',    icon: User },
  { id: 'account',  label: 'Compte',    icon: Mail },
  { id: 'theme',    label: 'Apparence', icon: Palette },
  { id: 'extras',   label: 'Extras',    icon: Zap },
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
  { id: 'online',    label: 'En ligne',        color: 'bg-emerald-500' },
  { id: 'away',      label: 'Absent',           color: 'bg-amber-500' },
  { id: 'busy',      label: 'Ne pas déranger',  color: 'bg-red-500' },
  { id: 'invisible', label: 'Invisible',        color: 'bg-slate-500' },
  { id: 'offline',   label: 'Hors ligne',       color: 'bg-muted-foreground/40' },
];

interface SettingsPanelProps {
  onClose: () => void;
  initialTab?: string;
  onOpenDM?: (name: string) => void;
  onViewProfile?: (name: string) => void;
}

export default function SettingsPanel({ onClose, initialTab, onOpenDM, onViewProfile }: SettingsPanelProps) {
  const { user, updateProfile, setStatus, supabaseUser, logout, loginWithSupabase } = useUser();
  const { xpProgress, xpForLevel } = useXP();
  const { theme, toggleTheme, partyMode, togglePartyMode, isPremium, activatePremium, accentColor, changeAccent, ACCENT_COLORS, compactMode, toggleCompactMode, ambianceMode, setAmbianceMode, AMBIANCE_OPTIONS, coquinMode, toggleCoquinMode } = usePreferences();
  const { mutedUsers, blockedUsers, unmuteUser, unblockUser } = useMuteBlock();
  const { friends, pendingRequests, outgoingRequests, acceptRequestFromSender, rejectRequestFromSender, removeFriend, cancelRequestToRecipient, reloadFriends } = useFriends();
  const { addNotification } = useNotifications();
  const { customBadges } = useBadges();
  const [activeTab, setActiveTab] = useState(initialTab || 'profile');
  const [friendsFeedback, setFriendsFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [accountMode, setAccountMode] = useState<'create' | 'login'>('create');
  const [editing, setEditing]     = useState(false);
  const [draft, setDraft]         = useState({ 
    bio: user?.bio || '', 
    avatar: user?.avatar || 'av1', 
    statusText: user?.statusText || '',
    name: user?.name || '',
    age: user?.age || '',
    city: user?.city || '',
    gender: user?.gender || 'prefer_not_to_say' as 'male' | 'female' | 'other' | 'prefer_not_to_say',
    mood: (user?.name ? getMood(user.name) : 'off') as MoodId,
    signature: user?.name ? getSignature(user.name) : '',
  });
  const [quickRepliesDraft, setQuickRepliesDraft] = useState<QuickReply[]>(() => getQuickReplies(user?.name));
  const [newReplyLabel, setNewReplyLabel] = useState('');
  const [newReplyText, setNewReplyText] = useState('');
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
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [alertPrefs, setAlertPrefs] = useState({
    phone_number: '',
    phone_consent: false,
    notify_mod_app: true,
    notify_mod_email: true,
    notify_mod_sms: false,
  });
  const [alertPrefsSaving, setAlertPrefsSaving] = useState(false);
  const [alertPrefsMsg, setAlertPrefsMsg] = useState<string | null>(null);

  useEffect(() => {
    if (initialTab) setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    if (activeTab === 'friends') void reloadFriends();
  }, [activeTab, reloadFriends]);

  useEffect(() => {
    if (!supabaseUser?.id) return;
    let active = true;
    void (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('phone_number, phone_consent, notify_mod_app, notify_mod_email, notify_mod_sms')
        .eq('id', supabaseUser.id)
        .maybeSingle();
      if (!active || !data) return;
      setAlertPrefs({
        phone_number: data.phone_number || '',
        phone_consent: !!data.phone_consent,
        notify_mod_app: data.notify_mod_app !== false,
        notify_mod_email: data.notify_mod_email !== false,
        notify_mod_sms: !!data.notify_mod_sms,
      });
    })();
    return () => { active = false; };
  }, [supabaseUser?.id]);

  useEffect(() => {
    setDraft({ 
      bio: user?.bio || '', 
      avatar: user?.avatar || 'av1', 
      statusText: user?.statusText || '',
      name: user?.name || '',
      age: user?.age || '',
      city: user?.city || '',
      gender: user?.gender || 'prefer_not_to_say' as 'male' | 'female' | 'other' | 'prefer_not_to_say',
      mood: (user?.name ? getMood(user.name) : 'off') as MoodId,
      signature: user?.name ? getSignature(user.name) : '',
    });
  }, [user]);

  const saveAlertPrefs = async () => {
    if (!supabaseUser?.id) return;
    if (alertPrefs.notify_mod_sms && (!alertPrefs.phone_consent || !alertPrefs.phone_number.trim())) {
      setAlertPrefsMsg('Consentement et numéro requis pour les SMS.');
      return;
    }
    setAlertPrefsSaving(true);
    setAlertPrefsMsg(null);
    const { error } = await supabase
      .from('profiles')
      .update({
        phone_number: alertPrefs.phone_number.trim() || null,
        phone_consent: alertPrefs.phone_consent,
        notify_mod_app: alertPrefs.notify_mod_app,
        notify_mod_email: alertPrefs.notify_mod_email,
        notify_mod_sms: alertPrefs.notify_mod_sms && alertPrefs.phone_consent,
      })
      .eq('id', supabaseUser.id);
    setAlertPrefsSaving(false);
    setAlertPrefsMsg(error ? 'Erreur lors de la sauvegarde.' : 'Préférences d\'alerte enregistrées.');
  };

  if (!user) return null;

  const lvl      = user.level || 1;
  const xp       = user.xp || 0;
  const nextXp   = xpForLevel(lvl);
  const prog     = xpProgress(user);
  const badge    = getBadgeForLevel(lvl, customBadges || []);
  const unlocked = getUnlockedBadges(lvl, customBadges || []);
  const acceptedFriends = friends
    .filter(f => f.status === 'accepted' && (f.user_id === user.name || f.friend_id === user.name))
    .map(f => f.user_id === user.name ? f.friend_id : f.user_id);

  const runFriendAction = async (action: () => Promise<void>, successMessage: string) => {
    setFriendsFeedback(null);
    try {
      await action();
      await reloadFriends();
      setFriendsFeedback({ type: 'success', message: successMessage });
      addNotification({ type: 'system', message: successMessage });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Action impossible';
      setFriendsFeedback({ type: 'error', message });
      addNotification({ type: 'system', message });
    }
  };

  const handleSave = () => {
    const ageNum = draft.age ? parseInt(draft.age.toString(), 10) : undefined;
    if (ageNum != null && (!Number.isFinite(ageNum) || ageNum < 18 || ageNum > 120)) {
      addNotification({ type: 'system', message: 'L’âge doit être entre 18 et 120 ans (service 18+).' });
      return;
    }
    updateProfile({ 
      bio: draft.bio, 
      avatar: draft.avatar, 
      statusText: draft.statusText,
      name: draft.name,
      age: ageNum,
      city: draft.city,
      gender: draft.gender
    });
    setMood(draft.name || user.name, draft.mood);
    // Always key signature by the name that appears on messages (after rename: both keys)
    setSignature(draft.name || user.name, draft.signature, user.name);
    setEditing(false);
    setSaved(true);
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    savedTimerRef.current = setTimeout(() => setSaved(false), 2000);
  };

  const handleChangePassword = async () => {
    setPasswordMsg(null);
    if (newPassword.length < 6) {
      setPasswordMsg({ type: 'err', text: 'Au moins 6 caractères.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'err', text: 'Les mots de passe ne correspondent pas.' });
      return;
    }
    setChangingPassword(true);
    const result = await supabaseAuthService.updatePassword(newPassword);
    setChangingPassword(false);
    if (result.success) {
      setPasswordMsg({ type: 'ok', text: 'Mot de passe mis à jour.' });
      setNewPassword('');
      setConfirmPassword('');
      addNotification({ type: 'system', message: 'Mot de passe modifié' });
    } else {
      setPasswordMsg({ type: 'err', text: result.error || 'Échec de la mise à jour' });
    }
  };

  const handleLinkEmail = async () => {
    if (!email || !password) {
      setLinkError('Veuillez remplir tous les champs');
      return;
    }
    if (password.length < 6) {
      setLinkError('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    setLinking(true);
    setLinkError('');
    setLinkSuccess(false);

    try {
      if (accountMode === 'login') {
        const result = await supabaseAuthService.signIn(email, password);
        if (!result.success || !result.user) {
          setLinkError(result.error || 'Connexion impossible');
          return;
        }
        loginWithSupabase(result.user);
        addNotification({ type: 'system', message: 'Compte connecté — amis et sync activés' });
        setEmail('');
        setPassword('');
        return;
      }

      const result = await supabaseAuthService.signUp(email, password, user.name, user.avatar || 'av1');
      if (!result.success) {
        setLinkError(result.error || 'Erreur lors de la création du compte');
        return;
      }

      if (result.user) {
        loginWithSupabase(result.user);
        addNotification({ type: 'system', message: 'Compte créé et connecté' });
        setEmail('');
        setPassword('');
        return;
      }

      // Confirmation email requise : bascule vers connexion
      setLinkSuccess(true);
      setAccountMode('login');
      setTimeout(() => setLinkSuccess(false), 5000);
    } catch (error: unknown) {
      setLinkError(error instanceof Error ? error.message : 'Erreur lors de la liaison');
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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-end sm:items-center justify-center z-[2000] animate-in fade-in duration-300 p-0 sm:p-4 safe-area-pad" onClick={onClose}>
      <div className="bg-card border-2 border-red-500/50 rounded-t-3xl sm:rounded-3xl w-full max-w-[580px] max-h-[92dvh] sm:max-h-[90vh] flex flex-col overflow-hidden shadow-[0_32px_96px_rgba(0,0,0,0.5),0_0_0_1px_rgba(239,68,68,0.3)] animate-in zoom-in-95 duration-300"
        onClick={e => e.stopPropagation()}>

        <div className="px-5 py-4 border-b border-border flex items-center gap-2.5 shrink-0">
          <span className="text-[15px] font-semibold text-foreground flex-1">Paramètres</span>
          {saved && (
            <span className="text-[11px] bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 px-3 py-1 rounded-full flex items-center gap-1.5 animate-slide-in-up">
              <Check className="w-3 h-3" /> Sauvegardé
            </span>
          )}
          <button onClick={onClose} className="flex items-center justify-center p-2 rounded-lg border border-border text-muted-foreground hover:bg-black/5 dark:hover:bg-white/5 hover:text-foreground transition-all duration-200 active:scale-95 cursor-pointer touch-target" aria-label="Fermer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-1 min-h-0 overflow-hidden flex-col sm:flex-row">
          <div className="w-full sm:w-[150px] bg-secondary sm:border-r border-b sm:border-b-0 border-border p-1.5 flex flex-row sm:flex-col gap-1 sm:gap-0.5 shrink-0 overflow-x-auto overflow-y-hidden sm:overflow-y-auto sm:overflow-x-hidden scrollbar-thin" role="tablist" aria-label="Onglets paramètres">
            {TABS.map((tab, index) => {
              const Icon = tab.icon;
              const friendsBadge = tab.id === 'friends' ? pendingRequests.length : 0;
              return (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)} role="tab" aria-selected={activeTab === tab.id}
                  className={`relative flex items-center gap-2 px-3 py-2.5 sm:px-2.5 sm:py-2 rounded-lg text-xs transition-all border shrink-0 whitespace-nowrap min-h-[44px] sm:min-h-0 ${activeTab === tab.id ? 'bg-primary/12 border-primary/25 text-primary' : 'border-transparent text-muted-foreground hover:bg-black/[0.04] dark:hover:bg-white/[0.04] hover:text-foreground'} animate-slide-in-right`}
                  style={{ animationDelay: `${index * 50}ms` }}>
                  <Icon className="w-3.5 h-3.5 shrink-0" />{tab.label}
                  {friendsBadge > 0 && (
                    <span className="ml-auto min-w-[16px] h-4 px-1 rounded-full bg-blue-500 text-white text-[9px] font-bold flex items-center justify-center">
                      {friendsBadge > 9 ? '9+' : friendsBadge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex-1 overflow-y-auto p-4 sm:p-5 min-w-0 w-full">

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
                            gender: user.gender||'prefer_not_to_say' as 'male' | 'female' | 'other' | 'prefer_not_to_say',
                            mood: getMood(user.name),
                            signature: getSignature(user.name),
                          }); 
                          setEditing(false); 
                        }} className="flex items-center justify-center px-3 py-1.5 rounded-lg bg-white/5 border border-border text-muted-foreground text-xs hover:bg-white/10 transition-all active:scale-95 cursor-pointer">Annuler</button>
                        <button onClick={handleSave} className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs hover:bg-emerald-500/25 transition-all active:scale-95 cursor-pointer"><Check className="w-3.5 h-3.5 pointer-events-none" /> Sauvegarder</button>
                      </div>
                  }
                </div>

                <DailySparkCard compact className="mb-4" />

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
                    <div className="grid grid-cols-6 gap-2 max-h-[180px] overflow-y-auto p-1 pr-2">
                      {AVATAR_IDS.map((av, index) => (
                        <button key={av} type="button" onClick={() => setDraft(d => ({ ...d, avatar: av }))}
                          className={`rounded-full transition-all duration-200 hover:scale-110 active:scale-95 ${draft.avatar === av ? 'ring-2 ring-primary ring-offset-2 ring-offset-background scale-110' : 'opacity-60 hover:opacity-100'}`}
                          style={{ animationDelay: `${index * 20}ms` }}>
                          <Avatar avatarClass={av} initials={user.initials} size="md" mood={draft.mood} />
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="relative inline-block transition-transform duration-200 hover:scale-110">
                      <Avatar avatarClass={user.avatar} initials={user.initials} size="lg" mood={getMood(user.name)} />
                      <div className="absolute -bottom-2 -right-2 animate-float">
                        <DiamondBadge level={lvl} size="sm" />
                      </div>
                    </div>
                  )}
                </div>

                {/* Humeur */}
                <div className="mb-4">
                  <div className="text-[10px] text-muted-foreground/50 uppercase tracking-widest mb-2">Aura d&apos;humeur</div>
                  <div className="flex gap-2 flex-wrap">
                    {MOOD_OPTIONS.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        disabled={!editing}
                        onClick={() => setDraft(d => ({ ...d, mood: m.id }))}
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] transition-all ${
                          (editing ? draft.mood : getMood(user.name)) === m.id
                            ? 'bg-primary/12 border-primary/30 text-primary'
                            : 'bg-secondary border-border text-muted-foreground/60'
                        } ${editing ? 'hover:scale-105' : 'opacity-80'}`}
                      >
                        <span>{m.emoji}</span>{m.label}
                      </button>
                    ))}
                  </div>
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
                    <div className="flex items-center gap-2 flex-wrap">
                      <UserDisplayName
                        name={user.name}
                        profile={user}
                        level={lvl}
                        size="xs"
                        showSpecialLabels
                        nameClassName="text-[15px] font-bold text-foreground"
                      />
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
                  {/* Âge (18+ uniquement — champ indicatif, pas de vérification d'identité) */}
                  <div>
                    <div className="text-[10px] text-muted-foreground/50 uppercase tracking-widest mb-1.5">Âge (18+)</div>
                    {editing ? (
                      <input 
                        type="number"
                        value={draft.age}
                        onChange={e => setDraft(d => ({ ...d, age: e.target.value }))}
                        min={18}
                        max={120}
                        placeholder="18+"
                        className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/40 outline-none focus:border-primary/50 focus:shadow-lg focus:shadow-primary/10 transition-all duration-200" 
                      />
                    ) : (
                      <span className="text-sm text-muted-foreground/80">{user.age ? `${user.age} ans` : 'Non renseigné'}</span>
                    )}
                    {editing && (
                      <p className="text-[10px] text-muted-foreground/45 mt-1">Virtuel-RT est réservé aux adultes. Aucune pièce d’identité n’est demandée.</p>
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

                {/* Signature chat */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="text-[10px] text-muted-foreground/50 uppercase tracking-widest">Signature chat</div>
                    {editing && <div className="text-[10px] text-muted-foreground/40">{draft.signature.length}/40</div>}
                  </div>
                  <p className="text-[10px] text-muted-foreground/45 mb-1.5">
                    Affichée sous vos messages dans les salons. Cliquez Modifier pour la définir.
                  </p>
                  {editing ? (
                    <input
                      value={draft.signature}
                      onChange={e => setDraft(d => ({ ...d, signature: e.target.value.slice(0, 40) }))}
                      maxLength={40}
                      placeholder="Ex: Toujours de bonne humeur ✨"
                      className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/40 outline-none focus:border-primary/50 focus:shadow-lg focus:shadow-primary/10 transition-all duration-200"
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground/80 italic">
                      {getSignature(user.name) || 'Aucune signature.'}
                    </p>
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
                    <div className="text-xs text-muted-foreground/60 space-y-2">
                      <p>Vous êtes en <strong className="text-amber-300/90">mode invité</strong> : données locales uniquement.</p>
                      <p>Créez un compte ou connectez-vous pour les <strong className="text-foreground/80">demandes d&apos;amis</strong>, la sync multi-appareils et les notifications persistantes.</p>
                    </div>
                  )}
                </div>

                {supabaseUser && user.email && (
                  <div className="bg-secondary border border-border rounded-xl p-4 mb-4">
                    <TwoFactorSection userId={supabaseUser.id} email={user.email} />
                  </div>
                )}

                {supabaseUser && (
                  <div className="bg-secondary border border-border rounded-xl p-4 mb-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Smartphone className="w-4 h-4 text-primary" />
                      <span className="text-xs font-semibold text-foreground">Alertes modération / sécurité</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mb-3">
                      Choisissez comment être prévenu en cas d&apos;événement de modération sur votre compte (staff : aussi pour les alertes équipe).
                    </p>
                    <div className="space-y-3">
                      <div>
                        <label className="text-[10px] text-muted-foreground/50 uppercase tracking-widest mb-1.5 block">
                          Téléphone (optionnel, format international)
                        </label>
                        <input
                          type="tel"
                          value={alertPrefs.phone_number}
                          onChange={(e) => setAlertPrefs((p) => ({ ...p, phone_number: e.target.value }))}
                          placeholder="+33 6 12 34 56 78"
                          className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/40 outline-none focus:border-primary/50"
                        />
                      </div>
                      <label className="flex items-start gap-2 text-[11px] text-muted-foreground cursor-pointer">
                        <input
                          type="checkbox"
                          checked={alertPrefs.phone_consent}
                          onChange={(e) => setAlertPrefs((p) => ({ ...p, phone_consent: e.target.checked }))}
                          className="mt-0.5"
                        />
                        <span>
                          J&apos;accepte de recevoir des SMS d&apos;alerte de modération / sécurité sur ce numéro.
                          Consentement révocable à tout moment.
                        </span>
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {(
                          [
                            ['notify_mod_app', 'In-app'],
                            ['notify_mod_email', 'Email'],
                            ['notify_mod_sms', 'SMS'],
                          ] as const
                        ).map(([key, label]) => (
                          <button
                            key={key}
                            type="button"
                            onClick={() => setAlertPrefs((p) => ({ ...p, [key]: !p[key] }))}
                            className={`px-2.5 py-1.5 rounded-lg border text-[11px] ${
                              alertPrefs[key]
                                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                                : 'border-border text-muted-foreground'
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                      <button
                        type="button"
                        disabled={alertPrefsSaving}
                        onClick={() => void saveAlertPrefs()}
                        className="w-full py-2 rounded-lg bg-primary/15 border border-primary/30 text-primary text-xs hover:bg-primary/25 disabled:opacity-50"
                      >
                        {alertPrefsSaving ? 'Enregistrement…' : 'Enregistrer les préférences'}
                      </button>
                      {alertPrefsMsg && (
                        <p className="text-[11px] text-muted-foreground">{alertPrefsMsg}</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Changer le mot de passe (compte connecté) */}
                {supabaseUser && (
                  <div className="bg-secondary border border-border rounded-xl p-4 mb-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Lock className="w-4 h-4 text-primary" />
                      <span className="text-xs font-semibold text-foreground">Changer le mot de passe</span>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <label className="text-[10px] text-muted-foreground/50 uppercase tracking-widest mb-1.5 block">Nouveau mot de passe</label>
                        <input
                          type="password"
                          value={newPassword}
                          onChange={e => setNewPassword(e.target.value)}
                          placeholder="••••••••"
                          autoComplete="new-password"
                          className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/40 outline-none focus:border-primary/50 focus:shadow-lg focus:shadow-primary/10 transition-all duration-200"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-muted-foreground/50 uppercase tracking-widest mb-1.5 block">Confirmer</label>
                        <input
                          type="password"
                          value={confirmPassword}
                          onChange={e => setConfirmPassword(e.target.value)}
                          placeholder="••••••••"
                          autoComplete="new-password"
                          className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/40 outline-none focus:border-primary/50 focus:shadow-lg focus:shadow-primary/10 transition-all duration-200"
                        />
                      </div>
                      {passwordMsg && (
                        <div className={`rounded-lg p-2 text-xs flex items-center gap-2 border ${
                          passwordMsg.type === 'ok'
                            ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                            : 'bg-red-500/15 border-red-500/30 text-red-400'
                        }`}>
                          {passwordMsg.type === 'ok' ? <Check className="w-3.5 h-3.5 shrink-0" /> : <AlertCircle className="w-3.5 h-3.5 shrink-0" />}
                          {passwordMsg.text}
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => void handleChangePassword()}
                        disabled={changingPassword || !newPassword || !confirmPassword}
                        className="w-full py-2.5 rounded-lg bg-primary text-white font-medium text-sm flex items-center justify-center gap-2 hover:bg-primary/80 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {changingPassword ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Mise à jour...
                          </>
                        ) : (
                          <>
                            <Lock className="w-4 h-4" />
                            Mettre à jour le mot de passe
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* Formulaire compte (pour invités) */}
                {!supabaseUser && (
                  <div className="bg-secondary/50 border border-border rounded-xl p-4">
                    <div className="flex gap-1 p-1 mb-3 bg-background/60 rounded-lg border border-border">
                      <button
                        type="button"
                        onClick={() => { setAccountMode('create'); setLinkError(''); }}
                        className={`flex-1 py-1.5 rounded-md text-[11px] font-medium transition-all ${accountMode === 'create' ? 'bg-primary text-white' : 'text-muted-foreground hover:text-foreground'}`}
                      >
                        Créer un compte
                      </button>
                      <button
                        type="button"
                        onClick={() => { setAccountMode('login'); setLinkError(''); setLinkSuccess(false); }}
                        className={`flex-1 py-1.5 rounded-md text-[11px] font-medium transition-all ${accountMode === 'login' ? 'bg-primary text-white' : 'text-muted-foreground hover:text-foreground'}`}
                      >
                        Se connecter
                      </button>
                    </div>

                    {linkSuccess ? (
                      <div className="bg-emerald-500/15 border border-emerald-500/30 rounded-lg p-3 text-center">
                        <Check className="w-5 h-5 text-emerald-400 mx-auto mb-2" />
                        <p className="text-sm text-emerald-400">Compte créé ! Vérifiez votre email, puis connectez-vous ici.</p>
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
                          onClick={() => void handleLinkEmail()}
                          disabled={linking}
                          className="w-full py-2.5 rounded-lg bg-primary text-white font-medium text-sm flex items-center justify-center gap-2 hover:bg-primary/80 transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {linking ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              {accountMode === 'login' ? 'Connexion...' : 'Création...'}
                            </>
                          ) : (
                            <>
                              <Mail className="w-4 h-4" />
                              {accountMode === 'login' ? 'Se connecter' : 'Créer un compte'}
                            </>
                          )}
                        </button>
                        <p className="text-[10px] text-muted-foreground/40 text-center">
                          {accountMode === 'login'
                            ? 'Utilisez le même email que lors de la création du compte.'
                            : 'Conservez le même pseudo pour retrouver vos messages.'}
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
                <div className="text-[10px] text-muted-foreground/50 uppercase tracking-widest mb-3 mt-6">Mode soirée 🎉</div>
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

                {/* Mode coquin Premium */}
                <div className="text-[10px] text-muted-foreground/50 uppercase tracking-widest mb-3 mt-6 flex items-center gap-2">
                  Mode coquin 🔥
                  <span className="text-[8px] px-1.5 py-px rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/30">18+</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (!isPremium && !coquinMode) {
                      setActiveTab('premium');
                      return;
                    }
                    toggleCoquinMode();
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] ${
                    coquinMode
                      ? 'bg-rose-500/15 border-rose-500/40 text-rose-300'
                      : 'bg-secondary border-border text-muted-foreground/60 hover:bg-white/5'
                  }`}
                >
                  <span className="text-xl shrink-0" aria-hidden>💋</span>
                  <div className="flex-1 text-left">
                    <div className="text-sm font-medium flex items-center gap-2">
                      {coquinMode ? 'Mode coquin actif' : 'Activer le Mode coquin'}
                      {!isPremium && (
                        <span className="text-[9px] px-2 py-px rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
                          Réservé Premium
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] opacity-60 mt-0.5">
                      {isPremium
                        ? 'Salons, jeux et réactions flirty (consentement obligatoire)'
                        : 'Débloquez Premium pour accéder à la zone 18+'}
                    </div>
                  </div>
                  <div className={`w-9 h-5 rounded-full transition-all duration-300 ${coquinMode ? 'bg-rose-500' : 'bg-muted-foreground/20'} relative`}>
                    <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all duration-300 ${coquinMode ? 'left-4' : 'left-0.5'}`} />
                  </div>
                </button>

                {/* Ambiances */}
                <div className="text-[10px] text-muted-foreground/50 uppercase tracking-widest mb-3 mt-6">Ambiances</div>
                <div className="space-y-2">
                  {AMBIANCE_OPTIONS.map((opt) => {
                    const active = ambianceMode === opt.id;
                    const locked = !!opt.premiumOnly && !isPremium;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => {
                          if (locked) {
                            setActiveTab('premium');
                            return;
                          }
                          setAmbianceMode(opt.id);
                        }}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] ${
                          active ? opt.activeClass : 'bg-secondary border-border text-muted-foreground/60 hover:bg-white/5'
                        } ${locked ? 'opacity-70' : ''}`}
                      >
                        <span className="text-xl shrink-0" aria-hidden>{opt.emoji}</span>
                        <div className="flex-1 text-left">
                          <div className="text-sm font-medium flex items-center gap-2">
                            {active ? `${opt.label} actif` : opt.label}
                            {active && (
                              <span className="text-[9px] rounded-full px-2 py-px bg-white/10 border border-white/15">Actif</span>
                            )}
                            {locked && (
                              <span className="text-[9px] rounded-full px-2 py-px bg-amber-500/15 text-amber-300 border border-amber-500/30">Premium</span>
                            )}
                          </div>
                          <div className="text-[10px] opacity-60 mt-0.5">{opt.description}</div>
                        </div>
                        <div className={`w-9 h-5 rounded-full transition-all duration-300 relative ${active ? 'bg-current/80' : 'bg-muted-foreground/20'}`}>
                          <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all duration-300 ${active ? 'left-4' : 'left-0.5'}`} />
                        </div>
                      </button>
                    );
                  })}
                </div>

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

            {/* ── Extras ── */}
            {activeTab === 'extras' && (
              <div className="space-y-6">
                <h3 className="text-[13px] font-semibold text-foreground">Extras</h3>

                <div>
                  <div className="text-[10px] text-muted-foreground/50 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                    <Zap className="w-3 h-3 text-purple-300" /> Réponses rapides
                  </div>
                  <p className="text-[11px] text-muted-foreground/55 mb-3">
                    Accessibles dans le chat via l’icône éclair à côté des emojis.
                  </p>
                  <div className="space-y-1.5 mb-3">
                    {quickRepliesDraft.map(qr => (
                      <div key={qr.id} className="flex items-center gap-2 bg-secondary border border-border rounded-xl px-3 py-2">
                        <div className="flex-1 min-w-0">
                          <div className="text-xs text-purple-300 font-medium">{qr.label}</div>
                          <div className="text-[10px] text-muted-foreground/60 truncate">{qr.text}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const next = quickRepliesDraft.filter(r => r.id !== qr.id);
                            setQuickRepliesDraft(next);
                            if (user?.name) setQuickReplies(user.name, next);
                          }}
                          className="text-[10px] text-red-400 hover:text-red-300"
                        >
                          Suppr.
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      value={newReplyLabel}
                      onChange={e => setNewReplyLabel(e.target.value.slice(0, 20))}
                      placeholder="Libellé"
                      className="bg-background border border-border rounded-lg px-2.5 py-1.5 text-xs"
                    />
                    <input
                      value={newReplyText}
                      onChange={e => setNewReplyText(e.target.value.slice(0, 120))}
                      placeholder="Texte du message"
                      className="bg-background border border-border rounded-lg px-2.5 py-1.5 text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (!newReplyLabel.trim() || !newReplyText.trim() || !user?.name) return;
                        const next = [
                          ...quickRepliesDraft,
                          { id: `qr_${Date.now()}`, label: newReplyLabel.trim(), text: newReplyText.trim() },
                        ].slice(0, 12);
                        setQuickRepliesDraft(next);
                        setQuickReplies(user.name, next);
                        setNewReplyLabel('');
                        setNewReplyText('');
                        addNotification({ type: 'system', message: 'Réponse rapide ajoutée.' });
                      }}
                      className="col-span-2 py-2 rounded-lg bg-purple-500/15 border border-purple-500/30 text-purple-300 text-xs font-semibold hover:bg-purple-500/25"
                    >
                      Ajouter une réponse
                    </button>
                  </div>
                </div>

                <div>
                  <div className="text-[10px] text-muted-foreground/50 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                    <Bookmark className="w-3 h-3 text-rose-400" /> Favoris messages
                  </div>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {getBookmarks(user?.name).length === 0 && (
                      <p className="text-[11px] text-muted-foreground/45 italic">Aucun favori — cliquez ★ sur un message dans un salon.</p>
                    )}
                    {getBookmarks(user?.name).slice(0, 20).map(b => (
                      <div key={b.id + b.savedAt} className="bg-secondary/70 border border-border rounded-xl px-3 py-2">
                        <div className="text-[10px] text-purple-300 inline-flex items-center gap-1 flex-wrap">
                          <UserDisplayName name={b.author_name} size="xs" showLevelDiamond={false} showSpecialLabels={false} nameClassName="text-purple-300" />
                          <span>· {b.salonName || b.salonId}</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground/70 truncate">{b.text}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-2 border-t border-border">
                  <Link
                    to={MENTIONS_LEGALES_HREF}
                    className="inline-flex items-center gap-1.5 text-xs text-muted-foreground/60 hover:text-purple-300 transition-colors"
                  >
                    <Scale className="w-3.5 h-3.5" /> Mentions légales
                  </Link>
                </div>
              </div>
            )}

            {/* ── Amis ── */}
            {activeTab === 'friends' && (
              <div>
                <h3 className="text-[13px] font-semibold text-foreground mb-5">Amis et demandes</h3>

                {!supabaseUser && (
                  <div className="flex items-start gap-2 bg-sky-500/10 border border-sky-500/25 rounded-xl px-3 py-3 mb-4">
                    <AlertCircle className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-sky-200/90 leading-relaxed">
                      Mode invité : les demandes d&apos;amis fonctionnent pendant la session (30&nbsp;min). Un compte email conserve vos amis durablement.
                    </p>
                  </div>
                )}

                {friendsFeedback && (
                  <div className={`rounded-xl px-3 py-3 mb-4 text-xs leading-relaxed border ${
                    friendsFeedback.type === 'success'
                      ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-300'
                      : 'bg-red-500/10 border-red-500/25 text-red-300'
                  }`}>
                    {friendsFeedback.message}
                  </div>
                )}

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
                            <UserDisplayName
                              name={req.user_id}
                              size="xs"
                              showSpecialLabels={false}
                              nameClassName="text-sm text-foreground"
                              className="flex-1 min-w-0"
                            />
                            <button onClick={() => void runFriendAction(() => acceptRequestFromSender(req.user_id), `${req.user_id} ajouté à vos amis`)} className="flex items-center justify-center px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[11px] hover:bg-emerald-500/25 transition-all active:scale-95 cursor-pointer">Accepter</button>
                            <button onClick={() => void runFriendAction(() => rejectRequestFromSender(req.user_id), `Demande de ${req.user_id} refusée`)} className="flex items-center justify-center px-2.5 py-1 rounded-lg bg-red-500/10 border border-red-500/25 text-red-300 text-[11px] hover:bg-red-500/20 transition-all active:scale-95 cursor-pointer">Refuser</button>
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
                            <UserDisplayName
                              name={req.friend_id}
                              size="xs"
                              showSpecialLabels={false}
                              nameClassName="text-sm text-foreground"
                              className="flex-1 min-w-0"
                            />
                            <span className="text-[10px] text-muted-foreground/55">En attente</span>
                            <button onClick={() => void runFriendAction(() => cancelRequestToRecipient(req.friend_id), `Demande à ${req.friend_id} annulée`)} className="flex items-center justify-center px-2.5 py-1 rounded-lg bg-red-500/10 border border-red-500/25 text-red-300 text-[11px] hover:bg-red-500/20 transition-all active:scale-95 cursor-pointer">Annuler</button>
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
                            <button
                              type="button"
                              onClick={() => onViewProfile?.(name)}
                              className="flex-1 min-w-0 text-left hover:opacity-90 transition-opacity"
                              title={`Voir le profil de ${name}`}
                            >
                              <UserDisplayName
                                name={name}
                                size="xs"
                                showSpecialLabels={false}
                                nameClassName="text-sm text-foreground hover:text-primary"
                              />
                            </button>
                            {onOpenDM && (
                              <button
                                type="button"
                                onClick={() => onOpenDM(name)}
                                className="flex items-center justify-center px-2.5 py-1 rounded-lg bg-primary/15 border border-primary/30 text-primary text-[11px] hover:bg-primary/25 transition-all active:scale-95 cursor-pointer"
                                title={`Message à ${name}`}
                              >
                                <MessageSquare className="w-3 h-3" />
                              </button>
                            )}
                            <button onClick={() => void runFriendAction(() => removeFriend(name), `${name} retiré de vos amis`)} className="flex items-center justify-center px-2.5 py-1 rounded-lg bg-red-500/10 border border-red-500/25 text-red-300 text-[11px] hover:bg-red-500/20 transition-all active:scale-95 cursor-pointer">Retirer</button>
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
                        <UserDisplayName
                          name={name}
                          size="xs"
                          showSpecialLabels={false}
                          nameClassName="text-sm text-foreground"
                          className="flex-1 min-w-0"
                        />
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
                      {['🎨 Badge Premium exclusif', '⚡ XP x2 par message', '🎵 Accès aux salons VIP', '🌟 Couleur de pseudo personnalisée', '📌 Messages épinglés', '🔥 Mode coquin 18+ (salons, jeux, réactions)'].map((f, index) => (
                        <div key={f} className="flex items-center gap-2 text-sm text-muted-foreground/80 transition-all duration-200 hover:scale-[1.01]"
                          style={{ animationDelay: `${index * 50}ms` }}>
                          <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />{f}
                        </div>
                      ))}
                    </div>
                    <button onClick={activatePremium} className="w-full py-3 rounded-xl premium-gradient text-white font-semibold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] cursor-pointer">
                      <Star className="w-4 h-4" /> Demander Premium
                    </button>
                    <p className="text-[10px] text-muted-foreground/40 text-center">
                      Accès accordé par le staff (serveur) — plus d’activation démo locale. Mode coquin 18+ inclus.
                    </p>
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
