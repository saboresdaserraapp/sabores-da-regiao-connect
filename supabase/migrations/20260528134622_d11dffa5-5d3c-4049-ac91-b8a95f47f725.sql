
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (new.id, coalesce(new.raw_user_meta_data->>'display_name', new.email));
  RETURN new;
END; $$;

CREATE OR REPLACE FUNCTION public.ensure_official_admin()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_uid uuid;
BEGIN
  SELECT id INTO v_uid FROM auth.users WHERE lower(email) = 'saboresdaserraapp@gmail.com' LIMIT 1;
  IF v_uid IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (v_uid, 'super_admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  DELETE FROM public.user_roles
  WHERE role IN ('super_admin','admin_operacional','analista_comercial','suporte')
    AND (v_uid IS NULL OR user_id <> v_uid);
END; $$;

SELECT public.ensure_official_admin();

ALTER TABLE public.establishments DISABLE TRIGGER USER;
ALTER TABLE public.establishment_subscriptions DISABLE TRIGGER USER;

UPDATE public.establishments
SET plan_id = (SELECT id FROM public.plans WHERE slug = 'gestao_premium' LIMIT 1)
WHERE plan_id IN (SELECT id FROM public.plans WHERE slug NOT IN ('presenca','essencial','profissional','gestao_premium') OR slug IS NULL);

UPDATE public.establishment_subscriptions
SET plan_id = (SELECT id FROM public.plans WHERE slug = 'gestao_premium' LIMIT 1)
WHERE plan_id IN (SELECT id FROM public.plans WHERE slug NOT IN ('presenca','essencial','profissional','gestao_premium') OR slug IS NULL);

DELETE FROM public.plans
WHERE slug IS NULL OR slug NOT IN ('presenca','essencial','profissional','gestao_premium');

ALTER TABLE public.establishments ENABLE TRIGGER USER;
ALTER TABLE public.establishment_subscriptions ENABLE TRIGGER USER;

UPDATE public.plans SET features_json = '{
  "basic_info":true,"opening_hours":true,"social_links":true,
  "basic_menu":true,"product_management_basic":true,
  "delivery_to_confirm":true,"pickup_enabled":true,"dine_in_enabled":true,
  "receive_whatsapp_orders":true,"basic_orders_panel":true,"basic_reviews":true
}'::jsonb WHERE slug = 'presenca';

UPDATE public.plans SET features_json = '{
  "basic_info":true,"opening_hours":true,"social_links":true,
  "basic_menu":true,"product_management_basic":true,
  "delivery_to_confirm":true,"pickup_enabled":true,"dine_in_enabled":true,
  "receive_whatsapp_orders":true,"basic_orders_panel":true,"basic_reviews":true,
  "product_photos":true,"simple_addons":true,"simple_promotions":true,
  "delivery_fixed_fee":true,"delivery_regions":true,
  "basic_metrics":true,"whatsapp_clicks":true,"product_views":true
}'::jsonb WHERE slug = 'essencial';

UPDATE public.plans SET features_json = '{
  "basic_info":true,"opening_hours":true,"social_links":true,
  "basic_menu":true,"product_management_basic":true,
  "delivery_to_confirm":true,"pickup_enabled":true,"dine_in_enabled":true,
  "receive_whatsapp_orders":true,"basic_orders_panel":true,"basic_reviews":true,
  "product_photos":true,"simple_addons":true,"simple_promotions":true,
  "delivery_fixed_fee":true,"delivery_regions":true,
  "basic_metrics":true,"whatsapp_clicks":true,"product_views":true,
  "advanced_addons":true,"product_variations":true,"combos":true,
  "advanced_promotions":true,"category_ordering":true,"product_ordering":true,
  "featured_products":true,"photo_reviews":true,"review_replies":true,
  "intermediate_metrics":true,"cart_abandonment":true,"peak_hours":true,
  "delivery_region_rules":true,"visual_reference_on_order":true,"gallery":true
}'::jsonb WHERE slug = 'profissional';

UPDATE public.plans SET features_json = '{
  "basic_info":true,"opening_hours":true,"social_links":true,
  "basic_menu":true,"product_management_basic":true,
  "delivery_to_confirm":true,"pickup_enabled":true,"dine_in_enabled":true,
  "receive_whatsapp_orders":true,"basic_orders_panel":true,"basic_reviews":true,
  "product_photos":true,"simple_addons":true,"simple_promotions":true,
  "delivery_fixed_fee":true,"delivery_regions":true,
  "basic_metrics":true,"whatsapp_clicks":true,"product_views":true,
  "advanced_addons":true,"product_variations":true,"combos":true,
  "advanced_promotions":true,"category_ordering":true,"product_ordering":true,
  "featured_products":true,"photo_reviews":true,"review_replies":true,
  "intermediate_metrics":true,"cart_abandonment":true,"peak_hours":true,
  "delivery_region_rules":true,"visual_reference_on_order":true,
  "gallery":true,"premium_gallery":true,"video_section":true,
  "visual_customization":true,"custom_colors":true,"custom_fonts":true,
  "custom_background":true,"custom_cover":true,"custom_logo":true,"custom_layout":true,
  "theme_preview":true,"publish_theme":true,"restore_theme":true,
  "advanced_metrics":true,"commercial_insights":true,"benchmark":true,
  "pdf_reports":true,"delivery_reports":true,"market_trends":true,
  "consultive_reports":true,"action_plan":true
}'::jsonb WHERE slug = 'gestao_premium';

CREATE OR REPLACE FUNCTION public.protect_establishment_premium_fields()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF public.can_manage(auth.uid()) THEN RETURN NEW; END IF;
  IF NEW.gallery IS DISTINCT FROM OLD.gallery AND NOT public.has_feature(NEW.id, 'gallery') THEN NEW.gallery := OLD.gallery; END IF;
  IF NEW.brand_color IS DISTINCT FROM OLD.brand_color AND NOT public.has_feature(NEW.id, 'visual_customization') THEN NEW.brand_color := OLD.brand_color; END IF;
  IF NEW.story IS DISTINCT FROM OLD.story AND NOT public.has_feature(NEW.id, 'gallery') THEN NEW.story := OLD.story; END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.protect_theme_premium_fields()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF public.can_manage(auth.uid()) THEN RETURN NEW; END IF;
  IF NOT public.has_feature(NEW.establishment_id, 'visual_customization') THEN
    IF TG_OP = 'UPDATE' THEN RETURN OLD;
    ELSE RAISE EXCEPTION 'Plano atual não permite personalizar o tema da loja.';
    END IF;
  END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.protect_product_premium_fields()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF public.can_manage(auth.uid()) THEN RETURN NEW; END IF;
  IF TG_OP = 'INSERT' THEN
    IF NEW.featured AND NOT public.has_feature(NEW.establishment_id, 'featured_products') THEN NEW.featured := false; END IF;
    IF NEW.promo AND NOT public.has_feature(NEW.establishment_id, 'simple_promotions') THEN NEW.promo := false; END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.featured IS DISTINCT FROM OLD.featured AND NEW.featured AND NOT public.has_feature(NEW.establishment_id, 'featured_products') THEN NEW.featured := OLD.featured; END IF;
    IF NEW.promo IS DISTINCT FROM OLD.promo AND NEW.promo AND NOT public.has_feature(NEW.establishment_id, 'simple_promotions') THEN NEW.promo := OLD.promo; END IF;
  END IF;
  RETURN NEW;
END; $$;
