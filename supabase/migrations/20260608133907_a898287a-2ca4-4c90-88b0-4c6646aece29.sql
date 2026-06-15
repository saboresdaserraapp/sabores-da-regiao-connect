
-- ============================================
-- 1. Update plans.features_json with new keys
-- ============================================
UPDATE public.plans SET features_json = features_json || jsonb_build_object(
  'financial_basic', false,
  'financial_advanced', false,
  'stock_basic', false,
  'stock_advanced', false,
  'media_gallery', false,
  'media_video', false,
  'team_basic', false,
  'team_permissions', false
) WHERE slug = 'presenca';

UPDATE public.plans SET features_json = features_json || jsonb_build_object(
  'financial_basic', true,
  'financial_advanced', false,
  'stock_basic', true,
  'stock_advanced', false,
  'media_gallery', false,
  'media_video', false,
  'team_basic', false,
  'team_permissions', false
) WHERE slug = 'essencial';

UPDATE public.plans SET features_json = features_json || jsonb_build_object(
  'financial_basic', true,
  'financial_advanced', false,
  'stock_basic', true,
  'stock_advanced', true,
  'media_gallery', true,
  'media_video', false,
  'team_basic', true,
  'team_permissions', false
) WHERE slug = 'profissional';

UPDATE public.plans SET features_json = features_json || jsonb_build_object(
  'financial_basic', true,
  'financial_advanced', true,
  'stock_basic', true,
  'stock_advanced', true,
  'media_gallery', true,
  'media_video', true,
  'team_basic', true,
  'team_permissions', true
) WHERE slug = 'gestao_premium';

-- ============================================
-- 2. New columns on establishments (media)
-- ============================================
ALTER TABLE public.establishments
  ADD COLUMN IF NOT EXISTS video_url text,
  ADD COLUMN IF NOT EXISTS ambient_photos jsonb NOT NULL DEFAULT '[]'::jsonb;

-- ============================================
-- 3. Order status: add new values
-- ============================================
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'aguardando_confirmacao';
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'confirmado_manual';
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'cliente_nao_respondeu';
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'endereco_dificil';
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'precisa_referencia';

-- ============================================
-- 4. product_stock
-- ============================================
CREATE TABLE IF NOT EXISTS public.product_stock (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  establishment_id uuid NOT NULL REFERENCES public.establishments(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity integer NOT NULL DEFAULT 0,
  min_quantity integer NOT NULL DEFAULT 0,
  pause_on_zero boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(product_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_stock TO authenticated;
GRANT ALL ON public.product_stock TO service_role;

ALTER TABLE public.product_stock ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage product_stock" ON public.product_stock
  FOR ALL TO authenticated
  USING (public.can_manage(auth.uid()))
  WITH CHECK (public.can_manage(auth.uid()));

CREATE POLICY "Owners manage product_stock" ON public.product_stock
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.establishments e WHERE e.id = product_stock.establishment_id AND e.owner_id = auth.uid())
      OR EXISTS (SELECT 1 FROM public.establishment_owners m WHERE m.establishment_id = product_stock.establishment_id AND m.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.establishments e WHERE e.id = product_stock.establishment_id AND e.owner_id = auth.uid())
      OR EXISTS (SELECT 1 FROM public.establishment_owners m WHERE m.establishment_id = product_stock.establishment_id AND m.user_id = auth.uid()));

CREATE TRIGGER trg_product_stock_touch BEFORE UPDATE ON public.product_stock
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============================================
-- 5. stock_movements
-- ============================================
CREATE TABLE IF NOT EXISTS public.stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  establishment_id uuid NOT NULL REFERENCES public.establishments(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  delta integer NOT NULL,
  reason text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.stock_movements TO authenticated;
GRANT ALL ON public.stock_movements TO service_role;

ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage stock_movements" ON public.stock_movements
  FOR ALL TO authenticated
  USING (public.can_manage(auth.uid()))
  WITH CHECK (public.can_manage(auth.uid()));

CREATE POLICY "Owners manage stock_movements" ON public.stock_movements
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.establishments e WHERE e.id = stock_movements.establishment_id AND e.owner_id = auth.uid())
      OR EXISTS (SELECT 1 FROM public.establishment_owners m WHERE m.establishment_id = stock_movements.establishment_id AND m.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.establishments e WHERE e.id = stock_movements.establishment_id AND e.owner_id = auth.uid())
      OR EXISTS (SELECT 1 FROM public.establishment_owners m WHERE m.establishment_id = stock_movements.establishment_id AND m.user_id = auth.uid()));

-- ============================================
-- 6. order_financial_marks
-- ============================================
CREATE TABLE IF NOT EXISTS public.order_financial_marks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL UNIQUE REFERENCES public.orders(id) ON DELETE CASCADE,
  establishment_id uuid NOT NULL REFERENCES public.establishments(id) ON DELETE CASCADE,
  paid_status text NOT NULL DEFAULT 'pendente', -- pendente | recebido | cancelado
  paid_at timestamptz,
  payment_method_real text,
  amount_received numeric,
  notes text,
  marked_by uuid,
  marked_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_financial_marks TO authenticated;
