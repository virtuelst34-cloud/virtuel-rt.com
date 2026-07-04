import React, { useState, useEffect } from 'react';
import { useUser, useSalons, useMuteBlock } from '@/lib/contexts';
import Avatar from './Avatar';
import DiamondBadge from './DiamondBadge';
import GenderIcon from './GenderIcon';
import UserProfileView from './UserProfileView';
import { Users, Search, X, Crown, Shield, Star, MessageSquare, UserX, Eye } from 'lucide-react';
import { presenceService } from '@/lib/presenceService';

interface MembersPanelProps {
  onClose: () => void;
  onOpenDM?: (name: string) => void;
}

export default function MembersPanel({ onClose, onOpenDM }: MembersPanelProps) {
  const { user, profiles } = useUser();
  const { currentSalon } = useSalons();
  const { isMuted, isBlocked, blockUser, unblockUser } = useMuteBlock();
  const [search, setSearch] = useState('');
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [presenceMembers, setPresenceMembers] = useState<any[]>([]);
  const [viewProfile, setViewProfile] = useState<string | null>(null);

  useEffect(() => {
    const loadOnlineUsers = () => {
      const users = currentSalon ? presenceService.getOnlineUsersInSalon(currentSalon) : presenceService.getOnlineUsers();
      setOnlineUsers(users.map(u => u.name));
      setPresenceMembers(users.map(u => ({
        ...(profiles[u.name] || {}),
        name: u.name,
        avatar: profiles[u.name]?.avatar || u.avatar || 'av1',
        initials: profiles[u.name]?.initials || u.initials || u.name.slice(0, 2).toUpperCase(),
        level: profiles[u.name]?.level || 1,
        status: profiles[u.name]?.status || u.status || 'online',
        statusText: profiles[u.name]?.statusText,
        gender: profiles[u.name]?.gender,
      })));
    };

    loadOnlineUsers();
    const unsubscribe = presenceService.subscribe(loadOnlineUsers);
    return unsubscribe;
  }, [currentSalon, profiles]);

  const profileMembers = Object.values(profiles).filter(p => p.name !== user?.name);
  const allMembers = [...presenceMembers, ...profileMembers]
    .filter(m => m.name !== user?.name)
    .filter(m => !isMuted(m.name) && !isBlocked(m.name))
    .filter((m, index, arr) => arr.findIndex(other => other.name === m.name) === index);
  const onlineMembers = allMembers.filter(m => onlineUsers.includes(m.name));
  const offlineMembers = allMembers.filter(m => !onlineUsers.includes(m.name));

  const matchesSearch = (name: string) => !search || name.toLowerCase().includes(search.toLowerCase());
  const filteredOnline = onlineMembers.filter(m => matchesSearch(m.name));
  const filteredOffline = offlineMembers.filter(m => matchesSearch(m.name));

  const handleBlockToggle = async (name: string) => {
    if (isBlocked(name)) await unblockUser(name);
    else await blockUser(name);
  };

  const openDM = (name: string) => {
    onClose();
    onOpenDM?.(name);
  };

  return (
    <>
      <div className="fixed right-0 top-0 h-full w-80 bg-card border-l border-border flex flex-col z-40 animate-in slide-in-from-right duration-300">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">Membres</span>
            <span className="text-xs text-muted-foreground">({onlineMembers.length})</span>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-muted-foreground/50 hover:text-foreground hover:bg-white/5 transition-all" aria-label="Fermer la liste des membres">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-3 py-2 border-b border-border">
          <div className="flex items-center gap-2 bg-secondary border border-border rounded-lg px-3 py-1.5">
            <Search className="w-3.5 h-3.5 text-muted-foreground/40" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un membre..."
              className="flex-1 bg-transparent border-none outline-none text-xs text-foreground placeholder:text-muted-foreground/40"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredOnline.length > 0 && (
            <div className="p-3">
              <div className="text-xs font-semibold text-muted-foreground/60 mb-2 px-1">En ligne</div>
              {filteredOnline.map((member) => (
                <MemberItem
                  key={member.name}
                  member={member}
                  isOnline
                  blocked={isBlocked(member.name)}
                  onViewProfile={() => setViewProfile(member.name)}
                  onOpenDM={() => openDM(member.name)}
                  onToggleBlock={() => handleBlockToggle(member.name)}
                />
              ))}
            </div>
          )}

          {filteredOffline.length > 0 && (
            <div className="p-3 border-t border-border">
              <div className="text-xs font-semibold text-muted-foreground/60 mb-2 px-1">Hors ligne</div>
              {filteredOffline.map((member) => (
                <MemberItem
                  key={member.name}
                  member={member}
                  isOnline={false}
                  blocked={isBlocked(member.name)}
                  onViewProfile={() => setViewProfile(member.name)}
                  onOpenDM={() => openDM(member.name)}
                  onToggleBlock={() => handleBlockToggle(member.name)}
                />
              ))}
            </div>
          )}

          {filteredOnline.length === 0 && filteredOffline.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-2 py-8 text-muted-foreground/40">
              <Users className="w-8 h-8" />
              <p className="text-xs">Aucun membre trouvé</p>
            </div>
          )}
        </div>
      </div>

      {viewProfile && (
        <UserProfileView
          targetName={viewProfile}
          onClose={() => setViewProfile(null)}
          onOpenDM={(name) => openDM(name)}
        />
      )}
    </>
  );
}

