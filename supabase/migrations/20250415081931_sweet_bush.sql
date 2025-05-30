/*
  # Add preferences column to user_preferences table

  1. Changes
    - Add JSONB preferences column to user_preferences table
    - Set default preferences value
    - Add migration to handle existing rows
*/

-- Add preferences column if it doesn't exist
ALTER TABLE user_preferences
ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{"itemsPerPage": 6}'::jsonb;

-- Update existing rows to have default preferences if they don't already
UPDATE user_preferences
SET preferences = '{"itemsPerPage": 6}'::jsonb
WHERE preferences IS NULL;

-- Add comment to explain the column
COMMENT ON COLUMN user_preferences.preferences IS 'User preferences stored as JSONB, including itemsPerPage and other settings';