import React, { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { getDailySpark, isDailySparkDone, markDailySparkDone } from '@/lib/funFeatures';
import { useNotifications } from '@/lib/contexts';

interface DailySparkCardProps {
  /** Compact for settings / sidebar-adjacent panels */
  compact?: boolean;
  className?: string;
}

/** Étincelle du jour — always-reachable daily tip with CTA. */
export default function DailySparkCard({ compact = false, className = '' }: DailySparkCardProps) {
  const { addNotification } = useNotifications();
  const spark = getDailySpark();
  const [sparkDone, setSparkDone] = useState(() => isDailySparkDone(spark.key));

  return (
    <div
      className={`rounded-xl border border-violet-500/25 bg-violet-500/10 text-left ${
        compact ? 'px-3 py-2.5' : 'px-4 py-3'
      } ${className}`}
    >
      <div className="flex items-center gap-2 mb-1">
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
        onClick={() => {
          markDailySparkDone(spark.key);
          setSparkDone(true);
          addNotification({ type: 'system', message: 'Étincelle du jour cochée — belle journée !' });
        }}
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
