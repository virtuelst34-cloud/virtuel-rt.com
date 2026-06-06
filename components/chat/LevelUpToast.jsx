import React, { useEffect, useState, useRef } from 'react';
import { Diamond } from 'lucide-react';
import { getBadgeForLevel } from '@/lib/diamondBadges';

/**
 * LevelUpToast — s'affiche pendant 3s quand l'utilisateur monte de niveau.
 * Usage : <LevelUpToast level={newLevel} onDone={() => setLevelUp(null)} />
 */
export default function LevelUpToast({ level, onDone }) {
  const [visible, setVisible] = useState(true);
  const badge      = getBadgeForLevel(level);
  const onDoneRef  = useRef(onDone);
  const timerRef   = useRef(null);
  const fadeRef    = useRef(null);

  // Garder onDoneRef à jour sans relancer l'effet
  useEffect(() => { onDoneRef.current = onDone; }, [onDone]);

  useEffect(() => {
    timerRef.current = setTimeout(() => {
      setVisible(false);
      fadeRef.current = setTimeout(() => onDoneRef.current?.(), 400);
    }, 3000);
    return () => {
      clearTimeout(timerRef.current);
      clearTimeout(fadeRef.current);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-[9999] transition-all duration-400 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
      <div className="flex items-center gap-3 bg-card border rounded-2xl px-5 py-3 shadow-[0_8px_32px_rgba(0,0,0,0.5)]"
        style={{ borderColor: badge.color + '60' }}>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: badge.color + '22' }}>
          <Diamond className="w-5 h-5" style={{ color: badge.color, filter: `drop-shadow(0 0 8px ${badge.glow})` }} />
        </div>
        <div>
          <div className="text-xs text-muted-foreground/60 uppercase tracking-widest">Niveau supérieur !</div>
          <div className="text-sm font-bold text-foreground">Niveau {level} atteint 🎉</div>
          <div className="text-[10px] font-medium" style={{ color: badge.color }}>{badge.label} débloqué</div>
        </div>
      </div>
    </div>
  );
}
