-- Public RPC used by guests to read messages of an order by tracking_code.
-- The tracking_code itself is the access token; it's already the same model
-- used by get_order_by_tracking.
CREATE OR REPLACE FUNCTION public.get_order_messages_by_tracking(_code text)
RETURNS TABLE (
  id uuid,
  order_id uuid,
  establishment_id uuid,
  sender_type text,
  message text,
  attachments jsonb,
  created_at timestamptz,
  read_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT m.id, m.order_id, m.establishment_id, m.sender_type::text, m.message,
         m.attachments, m.created_at, m.read_at
  FROM public.order_messages m
  JOIN public.orders o ON o.id = m.order_id
  WHERE o.tracking_code = _code
  ORDER BY m.created_at ASC
  LIMIT 200;
$$;

GRANT EXECUTE ON FUNCTION public.get_order_messages_by_tracking(text) TO anon, authenticated;
