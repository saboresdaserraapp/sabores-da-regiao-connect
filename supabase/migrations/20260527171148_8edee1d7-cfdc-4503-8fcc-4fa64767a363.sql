
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS tracking_code text UNIQUE,
  ADD COLUMN IF NOT EXISTS estimated_minutes integer,
  ADD COLUMN IF NOT EXISTS final_total numeric,
  ADD COLUMN IF NOT EXISTS establishment_reply text,
  ADD COLUMN IF NOT EXISTS status_history jsonb NOT NULL DEFAULT '[]'::jsonb;

CREATE OR REPLACE FUNCTION public.gen_tracking_code()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text := 'SDS-';
  i int;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(chars, 1 + floor(random() * length(chars))::int, 1);
  END LOOP;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_order_tracking_code()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  c text;
  tries int := 0;
BEGIN
  IF NEW.tracking_code IS NULL THEN
    LOOP
      c := public.gen_tracking_code();
      EXIT WHEN NOT EXISTS (SELECT 1 FROM public.orders WHERE tracking_code = c);
      tries := tries + 1;
      IF tries > 10 THEN EXIT; END IF;
    END LOOP;
    NEW.tracking_code := c;
  END IF;
  IF NEW.status_history IS NULL OR NEW.status_history = '[]'::jsonb THEN
    NEW.status_history := jsonb_build_array(
      jsonb_build_object('status', NEW.status::text, 'at', now(), 'by', 'system')
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_order_tracking_code ON public.orders;
CREATE TRIGGER trg_set_order_tracking_code
BEFORE INSERT ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.set_order_tracking_code();

-- Public lookup by tracking_code (limited fields, no PII like full address)
CREATE OR REPLACE FUNCTION public.get_order_by_tracking(_code text)
RETURNS TABLE (
  id uuid,
  tracking_code text,
  establishment_id uuid,
  establishment_name text,
  establishment_slug text,
  establishment_logo text,
  establishment_whatsapp text,
  customer_name text,
  subtotal numeric,
  delivery_fee numeric,
  total numeric,
  final_total numeric,
  estimated_minutes integer,
  establishment_reply text,
  payment_method text,
  notes text,
  items jsonb,
  status text,
  status_history jsonb,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT o.id, o.tracking_code, o.establishment_id,
         e.name, e.slug, e.logo, e.whatsapp,
         o.customer_name, o.subtotal, o.delivery_fee, o.total,
         o.final_total, o.estimated_minutes, o.establishment_reply,
         o.payment_method, o.notes, o.items, o.status::text, o.status_history,
         o.created_at, o.updated_at
  FROM public.orders o
  JOIN public.establishments e ON e.id = o.establishment_id
  WHERE o.tracking_code = _code
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_order_by_tracking(text) TO anon, authenticated;

-- Enable realtime
ALTER TABLE public.orders REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
