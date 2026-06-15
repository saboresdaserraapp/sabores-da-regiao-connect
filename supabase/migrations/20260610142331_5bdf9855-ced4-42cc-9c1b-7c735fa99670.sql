-- 1. Add new columns to products table
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS short_description text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS promotional_price numeric;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS promotion_starts_at timestamp with time zone;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS promotion_ends_at timestamp with time zone;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS promotion_label text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS preparation_time integer;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_available boolean DEFAULT true;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_featured boolean;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS show_in_best_sellers boolean DEFAULT false;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS show_in_promotions boolean DEFAULT false;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS display_order integer DEFAULT 0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS allow_notes boolean DEFAULT true;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS tags_json jsonb;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS availability_rules_json jsonb;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS track_stock boolean DEFAULT false;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS stock_quantity integer;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS low_stock_threshold integer;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS auto_pause_when_zero boolean DEFAULT false;

-- 2. Create product_images table
CREATE TABLE IF NOT EXISTS public.product_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    is_primary BOOLEAN DEFAULT false,
    display_order INTEGER DEFAULT 0,
    alt_text TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_images TO authenticated;
GRANT SELECT ON public.product_images TO anon;
GRANT ALL ON public.product_images TO service_role;

ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage images of their establishment products" ON public.product_images
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.products p
            JOIN public.establishments e ON e.id = p.establishment_id
            WHERE p.id = product_images.product_id AND e.owner_id = auth.uid()
        )
    ) WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.products p
            JOIN public.establishments e ON e.id = p.establishment_id
            WHERE p.id = product_images.product_id AND e.owner_id = auth.uid()
        )
    );

CREATE POLICY "Public can view product images" ON public.product_images
    FOR SELECT USING (true);

-- 3. Create product_option_groups table
CREATE TABLE IF NOT EXISTS public.product_option_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL, -- paid_additional, removal, size, required_choice, combo
    is_required BOOLEAN DEFAULT false,
    min_choices INTEGER DEFAULT 0,
    max_choices INTEGER DEFAULT 1,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_option_groups TO authenticated;
GRANT SELECT ON public.product_option_groups TO anon;
GRANT ALL ON public.product_option_groups TO service_role;

ALTER TABLE public.product_option_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage option groups of their establishment products" ON public.product_option_groups
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.products p
            JOIN public.establishments e ON e.id = p.establishment_id
            WHERE p.id = product_option_groups.product_id AND e.owner_id = auth.uid()
        )
    ) WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.products p
            JOIN public.establishments e ON e.id = p.establishment_id
            WHERE p.id = product_option_groups.product_id AND e.owner_id = auth.uid()
        )
    );

CREATE POLICY "Public can view option groups" ON public.product_option_groups
    FOR SELECT USING (true);

-- 4. Create product_options table
CREATE TABLE IF NOT EXISTS public.product_options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    option_group_id UUID NOT NULL REFERENCES public.product_option_groups(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    price NUMERIC DEFAULT 0,
    is_available BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_options TO authenticated;
GRANT SELECT ON public.product_options TO anon;
GRANT ALL ON public.product_options TO service_role;

ALTER TABLE public.product_options ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage options of their establishment products" ON public.product_options
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.product_option_groups pog
            JOIN public.products p ON p.id = pog.product_id
            JOIN public.establishments e ON e.id = p.establishment_id
            WHERE pog.id = product_options.option_group_id AND e.owner_id = auth.uid()
        )
    ) WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.product_option_groups pog
            JOIN public.products p ON p.id = pog.product_id
            JOIN public.establishments e ON e.id = p.establishment_id
            WHERE pog.id = product_options.option_group_id AND e.owner_id = auth.uid()
        )
    );

CREATE POLICY "Public can view options" ON public.product_options
    FOR SELECT USING (true);

-- 5. Create product_inventory_movements table
CREATE TABLE IF NOT EXISTS public.product_inventory_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    movement_type TEXT NOT NULL, -- manual_adjustment, sale_confirmed, stock_added, stock_removed, auto_pause
    quantity INTEGER NOT NULL,
    note TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

GRANT SELECT, INSERT ON public.product_inventory_movements TO authenticated;
GRANT ALL ON public.product_inventory_movements TO service_role;

ALTER TABLE public.product_inventory_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage inventory of their establishment products" ON public.product_inventory_movements
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.products p
            JOIN public.establishments e ON e.id = p.establishment_id
            WHERE p.id = product_inventory_movements.product_id AND e.owner_id = auth.uid()
        )
    ) WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.products p
            JOIN public.establishments e ON e.id = p.establishment_id
            WHERE p.id = product_inventory_movements.product_id AND e.owner_id = auth.uid()
        )
    );

-- 6. Add updated_at trigger for new tables
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_product_images_updated_at BEFORE UPDATE ON public.product_images FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER update_product_option_groups_updated_at BEFORE UPDATE ON public.product_option_groups FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER update_product_options_updated_at BEFORE UPDATE ON public.product_options FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
