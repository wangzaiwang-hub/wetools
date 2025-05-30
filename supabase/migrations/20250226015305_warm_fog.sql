/*
  # Database Schema and Security Setup

  1. Tables
    - Categories for software classification
    - Software entries with metadata
    - User ratings system
    - User preferences for personalization
  
  2. Security
    - Row Level Security (RLS) enabled for all tables
    - Public read access where appropriate
    - Protected write access for authenticated users
    - Admin-only access for sensitive operations
*/

-- Create categories table if not exists
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create software table if not exists
CREATE TABLE IF NOT EXISTS software (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL,
  category_id uuid REFERENCES categories(id),
  icon_url text NOT NULL,
  screenshots jsonb NOT NULL DEFAULT '[]'::jsonb,
  direct_download_url text,
  cloud_download_url text,
  star_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT must_have_one_download_url CHECK (
    (direct_download_url IS NOT NULL) OR (cloud_download_url IS NOT NULL)
  )
);

-- Create user ratings table if not exists
CREATE TABLE IF NOT EXISTS user_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  software_id uuid REFERENCES software(id),
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, software_id)
);

-- Create user preferences table if not exists
CREATE TABLE IF NOT EXISTS user_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) UNIQUE,
  has_rated boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Drop existing policies if they exist
DO $$ 
BEGIN
  -- Drop policies for categories
  DROP POLICY IF EXISTS "Allow public read access" ON categories;
  DROP POLICY IF EXISTS "Allow admin write access" ON categories;
  
  -- Drop policies for software
  DROP POLICY IF EXISTS "Allow public read access" ON software;
  DROP POLICY IF EXISTS "Allow admin write access" ON software;
  
  -- Drop policies for user ratings
  DROP POLICY IF EXISTS "Allow users to rate once" ON user_ratings;
  DROP POLICY IF EXISTS "Allow users to read all ratings" ON user_ratings;
  
  -- Drop policies for user preferences
  DROP POLICY IF EXISTS "Allow users to manage their preferences" ON user_preferences;
END $$;

-- Enable RLS
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE software ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- Policies for categories
CREATE POLICY "Allow public read access" ON categories
  FOR SELECT TO public USING (true);

CREATE POLICY "Allow admin write access" ON categories
  FOR ALL TO authenticated
  USING (auth.jwt() ->> 'email' = 'wangzaiwang@wetools.com');

-- Policies for software
CREATE POLICY "Allow public read access" ON software
  FOR SELECT TO public USING (true);

CREATE POLICY "Allow admin write access" ON software
  FOR ALL TO authenticated
  USING (auth.jwt() ->> 'email' = 'wangzaiwang@wetools.com');

-- Policies for user ratings
CREATE POLICY "Allow users to rate once" ON user_ratings
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow users to read all ratings" ON user_ratings
  FOR SELECT TO public USING (true);

-- Policies for user preferences
CREATE POLICY "Allow users to manage their preferences" ON user_preferences
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Insert initial categories if they don't exist
INSERT INTO categories (name, slug)
SELECT name, slug
FROM (VALUES
  ('开发工具', 'development'),
  ('设计工具', 'design'),
  ('效率工具', 'productivity'),
  ('系统工具', 'system'),
  ('多媒体工具', 'multimedia')
) AS new_categories(name, slug)
WHERE NOT EXISTS (
  SELECT 1 FROM categories WHERE slug = new_categories.slug
);