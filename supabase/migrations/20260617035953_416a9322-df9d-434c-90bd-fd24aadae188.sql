
-- Drop buggy/duplicated policies
DROP POLICY IF EXISTS "Users can insert messages to their own orders" ON public.order_messages;
DROP POLICY IF EXISTS "Users can view messages of their own orders" ON public.order_messages;
DROP POLICY IF EXISTS "Users can view order messages" ON public.order_messages;

-- Helper: is user a member/owner of the establishment that owns the order?
CREATE OR REPLACE FUNCTION public.user_owns_order_establishment(_order_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.orders o
    LEFT JOIN public.establishments e ON e.id = o.establishment_id
    LEFT JOIN public.establishment_owners eo
      ON eo.establishment_id = o.establishment_id AND eo.user_id = _user_id
    WHERE o.id = _order_id
      AND (e.owner_id = _user_id OR eo.user_id IS NOT NULL)
  );
$$;

-- Helper: is user the customer of the order?
CREATE OR REPLACE FUNCTION public.user_is_order_customer(_order_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = _order_id AND o.user_id = _user_id
  );
$$;

GRANT SELECT, INSERT, UPDATE ON public.order_messages TO authenticated;

-- SELECT: customer of the order or member/owner of the establishment
CREATE POLICY "order_messages_select"
ON public.order_messages
FOR SELECT
TO authenticated
USING (
  public.user_is_order_customer(order_id, auth.uid())
  OR public.user_owns_order_establishment(order_id, auth.uid())
);

-- INSERT: sender_user_id must be self; sender_type must match role; system blocked on client
CREATE POLICY "order_messages_insert"
ON public.order_messages
FOR INSERT
TO authenticated
WITH CHECK (
  sender_user_id = auth.uid()
  AND (
    (sender_type = 'customer' AND public.user_is_order_customer(order_id, auth.uid()))
    OR (sender_type = 'business' AND public.user_owns_order_establishment(order_id, auth.uid()))
  )
);

-- UPDATE: only the recipient may mark messages as read (cannot update own messages)
CREATE POLICY "order_messages_update_read"
ON public.order_messages
FOR UPDATE
TO authenticated
USING (
  sender_user_id IS DISTINCT FROM auth.uid()
  AND (
    public.user_is_order_customer(order_id, auth.uid())
    OR public.user_owns_order_establishment(order_id, auth.uid())
  )
)
WITH CHECK (
  sender_user_id IS DISTINCT FROM auth.uid()
  AND (
    public.user_is_order_customer(order_id, auth.uid())
    OR public.user_owns_order_establishment(order_id, auth.uid())
  )
);
