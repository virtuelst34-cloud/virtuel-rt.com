import React, { useCallback, useState } from 'react';
import { UserCircle2, Search, Star, Ban } from 'lucide-react';
import { toast } from 'sonner';
import Avatar from '../Avatar';
import { SectionTitle } from './AdminComponents';
import { supabaseDbService } from '@/lib/supabaseDb';

interface ProfileHit {
  id: string;
  name: string;
  avatar: string;
  initials: string;
  is_premium: boolean;
  premium_until: string | null;
  level: number;
  xp: number;
}

interface Props {
  readOnly?: boolean;
  canGrant?: boolean;
}

function formatUntil(until: string | null, isPremium: boolean): string {
  if (!isPremium) return 'Standard';
  if (!until) return 'Premium permanent';
  const d = new Date(until);
  if (Number.isNaN(d.getTime())) return 'Premium';
  if (d.getTime() <= Date.now()) return 'Expiré';
  return `Jusqu’au ${d.toLocaleDateString('fr-FR')}`;
}

export default function PremiumProfilesSection({ readOnly = false, canGrant = true }: Props) {
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<ProfileHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [duration, setDuration] = useState<string>(''); // vide = permanent
  const [error, setError] = useState('');

  const search = useCallback(async () => {
    const q = query.trim();
    if (q.length < 1) {
      setHits([]);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const rows = await supabaseDbService.adminSearchProfiles(q);
      setHits(rows);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Recherche impossible');
      setHits([]);
    } finally {
      setLoading(false);
    }
  }, [query]);

  const grant = async (profile: ProfileHit, premium: boolean) => {
    if (readOnly || !canGrant || busy) return;
    setBusy(profile.name);
    try {
      let until: string | null | undefined;
      if (!premium) {
        until = null;
      } else {
        const days = duration.trim() === '' ? null : Math.max(1, parseInt(duration, 10) || 0);
        until = days
          ? new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()
          : null;
      }
      const ok = await supabaseDbService.adminSetPremium(profile.name, premium, until);
      if (!ok) {
        toast.error(`Profil « ${profile.name} » introuvable`);
        return;
      }
      setHits((prev) =>
        prev.map((h) =>
          h.name === profile.name
            ? {
                ...h,
                is_premium: premium,
                premium_until: premium ? (until ?? null) : null,
              }
            : h,
        ),
      );
      toast.success(
        premium
          ? `Premium accordé à ${profile.name}`
          : `Premium retiré à ${profile.name}`,
      );
    } catch {
      toast.error('Impossible de modifier Premium (droits admin requis)');
    } finally {
      setBusy(null);
    }
  };

  const locked = readOnly || !canGrant;

  return (
    <div className="space-y-5">
      <SectionTitle icon={UserCircle2}>Profils Premium</SectionTitle>
      <p className="text-[11px] text-muted-foreground/60">
        Accordez ou retirez Premium à la volée (sans code). Recherche par pseudo.
        Durée vide = permanent ; sinon N jours via <code className="text-foreground/80">premium_until</code>.
      </p>

      <div className="bg-secondary border border-border rounded-xl p-4 space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground/40" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void search();
              }}
              placeholder="Rechercher un pseudo…"
              className="w-full bg-background border border-border rounded-lg pl-8 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/40 outline-none focus:border-yellow-500/40"
            />
          </div>
          <button
            type="button"
            onClick={() => void search()}
            disabled={loading || !query.trim()}
            className="px-3 py-2 rounded-lg bg-yellow-500/15 border border-yellow-500/30 text-yellow-300 text-xs font-semibold hover:bg-yellow-500/25 disabled:opacity-40"
          >
            {loading ? '…' : 'Chercher'}
          </button>
        </div>
        <div>
          <label className="text-[10px] text-muted-foreground/50 uppercase tracking-widest mb-1 block">
            Durée à l’accord (jours, vide = permanent)
          </label>
          <input
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            placeholder="permanent"
            disabled={locked}
            className="w-full max-w-[160px] bg-background border border-border rounded-lg px-3 py-2 text-sm disabled:opacity-40"
          />
        </div>
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}
      {locked && (
        <p className="text-[11px] text-amber-400/90">
          Accorder / retirer Premium nécessite la permission « Accorder Premium » (Direction → Permissions → Premium).
        </p>
      )}

      <div className="space-y-2 max-h-[380px] overflow-y-auto">
        {!loading && hits.length === 0 && query.trim() && (
          <p className="text-xs text-muted-foreground/40 italic">Aucun profil trouvé.</p>
        )}
        {hits.map((p) => {
          const active =
            p.is_premium &&
            (p.premium_until == null || new Date(p.premium_until).getTime() > Date.now());
          return (
            <div
              key={p.id}
              className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 ${
                active ? 'border-yellow-500/25 bg-yellow-500/5' : 'border-border bg-secondary/60'
              }`}
            >
              <Avatar avatarClass={p.avatar} initials={p.initials} size="sm" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-medium text-foreground truncate">{p.name}</span>
                  {active && (
                    <span className="text-[9px] bg-yellow-500/15 text-yellow-400 border border-yellow-500/30 rounded px-1.5 py-px">
                      PREMIUM
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground/55 mt-0.5">
                  Nv.{p.level} · {formatUntil(p.premium_until, p.is_premium)}
                </p>
              </div>
              {active ? (
                <button
                  type="button"
                  disabled={locked || busy === p.name}
                  onClick={() => void grant(p, false)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-red-500/30 text-red-300 text-[11px] font-semibold hover:bg-red-500/10 disabled:opacity-40"
                  title="Retirer Premium"
                >
                  <Ban className="w-3 h-3" />
                  Retirer
                </button>
              ) : (
                <button
                  type="button"
                  disabled={locked || busy === p.name}
                  onClick={() => void grant(p, true)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-yellow-500/30 text-yellow-300 text-[11px] font-semibold hover:bg-yellow-500/15 disabled:opacity-40"
                  title="Accorder Premium"
                >
                  <Star className="w-3 h-3" />
                  Accorder Premium
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
