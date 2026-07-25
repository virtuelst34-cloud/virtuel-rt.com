import React, { useEffect, useState } from 'react';
import { X, RotateCcw } from 'lucide-react';
import { shuffleMemoryDeck } from '@/lib/funFeatures';

interface Props {
  onClose: () => void;
}

export default function MemoryGame({ onClose }: Props) {
  const [deck, setDeck] = useState(() => shuffleMemoryDeck(6));
  const [flipped, setFlipped] = useState<number[]>([]);
  const [matched, setMatched] = useState<Set<number>>(new Set());
  const [moves, setMoves] = useState(0);
  const [lock, setLock] = useState(false);
  const [won, setWon] = useState(false);

  useEffect(() => {
    if (matched.size === deck.length && deck.length > 0) {
      setWon(true);
    }
  }, [matched, deck.length]);

  const reset = () => {
    setDeck(shuffleMemoryDeck(6));
    setFlipped([]);
    setMatched(new Set());
    setMoves(0);
    setLock(false);
    setWon(false);
  };

  const flip = (index: number) => {
    if (lock || matched.has(index) || flipped.includes(index) || flipped.length >= 2) return;
    const next = [...flipped, index];
    setFlipped(next);
    if (next.length === 2) {
      setMoves(m => m + 1);
      setLock(true);
      const [a, b] = next;
      if (deck[a] === deck[b]) {
        setTimeout(() => {
          setMatched(prev => new Set([...prev, a, b]));
          setFlipped([]);
          setLock(false);
        }, 350);
      } else {
        setTimeout(() => {
          setFlipped([]);
          setLock(false);
        }, 700);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm rounded-2xl border border-violet-500/35 bg-gradient-to-br from-[#1a1028] to-[#120c1c] shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <div>
            <div className="text-sm font-semibold text-foreground">Mémoire cosmique</div>
            <div className="text-[10px] text-muted-foreground/55">{moves} coup{moves === 1 ? '' : 's'}</div>
          </div>
          <div className="flex items-center gap-1">
            <button type="button" onClick={reset} className="p-1.5 rounded-lg text-muted-foreground/60 hover:text-foreground hover:bg-white/5" title="Rejouer">
              <RotateCcw className="w-4 h-4" />
            </button>
            <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-muted-foreground/60 hover:text-foreground hover:bg-white/5">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {won ? (
          <div className="p-8 text-center space-y-3">
            <div className="text-4xl animate-bounce">🌌</div>
            <p className="text-sm font-semibold text-violet-200">Constellation assemblée !</p>
            <p className="text-xs text-muted-foreground/60">En {moves} coups</p>
            <button
              type="button"
              onClick={reset}
              className="mt-2 px-4 py-2 rounded-xl bg-violet-500/20 border border-violet-500/40 text-violet-200 text-xs font-semibold hover:bg-violet-500/30"
            >
              Rejouer
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-2 p-4">
            {deck.map((emoji, i) => {
              const show = flipped.includes(i) || matched.has(i);
              return (
                <button
                  key={`${emoji}-${i}`}
                  type="button"
                  onClick={() => flip(i)}
                  className={`aspect-square rounded-xl border text-xl flex items-center justify-center transition-all duration-300
                    ${show
                      ? 'bg-violet-500/20 border-violet-400/50 scale-100'
                      : 'bg-secondary/80 border-border hover:border-violet-500/40 hover:scale-[1.03]'
                    }
                    ${matched.has(i) ? 'opacity-60' : ''}`}
                >
                  {show ? emoji : '✦'}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
