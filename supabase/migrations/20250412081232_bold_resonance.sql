/*
  # Fix website stars table and functions

  1. Changes
    - Drop and recreate website_stars table with correct columns
    - Add website_id column and foreign key constraint
    - Update RLS policies
    - Remove get_website_star_counts function as it's not needed (using direct count query instead)

  2. Security
    - Enable RLS on website_stars table
    - Add policies for authenticated users to manage their own stars
    - Allow public read access to star counts
*/

-- Drop existing table and its dependencies
DROP TABLE IF EXISTS public.website_stars CASCADE;

-- Recreate website_stars table with correct structure
CREATE TABLE public.website_stars (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  website_id uuid REFERENCES websites(id) NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, website_id)
);

-- Enable RLS
ALTER TABLE public.website_stars ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can star websites"
  ON public.website_stars
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove their stars"
  ON public.website_stars
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Everyone can view website stars"
  ON public.website_stars
  FOR SELECT TO public
  USING (true);