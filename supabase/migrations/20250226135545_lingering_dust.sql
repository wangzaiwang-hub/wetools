/*
  # Add function to get software star counts

  1. New Functions
    - `get_software_star_counts`: Returns star counts for all software

  2. Changes
    - Adds a PostgreSQL function to efficiently get star counts
*/

-- Create function to get star counts for all software
CREATE OR REPLACE FUNCTION get_software_star_counts()
RETURNS TABLE (
  software_id uuid,
  star_count bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    COUNT(us.id)::bigint
  FROM software s
  LEFT JOIN user_stars us ON s.id = us.software_id
  GROUP BY s.id;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER;

-- Grant access to the function
GRANT EXECUTE ON FUNCTION get_software_star_counts() TO authenticated, anon;