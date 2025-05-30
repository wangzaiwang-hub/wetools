/*
  # Add sample software data
  
  1. New Data
    - Add sample software entries with icons and screenshots
    - Use real, accessible image URLs
    - Add star counts and download links
*/

-- Insert sample software
INSERT INTO software (name, description, category_id, icon_url, screenshots, direct_download_url, star_count)
SELECT 
  'uTools 团队版',
  'uTools 团队版一键配置，全团队共享 团队专属插件应用，提升团队效率',
  categories.id,
  'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=128&h=128&fit=crop',
  jsonb_build_array(
    'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=1920&h=1080',
    'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1920&h=1080',
    'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1920&h=1080'
  ),
  'https://download.example.com/utools-team.exe',
  128
FROM categories 
WHERE slug = 'productivity'
AND NOT EXISTS (
  SELECT 1 FROM software WHERE name = 'uTools 团队版'
);

-- Insert more sample software
INSERT INTO software (name, description, category_id, icon_url, screenshots, cloud_download_url, star_count)
SELECT 
  'Visual Studio Code',
  '轻量级但功能强大的源代码编辑器，支持多种编程语言和扩展',
  categories.id,
  'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=128&h=128&fit=crop',
  jsonb_build_array(
    'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=1920&h=1080',
    'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1920&h=1080'
  ),
  'https://cloud.example.com/vscode',
  256
FROM categories 
WHERE slug = 'development'
AND NOT EXISTS (
  SELECT 1 FROM software WHERE name = 'Visual Studio Code'
);