
-- 1. Add new columns to establishments
ALTER TABLE public.establishments
  ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS published_at timestamptz;

CREATE INDEX IF NOT EXISTS establishments_is_public_idx ON public.establishments(is_public);

-- Backfill is_public for already-approved stores
UPDATE public.establishments
   SET is_public = true,
       approved_at = COALESCE(approved_at, updated_at),
       published_at = COALESCE(published_at, updated_at)
 WHERE approval_status = 'approved' AND status = 'ativo';

-- 2. Slugify helpers
CREATE OR REPLACE FUNCTION public.slugify(_t text)
RETURNS text
LANGUAGE sql IMMUTABLE
AS $$
  SELECT trim(both '-' from
    regexp_replace(
      regexp_replace(
        lower(public.unaccent_safe(coalesce(_t,''))),
        '[^a-z0-9]+', '-', 'g'
      ),
      '-+', '-', 'g'
    )
  );
$$;

CREATE OR REPLACE FUNCTION public.make_unique_establishment_slug(_name text, _self_id uuid)
RETURNS text
LANGUAGE plpgsql STABLE
SET search_path = public
AS $$
DECLARE
  base text := public.slugify(_name);
  candidate text;
  n int := 1;
BEGIN
  IF base IS NULL OR length(base) = 0 THEN base := 'loja'; END IF;
  candidate := base;
  WHILE EXISTS (
    SELECT 1 FROM public.establishments
     WHERE slug = candidate
       AND (_self_id IS NULL OR id <> _self_id)
  ) LOOP
    n := n + 1;
    candidate := base || '-' || n::text;
  END LOOP;
  RETURN candidate;
END $$;

-- 3. BEFORE INSERT trigger: ensure friendly slug + default approval_status
CREATE OR REPLACE FUNCTION public.before_insert_establishment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.slug IS NULL OR length(trim(NEW.slug)) = 0 OR NEW.slug !~ '^[a-z0-9-]+$' THEN
    NEW.slug := public.make_unique_establishment_slug(NEW.name, NEW.id);
  ELSE
    -- normalize then ensure unique
    NEW.slug := public.slugify(NEW.slug);
    IF EXISTS (SELECT 1 FROM public.establishments WHERE slug = NEW.slug) THEN
      NEW.slug := public.make_unique_establishment_slug(NEW.slug, NEW.id);
    END IF;
  END IF;
  IF NEW.approval_status IS NULL THEN
    NEW.approval_status := 'pending_approval';
  END IF;
  -- new stores never public until approval
  NEW.is_public := false;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_before_insert_establishment ON public.establishments;
CREATE TRIGGER trg_before_insert_establishment
  BEFORE INSERT ON public.establishments
  FOR EACH ROW EXECUTE FUNCTION public.before_insert_establishment();

-- 4. BEFORE UPDATE trigger: keep is_public in sync with approval_status + timestamps
CREATE OR REPLACE FUNCTION public.sync_establishment_publication()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.approval_status IS DISTINCT FROM OLD.approval_status THEN
    IF NEW.approval_status = 'approved' THEN
      NEW.is_public := true;
      NEW.status := 'ativo';
      IF NEW.approved_at IS NULL THEN NEW.approved_at := now(); END IF;
      IF NEW.approved_by IS NULL THEN NEW.approved_by := auth.uid(); END IF;
      IF NEW.published_at IS NULL THEN NEW.published_at := now(); END IF;
    ELSE
      NEW.is_public := false;
      IF NEW.approval_status = 'suspended' THEN NEW.status := 'suspenso'; END IF;
      IF NEW.approval_status IN ('pending_approval','correction_requested','rejected','inactive')
         AND NEW.status = 'ativo' THEN
        NEW.status := 'pendente';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_sync_establishment_publication ON public.establishments;
CREATE TRIGGER trg_sync_establishment_publication
  BEFORE UPDATE ON public.establishments
  FOR EACH ROW EXECUTE FUNCTION public.sync_establishment_publication();

-- 5. Approval log table
CREATE TABLE IF NOT EXISTS public.establishment_approval_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  establishment_id uuid NOT NULL REFERENCES public.establishments(id) ON DELETE CASCADE,
  action text NOT NULL,
  admin_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  notes text,
  old_status text,
  new_status text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.establishment_approval_logs TO authenticated;
GRANT ALL ON public.establishment_approval_logs TO service_role;

ALTER TABLE public.establishment_approval_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins read all approval logs" ON public.establishment_approval_logs;
CREATE POLICY "admins read all approval logs"
  ON public.establishment_approval_logs FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "owners read own approval logs" ON public.establishment_approval_logs;
CREATE POLICY "owners read own approval logs"
  ON public.establishment_approval_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.establishments e
       WHERE e.id = establishment_approval_logs.establishment_id
         AND (e.owner_id = auth.uid()
              OR EXISTS (SELECT 1 FROM public.establishment_owners eo
                          WHERE eo.establishment_id = e.id AND eo.user_id = auth.uid()))
    )
  );

CREATE INDEX IF NOT EXISTS approval_logs_estab_idx ON public.establishment_approval_logs(establishment_id, created_at DESC);

-- 6. AFTER UPDATE trigger: on approval seed defaults + log
CREATE OR REPLACE FUNCTION public.after_establishment_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_default_plan uuid;
  v_cat text;
  v_pos int := 0;
  v_default_cats text[] := ARRAY['Mais vendidos','Promoções','Lanches','Bebidas','Sobremesas'];
BEGIN
  IF NEW.approval_status IS DISTINCT FROM OLD.approval_status THEN
    INSERT INTO public.establishment_approval_logs (establishment_id, action, admin_id, old_status, new_status)
    VALUES (NEW.id, NEW.approval_status, auth.uid(), OLD.approval_status, NEW.approval_status);
  END IF;

  IF NEW.approval_status = 'approved'
     AND OLD.approval_status IS DISTINCT FROM 'approved' THEN

    -- Ensure plan
    IF NEW.plan_id IS NULL THEN
      SELECT id INTO v_default_plan FROM public.plans WHERE slug = 'presenca' LIMIT 1;
      IF v_default_plan IS NOT NULL THEN
        UPDATE public.establishments SET plan_id = v_default_plan WHERE id = NEW.id;
        NEW.plan_id := v_default_plan;
      END IF;
    END IF;

    -- Ensure active subscription
    IF NEW.plan_id IS NOT NULL
       AND NOT EXISTS (
         SELECT 1 FROM public.establishment_subscriptions
          WHERE establishment_id = NEW.id AND status IN ('active','trial')
       ) THEN
      INSERT INTO public.establishment_subscriptions (establishment_id, plan_id, status)
      VALUES (NEW.id, NEW.plan_id, 'active');
    END IF;

    -- Seed default menu categories
    IF NOT EXISTS (SELECT 1 FROM public.menu_categories WHERE establishment_id = NEW.id) THEN
      FOREACH v_cat IN ARRAY v_default_cats LOOP
        v_pos := v_pos + 1;
        INSERT INTO public.menu_categories (establishment_id, name, position)
        VALUES (NEW.id, v_cat, v_pos);
      END LOOP;
    END IF;
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_after_establishment_approval ON public.establishments;
CREATE TRIGGER trg_after_establishment_approval
  AFTER UPDATE ON public.establishments
  FOR EACH ROW EXECUTE FUNCTION public.after_establishment_approval();
