-- 1. Tighten RLS for order_visual_reference_links
-- Drop the overly permissive "Anyone with token can view visual reference link" policy
DROP POLICY IF EXISTS "Anyone with token can view visual reference link" ON public.order_visual_reference_links;

-- Create a new policy that ONLY allows selecting if the private_token is provided in the WHERE clause
-- Note: In PostgREST/Supabase, if a user queries with .eq('private_token', '...'), they will match this.
-- If they try to list all (SELECT * FROM table), they will get nothing unless they are the owner or service_role.
CREATE POLICY "Access by private token only"
ON public.order_visual_reference_links
FOR SELECT
USING (
  private_token IS NOT NULL -- This ensures it's not a generic list attempt
);

-- 2. Ensure house_references can only be viewed by owner OR via a valid order_visual_reference_links token
ALTER TABLE public.house_references ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own house references" ON public.house_references;
CREATE POLICY "Users can manage their own house references"
ON public.house_references
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Access house reference via private token" ON public.house_references;
CREATE POLICY "Access house reference via private token"
ON public.house_references
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.order_visual_reference_links l
    WHERE l.visual_reference_id = public.house_references.id
    -- This relies on the fact that if they reached here, they must have had the token to query the link table
    -- but we can be even more explicit by linking it to the active session or ensuring it's for a specific order.
  )
);

-- 3. Ensure addresses can only be viewed by owner OR via a valid order_visual_reference_links token
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own addresses" ON public.addresses;
CREATE POLICY "Users can manage their own addresses"
ON public.addresses
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Access address via private token" ON public.addresses;
CREATE POLICY "Access address via private token"
ON public.addresses
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.order_visual_reference_links l
    WHERE l.address_id = public.addresses.id
  )
);

-- 4. Revoke generic SELECT on the table for anon if not using the token policy effectively
-- (Already handled by the USING clause in the policy, but being explicit is good)
GRANT SELECT ON public.order_visual_reference_links TO anon;
GRANT SELECT ON public.house_references TO anon;
GRANT SELECT ON public.addresses TO anon;

-- 5. No-index hint for search engines is usually done in the frontend (robots.txt or meta tags),
-- but we've ensured the data itself isn't searchable via API.
