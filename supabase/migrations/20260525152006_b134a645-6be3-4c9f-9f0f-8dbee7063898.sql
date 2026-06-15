
-- =========== STORAGE BUCKETS ===========
INSERT INTO storage.buckets (id, name, public) VALUES ('public-media', 'public-media', true)
ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('user-media', 'user-media', false)
ON CONFLICT (id) DO NOTHING;

-- public-media policies
CREATE POLICY "public-media read" ON storage.objects FOR SELECT
USING (bucket_id = 'public-media');
CREATE POLICY "public-media admin write" ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'public-media' AND public.can_manage(auth.uid()));
CREATE POLICY "public-media admin update" ON storage.objects FOR UPDATE
USING (bucket_id = 'public-media' AND public.can_manage(auth.uid()));
CREATE POLICY "public-media admin delete" ON storage.objects FOR DELETE
USING (bucket_id = 'public-media' AND public.can_manage(auth.uid()));

-- user-media policies (folder = user id)
CREATE POLICY "user-media own read" ON storage.objects FOR SELECT
USING (bucket_id = 'user-media' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "user-media own write" ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'user-media' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "user-media own update" ON storage.objects FOR UPDATE
USING (bucket_id = 'user-media' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "user-media own delete" ON storage.objects FOR DELETE
USING (bucket_id = 'user-media' AND auth.uid()::text = (storage.foldername(name))[1]);

-- =========== FAVORITES ===========
CREATE TYPE public.favorite_kind AS ENUM ('establishment', 'product');

CREATE TABLE public.favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  kind public.favorite_kind NOT NULL,
  target_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, kind, target_id)
);
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own favorites" ON public.favorites FOR ALL
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "admins view favorites" ON public.favorites FOR SELECT
USING (public.is_admin(auth.uid()));

-- =========== ADDRESSES ===========
CREATE TABLE public.addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  label text NOT NULL DEFAULT 'Casa',
  zip text,
  street text NOT NULL,
  number text,
  complement text,
  neighborhood text,
  city text,
  reference text,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own addresses" ON public.addresses FOR ALL
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "admins view addresses" ON public.addresses FOR SELECT
USING (public.is_admin(auth.uid()));
CREATE TRIGGER addresses_touch BEFORE UPDATE ON public.addresses
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- =========== HOUSE REFERENCES ===========
CREATE TABLE public.house_references (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  media_urls jsonb NOT NULL DEFAULT '[]'::jsonb,
  video_url text,
  instructions text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.house_references ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own house reference" ON public.house_references FOR ALL
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "admins view house reference" ON public.house_references FOR SELECT
USING (public.is_admin(auth.uid()));
CREATE TRIGGER house_ref_touch BEFORE UPDATE ON public.house_references
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- =========== ORDERS ===========
CREATE TYPE public.order_status AS ENUM ('enviado_whatsapp', 'confirmado', 'entregue', 'cancelado');

CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  establishment_id uuid NOT NULL,
  address_id uuid,
  customer_name text,
  customer_phone text,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  subtotal numeric NOT NULL DEFAULT 0,
  delivery_fee numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  payment_method text,
  notes text,
  status public.order_status NOT NULL DEFAULT 'enviado_whatsapp',
  whatsapp_sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can create orders" ON public.orders FOR INSERT
WITH CHECK (true);
CREATE POLICY "Own orders read" ON public.orders FOR SELECT
USING (user_id IS NOT NULL AND auth.uid() = user_id);
CREATE POLICY "Establishment owners read their orders" ON public.orders FOR SELECT
USING (EXISTS (SELECT 1 FROM public.establishments e WHERE e.id = orders.establishment_id AND e.owner_id = auth.uid()));
CREATE POLICY "Admins manage orders" ON public.orders FOR ALL
USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Establishment owners update their orders" ON public.orders FOR UPDATE
USING (EXISTS (SELECT 1 FROM public.establishments e WHERE e.id = orders.establishment_id AND e.owner_id = auth.uid()));

CREATE TRIGGER orders_touch BEFORE UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX idx_orders_user ON public.orders(user_id);
CREATE INDEX idx_orders_estab ON public.orders(establishment_id);
CREATE INDEX idx_favorites_user ON public.favorites(user_id);
CREATE INDEX idx_addresses_user ON public.addresses(user_id);
