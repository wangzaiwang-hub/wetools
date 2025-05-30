/*
  # Fix user preferences RLS policies

  1. Changes
    - Drop existing RLS policy for user_preferences table
    - Create new policies that properly handle all operations
    - Allow authenticated users to manage their own preferences
    - Allow service role to manage all preferences
*/

-- Drop existing policy
DROP POLICY IF EXISTS "Allow users to manage their preferences" ON user_preferences;

-- Create new policies
CREATE POLICY "Allow users to insert their own preferences"
ON user_preferences FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow users to view their own preferences"
ON user_preferences FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Allow users to update their own preferences"
ON user_preferences FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow users to delete their own preferences"
ON user_preferences FOR DELETE TO authenticated
USING (auth.uid() = user_id);

-- Allow service role to bypass RLS
ALTER TABLE user_preferences FORCE ROW LEVEL SECURITY;