-- Policies for public access to public-media
CREATE POLICY "Public Read Access" ON storage.objects FOR SELECT USING (bucket_id = 'public-media');

-- Policies for authenticated uploads to public-media
CREATE POLICY "Auth Upload Access" ON storage.objects FOR INSERT WITH CHECK (
  auth.role() = 'authenticated' AND bucket_id = 'public-media'
);

-- Policies for owners to manage public-media
CREATE POLICY "Owner Manage Access" ON storage.objects FOR ALL USING (
  auth.role() = 'authenticated' AND bucket_id = 'public-media'
);

-- Policies for user-media (private/signed)
CREATE POLICY "User Read Own" ON storage.objects FOR SELECT USING (
  auth.role() = 'authenticated' AND bucket_id = 'user-media' AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "User Upload Own" ON storage.objects FOR INSERT WITH CHECK (
  auth.role() = 'authenticated' AND bucket_id = 'user-media' AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "User Manage Own" ON storage.objects FOR ALL USING (
  auth.role() = 'authenticated' AND bucket_id = 'user-media' AND (storage.foldername(name))[1] = auth.uid()::text
);