GRANT ALL ON public.order_financial_marks TO service_role;

ALTER TABLE public.order_financial_marks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage financial_marks" ON public.order_financial_marks
  FOR ALL TO authenticated
  USING (public.can_manage(auth.uid()))
  WITH CHECK (public.can_manage(auth.uid()));

CREATE POLICY "Owners manage financial_marks" ON public.order_financial_marks
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.establishments e WHERE e.id = order_financial_marks.establishment_id AND e.owner_id = auth.uid())
      OR EXISTS (SELECT 1 FROM public.establishment_owners m WHERE m.establishment_id = order_financial_marks.establishment_id AND m.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.establishments e WHERE e.id = order_financial_marks.establishment_id AND e.owner_id = auth.uid())
      OR EXISTS (SELECT 1 FROM public.establishment_owners m WHERE m.establishment_id = order_financial_marks.establishment_id AND m.user_id = auth.uid()));

CREATE TRIGGER trg_order_financial_marks_touch BEFORE UPDATE ON public.order_financial_marks
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============================================
-- 7. Plan-gating triggers
-- ============================================
CREATE OR REPLACE FUNCTION public.protect_stock_by_plan()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.can_manage(auth.uid()) THEN RETURN NEW; END IF;
  IF NOT public.has_feature(NEW.establishment_id, 'stock_basic') THEN
    RAISE EXCEPTION 'Plano atual não permite controle de estoque. Faça upgrade para o plano Essencial ou superior.'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_protect_stock_plan BEFORE INSERT OR UPDATE ON public.product_stock
  FOR EACH ROW EXECUTE FUNCTION public.protect_stock_by_plan();

CREATE TRIGGER trg_protect_stock_mov_plan BEFORE INSERT OR UPDATE ON public.stock_movements
  FOR EACH ROW EXECUTE FUNCTION public.protect_stock_by_plan();

CREATE OR REPLACE FUNCTION public.protect_financial_by_plan()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.can_manage(auth.uid()) THEN RETURN NEW; END IF;
  IF NOT public.has_feature(NEW.establishment_id, 'financial_basic') THEN
    RAISE EXCEPTION 'Plano atual não permite marcações financeiras. Faça upgrade para o plano Essencial ou superior.'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_protect_financial_plan BEFORE INSERT OR UPDATE ON public.order_financial_marks
  FOR EACH ROW EXECUTE FUNCTION public.protect_financial_by_plan();

CREATE OR REPLACE FUNCTION public.protect_team_by_plan()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.can_manage(auth.uid()) THEN RETURN NEW; END IF;
  IF NEW.role = 'owner' THEN RETURN NEW; END IF;
  IF NOT public.has_feature(NEW.establishment_id, 'team_basic') THEN
    RAISE EXCEPTION 'Adicionar equipe exige plano Profissional ou superior.'
      USING ERRCODE = '42501';
  END IF;
  IF NEW.role IN ('attendant','menu_editor','finance')
     AND NOT public.has_feature(NEW.establishment_id, 'team_permissions') THEN
    RAISE EXCEPTION 'Papéis avançados de equipe exigem plano Gestão Premium.'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_protect_team_plan ON public.establishment_owners;
CREATE TRIGGER trg_protect_team_plan BEFORE INSERT OR UPDATE ON public.establishment_owners
  FOR EACH ROW EXECUTE FUNCTION public.protect_team_by_plan();

CREATE OR REPLACE FUNCTION public.protect_establishment_media_by_plan()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.can_manage(auth.uid()) THEN RETURN NEW; END IF;
  IF NEW.video_url IS DISTINCT FROM OLD.video_url
     AND NEW.video_url IS NOT NULL
     AND NOT public.has_feature(NEW.id, 'media_video') THEN
    NEW.video_url := OLD.video_url;
  END IF;
  IF NEW.ambient_photos IS DISTINCT FROM OLD.ambient_photos
     AND NOT public.has_feature(NEW.id, 'media_gallery') THEN
    NEW.ambient_photos := OLD.ambient_photos;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_protect_estab_media_plan ON public.establishments;
CREATE TRIGGER trg_protect_estab_media_plan BEFORE UPDATE ON public.establishments
  FOR EACH ROW EXECUTE FUNCTION public.protect_establishment_media_by_plan();

CREATE OR REPLACE FUNCTION public.protect_menu_categories_by_plan()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.can_manage(auth.uid()) THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND NEW.position IS DISTINCT FROM OLD.position
     AND NOT public.has_feature(NEW.establishment_id, 'category_ordering') THEN
    NEW.position := OLD.position;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_protect_menu_cat_plan ON public.menu_categories;
CREATE TRIGGER trg_protect_menu_cat_plan BEFORE UPDATE ON public.menu_categories
  FOR EACH ROW EXECUTE FUNCTION public.protect_menu_categories_by_plan();
