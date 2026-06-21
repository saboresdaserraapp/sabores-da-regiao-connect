
-- Fix public catalog visibility: rewrite SELECT policies to avoid is_admin() in anon path
-- and gate products by approved establishment + active/available flags.

-- ESTABLISHMENTS: replace public SELECT policy
DROP POLICY IF EXISTS "Public reads active establishments" ON public.establishments;

-- Anonymous + logged-in users: only approved + active stores
CREATE POLICY "Public reads approved establishments"
  ON public.establishments FOR SELECT
  TO anon, authenticated
  USING (approval_status = 'approved' AND status = 'ativo');

-- Owners can read their own store regardless of status
CREATE POLICY "Owners read own establishment"
  ON public.establishments FOR SELECT
  TO authenticated
  USING (owner_id = auth.uid()
         OR EXISTS (SELECT 1 FROM public.establishment_owners eo
                    WHERE eo.establishment_id = establishments.id
                      AND eo.user_id = auth.uid()));

-- Admins/managers can read everything (uses can_manage which is already exec-granted via SECURITY DEFINER)
CREATE POLICY "Managers read all establishments"
  ON public.establishments FOR SELECT
  TO authenticated
  USING (public.can_manage(auth.uid()));

-- Ensure anon/authenticated can execute the helper functions referenced from RLS
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.can_manage(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO anon, authenticated;

-- PRODUCTS: replace overly permissive public SELECT
DROP POLICY IF EXISTS "Public reads products" ON public.products;

CREATE POLICY "Public reads available products from approved stores"
  ON public.products FOR SELECT
  TO anon, authenticated
  USING (
    is_active = true
    AND is_available = true
    AND EXISTS (
      SELECT 1 FROM public.establishments e
      WHERE e.id = products.establishment_id
        AND e.approval_status = 'approved'
        AND e.status = 'ativo'
    )
  );

-- PRODUCT_IMAGES: gate by parent product/establishment
DROP POLICY IF EXISTS "Public can view product images" ON public.product_images;

CREATE POLICY "Public reads images of public products"
  ON public.product_images FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.products p
      JOIN public.establishments e ON e.id = p.establishment_id
      WHERE p.id = product_images.product_id
        AND p.is_active = true AND p.is_available = true
        AND e.approval_status = 'approved' AND e.status = 'ativo'
    )
  );

-- PRODUCT_OPTION_GROUPS
DROP POLICY IF EXISTS "Public can view option groups" ON public.product_option_groups;

CREATE POLICY "Public reads option groups of public products"
  ON public.product_option_groups FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.products p
      JOIN public.establishments e ON e.id = p.establishment_id
      WHERE p.id = product_option_groups.product_id
        AND p.is_active = true AND p.is_available = true
        AND e.approval_status = 'approved' AND e.status = 'ativo'
    )
  );

-- PRODUCT_OPTIONS
DROP POLICY IF EXISTS "Public can view options" ON public.product_options;

CREATE POLICY "Public reads options of public products"
  ON public.product_options FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.product_option_groups pog
      JOIN public.products p ON p.id = pog.product_id
      JOIN public.establishments e ON e.id = p.establishment_id
      WHERE pog.id = product_options.option_group_id
        AND p.is_active = true AND p.is_available = true
        AND e.approval_status = 'approved' AND e.status = 'ativo'
    )
  );
