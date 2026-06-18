
DROP POLICY IF EXISTS "support_att_select" ON storage.objects;
CREATE POLICY "support_att_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'support-attachments'
    AND EXISTS (
      SELECT 1
      FROM public.support_ticket_attachments a
      JOIN public.support_tickets t ON t.id = a.ticket_id
      WHERE a.file_url LIKE ('%' || objects.name)
        AND (
          t.opened_by = auth.uid()
          OR t.assigned_admin_id = auth.uid()
          OR public.is_admin(auth.uid())
          OR (
            t.establishment_id IS NOT NULL
            AND EXISTS (
              SELECT 1 FROM public.establishment_owners eo
              WHERE eo.establishment_id = t.establishment_id
                AND eo.user_id = auth.uid()
            )
          )
        )
    )
  );
