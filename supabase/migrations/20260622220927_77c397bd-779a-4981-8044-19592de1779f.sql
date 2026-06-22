DROP POLICY IF EXISTS "owners upload establishment media" ON storage.objects;
DROP POLICY IF EXISTS "owners update establishment media" ON storage.objects;
DROP POLICY IF EXISTS "owners delete establishment media" ON storage.objects;
DROP POLICY IF EXISTS "public-media user folder read" ON storage.objects;
DROP POLICY IF EXISTS "public-media user folder upload" ON storage.objects;
DROP POLICY IF EXISTS "public-media user folder update" ON storage.objects;
DROP POLICY IF EXISTS "public-media user folder delete" ON storage.objects;

CREATE POLICY "owners upload establishment media"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'public-media'
  AND (storage.foldername(storage.objects.name))[1] = 'establishments'
  AND EXISTS (
    SELECT 1
    FROM public.establishments e
    WHERE e.id::text = (storage.foldername(storage.objects.name))[2]
      AND (
        e.owner_id = auth.uid()
        OR EXISTS (
          SELECT 1
          FROM public.establishment_owners eo
          WHERE eo.establishment_id = e.id
            AND eo.user_id = auth.uid()
        )
      )
  )
);

CREATE POLICY "owners update establishment media"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'public-media'
  AND (storage.foldername(storage.objects.name))[1] = 'establishments'
  AND EXISTS (
    SELECT 1
    FROM public.establishments e
    WHERE e.id::text = (storage.foldername(storage.objects.name))[2]
      AND (
        e.owner_id = auth.uid()
        OR EXISTS (
          SELECT 1
          FROM public.establishment_owners eo
          WHERE eo.establishment_id = e.id
            AND eo.user_id = auth.uid()
        )
      )
  )
)
WITH CHECK (
  bucket_id = 'public-media'
  AND (storage.foldername(storage.objects.name))[1] = 'establishments'
  AND EXISTS (
    SELECT 1
    FROM public.establishments e
    WHERE e.id::text = (storage.foldername(storage.objects.name))[2]
      AND (
        e.owner_id = auth.uid()
        OR EXISTS (
          SELECT 1
          FROM public.establishment_owners eo
          WHERE eo.establishment_id = e.id
            AND eo.user_id = auth.uid()
        )
      )
  )
);

CREATE POLICY "owners delete establishment media"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'public-media'
  AND (storage.foldername(storage.objects.name))[1] = 'establishments'
  AND EXISTS (
    SELECT 1
    FROM public.establishments e
    WHERE e.id::text = (storage.foldername(storage.objects.name))[2]
      AND (
        e.owner_id = auth.uid()
        OR EXISTS (
          SELECT 1
          FROM public.establishment_owners eo
          WHERE eo.establishment_id = e.id
            AND eo.user_id = auth.uid()
        )
      )
  )
);

CREATE POLICY "public-media user folder read"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'public-media'
  AND (storage.foldername(storage.objects.name))[1] = auth.uid()::text
);

CREATE POLICY "public-media user folder upload"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'public-media'
  AND (storage.foldername(storage.objects.name))[1] = auth.uid()::text
);

CREATE POLICY "public-media user folder update"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'public-media'
  AND (storage.foldername(storage.objects.name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'public-media'
  AND (storage.foldername(storage.objects.name))[1] = auth.uid()::text
);

CREATE POLICY "public-media user folder delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'public-media'
  AND (storage.foldername(storage.objects.name))[1] = auth.uid()::text
);