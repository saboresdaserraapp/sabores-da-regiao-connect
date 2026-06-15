
CREATE POLICY "Owner creates own establishment"
ON public.establishments
FOR INSERT
TO authenticated
WITH CHECK (owner_id = auth.uid() AND status = 'pendente'::establishment_status);

CREATE POLICY "Owner reads own subscription"
ON public.establishment_subscriptions
FOR SELECT
TO authenticated
USING (EXISTS (SELECT 1 FROM public.establishments e WHERE e.id = establishment_id AND e.owner_id = auth.uid()));

CREATE POLICY "Owner creates own subscription"
ON public.establishment_subscriptions
FOR INSERT
TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.establishments e WHERE e.id = establishment_id AND e.owner_id = auth.uid()));
