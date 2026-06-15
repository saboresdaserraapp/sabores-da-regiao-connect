
-- Enums
CREATE TYPE public.delivery_model AS ENUM ('fixed', 'by_region', 'to_confirm', 'free', 'pickup_only');
CREATE TYPE public.delivery_region_status AS ENUM ('ativo', 'inativo');
CREATE TYPE public.delivery_fee_status AS ENUM ('free', 'estimated', 'to_confirm', 'unavailable');
CREATE TYPE public.delivery_confidence_level AS ENUM ('high', 'medium', 'low');

-- 1) establishment_delivery_settings
CREATE TABLE public.establishment_delivery_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  establishment_id uuid NOT NULL UNIQUE,
  delivery_model public.delivery_model NOT NULL DEFAULT 'to_confirm',
  delivery_available boolean NOT NULL DEFAULT true,
  pickup_available boolean NOT NULL DEFAULT true,
  dine_in_available boolean NOT NULL DEFAULT false,
  default_delivery_message text,
  outside_area_message text,
  always_confirm_by_whatsapp boolean NOT NULL DEFAULT true,
  delivery_v2_enabled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.establishment_delivery_settings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.establishment_delivery_settings TO authenticated;
GRANT ALL ON public.establishment_delivery_settings TO service_role;

ALTER TABLE public.establishment_delivery_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public reads delivery settings of active estabs"
ON public.establishment_delivery_settings FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.establishments e
  WHERE e.id = establishment_delivery_settings.establishment_id
    AND (e.status = 'ativo'::establishment_status OR public.is_admin(auth.uid()) OR e.owner_id = auth.uid())
));

CREATE POLICY "Managers manage delivery settings"
ON public.establishment_delivery_settings FOR ALL
USING (public.can_manage(auth.uid()))
WITH CHECK (public.can_manage(auth.uid()));

CREATE POLICY "Owner manages own delivery settings"
ON public.establishment_delivery_settings FOR ALL
USING (EXISTS (SELECT 1 FROM public.establishments e WHERE e.id = establishment_delivery_settings.establishment_id AND e.owner_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.establishments e WHERE e.id = establishment_delivery_settings.establishment_id AND e.owner_id = auth.uid()));

CREATE TRIGGER trg_eds_updated_at
BEFORE UPDATE ON public.establishment_delivery_settings
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 2) delivery_regions
CREATE TABLE public.delivery_regions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  establishment_id uuid NOT NULL,
  name text NOT NULL,
  fee numeric NOT NULL DEFAULT 0,
  estimated_time integer,
  status public.delivery_region_status NOT NULL DEFAULT 'ativo',
  requires_manual_confirmation boolean NOT NULL DEFAULT false,
  public_note text,
  internal_note text,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_delivery_regions_estab ON public.delivery_regions(establishment_id, display_order);

GRANT SELECT ON public.delivery_regions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.delivery_regions TO authenticated;
GRANT ALL ON public.delivery_regions TO service_role;

ALTER TABLE public.delivery_regions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public reads active delivery regions"
ON public.delivery_regions FOR SELECT
USING (
  status = 'ativo'::public.delivery_region_status
  OR public.is_admin(auth.uid())
  OR EXISTS (SELECT 1 FROM public.establishments e WHERE e.id = delivery_regions.establishment_id AND e.owner_id = auth.uid())
);

CREATE POLICY "Managers manage delivery regions"
ON public.delivery_regions FOR ALL
USING (public.can_manage(auth.uid()))
WITH CHECK (public.can_manage(auth.uid()));

CREATE POLICY "Owner manages own delivery regions"
ON public.delivery_regions FOR ALL
USING (EXISTS (SELECT 1 FROM public.establishments e WHERE e.id = delivery_regions.establishment_id AND e.owner_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.establishments e WHERE e.id = delivery_regions.establishment_id AND e.owner_id = auth.uid()));

CREATE TRIGGER trg_delivery_regions_updated_at
BEFORE UPDATE ON public.delivery_regions
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 3) checkout_delivery_info
CREATE TABLE public.checkout_delivery_info (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid,
  user_id uuid,
  establishment_id uuid NOT NULL,
  address_id uuid,
  selected_region_id uuid,
  selected_region_name text,
  delivery_fee_estimated numeric,
  delivery_fee_status public.delivery_fee_status NOT NULL DEFAULT 'to_confirm',
  delivery_confidence_level public.delivery_confidence_level NOT NULL DEFAULT 'low',
  requires_manual_confirmation boolean NOT NULL DEFAULT true,
  visual_reference_link text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_checkout_delivery_info_order ON public.checkout_delivery_info(order_id);
CREATE INDEX idx_checkout_delivery_info_estab ON public.checkout_delivery_info(establishment_id);
CREATE INDEX idx_checkout_delivery_info_user ON public.checkout_delivery_info(user_id);

GRANT SELECT, INSERT ON public.checkout_delivery_info TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.checkout_delivery_info TO authenticated;
GRANT ALL ON public.checkout_delivery_info TO service_role;

ALTER TABLE public.checkout_delivery_info ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can create checkout delivery info"
ON public.checkout_delivery_info FOR INSERT
TO anon, authenticated
WITH CHECK (user_id IS NULL OR user_id = auth.uid());

CREATE POLICY "Owner of order reads own checkout delivery info"
ON public.checkout_delivery_info FOR SELECT
USING (user_id IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Establishment owners read checkout delivery info"
ON public.checkout_delivery_info FOR SELECT
USING (EXISTS (SELECT 1 FROM public.establishments e WHERE e.id = checkout_delivery_info.establishment_id AND e.owner_id = auth.uid()));

CREATE POLICY "Admins manage checkout delivery info"
ON public.checkout_delivery_info FOR ALL
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));
