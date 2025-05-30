/*
  # Fix software stats view

  1. Changes
    - Drop existing view if it exists
    - Create new view for software stats
    - Add policies for accessing the view
    - Add trigger for real-time updates

  2. Security
    - Add policies for public read access
*/

-- Drop existing view if it exists
DROP VIEW IF EXISTS software_stats;

-- Create view for software stats
CREATE OR REPLACE VIEW software_stats AS
SELECT 
  software.id as software_id,
  COALESCE(COUNT(user_stars.id), 0) as star_count
FROM software
LEFT JOIN user_stars ON software.id = user_stars.software_id
GROUP BY software.id;

-- Create function to notify clients of changes
CREATE OR REPLACE FUNCTION notify_software_stats_change()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM pg_notify(
    'software_stats_change',
    json_build_object(
      'software_id', COALESCE(NEW.software_id, OLD.software_id),
      'operation', TG_OP
    )::text
  );
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create triggers to notify on changes
DROP TRIGGER IF EXISTS notify_software_stats_change ON user_stars;
CREATE TRIGGER notify_software_stats_change
  AFTER INSERT OR DELETE OR UPDATE ON user_stars
  FOR EACH ROW
  EXECUTE FUNCTION notify_software_stats_change();

-- Grant access to the view
GRANT SELECT ON software_stats TO authenticated, anon;