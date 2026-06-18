-- Drop the overly-permissive write policies for product/establishment media buckets
DROP POLICY IF EXISTS "Authenticated Upload" ON storage.objects;
DROP POLICY IF EXISTS "Owner Manage" ON storage.objects;

-- INSERT: only allow uploading to a path that starts with the user's own id
CREATE POLICY "estab_media_insert_own"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = ANY (ARRAY['product-images','establishment-logos','establishment-banners'])
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- UPDATE: only owner of the path (or admin) can update
CREATE POLICY "estab_media_update_own"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = ANY (ARRAY['product-images','establishment-logos','establishment-banners'])
  AND ((storage.foldername(name))[1] = auth.uid()::text OR public.is_admin(auth.uid()))
)
WITH CHECK (
  bucket_id = ANY (ARRAY['product-images','establishment-logos','establishment-banners'])
  AND ((storage.foldername(name))[1] = auth.uid()::text OR public.is_admin(auth.uid()))
);

-- DELETE: only owner of the path (or admin) can delete
CREATE POLICY "estab_media_delete_own"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = ANY (ARRAY['product-images','establishment-logos','establishment-banners'])
  AND ((storage.foldername(name))[1] = auth.uid()::text OR public.is_admin(auth.uid()))
);