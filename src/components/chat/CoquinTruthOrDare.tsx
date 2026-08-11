import React, { useState } from 'react';
import { X, RotateCcw, Sparkles } from 'lucide-react';
import { drawTruthOrDare } from '@/lib/coquinFeatures';

interface Props {
  onClose: () => void;
  onShare?: (text: string) => void;
}

export default function CoquinTruthOrDare({ onClose, onShare }: Props) {
  const [card, setCard] = useState(() => drawTruthOrDare('random'));

  const draw = (mode: 'truth' | 'dare' | 'random') => {
    setCard(drawTruthOrDare(mode));
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm rounded-2xl border border-rose-500/40 bg-gradient-to-br from-[#2a1020] to-[#1a0c18] shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <div>
            <div className="text-sm font-semibold text-rose-100 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-rose-300" /> Action ou vérité coquin
            </div>
            <div className="text-[10px] text-rose-200/50">18+ · consentement obligatoire</div>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-muted-foreground/60 hover:text-foreground hover:bg-white/5">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
            card.kind === 'truth'
              ? 'bg-violet-500/20 text-violet-200 border border-violet-400/30'
              : 'bg-rose-500/20 text-rose-200 border border-rose-400/30'
          }`}>
            {card.kind === 'truth' ? 'Vérité' : 'Action'}
          </div>
          <p className="text-sm text-foreground leading-relaxed min-h-[4.5rem]">{card.text}</p>

          <div className="flex gap-2">
            <button type="button" onClick={() => draw('truth')} className="flex-1 py-2 rounded-xl text-[11px] font-semibold bg-violet-500/15 border border-violet-400/30 text-violet-200 hover:bg-violet-500/25">
              Vérité
            </button>
            <button type="button" onClick={() => draw('dare')} className="flex-1 py-2 rounded-xl text-[11px] font-semibold bg-rose-500/15 border border-rose-400/30 text-rose-200 hover:bg-rose-500/25">
              Action
            </button>
            <button type="button" onClick={() => draw('random')} className="p-2 rounded-xl border border-white/10 text-muted-foreground hover:text-foreground" title="Aléatoire">
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          {onShare && (
            <button
              type="button"
              onClick={() => {
                onShare(`🔥 ${card.kind === 'truth' ? 'Vérité' : 'Action'} coquine : ${card.text}`);
                onClose();
              }}
              className="w-full py-2.5 rounded-xl text-xs font-semibold bg-rose-500/20 border border-rose-400/40 text-rose-100 hover:bg-rose-500/30"
            >
              Partager dans le salon
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
