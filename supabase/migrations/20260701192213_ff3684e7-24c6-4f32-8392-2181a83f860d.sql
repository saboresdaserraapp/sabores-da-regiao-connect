ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS additional_menu_category_ids uuid[] NOT NULL DEFAULT '{}'::uuid[];

CREATE INDEX IF NOT EXISTS idx_products_additional_menu_categories
  ON public.products USING GIN (additional_menu_category_ids);