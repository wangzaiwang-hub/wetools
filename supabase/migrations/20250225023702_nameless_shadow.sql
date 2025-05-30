/*
  # Initial Schema Setup for WE Tools

  1. New Tables
    - `software`
      - Basic software information
      - Download links and images
      - Category and rating data
    - `categories`
      - Software categories
    - `user_ratings`
      - User ratings and feedback
    - `user_preferences`
      - User preferences like rating popup status

  2. Security
    - Enable RLS on all tables
    - Add policies for public read access
    - Add admin-only write access for software and categories
    - Add authenticated user access for ratings and preferences
*/

-- Create categories table
CREATE TABLE categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create software table
CREATE TABLE software (
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

-- Create user ratings table
CREATE TABLE user_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  software_id uuid REFERENCES software(id),
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, software_id)
);

-- Create user preferences table
CREATE TABLE user_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) UNIQUE,
  has_rated boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

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
  USING (auth.jwt() ->> 'email' = current_setting('app.admin_email'));

-- Policies for software
CREATE POLICY "Allow public read access" ON software
  FOR SELECT TO public USING (true);

CREATE POLICY "Allow admin write access" ON software
  FOR ALL TO authenticated
  USING (auth.jwt() ->> 'email' = current_setting('app.admin_email'));

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

-- Set admin email
SELECT set_config('app.admin_email', 'admin@wetools.com', false);

-- Insert some initial categories
INSERT INTO categories (name, slug) VALUES
  ('开发工具', 'development'),
  ('设计工具', 'design'),
  ('效率工具', 'productivity'),
  ('系统工具', 'system'),
  ('多媒体工具', 'multimedia');