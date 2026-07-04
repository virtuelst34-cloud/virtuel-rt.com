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
