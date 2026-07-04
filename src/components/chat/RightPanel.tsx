import React, { useEffect, useState } from 'react';
import { Diamond, Flame, Trophy, MapPin, Calendar, MessageSquare, User } from 'lucide-react';
import Avatar from './Avatar';
import DiamondBadge from './DiamondBadge';
import UserProfileView from './UserProfileView';
import { useChat } from '@/lib/contexts';
import { getSpecialBadgeForUser } from '@/lib/diamondBadges';
import { presenceService, OnlineUser } from '@/lib/presenceService';

const COLORS = ['#8b5cf6', '#ec4899', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'];
const MEDAL  = ['🥇', '🥈', '🥉'];

interface RightPanelProps {
  onOpenDM?: (name: string) => void;
}

export default function RightPanel({ onOpenDM }: RightPanelProps) {
  const { user, profiles, xpProgress, xpForLevel, monthlyXP } = useChat();
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [viewProfile, setViewProfile] = useState<string | null>(null);

  const lvl  = user?.level || 1;
  const xp   = user?.xp    || 0;
  const next = xpForLevel ? xpForLevel(lvl) : 500;
  const prog = user && xpProgress ? xpProgress(user) : 0;
  const specialBadge = user ? getSpecialBadgeForUser(user) : null;

  // Charger les utilisateurs en ligne
  useEffect(() => {
    setOnlineUsers(presenceService.getOnlineUsers());

    const unsubscribe = presenceService.subscribe(() => {
      setOnlineUsers(presenceService.getOnlineUsers());
    });

    return unsubscribe;
  }, []);

  // Classement mensuel
  const monthlyRanked = Object.entries(monthlyXP || {})
    .map(([name, mxp]) => ({ mxp, ...(profiles[name] || {}) }))
    .sort((a, b) => b.mxp - a.mxp)
    .slice(0, 10);

  // Classement global
  const ranked = Object.values(profiles)
    .sort((a, b) => (b.level || 1) - (a.level || 1) || (b.xp || 0) - (a.xp || 0))
    .slice(0, 10);

  return (
    <>
      <div className="w-[220px] bg-card border-l border-border flex flex-col shrink-0 overflow-y-auto">

      {/* XP du joueur */}
      <div className="p-3 border-b border-border">
        <div className="text-[9.5px] text-muted-foreground/50 uppercase tracking-widest mb-2">Ton diamant</div>
        <div className="text-center py-1">
          {user ? <DiamondBadge level={lvl} size="md" showLabel specialBadge={specialBadge || undefined} /> : <Diamond className="w-7 h-7 text-indigo-400 mx-auto mb-1" />}
          <div className="text-xs text-purple-300 font-semibold mt-1">Niveau {lvl}</div>
          <div className="text-[10px] text-muted-foreground/50 mt-0.5">{xp.toLocaleString()} / {next.toLocaleString()} XP</div>
          <div className="bg-secondary rounded h-[3px] mt-2">
            <div className="h-[3px] rounded xp-gradient transition-all duration-500" style={{ width: `${prog}%` }} />
          </div>
        </div>
        <div className="text-[9px] text-muted-foreground/50 uppercase tracking-widest mt-3 mb-1.5">Couleur évolutive</div>
        <div className="flex gap-1.5 flex-wrap">
          {COLORS.map(c => (
            <button key={c} className="w-[15px] h-[15px] rounded-full border border-white/14 hover:scale-125 transition-transform cursor-pointer" style={{ background: c }} />
          ))}
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
        ) : monthlyRanked.map((r, i) => {
          const isMe = r.name === user?.name;
          return (
            <div key={r.name} className={`flex items-center gap-1.5 py-1.5 px-1 rounded-lg mb-0.5 ${isMe ? 'bg-yellow-500/8 border border-yellow-500/18' : ''}`}>
              <span className="text-[11px] w-4 text-center shrink-0">{MEDAL[i] || `${i+1}`}</span>
              <Avatar avatarClass={r.avatar || 'av1'} initials={r.initials || r.name?.slice(0,2).toUpperCase()} size="xs" />
              <div className="flex-1 min-w-0">
                <span className={`text-[11px] truncate font-medium block ${isMe ? 'text-yellow-300' : 'text-muted-foreground'}`}>{r.name}</span>
                <span className="text-[9px] text-muted-foreground/40">{r.mxp.toLocaleString()} XP</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Classement global */}
      <div className="p-3 border-b border-border flex-1">
        <div className="flex items-center gap-1.5 mb-3">
          <Flame className="w-3 h-3 text-orange-400" />
          <span className="text-[9.5px] text-muted-foreground/50 uppercase tracking-widest">Classement</span>
        </div>
        {ranked.length === 0
          ? <p className="text-[10px] text-muted-foreground/40 italic">Aucun profil.</p>
          : ranked.map((r, i) => {
            const isMe = r.name === user?.name;
            const specialBadge = getSpecialBadgeForUser(r);
            return (
              <div key={r.name} className={`flex items-center gap-1.5 py-1.5 px-1 rounded-lg mb-0.5 ${isMe ? 'bg-purple-500/8 border border-purple-500/18' : ''}`}>
                <span className="text-[10px] text-muted-foreground/40 w-4 text-center shrink-0">{i+1}</span>
                <Avatar avatarClass={r.avatar || 'av1'} initials={r.initials || r.name?.slice(0,2).toUpperCase()} size="xs" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1 justify-between">
                    <span className={`text-[11px] truncate font-medium ${isMe ? 'text-purple-300' : 'text-muted-foreground'}`}>{r.name}</span>
                    <div className="flex items-center gap-0.5 shrink-0">
                      <DiamondBadge level={r.level || 1} size="xs" specialBadge={specialBadge || undefined} />
                      <span className="text-[10px] text-purple-400 font-bold">Nv.{r.level||1}</span>
                    </div>
                  </div>
                  <div className="bg-secondary rounded-full h-[2px] mt-0.5">
                    <div className="h-[2px] rounded-full xp-gradient" style={{ width: `${r.xp != null && xpProgress ? xpProgress(r) : 0}%` }} />
                  </div>
                </div>
              </div>
            );
          })
        }
      </div>

      {/* En ligne */}
      <div className="p-3">
        <div className="text-[9.5px] text-muted-foreground/50 uppercase tracking-widest mb-2">En ligne ({onlineUsers.length})</div>
        {onlineUsers.length === 0 ? (
          <p className="text-[10px] text-muted-foreground/40 italic">Aucun utilisateur en ligne.</p>
        ) : (
          onlineUsers.map((onlineUser) => {
            const userProfile = profiles[onlineUser.name];
            return (
              <div key={onlineUser.userId} className="flex items-center gap-2 py-1.5 px-1 rounded-lg hover:bg-white/[0.03] transition-colors group cursor-pointer">
                <Avatar avatarClass={onlineUser.avatar} initials={onlineUser.initials} size="xs" />
                <div className="flex-1 min-w-0">
                  <span className="text-[12px] text-foreground font-medium truncate block">{onlineUser.name}</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {userProfile?.age && (
                      <span className="text-[9px] text-muted-foreground/40">{userProfile.age} ans</span>
                    )}
                    {userProfile?.city && (
                      <span className="flex items-center gap-0.5 text-[9px] text-muted-foreground/40">
                        <MapPin className="w-2.5 h-2.5" />
                        {userProfile.city}
                      </span>
                    )}
                  </div>
                </div>
                <span className={`text-[9px] rounded-full px-2 py-px border shrink-0 ${
                  onlineUser.status === 'online' 
                    ? 'bg-emerald-500/12 text-emerald-400 border-emerald-500/22' 
                    : onlineUser.status === 'away'
                    ? 'bg-yellow-500/12 text-yellow-400 border-yellow-500/22'
                    : 'bg-red-500/12 text-red-400 border-red-500/22'
                }`}>
                  {onlineUser.status === 'online' ? 'En ligne' : onlineUser.status === 'away' ? 'Absent' : 'Occupé'}
                </span>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {onOpenDM && (
                    <button 
                      onClick={() => onOpenDM(onlineUser.name)}
                      className="p-1 rounded hover:bg-primary/20 text-primary/60 hover:text-primary transition-all active:scale-95 cursor-pointer"
                      title="Message"
                    >
                      <MessageSquare className="w-3 h-3 pointer-events-none" />
                    </button>
                  )}
                  <button 
                    onClick={() => setViewProfile(onlineUser.name)}
                    className="p-1 rounded hover:bg-primary/20 text-primary/60 hover:text-primary transition-all active:scale-95 cursor-pointer"
                    title="Profil"
                  >
                    <User className="w-3 h-3 pointer-events-none" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
    {viewProfile && (
      <UserProfileView userName={viewProfile} onClose={() => setViewProfile(null)} />
    )}
  </>
  );
}
