
CREATE POLICY "Admins read signup invite exports"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'signup-invite-exports' AND public.is_admin(auth.uid()));

CREATE POLICY "Admins write signup invite exports"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'signup-invite-exports' AND public.is_admin(auth.uid()));

CREATE POLICY "Admins update signup invite exports"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'signup-invite-exports' AND public.is_admin(auth.uid()))
  WITH CHECK (bucket_id = 'signup-invite-exports' AND public.is_admin(auth.uid()));

CREATE POLICY "Admins delete signup invite exports"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'signup-invite-exports' AND public.is_admin(auth.uid()));
