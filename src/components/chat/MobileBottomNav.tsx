import React from 'react';
import { Home, MessageSquare, Bell, Settings, Menu, ShieldAlert } from 'lucide-react';
import { useUser, useNotifications, useDM, useUI, useGlobalSettings } from '@/lib/contexts';
import { hasStaffAccess } from '@/lib/utils/founderCheck';
import Avatar from './Avatar';
import type { MobileSurface } from '@/lib/mobileShell';

interface MobileBottomNavProps {
  surface?: MobileSurface;
  onGoHome: () => void;
  onOpenDM: () => void;
  onOpenNotifications: () => void;
  onOpenSettings: (tab?: string) => void;
  onOpenSalons?: () => void;
  /** Ferme les autres overlays avant Staff / Admin. */
  onExclusiveNavigate?: () => void;
  showSalonsButton?: boolean;
}

export default function MobileBottomNav({
  surface = 'home',
  onGoHome,
  onOpenDM,
  onOpenNotifications,
  onOpenSettings,
  onOpenSalons,
  onExclusiveNavigate,
  showSalonsButton = true,
}: MobileBottomNavProps) {
  const { user } = useUser();
  const { unreadCount, staffUnreadCount } = useNotifications();
  const { getUnreadCount } = useDM();
  const { openAdmin, openStaffChat } = useUI();
  const { settings } = useGlobalSettings();
  const dmUnread = user?.name ? getUnreadCount(user.name) : 0;
  const isStaff = hasStaffAccess(user);

  return (
    <nav
      className="sm:hidden shrink-0 border-t border-border bg-card/95 backdrop-blur-md safe-area-pb z-40"
      aria-label="Navigation mobile"
    >
      <div className="flex items-stretch justify-around px-1 pt-1.5 pb-1 gap-0.5">
        <NavBtn
          label="Accueil"
          active={surface === 'home'}
          onClick={onGoHome}
          icon={<Home className="w-5 h-5" />}
        />
        {showSalonsButton && onOpenSalons && (
          <NavBtn
            label="Salons"
            active={surface === 'salons' || surface === 'salon'}
            onClick={onOpenSalons}
            icon={<Menu className="w-5 h-5" />}
          />
        )}
        {settings.enable_dm && (
          <NavBtn
            label="MP"
            active={surface === 'dm'}
            onClick={onOpenDM}
            badge={dmUnread > 0 ? dmUnread : null}
            icon={<MessageSquare className="w-5 h-5" />}
          />
        )}
        {settings.enable_notifications && (
          <NavBtn
            label="Alertes"
            active={surface === 'notifs'}
            onClick={onOpenNotifications}
            badge={unreadCount > 0 ? unreadCount : null}
            icon={<Bell className="w-5 h-5" />}
          />
        )}
        {isStaff && (
          <NavBtn
            label="Staff"
            onClick={() => {
              onExclusiveNavigate?.();
              openStaffChat(
                user,
                staffUnreadCount > 0 ? { tab: 'notifications' } : { tab: 'chat' },
              );
            }}
            badge={staffUnreadCount > 0 ? staffUnreadCount : null}
            icon={<ShieldAlert className="w-5 h-5" />}
            onLongPress={() => {
              onExclusiveNavigate?.();
              openAdmin(user);
            }}
          />
        )}
        <NavBtn
          label="Réglages"
          active={surface === 'settings'}
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
  onLongPress,
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  badge?: number | null;
  active?: boolean;
  onLongPress?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      onContextMenu={(e) => {
        if (!onLongPress) return;
        e.preventDefault();
        onLongPress();
      }}
      aria-current={active ? 'page' : undefined}
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
