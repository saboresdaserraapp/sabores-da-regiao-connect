
-- 1) establishment_owners
CREATE TABLE IF NOT EXISTS public.establishment_owners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  establishment_id uuid NOT NULL REFERENCES public.establishments(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'owner' CHECK (role IN ('owner','manager','attendant','menu_editor','finance')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, establishment_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.establishment_owners TO authenticated;
GRANT ALL ON public.establishment_owners TO service_role;
ALTER TABLE public.establishment_owners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users read own memberships" ON public.establishment_owners
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.can_manage(auth.uid()) OR EXISTS (
    SELECT 1 FROM public.establishments e WHERE e.id = establishment_id AND e.owner_id = auth.uid()
  ));
CREATE POLICY "owners manage memberships" ON public.establishment_owners
  FOR ALL TO authenticated USING (
    public.can_manage(auth.uid()) OR EXISTS (
      SELECT 1 FROM public.establishments e WHERE e.id = establishment_id AND e.owner_id = auth.uid()
    )
  ) WITH CHECK (
    public.can_manage(auth.uid()) OR EXISTS (
      SELECT 1 FROM public.establishments e WHERE e.id = establishment_id AND e.owner_id = auth.uid()
    )
  );

-- 2) subscription_audit_logs
CREATE TABLE IF NOT EXISTS public.subscription_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  establishment_id uuid NOT NULL REFERENCES public.establishments(id) ON DELETE CASCADE,
  old_plan_id uuid,
  new_plan_id uuid,
  changed_by uuid,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.subscription_audit_logs TO authenticated;
GRANT ALL ON public.subscription_audit_logs TO service_role;
ALTER TABLE public.subscription_audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin manages plan audit" ON public.subscription_audit_logs
  FOR ALL USING (public.can_manage(auth.uid())) WITH CHECK (public.can_manage(auth.uid()));
CREATE POLICY "owner reads own plan audit" ON public.subscription_audit_logs
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.establishments e WHERE e.id = establishment_id AND e.owner_id = auth.uid())
  );

-- 3) plans: add columns
ALTER TABLE public.plans
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS billing_period text DEFAULT 'monthly',
  ADD COLUMN IF NOT EXISTS limits_json jsonb NOT NULL DEFAULT '{}'::jsonb;

-- 4) helper: user role in establishment
CREATE OR REPLACE FUNCTION public.user_role_in_establishment(_user_id uuid, _estab_id uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE
    WHEN public.is_admin(_user_id) THEN 'admin'
    WHEN EXISTS (SELECT 1 FROM public.establishments e WHERE e.id = _estab_id AND e.owner_id = _user_id) THEN 'owner'
    ELSE (SELECT role FROM public.establishment_owners WHERE user_id = _user_id AND establishment_id = _estab_id LIMIT 1)
  END
$$;

-- 5) trigger: ensure establishment_owners row exists when owner_id set
CREATE OR REPLACE FUNCTION public.sync_establishment_owner()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.owner_id IS NOT NULL THEN
    INSERT INTO public.establishment_owners (user_id, establishment_id, role)
    VALUES (NEW.owner_id, NEW.id, 'owner')
    ON CONFLICT (user_id, establishment_id) DO NOTHING;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_sync_establishment_owner ON public.establishments;
CREATE TRIGGER trg_sync_establishment_owner
AFTER INSERT OR UPDATE OF owner_id ON public.establishments
FOR EACH ROW EXECUTE FUNCTION public.sync_establishment_owner();

-- 6) trigger: log subscription plan changes
CREATE OR REPLACE FUNCTION public.log_subscription_plan_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.subscription_audit_logs (establishment_id, old_plan_id, new_plan_id, changed_by, reason)
    VALUES (NEW.establishment_id, NULL, NEW.plan_id, auth.uid(), 'subscription_created');
  ELSIF TG_OP = 'UPDATE' AND NEW.plan_id IS DISTINCT FROM OLD.plan_id THEN
    INSERT INTO public.subscription_audit_logs (establishment_id, old_plan_id, new_plan_id, changed_by, reason)
    VALUES (NEW.establishment_id, OLD.plan_id, NEW.plan_id, auth.uid(), 'plan_changed');
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_log_subscription_plan_change ON public.establishment_subscriptions;
CREATE TRIGGER trg_log_subscription_plan_change
AFTER INSERT OR UPDATE ON public.establishment_subscriptions
FOR EACH ROW EXECUTE FUNCTION public.log_subscription_plan_change();

