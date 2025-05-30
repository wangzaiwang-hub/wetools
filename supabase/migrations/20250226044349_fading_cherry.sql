/*
  # Add storage policies for software images

  1. Changes
    - Create storage bucket for software images
    - Add policies for authenticated users to upload images
    - Add policies for public to view images
*/

-- Create bucket if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('software-images', 'software-images', true)
ON CONFLICT (id) DO NOTHING;

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
  (storage.extension(name) = 'jpg' OR
   storage.extension(name) = 'jpeg' OR
   storage.extension(name) = 'png' OR
   storage.extension(name) = 'gif' OR
   storage.extension(name) = 'webp')
);