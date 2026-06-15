-- Orders policies
CREATE POLICY "Users view orders by phone" ON public.orders FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND (
      replace(profiles.phone, '\D', '') = replace(orders.customer_phone, '\D', '')
    )
  )
);

-- Notifications policies refinement (ensure related_order_id visibility)
-- (Existing policy "Users can view their own notifications" already handles user_id = auth.uid())

-- Ensure items and chat messages are readable if the order is readable
-- We can't easily do cross-table RLS without performance hit, but let's try to be consistent
-- Use a helper function for clarity if needed, but plain SQL is fine

CREATE OR REPLACE FUNCTION public.can_user_access_order(order_uuid UUID) RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_uuid
    AND (
      o.user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
        AND replace(p.phone, '\D', '') = replace(o.customer_phone, '\D', '')
      )
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Chat messages
DROP POLICY IF EXISTS "Users can view order messages" ON public.order_messages;
CREATE POLICY "Users can view order messages" ON public.order_messages FOR SELECT USING (
  can_user_access_order(order_id)
  OR EXISTS (
    SELECT 1 FROM public.establishments e
    JOIN public.orders o ON o.establishment_id = e.id
    WHERE o.id = order_messages.order_id AND e.owner_id = auth.uid()
  )
);

-- Grant permissions (as required by rules)
GRANT SELECT ON public.orders TO authenticated;
GRANT SELECT ON public.profiles TO authenticated;
GRANT SELECT ON public.order_messages TO authenticated;
