ALTER TABLE public.delivery_regions
ADD COLUMN IF NOT EXISTS min_order_value numeric NOT NULL DEFAULT 0;