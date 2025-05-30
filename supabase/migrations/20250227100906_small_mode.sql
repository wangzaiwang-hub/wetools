/*
  # Add pagination support

  1. Create index on software table
    - Add index on created_at for better performance with pagination
  
  2. Add function for paginated software query
    - Create a function that returns paginated software with filters
*/

-- Add index for better pagination performance
CREATE INDEX IF NOT EXISTS software_created_at_idx ON software (created_at DESC);

-- Create function for paginated software query
CREATE OR REPLACE FUNCTION get_paginated_software(
  page_number integer DEFAULT 1,
  items_per_page integer DEFAULT 6,
  category_id_param uuid DEFAULT NULL,
  os_id_param uuid DEFAULT NULL,
  search_term text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  name text,
  description text,
  category_id uuid,
  os_id uuid,
  icon_url text,
  screenshots jsonb,
  direct_download_url text,
  cloud_download_url text,
  is_recommended boolean,
  created_at timestamptz,
  updated_at timestamptz,
  category_name text,
  os_name text,
  star_count bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.name,
    s.description,
    s.category_id,
    s.os_id,
    s.icon_url,
    s.screenshots,
    s.direct_download_url,
    s.cloud_download_url,
    s.is_recommended,
    s.created_at,
    s.updated_at,
    c.name as category_name,
    os.name as os_name,
    COALESCE(COUNT(us.id), 0)::bigint as star_count
  FROM software s
  LEFT JOIN categories c ON s.category_id = c.id
  LEFT JOIN operating_systems os ON s.os_id = os.id
  LEFT JOIN user_stars us ON s.id = us.software_id
  WHERE 
    (category_id_param IS NULL OR s.category_id = category_id_param) AND
    (os_id_param IS NULL OR s.os_id = os_id_param) AND
    (search_term IS NULL OR 
      s.name ILIKE '%' || search_term || '%' OR 
      s.description ILIKE '%' || search_term || '%')
  GROUP BY s.id, c.name, os.name
  ORDER BY s.created_at DESC
  LIMIT items_per_page
  OFFSET (page_number - 1) * items_per_page;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER;

-- Create function to count total software with filters
CREATE OR REPLACE FUNCTION count_filtered_software(
  category_id_param uuid DEFAULT NULL,
  os_id_param uuid DEFAULT NULL,
  search_term text DEFAULT NULL
)
RETURNS integer AS $$
DECLARE
  total_count integer;
BEGIN
  SELECT COUNT(*)
  INTO total_count
  FROM software s
  WHERE 
    (category_id_param IS NULL OR s.category_id = category_id_param) AND
    (os_id_param IS NULL OR s.os_id = os_id_param) AND
    (search_term IS NULL OR 
      s.name ILIKE '%' || search_term || '%' OR 
      s.description ILIKE '%' || search_term || '%');
  
  RETURN total_count;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER;

-- Grant access to the functions
GRANT EXECUTE ON FUNCTION get_paginated_software(integer, integer, uuid, uuid, text) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION count_filtered_software(uuid, uuid, text) TO authenticated, anon;