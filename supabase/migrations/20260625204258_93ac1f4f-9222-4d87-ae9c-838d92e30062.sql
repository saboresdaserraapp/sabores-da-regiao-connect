CREATE OR REPLACE FUNCTION public.before_insert_establishment()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.slug IS NULL OR length(trim(NEW.slug)) = 0 OR NEW.slug !~ '^[a-z0-9-]+$' THEN
    NEW.slug := public.make_unique_establishment_slug(NEW.name, NEW.id);
  ELSE
    NEW.slug := public.slugify(NEW.slug);
    IF EXISTS (SELECT 1 FROM public.establishments WHERE slug = NEW.slug) THEN
      NEW.slug := public.make_unique_establishment_slug(NEW.slug, NEW.id);
    END IF;
  END IF;
  IF NEW.approval_status IS NULL THEN
    NEW.approval_status := 'pending_approval';
  END IF;

  -- Publica automaticamente quando criada já aprovada e ativa
  IF NEW.approval_status = 'approved' AND COALESCE(NEW.status, 'ativo') = 'ativo' THEN
    NEW.is_public := true;
    IF NEW.approved_at IS NULL THEN NEW.approved_at := now(); END IF;
    IF NEW.published_at IS NULL THEN NEW.published_at := now(); END IF;
  ELSE
    NEW.is_public := false;
  END IF;

  RETURN NEW;
END $function$;