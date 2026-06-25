
-- 1) Função security-definer que evita recursão entre establishments e establishment_owners
CREATE OR REPLACE FUNCTION public.is_establishment_member(_user_id uuid, _estab_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    _user_id IS NOT NULL AND _estab_id IS NOT NULL AND (
      EXISTS (SELECT 1 FROM public.establishments e WHERE e.id = _estab_id AND e.owner_id = _user_id)
      OR EXISTS (SELECT 1 FROM public.establishment_owners eo WHERE eo.establishment_id = _estab_id AND eo.user_id = _user_id)
    );
$$;

GRANT EXECUTE ON FUNCTION public.is_establishment_member(uuid, uuid) TO anon, authenticated, service_role;

-- 2) Recriar policies removendo EXISTS cruzados
DROP POLICY IF EXISTS "Owners read own establishment" ON public.establishments;
CREATE POLICY "Owners read own establishment"
  ON public.establishments
  FOR SELECT
  USING (owner_id = auth.uid() OR public.is_establishment_member(auth.uid(), id));

DROP POLICY IF EXISTS "users read own memberships" ON public.establishment_owners;
CREATE POLICY "users read own memberships"
  ON public.establishment_owners
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR public.can_manage(auth.uid())
    OR public.is_establishment_member(auth.uid(), establishment_id)
  );

DROP POLICY IF EXISTS "owners manage team memberships" ON public.establishment_owners;
CREATE POLICY "owners manage team memberships"
  ON public.establishment_owners
  FOR ALL
  USING (
    public.is_establishment_member(auth.uid(), establishment_id)
    AND role = ANY (ARRAY['owner','manager','attendant','menu_editor','finance'])
  )
  WITH CHECK (
    public.is_establishment_member(auth.uid(), establishment_id)
    AND role = ANY (ARRAY['owner','manager','attendant','menu_editor','finance'])
  );

-- 3) Tracking público do pedido por código (visitante)
ALTER FUNCTION public.get_order_by_tracking(text) SECURITY DEFINER;
GRANT EXECUTE ON FUNCTION public.get_order_by_tracking(text) TO anon, authenticated;
