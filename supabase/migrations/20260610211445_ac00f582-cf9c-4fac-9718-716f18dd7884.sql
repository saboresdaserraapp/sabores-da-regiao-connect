-- Allow public access to read files from the buckets
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id IN ('product-images', 'establishment-logos', 'establishment-banners'));

-- Allow authenticated users to upload files to their own paths
CREATE POLICY "Authenticated Upload" ON storage.objects FOR INSERT WITH CHECK (
  auth.role() = 'authenticated' AND 
  bucket_id IN ('product-images', 'establishment-logos', 'establishment-banners')
);

-- Allow users to update/delete their own files
CREATE POLICY "Owner Manage" ON storage.objects FOR ALL USING (
  auth.role() = 'authenticated' AND 
  bucket_id IN ('product-images', 'establishment-logos', 'establishment-banners')
);
