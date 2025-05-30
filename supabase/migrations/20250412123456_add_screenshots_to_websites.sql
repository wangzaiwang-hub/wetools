/*
  # Add screenshots field to websites table

  1. Updates:
    - Add screenshots jsonb field to websites table
*/

-- Add screenshots field to websites table if it doesn't exist
ALTER TABLE websites
ADD COLUMN IF NOT EXISTS screenshots jsonb DEFAULT '[]'::jsonb; 