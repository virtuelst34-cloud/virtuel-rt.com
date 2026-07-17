import React, { useState, memo } from 'react';
import { useUser, useSalons, useUI, usePreferences, useNotifications, useDM, useFriends } from '@/lib/contexts';
import Avatar from './Avatar';
import { SearchPanel } from './SearchPanel';
import { StatsPanel } from './StatsPanel';
import { Home, MessageSquare, Bell, Star, ShieldAlert, Sun, Moon, Search, TrendingUp, LucideIcon, LogOut } from 'lucide-react';
import { hasAdminAccess } from '@/lib/utils/founderCheck';

interface SidebarProps {
  onOpenDM: (name?: string | null) => void;
  onOpenNotifications: () => void;
  onOpenSettings: (tab?: string) => void;
}

interface IconBtnProps {
  icon: LucideIcon;
  title: string;
  onClick: () => void;
  badge?: number | null;
}

const Sidebar = memo(function Sidebar({ onOpenDM, onOpenNotifications, onOpenSettings }: SidebarProps) {
  const { user, logout, supabaseUser } = useUser();
  const { setCurrentSalon } = useSalons();
  const { openAdmin } = useUI();
  const { theme, toggleTheme, isPremium, activatePremium } = usePreferences();
  const { unreadCount } = useNotifications();
  const { getUnreadCount } = useDM();
  const { pendingRequests } = useFriends();
  const dmUnread = user?.name ? getUnreadCount(user.name) : 0;
  const pendingFriends = pendingRequests.length;
  const [showSearch, setShowSearch] = useState(false);
  const [showStats, setShowStats] = useState(false);

  return (
    <div className="hidden sm:flex w-[72px] bg-card flex-col items-center border-r border-border shrink-0 h-full py-3 gap-1.5">

      {/* Logo */}
      <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 overflow-hidden">
        <img
          src="/logo.png"
          alt="Virtuel-RT"
          className="w-full h-full object-cover object-[center_12%] scale-[1.34] origin-[center_12%]"
        />
      </div>

      <IconBtn icon={Home} title="Accueil" onClick={() => setCurrentSalon(null)} />
      <IconBtn icon={Search} title="Recherche" onClick={() => setShowSearch(true)} />
      <IconBtn icon={TrendingUp} title="Statistiques" onClick={() => setShowStats(true)} />
      <IconBtn icon={MessageSquare} title="Messages privés" onClick={() => onOpenDM()} badge={dmUnread > 0 ? dmUnread : null} />
      <IconBtn icon={Bell} title="Notifications" onClick={onOpenNotifications} badge={unreadCount > 0 ? unreadCount : null} />

      <div className="flex-1" />

      {/* Thème */}
      <IconBtn icon={theme === 'dark' ? Sun : Moon} title={theme === 'dark' ? 'Mode clair' : 'Mode sombre'} onClick={toggleTheme} />

      {/* Premium */}
      <button onClick={isPremium ? undefined : activatePremium}
        title={isPremium ? 'Membre Premium' : 'Devenir Premium'}
        className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${isPremium ? 'bg-yellow-500/15 border border-yellow-500/40 text-yellow-400' : 'bg-secondary border border-border text-muted-foreground/50 hover:text-yellow-400 hover:border-yellow-500/40'}`}>
        <Star className="w-[18px] h-[18px]" />
      </button>

      {/* Admin — visible uniquement pour les utilisateurs autorisés */}
      {hasAdminAccess(user) && (
        <button onClick={() => openAdmin(user)} title="Administration"
          className="w-10 h-10 rounded-xl flex items-center justify-center bg-red-500/10 border border-red-500/25 text-red-400 hover:bg-red-500/20 transition-colors">
          <ShieldAlert className="w-[18px] h-[18px]" />
        </button>
      )}

      {/* Profil / Paramètres — badge demandes d'amis */}
      {user && (
        <button
          onClick={() => onOpenSettings(pendingFriends > 0 ? 'friends' : 'profile')}
          title={pendingFriends > 0 ? `Paramètres · ${pendingFriends} demande${pendingFriends > 1 ? 's' : ''} d'ami` : 'Paramètres'}
          className="mt-1 relative group"
        >
          <Avatar avatarClass={user.avatar} initials={user.initials} size="sm" />
          <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-card rounded-full" />
          {pendingFriends > 0 && (
            <span className="absolute -top-1 -left-1 min-w-[16px] h-4 px-0.5 bg-blue-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center animate-pulse">
              {pendingFriends > 9 ? '9+' : pendingFriends}
            </span>
          )}
        </button>
      )}

      {/* Déconnexion (compte ou invité) */}
      {user && (
        <button onClick={() => void logout()} title={supabaseUser ? 'Se déconnecter' : 'Quitter la session invité'}
          className="w-10 h-10 rounded-xl flex items-center justify-center bg-red-500/10 border border-red-500/25 text-red-400 hover:bg-red-500/20 transition-colors">
          <LogOut className="w-[18px] h-[18px]" />
        </button>
      )}

      {/* Search Panel */}
      {showSearch && <SearchPanel onClose={() => setShowSearch(false)} />}

      {/* Stats Panel */}
      {showStats && <StatsPanel onClose={() => setShowStats(false)} />}
    </div>
  );
});

export default Sidebar;

const IconBtn = memo(function IconBtn({ icon: Icon, title, onClick, badge }: IconBtnProps) {
  return (
    <button onClick={onClick} title={title}
      className="relative w-10 h-10 rounded-xl flex items-center justify-center bg-secondary border border-border text-muted-foreground/50 hover:text-foreground hover:bg-white/[0.06] transition-all duration-200 hover:scale-105 active:scale-95 group">
      <Icon className="w-[18px] h-[18px] group-hover:animate-float" />
      {badge != null && badge > 0 && (
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-white text-[9px] font-bold rounded-full flex items-center justify-center animate-pulse">
          {badge > 9 ? '9+' : badge}
        </span>
      )}
    </button>
  );
});
