import React, { useState, useRef, memo, RefObject } from 'react';
import Avatar from './Avatar';
import SafeMessageContent from './SafeMessageContent';
import { useUser, usePreferences } from '@/lib/contexts';
import { useModeration } from '@/lib/contexts';
import { Smile, Trash2, Flag, UserX, Pin, Plus, Reply } from 'lucide-react';
import { format } from 'date-fns';

interface Message {
  id: string;
  author_name: string;
  author_avatar: string;
  author_initials: string;
  text: string;
  created_date: string;
  reactions?: Record<string, string[]>;
  pinned?: boolean;
  is_system?: boolean;
  is_announcement?: boolean;
  replyTo?: Message;
  image_url?: string;
}

interface MessageBubbleContentProps {
  message: Message;
  onReact: (messageId: string, position: { clientX: number; clientY: number } | null, emoji?: string) => void;
  onDelete: (messageId: string) => void;
  onPin: (messageId: string) => void;
  onViewProfile?: (authorName: string) => void;
  onReply?: (message: Message) => void;
}

const MessageBubbleContent = function MessageBubbleContent({ message, onReact, onDelete, onPin, onViewProfile, onReply }: MessageBubbleContentProps) {
  const { user } = useUser();
  const { compactMode } = usePreferences();
  const { blockUser, reportMessage } = useModeration();
  const isOwn = message.author_name === user?.name;
  const [hovered, setHovered]       = useState(false);
  const [reported, setReported]     = useState(false);
  const [confirmBlock, setConfirmBlock] = useState(false);
  const smileRef = useRef<HTMLButtonElement>(null);
  const plusRef  = useRef<HTMLButtonElement>(null);

  if (message.is_system || message.is_announcement) {
    return (
      <div 
        className={`text-center text-[11px] py-1.5 italic ${message.is_announcement ? 'text-purple-300 font-medium' : 'text-muted-foreground/50'}`}
        role="status"
        aria-live="polite"
        aria-label={message.is_announcement ? 'Annonce système' : 'Message système'}>
        <SafeMessageContent text={(message.is_announcement ? '📢 ' : '') + message.text} isSystem={true} />
      </div>
    );
  }

  const reactions    = message.reactions || {};
  const hasReactions = Object.keys(reactions).length > 0;
  const time         = message.created_date ? format(new Date(message.created_date), 'HH:mm') : '';

  // Ouvre le picker centré sur le bouton cliqué
  const openPicker = (btnRef: RefObject<HTMLButtonElement>) => {
    const rect = btnRef.current?.getBoundingClientRect();
    if (rect) {
      onReact(message.id, { clientX: rect.left + rect.width / 2, clientY: rect.top });
    }
  };

  const handleReport = () => { if (reported) return; reportMessage(message.author_name); setReported(true); };
  const handleBlock  = () => {
    if (!confirmBlock) { setConfirmBlock(true); setTimeout(() => setConfirmBlock(false), 3000); return; }
    blockUser(message.author_name);
    setConfirmBlock(false);
  };

  return (
    <div
      className={`flex ${compactMode ? 'gap-1.5 mb-1.5' : 'gap-2.5 mb-2.5'} items-start ${isOwn ? 'flex-row-reverse' : ''} ${message.pinned ? 'bg-amber-500/5 rounded-xl px-2 -mx-2' : ''}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      role="article"
      aria-labelledby={`message-author-${message.id}`}
      aria-describedby={`message-content-${message.id}`}
    >
      <button 
        className={`${compactMode ? 'mt-0' : 'mt-0.5'} shrink-0`} 
        onClick={() => onViewProfile?.(message.author_name)} 
        aria-label={`Voir le profil de ${message.author_name}`}
        title={`Voir le profil de ${message.author_name}`}>
        <Avatar avatarClass={message.author_avatar} initials={message.author_initials} size={compactMode ? 'sm' : 'md'} />
      </button>

      <div className={`max-w-[70%] flex flex-col ${compactMode ? 'gap-0.5' : 'gap-1'} ${isOwn ? 'items-end' : ''}`}>
        {/* Auteur + heure */}
        <div className={`flex items-center gap-1.5 ${isOwn ? 'flex-row-reverse' : ''}`}>
          <button 
            className={`${compactMode ? 'text-[10px]' : 'text-xs'} font-semibold hover:underline ${isOwn ? 'text-emerald-400' : 'text-purple-300'}`}
            onClick={() => onViewProfile?.(message.author_name)}
            id={`message-author-${message.id}`}
            aria-label={`Message de ${message.author_name}`}>
            {message.author_name}
          </button>
          <span className={`${compactMode ? 'text-[9px]' : 'text-[10px]'} text-muted-foreground/40`} aria-label={`Envoyé à ${time}`}>{time}</span>
          {message.pinned && <Pin className="w-3 h-3 text-amber-400" aria-label="Message épinglé" />}
        </div>

        {/* Bulle + toolbar */}
        <div className="relative">

          {/* Message cité (réponse) */}
          {message.replyTo && (
            <div 
              className={`${compactMode ? 'mb-0.5 px-2 py-1' : 'mb-1 px-2.5 py-1.5'} rounded-lg border-l-2 bg-white/5 ${compactMode ? 'text-[10px]' : 'text-[11px]'} text-muted-foreground/60 truncate`}
              style={{ borderLeftColor: isOwn ? '#34d399' : '#a78bfa' }}
              role="complementary"
              aria-label={`Réponse à ${message.replyTo.author_name}`}>
              <span className="font-semibold" style={{ color: isOwn ? '#34d399' : '#a78bfa' }}>@{message.replyTo.author_name}</span>
              {' '}{message.replyTo.text}
            </div>
          )}

          <div 
            className={`${compactMode ? 'px-2 py-1.5 text-[12px]' : 'px-3 py-2 text-[13px]'} text-foreground leading-relaxed break-words
            ${isOwn
              ? 'bg-purple-700/25 border border-purple-500/30 rounded-xl rounded-br-sm'
              : 'bg-secondary/80 border border-border rounded-xl rounded-bl-sm'
            }`}
            id={`message-content-${message.id}`}>
            <SafeMessageContent text={message.text} imageUrl={message.image_url} isSystem={false} currentUserName={user?.name} />
          </div>

          {/* Toolbar au hover */}
          {hovered && (
            <div 
              className={`absolute -top-8 ${isOwn ? 'left-0' : 'right-0'} bg-card border border-white/10 rounded-xl px-1 py-1 flex items-center gap-0.5 z-10 shadow-lg`}
              role="toolbar"
              aria-label="Actions du message">
              {/* Répondre */}
              <button 
                onClick={() => onReply?.(message)}
                className="p-1.5 rounded-lg text-muted-foreground/60 hover:bg-white/[0.08] hover:text-primary transition-colors"
                aria-label="Répondre à ce message"
                title="Répondre">
                <Reply className="w-3.5 h-3.5" aria-hidden="true" />
              </button>

              {/* Réagir */}
              <button 
                ref={smileRef} 
                onClick={() => openPicker(smileRef)}
                className="p-1.5 rounded-lg text-muted-foreground/60 hover:bg-white/[0.08] hover:text-yellow-400 transition-colors"
                aria-label="Réagir à ce message"
                aria-haspopup="dialog"
                title="Réagir">
                <Smile className="w-3.5 h-3.5" aria-hidden="true" />
              </button>

              {/* Épingler */}
              <button 
                onClick={() => onPin(message.id)}
                className={`p-1.5 rounded-lg transition-colors ${message.pinned ? 'text-amber-400 bg-amber-500/10' : 'text-muted-foreground/60 hover:bg-white/[0.08] hover:text-amber-400'}`}
                aria-label={message.pinned ? 'Désépingler ce message' : 'Épingler ce message'}
                aria-pressed={message.pinned}
                title={message.pinned ? 'Désépingler' : 'Épingler'}>
                <Pin className="w-3.5 h-3.5" aria-hidden="true" />
              </button>

              {/* Supprimer (propres messages) */}
              {isOwn && (
                <button 
                  onClick={() => onDelete(message.id)}
                  className="p-1.5 rounded-lg text-muted-foreground/60 hover:bg-white/[0.08] hover:text-red-400 transition-colors"
                  aria-label="Supprimer ce message"
                  title="Supprimer">
                  <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              )}

              {/* Signaler + Bloquer (messages des autres) */}
              {!isOwn && (
                <>
                  <button 
                    onClick={handleReport}
                    className={`p-1.5 rounded-lg transition-colors ${reported ? 'text-orange-400 bg-orange-500/10' : 'text-muted-foreground/60 hover:bg-white/[0.08] hover:text-orange-400'}`}
                    aria-label={reported ? 'Message signalé' : 'Signaler ce message'}
                    title={reported ? 'Signalé' : 'Signaler'}>
                    <Flag className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                  <button 
                    onClick={handleBlock}
                    className={`p-1.5 rounded-lg transition-colors ${confirmBlock ? 'text-red-400 bg-red-500/20 animate-pulse' : 'text-muted-foreground/60 hover:bg-white/[0.08] hover:text-red-400'}`}
                    aria-label={confirmBlock ? 'Confirmer le blocage' : 'Bloquer cet utilisateur'}
                    title={confirmBlock ? 'Cliquer encore pour confirmer' : 'Bloquer'}>
                    <UserX className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Réactions existantes + bouton + */}
        {(hasReactions || hovered) && (
          <div 
            className={`flex gap-1 flex-wrap mt-0.5 items-center ${isOwn ? 'justify-end' : ''}`}
            role="group"
            aria-label="Réactions">
            {Object.entries(reactions).map(([emoji, users]) => {
              if (!users?.length) return null;
              const isMine = user?.name ? users.includes(user.name) : false;
              return (
                <button 
                  key={emoji}
                  onClick={() => onReact(message.id, null, emoji)}
                  className={`flex items-center gap-1 text-xs rounded-full px-2 py-0.5 border transition-all select-none hover:scale-110
                    ${isMine
                      ? 'bg-purple-700/25 border-purple-500/50 text-purple-200'
                      : 'bg-white/5 border-white/10 text-foreground/70 hover:bg-white/10'
                    }`}
                  aria-label={`${emoji} - ${users.length} réaction${users.length > 1 ? 's' : ''}${isMine ? ', vous avez réagi' : ''}`}
                  aria-pressed={isMine}>
                  <span aria-hidden="true">{emoji}</span>
                  <span className="font-medium">{users.length}</span>
                </button>
              );
            })}

            {/* Bouton + pour ajouter une réaction */}
            {hovered && (
              <button 
                ref={plusRef} 
                onClick={() => openPicker(plusRef)}
                className="flex items-center justify-center w-6 h-6 rounded-full bg-white/5 border border-white/10 text-muted-foreground/50 hover:bg-white/10 hover:text-foreground transition-all hover:scale-110"
                aria-label="Ajouter une réaction"
                aria-haspopup="dialog"
                title="Ajouter une réaction">
                <Plus className="w-3 h-3" aria-hidden="true" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Mémorisation avec comparaison personnalisée
export default memo(MessageBubbleContent, (prevProps, nextProps) => {
  return (
    prevProps.message.id === nextProps.message.id &&
    prevProps.message.text === nextProps.message.text &&
    prevProps.message.author_name === nextProps.message.author_name &&
    JSON.stringify(prevProps.message.reactions) === JSON.stringify(nextProps.message.reactions) &&
    prevProps.message.pinned === nextProps.message.pinned &&
    prevProps.message.created_date === nextProps.message.created_date &&
    prevProps.onReact === nextProps.onReact &&
    prevProps.onDelete === nextProps.onDelete &&
    prevProps.onPin === nextProps.onPin &&
    prevProps.onViewProfile === nextProps.onViewProfile &&
    prevProps.onReply === nextProps.onReply
  );
});
