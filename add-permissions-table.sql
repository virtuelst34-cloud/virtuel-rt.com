-- Create permissions table for role-based access control
-- Run this in your Supabase SQL editor

-- Drop existing table if it exists (to handle schema changes)
DROP TABLE IF EXISTS permissions CASCADE;

-- Create permissions table
CREATE TABLE permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section VARCHAR(50) NOT NULL, -- e.g., 'chat', 'moderation', 'admin', 'settings'
  action VARCHAR(50) NOT NULL, -- e.g., 'read', 'write', 'delete', 'manage'
  user_identifier VARCHAR(50) NOT NULL, -- e.g., 'guest', 'authenticated', 'founder', 'direction', 'master_op', 'vip', 'moderator'
  identifier_type VARCHAR(20) NOT NULL DEFAULT 'badge', -- 'user_type' or 'badge'
  allowed BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_permissions_section ON permissions(section);
CREATE INDEX IF NOT EXISTS idx_permissions_identifier ON permissions(user_identifier);
CREATE INDEX IF NOT EXISTS idx_permissions_section_action ON permissions(section, action);

-- Enable RLS on permissions table
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Founders can manage permissions" ON permissions;
DROP POLICY IF EXISTS "Authenticated users can read permissions" ON permissions;

-- Policy: Only founders can manage permissions
CREATE POLICY "Founders can manage permissions"
ON permissions
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid()::text 
    AND profiles.is_founder = TRUE
  )
);

-- Policy: Authenticated users can read permissions
CREATE POLICY "Authenticated users can read permissions"
ON permissions
FOR SELECT
USING (auth.role() = 'authenticated');

-- Insert default permissions
INSERT INTO permissions (section, action, user_identifier, identifier_type, allowed) VALUES
-- Chat permissions - User types
('chat', 'read', 'guest', 'user_type', TRUE),
('chat', 'write', 'guest', 'user_type', TRUE),
('chat', 'delete_own', 'guest', 'user_type', FALSE),
('chat', 'delete_any', 'guest', 'user_type', FALSE),
('chat', 'read', 'authenticated', 'user_type', TRUE),
('chat', 'write', 'authenticated', 'user_type', TRUE),
('chat', 'delete_own', 'authenticated', 'user_type', TRUE),
('chat', 'delete_any', 'authenticated', 'user_type', FALSE),

-- Chat permissions - Special badges
('chat', 'read', 'founder', 'badge', TRUE),
('chat', 'write', 'founder', 'badge', TRUE),
('chat', 'delete_own', 'founder', 'badge', TRUE),
('chat', 'delete_any', 'founder', 'badge', TRUE),
('chat', 'read', 'direction', 'badge', TRUE),
('chat', 'write', 'direction', 'badge', TRUE),
('chat', 'delete_own', 'direction', 'badge', TRUE),
('chat', 'delete_any', 'direction', 'badge', TRUE),
('chat', 'read', 'master_op', 'badge', TRUE),
('chat', 'write', 'master_op', 'badge', TRUE),
('chat', 'delete_own', 'master_op', 'badge', TRUE),
('chat', 'delete_any', 'master_op', 'badge', TRUE),
('chat', 'read', 'moderator', 'badge', TRUE),
('chat', 'write', 'moderator', 'badge', TRUE),
('chat', 'delete_own', 'moderator', 'badge', TRUE),
('chat', 'delete_any', 'moderator', 'badge', FALSE),
('chat', 'read', 'vip', 'badge', TRUE),
('chat', 'write', 'vip', 'badge', TRUE),
('chat', 'delete_own', 'vip', 'badge', TRUE),
('chat', 'delete_any', 'vip', 'badge', FALSE),

-- Moderation permissions - Special badges only
('moderation', 'view_reports', 'founder', 'badge', TRUE),
('moderation', 'view_reports', 'direction', 'badge', TRUE),
('moderation', 'view_reports', 'master_op', 'badge', TRUE),
('moderation', 'view_reports', 'moderator', 'badge', TRUE),
('moderation', 'ban_users', 'founder', 'badge', TRUE),
('moderation', 'ban_users', 'direction', 'badge', TRUE),
('moderation', 'ban_users', 'master_op', 'badge', TRUE),
('moderation', 'ban_users', 'moderator', 'badge', TRUE),
('moderation', 'mute_users', 'founder', 'badge', TRUE),
('moderation', 'mute_users', 'direction', 'badge', TRUE),
('moderation', 'mute_users', 'master_op', 'badge', TRUE),
('moderation', 'mute_users', 'moderator', 'badge', TRUE),
('moderation', 'unblock_users', 'founder', 'badge', TRUE),
('moderation', 'unblock_users', 'direction', 'badge', TRUE),
('moderation', 'unblock_users', 'master_op', 'badge', TRUE),
('moderation', 'unblock_users', 'moderator', 'badge', TRUE),