function MemberItem({
  member,
  isOnline,
  blocked,
  onViewProfile,
  onOpenDM,
  onToggleBlock,
}: {
  member: any;
  isOnline: boolean;
  blocked: boolean;
  onViewProfile: () => void;
  onOpenDM: () => void;
  onToggleBlock: () => void;
}) {
  return (
    <div className={`group flex items-center gap-3 px-2 py-2 rounded-lg transition-all hover:bg-white/[0.04] ${isOnline ? '' : 'opacity-75'} ${blocked ? 'bg-red-500/5 border border-red-500/15' : ''}`}>
      <button type="button" onClick={onViewProfile} className="relative shrink-0 transition-transform hover:scale-105" aria-label={`Voir le profil de ${member.name}`}>
        <Avatar avatarClass={member.avatar || 'av1'} initials={member.initials || member.name.slice(0, 2).toUpperCase()} size="sm" />
        {isOnline && <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-card rounded-full" />}
      </button>

      <button type="button" onClick={onViewProfile} className="flex-1 min-w-0 text-left" aria-label={`Ouvrir le profil de ${member.name}`}>
        <div className="flex items-center gap-1.5">
          <GenderIcon gender={member.gender} size={10} />
          <span className={`text-xs font-medium truncate ${blocked ? 'text-red-300' : 'text-foreground'}`}>{member.name}</span>
          {member.isFounder && <Crown className="w-3 h-3 text-yellow-400" />}
          {member.isAdmin && <Shield className="w-3 h-3 text-red-400" />}
          {member.isPremium && <Star className="w-3 h-3 text-yellow-400" />}
        </div>
        <div className="flex items-center gap-1 mt-0.5">
          <DiamondBadge level={member.level || 1} size="xs" />
          <span className="text-[10px] text-muted-foreground/50 truncate">
            {blocked ? 'Bloqué' : member.statusText || (isOnline ? 'Disponible' : 'Hors ligne')}
          </span>
        </div>
      </button>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button type="button" onClick={onViewProfile} className="p-1.5 rounded-lg text-muted-foreground/50 hover:text-primary hover:bg-primary/10" title="Profil" aria-label={`Voir ${member.name}`}>
          <Eye className="w-3.5 h-3.5" />
        </button>
        <button type="button" onClick={onOpenDM} className="p-1.5 rounded-lg text-muted-foreground/50 hover:text-emerald-400 hover:bg-emerald-500/10" title="Message" aria-label={`Envoyer un message à ${member.name}`}>
          <MessageSquare className="w-3.5 h-3.5" />
        </button>
        <button type="button" onClick={onToggleBlock} className={`p-1.5 rounded-lg ${blocked ? 'text-red-300 bg-red-500/10' : 'text-muted-foreground/50 hover:text-red-400 hover:bg-red-500/10'}`} title={blocked ? 'Débloquer' : 'Bloquer'} aria-label={blocked ? `Débloquer ${member.name}` : `Bloquer ${member.name}`}>
          <UserX className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
