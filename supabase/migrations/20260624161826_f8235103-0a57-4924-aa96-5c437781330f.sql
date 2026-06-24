
-- 1) Audit log table
CREATE TABLE public.admin_convite_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL,
  action text NOT NULL,
  params jsonb NOT NULL DEFAULT '{}'::jsonb,
  result jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX admin_convite_audit_logs_admin_id_idx ON public.admin_convite_audit_logs (admin_id, created_at DESC);
CREATE INDEX admin_convite_audit_logs_action_idx ON public.admin_convite_audit_logs (action, created_at DESC);

GRANT SELECT, INSERT ON public.admin_convite_audit_logs TO authenticated;
GRANT ALL ON public.admin_convite_audit_logs TO service_role;

ALTER TABLE public.admin_convite_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read convite audit logs"
  ON public.admin_convite_audit_logs FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can write their own convite audit logs"
  ON public.admin_convite_audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin(auth.uid()) AND admin_id = auth.uid());

-- 2) Export jobs table
CREATE TABLE public.signup_invite_export_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'queued',
  filters jsonb NOT NULL DEFAULT '{}'::jsonb,
  total integer NOT NULL DEFAULT 0,
  done integer NOT NULL DEFAULT 0,
  progress_pct integer NOT NULL DEFAULT 0,
  csv_path text,
  download_url text,
  download_url_expires_at timestamptz,
  error text,
  finished_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT signup_invite_export_jobs_status_chk
    CHECK (status IN ('queued','running','done','error','canceled'))
);
CREATE INDEX signup_invite_export_jobs_admin_idx ON public.signup_invite_export_jobs (admin_id, created_at DESC);
CREATE INDEX signup_invite_export_jobs_status_idx ON public.signup_invite_export_jobs (status, created_at DESC);

GRANT SELECT, INSERT, UPDATE ON public.signup_invite_export_jobs TO authenticated;
GRANT ALL ON public.signup_invite_export_jobs TO service_role;

ALTER TABLE public.signup_invite_export_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read export jobs"
  ON public.signup_invite_export_jobs FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()) AND (admin_id = auth.uid() OR public.is_admin(auth.uid())));

CREATE POLICY "Admins create their own export jobs"
  ON public.signup_invite_export_jobs FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin(auth.uid()) AND admin_id = auth.uid());

CREATE POLICY "Admins update their own export jobs"
  ON public.signup_invite_export_jobs FOR UPDATE
  TO authenticated
  USING (public.is_admin(auth.uid()) AND admin_id = auth.uid())
  WITH CHECK (public.is_admin(auth.uid()) AND admin_id = auth.uid());

CREATE TRIGGER signup_invite_export_jobs_touch
  BEFORE UPDATE ON public.signup_invite_export_jobs
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 3) Server-side search RPC
CREATE OR REPLACE FUNCTION public.search_signup_invites(
  _start timestamptz,
  _end   timestamptz,
  _campaign text DEFAULT NULL,
  _q text DEFAULT NULL,
  _sort text DEFAULT 'dismissed_at',
  _dir  text DEFAULT 'desc',
  _limit int DEFAULT 200,
  _offset int DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  tracking_code text,
  source text,
  campaign text,
  dismissed_at timestamptz,
  total_count bigint
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sort text := lower(coalesce(_sort, 'dismissed_at'));
  v_dir  text := lower(coalesce(_dir, 'desc'));
  v_needle text := nullif(trim(coalesce(_q, '')), '');
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Acesso negado' USING ERRCODE = '42501';
  END IF;
  IF v_sort NOT IN ('dismissed_at','tracking_code','source','campaign') THEN
    v_sort := 'dismissed_at';
  END IF;
  IF v_dir NOT IN ('asc','desc') THEN
    v_dir := 'desc';
  END IF;

  RETURN QUERY EXECUTE format(
    $sql$
      WITH base AS (
        SELECT s.id, s.tracking_code, s.source, s.campaign, s.dismissed_at
        FROM public.signup_invite_dismissals s
        WHERE s.dismissed_at >= $1
          AND s.dismissed_at <= $2
          AND ($3 IS NULL OR s.campaign = $3)
          AND ($4 IS NULL OR (
            s.tracking_code ILIKE '%%' || $4 || '%%'
            OR coalesce(s.source,'') ILIKE '%%' || $4 || '%%'
            OR coalesce(s.campaign,'') ILIKE '%%' || $4 || '%%'
          ))
      ),
      counted AS (SELECT count(*) AS c FROM base)
      SELECT b.id, b.tracking_code, b.source, b.campaign, b.dismissed_at, c.c AS total_count
      FROM base b CROSS JOIN counted c
      ORDER BY %I %s NULLS LAST, b.id DESC
      LIMIT $5 OFFSET $6
    $sql$,
    v_sort, upper(v_dir)
  )
  USING _start, _end, _campaign, v_needle, _limit, _offset;
END
$$;

REVOKE ALL ON FUNCTION public.search_signup_invites(timestamptz,timestamptz,text,text,text,text,int,int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_signup_invites(timestamptz,timestamptz,text,text,text,text,int,int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_signup_invites(timestamptz,timestamptz,text,text,text,text,int,int) TO service_role;
