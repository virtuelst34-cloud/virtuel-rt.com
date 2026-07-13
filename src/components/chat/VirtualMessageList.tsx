import React, { useRef, useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import MessageBubble from './MessageBubble';

interface VirtualMessageListProps {
  messages: any[];
  onReact: (msgId: string, event: { clientX: number; clientY: number } | null, emoji?: string) => void;
  onDelete: (msgId: string) => void;
  onPin: (msgId: string) => void;
  onEdit?: (msgId: string, newText: string) => void;
  onViewProfile?: (authorName: string) => void;
  onReply?: (message: any) => void;
  searchQuery?: string;
}

export default function VirtualMessageList({
  messages,
  onReact,
  onDelete,
  onPin,
  onEdit,
  onViewProfile,
  onReply,
  searchQuery
}: VirtualMessageListProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 80, // Hauteur estimée par message
    overscan: 5, // Rendir 5 messages supplémentaires avant/après
  });

  const virtualItems = virtualizer.getVirtualItems();

  return (
    <div ref={parentRef} className="flex-1 overflow-y-auto px-4 py-4">
      {!searchQuery && messages.length > 0 && (
        <div className="text-center text-[10px] text-muted-foreground/40 py-2 flex items-center gap-2">
          <div className="flex-1 h-px bg-border" /><span>Aujourd'hui</span><div className="flex-1 h-px bg-border" />
        </div>
      )}
      
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualItems.map((virtualItem) => {
          const message = messages[virtualItem.index];
          return (
            <div
              key={message.id}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              <MessageBubble
                message={message}
                onReact={onReact}
                onDelete={onDelete}
                onPin={onPin}
                onEdit={onEdit}
                onViewProfile={onViewProfile}
                onReply={onReply}
              />
            </div>
          );
        })}
      </div>

      {searchQuery && messages.filter(m => !m.is_system).length === 0 && (
        <div className="flex flex-col items-center gap-2 py-16 text-muted-foreground/40">
          <p className="text-xs">Aucun message trouvé pour « {searchQuery} »</p>
        </div>
      )}
    </div>
  );
}
