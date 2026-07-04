-- Fix RLS policies for messages table
-- Run this in your Supabase SQL editor

-- Enable RLS on messages table
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can insert messages" ON messages;
DROP POLICY IF EXISTS "Users can view messages" ON messages;
DROP POLICY IF EXISTS "Users can delete own messages" ON messages;
DROP POLICY IF EXISTS "Users can update own messages" ON messages;

-- Policy: Allow authenticated users to insert messages
CREATE POLICY "Users can insert messages"
ON messages
FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

-- Policy: Allow authenticated users to view messages
CREATE POLICY "Users can view messages"
ON messages
FOR SELECT
USING (auth.role() = 'authenticated');

-- Policy: Allow users to delete their own messages
CREATE POLICY "Users can delete own messages"
ON messages
FOR DELETE
USING (
  auth.role() = 'authenticated'
  AND author_name = (SELECT name::text FROM profiles WHERE id = auth.uid()::text)
);

-- Policy: Allow users to update their own messages
CREATE POLICY "Users can update own messages"
ON messages
FOR UPDATE
USING (
  auth.role() = 'authenticated'
  AND author_name = (SELECT name::text FROM profiles WHERE id = auth.uid()::text)
);
