import React, { useState } from 'react';
import { X, Reply, AtSign, Check, X as XIcon } from 'lucide-react';

export interface ToastAction {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  variant?: 'default' | 'primary' | 'danger';
}

export interface EnrichedToastProps {
  title: string;
  message?: string;
  icon?: React.ReactNode;
  actions?: ToastAction[];
  onClose?: () => void;
  autoClose?: boolean;
  duration?: number;
}

export function EnrichedToast({
  title,
  message,
  icon,
  actions = [],
  onClose,
  autoClose = true,
  duration = 5000
}: EnrichedToastProps) {
  const [isVisible, setIsVisible] = useState(true);

  React.useEffect(() => {
    if (autoClose) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        onClose?.();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [autoClose, duration, onClose]);

  const handleClose = () => {
    setIsVisible(false);
    onClose?.();
  };

  if (!isVisible) return null;

  return (
    <div className="bg-card border border-border rounded-xl shadow-lg p-4 max-w-md w-full animate-slide-in-right">
      <div className="flex items-start gap-3">
        {icon && <div className="text-2xl shrink-0">{icon}</div>}
        
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-foreground text-sm">{title}</h4>
          {message && <p className="text-xs text-muted-foreground mt-1">{message}</p>}
          
          {actions.length > 0 && (
            <div className="flex gap-2 mt-3 flex-wrap">
              {actions.map((action, index) => (
                <button
                  key={index}
                  onClick={() => {
                    action.onClick();
                    handleClose();
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    action.variant === 'primary'
                      ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                      : action.variant === 'danger'
                      ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                      : 'bg-secondary text-secondary-foreground hover:bg-secondary/90'
                  }`}
                >
                  {action.icon}
                  {action.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={handleClose}
          className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
          aria-label="Fermer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// Presets de notifications courantes
export function NewMessageToast({
  author,
  message,
  onReply,
  onMention,
  onClose
}: {
  author: string;
  message: string;
  onReply?: () => void;
  onMention?: () => void;
  onClose?: () => void;
}) {
  const actions: ToastAction[] = [];
  
  if (onReply) {
    actions.push({
      label: 'Répondre',
      icon: <Reply className="w-3 h-3" />,
      onClick: onReply,
      variant: 'primary'
    });
  }
  
  if (onMention) {
    actions.push({
      label: 'Mentionner',
      icon: <AtSign className="w-3 h-3" />,
      onClick: onMention
    });
  }

  return (
    <EnrichedToast
      title={`Nouveau message de ${author}`}
      message={message}
      icon="💬"
      actions={actions}
      onClose={onClose}
    />
  );
}

export function AchievementToast({
  title,
  description,
  onClose
}: {
  title: string;
  description: string;
  onClose?: () => void;
}) {
  return (
    <EnrichedToast
      title={title}
      message={description}
      icon="🏆"
      onClose={onClose}
      duration={8000}
    />
  );
}

export function LevelUpToast({
  newLevel,
  onClose
}: {
  newLevel: number;
  onClose?: () => void;
}) {
  return (
    <EnrichedToast
      title="Niveau supérieur !"
      message={`Vous avez atteint le niveau ${newLevel}`}
      icon="⬆️"
      onClose={onClose}
      duration={6000}
    />
  );
}

export function ModerationToast({
  action,
  target,
  reason,
  onAppeal,
  onClose
}: {
  action: 'ban' | 'mute' | 'warn';
  target: string;
  reason?: string;
  onAppeal?: () => void;
  onClose?: () => void;
}) {
  const actionLabels = {
    ban: 'Banni',
    mute: 'Muté',
    warn: 'Averti'
  };

  const actions: ToastAction[] = [];
  if (onAppeal) {
    actions.push({
      label: 'Faire appel',
      icon: <Check className="w-3 h-3" />,
      onClick: onAppeal
    });
  }

  return (
    <EnrichedToast
      title={`Action de modération: ${actionLabels[action]}`}
      message={`${target}${reason ? ` - ${reason}` : ''}`}
      icon="⚠️"
      actions={actions}
      onClose={onClose}
      duration={10000}
    />
  );
}
