/*
  # Create verification codes table

  1. New Tables
    - `verification_codes`
      - `id` (uuid, primary key)
      - `email` (text, not null)
      - `code` (text, not null)
      - `expires_at` (timestamptz, not null)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on `verification_codes` table
    - Add policy for public access (since verification is pre-auth)
*/

CREATE TABLE IF NOT EXISTS verification_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  code text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE verification_codes ENABLE ROW LEVEL SECURITY;

-- Allow public access since verification happens before authentication
CREATE POLICY "Allow public access to verification codes"
  ON verification_codes
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);