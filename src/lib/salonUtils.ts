import { SALONS, type Salon as ConfigSalon } from './chatConfig';
import { DEFAULT_SALON_CATEGORIES, getCategoryMeta, type SalonCategory } from './salonCategories';

export type SortableSalon = ConfigSalon & {
  sort_order?: number;
  description?: string;
  created_by?: string;
  category_id?: string;
  subcategory?: string;
  isCoquin?: boolean;
};

export type SalonCategoryGroup = {
  category: SalonCategory;
  salons: SortableSalon[];
};

/** Ordre par défaut des salons built-in (index × 10 ou sort_order explicite). */
export function defaultBuiltinOrder(): Record<string, number> {
  const map: Record<string, number> = {};
  SALONS.forEach((s, i) => {
    map[s.id] = s.sort_order ?? i * 10;
  });
  return map;
}

export function isSalonCoquin(salon: SortableSalon): boolean {
  return salon.isCoquin === true || salon.category_id === 'coquin';
}

export function mergeAndSortSalons(
  customSalons: SortableSalon[],
  hiddenSalons: string[] = [],
  displayOrder: Record<string, number> = {},
  options: { coquinMode?: boolean } = {},
): SortableSalon[] {
  const defaults = defaultBuiltinOrder();
  const coquinOn = options.coquinMode === true;
  // Built-in d’abord, custom en overlay (sans doublon) — conserve category_id built-in si custom l’omit
  const byId = new Map<string, SortableSalon>();
  for (const s of SALONS) byId.set(s.id, s);
  for (const s of customSalons || []) {
    const existing = byId.get(s.id);
    if (existing) {
      byId.set(s.id, {
        ...existing,
        ...s,
        category_id: s.category_id || existing.category_id,
        subcategory: s.subcategory || existing.subcategory,
        isCoquin: s.isCoquin ?? existing.isCoquin,
        sort_order: s.sort_order ?? existing.sort_order,
      });
    } else {
      byId.set(s.id, s);
    }
  }
  const all = Array.from(byId.values()).filter(s => {
    if ((hiddenSalons || []).includes(s.id)) return false;
    if (isSalonCoquin(s) && !coquinOn) return false;
    return true;
  });
  return [...all].sort((a, b) => {
    const ao = displayOrder[a.id] ?? a.sort_order ?? defaults[a.id] ?? 9999;
    const bo = displayOrder[b.id] ?? b.sort_order ?? defaults[b.id] ?? 9999;
    if (ao !== bo) return ao - bo;
    return (a.name || '').localeCompare(b.name || '', 'fr');
  });
}

/**
 * Groupe les salons par catégorie (ordre catégorie puis activité / sort_order).
 * `activityBySalon` = membres en ligne ou compteur messages — booste le classement interne.
 */
export function groupSalonsByCategory(
  salons: SortableSalon[],
  categories: SalonCategory[] = DEFAULT_SALON_CATEGORIES,
  activityBySalon: Record<string, number> = {},
  options: { coquinMode?: boolean } = {},
): SalonCategoryGroup[] {
  const coquinOn = options.coquinMode === true;
  const visible = salons.filter(s => !(isSalonCoquin(s) && !coquinOn));
  const catList = [...categories].sort((a, b) => a.sort_order - b.sort_order);
  const byId = new Map(catList.map(c => [c.id, c]));

  const buckets = new Map<string, SortableSalon[]>();
  for (const cat of catList) buckets.set(cat.id, []);

  for (const salon of visible) {
    const cid = salon.category_id && byId.has(salon.category_id)
      ? salon.category_id
      : getCategoryMeta(salon.category_id).id;
    if (!buckets.has(cid)) buckets.set(cid, []);
    buckets.get(cid)!.push(salon);
  }

  const groups: SalonCategoryGroup[] = [];
  for (const cat of catList) {
    if (cat.isCoquin && !coquinOn) continue;
    const list = buckets.get(cat.id) || [];
    if (list.length === 0) continue;
    const sorted = [...list].sort((a, b) => {
      const actA = activityBySalon[a.id] ?? a.count ?? 0;
      const actB = activityBySalon[b.id] ?? b.count ?? 0;
      if (actA !== actB) return actB - actA;
      const soA = a.sort_order ?? 9999;
      const soB = b.sort_order ?? 9999;
      if (soA !== soB) return soA - soB;
      return (a.name || '').localeCompare(b.name || '', 'fr');
    });
    groups.push({ category: cat, salons: sorted });
  }
  return groups;
}

export function isSalonCreator(salon: { created_by?: string | null }, userName?: string | null): boolean {
  if (!userName || !salon.created_by) return false;
  return salon.created_by.trim().toLowerCase() === userName.trim().toLowerCase();
}
