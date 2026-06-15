
-- 1. Drop broadly-public SELECT policies that exposed sensitive data
DROP POLICY IF EXISTS "Access address via private token" ON public.addresses;
DROP POLICY IF EXISTS "Access house reference via private token" ON public.house_references;
DROP POLICY IF EXISTS "Access media via private token" ON public.house_reference_media;
DROP POLICY IF EXISTS "Access visual reference link via token" ON public.order_visual_reference_links;
DROP POLICY IF EXISTS "Access by private token only" ON public.order_visual_reference_links;
DROP POLICY IF EXISTS "Public access to reference links by token" ON public.order_reference_share_links;
DROP POLICY IF EXISTS "Public access via token" ON public.order_reference_share_links;
DROP POLICY IF EXISTS "Public reads subscriptions" ON public.establishment_subscriptions;

-- 2. Establishment staff can view delivery addresses of their orders (replaces removed bypass)
CREATE POLICY "Establishment staff view delivery addresses"
  ON public.addresses FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.orders o
    JOIN public.establishments e ON e.id = o.establishment_id
    WHERE o.address_id = addresses.id
      AND (
        e.owner_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.establishment_owners eo
          WHERE eo.establishment_id = e.id AND eo.user_id = auth.uid()
        )
      )
  ));

-- 3. SECURITY DEFINER RPCs that validate token + expiration before returning data
CREATE OR REPLACE FUNCTION public.get_visual_reference_by_token(_token text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_link public.order_visual_reference_links%ROWTYPE;
BEGIN
  IF _token IS NULL OR length(_token) < 8 THEN RETURN NULL; END IF;
  SELECT * INTO v_link FROM public.order_visual_reference_links WHERE private_token = _token LIMIT 1;
  IF v_link.id IS NULL THEN RETURN NULL; END IF;
  IF v_link.expires_at IS NOT NULL AND v_link.expires_at < now() THEN RETURN NULL; END IF;

  RETURN jsonb_build_object(
    'link', to_jsonb(v_link),
    'order', (SELECT to_jsonb(o) FROM (
        SELECT tracking_code, customer_name, customer_phone, address_id
        FROM public.orders WHERE id = v_link.order_id
      ) o),
    'address', (SELECT to_jsonb(a) FROM (
        SELECT label, street, number, complement, neighborhood, city, zip,
               popular_location_name, reference
        FROM public.addresses WHERE id = v_link.address_id
      ) a),
    'reference', (
      SELECT jsonb_build_object(
        'id', hr.id, 'instructions', hr.instructions, 'updated_at', hr.updated_at,
        'media_urls', hr.media_urls, 'video_url', hr.video_url,
        'pin_1_description', hr.pin_1_description,
        'pin_2_description', hr.pin_2_description,
        'pin_3_description', hr.pin_3_description,
        'media', COALESCE((
          SELECT jsonb_agg(to_jsonb(m))
          FROM public.house_reference_media m
          WHERE m.house_reference_id = hr.id
        ), '[]'::jsonb)
      )
      FROM public.house_references hr WHERE hr.id = v_link.visual_reference_id
    )
  );
END $$;

REVOKE ALL ON FUNCTION public.get_visual_reference_by_token(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_visual_reference_by_token(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_share_link_by_token(_token text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_link public.order_reference_share_links%ROWTYPE;
BEGIN
  IF _token IS NULL OR length(_token) < 8 THEN RETURN NULL; END IF;
  SELECT * INTO v_link FROM public.order_reference_share_links WHERE private_token = _token LIMIT 1;
  IF v_link.id IS NULL THEN RETURN NULL; END IF;
  IF v_link.expires_at IS NOT NULL AND v_link.expires_at < now() THEN RETURN NULL; END IF;

  RETURN jsonb_build_object(
    'link', jsonb_build_object(
      'id', v_link.id,
      'order_id', v_link.order_id,
      'establishment_id', v_link.establishment_id,
      'expires_at', v_link.expires_at,
      'selected_media_json', v_link.selected_media_json,
      'created_at', v_link.created_at
    ),
    'order', (SELECT to_jsonb(o) FROM (
        SELECT tracking_code, customer_name, customer_phone, address_id, establishment_id
        FROM public.orders WHERE id = v_link.order_id
      ) o),
    'address', (SELECT to_jsonb(a) FROM (
        SELECT a2.label, a2.street, a2.number, a2.complement, a2.neighborhood, a2.city, a2.zip,
               a2.popular_location_name, a2.reference
        FROM public.addresses a2
        JOIN public.orders o ON o.address_id = a2.id
        WHERE o.id = v_link.order_id
      ) a),
    'reference', (
      SELECT jsonb_build_object(
        'id', hr.id, 'instructions', hr.instructions, 'updated_at', hr.updated_at,
        'media_urls', hr.media_urls, 'video_url', hr.video_url,
        'pin_1_description', hr.pin_1_description,
        'pin_2_description', hr.pin_2_description,
        'pin_3_description', hr.pin_3_description,
        'media', COALESCE((
          SELECT jsonb_agg(to_jsonb(m))
          FROM public.house_reference_media m
          WHERE m.house_reference_id = hr.id
        ), '[]'::jsonb)
      )
      FROM public.house_references hr
      JOIN public.orders o ON o.address_id = hr.address_id
      WHERE o.id = v_link.order_id LIMIT 1
    )
  );
END $$;

REVOKE ALL ON FUNCTION public.get_share_link_by_token(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_share_link_by_token(text) TO anon, authenticated;

-- 4. Plan info RPC replaces public reads on establishment_subscriptions
CREATE OR REPLACE FUNCTION public.get_establishment_plan_info(_estab_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'plan_id', p.id, 'plan_name', p.name, 'plan_slug', p.slug,
    'features_json', p.features_json, 'subscription_status', s.status
  ) INTO v_result
  FROM public.establishment_subscriptions s
  JOIN public.plans p ON p.id = s.plan_id
  WHERE s.establishment_id = _estab_id AND s.status IN ('active','trial')
  ORDER BY s.started_at DESC LIMIT 1;

  IF v_result IS NOT NULL THEN RETURN v_result; END IF;

  SELECT jsonb_build_object(
    'plan_id', p.id, 'plan_name', p.name, 'plan_slug', p.slug,
    'features_json', p.features_json, 'subscription_status', 'active'
  ) INTO v_result
  FROM public.establishments e
  JOIN public.plans p ON p.id = e.plan_id
  WHERE e.id = _estab_id LIMIT 1;

  RETURN v_result;
END $$;

REVOKE ALL ON FUNCTION public.get_establishment_plan_info(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_establishment_plan_info(uuid) TO anon, authenticated;

-- 5. Tighten storage policies for establishment media (verify ownership of folder)
DROP POLICY IF EXISTS "owners delete establishment media" ON storage.objects;
DROP POLICY IF EXISTS "owners update establishment media" ON storage.objects;
DROP POLICY IF EXISTS "owners upload establishment media" ON storage.objects;
DROP POLICY IF EXISTS "Public Read Access" ON storage.objects;
DROP POLICY IF EXISTS "public-media read" ON storage.objects;
DROP POLICY IF EXISTS "Auth Upload Access" ON storage.objects;
DROP POLICY IF EXISTS "Owner Manage Access" ON storage.objects;

CREATE POLICY "owners upload establishment media"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'public-media'
    AND (storage.foldername(name))[1] = 'establishments'
    AND EXISTS (
      SELECT 1 FROM public.establishments e
      WHERE e.id::text = (storage.foldername(name))[2]
        AND (
          e.owner_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.establishment_owners eo
            WHERE eo.establishment_id = e.id AND eo.user_id = auth.uid()
          )
        )
    )
  );

CREATE POLICY "owners update establishment media"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'public-media'
    AND (storage.foldername(name))[1] = 'establishments'
    AND EXISTS (
      SELECT 1 FROM public.establishments e
      WHERE e.id::text = (storage.foldername(name))[2]
        AND (
          e.owner_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.establishment_owners eo
            WHERE eo.establishment_id = e.id AND eo.user_id = auth.uid()
          )
        )
    )
  );

CREATE POLICY "owners delete establishment media"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'public-media'
    AND (storage.foldername(name))[1] = 'establishments'
    AND EXISTS (
      SELECT 1 FROM public.establishments e
      WHERE e.id::text = (storage.foldername(name))[2]
        AND (
          e.owner_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.establishment_owners eo
            WHERE eo.establishment_id = e.id AND eo.user_id = auth.uid()
          )
        )
    )
  );

