import React, { useEffect, useRef } from 'react';
import { EMOJIS } from '@/lib/chatConfig';

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  onClose: () => void;
}

export default function EmojiPicker({ onSelect, onClose }: EmojiPickerProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  return (
    <div ref={ref} className="absolute bottom-16 left-4 bg-card border border-white/10 rounded-xl p-2.5 z-50 shadow-[0_8px_32px_rgba(0,0,0,0.4)] animate-slide-in-up" onClick={e => e.stopPropagation()}>
      <div className="grid grid-cols-8 gap-1">
        {EMOJIS.map((em, index) => (
          <button 
            key={em} 
            onClick={() => { onSelect(em); onClose(); }} 
            className="text-xl p-1 rounded-md hover:bg-white/[0.08] transition-all duration-200 hover:scale-125 active:scale-95"
            style={{ animationDelay: `${index * 10}ms` }}>
            {em}
          </button>
        ))}
      </div>
    </div>
  );
}
