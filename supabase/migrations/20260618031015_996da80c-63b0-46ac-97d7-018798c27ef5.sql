
-- ============================================================
-- Endurecimento de segurança: RLS + funções SECURITY DEFINER
-- ============================================================

-- 1) events: exigir autenticação para inserir (anti-spam)
DROP POLICY IF EXISTS "Anyone can insert events" ON public.events;
CREATE POLICY "Authenticated can insert events"
  ON public.events FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- 2) reports: exigir autenticação
DROP POLICY IF EXISTS "Anyone can submit reports" ON public.reports;
CREATE POLICY "Authenticated can submit reports"
  ON public.reports FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- 3) reviews: exigir autenticação
DROP POLICY IF EXISTS "Anyone can submit reviews" ON public.reviews;
CREATE POLICY "Authenticated can submit reviews"
  ON public.reviews FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- 4) audit_log: só service_role insere
REVOKE INSERT ON public.audit_log FROM anon, authenticated;

-- 5) Revogar EXECUTE de anon em funções administrativas SECURITY DEFINER
REVOKE EXECUTE ON FUNCTION public.admin_find_user_by_email(text)              FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.ensure_official_admin()                     FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.seed_initial_data()                         FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.log_action(text, text, uuid, jsonb)         FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.claim_support_chat(uuid)                    FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.increment_banner_metric(uuid, text)         FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.accept_order_proposal(uuid)                 FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.reject_order_proposal(uuid, text)           FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.can_manage(uuid)                            FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role)             FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_admin(uuid)                              FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.has_feature(uuid, text)                     FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_establishment_plan_info(uuid)           FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.create_notification(uuid, text, text, text, jsonb, uuid)                       FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.create_notification(uuid, text, text, text, jsonb, uuid, uuid, uuid, uuid)     FROM anon, public;

-- Garantir EXECUTE para authenticated nas funções que o app autenticado precisa
GRANT EXECUTE ON FUNCTION public.accept_order_proposal(uuid)         TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_order_proposal(uuid, text)   TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role)     TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid)                      TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_manage(uuid)                    TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_feature(uuid, text)             TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_establishment_plan_info(uuid)   TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_support_chat(uuid)            TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_find_user_by_email(text)      TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_banner_metric(uuid, text) TO authenticated;