-- Restricted listing for public-media (URL access still works because bucket is public)
CREATE POLICY "public-media owner list"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'public-media'
    AND (
      can_manage(auth.uid())
      OR (
        (storage.foldername(name))[1] = 'establishments'
        AND EXISTS (
          SELECT 1 FROM public.establishments e
          WHERE e.id::text = (storage.foldername(name))[2]
            AND (
              e.owner_id = auth.uid()
              OR EXISTS (
                SELECT 1 FROM public.establishment_owners eo
                WHERE eo.establishment_id = e.id AND eo.user_id = auth.uid()
              )
            )
        )
      )
    )
  );

-- 6. Revoke EXECUTE on trigger and admin-only functions from anon/authenticated
REVOKE EXECUTE ON FUNCTION public.seed_initial_data() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.ensure_official_admin() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_action(text, text, uuid, jsonb) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.create_notification(uuid, text, text, text, jsonb, uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.gen_tracking_code() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.touch_updated_at() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_establishment_owner() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.protect_stock_by_plan() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_order_tracking_code() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_updated_at() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.protect_menu_categories_by_plan() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.before_insert_establishment() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_house_reference_media_updated_at() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.protect_delivery_regions_by_plan() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_subscription_plan_change() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.protect_financial_by_plan() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.after_establishment_approval() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.protect_theme_premium_fields() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.protect_establishment_privileged_columns() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.protect_review_owner_columns() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_establishment_publication() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.protect_establishment_media_by_plan() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.protect_product_options_by_plan() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.protect_product_premium_fields() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_profile_update_notification() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.protect_team_by_plan() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.protect_establishment_premium_fields() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_order_message_notification() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_order_status_change_notification() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.make_unique_establishment_slug(text, uuid) FROM anon, authenticated;
