
-- Backend enforcement of plan gating on additional tables
-- delivery_regions: requires 'delivery_regions' feature (owner can't add/edit without it)
CREATE OR REPLACE FUNCTION public.protect_delivery_regions_by_plan()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.can_manage(auth.uid()) THEN RETURN NEW; END IF;
  IF NOT public.has_feature(NEW.establishment_id, 'delivery_regions') THEN
    RAISE EXCEPTION 'Plano atual não permite criar ou editar regiões de entrega. Faça upgrade para o plano Essencial ou superior.'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_protect_delivery_regions_by_plan ON public.delivery_regions;
CREATE TRIGGER trg_protect_delivery_regions_by_plan
BEFORE INSERT OR UPDATE ON public.delivery_regions
FOR EACH ROW EXECUTE FUNCTION public.protect_delivery_regions_by_plan();

-- Themes: also gate INSERT (only update was gated before)
DROP TRIGGER IF EXISTS trg_protect_theme_premium_fields ON public.establishment_themes;
CREATE TRIGGER trg_protect_theme_premium_fields
BEFORE INSERT OR UPDATE ON public.establishment_themes
FOR EACH ROW EXECUTE FUNCTION public.protect_theme_premium_fields();

-- Ensure existing product trigger is attached (was defined but not attached)
DROP TRIGGER IF EXISTS trg_protect_product_premium_fields ON public.products;
CREATE TRIGGER trg_protect_product_premium_fields
BEFORE INSERT OR UPDATE ON public.products
FOR EACH ROW EXECUTE FUNCTION public.protect_product_premium_fields();

-- Ensure existing establishment trigger is attached
DROP TRIGGER IF EXISTS trg_protect_establishment_premium_fields ON public.establishments;
CREATE TRIGGER trg_protect_establishment_premium_fields
BEFORE UPDATE ON public.establishments
FOR EACH ROW EXECUTE FUNCTION public.protect_establishment_premium_fields();

-- Block adding new advanced product options (variations/combos) when plan disallows
CREATE OR REPLACE FUNCTION public.protect_product_options_by_plan()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE has_complex boolean;
BEGIN
  IF public.can_manage(auth.uid()) THEN RETURN NEW; END IF;
  -- consider "complex" if options has any item with type 'variation' or 'combo' or more than 5 options
  has_complex := COALESCE((SELECT jsonb_array_length(NEW.options) > 5), false)
    OR EXISTS (SELECT 1 FROM jsonb_array_elements(COALESCE(NEW.options,'[]'::jsonb)) o
               WHERE o->>'type' IN ('variation','combo','advanced'));
  IF has_complex AND NOT public.has_feature(NEW.establishment_id, 'advanced_addons') THEN
    IF TG_OP = 'UPDATE' THEN
      NEW.options := OLD.options;
    ELSE
      RAISE EXCEPTION 'Adicionais avançados/variações/combos exigem plano Profissional ou superior.'
        USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_protect_product_options_by_plan ON public.products;
CREATE TRIGGER trg_protect_product_options_by_plan
BEFORE INSERT OR UPDATE ON public.products
FOR EACH ROW EXECUTE FUNCTION public.protect_product_options_by_plan();
