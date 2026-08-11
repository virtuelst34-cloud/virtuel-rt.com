import React, { useEffect, useRef } from 'react';
import { QUICK_REACTIONS, EMOJIS, COQUIN_QUICK_REACTIONS } from '@/lib/chatConfig';
import { getCustomEmojis } from '@/lib/customEmojis';
import { usePreferences } from '@/lib/contexts';

interface Position {
  x?: number;
  y?: number;
}

interface ReactionPickerProps {
  position: Position | null;
  onSelect: (emoji: string) => void;
  onClose: () => void;
  salonId?: string;
}

export default function ReactionPicker({ position, onSelect, onClose, salonId }: ReactionPickerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const { coquinMode } = usePreferences();
  const customEmojis = salonId ? getCustomEmojis(salonId) : EMOJIS;
  const quick = coquinMode
    ? [...COQUIN_QUICK_REACTIONS, ...QUICK_REACTIONS.filter(e => !COQUIN_QUICK_REACTIONS.includes(e as typeof COQUIN_QUICK_REACTIONS[number]))]
    : QUICK_REACTIONS;
  const grid = coquinMode
    ? Array.from(new Set([...COQUIN_QUICK_REACTIONS, ...customEmojis]))
    : customEmojis;

  useEffect(() => {
    if (!position) return;
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [position, onClose]);

  if (!position) return null;

  const W = 280;
  const H = 260;
  const px = position.x ?? window.innerWidth / 2;
  const py = position.y ?? window.innerHeight / 2;
  let left = px - W / 2;
  let top  = py - H - 8;
  if (left < 8) left = 8;
  if (left + W > window.innerWidth - 8) left = window.innerWidth - W - 8;
  if (top < 8) top = py + 32;

  return (
    <div
      ref={ref}
      className="fixed z-[500] bg-card border border-white/10 rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.6)] overflow-hidden animate-scale-in"
      style={{ top, left, width: W }}
      onClick={e => e.stopPropagation()}
    >
      {coquinMode && (
        <div className="px-3 py-1.5 text-[9px] uppercase tracking-widest text-rose-300/80 bg-rose-500/10 border-b border-rose-500/20 flex items-center gap-1.5">
          <span>🔥</span> Réactions coquines
          <span className="ml-auto text-[8px] px-1.5 py-px rounded-full bg-rose-500/20 border border-rose-400/30">NSFW soft</span>
        </div>
      )}
      <div className="flex items-center gap-1 px-3 py-2.5 border-b border-white/[0.06] flex-wrap">
        {quick.map((em, index) => (
          <button key={em} onClick={() => { onSelect(em); onClose(); }}
            className="text-xl w-9 h-9 flex items-center justify-center rounded-xl hover:bg-white/[0.08] hover:scale-125 transition-all duration-200 active:scale-95"
            style={{ animationDelay: `${index * 30}ms` }}>
            {em}
          </button>
        ))}
      </div>

      <div className="p-2 max-h-[180px] overflow-y-auto">
        <div className="grid grid-cols-8 gap-0.5">
          {grid.map((em, index) => (
            <button key={em} onClick={() => { onSelect(em); onClose(); }}
              className="text-lg w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/[0.08] hover:scale-110 transition-all duration-200 active:scale-95"
              style={{ animationDelay: `${index * 5}ms` }}>
              {em}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
