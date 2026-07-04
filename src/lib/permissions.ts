/**
 * Service de Gestion des Permissions
 * 
 * Ce module gère le système de permissions basé sur les rôles (RBAC) de l'application.
 * Il permet de vérifier si un utilisateur a le droit d'effectuer certaines actions
 * dans différentes sections de l'application.
 * 
 * Les permissions sont stockées dans la table 'permissions' de Supabase et
 * sont mises en cache localement pour optimiser les performances.
 */

import { supabase } from './supabase';

/**
 * Types d'identifiants utilisateur
 * - guest: Utilisateur non connecté
 * - authenticated: Utilisateur connecté basique
 * - founder: Fondateur de l'application (badge)
 * - direction: Membre de la direction (badge)
 * - master_op: Opérateur principal (badge)
 * - moderator: Modérateur (badge)
 * - vip: Utilisateur VIP (badge)
 */
export type UserIdentifier = 'guest' | 'authenticated' | 'founder' | 'direction' | 'master_op' | 'moderator' | 'vip';

/**
 * Types d'identificateurs
 * - user_type: Type d'utilisateur standard
 * - badge: Badge spécial accordé à certains utilisateurs
 */
export type IdentifierType = 'user_type' | 'badge';

/**
 * Sections de l'application où les permissions s'appliquent
 */
export type PermissionSection = 'chat' | 'moderation' | 'admin' | 'settings' | 'salons' | 'badges' | 'xp';

/**
 * Actions possibles dans chaque section
 */
export type PermissionAction =
  | 'read' | 'write' | 'delete_own' | 'delete_any'
  | 'view_reports' | 'ban_users' | 'mute_users' | 'unblock_users'
  | 'access_panel' | 'manage_permissions' | 'view_analytics'
  | 'view_own' | 'edit_own' | 'edit_any'
  | 'view_all' | 'create_custom' | 'delete_custom'
  | 'view_all_badges' | 'assign_special'
  | 'view_own_xp' | 'view_all_xp' | 'modify_any_xp';

/**
 * Interface représentant une permission dans la base de données
 */
interface Permission {
  id: string;
  section: PermissionSection;
  action: PermissionAction;
  user_identifier: UserIdentifier;
  identifier_type: IdentifierType;
  allowed: boolean;
}

// Cache pour les permissions (TTL: 5 minutes)
// Permet d'éviter les requêtes répétées à la base de données pour les mêmes vérifications
const permissionCache = new Map<string, { allowed: boolean; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Génère une clé de cache unique pour une combinaison permission
 */
function getCacheKey(
  userIdentifier: UserIdentifier,
  identifierType: IdentifierType,
  section: PermissionSection,
  action: PermissionAction
): string {
  return `${userIdentifier}:${identifierType}:${section}:${action}`;
}

/**
 * Récupère une permission depuis le cache si elle est encore valide
 */
function getCachedPermission(key: string): boolean | null {
  const cached = permissionCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.allowed;
  }
  if (cached) {
    permissionCache.delete(key);
  }
  return null;
}

/**
 * Stocke une permission dans le cache
 */
function setCachedPermission(key: string, allowed: boolean): void {
  permissionCache.set(key, { allowed, timestamp: Date.now() });
}

/**
 * Vide entièrement le cache des permissions
 * À appeler après une modification des permissions dans la base de données
 */
function clearPermissionCache(): void {
  permissionCache.clear();
}

/**
 * Service de gestion des permissions
 */
