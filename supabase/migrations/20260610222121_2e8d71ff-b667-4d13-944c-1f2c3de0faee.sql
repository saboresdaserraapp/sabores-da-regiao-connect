CREATE TABLE IF NOT EXISTS public.whatsapp_order_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
    establishment_id UUID REFERENCES public.establishments(id),
    tracking_code TEXT,
    event_type TEXT NOT NULL, -- e.g., 'order_sent'
    visual_reference_source TEXT, -- 'specific' or 'global'
    has_media BOOLEAN DEFAULT FALSE,
    media_count INTEGER DEFAULT 0,
    has_video BOOLEAN DEFAULT FALSE,
    has_instructions BOOLEAN DEFAULT FALSE,
    has_pins BOOLEAN DEFAULT FALSE,
    instructions_length INTEGER DEFAULT 0,
    pins_count INTEGER DEFAULT 0,
    whatsapp_number TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- RLS
ALTER TABLE public.whatsapp_order_events ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view their own order events (via order ownership)
CREATE POLICY "Users can view their own order events" ON public.whatsapp_order_events
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.orders 
            WHERE public.orders.id = whatsapp_order_events.order_id 
            AND public.orders.user_id = auth.uid()
        )
    );

-- Allow service role full access
GRANT ALL ON public.whatsapp_order_events TO service_role;
GRANT ALL ON public.whatsapp_order_events TO authenticated;
GRANT ALL ON public.whatsapp_order_events TO anon;
