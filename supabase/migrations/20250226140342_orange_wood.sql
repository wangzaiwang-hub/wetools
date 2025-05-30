/*
  # Add operating system and tag support

  1. New Tables
    - `operating_systems`
      - `id` (uuid, primary key)
      - `name` (text, e.g., "Windows", "macOS", "Linux")
      - `slug` (text, unique)
      - `created_at` (timestamp)
    
    - `tags`
      - `id` (uuid, primary key)
      - `name` (text)
      - `slug` (text, unique)
      - `created_at` (timestamp)
    
    - `software_tags`
      - `software_id` (uuid, references software)
      - `tag_id` (uuid, references tags)
      - Primary key on both columns
      
  2. Changes
    - Add `os_id` to software table
    - Remove partition columns from software table
    
  3. Security
    - Enable RLS on all new tables
    - Add appropriate policies for admin access
*/

-- Create operating_systems table
CREATE TABLE operating_systems (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create tags table
CREATE TABLE tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create software_tags junction table
CREATE TABLE software_tags (
  software_id uuid REFERENCES software(id) ON DELETE CASCADE,
  tag_id uuid REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (software_id, tag_id)
);

-- Add os_id to software table
ALTER TABLE software 
ADD COLUMN os_id uuid REFERENCES operating_systems(id);

-- Remove partition columns
ALTER TABLE software
DROP COLUMN IF EXISTS partition_c,
DROP COLUMN IF EXISTS partition_d,
DROP COLUMN IF EXISTS partition_e,
DROP COLUMN IF EXISTS partition_f;

-- Enable RLS
ALTER TABLE operating_systems ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE software_tags ENABLE ROW LEVEL SECURITY;

-- Policies for operating_systems
CREATE POLICY "Allow public read access to operating systems"
  ON operating_systems FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow admin to manage operating systems"
  ON operating_systems FOR ALL
  TO authenticated
  USING (auth.jwt() ->> 'email' = 'wangzaiwang@wetools.com')
  WITH CHECK (auth.jwt() ->> 'email' = 'wangzaiwang@wetools.com');

-- Policies for tags
CREATE POLICY "Allow public read access to tags"
  ON tags FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow admin to manage tags"
  ON tags FOR ALL
  TO authenticated
  USING (auth.jwt() ->> 'email' = 'wangzaiwang@wetools.com')
  WITH CHECK (auth.jwt() ->> 'email' = 'wangzaiwang@wetools.com');

-- Policies for software_tags
CREATE POLICY "Allow public read access to software tags"
  ON software_tags FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow admin to manage software tags"
  ON software_tags FOR ALL
  TO authenticated
  USING (auth.jwt() ->> 'email' = 'wangzaiwang@wetools.com')
  WITH CHECK (auth.jwt() ->> 'email' = 'wangzaiwang@wetools.com');

-- Insert initial operating systems
INSERT INTO operating_systems (name, slug) VALUES
  ('Windows', 'windows'),
  ('macOS', 'macos'),
  ('Linux', 'linux');