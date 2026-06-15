
-- ========== FASE 1 (rev): Schema p/ onboarding, aprovação e planos ==========

-- 0) Helper de slug primeiro (precisa existir antes do UPDATE)
CREATE OR REPLACE FUNCTION public.unaccent_safe(_t text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT translate(_t,
    'áàâãäÁÀÂÃÄéèêëÉÈÊËíìîïÍÌÎÏóòôõöÓÒÔÕÖúùûüÚÙÛÜçÇñÑ',
    'aaaaaAAAAAeeeeEEEEiiiiIIIIoooooOOOOOuuuuUUUUcCnN');
$$;

-- 1) Coluna paralela approval_status (text + CHECK) — evita conflito com enum existente
ALTER TABLE public.establishments
  ADD COLUMN IF NOT EXISTS approval_status text;

ALTER TABLE public.establishments
  DROP CONSTRAINT IF EXISTS establishments_approval_status_check;
ALTER TABLE public.establishments
  ADD CONSTRAINT establishments_approval_status_check CHECK (
    approval_status IS NULL OR approval_status IN
    ('pending_approval','approved','correction_requested','rejected','suspended','inactive')
  );

-- Backfill: lojas já ativas viram 'approved'; pendentes viram 'pending_approval'
UPDATE public.establishments SET approval_status =
  CASE
    WHEN status::text = 'ativo' THEN 'approved'
    WHEN status::text = 'pendente' THEN 'pending_approval'
    WHEN status::text = 'suspenso' THEN 'suspended'
    ELSE 'approved'
  END
WHERE approval_status IS NULL;

CREATE INDEX IF NOT EXISTS establishments_approval_status_idx ON public.establishments(approval_status);

-- 2) Plans: slug + features_json
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS slug text;
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS features_json jsonb NOT NULL DEFAULT '{}'::jsonb;
CREATE UNIQUE INDEX IF NOT EXISTS plans_slug_key ON public.plans(slug) WHERE slug IS NOT NULL;

INSERT INTO public.plans (name, slug, price_cents, position, benefits, features_json)
VALUES
  ('Presença',  'presenca',  0,     1, ARRAY['Cadastro no app','Cardápio simples'], '{
      "edit_basic_info": true, "edit_opening_hours": true, "manage_menu": true,
      "menu_limit": 15, "receive_whatsapp_orders": true, "basic_reviews": true
   }'::jsonb),
  ('Essencial', 'essencial', 4900,  2, ARRAY['Cardápio essencial','Selo verificado'], '{
      "edit_basic_info": true, "edit_opening_hours": true, "manage_menu": true,
      "menu_limit": null, "product_photos": true, "product_addons": true,
      "menu_categories": true, "promotions": true, "basic_metrics": true,
      "receive_whatsapp_orders": true, "basic_reviews": true
   }'::jsonb),
  ('Exclusivo', 'exclusivo', 9900,  3, ARRAY['Cardápio exclusivo','Destaque em buscas'], '{
      "edit_basic_info": true, "edit_opening_hours": true, "manage_menu": true,
      "menu_limit": null, "product_photos": true, "product_addons": true,
      "advanced_addons": true, "menu_categories": true, "promotions": true,
      "custom_branding": true, "gallery": true, "videos": true,
      "featured_products": true, "premium_layout": true, "review_replies": true,
      "basic_metrics": true, "receive_whatsapp_orders": true, "basic_reviews": true
   }'::jsonb),
  ('Gestão',    'gestao',    19900, 4, ARRAY['Tudo do Exclusivo','Relatórios avançados','Inteligência comercial'], '{
      "edit_basic_info": true, "edit_opening_hours": true, "manage_menu": true,
      "menu_limit": null, "product_photos": true, "product_addons": true,
      "advanced_addons": true, "menu_categories": true, "promotions": true,
      "custom_branding": true, "gallery": true, "videos": true,
      "featured_products": true, "premium_layout": true, "review_replies": true,
      "basic_metrics": true, "advanced_metrics": true, "commercial_insights": true,
      "benchmark": true, "pdf_reports": true, "coupons": true,
      "receive_whatsapp_orders": true, "basic_reviews": true
   }'::jsonb)
ON CONFLICT (name) DO UPDATE
SET slug = EXCLUDED.slug,
    features_json = EXCLUDED.features_json,
    benefits = EXCLUDED.benefits,
    position = EXCLUDED.position;

UPDATE public.plans SET slug = lower(regexp_replace(public.unaccent_safe(name),'[^a-zA-Z0-9]+','_','g'))
WHERE slug IS NULL;

-- 3) Approval requests (status como TEXT + CHECK)
CREATE TABLE IF NOT EXISTS public.establishment_approval_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  establishment_id uuid NOT NULL,
  owner_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending_approval'
    CHECK (status IN ('pending_approval','approved','correction_requested','rejected','suspended','inactive')),
  submitted_data_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  admin_notes text,
  rejection_reason text,
  correction_requested_fields_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS approval_req_estab_idx ON public.establishment_approval_requests(establishment_id);
