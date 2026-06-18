-- 1) whatsapp_order_events: allow staff of the order's establishment to read
CREATE POLICY "Establishment staff can view order events"
ON public.whatsapp_order_events
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.orders o
    JOIN public.establishments e ON e.id = o.establishment_id
    WHERE o.id = whatsapp_order_events.order_id
      AND (
        e.owner_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.establishment_owners eo
          WHERE eo.establishment_id = o.establishment_id
            AND eo.user_id = auth.uid()
        )
        OR public.is_admin(auth.uid())
      )
  )
);

-- 2) order_status_history: add INSERT/UPDATE/DELETE policies (admin + establishment staff only)
CREATE POLICY "Admins and establishment staff can insert status history"
ON public.order_status_history
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.orders o
    JOIN public.establishments e ON e.id = o.establishment_id
    WHERE o.id = order_status_history.order_id
      AND (
        e.owner_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.establishment_owners eo
          WHERE eo.establishment_id = o.establishment_id
            AND eo.user_id = auth.uid()
        )
      )
  )
);

CREATE POLICY "Admins can update status history"
ON public.order_status_history
FOR UPDATE
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete status history"
ON public.order_status_history
FOR DELETE
TO authenticated
USING (public.is_admin(auth.uid()));

-- 3) support-attachments: tighten SELECT policy to require strict path boundary match
DROP POLICY IF EXISTS "support_att_select" ON storage.objects;

CREATE POLICY "support_att_select"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'support-attachments'
  AND EXISTS (
    SELECT 1
    FROM public.support_ticket_attachments a
    JOIN public.support_tickets t ON t.id = a.ticket_id
    WHERE (
      a.file_url = objects.name
      OR a.file_url LIKE '%/' || objects.name
    )
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