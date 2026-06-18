DROP POLICY IF EXISTS "Users can view their own order events" ON public.whatsapp_order_events;

CREATE POLICY "Users can view their own order events"
ON public.whatsapp_order_events
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = whatsapp_order_events.order_id
      AND o.user_id = auth.uid()
  )
);

REVOKE SELECT ON public.whatsapp_order_events FROM anon;