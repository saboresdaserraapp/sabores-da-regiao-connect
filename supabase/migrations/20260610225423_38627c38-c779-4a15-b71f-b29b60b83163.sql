-- Create delivery_drivers table if not exists (already seems to exist but ensuring correct schema)
CREATE TABLE IF NOT EXISTS public.delivery_drivers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    establishment_id UUID NOT NULL REFERENCES public.establishments(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    whatsapp_phone TEXT NOT NULL,
    secondary_phone TEXT,
    driver_type TEXT NOT NULL DEFAULT 'own', -- own, partner
    status TEXT NOT NULL DEFAULT 'active', -- active, inactive, archived
    notes TEXT,
    neighborhood_coverage TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Grant permissions for delivery_drivers
GRANT SELECT, INSERT, UPDATE, DELETE ON public.delivery_drivers TO authenticated;
GRANT ALL ON public.delivery_drivers TO service_role;

-- Enable RLS
ALTER TABLE public.delivery_drivers ENABLE ROW LEVEL SECURITY;

-- Policies for delivery_drivers
CREATE POLICY "Owners and managers can manage drivers of their establishment" 
ON public.delivery_drivers 
FOR ALL 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.establishment_owners 
    WHERE establishment_id = public.delivery_drivers.establishment_id 
    AND user_id = auth.uid()
  )
);

-- Create order_reference_share_links (tokens for the delivery reference page)
CREATE TABLE IF NOT EXISTS public.order_reference_share_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    establishment_id UUID NOT NULL REFERENCES public.establishments(id) ON DELETE CASCADE,
    created_by UUID REFERENCES auth.users(id),
    private_token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
    selected_media_json JSONB, -- list of media URLs shared
    recipient_driver_id UUID REFERENCES public.delivery_drivers(id),
    recipient_phone TEXT,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Grant permissions for order_reference_share_links
GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_reference_share_links TO authenticated;
GRANT SELECT ON public.order_reference_share_links TO anon;
GRANT ALL ON public.order_reference_share_links TO service_role;

-- Enable RLS
ALTER TABLE public.order_reference_share_links ENABLE ROW LEVEL SECURITY;

-- Policies for order_reference_share_links
CREATE POLICY "Public access to reference links by token" 
ON public.order_reference_share_links 
FOR SELECT 
USING (true);

CREATE POLICY "Establishment staff can create share links" 
ON public.order_reference_share_links 
FOR ALL 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.establishment_owners 
    WHERE establishment_id = public.order_reference_share_links.establishment_id 
    AND user_id = auth.uid()
  )
);

-- Create order_reference_share_logs
CREATE TABLE IF NOT EXISTS public.order_reference_share_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    establishment_id UUID NOT NULL REFERENCES public.establishments(id) ON DELETE CASCADE,
    driver_id UUID REFERENCES public.delivery_drivers(id),
    driver_name TEXT,
    driver_phone TEXT,
    selected_media_json JSONB,
    private_url TEXT,
    sent_via TEXT, -- whatsapp, copied_link, internal
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Grant permissions for order_reference_share_logs
GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_reference_share_logs TO authenticated;
GRANT ALL ON public.order_reference_share_logs TO service_role;

-- Enable RLS
ALTER TABLE public.order_reference_share_logs ENABLE ROW LEVEL SECURITY;

-- Policies for order_reference_share_logs
CREATE POLICY "Establishment staff can view their logs" 
ON public.order_reference_share_logs 
FOR ALL 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.establishment_owners 
    WHERE establishment_id = public.order_reference_share_logs.establishment_id 
    AND user_id = auth.uid()
  )
);

-- Add columns to orders table if they don't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='assigned_driver_id') THEN
        ALTER TABLE public.orders ADD COLUMN assigned_driver_id UUID REFERENCES public.delivery_drivers(id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='assigned_driver_name') THEN
        ALTER TABLE public.orders ADD COLUMN assigned_driver_name TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='assigned_driver_phone') THEN
        ALTER TABLE public.orders ADD COLUMN assigned_driver_phone TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='driver_reference_sent_at') THEN
        ALTER TABLE public.orders ADD COLUMN driver_reference_sent_at TIMESTAMPTZ;
    END IF;
END $$;
