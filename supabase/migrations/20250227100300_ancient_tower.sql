/*
  # Add is_recommended field to software table

  1. Changes
    - Add `is_recommended` boolean column to the software table with default value of false
    - This allows admins to mark certain software as recommended for the editor's picks section

  2. Security
    - No changes to existing security policies
*/

-- Add is_recommended column to software table
ALTER TABLE software
ADD COLUMN IF NOT EXISTS is_recommended boolean DEFAULT false;