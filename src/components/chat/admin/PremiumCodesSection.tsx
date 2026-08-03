import React, { useCallback, useEffect, useState } from 'react';
import { KeyRound, Plus, Ban, Copy, RefreshCw } from 'lucide-react';
import { SectionTitle } from './AdminComponents';
import { supabaseDbService } from '@/lib/supabaseDb';

interface PremiumCodeRow {
  id: string;
  code: string;
  duration_days: number | null;
  max_uses: number;
  use_count: number;
  active: boolean;
  expires_at: string | null;
  note: string | null;
  created_at: string;
}

interface Props {
  readOnly?: boolean;
}

function randomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = 'VR-';
  for (let i = 0; i < 8; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

export default function PremiumCodesSection({ readOnly = false }: Props) {
  const [codes, setCodes] = useState<PremiumCodeRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [code, setCode] = useState(() => randomCode());
  const [duration, setDuration] = useState<string>('30'); // '' = permanent
  const [maxUses, setMaxUses] = useState('1');
  const [note, setNote] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const rows = await supabaseDbService.adminListPremiumCodes();
      setCodes(rows);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Impossible de charger les codes');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleCreate = async () => {
    if (readOnly) return;
    setError('');
    setOk('');
    try {
      const days = duration.trim() === '' ? null : Math.max(1, parseInt(duration, 10) || 30);
      await supabaseDbService.adminCreatePremiumCode({
        code: code.trim(),
        durationDays: days,
        maxUses: Math.max(1, parseInt(maxUses, 10) || 1),
        note: note.trim() || null,
      });
      setOk(`Code ${code.trim().toUpperCase()} créé`);
      setCode(randomCode());
      setNote('');
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Création impossible');
    }
  };

  const handleDeactivate = async (id: string) => {
    if (readOnly) return;
    try {
      await supabaseDbService.adminDeactivatePremiumCode(id);
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Désactivation impossible');
    }
  };

  return (
    <div className="space-y-5">
      <SectionTitle icon={KeyRound}>Codes Premium</SectionTitle>
      <p className="text-[11px] text-muted-foreground/60">
        Générez des codes à durée limitée ou permanents. Les utilisateurs les saisissent dans Paramètres → Compte.
        Pas de paiement : grant manuel ★ toujours disponible dans Utilisateurs.
      </p>

      {!readOnly && (
        <div className="bg-secondary border border-border rounded-xl p-4 space-y-3">
          <div className="flex flex-wrap gap-2">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              className="flex-1 min-w-[140px] bg-background border border-border rounded-lg px-3 py-2 text-sm font-mono"
              placeholder="CODE"
            />
            <button
              type="button"
              onClick={() => setCode(randomCode())}
              className="px-3 py-2 rounded-lg border border-border text-xs text-muted-foreground hover:text-foreground"
              title="Nouveau code aléatoire"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-muted-foreground/50 uppercase tracking-widest mb-1 block">
                Durée (jours, vide = permanent)
              </label>
              <input
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="permanent"
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground/50 uppercase tracking-widest mb-1 block">
                Max utilisations
              </label>
              <input
                value={maxUses}
                onChange={(e) => setMaxUses(e.target.value)}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </div>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Note interne (optionnel)"
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={() => void handleCreate()}
            className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold flex items-center justify-center gap-2 hover:opacity-90"
          >
            <Plus className="w-4 h-4" /> Créer le code
          </button>
        </div>
      )}

      {error && <p className="text-xs text-red-400">{error}</p>}
      {ok && <p className="text-xs text-emerald-400">{ok}</p>}

      <div className="space-y-2">
        {loading && <p className="text-xs text-muted-foreground/50">Chargement…</p>}
        {!loading && codes.length === 0 && (
          <p className="text-xs text-muted-foreground/40 italic">Aucun code pour l’instant.</p>
        )}
        {codes.map((c) => (
          <div
            key={c.id}
            className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 ${
              c.active ? 'border-border bg-secondary/60' : 'border-border/40 bg-secondary/30 opacity-60'
            }`}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <code className="text-sm font-mono text-foreground">{c.code}</code>
                <button
                  type="button"
                  onClick={() => void navigator.clipboard?.writeText(c.code)}
                  className="p-1 rounded text-muted-foreground hover:text-foreground"
                  title="Copier"
                >
                  <Copy className="w-3 h-3" />
                </button>
              </div>
              <p className="text-[10px] text-muted-foreground/55 mt-0.5">
                {c.duration_days == null ? 'Permanent' : `${c.duration_days} j`}
                {' · '}
                {c.use_count}/{c.max_uses} utilisations
                {!c.active && ' · inactif'}
                {c.note ? ` · ${c.note}` : ''}
              </p>
            </div>
            {c.active && !readOnly && (
              <button
                type="button"
                onClick={() => void handleDeactivate(c.id)}
                className="p-2 rounded-lg border border-red-500/30 text-red-300 hover:bg-red-500/10"
                title="Désactiver"
              >
                <Ban className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
