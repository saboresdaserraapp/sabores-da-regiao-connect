
-- Trigger: protect premium fields on establishments
CREATE OR REPLACE FUNCTION public.protect_establishment_premium_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.can_manage(auth.uid()) THEN
    RETURN NEW;
  END IF;
  IF NEW.gallery IS DISTINCT FROM OLD.gallery AND NOT public.has_feature(NEW.id, 'gallery') THEN
    NEW.gallery := OLD.gallery;
  END IF;
  IF NEW.brand_color IS DISTINCT FROM OLD.brand_color AND NOT public.has_feature(NEW.id, 'custom_branding') THEN
    NEW.brand_color := OLD.brand_color;
  END IF;
  IF NEW.story IS DISTINCT FROM OLD.story AND NOT public.has_feature(NEW.id, 'gallery') THEN
    NEW.story := OLD.story;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_establishment_premium_fields ON public.establishments;
CREATE TRIGGER trg_protect_establishment_premium_fields
BEFORE UPDATE ON public.establishments
FOR EACH ROW EXECUTE FUNCTION public.protect_establishment_premium_fields();

-- Trigger: protect premium fields on products
CREATE OR REPLACE FUNCTION public.protect_product_premium_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.can_manage(auth.uid()) THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'INSERT' THEN
    IF NEW.featured AND NOT public.has_feature(NEW.establishment_id, 'featured_products') THEN
      NEW.featured := false;
    END IF;
    IF NEW.promo AND NOT public.has_feature(NEW.establishment_id, 'promotions') THEN
      NEW.promo := false;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.featured IS DISTINCT FROM OLD.featured AND NEW.featured AND NOT public.has_feature(NEW.establishment_id, 'featured_products') THEN
      NEW.featured := OLD.featured;
    END IF;
    IF NEW.promo IS DISTINCT FROM OLD.promo AND NEW.promo AND NOT public.has_feature(NEW.establishment_id, 'promotions') THEN
      NEW.promo := OLD.promo;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_product_premium_fields ON public.products;
CREATE TRIGGER trg_protect_product_premium_fields
BEFORE INSERT OR UPDATE ON public.products
FOR EACH ROW EXECUTE FUNCTION public.protect_product_premium_fields();

-- Trigger: protect establishment_themes (requires custom_branding)
CREATE OR REPLACE FUNCTION public.protect_theme_premium_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.can_manage(auth.uid()) THEN
    RETURN NEW;
  END IF;
  IF NOT public.has_feature(NEW.establishment_id, 'custom_branding') THEN
    IF TG_OP = 'UPDATE' THEN
      RETURN OLD;
    ELSE
      RAISE EXCEPTION 'Plano atual não permite personalizar o tema da loja.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_theme_premium_fields ON public.establishment_themes;
CREATE TRIGGER trg_protect_theme_premium_fields
BEFORE INSERT OR UPDATE ON public.establishment_themes
FOR EACH ROW EXECUTE FUNCTION public.protect_theme_premium_fields();
