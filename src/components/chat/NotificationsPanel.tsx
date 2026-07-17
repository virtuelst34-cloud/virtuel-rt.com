import React from 'react';
import { useNotifications, useFriends } from '@/lib/contexts';
import { parseNotificationTarget, formatSupabaseError } from '@/lib/utils/notificationNavigation';
import { X, Bell, CheckCheck, Trash2, Star, Zap, Shield, MessageSquare, AlertTriangle, UserCheck, LucideIcon } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface NotificationAction {
  label: string;
  onClick: () => void | Promise<void>;
  primary?: boolean;
}

interface AppNotification {
  id: number | string;
  type: string;
  message: string;
  timestamp?: string;
  read: boolean;
  actions?: NotificationAction[];
  groupCount?: number;
  groupKey?: string;
  metadata?: Record<string, unknown>;
}

interface NotificationsPanelProps {
  onClose: () => void;
  onOpenDM?: (name: string) => void;
  onOpenSettings?: (tab?: string) => void;
  onViewProfile?: (name: string) => void;
}

const TYPE_CONFIG: Record<string, { icon: LucideIcon; color: string; bg: string }> = {
  levelup:        { icon: Zap,            color: 'text-amber-400',   bg: 'bg-amber-500/10 border-amber-500/25' },
  premium:        { icon: Star,           color: 'text-yellow-400',  bg: 'bg-yellow-500/10 border-yellow-500/25' },
  friend:         { icon: UserCheck,      color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/25' },
  friend_request: { icon: UserCheck,      color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/25' },
  friend_accepted:{ icon: UserCheck,      color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/25' },
  dm:             { icon: MessageSquare,  color: 'text-blue-400',    bg: 'bg-blue-500/10 border-blue-500/25' },
  mention:        { icon: MessageSquare,  color: 'text-sky-400',     bg: 'bg-sky-500/10 border-sky-500/25' },
  achievement:    { icon: Star,           color: 'text-amber-400',   bg: 'bg-amber-500/10 border-amber-500/25' },
  system:         { icon: Bell,           color: 'text-purple-400',  bg: 'bg-purple-500/10 border-purple-500/25' },
  success:        { icon: CheckCheck,     color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/25' },
  error:          { icon: AlertTriangle,  color: 'text-red-400',     bg: 'bg-red-500/10 border-red-500/25' },
  mod:            { icon: Shield,         color: 'text-red-400',     bg: 'bg-red-500/10 border-red-500/25' },
  block:          { icon: AlertTriangle,  color: 'text-orange-400',  bg: 'bg-orange-500/10 border-orange-500/25' },
  report:         { icon: AlertTriangle,  color: 'text-orange-400',  bg: 'bg-orange-500/10 border-orange-500/25' },
  default:        { icon: Bell,           color: 'text-purple-400',  bg: 'bg-purple-500/10 border-purple-500/25' },
};

export default function NotificationsPanel({
  onClose,
  onOpenDM,
  onOpenSettings,
  onViewProfile,
}: NotificationsPanelProps) {
  const { notifications, markAllRead, clearNotifications, removeNotification, markNotificationRead, addNotification } = useNotifications();
  const { acceptRequestFromSender, rejectRequestFromSender, reloadFriends } = useFriends();

  const handleNotificationClick = (notif: AppNotification) => {
    void markNotificationRead?.(notif.id);

    const target = parseNotificationTarget(
      notif.type,
      notif.groupKey,
      notif.message,
      notif.metadata,
    );

    switch (target.kind) {
      case 'dm':
        if (target.userName) {
          onClose();
          onOpenDM?.(target.userName);
        }
        break;
      case 'friend_request':
        onClose();
        onOpenSettings?.('friends');
        break;
      case 'friend_accepted':
      case 'profile':
        if (target.userName) {
          onClose();
          onViewProfile?.(target.userName);
        }
        break;
      case 'mention':
        onClose();
        break;
      case 'settings_friends':
        onClose();
        onOpenSettings?.('friends');
        break;
      default:
        break;
    }
  };

  const resolveActions = (notif: AppNotification): NotificationAction[] => {
    if (notif.actions && notif.actions.length > 0) return notif.actions;

    if (notif.type !== 'friend_request') return [];

    const target = parseNotificationTarget(
      notif.type,
      notif.groupKey,
      notif.message,
      notif.metadata,
    );
    const sender = target.userName;
    if (!sender) return [];

    return [
      {
        label: 'Accepter',
        primary: true,
        onClick: async () => {
          try {
            await acceptRequestFromSender(sender);
            await reloadFriends();
            addNotification({ type: 'success', message: `Vous êtes maintenant ami avec ${sender}` });
          } catch (error) {
            addNotification({
              type: 'error',
              message: error instanceof Error ? error.message : formatSupabaseError(error),
            });
            throw error;
          }
        },
      },
      {
        label: 'Refuser',
        onClick: async () => {
          try {
            await rejectRequestFromSender(sender);
            await reloadFriends();
          } catch (error) {
            addNotification({
              type: 'error',
              message: error instanceof Error ? error.message : formatSupabaseError(error),
            });
            throw error;
          }
        },
      },
    ];
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-start justify-end z-[1500] pt-14 pr-4 animate-in fade-in duration-300"
      onClick={onClose}>
      <div className="bg-card border border-border/50 rounded-3xl w-full max-w-[380px] max-h-[80vh] flex flex-col overflow-hidden shadow-[0_32px_96px_rgba(0,0,0,0.5)] animate-in slide-in-from-right duration-300"
        onClick={e => e.stopPropagation()}>

        <div className="px-4 py-3 border-b border-border flex items-center gap-2 shrink-0">
          <Bell className="w-4 h-4 text-purple-400 animate-pulse" />
          <span className="text-[13px] font-semibold text-foreground flex-1">Notifications</span>
          <button onClick={markAllRead} title="Tout marquer comme lu"
            className="p-1.5 rounded-lg text-muted-foreground/50 hover:text-foreground hover:bg-white/5 transition-all duration-200 hover:scale-110 active:scale-95">
            <CheckCheck className="w-3.5 h-3.5" />
          </button>
          <button onClick={clearNotifications} title="Tout effacer"
            className="p-1.5 rounded-lg text-muted-foreground/50 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200 hover:scale-110 active:scale-95">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <button onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground/50 hover:text-foreground hover:bg-white/5 transition-all duration-200 hover:scale-110 active:scale-95">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-muted-foreground/40">
              <Bell className="w-8 h-8 animate-float" />
              <p className="text-xs">Aucune notification</p>
            </div>
          ) : (
            (notifications as AppNotification[]).map((notif, index) => {
              const cfg = TYPE_CONFIG[notif.type] || TYPE_CONFIG.default;
              const Icon = cfg.icon;
              const actions = resolveActions(notif);
              const hasActions = actions.length > 0;
              const groupCount = notif.groupCount;
              const isClickable = notif.type === 'dm' || notif.type === 'friend_request' || notif.type === 'friend_accepted' || notif.type === 'mention';

              return (
                <div key={notif.id}
                  role={isClickable ? 'button' : undefined}
                  tabIndex={isClickable ? 0 : undefined}
                  onClick={() => isClickable && handleNotificationClick(notif)}
                  onKeyDown={e => {
                    if (isClickable && (e.key === 'Enter' || e.key === ' ')) {
                      e.preventDefault();
                      handleNotificationClick(notif);
                    }
                  }}
                  className={`flex items-start gap-3 px-4 py-3 border-b border-border/50 transition-all duration-200 hover:bg-white/[0.04] ${notif.read ? 'opacity-60' : 'bg-white/[0.02]'} ${isClickable ? 'cursor-pointer' : ''} animate-slide-in-right`}
                  style={{ animationDelay: `${index * 30}ms` }}>
                  <div className={`w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 mt-0.5 ${cfg.bg} transition-transform duration-200 hover:scale-110 relative`}>
                    <Icon className={`w-3.5 h-3.5 ${cfg.color}`} />
                    {groupCount && groupCount > 1 && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 bg-purple-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                        {groupCount}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] text-foreground leading-relaxed">{notif.message}</p>
                    <p className="text-[10px] text-muted-foreground/40 mt-0.5">
                      {notif.timestamp ? format(new Date(notif.timestamp), 'HH:mm · d MMM', { locale: fr }) : ''}
                    </p>
                    {hasActions && (
                      <div className="flex gap-2 mt-2" onClick={e => e.stopPropagation()}>
                        {actions.map((action, i) => (
                          <button
                            key={i}
                            onClick={() => {
                              void (async () => {
                                try {
                                  await action.onClick();
                                  removeNotification(notif.id as number | string);
                                } catch {
                                  // Erreur déjà affichée via addNotification
                                }
                              })();
                            }}
                            className={`text-[10px] px-2 py-1 rounded-md transition-all duration-200 hover:scale-105 active:scale-95 ${
                              action.primary
                                ? 'bg-primary text-white hover:bg-primary/80'
                                : 'bg-secondary text-foreground hover:bg-white/10'
                            }`}
                          >
                            {action.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {!notif.read && (
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        removeNotification(notif.id as number | string);
                      }}
                      className="p-1 rounded-lg text-muted-foreground/50 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200 shrink-0 mt-0.5"
                      title="Supprimer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
