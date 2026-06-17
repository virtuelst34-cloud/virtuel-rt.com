import React, { useEffect, useState, useRef } from 'react';
import { Diamond } from 'lucide-react';
import { getBadgeForLevel, getProgressToNextBadge } from '@/lib/diamondBadges';

interface LevelUpToastProps {
  level: number;
  onDone?: () => void;
}

/**
 * LevelUpToast — s'affiche pendant 3s quand l'utilisateur monte de niveau.
 * Usage : <LevelUpToast level={newLevel} onDone={() => setLevelUp(null)} />
 */
export default function LevelUpToast({ level, onDone }: LevelUpToastProps) {
  const [visible, setVisible] = useState(true);
  const badge      = getBadgeForLevel(level);
  const progress   = getProgressToNextBadge(level);
  const onDoneRef  = useRef(onDone);
  const timerRef   = useRef<number | null>(null);
  const fadeRef    = useRef<number | null>(null);

  // Garder onDoneRef à jour sans relancer l'effet
  useEffect(() => { onDoneRef.current = onDone; }, [onDone]);

  useEffect(() => {
    timerRef.current = setTimeout(() => {
      setVisible(false);
      fadeRef.current = setTimeout(() => onDoneRef.current?.(), 400);
    }, 3000);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (fadeRef.current) clearTimeout(fadeRef.current);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div 
      className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-[9999] transition-all duration-400 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
      role="alert"
      aria-live="polite"
      aria-atomic="true">
      <div className="flex items-center gap-3 bg-card border rounded-2xl px-5 py-3 shadow-[0_8px_32px_rgba(0,0,0,0.5)] animate-scale-in"
        style={{ borderColor: badge.color + '60' }}
        aria-label={`Niveau ${level} atteint. ${badge.label} débloqué.`}>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center animate-float" style={{ background: badge.color + '22' }}>
          <Diamond className="w-5 h-5" style={{ color: badge.color, filter: `drop-shadow(0 0 8px ${badge.glow})` }} aria-hidden="true" />
        </div>
        <div>
          <div className="text-xs text-muted-foreground/60 uppercase tracking-widest">Niveau supérieur !</div>
          <div className="text-sm font-bold text-foreground">Niveau {level} atteint 🎉</div>
          <div className="text-[10px] font-medium" style={{ color: badge.color }}>{badge.label} débloqué</div>
          {progress.next && (
            <div className="text-[9px] text-muted-foreground/50 mt-0.5">
              Prochain: {progress.next.label} ({Math.round(progress.progress)}%)
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
