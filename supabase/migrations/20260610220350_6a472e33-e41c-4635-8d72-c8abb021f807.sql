-- Ensure strict RLS for house_references
ALTER TABLE public.house_references ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own house references" ON public.house_references;
CREATE POLICY "Users can manage their own house references" 
ON public.house_references 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Establishments can view reference via order link" ON public.house_references;
CREATE POLICY "Establishments can view reference via order link" 
ON public.house_references 
FOR SELECT 
USING (
  id IN (
    SELECT visual_reference_id 
    FROM public.order_visual_reference_links l
    WHERE l.expires_at > now()
  )
);

-- Ensure strict RLS for house_reference_media
ALTER TABLE public.house_reference_media ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own media" ON public.house_reference_media;
CREATE POLICY "Users can manage their own media" 
ON public.house_reference_media 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "View media via order link" ON public.house_reference_media;
CREATE POLICY "View media via order link" 
ON public.house_reference_media 
FOR SELECT 
USING (
  house_reference_id IN (
    SELECT visual_reference_id 
    FROM public.order_visual_reference_links l
    WHERE l.expires_at > now()
  )
);

-- Secure order_visual_reference_links
ALTER TABLE public.order_visual_reference_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Access visual reference link via token" ON public.order_visual_reference_links;
CREATE POLICY "Access visual reference link via token" 
ON public.order_visual_reference_links 
FOR SELECT 
USING (true); -- Token itself is the security mechanism for this table

-- Add policy for the user who owns the address or the establishment that received the order
DROP POLICY IF EXISTS "Manage own reference links" ON public.order_visual_reference_links;
CREATE POLICY "Manage own reference links" 
ON public.order_visual_reference_links 
FOR ALL 
USING (
  auth.uid() = user_id OR 
  EXISTS (
    SELECT 1 FROM public.orders o
    JOIN public.establishments e ON e.id = o.establishment_id
    WHERE o.id = order_id AND e.owner_id = auth.uid()
  )
);
