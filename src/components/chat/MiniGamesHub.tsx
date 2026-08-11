import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Gamepad2, Brain, Grid3X3, Zap } from 'lucide-react';
import MemoryGame from './MemoryGame';
import TicTacToeGame from './TicTacToeGame';
import ReflexGame from './ReflexGame';

interface Props {
  onClose: () => void;
}

type GameId = 'memory' | 'morpion' | 'reflex';

const GAMES: { id: GameId; title: string; blurb: string; icon: typeof Brain; accent: string }[] = [
  {
    id: 'memory',
    title: 'Mémoire cosmique',
    blurb: 'Retrouvez les paires d’étoiles',
    icon: Brain,
    accent: 'text-violet-400',
  },
  {
    id: 'morpion',
    title: 'Morpion',
    blurb: '✕ contre CPU ou à deux',
    icon: Grid3X3,
    accent: 'text-cyan-400',
  },
  {
    id: 'reflex',
    title: 'Réflexe',
    blurb: 'Tapotez au signal vert',
    icon: Zap,
    accent: 'text-amber-400',
  },
];

export default function MiniGamesHub({ onClose }: Props) {
  const [active, setActive] = useState<GameId | null>(null);

  return createPortal(
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <div className="w-full max-w-sm rounded-2xl border border-purple-500/35 bg-gradient-to-br from-[#1a1028] to-[#120c1c] shadow-2xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <Gamepad2 className="w-4 h-4 text-purple-300" />
              <div>
                <div className="text-sm font-semibold text-foreground">Mini-jeux</div>
                <div className="text-[10px] text-muted-foreground/55">Pause ludique sur Virtuel-RT</div>
              </div>
            </div>
            <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-muted-foreground/60 hover:text-foreground hover:bg-white/5">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-2 space-y-1">
            {GAMES.map(g => {
              const Icon = g.icon;
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setActive(g.id)}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left hover:bg-white/[0.05] transition-colors"
                >
                  <span className={`w-9 h-9 rounded-xl bg-secondary/80 border border-border flex items-center justify-center ${g.accent}`}>
                    <Icon className="w-4 h-4" />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-xs font-semibold text-foreground">{g.title}</span>
                    <span className="block text-[10px] text-muted-foreground/55 truncate">{g.blurb}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {active === 'memory' && <MemoryGame onClose={() => setActive(null)} />}
      {active === 'morpion' && <TicTacToeGame onClose={() => setActive(null)} />}
      {active === 'reflex' && <ReflexGame onClose={() => setActive(null)} />}
    </>,
    document.body,
  );
}