-- 7) Seed/update plans with proper slugs and features_json (idempotent)
INSERT INTO public.plans (name, slug, price_cents, position, is_active, features_json, benefits)
VALUES
  ('Presença', 'presenca', 0, 1, true, '{
    "basic_info": true, "opening_hours": true, "social_links": true,
    "basic_menu": true, "product_management_basic": true,
    "delivery_to_confirm": true, "pickup_enabled": true, "dine_in_enabled": true,
    "receive_whatsapp_orders": true, "basic_orders_panel": true, "basic_reviews": true
  }'::jsonb, ARRAY['Presença na plataforma','Cardápio básico','Pedidos via WhatsApp']),
  ('Essencial', 'essencial', 4900, 2, true, '{
    "basic_info": true, "opening_hours": true, "social_links": true,
    "basic_menu": true, "product_management_basic": true,
    "delivery_to_confirm": true, "pickup_enabled": true, "dine_in_enabled": true,
    "receive_whatsapp_orders": true, "basic_orders_panel": true, "basic_reviews": true,
    "product_photos": true, "simple_addons": true, "simple_promotions": true,
    "delivery_fixed_fee": true, "delivery_regions": true,
    "basic_metrics": true, "whatsapp_clicks": true, "product_views": true,
    "promotions": true
  }'::jsonb, ARRAY['Tudo do Presença','Fotos de produto','Promoções simples','Regiões de entrega','Métricas básicas']),
  ('Profissional', 'profissional', 9900, 3, true, '{
    "basic_info": true, "opening_hours": true, "social_links": true,
    "basic_menu": true, "product_management_basic": true,
    "delivery_to_confirm": true, "pickup_enabled": true, "dine_in_enabled": true,
    "receive_whatsapp_orders": true, "basic_orders_panel": true, "basic_reviews": true,
    "product_photos": true, "simple_addons": true, "simple_promotions": true,
    "delivery_fixed_fee": true, "delivery_regions": true,
    "basic_metrics": true, "whatsapp_clicks": true, "product_views": true,
    "advanced_addons": true, "product_variations": true, "combos": true,
    "advanced_promotions": true, "category_ordering": true, "product_ordering": true,
    "featured_products": true, "photo_reviews": true, "review_replies": true,
    "intermediate_metrics": true, "cart_abandonment": true, "peak_hours": true,
    "delivery_region_rules": true, "visual_reference_on_order": true,
    "promotions": true
  }'::jsonb, ARRAY['Tudo do Essencial','Adicionais avançados','Variações e combos','Destaques','Resposta a avaliações']),
  ('Gestão Premium', 'gestao_premium', 19900, 4, true, '{
    "basic_info": true, "opening_hours": true, "social_links": true,
    "basic_menu": true, "product_management_basic": true,
    "delivery_to_confirm": true, "pickup_enabled": true, "dine_in_enabled": true,
    "receive_whatsapp_orders": true, "basic_orders_panel": true, "basic_reviews": true,
    "product_photos": true, "simple_addons": true, "simple_promotions": true,
    "delivery_fixed_fee": true, "delivery_regions": true,
    "basic_metrics": true, "whatsapp_clicks": true, "product_views": true,
    "advanced_addons": true, "product_variations": true, "combos": true,
    "advanced_promotions": true, "category_ordering": true, "product_ordering": true,
    "featured_products": true, "photo_reviews": true, "review_replies": true,
    "intermediate_metrics": true, "cart_abandonment": true, "peak_hours": true,
    "delivery_region_rules": true, "visual_reference_on_order": true,
    "visual_customization": true, "custom_colors": true, "custom_fonts": true,
    "custom_background": true, "custom_cover": true, "custom_logo": true,
    "custom_layout": true, "premium_gallery": true, "video_section": true,
    "theme_preview": true, "publish_theme": true, "restore_theme": true,
    "advanced_metrics": true, "commercial_insights": true, "benchmark": true,
    "pdf_reports": true, "delivery_reports": true, "market_trends": true,
    "consultive_reports": true, "action_plan": true,
    "promotions": true, "custom_branding": true, "gallery": true
  }'::jsonb, ARRAY['Tudo do Profissional','Personalização visual completa','Inteligência comercial','Benchmark','Relatórios premium'])
ON CONFLICT (name) DO UPDATE
  SET slug = EXCLUDED.slug,
      price_cents = EXCLUDED.price_cents,
      position = EXCLUDED.position,
      is_active = true,
      features_json = EXCLUDED.features_json,
      benefits = EXCLUDED.benefits;

-- Backfill establishment_owners for existing establishments with owner_id
INSERT INTO public.establishment_owners (user_id, establishment_id, role)
SELECT owner_id, id, 'owner' FROM public.establishments WHERE owner_id IS NOT NULL
ON CONFLICT (user_id, establishment_id) DO NOTHING;
