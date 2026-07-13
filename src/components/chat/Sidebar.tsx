import React, { useState, memo } from 'react';
import { useUser, useSalons, useUI, usePreferences, useNotifications, useDM } from '@/lib/contexts';
import Avatar from './Avatar';
import DiamondBadge from './DiamondBadge';
import { SearchPanel } from './SearchPanel';
import { StatsPanel } from './StatsPanel';
import { Home, MessageSquare, Bell, Star, ShieldAlert, Settings, Sun, Moon, Search, TrendingUp, LucideIcon, LogOut } from 'lucide-react';
import { getSpecialBadgeForUser } from '@/lib/diamondBadges';
import { hasAdminAccess } from '@/lib/utils/founderCheck';

interface SidebarProps {
  onOpenDM: () => void;
  onOpenNotifications: () => void;
  onOpenSettings: () => void;
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
  const dmUnread = user?.name ? getUnreadCount(user.name) : 0;
  const [showSearch, setShowSearch] = useState(false);
  const [showStats, setShowStats] = useState(false);

  return (
    <div className="hidden sm:flex w-[60px] bg-card flex-col items-center border-r border-border shrink-0 h-full py-3 gap-1">

      {/* Logo */}
      <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3 overflow-hidden">
        <img src="/logo.png" alt="Virtuel-RT" className="w-full h-full object-cover" />
      </div>

      <IconBtn icon={Home} title="Accueil" onClick={() => setCurrentSalon(null)} />
      <IconBtn icon={Search} title="Recherche" onClick={() => setShowSearch(true)} />
      <IconBtn icon={TrendingUp} title="Statistiques" onClick={() => setShowStats(true)} />
      <IconBtn icon={MessageSquare} title="Messages privés" onClick={onOpenDM} badge={dmUnread > 0 ? dmUnread : null} />
      <IconBtn icon={Bell} title="Notifications" onClick={onOpenNotifications} badge={unreadCount > 0 ? unreadCount : null} />

      <div className="flex-1" />

      {/* Thème */}
      <IconBtn icon={theme === 'dark' ? Sun : Moon} title={theme === 'dark' ? 'Mode clair' : 'Mode sombre'} onClick={toggleTheme} />

      {/* Premium */}
      <button onClick={isPremium ? undefined : activatePremium}
        title={isPremium ? 'Membre Premium' : 'Devenir Premium'}
        className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${isPremium ? 'bg-yellow-500/15 border border-yellow-500/40 text-yellow-400' : 'bg-secondary border border-border text-muted-foreground/50 hover:text-yellow-400 hover:border-yellow-500/40'}`}>
        <Star className="w-4 h-4" />
      </button>

      {/* Admin — visible uniquement pour les utilisateurs autorisés */}
      {hasAdminAccess(user) && (
        <button onClick={() => openAdmin(user)} title="Administration"
          className="w-9 h-9 rounded-xl flex items-center justify-center bg-red-500/10 border border-red-500/25 text-red-400 hover:bg-red-500/20 transition-colors">
          <ShieldAlert className="w-4 h-4" />
        </button>
      )}

      {/* Profil */}
      {user && (
        <button onClick={onOpenSettings} title="Paramètres" className="mt-1 relative group">
          <Avatar avatarClass={user.avatar} initials={user.initials} size="sm" />
          <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-card rounded-full" />
        </button>
      )}

      {/* Déconnexion - visible uniquement si connecté à Supabase */}
      {supabaseUser && (
        <button onClick={logout} title="Se déconnecter"
          className="w-9 h-9 rounded-xl flex items-center justify-center bg-red-500/10 border border-red-500/25 text-red-400 hover:bg-red-500/20 transition-colors">
          <LogOut className="w-4 h-4" />
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
      className="relative w-9 h-9 rounded-xl flex items-center justify-center bg-secondary border border-border text-muted-foreground/50 hover:text-foreground hover:bg-white/[0.06] transition-all duration-200 hover:scale-105 active:scale-95 group">
      <Icon className="w-4 h-4 group-hover:animate-float" />
      {badge && (
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-white text-[9px] font-bold rounded-full flex items-center justify-center animate-pulse">
          {badge > 9 ? '9+' : badge}
        </span>
      )}
    </button>
  );
});
