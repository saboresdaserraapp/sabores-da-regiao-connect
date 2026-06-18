-- Fix privilege escalation: owners could insert establishment_owners with any role,
-- including 'admin_operacional'/'super_admin'. Restrict roles owners can assign.

DROP POLICY IF EXISTS "owners manage memberships" ON public.establishment_owners;

-- Admins (super_admin/admin_operacional) can do anything
CREATE POLICY "admins manage memberships"
ON public.establishment_owners
FOR ALL
TO authenticated
USING (public.can_manage(auth.uid()))
WITH CHECK (public.can_manage(auth.uid()));

-- Establishment owners can manage their team, but ONLY with non-privileged roles
CREATE POLICY "owners manage team memberships"
ON public.establishment_owners
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.establishments e
    WHERE e.id = establishment_owners.establishment_id
      AND e.owner_id = auth.uid()
  )
  AND role IN ('owner','manager','attendant','menu_editor','finance')
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.establishments e
    WHERE e.id = establishment_owners.establishment_id
      AND e.owner_id = auth.uid()
  )
  AND role IN ('owner','manager','attendant','menu_editor','finance')
);