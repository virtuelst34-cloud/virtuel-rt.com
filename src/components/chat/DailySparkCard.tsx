import React, { useEffect, useState } from 'react';
import { Sparkles, X } from 'lucide-react';
import {
  dismissDailySpark,
  getDailySpark,
  isDailySparkDismissed,
  isDailySparkDone,
  markDailySparkDone,
  msUntilNextLocalMidnight,
} from '@/lib/funFeatures';
import { useNotifications } from '@/lib/contexts';

interface DailySparkCardProps {
  /** Compact for settings / sidebar-adjacent panels */
  compact?: boolean;
  className?: string;
}

/** Étincelle du jour — tip qui change à minuit local, dismissable pour la journée. */
export default function DailySparkCard({ compact = false, className = '' }: DailySparkCardProps) {
  const { addNotification } = useNotifications();
  const [spark, setSpark] = useState(() => getDailySpark());
  const [sparkDone, setSparkDone] = useState(() => isDailySparkDone(spark.key));
  const [dismissed, setDismissed] = useState(() => isDailySparkDismissed(spark.key));

  const refreshSpark = () => {
    const next = getDailySpark();
    setSpark(next);
    setSparkDone(isDailySparkDone(next.key));
    setDismissed(isDailySparkDismissed(next.key));
  };

  useEffect(() => {
    refreshSpark();

    const onFocusOrVisible = () => {
      if (document.visibilityState === 'hidden') return;
      refreshSpark();
    };

    window.addEventListener('focus', onFocusOrVisible);
    document.addEventListener('visibilitychange', onFocusOrVisible);

    let midnightTimer: ReturnType<typeof setTimeout>;
    const scheduleMidnight = () => {
      midnightTimer = setTimeout(() => {
        refreshSpark();
        scheduleMidnight();
      }, msUntilNextLocalMidnight());
    };
    scheduleMidnight();

    return () => {
      window.removeEventListener('focus', onFocusOrVisible);
      document.removeEventListener('visibilitychange', onFocusOrVisible);
      clearTimeout(midnightTimer);
    };
  }, []);

  if (dismissed) return null;

  const handleDismiss = () => {
    dismissDailySpark(spark.key);
    setDismissed(true);
  };

  const handleDone = () => {
    markDailySparkDone(spark.key);
    dismissDailySpark(spark.key);
    setSparkDone(true);
    setDismissed(true);
    addNotification({ type: 'system', message: 'Étincelle du jour cochée — belle journée !' });
  };

  return (
    <div
      className={`relative rounded-xl border border-violet-500/25 bg-violet-500/10 text-left ${
        compact ? 'px-3 py-2.5' : 'px-4 py-3'
      } ${className}`}
    >
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Fermer l’étincelle du jour"
        title="Fermer pour aujourd’hui"
        className="absolute top-1.5 right-1.5 p-1 rounded-md text-muted-foreground/50 hover:text-foreground hover:bg-white/10 transition-colors touch-target"
      >
        <X className="w-3.5 h-3.5" />
      </button>
      <div className="flex items-center gap-2 mb-1 pr-6">
        <Sparkles className={`${compact ? 'w-3 h-3' : 'w-3.5 h-3.5'} text-violet-300 shrink-0`} />
        <span className="text-[11px] font-semibold uppercase tracking-wider text-violet-300">
          Étincelle du jour
        </span>
      </div>
      <p className={`${compact ? 'text-[11px]' : 'text-xs'} text-muted-foreground/80 leading-relaxed`}>
        <span className="text-foreground/80 font-medium">{spark.title}</span>
        {' — '}
        {spark.text}
      </p>
      <p className="text-[10px] text-muted-foreground/45 mt-1">
        Petit défi quotidien pour animer le salon. Visible aussi sur l’accueil (icône Maison).
      </p>
      <button
        type="button"
        onClick={handleDone}
        disabled={sparkDone}
        className={`mt-2 text-[11px] px-3 py-1.5 rounded-lg border transition-all ${
          sparkDone
            ? 'border-emerald-500/30 bg-emerald-500/15 text-emerald-400 cursor-default'
            : 'border-violet-500/30 bg-violet-500/15 text-violet-200 hover:bg-violet-500/25'
        }`}
      >
        {sparkDone ? "Fait aujourd'hui ✓" : 'Je le fais'}
      </button>
    </div>
  );
}
