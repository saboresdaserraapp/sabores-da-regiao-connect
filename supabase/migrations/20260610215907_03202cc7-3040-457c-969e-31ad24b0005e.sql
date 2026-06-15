-- Create house_reference_media table
CREATE TABLE IF NOT EXISTS public.house_reference_media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    house_reference_id UUID NOT NULL REFERENCES public.house_references(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    address_id UUID REFERENCES public.addresses(id),
    media_type TEXT NOT NULL CHECK (media_type IN ('photo', 'video')),
    media_url TEXT NOT NULL,
    thumbnail_url TEXT,
    display_order INTEGER DEFAULT 0,
    label TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_house_reference_media_reference_id ON public.house_reference_media(house_reference_id);
CREATE INDEX IF NOT EXISTS idx_house_reference_media_user_address ON public.house_reference_media(user_id, address_id);

-- Permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.house_reference_media TO authenticated;
GRANT ALL ON public.house_reference_media TO service_role;
GRANT SELECT ON public.house_reference_media TO anon;

-- RLS
ALTER TABLE public.house_reference_media ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own house reference media"
ON public.house_reference_media
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Access media via private token"
ON public.house_reference_media
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.order_visual_reference_links l
        WHERE l.visual_reference_id = public.house_reference_media.house_reference_id
        AND (l.expires_at IS NULL OR l.expires_at > now())
    )
);

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_house_reference_media_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_house_reference_media_updated_at
BEFORE UPDATE ON public.house_reference_media
FOR EACH ROW
EXECUTE FUNCTION public.update_house_reference_media_updated_at();
