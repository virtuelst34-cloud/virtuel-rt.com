import React, { useState } from 'react';
import { X, RotateCcw, Flame } from 'lucide-react';
import { drawHotSeatCard } from '@/lib/coquinFeatures';

interface Props {
  onClose: () => void;
  onShare?: (text: string) => void;
}

export default function CoquinHotSeat({ onClose, onShare }: Props) {
  const [card, setCard] = useState(() => drawHotSeatCard());

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm rounded-2xl border border-fuchsia-500/35 bg-gradient-to-br from-[#241028] to-[#160c1c] shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <div>
            <div className="text-sm font-semibold text-fuchsia-100 flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-fuchsia-300" /> Défi coquin
            </div>
            <div className="text-[10px] text-fuchsia-200/50">Hot seat · cartes flirty 18+</div>
          </div>
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => setCard(drawHotSeatCard())} className="p-1.5 rounded-lg text-muted-foreground/60 hover:text-foreground hover:bg-white/5" title="Nouvelle carte">
              <RotateCcw className="w-4 h-4" />
            </button>
            <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-muted-foreground/60 hover:text-foreground hover:bg-white/5">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-4 text-center">
          <div className="text-3xl animate-pulse">💋</div>
          <div className="text-[11px] uppercase tracking-widest text-fuchsia-300/80 font-semibold">{card.prompt}</div>
          <p className="text-sm text-foreground leading-relaxed">{card.text}</p>
          {onShare && (
            <button
              type="button"
              onClick={() => {
                onShare(`😏 Défi coquin — ${card.prompt} : ${card.text}`);
                onClose();
              }}
              className="w-full py-2.5 rounded-xl text-xs font-semibold bg-fuchsia-500/20 border border-fuchsia-400/40 text-fuchsia-100 hover:bg-fuchsia-500/30"
            >
              Lancer le défi dans le chat
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
