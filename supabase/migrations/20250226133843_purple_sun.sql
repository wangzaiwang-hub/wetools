/*
  # Update star system

  1. Changes
    - Add user_stars table for tracking user stars
    - Add RLS policies for star management
    - Remove star_count from software table
    - Add view for calculating total stars

  2. Security
    - Enable RLS on user_stars table
    - Add policies for authenticated users
*/

-- Create user_stars table
CREATE TABLE user_stars (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  software_id uuid REFERENCES software(id) NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, software_id)
);

-- Enable RLS
ALTER TABLE user_stars ENABLE ROW LEVEL SECURITY;

-- Create policies for user_stars
CREATE POLICY "Users can star once"
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

-- Create view for star counts
CREATE OR REPLACE VIEW software_stats AS
SELECT 
  s.id as software_id,
  COUNT(us.id) as star_count
FROM software s
LEFT JOIN user_stars us ON s.id = us.software_id
GROUP BY s.id;

-- Remove star_count column from software table
ALTER TABLE software DROP COLUMN IF EXISTS star_count;