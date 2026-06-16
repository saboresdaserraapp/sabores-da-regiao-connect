
ALTER TABLE public.establishment_delivery_settings
  ADD COLUMN IF NOT EXISTS distance_base_fee numeric(10,2),
  ADD COLUMN IF NOT EXISTS distance_per_km numeric(10,2),
  ADD COLUMN IF NOT EXISTS distance_free_km numeric(10,2),
  ADD COLUMN IF NOT EXISTS distance_max_km numeric(10,2);

ALTER TABLE public.establishments
  ADD COLUMN IF NOT EXISTS latitude double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision;
