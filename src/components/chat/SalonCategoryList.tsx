import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ChevronDown, ChevronRight, Lock } from 'lucide-react';
import type { Salon } from '@/lib/chatConfig';
import type { SalonCategoryGroup, SortableSalon } from '@/lib/salonUtils';

function PulseDot({ color = 'bg-emerald-500' }: { color?: string }) {
  return (
    <span className="relative flex h-2 w-2 shrink-0">
      <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${color} opacity-60`} />
      <span className={`relative inline-flex rounded-full h-2 w-2 ${color}`} />
    </span>
  );
}

type FlatRow =
  | { kind: 'header'; group: SalonCategoryGroup; collapsed: boolean }
  | { kind: 'salon'; salon: SortableSalon; indexInCat: number };

interface SalonCategoryListProps {
  categoryGroups: SalonCategoryGroup[];
  salonCounts: Record<string, number>;
  emojiFallback?: Record<string, string>;
  onSalonClick: (salon: Salon) => void;
  /** Force mobile behaviour (lazy-collapse + windowing). Auto-detect if omitted. */
  mobile?: boolean;
}

function useIsNarrow(force?: boolean): boolean {
  const [narrow, setNarrow] = useState(() =>
    typeof force === 'boolean'
      ? force
      : typeof window !== 'undefined'
        ? window.matchMedia('(max-width: 767px)').matches
        : false,
  );
  useEffect(() => {
    if (typeof force === 'boolean') {
      setNarrow(force);
      return;
    }
    const mq = window.matchMedia('(max-width: 767px)');
    const onChange = () => setNarrow(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [force]);
  return narrow;
}

/**
 * Liste salons par catégorie — sur mobile : collapse des cats vides + virtualisation.
 * Préserve en-têtes de catégorie et badges d’occupation.
 */
export default function SalonCategoryList({
  categoryGroups,
  salonCounts,
  emojiFallback = {},
  onSalonClick,
  mobile,
}: SalonCategoryListProps) {
  const isMobile = useIsNarrow(mobile);
  const parentRef = useRef<HTMLDivElement>(null);
  const [collapsedCats, setCollapsedCats] = useState<Record<string, boolean>>({});
  const hydratedRef = useRef(false);

  // Lazy-collapse : au premier rendu mobile, replier les catégories sans occupants
  useEffect(() => {
    if (!isMobile || hydratedRef.current || categoryGroups.length === 0) return;
    hydratedRef.current = true;
    const next: Record<string, boolean> = {};
    let keptOpen = 0;
    for (const g of categoryGroups) {
      const occ = g.salons.reduce((sum, s) => sum + (salonCounts[s.id] || 0), 0);
      if (occ > 0 && keptOpen < 2) {
        next[g.category.id] = false;
        keptOpen += 1;
      } else if (occ > 0) {
        next[g.category.id] = false;
      } else {
        next[g.category.id] = true;
      }
    }
    // Toujours garder au moins la première catégorie ouverte
    if (categoryGroups[0]) next[categoryGroups[0].category.id] = false;
    setCollapsedCats(next);
  }, [isMobile, categoryGroups, salonCounts]);

  const toggleCat = useCallback((id: string) => {
    setCollapsedCats((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const flatRows = useMemo<FlatRow[]>(() => {
    const rows: FlatRow[] = [];
    for (const group of categoryGroups) {
      const collapsed = !!collapsedCats[group.category.id];
      rows.push({ kind: 'header', group, collapsed });
      if (!collapsed) {
        group.salons.forEach((salon, indexInCat) => {
          rows.push({ kind: 'salon', salon, indexInCat });
        });
      }
    }
    return rows;
  }, [categoryGroups, collapsedCats]);

  const useWindowing = isMobile && flatRows.length > 24;

  const virtualizer = useVirtualizer({
    count: flatRows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (i) => (flatRows[i]?.kind === 'header' ? 36 : 52),
    overscan: 6,
  });

  const renderRow = (row: FlatRow) => {
    if (row.kind === 'header') {
      const { group, collapsed } = row;
      return (
        <div className="mb-0.5">
          <button
            type="button"
            onClick={() => toggleCat(group.category.id)}
            className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-left hover:bg-white/[0.04] transition-colors"
          >
            {collapsed
              ? <ChevronRight className="w-3 h-3 text-muted-foreground/40 shrink-0" />
              : <ChevronDown className="w-3 h-3 text-muted-foreground/40 shrink-0" />}
            <span className="text-sm shrink-0" aria-hidden>{group.category.emoji}</span>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70 flex-1 truncate">
              {group.category.name}
            </span>
            <span className="text-[9px] text-muted-foreground/40 tabular-nums">{group.salons.length}</span>
            {group.category.isCoquin && (
              <span className="text-[8px] px-1.5 py-px rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/30">18+</span>
            )}
          </button>
        </div>
      );
    }

    const { salon, indexInCat } = row;
    const count = salonCounts[salon.id] || 0;
    return (
      <div className="border-l border-border/40 ml-3 pl-1">
        <button
          type="button"
          onClick={() => onSalonClick(salon)}
          className="w-full flex items-center gap-3 px-2.5 py-2 rounded-xl hover:bg-white/[0.05] transition-all duration-200 text-left group hover:scale-[1.02] active:scale-[0.98]"
          style={isMobile ? undefined : { animationDelay: `${indexInCat * 30}ms` }}
        >
          <div className="w-8 h-8 rounded-xl bg-secondary border border-border flex items-center justify-center text-base shrink-0 group-hover:scale-110 transition-transform duration-300">
            {salon.emoji || emojiFallback[salon.id] || '💬'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[12px] font-medium text-foreground truncate group-hover:text-primary transition-colors">{salon.name}</span>
              {salon.isPrivate && <Lock className="w-3 h-3 text-amber-400 shrink-0" />}
              {salon.live && <PulseDot color="bg-red-500" />}
              {salon.isCoquin && <span className="text-[8px] text-rose-300/80 shrink-0">🔥</span>}
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              {salon.subcategory && (
                <span className="text-[9px] text-muted-foreground/40 truncate">{salon.subcategory}</span>
              )}
              {salon.live && <span className="text-[9px] bg-red-500/15 text-red-400 border border-red-500/30 rounded px-1.5 py-px font-semibold animate-pulse">LIVE</span>}
            </div>
          </div>
          {count > 0 && (
            <span
              className="shrink-0 inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-semibold tabular-nums px-1.5 py-0.5"
              title={`${count} en ligne dans ce salon`}
              aria-label={`${count} utilisateurs en ligne`}
            >
              <PulseDot color="bg-emerald-500" />
              {count}
            </span>
          )}
        </button>
      </div>
    );
  };

  if (categoryGroups.length === 0) {
    return (
      <div className="flex-1 overflow-y-auto py-1.5 px-2">
        <p className="text-[11px] text-muted-foreground/50 px-3 py-4 text-center italic">Aucun salon pour ce filtre.</p>
      </div>
    );
  }

  if (!useWindowing) {
    return (
      <div ref={parentRef} className="flex-1 overflow-y-auto py-1.5 px-2">
        {flatRows.map((row, i) => (
          <div key={row.kind === 'header' ? `h-${row.group.category.id}` : `s-${row.salon.id}`} className="mb-0.5">
            {renderRow(row)}
          </div>
        ))}
      </div>
    );
  }

  const items = virtualizer.getVirtualItems();

  return (
    <div ref={parentRef} className="flex-1 overflow-y-auto py-1.5 px-2">
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {items.map((vi) => {
          const row = flatRows[vi.index];
          if (!row) return null;
          return (
            <div
              key={row.kind === 'header' ? `h-${row.group.category.id}` : `s-${row.salon.id}`}
              data-index={vi.index}
              ref={virtualizer.measureElement}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${vi.start}px)`,
              }}
            >
              {renderRow(row)}
            </div>
          );
        })}
      </div>
    </div>
  );
}
