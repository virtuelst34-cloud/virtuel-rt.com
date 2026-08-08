import React, { useState } from 'react';
import { ChevronDown, Target, X } from 'lucide-react';
import {
  dismissWeeklyChallenge,
  getWeeklyChallenge,
  isWeeklyChallengeDismissed,
  isWeeklyChallengeDone,
  markWeeklyChallengeDone,
} from '@/lib/weeklyChallenge';
import { useNotifications } from '@/lib/contexts';

interface WeeklyChallengeCardProps {
  className?: string;
}

/** Carte défi de la semaine — chip compact sur téléphone, carte complète dès sm. */
export default function WeeklyChallengeCard({ className = '' }: WeeklyChallengeCardProps) {
  const { addNotification } = useNotifications();
  const [challenge] = useState(() => getWeeklyChallenge());
  const [dismissed, setDismissed] = useState(() => isWeeklyChallengeDismissed(challenge.key));
  const [done, setDone] = useState(() => isWeeklyChallengeDone(challenge.key));
  const [expanded, setExpanded] = useState(false);

  if (dismissed) return null;

  const body = (
    <>
      <button
        type="button"
        onClick={() => {
          dismissWeeklyChallenge(challenge.key);
          setDismissed(true);
        }}
        aria-label="Fermer le défi"
        className="absolute top-1.5 right-1.5 p-1 rounded-md text-muted-foreground/50 hover:text-foreground hover:bg-white/10 touch-target"
      >
        <X className="w-3.5 h-3.5" />
      </button>
      <div className="flex items-center gap-2 mb-1 pr-6">
        <Target className="w-3.5 h-3.5 text-sky-300 shrink-0" />
        <span className="text-[11px] font-semibold uppercase tracking-wider text-sky-300">
          Défi de la semaine
        </span>
      </div>
      <p className="text-xs text-muted-foreground/80 leading-relaxed">
        <span className="text-foreground/80 font-medium">{challenge.title}</span>
        {' — '}
        {challenge.text}
      </p>
      <button
        type="button"
        disabled={done}
        onClick={() => {
          markWeeklyChallengeDone(challenge.key);
          dismissWeeklyChallenge(challenge.key);
          setDone(true);
          setDismissed(true);
          addNotification({ type: 'system', message: 'Défi de la semaine coché — bravo !' });
        }}
        className={`mt-2 text-[11px] px-3 py-1.5 rounded-lg border transition-all ${
          done
            ? 'border-emerald-500/30 bg-emerald-500/15 text-emerald-400 cursor-default'
            : 'border-sky-500/30 bg-sky-500/15 text-sky-200 hover:bg-sky-500/25'
        }`}
      >
        {done ? 'Fait cette semaine ✓' : 'Je m’y mets'}
      </button>
    </>
  );

  return (
    <div className={className}>
      {/* Téléphone : chip repliable */}
      <div className="sm:hidden">
        {!expanded ? (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl border border-sky-500/25 bg-sky-500/10 text-left touch-target"
          >
            <Target className="w-3.5 h-3.5 text-sky-300 shrink-0" />
            <span className="flex-1 text-[11px] font-medium text-foreground truncate">{challenge.title}</span>
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          </button>
        ) : (
          <div className="relative rounded-xl border border-sky-500/25 bg-sky-500/10 px-4 py-3 text-left">
            {body}
          </div>
        )}
      </div>

      {/* Desktop / tablette : carte complète */}
      <div className="hidden sm:block relative rounded-xl border border-sky-500/25 bg-sky-500/10 px-4 py-3 text-left">
        {body}
      </div>
    </div>
  );
}
