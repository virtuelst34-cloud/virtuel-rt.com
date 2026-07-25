import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, RotateCcw } from 'lucide-react';

interface Props {
  onClose: () => void;
}

type Phase = 'idle' | 'wait' | 'go' | 'early' | 'result';

export default function ReflexGame({ onClose }: Props) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [ms, setMs] = useState<number | null>(null);
  const [best, setBest] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startRef = useRef(0);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const clearWait = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const start = () => {
    clearWait();
    setMs(null);
    setPhase('wait');
    const delay = 1200 + Math.random() * 2800;
    timerRef.current = setTimeout(() => {
      startRef.current = performance.now();
      setPhase('go');
    }, delay);
  };

  const reset = () => {
    clearWait();
    setPhase('idle');
    setMs(null);
  };

  const tap = () => {
    if (phase === 'wait') {
      clearWait();
      setPhase('early');
      return;
    }
    if (phase === 'go') {
      const elapsed = Math.round(performance.now() - startRef.current);
      setMs(elapsed);
      setBest(b => (b == null || elapsed < b ? elapsed : b));
      setPhase('result');
    }
  };

  const label =
    phase === 'idle' ? 'Appuyez pour démarrer'
      : phase === 'wait' ? 'Attendez le vert…'
        : phase === 'go' ? 'TAP !'
          : phase === 'early' ? 'Trop tôt !'
            : `${ms} ms`;

  const zoneClass =
    phase === 'go' ? 'bg-emerald-500/25 border-emerald-400/50 text-emerald-200'
      : phase === 'wait' ? 'bg-rose-500/15 border-rose-400/35 text-rose-200'
        : phase === 'early' ? 'bg-amber-500/15 border-amber-400/40 text-amber-200'
          : phase === 'result' ? 'bg-sky-500/15 border-sky-400/40 text-sky-200'
            : 'bg-secondary/80 border-border text-muted-foreground/70';

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm rounded-2xl border border-amber-500/35 bg-gradient-to-br from-[#1a1610] to-[#12100c] shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <div>
            <div className="text-sm font-semibold text-foreground">Réflexe</div>
            <div className="text-[10px] text-muted-foreground/55">
              {best != null ? `Record : ${best} ms` : 'Tapotez dès que c’est vert'}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button type="button" onClick={reset} className="p-1.5 rounded-lg text-muted-foreground/60 hover:text-foreground hover:bg-white/5" title="Reset">
              <RotateCcw className="w-4 h-4" />
            </button>
            <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-muted-foreground/60 hover:text-foreground hover:bg-white/5">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-4 space-y-3">
          <button
            type="button"
            onClick={() => {
              if (phase === 'idle' || phase === 'early' || phase === 'result') start();
              else tap();
            }}
            className={`w-full aspect-[4/3] rounded-2xl border-2 flex flex-col items-center justify-center gap-2
              transition-all duration-150 active:scale-[0.98] select-none touch-manipulation ${zoneClass}`}
          >
            <span className="text-2xl font-bold tracking-wide">{label}</span>
            {phase === 'result' && ms != null && (
              <span className="text-[11px] opacity-70">
                {ms < 200 ? 'Éclair !' : ms < 300 ? 'Rapide' : ms < 450 ? 'Pas mal' : 'On peut mieux faire'}
              </span>
            )}
            {(phase === 'idle' || phase === 'early' || phase === 'result') && (
              <span className="text-[10px] opacity-50 mt-1">Toucher pour {phase === 'idle' ? 'lancer' : 'rejouer'}</span>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
