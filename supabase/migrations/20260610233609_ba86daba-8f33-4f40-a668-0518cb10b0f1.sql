-- Create order_messages table
CREATE TABLE IF NOT EXISTS public.order_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    sender_user_id UUID REFERENCES auth.users(id),
    sender_type TEXT NOT NULL CHECK (sender_type IN ('customer', 'business', 'system')),
    establishment_id UUID REFERENCES public.establishments(id),
    customer_user_id UUID REFERENCES auth.users(id),
    message TEXT NOT NULL,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_messages TO authenticated;
GRANT ALL ON public.order_messages TO service_role;

-- Enable RLS
ALTER TABLE public.order_messages ENABLE ROW LEVEL SECURITY;

-- Policies for order_messages
CREATE POLICY "Users can view messages of their own orders" ON public.order_messages
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.orders o
            WHERE o.id = public.order_messages.order_id
            AND (o.user_id = auth.uid() OR o.establishment_id IN (
                SELECT id FROM public.establishments WHERE user_id = auth.uid()
            ))
        )
    );

CREATE POLICY "Users can insert messages to their own orders" ON public.order_messages
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.orders o
            WHERE o.id = public.order_messages.order_id
            AND (o.user_id = auth.uid() OR o.establishment_id IN (
                SELECT id FROM public.establishments WHERE user_id = auth.uid()
            ))
        )
    );

-- Ensure orders table has necessary fields (if not already present)
-- We use DO blocks to safely add columns if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'user_id') THEN
        ALTER TABLE public.orders ADD COLUMN user_id UUID REFERENCES auth.users(id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'customer_phone') THEN
        ALTER TABLE public.orders ADD COLUMN customer_phone TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'delivery_fee_estimated') THEN
        ALTER TABLE public.orders ADD COLUMN delivery_fee_estimated DECIMAL(10,2);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'total_estimated') THEN
        ALTER TABLE public.orders ADD COLUMN total_estimated DECIMAL(10,2);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'payment_method_intent') THEN
        ALTER TABLE public.orders ADD COLUMN payment_method_intent TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'whatsapp_message') THEN
        ALTER TABLE public.orders ADD COLUMN whatsapp_message TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'sent_to_whatsapp_at') THEN
        ALTER TABLE public.orders ADD COLUMN sent_to_whatsapp_at TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;
