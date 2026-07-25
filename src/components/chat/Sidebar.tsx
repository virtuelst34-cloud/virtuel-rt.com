import React, { useState, memo } from 'react';
import { useUser, useSalons, useUI, usePreferences, useNotifications, useDM, useFriends, useGlobalSettings } from '@/lib/contexts';
import Avatar from './Avatar';
import { SearchPanel } from './SearchPanel';
import { StatsPanel } from './StatsPanel';
import { Home, MessageSquare, Bell, Star, ShieldAlert, Sun, Moon, Search, TrendingUp, LucideIcon, LogOut, MessagesSquare } from 'lucide-react';
import { hasAdminAccess, hasStaffAccess } from '@/lib/utils/founderCheck';
import StaffChatPanel from './StaffChatPanel';

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
  accent?: 'default' | 'admin' | 'premium';
}

const Sidebar = memo(function Sidebar({ onOpenDM, onOpenNotifications, onOpenSettings }: SidebarProps) {
  const { user, logout, supabaseUser } = useUser();
  const { setCurrentSalon } = useSalons();
  const { openAdmin } = useUI();
  const { theme, toggleTheme, isPremium, activatePremium } = usePreferences();
  const { unreadCount } = useNotifications();
  const { getUnreadCount } = useDM();
  const { pendingRequests } = useFriends();
  const { settings } = useGlobalSettings();
  const dmUnread = user?.name ? getUnreadCount(user.name) : 0;
  const pendingFriends = pendingRequests.length;
  const [showSearch, setShowSearch] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showStaffChat, setShowStaffChat] = useState(false);

  return (
    <>
      {/* Icon rail — overlays must NOT nest here (fixed children collapse to ~72px) */}
      <nav
        aria-label="Navigation principale"
        className="hidden sm:flex w-[72px] min-w-[72px] max-w-[72px] bg-card flex-col items-center border-r border-border shrink-0 h-full py-3 gap-1.5 overflow-visible"
      >
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3 overflow-hidden bg-black/40 ring-1 ring-primary/25 shadow-md shadow-primary/20 shrink-0">
          <img
            src="/logo.png"
            alt="Virtuel-RT"
            className="w-full h-full object-contain p-0.5"
          />
        </div>

        <IconBtn icon={Home} title="Accueil — Étincelle du jour" onClick={() => setCurrentSalon(null)} />
        <IconBtn icon={Search} title="Recherche" onClick={() => setShowSearch(true)} />
        <IconBtn icon={TrendingUp} title="Statistiques" onClick={() => setShowStats(true)} />
        {settings.enable_dm && (
          <IconBtn icon={MessageSquare} title="Messages privés" onClick={() => onOpenDM()} badge={dmUnread > 0 ? dmUnread : null} />
        )}
        {settings.enable_notifications && (
          <IconBtn icon={Bell} title="Notifications" onClick={onOpenNotifications} badge={unreadCount > 0 ? unreadCount : null} />
        )}
        <div className="flex-1 min-h-2" />

        {user && (
          <button
            type="button"
            onClick={() => onOpenSettings(pendingFriends > 0 ? 'friends' : 'profile')}
            title={pendingFriends > 0 ? `Mon compte · ${pendingFriends} demande${pendingFriends > 1 ? 's' : ''} d'ami` : 'Mon compte'}
            aria-label={pendingFriends > 0 ? `Mon compte · ${pendingFriends} demande${pendingFriends > 1 ? 's' : ''} d'ami` : 'Mon compte'}
            className="relative w-10 h-10 shrink-0 rounded-xl flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95 group border bg-secondary border-border text-muted-foreground/50 hover:text-foreground hover:bg-white/[0.06]"
          >
            <Avatar avatarClass={user.avatar} initials={user.initials} size="sm" />
            <div className="absolute bottom-0.5 right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-card rounded-full" />
            {pendingFriends > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-0.5 bg-blue-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center animate-pulse">
                {pendingFriends > 9 ? '9+' : pendingFriends}
              </span>
            )}
            <span className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-2.5 px-2 py-1 rounded-md bg-popover border border-border text-[11px] text-foreground whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-[100] shadow-lg">
              Mon compte
            </span>
          </button>
        )}

        <IconBtn
          icon={theme === 'dark' ? Sun : Moon}
          title={theme === 'dark' ? 'Mode clair' : 'Mode sombre'}
          onClick={toggleTheme}
        />

        <IconBtn
          icon={Star}
          title={isPremium ? 'Membre Premium' : 'Devenir Premium'}
          onClick={isPremium ? () => undefined : activatePremium}
          accent="premium"
        />

        {(hasAdminAccess(user) || hasStaffAccess(user)) && (
          <IconBtn
            icon={ShieldAlert}
            title="Administration"
            onClick={() => openAdmin(user)}
            accent="admin"
          />
        )}

        {hasStaffAccess(user) && (
          <IconBtn
            icon={MessagesSquare}
            title="Espace staff"
            onClick={() => setShowStaffChat(true)}
            accent="admin"
          />
        )}

        {user && (
          <IconBtn
            icon={LogOut}
            title={supabaseUser ? 'Se déconnecter' : 'Quitter la session invité'}
            onClick={() => void logout()}
            accent="admin"
          />
        )}
      </nav>

      {/* Overlays rendered outside the narrow rail */}
      {showSearch && <SearchPanel onClose={() => setShowSearch(false)} />}
      {showStats && <StatsPanel onClose={() => setShowStats(false)} />}
      {showStaffChat && <StaffChatPanel onClose={() => setShowStaffChat(false)} />}
    </>
  );
});

export default Sidebar;

const IconBtn = memo(function IconBtn({ icon: Icon, title, onClick, badge, accent = 'default' }: IconBtnProps) {
  const accentClass =
    accent === 'admin'
      ? 'bg-red-500/10 border-red-500/25 text-red-400 hover:bg-red-500/20 hover:text-red-300'
      : accent === 'premium'
        ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/20'
        : 'bg-secondary border-border text-muted-foreground/50 hover:text-foreground hover:bg-white/[0.06]';

  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      className={`relative w-10 h-10 shrink-0 rounded-xl flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95 group border ${accentClass}`}
    >
      <Icon className="w-[18px] h-[18px]" aria-hidden="true" />
      {badge != null && badge > 0 && (
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-white text-[9px] font-bold rounded-full flex items-center justify-center animate-pulse">
          {badge > 9 ? '9+' : badge}
        </span>
      )}
      <span className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-2.5 px-2 py-1 rounded-md bg-popover border border-border text-[11px] text-foreground whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-[100] shadow-lg">
        {title}
      </span>
    </button>
  );
});
