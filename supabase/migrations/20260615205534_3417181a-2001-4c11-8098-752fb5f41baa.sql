-- Fix search_path on 12 public functions (security hardening)
ALTER FUNCTION public.can_user_access_order(uuid) SET search_path = public;
ALTER FUNCTION public.create_notification(uuid, text, text, text, jsonb, uuid) SET search_path = public;
ALTER FUNCTION public.get_order_by_tracking(text) SET search_path = public;
ALTER FUNCTION public.handle_new_order_message_notification() SET search_path = public;
ALTER FUNCTION public.handle_order_status_change_notification() SET search_path = public;
ALTER FUNCTION public.handle_profile_update_notification() SET search_path = public;
ALTER FUNCTION public.handle_updated_at() SET search_path = public;
ALTER FUNCTION public.slugify(text) SET search_path = public;
ALTER FUNCTION public.touch_updated_at() SET search_path = public;
ALTER FUNCTION public.unaccent_safe(text) SET search_path = public;
ALTER FUNCTION public.update_house_reference_media_updated_at() SET search_path = public;
ALTER FUNCTION public.update_updated_at_column() SET search_path = public;

-- Tighten audit_log: only triggers/SECURITY DEFINER functions should insert.
-- Block direct inserts from anon/authenticated clients.
DROP POLICY IF EXISTS "System inserts audit log" ON public.audit_log;
CREATE POLICY "Only service role inserts audit log"
  ON public.audit_log
  FOR INSERT
  TO service_role
  WITH CHECK (true);
