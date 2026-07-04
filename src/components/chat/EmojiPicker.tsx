import React, { useEffect, useRef, useState } from 'react';
import { EMOJIS } from '@/lib/chatConfig';
import { useCustomEmojis } from '@/lib/contexts';

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  onClose: () => void;
}

export default function EmojiPicker({ onSelect, onClose }: EmojiPickerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const { customEmojis } = useCustomEmojis();
  const [activeTab, setActiveTab] = useState<'standard' | 'custom'>('standard');

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  return (
    <div ref={ref} className="absolute bottom-16 left-4 bg-card border border-white/10 rounded-xl p-2.5 z-50 shadow-[0_8px_32px_rgba(0,0,0,0.4)] animate-slide-in-up w-64" onClick={e => e.stopPropagation()}>
      {/* Tabs */}
      <div className="flex gap-1 mb-2">
        <button
          onClick={() => setActiveTab('standard')}
          className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-medium transition-all ${
            activeTab === 'standard' ? 'bg-primary text-white' : 'bg-secondary text-muted-foreground hover:bg-white/5'
          }`}
        >
          Standard
        </button>
        <button
          onClick={() => setActiveTab('custom')}
          className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-medium transition-all ${
            activeTab === 'custom' ? 'bg-primary text-white' : 'bg-secondary text-muted-foreground hover:bg-white/5'
          }`}
        >
          Custom ({customEmojis.length})
        </button>
      </div>

      {/* Standard Emojis */}
      {activeTab === 'standard' && (
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
      )}

      {/* Custom Emojis */}
      {activeTab === 'custom' && (
        <div className="grid grid-cols-4 gap-2 max-h-40 overflow-y-auto">
          {customEmojis.length === 0 ? (
            <div className="col-span-4 text-center py-4 text-xs text-muted-foreground">
              Aucun emoji custom
            </div>
          ) : (
            customEmojis.map((emoji, index) => (
              <button
                key={emoji.id}
                onClick={() => { onSelect(`:${emoji.name}:`); onClose(); }}
                className="aspect-square rounded-lg overflow-hidden hover:bg-white/[0.08] transition-all duration-200 hover:scale-110 active:scale-95 flex items-center justify-center"
                title={emoji.name}
              >
                <img src={emoji.url} alt={emoji.name} className="w-8 h-8 object-cover" />
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
