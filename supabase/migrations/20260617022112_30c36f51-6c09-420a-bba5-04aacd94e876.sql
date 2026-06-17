
-- Storage policies for support-attachments bucket
CREATE POLICY "support_att_select" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'support-attachments' AND EXISTS (
  SELECT 1 FROM public.support_ticket_attachments a
  WHERE a.file_url LIKE '%' || storage.objects.name
));

CREATE POLICY "support_att_insert" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'support-attachments' AND owner = auth.uid());

CREATE POLICY "support_att_delete" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'support-attachments' AND owner = auth.uid());
