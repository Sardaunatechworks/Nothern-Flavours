-- ==============================================================================
-- Migration 033: Storage Bucket & RLS Policies for Local Product Images
-- Purpose: Ensures the 'food-images' bucket exists with public access,
--          allowing administrators and staff to upload menu images from their local computer.
-- ==============================================================================

BEGIN;

-- 1. Ensure the 'food-images' storage bucket exists and is public
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'food-images',
    'food-images',
    true,
    5242880, -- 5 MB limit
    ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/avif', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/avif', 'image/gif'];

-- 2. Public Read Policy for Food Images
DROP POLICY IF EXISTS "Public Read Food Images" ON storage.objects;
CREATE POLICY "Public Read Food Images"
ON storage.objects FOR SELECT
USING (bucket_id = 'food-images');

-- 3. Authenticated Staff Upload Policy
DROP POLICY IF EXISTS "Staff Upload Food Images" ON storage.objects;
CREATE POLICY "Staff Upload Food Images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'food-images'
);

-- 4. Authenticated Staff Update Policy (for replacing / upserting images)
DROP POLICY IF EXISTS "Staff Update Food Images" ON storage.objects;
CREATE POLICY "Staff Update Food Images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'food-images'
)
WITH CHECK (
    bucket_id = 'food-images'
);

-- 5. Authenticated Staff Delete Policy
DROP POLICY IF EXISTS "Staff Delete Food Images" ON storage.objects;
CREATE POLICY "Staff Delete Food Images"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'food-images'
);

COMMIT;
