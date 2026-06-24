CREATE OR REPLACE FUNCTION public.debug_whoami()
RETURNS json
LANGUAGE sql
STABLE
AS $$
  SELECT json_build_object(
    'current_user', current_user,
    'session_user', session_user,
    'auth_uid', auth.uid(),
    'jwt_role', current_setting('request.jwt.claims', true)
  );
$$;
GRANT EXECUTE ON FUNCTION public.debug_whoami() TO anon, authenticated;