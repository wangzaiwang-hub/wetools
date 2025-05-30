/*
  # Fix user stars table and functions

  1. Changes
    - Recreate user_stars table with proper constraints
    - Add RLS policies for user_stars
    - Create function for getting star count

  2. Security
    - Enable RLS on user_stars table
    - Add policies for insert, select, and delete operations
    - Set function as SECURITY DEFINER for safe execution
*/

-- Drop existing user_stars table and related objects
DROP TABLE IF EXISTS user_stars CASCADE;

-- Recreate user_stars table
CREATE TABLE user_stars (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  software_id uuid REFERENCES software(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, software_id)
);

-- Enable RLS
ALTER TABLE user_stars ENABLE ROW LEVEL SECURITY;

-- Create policies for user_stars
CREATE POLICY "Users can star software"
  ON user_stars
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view all stars"
  ON user_stars
  FOR SELECT TO public
  USING (true);

CREATE POLICY "Users can remove their own stars"
  ON user_stars
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Create function to get star count for a specific software
CREATE OR REPLACE FUNCTION get_software_star_count(software_id_param uuid)
RETURNS bigint AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)
    FROM user_stars
    WHERE software_id = software_id_param
  );
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER;

-- Grant access to the function
GRANT EXECUTE ON FUNCTION get_software_star_count(uuid) TO authenticated, anon;