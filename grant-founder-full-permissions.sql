-- Accorder toutes les permissions au badge fondateur (founder)
-- Cela permet au fondateur d'avoir accès à toutes les fonctionnalités du panneau admin

-- Supprimer les permissions existantes pour le founder
DELETE FROM public.permissions 
WHERE user_identifier = 'founder' 
AND identifier_type = 'badge';

-- Insérer toutes les permissions pour le founder
INSERT INTO public.permissions (section, action, user_identifier, identifier_type, allowed) VALUES
-- Permissions Chat
('chat', 'read', 'founder', 'badge', true),
('chat', 'write', 'founder', 'badge', true),
('chat', 'delete_own', 'founder', 'badge', true),
('chat', 'delete_any', 'founder', 'badge', true),

-- Permissions Moderation
('moderation', 'view_reports', 'founder', 'badge', true),
('moderation', 'ban_users', 'founder', 'badge', true),
('moderation', 'mute_users', 'founder', 'badge', true),
('moderation', 'unblock_users', 'founder', 'badge', true),

-- Permissions Admin
('admin', 'access_panel', 'founder', 'badge', true),
('admin', 'manage_permissions', 'founder', 'badge', true),
('admin', 'view_analytics', 'founder', 'badge', true),

-- Permissions Settings
('settings', 'view_own', 'founder', 'badge', true),
('settings', 'edit_own', 'founder', 'badge', true),
('settings', 'edit_any', 'founder', 'badge', true),
('settings', 'view_all', 'founder', 'badge', true),

-- Permissions Salons
('salons', 'read', 'founder', 'badge', true),
('salons', 'write', 'founder', 'badge', true),
('salons', 'delete_own', 'founder', 'badge', true),
('salons', 'delete_any', 'founder', 'badge', true),
('salons', 'create_custom', 'founder', 'badge', true),
('salons', 'delete_custom', 'founder', 'badge', true),

-- Permissions Badges
('badges', 'read', 'founder', 'badge', true),
('badges', 'write', 'founder', 'badge', true),
('badges', 'delete_own', 'founder', 'badge', true),
('badges', 'delete_any', 'founder', 'badge', true),
('badges', 'view_all_badges', 'founder', 'badge', true),
('badges', 'assign_special', 'founder', 'badge', true),

-- Permissions XP
('xp', 'view_own_xp', 'founder', 'badge', true),
('xp', 'view_all_xp', 'founder', 'badge', true),
('xp', 'modify_any_xp', 'founder', 'badge', true);

-- Vérifier les permissions créées
SELECT * FROM public.permissions 
WHERE user_identifier = 'founder' 
AND identifier_type = 'badge'
ORDER BY section, action;
