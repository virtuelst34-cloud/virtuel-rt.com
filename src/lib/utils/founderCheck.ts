import { UserProfile } from '../contexts/UserContext';

const FOUNDER_EMAIL = 'virtuelst34@gmail.com';

/**
 * Vérifie si l'utilisateur est le fondateur du site
 * @param user - Profil utilisateur à vérifier
 * @returns true si l'utilisateur est le fondateur
 */
export function isFounder(user: UserProfile | null | undefined): boolean {
  if (!user) return false;
  return user.email === FOUNDER_EMAIL && user.isFounder === true;
}

/**
 * Vérifie si l'utilisateur a accès aux paramètres fondateur
 * @param user - Profil utilisateur à vérifier
 * @returns true si l'utilisateur a accès
 */
export function hasFounderAccess(user: UserProfile | null | undefined): boolean {
  return isFounder(user);
}

/**
 * Accès modification panneau admin (fondateur, direction, master OP, admin…)
 */
export function hasAdminAccess(
  user: UserProfile | null | undefined,
  readOnly = false
): boolean {
  if (readOnly || !user) return false;
  const badges = user.specialBadges || [];
  return !!(
    user.isAdmin ||
    user.isFounder ||
    user.isDirection ||
    user.isMasterOp ||
    badges.includes('founder') ||
    badges.includes('direction') ||
    badges.includes('master_op')
  );
}

/**
 * Accès staff (alertes, signalements, chat direction) — inclut les modérateurs.
 */
export function hasStaffAccess(user: UserProfile | null | undefined): boolean {
  if (!user) return false;
  if (hasAdminAccess(user)) return true;
  const badges = user.specialBadges || [];
  return badges.includes('moderator') || badges.includes('direction') || badges.includes('master_op') || badges.includes('founder');
}
