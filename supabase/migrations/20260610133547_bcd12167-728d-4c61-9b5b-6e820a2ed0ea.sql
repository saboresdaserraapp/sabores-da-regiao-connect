-- Update addresses table
ALTER TABLE public.addresses 
ADD COLUMN IF NOT EXISTS customer_name TEXT,
ADD COLUMN IF NOT EXISTS customer_phone TEXT,
ADD COLUMN IF NOT EXISTS popular_location_name TEXT,
ADD COLUMN IF NOT EXISTS delivery_instructions TEXT;

-- Update house_references table
ALTER TABLE public.house_references
ADD COLUMN IF NOT EXISTS address_id UUID REFERENCES public.addresses(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS pin_1_description TEXT,
ADD COLUMN IF NOT EXISTS pin_2_description TEXT,
ADD COLUMN IF NOT EXISTS pin_3_description TEXT;

-- Create order_visual_reference_links table
CREATE TABLE IF NOT EXISTS public.order_visual_reference_links (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id),
    address_id UUID REFERENCES public.addresses(id),
    visual_reference_id UUID REFERENCES public.house_references(id),
    private_token TEXT NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_visual_reference_links TO authenticated;
GRANT ALL ON public.order_visual_reference_links TO service_role;
GRANT SELECT ON public.order_visual_reference_links TO anon;

ALTER TABLE public.order_visual_reference_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own visual reference links" 
ON public.order_visual_reference_links 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Anyone with token can view visual reference link"
ON public.order_visual_reference_links
FOR SELECT
USING (true);

-- Update checkout_delivery_info table
ALTER TABLE public.checkout_delivery_info
ADD COLUMN IF NOT EXISTS address_snapshot_json JSONB;
