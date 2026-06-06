import React from 'react';
import { useChat } from '@/lib/ChatContext';
import { X, Bell, CheckCheck, Trash2, Star, Zap, Shield, MessageSquare, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const TYPE_CONFIG = {
  levelup:  { icon: Zap,            color: 'text-amber-400',   bg: 'bg-amber-500/10 border-amber-500/25' },
  premium:  { icon: Star,           color: 'text-yellow-400',  bg: 'bg-yellow-500/10 border-yellow-500/25' },
  dm:       { icon: MessageSquare,  color: 'text-blue-400',    bg: 'bg-blue-500/10 border-blue-500/25' },
  mod:      { icon: Shield,         color: 'text-red-400',     bg: 'bg-red-500/10 border-red-500/25' },
  block:    { icon: AlertTriangle,  color: 'text-orange-400',  bg: 'bg-orange-500/10 border-orange-500/25' },
  report:   { icon: AlertTriangle,  color: 'text-orange-400',  bg: 'bg-orange-500/10 border-orange-500/25' },
  default:  { icon: Bell,           color: 'text-purple-400',  bg: 'bg-purple-500/10 border-purple-500/25' },
};

export default function NotificationsPanel({ onClose }) {
  const { notifications, markAllRead, clearNotifications } = useChat();

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-start justify-end z-[1500] pt-14 pr-4"
      onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl w-[360px] max-h-[520px] flex flex-col overflow-hidden shadow-[0_24px_80px_rgba(0,0,0,0.6)]"
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="px-4 py-3 border-b border-border flex items-center gap-2 shrink-0">
          <Bell className="w-4 h-4 text-purple-400" />
          <span className="text-[13px] font-semibold text-foreground flex-1">Notifications</span>
          <button onClick={markAllRead} title="Tout marquer comme lu"
            className="p-1.5 rounded-lg text-muted-foreground/50 hover:text-foreground hover:bg-white/5 transition-colors">
            <CheckCheck className="w-3.5 h-3.5" />
          </button>
          <button onClick={clearNotifications} title="Tout effacer"
            className="p-1.5 rounded-lg text-muted-foreground/50 hover:text-red-400 hover:bg-red-500/10 transition-colors">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <button onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground/50 hover:text-foreground hover:bg-white/5 transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-muted-foreground/40">
              <Bell className="w-8 h-8" />
              <p className="text-xs">Aucune notification</p>
            </div>
          ) : (
            notifications.map(notif => {
              const cfg = TYPE_CONFIG[notif.type] || TYPE_CONFIG.default;
              const Icon = cfg.icon;
              return (
                <div key={notif.id}
                  className={`flex items-start gap-3 px-4 py-3 border-b border-border/50 transition-colors ${notif.read ? 'opacity-60' : 'bg-white/[0.02]'}`}>
                  <div className={`w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 mt-0.5 ${cfg.bg}`}>
                    <Icon className={`w-3.5 h-3.5 ${cfg.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] text-foreground leading-relaxed">{notif.message}</p>
                    <p className="text-[10px] text-muted-foreground/40 mt-0.5">
                      {notif.timestamp ? format(new Date(notif.timestamp), 'HH:mm · d MMM', { locale: fr }) : ''}
                    </p>
                  </div>
                  {!notif.read && (
                    <span className="w-2 h-2 rounded-full bg-purple-500 shrink-0 mt-1.5" />
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