CREATE INDEX IF NOT EXISTS approval_req_status_idx ON public.establishment_approval_requests(status);

GRANT SELECT, INSERT, UPDATE ON public.establishment_approval_requests TO authenticated;
GRANT ALL ON public.establishment_approval_requests TO service_role;

ALTER TABLE public.establishment_approval_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owner reads own approval requests" ON public.establishment_approval_requests;
CREATE POLICY "Owner reads own approval requests"
  ON public.establishment_approval_requests FOR SELECT TO authenticated
  USING (owner_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.establishments e
    WHERE e.id = establishment_id AND e.owner_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Owner creates own approval request" ON public.establishment_approval_requests;
CREATE POLICY "Owner creates own approval request"
  ON public.establishment_approval_requests FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "Owner updates own approval request" ON public.establishment_approval_requests;
CREATE POLICY "Owner updates own approval request"
  ON public.establishment_approval_requests FOR UPDATE TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "Admins manage approval requests" ON public.establishment_approval_requests;
CREATE POLICY "Admins manage approval requests"
  ON public.establishment_approval_requests FOR ALL
  USING (public.can_manage(auth.uid()))
  WITH CHECK (public.can_manage(auth.uid()));

DROP TRIGGER IF EXISTS trg_approval_req_updated_at ON public.establishment_approval_requests;
CREATE TRIGGER trg_approval_req_updated_at
  BEFORE UPDATE ON public.establishment_approval_requests
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 4) Subscriptions
CREATE TABLE IF NOT EXISTS public.establishment_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  establishment_id uuid NOT NULL,
  plan_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','trial','cancelled','expired')),
  started_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  trial_ends_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS estab_subs_estab_idx ON public.establishment_subscriptions(establishment_id);
CREATE INDEX IF NOT EXISTS estab_subs_status_idx ON public.establishment_subscriptions(status);

GRANT SELECT ON public.establishment_subscriptions TO authenticated;
GRANT SELECT ON public.establishment_subscriptions TO anon;
GRANT ALL ON public.establishment_subscriptions TO service_role;

ALTER TABLE public.establishment_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public reads subscriptions" ON public.establishment_subscriptions;
CREATE POLICY "Public reads subscriptions"
  ON public.establishment_subscriptions FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admins manage subscriptions" ON public.establishment_subscriptions;
CREATE POLICY "Admins manage subscriptions"
  ON public.establishment_subscriptions FOR ALL
  USING (public.can_manage(auth.uid()))
  WITH CHECK (public.can_manage(auth.uid()));

DROP TRIGGER IF EXISTS trg_estab_subs_updated_at ON public.establishment_subscriptions;
CREATE TRIGGER trg_estab_subs_updated_at
  BEFORE UPDATE ON public.establishment_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 5) Feature usage
CREATE TABLE IF NOT EXISTS public.plan_feature_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  establishment_id uuid NOT NULL,
  feature_key text NOT NULL,
  usage_count integer NOT NULL DEFAULT 0,
  usage_limit integer,
  period_start timestamptz NOT NULL DEFAULT now(),
  period_end timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS plan_fu_estab_idx ON public.plan_feature_usage(establishment_id, feature_key);

GRANT SELECT ON public.plan_feature_usage TO authenticated;
GRANT ALL ON public.plan_feature_usage TO service_role;

ALTER TABLE public.plan_feature_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owner reads own feature usage" ON public.plan_feature_usage;
CREATE POLICY "Owner reads own feature usage"
  ON public.plan_feature_usage FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.establishments e WHERE e.id = establishment_id AND e.owner_id = auth.uid()));

DROP POLICY IF EXISTS "Admins manage feature usage" ON public.plan_feature_usage;
CREATE POLICY "Admins manage feature usage"
  ON public.plan_feature_usage FOR ALL
  USING (public.can_manage(auth.uid()))
  WITH CHECK (public.can_manage(auth.uid()));

-- 6) Função has_feature server-side
CREATE OR REPLACE FUNCTION public.has_feature(_estab_id uuid, _feature text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((
    SELECT (p.features_json ->> _feature)::boolean
    FROM public.establishment_subscriptions s
    JOIN public.plans p ON p.id = s.plan_id
    WHERE s.establishment_id = _estab_id
      AND s.status IN ('active','trial')
    ORDER BY s.started_at DESC
    LIMIT 1
  ),
  (
    SELECT (p.features_json ->> _feature)::boolean
    FROM public.establishments e
    JOIN public.plans p ON p.id = e.plan_id
    WHERE e.id = _estab_id
    LIMIT 1
  ),
  false);
$$;

GRANT EXECUTE ON FUNCTION public.has_feature(uuid, text) TO anon, authenticated;
