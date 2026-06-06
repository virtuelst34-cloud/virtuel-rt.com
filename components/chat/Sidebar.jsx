import React from 'react';
import { useUser, useSalons, useUI, usePreferences, useNotifications } from '@/lib/contexts';
import Avatar from './Avatar';
import DiamondBadge from './DiamondBadge';
import { Home, MessageSquare, Bell, Star, ShieldAlert, Settings, Sun, Moon } from 'lucide-react';

export default function Sidebar({ onOpenDM, onOpenNotifications, onOpenSettings }) {
  const { user } = useUser();
  const { setCurrentSalon } = useSalons();
  const { setShowAdmin, openAdmin } = useUI();
  const { theme, toggleTheme, isPremium, activatePremium } = usePreferences();
  const { unreadCount } = useNotifications();

  return (
    <div className="w-[60px] bg-card flex flex-col items-center border-r border-border shrink-0 h-full py-3 gap-1">

      {/* Logo */}
      <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-white text-[15px] font-bold border border-primary/60 mb-3">
        V
      </div>

      <IconBtn icon={Home} title="Accueil" onClick={() => setCurrentSalon(null)} />
      <IconBtn icon={MessageSquare} title="Messages privés" onClick={onOpenDM} />
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

      {/* Admin — visible uniquement si l'utilisateur est admin */}
      {user?.isAdmin && (
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
    </div>
  );
}

function IconBtn({ icon: Icon, title, onClick, badge }) {
  return (
    <button onClick={onClick} title={title}
      className="relative w-9 h-9 rounded-xl flex items-center justify-center bg-secondary border border-border text-muted-foreground/50 hover:text-foreground hover:bg-white/[0.06] transition-colors">
      <Icon className="w-4 h-4" />
      {badge && (
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-white text-[9px] font-bold rounded-full flex items-center justify-center">
          {badge > 9 ? '9+' : badge}
        </span>
      )}
    </button>
  );
}
