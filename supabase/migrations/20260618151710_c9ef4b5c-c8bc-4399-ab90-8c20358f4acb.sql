-- Generic helper: revoke EXECUTE from PUBLIC and anon for all SECURITY DEFINER functions in public,
-- then grant to authenticated and service_role. Whitelist a few that must remain callable by anon.
DO $$
DECLARE
  r record;
  fn_sig text;
  whitelisted text[] := ARRAY[
    'get_order_by_tracking(text)',
    'get_share_link_by_token(text)',
    'get_visual_reference_by_token(text)',
    'increment_banner_metric(uuid,text)'
  ];
BEGIN
  FOR r IN
    SELECT p.oid, p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef = true
  LOOP
    fn_sig := format('public.%I(%s)', r.proname, r.args);

    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', fn_sig);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', fn_sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', fn_sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', fn_sig);

    -- Re-grant to anon only for whitelisted public-facing functions
    IF (r.proname || '(' || replace(r.args, ' ', '') || ')') = ANY (whitelisted) THEN
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO anon', fn_sig);
    END IF;
  END LOOP;
END $$;

-- get_order_by_tracking is SECURITY INVOKER (not in loop above), still ensure anon can call it
GRANT EXECUTE ON FUNCTION public.get_order_by_tracking(text) TO anon, authenticated;