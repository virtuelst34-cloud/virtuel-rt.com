import { describe, it, expect, beforeEach, vi } from 'vitest';
import { permissionsService, UserIdentifier, IdentifierType, PermissionSection, PermissionAction } from '@/lib/permissions';

// Mock Supabase client
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn()
              }))
            }))
          }))
        }))
      }))
    })),
  }
}));

describe('permissionsService', () => {
  beforeEach(() => {
    // Clear cache before each test
    permissionsService.clearCache();
  });

  describe('hasPermission', () => {
    it('should return true when permission is allowed', async () => {
      const { supabase } = await import('@/lib/supabase');
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({ data: { allowed: true }, error: null })
                })
              })
            })
          })
        })
      } as any);

      const result = await permissionsService.hasPermission(
        'founder' as UserIdentifier,
        'badge' as IdentifierType,
        'admin' as PermissionSection,
        'access_panel' as PermissionAction
      );

      expect(result).toBe(true);
    });

    it('should return false when permission is not allowed', async () => {
      const { supabase } = await import('@/lib/supabase');
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({ data: { allowed: false }, error: null })
                })
              })
            })
          })
        })
      } as any);

      const result = await permissionsService.hasPermission(
        'guest' as UserIdentifier,
        'user_type' as IdentifierType,
        'admin' as PermissionSection,
        'access_panel' as PermissionAction
      );

      expect(result).toBe(false);
    });

    it('should return false when permission does not exist', async () => {
      const { supabase } = await import('@/lib/supabase');
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null })
                })
              })
            })
          })
        })
      } as any);

      const result = await permissionsService.hasPermission(
        'guest' as UserIdentifier,
        'user_type' as IdentifierType,
        'admin' as PermissionSection,
        'access_panel' as PermissionAction
      );

      expect(result).toBe(false);
    });

    it('should return false on error', async () => {
      const { supabase } = await import('@/lib/supabase');
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({ data: null, error: new Error('Database error') })
                })
              })
            })
          })
        })
      } as any);

      const result = await permissionsService.hasPermission(
        'founder' as UserIdentifier,
        'badge' as IdentifierType,
        'admin' as PermissionSection,
        'access_panel' as PermissionAction
      );

      expect(result).toBe(false);
    });

    it('should cache permission results', async () => {
      const { supabase } = await import('@/lib/supabase');
      const maybeSingleMock = vi.fn().mockResolvedValue({ data: { allowed: true }, error: null });
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: maybeSingleMock
                })
              })
            })
          })
        })
      } as any);

      // First call
      await permissionsService.hasPermission(
        'founder' as UserIdentifier,
        'badge' as IdentifierType,
        'admin' as PermissionSection,
        'access_panel' as PermissionAction
      );

      // Second call - should use cache
      await permissionsService.hasPermission(
        'founder' as UserIdentifier,
        'badge' as IdentifierType,
        'admin' as PermissionSection,
        'access_panel' as PermissionAction
      );

      expect(maybeSingleMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('getUserIdentifier', () => {
    it('should return founder when is_founder is true', () => {
      const result = permissionsService.getUserIdentifier({ is_founder: true });
      expect(result).toEqual({ identifier: 'founder', type: 'badge' });
    });

    it('should return master_op when is_master_op is true', () => {
      const result = permissionsService.getUserIdentifier({ is_master_op: true });
      expect(result).toEqual({ identifier: 'master_op', type: 'badge' });
    });

    it('should return direction when is_direction is true', () => {
      const result = permissionsService.getUserIdentifier({ is_direction: true });
      expect(result).toEqual({ identifier: 'direction', type: 'badge' });
    });

    it('should return authenticated when email is present', () => {
      const result = permissionsService.getUserIdentifier({ email: 'test@example.com' });
      expect(result).toEqual({ identifier: 'authenticated', type: 'user_type' });
    });

    it('should return guest when no badges or email', () => {
      const result = permissionsService.getUserIdentifier({});
      expect(result).toEqual({ identifier: 'guest', type: 'user_type' });
    });

    it('should prioritize founder over other badges', () => {
      const result = permissionsService.getUserIdentifier({ 
        is_founder: true, 
        is_master_op: true,
        is_direction: true 
      });
      expect(result).toEqual({ identifier: 'founder', type: 'badge' });
    });
  });

  describe('helper functions', () => {
    it('canAccessAdmin should check admin access panel permission', async () => {
      const { supabase } = await import('@/lib/supabase');
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({ data: { allowed: true }, error: null })
                })
              })
            })
          })
        })
      } as any);

      const result = await permissionsService.canAccessAdmin(
        'founder' as UserIdentifier,
        'badge' as IdentifierType
      );

      expect(result).toBe(true);
    });

    it('canBanUsers should check ban_users permission', async () => {
      const { supabase } = await import('@/lib/supabase');
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({ data: { allowed: true }, error: null })
                })
              })
            })
          })
        })
      } as any);

      const result = await permissionsService.canBanUsers(
        'moderator' as UserIdentifier,
        'badge' as IdentifierType
      );

      expect(result).toBe(true);
    });

    it('canDeleteAnyMessage should check delete_any permission', async () => {
      const { supabase } = await import('@/lib/supabase');
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({ data: { allowed: true }, error: null })
                })
              })
            })
          })
        })
      } as any);

      const result = await permissionsService.canDeleteAnyMessage(
        'moderator' as UserIdentifier,
        'badge' as IdentifierType
      );

      expect(result).toBe(true);
    });
  });

  describe('updatePermission', () => {
    it('should clear cache after updating permission', async () => {
      const { supabase } = await import('@/lib/supabase');
      vi.mocked(supabase.from).mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null })
        })
      } as any);

      // Set a cached permission
      const maybeSingleMock = vi.fn().mockResolvedValue({ data: { allowed: true }, error: null });
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: maybeSingleMock
                })
              })
            })
          })
        })
      } as any);

      await permissionsService.hasPermission(
        'founder' as UserIdentifier,
        'badge' as IdentifierType,
        'admin' as PermissionSection,
        'access_panel' as PermissionAction
      );

      // Update permission
      vi.mocked(supabase.from).mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null })
        })
      } as any);

      await permissionsService.updatePermission('test-id', false);

      // Cache should be cleared, so next call should hit database
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: maybeSingleMock
                })
              })
            })
          })
        })
      } as any);

      await permissionsService.hasPermission(
        'founder' as UserIdentifier,
        'badge' as IdentifierType,
        'admin' as PermissionSection,
        'access_panel' as PermissionAction
      );

      expect(maybeSingleMock).toHaveBeenCalledTimes(2);
    });
  });
});
