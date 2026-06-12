import React, { useState, useRef, useCallback, FormEvent } from 'react';
import { useUser, useSalons, useNotifications, useXP } from '@/lib/contexts';
import { SALONS, Salon } from '@/lib/chatConfig';
import Avatar from './Avatar';
import DiamondBadge from './DiamondBadge';
import UserProfileView from './UserProfileView';
import { MessageSquare, Hand, Lock, X, Trophy, Flame } from 'lucide-react';

interface OnlineUser {
  name: string;
  avatar: string;
  initials: string;
  level: number;
  salon: string | null;
}

interface WelcomeScreenProps {
  onOpenDM?: (name: string) => void;
}

// Emoji par salon
const SALON_EMOJI: Record<string, string> = {
  musique60: '🎵', musique80: '🎸', karaoke: '🎤', debat: '⚡',
  quiz: '🧠', jeunes: '👋', lgbt: '🌈', divorce: '💙',
  libre: '🚪', insulte: '😤', cameras: '📹', bar: '🍷',
};

// Membres connectés simulés (en vrai, viendrait du backend)
const ONLINE_DEMO: OnlineUser[] = [
  { name: 'Cantique', avatar: 'av6', initials: 'CA', level: 8,  salon: 'musique60' },
  { name: 'PiCanna',  avatar: 'av3', initials: 'PC', level: 5,  salon: 'debat'     },
  { name: 'Coeur',    avatar: 'av2', initials: 'CO', level: 12, salon: 'karaoke'   },
  { name: 'Thierry',  avatar: 'av5', initials: 'TH', level: 3,  salon: 'bar'       },
  { name: 'Mélanie',  avatar: 'av1', initials: 'ME', level: 18, salon: 'libre'     },
  { name: 'Sasha',    avatar: 'av4', initials: 'SA', level: 25, salon: null        },
];

