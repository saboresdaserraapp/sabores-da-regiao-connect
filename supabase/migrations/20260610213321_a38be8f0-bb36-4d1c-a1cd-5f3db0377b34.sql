DROP FUNCTION IF EXISTS public.get_order_by_tracking(text);

CREATE OR REPLACE FUNCTION public.get_order_by_tracking(_code text)
 RETURNS TABLE(id uuid, tracking_code text, establishment_id uuid, establishment_name text, establishment_slug text, establishment_logo text, establishment_whatsapp text, customer_name text, subtotal numeric, delivery_fee numeric, total numeric, final_total numeric, estimated_minutes integer, establishment_reply text, payment_method text, notes text, items jsonb, status text, status_history jsonb, created_at timestamp with time zone, updated_at timestamp with time zone, address_id uuid)
 LANGUAGE sql
 STABLE
AS $function$
  SELECT o.id, o.tracking_code, o.establishment_id,
         e.name, e.slug, e.logo, e.whatsapp,
         o.customer_name, o.subtotal, o.delivery_fee, o.total,
         o.final_total, o.estimated_minutes, o.establishment_reply,
         o.payment_method, o.notes, o.items, o.status::text, o.status_history,
         o.created_at, o.updated_at, o.address_id
  FROM public.orders o
  JOIN public.establishments e ON e.id = o.establishment_id
  WHERE o.tracking_code = _code
  LIMIT 1;
$function$;