-- Admin permissions - Special badges only
('admin', 'access_panel', 'founder', 'badge', TRUE),
('admin', 'access_panel', 'direction', 'badge', TRUE),
('admin', 'access_panel', 'master_op', 'badge', TRUE),
('admin', 'manage_permissions', 'founder', 'badge', TRUE),
('admin', 'manage_permissions', 'direction', 'badge', TRUE),
('admin', 'manage_permissions', 'master_op', 'badge', FALSE),
('admin', 'view_analytics', 'founder', 'badge', TRUE),
('admin', 'view_analytics', 'direction', 'badge', TRUE),
('admin', 'view_analytics', 'master_op', 'badge', TRUE),

-- Settings permissions - User types + Special badges
('settings', 'view_own', 'guest', 'user_type', TRUE),
('settings', 'view_own', 'authenticated', 'user_type', TRUE),
('settings', 'view_own', 'founder', 'badge', TRUE),
('settings', 'view_own', 'direction', 'badge', TRUE),
('settings', 'view_own', 'master_op', 'badge', TRUE),
('settings', 'view_own', 'moderator', 'badge', TRUE),
('settings', 'view_own', 'vip', 'badge', TRUE),
('settings', 'edit_own', 'guest', 'user_type', TRUE),
('settings', 'edit_own', 'authenticated', 'user_type', TRUE),
('settings', 'edit_own', 'founder', 'badge', TRUE),
('settings', 'edit_own', 'direction', 'badge', TRUE),
('settings', 'edit_own', 'master_op', 'badge', TRUE),
('settings', 'edit_own', 'moderator', 'badge', TRUE),
('settings', 'edit_own', 'vip', 'badge', TRUE),
('settings', 'edit_any', 'founder', 'badge', TRUE),
('settings', 'edit_any', 'direction', 'badge', TRUE),
('settings', 'edit_any', 'master_op', 'badge', FALSE),
('settings', 'edit_any', 'moderator', 'badge', FALSE),
('settings', 'edit_any', 'vip', 'badge', FALSE),

-- Salons permissions - User types + Special badges
('salons', 'view_all', 'guest', 'user_type', TRUE),
('salons', 'view_all', 'authenticated', 'user_type', TRUE),
('salons', 'view_all', 'founder', 'badge', TRUE),
('salons', 'view_all', 'direction', 'badge', TRUE),
('salons', 'view_all', 'master_op', 'badge', TRUE),
('salons', 'view_all', 'moderator', 'badge', TRUE),
('salons', 'view_all', 'vip', 'badge', TRUE),
('salons', 'create_custom', 'authenticated', 'user_type', TRUE),
('salons', 'create_custom', 'founder', 'badge', TRUE),
('salons', 'create_custom', 'direction', 'badge', TRUE),
('salons', 'create_custom', 'master_op', 'badge', TRUE),
('salons', 'create_custom', 'moderator', 'badge', TRUE),
('salons', 'create_custom', 'vip', 'badge', TRUE),
('salons', 'delete_custom', 'founder', 'badge', TRUE),
('salons', 'delete_custom', 'direction', 'badge', TRUE),
('salons', 'delete_custom', 'master_op', 'badge', TRUE),
('salons', 'delete_custom', 'moderator', 'badge', FALSE),
('salons', 'delete_custom', 'vip', 'badge', FALSE),

-- Badges permissions - Special badges only
('badges', 'view_all', 'guest', 'user_type', TRUE),
('badges', 'view_all', 'authenticated', 'user_type', TRUE),
('badges', 'view_all', 'founder', 'badge', TRUE),
('badges', 'view_all', 'direction', 'badge', TRUE),
('badges', 'view_all', 'master_op', 'badge', TRUE),
('badges', 'view_all', 'moderator', 'badge', TRUE),
('badges', 'view_all', 'vip', 'badge', TRUE),
('badges', 'assign_special', 'founder', 'badge', TRUE),
('badges', 'assign_special', 'direction', 'badge', TRUE),
('badges', 'assign_special', 'master_op', 'badge', FALSE),
('badges', 'assign_special', 'moderator', 'badge', FALSE),
('badges', 'assign_special', 'vip', 'badge', FALSE),

-- XP permissions - User types + Special badges
('xp', 'view_own', 'guest', 'user_type', TRUE),
('xp', 'view_own', 'authenticated', 'user_type', TRUE),
('xp', 'view_own', 'founder', 'badge', TRUE),
('xp', 'view_own', 'direction', 'badge', TRUE),
('xp', 'view_own', 'master_op', 'badge', TRUE),
('xp', 'view_own', 'moderator', 'badge', TRUE),
('xp', 'view_own', 'vip', 'badge', TRUE),
('xp', 'view_all', 'founder', 'badge', TRUE),
('xp', 'view_all', 'direction', 'badge', TRUE),
('xp', 'view_all', 'master_op', 'badge', TRUE),
('xp', 'view_all', 'moderator', 'badge', FALSE),
('xp', 'view_all', 'vip', 'badge', FALSE),
('xp', 'modify_any', 'founder', 'badge', TRUE),
('xp', 'modify_any', 'direction', 'badge', TRUE),
('xp', 'modify_any', 'master_op', 'badge', FALSE),
('xp', 'modify_any', 'moderator', 'badge', FALSE),
('xp', 'modify_any', 'vip', 'badge', FALSE)

ON CONFLICT DO NOTHING;
