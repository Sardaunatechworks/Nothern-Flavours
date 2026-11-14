-- Migration 018: Supabase Storage Configuration
-- Purpose: Create buckets and define row level security policies for image assets.

-- Ensure storage schema buckets exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
    ('food-images', 'food-images', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif']),
    ('category-images', 'category-images', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif']),
    ('restaurant-assets', 'restaurant-assets', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']),
    ('avatars', 'avatars', true, 2097152, ARRAY['image/jpeg', 'image/png', 'image/webp']),
    ('receipts', 'receipts', false, 10485760, ARRAY['application/pdf', 'image/jpeg', 'image/png'])
ON CONFLICT (id) DO NOTHING;

-- Public read policies for public buckets
CREATE POLICY "Public Read Food Images"
ON storage.objects FOR SELECT
USING (bucket_id = 'food-images');

CREATE POLICY "Public Read Category Images"
ON storage.objects FOR SELECT
USING (bucket_id = 'category-images');

CREATE POLICY "Public Read Restaurant Assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'restaurant-assets');

CREATE POLICY "Public Read Avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- Admin upload policies
CREATE POLICY "Staff Upload Food Images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'food-images' AND
    private.has_role(ARRAY['super_admin', 'manager'])
);

CREATE POLICY "Staff Upload Category Images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'category-images' AND
    private.has_role(ARRAY['super_admin', 'manager'])
);

CREATE POLICY "Staff Upload Restaurant Assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'restaurant-assets' AND
    private.has_role(ARRAY['super_admin', 'manager'])
);

CREATE POLICY "Staff Upload Avatars"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'avatars'
);
