CREATE POLICY "support_att_update"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'support-attachments'
  AND (owner = auth.uid() OR public.is_admin(auth.uid()))
)
WITH CHECK (
  bucket_id = 'support-attachments'
  AND (owner = auth.uid() OR public.is_admin(auth.uid()))
);