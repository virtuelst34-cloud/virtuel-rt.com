-- Fix RLS policies for profiles table
-- Run this in your Supabase SQL editor

-- Add missing columns to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS email_confirmed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS is_founder BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_direction BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_master_op BOOLEAN DEFAULT FALSE;

-- Enable RLS on profiles table
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Authenticated users can view all profiles" ON profiles;

-- Policy: Allow users to insert their own profile
CREATE POLICY "Users can insert their own profile"
ON profiles
FOR INSERT
WITH CHECK (auth.uid()::text = id::text);

-- Policy: Allow users to view their own profile
CREATE POLICY "Users can view own profile"
ON profiles
FOR SELECT
USING (auth.uid()::text = id::text);

-- Policy: Allow users to update their own profile
CREATE POLICY "Users can update own profile"
ON profiles
FOR UPDATE
USING (auth.uid()::text = id::text)
WITH CHECK (auth.uid()::text = id::text);

-- Policy: Allow authenticated users to view all profiles (for chat functionality)
CREATE POLICY "Authenticated users can view all profiles"
ON profiles
FOR SELECT
USING (auth.role() = 'authenticated');

-- Alternative: Create a trigger to automatically create profile on signup
-- This is a more robust solution that doesn't require RLS policies for inserts

-- First, create a function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if profile already exists
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.id::text) THEN
    INSERT INTO public.profiles (id, name, avatar, initials, status, level, xp, is_premium, email, email_confirmed_at)
    VALUES (
      NEW.id::text,
      'User',
      'av1',
      'US',
      'online',
      1,
      0,
      false,
      NEW.email,
      NEW.email_confirmed_at
    );
  END IF;
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the auth operation
    RAISE LOG 'Error creating profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger that calls the function on new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Note: If you use the trigger approach, you can remove the RLS insert policy
-- DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;

