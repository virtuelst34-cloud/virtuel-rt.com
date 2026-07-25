import React from 'react';
import { Home, MessageSquare, Bell, Settings, Menu, ShieldAlert } from 'lucide-react';
import { useUser, useSalons, useNotifications, useDM, useUI, useGlobalSettings } from '@/lib/contexts';
import { hasAdminAccess } from '@/lib/utils/founderCheck';
import Avatar from './Avatar';

interface MobileBottomNavProps {
  onOpenDM: () => void;
  onOpenNotifications: () => void;
  onOpenSettings: (tab?: string) => void;
  onOpenSalons?: () => void;
  showSalonsButton?: boolean;
}

export default function MobileBottomNav({
  onOpenDM,
  onOpenNotifications,
  onOpenSettings,
  onOpenSalons,
  showSalonsButton = true,
}: MobileBottomNavProps) {
  const { user } = useUser();
  const { setCurrentSalon, currentSalon } = useSalons();
  const { unreadCount } = useNotifications();
  const { getUnreadCount } = useDM();
  const { openAdmin } = useUI();
  const { settings } = useGlobalSettings();
  const dmUnread = user?.name ? getUnreadCount(user.name) : 0;

  return (
    <nav
      className="sm:hidden shrink-0 border-t border-border bg-card/95 backdrop-blur-md safe-area-pb z-40"
      aria-label="Navigation mobile"
    >
      <div className="flex items-stretch justify-around px-1 pt-1.5 pb-1 gap-0.5">
        <NavBtn
          label="Accueil"
          active={!currentSalon}
          onClick={() => setCurrentSalon(null)}
          icon={<Home className="w-5 h-5" />}
        />
        {showSalonsButton && onOpenSalons && (
          <NavBtn
            label="Salons"
            onClick={onOpenSalons}
            icon={<Menu className="w-5 h-5" />}
          />
        )}
        {settings.enable_dm && (
          <NavBtn
            label="MP"
            onClick={onOpenDM}
            badge={dmUnread > 0 ? dmUnread : null}
            icon={<MessageSquare className="w-5 h-5" />}
          />
        )}
        {settings.enable_notifications && (
          <NavBtn
            label="Alertes"
            onClick={onOpenNotifications}
            badge={unreadCount > 0 ? unreadCount : null}
            icon={<Bell className="w-5 h-5" />}
          />
        )}
        {hasAdminAccess(user) && (
          <NavBtn
            label="Admin"
            onClick={() => openAdmin(user)}
            icon={<ShieldAlert className="w-5 h-5" />}
          />
        )}
        <NavBtn
          label="Réglages"
          onClick={() => onOpenSettings('profile')}
          icon={
            user ? (
              <Avatar avatarClass={user.avatar} initials={user.initials} size="xs" />
            ) : (
              <Settings className="w-5 h-5" />
            )
          }
        />
      </div>
    </nav>
  );
}

function NavBtn({
  label,
  icon,
  onClick,
  badge,
  active,
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  badge?: number | null;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative flex-1 flex flex-col items-center justify-center gap-0.5 min-h-[48px] rounded-xl transition-colors ${
        active ? 'text-primary bg-primary/10' : 'text-muted-foreground/70 active:bg-white/5'
      }`}
      aria-label={label}
    >
      <span className="relative">
        {icon}
        {badge != null && badge > 0 && (
          <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-0.5 bg-primary text-white text-[9px] font-bold rounded-full flex items-center justify-center">
            {badge > 9 ? '9+' : badge}
          </span>
        )}
      </span>
      <span className="text-[9px] font-medium leading-none">{label}</span>
    </button>
  );
}
