import React, { useState, useRef, useCallback } from 'react';
import { useUser, useSalons, useNotifications } from '@/lib/contexts';
import { SALONS } from '@/lib/chatConfig';
import Avatar from './Avatar';
import DiamondBadge from './DiamondBadge';
import UserProfileView from './UserProfileView';
import { MessageSquare, Hand } from 'lucide-react';

// Emoji par salon
const SALON_EMOJI = {
  musique60: '🎵', musique80: '🎸', karaoke: '🎤', debat: '⚡',
  quiz: '🧠', jeunes: '👋', lgbt: '🌈', divorce: '💙',
  libre: '🚪', insulte: '😤', cameras: '📹', bar: '🍷',
};

// Membres connectés simulés (en vrai, viendrait du backend)
const ONLINE_DEMO = [
  { name: 'Cantique', avatar: 'av6', initials: 'CA', level: 8,  salon: 'musique60' },
  { name: 'PiCanna',  avatar: 'av3', initials: 'PC', level: 5,  salon: 'debat'     },
  { name: 'Coeur',    avatar: 'av2', initials: 'CO', level: 12, salon: 'karaoke'   },
  { name: 'Thierry',  avatar: 'av5', initials: 'TH', level: 3,  salon: 'bar'       },
  { name: 'Mélanie',  avatar: 'av1', initials: 'ME', level: 18, salon: 'libre'     },
  { name: 'Sasha',    avatar: 'av4', initials: 'SA', level: 25, salon: null        },
];

