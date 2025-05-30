/*
  # Fix storage configuration for software images

  1. Changes
    - Drop and recreate storage bucket with correct configuration
    - Update storage policies for better access control
    - Ensure proper file type restrictions
*/

-- Drop existing bucket and policies
DROP POLICY IF EXISTS "Give public access to software-images" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to upload images" ON storage.objects;

-- Recreate bucket with proper configuration
DELETE FROM storage.buckets WHERE id = 'software-images';
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'software-images',
  'software-images',
  true,
  5242880, -- 5MB
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp'
  ]
);

-- Allow public access to view images
CREATE POLICY "Give public access to software-images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'software-images');

-- Allow authenticated users to upload images
CREATE POLICY "Allow authenticated users to upload images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'software-images' AND
  (LOWER(storage.extension(name)) = ANY (ARRAY['jpg', 'jpeg', 'png', 'gif', 'webp'])) AND
  auth.jwt() ->> 'email' = 'wangzaiwang@wetools.com'
);

-- Allow admin to delete images
CREATE POLICY "Allow admin to delete images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'software-images' AND
  auth.jwt() ->> 'email' = 'wangzaiwang@wetools.com'
);