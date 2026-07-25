import { SALONS, type Salon as ConfigSalon } from './chatConfig';

export type SortableSalon = ConfigSalon & {
  sort_order?: number;
  description?: string;
  created_by?: string;
};

/** Ordre par défaut des salons built-in (index × 10). */
export function defaultBuiltinOrder(): Record<string, number> {
  const map: Record<string, number> = {};
  SALONS.forEach((s, i) => { map[s.id] = i * 10; });
  return map;
}

export function mergeAndSortSalons(
  customSalons: SortableSalon[],
  hiddenSalons: string[] = [],
  displayOrder: Record<string, number> = {},
): SortableSalon[] {
  const defaults = defaultBuiltinOrder();
  const all = [...SALONS, ...(customSalons || [])].filter(
    s => !(hiddenSalons || []).includes(s.id),
  );
  return [...all].sort((a, b) => {
    const ao = displayOrder[a.id] ?? a.sort_order ?? defaults[a.id] ?? 9999;
    const bo = displayOrder[b.id] ?? b.sort_order ?? defaults[b.id] ?? 9999;
    if (ao !== bo) return ao - bo;
    return (a.name || '').localeCompare(b.name || '', 'fr');
  });
}

export function isSalonCreator(salon: { created_by?: string | null }, userName?: string | null): boolean {
  if (!userName || !salon.created_by) return false;
  return salon.created_by.trim().toLowerCase() === userName.trim().toLowerCase();
}
