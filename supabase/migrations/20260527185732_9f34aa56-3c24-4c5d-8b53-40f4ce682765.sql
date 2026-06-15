
-- 1) FK para permitir embed via PostgREST no painel de admin
ALTER TABLE public.establishment_approval_requests
  ADD CONSTRAINT establishment_approval_requests_establishment_id_fkey
  FOREIGN KEY (establishment_id) REFERENCES public.establishments(id) ON DELETE CASCADE;

ALTER TABLE public.establishment_approval_requests
  ADD CONSTRAINT establishment_approval_requests_owner_id_fkey
  FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2) Permitir que donos autenticados subam imagens em public-media/establishments/*
CREATE POLICY "owners upload establishment media"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'public-media'
  AND (storage.foldername(name))[1] = 'establishments'
);

CREATE POLICY "owners update establishment media"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'public-media'
  AND (storage.foldername(name))[1] = 'establishments'
);

CREATE POLICY "owners delete establishment media"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'public-media'
  AND (storage.foldername(name))[1] = 'establishments'
);
