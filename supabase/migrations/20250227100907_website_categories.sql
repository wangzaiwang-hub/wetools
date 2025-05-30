/*
  # Add website categories and websites tables

  1. New Tables
    - `website_categories`
      - `id` (uuid, primary key)
      - `name` (text)
      - `slug` (text, unique)
      - `created_at` (timestamp)
    
    - `websites`
      - `id` (uuid, primary key)
      - `name` (text)
      - `description` (text)
      - `url` (text)
      - `icon_url` (text)
      - `category_id` (uuid, references website_categories)
      - `category_name` (text)
      - `is_recommended` (boolean)
      - `created_at` (timestamp)
      
  2. Security
    - Enable RLS on both tables
    - Add policies for public read access
    - Add admin-only write access
*/

-- Create website_categories table
CREATE TABLE website_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create websites table
CREATE TABLE websites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  url text NOT NULL,
  icon_url text,
  category_id uuid REFERENCES website_categories(id),
  category_name text,
  is_recommended boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE website_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE websites ENABLE ROW LEVEL SECURITY;

-- Policies for website_categories
CREATE POLICY "Allow public read access to website categories"
  ON website_categories FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow admin write access to website categories"
  ON website_categories FOR ALL
  TO authenticated
  USING (auth.jwt() ->> 'email' = 'wangzaiwang@wetools.com');

-- Policies for websites
CREATE POLICY "Allow public read access to websites"
  ON websites FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow admin write access to websites"
  ON websites FOR ALL
  TO authenticated
  USING (auth.jwt() ->> 'email' = 'wangzaiwang@wetools.com');

-- Insert initial website categories
INSERT INTO website_categories (name, slug) VALUES
  ('开发工具', 'development-tools'),
  ('设计资源', 'design-resources'),
  ('学习平台', 'learning-platforms'),
  ('技术社区', 'tech-communities'),
  ('文档资源', 'documentation'),
  ('其他工具', 'other-tools'); 