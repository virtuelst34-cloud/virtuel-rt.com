import React, { useEffect, useState } from 'react';
import { ChevronDown, Sparkles, X } from 'lucide-react';
import {
  dismissDailySpark,
  getDailySpark,
  isDailySparkDismissed,
  isDailySparkDone,
  markDailySparkDone,
  msUntilNextLocalMidnight,
} from '@/lib/funFeatures';
import { getCoquinDailySpark } from '@/lib/coquinFeatures';
import { useNotifications, usePreferences } from '@/lib/contexts';

interface DailySparkCardProps {
  /** Compact for settings / sidebar-adjacent panels */
  compact?: boolean;
  className?: string;
}

/** Étincelle du jour — tip qui change à minuit local, dismissable pour la journée. */
export default function DailySparkCard({ compact = false, className = '' }: DailySparkCardProps) {
  const { addNotification } = useNotifications();
  const { coquinMode } = usePreferences();
  const [spark, setSpark] = useState(() => (coquinMode ? getCoquinDailySpark() : getDailySpark()));
  const [sparkDone, setSparkDone] = useState(() => isDailySparkDone(spark.key));
  const [dismissed, setDismissed] = useState(() => isDailySparkDismissed(spark.key));
  /** Mobile: collapsed chip by default; desktop always shows expanded body via CSS. */
  const [expanded, setExpanded] = useState(false);

  const refreshSpark = () => {
    const next = coquinMode ? getCoquinDailySpark() : getDailySpark();
    setSpark(next);
    setSparkDone(isDailySparkDone(next.key));
    setDismissed(isDailySparkDismissed(next.key));
  };

  useEffect(() => {
    refreshSpark();
  }, [coquinMode]);

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

  const accentBorder = coquinMode ? 'border-rose-500/30 bg-rose-500/10' : 'border-violet-500/25 bg-violet-500/10';
  const accentIcon = coquinMode ? 'text-rose-300' : 'text-violet-300';
  const accentLabel = coquinMode ? 'text-rose-300' : 'text-violet-300';
  const ctaIdle = coquinMode
    ? 'border-rose-500/35 bg-rose-500/15 text-rose-100 hover:bg-rose-500/25 animate-soft-pulse-rose'
    : 'border-violet-500/35 bg-violet-500/15 text-violet-100 hover:bg-violet-500/25 animate-soft-pulse-violet';
  const ctaDone = 'border-emerald-500/30 bg-emerald-500/15 text-emerald-400 cursor-default';

  const doneButton = (
    <button
      type="button"
      onClick={handleDone}
      disabled={sparkDone}
      className={`shrink-0 text-[11px] font-medium px-2.5 py-1 rounded-lg border transition-colors ${
        sparkDone ? ctaDone : ctaIdle
      }`}
    >
      {sparkDone ? "Fait ✓" : 'Je le fais'}
    </button>
  );

  const dismissButton = (
    <button
      type="button"
      onClick={handleDismiss}
      aria-label="Fermer l’étincelle du jour"
      title="Fermer pour aujourd’hui"
      className="shrink-0 p-1 rounded-md text-muted-foreground/50 hover:text-foreground hover:bg-white/10 transition-colors touch-target"
    >
      <X className="w-3.5 h-3.5" />
    </button>
  );

  return (
    <div
      className={`relative overflow-hidden rounded-xl border text-left ${accentBorder} ${
        compact ? 'px-2.5 py-1.5 sm:px-3 sm:py-2' : 'px-2.5 py-1.5 sm:px-3.5 sm:py-2.5'
      } ${className}`}
    >
      <span
        aria-hidden
        className={`pointer-events-none absolute -top-6 -left-4 h-16 w-16 rounded-full blur-2xl opacity-40 ${
          coquinMode ? 'bg-rose-500/40' : 'bg-violet-500/40'
        }`}
      />

      {/* Mobile collapsed chip — ~1 row with CTA + dismiss */}
      <div className={`relative sm:hidden ${expanded ? 'hidden' : 'flex'} items-center gap-1.5`}>
        <button
          type="button"
          onClick={() => setExpanded(true)}
          aria-expanded={false}
          aria-label={`Ouvrir l’étincelle : ${spark.title}`}
          className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
        >
          <Sparkles className={`w-3.5 h-3.5 shrink-0 animate-sparkle ${accentIcon}`} />
          <span className="min-w-0 truncate text-[11px] leading-tight">
            <span className={`font-semibold uppercase tracking-wider ${accentLabel}`}>Étincelle</span>
            <span className="text-muted-foreground/50"> · </span>
            <span className="font-medium text-foreground/85">{spark.title}</span>
          </span>
          <ChevronDown className="w-3.5 h-3.5 shrink-0 text-muted-foreground/45" />
        </button>
        {doneButton}
        {dismissButton}
      </div>

      {/* Expanded mobile + always on sm+ — icon | text | CTA + X */}
      <div className={`relative ${expanded ? 'block' : 'hidden'} sm:block`}>
        <div className="flex items-center gap-2">
          <Sparkles className={`w-3.5 h-3.5 shrink-0 animate-sparkle ${accentIcon}`} />

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className={`text-[10px] font-semibold uppercase tracking-wider ${accentLabel}`}>
                Étincelle du jour
              </span>
              {expanded && (
                <button
                  type="button"
                  onClick={() => setExpanded(false)}
                  className="sm:hidden p-0.5 rounded text-muted-foreground/45 hover:text-foreground"
                  aria-label="Réduire l’étincelle"
                >
                  <ChevronDown className="w-3.5 h-3.5 rotate-180" />
                </button>
              )}
            </div>
            <p
              className={`${
                compact ? 'text-[11px]' : 'text-[11px] sm:text-xs'
              } text-muted-foreground/80 leading-snug line-clamp-2 sm:line-clamp-none`}
            >
              <span className="text-foreground/85 font-medium">{spark.title}</span>
              <span className="text-muted-foreground/40"> — </span>
              {spark.text}
            </p>
            <p className="hidden sm:block text-[10px] text-muted-foreground/45 mt-0.5 leading-snug">
              Petit défi quotidien pour animer le salon. Visible aussi sur l’accueil (icône Maison).
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-1 self-start pt-0.5">
            {doneButton}
            {dismissButton}
          </div>
        </div>
      </div>
    </div>
  );
}
