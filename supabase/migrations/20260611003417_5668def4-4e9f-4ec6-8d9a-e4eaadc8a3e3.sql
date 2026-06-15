-- Enable RLS on orders table (it should be already enabled, but let's be sure)
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own orders
CREATE POLICY "Users can view their own orders" ON public.orders
    FOR SELECT
    USING (auth.uid() = user_id);

-- Allow establishments to view orders for their establishment
CREATE POLICY "Establishments can view their own orders" ON public.orders
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.establishments
            WHERE public.establishments.id = public.orders.establishment_id
            AND public.establishments.owner_id = auth.uid()
        )
    );

-- Allow service role full access
GRANT ALL ON public.orders TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO authenticated;
GRANT INSERT ON public.orders TO anon; -- Allow guest checkout if needed