export const permissionsService = {
  /**
   * Vérifie si un utilisateur a une permission spécifique
   */
  async hasPermission(
    userIdentifier: UserIdentifier,
    identifierType: IdentifierType,
    section: PermissionSection,
    action: PermissionAction
  ): Promise<boolean> {
    const cacheKey = getCacheKey(userIdentifier, identifierType, section, action);
    const cached = getCachedPermission(cacheKey);
    if (cached !== null) {
      return cached;
    }

    try {
      const { data, error } = await supabase
        .from('permissions')
        .select('allowed')
        .eq('section', section)
        .eq('action', action)
        .eq('user_identifier', userIdentifier)
        .eq('identifier_type', identifierType)
        .maybeSingle();

      if (error) {
        console.error('Erreur lors de la vérification de permission:', error);
        return false;
      }

      const allowed = data?.allowed || false;
      setCachedPermission(cacheKey, allowed);
      return allowed;
    } catch (error) {
      console.error('Erreur lors de la vérification de permission:', error);
      return false;
    }
  },

  /**
   * Récupère toutes les permissions pour un type d'utilisateur
   */
  async getPermissionsForUserIdentifier(userIdentifier: UserIdentifier, identifierType: IdentifierType): Promise<Permission[]> {
    try {
      const { data, error } = await supabase
        .from('permissions')
        .select('*')
        .eq('user_identifier', userIdentifier)
        .eq('identifier_type', identifierType);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Erreur lors de la récupération des permissions:', error);
      return [];
    }
  },

  /**
   * Récupère toutes les permissions pour une section
   */
  async getPermissionsForSection(section: PermissionSection): Promise<Permission[]> {
    try {
      const { data, error } = await supabase
        .from('permissions')
        .select('*')
        .eq('section', section);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Erreur lors de la récupération des permissions:', error);
      return [];
    }
  },

  /**
   * Met à jour une permission
   */
  async updatePermission(permissionId: string, allowed: boolean): Promise<void> {
    try {
      const { error } = await supabase
        .from('permissions')
        .update({ allowed })
        .eq('id', permissionId);

      if (error) throw error;
      clearPermissionCache();
    } catch (error) {
      console.error('Erreur lors de la mise à jour de la permission:', error);
      throw error;
    }
  },

  clearCache: clearPermissionCache,

  /**
   * Détermine le type d'utilisateur basé sur le profil
   */
  getUserIdentifier(profile: {
    is_founder?: boolean;
    is_direction?: boolean;
    is_master_op?: boolean;
    email?: string;
  }): { identifier: UserIdentifier; type: IdentifierType } {
    if (profile.is_founder) return { identifier: 'founder', type: 'badge' };
    if (profile.is_master_op) return { identifier: 'master_op', type: 'badge' };
    if (profile.is_direction) return { identifier: 'direction', type: 'badge' };
    if (profile.email) return { identifier: 'authenticated', type: 'user_type' };
    return { identifier: 'guest', type: 'user_type' };
  },

  /**
   * Vérifie si un utilisateur peut accéder au panneau admin
   */
  async canAccessAdmin(userIdentifier: UserIdentifier, identifierType: IdentifierType): Promise<boolean> {
    return this.hasPermission(userIdentifier, identifierType, 'admin', 'access_panel');
  },

  /**
   * Vérifie si un utilisateur peut gérer les permissions
   */
  async canManagePermissions(userIdentifier: UserIdentifier, identifierType: IdentifierType): Promise<boolean> {
    return this.hasPermission(userIdentifier, identifierType, 'admin', 'manage_permissions');
  },

  /**
   * Vérifie si un utilisateur peut bannir d'autres utilisateurs
   */
  async canBanUsers(userIdentifier: UserIdentifier, identifierType: IdentifierType): Promise<boolean> {
    return this.hasPermission(userIdentifier, identifierType, 'moderation', 'ban_users');
  },

  /**
   * Vérifie si un utilisateur peut supprimer n'importe quel message
   */
  async canDeleteAnyMessage(userIdentifier: UserIdentifier, identifierType: IdentifierType): Promise<boolean> {
    return this.hasPermission(userIdentifier, identifierType, 'chat', 'delete_any');
  },

  /**
   * Vérifie si un utilisateur peut créer des salons personnalisés
   */
  async canCreateCustomSalons(userIdentifier: UserIdentifier, identifierType: IdentifierType): Promise<boolean> {
    return this.hasPermission(userIdentifier, identifierType, 'salons', 'create_custom');
  },

  /**
   * Vérifie si un utilisateur peut attribuer des badges spéciaux
   */
  async canAssignSpecialBadges(userIdentifier: UserIdentifier, identifierType: IdentifierType): Promise<boolean> {
    return this.hasPermission(userIdentifier, identifierType, 'badges', 'assign_special');
  },
};
