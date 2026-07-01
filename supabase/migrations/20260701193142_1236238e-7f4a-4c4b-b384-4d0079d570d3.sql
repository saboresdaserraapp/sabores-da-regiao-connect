-- Normalize and validate tags on products before insert/update
CREATE OR REPLACE FUNCTION public.normalize_product_tags()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  raw_arr jsonb;
  cleaned text[];
  t text;
  norm text;
  seen text[] := ARRAY[]::text[];
BEGIN
  IF NEW.tags_json IS NULL THEN
    RETURN NEW;
  END IF;

  -- Coerce to jsonb array
  IF jsonb_typeof(NEW.tags_json) <> 'array' THEN
    NEW.tags_json := '[]'::jsonb;
    RETURN NEW;
  END IF;

  raw_arr := NEW.tags_json;
  cleaned := ARRAY[]::text[];

  FOR t IN SELECT jsonb_array_elements_text(raw_arr) LOOP
    -- lowercase, strip accents (best-effort), keep a-z 0-9 and hyphen
    norm := lower(unaccent(coalesce(t, '')));
    norm := regexp_replace(norm, '[^a-z0-9\s-]', '', 'g');
    norm := regexp_replace(trim(norm), '\s+', '-', 'g');
    norm := regexp_replace(norm, '-+', '-', 'g');
    norm := trim(both '-' from norm);
    IF length(norm) = 0 THEN CONTINUE; END IF;
    IF length(norm) > 30 THEN norm := substring(norm from 1 for 30); END IF;
    -- dedupe
    IF NOT (norm = ANY(seen)) THEN
      seen := array_append(seen, norm);
      cleaned := array_append(cleaned, norm);
    END IF;
    -- limit
    IF array_length(cleaned, 1) >= 10 THEN EXIT; END IF;
  END LOOP;

  NEW.tags_json := to_jsonb(cleaned);
  RETURN NEW;
END;
$$;

-- unaccent extension (may already exist)
CREATE EXTENSION IF NOT EXISTS unaccent;

DROP TRIGGER IF EXISTS trg_normalize_product_tags ON public.products;
CREATE TRIGGER trg_normalize_product_tags
  BEFORE INSERT OR UPDATE OF tags_json ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.normalize_product_tags();