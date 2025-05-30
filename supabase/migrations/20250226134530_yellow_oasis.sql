/*
  # Add website stars feature

  1. New Tables
    - `website_stars`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `website_stars` table
    - Add policies for authenticated users to star once
    - Add policy for public read access
*/

-- Create website_stars table
CREATE TABLE website_stars (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE website_stars ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can star website once"
  ON website_stars
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND
    NOT EXISTS (
      SELECT 1 FROM website_stars 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can remove their star"
  ON website_stars
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Everyone can view website stars"
  ON website_stars
  FOR SELECT TO public
  USING (true);

-- Create view for website stats
CREATE OR REPLACE VIEW website_stats AS
SELECT COUNT(*) as star_count
FROM website_stars;