/**
 * Configuration des actions staff affichées sur la fiche profil.
 * Stockée en localStorage (simple, pas de migration DB).
 */

export type StaffProfileRole = 'founder' | 'direction' | 'master_op' | 'moderator';

export type StaffProfileActionId =
  | 'grant_vip'
  | 'grant_premium'
  | 'assign_badges'
  | 'staff_mute'
  | 'staff_ban';

export interface StaffProfileActionConfig {
  /** Afficher l’action sur le profil (si le rôle le permet). */
  enabled: boolean;
  /** Rôles autorisés à utiliser cette action. */
  roles: StaffProfileRole[];
}

export type StaffProfileActionsSettings = Record<StaffProfileActionId, StaffProfileActionConfig>;

export const STAFF_PROFILE_ACTIONS_KEY = 'virtuel_rt_staff_profile_actions';

export const STAFF_PROFILE_ACTION_META: Record<
  StaffProfileActionId,
  { label: string; description: string }
> = {
  grant_vip: {
    label: 'Accorder VIP',
    description: 'Toggle du badge VIP depuis la fiche profil',
  },
  grant_premium: {
    label: 'Accorder Premium',
    description: 'Activer / retirer Premium depuis le profil',
  },
  assign_badges: {
    label: 'Badges spéciaux',
    description: 'Attribuer ou retirer les badges spéciaux',
  },
  staff_mute: {
    label: 'Mute staff',
    description: 'Mute / démute global (modération)',
  },
  staff_ban: {
    label: 'Bannir',
    description: 'Ban / unban depuis la fiche profil',
  },
};

export const ALL_STAFF_PROFILE_ROLES: StaffProfileRole[] = [
  'founder',
  'direction',
  'master_op',
  'moderator',
];

export const STAFF_PROFILE_ROLE_LABELS: Record<StaffProfileRole, string> = {
  founder: 'Fondateur',
  direction: 'Direction',
  master_op: 'Master OP',
  moderator: 'Modérateur',
};

export const DEFAULT_STAFF_PROFILE_ACTIONS: StaffProfileActionsSettings = {
  grant_vip: {
    enabled: true,
    roles: ['founder', 'direction', 'master_op', 'moderator'],
  },
  grant_premium: {
    enabled: true,
    roles: ['founder', 'direction', 'master_op'],
  },
  assign_badges: {
    enabled: true,
    roles: ['founder', 'direction', 'master_op'],
  },
  staff_mute: {
    enabled: true,
    roles: ['founder', 'direction', 'master_op', 'moderator'],
  },
  staff_ban: {
    enabled: true,
    roles: ['founder', 'direction', 'master_op', 'moderator'],
  },
};

function normalizeConfig(raw: unknown): StaffProfileActionsSettings {
  const base = { ...DEFAULT_STAFF_PROFILE_ACTIONS };
  if (!raw || typeof raw !== 'object') return base;
  const obj = raw as Record<string, Partial<StaffProfileActionConfig>>;
  for (const id of Object.keys(DEFAULT_STAFF_PROFILE_ACTIONS) as StaffProfileActionId[]) {
    const entry = obj[id];
    if (!entry || typeof entry !== 'object') continue;
    const roles = Array.isArray(entry.roles)
      ? entry.roles.filter((r): r is StaffProfileRole =>
          ALL_STAFF_PROFILE_ROLES.includes(r as StaffProfileRole),
        )
      : base[id].roles;
    base[id] = {
      enabled: entry.enabled !== false,
      roles: roles.length > 0 ? roles : base[id].roles,
    };
  }
  return base;
}

export function loadStaffProfileActions(): StaffProfileActionsSettings {
  try {
    const raw = localStorage.getItem(STAFF_PROFILE_ACTIONS_KEY);
    if (!raw) return { ...DEFAULT_STAFF_PROFILE_ACTIONS };
    return normalizeConfig(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_STAFF_PROFILE_ACTIONS };
  }
}

export function saveStaffProfileActions(settings: StaffProfileActionsSettings): void {
  localStorage.setItem(STAFF_PROFILE_ACTIONS_KEY, JSON.stringify(settings));
}

/** Rôles staff dérivés d’un profil utilisateur. */
export function staffRolesFromUser(user: {
  isFounder?: boolean;
  isDirection?: boolean;
  isMasterOp?: boolean;
  isAdmin?: boolean;
  specialBadges?: string[];
} | null | undefined): StaffProfileRole[] {
  if (!user) return [];
  const roles: StaffProfileRole[] = [];
  const badges = user.specialBadges || [];
  if (user.isFounder || badges.includes('founder')) roles.push('founder');
  if (user.isDirection || badges.includes('direction')) roles.push('direction');
  if (user.isMasterOp || badges.includes('master_op')) roles.push('master_op');
  if (badges.includes('moderator')) roles.push('moderator');
  // Admin générique sans badge staff → au moins moderator pour les actions de base
  if (user.isAdmin && roles.length === 0) roles.push('moderator');
  return roles;
}

export function canUseStaffProfileAction(
  actionId: StaffProfileActionId,
  userRoles: StaffProfileRole[],
  settings: StaffProfileActionsSettings = loadStaffProfileActions(),
): boolean {
  const cfg = settings[actionId];
  if (!cfg?.enabled) return false;
  if (userRoles.includes('founder')) return true;
  return cfg.roles.some((r) => userRoles.includes(r));
}
