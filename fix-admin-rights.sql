-- Fix admin rights for the creator
-- Run this in your Supabase SQL editor

-- Replace 'your-email@example.com' with your actual email
UPDATE profiles 
SET is_founder = TRUE 
WHERE email = 'virtuelst34@gmail.com';

-- Alternative: Update by user ID if you know it
-- UPDATE profiles 
-- SET is_founder = TRUE 
-- WHERE id = 'your-user-id-here';

-- Verify the update
SELECT id, name, email, is_founder, is_direction, is_master_op 
FROM profiles 
WHERE email = 'virtuelst34@gmail.com';
