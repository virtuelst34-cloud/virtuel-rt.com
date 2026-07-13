import { useCallback } from 'react';
import { useUser } from '@/lib/contexts/UserContext';
import {
  permissionsService,
  PermissionSection,
  PermissionAction,
  UserIdentifier,
  IdentifierType,
} from '@/lib/permissions';
import { badgesFromProfile } from '@/lib/utils/profileBadges';

function resolveIdentifiers(
  user: ReturnType<typeof useUser>['user'],
  supabaseUser: ReturnType<typeof useUser>['supabaseUser'],
) {
  const ids: Array<{ id: UserIdentifier; type: IdentifierType }> = [];

  if (supabaseUser) {
    ids.push({ id: 'authenticated', type: 'user_type' });
    for (const badge of badgesFromProfile(supabaseUser)) {
      if (['founder', 'direction', 'master_op', 'moderator', 'vip'].includes(badge)) {
        ids.push({ id: badge as UserIdentifier, type: 'badge' });
      }
    }
  } else if (user) {
    ids.push({ id: 'guest', type: 'user_type' });
  } else {
    ids.push({ id: 'guest', type: 'user_type' });
  }

  return ids;
}

export function usePermissions() {
  const { user, supabaseUser } = useUser();

  const isAdmin = !!(user?.isAdmin || user?.isFounder || supabaseUser?.is_admin || supabaseUser?.is_founder);

  const can = useCallback(
    async (section: PermissionSection, action: PermissionAction): Promise<boolean> => {
      if (isAdmin) return true;
      const identifiers = resolveIdentifiers(user, supabaseUser);
      for (const { id, type } of identifiers) {
        const allowed = await permissionsService.hasPermission(id, type, section, action);
        if (allowed) return true;
      }
      return false;
    },
    [user, supabaseUser, isAdmin],
  );

  return { can, isAdmin };
}
