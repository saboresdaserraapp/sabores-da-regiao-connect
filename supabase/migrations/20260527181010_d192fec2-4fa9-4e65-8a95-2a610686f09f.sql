
ALTER TYPE public.delivery_model ADD VALUE IF NOT EXISTS 'by_region_manual';
ALTER TYPE public.delivery_model ADD VALUE IF NOT EXISTS 'no_delivery';
ALTER TYPE public.delivery_model ADD VALUE IF NOT EXISTS 'dine_in_only';
ALTER TYPE public.delivery_region_status ADD VALUE IF NOT EXISTS 'nao_atendida';
