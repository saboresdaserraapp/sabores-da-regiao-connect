-- Tabela de Motoboys
CREATE TABLE public.delivery_drivers (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    establishment_id UUID NOT NULL REFERENCES public.establishments(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    whatsapp_phone TEXT NOT NULL,
    secondary_phone TEXT,
    driver_type TEXT NOT NULL DEFAULT 'own', -- 'own' ou 'partner'
    status TEXT NOT NULL DEFAULT 'active', -- 'active', 'inactive', 'archived'
    notes TEXT,
    regions_json JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Permissões para delivery_drivers
GRANT SELECT, INSERT, UPDATE, DELETE ON public.delivery_drivers TO authenticated;
GRANT ALL ON public.delivery_drivers TO service_role;
ALTER TABLE public.delivery_drivers ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS para delivery_drivers
CREATE POLICY "Owners can manage their own drivers" ON public.delivery_drivers
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.establishment_owners 
            WHERE establishment_id = public.delivery_drivers.establishment_id 
            AND user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.establishment_owners 
            WHERE establishment_id = public.delivery_drivers.establishment_id 
            AND user_id = auth.uid()
        )
    );

-- Tabela de links de compartilhamento de referência (para links privados dinâmicos)
CREATE TABLE public.order_reference_share_links (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    establishment_id UUID NOT NULL REFERENCES public.establishments(id) ON DELETE CASCADE,
    created_by UUID REFERENCES auth.users(id),
    private_token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
    selected_media_json JSONB DEFAULT '[]'::jsonb,
    recipient_driver_id UUID REFERENCES public.delivery_drivers(id) ON DELETE SET NULL,
    recipient_phone TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Permissões para order_reference_share_links
GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_reference_share_links TO authenticated;
GRANT SELECT ON public.order_reference_share_links TO anon;
GRANT ALL ON public.order_reference_share_links TO service_role;
ALTER TABLE public.order_reference_share_links ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS para order_reference_share_links
CREATE POLICY "Owners can manage their share links" ON public.order_reference_share_links
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.establishment_owners 
            WHERE establishment_id = public.order_reference_share_links.establishment_id 
            AND user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.establishment_owners 
            WHERE establishment_id = public.order_reference_share_links.establishment_id 
            AND user_id = auth.uid()
        )
    );

-- Política para acesso público via token (Página de Referência)
CREATE POLICY "Public access via token" ON public.order_reference_share_links
    FOR SELECT USING (true);

-- Tabela de logs de envio
CREATE TABLE public.order_reference_share_logs (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    establishment_id UUID NOT NULL REFERENCES public.establishments(id) ON DELETE CASCADE,
    driver_id UUID REFERENCES public.delivery_drivers(id) ON DELETE SET NULL,
    driver_name TEXT,
    driver_phone TEXT,
    selected_media_json JSONB DEFAULT '[]'::jsonb,
    private_url TEXT,
    sent_via TEXT NOT NULL, -- 'whatsapp', 'copied_link', 'internal'
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Permissões para order_reference_share_logs
GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_reference_share_logs TO authenticated;
GRANT ALL ON public.order_reference_share_logs TO service_role;
ALTER TABLE public.order_reference_share_logs ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS para order_reference_share_logs
CREATE POLICY "Owners can view their share logs" ON public.order_reference_share_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.establishment_owners 
            WHERE establishment_id = public.order_reference_share_logs.establishment_id 
            AND user_id = auth.uid()
        )
    );

CREATE POLICY "Owners can insert their share logs" ON public.order_reference_share_logs
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.establishment_owners 
            WHERE establishment_id = public.order_reference_share_logs.establishment_id 
            AND user_id = auth.uid()
        )
    );

-- Adicionar campos à tabela orders
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS assigned_driver_id UUID REFERENCES public.delivery_drivers(id) ON DELETE SET NULL;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS assigned_driver_name TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS assigned_driver_phone TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS driver_reference_sent_at TIMESTAMP WITH TIME ZONE;

-- Trigger para updated_at em delivery_drivers
CREATE OR REPLACE FUNCTION public.update_updated_at_column() RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_delivery_drivers_updated_at
BEFORE UPDATE ON public.delivery_drivers
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
