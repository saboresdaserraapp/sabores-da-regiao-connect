
-- 1) Orders INSERT: bind user_id to caller (or allow anonymous null)
DROP POLICY IF EXISTS "Anyone can create orders" ON public.orders;
CREATE POLICY "Anyone can create orders"
ON public.orders
FOR INSERT
TO anon, authenticated
WITH CHECK (user_id IS NULL OR user_id = auth.uid());

-- 2) Establishments: prevent owners from changing privileged columns via trigger
CREATE OR REPLACE FUNCTION public.protect_establishment_privileged_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.can_manage(auth.uid()) THEN
    RETURN NEW;
  END IF;
  -- non-manager (owner): force privileged columns back to their previous values
  NEW.status := OLD.status;
  NEW.plan_id := OLD.plan_id;
  NEW.owner_id := OLD.owner_id;
  NEW.suspended_reason := OLD.suspended_reason;
  NEW.menu_type := OLD.menu_type;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_establishment_privileged ON public.establishments;
CREATE TRIGGER trg_protect_establishment_privileged
BEFORE UPDATE ON public.establishments
FOR EACH ROW EXECUTE FUNCTION public.protect_establishment_privileged_columns();

-- 3) Reviews: owners may only change the 'reply' column
CREATE OR REPLACE FUNCTION public.protect_review_owner_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.can_manage(auth.uid()) THEN
    RETURN NEW;
  END IF;
  -- non-manager (owner of establishment): only 'reply' may change
  NEW.rating := OLD.rating;
  NEW.author := OLD.author;
  NEW.text := OLD.text;
  NEW.photo := OLD.photo;
  NEW.status := OLD.status;
  NEW.reported_count := OLD.reported_count;
  NEW.establishment_id := OLD.establishment_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_review_owner ON public.reviews;
CREATE TRIGGER trg_protect_review_owner
BEFORE UPDATE ON public.reviews
FOR EACH ROW EXECUTE FUNCTION public.protect_review_owner_columns();

-- 4) Restrict benchmark_metrics SELECT to admins or establishment owners
DROP POLICY IF EXISTS "Authenticated reads benchmarks" ON public.benchmark_metrics;
CREATE POLICY "Admins and owners read benchmarks"
ON public.benchmark_metrics
FOR SELECT
TO authenticated
USING (
  public.is_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.establishments e
    WHERE e.owner_id = auth.uid()
  )
);

-- 5) Fix search_path on gen_tracking_code
CREATE OR REPLACE FUNCTION public.gen_tracking_code()
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text := 'SDS-';
  i int;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(chars, 1 + floor(random() * length(chars))::int, 1);
  END LOOP;
  RETURN result;
END;
$$;