// Pulse animé pour les salons live ou actifs
function PulseDot({ color = 'bg-emerald-500' }: { color?: string }) {
  return (
    <span className="relative flex h-2 w-2 shrink-0">
      <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${color} opacity-60`} />
      <span className={`relative inline-flex rounded-full h-2 w-2 ${color}`} />
    </span>
  );
}

export default function WelcomeScreen({ onOpenDM }: WelcomeScreenProps) {
  const { setCurrentSalon, customSalons, hiddenSalons, isSalonLocked, verifySalonPassword } = useSalons();
  const { user, profiles } = useUser();
  const { addNotification } = useNotifications();
  const { xpProgress, xpForLevel, monthlyXP } = useXP();
  const [hoveredUser, setHoveredUser] = useState<string | null>(null);
  const [waved, setWaved]             = useState<Record<string, boolean>>({});
  const [filter, setFilter]           = useState('all');
  const [viewProfile, setViewProfile] = useState<string | null>(null);
  const [passwordPrompt, setPasswordPrompt] = useState<Salon | null>(null);
  const [passwordError, setPasswordError] = useState('');
  const waveTimersRef                 = useRef<Record<string, number>>({});

  const allSalons = [...SALONS, ...(customSalons || [])].filter(s => !(hiddenSalons || []).includes(s.id));

  // Données XP
  const lvl = user?.level || 1;
  const xp = user?.xp || 0;
  const next = xpForLevel ? xpForLevel(lvl) : 500;
  const prog = user && xpProgress ? xpProgress(user) : 0;

  // Classement mensuel
  const monthlyRanked = Object.entries(monthlyXP || {})
    .map(([name, mxp]) => ({ mxp, ...(profiles[name] || {}) }))
    .sort((a, b) => b.mxp - a.mxp)
    .slice(0, 10);

  // Classement global
  const ranked = Object.values(profiles)
    .sort((a, b) => (b.level || 1) - (a.level || 1) || (b.xp || 0) - (a.xp || 0))
    .slice(0, 10);

  // Fusionner les profils réels avec les démos
  const realProfiles = Object.values(profiles).filter(p => p.name !== user?.name);
  const onlineUsers  = realProfiles.length > 0
    ? realProfiles.map(p => ({ ...p, salon: null }))
    : ONLINE_DEMO.filter(u => u.name !== user?.name);

  const filteredSalons = allSalons.filter(s =>
    filter === 'all' ||
    (filter === 'vocal' && (s.type === 'vocal' || s.type === 'chat vocal')) ||
    (filter === 'chat'  && s.type === 'chat') ||
    (filter === 'video' && s.type === 'video')
  );

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
    }
  }, [isSalonLocked, setCurrentSalon]);

  const handlePasswordSubmit = useCallback((e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const password = (e.target as any).password.value;
    if (passwordPrompt && verifySalonPassword(passwordPrompt.id, password)) {
      setCurrentSalon(passwordPrompt.id);
      setPasswordPrompt(null);
      setPasswordError('');
    } else {
      setPasswordError('Mot de passe incorrect');
    }
  }, [passwordPrompt, verifySalonPassword, setCurrentSalon]);

  return (
    <div className="flex-1 flex min-h-0 overflow-hidden">

      {/* ── Colonne gauche : liste des salons ── */}
      <div className="w-[260px] border-r border-border flex flex-col shrink-0 bg-card">
        <div className="px-4 py-3 border-b border-border">
          <h3 className="text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-widest">Salons</h3>
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
              className={`flex-1 py-1 rounded-md text-[10px] font-medium transition-all ${filter === id ? 'bg-primary/15 text-primary' : 'text-muted-foreground/50 hover:text-muted-foreground'}`}>
              {label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto py-1.5 px-2">
          {filteredSalons.map(salon => (
            <button key={salon.id} onClick={() => handleSalonClick(salon)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl mb-0.5 hover:bg-white/[0.05] transition-colors text-left group">

              {/* Emoji avec fond */}
              <div className="w-9 h-9 rounded-xl bg-secondary border border-border flex items-center justify-center text-lg shrink-0 group-hover:scale-110 transition-transform">
                {salon.emoji || SALON_EMOJI[salon.id] || '💬'}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[13px] font-medium text-foreground truncate">{salon.name}</span>
                  {salon.isPrivate && <Lock className="w-3 h-3 text-amber-400" />}
                  {salon.live && <PulseDot color="bg-red-500" />}
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  {salon.count && (
                    <>
                      <PulseDot color="bg-emerald-500" />
                      <span className="text-[10px] text-muted-foreground/50">{salon.count} en ligne</span>
                    </>
                  )}
                  {salon.live && <span className="text-[9px] bg-red-500/15 text-red-400 border border-red-500/30 rounded px-1.5 py-px font-semibold">LIVE</span>}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ── Centre : épuré ── */}
      <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-8 select-none">
        <div className="text-5xl mb-2">💬</div>
        <h2 className="text-xl font-bold text-foreground">Bienvenue sur Virtuel-ST</h2>
        <p className="text-sm text-muted-foreground/50 max-w-xs leading-relaxed">
          Choisissez un salon à gauche pour rejoindre une discussion,<br />
          ou envoyez un message privé à quelqu'un à droite.
        </p>
        {user && (
          <div className="mt-2 flex items-center gap-2 bg-secondary border border-border rounded-full px-4 py-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs text-muted-foreground/70">Connecté en tant que <span className="text-foreground font-medium">{user.name}</span></span>
          </div>
        )}
      </div>

      {/* ── Colonne droite : XP, classement et connectés ── */}
      <div className="w-[240px] border-l border-border flex flex-col shrink-0 bg-card overflow-y-auto">
        
        {/* XP du joueur */}
        <div className="p-3 border-b border-border">
          <div className="text-[9.5px] text-muted-foreground/50 uppercase tracking-widest mb-2">Ton diamant</div>
          <div className="text-center py-1">
            {user ? <DiamondBadge level={lvl} size="md" showLabel /> : <div className="w-7 h-7 bg-indigo-400/20 rounded-lg mx-auto mb-1" />}
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
                  <span className={`text-[10px] truncate font-medium block ${isMe ? 'text-yellow-300' : 'text-muted-foreground'}`}>{r.name}</span>
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
                    <div className="flex items-center gap-1 justify-between">
                      <span className={`text-[10px] truncate font-medium ${isMe ? 'text-purple-300' : 'text-muted-foreground'}`}>{r.name}</span>
                      <div className="flex items-center gap-0.5 shrink-0">
                        <DiamondBadge level={r.level || 1} size="xs" />
                        <span className="text-[9px] text-purple-400 font-bold">Nv.{r.level||1}</span>
                      </div>
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
            <span className="text-[9px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 rounded-full px-2 py-px">
              {onlineUsers.length + (user ? 1 : 0)}
            </span>
          </div>

          {/* Moi */}
          {user && (
            <div className="flex items-center gap-2 px-2 py-1.5 rounded-xl mb-1 bg-primary/5 border border-primary/15">
              <div className="relative shrink-0">
                <Avatar avatarClass={user.avatar} initials={user.initials} size="xs" />
                <span className="absolute -bottom-px -right-px w-2 h-2 bg-emerald-500 border-2 border-card rounded-full" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <span className="text-[11px] font-semibold text-primary truncate">{user.name}</span>
                  <DiamondBadge level={user.level || 1} size="xs" />
                </div>
                <span className="text-[9px] text-muted-foreground/40">Vous</span>
              </div>
            </div>
          )}

          {/* Autres */}
          {onlineUsers.length === 0 ? (
            <p className="text-[10px] text-muted-foreground/30 italic text-center py-4">Personne d'autre en ligne</p>
          ) : (
            onlineUsers.map(u => (
              <div key={u.name}
                className="flex items-center gap-2 px-2 py-1.5 rounded-xl mb-0.5 hover:bg-white/[0.04] transition-colors group"
                onMouseEnter={() => setHoveredUser(u.name)}
                onMouseLeave={() => setHoveredUser(null)}>

                <button className="relative shrink-0" onClick={() => setViewProfile(u.name)}>
                  <Avatar avatarClass={u.avatar || 'av1'} initials={u.initials || u.name.slice(0,2).toUpperCase()} size="xs" />
                  <span className="absolute -bottom-px -right-px w-2 h-2 bg-emerald-500 border-2 border-card rounded-full" />
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <button className="text-[11px] font-medium text-foreground truncate hover:underline hover:text-primary transition-colors"
                      onClick={() => setViewProfile(u.name)}>{u.name}</button>
                    <DiamondBadge level={u.level || 1} size="xs" />
                  </div>
                  {u.salon ? (
                    <span className="text-[9px] text-muted-foreground/40 truncate">
                      {SALON_EMOJI[u.salon]} {SALONS.find(s => s.id === u.salon)?.name}
                    </span>
                  ) : (
                    <span className="text-[9px] text-muted-foreground/30">Accueil</span>
                  )}
                </div>

                {/* Boutons d'interaction — visibles au hover */}
                <div className={`flex gap-1 transition-opacity ${hoveredUser === u.name ? 'opacity-100' : 'opacity-0'}`}>
                  <button onClick={() => handleWave(u.name)}
                    title="Saluer"
                    className={`w-5 h-5 rounded-lg flex items-center justify-center transition-all text-xs ${waved[u.name] ? 'bg-amber-500/20 text-amber-400' : 'bg-secondary border border-border text-muted-foreground/50 hover:text-amber-400 hover:border-amber-500/40'}`}>
                    {waved[u.name] ? '👋' : <Hand className="w-2.5 h-2.5" />}
                  </button>
                  <button onClick={() => onOpenDM?.(u.name)}
                    title="Message privé"
                    className="w-5 h-5 rounded-lg flex items-center justify-center bg-secondary border border-border text-muted-foreground/50 hover:text-primary hover:border-primary/40 transition-all">
                    <MessageSquare className="w-2.5 h-2.5" />
                  </button>
                </div>
              </div>
            ))
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
              <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-amber-400">
                <Lock className="w-4 h-4" />
              </div>
              <span className="text-[15px] font-semibold text-foreground flex-1">Salon privé</span>
              <button onClick={() => setPasswordPrompt(null)} className="p-1.5 rounded-lg border border-white/10 text-muted-foreground/60 hover:bg-white/5 transition-colors">
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
                  className="w-full bg-secondary border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/40 outline-none focus:border-amber-500/50 mb-3"
                />
                {passwordError && <p className="text-[11px] text-red-400 mb-3">{passwordError}</p>}
                <button
                  type="submit"
                  className="w-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl px-4 py-3 text-sm font-semibold text-white hover:shadow-lg hover:shadow-amber-500/25 hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  Entrer
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