// Pulse animé pour les salons live ou actifs
function PulseDot({ color = 'bg-emerald-500' }) {
  return (
    <span className="relative flex h-2 w-2 shrink-0">
      <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${color} opacity-60`} />
      <span className={`relative inline-flex rounded-full h-2 w-2 ${color}`} />
    </span>
  );
}

export default function WelcomeScreen({ onOpenDM }) {
  const { setCurrentSalon, customSalons, hiddenSalons } = useSalons();
  const { user, profiles } = useUser();
  const { addNotification } = useNotifications();
  const [hoveredUser, setHoveredUser] = useState(null);
  const [waved, setWaved]             = useState({});
  const [filter, setFilter]           = useState('all');
  const [viewProfile, setViewProfile] = useState(null);
  const waveTimersRef                 = useRef({});

  const allSalons = [...SALONS, ...(customSalons || [])].filter(s => !(hiddenSalons || []).includes(s.id));

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

  const handleWave = useCallback((name) => {
    setWaved(prev => ({ ...prev, [name]: true }));
    addNotification({ type: 'dm', message: `👋 Vous avez salué ${name} !` });
    clearTimeout(waveTimersRef.current[name]);
    waveTimersRef.current[name] = setTimeout(() => {
      setWaved(prev => ({ ...prev, [name]: false }));
      delete waveTimersRef.current[name];
    }, 2000);
  }, [addNotification]);

  return (
    <div className="flex-1 flex min-h-0 overflow-hidden">

      {/* ── Colonne gauche : liste des salons ── */}
      <div className="w-[260px] border-r border-border flex flex-col shrink-0 bg-card">
        <div className="px-4 py-3 border-b border-border">
          <h3 className="text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-widest">Salons</h3>
        </div>

        {/* Filtres */}
        <div className="flex gap-1 px-3 py-2 border-b border-border">
          {[['all','Tous'],['vocal','Vocal'],['chat','Chat'],['video','Vidéo']].map(([id, label]) => (
            <button key={id} onClick={() => setFilter(id)}
              className={`flex-1 py-1 rounded-md text-[10px] font-medium transition-all ${filter === id ? 'bg-primary/15 text-primary' : 'text-muted-foreground/50 hover:text-muted-foreground'}`}>
              {label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto py-1.5 px-2">
          {filteredSalons.map(salon => (
            <button key={salon.id} onClick={() => setCurrentSalon(salon.id)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl mb-0.5 hover:bg-white/[0.05] transition-colors text-left group">

              {/* Emoji avec fond */}
              <div className="w-9 h-9 rounded-xl bg-secondary border border-border flex items-center justify-center text-lg shrink-0 group-hover:scale-110 transition-transform">
                {salon.emoji || SALON_EMOJI[salon.id] || '💬'}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[13px] font-medium text-foreground truncate">{salon.name}</span>
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

      {/* ── Colonne droite : connectés ── */}
      <div className="w-[240px] border-l border-border flex flex-col shrink-0 bg-card">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <h3 className="text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-widest">En ligne</h3>
          <span className="text-[10px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 rounded-full px-2 py-px">
            {onlineUsers.length + (user ? 1 : 0)}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto py-2 px-2">

          {/* Moi */}
          {user && (
            <div className="flex items-center gap-2.5 px-2 py-2 rounded-xl mb-1 bg-primary/5 border border-primary/15">
              <div className="relative shrink-0">
                <Avatar avatarClass={user.avatar} initials={user.initials} size="sm" />
                <span className="absolute -bottom-px -right-px w-2.5 h-2.5 bg-emerald-500 border-2 border-card rounded-full" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <span className="text-[12px] font-semibold text-primary truncate">{user.name}</span>
                  <DiamondBadge level={user.level || 1} size="xs" />
                </div>
                <span className="text-[10px] text-muted-foreground/40">Vous</span>
              </div>
            </div>
          )}

          {/* Autres */}
          {onlineUsers.length === 0 ? (
            <p className="text-[11px] text-muted-foreground/30 italic text-center py-8">Personne d'autre en ligne</p>
          ) : (
            onlineUsers.map(u => (
              <div key={u.name}
                className="flex items-center gap-2.5 px-2 py-2 rounded-xl mb-0.5 hover:bg-white/[0.04] transition-colors group"
                onMouseEnter={() => setHoveredUser(u.name)}
                onMouseLeave={() => setHoveredUser(null)}>

                <button className="relative shrink-0" onClick={() => setViewProfile(u.name)}>
                  <Avatar avatarClass={u.avatar || 'av1'} initials={u.initials || u.name.slice(0,2).toUpperCase()} size="sm" />
                  <span className="absolute -bottom-px -right-px w-2.5 h-2.5 bg-emerald-500 border-2 border-card rounded-full" />
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <button className="text-[12px] font-medium text-foreground truncate hover:underline hover:text-primary transition-colors"
                      onClick={() => setViewProfile(u.name)}>{u.name}</button>
                    <DiamondBadge level={u.level || 1} size="xs" />
                  </div>
                  {u.salon ? (
                    <span className="text-[10px] text-muted-foreground/40 truncate">
                      {SALON_EMOJI[u.salon]} {SALONS.find(s => s.id === u.salon)?.name}
                    </span>
                  ) : (
                    <span className="text-[10px] text-muted-foreground/30">Accueil</span>
                  )}
                </div>

                {/* Boutons d'interaction — visibles au hover */}
                <div className={`flex gap-1 transition-opacity ${hoveredUser === u.name ? 'opacity-100' : 'opacity-0'}`}>
                  {/* Saluer */}
                  <button onClick={() => handleWave(u.name)}
                    title="Saluer"
                    className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all text-sm ${waved[u.name] ? 'bg-amber-500/20 text-amber-400' : 'bg-secondary border border-border text-muted-foreground/50 hover:text-amber-400 hover:border-amber-500/40'}`}>
                    {waved[u.name] ? '👋' : <Hand className="w-3 h-3" />}
                  </button>
                  {/* MP */}
                  <button onClick={() => onOpenDM?.(u.name)}
                    title="Message privé"
                    className="w-6 h-6 rounded-lg flex items-center justify-center bg-secondary border border-border text-muted-foreground/50 hover:text-primary hover:border-primary/40 transition-all">
                    <MessageSquare className="w-3 h-3" />
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
    </div>
  );
}
