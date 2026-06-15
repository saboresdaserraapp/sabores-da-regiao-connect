
-- 1) Banner placement enum
DO $$ BEGIN
  CREATE TYPE public.banner_placement AS ENUM ('home_top','home_mid','category_top','category_mid','establishment_menu','loja_top');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 2) Extend banners
ALTER TABLE public.banners
  ADD COLUMN IF NOT EXISTS placement public.banner_placement NOT NULL DEFAULT 'home_top',
  ADD COLUMN IF NOT EXISTS category_key text,
  ADD COLUMN IF NOT EXISTS establishment_id uuid,
  ADD COLUMN IF NOT EXISTS media_type text NOT NULL DEFAULT 'image',
  ADD COLUMN IF NOT EXISTS cta_label text,
  ADD COLUMN IF NOT EXISTS paid_by_establishment_id uuid,
  ADD COLUMN IF NOT EXISTS priority integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS impressions integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS clicks integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_banners_placement_active ON public.banners(placement, active);
CREATE INDEX IF NOT EXISTS idx_banners_category_key ON public.banners(category_key);
CREATE INDEX IF NOT EXISTS idx_banners_establishment_id ON public.banners(establishment_id);

-- 3) establishment_themes table
CREATE TABLE IF NOT EXISTS public.establishment_themes (
  establishment_id uuid PRIMARY KEY,
  background_color text,
  background_image text,
  background_opacity integer NOT NULL DEFAULT 100,
  background_blur integer NOT NULL DEFAULT 0,
  accent_color text,
  header_style text NOT NULL DEFAULT 'gradient',
  font_pair text NOT NULL DEFAULT 'modern',
  card_style text NOT NULL DEFAULT 'elevated',
  show_story boolean NOT NULL DEFAULT true,
  show_gallery boolean NOT NULL DEFAULT true,
  show_reviews_inline boolean NOT NULL DEFAULT true,
  menu_banners jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.establishment_themes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public reads themes of active estabs" ON public.establishment_themes;
CREATE POLICY "Public reads themes of active estabs"
ON public.establishment_themes FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.establishments e
    WHERE e.id = establishment_themes.establishment_id
      AND (e.status = 'ativo'::establishment_status OR public.is_admin(auth.uid()) OR e.owner_id = auth.uid())
  )
);

DROP POLICY IF EXISTS "Owner manages own theme" ON public.establishment_themes;
CREATE POLICY "Owner manages own theme"
ON public.establishment_themes FOR ALL
USING (EXISTS (SELECT 1 FROM public.establishments e WHERE e.id = establishment_themes.establishment_id AND e.owner_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.establishments e WHERE e.id = establishment_themes.establishment_id AND e.owner_id = auth.uid()));

DROP POLICY IF EXISTS "Managers manage themes" ON public.establishment_themes;
CREATE POLICY "Managers manage themes"
ON public.establishment_themes FOR ALL
USING (public.can_manage(auth.uid()))
WITH CHECK (public.can_manage(auth.uid()));

-- updated_at trigger reuse
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS trg_themes_touch ON public.establishment_themes;
CREATE TRIGGER trg_themes_touch BEFORE UPDATE ON public.establishment_themes
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 4) RPC to increment banner metric
CREATE OR REPLACE FUNCTION public.increment_banner_metric(_banner_id uuid, _field text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _field NOT IN ('impressions','clicks') THEN
    RAISE EXCEPTION 'invalid field';
  END IF;
  IF _field = 'impressions' THEN
    UPDATE public.banners SET impressions = impressions + 1 WHERE id = _banner_id;
  ELSE
    UPDATE public.banners SET clicks = clicks + 1 WHERE id = _banner_id;
  END IF;
END $$;

GRANT EXECUTE ON FUNCTION public.increment_banner_metric(uuid, text) TO anon, authenticated;
