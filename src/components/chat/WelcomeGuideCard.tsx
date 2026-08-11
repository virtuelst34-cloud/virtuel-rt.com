import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, ChevronDown, ChevronUp, Scale, Settings } from 'lucide-react';
import {
  MENTIONS_LEGALES_HREF,
  WELCOME_HOWTO,
  WELCOME_RULES,
  WELCOME_SETTINGS_PATH,
} from '@/lib/welcomeContent';

export default function WelcomeGuideCard() {
  const [open, setOpen] = useState(true);

  return (
    <div className="mx-auto max-w-xl w-full mb-4 rounded-2xl border border-purple-500/30 bg-gradient-to-br from-purple-950/50 via-secondary/80 to-indigo-950/40 overflow-hidden shadow-lg shadow-purple-900/20">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-white/[0.03] transition-colors"
      >
        <BookOpen className="w-4 h-4 text-purple-300 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-foreground">Guide Virtuel-RT</div>
          <div className="text-[11px] text-muted-foreground/60">Règles · Fonctionnement · Paramètres</div>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground/50" /> : <ChevronDown className="w-4 h-4 text-muted-foreground/50" />}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-4 text-[12px] text-muted-foreground/80 leading-relaxed border-t border-purple-500/15 pt-3 max-h-[min(60vh,520px)] overflow-y-auto overscroll-contain">
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-100/90 leading-snug">
            <strong className="font-semibold">18+ · Interdit aux mineurs.</strong>{' '}
            Virtuel-RT est réservé aux adultes. Signalez tout contenu inapproprié via le bouton signaler.
          </div>
          <section>
            <h4 className="text-[11px] font-semibold uppercase tracking-wider text-purple-300 mb-1.5 flex items-center gap-1.5">
              <Scale className="w-3.5 h-3.5" /> Règles du site
            </h4>
            <ul className="space-y-1.5 list-disc pl-4">
              {WELCOME_RULES.map(r => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </section>

          <section>
            <h4 className="text-[11px] font-semibold uppercase tracking-wider text-purple-300 mb-1.5">Fonctionnement</h4>
            <ul className="space-y-1.5 list-disc pl-4">
              {WELCOME_HOWTO.map(r => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </section>

          <section>
            <h4 className="text-[11px] font-semibold uppercase tracking-wider text-purple-300 mb-1.5 flex items-center gap-1.5">
              <Settings className="w-3.5 h-3.5" /> Modifier vos paramètres
            </h4>
            <ul className="space-y-1.5">
              {WELCOME_SETTINGS_PATH.map(item => (
                <li key={item.path}>
                  <span className="text-foreground/90 font-medium">{item.path}</span>
                  <span className="text-muted-foreground/50"> — {item.detail}</span>
                </li>
              ))}
            </ul>
          </section>

          <Link
            to={MENTIONS_LEGALES_HREF}
            className="inline-flex items-center gap-1.5 text-purple-300 hover:text-purple-200 underline underline-offset-2 text-[11px] font-medium"
          >
            Mentions légales
          </Link>
        </div>
      )}
    </div>
  );
}
