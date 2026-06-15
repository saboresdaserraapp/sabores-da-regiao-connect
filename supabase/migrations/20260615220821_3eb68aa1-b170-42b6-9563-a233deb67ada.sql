
CREATE OR REPLACE FUNCTION public.admin_find_user_by_email(_email text)
RETURNS uuid
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_uid uuid;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Acesso negado' USING ERRCODE = '42501';
  END IF;
  SELECT id INTO v_uid FROM auth.users WHERE lower(email) = lower(trim(_email)) LIMIT 1;
  RETURN v_uid;
END $$;

REVOKE ALL ON FUNCTION public.admin_find_user_by_email(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_find_user_by_email(text) TO authenticated, service_role;
