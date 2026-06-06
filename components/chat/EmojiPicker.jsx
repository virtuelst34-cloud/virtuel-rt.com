import React, { useEffect, useRef } from 'react';
import { EMOJIS } from '@/lib/chatConfig';

export default function EmojiPicker({ onSelect, onClose }) {
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  return (
    <div ref={ref} className="absolute bottom-16 left-4 bg-card border border-white/10 rounded-xl p-2.5 z-50 shadow-[0_8px_32px_rgba(0,0,0,0.4)]" onClick={e => e.stopPropagation()}>
      <div className="grid grid-cols-8 gap-1">
        {EMOJIS.map(em => (
          <button key={em} onClick={() => { onSelect(em); onClose(); }} className="text-xl p-1 rounded-md hover:bg-white/[0.08] transition-colors">{em}</button>
        ))}
      </div>
    </div>
  );
}
