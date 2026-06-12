import React, { useState } from 'react';
import { Diamond, X } from 'lucide-react';
import { useBadges } from '@/lib/contexts';
import { getMergedBadges } from '@/lib/diamondBadges';
import DiamondBadge from '../DiamondBadge';
import { SectionTitle } from './AdminComponents';

export default function BadgesSection() {
  const { customBadges, setCustomBadges } = useBadges();
  const badges = getMergedBadges(customBadges || []);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, any>>({});

  const handleEdit = (badge: any) => {
    setEditing(badge.id);
    setDraft({ label: badge.label, color: badge.color, minLevel: badge.minLevel });
  };

  const handleSave = (id: string) => {
    setCustomBadges(prev => {
      const existing = prev.find(b => b.id === id);
      if (existing) return prev.map(b => b.id === id ? { ...b, ...draft } : b);
      return [...prev, { id, ...draft } as any];
    });
    setEditing(null);
  };

  const handleReset = (id: string) => {
    setCustomBadges(prev => prev.filter(b => b.id !== id));
    setEditing(null);
  };

  return (
    <div>
      <SectionTitle icon={Diamond}>Gestion des badges</SectionTitle>
      <p className="text-[11px] text-muted-foreground/50 mb-4">Modifiez le nom, la couleur et le niveau requis de chaque badge diamant.</p>

      {/* Aperçu global */}
      <div className="flex flex-wrap gap-2 mb-5 p-3 bg-secondary border border-border rounded-xl">
        {badges.map(b => (
          <span key={b.id} className="flex items-center gap-1 px-2 py-1 rounded-full border text-[10px] font-semibold"
            style={{ color: b.color, borderColor: b.color + '50', background: b.color + '15' }}>
            <DiamondBadge level={b.minLevel} size="xs" />
            {b.label}
          </span>
        ))}
      </div>

      <div className="space-y-2">
        {badges.map(badge => {
          const isEditing = editing === badge.id;
          const isCustomized = (customBadges || []).some(b => b.id === badge.id);
          return (
            <div key={badge.id} className="bg-secondary border border-border rounded-xl px-3 py-2.5">
              <div className="flex items-center gap-3">
                {/* Aperçu diamant */}
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: badge.color + '18', border: `1px solid ${badge.color}40` }}>
                  <DiamondBadge level={badge.minLevel} size="xs" />
                </div>

                {isEditing ? (
                  <div className="flex-1 grid grid-cols-3 gap-2">
                    <input value={draft.label} onChange={e => setDraft(d => ({ ...d, label: e.target.value }))}
                      placeholder="Nom du badge"
                      className="bg-background border border-border rounded-lg px-2 py-1 text-xs text-foreground outline-none focus:border-primary/50" />
                    <div className="flex items-center gap-1.5">
                      <input type="color" value={draft.color} onChange={e => setDraft(d => ({ ...d, color: e.target.value }))}
                        className="w-7 h-7 rounded cursor-pointer border border-border bg-background" />
                      <input value={draft.color} onChange={e => setDraft(d => ({ ...d, color: e.target.value }))}
                        className="flex-1 bg-background border border-border rounded-lg px-2 py-1 text-xs text-foreground outline-none focus:border-primary/50" />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-muted-foreground/50 shrink-0">Nv.</span>
                      <input type="number" min="1" max="99" value={draft.minLevel}
                        onChange={e => setDraft(d => ({ ...d, minLevel: parseInt(e.target.value) || 1 }))}
                        className="w-full bg-background border border-border rounded-lg px-2 py-1 text-xs text-foreground outline-none focus:border-primary/50" />
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-foreground">{badge.label}</span>
                      {isCustomized && <span className="text-[9px] bg-primary/15 text-primary border border-primary/30 rounded px-1.5 py-px">modifié</span>}
                    </div>
                    <div className="text-[10px] text-muted-foreground/50">Niveau {badge.minLevel}+ · {badge.color}</div>
                  </div>
                )}

                <div className="flex items-center gap-1 shrink-0">
                  {isEditing ? (
                    <>
                      <button onClick={() => handleSave(badge.id)}
                        className="px-2 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] hover:bg-emerald-500/25 transition-colors">
                        Sauver
                      </button>
                      {isCustomized && (
                        <button onClick={() => handleReset(badge.id)}
                          className="px-2 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-400 text-[10px] hover:bg-amber-500/25 transition-colors">
                          Reset
                        </button>
                      )}
                      <button onClick={() => setEditing(null)}
                        className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-muted-foreground/50 hover:bg-white/10 transition-colors">
                        <X className="w-3 h-3" />
                      </button>
                    </>
                  ) : (
                    <button onClick={() => handleEdit(badge)}
                      className="px-2 py-1 rounded-lg bg-primary/15 border border-primary/30 text-primary text-[10px] hover:bg-primary/25 transition-colors">
                      Modifier
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
