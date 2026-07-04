-- Add special badge columns to profiles table
-- Run this in your Supabase SQL editor

-- Add columns for special badges
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS is_founder BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_direction BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_master_op BOOLEAN DEFAULT FALSE;

-- Add comments to document the columns
COMMENT ON COLUMN profiles.is_founder IS 'Founder badge - for the creator of the platform';
COMMENT ON COLUMN profiles.is_direction IS 'Direction badge - for users with full site access';
COMMENT ON COLUMN profiles.is_master_op IS 'Master OP badge - for users who direct moderators';

-- Optional: Set the founder badge for a specific user (replace with actual user ID)
-- UPDATE profiles SET is_founder = TRUE WHERE id = 'your-user-id-here';
